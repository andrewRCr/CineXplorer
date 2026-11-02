# Workflow: Run an Errand

**Purpose**: Handle one small concern outside the current work unit on its own branch and pull request, without
mixing it into that work unit's history.

## When It Applies

An errand is one bounded concern outside the current work unit: an atomic task from `.arc/active/ATOMIC-TASKS.md`, an
errand entry from the inbox (`user-inbox.md`), or a change the Owner asks for directly.

- A concern of the current work unit is not an errand: fix it inline
  ([DEVELOPMENT-RULES § Leave It Cleaner](../../constitution/DEVELOPMENT-RULES.md#leave-it-cleaner-pre-existing-issue-protocol)).
- A concern that needs a recorded design or a plan spanning sessions is a work unit: an incidental task list
  ([manage-incidental-work.md](manage-incidental-work.md)) or a PRD.
- An errand that grows past that line mid-way stops: say so, and the Owner decides whether it becomes a work unit.

Running an errand now, rather than capturing it for later, is the Owner's call.

## Where It Runs

The errand checkout starts clean and has its own branch. The primary may hold paused or uncommitted work.
The **session home** is where the conversation started; the **active checkout** is where its errand runs.
A conversation can stay at home while directing its tools to an isolated checkout.

- **In place, on the main checkout:** when it is clean and the errand needs the browser stack. The stack then serves
  the errand's files until you switch back.
- **In a linked worktree:** otherwise, provisioned by [worktree-sessions.md](worktree-sessions.md) as far as its
  checks need: for example when the main checkout holds uncommitted work-unit changes, the errand needs no Docker
  (documentation, CI, configuration), or its backend tests can run in the worktree's own test stack.

For a same-session errand, install the local harness once as described in
[worktree-sessions.md § Same-Session Errands](worktree-sessions.md#same-session-errands), or invoke `$errand` after
installation. Explicit errand entry selects this workflow before session initialization reads the home's work-unit
notes. Keep the primary's branch, tracked files, notes and containers as they are. Shared Git metadata, the installed
local harness and the primary inbox are intentional shared destinations.

## Steps

### 1. Branch from `origin/main`

```bash
git fetch origin
git switch -c {type}/{name} origin/main                          # in place
git worktree add -b {type}/{name} <path> origin/main             # or a linked worktree
```

`{type}` is the change's commit type (`fix`, `chore`, `docs`, `ci`, `refactor`, ...); `{name}` is a short slug.

For an isolated errand, after provisioning, run from the session home:

```bash
node .codex/hooks/legacy-arc/compaction-recovery.mjs errand-enter <absolute-worktree-path>
```

Consume its `checkoutPath` and direct every errand shell call there using the tool's working-directory argument;
use absolute paths for file reads and edits. A `cd` in one shell call does not change later calls. Keep this
selection across approval stops. `errand-status`, run from home, reports it; a failure stops entry until resolved.
One conversation has one active errand. Other conversations have independent selections.

### 2. Make the change and check it

- Make the change; run the checks for what it touches: lint, type-check and related tests
  ([DEVELOPMENT-RULES § Quality Gates](../../constitution/DEVELOPMENT-RULES.md#quality-gates); commands in
  [QUICK-REFERENCE](../../QUICK-REFERENCE.md)).
- An atomic task: move its entry from `ATOMIC-TASKS.md` to the quarter's archive
  (`.arc/reference/archive/{year}-{quarter}/completed-atomic-{quarter}.md`) as
  [3_process-task-loop.md § Atomic Task Completion Protocol](../3_process-task-loop.md#atomic-task-completion-protocol)
  describes, with `Branch:` naming this branch. The move rides in the same pull request.

### 3. Show the change, then commit and open the pull request

Report the diff summary, the checks run, the commit message ([atomic-commit.md](atomic-commit.md); Context
`{category} (atomic / no associated task list)`), and the pull request's title and body
([pull-request-format](../../methods/pull-request-format.md), body without hard line wraps; a drain's pull request
follows `user-inbox.md`). On the Owner's approval:

```bash
git push -u origin {type}/{name}
gh pr create --base main --title "<title>" --body-file <body file>
```

### 4. Review

Recommend a review route with a one-line reason: none (a small, mechanical change), a local fresh-context subagent, or
a hosted review (`@codex review`, `@coderabbitai review`). The Owner chooses; never start one unasked. Findings follow
[agent-pre-merge-review.md](agent-pre-merge-review.md).

### 5. Merge on approval

When `ci-ok` is green and review threads are resolved, ask to merge. On explicit approval:

```bash
gh pr merge <number> --merge        # never --admin; GitHub deletes the remote branch
```

### 6. Clean up

For a same-session errand, return from the session home before removal:

```bash
node .codex/hooks/legacy-arc/compaction-recovery.mjs errand-return
```

Confirm the result names home. This clears only this conversation's active selection; it does not switch any
branch, change files, or remove a worktree. If the errand is unfinished, preserve its checkout and report its path.
Return can clear a selection whose checkout disappeared; a malformed record requires investigation.

A finished linked worktree is removed first, from the main checkout, by
[worktree-sessions.md § Removal](worktree-sessions.md#removal). Then:

```bash
git switch -                         # in place: back to the previous branch
git branch -d {type}/{name}
git fetch --prune
```

An errand taken from the inbox leaves it once the pull request merges, and stays if the errand is abandoned.
After cleanup, the conversation can enter the next Owner-approved errand in a fresh checkout from `origin/main`.
