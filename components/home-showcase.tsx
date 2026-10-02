import { useEffect, useRef, useState } from 'react';
import { Link } from '@rspress/core/theme';

export interface HomeTopic {
  title: string;
  details: string;
  link: string;
}

const LABELS = ['检索与生成', '智能体执行', '训练与部署'];
const DESCRIPTIONS = [
  'RAG 概念预览：文档经过分块与检索，为回答提供可追溯的来源。',
  'Agent 概念预览：模型在观察、工具执行与结果反馈之间循环。',
  '训练概念预览：从基座模型与低秩适配，到评估和推理服务。',
];

function FlowArt({ index }: { index: number }) {
  return <svg className="ww-flow-art" viewBox="0 0 640 380" role="img" aria-label={DESCRIPTIONS[index]}>
    <defs>
      <pattern id={`ww-flow-grid-${index}`} width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="currentColor" opacity=".12" />
      </pattern>
    </defs>
    <rect width="640" height="380" fill={`url(#ww-flow-grid-${index})`} />
    {index === 0 ? <>
      <g className="ww-flow-lines"><path d="M143 166H257M358 166H470M319 220v58h153" /><path d="M241 160l7 6-7 6M452 160l7 6-7 6" /></g>
      {[0, 1, 2].map(i => <g key={i} transform={`translate(${47 + i * 13}, ${87 + i * 13})`}>
        <rect className="ww-flow-paper" width="77" height="112" rx="10" />
        <path d="M18 30h40M18 44h40M18 58h28" className="ww-flow-lines" />
      </g>)}
      <rect className="ww-flow-node" x="257" y="112" width="101" height="108" rx="22" />
      {[0, 1, 2, 3, 4, 5].map(i => <circle className="ww-flow-dot" key={i} cx={287 + (i % 2) * 39} cy={139 + Math.floor(i / 2) * 26} r="6" />)}
      <rect className="ww-flow-paper" x="470" y="120" width="130" height="94" rx="14" />
      <path className="ww-flow-lines" d="M493 147h82M493 162h68M493 177h45" />
      <rect className="ww-flow-pill" x="472" y="259" width="126" height="38" rx="19" />
      <text x="91" y="244">文档</text><text x="307" y="251">向量检索</text><text x="535" y="246">回答</text>
      <text x="535" y="284" className="ww-flow-small">附带来源</text>
      <text x="319" y="342" className="ww-flow-small">让知识，成为回答的依据。</text>
    </> : index === 1 ? <>
      <g className="ww-flow-lines"><path d="M149 179h97M394 179h98M320 246v62H122V214M320 109V60h221v85" /><path d="m221 173 7 6-7 6m247-6 7 6-7 6" /></g>
      <circle className="ww-flow-ring" cx="320" cy="179" r="88" />
      <circle className="ww-flow-node" cx="320" cy="179" r="65" />
      <text x="320" y="186" className="ww-flow-title">Agent</text>
      <rect className="ww-flow-paper" x="43" y="146" width="108" height="67" rx="16" />
      <text x="97" y="187">上下文</text>
      <rect className="ww-flow-paper" x="490" y="146" width="109" height="67" rx="16" />
      <text x="544" y="187">工具</text>
      <circle className="ww-flow-dot" cx="541" cy="60" r="6" /><circle className="ww-flow-dot" cx="122" cy="308" r="6" />
      <text x="415" y="49" className="ww-flow-small">观察与计划</text>
      <text x="244" y="337" className="ww-flow-small">执行与反馈</text>
    </> : <>
      <rect className="ww-flow-paper" x="48" y="53" width="315" height="218" rx="18" />
      <text x="133" y="89" className="ww-flow-small">训练过程示意</text>
      <path className="ww-flow-lines" d="M84 113v117h241M84 151h241M84 191h241" />
      <path className="ww-flow-curve" d="M92 122C119 137 121 170 153 178s46 25 75 25 38 14 87 14" />
      <text x="207" y="303" className="ww-flow-small">示意曲线，不代表实验结果</text>
      <rect className="ww-flow-node" x="403" y="70" width="174" height="75" rx="17" />
      <text x="490" y="114">基座 + LoRA</text>
      <path className="ww-flow-lines" d="M490 145v43m-6-17 6 7 6-7" />
      <rect className="ww-flow-paper" x="403" y="188" width="174" height="69" rx="17" />
      <text x="490" y="229">评估与验证</text>
      <path className="ww-flow-lines" d="M490 257v37" />
      <rect className="ww-flow-pill" x="421" y="294" width="138" height="39" rx="19" />
      <text x="490" y="320" className="ww-flow-small">推理服务</text>
    </>}
  </svg>;
}

export function HomeShowcase({ topics }: { topics: HomeTopic[] }) {
  const [selected, setSelected] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setEnhanced(true); }, []);

  const selectByKey = (key: string, index: number) => {
    const next = key === 'ArrowRight' ? (index + 1) % 3
      : key === 'ArrowLeft' ? (index + 2) % 3
        : key === 'Home' ? 0 : key === 'End' ? 2 : -1;
    if (next < 0) return false;
    setSelected(next);
    buttons.current[next]?.focus();
    return true;
  };

  return <section className="ww-topics" aria-labelledby="ww-topics-title">
    <div className="ww-wrap">
      <div className="ww-section-head">
        <div><h2 id="ww-topics-title">读懂一个概念。<br />看见一整个系统。</h2><p>把问题放进工程流程里，找到值得深入的方向。</p></div>
        <Link className="ww-inline-link" href="/llm-applications/">查看完整知识目录<span aria-hidden="true">↗</span></Link>
      </div>
      <div className="ww-showcase" data-selected={selected} data-enhanced={enhanced}>
        {enhanced && <div className="ww-showcase__tabs" role="tablist" aria-label="工程专题预览">
          {LABELS.map((label, index) => <button key={label} ref={el => { buttons.current[index] = el; }}
            id={`ww-tab-${index}`} type="button" role="tab" aria-selected={selected === index}
            aria-controls={`ww-panel-${index}`} tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)} onKeyDown={event => {
              if (selectByKey(event.key, index)) event.preventDefault();
            }}><span className="ww-showcase__tab-dot" aria-hidden="true" />{label}</button>)}
        </div>}
        {topics.slice(3, 6).map((topic, index) => <article key={topic.title} id={`ww-panel-${index}`}
          className={`ww-topic ww-showcase__panel ww-showcase__panel--${index}`}
          hidden={enhanced && selected !== index} role={enhanced ? 'tabpanel' : undefined}
          aria-labelledby={enhanced ? `ww-tab-${index}` : undefined} tabIndex={enhanced ? 0 : undefined}>
          <div className="ww-showcase__copy"><h3>{topic.title}</h3><p>{topic.details}</p>
            <Link className="ww-inline-link" href={topic.link}>阅读专题<span aria-hidden="true">↗</span></Link>
          </div>
          <div className="ww-showcase__visual"><FlowArt index={index} />
            <p className="ww-flow-caption">{index === 2 ? '训练过程示意，不代表实验结果。' : '工程概念示意，完整流程见专题正文。'}</p>
          </div>
        </article>)}
      </div>
      <div className="ww-topic-grid">
        {topics.slice(6).map((topic, index) => <article className="ww-topic ww-topic-entry" key={topic.title}>
          <div className={`ww-entry-symbol ww-entry-symbol--${index}`} aria-hidden="true">
            {index === 0 ? <span>⌘</span> : index === 1 ? <span>∑</span> : <span>Aa</span>}
          </div>
          <h3>{topic.title}</h3><p>{topic.details}</p>
          <Link className="ww-inline-link" href={topic.link}>阅读专题<span aria-hidden="true">↗</span></Link>
        </article>)}
      </div>
    </div>
  </section>;
}
