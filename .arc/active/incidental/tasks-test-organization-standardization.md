# Incidental: Test Organization Standardization

**Created:** 2025-10-30
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress

## Context

**Discovered:** During Phase 3 planning for buffer deduplication work, identified test organization
inconsistencies and file size issues that would compound when adding 15+ new tests.

**Interrupts:** `.arc/active/incidental/tasks-buffer-deduplication-data-quality.md` at Task 3.1 (before writing new tests)

**Problem:** Test organization is inconsistent and some files have grown beyond maintainable size:

1. **Backend inconsistency:** Tests live in flat `apps/{app}/tests/` directories without unit/integration separation
2. **Massive test files:**
   - `test_movie_api.py`: 1,512 lines (3-7x over recommended 200-400 line threshold)
   - `test_result_filtering.py`: 1,412 lines (3-5x over threshold)
   - Several files at 500-670 lines (borderline)
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

- [ ] **3.1 Analyze test_movie_api.py (1512 lines)**

    - [ ] **3.1.1 Read file and catalog test structure**
        - List all test functions with their purposes
        - Identify natural groupings (by endpoint, by feature, by test type)
        - Note shared fixtures and dependencies
        - **Document findings:** Update `notes-test-organization-standardization.md` under
          "test_movie_api.py Analysis" section

    - [ ] **3.1.2 Propose split strategy**
        - Based on research: Split by endpoint + aspect recommended for API tests
        - Likely groups: discover (filtering, pagination, sorting), search, list/detail
        - Create proposed file structure with line count estimates
        - **Document proposed structure:** Update `notes-test-organization-standardization.md` under
          "test_movie_api.py Analysis" section for approval

- [ ] **3.2 Analyze test_result_filtering.py (1412 lines)**

    - [ ] **3.2.1 Read file and catalog test structure**
        - List test categories (genre filters, rating filters, date filters, etc.)
        - Identify test types (validation, application, edge cases, errors)
        - Note fixture dependencies
        - **Document findings:** Update `notes-test-organization-standardization.md` under
          "test_result_filtering.py Analysis" section

    - [ ] **3.2.2 Propose split strategy**
        - Based on research: Split by filter domain recommended for business logic tests
        - Likely groups: genre, rating, date, language, keyword, combined filters
        - Create proposed file structure with line count estimates
        - **Document proposed structure:** Update `notes-test-organization-standardization.md` under
          "test_result_filtering.py Analysis" section for approval

- [ ] **3.3 Identify other oversized files (500+ lines)**

    - [ ] **3.3.1 Generate line count report**
        - Command: `find backend/apps -name "test_*.py" -exec wc -l {} + | sort -rn`
        - Identify files >500 lines that would benefit from splitting
        - **Document candidates:** Update `notes-test-organization-standardization.md` under
          "Other Oversized Files" section

    - [ ] **3.3.2 Assess split necessity**
        - For each 500+ line file, determine if split is beneficial
        - Consider: logical boundaries, feature groupings, team ownership
        - **Document decisions:** Update `notes-test-organization-standardization.md` under
          "Other Oversized Files" section with split/keep rationale

### **Phase 4:** Execute File Splits and Migration

**Purpose:** Move tests to new directories and split oversized files.

- [ ] **4.1 Split and migrate test_movie_api.py**

    - [ ] **4.1.1 Implement approved split strategy**
        - Create new test files in `tests/integration/api/` or `tests/integration/api/movies/`
        - Move tests to new files (copy-paste initially, delete later)
        - Ensure imports work correctly
        - Run tests after each file creation: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/`

    - [ ] **4.1.2 Update fixtures for new files**
        - Move shared fixtures to `tests/integration/conftest.py` if needed
        - Ensure all new files can access required fixtures
        - Verify no duplicate fixture definitions

    - [ ] **4.1.3 Delete original file and verify**
        - Remove `backend/apps/movie/tests/test_movie_api.py`
        - Run full movie test suite: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/`
        - Verify all tests still pass, same count as before split

- [ ] **4.2 Split and migrate test_result_filtering.py**

    - [ ] **4.2.1 Implement approved split strategy**
        - Create new test files in `tests/unit/services/movie_filters/` or similar
        - Move tests to new files incrementally
        - Run tests after each file creation

    - [ ] **4.2.2 Update fixtures for new files**
        - Move shared fixtures to appropriate conftest.py
        - Ensure all new files have fixture access

    - [ ] **4.2.3 Delete original file and verify**
        - Remove `backend/apps/movie/tests/test_result_filtering.py`
        - Run full movie test suite
        - Verify all tests pass

- [ ] **4.3 Migrate remaining movie app tests**

    - [ ] **4.3.1 Categorize remaining test files**
        - Review each test file in `backend/apps/movie/tests/`
        - Determine if unit or integration test
        - Document categorization decisions

    - [ ] **4.3.2 Move unit tests to tests/unit/**
        - Move files testing isolated services/models/utils
        - Examples: `test_movie_service.py` (unit parts), `test_keyword_service.py`, `test_people_service.py`
        - Run tests after each move

    - [ ] **4.3.3 Move integration tests to tests/integration/**
        - Move files testing API endpoints or database interactions
        - Examples: `test_endpoint_enrichment_integration.py`, `test_batch_operations.py`
        - Run tests after each move

    - [ ] **4.3.4 Handle mixed-type test files**
        - For files containing both unit and integration tests, split into two files
        - Name clearly: `test_movie_service.py` (unit), `test_movie_service_integration.py`
        - Run tests to verify split

- [ ] **4.4 Migrate authentication app tests**

    - [ ] **4.4.1 Categorize and move authentication tests**
        - Review: `test_user_api.py`, `test_token_refresh_scenarios.py`, `test_error_recovery.py`, `test_logging.py`
        - Move to `tests/integration/` (all are API tests)
        - Run tests after move: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/authentication/tests/`

    - [ ] **4.4.2 Split oversized auth files if needed**
        - Check if any auth files exceed 500 lines
        - Split if beneficial (e.g., separate token refresh tests)
        - Run tests after split

- [ ] **4.5 Migrate user_movie_data app tests**

    - [ ] **4.5.1 Categorize and move user_movie_data tests**
        - Review: `test_user_movie_data_api.py`, `test_watchlist_endpoint.py`, `test_movie_enrichment_service.py`, `test_response_builder.py`
        - Separate unit (service/builder) from integration (API) tests
        - Move to appropriate directories

    - [ ] **4.5.2 Split oversized files if needed**
        - Check line counts (several files at 500-670 lines)
        - Split if logical boundaries exist
        - Run tests after changes

- [ ] **4.6 Migrate core app tests**

    - [ ] **4.6.1 Categorize and move core tests**
        - Review: `test_models.py`, `test_helpers.py`, `test_logging_api.py`
        - Helpers are test utilities (can stay in tests/ root)
        - Move models to unit/, API tests to integration/

    - [ ] **4.6.2 Handle management command tests**
        - `test_tmdb_logging.py`, `test_logging.py` in management/commands/
        - These can stay where they are (testing commands in place)

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

### Pre-Migration Test Counts

**Backend:**

- Total test files: ~20
- Movie app: 10 test files
- Authentication app: 5+ test files
- Total test count: 103 tests (from pytest migration notes)

**Largest Files:**

- `test_movie_api.py`: 1,512 lines
- `test_result_filtering.py`: 1,412 lines
- `test_movie_enrichment_service.py`: 672 lines
- `test_user_movie_data_api.py`: 666 lines
- `test_watchlist_endpoint.py`: 660 lines

### Research References

- **External research agent report** (2025-10-30): Comprehensive analysis of pytest and Vitest best practices
- **Django REST Framework test structure**: <https://github.com/encode/django-rest-framework/tree/master/tests>
- **pytest official docs**: <https://docs.pytest.org/en/stable/how-to/fixtures.html>
- **Testing Pyramid**: Unit (80%) → Integration (15%) → E2E (5%)

### Migration Strategy Decisions

1. **All apps migrated together**: Establishes consistent patterns project-wide
2. **Directory-based separation**: Industry standard, tool-agnostic
3. **File splitting thresholds**: 200-400 lines per file target
4. **Fixture organization**: Keep at app-level conftest.py (pytest_plugins deferred)
5. **Frontend unchanged**: Current `__tests__/` pattern already idiomatic
6. **Markers as supplement**: Directory structure is primary organization

### Post-Migration Success Criteria

- ✅ All tests pass with same count as before (103 tests)
- ✅ No test file exceeds 400 lines (unless intentionally documented)
- ✅ Clear unit/integration separation in all apps
- ✅ CI/CD pipeline runs successfully
- ✅ Documentation updated with new standards
- ✅ Can run unit tests separately from integration tests
- ✅ All quality gates pass (linting, type checking, coverage)
