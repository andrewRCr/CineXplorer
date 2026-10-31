# Workflow: Atomic Commit

**Purpose**: Commit finished work in reviewable units: one concern per commit, its task-list checkboxes with it, and a
message the commit-msg hook accepts.

**When to use**: Whenever an agent commits, once the Owner has approved committing
([DEVELOPMENT-RULES § Manual Commit Control](../../constitution/DEVELOPMENT-RULES.md#manual-commit-control)). The
approval covers one commit, or a scope the Owner names ("commit each task as it lands").

## Choose the Path

- **Simple:** one task or one errand, a clear scope, and nothing carried over from an earlier session.
- **Complex:** work accumulated across tasks, uncommitted work from an earlier session (the notes' Uncommitted Work is
  not empty), tasks interleaved in the same files, or complete and partial work mixed together.

When unsure, take the complex path.

## Task Context

Both paths check this before staging:

- **Branch:** the work unit's, or the errand's. A different concern never commits on the current branch
  ([DEVELOPMENT-RULES § Leave It Cleaner](../../constitution/DEVELOPMENT-RULES.md#leave-it-cleaner-pre-existing-issue-protocol)).
- **Task list:** the one in `.arc/active/*/` that the branch names. Each completed task is `[x]` with its description
  updated to what was done; a parent is `[x]` only when every subtask is. Partial work stays `[ ]`.
- **Quality gates:** what the work's tier calls for has passed
  ([DEVELOPMENT-RULES § Quality Gates](../../constitution/DEVELOPMENT-RULES.md#quality-gates)); work outside the task
  loop runs at least Tier 1.

### Task Lists Ride with Content

- A task's checkbox and description commit with the content that completed it: never in a separate task-list commit,
  and never split by hunk across commits to keep one checkbox per commit.
- A task whose work lands outside the branch (gitignored files, or an errand's pull request) is checked off in the
  branch's next commit, or in a commit of its own when nothing else is ready. Its description says where the work
  landed.
- A task with work both on the branch and outside it holds its on-branch changes until the outside part has landed,
  then commits them with its check-off.
- The commit that completes a parent's last subtask also marks the parent, and adds a line before the footer:
  `Completes parent task X.0: {Parent Task Name}`.
- An atomic task runs as an errand, and its archive move rides in the errand's pull request
  ([3_process-task-loop.md § Atomic Task Completion Protocol](../3_process-task-loop.md#atomic-task-completion-protocol)).

## Simple Path

1. **Review:** `git status` and `git --no-pager diff --stat`. Every change serves one concern; if not, take the
   complex path.
2. **Check the task context** (above).
3. **Stage explicit paths**, never `git add -A` or `git add .`, then confirm the staging matches intent with
   `git --no-pager diff --cached --stat`: a file staged earlier can slip in, and an intended one can be left out.
4. **Commit** with a message in the [format below](#message-format).
5. **Verify:** `git log --oneline -3` and `git status`.

## Complex Path

1. **Start from the notes.** Read the session notes' Uncommitted Work. When it records commit-level detail (files
   mapped to tasks, planned groupings), use it as the plan and check it against the working tree.
2. **List every change:** `git status` and `git --no-pager diff --name-only`. Look past the obvious: configuration,
   documentation and task lists change too.
3. **Map changes to tasks:** for each change, which task it serves and whether that task is complete. A change that
   serves no task is a different concern: raise it rather than fold it in.
4. **Check the task context** (above), marking complete only what is.
5. **Plan the commits by concern:**
    - One problem solved per commit. Scope, not volume, sets the size: several tasks that solve one problem are one
      commit.
    - Split when the description needs separate sentences for separate problems.
    - Reversibility is the guard: changes that would have to be reverted together belong together; changes that fail
      or succeed independently split.
    - Changes tangled in one file or function commit together, and the body notes the overlap. Use `git add -p` when
      the hunks separate cleanly.
    - Usual concerns, in a usual order: core functionality, configuration and infrastructure, tests, documentation,
      formatting, dependencies, cleanup.
    - Each task's checkbox goes in the commit that completes it.
6. **Show the plan** (commits, files, messages) with the request for approval, unless an approval already covers it.
7. **Execute** each commit as in the simple path, steps 3 and 4.
8. **Verify:** `git log --oneline -10` and `git status`. What remains is partial work: it stays uncommitted, and the
   notes' Uncommitted Work describes it at handoff
   ([DEVELOPMENT-RULES § Session Context Management](../../constitution/DEVELOPMENT-RULES.md#session-context-management)).

### Shared-Docs Pattern

One narrow case keeps documentation out of the content commits: several independent code tasks each edit the same
strategy document, and folding those edits into each code commit would tangle them. The strategy edits then go in
one commit after the code commits; its subject names the document, and its footer names the tasks.

It never applies to task-list checkboxes, which ride with their content, or to a documentation-only work unit, where
the documents are the work and commits group by concern like any other.

## Message Format

```text
<type>(scope): imperative description of the operation

- Why the change was needed, or what it decides (1-2 lines per bullet)
- Impact, if significant

Context: tasks-{name}.md (Task X.Y)
```

- **Subject:** names the operation, in the imperative, starting lowercase, with a required scope. At most 72
  characters; the hook warns past 50. It is legible without this repository's process vocabulary (which can still be
  the subject matter, when the change is to the process documents) and carries no task or phase IDs or task-list
  names: traceability goes in the `Context:` footer, and in the parent-completion line when there is one
  ([DEVELOPMENT-RULES § Code Documentation Standards](../../constitution/DEVELOPMENT-RULES.md#code-documentation-standards)).
- **Types:** `feat` `fix` `docs` `style` `refactor` `content` `test` `chore` `perf` `build` `ci` `config` `revert`.
- **Scope:** the functional area, such as `auth`, `movie`, `api`, `tests`, `types`, `theme`, `ui`, `email`, `config`,
  `deps`, `backlog` or `arc`.
- **Body:** why and impact, not what the diff already shows. Wrap at about 72 characters; 15 lines at most, 25 for a
  milestone. No checkbox lists, PRD references or task-list names.
- **Tasks and phases:** "Task 3.6", never "Phase 3.6"; a phase is a bare integer.
- **Submit** the message from a quoted heredoc so the shell can't reshape it, and never pass `--no-verify`:

  ```bash
  git commit -F - <<'MSG'
  fix(movie): resolve buffer pagination duplicate issue

  - Smart buffer now tracks consumed TMDB pages via metadata

  Context: tasks-pagination-buffer-tracking.md (Task 2.1)
  MSG
  ```

## Context Footer

Every commit ends with one `Context:` line in a form the hook accepts:

| Work                        | Footer                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| One task                    | `Context: tasks-{name}.md (Task X.Y)`; also `X.Y.a`, `X.Y.a.1`, and `X.Y.R` for revised work |
| Several tasks               | `(Tasks X.Y-X.Z)`, `(Tasks X.Y.c-e)`, `(Tasks X.Y, A.B)`                                     |
| Tasks and task-list changes | `(Task X.Y; planning)` adds tasks; `(Tasks X.Y-X.Z; maintenance)` restructures them          |
| The task list only          | `(planning)` or `(maintenance)`                                                              |
| Incidental to the work unit | `(incidental - discovered during Task X.Y)`, `(incidental - discovered during code review)`  |
| No task list                | `Context: {category} (no associated task list)`                                              |
| An errand or atomic task    | `Context: {category} (atomic / no associated task list)`                                     |

The categories are `planning`, `documentation`, `maintenance`, `refactor` and `content`. With `; planning` or
`; maintenance`, the body says what changed in the task list; plain check-offs need no qualifier.

## Examples

### One Task

```text
fix(movie): resolve buffer pagination duplicate issue

- Smart buffer now tracks consumed TMDB pages via metadata
- Prevents duplicate movies appearing across pagination
- Maintains consistent 20-result pages with restrictive filters

Context: tasks-pagination-buffer-tracking.md (Task 2.1)
```

### Several Tasks, One Problem

```text
refactor(api): extract service layer for movie operations

- Business logic moves from the views into MovieService
- Discover and search endpoints call the service; views stay thin

Context: tasks-api-layer-modernization.md (Tasks 3.1-3.4)
```

### Parent Task Completion

```text
test(movie): verify rating filter accuracy in manual testing

- Tested rating ranges 1.0-3.5, 0-6.0, 8.5-10.0
- Filtering stays accurate with the vote_count threshold

Completes parent task 3.0: Manual Testing Phase

Context: tasks-filter-integration-testing.md (Task 3.6)
```

### A Task and a Task-List Restructure

```text
feat(theme): add the dropdown selected-state pattern

- Selected items use the accent token in every dropdown
- The remaining audits now run by domain, 10-15 components per session
  instead of 50+; the pattern checklist grows from 8 to 13 patterns

Context: tasks-theme-system-modernization.md (Task 6.1.h; maintenance)
```

### Shared Strategy Document

```text
docs(arc): update the testing strategy for service-layer tests

- Service tests mock the TMDB client at its boundary, not the HTTP layer
- View tests stay thin now that the logic lives in services

Context: tasks-api-layer-modernization.md (Tasks 3.1-3.4)
```

### Work That Landed Elsewhere

```text
docs(arc): record the dependency upgrade merged on main

- The upgrade landed through its own pull request; this marks it done

Context: tasks-toolchain-refresh.md (Task 2.3)
```

### Incidental Fix

```text
style(types): fix variable naming convention

- Changed MAX_BUFFER_PAGES to max_buffer_pages
- Resolves ruff N806 violation

Context: tasks-pagination-buffer-tracking.md (incidental - discovered during Task 2.1)
```

### Planning

```text
docs(arc): plan metadata persistence across navigation

- Pagination metadata is lost when the component remounts
- Adds a task to keep it in the URL, as the filters already are

Context: tasks-pagination-buffer-tracking.md (planning)
```

### Errand

```text
chore(deps): update Django to 5.2.8 security patch

- Addresses a published security advisory
- All tests pass after the update

Context: maintenance (atomic / no associated task list)
```
