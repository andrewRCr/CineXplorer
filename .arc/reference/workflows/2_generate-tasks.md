# Workflow: Generate Task List

## Purpose

This workflow guides the creation of detailed, executable task lists from PRDs (Product Requirements Documents).
Task lists break down feature or technical work into step-by-step implementation plans that can be followed
incrementally, with clear checkpoints and quality gates.

**When to use:** After a PRD has been created and work is ready to move into active implementation planning.

## Goal

Create a comprehensive task list in Markdown format that turns the PRD's units (a detailed PRD's requirements, an
RFC's design elements, an outline's decisions, or a brief's one signal) into actionable development steps. The task
list should provide clear implementation guidance while respecting existing codebase patterns and architectural
decisions.

## Output

- **Format:** Markdown (`.md`)
- **Location:**
    - Feature work: `.arc/backlog/feature/`
    - Technical work: `.arc/backlog/technical/`
- **Filename:** `tasks-[name].md` (e.g., `tasks-user-profile-editing.md`, `tasks-api-modernization.md`)

**Note:** Task lists typically start in `.arc/backlog/` during planning, then move to `.arc/active/` when
work begins. See [Project Structure](../strategies/arc/strategy-work-organization.md) for complete lifecycle.

## Process

### Step 1: Review PRD and Project Context

Read the specified PRD to understand requirements, user stories, and acceptance criteria. Then review
foundational documents for broader context:

- **[META-PRD](../constitution/META-PRD.md)** - Product vision and core features
- **[TECHNICAL-OVERVIEW](../constitution/TECHNICAL-OVERVIEW.md)** - Architectural patterns and conventions

If the PRD waited in `.arc/backlog/`, follow [1_create-prd.md § Picking Up a Parked PRD](1_create-prd.md#picking-up-a-parked-prd)
first.

### Step 1.5: Simplify PRD Header Metadata

PRDs written in advance (with dependencies) include extra metadata fields that are no longer needed
once task generation begins. Simplify the header to the standard format.

**Remove these fields if present:**

- `Updated:` line
- `Related Work:` section (dependencies are now complete)

**Keep these fields:**

- `Type:` (Feature or Technical)
- `Form:` (brief, outline, or detailed as a PRD or an RFC)
- `Class:` (Light, Heavy or Novel)
- `Status:` (update to "In Progress" or leave as "Ready for Implementation")
- `Created:` (original creation date)

**Before:**

```markdown
# PRD: Feature Name

**Type:** Feature
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2025-10-25
**Updated:** 2025-12-31

**Related Work:**

- ✅ Complete: Some Dependency - description

---
```

**After:**

```markdown
# PRD: Feature Name

**Type:** Feature
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2025-10-25

---
```

**Rationale:** Dependency tracking is useful while waiting for prerequisites. Once task generation
begins, that context is historical and adds noise to the active document.

### Step 2: Resolve Depth, `Class` and Segments

Review the existing codebase to identify:

- Existing infrastructure and architectural patterns that can be leveraged
- Components or features that already exist and relate to the PRD
- Files, components, and utilities that may need modification
- Testing patterns and quality standards to follow, and the strategies that apply
  ([STRATEGY-INDEX](../strategies/STRATEGY-INDEX.md))

From that review, make one scale-axis read: the implementation surface, and how much of the codebase a correct task
plan has to ground in. Run [resolve-planning-depth](../methods/resolve-planning-depth.md),
[classify-work-unit](../methods/classify-work-unit.md) and
[resolve-plan-segmentation](../methods/resolve-plan-segmentation.md) off that one read:

- **Level** (`low`, `medium`, `high`): selects the path in Step 2.5 and is never recorded. No earlier document
  carries scale, so read the work surface directly and cross-check it against the PRD's `Class`.
- **`Class`:** confirm the PRD's `Class` or raise it; scale alone raises it at most to `Heavy`. A raised `Class`
  updates the PRD's `**Class:**` line in the task list's commit. There is no `Novel` overlay at this stage: `Novel`
  comes only from a design that must be invented, which goes to the PRD as an amendment (Step 4.5).
- **Segments:** divide the phases into ordered segments, each closing on one kind of progress chosen by the risk that
  remains after planning, from the read and the PRD's lifecycle statements (a migration, a rollout). A `slice`
  segment proves composition with a thin end-to-end behavior; a `layer` segment settles a shared substrate, such as a
  data model or a migration, before what builds on it; a `replication` segment applies one proven transformation
  across an enumerated surface, often after a `slice` pilot. Order the segments to retire the largest risk first, with
  the first `slice` as early as its substrate allows. Every plan resolves to at least one segment; a light work unit
  still yields one with an evident mode.

### Step 2.5: Follow the Path for the Level

The level selects one path, and the path drives the steps: it names which steps run in which pass and where a stop can
fall. Every path runs the same steps, checks and review; a lower depth separates less for review, it does not do less
work.

- **`low`: one combined pass.** One substantive phase plus verification. Run Steps 3, 3.5, 4 and 4.5 straight through
  with no stop between them; Step 4.5 audits at `grounding-only` depth.
- **`medium`: a merged draft, then grounding.** A few substantive phases plus verification. Pass 1 runs Steps 3, 3.5
  and 4 as one draft; Pass 2 runs Step 4.5 at `full` depth.
- **`high`: skeleton, fill, grounding.** Three to seven substantive phases plus verification. Pass 1 runs Steps 3 and
  3.5; Pass 2 runs Step 4; Pass 3 runs Step 4.5 at `full` depth.

**Stops.** A pass stops only when it leaves a decision the PRD does not settle: a real choice of phase breakdown, task
decomposition or sequencing, or a masked design decision. Bring that decision first, with the pass's work and a
recommendation, and wait for direction. Otherwise post a short summary, leading with anything that needs a look, and
continue. Step 3.5's proportionality stop and Step 4.5's decision stop hold on every path. After the last pass,
continue at Step 5.

### Step 3: Design Phases and Parent Tasks

Based on the PRD and the scale read, design the phases the level calls for and draft each phase's parent tasks as
titles only, before any sub-tasks:

- Order phases from the resolved segments: keep the sequence that retires the largest risk first, then minimize
  dependencies within each segment
- End each parent title with the PRD units it serves: requirement numbers on a detailed PRD (`— R3, R5`), design
  elements on an RFC or decisions on an outline (`— D2`). A brief's single phase needs none. Every unit is covered by
  some parent
- Note a rough sub-task count for each parent (one, two or three, many) to flag a parent that overcommits

**Record the segments.** A segment's first phase carries a `_Mode:_` line: the backticked mode, then an em dash and
what the segment closes on. Its last phase carries an `_Exit criterion:_` line: the specific scenario that proves the
segment's progress. A one-phase segment carries both, `_Mode:_` first. In a plan of more than one segment, a `slice` or
`replication` segment ends with a parent task that runs the check proving its exit criterion, such as a named E2E spec
or a scripted scenario, never the full suite. That task records what ran and the result. A failure stops the work
under the [Quality Gate Failure Protocol](../constitution/DEVELOPMENT-RULES.md#quality-gate-failure-protocol) and the
check task stays open: on the Owner's direction, the fix goes in a revision task on the task whose work it corrects
(`3.2.R`; [strategy-task-list-formatting § Revision Numbering](../strategies/arc/strategy-task-list-formatting.md#revision-numbering-r-scheme)),
never inside the check task, and the check task completes when its rerun passes. A `layer` segment needs no check
task. A one-segment plan needs none when its exit criterion matches one of the Success Criteria, which verification
checks; otherwise it ends with one too. The verification phase carries neither line.

**Considerations:**

- Within a `slice` segment, phase by behavior, not by layer: each phase delivers one observable behavior end to end,
  with its tests
- Order tasks to minimize dependencies and enable incremental progress
- Each test sits with the implementation it proves ([testing-standards](../methods/testing-standards.md),
  [test-first](../methods/test-first.md)), and is seen to fail before the implementation lands
- The final phase verifies the work; it does not hold deferred testing

**Example parent task structure:**

```markdown
## Tasks

### **Phase 1:** Users can rate a movie

_Mode:_ `slice` — closes on a rating saved from the movie page.

- [ ] **1.1 Submitting a rating is saved — R1, R2** (endpoint and service: tests first, then implementation)
- [ ] **1.2 The rating control submits a rating — R3** (component: tests first, then implementation)

### **Phase 2:** Ratings appear on the movie page

_Exit criterion:_ a rating submitted on the movie page shows in its average after a reload.

- [ ] **2.1 The movie page shows the average rating — R4** (tests first, then implementation)

### **Phase 3:** Verification

- [ ] **3.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)
```

### Step 3.5: Check the Skeleton

Before any sub-tasks are written, on every path:

1. **Proportionality.** Run [assess-design-proportionality](../methods/assess-design-proportionality.md) with the PRD's
   problem and a candidate that combines its settled design with the skeleton: the phase count, the parent titles and
   their units, and the rough sub-task counts. On `proportionate`, continue: a justified large skeleton is valid. On
   `revise`, stop and bring every finding with the proposed PRD correction; change neither document until it is
   approved. On approval, amend the PRD ([1_create-prd.md § Amending a PRD](1_create-prd.md#amending-a-prd)), discard
   the skeleton and restart at Step 2 with a fresh scale read; the `Class` ratchet still prevents demotion. On
   decline, leave both unchanged and return control without treating the result as `proportionate`.
2. **Boundary.** Run [assess-boundary-fit](../methods/assess-boundary-fit.md) against the skeleton, the first concrete
   evidence of the work's size. A derivation gap returns to the PRD; separable concerns go to the Owner as a cut. Its
   phase-count mark reads here: past it, the boundary decision goes to the Owner. A changed outcome is recorded in the
   PRD through § Amending a PRD; an unchanged one stays silent.

### Step 4: Break Down into Sub-Tasks

For each parent task, define specific, actionable sub-tasks that:

- Follow logically from the parent task
- Cover implementation details implied by the PRD
- Name a check only where a task needs one beyond its own checks (a specific E2E file, a build)
- Reference specific files, components, or patterns where appropriate
- Are small enough to review in one sitting

**A Goal on every parent task.** Open each parent task, except the verification pointer, with a `**Goal:**` line: the
outcome the task targets, not the change it makes, which the title already names. Test it: would removing it make the
work harder to verify? If not, rewrite it. A sub-task takes a Goal only when it carries intent of its own
([strategy-task-list-formatting § Goal/Note Lines](../strategies/arc/strategy-task-list-formatting.md#goalnote-lines)).

**Sub-task guidelines:**

- **Test-first protocol (CRITICAL)**: Write test sub-tasks BEFORE implementation sub-tasks for:
    - Data models and schemas
    - API endpoints and business logic
    - Service layer functions
    - See [strategy-testing-methodology.md](../strategies/project/strategy-testing-methodology.md)
      and [DEVELOPMENT-RULES.md](../constitution/DEVELOPMENT-RULES.md) for complete protocol
- **Quality gates**: Each task carries its own checks (lint, type-check, related tests) without listing them. Name a
  check in a task only when it needs one beyond them, such as the E2E files that drive a layout, navigation, form or
  interaction change. No full-suite checkpoint tasks: the final phase is verification. See
  [Quality Gates Strategy](../strategies/arc/strategy-quality-gates.md)
- **Incremental validation**: Structure tasks so progress can be verified at each step
- **ADRs**: For each new or amended ADR the PRD's Design Decisions list, add a sub-task to the phase that implements
  its decision: write it reading `Proposed` (or make the amendment), taking the next free number when it is written.
  A new ADR's acceptance belongs to the verification phase
  ([archive-completed.md § 1](supplemental/archive-completed.md#1-verify-the-work))
- **No time estimates**: Task lists should NOT include time estimates (duration emojis, minute counts, etc.)
  Focus on clear scope and completion criteria instead

### Step 4.5: Ground Each Phase

In the grounding pass the level's path sets (Step 2.5), audit each phase in turn, top-down, with
[task-audit](../methods/task-audit.md) and [source-grounding](../methods/source-grounding.md): confirm every named
file, symbol and behavior exists and acts as the task says (existence alone does not pass). At `full` depth, then check
assumptions, hidden design decisions, codebase drift, ordering, scope ambiguity, cross-task interfaces, test gaps and
missing definitions of done; on the `low` path the audit is `grounding-only`. Tag each finding "fix before starting"
(fix the task now) or "carry as context" (record it in the task). Stop for the Owner only when a finding needs a
decision.

**Re-entry.** A finding that shows the work is larger than the level assumed, rather than a local fix, is a scale
signal. Capture it in the session notes, then offer re-entry with a recommendation
([resolve-planning-depth](../methods/resolve-planning-depth.md) § Mid-stage re-entry): below `high`, rerun Step 2 a
level higher; at `high`, return to grounding the named surface, or assess the boundary when the concerns can stand
apart. An accepted re-entry restarts from the step it names. A masked design decision, or a design that must be
invented, is not a scale signal: it goes to the PRD through
[1_create-prd.md § Amending a PRD](1_create-prd.md#amending-a-prd), which can raise `Class`.

### Step 5: Add Implementation Notes Section (Optional)

Implementation Notes carry execution context: patterns to follow, pitfalls found while grounding, pointers to
relevant code. They do not hold design decisions. A decision that changes the design goes back into the PRD
([1_create-prd.md § Amending a PRD](1_create-prd.md#amending-a-prd)).

### Step 5.5: Copy the Success Criteria

Copy the PRD's Success Criteria into the task list's `## Success Criteria` section unchanged. They are fixed from here
on: marked only at verification, never reworded to match the work, and never inferred from task checkboxes. If the PRD
has none that a runnable check could fail, stop and fix the PRD first.

### Step 6: Review Task List Formatting Standards

**CRITICAL:** Before generating the task list, review formatting standards:

**→ [strategy-task-list-formatting.md](../strategies/arc/strategy-task-list-formatting.md)** ← **Required reading**

This strategy document defines:

- Exact format for all task list elements (phase headers, parent tasks, subtasks)
- Test-first task structure patterns
- Complete annotated examples
- Common mistakes to avoid
- Decision guidelines for numbered subtasks vs. detail bullets

**Use the strategy's Quick Format Checklist to verify your generated task list.**

### Step 7: Generate Final Task List

Combine parent tasks, sub-tasks, and optional implementation notes into the standard Markdown structure following [strategy-task-list-formatting.md](../strategies/arc/strategy-task-list-formatting.md).

**Basic structure:**

```markdown
# Task List: [Feature/Work Name]

**PRD:** `prd-[name].md`
**Created:** YYYY-MM-DD
**Branch:** `feature/[feature-name]` or `technical/[work-name]`
**Base Branch:** `main` (or parent branch if stacked)
**Status:** In Progress

## Tasks

### **Phase 1:** Core Tests and Implementation

_Mode:_ `slice` — closes on the core behavior working end to end.

_Exit criterion:_ the core flow passes its tests end to end.

- [ ] **1.1 Write tests for core functionality**

    **Goal:** The core rules are pinned by failing tests before the implementation exists.

    - [ ] **1.1.a Create test for validation**
        - Test cases listed here
        - Expect tests to FAIL initially
    - [ ] **1.1.b Run tests and verify failures**

- [ ] **1.2 Implement core functionality**

    **Goal:** The core flow works end to end and its tests pass.

    - [ ] **1.2.a Create implementation**
        - Implementation details here
    - [ ] **1.2.b Run tests - should now PASS**

### **Phase 2:** Verification

- [ ] **2.1 Verify the work** (load `archive-completed.md` § 1)

## Implementation Notes

_(Optional: execution context from planning — patterns, pitfalls, pointers)_

## Success Criteria

- [ ] _(copied unchanged from the PRD)_

## Review Log

_(one entry per review pass and fix check)_
```

See [strategy-task-list-formatting.md](../strategies/arc/strategy-task-list-formatting.md) for complete formatting rules
and annotated examples.

### Step 8: Save Task List

Save the generated task list in the appropriate category directory matching the PRD location:

- Feature work: `.arc/backlog/feature/tasks-[name].md`
- Technical work: `.arc/backlog/technical/tasks-[name].md`

The `[name]` should match the base name of the input PRD file
(e.g., if the input was `prd-user-profile-editing.md`, the output is `tasks-user-profile-editing.md`).

**Format verification:** Use the Quick Format Checklist in
[strategy-task-list-formatting.md](../strategies/arc/strategy-task-list-formatting.md)
to verify the generated task list follows all formatting standards before saving.

### Step 9: Final Suite-Coherence Pass

Once, after all phases: read the whole task list against the PRD. Every unit and success criterion is covered by some
task; tasks are ordered so each one's inputs exist before it starts; cross-task interfaces agree; no two tasks claim the
same change; each segment's exit criterion is something its phases can show. Then check size again with
[assess-boundary-fit](../methods/assess-boundary-fit.md): past its marks (about 1,000 task-list lines or more than six
phases), the boundary decision goes to the Owner.

### Step 10: Review the Task List

Run [planning-review](../methods/planning-review.md) with `artifact: task-list` and the current `Class`: Step 2's, or
the PRD's line if an amendment raised it since. Recommend the independent loop at every `Class`; the Owner decides.
Each pass is a fresh
[adversarial-review](../methods/adversarial-review.md) with [task-audit](../methods/task-audit.md) at full depth,
grounding and executability, over the PRD and the finished task list. Findings follow the same flow as the PRD's review:
verify against source, present the complete disposition table, edit nothing until it is approved, offer a fix check
after fixes land, and take each further pass only with approval. The `Class` sets the pass cap (`Light` 1, `Heavy` 2,
`Novel` 3); a pass past it runs only on the Owner's approval, shown `(over limit)`. The loop ends at one of
adversarial-review's stop reasons: it converges, reaches the cap, or the Owner stops it or accepts a re-entry.

Nothing is deferred past this stage: there is no later planning stage to absorb a correction, so pin each one before
committing. Start the task list's `## Review Log` with the entries already in the work unit's `REVIEW-LOG.md`
(`.arc/user/{identity}/{name}/`), record each pass of this stage after them, rerun the suite-coherence pass over the
settled list, and lint it with the repository's markdown lint.

> [!IMPORTANT]
> Stop when the task list is ready: everything that changes its text has run. Bring the Owner the task list, its level,
> any `Class` change and the review summary, and ask for the task list and its commit in one question, with your
> recommendation: "approve the task list and commit it as `docs(arc): write the task list for {name}`?". Approving the
> list while holding the commit is a valid answer. Feedback is edited, rechecked with task-audit over the change, the
> suite-coherence pass (Step 9) and lint, and brought back to this stop. After approval, only a mechanical fix a
> commit hook requires rides the commit, named in the report; any other change returns here.

**Commit.** On approval, commit the task list, with the PRD's `**Class:**` line when it changed, on the work unit's
branch. The body summarizes each review pass in one plain-language line.

```text
docs(arc): write the task list for {name}

Context: tasks-{name}.md (planning)
```

## Target Audience

Task lists should be written for developers (junior to mid-level) who will implement the feature with:

- Awareness of existing codebase context
- Understanding of the broader product vision from the META-PRD
- Familiarity with the project's testing and quality standards

**Writing style:**

- Clear, actionable sub-task descriptions
- Specific enough to guide implementation without over-prescribing solutions
- References to patterns, files, or approaches where helpful
- Assumes familiarity with the tech stack but not with every project-specific pattern

**Formatting standards:** See [strategy-task-list-formatting.md](../strategies/arc/strategy-task-list-formatting.md)
for complete formatting rules, test-first patterns, and examples.

## Task Completion Tracking

- All tasks start unchecked: `- [ ]`
- Mark completed: `- [x] 1.1 Sub-task description`
- Task list is a living document, updated throughout implementation
- See [Task Processing Loop](3_process-task-loop.md) for execution workflow

## Next Step (Optional)

When ready to begin implementation, activate the work unit:

**→ [activate-work-unit.md](supplemental/activate-work-unit.md)** - Move docs to active, update tracking

This step can be deferred if planning ahead (e.g., creating task lists for future work). Activate when
implementation is about to begin.
