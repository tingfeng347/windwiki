import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFrontmatter, usePage } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import { KnowledgeGraph } from './knowledge-graph';
import { HomeShowcase, type HomeTopic } from './home-showcase';
import './home-hero-graph.css';

const STAGE_TAGS = [
  ['Python', 'Linux / Git', 'FastAPI'],
  ['机器学习', 'Transformer', 'LLM'],
  ['RAG', 'Agent', '训练与部署'],
];
const STAGE_LINKS = ['从开发基础开始', '进入模型原理', '探索 Agent 工程'];

function Arrow() {
  return <svg className="ww-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}

function ArtFrame() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const overlay = ref.current;
    const canvas = overlay?.parentElement;
    if (!overlay || !canvas) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let x = 0;
    let y = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      canvas.style.setProperty('--ww-pointer-x', `${x}deg`);
      canvas.style.setProperty('--ww-pointer-y', `${y}deg`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const reset = () => { x = y = 0; schedule(); };
    const move = (event: PointerEvent) => {
      if (motion.matches || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2)) * 4;
      y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2)) * -3;
      schedule();
    };
    const syncVisibility = () => { overlay.dataset.playing = String(visible && !document.hidden && !motion.matches); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncVisibility(); });
    observer.observe(canvas);
    const syncMotion = () => { reset(); syncVisibility(); };
    canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', syncVisibility);
    motion.addEventListener('change', syncMotion);
    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', syncVisibility);
      motion.removeEventListener('change', syncMotion);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <>
    <div className="ww-art-overlay" ref={ref} aria-hidden="true">
      <svg className="ww-art-orbits" viewBox="0 0 640 410" fill="none">
        <ellipse cx="320" cy="205" rx="286" ry="173" transform="rotate(-15 320 205)" />
        <path d="M38 100h87v63M597 298h-89v-58" />
        <circle cx="52" cy="258" r="5" /><circle cx="570" cy="97" r="5" />
      </svg>
      {['tl', 'tr', 'bl', 'br'].map(corner => <span key={corner} className={`ww-frame-corner ww-frame-corner--${corner}`} />)}
      <span className="ww-art-chip ww-art-chip--code"><span><i>⌘</i>Python<small>写下第一行代码</small></span></span>
      <span className="ww-art-chip ww-art-chip--rag"><span><i>↗</i>RAG<small>让知识参与回答</small></span></span>
      <span className="ww-art-chip ww-art-chip--agent"><span><i>✳</i>Agent<small>让模型学会行动</small></span></span>
      <span className="ww-art-caption">知识在流动</span>
    </div>
    <div className="ww-hero-foot">
      <span>原理与实践，在这里连接</span>
      <a href="#features"><span className="ww-scroll-line" aria-hidden="true" />向下，连接知识</a>
    </div>
  </>;
}

function Blueprint({ stage }: { stage: number }) {
  const nodes = [
    { x: 22, y: 46, label: 'Python', stage: 0 },
    { x: 247, y: 46, label: 'API / 数据', stage: 0 },
    { x: 22, y: 154, label: '机器学习', stage: 1 },
    { x: 247, y: 154, label: 'Transformer', stage: 1 },
    { x: 22, y: 262, label: 'RAG / Agent', stage: 2 },
    { x: 247, y: 262, label: '部署 / 评估', stage: 2 },
  ];
  return <div className="ww-blueprint" data-stage={stage}>
    <svg viewBox="0 0 400 350" role="img" aria-label={`学习路径：开发基础、模型原理、应用工程。当前阶段：${STAGE_TAGS[stage].join('、')}`}>
      <g className="ww-blueprint__grid" opacity=".65">
        {Array.from({ length: 11 }, (_, i) => <path key={`v${i}`} d={`M${i * 40} 0v350`} />)}
        {Array.from({ length: 9 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 40}h400`} />)}
      </g>
      <g className="ww-blueprint__route">
        <path d="M143 70h104M307 94v60M247 178H143M82 202v60M143 286h104" />
        <path d="m195 66 4 4-4 4m108 46 4 4 4-4m-112 54-4 4 4 4m-121 50 4 4 4-4m109 54 4 4-4 4" />
      </g>
      {nodes.map(node => <g key={node.label} className={`ww-blueprint__node ww-blueprint__node--${node.stage}`}>
        <rect x={node.x} y={node.y} width="121" height="48" rx="5" />
        <text x={node.x + 60.5} y={node.y + 29} textAnchor="middle">{node.label}</text>
      </g>)}
    </svg>
    <div className="ww-blueprint__caption"><span>知识之间，有路可循</span><span>{stage + 1} / 3</span></div>
  </div>;
}

function TechMarquee() {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    setReady(true);
    const host = ref.current;
    if (!host) return;
    let visible = false;
    const sync = () => { host.dataset.playing = String(visible && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(host);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const names = ['Python', 'Linux / Git', 'Docker', 'FastAPI', 'Transformer', 'LangGraph', 'RAG', 'Agent', 'LoRA'];
  return <section className="ww-stack" ref={ref} aria-label="知识库中的技术主题" data-ready={ready} data-paused={paused}>
    <div className="ww-stack__head ww-wrap"><span>从开发基础，到 AI 工程</span>
      {ready && <button type="button" aria-label={paused ? '继续技术主题滚动' : '暂停技术主题滚动'} aria-pressed={paused} onClick={() => setPaused(!paused)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">{paused ? <path d="m5 3 8 5-8 5Z" /> : <path d="M4 3h3v10H4zm5 0h3v10H9z" />}</svg>
      </button>}
    </div>
    <div className="ww-marquee" tabIndex={ready ? 0 : undefined} aria-label="聚焦可暂停技术主题滚动">
      <div className="ww-marquee__track">{[0, 1].map(copy => <ul key={copy} className="ww-marquee__group" aria-hidden={copy === 1 ? true : undefined}>
        {names.map((name, index) => <li key={name}><span className={`ww-tech-symbol ww-tech-symbol--${index % 4}`} aria-hidden="true" />{name}</li>)}
      </ul>)}</div>
    </div>
  </section>;
}

function GraphPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: '240px' });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  return <div className="ww-atlas__canvas" ref={ref}>{ready && <KnowledgeGraph />}</div>;
}

function HomeSections({ topics }: { topics: HomeTopic[] }) {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const steps = Array.from(host.querySelectorAll<HTMLElement>('.ww-stage'));
    const words = Array.from(host.querySelectorAll<HTMLElement>('.ww-scroll-copy span'));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      host.dataset.motion = motion.matches ? 'off' : 'on';
      const center = window.innerHeight * .5;
      const distances = steps.map(step => {
        const rect = step.getBoundingClientRect();
        return Math.abs(rect.top + rect.height / 2 - center);
      });
      const next = distances.indexOf(Math.min(...distances));
      if (next >= 0) setStage(next);
      const hero = document.querySelector<HTMLElement>('.rp-home-hero');
      const art = hero?.querySelector<HTMLElement>('.rp-home-hero__image');
      if (hero && art) {
        const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / (hero.offsetHeight * .5)));
        hero.style.setProperty('--ww-art-progress', motion.matches ? '1' : String(progress));
        hero.style.setProperty('--ww-art-tilt', motion.matches ? '0deg' : `${(1 - progress) * 5}deg`);
        hero.style.setProperty('--ww-art-scale', motion.matches ? '1' : String(.98 + progress * .02));
      }
      const textTop = words[0]?.getBoundingClientRect().top ?? 0;
      words.forEach((word, index) => {
        const progress = (window.innerHeight * .82 - textTop) / (window.innerHeight * .38) - index * .07;
        word.style.setProperty('--ww-word-progress', motion.matches ? '1' : String(Math.min(1, Math.max(0, progress))));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    motion.addEventListener('change', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motion.removeEventListener('change', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <main className="ww-home" ref={ref}>
    <h1 className="ww-visually-hidden">WindWiki 工程知识库：把原理读懂，把想法造出来。</h1>
    <TechMarquee />
    <section className="ww-introduction ww-wrap" aria-labelledby="ww-intro-title">
      <h2 id="ww-intro-title">知识不止于收藏。<br />理解，连接，然后创造。</h2>
      <p className="ww-scroll-copy"><span>这里是 Tingfeng347 的工程知识库。</span><span>把课程笔记、</span><span>原理拆解</span><span>与工程实践</span><span>放在一起，</span><span>从一个概念出发，</span><span>找到它在系统里的位置。</span></p>
    </section>
    <section className="ww-path" id="features" aria-labelledby="ww-path-title">
      <div className="ww-path__layout ww-wrap">
        <div className="ww-path__visual">
          <h2 id="ww-path-title">从一行代码，<br />到一个系统。</h2>
          <p>沿着这条路径前进，也可以从熟悉的地方出发。</p>
          <Blueprint stage={stage} />
        </div>
        <div>
          {topics.slice(0, 3).map((topic, i) => <article className="ww-stage" key={topic.title} data-active={i === stage}>
            <div className="ww-stage__index">{String(i + 1).padStart(2, '0')}</div>
            <h3>{topic.title}</h3><p>{topic.details}</p>
            <div className="ww-stage__tags">{STAGE_TAGS[i].map(tag => <span key={tag}>{tag}</span>)}</div>
            <Link className="ww-inline-link" href={topic.link}>{STAGE_LINKS[i]}<Arrow /></Link>
          </article>)}
        </div>
      </div>
    </section>
    <HomeShowcase topics={topics} />
    <section className="ww-atlas ww-wrap" aria-labelledby="ww-atlas-title">
      <div>
        <h2 id="ww-atlas-title">每一个知识点，<br />都不是孤岛。</h2>
        <p>编程、模型、检索、智能体与部署，在同一张图里相遇。换一个视角，发现下一条值得探索的线索。</p>
        <Link className="ww-inline-link" href="/llm-applications/">打开知识地图<Arrow /></Link>
        <div className="ww-atlas__hint">拖动旋转星图，点击节点进入专题。</div>
      </div>
      <GraphPreview />
    </section>
    <section className="ww-outro" aria-labelledby="ww-outro-title">
      <div className="ww-wrap">
        <div><h2 id="ww-outro-title">下一次创造，<br />从这一次理解开始。</h2><p>选一个感兴趣的主题，开始读，开始做。</p></div>
        <Link href="/llm-applications/">进入知识库<Arrow /></Link>
      </div>
    </section>
    <footer className="ww-footer ww-wrap">
      <span className="ww-footer__brand">WindWiki</span><span>知识随风生长，工程留下痕迹。</span>
      <div className="ww-footer__links"><Link href="https://github.com/tingfeng347/windwiki">GitHub</Link><Link href="https://tingfeng347.github.io/">个人博客</Link></div>
    </footer>
  </main>;
}

/** 默认 HomeLayout 保留；全局组件在 Layout 后直接 SSR 输出滚动介绍。
 * 品牌艺术图通过 hero.image 静态渲染；画框装饰 portal 到 image 位，不改写主题 DOM。
 * SSG-MD 由 index.mdx 的 hero / features 生成，路径和专题使用同一份 frontmatter。
 */
export default function HomeExperience() {
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();
  const isHome = page?.pageType === 'home';
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!isHome) { setTarget(null); return; }
    let current: HTMLElement | null = null;
    const sync = () => {
      const next = document.querySelector<HTMLElement>('.rp-home-hero__image');
      if (next === current) return;
      current = next;
      setTarget(next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isHome]);
  if (!isHome) return null;
  const topics = (frontmatter.features ?? []) as HomeTopic[];
  return <>
    {target && createPortal(<ArtFrame />, target)}
    <HomeSections topics={topics} />
  </>;
}
