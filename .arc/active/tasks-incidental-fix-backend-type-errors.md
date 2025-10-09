# Incidental Work: Fix Backend Type Errors (Target Architecture)

**Created**: 2025-10-09
**Triggered By**: Task 13 of tasks-incidental-backend-type-safety.md - Legacy DRF code exclusions reveal 351 target architecture errors
**Status**: Ready to start
**Estimated Effort**: 8-11.5 hours

## Context

**Why Now**: Backend type safety tooling modernization (Pyright + django-types) is complete. Accurate baseline established at 351 errors in target architecture code after excluding 241 errors in legacy DRF files scheduled for deletion.

**Discovery**: After completing Tasks 1-13 of backend type safety modernization:
- ✅ Tooling correct: Pyright-only with django-types
- ✅ Comprehensive coverage: Checking entire apps, not selective files
- ✅ Accurate baseline: 351 legitimate errors in code that will remain
- ✅ Legacy code excluded: 241 DRF errors in files being deleted (no wasted effort)

**Impact**:
- Type checking now blocking in CI with correct tooling
- Quality gates reliable for all incidental work
- Can achieve 0 type errors in target architecture
- Custom stubs needed for django.contrib.admin, enhanced ninja_jwt, allauth

## Scope

**Will Do**:
- Fix all 351 type errors in target architecture code (code that will remain after API Layer P2)
- Create custom stubs for django.contrib.admin (supplements django-types)
- Enhance existing stubs for ninja_jwt and allauth
- Add missing parameter and return type annotations
- Achieve 0 type errors for quality gates

**Won't Do** (excluded or deferred):
- Fixing errors in legacy DRF code (241 errors in 9 excluded files - being deleted)
- Creating rest_framework stubs (framework being removed)
- Fixing code scheduled for deletion in API Layer Modernization Phase 2
- Adding type stub validation tests (nice-to-have, not blocking)

## Error Baseline (After Exclusions)

| App/Module | Errors | Priority | Estimated Effort |
|------------|--------|----------|------------------|
| Core | 215 | P5 | 4-5 hours |
| Config | 59 | P3 | 1-2 hours |
| Authentication | 53 | P4 | 1.5-2.5 hours |
| UserMovieData | 13 | P2 | 30-45 min |
| Movie | 11 | P1 | 30-45 min |
| Accounts | 0 | ✅ | N/A (perfect!) |
| **TOTAL** | **351** | | **8-11.5 hours** |

## Error Categories (from baseline analysis)

### 1. Missing Type Stubs (~180 errors, 51%)

- django.contrib.admin incomplete coverage (~100 errors)
- ninja_jwt incomplete stubs (~50 errors)
- allauth missing coverage (~30 errors)

### 2. Missing Annotations (~132 errors, 38%)

- Missing parameter types (~80 errors)
- Missing return types (~52 errors)

### 3. Partially Unknown Types (~39 errors, 11%)

- Dictionary structures need TypedDict
- Function returns need explicit types

**Note**: Django ORM limitations (reportUnknownMemberType, reportAttributeAccessIssue) are configured as information-level warnings in pyrightconfig.json - acceptable per type safety strategy.

## Tasks

- [ ] 1. Create django.contrib.admin Custom Stubs
    - [ ] 1.1 Create stubs directory structure
        - [ ] 1.1.1 Create `backend/stubs/django/contrib/admin/__init__.pyi`
        - [ ] 1.1.2 Create `backend/stubs/django/contrib/admin/options.pyi`
        - [ ] 1.1.3 Create `backend/stubs/django/contrib/admin/sites.pyi`
    - [ ] 1.2 Implement core admin types
        - [ ] 1.2.1 Add ModelAdmin class stub with common methods
        - [ ] 1.2.2 Add AdminSite class stub with register method
        - [ ] 1.2.3 Add site instance (global admin.site)
        - [ ] 1.2.4 Add common admin decorators (register, action)
    - [ ] 1.3 Add maintenance contract headers
        - [ ] 1.3.1 Add docstring: "Supplements django-types 0.22.0"
        - [ ] 1.3.2 Add "Last verified" date
        - [ ] 1.3.3 Add upgrade checklist
    - [ ] 1.4 Test admin stubs
        - [ ] 1.4.1 Run type check on core/admin.py: `npx pyright backend/apps/core/admin.py --project backend`
        - [ ] 1.4.2 Run type check on user_movie_data/admin.py
        - [ ] 1.4.3 Verify error count reduction (~100 errors resolved)
    - [ ] 1.5 Run incremental quality checks
        - [ ] 1.5.1 Linting: `../.venv-backend/bin/ruff check backend/stubs/django/contrib/admin/ --fix`
        - [ ] 1.5.2 Type check: Verify no new errors introduced

- [ ] 2. Enhance ninja_jwt Custom Stubs
    - [ ] 2.1 Review existing ninja_jwt stubs
        - [ ] 2.1.1 Read `backend/stubs/ninja_jwt/` directory
        - [ ] 2.1.2 Identify gaps by checking authentication app errors
    - [ ] 2.2 Add missing type definitions
        - [ ] 2.2.1 Add missing classes/methods to tokens.pyi
        - [ ] 2.2.2 Add missing authentication types
        - [ ] 2.2.3 Update version and last verified date
    - [ ] 2.3 Test ninja_jwt enhancements
        - [ ] 2.3.1 Run type check on authentication app
        - [ ] 2.3.2 Verify ~50 errors resolved
    - [ ] 2.4 Run incremental quality checks

- [ ] 3. Enhance allauth Custom Stubs
    - [ ] 3.1 Review existing allauth stubs
        - [ ] 3.1.1 Read `backend/stubs/allauth/` directory
        - [ ] 3.1.2 Check which allauth modules need coverage
    - [ ] 3.2 Add missing type definitions
        - [ ] 3.2.1 Enhance account module stubs if needed
        - [ ] 3.2.2 Enhance adapter stubs if needed
        - [ ] 3.2.3 Update version and last verified date
    - [ ] 3.3 Test allauth enhancements
        - [ ] 3.3.1 Run type check on authentication/adapters.py
        - [ ] 3.3.2 Verify ~30 errors resolved
    - [ ] 3.4 Run incremental quality checks

- [ ] 4. Fix Movie App Errors (11 errors)
    - [ ] 4.1 Review movie app errors
        - [ ] 4.1.1 Run verbose type check: `npx pyright backend/apps/movie/ --project backend`
        - [ ] 4.1.2 Categorize errors by file and type
    - [ ] 4.2 Fix api.py errors if any
        - [ ] 4.2.1 Add missing type annotations
        - [ ] 4.2.2 Fix any schema-related type issues
    - [ ] 4.3 Fix schemas.py errors if any
        - [ ] 4.3.1 Add explicit types for computed fields
        - [ ] 4.3.2 Fix Pydantic schema types
    - [ ] 4.4 Fix test file errors
        - [ ] 4.4.1 Fix test_movie_api.py type issues
        - [ ] 4.4.2 Add proper user type annotations
    - [ ] 4.5 Verify movie app passes
        - [ ] 4.5.1 Run type check: Should show 0 errors
        - [ ] 4.5.2 Run tests: `../.venv-backend/bin/python manage.py test apps.movie --settings=config.settings_test`
    - [ ] 4.6 Run incremental quality checks

- [ ] 5. Fix UserMovieData App Errors (13 errors)
    - [ ] 5.1 Review user_movie_data errors
        - [ ] 5.1.1 Run verbose type check on user_movie_data app
        - [ ] 5.1.2 Categorize errors (likely admin, models, api)
    - [ ] 5.2 Fix admin.py errors
        - [ ] 5.2.1 Should be mostly resolved by Task 1 (admin stubs)
        - [ ] 5.2.2 Fix any remaining admin integration issues
    - [ ] 5.3 Fix api.py errors if any
        - [ ] 5.3.1 Add missing type annotations
        - [ ] 5.3.2 Fix Django Ninja schema types
    - [ ] 5.4 Fix models.py errors if any
        - [ ] 5.4.1 Add Manager type annotations
        - [ ] 5.4.2 Fix ForeignKey typing
    - [ ] 5.5 Verify user_movie_data app passes
        - [ ] 5.5.1 Run type check: Should show 0 errors
        - [ ] 5.5.2 Run tests to verify no regressions
    - [ ] 5.6 Run incremental quality checks

- [ ] 6. Fix Config Module Errors (59 errors)
    - [ ] 6.1 Review config errors by file
        - [ ] 6.1.1 Run verbose type check: `npx pyright backend/config/ --project backend`
        - [ ] 6.1.2 Group errors by file (logging.py, settings.py, etc.)
    - [ ] 6.2 Fix logging.py errors (~25 errors)
        - [ ] 6.2.1 Add logging.LogRecord type annotations
        - [ ] 6.2.2 Add return type annotations for formatters
        - [ ] 6.2.3 Fix filter function parameter types
    - [ ] 6.3 Fix settings.py errors (~20 errors)
        - [ ] 6.3.1 Add type annotations for custom settings
        - [ ] 6.3.2 Fix environ type inference issues
        - [ ] 6.3.3 Add explicit types for complex configurations
    - [ ] 6.4 Fix other config files (~14 errors)
        - [ ] 6.4.1 Fix settings_test.py types
        - [ ] 6.4.2 Fix settings_prod.py types
        - [ ] 6.4.3 Fix WSGI/ASGI types if needed
    - [ ] 6.5 Verify config module passes
        - [ ] 6.5.1 Run type check: Should show 0 errors
        - [ ] 6.5.2 Verify Django check passes
    - [ ] 6.6 Run incremental quality checks

- [ ] 7. Fix Authentication App Errors (53 errors, target architecture only)
    - [ ] 7.1 Review authentication errors
        - [ ] 7.1.1 Run verbose type check on authentication app
        - [ ] 7.1.2 Focus on: api.py, schemas.py, auth_ninja.py, adapters.py, authenticate.py
        - [ ] 7.1.3 Ignore: views.py, serializers.py (excluded as legacy DRF)
    - [ ] 7.2 Fix api.py errors (Django Ninja endpoints)
        - [ ] 7.2.1 Add parameter type annotations
        - [ ] 7.2.2 Fix schema return types
        - [ ] 7.2.3 Fix request.user type handling
    - [ ] 7.3 Fix schemas.py errors (Pydantic)
        - [ ] 7.3.1 Add explicit field types
        - [ ] 7.3.2 Fix computed field types
        - [ ] 7.3.3 Add return type annotations
    - [ ] 7.4 Fix auth_ninja.py errors
        - [ ] 7.4.1 Fix authentication helper types
        - [ ] 7.4.2 Add HttpRequest type annotations
        - [ ] 7.4.3 Fix user type returns
    - [ ] 7.5 Fix adapters.py errors (allauth)
        - [ ] 7.5.1 Should be improved by Task 3 (allauth stubs)
        - [ ] 7.5.2 Add TypedDict for response structures
        - [ ] 7.5.3 Fix partially unknown types
    - [ ] 7.6 Fix authenticate.py if kept
        - [ ] 7.6.1 Verify if this file is target architecture
        - [ ] 7.6.2 Add missing type annotations
    - [ ] 7.7 Verify authentication target architecture passes
        - [ ] 7.7.1 Run type check: Should show 0 errors (excluding views.py, serializers.py)
        - [ ] 7.7.2 Run tests to verify no regressions
    - [ ] 7.8 Run incremental quality checks

- [ ] 8. Fix Core App Errors (215 errors)
    - [ ] 8.1 Review core errors by subdirectory
        - [ ] 8.1.1 Run verbose type check on core app
        - [ ] 8.1.2 Group by: admin.py, models.py, context_processors.py, utilities/, tests/
        - [ ] 8.1.3 Note: views/logging.py and views/tmdb.py already excluded (legacy DRF)
    - [ ] 8.2 Fix admin.py errors (~50 errors)
        - [ ] 8.2.1 Should be mostly resolved by Task 1 (admin stubs)
        - [ ] 8.2.2 Fix custom admin class types
        - [ ] 8.2.3 Fix admin registration patterns
    - [ ] 8.3 Fix context_processors.py errors (~30 errors)
        - [ ] 8.3.1 Add HttpRequest type annotations
        - [ ] 8.3.2 Add return type dict[str, object] annotations
        - [ ] 8.3.3 Fix template context types
    - [ ] 8.4 Fix models.py errors (~40 errors)
        - [ ] 8.4.1 Add Manager type annotations
        - [ ] 8.4.2 Fix model method return types
        - [ ] 8.4.3 Add QuerySet type hints
    - [ ] 8.5 Fix utilities/ directory errors (~50 errors)
        - [ ] 8.5.1 Add parameter type annotations
        - [ ] 8.5.2 Add return type annotations
        - [ ] 8.5.3 Fix helper function types
    - [ ] 8.6 Fix test file errors (~45 errors)
        - [ ] 8.6.1 Add test method type annotations
        - [ ] 8.6.2 Fix fixture types
        - [ ] 8.6.3 Fix assertion types
    - [ ] 8.7 Verify core app passes
        - [ ] 8.7.1 Run type check: Should show 0 errors (excluding views/logging.py, views/tmdb.py)
        - [ ] 8.7.2 Run tests to verify no regressions
    - [ ] 8.8 Run incremental quality checks

- [ ] 9. Full Quality Gates
    - [ ] 9.1 Run comprehensive type check
        - [ ] 9.1.1 Execute: `../.venv-backend/bin/python scripts/type_check.py`
        - [ ] 9.1.2 Verify: 6/6 apps pass with 0 errors
        - [ ] 9.1.3 Verify: Total error count is 0
    - [ ] 9.2 Run backend linting
        - [ ] 9.2.1 Execute: `../.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - [ ] 9.2.2 Verify: 0 violations
    - [ ] 9.3 Run backend tests
        - [ ] 9.3.1 Execute full test suite with --keepdb
        - [ ] 9.3.2 Verify: 100% pass rate
    - [ ] 9.4 Run markdown linting
        - [ ] 9.4.1 Execute: `npx markdownlint-cli2 "README.md" ".arc/**/*.md"`
        - [ ] 9.4.2 Verify: 0 violations
    - [ ] 9.5 Verify containers healthy
        - [ ] 9.5.1 Check all containers running
        - [ ] 9.5.2 Verify Django check passes

- [ ] 10. Documentation and Completion
    - [ ] 10.1 Update CURRENT-SESSION.md
        - [ ] 10.1.1 Mark type error fixing complete
        - [ ] 10.1.2 Document final state: 0 errors in target architecture
        - [ ] 10.1.3 Note exclusions remain until API Layer P2 complete
    - [ ] 10.2 Update notes-type-coverage-status.md
        - [ ] 10.2.1 Update per-app error counts (all 0 except excluded files)
        - [ ] 10.2.2 Document custom stubs created/enhanced
        - [ ] 10.2.3 Update maintenance strategy
    - [ ] 10.3 Create completion summary in this task list
        - [ ] 10.3.1 Document stubs created (django.contrib.admin)
        - [ ] 10.3.2 Document stubs enhanced (ninja_jwt, allauth)
        - [ ] 10.3.3 Document errors fixed per app
        - [ ] 10.3.4 Document total time spent

## Relevant Files

**Type Checking Configuration:**
- `backend/pyrightconfig.json` - Pyright configuration with legacy exclusions

**Custom Type Stubs (will create/enhance):**
- `backend/stubs/django/contrib/admin/__init__.pyi` - NEW: Admin site and registration
- `backend/stubs/django/contrib/admin/options.pyi` - NEW: ModelAdmin class
- `backend/stubs/django/contrib/admin/sites.pyi` - NEW: AdminSite class
- `backend/stubs/ninja_jwt/` - ENHANCE: Add missing token/auth types
- `backend/stubs/allauth/` - ENHANCE: Improve account/adapter coverage

**Target Architecture Code (to fix):**
- `backend/apps/movie/api.py` - Django Ninja endpoints
- `backend/apps/movie/schemas.py` - Pydantic schemas
- `backend/apps/movie/tests/test_movie_api.py` - Test type issues
- `backend/apps/user_movie_data/api.py` - Django Ninja endpoints
- `backend/apps/user_movie_data/schemas.py` - Pydantic schemas
- `backend/apps/user_movie_data/admin.py` - Admin integration
- `backend/apps/user_movie_data/models.py` - Model types
- `backend/apps/authentication/api.py` - Django Ninja endpoints
- `backend/apps/authentication/schemas.py` - Pydantic schemas
- `backend/apps/authentication/auth_ninja.py` - Authentication helpers
- `backend/apps/authentication/adapters.py` - Allauth integration
- `backend/apps/core/admin.py` - Admin configuration
- `backend/apps/core/models.py` - Core models
- `backend/apps/core/context_processors.py` - Template context
- `backend/apps/core/utilities/` - Utility functions
- `backend/config/logging.py` - Logging configuration
- `backend/config/settings.py` - Django settings
- `backend/config/settings_test.py` - Test settings

**Documentation:**
- `.arc/active/notes-type-coverage-status.md` - Type coverage tracking (gitignored)
- `.arc/reference/strategies/strategy-type-safety.md` - Type safety patterns

## Implementation Notes

### Execution Order Rationale

**Phase 1: Create/Enhance Stubs (Tasks 1-3)**
- High leverage: Each stub resolves ~30-100 errors across multiple apps
- Foundation work: Needed before fixing app-specific errors
- Estimated: 2-2.5 hours, resolves ~180 errors (51%)

**Phase 2: Progressive App Fixing (Tasks 4-8)**
- Easiest first: Movie (11) → UserMovieData (13) → Config (59) → Auth (53) → Core (215)
- Build confidence with quick wins
- Each app can be completed independently
- Estimated: 6-9 hours, resolves ~171 errors (49%)

**Phase 3: Quality Gates & Docs (Tasks 9-10)**
- Comprehensive validation
- Update tracking documentation
- Estimated: 30 minutes

### Custom Stub Strategy

**django.contrib.admin** (NEW):
- Supplements django-types (incomplete admin coverage)
- Focus on: ModelAdmin, AdminSite, register decorator
- Impact: ~100 errors resolved

**ninja_jwt** (ENHANCE):
- Review existing stubs in backend/stubs/ninja_jwt/
- Add missing token/authentication types
- Impact: ~50 errors resolved

**allauth** (ENHANCE):
- Review existing stubs in backend/stubs/allauth/
- Focus on account module and adapters
- Impact: ~30 errors resolved

### Type Annotation Patterns

Reference `.arc/reference/strategies/strategy-type-safety.md` for:
- Django Ninja ModelSchema patterns
- Pydantic schema best practices
- HttpRequest type handling
- Manager and QuerySet typing
- Type ignore guidelines (last resort)

### Acceptable Information-Level Warnings

Per pyrightconfig.json configuration, these are acceptable (not errors):
- `reportUnknownMemberType` on Django ORM fields
- `reportAttributeAccessIssue` on ForeignKey related managers
- Rationale: django-types limitations, runtime-validated by tests

### Exclusions Cleanup Plan

**When**: During API Layer Modernization Phase 2 completion
**Action**: Sub-task already added to tasks-api-layer-modernization-p2.md
**Steps**:
1. Delete legacy DRF files (views.py, serializers.py, etc.)
2. Remove temporary exclusions from pyrightconfig.json
3. Run `python scripts/type_check.py` to verify 0 errors remain
4. Commit with reference to completed type safety work

## Completion Notes

{To be filled after completion}

**Summary:**
- Custom stubs created: django.contrib.admin (NEW)
- Custom stubs enhanced: ninja_jwt, allauth
- Errors fixed: 351 → 0 across 5 apps (Accounts already perfect)
- Time spent: {actual hours}

**Final Baseline:**
- Core: 215 → 0 errors
- Config: 59 → 0 errors
- Authentication: 53 → 0 errors
- UserMovieData: 13 → 0 errors
- Movie: 11 → 0 errors
- Accounts: 0 → 0 errors (still perfect!)

**Next Steps:**
- Resume incidental-security-updates Task 4
- Resume incidental-oauth-headless Task 5
- Complete API Layer Modernization Phase 2
- Remove temporary exclusions as part of api-layer-p2 cleanup

## References

- **Parent Task List**: `.arc/active/tasks-incidental-backend-type-safety.md` (Tasks 1-14)
- **Type Safety Strategy**: `.arc/reference/strategies/strategy-type-safety.md`
- **Error Categorization**: `.arc/active/notes-type-coverage-status.md` (Task 6.3 analysis)
- **Pyright Configuration**: `backend/pyrightconfig.json`
- **API Migration Context**: `.arc/active/prd-api-layer-modernization-p2.md`
