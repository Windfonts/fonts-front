# KH Dot / k6x8 上游父母入库交接（2026-09-27）

Foundry 轨。为 yzdnn 像素八款补上游父母。**CDN Depot LIVE（Bot 开闸）**；Foundry metadata `20260927khdot1` 已合入（analysis 497）。DotGothic16 已在目录（`wenfeng-dotgothic`）— **不重摄**，仅核血缘。

## 范围与候选表

| # | 款 | norm | family | role | 许可 | 字内版本 | glyphs | 下游 yzdnn |
|---|---|---|---|---|---|---|---|---|
| 1 | KH Dot 道玄坂 12 | Khdd12 | wenfeng-khdd12 | required | OFL | `Version 1.00.20150527` | 7285 | 长坂点宋 12, ChangBanDianSong 12 |
| 2 | KH Dot 道玄坂 16 | Khdd16 | wenfeng-khdd16 | required | OFL | `Version 1.00.20150527` | 7266 | 长坂点宋, ChangBanDianSong 16 |
| 3 | KH Dot 八丁堀 16 | Khdhb16 | wenfeng-khdhb16 | required | OFL | `Version 1.00.20150527` | 7657 | 八丁饰尾体, BaDingShiWeiTi 16 |
| 4 | KH Dot 秋葉原 16 | Khdak16 | wenfeng-khdak16 | required | OFL | `Version 1.00.20150527` | 7656 | 秋叶圆体, QiuYeYuanTi 16 |
| 5 | KH Dot 人形町 16 | Khdny16 | wenfeng-khdny16 | required | OFL | `Version 1.00.20150527` | 7659 | 人偶仿宋, RenOuFangSong 16 |
| 6 | KH Dot 兜町 16 | Khdkb16 | wenfeng-khdkb16 | required | OFL | `Version 1.00.20150527` | 7657 | 扇尾胄黑, ShanWeiZhouHei 16 |
| 7 | KH Dot 小伝馬町 12 | Khdkm12 | wenfeng-khdkm12 | expand | OFL | `Version 1.00.20150527` | 7202 | — |
| 8 | KH Dot 小伝馬町 12 Ki | Khdkm12ki | wenfeng-khdkm12ki | expand | OFL | `Version 1.00.20150527` | 7560 | — |
| 9 | KH Dot 小伝馬町 12 Ko | Khdkm12ko | wenfeng-khdkm12ko | expand | OFL | `Version 1.00.20150527` | 7202 | — |
| 10 | KH Dot 小伝馬町 16 | Khdkm16 | wenfeng-khdkm16 | expand | OFL | `Version 1.00.20150527` | 7656 | — |
| 11 | KH Dot 小伝馬町 16 Ki | Khdkm16ki | wenfeng-khdkm16ki | expand | OFL | `Version 1.00.20150527` | 7656 | — |
| 12 | KH Dot 神楽坂 12 | Khdkg12 | wenfeng-khdkg12 | expand | OFL | `Version 1.00.20150527` | 7592 | — |
| 13 | KH Dot 神楽坂 16 | Khdkg16 | wenfeng-khdkg16 | expand | OFL | `Version 1.00.20150527` | 7624 | — |
| 14 | KH Dot 日比谷 24 | Khdhy24 | wenfeng-khdhy24 | expand | OFL | `Version 1.00.20150527` | 8048 | — |
| 15 | KH Dot 日比谷 32 | Khdhy32 | wenfeng-khdhy32 | expand | OFL | `Version 1.00.20150527` | 7626 | — |
| 16 | k6x8 ゴシック | K6x8g | wenfeng-k6x8g | k6x8 | site-free | `2023.1019` | 7099 | 袖珍像素体, XiuZhenXiangSuTi |
| 17 | k6x8 明朝 | K6x8m | wenfeng-k6x8m | k6x8-sibling | site-free | `2023.1019` | 7099 | — |

### DotGothic16（不重摄）

| 款 | family | normalized | 血缘 |
|---|---|---|---|
| DotGothic16 | wenfeng-dotgothic | Dotgothic | `正格点黑` / `ZhengGeDianHei 16` → `DotGothic16` / `fontworks`（已核，`relation=fork`） |

## 官方源与钉死

### KH Dot Font Series

| 项 | 值 |
|---|---|
| 官方 | http://jikasei.me/font/kh-dotfont/ |
| 设计 | 平木敬太郎 / Font Silo（http://hp.vector.co.jp/authors/VA000874/） |
| TrueType 化 | 自家製フォント工房 |
| 许可 | **SIL OFL 1.1**（包内 `SIL_Open_Font_License_1.1.txt`） |
| 版本钉 | `1.00.20150527`（README / AUR `pkgver=1.00.20150527`） |
| 归档 | `khdotfont-20150527.7z` |
| 主镜像 | http://mirrors.dotsrc.org/osdn/users/8/8545/khdotfont-20150527.7z |
| 备镜像 | https://ftp.iij.ad.jp/pub/osdn.jp/users/8/8545/khdotfont-20150527.7z |
| sha256 | `37e07933056c0d5882924cb4cfea0989532dfa0436d7b840025443e7f7e16032`（与 AUR PKGBUILD 一致） |
| GitHub | **无官方仓**（无 commit SHA 可钉；以 archive SHA 为准） |

注：八丁堀 PS 名官方为 `KH-Dot-Hatcyoubori-16`（Hatcyoubori），文件名 `KH-Dot-Hatchoubori-16.ttf`。

### k6x8

| 项 | 值 |
|---|---|
| 官方 | https://littlelimit.net/k6x8.htm |
| 作者 | 門真なむ（Num Kadoma） |
| 许可 | **非 OFL** — littlelimit site free software（无限改/商用/再分发，无保证）；历史上注明对齐 M+ FONTS LICENSE 修正 |
| 版本钉 | `2023-10-19`（`k6x8Gothic` / `k6x8Mincho` `2023.1019`） |
| 归档 | `k6x8_ttf_2023-10-19.zip`（418,907 bytes 页称） |
| URL | https://littlelimit.net/arc/k6x8/k6x8_ttf_2023-10-19.zip |
| sha256 | `70149d511b0eb4afde1c191ea7779d42a247269ed989976d1f58a9b0f868a27c` |
| GitHub | **无官方仓** |
| 主上游字面 | `k6x8_gothic.ttf`（袖珍像素体衍生自 k6x8；明朝为同系列姊妹） |

### 许可闸门结论

| 源 | 结论 | 动作 |
|---|---|---|
| KH Dot 全 15 面 | OFL 1.1 明确 | 可入库 / 可本地 packages |
| k6x8 | 非 OFL，自由再分发 | 可入库但 `licenseName` 不得写 OFL；袖珍衍生仍双许可 |
| DotGothic16 | 已在目录 OFL | 不重摄 |

## 缺源 / 阻塞（缺源 list）

| # | 项 | 状态 |
|---|---|---|
| 1 | KH Dot 官方 GitHub / Font Silo git | **缺** — 无仓可钉 commit；以 20150527 archive SHA 代替 |
| 2 | k6x8 官方 GitHub | **缺** — 以 littlelimit zip SHA 代替 |
| 3 | vault `prod.db` register 实跑 | **阻塞** — 本机无 `docker`，脚本已起草未 exec |
| 4 | CDN / 生产 upload | **DONE** — Depot CDN 17 norms HTTP 200；metadata uploaded `20260927khdot1` |
| 5 | ANALYSIS_META_VER / OSS_METADATA_VERSION bump | **DONE** — `20260927khdot1`（front + vault env） |

无缺可下载源：KH 与 k6x8 归档均已取到并校验。

## Staging / park 路径

- lab：`staging/khdot-k6x8-2026-09-27/{folder}/{TTF+LICENSE}` + `pack-meta.json`
- park：`/Users/feibisi-studio/Projects/_fonts_park/khdot-k6x8-2026-09-27/`（`dl/` + `extract/`）
- 机器 JSON：`docs/_oss-ingest-khdot-k6x8-2026-09-27.json`
- 本地 packages（未切包/未上传）：`fonts-packages/fonts/{Norm}/Regular.ttf`
- font-licenses：`font-licenses/licenses/{Norm}/LICENSE`

## 本轮已改（lab）

- `data/fonts.json` — +17 上游父母（6 required KH + 9 expand KH + 2 k6x8）
- `data/foundries.json` — +`font-silo` / `jikasei` / `littlelimit`
- `data/font-lineage.json` — 组补全；KH/k6x8 originals；袖珍 `upstreamOwnerId` 改 `littlelimit`；Zgdh→DotGothic16 已核
- `docs/plans/2026-09-27-khdot-k6x8-upstream-ingest.md`（本文）
- `docs/_oss-ingest-khdot-k6x8-2026-09-27.json`
- `staging/khdot-k6x8-2026-09-27/**`
- `fonts-vault/scripts/register-khdot-k6x8-upstream.js`（起草，未跑）

## Bot 清单（按序）

1. **复核许可闸门** — KH=OFL；k6x8=site-free；确认目录文案不把 k6x8 标成 OFL。
2. **vault 登记** — `docker exec fonts-vault node /app/register-khdot-k6x8-upstream.js`（先备份 prod.db）。brand：`font-silo` / `jikasei` / `littlelimit`。
3. **packages 切包（本地）** — 源已在 `fonts-packages/fonts/{Norm}/Regular.ttf`；`SUBSET_ONLY` 按现网；**禁止** `upload.js` / CDN。
4. **font-licenses** — 已抄 LICENSE；回填 vault `licenseFileUrl` 若路径约定不同。
5. **CDN 闸门** — 等 Bot/Feng；本轮 Foundry **不做**。
6. **勿** 递增 `ANALYSIS_META_VER` / 与并行 yzdnn 分析轨打架。

## 不要做

- 不要重摄 DotGothic16 / `wenfeng-dotgothic`。
- 不要上传 OSS / CDN / 生产。
- 不要把 k6x8 标成 OFL。
- 不要跟浮动镜像重下而不核 sha256。


## Foundry metadata status (2026-09-27 CST)

- Version: **`20260927khdot1`**
- Restored clobbered 17-only analysis from CDN yzdnn1 baseline (480), surgical CSS merge +17 → **497**
- Mapping 568 → **585**
- Metadata uploaded; CDN `?v=20260927khdot1` → 200, max-age=300, total_fonts=497
- Dotgothic + yzdnn 8 norms preserved; k6x8 licenseName remains `littlelimit free software (M+ lineage note)` (not OFL)
- package-sizes: all 17 norms present; synced to vault `data/`
