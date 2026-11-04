"""Exercise the deployment script in a disposable filesystem with command boundaries."""

from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "deploy.sh"
TARGET = "c" * 40
PREVIOUS = "a" * 40
CONTAINER_REVISION = "b" * 40
BACKUP = SCRIPT.with_name("backup.sh")
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
record() { printf '%s\\n' "$1" >> /opt/cinexplorer/order; }
if [[ $1 == run ]]; then
    [[ $* == *rclone/rclone:1.75.2* && $* == *copyto* ]] || exit 98
    [[ $RCLONE_CONFIG_R2_ACCESS_KEY_ID == fixture-key &&
       $RCLONE_CONFIG_R2_SECRET_ACCESS_KEY == fixture-secret ]] || exit 99
    [[ -f /opt/cinexplorer/validated ]] || exit 100
    [[ ${FIXTURE_FAIL_BACKUP:-0} == 0 ]] || exit 16
    touch /opt/cinexplorer/uploaded
    record uploaded
    exit
fi
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
    'up -d --wait --no-recreate db')
        [[ -f /opt/cinexplorer/pulled ]] || exit 92
        if [[ ! -f /opt/cinexplorer/db-identity ]]; then
            printf 'new-database' > /opt/cinexplorer/db-identity
        fi
        touch /opt/cinexplorer/db-ready
        record db-ready ;;
    *pg_dump*)
        [[ -f /opt/cinexplorer/db-ready ]] || exit 101
        printf PGDMPfixture
        record dump ;;
    'exec -T db pg_restore --list')
        archive=$(cat)
        [[ $archive == PGDMP* ]] || exit 102
        touch /opt/cinexplorer/validated
        record validated ;;
    'run --rm backend python manage.py migrate')
        [[ -f /opt/cinexplorer/backup-complete ]] || exit 103
        [[ -z ${RCLONE_CONFIG_R2_SECRET_ACCESS_KEY:-} ]] || exit 104
        [[ ${FIXTURE_FAIL_MIGRATION:-0} == 0 ]] || exit 17
        touch /opt/cinexplorer/migrated
        record migrate ;;
    'run --rm backend python manage.py sync_blacklist')
        [[ -f /opt/cinexplorer/migrated ]] || exit 105
        [[ ${FIXTURE_FAIL_SYNC:-0} == 0 ]] || exit 18
        touch /opt/cinexplorer/synced
        record sync ;;
    'run --rm backend python manage.py configure_site')
        [[ -f /opt/cinexplorer/synced ]] || exit 93
        touch /opt/cinexplorer/site-configured
        record site ;;
    'up -d --wait')
        [[ -f /opt/cinexplorer/site-configured ]] || exit 94
        touch /opt/cinexplorer/started
        record up ;;
    *) printf 'Unexpected docker arguments: %s\\n' "$*" >&2; exit 95 ;;
esac
"""
CURL = """#!/usr/bin/env bash
set -euo pipefail
url=${!#}
if [[ $url == https://heartbeat.fixture/backup/fail ]]; then
    cat > /dev/null
    exit
fi
if [[ $url == https://heartbeat.fixture/backup ]]; then
    [[ -f /opt/cinexplorer/uploaded ]] || exit 106
    [[ -z $(find /opt/cinexplorer/backups -type f -print -quit) ]] || exit 107
    [[ ${FIXTURE_FAIL_PING:-0} == 0 ]] || exit 22
    touch /opt/cinexplorer/backup-complete
    printf 'backup\\n' >> /opt/cinexplorer/order
    exit
fi
[[ -f /opt/cinexplorer/started ]] || exit 96
[[ $* == *'https://staging.fixture.invalid/api/health-check/'* ]] || exit 97
[[ ${FIXTURE_FAIL_HEALTH:-0} == 0 ]] || exit 22
"""


@dataclass
class DeployResult:
    process: subprocess.CompletedProcess[str]
    history: str
    environment: str
    started: bool
    order: list[str]
    database: str


class DeployScriptTests(unittest.TestCase):
    def run_deploy(
        self,
        *,
        history: str = "",
        container: bool = False,
        dirty: bool = False,
        fail_migration: bool = False,
        fail_health: bool = False,
        fail_backup: bool = False,
        fail_ping: bool = False,
        fail_sync: bool = False,
        database: str = "running",
    ) -> DeployResult:
        with tempfile.TemporaryDirectory(prefix="cx-deploy-test-") as scratch:
            root = Path(scratch)
            operations = root / "operations"
            deployment = operations / "repo" / "infrastructure" / "deploy"
            deployment.mkdir(parents=True)
            (deployment / "backup.sh").write_text(BACKUP.read_text())
            (operations / "backups").mkdir(mode=0o700)
            (operations / "ops.env").write_text(
                "RCLONE_CONFIG_R2_TYPE=s3\n"
                "RCLONE_CONFIG_R2_PROVIDER=Cloudflare\n"
                "RCLONE_CONFIG_R2_ACCESS_KEY_ID=fixture-key\n"
                "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=fixture-secret\n"
                "RCLONE_CONFIG_R2_ENDPOINT=https://fixture.r2.cloudflarestorage.com\n"
                "RCLONE_CONFIG_R2_REGION=auto\n"
                "RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true\n"
                "R2_BUCKET=fixture-bucket\nR2_PREFIX=database\n"
                "BACKUP_PING_URL=https://heartbeat.fixture/backup\n"
            )
            if database != "absent":
                (operations / "db-identity").write_text(f"existing-{database}")
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
                "-e",
                f"FIXTURE_FAIL_BACKUP={int(fail_backup)}",
                "-e",
                f"FIXTURE_FAIL_PING={int(fail_ping)}",
                "-e",
                f"FIXTURE_FAIL_SYNC={int(fail_sync)}",
                "ubuntu:24.04",
                "bash",
                "/source/deploy.sh",
                TARGET,
                "manual",
            ]
            result = subprocess.run(
                command, capture_output=True, text=True, timeout=30, check=False
            )
            return DeployResult(
                result,
                (operations / "deploy-history.log").read_text(),
                (operations / "prod.env").read_text(),
                (operations / "started").exists(),
                (operations / "order").read_text().splitlines()
                if (operations / "order").exists()
                else [],
                (operations / "db-identity").read_text()
                if (operations / "db-identity").exists()
                else "",
            )

    def test_previous_version_comes_from_success_history(self) -> None:
        outcome = self.run_deploy(history=HISTORY, container=True)
        result, history = outcome.process, outcome.history
        env, started = outcome.environment, outcome.started
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(
            history.splitlines()[-1].split()[1:],
            ["manual", PREVIOUS, "sha-aaaaaaa", TARGET, "sha-ccccccc"],
        )
        self.assertEqual(len(history.splitlines()), 2)
        self.assertIn("IMAGE_TAG=sha-ccccccc\n", env)
        self.assertTrue(started)
        markers = [
            line for line in result.stdout.splitlines() if line.startswith("==> ")
        ]
        self.assertEqual(
            [line.split()[1] for line in markers], ["1", "2", "3", "4", "5", "6"]
        )

    def test_previous_version_comes_from_container_including_stopped(self) -> None:
        outcome = self.run_deploy(container=True)
        result, history = outcome.process, outcome.history
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(history.split()[2:4], [CONTAINER_REVISION, "sha-bbbbbbb"])

    def test_no_previous_version_uses_placeholders(self) -> None:
        outcome = self.run_deploy()
        result, history = outcome.process, outcome.history
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(history.split()[2:4], ["-", "-"])

    def test_dirty_checkout_changes_nothing(self) -> None:
        outcome = self.run_deploy(history=HISTORY, dirty=True)
        result, history = outcome.process, outcome.history
        env, started = outcome.environment, outcome.started
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(history, HISTORY)
        self.assertIn("IMAGE_TAG=sha-unreliable\n", env)
        self.assertFalse(started)
        self.assertNotIn("==> 2 ", result.stdout)

    def test_failed_migration_keeps_history_and_does_not_start_services(self) -> None:
        outcome = self.run_deploy(history=HISTORY, fail_migration=True)
        result, history = outcome.process, outcome.history
        started = outcome.started
        self.assertEqual(result.returncode, 17, result.stdout + result.stderr)
        self.assertEqual(history, HISTORY)
        self.assertFalse(started)
        self.assertNotIn("==> 4 ", result.stdout)

    def test_failed_public_health_check_does_not_record_success(self) -> None:
        outcome = self.run_deploy(history=HISTORY, fail_health=True)
        result, history = outcome.process, outcome.history
        started = outcome.started
        self.assertEqual(result.returncode, 22, result.stdout + result.stderr)
        self.assertEqual(history, HISTORY)
        self.assertTrue(started)
        self.assertNotIn("==> 6 ", result.stdout)

    def test_backup_precedes_migrations_and_blacklist_precedes_site(self) -> None:
        outcome = self.run_deploy(history=HISTORY)
        self.assertEqual(outcome.process.returncode, 0, outcome.process.stderr)
        self.assertEqual(
            outcome.order,
            [
                "db-ready",
                "dump",
                "validated",
                "uploaded",
                "backup",
                "migrate",
                "sync",
                "site",
                "up",
            ],
        )

    def test_failed_backup_never_migrates_or_records_success(self) -> None:
        for failure in ("upload", "heartbeat"):
            with self.subTest(failure=failure):
                outcome = self.run_deploy(
                    history=HISTORY,
                    fail_backup=failure == "upload",
                    fail_ping=failure == "heartbeat",
                )
                self.assertEqual(
                    outcome.process.returncode,
                    16 if failure == "upload" else 22,
                    outcome.process.stderr,
                )
                self.assertEqual(outcome.history, HISTORY)
                self.assertFalse(outcome.started)
                self.assertNotIn("migrate", outcome.order)
                self.assertNotIn("sync", outcome.order)
                self.assertNotIn("site", outcome.order)

    def test_failed_blacklist_sync_never_configures_site_or_records_success(
        self,
    ) -> None:
        outcome = self.run_deploy(history=HISTORY, fail_sync=True)
        self.assertEqual(outcome.process.returncode, 18, outcome.process.stderr)
        self.assertEqual(outcome.history, HISTORY)
        self.assertFalse(outcome.started)
        self.assertIn("migrate", outcome.order)
        self.assertNotIn("site", outcome.order)

    def test_database_is_prepared_without_replacing_existing_container(self) -> None:
        for database in ("running", "stopped", "absent"):
            with self.subTest(database=database):
                outcome = self.run_deploy(database=database)
                self.assertEqual(outcome.process.returncode, 0, outcome.process.stderr)
                self.assertEqual(
                    outcome.database,
                    "new-database" if database == "absent" else f"existing-{database}",
                )
                self.assertLess(
                    outcome.order.index("db-ready"), outcome.order.index("dump")
                )


if __name__ == "__main__":
    unittest.main()
