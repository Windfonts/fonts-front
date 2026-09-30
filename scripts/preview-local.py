#!/usr/bin/env python3
"""Local preview of fonts-front main with app.windfonts.com clean-URL rewrites.

  python3 scripts/preview-local.py --port 16016
"""
from __future__ import annotations

import argparse
import os
import posixpath
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

CRAVATAR_PROXY = re.compile(r"^/cravatar/avatar/([0-9a-f]{32})$", re.I)
CRAVATAR_UPSTREAM = "https://cravatar.com/avatar/"

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

REWRITE = [
    (re.compile(r"^/app/?$"), "/app/index.html"),
    (re.compile(r"^/fonts/[^/]+/?$"), "/font-detail.html"),
    (re.compile(r"^/foundry/[^/]+/?$"), "/foundry.html"),
]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        rel = unquote(self.path.split("#", 1)[0])
        path_only, _, qs = rel.partition("?")
        m = CRAVATAR_PROXY.match(path_only)
        if m:
            self.proxy_cravatar(m.group(1).lower(), qs)
            return
        super().do_GET()

    def proxy_cravatar(self, digest, qs):
        params = urllib.parse.parse_qs(qs, keep_blank_values=False)
        size = (params.get("s") or ["240"])[0]
        default = (params.get("d") or ["mp"])[0]
        if not re.fullmatch(r"[0-9]{1,4}", size):
            size = "240"
        if not re.fullmatch(r"[a-z0-9_-]{1,16}", default, re.I):
            default = "mp"
        url = CRAVATAR_UPSTREAM + digest + "?s=" + size + "&d=" + default
        req = urllib.request.Request(url, headers={"User-Agent": "fonts-front-preview"})
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                body = resp.read()
                ctype = resp.headers.get("Content-Type") or "image/webp"
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "public, max-age=300")
                self.end_headers()
                self.wfile.write(body)
        except (urllib.error.URLError, TimeoutError, OSError):
            self.send_error(502, "cravatar proxy failed")

    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0].split("#", 1)[0]
        rel = unquote(path)
        if not rel.startswith("/"):
            rel = "/" + rel
        mapped = None
        for rx, dest in REWRITE:
            if rx.match(rel):
                mapped = dest
                break
        if mapped is None:
            if rel.endswith("/"):
                mapped = posixpath.join(rel, "index.html")
            else:
                base = posixpath.basename(rel)
                if "." not in base:
                    html = rel.rstrip("/") + ".html"
                    if os.path.isfile(os.path.join(ROOT, html.lstrip("/"))):
                        mapped = html
                    else:
                        mapped = rel
                else:
                    mapped = rel
        mapped = posixpath.normpath(mapped)
        words = [w for w in mapped.split("/") if w and w not in (os.curdir, os.pardir)]
        out = ROOT
        for w in words:
            out = os.path.join(out, w)
        return out

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=16016)
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()
    httpd = ThreadingHTTPServer((args.bind, args.port), Handler)
    print("preview %s:%s root=%s" % (args.bind, args.port, ROOT), flush=True)
    httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
