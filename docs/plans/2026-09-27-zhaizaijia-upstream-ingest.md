# 天天宅在家 上游入库交接（2026-09-27）

Foundry 轨 **C5**。为宅在家粉条甜 / 麦克笔 / 自动笔（Zzft / Zzmk / Zzzd）钉谱系上游名 **天天宅在家**。**CDN STOPPED**；不跑 vault docker / 不 bump analysis。

## 许可证核实（重要）

| 角色 | 许可 | 说明 |
|---|---|---|
| 原作 starlove0425（天天宅在家） | **作者声明完全免费**（**非 OFL**） | 巴哈姆特：「镶嵌改作商标都随便使用」「想用就抓，用好用满」「随便抓随便用，就跟思源黑体一样」 |
| FWHP 再发三款 | **SIL OFL 1.1** | https://github.com/FWHP-Enfun/Star-Love-Font — 目录已入库 |

### 决策

- **无** 名单一「天天宅在家.ttf」可钉（三款各自独立；原作在 Google Drive / reurl，无稳定 sha）。
- 按缺口扫描「可仅占位 + 链到 FWHP 三款」：目录 **stub** 名精确为 `天天宅在家`，使 `findFontByName` 对三款 `upstreamName` 命中。
- **勿** 把 stub 标成 OFL；OFL 仅描述 FWHP 再发面。

## 钉死（目录占位）

| 项 | 值 |
|---|---|
| 作者 | 天天宅在家 / starlove0425 |
| 小屋 | https://home.gamer.com.tw/home.php?owner=starlove0425 |
| 创作例 | 自动笔 sn=4470108 · 粉条甜 sn=5378926 · 麦克笔 sn=4662078 |
| Norm | `Zhaizaijia` |
| family | `wenfeng-zhaizaijia` |
| 目录名 | **天天宅在家** |
| version | `lineage-stub` |
| packages | **无** |

## 血缘修复（C → A）

| fork | upstreamName | 备注 |
|---|---|---|
| 宅在家粉条甜 | **天天宅在家** | `upstreamOwnerId`→**starlove**；group `zhaizaijia` |
| 宅在家麦克笔 | **天天宅在家** | 同上 |
| 宅在家自动笔 | **天天宅在家** | 同上 |

- 新 `byName` original：`天天宅在家`
- `UPSTREAM_FONT` 补：`Star Love` / `StarLove` / `宅在家系列`
- foundries 新：`starlove`

## Staging / park / packages

- park：`/Users/feibisi-studio/Projects/_fonts_park/zhaizaijia-2026-09-27`
- lab staging：`staging/zhaizaijia-2026-09-27/`
- packages：无
- licenses：`font-licenses/licenses/Zhaizaijia/{LICENSE,license-info.json}`（作者声明摘录；明确非 OFL）
- 机器 JSON：`docs/_oss-ingest-zhaizaijia-2026-09-27.json`
- register 起草：`fonts-vault/scripts/register-zhaizaijia-upstream.js`（**未跑**）

## Bot 清单

1. 复核：stub 许可不得写成 OFL；FWHP 三款保持 OFL。
2. 若要钉原作 TTF：需稳定直链 + sha256（巴哈 Drive）；再决定是否升 stub。优先继续以 FWHP 字节为货架面。
3. vault — `CONFIRM_ZHAIZAIJIA_REGISTER=1 docker exec fonts-vault node /app/register-zhaizaijia-upstream.js`（先备份）。本波 **不 exec**。
4. **CDN 闸门** — STOPPED。勿 bump `ANALYSIS_META_VER`。
5. 三款 FWHP packages 已在既有 batch2；本波不重摄。

## 不要做

- 不要上传 OSS / CDN / 生产。
- 不要把「天天宅在家」stub 标成 OFL。
- 不要 docker exec vault register。
- 不要把 FWHP 三款的 upstreamName 改成彼此或改成英文内部名。
- 不要 clobber SmartFontUI tip 或并行脏 `app/*`。
