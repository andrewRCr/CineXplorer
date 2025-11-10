# Workflow: Archive Completed Work

Move completed planned and incidental documentation to structured archive to keep the active workspace clean
while preserving history and context.

**Archive Timing (As of ADR-013, 2025-11-10):**

Task lists are archived **immediately when their corresponding git branch is deleted** (which occurs after merge
completion). This creates conceptual coherence:

- Branch exists ↔ Task list in `.arc/active/`
- Branch deleted → Task list archived to `.arc/reference/archive/`

See [ADR-013](../../adr/adr-013-adopt-stacked-branch-workflow.md) and
[Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for complete rationale.

## Before You Start: Verify Work Category

**This work is** (check the [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) if unsure):

- [ ] **Feature** (planned user-facing capability) → Use Planned Work Archiving, `feature/` directories
- [ ] **Technical** (planned infrastructure work) → Use Planned Work Archiving, `technical/` directories
- [ ] **Incidental** (unplanned reactive work) → Use Incidental Work Archiving, `incidental/` directories

**Decision rules:**

1. Was this planned (has PRD)? → Yes: Continue to step 2 | No: Incidental
2. Does it add user-visible capability from product vision? → Yes: Feature | No: Technical

See [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for complete decision tree.

---

## Planned Work Archiving (Feature & Technical)

For planned work with PRDs, formal task lists, and git branches. Applies to both:

- **Feature work** - User-facing capabilities (ratings, search, authentication, etc.)
- **Technical work** - Infrastructure improvements (modernization, type safety, testing, etc.)

**Archive destinations differ by category:**

- Feature work → `archive/feature/{work-name}/` (all docs together)
- Technical work → `archive/technical/{work-name}/` (all docs together)

**Archive timing**: Immediately after branch is deleted (which occurs after PR merge and deletion of merged branch).

### 1) Verify Completion and Merge

- Confirm task list status (all subtasks and parent tasks marked [x])
- Confirm PROJECT-STATUS reflects completion (if applicable)
- Confirm all related code is merged to parent/main
- Confirm all quality gates are passing (tests, linting, type checking)
- Confirm implementation functions as expected in development environment
- Confirm PR merged and branch deleted: `git branch -d {branch-name}`

### 2) Clean Up Documentation (MANDATORY)

**Run [maintain-task-notes.md](maintain-task-notes.md) workflow in Mode 2 (Archival Preparation):**

This step ensures both task file and notes file are archive-ready:

- **Task file cleanup**: Migrate verbose implementation details to notes file, leaving lean quick-reference skeleton
- **Notes file preparation**: Add table of contents, clean section headers, remove temporal markers,
  consolidate exploratory sections
- **Cross-reference updates**: Update status metadata, add completion dates
- **Quality checks**: Run markdown linting, verify no accidental task edits

**Expected outcome:** Task file becomes 200-400 line quick-reference showing WHAT was done. Notes file
becomes comprehensive deep-dive showing HOW and WHY.

**Time estimate:** 15-30 minutes

**Do not skip this step** - Archives without this cleanup are difficult to use 6 months later.

### 3) Create Work Package Directory and Move All Files

**For feature work:**

```bash
# Create work package directory
# Note: {name} should match the branch name in kebab-case (e.g., "user-authentication")
mkdir -p .arc/reference/archive/feature/{name}

# Move all related files together
mv .arc/active/feature/prd-{name}.md .arc/reference/archive/feature/{name}/
mv .arc/active/feature/tasks-{name}.md .arc/reference/archive/feature/{name}/
mv .arc/active/feature/notes-{name}.md .arc/reference/archive/feature/{name}/  # if exists
```

**For technical work:**

```bash
# Create work package directory
# Note: {name} should match the branch name in kebab-case (e.g., "api-layer-modernization-p2")
mkdir -p .arc/reference/archive/technical/{name}

# Move all related files together
mv .arc/active/technical/prd-{name}.md .arc/reference/archive/technical/{name}/
mv .arc/active/technical/tasks-{name}.md .arc/reference/archive/technical/{name}/
mv .arc/active/technical/notes-{name}.md .arc/reference/archive/technical/{name}/  # if exists
```

### 4) Create Completion Metadata

**For feature work**, create `.arc/reference/archive/feature/{name}/completion-{name}.md`:

**For technical work**, create `.arc/reference/archive/technical/{name}/completion-{name}.md`:

```markdown
# Completion: {Work Name}

**Completed**: YYYY-MM-DD
**Final Commit**: {commit-hash}
**Branch**: {branch-name}
**Category**: {Feature | Technical}

## Summary

{2-3 sentence overview of what was accomplished}

## Key Implementation Details

- {Major technical decision or pattern}
- {Significant challenge overcome}
- {Notable outcome or capability}

## Metrics

- **Tests Added**: X tests (Y backend, Z frontend)
- **Coverage**: X% (if applicable)
- **Commits**: X commits
- **Duration**: X days/weeks
- **Effort**: ~X hours (if tracked via incidental work)

## Related Documentation

- PRD: `.arc/reference/archive/{category}/{name}/prd-{name}.md`
- Tasks: `.arc/reference/archive/{category}/{name}/tasks-{name}.md`
- Notes: `.arc/reference/archive/{category}/{name}/notes-{name}.md` (if exists)
- Completion: `.arc/reference/archive/{category}/{name}/completion-{name}.md`

## Incidental Work Completed

{List any incidental task lists completed during this work}

- `tasks-chore-{name}.md` - {brief description}
- `tasks-refactor-{name}.md` - {brief description}

## Next Steps / Future Work

{Any deferred work or follow-up features}
```

**Note on categorization evolution:** If git branch name doesn't match current categorization (e.g.,
`feature/` branch for technical work created before categorization strategy), note this in the
completion metadata:

```markdown
**Branch**: `feature/api-layer-modernization-p2`
**Category**: Technical infrastructure work

**Note**: Branch created before work categorization strategy formalized (2025-10-17). Under current
categorization standards, this would be categorized as `technical/` work (infrastructure improvements,
not user-facing features). Branch name preserved for historical accuracy. All future infrastructure
work uses `technical/` category per
[Work Organization Strategy](../../strategies/arc/strategy-work-organization.md).
```

### 5) Update PROJECT-STATUS

- Ensure work is in "Completed Work" section (if applicable)
- Remove from "Work in Progress"
- Add archive reference if appropriate
- Update project metrics (tests, coverage, capabilities)

### 6) Commit Archive Changes

**Timing**: Commit archive changes immediately after branch deletion (maintains branch ↔ task list coupling).

**For feature work:**

```bash
git add .arc/reference/archive/ .arc/active/feature/ .arc/reference/constitution/PROJECT-STATUS.md

git commit -m "docs(archive): archive feature/{name} documentation

- Move all work docs to archive/feature/{name}/ (PRD, tasks, notes, completion)
- Add completion metadata with metrics and summary
- Update PROJECT-STATUS references
- Branch deleted after merge, task list archived immediately (ADR-013)"
```

**For technical work:**

```bash
git add .arc/reference/archive/ .arc/active/technical/ .arc/reference/constitution/PROJECT-STATUS.md

git commit -m "docs(archive): archive technical/{name} documentation

- Move all work docs to archive/technical/{name}/ (PRD, tasks, notes, completion)
- Add completion metadata with metrics and summary
- Update PROJECT-STATUS references
- Branch deleted after merge, task list archived immediately (ADR-013)"
```

---

## Incidental Work Archiving

For unplanned reactive work discovered during development.

**Characteristics:**

- No PRD document
- Task list only (with optional notes file)
- Completion summary appended to task list itself (NOT separate completion metadata)
- May have separate branch (if >30min, multiple subtasks) or committed to parent branch

**Archive timing**: Immediately after branch deletion if incidental work had its own branch. If no separate
branch (work committed directly to parent), archive when all work complete (standard timing).

### 1) Verify Incidental Completion

- Confirm task list status (all subtasks and parent tasks marked [x])
- Confirm all related code is merged and quality gates passing
- Confirm completion summary appended to task list (see maintain-task-notes.md)
- Confirm `maintain-task-notes.md` workflow was executed (Mode 2: Archival Preparation)
- **If separate branch**: Confirm PR merged and branch deleted: `git branch -d incidental/{name}`

### 2) Move Files to Archive

**If notes file exists** (create work package subdirectory):

```bash
# Create work package directory for incidental work with notes
mkdir -p .arc/reference/archive/incidental/{name}

# Move task list and notes together
mv .arc/active/incidental/tasks-incidental-{name}.md .arc/reference/archive/incidental/{name}/
mv .arc/active/incidental/notes-incidental-{name}.md .arc/reference/archive/incidental/{name}/
# Plus any research docs (research-*.md)
```

**If no notes file** (move task list to incidental root):

```bash
# Simple task lists without notes stay in incidental/ root
mv .arc/active/incidental/tasks-incidental-{name}.md .arc/reference/archive/incidental/
```

### 3) Commit Archive Changes

**Timing**: Commit archive changes immediately after branch deletion (if work had separate branch).

```bash
git add .arc/reference/archive/ .arc/active/incidental/

git commit -m "docs(archive): archive incidental/{name} documentation

- Move tasks and notes to structured archive (incidental/)
- {Brief 1-line summary of what was accomplished}
- Branch deleted after merge, task list archived immediately (ADR-013)"
```

**Note**: Incidental work does not require:

- PRD archival (no PRD exists)
- Separate completion metadata document (completion summary is in task list itself)
- PROJECT-STATUS updates (unless work significantly changed project structure)

---

## Archive Structure

```
.arc/reference/archive/
├── README.md                                     # Archive overview and navigation
├── feature/                                      # User-facing planned work (work packages)
│   ├── user-authentication/                      # All docs for one feature together
│   │   ├── prd-user-authentication.md
│   │   ├── tasks-user-authentication.md
│   │   ├── notes-user-authentication.md          # optional
│   │   └── completion-user-authentication.md
│   └── movie-ratings/
│       ├── prd-movie-ratings.md
│       ├── tasks-movie-ratings.md
│       ├── notes-movie-ratings.md                # optional
│       └── completion-movie-ratings.md
├── technical/                                    # Infrastructure planned work (work packages)
│   ├── api-layer-modernization-p1/               # All docs for one technical work together
│   │   ├── prd-api-layer-modernization-p1.md
│   │   ├── tasks-api-layer-modernization-p1.md
│   │   ├── notes-api-layer-modernization-p1.md   # optional
│   │   └── completion-api-layer-modernization-p1.md
│   ├── authentication-modernization/
│   │   ├── prd-authentication-modernization.md
│   │   ├── tasks-authentication-modernization.md
│   │   ├── notes-authentication-modernization.md
│   │   └── completion-authentication-modernization.md
│   └── logging-system/
│       ├── prd-logging-system.md
│       ├── tasks-logging-system.md
│       └── completion-logging-system.md           # no notes for this one
└── incidental/                                   # Unplanned reactive work
    ├── oauth-headless-migration/                 # Work package (has notes)
    │   ├── tasks-incidental-oauth-headless-migration.md
    │   ├── notes-incidental-oauth-headless-migration.md
    │   └── research-django-allauth-headless-oauth.md
    ├── security-updates/                         # Work package (has notes)
    │   ├── tasks-incidental-security-updates.md
    │   └── notes-incidental-security-updates.md
    ├── tasks-incidental-backend-type-safety.md   # Simple task list (no notes)
    ├── tasks-incidental-pytest-migration.md      # Simple task list (no notes)
    └── tasks-incidental-wsl2-migration.md        # Simple task list (no notes)
```

**Organization principles:**

- **Feature/Technical work**: Each work item gets its own subdirectory with all related docs (PRD, tasks, notes, completion)
- **Incidental work with notes**: Gets subdirectory with task list + notes files
- **Incidental work without notes**: Task list stays in incidental/ root (no subdirectory needed)
- **No nested doc-type directories**: All files for a work item live together in one place

---

## Work Categorization Decision Guide

**Planned work** (gets PRD + completion metadata):

- **Feature** - Adds user-visible capability from product vision
    - Examples: User authentication, movie ratings UI, search functionality
    - Archive to: `feature/` subdirectories

- **Technical** - Improves infrastructure, architecture, or developer experience
    - Examples: API modernization, type safety improvements, testing infrastructure
    - Archive to: `technical/` subdirectories

**Incidental work** (no PRD, completion summary in task list):

- **Unplanned reactive work** discovered during development
    - Examples: Type safety fixes, test helper extraction, CSRF middleware bug
    - Uses conventional commit type prefixes: `tasks-chore-X`, `tasks-refactor-X`, `tasks-fix-X`
    - Archive to: `incidental/` subdirectories

**When uncertain**, consult
[Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for complete decision tree.

---

## Archive Organization Principles

- **Preserve development history**: Keep all planning, implementation notes, and outcomes
- **Keep active workspace focused**: Only in-progress work stays in `.arc/active/`
- **Maintain discoverability**: Clear structure + README navigation
- **Category-based organization**: Separate feature/technical/incidental for clarity
- **Professional documentation**: Demonstrates systematic approach to development
- **Future reference**: Easy to find technical decisions and implementation details months later

---

## Benefits of Systematic Archival

- Demonstrates professional development practices
- Provides valuable reference for similar future work
- Maintains project history while keeping active workspace organized
- Creates searchable knowledge base of completed work
- Shows evolution from planning → implementation → completion
- Makes it easy to onboard new contributors or review past decisions
- Category organization enables filtering by work type

---

## Common Pitfalls

❌ **Archiving without doc hygiene**: Task list still has verbose blocks, notes file lacks TOC
   → **Fix**: Run [maintain-task-notes.md](maintain-task-notes.md) Mode 2 first (mandatory Step 2)

❌ **Skipping maintain-task-notes Step 2**: Archived docs are unreadable 6 months later
   → **Fix**: This is a MANDATORY step - do not skip

❌ **Wrong category**: Feature work archived to technical/, or vice versa
   → **Fix**: Check [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) decision rules

❌ **Creating completion metadata for incidental work**: Unnecessary overhead
   → **Fix**: Incidental work uses completion summary in task list, not separate metadata file

❌ **Forgetting to update PROJECT-STATUS**: Work completed but still shows "In Progress"
   → **Fix**: Update PROJECT-STATUS in Step 5 before committing

❌ **Inconsistent naming**: Different conventions for different archives
   → **Fix**: Follow naming patterns consistently (`prd-{name}.md`, `tasks-{name}.md`, `completion-{name}.md`)

❌ **Committing before linting**: Markdown violations in archived docs
   → **Fix**: Markdown linting is part of maintain-task-notes Step 2 quality checks

❌ **Forgetting branch name mismatch note**: Historical context lost
   → **Fix**: Add note in completion metadata if branch name doesn't match current categorization

✅ **Run [maintain-task-notes.md](maintain-task-notes.md) Mode 2 first**: Ensures archive-ready documentation
✅ **Use correct category subdirectories**: feature/, technical/, or incidental/
✅ **Complete metadata for planned work only**: Incidental work uses task list completion summary
✅ **Consistent naming**: `{type}-{name}.md` format everywhere
✅ **Clean commits**: Lint before committing, atomic archive commits
✅ **Document evolution**: Note categorization changes in completion metadata when applicable

---

**Version**: 3.0 | **Updated**: 2025-11-10

**Changelog**:

- v3.0 (2025-11-10): Updated archive timing to reflect branch lifecycle (ADR-013) - archive immediately when
  branch deleted (after merge). Added guidance for incidental work with separate branches vs. work on parent branch.
- v2.1 (2025-10-21): Reorganized archives into work-package subdirectories - all docs for a piece of work
  live together (no more nested prds/, tasks/, notes/, completion-metadata/ subdirectories)
- v2.0 (2025-10-20): Added three-way categorization (feature/technical/incidental), integrated
  maintain-task-notes as mandatory Step 2
- v1.0 (previous): Initial two-way categorization (feature/incidental) with nested doc-type subdirectories
