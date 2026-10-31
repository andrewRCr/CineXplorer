# Workflow: Activate Work Unit

## Purpose

Transition a planned work unit (PRD + task list) from backlog to active status, establishing the branch and
updating all tracking documents. This bridges the gap between task generation and task execution.

**When to use:** After generating a task list (`2_generate-tasks.md`) when ready to begin implementation.

## Prerequisites

- PRD exists in `.arc/backlog/{feature|technical}/prd-{name}.md`
- Task list exists in `.arc/backlog/{feature|technical}/tasks-{name}.md`
- Task list has `Status: Pending`
- Working tree is clean (all changes committed)
- Currently on `main` branch

## Steps

### Step 1: Commit Planning Artifacts (if uncommitted)

If PRD and task list were just created and not yet committed:

```bash
git add .arc/backlog/{category}/prd-{name}.md .arc/backlog/{category}/tasks-{name}.md
git commit -m "docs(arc): create PRD and task list for {Work Name}

Context: planning (atomic / no associated task list)"
git push origin main
```

### Step 2: Create Feature Branch

```bash
git checkout -b {feature|technical}/{branch-name}
```

Branch name should match the work unit name (e.g., `feature/content-polish-p2`).

For a work unit run in a linked worktree, skip this step: provisioning creates the branch from `origin/main`
([worktree-sessions.md § Provisioning](worktree-sessions.md#provisioning)), and Steps 3 onward run in the worktree.
The PRD and task list must already be on `origin/main` (Step 1); the clean-tree and `main` prerequisites apply only
to activating in place, so the primary keeps whatever branch it is on.

### Step 3: Move Documents to Active

Use `git mv` to preserve history:

```bash
git mv .arc/backlog/{category}/prd-{name}.md .arc/active/{category}/
git mv .arc/backlog/{category}/tasks-{name}.md .arc/active/{category}/
```

### Step 4: Update Task List Status

Edit `.arc/active/{category}/tasks-{name}.md`:

1. Change `Status: Pending` → `Status: In Progress`
2. Check the `**PRD:**` header names the PRD by filename only (`prd-{name}.md`), so the move needs no edit

### Step 5: Update PROJECT-STATUS.md

Edit `.arc/reference/constitution/PROJECT-STATUS.md`:

1. Update **Currently Active** section:

   ```markdown
   **Currently Active:**

   - {Work Name} (feature|technical) - Brief description
     - Task list: `tasks-{name}.md`
     - Branch: `{feature|technical}/{branch-name}`
   ```

2. Update **Next Priority** section (remove the now-active item, promote next item if applicable)

### Step 6: Update ROADMAP.md (if tracked)

Edit `.arc/backlog/ROADMAP.md`:

1. Update the work unit entry to indicate active status
2. Update any plan file references to point to active task list
3. Add "In Progress" indicator or similar

### Step 7: Create the Session Notes

Create `.arc/user/{identity}/{name}/SESSION-NOTES.md` (gitignored; see the
[personal workspace README](../../../user/README.md)) from the skeleton in
[session-handoff.md](session-handoff.md): State `executing`, the new branch, the task list's filename, Next Task the
first task, Last Completed `[none]`, Next Action the first task, and `Commit at Handoff` `[none yet]`.

### Step 8: Commit Activation

```bash
git add .arc/active/{category}/ .arc/backlog/{category}/ .arc/reference/constitution/PROJECT-STATUS.md
git add .arc/backlog/ROADMAP.md  # if updated
git commit -m "docs(arc): activate {work-name} work unit

- Move PRD and task list to active
- Update PROJECT-STATUS and ROADMAP
- Status: In Progress

Context: tasks-{name}.md (planning)"
```

### Step 9: Push Feature Branch (Optional)

Set upstream for the feature branch:

```bash
git push -u origin {feature|technical}/{branch-name}
```

This is optional but recommended - establishes remote tracking early.

---

## Checklist Summary

Before proceeding to task execution, verify:

- [ ] Feature branch created and checked out
- [ ] PRD and task list moved to `.arc/active/{category}/`
- [ ] Task list `Status` changed to `In Progress`
- [ ] Task list `**PRD:**` header names the PRD by filename only
- [ ] PROJECT-STATUS.md updated (Currently Active, Next Priority)
- [ ] ROADMAP.md updated (if work unit tracked there)
- [ ] Session notes created (branch, task list, first task)
- [ ] All changes committed on feature branch

---

## Next Step

With the work unit activated, proceed to task execution:

**→ [3_process-task-loop.md](../3_process-task-loop.md)** - Execute tasks one at a time with quality gates

---

**Version:** 2026-01-19
