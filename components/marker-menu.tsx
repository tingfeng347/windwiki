import { useLocation } from '@rspress/core/runtime';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { captureHeading, captureSelection } from './marker-anchor';
import { addMarker, currentRoutePath, newMarkerId, type MarkerAnchor } from './marker-store';
import './marker.css';

/**
 * 右键菜单：选中文字/标题后右键 →「打标记」。
 *
 * 关键取舍是**只在真的选中了东西时才接管右键**。captureSelection 返回 null
 * （没选区、选区在正文之外、跨页）就什么都不做，让浏览器的原生菜单照常弹出来 ——
 * 无条件 preventDefault 会把整站的右键都吃掉。
 *
 * 菜单里带「复制」是因为接管之后原生菜单就没了，不补上等于砍掉了系统的复制项。
 */

interface MenuState {
  x: number;
  y: number;
  anchor: MarkerAnchor;
}

const PREVIEW_MAX = 60;

export function MarkerMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  // 和存储用同一个键：路由表里的干净路径
  const routePath = currentRoutePath(pathname);

  // 换页时菜单不该留着
  useEffect(() => {
    setMenu(null);
  }, [routePath]);

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('.windwiki-marker-menu')) {
        return;
      }

      const selection = window.getSelection();
      const anchor =
        selection && !selection.isCollapsed
          ? captureSelection(selection)
          : captureHeading(target);
      if (!anchor) {
        return; // 放行系统菜单
      }

      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY, anchor });
    };

    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.windwiki-marker-menu')) {
        return;
      }
      setMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null);
      }
    };

    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  // 贴边时把菜单挪回视口内。直接写 style 而不是走 state：
  // 这里在 layout 阶段跑，改 style 不会多一次渲染，也不会闪
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element || !menu) {
      return;
    }
    const rect = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8))}px`;
  }, [menu]);

  if (!menu) {
    return null;
  }

  const preview = (menu.anchor.text ?? menu.anchor.quote)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREVIEW_MAX);
  const where = menu.anchor.page ? `第 ${menu.anchor.page} 页 · ` : '';

  const mark = () => {
    addMarker(routePath, {
      ...menu.anchor,
      id: newMarkerId(),
      label: preview,
      createdAt: Date.now(),
    });
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const copy = () => {
    void navigator.clipboard?.writeText(menu.anchor.text ?? menu.anchor.quote);
    setMenu(null);
  };

  return createPortal(
    <div
      ref={menuRef}
      className="windwiki-marker-menu"
      style={{ left: menu.x, top: menu.y }}
      // 点菜单的瞬间浏览器会清掉选区。锚点在右键时就已经存下来了，
      // 但这里拦一下能让选区在视觉上也留着
      onMouseDown={(event) => event.preventDefault()}
    >
      <p className="windwiki-marker-menu__preview">
        {where}
        {preview}
      </p>
      <button type="button" className="windwiki-marker-menu__item" onClick={mark}>
        打标记
      </button>
      <button type="button" className="windwiki-marker-menu__item" onClick={copy}>
        复制
      </button>
    </div>,
    document.body,
  );
}
