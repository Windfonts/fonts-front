#!/usr/bin/env python3
# 冻结（2026-10-05 Bot）：谁都别跑。data/fonts-list.json 和 data/fonts-by-slug/ 是手工维护的真源；跑此脚本会丢失手加记录、恢复已下架字体并重写全部详情。
# 解冻须 Bot 书面同意，并显式设 WF_CATALOG_BUILD_UNFREEZE=1。
import os as _os, sys as _sys
if _os.environ.get("WF_CATALOG_BUILD_UNFREEZE") != "1":
    _sys.exit("冻结（2026-10-05 Bot）：谁都别跑。data/fonts-list.json 和 data/fonts-by-slug/ 是手工维护的真源；跑此脚本会丢失手加记录、恢复已下架字体并重写全部详情。（未设 WF_CATALOG_BUILD_UNFREEZE=1，已退出）")
"""Build thin list + detail fat artifacts from data/fonts.json.

SoT for list/search/foundry cards: data/fonts-list.json (thin).
Detail enrich (lab): data/fonts-by-slug/{Normalized}.json per slug,
plus data/fonts-detail.json index (byId / bySlug → filename stem).

Live contract (WFApi / vault, mock default): list=thin, detail=fat by slug.
Do NOT ship full fonts.json on list paths; detail must not 二次全量 fonts.json.
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

KEEP = [
    "id", "name", "en", "family", "normalized", "category", "tags", "weights",
    "license", "licenseName", "licenseVerified", "foundry", "brand", "foundryAvatar",
    "viewCount", "designerShort", "designer", "languages", "releaseYear",
    "charCount", "glyphCount", "useCases",
]
BRAND_KEEP = ("name", "slug", "logoUrl", "avatarUrl", "website")
FAT = [
    "description", "descriptionBrief", "copyright", "licenseNotes", "licenseFileUrl",
    "licenseUrl", "purchaseUrl", "version",
]


def slim_brand(b):
    if not isinstance(b, dict):
        return b
    slim = {k: b[k] for k in BRAND_KEEP if b.get(k)}
    return slim or None


def slug_keys(f):
    keys = []
    n = str(f.get("normalized") or "").strip()
    if n:
        keys.append(n)
    fam = str(f.get("family") or "").strip()
    if fam.startswith("wenfeng-"):
        keys.append(fam[8:])
    elif fam:
        keys.append(fam)
    seen = set()
    out = []
    for k in keys:
        low = k.lower()
        if low in seen:
            continue
        seen.add(low)
        out.append(k)
    return out


def safe_stem(primary):
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in primary)


def main():
    fonts = json.loads((ROOT / "data" / "fonts.json").read_text(encoding="utf-8"))

    lite = []
    for f in fonts:
        row = {k: f[k] for k in KEEP if k in f}
        b = slim_brand(row.get("brand"))
        if b:
            row["brand"] = b
        else:
            row.pop("brand", None)
        lite.append(row)
    out_list = ROOT / "data" / "fonts-list.json"
    out_list.write_text(json.dumps(lite, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out_list} ({out_list.stat().st_size} bytes, {len(lite)} fonts)")

    by_id = {}
    by_slug = {}
    slug_dir = ROOT / "data" / "fonts-by-slug"
    if slug_dir.exists():
        shutil.rmtree(slug_dir)
    slug_dir.mkdir(parents=True)

    for f in fonts:
        keys = slug_keys(f)
        primary = keys[0] if keys else f["id"]
        stem = safe_stem(primary)
        pack = {k: f.get(k) for k in KEEP if k in f}
        for k in FAT:
            pack[k] = f.get(k)
        b = slim_brand(f.get("brand"))
        if b is not None:
            pack["brand"] = b
        (slug_dir / (stem + ".json")).write_text(
            json.dumps(pack, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        by_id[f["id"]] = {k: pack.get(k) for k in FAT + ["brand"]}
        for k in keys:
            by_slug[k.lower()] = stem

    detail = {"v": 1, "fatFields": FAT, "byId": by_id, "bySlug": by_slug}
    out_detail = ROOT / "data" / "fonts-detail.json"
    out_detail.write_text(json.dumps(detail, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {out_detail} ({out_detail.stat().st_size} bytes)")
    print(f"wrote {len(fonts)} per-slug files under {slug_dir} ({len(by_slug)} slug keys)")


if __name__ == "__main__":
    main()
