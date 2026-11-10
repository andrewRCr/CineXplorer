# Workflow: Create PRD

## Purpose

This workflow guides the creation of **work-level PRDs** (Product Requirements Documents) that define
the scope and requirements for individual pieces of planned work - either user-facing features or technical
infrastructure improvements. Work PRDs build upon the broader product vision established in the META-PRD.

**Work Types:**

- **Feature PRDs** - User-facing capabilities (e.g., movie ratings, user profiles, search functionality)
- **Technical PRDs** - Infrastructure work (e.g., API modernization, type safety improvements, testing infrastructure)

See [Work Organization Strategy](../strategies/arc/strategy-work-organization.md) for the complete decision tree. The
work type sets the PRD's folder; it is not the PRD's form, which the stage's depth read chooses
([§ Forms](#forms)).

**Note**: This workflow is for creating **work-level PRDs**, not the project-wide META-PRD. For establishing
or updating constitutional documents (META-PRD, TECHNICAL-OVERVIEW, DEVELOPMENT-RULES),
use [0_define-constitution.md](0_define-constitution.md) instead.

## Goal

Create a PRD in Markdown from the settled design, at the form its depth calls for: a brief, an outline, or a detailed
PRD or RFC. The PRD should be clear, actionable, and provide sufficient context for implementation while maintaining
alignment with the overall product direction.

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
input. A PRD always follows the draft stage; for determinate work its `low` path is quick and yields a brief.

1. **Readiness.** Run [assess-draft-readiness](../methods/assess-draft-readiness.md) over the draft or confirmation. On
   **not-ready**, close a `needs-detail` gap here, and return a `needs-design` gap to the draft stage before writing
   anything. Inbox entries that name this work, aren't in the draft yet and aren't already routed elsewhere are routed
   as the draft stage routes them.
2. **Depth, `Class` and form.** Make one derivation-axis read of the draft and the problem, and run
   [resolve-planning-depth](../methods/resolve-planning-depth.md) and
   [classify-work-unit](../methods/classify-work-unit.md) off it: it confirms the draft's `Class` or raises it, and
   its level selects the PRD's form: `low` → brief, `medium` → outline, `high` → detailed. A rich, fully shaped draft
   feeds `detailed`; a thin draft or a determinacy confirmation feeds a brief or an outline. At `detailed`, choose the
   subtype by which kind of derivation dominates: a **PRD** when the open question is what the work should do, an
   **RFC** when it is the right technical design and its tradeoffs (a refactor, a migration, internal architecture, a
   performance rework). The other dimension rides as a section of the one document (a PRD's Technical
   Considerations, an RFC's note on user-facing impact); work that seems to want both a full PRD and a full RFC holds
   two concerns, a boundary signal for the next step. The form can be raised later in the stage, never lowered below
   this read, and each form's limits ([§ Forms](#forms)) can raise it too.
3. **Boundary.** Run [assess-boundary-fit](../methods/assess-boundary-fit.md) off the same read. A `cut-map` returns to
   the Owner before a monolithic PRD is written; otherwise keep the draft's or confirmation's recorded outcome unless
   the evidence has materially changed.

### Step 3: Complete the Design at Its Form

Confirm the design is complete and concrete enough to write, and to validate against, at the resolved form, then
close the remaining gaps: every decision that can be settled now belongs in the PRD, not in task generation or
implementation. With a draft this is targeted gap-filling, not open exploration. A real open decision, not merely
unwritten detail, means the design is not settled: return to the draft stage through the re-entry valve
([resolve-planning-depth](../methods/resolve-planning-depth.md) § Mid-stage re-entry) rather than shaping it here. A
design question that surfaces during implementation stops the work and amends the PRD
([§ Amending a PRD](#amending-a-prd)). When offering options, recommend one.

When discovery shows the work needs more than its form records, but the design itself is settled, raise the form below
`high`. At `high`, offer a return to discovery over the named section, the `Novel` ratchet when the design must be
invented, or a boundary assessment when the concerns can stand apart. An accepted return ends the review loop as
`re-entered`: rerun spec-review over that section, then offer a fresh loop with a fresh cap and the ended loop's
findings as context.

At every form:

- Ask **targeted clarifying questions** about ambiguities or missing detail in the draft
- Confirm scope boundaries, priorities and sequencing against the scope the draft or confirmation recorded. The PRD's
  boundary inherits the draft's or confirmation's and sharpens it; never silently drop a commitment either recorded
- Settle anything the draft left as detail rather than design, such as acceptance criteria and edge cases

Then work the block for the resolved form:

- **Brief: intent, boundary, signal.** The design is determinate. Confirm the intent, the scope boundary and the one
  falsifiable signal that says it worked are concrete, and sharpen any that reads fuzzy. The confirmation plus a
  targeted question or two suffices; there is no broad pass.
- **Outline: settle what it records.** Each design decision is settled, with its reason, not deferred or hand-waved;
  the non-goals are explicit; the consequences and risks are named; the success criteria are checkable. Fill gaps with
  targeted questions against the draft rather than re-deriving the decisions.
- **Detailed: a full completeness pass.** The units the task list is built from (a PRD's numbered requirements, an
  RFC's design elements) are complete and unambiguous; the success criteria are concrete and falsifiable; the in- and
  out-of-scope edges are crisp; the cross-cutting surface the subtype calls for is covered (a PRD's constraints,
  dependencies and integration points; an RFC's security, performance, testing, migration and rollout); and nothing
  that could be settled now is left as an open question.

**Proportionality, at every form.** As discovery crystallizes the design, run
[assess-design-proportionality](../methods/assess-design-proportionality.md) over the problem and the PRD as it forms.
On `proportionate`, continue silently. On `revise`, correct a wrong mechanism, shape or interface in place when the
design is settled; when the finding exposes an unshaped or under-derived direction, return to the draft stage through
the re-entry valve. **For interactive sessions:** provide options in numbered lists, with a recommendation, to enable
quick responses and maintain momentum.

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

Using the project context, the draft and the discovery responses, write the PRD at its form from
[§ PRD Structure](#prd-structure). Save it beside the draft, in the category the draft stage chose
([Work Organization Strategy](../strategies/arc/strategy-work-organization.md)):

- **Feature work** (user-facing): `.arc/backlog/feature/prd-{{FEATURE_NAME}}.md`
- **Technical work** (infrastructure): `.arc/backlog/technical/prd-{{FEATURE_NAME}}.md`

### Step 5: Review the PRD

Run [planning-review](../methods/planning-review.md) with `artifact: spec`, the resolved `Class` and the PRD's `form`:

1. **Author checks.** [assess-design-proportionality](../methods/assess-design-proportionality.md) over the saved
   PRD; continue only on `proportionate`. Then [spec-review](../methods/spec-review.md) over the whole PRD at its form,
   including its reader-independence and binding-completeness checks, and its question whether each decision the PRD
   settles beyond the draft carries an ADR disposition.
2. **Draft check.** Read the draft, or the confirmation, against the PRD: every binding obligation, settled decision
   and decisive reason it records is in the PRD. The lighter forms are where such content gets dropped. Absorb what is
   missing and rerun spec-review over it; route a design that turns out unsettled through the re-entry valve.
   Supplemental context, such as execution detail and pointers, stays in the draft, which is kept and archived with the
   PRD; the draft is never the only home of binding design.
3. **Size.** [assess-boundary-fit](../methods/assess-boundary-fit.md) with its size marks. Past a mark, the boundary
   decision goes to the Owner with the cut the design's own seams suggest.
4. **Independent review loop.** Recommend it at every `Class`; the Owner decides. Each pass is a fresh
   [adversarial-review](../methods/adversarial-review.md) over the PRD, with the draft (on the `low` path, the approved
   determinacy confirmation) as its upstream chain, against proportionality, [design-audit](../methods/design-audit.md)
   and spec-review at the PRD's form. Verify every finding against source, present the complete disposition table
   ([disposition-report](../methods/disposition-report.md)), and edit nothing until it is approved. After the approved
   fixes land, offer a fix check. The `Class` sets the pass cap (`Light` 1, `Heavy` 2, `Novel` 3); a pass past it runs
   only on the Owner's approval, shown `(over limit)`. The loop ends at one of adversarial-review's stop reasons: it
   converges, reaches the cap, or the Owner stops it or accepts a re-entry.
5. **Review record.** Record each pass and fix check in `REVIEW-LOG.md` in the work unit's folder of the gitignored
   personal workspace, `.arc/user/{identity}/{name}/` (adversarial-review's override gives the fields); kept
   versions, prompts and reports go in its `adversarial-review/` subfolder. Task generation copies the log into the
   task list. The PRD itself carries no review record.
6. **Post-settle reread.** Rerun spec-review's coherence slice over the settled PRD, write its `**Class:**` header
   line, and lint it with the repository's markdown lint.

> [!IMPORTANT]
> Stop when the PRD is ready: everything that changes its text has run. Bring the Owner its location, form and
> `Class`, the draft check's result and the review summary for a full read, and ask for the PRD and its commit in one
> question, with your recommendation: "approve the PRD and commit it as `docs(arc): write the PRD for {name}`?".
> Approving the PRD while holding the commit is a valid answer. Feedback is edited, rechecked with spec-review over
> the change and lint (offer a fix check when it changes the design), and brought back to this stop. After approval,
> only a mechanical fix a commit hook requires rides the commit, named in the report; any other change returns here.

**Commit.** On approval, commit the PRD on the work unit's branch. The body summarizes each review pass in one
plain-language line ("Independent review: 2 rounds, 6 findings fixed"). Then set the session notes' Next Action to task
generation (`2_generate-tasks.md`).

```text
docs(arc): write the PRD for {name}

Context: planning (no associated task list)
```

### Amending a PRD

A design question that surfaces during task generation or implementation stops the work. Settle it with the Owner, amend
the PRD, and add a dated line to an `## Amendments` section saying what changed and why. Review the amendment with
planning-review's `amendment` artifact: omit the independent pass for a wording-level change, offer it for a contained
one, recommend it when the design changes. A decision the amendment settles gets its ADR disposition, and
assess-draft-readiness runs over the amendment. An amendment a brief or outline can no longer hold (see each form's
limits) rewrites the PRD at the higher form and updates its `**Form:**` line. An amendment that raises `Class` updates
the PRD's `**Class:**` line in the same commit. A success criterion is never reworded to match the work: mark the old
one `[~]` with a note naming the amendment and append its replacement.

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
**Form:** brief | outline | detailed · PRD | detailed · RFC
**Class:** Light | Heavy | Novel
**Status:** Ready for Implementation
**Created:** YYYY-MM-DD

---
```

**With dependencies** (task generation delayed until dependencies complete):

```markdown
# PRD: [Feature/Technical Name]

**Type:** Feature | Technical
**Form:** brief | outline | detailed · PRD | detailed · RFC
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
- **Form:** the PRD's form ([§ Forms](#forms)), from this stage's depth read; an amendment that raises it updates this
  line
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

### Forms

Each form records what its depth needs: the lighter forms are their own shapes, not a detailed PRD with sections
removed. Sections marked _shared_ follow [§ Shared Sections](#shared-sections).

**Brief** (`low`): a determinate change whose design is settled coming in.

- One paragraph after the header: the intent (what this work is and why now), the scope boundary (what it deliberately
  leaves out) and the one signal that says it worked. Revise it in place as understanding sharpens.
- `**Success Criteria:**` one line: a runnable check that fails if the intent is missed.
- **Limits.** A brief has no Design Decisions, Goals or Open Questions. It carries only ADR dispositions that deliver
  nothing (`none`, or covered by an ADR already on `main`) and need not record them. Work that needs a recorded
  decision, a scope it will have to defend later, a new or amended ADR, more than one success criterion, or a
  criterion proven live or after merge has outgrown it: write an outline.

**Outline** (`medium`): a design that is settled but worth recording, without a detailed PRD's derivation.

1. **Problem / Context:** the situation and why act now, framed as the need, not the solution.
2. **Design Decisions** (_shared_), numbered `D1`, `D2`: each stated as a resolved position. They are the units the
   task list is built from and checked against.
3. **Non-Goals** (_shared_).
4. **Consequences & Risks:** what follows from the decisions, the tradeoffs accepted, and each notable risk with its
   mitigation or acceptance.
5. **Success Criteria** (_shared_): a short list, not a prioritized matrix.
6. **Open Questions** (_shared_).

**Limits.** An outline records settled decisions, not a derivation. Work whose tasks need a requirements list to be
built from (what the product must do, with user stories), or a structured technical design (architecture, data model
and interfaces, built element by element, with its cross-cutting concerns), has outgrown it: write a detailed PRD or
RFC.

**Detailed · PRD** (`high`, product or requirements derivation): the open question is what the work should do.

1. **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2. **Goals:** List the specific, measurable objectives for this feature.
3. **User Stories:** Detail the user narratives describing feature usage and benefits.
4. **Requirements:** List what the work must do, numbered `R1`, `R2`, in clear, concise language (e.g., "The system
   must allow users to upload a profile picture."). They are the units the task list is built from and checked
   against. For larger scope, mark each P0 (must-have), P1 (should-have) or P2 (nice-to-have); dropping a P1 or P2
   during the work goes through [§ Amending a PRD](#amending-a-prd).
5. **Non-Goals** (_shared_).
6. **Technical Considerations (Optional):** constraints, dependencies and integration points that bound the design,
   not the design itself. When the technical design is the hard part, the PRD is an RFC.
7. **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention
   relevant components/styles if applicable.
8. **Design Decisions** (_shared_).
9. **Success Criteria** (_shared_).
10. **Open Questions** (_shared_).

**Detailed · RFC** (`high`, technical-design derivation): the open question is the right technical design and its
tradeoffs.

1. **Introduction / Context:** the situation, and the problem or constraint that forces a design decision now.
2. **Goals:** what a correct design achieves: ends, not mechanism.
3. **Non-Goals** (_shared_).
4. **Proposed Design:** the chosen design (architecture, interfaces, data model, behavior) as numbered elements `D1`,
   `D2`, concrete enough to build from. They are the units the task list is built from and checked against, in place
   of a PRD's user stories and requirements.
5. **Design Decisions** (_shared_), keyed by element (`D2: ...`): the alternatives considered and why the proposed
   design wins, with the ADR disposition. Don't restate the element.
6. **Cross-cutting Considerations:** security, performance, testing, migration and rollout, and any user-facing
   impact.
7. **Success Criteria** (_shared_).
8. **Open Questions** (_shared_).

### Shared Sections

- **Non-Goals (Out of Scope):** Clearly state what this work will _not_ include, and why, to manage scope.
- **Design Decisions:** Every settled decision that shapes implementation: the choice, the credible alternative it was
  chosen over, and why. Interfaces, invariants, failure cases and preconditions belong here or in the units, not left
  for task generation. Each decision carries its ADR disposition, from the draft or settled here (a new ADR, an
  amendment, an ADR that covers it, or `none` with its reason;
  [assess-draft-readiness](../methods/assess-draft-readiness.md) defines them), beside it or in one list at the
  section's end. Either way, the section names each new or amended ADR the work delivers. The ADR files themselves are
  written with the implementation ([strategy-adr-methodology](../strategies/arc/strategy-adr-methodology.md#adr-lifecycle)).
- **Success Criteria:** Observable conditions that show the goals are met, fixed now and checked independently at
  completion. At least one is a runnable check that fails if the main goal is missed. Separate "implemented" from
  "proven live" where deployment matters. Never "all quality gates pass" or a test count: those are gates, not
  criteria.
- **Open Questions:** Empty before task generation. Settle each question now, or record it as a decision the Owner
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
- **Filename:** `prd-{{FEATURE_NAME}}.md`, whatever the form
- **Token Format:** Use `{{UPPERCASE_SNAKE_CASE}}` for any placeholder values

## Workflow Completion

1. **Focus on requirements and design** - Do not proceed to implementation or task generation
2. **Fill the draft's gaps** - Ask targeted questions about what it leaves open; a real open decision returns to the
   draft stage
3. **Review before handing on** - The PRD's review loop and its stop (Step 5) settle before task generation starts
4. **Reference next steps** - Upon completion, the PRD is ready for task generation via `2_generate-tasks.md`
