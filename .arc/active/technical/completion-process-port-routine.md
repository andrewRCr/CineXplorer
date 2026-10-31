# Completion: Process Port, Session and Commit Routine

**Completed**: 2026-10-31
**Branch**: `technical/process-port-routine`
**Category**: Technical
**Context**: Second part of resuming CineXplorer on its in-repository process: bring arc-framework's daily routine
(session notes, inbox, errands, commits) in before feature work restarts

## Summary

Sessions now start from per-work-unit session notes, working memory and git, and hand off by rewriting those notes;
the compaction-recovery hook reads the same notes. Discovered work is fixed inline, run as an errand through its own
pull request, or captured in a personal inbox that a drain routes. Commits take a simple or a complex path, each task's
checkboxes ride with its content, and task references stay in the footer.

## Key Deliverables

- Personal workspace (`.arc/user/{identity}/`, gitignored): one `SESSION-NOTES.md` per work unit, in its checkout, led
  by seven pointer fields; `WORKING-MEMORY.md` and `USER-INBOX.md` in the main checkout. `CURRENT-SESSION.md` retired
- Compaction-recovery hook rewritten for the session notes, with a tracked `node --test` suite beside it
- `session-init.md` and `session-handoff.md` rewritten: orient in one block from the notes, working memory and git;
  hand off by replacing the notes' sections and pruning working memory
- `run-errand.md`: one bounded concern on its own branch from `origin/main` and its own pull request; atomic tasks
  run as errands
- `user-inbox.md`: capture and drain. ADR-021 supersedes ADR-014's shared inbox, weekly review and new atomic tasks
  (`ATOMIC-TASKS.md` takes no new entries); `TASK-INBOX.md` and `weekly-review.md` retired
- `atomic-commit.md` rewritten: simple and complex paths, checkboxes riding with content, no task IDs in subjects, a
  footer table that mirrors the commit-msg hook; pull request bodies without hard wraps
- DEVELOPMENT-RULES 2.17: pointer fields updated at every stop and the notes at handoff, handoffs at natural
  boundaries instead of token thresholds, discovered work routed by concern
- Retired: `sync-with-arc-framework.md`, `maintain-docs.md`, and the Gemini, Warp and Copilot agent files

## Implementation Highlights

- Adapted, not vendored: arc-framework's routine depends on its `arc` CLI, so each piece (from `a49ebba40`) is
  rewritten as prose the agent follows
- The first drain and three errands (PRs #16-#18) ran the new routes end to end; the drain exposed a missing class
  (local-only work), now part of the inbox workflow
- Errand state changes too often for a tracked list, so errands wait in the gitignored inbox until they run
- Kept until migration on purpose: the stacked-branch documentation (overridden in working memory), document version
  headers (no longer bumped or recited), and `manage-incidental-work.md` (its successor needs the CLI)
- Reviewed at both ends: an independent task-list review and fix check before execution, and an independent
  verification pass and fix check at the end, every finding settled with the Owner

## Related Documentation

- Tasks: `tasks-process-port-routine.md`
- ADR-021: capture in a personal inbox

## Follow-Up Work

- Parallel sessions (T0/T1): worktree sessions with a test-only backend stack each, as their own work unit
- In the inbox: harness hygiene (held, machine-local), a route for the archive step onto a protected `main`, and the
  `.arc/` references in backend code
- Migration pass: stacking documentation, document versioning, the incidental-work workflow, and the process ADRs and
  strategies that sit among the project's documents
