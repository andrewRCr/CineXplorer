# Workflow: Task Processing Loop

## Purpose

This workflow defines the detailed process for executing tasks defined in ARC task lists (e.g., `.arc/active/*/tasks-*.md`).
It ensures consistent execution, quality control, and documentation of work.

## Task Implementation

- **One task at a time:** Each checkbox in the task list is one review increment: a bounded unit of work between the
  Owner's reviews. Complete one, mark it `[x]`, report, and **stop** for approval. Only
  [deferred review](#deferred-review) runs several tasks without a stop, and only the Owner opens it.
- **Branch/task list coupling:** Task lists in `.arc/active/` correspond to git branches (branch exists ↔ task list
  active). Archive task list immediately when branch deleted after merge. See
  [Work Organization Strategy](../strategies/arc/strategy-work-organization.md) for details.
- **Co-development awareness:** The Owner may edit files or commit alongside you. Treat parallel changes as expected
  context, not interruptions. If one conflicts with the current task, flag the conflict and ask how to proceed.
- **Test-first execution:** When a task's tests come first ([test-first](../methods/test-first.md)), work in vertical
  slices, one behavior at a time:
    1. **RED:** Write one test for one behavior the task lists, run it, and confirm it fails
    2. **GREEN:** Write the minimal code that makes it pass
    3. **REFACTOR:** Review the code you just wrote; fix duplication, unclear naming or an emerging abstraction now,
       with every test staying green
    4. Next behavior: repeat from RED

  The task's test cases are behaviors to cover, not an execution order. When behaviors are tightly coupled (one
  function, shared setup, nothing to learn between them), writing their tests together before implementing is
  acceptable; say so in the completion report, not in the task list.
- **Testing discipline:** Before writing or changing any test, apply
  [testing-standards](../methods/testing-standards.md): observable behavior, faithful boundaries, and a test seen
  failing before it passes. This applies to test-after work too.
- **Pre-existing issues:** Follow [DEVELOPMENT-RULES § Leave It Cleaner](../constitution/DEVELOPMENT-RULES.md).
- **Design questions stop the task:** A design question the PRD doesn't answer is never settled inside a task. Stop,
  and settle it in the PRD first ([1_create-prd.md § Amending a PRD](1_create-prd.md#amending-a-prd)).
- **Completion protocol:**

  1. When you finish a **single task** (one checkbox):
     - **First**: Run incremental quality checks on modified files - **Tier 1** (linting, type checking, related unit
       tests)
       - See [Quality Gates Strategy](../strategies/arc/strategy-quality-gates.md) for the tiered approach
       - Task list specifies critical checkpoints, but use judgment: if changes warrant validation, run appropriate
         checks
       - When task list explicitly calls for quality gates (including E2E checkpoints), they are mandatory
       - A failure follows [DEVELOPMENT-RULES § Quality Gate Failure Protocol](../constitution/DEVELOPMENT-RULES.md)
     - **Second**: Mark the task `[x]` in the task list file (task list reflects completed work when reporting)
       - Update the task description to record what was actually done, not just the original plan. Success Criteria
         and the PRD's goals are never reworded to match the work: criteria are marked only at verification, and a
         changed goal goes through [1_create-prd.md § Amending a PRD](1_create-prd.md#amending-a-prd)
       - **Deferred or superseded tasks**: When a task is deliberately not done (deferred to later work, made
         irrelevant by a design decision, or replaced by a different approach), mark it `[~]` with a brief note
         saying why. `[~]` is a decision; `[ ]` is unfinished work
       - **No inline dates**: Don't add completion dates to subtasks (e.g., "Completed: 2025-11-02"). Only the
         task list header `**Completed:**` field should have a date. Inline dates become temporal noise during archival.
       - **Streamline verbose planning details**: Task descriptions serve different purposes before vs. after completion.
         During planning, verbose details help guide execution. After completion, they become historical records.
         When marking a task complete, retain information useful for understanding what was done and why,
         but remove excessive planning scaffolding (detailed step-by-step instructions, pre-implementation
         considerations, etc.) that no longer serves a purpose. Keep: actual changes made, key decisions,
         architectural impact, anything needed to understand the implementation later.
     - **Third**: Verify completion before reporting (use pre-report checklist below)
     - **Fourth**: **REPORT** completed work to the Owner with a summary of changes
     - **Fifth**: ⛔ **MANDATORY STOP**, ending the report with the structured prompt
       ([Stopping and Proceeding](#stopping-and-proceeding))

     **Pre-Report Checklist** (verify before generating completion report):

     ```
     - [ ] Quality checks passed (linting, type checking, tests as appropriate)
     - [ ] Task list markdown file edited and saved
     - [ ] Task marked [x] (or [~] with its reason) in task list
     - [ ] Task description updated to reflect actual work done; Success Criteria untouched
     - [ ] Session notes' pointer fields updated
     - [ ] Ready to generate user-facing completion report
     ```

     If any item is unchecked, complete it before proceeding to report generation.

  2. If **all** subtasks underneath a parent task are now `[x]` or `[~]`, follow this sequence:

     - **First**: Mark the **parent task** as `[x]` in the task list file (ensures docs reflect completion)
     - **Second**: Ensure new code has appropriate test coverage (models, APIs, complex logic)
     - **Third**: Run quality gates - **Tier 2** (full-project type-check, lint, format, unit tests, targeted E2E if
       applicable, build)
     - **Fourth**: Check if [PROJECT-STATUS](../constitution/PROJECT-STATUS.md) needs updates
       (feature progress, completed functionality, updated priorities)
     - **Fifth**: Verify completion before reporting (use pre-report checklist below)

     **Pre-Report Checklist for Parent Task Completion** (verify before reporting):

     ```
     - [ ] All subtasks under parent task marked [x] or [~] in task list
     - [ ] Parent task marked [x] in task list
     - [ ] Task list file edited and saved
     - [ ] Tier 2 quality gates passed (full-project lint/type-check/format, unit tests, targeted E2E if applicable, build)
     - [ ] PROJECT-STATUS checked and updated if needed
     - [ ] Ready to report completion to user
     ```

     If any item is unchecked, complete it before proceeding to report generation.

  3. Report completion and stop ([Stopping and Proceeding](#stopping-and-proceeding)).

  4. Await the Owner's instructions. The Owner may approve a commit (AI executes only when explicitly approved) or
     request changes. When committing, follow [Atomic Commit Workflow](supplemental/atomic-commit.md); before
     staging, check that every change serves one concern, and when in doubt split and ask.

### Stopping and Proceeding

End every completion report with a one-line structured prompt naming the next step:

- `Proceed to Task X.Y?` (next task in the phase)
- `Proceed to Phase N, Task N.1?` (the task just finished ends its phase)
- `Proceed to completion?` (the last task is done; next is
  [archive-completed.md](supplemental/archive-completed.md), from § 1b after a verification phase, otherwise from § 1)

Before every stop, update the pointer fields of the work unit's session notes (Last Completed, Next Task, Next
Action; State and Blockers when they change) and say so in the report
([DEVELOPMENT-RULES § Session Documentation Control](../constitution/DEVELOPMENT-RULES.md#session-documentation-control)).

A short affirmative ("y", "yes", "ok") as the first word advances to the named target. Other approval ("looks good",
"proceed") also advances, unless the Owner raises a concern ("that's done, but before moving on..."): address the
concern first. Approval to proceed is not approval to commit.

When a quality gate fails, fix obvious issues (lint, type errors) and re-run. Diagnose a non-obvious failure before
raising it, then end the report with `Quality gates failed: <details>. <cause>. Fix now or defer?`. If diagnosis finds
no cause, say so and ask for direction.

### Deferred Review

When the Owner asks for continuation through a named set of tasks ("work through 5.2-5.4 while I'm away"), the stops
between those tasks are deferred. The Owner names the scope; the agent never opens one on its own. Within the scope,
complete each task fully (Tier 1 checks, `[x]`, description updated), then continue without waiting. At the end, leave
the task list updated, gates passing and the changes uncommitted: the Owner decides commit boundaries on return.

**Agent-proposed batch.** At a parent task's start, the agent may propose its subtasks as one increment, and the
Owner's approval opens the scope:

- **Propose batching** when the subtasks will land as one commit: one concern broken down for planning, not for
  delivery. Further signals: intermediate states that don't stand on their own, or subtasks that depend on each other.
- **Keep per task** when a subtask carries a design decision that may need correcting before the next, or each one can
  be reverted or shipped on its own.

Make the proposal in one line naming the scope ("4.2's subtasks a–d land as one commit — review 4.2 as one
increment?") and wait for approval. Propose at most once per parent, and only when the signals fire; the default stays
per task and is never widened silently. The Owner may pre-authorize batching "when it makes sense".

Stop when the scope is complete, or earlier on a stop condition. Deferred review does not suspend them:

- **Must stop:** a quality gate failure that can't be fixed mechanically; a blocking dependency on another task or on
  outside input; a design question (enter [1_create-prd.md § Amending a PRD](1_create-prd.md#amending-a-prd)); scope
  well beyond what the task expected
- **Continue with a note:** auto-fixable lint (fix it and note it); a task taking longer than expected but
  progressing; a minor deviation from the plan that doesn't change outcomes

The [task review](supplemental/task-review.md) suits the end of a deferred-review scope; offer it in the report.

### Task Review

On the Owner's request, after any task or deferred-review scope, run
[task-review.md](supplemental/task-review.md): a read-only account of spec deviations, unexpected file changes,
ambiguity interpretations, judgment calls and unaddressed observations. It complements the completion report and
never replaces the completion stage's verification or code review.

### Verification Phase

Every task list ends with a verification phase: a task that validates the Success Criteria and runs the verification
review. Load [archive-completed.md § 1](supplemental/archive-completed.md) and follow it; the task is a pointer, not a
standalone instruction. Code review follows as a separate stage of the same workflow.

## Incidental Work Management

### Quick Decision Guide

While working on feature tasks, you may discover quality improvements, refactoring, or tech debt that should be fixed
immediately. **Quick decision tree**:

**Create incidental task list when:**

- ✅ Multiple distinct phases with different goals (not just sequential steps)
- ✅ Scope likely to expand via discovery (investigation-heavy)
- ✅ Estimated 2+ hours OR requires research → design → implement cycle

**Keep as an errand or atomic task when:**

- ❌ Single coherent concern, even if complex (multiple files, 30-90 min)
- ❌ Sequential steps all serving one goal
- ❌ Scope is known/bounded after initial analysis

**Key distinction:** "Sequential steps toward one goal" = atomic. "Distinct phases with different objectives" = task list.

Either way, a concern different from the current task leaves the current branch: it runs now (an errand, or an
incidental task list if the Owner pauses the current work) or is captured in the inbox
([user-inbox.md](supplemental/user-inbox.md)). See
[DEVELOPMENT-RULES § Leave It Cleaner](../constitution/DEVELOPMENT-RULES.md#leave-it-cleaner-pre-existing-issue-protocol).

### Complete Workflow

**For full incidental work lifecycle** (creation, execution, archival), see:
**→ [manage-incidental-work.md](supplemental/manage-incidental-work.md)** ← Complete workflow documentation

## Task List Maintenance

### TodoWrite Tool vs Task List Files

**TodoWrite Tool** (session-only tracking):

- Used for organizing work during active implementation
- Ephemeral, not saved to git
- Helps AI break down current work into steps
- **NOT a substitute for task list markdown updates**

**Task List Markdown Files** (permanent record):

- Official project documentation (`.arc/active/*/tasks-*.md`)
- Committed to git with code changes
- Source of truth for completion status
- **MUST be updated when completing tasks** (before reporting to user)

Both tools serve different purposes - use TodoWrite for work-in-progress organization.
Always update task list markdown for permanent completion tracking.

#### TodoWrite Best Practice: Always Include Documentation Step

**IMPORTANT:** When creating TodoWrite items for a subtask, ALWAYS include a dedicated item for updating the task list markdown:

```json
[
  {"content": "Analyze the code/requirements", "status": "pending", ...},
  {"content": "Make technical changes", "status": "pending", ...},
  {"content": "Run quality checks", "status": "pending", ...},
  {"content": "Update task list markdown with [x] and details", "status": "pending", ...},
  {"content": "Report completion to user", "status": "pending", ...}
]
```

**Rationale:** This creates a forcing function to remember the task list update before generating
the completion report. The TodoWrite item serves as a checklist reminder.

**When to mark this item complete:**

- After editing the task list markdown file
- After marking the subtask `[x]`
- After adding any "Completed" details about actual work done
- BEFORE generating the user-facing completion report

### Updating Task Lists

1. **Update the task list as you work:**

   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Track file changes via git:**
   - Git status and diffs provide the most accurate record of changes.
   - No need to manually maintain file lists - tools like `git status` and `git diff` are always current.

---

## Atomic Task Completion Protocol

**For tasks tracked in:** `active/ATOMIC-TASKS.md`

Atomic tasks are small, one-off work items (fixes, chores, quick refactors) that don't require formal task lists with
phases and subtasks. Each runs as an errand, on its own branch from `origin/main` with its own pull request
([run-errand.md](supplemental/run-errand.md)); the steps below happen inside it, and the archive move rides in the
errand's pull request.

### Completion Workflow

**1. Complete the work**

- Do the task (fix, update, refactor, etc.)
- Run appropriate quality checks (linting if code change, etc.)

**2. Mark complete and add completion notes**

- Change `[ ]` to `[x]`
- Add completion notes describing what was done (can be multi-line for complex work)

**3. Archive to quarterly file**

- Move the completed entry from `active/ATOMIC-TASKS.md` to
  `reference/archive/{year}-{quarter}/completed-atomic-{quarter}.md`
- Insert at **top** of archive file (reverse chronological order)
- Add branch line after completion notes (with empty line separator):

  ```markdown
  - [x] Refactor auth domain technical debt
      - **Outcome:** Fixed circular deps, standardized AuthResult types, migrated to logger
      - **Files:** useAuth.ts, auth-state.d.ts, MovieDetail.tsx, Login.tsx, etc.

      - **Branch:** `technical/service-layer-modernization`
  ```

- This keeps ATOMIC-TASKS.md focused on actionable work

**4. Commit with atomic context footer**

- Use boundary category + atomic pattern:

     ```
     Context: maintenance (atomic / no associated task list)
     Context: refactor (atomic / no associated task list)
     Context: documentation (atomic / no associated task list)
     Context: planning (atomic / no associated task list)
     ```

- See [Atomic Commit Workflow](supplemental/atomic-commit.md) for full format

### When Atomic Tasks Grow

If an atomic task becomes more complex than expected:

1. **Stop** - Don't continue as atomic work
2. **Create incidental task list** - Use incidental workflow for proper tracking
3. **Remove from ATOMIC-TASKS.md** - Delete the atomic task entry
4. **Continue in task list** - Follow normal task completion protocol

See [Incidental Work Management](#incidental-work-management) above for creating task lists.
