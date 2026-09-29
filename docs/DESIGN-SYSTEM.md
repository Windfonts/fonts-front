# 文风字体 · 设计系统（v4 · B「柔和 · 圆润」）

> **微观细节**（许可标签 / 胶囊 / 密度等）：先出多版对照给人选，定稿再进真源。见 [FRONTEND-STANDARDS.md §4.1](FRONTEND-STANDARDS.md)。

> 本文是 UI 的唯一真源。改样式先改这里的规则，再改 `css/tokens.css`；`styleguide.html` 是它的活样张。
> 配套：[前端规范](FRONTEND-STANDARDS.md) · [AI 原生工作要求](AI-NATIVE.md) · [交接与后续开发](HANDOFF.md)

## 0. 一句话

**纯白页面上，浅灰填充的圆角面板；面板里的控件是白的；界面 chrome 只有黑白灰；黑只给主按钮、选中态和字标头像；带图头像白底；字体本身是唯一的"装饰"。许可档位与出处信誉可用语义色，不进导航与按钮。**

设计从「字体样张」出发：页面是纸，字体是内容，UI 退到最轻。它不冷（有圆角、有填充、有寒蝉全圆体），也不闹（没有彩色、没有投影、没有描边）。

## 1. 决策记录（为什么是这样）

| 否决 | 原因 | 采用 |
|---|---|---|
| 白底黑字 + 细线分隔（Type Specimen） | 太冷、太西式、同质化 | 浅灰填充面板代替线，圆角代替直角 |
| 墨与纸（宣纸色、朱印红） | 拟物，和 windfonts.com 现网气质不一致 | 纯黑白灰 |
| 任何红色点缀 | 用户明确否决 | `--accent` 落到墨黑 |
| 深色照片 hero、重字重、投影分层（B′） | 用力过猛 | 回到 B：无投影、700 / 400 两档字重 |
| 白卡 + 投影 + 浅灰页（B″） | 深色模式不好做 | 纯白页 + 浅灰面板；深色模式一处覆写 |

## 2. 令牌（`css/tokens.css`）

### 2.1 颜色 · 表面
| 令牌 | 亮 | 暗 | 用在 |
|---|---|---|---|
| `--page` | `#ffffff` | `#111111` | 页面底 |
| `--surface` | `#f5f5f5` | `#1c1c1c` | 面板 / 卡片 / 控制台侧栏 |
| `--paper` | `#ffffff` | `#2a2a2a` | 面板内的控件（输入、按钮、代码块、标签） |
| `--face` | `#ffffff` | `#ffffff` | 带图头像底；深浅都白 |
| `--fill` | `#f0f0f0` | `#262626` | 白页上直接放的小件：默认按钮、导航选中、搜索框、标签 |
| `--surface-2` | `#e6e6e6` | `#333333` | 填充件 hover |
| `--well` | `#f0f0f0` | `#262626` | 输入框、代码块底 |
| `--rule` / `--rule-2` | `#e6e6e6` / `#efefef` | `#2c2c2c` / `#232323` | 仅 KV 表、数据表行线 |

### 2.2 颜色 · 文字
`--ink #111` 正文与标题 · `--ink-2 #333` 次级正文 · `--gray #666` 说明 · `--gray-2 #9a9a9a` 弱说明 / 占位 · `--on-ink #fff` 黑块上的字 · `--accent = --ink`。

### 2.2b 颜色 · 语义（许可 / 信誉结论）
| 令牌 | 亮 | 暗 | 用在 |
|---|---|---|---|
| `--ok` / `--on-ok` | `#1f7a3f` / `#fff` | `#2c8f52` / `#fff` | 开源商用档芯片 |
| `--warn` / `--warn-edge` | `#8a6d1a` / `#b08a2e` | `#cbb06a` / `#8a7434` | 信誉「一般」、警告徽章 |
| `--caution` | `#a05a2c` | `#c48a5c` | 官网失效等暖警示 |

**规则**
- 禁止在组件或页面 CSS 里写十六进制颜色；只引用令牌。
- 黑色块（`--ink` 背景）每屏最多一颗主按钮 + 字标头像 + 当前选中项。带图头像用 `--face`（深浅都白）。
- 深色模式 `--fill` 比 `--surface` 略亮，避免按钮、标签贴在面板上消失。
- 界面状态默认用文字 + `status-dot`（实心 = 正常，空心 = 待处理）；彩色只允许语义令牌，且仅限许可档位与出处信誉，不进 chrome。

### 2.3 字体与字阶
- UI 字体 `--font-ui`：阿里巴巴普惠体（`css/fonts.css` 本地 woff2 子集）→ 寒蝉全圆体（Chill Round Gothic）→ PingFang SC → Noto Sans SC → 系统。实现以 `css/tokens.css` 为准。
- 等宽 `--font-mono`：系统等宽；用于 slug、URL、代码、数字表格。
- 字阶：`12 13 14 16 20 28 40 64 96 144`（rem）。移动端 `40/64/96/144` 自动缩小。
- 字重只有两档：`--fw-title 700`（标题、字体名、选中项）· `--fw-body` / `--fw-label` 都是 `400`。不用 500 / 600。样张里展示某款字自带的 Medium / Semibold 除外。
- 行高：`--lh-tight 1.15` 大标题 · `--lh-snug 1.3` 小标题 · `--lh-body 1.6` 正文。
- 样张文字（字体本身的展示）不受 UI 字阶限制，按控制条设定的字号渲染。

### 2.4 间距 · 圆角 · 版心
- 间距 4px 基准：`--s-1 … --s-24`（4/8/12/16/20/24/32/40/48/64/80/96px）。面板内边距 `--s-6`，区块间 `--s-3`，页面区段 `--s-10`~`--s-16`。
- 圆角：`--radius 16px` 面板 · `--radius-sm 10px` 面板内控件 · `--radius-pill 999px` 按钮 / 标签 / 输入 / 分段 Tab。
- 版心 `--container 96rem`，边距 `--gutter`（24 → 20 → 16px）。顶栏高 `--topbar-h 4rem`，控制台侧栏 `--rail-w 14rem`。
- 投影：`none`。层次全靠 `page → surface → paper` 三层填充。
- 只套一层盒子：一屏里灰面板只给工具与侧卡（首屏字形墙、品牌卡含资料、标签），正文区块（字重、使用、字符表、授权）和字体库筛选栏用细线分节平铺，不再面板套面板。
- 填充只给状态：筛选、预设、模板这类可选项未选时是灰字，hover 才起 `--fill`（灰面板里翻 `--paper`），选中翻黑。同一屏别出现一排一模一样的灰胶囊。

## 设计 / 开发两种视图

顶栏切换，`<html data-view="design|dev">`，存 `wf-view`，URL `?view=` 可覆盖。判定一句话：**字体本身的属性两边都给，只有接入的机制归开发。** 字重、字符数、语言、发布年是「这款字是什么」，选字的人都要看；代码、字节数、标识符、回退栈是「怎么把它接进页面」，只有开发要。

- 归开发（`.for-dev`）：代码与 CSS 值、标识符（family slug、SPDX）、字节数、Unicode 区段标注、版本号、字形数；「获取代码」标题常显；添加到项目只在「使用」；字体预览的 OS 回退栈、OpenType / 变体轴面板；使用；文档的接入章节；选字袋对比表的制作 / 出处 / 体积列。
- 两边都有：顶栏「控制台 / 登录」、样张、字重、字符数、字符表（区段标注除外）、授权结论、品牌 / 制作方、分类 / 语言 / 发布、浏览量、标签、样张卡片工坊。
- 归设计（`.for-design`）：「查看字体」这类只在设计视图需要的替代入口。
- 主按钮跟视图走：设计视图「加入选字袋」翻黑（`.ink-design`），开发视图「获取代码」翻黑（`.ink-dev`）。标题只留这两颗。
- 首屏字形墙始终可直接改字，不用进任何模式。样张卡片工坊只做「出一张图」，且只在设计视图：开发视图不还原卡片、「编辑样张」隐藏，墙上是普通字形墙。默认画幅 1080×1440 窄幅；刊头仍是横幅，方印仍是方图。第一次套模板和重置带默认文案；之后换模板只换版式和默认画幅，主文 / 副文留下。底栏可换窄幅 / 分享图 / X / 横幅 / 方图，导出或复制 PNG。上次的模板 / 内容 / 微调 / 画幅记在本机。「完成」后卡片留在设计视图的字形墙上。OpenType 与变体轴不在工坊里，在开发视图「字体预览」下面。

### 2.5 动效
`--dur 160ms` · `--ease cubic-bezier(.2,0,0,1)`。只对 `background` / `color` / `opacity` / `transform` 过渡。没有入场动画。

### 2.6 深色模式
所有颜色走令牌，`[data-theme="dark"]` 一处覆写。`localStorage.wf-theme` 持久化；每个 HTML 的 `<head>` 首行有同步脚本防闪白；`?theme=dark|light` 可强制并记住。图片类标志用 `filter: invert(1)`。

## 3. 组件目录（类名 → 文件）

| 组件 | 类 | 文件 | 备注 |
|---|---|---|---|
| 顶栏 | `.topbar .topnav .topsearch .topbar-end .topmenu` | components.css / wf-chrome.js | 白底；导航选中为 `--fill` 胶囊；移动端折叠成 `.topmenu` 覆层 |
| 搜索预测 | `.search-pop .search-hit .search-face` | components.css / `wf-search.js` | 输入出几条；字体名用本款字面，右侧厂商名 |
| 页脚 | `.site-extra-footer` | components.css / wf-proto.js | 一行：左版权与备案，右关于 / 文档。厂商认领不进页脚，走 `claim.html` 与厂商页 CTA |
| 按钮 | `.btn` `.btn-ink` `.btn-text` `.btn-sm` `.icon-btn` | components.css | 默认浅灰胶囊；`btn-ink` 每屏一颗；图标在文字左侧 |
| 输入 | `.input .select .textarea .field .check` | components.css | 无边框，`--well` 底，焦点 2px 墨黑 outline |
| 标签 | `.chip` `.chip.is-on` | components.css | 胶囊；选中翻黑 |
| 徽记 | `.badge` | components.css | 授权档位等 |
| 授权依据 | `.license-cite` | detail.css / `WFChrome.licenseCiteHtml` | 来源类型 + 原文链接 + 摘录；规则见 LICENSE.md |
| 代码块 | `.code` `.code .copy` `.code-inline` | components.css | 复制按钮右上；有 `.copy` 时右侧留白 4.5rem |
| 分段 Tab | `.tabs` `.seg` `.seg-ink` | components.css | 页上灰底白选中；面板里白底灰选中；`.seg-ink` 选中翻黑 |
| KV 表 | `.kv` | components.css | 唯一允许行线的地方之一 |
| 厂商标识 | `.foundry .foundry-sm .mark .name .en .sub` | components.css / `WFChrome.foundryHtml` | 中文名 700 + 英文名 mono 灰 + 副行；带图白底、字标黑底 |
| 数据表 | `.table .num .mono .actions` | components.css | 数字右对齐等宽 |
| 大数字 | `.stat .v .l` / `.stats` | components.css / app.css | 40px 数字 + 13px 标签 |
| 提示条 | `.toast` | components.css / `WFChrome.toast` | 底部居中，黑底白字 |
| 确认 / 输入弹层 | `.dialog-back .dialog .dialog-acts` | components.css / `WFChrome.confirm` · `WFChrome.promptInput` | 居中浅灰面板；Esc / 点遮罩取消；焦点困在层内；破坏性操作默认焦点在取消。输入一律用 `WFChrome.promptInput`，不要用原生 `prompt()` |
| 图标 | `.icon` | components.css / `WFChrome.icon(name)` | 见 §4 |
| 面板 | `.panel .panel-head .panel-pad` | base.css | 浅灰填充、16px 圆角、无边框 |
| 页头带 | `.page-head .lead .kicker .crumb` | base.css | |
| 空态 / 加载 | `.page-state .page-state-item .page-state-skel` | base.css | 公网列表/详情/厂商：kicker + 标题级一行 + CTA，占住版心（约 22rem）。`.empty` / `.loading` 只留给控制台表格小空行，店面不要一行灰字 |
| 控制条 | `.controlbar .view .size` | specimen.css / `WFSpecimen.controlBar` | 粘在顶栏下的浅灰胶囊 |
| 字体卡 | `.specimen .act .specimens` | specimen.css / `WFSpecimen.renderRows` | 行 / 网格两种视图 |
| 字形墙 | `.glyph-wall .wall` | specimen.css | 详情页首屏，全站最大的字 |
| 字重逐行 / 字符表 | `.weights-sheet .glyph-blocks` | specimen.css | |
| 控制台壳 | `.app .rail .rail-nav .rail-foot .app-main .app-head .app-section` | app.css / wf-app.js | 侧栏是 `--surface` 面板 |
| 控制台专用 | `.inline-form .status-dot .version-list .proj-list .usage-grid .weight-bars .status-row .back .drop` | app.css | `.version-list` 各行用固定列宽（`5rem · 1fr · 5.5rem · 12.5rem`）保证体积 / 时间纵向对齐，勿改回 `auto` |
| 文档 | `.docs .docs-toc .docs-search .docs-body .docs-steps .docs-foot .faq .note` | site.css | 文档独立：左栏章节目录 + 筛选；说明页另用站点目录；窄屏下拉 |

新增组件的门槛：先确认现有组件组合不能表达，再加；加了要在 `styleguide.html` 补样张、在本表补一行。

## 4. 图标

- 图集：Remix Icon 线标（Apache-2.0），经 [墨图爱可 icons.motucloud.com/collection/ri](https://icons.motucloud.com/collection/ri?style=outline) 选取，24 栅格平头线条，跟普惠体的平头字端同一气质。
- 打包：`assets/icons.svg` 一个 sprite，`<symbol id="i-{name}">`；输出用 `WFChrome.icon('name', cls?)`，静态 HTML 用 `<svg class="icon"><use href="assets/icons.svg#i-name"/></svg>`。
- 现有名称：`search bag user menu moon sun flash server font-size shield globe certificate rows grid copy check close refresh edit download external arrow-right chevron-right chevron-down plus trash upload settings chart folder scissors font dashboard exit filter verified code link eye info time history key mail cloud rocket text translate box text-area star book home question building classify group user-add idcard branch calendar hashtag palette more quote version commit merge compare`。
- 谱系用 git 线标：原作 / 改自 = commit，派生 = branch，地区版 / 合作 = merge，同支 / 同系 = compare。委托定制不加。
- 活页面区块标题（详情「使用 / 字重 / 字符表 / 授权 / 谱系」、侧栏「资料 / 标签」、首页「现在的库」、厂商「入驻与认领」、认领「流程 / 需要准备」、定价「常见问题」）一律带标。说明 / 法律正文标题不加。
- 一义一标：同一屏里不同含义不得复用同一颗图标；缺标再从 motucloud Remix 线标补进 sprite。symbol 上的 `data-ri` 是 Remix 原名（如 `add-line`），`id` 仍用站内语义名（如 `i-plus`）。
- 尺寸：默认 `1.1em`；`.icon-btn` 内 1.2rem；按钮内 1.05em；随 `currentColor` 着色，从不单独上色。
- 缺图标：先去 motucloud 的 Remix Icon 线标里挑同风格的，加进 sprite；不要混入其他图标集。

## 5. 版式与页面骨架

### 公开站（`body.page-*`）
`<header data-topbar data-active="…">` → `<main class="container">` → `<footer id="wfExtraFooter">`。
- 首页：hero（大标题用当前样张字体渲染）→ 控制条 → 三栏（筛选栏 / 字体列表 / 当前字体侧卡）。
- 字体库：控制条 → 两栏（筛选栏 / 列表，无限滚动，排序在计数行右侧）。
- 详情：面包屑 → 标题行 → 字形墙 → 两栏（正文 tabs / 侧栏 KV + 厂商 + 使用代码）。
- 厂商：索引卡片网格；单厂商 hero + KV + 旗下字体。
- 文档独立页，左栏是章节目录。关于 / 设计指南 / 认领 / 上传条款 / 法律薄页共用另一条左侧目录（本站 · 许可 · 法律）。设计指南（`styleguide.html`）用这套说明壳，左栏能切回关于；样张仍是 `.sg-*`，不要把色板标题改成说明页的大标题。
- 认领：目录 + 说明 + 侧卡表单（未登录给登录 / 注册）。
- 404：短文 + 回首页 / 字体库。不挂说明目录。

### 控制台（`body.app`）
`<aside class="rail" data-rail data-active="…">` + `<main class="app-main" id="root">`。页面由 JS 渲染进 `#root`：`.app-head`（标题 + 副标题 + 右侧动作）→ `.stats` → 若干 `.app-section`（可用 `.usage-grid` 两栏）。
大字（`html[data-scale="lg"]` 的 `zoom: 1.5`）只作用于公开站；控制台 `body.app` 显式排除（`html[data-scale="lg"]:not(:has(body.app))`），否则整屏被放大 1.5 倍、布局全乱。控制台不提供大字开关。

### 响应式
`1024px`：gutter 收窄、搜索框缩短、三栏收成两栏。`768px`：单栏、字阶缩小、顶栏动作只留图标、目录改横向、控制台侧栏改顶部横向滚动并露出主题 / 退出。

## 6. 文案与语言

- 界面语言中文；标点全角；数字与英文两侧留一个空格（"在库 128 款"）。
- 厂商名一律中文，英文与简称由 `data/foundries.json` 提供，只在厂商标识副行和厂商页展示。
- 动作按钮用动词短语："加入选字袋 / 获取代码 / 添加到项目 / 我已完成验证"。
- 状态用事实陈述而不是形容词："待验证"而非"未完成"；"403 拦截"而非"异常"。
- 说明文字 13px 灰，一句话说清，不用感叹号、不用表情符号。

## 7. 可访问性与状态

- 焦点：`:focus-visible` 2px 墨黑 outline，不隐藏。
- 图标按钮必须有 `aria-label`；纯图标 `aria-hidden="true"`。
- 表单控件必须可被读出：`.field` 里写 `<label for="控件id">`；无法用 `for` 时给 `aria-label`。不要只拿 placeholder 当标签。
- 需要用户输入时用 `WFChrome.promptInput`（返回 `Promise<string|null>`），不要用原生 `prompt()`；破坏性操作先 `WFChrome.confirm`。
- 键盘：`/` 聚焦搜索，Esc 关闭覆层；Tab 顺序按 DOM。
- 对比：正文 `#111/#fff`；说明 `#666/#fff` ≥ 5.7:1；弱说明 `#9a9a9a` 仅用于非关键信息。
- 每个列表都有空态文案 + 一个去处。公网字库 / 选字袋 / 厂商 / 详情用 `.page-state`（失败带按钮），不要 `.empty` 14px 灰字。控制台表可以仍用 `.empty`。骨架用 `.page-state-skel` / `.specimen.is-skel`，不要再用单独一句 `.loading` 当整页。
- 每个操作后给 toast 反馈；破坏性操作必须先 `WFChrome.confirm`，再执行。
