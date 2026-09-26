# 引用门禁 · 证书开引用 · 站内预览（2026-09-26）

> **说人话总表。** 货架可上 cite-closed 字（吉利银河美好体 / 上海摩登体）；默认**不开**对外 CSS/API 热链；用户交匹配的**字体授权证书**后，只给**该账号**开引用；站内编辑器/样张/详情预览可用本地 archive woff2。  
> **本稿性质：** 产品口径 + 链路审计。lab 已接「详情 CTA → 证书页 → 待审/通过/驳回 → 本机 grant」+ 登录门禁 + 我的证书列表；不部署、不灌 CDN。正式 vault API / SSO 仍缺。

**范例族：** `Jlyhmht` / `wenfeng-jlyhmht`（吉利银河美好体）；`Shmgt` / `wenfeng-shmgt`（上海摩登体）。

---

## 1. 产品口径（嵌入 vs 站内预览 vs 上传证书开引用）

Feng 2026-09-26 定稿（覆盖此前闸文争议点）：

| # | 口径 | 含义 |
|---|------|------|
| 1 | **货架可展示 cite-closed** | 目录可上架对照（如 Jlyhmht / Shmgt）；默认 **无** 对外 CSS / API cite |
| 2 | **证书 → 账号级开引用** | 用户上传匹配的「字体授权证书」证明 → 审核通过后，**只对该账号**解锁 cite（不是站级 CDN 全开） |
| 3 | **Windfonts CSS/API 热链 = 网页字体嵌入** | 在典型厂商证口径下（摩登汉唐证：设计商用 OK；App/网页嵌入另授），本站 `/api/css` 与 `fonts-packages` 热链视同 **网页字体嵌入**，默认不在免费范围内 |
| 4 | **站内预览可留** | 本站编辑器 / 样张 / 详情预览可用同源 archive / preview woff2（不经过对外 CDN 包） |
| 5 | **不上 fonts-packages CDN** | 在另开灌装闸之前，**禁止**把这两款（及同类 cite-closed）导出到 `fonts-packages` |

### 与旧闸文的关系

| 文档 | 当时结论 | 相对本稿 |
|------|----------|----------|
| `GATE-POLICY-2026-09-25-free-commercial-cdn.md`（box: `windfonts-research/`） | `free_commercial` 一般可 CDN；「禁 App 嵌入」不自动挡 CDN；R6 吉利/摩登须重核 | **部分 superseded**：一般品牌免费商用仍可走 CDN 候选；**吉利/摩登等「禁网页嵌入」款**按本稿 §1.3 默认 cite-closed，不因 GATE-POLICY 晚补丁自动开站级 CDN |
| `GATE-CJK-2026-09-25-github-r6-reopen-geely-modern.md` | 条件 PASS `free_commercial` 挂起；默认不开 webfont CDN | **仍有效作猎取/挂起史**；产品落地以本稿 + vault `oss_path:''` + tag `cite-closed` 为准 |
| `docs/LAUNCH-GATES.md` | 上线基建门闸（CDN/登录/rewrite） | **正交**；不替代本引用门禁 |

---

## 2. 现网 / lab 事实

| 项 | 事实（2026-09-26 CST） | 证据 |
|----|------------------------|------|
| Vault 行数 | 登记后 **559**（含两款 upsert；`oss_path` 空） | `bot/archive/fonts-citeoff-2026-09/VAULT-REGISTER-2026-09-26.md` |
| Lab 目录 | `data/fonts.json` 含两款；tag **`cite-closed`**（lab 约 460 族口径） | lab `fonts.json`；prod probe 亦见 tag |
| OSS / fonts-packages | **无** `Jlyhmht` / `Shmgt` 键 | `VERIFY-PUBLIC-404`；本审计 curl：`cn…/fonts-packages/{Jlyhmht,Shmgt}/result.css` → **404** OSS NoSuchKey |
| `/api/css` | `family=wenfeng-jlyhmht\|wenfeng-shmgt` → **404** JSON「字重 full 不存在」 | 同左；`app.windfonts.com/api/css` 同 404 |
| 前台 cite | `WFProto.citeAllowed` → `{ok:false}`；详情「引用未开放」 | `js/wf-proto.js` `citeAllowed`；`js/pages/detail.js` `mountOrRefuseEmbed` |
| 服务状态 | tag `cite-closed` → **受限** / `no_redistrib`；CTA「上传证书 →」 | `serviceStatus` + `serviceStatusAct` |
| license-evidence | 两款均录「禁止托管 / 不得 CDN 热链 / 不得·禁止嵌入…」 | `data/license-evidence.json` names「吉利银河美好体」「上海摩登体」 |
| 私有 archive | `bot/archive/fonts-citeoff-2026-09/{Jlyhmht,Shmgt}/` 完整 OTF/TTF | VAULT-REGISTER sha256 |
| 站内预览面 | `assets/fonts/preview/Jlyhmht-{Light,Regular,Bold}.woff2` + `Shmgt-Regular.woff2`；`data/preview-faces.json` | commit `eb2503e`「Use full local cite-closed preview fonts」 |
| 站内加载路径 | cite-closed **不探** CDN / packages / api；直接 `injectPreviewFace` | `wf-proto.js` `ensureFontCss` |

---

## 3. 证书链路核查表

端到端：详情「服务状态 · 受限」→ CTA「上传证书 →」→ `app/cert-upload.html?cert={slug}` →（lab）本机记权 → 详情 `citeAllowed` 对本浏览器开引用；（正式期望）登录 + vault 存证 + 审过 → **仅该账号** CSS 解锁（仍不灌公共 CDN）。

| 步骤 | 期望行为 | 现状 | 判定 |
|------|----------|------|------|
| 1. 详情展示「受限」 | `serviceStatus` = 受限（cite-closed / 禁托管） | **已实现**：`cite-closed` → `no_redistrib`；文案引导上传授权文件 | **works** |
| 2. CTA「上传证书 →」 | 链到证书上传流，带上字体 slug | **已改**：`detail.js` → `app/cert-upload.html?cert={slug}`；有 grant 时文案「证书已开 →」 | **works** |
| 3. 证书落地页 | 识别 `cert`；UI「为某族上传授权证书 → 开引用」 | **已实现**：`app/cert-upload.html` + `js/pages/app-cert-upload.js`；收 PDF/图；说明仅账号开引用≠CDN；成功态回详情 | **works**（lab） |
| 4. 登录门禁 | 须登录账号才能**提交** | **lab**：匿名可浏览证书页；提交前须 `WFChrome.user`（去登录 / lab 演示登录）。真 SSO 仍依赖 vault NextAuth | **partial**（lab 门禁已接；顾客 SSO 仍待） |
| 5. 证书存储 + 审核态 | 服务端按 **userId × fontId** 存证；pending / approved / rejected | **lab mock**：`wf-cert-grants-v1`；提交 → **pending**；页内「模拟审核通过/驳回」；驳回含 reason + 可再传；**无** vault API；文件不上传 | **mock**（状态机前台齐） |
| 6. 审核通过后翻 cite | 仅该账号看到 embed；**不**改全局 tag、**不**灌 CDN | **lab**：仅 `approved`/`approved-lab` 时 `hasCertGrant` → `citeAllowed` cert-grant-lab；pending/驳回详情横幅说人话；CTA：上传证书 / 审核中 / 查看证书 / 重新上传；`app/certs.html` 列表 | **works**（前台 mock）；账号级 CSS 签发仍 **missing** |
| 7. 对外 CDN 仍关 | 未灌包前全站 `/api/css` / packages 继续 404 | **已落实**（oss_path 空；grant **不**写 packages） | **works**（门禁侧） |
| 8. 站内预览 | 详情 / 样张 / 字符表 / 编辑器预览用同源 woff2 | **已落实**：`preview-faces.json` + `ensureFontCss` 走 preview | **works** |

### 交互关系（编码事实）

```
tags: cite-closed
    ├─ serviceStatus → 受限 / no_redistrib → CTA「上传证书 →」
    ├─ citeAllowed   → ok:false / cite-closed|no_redistrib|no_embed
    │                    └─ detail「使用」拒挂 WFEmbed（引用未开放）
    ├─ ensureFontCss → 跳过 CDN/api，injectPreviewFace（站内预览）
    └─ license-evidence restrictions（禁托管/CDN/嵌入）
         └─ citeAllowed regex 亦可独立判 no_embed

上传证书 CTA ──▶ app/cert-upload.html?cert=
                 ├─ lab：须登录（或演示登录）才能提交
                 │         └─ localStorage grant（user × font）
                 │              status: pending →（模拟审）approved | rejected
                 │              approved → citeAllowed cert-grant-lab（详情开 embed UI）
                 │              pending/rejected → 详情横幅 + CTA 文案适配
                 ├─ lab：app/certs.html 我的证书列表
                 └─ 正式（仍缺）：vault POST font-certs → 审过 → 账号作用域 CSS
自有字体 upload.html ──▶ 项目私有托管（与货架 cite 解锁无关；勿混用）
```

---

## 4. 相关文档索引

旧文件**不删**；本稿为 2026-09-26 产品口径 + 链路审计的 consolidated 入口。

### Lab `docs/`

| 路径 | 一句话 |
|------|--------|
| **[CITE-CERT-GATE-2026-09-26.md](./CITE-CERT-GATE-2026-09-26.md)**（本文件） | 产品口径 + 现网事实 + 证书链路核查 + 缺口 |
| [_citeoff-jly-shmgt-vault-2026-09-26.md](./_citeoff-jly-shmgt-vault-2026-09-26.md) | vault register 要点、官方取包步骤、探活 URL；**细节真源见 archive VAULT-REGISTER** |
| [_vendor-tc-candidates-2026-09-26.md](./_vendor-tc-candidates-2026-09-26.md) | TC 厂商候选；§另闸：吉利/摩登 shelf NO cite（部分「未 vault」句已过时 → 见 VAULT-REGISTER） |
| [_gate-tc-vendor-candidates-2026-09-26.md](./_gate-tc-vendor-candidates-2026-09-26.md) | 指针 → `_vendor-tc-candidates-…` |
| [LAUNCH-GATES.md](./LAUNCH-GATES.md) | 上线基建门闸（与引用门禁正交） |
| [HANDOFF.md](./HANDOFF.md) §40 | 吉利/摩登对照 + 不开 CDN 一句话 |
| [DOMAIN-ARCHITECTURE.md](./DOMAIN-ARCHITECTURE.md) | 嵌入硬约束：对外只写地区 CDN `/api/css`；预览可用 packages |
| [LICENSE.md](./LICENSE.md) | 许可摘录（含「嵌入网站不在范围内」类先例） |
| [CONSOLE.md](./CONSOLE.md) | 控制台 IA（项目嵌入；非证书解锁） |

### Bot archive `fonts-citeoff-2026-09/`

| 路径 | 一句话 |
|------|--------|
| `README.md` | 归档目的：完整官方包；禁 fonts-packages |
| `VAULT-REGISTER-2026-09-26.md` | vault id / oss_path 空 / 559 / sha256 / 备份路径 |
| `VERIFY-PUBLIC-404-2026-09-26.md` | 公开 CDN/API 404 清单 PASS |
| `DL-AGENT-REPORT-2026-09-26.md` | 下载代理取包报告 |
| `STATUS-from-dl-agent-2026-09-26.md` | 早期「lab 仅有试看面、须 Feng 取完整包」状态（后续已齐包） |
| `MANIFEST-2026-09-26.json` | 归档清单 |
| `Jlyhmht/SOURCE.md` · `Shmgt/SOURCE.md` | 各源说明 |

### Vault

| 路径 | 一句话 |
|------|--------|
| `fonts-vault/scripts/register-jly-shmgt.js` | cite-closed 登记脚本；`CITEOFF_CONFIRM=1`；红线 oss_path 空、不上 CDN |

### Research / 闸文（box `windfonts-research/`；未必在 lab git）

| 路径 | 一句话 |
|------|--------|
| `GATE-POLICY-2026-09-25-free-commercial-cdn.md` | free_commercial 可 CDN 纠偏；晚补丁「禁 App 嵌入不自动挡 CDN」——**吉利/摩登网页嵌入另见本稿覆盖** |
| `GATE-CJK-2026-09-25-github-r6-reopen-geely-modern.md` | R6 重开：挂起 free_commercial；默认不开 webfont CDN |
| `ops-citeoff-jly-shmgt-lab-probe-2026-09-26.md` | Lab 详情 cite-off + CDN 404 GREEN |
| `ops-citeoff-prod-probe-2026-09-26.md` | Prod `/fonts/jlyhmht|shmgt` cite-off UI GREEN |

### 代码锚点（lab）

| 路径 | 作用 |
|------|------|
| `js/wf-proto.js` | `citeAllowed` / `serviceStatus` / `citeClosedFamily` / `ensureFontCss` → preview |
| `js/pages/detail.js` | 服务状态文案 +「上传证书 →」+ 拒挂 embed |
| `js/wf-specimen.js` | cite-closed 跳过 CDN unicode-range 探针 |
| `app/cert-upload.html` · `js/pages/app-cert-upload.js` | **证书开引用**页（`?cert=`）；pending/approved/rejected + 登录门禁 + lab 模拟审核 |
| `app/certs.html` · `js/pages/app-certs.js` | **我的证书**列表（当前身份跨字体） |
| `app/upload.html` | **自有字体**上传（非证书开引用；勿混用） |
| `data/preview-faces.json` | 站内预览面映射 |
| `data/license-evidence.json` | 禁托管/嵌入原文摘要 |
| `css/detail.css` · `detail-cite-status-options.*` | 「引用未开放」样式 / 对照稿 |

---

## 5. 建议下一步（lab 前台已通；后端仍缺）

**已完成（lab · 2026-09-26）**

1. CTA → `app/cert-upload.html?cert=`；专用证书页（PDF/图）；本机 grant；`citeAllowed` 覆盖；详情开引用条。  
2. 详情「引用未开放」文案含证书入口与「仅账号 / 非 CDN」口径。  
3. **Grant 状态机**：提交 → 待审核（pending）；lab「模拟审核通过/驳回」；驳回展示原因 + 重新上传；仅 approved 开引用。  
4. **登录门禁（lab）**：匿名可看不可交；去登录 / lab 演示登录（`wf-app-user`）。  
5. **详情同步**：横幅区分无证 / 审核中 / 已驳回 / 已通过；CTA 文案适配。  
6. **我的证书**：`app/certs.html` 按当前身份列跨字体 grants。

**仍缺 / 仍 mock（明确不做本波）**

- 真 vault 存证 API、审核后台、账号级 CSS 签发、生产 SSO。  
- 不上 `fonts-packages` CDN。

**P1 — 正式证书 → 账号级开引用（后端）**

7. vault API：`POST /api/user/font-certs`（存证）+ 审核态 + `GET` 当前用户已解锁族列表；替换 localStorage mock。  
8. 前台 `citeAllowed` 改读会话 grants（SSO userId）；保留 tag `cite-closed`。  
9. 签发**用户作用域** CSS（仍**不**写公共 `fonts-packages`）。  
10. 审核后台（人工或规则）：校验证书是否覆盖「网页字体嵌入 / webfont」。  
11. 证书页生产环境改强登录（`WFApp.gate` / NextAuth）；去掉 lab 演示登录。

**P2 — 预览与目录**

7. 保持 preview woff2 与 archive 同步策略（已用较完整 woff2；全字 OT 预览另议）。  
8. 刷新 `_vendor-tc-candidates` §另闸「未 vault register」过时句 → 指向 VAULT-REGISTER / 本稿。  
9. 生产目录与 lab 对齐策略：已有 prod probe 见两款 + cite-closed；后续变更仍禁灌包。

**明确不做（除非 Feng 另发闸）**

- 上传/导出 `fonts-packages/{Jlyhmht,Shmgt}`  
- 去掉 `cite-closed` 或站级 `citeAllowed=true`  
- 把自有字体 `upload.html` 冒充证书解锁（已用独立 `cert-upload.html`）

---

## 6. 审计元数据

| 项 | 值 |
|----|-----|
| 审计日 | 2026-09-26（Asia/Shanghai） |
| 执行 | Foundry executor · Mac lab `fc585146-…` |
| 范围 | lab 前台证书页 + grant mock；本地 commit；无 CDN / 无 prod deploy |
| 预览 commit（已有） | `eb2503e` Use full local cite-closed preview fonts |
| 证书页实现 | `app/cert-upload.html` + `app/certs.html` + grant 状态机（pending/approved/rejected） |
| 公开 cite / CDN | 仍关闭；grant **不**灌 packages |
