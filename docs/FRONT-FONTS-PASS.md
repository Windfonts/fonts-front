# 字库页前端打磨 · Phase 1

日期：2026-09-25（Asia/Shanghai）  
分支：`v4-specimen`  
范围：`fonts.html`（不含首页留白 / 顶栏密度 / app 控制台）

## 证据 → 处理

| 问题 | 证据 | 处理 |
| --- | --- | --- |
| 左栏「分类」空壳 | `data/fonts.json` 471 条 `category` 全空；备份仍有分类；基线截图分类下无条目 | 按 id/family/name 回填 378；tags 保守推断 42；仍空 51。无条目不渲染分类标题 |
| 风格/分类应先读 | 原顺序：分类 → 风格 → 厂商 | **风格 → 分类 → 厂商 → 字重…** |
| 厂商压过筛选 | 默认前 8 家 | 默认前 **6** 家 +「更多 N 家」；选中钉住 |
| 「共 N，已显示 12」像库只有 12 | 首屏文案 | **「库内 N 款 · 已加载 k / N · 下滑加载更多」** |
| 筛选空态弱 | 单行链接 | 筛选空专用文案 +「清除全部筛选」 |
| 无限滚动偶发停 | sentinel 400px | 600px；首屏不满再补页 |
| 许可不醒目 | 元信息纯文本 | `.lic-chip` 灰底胶囊（B soft：fill，无投影） |
| 大样张行节奏 / CTA | 偏紧、加入袋偏灰 | gap↑；`.act` fill，hover 翻墨 |

## 改动文件

- `data/fonts.json` — 回填/推断 `category`（产品折叠 421 未改）
- `js/pages/fonts.js` — 侧栏顺序、空 facet、计数、空态、哨兵
- `js/wf-specimen.js` — 许可芯片
- `css/specimen.css` / `css/site.css` — 芯片、行距、CTA、空态
- `fonts.html` — 缓存戳 `20260925s`
- `docs/FRONT-FONTS-PASS.md` — 本页

## 截图

`~/Downloads/wf-audit/fonts-phase1/`

- `01-fonts-baseline.png` 改前
- `03-fonts-after.png` 改后首屏
- `04-fonts-scrolled.png` 下滚粘滞
- `05-fonts-filter-empty.png` 故意筛空

## CDP 验收

- facets：`风格|分类|厂商|字重|语言|许可|出处|开源`
- count：`库内 421 款 · 已加载 12 / 421 · 下滑加载更多`（首屏补页后可见 24）
- `.lic-chip` ×12；分类条目 8

## 手验

1. `http://127.0.0.1:16016/fonts.html` 硬刷新  
2. 左栏顶为风格；分类有黑体/手写等  
3. 厂商默认约 6 家，点更多展开  
4. 计数为「库内 421…」  
5. 许可灰胶囊；加入选字袋 hover 翻墨  
6. 控制条粘滞；筛到 0 可清除  

## 未做 / 余量

- 51 款仍无分类 — 不瞎填  
- 顶栏密度、首页 hero — 不做  
- `wf-features.js` — 保留  
- 选字袋 / 详情 — Phase 2  
- 暗色 — Phase 3  

---

# Phase 2 · 选字袋 + 字体详情

## 改了什么

| 项 | 文件 | 说明 |
| --- | --- | --- |
| `bag.html` → `shopping-bag.html` | （已有） | 验收：query/hash 保留（`?x=1#y`） |
| 袋内行与库同款许可芯片 | `js/pages/bag.js` | 对比列 + 表「授权」列用 `.lic-chip` |
| 袋内产品脚注 | `shopping-bag.html` + `bag.js` | 补载 `wf-products.js`；`renderRows` 传 `foot` |
| 详情许可芯片 | `js/pages/detail.js` `css/detail.css` | 标题 meta + 授权头与库同款 |
| 缓存戳 | `shopping-bag.html` `font-detail.html` | `20260925s` |

## 截图

`~/Downloads/wf-audit/fonts-phase2/`

- `01-bag-empty.png` / `02-bag-filled.png` / `03-bag-compare.png` / `04-detail.png`（改前）
- `05-bag-after.png` / `06-bag-compare-after.png` / `07-detail-after.png`（改后）

## CDP 验收

- 袋内 3 行 → 3× `.lic-chip`；对比视图 6×（列+表）
- `bag.html?x=1#y` → `/shopping-bag.html?x=1#y`
- 详情 `阿里巴巴普惠体`：2× chip；按钮「加入选字袋」

## 未做 / 余量

- 「添加到项目」仍进登录（产品决策，未改）
- 授权文案逻辑（开源/免费商用/需授权）未改口径，只统一芯片外观

---

# Phase 3 · 深色主题抽检

## 方法

- `?theme=dark` 走 `wf-chrome`（写入 `localStorage.wf-theme`）
- CDP 对比度抽样 + 截图：首页 / 字库 / 详情 / 选字袋 / 文档
- 另测：`prefers-color-scheme: dark` **且无** `data-theme` → 应保持浅色默认（不跟系统强行翻黑）

## 结果

| 页 | 对比度 | sticky | 备注 |
| --- | --- | --- | --- |
| 首页 | body/ink ≥16 | topbar ok | 无坏点 |
| 字库 | controlbar sticky top=64, z=30；bg=`--page` 不透 | 下滚后控制条仍盖住内容 | 分类/风格/芯片可读 |
| 详情 | CTA 为 ink-on-paper（有意） | 侧栏 sticky | 许可芯片可读 |
| 选字袋 | ok | controlbar ok | 空态可读 |
| 文档 | ok | — | — |
| OS dark 偏好 + 无 data-theme | 仍浅色 token | — | **无强行翻黑回归** |

硬编码浅色：仅 `.sp-qr { background:#fff }`（二维码需白底），保留。

## 改动

- `css/tokens.css`：`:root { color-scheme: light }` / `[data-theme=dark] { color-scheme: dark }`，原生控件（滚动条/表单）跟主题
- 相关页 `tokens.css` 缓存戳 → `20260925t`

## 截图

`~/Downloads/wf-audit/fonts-phase3/`

`01`…`05` 深色五页；`06` OS 偏好深色但 UI 浅色；`07` 字库深色下滚 sticky

## 余量

- 未改浅色默认视觉
- 未动 app 控制台

---

# 许可标签视觉锁（2026-09-25 晚）

| 位置 | 定稿 |
| --- | --- |
| 字库列表 / 选字袋行 / 详情**标题** meta | 「免费商用」「开源商用」**无胶囊底**，跟 meta 同级灰字 |
| 详情「授权」头 `.license-head .tier` | 开源档 **绿底白字**（原 `.tier` 尺寸）；非开源仍墨底 |

后续再动这类细节 → 先多版对照，见 `FRONTEND-STANDARDS.md` §4.1。

---

# 字符表 / 现网分析（2026-09-25 · 定稿丙）

对照：`detail-glyphs-options.html` → **丙 · 仅开发可见**。

| | |
| --- | --- |
| 设计视图 | 字符表照常；无「对照现网」按钮、无分析灰盒 |
| 开发视图 | 可点「对照现网字符表」；结果为 2×2 指标卡 + 来源，不再用 · 散文行 |
