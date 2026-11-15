"""Check the idle-connection contract between the two production images."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest


class HttpTransportTests(unittest.TestCase):
    def test_proxy_retires_idle_connections_before_gunicorn(self) -> None:
        docker = shutil.which("docker")
        assert docker is not None, "Docker is required to check the production images"
        backend_image = os.environ.get("BACKEND_IMAGE", "cinexplorer-backend:ci")
        web_image = os.environ.get("WEB_IMAGE", "cinexplorer-web:ci")
        gunicorn = json.loads(
            subprocess.check_output(  # noqa: S603 — repository-owned Docker invocation
                [
                    docker,
                    "run",
                    "--rm",
                    "--memory=128m",
                    "--cpus=1",
                    "--entrypoint",
                    "python",
                    backend_image,
                    "-c",
                    "import json, sys; "
                    "from gunicorn.app.wsgiapp import WSGIApplication; "
                    "sys.argv = ['gunicorn', 'config.wsgi:application']; "
                    "app = WSGIApplication(); "
                    "print(json.dumps({'keepalive': app.cfg.keepalive}))",
                ],
                text=True,
                timeout=30,
            )
        )
        config = json.loads(
            subprocess.check_output(  # noqa: S603 — repository-owned Docker invocation
                [
                    docker,
                    "run",
                    "--rm",
                    "--memory=128m",
                    "--cpus=1",
                    "-e",
                    "SITE_ADDRESS=http://localhost",
                    "-e",
                    "ADMIN_BASIC_AUTH_USER=validation",
                    "-e",
                    "ADMIN_BASIC_AUTH_HASH="
                    "$2a$14$HLp8vy4vbsXK0dk4sjZNTevkV0niUbCS5SxIGUAreBAjRkt5SSBrm",
                    web_image,
                    "caddy",
                    "adapt",
                    "--adapter",
                    "caddyfile",
                    "--config",
                    "/etc/caddy/Caddyfile",
                ],
                text=True,
                timeout=30,
            )
        )
        proxies = list(backend_proxies(config))
        assert proxies, "No production backend proxy was checked"
        for proxy in proxies:
            with self.subTest(upstreams=proxy["upstreams"]):
                keep_alive = proxy.get("transport", {}).get("keep_alive", {})
                if keep_alive.get("enabled") is False:
                    continue
                # Caddy's documented HTTP transport default is two minutes, in nanoseconds.
                # https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#transports
                proxy_idle = keep_alive.get("idle_timeout", 120_000_000_000) / 1e9
                assert gunicorn["keepalive"] > 0
                assert proxy_idle > 0
                assert proxy_idle < gunicorn["keepalive"], (
                    f"Caddy idle timeout ({proxy_idle}s) must be below "
                    f"Gunicorn keepalive ({gunicorn['keepalive']}s)"
                )


def backend_proxies(value: object):
    """Find every route to the backend, including the separately protected admin route."""
    if isinstance(value, dict):
        if value.get("handler") == "reverse_proxy" and any(
            upstream.get("dial") == "backend:8000"
            for upstream in value.get("upstreams", [])
        ):
            yield value
        for child in value.values():
            yield from backend_proxies(child)
    elif isinstance(value, list):
        for child in value:
            yield from backend_proxies(child)


if __name__ == "__main__":
    unittest.main()
