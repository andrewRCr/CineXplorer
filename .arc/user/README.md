# Personal Workspace

Each developer has a gitignored folder here, `user/{identity}/`, for working files that don't belong in the shared
repository. Only this README is tracked.

## Layout

```text
user/
├── README.md                  # This file (tracked)
└── {identity}/                # One developer's workspace (gitignored)
    └── {name}/                # One work unit, named like its task list (`tasks-{name}.md`)
        ├── REVIEW-LOG.md      # Review passes before the task list exists
        └── adversarial-review/  # Kept versions, prompts and reports for each review pass
```

A work unit's folder is created at its first review (usually the PRD's) and deleted when the work unit is archived.
The durable review record is the task list's `## Review Log`; task generation copies `REVIEW-LOG.md` into it.

Nothing here is a source of truth for project decisions: those live in the PRD, the task list and the ADRs.
