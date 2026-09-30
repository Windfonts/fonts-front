#!/usr/bin/env python3
"""Workshop 丁: weights+align under canvas; every template can take a background."""
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
tester = read("js/wf-tester.js")
spec = read("css/specimen.css")
html_page = read("font-detail.html")

ids = re.findall(r"\{ id: '(\w+)'", card)
ok(set(ids) >= {"poem", "hero", "mast", "card", "quote", "poster", "ink", "seal"},
   "wf-card TEMPLATES missing a known id")
for tid in ids:
    m = re.search(r"\{ id: '" + tid + r"',[\s\S]*?slots: \[([^\]]*)\]", card)
    ok(m and re.search(r"['\"]bg['\"]", m.group(1)),
       tid + " slots must include bg (every template can pick a wall photo)")
    ok(m and re.search(r"['\"]avatar['\"]", m.group(1)),
       tid + " slots must include avatar (every template can take a Cravatar)")

take = fn_body(tester, "takeTpl")
seed = fn_body(tester, "seedBg")
ok(take and "seedBg(" in take, "takeTpl must still call seedBg")
ok("slotHas('bg')" not in take,
   "takeTpl must not seed/clear background via slotHas('bg')")
ok(re.search(r"poster", take) and re.search(r"mast", take),
   "takeTpl auto-seed is only 海报/刊头")
ok("setContent('bg', '')" not in seed,
   "seedBg must not wipe the photo when switching to 诗签/巨字/…")

html_fn = fn_body(tester, "html")
ok("tester-under" in html_fn, "html() must emit .tester-under for weights/align")
ok("tester-rail" in html_fn, "html() must wrap the right column in .tester-rail")
ok(re.search(r"tester-under[\s\S]{0,160}\+ wt\b", html_fn),
   ".tester-under must contain weight buttons")
ok(html_fn.find("tester-under") != -1 and html_fn.find("tester-under") < html_fn.find("pills('align'"),
   ".tester-under must contain 左/中/右")
ok(not re.search(r"tester-toolbar[\s\S]*data-w=", html_fn),
   "weights must leave the right-rail toolbar")

ok(re.search(
    r"\.glyph-wall\.is-editing \.tester-controls \{[^}]*display:\s*contents",
    spec),
   "editing tester-controls must be display:contents so under-strip can sit under the canvas")
ok(re.search(
    r"\.tester-under \{[^}]*grid-column:\s*2",
    spec) or re.search(
    r"\.glyph-wall\.is-editing \.tester-under \{[^}]*grid-column:\s*2",
    spec),
   ".tester-under must be grid-column 2 (under the canvas)")
ok(re.search(
    r"\.tester-under[^{]*\.weights[^}]*flex-wrap:\s*nowrap",
    spec),
   "under-canvas weights must scroll on one row")

apply = fn_body(tester, "applyLayers")
ok("data-field=\"bg\"" not in apply or "slotHas('bg')" not in apply,
   "applyLayers must not hide the background field by template slot")

ok("wf-tester.js?v=20260929ui3" in html_page or re.search(
    r"wf-tester\.js\?v=20260929ui\d+", html_page),
   "font-detail.html must bump wf-tester stamp")
ok(re.search(r"specimen\.css\?v=20260929ui\d+", html_page),
   "font-detail.html must stamp specimen.css")
ok("wf-card.js?v=20260929ui2" in html_page or re.search(
    r"wf-card\.js\?v=20260929ui[2-9]", html_page),
   "font-detail.html must bump wf-card stamp")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS tester-ding contract")
