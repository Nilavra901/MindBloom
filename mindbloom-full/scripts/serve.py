#!/usr/bin/env python3
"""
scripts/serve.py
─────────────────
Starts a local HTTP server for MindBloom development.
Required when loading TF.js model from tfjs_model/ folder.

Usage:
    python scripts/serve.py
    # Then open: http://localhost:8000
"""
import http.server
import socketserver
import os
import webbrowser
import threading

PORT = 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        # Suppress verbose logs, only show errors
        if args[1] not in ('200', '304'):
            super().log_message(format, *args)

def open_browser():
    import time
    time.sleep(1)
    webbrowser.open(f'http://localhost:{PORT}')

if __name__ == '__main__':
    os.chdir(ROOT)
    threading.Thread(target=open_browser, daemon=True).start()
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🌿 MindBloom running at http://localhost:{PORT}")
        print(f"   Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n⛔ Server stopped.")
