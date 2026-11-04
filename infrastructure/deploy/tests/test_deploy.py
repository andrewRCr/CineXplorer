"""Exercise the deployment script in a disposable filesystem with command boundaries."""

from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "deploy.sh"
TARGET = "c" * 40
PREVIOUS = "a" * 40
CONTAINER_REVISION = "b" * 40
HISTORY = f"2026-11-04T10:00:00Z manual - - {PREVIOUS} sha-aaaaaaa\n"

GIT = """#!/usr/bin/env bash
set -euo pipefail
case "$1" in
    status) if [[ ${FIXTURE_DIRTY:-0} == 1 ]]; then printf ' M changed-file\\n'; fi ;;
    checkout) printf '%s\\n' "$*" > /opt/cinexplorer/checkout ;;
    *) exit 90 ;;
esac
"""
DOCKER = """#!/usr/bin/env bash
set -euo pipefail
if [[ $1 == inspect ]]; then
    if [[ $3 == '{{.Config.Image}}' ]]; then
        printf 'ghcr.io/example/backend:sha-bbbbbbb\\n'
    else
        printf '%s\\n' 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    fi
    exit
fi
[[ $1 == compose && $2 == -f && $3 == docker-compose.prod.yml &&
   $4 == --env-file && $5 == /opt/cinexplorer/prod.env ]] || exit 91
shift 5
case "$*" in
    'ps --all --quiet backend')
        if [[ ${FIXTURE_CONTAINER:-0} == 1 ]]; then printf 'fixture-backend\\n'; fi ;;
    # The fixture container is stopped, so ordinary ps excludes it.
    'ps --quiet backend') ;;
    'config --quiet') ;;
    'config --environment') printf 'SITE_ADDRESS=staging.fixture.invalid\\n' ;;
    pull) touch /opt/cinexplorer/pulled ;;
    'run --rm backend python manage.py migrate')
        [[ -f /opt/cinexplorer/pulled ]] || exit 92
        [[ ${FIXTURE_FAIL_MIGRATION:-0} == 0 ]] || exit 17
        touch /opt/cinexplorer/migrated ;;
    'run --rm backend python manage.py configure_site')
        [[ -f /opt/cinexplorer/migrated ]] || exit 93
        touch /opt/cinexplorer/site-configured ;;
    'up -d --wait')
        [[ -f /opt/cinexplorer/site-configured ]] || exit 94
        touch /opt/cinexplorer/started ;;
    *) printf 'Unexpected docker arguments: %s\\n' "$*" >&2; exit 95 ;;
esac
"""
CURL = """#!/usr/bin/env bash
set -euo pipefail
[[ -f /opt/cinexplorer/started ]] || exit 96
[[ $* == *'https://staging.fixture.invalid/api/health-check/'* ]] || exit 97
[[ ${FIXTURE_FAIL_HEALTH:-0} == 0 ]] || exit 22
"""


class DeployScriptTests(unittest.TestCase):
    def run_deploy(
        self,
        *,
        history: str = "",
        container: bool = False,
        dirty: bool = False,
        fail_migration: bool = False,
        fail_health: bool = False,
    ) -> tuple[subprocess.CompletedProcess[str], str, str, bool]:
        with tempfile.TemporaryDirectory(prefix="cx-deploy-test-") as scratch:
            root = Path(scratch)
            operations = root / "operations"
            (operations / "repo" / "infrastructure").mkdir(parents=True)
            (operations / "prod.env").write_text(
                "IMAGE_TAG=sha-unreliable\nSITE_ADDRESS=staging.fixture.invalid\n"
            )
            (operations / "deploy-history.log").write_text(history)
            binaries = root / "bin"
            binaries.mkdir()
            for name, content in {"git": GIT, "docker": DOCKER, "curl": CURL}.items():
                path = binaries / name
                path.write_text(content)
                path.chmod(0o755)
            command = [
                "docker",
                "run",
                "--rm",
                "--user",
                f"{os.getuid()}:{os.getgid()}",
                "-v",
                f"{operations}:/opt/cinexplorer",
                "-v",
                f"{binaries}:/fixture-bin:ro",
                "-v",
                f"{SCRIPT.parent}:/source:ro",
                "-e",
                "PATH=/fixture-bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "-e",
                f"FIXTURE_CONTAINER={int(container)}",
                "-e",
                f"FIXTURE_DIRTY={int(dirty)}",
                "-e",
                f"FIXTURE_FAIL_MIGRATION={int(fail_migration)}",
                "-e",
                f"FIXTURE_FAIL_HEALTH={int(fail_health)}",
                "ubuntu:24.04",
                "bash",
                "/source/deploy.sh",
                TARGET,
                "manual",
            ]
            result = subprocess.run(
                command, capture_output=True, text=True, timeout=30, check=False
            )
            return (
                result,
                (operations / "deploy-history.log").read_text(),
                (operations / "prod.env").read_text(),
                (operations / "started").exists(),
            )

    def test_previous_version_comes_from_success_history(self) -> None:
        result, history, env, started = self.run_deploy(history=HISTORY, container=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(
            history.splitlines()[-1].split()[1:],
            ["manual", PREVIOUS, "sha-aaaaaaa", TARGET, "sha-ccccccc"],
        )
        self.assertEqual(len(history.splitlines()), 2)
        self.assertIn("IMAGE_TAG=sha-ccccccc\n", env)
        self.assertTrue(started)
        markers = [line for line in result.stdout.splitlines() if line.startswith("==> ")]
        self.assertEqual([line.split()[1] for line in markers], ["1", "2", "3", "4", "5", "6"])

    def test_previous_version_comes_from_container_including_stopped(self) -> None:
        result, history, _, _ = self.run_deploy(container=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(history.split()[2:4], [CONTAINER_REVISION, "sha-bbbbbbb"])

    def test_no_previous_version_uses_placeholders(self) -> None:
        result, history, _, _ = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(history.split()[2:4], ["-", "-"])

    def test_dirty_checkout_changes_nothing(self) -> None:
        result, history, env, started = self.run_deploy(history=HISTORY, dirty=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(history, HISTORY)
        self.assertIn("IMAGE_TAG=sha-unreliable\n", env)
        self.assertFalse(started)
        self.assertNotIn("==> 2 ", result.stdout)

    def test_failed_migration_keeps_history_and_does_not_start_services(self) -> None:
        result, history, _, started = self.run_deploy(history=HISTORY, fail_migration=True)
        self.assertEqual(result.returncode, 17, result.stdout + result.stderr)
        self.assertEqual(history, HISTORY)
        self.assertFalse(started)
        self.assertNotIn("==> 4 ", result.stdout)

    def test_failed_public_health_check_does_not_record_success(self) -> None:
        result, history, _, started = self.run_deploy(history=HISTORY, fail_health=True)
        self.assertEqual(result.returncode, 22, result.stdout + result.stderr)
        self.assertEqual(history, HISTORY)
        self.assertTrue(started)
        self.assertNotIn("==> 6 ", result.stdout)


if __name__ == "__main__":
    unittest.main()
