#!/usr/bin/env python3
"""Serve the web export with a real wasm MIME type and no Content-Encoding."""
import http.server
import os
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "web")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".pck": "application/octet-stream",
        ".js": "text/javascript",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

os.chdir(ROOT)
http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
