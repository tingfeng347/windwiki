import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@rspress/core/runtime';
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
 * **不依赖 JS 类名**的选择器搞定（首屏第一帧生效），这里不再承担「防闪」职责 ——
 * 那件事必须交给 CSS。
 *
 * 触发时机：本组件是 globalUIComponent，挂在 Layout 的兄弟位置、只挂载一次，
 * 不会随路由卸载重挂。所以不能只在挂载时查一次 DOM：
 * - 必须用 usePage().pageType 判断「现在是否首页」，才能在客户端换页回到首页时补挂、
 *   离开首页时卸载（否则画布会一直空转）。
 * - 冷启动直达首页时，Hero 偶发晚于本组件一帧出现，一次 querySelector 失败就永久
 *   空白。这里用 MutationObserver 等它出现，并顺带处理节点被 React 换掉的情况 ——
 *   这几种时序错位正是「手机上有时加载不出来」的来源。
 *
 * 这里**不清空** .rp-home-hero__image 的占位 <img>：那几个节点由 React 管理，
 * 手动 innerHTML/replaceChildren 会让 React 的 diff 拿到已脱离文档的节点而报错；
 * 它们本来就被 CSS 隐藏，留着不占空间。
 *
 * 只在首页生效：其它页面没有 .rp-home-hero，查不到目标就什么都不渲染。
 */
const HERO_IMAGE = '.rp-home-hero__image';

function findHeroImage(): HTMLElement | null {
  return document.querySelector<HTMLElement>(HERO_IMAGE);
}

export function HomeGraphPortal() {
  const { page } = usePage();
  const isHome = page?.pageType === 'home';
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isHome) {
      setTarget(null);
      return;
    }

    let current: HTMLElement | null = null;
    // 只在目标节点真的换了实例时才 setState，避免 MutationObserver 的每次
    // 回调都触发重渲染。
    const sync = () => {
      const host = findHeroImage();
      if (host === current) return;
      current = host;
      setTarget(host);
    };

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      current = null;
    };
  }, [isHome]);

  if (!isHome || !target) return null;
  return createPortal(<KnowledgeGraph />, target);
}

// globalUIComponents 按默认导出取组件，具名导出不会被识别。
export default HomeGraphPortal;
