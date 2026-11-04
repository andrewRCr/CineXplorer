"""The deploy entry point enforces CI authority and survives its follower's session."""

from __future__ import annotations

import subprocess
import unittest

from bootstrap_fixture import UbuntuFixture

ENTRY = "/usr/local/bin/cinexplorer-deploy"
STUB_DEPLOY = r"""#!/usr/bin/env bash
set -euo pipefail
printf '==> 1 Check checkout and record previous version\n'
printf 'PRIVATE-SENTINEL\n==> PRIVATE-SENTINEL\n'
touch /opt/cinexplorer/entered
while [[ -e /opt/cinexplorer/gate ]]; do sleep 0.05; done
[[ ! -e /opt/cinexplorer/fail ]] || exit 37
printf '==> 6 Record successful deployment\n'
printf '2026-11-04T10:00:00Z %s - - %s sha-%s\n' "$2" "$1" "${1:0:7}" \
    >> /opt/cinexplorer/deploy-history.log
"""


class EntryPointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = UbuntuFixture().__enter__()
        self.addCleanup(self.fixture.__exit__)
        self.fixture.bootstrap()
        self.fixture.shell(
            "mkdir -p /opt/cinexplorer/repo; chown deploy:deploy /opt/cinexplorer/repo"
        )
        self.fixture.write("/opt/cinexplorer/stub-deploy", STUB_DEPLOY)
        result = self.fixture.shell(
            """
set -euo pipefail
cd /opt/cinexplorer/repo
git init -q -b main
git config user.name Fixture
git config user.email fixture@example.invalid
git config advice.detachedHead false
touch initial
git add initial; git commit -qm initial
missing=$(git rev-parse HEAD)
mkdir -p infrastructure/deploy
cp /opt/cinexplorer/stub-deploy infrastructure/deploy/deploy.sh
git add .; git commit -qm 'add deploy'
old=$(git rev-parse HEAD)
printf 'new\n' > version
git add version; git commit -qm newer
new=$(git rev-parse HEAD)
git init -q --bare /opt/cinexplorer/origin.git
git remote add origin /opt/cinexplorer/origin.git
git push -qu origin main
git checkout -qb outside
printf 'outside\n' > outside
git add outside; git commit -qm outside
outside=$(git rev-parse HEAD)
git checkout -q main
printf '%s\n' "$missing" "$old" "$new" "$outside"
""",
            user="deploy",
        )
        self.missing, self.old, self.new, self.outside = result.stdout.splitlines()

    @staticmethod
    def close_process(process: subprocess.Popen[str]) -> None:
        if process.poll() is None:
            process.terminate()
        process.wait(timeout=5)
        if process.stdout is not None:
            process.stdout.close()

    def ci(self, commit: str) -> subprocess.CompletedProcess[str]:
        return self.fixture.run(
            ["env", f"SSH_ORIGINAL_COMMAND={commit}", ENTRY, "--from-ci"],
            user="deploy",
            check=False,
        )

    def history(self) -> str:
        return self.fixture.shell(
            "cat /opt/cinexplorer/deploy-history.log 2>/dev/null || true"
        ).stdout

    def latest_log(self) -> str:
        return self.fixture.shell(
            "find /opt/cinexplorer/deploy-logs -maxdepth 1 -type f "
            "! -name '*.status' ! -name '*.tmp' | sort | tail -n 1"
        ).stdout.strip()

    def start_ci(self, commit: str) -> subprocess.Popen[str]:
        process = subprocess.Popen(
            [
                "docker",
                "exec",
                "--user",
                "deploy",
                self.fixture.name,
                "setsid",
                "--wait",
                "bash",
                "-c",
                "echo $$ > /opt/cinexplorer/follower.pid; "
                'exec env SSH_ORIGINAL_COMMAND="$1" "$2" --from-ci',
                "bash",
                commit,
                ENTRY,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        self.addCleanup(self.close_process, process)
        return process

    def test_ci_rejects_malformed_command(self) -> None:
        for command in ("HEAD", self.new[:7], self.new + " extra"):
            with self.subTest(command=command):
                result = self.ci(command)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("exactly 40 lowercase hexadecimal", result.stdout + result.stderr)
                self.assertEqual(self.history(), "")
                self.assertNotIn("==> 1 ", result.stdout)

    def test_ci_rejects_commit_outside_main(self) -> None:
        result = self.ci(self.outside)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.history(), "")
        self.assertIn("origin/main", self.fixture.read(self.latest_log()))

    def test_ci_rejects_older_version_and_names_deployed_commit(self) -> None:
        history = f"2026-11-04T10:00:00Z manual - - {self.new} sha-{self.new[:7]}\n"
        self.fixture.write("/opt/cinexplorer/deploy-history.log", history, mode="600")
        self.fixture.shell("chown deploy:deploy /opt/cinexplorer/deploy-history.log")
        result = self.ci(self.old)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.history(), history)
        self.assertIn(self.new, self.fixture.read(self.latest_log()))

    def test_manual_commit_without_script_names_manual_steps(self) -> None:
        result = self.fixture.run([ENTRY, self.missing], user="deploy", check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("manual deploy steps", result.stdout + result.stderr)
        self.assertIn("infrastructure/deploy/README.md", result.stdout + result.stderr)
        self.assertEqual(self.history(), "")

    def test_manual_deploy_inside_locked_shell_does_not_lock_again(self) -> None:
        result = self.fixture.run(
            [
                "flock",
                "/opt/cinexplorer/ops.lock",
                "env",
                "CINEXPLORER_OPS_LOCK=held",
                ENTRY,
                self.new,
            ],
            user="deploy",
            timeout=5,
        )
        self.assertIn("==> 6 Record successful deployment", result.stdout)
        self.assertEqual(self.history().split()[1], "manual")

    def test_ci_rerun_of_current_version_succeeds_without_private_output(self) -> None:
        for _ in range(2):
            result = self.ci(self.new)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("==> 6 Record successful deployment", result.stdout)
            self.assertNotIn("PRIVATE-SENTINEL", result.stdout + result.stderr)
        self.assertEqual(len(self.history().splitlines()), 2)
        self.assertIn("PRIVATE-SENTINEL", self.fixture.read(self.latest_log()))

    def test_ci_failure_returns_exit_status_and_log_path(self) -> None:
        self.fixture.shell("touch /opt/cinexplorer/fail")
        result = self.ci(self.new)
        self.assertEqual(result.returncode, 37, result.stdout + result.stderr)
        self.assertIn("==> 1 Check checkout", result.stdout)
        self.assertIn("37", result.stdout)
        self.assertIn(self.latest_log(), result.stdout)
        self.assertNotIn("PRIVATE-SENTINEL", result.stdout + result.stderr)
        self.assertEqual(self.history(), "")

    def test_detached_deploy_keeps_lock_and_finishes_after_follower_dies(self) -> None:
        self.fixture.shell("touch /opt/cinexplorer/gate")
        process = self.start_ci(self.new)
        self.fixture.wait_for("/opt/cinexplorer/entered")
        self.fixture.shell('kill -TERM -- -"$(cat /opt/cinexplorer/follower.pid)"')
        process.wait(timeout=5)
        locked = self.fixture.run(
            ["flock", "-n", "/opt/cinexplorer/ops.lock", "true"], user="deploy", check=False
        )
        self.assertEqual(locked.returncode, 1)
        self.fixture.shell("rm /opt/cinexplorer/gate")
        log = self.latest_log()
        self.fixture.wait_for(log + ".status")
        self.assertEqual(self.fixture.read(log + ".status").strip(), "0")
        self.assertEqual(self.history().split()[4], self.new)
        self.assertIn("exit 0", self.fixture.read(log))
        self.fixture.run(["flock", "-n", "/opt/cinexplorer/ops.lock", "true"], user="deploy")

    def test_ci_rechecks_history_after_waiting_for_lock(self) -> None:
        self.fixture.shell("touch /opt/cinexplorer/lock-gate")
        holder = subprocess.Popen(
            [
                "docker",
                "exec",
                "--user",
                "deploy",
                self.fixture.name,
                "flock",
                "/opt/cinexplorer/ops.lock",
                "bash",
                "-c",
                "touch /opt/cinexplorer/lock-held; "
                "while [[ -e /opt/cinexplorer/lock-gate ]]; do sleep 0.05; done",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.addCleanup(self.close_process, holder)
        self.fixture.wait_for("/opt/cinexplorer/lock-held")
        process = self.start_ci(self.old)
        self.fixture.shell(
            "for i in {1..100}; do "
            "pgrep -f '^flock -w 1800' >/dev/null && exit 0; sleep 0.05; done; exit 1"
        )
        history = f"2026-11-04T10:00:00Z manual - - {self.new} sha-{self.new[:7]}\n"
        self.fixture.write("/opt/cinexplorer/deploy-history.log", history, mode="600")
        self.fixture.shell("chown deploy:deploy /opt/cinexplorer/deploy-history.log")
        self.fixture.shell("rm /opt/cinexplorer/lock-gate")
        holder.wait(timeout=5)
        process.wait(timeout=5)
        self.assertNotEqual(process.returncode, 0)
        self.assertEqual(self.history(), history)


if __name__ == "__main__":
    unittest.main()
