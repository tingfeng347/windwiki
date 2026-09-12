---
description: 模型部署 · 应用服务部署：中间件选型、代码托管、云服务器与 Docker Compose 部署流程。
---
# 应用服务部署说明

本文基于当前知识库的实际代码结构编写，适用于将项目部署到腾讯云 Linux 服务器。

- 当前业务主链路默认使用的是外部 API，而不是本机加载大模型
- 导入链路依赖：`MinerU API`、`DashScope/OpenAI 兼容 LLM`、`DashScope Embedding`、`Milvus`、`Neo4j`、`MinIO`
- 查询链路依赖：`DashScope/OpenAI 兼容 LLM`、`DashScope Embedding`、`DashScope Rerank`、`Milvus`、`Neo4j`、`MongoDB`

这意味着：

- 当前业务机不强依赖 GPU
- 只要服务器能够访问 `DashScope`、`MinerU` 等外部服务，就可以先把导入服务和查询服务部署起来
- 向量库、图数据库、对象存储、会话库建议通过 `Docker Compose` 统一编排



## 1. 整体部署流程

建议按照下面的顺序部署：

1. 在本地整理代码，确保仓库已经推送到 `Gitee`
2. 购买腾讯云服务器，推荐 `Ubuntu 22.04`
3. 在服务器上安装 `git`、`docker`、`docker compose`
4. 从 `Gitee` 拉取项目代码到服务器
5. 编写生产环境配置文件，例如 `.env.prod`
6. 基于当前项目编写导入服务和查询服务的镜像构建文件
7. 编写 `docker-compose.yml`，统一编排：
   - `kb-import`
   - `kb-query`
   - `milvus`
   - `mongodb`
   - `neo4j`
   - `minio`
8. 先启动基础中间件，再启动业务服务
9. 通过接口和容器日志做健康检查
10. 后续通过 `docker compose up/down/restart/logs` 维护服务

推荐的部署目录：

```bash
/data/atguigu_knowledge_base_02
```

推荐的目录结构：

```text
/data/atguigu_knowledge_base_02/
├── atguigu_knowledge_base_02/     # 项目代码
├── volumes/                       # 数据卷
│   ├── mongo/
│   ├── neo4j/
│   ├── minio/
│   ├── etcd/
│   └── milvus/
└── logs/
```

版本与安装方式建议如下。

### 1.1 中间件安装方式和版本

结合你提供的参考文档，建议如下：

- `Milvus`：使用 `Docker Compose` 安装
- `Milvus` 版本：`milvusdb/milvus:v2.4.0`
- `etcd` 版本：`quay.io/coreos/etcd:v3.5.0`
- `MinIO` 版本：`minio/minio:RELEASE.2023-03-20T20-16-18Z`
- `MongoDB`：使用 `Docker` 安装
- `MongoDB` 参考版本：参考文档是 `mongo:latest`，生产环境更建议固定到 `mongo:7.0`
- `Neo4j`：使用 `Docker` 安装
- `Neo4j` 版本：`neo4j:5.15.0-community`

### 1.2 端口建议

建议区分“公网开放端口”和“仅内网使用端口”。

公网建议只开放：

- `22`：SSH
- `8000`：导入服务
- `8001`：查询服务

按需开放或仅限白名单开放：

- `7474`：Neo4j Browser
- `7687`：Neo4j Bolt
- `9001`：MinIO Console

尽量不要直接暴露到公网：

- `27017`：MongoDB
- `19530`：Milvus
- `2379`：etcd
- `9000`：MinIO API

---

## 2. 代码上传到 Gitee 上

如果本地代码还没有上传到 `Gitee`，可以按下面操作。

### 2.1 新建 Gitee 仓库

在 Gitee 上新建一个空仓库，例如：

```text
https://gitee.com/windyzj/atguigu_knowledge_base_02.git
```

### 2.2 将本地项目提交到远端

提交到本地仓库

![image-20260331110102181](./images/image-20260331110102181.png)

push到远端

### ![image-20260331110339125](./images/image-20260331110339125.png)

---

## 3. 购买腾讯云服务器并安装 Git、Docker

以下步骤以 `Ubuntu 22.04` 为例。

### 3.1 购买服务器建议

如果你保持当前代码方案不变，也就是继续调用外部 API，那么业务机可以先按下面规格选择：

- `2核4G` 或 `4核8G`
- 系统盘至少 `50GB`
- 系统选 `Ubuntu 22.04`

 ![image-20260515203148542](./images/image-20260515203148542.png)

![image-20260515203214085](./images/image-20260515203214085.png)

![image-20260515203651073](./images/image-20260515203651073.png)

![image-20260515203709543](./images/image-20260515203709543.png)

![image-20260515203801776](./images/image-20260515203801776.png)

![image-20260515203836477](./images/image-20260515203836477.png)

![image-20260515204011196](./images/image-20260515204011196.png)

![image-20260515204120008](./images/image-20260515204120008.png)

![image-20260515204349294](./images/image-20260515204349294.png)

![image-20260515204559175](./images/image-20260515204559175.png)

![image-20260515204611752](./images/image-20260515204611752.png)

![image-20260515204648097](./images/image-20260515204648097.png)

注意要用公网地址远程登录到服务器其上用命令行操作

![image-20260515204820736](./images/image-20260515204820736.png)

### 3.2 安装 Git

```bash
sudo apt update
sudo apt install -y git
git --version
```

### 3.3 安装 Docker 和 Docker Compose

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings

curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] http://mirrors.aliyun.com/docker-ce/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version
docker compose version
```

### 3.4 配置当前用户使用 Docker

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

### 3.5 镜像加速配置

进行镜像源的配置

```bash
sudo vi /etc/docker/daemon.json
```

添加下面的配置

```bash
{
  "registry-mirrors": [
   "http://hub-mirror.c.163.com",
   "https://mirror.ccs.tencentyun.com",
   "https://phtv51hj.mirror.aliyuncs.com",
   "https://docker.m.daocloud.io",
   "https://dockerproxy.com"
  ]
}
```

保存，然后在终端重新启动一下docker

```bash
#更新配置
systemctl daemon-reload

systemctl restart docker
```

重新执行

### 3.6 从 Gitee 拉代码

```bash
sudo mkdir -p ~/app
cd ~/app
sudo git clone https://gitee.com/windyzj/xxxx.git

```

## 4. 编写导入和查询服务的 Dockerfile

### 4.1 先说明当前项目最适合的做法

从当前工程结构来看：

- 导入服务和查询服务都属于 Python FastAPI 服务
- 二者的依赖几乎完全一致
- 主要区别只是启动入口不同

因此不建议维护两份完全重复的 Dockerfile，推荐保留一份公共 Dockerfile，然后在 `docker compose` 里通过不同的 `command` 区分导入服务和查询服务。

当前仓库已经有 `deploy/Dockerfile`，生产环境建议直接基于项目根目录的 `requirements.txt` 安装依赖，不再在 Dockerfile 里手写一长串 `pip install` 包列表。

### 4.2 推荐的公共 Dockerfile

可在项目中使用下面的内容作为 `deploy/Dockerfile`：

```dockerfile
FROM python:3.11-slim

ARG PIP_INDEX_URL=https://mirrors.cloud.tencent.com/pypi/simple

ENV PIP_ROOT_USER_ACTION=ignore \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=300 \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PYTHONPATH=/app

WORKDIR /app

RUN sed -i 's|http://deb.debian.org/debian|http://mirrors.tencentyun.com/debian|g; \
            s|http://deb.debian.org/debian-security|http://mirrors.tencentyun.com/debian-security|g' \
            /etc/apt/sources.list.d/debian.sources && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        git \
        libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY deploy/requirements.txt /app/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    python -m pip install --upgrade pip setuptools wheel

RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    python -m pip install --retries=10 -r /app/requirements.txt

COPY knowledge /app/knowledge

# 创建运行过程中会用到的临时目录和日志目录
RUN mkdir -p /app/temp-files /app/logs

# 暴露服务可能使用的端口
EXPOSE 8000 8001

# 启动查询服务，监听 8001 端口
CMD ["python", "-m", "uvicorn", "knowledge.api.query_router:create_app", "--factory", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]

```

把这段代码上传到git 并执行更新

```bash
sudo git pull
```

![image-20260331144704905](./images/image-20260331144704905.png)

### 5. 编写 Docker Compose 脚本

### 5.1 生产环境组件

推荐把下面几个组件统一放进 `docker-compose.yml`：

- `kb-import`
- `kb-query`
- `etcd`
- `minio`
- `Milvus`（standalone）
- `mongodb`
- `neo4j`

### 5.2  `docker-compose.yml`

在deploy目录下增加docker-compose.yml

```yaml
services:
  # etcd 是 Milvus 的元数据存储组件
  etcd:
    image: quay.io/coreos/etcd:v3.5.0
    container_name: milvus-etcd
    restart: always
    environment:
      # 自动压缩历史版本，避免 etcd 数据无限膨胀
      ETCD_AUTO_COMPACTION_MODE: revision
      ETCD_AUTO_COMPACTION_RETENTION: "1000"
      # 限制后端存储大小，防止占满磁盘
      ETCD_QUOTA_BACKEND_BYTES: "4294967296"
      ETCD_SNAPSHOT_COUNT: "50000"
    command:
      - etcd
      - -advertise-client-urls=http://etcd:2379
      - -listen-client-urls
      - http://0.0.0.0:2379
      - --data-dir
      - /etcd
    volumes:
      # 持久化 etcd 数据
      - ./volumes/etcd:/etcd
    networks:
      - kb-net

  # MinIO 用于存储上传的原始文件、图片等对象数据
  minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    container_name: kb-minio
    restart: always
    environment:
      # 管理员账号密码，生产环境请务必修改
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
      # 兼容旧版本变量名，部分组件会读取这组值
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    # 9000 是对象存储接口，9001 是 MinIO 控制台
    command: minio server /minio_data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      # 持久化对象文件
      - ./volumes/minio:/minio_data
    healthcheck:
      # 检查 MinIO 服务是否存活
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - kb-net

  # Milvus 单机版向量数据库，依赖 etcd 和 MinIO
  milvus:
    image: milvusdb/milvus:v2.4.0
    container_name: milvus-standalone
    restart: always
    command: ["milvus", "run", "standalone"]
    environment:
      # 指定 Milvus 依赖的 etcd 和 MinIO 地址
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
      MINIO_ACCESS_KEY_ID: minioadmin
      MINIO_SECRET_ACCESS_KEY: minioadmin
    ports:
      # 19530 为 Milvus 服务端口，9091 常用于监控/管理
      - "19530:19530"
      - "9091:9091"
    volumes:
      # 持久化 Milvus 数据文件
      - ./volumes/milvus:/var/lib/milvus
    depends_on:
      - etcd
      - minio
    networks:
      - kb-net

  # MongoDB 用于保存业务结构化数据
  mongodb:
    image: mongo:7.0
    container_name: kb-mongodb
    restart: always
    environment:
      # 初始化 root 账号，生产环境建议改为强密码
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: 123123
    ports:
      - "27017:27017"
    volumes:
      # 持久化 MongoDB 数据
      - ./volumes/mongo:/data/db
    networks:
      - kb-net

  # Neo4j 用于保存图谱关系数据
  neo4j:
    image: neo4j:5.15.0-community
    container_name: kb-neo4j
    restart: always
    environment:
      # 初始登录账号密码，格式为 用户名/密码
      NEO4J_AUTH: neo4j/123123123
    ports:
      # 7474 是 Web 控制台端口，7687 是 Bolt 协议端口
      - "7474:7474"
      - "7687:7687"
    volumes:
      # 分别持久化数据、日志、配置和插件目录
      - ./volumes/neo4j/data:/data
      - ./volumes/neo4j/logs:/logs
      - ./volumes/neo4j/conf:/conf
      - ./volumes/neo4j/plugins:/plugins
    networks:
      - kb-net

  # 导入服务：负责文件上传、解析、切分、入库等流程
  kb-import:
    build:
      # 基于项目根目录上下文构建镜像
      context: ..
      dockerfile: deploy/Dockerfile
    # 与查询服务共用同一套镜像，仅启动命令不同
    image: atguigu-kb-app:latest
    container_name: kb-import
    restart: always
    env_file:
      # 统一加载生产环境变量
      - .env.prod
    # 启动导入接口，监听 8000 端口
    command: ["python", "-m", "uvicorn", "knowledge.api.import_router:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
    ports:
      - "8000:8000"
    volumes:
      # 挂载临时文件和日志目录，便于宿主机查看与持久化
      - ./temp-files:/app/temp-files
      - ./logs:/app/logs
    depends_on:
      # 导入流程依赖对象存储、向量库、图数据库和文档库
      - minio
      - milvus
      - neo4j
      - mongodb
    networks:
      - kb-net

  # 查询服务：负责检索、召回、重排和问答接口
  kb-query:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
    image: atguigu-kb-app:latest
    container_name: kb-query
    restart: always
    env_file:
      - .env.prod
    # 启动查询接口，监听 8001 端口
    command: ["python", "-m", "uvicorn", "knowledge.api.query_router:create_app", "--factory", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
    ports:
      - "8001:8001"
    volumes:
      - ./temp-files:/app/temp-files
      - ./logs:/app/logs
    depends_on:
      - minio
      - milvus
      - neo4j
      - mongodb
    healthcheck:
      # 通过健康检查接口确认查询服务已经可用
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - kb-net

networks:
  # 自定义桥接网络，保证各容器可以通过服务名互相访问
  kb-net:
    driver: bridge

```

### 5.3  `.env.prod`

在deploy/下创建.env.prod 然后把 `.env.prod` 改成生产地址。

```dotenv
# Production env for docker compose.
# This file is loaded by kb-import and kb-query in deploy/docker-compose.yaml.

# ====================
# Runtime Paths
# ====================
MD_ROOT_DIR=/app/temp-files/
MODELSCOPE_CACHE=/app/model-cache/modelscope
HF_HOME=/app/model-cache/huggingface
MINERU_MODEL_SOURCE=modelscope
MODELSCOPE_OFFLINE=1

# ====================
# OpenAI / LLM API
# ====================
OPENAI_API_KEY=sk-xxxxx
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_DEFAULT_MODEL=qwen-flash
LLM_DEFAULT_TEMPERATURE=0.1
MODEL=qwen-flash
VL_MODEL=qwen3-vl-flash
ITEM_MODEL=qwen-flash
KG_MODEL=qwen-flash

# ====================
# BGE / Embedding
# ====================
BGE_M3_PATH=/app/model-cache/modelscope/models/Xorbits/bge-m3
BGE_M3=BAAI/bge-m3
BGE_DEVICE=cuda:0
BGE_FP16=True
BGE_RERANKER_LARGE=/app/model-cache/modelscope/models/rerank/BAAI/bge-reranker-large
BGE_RERANKER_DEVICE=cuda:0
BGE_RERANKER_FP16=1
ITEM_NAME_DIAG=1
EMBEDDING_DIM=1536
EMBEDDING_MODEL=text-embedding-v4

# Compose does not define BGE/Rerank model containers, so keep the existing HTTP services.
BGE_M3_URL=https://u918478-a00f-2be3c1a6.bjb2.seetacloud.com:8443/embeddings
BGE_RERANKER_URL=https://uu918478-a00f-2be3c1a6.bjb2.seetacloud.com:8443/rerank
# ====================
# Vector Database (Milvus)
# ====================
MILVUS_URL=http://milvus:19530
CHUNKS_COLLECTION=kb_chunks_v2
ENTITY_NAME_COLLECTION=kb_graph_entity_names_v2
ITEM_NAME_COLLECTION=kb_item_names_v2
MILVUS_METRIC_TYPE=COSINE
MILVUS_MIN_COSINE_SCORE=0.75

# ====================
# Graph Database (Neo4j)
# ====================
NEO4J_URI=bolt://neo4j:7687
NEO4J_DATABASE=neo4j
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=123123123

# ====================
# Document Database (MongoDB)
# ====================
MONGO_URL=mongodb://root:123123@mongodb:27017
MONGO_DB_NAME=kb001

# ====================
# Object Storage (MinIO)
# ====================
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=knowledge-base-v2

# ====================
# MCP / Web Search
# ====================
WEB_MCP_ENABLE=1
MCP_DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/sse
MCP_DASHSCOPE_BASE_URL_STREAMABLE=https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/mcp

# ====================
# MinerU HTTP
# ====================
MINERU_BASE_API_TOKEN=eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI1NjcwMDcyMiIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc4MDQ3MTU3NCwiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiOWIzZjMyZWMtZTcyNS00NzA3LTllYmUtYTFhNzM3YjQ0Zjc3IiwiZW1haWwiOiIiLCJleHAiOjE3ODgyNDc1NzR9.xUzzKHfBSEqNA0RKJOPSthDu2E1itV6yJfXaVFeE5xsnI-iGAUGYErZjpOSH30VCiCr8ENF8hWnsAnfFC3H9RA
MINERU_BASE_URL=https://mineru.net/api/v4


# Text LLM API (vLLM OpenAI-compatible service)
TEXT_LLM_OPENAI_API_KEY=sk-atguigu
TEXT_LLM_OPENAI_API_BASE=https://u918478-b7ac-55915841.bjb2.seetacloud.com:8443/v1
TEXT_LLM_DEFAULT_MODEL=qwen3-8b
```

### 5.4 requirement依赖减少

```
# 在顶部添加额外的源
# 1. pytorch 从官网镜像源下载
# 本地模型依赖去除
#torch
#torchvision
#sentence-transformers
#FlagEmbedding
#transformers

# 2. 其它三方组件的依赖包都从清华镜像源下载
fastapi
uvicorn
python-multipart
python-dotenv
requests
beautifulsoup4
langchain-core
langchain-text-splitters
minio
langchain-openai
langgraph
neo4j
pymongo
openai-agents
pymilvus
grandalf
shapely

# 3. mineru 用uv的方式安装 从阿里云镜像源下载
# pip install --upgrade pip -i https://mirrors.aliyun.com/pypi/simple
# pip install uv -i https://mirrors.aliyun.com/pypi/simple
# uv pip install -U "mineru[all]" -i https://mirrors.aliyun.com/pypi/simple

```

## 6. 启停服务

### 6.1 首次启动

在项目根目录执行：

```bash
docker compose up -d --build etcd minio milvus mongodb neo4j
```

先确认基础中间件都正常：

```bash
docker compose ps
docker compose logs -f minio
docker compose logs -f milvus
docker compose logs -f neo4j
docker compose logs -f mongodb
```

确认无误后再启动业务服务：

```bash
docker compose up -d --build kb-import kb-query
```

### 6.2 为什么建议分两步启动

这是因为当前代码里 `kb/utils/minio_utils.py` 会在模块加载时初始化 `MinIO` 客户端。

如果 `kb-import` 启动时 `MinIO` 还没准备好，导入服务里的 `minio_client` 可能会一直是 `None`。因此生产上建议：

1. 先启动 `MinIO`
2. 再启动 `kb-import`

如果你是一次性全部拉起后发现导入服务无法上传文件，可以直接重启导入服务：

```bash
docker compose restart kb-import
```

### 6.3 查看运行状态

```bash
docker compose ps
docker compose logs -f kb-query
docker compose logs -f kb-import
```

### 6.4 健康检查

查询服务提供了明确的健康检查接口：

```bash
curl http://127.0.0.1:8001/health
```

导入服务当前没有单独的 `/health` 接口，可以先访问页面：

```bash
curl http://127.0.0.1:8000/import.html
```

中间件可按下面检查：

```bash
curl http://127.0.0.1:9000/minio/health/live
curl http://127.0.0.1:7474
```

Milvus 重点看容器状态和日志：

```bash
docker compose logs -f milvus
```

### 6.5 停止服务

仅停止容器，不删除：

```bash
docker compose stop
```

停止并删除容器，但保留数据卷目录：

```bash
docker compose down
```

### 6.6 重启服务

全部重启：

```bash
docker compose restart
```

只重启查询服务：

```bash
docker compose restart kb-query
```

只重启导入服务：

```bash
docker compose restart kb-import
```

### 6.7 重新构建并发布

代码更新后，在服务器执行：

```bash
git pull gitee master
docker compose up -d --build kb-import kb-query
```

如果你的分支是 `main`，则改成：

```bash
git pull gitee main
docker compose up -d --build kb-import kb-query
```

---

## 7 测试访问

### 7.1 开通安全组端口

用百度查询一下当前IP

![image-20260410110257664](./images/image-20260410110257664.png)

在腾讯云的控制台中的【安全组】中添加规则

![image-20260410110128729](./images/image-20260410110128729.png)
