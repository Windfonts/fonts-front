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
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

REWRITE = [
    (re.compile(r"^/app/?$"), "/app/index.html"),
]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

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

    def do_GET(self):
        path = unquote(self.path.split("?", 1)[0].split("#", 1)[0])
        if path in ("/fonts/", "/foundry/"):
            self.send_response(301)
            self.send_header("Location", path.rstrip("/"))
            self.end_headers()
            return
        return super().do_GET()

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
