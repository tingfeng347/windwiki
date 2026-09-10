import { useFrontmatter, usePage } from '@rspress/core/runtime';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PanelButton } from './panel-toggle';
import './nav-actions.css';

/**
 * 导航栏右侧的一组按钮：全屏 + 右侧目录折叠。
 *
 * Rspress 的导航项来自 _nav.json、只支持链接，没有插入自定义按钮的插槽，所以用
 * createPortal 把这个容器挂进 .rp-nav__right。两个按钮放在同一个容器里，顺序由
 * 这个文件写死 —— 如果各自 portal 到导航栏，先后只能取决于 React 的挂载顺序。
 *
 * portal 目标只能在浏览器里查到，因此首屏渲染返回 null、挂载后再挂载 portal，
 * 这样服务端和客户端首次渲染一致，不会有 hydration 不匹配。
 */
function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  const label = fullscreen ? '退出全屏' : '进入全屏';

  return (
    <button
      type="button"
      className={
        fullscreen
          ? 'windwiki-nav-action windwiki-nav-action--on'
          : 'windwiki-nav-action'
      }
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {/* 非全屏：进入全屏 */}
      <svg
        className="windwiki-nav-action__icon windwiki-nav-action__icon--enter"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4 9V4h5" />
        <path d="M20 15v5h-5" />
        <path d="M15 4h5v5" />
        <path d="M9 20H4v-5" />
      </svg>
      {/* 全屏中：退出全屏 */}
      <svg
        className="windwiki-nav-action__icon windwiki-nav-action__icon--exit"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M9 4v5H4" />
        <path d="M15 20v-5h5" />
        <path d="M20 9h-5V4" />
        <path d="M4 15h5v5" />
      </svg>
    </button>
  );
}

export default function NavActions() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();

  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('.rp-nav__right'));
  }, []);

  const pageType = page?.pageType;
  const usesDocLayout =
    pageType !== 'home' &&
    pageType !== '404' &&
    pageType !== 'custom' &&
    pageType !== 'blank';

  if (!container) {
    return null;
  }

  return createPortal(
    <div className="windwiki-nav-actions">
      <FullscreenButton />
      {/* 目录按钮只在文档页有意义；首页/404 上 Rspress 也没有右侧目录 */}
      {usesDocLayout && frontmatter?.sidebar !== false ? (
        <PanelButton panel="outline" />
      ) : null}
    </div>,
    container,
  );
}
