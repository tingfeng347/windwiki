import { useLocation, useNavigate, usePage, usePages } from '@rspress/core/runtime';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { clearHighlight, revealWithRetry } from './marker-anchor';
import { MarkerMenu } from './marker-menu';
import {
  clearPage,
  currentRoutePath,
  getAllMarkers,
  getServerMarkerGroups,
  removeMarker,
  subscribeMarkers,
  type Marker,
} from './marker-store';
import './marker.css';

/** 等了这么久还没落到目标页就放弃，免得 pending 卡住后续所有跳转 */
const NAV_TIMEOUT = 12000;

/** 定位失败时的提示停留时长 */
const MISSED_HINT = 2400;

/**
 * 导航栏的标记按钮 + 全站标记列表。
 *
 * 列表是**全站**的，按页面分组，当前页排在最前并标「本页」。点别的页面的标记会先
 * 用 react-router 跳过去，等那一页的数据真的加载好再定位。
 *
 * 按钮样式复用 nav-actions 的 .windwiki-nav-action（24×24、跟随它 ≤768px 隐藏）——
 * 触屏本来就没有右键手势，窄屏藏掉不亏。
 *
 * 面板 portal 到 body 并用 position: fixed：导航栏祖先上任何 transform/filter
 * 都会让 fixed 改相对它定位，挂到 body 上就不用操心。滚动时直接关掉。
 */
export function MarkerButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { page } = usePage();
  const { pages } = usePages();

  /** 用户当前所在的页面。收敛成路由表里的干净路径，才能和 usePages() / navigate() 对上 */
  const routePath = currentRoutePath(pathname);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [missed, setMissed] = useState(false);
  /** 跨页跳转时挂起的目标，等 page 换过来再执行 */
  const [pending, setPending] = useState<{ target: string; marker: Marker } | null>(null);

  const groups = useSyncExternalStore(
    subscribeMarkers,
    getAllMarkers,
    getServerMarkerGroups,
  );

  // 站点页面表里带标题，比存一份标题在标记里更准（页面改名后这里跟着变）
  const titleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of pages) {
      map.set(item.routePath, item.title || item.routePath);
    }
    return map;
  }, [pages]);

  // usePages() 的顺序就是站点顺序，拿它给分组排序
  const siteOrder = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((item, index) => map.set(item.routePath, index));
    return map;
  }, [pages]);

  const ordered = useMemo(
    () =>
      [...groups].sort((a, b) => {
        if (a.routePath === routePath) {
          return -1;
        }
        if (b.routePath === routePath) {
          return 1;
        }
        const left = siteOrder.get(a.routePath) ?? Number.MAX_SAFE_INTEGER;
        const right = siteOrder.get(b.routePath) ?? Number.MAX_SAFE_INTEGER;
        return left - right;
      }),
    [groups, routePath, siteOrder],
  );

  const total = useMemo(
    () => groups.reduce((sum, group) => sum + group.markers.length, 0),
    [groups],
  );

  const miss = () => {
    setMissed(true);
    window.setTimeout(() => setMissed(false), MISSED_HINT);
  };

  // 换页要把上一条标记的高亮收掉，否则会留在新页面上
  useEffect(() => {
    setOpen(false);
    clearHighlight();
  }, [routePath]);

  /*
   * 跨页跳转的第二步。navigate() 只换了 URL，正文是懒挂载的（Content 在 Suspense 里，
   * PDF 还要等 pdf.js 起来），所以用 page.routePath 当「这一页真的就绪了」的信号，
   * 而不是去猜 DOM。
   */
  useEffect(() => {
    if (!pending) {
      return;
    }
    if (page?.routePath !== pending.target) {
      const timer = window.setTimeout(() => {
        setPending(null);
        miss();
      }, NAV_TIMEOUT);
      return () => window.clearTimeout(timer);
    }

    const { marker } = pending;
    setPending(null);
    void revealWithRetry(marker).then((found) => {
      if (!found) {
        miss();
      }
    });
    return undefined;
  }, [pending, page]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const place = () => {
      const element = buttonRef.current;
      if (!element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      setAnchor({
        top: rect.bottom + 8,
        // 用 right 而不是 left：面板贴在按钮右缘向左展开，不会顶出视口
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    place();

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.windwiki-marker-panel, .windwiki-marker-toggle')) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const jump = (target: string, marker: Marker) => {
    setOpen(false);
    if (target === routePath) {
      void revealWithRetry(marker).then((found) => {
        if (!found) {
          miss();
        }
      });
      return;
    }
    setPending({ target, marker });
    navigate(target);
  };

  const label = missed ? '定位失败：这一页的内容可能改过了' : '标记';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="windwiki-nav-action windwiki-marker-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        <svg className="windwiki-nav-action__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.5 3h11a1 1 0 0 1 1 1v16.2a.5.5 0 0 1-.77.42L12 17l-5.73 3.62a.5.5 0 0 1-.77-.42V4a1 1 0 0 1 1-1z" />
        </svg>
        {total > 0 ? (
          <span className="windwiki-marker-toggle__badge">{total}</span>
        ) : null}
      </button>

      {open && anchor
        ? createPortal(
            <div
              className="windwiki-marker-panel"
              style={{ top: anchor.top, right: anchor.right }}
            >
              <div className="windwiki-marker-panel__head">
                <span className="windwiki-marker-panel__title">全部标记</span>
                <span className="windwiki-marker-panel__count">{total}</span>
              </div>

              {total === 0 ? (
                <p className="windwiki-marker-panel__empty">
                  选中文字或标题后右键，可以打标记。
                </p>
              ) : (
                <div className="windwiki-marker-panel__body">
                  {ordered.map((group) => (
                    <div key={group.routePath} className="windwiki-marker-panel__group">
                      <div className="windwiki-marker-panel__group-head">
                        <span className="windwiki-marker-panel__group-title">
                          {titleOf.get(group.routePath) ?? group.routePath}
                        </span>
                        {group.routePath === routePath ? (
                          <span className="windwiki-marker-panel__here">本页</span>
                        ) : null}
                        <button
                          type="button"
                          className="windwiki-marker-panel__clear"
                          onClick={() => clearPage(group.routePath)}
                        >
                          清空
                        </button>
                      </div>

                      <ul className="windwiki-marker-panel__list">
                        {[...group.markers].reverse().map((marker) => (
                          <li key={marker.id} className="windwiki-marker-panel__row">
                            <button
                              type="button"
                              className="windwiki-marker-panel__jump"
                              onClick={() => jump(group.routePath, marker)}
                            >
                              <span className="windwiki-marker-panel__where">
                                {marker.page ? `第 ${marker.page} 页` : '正文'}
                              </span>
                              <span className="windwiki-marker-panel__label">
                                {marker.label}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="windwiki-marker-panel__remove"
                              aria-label="删除这条标记"
                              title="删除"
                              onClick={() => removeMarker(group.routePath, marker.id)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>,
            document.body,
          )
        : null}

      <MarkerMenu />
    </>
  );
}
