# Workflow: Archive Completed Work

Move completed work documentation to structured archive to keep the active workspace clean while preserving
history and context.

**Archive Timing (As of ADR-013, 2025-11-10):**

Task lists are archived **immediately when their corresponding git branch is deleted** (which occurs after merge
completion). This creates conceptual coherence:

- Branch exists ↔ Task list in `.arc/active/`
- Branch deleted → Task list archived to `.arc/reference/archive/`

See [ADR-013](../../adr/adr-013-adopt-stacked-branch-workflow.md) and
[Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for complete rationale.

## Workflow Overview

**All work follows the same archival workflow**, regardless of category (feature/technical/incidental):

1. **Phase 1: On Child Branch** - Complete work, clean docs, create completion metadata
2. **Phase 2: Code Review & Merge** - Review, PR, merge to parent
3. **Phase 3: On Parent Branch** - Delete child branch, archive files, commit

**Key principle:** Documentation cleanup and completion metadata are part of the child branch deliverable,
not a post-merge activity. This ensures PR reviewers see clean, well-organized docs.

---

## Phase 1: On Child Branch (Before PR)

**Context:** You're on the child branch where work was completed (e.g., `incidental/chakra-recipe-system`).

### 1) Verify Work Completion

- [ ] All task list subtasks and parent tasks marked `[x]`
- [ ] All quality gates passed (documented as completed subtasks in task list)
- [ ] Implementation functions as expected in development environment
- [ ] PROJECT-STATUS reflects completion (if applicable - major features/technical work)

**Note:** Quality gates (tests, linting, type checking) are always documented as subtasks in the task list.
If all tasks are marked complete, quality gates have passed. No separate verification step needed.

### 2) Clean Up Documentation (MANDATORY)

**Run [maintain-task-notes.md](maintain-task-notes.md) workflow in Mode 2 (Archival Preparation):**

This step prepares both task file and notes file for long-term reference:

- **Task file cleanup**: Migrate verbose implementation details to notes file, leaving lean quick-reference skeleton
- **Notes file preparation**: Add table of contents, clean section headers, remove temporal markers,
  consolidate exploratory sections
- **Cross-reference updates**: Update status metadata, add completion dates
- **Quality checks**: Run markdown linting, verify no accidental task edits

**Expected outcome:** Task file becomes 200-400 line quick-reference showing WHAT was done. Notes file
becomes comprehensive deep-dive showing HOW and WHY.

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
**Final Commit**: {commit-hash from last work commit}
**Branch**: {branch-name}
**Category**: {Feature | Technical | Incidental}
**Context**: {One-liner: "Discovered during X" or "Part of roadmap initiative Y"}

## Summary

{2-3 sentences: What was accomplished and why it matters}

## Key Implementation Details

- {Major decision or pattern}
- {Significant challenge overcome}
- {Notable outcome}

## Metrics

- **Files Changed**: X files
- **Tests Added**: Y tests (Z backend, W frontend)
- **Commits**: N commits
- **Lines Changed**: +A -B

## Related Documentation

- {For planned work: PRD: `path/to/prd-{name}.md`}
- Tasks: `path/to/tasks-{name}.md`
- Notes: `path/to/notes-{name}.md` (if exists)
- Completion: `path/to/completion-{name}.md`

## {For planned work only: Incidental Work Completed}

{List any incidental task lists completed during this work}

- `tasks-{name}.md` - {brief description}

## Follow-Up Work

{Any deferred items or future considerations}
```

**Purpose of completion doc:**

1. **Executive summary** - "What was achieved?" in 2-3 minutes of reading
2. **PR description template** - Copy/adapt sections for PR body
3. **Future reference** - One place to look for work outcomes

**Dual-purpose with PR:** The completion doc serves as your PR description draft. You'll write this content
anyway for the PR - creating it as a persistent document ensures it's searchable and greppable beyond GitHub.

### 4) Commit Documentation Changes

Commit all documentation updates to the child branch:

```bash
# Stage documentation changes
git add .arc/active/{category}/tasks-{name}.md
git add .arc/active/{category}/notes-{name}.md  # if exists
git add .arc/active/{category}/completion-{name}.md
git add .arc/active/{category}/prd-{name}.md  # if planned work with PRD updates

# Commit with descriptive message
git commit -m "docs: prepare documentation for archival

- Clean task list and notes file (maintain-task-notes Mode 2)
- Add completion metadata with summary and metrics
- Update cross-references and status metadata
- All files ready for code review and archival"
```

**Why commit on child branch:**

- Documentation cleanup is part of the work deliverable
- PR reviewers see clean, organized docs
- Completion metadata informs PR description
- Natural forcing function: "Is completion doc accurate?"

---

## Phase 2: Code Review & Merge

**Context:** Still on child branch, docs are clean and committed.

### 5) Code Review

Run appropriate code review for scope:

**Lightweight (local review only):**

```bash
# Suitable for: Small changes (<300 lines), low risk, incidental work
coderabbit review local
# Fix findings, commit fixes
```

**Thorough (two-pass review):**

```bash
# Pass 1: Local pre-PR review
coderabbit review local
# Fix findings, commit fixes

# Pass 2: Create PR (CodeRabbit reviews PR automatically)
gh pr create --base parent-branch --head child-branch
# Address PR review findings
```

**Use completion doc as PR description template:** Copy/adapt sections from `completion-{name}.md`
for the PR body. This ensures consistency and avoids duplicate writing.

### 6) Address Review Findings

**If code review results in significant changes:**

- Update code as requested
- **Update completion metadata if work outcomes changed**
- Commit fixes with references to review findings
- Re-run quality checks if necessary (add as task list subtasks)

**Important:** If review causes substantial changes to what was delivered, the completion doc should reflect
final state, not initial intent. This is a natural forcing function for accuracy.

### 7) Merge Pull Request

```bash
# Merge PR through GitHub interface or CLI
gh pr merge {pr-number} --squash  # or --merge, per project conventions

# Or if merging locally:
git checkout parent-branch
git merge child-branch --no-ff  # preserve merge commit
git push
```

---

## Phase 3: On Parent Branch (After Merge)

**Context:** PR is merged, you're now on the parent branch (e.g., `technical/service-layer-modernization`
or `main`).

### 8) Delete Child Branch

```bash
# Delete locally
git branch -d {child-branch-name}

# Delete remotely (if pushed)
git push origin --delete {child-branch-name}
```

**Branch deletion is the trigger for archival.** Once the branch is deleted, the task list should immediately
move from `.arc/active/` to `.arc/reference/archive/`.

### 9) Archive Files

**Create archive directory and move all files using git mv** (preserves history):

**For planned work (feature/technical):**

```bash
# Create work package directory
mkdir -p .arc/reference/archive/{category}/{name}

# Move all files with git mv (preserves history)
git mv .arc/active/{category}/prd-{name}.md .arc/reference/archive/{category}/{name}/
git mv .arc/active/{category}/tasks-{name}.md .arc/reference/archive/{category}/{name}/
git mv .arc/active/{category}/notes-{name}.md .arc/reference/archive/{category}/{name}/  # if exists
git mv .arc/active/{category}/completion-{name}.md .arc/reference/archive/{category}/{name}/
```

**For incidental work:**

```bash
# If notes file exists (create work package subdirectory)
mkdir -p .arc/reference/archive/incidental/{name}
git mv .arc/active/incidental/tasks-{name}.md .arc/reference/archive/incidental/{name}/
git mv .arc/active/incidental/notes-{name}.md .arc/reference/archive/incidental/{name}/
git mv .arc/active/incidental/completion-{name}.md .arc/reference/archive/incidental/{name}/

# If no notes file (move to incidental root - NO subdirectory)
# Note: With unified completion docs, most incidental work will have 2+ files → subdirectory
git mv .arc/active/incidental/tasks-{name}.md .arc/reference/archive/incidental/
git mv .arc/active/incidental/completion-{name}.md .arc/reference/archive/incidental/
```

**Why git mv:** Preserves file history. Future developers can use `git log --follow` to see the file's
full evolution even after it moved to archive.

### 10) Update PROJECT-STATUS

Update `.arc/reference/constitution/PROJECT-STATUS.md` if applicable:

- Move work from "Work in Progress" to "Completed Work" section
- Add archive reference if appropriate
- Update project metrics (tests, coverage, new capabilities)

**When to update PROJECT-STATUS:**

- ✅ Major features (always document completion)
- ✅ Significant technical work (modernization, infrastructure changes)
- ❌ Small incidental fixes (usually not necessary)

### 11) Commit Archive Changes

```bash
git add .arc/reference/archive/
git add .arc/active/{category}/  # captures file deletions
git add .arc/reference/constitution/PROJECT-STATUS.md  # if updated

git commit -m "docs(archive): archive {category}/{name} documentation

- Move all work docs to archive/{category}/{name}/ ({list file types})
- {One-line summary of what was accomplished}
- Branch deleted after merge, task list archived immediately (ADR-013)"
```

**Examples:**

```bash
# Feature work
git commit -m "docs(archive): archive feature/user-authentication documentation

- Move all work docs to archive/feature/user-authentication/ (PRD, tasks, notes, completion)
- Implemented JWT authentication with OAuth providers (Google, GitHub)
- Update PROJECT-STATUS with authentication capability
- Branch deleted after merge, task list archived immediately (ADR-013)"

# Technical work
git commit -m "docs(archive): archive technical/service-layer-modernization documentation

- Move all work docs to archive/technical/service-layer-modernization/ (PRD, tasks, notes, completion)
- Extracted business logic to service layer across 12 API endpoints
- Update PROJECT-STATUS with architecture improvements
- Branch deleted after merge, task list archived immediately (ADR-013)"

# Incidental work
git commit -m "docs(archive): archive incidental/chakra-recipe-system documentation

- Move all work docs to archive/incidental/chakra-recipe-system/ (tasks, notes, completion)
- Implemented Chakra UI v3 recipe system for 7 components, migrated 50+ component instances
- Branch deleted after merge, task list archived immediately (ADR-013)"
```

---

## Archive Structure

With unified completion metadata, all work packages have consistent structure:

```
.arc/reference/archive/
├── README.md                                     # Archive overview and navigation
├── feature/                                      # User-facing planned work (work packages)
│   ├── user-authentication/                      # All docs for one feature together
│   │   ├── prd-user-authentication.md
│   │   ├── tasks-user-authentication.md
│   │   ├── notes-user-authentication.md          # optional
│   │   └── completion-user-authentication.md     # executive summary
│   └── movie-ratings/
│       ├── prd-movie-ratings.md
│       ├── tasks-movie-ratings.md
│       ├── notes-movie-ratings.md                # optional
│       └── completion-movie-ratings.md           # executive summary
├── technical/                                    # Infrastructure planned work (work packages)
│   ├── api-layer-modernization-p1/               # All docs for one technical work together
│   │   ├── prd-api-layer-modernization-p1.md
│   │   ├── tasks-api-layer-modernization-p1.md
│   │   ├── notes-api-layer-modernization-p1.md   # optional
│   │   └── completion-api-layer-modernization-p1.md  # executive summary
│   └── service-layer-modernization/
│       ├── prd-service-layer-modernization.md
│       ├── tasks-service-layer-modernization.md
│       ├── notes-service-layer-modernization.md
│       └── completion-service-layer-modernization.md  # executive summary
└── incidental/                                   # Unplanned reactive work
    ├── chakra-recipe-system/                     # Work package (has notes + completion)
    │   ├── tasks-chakra-recipe-system.md
    │   ├── notes-chakra-recipe-system.md
    │   └── completion-chakra-recipe-system.md    # NEW: unified approach
    ├── oauth-headless-migration/                 # Work package (has notes + completion)
    │   ├── tasks-oauth-headless-migration.md
    │   ├── notes-oauth-headless-migration.md
    │   ├── research-django-allauth-headless-oauth.md
    │   └── completion-oauth-headless-migration.md  # executive summary
    ├── pagination-fixes/                         # Work package (minimal, just tasks + completion)
    │   ├── tasks-pagination-fixes.md
    │   └── completion-pagination-fixes.md        # NEW: even small incidental work
    └── csrf-middleware-fix/                      # Work package (tasks + completion, no notes)
        ├── tasks-csrf-middleware-fix.md
        └── completion-csrf-middleware-fix.md     # NEW: unified approach
```

**Organization principles:**

- **All work gets completion metadata** - Consistent across feature/technical/incidental
- **Work packages group by subdirectory** - All files for a work item live together
- **Completion doc = executive summary** - One place to look for "what was achieved?"
- **Subdirectory creation**: If 2+ files (tasks + completion, or tasks + notes), create subdirectory.
  Single file only (rare) can stay in category root.

---

## Work Categorization Decision Guide

**Planned work** (gets PRD + task list + completion):

- **Feature** - Adds user-visible capability from product vision
    - Examples: User authentication, movie ratings UI, search functionality
    - Archive to: `archive/feature/{name}/`

- **Technical** - Improves infrastructure, architecture, or developer experience
    - Examples: API modernization, type safety improvements, testing infrastructure
    - Archive to: `archive/technical/{name}/`

**Incidental work** (gets task list + completion, no PRD):

- **Unplanned reactive work** discovered during development
    - Examples: Recipe system implementation, type safety fixes, CSRF middleware bug
    - Uses conventional commit type prefixes in branch: `incidental/{name}`
    - Archive to: `archive/incidental/{name}/`

**When uncertain**, consult
[Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for complete decision tree.

---

## Common Pitfalls

❌ **Archiving without doc hygiene**: Task list still has verbose blocks, notes file lacks TOC
   → **Fix**: Run [maintain-task-notes.md](maintain-task-notes.md) Mode 2 first (mandatory Phase 1, Step 2)

❌ **Skipping completion metadata**: Assuming only planned work needs completion docs
   → **Fix**: ALL work gets `completion-{name}.md` (unified strategy as of ADR-013)

❌ **Creating completion doc during archive phase**: Waiting until after merge
   → **Fix**: Create completion doc on child branch (Phase 1, Step 3) as part of work deliverable

❌ **Not using completion doc for PR description**: Writing PR description separately
   → **Fix**: Use completion doc as PR description template (saves time, ensures consistency)

❌ **Using plain mv instead of git mv**: Loses file history
   → **Fix**: Always use `git mv` to preserve history (Phase 3, Step 9)

❌ **Archiving before branch deletion**: Moving files while branch still exists
   → **Fix**: Delete branch first (Phase 3, Step 8), THEN archive files (Phase 3, Step 9)

❌ **Wrong category**: Feature work archived to technical/, or vice versa
   → **Fix**: Check [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) decision rules

❌ **Forgetting to update PROJECT-STATUS**: Major work completed but still shows "In Progress"
   → **Fix**: Update PROJECT-STATUS in Phase 3, Step 10 before committing

❌ **Committing before linting**: Markdown violations in archived docs
   → **Fix**: Markdown linting is part of maintain-task-notes Mode 2 quality checks (Phase 1, Step 2)

❌ **Not updating completion doc after review**: Review changes work outcomes but doc unchanged
   → **Fix**: Update completion doc when review findings significantly change deliverables (Phase 2, Step 6)

✅ **Run [maintain-task-notes.md](maintain-task-notes.md) Mode 2 first**: Ensures archive-ready documentation
✅ **Create completion-{name}.md for ALL work**: Unified strategy, consistent structure
✅ **Use git mv, never plain mv**: Preserves file history
✅ **Complete docs on child branch**: PR reviewers see clean, organized documentation
✅ **Use completion doc as PR template**: Dual-purpose documentation reduces duplicate work
✅ **Archive on parent after merge**: Branch deleted → files archived (maintains coupling)
✅ **Consistent structure**: Every work package has predictable file organization

---

## Benefits of Systematic Archival

- **Consistent workflow** - Same steps for all work types (feature/technical/incidental)
- **Executive summaries** - One place to look for "what was achieved?" (completion doc)
- **PR integration** - Completion doc serves as PR description template (dual purpose)
- **Professional documentation** - Demonstrates systematic approach to development
- **Discoverability** - Structured archives with consistent organization
- **Future reference** - Easy to find technical decisions months later
- **Clean active workspace** - Only in-progress work stays in `.arc/active/`
- **Git history preservation** - `git mv` allows tracking files through archival

---

## Historical Note: Completion Metadata Evolution

**Before ADR-013 (< 2025-11-10):**

- Planned work (feature/technical) → Completion metadata document
- Incidental work → Inline completion summary in task list (no separate doc)
- Rationale: Different git workflows justified different documentation

**After ADR-013 (>= 2025-11-10):**

- ALL work → Completion metadata document
- Stacked branch workflow means all work gets branches and PRs
- Unified approach: Same workflow, same documentation structure
- Rationale: Identical git workflows should have identical documentation artifacts

**Archives created before 2025-11-10** may have incidental work without completion docs.
This is expected and historically accurate. All new work uses unified completion metadata.

---

**Version**: 4.0 | **Updated**: 2025-11-17

**Changelog**:

- v4.0 (2025-11-17): Unified completion metadata strategy - ALL work gets `completion-{name}.md` (not just planned).
  Restructured workflow to show clear child/parent branch phases. Moved completion doc creation to child branch
  (before PR). Changed `mv` to `git mv` (preserves history). Removed quality gates as separate step (coupled to
  task completion). Added PR description integration guidance.
- v3.0 (2025-11-10): Updated archive timing to reflect branch lifecycle (ADR-013) - archive immediately when
  branch deleted (after merge). Added guidance for incidental work with separate branches vs. work on parent branch.
- v2.1 (2025-10-21): Reorganized archives into work-package subdirectories - all docs for a piece of work
  live together (no more nested prds/, tasks/, notes/, completion-metadata/ subdirectories)
- v2.0 (2025-10-20): Added three-way categorization (feature/technical/incidental), integrated
  maintain-task-notes as mandatory Step 2
- v1.0 (previous): Initial two-way categorization (feature/incidental) with nested doc-type subdirectories
