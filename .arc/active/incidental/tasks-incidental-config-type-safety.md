# Incidental Work: Fix Config Module Type Safety Errors

**Created**: 2025-10-13
**Triggered By**: Task 2.2 in `tasks-incidental-pytest-migration.md` - discovered 6 Pyright errors in config module during type safety verification
**Status**: In Progress
**Estimated Effort**: 30-45 minutes

## Context

**Why Now**: Zero type errors policy requires all modules pass type checking. Config module has 6 `reportConstantRedefinition` errors that block clean type check baseline during pytest migration work.

**Discovery**: After completing Task 2.2 (test_csrf_protection.py conversion), ran comprehensive type check to verify authentication app improvements. Discovered Config module has 6 pre-existing type errors unrelated to our changes.

**Impact**:
- Blocks clean type safety baseline for pytest migration
- Violates zero type errors quality gate policy
- Pre-existing pattern that works but violates Pyright constant reassignment rules

## Scope

**Will Do**:
- Analyze the 6 `reportConstantRedefinition` errors in config module
- Refactor settings pattern to avoid uppercase constant reassignment
- Options: lowercase mutable variables, settings class pattern, or typed configuration
- Verify all config references across codebase still work
- Run full backend tests to ensure no regressions
- Achieve 0 type errors in config module

**Won't Do** (not needed for this fix):
- Full settings architecture redesign
- Environment-specific config file splitting
- Django settings optimization or restructuring beyond type safety needs

## Tasks

- [ ] 1. Analyze config module type errors (5 minutes)
    - [ ] 1.1 Document all 6 errors with file paths and line numbers
    - [ ] 1.2 Identify the pattern causing `reportConstantRedefinition` violations
    - [ ] 1.3 Review environment-based conditional assignment pattern
    - [ ] 1.4 Verify these are style violations not runtime issues
- [ ] 2. Choose refactoring strategy (5 minutes)
    - [ ] 2.1 Option A: Use lowercase variable names for mutable settings
    - [ ] 2.2 Option B: Use intermediate variables for computed values
    - [ ] 2.3 Option C: Suppress specific errors with type comments (last resort)
    - [ ] 2.4 Get user approval on chosen approach
- [ ] 3. Implement fix for ENVIRONMENT variable (5 minutes)
    - [ ] 3.1 Fix settings.py line 235 (ENVIRONMENT reassignment)
    - [ ] 3.2 Fix settings_test.py if similar pattern exists
    - [ ] 3.3 Run Pyright to verify fix: `npx pyright backend/config/settings.py --project backend`
- [ ] 4. Implement fix for security settings (10 minutes)
    - [ ] 4.1 Fix SECURE_HSTS_SECONDS reassignment pattern
    - [ ] 4.2 Fix other security setting reassignments
    - [ ] 4.3 Ensure environment-based logic still works correctly
    - [ ] 4.4 Run Pyright on full config module: `npx pyright backend/config/ --project backend`
- [ ] 5. Verify no regressions (10 minutes)
    - [ ] 5.1 Run full backend test suite: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
    - [ ] 5.2 Verify all 104 tests still pass
    - [ ] 5.3 Check that settings load correctly in all environments
    - [ ] 5.4 Run linting: `.venv-backend/bin/ruff check backend/config/ --fix`
- [ ] 6. Run full quality gates (5 minutes)
    - [ ] 6.1 Confirm 0 type errors in config module
    - [ ] 6.2 Confirm 0 type errors across entire backend
    - [ ] 6.3 Confirm all tests passing
    - [ ] 6.4 Confirm zero linting violations

## Relevant Files

**Configuration Files:**
- `backend/config/settings.py` - Main settings file (ENVIRONMENT reassignment at line 235, security settings at lines 419+)
- `backend/config/settings_test.py` - Test settings (likely has similar pattern)

**Type Configuration:**
- `backend/pyrightconfig.json` - Pyright configuration (may need updates if using suppression)

## Implementation Notes

### Error Analysis

**6 Pyright `reportConstantRedefinition` errors identified:**

1. `settings.py:235` - `ENVIRONMENT = "development"` (reassignment in validation block)
2. `settings.py:419` - `SECURE_HSTS_SECONDS = 3600` (conditional reassignment for staging)
3. Additional security settings reassignments based on ENVIRONMENT value

**Root Cause:**
- Django settings convention uses UPPERCASE for all settings
- Pyright interprets UPPERCASE as constants (immutable)
- Conditional reassignment based on environment violates constant invariant
- Pattern works correctly at runtime but fails static type checking

### Refactoring Strategy

**Chosen approach**: TBD after user approval

**Option A - Lowercase Mutables:**
```python
# Initial assignment as lowercase (mutable)
environment = env("ENVIRONMENT", default="development")
if environment not in ["development", "staging", "production"]:
    environment = "development"
# Final assignment to UPPERCASE constant
ENVIRONMENT = environment
```

**Option B - Intermediate Variables:**
```python
# Compute value in function
def get_environment() -> str:
    env_value = env("ENVIRONMENT", default="development")
    if env_value not in ["development", "staging", "production"]:
        return "development"
    return env_value

ENVIRONMENT = get_environment()
```

**Option C - Type Comment Suppression (last resort):**
```python
ENVIRONMENT = "development"  # type: ignore[misc]
```

## Completion Notes

{To be filled after completion}
