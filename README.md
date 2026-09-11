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

## PDF 课程笔记

有的课程（如《NumPy 与 Pandas》）不适合拆成 Markdown——原文的截图和排版就是内容本身。这类笔记直接在线阅读 PDF，不落成 `.md`：正文由 `components/pdf-viewer.tsx`（pdf.js）逐页渲染成 canvas，像普通网页一样一路往下滚；右侧目录取自 PDF 自带的书签，工具栏的搜索框索引全部页面并高亮命中处。站点顶部的搜索（`Ctrl / Cmd + K`）只索引 Markdown，搜不到 PDF 正文。

124 页全渲染会吃掉几个 GB 显存，所以只有滚到视口附近的页才画，滚远了就把 canvas 清掉——实测任何时刻只有 2～3 张 canvas 是活的。「当前读到第几页」按「在可视区里露出最多的那一页」算，而不是「哪一页顶到了某条线」：跳页时 `scroll-margin` 和吸顶导航栏的高度都在变，用线去卡会差一页。

几处性能上的取舍：

- **文档按页取字节**：`getDocument({ disableAutoFetch: true })`，打开第一页只需要几十 KB，不再一上来就下整份 3.7MB（搜索要抽全文时才会读到后面）。服务端得支持 `Range`；线上 Pages 支持，本地的 `rspress preview` 实测**偶尔**忽略 `Range` 直接返回整个文件，所以本地可能还是全量下载——那是预览服务器的行为，不是这里的问题。
- **渐进渲染**：页进入视口先画一张 0.32 倍分辨率的预览（像素只有最终版的十分之一），几百毫秒内就有内容；等主线程空下来（`requestIdleCallback`）再补全分辨率。快速滚过时不至于看到一片白。
- **一律离屏渲染再整张贴过来**：改 `canvas.width/height` 会丢掉后备位图，Chrome 在换位图的那一帧可能把还没初始化的纹理画出来——就是跳页时闪的那一下黑屏。「改尺寸 + 贴图」放进同一个任务里，中间没有可被画出来的空窗。缩放时同理，不会先白一下再变清晰。
- **单页画布像素上限 500 万**：高分屏上按 `devicePixelRatio` 满血渲染，一张 A4 就是上千万像素、几十 MB 显存，超出就按比例降倍率。
- 文字层的渲染在取消时会以 `AbortException` 拒绝，必须吞掉——否则每次滚走一页都会抛一条 `Uncaught (in promise)`。
- **暗色模式**：`html.rp-dark` 下给 canvas 加 `invert(1) hue-rotate(180deg)`，白纸变黑纸、黑字变白字，而彩色内容（截图、图表、红色标注）的色相基本还原——各家阅读器的夜间模式都是这个做法。只作用在画布上，文字层、选中和高亮不受影响，切换主题也不需要重新渲染（纯 CSS，不重新跑 pdf.js）。

新增一页 PDF 笔记需要三样东西。

**1. PDF 放进 `docs/public/files/`，文件名不要带 `.pdf` 这类扩展名**

例如 `docs/public/files/numpy-pandas-2.0`。这不是漏写后缀：URL 以 `.pdf` / `.zip` / `.bin` 结尾、响应类型又像文件时，Chrome 会把它当成「不安全下载」，用一个 204 空响应顶掉正文——`pnpm dev` / `pnpm preview` 走 http，本地会直接读不到（`pnpm build` 和线上 https 都正常，所以只看构建日志发现不了）。去掉扩展名后两种协议都能读；pdf.js 只认字节，不看扩展名和 `Content-Type`。

**2. 把 PDF 的书签树导出成 JSON，放在页面同级**

右侧目录是构建期渲染的，数据源就是这个文件。用 pypdf 导出，页码从 1 开始：

```bash
python - <<'PY'
import json, pypdf
r = pypdf.PdfReader('numpy-pandas-2.0.pdf')

def walk(node):
    out = []
    for item in node:
        if isinstance(item, list):           # 书签树里子节点是嵌套的 list
            if out:
                out[-1]['children'] = walk(item)
        else:
            out.append({'title': str(item.title), 'page': r.get_destination_page_number(item) + 1})
    return out

print(json.dumps(walk(r.outline), ensure_ascii=False, indent=2))
PY
```

**3. 写一个 `.mdx` 页面并把组件挂上去**

```mdx
import PdfViewer from '../../../components/pdf-viewer';
import outline from './pdf-outline.json';

# 标题

一句话导语。

<PdfViewer src="/files/numpy-pandas-2.0" outline={outline} />
```

页面里**不要写 `##` 及更深的标题**：默认主题的大纲面板是按页面标题生成的，多出来的条目会和 PDF 目录挤在同一个 `.rp-outline__toc` 里。

> worker 文件由 `rspress.config.ts` 的 `builderConfig.output.copy` 从 `node_modules/pdfjs-dist/` 拷进产物。不加这条会走打包器的资源后缀，但 `?url` 只挂在 image / media / font 那几条规则上（`.mjs` 会落进 JS 规则被当模块解析），`?worker` 又只在浏览器环境注册、SSR 那趟构建解析不了。升级 pdfjs-dist 后文件名若有变化，构建会因为拷不到源文件而失败。

> 组件路径按嵌套深度写：`docs/llm/numpy-pandas/index.mdx` 是 `../../../components/pdf-viewer`，分组里（`docs/llm/<分组>/<课程>/index.mdx`）要多退一级。

## 导入外部 Markdown 笔记

源笔记本来就是 Markdown 时（例如《大模型概述》，2724 行 + 91 张截图），按「写文章」的规矩落成一篇正文，另外注意两点：

- 图片放文章同级的 `images/`，引用统一写成 `./images/xxx.png`——源里常写成 `images/xxx.png`、`image/` 或 Windows 反斜杠 `images\x.png`，三种都要认。
- **源里的 `<img src="...">` 要改写成 Markdown 语法**。Rspress 只重写 Markdown 图片的相对路径，HTML 的 `src` 会原样进产物、从页面 URL 解析必然 404，而且构建不报错、只有浏览器里看得见（`DeepAgents 框架`那篇里有 5 处，路径还是反斜杠）。替换后照例用 `.rp-doc img` 的 `naturalWidth === 0` 数量复验。
- 导入后**逐行比对**源文件与产物：除了刻意的改动（标题、图片路径、HTML 图片改写），行数与内容应完全一致。别只凭「构建成功」判断，那只能说明语法没错。

### 截图太占地方就转 WebP

带截图的笔记很容易上百 MB——`llm-overview` 的 91 张 PNG/JPG 就有 **21.7 MB**。（源目录里另有两个 17.8 MB 的 `image_41.x-emf` / `image_75.x-emf` 在正文里根本没被引用，导的时候直接跳过了，省掉 35 MB。）PNG 截图转 WebP 收益很大，**分辨率不变**能压到约 1/4：

```bash
python - <<'PY'
import io, os, re, glob
from PIL import Image

DIR = 'docs/llm/nlp-and-llm-principles/llm-overview'
before = after = 0
for path in glob.glob(f'{DIR}/images/*'):
    image = Image.open(path).convert('RGB')
    target = os.path.splitext(path)[0] + '.webp'
    image.save(target, 'WEBP', quality=80, method=4)
    before += os.path.getsize(path)
    after += os.path.getsize(target)
    os.remove(path)

md = f'{DIR}/index.md'                      # 顺手把正文里的后缀改掉
text = io.open(md, encoding='utf-8').read()
io.open(md, 'w', encoding='utf-8', newline='\n').write(
    re.sub(r'(\./images/[^)"\s]+)\.(png|jpg|jpeg)', r'\1.webp', text))
print(f'{before / 1048576:.1f} MB -> {after / 1048576:.1f} MB')
PY
```

上面这篇实测 **21.7 MB → 5.2 MB**（`quality=80`、不缩尺寸）。`.webp` 在打包器的图片扩展名列表里，和 png 走同一条资源管线。转完照例 `pnpm build`，并在浏览器里确认 `.rp-doc img` 中 `naturalWidth === 0` 的数量为 0。

## 目录结构

```text
docs/
├── index.mdx          # 首页（默认主题 pageType: home）
├── _nav.json          # 顶部导航
├── _meta.json         # 全局知识树
├── llm/               # 大模型（唯一分类）
│   ├── index.md
│   ├── _meta.json
│   ├── python-basics/ # Python 基础课程笔记
│   │   ├── *.md
│   │   └── images/    # 该课程的图片，正文用 ./images/xxx.png 引用
│   ├── numpy-pandas/  # 「一页读完一份 PDF」的课程，见下：
│   │   ├── index.mdx         #   页面本体，只 import 组件和书签数据
│   │   └── pdf-outline.json  #   PDF 书签树，右侧目录的数据源
│   ├── machine-learning-and-deep-learning/  # 分组，里面是同种课程
│   │   ├── math-basics/          # PDF 本体放 docs/public/files/，
│   │   ├── machine-learning/     # 不带扩展名，见「PDF 课程笔记」
│   │   └── deep-learning/
│   ├── nlp-and-llm-principles/   # 分组：NLP 与 LLM 原理
│   │   ├── nlp/                  # 同为 PDF 课程
│   │   ├── llm-overview/         # Markdown 正文（+ images/）
│   │   └── llm-principles/       # 同为 PDF 课程
│   └── langchain-langgraph-deepagents/      # 分组：LangChain、LangGraph 与 DeepAgents
│       ├── langchain/            # PDF 课程
│       ├── langgraph/            # PDF 课程
│       └── deepagents/           # Markdown 正文两篇（+ images/）
└── public/            # 站点级静态资源（favicon.svg、files/ 下的 PDF 等）

components/
├── panel-state.ts     # 面板折叠状态的常量与防闪烁脚本（无 DOM 依赖，config 也引它）
├── panel-store.ts     # 面板折叠状态的客户端读写（useSyncExternalStore）
├── panel-toggle.tsx   # 折叠按钮：默认导出知识树那个，另导出 PanelButton 给导航栏用
├── panel-toggle.css
├── nav-actions.tsx    # 导航栏右侧按钮组：全屏 + 目录折叠（portal 进 .rp-nav__right）
├── nav-actions.css
├── nav-state.ts       # 导航栏自动隐藏的滚动监听脚本（内联注入，配 styles/nav-auto-hide.css）
├── pdf-viewer.tsx     # PDF 阅读器（pdf.js）：右侧目录 + 全文搜索，见「PDF 课程笔记」
└── pdf-viewer.css

styles/
├── index.css          # globalStyles 入口，汇总下面四份
├── home.css           # 首页 Hero 垂直居中
├── panel.css          # 去掉知识树竖线、两个面板折叠后的布局
├── nav-auto-hide.css  # 导航栏滚动后淡出并把高度还给内容（配 components/nav-state.ts）
└── code.css           # 代码块里注释的配色（默认主题的对比度不够）
```

导航由各级 `_nav.json`（顶部）与 `_meta.json`（知识树）生成，不要改 `rspress.config.ts` 维护大型导航数组。站点为纯中文（`rspress.config.ts` 的 `lang: 'zh'`），没有多语言与语言切换。

使用 Rspress 默认主题，**没有 `theme/` 目录、没有 fork 主题组件**：首页使用默认的 `pageType: home` 布局，只配置 `hero`（站点名、标语、按钮），不配置 `features` 卡片，内容都在 `docs/index.mdx` 的 frontmatter 里。默认主题自带知识树、页面大纲、深浅色、代码复制与前后页导航。

七处对默认主题的改动，都记在这里以免以后当成 bug：

1. **`styles/index.css`（`rspress.config.ts` 的 `globalStyles`）**——首页 Hero 在视口内垂直居中；去掉知识树嵌套项的竖向引导线；两个面板折叠后的布局。`globalStyles` 注入在主题样式**之前**，同特异性会被主题覆盖，所以覆盖规则统一用重复类名提高一级特异性（例如 `.rp-home-hero.rp-home-hero`）。
2. **`components/nav-actions.tsx`（`globalUIComponents`）**——导航栏右侧按钮组：全屏、知识树折叠、目录折叠。上游 Rspress 没有桌面端折叠功能（PR #2142 关闭未合并，Issue #2143 仍 open），`globalUIComponents` 是官方支持的注入点。

   三个按钮放在**同一个 portal 容器里、顺序写死**（全屏 → 知识树 → 目录，按面板的物理位置排）。各自 portal 的话先后只能取决于 React 挂载顺序，而且它们的间距要对齐 Rspress 自己的 `.rp-switch-appearance`（24×24），实测四个按钮的边缘间距与中心间距才都是均匀的。

   **按钮和折叠都只在一个断点生效：≥1280px。** 两者必须同进同退，否则窄屏下没有按钮可恢复、会卡在隐藏状态；而 `<1280px` 时 Rspress 在导航栏下方自带「菜单 / 目录」工具栏接管了这两个面板，我们的按钮本来也是多余的。

   按钮的图标由 CSS 按 `<html>` 上的 `data-windwiki-sidebar` / `data-windwiki-outline` 切换、不经过 React（服务端读不到折叠状态，让图标依赖它会产生 hydration 不匹配）；`aria-pressed` 走 `useSyncExternalStore`，React 先用服务端快照渲染、hydration 后再用客户端快照校正，所以静态 HTML 和浏览器里都正确。

   折叠目录时只让正文在剩余空间里居中（`margin-inline: auto`），不能用 `justify-content`——那会把侧边栏一起挪走。

   `nav-actions.tsx` 里同时有全屏按钮。Rspress 的导航项来自 `_nav.json`、只支持链接，没有插入自定义按钮的插槽，所以整体用 `createPortal` 挂进 `.rp-nav__right`。portal 目标只能在浏览器里查到，因此首屏渲染返回 `null`、挂载后再挂载 portal，避免 hydration 不匹配。
3. **`components/nav-state.ts` + `styles/nav-auto-hide.css`**——导航栏滚动后自动隐藏，鼠标移到顶部再显示回来。`<head>` 里的内联脚本只负责切 `<html>` 的 `data-windwiki-nav`，隐藏与显示全交给 CSS。两点值得记牢：

   - **隐藏时把导航栏占的 64px 还给了内容**，不只是画成透明：把 `--rp-nav-height` 置 0，让知识树、大纲、菜单栏、首页 Hero 的偏移一起收掉，再用负外边距抵消 `.rp-nav` 在流内占的高度。不这么做，内容利用率不会变。
   - **隐藏和显示必须用两个不同的阈值（滞回：160 / 80）**。收起导航栏会让文档少 64px，Chrome 的滚动锚定为了保持画面稳定会把 `scrollY` 回退 64px；只有一个阈值时就会掉回阈值以下 → 又展开 → 再收起，形成振荡（实测在阈值附近 900ms 内触发了 57 次 scroll）。两个阈值间隔大于 64px 即稳定。

   - **隐藏时必须让导航栏不吃指针事件（`pointer-events: none`），只在最顶端留一条 10px 感应区**。否则隐藏的导航栏仍占着并捕获顶部 64px，鼠标停在这片区域（比如刚点完全屏按钮）`:hover` 就一直成立，导航栏再也隐藏不掉——全屏时鼠标本来就在顶部，所以特别容易触发。

   只在 `@media (hover: hover) and (min-width: 1024px)` 下生效：显示依赖 hover，触摸屏没有 hover，隐藏了就点不回来。注意 headless Chrome 默认报告 `hover: none`，验证这个特性要用 `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`，否则会误判成实现有问题。
4. **`builderConfig.html.tags`**——在 `<head>` 注入两段内联脚本：首次绘制前恢复两个面板的折叠状态，以及导航栏自动隐藏的滚动监听。都放在这里是因为浏览器恢复上次滚动位置发生在脚本执行之后，用 React 组件会先闪一下。Rspress 的 `head` 配置类型是 `[string, Record<string, string>][]`，带不了内联内容，所以走 Rsbuild 的 `html.tags`。

   > 这段脚本是拼出来的一行代码，**每条语句必须以分号结尾**。少了分号不会有换行可供 ASI 插入，整段脚本会直接 SyntaxError、一个面板都恢复不了，而且只在浏览器控制台报错——构建和 `tsc` 都不会发现。

5. **`styles/code.css`**——代码块里注释的颜色。默认主题浅色下是 `#b6b4b4`（白底对比度仅 **2.06:1**）、深色下是 `#6a727b`（`#121212` 上 3.84:1），都读不清；多行文档注释（`"""..."""`）整段都是这个颜色，尤其明显。换成各主题下达标的灰：浅色 `#6a727b`（4.88:1）、深色 `#9aa5b1`（7.49:1）。

   > 主题把这两个值写在 `:where(html:not(.rp-dark))` / `:where(html.rp-dark)` 里，`:where()` 特异性为 0，所以 `:root` 与 `html.rp-dark` 可以直接覆盖，不需要 `!important`。
   >
   > 仍有低于 4.5:1 的 token（浅色的 `--shiki-token-string` 3.04:1、`--shiki-token-parameter` 2.30:1），属于配色选择而非缺陷，需要时再一起调。

6. **`builderConfig.output.dataUriLimit`**——设为 `{ image: 0 }`，禁止把图片内联成 base64 data URI。默认阈值是 4096 字节，小于它的图片会被内联；正文图片走打包器，于是几张几十 KB 的小图会变成 base64 塞进 `llms-full.txt`，对喂给模型的 markdown 没有意义。设成 0 之后所有图片都是可解析的 URL。

   > 该选项只覆盖 `image`；`svg` / `font` / `media` / `assets` 仍是默认的 4096。将来若在正文里引用小 SVG，需要把 `svg` 也设为 0，否则会出现同样的内联。

7. **`components/pdf-viewer.tsx`（页面里用，不在 `globalUIComponents`）**——PDF 阅读器：正文渲染成 canvas，文字层单独渲染。它把 PDF 书签树 portal 进默认主题的 `.rp-outline__toc`，条目直接复用 `.rp-toc-item` / `.rp-toc-item__text` 两个类名，所以右侧目录和「页面大纲」长得一模一样（含选中时的左侧竖条）。因为默认主题的目录面板是空的（页面上没有 h2~h4），portal 进去不会和 React 打架。

   > 目录是客户端 portal、不在静态 HTML 里：portal 目标只有浏览器才查得到。这与 `nav-actions.tsx` 同样的取舍。搜索高亮依赖页面的文字层，而文字层的样式是从 `pdfjs-dist/web/pdf_viewer.css` 摘出来的 `.textLayer` 规则、只改了类名（见 `components/pdf-viewer.css` 末尾），升级 pdfjs-dist 时要连这段一起更新。

   `pdf-viewer.css` 开头还有几条针对默认主题的覆盖，都用 `html:has(.windwiki-pdf-viewer)` 限定，只在这一页生效：

   - `.rp-doc-layout__doc` 的 `overflow` 改回 `visible`（它默认带 `overflow-x: auto`，另一轴随之变成 auto，于是成了滚动盒子、里面的 `position: sticky` 工具栏粘不住）、`max-width` 放开、`.rp-doc-layout__doc-container` 的左右留白从 80px 收到 24px——后两条是为了让 A4 页面尽可能大。
   - `--rp-outline-width` 268px → 296px、`--rp-outline-padding-x` 20px → 12px。PDF 的书签标题普遍偏长（「3.2.1 常用大模型服务平台介绍」），原来二级标题只剩 178px 文字宽度，82 条里有 15 条要折成两行；调完只剩 2 条。**要改就改这两个变量，别直接改 `.rp-outline__toc` 的 padding**：选中态的左侧竖条用 `left: calc(-1 * var(--rp-outline-padding-x))` 定位、标题和分隔线也吃这个变量，只动 padding 会让竖条跑到裁切区外面。宽度是吃布局余量换来的，实测 PDF 页面宽度没变（还是 932px）。

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
