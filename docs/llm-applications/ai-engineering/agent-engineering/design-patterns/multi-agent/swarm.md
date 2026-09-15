---
description: Swarm 与 Handoff 的去中心化控制方式、LangGraph 可运行示例、交接契约和生产风险。
---

# Swarm 与 Handoff

Swarm 没有永久中心调度者。当前 active agent 可以通过 handoff 把控制权交给另一个 Agent，接收方直接继续用户会话，并可在以后再次交接。

## 适用边界

适合：客服从分流员交给退款专家、任务责任人在多个专家间跨轮切换、专家需要保留接管关系。不适合：严格中心审批、强审计链、需要同时比较多个专家候选、责任必须始终由唯一中心承担的高风险流程。

## LangGraph Swarm 示例

下面使用 `create_handoff_tool`、`create_swarm` 和 checkpointer 保存跨轮 active agent。

```bash
pip install -U langgraph-swarm langchain langgraph langchain-openai
```

```python
import os

from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph_swarm import create_handoff_tool, create_swarm


model = ChatOpenAI(model=os.environ["OPENAI_MODEL"])

billing = create_agent(
    model,
    tools=[create_handoff_tool(agent_name="Technical")],
    system_prompt="你是 Billing，只处理扣款与退款；技术故障转交 Technical。",
    name="Billing",
)

technical = create_agent(
    model,
    tools=[create_handoff_tool(agent_name="Billing")],
    system_prompt="你是 Technical，只处理系统故障；扣款与退款转交 Billing。",
    name="Technical",
)

app = create_swarm(
    [billing, technical],
    default_active_agent="Billing",
).compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "support-1001"}}
result = app.invoke(
    {"messages": [{"role": "user", "content": "退款页面一直报 502。"}]},
    config,
)
print(result["messages"][-1].content)
```

示例需要 `OPENAI_API_KEY` 与 `OPENAI_MODEL`。生产中应使用持久化 checkpointer，并结构化记录交接目标、原因、摘要和权限。

## Handoff 契约

```json
{
  "target": "Technical",
  "reason": "退款页面返回 502，账务资格尚未判断",
  "completed": ["已确认订单号 O-9"],
  "evidence_ids": ["ticket:T-3", "log:L-8"],
  "open_questions": ["502 是否影响全部用户"],
  "allowed_scopes": ["logs:read"],
  "return_to": "Billing"
}
```

只传“请你接着处理”会使下一个 Agent 重复搜索、遗漏约束或继承错误权限。交接前还要验证目标 Agent 是否存在、调用者是否有权转交、接收方工具权限是否满足最小授权。

## 常见失败

- A 与 B 相互 handoff，任务没有进展；
- active agent 没有持久化，下一轮又回到默认角色；
- 完整上下文无差别转交，泄露无关用户数据；
- 交接被误当成任务完成；
- 接收方获得原 Agent 的全部写权限；
- 多个 Agent 同时认为自己拥有最终响应权。

## 参考资料

- [LangGraph Swarm](https://github.com/langchain-ai/langgraph-swarm-py)
- [OpenAI：Orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration)
