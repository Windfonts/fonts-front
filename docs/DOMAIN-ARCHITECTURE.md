# Windfonts 域名与部署架构

> 定稿日期：2026-09-25。  
> 本文是 **域名分配、服务边界、故障隔离、迁移顺序** 的唯一口径。  
> 相关：双平台产品边界见 [PLATFORMS.md](PLATFORMS.md)；上线门闸见 [LAUNCH-GATES.md](LAUNCH-GATES.md)；**运维 SOP** 见 [ops/DOMAIN-DEPLOY-SOP.md](ops/DOMAIN-DEPLOY-SOP.md)；嵌入口径硬约束见仓库规则 `cdn-embed-contract`。

## 目录

1. [一句话结论](#1-一句话结论)
2. [为什么不能把 Next 直接绑成 `api.`](#2-为什么不能把-next-直接绑成-apiwindfontscom)
3. [各域名详细职责](#3-各域名详细职责)
4. [OSS + Next 怎么接](#4-oss-前端--服务器-next怎么接在一起)
5. [现网过渡](#5-现网过渡诚实状态)
6. [代码与配置落点](#6-代码与配置落点本仓)
7. [方案对比与建议](#7-方案对比与建议摘要)
8. [验收清单](#8-验收清单infra--前端)
9. [其余域名与资源](#9-还有哪些域名与资源可能要分配)
10. [修订记录](#10-修订记录)

---

## 1. 一句话结论

| 域名 | 挂什么 | 不挂什么 |
|---|---|---|
| **`windfonts.com`** | WordPress：营销、博客、注册登录、收费、订阅 | 字体拆包、动态 CSS 生成 |
| **`app.windfonts.com`** | `fonts-front` → **OSS 纯前端** | API 进程、字体包源站 |
| **`vault.windfonts.com`** | **fonts-vault（Next）字体后端** | 整站账号、支付、博客 |
| **`api.windfonts.com`** | **平台 API 总入口 / 网关**（可后上） | **禁止**直接等于 Next 单机进程 |
| **`cn` / `hk` / `en` / `jp.windfonts.com`** | **CDN only**（字形 + 边缘 `/api/css`） | 整站 HTML、运营后台 |
| **`wenfeng.org`** | 造字、授权原文、源文件 | Windfonts 分发站 |
| **`127.0.0.1:16016`** | 本机预览本仓静态 | **不是**部署目标 |

**核心原则：域名职责 ≠ 某台应用进程。**  
「`api.`」是平台级名字；「Next / fonts-vault」是字体子系统后端。二者不要绑死在同一台机、同一个进程上。

---

## 2. 为什么不能把 Next 直接绑成 `api.windfonts.com`

### 2.1 问题本身

若 DNS / 证书 / 反代把 **`api.windfonts.com` → 唯一一台 Next（fonts-vault）**：

1. **Next 进程或那台服务器挂了 → `api.*` 整域不可用。**
2. 以后 WP 的账号、订阅、订单也要「走 API」时，若也挤进同一主机名且回源仍是 Next，则：
   - 字体挂 → 账号/支付接口看起来也挂；
   - 或被迫把支付逻辑写进 Next，边界毁掉。
3. 「平台 API」与「字体后端」在运维上无法独立扩缩、独立发布、独立回滚。

这和「Next 只做字体后端」的产品分工是冲突的：**名字是平台级，实现却是单子系统单机。**

### 2.2 正确心智模型

```
用户 / 前端 / CDN
        │
        ▼
┌───────────────────┐
│ api.windfonts.com │  ← 总入口名（网关 / 边缘 / 以后 BFF）
│  路由、TLS、限流   │
└─────────┬─────────┘
          │ 按路径或上游分流
     ┌────┴────┐
     ▼         ▼
 vault.*     WP / 其它
 (字体)     (账号·订阅·…)
```

- **今天**可以没有真正的网关进程：浏览器与脚本 **直连 `vault.windfonts.com`**。
- **`api.` 域名可以先空着，或只做反代到 vault**——但 **DNS 目标不要写成「api = Next 容器本身」这种不可替换绑定**；应写成「api → 网关配置」，网关再 `proxy_pass` 到 vault 上游。

### 2.3 专名怎么选（建议）

| 候选 | 优点 | 缺点 | 建议 |
|---|---|---|---|
| **`vault.windfonts.com`** | 对得上仓名 fonts-vault；短；一看是子系统 | 对外部开发者略「内部」 | **推荐作为 Next 正式主机名** |
| `fonts-api.windfonts.com` | 对外语义清楚「字体 API」 | 略长 | 可作 CNAME 别名指向 vault |
| `api.windfonts.com` 直绑 Next | 短、省事 | **单点废掉整域 API 名；与 WP 集成冲突** | **否决** |

**定稿建议：**

- Next 正式对外主机名：**`vault.windfonts.com`**
- 可选别名：`fonts-api.windfonts.com` → CNAME → vault（给第三方文档用）
- **`api.windfonts.com`**：留给平台网关；上线前可暂反代到 vault，但配置上保持「可换上游」

---

## 3. 各域名详细职责

### 3.1 `windfonts.com` — WordPress（生意与账号）

| 做 | 不做 |
|---|---|
| 营销落地、博客、SEO | 字体包 OSS 源站 |
| 用户注册 / 登录 / 会话 | `/api/css` 动态生成 |
| 收费、订阅、发票、套餐 | 字体运营后台（vault `/admin`） |
| 以后与字体系统打通的 **身份与权益真相源** | 代替 CDN |

**与字体系统集成（方向，非本周实现）：**

- WP 发 JWT / 会话票据 / webhook（订阅开通、降级、取消）
- vault 只 **校验权益档位**（能否商用嵌入、配额），不自建支付
- 控制台「谁登录了」最终以 WP 账号为准

### 3.2 `app.windfonts.com` — OSS 前端（本仓 fonts-front）

| 项 | 说明 |
|---|---|
| 产物 | 纯静态 HTML / CSS / JS / `data/*.json` |
| 部署 | 上传 **OSS**（或等价对象存储），域名绑到桶或经 CDN 回源桶 |
| 页面 | 逛库、详情、厂商、文档、顾客控制台壳（`app/`） |
| 详情路径 | `/fonts/{slug}` → 边缘 / nginx rewrite → `font-detail.html?slug=`（见 `deploy/nginx-fonts-front.snippet.conf`） |
| **不跑** | Node、Next、PHP |

本地预览：`python3 -m http.server 16016` → `http://127.0.0.1:16016/`。  
**16016 不是环境名，只是本机端口约定。**

浏览器从 `app` 请求数据：

- 目录热度等：`https://vault.windfonts.com/api/...`（或经 `api.` 网关）
- 跨域：vault 公开 GET 已 CORS `*`；写操作 / 控制台用 Bearer，**不依赖与 app 同域 cookie**

### 3.3 `vault.windfonts.com` — Next / fonts-vault（字体后端）

这是 **字体子系统的后端**，不是「整个 Windfonts 平台后端」。

| 挂什么 | 典型路径 |
|---|---|
| 字体目录 / 单款 / 计数 | `/api/fonts`、`/api/fonts/:id` |
| 字符分析 | `/api/fonts/.../analysis` |
| 动态 CSS 真源 | `/api/css`（CDN 边缘回源到这里） |
| 项目 CSS 发布 | `/api/projects/publish`、`/p/{slug}/...` |
| 许可门禁 | license-gate 等 |
| 运营后台 | `/admin`（字体/厂商/同步/密钥） |
| OSS 元数据协作 | analysis、包登记相关 |

| 不挂什么 |
|---|
| 营销站、博客 |
| 用户注册登录、会员中心（归 WP） |
| 收费、订阅、支付回调（归 WP） |
| 给最终用户复制的「嵌入默认主机」（那是地区 CDN） |

**故障影响面（刻意做小）：**  
vault 挂了 → 逛库动态计数、动态 CSS、运营后台、分析接口受影响；  
**WP 登录收费、博客、营销页仍应可用**；OSS 上的静态页仍能打开（样张可走 CDN 静态 `fonts-packages` 兜底策略另论）。

### 3.4 `api.windfonts.com` — 平台 API 总入口（网关）

| 阶段 | 建议 |
|---|---|
| **现在** | 可以未解析；或 nginx/边缘仅 `proxy_pass` → `vault` 上游，**配置可改** |
| **WP 打通后** | 按路径分流，例如：`/v1/fonts|css|…` → vault；`/v1/account|billing|…` → WP / 账号服务 |
| **永远不要** | 把该主机的 A 记录理解成「等于某台 Next 容器 IP 且永不换」 |

前端常量：

- 长期：控制台 / 机读可走 `https://api.windfonts.com/...`（网关）
- 短期：`WFProto.CSS_API = https://vault.windfonts.com`（直连字体后端，少一跳）

嵌入代码 **仍然禁止**默认写成 `api.` 或 `vault.` 或 `app.`——对外嵌入只用地区 CDN（见下节）。

### 3.5 `cn` / `hk` / `en` / `jp.windfonts.com` — CDN only

| | |
|---|---|
| 边缘 | `cn` / `hk` / `en` / `jp` = **同一套** CyberCDN 十边（证书 `*.windfonts.com`）。独立 Cloudflare zone **非**现网前置 |
| 内容 | woff2、`fonts-packages/…`、项目 `/p/…`、**边缘** `/api/css` |
| 回源 | `/api/css`（及需动态的路径）→ **vault 上游**（Host 用 `vault.windfonts.com`） |
| 不当 | 整站前端、运营后台、WP |

**嵌入口径（硬约束，勿改）：**

```text
https://{cn|hk|en|jp}.windfonts.com/api/css?family=&weight=&version=
```

禁止：

- 用 `fonts-packages/.../result.css` 顶替用户可复制的「动态」嵌入
- 把动态默认主机改成 `app` / `vault` / `api`「图省事」

预览加载（站内 `ensureFontCss`）可以继续用包路径；那是内部预览，不是对外嵌入。

### 3.6 `wenfeng.org`

造字、授权原文、源文件、缺字工具向。与 Windfonts 分发站双向链接，职责见 [PLATFORMS.md](PLATFORMS.md)。

---

## 4. OSS 前端 + 服务器 Next：怎么「接」在一起

两者 **不是** 同一部署单元，靠 **HTTPS + CORS + Bearer** 连接。

```
┌─────────────────────────────────────┐
│  app.windfonts.com                  │
│  OSS：index.html / fonts.html / …   │
│  JS: WFProto.CSS_API → vault        │
└─────────────────┬───────────────────┘
                  │ fetch / XHR
                  │ Origin: https://app.windfonts.com
                  ▼
┌─────────────────────────────────────┐
│  vault.windfonts.com                │
│  服务器：Docker / Node Next         │
│  CORS 允许公开 GET；写接口验 Key    │
└─────────────────┬───────────────────┘
                  │ 读/写
                  ▼
            DB / OSS 字体包
```

| 问题 | 处理 |
|---|---|
| 静态与 API 不同源 | 正常；vault 已对公开 GET 设 CORS |
| 登录态 | 近期 Bearer / API Key；远期 WP 发的 token，vault 验签 |
| app 要不要反代 `/api` | **正式形态不需要**；app 只出静态。过渡期若仍共用旧主机，可临时反代，但要有下线日 |
| CDN 与 vault | 边缘回源 vault；失败时静态包路径可作预览降级，**不可**改对外动态 URL 形态 |

---

## 5. 现网过渡（诚实状态）

截至 2026-09-25 观测：

| 主机 | 状态 |
|---|---|
| `app.windfonts.com` | **已切静态 fonts-front**；`/api` `/admin` `/_next` 仍反代 Next；**DNS 已切 CyberCDN 十边**（源仍 feicode；OSS 公网未放行） |
| `api.windfonts.com` | **已开网关壳**：DNS A→`45.117.8.70`；nginx 反代上游 vault（`Host: vault.windfonts.com`）；`/gateway/health` 自答；响应头 `X-Windfonts-Gateway: api` |
| `vault.windfonts.com` | **已通**：DNS+通配证+nginx→`:4000` |
| `staging-app` / `staging-vault` | **已通**（同机静态 / Next；staging-app 仍可直指源站便于发布验收） |
| `cn` / `hk` / `en` / `jp.windfonts.com` | `/api/css` 十边 Host→**vault**；四子域同池（非独立 CF） |
| `www.windfonts.com` | **已定**：301 → `https://windfonts.com/`（CyberCDN canonical） |
| OSS `wenfeng-web` | **已建并灌入**；ACL=private；公网 `app` 走 CyberCDN→feicode，见 SOP §5 / §5.1 |

**迁移进度：**

1. ~~vault 双 Host~~ **完成**
2. ~~CDN origin_host → vault~~ **完成**（十边 + ansible defaults）
3. ~~前台 `CSS_API` → vault~~ **完成**
4. ~~`app` 公开页静态化~~ **完成**（机上静态目录；OSS 公网绑域待账号放开或走 CDN 回源）
5. ~~staging-app / staging-vault~~ **完成**
6. ~~`api.` 网关壳~~ **完成**（仅反代 vault；WP 账号打通仍未做）
7. WP 账号 / hooks：未做

---

## 6. 代码与配置落点（本仓）

| 符号 / 位置 | 含义 | 定稿值 |
|---|---|---|
| `WFProto.SITE_ORIGIN` | 前端正式域 | `https://app.windfonts.com` |
| `WFProto.CSS_API` | 字体后端（Next） | `https://vault.windfonts.com` |
| `WFProto.CDN` / `CDN_HOSTS` | 嵌入与预览 CDN | `cn` / `hk` / `en` / `jp` |
| `scripts/sync-font-counts.mjs` | `WF_API_ORIGIN` | 默认 `https://vault.windfonts.com`；过渡可覆盖为现网 `https://app.windfonts.com` |
| 嵌入生成器 | 动态 URL | **仅** `{cdn}/api/css?...` |
| 运营后台链接 | 文档 / 书签 | `https://vault.windfonts.com/admin` |

**过渡覆盖：** 在 vault DNS 未好前，本地或 CI 可：

```bash
WF_API_ORIGIN=https://app.windfonts.com node scripts/sync-font-counts.mjs --write
```

浏览器调试亦可临时改 `localStorage` / 构建替换，**不要**把过渡主机写死回「api = Next」。

---

## 7. 方案对比与建议摘要

| 方案 | 做法 | 优点 | 风险 | 结论 |
|---|---|---|---|---|
| A | `api.` 直绑 Next | 快 | 字体挂 = 平台 API 名全废；WP 难接入 | **否决** |
| B | Next 用 `vault.`；`api.` 作网关（可后上） | 故障隔离；名实相符；可演进 | 多一个主机名与证书 | **采纳** |
| C | 全部继续挤在 `app.`（Next+将来前端） | 零 DNS 工作 | OSS 与 API 无法分离；前端与后端发布耦死 | 仅作过渡，**不作为终态** |
| D | 嵌入也写 `vault.` / `api.` | 少一层 CDN | 违反地区节点与缓存策略；硬约束禁止 | **否决** |

**建议（执行用）：**

1. **Next 正式域名：`vault.windfonts.com`。**
2. **`api.windfonts.com` 不绑死 Next**；作平台网关预留（或仅反代且可改上游）。
3. **`app.windfonts.com` = OSS 前端终态**；与 vault 分离发布。
4. **`windfonts.com` = WP**；账号与钱的唯一对外站，和 vault 用 token/webhook 集成。
5. **CDN 三/四地区子域只做分发**；动态嵌入永不改成 app/vault/api。
6. 文档与常量以本文为准；HANDOFF / LAUNCH-GATES 只保留摘要并链到本文。

---

## 8. 验收清单（infra + 前端）

- [x] `vault.windfonts.com` 解析到 Next 上游，HTTPS 有效；`GET /api/fonts?page=1&size=1` → 200
- [x] `app.windfonts.com` 公开页为 fonts-front 静态；`/fonts/ibmps` rewrite 正确；**未**把整站交给 Next（`/api` `/admin` 过渡反代仍在；OSS 公网绑域待账号放开）
- [x] `cn…/api/css?...` 回源 Host 为 vault（十边 + ansible）
- [x] 前台 `CSS_API` 指向 vault；嵌入示例仍为地区 CDN
- [x] 停 vault 容器做演练（2026-09-25）：WP / app 静态 200；vault/api/cn 502；`/gateway/health` 仍 200；约 4s 恢复
- [x] `api.windfonts.com` 网关壳反代 vault（`Host` 改写）；`/gateway/health` 200；响应头 `X-Windfonts-Gateway: api`
- [x] `www` → apex 301 已定

---

## 9. 还有哪些域名与资源可能要分配

主表（§1）只覆盖日常主机。本节是 **扩容清单**：哪些还要占 DNS、哪些只是桶/密钥/邮箱、哪些故意不开。

### 总览（先看这张表）

| 类别 | 要什么 | 优先级 | 单独域名？ |
|---|---|---|---|
| 字体后端名 | `vault.windfonts.com` | P0 | 要 |
| 前端 OSS | 桶 + 将来 `app` 改绑 | P0 | 域名已有，改解析 |
| CDN 回源 | Host → vault | P0 | 否（配置） |
| www / apex | 一条 301 | P0 | 已有，定跳转 |
| 邮件 | `noreply@` 等 + SPF/DKIM | P0 | 否（同根域） |
| 预发 | `staging-app` / `staging-vault` | P1 | 要 |
| 平台网关 | `api.` 可换上游 | P1 | 要（预留） |
| 运营加固 | `admin.` → vault/admin | P2 | 可选 |
| 状态页 | `status.` 独立托管 | P2 | 要（勿跟 vault 同机） |
| 支付/SSO | `hooks.` / `auth.` 或 WP 路径 | P2 | 可路径可域名 |
| 文档站 / 别名 | `docs.` / `fonts-api.` | P3 | 可选 |
| 新地区 CDN | 如 `sg.` | P3 | 仅 CDN 节点 |
| 前端分站 | `jp.app` 等 | — | **不要** |

细则见以下各小节。

### 9.1 建议优先占坑（与主链路强相关）

| 资源 | 建议形态 | 用途 | 说明 |
|---|---|---|---|
| **`vault.windfonts.com`** | DNS + TLS → Next | 字体后端正式名 | 主表已定；现网需新建 |
| **`app.windfonts.com` → OSS** | 主机改绑对象存储 | 前端终态 | 现仍指 Next，要迁 |
| **CDN 回源 Host** | 配置项，不是新域名 | `cn…/api/css` → vault | 与 vault 证书同步改 |
| **字体包 OSS 桶** | 桶名 + 仅经 CDN 暴露 | `fonts-packages/`、旧 `wenfeng/fonts/` | **不要**再给桶挂第二个「整站」域名；对外只走 `cn|hk|en|jp` |
| **前端静态 OSS 桶** | 与字体包 **分桶** | HTML/JS/CSS/`data/` | 与字体大文件隔离，权限与生命周期分开 |
| **`www.windfonts.com`** | 301 → apex 或反过来 | WP 营销 | 定一条永久跳转，避免双首页 SEO 分裂 |
| **邮件域** | `noreply@` / `support@` / `billing@` @windfonts.com | 注册、收据、通知 | 跟 WP；SPF/DKIM/DMARC 要配。**不要**用 vault 发营销信 |

### 9.2 建议预留主机名（可先解析到占位或内网）

| 域名候选 | 建议 | 优先级 | 分析 |
|---|---|---|---|
| **`api.windfonts.com`** | 平台网关预留 | P1 | 主表已定；**勿直绑 Next** |
| **`fonts-api.windfonts.com`** | CNAME → vault（可选） | P3 | 给外部文档「更好懂」的别名；不是第二套服务 |
| **`staging-app.` / `staging-vault.`**（或 `stg.`） | 预发前端 OSS + 预发 Next | P1 | 切 OSS / 改回源前必须有；禁止预发写生产桶 |
| **`admin.windfonts.com`** | 反代 → `vault…/admin` 或同上游 path | P2 | 运营入口与公开 API 主机分离，便于 IP 白名单 / 额外 SSO；初期可继续用 `vault…/admin` |
| **`status.windfonts.com`** | 状态页（独立小服务或第三方） | P2 | vault 挂了仍要能打开；**不要**托管在 vault 同机 |
| **`hooks.windfonts.com`** 或 `api…/hooks` | 支付/WP webhook 入口 | P2（打通订阅时） | 与字体流量隔离；验签、限流单独配。可先做 `api` 网关路径而不开新域 |
| **`auth.windfonts.com` 或 WP 路径** | 统一登录 / OAuth 回调 | P2（账号打通时） | 若 SSO：cookie 域用 `.windfonts.com`；回调白名单要列全 app/vault/api |
| **`cdn-static.` 或沿用地区 CDN 路径** | 站内图、头像、非字体静态 | P3 | 厂商头像等现可走 app OSS 或 cn 路径；量大再拆，避免和 woff2 抢缓存策略 |

### 9.3 地区与语言（已有结论，再强调资源面）

| 项 | 建议 |
|---|---|
| `hk` / `en` / `jp` | **要**作为 CDN 节点占 DNS + CF；**不要**各做一套字库桶 |
| 繁/日默认语言 | 产品层用同一 `app` + 目录字段 / 子路径或 query，**不必** `jp.app.` 这种前端分站 |
| 新地区（如 `sg` / `us`） | 仅当有真实流量与合规需求再开 CDN 子域；规则同「只 CDN」 |

### 9.4 一般不必单独占域（用路径或现有域）

| 需求 | 建议落点 | 不建议 |
|---|---|---|
| 开发者文档 | 先 `app…/docs.html`；量大再 `docs.windfonts.com` → 静态或 WP | 过早拆 docs 站 |
| 顾客控制台 | `app.windfonts.com/app/…`（OSS） | `console.` 除非以后要独立 SPA 与 cookie |
| 许可证页 | `wenfeng.org/license`（已有）+ app 内说明 | 再开 `license.windfonts.com` |
| 项目 CSS | `{cdn}/p/{slug}/index.css` | 每项目一个域名 |
| 短链 / 分享卡 | WP 插件或 `app` 路径 | 除非量很大 |
| npm 包名 | 包管理器命名空间，不是 DNS | — |
| 实验室 / 对照页 | 不进生产导航；不必公开子域 | `lab.windfonts.com` 公网 |

### 9.5 存储与密钥类「资源」（不是 DNS，但要分配）

| 资源 | 建议 |
|---|---|
| **生产 / 预发 OSS 桶** | 至少：`fonts-web`（前端）、`fonts-packages`（字形）；预发各一套或同桶不同前缀 + 严权限 |
| **vault 数据库** | 生产与预发实例分离；备份与恢复演练 |
| **API Key / 发布 Key** | 按环境；控制台 publish 与公开只读分离 |
| **对象存储 AK/SK** | 仅 vault / CI 持有；前端 OSS 可用只读或独立上传角色 |
| **证书** | 每公网主机名一张（或通配 `*.windfonts.com`）；通配省事但泄露面大，团队小时可用通配 |
| **日志与监控** | 按服务拆：CDN 4xx/5xx、vault 5xx、OSS 流量；告警别只挂在 app |
| **WAF / 限流** | CDN 边缘限 `/api/css`；vault 限管理与 publish；WP 限登录 |
| **CORS 允许 Origin** | 生产：`app`、以后 WP；预发：`staging-app`；本地 `127.0.0.1:16016` 可单独开关 |
| **Cookie 域** | SSO 前不要乱开 `.windfonts.com`；开通时文档写清哪些子域可读 |

### 9.6 `wenfeng.org` 侧可能要的子资源

| 候选 | 用途 | 优先级 |
|---|---|---|
| apex / `www` | 造字与授权门户 | 已有产品分工 |
| `license` 路径或子域 | 授权原文（现多路径） | 保持稳定 URL，少改 |
| 以后 `tools.` / 缺字报告 | 开源工具托管 | 产品排期后；**不要**指到 windfonts CDN |

### 9.7 邮件、证书、OTP 等周边

| 项 | 建议 |
|---|---|
| 事务邮件 | WP / 邮件服务商；域名 `windfonts.com` |
| 字体侵权/法务邮箱 | `legal@` 或 WP 表单；与 noreply 分离 |
| ACME DNS 挑战 | 若用 DNS-01 发通配证，CIRCLE 权限与 CDN 账号分离 |
| 支付回调 URL | 优先 `https://windfonts.com/…`（WP）或 `https://hooks.…`；**不要**打到 CDN 缓存层 |

### 9.8 建议的占坑优先级（执行序）

```
P0 现在就能卡发布
  ├─ vault DNS/TLS（双 Host 过渡）
  ├─ 前端 OSS 桶 + 将来切 app
  ├─ CDN /api/css 回源改为 vault Host
  └─ www ↔ apex 跳转定死

P1 切流量前
  ├─ staging-app + staging-vault
  ├─ 生产/预发桶与 Key 分离
  └─ api. 网关配置壳（可先只反代 vault）

P2 账号与钱打通时
  ├─ hooks / auth 回调
  ├─ admin. 加固（可选）
  └─ status. 独立状态页

P3 有余力
  ├─ fonts-api. 别名
  ├─ docs. 独立
  └─ 新地区 CDN 节点
```

### 9.9 明确「先不要开」的

- 不要为每个环境、每个国家开一套 **前端** 域名（`jp.app`、`hk.app`…）。
- 不要 `api.` = Next 容器 IP 永久绑定。
- 不要给 OSS 字体桶再挂一个与 CDN 平行的「可写公网域」给浏览器直传。
- 不要把预发、状态页、webhook 和生产 vault **同机同域**硬扛——隔离失败域比多两个 DNS 记录更贵。

---

## 10. 修订记录

| 日期 | 说明 |
|---|---|
| 2026-09-25 | 初稿。纠正「api 直绑 Next」；定稿 vault / app OSS / WP / CDN / api 网关预留。 |
| 2026-09-25 | P0/P1 落地：vault、CDN N1b、app 静态、staging、`api.` 网关壳、www→apex；OSS 公网仍受账号禁 public-read 限制。 |
| 2026-09-25 | §9：其余域名与 OSS/邮件/预发/webhook 等资源分配清单与优先级。 |
| 2026-09-25 | 目录 + §9 总览表；CONSOLE / FRONTEND-STANDARDS / HANDOFF 交叉链对齐。 |
| 2026-09-25 | 落地 vault DNS/TLS/nginx；建 OSS `wenfeng-web`；CDN Host→vault 待边缘应用。 |
| 2026-09-25 | 停 vault 演练通过；新增 [ops/DOMAIN-DEPLOY-SOP.md](ops/DOMAIN-DEPLOY-SOP.md)；OSS 公网绑域仍受账号禁 public-read 限制。 |
| 2026-09-26 | `hk|en|jp` 与 `cn` 同 CyberCDN 验收；`app` DNS 切十边（`windfonts_app`→feicode）；OSS 公网仍未放行。 |
