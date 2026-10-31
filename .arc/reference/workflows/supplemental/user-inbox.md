# Workflow: User Inbox

**Purpose**: Capture discovered work so it is neither dropped nor committed under the wrong concern. Errands wait here
until they run; work-unit entries move to a tracked home in one reviewed pull request.

**Invoked by name**: "inbox" captures an item; "housekeep" drains the inbox.

**File**: the main checkout's `.arc/user/{identity}/USER-INBOX.md` (gitignored; see the
[personal workspace README](../../../user/README.md)). From a linked worktree, write the main checkout's copy: the
parent of `git rev-parse --path-format=absolute --git-common-dir`. If the file is missing, create it from this
template:

```markdown
# User Inbox

> _Captured work to route later. See `.arc/reference/workflows/supplemental/user-inbox.md`._

## Errand

## Work Unit
```

## Capture

### 1. Make the call

Follow [DEVELOPMENT-RULES § Leave It Cleaner](../../constitution/DEVELOPMENT-RULES.md#leave-it-cleaner-pre-existing-issue-protocol):

- **A concern of the current work:** fix it inline; it is not captured.
- **A different, bounded concern:** propose running it now as an errand ([run-errand.md](run-errand.md)) or capturing
  it; the Owner chooses.
- **A different, multi-step concern:** an incidental task list ([manage-incidental-work.md](manage-incidental-work.md)),
  started now only if the Owner pauses the current work; otherwise capture it.

A different concern is never written into a tracked file on the current branch.

### 2. Pick the section

- **`## Errand`:** one self-contained concern, no design to record, done within one session.
- **`## Work Unit`:** needs a design worth recording, or a plan that spans sessions.

### 3. Write the entry

```markdown
### `[ ]` **Short imperative title**

- _Observation:_ what surfaced, and why it matters.
- _Approach:_ the likely fix (optional).
- _Captured during:_ the work in hand.
```

A Work Unit entry adds `- _Target:_` with its candidate home: a backlog document, an active task list, or `TBD`.

**Write safely.** Re-read the file immediately before writing, and write once from that read: one edit, or one
replacement of the whole file. Never write from an earlier read, since another session may have added entries since.
Leave other entries in place.

## Drain

**When:** between work units (session start offers it when `## Work Unit` has entries), or when the Owner asks. The
routed changes land through an errand, so the drain needs a clean main checkout or a linked worktree.

### 1. Classify, writing nothing

Give each entry a class and a home:

- **Errand:** run it now as its own errand, or leave it in `## Errand` until it runs. An errand's state changes too
  often for a tracked list, so `.arc/active/ATOMIC-TASKS.md` takes no new entries.
- **Work unit:** add it to an existing backlog document in `.arc/backlog/` (a plan, a PRD, or the `BACKLOG-*.md`
  bucket), or start a new plan file there.
- **Targets an active task list:** it stays in the inbox. That work unit's session start lists it, and the Owner
  decides when it joins the task list; the drain cannot write another work unit's branch. Say so in the table.
- **Local only** (no tracked change, such as cleaning up local branches): done now by hand if the Owner wants,
  otherwise kept.
- **Kept:** an entry the Owner chooses to keep (work that stays on this machine, or not yet) stays with a
  `- _Hold:_` reason. This is never the agent's suggestion.

### 2. Offer the backlog pass

Ask whether to add an optional backlog pass, and if so add its rows to the same plan:

- Atomic tasks: still relevant, or deleted, or grown into a task list?
- Backlog items: any ready for a plan or a PRD?
- PROJECT-STATUS: still accurate?

### 3. Present one table

| Entry | Class | Home | Change |
| ----- | ----- | ---- | ------ |

Give a recommendation for each row. Nothing is written before the Owner approves the table, and the Owner can change
any row.

### 4. Route

On approval, land every tracked change, if there is any, as one errand ([run-errand.md](run-errand.md)), on a
`docs/backlog-{date}` branch with Context `planning (atomic / no associated task list)`. The pull request follows
[pull-request-format](../../methods/pull-request-format.md)'s surface rule: its body names the topics recorded in
plain terms, without `.arc/` paths or process vocabulary. Entries chosen to run now run as their own errands, one
concern each.

### 5. Finish

When the pull request merges, remove the entries it routed (re-read, then write once); if it is abandoned, they stay.
An errand's entry leaves when that errand merges, and an entry that targets an active task list leaves when the Owner
approves adding it there. Report what went where, and what stays in the inbox and why.
