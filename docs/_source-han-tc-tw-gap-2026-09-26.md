# Source Han Sans TC/TW 七字重缺口（2026-09-26）

Handoff for Bot / Feng. **Do not CDN-ingest from Foundry alone** — ingest must go through Bot/Feng gate.

## Goal (user agreed)

- Complete **SC + TC** pair for the shelf (primary chips).
- Skip HK / JP / KR for this pass.
- CN stays **secondary** shell (already `wenfeng-syhtcn`, Regular-only).

## Present inventory

### Catalog (`data/fonts.json`)

| family | name | normalized | weights | role |
|---|---|---|---|---|
| `wenfeng-syhtsc` | 思源黑体 | `Syhtsc` | ExtraLight, Light, **Normal**, **Regular**, Medium, Bold, Heavy (7) | SC primary — complete |
| `wenfeng-syhttw` | 思源黑體 TW | `SourceHanSansTWRegular` | Regular only | TW chip present; **shell only** |
| `wenfeng-syhtcn` | 思源黑体 CN | `SourceHanSansCNRegular` | Regular only | CN secondary — keep |
| `wenfeng-syhtcjk` | 思源黑体 Regular | `Syhtcjk` | Thin…Black (Noto-style names, DemiLight not Normal) | separate SKU, not TC |
| — | — | — | — | **No `wenfeng-syhttc` / TC family row** |

### Product chips (`data/font-products.json` → `adobe-source-han-sans`)

- Members today: SC (`wenfeng-syhtsc`, primary), CN (`wenfeng-syhtcn`, secondary), TW (`wenfeng-syhttw`, primary, `axes.charset: tc`).
- TW chip exists but points at a Regular-only (and mislabeled) package — see below.
- Suggested after ingest: keep SC + add/replace **TC** as primary peer; demote or retire TW shell once TC 7-weight is live; CN stays secondary.

### CDN (`cn.windfonts.com/fonts-packages/…/full/result.css`) — HEAD only 2026-09-26

| Normalized / Weight | HTTP | Notes |
|---|---|---|
| `Syhtsc` / ExtraLight…Heavy (incl. Normal + Regular) | 200 | Full 7-weight SC pack live |
| `Syhtsc` / DemiLight | 404 | Expected — SC language OTFs use Normal not DemiLight |
| `SourceHanSansTWRegular` / Regular | 200 | **Only** TW path found |
| `Syhttw`, `Syhttc`, `SourceHanSansTW`, `SourceHanSansTC` (+ 7 weights) | no 200 | No multi-weight TW/TC packs on CDN |
| `wenfeng-syhttw` alias in package-sizes | — | Maps to same TW Regular shell bytes |

CSS name-table peek (result.css headers, not full woff2):

- `Syhtsc/Normal` → Source Han Sans SC **Normal** (correct)
- `Syhtsc/Regular` → Source Han Sans SC **Regular** (correct)
- `SourceHanSansTWRegular/Regular` → Source Han Sans TW **Bold** (known mismatch; also in HANDOFF §4.1)

### Local vault / park (no new downloads)

- `_fonts_park/Syhtsc/`: full 7 OTFs (ExtraLight…Heavy) present.
- `fonts-packages/fonts/`: `Syhtcjk` present; **no** SourceHanSansTW / TC / Syhttw / Syhttc tree for 7-weight.
- No local TC/TW Source Han Sans multi-weight drop ready to ingest without fetching Adobe release zips.

## Adobe release naming (2.005R)

Upstream: [adobe-fonts/source-han-sans 2.005R](https://github.com/adobe-fonts/source-han-sans/releases/tag/2.005R)

| Code | Meaning | Typical assets | Size class |
|---|---|---|---|
| **TC** | Language-specific OTF — Traditional Chinese (Taiwan) | `10_SourceHanSansTC.zip` / `SourceHanSansTC-*.otf` | ~91 MB zip |
| **TW** | Region-specific **subset** OTF — Taiwan | `20_SourceHanSansTW.zip` / `SourceHanSansTW-*.otf` | ~33 MB zip |
| HC / HK | Hong Kong language / region | skip this pass | — |
| SC / CN | Simplified language / region | SC already ingested as `Syhtsc` | — |

Both TC and TW language/region static sets include the same **7 weights**: ExtraLight, Light, **Normal**, **Regular**, Medium, Bold, Heavy (`usWeightClass` Normal=350, Regular=400).

**Shelf recommendation:** ingest **TC language-specific** (full glyph set, Taiwan default) as the Traditional peer to SC — not the smaller TW region subset. Optionally keep a TW subset later as advanced/secondary; do not treat current `SourceHanSansTWRegular` shell as the TC peer.

## Present vs missing (TW/TC)

| Weight | SC (`Syhtsc`) CDN | TW shell CDN | TC CDN / catalog |
|---|---|---|---|
| ExtraLight | yes | no | missing |
| Light | yes | no | missing |
| Normal (350) | yes | no | missing |
| Regular (400) | yes | path exists but name-table is **Bold** | missing |
| Medium | yes | no | missing |
| Bold | yes | no (misfiled under Regular) | missing |
| Heavy | yes | no | missing |

## License

SIL Open Font License (OFL) — Adobe Source Han Sans. Reserved Font Name **Source**. OK to redistribute under OFL with rename rules for derivatives; Windfonts packaging already used for SC.

## Suggested product chips (after Bot/Feng ingest)

```text
adobe-source-han-sans
  wenfeng-syhtsc  chips:[SC]  charset:sc  tier:primary   ← already 7w
  wenfeng-syhttc  chips:[TC]  charset:tc  tier:primary   ← NEW (preferred Traditional peer)
  wenfeng-syhtcn  chips:[CN]  charset:cn  tier:secondary ← keep Regular shell
  wenfeng-syhttw  chips:[TW]  …          tier:secondary or retire after TC lands
```

Normalized naming for new TC pack should follow SC pattern (e.g. `Syhttc` + weight folders), not the old `SourceHanSansTWRegular` single-folder shell.

## Gate / process

- **Ingest must go through Bot/Feng gate — Foundry does not CDN alone.**
- Do not invent CDN packages or upload from this lab.
- Do not download multi-hundred-MB upstream zips onto the Mac unless Feng/Bot request a staged park drop.

## Recommended next steps for Bot

1. Feng approves TC (language-specific) 7-weight ingest; confirm skip HK/JP/KR.
2. Stage Adobe `SourceHanSansTC-*.otf` (2.005) into park under agreed normalized `Syhttc` (or Feng’s slug).
3. Split → OSS `fonts-packages/Syhttc/{ExtraLight|Light|Normal|Regular|Medium|Bold|Heavy}/…`.
4. Vault + `fonts.json`: add/replace family `wenfeng-syhttc`, weights list matching SC; fix or demote `wenfeng-syhttw` shell (and known Bold-as-Regular mislabel).
5. `font-products.json`: TC primary chip; CN secondary; TW secondary/retire.
6. Rebuild package-sizes / locale-fallback pairs; spot-check detail `?slug=syhttc` Normal≈350 vs Regular=400 (same WEIGHT_MAP fix as SC).
7. Only then touch production CDN.

## Related front fix (this lab commit)

`WEIGHT_MAP.normal`: `'400'` → `'350'` so SC (and future TC) Normal/Regular no longer share one `@font-face` weight. Verify: `http://127.0.0.1:16016/font-detail.html?slug=syhtsc`.
