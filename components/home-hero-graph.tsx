import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KnowledgeGraph } from './knowledge-graph';
import './home-hero-graph.css';

/**
 * 把 3D 知识星图挂进首页 Hero 的图像位。
 *
 * 为什么这样做而不是 fork 主题：项目约定不 fork 主题组件。HomeHero 已经预留了
 * `hero.image` 这个右侧插槽（有 image 时容器才会变成左右两栏），所以让 index.mdx
 * 给出一个占位的 image.src（一张透明 SVG），再把真实画布 portal 进
 * .rp-home-hero__image，这样既复用了主题的两栏布局与响应式行为，又没有自定义主题。
 *
 * 关于闪烁：占位 <img> 的隐藏与右栏尺寸都在 styles/home-graph.css 里用
 * **不依赖 JS 类名**的选择器搞定（首屏第一帧生效），这里只负责把占位图从 DOM 里
 * 真正摘掉、再把画布插进去，不再承担「防闪」职责 —— 那件事必须交给 CSS。
 *
 * portal 目标只能在浏览器里查到，所以首屏返回 null、挂载后再 portal，
 * 保证服务端与客户端首次渲染一致（与 nav-actions.tsx 同一套做法）。
 *
 * 只在首页生效：其它页面没有 .rp-home-hero，查不到目标就什么都不渲染。
 */
export function HomeGraphPortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const host = document.querySelector<HTMLElement>('.rp-home-hero__image');
    if (!host) return;
    // 占位 <img> 已被 CSS 隐藏，这里只是把它摘出 DOM，避免留下无用节点。
    host.innerHTML = '';
    setTarget(host);
  }, []);

  if (!target) return null;
  return createPortal(<KnowledgeGraph />, target);
}

// globalUIComponents 按默认导出取组件，具名导出不会被识别。
export default HomeGraphPortal;
