# yzdnn 像素八款正式入库交接（2026-09-27）

Foundry 轨。本机 lab 已钉 commit、写目录 / 血缘 / 作者卡、落 staging；**不擅自推 CDN / 生产**。后续交 Bot。

## 范围

| # | 款 | norm | family | 仓 | 钉 SHA | 字内版本 | OFL | 备注 |
|---|---|---|---|---|---|---|---|---|
| 1 | 长坂点宋 12 | Cbds12 | wenfeng-cbds12 | yzdnn/ChangBanDianSong-12 | `d71d3b1273b0` | 1.4.3 | 有 | NEW；主 TTF，跳过 SP |
| 2 | 长坂点宋 | Cbds | wenfeng-cbds | yzdnn/ChangBanDianSong-16 | `d5c59dbdbe43` | 1.3.1 | 有 | 已有款刷新；字重 SC+TC |
| 3 | 八丁饰尾体 | Bdswt | wenfeng-bdswt | yzdnn/BaDingShiWeiTi-16 | `6167c8662fb8` | 1.1.0 | 有 | NEW；`updates-ongoing` |
| 4 | 秋叶圆体 | Qyyt | wenfeng-qyyt | yzdnn/QiuYeYuanTi-16 | `45d831c5cf2e` | 1.0.1 | 有 | NEW；`updates-ongoing` |
| 5 | 人偶仿宋 | Rofs | wenfeng-rofs | yzdnn/RenOuFangSong-16 | `af9f20939878` | 1.1.1 | 有 | NEW；正式钉入 + `updates-ongoing`（Feng：勿 defer） |
| 6 | 扇尾胄黑 | Swzh | wenfeng-swzh | yzdnn/ShanWeiZhouHei-16 | `5a475886d4f5` | 0.1.2 | 有 | NEW；`updates-ongoing`；定位简体 |
| 7 | 正格点黑 | Zgdh | wenfeng-zgdh | yzdnn/ZhengGeDianHei-16 | `ac81e4b58c34` | 1.1.0 | 有 | NEW；上游 DotGothic16 已在目录；`updates-ongoing` |
| 8 | 袖珍像素体 | Xzxst | wenfeng-xzxst | yzdnn/XiuZhenXiangSuTi | `41fc94c12ff6` | 1.0.0 | 有 | NEW；双许可见下；`updates-ongoing` |

跳过：omake、yzdnn README 仓、`script_zh-hans`。

完整钉表与文件哈希：`docs/_oss-ingest-yzdnn-2026-09-27.json`、`staging/yzdnn-pixel-2026-09-27/pack-meta.json`。

## 货架标记（作者仍在更新）

以下款 README 写明尚未完工 / 持续更新，**已正式钉入**，并打目录标记：

- tags 含 `updates-ongoing`
- `licenseNotes` 含文案「作者仍在更新」
- 涉及：八丁饰尾体、秋叶圆体、人偶仿宋、扇尾胄黑、正格点黑、袖珍像素体

长坂点宋 12 / 16 未打该标。

## 双许可（袖珍像素体）

- 衍生：SIL OFL 1.1（OFL.txt 版权行含 yzdnn + Num Kadoma）
- 上游 k6x8：M+ FONTS LICENSE
- 目录 `licenseName` 记衍生侧 OFL；`licenseNotes` / pack-meta `dualLicense` 必须保留双许可说明。归档到 font-licenses 时建议附上游 M+ 许可摘录或链接。

## 血缘

`data/font-lineage.json`：

- 新组：`kh-dot-font-series`、`dotgothic16`、`k6x8`
- byName：八款（中/英名）`relation=fork`，`ownerId=yzdnn`
- 正格点黑 → upstream DotGothic16 / `fontworks`
- 袖珍 → upstream k6x8 / `mplus`（许可系 M+，仅作上游指针）

## Staging 路径

- lab（可随仓提交）：`staging/yzdnn-pixel-2026-09-27/{repo}/{TTF,OFL.txt}` + `pack-meta.json`
- park 镜像：`/Users/feibisi-studio/Projects/_fonts_park/yzdnn-2026-09-27/`（同内容，方便 packages 脚本读）

全部 raw URL 已钉 SHA，禁止再跟浮动 `main` / `HEAD`。

## Bot 清单（按序）

1. **vault 登记**  
   - 按 `docs/_oss-ingest-yzdnn-2026-09-27.json` 写 register 脚本（可参考 `fonts-vault/scripts/register-oss-batch2.js`）。  
   - brand / foundry：`yzdnn`（既有 brand id `b2d6f4a8-1e39-4c57-8a0b-6f3e9d1c75aa`）。  
   - Cbds 为更新：对齐 SC/TC 字重与简繁语言；其余 7 款新建。  
   - 透传 `updates-ongoing` 标签与「作者仍在更新」文案到货架字段。

2. **packages 切包**  
   - 自 staging / park 取钉死的 TTF（Cbds 需 SC→映射字重、TC→映射字重；其余 Regular）。  
   - `SUBSET_ONLY` 按现网规范；**先不要 upload CDN**，等 Foundry / Feng 闸门。

3. **font-licenses 归档**  
   - 每款 `licenses/{Norm}/LICENSE` ← OFL.txt。  
   - Xzxst 另记双许可 note。  
   - 回填 `fonts.json` 的 `licenseFileUrl`。

4. **CDN 闸门（等人下令）**  
   - 上传 `cn.windfonts.com/fonts-packages/{Norm}/…`。  
   - 跑 `INGEST-PIPELINE.md`：analysis → package-sizes → locale-fallback → 递增 `OSS_METADATA_VERSION`。  
   - **本轮 Foundry 不做这一步。**

5. **front / vault 合入**  
   - front：`v4-specimen` 已含目录与 docs（本提交）；推送与否听 Feng。  
   - vault：AGit `refs/for/main/...`，wapuu 合。

## 本轮已改（lab）

- `data/fonts.json` — 刷新 Cbds + 新增 7 款
- `data/foundries.json` — 扩展 yzdnn website / fontNames / description
- `data/font-lineage.json` — 组与 byName
- `docs/_oss-ingest-yzdnn-2026-09-27.json`
- `docs/plans/2026-09-27-yzdnn-pixel-ingest.md`（本文）
- `staging/yzdnn-pixel-2026-09-27/**`

## 不要做

- 不要跟浮动 `main` 重下 TTF。  
- 不要上传 OSS / CDN / 生产，除非 Feng 或 Foundry 闸门明确放行。  
- 不要把人偶仿宋等仍更新款改成 preview-only / defer。
