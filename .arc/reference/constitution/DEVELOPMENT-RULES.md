# Development Rules - CineXplorer

**Version:** 2.6 | **Updated:** 2025-10-13 | **Hash:** `g2k4m7p9`

Core development rules and quality standards for CineXplorer. These rules are **non-negotiable** and must be followed by all contributors, including AI assistants.

**For command patterns and environment context**, see [QUICK-REFERENCE.md](../QUICK-REFERENCE.md).

## AI Session Initialization Required

**Before starting ANY work, AI assistants must:**

1. **Confirm rules version:** "Acknowledging DEVELOPMENT-RULES v2.6, hash g2k4m7p9"
2. **Verify environment:** Follow Session Startup Protocol in CURRENT-SESSION.md (check working directory, Docker status, venv availability)
3. **State understanding:** Confirm commit protocols, task analysis, quality gates, "Leave It Cleaner" protocol, CURRENT-SESSION control, and feature branch workflow
4. **Verify context access:** Confirm access to required documents (QUICK-REFERENCE, AI-SHARED, META-PRD, etc.)
5. **Check branch status:** Verify current git branch and alignment with intended work

## Git & Commit Control

### Manual Commit Control

- **AI NEVER initiates commits** without explicit user approval or instruction
- **AI CAN execute commits** when user explicitly approves/instructs it
- **User approval required** for all git operations
- **MANDATORY:** Comprehensive task context analysis before any commit consideration (see atomic-commit workflow)
- AI reports completion with readiness report, then awaits commit instructions

### Feature Branch Workflow

- **All feature work** must happen on dedicated feature branches
- **Branch naming convention**: `feature/[feature-name]` (e.g., `feature/user-profile-editing`)
- **Branch creation**: Create new branch during task generation phase
- **Branch verification**: Always verify correct branch before committing
- **Merge strategy**: Preserve commit history when merging to main (no squash merge)
- **Branch cleanup**: Delete feature branches after successful merge

### Quality Gates (Zero Tolerance)

Before any commit consideration, ALL of the following must pass with **zero exceptions**. For specific commands, see [QUICK-REFERENCE.md](../QUICK-REFERENCE.md).

1. **Backend Tests**: 100% pass rate
   - **MUST run via Docker** (requires database connection to PostgreSQL/Redis)
   - **Test runner**: pytest (migration complete 2025-10-13, 103/103 tests converted)
   - **NEVER run from host venv** - tests require Docker network access
   - Zero failures acceptable

2. **Frontend Tests**: 100% pass rate
   - Run via Docker (npm test)
   - Zero failures acceptable

3. **Backend Linting**: Zero violations
   - Use Ruff with auto-fix capability
   - Options: host venv (fast) or Docker (consistent)
   - Every violation must be fixed

4. **Frontend Linting**: Zero violations
   - Run via Docker (npm run lint)
   - Every violation must be fixed

5. **TypeScript Checking**: Zero errors
   - Run via Docker (npm run type-check)
   - Every type error must be resolved

6. **Python Type Safety**: Pyright with django-types for minimal Any usage
   - Use Pyright via npx for fast checks
   - Optional: type check script for comprehensive per-app reporting
   - **PROHIBITED**: Using `typing.Any` except for external API payloads (TMDB, etc.)
   - **REQUIRED**: Use `object` for unknown data, `dict[str, object]` for generic dictionaries
   - **JUSTIFICATION**: Any `Any` usage must have inline comment explaining necessity
   - **Full guidelines**: See [Type Safety Strategy](../strategies/strategy-type-safety.md) for complete strategy
   - **Stub maintenance**: `backend/stubs/` must stay in sync with dependency versions (see strategy doc)

7. **Markdown Linting**: Zero violations
   - Use markdownlint-cli2 via npx with auto-fix
   - Config: `.markdownlint-cli2.jsonc` (MD034 bare URLs disabled only for temporal docs)
   - Gitignored files automatically excluded (notes/, archive/notes/, CURRENT-SESSION.md)
   - Every violation must be fixed

### Quality Gate Failure Protocol

If quality gates fail after sub-task completion:

1. **Report the failure** with specific details
2. **Identify suspected causes** and investigation areas
3. **Ask for guidance** on whether to fix immediately or defer
4. **Never proceed** to next sub-task until resolved or user approves

### Leave It Cleaner: Pre-existing Issue Protocol

**Principle:** When touching any file, leave it cleaner than you found it. Quality issues discovered during work should be addressed, not ignored.

**When quality checks reveal pre-existing issues in files you're modifying:**

1. **Assess severity and scope:**
   - **Minor issues** (< 5 minutes): Fix immediately without asking
   - **Moderate issues** (5-15 minutes): Fix immediately, document in commit
   - **Major issues** (> 15 minutes): Ask for direction before proceeding

2. **Required actions (choose one):**
   - ✅ **Fix immediately** - Preferred for all issues < 15 minutes
   - ✅ **Document and defer** - Create incidental task list with:
     - Clear description of issue found
     - Why it's being deferred (time/scope constraints)
     - Estimated effort to fix
     - Link to relevant files/line numbers
   - ❌ **Ignore silently** - NEVER acceptable

3. **Examples:**
   - Type errors in file you're editing → Fix with proper solution per [Type Safety Strategy](../strategies/strategy-type-safety.md)
   - Linting violations in modified file → Fix with auto-fix tools
   - Missing tests for existing function → Ask if should add now or defer
   - Deprecated API usage → Ask if should modernize now or defer

4. **Documentation requirements:**
   - Fixed issues: Note in commit message ("Also fixed X pre-existing issues")
   - Deferred issues: Create task list in `.arc/active/incidental/tasks-incidental-*.md`
   - Never: Leave issues undocumented or unaddressed

**Rationale:**
- Prevents technical debt accumulation
- Ensures quality gates actually improve codebase health
- Makes incremental progress on code quality with every change
- Documents intentional decisions when issues must be deferred

## Code Quality Principles

Apply standard software engineering principles to maintain clean, maintainable code:

### Core Principles

**DRY (Don't Repeat Yourself)**

- Extract repeated logic into reusable functions, components, or utilities
- Wait for 2-3 instances before abstracting (avoid premature optimization)
- Share types and interfaces instead of duplicating definitions

**SOLID Principles**

- **Single Responsibility**: Each component/function should have one clear purpose
- **Open/Closed**: Use composition and configuration over modification
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Keep interfaces focused and minimal
- **Dependency Inversion**: Depend on abstractions, not concrete implementations

**KISS (Keep It Simple)**

- Choose simple solutions over clever ones
- Prefer clarity over brevity when they conflict
- Question complexity - if it's hard to explain, simplify it

**YAGNI (You Aren't Gonna Need It)**

- Implement features when required, not when anticipated
- Start specific, generalize later when patterns actually emerge
- Delete unused code

### Practical Application

- **Separate concerns**: UI from business logic, data fetching from presentation
- **Use custom hooks** to abstract and share logic
- **Prefer composition** over inheritance or duplication
- **Design component APIs** that accept configuration
- **When principles conflict**: Favor readability and simplicity

## Session Documentation Control

### CURRENT-SESSION.md Update Protocol

- **AI NEVER updates CURRENT-SESSION.md** without explicit user instruction
- CURRENT-SESSION.md is a handoff document controlled by the user
- AI should report changes and progress but NOT modify this file during active work
- User decides when and how session documentation is updated
- Violating this rule breaks session continuity and coordination

## Task Management Protocol

### One Sub-Task Rule

- **Complete ONE sub-task at a time** - never bundle multiple deliverables
- **Mandatory stop** after each sub-task completion
- **Wait for explicit user approval** before starting next sub-task

### Sub-Task Granularity Guidelines

Break down a sub-task if it requires:

- More than 3 files to be modified
- More than 50 lines of core logic changes
- Multiple interdependent changes
- Complex debugging/investigation

### Documentation Updates

- **Immediate task list updates**: Mark `[x]` in task files after each sub-task
- **Update "Relevant Files"** section when files are created/modified
- **Never batch documentation updates** - do immediately after work

### Parent Task Completion

After completing all sub-tasks under a parent task:

1. **Run full quality gate checks**
2. **Check PROJECT-STATUS** for necessary updates
3. **Report completion** with standardized readiness report
4. **Wait for user approval** before proceeding

### PROJECT-STATUS Maintenance

- **After each sub-task**: Update task documentation only
- **After each parent task**: Check if PROJECT-STATUS needs updates
- **Regular accuracy checks**: Ensure PROJECT-STATUS reflects all recent work

## Testing Requirements

- **Test-first** for new models, API endpoints, and non-trivial business logic
- **Test-after** acceptable for simple CRUD, presentational UI, configuration tweaks
- **Integration focus**: Prefer flow-level coverage over isolated units when practical
- **Backend suite**: Run with `--keepdb` flag during development for speed
- **All tests must pass** before any commit discussion (see quality gates above)
- **Command patterns**: See [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) for execution commands
- **Detailed guidance**: See [Testing Methodology Strategy](../strategies/strategy-testing-methodology.md)

## Error Handling

### When Things Go Wrong

- **Report immediately** with full context
- **Provide diagnostic information** (error messages, stack traces)
- **Suggest investigation areas** based on the changes made
- **Wait for guidance** rather than attempting fixes without approval

### Never Proceed If

- Quality gates are failing
- Tests are broken
- Linting violations exist
- TypeScript errors are present
- User has not approved the next step

## Reference Documentation

This document provides core rules and standards. See related documentation:

- **[QUICK-REFERENCE.md](../QUICK-REFERENCE.md)** - Environment context, command patterns, and tool usage
- [Task Processing Workflow](../workflows/3-process-task-loop.md) - Detailed task execution workflow
- [Atomic Commit Workflow](../workflows/supplemental/atomic-commit.md) - Enhanced commit workflow with comprehensive task context analysis
- [AI Shared Context](../ai-instructions/AI-SHARED.md) - Complete project context for AI
- [Current Session](.arc/active/CURRENT-SESSION.md) - Session handoff template (untracked)
- [Technical Architecture](TECHNICAL-ARCHITECTURE.md) - Testing methodology details
- [Type Safety Strategy](../strategies/strategy-type-safety.md) - Type checking approach and patterns
- [Testing Methodology Strategy](../strategies/strategy-testing-methodology.md) - Testing philosophy and practices
