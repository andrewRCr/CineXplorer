# ADR-021: Capture Discovered Work in a Personal Inbox

## Status

Accepted (2026-10-30)

## Context

ADR-014 set up a shared, tracked `TASK-INBOX.md` in `.arc/backlog/` for zero-friction capture, processed in a weekly
review alongside the atomic-task list, the backlog buckets and PROJECT-STATUS.

In practice neither held:

- **Capture landed on the wrong branch.** Discovered work usually surfaces mid-task on a work unit's branch. Writing it
  to a tracked inbox there puts a different concern into that branch's history and pull request, which the
  development rules forbid.
- **The weekly cadence didn't happen.** The inbox stayed an empty template and PROJECT-STATUS went stale; nothing in
  the session routine prompted the review.
- **Parallel sessions need one capture point.** Sessions in linked worktrees each have their own checkout, so a
  per-checkout file would scatter captures.

Alternatives considered:

- **Option A: Keep the shared inbox, commit captures separately.** Still writes a tracked file on whatever branch is
  checked out, or forces a branch switch per capture.
- **Option B: Capture straight into `ATOMIC-TASKS.md` or the backlog buckets.** Same branch problem, and skips the
  triage step.
- **Option C (chosen): A gitignored personal inbox, drained between work units.** Capture costs nothing and touches
  no branch; routing to tracked homes happens later, reviewed, in one pull request.

## Decision

We will capture discovered work in a personal, gitignored inbox, `.arc/user/{identity}/USER-INBOX.md` in the main
checkout, with `## Errand` and `## Work Unit` sections. Sessions in linked worktrees write the main checkout's copy.

We will drain it between work units, offered at session start when it has entries: each entry gets a class and a
tracked home, the Owner approves the whole routing table, and the tracked changes land as one pull request. The drain
takes over the weekly review's backlog checks (atomic tasks, backlog buckets, PROJECT-STATUS) as an optional pass.

This supersedes ADR-014's inbox (`TASK-INBOX.md`) and its weekly review. The rest of ADR-014 stands: the backlog
buckets, plan and PRD files, and `ATOMIC-TASKS.md`.

The workflow is `.arc/reference/workflows/supplemental/user-inbox.md`.

## Consequences

### Positive

- Capturing never changes a branch's history or pull request
- One inbox per developer, whichever checkout a session runs in
- Routing is reviewed as a whole before anything tracked changes
- Backlog grooming happens at a point the session routine actually reaches

### Negative

- Captures are invisible to others until drained, and live only on one machine
- An entry can sit undrained if work units run long; nothing reminds on a timer

### Risks

- A lost or deleted personal workspace loses undrained captures; drain at each work-unit boundary to keep the window
  short
