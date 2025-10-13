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

- [ ] 2. Migrate Authentication App Tests (6-7 hours, 43 tests)
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
    - [ ] 2.2 Convert test_csrf_protection.py (12 tests)
        - [ ] 2.2.1 Convert CsrfProtectionTests class to function-based tests
        - [ ] 2.2.2 Extract CSRF token helper to fixture
        - [ ] 2.2.3 Replace TestCase assertions with assert statements
        - [ ] 2.2.4 Run tests to verify: `pytest apps/authentication/tests/test_csrf_protection.py`
    - [ ] 2.3 Convert test_security.py (10 tests)
        - [ ] 2.3.1 Convert SecurityHeadersTests class to function-based tests
        - [ ] 2.3.2 Convert JWTCookieSecurityTests class to function-based tests
        - [ ] 2.3.3 Use `@override_settings` as decorator instead of context manager where appropriate
        - [ ] 2.3.4 Run tests to verify: `pytest apps/authentication/tests/test_security.py`
    - [ ] 2.4 Convert test_oauth_mocks.py (OAuth fixtures)
        - [ ] 2.4.1 Move OAuth mock fixtures to conftest.py
        - [ ] 2.4.2 Convert to pytest fixture format
        - [ ] 2.4.3 Document OAuth fixture usage
    - [ ] 2.5 Consolidate authentication fixtures
        - [ ] 2.5.1 Review apps/authentication/tests/fixtures.py
        - [ ] 2.5.2 Move reusable fixtures to apps/authentication/tests/conftest.py
        - [ ] 2.5.3 Add type annotations to all fixtures
        - [ ] 2.5.4 Remove duplicate fixture definitions
    - [ ] 2.6 Run full authentication test suite
        - [ ] 2.6.1 Command: `pytest apps/authentication/tests/`
        - [ ] 2.6.2 Verify all 43 tests pass
        - [ ] 2.6.3 Run with coverage: `pytest apps/authentication/tests/ --cov=apps.authentication`

- [ ] 3. Migrate Movie App Tests (5-6 hours, 24 tests)
    - [ ] 3.1 Convert test_movie_service.py (14 tests)
        - [ ] 3.1.1 Convert MovieServiceTests class to function-based tests
        - [ ] 3.1.2 Extract TMDB mock fixtures to conftest.py
        - [ ] 3.1.3 Replace setUp with fixtures
        - [ ] 3.1.4 Run tests to verify: `pytest apps/movie/tests/test_movie_service.py`
    - [ ] 3.2 Convert test_movie_api.py (8 tests)
        - [ ] 3.2.1 Convert MovieAPITests class to function-based tests
        - [ ] 3.2.2 Use shared api_client fixture
        - [ ] 3.2.3 Parametrize validation tests if applicable
        - [ ] 3.2.4 Run tests to verify: `pytest apps/movie/tests/test_movie_api.py`
    - [ ] 3.3 Convert test_paginated_views.py (2 tests)
        - [ ] 3.3.1 Convert pagination tests to function-based
        - [ ] 3.3.2 Note: File is in legacy DRF exclusion list - verify if still needed
        - [ ] 3.3.3 Run tests to verify: `pytest apps/movie/tests/test_paginated_views.py`
    - [ ] 3.4 Create apps/movie/tests/conftest.py
        - [ ] 3.4.1 Add movie-specific fixtures (TMDB mocks, movie instances)
        - [ ] 3.4.2 Add type annotations
        - [ ] 3.4.3 Document fixture usage
    - [ ] 3.5 Run full movie test suite
        - [ ] 3.5.1 Command: `pytest apps/movie/tests/`
        - [ ] 3.5.2 Verify all 24 tests pass
        - [ ] 3.5.3 Run with coverage: `pytest apps/movie/tests/ --cov=apps.movie`

- [ ] 4. Migrate UserMovieData App Tests (3-4 hours, 15 tests)
    - [ ] 4.1 Convert test_user_movie_data_api.py (15 tests)
        - [ ] 4.1.1 Convert UserMovieDataAPITests class to function-based tests
        - [ ] 4.1.2 Extract user movie data fixtures to conftest.py
        - [ ] 4.1.3 Use composition: combine user, movie, and auth fixtures
        - [ ] 4.1.4 Parametrize CRUD operation tests if applicable
        - [ ] 4.1.5 Run tests to verify: `pytest apps/user_movie_data/tests/test_user_movie_data_api.py`
    - [ ] 4.2 Create apps/user_movie_data/tests/conftest.py
        - [ ] 4.2.1 Add user_movie_data fixture (create test data)
        - [ ] 4.2.2 Compose with user and movie fixtures from parent conftest
        - [ ] 4.2.3 Add type annotations
    - [ ] 4.3 Run full user_movie_data test suite
        - [ ] 4.3.1 Command: `pytest apps/user_movie_data/tests/`
        - [ ] 4.3.2 Verify all 15 tests pass
        - [ ] 4.3.3 Run with coverage: `pytest apps/user_movie_data/tests/ --cov=apps.user_movie_data`

- [ ] 5. Migrate Core App Tests (2-3 hours, 12 tests)
    - [ ] 5.1 Convert test_models.py (7 tests)
        - [ ] 5.1.1 Convert ModelTests class to function-based tests
        - [ ] 5.1.2 Use `@pytest.mark.django_db` for model tests
        - [ ] 5.1.3 Run tests to verify: `pytest apps/core/tests/test_models.py`
    - [ ] 5.2 Convert test_admin.py (3 tests)
        - [ ] 5.2.1 Convert AdminTests class to function-based tests
        - [ ] 5.2.2 Add admin_client fixture if needed
        - [ ] 5.2.3 Run tests to verify: `pytest apps/core/tests/test_admin.py`
    - [ ] 5.3 Convert test_commands.py (2 tests)
        - [ ] 5.3.1 Convert CommandTests class to function-based tests
        - [ ] 5.3.2 Use pytest's built-in capsys fixture for stdout capture
        - [ ] 5.3.3 Run tests to verify: `pytest apps/core/tests/test_commands.py`
    - [ ] 5.4 Run full core test suite
        - [ ] 5.4.1 Command: `pytest apps/core/tests/`
        - [ ] 5.4.2 Verify all 12 tests pass

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
- `apps/conftest.py` - Root-level shared fixtures (CREATED - api_client, user, auth_client fixtures)
- `apps/authentication/tests/conftest.py` - Auth-specific fixtures (EXISTS - throttling fixtures from Task 3.6)
- `apps/movie/tests/conftest.py` - Movie-specific fixtures (TO BE CREATED in Task 3.4)
- `apps/user_movie_data/tests/conftest.py` - UserMovieData fixtures (TO BE CREATED in Task 4.2)

**Test Files to Convert (14 files, 104 tests):**
- `apps/authentication/tests/test_user_api.py` - 21 tests
- `apps/authentication/tests/test_csrf_protection.py` - 12 tests
- `apps/authentication/tests/test_security.py` - 10 tests
- `apps/authentication/tests/test_oauth_mocks.py` - fixtures
- `apps/authentication/tests/fixtures.py` - fixtures
- `apps/movie/tests/test_movie_service.py` - 14 tests
- `apps/movie/tests/test_movie_api.py` - 8 tests
- `apps/movie/tests/test_paginated_views.py` - 2 tests
- `apps/user_movie_data/tests/test_user_movie_data_api.py` - 15 tests
- `apps/core/tests/test_models.py` - 7 tests
- `apps/core/tests/test_admin.py` - 3 tests
- `apps/core/tests/test_commands.py` - 2 tests
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
