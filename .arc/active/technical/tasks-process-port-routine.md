# Technical: Process Port, Session and Commit Routine

**PRD:** none — scope in the Stage 1 assessment and the resume plan's Stage 1 (both kept outside the repository)
**Created:** 2026-10-30
**Branch:** `technical/process-port-routine`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Bring current ARC's daily routine into the legacy process: session notes a resume can trust, a place to
capture discovered work so it is neither dropped nor committed under the wrong concern, a written shape for small
fixes outside a work unit, and commits that keep each task's checkboxes with its work.

Adapted from arc-framework at `a49ebba40`, the snapshot the review port vendored: `session-loop.md`, the notes filter
in `session-handoff.md`, `prepare-commits.md`, the `arc-inbox`, `arc-housekeep` and `arc-errand` skills, the `user/`
templates and the workspace rules in `strategy-session-operations.md`. Those depend on the `arc` CLI, so each is
rewritten as prose the agent follows rather than vendored.

## Scope

### Will Do

- Session state moves to the gitignored personal workspace, `.arc/user/{identity}/`:
    - `{name}/SESSION-NOTES.md`, one per work unit, in the checkout that runs it: seven pointer fields (State, Branch,
      Task List, Next Task, Last Completed, Blockers, Next Action), then Commit at Handoff, Uncommitted Work,
      Remaining Work and Additional Context, in the format pinned under Implementation Notes
    - `WORKING-MEMORY.md` and `USER-INBOX.md`, flat, in the main checkout only; a linked worktree reads and writes the
      main checkout's copies
    - `{identity}` is the one folder under the main checkout's `.arc/user/`; none or several is reported, never
      guessed
    - Between work units there are no session notes: orientation comes from git, the inbox and working memory
- Cadence: the agent updates the pointer fields at every task and phase stop; the notes sections are written only at
  handoff, replaced whole; working memory is read at every session start, its entries proposed, added on approval and
  pruned at each handoff
- Session start orients from the notes, working memory and git (`branch · clean/dirty`, commits since the handoff, one
  next action, `Proceed?`) without reciting versions or the documents read
- Session guidance: hand off at natural boundaries, compact and recover between them; no token thresholds
- `CURRENT-SESSION.md` retires, along with its references, its use in the compaction-recovery hook and in the
  gitignored commands
- Errands: one bounded concern outside the current work unit, on its own branch from `origin/main`, through a PR
- Discovered work: a concern of the current work is fixed inline; for a different bounded concern the agent proposes
  and the Owner chooses between running it now as an errand and capturing it in `USER-INBOX.md`; a different
  multi-step concern becomes an incidental task list (its own work unit, per `manage-incidental-work.md`), started now
  only if the Owner pauses the current work, otherwise captured
- A drain routes captures to tracked homes after the Owner approves and lands them in one PR; the weekly review folds
  into it as an optional backlog pass between work units
- `TASK-INBOX.md` and `weekly-review.md` retire; a short new ADR supersedes that part of ADR-014
- Commits: a simple and a complex path; task checkboxes ride with their content commit; no task IDs in subjects; PR
  bodies without hard wraps

### Won't Do

- Parallel sessions in worktrees with a test-only stack: their own work unit, after this one
- Harness hygiene (stale local agents, commands and allow rules): a machine-local errand after this work unit
- Moving process ADRs, process strategies and process rules out of the project's documentation: a pass at migration
- `sync-with-arc-framework.md` beyond deleting it
- Skill wrappers, inbox reminder flags, carrying session notes between machines, a separate recover workflow (the hook
  covers it)
- A PROJECT-STATUS refresh (captured at the first drain)

## Tasks

### **Phase 1:** Sessions start from accurate state and hand off cleanly

- [x] **1.1 Personal-workspace layout, and this work unit's notes**
    - `.arc/user/README.md`: layout adds `{name}/SESSION-NOTES.md` and the flat `WORKING-MEMORY.md` and
      `USER-INBOX.md`; new § Identity (read from the main checkout) and § Who writes what, and when (notes created at
      activation or with an incidental task list, deleted with the folder at archive)
    - Seeded `.arc/user/andrew/process-port-routine/SESSION-NOTES.md` (gitignored) in the pinned format, with
      `Commit at Handoff` `[none yet]`; the agent updates it from here. `CURRENT-SESSION.md` keeps a valid Branch line
      and points at the notes until Task 1.2.c lands

- [x] **1.2 Recovery hook reads the session notes** (tests first, then the change)

    - [x] **1.2.a Write `compaction-recovery.test.mjs` and see it fail**
        - Beside the hook, `node --test .arc/reference/harness-hooks/compaction-recovery.test.mjs`, no dependencies;
          fixture repositories in a temp directory, isolated from the developer's git configuration
        - Ten tests for the nine cases (no identity and several identities tested separately); all ten failed on
          their assertions against the old hook

    - [x] **1.2.b Change the hook**
        - Reads `.arc/user/{identity}/{name}/SESSION-NOTES.md` in the pinned format; identity and the flat files from
          the main checkout (`--git-common-dir`); task list by filename under `.arc/active/*/`
        - Re-read list: notes, working memory, `DEVELOPMENT-RULES.md`, `3_process-task-loop.md`, task list; live state
          adds the work unit, an identity problem, commits since the handoff (or "No handoff recorded") and the inbox
        - Mismatch compares the first backticked token of the Branch field; dotfiles-ai unchanged

    - [x] **1.2.c Tests should now PASS**: 10 of 10; `node --check` clean; the live hook here reads this work unit's
      notes, and the Codex arm-then-claim path injects once

- [x] **1.3 Rewrite `session-init.md`**
    - Five steps: locate (checkout, identity, work unit from the branch); read the notes, working memory always, and
      the task list's overview and next task; read the core documents without reciting them; compare with git; orient
      in one block ending `Proceed?`
    - Commits since `Commit at Handoff` are expected; `[none yet]` reads as no handoff recorded; a task list without
      notes orients from the task list and git; a real mismatch stops and asks
    - Dropped: the version and hash recital, the documents-read confirmation, the line-number requirement, the venv
      check

- [ ] **1.4 Rewrite `session-handoff.md`**
    - Active work unit: update the pointer fields and `Commit at Handoff` (`git rev-parse --short HEAD`); replace the
      three sections, first dropping anything `git log <previous Commit at Handoff>..HEAD` already shows, then keeping
      only what passes the filter (not in a tracked source; acted on at the next start; costly if missing); `[none]`
      when empty; Uncommitted Work at commit-level detail; an Owner direction recorded with the subject it answered
    - Between work units: no notes file; a next step worth keeping becomes a proposed working-memory entry
    - Both: remove working-memory entries whose `_Remove when:_` trigger has fired or whose content a tracked document
      now carries; propose additions (they land on approval; invoking the handoff does not approve them); report
    - Holds the pinned notes skeleton verbatim and the working-memory entry shape

- [ ] **1.5 Rules and agent guidance**
    - `DEVELOPMENT-RULES.md` § Session Documentation Control: the cadence rule replaces "never update without
      instruction"; § Session Context Management: arc-framework's session-loop guidance (hand off at natural
      boundaries or when quality degrades, compact and recover between boundaries, context monitoring is the
      Owner's); the markdownlint line matches `.markdownlint-cli2.jsonc` (exclusions come from its `ignores` list:
      the archive, the personal workspace, the root README)
    - Version 2.17 with a new hash, updated wherever the version or hash is cited, `agent/copilot-instructions.md`
      included; later edits in this work unit stay under 2.17
    - `3_process-task-loop.md` completion protocol: each stop updates the notes' pointer fields
    - `agent/CLAUDE.md` § Context Window Management: thresholds removed, pointing to the rule

- [ ] **1.6 Retire `CURRENT-SESSION.md`**

    - [ ] **1.6.a Update tracked references**
        - `QUICK-REFERENCE.md` (takes the startup table and the path notes), `agent/AGENTS.md`, `agent/CLAUDE.md`,
          `agent/GEMINI.md`, `agent/WARP.md`, `methods/README.md` glossary, `strategy-work-organization.md`,
          `activate-work-unit.md` (creates the notes file in the pinned format), `atomic-commit.md`, `maintain-docs.md`,
          `maintain-task-notes.md`, `manage-incidental-work.md`
        - ADR-013 and ADR-014 stay as written (immutable)

    - [ ] **1.6.b Delete `sync-with-arc-framework.md`** (nothing links to it)

    - [ ] **1.6.c Gitignored commands**: the `.claude/commands/` and `.codex/prompts/` copies of `handoff.md` and
      `resume-current.md` name the new files; check both copies of `atomic-commit.md` and
      `.claude/commands/autonomous-work.md`

    - [ ] **1.6.d Move the remaining live content, then delete the file**
        - Proposed working-memory entries: the standing follow-ups (harness hygiene, the parked email task) and the
          Owner's direction "Branch every work unit from `main`; no stacking", removed when migration replaces the
          work-organization strategy
        - Delete `CURRENT-SESSION.md` and its `.gitignore` entry

    - [ ] **1.6.e Check**
        - `git grep -n CURRENT-SESSION` hits only `.arc/reference/archive/`, the two ADRs, this task list and
          `weekly-review.md` (deleted in Task 3.3)
        - `grep -rn CURRENT-SESSION .claude .codex` hits only `.claude/settings.local.json` (stale allow rules, left
          to the harness-hygiene errand)
        - Markdown lint and the link check clean

### **Phase 2:** Small fixes outside a work unit run as errands

- [ ] **2.1 Write `supplemental/run-errand.md`**
    - When: one bounded concern outside the current work unit (an atomic task, an inbox errand, an Owner request). A
      concern of the current work unit is fixed inline; one needing a recorded design or a multi-session plan is a
      work unit
    - Where: in place on the main checkout when it is clean (needed when checks use the Docker stack); otherwise a
      linked worktree from `origin/main`. Never on a work-unit branch, never from a dirty checkout
    - Steps: fetch; branch `{type}/{name}` from `origin/main`; change; checks for the touched area; commit
      (`atomic-commit.md`, Context `{category} (atomic / no associated task list)`); an atomic task's archive entry
      in the same PR; PR text per `pull-request-format` (a drain's PR per `user-inbox.md`), shown first; a
      recommended review route, the Owner's choice; dispositions per `agent-pre-merge-review.md`; `ci-ok` green;
      merge on explicit approval with `gh pr merge N --merge`; delete the branch locally and remotely; return to the
      previous branch or remove the worktree

- [ ] **2.2 Point existing guidance at errands**
    - `3_process-task-loop.md` § Atomic Task Completion Protocol: atomic tasks run as errands; its archive step and
      Context footer stay
    - `atomic-commit.md` § Planned Work Branch Practices: "no separate branches" removed; same-work-unit fixes stay
      on its branch, errands get their own
    - `strategy-work-organization.md`: the statements that atomic work never gets a branch, including the
      "Don't: Create Branches for All Incidental Work" example (its `fix/` branch is now the errand shape)
    - `methods/README.md`: the glossary's Errand row (one bounded concern outside the current work unit, run per
      `run-errand.md`; an atomic task is one source) and the link map's `run-errand` row
      (`../workflows/supplemental/run-errand.md`); the same two statements in the CineXplorer adaptations of
      `classify-work-unit.md` and `pull-request-format.md`
    - Markdown lint and the link check clean

### **Phase 3:** Discovered work is captured or routed, never dropped

- [ ] **3.1 Write `supplemental/user-inbox.md`** (invoked by name: "inbox" to capture, "housekeep" to drain)

    - [ ] **3.1.a Capture**
        - The call, per the routing in Scope: inline, errand now, incidental task list now, or capture
        - Sections `## Errand` and `## Work Unit`; entry shape: H3 `[ ]` with a bold title, then `_Observation:_`,
          optional `_Approach:_`, `_Captured during:_`; Work Unit entries add `_Target:_` (a backlog document, an
          active task list, or `TBD`)
        - Writes go to the main checkout's file; re-read immediately before writing and write once, never from an
          earlier read; other entries left in place

    - [ ] **3.1.b Drain**
        - When: between work units, or on request
        - Each entry gets a class and a home: an errand runs now or becomes an atomic task; a work-unit entry goes to
          an existing backlog document or a new one; an entry targeting an active task list stays in the inbox for
          that work unit's session, and the drain says so; an entry the Owner chooses to keep (local-only work, or not
          yet) stays with a `_Hold:_` reason, never at the agent's suggestion
        - One table (entry, class, home, change) with a recommendation per row; nothing written before approval
        - The tracked changes land as one errand PR whose body names the topics recorded in plain terms, within
          `pull-request-format`'s surface rule (no `.arc/` paths or process vocabulary); drained entries leave the
          inbox once it merges, and stay if it is abandoned
        - Then an optional backlog pass, from `weekly-review.md` steps 2–5: atomic tasks still relevant, backlog
          items ready for a plan or PRD, PROJECT-STATUS still accurate; its changes ride the same PR

- [ ] **3.2 Wire the routing into the rules and the session**
    - `DEVELOPMENT-RULES.md` § Leave It Cleaner: the routing in Scope; a different concern is never written to a
      tracked file on the current branch
    - `3_process-task-loop.md` § Incidental Work Management and `manage-incidental-work.md` agree with it: "stay on
      current branch when atomic task" becomes an errand; task references in incidental commits go in the `Context:`
      footer; creating an incidental task list also creates its session notes in the pinned format
    - `session-init.md`: between work units with inbox entries, offer a drain
    - Create `.arc/user/andrew/USER-INBOX.md`; the harness-hygiene follow-up moves there from working memory
    - Check: a capture made from a linked worktree lands in the main checkout's file

- [ ] **3.3 Retire `TASK-INBOX.md` and `weekly-review.md`**
    - Delete `.arc/backlog/TASK-INBOX.md`; update `PROJECT-STATUS.md`, `strategy-work-organization.md` (its
      backlog-structure section) and `atomic-commit.md`
    - Delete `weekly-review.md`, folded into the drain; `strategy-work-organization.md`'s Weekly Review section and
      its two links point to `user-inbox.md`; the "during weekly review" comments in `BACKLOG-FEATURE.md` and
      `BACKLOG-TECHNICAL.md` say "at the drain"
    - New ADR-021: the personal inbox replaces the shared one and the weekly review folds into its drain, superseding
      that part of ADR-014; ADR-014's status becomes `Accepted; Superseded in part by ADR-021 (inbox and weekly
      review)`; `strategy-adr-methodology.md` and the ADR README list `Superseded in part by ADR-XXX` as a valid state
    - Check: `git grep -n -i -e TASK-INBOX -e 'weekly.review'` hits only `.arc/reference/archive/`, the ADRs and this
      task list; markdown lint and the link check clean

- [ ] **3.4 First drain, landed as an errand**
    - Capture the open follow-ups that have no tracked home: the Vitest 4 upgrade, the frontend container running as
      root, the backend test warnings, stale local branches, the PROJECT-STATUS refresh
    - Run the drain: its table first, nothing written before approval
    - Land the routed entries as one errand PR from a linked worktree per `run-errand.md`, through merge and branch
      deletion

### **Phase 4:** Commits come in reviewable units

- [ ] **4.1 Restructure `atomic-commit.md` into a simple and a complex path**
    - Simple (one task or errand, clear scope): status, stage explicit paths, message, verify
    - Complex (adapted from `prepare-commits.md`): when work accumulated, spans sessions, interleaves tasks, or mixes
      complete and partial work; start from the notes' Uncommitted Work; map changes to tasks; update the task list;
      plan by concern (one problem per commit, reversibility as the guard, tangled hunks together and noted); execute
      and verify
    - Task checkboxes ride with their content commit, replacing the separate task-list documentation commit; a task
      whose work lands outside the branch (gitignored files, or an errand PR) is checked off in the next commit, its
      note saying where the work landed
    - The shared-docs pattern stays only for a strategy document edited by several independent code tasks, never in
      a documentation-only work unit, and its subject names the document, not the tasks
    - Subjects name the operation; task IDs go only in the `Context:` footer

- [ ] **4.2 Commit and PR surface elsewhere**
    - `strategy-work-organization.md`: example subjects that carry `(tasks-x.md Task N.N)` move it to the footer
    - Gitignored `commit-format` skills (`.claude/skills/`, `.codex/skills/`) agree on the subject rule
    - `pull-request-format` CineXplorer adaptation: PR bodies without hard wraps (GitHub renders single newlines)
    - Markdown lint and the link check clean

### **Phase 5:** Verification

- [ ] **5.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)

## Implementation Notes

- This branch follows Task 4.1's commit rule from its first commit: checkboxes ride with their content commit, no
  task IDs in subjects, and a task whose work lands outside the branch (gitignored files, or Task 3.4's errand PR) is
  checked off in the next commit, its note saying where the work landed
- Stacking stays documented (ADR-013, `manage-incidental-work.md`, the work-organization and task-list-formatting
  strategies, PROJECT-STATUS) until the migration pass, deliberately; the Owner's direction not to stack lives in
  working memory (Task 1.6.d)
- The link check: every relative link and anchor outside `.arc/reference/archive/` resolves. The checker from the
  review port is kept at `.arc/user/andrew/process-port-routine/linkcheck.py` until this work unit is archived
- Sources, at arc-framework `a49ebba40` (unchanged at `096b63f9d`):
  `.arc/system/workflows/arc/session-lifecycle/{session-loop,session-handoff}.md`,
  `.arc/system/workflows/arc/supplemental/{prepare-commits,drain-inbox}.md`,
  `.arc/system/.internal/skills/{arc-inbox,arc-housekeep,arc-errand}/SKILL.md`,
  `packages/arc-framework/templates/user/{SESSION-NOTES,WORKING-MEMORY,USER-INBOX}.md`, and
  `.arc/reference/strategies/arc/strategy-session-operations.md` § User Workspace Directory through § USER-INBOX
- The current hook reads `CURRENT-SESSION.md`'s fields with a regex (`**Field**: value`, colon outside the bold) and
  compares the whole Branch value, so an annotated value reads as a mismatch
- `.arc/user/` is gitignored: a linked worktree starts without it, so identity and anything flat resolve to the main
  checkout
- `strategy-work-organization.md` (about 1,250 lines) contradicts itself on incidental branches in several places;
  this work changes only its errand, inbox, weekly-review and commit-subject statements, and the rest goes to the
  migration pass
- Errand branches already in use: `fix/` and `chore/` (PRs #10–#13)
- The commit-msg hook warns when a Context task list is not under `.arc/active/`; expected after archiving

### Session-notes format

Tasks 1.1–1.4 and the writers in 1.6.a and 3.2 use this skeleton verbatim. State is `planning`, `executing`,
`completing` (verification through merge) or `blocked`. `Commit at Handoff` holds `git rev-parse --short HEAD` at the
last handoff, or `[none yet]` before the first; with `[none yet]`, session start and the hook report "no handoff
recorded" instead of counting commits, and the handoff's filter uses `git log main..HEAD`. An empty section reads
`[none]`.

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

## Success Criteria

- [ ] `node --test .arc/reference/harness-hooks/compaction-recovery.test.mjs` passes: the hook prints the pointer
  fields of the checkout's own session notes and the commits since the handoff, reports between work units on `main`
  with no notes, reads a linked worktree's own notes with the main checkout's working memory and inbox, and reports
  a missing work unit, notes, handoff or identity instead of guessing
- [ ] A fresh session's resume orients from the session notes, working memory and git alone: `branch · clean/dirty`,
  commits since the handoff, one next action, `Proceed?`, and no version or documents-read recital
- [ ] `git grep -n CURRENT-SESSION` and `git grep -n TASK-INBOX` hit nothing outside `.arc/reference/archive/`, the ADRs
  and this work unit's own documents
- [ ] An item captured from a linked worktree lands in the main checkout's `USER-INBOX.md`, and a drain changes nothing
  until the Owner approves its table
- [ ] One real errand runs end to end as `run-errand.md` describes, from branch to merged PR and deleted branch
- [ ] No commit subject on this branch names a task (`git log main..HEAD --format=%s` has no `Task N` or
  `tasks-` match), and every commit that checks off a task whose changes land on this branch carries those changes

## Review Log

- **2026-10-30 · Task-list review · Pass 1** · fresh read-only subagent · rubric: `task-audit` at full depth
  (grounding and executability) and `source-grounding`, over the scope source and the task list · 7 major, 9 minor ·
  all 16 approved as fixes: F1, F2, F3 and F7 `new-design` (the notes format pinned; the hook checks become a tracked
  `node --test` file; a first drain landed as an errand produces the evidence for criteria 4 and 5; discovered-work
  routing settled), the rest `local-correction`; the F5 fix also added working memory to Success Criterion 2 · about
  15 minutes · stop: fixes landed, fix check approved
- **2026-10-30 · Task-list review · Fix check, round 1 since pass 1** · fresh read-only subagent, scoped to the repairs
  · most repairs hold; one reached past its scope and some interacted · 2 major, 9 minor · all 11 approved as fixes,
  `local-correction`: F1 withdraws "incidental task lists branch from `main`" (stacking stays documented until
  migration, the no-stacking direction lives in working memory); F2 gives incidental work units session notes and a
  hook case; the rest tighten the ADR status, the first-handoff range, the drain's PR text and keep route, and the
  commit rule for work landed off the branch · about 16 minutes · stop: converged; the Owner closed the loop
