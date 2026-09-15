---
description: 大模型应用知识地图：从开发基础、模型原理到 Agent、RAG、模型训练、部署与评估优化。
---

# 大模型应用

从编程与工程基础出发，逐步掌握机器学习、LLM 原理、应用框架、Agent、RAG、模型训练、部署与评估优化。

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

基础薄弱时按图从左向右学习；已有开发经验时，可以直接从“大模型概述”、RAG 或模型训练进入。

## 编程与工程基础

| 专题 | 主要内容 |
| --- | --- |
| [Python 基础](./python-basics/01-basics.md) | Python 语法、容器、函数、面向对象、文件、异常、并发与综合项目 |
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

## LLM 应用、Agent 与 RAG

| 专题 | 主要内容 |
| --- | --- |
| [LangChain](./langchain-langgraph-deepagents/langchain/index.mdx) | 模型、Prompt、Chain、工具、检索与应用组件，PDF 课程 |
| [LangGraph](./langchain-langgraph-deepagents/langgraph/index.mdx) | State、Node、Edge、持久化、人工介入与 Agent 工作流，PDF 课程 |
| [DeepAgents](./langchain-langgraph-deepagents/deepagents/01-framework.md) | 从工具调用 Agent 到长任务、多智能体协作与工程实践 |
| [RAG](./rag/rag.md) | 文档解析、分块、Embedding、向量库、检索优化、GraphRAG、Agentic RAG 与生产实践 |

## 模型训练、部署与质量保障

| 专题 | 主要内容 |
| --- | --- |
| [大模型微调](./model-training-and-deployment/training/large-model-fine-tuning-course.mdx) | 尚硅谷大模型微调完整 PDF 课程 |
| [模型训练](./model-training-and-deployment/training/index.md) | SFT、LoRA、QLoRA、Unsloth、DeepSpeed、量化导出与后训练工程 |
| [模型部署](./model-training-and-deployment/deployment/01-gpu-deployment.md) | GPU 规划、vLLM、Embedding/Reranker 服务与应用部署 |
| [评估与优化](./evaluation-and-optimization/knowledge-base-evaluation.md) | RAGAS、离线评测集、LLM-as-a-Judge 和评估驱动优化 |
| [Vibe Coding](./vibe-coding/vibe-coding.md) | Cursor、Codex、Claude Code、Spec Coding、Skill 与产品原型实践 |
| [AI 工程](./ai-engineering/index.md) | AI Engineering → Agent Engineering → 设计面与设计模式的完整层级 |

## 按目标选择起点

- 想快速建立大模型全局认识：从[大模型概述](./nlp-and-llm-principles/llm-overview/index.md)开始。
- 想开发企业知识库或问答系统：进入[RAG](./rag/rag.md)，再学习[评估与优化](./evaluation-and-optimization/knowledge-base-evaluation.md)。
- 想开发工具调用和多智能体系统：依次学习[LangChain](./langchain-langgraph-deepagents/langchain/index.mdx)、[LangGraph](./langchain-langgraph-deepagents/langgraph/index.mdx)、[DeepAgents](./langchain-langgraph-deepagents/deepagents/01-framework.md)和[AI 工程](./ai-engineering/index.md)。
- 想做领域模型微调：先看[大模型微调](./model-training-and-deployment/training/large-model-fine-tuning-course.mdx)，再进入[模型训练](./model-training-and-deployment/training/index.md)实践 LoRA、QLoRA、Unsloth 和 DeepSpeed。
- 想把模型服务真正上线：进入[模型部署](./model-training-and-deployment/deployment/01-gpu-deployment.md)，补齐容器、推理服务与监控能力。

## 终端工具手册

| 手册 | 主要内容 |
| --- | --- |
| [tmux](./terminal-tool-manuals/tmux.md) | 会话、窗口、窗格、键位、复制模式、配置、插件与 Windows 使用方案 |
| [herdr](./terminal-tool-manuals/herdr.md) | 终端工作区、Agent 状态感知、远程连接、CLI、Socket API 与跨平台限制 |
| [Zellij](./terminal-tool-manuals/zellij.md) | 会话、标签页、窗格、布局、插件、Web Client 与快捷键 |
| [Yazi](./terminal-tool-manuals/yazi.md) | 文件操作、搜索、预览、标签页、任务管理、插件与 shell wrapper |
| [Oh My Codex](./terminal-tool-manuals/oh-my-codex.md) | 工作流技能、多 Agent Team、Mission、HUD、MCP 与跨平台实践 |
| [LazyVim](./terminal-tool-manuals/lazyvim.md) | Neovim IDE 配置、Vim 基础、快捷键、Snacks、Extras、LSP、插件与跨平台配置 |
