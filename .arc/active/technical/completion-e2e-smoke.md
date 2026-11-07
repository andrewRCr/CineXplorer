# Completion: End-to-End Smoke Tier

**Prepared:** 2026-11-07
**Status:** Awaiting post-merge staging verification
**Branch:** `technical/e2e-smoke`
**Category:** Technical
**Context:** Browser coverage for the application flows being rebuilt.

## Summary

Five Playwright specs exercise registration, sign-in and sign-out, browse pagination, filtered movie detail, and
scroll restoration after reloading detail in Chromium. Each distinct page they reach receives an axe scan, and CI
has jobs for the development stack and the deployed staging site. Implementation and local verification are
complete; the pull request's required CI gate and all five smoke specs pass. The post-merge staging outcome below
remains open.

## Key Deliverables

- A development-only mail-backend override lets worktrees and CI discard registration mail, with settings and
  transport tests isolated from that override.
- A typed, synthetic catalogue fixture layer keeps local browser runs independent of TMDB while authentication
  reaches the real backend, database and session cookies.
- One set of accessible-selector specs supports local and staging targets, with controlled catalogue responses
  for the scroll-restoration scenario in both.
- axe scans enforce WCAG A/AA rules against an explicit route/rule baseline and report unmatched baseline entries.
- The development-stack job is required by `ci-ok`; a staging job follows deployment with registration skipped and
  browser artifacts disabled.
- ADR-039 and the testing, quality-gate, architecture and worktree guidance describe the tier; the earlier E2E plan
  and its specified backlog dependencies are retired.

## Implementation Highlights

- Local routing serves supported catalogue requests from fixtures, diagnoses missing fixtures by method and path,
  and aborts other origins. The scroll scenario's override serves same-origin GETs and falls back to that boundary
  for other requests.
- The reload scenario delays catalogue data until the shorter loading grid has mounted, saves a position of
  2,600 px, opens a fully visible card, reloads detail and verifies the returned position within 20 px.
- The accessibility baseline is keyed by route and rule, so another violation of an excused rule on that route is
  also excused until the entry is removed. Staging uses live catalogue data outside the scroll scenario, so it can
  expose violations absent from local fixtures.

## Verification

The full required local run passed: backend and frontend suites, backend lint/format, frontend lint and TypeScript,
Python type checking, Markdown lint, and the Chromium smoke specs. The added frontend tooling and specs passed
formatting checks. One fresh-context independent source pass found no implementation defect against the success
criteria; that source pass supplements the separately recorded local test runs. A separate full independent code
review found no actionable source findings; its exact scope and limits are recorded with the tasks.

API schema/type regeneration during completion preparation produced no tracked drift. PR #131 at `c0718a12` has a
successful required `ci-ok` gate; all five hosted Chromium specs passed in 34.1 seconds, including registration
reaching the email verification notice. A fresh independent correction review found no actionable issue in the CI
startup ownership repair. Detailed results, negative controls and review records are indexed by `tasks-e2e-smoke.md`.

## Remaining Verification

| Criterion | Evidence still required | Timing |
| --- | --- | --- |
| 9 | Staging smoke succeeds after deployment, creates no account and uploads no artifact | After merge |

Task 6.1 and the pre-merge criteria are complete. The post-merge criterion must be proven before the work is closed
and the worktree is finished. PR #131 remains open.

## Related Documentation

- PRD: `prd-e2e-smoke.md`
- Tasks and criteria evidence: `tasks-e2e-smoke.md`
- Decision: `adr-039-run-a-browser-smoke-tier.md`
