# Foundry 补丁：app 店面数据 P0（2026-10-14/15）

- **执行**：Foundry（只改本地工作树，**未** OSS 上传 / purge / 店面发布）
- **工作树**：`~/Projects/fonts-front-pro-1014`（分支 `pro/foundry-fixes-1014`）
- **对照**：改前 `fonts-list.json` md5 = `88997b8322c705754d912446d73dbc1b`（与现网一致）；`~/Projects/fonts-front` main **未动**（其 list md5 本就不一致）
- **改后 list md5**：`2ad1e04e720a32c7a578f6cbdf85c7b4`
- **备份**：`~/Projects/_bak-foundry-p0-data-20261015-rerun/`（放在 data/ 外，防被清）
- **重跑说明**：首轮写入后工作树曾被回滚到现网 md5；已按同名单于 00:1x 重放，校验通过
- **未做**：HTML `?v=`（P0-1/P0-5→Pro）、CDN 超时、生产 push

## 货架 license 分布

| | 开源商用 | 免费商用 | 待核实 | 个人免费 | 联系授权 | 双许可 |
|--|--:|--:|--:|--:|--:|--:|
| 改前 | 603 | 166 | 3 | 1 | 1 | 1 |
| 改后 | 619 | 151 | 3 | 1 | 1 | 0 |

Δ = P0-3×15 + P0-4×1 → 开源商用。

## P0-3：目录字段对齐 UI「开源商用」（15）

扫描逻辑同现网 `WFProto.OSS_LICENSE_RE`：`license=免费商用` 且 `licenseName` 命中开源/开放政府等白名单。
**未误伤**品牌「免费商用」（如阿里巴巴普惠体、OPPO Sans、975 圆体等仍为 `免费商用`）。

| normalized | 名称 | license 前→后 | licenseName（保留） |
|---|---|---|---|
| `astbspy` | 澳声通部首拼音库楷 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `astbszy` | 澳声通部首注音库楷 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `astpykk` | 澳声通拼音库楷 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `astpywkk` | 澳声通大拼音库楷 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `astzykk` | 澳声通注音库楷 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `astzywkk` | 澳声通大注音库楷 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `chusung` | 粗宋 | 免费商用 → **开源商用** | CC-BY-SA-4.0 |
| `fonsung` | 坊宋 | 免费商用 → **开源商用** | CC-BY-SA-4.0 |
| `hzpyt` | 汉字拼音体 | 免费商用 → **开源商用** | CC-BY-SA-4.0 |
| `lyusung` | 柳宋 | 免费商用 → **开源商用** | CC-BY-SA-4.0 |
| `qzkzkt` | 全字库正楷体 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `qzkzst` | 全字库正宋体 | 免费商用 → **开源商用** | 台湾省开放政府数据授权条款 1.0 |
| `symca` | 上元明朝 A | 免费商用 → **开源商用** | GlyphWiki 著作权与许可协议 |
| `symcb` | 上元明朝 B | 免费商用 → **开源商用** | GlyphWiki 著作权与许可协议 |
| `taipei-pixel` | 台北字体 | 免费商用 → **开源商用** | CC-BY-SA-4.0 |

同步文件：`fonts-list.json` + `fonts.json` + 对应 `fonts-by-slug/{normalized}.json`。

## P0-4：字嗨注音标楷双许可货架归位（1）

| normalized | 名称 | license 前→后 | licenseName（保留全文） |
|---|---|---|---|
| `zhzybk` | 字嗨注音标楷 | 双许可 → **开源商用** | 汉字 CC-BY-4.0 + 其余 OFL-1.1 |

`licenseFileUrl` 本已是 `cn.windfonts.com/.../zhzybk/license/original.txt`，未改。

## P0-2：菲码 `licenseFileUrl` → 文风开源许可页（67）

- **改前**：`https://feicode.com/Windfonts/font-licenses/src/branch/main/licenses/{PackDir}/LICENSE`（公网易 403）
- **改后**：`https://wenfeng.org/license/{normalized}/`（对本批 67 条 HEAD **全部 200**）
- **未用** `cn.windfonts.com/fonts-packages/{normalized}/license/original.txt`：本批探测 **全部 404**（AGENTS 偏好路径；待 Depot 补传原文后再可迁）
- **清空/藏链**：0（无需）
- **同步面**：`fonts-by-slug/*`（67）+ `fonts.json`（67）+ `fonts-detail.json` byId（67）
- **附带**：`license-evidence.json` → `names.仓耳.sourceUrl` 从菲码仓根改为 `https://wenfeng.org/license/cexwz/`，并弱化 quote 中私有仓表述

<details><summary>67 条名单（normalized → 新 URL）</summary>

| normalized | 名称 | 新 licenseFileUrl |
|---|---|---|
| `albbpht` | 阿里巴巴普惠体 | https://wenfeng.org/license/albbpht/ |
| `alhyznht` | 阿里汉仪智能黑体 | https://wenfeng.org/license/alhyznht/ |
| `almmdfdk` | 阿里妈妈东方大楷 | https://wenfeng.org/license/almmdfdk/ |
| `almmdlt` | 阿里妈妈刀隶体 | https://wenfeng.org/license/almmdlt/ |
| `almmsht` | 阿里妈妈数黑体 | https://wenfeng.org/license/almmsht/ |
| `btxbt` | 包图小白体 | https://wenfeng.org/license/btxbt/ |
| `cexwz` | 仓耳小丸子 | https://wenfeng.org/license/cexwz/ |
| `cezkzdbs` | 仓耳周珂正大榜书 | https://wenfeng.org/license/cezkzdbs/ |
| `cktjgt` | 创客贴金刚体 | https://wenfeng.org/license/cktjgt/ |
| `ddjbt` | 钉钉进步体 | https://wenfeng.org/license/ddjbt/ |
| `dlkjt` | 鼎猎客家体 | https://wenfeng.org/license/dlkjt/ |
| `dymht` | 抖音美好体 | https://wenfeng.org/license/dymht/ |
| `dyzgt` | 斗鱼追光体 | https://wenfeng.org/license/dyzgt/ |
| `ebaswcxt` | EBAS 无衬线体 | https://wenfeng.org/license/ebaswcxt/ |
| `gbhb` | 钢笔鹤-B | https://wenfeng.org/license/gbhb/ |
| `gfmft` | 龚帆免费体3.0 | https://wenfeng.org/license/gfmft/ |
| `gljgbt` | 光良酒-干杯体 | https://wenfeng.org/license/gljgbt/ |
| `hkhlssxt` | 黄凯桦律师手写体 | https://wenfeng.org/license/hkhlssxt/ |
| `hsmb` | 衡山毛笔 | https://wenfeng.org/license/hsmb/ |
| `hxbnst` | 胡晓波男神体 | https://wenfeng.org/license/hxbnst/ |
| `hxbsbt` | 胡晓波骚包体 | https://wenfeng.org/license/hxbsbt/ |
| `hxbzst` | 胡晓波真帅体 | https://wenfeng.org/license/hxbzst/ |
| `inkslyt` | I.Ngaan刻石录颜体 | https://wenfeng.org/license/inkslyt/ |
| `jnyyjyy` | 今年也要加油鸭 | https://wenfeng.org/license/jnyyjyy/ |
| `jsyjst` | 金山云技术体 | https://wenfeng.org/license/jsyjst/ |
| `jxzkt` | 江西拙楷体 | https://wenfeng.org/license/jxzkt/ |
| `jybbzks` | 教育部標準楷書 | https://wenfeng.org/license/jybbzks/ |
| `jybbzstun` | 教育部标准宋体UN | https://wenfeng.org/license/jybbzstun/ |
| `kksjt` | 快看世界体 | https://wenfeng.org/license/kksjt/ |
| `lhktss` | 刘欢卡通手书 | https://wenfeng.org/license/lhktss/ |
| `lhtt` | 临海体 | https://wenfeng.org/license/lhtt/ |
| `lmqylszrht` | 联盟起艺卢帅正锐黑体 | https://wenfeng.org/license/lmqylszrht/ |
| `misa` | 小米兰亭 Sans | https://wenfeng.org/license/misa/ |
| `myrbsxt` | 沐瑶软笔手写体 | https://wenfeng.org/license/myrbsxt/ |
| `pfhtt` | PFanHuTuTi | https://wenfeng.org/license/pfhtt/ |
| `pmzdbtt` | 庞门正道标题体 | https://wenfeng.org/license/pmzdbtt/ |
| `pmzdcst` | 庞门正道粗书体 | https://wenfeng.org/license/pmzdcst/ |
| `pmzdqst` | 庞门正道轻松体 | https://wenfeng.org/license/pmzdqst/ |
| `prsxt` | 品如手写体 | https://wenfeng.org/license/prsxt/ |
| `qtbfsxt` | 千图笔锋手写体 | https://wenfeng.org/license/qtbfsxt/ |
| `qthht` | 千图厚黑体 | https://wenfeng.org/license/qthht/ |
| `qtmksxt` | 千图马克手写体 | https://wenfeng.org/license/qtmksxt/ |
| `qtxht` | 千图学画体 | https://wenfeng.org/license/qtxht/ |
| `qtxmt` | 千图纤墨体 | https://wenfeng.org/license/qtxmt/ |
| `qtxtt` | 千图小兔体 | https://wenfeng.org/license/qtxtt/ |
| `scjskkt` | 素材集市康康体 | https://wenfeng.org/license/scjskkt/ |
| `stfyt` | 书体坊颜体 | https://wenfeng.org/license/stfyt/ |
| `stfzxfxct` | 书体坊禚效锋行草体 | https://wenfeng.org/license/stfzxfxct/ |
| `stmdxft` | 摄图摩登小方体 | https://wenfeng.org/license/stmdxft/ |
| `wcsf` | 问藏书房 | https://wenfeng.org/license/wcsf/ |
| `xet` | 贤二体 | https://wenfeng.org/license/xet/ |
| `xlfht` | 乡立方黑体 | https://wenfeng.org/license/xlfht/ |
| `xsszt` | 像素Silver字体 | https://wenfeng.org/license/xsszt/ |
| `xxmttw` | 新细明体 (台湾版) | https://wenfeng.org/license/xxmttw/ |
| `ydwxjhxt` | YDW 香蕉滑行++体 | https://wenfeng.org/license/ydwxjhxt/ |
| `yffyt` | 云峰飞云体 | https://wenfeng.org/license/yffyt/ |
| `yfzkzqscbbt` | 云峰字库重庆山城棒棒体 | https://wenfeng.org/license/yfzkzqscbbt/ |
| `ysbth` | 优设标题黑 | https://wenfeng.org/license/ysbth/ |
| `ysbzt` | 峄山碑篆体 | https://wenfeng.org/license/ysbzt/ |
| `zhbtt` | 字魂扁桃体 | https://wenfeng.org/license/zhbtt/ |
| `zjgljt` | 卓见橄榄简体 | https://wenfeng.org/license/zjgljt/ |
| `zkgdh` | 站酷高端黑 | https://wenfeng.org/license/zkgdh/ |
| `zkkh` | 站酷酷黑 | https://wenfeng.org/license/zkkh/ |
| `zkwyt` | 站酷文艺体 | https://wenfeng.org/license/zkwyt/ |
| `ztqxyjxs` | 字体圈-新意吉祥宋 | https://wenfeng.org/license/ztqxyjxs/ |
| `zygb` | 臻妍GB | https://wenfeng.org/license/zygb/ |
| `zysst` | 智勇手书体 | https://wenfeng.org/license/zysst/ |

</details>

## 待 Pro 同波发布文件清单

发版目标：杭州 `oss://wenfeng-web-hz`（店面静态 origin）。**本回合 Foundry 不传**；请 Pro 与 P0-1/P0-5（HTML `?v=` bump + `index.html`）同波。

### 根数据（4）

- `data/fonts-list.json`
- `data/fonts.json`
- `data/fonts-detail.json`
- `data/license-evidence.json`

### fonts-by-slug（83）

- `data/fonts-by-slug/albbpht.json`
- `data/fonts-by-slug/alhyznht.json`
- `data/fonts-by-slug/almmdfdk.json`
- `data/fonts-by-slug/almmdlt.json`
- `data/fonts-by-slug/almmsht.json`
- `data/fonts-by-slug/astbspy.json`
- `data/fonts-by-slug/astbszy.json`
- `data/fonts-by-slug/astpykk.json`
- `data/fonts-by-slug/astpywkk.json`
- `data/fonts-by-slug/astzykk.json`
- `data/fonts-by-slug/astzywkk.json`
- `data/fonts-by-slug/btxbt.json`
- `data/fonts-by-slug/cexwz.json`
- `data/fonts-by-slug/cezkzdbs.json`
- `data/fonts-by-slug/chusung.json`
- `data/fonts-by-slug/cktjgt.json`
- `data/fonts-by-slug/ddjbt.json`
- `data/fonts-by-slug/dlkjt.json`
- `data/fonts-by-slug/dymht.json`
- `data/fonts-by-slug/dyzgt.json`
- `data/fonts-by-slug/ebaswcxt.json`
- `data/fonts-by-slug/fonsung.json`
- `data/fonts-by-slug/gbhb.json`
- `data/fonts-by-slug/gfmft.json`
- `data/fonts-by-slug/gljgbt.json`
- `data/fonts-by-slug/hkhlssxt.json`
- `data/fonts-by-slug/hsmb.json`
- `data/fonts-by-slug/hxbnst.json`
- `data/fonts-by-slug/hxbsbt.json`
- `data/fonts-by-slug/hxbzst.json`
- `data/fonts-by-slug/hzpyt.json`
- `data/fonts-by-slug/inkslyt.json`
- `data/fonts-by-slug/jnyyjyy.json`
- `data/fonts-by-slug/jsyjst.json`
- `data/fonts-by-slug/jxzkt.json`
- `data/fonts-by-slug/jybbzks.json`
- `data/fonts-by-slug/jybbzstun.json`
- `data/fonts-by-slug/kksjt.json`
- `data/fonts-by-slug/lhktss.json`
- `data/fonts-by-slug/lhtt.json`
- `data/fonts-by-slug/lmqylszrht.json`
- `data/fonts-by-slug/lyusung.json`
- `data/fonts-by-slug/misa.json`
- `data/fonts-by-slug/myrbsxt.json`
- `data/fonts-by-slug/pfhtt.json`
- `data/fonts-by-slug/pmzdbtt.json`
- `data/fonts-by-slug/pmzdcst.json`
- `data/fonts-by-slug/pmzdqst.json`
- `data/fonts-by-slug/prsxt.json`
- `data/fonts-by-slug/qtbfsxt.json`
- `data/fonts-by-slug/qthht.json`
- `data/fonts-by-slug/qtmksxt.json`
- `data/fonts-by-slug/qtxht.json`
- `data/fonts-by-slug/qtxmt.json`
- `data/fonts-by-slug/qtxtt.json`
- `data/fonts-by-slug/qzkzkt.json`
- `data/fonts-by-slug/qzkzst.json`
- `data/fonts-by-slug/scjskkt.json`
- `data/fonts-by-slug/stfyt.json`
- `data/fonts-by-slug/stfzxfxct.json`
- `data/fonts-by-slug/stmdxft.json`
- `data/fonts-by-slug/symca.json`
- `data/fonts-by-slug/symcb.json`
- `data/fonts-by-slug/taipei-pixel.json`
- `data/fonts-by-slug/wcsf.json`
- `data/fonts-by-slug/xet.json`
- `data/fonts-by-slug/xlfht.json`
- `data/fonts-by-slug/xsszt.json`
- `data/fonts-by-slug/xxmttw.json`
- `data/fonts-by-slug/ydwxjhxt.json`
- `data/fonts-by-slug/yffyt.json`
- `data/fonts-by-slug/yfzkzqscbbt.json`
- `data/fonts-by-slug/ysbth.json`
- `data/fonts-by-slug/ysbzt.json`
- `data/fonts-by-slug/zhbtt.json`
- `data/fonts-by-slug/zhzybk.json`
- `data/fonts-by-slug/zjgljt.json`
- `data/fonts-by-slug/zkgdh.json`
- `data/fonts-by-slug/zkkh.json`
- `data/fonts-by-slug/zkwyt.json`
- `data/fonts-by-slug/ztqxyjxs.json`
- `data/fonts-by-slug/zygb.json`
- `data/fonts-by-slug/zysst.json`

### 发版注意

1. 换数据应同时 bump HTML 内 `wf-proto.js` / list 的 `?v=`（P0-1；Pro）。
2. 建议 catalog 戳例：`fonts-list.json?v=20261015p0data`（Pro 定最终戳）。
3. 勿从 `fonts-front` **main** 发版（list ≠ 现网）；以 **pro-1014** 本树为准。
4. 可选后续（Depot，非本波阻塞）：为上述 67 款补传 `fonts-packages/{norm}/license/original.txt`，再把指针迁回 AGENTS 偏好 CDN 路径。

## 阻塞点

- **无阻塞**数据侧 P0-2/3/4 本地已就绪。
- 发布闸：等 Pro 同波 + Feng/父代理确认后再上杭州桶（本回合按委托默认不传）。
- `cn.../license/original.txt` 对本批缺失：不阻塞（已用 org 200 页）。

## 抽测

| slug | 期望 | 结果 |
|---|---|---|
| albbpht | 仍免费商用；url→org | ✅ |
| hzpyt / symca / astzykk | license=开源商用 | ✅ |
| zhzybk | license=开源商用；licenseName 保留双许可全文 | ✅ |
| zkwyt | 仍联系授权；url→org | ✅ |
| OSS_LICENSE_RE 命中且非开源商用 | 0 | ✅ |
| data/ 非 _bak 下 feicode.com | 0 | ✅ |

