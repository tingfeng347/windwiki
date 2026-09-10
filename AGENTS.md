# Project

WindWiki is Tingfeng347's engineering knowledge base.

使用 Rspress 2、Markdown / MDX、pnpm 和 GitHub Pages。保持默认主题，以技术知识为主，不写博客式日记；不增加后端、数据库、CMS 或复杂状态管理。

# Commands

使用 Node.js 22.12+（22.x；精确版本见 `.nvmrc`）和 `package.json` 指定的 pnpm 10。

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

`pnpm check` 同样执行生产构建。修改 TypeScript 时额外运行 `pnpm exec tsc --noEmit`。

# Content Location

正文位于 `docs/`；图片放在文章同级目录的 `images/` 下，用相对路径引用（例如 `docs/llm/python-basics/images/`，正文写 `![](./images/example.png)`）。这样 VS Code、Typora 等本地预览和站点都能显示；Rspress 会把它打包成带 hash 的资源，并在 SSG-MD 产物里重写成带 `base` 的完整 URL。

只有与正文无关的站点级静态资源（`favicon.svg` 等）才放 `docs/public/`。

分类：当前只有一个顶层分类 `llm/`（大模型），其下按顺序是 `python-basics/`（Python 基础）、`data-structures-and-algorithms/`（数据结构与算法）、`linux-shell-git/`（Linux、Shell 与 Git）、`mysql/`（MySQL）。顺序在 `docs/llm/_meta.json` 中维护。

`docs/_nav.json` 管理顶部导航，各级 `_meta.json` 组织知识树与局部顺序。站点为纯中文（`rspress.config.ts` 的 `lang: 'zh'`）。不要在 `rspress.config.ts` 维护庞大的导航数组。

# Writing Rules

1. 使用中文；技术术语可保留英文，重要概念首次出现可写作「上下文工程（Context Engineering）」。
2. 优先解释是什么、为什么、怎么工作、工程上怎么实现，不为篇幅堆砌定义。
3. 示例尽可能可运行，说明环境与执行方式；模拟实现必须明确标注。
4. 架构优先使用 Mermaid，数学公式使用 KaTeX（`$...$` 行内公式、`$$...$$` 块级公式）。
5. 引用必须可追溯，不伪造来源；区分事实、推断和实验结论。
6. 不创建空洞章节、占位文章或博客式日记，不为 SEO 重复关键词。
7. 新文章应有简短的 `description`，准确描述解决的问题。
8. 图片一律用 Markdown 语法 `![](./images/x.png)`，路径用正斜杠。**不要写 HTML `<img>`**——Rspress 只重写 Markdown 图片的相对路径，原始 HTML 的 `src` 会原样进产物，从页面 URL 解析会 404。也不要把图片嵌成 base64 data URI（几十 KB 的文本噪音，还会混进 `llms-full.txt`），存成 `images/` 下的真实文件。
9. 代码块围栏的语言必须是 Shiki 支持的名称，写错会直接构建失败。踩过的坑：**`mysql` 不存在**，MySQL 的 SQL 用 `sql`；`txt` 可用（是 Rspress 的 `defaultLanguage`）。

# File Naming

目录与文件使用 `lowercase-kebab-case`，例如 `context-engineering.md`、`programmatic-tool-calling.md`、`semantic-slam.md`、`point-cloud-registration.md`。

避免空格、下划线、中文版本后缀和大写文件名。

# Article Structure

推荐以下结构，按实际问题删掉不必要的章节，不为了模板制造内容：

```markdown
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

# 导入外部课程笔记

外部笔记（例如尚硅谷的课程）通常是「一个大 Markdown 含多章」外加一个图片目录。导入步骤：

1. 目录放 `docs/llm/<course>/`，与 `python-basics/` 平级；在该目录写 `_meta.json` 定顺序与侧边栏标签，并在 `docs/llm/_meta.json` 里登记。课程分组统一写 `"collapsed": true` 默认收起，当前页所在的课程由 Rspress 自动展开。
2. 按章拆分：在**代码围栏之外**匹配 `^# 第N章`——代码块里的 `# 注释` 会被误判成标题。整篇没有章节的保持单页。
3. 图片统一成 `./images/<basename>`：源里可能是 `images/`、`image/`、`img/` 或 Windows 反斜杠（`image\x.png`）。图片拷到该课程目录下的 `images/`。
4. 每个文件加 `description` frontmatter，格式沿用 python-basics：`<课程名> · <章节名>。`
5. 转换后必须验证，不能只看构建成功：
   - 把拆分后的文件按内容行拼回去与原文比对，确认没丢正文（标题前缀、图片行、有意改动的围栏语言除外）。
   - 构建后逐页在浏览器里查 `document.querySelectorAll('.rp-doc img')`，`naturalWidth === 0` 的数量必须为 0；图片总数应与源文件里的引用数吻合。

# Modification Rules

1. 修改前检查 Git 状态，阅读相关目录现有内容，保护用户已有文件。
2. 判断所属分类，使用 kebab-case 文件名写 Markdown；仅在顺序需要调整时修改对应目录的 `_meta.json`。
3. 文档链接优先引用相对的 `.md` 文件。图片用相对当前文章的路径（`![](./images/example.png)`），不要写 `/images/...` 这类站根绝对路径——它在本地编辑器和 Typora 里解析不到。也不要在正文里重复写 `/windwiki/`，由 Rspress 自动补前缀。
4. 执行 `pnpm build`，修复构建错误、断链与明显 warning。
5. 修改主题或插件后，检查桌面/移动端、深浅色、搜索、Mermaid 和 KaTeX。保留代码复制、页面大纲和上一页/下一页。
6. 检查 `doc_build/llms.txt`、`llms-full.txt`、各页 `.md` 与 `sitemap.xml`；URL 必须适配 `/windwiki/`，Markdown 应保留图表源码和公式。
7. `lastUpdated` 使用真实 Git 历史；不要硬编码更新时间。CI checkout 必须保留完整历史。
8. 不提交 `node_modules/`、`doc_build/` 和缓存；必须保留 `pnpm-lock.yaml`。
9. 新增依赖前确认 Rspress 默认能力是否足够；涉及配置或插件升级时核对当前官方文档。保持默认主题，**不 fork 主题组件**：少量样式覆盖走 `rspress.config.ts` 的 `globalStyles`（`styles/`），需要全局 UI 时用 `globalUIComponents`（`components/`）。首页用 `pageType: home` 的 frontmatter 配置。修改上游依赖行为时使用 `pnpm patch`，补丁放在 `patches/` 并由 `pnpm-workspace.yaml` 的 `patchedDependencies` 登记。改动主题或插件前先读 `README.md` 里「三处对默认主题的改动」，避免当成 bug 改回去。
10. 最后报告修改文件与实际验证结果，不把本地构建成功描述为线上部署成功。
