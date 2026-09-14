---
description: Agent 工具的接口、Schema、错误语义、幂等、分页、权限、MCP 与评测方法，并提供安全工具注册表示例。
---

# Tool Use 与工具工程

工具既是 Agent 的能力，也是上下文负担和安全边界。Tool Use 不是 ReAct 的同义词：一次 function calling、Plan executor、Supervisor、Graph 节点都可以使用工具。

## 工具横跨三个设计面

| 设计面 | 工具相关问题 |
| --- | --- |
| 信息面 | 模型看见哪些工具名称、描述、Schema 和结果 |
| 控制面 | 谁决定调用哪个工具、何时重试、是否并行 |
| 运行面 | 谁验证参数、授权、执行、超时、审计和回滚 |

模型只提出 `tool_call`，Harness 才拥有执行权。

## 好工具的契约

```text
name            唯一、动词明确
description     做什么、何时用、何时不用
input_schema    类型、枚举、范围、单位、时区
output_schema   ok/data/error/cursor 等稳定结构
side_effect     read / write / destructive / external_message
retry_policy    是否幂等、哪些错误可重试
authorization   所需身份、作用域和审批
observability   trace id、延迟、结果大小、错误类型
```

工具应围绕 Agent 的任务边界设计，不要把底层 API 一比一暴露。与其提供 `run_sql(sql: str)`，不如提供 `search_orders(customer_id, status, date_from, limit, cursor)`。

## 可运行的受控工具注册表

下面示例使用 Python 标准库和 Pydantic 2。它展示参数验证、权限、超时、结构化错误与调用审计；工具数据是明确标注的本地模拟数据。

```bash
pip install "pydantic>=2,<3"
```

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from dataclasses import dataclass
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field, ValidationError


class SearchOrdersArgs(BaseModel):
    customer_id: str = Field(pattern=r"^C-\d+$")
    status: Literal["paid", "refunded", "cancelled"] | None = None
    limit: int = Field(default=10, ge=1, le=50)


@dataclass(frozen=True)
class ToolSpec:
    input_model: type[BaseModel]
    handler: Callable[..., Any]
    required_scope: str
    timeout_s: float = 2.0


# 教学模拟数据；生产中替换为真实订单服务客户端。
ORDERS = [
    {"id": "O-1", "customer_id": "C-7", "status": "paid"},
    {"id": "O-2", "customer_id": "C-7", "status": "refunded"},
]


def search_orders(customer_id: str, status: str | None, limit: int) -> dict:
    rows = [x for x in ORDERS if x["customer_id"] == customer_id]
    if status:
        rows = [x for x in rows if x["status"] == status]
    return {"items": rows[:limit], "next_cursor": None}


TOOLS = {
    "search_orders": ToolSpec(
        input_model=SearchOrdersArgs,
        handler=search_orders,
        required_scope="orders:read",
    )
}


def execute_tool(name: str, raw_args: dict, scopes: set[str]) -> dict:
    spec = TOOLS.get(name)
    if spec is None:
        return {"ok": False, "error": {"code": "tool_not_allowed"}}
    if spec.required_scope not in scopes:
        return {"ok": False, "error": {"code": "permission_denied"}}
    try:
        args = spec.input_model.model_validate(raw_args)
    except ValidationError as exc:
        return {"ok": False, "error": {"code": "invalid_arguments", "details": exc.errors()}}

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(spec.handler, **args.model_dump())
        try:
            data = future.result(timeout=spec.timeout_s)
            return {"ok": True, "data": data}
        except FutureTimeout:
            return {"ok": False, "error": {"code": "timeout", "retryable": True}}


print(execute_tool(
    "search_orders",
    {"customer_id": "C-7", "status": "paid", "limit": 5},
    {"orders:read"},
))
```

线程超时不能强制终止已经运行的函数。生产中应让 HTTP/数据库客户端自身支持 timeout 与 cancellation，并限制后台任务资源。

## 错误要帮助 Agent 修正

不要把所有失败都变成 `Exception: request failed`。稳定错误码可指导下一步：

```json
{
  "ok": false,
  "error": {
    "code": "invalid_date_range",
    "message": "date_from must be earlier than date_to",
    "retryable": false,
    "field": "date_from"
  }
}
```

区分：参数错误、权限拒绝、未找到、限流、上游超时、冲突、部分成功和内部错误。只对明确的瞬时错误做有界重试。

## 副作用与幂等

| 等级 | 示例 | 默认策略 |
| --- | --- | --- |
| 只读 | 搜索、查询订单 | 可自动执行，仍需权限与限流 |
| 可逆写入 | 创建草稿、打标签 | 记录前后状态，允许撤销 |
| 外部通信 | 发邮件、发布消息 | 展示预览，确认收件人与内容 |
| 财务/删除 | 退款、支付、删库 | 人工审批、幂等键、审计和回滚方案 |

写操作使用业务幂等键，而不是让模型“记住不要重复”：

```python
def refund_order(order_id: str, amount_cents: int, idempotency_key: str) -> dict:
    """同一个 idempotency_key 重复提交必须返回同一业务结果。"""
    ...
```

## 控制返回大小

工具结果会进入 Context。搜索、日志、数据库工具应支持：

- `limit` 与 `cursor`，而不是一次返回全部；
- `fields` 选择字段；
- 时间、状态、租户等服务端过滤；
- 摘要与原始结果 ID；
- 明确 `truncated=true`；
- 二次读取单条详情的工具。

## MCP 解决什么，不解决什么

Model Context Protocol（MCP）统一客户端与外部服务器之间的能力发现和调用，核心 primitive 包括 tools、resources 与 prompts。它解决接口协议与连接问题，但不会自动解决：

- 工具是否应该暴露给当前用户；
- 模型能否正确选工具；
- 业务写入是否幂等；
- 工具结果是否可信；
- token 预算、审批、审计和回滚。

## 工具评测

至少分别统计：

- tool selection accuracy：该用时是否调用、不该用时是否克制；
- argument accuracy：字段、单位、ID、时间范围是否正确；
- execution success：上游是否成功；
- task success：工具成功后任务是否真正完成；
- recovery rate：超时、空结果、权限拒绝后是否正确处理；
- side-effect safety：是否产生重复或越权写入；
- token/latency：定义和结果给系统增加多少成本。

HTTP 200 只代表接口调用完成，不代表 Agent 选对了工具或解决了任务。

## 参考资料

- [Anthropic：Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Model Context Protocol：Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [OpenAI 官方文档：Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk)
- [OpenAI API：Function calling](https://developers.openai.com/api/docs/guides/function-calling)
