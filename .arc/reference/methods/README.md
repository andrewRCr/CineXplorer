# Methods

Review, planning and pull-request methods vendored from arc-framework (`.arc/system/methods/`, snapshot `2538476f8`,
2026-11-08; review-model's fix-check paragraph at `6a8ba934`, 2026-11-10). They carry new ARC's backstops into this
repository's process until it migrates: adversarial review loops at each planning stage, verification separate from code
review, and the rubrics behind them. Workflows under `../workflows/` say where each method fires.

## Vendoring rules

- **Default text is verbatim.** Each file's `.default` section matches its source at the snapshot, so a later
  comparison with arc-framework shows only upstream change.
- **Link targets are retargeted, nothing else.** A link into a file that isn't vendored points at this repository's
  equivalent, per [§ Link map](#link-map). Where a longer target breaks the line-length or table lint, the line is
  re-wrapped or the table re-padded; the words don't change.
- **CineXplorer changes live only in the `.override` section,** plus any link definitions it uses, appended at
  the end of the file. Every changed file sets `override-active: true` and `override-mode: extend`. The glossary
  below is not a change.
- **The set is closed.** Every link resolves inside this folder, to a legacy workflow or rule, or to
  [§ Not used here](#not-used-here).
- **At migration** the copies stay behind in `.arc-legacy/` (the install ships the originals), and each `.override`
  carries forward as a method override.

## Reading a method

Check `.override` first. With `override-mode: extend`, apply `.default`, then the override; where they conflict, the
override wins. An override changes how the method is done here, never what its contract requires.

## Glossary

| New ARC term | Here |
| --- | --- |
| Work unit | A design draft, PRD and task list on one branch (`.arc/active/{feature,technical,incidental}/`) |
| Draft | The design draft, `draft-{name}.md` beside the PRD ([1a_draft-design.md](../workflows/1a_draft-design.md)); at the `low` level, a determinacy confirmation instead |
| Spec | The PRD, at the form its `**Form:**` line names: `brief`, `outline`, or `detailed` as a PRD or an RFC ([1_create-prd.md § Forms](../workflows/1_create-prd.md#forms)) |
| Stub, backlog draft | A plan, draft or PRD in `.arc/backlog/` |
| Errand | One bounded concern outside the current work unit, run on its own branch and pull request (`../workflows/supplemental/run-errand.md`); an atomic task (`.arc/active/ATOMIC-TASKS.md`) is one source |
| `Class` (`Light`, `Heavy`, `Novel`) | A `**Class:**` header line in the draft and the PRD; it sets each planning and verification review's pass cap |
| Planning depth level | Used at the draft, PRD and task-generation stages, never recorded; it selects the PRD's form and task generation's path ([resolve-planning-depth](resolve-planning-depth.md)) |
| `AGENT-BRIEF.ARC`, `DEV-RULES.ARC` | `../constitution/DEVELOPMENT-RULES.md` |
| `AGENT-BRIEF.PROJECT` | `../agent/AGENTS.md` and `../constitution/TECHNICAL-OVERVIEW.md` |
| Personal workspace | `.arc/user/{identity}/` (gitignored); a work unit's review files live in its `{name}/` folder |
| `SESSION-NOTES` | The work unit's `SESSION-NOTES.md` in the personal workspace |
| Meta file | The document headers: `Class` in the draft and the PRD, the form in the PRD, status in the task list |
| Lane | One review loop over one artifact or change, from its first pass to its stop |
| Spec review, standard code review | PRD review, code review; [disposition-report](disposition-report.md)'s override lists every review kind |
| Candidate, attest, receipt, store | Not used. Reviews are advisory; the Owner's approval is the gate |
| Hosted review | `@codex review` or `@coderabbitai review` on the pull request |
| Primary | The main session agent |

## Link map

| Source target | Here |
| --- | --- |
| `draft-design` workflow | `../workflows/1a_draft-design.md` |
| `create-spec`, `init-work-unit`, `amend-design` workflows | `../workflows/1_create-prd.md` |
| `generate-tasks` workflow | `../workflows/2_generate-tasks.md` |
| `process-task-loop` workflow | `../workflows/3_process-task-loop.md` |
| `run-errand` workflow | `../workflows/supplemental/run-errand.md` |
| `verify-work-unit`, `integrate-work-unit` workflows, `code-review` method | `../workflows/supplemental/archive-completed.md` |
| `activate-work-unit` workflow | `../workflows/supplemental/activate-work-unit.md` |
| `review-triage`, `review-response` methods | `../workflows/supplemental/agent-pre-merge-review.md` |
| `commit-format` method | `../workflows/supplemental/atomic-commit.md` |
| `DEV-RULES.ARC`, `route-discovered-work` method | `../constitution/DEVELOPMENT-RULES.md` |
| `strategy-work-organization` | `../strategies/arc/strategy-work-organization.md` |
| `strategy-adr-methodology` | `../strategies/arc/strategy-adr-methodology.md` |
| `arc-design-audit`, `arc-task-audit` skills | [§ Run on request](#run-on-request) |
| Everything in the next section | [§ Not used here](#not-used-here) |

Anchors into retargeted files are dropped, since the legacy files don't share them.

## Not used here

| Source | Why, and what stands in |
| --- | --- |
| `code-review-frontline` | Advisory pre-PR review lane (off by default in arc-framework). The completion stage's code review covers it |
| `review-chunking`, partitioned and chunk-series modes | Large-target machinery; work-unit sizing keeps targets reviewable whole |
| `classify-review-risk`, `assess-evidence-applicability` | Hosted review-gate routing and evidence reuse |
| `decompose-work-unit`, `deliver-stack` | Cohort and stack delivery. A boundary cut here becomes separate task lists and branches (`strategy-work-organization.md`) |
| `strategy-work-planning` | Reasons and ordering for review at planning boundaries; the workflows state what applies |

## Run on request

Two arc-framework skills run these methods outside their stage gates. Here, ask for them by name:

- **Task audit before a task** — `task-audit` over one task, before work starts on it. Never an automatic step.
- **Design audit** — `design-audit` over a finished PRD, for example a parked backlog PRD before activating it,
  whose world may have moved.
