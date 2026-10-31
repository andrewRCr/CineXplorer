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
- Anything bound to the `arc` CLI or store: stored pass records, attest, review lanes, partitioned review (fold
  verification stays, with its copies in a gitignored folder)
- The `_Goal:_` / `_Outcome:_` task grammar

## Tasks

### **Phase 1:** Vendor the methods

- [x] **1.1 Create `.arc/reference/methods/` with a README**
    - Vendoring rules: source header (path and arc-framework commit), a `## CineXplorer adaptation` section for every
      change, the set closed under its own references
    - Glossary: work unit → PRD + task list + branch; spec → PRD; depth level and `Class` → not used
    - README also holds the link map, § Not used here and § Run on request (task audit before a task, design audit
      of a parked PRD)

- [x] **1.2 Vendor the rubric methods verbatim**
    - `planning-review`, `spec-review`, `design-audit`, `assess-design-proportionality`, `task-audit`,
      `source-grounding`, `verification-review`, `validate-criteria`, `implementation-audit`, `code-review-standard`,
      `code-review-author`, `disposition-report`, `review-model`, `testing-standards`, `test-first`,
      `classify-work-unit`, `assess-boundary-fit`
    - `assess-boundary-fit` keeps arc-framework's size-trigger override (`64d989642`) as CineXplorer's adaptation:
      about 1,500 PRD lines, 1,000 task-list lines or six phases, or 10,000 forecast changed lines returns the
      boundary decision to the Owner
    - Plus `assess-draft-readiness`, which the set references: 19 methods
    - Default text kept verbatim (checked by diff against `a49ebba40`); CLI-bound passages are handled in each
      file's `.override` (ARC's own override mechanism, `override-mode: extend`) instead of stripped. Overrides:
      `adversarial-review`, `planning-review`, `verification-review`, `validate-criteria`, `classify-work-unit`,
      `spec-review`, `assess-boundary-fit` (arc-framework's size triggers adopted), `testing-standards`
      (CineXplorer's, replacing arc-framework's, with the Chakra recipe-assertion pattern)

- [x] **1.3 Trim `adversarial-review` to its review loop**
    - Keep the invocation contract, severity model, exit gate and context provisioning
    - Remove pass records, fold verification and the partitioned carrier modes; record the removals
    - No fixed pass cap (Owner): a loop runs to the exit gate; the method's sustained non-convergence valve returns
      it to the Owner. Runaway loops come from oversized work, which the sizing triggers catch at planning
    - Done as an override rather than a trim, keeping the default verbatim. Fold verification and fix checks stay
      (they are the loop); kept versions, prompts and reports move to a gitignored `temp-review-{name}/` folder;
      the pass record becomes a `## Review Log` in the PRD or task list, with elapsed time; the partitioned modes
      and attestation are not used

- [x] **1.4 Close the set under its references**
    - Every cross-reference resolves inside the set, or is cut or redirected and recorded
    - 62 out-of-set links retargeted through the README's link map; a checker confirmed every link target, README
      anchor, link label and frontmatter method name resolves. Two long lines re-wrapped and one table re-padded
      to keep the lint passing

- [x] **1.5 Vendor `pull-request-format`** (Owner, 2026-10-30)
    - Override: merge commits rather than squash; the surface boundary also excludes this repository's process
      vocabulary (task and phase IDs, stage names, `.arc/` paths, review pass counts)
    - No PR template, contributing guide or security policy here or in an owner `.github` repository; the defaults
      govern. Link map gains `commit-format` → `atomic-commit.md` and `integrate-work-unit` → `archive-completed.md`

### **Phase 2:** Wire the stages

- [x] **2.1 PRD stage (`1_create-prd.md`)**
    - Step 2.5 confirms the work needs a PRD (`classify-work-unit`, early `assess-boundary-fit`); Step 3 settles the
      design in the PRD and recommends on forks; Step 5 runs `planning-review` (proportionality, `spec-review`, size
      check, the independent loop with a Review Log)
    - New § Amending a PRD (design questions during implementation) and § Picking Up a Parked PRD (`design-audit`);
      Design Decisions, observable Success Criteria and an empty Open Questions before task generation
    - Target Audience: reader independence, no process vocabulary

- [x] **2.2 Task-generation stage (`2_generate-tasks.md`)**
    - Phases by behaviour slice with tests beside their implementation, ending in one verification task; Step 4.5
      grounds each phase (`task-audit`, `source-grounding`); Step 5 keeps design decisions in the PRD; Step 5.5
      copies the Success Criteria unchanged
    - Step 9 suite-coherence pass and size check; Step 10 `planning-review` over the task list, nothing deferred past
      it

- [x] **2.3 Per-task stage (`3_process-task-loop.md`)**
    - One task per review increment with a structured stop (`Proceed to Task X.Y?`); § Deferred Review (Owner-named
      scope, agent-proposed batch at a parent, must-stop list); `[~]` for deferred tasks; criteria never reworded;
      test-first slices and `testing-standards`; design questions stop the task
    - New `supplemental/task-review.md` (from `arc-task-review`); `agent/CLAUDE.md` § Autonomous Work Mode replaced
      by § Deferred Review, with `/autonomous-work` taking the scope as its argument; `agent/AGENTS.md` and
      `manage-incidental-work.md` aligned

- [x] **2.4 Completion stage (`archive-completed.md`)**
    - § 1 Verify the Work: Tier 3 run, the author criteria walk (`validate-criteria`) with `[x]`/`[~]`/`[ ]` marks, and
      a recommended independent pass; § 5 Code Review: the `code-review-author` checklist, then a recommended
      independent `code-review-standard` pass
    - § 6 PR text per `pull-request-format`, then a recommended review route (hosted, local subagent, or skip) that the
      Owner chooses, never started unprompted; § 7 defers to the review-response workflow; § 8 merge after the
      Owner's approval with `ci-ok` green and threads resolved, never `--admin`

- [x] **2.5 Review response (`agent-pre-merge-review.md`)**
    - Rewritten as "Review Findings and PR Response": whole-set triage (verify against source, sibling search, grade,
      dispose), a disposition report approved before any edit, one fix batch, an optional fix check (always local)
    - Every fixed, deferred or rejected thread gets a reply written as the Owner and is resolved; the pre-PR local
      mode moved to `archive-completed.md` § 5

- [x] **2.6 Success criteria format (`strategy-task-list-formatting.md`)**
    - Observable outcomes, at least one runnable check, no gates or counts, fixed in advance; marks `[x]` / `[~]` /
      `[ ]`; examples replaced; `## Review Log` follows the section
    - The full-stack pattern and the annotated example now phase by behaviour slice and end in a Verification phase,
      matching `2_generate-tasks.md`; stale relative links in its References fixed

### **Phase 3:** Rules and agents

- [ ] **3.1 `DEVELOPMENT-RULES.md`**
    - Quality Gate Failure Protocol: triage (wrong invocation reruns; a mechanical in-change fix is fixed and rerun;
      otherwise ask); a green rerun proves only intermittency; no self-attested gates
    - Leave It Cleaner rewritten around proportionality and anti-rider; sub-agent scope; recommend on forks
    - Task Management Protocol: the one-subtask rule and granularity guidelines give way to the task interlock and
      deferred review (2.3)
    - `strategy-work-organization.md`: the WU sizing standard
    - Surface rules from DEV-RULES.ARC: no meta-project references in code, tests or durable docs (the stronger
      version); write for the reader, not the author; commit and PR surface language, loading
      `pull-request-format` before any PR text; `.arc/` artifact references by filename only

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
- [ ] PR text and PRDs follow the surface rules: `pull-request-format` is vendored and `DEVELOPMENT-RULES.md`
  carries the surface language and documentation boundaries
- [ ] `quality-gate-enforcer` is retired and `pragmatic-code-reviewer` has no edit tools
- [ ] Markdown lint passes and `ci-ok` is green on the PR
