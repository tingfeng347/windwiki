import { withBase } from '@rspress/core/runtime';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  PageViewport,
} from 'pdfjs-dist';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './pdf-viewer.css';

/** worker 由 rspress.config.ts 的 output.copy 从 node_modules 拷进产物，见该处注释。 */
export const PDF_WORKER_PATH = '/files/pdf.worker.min.mjs';

/** PDF 自带书签树的节点。数据由 docs/ 下的 json 提供，见 README 的「PDF 课程笔记」。 */
export interface PdfOutlineNode {
  title: string;
  /** 目标页码，从 1 开始（PDF 书签里是 0 起的索引，抽取时已加 1） */
  page: number;
  children?: PdfOutlineNode[];
}

export interface PdfViewerProps {
  /**
   * 相对站点根的路径，内部会补上站点 base。
   *
   * 文件名不要带 `.pdf`：URL 以 .pdf / .zip / .bin 这类扩展名结尾、响应的类型又像文件时，
   * Chrome 会把它当成「不安全下载」，用 204 空响应把正文顶掉（实测 http 下必现、
   * https 下正常），于是本地 `pnpm dev` / `pnpm preview` 会直接读不到 PDF。
   */
  src: string;
  /** PDF 书签，渲染成右侧目录（portal 进默认主题的 .rp-outline__toc） */
  outline: PdfOutlineNode[];
}

/**
 * 去掉空白再转小写。PDF 的文字被切成一堆 text item，一句话常常横跨多个 item，
 * 空白和换行的位置不可靠，所以两边都先归一化再比较。
 */
const normalize = (text: string) => text.replace(/\s+/g, '').toLowerCase();

const countOccurrences = (haystack: string, needle: string) => {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let from = 0;
  for (;;) {
    const found = haystack.indexOf(needle, from);
    if (found === -1) {
      return count;
    }
    count += 1;
    from = found + needle.length;
  }
};

/** 书签树按文档顺序摊平，附带层级；页码基本递增，用来定位「当前读到哪一节」。 */
const flattenOutline = (nodes: PdfOutlineNode[]) => {
  const flat: { node: PdfOutlineNode; depth: number }[] = [];
  const walk = (list: PdfOutlineNode[], depth: number) => {
    for (const node of list) {
      flat.push({ node, depth });
      if (node.children?.length) {
        walk(node.children, depth + 1);
      }
    }
  };
  walk(nodes, 0);
  return flat;
};

const HIT = 'windwiki-pdf-viewer__hit';
const HIT_ACTIVE = 'windwiki-pdf-viewer__hit--active';

/** 「适宽」时单页的最大宽度（CSS px） */
const MAX_PAGE_WIDTH = 1100;

/** 单页 canvas 的像素上限。超高分屏上按 devicePixelRatio 满血渲染会一张就上千万像素。 */
const MAX_CANVAS_PIXELS = 5_000_000;

/**
 * 低分辨率预览的比例。滚动时先画这张：像素只有最终版的十分之一左右，
 * 几十毫秒就能铺满，不会出现一片白。
 */
const PREVIEW_SCALE = 0.32;

/** 让出一帧主线程，等滚动告一段落再干重活 */
const nextIdle = () =>
  new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 120 });
    } else {
      window.setTimeout(resolve, 50);
    }
  });

/** 画布的像素倍率：设备像素比，且不超过单页像素上限 */
const canvasRatio = (viewport: { width: number; height: number }) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return Math.min(dpr, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)));
};

/**
 * 把渲染好的位图整张贴到可见画布上。
 *
 * 改 canvas.width / height 会丢掉后备位图（画布内容被清空），Chrome 在换位图的那一帧
 * 可能先把还没初始化的纹理画出来 —— 就是跳页时闪的那一下黑屏。所以渲染一律在离屏画布
 * 上做完，「改尺寸 + 贴图」在同一个任务里一次完成，中间没有可被画出来的空窗。
 */
const blit = (canvas: HTMLCanvasElement, bitmap: HTMLCanvasElement) => {
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
};

/**
 * 一页 PDF：canvas 画页面，文字层负责选中与搜索高亮。
 *
 * 只有滚到视口附近的页才渲染（visible），滚远了就把 canvas 清掉 —— 124 页全渲染
 * 会吃掉几个 GB 的显存。memo 是为了让父组件切换可见集合时只重渲受影响的页。
 */
const PdfPage = memo(function PdfPage({
  pdf,
  pdfjs,
  page,
  scale,
  width,
  height,
  visible,
  query,
  activeOrdinal,
  onHost,
}: {
  pdf: PDFDocumentProxy;
  pdfjs: typeof import('pdfjs-dist');
  page: number;
  scale: number;
  width: number;
  height: number;
  visible: boolean;
  query: string;
  activeOrdinal: number | null;
  onHost: (page: number, element: HTMLDivElement | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  const setHost = useCallback(
    (element: HTMLDivElement | null) => {
      hostRef.current = element;
      onHost(page, element);
    },
    [onHost, page],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const textLayerDiv = textRef.current;
    if (!canvas || !textLayerDiv) {
      return;
    }

    if (!visible) {
      canvas.width = 0;
      canvas.height = 0;
      textLayerDiv.replaceChildren();
      setRendered(false);
      return;
    }

    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    let textLayer: { cancel: () => void } | null = null;

    /** 渲染到一张离屏画布，完成后再整张贴到可见画布上（见 blit 的注释） */
    const renderOffscreen = async (
      pdfPage: PDFPageProxy,
      viewport: PageViewport,
      ratio: number,
    ) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.round(viewport.width * ratio));
      offscreen.height = Math.max(1, Math.round(viewport.height * ratio));
      const task = pdfPage.render({
        canvas: offscreen,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });
      renderTask = task;
      await (task as unknown as { promise: Promise<void> }).promise;
      return offscreen;
    };

    void (async () => {
      const pdfPage = await pdf.getPage(page);
      if (cancelled) {
        return;
      }
      const viewport = pdfPage.getViewport({ scale });

      // TextLayer 构造时按 --total-scale-factor 算文字层宽高，必须先写在它的祖先上
      hostRef.current?.style.setProperty('--total-scale-factor', String(scale));
      // 画布在 CSS 里始终是最终尺寸，小尺寸的位图由浏览器拉伸显示
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // 1) 先来一张低分辨率的：像素只有最终版的六分之一左右，很快就铺满，
      //    快速滚动时不会看到一片白
      try {
        const preview = pdfPage.getViewport({ scale: scale * PREVIEW_SCALE });
        const bitmap = await renderOffscreen(
          pdfPage,
          preview,
          Math.min(window.devicePixelRatio || 1, 2),
        );
        if (cancelled) {
          return;
        }
        blit(canvas, bitmap);
      } catch {
        return; // 滚太快时会取消上一次渲染，这一页交给下一次 effect
      }

      // 2) 等主线程空下来再补全分辨率，免得跟别的页抢
      await nextIdle();
      if (cancelled) {
        return;
      }
      try {
        const bitmap = await renderOffscreen(
          pdfPage,
          viewport,
          canvasRatio(viewport),
        );
        if (cancelled) {
          return;
        }
        blit(canvas, bitmap);
      } catch {
        return;
      }

      // 3) 文字层：几何按最终分辨率算，高亮和选中都靠它
      try {
        textLayerDiv.replaceChildren();
        const layer = new pdfjs.TextLayer({
          textContentSource: pdfPage.streamTextContent(),
          container: textLayerDiv,
          viewport,
        });
        textLayer = layer;
        await layer.render();
      } catch {
        // 取消（滚走了、换页了、缩放变了）时 pdf.js 会用 AbortException 拒绝，
        // 这里必须吞掉：不接就是一条 Uncaught (in promise)
        return;
      }
      if (!cancelled) {
        setRendered(true);
      }
    })().catch(() => {
      // 取页失败或中途被取消：这一页留白，交给下一次 effect 重试
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, pdfjs, page, scale, visible]);

  // 高亮：文字层的 span 与 text item 一一对应，按 item 建的索引能精确对上 span
  useEffect(() => {
    const container = textRef.current;
    if (!container) {
      return;
    }
    const spans = container.querySelectorAll('span');
    spans.forEach((span) => span.classList.remove(HIT, HIT_ACTIVE));
    if (!query || !rendered) {
      return;
    }
    let ordinal = 0;
    spans.forEach((span) => {
      if (!normalize(span.textContent ?? '').includes(query)) {
        return;
      }
      ordinal += 1;
      span.classList.add(HIT);
      if (activeOrdinal === ordinal) {
        span.classList.add(HIT_ACTIVE);
      }
    });
  }, [query, activeOrdinal, rendered]);

  return (
    <div
      className="windwiki-pdf-viewer__page"
      // 两个 IntersectionObserver 都靠它认页
      data-page={page}
      ref={setHost}
      style={{ width, height }}
    >
      <canvas ref={canvasRef} className="windwiki-pdf-viewer__canvas" />
      <div className="windwiki-pdf-viewer__text" ref={textRef} />
    </div>
  );
});

export default function PdfViewer({ src, outline }: PdfViewerProps) {
  const url = useMemo(() => withBase(src), [src]);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pdfjs, setPdfjs] = useState<typeof import('pdfjs-dist') | null>(null);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState(0);
  /** 首页在 scale=1 时的尺寸。这份 PDF 124 页全是 A4，所以占位高度按它算就准。 */
  const [baseSize, setBaseSize] = useState({ width: 0, height: 0 });

  // 缩放：默认按容器宽度铺满，点 ± 之后切换成固定倍数
  const [fitWidth, setFitWidth] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [stageWidth, setStageWidth] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  /** 用户正在输入页码，这时不要让滚动位置覆盖他敲的内容 */
  const [editingPage, setEditingPage] = useState(false);
  const [visiblePages, setVisiblePages] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  // 搜索：query 是输入框里的值，activeQuery 是提交后用于高亮的值
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [hits, setHits] = useState<{ page: number; count: number }[] | null>(
    null,
  );
  const [matchPos, setMatchPos] = useState({ page: 1, ordinal: 1 });
  const [indexing, setIndexing] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const pageElements = useRef(new Map<number, HTMLDivElement>());
  const visibilityObserver = useRef<IntersectionObserver | null>(null);
  const currentPageRef = useRef(1);
  /** visiblePages 的同步副本：滚动回调里要用，但不能等 React 再渲染一轮 */
  const visiblePagesRef = useRef<ReadonlySet<number>>(new Set());
  /** 每页的 text item 原文（已归一化）。按 item 切分，才能和文字层的 span 一一对应。 */
  const indexRef = useRef(new Map<number, string[]>());

  // 右侧目录要挂进默认主题的大纲面板，而 portal 目标只有浏览器里才查得到：
  // 首屏（含 SSG）返回 null、挂载后再挂，服务端与客户端首次渲染一致。
  const [outlineContainer, setOutlineContainer] = useState<HTMLElement | null>(
    null,
  );
  useEffect(() => {
    setOutlineContainer(document.querySelector<HTMLElement>('.rp-outline__toc'));
  }, []);

  // 载入 PDF。pdfjs-dist 只在浏览器里动态引入：它依赖 DOM，构建期的 Node 端不能执行。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const module = await import('pdfjs-dist');
        module.GlobalWorkerOptions.workerSrc = withBase(PDF_WORKER_PATH);
        const task = module.getDocument({
          url,
          // 只按页取需要的字节区间（服务端要支持 Range，Pages 和本地预览都支持），
          // 不再一上来就把整份 3.7MB 拉下来 —— 打开第 1 页只需要几十 KB。
          // 搜索要抽全文，那时才会读到后面的部分，属于按需。
          disableAutoFetch: true,
        });
        loadingTaskRef.current = task;
        const loaded = await task.promise;
        if (cancelled) {
          void task.destroy();
          return;
        }
        const first = await loaded.getPage(1);
        if (cancelled) {
          return;
        }
        const viewport = first.getViewport({ scale: 1 });
        setBaseSize({ width: viewport.width, height: viewport.height });
        setPdfjs(module);
        setPdf(loaded);
        setNumPages(loaded.numPages);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    })();
    return () => {
      cancelled = true;
      // 销毁 loading task 会一并终止 worker；PDFDocumentProxy 自己没有 destroy
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const measure = () => setStageWidth(stage.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [pdf]);

  // 「适宽」铺满正文栏，但留个上限：超宽屏上 A4 铺满整屏反而不好读
  const scale = fitWidth
    ? baseSize.width > 0
      ? Math.min(stageWidth, MAX_PAGE_WIDTH) / baseSize.width
      : 0
    : zoom;

  // 页面的进出：用来决定渲染哪些页。预渲染范围给足，滚动时下一页基本已经准备好了。
  useEffect(() => {
    visibilityObserver.current = new IntersectionObserver(
      (entries) => {
        setVisiblePages((previous) => {
          const next = new Set(previous);
          for (const entry of entries) {
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting) {
              next.add(page);
            } else {
              next.delete(page);
            }
          }
          return next;
        });
      },
      { rootMargin: '900px 0px' },
    );
    // 子组件的 ref 回调在 effect 之前就跑完了，那时观察者还不存在，所以这里补一次
    for (const element of pageElements.current.values()) {
      visibilityObserver.current.observe(element);
    }
    return () => {
      visibilityObserver.current?.disconnect();
    };
  }, [numPages]);

  /**
   * 当前读到的页 = 在可视区里露出最多的那一页。
   *
   * 不看「第几页顶到某条线」：跳页时 scroll-margin、吸顶导航栏的高度都在变，
   * 差一点就会算成上一页。只比较可视面积则与这些偏移无关，翻到哪页就是哪页。
   * 候选只取 IntersectionObserver 报过「在视口附近」的页，一次几个 rect 而不是 124 个。
   */
  useEffect(() => {
    if (!numPages) {
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewportBottom = window.innerHeight;
      const viewportTop = toolbarRef.current?.getBoundingClientRect().bottom ?? 0;
      const guess = currentPageRef.current;
      const candidates = new Set(visiblePagesRef.current);
      candidates.add(guess);
      let best = guess;
      let bestArea = -1;
      for (const page of candidates) {
        const element = pageElements.current.get(page);
        if (!element) {
          continue;
        }
        const rect = element.getBoundingClientRect();
        const visible =
          Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop);
        if (visible > bestArea) {
          bestArea = visible;
          best = page;
        }
      }
      if (bestArea <= 0) {
        best = guess;
      }
      currentPageRef.current = best;
      setCurrentPage(best);
    };
    updateCurrentPageRef.current = update;
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [numPages, scale]);

  /**
   * 重算「当前页」。滚动事件先于 IntersectionObserver 的可见集合更新，
   * 所以两边都要触发一次：否则一次大跳（滚动条、Home/End）后候选里还是旧页，算不出来。
   */
  const updateCurrentPageRef = useRef<() => void>(() => {});

  useEffect(() => {
    visiblePagesRef.current = visiblePages;
    updateCurrentPageRef.current();
  }, [visiblePages]);

  const registerPage = useCallback(
    (page: number, element: HTMLDivElement | null) => {
      const previous = pageElements.current.get(page);
      if (previous && previous !== element) {
        visibilityObserver.current?.unobserve(previous);
        pageElements.current.delete(page);
      }
      if (element) {
        pageElements.current.set(page, element);
        visibilityObserver.current?.observe(element);
      }
    },
    [],
  );

  // 页面是按需渲染的，跳过去之后要等它渲染完才能把命中词滚到眼前
  const revealActiveHit = useCallback(() => {
    const started = Date.now();
    const tick = () => {
      const hit = document.querySelector(`.${HIT_ACTIVE}`);
      if (hit) {
        hit.scrollIntoView({ block: 'center' });
        return;
      }
      if (Date.now() - started < 3000) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  const jumpToPage = useCallback(
    (target: number, reveal = false) => {
      const next = Math.min(Math.max(target, 1), numPages || 1);
      currentPageRef.current = next;
      setCurrentPage(next);
      setPageInput(String(next));
      pageElements.current.get(next)?.scrollIntoView({ block: 'start' });
      if (reveal) {
        revealActiveHit();
      }
    },
    [numPages, revealActiveHit],
  );

  // 滚动读到的页要反映到页码框里
  useEffect(() => {
    if (!editingPage) {
      setPageInput(String(currentPage));
    }
  }, [currentPage, editingPage]);

  const goToPage = useCallback(
    (target: number) => {
      if (!Number.isFinite(target)) {
        setPageInput(String(currentPage));
        return;
      }
      jumpToPage(target);
    },
    [currentPage, jumpToPage],
  );

  // 搜索前先把整本的文字抽出来（一次约一两秒，抽完缓存在 indexRef 里）
  const ensureIndex = useCallback(async () => {
    const document_ = pdf;
    if (!document_ || indexRef.current.size === document_.numPages) {
      return;
    }
    for (let i = 1; i <= document_.numPages; i += 1) {
      if (!indexRef.current.has(i)) {
        const page = await document_.getPage(i);
        const content = await page.getTextContent();
        indexRef.current.set(
          i,
          content.items.map((item) => ('str' in item ? normalize(item.str) : '')),
        );
      }
      if (i % 10 === 0 || i === document_.numPages) {
        setIndexing(i);
      }
    }
    setIndexing(null);
  }, [pdf]);

  const runSearch = useCallback(
    async (raw: string) => {
      const needle = normalize(raw);
      if (!needle) {
        setActiveQuery('');
        setHits(null);
        return;
      }
      setIndexing(0);
      await ensureIndex();
      const found: { page: number; count: number }[] = [];
      const entries = [...indexRef.current.entries()].sort((a, b) => a[0] - b[0]);
      for (const [page, items] of entries) {
        const count = items.reduce(
          (sum, item) => sum + countOccurrences(item, needle),
          0,
        );
        if (count > 0) {
          found.push({ page, count });
        }
      }
      setActiveQuery(needle);
      setHits(found);
      if (found.length > 0) {
        // 从当前页往后找第一处；当前页之后没有了就绕回开头
        const from = found.find((hit) => hit.page >= currentPage) ?? found[0];
        setMatchPos({ page: from.page, ordinal: 1 });
        jumpToPage(from.page, true);
      }
    },
    [currentPage, ensureIndex, jumpToPage],
  );

  const stepMatch = useCallback(
    (direction: 1 | -1) => {
      if (!hits?.length) {
        return;
      }
      const current = hits.findIndex((hit) => hit.page === matchPos.page);
      let nextIndex = current === -1 ? 0 : current;
      let ordinal = matchPos.ordinal;
      if (current === -1) {
        ordinal = 1;
      } else if (direction === 1) {
        if (ordinal < hits[current].count) {
          ordinal += 1;
        } else {
          nextIndex = (current + 1) % hits.length;
          ordinal = 1;
        }
      } else if (ordinal > 1) {
        ordinal -= 1;
      } else {
        nextIndex = (current - 1 + hits.length) % hits.length;
        ordinal = hits[nextIndex].count;
      }
      const target = hits[nextIndex];
      setMatchPos({ page: target.page, ordinal });
      jumpToPage(target.page, true);
    },
    [hits, matchPos, jumpToPage],
  );

  const flatOutline = useMemo(() => flattenOutline(outline), [outline]);
  const activeOutlineIndex = useMemo(() => {
    let active = -1;
    flatOutline.forEach((item, index) => {
      if (item.node.page <= currentPage) {
        active = index;
      }
    });
    return active;
  }, [flatOutline, currentPage]);

  const [outlineListRef, setOutlineListRef] = useState<HTMLElement | null>(null);
  const [outlineItemRef, setOutlineItemRef] = useState<HTMLButtonElement | null>(
    null,
  );

  // 当前读到的小节滚进大纲可视区。用 getBoundingClientRect 手算而不用
  // scrollIntoView：后者会把整个窗口一起滚走。
  useEffect(() => {
    if (!outlineListRef || !outlineItemRef) {
      return;
    }
    const listRect = outlineListRef.getBoundingClientRect();
    const itemRect = outlineItemRef.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      outlineListRef.scrollTop += itemRect.top - listRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      outlineListRef.scrollTop += itemRect.bottom - listRect.bottom;
    }
  }, [outlineListRef, outlineItemRef]);

  const totalMatches = hits?.reduce((sum, hit) => sum + hit.count, 0) ?? 0;
  const matchOrdinal =
    (hits
      ?.filter((hit) => hit.page < matchPos.page)
      .reduce((sum, hit) => sum + hit.count, 0) ?? 0) + matchPos.ordinal;

  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, index) => index + 1),
    [numPages],
  );

  const outlinePanel = outlineContainer
    ? createPortal(
        <div className="windwiki-pdf-outline" ref={setOutlineListRef}>
          {flatOutline.map((item, index) => (
            <button
              key={`${item.node.page}-${item.node.title}-${index}`}
              type="button"
              ref={index === activeOutlineIndex ? setOutlineItemRef : undefined}
              className={
                index === activeOutlineIndex
                  ? 'rp-toc-item windwiki-pdf-outline__item rp-toc-item--active'
                  : 'rp-toc-item windwiki-pdf-outline__item'
              }
              // 缩进照默认主题的页面大纲：层级越深越往右，最多缩两级
              style={{ paddingLeft: Math.min(item.depth, 2) * 12 }}
              title={item.node.title}
              onClick={() => jumpToPage(item.node.page)}
            >
              <span className="rp-toc-item__text">{item.node.title}</span>
            </button>
          ))}
        </div>,
        outlineContainer,
      )
    : null;

  return (
    <div className="windwiki-pdf-viewer" ref={rootRef}>
      {outlinePanel}
      <div className="windwiki-pdf-viewer__toolbar" ref={toolbarRef}>
        <div className="windwiki-pdf-viewer__group">
          <button
            type="button"
            className="windwiki-pdf-viewer__button"
            aria-label="上一页"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            ‹
          </button>
          <input
            className="windwiki-pdf-viewer__page-input"
            aria-label="页码"
            value={pageInput}
            onFocus={() => setEditingPage(true)}
            onChange={(event) => setPageInput(event.target.value)}
            onBlur={(event) => {
              setEditingPage(false);
              goToPage(Number.parseInt(event.target.value, 10));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                goToPage(Number.parseInt(pageInput, 10));
                event.currentTarget.blur();
              }
            }}
          />
          <span className="windwiki-pdf-viewer__total">/ {numPages || '…'}</span>
          <button
            type="button"
            className="windwiki-pdf-viewer__button"
            aria-label="下一页"
            disabled={numPages === 0 || currentPage >= numPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            ›
          </button>
        </div>

        <div className="windwiki-pdf-viewer__group">
          <button
            type="button"
            className="windwiki-pdf-viewer__button"
            aria-label="缩小"
            onClick={() => {
              setFitWidth(false);
              setZoom((value) => Math.max(0.4, value - 0.1));
            }}
          >
            −
          </button>
          <span className="windwiki-pdf-viewer__zoom">
            {scale ? `${Math.round(scale * 100)}%` : '…'}
          </span>
          <button
            type="button"
            className="windwiki-pdf-viewer__button"
            aria-label="放大"
            onClick={() => {
              setFitWidth(false);
              // 从当前的「适宽」比例接着放大，而不是跳回 100%
              setZoom((value) => Math.min(3, (scale || value) + 0.1));
            }}
          >
            +
          </button>
          <button
            type="button"
            className="windwiki-pdf-viewer__button windwiki-pdf-viewer__button--text"
            aria-pressed={fitWidth}
            onClick={() => setFitWidth(true)}
          >
            适宽
          </button>
        </div>

        <form
          className="windwiki-pdf-viewer__search"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(query);
          }}
        >
          <input
            type="search"
            className="windwiki-pdf-viewer__search-input"
            placeholder="搜索全文"
            aria-label="在 PDF 中搜索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {indexing !== null ? (
            <span className="windwiki-pdf-viewer__search-count">索引中…</span>
          ) : hits && totalMatches > 0 ? (
            <span className="windwiki-pdf-viewer__search-count">
              第 {matchOrdinal} / {totalMatches} 处
            </span>
          ) : hits ? (
            <span className="windwiki-pdf-viewer__search-count">无结果</span>
          ) : null}
          <button
            type="button"
            className="windwiki-pdf-viewer__button"
            aria-label="上一处"
            disabled={!totalMatches}
            onClick={() => stepMatch(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="windwiki-pdf-viewer__button"
            aria-label="下一处"
            disabled={!totalMatches}
            onClick={() => stepMatch(1)}
          >
            ↓
          </button>
        </form>
      </div>

      <div className="windwiki-pdf-viewer__stage" ref={stageRef}>
        {error ? (
          <p className="windwiki-pdf-viewer__message">
            加载 PDF 失败：{error}
          </p>
        ) : null}
        {!pdf && !error ? (
          <p className="windwiki-pdf-viewer__message">正在加载 PDF…</p>
        ) : null}
        {pdf && pdfjs && scale > 0
          ? pageNumbers.map((page) => (
              <PdfPage
                key={page}
                pdf={pdf}
                pdfjs={pdfjs}
                page={page}
                scale={scale}
                width={baseSize.width * scale}
                height={baseSize.height * scale}
                visible={visiblePages.has(page)}
                query={activeQuery}
                activeOrdinal={
                  matchPos.page === page ? matchPos.ordinal : null
                }
                onHost={registerPage}
              />
            ))
          : null}
      </div>
    </div>
  );
}
