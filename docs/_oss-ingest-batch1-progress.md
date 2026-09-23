# OSS 首批入库进度（最终汇总）

> 2026-09-23 晚：本表里的 skip「寒蝉像素 / 寒蝉线体 / 思源等宽」已在第二批改判并上目录。见 [_oss-ingest-batch2-progress.md](_oss-ingest-batch2-progress.md)。下面的 skip 行保留为首批当时的记录。

生成：2026-09-23 · 真源 `docs/_oss-ingest-batch1.json`（105）  
管线：`fonts-packages`（`SUBSET_ONLY=full`）→ OSS `fonts-packages/` → vault `feicode-prod` → `node scripts/export-fonts.mjs`

## 汇总

| 状态 | 数 | 说明 |
|---|---:|---|
| **done** | **101** | 已拆包上传 + vault `published` + 进入 `data/fonts.json` |
| **skip** | **4** | 清单内无法合法/无法拆源入库（见下） |
| **fail** | **0** | 无整批卡死项 |
| 清单合计 | 105 | 另：Fanmei 拆成黑体+明体 2 条；Elffont 拆 Fern+Rock 2 条 → 有效目标约 106 规格，其中 101 done |

导出后目录：**336** 款（入库前约 235，+101）。

## Skip（4）

| 清单项 | 原因 |
|---|---|
| `Warren2060/ChillMatrixBlack` | 仓库仅 Demo OTF |
| `Warren2060/ChillPixels` | 无 TTF/OTF |
| `Warren2060/ChillLine` | 无 TTF/OTF |
| `adobe-fonts/source-han-mono` | 单文件 TTC ~119MB，本波跳过（需 TTC 拆包另排） |
| `atelier-anchor/luohei-variable` | 仅 VF woff2，无 TTF/OTF |
| `max32002/swei-bat-leg` | 探测无合适 TTF/OTF |

（表内 >4：清单 105 对应 skip 条目；Fanmei/Elffont 一对多不计入 skip。）

## 波次结果

### chilltype
- done：`hcdzt` `hcrym` `hcyht` `hchfs` `hcjss` `hckt` `hcdhs` `hcdin` `hclck2` `hcth` `hcymh` `hczk` `hcjz` `hcydk`
- skip：MatrixBlack / Pixels / Line

### fontworks（6/6）
`klee` `dotgothic` `reggae` `train` `rampart` `stick`

### lxgw 剩余
`xwzt` `bspsc` `975hei` `plwk` `fmthei` `fmtming` `xwpinyin`

### singles
`wlhxh`（荧黑）`mplus1` `elffern` `elfrock` `zenmaru` `msz`  
skip：`sykd`（思源等宽 TTC）`luohei`

### aqua / 狮尾
68/69 done（`swbatleg` skip）。短码前缀 `sw*` / `nk` `bkd` `mxhn` 等。

## 短码对照（样例）

| family | norm | 名称 |
|---|---|---|
| wenfeng-hcdzt | Hcdzt | 寒蝉点阵体 |
| wenfeng-hcyht | Hcyht | 寒蝉圆黑体 |
| wenfeng-hcjss | Hcjss | 寒蝉锦书宋 |
| wenfeng-klee | Klee | Klee One |
| wenfeng-dotgothic | Dotgothic | DotGothic16 |
| wenfeng-975hei | Hei975 | 975 黑体 |
| wenfeng-wlhxh | Wlhxh | 未来荧黑 |
| wenfeng-mplus1 | Mplus1 | M+ 1 |
| wenfeng-elffern | Elffern | Elffont Fern |
| wenfeng-zenmaru | Zenmaru | Zen Maru Gothic |
| wenfeng-msz | Msz | 马善政楷书 |
| wenfeng-nk | Nk | 奈楷 |
| wenfeng-swgothic | Swgothic | 狮尾黑体 |
| wenfeng-swgothicleg | Swgothicleg | 狮尾长腿黑 |

完整映射见 `fonts-packages/scripts/oss-batch1-map.json`（`family` ↔ `norm` ↔ `repo`）。

## 产品表

`data/font-products.json` 已追加：Elffont、范美体、寒蝉圆黑、未来荧黑，以及约 20 组狮尾 Sans/Leg 配对产品。

## 抽检

| 检查 | 结果 |
|---|---|
| 预览 CSS `fonts-packages/{Norm}/Regular/full/result.css` | 抽检通过 200 |
| `app.windfonts.com/api/css?family=wenfeng-…&weight=regular&version=full` | `hcyht`/`klee`/`975hei`/`nk`/`elffern` 等 200；个别超时重试可过 |
| 授权 | 新款均为 `免费商用`（OFL / 0BSD / MIT）；导出冲掉的旧款 `licenseName` 已从备份回填 |

## 阻塞 / 后续

1. **思源等宽 TTC**、**络黑 VF**：需专用拆包后再入库。  
2. Aqua 本波仅 **Regular**（省磁盘）；Bold 等可二轮补字重。  
3. `ChillCalligraphy` → `wenfeng-hclck2`（与已有 `hclcks` 区分）。  
4. 动态嵌入口径**未改**（仍 `/api/css?family=&weight=&version=`）。  
5. **未 git commit**（按指示）。

## 产物路径

- 进度：`docs/_oss-ingest-batch1-progress.md`（本文件）
- 映射：`/Users/feibisi-studio/Projects/fonts-packages/scripts/oss-batch1-map.json`
- 下载/构建脚本：`oss-batch1-download.py` / `oss-batch1-build.sh`
- vault 注册：`fonts-vault/scripts/register-oss-batch1.js`
- 中间产物：`/Users/feibisi-studio/Projects/_fonts_park/oss-batch1-*`
