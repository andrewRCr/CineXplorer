---
name: assess-draft-readiness
description: Evaluate whether a planning draft is formalization-ready against one shared three-criterion bar.
override-active: true
override-mode: extend
---

<!--
Vendored from arc-framework .arc/system/methods/assess-draft-readiness.md at a49ebba40. The default text is
verbatim; out-of-set link targets are retargeted per README.md § Link map; CineXplorer changes live only in §
assess-draft-readiness.override.
-->

# Method: assess-draft-readiness

> - **Workflow:** [planning-review](planning-review.md), [draft-design.md][draft-design], and
>   [create-spec.md][create-spec].
> - **When:** A planning stage decides whether a draft is ready to formalize into a spec — `draft-design` at
>   loop-exit (ready ends the shaping loop), `create-spec` at entry (ready proceeds to discovery). One judgment,
>   two fire points.
>
> - **Contract:** Given the draft (or `[none]`) plus WU context, return `{ ready: boolean, gaps: [...] }`. The
>   method owns the **criterion**; the caller owns the **routing** — both fire points read the same verdict and
>   diverge only on how they handle not-ready.

## assess-draft-readiness.override

CineXplorer adaptation (`override-mode: extend`):

- **Fire point:** the draft is the PRD. Run the method over the saved PRD among [1_create-prd.md][create-prd]'s
  author checks, and over an amendment that settles a decision. A `needs-detail` gap is closed in the PRD; a
  `needs-design` gap returns to discovery.
- **Criterion 3** always clears: a PRD has no inbound buffer.
- **Criterion 4, added: every settled decision carries an ADR disposition.** Each decision in the PRD's Design
  Decisions records one, beside the decision or in one list there, against
  [strategy-adr-methodology][adr-methodology] § When to Write an ADR. That list names each new or amended ADR among
  what the work delivers. Where the bar and verdict say "all three", read "all four".

An ADR disposition is one of four:

- **A new ADR** the work unit will deliver.
- **An amendment** to a named ADR.
- **Covered by** a named ADR that records the decision: one the work unit delivers or amends, or a Proposed or
  Accepted ADR already on `main` that records the decision unchanged.
- **`none`**, naming the strategy's "Don't write an ADR for" category (a tactical choice, one obvious from code, or a
  temporary one), or stating that the decision meets none of its five criteria.

A missing disposition is a `needs-detail` gap. "Covered by" naming any other ADR is also a `needs-detail` gap: a
number naming no ADR on `main` and none the work unit delivers, a Superseded or Deprecated ADR (or, for one superseded
in part, its replaced part), or an ADR that is neither on `main` nor the work unit's own. Close it by citing a
qualifying ADR or choosing another disposition.

## assess-draft-readiness.default

A draft is **formalization-ready** when all three criteria below clear. Otherwise return **not-ready** with the
gaps that block it — each tagged by kind, so the caller can route without re-judging.

### The bar

1. **All settle-able design is settled.** Test it by divergence: where two competent engineers handed this draft
   would build materially different things, a _design_ decision is still open and belongs here. Where they would
   each make the same local call without a second thought — variable names, internal structure, a tactical choice —
   that is an _implementation detail_, and leaving it open is fine. Open design decision → not ready.
2. **A stateable success signal exists.** The author can name a concrete outcome or behavior that will show the
   work succeeded — the seed of the spec's success criteria. An aspiration too vague to observe ("make it
   cleaner") does not count.
3. **The inbound buffer is drained.** No `## Inbound Buffer — Pending Integration` section remains un-integrated.
   Read for the section; do not drain it — draining is the caller's act, prompted by the not-ready verdict this
   check produces.

**The bar is identical at every planning depth** · `[invariant]`. Depth (via
[resolve-planning-depth][resolve-planning-depth]) sets how far a draft travels to clear it — fewer passes at `low` /
`medium`, more at `high` — never how high it sits.

### The verdict

Return `{ ready, gaps }`.

- **ready** — all three clear; `gaps` empty.
- **not-ready** — each gap names its shortfall and a kind:
    - **needs-design** — an unmade decision or unshaped direction; the draft must be shaped further before a spec
      can crystallize it.
    - **needs-detail** — the direction holds but a concrete particular (or the success signal) is missing;
      closeable where the draft already stands.

  The method tags each gap; the caller owns the route — `draft-design` iterates on either; `create-spec` resolves
  `needs-detail` inline and returns `needs-design` to drafting. With no draft (`[none]`), assess the stage's
  determinacy confirmation against the same bar.

---

[draft-design]: ../workflows/1_create-prd.md
[create-spec]: ../workflows/1_create-prd.md
[resolve-planning-depth]: README.md#not-used-here
[create-prd]: ../workflows/1_create-prd.md
[adr-methodology]: ../strategies/arc/strategy-adr-methodology.md
