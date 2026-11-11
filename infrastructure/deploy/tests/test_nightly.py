"""Nightly jobs preserve failure status and report the failed command's output."""

from __future__ import annotations

import unittest
from dataclasses import dataclass

from bootstrap_fixture import UbuntuFixture

ENVIRONMENT = [
    "RCLONE_CONFIG_R2_TYPE=s3",
    "RCLONE_CONFIG_R2_PROVIDER=Cloudflare",
    "RCLONE_CONFIG_R2_ACCESS_KEY_ID=fixture-key",
    "RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=fixture-secret",
    "RCLONE_CONFIG_R2_ENDPOINT=https://fixture.r2.cloudflarestorage.com",
    "RCLONE_CONFIG_R2_REGION=auto",
    "RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true",
    "R2_BUCKET=fixture-bucket",
    "R2_PREFIX=fixture-prefix",
    "BACKUP_PING_URL=https://heartbeat.fixture/backup",
    "MAINTENANCE_PING_URL=https://heartbeat.fixture/maintenance",
]
DOCKER = r"""#!/usr/bin/env bash
set -euo pipefail
if [[ $1 == compose ]]; then
    [[ $2 == -f && $3 == docker-compose.prod.yml && $4 == --env-file &&
       $5 == /opt/cinexplorer/prod.env ]] || exit 90
    shift 5
    case "$*" in
        *pg_dump*)
            if [[ $* == *--format=custom* ]]; then printf 'PGDMPfixture'
            else printf 'CREATE DATABASE fixture;'; fi
            if [[ ${FAIL_STEP:-} == dump ]]; then printf 'dump step failed\n' >&2; exit 11; fi ;;
        *'pg_restore --list'*)
            archive=$(cat)
            if [[ ${FAIL_STEP:-} == list || $archive != PGDMP* ]]; then
                printf 'archive validation failed\n' >&2; exit 12
            fi
            printf 'archive accepted\n' ;;
        *flushexpiredtokens*)
            if [[ ${FAIL_STEP:-} == tokens ]]; then
                printf 'token cleanup failed\n' >&2; exit 17
            fi
            touch /opt/cinexplorer/tokens-cleaned
            printf 'tokens\n' >> /opt/cinexplorer/job-events ;;
        *clearsessions*)
            if [[ ${FAIL_STEP:-} == sessions ]]; then
                printf 'session cleanup failed\n' >&2; exit 18
            fi
            touch /opt/cinexplorer/sessions-cleaned
            printf 'sessions\n' >> /opt/cinexplorer/job-events ;;
        *refresh_movie_cards*)
            printf 'refresh\n' >> /opt/cinexplorer/job-events
            if [[ ! -f /opt/cinexplorer/repo/backend/apps/movie/management/commands/refresh_movie_cards.py ]]; then
                printf "Unknown command: 'refresh_movie_cards'\n" >&2; exit 1
            fi
            if [[ ${FAIL_STEP:-} == refresh ]]; then
                for ((line=1; line<=25; line++)); do printf 'refresh output %s\n' "$line"; done
                printf 'Refreshed: 1; failed: 1\nStale TMDB IDs: 550\n' >&2
                exit 19
            fi
            touch /opt/cinexplorer/cards-refreshed
            printf 'Refreshed: 2; failed: 0\n' ;;
        *) exit 92 ;;
    esac
elif [[ $1 == run ]]; then
    [[ $* == *rclone/rclone:1.75.2* && $* == *copyto* ]] || exit 93
    [[ $RCLONE_CONFIG_R2_TYPE == s3 && $RCLONE_CONFIG_R2_PROVIDER == Cloudflare &&
       $RCLONE_CONFIG_R2_NO_CHECK_BUCKET == true ]] || exit 94
    if [[ ${FAIL_STEP:-} == upload ]]; then printf 'object upload failed\n' >&2; exit 13; fi
    printf '%s\n' "${!#}" > /opt/cinexplorer/uploaded
else
    exit 95
fi
"""
CURL = r"""#!/usr/bin/env bash
set -euo pipefail
url=${!#}
printf 'ping:%s\n' "$url" >> /opt/cinexplorer/job-events
printf '%s\n' "$url" >> /opt/cinexplorer/ping-urls
find /opt/cinexplorer/backups -type f | wc -l >> /opt/cinexplorer/ping-dumps
if [[ $* == *--data-binary* ]]; then cat > /opt/cinexplorer/ping-body; fi
if [[ ${FAIL_STEP:-} == ping && $url != */fail ]]; then
    printf 'heartbeat failed\n' >&2; exit 22
fi
"""


@dataclass
class JobResult:
    status: int
    urls: str
    body: str
    uploaded: str
    dumps: list[str]
    cleaned: list[str]
    dumps_at_ping: list[int]
    journal: str
    events: list[str]


class NightlyTests(unittest.TestCase):
    def run_job(self, job: str, fail_step: str = "") -> JobResult:
        with UbuntuFixture() as fixture:
            fixture.bootstrap()
            fixture.shell(
                "mkdir -p /opt/cinexplorer/repo/infrastructure /opt/cinexplorer/repo/backend/apps/movie/management/commands; "
                "touch /opt/cinexplorer/repo/backend/apps/movie/management/commands/refresh_movie_cards.py; "
                "chown -R deploy:deploy /opt/cinexplorer/repo"
            )
            fixture.write("/usr/bin/docker", DOCKER, mode="755")
            fixture.write("/usr/bin/curl", CURL, mode="755")
            result = fixture.run(
                [
                    "env",
                    *ENVIRONMENT,
                    f"FAIL_STEP={fail_step}",
                    "bash",
                    f"/source/{job}.sh",
                ],
                user="deploy",
                check=False,
            )
            urls = fixture.shell(
                "cat /opt/cinexplorer/ping-urls 2>/dev/null || true"
            ).stdout
            body = fixture.shell(
                "cat /opt/cinexplorer/ping-body 2>/dev/null || true"
            ).stdout
            uploaded = fixture.shell(
                "cat /opt/cinexplorer/uploaded 2>/dev/null || true"
            ).stdout
            dumps = fixture.run(
                ["find", "/opt/cinexplorer/backups", "-type", "f"]
            ).stdout.splitlines()
            cleaned = fixture.shell(
                "for marker in tokens-cleaned sessions-cleaned cards-refreshed; do "
                'if [[ -f /opt/cinexplorer/$marker ]]; then printf "%s\\n" "$marker"; fi; done'
            ).stdout.splitlines()
            dumps_at_ping = [
                int(count)
                for count in fixture.read("/opt/cinexplorer/ping-dumps").splitlines()
            ]
            return JobResult(
                result.returncode,
                urls,
                body,
                uploaded,
                dumps,
                cleaned,
                dumps_at_ping,
                result.stdout + result.stderr,
                fixture.read("/opt/cinexplorer/job-events").splitlines(),
            )

    def test_backup_validates_uploads_and_deletes_before_success_ping(self) -> None:
        result = self.run_job("backup")
        self.assertEqual(result.status, 0)
        self.assertEqual(result.urls, "https://heartbeat.fixture/backup\n")
        self.assertRegex(
            result.uploaded,
            r"^r2:fixture-bucket/fixture-prefix/cinexplorer-.*\.dump\n$",
        )
        self.assertEqual(result.dumps, [])
        self.assertEqual(result.dumps_at_ping, [0])

    def test_backup_failures_report_the_failing_step(self) -> None:
        for step, expected, message in [
            ("dump", 11, "dump step failed"),
            ("list", 12, "archive validation failed"),
            ("upload", 13, "object upload failed"),
            ("ping", 22, "heartbeat failed"),
        ]:
            with self.subTest(step=step):
                result = self.run_job("backup", step)
                self.assertEqual(result.status, expected)
                self.assertTrue(
                    result.urls.endswith("https://heartbeat.fixture/backup/fail\n")
                )
                self.assertIn(message, result.body)
                self.assertEqual(len(result.dumps), 0 if step == "ping" else 1)
                if step in ("dump", "list", "upload"):
                    self.assertEqual(result.uploaded, "")

    def test_maintenance_cleans_tokens_and_sessions_before_success_ping(self) -> None:
        result = self.run_job("maintenance")
        self.assertEqual(result.status, 0)
        self.assertEqual(result.urls, "https://heartbeat.fixture/maintenance\n")
        self.assertEqual(
            result.cleaned, ["tokens-cleaned", "sessions-cleaned", "cards-refreshed"]
        )
        self.assertEqual(
            result.events,
            [
                "tokens",
                "sessions",
                "refresh",
                "ping:https://heartbeat.fixture/maintenance",
            ],
        )
        self.assertIn("Refreshed: 2; failed: 0", result.journal)
        self.assertLess(
            result.journal.index("Cleaning expired sessions."),
            result.journal.index("Refreshed: 2; failed: 0"),
        )
        self.assertLess(
            result.journal.index("Refreshed: 2; failed: 0"),
            result.journal.index("Reporting maintenance success."),
        )

    def test_maintenance_failures_report_the_failing_step(self) -> None:
        for step, expected, message in [
            ("tokens", 17, "token cleanup failed"),
            ("sessions", 18, "session cleanup failed"),
            ("refresh", 19, "Stale TMDB IDs: 550"),
            ("ping", 22, "heartbeat failed"),
        ]:
            with self.subTest(step=step):
                result = self.run_job("maintenance", step)
                self.assertEqual(result.status, expected)
                self.assertTrue(
                    result.urls.endswith("https://heartbeat.fixture/maintenance/fail\n")
                )
                self.assertIn(message, result.body)
                if step == "tokens":
                    self.assertEqual(result.cleaned, [])
                elif step == "sessions":
                    self.assertEqual(result.cleaned, ["tokens-cleaned"])
                elif step == "refresh":
                    self.assertEqual(
                        result.cleaned, ["tokens-cleaned", "sessions-cleaned"]
                    )
                    self.assertEqual(len(result.body.splitlines()), 20)
                    self.assertEqual(result.body.splitlines()[0], "refresh output 8")
                    self.assertEqual(
                        result.body.splitlines()[-1], "Stale TMDB IDs: 550"
                    )


if __name__ == "__main__":
    unittest.main()
