# 文风 · 双平台分工与后续工作

> 2026-09-20 定调。后续厂商页、开源作者、缺字、造字、授权、源文件下载、AI 补字，都以本文为准。本仓 `fonts-front` 只做 **Windfonts 分发前端**；造字与授权不在本仓硬做。

## 1. 两个站点

| | Windfonts | 文风 org |
|---|---|---|
| 域名 | `windfonts.com` · CDN `cn.windfonts.com` | `wenfeng.org` |
| 干什么 | 自有 **分发** 平台：逛库、挑字、子集化、项目 CDN、域名白名单、用量 | **造字、授权、源文件下载**；缺字报告、开源工具、以后 AI 补字 |
| 用户 | 设计师 / 前端 / 站点运营 | 字体作者、开源贡献者、要补字或下源文件的人 |
| 产物 | woff2 / 项目 CSS / 嵌入代码 | 源文件（ttf/otf/工程）、许可原文、补字包、改名后的派生字体 |
| 不干什么 | 不当造字编辑器，不冒充原字体补点 | 不当 CDN，不替代项目白名单与流量计费 |

两边可以互相链：详情页「源文件 / 许可原文 / 缺这些字」去 org；org 上某款字「用于网页」回 Windfonts 嵌入。

授权注释里的 `https://wenfeng.org/license` 已经指向 org，和这个分工一致。

## 2. 厂商页（Windfonts）

厂商页是 **信任 + 在库清单**，不是品牌站、不是杂志。

- 单页先出字：用该厂最能代表自己的一款做大样张；官网、在库数、授权分布收成一行。列表接控制条，授权混杂时用芯片滤。
- 认证拆两枚，禁止混用。依据、来源分档、禁止用截图当主证据：见 [LICENSE.md](LICENSE.md)。
  - **许可已核对**：`licenseEvidence.verified`（不是目录里的 `licenseVerified`）。
  - **厂商已认领**：`foundries[].claimed`。禁止 `brandVerified = licenseVerified`。
- 未认领写「这是你的品牌？」；提交后写「审核中」。厂商还改不了标志和介绍之前，不要写「本页由厂商维护」。
- 索引可搜、可看已认证；按款数排可以保留，但别把素材站和开源作者混成一种「已认证厂商」。末尾单列未署名。入驻说明收成一颗按钮。
- 字体库要能按厂商筛，否则厂商页是孤岛。合作署名（`阿里巴巴设计;汉仪字库`）两家都挂，或标「合作」。
- 不要：每家配色、访谈、空案例、设计师站和厂商站分家。

介绍、官网、标志：先在 `data/foundries.json` 手工补重点几家（寒蝉、汉仪、霞鹜、仓耳、方正、阿里）。认领通了再做厂商后台。

## 3. 开源作者标注（Windfonts）

**标的是人，不是又一张许可贴纸。** 「免费商用」≠ 开源。OFL / Apache 和千图「可商用」现在挤在同一档，必须拆开。

字典字段（`data/foundries.json`）：

```
kind: author | project | foundry | platform
openSource: true | false
claimed: true | false   # 缺省 false
```

| kind | 例子 | 开源作者？ |
|---|---|---|
| `author` | 落霞孤鹜、寒蝉、胡晓波 | 通常是 |
| `project` | 文泉驿、一点字坊、GNU、M+ | 通常是 |
| `foundry` | 汉仪、方正、华康、仓耳 | 否（除非某款字本身 OFL） |
| `platform` | 千图、包图、站酷、字魂 | 否 |

- 两枚可以并存：寒蝉 = 开源作者 + 免费商用。
- 出现位置：卡片 meta 一个词、详情、厂商 hero、字体库「开源」芯片。不要做成绿标墙。
- 许可档位仍是：免费商用 / 个人免费 / 需授权 / 待核实。

## 4. 缺字与造字（wenfeng.org）

产品顺序，不要一上来嵌编辑器：

1. **缺字报告**：粘贴文案，看这款字缺哪些。Windfonts 详情可链过来，检测本身放 org。
2. **开源工具补字**：只对允许修改的开源字体。补完必须 **改名再分发**，不得仍叫原字体、不得 silently 补进 CDN 原文件。
3. **已认领厂商**：缺字单交给作者，平台不代造再冒充原字。
4. **生僻字查询**：部件拼字，只回答「这个字长什么样」。
5. **AI 补字**：后做。生成结果是草稿，须人工收、改名、单独授权，不能当原 Webfont 的补丁直接上 CDN。

### 4.1 开源程序（已核对，2026-09-20）

| 项目 | 仓库 / 站 | 适合 org 的什么 | 注意 |
|---|---|---|---|
| **字玩 FontPlayer** | [HiToysMaker/fontplayer](https://github.com/HiToysMaker/fontplayer) · [font-player.com](https://www.font-player.com/) · [Web 演示](https://toysmaker.github.io/fontplayer_demo/) | 最像「专门给中文造字」的开源程序：骨架拼笔画、7000 字模板、导出 OTF；Vue3+Tauri，能挂 Web | 模板结构参考思源，不能拿模板直出字体去卖 |
| **GlyphWiki + KAGE** | [字形维基](https://zhs.glyphwiki.org/wiki/) · [kage-engine](https://github.com/kurgm/kage-engine) · [kage-editor](https://github.com/kurgm/kage-editor) | 生僻字 / 部件拼字、能出字体 | 系统宋/黑，对不上寒蝉、霞鹜笔形；站内数据著作权归 GlyphWiki |
| **Glyphr Studio 2** | [glyphr-studio-2](https://github.com/glyphr-studio/Glyphr-Studio-2) · [在线](https://www.glyphrstudio.com/app) | 纯前端轮廓编辑、导入导出，最轻可托管 | 西文编辑器思路，补几千汉字会累 |
| **Fontra** | [fontra/fontra](https://github.com/fontra/fontra) · [fontra.xyz](https://fontra.xyz) · GPL-3 | 以后多人协作改 CJK（`fontra-rcjk`） | 要 Python 服务端；改了必须开源；像工作室不像工具页 |
| **字统网** | [zi.tools](https://zi.tools/) | 查字、拆部件、对编码 | 不造字 |
| **字嗨** | [zi-hi.com](https://zi-hi.com/Homepage) | 字码/缺字知识（含日文字体排中文检查） | 不是编辑器 |
| **HanziGen** | [wangwenho/HanziGen](https://github.com/wangwenho/HanziGen) | 以后 AI 补字的参考实现（扩散模型、缺字集、向量化回 TTF） | 本机训练，每款字单独训；生成图≠可上架字形；不要嵌进站点当成品 |

优先跟 **字玩** 做 org 上的造字间；KAGE 只处理生僻字查询；Glyphr 作轻量「改两个字导出」；Fontra 等真有协作团队再上；HanziGen 路线留作 AI 阶段，不进 Windfonts 分发。

### 4.2 法律与产品红线

- OFL / 多数开源许可：**可以改字形再分发，必须换名字**，保留许可声明。
- 平台代补却仍用原 `family` / 原 CDN 路径 = 侵权，也骗了用字的人。
- org 的产物是「缺字报告 + 工具 + **改名后的派生字体 / 补字包**」；Windfonts CDN 只上架作者认可或明确派生的版本。
- 补一枚和原字同笔形的字是设计问题，不是嵌编辑器就完成。AI 输出默认当未审核草稿。

## 5. 样张文案（Windfonts，顺记）

列表默认、详情默认、控制条预设、字形墙、默认字号是 **平台设置**，不是项目设置，也不写死在 JS。

- 后台改默认；访客控制条只覆盖本机。
- 没改过的人跟后台；后台改默认时只清「恰好等于旧默认」的覆盖。
- 数据层已在 `WFProto`（`wf-proto-specimen-cfg.v1`）。设置页和前台读取尚未接完（2026-09-20 工位锁打断）。
- 以后公开接口：`GET /v1/site/specimen`（不必登录）；写入走运营后台。

## 6. 建议工期（跨仓）

本仓（Windfonts 前端）可先做：

1. 授权依据（[LICENSE.md](LICENSE.md)）：详情引用条、厂商 kind、库 `?foundry=` / 开源 / 素材平台、选字袋按字列出处。
2. 认证两枚拆开；厂商单页改为字先于名片。
3. 接完样张后台设置。
4. 详情链到 org：许可原文、源文件（若有）、缺字报告（org 就绪后再亮）。

org 仓（尚未在本仓库）：

1. 站点骨架：授权页（已有 URL 口径）、源文件下载、缺字检测。
2. 挂字玩或 Glyphr，OFL 改名导出。
3. 认领作者的缺字工单。
4. 再评估 Fontra 协作与 HanziGen / 自训模型。

## 7. 不要做的

- 在 Windfonts 控制台里做造字编辑器或 AI 补字工作室。
- 把 features 上的空「作品展示」当成案例产品。
- 用 AI 生成字形直接写回 `cn.windfonts.com/wenfeng/fonts/{slug}/`。
- 给每个项目单独配一套全站预览文案。
- 通知中心、webhook、AI 选字：排在认证、项目 CSS、授权购买之后。
