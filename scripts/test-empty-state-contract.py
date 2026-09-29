#!/usr/bin/env python3
"""Empty-state contract: catalog/bag/search/foundry must use page-state, not a gray .empty line."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
fails = []


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def ok(cond, msg):
    if not cond:
        fails.append(msg)


fonts = read("js/pages/fonts.js")
ok("function emptyListHtml" in fonts, "fonts.js missing emptyListHtml")
ok("page-state-item" in fonts, "fonts.js empty must be page-state-item")
ok("empty empty-filter" not in fonts, "fonts.js still paints .empty.empty-filter")
ok("paintList()" in fonts, "fonts.js must paint list before rail")
ok("requestAnimationFrame" in fonts and "renderRail()" in fonts, "fonts.js must defer rail")
ok("function railStats" in fonts, "fonts.js missing single-pass railStats")
ok("facetCounts(" not in fonts, "fonts.js still uses per-facet facetCounts")

bag = read("js/pages/bag.js")
ok("page-state-item" in bag, "bag.js empty must be page-state-item")
ok("empty empty-filter" not in bag, "bag.js still paints .empty.empty-filter")

search = read("js/wf-search.js")
ok("catalogReady" in search, "wf-search.js must wait for catalog before 没有")
ok("正在查找" in search, "wf-search.js missing pending copy")
ok("preview-shop" in search, "wf-search.js must use preview-shop, not zh")
ok("ensureFontCss(font.family, w, 'zh')" not in search, "wf-search.js still injects zh per keystroke")

foundry = read("js/pages/foundry.js")
ok('id="foundryEmpty"' in foundry and "page-state" in foundry, "foundry empty filter must be page-state")
ok("<p class=\"foundry-empty-filter\"" not in foundry, "foundry.js still uses gray foundry-empty-filter p")

base = read("css/base.css")
ok(".specimens > .page-state-item" in base, "base.css missing list page-state")
ok("wf-skel-pulse" in base, "base.css missing skeleton pulse")
ok("prefers-reduced-motion" in base, "base.css missing reduced-motion")

html_fonts = read("fonts.html")
ok("fonts.js?v=20260929ui101" in html_fonts, "fonts.html stamp not ui101")
ok("base.css?v=20260929ui6" in html_fonts, "fonts.html base stamp not ui6")

bag_html = read("shopping-bag.html")
ok("选字袋是空的" in bag_html, "shopping-bag.html missing initial empty board")
ok("bag.js?v=20260929ui6" in bag_html, "shopping-bag.html bag.js stamp not ui6")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS empty-state contract", len(fails), "fails")
