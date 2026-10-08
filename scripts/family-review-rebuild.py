#!/usr/bin/env python3
"""Refresh data/family-review-edits.json from current fonts-list.json.

Keeps locked drafts and PIN rules. New catalog rows stay unlocked with
draft = live family. Does not write fonts.json.
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from family_review import load_catalog, load_edits, merge_rows, payload, stats  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
EDITS = ROOT / "data" / "family-review-edits.json"


def main() -> int:
    catalog = load_catalog(ROOT)
    old = load_edits(ROOT)
    rows = merge_rows(catalog, old)
    if EDITS.exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        bak = ROOT / "data" / f"family-review-edits.json.bak-{stamp}"
        shutil.copy2(EDITS, bak)
        print(f"bak {bak.name}")
    EDITS.write_text(
        __import__("json").dumps(payload(rows), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("wrote", EDITS.relative_to(ROOT), stats(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
