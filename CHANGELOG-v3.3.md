# CHANGELOG · prototypes v3.3 — P0 gap close

**Date:** 2026-09-19 (Asia/Shanghai)  
**Goal:** Close product gaps vs next-windfonts while keeping **v3.1 visual language** (no card grid on public fonts list).

## Done

### 1. Fonts list = real shelf
- `fonts.html` no longer hardcodes 8 rows.
- Renders from `data/fonts.json` (**128** live dump fonts) via `WFProto.mountFontsList`.
- ItemFont rows: name · 作者 · 可选样式 N · large preview with shared sample/size.
- Infinite scroll +「加载更多」(page size 10).
- Filter `?tag=` (tags / category / name) and `?keyword=` / NavSearch.
- Count:「共找到 N 个字体，已显示 M 个」.
- Lazy `<link>` CSS: `https://app.windfonts.com/api/css?family={family}&weight=400` (429-tolerant); `font-family` set to family + windfonts-* + system fallback.
- Row click → `font-detail.html?id={uuid}`.

### 2. Detail for ANY font
- `font-detail.html?id=` loads catalog entry; populates name / designer / desc / category / tags / weights.
- ActionArea uses that family; embed + download carry `id`.
- Missing id → first catalog font (or empty state).

### 3. Footer EXTRA_LINKS (old Layout)
- On fonts / detail / bag / embed / docs / home:  
  文风字体 · Cravatar · adminCDN · 赛博字库 · 文派开源 · 字体下载 + SAFE_CODE copyright.
- Home dark footer aligned with same links.

### 4. Admin = next-windfonts manage / upload
- **Primary:** `admin/manage.html` (table + keyword/category/tags filters on fonts.json), `admin/upload.html` (drop zone + fields stub).
- Sidebar: 字体管理 / 字体上传 first; vision five-nav under「新运营台」.
- `admin/index.html` → manage.

### 5. Docs denser
- Sidebar TOC + sections: link CSS、@import、选字袋、嵌入页、参数、许可 — real code samples.

### 6. Shopping bag / embed
- Bag resolves real names from catalog ids.
- Embed loads current font from `?id=`; codes use catalog family/weights.

## Files
| Path | Change |
|------|--------|
| `data/fonts.json` | Catalog (pre-existing dump) |
| `js/wf-proto.js` | Catalog loader · list mount · footer · weight map |
| `fonts.html` / `font-detail.html` / `shopping-bag.html` / `font-embed.html` / `docs.html` / `index.html` | Wired to catalog + footer |
| `admin/manage.html` / `admin/upload.html` | New primary admin |
| `admin/*.html` | Sidebar primary + vision |
| `css/wenfeng.css` | Footer · docs layout · upload · load-more |

## Known stubs (still)
- Login / NextAuth — not prototyped
- Real font file download / OSS — alert stub only
- Admin DB write / upload POST — client-only stub
- CSS API 429 under heavy lazy-load — expected; fallbacks remain
