# fonts-front · 项目结构（智能体开工前必读）

## 技术栈
- 纯静态：HTML5 + CSS 自定义属性 + 原生 JS（IIFE，ES2017 以内，无构建、无框架、无 npm 运行时依赖）
- 数据：`data/*.json`（构建期导出）+ `localStorage`（选字袋、主题、控制台状态）
- 字体：UI 用寒蝉全圆体本地 woff2；样张字体从 `https://cn.windfonts.com` CDN 实时加载
- 产品边界：本仓只做 Windfonts 分发前端；造字 / 授权 / 源文件在 `wenfeng.org`，见 `docs/PLATFORMS.md`。授权依据见 `docs/LICENSE.md`。
- 图标：MingCute Line sprite（`assets/icons.svg`）
- 工具：`node scripts/export-fonts.mjs` 导出目录；headless Chrome 截图 / 抓控制台错做 QA

## 文件树（职责）
```
index.html                首页 = 字体库 + 当前字体侧卡          js/pages/home.js（复用 fonts.js）
fonts.html                字体库                                  js/pages/fonts.js
font-detail.html          字体详情                                js/pages/detail.js
foundry.html              厂商索引 / 单厂商                       js/pages/foundry.js
features.html             特点页（旧首页）                        js/pages/features.js
pricing.html docs.html login.html styleguide.html                 内联少量脚本
shopping-bag.html         选字袋                                  js/pages/bag.js
design-options.html       设计方向对比（决策留档）                css/design-options.css
app/index.html            控制台概览                              内联
app/projects.html         项目列表                                内联
app/project.html          项目详情（fonts/domains/embed/versions/usage 标签） js/pages/app-project.js
app/domains.html          全部域名、验证、拦截记录                js/pages/app-domains.js
app/fonts.html            我的字体                                内联
app/subset.html           子集化工作台                            js/pages/app-subset.js
app/upload.html           上传自有字体                            内联
app/usage.html            用量总览 + ?font= 字体钻取              js/pages/app-usage.js
app/team.html             团队成员                                js/pages/app-team.js
app/settings.html         设置                                    js/pages/app-settings.js

css/tokens.css            令牌（颜色 / 字阶 / 间距 / 圆角 / 动效 / 深色覆写）
css/fonts.css             寒蝉全圆体 @font-face
css/base.css              reset、字阶类、版心、面板、空态、响应式基准
css/components.css        顶栏、页脚、按钮、输入、标签、代码块、Tab、KV、厂商标识、表格、大数字、toast、图标
css/specimen.css          控制条、字体卡、字形墙、字重逐行、字符表
css/site.css              公开页面级（首页、字体库、厂商、定价、文档、选字袋、登录、样张页）
css/detail.css            详情页
css/app.css               控制台

js/wf-proto.js            WFProto：目录 + 厂商字典加载、筛选、选字袋、CDN 地址、ensureFontCss
js/wf-chrome.js           WFChrome：顶栏 / 页脚 / 登录态 / toast / confirm / copy / icon / 主题 / brand* / foundryHtml / licenseTier
js/wf-specimen.js         WFSpecimen：样张行渲染、控制条、字重工具
js/wf-embed.js            WFEmbed：嵌入代码、体积估算、mount
js/wf-card.js             WFCard：固定像素画布、版式模板、槽位、导出 PNG
js/wf-avatar.js           WFAvatar：Cravatar / 远程图转 blob / 本地上传
js/wf-tester.js           WFTester：样张卡片工坊（模板缩略图、内容槽位、字重、微调、出图）
js/wf-features.js         WFFeatures：OpenType 特性 + 变体轴面板，输出 font-feature-settings（开发模式「字体预览」区）
js/wf-app.js              WFApp：控制台状态（localStorage）、项目 / 域名 / 字体 / 版本 / 用量 / 团队 / 认领 / 审计、CSV、侧栏壳、门禁

data/fonts.json           字体目录（导出，不手改）
data/fonts.meta.json      导出元信息
data/foundries.json       厂商字典（中文名 / 英文 / 简称 / 官网 / kind / openSource）
data/license-evidence.json 授权依据（标准许可 + 按字体名）
data/font-lineage.json    品牌方 / 制作方 / 上游同系
data/mock-app.json        控制台演示数据（结构见 docs/FRONTEND-STANDARDS.md §6）

assets/icons.svg          图标 sprite · assets/fonts/*.woff2 UI 字体 · assets/icon.webp 标志
scripts/export-fonts.mjs  vault API → fonts.json · scripts/merge-licenses.mjs
docs/                     DESIGN-SYSTEM · FRONTEND-STANDARDS · AI-NATIVE · HANDOFF · PLATFORMS · LICENSE · ai-context/
refs/                     参考截图
```

## 全局对象与加载顺序
`wf-proto → wf-chrome → wf-specimen → wf-embed → wf-card → wf-avatar → wf-tester → wf-features → wf-app → pages/*`。页面脚本假定前置全局已存在，不做存在性检查。

## 关键约定（详见 docs/FRONTEND-STANDARDS.md）
- 颜色 / 字号 / 间距只引用令牌；全站黑白灰；黑只给主按钮、选中态、头像。
- 外部数据渲染必经 `WFProto.escapeHtml`。
- 厂商名只经 `WFChrome.brand*`；CDN 地址只经 `WFProto.cssUrl / ensureFontCss`。
- URL query 承载页面状态；`localStorage` 键：`wf-theme` `wf-view` `wf-proto-picks` `wf-app-state-v2` `wf-card-pref.v1`。
- 不 commit；不留服务；截图与临时脚本放 `/tmp`。
