import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if urlparse(self.path).path == "/json.htm":
            body = json.dumps(
                {
                    "status": "OK",
                    "user": "codex-test",
                    "rights": 2,
                    "version": "2026.1",
                    "result": [],
                    "Sunrise": "06:00",
                    "Sunset": "21:00",
                    "ServerTime": "2026-07-30 12:00:00",
                }
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


ThreadingHTTPServer(("127.0.0.1", 8123), Handler).serve_forever()
