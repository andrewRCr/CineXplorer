# Completion: Launch Readiness

**Completed:** 2026-11-05
**Branch:** `technical/launch-readiness`
**Category:** Technical
**Context:** Prepare the deployed staging service for public sign-up and routine operation.

## Summary

Implemented automated deployment, off-server database backups, scheduled maintenance and failure monitoring,
and deployed the checked images to staging. Email registration, password recovery, provider sign-in and password
session renewal were exercised live alongside the authentication protections. Pre-merge verification is complete;
the main-push deployment proofs remain for the post-merge checks below.

## Key Deliverables

- CI validates production Caddy and Compose configuration, preserves the full pull-request checks, and defines
  main-only deployment after `ci-ok`. Documentation-only pushes under `.arc/` use the separate docs workflow.
- A restricted SSH deployment entry point selects the target commit's deploy script, serializes operations,
  records successful version transitions and keeps full CI deployment output in private server logs.
- Nightly custom-format database backups upload to private R2 storage with retention configured, with an
  end-to-end restore rehearsed against an isolated local production stack.
- Scheduled expired-token and session cleanup, database-aware health checks, nightly-job heartbeats and
  outage/recovery email alerts support routine operations.
- Authentication uses separate endpoint throttle histories and per-thread state, Django CSRF checks on unsafe
  requests, an exact allauth browser endpoint boundary, and shared password-session renewal across callers/tabs.
- Deployed provider apps and the Site record come from deployment configuration. Email verification/reset and
  Google/GitHub sign-in work on staging. Failed password-reset and verification-resend sends return a retryable
  response.

## Implementation Highlights

- Deployment validates and uploads a fresh backup before migrations, synchronizes the tracked blacklist and
  configures the Site before startup, and writes success history only after the public health check passes.
- The deployment worker owns the operations lock and private output independently of the SSH follower. Manual
  deployment, backup, maintenance, rollback and restore use the same lock.
- The ZeptoMail backend bounds connect/read time and logs sanitized outcomes. A failed verification resend renews
  the token lifetime; only a successful send consumes it. Frontend callers show the retry message without a
  duplicate global server-error toast.
- Password renewal shares one in-flight promise within a tab and uses Web Locks across tabs. It rereads tokens
  under the lock and preserves the original browser-storage choice.
- Restore preparation validates a recovery copy before replacing the schema, uses a transactional archive restore,
  and retains the copy until application checks and sign-in/watchlist confirmation succeed.

## Verification

- The full local backend/frontend suites, lint, formatting, type checks, markdown checks, generated API contract
  sync and positive/negative production configuration checks passed. PR CI `42059086109` passed at `5bdf35ac`;
  the deployed code images are from `9b90ef28`, with matching application content.
- The author criteria walk and a fresh-context independent verification pass covered the whole work unit. All
  applicable pre-merge criteria are met; the independent pass returned no findings. The task list's Success
  Criteria and Review Log retain the evidence account. Code review and the draft-ready transition are separate
  completion stages.
- Live evidence includes backup failure/recovery, scheduled jobs, outage alerts, restore and authentication.
  Provider-console and signed-in browser observations are attributed to the maintainer. Mail evidence uses
  Proton Inbox/sender/DKIM observations and ZeptoMail's saved original for MIME/plain-text links.

## Related Documentation

- PRD: `prd-launch-readiness.md`
- Tasks: `tasks-launch-readiness.md`
- Operations runbook: `infrastructure/deploy/README.md`

## Incidental Work Completed

None.

## Follow-Up Work

- Task 6.2 in `tasks-launch-readiness.md`: after merge, prove deployment from the merge commit's main-push CI run;
  a docs-only main push running only the docs workflow, publishing no image and adding no deploy-history line;
  and completion of an eligible CI-key deployment after its SSH client is killed. Record the evidence before
  archiving.
- Publish Google's consent screen after the application homepage, privacy policy and terms pages are live.
  Basic identity sign-in is proven while the project remains in Testing.
- Move from the staging hostname to `cinexplorer.andrewcreekmore.dev` using the documented DNS, environment,
  deployment and monitor changes.
