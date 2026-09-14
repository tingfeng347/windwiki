---
description: 使用 Unsloth 在单张 GPU 上完成 QLoRA SFT、推理、Adapter/合并模型/GGUF 导出，并处理版本与聊天模板兼容问题。
---

# Unsloth 实战

Unsloth 不是一种新的微调算法，而是针对 Transformer 训练和推理路径做优化的框架。它通常把 4-bit 基座、LoRA、梯度检查点和 TRL 组合起来，让单卡实验更快、更省显存。

## 什么时候选 Unsloth

适合：

- 单张 NVIDIA GPU 上做 LoRA/QLoRA 快速实验；
- 需要 SFT、DPO、GRPO 等 TRL 训练器；
- 希望便捷导出 Adapter、合并权重或 GGUF；
- 模型已在 Unsloth 官方支持列表或官方模型卡中。

不应把它当成：

- 不看显存就能训练任意规模模型的“魔法”；
- DeepSpeed/FSDP 的完全替代品；
- 自动解决数据质量、chat template 和评测问题的工具；
- 所有模型都能套同一组 `target_modules` 的统一包装层。

## 环境安装

训练生态仍以 Linux/WSL2 + NVIDIA CUDA 最顺畅。先安装与驱动匹配的 PyTorch，再按官方当前建议安装：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -U unsloth unsloth_zoo
```

特殊 PyTorch/CUDA 组合应使用 Unsloth 官方安装选择器，不要从旧 notebook 复制固定的 `cu121-torch240` 一类 extra。完成首次冒烟训练后再锁版本：

```bash
python -m pip freeze > requirements-lock.txt
```

如果项目还要同时运行 LLaMA-Factory、vLLM、FlashAttention，最稳妥的是分别建立训练环境与服务环境。三个工具对 PyTorch、CUDA、Transformers 的版本窗口可能不同；不要靠关闭版本检查强行把冲突依赖塞进一个环境。

## 最小 QLoRA SFT

以下示例使用官方量化后的 `DeepSeek-R1-Distill-Qwen-1.5B`，能真实运行。两条样本只用于验证 API 和显存路径；正式训练必须替换为经过切分、清洗和评测的数据集。

保存为 `train_unsloth.py`：

```python
import torch
from datasets import Dataset
from trl import SFTConfig, SFTTrainer
from unsloth import FastLanguageModel

MAX_LENGTH = 1024
MODEL_ID = "unsloth/DeepSeek-R1-Distill-Qwen-1.5B-bnb-4bit"

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_ID,
    max_seq_length=MAX_LENGTH,
    dtype=None,          # 自动选择；也可显式传 torch.bfloat16
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

dataset = Dataset.from_list([
    {
        "text": "### 问题：什么是 QLoRA？\n"
                "### 回答：QLoRA 冻结 4-bit 基础模型，只训练 LoRA 适配器。"
    },
    {
        "text": "### 问题：为什么使用梯度累积？\n"
                "### 回答：它用多个小批次模拟更大的有效批量。"
    },
])

trainer = SFTTrainer(
    model=model,
    processing_class=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        output_dir="outputs/unsloth-demo",
        dataset_text_field="text",
        max_length=MAX_LENGTH,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        max_steps=20,
        logging_steps=1,
        report_to="none",
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
    ),
)

trainer.train()
model.save_pretrained("outputs/unsloth-demo/adapter")
tokenizer.save_pretrained("outputs/unsloth-demo/adapter")
```

运行：

```bash
python train_unsloth.py
```

这里最容易被旧教程误导的是两个同名层级：

- `FastLanguageModel.from_pretrained(max_seq_length=...)` 仍用 Unsloth 的参数名；
- 当前 TRL 用 `SFTConfig(max_length=...)`；
- 当前 `SFTTrainer` 用 `processing_class=tokenizer`。

不能把项目里的 `max_seq_length` 全局替换成 `max_length`。

## 用模型自身的聊天模板

真实对话训练建议保存 `messages`，再用 tokenizer 的模板统一渲染。若当前 TRL/模板组合不能直接对 conversational dataset 生成正确 mask，可以预处理出 `text`：

```python
from datasets import Dataset

raw = Dataset.from_list([
    {
        "messages": [
            {"role": "system", "content": "你是可靠的训练助手。"},
            {"role": "user", "content": "解释有效 batch。"},
            {"role": "assistant", "content": "有效 batch 等于单卡批量、数据并行卡数和梯度累积步数的乘积。"},
        ]
    }
])

def render(example):
    return {
        "text": tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
    }

dataset = raw.map(render, remove_columns=raw.column_names)
print(dataset[0]["text"])
```

训练前一定打印渲染结果和 token ID，确认 system/user/assistant 边界、EOS 与推理时一致。`assistant_only_loss=True` 依赖模板提供 assistant token mask；不满足条件时不要盲开。

## 推理冒烟测试

训练完成后先在同一环境中比较基座与 Adapter：

```python
import torch
from unsloth import FastLanguageModel

FastLanguageModel.for_inference(model)
messages = [{"role": "user", "content": "用一句话解释 QLoRA。"}]
inputs = tokenizer.apply_chat_template(
    messages,
    tokenize=True,
    add_generation_prompt=True,
    return_tensors="pt",
).to(model.device)

with torch.inference_mode():
    output = model.generate(
        input_ids=inputs,
        max_new_tokens=128,
        do_sample=False,
        use_cache=True,
    )

print(tokenizer.decode(output[0, inputs.shape[-1]:], skip_special_tokens=True))
```

固定一批回归提示，至少检查：格式、停止位置、长输入、拒答、基础能力和训练目标。只看到 loss 下降不能证明模型可用。

## 保存三种产物

### Adapter-only

```python
model.save_pretrained("outputs/my-adapter")
tokenizer.save_pretrained("outputs/my-adapter")
```

最小、便于切换，但部署端必须能访问同一基座。

### 合并后的 Hugging Face 模型

```python
model.save_pretrained_merged(
    "outputs/my-merged-16bit",
    tokenizer,
    save_method="merged_16bit",
)
```

适合不直接支持 Adapter 的 Transformers/vLLM 流程，体积接近完整模型。大模型合并需要额外 CPU RAM 和磁盘空间。

### GGUF

```python
model.save_pretrained_gguf(
    "outputs/my-gguf",
    tokenizer,
    quantization_method="q4_k_m",
)
```

GGUF 面向 llama.cpp/Ollama 等生态。导出成功不等于表现一致，必须在目标运行时用同一 chat template、停止 token 和采样参数做回归。

## 超参数起点

| 参数 | 可作为起点 | 说明 |
| --- | --- | --- |
| `r` | 16 或 32 | 容量更大也更占显存，不保证单调增益 |
| `lora_alpha` | `r` 或 `2r` | 与 rank 一起影响更新缩放 |
| `lora_dropout` | 0～0.05 | 0 可走更多优化路径；过拟合时再比较非零值 |
| target modules | attention + MLP 七类线性层 | 必须匹配实际架构 |
| LoRA 学习率 | `2e-4` 附近起试 | 仍需验证集和梯度范数判断 |
| epoch | 1～3 | 小数据、重复数据更易过拟合 |
| 有效 batch | 4～16 个序列起步 | 等于 micro-batch × 累积 × DP world size |

这是实验起点，不是推荐答案。`hello-agents` 的经验也说明，不同阶段应降低学习率：主数据学行为，补丁数据修错误，偏好阶段只做小幅移动。每次只改变少量变量，并保存逐 checkpoint 评测。

## DeepSeek 模型边界

名称相似不代表硬件需求相同：

| 模型 | 实际规模/架构 | 使用建议 |
| --- | --- | --- |
| R1-Distill-Qwen 1.5B/7B/14B/32B | Qwen 架构蒸馏模型 | 可按规模用 Transformers/PEFT/Unsloth |
| R1-Distill-Llama 8B/70B | Llama 架构蒸馏模型 | 同时遵守相应 Llama 许可证 |
| DeepSeek-R1 / R1-Zero | 671B 总参数、每 token 约 37B 激活 | 完整模型面向多卡/多机，不是“37B 单卡模型” |
| DeepSeek-V3 | 671B MoE、原始权重含 FP8 | Transformers 已原生支持，但通用实现不等于高效生产服务 |

完整 R1/V3 服务要按 vLLM/SGLang 的最新 recipe 规划张量并行、专家并行和硬件；不要把小模型命令只换一个模型名就用于 671B。

## 常见问题

- **导出后乱码、重复、不停止**：第一优先核对 chat template、BOS/EOS、generation config，而不是重新训练。
- **安装成功但训练时报 CUDA 算子错误**：记录驱动、CUDA、PyTorch 和 GPU 架构，按官方兼容矩阵重建隔离环境。
- **显存没有预期低**：检查是否真的加载 4-bit 模型、序列长度、eval generate 和 KV/cache 设置。
- **更新后旧 notebook 报错**：区分 Unsloth loader 与 TRL Trainer 的 API；以当前模型卡和官方 notebook 为准。
- **Adapter 换引擎效果下降**：确认加载了正确基座 revision、tokenizer、模板和 adapter；再比较数值精度。
- **以为框架开源就可商用**：还要分别检查基座、数据集和衍生模型许可证。

## 参考资料

- [Unsloth：Pip 安装](https://docs.unsloth.ai/get-started/installing-%2B-updating/pip-install)
- [Unsloth：LoRA 参数指南](https://docs.unsloth.ai/basics/lora-parameters-encyclopedia)
- [Unsloth：保存与排错](https://docs.unsloth.ai/basics/saving-and-using-models/troubleshooting)
- [Unsloth 官方 notebooks](https://github.com/unslothai/notebooks)
- [Unsloth DeepSeek-R1-Distill-Qwen-1.5B 模型卡](https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-1.5B-bnb-4bit)
- [DeepSeek-R1 官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)
- [Transformers：DeepSeek-V3](https://huggingface.co/docs/transformers/model_doc/deepseek_v3)
