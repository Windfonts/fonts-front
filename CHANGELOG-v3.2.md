# CHANGELOG · prototypes v3.2 feature restore

**2026-09-19 (Asia/Shanghai)**

## Why

v3 / v3.1 locked the **next-windfonts bones** (vertical list, TAGS, ActionArea stage, elegant zinc/black) but dropped several old Layout / bag / embed capabilities. v3.2 restores them **without** regressing to card grids or beige.

## Restored

| Area | Behavior |
|------|----------|
| **A · Fonts chrome** | `site-chrome` = `nav-bg.webp` + dark overlay; white 首页/字体库/文档; **NavSearch** pill (Enter → `?keyword=`); bag icon + badge → `shopping-bag.html` |
| **B · shopping-bag.html** | 「已获取 N 个字体」· 删除所有 · 共享样本/字号 · ItemFont `status=operation`（下载+移除）· 空态 · 「查看如何使用」→ docs · localStorage |
| **C · font-embed.html** | 面包屑 · 当前+选字袋勾选 · 含所有字重 · tabs link/@import · 复制 · CSS 示例 · `app.windfonts.com/api/css?family=…&weight=` |
| **D · font-detail** | 获取嵌入代码 / 下载 / 添加↔移除 · 文字色/背景色 · 保存预览 PNG · tip 保留 |
| **E · fonts list** | `?tag=` + `?keyword=` / NavSearch 过滤 · join 同步选字态 |
| **F · Home** | placeholder「搜索海量免费字体」· Enter → `fonts.html?keyword=` |
| **G · docs.html** | getting-started（link / @import / CSS） |
| **H · Admin** | 仍五栏 vision；README 注明 next-windfonts admin 为字体管理/上传 |

## JS

`wf-proto.js`: `getPicks` / `removePick` / `clearPicks` / `togglePick` / `syncJoinButtons` / `applyListFilters` / `bindNavSearch` / `cssUrl`

## Taste

Still: white / zinc / black CTA · vertical rows · 180–220ms ease · no card wall · no beige.
