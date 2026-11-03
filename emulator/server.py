#!/usr/bin/env python3
"""Serves the emulator page and the project's apps/ directory."""

import base64
import functools
import http.server
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.parse


WEB_PATH = Path(__file__).resolve().parent / "web"
APPS_PATH = Path(os.environ.get("AREA512_APPS_PATH", "/workspace/apps"))
LISTEN_PORT = 8080
APPS_URL_PREFIX = "/apps/"
APP_FILE_LIST_URL = "/apps.json"
DEVICE_FILES_URL_PREFIX = "/device-files/"
RUBY_SOURCE_SUFFIX = ".rb"
BYTECODE_SUFFIX = ".mrb"


class AppCompileError(Exception):
    pass


def list_app_file_paths():
    return sorted(
        str(path.relative_to(APPS_PATH).as_posix())
        for path in APPS_PATH.rglob("*")
        if path.is_file()
    )


def compile_ruby_source(source_path, bytecode_path):
    result = subprocess.run(
        ["picorbc", "-o", str(bytecode_path), str(source_path)],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise AppCompileError(f"{source_path.name}: {result.stderr.strip()}")


def encode_device_file(relative_path, file_bytes):
    return {
        "path": relative_path.as_posix(),
        "base64": base64.b64encode(file_bytes).decode(),
    }


def collect_device_files(app_path):
    """Every file the device needs, with each Ruby source compiled beside it."""
    device_files = []

    with tempfile.TemporaryDirectory() as bytecode_directory:
        for path in sorted(app_path.rglob("*")):
            relative_path = path.relative_to(app_path)

            if not path.is_file() or path.suffix == BYTECODE_SUFFIX:
                continue

            device_files.append(encode_device_file(relative_path, path.read_bytes()))

            if path.suffix == RUBY_SOURCE_SUFFIX:
                bytecode_path = Path(bytecode_directory) / "app.mrb"

                compile_ruby_source(path, bytecode_path)
                device_files.append(encode_device_file(
                    relative_path.with_suffix(BYTECODE_SUFFIX),
                    bytecode_path.read_bytes(),
                ))

    return device_files


class EmulatorRequestHandler(http.server.SimpleHTTPRequestHandler):
    # SharedArrayBuffer, which the wasm threads need, requires both COOP and COEP.
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        url_path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)

        if url_path == APP_FILE_LIST_URL:
            self.send_body(200, "application/json", json.dumps(list_app_file_paths()))
        elif url_path.startswith(DEVICE_FILES_URL_PREFIX):
            self.send_device_files(url_path[len(DEVICE_FILES_URL_PREFIX):])
        else:
            super().do_GET()

    def send_body(self, status, content_type, text):
        body = text.encode()

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_device_files(self, app_name):
        app_path = (APPS_PATH / app_name).resolve()

        if app_path.parent != APPS_PATH.resolve() or not app_path.is_dir():
            self.send_body(404, "text/plain", f"no app named {app_name}")
            return

        try:
            device_files = collect_device_files(app_path)
        except AppCompileError as error:
            self.send_body(422, "text/plain", str(error))
            return

        self.send_body(200, "application/json", json.dumps(device_files))

    def translate_path(self, path):
        url_path = urllib.parse.unquote(urllib.parse.urlsplit(path).path)

        if not url_path.startswith(APPS_URL_PREFIX):
            return super().translate_path(path)

        relative_path = url_path[len(APPS_URL_PREFIX):]
        resolved_path = (APPS_PATH / relative_path).resolve()

        if not resolved_path.is_relative_to(APPS_PATH.resolve()):
            return str(APPS_PATH / "not-found")

        return str(resolved_path)


def main():
    handler = functools.partial(EmulatorRequestHandler, directory=str(WEB_PATH))
    server = http.server.ThreadingHTTPServer(("0.0.0.0", LISTEN_PORT), handler)

    print(f"Area512 emulator: http://localhost:{LISTEN_PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
