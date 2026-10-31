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

- [x] **1.4 Rewrite `session-handoff.md`**
    - Five steps (380 lines to 110): check the actual state; active work unit writes the notes (pointer fields
      confirmed, `Commit at Handoff` set, three sections replaced); between work units no notes; working memory pruned
      and additions proposed; report
    - Filter: drop what the commits since the previous handoff show (`main..HEAD` before the first), then the three
      criteria; Owner directions recorded with the subject they answered
    - Holds the pinned skeleton and the working-memory entry shape; the old session-start section, working-directory
      check and line-number rules are gone

- [x] **1.5 Rules and agent guidance**
    - `DEVELOPMENT-RULES.md` § Session Documentation Control: pointer fields at every stop without approval, notes
      sections at handoff, working memory on approval; § Session Context Management: hand off at natural boundaries
      or when quality slips, compact and recover between them, monitoring is the Owner's; the markdownlint line names
      the config's `ignores` list
    - Version 2.17, hash `b8wobidt`; `agent/CLAUDE.md`, `GEMINI.md`, `WARP.md` and `copilot-instructions.md` cite it
    - `3_process-task-loop.md` § Stopping and Proceeding: every stop updates the pointer fields; the per-task
      pre-report checklist has the line
    - `agent/CLAUDE.md` § Context Window Management: thresholds removed; points to the rule and the recovery hook

- [x] **1.6 Retire `CURRENT-SESSION.md`**

    - [x] **1.6.a Update tracked references**
        - `QUICK-REFERENCE.md` (now holds the expected environment; path notes no longer defer to the session file),
          the four agent files, `methods/README.md` glossary, `strategy-work-organization.md` (two lines),
          `activate-work-unit.md` (Step 7 creates the notes from the handoff skeleton), `atomic-commit.md`,
          `maintain-docs.md`, `maintain-task-notes.md`, `manage-incidental-work.md`
        - ADR-013 and ADR-014 stay as written (immutable)

    - [x] **1.6.b Delete `sync-with-arc-framework.md`** (nothing linked to it)

    - [x] **1.6.c Gitignored commands**: the `.claude/commands/` and `.codex/prompts/` copies of `handoff.md` and
      `resume-current.md` name the session notes and working memory; the `atomic-commit.md` copies and
      `autonomous-work.md` needed no change (local files; checked off with the next commit)

    - [x] **1.6.d Move the remaining live content, then delete the file**
        - Working memory (approved): the Owner's no-stacking direction, and the harness-hygiene errand until Task 3.2
          moves it to the inbox. The email task stays out: its task list and the resume plan already hold it
        - Deleted `CURRENT-SESSION.md` (a copy kept outside the repository) and its `.gitignore` entry

    - [x] **1.6.e Check**
        - `git grep -n CURRENT-SESSION` hits only `.arc/reference/archive/`, the two ADRs, this task list and
          `weekly-review.md` (deleted in Task 3.3); among local files only `.claude/settings.local.json`
        - Markdown lint clean; link check clean apart from a placeholder inside a code span in `maintain-docs.md`;
          the hook tests pass

### **Phase 2:** Small fixes outside a work unit run as errands

- [x] **2.1 Write `supplemental/run-errand.md`**
    - When it applies (an atomic task, an inbox errand or an Owner request; inline and work-unit cases excluded; an
      errand that grows stops for the Owner) and where it runs (in place on a clean main checkout when checks need
      Docker, otherwise a linked worktree; never a work-unit branch or a dirty checkout)
    - Six steps: branch `{type}/{name}` from `origin/main`; change and check, an atomic task's archive move riding in
      the same PR; show the diff, message and PR text before committing and opening the PR; a recommended review
      route; merge with `gh pr merge --merge` on approval once `ci-ok` is green; clean up (GitHub deletes the remote
      branch)

- [x] **2.2 Point existing guidance at errands**
    - `3_process-task-loop.md` § Atomic Task Completion Protocol: atomic tasks run as errands, the archive move
      riding in the errand's PR
    - `atomic-commit.md` § Planned Work Branch Practices: "no separate branches" replaced; same-concern fixes stay on
      the work unit's branch, errands get their own
    - `strategy-work-organization.md`: errands added to the work split; the "Don't: Create Branches for All Incidental
      Work" example becomes "Don't: Fold an Unrelated Fix into the Current Branch"; the atomic-task rationale names
      the quarterly archive. Its historical migration notes are left for the migration pass
    - `methods/README.md`: the Errand glossary row and a separate `run-errand` link-map row; the CineXplorer
      adaptations and `[run-errand]` links in `classify-work-unit.md` and `pull-request-format.md` follow
    - Markdown lint and the link check clean

### **Phase 3:** Discovered work is captured or routed, never dropped

- [x] **3.1 Write `supplemental/user-inbox.md`** (invoked by name: "inbox" to capture, "housekeep" to drain)

    - [x] **3.1.a Capture**
        - The call per Leave It Cleaner (inline; errand now or capture, the Owner choosing; incidental task list now
          only if the Owner pauses the current work); sections `## Errand` and `## Work Unit`; the entry shape, Work
          Unit entries adding `_Target:_`; the file template
        - Writes go to the main checkout's file, re-read immediately before one write

    - [x] **3.1.b Drain**
        - Classify with no writes (an errand runs now or waits in the inbox, since `ATOMIC-TASKS.md` takes no new
          entries; backlog document; held for an active task list's session; local only; kept with `_Hold:_` only at
          the Owner's choice); the optional backlog pass from the weekly review; one table with a recommendation per
          row, nothing written before approval
        - Tracked changes land as one errand on a `docs/backlog-{date}` branch, its PR body in plain terms within the
          surface rule; routed entries leave the inbox when it merges, an errand's when that errand merges

- [x] **3.2 Wire the routing into the rules and the session**
    - `DEVELOPMENT-RULES.md` § Leave It Cleaner: a different concern is never written to a tracked file on the current
      branch; bounded runs now as an errand or is captured, multi-step becomes an incidental task list only if the
      Owner pauses the current work, otherwise captured; work for an existing PRD or plan is captured with it as target
    - `3_process-task-loop.md` § Incidental Work Management points at both routes; `manage-incidental-work.md`: a
      bounded fix of another concern is an errand, creating the task list also creates its session notes, task
      references go in the `Context:` footer
    - `session-init.md`: between work units, counts the inbox entries by section; offers a drain when work-unit
      entries wait, and reports waiting errands as a count
    - Created `.arc/user/andrew/USER-INBOX.md` (local); the harness-hygiene item moved there from working memory
    - Check: a capture from a linked worktree (no workspace of its own) landed in the main checkout's inbox; the test
      entry and worktree were removed

- [x] **3.3 Retire `TASK-INBOX.md` and `weekly-review.md`**
    - Deleted both; `PROJECT-STATUS.md`, `atomic-commit.md`, the two `BACKLOG-*.md` comments and
      `strategy-work-organization.md` (backlog tree, file purposes, processing flow, discovery, a Drain section in
      place of Weekly Review, related links) now describe the personal inbox and the drain
    - New ADR-021 (capture in a personal inbox), superseding ADR-014's inbox, weekly review and new atomic tasks
      (errands wait untracked in the inbox); ADR-014's status
      `Accepted; Superseded in part by ADR-021 (inbox, weekly review and new atomic tasks)`; the partial form added to
      `strategy-adr-methodology.md` and the ADR README
    - Check: no `TASK-INBOX` or weekly-review hits outside the archive, the ADRs and this task list; markdown lint and
      the link check clean (apart from the known placeholder)

- [x] **3.4 First drain, landed as an errand**
    - Captured the five follow-ups; the drain's table was approved before any write, with no backlog pass
    - Routed: the Vitest 4 upgrade, the non-root frontend container, the backend test warnings and the PROJECT-STATUS
      refresh became atomic tasks; the four stale local branches (all merged into `main`) were deleted by hand; the
      harness-hygiene errand stays in the inbox with a `_Hold:_`
    - Landed on `main` as errand PR #16 (`docs/backlog-2026-10-30`, merge `efd0dc40`) from a linked worktree, no
      review; the worktree and branches are gone and the drained entries left the inbox
    - Running it found a missing class: work with no tracked change. `user-inbox.md` gained the local-only class

### **Phase 4:** Commits come in reviewable units

- [x] **4.1 Restructure `atomic-commit.md` into a simple and a complex path**
    - Rewritten as plain sections (432 to 239 lines): choose the path; a shared Task Context check (branch, task
      list, quality gates), which keeps the name `DEVELOPMENT-RULES.md` cites; the simple path (review, stage
      explicit paths, confirm the staged stat, commit, verify); the complex path adapted from `prepare-commits.md`
      (start from the notes' Uncommitted Work, map changes to tasks, plan by concern with reversibility as the guard
      and tangled hunks noted, show the plan, execute, leave partial work uncommitted)
    - Task Lists Ride with Content: checkboxes commit with their content; work landed outside the branch is checked
      off in the next commit, or alone, its description saying where it landed; parent completion; atomic tasks
      archive inside their errand. The Documentation Overlap Scenario and the stale atomic-archive step are gone
    - The shared-docs pattern survives only for one strategy document edited by several independent code tasks,
      never for checkboxes or a documentation-only work unit; its subject names the document
    - Message format: the subject names the operation, with no task IDs or task-list names; submission through a
      quoted heredoc. The footer forms are one table that mirrors the hook; the examples were rewritten to follow
      the subject rule, and all nine pass `.githooks/commit-msg`

- [x] **4.2 Commit and PR surface elsewhere**
    - `strategy-work-organization.md`: the thirteen example subjects that carried `(tasks-x.md Task N.N)` now carry
      it in a `Context:` footer (a second `-m`; the four in § Commit Message Patterns became one full message), with
      the scope the hook requires; that section states the rule, and the "Forget Task References" anti-pattern asks
      for the footer. Stacking narrative untouched
    - `pull-request-format.md` § override: bodies carry no hard line wraps, passed with `--body-file`
    - Local, gitignored: both `commit-format` skills (`.claude/skills/`, `.codex/skills/`) gained the subject rule
      and the quoted-heredoc submission; they still differ only in `allowed-tools`
    - Check: no task-referencing example subject left outside the archive; every rewritten subject passes the hook;
      markdown lint clean; the link check finds only the known placeholder plus two links in
      `backend/apps/core/README.md` that predate this branch (raised separately)

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

- [x] `node --test .arc/reference/harness-hooks/compaction-recovery.test.mjs` passes: the hook prints the pointer
  fields of the checkout's own session notes and the commits since the handoff, reports between work units on `main`
  with no notes, reads a linked worktree's own notes with the main checkout's working memory and inbox, and reports
  a missing work unit, notes, handoff or identity instead of guessing
    - 10 of 10 pass (2026-10-30), one case per behaviour listed, each in a temporary repository
- [x] A fresh session's resume orients from the session notes, working memory and git alone: `branch · clean/dirty`,
  commits since the handoff, one next action, `Proceed?`, and no version or documents-read recital
    - A fresh-context agent given only `/resume-current` reported `technical/process-port-routine · clean · no handoff
      recorded`, the Docker line, one Next, the Blockers and `Proceed?`, with no recital. Its trace found two
      unclear instructions in `session-init.md`, both clarified
- [x] `git grep -n CURRENT-SESSION` and `git grep -n TASK-INBOX` hit nothing outside `.arc/reference/archive/`, the ADRs
  and this work unit's own documents
    - Both hit only this task list
- [x] An item captured from a linked worktree lands in the main checkout's `USER-INBOX.md`, and a drain changes nothing
  until the Owner approves its table
    - Task 3.2's check (a capture from a linked worktree reached the main checkout's inbox) and Task 3.4's drain (the
      table approved before any write)
- [x] One real errand runs end to end as `run-errand.md` describes, from branch to merged PR and deleted branch
    - PR #16, and since then #17: each branched from `origin/main` in a linked worktree, merged with `--merge` once
      `ci-ok` passed, its remote branch deleted on merge and its worktree and local branch removed
- [x] No commit subject on this branch names a task (`git log main..HEAD --format=%s` has no `Task N` or
  `tasks-` match), and every commit that checks off a task whose changes land on this branch carries those changes
    - No match across the branch's commits. Every check-off commit carries its task's changes, except where the
      work landed elsewhere and the note says so: 1.6.c (gitignored commands), 1.6.d (working memory and a
      gitignored file) and 3.4 (PR #16)

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
