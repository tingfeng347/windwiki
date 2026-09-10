/**
 * 导航栏自动隐藏的状态。
 *
 * 滚动超过阈值后给 <html> 加 data-windwiki-nav="hidden"，styles/nav-auto-hide.css
 * 据此把导航栏淡出、并把它占的高度还给内容；鼠标移到导航栏上会把它显示回来。
 *
 * 写成内联脚本而不是 React 组件：浏览器是在脚本执行之后才恢复上次的滚动位置，
 * 用组件的话每次刷新到页面中部都会先闪一下导航栏。
 *
 * 这个文件不能依赖 DOM 或 React：rspress.config.ts 会 import 它来生成内联脚本。
 */

/**
 * 隐藏 / 显示用两个不同的阈值（滞回），不是同一个数。
 *
 * 收起导航栏会让文档少 64px，Chrome 的滚动锚定（scroll anchoring）为了保持画面稳定
 * 会把 scrollY 相应回退 64px。若只有一个阈值，回退后就掉回阈值以下 → 又展开 →
 * 再次超过 → 再次收起，形成振荡（实测在阈值附近 900ms 内触发了 57 次 scroll）。
 * 两个阈值间隔大于这 64px 的位移即可稳定。
 */
export const NAV_HIDE_AT = 160;
export const NAV_SHOW_AT = 80;

export const navAutoHideScript =
  `(function(){var H=${NAV_HIDE_AT},S=${NAV_SHOW_AT},e=document.documentElement;` +
  `function f(){var y=window.scrollY;` +
  `if(y>H){e.dataset.windwikiNav='hidden'}` +
  `else if(y<S){delete e.dataset.windwikiNav}}` +
  `window.addEventListener('scroll',f,{passive:true});` +
  `window.addEventListener('resize',f);` +
  `f()})();`;
