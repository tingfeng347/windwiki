---
description: 大模型应用知识地图：从编程基础、模型原理到 Agent、RAG、训练部署与评估优化，并索引科研与术语文档。
---

# 大模型应用

从编程与工程基础出发，逐步掌握机器学习、LLM 原理、应用框架、Agent、RAG、模型训练、部署与评估优化。

站内还有两个独立分类：[科研](../research/latex/latex-manual.md) 收录 LaTeX 科研写作手册；[术语文档](../terminology/index.md) 按领域沉淀 13 篇面试高频术语。本页是「大模型应用」这条主线的地图。

## 学习路径

```mermaid
flowchart LR
    A[编程与工程基础] --> B[数据处理与 API 服务]
    B --> C[机器学习与深度学习]
    C --> D[NLP 与 LLM 原理]
    D --> E[LangChain 与 Agent]
    E --> F[RAG 知识系统]
    F --> G[训练、部署与评估]
    G --> H[Vibe Coding 工程实践]
    H --> I[AI 工程与 Agent 模式]
```

基础薄弱时按图从左向右学习；已有开发经验时，可以直接从[大模型概述](./nlp-and-llm-principles/llm-overview/index.md)、[RAG](./rag/rag.md) 或[模型训练](./model-training-and-deployment/training/index.md)进入。

## 编程与工程基础

| 专题 | 主要内容 |
| --- | --- |
| [Python 基础](./python-basics/01-basics.md) | 14 章：语法、容器、函数、面向对象、文件、异常、正则、并发与综合项目 |
| [数据结构与算法](./data-structures-and-algorithms/01-basics.md) | 复杂度、线性结构、树、图、查找、排序与常用算法 |
| [Linux、Shell 与 Git](./linux-shell-git/01-linux.md) | Linux 操作、Shell 脚本和 Git 版本管理 |
| [MySQL](./mysql/sql-basics/01-overview.md) | SQL、表设计、事务、权限、安装运维与 Python 连接数据库 |
| [Docker](./docker/docker.md) | 镜像、容器、网络、存储、Compose 与应用容器化 |
| [NumPy 与 Pandas](./numpy-pandas/index.mdx) | 数值计算、数据清洗、分析和综合案例，PDF 课程 |
| [FastAPI](./fastapi/fastapi.md) | 协程、ASGI、接口开发、参数校验和服务工程化 |

## 模型基础与原理

| 专题 | 主要内容 |
| --- | --- |
| [数学基础](./machine-learning-and-deep-learning/math-basics/index.mdx) | 线性代数、概率统计、微积分与优化基础，PDF 课程 |
| [机器学习](./machine-learning-and-deep-learning/machine-learning/index.mdx) | 监督学习、无监督学习、特征工程与经典算法，PDF 课程 |
| [深度学习](./machine-learning-and-deep-learning/deep-learning/index.mdx) | 神经网络、训练方法、CNN、RNN 与深度学习工程，PDF 课程 |
| [NLP](./nlp-and-llm-principles/nlp/index.mdx) | 文本表示、序列建模、预训练语言模型与 NLP 任务，PDF 课程 |
| [大模型概述](./nlp-and-llm-principles/llm-overview/index.md) | 架构演进、训练范式、算力、提示词、RAG、微调与智能体 |
| [大模型原理](./nlp-and-llm-principles/llm-principles/index.mdx) | Transformer、预训练、对齐、推理与关键实现原理，PDF 课程 |
| [强化学习与多模态](./reinforcement-learning-and-multimodal/index.mdx) | 强化学习基础、对齐方法和多模态模型，PDF 课程 |

## LLM 应用、Agent 与 AI 工程

| 专题 | 主要内容 |
| --- | --- |
| [LangChain](./langchain-langgraph-deepagents/langchain/index.mdx) | 模型、Prompt、Chain、工具、检索与应用组件，PDF 课程 |
| [LangGraph](./langchain-langgraph-deepagents/langgraph/index.mdx) | State、Node、Edge、持久化、人工介入与 Agent 工作流，PDF 课程 |
| [DeepAgents](./langchain-langgraph-deepagents/deepagents/01-framework.md) | 两章：框架原理与多智能体协作实战 |
| [RAG](./rag/rag.md) | 十篇系列：解析分块、向量检索、检索优化、生成评估、GraphRAG、Agentic RAG 与生产实践 |
| [AI 工程](./ai-engineering/index.md) | AI Engineering → Agent Engineering：设计面（L1～L5）、设计模式、协议与互操作、最新技术 |

### RAG 知识系统

[总览与学习路线](./rag/rag.md) · [文档解析与分块](./rag/document-loading-and-chunking.md) · [嵌入、向量库与索引](./rag/embedding-vector-database-and-index.md) · [查询与检索优化](./rag/query-and-retrieval-optimization.md) · [生成与评估](./rag/generation-and-evaluation.md) · [GraphRAG](./rag/graphrag.md) · [Agentic RAG 与记忆](./rag/agentic-rag-and-memory.md) · [端到端项目](./rag/end-to-end-projects.md) · [生产实践](./rag/production-practice.md)

### Agent 工程

[Agent 工程概览](./ai-engineering/agent-engineering/index.md) · [五个设计面](./ai-engineering/agent-engineering/design-surfaces/index.md)（L1 Prompt、L2 Context、L3 Loop、L4 Graph、L5 Harness） · [设计模式](./ai-engineering/agent-engineering/design-patterns/index.md)（单 Agent：ReAct、Plan-and-Execute、Reflection；多 Agent：Supervisor、Swarm、Debate） · [协议与互操作](./ai-engineering/agent-engineering/protocols-and-interoperability/index.md)（MCP、A2A、ACP、ANP） · 最新技术：[Jev 决策模型调研](./ai-engineering/agent-engineering/latest-technologies/jev-decision-model.md)、[Agent 协议一手资料核验](./ai-engineering/agent-engineering/latest-technologies/agent-protocols-primary-sources.md)、[Coding Agent Runtime 一手资料核验](./ai-engineering/agent-engineering/latest-technologies/coding-agent-runtimes-primary-sources.md)

## 模型训练、部署与工程实践

| 专题 | 主要内容 |
| --- | --- |
| [大模型微调](./model-training-and-deployment/training/large-model-fine-tuning-course.mdx) | 尚硅谷大模型微调完整 PDF 课程 |
| [模型训练](./model-training-and-deployment/training/index.md) | 训练路线总览 + 微调基础、LoRA/QLoRA、Unsloth、DeepSpeed、分布式训练、后训练与量化导出 |
| [模型部署](./model-training-and-deployment/deployment/01-gpu-deployment.md) | [GPU 部署](./model-training-and-deployment/deployment/01-gpu-deployment.md)（vLLM、Embedding/Reranker 服务）与[应用服务部署](./model-training-and-deployment/deployment/02-application-deployment.md) |
| [评估与优化](./evaluation-and-optimization/knowledge-base-evaluation.md) | RAGAS、离线评测集、LLM-as-a-Judge 和评估驱动优化 |
| [Vibe Coding](./vibe-coding/vibe-coding.md) | Cursor、Codex、Claude Code、Spec Coding、Skill 与产品原型实践 |

### 模型训练系列

[训练路线总览](./model-training-and-deployment/training/index.md) · [微调基础与数据工程](./model-training-and-deployment/training/fine-tuning-foundations.md) · [LoRA 与 QLoRA](./model-training-and-deployment/training/lora-qlora.md) · [Unsloth 实战](./model-training-and-deployment/training/unsloth-practice.md) · [DeepSpeed 实战](./model-training-and-deployment/training/deepspeed-practice.md) · [分布式训练](./model-training-and-deployment/training/distributed-training.md) · [后训练工程实战](./model-training-and-deployment/training/post-training-engineering.md) · [量化、合并与导出](./model-training-and-deployment/training/quantization-and-export.md)

## 终端工具手册

| 手册 | 主要内容 |
| --- | --- |
| [tmux](./terminal-tool-manuals/tmux.md) | 会话、窗口、窗格、键位、复制模式、配置、插件与 Windows 使用方案 |
| [herdr](./terminal-tool-manuals/herdr.md) | 终端工作区、Agent 状态感知、远程连接、CLI、Socket API 与跨平台限制 |
| [Zellij](./terminal-tool-manuals/zellij.md) | 会话、标签页、窗格、布局、插件、Web Client 与快捷键 |
| [Yazi](./terminal-tool-manuals/yazi.md) | 文件操作、搜索、预览、标签页、任务管理、插件与 shell wrapper |
| [Oh My Codex](./terminal-tool-manuals/oh-my-codex.md) | 工作流技能、多 Agent Team、Mission、HUD、MCP 与跨平台实践 |
| [LazyVim](./terminal-tool-manuals/lazyvim.md) | Neovim IDE 配置、Vim 基础、快捷键、Snacks、Extras、LSP、插件与跨平台配置 |

## 科研与术语文档

| 分类 | 主要内容 |
| --- | --- |
| [科研](../research/latex/latex-manual.md) | LaTeX 科研写作手册：引擎选择、中文排版、数学公式、图表、参考文献与投稿模板 |
| [术语文档](../terminology/index.md) | 13 篇领域术语清单：计算机基础、语言与后端、数据与 AI、业务 |

## 按目标选择起点

- 想快速建立大模型全局认识：从[大模型概述](./nlp-and-llm-principles/llm-overview/index.md)开始。
- 想开发企业知识库或问答系统：进入 [RAG 系列](./rag/rag.md)，按「解析分块 → 向量检索 → 检索优化 → 生成评估」推进，再用[评估与优化](./evaluation-and-optimization/knowledge-base-evaluation.md)闭环。
- 想开发工具调用和多智能体系统：依次学习 [LangChain](./langchain-langgraph-deepagents/langchain/index.mdx)、[LangGraph](./langchain-langgraph-deepagents/langgraph/index.mdx)、[DeepAgents](./langchain-langgraph-deepagents/deepagents/01-framework.md)，再深入 [Agent 工程](./ai-engineering/agent-engineering/index.md)的设计面、模式与协议。
- 想做领域模型微调：先看[大模型微调](./model-training-and-deployment/training/large-model-fine-tuning-course.mdx)，再进入[模型训练系列](./model-training-and-deployment/training/index.md)实践 LoRA、QLoRA、Unsloth 和 DeepSpeed。
- 想把模型服务真正上线：进入[模型部署](./model-training-and-deployment/deployment/01-gpu-deployment.md)，补齐推理服务、应用部署与监控能力。
- 想系统补计算机基础术语或准备面试：从[术语文档](../terminology/index.md)按领域速查。
