import { useFrontmatter, usePage } from '@rspress/core/runtime';
import { useSyncExternalStore } from 'react';
import {
  getServerSidebarHidden,
  isSidebarHidden,
  subscribeSidebar,
  toggleSidebar,
} from './sidebar-store';
import './sidebar-toggle.css';

/**
 * 侧边栏折叠按钮。
 *
 * 通过 rspress.config.ts 的 globalUIComponents 挂载，渲染在 <Layout /> 的兄弟位置，
 * 所以只能用 position: fixed 定位，见 sidebar-toggle.css。
 *
 * 按钮的两个图标由 CSS 按 <html> 上的 data 属性切换，不经过 React：
 * 服务端渲染时读不到折叠状态，若让图标依赖它就会产生 hydration 不匹配。
 * aria-pressed 则交给 useSyncExternalStore —— React 会先用服务端快照渲染、
 * hydration 后再用客户端快照校正，因此静态 HTML 和浏览器里都是正确的。
 */
export default function SidebarToggle() {
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();
  const hidden = useSyncExternalStore(
    subscribeSidebar,
    isSidebarHidden,
    getServerSidebarHidden,
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

  return (
    <button
      type="button"
      className="windwiki-sidebar-toggle"
      onClick={toggleSidebar}
      aria-pressed={hidden}
      aria-label="显示或隐藏左侧目录"
      title="显示或隐藏左侧目录"
    >
      {/* 展开状态：收起目录 */}
      <svg
        className="windwiki-sidebar-toggle__icon windwiki-sidebar-toggle__icon--collapse"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d="m16.5 9.5-2.5 2.5 2.5 2.5" />
      </svg>
      {/* 折叠状态：展开目录 */}
      <svg
        className="windwiki-sidebar-toggle__icon windwiki-sidebar-toggle__icon--expand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d="m14 9.5 2.5 2.5-2.5 2.5" />
      </svg>
    </button>
  );
}
