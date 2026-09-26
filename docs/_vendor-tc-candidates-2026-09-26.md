# 中文厂商字 · TC/繁体正主候选清单（2026-09-26）

Inventory-only for Bot/Feng. Pattern reference: Adobe Source Han Sans **SC + TC primary** (`adobe-source-han-sans` → `wenfeng-syhtsc` / `wenfeng-syhttc`，见 `_source-han-tc-ingest-2026-09-26.md`).  
**本轮不 CDN 入库、不拉大包**（除非本地已有极小件；当前无本地 TC 源件可 ingest）。

口径：上游有独立 **TC / Traditional language pack** 的中国品牌/厂商字 → 目录应挂 TC 正主芯片，禁止只拿「语言字段写了繁体」的简体壳顶着用。

---

## Gate 摘要

1. **本波优先**：小米字体、阿里普惠体，及同类「上游明确提供繁体/TC」中文厂商字。许可允许则可 CDN cite（对齐普惠体 / 小米既有先例）。
2. **吉利美好体 / 上海摩登体** = 另一闸（shelf，**NO cite**）— 本清单只记状态，**不**再 ingest。
3. **跳过**：其它 Adobe r8–r11、HK/JP/KR（除非同时满足「中文厂商 + TC 正主」类）。思源 TC 已入库，作对照不重做。

---

## 候选表

| name | current slug(s) | SC present? | TC/TW present? | upstream TC available? | license | **citable?** | recommended action | notes |
|---|---|---|---|---|---|---|---|---|
| 阿里巴巴普惠体 / Alibaba PuHuiTi | `wenfeng-albbpht` / `Albbpht` | **Yes**（CDN 9 字重；见下「混代」） | **No**（无 `*tc` 族、无产品卡、CDN `Albbphttc`/`AlibabasansTC` 404） | **Yes** — 官网语系 **阿里巴巴普惠體 TC / Alibaba Sans TC**（Big5+HKSCS；常见 4 字重：45 Light / 55 Regular / 75 SemiBold / 95 ExtraBold；另有 HK 线，本波可先 TC） | brand / free_commercial（alibabafonts.com 永久免费商用；`license-evidence` 已录） | **yes**（与现网普惠体 CDN cite 同口径） | **ingest TC 4w** + 新建产品卡 `alibaba-puhuiti`：SC primary + TC primary；locale 配对 `albbpht ↔ albbphttc` | 目录 `languages` 含「繁体中文」但是 **SC 壳口径**，不是 TC 正主。CDN 现况：**混代** — `Thin`/`Black` 等为 PuHuiTi **3.0**（GB18030-2022 / GB2312），`Regular`/`Heavy` 等仍见 **2019 PuHuiTi R/H v1.00**（name 表）。TC 与 3.0 SC 是不同语系包，勿用 3.0 冒充 TC。品牌树：`alibaba` → `alibaba-design`。 |
| 小米兰亭 Sans / MiSans | `wenfeng-misa` / `Misa` | **Yes**（CDN 10 字重 Thin…Heavy；name=`MiSans`） | **No**（无 `Misatc`/`MisaTC`；CDN 404） | **Yes** — HyperOS 官网独立 **MiSans TC**（约 15116 字符，10 字重 + VF；`hyperos.mi.com/font/download`） | brand（《MiSans 字体知识产权许可协议》；嵌入须注明；禁改编；禁单独再分发字体文件） | **yes**（闸口明示对齐小米既有 cite；现网已 CDN `Misa`） | **ingest TC 10w**（静态字重优先于 VF）+ 产品卡 `xiaomi-misans`：SC+TC primary；配对 `misa ↔ misatc` | 目录标了繁体，实为 SC 包。HANDOFF：小米只留本款 `wenfeng-misa`。建议 norm `Misatc`（或 Feng 定名）。 |
| OPPO Sans | `wenfeng-opsa` / `Opsa` | **Yes**（CDN 4 字重；name=`OPPO Sans` **v3.04**） | **No** | **Yes** — **OPPO Sans 4.0 TC** 上游存在（与 SC 分开发布；公开资料约 13k 级繁体字符） | brand（OPPO Sans Free Use License；须标明；禁改/禁单独售卖） | **yes**（同品牌可 cite 先例；现网已 CDN） | **ingest TC**（跟上游字重；先确认 4.0 TC 官方 zip 字重表）+ 产品卡 `oppo-sans` SC+TC；可选顺带评估 SC 升到 4.0（另闸） | 中文厂商+TC 类。现库仍为 3.x SC。HK/其它地区跳过除非 Feng 另开。 |
| 钉钉进步体 | `wenfeng-ddjbt` / `Ddjbt` | **Yes**（Normal+Regular） | **No** 独立 TC 包 | **未证实**有独立 TC language pack（目录写繁体，更像单包含繁点） | brand / free_commercial（钉钉；阿里树 `parentId: alibaba`） | **yes**（现网已 cite） | **skip**（本波） | 无「上游 TC 正主」证据前不硬拆。 |
| 阿里妈妈刀隶体 / 东方大楷 / 数黑体 | `wenfeng-almmdlt` 等 | SC/标题字 **Yes** | No | **No** 独立 TC 语系包 | brand / free_commercial | yes（现网） | **skip** | 装饰/标题字，非 Source-Han 式 SC↔TC 对。刀隶体 languages 含繁体 ≠ TC 正主。 |
| 淘宝买菜体 / 阿里汉仪智能黑体 | `wenfeng-tbmct` / `wenfeng-alhyznht` | Yes | No | No | brand | yes | **skip** | 简体营销/AI 字，无 TC 上游。 |
| 抖音美好体 | `wenfeng-dymht` | Yes（单 Regular） | No | No | brand / free_commercial | yes（现网） | **skip** | **不是**吉利美好体。GB2312 简体品牌字。 |
| 快看世界体 / 斗鱼追光体 / 金山云技术体 | `wenfeng-kksjt` 等 | Yes | No | No | brand | 视条款 | **skip** | 无 TC language pack 类目标。 |
| HarmonyOS Sans TC | —（目录无） | SC 亦未上架 | — | **Yes**（华为开发者文档 / brew `font-harmonyos-sans-tc` 等多源证实 SC+TC） | brand（华为） | **待核**（嵌入/再分发条款需对照官网再定 cite） | **wave-2 候选**（先 SC 决策再 TC；本波不 ingest） | 中文厂商+TC 类，但本库尚无 SC peer。 |
| vivo Sans TW/TC | —（目录无） | SC 未上架 | — | **Yes**（vivo Sans TW VF / TC 公开资料） | brand | **待核** | **wave-2 候选** | 同上。 |
| 吉利银河美好体 | —（目录无） | — | — | 简体品牌字（方正合作；非 TC 闸） | brand（商业发布免费；**嵌入 App/网页通常另需嵌入授权**） | **no** | **shelf / NO cite** — **勿本波处理** | 另闸；他代理可能在办。见下节。 |
| 上海摩登体 | —（目录无） | — | — | 有简繁覆盖说法，但是城市主题开源共享字，**不是**厂商 TC 正主闸 | brand/作者声明（常见条款禁软件/网页嵌入） | **no** | **shelf / NO cite** — **勿本波处理** | 与吉利同闸。勿与「摄图摩登小方体」`wenfeng-symdxft` 混淆。 |

**对照（已完成，非候选）：** 思源黑体 TC `wenfeng-syhttc` / `Syhttc` 七字重已入库；产品卡 `adobe-source-han-sans` SC+TC primary。Adobe 其它地区/r8–r11 跳过。

---

## 现状要点（抽查 2026-09-26 CST）

### 目录 / 产品 / 配对

- `data/fonts.json`：普惠体、MiSans、OPPO、钉钉等 **无** `*tc` family。
- `data/font-products.json`：**无** `alibaba-puhuiti` / `xiaomi-misans` / `oppo-sans` 产品卡（有 SC+TC 的是思源 / 霞鹜 / 狮尾 / 猫啃等）。
- `data/locale-fallback-pairs.json`：无 `albbpht`/`misa`/`opsa` 简繁对。
- `data/foundries.json`：阿里树已齐（`alibaba` → design / alimama / taobao / dingtalk）；`xiaomi`、`oppo` 独立 brand。

### CDN（`cn.windfonts.com/fonts-packages/…/full/result.css`）

| Normalized | SC | TC probe |
|---|---|---|
| `Albbpht` | 200（Thin/Light/Regular/Medium/SemiBold/Bold/ExtraBold/Heavy/Black） | `Albbphttc` / `AlibabasansTC` → 404 |
| `Misa` | 200（10 字重） | `Misatc` / `MisaTC` / `MiSansTC` → 404 |
| `Opsa` | 200（4 字重） | `OpsaTC` → 404 |
| `Syhttc` | — | 200（对照正主） |

### 本地 park

- `_fonts_park/protected-puhui3-dist/Albbpht/`：普惠 **3.0 SC** 分包残留（非 TC）。
- `_fonts_park/Syhttc/`：思源 TC 源件（对照）。
- **无** Alibaba Sans TC / MiSans TC / OPPO Sans TC 本地源件 → 本任务不下载。

### 许可 / cite

- 闸口范例：**普惠体 / 小米 = citable yes**；**吉利 = no**。
- 普惠：`license-evidence.names['阿里巴巴普惠体']`；永久免费商用，限制「不得将修改后的字体再分发或售卖」。
- MiSans：嵌入须注明；禁单独再分发字体文件 — 与现网 `Misa` CDN 托管同风险档；TC 跟随 SC 先例，仍走 Bot/Feng 闸。
- 吉利 / 上海摩登：免费商用宣传常见，但 **网页/App 嵌入多不在免费范围内** → shelf NO cite。

---

## 另闸状态：吉利美好体 / 上海摩登体（**已落地 lab · cite 关**）

| 项 | 吉利银河美好体 | 上海摩登体 |
|---|---|---|
| slug / family | **`Jlyhmht`** / `wenfeng-jlyhmht` | **`Shmgt`** / `wenfeng-shmgt` |
| 货架形态 | standalone（非产品芯片） | standalone |
| 目录 | lab `fonts.json` 已收；**未** vault register、**未** CDN 灌包 | 同左 |
| 服务状态 | **受限** `no_redistrib` | 同左 |
| cite | **NO**（`citeAllowed=false`；详情「使用」显示「引用未开放」；`fonts-packages/…/result.css` 期望 404） | 同左 |
| 编码 | `license-evidence.names` 禁托管/禁 CDN/禁嵌入 + tags `cite-closed`；`WFProto.citeAllowed` | 同左 |
| 许可债务（诚实） | 方正×吉利免费字=仅商业发布；嵌入/商标/出版物另授；商标「吉利」「银河」 | 汉唐作者声明；禁嵌入/改字/商标；**勿信误标 OFL** |
| 勿混淆 | ≠ 抖音美好体 `Dymht` | ≠ 摄图摩登小方体 `Symdxft` |

实现：`js/wf-proto.js` `citeAllowed`；`js/pages/detail.js` 拒挂 embed；`css/detail.css` `.use-cite-closed`。生产部署须 Feng 批 `deploy-feicode-front`；**禁止**给这两款做 Syhttc 式 vault+tar 灌包。

---

## 本波建议 ingest 顺序（仍须 Bot/Feng 闸，不自动拉包）

1. **阿里巴巴普惠體 TC（Alibaba Sans TC）** — 4 字重；官网语系清晰；与现有 `Albbpht` SC 组成产品卡；许可 cite 路径最短。  
   - 建议 norm：`Albbphttc`（或 Feng 定）；芯片 `TC` primary；配对进 `locale-fallback-pairs`。  
   - 并行（可选、非阻塞）：理清 `Albbpht` CDN **1.0 / 3.0 混代**（目录口径 vs 真源），避免 SC 正主自身不齐。
2. **MiSans TC** — 官方 HyperOS 独立包，10 静态字重；产品卡 `xiaomi-misans`。  
3. **OPPO Sans TC（建议跟 4.0 官方包）** — 中文厂商+TC；先核官方 zip 字重与许可原文再切包。  
4. **（wave-2）** HarmonyOS Sans TC / vivo Sans TW — 仅在 SC 上架策略确定且 cite 条款核过后。

**明确 skip 本波：** 钉钉进步体、阿里妈妈/淘宝装饰字、抖音美好体、快看/斗鱼/金山云、Adobe 非 TC、吉利/上海摩登。

---

## 极小目录 hygiene（未改数据；供下闸可选）

- 对 `wenfeng-albbpht` / `wenfeng-misa` / `wenfeng-opsa` / `wenfeng-ddjbt`：在 TC 正主入库前，详情「繁体」展示易误解为已有 TC peer — 可改为产品卡落地后再标，或加注「含繁点 / 待 TC 正主」。**本文件未改 `fonts.json`。**

---

## 参考

- `docs/_source-han-tc-ingest-2026-09-26.md` / `_source-han-tc-tw-gap-2026-09-26.md`
- `docs/_puhuiti3-gb18030-statement.md`（3.0 = 简体国标线，≠ TC）
- `data/foundries.json`（Alibaba parent 树）
- 上游：https://www.alibabafonts.com/ ；https://hyperos.mi.com/font/download ；OPPO 开放平台 Sans 4.0
