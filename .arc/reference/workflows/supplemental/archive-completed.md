# Workflow: Archive Completed Work

Move completed work documentation to structured archive to keep the active workspace clean while preserving
history and context.

**Archive Timing:**

Task lists are archived **immediately when their corresponding git branch is deleted** (which occurs after merge
completion). This creates conceptual coherence:

- Branch exists ↔ Task list in `.arc/active/`
- Branch deleted → Task list archived to `.arc/reference/archive/`

See [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for complete rationale.

## Workflow Overview

**All work follows the same archival workflow**, regardless of category (feature/technical/incidental):

1. **Phase 1: On Child Branch** - Verify the work, clean docs, create completion metadata
2. **Phase 2: Code Review & Merge** - Code review, alignment re-check, PR, PR review, merge to parent
3. **Phase 3: On Parent Branch** - Prove post-merge criteria, finish the worktree (archive and commit), push

**Key principle:** Documentation cleanup and completion metadata are part of the child branch deliverable,
not a post-merge activity. This ensures PR reviewers see clean, well-organized docs.

---

## Phase 1: On Child Branch (Before PR)

**Context:** You're on the child branch where work was completed (e.g., `incidental/chakra-recipe-system`).

### 1) Verify the Work

The task list's verification phase points here. Verification asks whether the work meets its Success Criteria; code
review (§ 5) asks whether the code is sound. They are separate passes with separate rubrics, and neither stands in
for the other.

**Preconditions:**

- [ ] Every task before the verification phase is `[x]`, or `[~]` with its reason (the verification task itself
  stays open until this section's checks are done)
- [ ] PRD Open Questions are empty (a brief has none), and any design change went through
  [1_create-prd.md § Amending a PRD](../1_create-prd.md#amending-a-prd)

**Run the gates.** Run the verification run: the full command set once locally
([DEVELOPMENT-RULES § Quality Gates](../../constitution/DEVELOPMENT-RULES.md#quality-gates)), and report its results;
CI runs it again on the pull request. A checked task box is not a passed gate; only a run is.

**Author criteria walk.** Run [verification-review](../../methods/verification-review.md), which starts with
[validate-criteria](../../methods/validate-criteria.md) over the whole work unit: the task list's Success Criteria, the
complete diff from the base branch (`git diff {base-branch}...HEAD` plus uncommitted changes), and the resulting tree.
Check each criterion against evidence, running its check where it has one, and mark it:

- `[x]` met, with the evidence in a short note
- `[~]` superseded by an amendment, with a note naming it (the replacement criterion is checked in its own right)
- `[ ]` not met: stop and end the report with `Criterion not met: <details>. Fix now or amend?` A fix lands as a task
  under the verification phase; an amendment goes through the PRD

Never reword a criterion so the work meets it, and never mark one from task checkboxes.

**Independent pass.** Then recommend one fresh-context [adversarial-review](../../methods/adversarial-review.md) over
the same scope, as verification-review's independent companion describes; the Owner decides. The reviewer gets the PRD,
the task list with its criterion marks removed, and the diff, never the author's walk. Each finding names the criterion
it fails. Check every finding against source, present the complete set as a
[disposition-report](../../methods/disposition-report.md), and edit nothing until the Owner approves it. After the
approved fixes land, offer a fix check; take any further pass only with approval. The `Class` sets the pass cap (`Light`
1, `Heavy` 2, `Novel` 3); a pass past it runs only on the Owner's approval, shown `(over limit)`. The loop ends at one
of adversarial-review's stop reasons: it converges, reaches the cap, or the Owner stops it or accepts a re-entry. Record
each pass in the work unit's `REVIEW-LOG.md`.

**Then:**

- [ ] Implementation works in the development environment, including any criterion that must be proven live
- [ ] Each ADR the work adds or amends is in the change, including every one the PRD lists. Each new ADR's body, and
  each amendment's added text, stands without planning history
  ([strategy-adr-methodology](../../strategies/arc/strategy-adr-methodology.md#reader-independence)). Each new ADR,
  and any `Proposed` one the work accepts, is set to `Accepted (YYYY-MM-DD)`, dated the day of the flip; it stays
  editable until the merge
- [ ] Task list header `**Status:**` updated to `Complete`, and the PRD's `**Status:**` likewise (if a PRD exists)
- [ ] The verification task is marked `[x]`, its note pointing to the criteria evidence

**Note:** Not all work has PRDs. Incidental work typically has only task lists. Skip PRD items if no PRD.

### 1b) Generated Code Sync Check (If Applicable)

**If backend API files were modified** (`api.py`, `schemas.py`), regenerate frontend types before archiving:

```bash
# Check if API files changed on this branch
git diff main --name-only | grep -E "backend/apps/.*/(api|schemas)\.py|backend/config/api\.py"

# If any matches, regenerate types (exports from this checkout's own backend container)
npm run generate-types --prefix frontend

# Check for uncommitted type changes
git diff --exit-code frontend/openapi.json frontend/src/types/api.ts
```

**If diff shows changes:** Commit them before proceeding. CI may fail if generated files drift from source.

**Why this step:** CI typically regenerates from source and compares against committed files. Local checks
may pass with stale generated files, but CI catches the drift.

### 2) Clean Up Documentation (MANDATORY)

**Run [maintain-task-notes.md](maintain-task-notes.md) workflow in Mode 2 (Archival Preparation):**

This step prepares task file and evaluates notes file for archival:

- **Task file cleanup**: Remove temporal junk, excessive repetition, forward pointers while preserving detailed
  sub-task record
- **Notes file evaluation**: Determine if notes are archival-worthy or disposable scratchpad work
- **Notes file preparation** (if keeping): Add table of contents, clean section headers, remove temporal markers, consolidate
- **Cross-reference updates**: Update status metadata, add completion dates, clean pointers
- **Quality checks**: Run markdown linting, verify no accidental task edits

**Expected outcome:** Task file is clean detailed record (temporal markers removed, repetition eliminated, detailed
granularity preserved). Notes file is evaluated for archival worthiness (may be deleted if just scratchpad work).
Completion doc will contain executive summary.

**Note on notes files:** Not all work has archival-worthy notes. The maintain-task-notes workflow (Step 1d) includes
evaluation criteria. If notes are just implementation scratchpad work with no future reference value, delete the
notes file entirely rather than archiving it.

**Time estimate:** 20-40 minutes

**Do not skip this step** - Archives without this cleanup are difficult to use 6 months later.

### 3) Create Completion Metadata

**All work gets a completion document** (feature, technical, AND incidental).

Create `completion-{name}.md` in the same directory as the task list:

**For planned work (feature/technical):**

```bash
# Create in active directory alongside PRD and tasks
# Example: .arc/active/feature/completion-user-authentication.md
```

**For incidental work:**

```bash
# Create in active incidental directory alongside tasks
# Example: .arc/active/incidental/completion-chakra-recipe-system.md
```

**Template (identical for all work categories):**

```markdown
# Completion: {Work Name}

**Completed**: YYYY-MM-DD
**Branch**: {branch-name}
**Category**: {Feature | Technical | Incidental}
**Context**: {One-liner: "Discovered during X" or "Part of roadmap initiative Y"}

## Summary

{2-3 sentences: What was accomplished and why it matters}

## Key Deliverables

{Concrete outputs - components, capabilities, test coverage areas}
{Focus on the important stuff, not exhaustive inventory}
{Avoid volatile metrics (test counts, version numbers) - they become stale}

- {Component or capability}
- {Another deliverable}

## Implementation Highlights

{Notable technical details worth remembering}

- {Major decision or pattern established}
- {Significant challenge overcome}
- {Anything useful for similar future work}

## Related Documentation

- {For planned work: Draft: `draft-{name}.md` (if exists)}
- {For planned work: PRD: `prd-{name}.md`}
- Tasks: `tasks-{name}.md`
- Notes: `notes-{name}.md` (if exists)

## {For planned work only: Incidental Work Completed}

{List any incidental task lists completed during this work}

- `tasks-{name}.md` - {brief description}

## Follow-Up Work

{Any deferred items or future considerations - ONLY items still deferred at task end}
```

---

**Required Reading Before Drafting**

The completion doc must be accurate because it's used for PRs. Before writing:

1. **Task list overview** (first ~100 lines) - Scope, context, what was planned
2. **Final phase(s)** of task list - Actual completion state, follow-up work status
3. **CLEANUP-PROGRESS data** (for large files) - Metrics collected during cleanup
4. **Git log** for final commit hash - `git log -1 --oneline`

---

**Verification Checklist (MANDATORY)**

Before considering the completion doc done, verify EVERY claim:

- [ ] **Completed date**: Verified (matches task list header)
- [ ] **Phase count**: Matches actual phases in task file - `grep -c "^###.*Phase" tasks-*.md`
- [ ] **Quantitative claims**: Each number verified in task file
      - Where does "7 themes" come from? → Phase X, line Y
      - Where does "50+ components" come from? → Phase X, line Y
- [ ] **Follow-up work**: Reflects FINAL phase state
      - Check: Did any "deferred" items get completed in later phases?
      - Only list what's ACTUALLY still deferred at task end
- [ ] **No stale references**: No mentions of deleted notes file (if deleted), etc
- [ ] **All major phases represented**: Check CLEANUP-PROGRESS data includes all phases

**Evidence format:** For each claim, note where verified. This catches stale data from early phases.

---

**Purpose of completion doc:**

1. **Executive summary** - "What was achieved?" in 2-3 minutes of reading
2. **PR description template** - Copy/adapt sections for PR body
3. **Future reference** - One place to look for work outcomes

**Feeds the PR:** The completion doc is the source material for the PR description, but not its text: the PR is
public and follows [pull-request-format](../../methods/pull-request-format.md), so task IDs, task-list names, `.arc/`
paths (except the one commit-pinned PRD link) and review metadata stay out of it.

### 4) Commit Documentation Changes

Commit all documentation updates to the child branch.

**Stage changes:**

```bash
git add .arc/active/{category}/tasks-{name}.md
git add .arc/active/{category}/notes-{name}.md  # if exists
git add .arc/active/{category}/completion-{name}.md
git add .arc/active/{category}/prd-{name}.md  # if planned work with PRD updates
```

**Commit message format:** Follow [atomic-commit.md](atomic-commit.md) for full commit message standards.

Documentation prep commits use:

- **Type/scope:** `docs(arc)` or `docs({category})`
- **Context footer:** Reference the task list being archived

**Why commit on child branch:**

- Documentation cleanup is part of the work deliverable
- PR reviewers see clean, organized docs
- Completion metadata informs PR description
- Natural forcing function: "Is completion doc accurate?"

**⛔ CHECKPOINT:** Phase 1 complete. Do NOT push yet. Proceed to Phase 2 for code review before PR.

---

## Phase 2: Code Review & Merge

**Context:** Still on child branch, docs are clean and committed. **Branch is NOT pushed yet.**

### 5) Code Review (Before Push)

Code review runs before the branch is pushed, so its fixes are part of the branch's history rather than PR churn.

**Author check.** Apply the [code-review-author](../../methods/code-review-author.md) checklist to the aggregate
diff (`git diff {parent-branch}...HEAD`): scope, consistency across tasks, leftover debug code, documentation drift,
unresolved markers, correctness and error paths. Check each finding against source and present the complete set
before fixing anything.

**Independent review.** Then recommend a fresh-context [adversarial-review](../../methods/adversarial-review.md)
pass applying [code-review-standard](../../methods/code-review-standard.md): a non-author reviewer covers the complete
branch diff against the [implementation-audit](../../methods/implementation-audit.md) dimensions, with the PRD and the
project rules as context but none of the author's conclusions or suspected weak spots. The Owner decides whether it
runs.

Either way, findings follow the same flow: verify each against source, look for the same defect elsewhere, present
the complete set as a [disposition-report](../../methods/disposition-report.md), and edit nothing until the Owner
approves it. Land the approved fixes as one batch, then offer a fix check; take any further pass only with approval.
The loop ends when a complete pass finds no critical or major finding
([review-model § Successor passes](../../methods/review-model.md)) or the Owner stops it. Record each pass in the
work unit's `REVIEW-LOG.md`.

### 5b) Re-check Alignment

Once code review settles, compare the final change with the documents the PRD was checked against
([1_create-prd.md § Step 3.5](../1_create-prd.md#step-35-check-alignment)), as they stand on `origin/main`: META-PRD's
vision and out-of-scope list always, and TECHNICAL-OVERVIEW when the PRD touches technical surfaces. These checks are
soft and rarely block once the PRD's own passed. Stop on a material disagreement with the final scope and, with the
Owner, correct its source of truth before pushing. Name what was checked in the report.

### 6) Push and Create PR

**After code review settles,** draft the PR title and body, loading
[pull-request-format](../../methods/pull-request-format.md) first: the title follows the commit subject grammar, and
the body is written for a reader outside this repository's process. Show both to the Owner in the turn that asks to
push and open the PR; the text posts under the Owner's account, so the Owner approves the words, not just the act.

```bash
# Push branch to remote
git push -u origin {branch-name}

# Create the PR; title and body follow pull-request-format
gh pr create --base {parent-branch} --head {branch-name}
```

After publication, enter [monitor-pull-request.md](monitor-pull-request.md) for the exact pushed head's CI in the
same turn. Continue to a result or bounded stop; do not hand the Owner a pending first observation to check manually.

**Review on the PR:** Once CI is green and nothing more is to be pushed, recommend a review route in a sentence and
wait for the Owner's choice. Never start one unprompted: hosted reviews are rate-limited and local ones spend tokens.

- **Hosted:** `@codex review`, `@coderabbitai review`, or both (automatic CodeRabbit review is off)
- **Local:** a fresh-context subagent pass applying [code-review-standard](../../methods/code-review-standard.md) over
  the PR diff; for example when the diff is too large for a hosted reviewer, or hosted capacity is used up
- **Skip:** for example when § 5's independent review already covered the final head

```bash
gh pr comment {pr-number} --body "@codex review"
gh pr comment {pr-number} --body "@coderabbitai review"
```

A hosted request reviews the head at that moment, so make it after the last push for that pass, once for the
Owner-approved request. A further pass still needs its separate approval.

Retain each authorized request's URL/time and head, then enter
[monitor-pull-request.md](monitor-pull-request.md) in the same turn. Monitor all requested providers together;
continuing a wait never posts another request.

### 7) Address PR Review Findings

Follow [agent-pre-merge-review.md](agent-pre-merge-review.md): verify every finding against source, present the
complete fix/defer/reject table with the reply drafts, land approved fixes as one batch, and offer a local fix check.
Any further pass, local or hosted, is the Owner's choice.

If review changes what was delivered, update the completion doc to the final state, not the initial intent.

### 8) Merge Pull Request

Before asking to merge, check the change's ADRs: none it adds reads `Proposed`, none returns to `Proposed` or loses
its Status section, and each new ADR's number is still free on `main`. CI's Docs job runs this check against the pull
request's base when the head is pushed; since `main` can move after that, run it again from the checkout after
`git fetch origin`:

```bash
node .arc/reference/scripts/check-adr-records.mjs origin/main
```

If another ADR landed first with the same number, renumber this one, with the records that cite it. A fix makes a new
head, which [monitor-pull-request.md](monitor-pull-request.md) watches again. Once monitoring establishes readiness for
the head, ask for explicit merge approval.
After approval, refresh the accepted head's evidence: `ci-ok` must be green and every review thread resolved:

```bash
# Merge PR through GitHub interface or CLI (never --admin)
gh pr merge {pr-number} --merge --match-head-commit {accepted-full-sha}  # preserve commit history

# Or, into a stacked parent branch only (main takes code through the pull request), merging locally:
git checkout parent-branch
git merge child-branch --no-ff  # preserve merge commit
git push
```

---

## Phase 3: On Parent Branch (After Merge)

**Context:** the pull request has merged. A work unit run in a linked worktree closes from the main checkout, once
the worktree's own session has handed off and ended.

### 9) Prove Post-Merge Criteria (If Any)

Some Success Criteria can only be shown after the merge, such as an automatic deploy or CI's handling of a push to
`main`; the PRD groups them as proven after merge. Check them now, from the main checkout: record each one's
evidence beside it in the task list, check its box and the task that proves them, and push that `.arc/`-only commit
to `main` on the Owner's approval (§ 12). The close holds while the task list has an unchecked box; `[x]` is done,
`[~]` deliberately not done, and `~~[ ]~~` superseded.

### 10) Finish the Worktree

On the Owner's approval, run from the main checkout:

```bash
node scripts/worktree.mjs finish {name}
```

Before changing anything, it refuses a main checkout that isn't a clean `main`, an unmerged branch, a worktree with
uncommitted work or an unexpected Compose project, and any process still running inside the worktree, such as a
session there. Then it:

1. Fast-forwards `main` from `origin`
2. Holds while the task list has an unchecked box (§ 9)
3. Copies the worktree's personal folder, `.arc/user/{identity}/{name}/` (session notes, review records, proofs), to
   the main checkout's `.arc/user/{identity}/errand-records/{name}-{date}/`, so the evidence the task list cites
   survives the checkout
4. Removes the worktree, its stack and its local branch
   ([worktree-sessions.md § Removal](worktree-sessions.md#removal)), then deletes the remote branch if it remains and
   its head is on `main`
5. Moves the design draft, PRD, task list, notes and completion doc with `git mv` into the next numbered archive
   folder ([§ Archive Structure](#archive-structure)), adds the review log from the folder step 3 kept as
   `review-log-{name}.md`, and commits them as `docs(arc): archive the {name} work`, with
   `Context: tasks-{name}.md (maintenance)`
6. Refreshes the installed errand harness when its copies differ from `main`
   ([worktree-sessions.md § Same-Session Errands](worktree-sessions.md#same-session-errands))
7. Stops before the push

The Owner's approval to run `finish` covers its local archive commit; the push to `main` is approved separately
(§ 12). A refusal says how to resume. Running `finish` again is safe until the worktree is removed; a failure after
that names the closing step to run again. Those steps live in `.arc/reference/harness-hooks/finish-work.mjs`.

**A work unit run in place** closes the same way by hand: delete its local branch with `git branch -d
{child-branch-name}` and the remote one with `git push origin --delete {child-branch-name}` if it remains, keep its
personal folder in `errand-records/{name}-{date}/`, then move and commit its documents:

```bash
# {quarter}: e.g. 2026-q4; {NN}: one more than the quarter's highest number, across all categories
mkdir -p .arc/reference/archive/{quarter}/{category}/{NN}_{name}
git mv .arc/active/{category}/draft-{name}.md .arc/reference/archive/{quarter}/{category}/{NN}_{name}/  # if exists
git mv .arc/active/{category}/prd-{name}.md .arc/reference/archive/{quarter}/{category}/{NN}_{name}/  # if exists
git mv .arc/active/{category}/tasks-{name}.md .arc/reference/archive/{quarter}/{category}/{NN}_{name}/
git mv .arc/active/{category}/notes-{name}.md .arc/reference/archive/{quarter}/{category}/{NN}_{name}/  # if exists
git mv .arc/active/{category}/completion-{name}.md .arc/reference/archive/{quarter}/{category}/{NN}_{name}/
cp .arc/user/{identity}/errand-records/{name}-{date}/REVIEW-LOG.md \
  .arc/reference/archive/{quarter}/{category}/{NN}_{name}/review-log-{name}.md  # if one was kept
git add .arc/reference/archive/{quarter}/{category}/{NN}_{name}/
```

Commit with the message `finish` uses ([atomic-commit.md](atomic-commit.md) has the standards). `git mv` keeps each
file's history, which `git log --follow` reads after the move.

**Branch deletion is the trigger for archival:** the task list leaves `.arc/active/` as soon as its branch is gone.

### 11) Update ROADMAP (if tracked)

`finish` points out a ROADMAP entry that names the work. Update `.arc/backlog/ROADMAP.md` if applicable, and fold it
into the archive commit before pushing (`git add .arc/backlog/ROADMAP.md && git commit --amend --no-edit`):

- Mark completed work with ✅ and completion date
- Update archive path reference
- Adjust "Last Updated" date

**When to update the roadmap:**

- ✅ Major features (always document completion)
- ✅ Significant technical work (modernization, infrastructure changes)
- ❌ Small incidental fixes (usually not necessary)

### 12) Push to `main`

Push the archive commit, and any evidence commit from § 9, straight to `main` from the main checkout, on the Owner's
approval:

```bash
git push origin main
```

Commits that change only `.arc/` may go to `main` directly, through the merge gate's admin bypass; everything else
reaches `main` through a pull request. The `pre-push` hook (`.githooks/pre-push`) refuses a push to `main` whose new
commits change any path outside `.arc/`. No CI runs before such a push lands, and a failure on `main` fails every open
pull request's checks, so first run the checks for what the commit changed: markdown lint on changed `.arc/` markdown
outside the archive, the harness-hook tests if `.arc/reference/harness-hooks/` changed, the ADR check's tests
(`node --test .arc/reference/scripts/check-adr-records.test.mjs`) if `.arc/reference/scripts/` changed, and § 8's ADR
check (`node .arc/reference/scripts/check-adr-records.mjs origin/main`, after `git fetch origin`) if the commit adds or
edits an ADR. The Docs workflow runs both again after the push. Archiving from the main checkout lands archives one at
a time, so two work units never claim the same sequence number.

---

## Archive Structure

**Path pattern:** `.arc/reference/archive/{quarter}/{category}/{NN}_{name}/`

- `{quarter}`: `2025-q4`, `2025-q3`, etc.
- `{category}`: `feature/`, `technical/`, or `incidental/`
- `{NN}`: Global sequence number (01-99), assigned by completion order across ALL categories
- `{name}`: Work package name (matching task list name)

**Example structure:**

```
2025-q4/
├── technical/
│   ├── 01_logging-system/
│   ├── 02_api-layer-modernization-p1/
│   ├── 03_authentication-modernization/
│   └── 10_api-layer-modernization-p2/
├── incidental/
│   ├── 04_backend-type-safety/
│   ├── 05_fix-backend-type-errors/
│   └── ...
└── feature/
    └── (none in this quarter)
```

**Sequence numbering:**

- Numbers are **global across all categories** (not per-category)
- Assigned in **completion order** (when work was archived, not started)
- Gaps between numbers within a category show where other categories' work completed
- Reset to 01 at start of each quarter
- To find the next number: one more than the highest in the quarter, across all categories

**Key principles:**

- All work gets `completion-{name}.md` (unified strategy)
- Work packages group by subdirectory (tasks + completion minimum)
- Use `git mv` to preserve file history
- Sequence prefix enables chronological ordering at a glance

**Categorization:** See [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md)
for feature vs technical vs incidental decision rules.

---

## Common Pitfalls

**Critical errors:**

- ❌ Skip doc hygiene → Run [maintain-task-notes.md](maintain-task-notes.md) Mode 2 first
- ❌ Use `mv` instead of `git mv` → Loses file history
- ❌ Archive before branch deletion → Delete branch first, then archive
- ❌ Skip completion doc → ALL work gets `completion-{name}.md`

**Best practices:**

- ✅ Run maintain-task-notes Mode 2 before archiving
- ✅ Create completion doc on child branch (before PR)
- ✅ Draw the PR description from the completion doc, per pull-request-format
- ✅ Use `git mv` to preserve history

---

## Appendix

### Handling Partially Superseded Work

**When to use:** Work where significant progress was made before an architectural decision changed direction.
Earlier phases remain valid (will be used by new approach), but later phases are obsolete.

**Status field:** `**Status:** Superseded (partial)`

**Required elements:**

1. **Header metadata:**

   ```markdown
   **Completed:** YYYY-MM-DD
   **Status:** Superseded (partial)
   **Superseded By:** `tasks-{new-approach}.md` (YYYY-MM-DD)
   ```

2. **Supersession rationale:** Brief explanation of what triggered the change and what remains valid vs obsolete.

3. **Decision point marker:** Insert before first superseded task:

   ```markdown
   ---

   **⚠️ Supersession Point (YYYY-MM-DD):** Tasks X.Y onwards superseded by [reason].
   See `tasks-{new-approach}.md` for continuation. Earlier phases (1-X.Z) remain valid -
   [brief explanation of what's reused].

   ---
   ```

4. **Strikethrough incomplete tasks:** Use `~~` to clearly indicate tasks weren't abandoned without thought:

   ```markdown
   - ~~[ ] **4.1 Task description**~~ *(superseded by infinite scroll)*
   ```

5. **Completion doc:** Include `**Status:** Superseded (partial)` and document what was completed vs superseded.

**Key principle:** The strikethrough + decision point note creates clear audit trail showing intentional
architectural pivot, not abandoned work.

---
