# Completion: Browsable Stack per Worktree

**Completed:** 2026-11-04
**Branch:** `technical/worktree-stack`
**Category:** Technical
**Context:** Parallel development against each branch's own application and database.

## Summary

Linked worktrees can serve the full application on separate local ports beside the main checkout. Commands create
and provision a checkout, start its browsable stack with development data, and remove a merged checkout with its
Docker resources and local branch.

## Key Deliverables

- A dependency-free Node script with `create`, `provision`, `browse` and `remove`, plus `.worktreeinclude` for ignored
  development files. Provisioning preserves existing files and keys, skips absent shared tools and links them after
  installation; planned work can start with session notes.
- A shared Compose override for test and browser modes, with isolated projects, databases and signing keys, a
  loopback-only browser entry point, and measured memory limits for every service.
- A development-only seed command that creates a verified sign-in account once and synchronizes the tracked movie
  blacklist without changing an existing account.
- Worktree, errand, activation, removal and session-start guidance covering both stack modes, backed by Node suites
  in CI and backend tests against the real database.

## Implementation Highlights

- Provisioning and browser startup validate the effective Compose project before stateful operations, including
  project-name overrides from the environment.
- Port allocation chooses the lowest unclaimed registered-worktree port and keeps it in that checkout's env file.
  The override derives frontend API URLs and backend origins from that value without rewriting copied app settings.
- Each stack's signing key rejects refresh tokens issued by another stack. Cookies remain shared across localhost
  ports, so concurrent signed-in stacks use separate browser profiles. OAuth sign-in remains on the main checkout.
- Removal checks branch ancestry, worktree locks, uncommitted files and project identity before tearing down
  label-selected containers, volumes, networks and images. `--keep-branch` preserves an unmerged branch's commits.
- Live checks covered simultaneous stacks, watchlist and token isolation, visible hot reload, refusal preservation
  and complete teardown beside healthy neighbors. The full local verification run and
  [hosted CI](https://github.com/andrewRCr/CineXplorer/actions/runs/41930723137) passed on `f6f853e0`.
- Independent criteria verification found no implementation defect. The browser reload observation rests on the
  Owner confirmation recorded in Task 5.2; the review's raw-record limitation is preserved in the task list.

## Related Documentation

- PRD: `prd-worktree-stack.md`
- Tasks and verification evidence: `tasks-worktree-stack.md`

## Follow-Up Work

- Coordinate integration with `technical/launch-readiness`: whichever merges second merges `main` first and keeps
  all session-hook and worktree tests when their CI step moves to the documentation workflow.
- After merge, refresh the installed errand harness from the main checkout with
  `node .arc/reference/harness-hooks/install-errand-harness.mjs`.
