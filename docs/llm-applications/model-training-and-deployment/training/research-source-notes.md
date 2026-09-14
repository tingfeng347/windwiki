---
description: 模型微调与分布式训练的一手资料核对，覆盖 DeepSpeed、LoRA、QLoRA、Unsloth、PEFT、TRL、bitsandbytes 与 DeepSeek 的当前 API 和兼容边界。
---

# 模型训练与部署：一手资料核对

本文是截至 **2026-09-14** 的资料快照，只采用论文、项目官方文档、官方仓库和模型卡。它不是入门教程正文，而是给正文作者提供可追溯的 API、配置、兼容性和许可证依据。

## 先给结论

1. **DeepSpeed 和 DeepSeek 是两件事。** DeepSpeed 是分布式训练与推理优化库；DeepSeek 是模型家族。用户口中的“deepseeed 使用经验”更可能指 DeepSpeed，因此本文以 DeepSpeed 为主，DeepSeek 作为模型案例。
2. **先用 ZeRO-2，再按显存需要升级到 ZeRO-3。** Hugging Face 当前文档明确建议：ZeRO-2 的通信开销低于 ZeRO-3，只有模型在 ZeRO-2 下仍放不进显存时，才优先考虑 ZeRO-3。CPU/NVMe offload 继续节省显存，但会把瓶颈转移到主存、PCIe 或存储。[Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)
3. **QLoRA 不是“把所有参数以 4 bit 训练”。** 它冻结 4 bit 量化后的基础权重，梯度穿过量化层，只更新 LoRA 适配器。原始论文的三个关键点是 NF4、double quantization 和 paged optimizers。[QLoRA 论文](https://arxiv.org/abs/2305.14314)
4. **当前 Hugging Face SFT API 已不同于许多旧教程。** 当前 `SFTConfig` 使用 `max_length`，`SFTTrainer` 的分词器/处理器参数叫 `processing_class`；从 Transformers v5 起模型加载推荐写 `dtype=`。旧代码常见的 `max_seq_length`、`tokenizer=`、`torch_dtype=` 不能不加判断地照抄。[TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer)
5. **DeepSeek-R1 Distill 更适合单机教学和微调。** Qwen 版实际是 `Qwen2ForCausalLM`，Llama 版沿用 Llama 架构；它们可以按各自基础模型使用 Transformers、PEFT、TRL 和 Unsloth。完整 R1/V3 是 671B MoE，虽然每 token 只激活约 37B 参数，仍需存放约 671B 主模型权重，不能用“激活参数量”估算单机显存。[DeepSeek-R1 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1) [DeepSeek-V3 仓库](https://github.com/deepseek-ai/DeepSeek-V3)

## 一、DeepSpeed：它解决的不是同一个层次的问题

### 1. ZeRO 三阶段

ZeRO（Zero Redundancy Optimizer）逐级切分训练状态：[DeepSpeed ZeRO API](https://deepspeed.readthedocs.io/en/latest/zero3.html)

| 阶段 | 每张卡仍保留完整副本 | 被数据并行进程切分的状态 | 典型选择 |
| --- | --- | --- | --- |
| ZeRO-1 | 参数、梯度 | 优化器状态 | 模型能放下，只想减少 Adam 状态占用 |
| ZeRO-2 | 参数 | 优化器状态、梯度 | 多数多卡 LoRA/全参训练的首选 |
| ZeRO-3 | 无 | 优化器状态、梯度、参数 | ZeRO-2 仍 OOM，或模型本体不能在单卡驻留 |

ZeRO-3 前向计算某一层时需要临时 all-gather 该层参数，完成后再释放或重新切分。因此它能降低参数常驻显存，但通信更多；不能把“阶段越高”简单理解成“训练必然越快”。官方 Hugging Face 指南也明确建议在 ZeRO-2 无法容纳模型时才使用 ZeRO-3。[Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)

### 2. 安装与环境核对

官方最小安装是：

```bash
python -m pip install -U deepspeed
ds_report
```

DeepSpeed 的 CUDA/C++ 算子默认可能在首次使用时 JIT 编译。`ds_report`（等价于 `python -m deepspeed.env_report`）用于检查哪些算子可用。系统 CUDA 工具链版本和 PyTorch 编译使用的 CUDA 主版本不一致时，算子编译会失败；官方建议主、次版本都尽量匹配，不应把 `DS_SKIP_CUDA_CHECK=1` 当作常规修复。[DeepSpeed 安装说明](https://www.deepspeed.ai/tutorials/advanced-install/)

排查时至少记录：

```bash
nvidia-smi
nvcc --version
python -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.get_device_name())"
python -m deepspeed.env_report
```

DeepSpeed 官方已经提供原生 Windows 构建说明，但大模型训练生态中的 NCCL、多机启动器、vLLM、FlashAttention 等仍以 Linux 为主。Windows 工作站若要复现实验，WSL2 或 Linux 容器通常更容易与上游教程保持一致；如果坚持原生 Windows，应先以 `ds_report` 的实际结果为准，而不是只看 `pip install` 是否成功。[DeepSpeed Windows 官方说明](https://github.com/deepspeedai/DeepSpeed/blob/master/blogs/windows/08-2024/chinese/README.md)

### 3. Transformers Trainer + DeepSpeed 的当前写法

`TrainingArguments.deepspeed` 接收 JSON 文件路径或 Python 字典。与 Trainer 重复的批量、梯度累积、学习率和精度参数建议写成 `"auto"`，由 Trainer 同步，避免两份配置悄悄不一致。[Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)

一个可作为起点的 `ds-zero2.json`：

```json
{
  "bf16": { "enabled": "auto" },
  "fp16": { "enabled": "auto" },
  "zero_optimization": {
    "stage": 2,
    "overlap_comm": true,
    "contiguous_gradients": true,
    "reduce_bucket_size": 200000000,
    "allgather_bucket_size": 200000000
  },
  "gradient_clipping": "auto",
  "train_micro_batch_size_per_gpu": "auto",
  "train_batch_size": "auto",
  "gradient_accumulation_steps": "auto"
}
```

训练参数只保留一份事实来源：

```python
from transformers import TrainingArguments

args = TrainingArguments(
    output_dir="outputs/demo",
    deepspeed="ds-zero2.json",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    bf16=True,
    fp16=False,
    logging_steps=10,
    save_steps=200,
)
```

启动器可以三选一，不要叠加使用：

```bash
deepspeed --num_gpus 4 train.py
torchrun --nproc_per_node 4 train.py
accelerate launch --num_processes 4 train.py
```

以上三种入口都受官方 Transformers 指南支持。[Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)

### 4. ZeRO-3 与 offload 配置

ZeRO-3 CPU offload 起点：

```json
{
  "bf16": { "enabled": "auto" },
  "zero_optimization": {
    "stage": 3,
    "offload_optimizer": {
      "device": "cpu",
      "pin_memory": true
    },
    "offload_param": {
      "device": "cpu",
      "pin_memory": true
    },
    "overlap_comm": true,
    "contiguous_gradients": true,
    "reduce_bucket_size": "auto",
    "stage3_prefetch_bucket_size": "auto",
    "stage3_param_persistence_threshold": "auto",
    "stage3_gather_16bit_weights_on_model_save": true
  },
  "gradient_clipping": "auto",
  "train_micro_batch_size_per_gpu": "auto",
  "train_batch_size": "auto",
  "gradient_accumulation_steps": "auto"
}
```

关键边界：

- `offload_optimizer` 可用于 ZeRO-2/3；`offload_param` 只对 ZeRO-3 有意义。
- `pin_memory: true` 可以加快 CPU/GPU 传输，但会锁定主存，不能只检查 GPU 显存。
- `stage3_gather_16bit_weights_on_model_save: true` 会在保存时汇聚完整 16 bit 权重，速度慢且需要额外内存；但如果要得到能由 `from_pretrained()` 直接加载的完整权重，这是必要条件之一。
- bucket 越大通常通信效率越高，同时占用更多显存。不要未经测量就照搬 5e8 等旧教程数值。

这些字段和行为均见当前 [Transformers DeepSpeed ZeRO 指南](https://huggingface.co/docs/transformers/deepspeed) 与 [Accelerate DeepSpeed 指南](https://huggingface.co/docs/accelerate/main/usage_guides/deepspeed)。

### 5. Accelerate 的两种配置模式不能混写

Accelerate 有两条路径：

1. 让 `accelerate config` 生成简单的 DeepSpeed Plugin 配置；
2. 在 Accelerate YAML 中只写 `deepspeed_config_file`，详细设置放进 DeepSpeed JSON。

第二种模式的最小 YAML：

```yaml
compute_environment: LOCAL_MACHINE
distributed_type: DEEPSPEED
mixed_precision: bf16
num_machines: 1
num_processes: 4
machine_rank: 0
main_training_function: main
deepspeed_config:
  deepspeed_config_file: ./ds-zero3.json
  zero3_init_flag: true
```

使用 `deepspeed_config_file` 后，不要同时在同一个 Accelerate YAML 中重复写 `zero_stage`、`gradient_accumulation_steps`、offload 和 `zero3_save_16bit_model` 等字段；当前 Accelerate 会提示这些字段将被忽略并抛出 `ValueError`。[Accelerate DeepSpeed 配置冲突说明](https://huggingface.co/docs/accelerate/main/usage_guides/deepspeed)

如果 DeepSpeed JSON 自己声明了 `optimizer` 或 `scheduler`，原生 Accelerate 循环需要配套使用 `DummyOptim` / `DummyScheduler`；若 JSON 不声明它们，就继续使用代码里创建的 PyTorch optimizer/scheduler。四种组合及限制见 [Accelerate DeepSpeed 指南](https://huggingface.co/docs/accelerate/main/usage_guides/deepspeed)。

### 6. 不经 Trainer 的原生 DeepSpeed API

以下示例体现当前最稳定的核心调用关系：`initialize → engine(...) → engine.backward → engine.step`。[DeepSpeed Training Setup](https://deepspeed.readthedocs.io/en/stable/initialize.html) [DeepSpeed Training API](https://deepspeed.readthedocs.io/en/stable/training.html)

```python
import torch
import deepspeed

class TinyRegressor(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.net = torch.nn.Sequential(
            torch.nn.Linear(8, 32),
            torch.nn.GELU(),
            torch.nn.Linear(32, 1),
        )

    def forward(self, x, y):
        prediction = self.net(x)
        return torch.nn.functional.mse_loss(prediction, y)

model = TinyRegressor()
config = {
    "train_micro_batch_size_per_gpu": 4,
    "gradient_accumulation_steps": 2,
    "optimizer": {
        "type": "AdamW",
        "params": {"lr": 1e-3},
    },
    "zero_optimization": {"stage": 2},
}

engine, optimizer, _, _ = deepspeed.initialize(
    model=model,
    model_parameters=model.parameters(),
    config=config,
)

for _ in range(10):
    x = torch.randn(4, 8, device=engine.device)
    y = torch.randn(4, 1, device=engine.device)
    loss = engine(x, y)
    engine.backward(loss)
    engine.step()
```

```bash
deepspeed --num_gpus 2 native_train.py
```

默认由 DeepSpeed 管理梯度累积时，每个 micro-batch 都对称调用 `backward()` 和 `step()`；只有达到累积边界时才真正更新参数。混合精度下优先调用 `engine.backward(loss)`。当前 DeepSpeed 虽支持部分场景直接 `loss.backward()`，但手工反向必须正确使用 `engine.scale(loss)`，旧版又不一定支持，因此教学代码继续使用 engine API 更稳妥。[DeepSpeed Training API](https://deepspeed.readthedocs.io/en/stable/training.html)

### 7. Checkpoint：训练恢复和部署导出不是同一种文件

#### 保存和继续训练

```python
# 所有 rank 都必须执行，不能只放在 if rank == 0 中
engine.save_checkpoint(
    "checkpoints",
    tag="step-1000",
    client_state={"epoch": 2, "consumed_samples": 32000},
)

load_path, client_state = engine.load_checkpoint(
    "checkpoints",
    tag="step-1000",
)
if load_path is None:
    raise RuntimeError("checkpoint 加载失败")
start_epoch = client_state["epoch"]
```

DeepSpeed 每个进程保存自己的模型/优化器/调度器分片，因此 `save_checkpoint()` 必须由所有 rank 调用；只让 rank 0 调用会在同步点卡死。`client_state` 用于保存数据游标、epoch 等业务状态。[DeepSpeed Getting Started](https://www.deepspeed.ai/getting-started/)

ZeRO-3 下，不要在同一个已分片的 engine 上紧接着 `save_checkpoint()` 后再 `load_checkpoint()`。官方说明 `load_checkpoint()` 需要干净、未分片的模型；若必须立即重新加载，应重新初始化 engine。[DeepSpeed checkpoint API](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html)

#### 导出给 Transformers 或推理引擎

DeepSpeed 的训练 checkpoint 是分片状态，不能直接当作普通 Hugging Face 模型目录使用。可在训练结束后离线合并 FP32 权重：

```bash
cd checkpoints
python zero_to_fp32.py . ../exported-model/pytorch_model.bin
```

或用 Python：

```python
from deepspeed.utils.zero_to_fp32 import (
    get_fp32_state_dict_from_zero_checkpoint,
)

state_dict = get_fp32_state_dict_from_zero_checkpoint("checkpoints")
model = model.cpu()
model.load_state_dict(state_dict)
model.save_pretrained("exported-model", safe_serialization=True)
tokenizer.save_pretrained("exported-model")
```

合并需要大量 CPU RAM；Accelerate 文档估计约需最终 checkpoint 大小的两倍主存。调用 `load_state_dict_from_zero_checkpoint` 后，原 model 不再保持 DeepSpeed engine 语义；若还要继续分布式训练，需要重新初始化。[DeepSpeed checkpoint API](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html) [Accelerate DeepSpeed 保存说明](https://huggingface.co/docs/accelerate/main/usage_guides/deepspeed)

“换 GPU 数继续训练”也不能默认保证。DeepSpeed 的 Universal Checkpoint 正是为不同 DP/TP/PP 拓扑恢复设计的，但官方仍把它标为 under development，应先按目标并行拓扑做恢复演练。[DeepSpeed Universal Checkpoint](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html)

### 8. DeepSpeed 常见坑清单

- **配置和 Trainer 双重定义。** 批量、累积步数、精度、学习率优先用 `"auto"`，或确保两边完全一致；当前文档指出不一致时可能继续运行但使用错误值。[Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)
- **配置拼写错误。** 当前 ZeRO 配置类使用 Pydantic 验证，但不同集成层和历史版本的校验强度不同；务必检查启动日志最终打印的 effective config，不把“成功启动”当成配置已生效。[DeepSpeed ZeRO config](https://deepspeed.readthedocs.io/en/latest/zero3.html)
- **ZeRO-3 初始化时机错误。** Transformers 文档要求使用 ZeRO 初始化时先创建 `TrainingArguments`，再实例化模型，否则 `from_pretrained()` 阶段不会进入 ZeRO-3 初始化。[Trainer API](https://huggingface.co/docs/transformers/main/main_classes/trainer)
- **只保存模型，不保存训练状态。** `save_only_model=True` 省略优化器等状态，不能用于完整断点续训；它也不能与 `load_best_model_at_end=True` 组合。[Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)
- **rank 0 单独保存 DeepSpeed checkpoint。** 会等待其他 rank，造成挂起。[DeepSpeed Getting Started](https://www.deepspeed.ai/getting-started/)
- **把 ZeRO 分片目录交给 `from_pretrained()`。** 应先汇聚 16 bit 权重，或离线执行 `zero_to_fp32.py`。[DeepSpeed checkpoint API](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html)
- **offload 后只看 GPU 利用率。** 需要同时监测 CPU RAM、page fault、PCIe、NVMe 吞吐，否则“显存下降”可能换来数倍训练时长。
- **多机版本不一致。** 所有节点的 Python、PyTorch、CUDA、DeepSpeed、模型代码和自定义算子构建必须一致；可以保存每个节点的 `ds_report` 作为实验记录。[DeepSpeed 安装说明](https://www.deepspeed.ai/tutorials/advanced-install/)

## 二、LoRA 与 QLoRA：原理和工程边界

### 1. LoRA 做了什么

对于冻结权重 $W_0 \in \mathbb{R}^{d \times k}$，LoRA 不直接训练完整增量，而是学习低秩分解：

$$
h = W_0x + \frac{\alpha}{r}BAx,
$$

其中 $A \in \mathbb{R}^{r \times k}$、$B \in \mathbb{R}^{d \times r}$，且 $r \ll \min(d,k)$。训练参数量从 $dk$ 变成约 $r(d+k)$。LoRA 原论文冻结预训练权重并向 Transformer 层注入低秩矩阵，减少训练参数和每个任务的存储成本。[LoRA 论文](https://arxiv.org/abs/2106.09685)

LoRA 的直接收益是“少训练、少保存”，并不自动代表：

- 基础模型本体不占显存；
- 推理一定更快；
- 少量低质量数据能注入可靠事实；
- 对任意模型写同一组 `target_modules` 都正确。

### 2. QLoRA 的准确含义

QLoRA 的路径是：

1. 将基础模型权重量化为 4 bit 并冻结；
2. 计算时按指定 dtype 反量化参与前向/反向；
3. 只更新通常为 BF16/FP16 的 LoRA 参数；
4. 优化器只保存适配器的状态。

原论文引入 NF4、double quantization 和 paged optimizers，并证明 65B 模型可在单张 48GB GPU 上完成其论文设置的微调；这是一项具体实验结果，不能外推成“任何 65B 模型、任意序列长度都只需 48GB”。[QLoRA 论文](https://arxiv.org/abs/2305.14314)

Hugging Face 当前建议对 4 bit 训练使用 NF4，并可使用 BF16 作为计算 dtype；nested/double quantization 进一步压缩量化常数。[Transformers bitsandbytes](https://huggingface.co/docs/transformers/main/quantization/bitsandbytes)

```python
import torch
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)
```

Turing 之前的卡可能支持 NF4/FP4，却不一定支持高效 BF16；运行时应根据 `torch.cuda.is_bf16_supported()` 选择 BF16 或 FP16。bitsandbytes 的 CUDA、ROCm、Intel 等后端支持状态持续变化，不能把一张旧博客的硬件表当成永久事实，发布前应回查 [bitsandbytes 官方安装兼容表](https://huggingface.co/docs/bitsandbytes/main/en/installation)。

## 三、Hugging Face PEFT + TRL 的当前最小 QLoRA 示例

下面选择 `deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B`，因为它实际是 Qwen2 架构、规模适合教学。完整 DeepSeek-R1/V3 不适合拿同一份单卡脚本演示。[DeepSeek-R1 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)

### 1. 安装

```bash
python -m pip install -U transformers trl peft accelerate datasets bitsandbytes
python -m pip freeze > requirements-lock.txt
```

调研笔记不硬编码一组未来必然失效的精确版本。真实项目应先在目标 GPU 上跑 smoke test，再锁定一整套已验证版本；不要只锁 `transformers`，遗漏 `trl`、`peft`、`accelerate`、`bitsandbytes` 和 `torch`。

### 2. 可运行的最小训练脚本

```python
import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from trl import SFTConfig, SFTTrainer

MODEL_ID = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"

examples = [
    {
        "messages": [
            {"role": "user", "content": "用一句话解释梯度累积。"},
            {
                "role": "assistant",
                "content": "梯度累积把多个小批次的梯度累加后再更新一次参数，用时间换取更低的单步显存。",
            },
        ]
    },
    {
        "messages": [
            {"role": "user", "content": "LoRA 和全参数微调的主要区别是什么？"},
            {
                "role": "assistant",
                "content": "LoRA 冻结基础权重，只训练低秩适配器；全参数微调会更新全部模型权重。",
            },
        ]
    },
]
dataset = Dataset.from_list(examples)

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
    device_map={"": 0},
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
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

training_args = SFTConfig(
    output_dir="outputs/deepseek-r1-distill-qlora",
    max_length=1024,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=1,
    logging_steps=1,
    save_strategy="epoch",
    bf16=bf16,
    fp16=torch.cuda.is_available() and not bf16,
    gradient_checkpointing=True,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    processing_class=tokenizer,
)
trainer.train()
trainer.save_model("outputs/deepseek-r1-distill-qlora/adapter")
tokenizer.save_pretrained("outputs/deepseek-r1-distill-qlora/adapter")
```

依据和边界：

- 当前 TRL 支持把 conversational dataset 的 `messages` 交给 `SFTTrainer`；也可以不预先包装模型，改为向 Trainer 传入 `peft_config`。上例选择显式执行 `prepare_model_for_kbit_training()` 和 `get_peft_model()`，便于在训练前检查可训练参数，随后不要再重复传 `peft_config`。[PEFT 量化模型训练](https://huggingface.co/docs/peft/developer_guides/quantization) [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer)
- `processing_class` 是当前参数名。旧教程的 `tokenizer=tokenizer` 属于旧 API。
- 当前 `SFTConfig` 是 `max_length`，不是不少旧版 Unsloth/TRL 示例使用的 `max_seq_length`。[TRL SFTConfig](https://huggingface.co/docs/trl/sft_trainer)
- 若设置 `assistant_only_loss=True`，聊天模板必须能产生 assistant token mask，即模板包含 `{% generation %}` / `{% endgeneration %}`；不能对任意 DeepSeek/Qwen 模板盲开。[TRL assistant-only loss](https://huggingface.co/docs/trl/sft_trainer)
- PEFT 对常见架构有默认 target modules，但要追求 QLoRA 论文式 all-linear 适配时仍应检查实际层名。可用 `model.named_modules()`、`model.print_trainable_parameters()` 和 `model.targeted_module_names` 核对。[PEFT custom models](https://huggingface.co/docs/peft/developer_guides/custom_models)

### 3. 加载 LoRA adapter 推理

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

只分发 adapter 时，使用者仍需取得许可证兼容的基础模型。合并权重会产生另一份完整模型，磁盘和发布合规要求都不同。PEFT 当前可用 `AutoPeftModelForCausalLM` 加载适配器，也可 `merge_and_unload()` 生成不再依赖 PEFT adapter 的普通模型，但合并前必须确认量化状态、dtype 和许可证。[PEFT checkpoint format](https://huggingface.co/docs/peft/developer_guides/checkpoint)

## 四、Unsloth：使用经验与兼容边界

### 1. 安装原则

官方当前推荐普通环境直接：

```bash
python -m pip install -U unsloth unsloth_zoo
```

Python、PyTorch 和 CUDA 组合特殊时，再使用官方安装选择器或对应 extra，而不是从旧 notebook 复制一条带固定 `cu121-torch240` 的命令。官方文档特别提醒 Python 3.13 仍可能遇到生态依赖问题，并提供按 PyTorch/CUDA 组合安装的方法。[Unsloth Pip Install](https://docs.unsloth.ai/get-started/installing-%2B-updating/pip-install)

### 2. 当前最小微调骨架

Unsloth 官方模型卡当前同时展示 `FastModel`，而大量已发布 notebook 仍使用 `FastLanguageModel`。文本自回归模型可以使用后者；新模型家族或官方模型卡明确要求时优先照模型卡使用 `FastModel`。以下骨架适用于 DeepSeek-R1-Distill-Qwen 这类 Qwen 文本模型：[Unsloth DeepSeek 1.5B 模型卡](https://huggingface.co/unsloth/DeepSeek-R1-Distill-Qwen-1.5B-bnb-4bit) [Unsloth 官方模型映射](https://github.com/unslothai/unsloth/blob/main/unsloth/models/mapper.py)

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
    dtype=None,
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
    {"text": "### 问题：什么是 QLoRA？\n### 回答：QLoRA 冻结 4 bit 基础模型，只训练 LoRA 适配器。"},
    {"text": "### 问题：为什么使用梯度累积？\n### 回答：它用多个小批次模拟更大的有效批量。"},
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

这里同时存在两层 API：`FastLanguageModel.from_pretrained()` 仍使用 Unsloth 自己的 `max_seq_length`；当前 TRL 的 `SFTConfig` 使用 `max_length`。这两个名字不能机械地全局替换。[Unsloth 官方 notebook](https://github.com/unslothai/notebooks) [TRL SFTConfig](https://huggingface.co/docs/trl/sft_trainer)

### 3. 超参数起点，不是定律

Unsloth 当前官方建议把以下数值作为普通 LoRA/QLoRA 的起点：[Unsloth LoRA 参数指南](https://docs.unsloth.ai/basics/lora-parameters-encyclopedia)

| 参数 | 可作为起点 | 需要验证的影响 |
| --- | --- | --- |
| `r` | 16 或 32 | 越大容量和显存越高，不保证质量单调增加 |
| `lora_alpha` | `r` 或 `2r` | 控制更新缩放强度 |
| `lora_dropout` | 0～0.05 | 0 能走 Unsloth 优化路径；小数据过拟合时再比较非零值 |
| target modules | 注意力 + MLP 七类线性层 | 必须与实际架构层名匹配 |
| learning rate | `2e-4` 左右 | LoRA 常高于全参微调，仍需看验证集 |
| epoch | 1～3 | 数据越少、重复越高越易过拟合 |
| 有效 batch | 4～16 起步 | `per_device × accumulation × data_parallel_world_size` |

不要把训练 loss 的某个固定阈值当作通用过拟合判断。更可靠的是独立验证集、领域任务集、生成样例盲评，以及对基础能力的回归测试。

### 4. 保存、GGUF 和跨引擎推理

Unsloth 可保存 adapter、合并后的 16 bit 模型和 GGUF。跨到 llama.cpp、Ollama、vLLM 后出现乱码、重复或无法结束，官方首先要求核对**训练与推理是否使用同一聊天模板和特殊 token 约定**。[Unsloth 保存排错](https://docs.unsloth.ai/basics/saving-and-using-models/troubleshooting)

因此每个训练产物至少保存：

- tokenizer 全部文件与 `chat_template`；
- 基础模型精确 ID 和 revision；
- Unsloth、Transformers、TRL、PEFT、PyTorch 版本；
- 训练数据模板源码；
- 推理采样参数和停止 token；
- adapter-only、merged、GGUF 中具体是哪一种产物。

不要把 `adapter_model.safetensors` 当成完整模型，也不要只复制 GGUF 而遗漏模板和 generation config。

### 5. 许可证

Unsloth 当前仓库说明核心包采用 Apache-2.0，Unsloth Studio 等可选组件采用 AGPL-3.0；notebooks 也有自己的许可证。部署时还必须叠加检查基础模型、数据集和产出模型的许可证，不能用“训练框架是开源的”推导“模型可商用”。[Unsloth 仓库许可证说明](https://github.com/unslothai/unsloth)

## 五、DeepSeek 模型的训练与部署边界

### 1. 不同 DeepSeek 名称对应不同架构

| 模型 | 规模/架构事实 | Transformers / Unsloth 建议 |
| --- | --- | --- |
| DeepSeek-R1 / R1-Zero | 基于 DeepSeek-V3-Base，671B 总参数、约 37B 激活参数 | 完整模型面向多机推理；不要套 1.5B 单卡 QLoRA 脚本 |
| R1-Distill-Qwen-1.5B/7B/14B/32B | 分别基于 Qwen2.5-Math / Qwen2.5 | 当作 Qwen 因果语言模型使用；适合 Transformers、PEFT、TRL、Unsloth |
| R1-Distill-Llama-8B/70B | 分别基于 Llama 3.1 / Llama 3.3 | 当作 Llama 家族使用，许可证仍受对应 Llama 条款影响 |
| DeepSeek-V3 | 671B MoE、原始权重为 FP8，另含 MTP 模块 | Transformers 已有原生 `DeepseekV3ForCausalLM`，但朴素实现仍有限制；生产服务优先看 SGLang/vLLM 当前支持 |

模型谱系与许可证说明来自 [DeepSeek-R1 官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)；DeepSeek-V3 的权重结构见 [README_WEIGHTS](https://github.com/deepseek-ai/DeepSeek-V3/blob/main/README_WEIGHTS.md)。

### 2. “DeepSeek-V3 不支持 Transformers”已经过时

DeepSeek-V3 仓库早期 README 曾写“Transformers 尚未直接支持”，并固定了 `transformers==4.46.3` 给官方 demo。此信息只描述当时状态。DeepSeek-V3 于 2025-03-28 合入 Transformers，当前已有 `DeepseekV3Config`、`DeepseekV3Model` 和 `DeepseekV3ForCausalLM`。[Transformers DeepSeek-V3](https://huggingface.co/docs/transformers/model_doc/deepseek_v3)

但“能加载”不等于“适合高吞吐生产”。当前 Transformers 文档仍列出朴素 attention、逐专家循环、static cache 等实现限制。完整 R1/V3 服务应优先用官方模型仓库列出的 SGLang、vLLM 等专用引擎；Transformers 适合接口验证、研究和较小衍生模型。

### 3. Distill 模型的本地 Transformers 推理

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype="auto",
    device_map="auto",
)

messages = [{"role": "user", "content": "证明两个奇数之和是偶数。"}]
inputs = tokenizer.apply_chat_template(
    messages,
    tokenize=True,
    add_generation_prompt=True,
    return_tensors="pt",
).to(model.device)

with torch.inference_mode():
    outputs = model.generate(
        inputs,
        max_new_tokens=512,
        temperature=0.6,
        top_p=0.95,
        do_sample=True,
    )

print(tokenizer.decode(outputs[0, inputs.shape[-1]:], skip_special_tokens=True))
```

DeepSeek 官方对 R1 Distill 推荐温度约 0.5～0.7，并提醒不合适的温度可能带来重复或不连贯输出。模型卡还给出 vLLM 示例，说明 Distill 模型可按 Qwen/Llama 模型使用。[DeepSeek-R1 官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)

### 4. 小模型 OpenAI 兼容服务

```bash
python -m pip install -U vllm
vllm serve deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B \
  --dtype auto \
  --max-model-len 8192 \
  --api-key local-token
```

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:8000/v1",
    api_key="local-token",
)
response = client.chat.completions.create(
    model="deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    messages=[{"role": "user", "content": "解释 ZeRO-3。"}],
    temperature=0.6,
)
print(response.choices[0].message.content)
```

vLLM 的 OpenAI-compatible server 当前使用 `vllm serve`；模型仓库中的 `generation_config.json` 默认可能覆盖部分采样参数。`--api-key` 也并不保护 vLLM 的所有非 `/v1` 端点，生产环境必须放在反向代理和网络访问控制之后。[vLLM OpenAI-Compatible Server](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/)

### 5. 完整 R1/V3 服务不是“小模型命令加一个模型名”

官方 vLLM recipe 给 DeepSeek-R1-0528 FP8 的起点是 8×H200 或同级多卡，启用 tensor/expert parallel；SGLang 的当前 DeepSeek 指南同样列出完整 FP8/BF16/量化权重的多卡乃至多节点配置。[vLLM DeepSeek-R1 recipe](https://github.com/vllm-project/recipes/blob/main/models/deepseek-ai/DeepSeek-R1.yaml) [SGLang DeepSeek 指南](https://github.com/sgl-project/sglang/blob/main/docs/basic_usage/deepseek_v3.md)

SGLang 示例：

```bash
python3 -m sglang.launch_server \
  --model-path deepseek-ai/DeepSeek-V3 \
  --tp 8 \
  --trust-remote-code \
  --host 0.0.0.0 \
  --port 30000
```

原始 DeepSeek-V3 权重本身就是 FP8，不要再盲加 `--quantization fp8`。A100 上需要先把官方 FP8 checkpoint 转成 BF16，或使用经过引擎验证的量化权重；具体卡型配置应以当时的 [SGLang DeepSeek-V3/R1 文档](https://github.com/sgl-project/sglang/blob/main/docs/basic_usage/deepseek_v3.md) 为准。

### 6. DeepSeek 许可证不能只看仓库右侧标签

- DeepSeek-V3 代码仓库为 MIT，但 V3 Base/Chat 权重受单独 Model License 约束；官方说明支持商业使用。[DeepSeek-V3 仓库](https://github.com/deepseek-ai/DeepSeek-V3)
- DeepSeek-R1 代码和权重使用 MIT，并允许修改、衍生和蒸馏；但 Distill-Qwen 的上游是 Apache-2.0，Distill-Llama 还需遵守相应 Llama 3.1/3.3 许可证。[DeepSeek-R1 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)
- Unsloth 上传的量化文件不是新的基础模型授权来源。分发或商用时必须沿着 base model 链逐层检查。

## 六、LoRA/QLoRA 与 DeepSpeed 怎么组合

二者解决不同维度：

- LoRA/QLoRA 减少需要训练的参数和优化器状态；
- DeepSpeed 把仍需驻留的训练状态、梯度和参数分摊到多卡或 offload。

决策顺序可用：

1. 单卡能放下：普通 LoRA；
2. 基础模型放不下：QLoRA；
3. 需要多卡提高吞吐：LoRA/QLoRA + DDP 或 ZeRO-2；
4. 即使多卡每卡仍放不下模型：ZeRO-3；
5. ZeRO-3 仍 OOM：再考虑 CPU/NVMe offload、缩短序列、减小 micro-batch、梯度检查点；
6. 完整大 MoE 或多节点训练：还要评估 tensor parallel、pipeline parallel、expert parallel，而不是只继续提高 ZeRO stage。

PEFT 官方已有通过 Accelerate + DeepSpeed 训练 adapter 的指南，ZeRO-1/2 保存行为与普通模型接近，ZeRO-3 保存完整 16 bit 权重需要额外开关。[PEFT + DeepSpeed](https://huggingface.co/docs/peft/main/accelerate/deepspeed)

## 七、旧教程迁移检查表

| 旧写法或旧结论 | 当前核对方式 |
| --- | --- |
| `SFTConfig(max_seq_length=...)` | 当前 TRL 用 `SFTConfig(max_length=...)` |
| `SFTTrainer(tokenizer=tokenizer)` | 当前用 `processing_class=tokenizer` |
| `from_pretrained(..., torch_dtype=...)` | Transformers v5 当前文档用 `dtype=...`；兼容 v4/v5 时应锁版本测试 |
| `DeepSeek-V3 不支持 Transformers` | 2025-03-28 已合入；但通用实现仍有性能限制 |
| DeepSeek-R1 “37B 模型” | 完整模型是 671B 总参数、每 token 约 37B 激活参数 |
| 只在 rank 0 调 `save_checkpoint()` | DeepSpeed 要求所有 rank 调用，否则可能挂起 |
| ZeRO-3 checkpoint 可直接 `from_pretrained()` | 先汇聚 16 bit 或运行 `zero_to_fp32.py` |
| Accelerate YAML 同时写 `deepspeed_config_file` 和全部 DS 字段 | 二选一；重复字段当前会报错/被忽略 |
| 任意聊天数据都设 `assistant_only_loss=True` | 模板必须能返回 assistant mask，先验证 `{% generation %}` 标记 |
| 所有模型 target modules 都写七个 Llama 层名 | 用 `named_modules()` 检查；MoE 还可能需要 `target_parameters` |
| GGUF 运行异常就重新训练 | 先核对 chat template、BOS/EOS、stop token 和 generation config |

API 依据：[TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer)、[Transformers DeepSeek-V3](https://huggingface.co/docs/transformers/model_doc/deepseek_v3)、[DeepSpeed checkpoint](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html)、[Accelerate DeepSpeed](https://huggingface.co/docs/accelerate/main/usage_guides/deepspeed)、[PEFT custom models](https://huggingface.co/docs/peft/developer_guides/custom_models)、[Unsloth 保存排错](https://docs.unsloth.ai/basics/saving-and-using-models/troubleshooting)。

## 八、最低限度的实验验收

任何声称“代码可运行”的训练笔记都至少应记录：

1. `pip freeze`、`ds_report`、GPU 型号和驱动；
2. 基础模型 ID、revision、权重 dtype 和量化方式；
3. 数据条数、token 长度分位数、模板渲染后的真实文本；
4. train/eval 划分是否存在近重复泄漏；
5. 可训练参数数量与 target modules 列表；
6. 峰值 GPU 显存、CPU RAM、吞吐和 wall-clock；
7. 保存后从新进程重新加载 adapter/merged 模型；
8. 用固定 prompt 比较 base 与 fine-tuned 输出；
9. 至少一个领域指标和一个基础能力回归集；
10. 从 checkpoint 恢复后核对 global step、学习率和数据游标。

一个最小参数核对片段：

```python
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print({
    "trainable": trainable,
    "total": total,
    "ratio_percent": 100 * trainable / total,
})

if hasattr(model, "targeted_module_names"):
    print("targeted modules:", model.targeted_module_names)
```

PEFT 官方也建议使用 `print_trainable_parameters()` 和 `targeted_module_names` 检查适配是否施加在预期层上。[PEFT custom models](https://huggingface.co/docs/peft/developer_guides/custom_models)

## 参考资料

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314)
- [DeepSpeed 官方仓库](https://github.com/deepspeedai/DeepSpeed)
- [DeepSpeed ZeRO 配置 API](https://deepspeed.readthedocs.io/en/latest/zero3.html)
- [DeepSpeed Training API](https://deepspeed.readthedocs.io/en/stable/training.html)
- [DeepSpeed Checkpointing API](https://deepspeed.readthedocs.io/en/stable/model-checkpointing.html)
- [Transformers DeepSpeed ZeRO](https://huggingface.co/docs/transformers/deepspeed)
- [Accelerate DeepSpeed](https://huggingface.co/docs/accelerate/main/usage_guides/deepspeed)
- [PEFT LoRA API](https://huggingface.co/docs/peft/package_reference/lora)
- [PEFT 量化模型训练](https://huggingface.co/docs/peft/developer_guides/quantization)
- [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer)
- [Transformers bitsandbytes](https://huggingface.co/docs/transformers/main/quantization/bitsandbytes)
- [Unsloth 官方文档](https://docs.unsloth.ai/)
- [Unsloth 官方 notebooks](https://github.com/unslothai/notebooks)
- [DeepSeek-R1 官方仓库](https://github.com/deepseek-ai/DeepSeek-R1)
- [DeepSeek-R1 官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-R1)
- [DeepSeek-V3 官方仓库](https://github.com/deepseek-ai/DeepSeek-V3)
- [Transformers DeepSeek-V3](https://huggingface.co/docs/transformers/model_doc/deepseek_v3)
- [vLLM OpenAI-Compatible Server](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/)
- [SGLang DeepSeek V3/R1](https://github.com/sgl-project/sglang/blob/main/docs/basic_usage/deepseek_v3.md)
