# Workflow: Activate Work Unit

## Purpose

Transition a planned work unit (PRD + task list) from backlog to active status on its own branch: move the documents
to active, and update the task list and session notes. This bridges the gap between task generation and task
execution.

**When to use:** After generating a task list (`2_generate-tasks.md`) when ready to begin implementation.

## Where It Runs

- **In the work unit's linked worktree (the default).** `create --work-unit` created the worktree, branch and
  starting notes before planning began
  ([worktree-sessions.md § Provisioning](worktree-sessions.md#provisioning)). The PRD and task list were written
  there, and activation runs there too. The main checkout stays on `main` throughout.
- **In place on the main checkout (the exception).** Only when the Owner chooses a single checkout for this work
  unit. Step 1 creates the branch before anything is committed, so no planning commit lands on `main`, and the main
  checkout then stays on the work unit's branch until it merges.

## Prerequisites

- PRD exists in `.arc/backlog/{feature|technical}/prd-{name}.md`, with its design draft `draft-{name}.md` beside it
  when the draft stage wrote one
- Task list exists in `.arc/backlog/{feature|technical}/tasks-{name}.md`
- Task list has `Status: Pending`
- No uncommitted changes besides the draft, PRD and task list

In the worktree, also:

- The checkout is the work unit's linked worktree, on its `{feature|technical}/{branch-name}` branch

In place, also:

- Currently on `main` branch

## Steps

### Step 1: Create the Branch (in place only)

In the worktree, skip this step: `create` made the branch.

```bash
git fetch origin
git switch --no-track -c {feature|technical}/{branch-name} origin/main
```

Branch name should match the work unit name (e.g., `feature/content-polish-p2`). An uncommitted PRD and task list
come along to the new branch. Without an upstream, a bare `git push` can't reach `main`; the branch's first push
names it (Step 9).

### Step 2: Commit Planning Artifacts (if uncommitted)

On the work unit's branch, never on `main`:

```bash
git add .arc/backlog/{category}/prd-{name}.md .arc/backlog/{category}/tasks-{name}.md  # and draft-{name}.md
git commit -m "docs(arc): create PRD and task list for {Work Name}

Context: planning (atomic / no associated task list)"
```

### Step 3: Decide the Inbox Entries for This Work Unit

Find the entries in the main checkout's `.arc/user/{identity}/USER-INBOX.md` whose `_Target:_` names this PRD or task
list ([user-inbox.md](user-inbox.md)). The Owner decides each:

- **Joins:** this work unit's change already covers the concern. Add it to the task list where it belongs, remove
  the entry, and name it in the activation commit's body.
- **Stays:** anything else, however close its domain. It runs as an errand or waits in the inbox.

### Step 4: Move Documents to Active

Use `git mv` to preserve history:

```bash
git mv .arc/backlog/{category}/draft-{name}.md .arc/active/{category}/  # when the draft stage wrote one
git mv .arc/backlog/{category}/prd-{name}.md .arc/active/{category}/
git mv .arc/backlog/{category}/tasks-{name}.md .arc/active/{category}/
```

### Step 5: Update Task List Status

Edit `.arc/active/{category}/tasks-{name}.md`:

1. Change `Status: Pending` → `Status: In Progress`
2. Check the `**PRD:**` header names the PRD by filename only (`prd-{name}.md`), so the move needs no edit

### Step 6: Update ROADMAP.md (if tracked)

Edit `.arc/backlog/ROADMAP.md`:

1. Update the work unit entry to indicate active status
2. Update any plan file references to point to active task list
3. Add "In Progress" indicator or similar

### Step 7: Update the Session Notes

In the worktree, `create --work-unit` wrote the starting notes at `.arc/user/{identity}/{name}/SESSION-NOTES.md`
(gitignored; see the [personal workspace README](../../../user/README.md)). Update their pointer fields and keep
the rest: State `executing`, Task List the task list's filename, Next Task the first task, Last Completed `[none]`,
and Next Action the first task.

Where there are no notes yet, as in place, create them from the skeleton in [session-handoff.md](session-handoff.md)
with those values, the branch, and `Commit at Handoff` `[none yet]`.

### Step 8: Commit Activation

```bash
git add .arc/active/{category}/ .arc/backlog/{category}/
git add .arc/backlog/ROADMAP.md  # if updated
git commit -m "docs(arc): activate {work-name} work unit

- Move PRD and task list to active
- Update ROADMAP if tracked
- Status: In Progress

Context: tasks-{name}.md (planning)"
```

Add a body line for each inbox entry that joined the task list (Step 3).

### Step 9: Push the Branch (Optional)

```bash
git push -u origin {feature|technical}/{branch-name}
```

The first push names the branch and sets its upstream. Like any push it needs the Owner's approval, and the task
list may already plan it inside a task; then leave it to that task. Nothing in this workflow pushes `main`.

Once pushed, the branch is append-only until it merges: add commits and push them fast-forward, never rewrite pushed
history. Bring `main` in by merging it into the branch, never by rebasing onto it.

---

## Checklist Summary

Before proceeding to task execution, verify:

- [ ] Activation ran on the work unit's branch: in its worktree, or in place by the Owner's choice
- [ ] Nothing committed or pushed to `main`
- [ ] Inbox entries targeting the work unit decided; any that joined are in the task list and the commit body
- [ ] PRD and task list moved to `.arc/active/{category}/`
- [ ] Task list `Status` changed to `In Progress`
- [ ] Task list `**PRD:**` header names the PRD by filename only
- [ ] ROADMAP.md updated (if work unit tracked there)
- [ ] Session notes updated (or created) for execution: state, task list, first task
- [ ] All changes committed on the work unit's branch

---

## Next Step

With the work unit activated, proceed to task execution:

**→ [3_process-task-loop.md](../3_process-task-loop.md)** - Execute tasks one at a time with quality gates

---

**Version:** 2026-01-19
