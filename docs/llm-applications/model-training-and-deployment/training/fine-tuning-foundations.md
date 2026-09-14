---
description: 讲清预训练、SFT、偏好优化、数据格式、评测集和嵌入模型微调，建立可靠的大模型微调工程基础。
---

# 微调基础与数据工程

微调的本质不是给模型“上传资料”，而是用梯度更新参数，让某类输入更可能产生期望输出。决定效果上限的往往不是训练框架，而是任务定义、数据协议和评测闭环。

## 从预训练到后训练

大模型训练通常分为几层：

| 阶段 | 数据与目标 | 得到什么 |
| --- | --- | --- |
| 预训练（Pre-training） | 海量无标注文本，预测下一个 token | 语言、世界知识和基础能力 |
| 继续预训练（CPT/DAPT） | 特定领域的无标注文本，仍做语言建模 | 领域术语和分布适应 |
| 监督微调（SFT） | 指令—回答或多轮对话，最小化目标回答的交叉熵 | 指令遵循、格式和任务行为 |
| 偏好优化（DPO 等） | 同一提示下的 chosen / rejected 回答 | 更倾向人类或规则偏好的回答 |
| 强化学习（GRPO 等） | 模型采样多个结果，由奖励函数打分 | 在可验证目标上继续探索策略 |

SFT 的损失仍是 token 级交叉熵。若输入为 $x$，目标回答为 $y=(y_1,\ldots,y_T)$：

$$
\mathcal{L}_{\text{SFT}}
=-\sum_{t=1}^{T}\log p_\theta(y_t\mid x,y_{<t})
$$

工程重点是正确构造 $x$ 和 loss mask：通常不应让 system/user 文本也参与回答损失，否则模型是在学习复述输入，而不是生成 assistant 的答案。

## Prompt、RAG 还是微调

`all-in-rag` 给出的决策顺序很实用：先验证 Prompt，再做 RAG，最后才考虑微调。可以进一步具体化：

- **Prompt**：任务可以用少量规则和示例表达，模型已有所需知识。
- **RAG**：缺的是私有、动态、可引用的知识，答案必须追溯证据。
- **微调**：缺的是稳定行为，例如固定协议、语气、领域表达或工具选择习惯。
- **RAG + 微调**：既要检索动态事实，又要模型稳定利用检索结果。

不要用 SFT 强行修复所有幻觉，也不要期待 RAG 自动教会模型复杂输出协议。先把失败样本分成“没找到知识”“不会使用知识”“行为不稳定”“推理错误”，再选择手段。

## 数据协议先于数据数量

### 常见格式

指令式数据：

```json
{"instruction":"解释 LoRA 的作用","input":"面向刚入门的工程师","output":"LoRA 通过训练低秩增量矩阵……"}
```

推荐保存为与推理一致的对话式格式：

```json
{
  "messages": [
    {"role": "system", "content": "你是严谨的机器学习工程助手。"},
    {"role": "user", "content": "解释 LoRA 的作用。"},
    {"role": "assistant", "content": "LoRA 冻结原模型权重，只训练低秩增量矩阵……"}
  ]
}
```

训练时必须使用基座模型自己的 chat template。角色标记、结束 token 与线上推理不一致，会造成训练 loss 正常、实际聊天却不断续写或角色错乱。

### 一条高质量样本应满足

- 指令明确，答案真的解决了问题，而非只“看起来专业”；
- 输出协议唯一且可解析，字段名、枚举值和单位稳定；
- 事实可核验，不把教师模型幻觉复制给学生；
- 难例、边界例、拒答例和正常例分布与线上接近；
- 长度可控，统计截断率，而不是静默截去答案尾部；
- 不含测试集、隐私、密钥、重复模板和近重复样本。

### 清洗与切分顺序

```text
原始采集
  → 规范化角色/字段
  → 规则校验与可执行验证
  → 精确去重、语义近重复去重
  → 按用户/任务/时间分组切分
  → 冻结测试集
  → 只用训练集做增强和合成
```

先随机切分、再去重是常见错误：近重复样本会同时进入训练集和测试集，离线分数虚高。对同一用户、同一文档或同一题型的变体，应按组切分。

## 建立不可污染的评测集

训练之前先运行基座模型，保存每条样本的输入、输出、评分和失败原因。评测至少包含三层：

1. **确定性规则**：JSON 能否解析、必填字段、预算、长度、工具参数、禁用词。
2. **任务指标**：准确率、F1、执行成功率、pass@k、约束通过率。
3. **人工或模型评审**：事实性、帮助度、风格、安全；LLM Judge 要固定模型与提示词，并用人工样本校准。

除了平均分，还要按长短输入、语言、任务类型、难度、数据来源做切片。一个模型可能平均提升，却在关键高风险切片严重退化。

## 全参数微调与 PEFT

| 方法 | 更新内容 | 显存/存储 | 适合场景 |
| --- | --- | --- | --- |
| 全参数微调 | 所有参数 | 最高；要保存完整模型 | 数据充足、预算足、任务与基座差异大 |
| LoRA | 低秩 Adapter | 低；每个任务只保存 Adapter | 通用首选，迭代快、便于多任务 |
| QLoRA | 4-bit 冻结基座 + LoRA | 更低 | 单卡/小显存训练较大模型 |
| Prompt/Prefix Tuning | 可训练虚拟 token/前缀 | 很低 | 任务较简单或需极小产物 |

参数高效不等于一定更好，全参数也不等于一定更强。`hello-agents` 的旅行助手实验中，全参 SFT 花费更多硬件与存储，但关键预算约束没有同步改善；真正决定结果的是数据、规则和评测闭环。

## SFT 训练最小检查表

训练前：

- 检查 tokenizer/chat template、PAD/EOS、最大长度与 truncation side；
- 随机打印 tokenized 样本，确认 assistant 区域才计算 loss；
- 在几十到几百条数据上做过拟合冒烟测试；
- 计算有效 batch：`per_device_batch × GPU 数 × gradient_accumulation`；
- 记录可训练参数量，确认没有意外解冻基座。

训练中：

- 同时看训练和验证 loss，不用单个 loss 判断任务成功；
- 监控梯度范数、学习率、tokens/s、峰值显存、NaN/Inf；
- 保存多个 checkpoint，并保留优化器/调度器状态以便真正续训；
- 定期生成固定样本，及早发现格式坍塌和灾难性遗忘。

训练后：

- 对每个 checkpoint 跑同一冻结评测，而不是默认最后一步最好；
- 与基座、Prompt/RAG 基线比较效果、延迟、显存和维护成本；
- 用从未参与调参的测试集只做最后验收；
- 保存模型卡：数据版本、许可、限制、已知失败和部署方式。

## 偏好优化：DPO 在优化什么

DPO 的每条数据含 prompt、chosen 与 rejected。它不要求单独训练奖励模型，而是让策略模型相对参考模型提高 chosen 的概率、降低 rejected 的概率。直观形式是：

$$
\mathcal{L}_{\text{DPO}}
=-\log \sigma\left(\beta\left[
\log\frac{\pi_\theta(y_w|x)}{\pi_{\text{ref}}(y_w|x)}
-\log\frac{\pi_\theta(y_l|x)}{\pi_{\text{ref}}(y_l|x)}
\right]\right)
$$

其中 $y_w$ 是 chosen，$y_l$ 是 rejected，$\beta$ 控制偏好强度与偏离参考模型的程度。

DPO 最怕“伪偏好对”：chosen 和 rejected 的质量差异不清晰，或区别只是长度/格式等捷径。应让二者在同一个 prompt、相同基本约束下形成真实质量差，并保存产生原因。

一个与当前 TRL API 对齐的最小示例：

```python
from datasets import Dataset
from peft import LoraConfig
from trl import DPOConfig, DPOTrainer

dataset = Dataset.from_list([
    {
        "prompt": [{"role": "user", "content": "用一句话解释梯度累积。"}],
        "chosen": [{"role": "assistant", "content": "它用多次小批次反向传播累积梯度，再统一更新，从而模拟更大的有效批次。"}],
        "rejected": [{"role": "assistant", "content": "它就是把 batch size 调大。"}],
    }
])

trainer = DPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",
    args=DPOConfig(
        output_dir="outputs/dpo-adapter",
        num_train_epochs=1,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=5e-6,
        logging_steps=1,
        report_to="none",
    ),
    train_dataset=dataset,
    peft_config=LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules="all-linear",
        task_type="CAUSAL_LM",
    ),
)
trainer.train()
trainer.save_model()
```

实际项目要提供数量充分的训练/验证数据，并先用少量样本跑通格式；示例只证明 API 路径，不代表这一条数据能训练出有效模型。

## GRPO：只在奖励可靠时使用

GRPO 对每个 prompt 采样一组回答，用组内相对奖励更新策略，省去独立 value model，常用于数学、代码和规则可验证任务。关键不是“上 RL”，而是奖励函数：

- 奖励必须和产品目标一致，避免模型钻规则漏洞；
- 同时记录正确性、格式、长度、安全等奖励分量；
- 对高奖励样本人工抽检，检查 reward hacking；
- SFT 基线还不稳定时，不应指望 RL 凭空补齐格式和知识。

## 嵌入模型的领域微调

`all-in-rag` 补充了生成模型之外的另一条路线：RAG 召回差时，可以微调 Embedding。常见训练数据是：

- 正样本对：`(query, relevant passage)`；
- 带负样本：`(query, positive, negative)`；
- 难负样本：词面相似但语义不相关，通常来自 BM25 或当前向量模型的高排误召回。

对比学习希望 query 与正例更近、与负例更远。三元组损失可写为：

$$
\mathcal{L}=\max(0, d(q,p)-d(q,n)+m)
$$

不要只看训练 loss；用独立查询集比较 Recall@K、MRR、nDCG，并验证不同文档域和长尾问题。若真正问题是切块、元数据过滤或候选池太小，微调 Embedding 也不会自动修复。

## 常见失败

- **只增大数据量**：大量同质合成样本会放大教师偏差，先提高可验证性与覆盖度。
- **把 Adapter warm start 当续训**：加载上一步 Adapter 只继承权重；要无缝续训还需 optimizer、scheduler、global step 和 RNG 状态。
- **最后 checkpoint 崇拜**：后期可能过拟合或忘掉约束，必须 sweep checkpoint。
- **训练与推理模板不一致**：这是最隐蔽、最常见的“训练成功但不会聊天”。
- **只报告平均分**：平均分会掩盖关键约束退化；保留逐样本结果和错误类型。

## 参考资料

- [Hugging Face TRL：SFT Trainer](https://huggingface.co/docs/trl/main/sft_trainer)
- [Hugging Face TRL：DPO Trainer](https://huggingface.co/docs/trl/main/dpo_trainer)
- [Hugging Face TRL：GRPO Trainer](https://huggingface.co/docs/trl/main/grpo_trainer)
- [DPO 原始论文](https://arxiv.org/abs/2305.18290)
- [QLoRA 原始论文](https://arxiv.org/abs/2305.14314)
- 三个本地仓库：`all-in-rag`、`hello-agents`、`knowledge-center`（本专题提炼时的本地版本）
