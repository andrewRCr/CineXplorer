# Development Rules - CineXplorer

**Version:** 2.11 | **Updated:** 2025-10-31 | **Hash:** `k7m3p9w2`

Core development rules and quality standards for CineXplorer. These rules are **non-negotiable** and must be followed
by all contributors, including AI assistants.

**For command patterns and environment context**, see [QUICK-REFERENCE.md](../QUICK-REFERENCE.md).
**For session initialization protocol**, see [session-init.md](../workflows/supplemental/session-init.md).

## Manual Commit Control

- **AI NEVER initiates commits** without explicit user approval or instruction
- **AI CAN execute commits** when user explicitly approves/instructs it
- **User approval required** for all git operations
- **MANDATORY:** Comprehensive task context analysis before any commit consideration (see atomic-commit workflow)
- **Task list accuracy required**: Before commit consideration, verify task documentation reflects completed work
  (parent task marked `[x]` if all subtasks complete)
- **Never commit stale task docs**: Task list updates must be saved and included in commits for completed work
- AI reports completion, then awaits commit instructions

### Quality Gates (Zero Tolerance)

Before any commit consideration, ALL of the following must pass with **zero exceptions**.
For specific commands, see [QUICK-REFERENCE.md](../QUICK-REFERENCE.md).

**Zero Tolerance Policy:** All errors, violations, and failures must be fixed. No exceptions.

1. **Backend Tests**: 100% pass rate
   - **MUST run via Docker** (requires database connection to PostgreSQL/Redis)
   - **Test runner**: pytest (migration complete 2025-10-13, 103/103 tests converted)
   - **NEVER run from host venv** - tests require Docker network access

2. **Frontend Tests**: 100% pass rate
   - Run via Docker (npm test)

3. **Backend Linting**
   - Use Ruff with auto-fix capability
   - Options: host venv (fast) or Docker (consistent)

4. **Frontend Linting**
   - Run via Docker (npm run lint)

5. **TypeScript Checking**
   - Run via Docker (npm run type-check)

6. **Python Type Safety**: Pyright with django-types for minimal Any usage
   - Use Pyright via npx: `npx pyright backend/apps/ backend/config/ --project backend`
   - **IMPORTANT**: Use directories or no args, NOT individual files (config may not apply)
   - Optional: type check script for comprehensive per-app reporting
   - **PROHIBITED**: Using `typing.Any` except for external API payloads (TMDB, etc.)
   - **REQUIRED**: Use `object` for unknown data, `dict[str, object]` for generic dictionaries
   - **JUSTIFICATION**: Any `Any` usage must have inline comment explaining necessity
   - **Full guidelines**: See [Type Safety Strategy](../strategies/strategy-type-safety.md) for complete strategy
   - **Stub maintenance**: `backend/stubs/` must stay in sync with dependency versions (see strategy doc)

7. **Markdown Linting**
   - Use markdownlint-cli2 via npx with auto-fix
   - Config: `.markdownlint-cli2.jsonc` (MD034 bare URLs disabled only for temporal docs)
   - Gitignored files automatically excluded (notes/, archive/notes/, CURRENT-SESSION.md)

### Quality Gate Failure Protocol

If quality gates fail after sub-task completion:

1. **Report the failure** with specific details
2. **Identify suspected causes** and investigation areas
3. **Ask for guidance** on whether to fix immediately or defer
4. **Never proceed** to next sub-task until resolved or user approves

### Leave It Cleaner: Pre-existing Issue Protocol

**Principle:** When touching any file, leave it cleaner than you found it.
Quality issues discovered during work should be addressed, not ignored.

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

3. **Documentation requirements:**
   - Fixed issues: Note in commit message ("Also fixed X pre-existing issues")
   - Deferred issues: Create task list in `.arc/active/incidental/tasks-incidental-*.md`
   - Never: Leave issues undocumented or unaddressed

## Session Documentation Control

### CURRENT-SESSION.md Update Protocol

- **AI NEVER updates CURRENT-SESSION.md** without explicit user instruction
- CURRENT-SESSION.md is a handoff document only updated at session end when instructed
- AI should report changes and progress, but user decides when/how session docs are updated

## Task Management Protocol

### One Sub-Task Rule

- **Complete ONE sub-task at a time** - never bundle multiple deliverables
- **Mark complete immediately** when work is done (tests pass, quality checks pass)
- **Mandatory stop** after reporting completion for user approval to proceed
- **Implied permission**: User approval implies permission to proceed UNLESS explicitly stated otherwise
  (e.g., "that's done, but before moving on..."). Address such concerns before proceeding to next subtask.

### Sub-Task Granularity Guidelines

Break down a sub-task if it requires:

- More than 3 files to be modified
- More than 50 lines of core logic changes
- Multiple interdependent changes
- Complex debugging/investigation

### Test-First Protocol

**BEFORE implementing any sub-task, assess test-first requirement:**

**Requires test-first** (write tests BEFORE implementation):

- New models (Django models, data schemas)
- New API endpoints or endpoint modifications
- New service classes or business logic
- Complex algorithms or data transformations
- Non-trivial validation or processing logic

**Test-after acceptable**:

- Simple CRUD operations with no custom logic
- Presentational UI components
- Configuration file changes
- Trivial refactoring (renaming, moving files)
- Documentation-only changes

**If unsure whether test-first applies, default to test-first.** Writing tests after implementation is harder and less effective.

**During task list creation:** Ensure test sub-tasks appear BEFORE implementation sub-tasks for test-first work.
This makes the protocol visible during execution.

## Testing Requirements

- **Test-first protocol**: See Task Management Protocol section above for when to write tests before vs. after implementation
- **Integration focus**: Prefer flow-level coverage over isolated units when practical
- **All tests must pass** before any commit discussion (see quality gates above)
- **Command patterns**: See [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) for execution commands
- **Detailed guidance**: See [Testing Methodology Strategy](../strategies/strategy-testing-methodology.md)

## Code Quality Principles

Apply standard software engineering principles:

- **DRY** (don't repeat yourself)
- **SOLID** (single responsibility, open/closed, dependency inversion)
- **KISS** (keep it simple)
- **YAGNI** (you aren't gonna need it)

Separate concerns, prefer composition over duplication, favor readability when principles conflict.

### Layered Architecture (Backend)

Backend uses strict layered architecture: API routes handle HTTP concerns only, Service layer contains ALL
business logic (filtering, calculations, presets, orchestration).

**Rule of thumb:** If an API route does more than extract params → call service → return response, the extra
logic likely belongs in Service layer.

### Code Documentation Standards

- **No meta-project references in codebase**: Never reference task IDs, phase numbers, or `.arc/`
  documentation in production code (comments, docstrings, variable names). Meta-project information
  belongs only in `.arc/` documentation. Code should explain "what" and "why" independently of
  project management context.

## Architecture Documentation

### Architecture Decision Records (ADRs)

Document significant architectural decisions in ADRs (`.arc/reference/adr/`). ADRs capture the context,
decision, and consequences of important design choices, serving as historical record and reference for
understanding system constraints.

**Write an ADR when:**

- Decision affects system structure or external contracts
- Multiple alternatives were considered
- Decision driven by external constraint (API limitations, regulatory requirements)
- Future developers will ask "why did we do it this way?"
- Decision could be reversed later (context needed for reversal)

**Don't write an ADR for:**

- Purely tactical implementation choices (variable names, loop constructs)
- Decisions obvious from reading code (standard CRUD, framework conventions)
- Temporary or experimental choices

**Format and guidance:** See [ADR Methodology Strategy](../strategies/strategy-adr-methodology.md)
**Template:** See `.arc/reference/adr/adr-template.md`

ADRs are immutable once accepted - new decisions require new ADRs that supersede old ones.

## Reference Documentation

This document provides core rules and standards. See related documentation:

- [QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Environment context, command patterns, and tool usage
- [Task Processing Workflow](../workflows/3-process-task-loop.md) - Detailed task execution workflow
- [Atomic Commit Workflow](../workflows/supplemental/atomic-commit.md) - Enhanced commit workflow with task context analysis
- [AI Agent Reference Card](../agent/AGENTS.md) - Complete project context for AI
- [Technical Overview](TECHNICAL-OVERVIEW.md) - High-level system architecture and technology stack
- [ADR Methodology Strategy](../strategies/strategy-adr-methodology.md) - Architecture decision record guidance
- [Type Safety Strategy](../strategies/strategy-type-safety.md) - Type checking approach and patterns
- [Testing Methodology Strategy](../strategies/strategy-testing-methodology.md) - Testing philosophy and practices
