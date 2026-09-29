#!/usr/bin/env python3
"""仓耳 W01–W05 必须进 font-products：目录一张卡，详情才能画规格条。"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
fails = []


def ok(cond, msg):
    if not cond:
        fails.append(msg)


products = json.loads((ROOT / "data/font-products.json").read_text(encoding="utf-8"))
by_id = {p["id"]: p for p in products.get("products", [])}
by_family = {}
for p in products.get("products", []):
    for m in p.get("members") or []:
        by_family[m["family"]] = (p, m)

raw = json.loads((ROOT / "data/fonts-list.json").read_text(encoding="utf-8"))
fonts = raw if isinstance(raw, list) else raw.get("fonts") or []
catalog = {f["family"]: f for f in fonts}

SERIES = [
    {
        "id": "tsanger-yumo",
        "name": "仓耳与墨",
        "default": "wenfeng-ceym3",
        "members": [
            ("wenfeng-ceym1", "W01"),
            ("wenfeng-ceym2", "W02"),
            ("wenfeng-ceym3", "W03"),
            ("wenfeng-ceym4", "W04"),
            ("wenfeng-ceym5", "W05"),
        ],
    },
    {
        "id": "tsanger-yuyang",
        "name": "仓耳渔阳体",
        "default": "wenfeng-ceyyt3",
        "members": [
            ("wenfeng-ceyyt1", "W01"),
            ("wenfeng-ceyyt2", "W02"),
            ("wenfeng-ceyyt3", "W03"),
            ("wenfeng-ceyyt4", "W04"),
            ("wenfeng-ceyyt5", "W05"),
        ],
    },
    {
        "id": "tsanger-shuyuan",
        "name": "仓耳舒圆体",
        "default": "wenfeng-cesyt3",
        "members": [
            ("wenfeng-cesyt", "W01"),
            ("wenfeng-cesyt2", "W02"),
            ("wenfeng-cesyt3", "W03"),
            ("wenfeng-cesyt4", "W04"),
            ("wenfeng-cesyt5", "W05"),
        ],
    },
    {
        "id": "tsanger-feibai",
        "name": "仓耳非白",
        "default": "wenfeng-cefb3",
        "members": [
            ("wenfeng-cefb1", "W01"),
            ("wenfeng-cefb2", "W02"),
            ("wenfeng-cefb3", "W03"),
            ("wenfeng-cefb4", "W04"),
            ("wenfeng-cefb5", "W05"),
        ],
    },
]

for spec in SERIES:
    p = by_id.get(spec["id"])
    ok(p is not None, "missing product %s" % spec["id"])
    if not p:
        continue
    ok(p.get("name") == spec["name"], "%s name %r" % (spec["id"], p.get("name")))
    ok(p.get("default") == spec["default"], "%s default %r" % (spec["id"], p.get("default")))
    got = [(m.get("family"), (m.get("chips") or [None])[0]) for m in p.get("members") or []]
    ok(got == spec["members"], "%s members %r" % (spec["id"], got))
    ok(len(p.get("members") or []) >= 2, "%s must have ≥2 members for gradesAsWeights" % spec["id"])
    for fam, chip in spec["members"]:
        ok(fam in catalog, "catalog missing %s" % fam)
        hit = catalog.get(fam) or {}
        weights = hit.get("weights") or []
        ok(len(weights) <= 1, "%s should be single-weight, got %r" % (fam, weights))
        mapped = by_family.get(fam)
        ok(mapped and mapped[0]["id"] == spec["id"], "%s not mapped to %s" % (fam, spec["id"]))

for standalone in ("wenfeng-cexwz", "wenfeng-cezkzdbs"):
    ok(standalone in catalog, "catalog missing standalone %s" % standalone)
    ok(standalone not in by_family, "%s must stay a single card, not a W0x series" % standalone)

detail = (ROOT / "js/pages/detail.js").read_text(encoding="utf-8")
ok("gradesAsWeights" in detail, "detail.js lost gradesAsWeights")
ok("product-grades" in detail, "detail.js lost product-grades bar")

wf = (ROOT / "js/wf-products.js").read_text(encoding="utf-8")
ok("font-products.json?v=" in wf, "wf-products.js must cache-bust font-products.json")

if fails:
    print("FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("PASS tsanger grades contract")
