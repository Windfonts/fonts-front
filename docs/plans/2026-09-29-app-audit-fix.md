# app.windfonts.com 审计修复计划

> **For agentic workers:** P0 静态前台 + P1 `windfonts_app` 边缘 + P2 拆包 + P3 vault 已做（2026-09-29，Grok `01a0eb5b`）。下一手 P4 真登录，另开会话。不要合 `v4-specimen`。不要手改 `fonts.json` 去「对目录」。不要公开 `GET /api/css?text=`。

**Goal:** 按 2026-09-29 公网实测，把店面能修的断链和扇出错先修掉，其余按仓拆开排期。

**Architecture:** 访客 HTML/JS/CSS 在 OSS `wenfeng-web-hz` + 边缘 `windfonts_app`。样张包在 `cn.windfonts.com` / 桶 `wenfeng-fonts`。目录与鉴权在 vault（`vault.windfonts.com`）。前台热路径读 `data/fonts-list.json`，不读 vault 列表。

**Tech Stack:** 静态 HTML + `js/wf-*.js`；发版 `scripts/deploy-web-hz.sh`；边缘 ansible `windfonts_app`；vault Next `/api/*`。

**对照实测（不要当旧记忆用）：** 首页 142 请求 / LCP 432ms（缓存重载）；`/fonts` 107；`/fonts/ibmps` 325。vault `total` 625（published 523）；店面 list 574 → 折叠 524。`/app/` 登录路径已修。`text=` 公网已 400。analysis metadata `20260929p3`。

---

## 文件（本轮 P0）

| 文件 | 职责 |
|------|------|
| `js/wf-chrome.js` | `href()`：只给控制台 `*.html` 加 `app/` 前缀；站点页（login/index/fonts…）不加 |
| `js/wf-proto.js` | `livePagePath('index.html')` → 站点根；`getBySlug` 认中文名；preview-shop 不打 `/api/css`；Normal↔Regular 回退 |
| `js/wf-app.js` | 未登录跳 `/login`，不跳 `/app/login` |
| `js/pages/detail.js` | 中文路径先按字体名解析；解析失败不 `replaceState` 成 `f…`；若是厂商名给厂商页入口 |
| `robots.txt` | 允许店面；挡住 lab / oss-audit / 作者用 `fonts.json` |
| 公网 HTML 的 `?v=` | proto `g15`、chrome `ui12`、app `ui2` |

P1 ansible 真源在 devops `roles/openresty-edge-cache`（`html_not_found` / HSTS / CSP / `loc.return`）。窄铺开用 `playbooks/p1-windfonts-app-vhost.yml`，不要默认跑全 role `cdn-edge-vhost.yml`。

---

## 分批

| 批 | 谁做 | 何时 |
|----|------|------|
| **P0** 断链与错误扇出 | fonts-front 本会话 | 现在 |
| **P1** 边缘 404 / 缓存头 / HSTS / CSP | devops + `windfonts_app` | 2026-09-29 已铺 10 边 |
| **P2** preview-shop 缺字重、Hckht UI full 切片 | fonts-packages 拆包上传 | 2026-09-29 已切 Ibmps 五档 + Syhtsc/Misa Normal |
| **P3** `text=` 关掉、analysis、vault↔list | fonts-vault | 2026-09-29 已做，见 HANDOFF §40 |
| **P4** 真登录 / 项目 / 用量 / 认领 | vault + 控制台 | 产品排期，不挡 P0 发版 |

**本会话不做：** CATALOG-COPY 全量、filePending 入库、合 lab、改生产 DNS、改 `fonts.json` 去对 625。

---

### Task 1: 词标与登录 URL

**Files:**
- Modify: `js/wf-chrome.js` `href`（约 20–32 行）、`js/wf-proto.js` `livePagePath`（约 531–538 行）、`js/wf-app.js` `loginUrl`（约 817 行）

- [x] **Step 1:** `href()` 只在「当前在 `/app/`，且 path 是相对 `*.html`，且不是站点页」时加 `app/` 前缀。站点页：`index` `login` `fonts` `font-detail` `foundry` `docs` `about` `shopping-bag` `bag` `claim` `features` `lineage` `faq` `license` `license-query` `pricing` `404` `privacy` `terms` `disclaimer` `trademark` `upload-terms`。`assets/` 不加前缀。

```javascript
var SITE_HTML = /^(index|login|fonts|font-detail|foundry|docs|about|shopping-bag|bag|claim|features|lineage|faq|license|license-query|pricing|404|privacy|terms|disclaimer|trademark|upload-terms)\.html(\?|#|$)/i;
function href(path) {
  path = String(path == null ? '' : path);
  var pathname = String((typeof location !== 'undefined' && location.pathname) || '');
  var rel = path.replace(/^\.\//, '');
  if (/^\/app(\/|$)/.test(pathname) &&
      /\.html(\?|#|$)/i.test(rel) &&
      !SITE_HTML.test(rel) &&
      !/^(https?:|\/\/|\/|#|app\/|\.\.\/)/i.test(path)) {
    path = 'app/' + rel;
  }
  /* 其余保持 livePagePath / ROOT 原逻辑 */
}
```

- [x] **Step 2:** `livePagePath` 把 `index.html` / `index` 收成站点根（空 stem），这样 `href('index.html')` = `ROOT` = `https://app.windfonts.com/`。

- [x] **Step 3:** `wf-app.js` 的 `loginUrl` 改 `WFChrome.href('login.html?next=app&back=' + …)` 在 Step 1 之后已正确；仍写相对 `login.html` 即可，不要写成 `app/login.html`。

- [x] **Step 4:** 本机打开 `/app/` 应 302/replace 到 `/login?next=app&back=`（或 `/login.html?…` 在 16016）。不得请求 `app/login.html`。

---

### Task 2: `/fonts/{中文}` 不再变成 `f…`

**Files:**
- Modify: `js/wf-proto.js` `getBySlug`（约 468–477 行）
- Modify: `js/pages/detail.js` `slugFromPath`（约 1289–1298 行）

- [x] **Step 1:** `getBySlug` 除 `normalized` / `family` 外，匹配 `name`、`en`（trim + 不分大小写）。`霞鹜文楷` → 那一款。`华为` 不是字体名，仍找不到。

- [x] **Step 2:** `slugFromPath`：先 `getFontBySlug(raw)`；命中则 `replaceState` 到 `fontSlug(font)`（如 `/fonts/xwwk`）。ASCII 未命中再走 `fontUrlSlug`（别名）。**非 ASCII 且未命中：不要 `slugify` 成 `f2fj3ld`。**

- [x] **Step 3:** 找不到时若 `foundryUrlSlug(raw)` 能对上 `getFoundries()` 的 `id`（例如 `华为` → `huawei`），状态块加「去华为厂商页」链到 `/foundry/huawei`，另保留回字体库。

- [x] **Step 4:** 本机 `/fonts/霞鹜文楷` → `/fonts/xwwk` 出文楷。`/fonts/华为` 地址可仍带中文或保持原样，文案「找不到」，有厂商入口。`/fonts/harmony` 仍是 HarmonyOS Sans。

---

### Task 3: preview-shop 少打 404/400

**Files:**
- Modify: `js/wf-proto.js` `ensureFontCss` / `fetchPkg`（约 1128–1132 行）

- [x] **Step 1:** `subset` 以 `preview-` 开头时：**只**拉 `fonts-packages/.../preview-shop/result.css`，不要再 `fetch` `cn.windfonts.com/api/css?...subset=preview-shop`（现网 400，且无 CORS）。

- [x] **Step 2:** preview 包 404 且字重文件夹是 `Normal`/`normal` 时，再试 `Regular`/`regular`（思源黑体、小米兰亭）。**不要**把 Thin 回退成 Regular（字重会假）。

- [x] **Step 3:** preview 仍失败，走现有外层 `zh` → `full`。控制台不应再出现 preview-shop 的 400/CORS。

---

### Task 4: robots.txt + 戳

- [x] **Step 1:** 仓库根 `robots.txt`：`Allow: /`；`Disallow: /lab.html` `/oss-audit.html` `/data/fonts.json`。不写 sitemap（P1 再做）。

- [x] **Step 2:** 公网壳 `wf-proto.js?v=` → `20260929g15`；`wf-chrome.js?v=` → `20260929ui12`；改过的 `wf-app.js?v=` → `20260929ui2`。不要改 `*-options.html` / `v5-*` / `lab.html` / `oss-audit.html`。

- [x] **Step 3:** `python3 scripts/preview-local.py` 已在 16016 则硬刷新验收 Task 1–3。不要把 lab 树当公网。

---

### Task 5: 发版（P0 验过之后） [x] 2026-09-29 `deploy-web-hz.sh` → oss://wenfeng-web-hz（846 files）

```bash
bash scripts/deploy-web-hz.sh --dry-run
# Mac 无 wenpai 钥匙：脚本会 scp 到 devops 再 oss cp 杭州桶
```

验收：

```bash
curl -sSI https://app.windfonts.com/ | grep -i x-cache
# 词标 href 为 https://app.windfonts.com/ 或 /
# /app/ 最终落到 /login，不是 OSS NoSuchKey
# 首页网络里不再有 subset=preview-shop 的 400
```

清缓存：HTML key 无 `:g1`；JS key 带 `?v=` 和 `:g1`。漏清会看起来像没发。

---

### Task 6: P1 边缘（2026-09-29 已做，10 边 reload）

1. [x] `error_page 404 /404.html`（未知路径不要 OSS XML）。`/app/login` rewrite 到 `/login`。
2. [x] HTML `max-age=60`；`?v=` JS/CSS/woff2/ico `max-age=604800`。
3. [x] HSTS `max-age=31536000`（不要 `includeSubDomains`）；CSP 允许 `cn|hk|en.windfonts.com`、`vault.windfonts.com`、`cravatar.com`。
4. [x] `favicon.ico` 已进杭州桶（15086 bytes）。
5. [x] `lab.html` / `oss-audit.html` 边缘 `return 410`（仍不进 `deploy-web-hz.sh`）。
6. [x] `robots.txt` 随 P0 上传。

真源：devops `roles/openresty-edge-cache` `windfonts_app`。人已授权改边缘。铺开用 `playbooks/p1-windfonts-app-vhost.yml`，不要默认全 role `cdn-edge-vhost.yml`。探针 `curl --noproxy '*' --resolve app.windfonts.com:443:EDGE_IP`。实录 `docs/HANDOFF.md` §38。

---

### Task 7: P2 拆包

- [x] **1. 思源黑体 / 小米兰亭 Normal preview-shop。** 现网 `Syhtsc`/`Misa` 的 `Normal` 与 `Regular` **都是独立 full/zh**（CSS 体积不同，Adobe Normal=350 / Regular=400）。不要把 Regular 目录拷成 Normal。缺的是 `preview-shop`。已切并上传 `Syhtsc/Normal`、`Misa/Normal`。P0 `Normal↔Regular` 回退仍留着给只有一档的家族。不要手改 `fonts.json`。
- [x] **2. ibmps 缺字重。** 目录 `weights` 是 `Extralight`（不是 `ExtraLight`）。OSS `full` 已有 Thin/Extralight/Light/Text/Bold/Regular；`preview-shop` 原先只有 Regular。`--all-catalog` 只 `pick_weight` 一档所以漏了。已按 SOP 切五档上传，未公开 `text=`。`ExtraLight`（大写 L）仍 404，与桶名一致。
- [x] **3. Hckht UI。** `css/fonts.css` 只钉词标「文风字体」四码（U+6587 / U+98CE / U+4F53 / U+5B57），四片 `Medium/full/{16,18,15,19}.woff2` 合计约 66KB。本轮不改 `fonts.css`。以后若要四字专用包须另给两套对照。

---

### Task 8: P3 vault [x] 2026-09-29 Grok `01a0eb5b`，HANDOFF §40

1. [x] **关掉**匿名 `GET /api/css?text=`。源站 nginx `location = /api/css`（vault + app vhost）；公网 app/vault/cn 400 JSON。具名 `subset=zh-common|zh|full|en` 仍 200。Next 门在 `feat/p3-css-text-gate`，镜像未含，`:4000` 直打仍 200。项目 `/p/?t=` 未动。
2. [x] analysis：OSS 对象被 2 款 stub 覆盖，不是缺 Ibmps。已从 CSS unicode-range 重建 546 款并上传；容器 env `OSS_METADATA_VERSION=20260929p3`。`/api/fonts/Ibmps/analysis` 200。
3. [x] vault 625 = 523 published + 87 offline + 15 archived。导出已过滤 published。店面 574 与 523 的差是 family 键漂移 + 店面仍列库无/offline 行，不手改 `fonts.json`。
4. [x] `/v1/fonts` 现网 404；HANDOFF 表头标未上线。
5. [x] `hk`/`en` 从 feicode-prod 打 named subset 200。Mac→hk 超时单独看边/Clash。未改 DNS。

---

### Task 9: P4 控制台（不挡店面）

1. NextAuth 现网 session `null`，providers 只有 credentials。`/login` 邮箱密码页在；进 `/app/` 须落到它。
2. `GET /api/projects|domains|uploads|usage|picks|team` 401 `missing_api_key` — 登录后要带 key/cookie。
3. 统计仍是目录/localStorage。LAUNCH-GATES「服务端计数」未做。
4. `claim-status.bySlug` 空。认领工单未接。
5. `/p/demo/index.css` 只在 vault 200，app 404 — 文档/复制代码不要写 app 域这条。
6. 生产继续禁止 `?demo=1`。

---

## 验收对照（P0）

| 项 | 过关 |
|----|------|
| 词标 | `href` 为 `/` 或 `https://app.windfonts.com/` |
| `/app/` 未登录 | 到 `/login?next=app…`，无 `NoSuchKey` |
| `/fonts/华为` | 不是 `/fonts/f2fj3ld`；有回库或厂商入口 |
| 首页控制台 | 无 `subset=preview-shop` 的 400/CORS |
| 公网戳 | proto g15 / chrome ui12 |

## 不做

- 合 `fonts-front-v4-lab` / `v4-specimen`
- 公开即时 `text=` 切字
- leftover YAML / 桶 GC
- 本轮改生产 DNS、防火墙、vault 镜像
