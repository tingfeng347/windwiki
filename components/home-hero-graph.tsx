import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFrontmatter, usePage } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import { KnowledgeGraph } from './knowledge-graph';
import './home-hero-graph.css';

interface Topic {
  title: string;
  details: string;
  link: string;
}

const STAGE_TAGS = [
  ['Python', 'Linux / Git', 'FastAPI'],
  ['机器学习', 'Transformer', 'LLM'],
  ['RAG', 'Agent', '训练与部署'],
];
const STAGE_LINKS = ['从开发基础开始', '进入模型原理', '探索 Agent 工程'];
const WIND_PATHS = Array.from({ length: 28 }, (_, i) =>
  `M -160 ${390 + i * 12} C 160 ${250 + i * 18}, 360 ${910 - i * 7}, 740 ${760 - i * 3} S 1230 ${350 + i * 13}, 1620 ${550 + i * 11}`,
);

function Arrow() {
  return <svg className="ww-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
  </svg>;
}

function WindField() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => {
      host.dataset.visible = String(entry.isIntersecting);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  return <>
    <div className="ww-wind" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
        <g className="ww-wind__mesh" stroke="currentColor" strokeWidth=".8">
          {WIND_PATHS.map((d, i) => <path d={d} key={i} />)}
        </g>
        <g className="ww-wind__pulse" stroke="currentColor" strokeWidth="1.6">
          {[3, 11, 21].map(i => <path d={WIND_PATHS[i]} key={i} />)}
        </g>
        <g fill="currentColor" opacity=".7">
          <circle cx="259" cy="568" r="4" />
          <circle cx="1158" cy="606" r="4" />
          <circle cx="1004" cy="689" r="3" />
        </g>
        <g fill="currentColor" fontSize="12" opacity=".65">
          <text x="274" y="571">Python</text>
          <text x="1174" y="610">Agent</text>
          <text x="1017" y="711">RAG</text>
        </g>
      </svg>
    </div>
    <div className="ww-hero-foot">
      <span>Tingfeng347 的工程知识库</span>
      <a href="#features"><span className="ww-scroll-line" aria-hidden="true" />向下，连接知识</a>
      <span>原理 / 实现 / 验证</span>
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

function TopicArt({ agent }: { agent: boolean }) {
  return <div className="ww-topic-art" aria-hidden="true">
    <svg viewBox="0 0 420 128" fill="none">
      {agent ? <>
        <path d="M66 64h89m96 0h95M210 24v16m0 48v18M66 64v42h144" stroke="currentColor" opacity=".5" />
        <circle cx="210" cy="64" r="31" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="210" cy="64" r="43" stroke="currentColor" opacity=".15" />
        <rect x="21" y="44" width="80" height="40" rx="5" stroke="currentColor" opacity=".4" />
        <rect x="315" y="44" width="80" height="40" rx="5" stroke="currentColor" opacity=".4" />
        <text x="61" y="68" textAnchor="middle">上下文</text>
        <text x="210" y="68" textAnchor="middle">Agent</text>
        <text x="355" y="68" textAnchor="middle">工具</text>
        <text x="210" y="121" textAnchor="middle">观察 · 执行 · 反馈</text>
      </> : <>
        {[0, 1, 2].map(i => <g key={i} transform={`translate(${24 + i * 9}, ${24 + i * 9})`}>
          <rect width="50" height="66" rx="4" fill="var(--ww-surface)" stroke="currentColor" opacity=".6" />
          <path d="M12 18h26M12 28h26M12 38h17" stroke="currentColor" opacity=".4" />
        </g>)}
        <path d="M102 64h67m71 0h64" stroke="currentColor" opacity=".5" />
        {[0, 1, 2, 3].map(i => <circle key={i} cx={187 + (i % 2) * 30} cy={48 + Math.floor(i / 2) * 30} r="7" stroke="currentColor" fill="var(--ww-wash)" />)}
        <rect x="304" y="33" width="89" height="64" rx="5" stroke="currentColor" opacity=".5" />
        <text x="349" y="70" textAnchor="middle">有据可查</text>
        <text x="206" y="117" textAnchor="middle">检索 · 增强 · 生成</text>
      </>}
    </svg>
  </div>;
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

function HomeSections({ topics }: { topics: Topic[] }) {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const steps = Array.from(host.querySelectorAll<HTMLElement>('.ww-stage'));
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
      if (hero) hero.style.setProperty('--ww-wind-offset', motion.matches ? '0px' : `${Math.min(window.scrollY, hero.offsetHeight) * .13}px`);
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
    <section className="ww-introduction ww-wrap" aria-labelledby="ww-intro-title">
      <h2 id="ww-intro-title">知识不止于收藏。<br />理解，连接，然后创造。</h2>
      <p>这里是 Tingfeng347 的工程知识库。把课程笔记、原理拆解与工程实践放在一起，从一个概念出发，找到它在系统里的位置。</p>
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
    <section className="ww-topics" aria-labelledby="ww-topics-title">
      <div className="ww-wrap">
        <div className="ww-section-head">
          <div><h2 id="ww-topics-title">找到你想深入的方向。</h2><p>带着一个问题进来，沿着一个专题走下去。</p></div>
          <Link className="ww-inline-link" href="/llm-applications/">查看完整知识目录<Arrow /></Link>
        </div>
        <div className="ww-topic-grid">
          {topics.slice(3).map((topic, i) => <article className={`ww-topic${i < 2 ? ' ww-topic--feature' : ''}`} key={topic.title}>
            <h3>{topic.title}</h3><p>{topic.details}</p>
            {i < 2 && <TopicArt agent={i === 1} />}
            <Link className="ww-inline-link" href={topic.link}>阅读专题<Arrow /></Link>
          </article>)}
        </div>
      </div>
    </section>
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
 * 首屏装饰 portal 到主题的 image 位，不改写 React 管理的 DOM。
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
  const topics = (frontmatter.features ?? []) as Topic[];
  return <>
    {target && createPortal(<WindField />, target)}
    <HomeSections topics={topics} />
  </>;
}
