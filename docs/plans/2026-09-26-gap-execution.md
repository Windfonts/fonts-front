# 缺口收口执行计划 · 2026-09-26

> **For agentic workers:** 按任务顺序执行；步骤用 checkbox 跟踪。完成一项勾一项并部署/验收后再进下一项。  
> 对照来源：会话缺口盘点 · [HANDOFF.md](../HANDOFF.md) · [CITE-CERT-GATE-2026-09-26.md](../CITE-CERT-GATE-2026-09-26.md) · [LAUNCH-GATES.md](../LAUNCH-GATES.md) · [CONSOLE.md](../CONSOLE.md) · [ops/DOMAIN-DEPLOY-SOP.md](../ops/DOMAIN-DEPLOY-SOP.md)

**Goal:** 把「功能和页面欠缺 / 运营与真实用户需求未做」收成可交付批次，按价值落地，避免散改。

**Architecture:** 公开投递仍走 CDN `/api/css` + `fonts-packages`；cite-closed 只走 **账号作用域**（`/api/font-certs/css` + 日后项目 `source=cert` bake `/p/`），永不灌公共包。控制台顾客数据走 vault live API；运营留 `/admin`。账号统一依赖 WP ↔ vault hooks（本仓可做接线与门禁，不能假造 SSO）。

**Tech Stack:** 静态前台 `fonts-front-v4-lab`（`js/wf-*`、`app/*`）· vault Next（`fonts-vault`）· feicode 部署 `scripts/deploy-feicode-front.sh`

**明确不做（整份计划全程遵守）：**
- 公开 `GET /api/css?text=` 即时切字
- 去掉 `cite-closed` / 站级强制开放引用
- 灌 `fonts-packages/{Jlyhmht,Shmgt}`
- 用 `upload.html` 冒充证书解锁
- 对照页 `*-options` / `v5-*` / lab 进生产导航

---

## 0. 文件地图

| 区域 | 主要文件 |
|---|---|
| 证书 / cite | `js/wf-proto.js`、`js/wf-embed.js`、`js/pages/detail.js`、`js/pages/app-cert-upload.js`、`js/pages/app-certs.js` |
| 证书 API | vault `app/api/font-certs/**`、`lib/services/console-font-certs.service.ts` |
| 项目 bake | vault `project.service.ts` · 前台 `js/wf-app.js` `projectManifest` |
| 团队 / 收藏 | `js/wf-api.js`、`js/wf-proto.js`、`js/pages/app-team.js` |
| 我的页 | `js/pages/app-pages.js` · vault foundry claim overlay |
| 部署 | `scripts/deploy-feicode-front.sh` |

---

## 批次总览

| 批次 | 主题 | 优先级 | 状态 |
|---|---|---|---|
| **B0** | lab 团队+收藏 live 接线 + 缓存戳 | P0 基建 | 接线已落盘；staging 曾 SSH 超时 |
| **B1** | cite-closed → 可用账号 CSS / 嵌入 | **P0** | 已完成 |
| **B2** | 项目 `source=cert` bake → `/p/` 可嵌 | P0 | vault 已部署 |
| **B3** | 我的页 publish（公开厂商页） | P0 | vault+staging 已部署 |
| **B4** | 顾客 WP SSO ↔ vault（hooks） | P0 账号 | 本仓门禁/CTA 已做；WP hooks 仍跨仓 |
| **B5** | 版本回滚真 API + 设置审计 live | P1 | vault+前台已部署 |
| **B6** | 计费 / 配额 / 支付 hooks | P1 | 配额只读已通；支付/强制仍等商务 |
| **B7** | 选字袋多字体、样张设置、OG URL | P2 | 已完成（含 vault OG/share） |
| **B8** | 运营巡检 / 通知 / admin 域 | P2 运营 | 站内通知+状态页壳已做；admin 域/邮件仍待 DNS |
| **B9** | OSS 公网、孤儿删、边缘 429、字重错挂 | 基建 | 429 复核文档已记；OSS/孤儿/重拆包仍 devops |

---

## B0 · 团队与收藏 live（收尾）

**Files:** `js/wf-api.js` · `js/wf-proto.js` · `js/wf-app.js` · `js/pages/app-team.js` · `js/pages/detail.js` · 各 `app/*.html` / `font-detail.html` `?v=`

- [x] WFApi：`listTeam` / invite / role / remove + `getFavsRemote` / `putFavs` / `syncFavs`
- [x] WFProto：`scheduleFavsPush` / `syncFavsWithVault`；ensureVaultApiKey 钩 picks+favs+certs
- [x] detail：挂载前 `syncVaultFontCerts`
- [x] 缓存 `?v=20260926teamfavs1`
- [ ] **Step:** `./scripts/deploy-feicode-front.sh --staging`（SSH 通后再跑）→ 手验 team / favs
- [ ] **Step:** 验收后 `--prod`

**验收:** 登录 staging → 团队页拉 vault；收藏心形后刷新仍在；详情 cite-closed 同步 grant。

---

## B1 · 账号级证书 CSS 接到嵌入（本波）

**Goal:** 证书 **approved** 后，详情「引用」不再生成会 404/403 的公开 CDN `/api/css`，改为 vault **`/api/font-certs/css`**，并标明须 API Key；站内可一键用本账号 Key 预览。

**Architecture:**  
`citeAllowed` 已在 grant 时 `ok`。缺口在 **URL 形态**：公开 CDN 无包。嵌入器对 `cert-grant` 项改走 `WFProto.certCssApiUrl` → `{CSS_API}/api/font-certs/css?family=&weight=`。代码片段展示 `Authorization: Bearer`；禁止把 Key 写进可复制的 `<link href>` 查询串。

### Task B1.1 · Proto URL

**Files:** Modify `js/wf-proto.js`

- [x] **Step 1:** 新增 `certCssApiUrl(family, weight, origin?)` → `CSS_API + /api/font-certs/css?...`（family 经 `resolveCssFamilyName`）
- [x] **Step 2:** 导出到 `WFProto`
- [x] **Step 3:** `node --check js/wf-proto.js`

### Task B1.2 · Embed 分支

**Files:** Modify `js/wf-embed.js`

- [x] **Step 1:** `fileUrl`：若 `it.certGrant`（或 `it.citeMode === 'cert'`）→ `certCssApiUrl`，忽略 CDN origin / fallback 公开参数
- [x] **Step 2:** 代码面板：对 cert 模式追加说明条（须 Bearer；不等于 fonts-packages；生产建议进项目发布 `/p/`）
- [x] **Step 3:** curl 示例带 `-H "Authorization: Bearer $WINDFONTS_KEY"`
- [x] **Step 4:** `node --check js/wf-embed.js`

### Task B1.3 · 详情传入 certGrant + 预览

**Files:** Modify `js/pages/detail.js`

- [x] **Step 1:** `embedItems()` 对 `cite.reason` 为 `cert-grant` / `cert-grant-lab` 的字体设 `certGrant: true`
- [x] **Step 2:** 横幅文案改为指向「账号 CSS / 项目发布」，去掉「站内片段即可当生产 CDN」歧义
- [x] **Step 3:** （可选同 PR）按钮「用本账号预览」：`WFApi` fetch cert CSS + 注入 `<style>`（Key 不出现在 DOM URL）
- [x] **Step 4:** bump `font-detail.html` detail/embed/proto `?v=`

### Task B1.4 · WFApi 拉 cert CSS

**Files:** Modify `js/wf-api.js`

- [x] **Step 1:** `fetchFontCertCss(family, weight)` → GET `/api/font-certs/css`（沿用现有 auth header）
- [x] **Step 2:** export

**验收 B1:**
1. 无 grant：cite-closed 仍拒绝嵌入  
2. approved：嵌入 URL 主机为 vault，路径 `/api/font-certs/css`  
3. 裸开 CDN `/api/css?family=wenfeng-jlyhmht` 仍无公共包（不变）  
4. 带 Key 的 GET cert CSS → 200 + `@font-face` preview

---

## B2 · 项目 source=cert → bake `/p/`（真站可嵌）

**Goal:** 过审用户把 cite-closed 字加入项目并发布后，对外只用域名白名单下的 `/p/{slug}/index.css`（无 Bearer）。

**Files:**  
- vault `project.service.ts`（bake）· validation/manifest 类型  
- 前台 `wf-app.js` `projectManifest` / `addFont`  
- 控制台项目页 UI

- [x] manifest 允 `source: 'cert'` + `fontKey`；publish/bake 校验 approved grant
- [x] bake 复用 CERT_PREVIEW_FACES（与 `/api/font-certs/css` 同源）
- [x] 前台 `projectManifest`：过审 → source=cert；未过审跳过
- [x] vault 部署（feicode docker，Forgejo SSH 暂不通未推远程）
- [x] 前台 staging 同步
- [ ] 文档：docs / CONSOLE 一句
- [x] 前台 --prod

**验收:** 发布后 `https://cn.windfonts.com/p/{slug}/index.css` 含该 face；未授权 Key 无法 bake 进包。

---

## B3 · 我的页 publish

**Goal:** `app/pages.html` 保存的介绍/官网/外链能发布到公开厂商页。

- [ ] vault：页资料存储（可扩 claim overlay 或 `foundry-page-overrides`）+ `POST /api/pages/publish`（须已 approved claim）
- [ ] 公开 `foundry` / 详情侧栏读覆盖层
- [ ] 前台「保存」外增加「发布到公开页」；状态：草稿 / 已发布 / 失败原因
- [ ] 不改许可档位、不改 licenseVerified（CONSOLE 硬约束）

**验收:** 认领通过账号改介绍 → 发布 → 匿名打开 `foundry.html?slug=` 看见新文案。

---

## B4 · 顾客统一账号（跨仓）

- [ ] 文档对齐：薇晓朵 OAuth 已通 vs windfonts.com WP hooks 仍缺（SOP §11）
- [ ] 本仓：生产禁假壳；未绑定 Key 时控制台明确 CTA
- [ ] vault/WP：统一 userId → API Key 绑定（**devops / 账号仓**，本计划只跟踪）

**阻塞:** 无 WP hooks 前不假装「顾客 SSO 完成」。

---

## B5 · 回滚 + 审计 live

- [x] vault：`POST /api/projects/:id/rollback`
- [x] 前台项目页 live 走 `WFApi.rollbackProject`
- [x] `GET/POST /api/audit`；设置页拉取；`WFApp.log` 同步推送
- [x] staging+prod 前台 `?v=20260926audit1`

---

## B6 · 计费配额（等商务）

- [x] 配额只读：`GET /api/plan` + 设置页展示（不强制）
- [ ] 定价页数字定稿后露出 / 强制免费档
- [ ] `hooks.` 支付回调（DOMAIN-ARCHITECTURE P2）

**阻塞:** 商务未定数字前只做配额只读展示，不接支付。

---

## B7 · P2 体验

- [x] 选字袋 / 嵌入器多选 → `family=a|b`
- [x] 样张默认文案：设置读写 `wf-proto-specimen-cfg`
- [x] OG 图后端固定 URL（vault `/api/og/font` + `/share/font/{id}`）
- [x] 独立「我的收藏」页（`app/favs.html`）
- [ ] 无障碍读屏走查

---

## B8 · 运营

- [x] 证书/认领审核站内通知（`/api/notifications`；邮件未接）
- [x] 认领进度站内通知（同上）
- [x] 字重名 vs key 巡检脚本 `scripts/inspect-weight-names.mjs`（name table 真扫仍待流水线）
- [x] 许可未核实队列视图（`/admin/license-queue`）
- [ ] `admin.windfonts.com` + IP 白名单（snippet：`deploy/nginx-admin.windfonts.com.snippet.conf`；DNS 未挂）
- [x] 状态页壳：前台 `status.html`（正式 `status.` 主机仍待）

---

## B9 · 基建（勿用前端 hack 顶替）

- [ ] OSS 公网放行后真绑 `app` 桶
- [ ] staging-vault 独立进程
- [ ] Xcws 等孤儿对象删除（提权）
- [x] 边缘/ vault 429 限流复核纪要（见 SOP）
- [ ] 思源等目录字重错挂重拆包
- [x] 手改 JSON 纪律写入 SOP（仍禁替代流水线）

---

## 执行纪律

1. **一次一批**：先 B1，验收再 B2；不并行大爆炸。  
2. **lab → staging → prod**：`deploy-feicode-front.sh`；vault 走 AGit PR。  
3. **不 commit 除非用户要求**。  
4. **缓存戳**：改 JS 必 bump 相关 HTML `?v=`。  
5. **引用门禁**：任何「方便用户」的改动不得打开公共 packages。

---

## 本会话进度

| 项 | 状态 |
|---|---|
| 任务文档 | 本文 |
| B0 接线 | staging 已同步 |
| B1 | staging 已同步 |
| B2/B3 vault commits | `cc6fb7f` cert bake · `c26cec1` pages publish |
| B3 前台 | staging+prod `?v=20260926pages1` |

| B4 本仓 CTA + B7 多字体/样张/OG + B8 许可队列 | 前台 `?v=20260926og1` prod；vault PR #68 + docker 已切 |

| B6 配额只读 + B7 收藏 + B8 通知/status + B9 文档 | 前台 `?v=20260926b68n1`；vault 待切 docker |
