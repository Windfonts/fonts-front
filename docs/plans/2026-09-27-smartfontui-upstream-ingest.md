# 03スマートフォントUI 上游入库交接（2026-09-27）

Foundry 轨 **C4**。为霞鹜尚智黑（wenfeng-xwszh / Xwszh）钉官方上游 **03スマートフォントUI**。**CDN STOPPED**；不跑 vault docker / 不 bump analysis。

## 许可证核实（重要）

| 字体 | 许可 | 说明 |
|---|---|---|
| 03スマートフォントUI | **IPA Font License 1.0**（**非 OFL**）+ FLOP 附加条款 | 基于 IPAexゴシック；FLOP DESIGN 假名版权 + webfont/APP 嵌入限制 |

### FLOP DESIGN 附加要点（给 Bot / vault）

1. **印刷 / 数字内容**：商用·非商用均可（须遵 IPA）。
2. **改变再分发 / 程序嵌入 / 在线服务器 / webfont**：受 IPA Art.3 约束；FLOP 进一步声明 **APP·游戏内置、程序嵌入、webfont 上传服务器不可**，须联系或购买[日文 Webfont 套件](https://flopdesign.shop/)。
3. **假名设计版权**归 FLOP：禁止嵌入有偿公开·销售·再分发·可提取程序。
4. vault `license_name` 请用 **`IPA Font License`**（SPDX `IPA-1.0`）；**勿标 OFL**。
5. 本波 **无** 可钉 TTF/OTF → **lineage-stub only**；**不** docker exec register 写产库字体面（脚本仅起草占位）。

### 钉源探测证据（2026-09-27 CST）

| 源 | 结果 |
|---|---|
| https://www.flopdesign.com/freefont/smartfont.html | **HTTP 403**（XSERVER Forbidden） |
| https://flopdesign.booth.pm/items/2296502 | 页 200；`SmartFontUI.zip` 免费下载 **需登录**；本机无会话 curl 得 HTML |
| kobake/metro-css-card `smart-font-ui/` | 仅有未支持变体 `smart-font-ui-p.ttf`（ReadMe 称 03SmartFont-P サポート外）+ 随附旧版 `ipaexg.ttf`；**不可作主面 pin** |
| LXGW FasmartGothic README | 确认上游名与 IPA + FLOP 条款；脚注官网已 403 |

→ **BLOCKED_BINARY_PIN**。按 HANDOFF 既有占位政策：`version=lineage-stub`、`charCount=0`。

## 钉死（目录占位）

| 项 | 值 |
|---|---|
| 官方（历史） | https://www.flopdesign.com/freefont/smartfont.html |
| 现行分发 | https://flopdesign.booth.pm/items/2296502 |
| 档案 | SmartFontUI.zip（**未取得**） |
| 档案 / 字体 sha256 | **—（blocker）** |
| Norm | `SmartFontUI` |
| family | `wenfeng-smartfontui` |
| 目录名 | **03スマートフォントUI** |
| version | `lineage-stub` |

## 血缘修复（C → A）

| fork | upstreamName | 备注 |
|---|---|---|
| 霞鹜尚智黑 | **03スマートフォントUI** | 目录现已有 stub；`upstreamOwnerId` fontworks→**flopdesign** |

- 新 `byName` original：`03スマートフォントUI`（group `smart-font-ui`）
- group `smart-font-ui.upstreamName` 清空（自身即根）
- `UPSTREAM_FONT` 补：`Smart Font UI` / `SmartFontUI` / `03SmartFontUI` / `スマートフォントUI` / `03スマートフォント UI`
- foundries 新：`flopdesign`

## Staging / park / packages

- park：`/Users/feibisi-studio/Projects/_fonts_park/smartfontui-2026-09-27`（NOTES only）
- lab staging：`staging/smartfontui-2026-09-27/`（`pack-meta.json` + `BLOCKER.txt`）
- packages：**无** `fonts-packages/fonts/SmartFontUI/Regular.*`（blocker）
- licenses：`font-licenses/licenses/SmartFontUI/{LICENSE,license-info.json,FLOP-README-NOTES.txt}`（IPA 全文抄自同文 IPA 包）
- 机器 JSON：`docs/_oss-ingest-smartfontui-2026-09-27.json`
- register 起草：`fonts-vault/scripts/register-smartfontui-upstream.js`（**未跑**；脚本拒绝无 CONFIRM；且无 oss 字形）

## Bot 清单

1. 复核 FLOP webfont/嵌入闸门 — **CDN / webfont 上传对本上游禁止**（即使日后钉到 zip）。
2. 若取得 BOOTH `SmartFontUI.zip`：核 ReadMe + IPA 全文 + otf sha256，再升 stub→正式 pin；换 `version` / charCount；**仍禁止** upload.js。
3. vault 登记 — `CONFIRM_SMARTFONTUI_REGISTER=1 docker exec fonts-vault node /app/register-smartfontui-upstream.js`（先备份 prod.db）。本波 Foundry **不 exec**；无包时 register 应 no-op 或仅写元数据。
4. **CDN 闸门** — STOPPED。勿 bump `ANALYSIS_META_VER`。
5. 下游霞鹜尚智黑目录现标 OFL — 与 LXGW README（IPA）可能不一致；**本波不改下游许可文案**（另开闸）。

## 不要做

- 不要上传 OSS / CDN / 生产 webfont。
- 不要把许可标成 OFL。
- 不要 docker exec vault register。
- 不要用 03SmartFont-P / kobake 旁路当主面 pin。
- 不要 clobber IPAmj（`7d010f5`）或并行脏工作区 `app/*`。
