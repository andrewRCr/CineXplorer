# Completion: Launch Readiness

**Status:** Pre-merge verification complete
**Completed:** 2026-11-05
**Branch:** `technical/launch-readiness`
**Category:** Technical
**Context:** Prepare the deployed staging service for public sign-up and routine operation.

## Summary

Implemented automated deployment, off-server database backups, scheduled maintenance and failure monitoring,
and deployed the checked images to staging. Email registration, password recovery, provider sign-in and password
session renewal were exercised live alongside the authentication protections. Renewal/sign-out and legacy
job-lifetime repairs passed local checks, independent implementation review and refreshed criteria/evidence review,
and are deployed on staging. Pre-merge verification is complete; the main-push deployment proofs remain open.

## Key Deliverables

- CI validates production Caddy and Compose configuration, preserves the full pull-request checks, and defines
  main-only deployment after `ci-ok`. Documentation-only pushes under `.arc/` use the separate docs workflow.
- A restricted SSH deployment entry point selects the target commit's deploy script, serializes operations,
  records successful version transitions and keeps full CI deployment output in private server logs. The entry point
  installs versioned nightly scripts outside the checkout so a supported legacy rollback retains them.
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
  under the lock and preserves the original browser-storage choice. The repair invalidates obsolete renewal
  work at explicit sign-out and protects subsequent sign-in state, including the HTTP-only refresh-cookie boundary.
- Restore preparation validates a recovery copy before replacing the schema, uses a transactional archive restore,
  and retains the copy until application checks and sign-in/watchlist confirmation succeed.

## Verification

- Before the repair, the full local backend/frontend suites, lint, formatting, type checks, markdown checks,
  generated API contract sync and positive/negative production configuration checks passed. PR CI `42059086109`
  passed at `5bdf35ac`; the deployed code images are from `9b90ef28`, with matching application content.
- The author criteria walk and a fresh-context independent verification pass covered the whole work unit. All
  then-applicable pre-merge criteria were met; the independent pass returned no findings. The task list's Success
  Criteria and Review Log retain the evidence account. Code review and the draft-ready transition are separate
  completion stages.
- Live evidence includes backup failure/recovery, scheduled jobs, outage alerts, restore and authentication.
  Provider-console and signed-in browser observations are attributed to the maintainer. Mail evidence uses
  Proton Inbox/sender/DKIM observations and ZeptoMail's saved original for MIME/plain-text links.

- Repair checks passed: 238 related frontend tests, 279 backend authentication tests, 28 deployment-harness tests,
  affected lint/format/types, API generation and markdown. Eight real Chromium cases use the actual hook and Axios
  against a local HTTP fixture, checking cookie ordering and subsequent renewal identity across both storage choices.
  All eight fail on the pre-repair source; omitting cancellation alone reproduces four late-header cookie failures.
  A refreshed local run passed 1,058 backend tests (94.94% coverage), 900 frontend tests, full lint/format/types and
  API regeneration without drift. PR CI `42121038168` and publication CI `42121099582` passed at `0ca2d5b5`.
- Staging runs both images from `0ca2d5b5`. Bootstrap upgrade/repeat, installed-job source hashes and service paths,
  successful backup/maintenance heartbeats and public health passed. Real browser checks for both storage choices
  canceled a held renewal across sign-out, preserved a later account's cookie and renewed as that account. Temporary
  accounts were removed. The author criteria walk records 29 pre-merge met, four superseded and three post-merge
  proofs open. The refreshed independent criteria/evidence review covered all 36 unchanged criteria and returned
  no findings. Final PR CI `42125425864` passed at evidence-only head `8dfe73c4`, including `ci-ok`.
- The refreshed review used neutral source and evidence inputs, with author conclusions withheld. Primary validation
  matched all 80 projected source files to pinned Git objects and deployed code. It was static review; older live
  observations were assessed for applicability, and no tests or live operations were rerun by the reviewer.

- A fresh independent implementation code review covered all 81 source/contract files and returned no findings.
  It considered all five rubric dimensions, repository contracts and cross-layer/deployment seams. This was static
  review; administrative task-status/completion reports were withheld, and no runtime/live evidence was added.

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
