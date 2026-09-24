# 文风字体 · 交接与后续开发

> 面向接手后端 / 全栈的同学与智能体：原型现状、页面清单、需要后端提供的接口契约、已知待办。

**2026-09-23 停点：** 公开主路径已基本对齐线上；工程批次已提交（`c78c4ce` 起）。上线硬门槛见 **[LAUNCH-GATES.md](LAUNCH-GATES.md)**（路径 rewrite、真统计、真登录、CDN 去 `local()`）。产品层（控制台 / 选字袋 / 认领等）见下文「产品层 backlog」，继续优化，不挡公开站上线。**完整会话交接见第 9 节**（谱系标准化、OSS 101、猫啃/寒蝉/站酷/荆南核实）；续页 [FONT-AUDIT-BACKLOG.md](FONT-AUDIT-BACKLOG.md)。

**2026-09-23 晚停点（OSS 第二批）：** 目录 401 款。又登记了思源宋体 TC `wenfeng-systtc`、源石黑体 `wenfeng-ysht`、更纱等宽 `wenfeng-gskd`。遍黑体仍只有扩展区，没进。

**2026-09-24 停点：** 目录 413 条，已随本提交推送。去重只看同名。免费商用也进，许可按原文，不改写成 OFL。演示六款制作方是人生哥，不挂花乐。台湾缺字下架，缺字地址显示「未找到该字体」。小米只留小米兰亭 Sans。全字库写台湾省。Fontworks 七款本来就在库。详见第 17 节。搜索框与结果列表同为 18rem。动态引用用 cn / hk / en。详见第 18 节。

**2026-09-24 记下、后面再做：** `jp.windfonts.com`、`hk.windfonts.com` 不另做字库，不另做字体桶。同一套目录、同一套 `cn.windfonts.com` 文件。子域只改默认语言，以及默认先列出简体、繁体还是日文。要加的是已有家族的香港档、繁体档、日文档，加上中文改作指到的日文原作。不要把日文展示字、假名专用字整包收进来，也不要把同一套字的 TC、HK、JP 拆成三张互不相干的卡。地区档仍收在一个产品下。详情页继续用「原作 / 创作 / 派生」。

**2026-09-22 停点：** 人要的是现站改进建议，不是重做整页。对照版 `v5.html` 等已否，不要合并。头像清单以 `data/avatars.json` 的 26 条为准，下面第 6 节里「45 家真标」已过时。详见第 8 节。

## 0. 产品层 backlog（继续打磨，非上线硬拦）

公开站可先上；下列能力原型已有壳，上线后仍需产品与工程迭代：

| 模块 | 现状 | 下一步 |
|---|---|---|
| **控制台** | `app/*` + localStorage；`?demo=1` 免登；顶栏仅注册/管理员可见。2026-09-23 过了一轮对齐与可访问性：`.version-list` 固定列宽、表头 / 数据对齐、表单标签、`WFChrome.promptInput` 取代原生 `prompt`、数据层容错旧 localStorage、头像 onerror 修正、**大字 `zoom` 不再作用于 `body.app`**（此前开着大字进控制台会整屏放大 1.5 倍、看似全乱） | 接真实项目 / 域名 / 用量 API；关掉生产 demo；用量与公开「统计信息」同源 |
| **选字袋 / 收藏** | 本地持久化，可对比与嵌入 | 登录态同步；清空/导出策略；与控制台「我的字体」关系说清 |
| **样张工坊** | 详情设计视图出图 | 模板与默认文案接设置；OG 图需后端固定 URL |
| **厂商认领** | `claim.html` 演示提交 | 真实工单、审核、claimed 回写目录 |
| **谱系** | 详情标题「谱系」；开源才露出上传；厂商页归属按源字/地区版/派生分段 | 勿补无把握关系；上传入口仅开源 |
| **上传** | 前端解析演示 | 对象存储 + 审核队列 |
| **定价** | 三条产品线已落页；默认隐藏 | 商务定数字后再露 |

双轨注意：只维护 `index` / `fonts` / `font-detail` / `foundry` / `docs` / `app/*` 主线；`v5-*`、`*-options.html`、`oss-audit.html` **不进生产入口，但必须保留**（对照 / 研究留档）。索引：`lab.html`，说明：[LAB.md](LAB.md)。

## 1. 现状一览

- 纯静态原型，所有页面可直接打开；公开字体从正式 CDN `cn.windfonts.com` 实时加载（真实字形）。
- 目录 397 款字体（`data/fonts.json`，2026-09-23 晚含第三批；不是全量重导出）。厂商字典加了汇文、中文网字计划、澳声通、汉典、激笔。品牌方 / 制作方 / 谱系见 `data/font-lineage.json`。
- 控制台完整可操作（localStorage 持久化）：项目、域名白名单与验证、子集化、版本回滚、用量四维统计、团队、认领、审计、上传、设置。
- 设计系统 v4「柔和 · 圆润」已定稿，见 [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)。
- **双平台：** Windfonts = 分发（本仓）；`wenfeng.org` = 造字、授权、源文件。总则见 [PLATFORMS.md](PLATFORMS.md)。授权依据见 [LICENSE.md](LICENSE.md)。

本地预览：任意静态服务器指到仓根即可，例如 `python3 -m http.server 16016`，然后打开 `http://127.0.0.1:16016/`。控制台页面加 `?demo=1` 免登录。

## 2. 页面清单与状态

| 页面 | 路径 | 数据来源 | 状态 |
|---|---|---|---|
| 首页 | `index.html` | fonts.json + foundries.json | 完成 |
| 字体库 | `fonts.html` | 同上；筛选含分类 / 风格 / 厂商 / 许可 / `?lineage=` `?kind=`；排序含热门；厂商默认 8 家、按当前筛选项计数排序 | 完成 |
| 字体详情 | `font-detail.html?slug=`（兼 `?id=`） | 同上；查字、字重、字符表、授权、谱系、侧栏统计 | 完成；真路径 `/fonts/{slug}` 见 LAUNCH-GATES |
| 文档 | `docs.html` | 静态 | CDN：动态 `/api/css` + 拆包 `fonts-packages` + 静态旧路径；许可 / FAQ 各自成页 |
| 许可说明 | `license.html` | 静态 | 注意 + 类型对照；侧栏 / 字体页授权脚注 |
| 常见问题 | `faq.html` | 静态 | `<details>` 折叠；TOC / 页脚 / 文档入口 |
| 厂商索引 / 单厂商 | `foundry.html[?slug=]` | foundries.json + font-lineage.json | 完成；分段见下「厂商口径」；认领去 `claim.html` |
| 特点 | `features.html` | 静态 + 精选字体 | 完成 |
| 定价 | `pricing.html` | 静态 | **三条产品线**（云托管 / 开源自托管 / 私有化）；云内免费·专业；私有字=自有授权托管。数字仍占位。仅开发模式 / 显式允许，见 `WFChrome.showPricing` |
| 关于 | `about.html` | 静态 | 完成；双平台分工 + 公司 |
| 404 | `404.html` | 静态 | 完成；部署时需 `error_page 404 /404.html` |
| 上传条款 | `upload-terms.html` | 静态 | 完成；上传页勾选链到此页 |
| 认领流程 | `claim.html[?slug=]` | foundries.json + 控制台 claims | 完成；未登录给入口，登录后提交 |
| 免责 / 隐私 / 服务条款 / 商标 | `disclaimer.html` `privacy.html` `terms.html` `trademark.html` | 静态 | 完成；薄页，写现况；许可说明链到 `license.html` |
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
| 设计对比 | `design-options.html` | — | **留档勿删**，见 [LAB.md](LAB.md) / `lab.html` |
| 对照实验室 | `lab.html` + `*-options.html` + `v5-*.html` + `oss-audit.html` | `data/lab-archive.json` | 索引与政策；不进生产导航 |

## 3. 需要后端提供的接口

### 3.0 现网 `app.windfonts.com`（2026-09-24 核对）

现网是 Next 应用（仓 `fonts-vault`），不是下面那份 `/v1/` 草案。公开响应信封是 `{ "code": 200, "message": "success", "data": … }`。匿名 GET 大约 100 次/天，不要在每个页面打开时拉全库。

已经有、本仓静态页还没改成走它的：

| 现网 | 本仓现状 |
|---|---|
| `GET /api/fonts?page&size&category&brand&search&sort`，`sort` 为 `name` / `createdAt` / `viewCount`。`data` 含 `total,page,pageTotal,dataList`。2026-09-24 抽样 total 410 | 目录仍读 `data/fonts.json` |
| `GET /api/fonts/:id` 或 `:family`，带 `viewCount` / `downloadCount` / `apiCallCount`、`weights` 对象、`languages`、`useCases` | 详情仍用本地目录。打开详情时按 `fontFamily` 拉这一次计数，6 小时内缓存；跨域要等 vault 的 CORS 部署后才看得到 |
| `GET /api/categories`、`GET /api/brands` | 分类和厂商用本地 JSON |
| `GET /api/fonts/:id/analysis` 字符表，没有分析文件时 404 | 详情查字用本地数据 |
| `GET /api/css?family&weight&subset`（`subset` 或 `lang`：`full` / `zh` / `zh-common` / `en`）。**不认 `version`**。`cn.windfonts.com/api/css` 是 OSS 404 | 嵌入地址改到 `app.windfonts.com/api/css`，并同时写 `subset` 和 `version` |
| 管理后台：字体 / 厂商 / 分类 / 风格、同步、安全开关、域名白名单、域名黑名单、API 密钥。IP 白名单在导航里被拿掉 | 顾客控制台不做这套运营后台 |

现网还没有、仍只在本仓 localStorage 里的：项目、版本回滚、子集化工作台、用量四维、团队、认领工单、审计。顾客控制台按三套工作台拆开，见 [CONSOLE.md](CONSOLE.md)：用字、我的页、运营（运营不在本仓）。这两套白名单不是一件事：REST 免密钥白名单只认完整 hostname、要带 `Origin`、不支持通配；项目 CDN 白名单仍可以写 `*.example.com`。

密钥：`Authorization: Bearer`、`X-API-Key`，或 query `apiKey`（不要写进公开页面）。

下面的 `/v1/` 表是尚未落地的顾客控制台契约，不是现网路径。

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
- **对外动态嵌入（硬约束）**：`{cn|hk|en}.windfonts.com/api/css?family=&weight=&version=`（Google 风格参数）。禁止用 `fonts-packages/` 顶替。OSS 上 `/api/css` 404 → 边缘回源 vault，不改前端口径。
- 公开预览真源：`cn.windfonts.com/fonts-packages/{Normalized}/{Weight}/full/result.css`（与 `app.windfonts.com/api/css` 同源；本地 CORS 可 fetch）。嵌入示例仍写 API。旧路径 `/wenfeng/fonts/{slug}/{weight}/web/` 仅兜底。`ensureFontCss` 统一改写为目录 `wenfeng-*`、去掉 `local()`。全库 202 款 packages 路径已探通。详见 [LAUNCH-GATES.md](LAUNCH-GATES.md)。
- 项目：`https://cn.windfonts.com/p/{slug}/index.css`，按项目设置生成、校验 Referer/Origin、白名单外 403 并计入拦截统计。对外 CDN 域名一律地区节点。
- 用量口径：请求数、字节数按域名 / 字体 / 字重 / 状态码聚合，延迟 ≤ 5 分钟；性能指标来自 CSS 内置 Resource Timing 上报。

## 4. 已知待办与开放问题

### 4.1 CDN 拆包与目录字重不一致（vault 侧，前端改不了源文件）

预览已切到 `fonts-packages/{Normalized}/{Weight}/full/result.css`（202 款路径均通）。下列款 **目录字重名与包内实际字形不符**，需在 vault / 拆包流水线重挂或重拆；上线前应抽查：

| 目录显示 | normalized | 目录字重 | 包内 name table（实测） |
|---|---|---|---|
| 思源黑体 | SourceHanSansSCRegular | Regular | Source Han Sans CN **ExtraLight** |
| 思源黑體 TW | SourceHanSansTWRegular | Regular | Source Han Sans TW **Bold** |
| 思源黑体 常规体 | Syhtcjk | 多字重（含 Regular） | 首字重 DemiLight 等与标签易错位 |
| 寒蝉宽黑体 | Hckht | Normal | Chill K Sans **Medium**（可接受，但名表写 Bold/Medium） |

另有若干拉丁款 name table 空/弱（AAR、Aleo、Railway 等），不影响加载，展示名依赖目录。旧路径 `/wenfeng/fonts/` 已停更，勿再作真源。

### 4.2 其它

- 厂商中文名标 `provisional: true` 的待确认名单（2026-09-20 品牌核验后剩）：阿森德、瀞字型、字体传奇、山石字库、字体树、频凡字库、上海睿翾创意设计、中日韩字体计划、SCF 字库、波比工作室、ymnk 设计、问藏书房。已由版权字段定案脱敏：沐瑶字库→FlexiFont、女书字库→綿飴、辰宇字型→置空（设计师个人）、日本系统开发→Aoyagi Kouzan、杭州火石→置空（无据）、智勇造字→贾智勇、鼎猎咨询→Miao Keming。
- 目录里 18 款未署名字体中仍有 12 款无法归属（点点像素宋体系列等），待补元数据。
- 登录、认领、上传为前端演示流程，需接真实认证与对象存储。
- 破坏性操作已用 `WFChrome.confirm` 二次确认（移除字体 / 域名 / 成员、回滚、删项目、清空选字袋、轮换密钥、恢复示例数据）。
- 定价页结构已改为三条产品线（云 / 开源自托管 / 私有化）；云套餐数字与超量单价仍为占位（专业版 200 GB / ¥0.8 per GB），等商务定稿。私有字托管≠厂牌授权转售。
- `features.html` 是否长期保留待定；`design-options.html` 与全部 `*-options` / `v5-*` / 审计页按 [LAB.md](LAB.md) **留档勿删**。
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
- **首页下半（丙 + 丁图）**：字林之后是当前款一条（`#homeNow`）+ 同分类四款（`#homeRelated`，与详情页相关字体同量）+「全部 N 款 → fonts.html」。全库与筛选只在 `fonts.html`。底部 `#statsBand` 只留三张条形图（按授权 / 厂商 TOP6 / 字符规模），标题「库内结构」带线标；厂商行显示头像（无图走字标）；hero `#homeStats` 收成一行「N 款 · N 家 · N 免费商用」（许可核对只在底栏）。口径同前：68＝有归属字体的厂商分组数，授权 181+19+1+1=202，规模图只统计已录 charCount 的 128 款（未录入不进条，只写在注里）。
- **统计口径（2026-09-21 续）**：千字文覆盖按**唯一字**计（简 994 个不同字 / 繁 1000）；不再按字符串位置计（否则 6 处简化重字会把分母撑到 1000 并制造「993/1000 像满条」的错觉）。**台湾系字体**（一点字坊 / 清松 / 教育部 / 辰宇 / 华康 / 王漢宗 / 俐方体 / CMEX / PMingLiU / 名称含 TW 等）跳过简体千字文收录盘点，只展示样例字符。
- 坑：字符表切换器不能用全局 `seg` 类名——`.panel .seg .is-on` 会把选中态盖成白底，与白字叠加即隐身；只用自有 `seg-glyph`。
- 触及文件：`js/wf-specimen.js`（字符表 v2）、`js/pages/detail.js`（接线）、`js/pages/home.js`（renderStats）、`index.html`（statsBand 容器）、`css/specimen.css` / `css/site.css`（追加）。工作区改动未提交（共享检出纪律）。

## 8. 2026-09-22 交接（会话停在建议，未让改现站）

最近提交 `5b1aacd`。工作区大量未提交，不要擅自 commit。本地预览沿用已有的 `http://127.0.0.1:16016/`，不要再起一个服务器。

### 人刚定的方向

改进落在现有页，版式不换。建议已口头给出，**还没批准动手**：

- 作者、能不能改、头像没稳之前，不加新栏目。看不出是不是二创的写成「未核对」，不要补谱系。
- 详情标题下改成三句：谁做的、能不能用和改、`font-family` 写 `wenfeng-` 什么。授权「可以 / 不可以」收进这一句，「出处与依据」继续折着。
- 详情「谱系」**保持叫「谱系」**（勿改成「从哪来」——该口径已否）。只在开源或真有上游时出现。上传按钮只给开源。不许改的，这一块不出现。
- 「获取代码」设计视图和开发视图都在。顶栏设计 / 开发仍可分开字符表、字形数。换 `wenfeng-` 前缀只在登录后的控制台。
- 首页留活样张和「换一款」。拿掉 `home-stats` 和底部「现在的库」三块统计。合作伙伴若是真合作，留在页尾。
- 厂商索引分段：**字库 / 品牌方 / 作者 / 开源作者 / 开源项目 / 素材平台**（不得混成一节）；开源项目不因只受托拆到「仅受托」；「仅受托」「未核对」置底。筛选是底栏式 tab。底部「入驻与认领」用通用文案。单页认领句：`这是你的品牌？认领此页。通过后可改标志与介绍。` 权限按 kind 的细则只写在 [CLAIM-SCOPES.md](CLAIM-SCOPES.md)，不进公开页。「开源派生」「思源派生」和列表「派生至」只在开发视图；设计视图不显示。同系仍显示。勿写「改自」。主头像仍是这一家。
- **认领权限**：按 kind 矩阵见 [CLAIM-SCOPES.md](CLAIM-SCOPES.md)（内部）；公开 UI 不展开。
- **地区命名**：凡台湾相关对外命名一律写「台湾省」（如 `台湾省教育部`）；英文用 `Taiwan Province`。禁止「中华民国」等写法进字典主名或别名。

先不要做：字符表前置、暖纸（集群记忆 #8460）、整页重排。

### 已在现站、下次别推倒

- 设计定稿是 B″「柔和 · 圆润」、纯白底，方便以后做深色。不要红。旧首页收成 `features.html`。
- 对外 CDN 一律 `cn.windfonts.com`。公开嵌入 `js/wf-embed.js` 的 `familyName()` 锁定 `wenfeng-`；`opts.alias` 只给付费 / 授权改名。
- 定价页默认隐藏，`WFChrome.showPricing`：开发模式或显式允许才见。
- 顶栏「设计 / 开发」记在 `wf-view`。样张工坊只在设计视图。选字袋不分模式，元素都显示。
- 详情：预览字可直接改；「获取代码」一直在，点击切到开发视图。字符表田字格跟当前字重走。窄幅默认，横幅模板宽度不要擅自改成窄版。
- `data/font-lineage.json`：`ownerId` 是这一款的权利人，`makerId` 是受托制作，`upstreamOwnerId` 才是上游机构。fork 的 owner 不得等于上游机构。没有把握的关系不写。萌神汉宋归萌神PROJECT，不是 Adobe，也不是梦源宋体。源界明朝是 Adobe 自己的地区版，不是社区 fork。
- 厂商页开发视图有「开源派生」「思源派生」和列表「派生至」（author / project / platform）。设计视图不显示这两行和「派生至」。同系脚注仍显示。上游机构条「同系派生」与本页「归属」分清口径。

### 还没进现站

甲套文案只在 `detail-lineage-options.html` 和被否的 `v5.js` 里。现站标题用「谱系」，不要改成「从哪来」。上传按钮已按开源收起。谱系导语：源头「此为开源字体谱系源头。许可允许修改后以其他名称再分发，须保留许可声明。」；派生「此字体由「{上游}」派生。遵循原许可协议开源发布。」；其他可派生「此字体许可允许派生。修改后再分发须改名，并保留原授权声明。」不许改不出谱系块。落霞外源根已进目录占位（`IPAex Gothic` / `IPA 黑体` / `こころ明朝` / `03スマートフォントUI`，及已有 `IPAexMincho`）：可点详情看派生；字形包未入库时 `charCount=0`、`version=lineage-stub`。仍完全库外的名才走「库外源头」幽灵行。地区版说「同一款的简体 / 繁体」。

`v5.html` `v5-fonts.html` `v5-detail.html` `v5-foundry.html` `css/v5.css` `js/pages/v5.js` 是误做成的整站对照，人已否。不要合并进现站。人没说删，先留着。`*-options.html` 是对照工位，不是正式页。

### 头像

`data/avatars.json` 现为 26 条白名单。已知 id 若不在清单里，`WFChrome.brandAvatar` 返回空，页面用字标。不要用 `fonts.json` 里的 `brand.avatarUrl` 把错图找回来。

不要无人值守跑 `scripts/fetch-avatars.mjs`。已有 webp 会跳过，但新猎到的图会追加进清单；错图一旦写上，前台就会显示。已确认不能用的：包图（百度标）、寒蝉（像素人）、萌神（个人涂鸦）、胡晓波（胡萝卜）、庞门（夹子）、优设（鸟）、快看（绿块）、IPA（错机构）。`gnu.webp` / `qiantu.webp` 曾被脚本覆盖，已从 git 找回。第 6 节的 37 / 45 家计数作废。

## 9. 2026-09-23 会话交接（`8a50af81` → 续）

会话：[Task summary and brand fonts](8a50af81-7546-4fb7-9e15-4f61eace074f)（9/19 起稿 → 9/23 谱系 / OSS / 品牌核实）。工作区改动**未要求 commit**，不要擅自提交。

### 9.1 已落地（前端 + 数据）

| 块 | 结论 |
|---|---|
| 公开站 UI | 人认定「基本上前端到达了要求」；对照线上补了统计侧栏、控制台可见性、厂商 hero/CTA、许可/FAQ 分页等 |
| 工程卫生 | 已有提交批次（见顶部停点）；上线硬门槛仍看 [LAUNCH-GATES.md](LAUNCH-GATES.md) |
| CDN 嵌入口径 | **未改**：动态仍 `{cdn}/api/css?family=&weight=&version=`；短码拼音缩写；见 `.cursor/rules/cdn-embed-contract.mdc` |
| OSS 首批 | **101 done / 0 fail**；目录约 **336→341**；进度 [\_oss-ingest-batch1-progress.md](_oss-ingest-batch1-progress.md) |
| 思源正主 | `syhtsc` / `systsc` 七字重齐；分叉不动；Google 用 `collaboratorIds`，不另造「Google+Adobe」厂商 |
| 联合作者 | 详情 / 厂商页显示对方头像与链接；尺寸已收小 |
| 猫啃 | 8 款均为 OFL fork；名纠正（糖圆体 / 故障宋·黑 / 网字 / 去 `-L`）；谱系对齐思源 / 狮尾 / RocknRoll / 粉圆 |
| 落霞谱系 | `locale` vs `fork` 分清；开发视图顶栏 **开源派生** / **思源派生**；设计视图不显示；勿写「二创至」「改自」 |
| 谱系文案 | 源头 / 派生 / 其他可派生三句见 §8；对象是看详情的人，不是当面叮嘱改字 |
| 认领 | 公开 UI 不展开权限矩阵；细则 [CLAIM-SCOPES.md](CLAIM-SCOPES.md) |
| 地区名 | 台湾相关一律「台湾省」 |

### 9.2 谱系标准化（勿再争论）

- 数据只有 `fork` / `locale`（外加 original / commissioned / collab）；口语「二创」= 派生，**不是**第三种类型。
- 顶栏两行都是派生，按上游族系：**开源派生**（IPA / Fontworks / Zen Maru / Unifont…）与 **思源派生**（Adobe Source Han）。只在开发视图显示。
- 外源 fork → 厂商「源字」；同主再 fork →「派生」；地区/规格 → `locale`。
- 写进 [LICENSE.md](LICENSE.md) §8；寒蝉 / 猫啃同一套。

### 9.3 品牌核实进度（类似猫啃）

| 厂商 | 状态 | 要点 |
|---|---|---|
| **猫啃** | 完成 | 全 fork；见上 |
| **字魂** | 完成 | 扁桃体 ← 得意黑（已有） |
| **站酷** | 本轮核实 | 快乐体 / 高端黑 / 文艺体 = **站酷活动原创 OFL**（非思源派生）；谱系 `commissioned`→`original`；酷黑归胡晓波；小薇 LOGO 体归佐兹 |
| **荆南** | 本轮核实 | 缘默体 = **原创 OFL**；波波黑版权 Etrump（`brand=etrump`，名带荆南勿改挂 jingnan） |
| **寒蝉** | 本轮大部分 | README 定案：端黑宋/圆黑/锦书宋/云墨黑←思源；圆体 M←Zen Maru；点阵←Unifont（16px 主链）；龙藏楷←龙藏体；DIN←端黑体（同主）；宽黑←**未来荧黑**；矩阵/月等宽/团圆 Sans/有机体/无机体=original。未写：楷体 / 拙楷 / 活仿宋 |
| **IBM** | 本轮 | `openSource=true`；IBM Plex Sans SC = OFL（Sandoll 制作、IBM 发布） |
| 千图 / 包图 / 优设 / 创客贴等 | **未开** | 多为素材站「免费商用」原创声明，不是 OFL fork；勿按猫啃套路硬标上游 |

### 9.4 已知缺口（下次接着）

1. ~~`hcth` 命名~~ **已核原包**：FontFamilyName =「寒蝉有机体」/「寒蝉无机体」（PS: ChillOrganic / ChillInorganic）；产品名「寒蝉谭黑」、RFN `Tanhei`。目录名保持有机/无机，**不要**改成谭黑。
2. ~~`welai` slug~~ **已对齐**：vault 字体 `brandId` → `welai`；重复行 `project-welai` 已 `offline`/`project-welai-dup`；本地 `fonts.json` + oss-map uuid 已改。
3. 寒蝉楷体 / 拙楷（Yuji+思源参考）/ 活仿宋：宁缺勿错，谱系暂空。
4. 全库 `/api/css` 扫、子集缺口、TTC/VF 另排——见 [FONT-AUDIT-BACKLOG.md](FONT-AUDIT-BACKLOG.md)。
5. 集群记忆：决策 #8593 以本节与 LICENSE §8 为准。

### 9.5 接手指令

- 先读本节 + LICENSE §8 + FONT-AUDIT-BACKLOG；不要重开大批量 OSS 收录。
- 继续核实品牌时：先看版权行与作者 README，再写 `font-lineage.json`；没把握不写。
- 千图 / 包图 / 优设 / 创客贴 / 摄图的误挂已在 §12.3 核过：没有 fork 行。不要再按猫啃套路补思源上游。许可字段互相矛盾的，没有原包就不要改。

### 9.6 设计样张与剩余工作区（2026-09-23 晚）

- **活样张**：`http://127.0.0.1:16016/styleguide.html`（规则真源 [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)）。本轮已在浏览器打开核对。
- **目录/谱系提交**：`cd1c5f4`（HANDOFF §9、FONT-AUDIT-BACKLOG、lineage、foundries、fonts、wf-proto）。
- **其余工作区**按主题分批提交（文档口径 / 产品数据 / 站点功能 / 对照实验室）；排除 `*.bak` 与一次性探针 JSON（`_oss-aqua-probe*`、`_audit-*` 若仍未提交则继续留本地或进 lab 再议）。

## 10. 2026-09-23 晚 OSS 第二批（`e8e864d5`）

会话 [Zcode session continuation](e8e864d5-c0ce-49cc-be4a-7fcf7bff988d) 停在「四路搜源还在写清单」。续跑 [7634005f](7634005f-4458-4d40-9d8f-204c6f5224eb) 把三款拆包传到了 `cn.windfonts.com`，vault 没登记就停了。本轮补登记并改目录。

### 10.1 子代理

八路都没写出 `docs/_oss-ingest-batch2-*.json`：

| 会话 | 子代理 | 结果 |
|---|---|---|
| `e8e864d5` | `aa2f65e0` ButTaiwan / 昭源、`d3878301` 遍黑 / 汇文 / 朱雀 | 本机没有 transcript |
| `e8e864d5` | `9564763d` justfont / Aqua、`cc754fa7` 寒蝉复核 | transcript 停在中途，没有 JSON |
| `7634005f` | `40241316` `9319854f` `ae48e40f` `b27736aa` | 同样停在中途，没有 JSON |

### 10.2 已上目录（2026-09-23 晚）

拆包在 CDN，vault 本轮才写入。备份 `feicode-prod:/www/wwwroot/fonts-vault/data/prod.db.bak-20260923-preBatch2`。`/api/css?family=…&weight=regular&version=full` 三款都是 200。`data/fonts.json` 341→344。未 git commit。

| family | norm | 名称 | 字符 | 说明 |
|---|---|---|---|---|
| `wenfeng-hcpixels` | Hcpixels | 寒蝉像素体 | 最多 554 | 无汉字。Regular 与 Mono 是同一文件 |
| `wenfeng-hcline` | Hcline | 寒蝉线体 | 414 | 仓库说明是等距等线英文，无汉字。Regular 文件实为 Normal，ExtraBold 实为 UltraBold，SemiBold 实为 DemiBold |
| `wenfeng-sykd` | Sykd | 思源等宽 | cmap 44798，其中 CJK 20976 | 仓内分面 OTF，不是 TTC。简体 |

像素体、线体的语言已改成英语 / 拉丁字母，不再标简体正文。

### 10.3 复核过、本轮没拆的

| 项 | 结论 |
|---|---|
| 寒蝉矩黑 ChillMatrixBlack | 仍只有 Demo，不进。仓库介绍写了 GB2312，发行物对不上 |
| 络黑 | 仍是 VF woff2 |
| 狮尾 bat-leg | 空。bat-sans 已在目录 `wenfeng-swbatsans` |
| 霞鹜文楷 | 已在目录，不要再收一版 |
| 芫荽、源泉圆、源样明、源样黑、昭源宋/黑/圆、朱雀仿宋 | 见 §10.5，已上目录 |
| 更纱黑体 | 已登记简体 `wenfeng-gsht`。用的是官方 `SarasaGothicSC-TTF-1.0.41.7z`（约 60MB），不是全集 TTC |
| 遍黑体 | 真仓是 `Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project`。完整字是 TTC，这轮不进 |

进度：[\_oss-ingest-batch2-progress.md](_oss-ingest-batch2-progress.md)。侦察留档：[\_oss-ingest-batch2-scout.json](_oss-ingest-batch2-scout.json)。

### 10.4 接手

- 三款已在 `app.windfonts.com`。不要再跑一遍上传。
- `fonts-packages` 工作区有约 170 个已跟踪字体文件显示删除，本轮没动。不要把这些删除提交进去。
- 下一款若收芫荽，先定品牌行再走 `oss-batch1-download.py` / `oss-batch1-build.sh` / `register-oss-batch2.js`。
- §9.5「不要重开大批量 OSS」管的是谱系核实那条线。这条线是人点名要收能进静态面的开源字；没核对到静态 TTF/OTF 的不要塞进去。

### 10.5 同一晚续收的八款

人说接着做。八款已上传并登记，`/api/css?weight=regular` 都是 200。`data/fonts.json` 344→352。新品牌：但 `buttaiwan`、昭源 `chiron`、璇玑造字 `triones`、遍黑体计划 `plangothic`（遍黑本身没登记字体）。备份在品牌写入前：`prod.db.bak-20260923-preBatch2b`（SQLite 还有 WAL，回滚时要连同当时的 `-wal` 看）。

| family | 名称 | 取了什么 |
|---|---|---|
| `wenfeng-ysui` | 芫荽 | `iansui.zip` 单字重。繁体，汉字约 1.0 万 |
| `wenfeng-yqyt` | 源泉圆体 | `GenSenRounded2TW-otf` 的 R/M/B/L。不是 TTC |
| `wenfeng-yymt` | 源样明体 | `GenYoMin2TW-otf` 的 R/M/B/L |
| `wenfeng-yyht` | 源样黑体 | `GenYoGothic2TW-otf` 的 R/M/B/L |
| `wenfeng-zyst` | 昭源宋体 | 香港静态 OTF，Light/Regular/Medium/Bold，无斜体 |
| `wenfeng-zyht` | 昭源黑体 | 同上 |
| `wenfeng-zyyt` | 昭源圆体 | 繁体静态 OTF，四字重 |
| `wenfeng-zqfs` | 朱雀仿宋 | v0.212 单字重。name 表是「朱雀仿宋（预览测试版）」 |

自动拆字重时，`Rounded` 会被当成 Regular，源泉圆体第一次把 Bold 文件当成了 Regular。已按文件名后缀 `-R/-M/-B/-L` 重拆后再上传。

没进的：遍黑体静态 zip 里完整字是 `Plangothic.ttc`，P1/P2 是分平面。更纱现行 Release 仍是 TTC 或约 850MB 的 TTF 包。未 git commit。

## 11. 2026-09-23 夜第三批（能进的 + CC0）

四路清单里 `status=ready` 的，加上 CC0 专路，共 45 款已上传并登记。`/api/css?weight=regular` 抽查为 200。`data/fonts.json` 352→397。新品牌：汇文、中文网字计划、澳声通、汉典、激笔。

包括：源流明体、源云明体、邪宋、源起明体、源起黑体、月星楷、尚古明体、初夏明朝体、合简宋体、澳声通拼音文楷、就是不错字（吧）、谐灵附体、简语生活体、汇文明朝、汉典秦系文字体、激笔 SFX，以及 M+ 各切版、Zen 系列、Kosugi、Shippori、Kiwi Maru、Hachi Maru Pop、Yusei Magic。Zen Loop / Zen Dots / Zen Tokyo Zoo / M+ Code Latin / 激笔 SFX 没有汉字，也登记了。CC0 专路没有再找到第二套宋/楷/黑/仿宋。汉典金文仓里没有许可文件，cwTeX Q 不是 CC0。

昭源缺的 ExtraLight / SemiBold / Heavy 和斜体还没补进已有行。未 git commit。

## 12. 2026-09-24 会话 `01500391`（续 `8a50af81`）

Cursor 会话 [01500391-9c7f-49af-bf92-046928b48838](01500391-9c7f-49af-bf92-046928b48838)。先交接 `8a50af81`，再核类似猫啃的厂商，随后改名、对齐 slug、标 IBM，并提交。最后一条没做完：按现行站点改 v4 设计指南，并放进关于目录。

### 12.1 该会话已经交出去的

| Commit | 内容 |
|---|---|
| `cd1c5f4` | 交接 §9、谱系核实、welai、IBM、寒蝉原包名 |
| `660a935` | 认领矩阵 / 谱系口径 / OSS 留档 |
| `a771c1b` | 产品规格、短码别名、实验室索引 |
| `3aaef3d` | 厂商谱系、许可/FAQ、产品规格接线 |
| `1913e00` | 对照页与审计页留档 |
| `7e9f41f` | handoff §9.6 |

其后另有 `1d6debd`（目录 401）和 `84f92cf`（把「设计指南」写进 `js/wf-docs-nav.js`）。`84f92cf` 只加了菜单项，`styleguide.html` 仍是独立样张，正文还写着不进说明目录。

### 12.2 本轮补上的

- `styleguide.html`：说明壳与关于页相同（左栏 + 右侧相关），样张留在下面全宽，避免 96px 字标被窄栏折行。
- 正文按 `css/tokens.css` 改：定稿是 B，不是被否决的 B″。补 `--paper` / `--fill` / `--face`。黑只给主按钮、选中态、字标头像；带图头像底是白。界面字体普惠体，缺字回退寒蝉全圆体；字标寒蝉宽黑。
- 「全部」计数改走 `WFProducts.collapseForList`。现目录 401 行收成 343，与字体库一致。
- `docs/DESIGN-SYSTEM.md` §5 改成：设计指南用说明壳，样张标题仍用 `.sg-*`。
- 浏览器核对：`http://127.0.0.1:16016/styleguide.html` 桌面全页；关于页手机宽度的「相关」里有设计指南；`?theme=dark` 见 §12.5。

### 12.3 素材平台误挂（只核，不改许可）

`font-lineage.json` 里这些名字没有 `relation=fork`，没有挂思源：千图 6 款、包图小白体、优设标题黑、创客贴金刚体、摄图摩登小方体。

没有改许可字段。这几条的 `license` 与 `licenseNotes` 彼此矛盾（写着免费商用，备注又写须购买）。站酷文艺体谱系已是 `original`，`licenseName` 仍是「商用须授权」；Google Fonts 没有 `ZCOOL WenYi` 这一页（404）。没有原包许可文件，不把文艺体改成 OFL。

寒蝉楷体、寒蝉拙楷、寒蝉活仿宋仍然没有谱系行。寒蝉手拙体是 `original`，与拙楷不是同一款。

### 12.4 没动

- 全库 `/api/css` 扫描、子集缺口、TTC/VF：仍在 [FONT-AUDIT-BACKLOG.md](FONT-AUDIT-BACKLOG.md)。
- 未跟踪的 `*.bak`、`docs/_audit-*`、`docs/_oss-aqua-probe*`：继续留在本地。
- 工作区里另有未提交的 `js/wf-chrome.js`、`font-detail.html`（谱系沿 `upstreamName` 走到 `original`，中间显示「经」）。不是 `01500391` 写完的，本轮没有改这两份，也没有提交。

### 12.5 验证

- 设计指南桌面全页已看：左栏当前项是设计指南，右侧相关有关于 / 认领 / 常见问题；色板、字阶、按钮、三行样张、页脚链接都在。`#sgCountAll` 为 343。
- 关于页手机宽度：「相关」第一条是设计指南。
- 深色：页面认 `?theme=dark` 和 `localStorage.wf-theme`，不认系统 `prefers-color-scheme`。`styleguide.html?theme=dark` 手机宽度已看：页底和面板转暗，墨黑色块转亮，字标仍是一行。

## 13. 2026-09-24 OSS 许可原文

桶 `wenfeng-fonts` 列了 271312 个对象，并读了旧路径 `wenfeng/fonts/` 下 184 个字体 zip 的目录。字体许可原文只有两份。已抄入 FeiCode `Windfonts/font-licenses` `main` `972b5ab`。说明写在该仓 README「2026-09-24 OSS 核对」。

| 字体 | 对象 | 本仓 |
|---|---|---|
| 鼎猎珠海体 `Dlzht` | `wenfeng/fonts/dlzht/license.pdf` | `licenses/Dlzht/LICENSE` 摘录，`license.pdf` 原件 |
| OPPO Sans `Opsa` | `wenfeng/fonts/opsa/license.0 License Notice` | `licenses/Opsa/LICENSE` |

raw 已核对 200：`https://feicode.com/Windfonts/font-licenses/raw/branch/main/licenses/Opsa/LICENSE`、`.../Dlzht/LICENSE`、`.../Dlzht/license.pdf`。目录 `licenseFileUrl` 用的 `src/branch` 打开的是网页，不是文件正文。

鼎猎珠海体授权说明日期 2024-09-03，登记号陕作登字-2024-F-00013790。允许设计、广告、包装里把字当画面用。电子文件嵌入网站、程序或带显示的电子产品不在授权范围内。原文没写能否改字、能否再发字体文件。`license-info.json`：`webUse` false，`embedding` false，`modification` 与 `distribution` 为 null，`verified` false。目录 `fonts.json` 里这款的 `licenseNotes` 仍是旧句「不可修改字体文件，不可再分发」。当时 `fonts.json` 有别人的未提交改动，没有改这句。

OPPO Sans 是厂商自己的协议，不是 OFL。允许不修改地嵌入，并随非字体软件再分发；必须标明使用了 OPPO Sans；禁止单独再分发或出售字体文件。`attribution` true，`modification` false，`verified` false。

不要入库：

- `wenfeng/fonts/cszt/` 名叫 license 的文件是入户申请、Vue 笔记、Mantine README。
- `wenfeng/fonts/test/license.pdf` 是心理健康报告，`license.docx` 是教学资源申请表。
- 184 个 zip 里只有 woff2、css、`reporter.json`。
- `fonts-packages/` 网页包旁边没有 LICENSE / OFL.txt。

128 个许可目录里有 `LICENSE` 的是 10 个（本轮 2 个 + `6a1b7f2` 的 8 份 OFL）。另外 118 个仍只有 `license-info.json`。没有原文不要补许可正文。控制台上传仍只存证明文件名，没有按旧后台把文件写进 OSS。

## 14. 2026-09-24 厂商页派生与认领间距

已推送（本提交）。缓存：`foundry.js?v=20260925b`、`site.css?v=20260925f`、`specimen.css?v=20260925a`。

- 「开源派生」「思源派生」只在开发视图。行里不再放上游头像和厂商名，只留系列名和字体名。
- 列表「派生至」同样只在开发视图。只有这一句时，整行脚注在设计视图不占高度。「同系」仍显示。
- 「同系派生」那句是：站内另有 N 款从本页开源谱系衍生，版权归创作者。设计视图仍显示。
- 设计视图里，认领句「这是你的品牌？认领此页。通过后可改标志与介绍。」上面没有分隔线。开发视图保留一条，线贴着最后一行（如「授权」），句下留 `1.25rem`。不要再把线画在大段空白中间。
- 核对过落霞孤鹜（设计 / 开发）：设计视图无「开源派生 / 思源派生 / 派生至」，认领句上边框 0；开发视图可见。

## 15. 2026-09-24 外链弹窗、上游入库、文楷规格

已推送：

- `fonts-front` `8719383`：佑字肃、梅黑体、梅明朝、YozFont、M+ gothic 12r、文泉驿点阵宋体。衡山毛笔从误写的「香山」改回。
- `fonts-front` `ab51c69`：霞鹜文楷去掉重复规格。
- `fonts-front` `9b0ef94`：外链弹窗（含左右留白 40px）。
- `fonts-packages` `60b792b`：登记映射和位图转静态。`535ba48`：下架那 16 款的脚本。

目录现为 350 条。列表仍是 308 款，因为拿掉的规格本来叠在同一张卡里。

霞鹜文楷只留五款：完整、GB、TC、Bright、Bright Code。Lite、Screen、Fusion、KR 和各等宽组合已从目录拿掉，字体库状态是 offline，公开接口 404。标准「霞鹜文楷等宽」不在这批里，没有动。不要把这 16 款加回去。Lato 仍下架。

外链弹窗抄墨图爱可的离开确认。

- 普通左键点到站外 http(s) 时弹出「即将离开文风」。写明域名和完整网址。按钮是「留在本站」「继续前往」。可勾「本会话内跳过该域名提示」，记在 `sessionStorage` 键 `wf-exit-skip:`。
- 不拦：站内链接、修饰键点击、带 `download` 的链接、图片 / zip / pdf，以及文风、文派、薇晓朵、菲比斯、飞码、墨图这些自家域名（含子域）。
- 实现：`js/wf-chrome.js` 的 `bindExternalExit`，样式 `.dialog-exit`。缓存 `wf-chrome.js?v=20260924v`、`components.css?v=20260924w`。
- 左右留白：遮罩左右 `2.5rem`，白框内边距上下 `2rem`、左右 `2.5rem`。手机宽 390 时白框左右各空 40px。桌面框宽 512px，居中。
- 核对过详情页备案链接：弹出、留下后停在原页、记住域名后第二次不再问。站内「字体库」不弹。手机宽度按钮在框内。

## 16. 2026-09-24 详情页授权名改成「字体授权协议」

已推送（本提交）。`data/fonts.json` 里原先写成档位口令的 `licenseName`（如「免费商用」「免费商用，不可修改」「免费商用授权」「作者声明…」）改为 `{字体名}授权协议`，对齐阿里巴巴普惠体。档位芯片 `license` / `licenseTier` 仍是「免费商用」等，没动。OFL / Apache / GPL / 0BSD / CC0 等标准名保留。顺手把误标成「免费商用」的思源 CN/TW/斜体/屏显臻宋、小赖、Unifont 改回 OFL 或 GPL。备份留在工作区，未入库。

## 17. 2026-09-24 补字、下架、演示脱花乐

已随本提交推送。`data/fonts.json` 413 条。

人定的入库规则：

- 去重只看目录里已有的显示名。字符数一样、中文名不同，仍是另一款（莫大毛笔和爆呆）。镜像文件名和名字表不一致时，按名字表，不另开假名字（鼠标仿手写的名字表是快去写作业）。
- 免费商用也进。许可按文件或发布方原文写，不把方正、小米改写成 OFL。
- 没有中文的下架。台湾缺字（`wenfeng-twqz`，英文名 Taiwan no CJK）已从目录和谱系拿掉，字库 `status=offline`，公开接口 404。未知 slug 不再落到列表第一款；`js/pages/detail.js` 显示「未找到该字体」。缓存 `detail.js?v=20260925i`。
- 台湾相关写台湾省，不写「国家发展委员会」。全字库正宋体、正楷体的署名是台湾省。

已在库、没有再加一款：小米兰亭 Sans 就是 MiSans（`wenfeng-misa`）。多加的 `wenfeng-misn` 已下架。Fontworks 七款（Klee One、RocknRoll、Stick、DotGothic16、Train One、Reggae One、Rampart One）样式文件都是 200。误插的 `wenfeng-dg16`、`wenfeng-trn1`、`wenfeng-rgg1`、`wenfeng-rmp1` 已 offline。

演示六款（佛系、悠然、悠然二、春风、夏行、秋鸿）制作方改回人生哥。说明里不再写花乐改了全半角。斜黑体仍是思源黑体的改作，制作方也是人生哥。字库品牌本来就是 keynote。

这轮新进、已在本提交目录里的还包括：文津宋体和 P2、文渊宋/黑/圆、free-font 里许可能对上的各款、方正书宋/仿宋/楷体/黑体、花园明朝 A/B、LINE Seed TW、莫大毛笔、香萃打字机、香萃潮汐宋、香萃零度黑。花乐其余款还在。花园缺汉字、台湾缺字不在。

还没进：煮豆黑体（文件坏、基本区汉字 0）、计划楷 A/B/G（汉字 97 / 0 / 254）、汉仪三款（字内没有免费商用条款）、全字库说文解字（没有授权）、缝合楷（作者写了字体站可以不收录）、SuperHan（作者停更，用文津代替）。

## 18. 2026-09-24 搜索宽度、CDN 域名、认领标志、卓健

已随本提交推送。

- 顶栏搜索框加到原先结果列表的宽度，两边都是 18rem。结果列表左右贴着搜索框。缓存 `components.css?v=20260925k`。
- 公开动态地址是 `cn.windfonts.com` / `hk.windfonts.com` / `en.windfonts.com` 的 `/api/css`，跟节点走。不要写成 `app.windfonts.com`。`/api/css` 以后做反代重写。现在 `cn.windfonts.com/api/css` 仍是对象存储 404，复制出去的链接仍然用 CDN 域名。`5be3788` 因这次 404 改到 app，已改回。预览仍优先 `fonts-packages/…/result.css`。
- 字体详情右侧不再显示「未认领 · 认领」。厂商页认领后，认证标志在名字右边、收藏星左边。简介改成一律用字体本身的说明，这次没做。
- `wenfeng-zjgljt` 显示名改为「卓健橄榄简体」。依据是字体文件名称表（Windows 简体 name ID 1），不是「拙见」或「卓见」。厂商字典显示名改为「卓健」，旧写法留在别名。

## 19. 2026-09-24 授权名规矩扫到新批

§16 的授权名规矩补扫了它定稿（`640a63c`）之后入库的批：方正四款、香萃三款、花园明朝 A/B、包图小白体、仓耳小丸子、精品点阵体、千图马克手写体共 13 款的 `licenseName` 从档位口令、整句说明或网址改成「{字体名}授权协议」；MiSans 去掉括号注记，只留《MiSans 字体知识产权许可协议》。IPA、CC、GPL、M+ 位图许可、OPPO Sans Free Use License、梅字体许可、台湾省开放政府数据授权条款这类协议本名保留。备份 `data/fonts.json.bak-license-name2-20260924130543` 未入库。

注意：字库 DB 的 `license_name` 没同步这次改动，下次从库导出目录前要先把库里这 14 行改掉，否则会冲回来。

## 20. 2026-09-24 淘宝买菜体入库

已推送（本提交）。`data/fonts.json` 现为 413 条（HEAD 412 + 本条；本会话开工时工作区是 413，`a83841c` 普惠体 3.0 那笔把基线变成 412，本条净增 1）。

新条目：`wenfeng-tbmct` / `Tbmct` / 淘宝买菜体 / TaoBaoMaiCaiTi，Regular 一档，简体 + 英语，charCount 7271。来源是用户指定的官方分发 `fonts.alibabadesign.com/TaoBaoMaiCaiTi/TaoBaoMaiCaiTi-Regular.zip`（CDN 有 Referer ACL，抓取须带 `Referer: https://fonts.alibabadesign.com/`）。管线照旧：`fonts-packages`（`SUBSET_ONLY=full`，`oss-batch1-build.sh maicai Tbmct`）→ OSS `fonts-packages/Tbmct/` → vault 登记 → 目录。

规矩怎么落的：

- 去重：目录与库都 0 命中后才进（nameID 里没有 Windows 简体中文，无法拿 name 表比对重名，按官方产品名入）。
- 名称：name 表 nameID 1 只有英文 `TBMCYXT`，没有 Windows 简体中文记录；表内中文只出现在 nameID 9/16/19（langID 3076）「淘宝买菜营销体」。显示名取官方 portal 产品名「淘宝买菜体」（fonts.alibabadesign.com / www.alibabafonts.com 前端元数据 fontName 常量），name 表中文名已写进 licenseNotes 和 font-licenses 备查，不算丢证据。
- 授权：发行包内无许可文件。官方声明原文「现这款字体向所有个人和组织开放，永久免费商用。」从 portal 前端元数据原样取出，摘录进 `font-licenses` `licenses/Tbmct/`（`a5b3e97`，main）。修改 / 再分发 / 嵌入 / 商标声明没写，字段留空不推断，`verified` false。`licenseName` = 「淘宝买菜体授权协议」（§11），档位 `license` = 免费商用。
- foundry/brand 复用 Alibaba Design 现有行（brand_id `fd8cac88…`，照 albbpht）。谱系：官方口径是淘宝买菜 × 通义锦书原创 AI 字体，无开源上游，`font-lineage.json` 未加行。
- DB 直写按红线：先 `wal_checkpoint(TRUNCATE)` 再 `cp prod.db.bak-20260924-preMaicai`（19.4MB，容器内）。只插本族一行，486→487 对拍，登记脚本 `register-maicai.js`（容器 `/app`，同 batch1/2 惯例）。
- §19 欠账一并还了：导出前把库里 `license`（即导出的 licenseName）与目录逐行对拍，同步了 **102 行**（§16/§17/§19 拍过的 {字体名}授权协议、台湾省条款、MiSans 协议等），另有 8 行档位（cexwz→联系授权、dymht/dyzgt/jsyjst/kksjt→免费商用、ibmps→开源免费商用、zkwyt→联系授权、qzkswjz→待核实）。现在库里与目录一致，下次全量导出不会再冲回。同步清单在容器 `/app/maicai-license-sync.json`。

验收：`http://127.0.0.1:16016/font-detail.html?slug=tbmct` 200（数据层 slug=tbmct，显示名「淘宝买菜体」）；`https://cn.windfonts.com/fonts-packages/Tbmct/Regular/full/result.css` 200；目录 licenseName/foundry 如上。只有 full 子集、无 zh-common，属正常（SUBSET_ONLY=full）。

导出方式说明：本轮没跑全量 `export-fonts.mjs`——匿名 API 限流（约 100 次/天，全量要 800+ 请求），且本机到 feicode-prod 的 443 当天断了几十分钟（SSH 22 正常，服务器侧无封禁记录，纯线路问题）。改为服务器本地取 list+detail 两条 API 响应，按 mapFont 同款口径组装 Tbmct 一条、文本级插入 `Systtc` 与 `Train` 之间；其余 412 条一字未动，4 条 lineage-stub（ipaexgothic/ipagothic/kokoro/smartui）原样保留。下次全量导出可无脑覆盖，结果应与现状一致。

另一个会话在同一天推进了 `a83841c`（普惠体 3.0），`fonts.json` 缩进随之变成 2 空格、顺序有 39 处局部乱序；本条插入按现状 2 空格缩进，没动别人内容。

## 21. 2026-09-24 出处链定稿、开源档与 RFN

出处与依据折叠最终形态（db46662/b12a2ec/1743fc7）：顶部状态行（来源·核对态·日期，由 licenseUrl/标准协议名/核对字段生成）→ 三节链（授权协议/国标声明/文风存档，固定句状态机）→ 档位徽章（固定三条）→ 固定脚注。licenseNotes 长文不再上页面（留目录档案）。

开源档独立：licenseName 命中标准协议名（OFL/GPL/Apache/CC/MIT/IPA/M+ 等）走「开源」，句子与徽章独立（可修改可再分发），不再冒用免费商用那套（×修改字体文件对 OFL 是错的）。RFN 三态字段 `rfn` 按版权行证据填：true=得意黑(「Smiley」「得意黑」)/IBM Plex(「Plex」)；false=波塔/钟齐流江毛草/霞鹜漫黑/龙藏体/站酷快乐体；寒蝉龙藏楷书是推断 OFL，留空。规则在 LICENSE.md §11。

真贵楷体一条化（478c4cd）：pangzhenguipmzd 补庞门正道署名+3.12.0+7826 字；同款 pmzdzgkt（库内名「旁正道-旁门正道标题体」）offline，备份 prod.db.bak-20260924-preZhangui。slyr/sly1 验证非重复（分块哈希全不同），保留。

## 22. 2026-09-24 原文摘录行与仓耳归位

出处链授权协议节点加 `licenseQuote` 原文摘录子行（只录逐字原文，规则进 LICENSE.md §11）。已填 7 款：普惠体（官方声明句）、淘宝买菜体（官方页声明句）、得意黑/IBM Plex（版权行，含 RFN 原句）、仓耳三款（声明第二章句）。状态行来源标签按 host 区分：github/gitee/gitlab →「开源仓库」，其余有链 →「厂商官网」。`purchaseUrl` 已接线（需授权档在协议行出联系链接，当前库内无数据）。

仓耳三款（小丸子/舒圆体/周珂正大榜书）按《仓耳字库免费开源字体授权声明》（2020-11-11，扫描 PDF）归位：小丸子从「联系授权」改「开源免费商用」，声明允许修改与再分发（徽章不再显示 ×修改字体文件），协议名用声明本名。原件与转录入 font-licenses `licenses/Cexwz/`（5b61d76），DB 三行同步（备份 preTsanger）。附件 22 款名单另含渔阳/与墨/非白各 W01-05，未在库。

## 23. 2026-09-24 厂商授权记录（trackRecord）

厂商级口碑机制上线，数据从零开始、不造案例。字段挂在 foundries.json 厂商行：`trackRecord: { incidents: [{ date, type, summary, sourceUrl }], lastChecked }`；type 受控词表：免费转收费／开源转闭源／许可收紧／更名重发／政策保持。纪律：只录可查证事件、每条带出处链接（公告/快照/报道），无出处不录；不做评分不做红黑榜。渲染：厂商页「授权记录」时间线（#record）；字体详情页授权折叠内一枚中性徽章「厂商有授权变更记录 →」链到厂商页，无记录零显示。外部出处链接带 nofollow。机制用临时夹具验证过渲染（已撤），当前库内无任何记录数据。

首三条授权记录（均为可查证正向）：方正字库（四款长期免费商用，foundertype.com）、仓耳字库（2020-11-11 免费开源声明 22 款，tsanger.cn/category/114）、阿里巴巴设计（普惠体永久免费商用，alibabafonts.com），lastChecked 2026-09-24。详情页徽章文案自适应：仅政策保持→「厂商授权记录」；有变更类事件→「厂商有授权变更记录」。负面事件（免费转收费/开源转闭源）须调研取证后录，装甲明朝盗用说、新蒂商业化（库内无字体）本轮均未录。

撤回：上一轮擅自录入的三条「政策保持」正向记录已删。trackRecord 的定位回归用户原意——**厂商毁约/变更类事件**（免费转收费、开源转闭源、许可收紧、更名重发），不拿自我表扬式的正向记录填充；无此类事件就零显示。机制保留，等有出处的负面事件取证后再录。
