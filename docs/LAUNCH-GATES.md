# 上线前检测门闸 · 基础设施清单

> 本仓上线正式域前的硬门槛。未勾完不应把 OSS 前端切到 `app`。  
> 域名总则：**[DOMAIN-ARCHITECTURE.md](DOMAIN-ARCHITECTURE.md)** · 运维：**[ops/DOMAIN-DEPLOY-SOP.md](ops/DOMAIN-DEPLOY-SOP.md)**  
> **`app`**=静态前端（现网机上目录；OSS 终态）；**`vault`**=Next；**`api.`**=网关壳（勿直绑 Next）；CDN=`cn|hk|en|jp`；WP=`windfonts.com`。  
> **本地预览**：`python3 -m http.server 16016`（仅本机）。


## 0. 进度备忘（2026-09-25）

| 项 | 状态 |
|---|---|
| CDN `/api/css` 回源 + 品牌门禁 + 错误 `no-store` | **已通**（`cn`/`hk`/`en`/`jp` 同 CyberCDN） |
| analysis 满覆盖 + `OSS_METADATA_VERSION` | **已通**（`20260925b`） |
| 详情路径 `/fonts/{slug}` | **现网已通**（feicode rewrite + CDN 透传）；OSS 公网绑域仍见 SOP §5 |
| 真统计 | 详情 `WFLive.counts`（app API）；目录热度已用 [`scripts/sync-font-counts.mjs`](../scripts/sync-font-counts.mjs) 写回 `fonts.json`（2026-09-25，553 条分页） |
| `?demo=1` | **已收口**：仅 localhost / `WFProto.ALLOW_DEMO` |
| 真登录 | **管理员 NextAuth 已通**（app 同域 `/api/auth`）；生产禁假壳；顾客 WP SSO 仍待 |
| `app` CDN | **DNS 已切十边**（`windfonts_app`→feicode）；OSS 公网未放行 |
| 对照页不进导航 | 保持；谱系实验室已进 `lab-archive` |

## 1. 必须先落地的基础设施（不能只靠前端假装）

| 项 | 现状 | 上线要求 | 验收 |
|---|---|---|---|
| **详情路径** | 本机 `font-detail.html?slug=`；**现网** feicode 静态 + rewrite | 终态 OSS/CDN 绑 `app`（账号放行后）+ 同 rewrite | `https://app.windfonts.com/fonts/ibmps` → 200；错误 slug → `404.html` |
| **目录真相源** | 本地 `data/fonts.json` 等 | 公开站从 API 或构建流水线拉目录；禁止手改生产 JSON 不入库 | 构建产物含最新目录；字段与 HANDOFF §3 契约一致 |
| **统计** | 浏览 / 下载 / API 为 `localStorage` 叠加演示 | 服务端计数；详情「统计信息」读 API；样张导出打 download；CDN CSS 打 api | 多端数字一致；刷新不丢；无登录也可增浏览 |
| **CDN `@font-face`** | 公开动态：`cn`（CyberCDN）/ `hk`·`en`·`jp`（Cloudflare）的 `/api/css`。预览优先 `cn…/fonts-packages/…/result.css`；`ensureFontCss` 去 `local()`、统一 `wenfeng-*` | 流水线 CSS 默认无 local()；包内字重与目录一致 | `ibmps` 等与现网预览同形；本机装同族时 Bold ≠ Regular |
| **鉴权** | vault NextAuth + `WFAuth`；生产清假壳 | 顾客 WP SSO；vault 项目 CRUD | 未登录无控制台；demo 仅本机；生产 `WFApi`=live |
| **CORS / REST** | 文档写了 `/api/fonts` 等 | 实际网关、API Key、域名白名单、限流与文档一致 | 文档示例 curl 在生产域名可通 |

Rewrite 示例（Nginx）：

```nginx
# /fonts/albbpht → font-detail.html?slug=albbpht
location ~ ^/fonts/([A-Za-z0-9_-]+)/?$ {
  rewrite ^ /font-detail.html?slug=$1 last;
}
error_page 404 /404.html;
```

## 2. 上线前检测门闸（按顺序勾）

### A. 构建与缓存
- [ ] 产品页 `wf-proto` / `wf-chrome` / `wf-specimen` / 页面脚本 `?v=` 与改动同步（禁止半仓旧版本）
- [ ] 不提交 `*.bak`、本地密钥、`.env`
- [ ] `v5-*.html`、`*-options.html`、`oss-audit.html`、`lab.html` 不进生产入口（对照 / 研究页；导航不链）。**保留勿删**，见 [LAB.md](LAB.md)。

### B. 公开主路径冒烟
- [ ] 首页：字林可换字；字体库链可用
- [ ] 字体库：分类 / **风格** / **品牌** / 许可可筛；按热门排序；卡片露浏览量
- [ ] 详情：`?slug=` 与 `?id=` 均可；字重 Thin→Bold 视觉递增；查字可用
- [ ] 嵌入：中国（CyberCDN）/香港·国际·日本（CF）节点、完整/中文子集、link/@import/css/npm 可复制
- [ ] 文档：REST + CSS 多字体 + NPM 示例与现网口径一致
- [ ] 顶栏：未登录不显示控制台；登录注册/管理员可见

### C. 字体渲染回归（必测一款多字重）
- [ ] `font-detail.html?slug=ibmps`：Regular / Text / Bold 墨量分离
- [ ] 本机已装同族字体时仍正确（验证无 `local()` 污染）
- [ ] 网络面板：各字重请求的是 `/…/{thin|regular|text|bold}/web/*.woff2`

### D. 控制台（可晚于公开站，但若开放则勾）
- [ ] 无 `?demo=1` 时强制登录
- [ ] 域名白名单、用量、子集化、项目 CSS 接真实 API（见 HANDOFF §3）
- [ ] 演示 localStorage 与生产数据隔离（不同 key 前缀或域名）

### E. 运维
- [ ] HTTPS、HSTS、合理 CSP（允许 CDN `cn|hk|en|jp.windfonts.com`）
- [ ] 404 / 缓存头：HTML 短缓存或协商；带 hash/`?v=` 的静态资源长缓存
- [ ] 监控：CDN 4xx/5xx、详情 JS error、目录加载失败告警

## 3. 与「立即可补」的边界

已在原型补齐、不依赖基建的：列表品牌/风格筛、卡片浏览量、列表按热门排序、查字、slug 查询参数、文档、字重 local() 修复。首页不重复放热门区块（字林 + 同分类已够；热门只在 `fonts.html?sort=popular`）。

仍卡在基建、**不要用更多前端 hack 顶替**的：本仓 **OSS 挂到 app**、`/fonts/{slug}` 边缘 rewrite、真登录、控制台 live。目录热度同步脚本已可跑。

## 4. 相关文档

- 接口契约与页面状态：[HANDOFF.md](HANDOFF.md)
- 产品层待优化（控制台/选字袋/认领等）：HANDOFF §「产品层 backlog」
- 双平台：[PLATFORMS.md](PLATFORMS.md)
