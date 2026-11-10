---
name: resolve-plan-segmentation
description: Divide a task plan into ordered contiguous segments, each carrying the mode its residual risk selects.
override-active: true
override-mode: extend
---

<!--
Vendored from arc-framework .arc/system/methods/resolve-plan-segmentation.md at 2538476f8. The default text is verbatim;
out-of-set link targets are retargeted per README.md § Link map; CineXplorer changes live only in §
resolve-plan-segmentation.override.
-->

# Method: resolve-plan-segmentation

> - **Workflow:** [generate-tasks.md][generate-tasks] · [amend-design.md][amend-design]
> - **When:** A stage authors or revises a task plan's phase structure — task generation's scale-axis entry read,
>   or a later at-scope authoring pass that introduces a new segment.
>
> - **Signature:** `resolve-plan-segmentation(scale-axis read, spec lifecycle statements) → ordered segments with
>   modes; ordering doctrine`
> - **Contract:** Given the scale-axis read and the spec's lifecycle statements, resolve an ordered sequence of
>   contiguous segments, each carrying one mode, placed so the dominant residual risk retires earliest. The read is
>   universal — every plan resolves to at least one segment. Run it from the same read that drives
>   [resolve-planning-depth][resolve-planning-depth] and [classify-work-unit][classify-work-unit].

## resolve-plan-segmentation.override

CineXplorer adaptation (`override-mode: extend`):

- **Inputs until task generation's depth read is wired.** [2_generate-tasks.md][generate-tasks] Step 2's codebase
  assessment stands in for the scale-axis read ([resolve-planning-depth][resolve-planning-depth]'s override). The
  PRD carries no lifecycle statements yet, so its requirements stand in for them.

## resolve-plan-segmentation.default

When authoring the phase structure and its exit criteria, divide the plan into an ordered sequence of contiguous
segments. Each segment spans one or more phases and closes on one stated kind of progress. Attach the mode to the
segment, not the work unit; mixed-mode plans are ordinary, while a single-mode plan is the simplest case. The read is
universal — a light work unit still yields one segment with an evident mode.

Choose each segment's mode from the dominant residual risk after planning closes:

| Residual risk lies in                                           | Mode              | The segment closes on                              |
| --------------------------------------------------------------- | ----------------- | -------------------------------------------------- |
| **Composition** — do the parts assemble into intended behavior? | **`slice`**       | a thin end-to-end capability that can be exercised |
| **Substrate contract** — is the shared thing underneath right?  | **`layer`**       | a complete, settled layer                          |
| **Mechanics at scale** — does this transformation work N times? | **`replication`** | the enumerated surface exhausted, batch-verified   |

`pilot-then-replicate` is a composition, not a fourth mode: use a thin `slice` segment to prove one instance, then a
`replication` segment to exhaust the enumerated surface. Order segments to retire the dominant residual risk earliest;
place the first `slice` as early as its required substrate allows.

---

[generate-tasks]: ../workflows/2_generate-tasks.md
[amend-design]: ../workflows/1_create-prd.md
[resolve-planning-depth]: resolve-planning-depth.md
[classify-work-unit]: classify-work-unit.md
