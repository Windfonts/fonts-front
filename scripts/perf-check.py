#!/usr/bin/env python3
"""Read-only performance detection for app.windfonts.com and wenfeng.org.

Usage (from fonts-front):
  python3 scripts/perf-check.py --all
  python3 scripts/perf-check.py --site app|org
  python3 scripts/perf-check.py --all --baseline docs/ops/perf-baseline-2026-10-08.json
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

APP_PAGES = ("/", "/fonts", "/features")
ORG_PAGES = ("/", "/source/", "/use/", "/about/")
TIMEOUT = 25
UA = "windfonts-perf-check/2026-10-08"

KNOWN_WARNS = (
    "org-ui-on-cloudflare",
)


class HrefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = {k: (v or "") for k, v in attrs}
        if tag == "link" and ad.get("href"):
            self.hrefs.append((ad.get("rel", ""), ad["href"]))
        elif tag == "script" and ad.get("src"):
            self.hrefs.append(("script", ad["src"]))
        elif tag == "img" and ad.get("src"):
            self.hrefs.append(("img", ad["src"]))


def repo_root() -> Path:
    here = Path(__file__).resolve()
    if here.parent.name == "scripts":
        return here.parent.parent
    return Path.cwd()


def fetch(url: str) -> tuple[int, bytes, dict[str, str], bytes]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept-Encoding": "gzip"},
        method="GET",
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
            raw = resp.read()
            headers = {k.lower(): v for k, v in resp.headers.items()}
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read() if e.fp else b""
        headers = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
        return e.code, raw, headers, raw
    body = raw
    if headers.get("content-encoding", "").lower() == "gzip":
        try:
            body = gzip.decompress(raw)
        except OSError:
            body = raw
    return status, raw, headers, body


def host_of(href: str, base_host: str) -> str:
    if href.startswith("//"):
        return href.split("/")[2]
    if href.startswith("http://") or href.startswith("https://"):
        return href.split("/")[2]
    return base_host


def static_repo_findings(root: Path) -> dict[str, Any]:
    home = (root / "js/pages/home.js").read_text(encoding="utf-8") if (root / "js/pages/home.js").exists() else ""
    feat = (root / "js/pages/features.js").read_text(encoding="utf-8") if (root / "js/pages/features.js").exists() else ""
    proto = (root / "js/wf-proto.js").read_text(encoding="utf-8") if (root / "js/wf-proto.js").exists() else ""
    fonts_css = (root / "css/fonts.css").read_text(encoding="utf-8") if (root / "css/fonts.css").exists() else ""
    comp = (root / "css/components.css").read_text(encoding="utf-8") if (root / "css/components.css").exists() else ""
    forest_fn = re.search(r"function loadForestCellFace\(el\) \{.*?\n    \}", home, re.S)
    forest = bool(forest_fn and "el.textContent" in forest_fn.group(0))
    feat_zh = bool(re.search(r"ensureFontCss\([^)]*'zh'", feat))
    page_size = None
    m = re.search(r"PAGE_SIZE\s*=\s*(\d+)", proto)
    if m:
        page_size = int(m.group(1))
    qfn = re.search(r"function queueForestFaces\(\) \{.*?\n    \}", home, re.S)
    idle_queue = bool(qfn and "requestIdleCallback" in qfn.group(0))
    return {
        "home_forest_needText_textContent": forest,
        "home_forest_idle_queue": idle_queue,
        "features_ensure_zh": feat_zh,
        "page_size": page_size,
        "ui_font_puhuiti": "Alibaba PuHuiTi" in fonts_css or "PuHuiTi" in fonts_css,
        "topnav_padding_1_5": ".topnav a { padding: 0.4rem 1.5rem;" in comp
        or ".topnav a { padding: 0.4rem 1.5rem }" in comp,
        "hot_path_fonts_json": bool(re.search(r"fonts\.json", proto)) and "fonts-list.json" not in proto,
    }


def audit_html(url: str, site: str) -> dict[str, Any]:
    status, raw, headers, body = fetch(url)
    text = body.decode("utf-8", "replace")
    p = HrefParser()
    try:
        p.feed(text)
    except Exception:
        pass
    base_host = url.split("/")[2]
    hosts: dict[str, int] = {}
    preloads = []
    for rel, href in p.hrefs:
        h = host_of(href, base_host)
        hosts[h] = hosts.get(h, 0) + 1
        if "preload" in rel:
            preloads.append(href)
    cn = sum(1 for _, href in p.hrefs if "cn.windfonts.com" in href)
    fonts_json = "fonts.json" in text and "fonts-list.json" not in text.split("fonts.json")[0][-40:]
    return {
        "url": url,
        "status": status,
        "html_bytes": len(body),
        "wire_bytes": len(raw),
        "gzip": headers.get("content-encoding", ""),
        "cache": headers.get("x-cache-status") or headers.get("cf-cache-status") or "",
        "hosts": hosts,
        "cn_windfonts_refs": cn,
        "preloads": preloads,
        "mentions_fonts_json": "fonts.json" in text,
        "mentions_fonts_list": "fonts-list.json" in text,
        "site": site,
    }


def json_size(url: str) -> dict[str, Any]:
    status, raw, headers, body = fetch(url)
    n = None
    try:
        data = json.loads(body.decode("utf-8"))
        if isinstance(data, list):
            n = len(data)
        elif isinstance(data, dict):
            n = data.get("n") or len(data.get("fonts") or data.get("families") or data)
    except Exception:
        data = None
    return {
        "url": url,
        "status": status,
        "gzip_bytes": len(raw) if headers.get("content-encoding", "").lower() == "gzip" else None,
        "decoded_bytes": len(body),
        "wire_bytes": len(raw),
        "n": n,
        "cache": headers.get("x-cache-status") or headers.get("cf-cache-status") or "",
        "cache_control": headers.get("cache-control", ""),
    }


def grade(app: dict[str, Any], org: dict[str, Any], repo: dict[str, Any], baseline: dict[str, Any] | None) -> dict[str, Any]:
    fails: list[str] = []
    warns: list[str] = []
    known: list[str] = []
    bl_known = set((baseline or {}).get("known_warns") or KNOWN_WARNS)

    if repo.get("home_forest_needText_textContent"):
        (known if "home-forest-needText-textContent" in bl_known else warns).append(
            "home-forest-needText-textContent"
        )
    if repo.get("home_forest_idle_queue"):
        (known if "home-forest-idle-queue" in bl_known else warns).append("home-forest-idle-queue")
    if repo.get("features_ensure_zh"):
        (known if "features-zh-then-full" in bl_known else warns).append("features-zh-then-full")
    if repo.get("page_size") not in (None, 10):
        warns.append(f"PAGE_SIZE={repo['page_size']}")
    if repo.get("topnav_padding_1_5") is False:
        warns.append("topnav-padding-not-1.5rem")

    if app:
        for page in app.get("pages") or []:
            if page.get("mentions_fonts_json") and not page.get("mentions_fonts_list"):
                fails.append(f"html-fetches-fonts.json:{page['url']}")
            for href in page.get("preloads") or []:
                if "preview-shop" in href or "zh-common/2.woff2" in href:
                    fails.append(f"preload-shop-cjk:{href}")
        lst = app.get("fonts_list") or {}
        if lst.get("decoded_bytes") and lst["decoded_bytes"] > 900000:
            fails.append(f"fonts-list-decoded>{lst['decoded_bytes']}")

    if org:
        home = next((p for p in org.get("pages") or [] if p.get("url", "").rstrip("/").endswith("wenfeng.org")), None)
        if not home and org.get("pages"):
            home = org["pages"][0]
        if home:
            if home.get("cn_windfonts_refs", 0) == 0 and "org-ui-on-cloudflare" in bl_known:
                known.append("org-ui-on-cloudflare")
            elif home.get("cn_windfonts_refs", 0) == 0:
                warns.append("org-ui-on-cloudflare")
            if home.get("html_bytes", 0) > 80000:
                warns.append(f"org-html-bytes={home['html_bytes']}")

    return {"fail": fails, "warn": warns, "known_warn": known}


def main() -> int:
    ap = argparse.ArgumentParser(description="Windfonts app+org performance detection")
    ap.add_argument("--site", choices=("app", "org", "all"), default="all")
    ap.add_argument("--all", action="store_true", help="same as --site all")
    ap.add_argument("--baseline", default="")
    ap.add_argument("--app-origin", default="https://app.windfonts.com")
    ap.add_argument("--org-origin", default="https://wenfeng.org")
    ap.add_argument("--skip-live", action="store_true")
    args = ap.parse_args()
    if args.all:
        args.site = "all"

    root = repo_root()
    repo = static_repo_findings(root)
    baseline = None
    if args.baseline:
        bp = Path(args.baseline)
        if not bp.is_absolute():
            bp = root / bp
        if bp.exists():
            baseline = json.loads(bp.read_text(encoding="utf-8"))
        else:
            print(f"SKIP baseline missing: {bp}", file=sys.stderr)

    out: dict[str, Any] = {"repo": repo, "app": None, "org": None}

    if args.site in ("app", "all") and not args.skip_live:
        pages = [audit_html(args.app_origin.rstrip("/") + path, "app") for path in APP_PAGES]
        lst = json_size(args.app_origin.rstrip("/") + "/data/fonts-list.json")
        packs = json_size(args.app_origin.rstrip("/") + "/data/pack-subsets.json")
        out["app"] = {"pages": pages, "fonts_list": lst, "pack_subsets": packs}

    if args.site in ("org", "all") and not args.skip_live:
        pages = [audit_html(args.org_origin.rstrip("/") + path, "org") for path in ORG_PAGES]
        out["org"] = {"pages": pages, "optimized": False}

    out["grade"] = grade(out.get("app") or {}, out.get("org") or {}, repo, baseline)
    print(json.dumps(out, ensure_ascii=False, indent=2))

    g = out["grade"]
    print("\n---", file=sys.stderr)
    for x in g["fail"]:
        print("FAIL", x, file=sys.stderr)
    for x in g["warn"]:
        print("WARN", x, file=sys.stderr)
    for x in g["known_warn"]:
        print("KNOWN", x, file=sys.stderr)
    if not g["fail"] and not g["warn"] and not g["known_warn"]:
        print("PASS", file=sys.stderr)
    if g["fail"]:
        return 2
    if g["warn"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
