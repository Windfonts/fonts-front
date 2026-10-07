#!/usr/bin/env python3
"""Local-only editor for family-review-options.html. Not a public server."""
from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDITS = ROOT / "data" / "family-review-edits.json"
PORT = 16043


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        return

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

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
