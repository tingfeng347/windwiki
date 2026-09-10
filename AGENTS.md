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

正文位于 `docs/`；图片等静态资源放在 `docs/public/images/`，各语言共用。

默认语言（中文）在 `docs/zh/`，英文在 `docs/en/`，两者目录结构镜像、文件同名。

主要分类：`agent/`、`llm/`、`computer-vision/`、`slam/`、`point-cloud/`、`research/`、`engineering/`、`tools/`。

每种语言的 `_nav.json` 管理顶部导航，各级 `_meta.json` 组织知识树与局部顺序。语言列表在 `rspress.config.ts` 的 `locales` 中配置，默认语言由 `lang` 决定。不要在 `rspress.config.ts` 维护庞大的导航数组。

# Writing Rules

1. 中文为默认语言；同一页面只使用一种语言，不中英混排。技术术语可保留英文，重要概念首次出现可写作「上下文工程（Context Engineering）」。
2. 优先解释是什么、为什么、怎么工作、工程上怎么实现，不为篇幅堆砌定义。
3. 示例尽可能可运行，说明环境与执行方式；模拟实现必须明确标注。
4. 架构优先使用 Mermaid，数学公式使用 KaTeX（`$...$` 行内公式、`$$...$$` 块级公式）。
5. 引用必须可追溯，不伪造来源；区分事实、推断和实验结论。
6. 不创建空洞章节、占位文章或博客式日记，不为 SEO 重复关键词。
7. 新文章应有简短的 `description`，准确描述解决的问题。

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

# Modification Rules

1. 修改前检查 Git 状态，阅读相关目录现有内容，保护用户已有文件。
2. 判断语言与所属分类，在 `docs/zh/` 与 `docs/en/` 下使用相同文件名的 kebab-case Markdown；仅在顺序需要调整时修改对应语言的 `_meta.json`。
3. 文档链接优先引用相对的 `.md` 文件。图片使用 `/images/example.svg`，交给 Rspress 添加 `base`；不要把 `/windwiki/` 重复写入正文链接。
4. 执行 `pnpm build`，修复构建错误、断链与明显 warning。
5. 修改主题或插件后，检查桌面/移动端、深浅色、搜索、Mermaid 和 KaTeX。保留代码复制、页面大纲和上一页/下一页。
6. 检查 `doc_build/llms.txt`、`llms-full.txt`、各页 `.md` 与 `sitemap.xml`；URL 必须适配 `/windwiki/`，Markdown 应保留图表源码和公式。
7. `lastUpdated` 使用真实 Git 历史；不要硬编码更新时间。CI checkout 必须保留完整历史。
8. 不提交 `node_modules/`、`doc_build/` 和缓存；必须保留 `pnpm-lock.yaml`。
9. 新增依赖前确认 Rspress 默认能力是否足够；涉及配置或插件升级时核对当前官方文档。保持默认主题，不添加自定义 CSS 或主题组件；首页用 `pageType: home` 的 frontmatter 配置。修改上游依赖行为时使用 `pnpm patch`，补丁放在 `patches/` 并由 `pnpm-workspace.yaml` 的 `patchedDependencies` 登记。
10. 最后报告修改文件与实际验证结果，不把本地构建成功描述为线上部署成功。
