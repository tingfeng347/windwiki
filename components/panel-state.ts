/**
 * 可折叠面板（左侧知识树、右侧目录）的状态定义。
 *
 * 状态存在两处，必须保持一致：
 * - `<html>` 上的 data 属性：给 CSS 用，决定面板和按钮的显示
 * - localStorage：跨页面、跨刷新记住选择
 *
 * 属性值由 components/panel-toggle.tsx 在点击时写入，并在首次绘制前由
 * rspress.config.ts 里的内联脚本从 localStorage 恢复，避免刷新时先显示再收起。
 *
 * 这个文件不能依赖 DOM 或 React：rspress.config.ts 会 import 它来生成内联脚本，
 * 引入 React 会让构建期去打包运行时。
 */
export type PanelKey = 'sidebar' | 'outline';

interface PanelConfig {
  /** 写到 <html> 上的 data 属性名（camelCase，对应 data-*） */
  attr: string;
  /** localStorage 的键 */
  storage: string;
}

export const PANELS: Record<PanelKey, PanelConfig> = {
  sidebar: { attr: 'windwikiSidebar', storage: 'windwiki:sidebar' },
  outline: { attr: 'windwikiOutline', storage: 'windwiki:outline' },
};

export const PANEL_HIDDEN = 'hidden';
export const PANEL_SHOWN = 'shown';

/**
 * 在首次绘制前把 localStorage 里的选择写回每个面板的 data 属性。
 * 用 try/catch 包住：隐私模式下 localStorage 可能直接抛异常。
 *
 * 每条语句必须以分号结尾：拼接出来的是一行代码，中间没有换行，ASI 不会补分号，
 * 少了它整段脚本会直接 SyntaxError（曾经因此让两个面板的持久化静默失效）。
 */
export const panelRestoreScript = `try{${Object.values(PANELS)
  .map(
    (panel) =>
      `if(localStorage.getItem(${JSON.stringify(panel.storage)})===${JSON.stringify(
        PANEL_HIDDEN,
      )})document.documentElement.dataset.${panel.attr}=${JSON.stringify(PANEL_HIDDEN)};`,
  )
  .join('')}}catch(e){}`;
