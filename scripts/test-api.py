#!/usr/bin/env python3
"""Smoke-test the hub API on a temporary port. Restores data JSON afterwards."""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ["notes.json", "watchlist.json", "danmaku.json", "now.json"]


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def request(base: str, path: str, method="GET", body=None, headers=None, cookies=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(base + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    if cookies:
        req.add_header("Cookie", cookies)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            raw = res.read().decode()
            cookie = res.headers.get("Set-Cookie", "")
            payload = json.loads(raw) if raw else {}
            return res.status, payload, cookie
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"error": raw}
        return error.code, payload, ""


def main() -> int:
    backups = {name: (ROOT / "data" / name).read_bytes() for name in FILES}
    port = free_port()
    env = os.environ.copy()
    env["PORT"] = str(port)
    env["HUB_ADMIN_TOKEN"] = "test-token"
    proc = subprocess.Popen(
        [sys.executable.replace("python3", "node") if False else "node", "server.js"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(40):
            try:
                status, _, _ = request(base, "/api/content")
                if status == 200:
                    break
            except Exception:
                time.sleep(0.05)
        else:
            raise SystemExit("server did not start")

        with urllib.request.urlopen(base + "/", timeout=5) as res:
            html = res.read().decode()
            assert res.status == 200
            assert "Chase Xie" in html

        status, content, _ = request(base, "/api/content")
        assert status == 200 and "notes" in content and "watchlist" in content

        status, _, _ = request(base, "/api/session", "POST", {"token": "nope"})
        assert status == 403

        status, session, cookie = request(base, "/api/session", "POST", {"token": "test-token"})
        assert status == 200 and session.get("admin") is True
        assert "HubSession=" in cookie
        session_cookie = cookie.split(";", 1)[0]

        status, saved, _ = request(
            base,
            "/api/notes",
            "PUT",
            {"items": [{"id": "n_test", "title": "测试", "body": "仅接口测试", "createdAt": "2026-08-17T00:00:00.000Z"}]},
            cookies=session_cookie,
        )
        assert status == 200 and saved["notes"]["items"][0]["title"] == "测试"

        status, now_saved, _ = request(
            base,
            "/api/now",
            "PUT",
            {"text": "测试最近在做"},
            cookies=session_cookie,
        )
        assert status == 200 and now_saved["now"]["text"] == "测试最近在做", (status, now_saved)

        status, _, _ = request(base, "/api/notes", "PUT", {"items": []})
        assert status == 401

        status, danmaku, _ = request(base, "/api/danmaku", "POST", {"nick": "访客", "text": "好看"})
        assert status == 200 and danmaku["item"]["text"] == "好看", (status, danmaku)

        status, blocked, _ = request(base, "/api/danmaku", "POST", {"text": "https://spam.example"})
        assert status == 400, (status, blocked)

        status, limited, _ = request(base, "/api/danmaku", "POST", {"text": "第二条"})
        assert status == 429, (status, limited)

        print("ok")
        return 0
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill()
        for name, blob in backups.items():
            (ROOT / "data" / name).write_bytes(blob)


if __name__ == "__main__":
    raise SystemExit(main())
