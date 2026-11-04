# Workflow: Generate Task List

## Purpose

This workflow guides the creation of detailed, executable task lists from PRDs (Product Requirements Documents).
Task lists break down feature or technical work into step-by-step implementation plans that can be followed
incrementally, with clear checkpoints and quality gates.

**When to use:** After a PRD has been created and work is ready to move into active implementation planning.

## Goal

Create a comprehensive task list in Markdown format that transforms PRD requirements into actionable development
steps. The task list should provide clear implementation guidance while respecting existing codebase patterns and
architectural decisions.

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
- `Status:` (update to "In Progress" or leave as "Ready for Implementation")
- `Created:` (original creation date)

**Before:**

```markdown
# PRD: Feature Name

**Type:** Feature
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
**Status:** Ready for Implementation
**Created:** 2025-10-25

---
```

**Rationale:** Dependency tracking is useful while waiting for prerequisites. Once task generation
begins, that context is historical and adds noise to the active document.

### Step 2: Assess Current Codebase State

Review the existing codebase to identify:

- Existing infrastructure and architectural patterns that can be leveraged
- Components or features that already exist and relate to PRD requirements
- Files, components, and utilities that may need modification
- Testing patterns and quality standards to follow

### Step 3: Generate Parent Tasks

Based on the PRD analysis and codebase assessment, identify the major phases of work required to implement
the feature or technical improvement. Create 3-6 high-level parent tasks that represent logical implementation
phases.

**Considerations:**

- Phase by behavior slice, not by layer: each phase delivers one observable behavior end to end, with its tests
- Order tasks to minimize dependencies and enable incremental progress
- Each test sits with the implementation it proves ([testing-standards](../methods/testing-standards.md),
  [test-first](../methods/test-first.md)), and is seen to fail before the implementation lands
- The final phase verifies the work; it does not hold deferred testing

**Example parent task structure:**

```markdown
## Tasks

### **Phase 1:** Users can rate a movie

- [ ] **1.1 Submitting a rating is saved** (endpoint and service: tests first, then implementation)
- [ ] **1.2 The rating control submits a rating** (component: tests first, then implementation)

### **Phase 2:** Ratings appear on the movie page

- [ ] **2.1 The movie page shows the average rating** (tests first, then implementation)

### **Phase 3:** Verification

- [ ] **3.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)
```

Present parent tasks and confirm the high-level plan aligns with expectations before proceeding to detailed
sub-tasks.

### Step 4: Break Down into Sub-Tasks

For each parent task, define specific, actionable sub-tasks that:

- Follow logically from the parent task
- Cover implementation details implied by the PRD
- Name a check only where a task needs one beyond its own checks (a specific E2E file, a build)
- Reference specific files, components, or patterns where appropriate
- Are small enough to review in one sitting

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
- **No time estimates**: Task lists should NOT include time estimates (duration emojis, minute counts, etc.)
  Focus on clear scope and completion criteria instead

### Step 4.5: Ground Each Phase

After drafting each phase's sub-tasks, before moving to the next, audit that phase top-down with
[task-audit](../methods/task-audit.md) and [source-grounding](../methods/source-grounding.md): confirm every named
file, symbol and behavior exists and acts as the task says (existence alone does not pass), then check assumptions,
hidden design decisions, codebase drift, ordering, scope ambiguity, cross-task interfaces, test gaps and missing
definitions of done. Tag each finding "fix before starting" (fix the task now) or "carry as context" (record it in
the task). Stop for the Owner only when a finding needs a decision.

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

- [ ] **1.1 Write tests for core functionality**

    - [ ] **1.1.a Create test for validation**
        - Test cases listed here
        - Expect tests to FAIL initially
    - [ ] **1.1.b Run tests and verify failures**

- [ ] **1.2 Implement core functionality**

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

Once, after all phases: read the whole task list against the PRD. Every requirement and success criterion is covered
by some task; tasks are ordered so each one's inputs exist before it starts; cross-task interfaces agree; no two tasks
claim the same change. Then check size with [assess-boundary-fit](../methods/assess-boundary-fit.md): past its marks
(about 1,000 task-list lines or more than six phases), the boundary decision goes to the Owner.

### Step 10: Review the Task List

Run [planning-review](../methods/planning-review.md) with `artifact: task-list`. Recommend the independent loop; the
Owner decides. Each pass is a fresh [adversarial-review](../methods/adversarial-review.md) with
[task-audit](../methods/task-audit.md) at full depth, grounding and executability, over the PRD and the finished task
list. Findings follow the same flow as the PRD's review: verify against source, present the complete disposition
table, edit nothing until it is approved, offer a fix check after fixes land, and take each further pass only with
approval. There is no fixed pass cap: the loop ends when a pass converges or the Owner stops it.

Nothing is deferred past this stage: there is no later planning stage to absorb a correction, so pin each one before
committing. Start the task list's `## Review Log` with the PRD stage's entries from the work unit's `REVIEW-LOG.md`
(`.arc/user/{identity}/{name}/`), record each pass of this stage after them, rerun the suite-coherence pass over the
settled list, and summarize each pass in one plain-language line of the commit body.

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
