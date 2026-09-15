import { usePage } from '@rspress/core/runtime';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  buildTextIndex,
  locateTextOffset,
  normalizeTextIndex,
} from './marker-anchor';
import './document-reader.css';

const DOC_ROOT = '.rp-doc-layout__doc-container > .rp-doc.rspress-doc';
const HIT = 'windwiki-doc-search-hit';
const HIT_ACTIVE = 'windwiki-doc-search-active';
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}

interface HighlightConstructor {
  new (...ranges: Range[]): unknown;
}

function highlightRegistry(): HighlightRegistry | null {
  if (typeof CSS === 'undefined') {
    return null;
  }
  return (
    CSS as unknown as { highlights?: HighlightRegistry }
  ).highlights ?? null;
}

function highlightConstructor(): HighlightConstructor | null {
  return (
    globalThis as typeof globalThis & { Highlight?: HighlightConstructor }
  ).Highlight ?? null;
}

function clearSearchHighlights(): void {
  const registry = highlightRegistry();
  registry?.delete(HIT);
  registry?.delete(HIT_ACTIVE);
}

/**
 * 按 Markdown 正文的完整文字索引建立 Range。索引会忽略空白，因此查询可以跨越
 * 换行和 strong/code 等行内节点，效果和 PDF 文字层搜索保持一致。
 */
function findRanges(root: HTMLElement, query: string): Range[] {
  const needle = normalizeTextIndex(query);
  if (!needle) {
    return [];
  }

  const index = buildTextIndex(root);
  const ranges: Range[] = [];
  let from = 0;

  while (from <= index.norm.length - needle.length) {
    const found = index.norm.indexOf(needle, from);
    if (found < 0) {
      break;
    }

    const startRaw = index.map[found];
    const endRaw = index.map[found + needle.length - 1];
    const start = locateTextOffset(index, startRaw);
    const end = locateTextOffset(index, endRaw);

    if (start && end) {
      const range = document.createRange();
      try {
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset + 1);
        ranges.push(range);
      } catch {
        // 页面正好在客户端路由切换时被替换：忽略这处，下一次搜索会重建索引。
      }
    }

    from = found + Math.max(needle.length, 1);
  }

  return ranges;
}

function revealRange(range: Range): void {
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    return;
  }

  const padding =
    Number.parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingTop,
    ) || 0;
  const centered =
    window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
  window.scrollTo({
    top: Math.max(0, centered - padding),
    behavior: 'smooth',
  });
}

/**
 * Markdown 阅读工具条：复用 PDF 阅读器的缩放、搜索与底部悬浮交互。
 *
 * 它是 globalUIComponent，但只在普通 Markdown/MDX 正文页出现；含 PdfViewer 的课程页
 * 继续使用自己的工具条。搜索高亮走 CSS Custom Highlight API，不向 Rspress 管理的
 * 正文 DOM 插入 <mark>，从而不会干扰 hydration 或客户端换页。
 */
export default function DocumentReader() {
  const { page } = usePage();
  const routePath = page?.routePath;
  const pageType = page?.pageType;
  const [doc, setDoc] = useState<HTMLElement | null>(null);
  // Markdown 没有 PDF 的页尺寸；这里把 100% 定义为“适合正文栏的宽度”。
  // 一旦手动缩放，就保留真实放大宽度并交给正文栏横向滚动，语义与 PDF 的适宽一致。
  const [fitWidth, setFitWidth] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rail, setRail] = useState({ left: 0, right: 0 });
  const rangesRef = useRef<Range[]>([]);

  const usesDocLayout =
    pageType !== 'home' &&
    pageType !== '404' &&
    pageType !== 'custom' &&
    pageType !== 'blank' &&
    // 本项目的 doc-wide 页面都是 PDF 课程；先按页面数据排除，避免路由切换时
    // Suspense 里的 PdfViewer 尚未挂载、短暂误认成普通 Markdown。
    pageType !== 'doc-wide';

  const resetSearch = useCallback(() => {
    clearSearchHighlights();
    rangesRef.current = [];
    setSearched(false);
    setActiveIndex(-1);
  }, []);

  // page.routePath 是 Rspress 新页面数据已经就绪的信号；正文还在 Suspense 里时短暂重试。
  useEffect(() => {
    resetSearch();
    setQuery('');
    setFitWidth(true);
    setZoom(1);
    setDoc(null);

    if (!usesDocLayout) {
      return;
    }

    let cancelled = false;
    let timer = 0;
    const started = Date.now();
    const locate = () => {
      if (cancelled) {
        return;
      }
      const candidate = document.querySelector<HTMLElement>(DOC_ROOT);
      if (candidate) {
        // PDF 课程页有自己的同款工具条，不能再叠一条 Markdown 工具条。
        if (!candidate.querySelector('.windwiki-pdf-viewer')) {
          setDoc(candidate);
        }
        return;
      }
      if (Date.now() - started < 10_000) {
        timer = window.setTimeout(locate, 100);
      }
    };
    locate();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      clearSearchHighlights();
    };
  }, [resetSearch, routePath, usesDocLayout]);

  // 手动缩放时不再反向收窄正文宽度：那会把宽图/宽表锁在左侧并留下空白。
  // 保留真实放大后的宽度，由默认正文栏提供横向滚动，和 PDF 放大后的行为一致。
  useLayoutEffect(() => {
    if (!doc) {
      return;
    }
    doc.classList.add('windwiki-doc-reader-active');
    doc.style.setProperty('--windwiki-doc-zoom', String(fitWidth ? 1 : zoom));
    return () => {
      doc.classList.remove('windwiki-doc-reader-active');
      doc.style.removeProperty('--windwiki-doc-zoom');
    };
  }, [doc, fitWidth, zoom]);

  // 固定底栏与正文列左右对齐；折叠知识树/大纲、缩放窗口时都会重新测量。
  useLayoutEffect(() => {
    if (!doc) {
      return;
    }
    const column = doc.closest<HTMLElement>('.rp-doc-layout__doc') ?? doc;
    const update = () => {
      const rect = column.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      setRail({
        left: Math.max(0, Math.round(rect.left)),
        right: Math.max(0, Math.round(viewportWidth - rect.right)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(column);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [doc]);

  const paintActive = useCallback((index: number, reveal = true) => {
    const ranges = rangesRef.current;
    const registry = highlightRegistry();
    const HighlightClass = highlightConstructor();
    if (index < 0 || !ranges[index]) {
      return;
    }
    // 不支持 CSS Custom Highlight API 的浏览器仍可计数和逐项跳转，只是没有底色。
    if (registry && HighlightClass) {
      registry.delete(HIT_ACTIVE);
      registry.set(HIT_ACTIVE, new HighlightClass(ranges[index]));
    }
    setActiveIndex(index);
    if (reveal) {
      revealRange(ranges[index]);
    }
  }, []);

  const runSearch = useCallback(
    (rawQuery: string) => {
      resetSearch();
      if (!doc || !rawQuery.trim()) {
        return;
      }

      const registry = highlightRegistry();
      const HighlightClass = highlightConstructor();
      const ranges = findRanges(doc, rawQuery);
      rangesRef.current = ranges;
      setSearched(true);

      if (registry && HighlightClass && ranges.length > 0) {
        registry.set(HIT, new HighlightClass(...ranges));
      }
      if (ranges.length > 0) {
        paintActive(0);
      }
    },
    [doc, paintActive, resetSearch],
  );

  const stepMatch = useCallback(
    (direction: 1 | -1) => {
      const count = rangesRef.current.length;
      if (!count) {
        return;
      }
      const next =
        activeIndex < 0
          ? direction === 1
            ? 0
            : count - 1
          : (activeIndex + direction + count) % count;
      paintActive(next);
    },
    [activeIndex, paintActive],
  );

  // 点搜索框自带的清除按钮时立即撤掉旧高亮，不必再按一次 Enter。
  useEffect(() => {
    if (!query) {
      resetSearch();
    }
  }, [query, resetSearch]);

  if (!doc) {
    return null;
  }

  const count = rangesRef.current.length;
  const effectiveZoom = fitWidth ? 1 : zoom;
  const percentage = Math.round(effectiveZoom * 100);

  return (
    <div
      className="windwiki-doc-reader"
      // 它是 Layout 的同级全局组件。阻止事件冒泡到默认主题的文档层，避免主题侧
      // 的点击/快捷键处理抢走输入框、按钮和 Enter 搜索。
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      style={{
        '--windwiki-doc-rail-left': `${rail.left}px`,
        '--windwiki-doc-rail-right': `${rail.right}px`,
      } as React.CSSProperties}
    >
      <span className="windwiki-doc-reader__rail-zone" aria-hidden="true" />
      <div className="windwiki-doc-reader__panel">
        <div className="windwiki-doc-reader__group">
          <button
            type="button"
            className="windwiki-doc-reader__button"
            aria-label="缩小 Markdown 正文"
            title="缩小"
            disabled={!fitWidth && zoom <= MIN_ZOOM}
            onClick={() => {
              setFitWidth(false);
              setZoom((value) =>
                Math.max(MIN_ZOOM, Number(((fitWidth ? 1 : value) - ZOOM_STEP).toFixed(1))),
              );
            }}
          >
            −
          </button>
          <span className="windwiki-doc-reader__zoom" aria-live="polite">
            {percentage}%
          </span>
          <button
            type="button"
            className="windwiki-doc-reader__button"
            aria-label="放大 Markdown 正文"
            title="放大"
            disabled={!fitWidth && zoom >= MAX_ZOOM}
            onClick={() => {
              setFitWidth(false);
              setZoom((value) =>
                Math.min(MAX_ZOOM, Number(((fitWidth ? 1 : value) + ZOOM_STEP).toFixed(1))),
              );
            }}
          >
            +
          </button>
          <button
            type="button"
            className="windwiki-doc-reader__button windwiki-doc-reader__button--text"
            aria-label="适应 Markdown 正文宽度"
            aria-pressed={fitWidth}
            title="适宽"
            onClick={() => {
              setFitWidth(true);
              setZoom(1);
            }}
          >
            适宽
          </button>
        </div>

        <form
          className="windwiki-doc-reader__search"
          onSubmit={(event) => {
            event.preventDefault();
            if (searched && normalizeTextIndex(query) && count > 0) {
              stepMatch(1);
            } else {
              runSearch(query);
            }
          }}
        >
          <input
            type="search"
            className="windwiki-doc-reader__search-input"
            placeholder="搜索全文"
            aria-label="在 Markdown 正文中搜索"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (searched) {
                resetSearch();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.shiftKey && searched && count > 0) {
                event.preventDefault();
                stepMatch(-1);
              } else if (event.key === 'Escape') {
                setQuery('');
                resetSearch();
                event.currentTarget.blur();
              }
            }}
          />
          <span
            className="windwiki-doc-reader__search-count"
            aria-live="polite"
          >
            {searched
              ? count > 0
                ? `第 ${activeIndex + 1} / ${count} 处`
                : '无结果'
              : null}
          </span>
          <button
            type="button"
            className="windwiki-doc-reader__button"
            aria-label="上一处"
            title="上一处（Shift + Enter）"
            disabled={!count}
            onClick={() => stepMatch(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="windwiki-doc-reader__button"
            aria-label="下一处"
            title="下一处（Enter）"
            disabled={!count}
            onClick={() => stepMatch(1)}
          >
            ↓
          </button>
        </form>
      </div>
    </div>
  );
}
