# Workflow: Create PRD

## Purpose

This workflow guides the creation of **work-level PRDs** (Product Requirements Documents) that define
the scope and requirements for individual pieces of planned work - either user-facing features or technical
infrastructure improvements. Work PRDs build upon the broader product vision established in the META-PRD.

**Work Types:**

- **Feature PRDs** - User-facing capabilities (e.g., movie ratings, user profiles, search functionality)
- **Technical PRDs** - Infrastructure work (e.g., API modernization, type safety improvements, testing infrastructure)

See [Work Organization Strategy](../strategies/arc/strategy-work-organization.md) for the complete decision tree.

**Note**: This workflow is for creating **work-level PRDs**, not the project-wide META-PRD. For establishing
or updating constitutional documents (META-PRD, TECHNICAL-OVERVIEW, DEVELOPMENT-RULES),
use [0_define-constitution.md](0_define-constitution.md) instead.

## Goal

Create a detailed PRD in Markdown format from the settled design. The PRD should be clear, actionable, and provide
sufficient context for implementation while maintaining alignment with the overall product direction.

The design is shaped first, in [1a_draft-design.md](1a_draft-design.md): its draft, or its determinacy confirmation
when the design needed no draft, is this stage's primary input. Discovery here makes the design complete enough to
write and to validate against; it does not reopen it.

## Process

### Step 1: Review Project Context

Review the foundational project documents to understand the complete context:

- **`.arc/reference/constitution/META-PRD.md`** - Product vision, core features, and user flows
- **`.arc/reference/constitution/TECHNICAL-OVERVIEW.md`** - Technical constraints, patterns, and architectural decisions
- **`.arc/reference/constitution/DEVELOPMENT-RULES.md`** - Code standards, quality gates, and development protocols

### Step 2: Read the Draft

Read `draft-{name}.md` in the work unit's backlog folder, or the approved determinacy confirmation, as the primary
input. A PRD always follows the draft stage; for determinate work its `low` path is quick.

1. **Readiness.** Run [assess-draft-readiness](../methods/assess-draft-readiness.md) over the draft or confirmation. On
   **not-ready**, close a `needs-detail` gap here, and return a `needs-design` gap to the draft stage before writing
   anything. Inbox entries that name this work and aren't in the draft yet are routed as the draft stage routes them.
2. **Depth and `Class`.** Make one derivation-axis read of the draft and the problem, and run
   [resolve-planning-depth](../methods/resolve-planning-depth.md) and
   [classify-work-unit](../methods/classify-work-unit.md) off it: it confirms the draft's `Class` or raises it. The
   PRD's form is always detailed.
3. **Boundary.** Run [assess-boundary-fit](../methods/assess-boundary-fit.md) off the same read. A `cut-map` returns to
   the Owner before a monolithic PRD is written; otherwise keep the draft's recorded outcome unless the evidence has
   materially changed.

### Step 3: Complete the Design for the PRD

Confirm the design is complete and concrete enough to write and to validate against, then close the remaining gaps:
every decision that can be settled now belongs in the PRD, not in task generation or implementation. With a draft
this is targeted gap-filling, not open exploration. A real open decision, not merely unwritten detail, means the
design is not settled: return to the draft stage through the re-entry valve
([resolve-planning-depth](../methods/resolve-planning-depth.md) § Mid-stage re-entry) rather than shaping it here. A
design question that surfaces during implementation stops the work and amends the PRD
([§ Amending a PRD](#amending-a-prd)). When offering options, recommend one.

- Ask **targeted clarifying questions** about ambiguities or missing detail in the draft
- Confirm scope boundaries, priorities and sequencing against the scope the draft or confirmation recorded. The PRD's
  boundary inherits the draft's or confirmation's and sharpens it; never silently drop a commitment either recorded
- Settle anything the draft left as detail rather than design, such as acceptance criteria and edge cases

Run [assess-design-proportionality](../methods/assess-design-proportionality.md) whenever discovery adds a material
mechanism the draft didn't carry. **For interactive sessions:** provide options in numbered lists, with a
recommendation, to enable quick responses and maintain momentum.

### Step 3.5: Check Alignment

Two checks run before the PRD is saved. Each names what it checked in the stage's report, never just "passes": "checked
against META-PRD § 3 Out-of-Scope Features: passes".

- **META-PRD, always.** Evaluate the PRD's scope against META-PRD's vision (§ 1 Purpose, § 2 Core Features) and its
  § 3 Out-of-Scope Features. Halt and bring the Owner the specific conflict when the scope conflicts with that vision
  or adds something the META-PRD lists as out of scope.
- **TECHNICAL-OVERVIEW, when the PRD touches technical surfaces** (stack, architecture, runtime, dependencies or
  infrastructure). Halt when the PRD introduces a component, framework, dependency or infrastructure choice genuinely
  new to the project. Absence from TECHNICAL-OVERVIEW is the reason to look, not the finding: the usual hit is a stale
  document describing tech the project already uses. Confirm presence in the manifests, lockfiles, configuration and
  code; on confirmation, note the staleness and continue. Anything not confirmed halts for the Owner's direction.

### Step 4: Generate and Save PRD

Using the project context, the draft and the discovery responses, create a PRD following the structure outlined
below. Save it beside the draft, in the category the draft stage chose
([Work Organization Strategy](../strategies/arc/strategy-work-organization.md)):

- **Feature work** (user-facing): `.arc/backlog/feature/prd-{{FEATURE_NAME}}.md`
- **Technical work** (infrastructure): `.arc/backlog/technical/prd-{{FEATURE_NAME}}.md`

### Step 5: Review the PRD

Run [planning-review](../methods/planning-review.md) with `artifact: spec` and the resolved `Class`:

1. **Author checks.** [assess-design-proportionality](../methods/assess-design-proportionality.md) over the saved
   PRD; continue only on `proportionate`. Then [spec-review](../methods/spec-review.md) over the whole PRD, including
   its reader-independence and binding-completeness checks, and its question whether each decision the PRD settles
   beyond the draft carries an ADR disposition.
2. **Size.** [assess-boundary-fit](../methods/assess-boundary-fit.md) with its size marks. Past a mark, the boundary
   decision goes to the Owner with the cut the design's own seams suggest.
3. **Independent review loop.** Recommend it at every `Class`; the Owner decides. Each pass is a fresh
   [adversarial-review](../methods/adversarial-review.md) over the PRD, with the draft as its upstream chain when there
   is one, against proportionality, [design-audit](../methods/design-audit.md) and spec-review. Verify every finding
   against source, present the complete disposition table ([disposition-report](../methods/disposition-report.md)), and
   edit nothing until it is approved. After the approved fixes land, offer a fix check. The `Class` sets the pass cap
   (`Light` 1, `Heavy` 2, `Novel` 3); a pass past it runs only on the Owner's approval, shown `(over limit)`. The loop
   ends at one of adversarial-review's stop reasons: it converges, reaches the cap, or the Owner stops it or accepts a
   re-entry.
4. **Review record.** Record each pass and fix check in `REVIEW-LOG.md` in the work unit's folder of the gitignored
   personal workspace, `.arc/user/{identity}/{name}/` (adversarial-review's override gives the fields); kept
   versions, prompts and reports go in its `adversarial-review/` subfolder. Task generation copies the log into the
   task list. The PRD itself carries no review record.
5. **Post-settle reread.** Rerun spec-review's coherence slice over the settled PRD before committing it, with its
   `**Class:**` header line. The commit summarizes each pass in one plain-language body line ("Independent review: 2
   rounds, 6 findings fixed"). Then set the session notes' Next Action to task generation (`2_generate-tasks.md`).

### Amending a PRD

A design question that surfaces during task generation or implementation stops the work. Settle it with the Owner, amend
the PRD, and add a dated line to an `## Amendments` section saying what changed and why. Review the amendment with
planning-review's `amendment` artifact: omit the independent pass for a wording-level change, offer it for a contained
one, recommend it when the design changes. A decision the amendment settles gets its ADR disposition, and
assess-draft-readiness runs over the amendment. An amendment that raises `Class` updates the PRD's `**Class:**` line in
the same commit. A success criterion is never reworded to match the work: mark the old one `[~]` with a note naming the
amendment and append its replacement.

Then carry the amendment into the task list: update the tasks it affects (adding or `[~]`-marking tasks as needed),
and apply the same `[~]`-and-append change to the task list's copy of any changed criterion, since that copy is the
one verification checks. Work resumes where it stopped.

### Picking Up a Parked PRD

A PRD that waited in `.arc/backlog/` may describe a world that has moved. Before generating tasks from it, offer
[design-audit](../methods/design-audit.md) over the PRD against the current code; recommend it when dependencies have
landed or changed since it was written.

## Clarifying Questions (Examples)

Ask only about what the draft or confirmation leaves open; these are the areas where gaps most often sit:

- **Problem/Goal:** "What problem does this feature solve for the user?" or "What is the main goal we want to
  achieve with this feature?"
- **Target User:** "Who is the primary user of this feature?"
- **Core Functionality:** "Can you describe the key actions a user should be able to perform with this feature?"
- **User Stories:** "Could you provide a few user stories? (e.g., As a [type of user], I want to [perform an
  action] so that [benefit].)"
- **Acceptance Criteria:** "How will we know when this feature is successfully implemented? What are the key success criteria?"
- **Scope/Boundaries:** "Are there any specific things this feature _should not_ do (non-goals)?"
- **Data Requirements:** "What kind of data does this feature need to display or manipulate?"
- **Design/UI:** "Are there any existing design mockups or UI guidelines to follow?" or "Can you describe the
  desired look and feel?"
- **Edge Cases:** "Are there any potential edge cases or error conditions we should consider?"

## PRD Structure

### Header Metadata

Every PRD begins with metadata fields. The format depends on whether the PRD has dependencies
that delay task generation.

**Standard format** (most common - task generation follows immediately):

```markdown
# PRD: [Feature/Technical Name]

**Type:** Feature | Technical
**Class:** Light | Heavy | Novel
**Status:** Ready for Implementation
**Created:** YYYY-MM-DD

---
```

**With dependencies** (task generation delayed until dependencies complete):

```markdown
# PRD: [Feature/Technical Name]

**Type:** Feature | Technical
**Class:** Light | Heavy | Novel
**Status:** Pending Dependencies | Ready for Implementation
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD

**Related Work:**

- ⏳ Depends on: [Dependency name] - brief description
- ✅ Complete: [Completed dependency] - brief description

---
```

**Field definitions:**

- **Type:** `Feature` (user-facing) or `Technical` (infrastructure) per work organization
- **Class:** the work unit's `Class` ([classify-work-unit](../methods/classify-work-unit.md)), from the draft or raised
  at this stage; a later stage that raises it updates this line in its own commit
- **Status:** `Ready for Implementation` when task generation can proceed; `Pending Dependencies` if blocked
- **Created:** Date PRD was first written
- **Updated:** Date of last revision (only include when dependencies exist and PRD evolves while waiting)
- **Related Work:** Dependencies with status indicators (⏳ pending, ✅ complete)

**Rules:**

- Header metadata appears before the horizontal rule (`---`) that separates it from content
- No version numbers (git history tracks revisions)
- Updated field only when dependencies exist (PRDs written in advance may evolve)
- At task generation time, dependency-related fields are removed (see `2_generate-tasks.md`)

### Content Sections

The generated feature PRD should include the following sections:

1. **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2. **Goals:** List the specific, measurable objectives for this feature.
3. **User Stories:** Detail the user narratives describing feature usage and benefits.
4. **Functional Requirements:** List the specific functionalities the feature must have. Use clear,
   concise language (e.g., "The system must allow users to upload a profile picture."). Number these
   requirements.
5. **Non-Goals (Out of Scope):** Clearly state what this feature will _not_ include to manage scope.
6. **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention
   relevant components/styles if applicable.
7. **Design Decisions:** Every settled decision that shapes implementation: the choice, the credible alternative it
   was chosen over, and why. Interfaces, invariants, failure cases and preconditions belong here or in the
   requirements, not left for task generation. Each decision carries its ADR disposition, from the draft or settled
   here (a new ADR, an amendment, an
   ADR that covers it, or `none` with its reason; [assess-draft-readiness](../methods/assess-draft-readiness.md)
   defines them), beside it or in one list at the section's end. Either way, the section names each new or
   amended ADR the work delivers. The ADR files themselves are written with the implementation
   ([strategy-adr-methodology](../strategies/arc/strategy-adr-methodology.md#adr-lifecycle)).
8. **Success Criteria:** Observable conditions that show the goals are met, fixed now and checked independently at
   completion. At least one is a runnable check that fails if the main goal is missed. Separate "implemented" from
   "proven live" where deployment matters. Never "all quality gates pass" or a test count: those are gates, not
   criteria.
9. **Open Questions:** Empty before task generation. Settle each question now, or record it as a decision the Owner
   defers explicitly, with its consequence.

## Target Audience

The PRD serves as a bridge between product vision and implementation:

- **Primary:** Implementation teams (developers, designers) who need clear, actionable requirements
- **Secondary:** Stakeholders seeking to understand feature scope and rationale

Write for a reader who has none of the planning session. Desired behavior, scope, concepts and success conditions
must stand without notes, other PRDs or session history ([spec-review](../methods/spec-review.md)'s reader
independence). The repository is public, so no process vocabulary carries meaning: describe the product and the
code, not how the work is organized.

## Output Specifications

- **Format:** Markdown (`.md`)
- **Location:** `.arc/backlog/feature/` (user-facing) or `.arc/backlog/technical/` (infrastructure)
- **Filename:** `prd-{{FEATURE_NAME}}.md`
- **Token Format:** Use `{{UPPERCASE_SNAKE_CASE}}` for any placeholder values

## Workflow Completion

1. **Focus on requirements and design** - Do not proceed to implementation or task generation
2. **Fill the draft's gaps** - Ask targeted questions about what it leaves open; a real open decision returns to the
   draft stage
3. **Review before handing on** - The PRD's review loop (Step 5) settles before task generation starts
4. **Reference next steps** - Upon completion, the PRD is ready for task generation via `2_generate-tasks.md`
