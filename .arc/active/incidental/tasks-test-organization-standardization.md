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

### **Phase 4:** Execute File Splits and Migration (Revised)

**Purpose:** Consolidate redundant tests, migrate unique tests to new structure, split service layer tests.

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

- [ ] **4.6 Migrate core app tests**

    - [ ] **4.6.1 Move tests to appropriate directories**
        - Unit: `test_models.py`, `test_pagination.py`
        - Integration: `test_logging_api.py`, `test_admin.py`
        - Keep in root: `test_helpers.py` (test utilities)
        - Keep in place: management command tests

### **Phase 5:** Update pytest Configuration

**Purpose:** Add markers and update configuration for directory-based test organization.

- [ ] **5.1 Update backend/pyproject.toml pytest configuration**

    - [ ] **5.1.1 Add test type markers**
        - Add to `[tool.pytest.ini_options]` markers section:

        ```toml
        markers = [
            "unit: Unit tests - isolated with mocked dependencies",
            "integration: Integration tests - tests with real dependencies",
            "e2e: End-to-end tests - full application workflow",
            "api: API endpoint tests",
            "slow: Tests that take > 1 second to run",
            "enable_throttling: Enable throttling for specific tests (default: bypassed for speed)",
        ]
        ```

    - [ ] **5.1.2 Verify testpaths configuration**
        - Current: `testpaths = ["apps"]`
        - This is correct (pytest will discover unit/integration subdirectories)
        - No changes needed

    - [ ] **5.1.3 Test selective execution**
        - Run unit tests only: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/unit/`
        - Run integration tests only: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/`
        - Verify both work correctly

- [ ] **5.2 Optional: Add pytest markers to test files**

    - [ ] **5.2.1 Decide on marker strategy**
        - Option A: No markers (directory structure is sufficient)
        - Option B: Add `@pytest.mark.unit` / `@pytest.mark.integration` to all tests
        - Recommendation: Option A (directory structure is primary organization)
        - Document decision

    - [ ] **5.2.2 If Option B chosen, add markers**
        - Add `@pytest.mark.integration` to integration test classes/functions
        - Add `@pytest.mark.unit` to unit test classes/functions
        - Add `@pytest.mark.api` to API endpoint tests
        - Test marker-based execution: `docker compose -f infrastructure/docker-compose.yml exec backend pytest -m integration`

### **Phase 6:** Update CI/CD Configuration

**Purpose:** Ensure GitHub Actions workflow still runs all tests correctly after migration.

- [ ] **6.1 Review current CI/CD test execution**

    - [ ] **6.1.1 Read .github/workflows/*.yml files**
        - Identify all places where pytest is executed
        - Document current test commands
        - Check if tests run in parallel or have separate jobs

    - [ ] **6.1.2 Assess impact of directory changes**
        - Determine if current commands still work (they should - we didn't change testpaths)
        - Identify any hardcoded file paths that need updating
        - Document required changes

- [ ] **6.2 Update CI/CD configuration if needed**

    - [ ] **6.2.1 Update test execution commands**
        - If CI runs specific test files, update paths to new locations
        - If CI runs `pytest apps/`, no changes needed
        - Consider adding separate jobs for unit vs integration (optional optimization)

    - [ ] **6.2.2 Update coverage configuration if needed**
        - Coverage config in pyproject.toml should still work
        - Verify omit patterns still exclude test files in new directories
        - Add `"*/tests/unit/*"`, `"*/tests/integration/*"` to omit if needed (likely already covered by `"*/tests/*"`)

- [ ] **6.3 Verify CI/CD runs successfully**

    - [ ] **6.3.1 Push migration commit to branch**
        - Commit all test file moves and configuration changes
        - Push to origin

    - [ ] **6.3.2 Monitor CI/CD pipeline**
        - Watch GitHub Actions run
        - Verify all tests execute and pass
        - Check coverage reports generate correctly

    - [ ] **6.3.3 Fix any CI/CD failures**
        - If tests fail, investigate and fix
        - Common issues: import paths, fixture discovery, coverage config
        - Re-run until all checks pass

### **Phase 7:** Post-Migration Audit and Refactoring

**Purpose:** Verify no files remain oversized after migration, identify additional refactoring opportunities
(DRY violations, code duplication, test helper consolidation), and clean up test code quality.

- [ ] **7.1 Generate post-migration line count report**

    - [ ] **7.1.1 Run line count analysis**
        - Command: `find backend/apps -path "*/tests/*" -name "test_*.py" -exec wc -l {} + | sort -rn | head -20`
        - Save output to compare against pre-migration state
        - Identify any files still >400 lines

    - [ ] **7.1.2 Review files over 400 lines**
        - For each file >400 lines, read and assess
        - Determine if further splitting is beneficial
        - Consider: logical groupings, test cohesion, maintainability
        - Document findings and recommendations

- [ ] **7.2 Split remaining oversized files if beneficial**

    - [ ] **7.2.1 For each file identified in 7.1.2:**
        - Analyze test structure and identify split points
        - Propose split strategy
        - Get approval before executing
        - Execute split and verify tests pass

    - [ ] **7.2.2 Document intentionally large files**
        - Some files may legitimately need 400-600 lines (comprehensive integration tests)
        - Document why these files are kept together
        - Add comment in file explaining size justification

- [ ] **7.3 Review test code for refactoring opportunities**

    - [ ] **7.3.1 Identify DRY violations across test files**
        - Look for duplicate test setup code (repeated fixture patterns, setup logic)
        - Identify repeated assertion patterns that could become helper functions
        - Find duplicate mock/factory code that should be centralized
        - Check for copy-pasted test data that could use shared fixtures
        - **Document findings:** Update `notes-test-organization-standardization.md` under
          "Post-Migration Refactoring Opportunities" section with file locations and recommendations

    - [ ] **7.3.2 Identify missing test helper opportunities**
        - Review common patterns across multiple test files
        - Look for complex assertions that repeat (could become `assert_movie_response()` helper)
        - Find repeated API call patterns (could become `create_movie_via_api()` helper)
        - Check for repeated mock setup (could become reusable fixtures)
        - **Document opportunities:** Update `notes-test-organization-standardization.md` under
          "Post-Migration Refactoring Opportunities" section

    - [ ] **7.3.3 Check fixture organization and reuse**
        - Review all conftest.py files for duplicate fixtures
        - Identify fixtures that could be promoted to higher-level conftest
        - Look for over-specific fixtures that could be generalized
        - Check for unused fixtures (dead code)
        - **Document opportunities:** Update `notes-test-organization-standardization.md` under
          "Post-Migration Refactoring Opportunities" section

    - [ ] **7.3.4 Assess test readability and naming**
        - Review test function names for clarity
        - Check docstrings - are they helpful or redundant?
        - Look for overly complex test setups that could be simplified
        - Identify tests that do too much (should be split into multiple tests)
        - **Document improvements:** Update `notes-test-organization-standardization.md` under
          "Post-Migration Refactoring Opportunities" section

    - [ ] **7.3.5 Propose refactoring tasks**
        - Based on findings from 7.3.1-7.3.4, create prioritized list
        - Categorize: Critical (blocks maintainability) vs Nice-to-have (polish)
        - Estimate effort for each refactoring opportunity
        - Decide: Fix now or defer to follow-up task list
        - **Document decision:** Update `notes-test-organization-standardization.md` under
          "Post-Migration Refactoring Opportunities" section with prioritized list and rationale

    - [ ] **7.3.6 Execute approved refactorings (if any)**
        - For critical issues identified in 7.3.5, execute refactoring
        - Move duplicate code to shared helpers/fixtures
        - Consolidate repeated patterns
        - Run tests after each change to verify no regressions
        - **Document changes:** Update `notes-test-organization-standardization.md` under
          "Post-Migration Refactoring Opportunities" section with summary of changes made

    - [ ] **7.3.7 Compile meaningfulness concerns observed during migration**
        - Review notes captured during Phase 4 for tests that appear:
            - Unable to fail (assertions always pass regardless of logic)
            - Over-mocked (mock bypasses what should be tested)
            - Testing implementation rather than behavior
        - **Document findings:** Update `notes-test-organization-standardization.md` under
          "Meaningfulness Concerns for Follow-up" section
        - If significant concerns found: Create atomic task or incidental task list for dedicated audit
        - Note: Comprehensive meaningfulness audit (mutation testing, break-verify cycles) deferred to
          future dedicated task list

- [ ] **7.4 Update test count baseline**

    - [ ] **7.4.1 Count total tests after migration**
        - Run: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/ --collect-only -q`
        - Compare to pre-migration count (should be identical)
        - Document final test file structure

    - [ ] **7.4.2 Update testing methodology strategy doc**
        - Add section: "Current Test Organization" showing actual structure
        - Include directory tree, file counts, typical file sizes
        - Document any test helper improvements from Phase 7.3
        - Location: End of "Backend Testing" section

### **Phase 8:** Run Full Quality Gates

**Purpose:** Verify all tests pass and quality standards maintained after complete migration and refactoring.

- [ ] **8.1 Run backend test suite**

    - [ ] **8.1.1 Run all backend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Verify 100% pass rate (same count as before migration)
        - Run with coverage:
          `docker compose -f infrastructure/docker-compose.yml exec backend pytest --cov=apps --cov-report=term-missing apps/`

    - [ ] **8.1.2 Run backend tests in parallel**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest -n auto apps/`
        - Verify parallel execution works with new directory structure
        - Check for any race conditions or fixture issues

- [ ] **8.2 Run linting and type checking**

    - [ ] **8.2.1 Backend linting**
        - Command: `.venv-backend/bin/ruff check backend/apps/ backend/config/`
        - Fix any violations: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - Verify 0 violations

    - [ ] **8.2.2 Python type checking**
        - Command: `npx pyright backend/apps/ backend/config/ --project backend`
        - Verify 0 type errors
        - Fix any import issues from test file moves

- [ ] **8.3 Frontend quality gates (verify no regression)**

    - [ ] **8.3.1 Run frontend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Should be unchanged (no frontend restructuring)
        - Verify 100% pass rate

    - [ ] **8.3.2 Frontend linting and type checking**
        - Linting: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Type checking: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Verify 0 violations/errors

- [ ] **8.4 Markdown linting**

    - [ ] **8.4.1 Lint all markdown files**
        - Command: `npx markdownlint-cli2 "README.md" ".arc/**/*.md"`
        - Fix violations: `npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`
        - Verify 0 violations

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
