import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './fullscreen-toggle.css';

/**
 * 导航栏里的全屏按钮。
 *
 * 通过 rspress.config.ts 的 globalUIComponents 挂载。Rspress 的导航项由 _nav.json 配置、
 * 只支持链接，没有插入自定义按钮的插槽，所以这里用 portal 把按钮挂进 .rp-nav__right。
 *
 * portal 目标只能在浏览器里查到，因此首屏渲染返回 null、挂载后再挂载 portal——
 * 这样服务端和客户端首次渲染一致，不会有 hydration 不匹配。
 */
export default function FullscreenToggle() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('.rp-nav__right'));
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (!container) {
    return null;
  }

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  const label = fullscreen ? '退出全屏' : '进入全屏';

  return createPortal(
    <button
      type="button"
      className={
        fullscreen
          ? 'windwiki-fullscreen-toggle windwiki-fullscreen-toggle--on'
          : 'windwiki-fullscreen-toggle'
      }
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {/* 非全屏：进入全屏 */}
      <svg
        className="windwiki-fullscreen-toggle__icon windwiki-fullscreen-toggle__icon--enter"
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
        className="windwiki-fullscreen-toggle__icon windwiki-fullscreen-toggle__icon--exit"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M9 4v5H4" />
        <path d="M15 20v-5h5" />
        <path d="M20 9h-5V4" />
        <path d="M4 15h5v5" />
      </svg>
    </button>,
    container,
  );
}
