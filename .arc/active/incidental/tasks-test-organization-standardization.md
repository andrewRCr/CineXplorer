# Incidental: Test Organization Standardization

**Created:** 2025-10-30
**Branch:** `technical/service-layer-modernization`
**Status:** Active

## Context

**Discovered:** During Phase 3 planning for buffer deduplication work, identified test organization
inconsistencies and file size issues that would compound when adding 15+ new tests.

**Interrupts:** `.arc/active/incidental/tasks-buffer-deduplication-data-quality.md` at Task 3.1 (before writing new tests)

**Paused At:** Phase 3 complete (2025-10-30)
**Resumed:** 2025-11-26 (after endpoint consolidation work)

**Problem:** Test organization is inconsistent and some files have grown beyond maintainable size:

1. **Backend inconsistency:** Tests live in flat `apps/{app}/tests/` directories without unit/integration separation
2. **Massive test files:**
   - `test_movie_api.py`: 1,503 lines (significant overlap with new DRY tests created during endpoint consolidation)
   - `test_result_filtering.py`: 1,561 lines (service layer tests, split plan unchanged)
   - Several files at 500-670 lines (borderline, per Phase 3 decisions some kept intact)
3. **Frontend inconsistency:** Mix of patterns (`.integration.test.tsx` vs `Integration.test.tsx`)
4. **No pytest markers:** Missing unit/integration/e2e markers for selective execution

**Why Now:**

- About to add ~15 new tests for Phase 3-6 deduplication work
- Establishing clean patterns BEFORE adding tests prevents future rework
- Navigation difficulty in 1500-line test files harms productivity
- Leave It Cleaner principle: Fix organization issues when touching test code
- One-time migration cost provides permanent benefits

**Research Completed:** External research agent analyzed pytest/Vitest best practices from Django REST
Framework, FastAPI, pytest documentation, and React ecosystem. Key findings:

- **pytest standard:** Directory-based separation (`tests/unit/`, `tests/integration/`) not file suffixes
- **File splitting:** 200-400 lines per file recommended, organize by feature/endpoint for APIs
- **Frontend:** Co-location is idiomatic, `.integration.test.tsx` suffix acceptable
- **Fixtures:** Keep at app-level conftest.py (pytest_plugins premature at 14 fixtures)

## Root Cause Analysis

**Why tests grew large:**

1. **No organizational framework:** Flat directory structure encouraged "just add to existing file"
2. **No size guidelines:** Strategy doc didn't specify file size limits
3. **Feature accretion:** API endpoints and filter types added over time without refactoring

**Impact:**

- Hard to find specific tests (searching 1500 lines)
- Difficult to run subset of tests (no unit/integration separation)
- Merge conflicts when multiple features touch same file
- Slower test discovery and execution

## Scope

### Will Do

- ✅ Update `.arc/reference/strategies/strategy-testing-methodology.md` with standardized patterns
- ✅ Create `tests/unit/` and `tests/integration/` directories for all backend apps
- ✅ Analyze and split `test_movie_api.py` (1512 lines) into logical files
- ✅ Analyze and split `test_result_filtering.py` (1412 lines) into logical files
- ✅ Move all existing backend tests to appropriate directories
- ✅ Update pytest configuration with unit/integration/e2e markers
- ✅ Verify CI/CD pipeline still works after migration
- ✅ Post-migration audit: Check for remaining oversized files
- ✅ Run full quality gates to verify all tests still pass

### Won't Do

- ❌ Frontend test restructuring (current `__tests__/` pattern is fine, minimal changes only)
- ❌ pytest_plugins modularization (premature at 14 fixtures, revisit at 50+)
- ❌ Change from pytest to different test framework
- ❌ Rewrite test logic (migration only, preserve behavior)
- ❌ Add new test coverage (separate from organization work)
- ❌ Migrate to true co-location for frontend (keep `__tests__/` directories)

---

## Tasks

### **Phase 1:** Update Testing Strategy Documentation

- [x] **1.1 Update strategy-testing-methodology.md with standardized patterns**

    **Goal:** Document the new directory-based organization pattern as the project standard.

    - [x] **1.1.1 Add "Test Organization Standards" section**
        - Added directory structure examples for backend (pytest) and frontend (Vitest)
        - Documented when to use unit vs integration vs E2E tests
        - Added file splitting guidelines table (200-400 line thresholds)
        - Location: After "Testing Philosophy" section (line 86)

    - [x] **1.1.2 Add "File Splitting Guidelines" section**
        - API tests: Split by endpoint + aspect (e.g., `test_discover_filtering.py`)
        - Business logic: Split by domain/feature (e.g., `test_genre_filters.py`)
        - Naming conventions: `test_{resource}_{feature}_{aspect}.py`
        - When NOT to split criteria included
        - Organizing split files: subdirectories vs flat structure
        - Location: Within "Test Organization Standards" section

    - [x] **1.1.3 Update pytest configuration examples**
        - Added directory-based execution commands (`pytest apps/*/tests/unit/`)
        - Added marker-based execution examples (`pytest -m unit`)
        - Documented both approaches (directory is primary, markers as supplement)
        - Location: "Backend Testing" > "Running Tests" section (line 262)

    - [x] **1.1.4 Run markdown linting on updated strategy doc**
        - Command: `npx markdownlint-cli2 --fix --no-globs ".arc/reference/strategies/strategy-testing-methodology.md"`
        - Result: 0 errors, all formatting correct
        - All code examples render properly

### **Phase 2:** Create Backend Directory Structure

**Purpose:** Establish unit/integration/e2e directories for all backend apps.

- [x] **2.1 Create directory structure for movie app**
    - Created `backend/apps/movie/tests/unit/`, `integration/`, `e2e/`
    - Created placeholder `conftest.py` in unit/ and integration/
    - Existing shared fixtures remain in parent `conftest.py`

- [x] **2.2 Create directory structure for authentication app**
    - Created `backend/apps/authentication/tests/unit/`, `integration/`, `e2e/`
    - Created placeholder `conftest.py` in unit/ and integration/

- [x] **2.3 Create directory structure for user_movie_data app**
    - Created `backend/apps/user_movie_data/tests/unit/`, `integration/`, `e2e/`
    - Created placeholder `conftest.py` in unit/ and integration/

- [x] **2.4 Create directory structure for core app**
    - Created `backend/apps/core/tests/unit/`, `integration/`, `e2e/`
    - Created placeholder `conftest.py` in unit/ and integration/

**Structure created:**

- 4 apps × 3 directories (unit, integration, e2e) = 12 directories total
- 4 apps × 2 conftest files (unit, integration) = 8 conftest.py files
- All directories verified present with correct paths

### **Phase 3:** Analyze and Split Large Test Files

**Purpose:** Identify logical split points for oversized test files based on actual test structure.

- [x] **3.1 Analyze test_movie_api.py (1512 lines)**

    - [x] **3.1.1 Read file and catalog test structure**
        - Cataloged all 23 test functions with purposes
        - Identified 7 natural groupings by endpoint + aspect
        - Documented shared fixtures: api_client, user, TMDB mocks, test helpers
        - **Findings documented** in notes file under "test_movie_api.py Analysis" section

    - [x] **3.1.2 Propose split strategy**
        - **Strategy:** Endpoint + aspect split (7 files, 80-500 lines each)
        - **Files proposed:**
          1. test_paginated_endpoints_contract.py (~80 lines) - Basic contract for all paginated endpoints
          2. test_discover_filtering.py (~90 lines) - Filter parameters & validation
          3. test_discover_filter_integration.py (~250 lines) - Backend filter integration
          4. test_discover_pagination.py (~240 lines) - Pagination metadata tracking
          5. test_discover_deduplication.py (~500 lines) - Buffer deduplication (TDD tests)
          6. test_genres_keywords_people.py (~140 lines) - Genres/keywords/people endpoints
          7. test_movie_detail.py (~100 lines) - Movie detail with auth variations
        - **Rationale:** Discover endpoint dominates (71% of file), splitting by aspect creates maintainable files
        - **Complete strategy documented** in notes file for approval

- [x] **3.2 Analyze test_result_filtering.py (1412 lines)**

    - [x] **3.2.1 Read file and catalog test structure**
        - Cataloged all 30 test functions organized into 10 categories
        - Identified test types: filter validation, buffer mechanism, endpoint integration, data quality checks
        - Documented fixtures: None (unit tests use direct MovieService instantiation with mocked TMDB client)
        - **Findings documented** in notes file under "test_result_filtering.py Analysis" section

    - [x] **3.2.2 Propose split strategy**
        - **Strategy:** Filter domain split (8 files, 80-294 lines each)
        - **Files proposed:**
          1. test_year_filtering.py (~200 lines) - Year filters + combined year+rating
          2. test_rating_filtering.py (~140 lines) - Rating filters (placeholder, range, missing)
          3. test_vote_count_filtering.py (~120 lines) - Vote count quality filters
          4. test_completeness_filtering.py (~160 lines) - Completeness checks (poster, title)
          5. test_historical_validation.py (~120 lines) - Pre-cinema date validation
          6. test_genre_quality_filtering.py (~144 lines) - Genre quality checks
          7. test_buffer_mechanism.py (~294 lines) - Buffer mechanism tests
          8. test_endpoint_filtering_integration.py (~180 lines) - Cross-cutting concerns
        - **Rationale:** Filter types are independent with clear boundaries, buffer is shared concern
        - **Complete strategy documented** in notes file for approval

- [x] **3.3 Identify other oversized files (500+ lines)**

    - [x] **3.3.1 Generate line count report**
        - Generated comprehensive line count report for all test files
        - Identified 11 files over 500 lines (including already analyzed test_movie_api.py and
          test_result_filtering.py)
        - **Candidates documented** in notes file under "Other Oversized Files" section

    - [x] **3.3.2 Assess split necessity**
        - Assessed 9 additional files (500-672 lines)
        - **Split recommended:** 3 files (test_user_movie_data_api.py, test_watchlist_endpoint.py,
          test_user_api.py)
        - **Keep intact:** 6 files (single focus, borderline threshold, parametrized tests, TDD features)
        - **Decisions documented** with rationale in notes file under "Other Oversized Files" section
        - Split criteria: Multiple concerns, multiple endpoints, 2x+ over threshold
        - Keep criteria: Single cohesive focus, borderline threshold, artificial boundaries

---

### Re-evaluation Note (2025-11-26)

**Context:** Task list paused at Phase 3 complete for `tasks-discover-endpoint-consolidation.md` work. Returning
after significant codebase changes require reassessment of Phase 4+ tasks.

**Key changes since Phase 3:**

- Test count grew from 374 → 454 tests (+80 tests, ~51 in new DRY infrastructure)
- New DRY test infrastructure created in `tests/integration/api/`:
    - `EndpointConfig` pattern for parametrized multi-endpoint tests
    - `tmdb_test_builders.py` for validated mock data
    - 3 new test files (51 tests) using DRY parametrized patterns
- `test_movie_api.py` now has significant overlap with new tests
- `test_result_filtering.py` grew by 149 lines (3 new tests)

**Strategy revision for test_movie_api.py:**

- Original plan: Split into 7 new files
- Revised plan: Consolidate unique tests into existing `integration/api/` structure, delete redundant tests
- Rationale: New infrastructure is more DRY; creating separate files would duplicate coverage

**test_result_filtering.py unchanged:** Original split plan still valid (different layer - service vs API)

**Line threshold flexibility:** Hard limit 800 lines, soft target 400 lines. DRY parametrized files (like
`test_browse_endpoints.py` at 648 lines for 90 logical tests) are acceptable.

See updated `notes-test-organization-standardization.md` for detailed analysis.

---

### **Phase 4:** Execute File Splits and Migration (Revised) ✅

**Purpose:** Consolidate redundant tests, migrate unique tests to new structure, split service layer tests.

**Phase 4 Complete:** All 6 tasks (4.1-4.6) finished. Key findings:

- Pre-categorizations in 4.5 and 4.6 were incorrect (tests marked as "unit" used real DB)
- Bonus: Refactored user_movie_data service tests to true unit tests with Mock pattern
- auth and core apps have no true unit tests (all integration due to cross-cutting nature)

- [x] **4.1 Consolidate test_movie_api.py into existing structure** ✅

    **Goal:** Eliminate redundancy with new `integration/api/` tests while preserving unique coverage.

    - [x] **4.1.1 Audit tests for overlap with new infrastructure** ✅
        - Read each test in `test_movie_api.py` (28 tests)
        - Compare against `test_browse_endpoints.py`, `test_browse_sort_options.py`, `test_date_constrained_endpoints.py`
        - Categorize each test as: redundant (delete), unique (migrate), or partial overlap (assess)
        - Document findings in notes file
        - **Result:** 12 redundant, 14 unique, 2 partial. See notes file "Detailed Overlap Analysis" section.

    - [x] **4.1.2 Migrate reference endpoint tests** ✅
        - Create `tests/integration/api/test_reference_endpoints.py`
        - Move: `test_get_movie_genres`, `test_get_popular_keywords`, `test_search_keywords`,
          `test_get_popular_people`, `test_search_people`
        - Run tests to verify: `docker compose -f ../infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/api/test_reference_endpoints.py`
        - **Result:** 5/5 tests pass, linting clean

    - [x] **4.1.3 Migrate movie detail tests** ✅
        - Create `tests/integration/api/test_movie_detail.py`
        - Move: `test_get_movie_detail_authenticated`, `test_get_movie_detail_unauthenticated`
        - Run tests to verify
        - **Result:** 2/2 tests pass, linting clean

    - [x] **4.1.4 Assess and migrate pagination metadata tests** ✅
        - Evaluate: `test_browse_returns_next_tmdb_page_start_after_buffer`, `test_browse_continues_from_tmdb_page_start_parameter`,
          `test_browse_no_duplicates_across_sequential_pages`, `test_browse_fallback_when_tmdb_page_start_omitted`
        - If unique: Create `tests/integration/api/test_browse_pagination.py` or add to existing file
        - If covered by new tests: Mark for deletion
        - **Result:** Created `test_browse_pagination.py` with 6 tests (5 pass + 1 xfail). Includes max_buffer_pages,
        cross-page dedup, backward nav tests.

    - [x] **4.1.5 Assess and handle remaining browse tests** ✅
        - Evaluate overlap for filter/deduplication tests against `TestDataQuality` in `test_browse_endpoints.py`
        - Delete tests that are now covered by parametrized tests
        - Migrate any truly unique tests
        - **Result:** Added `test_error_handling_invalid_filter_params` (2 params) to `test_browse_endpoints.py`.
        Remaining 10 browse tests confirmed redundant.

    - [x] **4.1.6 Delete test_movie_api.py and verify** ✅
        - Remove `backend/apps/movie/tests/test_movie_api.py`
        - Run full test suite: `docker compose -f ../infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/`
        - Verify test count stable (no accidental deletions of unique coverage)
        - **Result:** Deleted. Movie tests: 220 → 192 (-28). All 191 pass + 1 xfail. Project total: 454 → 441 (unique
        coverage preserved via new DRY tests).

- [x] **4.2 Split test_result_filtering.py** (Original plan - service layer tests)

    **Goal:** Split 1561-line file into 8 focused files in `tests/unit/services/filtering/`.

    - [x] **4.2.1 Create filtering subdirectory**
        - Created `backend/apps/movie/tests/unit/services/filtering/` with `__init__.py` and `conftest.py`

    - [x] **4.2.2 Split by filter domain**
        - Created 8 focused test files:
            - `test_year_filtering.py` (4 tests)
            - `test_rating_filtering.py` (3 tests)
            - `test_vote_count_filtering.py` (3 tests)
            - `test_completeness_filtering.py` (7 tests)
            - `test_historical_validation.py` (3 tests)
            - `test_genre_quality_filtering.py` (3 tests)
            - `test_buffer_mechanism.py` (5 tests)
            - `test_endpoint_filtering_context.py` (5 tests)
        - All 33 tests passing in new structure

    - [x] **4.2.3 Delete original file and verify**
        - Removed `backend/apps/movie/tests/test_result_filtering.py`
        - Movie tests: 192 (191 pass + 1 xfail) - count stable
        - All quality checks passing

- [x] **4.3 Migrate remaining movie app tests**

    - [x] **4.3.1 Categorize remaining test files**
        - Unit (Mock): `test_movie_service.py`, `test_keyword_service.py`, `test_people_service.py`,
          `test_movie_service_buffer_deduplication.py`, `test_schemas.py`, `test_batch_operations.py`
        - Integration (DB/Client): `test_endpoint_enrichment_integration.py`
        - Keep in root (utilities): `test_helpers.py`, `tmdb_test_builders.py`

    - [x] **4.3.2 Move unit tests to tests/unit/**
        - Moved to `unit/services/`: `test_movie_service.py`, `test_keyword_service.py`, `test_people_service.py`,
          `test_movie_service_buffer_deduplication.py`, `test_batch_operations.py`
        - Moved to `unit/`: `test_schemas.py`
        - 110 unit tests passing

    - [x] **4.3.3 Move integration tests to tests/integration/**
        - Moved: `test_endpoint_enrichment_integration.py`
        - Note: `test_batch_operations.py` uses Mock, moved to unit/ instead
        - 82 integration tests (81 pass + 1 xfail)

- [x] **4.4 Migrate authentication app tests**

    - [x] **4.4.1 Move tests to appropriate directories**
        - All 13 test files moved to `tests/integration/` (all use django_db + Client)
        - Renamed `test_oauth_mocks.py` → `oauth_mocks.py` (utility file, not tests)
        - Updated conftest.py import to reflect renamed module
        - Fixed flaky test: `test_blacklist_table_contains_revoked_token` now filters by user
        - 132 tests collected, all passing

    - [x] **4.4.2 Keep oversized files intact per Phase 3 decisions**
        - `test_token_refresh_scenarios.py` (519 lines) - cohesive, kept intact
        - `test_error_recovery.py` (500 lines) - cohesive, kept intact

    - [x] **4.4.3 Evaluate unit test needs**
        - Evaluated all auth modules (utils, throttles, schemas, adapters, auth_ninja, middleware)
        - Conclusion: Integration tests are the appropriate strategy for auth code
        - Auth is inherently cross-cutting (HTTP, cookies, sessions, DB, middleware)
        - 132 integration tests provide comprehensive coverage
        - Removed empty `tests/unit/` directory (no unit tests needed)

- [x] **4.5 Migrate user_movie_data app tests**

    - [x] **4.5.1 Categorize and move tests**
        - Discovered pre-categorization was incorrect: `test_response_builder.py` and
          `test_movie_enrichment_service.py` used real DB (integration), not mocks (unit)
        - Corrected categorization based on actual implementation:
            - **Unit:** `test_service_factory.py` (no DB), `test_movie_enrichment_service.py` (refactored)
            - **Integration:** `test_response_builder.py`, `test_user_movie_data_api.py`,
              `test_watchlist_endpoint.py`, `test_movie_enrichment_query_optimization.py`
        - Moved all files to appropriate directories using `git mv`

    - [x] **4.5.2 Keep oversized files intact per Phase 3 decisions**
        - `test_response_builder.py` (563 lines) - kept intact, moved to integration/

    - [x] **4.5.3 BONUS: Refactor test_movie_enrichment_service.py to true unit tests**
        - Original tests used real DB despite service having DI pattern for testability
        - Refactored to use `unittest.mock.Mock` pattern consistent with movie app
        - Created helper functions: `create_movie_schema()`, `create_mock_user_movie_data()`
        - Split into: `unit/test_movie_enrichment_service.py` (15 tests, 0.17s)
          and `integration/test_movie_enrichment_query_optimization.py` (2 tests, query count verification)
        - Total: 64 user_movie_data tests passing

- [x] **4.6 Migrate core app tests**

    - [x] **4.6.1 Move tests to appropriate directories**
        - Pre-categorization was incorrect: `test_models.py` and `test_pagination.py` listed as unit
          but both use `@pytest.mark.django_db` (same pattern as auth app)
        - Corrected categorization - ALL test files use database:
            - **Integration:** `test_models.py`, `test_pagination.py`, `test_logging_api.py`, `test_admin.py`
            - **Keep in root:** `test_helpers.py` (utility module), `test_commands.py` (management commands)
        - Removed empty `unit/` directory (no true unit tests exist)
        - 53 core tests passing

### **Phase 5:** Update pytest Configuration

**Purpose:** Verify configuration supports directory-based test organization.

- [x] **5.1 Verify backend/pyproject.toml pytest configuration**

    Configuration already correct - no changes needed:
    - `testpaths = ["apps"]` discovers unit/integration subdirectories
    - `--strict-markers` prevents unregistered marker warnings
    - Behavioral markers (`slow`, `enable_throttling`) already registered
    - Organizational markers (`unit`, `integration`) intentionally omitted - directory structure is primary

    **Selective execution verified:**
    - Unit tests: `pytest apps/movie/tests/unit/` → 110 tests
    - Integration tests: `pytest apps/movie/tests/integration/` → 82 tests
    - Cross-app: List directories explicitly (shell globs don't expand in Docker)
    - Full suite: 440 passed, 1 xfailed

- [x] **5.2 Marker strategy decision: Directory structure only (N/A)**

    **Decision:** Option A - No organizational markers on test files
    - Directory structure (`tests/unit/`, `tests/integration/`) is idiomatic and sufficient
    - Markers reserved for behavior (`slow`, `enable_throttling`), not organization
    - Adding `@pytest.mark.unit` to files in `tests/unit/` would be redundant DRY violation

### **Phase 6:** Update CI/CD Configuration

**Purpose:** Ensure GitHub Actions workflow still runs all tests correctly after migration.

- [x] **6.1 Review current CI/CD test execution**

    Reviewed `.github/workflows/ci.yml` and `type-generation.yml`:
    - Backend tests: `pytest apps/` - discovers subdirectories automatically
    - Coverage: `--cov=apps` with omit `*/tests/*` - covers new structure
    - No hardcoded test file paths found

- [x] **6.2 Verify CI/CD configuration compatibility (no changes needed)**

    **Test execution:** `pytest apps/` works with new directory structure - pytest auto-discovers
    `tests/unit/` and `tests/integration/` subdirectories.

    **Coverage omit patterns:** `"*/tests/*"` already matches:
    - `apps/movie/tests/unit/test_*.py`
    - `apps/movie/tests/integration/test_*.py`

    No CI/CD file changes required.

- [x] **6.3 CI/CD verification deferred to branch push**

    Local verification complete (440 tests pass). Full CI/CD verification will occur when
    `technical/service-layer-modernization` branch is pushed to origin. Current state: 17 commits
    ahead of origin (accumulated from multiple task lists on this branch).

### **Phase 7:** Post-Migration Audit and Refactoring

**Purpose:** Verify no files remain oversized after migration, identify additional refactoring opportunities
(DRY violations, code duplication, test helper consolidation), and clean up test code quality.

- [x] **7.1 Generate post-migration line count report**

    **Results:** 16 files between 400-677 lines. Largest file: 677 lines (test_browse_endpoints.py).

    **Threshold decision:** Files under 800 lines acceptable. No files exceed this threshold.
    Pre-migration files were 1,500+ lines; post-migration largest is 677 - significant improvement.

- [x] **7.2 Split remaining oversized files if beneficial**

    **Decision:** N/A - No files over 800-line threshold. Current sizes acceptable.

- [x] **7.3 Review test code for refactoring opportunities**

    **Audit approach:** Reviewed by app (vertical slices) - each app's conftest/helpers/patterns.

    - [x] **7.3.1 Audit movie app tests** (24 files, ~6,500 lines)
        - Excellent infrastructure: test_helpers.py, tmdb_test_builders.py, endpoint_configs.py
        - No issues found
    - [x] **7.3.2 Audit authentication app tests** (14 files, ~5,200 lines)
        - Comprehensive conftest.py with throttling/OAuth fixtures
        - Minor DRY issues fixed (see below)
    - [x] **7.3.3 Audit user_movie_data app tests** (8 files, ~3,100 lines)
        - Clean structure, minor DRY issues fixed (see below)
    - [x] **7.3.4 Audit core app tests** (6 files, ~1,200 lines)
        - Excellent test_helpers.py - canonical shared module
        - No issues found
    - [x] **7.3.5 Synthesize findings and decide fix-now vs defer**

    **Issues Found and Fixed:**
    - Removed redundant HTTP status aliases (3 files)
        - `test_user_api.py`: Removed aliases, use `HTTPStatus.OK` directly
        - `test_csrf_protection.py`: Removed raw integers, use `HTTPStatus` from test_helpers
        - `test_user_movie_data_api.py`: Removed aliases, use `HTTPStatus.OK` directly
    - Removed duplicate `create_payload()` function in `test_user_api.py`
        - Now uses `create_register_payload()` from fixtures.py

    **Meaningfulness concerns:** None observed - tests appear meaningful

    **Empty conftest files:** Kept as placeholders for future app-specific fixtures

- [x] **7.4 Update test count baseline**

    - [x] **7.4.1 Count total tests after migration**
        - **441 tests** across **48 test files**
        - movie: 23 files, authentication: 13 files, user_movie_data: 6 files, core: 6 files
        - All tests pass (440 passed, 1 xfailed)

    - [x] **7.4.2 Update testing methodology strategy doc**
        - Updated `strategy-testing-methodology.md` "Current State" section
        - Added test counts by app with directory structure
        - Updated marker-based execution docs (behavioral markers only)
        - Documented design decisions from Phase 5/7

### **Phase 8:** Run Full Quality Gates

**Purpose:** Verify all tests pass and quality standards maintained after complete migration and refactoring.

- [x] **8.1 Run backend test suite**

    - [x] **8.1.1 Run all backend tests**
        - 440 passed, 1 xfailed (93.03s sequential)
        - All tests pass, no regressions

    - [x] **8.1.2 Run backend tests in parallel**
        - 440 passed, 1 xfailed (16.29s parallel - 5.7x faster)
        - No race conditions or fixture issues

- [x] **8.2 Run linting and type checking**

    - [x] **8.2.1 Backend linting**
        - Ruff: All checks passed

    - [x] **8.2.2 Python type checking**
        - Pyright: 0 errors, 0 warnings (46 informational only)

- [x] **8.3 Frontend quality gates (verify no regression)**

    - [x] **8.3.1 Run frontend tests**
        - 460 tests passed (9.26s)
        - No regressions (frontend unchanged)

    - [x] **8.3.2 Frontend linting and type checking**
        - ESLint: Clean

- [x] **8.4 Markdown linting**

    - [x] **8.4.1 Lint all markdown files**
        - Fixed table formatting in 2 files modified during this task list
        - 2 pre-existing errors in unrelated file (strategy-color-tokens.md) - not introduced here

---

## Notes

### Test Counts (Updated 2025-11-26)

**Current state:**

- Total project tests: 454
- Movie app tests: 205
- Test files requiring action: `test_movie_api.py` (1,503 lines), `test_result_filtering.py` (1,561 lines)

**Growth since Phase 3:** 374 → 454 tests (+80). Original "103 tests" was stale from pytest migration (2025-10-13).

### Research References

- **External research agent report** (2025-10-30): Comprehensive analysis of pytest and Vitest best practices
- **Django REST Framework test structure**: <https://github.com/encode/django-rest-framework/tree/master/tests>
- **pytest official docs**: <https://docs.pytest.org/en/stable/how-to/fixtures.html>
- **Testing Pyramid**: Unit (80%) → Integration (15%) → E2E (5%)

### Migration Strategy Decisions

1. **All apps migrated together**: Establishes consistent patterns project-wide
2. **Directory-based separation**: Industry standard, tool-agnostic
3. **File splitting thresholds**: 400 lines soft target, 800 lines hard limit (DRY parametrized files can exceed 400)
4. **Fixture organization**: Keep at app-level conftest.py (pytest_plugins deferred)
5. **Frontend unchanged**: Current `__tests__/` pattern already idiomatic
6. **Markers as supplement**: Directory structure is primary organization
7. **Consolidate over split**: When DRY infrastructure exists, consolidate into it rather than creating parallel structure

### Post-Migration Success Criteria

- ✅ All 454 tests pass (no regression)
- ✅ No test file exceeds 800 lines (400 preferred, DRY exceptions documented)
- ✅ Clear unit/integration separation in all apps (no mixing)
- ✅ CI/CD pipeline runs successfully
- ✅ Documentation updated with new standards
- ✅ Can run unit tests separately from integration tests
- ✅ All quality gates pass (linting, type checking, coverage)
- ✅ DRY patterns adopted where applicable (`EndpointConfig`, test builders)
