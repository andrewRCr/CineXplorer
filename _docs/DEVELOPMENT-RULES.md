# Development Rules - CineXplorer

**Version**: 2.1
**Last Updated**: 2025-01-24
**Rules Hash**: `b3e8f7d1`

This document consolidates the core development rules and quality standards for CineXplorer. These rules are **non-negotiable** and must be followed by all contributors, including AI assistants.

## Version History
- **2.1**: Added feature branch workflow protocols and branch management requirements
- **2.0**: Clarified commit initiation vs execution, added incremental quality checks
- **1.0**: Initial comprehensive development rules

## AI Session Initialization Required

Before starting ANY work, AI assistants must:
1. **Confirm rules version**: "Acknowledging DEVELOPMENT-RULES v2.1, hash b3e8f7d1"
2. **State understanding**: Briefly confirm understanding of commit protocols, quality gates, and feature branch workflow
3. **Verify context access**: Confirm access to required documents (AI-SHARED, META-PRD, etc.)
4. **Check branch status**: Verify current git branch and ensure alignment with intended work

## Git & Commit Control

### Manual Commit Control
- **AI NEVER initiates commits** without explicit user approval or instruction
- **AI CAN execute commits** when user explicitly approves/instructs it to do so
- **User approval required** to begin any git operations
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
   - **Development**: `npx pyright backend/apps/` (fast, modern checking on host system)
   - **CI/CD**: `docker-compose exec backend python scripts/type_check.py` (comprehensive validation)
   - **Manual**: `docker-compose exec backend mypy apps/ --config-file mypy.ini` (Django-compatible)
   - **PROHIBITED**: Using `typing.Any` except for Django internals where absolutely necessary
   - **REQUIRED**: Use `object` for truly unknown data, specific TypedDict types for known structures
   - **REQUIRED**: Use `dict[str, object]` for generic dictionary data
   - **PATTERN**: Leverage django-stubs generics (e.g., `QuerySet[ModelClass]`)
   - **JUSTIFICATION**: Any `Any` usage must be documented with inline comment explaining necessity

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
- **After each parent task**: Check if PROJECT-STATUS needs updates:
  - Feature progress milestones
  - Newly completed functionality
  - Updated timelines/priorities
  - Dependencies now resolved
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

## Code Quality Standards

### Backend Standards
- **Linting**: flake8 with max-line-length=99, max-complexity=10
- **Type Checking**: Hybrid approach - Pyright (development) + MyPy (CI/CD) with django-stubs/django-types
- **Exclusions**: See `backend/.flake8` for excluded directories
- **Type Check Script**: Use `python scripts/type_check.py` for comprehensive validation

### Frontend Standards
- **Linting**: ESLint with TypeScript support
- **Type Checking**: TypeScript strict mode enabled
- **Testing**: Vitest with React Testing Library

## Standardized Readiness Report

When sub-tasks are complete and quality gates pass, use this format:

```markdown
## Quality Gate Report - Task X.Y Complete

**Code Changes:**
- Modified: [list modified files]
- Added: [list new files]
- Deleted: [list removed files]
- Tests: [list test files created/modified]

**Quality Gates:**
✅ Backend Tests: [X passed, 0 failed]
✅ Frontend Tests: [X passed, 0 failed]
✅ Backend Lint: flake8 clean (0 violations)
✅ Frontend Lint: ESLint clean (0 violations)
✅ TypeScript: No type errors

**Task Status:**
✅ Sub-task X.Y marked complete
[Status] Parent task X.0: [completed/total] sub-tasks complete

**Ready for staging/commit**
```

If quality gates fail, use this format:

```markdown
## Quality Gate Report - Task X.Y Complete (Issues Found)

**Code Changes:**
[Same format as above]

**Quality Gates:**
❌ [Failed check]: [specific failures]
✅ [Passed checks]: [details]

**Issues Found:**
- [Specific error/violation 1]
- [Specific error/violation 2]

**Suspected Causes:**
- [Analysis of likely causes]
- [Areas to investigate]

**Recommendations:**
[Suggested next steps]

**Awaiting guidance on how to proceed.**
```

## Commit Standards

### Conventional Commit Format
- **Types**: feat, fix, docs, style, refactor, test, config, chore
- **Scope**: Use feature/system name for context (e.g., "logging-system", "user-auth")
- **Reference tasks**: Include task numbers with feature context
- **Examples**:
  - `feat(logging-system): Implement request correlation middleware (Task 2.1)`
  - `docs(user-auth): Complete Task 3.0 - Authentication System`

### Atomic Commit Guidelines
- Each commit should be a single logical change
- Commits should be independently buildable/testable
- Use descriptive messages with context
- Reference correct task numbers
- Separate formatting from functional changes

## Error Handling

### When Things Go Wrong
- **Report immediately** with full context
- **Provide diagnostic information** (error messages, stack traces)
- **Suggest investigation areas** based on the changes made
- **Wait for guidance** rather than attempting fixes without approval

### Never Proceed If:
- Quality gates are failing
- Tests are broken
- Linting violations exist
- TypeScript errors are present
- User has not approved the next step

## Reference Documentation

This document provides core rules. See detailed protocols in:
- **`_docs/workflows/process-tasks.md`** - Detailed task execution workflow
- **`_docs/workflows/atomic-commit.md`** - Commit workflow examples
- **`_docs/ai-instructions/CLAUDE.md`** - Tool-specific guidance
- **`_docs/TECHNICAL-ARCHITECTURE.md`** - Testing methodology details

---

**Remember**: These rules ensure code quality, maintainability, and professional development practices. They are designed to create a systematic, high-quality development process suitable for portfolio demonstration and professional environments.