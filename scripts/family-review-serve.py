#!/usr/bin/env python3
"""Local-only editor for family-review-options.html. Not a public server."""
from __future__ import annotations

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDITS = ROOT / "data" / "family-review-edits.json"
PORT = 16043

sys.path.insert(0, str(Path(__file__).resolve().parent))
from family_review import load_catalog, load_edits, merge_rows, payload  # noqa: E402


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        return

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith((".json", ".html")) or path in {
            "/family-review-seed",
            "/family-review-options.html",
        }:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/family-review-seed":
            rows = merge_rows(load_catalog(ROOT), load_edits(ROOT))
            body = json.dumps(payload(rows), ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/family-review-save":
            self.send_error(404)
            return
        n = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(n)
        data = json.loads(raw.decode("utf-8"))
        EDITS.parent.mkdir(parents=True, exist_ok=True)
        EDITS.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        body = b'{"ok":true,"path":"data/family-review-edits.json"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"http://127.0.0.1:{PORT}/family-review-options.html", flush=True)
    httpd.serve_forever()
