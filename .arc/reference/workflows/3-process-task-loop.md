-# Task List Management

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Task Implementation

- **One sub-task at a time:** Do **NOT** start the next sub‑task until you ask the user for permission and they say "yes" or "y"
- **Test-first approach:** For new models, APIs, and complex logic, write tests before implementation
- **Incremental quality checks:** Run linting and type checking on modified files after each sub-task (Ruff for linting with auto-fix, Pyright for fast type checks, mypy for optional full-project CI/periodic validation)
- **Immediate documentation:** Update the task list file immediately after completing each subtask
- **Completion protocol:**

  1. When you finish a **single sub‑task**:
     - **First**: Immediately mark it as completed by changing `[ ]` to `[x]` in the task list file
     - **Second**: Update the "Relevant Files" section if new files were created or modified
     - **Third**: **MANDATORY STOP** - Pause and ask for user review/approval of the subtask completion
     - **Fourth**: Only proceed to next subtask with explicit user permission ("proceed to 4.x" or "y")
     - **NEVER** continue to multiple subtasks without explicit user approval for each one

  2. If **all** subtasks underneath a parent task are now `[x]`, follow this sequence:

    - **First**: Ensure new code has appropriate test coverage (models, APIs, complex logic)
    - **Second**: Run the full test suite (`python manage.py test --settings=config.settings_test`, `npm test`, etc.)
    - **Third**: Run all linting checks (`ruff check apps/ config/`, `python scripts/type_check.py` [runs hybrid Pyright+mypy; requires `npm install` for pyright], `npm run lint`, `npm run type-check`, `npx markdownlint-cli2 "**/*.md"`)
    - **Fourth**: Check if [PROJECT-STATUS](.arc/reference/constitution/PROJECT-STATUS.md) needs updates (feature progress, completed functionality, updated priorities)

  3. Generate standardized readiness report (see [Development Rules](../constitution/DEVELOPMENT-RULES.md) for format) and await user instructions on how to proceed. User may choose to commit changes (AI can execute only if explicitly approved to do so) or review first. When committing, follow [Atomic Commit Workflow](atomic-commit.md) guidelines:

    - Uses conventional commit format (`feat:`, `fix:`, `refactor:`, etc.)
    - Summarizes what was accomplished in the parent task
    - Lists key changes and additions
    - **Accurately references the specific task number being completed** (e.g., "Complete task {TASK_ID}" where {TASK_ID} is the actual subtask like "4.2.3")
    - References the PRD context and current branch {BRANCH}
    - **Formats the message as a single-line command using `-m` flags**, replacing placeholders with real values:

      ```
      git commit -m "feat({BRANCH}): add payment validation logic" -m "- Validates card type and expiry" -m "- Adds unit tests for edge cases" -m "Complete task {TASK_ID}" -m "Related to Payment PRD"
      ```

      Example with real values:

      ```
      git commit -m "feat(feature/payment-flow): add payment validation logic" -m "- Validates card type and expiry" -m "- Adds unit tests for edge cases" -m "Complete task 4.2.3" -m "Related to Payment PRD"
      ```

  4. Once the user commits changes, mark the **parent task** as completed in task documentation.
  5. **Verify task documentation accuracy** - ensure task status matches what was actually completed.

### Incremental Quality Checks

After each sub-task, run relevant quality checks on modified files only:

**Backend Files** (Python):

```bash
# Lint specific files (with auto-fix)
# Option 1: Docker (consistent across environments)
docker compose -f infrastructure/docker-compose.yml exec backend ruff check apps/path/to/file.py --fix
# Option 2: WSL2 host venv (faster)
.venv-backend/bin/ruff check backend/apps/path/to/file.py --fix

# Type check specific files
# Option 1: Pyright via npx (fastest, from project root)
npx pyright backend/apps/path/to/file.py --project backend
# Option 2: Django-aware mypy via Docker
docker compose -f infrastructure/docker-compose.yml exec backend mypy apps/path/to/file.py --config-file mypy.ini

# Note: Ruff is very fast with auto-fix; Pyright for quick type checks; mypy for Django-aware validation
```

**Frontend Files** (TypeScript/JavaScript):

```bash
# Lint specific files
docker-compose exec frontend npm run lint -- path/to/modified/file.ts

# Type check (runs on entire project but focuses on errors)
docker-compose exec frontend npm run type-check
```

**Fix issues immediately** - don't accumulate technical debt across sub-tasks.

### Feature Branch Management

#### Starting Feature Work

- **Ensure correct branch**: Verify you're on the feature branch (e.g., `feature/user-profile-editing`)
- **Check branch status**: `git status` should show the feature branch as current
- **If not on feature branch**: `git checkout feature/[feature-name]`

#### During Task Execution

- **All commits go to feature branch**: Normal atomic commit workflow applies within the branch
- **Stay on feature branch**: Don't switch branches during active task work
- **Branch context in handoffs**: Include current branch in any AI context handoffs

#### Feature Completion

When all parent tasks are complete and ready for integration:

1. **Final quality gates**: All tests pass, zero linting violations, zero type errors
2. **Generate completion report**: Use standardized format from DEVELOPMENT-RULES.md
3. **Await user approval**: User decides when to merge to main
4. **Merge process** (user executes):

   ```bash
   git checkout main
   git merge feature/[feature-name]  # Preserve commit history
   git branch -d feature/[feature-name]  # Clean up feature branch
   ```

5. **Update [PROJECT-STATUS](.arc/reference/constitution/PROJECT-STATUS.md)**: Move feature from "In Progress" to "Completed"

### PROJECT-STATUS Maintenance

- **After each sub-task**: Update task documentation only
- **After each parent task**: Check if [PROJECT-STATUS](.arc/reference/constitution/PROJECT-STATUS.md) needs updates:
    - Feature progress milestones reached
    - Newly completed functionality to highlight
    - Updated timelines or priorities
    - Dependencies that are now resolved
    - Any other work completed outside the current task list

- **Stop after each individual sub‑task and wait for the user's go‑ahead**
- **Never complete multiple subtasks in one implementation cycle** - each subtask represents a discrete deliverable that requires individual review
- **Each subtask should be documented and approved before moving forward**

## Incidental Work Management

### When to Create Incidental Task Lists

While working on tasks in the main feature task list, you may discover quality improvements, refactoring opportunities, or tech debt that should be fixed immediately rather than deferred. Use an incidental task list when:

- **Multiple subtasks needed** (>1 subtask)
- **Non-trivial effort** (>30 minutes estimated)
- **Cross-cutting concern** (affects multiple domains/files)
- **Quality improvement** discovered during feature work
- **Worth documenting** for future reference and handoffs

**Don't use incidental tasks for**:
- Simple fixes (<30 min, 1 subtask) - just fix inline
- Typos, formatting, trivial refactors - fix without ceremony
- Work already in main task list - add subtasks there
- Exploratory work - use notes files instead

### Incidental Task Workflow

**1. Creation** (when issue discovered):

```bash
# Create incidental task file (untracked during active work)
touch .arc/active/tasks-incidental-{brief-slug}.md
```

**File structure** (use template below):
- **Triggered by**: Which main task led to discovery
- **Rationale**: Why fix now vs defer
- **Scope**: What will/won't be done
- **Subtasks**: Breakdown with quality gates

**Update CURRENT-SESSION.md**:

```markdown
**Last Completed**: Task X.Y (paused for incidental work)
**Next Action**: Incidental work - {brief description}
```

**2. Execution**:
- Follow normal task-loop rules (one subtask at a time, quality gates, approval)
- Run incremental quality checks after each subtask
- Commit with conventional format: `refactor(incidental): {description}`
- Reference incidental task file in commit body

**3. Completion and Archiving**:

```bash
# Move to archive (becomes tracked)
git mv .arc/active/tasks-incidental-{slug}.md .arc/reference/archive/tasks/tasks-incidental-{slug}.md

# Add completion notes to file before archiving
# Include: what was done, files changed, any follow-up needed
```

**Update CURRENT-SESSION.md**:

```markdown
**Last Completed**: Incidental work - {brief description}
**Next Action**: Resume Task X.Y
```

**Commit the archive**:

```bash
git add .arc/reference/archive/tasks/tasks-incidental-{slug}.md
git commit -m "docs: Archive incidental work - {brief description}"
```

**4. Resume Main Work**:
- Return to paused task in main feature task list
- Continue normal workflow

### Incidental Task File Template

```markdown
# Incidental Work: {Title}

**Created**: {YYYY-MM-DD}
**Triggered By**: Task {X.Y} in {feature-name}
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

**Won't Do** (deferred to {future-work-reference}):
- {Out of scope items}
- {Future improvements}

## Tasks

- [ ] {Subtask 1 with clear deliverable}
  - [ ] {Sub-subtask if needed}
- [ ] {Subtask 2 with quality gate}
- [ ] {Subtask 3 with verification step}

## Relevant Files

- `{file-path}`: {What changed and why}
- `{file-path}`: {What changed and why}

## Completion Notes

{Summary of what was accomplished}
{Any follow-up needed}
{References to commits}
```

### Gitignore Configuration

Incidental task files are untracked while in `.arc/active/` (work in progress), and become tracked when moved to `.arc/reference/archive/tasks/` (completed work).

Add to `.gitignore`:

```gitignore
# Incidental work task lists (untracked during active work)
.arc/active/tasks-incidental-*.md
```

### Archive Organization

Completed incidental work is archived with original filename preserved:

```
.arc/reference/archive/tasks/
  tasks-incidental-auth-service-extraction.md
  tasks-incidental-path-alias-standardization.md
  tasks-incidental-type-safety-cleanup.md
```

**Benefits of preserving `tasks-` prefix**:
- All task files share common prefix for easy globbing: `tasks-*.md`
- Clear grouping when browsing archive directory
- Consistent naming regardless of location (active vs archive)

## Task List Maintenance

1. **Update the task list as you work:**

   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

## AI Instructions

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **sub‑task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
   - **Verify parent task completion happens in documentation commits**.
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which **single sub‑task** is next.
6. **Complete only ONE subtask at a time** - never bundle multiple subtasks together.
7. After implementing a **single sub‑task**:
   - **Run incremental quality checks** on modified files (linting, hybrid type checking)
   - **Do not mark the subtask [x] until all checks pass (0 errors)**
   - **Fix any issues immediately** before marking complete
   - Update the task list file immediately (mark subtask as [x])
   - Update "Relevant Files" section if applicable
   - Pause and request user review/approval of the specific subtask completion
   - Wait for explicit permission before starting the next subtask
8. **Generate standardized readiness reports** using format from DEVELOPMENT-RULES.md
9. **Never initiate commits** without explicit user approval - await commit instructions
10. **Never assume subtasks can be grouped** - each represents an individual deliverable requiring separate approval.
