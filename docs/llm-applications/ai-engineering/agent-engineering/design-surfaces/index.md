---
description: 从 Prompt、Context、Loop、Graph 与 Harness 五个设计面理解 Agent 系统的职责边界。
---

# 设计面总览

五层是一张排障和学习地图，不是必须逐层调用的网络协议。实际运行时 Harness 包住其余设计面，Context 也会随 Loop 和 Graph 的每一步动态变化。

| 层级 | 核心问题 | 主要工件 | 常见故障 |
| --- | --- | --- | --- |
| [L1 Prompt](./prompt-engineering.md) | 怎样表达目标、约束和输出 | 指令、示例、工具描述、Schema | 指令冲突、边界含糊 |
| [L2 Context](./context-engineering/index.md) | 当前一步应该让模型看到什么 | 会话、状态、记忆、RAG、工具结果 | 信息缺失、污染、超预算 |
| [L3 Loop](./loop-engineering.md) | 怎样观察、决策、行动与停止 | 轮次、重试、预算、终止条件 | 死循环、重复副作用 |
| [L4 Graph](./graph-engineering.md) | 怎样连接节点、路由和协作 | 状态图、边、并行、汇合、人工节点 | 路由错误、状态竞争 |
| [L5 Harness](./harness-engineering/index.md) | Agent 在什么边界内运行 | 工具注册、权限、沙箱、检查点、追踪 | 越权、不可恢复、不可审计 |

排查时先定位故障属于信息、控制还是运行边界，再进入对应层级；不要把所有问题都归因于“提示词不够好”。
