---
description: Agent 设计模式总览，区分单 Agent 的循环模式与多 Agent 的协作拓扑。
---

# 设计模式总览

设计模式描述可复用的控制结构。它们建立在五个设计面之上：单 Agent 模式主要改变 L3 Loop，多 Agent 模式主要改变 L4 Graph。

| 类型 | 模式 | 解决的问题 |
| --- | --- | --- |
| 单 Agent | [Reflection](./single-agent/reflection.md) | 怎样用评审和反馈修订结果 |
| 单 Agent | [ReAct](./single-agent/react.md) | 怎样让推理决策与环境行动交错 |
| 单 Agent | [Plan-and-Execute](./single-agent/plan-and-execute.md) | 怎样显式拆解、执行和重规划长任务 |
| 多 Agent | [Supervisor](./multi-agent/supervisor.md) | 怎样由中心 Agent 动态调度 workers |
| 多 Agent | [Swarm](./multi-agent/swarm.md) | 怎样通过 handoff 转移会话控制权 |
| 多 Agent | [Debate](./multi-agent/debate.md) | 怎样生成独立候选、交叉审查并裁决 |

模式可以组合，但每增加一个循环、Agent 或裁决器都会增加延迟、成本和失败面。应先用一次结构化调用或确定性代码完成能完成的部分，再根据评测暴露的问题引入模式。
