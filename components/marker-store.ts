import { pathnameToRouteService, removeBase } from '@rspress/core/runtime';

/**
 * 标记（书签）的本地存储。
 *
 * 站点是纯静态的，没有后端，所以标记只存在浏览器本地 —— 换设备、换浏览器都看不到，
 * 清掉站点数据就没了。这是刻意的取舍，不是没做完。
 *
 * 一个 localStorage 键装下全站：{ [routePath]: Marker[] }，键名沿用仓库的
 * windwiki:<thing> 约定（见 panel-state.ts 的 PANELS）。
 *
 * 键必须是**干净的 routePath**（/llm-applications/python-basics/01-basics），
 * 不能直接用 location.pathname —— 站点没开 cleanUrls，地址栏里是
 * /windwiki/llm-applications/python-basics/01-basics.html，两者对不上。
 * 页面表（usePages()）、路由表和 navigate() 用的都是干净那份。
 *
 * 本文件只能被客户端组件 import（它读 localStorage），rspress.config.ts 不要引它。
 */

/**
 * 把 location.pathname 收敛成页面表里的 routePath（去 base、去 .html、统一 index）。
 *
 * pathnameToRouteService 就是 Rspress 自己用来桥接「地址栏」和「路由表」的，
 * 侧边栏高亮、Content 找组件都走它。匹配不上（比如 404）时退回去掉 base 的原样路径。
 */
export function currentRoutePath(pathname: string): string {
  const bare = removeBase(pathname);
  return pathnameToRouteService(bare)?.path ?? bare;
}

/** 定位一段内容需要的全部信息。存进 localStorage 的字段都在这里 */
export interface MarkerAnchor {
  kind: 'md' | 'pdf';
  /** 去掉所有空白并转小写后的选中文字，用来重新找位置 */
  quote: string;
  /** quote 前后各 32 字，用于消歧 */
  prefix: string;
  suffix: string;
  /** Markdown：标题的 id，优先用它定位（比文字引用稳） */
  headingId?: string;
  /** PDF：页码，从 1 开始 */
  page?: number;
  /** 原始选中文字，只在「复制」时用，不进存储 */
  text?: string;
}

export interface Marker extends MarkerAnchor {
  id: string;
  /** 列表里显示的文字。创建时就截断存下来，页面内容改了也不会变成空白项 */
  label: string;
  createdAt: number;
}

/** 一个页面上的全部标记 */
export interface MarkerGroup {
  routePath: string;
  markers: Marker[];
}

const STORAGE_KEY = 'windwiki:markers';

/** 单个页面的上限。超了丢最旧的 —— 防的是手滑连点，正常用不到 */
const MAX_PER_PAGE = 200;

type Store = Record<string, Marker[]>;

const listeners = new Set<() => void>();

/**
 * 服务端与「还没有任何标记」都用它。
 * 必须是同一个引用：useSyncExternalStore 会拿快照做相等判断，每次返回新数组会死循环。
 */
const NO_GROUPS: MarkerGroup[] = [];

let store: Store | null = null;

/**
 * localStorage 读不到（隐私模式）或内容坏了时，当作没有标记。
 * 顺带把键统一成 currentRoutePath 的形式：早先的版本直接用了 location.pathname，
 * 既带 base 又带 .html。
 */
function read(): Store {
  if (store) {
    return store;
  }

  const next: Store = {};
  let migrated = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        if (!Array.isArray(value) || value.length === 0) {
          continue;
        }
        const routePath = currentRoutePath(key);
        if (routePath !== key) {
          migrated = true;
        }
        next[routePath] = [...(next[routePath] ?? []), ...(value as Marker[])];
      }
    }
  } catch {
    store = {};
    return store;
  }

  store = next;
  if (migrated) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 写不进去就算了，内存里已经是新结构
    }
  }
  return store;
}

/**
 * 换掉整份数据再通知订阅者。
 * 这里只在被改动的那个 routePath 上换新数组，其余键沿用原引用 ——
 * 否则 useSyncExternalStore 会在每次写入后把所有页面都重渲染。
 */
function write(next: Store): void {
  store = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式写不进去、或超了配额：标记只在本次会话有效，不打断用户
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeMarkers(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 全站标记，按页面分组。
 *
 * 派生的数组缓存下来，靠 store 的对象标识判断要不要重算 ——
 * useSyncExternalStore 要求没变化时返回同一个引用。
 */
let derivedFrom: Store | null = null;
let derived: MarkerGroup[] = NO_GROUPS;

export function getAllMarkers(): MarkerGroup[] {
  const current = read();
  if (current !== derivedFrom) {
    derivedFrom = current;
    derived = Object.entries(current)
      .filter(([, markers]) => markers.length > 0)
      .map(([routePath, markers]) => ({ routePath, markers }));
  }
  return derived;
}

export function getServerMarkerGroups(): MarkerGroup[] {
  return NO_GROUPS;
}

export function addMarker(routePath: string, marker: Marker): void {
  const current = read();
  const list = current[routePath] ?? [];
  write({ ...current, [routePath]: [...list, marker].slice(-MAX_PER_PAGE) });
}

export function removeMarker(routePath: string, id: string): void {
  const current = read();
  const list = current[routePath];
  if (!list) {
    return;
  }
  const rest = list.filter((marker) => marker.id !== id);
  const next = { ...current };
  if (rest.length > 0) {
    next[routePath] = rest;
  } else {
    delete next[routePath];
  }
  write(next);
}

/** 清掉一个页面的标记。分组标题上的「清空」用这个 */
export function clearPage(routePath: string): void {
  const current = read();
  if (!current[routePath]) {
    return;
  }
  const next = { ...current };
  delete next[routePath];
  write(next);
}

/** crypto.randomUUID 要安全上下文，本地 http 之外的场景给个退路 */
export function newMarkerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
