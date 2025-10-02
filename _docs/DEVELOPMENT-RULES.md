# Development Rules - CineXplorer

**Version**: 2.2
**Last Updated**: 2025-01-27
**Rules Hash**: `c4f9e8a2`

This document consolidates the core development rules and quality standards for CineXplorer. These rules are **non-negotiable** and must be followed by all contributors, including AI assistants.

## Version History

- **2.2**: Added mandatory comprehensive task context analysis protocol for all commits
- **2.1**: Added feature branch workflow protocols and branch management requirements
- **2.0**: Clarified commit initiation vs execution, added incremental quality checks
- **1.0**: Initial comprehensive development rules

## AI Session Initialization Required

Before starting ANY work, AI assistants must:

1. **Confirm rules version**: "Acknowledging DEVELOPMENT-RULES v2.2, hash c4f9e8a2"
2. **State understanding**: Briefly confirm understanding of commit protocols, comprehensive task context analysis, quality gates, and feature branch workflow
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
   - Command: `docker-compose exec backend python manage.py test --keepdb --settings=config.settings_test`
   - Zero failures acceptable

2. **Frontend Tests**: 100% pass rate
   - Command: `docker-compose exec frontend npm test`
   - Zero failures acceptable

3. **Backend Linting**: Zero violations
   - Command: `docker-compose exec backend flake8`
   - Every violation must be fixed

4. **Frontend Linting**: Zero violations
   - Command: `docker-compose exec frontend npm run lint`
   - Every violation must be fixed

5. **TypeScript Checking**: Zero errors
   - Command: `docker-compose exec frontend npm run type-check`
   - Every type error must be resolved

6. **Python Type Safety**: Hybrid type checking approach with minimal Any usage
   - **Development**: `python backend/scripts/type_check.py` from repo root
   - **CI/CD**: `docker-compose exec backend python scripts/type_check.py`
   - **Manual**: `docker-compose exec backend mypy apps/ --config-file mypy.ini`
   - **PROHIBITED**: Using `typing.Any` except for external API payloads (TMDB, etc.)
   - **REQUIRED**: Use `object` for unknown data, `dict[str, object]` for generic dictionaries
   - **JUSTIFICATION**: Any `Any` usage must have inline comment explaining necessity

7. **Markdown Linting**: Zero violations
   - Command: `npm run lint:md`
   - Every violation must be fixed

### Quality Gate Failure Protocol

If quality gates fail after sub-task completion:

1. **Report the failure** with specific details
2. **Identify suspected causes** and investigation areas
3. **Ask for guidance** on whether to fix immediately or defer
4. **Never proceed** to next sub-task until resolved or user approves

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

## Comprehensive Task Context Analysis Protocol

**MANDATORY** before every commit consideration:

1. **Examine ALL uncommitted changes**
2. **Locate relevant task documentation** in `_docs/tasks/`
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
docker-compose exec [backend|frontend] bash
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

- **`_docs/workflows/process-tasks.md`** - Detailed task execution workflow
- **`_docs/workflows/atomic-commit.md`** - Enhanced commit workflow with comprehensive task context analysis
- **`_docs/ai-instructions/AI-SHARED.md`** - Complete project context for AI
- **`_docs/CURRENT-SESSION.md`** - Session handoff template (untracked)
- **`_docs/TECHNICAL-ARCHITECTURE.md`** - Testing methodology details
