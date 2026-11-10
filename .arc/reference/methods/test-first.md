---
name: test-first
description: Decision tree for test-first vs test-after by change type
related:
  - testing-standards
override-active: true
override-mode: extend
---

<!--
Vendored from arc-framework .arc/system/methods/test-first.md at 2538476f8. The default text is verbatim;
out-of-set link targets are retargeted per README.md § Link map; CineXplorer changes live only in §
test-first.override.
-->

# Method: test-first

> - **Workflow:** [generate-tasks.md][generate-tasks]
> - **When:** Agent structures tasks during task-list generation
>
> - **Contract:** Decide whether each task's tests come before or after its implementation, and let that
>   decision shape how the task list is structured.
> - **Related:** [testing-standards](testing-standards.md) — the execution-time counterpart; the two partition
>   the testing apparatus along the planning / execution seam.

## test-first.override

CineXplorer adaptation (`override-mode: extend`):

- **Shape.** Phases follow the segments task generation resolves ([resolve-plan-segmentation][rps]); inside a
  `slice` segment they are behaviour slices, and the default's grouping by mode applies in every segment. The
  ``Build `test-first` `` marker line is not used. A test-first behaviour is one parent task: its test subtasks
  come first ("Expect tests to FAIL initially"), then the implementation, then the passing run. A `Write tests` task
  followed directly by its `Implement` task in the same phase is acceptable when the tests should be reviewed before
  implementation starts.
- **Execution** follows [3_process-task-loop.md § Task Implementation][process-task-loop] (red-green-refactor, one
  behaviour at a time).

## test-first.default

Decision tree by change type.

**Requires test-first** (red-green-refactor within the task):

- New data models or schemas
- New API endpoints or endpoint modifications
- New service classes or business logic
- Complex algorithms or data transformations
- Non-trivial validation or processing logic

**Test-after acceptable:**

- Simple CRUD operations with no custom logic
- Presentational UI components
- Configuration file changes
- Trivial refactoring (renaming, moving files)
- Documentation-only changes

**If unsure, default to test-first.** Writing tests after implementation is harder and less effective.

**During task list creation:** Group test and implementation together by the segment's mode: behavior path for
`slice`, module or concern for `layer`, repeatable transformation batch for `replication` — never by
testing-versus-implementation activity. A test-first task covers both writing tests and writing the code that makes
them pass. Use the ``Build `test-first` (one behavior at a time):`` marker line to introduce the behavior list and
declare the red-green-refactor cycle boundary. When several coupled behaviors share one indivisible implementation,
put their tests in one batch before implementation so every test can genuinely fail first. See
[process-task-loop][process-task-loop] for execution details.

An exposing case that passes before its fix is a finding about the code or the case, never a go-ahead. Trace why it
passed before writing the fix; correct the case or revise the diagnosis from that evidence.

---

[generate-tasks]: ../workflows/2_generate-tasks.md
[process-task-loop]: ../workflows/3_process-task-loop.md
[rps]: resolve-plan-segmentation.md
