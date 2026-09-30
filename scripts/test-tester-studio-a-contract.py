#!/usr/bin/env python3
"""Specimen workshop A: mobile canvas-first, hide rest of detail, poster bg, no share link."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
fails = []


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def ok(cond, msg):
    if not cond:
        fails.append(msg)


def split_media(src, width):
    """Return (outside, [inside blocks]) for @media (max-width: WIDTH). Nested braces."""
    outside = []
    insides = []
    i = 0
    pat = re.compile(r"@media \(max-width:\s*" + str(width) + r"px\)\s*\{")
    while True:
        m = pat.search(src, i)
        if not m:
            outside.append(src[i:])
            break
        outside.append(src[i:m.start()])
        brace = m.end() - 1
        depth = 0
        j = brace
        while j < len(src):
            if src[j] == "{":
                depth += 1
            elif src[j] == "}":
                depth -= 1
                if depth == 0:
                    insides.append(src[brace + 1:j])
                    i = j + 1
                    break
            j += 1
        else:
            break
    return "".join(outside), insides


spec = read("css/specimen.css")
detail_css = read("css/detail.css")
tester = read("js/wf-tester.js")
detail_js = read("js/pages/detail.js")
card = read("js/wf-card.js")

_, media_768 = split_media(spec, 768)
ok(media_768, "specimen.css missing @media (max-width: 768px)")
m768 = "\n".join(media_768)

# Mobile DOM is templates → controls → card. 丁: canvas / under / templates / rail.
ok(re.search(
    r"\.glyph-wall\.is-editing \.card-view \{[^}]*grid-row:\s*1\b",
    m768),
   "768: .card-view must be grid-row 1 (canvas first)")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-under \{[^}]*grid-row:\s*2\b",
    m768),
   "768: .tester-under (weights/align) must be grid-row 2")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-templates \{[^}]*grid-row:\s*3\b",
    m768),
   "768: .tester-templates must be grid-row 3")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-rail \{[^}]*grid-row:\s*4\b",
    m768),
   "768: .tester-rail must be grid-row 4")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tpl-grid \{[^}]*overflow-x:\s*auto",
    m768),
   "768: template strip must scroll horizontally")
ok(re.search(
    r"\.glyph-wall\.is-editing \.tpl-grid \{[^}]*(display:\s*flex|flex-wrap:\s*nowrap)",
    m768),
   "768: .tpl-grid must be a horizontal flex strip, not a wrapping 2-col grid")

# Export + 完成 dock to the viewport on the phone.
ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-dock \{[^}]*position:\s*sticky",
    m768) or re.search(
    r"\.glyph-wall\.is-editing \.tester-dock \{[^}]*position:\s*fixed",
    m768),
   "768: .tester-dock (copy/export/done) must stick to the bottom")

# Editing hides the rest of the product page so the studio is the only scroll.
ok(re.search(
    r"\.glyph-wall\.is-editing \.detail-title\s*\{[^}]*display:\s*none",
    spec) or re.search(
    r"\.glyph-wall\.is-editing \.detail-title\s*\{[^}]*display:\s*none",
    detail_css),
   "is-editing must hide .detail-title")
ok(re.search(
    r":has\(\.glyph-wall\.is-editing\)[\s\S]{0,180}\.detail-body[^{]*\{[^}]*display:\s*none",
    spec) or re.search(
    r":has\(\.glyph-wall\.is-editing\)[\s\S]{0,180}\.detail-body[^{]*\{[^}]*display:\s*none",
    detail_css),
   "is-editing must hide .detail-body")
ok(re.search(
    r":has\(\.glyph-wall\.is-editing\)[\s\S]{0,200}#wfExtraFooter[^{]*\{[^}]*display:\s*none",
    spec) or re.search(
    r":has\(\.glyph-wall\.is-editing\)[\s\S]{0,200}#wfExtraFooter[^{]*\{[^}]*display:\s*none",
    detail_css),
   "is-editing must hide #wfExtraFooter")

# og:image is not a real backend URL yet — do not offer 复制链接 in the workshop.
ok("data-share" not in tester.split("function html(")[1].split("function fmt(")[0],
   "wf-tester html() must not render a data-share 复制链接 button")
ok("btnShare" not in detail_js or re.search(
    r"onCard:\s*function \(on\) \{[^}]*btnShare",
    detail_js) is None or "share.hidden = !on" not in detail_js,
   "onCard must not unhide #btnShare (复制链接) while og:image is unfinished")
ok(re.search(r"id=\"btnShare\"", detail_js) is None or
   re.search(r"id=\"btnShare\"[^>]*hidden", detail_js),
   "#btnShare must stay absent or permanently hidden")

# 海报 / 刊头 auto-seed a stock wall photo. Other templates keep a chosen photo.
ok("WALL_BGS" in tester,
   "wf-tester must seed template backgrounds from WFCard.WALL_BGS")
ok(re.search(
    r"function takeTpl\([\s\S]{0,1200}seedBg\(",
    tester),
   "takeTpl must still call seedBg")
ok(not re.search(
    r"function takeTpl\([\s\S]{0,1200}seedBg\(slotHas\('bg'\)\)",
    tester),
   "takeTpl must not seed/clear bg via slotHas('bg'); every template can keep a photo")
ok(re.search(
    r"slots:\s*\[[^\]]*'bg'",
    card),
   "wf-card templates must declare bg slots")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS tester-studio-a contract")
