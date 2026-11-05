"""Disposable Ubuntu host with real parsers and inert host-operation boundaries."""

from __future__ import annotations

import subprocess
import time
import uuid
from pathlib import Path

IMAGE = "cinexplorer-bootstrap:launch-readiness-test"
SOURCE = Path(__file__).resolve().parents[1]
STUBS = {
    "/usr/bin/systemctl": """#!/usr/bin/env bash
set -euo pipefail
unit=${!#}
case "$1" in
    is-enabled) [[ -f /fixture-state/enabled-$unit ]] ;;
    is-active) [[ -f /fixture-state/active-$unit ]] ;;
    enable) touch "/fixture-state/enabled-$unit" ;;
    start) touch "/fixture-state/active-$unit" ;;
    reload|daemon-reload) printf '%s\\n' "$*" >> /fixture-state/service-actions ;;
    *) exit 1 ;;
esac
""",
    "/usr/bin/timedatectl": """#!/usr/bin/env bash
set -euo pipefail
case "$1" in
    show)
        if [[ -f /fixture-state/timezone ]]; then cat /fixture-state/timezone
        else printf 'Etc/UTC\\n'; fi ;;
    set-timezone) printf '%s\\n' "$2" > /fixture-state/timezone ;;
    *) exit 1 ;;
esac
""",
    "/usr/sbin/swapon": """#!/usr/bin/env bash
set -euo pipefail
printf '/swapfile\\n'
""",
    "/usr/sbin/ufw": """#!/usr/bin/env bash
set -euo pipefail
case "$*" in
    'show added') cat /fixture-state/firewall-rules ;;
    status)
        if [[ -f /fixture-state/firewall-active ]]; then printf 'Status: active\\n'
        else printf 'Status: inactive\\n'; fi ;;
    'allow '*) printf 'ufw %s\\n' "$*" >> /fixture-state/firewall-rules ;;
    '--force enable') touch /fixture-state/firewall-active ;;
    *) exit 1 ;;
esac
""",
}


class UbuntuFixture:
    """Keep every server path inside a container without host privileges or a Docker socket."""

    def __init__(self) -> None:
        self.name = f"cx-bootstrap-test-{uuid.uuid4().hex[:10]}"

    def __enter__(self) -> UbuntuFixture:
        subprocess.run(
            [
                "docker",
                "run",
                "-d",
                "--name",
                self.name,
                "--memory=512m",
                "--cpus=2",
                "-v",
                f"{SOURCE}:/source:ro",
                IMAGE,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        try:
            self.shell("mkdir -p /fixture-state; touch /fixture-state/firewall-rules")
            for path, text in STUBS.items():
                self.write(path, text, mode="755")
        except BaseException:
            self.__exit__()
            raise
        return self

    def __exit__(self, *_args: object) -> None:
        subprocess.run(["docker", "rm", "-f", self.name], check=True, capture_output=True)

    def run(
        self,
        args: list[str],
        *,
        user: str = "root",
        text: str | None = None,
        check: bool = True,
        timeout: float = 30,
    ) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            ["docker", "exec", "-i", "--user", user, self.name, *args],
            input=text,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        if check and result.returncode:
            raise AssertionError(result.stdout + result.stderr)
        return result

    def shell(
        self, script: str, *, user: str = "root", check: bool = True, timeout: float = 30
    ) -> subprocess.CompletedProcess[str]:
        return self.run(["bash", "-s"], text=script, user=user, check=check, timeout=timeout)

    def write(self, path: str, text: str, *, mode: str = "644") -> None:
        self.run(["sh", "-c", 'cat > "$1" && chmod "$2" "$1"', "sh", path, mode], text=text)

    def read(self, path: str) -> str:
        return self.run(["cat", path]).stdout

    def bootstrap(self) -> str:
        return self.run(["bash", "/source/bootstrap.sh"]).stdout

    def wait_for(self, path: str, *, timeout: float = 10) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.run(["test", "-e", path], check=False).returncode == 0:
                return
            time.sleep(0.1)
        raise AssertionError(f"Timed out waiting for {path}")
