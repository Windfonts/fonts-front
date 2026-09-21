# 文风字体 · 前端规范

> 适用于本仓所有 HTML / CSS / JS。设计层规则见 [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)；给 AI 智能体的工作规则见 [AI-NATIVE.md](AI-NATIVE.md)。

## 1. 架构与原则

- **静态优先**：无构建、无框架、无打包。纯 HTML + CSS 自定义属性 + IIFE 风格的原生 JS。任何页面 `file://` 或任意静态服务器都能打开。
- **数据即接口**：页面只读 `data/*.json` 与浏览器 `localStorage`。将来接后端时，只替换 `wf-proto.js` / `wf-app.js` 里的数据源函数，页面代码不动。
- **单一真源**：字体目录 `data/fonts.json`；厂商名称 `data/foundries.json`；授权依据 `data/license-evidence.json`；控制台演示数据 `data/mock-app.json`；设计令牌 `css/tokens.css`；图标 `assets/icons.svg`。同一信息不得在第二处手写。授权展示只经 `WFChrome.licenseEvidence` / `licenseCiteHtml`，见 [LICENSE.md](LICENSE.md)。
- **KISS / YAGNI**：没有需求不抽象；能用现有组件组合就不新增类；一个文件 ≤ 350 行，超了按职责拆到 `js/pages/` 或新的 css 文件。
- **不模拟、不占位**：演示数据必须是完整、自洽、可解释的（如 `mock-app.json` 里每个字体的请求数之和等于项目请求数）。禁止 `TODO` 占位 UI、禁止 lorem ipsum。

## 2. 目录结构

```
fonts-front/
├─ index.html            首页（字体库 + 侧卡）        js/pages/home.js + fonts.js
├─ fonts.html            字体库                        js/pages/fonts.js
├─ font-detail.html      字体详情                      js/pages/detail.js
├─ foundry.html          厂商索引 / 单厂商             js/pages/foundry.js
├─ features.html         特点（旧首页）                js/pages/features.js
├─ pricing.html · docs.html · shopping-bag.html(bag.js) · login.html · styleguide.html
├─ app/                  控制台（登录后）
│  ├─ index.html 概览 · projects.html · project.html(app-project.js) · domains.html(app-domains.js)
│  ├─ fonts.html 我的字体 · subset.html(app-subset.js) · upload.html · usage.html(app-usage.js) · settings.html
├─ css/
│  ├─ tokens.css         令牌（唯一写颜色 / 字号 / 间距数值的地方）
│  ├─ fonts.css          寒蝉全圆体 @font-face（UI 字体）
│  ├─ base.css           reset、字阶、版心、面板、空态、响应式基准
│  ├─ components.css     全站组件
│  ├─ specimen.css       样张相关（控制条、字体卡、字形墙）
│  ├─ site.css           公开页面级样式
│  ├─ detail.css         详情页
│  └─ app.css            控制台
├─ js/
│  ├─ wf-proto.js        目录、厂商字典、筛选、选字袋、CDN 地址与字体 CSS 注入     → window.WFProto
│  ├─ wf-chrome.js       顶栏 / 页脚 / 登录态 / toast / 图标 / 主题 / 厂商展示      → window.WFChrome
│  ├─ wf-specimen.js     样张渲染、控制条                                          → window.WFSpecimen
  │  ├─ wf-embed.js        嵌入代码生成、体积估算                                    → window.WFEmbed
  │  ├─ wf-card.js         固定像素画布、版式模板、槽位、导出 PNG                      → window.WFCard
  │  ├─ wf-avatar.js       Cravatar / 远程图转 blob / 本地上传                       → window.WFAvatar
  │  ├─ wf-tester.js       样张卡片工坊（模板缩略图、内容槽位、字重、微调、出图）         → window.WFTester
  │  ├─ wf-features.js     OpenType + 变体轴面板，输出 font-feature-settings（开发模式）   → window.WFFeatures
  │  ├─ wf-app.js          控制台数据层（localStorage）+ 侧栏壳 + 门禁                → window.WFApp
│  └─ pages/*.js         每页一个文件，只做该页的取数与渲染
├─ data/  fonts.json · fonts.meta.json · foundries.json · license-evidence.json · mock-app.json
├─ assets/ icons.svg · icon.webp · fonts/*.woff2
├─ scripts/ export-fonts.mjs（从 vault API 导出目录）· merge-licenses.mjs
├─ docs/  本目录
└─ refs/  参考截图
```

脚本加载顺序固定：`wf-proto → wf-chrome → (wf-specimen) → (wf-embed) → (wf-card) → (wf-avatar) → (wf-tester) → (wf-features) → (wf-app) → pages/*`。页面脚本假定前置全局已存在。

## 3. HTML 规范

- 每页 `<head>` 首行（`<meta charset>` 之后）必须有主题同步脚本：
  `<script>try{if(localStorage.getItem("wf-theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}</script>`
- 样式表顺序：`fonts → tokens → base → components → (specimen) → site|app → (detail)`。
- 公开页 `body.page-{name}`，顶栏 `<header data-topbar data-active="{navId}">`，页脚 `<footer id="wfExtraFooter">`。控制台 `body.app` + `<aside class="rail" data-rail data-active="{navId}">` + `<main class="app-main" id="root">`。
- 语义标签：`section` 有标题；表格用 `<table class="table">`；表单控件有 `<label>` 或 `aria-label`。
- 静态图标写法 `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#i-name"/></svg>`（子目录用 `../assets/`）。
- 不写内联事件处理；少量内联 `style` 仅用于一次性间距，颜色 / 字号一律不内联。

## 4. CSS 规范

- **只用令牌**：颜色、字号、间距、圆角、时长都引用 `var(--*)`。新增数值先进 `tokens.css`。
- **不用**：`!important`、ID 选择器、超过 3 层的嵌套选择器、`box-shadow`（令牌为 none）、`border` 做分隔（除 `.kv` `.table`）。
- **命名**：短小的语义类（`.specimen .act`），状态用 `.is-on .is-active .is-current .is-pending .has-side`；控制台专用前缀 `.app-*` `.rail-*`。不用 BEM 双下划线（本仓已有约定，保持一致）。
- **层次表达**：`--page` 上放 `--surface` 面板，面板里控件 `--paper`；白页上直接放的小件用 `--fill`。`.panel .btn` / `.app-section .input` 这类"面板内翻白"规则已在 base/app 里做好，不要在页面级重复。
- **响应式**：断点只有 `1024px` 与 `768px`，写在各文件末尾的同名 media 块里；优先用 `auto-fill / minmax` 让网格自适应而不是加断点。
- **文件归属**：全站可复用 → `components.css`；只在一类页面出现 → `site.css` / `app.css` / `detail.css`；样张相关 → `specimen.css`。

## 5. JavaScript 规范

- IIFE 模块，`'use strict'` 语义（无 `var` 泄漏）；对外只挂一个命名空间 `window.WF*`；页面脚本不导出。
- ES2017 语法为上限（`const/let`、箭头可用但本仓惯用 `function`、模板字串少用；不使用 `async/await` 之外的新提案）。无转译。
- 渲染方式：字符串拼接 `innerHTML`；**所有外部数据经 `WFProto.escapeHtml`**，属性值同样转义。事件在渲染后用 `querySelectorAll` 绑定。
- 数据变更走 `WFApp.*` / `WFProto.*` 的方法并 `save()`，触发 `wf:app` / `wf:picks` 事件，UI 监听事件刷新，不直接改 `state`。
- URL 是状态的一部分：筛选、排序、范围、Tab、钻取 ID 都放 query（`WFProto.getQuery`），刷新不丢。
- 字体加载只通过 `WFProto.ensureFontCss(family, weight)`；它负责从 CDN 拉 CSS、补 `font-weight`、修正相对 URL、去重注入。禁止手写 `<link>` 到 CDN。
- 错误处理：`fetch` 必查 `r.ok`；目录加载失败 `console.warn` 并渲染空态，不抛到全局。
- 命名：函数与变量 camelCase；常量 UPPER_SNAKE；DOM 引用以用途命名（`root`, `rows`），不带类型后缀。
- 注释：文件头一行说明职责与依赖；只有"为什么"值得注释（如 CDN CSS 缺 `font-weight` 的修正）。

## 6. 数据契约

### `data/fonts.json`（由 `scripts/export-fonts.mjs` 生成，不手改）
关键字段：`id name en family normalized designer category tags[] weights[] description license licenseName licenseUrl licenseFileUrl licenseNotes licenseVerified copyright foundry brand{name,slug,website,description} releaseYear version charCount glyphCount viewCount foundryAvatar`。
运行时由 `normalizeFont` 补 `designerShort styles detail foundryInfo`。

### `data/foundries.json`（手工维护，厂商名称唯一真源）
```json
{ "id": "hanyi", "name": "汉仪字库", "en": "Hanyi Fonts", "short": "汉仪",
  "website": "https://www.hanyi.com.cn", "aliases": ["Hanyi Fonts", "汉仪字库"],
  "kind": "foundry", "openSource": false, "claimed": false,
  "fontNames": [], "provisional": false }
```
- `aliases`：目录里出现过的所有原始写法（含 `A;B` 合作署名整串）。
- `fontNames`：目录未署名但可归属的字体名。
- `kind`：`author` | `project` | `foundry` | `brand` | `platform`。`brand` 是出资持有版权的品牌方，不是画字的字库。`openSource` 标的是人/机构。`claimed` 为已认领。
- `provisional: true`：中文名为拟定，厂商页会标注"待厂商确认"。
- 新字体入库出现新厂商写法 → 先在这里加别名，页面自然归并；未收录的按原文生成临时条目（`unlisted`）。

### `data/license-evidence.json`（手工维护，授权依据）
`standards` 为 SPDX 短名；`names` 按字体名匹配。运行时解析为 `font.licenseEvidence`。字段与展示规则见 [LICENSE.md](LICENSE.md)。

### `data/font-lineage.json`（手工维护，归属与谱系）
`groups` 为同系；`byName` 按字体名包含匹配。字段：`ownerId` `makerId` `group` `relation` `upstreamName` `licenseFollows`。运行时挂 `font.lineage` / `ownerInfo` / `makerInfo`。只写对得上的关系，见 [LICENSE.md](LICENSE.md) §7–8。

### `data/mock-app.json`（控制台演示数据，键 `wf-app-state-v2`）
`plan{quota} settings uploads[] projects[] team[] claims[] audit[]`；每个项目：`fonts[]{fontId,weights[],subset{mode,preset|text|ranges}} domains[]{host,verified,method,addedAt,verifiedAt,lastSeenAt} versions[]{v,at,note,bytes,current} usage{requests30d,bytes30d,topPages[],byDomain[],byFont[]{fontId,requests30d,bytes30d,weights{}},status{200,304,403},blockedHosts[],perf{fcpMs,fontLoadMs,hitRate}}`。`team/audit/claims` 由 `ensureShape` 补齐，不升 `KEY`。
改项目结构必须同时：升级 `KEY` 版本、更新 `createProject` 默认值、更新本节。

### 浏览器存储
`wf-theme`（主题）· `wf-view`（`design` / `dev`，公开页顶栏切换）· `wf-proto-picks`（选字袋）· `wf-app-state-v2`（控制台）· `wf-card-pref.v1`（样张卡片上次的模板 / 内容 / 微调，按字体记一份）· `wf-dev` / `wf-show-pricing`（定价页显式打开）· 登录态见 `WFChrome.user()`。
公开页默认设计模式：样张、档位、选字袋在；嵌入、字符表、出处筛、资料 KV、文档接入章节标 `.for-dev`。`?view=dev|design` 可指定并记住。控制台不挂此开关。授权结论与「本站转述」不藏。

定价（`pricing.html`、顶栏「定价」、特点页套餐、文档/登录/设置里的定价入口）默认只在 `localhost` / `127.0.0.1` 显示。正式站须 `?dev=1` 或 `?pricing=1`（写入上述键）才出现；`?dev=0` / `?pricing=0` 关掉。判断：`WFChrome.showPricing()`。带 `data-pricing` 的节点未允许时保持 `hidden`。

## 7. CDN 与嵌入口径

- 公开 CDN：`https://cn.windfonts.com/wenfeng/fonts/{slug}/{weight}/web/index.css`（`zh_index.css` 为中文子集）。`slug = family 去掉 wenfeng-`；`weight` 为小写字重名，优先用目录里该字体的真实字重名（`WFProto.weightName`）。
- 生成的 `<link>` 代码前必须带授权标注注释（`WFProto.CDN_LICENSE_NOTE`）。
- 项目 CDN：`https://cn.windfonts.com/p/{project-slug}/index.css`（控制台用，后端待实现）。对外域名一律 `cn.windfonts.com`。
- 页面上任何写死的 CDN 示例（docs / features / styleguide）都要与 `WFProto.cssUrl` 的输出一致。

## 8. 质量门禁（提交前）

1. `node --check` 每个改动的 JS 文件。
2. 控制台报错清零：用 headless Chrome 打开改动涉及的页面，`--enable-logging=stderr` 不得出现 `Uncaught` / 404（`favicon` 除外）。
3. 截图 QA：1440 与 390 两个宽度各截一张，核对：无溢出、无重叠、黑块数量、空态可见、深色模式 `?theme=dark` 不闪白不漏色。
4. 目录一致性：`python3 -c "import json;json.load(open('data/foundries.json'))"` 通过；新增字体后跑一次别名归并检查（厂商索引数量不突增）。
5. 文档同步：改了令牌 / 组件 / 数据结构，对应更新 `docs/` 与 `styleguide.html`。
6. 不提交 `refs/` 之外的截图、不提交 `/tmp` 脚本、不提交 `.DS_Store`。
7. **不自行 `git commit`**，交由用户确认。

## 9. 性能预算

- 首屏 HTML + CSS + JS（不含字体）≤ 150 KB gzip 前。
- UI 字体寒蝉全圆体 5 个字重本地子集共 ≤ 1.2 MB，`font-display: swap`。
- 样张字体按需加载：只为可见卡片 `ensureFontCss`；列表分页 12 条 + 无限滚动。
- 图标单一 sprite，一次请求。
- 不引入第三方运行时库。
