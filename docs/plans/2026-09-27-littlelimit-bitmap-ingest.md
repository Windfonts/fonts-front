# littlelimit 缺失点阵入库交接（2026-09-27）

Foundry 轨。补全 littlelimit 站上 k6x8 以外的点阵：**美咲フォント**、**k8x12**、**k12x8**；并探测 **MSXView 漢字 ROM**。**CDN STOPPED**；不跑 vault docker / 不 bump analysis。

许可与 k6x8 同文：`littlelimit free software (M+ lineage note)` — **非 OFL**（https://littlelimit.net/font.htm）。

## 范围与候选表

| # | 款 | norm | family | glyphs | chars | 版本 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | 美咲ゴシック | Misakig | wenfeng-misakig | 7174 | 7192 | 2021.0505 | 8×8 ゴシック |
| 2 | 美咲明朝 | Misakim | wenfeng-misakim | 7174 | 7192 | 2021.0505 | 非汉字明朝风 |
| 3 | 美咲ゴシック第2 | Misakig2nd | wenfeng-misakig2nd | 7173 | 7191 | 2021.0505 | 半角 3×7 / 全角假名铺满 |
| 4 | k8x12 | K8x12 | wenfeng-k8x12 | 7173 | 7192 | 2021.0505 | 8×12 原作 |
| 5 | k8x12L | K8x12l | wenfeng-k8x12l | 7173 | 7192 | 2021.0505 | 假名纵长 |
| 6 | k8x12S | K8x12s | wenfeng-k8x12s | 7173 | 7192 | 2021.0505 | 非汉字高 8px |
| 7 | k12x8 | K12x8 | wenfeng-k12x8 | 3784 | 3802 | 2021.0505 | α版；JIS1 only |

已在目录（本波不重摄）：k6x8 ゴシック `K6x8g` / k6x8 明朝 `K6x8m`。

## 官方源与钉死

### 美咲フォント

| 项 | 值 |
|---|---|
| 官方 | https://littlelimit.net/misaki.htm |
| TTF 归档 | `misaki_ttf_2021-05-05.zip`（794,317 bytes） |
| URL | https://littlelimit.net/arc/misaki/misaki_ttf_2021-05-05.zip |
| sha256 | `c1851af85a0a010dd84f40803159c2d8a23feecb6c7e800cfeb5c6edc50da46e` |
| BDF 归档 | `misaki_bdf_2021-05-05.zip`（318,046） sha256=`a275f173cf5935890f84d3e65d05b1bf73028e4d4bf41cb3de0ef3b5ebe8e217` |

### k8x12

| 项 | 值 |
|---|---|
| 官方 | https://littlelimit.net/k8x12.htm |
| TTF 归档 | `k8x12_ttf_2021-05-05.zip`（1,170,095 bytes） |
| URL | https://littlelimit.net/arc/k8x12/k8x12_ttf_2021-05-05.zip |
| sha256 | `8d006e3171f4823ff1e81eaa285447129239071fc31ebafb8128696d0c1f1d17` |
| BDF 归档 | `k8x12_bdf_2021-05-05.zip`（376,885） sha256=`305ab94915ec3c8e1ada08f493ee5bfdd21e2710a97d7c4d4272444d8e18ff40` |

### k12x8

| 项 | 值 |
|---|---|
| 官方 | https://littlelimit.net/k12x8.htm |
| TTF 归档 | `k12x8_ttf_2021-05-05.zip`（174,047 bytes） |
| URL | https://littlelimit.net/arc/k12x8/k12x8_ttf_2021-05-05.zip |
| sha256 | `7c3c707c70c97473c9b95196bfbf395346cca58752518ed3422cefc89785f6ef` |
| BDF 归档 | `k12x8_bdf_2021-05-05.zip`（71,539） sha256=`8f3f8ae3de15452805fa826ef37da2b15d38ff7bec142fdd889c24b62229899a` |
| 备注 | α版；第二水准未实现 |

### 许可闸门

| 源 | 结论 | 动作 |
|---|---|---|
| Misaki / k8x12 / k12x8 | 站点自由软件（非 OFL） | 可入库；`licenseName` 与 k6x8 同文，不得写 OFL |
| MSXView ROM | 见下 | **跳过 CDN 字体货架** |

## MSXView 漢字 ROM 探测结论

| 项 | 值 |
|---|---|
| 页 | https://littlelimit.net/viewfont.htm |
| 归档 | `viewfont_2021-05-05.zip`（160,597） |
| sha256 | `8903a3a110745f09dc2fa6d54c39567527c832d091a11869843a54e2a112d4b1` |
| 内容 | `k12x8shn.rom`（245,760 bytes，ROM binary）+ `readme.txt` |
| 使用字体 | 12×12=东云12ゴシック；12×8=k12x8(JIS1)+东云12缩小(JIS2) |
| **CDN 货架** | **SKIP / out-of-scope** |
| 理由 | 仅为 MSXView 汉字卡带格式 ROM 镜像，不是可挂货架的 TTF/OTF/WOFF2 字面。可渲染面已由 k12x8 TTF 覆盖；东云 12 为独立 PD 字体，不在本包内以字体面提供。 |

## Staging / park

- lab：`staging/littlelimit-2026-09-27/{MisakiGothic,MisakiMincho,MisakiGothic2nd,k8x12,k8x12L,k8x12S,k12x8}/` + `pack-meta.json`
- park：`/Users/feibisi-studio/Projects/_fonts_park/littlelimit-2026-09-27/`（`dl/` + `extract/`）
- 机器 JSON：`docs/_oss-ingest-littlelimit-2026-09-27.json`
- 本地 packages：`fonts-packages/fonts/{Norm}/Regular.ttf`
- font-licenses：`font-licenses/licenses/{Norm}/LICENSE`（+ `SITE-LICENSE.txt` + `readme-ttf.txt`）

## 本轮已改（lab）

- `data/fonts.json` — +7 面
- `data/foundries.json` — `littlelimit.fontNames` 扩美咲/k8x12/k12x8
- `data/font-lineage.json` — 组 `littlelimit-bitmap`（+ misaki/k8x12/k12x8）；byName originals
- `docs/plans/2026-09-27-littlelimit-bitmap-ingest.md`（本文）
- `docs/_oss-ingest-littlelimit-2026-09-27.json`
- `staging/littlelimit-2026-09-27/**`
- register 起草：`/Users/feibisi-studio/Projects/fonts-vault/scripts/register-littlelimit-bitmap.js`（**未跑**）

## Bot 清单（按序）

1. 复核许可闸门 — 全部 `littlelimit free software`；不得标 OFL。
2. vault 登记 — `CONFIRM_LITTLELIMIT_REGISTER=1 docker exec fonts-vault node /app/register-littlelimit-bitmap.js`（先备份 prod.db）。本波 Foundry **不 exec**。
3. packages 切包（本地）— 源已在 `fonts-packages/fonts/{Norm}/Regular.ttf`；**禁止** `upload.js` / CDN。
4. font-licenses — 已抄 LICENSE；回填 vault `licenseFileUrl` 若路径约定不同。
5. CDN 闸门 — 等 Bot/Feng；本轮 **STOPPED**。
6. 勿递增 `ANALYSIS_META_VER` / 与并行轨打架。
7. MSXView ROM — 保持 skip；勿当字体面入库。

## 不要做

- 不要上传 OSS / CDN / 生产。
- 不要把 littlelimit 标成 OFL。
- 不要 docker exec vault register（无 CONFIRM）。
- 不要把 `k12x8shn.rom` 当 CDN 字体货架条目。
- 不要 clobber IPA/Kokoro tip（`2eb22eb`）或并行脏工作区无关改动。
