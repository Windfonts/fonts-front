# 全量字体核对 backlog（2026-09-23）

> 当前 **published ≈ 336**（`data/fonts.json`）。霞鹜主线及衍生已入库；**OSS 首批 101**（寒蝉 / Fontworks / 狮尾·Aqua / 霞鹜剩余等）已上架，见 `docs/_oss-ingest-batch1-progress.md`。

## 本轮已完成

| 项 | 结果 |
|---|---|
| 误归档恢复 | 70 款 CDN 有包但 DB 无 file/chars 的「假空壳」已 `published` 并补 weights.file |
| P0-2 `stfytz` | 更名为 **书体坊颜体**（包内 Windows 名） |
| P0-3 `albbpht` | 补 **Bold**（CDN 已有，API 200） |
| P0-1 `systcnl` | 展示名纠正；`wenfeng-light`→`wenfeng-systcnl` 别名；**OSS 已迁 `Systcnl/Light`**，normalized=`Systcnl`，字重键=`Light` |
| 猫啃命名 / 谱系 | `毛肯王星元体`→**猫啃网糖圆体**（jf open 粉圆）；`故障明朝体`→**猫啃网故障宋**；补「网」字与去 `-L`；8 款均为开源 fork（思源 / 狮尾 / RocknRoll / 粉圆） |
| 谱系上游入库 | **rnro / jfophy / swsjc / swb2jt**（展示 RocknRoll / jf open 粉圆 / 狮尾四季春 / B2 加糖）→ OSS 仍 `fonts-packages/{RocknRoll,JfOpenHuninn,SweiSpring,SweiB2Sugar}` |
| 思源正主补字重 | `syhtsc`（思源黑体）/`systsc`（思源宋体）补齐官方 SC 七字重；normalized 改为 `Syhtsc`/`Systsc`；OSS 已上 |
| LXGW 已上架 | 漫黑 / 新晰黑 / 致宋 + 小赖 SC / 小赖等宽 SC / 悠哉 + **文楷 / 文楷 GB / 文楷 TC / 臻楷 / 臻楷 Slab / 晰黑 CL·MN / 致宋 CL·MN** |
| 思源地区包 | `syhtsc/cn/tw/xt`、`systsc`、`sypscn` 恢复为独立字体（不再错绑 Clear Han） |
| 前台目录 | `fonts.json` 重导出 **336**（首批后） |
| OSS 首批入库 | **101 done / 0 fail**；跳过 TTC 思源等宽、络黑 VF、寒蝉无源仓等。进度 `docs/_oss-ingest-batch1-progress.md` |
| P4 门禁 | vault `font.service` create/update：禁空包、禁 name=`w`、禁 normalized=`Light` 等通用词 |
| OSS 写入 | `~/.config/linuxjoy/windfonts-upload.env` → `fonts-packages` 管线已通 |

## 仍归档（有意）

`hxbsbt` `hzpyt` `kslmt` `myrbsxt` `qtqmt` `huxiaobokuhei` `happyzcool2016` `pmzdcst60` `opposansb` `cktkingkong`  
→ 安全别名见 `data/family-aliases.json`。

## 产品规格与短码（定案）

- **不改**现网 `/api/css?family=&weight=&version=` 形状；参数化须另批。
- 已发布短码**冻结**；退役只走 `family-aliases.json`。
- 目录合并 / 详情规格 / tier：`data/font-products.json` + `docs/FAMILY-VARIANTS.md`。
- 详情「更多规格」折叠 `tier: advanced`；嵌入示例始终用**当前**规格 `family`。

## OSS 作者头像 / 缺口（2026-09-23）

- 审计：`docs/_oss-authors-github-audit.md`（JSON 同名）。
- 头像：7 家写入 `data/avatars.json`（aqua / chilltype / chncwk / fontworks / justfont / mplus / potta）；本地 webp 保留。
- **未收录**：思源等宽（TTC）、络黑（VF）、Aqua Bold 二轮、其余审计长尾。**全库 CSS 扫 + 子集缺口优先于再开大批量。**

## 品牌 / 谱系核实（续猫啃，2026-09-23）

依据：版权行 + 作者 GitHub README；写入 `data/font-lineage.json`。标准见 `LICENSE.md` §8 / `HANDOFF.md` §9。

| 厂商 | 结果 |
|---|---|
| 猫啃 | 8 款 OFL fork（此前会话完成） |
| 字魂 | 扁桃体 ← 得意黑（已有，复核 OK） |
| 站酷 | 快乐体/高端黑/文艺体 = 原创 OFL（非思源）；酷黑 = 胡晓波；小薇 = 佐兹 |
| 荆南 | 缘默体 = 原创 OFL；波波黑 = Etrump（勿挂 jingnan） |
| 寒蝉 | 已补：端黑宋/圆黑/锦书宋/云墨黑/圆体 M/点阵/龙藏楷/DIN/宽黑(←未来荧黑)/矩阵/月等宽/团圆 Sans/有机体/无机体；未写楷体·拙楷·活仿宋 |
| IBM | `foundries.ibm.openSource=true`；Plex Sans SC 已是 OFL（`isOpenFont` 本就认 licenseName） |

**已核（2026-09-23 续）**

- `hcth`/`hcwjt`：原包 name table = 寒蝉有机体 / 寒蝉无机体；产品「寒蝉谭黑」；**勿改成谭黑**
- `wlhxh`：vault `brandId` → `welai`；重复 `project-welai` 已 offline
- 下一波素材平台（千图/包图/优设/创客贴…）：只核误挂与命名，**不要**无证据标思源 fork
- **2026-09-24 已核误挂**：千图 6 款、包图小白体、优设标题黑、创客贴金刚体、摄图摩登小方体在 `font-lineage.json` 都没有 fork 行。许可正文与备注互相矛盾，本轮不改。站酷文艺体谱系是 `original`，`licenseName` 仍是「商用须授权」；没有原包 OFL 文件，不改成 OFL。

---

## 子集缺口（仍在）

| family | 现状 |
|---|---|
| `nsfx` / `nswt` | 仅 full |
| `hzpy` | 缺 en |

需拆分包工具后补跑（同 fonts-packages 管线）。

---

## 再次核对清单

- [x] 本轮新上架 LXGW + `systcnl` / `wenfeng-light` / `albbpht` Bold 均可 `GET /api/css` 200
- [x] 无 name=`w` / 无 published 空 weights（导出抽检）
- [x] 霞鹜文楷等核心 LXGW 已上架并四档子集齐全
- [x] `systcnl` 路径已迁且 `wenfeng-light` 别名仍通
- [ ] **全库** published 逐条 `/api/css` 扫一遍（待脚本）
- [ ] 同产品别名 9 条仍通；思源地区包与 `syhtcjk`/`pxzs` 互不顶替（抽检未全量）

**明确：核心 LXGW + OSS 首批（101）已完成。全库 CSS 扫过且子集缺口补完前，不要再开下一批量收录。**

可选后续（非阻塞）：思源等宽 TTC 拆包、络黑 VF、Aqua Bold、NF / FusionKai；全库 CSS 扫；`nsfx`/`nswt`/`hzpy` 子集。
