import {
  PANEL_HIDDEN,
  PANEL_SHOWN,
  PANELS,
  type PanelKey,
} from './panel-state';

/**
 * 面板折叠状态的客户端读取入口，配 useSyncExternalStore 使用。
 *
 * 状态的唯一真相是 <html> 上的 data 属性（CSS 也依赖它），localStorage 只负责跨刷新记住选择。
 * 不在这里额外存一份变量，避免两者不同步。
 *
 * 本文件只能被客户端组件 import，rspress.config.ts 不要引它（它读 DOM）。
 */
const listeners = new Set<() => void>();

export function isPanelHidden(panel: PanelKey): boolean {
  return document.documentElement.dataset[PANELS[panel].attr] === PANEL_HIDDEN;
}

/**
 * 服务端既没有 DOM 也没有 localStorage，统一按「展开」渲染。
 * React 用这个值产出服务端 HTML，并在 hydration 后拿客户端快照校正，
 * 所以既不会出现 hydration 不匹配，静态 HTML 里的 aria-pressed 也是确定的。
 */
export function getServerPanelHidden(): boolean {
  return false;
}

export function subscribePanel(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function togglePanel(panel: PanelKey): void {
  const { attr, storage } = PANELS[panel];
  const next = isPanelHidden(panel) ? PANEL_SHOWN : PANEL_HIDDEN;
  document.documentElement.dataset[attr] = next;
  try {
    localStorage.setItem(storage, next);
  } catch {
    // 隐私模式下 localStorage 可能不可写，此时只是不记住选择。
  }
  for (const listener of listeners) {
    listener();
  }
}
