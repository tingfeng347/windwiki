---
description: 区分任务状态、短期记忆、长期记忆与 RAG，说明写入、检索、压缩、权限和遗忘策略。
---

# Memory、RAG 与外部知识

Memory 解决“系统要保留什么”，RAG 解决“从外部知识中找什么”，Context Engineering 决定“这一轮把哪些结果交给模型”。

## 四类容易混淆的数据

| 数据 | 生命周期 | 示例 | 推荐存储 |
| --- | --- | --- | --- |
| 运行状态 State | 一次任务 | 当前计划、完成步骤、重试次数 | checkpoint / workflow state |
| 短期记忆 | 一个线程或会话 | 对话摘要、未解决问题 | thread checkpoint |
| 长期记忆 | 跨线程 | 用户偏好、稳定事实、成功经验 | store / database / vector index |
| 外部知识 | 多用户共享或按权限共享 | 产品文档、政策、代码库 | RAG 索引与原始文档库 |

状态不是记忆的同义词。`current_step=3` 是执行状态；“用户偏好中文回答”才可能是长期记忆。检索到的网页也不是自动可信的长期记忆。

## 完整 Memory 生命周期

```mermaid
flowchart LR
    E[事件/对话/工具结果] --> X[抽取候选记忆]
    X --> V[验证与去重]
    V --> W[写入并记录来源/权限/有效期]
    W --> R[按当前任务检索]
    R --> S[相关性、可信度与权限过滤]
    S --> C[注入本轮 Context]
    C --> F[使用反馈]
    F --> U[更新、合并或遗忘]
    U --> W
```

关键不是“存”，而是三条独立策略：

- 写入策略：什么值得记、可信度多高、谁可见、何时过期；
- 想起策略：用关键词、结构化过滤还是向量检索；
- 注入策略：返回原文、摘要、结构化字段还是证据指针。

## RAG 与 Memory 的区别

RAG 的主索引通常来自共享、版本化知识语料；Memory 更常来自某个用户、任务或 Agent 的经历。两者都可能使用向量数据库，但数据治理不同：

- 用户记忆必须有租户隔离、删除与纠错能力；
- 知识库需要文档版本、权限继承、引用和增量索引；
- 经验记忆要防止把一次失败或模型幻觉固化成“事实”；
- 检索结果必须经过重排和证据充足性判断。

完整的文档解析、分块、Embedding、混合检索、Rerank、GraphRAG 和评估见 [RAG 专题](../rag/rag.md)。

## 一个可运行的 SQLite 长期记忆

下面示例只演示结构化写入、租户隔离、过期和关键词检索，不是语义向量检索。Python 3.10+ 可直接运行。

```python
import sqlite3
from datetime import datetime, timedelta, timezone


db = sqlite3.connect(":memory:")
db.row_factory = sqlite3.Row
db.execute("""
CREATE TABLE memory (
    id INTEGER PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    source_id TEXT NOT NULL,
    confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
    expires_at TEXT,
    UNIQUE(tenant_id, kind, source_id)
)
""")


def remember(tenant_id: str, kind: str, content: str,
             source_id: str, confidence: float, ttl_days: int | None = None) -> None:
    expires_at = None
    if ttl_days is not None:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=ttl_days)).isoformat()
    db.execute(
        """INSERT INTO memory
           (tenant_id, kind, content, source_id, confidence, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(tenant_id, kind, source_id) DO UPDATE SET
             content=excluded.content,
             confidence=excluded.confidence,
             expires_at=excluded.expires_at""",
        (tenant_id, kind, content, source_id, confidence, expires_at),
    )
    db.commit()


def recall(tenant_id: str, keyword: str, limit: int = 5) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    rows = db.execute(
        """SELECT kind, content, source_id, confidence
           FROM memory
           WHERE tenant_id = ?
             AND content LIKE ?
             AND (expires_at IS NULL OR expires_at > ?)
           ORDER BY confidence DESC
           LIMIT ?""",
        (tenant_id, f"%{keyword}%", now, limit),
    ).fetchall()
    return [dict(row) for row in rows]


remember("tenant-a", "preference", "用户偏好中文技术说明", "profile:42", 0.95)
remember("tenant-a", "task", "本周正在迁移支付接口", "task:pay-v2", 0.80, ttl_days=7)
remember("tenant-b", "preference", "用户偏好英文", "profile:9", 0.99)

print(recall("tenant-a", "偏好"))  # 不会返回 tenant-b 的内容
```

生产版本还需要加密、访问控制、审计、软删除/彻底删除、语义检索、冲突解决和可解释的来源追踪。

## 什么时候写入长期记忆

适合写入：

- 用户明确要求保存的稳定偏好；
- 经业务系统验证的事实；
- 可复现、经过评估的任务经验；
- 对未来任务确有价值且有清晰来源的信息。

不应直接写入：

- 模型未经验证的推测；
- 密码、密钥、完整支付信息；
- 一次对话中的短期情绪或偶然表述；
- 没有用户/租户边界的数据；
- 无法纠错、删除或解释来源的自动摘要。

## 压缩与遗忘

长期运行系统必须会遗忘：

- TTL：临时任务、一次性授权自动过期；
- 合并：多条重复偏好合成一条带版本的记录；
- 冲突：保留新旧值与证据，让确定性规则决定生效版本；
- 降权：长期未命中、低质量记忆降低召回优先级；
- 删除：支持用户请求、法规要求和错误纠正。

## Agentic RAG

普通 RAG 按固定流程检索；Agentic RAG 把部分决定交给 Agent：

1. 是否需要检索；
2. 查询如何改写或拆分；
3. 使用哪个数据源；
4. 当前证据是否足够；
5. 是否重新检索、换源或转人工。

自主性增加后，必须给检索轮数、来源范围、成本和停止条件设上限，并记录每次查询与选中证据。

## 参考资料

- [RAG 原始论文](https://arxiv.org/abs/2005.11401)
- [LangGraph：Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [LangGraph：Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

