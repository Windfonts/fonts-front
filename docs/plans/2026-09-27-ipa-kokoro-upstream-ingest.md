# こころ明朝 / IPAex Gothic / IPA 黑体 上游入库交接（2026-09-27）

Foundry 轨 **C2**。为霞鹜铭心宋（Xwmxs）/ 晰黑 CL（Xwxhcl）/ 新晰黑（Xwxxh）钉官方上游。**CDN STOPPED**；不跑 vault docker / 不 bump analysis。

## 许可证核实（重要）

| 字体 | 许可 | 说明 |
|---|---|---|
| IPAex Gothic | **IPA Font License 1.0** | moji.or.jp 官方 zip 随包 |
| IPA 黑体 (IPA Gothic) | **IPA Font License 1.0** | 同上 |
| こころ明朝 | **IPA Font License 1.0**（**非 OFL**） | Typingart 衍生自 IPA 明朝系；随包 `IPA_Font_License_Agreement_v1.0.txt`；luxcem 备份 README 亦写 IPA |

三者 `LICENSE` 文件 sha256 相同：`4c84dd528ec3044638ec346fc1ee27cd1eb95dfc04cbc6a881b3ca7a7f517e54`。

### IPA 再分发要点（给 Bot / vault）

1. **原文再分发**（Art.3 §2）：不得改名、不得改文件、必须附带本许可全文。本波 packages 中的 `Regular.ttf/.otf` 即官方原文。
2. **衍生字体再分发**（Art.3 §1）：须提供 replace-back 到原始授权字体的方法；衍生字体名/文件名**不得含「IPA」**；须同许可传染。IPA 与 OFL **互不兼容**。
3. **嵌入式应用**：衍生字体嵌入（app/硬件/网页字体托管）需满足 Art.3 §1；见 LXGW [嵌入须知](https://github.com/lxgw/lxgw/blob/main/documents/xizhi_embedding_instructions.md)。
4. vault `license_name` 请用 **`IPA Font License`**（或 SPDX `IPA-1.0`）；勿标 OFL。
5. 本波 **不** docker exec register；脚本仅起草。

## 钉死

| 项 | IPAex Gothic | IPA 黑体 | こころ明朝 |
|---|---|---|---|
| 官方 | https://moji.or.jp/ipafont/ipaex00401/ | https://moji.or.jp/ipafont/ipa00303/ | typingart.net（?p=46 现 404） |
| 档案 | `ipaexg00401.zip` | `ipag00303.zip` | `kokoro.zip` |
| 档案 sha256 | `4ab6fee94bf6f94b3eeb31be2b73c559f738dc6b336d722d5301b1f3f592f850` | `b5e6f61de7465476f2f946dd83ee0961dc4d0ceea0833d253bb697297f232d97` | `e4566175799d52f9e3b6dd8774596428ea27dd40596e1283aa627689e5ac98d8` |
| 版本 | Ver.004.01 | Ver.003.03 | Ver.1.00 (2014-09-06) |
| 字体文件 sha256 | `3b9955a5e437ffb24c41548e79296fa724822da21ee75dc1b94f6ccdb8f400dd` | `503af4a8b84d1079b8e2e358dc7f7a7fb8cb7a1f212f35eaef6782dbfc75a55e` | `d0e06423e469754aa0483398a4fa02ea9e26b3104c0c6dbe7331d40b7804c8f3` |
| glyphs | 12239 | 12728 | 9354 |
| Norm | `IPAexGothic` | `IPAGothic` | `Kokoro` |
| family | `wenfeng-ipaexgothic` | `wenfeng-ipagothic` | `wenfeng-kokoro` |
| 目录名 | **IPAex Gothic** | **IPA 黑体** | **こころ明朝** |

こころ明朝 pin 备注：官网下载页失效；采用社区备份 [luxcem/typingart-fonts@d7d6a46](https://github.com/luxcem/typingart-fonts/commit/d7d6a46e41913bb0ce0cf5def1b34208b3c98529)（作者声明 backup of typingart.net；随包 IPA 许可 + 仓库 sha256sum 与本波一致）。

## 血缘修复（C → A）

| fork | 旧 upstreamName | 新 upstreamName | 备注 |
|---|---|---|---|
| 霞鹜铭心宋 | こころ明朝 | **こころ明朝** | 目录现已有；`upstreamOwnerId` fontworks→**typingart** |
| 霞鹜晰黑 CL | IPAex Gothic | **IPAex Gothic** | 目录现已有 |
| 霞鹜新晰黑 | IPA 黑体 | **IPAex Gothic** | LXGW README 明确基于 IPAexゴシック；纠正误挂经典 IPA Gothic |

- 新/补 `byName` originals：`IPAex Gothic` / `IPA 黑体` / `こころ明朝`
- `kokoro-mincho.upstreamName` 清空（自身即根）
- `ipa-gothic.upstreamName` 保持 `IPAex Gothic`（组级伞）
- `UPSTREAM_FONT` 原有别名目标现可 resolve；补 `IPAexゴシック` / `IPAex黑体` / `IPAゴシック`

## Staging / park / packages

- park：`/Users/feibisi-studio/Projects/_fonts_park/ipa-kokoro-2026-09-27`
- lab staging：`/Users/feibisi-studio/Projects/fonts-front-v4-lab/staging/ipa-kokoro-2026-09-27`
- packages：`fonts-packages/fonts/{IPAexGothic,IPAGothic}/Regular.ttf` · `fonts-packages/fonts/Kokoro/Regular.otf`
- licenses：`font-licenses/licenses/{Norm}/LICENSE` + `license-info.json`（spdx IPA-1.0）
- 机器 JSON：`docs/_oss-ingest-ipa-kokoro-2026-09-27.json`
- register 起草：`fonts-vault/scripts/register-ipa-kokoro-upstream.js`（**未跑**）

## Bot 清单

1. 复核 IPA 闸门与三份 archive/file sha256。
2. vault 登记 — `CONFIRM_IPA_KOKORO_REGISTER=1 docker exec fonts-vault node /app/register-ipa-kokoro-upstream.js`（先备份 prod.db）。本波 Foundry **不 exec**。
3. packages 已就位；`SUBSET_ONLY` 按现网；**禁止** upload.js / CDN。
4. font-licenses 已抄 IPA 全文；确认 feicode `licenseFileUrl`。
5. **CDN 闸门** — STOPPED。
6. 勿递增 `ANALYSIS_META_VER`。
7. IPA 嵌入/再分发合规若走 CDN 子集，需单独评估 Art.3 §1（replace-back 链到本三款原始包）。

## 不要做

- 不要上传 OSS / CDN / 生产。
- 不要 docker exec vault register。
- 不要把许可标成 OFL。
- 不要 clobber Slide Font（31ee46d）或 WQY/Droid tip。
- 不要跟浮动 moji `latest` 重下（必须钉上述 zip sha）。
