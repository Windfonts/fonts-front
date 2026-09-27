# Slide Font / 幻灯片字体 上游入库交接（2026-09-27）

Foundry 轨 **C1**。为寒蝉春秋·春风（Hccqcf）/ 秋鸿（Hccqqh）钉官方上游。**CDN STOPPED**；不跑 vault docker / 不 bump analysis。

## 官方源与钉死

| 项 | 值 |
|---|---|
| 官方仓 | https://github.com/maoken-fonts/slidefont |
| 核实 | GitHub `license.spdx_id=OFL-1.1`；README 称「演示字体 SlideFont」；OFL.txt 版权行 The SlideFont Project Authors |
| 非官方 | `keynoteart` / `keynote` 仅为 foundry 别名，**无**独立 GitHub 仓 |
| 旧 packages 源 | FWHP-Enfun/Slide-Font（与官方 **字节不一致**）— 本波已用官方 pin 覆盖 `fonts-packages/fonts/{Sl*}/Regular.ttf` |
| pin SHA | `e6a0d2bcef0501849178b8c55047d80e26c6fedb` |
| pin 时间 | 2023-08-02 23:29:00 CST · `Fix name typo`（仓仅 2 commits，此为 tip） |
| 许可 | **SIL OFL 1.1**（`OFL.txt` / `OFL_ZHS.txt`） |
| tarball sha256 | `3c5b0aaf2193ac704ad73e0e11030e2967948aaca76deb8212483ba70dfd0dfd` |

## 五面（官方仓 `fonts/`）

| 目录名 | norm | family | role | glyphs | sha256 前缀 |
|---|---|---|---|---|---|
| 演示春风楷 | Slcf | wenfeng-slcf | required-hccq | 6980 | `0c2c7998ca39` |
| 演示秋鸿楷 | Slqh | wenfeng-slqh | required-hccq | 6971 | `d74ea3a8872e` |
| 演示佛系体 | Slfu | wenfeng-slfu | series | 6954 | `b8c59c7cddb8` |
| 演示夏行楷 | Slxx | wenfeng-slxx | series | 6972 | `fac1f0ec044b` |
| 演示悠然小楷 | Slyr | wenfeng-slyr | series | 6956 | `10a92c32d388` |

跳过：`演示悠然小楷二`（Sly1，不在官方五面）· `演示斜黑体`（Ysxh，思源斜体 fork）。

## 血缘修复（C → A）

原先 `upstreamName = "Slide Font / 幻灯片字体"` 无法 `findFontByName`（C_missing）。

| fork | 新 upstreamName（精确目录名） | upstreamOwnerId |
|---|---|---|
| 寒蝉春秋·春风 | **演示春风楷** | keynote |
| 寒蝉春秋·秋鸿 | **演示秋鸿楷** | keynote |

- 新组 `slide-font`（Slide Font / 演示字体）；五款 original 挂入。
- `chill-chunqiu.upstreamName` 清空（面级 byName 已够）。
- `UPSTREAM_FONT` 仍加伞名别名 → `演示春风楷`（兜底旧串 / 组级残留）。

## Staging / park

- lab：`staging/slidefont-2026-09-27/{face}/{TTF,OFL.txt}` + `pack-meta.json`
- park：`/Users/feibisi-studio/Projects/_fonts_park/slidefont-2026-09-27/`（`dl/` + `extract/slidefont@pin`）
- 机器 JSON：`docs/_oss-ingest-slidefont-2026-09-27.json`
- packages：`fonts-packages/fonts/{Slcf,Slqh,Slfu,Slxx,Slyr}/Regular.ttf`（已覆盖为官方）
- licenses：`font-licenses/licenses/{Norm}/LICENSE` ← OFL.txt（spdx OFL-1.1）

## 本轮已改（lab）

- `data/fonts.json` — 刷新五款 pin / OFL URL / glyphCount
- `data/foundries.json` — keynote / keynoteart
- `data/font-lineage.json` — slide-font 组；春风/秋鸿 face-level upstream（**未动** B 的 WQY/Droid/脆弱 A 行）
- `js/wf-chrome.js` — UPSTREAM_FONT 伞名别名
- `docs/plans/2026-09-27-slidefont-upstream-ingest.md`（本文）
- `docs/_oss-ingest-slidefont-2026-09-27.json`
- `staging/slidefont-2026-09-27/**`
- `fonts-vault/scripts/register-slidefont-upstream.js`（起草，**未跑**）

## Bot 清单（按序）

1. 复核 OFL 闸门与 pin SHA。
2. vault 登记 — `docker exec fonts-vault node /app/register-slidefont-upstream.js`（先备份 prod.db）。本波 Foundry **不 exec**。
3. packages 切包 — 源已在 `fonts-packages/fonts/{Norm}/Regular.ttf`；`SUBSET_ONLY` 按现网；**禁止** `upload.js` / CDN。
4. font-licenses — 已抄 OFL；确认 feicode `licenseFileUrl`。
5. **CDN 闸门** — 等 Bot/Feng；本轮 **STOPPED**。
6. 勿递增 `ANALYSIS_META_VER` / 与并行波打架。

## 不要做

- 不要上传 OSS / CDN / 生产。
- 不要 docker exec vault register。
- 不要动 Sly1 / Ysxh。
- 不要跟浮动 `main` 重下（必须钉 `e6a0d2bcef05`）。
- 不要 clobber B tip `84fb75e` 的 WQY/Droid / 脆弱 A 精确化。
