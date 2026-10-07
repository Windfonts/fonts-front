# fonts-front

`app.windfonts.com` 的静态店面。本仓不是 `/api/css` 的数据库，也不是 `wenfeng.org` 的目录。

## 三份店面数据，各管一件事

| 文件 | 管什么 | 不要拿它做 |
|---|---|---|
| `data/fonts.json` | 目录作者文件（胖） | 手改 `charCount`；整文件导出覆盖简介、许可手写列 |
| `data/fonts-list.json` | 列表热路径（瘦） | 直接当作者文件改完不回写 `fonts.json` |
| `data/font-products.json` | 一个产品下多规格怎么并成一张卡 | 嵌入身份。嵌入用成员自己的 `family` |
| `data/font-lineage.json` | 谱系关系 | 目录收录名单 |
| `data/family-aliases.json` | 旧短码 → 现在的 `family` | 整份覆盖 vault（vault 只收目标在库里的键） |

热列表缓存键在 `js/wf-proto.js` 的 `catalogUrl()`。改了列表就要换 `?v=`。

## 一个字的四个名字

- **嵌入** `family`：`wenfeng-{短码}`。复制出去的 `/api/css?family=` 用它。
- **公开地址**：`/fonts/{短码}`。已确认改掉的 11 条用新短码。其余已发布的短码不要再改。
- **包目录** `normalized`：OSS `fonts-packages/{小写}/`。和短码可以不同。不要为了短码改目录。
- **接口内部字体名**：`result.css` 里的 `WF-{Normalized}`。不要写进页面样式。

2026-10-07 已确认的 11 条，目录 `family` 和嵌入都用新短码。旧码只做别名。

| 旧 | 新 |
|---|---|
| `xwbright` | `xwwkb` |
| `xwbrightcode` | `xwwkbc` |
| `wenkaimono` | `xwwkdk` |
| `wenkaimonotc` | `xwwkdktc` |
| `xwxxhcode` / `xwxxhplus` / `xwxxhscreen` / `xwxxhscreenfull` | `xwxxhc` / `xwxxhp` / `xwxxhs` / `xwxxhsf` |
| `xwxzsplus` / `xwxzsscreen` / `xwxzsscreenfull` | `xwxzsp` / `xwxzss` / `xwxzssf` |

现网 vault `fontFamily` 已于 2026-10-07 改成店面短码，`/api/css` 旧码走 vault 别名。杭州静态店面仍未发。不要整份店面别名覆盖 vault。

OSS 旧版本对过：杭州桶 `wenfeng-web-hz` 的 `data/fonts.json.bak-*` 共 13 份（2026-09-24）。和今天线上 `data/fonts.json` 比，同一 `normalized` 的 `family` 没有一条不同。不要用那堆备份把这 11 条改回去。

family 一律小写。原先大写上游 id 的 34 条改成 `wenfeng-` + 小写（`BpmfGenYoMin` → `wenfeng-bpmfgenyomin`）。`normalized` 仍是原来的大小写，OSS 目录仍是它的小写。不要另起拼音首字母。

## 发版

- 静态页：`bash scripts/deploy-web-hz.sh`，桶 `wenfeng-web-hz`（杭州）。Mac 没有 wenpai 的写钥匙。不要用 `scripts/deploy-oss-front.sh`。
- 不要整树上传。`docs/`、`*.md` 不进桶。
- 改了 `wf-proto.js` 或 `fonts-list.json`，所有引用它们的 HTML 要换 `?v=`，否则边缘最长按 7 天吃旧文件。

## 不要做

- 不要把 `v4-specimen` 的目录合进 `main` 来改首页张数。
- 不要把动态嵌入改成 `fonts-packages/.../result.css`。预览可以读包，复制给用户的仍是 `/api/css?family=&weight=&version=`。
- 不要把接口改成 `family=&charset=&purpose=`，除非人明确同意，并且 vault 和边缘一起改。
- 谱系画布样式在 `css/lineage.css`（`.lfl-*`）。不要只换 `lineage.js` 不换这份 CSS。
