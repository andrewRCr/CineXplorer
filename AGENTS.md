# Agent Bootstrap

CineXplorer runs on its in-repository ARC process. Sessions start with the session-init workflow
(`.arc/reference/workflows/supplemental/session-init.md`; `/resume-current` in Claude Code). Project context and
collaboration rules live in `.arc/reference/agent/AGENTS.md` and `.arc/reference/constitution/DEVELOPMENT-RULES.md`;
the review and planning methods the workflows run live in `.arc/reference/methods/`.

## Review guidelines

> _These guidelines govern **requested code reviews**: a hosted pull-request review (for example `@codex review`), or
> a local fresh-context review an agent runs on request in a subagent or a fresh session. They are **not** standing
> instructions for development sessions: do not apply them during ordinary work; apply them only when performing an
> explicitly requested review._

Adapted from arc-framework's `standard-review/v1` rubric; maintained by hand in this repository.

### Coverage and evaluator boundary

- Review the complete exact requested change set, not a sample or only the latest fix.
- Bind the review to the exact requested target.
- Use a non-author evaluator working from source and governing project context.
- Do not provide author conclusions, preferred fixes, self-verification claims, or suspected weak spots.

### Rubric dimensions

- Coherence and maintainability — Check whether the change remains understandable, cohesive, and maintainable.
- Correctness and failure behavior — Check normal behavior, boundary cases, and explicit failure handling.
- Intent and scope — Check that the complete change serves its stated intent without unrelated scope.
- Trust boundaries and compatibility — Check authority boundaries, unsafe inputs, and compatibility obligations.
- Verification quality and missing cases — Check that verification proves the behavior and covers material missing cases.
- Repository contract coherence — Check the change against `.arc/reference/constitution/DEVELOPMENT-RULES.md` and the
  strategy docs indexed in `.arc/reference/strategies/STRATEGY-INDEX.md`: business logic in the backend service layer,
  not API routes; frontend styling through semantic tokens; no unjustified `typing.Any`; no planning IDs, process
  names or `.arc/` references in code, tests or durable docs outside `.arc/`; PR text free of process vocabulary.

### Finding requirements

- Actionable materiality — State the material impact and an actionable correction boundary.
- Rubric failure explanation — Explain which rubric dimension fails and why.
- Source-grounded evidence — Ground the finding in the reviewed source rather than speculation.
- Stable locus — Name a stable code or document locus for the finding.

### Clean-result rule

- Return clean only after the complete requested change set and every rubric dimension were considered.
- Unavailable, partial, ambiguous, or failed review is never clean.
