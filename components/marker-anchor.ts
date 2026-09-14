import type { MarkerAnchor } from './marker-store';

/**
 * 把「一段选中的内容」变成可重新定位的锚点，以及反过来把锚点变回位置。
 *
 * 纯 DOM 工具，不碰 React，也不碰存储。
 *
 * 定位用的是「文字引用」：记下选中的文字，外加前后各 32 字用于消歧，重新定位时
 * 在同一个根元素下按文本顺序找回来。两种页面共用一套：
 *
 *   Markdown 页 → 根是 .rp-doc.rspress-doc
 *   PDF 页      → 根是该页的文字层 .windwiki-pdf-viewer__text
 *
 * 匹配前统一做「去掉所有空白 + 转小写」。PDF 文字层里的空格由 pdf.js 按字形位置
 * 生成，并不可靠，这一点和 pdf-viewer.tsx 的搜索用的是同一套归一化。
 *
 * Markdown 的标题另有更稳的锚：标题带 id（github-slugger 生成），优先用它。
 */

/** quote 前后各取多少字用于消歧 */
const CONTEXT = 32;

/** 列表里显示的文字上限 */
const LABEL_MAX = 80;

/** 等 PDF 文字层渲染出来的上限，和 pdf-viewer 的 revealActiveHit 一致 */
const WAIT_TIMEOUT = 3000;

const WHITESPACE = /\s/;

/** 高亮用的名字，配 CSS 的 ::highlight(windwiki-marker) */
const HIGHLIGHT = 'windwiki-marker';

/** 跳转后闪一下的类名 */
const FLASH = 'windwiki-marker-flash';

const PDF_PAGE = '.windwiki-pdf-viewer__page';
const PDF_TEXT = '.windwiki-pdf-viewer__text';
const DOC_ROOT = '.rp-doc.rspress-doc';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/** normalize 的逆操作做不了，所以两边都用它，保证存进去和找出来的是同一个串 */
export const normalizeTextIndex = (value: string) =>
  value.replace(/\s+/g, '').toLowerCase();

const collapse = (value: string) => value.replace(/\s+/g, ' ').trim();

function toElement(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement;
}

/* ------------------------------------------------------------------ 建索引 */

export interface TextIndex {
  /**
   * 根元素下的文本节点，按文档顺序排开。相邻两项首尾相接，
   * 于是「整段文字里的第 N 个字符」可以二分查到属于哪个节点、哪个偏移。
   */
  runs: Array<{ node: Text; start: number }>;
  /** norm 的第 i 个字符，对应整段文字里的哪个下标 */
  map: number[];
  /** 去掉空白并转小写后的整段文字 */
  norm: string;
}

export function buildTextIndex(root: Element): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const runs: Array<{ node: Text; start: number }> = [];
  const map: number[] = [];
  let norm = '';
  let cursor = 0;
  let node = walker.nextNode();

  while (node) {
    const text = node as Text;
    const value = text.data;
    runs.push({ node: text, start: cursor });
    for (let i = 0; i < value.length; i += 1) {
      const char = value.charAt(i);
      if (!WHITESPACE.test(char)) {
        norm += char.toLowerCase();
        map.push(cursor + i);
      }
    }
    cursor += value.length;
    node = walker.nextNode();
  }

  return { runs, map, norm };
}

/** 整段文字里的第 rawOffset 个字符 → 它属于哪个文本节点、哪个偏移 */
export function locateTextOffset(
  index: TextIndex,
  rawOffset: number,
): { node: Text; offset: number } | null {
  let low = 0;
  let high = index.runs.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (index.runs[mid].start <= rawOffset) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (found < 0) {
    return null;
  }
  const run = index.runs[found];
  const offset = rawOffset - run.start;
  if (offset < 0 || offset > run.node.data.length) {
    return null;
  }
  return { node: run.node, offset };
}

/** 整段文字里的下标 → 归一化串里的下标（map 是严格递增的，直接二分） */
function normIndexOf(index: TextIndex, rawOffset: number): number {
  let low = 0;
  let high = index.map.length - 1;
  let found = index.map.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (index.map[mid] >= rawOffset) {
      found = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return found;
}

/**
 * 某个节点在根元素整段文字里的起始下标。
 * range 的边界可能落在元素节点上（不是文本节点），那时返回 null，
 * 调用方退回「按文字找第一处」。
 */
function rawOffsetOf(root: Element, node: Node, offset: number): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) {
      return cursor + offset;
    }
    cursor += (current as Text).data.length;
    current = walker.nextNode();
  }
  return null;
}

/* -------------------------------------------------------------- 捕获锚点 */

/** 选区必须整段落在同一个根里，跨页、跨出正文的一律不认 */
function buildAnchor(
  kind: 'md' | 'pdf',
  text: string,
  root: Element,
  range: Range,
): MarkerAnchor {
  const index = buildTextIndex(root);
  const startRaw = rawOffsetOf(root, range.startContainer, range.startOffset);
  const endRaw = rawOffsetOf(root, range.endContainer, range.endOffset);

  // 由归一化串里切出来，而不是拿 selection.toString() 再归一化：
  // 这样 quote / prefix / suffix 和记下来的位置必然自洽
  let from =
    startRaw === null
      ? index.norm.indexOf(normalizeTextIndex(text))
      : normIndexOf(index, startRaw);
  if (from < 0 || from > index.norm.length) {
    from = index.norm.indexOf(normalizeTextIndex(text));
  }
  let to =
    endRaw === null
      ? from + normalizeTextIndex(text).length
      : normIndexOf(index, endRaw);
  if (to <= from) {
    to = from + normalizeTextIndex(text).length;
  }

  const quote = index.norm.slice(from, to);
  return {
    kind,
    quote,
    prefix: index.norm.slice(Math.max(0, from - CONTEXT), from),
    suffix: index.norm.slice(to, to + CONTEXT),
    text,
  };
}

function labelFor(text: string, isHeading: boolean): string {
  const collapsed = collapse(text);
  // 标题里那个 # 锚是 opacity:0 的链接，选中时可能被带进来
  return (isHeading ? collapsed.replace(/^#\s*/, '') : collapsed).slice(0, LABEL_MAX);
}

/**
 * 从当前选区读出一个锚点；不在可标记的正文里就返回 null。
 *
 * 返回 null 是调用方放行系统右键菜单的信号，所以这里的判断必须严格 ——
 * 判松了会把整站的右键都吃掉。
 */
export function captureSelection(selection: Selection): MarkerAnchor | null {
  if (selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();
  if (!text) {
    return null;
  }

  const start = toElement(range.startContainer);
  const end = toElement(range.endContainer);
  if (!start || !end) {
    return null;
  }

  // PDF 要排在前面：阅读器就渲染在 .rp-doc 里面，先判 Markdown 会误判
  const pageElement = start.closest<HTMLElement>(PDF_PAGE);
  if (pageElement) {
    if (!end.closest(PDF_PAGE)) {
      return null; // 跨页选区不认
    }
    const layer = pageElement.querySelector<HTMLElement>(PDF_TEXT);
    const page = Number(pageElement.dataset.page);
    if (!layer || !Number.isFinite(page)) {
      return null;
    }
    return { ...buildAnchor('pdf', text, layer, range), page };
  }

  const doc = start.closest<HTMLElement>(DOC_ROOT);
  if (!doc || !doc.contains(end)) {
    return null;
  }

  const heading = start.closest<HTMLElement>(HEADINGS);
  const isHeading = Boolean(heading?.id && heading.contains(end));
  const anchor = buildAnchor('md', text, doc, range);
  anchor.text = labelFor(text, isHeading);

  return isHeading && heading ? { ...anchor, headingId: heading.id } : anchor;
}

/**
 * 没有选区时，右键落在标题上就把这个标题标下来 —— 比先拖选再右键顺手。
 *
 * 标题里那个 # 锚要排除：用户想「复制链接地址」时就点在它上面，
 * 被我们的菜单截走会很难受。
 */
export function captureHeading(target: Element): MarkerAnchor | null {
  if (target.closest('.rp-header-anchor')) {
    return null;
  }
  const heading = target.closest<HTMLElement>(HEADINGS);
  if (!heading?.id || !heading.closest(DOC_ROOT)) {
    return null;
  }
  const clone = heading.cloneNode(true) as HTMLElement;
  clone.querySelector('.rp-header-anchor')?.remove();
  const text = collapse(clone.textContent ?? '');
  if (!text) {
    return null;
  }
  return {
    kind: 'md',
    quote: normalizeTextIndex(text),
    prefix: '',
    suffix: '',
    text,
    headingId: heading.id,
  };
}

/* ---------------------------------------------------------------- 高亮 */

/**
 * 高亮走 CSS Custom Highlight API，不改 DOM。
 *
 * PDF 的文字层会被 pdf-viewer 反复 replaceChildren（离开可视区时、每次改缩放时），
 * 往里插自己的节点一定会被清掉；Highlight 只引用 Range，没有这个问题。
 */
function highlightRegistry(): HighlightRegistry | null {
  return CSS.highlights ?? null;
}

function paint(range: Range): void {
  highlightRegistry()?.set(HIGHLIGHT, new Highlight(range));
}

export function clearHighlight(): void {
  highlightRegistry()?.delete(HIGHLIGHT);
}

/** 跳过去之后闪一下，让眼睛能找到落点 */
let flashTimer = 0;

function flash(element: Element): void {
  for (const previous of document.querySelectorAll(`.${FLASH}`)) {
    previous.classList.remove(FLASH);
  }
  // 读一次布局，让同一个元素连续跳转时动画能重头播
  void (element as HTMLElement).offsetWidth;
  element.classList.add(FLASH);
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => element.classList.remove(FLASH), 1200);
}

/* -------------------------------------------------------------- 定位跳转 */

/** 锚点 → Range。找不到内容时返回 null（页面被改过、PDF 换了版本） */
function findRange(root: Element, anchor: MarkerAnchor): Range | null {
  const index = buildTextIndex(root);
  const quote = normalizeTextIndex(anchor.quote);
  if (!quote) {
    return null;
  }

  // 先拿前后文精确定位，失败再退回「找第一处」
  let from = -1;
  if (anchor.prefix || anchor.suffix) {
    const withContext = index.norm.indexOf(anchor.prefix + quote + anchor.suffix);
    if (withContext >= 0) {
      from = withContext + anchor.prefix.length;
    }
  }
  if (from < 0) {
    from = index.norm.indexOf(quote);
  }
  if (from < 0) {
    return null;
  }

  const start = locateTextOffset(index, index.map[from]);
  const end = locateTextOffset(
    index,
    index.map[Math.min(from + quote.length - 1, index.map.length - 1)],
  );
  if (!start || !end) {
    return null;
  }

  const range = document.createRange();
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset + 1);
  } catch {
    return null;
  }
  return range;
}

/**
 * 把一段 Range 滚到视口中间。
 *
 * 纵向自己算而不用 scrollIntoView：Range 没有这个方法，而它所在的行内元素
 * （<strong>、文字层的 <span>）直接 scrollIntoView 会偏。横向则要动 PDF 放大后
 * 会横向滚动的 .stage，window.scrollTo 管不到它。
 */
function scrollRangeIntoView(range: Range): void {
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    return;
  }

  const padding =
    Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const centered = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
  window.scrollTo({ top: Math.max(0, centered - padding) });

  const stage = toElement(range.startContainer)?.closest<HTMLElement>(
    '.windwiki-pdf-viewer__stage',
  );
  if (stage && stage.scrollWidth > stage.clientWidth) {
    const stageRect = stage.getBoundingClientRect();
    stage.scrollLeft += rect.left - stageRect.left - (stage.clientWidth - rect.width) / 2;
  }
}

/** 标题整行高亮，但把那个 # 锚排除在外 */
function headingRange(heading: Element): Range | null {
  const range = document.createRange();
  range.selectNodeContents(heading);
  const first = heading.firstElementChild;
  if (first?.classList.contains('rp-header-anchor')) {
    range.setStartAfter(first);
  }
  return range.collapsed ? null : range;
}

/** 等 PDF 把这一页的文字层渲染出来。页容器一开始就在，内容是懒渲染的 */
function waitForTextLayer(layer: HTMLElement): Promise<boolean> {
  if (layer.childElementCount > 0) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (layer.childElementCount > 0) {
        resolve(true);
      } else if (Date.now() - started >= WAIT_TIMEOUT) {
        resolve(false);
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

function revealMarkdown(anchor: MarkerAnchor): boolean {
  const doc = document.querySelector<HTMLElement>(DOC_ROOT);
  if (!doc) {
    return false;
  }

  if (anchor.headingId) {
    const heading = document.getElementById(anchor.headingId);
    if (heading && doc.contains(heading)) {
      heading.scrollIntoView({ block: 'start' });
      flash(heading);
      const range = headingRange(heading);
      if (range) {
        paint(range);
      }
      return true;
    }
  }

  const range = findRange(doc, anchor);
  if (!range) {
    return false;
  }
  scrollRangeIntoView(range);
  paint(range);

  const element = toElement(range.startContainer)?.closest<HTMLElement>(
    'p, li, td, th, pre, blockquote',
  );
  if (element) {
    flash(element);
  }
  return true;
}

function revealPdf(anchor: MarkerAnchor): Promise<boolean> {
  const page = anchor.page;
  if (!page) {
    return Promise.resolve(false);
  }
  const pageElement = document.querySelector<HTMLElement>(
    `${PDF_PAGE}[data-page="${page}"]`,
  );
  if (!pageElement) {
    return Promise.resolve(false);
  }

  // 先滚到页：即使文字对不上（PDF 换过版本），也至少落在正确的一页
  pageElement.scrollIntoView({ block: 'start' });
  flash(pageElement);

  const layer = pageElement.querySelector<HTMLElement>(PDF_TEXT);
  if (!layer) {
    return Promise.resolve(true);
  }

  return waitForTextLayer(layer).then((ready) => {
    if (!ready) {
      return true;
    }
    const range = findRange(layer, anchor);
    if (!range) {
      return true;
    }
    scrollRangeIntoView(range);
    paint(range);
    return true;
  });
}

/**
 * 跳到锚点所在的位置并高亮。
 * 返回 false 表示内容已经对不上了（页面被改过），调用方可以据此提示用户。
 */
export function revealAnchor(anchor: MarkerAnchor): Promise<boolean> {
  clearHighlight();
  return anchor.kind === 'pdf'
    ? revealPdf(anchor)
    : Promise.resolve(revealMarkdown(anchor));
}

/** 跨页跳转后重试的节奏。PDF 首次加载要等 worker 和 getDocument，给宽一点 */
const RETRY_INTERVAL = 200;
const RETRY_TIMEOUT = 10000;

/**
 * 跨页跳转用的版本：反复试到成功为止。
 *
 * navigate() 之后正文是懒挂载的（Content 在 Suspense 里，PDF 还要等 pdf.js），
 * 头几次调用可能旧页面还在、或者新容器还没生成，都会返回 false。试一次就放弃
 * 会表现为「点了标记没反应」。
 */
export async function revealWithRetry(anchor: MarkerAnchor): Promise<boolean> {
  const started = Date.now();
  for (;;) {
    if (await revealAnchor(anchor)) {
      return true;
    }
    if (Date.now() - started >= RETRY_TIMEOUT) {
      return false;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, RETRY_INTERVAL);
    });
  }
}
