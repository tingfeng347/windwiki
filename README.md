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

- `pnpm dev`：默认地址 <http://localhost:3000/windwiki/>，改动 Markdown 即时刷新，内置搜索支持 `Ctrl / Cmd + K`。中文为默认语言（无前缀），英文在 <http://localhost:3000/windwiki/en/>。
- `pnpm preview`：默认地址 <http://localhost:4173/windwiki/>，用于确认构建后的真实页面；需先执行过 `pnpm build`。
- 修改 TypeScript 时额外运行：

```bash
pnpm exec tsc --noEmit
```

## 写文章

正文按语言分别放在 `docs/zh/`（默认）和 `docs/en/`，两边的目录结构完全镜像。中文页面在 `/windwiki/`，英文页面在 `/windwiki/en/`。

**1. 选择语言与分类，新建文件**

分类目录：`agent/`、`llm/`、`computer-vision/`、`slam/`、`point-cloud/`、`research/`、`engineering/`、`tools/`。

```text
docs/zh/slam/semantic-slam.md
docs/en/slam/semantic-slam.md
```

两种语言使用同名文件（同一篇内容的两个版本），文件名 `lowercase-kebab-case`；避免空格、下划线、中文和大写，否则 URL 会变成难读的百分号编码。

**2. 写内容**

同一页只出现一种语言，不要中英混排。正文结构不固定，按实际问题组织即可。建议在文件顶部加一行 `description`（各语言用各自语言书写）：

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

- 中文页写中文，英文页写英文；技术术语（Agent、Transformer、SLAM 等）可保留英文。
- 架构图用 Mermaid 围栏代码块（```` ```mermaid ````）；公式用 KaTeX，行内 `$...$`、块级 `$$...$$`。
- 图片放在 `docs/public/images/`（所有语言共用），正文写 `/images/example.svg`；**不要**在正文里重复写 `/windwiki/`，由 Rspress 自动补前缀。
- 站内链接使用相对 `.md` 路径，例如中文页 `[工程实践](../engineering/index.md)`、英文页 `[Engineering](../engineering/index.md)`。
- 引用必须可追溯，区分事实、推断和实验结论；不写空洞章节或博客式日记。

**3. 让它出现在左侧导航**

每种语言各自维护 `_meta.json`，Rspress **只显示其中列出的文件**。把新文件名（不含 `.md`）加进对应语言、对应分类的 `_meta.json`：

```json
[
  { "type": "file", "name": "index", "label": "概览" },
  { "type": "file", "name": "semantic-slam", "label": "语义 SLAM" }
]
```

不加也能构建：页面会生成、可访问、进搜索索引和 `sitemap.xml`，只是**不会出现在侧边栏**。

**4. 预览并发布**

```bash
pnpm dev                          # 本地确认页面、图表和公式
pnpm build                        # 提交前确认无构建错误与断链
git add docs && git commit -m "docs(slam): add semantic SLAM article"
git push
```

推送 `main` 后 GitHub Actions 自动重新构建并部署；两种语言的搜索索引会分别生成。

## 目录结构

```text
docs/
├── zh/                # 默认语言，URL 无前缀
│   ├── index.mdx
│   ├── _nav.json      # 顶部导航
│   ├── _meta.json     # 全局知识树
│   ├── agent/         # 含 agent-architecture.md 示例
│   ├── llm/
│   ├── computer-vision/
│   ├── slam/
│   ├── point-cloud/
│   ├── research/
│   ├── engineering/
│   └── tools/
├── en/                # 英文，URL 前缀 /en/，结构与 zh/ 镜像
└── public/images/     # 各语言共用静态资源
```

导航由各级 `_nav.json`（顶部）与 `_meta.json`（知识树）生成，不要改 `rspress.config.ts` 维护大型导航数组。语言列表在 `rspress.config.ts` 的 `locales` 中配置（默认语言由 `lang` 决定），右上角提供中英切换。

使用 Rspress 默认主题，不做样式覆盖：没有自定义 CSS 或主题组件，首页使用默认的 `pageType: home` 布局，标题、简介、按钮和分类卡片都在各语言 `docs/<lang>/index.mdx` 的 frontmatter（`hero` / `features`）里配置。默认主题自带知识树、页面大纲、深浅色、代码复制与前后页导航。

Mermaid 使用 fenced `mermaid` 代码块，KaTeX 支持 `$...$`、`$$...$$` 与 fenced `math`。Rspress 的代码高亮先于 KaTeX 执行，因此配置仅跳过 `math` 的未知语言错误，让 KaTeX 处理原始公式节点。

> `rspress-plugin-mermaid@1.0.1` 存在并发渲染竞态，图表会偶发空白。`patches/rspress-plugin-mermaid@1.0.1.patch`（由 `pnpm-workspace.yaml` 的 `patchedDependencies` 应用）为渲染加了唯一 id、串行队列与 `mermaid.parse` 修复。升级该插件时需重新评估并更新补丁。

## AI 与 SEO

启用 Rspress 原生 SSG-MD，每页提供 `.md` 端点，并按语言分别生成 [llms.txt](https://tingfeng347.github.io/windwiki/llms.txt) / [llms-full.txt](https://tingfeng347.github.io/windwiki/llms-full.txt) 与 [英文版](https://tingfeng347.github.io/windwiki/en/llms.txt)。生产构建包含两种语言的搜索索引、站点地图、canonical 和 Open Graph 元信息。

配置依据：[Rspress 2 文档](https://rspress.rs/guide/start/getting-started)、[自动导航](https://rspress.rs/guide/basic/auto-nav-sidebar)、[SSG-MD](https://rspress.rs/guide/basic/ssg-md)、[插件目录](https://rspress.rs/plugin/community-plugins/overview)。

## 部署

`.github/workflows/deploy.yml` 在推送 `main` 或手动运行时，安装锁定依赖、构建并上传 `doc_build`，通过 GitHub Pages 部署，不需要 PAT。仓库 Pages 的 **Build and deployment → Source** 已设为 **GitHub Actions**。

手动触发或查看结果：<https://github.com/tingfeng347/windwiki/actions>。目标地址 <https://tingfeng347.github.io/windwiki/>；本项目只部署 Wiki，博客通过外链访问。

最后更新时间取自 Git 提交历史，**尚未提交的文件不会显示时间**；CI checkout 使用 `fetch-depth: 0` 保留完整历史。

## License

暂未指定开源许可证（`UNLICENSED`）。
