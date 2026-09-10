# WindWiki

Personal engineering knowledge base powered by Rspress.

[在线站点](https://tingfeng347.github.io/windwiki/) · [Blog](https://tingfeng347.github.io/) · [GitHub](https://github.com/tingfeng347)

## Development

使用 Node.js 22.12+（22.x，`.nvmrc` 指定 22.23.2）与 pnpm 10.34.5。已安装 nvm 时先执行 `nvm install && nvm use`，再用 `npm install -g pnpm@10.34.5` 安装对应包管理器。

```bash
pnpm install
pnpm dev
```

打开终端打印的 `/windwiki/` 地址。内置全文搜索支持 `Ctrl / Cmd + K`。

## Build

```bash
pnpm build
pnpm preview
```

产物在 `doc_build/`。`pnpm check` 执行相同的构建检查，TypeScript 检查为 `pnpm exec tsc --noEmit`。

## Structure

```text
docs/
├── index.mdx
├── _nav.json
├── _meta.json
├── agent/             # 含 agent-architecture.md 示例
├── llm/
├── computer-vision/
├── slam/
├── point-cloud/
├── research/
├── engineering/
├── tools/
└── public/images/
```

每个分类包含 `index.md` 和 `_meta.json`。新建 Markdown 后在需要时调整导航顺序，检查链接并执行构建。写作与维护规范见 [AGENTS.md](./AGENTS.md)。

默认主题保留知识树、页面大纲、深浅色、代码高亮/复制和前后页导航；仅以 `styles/index.css` 做少量调整。首页搜索按钮复用默认搜索快捷键，无独立搜索服务。

Mermaid 使用 fenced `mermaid` 代码块，KaTeX 支持 `$...$`、`$$...$$` 和 fenced `math`。Rspress 的高亮步骤先于 KaTeX，因此配置仅跳过 `math` 的未知语言错误，让 KaTeX 处理原始公式节点；其他代码高亮错误仍会中止构建。

## AI & SEO

启用 Rspress 原生 SSG-MD，每页提供 `.md` 端点，同时生成 [llms.txt](https://tingfeng347.github.io/windwiki/llms.txt) 与 [llms-full.txt](https://tingfeng347.github.io/windwiki/llms-full.txt)。生产构建包含站点地图、canonical 和 Open Graph 元信息。

配置依据：[Rspress 2 文档](https://rspress.rs/guide/start/getting-started)、[自动导航](https://rspress.rs/guide/basic/auto-nav-sidebar)、[SSG-MD](https://rspress.rs/guide/basic/ssg-md)、[插件目录](https://rspress.rs/plugin/community-plugins/overview)。

## Deployment

`.github/workflows/deploy.yml` 在推送 `main` 或手动运行时，安装锁定依赖、构建并上传 `doc_build`，通过 GitHub Pages 部署，不需要 PAT。

首次发布：

1. 将项目提交并推送到 `tingfeng347/windwiki` 的 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 查看 Actions 中的部署结果；必要时手动运行工作流。

目标地址：<https://tingfeng347.github.io/windwiki/>。本项目只部署 Wiki，博客通过外链访问。

最后更新时间取自 Git 提交历史；尚未提交的文件不会显示时间。CI 使用 `fetch-depth: 0`。

## License

暂未指定开源许可证（`UNLICENSED`）。
