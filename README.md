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
- 图片放在文章同级的 `images/` 下，正文写 `![](./images/example.png)`。相对路径在 VS Code、Typora 等本地预览和站点上都能解析；写成 `/images/example.png` 这类站根绝对路径则本地编辑器看不到（Rspress 会把相对路径打包成带 hash 的资源，并在 SSG-MD 产物里重写成带 `base` 的完整 URL）。同样**不要**在正文里重复写 `/windwiki/`。
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
│       ├── *.md
│       └── images/    # 该课程的图片，正文用 ./images/xxx.png 引用
└── public/            # 站点级静态资源（favicon.svg 等）

components/
├── sidebar-state.ts   # 折叠状态的常量与防闪烁脚本（无 DOM 依赖，config 也引它）
├── sidebar-store.ts   # 折叠状态的客户端读写（useSyncExternalStore）
├── sidebar-toggle.tsx # 侧边栏折叠按钮（globalUIComponents 挂载）
└── sidebar-toggle.css

styles/
├── index.css          # globalStyles 入口，汇总下面两份
├── home.css           # 首页 Hero 垂直居中
└── sidebar.css        # 去掉知识树竖线、折叠后的布局
```

导航由各级 `_nav.json`（顶部）与 `_meta.json`（知识树）生成，不要改 `rspress.config.ts` 维护大型导航数组。站点为纯中文（`rspress.config.ts` 的 `lang: 'zh'`），没有多语言与语言切换。

使用 Rspress 默认主题，**没有 `theme/` 目录、没有 fork 主题组件**：首页使用默认的 `pageType: home` 布局，只配置 `hero`（站点名、标语、按钮），不配置 `features` 卡片，内容都在 `docs/index.mdx` 的 frontmatter 里。默认主题自带知识树、页面大纲、深浅色、代码复制与前后页导航。

三处对默认主题的改动，都记在这里以免以后当成 bug：

1. **`styles/index.css`（`rspress.config.ts` 的 `globalStyles`）**——首页 Hero 在视口内垂直居中；去掉知识树嵌套项的竖向引导线；折叠侧边栏后的布局。`globalStyles` 注入在主题样式**之前**，同特异性会被主题覆盖，所以覆盖规则统一用重复类名提高一级特异性（例如 `.rp-home-hero.rp-home-hero`）。
2. **`components/sidebar-toggle.tsx`（`globalUIComponents`）**——侧边栏折叠按钮。上游 Rspress 没有桌面端折叠功能（PR #2142 关闭未合并，Issue #2143 仍 open），`globalUIComponents` 是官方支持的注入点，组件渲染在 `<Layout />` 的兄弟位置，因此按钮用 `position: fixed` 定位。

   **按钮和折叠都只在一个断点生效：≥1280px。** 两者必须同进同退，否则窄屏下没有按钮可恢复、会卡在隐藏状态。选 1280px 是因为 `<1280px` 时 Rspress 在导航栏下方多一条「菜单 / 目录」工具栏，左上角已被它自己的控件占据（实测 1000px 下它占 20–70px），固定在左侧的按钮会压住它和正文左边缘（36px）。

   按钮的图标由 CSS 按 `<html>` 上的 `data-windwiki-sidebar` 切换、不经过 React（服务端读不到折叠状态，让图标依赖它会产生 hydration 不匹配）；`aria-pressed` 走 `useSyncExternalStore`，React 先用服务端快照渲染、hydration 后再用客户端快照校正，所以静态 HTML 和浏览器里都正确。
3. **`builderConfig.html.tags`**——在 `<head>` 注入内联脚本，首次绘制前从 localStorage 恢复折叠状态。Rspress 的 `head` 配置类型是 `[string, Record<string, string>][]`，带不了内联内容，所以走 Rsbuild 的 `html.tags`。

4. **`builderConfig.output.dataUriLimit`**——设为 `{ image: 0 }`，禁止把图片内联成 base64 data URI。默认阈值是 4096 字节，小于它的图片会被内联；正文图片走打包器，于是几张几十 KB 的小图会变成 base64 塞进 `llms-full.txt`，对喂给模型的 markdown 没有意义。设成 0 之后所有图片都是可解析的 URL。

   > 该选项只覆盖 `image`；`svg` / `font` / `media` / `assets` 仍是默认的 4096。将来若在正文里引用小 SVG，需要把 `svg` 也设为 0，否则会出现同样的内联。

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
