# Technical: Process Port, Review and Planning Methods

**PRD:** none — scope in the Stage 1 assessment (`~/dev/scratch/cinexplorer-stage1/assessment-2026-10-30.md`) and the
resume plan's Stage 1
**Created:** 2026-10-30
**Branch:** `technical/process-port-review`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Bring new ARC's planning and review backstops into the legacy process: adversarial review loops at each
planning stage, verification separate from code review, and the rubrics behind them.

Methods are vendored from arc-framework (snapshot `a49ebba40`) rather than reworded, so the rubrics stay intact. Each
copy names its source and keeps CineXplorer's changes in a marked section; at migration the copies stay behind in
`.arc-legacy/` and those changes become method overrides.

## Scope

### Will Do

- Vendor the review and planning methods into `.arc/reference/methods/`, with a README holding the glossary and the
  vendoring rules
- Trim `adversarial-review` to its review loop; loops run to its exit gate, and work-unit sizing (not a pass cap)
  keeps them short
- Adopt arc-framework's work-unit sizing: the `assess-boundary-fit` size triggers and the WU sizing standard
- Wire the methods into the PRD, task-generation, per-task and completion stages
- Rewrite legacy prose that contradicts the methods
- Rules: gate-failure triage, proportionality and anti-rider, structured stop, recommend on forks; the one-subtask
  rule becomes arc-framework's task interlock with deferred review
- Retire the `quality-gate-enforcer` agent; make `pragmatic-code-reviewer` read-only

### Won't Do

- Session routine, inbox, errands, commit routine, parallel sessions (`tasks-process-port-routine.md`)
- Anything bound to the `arc` CLI or store: pass records, fold verification, attest, review lanes, partitioned review
- The `_Goal:_` / `_Outcome:_` task grammar

## Tasks

### **Phase 1:** Vendor the methods

- [ ] **1.1 Create `.arc/reference/methods/` with a README**
    - Vendoring rules: source header (path and arc-framework commit), a `## CineXplorer adaptation` section for every
      change, the set closed under its own references
    - Glossary: work unit → PRD + task list + branch; spec → PRD; depth level and `Class` → not used

- [ ] **1.2 Vendor the rubric methods verbatim**
    - `planning-review`, `spec-review`, `design-audit`, `assess-design-proportionality`, `task-audit`,
      `source-grounding`, `verification-review`, `validate-criteria`, `implementation-audit`, `code-review-standard`,
      `code-review-author`, `disposition-report`, `review-model`, `testing-standards`, `test-first`,
      `classify-work-unit`, `assess-boundary-fit`
    - `assess-boundary-fit` keeps arc-framework's size-trigger override (`64d989642`) as CineXplorer's adaptation:
      about 1,500 PRD lines, 1,000 task-list lines or six phases, or 10,000 forecast changed lines returns the
      boundary decision to the Owner
    - Strip CLI-bound passages only where they would mislead (for example `validate-criteria`'s locus and digest
      binding), recording each in the file's adaptation section

- [ ] **1.3 Trim `adversarial-review` to its review loop**
    - Keep the invocation contract, severity model, exit gate and context provisioning
    - Remove pass records, fold verification and the partitioned carrier modes; record the removals
    - No fixed pass cap (Owner): a loop runs to the exit gate; the method's sustained non-convergence valve returns
      it to the Owner. Runaway loops come from oversized work, which the sizing triggers catch at planning

- [ ] **1.4 Close the set under its references**
    - Every cross-reference resolves inside the set, or is cut or redirected and recorded

### **Phase 2:** Wire the stages

- [ ] **2.1 PRD stage (`1_create-prd.md`)**
    - A Design Decisions section: settle every settleable decision; a design question during implementation stops
      work and amends the PRD
    - Review loop: `spec-review`, `design-audit`, `assess-design-proportionality`
    - Boundary check: `assess-boundary-fit` with the size triggers, and `classify-work-unit` (atomic task or task
      list)
    - Rewrite Step 3 ("the 'how' … during task generation") and § 9 Open Questions; re-check a parked PRD before
      activating it

- [ ] **2.2 Task-generation stage (`2_generate-tasks.md`)**
    - Audit loop: `task-audit` and `source-grounding`, per phase, stopping only for decisions
    - Size re-check: a task list past the marks returns the boundary decision to the Owner
    - Success criteria fixed in advance, with at least one runnable check that fails if the goal is missed; a final
      verification phase
    - Tests grouped with their implementation by behaviour slice; rewrite Step 5's "decisions into Implementation
      Notes"

- [ ] **2.3 Per-task stage (`3_process-task-loop.md`)**
    - Task interlock from arc-framework's `process-task-loop.md`: stop after each task by default
      (`Proceed to Task X.Y?`); deferred review over an Owner-named scope (the agent may propose batching a parent's
      subtasks that land as one commit); the must-stop list; `[~]` for deferred tasks. Replaces the autonomous-mode
      trigger word in `agent/CLAUDE.md`
    - Task descriptions may record what was done; criteria and PRD goals are never reworded to match it
    - New `supplemental/task-review.md` (from `arc-task-review`), offered after a task or an autonomous run

- [ ] **2.4 Completion stage (`archive-completed.md`)**
    - Verification (`validate-criteria`, `verification-review`) and code review (`code-review-standard`, the
      `code-review-author` checklist) as separate adversarial passes
    - Then PR, `@codex review` or `@coderabbitai review`, the disposition table, one fix batch, a capped re-review
    - Rewrite § 1 ("all tasks complete = gates passed") and § 5's `coderabbit review --committed`

- [ ] **2.5 Review response (`agent-pre-merge-review.md`)**
    - Every finding plausible until checked against source; sibling search; the complete FIX/DEFER/REJECT table
      approved before any edit; one fix batch
    - Remove SILENT FIX, one-at-a-time fixing, deference to the tool's classification and "Deferrals: Leave open";
      deferred and rejected threads get a reply and are resolved (the ruleset requires resolved threads)

- [ ] **2.6 Success criteria format (`strategy-task-list-formatting.md`)**
    - `[x]` met, `[~]` superseded with a note, `[ ]` stops the work; replace the sample criteria that restate gates

### **Phase 3:** Rules and agents

- [ ] **3.1 `DEVELOPMENT-RULES.md`**
    - Quality Gate Failure Protocol: triage (wrong invocation reruns; a mechanical in-change fix is fixed and rerun;
      otherwise ask); a green rerun proves only intermittency; no self-attested gates
    - Leave It Cleaner rewritten around proportionality and anti-rider; sub-agent scope; recommend on forks
    - Task Management Protocol: the one-subtask rule and granularity guidelines give way to the task interlock and
      deferred review (2.3)
    - `strategy-work-organization.md`: the WU sizing standard

- [ ] **3.2 Root `AGENTS.md` review guidelines**
    - Preamble covers any requested review, hosted or local fresh-context, never ordinary work

- [ ] **3.3 Testing standards (`strategy-testing-methodology.md`)**
    - Observable behaviour over spy arguments, faithful mocks and fixtures, every test seen failing, the Chakra
      recipe-assertion pattern

- [ ] **3.4 Agents (gitignored, this machine only)**
    - Retire `quality-gate-enforcer`; `pragmatic-code-reviewer` read-only, unpinned, pointing at the vendored rubric

### **Phase 4:** Verify and land

- [ ] **4.1 Closure, markdown lint and link check across `.arc/`**
- [ ] **4.2 Fresh-context adversarial review of the wiring** (one pass plus a fix-check)
- [ ] **4.3 PR, one `@codex review`, dispositions, merge**

## Success Criteria

- [ ] Every vendored method names its source path and arc-framework commit, and keeps CineXplorer's changes in a
  marked section
- [ ] The vendored set is closed under its references (no pointer to removed machinery)
- [ ] The PRD, task-generation, per-task and completion stages each name the methods they run and when the loop
  exits
- [ ] PRD and task generation each run the size check, which returns the boundary decision to the Owner past the
  marks
- [ ] The task loop stops per task by default and supports deferred review over an Owner-named scope
- [ ] At completion, verification and code review are separate passes
- [ ] No legacy workflow still instructs SILENT FIX, one-at-a-time fixes, leaving deferred threads open, treating
  completed checkboxes as passed gates, or rewording criteria to match the work
- [ ] `quality-gate-enforcer` is retired and `pragmatic-code-reviewer` has no edit tools
- [ ] Markdown lint passes and `ci-ok` is green on the PR
