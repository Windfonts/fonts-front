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
