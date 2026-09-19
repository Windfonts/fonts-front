# CHANGELOG · prototypes v2

**2026-09-19 (Asia/Shanghai)**

## Why v1 failed

Feng rejected the first HTML set as a **tasteless wireframe / beige paper mood board**:

- Brand canvas was muddy museum beige `#FAF8F5` + quiet green accent — read as design-token worksheet, not a font library.
- Home was a **centered slogan essay** with three small cards; glyphs did not dominate.
- Browse had filters but **no shared specimen toolbar** (old next-windfonts / Google Fonts mental model missing).
- Cards treated preview as decoration; meta competed with type.
- No real webfont CSS loads — looked like system-fallback mock, not「字库」.

## What v2 borrowed from the old product

From **next-windfonts (Mantine-era)** and peer density (Google Fonts / Adobe Fonts):

1. **Preview-first cards** — 40–56px+ sample fills the card; meta is a thin footer strip.
2. **Sticky specimen toolbar** on browse — one sample string + size slider drives the whole grid.
3. **Pick / compare** language stays 「我的选字」, not cart.
4. **Multi-filter rail** (气质 / 分类 / 语言 / 商用闸) beside a dense wall of live specimens.
5. **Detail stage** near full-bleed, editable text, weights, then trust + one-line CSS below.
6. **Live `@import` / `<link>` to `/api/css?family=wenfeng-…`** so faces actually paint (with system fallback).

## What changed visually

- White / near-white canvas; ink `#0a0a0a` + stone `#44403c`; blue-ink links sparingly; **black CTAs** (not green-as-brand).
- Home = gallery entrance (big type + search + specimen wall).
- Admin restyled to the same light DNA — tables keep mini glyph column; still no SaaS KPI chrome.

IA journey unchanged: discover → examine → trust → take away.

## v2.1 patch
- Home hero: dark cinematic band inspired by old windfonts.com (charcoal + large white type), then white specimen wall below.
