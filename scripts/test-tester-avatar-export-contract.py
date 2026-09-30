#!/usr/bin/env python3
"""导出头像：白底圆 + 裁圆里收 1px，不加描边。"""
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


def fn_body(src, name):
    m = re.search(r"function " + name + r"\([^)]*\) \{", src)
    if not m:
        return ""
    i = m.end() - 1
    depth = 0
    for j, ch in enumerate(src[i:], i):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return src[m.start():j + 1]
    return src[m.start():]


card = read("js/wf-card.js")
css = read("css/card.css")
html_page = read("font-detail.html")
paint = fn_body(card, "drawPaint")

ok(re.search(
    r"\.glyph-wall \.card-avatar \{[^}]*background:\s*var\(--face\)",
    css),
   "preview avatar sits on --face so the 1px inset is a white disc, not a hole")
ok(re.search(r"\.glyph-wall \.card-avatar \{[^}]*border-radius:\s*50%", css),
   "avatar stays a circle")
ok(not re.search(
    r"\.glyph-wall \.card-avatar \{[^}]*(border:\s*(?!0\b|none)[0-9]|box-shadow:\s*(?!none)|outline:\s*(?!none|0))",
    css),
   "card-avatar has no stroke, box-shadow, or outline")
ok("ctx.stroke" not in paint and "strokeStyle" not in paint,
   "export does not stroke the avatar")
ok("card-avatar" in paint and "token('--face'" in paint,
   "export fills --face behind the avatar before clipping")
ok(re.search(r"rad\s*-\s*1\b", paint) or re.search(r"inset\s*=\s*1\b", paint),
   "export clips the avatar 1px inward")
ok(re.search(r"wf-card\.js\?v=20260929ui\d+", html_page),
   "font-detail.html stamps wf-card")
ok(re.search(r"card\.css\?v=20260929ui\d+", html_page),
   "font-detail.html stamps card.css")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS tester-avatar-export contract")
