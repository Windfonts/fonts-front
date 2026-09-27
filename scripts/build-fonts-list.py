#!/usr/bin/env python3
"""Build data/fonts-list.json — list/home/search card fields only (no long blobs)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEEP = [
  "id", "name", "en", "family", "normalized", "category", "tags", "weights",
  "license", "licenseName", "licenseVerified", "foundry", "brand", "foundryAvatar",
  "viewCount", "designerShort", "designer", "languages", "releaseYear",
  "charCount", "glyphCount", "useCases",
]
BRAND_KEEP = ("name", "slug", "logoUrl", "avatarUrl", "website")

def main():
    fonts = json.loads((ROOT / "data" / "fonts.json").read_text(encoding="utf-8"))
    lite = []
    for f in fonts:
        row = {k: f[k] for k in KEEP if k in f}
        b = row.get("brand")
        if isinstance(b, dict):
            slim = {k: b[k] for k in BRAND_KEEP if b.get(k)}
            if slim:
                row["brand"] = slim
            else:
                row.pop("brand", None)
        lite.append(row)
    out = ROOT / "data" / "fonts-list.json"
    out.write_text(json.dumps(lite, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes, {len(lite)} fonts)")

if __name__ == "__main__":
    main()
