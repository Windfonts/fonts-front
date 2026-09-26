# 客户端性能 · 2026-09-26（fonts-front lab）

说人话：这一轮只动浏览器侧。静态站（OSS）+ CyberCDN 只负责把 HTML/JS/JSON/字体包送下去；**算字数、估体积、导出 CSV、缓存目录、导出谱系图**——都是用户本机浏览器干的。Foundry / Motuicons 店面不在这次范围。

## 浏览器里现在跑什么

| 能力 | 哪里 | 说明 |
|------|------|------|
| 子集「本机估算」 | `app/subset.html` → `app-subset.js` | 去重字数、CJK/西文拆分、woff2 体积估算、子集对比。不打 vault、不打 CDN 算力。 |
| 选字袋 CSV/JSON | `shopping-bag.html` → `bag.js` | 本机生成文件下载；CSV 走 `WFApp.toCsv` + `download`。 |
| 谱系 PNG/SVG | `lineage.html` | `html-to-image` **首点导出才加载**；`lineage-export.js` 仍首屏带上（小）。 |
| 目录弱网缓存 | `wf-proto.js` `loadCatalog` | Cache API `wf-catalog-v1`，键=完整 URL（含 `?v=`）。网络成功写缓存；慢/挂了读缓存。 |
| 用量 CSV 等 | `app/usage.html`（既有） | 客户端拼表下载，未改。 |

## 这次落地了什么

1. **子集工作台**：侧栏标明「本机估算」；文字模式展示汉字 / 西文数字 / 标点等构成；文案写清「非服务器实测」。未新拉 `package-sizes.json`（子集页本来没挂 WFLive）。
2. **选字袋**：在「导出 JSON」旁加「导出 CSV」→ `文风字体-选字袋.csv`（名称 / family / id / 厂商 / 分类 / 字重 / 许可）。
3. **谱系导出懒加载**：去掉 `lineage.html` 里急切的 `html-to-image.js`；点 PNG/SVG 再注入脚本，按钮短暂 `…` / disabled。
4. **目录 Cache API**：`fonts.json`、foundries、evidence、lineage、avatars 都走 `fetchJsonCached`；`fonts.json` 也带上 `?v=20260926perf1`。
5. **Worker**：大段文字 `uniqueChars` 没上 Worker——页面抽取上限约 8k，主线程去重足够轻；若以后放开超大粘贴再加。**不要**把 html-to-image 的 DOM 捕获塞进 Worker。

## 仍然在服务端 / 边缘的

- **CSS / 字体包**：`vault` 的 `/api/css`（或 CDN 回源）按 family/weight/subset 出包；浏览器只引用。
- **用量聚合**：投递字节、按字体维度等靠 vault 统计；前端只展示/导出已拿到的数。
- **发布 / 认领 / 项目同步**：写 vault 的 API；本机 mock 除外。
- **Claim status 覆盖层**：`loadCatalog` 里仍会顺带打 vault（失败则忽略），**没**进 Cache API（动态、按用户）。

## 怎么自测

- 子集：打开 `http://127.0.0.1:16016/app/subset.html`，贴一段中英混排 → 侧栏应见「本机估算」+ 字符构成；改模式看对比行。
- 选字袋：袋里有字 →「导出 CSV」应下到 `文风字体-选字袋.csv`；JSON 仍在。
- 谱系：Network 面板确认首屏**没有** `html-to-image.js`；点 PNG 后才出现，并出图。
- 弱网：DevTools → Offline 前先在线加载一次目录；再 offline 刷新，目录应仍能从 Cache 出来（claim-status 可以挂）。

## 残余限制

- 子集体积是公式估算，不是真实子集化后的 woff2 体积。
- Cache API 在隐私模式 / 无 caches 环境会安静降级为普通 fetch。
- 谱系导出仍依赖 DOM（html-to-image），大图谱可能慢或占内存。
- 未做域名白名单助手、未做选字袋多样张工作室。

本地提交，**不要 push**。
