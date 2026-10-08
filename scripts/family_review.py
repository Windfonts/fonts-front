#!/usr/bin/env python3
"""Merge shop catalog with family-review locks. Stable key is catalog id."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

PIN_SHORTS = {"cpfjp", "cdmc", "zyzyjp", "hsmb"}
JP_HINT = re.compile("[\u3040-\u30ff]|フォント|ゴシック|明朝|の")
HAN = re.compile("[\u4e00-\u9fff]")


def short_of(family: str) -> str:
    s = str(family or "").strip().lower()
    return s[8:] if s.startswith("wenfeng-") else s


def guess_rule(name: str, en: str, family: str) -> str:
    if short_of(family) in PIN_SHORTS:
        return "点名"
    blob = f"{name or ''} {en or ''}"
    if JP_HINT.search(blob):
        return "英文首字母+jp"
    if HAN.search(name or ""):
        return "中文拼音"
    return "英文首字母"


def load_catalog(root: Path) -> list:
    p = root / "data" / "fonts-list.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data = data.get("fonts") or data.get("items") or data.get("list") or []
    if not isinstance(data, list):
        raise SystemExit(f"unexpected fonts-list.json shape: {type(data)}")
    return data


def load_edits(root: Path) -> dict:
    p = root / "data" / "family-review-edits.json"
    if not p.exists():
        return {"rows": []}
    return json.loads(p.read_text(encoding="utf-8"))


def index_edits(edits: dict) -> dict:
    by_id = {}
    for row in (edits or {}).get("rows") or []:
        i = row.get("id")
        if i:
            by_id[i] = row
    return by_id


def merge_rows(catalog: list, edits: dict) -> list:
    prev = index_edits(edits)
    out = []
    for font in catalog:
        pid = font.get("id")
        family = str(font.get("family") or "")
        old = prev.get(pid)
        rule = (old or {}).get("rule") or guess_rule(font.get("name") or "", font.get("en") or "", family)
        draft = (old or {}).get("draft") or family
        generated = (old or {}).get("generated") or family
        locked = bool((old or {}).get("locked"))
        is_new = old is None or (bool((old or {}).get("new")) and not locked)
        out.append(
            {
                "id": pid,
                "name": font.get("name"),
                "en": font.get("en"),
                "normalized": font.get("normalized"),
                "family": family,
                "draft": draft,
                "generated": generated,
                "rule": rule,
                "edited": draft != generated,
                "locked": locked,
                "new": is_new,
            }
        )
    return out


def payload(rows: list, source: str = "fonts-list.json") -> dict:
    return {
        "savedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "source": source,
        "rows": rows,
    }


def stats(rows: list) -> dict:
    return {
        "n": len(rows),
        "locked": sum(1 for r in rows if r.get("locked")),
        "unlocked": sum(1 for r in rows if not r.get("locked")),
        "new": sum(1 for r in rows if r.get("new")),
        "pin": sum(1 for r in rows if r.get("rule") == "点名"),
        "edited": sum(1 for r in rows if r.get("edited")),
    }
