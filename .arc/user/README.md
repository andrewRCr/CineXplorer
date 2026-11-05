# Personal Workspace

Each developer has a gitignored folder here, `user/{identity}/`, for working files that don't belong in the shared
repository. Only this README is tracked.

## Layout

```text
user/
├── README.md                    # This file (tracked)
└── {identity}/                  # One developer's workspace (gitignored)
    ├── WORKING-MEMORY.md        # Context that spans work units (main checkout only)
    ├── USER-INBOX.md            # Captured work to route later (main checkout only)
    └── {name}/                  # One work unit, named like its task list (`tasks-{name}.md`)
        ├── SESSION-NOTES.md     # Where the work stands, for the next session
        ├── REVIEW-LOG.md        # Review passes before the task list exists
        └── adversarial-review/  # Kept versions, prompts and reports for each review pass
```

## Identity

`{identity}` is the one folder under the main checkout's `.arc/user/`. A linked worktree starts without one, since the
folder is gitignored, so identity is always read from the main checkout, whose `.git` directory
`git rev-parse --path-format=absolute --git-common-dir` names. No folder there, or more than one, is reported, never
guessed.

## Who writes what, and when

- **`{name}/SESSION-NOTES.md`**, in the checkout that runs the work unit: created by `create --work-unit`
  (`worktree-sessions.md`), at activation for a work unit run in place (`activate-work-unit.md`), or when its
  incidental task list is created (`manage-incidental-work.md`). The agent updates its pointer fields at every task and
  phase stop; the handoff (`session-handoff.md`) replaces its sections. Session start (`session-init.md`) and the
  compaction-recovery hook read it.
- **`WORKING-MEMORY.md`**: an entry is proposed when it arises and added on the Owner's approval; each carries a
  `_Remove when:_` trigger. Read at every session start; pruned at each handoff.
- **`USER-INBOX.md`**: written at capture (`user-inbox.md`), from any branch or checkout. The drain between work
  units moves work-unit entries to tracked homes; an errand's entry stays until that errand merges.
- **`REVIEW-LOG.md`** and **`adversarial-review/`**: written by each review pass. The durable review record is the
  task list's `## Review Log`; task generation copies `REVIEW-LOG.md` into it.

A work unit's folder is created with its session notes, or at its first review if that comes first, and deleted when
the work unit is archived. `WORKING-MEMORY.md` and `USER-INBOX.md` persist across work units; a linked worktree reads
and writes the main checkout's copies.

Nothing here is a source of truth for project decisions: those live in the PRD, the task list and the ADRs.
