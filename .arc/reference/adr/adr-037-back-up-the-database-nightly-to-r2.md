# ADR-037: Back Up the Database Nightly to Cloudflare R2

## Status

Accepted (Owner, 2026-11-03)

Recorded 2026-11-06 from sources of the time.

Implemented by: PR #78 (`c08b977c`, 2026-11-05).

## Context

[ADR-033](adr-033-host-on-one-droplet-behind-caddy.md)'s first deployment had no backups, scheduled jobs or
monitoring. A manual `pg_dump` joined the runbook on 2026-11-04, with the copies kept on the droplet itself, after
hand-picked rows were lost when a development database was removed; the rule since has been a backup before any step
that can lose data. Sign-up was about to open, and accounts, watchlists and sign-in all live in Postgres. The site
stores no uploaded media, and Redis holds only disposable data.

Alternatives weighed:

- **DigitalOcean's weekly droplet backups:** "a whole disk, weekly, held by the same provider as the server".
- **Continuous archiving:** "more mechanism than a site of this size needs".
- **A nightly `pg_dump` to Cloudflare R2 (chosen):** "The custom format restores selectively and is checked before
  upload."

The other choices and their recorded reasons:

- Host systemd timers, over a scheduler container: "the jobs show in `systemctl` and the journal, `Persistent=true`
  catches missed runs, and the stack's services and memory limits stay as they are."
- No client-side encryption: "the R2 token sits on the server that holds the database itself, so encryption would
  protect only against R2 leaking on its own, and would add a key whose loss loses every backup."
- A heartbeat per nightly job, over mail sent from the server on failure: "a job that never ran, or a server that is
  down, sends nothing, but a missed heartbeat still alerts."
- A restore that empties the schema first, over `pg_restore --clean`, so "a dump older than the deployed schema
  [can] restore and then migrate forward, the usual case when a deploy is what went wrong", rehearsed on a local
  production stack rather than the live server, which "would discard live data".

## Decision

We will back up the Postgres database with `pg_dump` in custom format, check each dump with `pg_restore --list`, and
upload it to a private R2 bucket whose token can only read and write that bucket's objects. A host systemd timer runs
the backup nightly, and every deploy runs it before migrating, both under the operations lock deploys and
maintenance share. R2 deletes copies after 30 days. Each nightly job reports to its own heartbeat check, and an
uptime check polls the health endpoint every five minutes; both alert by email. Environment files and TLS
certificates are not backed up: the maintainer keeps the secrets. A restore copies the live database, empties the
schema, restores in one transaction and migrates forward.

## Consequences

### Positive

- Copies live with another provider, so losing the droplet or its account doesn't lose the data.
- A deploy that goes wrong has a backup taken minutes before it migrated.
- A backup that fails or never runs raises an alert.
- An older dump restores into a newer deployment and migrates forward.

### Negative

- A loss between backups loses what changed since the last one, up to a day.
- Anyone with the bucket's token can read the data; the token sits on the server, beside the database.
- The 30-day retention is a rule in Cloudflare's console, not in the repository.
- A restore is a manual runbook procedure, rehearsed once, on a local production stack.

## References

- `.arc/reference/archive/2026-q4/technical/08_launch-readiness/prd-launch-readiness.md`: design decisions 5–9
- `infrastructure/deploy/backup.sh`, `infrastructure/deploy/bootstrap.sh` (the timers),
  `infrastructure/deploy/README.md` (backups, monitoring and the restore)
- [ADR-033](adr-033-host-on-one-droplet-behind-caddy.md)
- PRs #75, #78
