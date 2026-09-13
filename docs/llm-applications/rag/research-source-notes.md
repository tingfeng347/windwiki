---
description: 用原始论文、官方文档和官方仓库核对 RAG、解析、分块、索引、评估、GraphRAG 与 Agentic RAG 的事实和边界。
---

# RAG 一手资料核对笔记

核对日期：2026-09-13。本文是扩写 RAG 正文时使用的研究底稿，只采用论文、官方文档和官方仓库；其中带“工程判断”的内容是根据一手资料作出的推论，不冒充论文结论。

## 1. 原始 RAG 与今天所说的 RAG

### 1.1 原始论文实际提出了什么

Lewis 等人在 2020 年的论文中，把预训练的参数化记忆（BART seq2seq 生成器）与非参数化记忆（Wikipedia 稠密向量索引）结合起来。DPR 检索器以输入为条件返回 top-k 文档，生成器同时以输入和文档为条件生成输出；训练时把检索文档视为隐变量，对文档概率进行边缘化。论文中的索引使用 2018 年 12 月 Wikipedia、约 2100 万个互不重叠的 100 词文本块和 FAISS MIPS/HNSW。[原始 RAG 论文](https://arxiv.org/html/2005.11401)

论文提出两种形式：

- **RAG-Sequence**：整条输出序列使用同一个潜在文档，分别计算各文档下的序列概率后再求和。
- **RAG-Token**：每个输出 token 都可以对不同潜在文档进行边缘化，因此一条回答可以在生成过程中利用多个文档。

原始系统还联合训练查询编码器与生成器，但固定文档编码器和索引。论文证明外部索引可以替换以更新知识，并在其特定开放域问答、生成和事实核验实验中优于相应基线；这不是“任何 RAG 都能消灭幻觉”的普遍保证。[模型、训练与实验细节](https://arxiv.org/html/2005.11401#S2)

### 1.2 必须在正文中澄清的边界

今天工程上常见的“先检索若干 chunk，再拼入 prompt 调一次聊天模型”继承了检索增强的思想，但通常：

- 不把文档作为隐变量进行概率边缘化；
- 不联合训练检索器与生成器；
- 可能使用 BM25、向量数据库、SQL、图数据库、网页/API 等任意数据源；
- 还可能增加查询改写、融合、重排、压缩、校验和循环。

因此可以用原始论文解释 RAG 的来源和“参数化记忆 + 可更新外部记忆”这一核心，但不能把论文里的 RAG-Token/RAG-Sequence 公式直接说成现代所有 RAG 应用的执行过程。

## 2. 从 Naive RAG 到 Modular RAG

《Modular RAG》把现代系统拆为三级：模块、子模块、operator，并用计算图统一描述。顶层包含六类模块：[论文全文](https://arxiv.org/html/2407.21059)

1. **Indexing**：chunk 优化、层级/图等结构组织；
2. **Pre-retrieval**：query expansion、query transformation、query construction；
3. **Retrieval**：retriever 选择与微调；
4. **Post-retrieval**：rerank、compression、selection；
5. **Generation**：生成器微调与输出 verification；
6. **Orchestration**：routing、scheduling、fusion。

论文归纳的流程形态比“检索一次再生成一次”更完整：

- **Linear**：预处理 → 检索 → 后处理 → 生成；
- **Conditional**：根据查询、风险或数据源选择其中一条路线；
- **Branching**：多查询/多检索器并行召回，或对多个检索结果并行生成后聚合；
- **Loop**：迭代、递归或自适应检索，由 judge/停止条件控制是否继续；
- 论文还讨论 retriever、generator 或二者联合的 tuning pattern。

该论文明确指出 Advanced RAG 是 Modular RAG 的特例，Naive RAG 又是 Advanced RAG 的特例。[模块和流程目录](https://arxiv.org/html/2407.21059#S4)

工程含义不是“一开始就把所有模块装齐”，而是先把解析、索引、检索、上下文、生成之间的接口和 trace 做清楚，再按失败样本增加改写、重排、路由或循环。每增加一次模型调用都同时增加成本、延迟和新的失败点。

## 3. 文档解析：工具定位与选择边界

PDF 保存的往往是字符绘制指令与坐标，而不是天然的段落、标题、表格或阅读顺序；扫描 PDF 甚至只有像素。pypdf 官方文档列出的段落换行、页眉页脚、表格、连字、图片文字等问题说明：“能提取字符”不等于“得到适合检索的语义文档”。[pypdf：Why Text Extraction is hard](https://pypdf.readthedocs.io/en/stable/user/extract-text.html#why-text-extraction-is-hard)

以下是工具的官方定位，不代表统一精度排名：

| 工具 | 官方能力边界 | 适合放在笔记中的定位 |
| --- | --- | --- |
| pypdf | PDF 操作和文本提取；不是 OCR 软件，无法从图片中识字 | 原生文本层清晰、布局简单时的轻量基线；复杂阅读顺序和扫描件需换工具。[官方文本提取说明](https://pypdf.readthedocs.io/en/stable/user/extract-text.html) |
| PyMuPDF4LLM | 本地将 PDF 转为 Markdown/JSON/TXT，支持布局分析、多栏、表格、图像、page chunks，并能自动只对缺少可选文本的页面触发 OCR | 重视速度、隐私和本地运行时的强基线；JSON 可保留 bbox/layout，表格质量仍受原 PDF 结构影响。[官方文档](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/) |
| Unstructured | 先 partition 为 Title、NarrativeText、ListItem、Table 等 element，再依据 element 和 metadata 分块；支持 `basic`、`by_title`、`by_page`、`by_similarity` 等策略 | 多文件格式统一接入、希望保留 element/metadata 并做结构化分块时使用；它不是简单的纯字符串切割器。[Document elements](https://docs.unstructured.io/api-reference/legacy-api/partition/document-elements)、[Chunking strategies](https://docs.unstructured.io/api-reference/partition/chunking) |
| Docling | 把 PDF、Office、HTML、图片等转换为统一 `DoclingDocument`，识别布局、阅读顺序、表格、公式和 OCR，可导出 Markdown/JSON；模型下载后可完全离线运行 | 复杂原生 PDF、表格、公式、布局和本地部署场景；结构化对象比只保留最终 Markdown 更利于追溯。[官网](https://docling.ai/)、[DocumentConverter API](https://docling-project.github.io/docling/reference/document_converter/) |
| Marker | 官方仓库定位为把 PDF 快速转换为 Markdown、JSON、chunks 或 HTML，可处理表格、公式、图片、页眉页脚、OCR，并可选用 LLM 提升质量 | 偏 PDF→可读结构化文本的本地管线；启用 LLM 会改变成本、隐私和可复现性，不能与纯本地默认路径混为一谈。[官方仓库](https://github.com/datalab-to/marker) |
| MinerU | 当前官方仓库定位为面向 LLM/RAG/Agent 的复杂文档解析引擎，可将 PDF、Office、图片、网页等转为结构化 Markdown/JSON，并覆盖扫描件、多栏、公式、表格等 | 中英文、扫描件、学术论文等复杂文档可重点实测；输出仍要抽样验证阅读顺序、公式和跨页表格。[官方仓库](https://github.com/opendatalab/MinerU)、[原始论文](https://arxiv.org/abs/2409.18839) |
| PaddleOCR / PP-StructureV3 | OCR 与复杂文档解析工具链；PP-StructureV3 集成布局分析、元素识别、阅读顺序恢复、表格、公式、图表理解及 Markdown 输出 | 需要成熟 OCR、中文/多语言和结构恢复时的候选；单独 Tesseract/文字识别不能替代完整 layout pipeline。[官方教程](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/PP-StructureV3.en.md) |
| LlamaParse | 面向 PDF、演示文稿、Word、表格、图片等复杂文档的托管式解析能力，可处理表格、图表和图像；需要 LlamaCloud API key | 可以作为云端复杂解析器对比，但必须写清数据出域、费用和服务依赖。旧 `llama_cloud_services` 仓库已声明弃用，应迁到 `llama-cloud>=1.0`，不要复制过时导入路径。[官方 SDK 仓库](https://github.com/run-llama/llama_cloud_services)、[官方 Agent skill](https://github.com/run-llama/llamaparse-agent-skills) |
| pdfplumber | 从 PDF 对象中提取字符、词、线、矩形和表格，并提供 table finder 可视化调试 | 已知版式、希望用坐标/规则精调表格的工具，不是扫描 OCR 或通用语义解析器。[官方仓库](https://github.com/jsvine/pdfplumber) |
| Camelot | 专注 PDF 表格，提供 Stream、Lattice、Network、Hybrid 等解析器和 visual debugging；官方明确只适用于 text-based PDF | 单独抽取规则表格、需要 DataFrame/可视调参时使用；图片型扫描表格会返回零结果，应先 OCR 或使用文档视觉解析器。[官方文档](https://camelot-py.readthedocs.io/en/stable/)、[工作原理](https://github.com/camelot-dev/camelot/blob/master/docs/user/how-it-works.rst) |

### 3.1 解析后的验收项

解析器的选择不能只看一份漂亮 demo。实际应为不同文档类型建立小型验收集，检查：

- 标题层级和阅读顺序，特别是多栏与侧注；
- 表格行列、合并单元格、跨页表头和脚注；
- 公式是否保存为可读文本/LaTeX，变量是否丢失；
- 图片、caption、正文中的“见图”引用能否关联；
- 页眉页脚、页码、水印是否污染每个 chunk；
- `source/page/bbox/section/document_id` 是否随正文保存；
- 扫描件 OCR 的语言、旋转、低分辨率和乱码；
- 增量重跑是否产生稳定 ID，是否能删除旧 chunk。

这是工程验收建议，不是上述任何工具都承诺全部自动正确。

## 4. 分块：不是只调一个 chunk_size

### 4.1 基础与结构感知分块

LangChain 当前将 `RecursiveCharacterTextSplitter` 作为通用文本首选：默认依次尝试 `\n\n`、`\n`、空格和空字符串，尽量先保持段落、再保持句子和词。`chunk_size` 的单位由 `length_function` 决定，不天然等于 token；中文、日文和泰文等无空格边界语言应补充 `。`、`，`、`、`、全角标点或零宽空格等分隔符。[Recursive splitter 官方文档](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)

Markdown/HTML/代码已有结构时应优先利用结构。`MarkdownHeaderTextSplitter` 可把标题层级保存在每个块的 metadata，再对过大的 section 应用递归切分；这样比先抹平成纯文本再定长切割更易于定位和过滤。[Markdown header splitter](https://docs.langchain.com/oss/python/integrations/splitters/markdown_header_metadata_splitter)

LangChain `SemanticChunker` 的实现会分句、按 `buffer_size` 合并相邻句、嵌入这些窗口，计算相邻窗口余弦距离，再按 percentile、standard deviation、interquartile 或 gradient 阈值切断。它需要额外 embedding 成本，且不是硬性的最大 token 约束。更重要的是，2026 年官方 `langchain-experimental` 仓库已经归档；正文可以讲算法，不宜把它写成当前稳定核心组件。[官方源码与归档状态](https://github.com/langchain-ai/langchain-experimental/blob/main/libs/experimental/langchain_experimental/text_splitter.py)

### 4.2 小块检索，大块生成（父子块）

小块语义更集中，较容易命中；大块给生成器的上下文更完整。LangChain 的 `ParentDocumentRetriever` 把 child chunk 存入向量库，把 parent 存入 docstore；检索先命中 child，再用 `doc_id` 返回其 parent。parent 可以是整个原文，也可以是比 child 更大的 chunk。[官方源码](https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/retrievers/parent_document_retriever.py)

正文必须强调两点：

- 被嵌入、用于召回的是 child；真正发给生成器的是 parent；
- 同一个 parent 被多个 child 命中时必须按稳定 ID 去重，否则会浪费上下文窗口。

当前该实现位于 `langchain_classic`，适合用来说明模式，不要暗示这是 LangChain v1 core 的新 API。

### 4.3 句子窗口

LlamaIndex 的 `SentenceWindowNodeParser` 把文档拆成单句 node，并在 metadata 中保存该句两侧的窗口（默认每侧 3 句）。工程模式是：用短句做精确 embedding/召回，再在生成前用 metadata replacement 换成周围窗口。[官方源码](https://github.com/run-llama/llama_index/blob/main/llama-index-core/llama_index/core/node_parser/text/sentence_window.py)

它不是简单的重叠切块：检索文本与最终上下文是两个粒度。风险是单句太短、指代不完整，或窗口跨越标题/段落边界，因此仍需按语料评估。

### 4.4 层级块、自动合并和多向量

LlamaIndex 的 `HierarchicalNodeParser` 可把文档递归切为多层父子 node；默认源码示例层级为 2048、512、128 token 左右，并把层级平铺返回、通过 parent/child 关系连接。[HierarchicalNodeParser 源码](https://github.com/run-llama/llama_index/blob/main/llama-index-core/llama_index/core/node_parser/relational/hierarchical.py)

`AutoMergingRetriever` 先检索叶子块；当同一 parent 的已命中 child 占比超过阈值时，用 parent 替换这些 child，并可继续向上合并。[AutoMergingRetriever 源码](https://github.com/run-llama/llama_index/blob/main/llama-index-core/llama_index/core/retrievers/auto_merging_retriever.py)

LangChain `MultiVectorRetriever` 允许一个 parent 对应多个向量表示。典型表示可以是：多个小块、摘要、标题、为该文档生成的假设问题；这些 representation 共享 parent ID，向量搜索命中任意 representation 后，返回 docstore 中的原始 parent。[官方源码](https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain_classic/retrievers/multi_vector.py)

“多向量”在这里是“一个逻辑文档有多个检索表示”，不是指 embedding 本身只是高维向量，也不自动等同于多模态。

### 4.5 分块调参应观察什么

不应从一个流传的 `512/64` 数字直接定案。至少按查询类型观察：

- 检索：Recall@k、MRR/nDCG、命中块是否含完整证据；
- 上下文：重复率、parent 膨胀率、最终 token 数、关键证据是否被截断；
- 生成：faithfulness、正确性、引用定位；
- 系统：索引量、embedding 成本、检索和 rerank 延迟。

同一语料可以并存多种粒度，但每多一种表示都会扩大索引并使去重、版本、删除与评估更复杂。

## 5. FAISS、Milvus、Qdrant：不是同一层产品

### 5.1 FAISS

FAISS 是高效 dense-vector 相似搜索和聚类库，不是带文档服务、租户权限、全文检索和完整运维能力的向量数据库。[官方仓库](https://github.com/facebookresearch/faiss)

- `IndexFlatL2` / `IndexFlatIP`：穷举精确搜索，不需训练，适合小数据和 ground-truth 基线；归一化向量配 inner product 可做 cosine。
- `IndexIVFFlat`：先训练 coarse quantizer，把向量分入 `nlist` 个桶，查询只探测 `nprobe` 个桶。即使桶内使用原始向量，只要未扫描全部桶，整体仍是近似检索。
- `IndexHNSWFlat`：图索引；`M` 增大会增加连边和内存，`efConstruction`、`efSearch` 分别控制建图和查询搜索宽度。
- SQ、PQ、IVFPQ、OPQ 等用更高距离误差换更低内存/带宽；量化不是无损压缩。
- Flat index 默认以插入顺序作为 ID；要保存业务自定义 ID，通常用 `IndexIDMap` 等包装器。
- FAISS 可用 shard、`OnDiskInvertedLists` 等处理超出 RAM 的索引，但运行时 I/O 会成为代价，也不会因此获得数据库的事务、权限、文档存储和集群运维能力。[超内存索引说明](https://github.com/facebookresearch/faiss/wiki/Indexes-that-do-not-fit-in-RAM)

索引选择应按精确度、查询次数、RAM、构建成本和目标延迟压测；需要 exact ground truth 时先使用 Flat。[官方索引选择指南](https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index)、[索引总览](https://github.com/facebookresearch/faiss/wiki/Faiss-indexes)

### 5.2 Milvus

Milvus 在 ANN 索引之上提供持久化、标量过滤、稀疏向量、BM25 和多路 hybrid search。[Index Explained](https://milvus.io/docs/index-explained.md)

- `FLAT` 是精确基线；`IVF_FLAT` 的 `nprobe` 越大通常召回越高、延迟越大；`IVF_SQ8`、`IVF_PQ` 进一步节省内存但引入距离误差。
- `HNSW` 的 `M`、`efConstruction`、查询 `ef` 分别影响 RAM、构建时间、延迟与召回，不能笼统称为“永远比 IVF 快”。[HNSW 官方文档](https://milvus.io/docs/hnsw.md)
- `DiskANN` 面向原始向量主要在 SSD、以内存保存辅助结构的场景；它与给常规内存索引简单开启 mmap 不是一个概念。
- BM25 路径用 analyzer 与 BM25 function 把原始文本生成内部 sparse representation，再通过 `SPARSE_INVERTED_INDEX` 检索。[全文检索](https://milvus.io/docs/full-text-search.md)
- Hybrid search 以多个 `AnnSearchRequest` 分别召回 dense/sparse 等结果，再用 `WeightedRanker` 或 `RRFRanker` 融合；不是把不可比的原始分数裸相加。[Hybrid reranking](https://milvus.io/docs/reranking.md)
- `WeightedRanker` 会先把不同距离/相似度映射到可组合范围后加权；`RRFRanker` 只使用名次。二者应根据有标注验证集的结果选择。

### 5.3 Qdrant

Qdrant 同时维护 dense HNSW、sparse inverted index 和 payload index；查询规划器可在 HNSW 与 full scan 间选择。Payload index 不只是过滤后处理，它还帮助估计过滤基数；Qdrant 的 filterable HNSW 会基于已建立的 payload index 添加额外边。[Indexing 官方文档](https://qdrant.tech/documentation/manage-data/indexing/)

- 一个 point 可配置多个 named vector，例如 dense 和 sparse。
- Query API 的 `prefetch` 可先执行多个子查询，再由主查询做 RRF、DBSF、重排或下一阶段查询，并支持嵌套。[Hybrid and Multi-Stage Queries](https://qdrant.tech/documentation/search/hybrid-queries/)
- RRF 只看名次；DBSF 根据每路结果的分数分布归一化后融合。没有评测集且异构分数不可比时，RRF 通常更稳健；有标注集时可调 weighted RRF；相信原始分数分布时才考虑 DBSF。
- 官方建议在导入大量数据前创建用于向量过滤的 payload index；后创建时需重建 HNSW，才能充分形成 filter-aware edges。[Payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- Dense vector、HNSW、sparse index、payload 与 payload index 可以分别配置内存/磁盘层级；量化向量可用于内存初筛，再读取原始向量重算候选。[Memory tiers](https://qdrant.tech/documentation/ops-configuration/memory-tiers/)
- Qdrant 的 full-text index 首先是 payload text filtering 能力，核心仍是向量检索，不能等同于完整 Elasticsearch 类全文平台。
- 大 offset 时每个 `prefetch.limit` 必须覆盖最终 `limit + offset`；分布式多 shard 需要全局融合时，fusion 应在顶层主 query。

### 5.4 简化选型

- 单机实验、需要自己掌控全部 pipeline：FAISS。
- 需要在线服务、持久化、元数据过滤、dense+sparse 原生协作：Milvus 或 Qdrant，再按数据量、部署和查询特征压测。
- 名称不能替代基准测试：必须用本语料、本硬件、真实过滤比例与 top-k 测 recall、P95/P99、内存、构建和更新成本。

## 6. 混合检索与 RRF

Dense 检索擅长语义近似，BM25/sparse 擅长精确词、专名、型号、错误码和罕见 token。混合检索的完整流程应是：各路独立召回较宽的候选池 → 统一 ID/去重 → 融合 → 可选语义 rerank → 截断最终 top-k。

Reciprocal Rank Fusion（RRF）只使用名次：

$$
\operatorname{RRF}(d)=\sum_{r \in R,\,d \in r}\frac{1}{k+\operatorname{rank}_r(d)}
$$

同一文档在多路列表中都靠前时分数累加。因为不比较 dense cosine 与 BM25 的原始分数量纲，RRF 是没有可靠分数校准时的稳健基线。[SIGIR 2009 原始论文](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)

必须保留的限制：

- RRF 是 rank fusion，不是会阅读 query-document 的语义 reranker；
- 它无法找回所有召回器都漏掉的文档；
- 它丢弃原始分数间距，弱召回器仍可能引入噪声；
- 候选池太浅时，RRF 无法利用被截掉的结果；
- dense 与 sparse 必须使用统一稳定的 document/chunk ID；
- RRF 和 MRR 不同：前者是单次查询的排序融合，后者是跨查询的评估指标。

原论文实验使用 `k=60`，Milvus 也默认 60；但 Qdrant 当前实现的默认和平滑/排名约定不同。不要把 60 写成算法定律，应在固定候选深度下用验证集调参。[Milvus RRFRanker](https://milvus.io/docs/rrf-ranker.md)、[Qdrant Hybrid Queries](https://qdrant.tech/documentation/search/hybrid-queries/)

## 7. 评估：Ragas 指标与 Phoenix 观测

### 7.1 Ragas 的指标到底在测什么

| 指标 | 核心问题 | 重要边界 |
| --- | --- | --- |
| Context Precision | 有用 chunk 是否排在无用 chunk 前 | 当前实现可为 rank-aware AP 类指标，不等于简单的 relevant/k。[官方文档](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/) |
| Context Recall | reference 所需信息有多少被 retrieved contexts 覆盖 | LLM 版本用 reference claims 作代理，需要 reference；不等同传统文档级 Recall@k。[官方文档](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/) |
| Faithfulness | 回答 claims 能否由检索上下文推出 | 高分只代表忠实于 context；如果 context 本身错误，回答仍可能事实错误。[官方文档](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) |
| Response Relevancy | 回答是否切题、少冗余 | 通过回答反向生成问题并计算 embedding 相似度；不校验事实或 grounding。[官方文档](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/) |
| Noise Sensitivity | 无关/相关噪声是否诱发错误 claims | 通常越低越好，方向与多数“越高越好”指标不同。[官方文档](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/noise_sensitivity/) |

原始 RAGAs 论文称其为 reference-free framework，不能由此推导“Ragas 当前所有指标都不需要 ground truth”。当前 Context Recall 等明确需要 reference，工具也已扩展出 ID-based、agent/tool、SQL、自定义 rubric 等更多指标。[EACL 2024 原始论文](https://aclanthology.org/2024.eacl-demo.16/)、[当前 metrics 总览](https://docs.ragas.io/en/stable/concepts/metrics/)

Faithfulness 的典型计算是把回答拆成 claims，再判断可由 context 支持的 claims 比例；Context Recall 则把 reference 拆成 claims，判断检索上下文覆盖的比例。Response Relevancy 会从回答反向生成若干问题，再比较其 embedding 与原问题的余弦相似度。三者输入和失败含义不同，不能互相替代。当前文档正在推荐新的 `ragas.metrics.collections` API，示例代码应锁定 Ragas 版本，不要混用不同大版本导入路径。

LLM judge 受模型、prompt、语言、claim decomposition 和随机性影响；embedding 指标受 embedding 模型影响。回归评测应固定模型、温度、prompt、依赖版本和数据集版本，并用人工标注样本校准。不要把方向和含义不同的指标简单平均成唯一“RAG 总分”。

### 7.2 Phoenix 的角色

Phoenix 是开源 AI observability 与 evaluation 平台。Tracing 基于 OpenTelemetry；一次端到端请求形成 trace，内部可有 `RETRIEVER`、`RERANKER`、`LLM`、`EMBEDDING`、`AGENT`、`TOOL` 等嵌套 span。[Phoenix 官方文档](https://arize.com/docs/phoenix/)、[Tracing 概念](https://arize.com/docs/phoenix/learn/tracing)

RAG trace 至少应保存：原 query 和改写 query、召回文档 ID/分数/耗时、rerank 输入输出、最终 context、LLM prompt/response/token/延迟/错误，以及贯穿全链路的 trace ID。

Phoenix 可运行确定性 evaluator、LLM-as-a-judge、人工 annotation、用户反馈及 Ragas 结果；dataset 支持版本化，experiment 可在同一数据集和评估准则下比较 prompt、模型或检索配置。[Evaluation](https://arize.com/docs/phoenix/evaluation/evals)、[Datasets and experiments](https://arize.com/docs/phoenix/learn/datasets-and-experiments/datasets-concepts)、[Ragas 集成](https://arize.com/docs/phoenix/integrations/evaluation-integrations/ragas)

需要明确：

- trace 回答“发生了什么”，eval 回答“是否足够好”；可观测性本身不证明正确性；
- LLM judge 的调用也需要 trace 与校准；
- 平均分会掩盖长尾，应按语言、查询类型、文档类型、租户和 route 切片；
- trace 可能含私有文档和完整 prompt，必须考虑脱敏、权限、保留周期与数据边界；
- 同一测试集反复调参会过拟合，应保留独立测试集并版本化生产失败样本。
- Phoenix OSS 的 trace/eval/experiment 与 Arize AX 的托管式持续在线监控和告警不是完全相同的产品范围，不应把两者能力混写。

## 8. GraphRAG

Microsoft GraphRAG 不是“把向量库换成 Neo4j”的同义词。其标准索引管线用 LLM 从 TextUnit 提取实体、关系和 claims，对实体图做 Leiden 层级社区发现，为不同层级生成社区摘要/报告，并写出 Parquet 与向量表示。[GraphRAG 索引概览](https://microsoft.github.io/graphrag/index/overview/)

官方查询模式包括：

- **Local Search**：以与查询语义相关的实体作为入口，组合实体、邻接关系、community report 和关联原文 text chunks，适合具体实体及其关系问题；
- **Global Search**：在某一社区层级的 AI 生成 reports 上做 map-reduce，适合“整个语料的主要主题是什么”之类全局聚合问题，但资源开销更高；
- **DRIFT Search**：把 community 信息加入 local search 的起点，并据此提出详细后续问题，扩大事实覆盖；
- **Basic Search**：提供基准式 top-k vector RAG，便于对照。

来源：[GraphRAG 项目概览](https://microsoft.github.io/graphrag/)、[Query Engine Overview](https://microsoft.github.io/graphrag/query/overview/)、[Local Search](https://microsoft.github.io/graphrag/query/local_search/)、[Global Search](https://microsoft.github.io/graphrag/query/global_search/)

工程边界：

- 适合跨文档实体关系、多跳路径和 corpus-level 主题聚合；单点事实定位通常先用文本 hybrid RAG 更简单；
- 索引包含多次 LLM 抽取和摘要，构建/增量更新成本显著高于普通 chunk embedding（依据官方数据流作出的工程判断）；
- 图和社区报告是 AI 生成的派生数据，不应丢掉指向原始 TextUnit/source 的 provenance；
- 实体别名、同名实体、时间版本、关系方向和错误三元组会直接污染图检索；
- 官方也建议针对自己的数据做 prompt tuning，不能把默认 prompt 当成通用最优配置。[官方 Prompt Tuning 提示](https://microsoft.github.io/graphrag/)

## 9. Agentic RAG

Agentic RAG 的实用定义是：给检索流程增加显式控制层，让模型/工作流动态决定是否检索、选哪个工具或数据源、如何改写/拆解查询、证据是否足够、要不要继续，并在最后基于证据生成。常见设计模式包括 reflection、planning、tool use 和多 agent 协作。[Agentic RAG 调研论文](https://arxiv.org/html/2501.09136)

LangGraph 官方教程给出一个可审查的最小闭环：

1. 模型决定直接回答还是调用 retriever tool；
2. 检索后 relevance grader 判断文档是否相关；
3. 相关则 grounded generation；
4. 不相关则 rewrite question 并回到检索；
5. 图上的 conditional edges 明确表达分支和循环。

[LangGraph 官方 Agentic RAG 教程](https://docs.langchain.com/oss/python/langgraph/agentic-rag)

Agentic RAG 与 Modular RAG 有交集：带 routing、judge 和 loop 的 modular flow 已经具备 agentic 特征。无需把每个条件分支都营销成“自主 Agent”；更重要的是控制权、状态、工具、反馈和停止规则是否明确。

生产实现必须补上教程之外的约束：

- 最大轮数、递归深度、token/费用/时间预算；
- 工具 allowlist、租户权限和数据源 ACL，检索不能绕过用户权限；
- query、tool input/output、grader、改写与最终证据的全 trace；
- 去重和循环检测，防止同义改写无限重试；
- 检索失败、工具失败、超时和证据冲突时的 fallback/拒答；
- 把检索到的文档视为不可信数据，隔离其中的 prompt injection；
- 单独评估 route accuracy、tool success、迭代次数、最终 groundedness、延迟和成本。

简单 FAQ 或稳定单知识库问答通常继续使用固定 RAG，能得到更低延迟、更高可预测性；只有真实查询需要多步探索、多数据源选择或动态补证据时，Agentic RAG 的额外复杂度才更容易回本。这是工程选型判断，不是“Agentic 一定优于传统 RAG”的论文保证。

## 10. 可直接带入最终笔记的总纲

一条不丢关键内容、又不堆工具名的主线应是：

1. 先解释原始 RAG 的参数化/非参数化记忆，再澄清现代工程式 RAG 的泛化；
2. 离线链路完整覆盖采集、解析、清洗、结构恢复、分块、metadata/ACL、embedding、索引、版本与增量更新；
3. 在线链路完整覆盖 query 理解、改写/拆解、路由、dense+sparse 召回、过滤、融合、rerank、上下文压缩/组装、生成、引用、校验与拒答；
4. 分块同时讲固定/递归、结构感知、语义、父子、句窗、层级/自动合并和多向量，而不是只给一个 chunk size；
5. 索引同时讲 Flat ground truth、IVF、HNSW、SQ/PQ、磁盘/内存权衡，并区分 FAISS 库与向量数据库；
6. 评估拆成检索、上下文、生成、端到端和系统指标，用 versioned dataset 做回归，用 trace 定位具体失败阶段；
7. GraphRAG 与 Agentic RAG 放在“问题形态确实需要时再增加复杂度”的进阶层，而不是默认替代基础 RAG。
