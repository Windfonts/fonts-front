# 字体身份 · 产品规格 · 退役

> 2026-09-23。配合 `data/font-products.json`、`data/family-aliases.json`、CDN 嵌入口径。

## 1. 三层身份（勿混）

| 层 | 字段 / 文件 | 可变性 | 用途 |
|---|---|---|---|
| **嵌入身份** | `fonts.json` → `family`（`wenfeng-{短码}`） | **冻结**：已对外复制的永不改义 | `/api/css?family=`、用量、选字袋 |
| **包路径** | `normalized` → OSS `fonts-packages/{Norm}/` | 可迁，须别名或双写 | 预览 / 静态包 |
| **产品展示** | `font-products.json` | 可改 | 目录一张卡、详情规格 chip |

退役改的是嵌入身份的**解析目标**（别名），不是把多规格合成一个 `family`。

## 2. 现状与债

历史短码把字集 / 用途 / 等宽打进 `family`（如 `wenfeng-xwwkgbmonolite`）。  
后果：矩阵膨胀、退役粒度糊、嵌入示例易抄到冷门规格。

**不在此时**把动态 API 改成 `family=xwwk&charset=gb&purpose=lite`（须改 vault schema + 边缘，且要你点头）。  
先用产品表把语义收拢；API 形状保持 `family` + `weight` + `version`。

## 3. 收录与命名规则（即日起）

1. **新产品**：先定 `font-products` 一条；`default` 必须是主规格、可商用默认嵌入。
2. **短码**：2026-10-07 已确认的 11 条用新短码：`xwwk` / `xwwkgb` / `xwwktc` 不动；Bright `xwwkb`、Bright Code `xwwkbc`、等宽 `xwwkdk` / `xwwkdktc`；新晰黑与新致宋的 code/plus/screen/screen full 是 `xwxxhc` / `xwxxhp` / `xwxxhs` / `xwxxhsf`、`xwxzsp` / `xwxzss` / `xwxzssf`。旧码留在 `family-aliases.json`。现网库还不认新码，别名不要先放到 `/api/css`。OSS 目录仍是 `normalized` 小写。杭州桶 `data/fonts.json.bak-*`（2026-09-24，13 份）和今天线上 `fonts.json` 的 `family` 一致，不要用那堆把这 11 条改回去，也不要改其余已发布短码。
3. **扩规格**：可以继续用「词干 + 后缀」短码（兼容现网），但**必须**写入 `members[]`，并标 `tier`：
   - `primary`：目录 / 详情默认露出（字集主分支等）
   - `secondary`：常用优化（Lite / Screen / 等宽主款）
   - `advanced`：折叠进「更多规格」（Fusion、Screen Full、冷门组合）
4. **禁止**：为第四维再发明短码（例如再叠 NF / Hint / Region）而不进产品表。已发布且已有人嵌入的 `family` 不改。2026-10-07 那 11 条是人明确要改的，旧码留别名。不要把它们改回 `xwbright` 这类旧英文词。
5. **嵌入示例**：详情「获取代码」始终输出**当前规格**的具体 `family=`；列表 CTA / 文档默认示例只用 `products[].default`。
6. **简繁配对**：同产品用 `axes.charset`（`sc`/`tc`/…）；跨产品用 `localePeerProduct`（如狮尾简中↔繁中）。构建 `scripts/build-locale-fallback-pairs.mjs` → `data/locale-fallback-pairs.json`，vault `/api/css?localeFallback=` 认此表。

## 4. 退役流程

1. vault：`status=archived`（或 offline），包可留 OSS。
2. `family-aliases.json`：旧 `family` → 替代 `family`（须 published）。
3. 前台 / vault 别名同源；导出目录后确认旧码 `GET /api/css` 仍 200。
4. `font-products`：被替成员标 `tier: advanced` 或移出 `members`（若整支产品下线，产品 `status: retired`，`default` 改到替代产品默认款）。
5. **禁止**静默改 `default` 指向字集语义不同的包（完整 → GB）而不写进别名说明。

整支产品退役：为每个曾暴露的 `family` 各写一条别名，不要只改产品卡。

## 5. 以后若要参数化（可选，未开工）

候选：`family={canonical}&charset=&purpose=&width=`，由 `font-products` 解析到现有短码；旧短码永当别名。  
开做前须改 vault `cssApiSchema`、边缘、文档，并**明确同意**改动态口径。

## 6. 真源

- 产品 / 规格 / tier：`data/font-products.json`
- 嵌入别名：`data/family-aliases.json`（与 vault `/app/data/` 同步）
- 嵌入口径：[FRONTEND-STANDARDS.md](FRONTEND-STANDARDS.md) §7、`.cursor/rules/cdn-embed-contract.mdc`
