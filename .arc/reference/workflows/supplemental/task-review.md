# Workflow: Task Review

<!-- Adapted from arc-framework's arc-task-review skill (.arc/system/.internal/skills/arc-task-review/SKILL.md at
a49ebba40). -->

Read-only analysis of a completed task, run on the Owner's request. It surfaces what the Owner needs to judge the
work independently: not the agent's narrative (that is the completion report), but where the work departed from the
task, what the agent interpreted, and what it decided.

It is not verification or code review, which run at completion
([archive-completed.md](archive-completed.md)). It does not present the diff (the Owner has the code open) and does
not recommend approval or rejection.

## When

- On request, after any task
- Offered at the end of a [deferred-review](../3_process-task-loop.md#deferred-review) scope

## Steps

### 1. Identify the work

- Default: the task just reported complete.
- If the Owner names another scope (an earlier task, a deferred-review batch), use that.
- Read the task's completion notes. If the task list has uncommitted changes, compare it with the committed version
  to see the original task description beside the updated one.

### 2. Gather file changes

- List every file the task changed: `git status` and `git diff --stat` for uncommitted work, or
  `git diff --stat` against the commit before the task when it is committed.
- Separate expected changes (files the task names or implies) from unexpected ones.

### 3. Analyze across five dimensions

- **Spec deviations:** Where did the work diverge from the task description? What was specified but not done, or
  done but not specified? Where did the approach differ from what the task implied? Include reasonable deviations and
  say they are reasonable; the Owner decides whether they matter.
- **Unexpected file changes:** Files changed that the task doesn't name or imply. For each, the reason: a Leave It
  Cleaner fix, a dependency found during the work, or scope growth.
- **Ambiguity interpretations:** Where was the task ambiguous or underspecified? Which reading did the agent take,
  and what were the alternatives? Often the most valuable dimension: it surfaces decision points the completion
  report may not have highlighted.
- **Judgment calls:** Decisions the task didn't dictate, where alternatives existed and the choice has real
  consequences: structure, naming, error handling, scope boundaries, trade-offs. Give the reasoning, not just the
  decision.
- **Unaddressed observations:** Issues noticed but neither fixed nor captured: quality concerns in nearby code,
  improvements outside the task, inconsistent patterns. These normally go through
  [DEVELOPMENT-RULES § Leave It Cleaner](../../constitution/DEVELOPMENT-RULES.md) during the work; this catches what
  slipped through.

### 4. Report

- Group findings by dimension, not by file or chronology.
- Mark each finding **Informational** (likely fine, surfaced for completeness) or **Warrants discussion** (the Owner
  should consider it before proceeding).
- Omit dimensions with no findings. If the review is clean, say so briefly; don't manufacture concerns.
