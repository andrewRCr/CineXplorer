# Workflow: Session Initialization

**Purpose**: Start a session from accurate state: where the work stands, what changed since the last handoff, and one
next action, then wait for the Owner.

**When to use**: Every session start (`/resume-current` in Claude Code). After a compaction, the recovery hook names
the same documents; re-read what it lists.

Session state lives in the gitignored personal workspace ([README](../../../user/README.md)): the work unit's
`SESSION-NOTES.md` in the checkout that runs it, and `WORKING-MEMORY.md` and `USER-INBOX.md` in the main checkout.

## Errand Entry

When the Owner requests an errand, use [run-errand.md](run-errand.md) or the installed `$errand` skill before
interpreting the home branch as the work to resume. Preserve a paused work unit's notes.

When the local harness is installed, run `node .codex/hooks/legacy-arc/compaction-recovery.mjs errand-status` from
the session home. An active errand selects its `checkoutPath` for all initialization commands and document reads;
follow its errand workflow rather than resuming the home's work unit. A status failure stops initialization until
resolved. With no active errand and no explicit errand request, initialize normally below.

## Steps

### 1. Locate

```bash
git rev-parse --show-toplevel                            # this checkout
git branch --show-current                                # empty when HEAD is detached
git rev-parse --path-format=absolute --git-common-dir    # its parent directory is the main checkout
git status --short
```

- **Checkout:** a linked worktree when the main checkout differs from this one.
- **Identity:** the one folder under the main checkout's `.arc/user/`. None, or more than one: report it and ask.
- **Work unit:** a branch `{type}/{name}` names it, with its task list at `.arc/active/*/tasks-{name}.md`. On `main`
  the session is between work units; a detached HEAD has none.

### 2. Read the session state

- **Session notes**, in full: `.arc/user/{identity}/{name}/SESSION-NOTES.md` in this checkout. A work unit with a task
  list but no notes yet orients from the task list and git; say so.
- **Working memory**, in full, always: the main checkout's `.arc/user/{identity}/WORKING-MEMORY.md`, when it exists.
- **Task list**, the one the notes' Task List names: its Overview and the task Next Task names, plus a scan of its
  checkboxes for the first open task. Read the rest on demand.
- **Inbox**, the main checkout's `.arc/user/{identity}/USER-INBOX.md`: between work units, count the entries in each
  section; in a work unit, find the entries whose `_Target:_` names its task list or PRD.

### 3. Read the core documents

Read in full, and don't recite them back:

1. `.arc/reference/agent/AGENTS.md`
2. `.arc/reference/workflows/3_process-task-loop.md`
3. `.arc/reference/strategies/STRATEGY-INDEX.md`
4. `.arc/reference/constitution/DEVELOPMENT-RULES.md`
5. `.arc/reference/QUICK-REFERENCE.md`
6. The agent's own file, `.arc/reference/agent/{AGENT}.md` (for example `CLAUDE.md`), when one exists

### 4. Compare with git

- **Commits since the handoff:** `git log --oneline <Commit at Handoff>..HEAD`. These are expected: work committed
  after the notes were written. With `[none yet]`, no handoff is recorded yet.
- **Uncommitted files** against the notes' Uncommitted Work.
- **Next Task** against the task list: it is the first open task, or the notes say why not.
- **Branch:** the first backticked value of the notes' Branch field against the checkout's branch.

A real mismatch stops the session start: the notes name another branch, Next Task is already checked off with no
explanation, or the working tree and Uncommitted Work disagree. Report the specifics, ask, and wait. Don't correct
state on your own.

### 5. Orient

Report in one block, then wait for the Owner:

```text
technical/{name} · clean · 3 commits since the handoff (abc1234)
Docker: 5 of 5 containers up (primary)
Next: Task 2.1, write the errand workflow
Proceed?
```

- **First line:** branch, `clean` or `dirty` (with the count of changed files), and the commits since the handoff or
  `no handoff recorded`.
- **Docker:** `docker compose -f infrastructure/docker-compose.yml ps -q | wc -l`, this checkout's own project,
  against its expectation: five on the primary, three in a linked worktree with its test stack up, none without one
  ([worktree-sessions.md](worktree-sessions.md)). Report it, and start the stack only when the next action needs it:
  the full stack on the primary, the test stack in a worktree.
- **Worktrees:** on the primary, name any linked worktree (`git worktree list`) whose branch's pull request has merged
  (`gh pr list --state merged --head {branch}`) as ready to remove
  ([worktree-sessions.md § Removal](worktree-sessions.md#removal)); omit the line when there are none.
- **Next:** one action, from the notes' Next Action. Name any Blockers on their own line.
- **Captured for this work unit:** the titles of the inbox entries that target it, on one line. Adding one to the task
  list is a planning change the Owner approves; the entry then leaves the inbox
  ([user-inbox.md § Finish](user-inbox.md#5-finish)).
- **Between work units:** say so; the next action comes from working memory or the Owner. When `## Work Unit` has
  entries, give the count and offer a drain ([user-inbox.md § Drain](user-inbox.md#drain)). Errands waiting to run
  are reported as a count only (`3 errands waiting`).

Don't recite document versions or rule hashes, or the documents read, and don't start work until the Owner answers.
On approval, work follows [3_process-task-loop.md](../3_process-task-loop.md).
