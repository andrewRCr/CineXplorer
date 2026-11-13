# Strategy: Quality Gates

**Purpose:** Define when each quality check runs during development: at the moment its failure must be resolved, not
at every milestone. This keeps feedback fast and stops parallel sessions from multiplying full-suite runs.

**Scope:** General ARC methodology, with examples using CineXplorer's commands. QUICK-REFERENCE and the testing
methodology strategy remain the reference for project tooling and component-to-test mappings.

---

## Core Philosophy

"Assign each check to the earliest event before which its failure must be resolved" (arc-framework's
`strategy-quality-gates.md` § Place checks by deadline).

Checks differ in cost and in what they protect. A type error in the file just changed must be fixed before the task
is done; a regression three apps away must be fixed before the pull request merges. Running the full suite at every
task, parent task or phase end catches the second kind early only by paying for it again and again, once per session
when several sessions work at once.

CI on the pull request carries the broad suites. It runs every check on a clean machine for every pull request, so a
local full-suite run at a phase end mostly repeats work CI will do anyway.

---

## The Moments

### Each Task

**What:** the task's checks.

- Lint, format and type-check for what the task touched
- Related tests: the tests for the code the task changed (see DEVELOPMENT-RULES § Quality Gates for this project's
  definition)

**Time budget:** seconds to about a minute.

**Guidance:** use targeted commands (files, directories, touched apps), not full-project scans. Fix issues while the
context is fresh, before marking the task complete.

### Commit

**What:** the pre-commit and commit-message hooks. The task's checks have already run.

Work outside the task loop (errands, incidental fixes) runs the checks for what it changed before committing.

### Parent Task, Phase and Session End

**What:** nothing extra. The completion or handoff report names the broader checks not yet run, so the gap is visible.

Run wider when the affected surface calls for it (see [When to Run Wider](#when-to-run-wider)).

### Pull Request

**What:** CI, the broad check: the full test suites, lint and type checks across the project, and the project's other
CI gates.

### Verification

**What:** one local full run (every check in QUICK-REFERENCE's full set), then CI on the pull request. This is the
work unit's single deliberate full-suite run; it confirms the success criteria rather than hunting for regressions
task by task.

### Merge

**What:** CI green. A red CI run is resolved before merge, never overridden.

---

## E2E Checks

When a task changes components that E2E tests drive, the E2E files covering them are part of that task's related
tests. Ask:

1. **Component scope:** did the task modify layout, navigation, routing, forms, or user interactions? These are
   typically E2E-tested.
2. **Behavior changes:** did it change how something works, not just how it looks? Behavioral changes are more likely
   to break E2E assertions.
3. **Cross-cutting changes:** did it modify shared infrastructure (context providers, hooks used by many components,
   global state)? These have a wider blast radius.

Run the covering specs against the worktree's browsable stack, started with `node scripts/worktree.mjs browse`.
From `frontend/`, set its site address; the tier uses Chromium only:

```bash
# Filter-preserving detail navigation
E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/movie-detail.spec.ts

# Scroll restoration after reloading detail
E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/back-to-results.spec.ts
```

---

## Task List Integration

**Tasks carry their checks implicitly.** Name a check in a task only when it needs one beyond the task's checks: a
specific E2E file, a build, a migration dry run.

```markdown
- [ ] **3.2 Update FooterBar positioning**
    - [implementation details]
    - Check in `frontend/`, with the worktree's browsable stack running:
      `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/sign-in.spec.ts` (scans the footer)
```

**No checkpoint tasks.** No per-parent quality gate, no full-suite checkpoint task, and no final "Testing & Quality
Gates" phase: the final phase is verification, which runs the full suite once.

---

## When to Run Wider

Related tests reach what an import graph or a module path shows. Run wider, up to the full run, when the affected
surface has grown past that:

- Shared code changed: base services, common serializers or schemas, context providers, hooks used across the app
- Configuration, settings, test fixtures or dependencies changed
- Inputs that no import graph shows changed (templates, data files, Markdown read at runtime)

Otherwise, report the broader checks as not yet run and let CI run them.

**The cost of under-testing:** discovering breakage later, with stale context, and reconstructing what changed and
why.

**The cost of over-testing:** slower work, and suites run again and again that rarely catch anything, multiplied by
every session running them.

---

## Anti-Patterns

**❌ The full suite at every phase end "to be safe":**
CI runs it on the pull request. Locally it costs minutes per phase, per session, for failures that targeted checks or
CI would catch.

**❌ Skipping the task's checks:**
They take seconds. Skipping them lets type errors and lint violations accumulate into a painful cleanup later.

**❌ Silent gaps:**
Not naming the broader checks that have not run. The report says what ran and what did not.

**❌ The full E2E suite for one component:**
Run the files that drive the change against the worktree's browsable stack; CI and verification run all seven specs,
including the 360×800 phone shell alongside the six at 1280×800.

**❌ Merging on red:**
A failing CI check is resolved before merge, never overridden.

---

## Relationship to Other Documentation

- **DEVELOPMENT-RULES:** Defines the "zero tolerance" policy and what runs at each moment for this project.
  References this strategy for the reasoning.

- **3_process-task-loop:** Defines when the task's checks run in the task execution workflow, and what the
  completion report names.

- **2_generate-tasks:** Guidance on naming checks in task lists. References this strategy for when a task names one.

- **QUICK-REFERENCE:** Project-specific commands. The authoritative source for "how to run" each check.

- **Project testing methodology:** Project-specific guidance on which test files cover which components, tag systems,
  and targeted test patterns.

---

**Version:** 2026-02-11
