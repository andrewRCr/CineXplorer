"""Installed jobs survive checkout changes and report unsupported backend commands."""

from __future__ import annotations

import shlex
import subprocess
import unittest

from bootstrap_fixture import SOURCE, UbuntuFixture
from test_entrypoint import ENTRY, STUB_DEPLOY
from test_nightly import CURL, DOCKER, ENVIRONMENT

LEGACY = "f49b6837c5a72ad4a823bf7594f2d9cf94fcd46d"
REPO = "/opt/cinexplorer/repo"
OPERATIONS = "/opt/cinexplorer/operations"


class InstalledOperationsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = UbuntuFixture().__enter__()
        self.addCleanup(self.fixture.__exit__)
        self.fixture.bootstrap()
        self.fixture.shell(f"mkdir -p {REPO}; chown deploy:deploy {REPO}")
        archive = subprocess.run(
            ["git", "archive", LEGACY],
            cwd=SOURCE.parents[1],
            capture_output=True,
            check=True,
        ).stdout
        subprocess.run(
            ["docker", "exec", "-i", self.fixture.name, "tar", "-xf", "-", "-C", REPO],
            input=archive,
            capture_output=True,
            check=True,
        )
        self.fixture.shell(f"chown -R deploy:deploy {REPO}")
        self.fixture.shell(
            f"""
set -euo pipefail
cd {REPO}
git init -qb main
git config user.name Fixture
git config user.email fixture@example.invalid
git config advice.detachedHead false
git add .; git commit -qm legacy
""",
            user="deploy",
        )
        self.legacy = self.commit_id()
        # Target selection belongs to deploy.sh; all other entry-point code is real.
        self.fixture.write(
            "/opt/cinexplorer/stub-deploy",
            STUB_DEPLOY.replace(
                "touch /opt/cinexplorer/entered",
                'git checkout --detach "$1"\ntouch /opt/cinexplorer/entered',
            ),
        )
        self.fixture.shell(
            f"""
set -euo pipefail
cd {REPO}
mkdir -p infrastructure/deploy backend/apps/movie/management/commands
: > backend/apps/movie/management/commands/refresh_movie_cards.py
cp /opt/cinexplorer/stub-deploy infrastructure/deploy/deploy.sh
cp /source/backup.sh /source/maintenance.sh infrastructure/deploy/
git add .; git commit -qm supported
git init -q --bare /opt/cinexplorer/origin.git
git remote add origin /opt/cinexplorer/origin.git
git push -qu origin main
""",
            user="deploy",
        )
        self.supported = self.commit_id()

    def commit_id(self) -> str:
        return self.fixture.shell(
            f"cd {REPO}; git rev-parse HEAD", user="deploy"
        ).stdout.strip()

    def deploy(self, target: str) -> subprocess.CompletedProcess[str]:
        return self.fixture.run([ENTRY, target], user="deploy", check=False)

    def change_target(self, script: str) -> str:
        self.fixture.shell(
            f"set -euo pipefail\ncd {REPO}\n{script}\ngit add -A; git commit -qm changed",
            user="deploy",
        )
        return self.commit_id()

    def test_jobs_survive_actual_legacy_checkout_and_update_on_return(self) -> None:
        result = self.deploy(self.supported)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        for job in ("backup", "maintenance"):
            self.fixture.run(["test", "-x", f"{OPERATIONS}/{job}.sh"], user="deploy")
        installed_before = self.fixture.read(f"{OPERATIONS}/backup.sh")
        newer = self.change_target(
            "printf '\\n# Updated installed version\\n' >> infrastructure/deploy/backup.sh"
        )
        self.fixture.shell(
            f"cd {REPO}; git checkout --detach {self.legacy}", user="deploy"
        )
        for job in ("backup", "maintenance", "deploy"):
            self.fixture.run(
                ["test", "!", "-e", f"{REPO}/infrastructure/deploy/{job}.sh"]
            )
        self.fixture.write("/usr/bin/docker", DOCKER, mode="755")
        self.fixture.write("/usr/bin/curl", CURL, mode="755")
        for job in ("backup", "maintenance"):
            unit = self.fixture.read(f"/etc/systemd/system/cinexplorer-{job}.service")
            command = next(
                line.removeprefix("ExecStart=")
                for line in unit.splitlines()
                if line.startswith("ExecStart=")
            )
            job_result = self.fixture.run(
                ["env", *ENVIRONMENT, *shlex.split(command)], user="deploy", check=False
            )
            if job == "maintenance":
                self.assertNotEqual(job_result.returncode, 0)
                self.assertIn(
                    "Unknown command: 'refresh_movie_cards'",
                    job_result.stdout + job_result.stderr,
                )
                self.assertIn(
                    "refresh_movie_cards",
                    self.fixture.read(f"{OPERATIONS}/maintenance.sh"),
                )
                self.fixture.run(
                    ["test", "!", "-e", "/opt/cinexplorer/cards-refreshed"]
                )
            else:
                self.assertEqual(job_result.returncode, 0, job_result.stderr)

        self.fixture.run(
            [
                "env",
                *ENVIRONMENT,
                "bash",
                "-c",
                f"exec 9>/opt/cinexplorer/ops.lock; flock 9; {OPERATIONS}/backup.sh",
            ],
            user="deploy",
        )
        self.assertEqual(
            self.fixture.read("/opt/cinexplorer/ping-urls").splitlines(),
            [
                "https://heartbeat.fixture/backup",
                "https://heartbeat.fixture/maintenance/fail",
                "https://heartbeat.fixture/backup",
            ],
        )
        for marker in ("uploaded", "tokens-cleaned", "sessions-cleaned"):
            self.fixture.run(["test", "-f", f"/opt/cinexplorer/{marker}"])
        self.assertEqual(self.commit_id(), self.legacy)
        self.assertEqual(
            self.fixture.shell(
                f"cd {REPO}; git status --porcelain", user="deploy"
            ).stdout,
            "",
        )
        result = self.deploy(newer)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.commit_id(), newer)
        self.assertNotEqual(
            self.fixture.read(f"{OPERATIONS}/backup.sh"), installed_before
        )
        self.assertTrue(
            self.fixture.read(f"{OPERATIONS}/backup.sh").endswith(
                "# Updated installed version\n"
            )
        )
        self.assertNotIn("CHANGED:", self.fixture.bootstrap().replace("UNCHANGED:", ""))
        self.assertTrue(
            self.fixture.read(f"{OPERATIONS}/backup.sh").endswith(
                "# Updated installed version\n"
            )
        )

    def test_absent_pair_requires_an_installed_pair_then_retains_it(self) -> None:
        no_sources = self.change_target(
            "rm infrastructure/deploy/backup.sh infrastructure/deploy/maintenance.sh"
        )
        refused = self.deploy(no_sources)
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn("installed", refused.stderr)
        self.fixture.run(["test", "!", "-e", "/opt/cinexplorer/entered"])
        result = self.deploy(self.supported)
        self.assertEqual(result.returncode, 0, result.stderr)
        before = self.fixture.read(f"{OPERATIONS}/backup.sh")
        result = self.deploy(no_sources)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.fixture.read(f"{OPERATIONS}/backup.sh"), before)

    def test_partial_or_invalid_pair_stops_before_replacement_and_deployment(
        self,
    ) -> None:
        for change in (
            "rm infrastructure/deploy/maintenance.sh",
            "printf 'if broken\\n' > infrastructure/deploy/maintenance.sh",
        ):
            with self.subTest(change=change):
                self.fixture.shell(
                    f"cd {REPO}; git checkout --detach {self.supported}", user="deploy"
                )
                target = self.change_target(change)
                result = self.deploy(target)
                self.assertNotEqual(result.returncode, 0)
                self.fixture.run(["test", "!", "-e", "/opt/cinexplorer/entered"])
                self.fixture.run(["test", "!", "-e", f"{OPERATIONS}/backup.sh"])
                self.assertEqual(self.commit_id(), target)

    def test_second_replacement_failure_keeps_complete_files_and_retry_reconciles(
        self,
    ) -> None:
        # Seed an already-installed release so this failure case tests replacement,
        # independently of the first-install behavior above.
        self.fixture.shell(
            f"mkdir -p {OPERATIONS}; install -m 700 /source/backup.sh /source/maintenance.sh {OPERATIONS}; "
            f"chown -R deploy:deploy {OPERATIONS}"
        )
        target = self.change_target(
            "printf '\\n# Updated installed version\\n' >> infrastructure/deploy/backup.sh"
        )
        self.fixture.shell(
            f"rm {OPERATIONS}/maintenance.sh; mkdir {OPERATIONS}/maintenance.sh",
            user="deploy",
        )
        self.fixture.shell(
            f"cd {REPO}; git checkout --detach {self.legacy}", user="deploy"
        )
        failed = self.deploy(target)
        self.assertNotEqual(failed.returncode, 0)
        self.assertEqual(self.commit_id(), self.legacy)
        self.fixture.run(["test", "!", "-e", "/opt/cinexplorer/entered"])
        self.assertTrue(
            self.fixture.read(f"{OPERATIONS}/backup.sh").endswith(
                "# Updated installed version\n"
            )
        )
        self.fixture.run(["bash", "-n", f"{OPERATIONS}/backup.sh"])
        self.fixture.run(["rmdir", f"{OPERATIONS}/maintenance.sh"], user="deploy")
        result = self.deploy(target)
        self.assertEqual(result.returncode, 0, result.stderr)
        for job in ("backup", "maintenance"):
            source = self.fixture.read(f"{REPO}/infrastructure/deploy/{job}.sh")
            self.assertEqual(self.fixture.read(f"{OPERATIONS}/{job}.sh"), source)
            self.assertEqual(
                self.fixture.run(
                    ["stat", "-c", "%a:%U:%G", f"{OPERATIONS}/{job}.sh"]
                ).stdout.strip(),
                "700:deploy:deploy",
            )
        self.assertEqual(
            self.fixture.shell(f"find {OPERATIONS} -name '.*' -type f").stdout, ""
        )


if __name__ == "__main__":
    unittest.main()
