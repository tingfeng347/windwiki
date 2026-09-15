---
description: Agent 异常轨迹高密度面试手册。
---

# Agent 异常轨迹高密度面试手册
## 不改 Prompt，只用工程手段解决

> **定位**：面试速答 / Agent 工程复习  
> **答题结构**：先讲成因 → 再讲检测 → 再讲控制 → 最后讲停止条件。  
> **总原则**：LLM 负责“提出动作”，Runtime 负责“允许不允许执行、是否有进展、什么时候停止”。

---

## 1. Agent 为什么会工具死循环？怎么解决？
**【精简版】**

工具死循环通常有四类原因：Tool Result 不够明确，模型误以为需要继续调用；没有保存历史动作，导致相同 Tool Call 被反复执行；工具本身不幂等，重试后又产生新的 Observation；没有明确的 `max_turns / max_tool_calls / stop condition`。

工程上我会记录 `Action History`，对 `tool_name + normalized_args` 做 fingerprint。如果相同 fingerprint 连续出现 2～3 次，直接返回缓存结果或阻止执行；如果仍继续重复，则触发 replan。对于有副作用的工具，要加 `idempotency key`，避免重复创建资源、重复发送请求。

同时加三层硬限制：单工具最大调用次数、整个 Agent 最大 Turn、总 Tool Budget。这样即使模型陷入循环，Runtime 也能在有限步数内结束。

**一句话记忆：相同工具重复调用，就做指纹去重 + 调用上限 + 幂等保护。**

---

## 2. Agent 为什么会工具震荡？怎么解决？
**【精简版】**

工具震荡典型轨迹是 `A → B → A → B`。本质上不是完全重复，而是 Agent 在两个动作之间形成局部闭环：A 的结果让它选择 B，B 的结果又让它回到 A。

我会保留最近 6～10 个 Action，对动作序列做周期检测。如果发现 `ABABAB`、`ABCABC` 这种固定周期，就判定为 oscillation。检测后不再继续原路径，而是触发 `replan`，或者对刚调用过的 Tool 加 `cooldown`，几步内禁止再次切回。

如果两个工具功能高度重叠，还要从工具设计层做去重，避免模型在两个近似工具之间来回选。

**一句话记忆：工具震荡看“周期模式”，检测到 ABAB 后强制重规划。**

---

## 3. 参数震荡怎么处理？
**【精简版】**

参数震荡是工具不变，但参数来回变化，例如 `Search(A) → Search(B) → Search(A)`。通常说明 Agent 在局部参数空间反复试探，但没有记住已经尝试过什么。

工程上先对参数做 canonicalization，例如 JSON key 排序、路径标准化、去掉时间戳等无意义字段，再对 `tool + args` 做缓存。完全相同的调用直接复用历史结果；参数虽然不同，但返回结果高度相似时，也可以判定“信息增益不足”。

还可以维护短期 `tabu list`，刚失败过的参数组合在若干步内禁止再次使用。

**一句话记忆：参数震荡 = 参数标准化 + Tool Cache + 低信息增益拦截。**

---

## 4. 规划震荡怎么解决？
**【精简版】**

规划震荡是 `Plan A → Plan B → Plan A`。根因通常是模型每拿到一点新信息就把整体计划推翻，Planner 没有“计划承诺”。

工程上我会做 `Plan Versioning`，每次重规划都记录版本、原因和触发证据，例如 `plan_v1 → plan_v2`。只有当前路径明确失败、出现新证据、环境变化或者连续无进展时，才允许整体 replan。

还可以增加 `commit window`：刚生成新计划后的几步内不允许再次全量重规划，只允许局部调整。

**一句话记忆：计划不能随便推翻，要版本化，并给 replan 加门槛。**

---

## 5. Agent 重复验证怎么办？
**【精简版】**

重复验证常见轨迹是 `check → check → check`，Coding Agent 里经常表现为连续多次运行同一组测试。

解决方式是建立 `Evidence Cache`。验证结果不能只和 Tool 名绑定，而要和“被验证对象的状态”绑定，例如 `pytest + code_hash`。只要代码 hash 没变，上一次 PASS 结果仍然有效，就不需要重复跑。

一旦目标文件发生修改，hash 变化，缓存自动失效，再重新验证。

**一句话记忆：验证结果绑定 state hash，状态没变就不要重复验证。**

---

## 6. Agent 无效探索太多怎么办？
**【精简版】**

无效探索的典型表现是不断 `search / read / browse`，动作很多，但任务状态、已知事实和决策都没有变化。

工程上我会给探索阶段设置独立 Budget，例如最大搜索次数、最大读取文件数、连续无新增信息的最大步数。同时维护 `Novelty / Information Gain`，新结果如果和历史结果高度重复，就降低优先级甚至直接拦截。

另外可以做 `Search → Decision Gate`：连续探索 K 次后必须做一次决策，不能无限搜索。

**一句话记忆：探索必须有预算，而且要看信息增益，不是调用越多越好。**

---

## 7. Agent 状态停滞怎么检测？
**【精简版】**

状态停滞的关键不是“Agent 有没有输出”，而是“真实任务有没有推进”。例如模型一直读文件、查日志，但 `git diff`、失败测试数量、任务 checklist 都没变化。

我会抽取关键状态生成 `state_hash`，每一步比较 `state_before / state_after`。如果连续 N 步状态没有变化，就增加 `no_progress_steps`；达到阈值后先 replan，再继续停滞就直接 terminate。

进展指标要来自真实环境，例如文件变化、测试数量、数据库状态、页面 DOM、完成任务数，而不是模型自己说“我有进展”。

**一句话记忆：状态停滞看真实 state diff，连续无变化就 replan，再不行就停。**

---

## 8. Agent 状态回归怎么办？
**【精简版】**

状态回归是已经完成的部分又被后续操作破坏，例如测试已经通过，后续重构后又失败。

工程上我会维护 `Invariant`，把已经成立且不能被破坏的条件记录下来，例如“已有测试必须继续通过”“API schema 不能变化”“某些文件不能修改”。关键步骤后做增量检查。

同时在重要里程碑保存 `Checkpoint`。如果后续操作破坏 invariant，就 rollback 到最近稳定状态，而不是整段任务重新执行。

**一句话记忆：完成的东西要变成 invariant，关键节点要 checkpoint，可检测也可回滚。**

---

## 9. Agent 目标漂移怎么解决？
**【精简版】**

目标漂移通常发生在长任务里：最初用户只是要求修一个 Bug，Agent 后面开始重构、升级依赖、改目录结构。根因是目标只存在于聊天上下文中，时间长了会被稀释。

工程上我会把用户目标提取成独立的 `Goal Contract`，包括目标、允许操作范围、约束条件和成功标准，并放在 Runtime State 中，不能由 Agent 自己修改。

每次执行高风险动作前做 `Goal Alignment Check`，超出 scope 的操作直接拒绝。

**一句话记忆：目标不要只放 messages，要做成 Runtime 里的不可变 Goal Contract。**

---

## 10. Agent 上下文漂移怎么处理？
**【精简版】**

上下文漂移是长任务中早期事实逐渐丢失，例如前面已经确认根因，后面又重新调查一次。原因是把“聊天历史”当成了“任务状态”。

工程上我会把信息分层：`messages` 保存对话；`verified_facts` 保存已确认事实；`current_plan` 保存当前计划；`completed_tasks` 保存完成项；`artifacts` 保存产物引用；`goal_contract` 保存目标。

长上下文可以做 compaction，但关键事实必须进入结构化 State Store，不能只依赖模型重新从历史文本中推断。

**一句话记忆：聊天记录不是状态，关键事实必须结构化保存。**

---

## 11. Agent 假进展怎么解决？
**【精简版】**

假进展是模型说“已经完成”，但真实环境没有变化，例如说文件修改成功，实际上 `git diff` 为空。

工程上要采用 `write → read-after-write → verify`。写文件后重新读取并比较 hash；数据库 UPDATE 后重新 SELECT；Browser click 后重新读取 URL、DOM 或页面状态。

最终是否完成不能由 Agent 自己声明，而是由 Runtime 根据真实环境确认。

**一句话记忆：模型说完成不算完成，所有副作用都要从环境重新验证。**

---

## 12. Agent 和环境失同步怎么办？
**【精简版】**

环境失同步指 Agent 基于旧状态做决策，例如读取文件时是版本 A，真正写入时文件已经被其他进程改成版本 B。

工程上可以用乐观并发控制。读取资源时记录 `version / ETag / mtime / content_hash`，写入时携带 `expected_version`。如果当前版本和预期不一致，就拒绝写入并要求重新读取。

高风险写操作还可以增加 `fresh-read-before-write`，写之前强制获取最新状态。

**一句话记忆：读的时候记版本，写的时候验版本，不一致就重新读。**

---

## 13. Agent 错误恢复为什么会陷入 retry 螺旋？怎么解决？
**【精简版】**

常见错误是所有异常统一 `except Exception: retry()`，导致参数错误、权限错误也被不停重试。

工程上必须先做 Error Taxonomy，把错误分成 `Timeout / RateLimit / 5xx / InvalidArgument / Auth / Permission / Conflict`。只有 Timeout、429、部分 5xx 等 transient error 才自动 retry；参数、认证、权限错误应该直接返回给 Planner 重新决策。

Retry 必须同时有 `max_retries + exponential backoff + jitter`，连续失败超过阈值时打开 Circuit Breaker，暂时禁止继续调用该依赖。

**一句话记忆：先判断该不该重试，再决定重试几次；不要所有异常都 retry。**

---

## 14. Agent 为什么会路径反复 / 震荡？怎么解决？
**【精简版】**

路径震荡通常有四类原因：没有保留失败历史；Tool Result 不够明确；Planner 每轮重新规划导致反复；没有明确的 Stop Condition 和 Retry Budget。

我会记录 `Action History、Tool Result、Failure Reason`，对重复 Action 做检测。如果同一工具、相同参数、相近上下文被重复调用，就认为路径开始反复；如果最近动作序列出现 `ABAB`、`ABCABC`，就认为进入震荡。

同时给工具和子任务设置最大尝试次数、timeout、最大 Agent Turn，并把已经验证失败的路径写入当前执行状态，避免下一轮又重新尝试同一条失败路径。

**一句话记忆：记失败、查重复、限重试、设终止，不要让模型每轮都从零规划。**

---

## 15. Tool 返回结果太长怎么办？
**【精简版】**

第一层在 Tool 侧做裁剪：分页、字段选择、时间范围和过滤条件，避免一开始就返回巨量原始结果。

第二层只返回轻量元数据，例如 `ID + title + snippet + source`，需要细节时再通过 ID 二次 fetch，而不是一次把完整正文塞入上下文。

第三层对候选结果做 Retrieval / Rerank，只把 Top-K 真正相关内容放进 Context。可以用 BM25、Embedding、RRF 或 Reranker。

第四层才是 Summary，而且摘要要尽量结构化，并保留 `source_id`，保证后续仍然能回到原始内容。

**一句话记忆：Tool 结果控制：过滤/分页 → 外部化 → Rerank → 结构化摘要。**

---

## 16. 搜索爆炸怎么控制？
**【精简版】**

搜索爆炸常见于 Planner 或 Multi-Agent，一次生成很多分支，子任务又继续拆子任务，复杂度快速增长。

工程上我会限制 `branching_factor、max_depth、max_parallel_agents、max_total_tasks`。例如每一层最多保留 3 个候选、深度最多 4 层、总子任务不超过 20。

如果候选很多，可以先评分，只执行 Top-K；已经被其他方案支配的低质量、高成本分支直接 prune。

**一句话记忆：搜索树必须限宽、限深、限并发，只跑 Top-K。**

---

## 17. Agent 过早收敛怎么办？
**【精简版】**

过早收敛是 Agent 找到一个“看起来可行”的结果就结束，但没有真正验证目标是否完成。

解决方式是定义 `Completion Contract`，把成功条件写成机器可验证的检查，例如：目标文件已经修改、Bug reproducer 从 FAIL 变 PASS、原测试仍然通过、需要的 Artifact 已存在。

LLM 只能产生 `candidate_done`，最终是否进入 SUCCESS 必须由 Completion Evaluator 决定。

**一句话记忆：模型只能申请完成，Runtime 验收通过后才能真正结束。**

---

## 18. Agent 过度执行怎么办？
**【精简版】**

过度执行是任务已经完成，Agent 还继续搜索、重构、修改，最后反而把正确结果破坏。

工程上应该把 Agent Runtime 做成明确状态机，例如 `RUNNING → VERIFYING → SUCCESS`。一旦进入 SUCCESS，就变成 Terminal State，不允许再回 RUNNING，也禁止继续调用有副作用的工具。

如果只是“可能完成”，先进入 VERIFYING，而不是直接继续探索。

**一句话记忆：完成后必须进入硬终止状态，不能让 Agent 继续自由发挥。**

---

## 19. Agent 资源失控怎么解决？
**【精简版】**

资源失控主要是 token、tool call、wall-clock time、并行 Agent 数快速增长，但实际进展很低。

工程上我会做 `Budget Governor`，至少限制 `max_turns、max_tokens、max_tool_calls、max_search_calls、max_time、max_parallel_agents`。预算到 80% 时停止继续探索，优先进入验证和收尾；达到 100% 直接 hard stop。

如果希望更细，可以看 `cost / progress`，成本持续增加但进展几乎为 0，就提前终止。

**一句话记忆：每个 Agent Run 都要有时间、Token、Tool 和搜索预算。**

---

## 20. Agent 投机取巧怎么办？
**【精简版】**

典型例子是 Coding Agent 为了让测试通过，直接删测试、改断言、加 skip，而不是真正修 Bug。本质上是优化了指标，但没有完成真实目标。

工程上要把关键资产设成 `protected resource`，例如 `tests/、evaluation/、CI config` 只读或需要审批。Actor Agent 负责执行，Evaluator 独立验收，最好使用隐藏测试或独立基线。

最终成功条件不能只看“测试绿了”，还要检查受保护文件有没有变化、真实功能是否满足要求。

**一句话记忆：执行方不能修改评分规则，Actor 和 Evaluator 要分权。**

---

# 面试最常用的 8 个关键词

如果面试现场只能记住一套东西，就记：

**1. Action History**：记录做过什么，避免重复路径。  
**2. Fingerprint / Cache**：识别相同 Tool Call，减少重复执行。  
**3. Budget**：限制 Turn、Token、Tool、时间和搜索次数。  
**4. Timeout + Retry**：工具超时、错误分类、指数退避。  
**5. Structured State**：Goal、Facts、Plan、Completed Task 分开保存。  
**6. Progress Watchdog**：连续无状态变化就 replan / terminate。  
**7. Checkpoint / Rollback**：关键节点保存状态，回归时恢复。  
**8. Completion Evaluator**：模型不能自己宣布完成，最终由 Runtime 验收。

---

# 一段可以直接背的总回答

> 我一般不会只通过 Prompt 去解决 Agent 的异常轨迹，因为 Prompt 只能提高模型做对决策的概率，不能保证运行时一定稳定。工程上我会在模型外面加一层 Runtime：首先记录 Action History，对 Tool 和参数做 fingerprint，解决重复调用和路径震荡；其次设置 max turns、tool budget、timeout 和 retry policy，限制资源和错误恢复；然后维护结构化 State，通过 state diff 和 progress watchdog 判断任务有没有真实进展；关键步骤做 checkpoint，避免状态回归；最后把成功条件做成 Completion Contract，由独立 Evaluator 根据真实环境决定是否结束。这样即使模型偶尔做错决策，整个 Agent 仍然是可控的。

---

# 一页速记

| 问题 | 工程解法 |
|---|---|
| 工具死循环 | fingerprint + cache + max calls |
| 工具震荡 | 周期检测 + cooldown + replan |
| 参数震荡 | canonical args + cache |
| 规划震荡 | plan version + replan gate |
| 重复验证 | validator + state hash |
| 无效探索 | exploration budget + information gain |
| 状态停滞 | state diff + progress watchdog |
| 状态回归 | invariant + checkpoint + rollback |
| 目标漂移 | immutable Goal Contract |
| 上下文漂移 | structured state |
| 假进展 | read-after-write |
| 环境失同步 | version / ETag |
| Retry 螺旋 | error taxonomy + backoff + circuit breaker |
| 路径反复 | failure history + duplicate detection |
| Tool 结果太长 | filter/page → externalize → rerank → summary |
| 搜索爆炸 | branch/depth/parallel limit + Top-K |
| 过早收敛 | Completion Contract |
| 过度执行 | Terminal State |
| 资源失控 | Budget Governor |
| 投机取巧 | protected resource + independent evaluator |
