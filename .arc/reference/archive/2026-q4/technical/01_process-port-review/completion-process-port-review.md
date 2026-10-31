# Completion: Process Port, Review and Planning Methods

**Completed**: 2026-10-30
**Branch**: `technical/process-port-review` (PR #15)
**Category**: Technical
**Context**: First part of resuming CineXplorer on its in-repository process: bring arc-framework's planning and
review backstops in before feature work restarts

## Summary

The PRD, task-generation, task and completion stages now run arc-framework's review and planning methods, vendored
with their source text intact. Planning gains audits, a size check and an optional independent review loop; completion
separates verification from code review; and the development rules gain the matching discipline.

## Key Deliverables

- `.arc/reference/methods/`: 20 methods from arc-framework (`a49ebba40`), defaults verbatim, CineXplorer changes in
  each file's override section, with a README holding the vendoring rules, glossary and link map
- PRD and task-generation workflows: proportionality, spec and task audits, phase grounding, the size check, and the
  independent review loop with a Review Log
- Task loop: a stop after each task, deferred review over an Owner-named scope, and an on-request task review
- Completion: criteria verification and code review as separate passes; PR text and review replies approved before
  they post; review findings triaged as a complete set
- DEVELOPMENT-RULES 2.16: gate-failure triage, proportionality, Leave It Cleaner by concern, task interlock,
  sub-agent scope, review findings, and the surface rules for code, commits and PRs
- Work-unit sizing standard, testing discipline (including the Chakra recipe-assertion pattern), and the gitignored
  personal workspace (`.arc/user/`) for review records

## Implementation Highlights

- Methods are vendored, not reworded: a later diff against arc-framework shows only upstream change, and at migration
  each override carries forward as a method override
- No fixed pass cap: the Owner approves every further pass, and the size check keeps work small enough that loops stay
  short
- Every independent or hosted review is recommended and Owner-chosen; fix checks always run locally
- The wiring was itself reviewed: one independent pass (15 findings, all fixed), a fix check (3 residues fixed), and
  one hosted review (1 finding, fixed)

## Related Documentation

- Tasks: `tasks-process-port-review.md`

## Follow-Up Work

- Session routine, inbox, errands and commit routine: `tasks-process-port-routine.md`
- Parallel-session tiers T0/T1 (worktree sessions; a test-only backend stack per worktree)
- Harness hygiene: retire the stale gitignored project agents and commands that shadow the managed globals; replace
  `pragmatic-code-reviewer` with a neutral read-only reviewer profile
