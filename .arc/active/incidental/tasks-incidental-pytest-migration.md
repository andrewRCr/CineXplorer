# Incidental Work: Migrate Test Suite to pytest

**Created**: 2025-10-13
**Triggered By**: Task 3.6 in `tasks-incidental-security-updates.md` (throttling refactor) revealed pytest provides significant benefits for API testing (parametrization, fixtures, parallel execution). External research confirmed this is optimal timing for migration.
**Status**: In Progress (starting Task 1.1 - Add pytest dependencies)
**Estimated Effort**: 18-20 hours (2.5-3 days focused work)

## Context

**Why Now**: During Task 3.6 in `tasks-incidental-security-updates.md` (throttling refactor), we needed test infrastructure for selective throttling tests. External research revealed pytest provides substantial benefits for Django Ninja API testing beyond just this use case.

**Current State**:
- ~104 test methods across 14 files
- 19 TestCase classes using Django's unittest framework
- ~3,382 lines of test code
- Tests run via `python manage.py test --keepdb`

**Key Benefits Identified** (from external research 2025-10-13):
1. **Parametrized API testing**: Test multiple input variations without code duplication (killer feature for validation tests)
2. **Reusable fixtures**: Share authenticated clients, test data across modules (reduces boilerplate)
3. **Parallel execution**: 2-4x speedup with `pytest -n auto` (critical as suite grows to 50+ tests)
4. **Excellent type safety**: Native inline types work perfectly with Pyright strict mode
5. **Zero migration cost**: Existing tests run unchanged during incremental conversion

**Impact**:
- Prevents writing ~30 new rate limiting tests (Task 7.5.3 in `tasks-incidental-security-updates.md`) in old unittest style
- Eliminates dual-system maintenance burden
- Perfect timing: 100 tests is manageable but large enough to benefit immediately
- Enables faster test iteration (parallel execution)

**Research Report**: External research analyst comprehensive pytest analysis (2025-10-13)

## Scope

**Will Do**:
- Install pytest and pytest-django with proper configuration
- Create shared fixture infrastructure (conftest.py files)
- Convert all 104 existing tests to pytest style (function-based, fixtures, parametrize)
- Enable parallel test execution
- Update documentation and CI/CD configuration
- Run full quality gates to verify migration

**Won't Do** (future enhancements):
- pytest-xdist advanced features (initial setup uses basic parallel execution)
- pytest-factoryboy integration (can add later if needed)
- Custom pytest plugins (use built-in features first)
- Extensive parametrization of existing tests (do this incrementally as we touch tests)

## Tasks

- [x] 1. Setup pytest Infrastructure (2-3 hours)
    - [x] 1.1 Add pytest dependencies
        - [x] 1.1.1 Add `pytest >= 8.0.0, < 9.0` to `requirements/req.dev.txt`
        - [x] 1.1.2 Add `pytest-django >= 4.9.0, < 5.0` to `requirements/req.dev.txt`
        - [x] 1.1.3 Add `pytest-xdist >= 3.6.0, < 4.0` to `requirements/req.dev.txt` (parallel execution)
        - [x] 1.1.4 Add `pytest-cov >= 5.0.0, < 6.0` to `requirements/req.dev.txt` (coverage integration)
        - [x] 1.1.5 Install dependencies: `pip install -r requirements/req.dev.txt` (Docker container rebuilt)
    - [x] 1.2 Configure pyproject.toml
        - [x] 1.2.1 Add `[tool.pytest.ini_options]` section
        - [x] 1.2.2 Set `DJANGO_SETTINGS_MODULE = "config.settings_test"` (using test settings)
        - [x] 1.2.3 Configure testpaths, python_files patterns
        - [x] 1.2.4 Add addopts: `--reuse-db`, `--import-mode=importlib`, `--strict-markers`, `-ra`
        - [x] 1.2.5 Document pytest configuration in comments (added marker definitions)
    - [x] 1.3 Create root-level conftest.py
        - [x] 1.3.1 Create `apps/conftest.py` with common fixtures
        - [x] 1.3.2 Add `api_client` fixture (Django test client)
        - [x] 1.3.3 Add `user` fixture (create test user)
        - [x] 1.3.4 Add `auth_client` fixture (authenticated client)
        - [x] 1.3.5 Add type annotations for all fixtures
    - [x] 1.4 Verify backward compatibility
        - [x] 1.4.1 Run existing tests with pytest: `pytest apps/`
        - [x] 1.4.2 Verify tests pass: 79 passed, 15 skipped (expected DRF tests), 1 failing (pre-existing from Task 3.6)
        - [x] 1.4.3 Verify `--keepdb` equivalent: `pytest --reuse-db` (configured in pyproject.toml)
        - [x] 1.4.4 Document that unittest and pytest can coexist during migration (verified - unittest tests run unchanged)

- [x] 2. Migrate Authentication App Tests (6-7 hours, 44 tests)
    - [x] 2.1 Convert test_user_api.py (22 tests - includes throttling smoke tests)
        - [x] 2.1.1 Convert PublicUserApiTests class to function-based tests (11 tests)
        - [x] 2.1.2 Convert PrivateUserApiTests class to function-based tests (5 tests)
        - [x] 2.1.3 Convert AuthCookieIntegrationTests class to function-based tests (4 tests)
        - [x] 2.1.4 Convert ThrottlingSmokeTests class to function-based tests (2 tests)
        - [x] 2.1.5 Replace setUp/tearDown with fixtures (created authenticated_user, registered_user)
        - [x] 2.1.6 Use `@pytest.mark.django_db` decorator where needed (all tests marked)
        - [x] 2.1.7 Replace `self.assertEqual` with `assert` statements (all assertions converted)
        - [x] 2.1.8 Run tests to verify: 22/22 passing (100% - fixed pre-existing CSRF cookie test)
        - [x] 2.1.9 Suppress third-party Pydantic warnings (added filterwarnings to pyproject.toml)
    - [x] 2.2 Convert test_csrf_protection.py (12 tests)
        - [x] 2.2.1 Convert CsrfProtectionTests class to function-based tests (3 classes → function-based)
        - [x] 2.2.2 Extract CSRF token helper to fixture (created csrf_client fixture)
        - [x] 2.2.3 Replace TestCase assertions with assert statements (all assertions converted)
        - [x] 2.2.4 Run tests to verify: 12/12 passing (100%)
    - [x] 2.3 Convert test_security.py (10 tests)
        - [x] 2.3.1 Convert SecurityHeadersTests class to function-based tests (7 tests converted)
        - [x] 2.3.2 Convert JWTCookieSecurityTests class to function-based tests (3 tests + samesite_user fixture)
        - [x] 2.3.3 Use `@override_settings` as decorator (already compatible with pytest)
        - [x] 2.3.4 Run tests to verify: 10/10 passing (100%)
    - [x] 2.4 Convert test_oauth_mocks.py (OAuth fixtures)
        - [x] 2.4.1 Move OAuth mock fixtures to conftest.py
        - [x] 2.4.2 Convert to pytest fixture format
        - [x] 2.4.3 Document OAuth fixture usage
    - [x] 2.5 Consolidate authentication fixtures
        - [x] 2.5.1 Review apps/authentication/tests/fixtures.py
        - [x] 2.5.2 Move reusable fixtures to apps/authentication/tests/conftest.py
        - [x] 2.5.3 Add type annotations to all fixtures
        - [x] 2.5.4 Remove duplicate fixture definitions
    - [x] 2.6 Run full authentication test suite
        - [x] 2.6.1 Command: `pytest apps/authentication/tests/`
        - [x] 2.6.2 Verify all 44 tests pass (100% pass rate, 19.02s execution time)
        - [x] 2.6.3 Run with coverage: api.py 64.68%, middleware.py 100%, overall 22.67% (infrastructure files not yet tested)

- [x] 3. Migrate Movie App Tests (5-6 hours, 22 tests - 2 redundant tests deleted)
    - [x] 3.1 Convert test_movie_service.py (14 tests)
        - [x] 3.1.1 Convert MovieServiceTests class to function-based tests (4 classes → function-based with sections)
        - [x] 3.1.2 Extract TMDB mock fixtures to conftest.py (no shared fixtures needed - mocks are test-specific)
        - [x] 3.1.3 Replace setUp with fixtures (no setUp/tearDown methods existed)
        - [x] 3.1.4 Run tests to verify: 14/14 passing (100%, 0.18s execution time)
    - [x] 3.2 Convert test_movie_api.py (8 tests → 5 tests with 10 test cases)
        - [x] 3.2.1 Convert MovieAPITests class to function-based tests with parametrization
        - [x] 3.2.2 Created local client and test_user fixtures (no shared fixture needed)
        - [x] 3.2.3 Parametrized 4 paginated endpoint tests into 1 test (now_playing, upcoming, search, discover)
        - [x] 3.2.4 Parametrized 3 validation error tests into 1 test (invalid year, vote_average_gte, runtime_gte)
        - [x] 3.2.5 Run tests to verify: 10/10 test cases passing (100%, 0.77s execution time)
    - [x] 3.3 Consolidate test_paginated_views.py (2 tests → DELETED)
        - [x] 3.3.1 Identified as redundant with test_movie_api.py (both test same Django Ninja endpoints)
        - [x] 3.3.2 Enhanced test_movie_api.py with granular field checks from test_paginated_views.py
        - [x] 3.3.3 Deleted test_paginated_views.py (redundant, used legacy rest_framework import)
        - [x] 3.3.4 Result: No additional tests needed - coverage preserved in parametrized test
    - [x] 3.4 Create apps/movie/tests/conftest.py (SKIPPED - not needed)
        - [x] 3.4.1 Analysis: No cross-file fixture sharing between test_movie_api.py and test_movie_service.py
        - [x] 3.4.2 Analysis: Root conftest.py already provides api_client and user fixtures
        - [x] 3.4.3 Refactored test_movie_api.py to use root fixtures (api_client, user) instead of local overrides
        - [x] 3.4.4 Removed unused attach_pass_through_data() helper function
        - [x] 3.4.5 Result: No movie-specific conftest.py needed (YAGNI principle)
    - [x] 3.5 Run full movie test suite
        - [x] 3.5.1 Command: `pytest apps/movie/tests/` - 24/24 tests passing (100%, 0.80s)
        - [x] 3.5.2 Verify all tests pass - ✅ Perfect execution, no failures
        - [x] 3.5.3 Run with coverage: `pytest apps/movie/tests/ --cov=apps.movie --cov-report=term-missing`
        - [x] 3.5.4 Coverage results (before config optimization):
            - movie/api.py: 88.64% coverage (5 lines missing - error handlers for edge cases)
            - movie/schemas.py: 0% (expected - Pydantic models have no testable logic)
            - movie/apps.py: 0% (expected - Django app configuration)
            - Overall: 15.92% (misleading - schemas inflate denominator)
            - **Actionable coverage**: API layer 88.64% ✅ (exceeds 80% threshold)
        - [x] 3.5.5 Added coverage configuration to pyproject.toml:
            - Configured omit patterns to exclude schemas, apps.py, migrations, admin, etc.
            - Set fail_under = 80% threshold
            - Added exclude_lines for defensive code, type checking, protocols
            - Configured HTML and JSON report outputs
            - Result: Coverage now focuses on business logic (APIs, services, middleware)

- [x] 4. Write Django Ninja API Tests for UserMovieData (3-4 hours, 23 tests - NEW tests)
    **Note**: This work was originally planned for Task 6.1 in `tasks-api-layer-modernization-p2.md` (Phase 6: Testing Migration). However, since we were already here converting tests to pytest as part of the pytest migration incidental work, we decided to write the Django Ninja API tests now rather than convert legacy DRF tests that would be deleted later. This provides immediate value (zero test coverage → comprehensive coverage) and avoids throwaway work.

    **CRITICAL BUG FIXED**: Discovered production bug in `user_movie_data/api.py:90` - create endpoint was querying `Movie.id` instead of `Movie.tmdb_id`, causing all POST requests to fail. Fixed by changing lookup to use tmdb_id.

    **DRY REFACTORING**: Consolidated duplicate `get_csrf_token()` helper to `core/tests/test_helpers.py` (was duplicated in 2 files). Also modernized `test_user_api.py` to use HTTPStatus enum instead of raw integers for consistency.

    - [x] 4.1 Write test_user_movie_data_api.py for Django Ninja endpoints (23 tests)
        - [x] 4.1.1 Replace legacy DRF tests with Django Ninja API tests (wrote comprehensive new tests)
        - [x] 4.1.2 Write authentication tests (4 tests - removed invalid parametrized test attempting GET on PATCH/DELETE endpoint)
        - [x] 4.1.3 Write GET /by-tmdb-id tests (3 tests - success, not found, user isolation)
        - [x] 4.1.4 Write POST /create tests (6 tests - success, defaults, duplicate, invalid movie, parametrized invalid ratings)
        - [x] 4.1.5 Write PATCH /update tests (6 tests - partial update, single field, not found, wrong user, parametrized invalid ratings)
        - [x] 4.1.6 Write DELETE tests (4 tests - success, not found, wrong user)
        - [x] 4.1.7 Create authenticated_user fixture with JWT cookie authentication (follows test_user_api.py pattern)
        - [x] 4.1.8 Update all tests to use authenticated_user: tuple[Client, User] pattern (all 23 tests updated)
        - [x] 4.1.9 Add CSRF token support to all POST/PATCH/DELETE requests via get_csrf_token() helper
        - [x] 4.1.10 Fix API bug: Changed `Movie.id` to `Movie.tmdb_id` in create endpoint (line 90)
        - [x] 4.1.11 Adjust test expectations for CSRF middleware behavior (403 for unauthenticated mutations, not 401)
        - [x] 4.1.12 Run tests to verify: 23/23 passing (100%, 13.86s execution time)
    - [x] 4.2 Fixture analysis and optimization
        - [x] 4.2.1 Analyzed root user fixture (creates unverified users - incompatible with JWT)
        - [x] 4.2.2 Decision: Use authenticated_user pattern from test_user_api.py (creates verified user + JWT cookies)
        - [x] 4.2.3 Verified no app-specific conftest.py needed (inline fixtures sufficient - movie, other_movie, other_user, user_movie_data)
    - [x] 4.3 DRY refactoring and code quality improvements
        - [x] 4.3.1 Added get_csrf_token() to core/tests/test_helpers.py (shared helper for CSRF-protected endpoints)
        - [x] 4.3.2 Removed duplicate from authentication/tests/test_csrf_protection.py (4 inline usages updated)
        - [x] 4.3.3 Removed duplicate from user_movie_data/tests/test_user_movie_data_api.py (imports from test_helpers)
        - [x] 4.3.4 Modernized authentication/tests/test_user_api.py HTTP status constants (raw integers → HTTPStatus enum)
        - [x] 4.3.5 Run affected tests to verify: 57/57 passing (UserMovieData 23 + CSRF 12 + User API 22)
    - [x] 4.4 Run full user_movie_data test suite
        - [x] 4.4.1 Command: `pytest apps/user_movie_data/tests/ -v`
        - [x] 4.4.2 Verify all 23 tests pass (100%, 13.86s execution time)
        - [x] 4.4.3 Quality checks: 0 Ruff violations, 0 Pyright errors
        - [x] 4.4.4 Coverage: Not run (will be part of Task 7.4 final coverage analysis)

- [x] 5. Migrate Core App Tests (2-3 hours, 12 tests)
    - [x] 5.1 Convert test_models.py (7 tests)
        - [x] 5.1.1 Convert ModelTests class to function-based tests (7 tests converted)
        - [x] 5.1.2 Use `@pytest.mark.django_db` for model tests (all tests marked)
        - [x] 5.1.3 Run tests to verify: 7/7 passing (100%, 1.66s execution time)
    - [x] 5.2 Convert test_admin.py (3 tests)
        - [x] 5.2.1 Convert AdminTests class to function-based tests (3 tests converted)
        - [x] 5.2.2 Add admin_client fixture (created tuple[Client, admin_user, regular_user] fixture)
        - [x] 5.2.3 Run tests to verify: 3/3 passing (100%, 2.38s execution time)
    - [x] 5.3 Convert test_commands.py (2 tests)
        - [x] 5.3.1 Convert CommandTests class to function-based tests (2 tests converted)
        - [x] 5.3.2 Keep @patch decorators (pytest-compatible, no capsys needed)
        - [x] 5.3.3 Run tests to verify: 2/2 passing (100%, 0.13s execution time)
    - [x] 5.4 Run full core test suite
        - [x] 5.4.1 Command: `pytest apps/core/tests/` - 12/12 tests passing (100%, 4.02s)
        - [x] 5.4.2 Quality checks: 1 Ruff violation fixed, 0 Pyright errors

- [ ] 6. Migrate Management Command Tests (1-2 hours, 10 tests)
    - [ ] 6.1 Convert test_tmdb_logging.py (6 tests)
        - [ ] 6.1.1 Convert TMDBLoggingTests class to function-based tests
        - [ ] 6.1.2 Use pytest logging fixtures
        - [ ] 6.1.3 Run tests to verify: `pytest apps/core/management/commands/test_tmdb_logging.py`
    - [ ] 6.2 Convert test_logging.py (4 tests)
        - [ ] 6.2.1 Convert LoggingTests class to function-based tests
        - [ ] 6.2.2 Run tests to verify: `pytest apps/core/management/commands/test_logging.py`

- [ ] 7. Cleanup and Optimization (2-3 hours)
    - [ ] 7.1 Remove unused imports
        - [ ] 7.1.1 Remove `from django.test import TestCase` imports
        - [ ] 7.1.2 Remove `unittest` imports
        - [ ] 7.1.3 Run linting: `.venv-backend/bin/ruff check apps/*/tests/ --fix`
    - [ ] 7.2 Update test execution documentation
        - [ ] 7.2.1 Document new pytest commands in README or testing docs
        - [ ] 7.2.2 Add examples: `pytest`, `pytest -n auto`, `pytest --reuse-db`
        - [ ] 7.2.3 Document fixture usage patterns
        - [ ] 7.2.4 Add type checking command: `npx pyright apps/*/tests/`
    - [ ] 7.3 Enable parallel execution by default
        - [ ] 7.3.1 Add `-n auto` to pyproject.toml addopts (or document as optional)
        - [ ] 7.3.2 Test parallel execution: `pytest -n auto apps/`
        - [ ] 7.3.3 Verify all 104 tests pass in parallel mode
        - [ ] 7.3.4 Benchmark speedup vs sequential execution
    - [ ] 7.4 Configure coverage reporting
        - [ ] 7.4.1 Add coverage configuration to pyproject.toml
        - [ ] 7.4.2 Set source paths, omit patterns
        - [ ] 7.4.3 Test coverage: `pytest --cov=apps --cov-report=html`
        - [ ] 7.4.4 Verify 90%+ coverage for authentication app (critical path requirement)
    - [ ] 7.5 Update CI/CD configuration (if applicable)
        - [ ] 7.5.1 Update test commands in CI pipeline
        - [ ] 7.5.2 Add pytest cache to CI artifacts
        - [ ] 7.5.3 Configure coverage reporting for CI

- [ ] 8. Full Quality Gates (1 hour)
    - [ ] 8.1 Run all backend tests
        - [ ] 8.1.1 Command: `pytest apps/`
        - [ ] 8.1.2 Verify 100% pass rate (104/104 tests)
        - [ ] 8.1.3 Run with parallel: `pytest -n auto apps/`
        - [ ] 8.1.4 Verify parallel execution works correctly
    - [ ] 8.2 Run type checking on test files
        - [ ] 8.2.1 Command: `npx pyright apps/*/tests/ --project backend`
        - [ ] 8.2.2 Verify zero type errors
        - [ ] 8.2.3 Verify fixture type inference works correctly
    - [ ] 8.3 Run linting on test files
        - [ ] 8.3.1 Backend: `.venv-backend/bin/ruff check apps/*/tests/`
        - [ ] 8.3.2 Verify zero violations
    - [ ] 8.4 Run coverage analysis
        - [ ] 8.4.1 Command: `pytest --cov=apps --cov-report=term-missing apps/`
        - [ ] 8.4.2 Verify 90%+ coverage for authentication app
        - [ ] 8.4.3 Document coverage baselines for each app
    - [ ] 8.5 Performance benchmark
        - [ ] 8.5.1 Time sequential execution: `time pytest apps/`
        - [ ] 8.5.2 Time parallel execution: `time pytest -n auto apps/`
        - [ ] 8.5.3 Document speedup achieved (expected: 2-4x)

- [ ] 9. Documentation (1 hour)
    - [ ] 9.1 Update testing strategy document
        - [ ] 9.1.1 Update `.arc/reference/strategies/strategy-testing-methodology.md`
        - [ ] 9.1.2 Add pytest patterns and best practices
        - [ ] 9.1.3 Document fixture hierarchy
        - [ ] 9.1.4 Add parametrization examples
    - [ ] 9.2 Update task completion notes
        - [ ] 9.2.1 Add completion summary to this file
        - [ ] 9.2.2 Document migration outcomes (time taken, tests converted, speedup achieved)
        - [ ] 9.2.3 Document lessons learned
        - [ ] 9.2.4 Note any tests that needed special handling

## Relevant Files

**Dependencies:**
- `requirements/req.dev.txt` - pytest and related packages (UPDATED - added pytest, pytest-django, pytest-xdist, pytest-cov)

**Configuration:**
- `pyproject.toml` - pytest configuration (UPDATED - added [tool.pytest.ini_options], filterwarnings for third-party Pydantic deprecations)

**Test Infrastructure:**
- `apps/conftest.py` - Root-level shared fixtures (CREATED - api_client, user, auth_client fixtures + FIXED User import pattern)
- `apps/authentication/tests/conftest.py` - Auth-specific fixtures (UPDATED - throttling + OAuth + convenience wrappers for factory functions)
- `apps/authentication/tests/fixtures.py` - Factory functions for test data creation (UPDATED - enhanced docstring explaining hybrid pattern)
- `apps/core/tests/test_helpers.py` - Shared test utilities (UPDATED - added get_csrf_token() helper, HTTPStatus enum export)
- `apps/movie/tests/conftest.py` - Movie-specific fixtures (SKIPPED - not needed per YAGNI)
- `apps/user_movie_data/tests/conftest.py` - UserMovieData fixtures (SKIPPED - inline fixtures sufficient)

**Test Files to Convert (14 files, 90 tests + 23 new tests = 113 total):**
- `apps/authentication/tests/test_user_api.py` - 22 tests (CONVERTED + modernized HTTPStatus constants)
- `apps/authentication/tests/test_csrf_protection.py` - 12 tests (CONVERTED + refactored to use shared get_csrf_token)
- `apps/authentication/tests/test_security.py` - 10 tests (CONVERTED)
- `apps/authentication/tests/test_oauth_mocks.py` - OAuth mock classes (CONVERTED to fixtures in conftest.py)
- `apps/authentication/tests/fixtures.py` - Factory functions (CONSOLIDATED - hybrid pattern with conftest.py wrappers)
- `apps/movie/tests/test_movie_service.py` - 14 tests (CONVERTED to pytest)
- `apps/movie/tests/test_movie_api.py` - 8 tests (CONVERTED to pytest with parametrization - 10 test cases, enhanced with granular field checks)
- `apps/movie/tests/test_paginated_views.py` - 2 tests (DELETED - redundant with test_movie_api.py)
- `apps/user_movie_data/tests/test_user_movie_data_api.py` - 23 tests (REWRITTEN - legacy DRF tests replaced with comprehensive Django Ninja API tests + JWT auth + CSRF + fixed production bug)
- `apps/user_movie_data/api.py` - API implementation (FIXED CRITICAL BUG - Movie.id → Movie.tmdb_id on line 90)
- `apps/core/tests/test_models.py` - 7 tests (CONVERTED to pytest - function-based with @pytest.mark.django_db)
- `apps/core/tests/test_admin.py` - 3 tests (CONVERTED to pytest - created admin_client fixture)
- `apps/core/tests/test_commands.py` - 2 tests (CONVERTED to pytest - kept @patch decorators)
- `apps/core/management/commands/test_tmdb_logging.py` - 6 tests
- `apps/core/management/commands/test_logging.py` - 4 tests

**Documentation:**
- `.arc/reference/strategies/strategy-testing-methodology.md` - Testing strategy (UPDATE)

## Active References

- **External Research Report**: 2025-10-13 comprehensive pytest analysis (see CURRENT-SESSION.md for full report)
- **Migration Strategy**: Incremental conversion, app-by-app approach
- **Type Safety**: pytest inline types + django-stubs for complete coverage

## Completion Notes

{To be filled after completion}

## References

- pytest documentation: <https://docs.pytest.org/>
- pytest-django documentation: <https://pytest-django.readthedocs.io/>
- External Research Report: 2025-10-13 pytest benefits analysis
- Type Safety Strategy: `.arc/reference/strategies/strategy-type-safety.md`
- Testing Methodology: `.arc/reference/strategies/strategy-testing-methodology.md`
