---
description: 记录模型训练专题对 knowledge-center、all-in-rag、hello-agents 和尚硅谷 PDF 的内容覆盖、图片来源与官方资料校正边界。
---

# 来源与覆盖说明

本专题不是把三个仓库逐行拼接，而是按训练工程链路重新组织，并保留各自最有价值、彼此互补的部分。本页记录提炼范围，便于回查原文和判断哪些内容经过了更新校正。

## 来源快照

| 来源 | 本次读取版本 | 主要角色 |
| --- | --- | --- |
| [knowledge-center](https://github.com/left0ver/knowledge-center) | `847dfb84bc0a48639c7983a9aa5d81d1093c5efa` | 分布式训练、DeepSpeed、FSDP、量化 |
| [all-in-rag](https://github.com/datawhalechina/all-in-rag) | `583a61b09869bc3afc4552289171f6ec188f2c76` | 适配方案选择、Embedding 训练 |
| [hello-agents](https://github.com/datawhalechina/hello-agents) | `4f7682ceafe573d07cd8a7d0b89908500e83227d` | LoRA/SFT/GRPO 示例与真实后训练复盘 |
| 尚硅谷《大模型技术之大模型微调 V1.1》 | 本地 29 页 PDF | 课程原文独立阅读页 |

这些 commit 只用于说明本次读取的本地快照。涉及版本易变的 API、安装命令、模型支持与许可证，另用 2026-09-14 可访问的一手官方资料核对，见 [一手资料核对](./research-source-notes.md)。

## `knowledge-center` 覆盖

### 分布式训练

读取并吸收：

- point-to-point、broadcast、scatter/gather、all-gather、reduce、all-reduce、reduce-scatter；
- 参数服务器和 Ring All-Reduce；
- PyTorch DDP 与 `DistributedSampler`；
- GPipe/PipeDream 类流水线并行；
- Megatron 类张量并行；
- ZeRO-1/2/3、ZeRO-R、CPU/NVMe Offload；
- FSDP、混合精度、梯度检查点；
- Accelerate、DeepSpeed 原生训练、checkpoint 保存与恢复；
- 多卡 debug、NCCL 失败和 Docker GPU/共享内存注意事项。

整合位置：

- [DeepSpeed 实战](./deepspeed-practice.md)
- [分布式训练](./distributed-training.md)

### 量化

读取并吸收：

- 动态/静态 PTQ、QAT；
- scale、zero point、对称/非对称、per-tensor/per-channel；
- AdaRound、bias correction、混合精度等误差修正思路；
- 量化与剪枝、部署优化的关系。

原笔记偏通用模型量化，本专题进一步补了 LLM 训练与部署需要区分的 QLoRA、AWQ/GPTQ、GGUF、FP8 和 KV cache。整合位置：[量化、合并与导出](./quantization-and-export.md)。

### 环境经验

原文记录了 LLaMA-Factory、Unsloth、vLLM 共存时的依赖冲突。专题保留“按训练/服务职责隔离环境”的经验，但没有照搬旧版本 pin，也没有把 `DISABLE_VERSION_CHECK=1` 当常规方案；安装以当前官方矩阵为准。

## `hello-agents` 覆盖

### 教学代码

读取了 chapter 11 的：

- LoRA 参数配置与 rank 比较；
- SFT 完整流程；
- GRPO 与奖励函数；
- Accelerate 分布式入口；
- multi-GPU DDP、DeepSpeed ZeRO-2/3 YAML。

原代码中的 `RLTrainingTool` 是该仓库自己的封装。为了让读者不依赖仓库内部类也能运行，正文将核心示例重写为官方 PEFT、TRL、Transformers、Unsloth、DeepSpeed 与 PyTorch API，同时保留原代码强调的有效 batch、多阶段学习率和 Accelerate 切换方式。

### 旅行助手后训练实战

完整保留了这条工程主线：

```text
产品协议
→ 冻结评测
→ Prompt 基线
→ SFT 数据生成与审计
→ 多阶段 LoRA
→ Best-of-N Replay
→ DPO
→ 多候选 Rerank
```

也保留了原实验的重要边界与结果：

- 测试集签名重叠为 0；
- Main Clean、usage700、patch700、Best-of-N、DPO 使用逐步降低的学习率；
- 全参 SFT 约 6×40GB、7 小时、28GB 产物，但没有自动修好关键预算约束；
- 最终 4 候选重排在项目冻结评测规则下达到 hardpass 99.4%、planner soft 80.6%、重算预算 soft 68.2%；
- 结果只代表该数据集和规则，不能外推为通用旅行规划能力。

整合位置：[后训练工程实战](./post-training-engineering.md)。

## `all-in-rag` 覆盖

这个仓库的主体是 RAG，不包含一套通用生成模型微调课程；本专题保留它与训练直接相关的互补内容：

- Prompt → RAG → 微调的适配决策顺序；
- 微调改变行为，RAG 注入动态、可追溯知识；
- RAG 与微调可以组合，而非互斥；
- Embedding 的正样本对、三元组、对比学习、难负样本与领域微调；
- Embedding 微调仍需 Recall@K、MRR、nDCG 等独立评测。

整合位置：[训练路线总览](./index.md) 和 [微调基础与数据工程](./fine-tuning-foundations.md)。RAG 的完整内容仍位于 [RAG 专题](../../rag/rag.md)，本专题不重复复制。

## PDF 课程覆盖

本地 PDF 已原样复制到站点文件目录，SHA-256 与桌面源文件一致；没有转码、抽页或重排。阅读器目录覆盖：

1. 大模型概述；
2. 提示词、微调与 RAG 的适配选择；
3. 微调整体流程；
4. 指令式、ShareGPT 与 OpenAI 对话数据；
5. 全参数微调、PEFT、LoRA、QLoRA；
6. 数据、流水线、张量并行与 ZeRO；
7. LLaMA-Factory 安装、数据、LoRA 和权重导出；
8. vLLM 部署与调用。

独立阅读页：[尚硅谷大模型技术之大模型微调 V1.1](./large-model-fine-tuning-course.mdx)。课程页保留原文；正文专题则使用当前官方 API 补充和校正，因此二者适合对照阅读。

## 图片来源

本专题没有生成新图：

- `zero-*`、`mixed-precision-training.png`、`gradient-checkpointing.png`、`ring-all-reduce.png` 来自 `knowledge-center` 原笔记引用的图片；
- `post-training-roadmap.png`、`sft-data-audit.png`、`lora-staged-training.png`、`full-sft-vs-lora.png`、`dpo-data-filtering.png`、`generation-rerank-comparison.png` 来自 `hello-agents` 的 Extra12 原图；
- 图片复制到本文同级 `images/`，正文只用 Markdown 相对路径引用。

## 官方校正项

仓库经验很有价值，但依赖 API 会过期。本次重点复核：

- 当前 TRL 使用 `SFTConfig(max_length=...)`、`processing_class=...`；
- Unsloth loader 仍用自己的 `max_seq_length`，不能全局替换；
- PEFT 的 `target_modules="all-linear"`、rsLoRA、量化模型准备与 Adapter 加载；
- QLoRA 的 NF4、double quantization 和计算 dtype；
- DeepSpeed ZeRO-2/3、Accelerate 两种配置方式、all-rank checkpoint 与 FP32 汇聚；
- DeepSeek-R1 Distill、完整 R1/V3 的规模、架构与许可证边界；
- DeepSeek-V3 已进入 Transformers，但“能加载”不等于通用实现适合高吞吐生产。

## 没有声称的事情

- 文中的安装命令没有在本机实际下载模型并完成 GPU 训练；它们按官方 API 核对并用于读者环境复现。
- 示例超参数是冒烟测试或实验起点，不是所有数据集的最佳参数。
- 本地仓库的实验结论不等于论文级普遍结论。
- PDF 原文内容没有被改写；若课程中的版本信息与正文不同，以目标环境和当前官方文档为准。
