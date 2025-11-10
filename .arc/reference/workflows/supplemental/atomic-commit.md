# Atomic Commit Workflow

**Note**: This workflow is for AI execution when explicitly instructed by the user.
AI should NEVER initiate this workflow without user approval.  See DEVELOPMENT-RULES.md for complete protocols.

Break changes into logical, atomic commits with clear messages.

steps:

- name: Check Status
  command: git status
  description: Review all pending changes and verify current branch

- name: Review Changes
  command: git --no-pager diff --stat
  description: Get overview of changed files and line counts

- name: Comprehensive Task Context Analysis
  description: |
  **MANDATORY**: Before committing, perform comprehensive analysis of ALL uncommitted changes
  in the context of current task documentation:

  **Step 1: Identify All Changes**
    - Run `git status` and `git --no-pager diff --name-only` to see all modified files
    - Examine changes that might not be immediately obvious (config files, documentation, etc.)
    - Look for task documentation files that may have been updated

  **Step 2: Find Relevant Task Documentation**
    - Check [active tasks](.arc/active/) for active task lists related to current work
        - Feature work: `.arc/active/feature/`
        - Technical work: `.arc/active/technical/`
        - Incidental work: `.arc/active/incidental/`
    - Also check [backlog tasks](.arc/backlog/) for additional relevant tasks
        - `.arc/backlog/feature/` and `.arc/backlog/technical/`
    - Look for task files that reference modified files or related functionality
    - Use `find .arc -name "*.md" -exec grep -l "pagination" {} \;` to find related tasks
      (replace "pagination" with relevant keyword, e.g., "authentication", "api-layer", etc.)
    - This task list reference will be used in Context: footer of commit message

  **Step 3: Analyze Task Progress Context**
    - Compare actual work completed against task documentation
    - Identify which specific subtasks were completed by your changes
    - Check if completing subtasks makes any parent tasks complete
    - Verify that task status in documentation matches actual implementation

  **Step 4: Validate Milestone Context**
    - Determine if changes complete major milestones (e.g., "Backend PoC Complete")
    - Check if this is partial progress toward a larger goal vs. completion of a phase
    - Identify remaining work required for full phase/milestone completion

  **Step 5: Update Task Documentation**
    - Mark completed subtasks as [x] in task files
    - Mark parent tasks as [x] ONLY if ALL subtasks are complete
    - Update any progress notes or status indicators
    - Add any new tasks that were discovered during implementation

  **Step 6: Determine Context Footer**
    - Task list work: MUST use task list filename WITH parenthetical:
        - (Task X.Y) for specific task work
        - (incidental - discovered during Task X.Y) for incidental during task
        - (planning) for task list maintenance
    - Non-task-list work: MUST use boundary category WITH parenthetical:
        - (no associated task list) - for emergent work, quick fixes
        - (atomic / no associated task list) - for work from ATOMIC-TASKS.md or atomic emergent work
        - Boundary categories: planning, documentation, maintenance, refactor

- name: Plan Commits
  description: |
  Organize changes into logical groups:

  1. Core functionality (new features, major logic)
  2. Configuration/Infrastructure (settings, configs)
  3. Tests (test files, test configurations)
  4. Documentation - Task list updates (use task list Context:)
  5. Documentation - Boundary scenarios (use category Context: if no task list)
  6. Code formatting (linting fixes, style)
  7. Dependencies (package.json, requirements)
  8. Cleanup (removals, refactoring)

- name: Create Atomic Commits
  description: |

  ## Commit Message Standard

  All commits must follow this format:

  ```
  <type>(scope): Brief description (50-72 chars)

  - Key change (1-2 lines)
  - Rationale (1-2 lines)
  - Impact if significant (1-2 lines)

  Context: [task-reference or category]
  ```

  **Body limits:** 10-15 lines (20-25 for milestones), 1-2 lines per bullet

  **Types:** `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf` `config`

  **Scope:** Functional area (auth, movie, api, tests, types, config, docs, arc, deps)

  ## Context Footer Format

  **With task list (most common):**

  ```bash
  Context: tasks-[exact-filename].md (Task X.Y)              # Single task
  Context: tasks-[exact-filename].md (Tasks X.Y-X.Z)         # Sequential range
  Context: tasks-[exact-filename].md (Tasks X.Y, A.B, C.D)   # Non-contiguous
  Context: tasks-[exact-filename].md (planning)              # Task list maintenance
  ```

  **Incidental without dedicated task list:**

  ```bash
  Context: tasks-[parent-filename].md (incidental - discovered during Task X.Y)
  ```

  **Task list planning/maintenance:**

  ```bash
  Context: tasks-[exact-filename].md (planning)      # Adding/updating tasks in existing list
  ```

  **No associated task list (boundary scenarios):**

  ```bash
  # Standard pattern (emergent work, not pre-documented)
  Context: planning (no associated task list)        # PRD creation, NEW task list generation
  Context: documentation (no associated task list)   # PROJECT-STATUS, README, ARC framework updates
  Context: maintenance (no associated task list)     # Dependencies, tooling, configuration
  Context: refactor (no associated task list)        # Quality improvements, cleanup discovered during reviews

  # Atomic pattern (from ATOMIC-TASKS.md or atomic emergent work)
  Context: maintenance (atomic / no associated task list)     # Quick fixes, chores, routine upkeep
  Context: refactor (atomic / no associated task list)        # Small code restructuring, helper extraction
  Context: documentation (atomic / no associated task list)   # Quick doc updates
  Context: planning (atomic / no associated task list)        # Small planning/strategy updates
  ```

  **Note:** Both patterns valid. Use "atomic / no associated task list" for:
    - Work from `active/ATOMIC-TASKS.md`
    - Emergent atomic work (small, one-off tasks)
    - Emphasizes atomic nature vs complex task list work

  **Parent task completion:**
  Add single line before Context: footer:

  ```bash
  Completes parent task X.0: [Parent Task Name]
  ```

  ## Mandatory Rules

  **Required:**

    - ✅ Conventional Commits format: `<type>(scope): description`
    - ✅ Subject 50-72 characters
    - ✅ Context: footer with REQUIRED parenthetical (task reference OR boundary category)
    - ✅ Task numbers: "Task 3.6" NOT "Phase 3.6"
    - ✅ Body: 10-15 lines (20-25 max for milestones)

  **Prohibited:**

    - ❌ PRD references (use task list instead)
    - ❌ Display names (use exact filenames)
    - ❌ Checkbox lists in body
    - ❌ Implementation details (code shows what, commits show why)
    - ❌ "Phase X.Y" when referring to tasks

  ## Complete Examples

  ### Standard Single Task

  ```
  fix(movie): resolve buffer pagination duplicate issue

  - Smart buffer now tracks consumed TMDB pages via metadata
  - Prevents duplicate movies appearing across pagination
  - Maintains consistent 20-result pages with restrictive filters

  Context: tasks-pagination-buffer-tracking.md (Task 2.1)
  ```

  ### Multiple Tasks

  ```
  refactor(api): extract service layer for movie operations

  - Extracted MovieService class with business logic
  - Updated discover/search endpoints to use service layer
  - Added comprehensive service layer test coverage

  Context: tasks-api-layer-modernization.md (Tasks 3.1-3.4)
  ```

  ### Parent Task Completion

  ```
  test(movie): verify rating filter accuracy in manual testing

  - Tested rating ranges 1.0-3.5, 0-6.0, 8.5-10.0
  - Verified accurate filtering with vote_count threshold
  - All 368 backend + 351 frontend tests passing

  Completes parent task 3.0: Manual Testing Phase

  Context: tasks-filter-integration-testing.md (Task 3.6)
  ```

  ### Incidental Without Task List

  ```
  style(types): fix variable naming convention

  - Changed MAX_BUFFER_PAGES to max_buffer_pages
  - Resolves ruff N806 violation

  Context: tasks-pagination-buffer-tracking.md (incidental - discovered during Task 2.1)
  ```

  ### Planning Work - New Task List

  ```
  docs(arc): create PRD for pagination improvements feature

  - Analyzed current pagination limitations
  - Defined solution approach with metadata tracking
  - Generated initial task breakdown (7 phases)

  Context: planning (no associated task list)
  ```

  ### Planning Work - Updating Existing Task List

  ```
  docs(arc): add Task 3.7 for metadata persistence across navigation

  - Discovered during tasks-navigation-filter-state-preservation.md (Task 3.3)
  - Pagination metadata lost on component remount
  - Task 3.7 adds URL persistence using filter param pattern
  - Follows TDD structure

  Context: tasks-pagination-buffer-tracking.md (planning)
  ```

  ### Repository Maintenance (Atomic)

  ```
  chore(deps): update Django to 5.2.8 security patch

  - Updated Django from 5.2.7 to 5.2.8
  - Addresses CVE-2024-XXXXX
  - All tests passing post-update

  Context: maintenance (atomic / no associated task list)
  ```

  ### Quick Documentation Update (Atomic)

  ```
  docs(arc): update AGENTS.md with backlog structure

  - Added backlog organization section
  - Clarified TASK-INBOX.md and ATOMIC-TASKS.md purpose
  - Updated discovery mechanism description

  Context: documentation (atomic / no associated task list)
  ```

  ## Commit Message Guidelines

  **Focus on WHY and IMPACT:**

    - ✅ "Prevents duplicate movies across pages" (impact)
    - ✅ "Improves query performance by 40%" (measurable)
    - ❌ "Changed function name" (code shows this)

  **Provide context for future readers:**

    - What problem existed?
    - What solution was chosen?
    - What impact does this have?

  **Keep it scannable:**

    - One idea per bullet
    - 1-2 lines max per bullet
    - Active voice

  **Remember:** Commit messages should accurately reflect WHERE the project stands after the commit.
  All commits should be independently understandable without extensive archaeology.

- name: Verify Commits
  command: git log --oneline -10
  description: Review recent commit messages for clarity

- name: Final Check
  command: git status
  description: Ensure all changes are committed and verify branch state

notes: |

## Planned Work Branch Practices

- Verify you're on the correct feature/technical branch before committing
- Branch naming: `feature/[name]` for user-facing work, `technical/[name]` for infrastructure
- Incidental work commits to feature/technical branch (no separate branches)
- Preserve commit history when merging (no squash merge)
- Clean up branches after successful merge

## Task Documentation Requirements

- **MANDATORY**: Perform comprehensive task context analysis before every commit
- Always include Context: footer with exact task list filename or boundary category
- Mark parent tasks [x] when all subtasks complete, in same commit as final subtask
- Verify task status in files matches actual implementation
- Follow [Task Processing Workflow](../3-process-task-loop.md) completion protocol
- See [Work Organization Strategy](../../strategies/arc/strategy-work-organization.md) for branch naming

---

Commit messages should accurately reflect WHERE the project stands after the commit,
not just what changed. This includes identifying remaining work and providing proper milestone context.
