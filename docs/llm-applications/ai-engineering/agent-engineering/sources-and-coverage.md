---
description: AI 工程术语成熟度、关键概念边界、原始材料覆盖关系、一手论文、官方文档与图片许可。
---

# 术语边界与资料索引

## 术语成熟度

| 术语 | 建议表述 | 原因 |
| --- | --- | --- |
| Prompt Engineering | 成熟术语 | 主流模型厂商已有稳定定义与实践 |
| Context Engineering | 快速成熟的工程术语 | 已有清晰工程对象，但具体边界随 Agent 运行时演进 |
| Loop Engineering | 新兴归纳 | 循环本身成熟，名称尚未形成统一标准 |
| Graph Engineering | 新兴归纳 | 状态图/工作流成熟，但此名称也可能指知识图谱工程 |
| Harness Engineering | 新兴归纳 | 工具、运行时、护栏和恢复真实存在，术语边界仍变化 |
| ReAct | 经典 Agent 范式 | 有 ICLR 论文和大量工具 Agent 实现 |
| Plan-and-Solve | 经典提示策略 | ACL 论文聚焦先计划再解题 |
| Plan-and-Execute | 常见 Agent 架构 | Planner、Executor、State 与可选 Replanner 的工程组合 |
| Reflection | 通用设计模式 | 生成—评审—修订的广义循环 |
| Reflexion | 特定研究框架 | 使用语言反思和 episodic memory |
| Supervisor | 中心化多 Agent 编排 | 中心 Agent 跨多步动态调用 worker |
| Swarm / Handoff | 去中心化交接拓扑 | active agent 在对等 Agent 间转移 |
| Debate | 多 Agent 评审研究模式 | 候选、互评、修订和裁决，收益并非无条件成立 |

五个 Engineering 更适合作为设计面和排障地图，不是 OSI 式严格分层。Prompt 是 Context 的组成部分；Harness 往往承载 Prompt、Context、Loop 与 Graph；Tool Use、评测、安全、成本和可观测性横跨多层。

## 易混概念

### Plan-and-Solve 与 Plan-and-Execute

Plan-and-Solve 原论文是一种零样本推理提示：先规划子任务，再逐步解题。Plan-and-Execute 是工程架构：显式保存计划，由 executor 调用工具或子 Agent，并可在每步后 replan。

### Reflection 与 Reflexion

Reflection 是任何“生成—评审—修订”循环；Reflexion 特指 Actor、Evaluator、Self-Reflection 和 episodic memory 组合，不通过更新模型参数学习。

### Router 与 Supervisor

Router 通常一次分类后分发；Supervisor 会在完整运行中持续维护总体目标，动态选择 worker 和综合结果。

### Swarm 与多 Agent

并非多个 Agent 就是 Swarm。这里的 Swarm 指没有永久中心、由当前 active agent 通过 handoff 转移控制权的拓扑。

### Tool Use 与 ReAct

Tool Use 是横切能力。单次函数调用也可以使用工具；ReAct 强调行动与环境 Observation 交错并影响后续决策。

## 内容覆盖

| 原始分类 | 对应笔记 |
| --- | --- |
| AI / Agent / Agentic Engineering | [AI 工程概览](../index.md) |
| Agent Engineering 层级 | [Agent 工程概览](./index.md) |
| L1 Prompt Engineering | [提示词工程](./design-surfaces/prompt-engineering.md) |
| L2 Context Engineering | [上下文工程](./design-surfaces/context-engineering/index.md) |
| Memory、RAG、外部知识 | [Memory、RAG 与外部知识](./design-surfaces/context-engineering/memory-and-rag.md) |
| Tool Use、MCP、工具契约 | [Tool Use 与工具工程](./design-surfaces/context-engineering/tool-engineering.md) |
| L3 Loop Engineering | [循环工程](./design-surfaces/loop-engineering/index.md) |
| CodeAct、PTC、程序化工具编排 | [程序化工具编排](./design-surfaces/loop-engineering/programmatic-tool-orchestration.md) |
| L4 Graph Engineering | [图工程](./design-surfaces/graph-engineering.md) |
| L5 Harness Engineering | [主控工程](./design-surfaces/harness-engineering/index.md) |
| 异常轨迹、预算、停止与恢复 | [Agent 异常轨迹排除](./design-surfaces/harness-engineering/agent-abnormal-trajectory-control.md) |
| Reflection、ReAct、Planning | [单 Agent 设计模式](./design-patterns/single-agent/index.md) |
| Supervisor、Swarm、Debate | [多 Agent 设计模式](./design-patterns/multi-agent/index.md) |
| Claude Code、Codex、Pi、GenericAgent、Hermes、DeepSeek Harness 等 Agent / Runtime 架构 | [主流 Agent 架构](./design-patterns/common-agent-architectures.md) |
| MCP、A2A、ACP、ANP | [协议与互操作总览](./protocols-and-interoperability/index.md) |
| MCP Server 与工具/数据互操作 | [MCP](./protocols-and-interoperability/mcp.md) |
| 跨 Agent 任务、长任务与产物 | [A2A](./protocols-and-interoperability/a2a.md) |
| ACP 存量系统与 A2A 迁移 | [ACP 历史与迁移](./protocols-and-interoperability/acp.md) |
| 开放 Agent 网络身份与发现 | [ANP](./protocols-and-interoperability/anp.md) |
| Eval、Observability、Safety、Cost | [生产实践与选型](./design-surfaces/harness-engineering/production-practice.md) |

## 经典论文

1. Yao et al. [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629), ICLR 2023.
2. Wang et al. [Plan-and-Solve Prompting](https://arxiv.org/abs/2305.04091), ACL 2023.
3. Shinn et al. [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366), NeurIPS 2023.
4. Madaan et al. [Self-Refine](https://arxiv.org/abs/2303.17651), NeurIPS 2023.
5. Du et al. [Improving Factuality and Reasoning through Multiagent Debate](https://arxiv.org/abs/2305.14325).
6. Lewis et al. [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401), NeurIPS 2020.
7. Wu et al. [AutoGen](https://arxiv.org/abs/2308.08155), COLM 2024.

## 官方工程资料

- [Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic：Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Anthropic：Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [OpenAI：A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [OpenAI 官方文档：Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk)
- [LangChain：Multi-agent](https://docs.langchain.com/oss/python/langchain/multi-agent)
- [LangGraph：Overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph Supervisor](https://github.com/langchain-ai/langgraph-supervisor-py)
- [LangGraph Swarm](https://github.com/langchain-ai/langgraph-swarm-py)
- [Microsoft Agent Framework](https://github.com/microsoft/agent-framework)
- [Hugging Face：Agent glossary](https://huggingface.co/blog/agent-glossary)
- [Model Context Protocol：Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [A2A 1.0 Specification](https://a2a-protocol.org/latest/specification/)
- [Agent Communication Protocol](https://agentcommunicationprotocol.dev/introduction/welcome)
- [Agent Network Protocol 规范状态](https://github.com/agent-network-protocol/AgentNetworkProtocol)

协议章节的逐条事实与固定仓库快照见 [Agent 协议一手资料核验](./research-notes/agent-protocols-primary-sources.md)。

## Hello-Agents 图片

单 Agent 模式目录中的 `4-1.png`～`4-4.png` 来自 Datawhale [Hello-Agents 第四章](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)，本地来源快照提交为 `4f7682c`。原项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；转载请继续署名、仅用于非商业目的，并按相同方式共享。该章没有 GIF。

## API 快照

代码在 2026-09-14 按当前文档核对：

- LangGraph 1.0.8：`StateGraph`、`START`、`END`、条件边、checkpointer、`interrupt()` 与 `Command(resume=...)`；
- OpenAI Agents SDK 0.7.0：`Agent`、`Runner`、`function_tool`、`as_tool()`、handoffs、guardrails、session 与 tracing；
- Microsoft Agent Framework：workflow executors、edges、checkpoint 和 human-in-the-loop。

框架升级可能改变导入路径或参数。运行前应再次核对官方版本说明，并用最小 smoke test 验证示例。
