# ADR-036: Deploy from CI over an SSH Key Restricted to One Command

## Status

Accepted (Owner, 2026-11-03)

Recorded 2026-11-06 from sources of the time.

Implemented by: PR #78 (`c08b977c`, 2026-11-05); the first deploy from CI ran the same day.

## Context

[ADR-033](adr-033-host-on-one-droplet-behind-caddy.md) put CineXplorer on one droplet, with images built in CI and
pulled by the server, but its first deployment ran by hand from a runbook and left out automatic deploys, backups,
scheduled jobs and monitoring. Sign-up was about to open on the public host, and every later change would need to
reach it.

The `deploy` user is in the `docker` group, so whatever CI can run there, it runs as root in effect. Images publish
before the tests finish. Deploys can come at any hour, while nightly jobs run on a schedule.

Alternatives weighed for how a deploy reaches the server:

- **An unrestricted SSH key in CI:** "an unrestricted key in CI would be root on the server."
- **A pull-based agent on the server:** it "adds a daemon that polls and has no tie to CI's result."
- **CI pushes the deploy over SSH with a key locked to one command (chosen):** "The forced command limits a leaked CI
  key to deploying a commit from `main`'s history."

And for where the deploy logic lives: running the deploy script in place, "which `git checkout` would replace while
it runs", or "logic installed once by the bootstrap, which would drift from the version being deployed", against an
entry point outside the checkout that runs the target commit's own script from a temporary copy (chosen).

The other reasons recorded: deploys wait for CI's required check because "a deploy that waited only for its images
could ship a build whose tests failed"; branch deploys stay manual, "since a branch deployed automatically would be
replaced by the next push to `main`"; one lock covers deploys, backups and maintenance, over scheduling them apart,
because "no schedule keeps a nightly job from running while a deploy switches the checkout its script lives in or
holds table locks for a migration"; and a deploy's full output stays on the server, over streaming it to the job
log, because "the repository's Actions logs are public, and a failed migration's database error can quote the rows
it rejected."

## Decision

We will deploy every commit that passes CI on `main` automatically. After the required check, a CI job connects
over SSH with a key the server restricts to one command and sends only the commit's SHA. That command, installed
outside the checkout, accepts only a commit in `main`'s history newer than the deployed one, waits for the operations
lock that deploys, backups and maintenance share, and runs the commit's own deploy script from a temporary copy:
pull the commit's images by their SHA tag, back up the database, migrate and run the deploy's commands, start the
stack and check its health, which includes the database. CI sees each step; the full log stays on the server.
Branch deploys and rollbacks stay manual, through the same command under the same lock. Pushes that change only
`.arc/` start no CI run, so they deploy nothing.

## Consequences

### Positive

- Every merge reaches the server with no one at a terminal, and only after its tests pass.
- A leaked CI key can deploy only a commit already in `main`'s history.
- A deploy never runs beside a backup, a maintenance job or an operation by hand.
- Every deploy takes a backup before it migrates.

### Negative

- Nothing rolls back automatically: a rollback reverses migrations, deploys the previous commit by hand and reverts
  the change on `main`.
- Changes to the server's bootstrap don't deploy with CI; they are rerun by hand, before the merge when a deploy
  depends on them.
- CI's log shows only which step failed, so diagnosing a failure needs the server.
- A failed deploy is not retried by a later `.arc/`-only push.
- Staging and, after launch, the production host share the server and this pipeline (ADR-033), so once the site
  moves to the production host every merge to `main` deploys to production.

## References

- `.arc/reference/archive/2026-q4/technical/08_launch-readiness/prd-launch-readiness.md`: design decisions 2–5, 10,
  18 and 21
- `.github/workflows/ci.yml`, job `deploy`
- `infrastructure/deploy/deploy.sh`, `infrastructure/deploy/bootstrap.sh` (`cinexplorer-deploy`),
  `infrastructure/deploy/README.md`
- `backend/apps/core/api.py` (the health check)
- [ADR-033](adr-033-host-on-one-droplet-behind-caddy.md)
- PR #78
