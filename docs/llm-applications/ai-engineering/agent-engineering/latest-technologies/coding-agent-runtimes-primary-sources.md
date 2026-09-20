---
description: Claude Code、OpenAI Codex、Pi、GenericAgent、Hermes 与 DeepSeek Harness 的开源边界、运行循环、状态、工具、扩展和安全机制一手资料核验。
---

# Coding Agent Runtime 一手资料核验

核验日期：2026-09-16。本文比较的是六个具体产品或运行时，不是 ReAct、Plan-and-Execute、Supervisor 等抽象设计范式。

本文的“开源”按仓库许可证和可读取源码判断，不按“能否免费下载”“是否有公开 GitHub 仓库”判断。一个产品可能同时包含开源本地运行时、闭源模型服务和未公开的云端控制面；因此必须把这些边界拆开讨论。

## 核验快照

本次以官方默认分支的下列提交为源码快照。链接均指向官方仓库、官方文档或仓库内源码；Context7 和 Tavily 只用于定位当前资料，最终结论仍回到这些一手来源核对。

| 项目 | 核验提交 | 仓库许可证 | 核验结论 |
| --- | --- | --- | --- |
| Claude Code | `anthropics/claude-code@7dd0636` | Anthropic Commercial Terms，All rights reserved | 官方仓库公开插件、脚本和示例，但没有公开 Claude Code 核心 runtime 源码，不能称为开源 Claude Code |
| OpenAI Codex | `openai/codex@5bf132c` | Apache-2.0 | Codex CLI、SDK、App Server 与本地 Rust harness 开源；IDE Extension、Codex Cloud 和模型不因该仓库而开源 |
| Pi | `earendil-works/pi@60e7e76` | MIT | Agent Core、Coding Agent CLI、TUI、会话、扩展与 provider 抽象开源 |
| GenericAgent | `lsdefine/GenericAgent@1b6442f` | MIT | 极简主循环、原子工具、文件记忆和浏览器桥接源码开源 |
| Hermes Agent | `NousResearch/Hermes-Agent@536a07b` | MIT | 主循环、记忆、Session、Toolset、Gateway、执行后端和子 Agent 实现开源 |
| DeepSeek Harness | `deepseek-ai/deepseek-harness@0d1f500` | MIT | Cordis 插件运行时、Profiles/Bundles、Session、工具、沙箱和 Subagent seams 开源；当前明确是 developer preview |

许可证证据：[Claude Code `LICENSE.md`](https://github.com/anthropics/claude-code/blob/main/LICENSE.md)、[Codex `LICENSE`](https://github.com/openai/codex/blob/main/LICENSE)、[Pi `LICENSE`](https://github.com/earendil-works/pi/blob/main/LICENSE)、[GenericAgent `LICENSE`](https://github.com/lsdefine/GenericAgent/blob/main/LICENSE)、[Hermes `LICENSE`](https://github.com/NousResearch/Hermes-Agent/blob/main/LICENSE)、[DSH `LICENSE`](https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE)。

## 一眼对比

| Runtime | 入口与控制核心 | 状态、上下文与记忆 | 工具与扩展 | 安全与隔离 | 多 Agent | 当前成熟度 |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | `claude` CLI、IDE、Agent SDK；核心 loop 未公开 | Session、`CLAUDE.md`、rules、compact 生命周期 | 内建工具、Hooks、MCP、Skills、Plugins | Permission rules 与可选 Sandbox Runtime | Subagents、Agent Teams | 商业产品持续发布；内部实现不是稳定公开 API |
| Codex | `codex` CLI、SDK、App Server；Rust `run_turn` 开源 | Thread/Turn、rollout、state DB、`AGENTS.md`、compaction | ToolRouter、MCP、Skills、Plugins、Hooks、Apps | Approval policy、跨平台 sandbox、网络策略 | 开源 AgentControl、子 Thread、Multi-Agent V2 | 活跃开源 harness；IDE UI 与 Codex Cloud 不开源 |
| Pi | `pi` CLI、`Agent` / `agentLoop` | JSONL Session tree、SQLite 可选后端、transform/compact | TypeScript Extensions、Skills、Packages、custom tools | 默认继承当前用户权限；无内建安全沙箱 | 官方 subagent extension 示例，不是固定核心拓扑 | 活跃 MIT 项目，核心接口可直接检查和修改 |
| GenericAgent | `ga` / `agentmain.py`、约百行 `agent_runner_loop` | L0–L4 文件记忆、Working Checkpoint、Session archive | 9 个原子工具、Skill 结晶、TMWebdriver、Goal Hive | 未提供强隔离；真实浏览器复用登录态 | Goal Hive 的 Master/Worker 协作 | 研究与个人自动化取向；生产治理需部署者补齐 |
| Hermes | `hermes` CLI、TUI、Gateway、`run_conversation` | SQLite Session、FTS5 检索、压缩、`MEMORY.md` / `USER.md`、Memory providers | Toolsets、Skills、MCP、Plugins、Channels、Cron | Local 无强隔离；Docker/SSH/云 Sandbox 等 backend 可替换 | `delegate_task`、公开 SubagentLifecycle、并行子任务 | 功能面广且快速演进；部署复杂度高 |
| DSH | `dsh web/headless/sdk/acp`、Cordis plugin tree | Append-only SessionEvent、projection、JSONL/SQLite persistence | Profiles、Bundles、Services、typed events、tools guards | 跨平台 sandbox、approval/preset；官方仍警告不能作为唯一安全边界 | 可替换 Subagent providers、continuable children、实验 Agent Teams | `0.1.0-rc` developer preview，明确不保证兼容和生产安全 |

## Claude Code

### 开源与许可证边界

- `anthropics/claude-code` 是 Anthropic 官方仓库，但根许可证写明“© Anthropic PBC. All rights reserved”，使用受商业条款约束；仓库中公开的是 README、issue tracker、安装信息、官方 plugins 和维护脚本等内容，没有 Claude Code 主程序的 `src`、核心 loop 或会话引擎实现。因此“有官方 GitHub 仓库”不等于“Claude Code 已开源”。[仓库](https://github.com/anthropics/claude-code)、[许可证](https://github.com/anthropics/claude-code/blob/main/LICENSE.md)、[公开 Plugins 目录](https://github.com/anthropics/claude-code/tree/main/plugins)
- Claude Agent SDK 提供可编程接口和类型定义，但 SDK 可见不等于 Claude Code 产品内部实现开源。可安全依赖的是 SDK、CLI、hooks 与配置文档所承诺的行为，不应根据打包产物、逆向结果或第三方复刻推断内部状态机。[Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)

### 入口和公开运行循环

- 用户入口包括 `claude` CLI、IDE integration 和 Agent SDK。SDK 的 `max_turns` 将一次 turn 描述为一次工具调用往返，说明外部可观察循环是“请求模型 → 可能调用工具 → 写回结果 → 继续”，但官方没有发布可供第三方依赖的 Claude Code 核心 loop 类或源码。[Overview](https://code.claude.com/docs/en/overview)、[CLI reference](https://code.claude.com/docs/en/cli-reference)、[Agent SDK reference](https://platform.claude.com/docs/en/agent-sdk/python)
- 因此架构图可以画公开事件和控制面，不能把 Claude Code 内部固定标成某个 ReAct、Planner 或 Supervisor 实现，也不能声称知道其私有重试、摘要算法和调度状态机。

### Session、Context 与记忆

- Session 支持继续、恢复和 fork；`CLAUDE.md`、用户/项目/本地 memory 与 `.claude/rules/` 构成可版本化或分层加载的指令上下文。它们是外部持久指令，不是模型权重更新。[Memory](https://code.claude.com/docs/en/memory)
- `PreCompact`、`PostCompact` 以及 `SessionStart` 的 `compact` 来源构成公开 compact 生命周期。可以确认 compact 前后存在 hook seam，但不能从事件名推断摘要模型、精确裁剪顺序或 token 分配算法。[Hooks](https://code.claude.com/docs/en/hooks)

### Tools、扩展与安全

- Hooks 覆盖 `PreToolUse`、`PermissionRequest`、`PostToolUse`、失败和批处理等阶段；`PreToolUse` 与权限回调可允许、询问或拒绝动作。MCP 负责接入外部工具与数据，Skills 封装按需过程知识，Plugins 则打包 commands、agents、skills、hooks 和 MCP 配置，它们不是同一抽象层。[Hooks](https://code.claude.com/docs/en/hooks)、[MCP](https://code.claude.com/docs/en/mcp)、[Skills](https://code.claude.com/docs/en/skills)、[Plugins](https://code.claude.com/docs/en/plugins)
- Permission rules 控制工具授权；Anthropic Sandbox Runtime 可对文件系统和网络建立 OS 级边界，并覆盖 tools、hooks 和 MCP server。Sandbox 是可配置运行环境，不能反推所有默认安装都已强隔离。[Permissions](https://code.claude.com/docs/en/permissions)、[Sandboxing](https://code.claude.com/docs/en/sandboxing)、[Sandbox environments](https://code.claude.com/docs/en/sandbox-environments)

### 多 Agent 与不可推断边界

- Subagents 有独立 prompt、上下文、工具和模型配置，并可通过 hooks 观察生命周期；Agent Teams 是更高层的协作能力。可以画成父会话委派到隔离上下文，不能据此断言底层一定使用某个公开 scheduler。[Subagents](https://code.claude.com/docs/en/sub-agents)、[Agent Teams](https://code.claude.com/docs/en/agent-teams)
- 成熟度应表述为“持续发布的商业产品”，而不是“源码稳定”。官方文档能证明产品能力，不能证明未公开 runtime 的模块边界。

## OpenAI Codex

### Codex 到底是不是开源

是，但要说完整。OpenAI 官方的 [Open source 页面](https://developers.openai.com/codex/open-source) 明确区分了产品面：

- **开源**：Codex CLI、Codex SDK、Codex App Server；它们建立在同一个开源 Codex harness 上。
- **不开源**：IDE Extension 与 Codex Cloud。
- **另行开源**：Codex Cloud 使用的 universal base image 位于 [`openai/codex-universal`](https://github.com/openai/codex-universal)，它是环境镜像，不等于 Codex Cloud 控制面源码。

`openai/codex` 整体采用 Apache-2.0，公开的不只是一个命令行包装器。仓库中能直接读取并构建本地 Rust harness、`run_turn` 工具循环、Thread/Turn 状态、App Server、Tool Router、Approval/Sandbox 和 Multi-Agent V2。[Codex 仓库](https://github.com/openai/codex)、[Apache-2.0 许可证](https://github.com/openai/codex/blob/main/LICENSE)、[从源码构建](https://github.com/openai/codex/blob/main/docs/install.md)

准确说法是：**Codex 的 harness、CLI、SDK 和 App Server 开源；IDE UI、Codex Cloud、模型权重与托管推理服务不因此开源。**

### 入口与核心 loop

- `codex` CLI 是本地入口；SDK 用于程序化运行；IDE 等富客户端通过开源 App Server 驱动 harness。当前 TUI 与 `codex exec` 已共同使用进程内 App Server client：内部走 typed channels，跨进程边界再序列化协议。外部 App Server 默认使用 stdio/JSONL，也提供实验性 WebSocket 和 Unix/control socket；协议显式区分 Thread、Turn 与 Item。[README](https://github.com/openai/codex/blob/main/README.md)、[In-process App Server client](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/app-server-client/README.md#L1-L66)、[App Server 文档](https://developers.openai.com/codex/app-server)、[App Server 源码](https://github.com/openai/codex/tree/main/codex-rs/app-server)
- App Server 的控制面可按 `Transport → MessageProcessor → ThreadManager → N 个 Core Session` 理解。MessageProcessor 已拆分为 account、apps、catalog、config、environment、filesystem、Git、MCP、plugin、thread、turn 和 sandbox 等 processor；ThreadManager 为每个 Thread 装配 model、skills、plugins、MCP、extensions、history、AgentControl 与 ThreadStore。[官方 Harness 架构说明](https://openai.com/index/unlocking-the-codex-harness/)、[MessageProcessor](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/app-server/src/message_processor.rs#L140-L170)
- 核心循环不是黑盒。`codex-rs/core/src/session/turn.rs` 的 `run_turn` 注释和实现明确：每个 sampling request 后，模型可能产生 assistant message、function call、local shell call 或 MCP tool call；工具请求经路由执行并把结果送回下一次 sampling，只有纯最终消息等终止条件才结束 turn。[`run_turn` 源码](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/turn.rs)
- `run_turn` 同时公开了 step-context 捕获、pre-sampling compact、工具清单冻结、pending input/steering、自动 compact、hooks 和 turn-stop 等控制点。因此将 Codex 仅描述为“核心调度由闭源产品负责”已经不准确。

### Thread、Turn、Context 与持久状态

- App Server 的 Thread 是可开始、恢复、fork、归档的对话；Turn 属于某个 Thread，并持续发出 item、approval 和完成事件。Thread/Turn 不是 UI 猜测，而是正式协议对象。[App Server Threads and Turns](https://developers.openai.com/codex/app-server#threads)
- `Session` 源码保存 `thread_id`、Submission/Event 双队列、活动 Turn、SessionSource、history mode、fork parent、spawn parent、权限配置和环境选择；后台 `submission_loop` 消费请求并发出事件。状态模块管理 conversation history、token usage、auto-compact window 与 world state。[Session queues](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/core/src/session/mod.rs#L401-L417)、[Submission loop](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/core/src/session/mod.rs#L925-L939)、[Session state](https://github.com/openai/codex/blob/main/codex-rs/core/src/state/session.rs)
- `ThreadStore` 是持久化抽象。本地 canonical history 是 JSONL，SQLite 用于可查询元数据；仓库外也允许存在其他 storage implementation，所以不能从本地存储布局反推 Codex Cloud 后端。[ThreadStore](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/thread-store/README.md#L1-L30)
- `AGENTS.md` 从 project root 到 cwd 分层加载；用户/开发者指令、环境、权限、模型、Skills、Plugins、工具 schema、attachments 和 turn additional context 被组合为模型输入。它们不等于“无限长期记忆”，而是当前 Thread 的持久历史、world state 和注入上下文。[`AGENTS.md` loader](https://github.com/openai/codex/blob/main/codex-rs/core/src/agents_md.rs)、[Context world state](https://github.com/openai/codex/tree/main/codex-rs/core/src/context/world_state)
- Codex 另有可选 Memories recall layer，默认关闭，保存在 `~/.codex/memories/`，与 ChatGPT memory 分离；它只提供可召回经验，不能替代必须遵守的 `AGENTS.md` 规则。[Memories](https://developers.openai.com/codex/customization/memories)
- Compaction 有本地和远端路径，源码中存在 token budget、summary/history 重建和 remote compaction 适配。可以说明这些实现存在，但远端压缩服务内部仍不在本地仓库的可见边界内。[Core compaction files](https://github.com/openai/codex/tree/main/codex-rs/core/src)

### Tools、扩展、安全与多 Agent

- ToolRouter 和 registry 将 shell、`apply_patch`、MCP、MCP resources、plan、user input、插件安装、图像、时间、动态工具及多 Agent 控制等 handler 统一到工具调用路径。[Tools source](https://github.com/openai/codex/tree/main/codex-rs/core/src/tools)
- Skills、Plugins、MCP、Hooks 和 Apps 都有仓库实现或协议接入。Skill 负责可发现过程知识，Plugin 是可安装组合包，MCP 连接外部 server，Hooks 围绕 lifecycle 运行，Apps 通过受控工具面连接应用。是否启用、是否要求审批和向哪些 surface 暴露，受配置和策略控制。[Skills source](https://github.com/openai/codex/blob/main/codex-rs/core/src/skills.rs)、[MCP source](https://github.com/openai/codex/blob/main/codex-rs/core/src/mcp.rs)、[App Server plugins](https://github.com/openai/codex/tree/main/codex-rs/app-server/src/request_processors/plugins)
- 当前安全主路径是 `Permission profile resolver → filesystem policy + network policy → active network proxy → platform sandbox`。Permission profile 将文件系统和网络规则统一描述；只有启用 `features.network_proxy=true` 后，域名 allow/deny 才由代理强制执行。旧 `read-only`、`workspace-write`、`danger-full-access` 等 `SandboxMode` 仍保留为兼容路径，不应把最新架构只画成旧三档。[Permissions](https://developers.openai.com/codex/permissions)、[Permission enums](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/protocol/src/protocol.rs#L985-L1118)
- Approval 与 sandbox 是正交轴：approval policy 决定何时询问，sandbox/profile 决定获准动作仍被怎样限制。平台 enforcement 包括 macOS Seatbelt、Linux/WSL bubblewrap（Landlock 为兼容回退）以及 Windows elevated/unelevated 路径。MCP server 不会自动被 Codex shell sandbox 包住，外部 MCP 工具必须独立审查和约束。[Permissions](https://developers.openai.com/codex/permissions)、[Agent loop safety boundary](https://openai.com/index/unrolling-the-codex-agent-loop/)
- Multi-Agent 也是开源实现，而不是泛化的“Supervisor”标签：同一 root Thread tree 共享 AgentControl/Registry，每个 child 是独立 Thread/Core Session，有自己的模型、工具和上下文。V2 handler 暴露 spawn、send message、follow-up、interrupt、list 和 wait；父权限与并发/深度限制约束子 Agent，结果以 inter-agent message/summary 回到父 Thread。[AgentControl](https://github.com/openai/codex/blob/5bf132cd527311eb61bbec46562e3890eb49df80/codex-rs/core/src/agent/control.rs#L124-L147)、[Subagents](https://developers.openai.com/codex/agent-configuration/subagents)、[Multi-Agent handlers](https://github.com/openai/codex/tree/main/codex-rs/core/src/tools/handlers/multi_agents_v2)

### 成熟度与边界

- Codex 是活跃维护的开源 harness，而不是只公开接口的闭源 Agent；可以按源码绘制核心 turn、工具、状态、权限和多 Agent 机制。
- 仍不应把仓库外的模型推理、账户系统、IDE Extension 和 Codex Cloud 画成已知开源内部模块。`openai/codex` 中出现 backend/cloud client 或 OpenAPI models，只能证明开源 harness 有客户端适配，不能证明服务端实现开源。[Codex as a platform](https://developers.openai.com/blog/codex-as-a-platform)

## Pi（当前仓库与包名）

### 开源范围和入口

- 原 `badlogic/pi-mono` 地址当前指向官方 Pi Agent Harness 仓库；仓库和包元数据使用 `earendil-works/pi`，许可证为 MIT。核心包包括 `@earendil-works/pi-agent-core`、`pi-ai`、`pi-coding-agent`、`pi-tui` 和应用组合运行时 Chord。[仓库 README](https://github.com/earendil-works/pi/blob/main/README.md)、[Agent Core](https://github.com/earendil-works/pi/tree/main/packages/agent)、[Coding Agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)
- `pi` 是 CLI/TUI 入口；`Agent` 类和低层 `agentLoop` / `agentLoopContinue` 是嵌入入口。当前 Agent Core 明确公开状态、事件流、工具并行/串行执行、`beforeToolCall`、`afterToolCall`、steering、follow-up 与 `shouldStopAfterTurn`。[Agent Core README](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)、[Loop source](https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts)

### Session、Context 与扩展

- Coding Agent 把完整会话保存为 JSONL tree，支持 `/tree`、fork、clone、resume 和 compaction。完整历史与送入当前模型的压缩上下文是两个不同对象。[Sessions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md)、[Session format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md)、[JSONL storage source](https://github.com/earendil-works/pi/tree/main/packages/agent/src/harness/session/jsonl)
- Agent Core 支持 `transformContext()` 在每次 LLM 调用前裁剪或注入上下文，Coding Agent 再叠加 project context、Skills、prompt templates、resources、settings 和 compaction。[Agent Core README](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)、[Compaction](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md)
- Extensions 是运行时代码扩展，可注册工具、commands、快捷键、UI、事件处理和 provider 行为；Packages 是可分发资源集合。Subagent 和 plan mode 位于官方 extension examples，说明 Pi 支持这些组合，但它们不是核心 loop 强制内置的固定拓扑。[Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)、[Subagent example](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent)、[Plan mode example](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/plan-mode)

### 安全和成熟度

- 官方安全文档明确说明：Pi 默认以启动用户权限运行，没有内建安全 sandbox；project trust 只控制是否加载项目本地设置和扩展，不限制模型启动后能要求工具做什么。Extensions 也以相同进程权限执行。[Security](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md)
- 需要强边界时，应把整个 Pi 放入 container、VM、microVM、OpenShell 或 Docker Sandbox；示例 permission gate 和 sandbox extension 是可组合能力，不能误写成默认保证。[Containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md)
- Pi 是活跃的 MIT 项目，源码可检查、可修改；其优势是透明和扩展自由，而不是默认提供企业级策略、审批与隔离。

## GenericAgent

### 开源范围、入口和主循环

- GenericAgent 采用 MIT 许可证。主要入口是 `ga` / `ga.py` 和 `agentmain.py`；`agent_loop.py` 中的 `agent_runner_loop` 是可直接阅读的短循环，不是营销图里的抽象黑盒。[仓库](https://github.com/lsdefine/GenericAgent)、[`agentmain.py`](https://github.com/lsdefine/GenericAgent/blob/main/agentmain.py)、[`agent_loop.py`](https://github.com/lsdefine/GenericAgent/blob/main/agent_loop.py)
- 循环按 turn 调用模型，解析一个或多个 tool calls，交给 handler dispatch，收集 tool results 与 next prompt，再进入下一轮；Session 对象保留历史。官方将其概括为“感知环境 → 任务推理 → 执行工具 → 写经验 → 循环”。[Loop source](https://github.com/lsdefine/GenericAgent/blob/main/agent_loop.py)、[README 架构说明](https://github.com/lsdefine/GenericAgent#-architecture)

### Context、记忆、工具与扩展

- 文件记忆按 L0 Meta Rules、L1 Insight Index、L2 Global Facts、L3 Task Skills/SOPs、L4 Session Archive 分层；`update_working_checkpoint` 保存工作状态，`start_long_term_update` 触发长期沉淀。所谓 self-evolution 是从成功轨迹中结晶 Skill/SOP，不是在线更新模型权重。[README Memory](https://github.com/lsdefine/GenericAgent#-architecture)
- 九个原子工具覆盖代码执行、文件读写/补丁、网页扫描、网页 JavaScript、询问用户、工作 Checkpoint 和长期记忆更新；高阶能力通过代码、Skill 和记忆组合。[Tool schema](https://github.com/lsdefine/GenericAgent/blob/main/assets/tools_schema.json)
- TMWebdriver 是本地 WebSocket server 加浏览器扩展，连接真实且持久的 Chrome/Chromium 会话；这能复用登录态和扩展，也把 cookies、页面注入和真实账号副作用纳入风险边界。[TMWebdriver](https://github.com/lsdefine/GenericAgent/blob/main/TMWebDriver.py)、[README Browser Realness](https://github.com/lsdefine/GenericAgent#browser-realness-of-ga-web-tools)
- Goal Hive 是仓库内 SOP 驱动的 Master/Worker 协作，依赖 BBS 协调多个 worker；它属于项目提供的多任务扩展，不等同于核心 loop 内置一个通用 Supervisor runtime。[Goal Hive SOP](https://github.com/lsdefine/GenericAgent/blob/main/memory/goal_hive_sop.md)

### 安全和成熟度

- 官方源码未提供与 Codex/DSH 同级的 OS sandbox、统一 approval policy 或权限 profile；`code_run`、文件操作和真实浏览器能力直接触达主机环境。生产使用必须外置容器/虚拟机、凭据隔离、人工审批、审计和资源限制。
- 项目适合研究最小循环、层次记忆与 Skill 结晶。README 中的“系统级控制”“自我进化”和 benchmark 结果是项目方陈述，不能据此推断已具备生产安全或通用可靠性。

## Hermes Agent

### 开源范围和入口

- Hermes Agent 采用 MIT 许可证，主程序、CLI/TUI、Gateway、tools、memory、session、plugins 与 execution backend 都在官方仓库中。入口包括 `hermes` CLI/TUI、消息平台 Gateway 和 ACP 等集成。[仓库](https://github.com/NousResearch/Hermes-Agent)、[README](https://github.com/NousResearch/Hermes-Agent/blob/main/README.md)
- `agent/conversation_loop.py` 的 `run_conversation` / `_run_conversation_turn` 驱动一次用户任务：准备上下文和工具、请求模型、执行 tool round、处理重试/压缩/中断，直到文本完成或达到 iteration/budget/错误终止条件。[Conversation loop](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/conversation_loop.py)、[Tool round](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/turn_tool_round.py)

### Session、Context 和记忆

- 会话消息持久化到 SQLite；代码对批量写入、去重、压缩后 tip 迁移和损坏时 JSONL divert 都有明确处理。历史检索使用 SQLite FTS5，并与策展记忆分开。[Session persistence](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/session_persistence.py)、[Memory documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- 默认 `MEMORY.md` 和 `USER.md` 的字符上限分别是 2200 和 1375；它们在启动时作为持久策展信息进入 system prompt。MemoryManager 还允许外部 provider 执行 prefetch、同步、session switch、delegation 和 pre-compress checkpoint。[Agent initialization](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/agent_init.py)、[Memory manager](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/memory_manager.py)
- 上下文层还包括项目规则、Skills、会话历史、压缩 summary、工具 schema 和运行表面信息。Session history、FTS5 recall、策展 memory 和模型上下文窗口不能混成一个“长期记忆”框。

### Tools、执行后端与安全

- Toolset 决定模型能看到哪些能力，Tool Registry/dispatcher 负责实际调用。`execute_code` 允许生成 Python 编排多个工具，降低逐次模型往返；这是 Programmatic Tool Calling，不代表生成代码可绕过 tool policy。[Tools](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools)、[Toolsets reference](https://hermes-agent.nousresearch.com/docs/reference/toolsets-reference)、[Code execution](https://hermes-agent.nousresearch.com/docs/user-guide/features/code-execution)
- Hermes 支持 local、Docker、SSH、Singularity、Modal、Daytona 和 Vercel Sandbox 等终端 backend。Toolset 决定“可请求什么”，backend 决定“在哪里执行”；local backend 仍继承本机权限，只有选择容器或远端 sandbox 才获得相应隔离。[README execution backends](https://github.com/NousResearch/Hermes-Agent/blob/main/README.md)、[Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- Tool guardrails 能检测重复、失败和循环并给出 allow/warn/block/halt，但这是行为保护，不等同于 OS 安全边界。Checkpoint/rollback 对工作区变更提供恢复能力，也不能替代隔离和备份。[Tool guardrails](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/tool_guardrails.py)、[Checkpoints](https://hermes-agent.nousresearch.com/docs/user-guide/checkpoints-and-rollback)

### 多 Agent、入口面与成熟度

- `delegate_task` 创建隔离子上下文；公开的 `SubagentLifecycleService` 提供 launch、status、cancel、reconnect 和 result，并限制子任务不能扩大父 Agent 的 Toolset 权限。该实现可直接从源码核验，不只是 README 功能清单。[Subagent lifecycle](https://github.com/NousResearch/Hermes-Agent/blob/main/agent/subagent_lifecycle.py)、[Delegate tool](https://github.com/NousResearch/Hermes-Agent/blob/main/tools/delegate_tool.py)
- Gateway、Cron、Telegram/Discord/Slack/WhatsApp/Signal 等 channels 让 Hermes 可长期运行。能力面越宽，越需要分别审查入口身份、定时任务权限、backend 凭据、子 Agent 继承和回滚范围。[Features](https://hermes-agent.nousresearch.com/docs/user-guide/features/overview)、[Gateway source](https://github.com/NousResearch/Hermes-Agent/tree/main/gateway)
- Hermes 是活跃开源项目，但功能和文件结构快速演进。应按实际版本锁定配置和源码，不把当前实现细节写成永久协议。

## DeepSeek Harness / DSH

### 开源范围、入口与成熟度

- DSH 采用 MIT 许可证，Cordis plugin runtime、CLI/Web、Profiles/Bundles、核心 services、session persistence、tools、sandbox 和 subagent providers 都在官方仓库中。入口包括 `dsh web`、headless、SDK JSON-RPC 和 automation-only ACP profile。[README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)、[Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- 官方明确标注 developer preview、会发生兼容性破坏，并在 `SAFETY.md` 中说明尚未经过安全审计、不得视为安全或 production-ready。这是六者中最明确的成熟度声明。[README developer preview](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md#developer-preview)、[Safety](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)

### Cordis、Profile、Bundle 与启动

- Cordis 让 plugin 向共享 Context 注册 service、typed event 和可逆 effect；model adapter、tool registry、session log 和 agent loop 本身都是可替换 plugin。它不是“另一种 ReAct”，而是装配 Agent 的 runtime/harness。[Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- Profile 是启动配置，Bundle 是可复用插件层。`dsh-base` 提供 model、tools、persistence、sandbox/approval、settings、credentials 和 telemetry，web/headless/sdk/acp 再叠加不同应用层；`boot()` 创建 Context、挂 Loader、应用 patch、加载 plugin tree 并等待 activation。[Profiles and bundles](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md#profiles-and-bundles)、[`boot()` source](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/app-boot/src/index.ts)

### Turn、Session 与 Context

- 官方定义：step 是一次模型请求及其工具调用，turn 是零个或多个 step。主链为打开 turn、认领 input、组装 prompt/tool schema、`agent/pre-step`、`step/start`、从 Session log 派生 history、`agent/request`、`llm/stream`、提交 assistant message、执行 `tool/call` 与 `tools/*` pipeline，然后继续或结束。[Turn flow](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md#turn-flow)
- SessionEvent log 是模型上下文的事实来源，`deriveMessages()` 从日志投影 history；assistant success、failed/retried/cancelled attempt、fork、resume、transcript、telemetry 和 persistence 都围绕 durable settlement 构建。官方还要求“model-visible means logged”。[Session log](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md#session-log)、[Session subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/session.md)
- Persistence 是 backend seam，当前提供 JSONL/SQLite 等实现；projection 将事件折叠成 UI、工具或其他 consumer 可读取的状态。不能把 append-only log 误写成“模型长期记忆”，它首先是可重放的运行事实。[Session persistence](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/session)

### Tools、安全与多 Agent

- `ctx.tools` 是 scoped registry 和 guarded execution pipeline；prompt assembly 读取 tool schema，执行经过 `tools/pre-execute → execute → post-execute`，plugin 可在 waterfall event 中拦截。[Tools subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/tools.md)、[Tool pipeline](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-execution-pipeline.md)
- Sandbox 支持 `read-only`、`workspace-write` 和 `danger-full-access`；本地 backend 在 Linux 使用 bwrap/Landlock、macOS 使用 Seatbelt、Windows 使用 restricted token 与 ACL 写限制。被策略拒绝的动作可经一次性用户批准升权。[Sandbox packages](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/sandbox/README.md)、[Sandbox subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/sandbox.md)
- 该 sandbox 是与宿主共享 kernel/filesystem 的 same-world confinement，容器、microVM 和远端 executor 应替换整个 capability。官方同时警告 sandbox/approval 不能保证完全隔离，因此不能写成“DSH 默认安全”。[Safety](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)
- Subagent 是可选 seam，不属于核心 loop。多个 provider 可并存，包括 in-process spawn/fork、ACP、Codex、Claude Code 和 DSH SDK；continuable child 和只读 descendant discovery 也由同一 service 管理。实验 Agent Teams 在此之上增加 durable roster、task board 和 mailbox。[Subagent subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/subagent.md)、[Agent Teams](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/agent-team.md)

## 结论：六者不能只按“闭源产品 / 开源框架”二分

1. **Codex 是开源 Agent Harness。** Apache-2.0 仓库已公开本地 loop、状态、App Server、工具、安全和 Multi-Agent；应据源码讲架构，而不是把它当成只有公开接口的黑盒。
2. **Codex 不是“OpenAI 全栈都开源”。** 官方明确标记 IDE Extension 与 Codex Cloud 不开源，模型权重和托管服务也不在开源 harness 的结论内。
3. **Claude Code 核心仍不是开源。** 官方 GitHub 仓库的存在、公开 plugins 或 Agent SDK 都不足以证明核心 runtime 开源。
4. **Pi、GenericAgent、Hermes 和 DSH 都能从源码分析 loop。** 但它们的目标不同：Pi 强调最小可扩展 Coding Agent，GenericAgent 强调记忆与 Skill 结晶，Hermes 强调长期个人 Agent 与多入口，DSH 强调可替换 service/plugin seams。
5. **安全能力不能用“开源”代替。** Pi 和 GenericAgent 默认更接近当前用户权限；Codex 和 DSH 有显式 sandbox/approval；Hermes 的隔离强度取决于 backend；Claude Code 以公开 permission/sandbox 产品面为准。
6. **成熟度必须单独判断。** DSH 明确是 developer preview；其他活跃项目也应锁版本验证，不能因为仓库热门或功能多就推断 API 稳定、经过安全审计或适合无人值守生产。

## 官方来源索引

- Claude Code：[仓库](https://github.com/anthropics/claude-code)、[文档](https://code.claude.com/docs/en/overview)、[Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- OpenAI Codex：[Open source 边界](https://developers.openai.com/codex/open-source)、[仓库](https://github.com/openai/codex)、[Codex 文档](https://developers.openai.com/codex/)、[App Server](https://developers.openai.com/codex/app-server)
- Pi：[仓库](https://github.com/earendil-works/pi)、[Coding Agent docs](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs)、[Agent Core](https://github.com/earendil-works/pi/tree/main/packages/agent)
- GenericAgent：[仓库](https://github.com/lsdefine/GenericAgent)、[主循环](https://github.com/lsdefine/GenericAgent/blob/main/agent_loop.py)
- Hermes Agent：[仓库](https://github.com/NousResearch/Hermes-Agent)、[文档](https://hermes-agent.nousresearch.com/docs/)
- DeepSeek Harness：[仓库](https://github.com/deepseek-ai/deepseek-harness)、[架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)、[安全说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)
