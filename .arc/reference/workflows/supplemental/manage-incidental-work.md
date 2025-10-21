# Manage Incidental Work Workflow

**Purpose**: Systematic workflow for creating, executing, and archiving incidental task lists discovered during feature development.

**Related**: [3-process-task-loop.md](../3-process-task-loop.md), [DEVELOPMENT-RULES.md](../../constitution/DEVELOPMENT-RULES.md)

---

## Overview

**Incidental work** is quality improvements, refactoring, or tech debt discovered during feature development
that should be fixed immediately rather than deferred. This workflow provides a complete lifecycle management system.

**Key Principle**: Incidental work is **reactive** (discovered during implementation) vs **proactive**
(planned feature work with PRDs).

---

## Decision Tree: When to Create Incidental Task Lists

### Create Incidental Task List When

- ✅ **Multiple subtasks needed** (>1 subtask)
- ✅ **Non-trivial effort** (>30 minutes estimated)
- ✅ **Cross-cutting concern** (affects multiple domains/files)
- ✅ **Quality improvement** discovered during feature work
- ✅ **Worth documenting** for future reference and handoffs
- ✅ **Blocks or significantly impacts current feature work**

### Do NOT Create Incidental Task List When

- ❌ **Simple fixes** (<30 min, 1 subtask) - just fix inline
- ❌ **Typos, formatting, trivial refactors** - fix without ceremony
- ❌ **Work already in main task list** - add subtasks there instead
- ❌ **Exploratory work** - use notes files instead
- ❌ **Can be deferred** - create issue/PRD for future sprint

### Examples

**Create incidental task list:**

- Type safety tooling incompatibility discovered (affects entire backend)
- Security vulnerability in authentication flow (critical, multi-step fix)
- Broken test infrastructure affecting reliability (cross-cutting, urgent)

**Fix inline (no task list):**

- Missing type annotation on single function
- Outdated comment in one file
- Linting violation in modified file

---

## Phase 1: Creation

### Step 1: Verify Need for Incidental Work

Before creating incidental task list:

1. **Confirm urgency**: Why fix now vs defer to future PRD?
2. **Estimate effort**: Is this >30 minutes with multiple subtasks?
3. **Assess impact**: Does this block or significantly impact current work?
4. **Check scope**: Is this truly incidental or should it be a planned feature?

**If uncertain**: Ask user for guidance on whether to address now or defer.

### Step 2: Create Incidental Task File

**File location**: `.arc/active/incidental/tasks-{brief-slug}.md`

**Naming convention**: `tasks-{brief-descriptive-slug}.md`

- Example: `tasks-backend-type-safety.md`
- Example: `tasks-security-updates.md`
- Example: `tasks-oauth-headless-migration.md`

**Note**: The `incidental/` directory already indicates this is incidental work, so the `incidental-` filename
prefix is omitted for clarity.

**Create file**:

```bash
touch .arc/active/incidental/tasks-{brief-slug}.md
 ```

**Use template** (see "Template" section below)

### Step 3: Track Incidental Task List Creation

**Immediately stage and suggest commit for context visibility**:

1. `git add .arc/active/incidental/tasks-{brief-slug}.md`
2. Show `git status` to confirm only the new file is staged
3. Propose a commit message (example below) and wait for user approval before running it

_Suggested message (show to user, do not execute until approved):_

```
docs({current-branch}): create {brief-slug} incidental task list

Triggered by {discovery context}.
Pausing {current work} to address {critical issue}.

Related to: .arc/active/feature/tasks-{main-feature}.md
```

**Why capture this commit early**:

- ✅ Git log shows when/why work was paused
- ✅ Session handoffs have full context
- ✅ Audit trail of priority shifts
- ✅ Team visibility into active work

### Step 4: Update CURRENT-SESSION.md

**Update session tracking** (after the task-list commit):

```markdown
**Last Completed**: Task X.Y from tasks-{main-feature}.md (paused for incidental work)
**Next Action**: Incidental work - {brief description}

### Paused/Deferred Work

**Paused Task Lists:**
- `.arc/active/feature/tasks-{main-feature}.md` - Task X.Y complete, paused at Task X.Y+1

**Resume Order After Incidental Work:**
1. Complete incidental work ({brief description})
2. Resume tasks-{main-feature}.md Task X.Y+1
```

**Note**: CURRENT-SESSION.md is gitignored (untracked). Update it only if you're actively using the session handoff workflow.

### Step 5: Create Notes File (Optional)

**For complex incidental work**, create a companion notes file (pairs well with [maintain-task-notes.md](maintain-task-notes.md)):

**File location**: `.arc/active/incidental/notes-{same-slug}.md`

**Notes are gitignored** - use for:

- Research findings
- Error diagnostics
- Exploratory work
- Scratch calculations

---

## Phase 2: Execution

### Follow Standard Task Loop Workflow

Incidental work follows **same rules** as feature work:

1. **One sub-task at a time** - never bundle multiple deliverables
2. **Mandatory stop** after each sub-task completion
3. **Wait for explicit user approval** before starting next sub-task
4. **Run incremental quality checks** after each sub-task
5. **Update task list immediately** - mark `[x]` after completion

See [3-process-task-loop.md](../3-process-task-loop.md) for detailed workflow.

### Commit Standards for Incidental Work

**Commit message structure** (present to user for approval):

```
{type}({branch}): {description}

{details}

Complete incidental task {X.Y}
Related to: .arc/active/incidental/tasks-{slug}.md
```

**Pick an appropriate type** (`refactor`, `fix`, `config`, `test`, `feat`) and use the current branch as the scope.

**Examples**:

Example proposals to show the user:

```
config(api-layer-p2): replace django-stubs with django-types

- Install django-types 0.22.0 (Pyright-compatible)
- Remove django-stubs (requires MyPy plugin)
- Update pyrightconfig.json for django-types

Complete incidental task 2.2
Related to: .arc/active/incidental/tasks-backend-type-safety.md
```

```
fix(api-layer-p2): add rate limiting to authentication endpoints

- Configure throttle classes on login/register
- Add tests for rate limit enforcement

Complete incidental task 3.1
Related to: .arc/active/incidental/tasks-security-updates.md
```

### Update Task List During Execution

**Commit task list updates** alongside code changes:

**After completing a subtask**

1. Stage the task list plus associated code changes (`git add …`).
2. Show `git status` so the user sees exactly what will be committed.
3. Propose a commit message that calls out the subtask completion, then pause for approval. Example:

   ```
   {type}({branch}): {description}

   - Mark task {X.Y} complete

   Related to: .arc/active/incidental/tasks-{slug}.md
   ```

4. Only run `git commit` after the user gives an explicit “yes”.

**Why commit task list with code**:

- ✅ Git history shows task progress with implementation
- ✅ Rollback captures both code and documentation state
- ✅ Session handoffs show exact progress point

---

## Phase 3: Completion

### Step 1: Verify Full Completion

Before archiving, ensure:

- ✅ All subtasks marked `[x]` in task list
- ✅ All quality gates passing (tests, linting, type checking, markdown)
- ✅ All related code committed and merged to current branch
- ✅ Follow-up work documented (if any) in new task lists

### Step 2: Update Completion Notes in Task List

**Add to bottom of task list** (before archiving). Keep only sections that apply; delete placeholders that have no content:

```markdown
## Completion Notes

**Completion Date**: {YYYY-MM-DD}

**Summary**:
- {1-2 sentence summary of what was accomplished}
- {Key outcomes or improvements}
- {Metrics if applicable: error counts, test coverage, performance}

**Tooling/Architecture Changes** (if applicable):
- {Major changes to build tools, dependencies, CI/CD}
- {New patterns or standards introduced}

**Files Changed**:
- {Count of files modified/created/deleted}
- {Key files and their purpose}

**Follow-Up Work Created** (if any):
- `.arc/active/incidental/tasks-{follow-up-slug}.md` ({brief description})
- {Estimated effort for follow-up}

**References**:
- {Links to key commits}
- {Links to external research or documentation}
- {Links to related PRDs or task lists}

**Next Steps**:
1. {What to do after this incidental work completes}
2. {Which paused work to resume}
```

### Step 3: Update Documentation (Before Archiving)

**IMPORTANT**: Update all tracked documentation **BEFORE** suggesting commit.

**Check and update if needed** (skip anything untouched):

1. `PROJECT-STATUS.md` – add the improvement, refresh metrics if they moved.
2. Relevant `strategy-*.md` files – capture any new patterns or best practices.
3. Constitution docs – update `DEVELOPMENT-RULES.md` / `TECHNICAL-ARCHITECTURE.md` if standards changed.
4. Related task lists – unblock dependent tasks or refresh references.

### Step 4: Move to Archive

**Archive path depends on whether notes exist:**

- **Without notes** (simple task list): `.arc/reference/archive/incidental/tasks-{slug}.md`
- **With notes** (work package): `.arc/reference/archive/incidental/{slug}/` (all files together)

**Use git mv** (file is tracked):

```bash
# Without notes - move to incidental root
git mv .arc/active/incidental/tasks-{slug}.md \
       .arc/reference/archive/incidental/

# With notes - create subdirectory and move all files
mkdir -p .arc/reference/archive/incidental/{slug}
git mv .arc/active/incidental/tasks-{slug}.md \
       .arc/reference/archive/incidental/{slug}/
mv .arc/active/incidental/notes-{slug}.md \
   .arc/reference/archive/incidental/{slug}/
```

### Step 5: Suggest Atomic Commit of All Changes

**IMPORTANT**: AI suggests commit, **NEVER initiates** without user approval.

**Commit includes**:

- Archived task list (moved to archive)
- Updated PROJECT-STATUS.md (if modified)
- Updated strategy documents (if modified)
- Updated constitution documents (if modified)
- Updated related task lists (if modified)

**Suggested commit format** (for user approval):

```
docs({branch}): archive incidental work - {brief description}

Completed all subtasks for {incidental work description}.
Resuming {main work description}.

Summary: {1-2 sentence outcome}

Changes:
- Archive tasks-{slug}.md with completion notes
- Update PROJECT-STATUS.md with {improvements}
- Update {strategy/constitution docs} to reflect {changes}

Related to: .arc/active/feature/tasks-{main-feature}.md
```

**AI workflow**:

1. Stage all relevant files (`git add …`), then show `git status`
2. Present the proposed commit message/template above
3. **Wait for user approval** before running `git commit`
4. Execute the commit only after explicit approval

### Step 6: Update CURRENT-SESSION.md (After Commit)

**IMPORTANT**: Update CURRENT-SESSION.md **AFTER** commit, not before.

**Why this order**:

- ✅ All tracked documentation changes included in commit
- ✅ CURRENT-SESSION.md doesn't contain stale commit references
- ✅ Session state reflects post-commit reality

**Update session tracking**:

```markdown
**Last Completed**: Incidental work - {brief description} (archived)
**Next Action**: Resume Task X.Y from tasks-{main-feature}.md

### Paused/Deferred Work

**Paused Task Lists:**
- `.arc/active/feature/tasks-{main-feature}.md` - Resume at Task X.Y
```

### Step 7: Resume Main Work

Return to paused feature work and continue normal workflow.

---

## Incidental Task List Template

```markdown
# Incidental Work: {Title}

**Created**: {YYYY-MM-DD}
**Triggered By**: Task {X.Y} in tasks-{feature-name}.md
**Status**: In Progress / Complete
**Estimated Effort**: {X minutes / Y hours}

## Context

**Why Now**: {Why fix immediately instead of deferring to future PRD}

**Discovery**: {How this issue was discovered during main task work}

**Impact**: {What improves if we fix this - quality, consistency, tech debt reduction}

## Scope

**Will Do**:
- {Specific changes that will be made}
- {Expected outcomes}
- {Target metrics or completion criteria}

**Won't Do** (deferred to {future-work-reference}):
- {Out of scope items}
- {Future improvements}
- {Why these are deferred}

## Tasks

- [ ] 1. {Task 1 with clear deliverable}
  - [ ] 1.1 {Sub-subtask if needed}
  - [ ] 1.2 {Sub-subtask if needed}
- [ ] 2. {Task 2 with quality gate}
  - [ ] 2.1 {Sub-subtask}
- [ ] 3. {Task 3 with verification step}
  - [ ] 3.1 {Sub-subtask}

## Implementation Notes

### {Decision/Pattern Name}

**{Context}:**
- {Key technical decisions made}
- {Rationale for approach chosen}
- {Alternatives considered and rejected}

## Completion Notes

{Added at completion - see Phase 3, Step 2 above}
```

---

## Best Practices

### Scope Management

- **Start small**: Resist scope creep - defer non-critical improvements
- **Document deferrals**: Create follow-up task lists for discovered work outside scope
- **Time-box**: If effort exceeds 2x estimate, stop and reassess with user

### Communication

- **Keep user informed**: Report progress after each subtask
- **Flag blockers**: Immediately report unexpected complexity or blockers
- **Suggest pivots**: If better approach discovered, propose and get approval

### Quality

- **No shortcuts**: Incidental work follows same quality standards as feature work
- **Test thoroughly**: Incidental fixes must not break existing functionality
- **Document decisions**: Capture "why" not just "what" in implementation notes

### Nested Incidental Work

**If incidental work spawns MORE incidental work**:

1. **Assess criticality**: Is new issue blocking current incidental work?
2. **Get user approval**: Don't auto-create nested incidental work
3. **Document relationship**: Link nested task list to parent incidental work
4. **Track in CURRENT-SESSION**: Show full dependency chain

**Example**:

- Main feature: API Layer Modernization
    - Incidental: Security Updates (discovered during feature work)
        - Nested Incidental: Type Safety Tooling Fix (discovered during security updates)

---

## Directory Structure

### Active Work

```
.arc/active/
├── CURRENT-SESSION.md           # Session tracking (gitignored)
├── feature/
│   ├── prd-{feature}.md         # Feature PRD
│   ├── tasks-{feature}.md       # Feature task list
│   └── notes-{feature}.md       # Feature notes (gitignored)
└── incidental/
    ├── tasks-{slug}.md     # Incidental task list
    └── notes-{slug}.md     # Incidental notes (gitignored)
```

### Archived Work

```
.arc/reference/archive/
├── feature/
│   └── {name}/                       # Work package subdirectories
│       ├── prd-{name}.md
│       ├── tasks-{name}.md
│       ├── notes-{name}.md (optional)
│       └── completion-{name}.md
├── technical/
│   └── {name}/                       # Work package subdirectories
│       ├── prd-{name}.md
│       ├── tasks-{name}.md
│       ├── notes-{name}.md (optional)
│       └── completion-{name}.md
└── incidental/
    ├── {name}/                       # Work package (if has notes)
    │   ├── tasks-{name}.md
    │   └── notes-{name}.md
    └── tasks-{name}.md    # Simple task list (no notes, stays in root)
```

**Key Points**:

- ✅ Only `CURRENT-SESSION.md` remains in `.arc/active/` root
- ✅ Task lists tracked by git (context visibility)
- ✅ Notes files gitignored until archival (scratch paper)
- ✅ Archive uses work-package subdirectories (all docs for a work item together)

---

## Common Pitfalls

### ❌ Creating incidental work for planned features

**Problem**: Using incidental workflow for work that should be a PRD.

**Solution**: If work is strategic (new capability, major refactor), create PRD instead.

### ❌ Forgetting to update paused work references

**Problem**: Resuming wrong task after incidental work completes.

**Solution**: Always update CURRENT-SESSION.md and paused task list cross-references.

### ❌ Archiving before all documentation updated

**Problem**: PROJECT-STATUS.md out of date, strategy docs stale.

**Solution**: Update all tracked docs **before** archive commit, CURRENT-SESSION.md **after**.

### ❌ Not documenting completion notes

**Problem**: Archived task list lacks context on what was achieved.

**Solution**: Always add comprehensive completion notes before archiving.

---

## Related Workflows

- [3-process-task-loop.md](../3-process-task-loop.md) - Main task execution workflow
- [atomic-commit.md](atomic-commit.md) - Commit message standards
- [archive-completed-features.md](archive-completed-features.md) - Feature archival process
- [DEVELOPMENT-RULES.md](../../constitution/DEVELOPMENT-RULES.md) - Core development standards

---

## Changelog

- **2025-10-09**: Initial creation - extracted from process-task-loop.md
    - Added comprehensive lifecycle: creation → execution → archival
    - Defined commit order: docs update → commit → CURRENT-SESSION update
    - Documented new directory structure with `feature/` and `incidental/` subdirs
