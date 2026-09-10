import { useFrontmatter, usePage } from '@rspress/core/runtime';
import { useSyncExternalStore } from 'react';
import {
  getServerPanelHidden,
  isPanelHidden,
  subscribePanel,
  togglePanel,
} from './panel-store';
import type { PanelKey } from './panel-state';
import './panel-toggle.css';

/**
 * 面板折叠按钮。左侧知识树固定在面板右上角，右侧目录由 nav-actions 放进导航栏，
 * 所以这里导出可复用的 PanelButton，默认导出只负责知识树那一个。
 *
 * globalUIComponents 只认默认导出，因此同一个模块在 rspress.config.ts 里注册的是
 * 默认导出（知识树），目录按钮则由 nav-actions.tsx 直接引用 PanelButton。
 *
 * 按钮的两个图标由 CSS 按 <html> 上的 data 属性切换，不经过 React：
 * 服务端渲染时读不到折叠状态，若让图标依赖它就会产生 hydration 不匹配。
 * aria-pressed 则交给 useSyncExternalStore —— React 会先用服务端快照渲染、
 * hydration 后再用客户端快照校正，因此静态 HTML 和浏览器里都是正确的。
 */
export function PanelButton({ panel }: { panel: PanelKey }) {
  const hidden = useSyncExternalStore(
    subscribePanel,
    () => isPanelHidden(panel),
    getServerPanelHidden,
  );

  const isSidebar = panel === 'sidebar';
  const label = isSidebar ? '左侧知识树' : '右侧目录';

  return (
    <button
      type="button"
      className={`windwiki-panel-toggle windwiki-panel-toggle--${panel}`}
      onClick={() => togglePanel(panel)}
      aria-pressed={hidden}
      aria-label={`显示或隐藏${label}`}
      title={`显示或隐藏${label}`}
    >
      {/* 展开状态：收起面板 —— 箭头指向面板外侧 */}
      <svg
        className="windwiki-panel-toggle__icon windwiki-panel-toggle__icon--collapse"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d={isSidebar ? 'M9 5v14' : 'M15 5v14'} />
        <path d={isSidebar ? 'm16.5 9.5-3 2.5 3 2.5' : 'm7.5 9.5 3 2.5-3 2.5'} />
      </svg>
      {/* 折叠状态：展开面板 —— 箭头指向面板内侧 */}
      <svg
        className="windwiki-panel-toggle__icon windwiki-panel-toggle__icon--expand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d={isSidebar ? 'M9 5v14' : 'M15 5v14'} />
        <path d={isSidebar ? 'm13.5 9.5 3 2.5-3 2.5' : 'm10.5 9.5-3 2.5 3 2.5'} />
      </svg>
    </button>
  );
}

export default function SidebarPanelToggle() {
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();

  const pageType = page?.pageType;
  const usesDocLayout =
    pageType !== 'home' &&
    pageType !== '404' &&
    pageType !== 'custom' &&
    pageType !== 'blank';

  // 目录按钮由 nav-actions 负责渲染，但「该不该出现」的判断两边要一致
  if (!usesDocLayout || frontmatter?.sidebar === false) {
    return null;
  }

  return <PanelButton panel="sidebar" />;
}
