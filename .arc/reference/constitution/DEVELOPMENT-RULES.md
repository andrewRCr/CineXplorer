# Development Rules - CineXplorer

**Version**: 2.4
**Last Updated**: 2025-10-09
**Rules Hash**: `e8c2g3k0`

This document consolidates the core development rules and quality standards for CineXplorer. These rules are **non-negotiable** and must be followed by all contributors, including AI assistants.

## Version History

- **2.4**: Added CURRENT-SESSION.md update control - AI must not update without user instruction
- **2.3**: Added "Leave It Cleaner" protocol for handling pre-existing issues in modified files
- **2.2**: Added mandatory comprehensive task context analysis protocol for all commits
- **2.1**: Added feature branch workflow protocols and branch management requirements
- **2.0**: Clarified commit initiation vs execution, added incremental quality checks
- **1.0**: Initial comprehensive development rules

## AI Session Initialization Required

Before starting ANY work, AI assistants must:

1. **Confirm rules version**: "Acknowledging DEVELOPMENT-RULES v2.4, hash e8c2g3k0"
2. **State understanding**: Briefly confirm understanding of commit protocols, comprehensive task context analysis, quality gates, "Leave It Cleaner" protocol, CURRENT-SESSION update control, and feature branch workflow
3. **Verify context access**: Confirm access to required documents (AI-SHARED, META-PRD, etc.)
4. **Check branch status**: Verify current git branch and ensure alignment with intended work

## Git & Commit Control

### Manual Commit Control

- **AI NEVER initiates commits** without explicit user approval or instruction
- **AI CAN execute commits** when user explicitly approves/instructs it to do so
- **User approval required** to begin any git operations
- **MANDATORY**: AI must perform comprehensive task context analysis before any commit consideration
- AI reports completion with standardized readiness report, then awaits commit instructions

### Feature Branch Workflow

- **All feature work** must happen on dedicated feature branches
- **Branch naming convention**: `feature/[feature-name]` (e.g., `feature/user-profile-editing`)
- **Branch creation**: Create new branch during task generation phase
- **Branch verification**: Always verify correct branch before committing
- **Merge strategy**: Preserve commit history when merging to main (no squash merge)
- **Branch cleanup**: Delete feature branches after successful merge

### Quality Gates (Zero Tolerance)

Before any commit consideration, ALL of the following must pass with **zero exceptions**:

1. **Backend Tests**: 100% pass rate
   - Command: `docker compose -f infrastructure/docker-compose.yml exec backend python manage.py test --keepdb --settings=config.settings_test`
   - Zero failures acceptable

2. **Frontend Tests**: 100% pass rate
   - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
   - Zero failures acceptable

3. **Backend Linting**: Zero violations
   - **Docker** (recommended): `docker compose -f infrastructure/docker-compose.yml exec backend ruff check apps/ config/`
   - **Host WSL2** (faster): `.venv-backend/bin/ruff check backend/apps/ backend/config/`
   - **Auto-fix**: Add `--fix` flag to either command
   - Every violation must be fixed

4. **Frontend Linting**: Zero violations
   - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
   - Every violation must be fixed

5. **TypeScript Checking**: Zero errors
   - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
   - Every type error must be resolved

6. **Python Type Safety**: Pyright with django-types for minimal Any usage
   - **Development** (fastest): `npx pyright backend/apps/ backend/config/ --project backend` from repo root
   - **CI/CD**: `npx pyright backend/apps/ backend/config/ --project backend` (blocking)
   - **Script**: `python backend/scripts/type_check.py` for comprehensive per-app reporting
   - **PROHIBITED**: Using `typing.Any` except for external API payloads (TMDB, etc.)
   - **REQUIRED**: Use `object` for unknown data, `dict[str, object]` for generic dictionaries
   - **JUSTIFICATION**: Any `Any` usage must have inline comment explaining necessity
   - **Full guidelines**: See [Type Safety Strategy](../strategies/strategy-type-safety.md) for complete strategy

7. **Markdown Linting**: Zero violations
   - Command: `npx markdownlint-cli2 "README.md" ".arc/**/*.md"`
   - Auto-fix: `npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`
   - Config: `.markdownlint-cli2.jsonc` (MD034 bare URLs disabled only for temporal docs: tasks/, notes/, archive/notes/)
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

### Test Coverage Standards

- **Test-first approach**: Required for new models, API endpoints, complex business logic
- **Test-after acceptable**: For simple CRUD operations, UI components, configuration
- **Always required**: All features must have appropriate test coverage
- **Integration focus**: Test workflows, not just individual components

### Test Execution Standards

- **Backend**: Use `--keepdb` flag for performance during development
- **Frontend**: Use appropriate test modes (watch, coverage, UI) as needed
- **Before commits**: Full test suite must pass completely

## Commit Standards

### Conventional Commit Format

- **Types**: feat, fix, docs, style, refactor, test, config, chore
- **Scope**: Use feature/system name for context
- **Reference tasks**: Include task numbers with feature context

### Atomic Commit Guidelines

- Each commit should be a single logical change
- Commits should be independently buildable/testable
- **MANDATORY**: Perform comprehensive task context analysis before writing commit messages
- Use descriptive messages that reflect project milestone status, not just changes made
- Reference correct task numbers with full phase/milestone context
- Distinguish clearly between partial progress and milestone completion
- Separate formatting from functional changes
- Identify remaining work required for full milestone completion

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

## Type Safety Standards

### Custom Type Stubs

**Location**: `backend/stubs/` - Custom `.pyi` files supplementing third-party libraries

**Current Stubs**:
- `django/contrib/auth/` - Supplements django-types (explicit `id` field)
- `allauth/` - Required (no official stubs)
- `ninja_jwt/` - Required (incomplete official typing)
- `environ/` - Required (django-environ lacks stubs)

**Maintenance**: When upgrading dependencies, verify stubs match library versions. See [Type Safety Strategy](../strategies/strategy-type-safety.md) for complete maintenance protocols and upgrade procedures.

### Type Safety Patterns

**Django Ninja Schemas**: Use `from_orm_with_<relation>()` pattern for computed fields from ForeignKey relationships.

**See**: [Type Safety Strategy](../strategies/strategy-type-safety.md) for complete implementation patterns, examples, and guidelines.

## Comprehensive Task Context Analysis Protocol

**MANDATORY** before every commit consideration:

1. **Examine ALL uncommitted changes**
2. **Locate relevant task documentation** in active tasks (`.arc/active/feature/` or `.arc/active/incidental/`) or upcoming tasks (`.arc/upcoming/tasks/`)
3. **Analyze task completion status** vs documented tasks
4. **Update task documentation** - mark subtasks complete
5. **Write accurate commit messages** reflecting project status

**Key Principle**: Commit messages must communicate WHERE the project stands after the commit.

## Essential Commands

### Application Startup

```bash
# Full stack with Docker (recommended)
docker-compose -f infrastructure/docker-compose.yml up --build
# Access at https://localhost:8444 (accept self-signed cert warning)
```

### Container Management

```bash
# Rebuild after dependency changes
docker-compose -f infrastructure/docker-compose.yml up --build

# View logs
docker-compose -f infrastructure/docker-compose.yml logs [service]

# Shell access
docker compose -f infrastructure/docker-compose.yml exec [backend|frontend] bash
```

### Feature Branch Management

```bash
# Create and switch to new feature branch
git checkout -b feature/[feature-name]

# Check current branch
git status
git branch --show-current

# Switch back to main and merge (preserves commit history)
git checkout main
git merge feature/[feature-name]

# Delete feature branch after merge
git branch -d feature/[feature-name]
```

## Reference Documentation

This document provides core rules. See detailed protocols in:

- [Task Processing Workflow](../workflows/3-process-task-loop.md) - Detailed task execution workflow
- [Atomic Commit Workflow](../workflows/atomic-commit.md) - Enhanced commit workflow with comprehensive task context analysis
- [AI Shared Context](../ai-instructions/AI-SHARED.md) - Complete project context for AI
- [Current Session](.arc/active/CURRENT-SESSION.md) - Session handoff template (untracked)
- [Technical Architecture](TECHNICAL-ARCHITECTURE.md) - Testing methodology details
