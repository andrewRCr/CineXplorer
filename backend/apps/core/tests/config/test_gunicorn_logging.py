"""Gunicorn worker errors preserve diagnostics without logging query strings."""

import socket
import subprocess
import sys
from http.client import HTTPConnection
from pathlib import Path


def test_worker_error_logs_path_without_query(tmp_path: Path) -> None:
    """Fail before response headers and inspect the real worker's error output."""
    path = "/admin/users/user/"
    query = "q=fixture-viewer%40example.test"
    (tmp_path / "failing_wsgi.py").write_text(
        f"""
def application(environ, start_response):
    if environ["QUERY_STRING"] != {query!r}:
        start_response("204 No Content", [])
        return []
    raise RuntimeError("Synthetic worker failure")
""",
        encoding="utf-8",
    )
    backend = Path(__file__).resolve().parents[4]

    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        listener_fd = listener.fileno()
        # Keep the port reserved until Gunicorn has inherited the listening socket.
        with subprocess.Popen(  # noqa: S603 - fixed test process and pytest-owned paths
            [
                sys.executable,
                "-m",
                "gunicorn",
                "--config",
                str(backend / "gunicorn.conf.py"),
                "--bind",
                f"fd://{listener_fd}",
                "--workers",
                "1",
                "--pythonpath",
                str(tmp_path),
                "failing_wsgi:application",
            ],
            cwd=backend,
            pass_fds=(listener_fd,),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        ) as server:
            connection = HTTPConnection("127.0.0.1", listener.getsockname()[1], timeout=10)
            try:
                connection.request("GET", f"{path}?{query}")
                with connection.getresponse() as response:
                    response.read()
                    status = response.status
            finally:
                connection.close()
                server.terminate()
                try:
                    _, error_log = server.communicate(timeout=10)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.communicate()
                    raise

    assert status == 500, error_log
    assert "fixture-viewer" not in error_log
    assert any(
        line.endswith(f"Error handling request GET {path}") for line in error_log.splitlines()
    )
    assert "Traceback (most recent call last)" in error_log
    assert "RuntimeError: Synthetic worker failure" in error_log
