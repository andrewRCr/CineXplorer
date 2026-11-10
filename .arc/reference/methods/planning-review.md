---
name: planning-review
description: Planning stage author checks, independent review, findings, and final reread
arc:
  methods:
    - review-model
    - assess-draft-readiness
    - assess-design-proportionality
    - source-grounding
    - spec-review
    - design-audit
    - task-audit
    - adversarial-review
related:
  - adversarial-review
  - review-model
override-active: true
override-mode: extend
---

<!--
Vendored from arc-framework .arc/system/methods/planning-review.md at 2538476f8. The default text is verbatim;
out-of-set link targets are retargeted per README.md § Link map; CineXplorer changes live only in §
planning-review.override.
-->

# Method: planning-review

> - **Workflow:** [draft-design][draft-design], [create-spec][create-spec], [generate-tasks][generate-tasks], and
>   [amend-design][amend-design].
> - **When:** Reviewing a planning artifact at its stage gate, including a bounded amendment footprint.
>
> - **Contract:** Run the artifact's author checks, offer an independent pass at the resolved posture, settle its
>   findings and fix checks, and reread the settled artifact immediately before the caller's commit. Return review
>   evidence and unresolved decisions; lifecycle changes and approval gates remain with the caller.

## planning-review.override

CineXplorer adaptation (`override-mode: extend`):

- **Artifacts:** `draft` (the design draft, or a determinacy confirmation, at [1a_draft-design.md][draft-design]'s
  capture), `spec` (the PRD), `task-list`, or `amendment` (a PRD change during implementation). A spec's `form` is
  the PRD's `**Form:**` line (`brief`, `outline` or `detailed`).
- **Independent offer at every `Class`** (Owner, 2026-11-10). Recommend the independent pass for every draft, PRD and
  task list, not only at `Heavy` and `Novel`; for small, well-understood work the recommendation may be to skip it,
  with the reason. For an amendment, judge its size: omit for a wording-level change, offer neutrally for a contained
  one, recommend when it changes design. The Owner still decides at the fire-point. `Class` sets the pass cap, which
  the Owner may lift ([adversarial-review][adversarial-review]'s override).
- **Pass record:** the Review Log and workspace folder from adversarial-review's override replace
  `ADVERSARIAL-PASSES.md`.
- **Size:** before the PRD's review loop, on the task list's skeleton, and again when the task list is finished, run
  [assess-boundary-fit][assess-boundary-fit]; past its size marks the boundary decision returns to the Owner.
- **Readiness:** besides the `draft` gate, an `amendment` that settles a decision also runs
  [assess-draft-readiness][draft-readiness], whose criterion 4 requires an ADR disposition for each decision. The PRD
  stage runs it at entry, over the draft, rather than over the saved PRD.

## planning-review.default

Apply [review-model][review-model] before running or assessing the review.

### Signature and inputs

```yaml
planning-review:
  artifact:        # draft | spec | task-list | amendment
  artifacts:       # exact artifact or footprint + upstream chain + neutral key-file pointers
  class:           # Light | Heavy | Novel
  form:            # spec only: resolved brief | outline | detailed
  depth:           # amendment only: low | medium | high
  prior-findings:  # recorded history; fresh-loop pass one takes ended-loop findings, not folds, as context
```

`artifact` selects the author checks and independent rubric below. `artifacts` bounds the exact subject, including
an amendment's affected surrounding contract. `class` sets the cap: Light 1, Heavy 2, Novel 3. `form` scales the spec
check without lowering its common reader checks; `depth` selects the amendment offer. `prior-findings` supplies only
recorded review history under [adversarial-review's context rules][review-context], never the author's focus list.

**Return schema:**

```yaml
artifact:          # exact reviewed artifact or footprint
primary-checks:    # checks performed and their evidence
independent:       # declined | omitted | completed, with pass-record reference when available
stop-reason:       # adversarial-review's returned reason, or not-run
unresolved:        # findings or decisions still requiring the caller
post-settle:       # reread result, returned when the caller reaches its pre-commit fire-point
```

This is advisory evidence. It creates no lane-progress record, Candidate, or approval authority.

### Author checks

At the stage gate, select by `artifact`; checks inside the caller's authoring loop remain there.

- **Draft:** run [assess-draft-readiness][draft-readiness]. On a draft-producing path, run
  [source-grounding][source-grounding] over the finished draft and upstream chain at artifact scope. Fold local
  corrections through the caller's iteration; surface any decision at its existing capture gate. A determinacy
  confirmation has no draft to ground.
- **Spec:** rerun [assess-design-proportionality][proportionality] over the saved spec. Continue only on
  `proportionate`; route `revise` through the caller's in-place correction or upstream design route. Run
  [spec-review][spec-review] over the complete specification or accessible complementary set, with coherence and
  grounding scaled to the resolved form, including one minimal pass at `brief`. Retain both common reader checks.
- **Task list:** no additional author check at this gate; the caller already ran each phase's audit and the final
  suite-coherence pass.
- **Amendment:** run [spec-review][spec-review] over the written specification delta and affected surrounding
  obligations and definitions at every depth, including `low`. If the body is unchanged, keep the affected-element
  grounding scope. Retain both common reader checks and the slices selected by the amendment depth.

A finding that reopens design returns to the caller's re-entry or amendment ceiling; never patch an unshaped
direction into a gate result.

### Independent offer

For a draft, spec, or task list, recommend the independent pass at Heavy and Novel; offer neutrally at Light.
For an amendment, omit at `low`, offer neutrally at `medium`, and recommend at `high`. Class still sets its cap.

> [!IMPORTANT]
> `adversarial-review` method — advisory fire-point: present the resolved offer and recommendation; await the
> Owner's call before invoking a reviewer. Decline proceeds normally with the author's evidence.

When accepted, select the independent rubric by artifact:

- draft: [assess-draft-readiness][draft-readiness] divergence, [assess-design-proportionality][proportionality],
  [design-audit][design-audit], and [source-grounding][source-grounding];
- spec: proportionality, design-audit, and spec-review at the resolved form;
- task list: [task-audit][task-audit], grounding and executability at full depth, over the spec and finished suite;
- amendment: the original finalization rubric, minus nothing, over the footprint: proportionality, design-audit,
  spec-review's coherence and grounding slices, and task-audit's grounding floor over affected tasks. Supply the
  work unit's recorded prior findings as context and keep untouched elements outside the review footprint.

Invoke [adversarial-review][adversarial-review] with the selected inputs:

```yaml
adversarial-review:
  rubric:          # selected artifact rubric above
  artifacts:       # exact artifact/footprint + upstream chain + neutral key-file pointers
  orientation:
    - AGENT-BRIEF.ARC
    - AGENT-BRIEF.PROJECT
  pass-cap:        # resolved from Class
  fold-verification: on
  prior-findings:  # recorded history under the context rules, including the fresh-loop exception
```

For a large subject with a stable, contract-closed authored partition, consider
[adversarial-review's authored-partition mode][authored-partition]. Use one whole-target reviewer when no such
partition exists or seams are dense. Fresh reviewers receive the method's rubric and artifact context, never the
primary's conclusions or private loop controls.

### Findings and pass record

After each returned look, apply [adversarial-review's complete-disposition and continuation protocol][exit-gate].
Beside every disposition set carrying a fix, offer its [fix check][fold-verification] after author grounding, before
a successor pass or the final reread. Decide each round on the fixes alone under review-model.

Append each pass to `ADVERSARIAL-PASSES.md` in the work unit's personal workspace, beside SESSION-NOTES, following
[Pass record][pass-record]. Later passes take their history from that record. The caller's commit summarizes each
pass in one body line; a stub groomed before it starts has no workspace, so that summary is its only record.
An accepted return to shaping ends the loop as `re-entered`; the caller owns authoring, readiness, and the fresh loop.

### Post-settle reread

At the caller's last step before its commit, reread after all folds and iteration amendments have settled:

- draft: when folds followed readiness, reread the settled draft against the readiness bar's coherence check;
- spec: when folds followed the author check, rerun spec-review's coherence slice over the settled specification;
- task list: after renderer replacement and any folds, rerun the caller's [suite-coherence pass][suite-coherence] over
  the settled task list;
- amendment: when a pass folded anything, rerun spec-review's coherence slice over the amended footprint on every
  arm, retaining both common reader checks and the affected surrounding contract without widening the footprint.

Return corrections and unresolved decisions to the caller's existing iteration and approval flow before commit.

---

[draft-design]: ../workflows/1a_draft-design.md
[create-spec]: ../workflows/1_create-prd.md
[generate-tasks]: ../workflows/2_generate-tasks.md
[amend-design]: ../workflows/1_create-prd.md
[review-model]: review-model.md
[draft-readiness]: assess-draft-readiness.md
[proportionality]: assess-design-proportionality.md
[source-grounding]: source-grounding.md
[spec-review]: spec-review.md
[design-audit]: design-audit.md
[task-audit]: task-audit.md
[adversarial-review]: adversarial-review.md
[review-context]: adversarial-review.md#context-provisioning
[authored-partition]: adversarial-review.md#authored-partition-carrier-mode
[exit-gate]: adversarial-review.md#exit-gate
[fold-verification]: adversarial-review.md#fold-verification
[pass-record]: adversarial-review.md#pass-record

[suite-coherence]: ../workflows/2_generate-tasks.md
[assess-boundary-fit]: assess-boundary-fit.md
