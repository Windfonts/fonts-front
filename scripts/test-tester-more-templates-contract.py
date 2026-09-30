#!/usr/bin/env python3
"""Workshop left column: more templates so it fills against the right rail."""
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


card = read("js/wf-card.js")
css = read("css/card.css")
spec = read("css/specimen.css")
html_page = read("font-detail.html")
tester = read("js/wf-tester.js")

ids = re.findall(r"\{ id: '(\w+)'", card)
labels = dict(re.findall(r"\{ id: '(\w+)', label: '([^']+)'", card))
KEEP = ["poem", "hero", "mast", "card", "quote", "poster", "ink", "seal",
        "vert", "couple", "plaque", "excerpt"]
NEW = ["vert", "couple", "plaque", "excerpt"]
NAMES = {
    "vert": "竖排",
    "couple": "对联",
    "plaque": "匾额",
    "excerpt": "摘录",
}
DROP = ["cover", "motto"]

ok(len(ids) == 12, "TEMPLATES must be exactly 12 (was 14; drop 封面/金句)")
ok(ids == KEEP, "TEMPLATES id order must be original 8 then 竖排/对联/匾额/摘录")
for tid in NEW:
    ok(tid in ids, "missing template id " + tid)
    ok(labels.get(tid) == NAMES[tid], tid + " label must be " + NAMES[tid])
for tid in DROP:
    ok(tid not in ids, tid + " must be removed (cover=封面, motto=金句)")

for tid in ids:
    m = re.search(r"\{ id: '" + tid + r"',[\s\S]*?slots: \[([^\]]*)\]", card)
    ok(m and re.search(r"['\"]bg['\"]", m.group(1)),
       tid + " slots must include bg")
    ok(m and re.search(r"['\"]avatar['\"]", m.group(1)),
       tid + " slots must include avatar")

ok(re.search(r"id: 'vert'[\s\S]{0,200}frame: 'narrow'", card), "竖排 default frame is 窄幅")
ok(re.search(r"id: 'couple'[\s\S]{0,200}frame: 'narrow'", card), "对联 default frame is 窄幅")
ok(re.search(r"id: 'plaque'[\s\S]{0,200}frame: 'banner'", card), "匾额 default frame is 横幅")
ok(re.search(r"id: 'excerpt'[\s\S]{0,200}layout: 'text'", card), "摘录 uses layout text")
ok(re.search(r"id: 'vert'[\s\S]{0,200}layout: 'vert'", card), "竖排 uses layout vert")
ok(re.search(r"id: 'couple'[\s\S]{0,200}layout: 'couple'", card), "对联 uses layout couple")

ok(re.search(r'\[data-layout="vert"\][\s\S]{0,200}writing-mode:\s*vertical-rl', css),
   "vert layout must set writing-mode: vertical-rl")
ok('[data-layout="couple"]' in css, "card.css missing couple layout")
ok('[data-layout="text"]' in css, "card.css missing text layout")

for tid in NEW:
    ok('data-kind="' + tid + '"' in spec or "data-kind=\"" + tid + "\"" in spec
       or ('[data-kind="' + tid + '"]' in spec),
       "specimen.css missing .tpl-mini thumb for " + tid)

take = tester
ok(not re.search(r"seedBg\([^\)]*(cover|motto|vert|couple|plaque|excerpt)", take),
   "new templates must not auto-seed a wall photo (only 海报/刊头)")
ok("[data-kind=\"cover\"]" not in spec and "[data-kind=\"motto\"]" not in spec,
   "specimen.css must drop cover/motto thumbs")

ok(re.search(r"wf-card\.js\?v=20260929ui\d+", html_page),
   "font-detail.html must bump wf-card stamp")
ok(re.search(r"specimen\.css\?v=20260929ui\d+", html_page),
   "font-detail.html must stamp specimen.css")
ok("card.css?v=20260929ui2" in html_page or re.search(
    r"card\.css\?v=20260929ui[2-9]", html_page),
   "font-detail.html must bump card stamp")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS tester-more-templates contract")
