---
name: errand
description: Run one bounded CineXplorer concern in an isolated worktree while keeping the current conversation and preserving the primary checkout.
---

# Errand

Select errand entry rather than resuming the session home's work unit or reading its session notes.
Use the existing approval boundaries for commits, pull requests, reviews and merges.

From the session home, run `node .codex/hooks/legacy-arc/compaction-recovery.mjs errand-status`.
An active errand resumes at its exact `checkoutPath`. A failed status stops entry until resolved.

With no active errand, identify the requested concern or inbox entry. From the main checkout, run
`node scripts/worktree.mjs create {type}/{name}` to create and provision a fresh branch from `origin/main` in a
linked sibling `{primary}.{name}`, following `.arc/reference/workflows/supplemental/worktree-sessions.md`. Creation
needs Docker running and installs frontend dependencies. Use the sibling location even if the paused primary's
older workflow still names a scratch directory. Keep its tracked files, session notes and containers untouched.

From the session home, activate it with
`node .codex/hooks/legacy-arc/compaction-recovery.mjs errand-enter <absolute-checkout>`.
Direct shell calls to the returned `checkoutPath` using the tool's working-directory argument; use absolute paths
for file operations. A shell `cd` affects only that call. Read and follow `run-errand.md` in the active checkout.

Keep the active selection across approval stops and compaction. Return explicitly from the session home with
`node .codex/hooks/legacy-arc/compaction-recovery.mjs errand-return` before removing a finished worktree.
Removal and inbox changes follow the workflow; entry grants no approval to merge or start a second concern.
