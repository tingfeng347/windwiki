---
description: 从低秩更新、NF4 与双重量化讲到 PEFT + TRL 的完整 LoRA/QLoRA 训练、推理、合并和排错代码。
---

# LoRA 与 QLoRA

LoRA 解决“要训练多少参数”，QLoRA 进一步解决“冻结的基座权重以什么精度驻留”。二者经常一起使用，但不是同一个概念。

## LoRA 的低秩更新

线性层原权重为 $W_0\in\mathbb{R}^{d\times k}$。LoRA 冻结 $W_0$，不学习完整的 $\Delta W$，而是学习两个小矩阵：

$$
h=W_0x+\frac{\alpha}{r}BAx
$$

其中 $A\in\mathbb{R}^{r\times k}$、$B\in\mathbb{R}^{d\times r}$，$r\ll\min(d,k)$。可训练参数从 $dk$ 降为约 $r(d+k)$。

LoRA 带来的直接收益是：优化器状态和梯度显著减少；每个任务只需保存很小的 Adapter；同一个基座可以挂载多套 Adapter。它**不意味着**基座不占显存，也不保证推理天然更快。

### 关键参数

| 参数 | 含义 | 调整影响 |
| --- | --- | --- |
| `r` | 低秩维度 | 越大容量和参数量越高；不是越大必然越好 |
| `lora_alpha` | 缩放系数 | 经典缩放是 $\alpha/r$；要与 `r` 联合比较 |
| `lora_dropout` | Adapter 分支 dropout | 小数据可用于正则；大数据常设 0～0.05 起步 |
| `target_modules` | 注入哪些线性层 | 对效果和参数量影响很大，必须核对模型真实层名 |
| `bias` | 是否训练 bias | 通常 `none`，便于保持 Adapter 轻量 |

`r=8/16/32`、`alpha=2r` 只是常见起点，不是定律。更合理的做法是固定数据和有效 batch，比较多个 rank 的验证集效果、训练时间和 Adapter 大小。

PEFT 还支持 rank-stabilized LoRA：`use_rslora=True` 时缩放改为 $\alpha/\sqrt r$，较大 rank 下可能更稳定；是否采用仍应由本地实验决定。

## QLoRA 多做了什么

QLoRA 的训练路径是：

1. 将**冻结的基座权重**以 4-bit 量化形式加载；
2. 前向/反向时按计算 dtype 反量化参与计算；
3. LoRA 参数本身仍以 BF16/FP16 等可训练精度保存；
4. 优化器只维护 Adapter 的状态。

QLoRA 论文的重要组件包括：

- **NF4**：针对近似正态分布权重设计的 4-bit 数据类型；
- **Double Quantization**：连量化常数也进一步量化；
- **Paged Optimizer**：缓解长序列或梯度检查点造成的显存尖峰。

“4-bit 训练”并不是直接更新 4-bit 权重。bitsandbytes 只支持在量化模型之上训练额外参数；基座仍被冻结。

| 方法 | 基座驻留 | 可训练参数 | 典型用途 |
| --- | --- | --- | --- |
| LoRA | BF16/FP16 | LoRA | 显存较充足、追求更稳定的数值行为 |
| QLoRA | 4-bit NF4 | LoRA（BF16/FP16） | 单卡或显存紧张 |
| 全参微调 | BF16/FP16/FP32 | 全部权重 | 预算充足且任务差异大 |

原论文曾在特定硬件、模型和训练设置下将 65B 模型放入单张 48GB GPU；不能把这个结果外推成任意 65B、任意序列长度都只需 48GB。

## 显存花在哪里

训练显存不只等于模型文件大小：

```text
训练显存 ≈ 权重 + 梯度 + 优化器状态 + 激活值 + 临时通信/算子缓冲
```

- LoRA 主要减少梯度和优化器状态；
- QLoRA 同时压缩冻结基座权重；
- 梯度检查点减少激活值，但增加重计算；
- 减小序列长度往往比减小 batch 更能快速止住 attention 激活的增长；
- 多卡下 `device_map="auto"` 不是分布式训练方案，应该使用 DDP/FSDP/DeepSpeed。

## 可运行的 PEFT + TRL QLoRA

下面使用 `DeepSeek-R1-Distill-Qwen-1.5B`。它是 Qwen2 架构的蒸馏小模型，适合教学；完整 DeepSeek-R1/V3 是 671B MoE，不能套用同一份单卡脚本。

### 环境

推荐 NVIDIA GPU + Linux/WSL2。先按 PyTorch 官网安装与驱动匹配的 PyTorch，再安装训练包：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -U transformers trl peft accelerate datasets bitsandbytes
python -m pip freeze > requirements-lock.txt
```

Windows PowerShell 激活命令是 `.venv\Scripts\Activate.ps1`。bitsandbytes 支持的 CUDA/ROCm/Intel 后端会变化，首次训练前应核对官方兼容表并运行一个小样本冒烟测试。

保存为 `train_qlora.py`：

```python
import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

MODEL_ID = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"

# 演示数据只用于跑通。正式训练必须有独立验证集与足量样本。
dataset = Dataset.from_list([
    {
        "messages": [
            {"role": "user", "content": "用一句话解释梯度累积。"},
            {
                "role": "assistant",
                "content": "梯度累积把多个小批次的梯度相加后再更新参数，用时间换取更低的单步显存。",
            },
        ]
    },
    {
        "messages": [
            {"role": "user", "content": "LoRA 和全参数微调的主要区别是什么？"},
            {
                "role": "assistant",
                "content": "LoRA 冻结基座权重，只训练低秩适配器；全参数微调会更新全部模型参数。",
            },
        ]
    },
])

bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
compute_dtype = torch.bfloat16 if bf16 else torch.float16

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=compute_dtype,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=quant_config,
    device_map={"": 0},  # 单 GPU 示例
)
model.config.use_cache = False
model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    task_type="CAUSAL_LM",
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

args = SFTConfig(
    output_dir="outputs/deepseek-r1-distill-qlora",
    max_length=1024,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=1,
    logging_steps=1,
    save_strategy="epoch",
    gradient_checkpointing=True,
    bf16=bf16,
    fp16=torch.cuda.is_available() and not bf16,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    args=args,
    train_dataset=dataset,
    processing_class=tokenizer,
)
trainer.train()
trainer.save_model("outputs/deepseek-r1-distill-qlora/adapter")
tokenizer.save_pretrained("outputs/deepseek-r1-distill-qlora/adapter")
```

运行：

```bash
python train_qlora.py
```

当前 API 的几个要点：

- TRL 的参数是 `SFTConfig(max_length=...)`，不是旧教程中的 `max_seq_length`；
- `SFTTrainer` 当前用 `processing_class=tokenizer`，不是旧版 `tokenizer=`；
- Transformers v5 文档推荐模型加载使用 `dtype=`，旧环境可能仍使用 `torch_dtype=`；
- conversational dataset 可直接提供 `messages`；
- `assistant_only_loss=True` 只有在 chat template 能生成 assistant mask 时才能打开，不能盲用。

### 改成普通 LoRA

普通 LoRA 只需取消 `BitsAndBytesConfig` 和 `prepare_model_for_kbit_training()`：

```python
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    dtype=torch.bfloat16 if bf16 else torch.float16,
    device_map={"": 0},
)
model.config.use_cache = False
model = get_peft_model(model, lora_config)
```

其余 Trainer 代码不变。训练前务必打印可训练参数；如果比例异常，优先检查 target module，而不是直接开跑。

## `target_modules` 怎么选

经典 LoRA 常只适配 attention 的 `q_proj`、`v_proj`；QLoRA 常把 attention 与 MLP 的所有线性层都纳入。PEFT 可用：

```python
lora_config = LoraConfig(
    task_type="CAUSAL_LM",
    target_modules="all-linear",
    r=16,
    lora_alpha=32,
)
```

但并非所有模型都采用同样的层名和线性层类型。先检查：

```python
for name, module in model.named_modules():
    if name.endswith(("q_proj", "v_proj", "gate_proj")):
        print(name, type(module).__name__)

print(model.targeted_module_names)
model.print_trainable_parameters()
```

如果目标是分类头、卷积或自定义架构，需要按模型模块树显式配置，不能把 Llama/Qwen 的层名复制过去。

## 加载 Adapter 推理

Adapter 目录包含 PEFT 配置和增量权重，不包含完整基座。加载时会根据配置找到基座：

```python
import torch
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer

ADAPTER_DIR = "outputs/deepseek-r1-distill-qlora/adapter"

tokenizer = AutoTokenizer.from_pretrained(ADAPTER_DIR)
model = AutoPeftModelForCausalLM.from_pretrained(
    ADAPTER_DIR,
    device_map="auto",
    dtype=torch.float16,
)

messages = [{"role": "user", "content": "什么是 ZeRO-2？"}]
inputs = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=True,
    return_tensors="pt",
).to(model.device)

with torch.inference_mode():
    output = model.generate(inputs, max_new_tokens=128, do_sample=False)

answer = tokenizer.decode(output[0, inputs.shape[-1]:], skip_special_tokens=True)
print(answer)
```

## 合并 Adapter

某些推理引擎可以直接加载 LoRA；不支持时再合并：

```python
import torch
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer

adapter_dir = "outputs/deepseek-r1-distill-qlora/adapter"
merged_dir = "outputs/deepseek-r1-distill-merged"

# 用非量化精度重新加载再合并，避免把训练用 4-bit 容器误当最终部署权重。
model = AutoPeftModelForCausalLM.from_pretrained(
    adapter_dir,
    dtype=torch.bfloat16,
    device_map="cpu",
    low_cpu_mem_usage=True,
)
model = model.merge_and_unload()
model.save_pretrained(merged_dir, safe_serialization=True, max_shard_size="4GB")
AutoTokenizer.from_pretrained(adapter_dir).save_pretrained(merged_dir)
```

合并后体积接近完整基座，失去动态切换 Adapter 的优势；发布时还要同时满足基座与数据的许可证。

## 选参和排错顺序

建议从小规模网格开始，而不是凭感觉一次训到底：

| 项目 | 起始范围 | 判断依据 |
| --- | --- | --- |
| `r` | 8、16、32 | 任务指标增益是否值得参数量 |
| 学习率 | LoRA SFT 常从 `1e-4`～`2e-4` 小范围试 | loss、梯度范数、验证集与生成样本 |
| 有效 batch | 8～64 个序列起试 | 稳定性与吞吐，不跨实验偷换 |
| 最大长度 | 覆盖业务 P95，并统计截断率 | 显存、吞吐、长样本表现 |
| epoch | 1～3 起试 | 验证曲线和灾难性遗忘 |

遇到 OOM，按这个顺序排查：

1. 缩短 `max_length`，检查是否存在异常长样本；
2. 减小 micro-batch，增加 gradient accumulation 保持有效 batch；
3. 开梯度检查点和 BF16/FP16；
4. 从 LoRA 切到 QLoRA；
5. 再考虑 DeepSpeed ZeRO、FSDP 或 offload。

不要先把 `r` 从 16 降到 4：LoRA 可训练参数通常不是激活显存的主要部分。

## 常见误区

- **把 QLoRA 当推理量化**：它描述训练方法；最终部署可另选 BF16、AWQ、GPTQ 或 GGUF。
- **把 `device_map="auto"` 当多卡训练**：它更偏向大模型加载/推理；训练应交给 Accelerate、FSDP 或 DeepSpeed。
- **重复注入 Adapter**：显式 `get_peft_model()` 后，不要再向 Trainer 传同一个 `peft_config`。
- **忘记保存 tokenizer**：推理模板或特殊 token 缺失会让正确权重也生成异常。
- **只看 Adapter 大小**：峰值显存常被长序列激活、临时缓冲和 eval generate 主导。

## 参考资料

- [LoRA 原始论文](https://arxiv.org/abs/2106.09685)
- [QLoRA 原始论文](https://arxiv.org/abs/2305.14314)
- [PEFT：LoRA API](https://huggingface.co/docs/peft/package_reference/lora)
- [PEFT：量化模型训练](https://huggingface.co/docs/peft/developer_guides/quantization)
- [Transformers：bitsandbytes](https://huggingface.co/docs/transformers/main/quantization/bitsandbytes)
- [TRL：SFT Trainer](https://huggingface.co/docs/trl/main/sft_trainer)
- [DeepSeek-R1 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)
