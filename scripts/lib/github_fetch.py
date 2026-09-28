#!/usr/bin/env python3
"""兼容层：转发到 origin_fetch（GitHub 子集 API 不变）。

新代码请：from origin_fetch import ... 或 CLI `origin-fetch` / `gh-fetch`。
"""
from __future__ import annotations

import sys
from pathlib import Path

_LIB = Path(__file__).resolve().parent
if str(_LIB) not in sys.path:
    sys.path.insert(0, str(_LIB))

from origin_fetch import (  # noqa: E402,F401
    API_BASES,
    RAW_TEMPLATES,
    FetchResult,
    api_json,
    excerpt_license_from_readme,
    fetch_license,
    get_raw,
    health_path,
    http_get,
    list_root,
    load_health,
    main,
    probe,
    save_health,
)

if __name__ == "__main__":
    raise SystemExit(main())
