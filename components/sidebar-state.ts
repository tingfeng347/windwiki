/**
 * 侧边栏折叠状态。
 *
 * 状态存在两处，必须保持一致：
 * - `<html>` 上的 data 属性：给 CSS 用，决定侧边栏和按钮的显示
 * - localStorage：跨页面、跨刷新记住选择
 *
 * 属性值由 components/sidebar-toggle.tsx 在点击时写入，并在首次绘制前由
 * rspress.config.ts 里的内联脚本从 localStorage 恢复，避免刷新时先显示再收起。
 *
 * 这个文件不能依赖 React：rspress.config.ts 会 import 它来生成内联脚本，
 * 引入 React 会让构建期去打包运行时。
 */
export const SIDEBAR_STATE_ATTR = 'windwikiSidebar';

export const SIDEBAR_STORAGE_KEY = 'windwiki:sidebar';

export const SIDEBAR_HIDDEN = 'hidden';

export const SIDEBAR_SHOWN = 'shown';

/**
 * 在首次绘制前把 localStorage 里的选择写回 `<html>`，避免侧边栏闪一下再收起。
 * 用 try/catch 包住：隐私模式下 localStorage 可能直接抛异常。
 */
export const sidebarRestoreScript = `try{if(localStorage.getItem(${JSON.stringify(
  SIDEBAR_STORAGE_KEY,
)})===${JSON.stringify(SIDEBAR_HIDDEN)})document.documentElement.dataset.${SIDEBAR_STATE_ATTR}=${JSON.stringify(
  SIDEBAR_HIDDEN,
)}}catch(e){}`;
