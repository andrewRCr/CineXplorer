# Workflow: Session Handoff

**Purpose**: Leave the next session what it cannot get from git, the task list or the tracked documents, and keep
working memory current.

**When to use**: When the Owner asks for a handoff (`/handoff` in Claude Code): at a natural stopping point, when the
session's quality is slipping, or when context runs low at a boundary. Between boundaries, compaction and the recovery
hook carry the session instead
([DEVELOPMENT-RULES § Session Context Management](../../constitution/DEVELOPMENT-RULES.md#session-context-management)).

Committing complete work first is recommended, and the Owner's call ([atomic-commit.md](atomic-commit.md)). Partial
work stays uncommitted and is described in the notes.

Session state lives in the gitignored personal workspace ([README](../../../user/README.md)): the work unit's
`SESSION-NOTES.md` in this checkout, and `WORKING-MEMORY.md` in the main checkout.

## 1. Check the actual state

```bash
git status --short
git log --oneline <Commit at Handoff>..HEAD    # main..HEAD while the notes say [none yet]
```

Read the task list's checkboxes too. Write only what these confirm.

## 2. Active work unit: write the session notes

File: `.arc/user/{identity}/{name}/SESSION-NOTES.md` in this checkout; create it from the skeleton below if it is
missing.

- **Pointer fields:** the agent keeps them current at every task and phase stop; confirm each against step 1.
- **Commit at Handoff:** `git rev-parse --short HEAD`.
- **Sections:** replace all three whole; never append to the previous handoff's text.

**Filter.** First drop anything the commits listed in step 1 already show. Then keep an item only if all three hold:

1. **Not in a tracked source:** the task list, PRD, strategies, ADRs, plan documents and commit messages are
   authoritative; a copy here drifts.
2. **Acted on at the next start:** it changes what the next session does or checks first, not a retrospective note.
3. **Costly if missing:** re-deriving it from tracked state takes real time or risks a wrong turn.

An empty section reads `[none]`, which is the common case.

- **Uncommitted Work:** what only `git diff` shows, at commit-level detail so the next session can make the commits:
  one bullet per future commit, with its task, what changed and which files; incidental work on its own bullet.
    - ✅ Task 3.2: email validation on the user model (`models.py`, `validators.py`), RFC 5322 pattern
    - ❌ "Worked on authentication" (no files, no commit boundary)
- **Remaining Work Before Returning to Task List:** off-task-list work with a known path back: every step, ending with
  the task to return to. If the path is unknown: "Path unclear — will return to Task X.Y when resolved."
- **Additional Context:** debugging insights, decisions not yet in a tracked document, things tried and ruled out, or
  a mid-task stop's concrete next step. Record an Owner direction with the subject it answered, so the next session
  does not read it as standing policy for other work.

**Skeleton:**

```markdown
# Session Notes: {name}

**State:** executing
**Branch:** `{type}/{name}`
**Task List:** `tasks-{name}.md`
**Next Task:** {X.Y title}
**Last Completed:** {X.Y title}
**Blockers:** [none]
**Next Action:** {one line}
**Commit at Handoff:** `{short-hash}`

## Uncommitted Work

## Remaining Work Before Returning to Task List

## Additional Context
```

State is `planning`, `executing`, `completing` (verification through merge) or `blocked`. `Commit at Handoff` reads
`[none yet]` until the first handoff.

## 3. Between work units

There are no session notes. Report anything `git status` shows. A next step worth keeping becomes a proposed
working-memory entry (step 4).

## 4. Working memory

File: the main checkout's `.arc/user/{identity}/WORKING-MEMORY.md`. Create it with a `# Working Memory` heading if it
is missing.

- **Prune:** remove each entry whose `_Remove when:_` trigger has fired, or whose content a tracked document now
  carries. Name every removal in the report.
- **Propose:** context that spans work units and passes the same filter, each entry with a concrete removal trigger.
  An addition lands only on the Owner's approval; asking for the handoff does not approve it.
    - Passes: a constraint to watch until something lands; an Owner direction for later work that no tracked
      document holds yet; a pointer to parked uncommitted work.
    - Fails: anything a strategy, `DEVELOPMENT-RULES.md`, a plan or a task list already says.

**Entry shape:**

```markdown
**Short header naming the constraint or tradeoff:**
_Remove when: {an observable event, such as a work unit merging}._

What to watch for or work around, and why.
```

## 5. Report

- What is committed, what is left uncommitted, and the next action
- The broader checks not yet run for the work so far (for example the full backend suite, left to CI)
- Working-memory removals made, and additions proposed for approval

The notes describe where the work stands, not the session's history.
