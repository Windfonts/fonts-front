# Catalog contract · list=thin / detail=fat

Lab tip `pro/perf-extreme-bd` formalizes the thin/fat split already started on `e734bb5`.

## SoT

| Surface | Artifact | Shape |
|---------|----------|--------|
| List / search / foundry cards / home forest | `data/fonts-list.json` | **thin** — card + filter + sort fields only |
| Font detail enrich | `data/fonts-by-slug/{Normalized}.json` | **fat** — thin fields + description / copyright / license URLs / version / purchaseUrl |
| Detail enrich fallback index | `data/fonts-detail.json` | `byId` fat map + `bySlug` → filename stem |
| Authoring / rebuild input | `data/fonts.json` | Full catalog; **not** fetched on list or detail hot paths |

Rebuild: `python3 scripts/build-fonts-list.py`

## Thin field set (`fonts-list.json`)

`id`, `name`, `en`, `family`, `normalized`, `category`, `tags`, `weights`,
`license`, `licenseName`, `licenseVerified`, `foundry`, `brand` (slim: name/slug/logoUrl/avatarUrl/website),
`foundryAvatar`, `viewCount`, `designerShort`, `designer`, `languages`, `releaseYear`,
`charCount`, `glyphCount`, `useCases`

## Fat-only fields (detail)

`description`, `copyright`, `licenseNotes`, `licenseFileUrl`, `licenseUrl`, `purchaseUrl`, `version`
(+ optional `brand` object)

## Runtime (`js/wf-proto.js`)

1. `loadCatalog()` → **only** `fonts-list.json`. No fallback to `fonts.json`.
2. `enrichFontFromFull(font)` on detail open → per-slug fat JSON, else `fonts-detail.json` byId. **Clears 二次全量** of `fonts.json`.

## WFApi / vault contract (mock default)

- `list=thin` — future `GET /api/fonts` (or vault list) returns the thin field set.
- `detail=fat` — future `GET /api/fonts/{slug}` returns per-slug fat (lab static mirrors this).
- `WFApi.mode()` default remains **`mock`**. Do not flip default to live; no vault cutover in this tip.

## Production (2026-09-29)

Hot path on `app.windfonts.com` is `data/fonts-list.json` (thin) via `wf-proto.js`. Detail enrich: `data/fonts-by-slug/{Normalized}.json`. Full `fonts.json` stays authoring input. Vault default remains mock. HTML `?v=` stamps live on each shell; bump them when JS/CSS/list change.


## Track D (this tip, HTML shells)

- `preconnect` + `dns-prefetch` → `https://cn.windfonts.com`
- LCP preload (not full zh-common / not full CJK):
  - `Albbpht/Regular/zh-common/2.woff2` (primary CJK common shard for first-paint UI)
  - Hckht wordmark shards: `Medium/full/{16,18,15,19}.woff2`（文 / 风 / 体 / 字）
- Keep e734bb5 critical `@font-face` in `css/fonts.css`; keep cd51a13 root-absolute `/css/` `/js/` on font-detail + foundry.
- Cache bust `?v=20260927perf3` on touched tags. CATALOG_VER same.
