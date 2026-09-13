---
description: 三个本地仓库的 RAG 来源、固定版本、图片归属和逐章覆盖矩阵，用于核对合并笔记没有遗漏原有主题。
---

# 来源与覆盖清单

这套笔记不是逐句复制，而是以三仓库内容为主干，合并重复概念、保留互补经验，并将事实、项目示例和工程建议分开。此页给出可核对的来源矩阵。

## 1. 固定来源版本

| 来源 | 本地读取版本 | 主要贡献 |
| --- | --- | --- |
| [left0ver/knowledge-center](https://github.com/left0ver/knowledge-center/tree/847dfb84bc0a48639c7983a9aa5d81d1093c5efa/src/Agent) | `847dfb84bc0a48639c7983a9aa5d81d1093c5efa` | PDF 工具实测、表格、细粒度分块、Milvus 混合检索、多向量、索引、查询与检索前后处理 |
| [datawhalechina/all-in-rag](https://github.com/datawhalechina/all-in-rag/tree/583a61b09869bc3afc4552289171f6ec188f2c76/docs) | `583a61b09869bc3afc4552289171f6ec188f2c76` | 从入门到 Modular RAG 的系统课程、结构化生成、评估、GraphRAG、Agentic RAG、两个食谱项目 |
| [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents/blob/4f7682ceafe573d07cd8a7d0b89908500e83227d/docs/chapter8/%E7%AC%AC%E5%85%AB%E7%AB%A0%20%E8%AE%B0%E5%BF%86%E4%B8%8E%E6%A3%80%E7%B4%A2.md) | `4f7682ceafe573d07cd8a7d0b89908500e83227d` | RAGTool、四类智能体记忆、Qdrant/Neo4j/SQLite、MQE/HyDE、带记忆的 PDF 学习助手 |

阅读时间为 2026-09-13。后续仓库更新不会自动进入本笔记，需要重新比较上述提交后的差异。

## 2. knowledge-center 覆盖

原文 `src/Agent/RAG.md` 的全部一级主题均已纳入：

| 原主题 | 合并后的去向 |
| --- | --- |
| 文档加载；PDF 规则/深度学习解析；PDF 转 Markdown | [文档解析与分块](./document-loading-and-chunking.md) |
| 解析 Debug；Camelot、PDFPlumber、Unstructured、LlamaParse、ChatDoc | [文档解析与分块](./document-loading-and-chunking.md) |
| LangChain、Unstructured、Docling 分块 | [文档解析与分块](./document-loading-and-chunking.md) |
| 父子块、语义块、句子窗口 | [文档解析与分块](./document-loading-and-chunking.md)、[查询与检索优化](./query-and-retrieval-optimization.md) |
| Embedding、稀疏/稠密/混合、BM25 | [嵌入、向量库与索引](./embedding-vector-database-and-index.md) |
| Milvus 混合检索、多向量：父子/摘要/假设问题 | [查询与检索优化](./query-and-retrieval-optimization.md) |
| 层级检索、SelfQueryRetriever | [嵌入、向量库与索引](./embedding-vector-database-and-index.md)、[查询与检索优化](./query-and-retrieval-optimization.md) |
| FLAT、IVF、图索引、GPU、量化、Refiner、选型 | [嵌入、向量库与索引](./embedding-vector-database-and-index.md) |
| 改写、MultiQuery、RAG Fusion、Decomposition、Step-back、HyDE、Text2SQL、路由 | [查询与检索优化](./query-and-retrieval-optimization.md) |
| RRF、Bi-Encoder、ColBERT、Cross-Encoder、LLM/时间重排、压缩、LLMLingua、校正 | [查询与检索优化](./query-and-retrieval-optimization.md) |
| RAG 评估三角 | [生成与评估](./generation-and-evaluation.md) |

## 3. all-in-rag 逐文件覆盖

| 源文件 | 合并后的去向 |
| --- | --- |
| `chapter1/01_RAG_intro.md` | [总览与学习路线](./rag.md)、[生产实践](./production-practice.md) |
| `chapter1/02_preparation.md`、`03_get_start_rag.md`、`virtualenv.md` | [总览与学习路线](./rag.md)、[端到端项目](./end-to-end-projects.md) |
| `chapter2/04_data_load.md` | [文档解析与分块](./document-loading-and-chunking.md) |
| `chapter2/05_text_chunking.md` | [文档解析与分块](./document-loading-and-chunking.md) |
| `chapter3/06_vector_embedding.md` | [嵌入、向量库与索引](./embedding-vector-database-and-index.md) |
| `chapter3/07_multimodal_embedding.md` | [嵌入、向量库与索引](./embedding-vector-database-and-index.md) |
| `chapter3/08_vector_db.md` | [嵌入、向量库与索引](./embedding-vector-database-and-index.md) |
| `chapter3/09_milvus.md` | [嵌入、向量库与索引](./embedding-vector-database-and-index.md) |
| `chapter3/10_index_optimization.md` | [嵌入、向量库与索引](./embedding-vector-database-and-index.md)、[查询与检索优化](./query-and-retrieval-optimization.md) |
| `chapter4/11_hybrid_search.md` | [查询与检索优化](./query-and-retrieval-optimization.md) |
| `chapter4/12_query_construction.md` | [查询与检索优化](./query-and-retrieval-optimization.md) |
| `chapter4/13_text2sql.md` | [查询与检索优化](./query-and-retrieval-optimization.md) |
| `chapter4/14_query_rewriting.md` | [查询与检索优化](./query-and-retrieval-optimization.md) |
| `chapter4/15_advanced_retrieval_techniques.md` | [查询与检索优化](./query-and-retrieval-optimization.md) |
| `chapter5/16_formatted_generation.md` | [生成与评估](./generation-and-evaluation.md) |
| `chapter6/18_system_evaluation.md`、`19_common_tools.md` | [生成与评估](./generation-and-evaluation.md)、[生产实践](./production-practice.md) |
| `chapter7/20_kg_rag.md` | [GraphRAG](./graphrag.md) |
| `chapter7/21_agentic_rag.md` | [Agentic RAG 与记忆](./agentic-rag-and-memory.md) |
| `chapter8/01_env_architecture.md`～`04_generation_sys.md` | [端到端项目](./end-to-end-projects.md) |
| `chapter9/01_graph_rag_architecture.md`～`04_intelligent_query_routing.md` | [GraphRAG](./graphrag.md)、[端到端项目](./end-to-end-projects.md) |

## 4. hello-agents 第八章覆盖

| 源章节 | 合并后的去向 |
| --- | --- |
| 8.1 从认知科学到智能体记忆 | [Agentic RAG 与记忆](./agentic-rag-and-memory.md) |
| 8.2 记忆流程、MemoryTool、MemoryManager、四类记忆 | [Agentic RAG 与记忆](./agentic-rag-and-memory.md) |
| 8.3 RAG 基础、RAGTool、架构、高级检索 | [文档解析与分块](./document-loading-and-chunking.md)、[查询与检索优化](./query-and-retrieval-optimization.md) |
| 8.4 智能文档问答助手 | [端到端项目](./end-to-end-projects.md) |
| 8.5 总结展望 | [总览与学习路线](./rag.md)、[生产实践](./production-practice.md) |

练习题和大段逐行代码没有原样搬运；其涉及的知识点、关键参数、数据流、模块职责和实现边界已进入对应章节。要完整复现实验环境时，应以固定提交下的原仓库代码为准。

## 5. 图片来源

本专题没有生成新图片。`images/` 中：

- `all-in-rag-*`、`unstructured-*`、`chunking-*`、`embedding-*`、`milvus-*`、`graph-rag.svg` 等复制自 `all-in-rag/docs/chapter*/images/`；
- `hello-*` 复制自 `hello-agents/docs/images/8-figures/`；
- `knowledge-center-*` 从 `knowledge-center/src/Agent/RAG.md` 原文引用的 `img.leftover.cn` 地址下载并本地化；
- 早期已采用的 `advanced-rag-pipeline.webp`、`rag-triad.webp` 和 `agentic-rag.svg` 同样来自 `all-in-rag`。

这些图片随其原仓库的署名与许可要求使用。`all-in-rag` README 标明内容采用 CC BY-NC-SA 4.0；复用或再发布前仍应核对三个上游仓库当时的 LICENSE/README。

## 6. 一手资料补充原则

本地三仓库是正文主来源。一手资料只用于核对可能变化或容易误解的边界，例如框架 API、索引参数、RRF 定义、GraphRAG 官方架构和评估指标；不会用网络文章替代三仓库原有内容。详细核对记录见同目录的 `research-source-notes.md`。

