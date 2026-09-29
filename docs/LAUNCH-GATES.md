# 上线前检测门闸 · 基础设施清单

> 静态原型（本仓）上线正式域前的硬门槛。未勾完不应切流量。  
> 对照现网：`app.windfonts.com`。本地预览：`python3 scripts/preview-local.py --port 16016`（fonts-front **main** + 干净 URL）。不要 `python3 -m http.server 16016` 指 lab。

**2026-09-29：** 访客静态 origin 是 OSS `wenfeng-web-hz`（不是 feicode 磁盘、不是广州 `wenfeng-web`）。边缘 rewrite：`/fonts/{slug}` → `/font-detail.html last`（无 `?slug=`，JS 读 pathname）；`/foundry/{slug}` → `/foundry.html last`。`WFChrome.href` 在 app 域走 `livePagePath`（`?v=20260929ui3` 起）。发版 SOP：`docs/ops/DOMAIN-DEPLOY-SOP.md`。

## 1. 必须先落地的基础设施（不能只靠前端假装）

| 项 | 现状 | 上线要求 | 验收 |
|---|---|---|---|
| **详情路径** | `/fonts/{slug}` rewrite → `font-detail.html last`（无 `?slug=`） | 保持 pathname 读 slug；HTML 根路径 `/js/` `/css/` | 打开 `/fonts/ibmps` 不请求 `/fonts/js/`；错误 slug 出 `.page-state` |
| **目录真相源** | 本地 `data/fonts.json` 等 | 公开站从 API 或构建流水线拉目录；禁止手改生产 JSON 不入库 | 构建产物含最新目录；字段与 HANDOFF §3 契约一致 |
| **统计** | 浏览 / 下载 / API 为 `localStorage` 叠加演示 | 服务端计数；详情「统计信息」读 API；样张导出打 download；CDN CSS 打 api | 多端数字一致；刷新不丢；无登录也可增浏览 |
| **CDN `@font-face`** | 公开动态链接用 `cn` / `hk` / `en` 的 `/api/css`（以后反代重写）。预览优先 `cn.windfonts.com/fonts-packages/…/result.css`；`ensureFontCss` 去 `local()`、统一 `wenfeng-*` family、补 weight | 流水线 CSS 默认无 local()；包内字重与目录一致（如思源 Regular 勿挂 ExtraLight） | `hckht` 等与现网预览同形；本机装同族时 Bold ≠ Regular |
| **鉴权** | `login.html` 演示角色；控制台 `?demo=1` | 真实登录；`WFChrome.canAccessApp` 接会话；关掉 demo 旁路 | 未登录无「控制台」；demo 仅 staging |
| **CORS / REST** | 文档写了 `/api/fonts` 等 | 实际网关、API Key、域名白名单、限流与文档一致 | 文档示例 curl 在生产域名可通 |

Rewrite 示例（Nginx）：

```nginx
# 现网 ansible 模板是 rewrite ^ /font-detail.html last（不带 ?slug=）
location ~ ^/fonts/([A-Za-z0-9_-]+)/?$ {
  rewrite ^ /font-detail.html last;
}
location ~ ^/foundry/([A-Za-z0-9_-]+)/?$ {
  rewrite ^ /foundry.html last;
}
error_page 404 /404.html;
```

### 生产链接省略 `.html`（前端 `WFChrome.href` / `livePagePath`）

线上 / 正式域生成的页面链接**不要带** `.html`。本机 / LAN / localhost / staging / `*.local` 仍保留 `.html`，方便 `python -m http.server`。

示例（厂商与字库详情均为路径形式；旧 `?slug=` 由前端 replaceState / Ops 301 收敛）：

| 生产 URL | 对应文件 |
|---|---|
| `/foundry/lxgw` | `foundry.html`（JS 读 pathname） |
| `/foundry` | `foundry.html`（索引） |
| `/fonts/ibmps` | `font-detail.html`（JS 读 pathname） |
| `/fonts` | `fonts.html`（列表） |
| `/license-query` | `license-query.html` |

Ops / Nginx 建议：

- `try_files $uri $uri.html $uri/ =404;`（或等价：无扩展名回退到 `.html`）
- **停止** 把 `/fonts` 301 到 `fonts.html`（与详情前缀 `/fonts/{slug}` 冲突；列表用 `try_files` 落到 `fonts.html`）
- 同理勿把裸 `/foundry` 硬 301 到 `foundry.html` 若会与 `/foundry/{slug}` 冲突；索引靠 `try_files`
- 可选：对仍带 `.html` 的旧链做 301 → 无扩展名（保留 query）
- 详情：`/fonts/{slug}` rewrite → `/font-detail.html last`；slug **只**从 pathname 读。HTML 必须 `/js/` `/css/`。
- 厂商：`/foundry/{slug}` → `/foundry.html last`（不要回 vault）。HTML 缓存 key 是浏览器路径 `/foundry/{slug}`。
- `WFChrome.href` 必须调用 `livePagePath`；写 `ROOT + path` 不算接线。

## 2. 上线前检测门闸（按顺序勾）

### A. 构建与缓存
- [ ] 产品页 `wf-proto` / `wf-chrome` / `wf-specimen` / 页面脚本 `?v=` 与改动同步（禁止半仓旧版本）。对 **OSS hz etag**，不要只对 feicode 磁盘。
- [ ] 不提交 `*.bak`、本地密钥、`.env`
- [ ] `v5-*.html`、`*-options.html`、`oss-audit.html`、`lab.html` 不进生产入口（对照 / 研究页；导航不链）。**保留勿删**，见 [LAB.md](LAB.md)。

### B. 公开主路径冒烟
- [ ] 首页：字林可换字；「浏览字体库」是 `/fonts`；大标题是该款面（不是系统黑体混排）
- [ ] 字体库：分类 / **风格** / **品牌** / 许可可筛；按热门排序
- [ ] 预览框自己打字 / 点「诗句」「中英数」：可见行补 `zh`/`full`，禁止只改文字
- [ ] 下滑加载更多：新行用当前预览字
- [ ] 详情：`/fonts/{slug}` 与旧 `?slug=` / `?id=` 均可；字重 Thin→Bold 视觉递增
- [ ] 嵌入：`cn/hk/en.windfonts.com/api/css`，无匿名 `text=`
- [ ] 文档：REST + CSS 多字体 + NPM 示例与现网口径一致
- [ ] 顶栏：未登录不显示控制台；链接无 `.html`

### C. 字体渲染回归（必测一款多字重）
- [ ] `/fonts/ibmps`：Regular / Text / Bold 墨量分离
- [ ] 本机已装同族字体时仍正确（验证无 `local()` 污染）
- [ ] 网络面板：各字重请求的是 `/…/{thin|regular|text|bold}/web/*.woff2`

### D. 控制台（可晚于公开站，但若开放则勾）
- [ ] 无 `?demo=1` 时强制登录
- [ ] 域名白名单、用量、子集化、项目 CSS 接真实 API（见 HANDOFF §3）
- [ ] 演示 localStorage 与生产数据隔离（不同 key 前缀或域名）

### E. 运维
- [ ] HTTPS、HSTS、合理 CSP（允许 CDN `cn|hk|en.windfonts.com`）
- [ ] 404 / 缓存头：HTML 短缓存或协商；带 hash/`?v=` 的静态资源长缓存
- [ ] 监控：CDN 4xx/5xx、详情 JS error、目录加载失败告警

## 3. 与「立即可补」的边界

已在原型补齐、不依赖基建的：列表品牌/风格筛、卡片浏览量、列表按热门排序、查字、slug 查询参数、文档、字重 local() 修复。首页不重复放热门区块（字林 + 同分类已够；热门只在 `fonts.html?sort=popular`）。

路径 `/fonts/{slug}` `/foundry/{slug}` 已在边缘。仍卡基建、不要用前端顶替的：真统计、顾客 SSO、REST 网关与文档一致。

## 4. 相关文档

- 接口契约与页面状态：[HANDOFF.md](HANDOFF.md)
- 产品层待优化（控制台/选字袋/认领等）：HANDOFF §「产品层 backlog」
- 双平台：[PLATFORMS.md](PLATFORMS.md)
