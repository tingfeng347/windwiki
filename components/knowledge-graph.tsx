import { useEffect, useRef } from 'react';
import * as THREE from 'three';
// withBase 会把站点 base 前缀拼到站内绝对路径前，直接写裸路径丢 base。
import { withBase } from '@rspress/core/runtime';

/**
 * 首页的 3D 知识星图。
 *
 * 设计意图：把知识库的分类做成一组悬浮节点，节点间的连线表示学习路径上的先后关系。
 * 节点可以拖拽旋转、悬停放大、点击跳转，让「这个库里有什么」一眼可见，
 * 而不是用一段文字罗列。
 *
 * 几个工程上的取舍：
 * - 不用 importmap / CDN，走打包器把 three 打进来，离线与版本都可控。
 * - 材质全部用 MeshBasicMaterial（无光照），避免为几个小球维护光源和阴影，
 *   颜色直接从主题 CSS 变量读，深浅色都能跟着变。
 * - 尊重 prefers-reduced-motion：命中时只渲染一帧静态星图，不做自转和入场动画。
 * - 组件在首屏返回 null、挂载后才建场景，保证 SSR 与 hydration 一致。
 */

interface NodeDef {
  label: string;
  /** 相对坐标，半径约 0..1 的球面分布 */
  pos: [number, number, number];
  /** 视觉半径权重，用来区分主干分类与子分类 */
  weight: number;
  link: string;
}

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

export function KnowledgeGraph() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    // 相机贴近一些，让星图在容器里占得更满；节点坐标半径约 1，4.6 会显得偏小。
    camera.position.set(0, 0, 3.35);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      // 无 WebGL 时静默退出，由 CSS 背景兜底
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const root = new THREE.Group();
    scene.add(root);

    let brand = readVar('--rp-c-brand', '#3b82f6');
    let textColor = readVar('--rp-c-text-1', '#1f2937');

    // 用 canvas 生成文字贴图，避免为标签引入字体文件与额外依赖
    const makeLabel = (text: string) => {
      const pad = 12;
      const dpr = 2;
      const measure = document.createElement('canvas').getContext('2d')!;
      measure.font = LABEL_FONT;
      const w = Math.ceil(measure.measureText(text).width) + pad * 2;
      const h = 34;
      const canvas = document.createElement('canvas');
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.fillText(text, w / 2, h / 2);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set((w / h) * 0.3, 0.3, 1);
      sprite.userData.canvas = canvas;
      return sprite;
    };

    // 节点：球体 + 标签
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeLabels: THREE.Sprite[] = [];
    const nodePositions = NODES.map(
      (def) => new THREE.Vector3(def.pos[0], def.pos[1], def.pos[2]),
    );
    const nodeColors = NODES.map((_, i) =>
      i % 3 === 0 ? brand : textColor,
    );

    NODES.forEach((def, i) => {
      const geometry = new THREE.SphereGeometry(0.045 * def.weight, 24, 24);
      const material = new THREE.MeshBasicMaterial({
        color: nodeColors[i],
        transparent: true,
        opacity: 0.92,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(nodePositions[i]);
      mesh.userData.index = i;
      root.add(mesh);
      nodeMeshes.push(mesh);

      const label = makeLabel(def.label);
      label.position.copy(nodePositions[i]).add(new THREE.Vector3(0, 0.15 * def.weight + 0.06, 0));
      label.userData.index = i;
      root.add(label);
      nodeLabels.push(label);
    });

    // 连线
    const linkPositions: number[] = [];
    LINKS.forEach(([a, b]) => {
      linkPositions.push(
        nodePositions[a].x, nodePositions[a].y, nodePositions[a].z,
        nodePositions[b].x, nodePositions[b].y, nodePositions[b].z,
      );
    });
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linkPositions, 3),
    );
    const linkMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(brand),
      transparent: true,
      opacity: 0.35,
    });
    const links = new THREE.LineSegments(linkGeo, linkMat);
    root.add(links);

    // 背景细点，增加纵深
    const starCount = 260;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 2.4 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: new THREE.Color(textColor),
      size: 0.014,
      transparent: true,
      opacity: 0.45,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 鼠标交互：拖拽旋转 + 悬停命中
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let velX = 0.0016;
    let velY = 0;
    let hovered = -1;
    let pointerInside = false;

    const setPointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
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
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
      renderer.domElement.style.cursor = 'grab';
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

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('click', onClick);

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
        const canvas = s.userData.canvas as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;
        const dpr = 2;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
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

    // 渲染循环
    let raf = 0;
    let shown = reduceMotion;
    const clock = new THREE.Clock();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      // 入场：0.9 秒内从 0 放大到 1，缓出
      if (!shown) {
        const p = Math.min(t / 0.9, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        root.scale.setScalar(eased);
        if (p >= 1) shown = true;
      }

      if (!dragging) {
        root.rotation.y += velY;
        root.rotation.x += velX;
        // 惯性衰减，随后回到缓慢自转
        velY *= 0.985;
        velX *= 0.985;
        if (Math.abs(velY) < 0.0006) velY = 0.0006;
        if (Math.abs(velX) < 0.00002) velX = 0.00002;
        if (!reduceMotion) root.rotation.y += 0.0008;
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

      nodeLabels.forEach((s, i) => {
        const target = hovered === -1 || i === hovered ? 1 : 0.28;
        const o = (s.material as THREE.SpriteMaterial).opacity;
        (s.material as THREE.SpriteMaterial).opacity =
          o + (target - o) * 0.18;
      });
      if (hovered >= 0 && !dragging) renderer.domElement.style.cursor = 'pointer';
      else if (!dragging) renderer.domElement.style.cursor = 'grab';

      stars.rotation.y = t * 0.012;
      renderer.render(scene, camera);
    };
    tick();

    // 页面不可见时暂停，省电
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      mo.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('click', onClick);
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
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="windwiki-graph" aria-hidden="true" />;
}
