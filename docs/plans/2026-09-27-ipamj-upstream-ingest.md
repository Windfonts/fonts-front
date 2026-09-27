# IPAmj明朝 上游入库交接（2026-09-27）

Foundry 轨 **C3**。为华英明朝（wenfeng-hymc / Hymc）钉官方上游 **IPAmj明朝**。**CDN STOPPED**；不跑 vault docker / 不 bump analysis。

## 许可证核实（重要）

| 字体 | 许可 | 说明 |
|---|---|---|
| IPAmj明朝 | **IPA Font License 1.0** | moji.or.jp Mojikiban 官方；随包 `IPA_Font_License_Agreement_v1.0.txt` |

`LICENSE` sha256：`4c84dd528ec3044638ec346fc1ee27cd1eb95dfc04cbc6a881b3ca7a7f517e54`（与 C2 IPA/Kokoro 全文相同）。

### IPA 再分发要点（给 Bot / vault）

1. **原文再分发**（Art.3 §2）：不得改名、不得改文件、必须附带本许可全文。本波 packages 中的 `Regular.ttf` 即官方原文 `ipamjm.ttf`。
2. **衍生字体再分发**（Art.3 §1）：须提供 replace-back 到原始授权字体的方法；衍生字体名/文件名**不得含「IPA」**；须同许可传染。IPA 与 OFL **互不兼容**。华英明朝已更名，仍须满足 replace-back。
3. vault `license_name` 请用 **`IPA Font License`**（或 SPDX `IPA-1.0`）；勿标 OFL。
4. 本波 **不** docker exec register；脚本仅起草。

## 钉死

| 项 | 值 |
|---|---|
| 官方页 | https://moji.or.jp/mojikiban/font/ |
| 下载镜像 | 窓の杜 dforest `ipamjm00601.zip`（官方页指引） |
| URL | https://dforest.watch.impress.co.jp/library/i/ipamjfont/10750/ipamjm00601.zip |
| 档案 sha256 | `35494e0f2896f38b3f7369a8421a895cea6440a42c0a66ac95eab47d6ed25b68` |
| 版本 | Ver.006.01（2019-05） |
| 字体文件 | `ipamjm.ttf` |
| 字体 sha256 | `a3e84f495f3c388db7a1473bf1985c1c076d0c814100f10a027ca6853eb1e8cb` |
| 字体 MD5（官方公布） | `beee256d4ffec4c40493805a4d7e5cdd` |
| glyphs / chars | 61360 / 54581 |
| Norm | `IPAmjMincho` |
| family | `wenfeng-ipamjmincho` |
| 目录名 | **IPAmj明朝** |

## 血缘修复（C → A）

| fork | upstreamName | 备注 |
|---|---|---|
| 华英明朝 | **IPAmj明朝** | 原已写；本波目录入库后可 resolve |

- 新 `byName` original：`IPAmj明朝`（group `ipamj-mincho`）
- `UPSTREAM_FONT` 补：`IPAmjMincho` / `IPAmj Mincho` / `IPAmj明朝フォント`

## Staging / park / packages

- park：`/Users/feibisi-studio/Projects/_fonts_park/ipamj-2026-09-27`
- lab staging：`/Users/feibisi-studio/Projects/fonts-front-v4-lab/staging/ipamj-2026-09-27`
- packages：`fonts-packages/fonts/IPAmjMincho/Regular.ttf`
- licenses：`font-licenses/licenses/IPAmjMincho/LICENSE` + `license-info.json`（spdx IPA-1.0）
- 机器 JSON：`docs/_oss-ingest-ipamj-2026-09-27.json`
- register 起草：`fonts-vault/scripts/register-ipamj-upstream.js`（**未跑**）

## Bot 清单

1. 复核 IPA 闸门与 archive/file sha256（及官方 MD5）。
2. vault 登记 — `CONFIRM_IPAMJ_REGISTER=1 docker exec fonts-vault node /app/register-ipamj-upstream.js`（先备份 prod.db）。本波 Foundry **不 exec**。
3. packages 已就位；`SUBSET_ONLY` 按现网；**禁止** upload.js / CDN。
4. font-licenses 已抄 IPA 全文；确认 feicode `licenseFileUrl`。
5. **CDN 闸门** — STOPPED。
6. 勿递增 `ANALYSIS_META_VER`。
7. 勿 clobber Kokoro/IPA（C2 `2eb22eb`）或 Slide Font（`31ee46d`）。

## 不要做

- 不要上传 OSS / CDN / 生产。
- 不要 docker exec vault register。
- 不要把许可标成 OFL。
- 不要跟浮动 moji `latest` 重下（必须钉上述 zip sha）。
