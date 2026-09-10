# WindWiki

Personal engineering knowledge base powered by Rspress.

[在线站点](https://tingfeng347.github.io/windwiki/) · [Blog](https://tingfeng347.github.io/) · [GitHub](https://github.com/tingfeng347)

## 技术栈与要求

- Rspress 2 + Markdown / MDX，保持默认主题；不引入后端、数据库、CMS 或复杂状态管理。
- Node.js 22.12+（22.x，精确版本见 `.nvmrc`）与 pnpm 10（见 `package.json` 的 `packageManager`）。

未安装 nvm 时先装好 Node 22：

```bash
nvm install && nvm use          # 读取 .nvmrc，安装并使用 22.23.2
npm install -g pnpm@10.34.5
```

> 使用系统自带的更高版本 Node（如 26.x）也能启动，但 pnpm 会打印 `Unsupported engine` 警告。CI 与本地请以 `.nvmrc` 为准。

## 启动方式

```bash
pnpm install       # 安装依赖（首次或依赖变动后）
pnpm dev           # 开发服务器，热更新
pnpm build         # 生产构建，产物在 doc_build/
pnpm preview       # 本地预览生产构建
pnpm check         # 等价于 pnpm build
```

- `pnpm dev`：默认地址 <http://localhost:3000/windwiki/>，改动 Markdown 即时刷新，内置搜索支持 `Ctrl / Cmd + K`。
- `pnpm preview`：默认地址 <http://localhost:4173/windwiki/>，用于确认构建后的真实页面；需先执行过 `pnpm build`。
- 修改 TypeScript 时额外运行：

```bash
pnpm exec tsc --noEmit
```

## 写文章

正文位于 `docs/`，一篇新文章就是一个放在分类目录下的 Markdown 文件。

**1. 选择分类并新建文件**

当前只有一个分类：`llm/`（大模型），其下是 `python-basics/`。

```text
docs/llm/python-basics/05-containers.md
```

文件名使用 `lowercase-kebab-case`；避免空格、下划线、中文和大写，否则 URL 会变成难读的百分号编码。

**2. 写内容**

正文结构不固定，按实际问题组织即可。建议在文件顶部加一行 `description`：

```markdown
---
description: 一句话说明这篇文章解决什么问题。
---

# 标题

一句话说明本文解决什么问题。

## 核心概念
## 工作原理
## 架构
## 工程实现
## 示例
## 常见问题
## 参考资料
```

写作与格式约定：

- 使用中文；技术术语（Python、Transformer 等）可保留英文。
- 架构图用 Mermaid 围栏代码块（```` ```mermaid ````）；公式用 KaTeX，行内 `$...$`、块级 `$$...$$`。
- 图片放在 `docs/public/images/`，正文写 `/images/example.png`；**不要**在正文里重复写 `/windwiki/`，由 Rspress 自动补前缀。
- 站内链接使用相对 `.md` 路径，例如 `[Python 基础](../python-basics/index.md)`。
- 代码块语言必须用 Shiki 支持的名称（`python`、`bash`、`asm`、`text` 等），未知语言会导致构建失败。
- 引用必须可追溯，区分事实、推断和实验结论；不写空洞章节或博客式日记。

**3. 让它出现在左侧导航**

每个目录用 `_meta.json` 控制显示与顺序，Rspress **只显示其中列出的文件**。把新文件名（不含 `.md`）加进对应目录的 `_meta.json`：

```json
[
  { "type": "file", "name": "index", "label": "概览" },
  { "type": "file", "name": "05-containers", "label": "第 5 章 Python的容器类型" }
]
```

不加也能构建：页面会生成、可访问、进搜索索引和 `sitemap.xml`，只是**不会出现在侧边栏**。

**4. 预览并发布**

```bash
pnpm dev                          # 本地确认页面、图表和公式
pnpm build                        # 提交前确认无构建错误与断链
git add docs && git commit -m "docs: add ..."
git push
```

推送 `main` 后 GitHub Actions 自动重新构建并部署。

## 目录结构

```text
docs/
├── index.mdx          # 首页（默认主题 pageType: home）
├── _nav.json          # 顶部导航
├── _meta.json         # 全局知识树
├── llm/               # 大模型（唯一分类）
│   ├── index.md
│   ├── _meta.json
│   └── python-basics/ # Python 基础课程笔记
└── public/images/     # 图片等静态资源
```

导航由各级 `_nav.json`（顶部）与 `_meta.json`（知识树）生成，不要改 `rspress.config.ts` 维护大型导航数组。站点为纯中文（`rspress.config.ts` 的 `lang: 'zh'`），没有多语言与语言切换。

使用 Rspress 默认主题，不做样式覆盖：没有自定义 CSS 或主题组件，首页使用默认的 `pageType: home` 布局，标题、简介、按钮和分类卡片都在 `docs/index.mdx` 的 frontmatter（`hero` / `features`）里配置。默认主题自带知识树、页面大纲、深浅色、代码复制与前后页导航。

Mermaid 使用 fenced `mermaid` 代码块，KaTeX 支持 `$...$`、`$$...$$` 与 fenced `math`。Rspress 的代码高亮先于 KaTeX 执行，因此配置仅跳过 `math` 的未知语言错误，让 KaTeX 处理原始公式节点。

> `rspress-plugin-mermaid@1.0.1` 存在并发渲染竞态，图表会偶发空白。`patches/rspress-plugin-mermaid@1.0.1.patch`（由 `pnpm-workspace.yaml` 的 `patchedDependencies` 应用）为渲染加了唯一 id、串行队列与 `mermaid.parse` 修复。升级该插件时需重新评估并更新补丁。

## AI 与 SEO

启用 Rspress 原生 SSG-MD，每页提供 `.md` 端点，同时生成 [llms.txt](https://tingfeng347.github.io/windwiki/llms.txt) 与 [llms-full.txt](https://tingfeng347.github.io/windwiki/llms-full.txt)。生产构建包含搜索索引、站点地图、canonical 和 Open Graph 元信息。

配置依据：[Rspress 2 文档](https://rspress.rs/guide/start/getting-started)、[自动导航](https://rspress.rs/guide/basic/auto-nav-sidebar)、[SSG-MD](https://rspress.rs/guide/basic/ssg-md)、[插件目录](https://rspress.rs/plugin/community-plugins/overview)。

## 部署

`.github/workflows/deploy.yml` 在推送 `main` 或手动运行时，安装锁定依赖、构建并上传 `doc_build`，通过 GitHub Pages 部署，不需要 PAT。仓库 Pages 的 **Build and deployment → Source** 已设为 **GitHub Actions**。

手动触发或查看结果：<https://github.com/tingfeng347/windwiki/actions>。目标地址 <https://tingfeng347.github.io/windwiki/>；本项目只部署 Wiki，博客通过外链访问。

最后更新时间取自 Git 提交历史，**尚未提交的文件不会显示时间**；CI checkout 使用 `fetch-depth: 0` 保留完整历史。

## License

暂未指定开源许可证（`UNLICENSED`）。
