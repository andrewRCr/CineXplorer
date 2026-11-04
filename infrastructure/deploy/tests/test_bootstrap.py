"""Bootstrap additions stay private, preserve owner keys and remain idempotent."""

import unittest

from bootstrap_fixture import UbuntuFixture


class BootstrapTests(unittest.TestCase):
    def test_with_and_without_restricted_ci_key(self) -> None:
        for ci_key in (False, True):
            with self.subTest(ci_key=ci_key), UbuntuFixture() as fixture:
                if ci_key:
                    fixture.shell(
                        "mkdir -p /opt/cinexplorer; "
                        "ssh-keygen -q -t ed25519 -N '' -f /root/fixture-ci; "
                        "cp /root/fixture-ci.pub /opt/cinexplorer/ci-deploy.pub"
                    )
                first = fixture.bootstrap()
                for path in (
                    "/usr/local/bin/cinexplorer-deploy",
                    "/opt/cinexplorer/deploy-logs",
                    "/opt/cinexplorer/backups",
                ):
                    self.assertIn(f"CHANGED: {path}", first.splitlines())
                permissions = fixture.run(
                    [
                        "stat",
                        "-c",
                        "%a:%U:%G",
                        "/usr/local/bin/cinexplorer-deploy",
                        "/opt/cinexplorer/deploy-logs",
                        "/opt/cinexplorer/backups",
                    ]
                ).stdout.splitlines()
                self.assertEqual(
                    permissions, ["755:root:root", "700:deploy:deploy", "700:deploy:deploy"]
                )
                root_keys = fixture.read("/root/.ssh/authorized_keys")
                keys = fixture.read("/home/deploy/.ssh/authorized_keys")
                self.assertTrue(keys.startswith(root_keys))
                forced = 'restrict,command="/usr/local/bin/cinexplorer-deploy --from-ci" '
                self.assertEqual(keys.count(forced), int(ci_key))
                if ci_key:
                    self.assertNotIn(fixture.read("/opt/cinexplorer/ci-deploy.pub"), root_keys)
                    self.assertTrue(
                        keys.endswith(forced + fixture.read("/opt/cinexplorer/ci-deploy.pub"))
                    )
                else:
                    self.assertEqual(keys, root_keys)
                second = fixture.run(
                    ["sudo", "bash", "/source/bootstrap.sh"], user="deploy"
                ).stdout
                self.assertNotIn("CHANGED:", second.replace("UNCHANGED:", ""))
                self.assertEqual(fixture.read("/home/deploy/.ssh/authorized_keys"), keys)


if __name__ == "__main__":
    unittest.main()
