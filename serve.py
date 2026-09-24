# Serves this folder at http://localhost:5173 and tells the browser not to
# cache anything, so edited files show up on the next reload.
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


ThreadingHTTPServer(("localhost", 5173), NoCacheHandler).serve_forever()
