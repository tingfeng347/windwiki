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
 * 左侧知识树 / 右侧目录的折叠按钮。
 *
 * 通过 rspress.config.ts 的 globalUIComponents 挂载，同一个模块注册两次、各带一个
 * panel 参数。组件渲染在 <Layout /> 的兄弟位置，所以只能用 position: fixed 定位。
 *
 * 按钮的两个图标由 CSS 按 <html> 上的 data 属性切换，不经过 React：
 * 服务端渲染时读不到折叠状态，若让图标依赖它就会产生 hydration 不匹配。
 * aria-pressed 则交给 useSyncExternalStore —— React 会先用服务端快照渲染、
 * hydration 后再用客户端快照校正，因此静态 HTML 和浏览器里都是正确的。
 */
export default function PanelToggle({ panel }: { panel: PanelKey }) {
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();
  const hidden = useSyncExternalStore(
    subscribePanel,
    () => isPanelHidden(panel),
    getServerPanelHidden,
  );

  const pageType = page?.pageType;
  const usesDocLayout =
    pageType !== 'home' &&
    pageType !== '404' &&
    pageType !== 'custom' &&
    pageType !== 'blank';

  if (!usesDocLayout || frontmatter?.sidebar === false) {
    return null;
  }

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
      {/* 展开状态：收起面板 */}
      <svg
        className="windwiki-panel-toggle__icon windwiki-panel-toggle__icon--collapse"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d={isSidebar ? 'M9 4v16' : 'M15 4v16'} />
        <path d={isSidebar ? 'm16.5 9.5-2.5 2.5 2.5 2.5' : 'm11.5 9.5 2.5 2.5-2.5 2.5'} />
      </svg>
      {/* 折叠状态：展开面板 */}
      <svg
        className="windwiki-panel-toggle__icon windwiki-panel-toggle__icon--expand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d={isSidebar ? 'M9 4v16' : 'M15 4v16'} />
        <path d={isSidebar ? 'm14 9.5 2.5 2.5-2.5 2.5' : 'm14 9.5-2.5 2.5 2.5 2.5'} />
      </svg>
    </button>
  );
}
