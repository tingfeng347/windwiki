---
description: MCP、A2A、BeeAI ACP 与 ANP 的版本、核心对象和成熟度边界的一手资料核验记录。
---

# Agent 协议一手资料核验

本笔记记录 MCP、A2A、BeeAI Agent Communication Protocol（ACP）与 Agent Network Protocol（ANP）的版本、核心模型和成熟度边界。核验日期为 2026-09-15；协议会继续演进，正文引用时应保留具体版本。

## MCP 2026-07-28

- **版本与规范入口**：本次核验采用日期版本 `2026-07-28`，而不是会随时间移动的 `latest`。官方规范入口：[MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/)；变更摘要：[Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)。
- **架构关系**：Host 管理一个或多个 MCP Client，每个 Client 与一个特定 Server 保持 1:1 关系；Server 可暴露 resources、tools、prompts，并可在回复中通过 `InputRequiredResult` 请求 sampling、elicitation 或 roots。来源：[Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)。
- **Server 三类核心 primitive**：Tools 是可执行函数，Resources 是上下文数据源，Prompts 是可复用交互模板。来源：[Architecture overview](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)、[Server features](https://modelcontextprotocol.io/specification/2026-07-28/server)。
- **无状态优先**：该版本移除初始化握手；每个请求在 `_meta` 中携带协议版本、客户端信息和客户端能力。Server 必须实现 `server/discover`，Client 可用它查询支持的协议版本、能力和身份，但调用其他 RPC 前不强制先发现。来源：[Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)、[`server/discover`](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)。
- **HTTP 会话变化**：协议级 HTTP session 及 `Mcp-Session-Id` 已移除；旧版本使用的独立 SSE GET、`Last-Event-ID` 恢复与消息重投也不属于当前版本。跨调用状态应由应用使用显式 handle 表达。来源：[Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)、[Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)。
- **结论边界**：MCP 解决 AI 应用与上下文、工具能力之间的标准化连接，不能仅凭其运行在 HTTP 上就把它等同于 L4 传输协议；这是基于官方 Host/Client/Server 与 primitive 模型作出的工程归类。

## A2A 1.0

- **稳定版状态**：A2A 官方在 2026-03-12 发布 v1.0，并称其为 production-ready standard；当前稳定规范使用 `latest` 路径。来源：[A2A v1.0 发布公告](https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication)、[Specification](https://a2a-protocol.org/latest/specification/)。
- **定位与治理**：A2A 是不同框架、厂商的 AI Agent 之间通信与协作的开放标准；项目最初由 Google 开发，后捐赠给 Linux Foundation 并由 Technical Steering Committee 维护。来源：[A2A 官网](https://a2a-protocol.org/latest/)。
- **发现模型**：`AgentCard` 描述 Agent 身份、能力与技能；v1.0 将 endpoint、binding 和协议版本组织在 `AgentInterface` 中，一个 Card 可以公布多个受支持接口。来源：[What's New in v1.0](https://a2a-protocol.org/latest/whats-new-v1)、[Definitions](https://a2a-protocol.org/latest/definitions)。
- **交互与任务模型**：`Message` 是一次通信单元，内容由一个或多个 `Part` 组成；`Task` 是有身份和生命周期的行动单元，包含 `TaskStatus`，并可累积 Message history 和结果 `Artifact`。来源：[Specification - Core Objects](https://a2a-protocol.org/latest/specification/#41-core-objects)、[Definitions](https://a2a-protocol.org/latest/definitions)。
- **v1.0 核心操作**：消息与任务操作包括 `SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask` 和 `SubscribeToTask`；v1.0 将旧 JSON-RPC 风格名称统一为协议操作名，并新增/正式化列表和订阅语义。来源：[What's New in v1.0](https://a2a-protocol.org/latest/whats-new-v1)、[Specification](https://a2a-protocol.org/latest/specification/)。
- **与 MCP 的关系**：A2A 官方将两者表述为互补而非替代：Agent 可用 MCP 连接工具，同时用 A2A 与远程或本地 Agent 协作。来源：[A2A v1.0 发布公告](https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication)、[A2A 官网](https://a2a-protocol.org/latest/)。

## BeeAI Agent Communication Protocol（ACP，历史协议）

### 名称消歧

- 本节的 ACP 是 BeeAI/IBM 发起的 **Agent Communication Protocol**。它不是编辑器与编码 Agent 之间的 **Agent Client Protocol**；后者有独立官网和规范：[Agent Client Protocol](https://agentclientprotocol.com/)。正文首次出现 ACP 时必须写全称。

### 历史模型

- **Agent Manifest**：描述 Agent 的身份、能力、元数据和运行状态，用于发现；输入/输出内容类型使用 MIME type，并可使用通配符。来源：[Agent Manifest](https://agentcommunicationprotocol.dev/core-concepts/agent-manifest)、[归档仓库 README](https://github.com/i-am-bee/acp#core-concepts)。
- **Run**：一次带特定输入的 Agent 执行，支持同步、异步与流式模式。生命周期状态包括 `created`、`in-progress`、`awaiting`、`completed`、`cancelling`、`cancelled`、`failed`。来源：[Agent Run Lifecycle](https://agentcommunicationprotocol.dev/core-concepts/agent-run-lifecycle)。
- **Message / MessagePart**：`Message` 由有序 `MessagePart` 组成，`MessagePart` 可承载 text、image、JSON 等多模态内容。来源：[Message Structure](https://agentcommunicationprotocol.dev/core-concepts/message-structure)、[归档仓库 README](https://github.com/i-am-bee/acp#core-concepts)。
- **Await**：Run 可进入 `awaiting`，向 Client 请求补充信息或动作；Client 向 resume endpoint 提交 `await_resume` 后，Run 回到 `in-progress`。超时会失败，也可在等待期间取消。来源：[Agent Run Lifecycle - Agent Run Await](https://agentcommunicationprotocol.dev/core-concepts/agent-run-lifecycle#agent-run-await)。
- **REST surface**：核心端点为 `POST /runs` 创建 Run、`GET /runs/{run_id}` 查询、`POST /runs/{run_id}` 恢复等待中的 Run、`POST /runs/{run_id}/cancel` 取消。Agent 发现通过 `/agents`、`/agents/{name}` 与 manifest endpoint 表达。来源：[Agent Run Lifecycle](https://agentcommunicationprotocol.dev/core-concepts/agent-run-lifecycle)、[OpenAPI specification](https://github.com/i-am-bee/acp/blob/main/docs/spec/openapi.yaml)。

### 归档与迁移事实

- GitHub 官方仓库已由所有者于 2025-08-27 归档并设为只读；GitHub API 的 `archived` 字段为 `true`。来源：[i-am-bee/acp](https://github.com/i-am-bee/acp)、[GitHub repository API](https://api.github.com/repos/i-am-bee/acp)。
- BeeAI 官方公告称 ACP 已正式合并进 Linux Foundation 旗下 A2A；BeeAI Platform 随后改用 A2A。来源：[ACP Joins Forces with A2A Under the Linux Foundation](https://github.com/orgs/i-am-bee/discussions/5)、[归档仓库 README](https://github.com/i-am-bee/acp#readme)。
- **工程判定**：ACP 适合作为历史模型与迁移背景，不应作为新部署的首选协议。迁移时不能只重命名字段，应把 Agent Manifest 映射到 AgentCard/AgentInterface，把 Run 生命周期映射到 Task/TaskStatus，把 Message/MessagePart 映射到 Message/Part，把 Run 输出映射到 Artifact，并单独处理 Await 与 A2A 的交互状态差异。前半句由归档与合并事实直接支持；映射是基于两份官方数据模型的工程推断，不是官方声称的逐字段兼容承诺。

## Agent Network Protocol（ANP）1.1

### 定位

- ANP 将自己定位为面向 Agentic Web 的开放协议套件，覆盖 Agent 身份、命名、发现、安全消息与应用层协作，并复用 HTTP、DNS、TLS 等现有互联网基础设施。来源：[ANP 官方仓库 README](https://github.com/agent-network-protocol/AgentNetworkProtocol#readme)、[Introduction](https://agentnetworkprotocol.com/en/docs/introduction)。
- 官方仓库把已发布架构归纳为身份与加密通信层、应用协议层；过去“三层”叙述中的 Meta-Protocol 仍处于草案阶段，不能视为 1.1 已发布能力。来源：[ANP 官方仓库 README - Protocol Architecture](https://github.com/agent-network-protocol/AgentNetworkProtocol#protocol-architecture)。

### 1.1 已发布与草案边界

| 模块 | 官方状态 | 核验结论 | 一手来源 |
| --- | --- | --- | --- |
| ANP-03 `did:wba` | Released v1.1，另有 vNext Draft | 1.1 身份方法可按发布版介绍；vNext 修订不可混入稳定语义 | [ANP-03](https://agentnetworkprotocol.com/en/specs/03-did-wba-method-design-specification)、[规范索引](https://github.com/agent-network-protocol/AgentNetworkProtocol#protocol-specification-index) |
| ANP-04 WNS | Released v1.1，另有 vNext Draft | 人类可读 handle 与 Handle-to-DID 解析属于已发布套件 | [ANP-04](https://github.com/agent-network-protocol/AgentNetworkProtocol/blob/main/04-anp-did-wba-name-space-specification.md) |
| ANP-06 Meta-Protocol | Draft / not released | 协议协商仍是草案；不得把动态协议协商写成 1.1 的稳定保证 | [ANP-06](https://agentnetworkprotocol.com/en/specs/06-anp-agent-communication-meta-protocol-specification)、[规范索引](https://github.com/agent-network-protocol/AgentNetworkProtocol#protocol-specification-index) |
| ANP-07 Agent Description | Released v1.1 | Agent Description、接口描述与能力发布属于已发布套件 | [ANP-07](https://agentnetworkprotocol.com/specs/07-anp-agent-description-protocol-specification) |
| ANP-08 Agent Discovery | Released v1.1 | 主动 `.well-known` 发现及向搜索 Agent 被动注册属于已发布套件 | [ANP-08](https://agentnetworkprotocol.com/specs/08-anp-agent-discovery-protocol-specification) |
| ANP-09 End-to-End Instant Messaging | Released v1.1，另有 Messaging 1.2 Draft | 1.1 的 P1-P9 profiles 可按发布版介绍；多设备等 vNext 能力必须标注草案 | [ANP-09](https://github.com/agent-network-protocol/AgentNetworkProtocol/blob/main/09-ANP-end-to-end-instant-messaging-protocol-specification.md)、[Messaging profiles](https://github.com/agent-network-protocol/AgentNetworkProtocol#instant-messaging-profiles) |

### 核心能力的准确表述

- **`did:wba`**：基于 Web 基础设施的 DID method，用于跨平台身份与认证；1.1 发布版规定默认的 `e1_` Ed25519 路径绑定，并保留 `k1_` 兼容扩展。来源：[ANP-03](https://agentnetworkprotocol.com/en/specs/03-did-wba-method-design-specification)、[规范索引](https://github.com/agent-network-protocol/AgentNetworkProtocol#protocol-specification-index)。
- **Agent Description**：Agent 通过机器可读描述公布身份、接口和能力；这是后续发现与调用的描述面。来源：[ANP-07](https://agentnetworkprotocol.com/specs/07-anp-agent-description-protocol-specification)。
- **Discovery**：ANP-08 同时定义主动发现和被动发现。主动发现从域名的 `.well-known` 入口获得描述；被动发现把描述注册到搜索 Agent。来源：[ANP-08](https://agentnetworkprotocol.com/specs/08-anp-agent-discovery-protocol-specification)。
- **Messaging**：ANP-09 是消息规范总览，发布版进一步拆成 JSON-RPC core binding、身份与发现、直接/群组消息、直接/群组 E2EE、附件、跨域联邦和 mentions 等 profiles。来源：[ANP-09](https://github.com/agent-network-protocol/AgentNetworkProtocol/blob/main/09-ANP-end-to-end-instant-messaging-protocol-specification.md)、[Instant Messaging Profiles](https://github.com/agent-network-protocol/AgentNetworkProtocol#instant-messaging-profiles)。
- **采用边界**：可以试验 1.1 已发布的身份、描述、发现和消息模块，但应对生态成熟度与互操作实现做独立验证；ANP-06 和 vNext/1.2 内容只能作为草案评估，不能承诺稳定兼容。这是根据官方状态标签作出的工程建议。

## 可直接用于正文的对比结论

- MCP 的主要互操作对象是 AI 应用与工具/资源/提示；A2A 的主要互操作对象是 Agent 与 Agent，并把长任务建模为 Task。两者可在同一系统中组合。
- BeeAI ACP 已归档并并入 A2A，应讲清历史价值、模型映射与迁移，不建议新建生产依赖。
- ANP 的覆盖面包括去中心化身份、描述、发现和消息网络；其中 1.1 已发布模块与 ANP-06/vNext 草案必须分别陈述。
- 这些协议跨越 Agent 的 Context、Loop、Graph 与 Harness 边界。把它们仅塞进某个单一运行层，会掩盖它们连接不同系统和生命周期对象的作用；该结论属于架构归纳，而非任一规范的原文。

## 固定快照

为便于复核，本次还检查了官方仓库快照：

- BeeAI ACP：[`e5265ca9fa06c55cd011b1e81ee927f6d80af8f6`](https://github.com/i-am-bee/acp/tree/e5265ca9fa06c55cd011b1e81ee927f6d80af8f6)
- ANP：[`ee32805e322da79d6be8fd1bb98b841b945743ac`](https://github.com/agent-network-protocol/AgentNetworkProtocol/tree/ee32805e322da79d6be8fd1bb98b841b945743ac)
