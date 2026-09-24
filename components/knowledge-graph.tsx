import { useEffect, useRef } from 'react';
// 只借类型，不引入运行时。真正加载 three 在 createGraphScene 里用 import('three') 完成，
// 这样 three 才会被拆成异步 chunk，而不是挂进入口脚本、每个文档页都跟着下载。
import type * as THREE from 'three';
// withBase 会把站点 base 前缀拼到站内绝对路径前，直接写裸路径丢 base。
import { withBase } from '@rspress/core/runtime';

/**
 * 首页的 3D 知识星图。
 *
 * 设计意图：把知识库的分类做成一组悬浮节点，节点间的连线表示学习路径上的先后关系。
 * 节点可以拖拽旋转、悬停放大、点击跳转，让「这个库里有什么」一眼可见，
 * 而不是用一段文字罗列。
 *
 * 性能上的取舍（首页在移动端也要能加载出来）：
 * - three 不再静态 import。它打包后约 700KB，静态引入会被 Rsbuild 提成入口脚本、
 *   所有文档页都跟着下载，而首页在手机上常常还没等它解析完就被人划走了。
 *   改成进首页、且浏览器空闲后再动态 import，three 只作为异步 chunk 按需拉取。
 * - 场景创建推迟到 requestIdleCallback（无此 API 时退回 setTimeout），把首屏文字与
 *   hydration 让在前面，不和 three 的解析/建场景抢主线程。
 * - 移动端限制 pixelRatio 与几何细分、把帧率压到 30fps，滚出视口后直接停帧；
 *   标签数量与球体分段都随屏幕变小，减少顶点与绘制调用。
 * - WebGL 创建失败、2D canvas 拿不到上下文、context lost 都静默降级，由 CSS 背景兜底，
 *   任何一个环节出错都不会抛到 React、影响首页其它内容。
 * - prefers-reduced-motion：不做自转与入场动画，只保留交互。
 */

interface NodeDef {
  label: string;
  /** 相对坐标，半径约 0..1 的球面分布 */
  pos: [number, number, number];
  /** 视觉半径权重，用来区分主干分类与子分类 */
  weight: number;
  link: string;
}

type Cleanup = () => void;

/**
 * 星图数据：主干分类来自 docs/llm-applications/_meta.json。
 * 连线表示「通常在学会前者之后更有用」的路径关系，不是严格依赖。
 *
 * link 写的是**站内绝对路径**、不带 base 前缀，点击时由 withBase() 补上。
 * 取值指向每个分类的**真实首页**：多数分类目录下没有 index.md，
 * 但不少子目录有 index.mdx（Rspress 会把 index.mdx 渲染成目录首页），
 * 所以既可以直接指向带 `index` 的路径，也可以指向不带它的目录路径。
 */
const NODES: NodeDef[] = [
  { label: 'Python 基础', pos: [-0.85, 0.35, 0.1], weight: 1.15, link: '/llm-applications/python-basics/01-basics' },
  { label: '数据结构与算法', pos: [-0.6, -0.35, 0.45], weight: 1.0, link: '/llm-applications/data-structures-and-algorithms/01-basics' },
  { label: 'Linux、Shell 与 Git', pos: [-0.95, -0.1, -0.35], weight: 0.95, link: '/llm-applications/linux-shell-git/01-linux' },
  { label: 'MySQL', pos: [-0.45, 0.5, -0.6], weight: 0.8, link: '/llm-applications/mysql/sql-basics/01-overview' },
  { label: 'Docker', pos: [-0.25, 0.05, 0.75], weight: 0.8, link: '/llm-applications/docker/docker' },
  { label: 'NumPy 与 Pandas', pos: [-0.15, 0.6, 0.35], weight: 0.9, link: '/llm-applications/numpy-pandas/index' },
  { label: 'FastAPI', pos: [0.05, -0.2, 0.85], weight: 0.85, link: '/llm-applications/fastapi/fastapi' },
  { label: '机器学习与深度学习', pos: [0.25, 0.45, 0.15], weight: 1.2, link: '/llm-applications/machine-learning-and-deep-learning/math-basics/index' },
  { label: 'NLP 与 LLM 原理', pos: [0.5, 0.1, -0.45], weight: 1.2, link: '/llm-applications/nlp-and-llm-principles/nlp/index' },
  { label: 'LangChain / LangGraph', pos: [0.75, -0.4, 0.2], weight: 1.05, link: '/llm-applications/langchain-langgraph-deepagents/langchain/index' },
  { label: 'RAG', pos: [0.7, 0.5, -0.25], weight: 1.0, link: '/llm-applications/rag/rag' },
  { label: '强化学习与多模态', pos: [0.4, -0.6, -0.5], weight: 0.9, link: '/llm-applications/reinforcement-learning-and-multimodal/index' },
  { label: '模型训练与部署', pos: [0.95, 0.05, 0.4], weight: 1.1, link: '/llm-applications/model-training-and-deployment/training/large-model-fine-tuning-course' },
  { label: '评估与优化', pos: [0.6, -0.15, 0.7], weight: 1.0, link: '/llm-applications/evaluation-and-optimization/knowledge-base-evaluation' },
  { label: 'Vibe Coding', pos: [0.15, -0.7, 0.3], weight: 0.8, link: '/llm-applications/vibe-coding/vibe-coding' },
  { label: 'AI 工程', pos: [0.9, 0.45, -0.1], weight: 1.25, link: '/llm-applications/ai-engineering/' },
  { label: '终端工具手册', pos: [-0.7, 0.65, 0.3], weight: 0.8, link: '/llm-applications/terminal-tool-manuals/tmux' },
  { label: 'LaTeX 科研写作', pos: [-0.3, -0.65, -0.55], weight: 0.75, link: '/research/latex/latex-manual' },
];

/** 连线：索引对，表示学习路径上的推进关系 */
const LINKS: [number, number][] = [
  [0, 1], [0, 2], [0, 5], [1, 7], [2, 4], [3, 6], [4, 6],
  [5, 7], [7, 8], [8, 9], [8, 10], [9, 13], [10, 13], [11, 7],
  [12, 13], [8, 16], [7, 16], [6, 12], [14, 16], [9, 15], [12, 17],
];

const LABEL_FONT =
  '600 13px "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif';

/** 从主题 CSS 变量读色，取不到时回退到安全色 */
function readVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * 把建场景放到浏览器空闲时执行：首屏的 hydration 与文字渲染优先。
 * 没有 requestIdleCallback 的旧浏览器（部分移动端）退回一个短延时。
 */
function scheduleIdle(cb: () => void): Cleanup {
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout: 1500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 120);
  return () => window.clearTimeout(id);
}

/**
 * 建好整个星图并挂到 host 上，返回清理函数。
 * 任何一步失败都返回 undefined，让调用方什么都不做（CSS 背景兜底）。
 */
async function createGraphScene(host: HTMLElement): Promise<Cleanup | undefined> {
  // 动态 import：three 只在首页真正建场景时才被拉取。
  let three: typeof import('three');
  try {
    three = await import('three');
  } catch {
    return undefined;
  }

  const smallScreen = window.matchMedia('(max-width: 1000px)').matches;
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(45, 1, 0.1, 100);
  // 相机贴近一些，让星图在容器里占得更满；节点坐标半径约 1，4.6 会显得偏小。
  camera.position.set(0, 0, 3.35);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new three.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
  } catch {
    // 无 WebGL（或上下文创建被拒）时静默退出，由 CSS 背景兜底
    return undefined;
  }
  // 移动端填充率是瓶颈：devicePixelRatio 常常是 3，按 2 倍渲染等于 4 倍像素。
  // 限制到 1.5 倍，桌面维持 2 倍。
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 2),
  );
  const canvas = renderer.domElement;
  host.appendChild(canvas);
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const root = new three.Group();
  scene.add(root);

  let brand = readVar('--rp-c-brand', '#3b82f6');
  let textColor = readVar('--rp-c-text-1', '#1f2937');

  // 用 canvas 生成文字贴图，避免为标签引入字体文件与额外依赖。
  // 复用一个测量用 context，别再为每个标签多建一块 canvas。
  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) {
    renderer.dispose();
    canvas.remove();
    return undefined;
  }
  measureCtx.font = LABEL_FONT;

  const makeLabel = (text: string) => {
    const pad = 12;
    const dpr = 2;
    const h = 34;
    const w = Math.ceil(measureCtx.measureText(text).width) + pad * 2;
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = w * dpr;
    labelCanvas.height = h * dpr;
    const ctx = labelCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(text, w / 2, h / 2);
    const tex = new three.CanvasTexture(labelCanvas);
    tex.minFilter = three.LinearFilter;
    const mat = new three.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });
    const sprite = new three.Sprite(mat);
    sprite.scale.set((w / h) * 0.3, 0.3, 1);
    sprite.userData.canvas = labelCanvas;
    return sprite;
  };

  // 节点：球体 + 标签。小屏降低分段数，顶点数与绘制开销都跟着降。
  const segments = smallScreen ? 14 : 24;
  const nodeMeshes: THREE.Mesh[] = [];
  const nodeLabels: THREE.Sprite[] = [];
  const nodePositions = NODES.map(
    (def) => new three.Vector3(def.pos[0], def.pos[1], def.pos[2]),
  );
  const nodeColors = NODES.map((_, i) => (i % 3 === 0 ? brand : textColor));

  NODES.forEach((def, i) => {
    const geometry = new three.SphereGeometry(0.045 * def.weight, segments, segments);
    const material = new three.MeshBasicMaterial({
      color: nodeColors[i],
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new three.Mesh(geometry, material);
    mesh.position.copy(nodePositions[i]);
    mesh.userData.index = i;
    root.add(mesh);
    nodeMeshes.push(mesh);

    const label = makeLabel(def.label);
    if (label) {
      label.position
        .copy(nodePositions[i])
        .add(new three.Vector3(0, 0.15 * def.weight + 0.06, 0));
      label.userData.index = i;
      root.add(label);
      nodeLabels.push(label);
    }
  });

  // 连线
  const linkPositions: number[] = [];
  LINKS.forEach(([a, b]) => {
    linkPositions.push(
      nodePositions[a].x, nodePositions[a].y, nodePositions[a].z,
      nodePositions[b].x, nodePositions[b].y, nodePositions[b].z,
    );
  });
  const linkGeo = new three.BufferGeometry();
  linkGeo.setAttribute(
    'position',
    new three.Float32BufferAttribute(linkPositions, 3),
  );
  const linkMat = new three.LineBasicMaterial({
    color: new three.Color(brand),
    transparent: true,
    opacity: 0.35,
  });
  const links = new three.LineSegments(linkGeo, linkMat);
  root.add(links);

  // 背景细点，增加纵深；小屏少画一些。
  const starCount = smallScreen ? 150 : 260;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const r = 2.4 + Math.random() * 2.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new three.BufferGeometry();
  starGeo.setAttribute('position', new three.BufferAttribute(starPos, 3));
  const starMat = new three.PointsMaterial({
    color: new three.Color(textColor),
    size: 0.014,
    transparent: true,
    opacity: 0.45,
  });
  const stars = new three.Points(starGeo, starMat);
  scene.add(stars);

  // 鼠标交互：拖拽旋转 + 悬停命中
  const raycaster = new three.Raycaster();
  const pointer = new three.Vector2();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0.0016;
  let velY = 0;
  let hovered = -1;
  let pointerInside = false;

  const setPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };

  const onMove = (e: PointerEvent) => {
    pointerInside = true;
    setPointer(e);
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    velY = dx * 0.0006;
    velX = dy * 0.0006;
    root.rotation.y += dx * 0.005;
    root.rotation.x += dy * 0.005;
  };

  const onUp = (e: PointerEvent) => {
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    canvas.style.cursor = 'grab';
  };

  const onLeave = () => {
    pointerInside = false;
    hovered = -1;
  };

  const onClick = () => {
    if (hovered < 0) return;
    // 必须走 withBase：link 写的是站内绝对路径（/llm-applications/...），
    // 直接赋给 location.href 会丢掉站点 base（本项目为 /windwiki/），
    // 结果被服务器判成「路径前缀不对」而拒绝。
    window.location.href = withBase(NODES[hovered].link);
  };

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);

  // 尺寸自适应
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // 主题切换时重建颜色
  const applyTheme = () => {
    brand = readVar('--rp-c-brand', '#3b82f6');
    textColor = readVar('--rp-c-text-1', '#1f2937');
    nodeMeshes.forEach((m, i) => {
      (m.material as THREE.MeshBasicMaterial).color.set(
        i % 3 === 0 ? brand : textColor,
      );
    });
    // 标签是 canvas 贴图，换色要重绘；按 DPR 还原变换后再按逻辑坐标画一次。
    nodeLabels.forEach((s) => {
      const labelCanvas = s.userData.canvas as HTMLCanvasElement | undefined;
      const ctx = labelCanvas?.getContext('2d');
      if (!labelCanvas || !ctx) return;
      const dpr = 2;
      const w = labelCanvas.width / dpr;
      const h = labelCanvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = LABEL_FONT;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(NODES[s.userData.index as number].label, w / 2, h / 2);
      (s.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    });
    (starMat.color as THREE.Color).set(textColor);
    (linkMat.color as THREE.Color).set(brand);
  };
  const mo = new MutationObserver(applyTheme);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });

  // 渲染循环：只在「页面可见 + 星图在视口里」时运行，移动端再压到 30fps。
  let raf = 0;
  let running = false;
  let onScreen = true;
  let visible = !document.hidden;
  let shown = reduceMotion;
  let lastFrame = 0;
  const minFrameGap = smallScreen ? 1000 / 30 : 0;
  const clock = new three.Clock();

  const tick = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    // 移动端降到约 30fps：旋转很慢，肉眼无差别，但 GPU 与电量省一半。
    if (minFrameGap && now - lastFrame < minFrameGap) return;
    lastFrame = now;

    const t = clock.getElapsedTime();

    // 入场：0.9 秒内从 0 放大到 1，缓出
    if (!shown) {
      const p = Math.min(t / 0.9, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      root.scale.setScalar(eased);
      if (p >= 1) shown = true;
    }

    // reduced motion 下不自转、不加惯性，只保留拖拽与悬停。
    if (!dragging && !reduceMotion) {
      root.rotation.y += velY;
      root.rotation.x += velX;
      // 惯性衰减，随后回到缓慢自转
      velY *= 0.985;
      velX *= 0.985;
      if (Math.abs(velY) < 0.0006) velY = 0.0006;
      if (Math.abs(velX) < 0.00002) velX = 0.00002;
      root.rotation.y += 0.0008;
    }

    // 悬停命中检测
    if (pointerInside) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodeMeshes, false);
      hovered = hits.length ? (hits[0].object.userData.index as number) : -1;
    }
    nodeMeshes.forEach((m, i) => {
      const target = i === hovered ? 1.9 : 1;
      const s = m.scale.x + (target - m.scale.x) * 0.18;
      m.scale.setScalar(s);
      (m.material as THREE.MeshBasicMaterial).opacity =
        hovered === -1 || i === hovered ? 0.92 : 0.32;
    });

    nodeLabels.forEach((s) => {
      const index = s.userData.index as number;
      const target = hovered === -1 || index === hovered ? 1 : 0.28;
      const o = (s.material as THREE.SpriteMaterial).opacity;
      (s.material as THREE.SpriteMaterial).opacity =
        o + (target - o) * 0.18;
    });
    if (hovered >= 0 && !dragging) canvas.style.cursor = 'pointer';
    else if (!dragging) canvas.style.cursor = 'grab';

    stars.rotation.y = t * 0.012;
    renderer.render(scene, camera);
  };

  const start = () => {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => {
    if (visible && onScreen) start();
    else stop();
  };

  // 滚出视口就停帧，别为看不见的东西耗电。
  const intersect = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      sync();
    },
    { threshold: 0 },
  );
  intersect.observe(host);

  const onVisibility = () => {
    visible = !document.hidden;
    sync();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // WebGL 上下文丢失（移动端切换应用/显存紧张时会出现）时停帧，恢复后再续。
  const onContextLost = () => stop();
  const onContextRestored = () => sync();
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  // 初始自转的角速度：reduced motion 下不启动循环也不需要。
  sync();

  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
    intersect.disconnect();
    ro.disconnect();
    mo.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    scene.traverse((obj) => {
      const anyObj = obj as unknown as {
        geometry?: { dispose(): void };
        material?: { dispose(): void; map?: { dispose(): void } };
      };
      anyObj.geometry?.dispose();
      anyObj.material?.map?.dispose();
      anyObj.material?.dispose();
    });
    renderer.dispose();
    canvas.remove();
  };
}

export function KnowledgeGraph() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup: Cleanup | undefined;

    const cancelIdle = scheduleIdle(() => {
      createGraphScene(host)
        .then((fn) => {
          if (disposed) fn?.();
          else cleanup = fn;
        })
        .catch(() => {
          // 兜底：建场景里任何异常都不该冒泡、影响首页其它内容。
        });
    });

    return () => {
      disposed = true;
      cancelIdle();
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} className="windwiki-graph" aria-hidden="true" />;
}
