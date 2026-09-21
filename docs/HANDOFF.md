# 文风字体 · 交接与后续开发

> 面向接手后端 / 全栈的同学与智能体：原型现状、页面清单、需要后端提供的接口契约、已知待办。

## 1. 现状一览

- 纯静态原型，所有页面可直接打开；公开字体从正式 CDN `cn.windfonts.com` 实时加载（真实字形）。
- 目录 202 款字体（`data/fonts.json`，由 vault API 导出，2026-09-20 全量品牌核验后重导出）；厂商字典 78 家（`data/foundries.json`），123 款挂品牌、79 款按「宁缺勿错」留空。品牌方 / 制作方 / 谱系见 `data/font-lineage.json`。
- 控制台完整可操作（localStorage 持久化）：项目、域名白名单与验证、子集化、版本回滚、用量四维统计、团队、认领、审计、上传、设置。
- 设计系统 v4「柔和 · 圆润」已定稿，见 [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)。
- **双平台：** Windfonts = 分发（本仓）；`wenfeng.org` = 造字、授权、源文件。总则见 [PLATFORMS.md](PLATFORMS.md)。授权依据见 [LICENSE.md](LICENSE.md)。

本地预览：任意静态服务器指到仓根即可，例如 `python3 -m http.server 16016`，然后打开 `http://127.0.0.1:16016/`。控制台页面加 `?demo=1` 免登录。

## 2. 页面清单与状态

| 页面 | 路径 | 数据来源 | 状态 |
|---|---|---|---|
| 首页 | `index.html` | fonts.json + foundries.json | 完成 |
| 字体库 | `fonts.html` | 同上；筛选含 `?lineage=` `?kind=brand` | 完成 |
| 字体详情 | `font-detail.html?id=` | 同上；字形墙、样张编辑、OG/横幅出图、字重、字符表、授权、谱系 | 完成 |
| 厂商索引 / 单厂商 | `foundry.html[?slug=]` | foundries.json + font-lineage.json | 完成；归属与受托制作分列；认领去 `claim.html` |
| 特点 | `features.html` | 静态 + 精选字体 | 完成 |
| 定价 | `pricing.html` | 静态 | 仅开发模式 / 显式允许；正式站默认隐藏，见 `WFChrome.showPricing` |
| 文档 | `docs.html` | 静态 | 完成，口径为 CDN 规则；独立页，左栏章节目录 |
| 关于 | `about.html` | 静态 | 完成；双平台分工 + 公司 |
| 404 | `404.html` | 静态 | 完成；部署时需 `error_page 404 /404.html` |
| 上传条款 | `upload-terms.html` | 静态 | 完成；上传页勾选链到此页 |
| 认领流程 | `claim.html[?slug=]` | foundries.json + 控制台 claims | 完成；未登录给入口，登录后提交 |
| 免责 / 隐私 / 服务条款 / 商标 | `disclaimer.html` `privacy.html` `terms.html` `trademark.html` | 静态 | 完成；薄页，写现况；许可说明链到 `docs.html#license` |
| 选字袋 | `shopping-bag.html` | localStorage `wf-proto-picks` | 完成 |
| 登录 / 注册 | `login.html` · `?mode=signup` | 演示登录（无鉴权） | 待接真实认证；`next=claim` 回到认领页 |
| 样张 | `styleguide.html` | — | 完成，随设计系统维护 |
| 控制台 · 概览 | `app/index.html` | mock-app.json | 完成 |
| 控制台 · 项目 / 项目详情 | `app/projects.html` `app/project.html?id=&tab=` | 同上 | 完成 |
| 控制台 · 域名 | `app/domains.html` | 同上 | 完成（白名单、验证、拦截记录、CSV） |
| 控制台 · 我的字体 | `app/fonts.html` | 同上 + 目录 | 完成 |
| 控制台 · 子集化 | `app/subset.html` | 同上 | 完成（体积为估算） |
| 控制台 · 用量 / 字体钻取 | `app/usage.html[?font=&range=]` | 同上 | 完成（7/30/90 天、CSV） |
| 控制台 · 团队 | `app/team.html` | 同上 · team[] | 完成（邀请 / 角色 / 移除） |
| 控制台 · 上传 / 设置 | `app/upload.html` `app/settings.html` | 同上 | 完成（认领与审计持久化；上传为前端解析演示） |
| 设计对比 | `design-options.html` | — | 决策留档，可删 |

## 3. 需要后端提供的接口（契约草案）

统一响应：`{ "data": …, "error": null }` / `{ "data": null, "error": { "code", "message" } }`；带 `X-Request-Id`；从 `/v1/` 起版本化；列表接口分页 `?page=&size=`。

### 公开
| 方法 | 路径 | 说明 | 对应前端 |
|---|---|---|---|
| GET | `/v1/fonts` | 目录，字段同 `fonts.json` 记录 | `WFProto.loadCatalog` |
| GET | `/v1/fonts/{id}` | 单字体 | `WFProto.getFont` |
| GET | `/v1/foundries` | 厂商字典，字段同 `foundries.json` | `WFProto.getFoundries` |
| GET | `/v1/foundries/{id}/fonts` | 厂商旗下字体（归属；受托制作另列） | 厂商页 |
| GET | `/v1/lineage` | 同系 / 上下游，字段同 `font-lineage.json` | 详情谱系、`?lineage=` |
| GET | `/v1/search?q=` | 关键词 / 自然语言检索（AI 选字） | 顶栏搜索、控制条 |

### 认证后
| 方法 | 路径 | 说明 | 对应前端 |
|---|---|---|---|
| GET/POST | `/v1/projects` · `/v1/projects/{id}` | 项目 CRUD | `WFApp.projects/createProject/removeProject` |
| PUT | `/v1/projects/{id}/fonts` | 设定字体、字重、子集，返回新版本 | `WFApp.addFont/removeFont` |
| GET/POST | `/v1/projects/{id}/versions` · `POST …/{v}/rollback` | 版本列表、回滚 | `WFApp.pushVersion/rollback` |
| GET/POST/DELETE | `/v1/domains` · `/v1/domains/{host}` | 全账号域名；`method: dns|file` | `WFApp.allDomains/addDomain/removeDomain` |
| POST | `/v1/domains/{host}/verify` | 触发验证，返回 `verified, verifiedAt` | `WFApp.verifyDomain` |
| GET | `/v1/domains/blocked?range=30d` | 白名单外来源（403）聚合 | `WFApp.blockedHosts` |
| GET | `/v1/usage?range=7d|30d|90d` | 总量、每日序列、状态码分布 | 用量页 |
| GET | `/v1/usage/by-font` · `/v1/usage/fonts/{id}` | 字体维度（含字重、项目、域名拆分） | `WFApp.usageByFont/fontUsage` |
| GET | `/v1/usage/by-domain` · `/v1/usage/by-project` | 域名 / 项目维度 | 用量页 |
| GET | `/v1/usage/export.csv?range=` | 服务端导出（可替代前端生成） | 导出按钮 |
| POST | `/v1/uploads` | 上传字体，返回解析结果与处理状态 | 上传页 |
| GET/PUT | `/v1/settings` | `display`、API Key 轮换 | 设置页 |
| POST | `/v1/foundries/{id}/claim` | 厂商认领 | `WFApp.submitClaim` |
| GET/POST | `/v1/team` · `PUT/DELETE /v1/team/{id}` | 成员邀请、改角色、移除 | `WFApp.inviteMember/setMemberRole/removeMember` |
| GET | `/v1/audit` | 操作审计 | `WFApp.state().audit` |

### CDN
- 公开：`https://cn.windfonts.com/wenfeng/fonts/{slug}/{weight}/web/index.css | zh_index.css`。**建议后端在 CSS 中补齐 `font-weight` 与合法 `font-style`**，前端目前用 `ensureFontCss` 拉取后修正，接口修好后可去掉该修正。
- 项目：`https://cn.windfonts.com/p/{slug}/index.css`，按项目设置生成、校验 Referer/Origin、白名单外 403 并计入拦截统计。对外 CDN 域名一律 `cn.windfonts.com`。
- 用量口径：请求数、字节数按域名 / 字体 / 字重 / 状态码聚合，延迟 ≤ 5 分钟；性能指标来自 CSS 内置 Resource Timing 上报。

## 4. 已知待办与开放问题

- 厂商中文名标 `provisional: true` 的待确认名单（2026-09-20 品牌核验后剩）：阿森德、瀞字型、字体传奇、山石字库、字体树、频凡字库、上海睿翾创意设计、中日韩字体计划、SCF 字库、波比工作室、ymnk 设计、问藏书房。已由版权字段定案脱敏：沐瑶字库→FlexiFont、女书字库→綿飴、辰宇字型→置空（设计师个人）、日本系统开发→Aoyagi Kouzan、杭州火石→置空（无据）、智勇造字→贾智勇、鼎猎咨询→Miao Keming。
- 目录里 18 款未署名字体中仍有 12 款无法归属（点点像素宋体系列等），待补元数据。
- 登录、认领、上传为前端演示流程，需接真实认证与对象存储。
- 破坏性操作已用 `WFChrome.confirm` 二次确认（移除字体 / 域名 / 成员、回滚、删项目、清空选字袋、轮换密钥、恢复示例数据）。
- 定价档位与配额数字、超量单价为占位口径（专业版 200 GB / ¥0.8 per GB），等商务定稿。
- `features.html` 与 `design-options.html` 在信息架构上是否长期保留待定。
- 无障碍：尚未做完整读屏走查；颜色对比已达标。
- 授权依据与防钓鱼见 [LICENSE.md](LICENSE.md)。`licenseVerified` 不再当展示依据；厂商认领与许可核对拆开。
- 样张默认文案数据层已加（`wf-proto-specimen-cfg.v1`），设置页与前台读取未接完。
- 公开页顶栏「设计 / 开发」记在 `wf-view`。设计看样张与档位；开发看嵌入、字符表、出处。授权先出一句话和可以 / 不可以，「出处与依据」按需展开。详情通栏默认字号 / 字重 / 样张条。样张工坊只在设计视图；开发视图仍是普通字形墙。默认出图 1080×1440 窄幅，也可 1200×630、1200×675、1600×500、1080×1080，下载或复制。换模板保主文/副文。「完成」后卡片留在设计视图墙上。微信 / Slack 的 `og:image` 仍须后端出固定 URL。

## 5. 迭代记录

- v4.2.1（2026-09-20 深夜）：**lineage 品牌方对齐**——5 款联合出品字 DB 归到品牌方（阿里汉仪智能黑体→阿里设计、钉钉进步体→钉钉、抖音美好体→字节跳动、胡晓波酷黑体(Zkkht)→胡晓波工作室【解存款疑悬案】、寒蝉龙藏楷书→寒蝉字型），制作方留 lineage.maker（汉仪/方正）。brands 表新增 bytedance/dingtalk 行；备份 preLineageAlign。lineage owner vs DB 不一致清零。
- v4.2（2026-09-20 晚）：**全量品牌归属核验**（vault 生产库三轮 SQL，feicode-prod，备份 `prod.db.bak-20260920-preBrandFix3`）。原则＝版权字段定案、上游≠发布方、宁缺勿错。新建品牌行：小米 / OPPO / IBM / Aoyagi Kouzan / Potta / 贾智勇 / IPA；错挂修正：小米兰亭（汉仪→小米）、OPPO Sans ×2（汉仪→OPPO）、Droid ×2（Ascender→Google）、IBM Plex SC（Sandoll→IBM）、香山毛笔（NSD→青柳）、波塔（下载站→Potta）、仓耳三款（行名「造字工房」错）、沐瑶（行名「Reeji/Sharp Type」错→FlexiFont）、鼎猎（「丁烈」无据→Miao Keming）、金山云技术体（Kingsoft Office→金山云）、猫啃竹圆体（→猫啃网）；思源 CN/SC/TW、庞门粗书体 ×2、站酷快乐体、Unifont 由空补挂；无据置空：祥隶方体、辰宇落雁、临海隶书、峄山碑篆。**台湾系字体按要求整批未动**（一点字坊/王漢宗/清松/教育部/俐方体/CMEX/PMingLiU）。`foundries.json` 同步：72→78 行、补 20+ 别名、Adobe 主显名改原文、lineage 35 条零冲突。目录重导出 202 款。存疑待拍：HuXiaoBoKuHei（norm 与中文名打架，cp 空）。
- v4（2026-09）：设计系统重做为「柔和 · 圆润」；首页改为字体库式；新增厂商字典、CDN 直连、图标集、深色模式、域名页、用量四维统计与字体钻取、文档重写、本套文档。
- v4.1（2026-09-20）：对外 CDN 统一 `cn.windfonts.com`（含项目 `/p/{slug}/index.css`）；确认弹层；团队 / 审计 / 认领持久化；选字袋对比；详情页跨平台回退预览；控制台与公开站移动端。
- 更早：见 `CHANGELOG-v2.md` `CHANGELOG-v3*.md`。

## 6. 头像管线（2026-09-20 定稿，motuicons 同款）

- `scripts/fetch-avatars.mjs`：猎取厂商**真实头像** → `assets/avatars/<slug>.webp` → 清单 `data/avatars.json` → `export-fonts.mjs` 把 `brand.avatarUrl` 指到本地路径。页面零第三方热链。
- 运行时 `WFProto` 加载 `avatars.json`，`WFChrome.brandAvatar` 按当前展示的厂商 id（`ownerInfo` / `foundryInfo`）取图；不再依赖哪条目录碰巧写了 `brand.avatarUrl`。本地路径经 `WFChrome.ROOT` 拼，控制台子目录也能显示。
- 优先级：GitHub 组织原图（不带 size 直出 460px，手工表 `GITHUB`）→ 官网 HTML og:image / apple-touch-icon / 大 logo（`siteLogoCandidates`）→ 微博搜索 avatar_hd（`WEIBO` 表，认证号优先）→ 缺。拒收：identicon 哈希命中 / 同名个人号（chilltype/zcool 已核实剔除）/ <72px / HTML / 促销横幅（qiantu 的 og 抓到过 AI 产品图、baotu 抓到活动横幅、dynalab 抓到 og 卡片，全部人工剔除）。
- 终态 **30 家真标**（微软/IBM/OPPO/小米/字节/钉钉/斗鱼/快看/Adobe/Google/阿里/汉仪/方正/站酷/猫啃/仓耳/字体家/摄图/文泉驿/IPA/M+/GNU…），其余 49 家走墨黑字标（`.mark` 首字），等厂商认领后覆盖同名 webp。
- 注意：GitHub API 匿名 60/h 限流（脚本用无参 .png 绕开）；ICO 转 PNG 走 sips；WebP cwebp -q 92；og:image 抓到的图必须人工拼图目检，促销图/横幅会混进来。

### 头像第三方源探测结论（2026-09-20 深夜，勿重复踩）

可白嫖：GitHub 组织原图、官网 og:image/logo、apple-touch-icon、维基共享（中文厂无覆盖）。已死：微博/B站/公众号（登录/wbi 签名/验证码）；FontSpace（403）、MyFonts/FontKe/17font（JS 渲染或结构不稳）。剩余 49 家＝个人设计师/已死项目/围墙平台，字标即终态；真 logo 覆盖 `assets/avatars/<slug>.webp` 单文件即生效。fontree logo 1089px 已入。

### ZCOOL 通道跑通（2026-09-20 深夜）

真浏览器（IAB/browser-use）能过站酷反爬：`zcool.com.cn/search/designer?word=<名>`（curl 必撞滑动验证）。抽取法：页面内 `a[href*="/u/"]` 按 href 聚合出候选（名字+粉丝数+头像），同名精确匹配+高粉取真身；头像剥掉 `?x-oss-process=` 缩放参数即原图；curl 下载须带 `Referer: https://www.zcool.com.cn/`。本轮进账 6 家：胡晓波（胡字标）、庞门正道、郑庆科（郑字书法标）、字体传奇（字印）、龚帆（本人照）、问藏书房（书景），全部人工拼图核身。真标累计 **37 家**。未上榜：云峰（站酷无官方号）、三极（无）、品如（无）、素材集市（无）、荆南字坊（仅 fans=6 的「荆南刻坊」，宁缺勿错未收）。

### fonts.net.cn 通道跑通（2026-09-21，真标 37→45 + 厂商简介入库）

- **全量档案已入 feicode**：`Windfonts/font-foundries` 仓 `sources/fontsnetcn/`——6624 家作者全量（203 厂商/6421 设计师/83 条简介）、头像 6625 张（158 真 + 6466 站点默认占位硬链去重）、匹配表 30 验证+3 拒、脚本可复跑。本节是首轮消化，源数据以该仓为准。
- **通道**：`fonts.net.cn/authors-{1..221}.html` 全量列表（6624 作者，0.2s 限速）→ 索引 `/tmp/wf-authors/index.json`；作者详情页 `/author-{id}-1.html` 的 `site_author_sh_desc` 是完整厂商简介，`site_author_sh_type` 区分 厂商/设计师。头像 CDN `img.cdn.fonts.net.cn/0-author-files/`，curl 直下无需 Referer。爬取全部走 curl（无反爬）。
- **头像进账 8 家**（132×132 jpg → cwebp -q 92）：三极、创客贴、华康 DynaLab、荆南字坊（上轮站酷宁缺勿错，这里官方页直接有）、云峰、钟齐、包图、素材集市。拼图目检过（无促销横幅混入）。真标累计 **45 家**，剩 34 家字标终态。
- **拒收判据（新增两条，沿用即免踩）**：① 头像文件名 `author-avatar-default.jpg` 且 5275 字节＝站点默认占位图（青柳衡山/书体坊/游清松/綿雲飴里四家全是，别下）；② 0 字体 0 人气的同名账号是用户注册的小号（「microsoft」41 人气那个），大厂名命中必须看字体数。
- **身份核验不过关拒收**：flexifont（站内挂 小诗娱乐体/手迹秀雅体，与我们目录的 沐瑶软笔 对不上，宁缺勿错）；pingfang 平方造字（我们目录零归属，无意义）。
- **厂商简介 13 家入库**（foundries.json 新增 `description` + `descSource{site,url,fetched}` 字段）：汉仪/方正/字魂/胡晓波/千图/包图/三极/书体坊/优设/文泉驿/站酷/钟齐/华康。回滚点 `data/foundries.json.bak-20260921`。版权口径：简介是字体天下档位页的厂商介绍文案（多为厂商自提交），`descSource` 留了原页 URL 可追溯；上线前是否改写待拍板。
- **渲染接线**：`js/pages/foundry.js` 单厂商页 hero 简介改为字典 `info.description` 优先（brand.description 模板文案兜底）；`js/pages/detail.js` 侧栏厂商卡下新增 `.brand-desc` 段（多段取首段、CSS 3 行截断，全文在厂商页），`css/detail.css` 配样式。fonts.json 同步重绑 9 款 `brand.avatarUrl`（包图小白体/创客贴×2/云峰×2/荆南缘默体/钟齐流江毛草/龙藏体/素材集市康康体）。avatars.json 45 条与文件系统对拍无悬空。
- 验证（16016）：包图小白体详情侧栏（头像 132×132 加载 + 简介 3 行截断）、foundry?slug=baotu / zihun / hanyi（hero 简介全文 + 头像）、创客贴（无字典简介时回退 vault 品牌描述）、深浅两版截图过目检。

## 7. 字符表 v2 与库内统计（2026-09-21）

- **字符表（详情页 `#glyphs`）**：`WFSpecimen.mountGlyphTable`（wf-specimen.js）替代旧 `glyphBlocksHtml`。千字文全文（简 `QIANZIWEN.hans` 1000 字，简化合并致 6 处重字属正常；繁 `QIANZIWEN.hant` 按通行本还原 1000 字无一重复，源稿 /tmp/wf-glyph/ 生成链：opencc s2t + 九处人工校回【雲/崑、髮/潔、并/並、慼/鍾、岳、嫡后】+ 七处异体校正【念/啟/為/床/弦/群/薑】）。默认展开前 250 字，可「展开全文」；「简/繁」按探测对（国國/这這…）自动选覆盖率高一侧，可手切；「只看已收录」隐藏缺字。
- **缺字标记 + 覆盖统计**：逐字判定收录，未收录格 = 灰字 + 虚线框 + title 提示（`.is-miss`，深色模式 opacity 提到 .6）；块头显示「覆盖 n/total」，摘要行显示千字文覆盖率 + 黑色进度条。**判定真源＝CDN 分包 CSS 的 `unicode-range` 清单**（cn-font-split 按真实 cmap 逐字生成）。⚠️ 不要用 `document.fonts.check()`：实测本 Chromium 对已注册 family 恒真（连 U+20000 都 true），已否决。`fetchCssRanges` 有缓存，跨字重共用一份。
- **验证记录（16016）**：普惠体 1000/1000 简；一点明体 999/1000 简（CBETA 系简繁通吃，默认简合理）；辰宇落雁体（台）自动切繁 966/1000；素材集市康康体 811/1000、标点 30/43、展开=1000 格、只看已收录=缺字全隐。深浅两版截图过目检。
- **首页下半（丙 + 丁图）**：字林之后是当前款一条（`#homeNow`）+ 同分类四款（`#homeRelated`，与详情页相关字体同量）+「全部 N 款 → fonts.html」。全库与筛选只在 `fonts.html`。底部 `#statsBand` 只留三张条形图（按授权 / 厂商 TOP6 / 字符规模），标题「库内结构」带 MingCute 图标；厂商行显示头像（无图走字标）；hero `#homeStats` 收成一行「N 款 · N 家 · N 免费商用」（许可核对只在底栏）。口径同前：68＝有归属字体的厂商分组数，授权 181+19+1+1=202，规模图只统计已录 charCount 的 128 款（未录入不进条，只写在注里）。
- **统计口径（2026-09-21 续）**：千字文覆盖按**唯一字**计（简 994 个不同字 / 繁 1000）；不再按字符串位置计（否则 6 处简化重字会把分母撑到 1000 并制造「993/1000 像满条」的错觉）。**台湾系字体**（一点字坊 / 清松 / 教育部 / 辰宇 / 华康 / 王漢宗 / 俐方体 / CMEX / PMingLiU / 名称含 TW 等）跳过简体千字文收录盘点，只展示样例字符。
- 坑：字符表切换器不能用全局 `seg` 类名——`.panel .seg .is-on` 会把选中态盖成白底，与白字叠加即隐身；只用自有 `seg-glyph`。
- 触及文件：`js/wf-specimen.js`（字符表 v2）、`js/pages/detail.js`（接线）、`js/pages/home.js`（renderStats）、`index.html`（statsBand 容器）、`css/specimen.css` / `css/site.css`（追加）。工作区改动未提交（共享检出纪律）。
