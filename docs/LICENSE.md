# 文风 · 授权依据与防钓鱼

> 2026-09-20 定调。详情页「授权」、厂商页、选字袋、`license.html` 都以本文为准。参考墨图爱可（每套标作者 + SPDX、本站不二次授权），不参考素材站「可商用」截图。

## 1. 原则

Windfonts **转述**条款，不重新授权。版权归权利人。用户能否商用，以权利人原文为准，不以本站徽章为准。

防的是两件事：把不能商用的字标成能用；把素材站或仿页当成厂商官网。

主证据是 **出处 + 短名 + 摘录 + 日期**，不是声明图。截图只能当存档附件，以后放 `wenfeng.org`。

## 2. 来源分档（`sourceKind`）

| sourceKind | 含义 | 可点亮「已核对原文」 |
|---|---|---|
| `standard` | SPDX / 标准文本（OFL、Apache、MIT、CC、IPA） | 有官方许可页即可 |
| `rights_holder` | 权利人官网或官方公告，且对着这款字的家族名 | 有官网链接 + 摘录 |
| `github_license` | 源仓库 LICENSE / OFL 文件 | 有仓库许可链接 |
| `platform` | 千图、包图、字魂、站酷、猫啃等素材站声明 | **否** |
| `author_note` | 「作者声明」但无原文链接 | **否** |
| `unlabeled` | 目录只有「免费商用」、无协议名、无链接 | **否** |

「千图说可商用」≠「厂商说可商用」。`kind: platform` 的厂商，旗下字即使目录写免费商用，也只能标「素材站声明」。

`licenseVerified` 不再当展示依据。没有依据记录，就不写「已人工核实」。

## 3. 认证两枚（禁止混用）

| 徽记 | 字段 | 含义 |
|---|---|---|
| 许可已核对 | `licenseEvidence.verified` | 这款字的条款按上表看过 |
| 厂商已认领 | `foundries[].claimed` | 该页维护方认领并通过（能力按 kind 不同，见 [CLAIM-SCOPES.md](CLAIM-SCOPES.md)） |

现在没有已认领厂商，认证徽记不应出现。禁止再用 `font.licenseVerified` 当「已认证厂商」。认领通过也**不能**改许可档位或点亮「已核对」。

## 4. 厂商 `kind` / `openSource`

写在 `data/foundries.json`。标的是人/机构，不是又一张许可贴纸。

| kind | 例子 | 页上怎么叫 |
|---|---|---|
| `author` | 落霞孤鹜、寒蝉、胡晓波 | 「作者」；`openSource` 时「开源作者」 |
| `project` | 文泉驿、一点字坊、GNU、M+、台湾省教育部 | 「开源项目」 |
| `foundry` | 汉仪、方正、华康、仓耳 | 「字库」 |
| `brand` | 钉钉、OPPO、小米、字节、阿里 | 「品牌方」；版权在品牌，字常由字库代做 |
| `platform` | 千图、包图、站酷、字魂、猫啃 | 「素材平台」 |

厂商索引必须把 **作者**、**开源作者**、**开源项目** 分列分筛，禁止合成「开源作者 / 项目」。

认领谁能改什么、材料要什么：见 [CLAIM-SCOPES.md](CLAIM-SCOPES.md)。素材平台可认领页资料，但永远不能动许可；制作方无单独协作通道，归属页只由 `ownerId` 认领。

地区命名：台湾相关一律「台湾省」（英文 `Taiwan Province`），禁止「中华民国」进字典主名或别名。

一款字可以同时是：开源（协议）+ 素材平台（分发方）。例如猫啃转载的 OFL 字。

## 5. 数据

`data/fonts.json` 仍由导出脚本生成，不手改。依据在 `data/license-evidence.json`：

- `standards`：标准许可短名 → 官方页 + 摘录
- `names`：字体名（含匹配）→ 权利人页
- 运行时再按 `licenseName`、厂商 `kind`、目录 `licenseUrl` 回退

解析结果挂在 `font.licenseEvidence`，只经 `WFChrome.licenseEvidence` / `licenseCiteHtml` 输出。

```
sourceKind  sourceUrl  quote  verifiedAt  restrictions[]  spdx  verified
```

没有这几项，不要点亮「免费商用 + 已核对」。

以后公开接口：`GET /v1/fonts/{id}` 带 `licenseEvidence`；存档柜在 `wenfeng.org`。

## 6. 出现位置

- **详情「授权」**：档位 + 协议短名 + 依据条 + 品牌方/制作方 + 上游同系 + 可以/不可以。素材站加降级说明。
- **卡片 meta**：品牌方 · 字重 · 档位；开源或素材平台各一个词，不堆绿标。
- **厂商页**：官网域名必须可见；写 kind；受托制作单列。认领通之前不写「本页由厂商维护」。
- **字体库**：`?foundry=`、`?lineage=`、`?open=1`、`?kind=brand|platform`。
- **选字袋对比**：每款列出品牌方、制作方、档位和出处，混装不合成一张「均可商用」。
- **文档**：许可类型速查（宽松 / 要署名 / 相同方式共享 / 不能商用 / copyleft / 未标明）。

## 7. 品牌方 ≠ 制作方

目录里的 `foundry` 经常是受托字库。版权在谁，以版权行和委托合同为准，不默认等于制作方。

| 角色 | 字段 | 例子 |
|---|---|---|
| **品牌方** `ownerId` | 出资、持有版权、认领页的人 | 钉钉进步体 → 钉钉；OPPO Sans → OPPO；普惠体 → 阿里巴巴 |
| **制作方** `makerId` | 画字、交付工程的字库 / 作者 | 上三款的制作方都是汉仪 |
| **分发方** | `kind: platform`，只转载 | 猫啃、千图 |

页面上品牌方是主归属。制作方不同就另写一行「某某制作」。厂商页：品牌方下列自己的字；字库页另列「受托制作」。

委托定制的许可跟品牌方走，**不能**拿制作方旗下其他款的 OFL / 可商用条款来猜。

## 8. 上游、同系、派生

中文开源圈大量字是思源 / IPA / Droid 的改名派生。用户要能看见上游，才知道许可是不是同一份。

| relation | 含义 | 许可默认 |
|---|---|---|
| `original` | 谱系源头（本家族首发） | 看本款依据 |
| `locale` | 同一家族的地区或规格切分（简繁、Lite / Screen / 等宽、CL·MN…） | `inherit` |
| `fork` | 改过并**已改名**的派生：外源补字，或同主再设计 | `inherit`（OFL 仍须保留声明、尊重保留名） |
| `commissioned` | 品牌委托定制 | `own` |
| `collab` | 品牌与字库联名 | `own`，除非原文写明跟上游走 |

`upstreamOwnerId`：外源 `fork` 时必须是上游机构，且**不得**等于本款 `ownerId`。同主再 `fork`（如臻楷 ← 文楷）或 `locale` 时，`upstreamOwnerId` 可与 `ownerId` 相同。

厂商页展示（与原始 relation 可不同）：

- 外源 `fork`（上游机构 ≠ 本页）→ 进「源字」：作者页上这是主款
- `locale` →「地区版」；同名前缀规格收进主款脚注 / `font-products`
- 同主再 `fork` →「派生」
- 顶部外源条按上游族系分两行（都是 `fork`，不是两种法律类型）：**派生 · 开源**（IPA / Fontworks / Droid…）与 **派生 · 思源**（Source Han / Adobe）。「开源」是族系口令，不是说思源不开源；口语「二创」= 派生，不单独成类。勿写「改自」。可手工 `originVerb: remix|derive` 覆盖
- 顶部只列**外源根**，不刷 GB / Lite
- 页内「派生」段 = 同主再设计的 `fork`；「地区版」= `locale`

后续同类作者（寒蝉、猫啃等）按同一套写：先标外源根，地区/规格用 `locale`，再设计才用同主 `fork`，不要一律 `fork`。

`licenseFollows`：`inherit` 写清「沿用上游哪份许可」；`own` 写清「以品牌方为准」；不知道就 `unknown`，不写「应该也能商用」。

数据在 `data/font-lineage.json`（按字体名匹配）。没有记录就不编谱系。相关字体优先同组，其次同品牌方。

## 9. 不要做的

- 授权区当图廊，或把用户上传的「官网截图」当过审依据。
- iframe 第三方许可页。
- 需授权的字因为某篇博客截图就标免费商用。
- 用 AI 生成或修过的声明图。
- 本站另发一张「文风免费商用许可证」冒充权利人。
- 把制作方写成权利人，或把委托定制当成开源派生。
- 没有上游记录就提示「许可与思源相同」。
- 没有许可原文时，用 AI 句子填 `LICENSE`，或把 OSS 里文件名带 license 的无关 PDF 当成授权书。

## 10. OSS 桶里的许可原件（2026-09-24）

桶 `wenfeng-fonts` 当时 271312 个对象。能当字体许可用的只有两份，已在 `Windfonts/font-licenses` `972b5ab`：

- 鼎猎珠海体 `wenfeng/fonts/dlzht/license.pdf`。授权说明允许画面用途，并写明字体文件嵌入网站和程序不在范围内。目录里旧的「不可修改、不可再分发」不是这份原文。
- OPPO Sans `wenfeng/fonts/opsa/license.0 License Notice`。厂商协议，不是 OFL。

`wenfeng/fonts/cszt/` 和 `wenfeng/fonts/test/` 里名叫 license 的文件不是字体许可。184 个字体 zip 和 `fonts-packages/` 网页包里都没有 OFL 或授权书。128 个许可目录里有原文的是 10 个。过程与排除项见 [HANDOFF.md](HANDOFF.md) §13。
