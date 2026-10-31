# Technical: Process Port, Review and Planning Methods

**PRD:** none — scope in the Stage 1 assessment and the resume plan's Stage 1 (both kept outside the repository)
**Created:** 2026-10-30
**Branch:** `technical/process-port-review`
**Base Branch:** `main`
**Status:** Complete

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
      (they are the loop); kept versions, prompts and reports move to the gitignored personal workspace
      (`.arc/user/{identity}/{name}/`);
      the pass record becomes a `## Review Log` in the task list, with elapsed time; the partitioned modes
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

- [x] **3.1 `DEVELOPMENT-RULES.md`** (v2.16)
    - Quality Gate Failure Protocol: never-ran / mechanical / ask triage, intermittency, no red gate reported green
    - Leave It Cleaner by concern, not file (anti-rider), with attention cost; new § Proportionality; § Recommend on
      Advisory Forks; merges need explicit approval, never `--admin`
    - Task Management: § Task Interlock replaces the One Sub-Task Rule; § Design Before Implementation; granularity
      thresholds dropped; § Sub-agent Scope; § Review Findings
    - Code Documentation Standards: the stronger meta-reference rule, `.arc/` work-document references, write for the
      reader, commit and PR surface language (`pull-request-format` before any PR text)
    - `strategy-work-organization.md` v2.2: § Sizing a Work Unit (the WU sizing standard and size marks); review at
      merge follows the completion workflow. Version references updated in the agent docs and `session-init.md`;
      stale relative links fixed
    - Templates follow the filename-only rule: the task list's PRD header, the completion doc's Related
      Documentation and `activate-work-unit.md` (which no longer rewrites the PRD path on activation)

- [x] **3.2 Root `AGENTS.md` review guidelines**
    - Preamble covers a requested hosted review or a local fresh-context one, never ordinary work; the repository
      contract names the stronger meta-reference rule and PR surface; the bootstrap points at the methods folder

- [x] **3.3 Testing standards (`strategy-testing-methodology.md`)** (v1.5)
    - § Test Discipline (observable behaviour, faithful boundaries, every test seen failing, isolation and error paths)
      and § Asserting Chakra Recipe Styles (shared renderer uses Chakra's own system; `disableLayers` pattern,
      checked against Chakra 3.28)
    - `test-first` gains an override: one parent task per behaviour with test subtasks first; no segment modes or
      marker line. The `2_generate-tasks.md` example follows it

- [x] **3.4 Agents (gitignored, this machine only)**
    - `quality-gate-enforcer` moved to `~/dev/scratch/cinexplorer-stage1/retired-agents/`
    - `pragmatic-code-reviewer`: read-only tools (no Bash, Edit or Write; the caller supplies the diff), no model pin,
      on request only; applies `code-review-standard` through the `implementation-audit` dimensions and reports
      critical / major / minor findings with locus and evidence. Previous version kept beside the retired agent

### **Phase 4:** Verify and land

- [x] **4.1 Closure, markdown lint and link check across `.arc/`**
    - Markdown lint clean across `.arc/` and `AGENTS.md`; every relative link and anchor outside the archive resolves
      (one remaining hit is a placeholder inside a code span)
    - Fixed: wrong relative depth in four strategies and `maintain-task-notes.md`; links to archived work documents
      (ADR-020, `strategy-authentication.md`) made filename-only; PROJECT-STATUS archive links repointed; link-shaped
      paths in `atomic-commit.md` made code spans; two backlog documents' relative links made filename-only
- [x] **4.2 Fresh-context adversarial review of the wiring** (one pass plus a fix-check)
    - Pass 1: 15 findings (5 major, 10 minor), all fixed; review records moved to the gitignored personal workspace
      (`.arc/user/`), PR text and reply drafts shown before posting, incidental lifecycles pointed at the completion
      workflow. Fix check: 3 minor residues fixed; loop closed (see Review Log)
- [x] **4.3 PR, one `@codex review`, dispositions, merge**
    - PR #15 with the text shown to the Owner first; the personal workspace excluded from local lint. One hosted
      review: 1 finding (the verification step's circular precondition), fixed; Success Criteria walked below

## Success Criteria

- [x] Every vendored method names its source path and arc-framework commit, and keeps CineXplorer's changes in a
  marked section
    - All 20 carry the `a49ebba40` source header and both sections; the 11 adapted set `override-mode: extend`
- [x] The vendored set is closed under its references (no pointer to removed machinery)
    - Every link and anchor in the methods resolves; CLI-bound passages are disposed by the README and overrides
- [x] The PRD, task-generation, per-task and completion stages each name the methods they run and when the loop
  exits
    - Each review loop ends when a pass converges or the Owner stops it; checked in the wiring review and its fix check
- [x] PRD and task generation each run the size check, which returns the boundary decision to the Owner past the
  marks
    - `assess-boundary-fit` at PRD Steps 2.5 and 5 and task-generation Step 9, with the adopted size marks
- [x] The task loop stops per task by default and supports deferred review over an Owner-named scope
    - Task loop § Stopping and Proceeding and § Deferred Review
- [x] At completion, verification and code review are separate passes
    - Completion § 1 (criteria walk, independent pass) and § 5 (author checklist, independent pass)
- [x] No legacy workflow still instructs SILENT FIX, one-at-a-time fixes, leaving deferred threads open, treating
  completed checkboxes as passed gates, or rewording criteria to match the work
    - Searched workflows, rules and strategies: none remain
- [x] PR text and PRDs follow the surface rules: `pull-request-format` is vendored and `DEVELOPMENT-RULES.md`
  carries the surface language and documentation boundaries
    - DEVELOPMENT-RULES § Code Documentation Standards; PRDs carry no review record; PR #15's text follows the method
- [x] `quality-gate-enforcer` is retired and `pragmatic-code-reviewer` has no edit tools
    - Checked on this machine (the agents are gitignored)
- [x] Markdown lint passes and `ci-ok` is green on the PR
    - PR #15: Documentation Lint and `ci-ok` passed

## Review Log

- **2026-10-30 · Wiring review (Task 4.2) · Pass 1** · fresh read-only subagent · rubric: this list's Success
  Criteria, `implementation-audit` applied to prose, and whether an agent without session context would run the
  right method at each stage and stop where the Owner decides · 5 major, 10 minor · all 15 approved as fixes: F1, F2,
  F4 and F8 `new-design` (review records move to the gitignored personal workspace and leave the PRD; PR text and
  reply drafts are shown before posting), the rest `local-correction`; F9 allows a reasoned skip recommendation; F15
  keeps the gate criterion as written · about 14 minutes · stop: fixes landed, fix check offered
- **2026-10-30 · Wiring review (Task 4.2) · Fix check, round 1 since pass 1** · fresh read-only subagent, scoped to
  the repairs · 13 of 15 repairs hold; F5 and F6 partial (residue at loci their findings named); one new minor (F16,
  a stale line in this list) · 3 minor approved as fixes, `local-correction` · about 10 minutes · stop: converged;
  the Owner closed the loop
- **2026-10-30 · Pull request · hosted review (Codex)** · 1 major: the verification step required every task
  finished, including the open verification task · approved as a fix, `local-correction`; fix check skipped (a
  one-line change, CI re-runs) · stop: converged
