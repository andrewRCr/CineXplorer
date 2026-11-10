# Workflow: Draft Design

## Purpose

The first planning stage, before [1_create-prd.md](1_create-prd.md) and [2_generate-tasks.md](2_generate-tasks.md). It
shapes the design before a PRD records it: surface the problem, work the alternatives and settle the direction,
producing a design draft as rich as the work needs, or none when the design is already determinate.

The stage reads the **derivation** axis: how much design must be authored before a competent engineer can start.

For every write (authoring, revision and review folds), a claim about what shipped code does names the code that does
it, in backticked symbol form ([source-grounding](../methods/source-grounding.md)).

## Before Drafting

**Confirm it's a work unit.** Run [classify-work-unit](../methods/classify-work-unit.md)'s boundary tests. Work that
sorts below a work unit is an errand: run it now ([run-errand.md](supplemental/run-errand.md)) or capture it in the
inbox ([user-inbox.md](supplemental/user-inbox.md)), as the Owner chooses, and stop here.

**Plan on the work unit's branch.** A work unit is planned on its own branch, in a worktree created with starting
notes:

```bash
node scripts/worktree.mjs create {type}/{name} --work-unit
```

The draft is `.arc/backlog/{feature|technical}/draft-{name}.md`, beside where the PRD will go
([Work Organization Strategy](../strategies/arc/strategy-work-organization.md) decides the category). It is committed
on that branch, moves to `.arc/active/` with the PRD at activation
([activate-work-unit.md](supplemental/activate-work-unit.md)), and is archived with it.

## Resolve Depth and Class

Make **one derivation-axis read**: the problem framing and where it came from (an inbox entry, a backlog plan, a ROADMAP
item, a `notes-{name}.md` in the backlog or active folder of its category), plus a quick scan of what the design
composes from existing patterns and what it must invent. Run
[resolve-planning-depth](../methods/resolve-planning-depth.md) and
[classify-work-unit](../methods/classify-work-unit.md) off that one read: it sets this stage's **level** (`low`,
`medium` or `high`) and the work unit's **`Class`** (`Light`, `Heavy` or `Novel`), first estimated here. The methods own
how the read maps to a level, and the re-entry valve.

Off the same read, run [assess-boundary-fit](../methods/assess-boundary-fit.md) and act on its one outcome:

- **`stays one WU`:** record the outcome and its evidence in the draft's decision prose (on the `low` path, in the
  determinacy confirmation) and continue. Raise it again only on materially new evidence, never because the check ran
  again or time passed.
- **`cut-map`:** the concerns stand apart. Bring the Owner the complete cut; each part becomes its own work unit, with
  its own draft, task list and branch.
- **`stays one WU + delivery-plan candidate`:** delivery plans are not used here; proceed as `stays one WU`.

The level chooses the path below. It is the stage's default, which you may raise, never set below what the design
demands. A `notes-{name}.md` for this work is context the stage reads first; it stays a notes document and does not
become the draft.

## Assess Design Proportionality

Run [assess-design-proportionality](../methods/assess-design-proportionality.md) whenever a candidate direction
introduces a material mechanism, before elaborating it. Pass the current problem framing and candidate direction,
with pointers to the existing code it builds on when useful. On `revise`, correct the candidate within this drafting
loop; on `proportionate`, continue silently.

Run it again over the settled candidate at loop exit, before the readiness check. A `revise` result stays in the
drafting loop. Record any non-obvious justification in the draft's decision prose, not as a marker that the check ran.

## Draft at the Resolved Level

Each level maps to a path: the drafting procedure at that depth. Run the one the entry read selected; if a path
surfaces heavier derivation than the read assumed, step up.

Whatever the path produces, the scope boundary it records is what the PRD inherits: write it for the PRD's author, not
as a private note.

### `low`: confirm the design is determinate (no draft file)

The design is determinate; there is nothing to derive. Confirm that directly: state the intent, the scope boundary,
the one falsifiable signal that says it worked, and each decision's ADR disposition
([assess-draft-readiness](../methods/assess-draft-readiness.md)). No draft file is written: the confirmation goes to
the Owner for approval and carries into the PRD, usually as a brief, and into the session notes if planning spans
sessions. If the confirm surfaces unexpected open design, step up.

### `medium`: a bounded draft

A bounded set of open decisions to settle: a design composed from existing patterns, not one that must be invented.
Read an existing draft first if there is one, then gather context only for the specific gaps and assumptions in
question. Write `draft-{name}.md` from [§ Draft Structure](#draft-structure) and work it to settled: problem and
motivation, the alternatives and the leaning decision, unknowns and assumptions, scope. A round or two of refinement
is fine; what marks this level is a _bounded_ design space, not a count of rounds. Step up when the space proves
open-ended: exploration or invention rather than composition.

### `high`: iterative shaping

An open-ended or substantial design must be authored. Shape it as an evolving draft, looping until it reaches
**formalization-ready** at the depth this design demands (the readiness states below).

**Novel overlay** (`Class: Novel`, advisory). When the read finds the design must be invented, open the `high` path
with a free-form orient-then-research step, never a research dump up front. **Orient first:** establish what is known
and unknown and where the line between composing and inventing actually falls; the research to do follows from that
orientation, not from a fixed checklist. Its output fills the draft's discovery, research and alternatives sections;
it is not a separate document. A recommendation, not a gate: accept, decline or right-size it, then run the shaping
loop below as usual.

1. **Start.** If a draft already exists from an earlier idea or session, read it as the continuity document; don't
   rediscover from scratch. Otherwise start from the problem framing.
2. **Gather context** as the design needs it, noting relevance and skipping what doesn't apply: project direction
   (`.arc/backlog/ROADMAP.md` and the backlog plans); related prior work (active and archived work units in this area:
   decisions made, what was deferred); captured ideas (the inbox, backlog plans, other drafts); design context (ADRs
   and the strategies that constrain the approach); and the state of the code the work would touch.
3. **Facilitate.** Surface ambiguity, assumptions, alternatives, risks and scope boundaries, and follow the ambiguity
   rather than forcing a sequence: when something is underspecified or contradictory, work it through before moving
   on. Prompt material, not a questionnaire: problem and motivation; success and boundaries; alternatives and why;
   assumptions and unknowns; risks and dependencies; the minimum viable version. The Owner shapes the design with the
   agent; **the agent does not produce a finished design for sign-off**.
4. **Re-synthesize** into the draft each round, and record continuity so the next session resumes without re-deriving:
   the draft's **readiness state** (below), what is **Resolved**, the **Open** items (hidden design decisions,
   unvalidated assumptions, soft scope boundaries), and the **Next** move. This matters most for work that spans
   sessions, common at `Class: Novel`.
5. **Amend** the draft as each open decision settles, and loop until formalization-ready.

**Readiness states: one bar, a different distance at each depth.** The draft moves toward the formalization-ready
gate:

- **fresh:** no draft yet; the idea is still being shaped.
- **rough:** a draft exists but carries significant gaps or unresolved direction.
- **maturing:** the scope is known; the open items are detailed design, not fundamentals.
- **formalization-ready:** exploration is stable and every decision that can be settled is settled; a suitable input
  for the PRD.

At loop exit, run [assess-draft-readiness](../methods/assess-draft-readiness.md) over the draft. On **ready**, the draft
crosses to the PRD stage; on **not-ready**, re-synthesize against the returned gaps and keep iterating. Inbox entries
that name this work, aren't in the draft yet and aren't already routed elsewhere (criterion 3) are routed now: show the
Owner each one and where it goes (into the draft, an errand, another work unit's plan, or nowhere), and on confirmation
fold or route each. Entries folded into the draft, or dropped, leave the inbox at once (re-read, then write once). One
routed to an errand moves to `## Errand`, and one routed to another work unit's plan has its `_Target:_` rewritten to
that plan; either waits for the next drain and leaves as [user-inbox.md § Drain](supplemental/user-inbox.md#drain)'s
Finish step says. This is the pass that makes the draft ready; nothing stays held. The readiness states describe a
draft's maturity between sessions; a draft is formalization-ready when the method returns `ready`.

**Coherence consolidation** (`high` only; suggested, not enforced). A draft that iterates across many sessions
accretes superseded sketch beside current design: the design can be settled while the document is not yet one
coherent input. Amend each round (above), then reconcile the accreted layers with a holistic rewrite. Three leans,
never hard gates:

- **Consolidate before formalization-ready.** Reconcile the layers into one coherent input before the draft crosses
  to the PRD.
- **Interim rewrite.** When accretion makes the draft costly to resume against mid-loop, each session re-parsing a
  pile of separate amendments, suggest an integrating rewrite before everything is settled, so derivation runs
  against a clean document rather than a growing pile.
- **No silent detail loss.** Every consolidation, interim or final, keeps each settled decision and surviving detail;
  check the rewrite against the layers before it. Dropping superseded sketch is what a consolidation is _for_: drop it
  deliberately and name what went, in the draft or to the Owner. Substance disappearing unremarked is the failure, not
  removal itself.

A draft written in one sitting is coherent by construction and clears all three at once; they bite only when
accretion is real.

## Capture the Draft

Run [planning-review](../methods/planning-review.md) with `artifact: draft` and the resolved `Class`:

1. **Author checks.** [assess-draft-readiness](../methods/assess-draft-readiness.md); on a draft-producing path, also
   [source-grounding](../methods/source-grounding.md) over the finished draft and its upstream chain. A determinacy
   confirmation has no draft to ground.
2. **Independent review loop.** Recommend it at every `Class`; the Owner decides. Each pass is a fresh
   [adversarial-review](../methods/adversarial-review.md) over the draft against assess-draft-readiness divergence,
   [assess-design-proportionality](../methods/assess-design-proportionality.md),
   [design-audit](../methods/design-audit.md) and source-grounding, reported as `Design review — pass N`. Verify every
   finding against source, present the complete disposition table
   ([disposition-report](../methods/disposition-report.md)), and edit nothing until it is approved. After the approved
   fixes land, offer a fix check. The `Class` sets the pass cap (`Light` 1, `Heavy` 2, `Novel` 3); a pass past it runs
   only on the Owner's approval, shown `(over limit)`. The loop ends at one of adversarial-review's stop reasons: it
   converges, reaches the cap, or the Owner stops it or accepts a re-entry.
3. **Review record.** Record each pass and fix check in `REVIEW-LOG.md` in the work unit's folder of the gitignored
   personal workspace, `.arc/user/{identity}/{name}/` (adversarial-review's override gives the fields); kept versions,
   prompts and reports go in its `adversarial-review/` subfolder. The draft itself carries no review record.
4. **Post-settle reread.** Run planning-review's post-settle reread over the draft, write the `**Class:**` line in its
   header, and lint it with the repository's markdown lint. A determinacy confirmation has no file: its `Class` goes in
   the PRD's header.

> [!IMPORTANT]
> Stop when the draft, or the determinacy confirmation, is ready: everything that changes its text has run. Bring it
> to the Owner and ask for the draft and its commit in one question, with your recommendation: "approve the draft and
> commit it as `docs(arc): capture the design draft for {name}`?". A confirmation has no file, so its approval stands
> alone. Approving the draft while holding the commit is a valid answer. Feedback is edited, rechecked (readiness over
> the change, then the reread and lint), and brought back to this stop. After approval, only a mechanical fix a commit
> hook requires rides the commit, named in the report; any other change returns here.

**Re-entry valve.** When the design runs deeper than the resolved level authored, follow
[resolve-planning-depth](../methods/resolve-planning-depth.md)'s mid-stage route. Below `high`, re-enter this stage a
level higher. At `high`, offer a return to facilitated shaping over the named part, from the problem and alternatives;
the `Novel` ratchet when the design must be invented; or [assess-boundary-fit](../methods/assess-boundary-fit.md)
when the concerns can stand apart. Accepting a return ends the review loop as `re-entered`: re-run readiness after
shaping, then offer a fresh loop with a fresh cap and the ended loop's findings as context.

**Commit.** On approval, commit the draft on the work unit's branch. The commit body summarizes each review pass in
one plain-language line ("Independent review: 2 passes, 5 findings fixed"):

```text
docs(arc): capture the design draft for {name}

Context: planning (no associated task list)
```

On the `low` path there is no draft to commit: the PRD's header carries the first `**Class:**` line. Either way, set
the session notes' Next Action to the PRD stage.

## Draft Structure

```markdown
# Draft: [Feature/Technical Name]

**Type:** Feature | Technical
**Class:** Light | Heavy | Novel
**Readiness:** fresh | rough | maturing | formalization-ready
**Created:** YYYY-MM-DD

**Purpose:** One sentence stating what this design sets out to do, then any context on where the work came from.

---

## Problem / Motivation

What are we solving and why? Frame it as a problem, not a solution, and say why it matters now.

## Alternatives

The approaches considered and their trade-offs, with the leaning decision and why. Brief notes on rejected
alternatives keep later work from revisiting the same ground.

- **Option A:** description and key trade-offs
- **Option B:** description and key trade-offs

## Decisions

Each settled decision, with its ADR disposition (assess-draft-readiness's criterion 4) and, for `high`, what is
Resolved, what is Open and the Next move.

## Unknowns and Assumptions

What don't we know yet? What are we assuming? Flag the risky or unvalidated assumptions: they may need investigation
before the PRD.

## Scope Boundary (Won't Do)

What this will deliberately not do. Name the adjacent work being left out, so the PRD inherits the boundary instead of
rediscovering it. Dependencies on other work, if any.
```

The `**Class:**` line is written at the capture commit; until then the header carries the current estimate. The
draft is written for a reader with none of the planning session, and the repository is public: describe the product
and the code, not how the work is organized.

## Next Step

Run [1_create-prd.md](1_create-prd.md). It reads the draft, or the determinacy confirmation, as its primary input and
confirms or raises the `Class`. The draft's shape carries forward, not a depth value: the planning level is never
recorded.
