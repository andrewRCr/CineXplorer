# Notes: Test Organization Standardization

**Created:** 2025-10-30
**Related Task List:** `.arc/active/incidental/tasks-test-organization-standardization.md`
**Purpose:** Document research findings, decision rationale, and file analysis for test organization migration

---

## Research Summary

### External Research Completed (2025-10-30)

**Scope:** Best practices for organizing and splitting large test files in pytest (Python/Django) and Vitest/Jest
(TypeScript/React) ecosystems.

**Sources:**

- Django REST Framework test structure (62+ test files)
- pytest official documentation
- FastAPI projects
- React Testing Library ecosystem
- Industry articles on test organization

**Key Research Questions:**

1. How do mature Python/Django projects organize unit vs integration tests?
2. What are idiomatic file splitting patterns for large test files?
3. When and how should test files be split?
4. What naming conventions are standard?
5. How should pytest be configured for directory-based organization?

---

## Key Findings

### pytest (Backend) Best Practices

**Directory-based separation is the industry standard:**

```
tests/
├── conftest.py          # Shared fixtures
├── unit/
│   └── services/
│       └── test_movie_service.py
└── integration/
    └── api/
        └── test_movie_api.py
```

**NOT file-suffix based** (e.g., `test_foo.py` vs `test_foo_integration.py` is not idiomatic)

**File splitting thresholds:**

- < 200 lines: Keep together
- 200-400 lines: Consider splitting if multiple features/endpoints
- 400-800 lines: Should split into 2-3 files
- 800+ lines: **Must split** - aim for 200-400 per file

**Splitting strategies by test type:**

1. **API integration tests:** Split by endpoint + aspect
   - Example: `test_discover_filtering.py`, `test_discover_pagination.py`, `test_search_queries.py`
   - Django REST Framework pattern: Splits serializers by type, relations by field type

2. **Business logic tests:** Split by domain/feature
   - Example: `test_genre_filters.py`, `test_rating_filters.py`, `test_date_filters.py`
   - Each logical domain gets its own file

3. **Service tests:** Split by service method or concern
   - Example: `test_movie_service_discovery.py`, `test_movie_service_enrichment.py`

**Naming conventions:**

- Pattern: `test_{resource}_{feature}_{aspect}.py`
- Examples: `test_movie_discover_filtering.py`, `test_user_authentication_tokens.py`
- Shorter names when context clear from directory structure

**pytest configuration:**

- Use markers as **supplement** for selective execution
- Directory structure is **primary** organization
- Standard markers: `unit`, `integration`, `e2e`, `slow`, `api`

### Vitest/React Best Practices

**Co-location is dominant pattern:**

- Tests live beside components: `Button.tsx` → `Button.test.tsx`
- Use `__tests__/` directories (our current pattern - already idiomatic)
- Suffixes for test types: `.test.tsx` (unit), `.integration.test.tsx` (integration)

**E2E tests separate:**

- Live in `/e2e` directory with Playwright config
- Use `.spec.ts` extension (Playwright convention)

### Fixture Organization

**Keep at app-level conftest.py:**

- Only split into `fixtures/` directory if >200 fixtures (we have 14)
- `pytest_plugins` pattern is premature optimization at our scale
- Revisit at 50+ fixtures project-wide

**Directory-level conftest.py:**

- `tests/conftest.py` - Shared fixtures (primary location)
- `tests/unit/conftest.py` - Unit-specific fixtures (if needed)
- `tests/integration/conftest.py` - Integration-specific fixtures (if needed)

---

## Decision Rationale

### Why Directory-Based Separation?

**Chosen approach:** `tests/unit/`, `tests/integration/`, `tests/e2e/`

**Over file suffixes** (`test_foo.py`, `test_foo_integration.py`):

- ✅ Industry standard (pytest docs, Django REST Framework, FastAPI)
- ✅ Tool-agnostic (works regardless of test runner)
- ✅ Easier selective execution (`pytest tests/unit/` vs `pytest -m unit`)
- ✅ Better for parallel test execution
- ✅ Clear separation visible in file tree
- ✅ Scales better (subdirectories for large apps)

**Real-world validation:**

- Django REST Framework: 62+ test files in organized directories
- FastAPI projects: Mirror source structure with `tests/unit/`, `tests/integration/`
- pytest documentation explicitly recommends directory-based organization

### Why Split by Endpoint+Aspect for API Tests?

**For our 1512-line `test_movie_api.py`:**

**Chosen approach:** Split by endpoint + aspect (filtering, pagination, sorting)

**Rationale:**

- Aligns with how developers think ("I'm working on discover filtering")
- Each file focuses on one endpoint's behavior facet
- Easier to find related tests
- More maintainable as endpoints grow
- Matches Django REST Framework pattern

**Alternative considered:** Split by endpoint only (all discover tests in one file)

- Would still result in 500+ line files
- Less granular, harder to navigate

### Why Split by Filter Domain for Business Logic?

**For our 1412-line `test_result_filtering.py`:**

**Chosen approach:** Split by filter type (genre, rating, date, language, keyword, combined)

**Rationale:**

- Natural domain boundaries (each filter type is independent)
- Easy to locate tests for specific filter
- Supports parallel development (different engineers own different filters)
- Matches how features are added (one filter type at a time)

**Alternative considered:** Split by test concern (validation, application, edge cases)

- Would mix unrelated filter types in same file
- Harder to find all tests for a specific filter

### Why Keep Frontend Tests As-Is?

**Current frontend structure:**

- Co-located tests in `__tests__/` directories
- Suffix-based test types (`.integration.test.tsx`)

**Decision:** No changes needed

- Already follows React/Vitest best practices
- Co-location is idiomatic for component tests
- `__tests__/` directories are supported pattern
- Not worth migration churn

---

## Real-World Examples

### Django REST Framework Test Structure

**URL:** <https://github.com/encode/django-rest-framework/tree/master/tests>

**Organization:**

- Flat `tests/` directory with 62+ test files
- Splits by component type: `test_serializer.py`, `test_serializer_nested.py`, `test_serializer_lists.py`
- Splits by relationship type: `test_relations_pk.py`, `test_relations_slug.py`, `test_relations_hyperlink.py`
- Subdirectories for complex features: `authentication/`, `schemas/`, `browsable_api/`

**Key insight:** DRF splits large concerns (serializers, relations) into multiple focused files

### pytest Official Documentation

**URL:** <https://docs.pytest.org/en/stable/explanation/goodpractices.html>

**Recommendations:**

- Separate `tests/` directory from source code
- Use `src/` layout for packages
- Prefix all test files with `test_`
- Use directory structure to mirror application structure

---

## File Analysis

### Pre-Migration State

**Total backend test files:** ~20 across 4 apps

**Largest files:**

1. `test_movie_api.py` - 1,512 lines (3-7x over threshold)
2. `test_result_filtering.py` - 1,412 lines (3-5x over threshold)
3. `test_movie_enrichment_service.py` - 672 lines (borderline)
4. `test_user_movie_data_api.py` - 666 lines (borderline)
5. `test_watchlist_endpoint.py` - 660 lines (borderline)

**Total test count:** 103 tests (from pytest migration notes)

---

## test_movie_api.py Analysis (1512 lines)

**Status:** ✅ Analysis complete (Phase 3, Task 3.1)

**Analyzed:** 2025-10-30

### Overview

Integration tests for movie API endpoints. All tests mock TMDB API client to ensure fast, reliable,
independent tests. Uses pytest with parametrization to reduce duplication.

### Test Catalog (23 test functions)

#### 1. Paginated Endpoints - Basic Contract (1 test, ~80 lines)

**Location:** Lines 76-153

**Tests:**

- `test_paginated_endpoint_contract` - Parametrized test covering 4 endpoints:
    - now-playing (get_now_playing_movies)
    - upcoming (get)
    - search (search_movies)
    - discover (get)
    - Verifies pagination metadata (page, total_pages) and movie structure (tmdb_id, title, poster_path, etc.)

#### 2. Discover Endpoint - Filtering & Validation (2 tests, ~90 lines)

**Location:** Lines 160-251

**Tests:**

- `test_discover_with_filters` - Tests filter parameter mapping (sort_by, genres, year, vote_average,
  release_date, runtime, certification)
- `test_discover_invalid_parameters` - Parametrized validation tests for invalid year, vote_average, runtime

#### 3. Genres/Keywords/People Endpoints (5 tests, ~140 lines)

**Location:** Lines 258-395

**Tests:**

- `test_get_movie_genres` - Genre list endpoint
- `test_get_popular_keywords` - Keywords with pagination
- `test_search_keywords` - Keyword search by query
- `test_get_popular_people` - People with pagination
- `test_search_people` - People search by query

#### 4. Movie Detail Endpoint (2 tests, ~100 lines)

**Location:** Lines 402-501

**Tests:**

- `test_get_movie_detail_authenticated` - Movie detail with user_movie_data (rating, review)
- `test_get_movie_detail_unauthenticated` - Movie detail without user data (user_movie_data is null)

#### 5. Discover - Filter Integration (3 tests, ~250 lines)

**Location:** Lines 510-620

**Tests:**

- `test_discover_api_extracts_backend_filter_params` - Validates year_min/max, rating_min/max extraction
  for backend filtering
- `test_discover_api_filters_bad_ratings_from_tmdb` - Backend filtering removes placeholder (0.0) and
  out-of-range ratings
- `test_discover_api_buffer_mechanism_with_filtering` - Buffer fetches page 2 when filtered results < 20,
  filters apply to buffer

#### 6. Discover - Pagination Metadata (4 tests, ~240 lines)

**Location:** Lines 769-1005

**Tests:**

- `test_discover_returns_next_tmdb_page_start_after_buffer` - Returns next_tmdb_page_start metadata after
  consuming multiple TMDB pages
- `test_discover_continues_from_tmdb_page_start_parameter` - tmdb_page_start parameter correctly continues
  pagination from specified page
- `test_discover_no_duplicates_across_sequential_pages` - Sequential pagination (page 1 → page 2) produces
  no duplicate movies
- `test_discover_fallback_when_tmdb_page_start_omitted` - Backward compatibility: fallback to simple 1:1
  page mapping without metadata

#### 7. Discover - Buffer Deduplication (6 tests, ~500 lines)

**Location:** Lines 1012-1513

**Tests:**

- `test_discover_deduplicates_when_tmdb_returns_duplicate_across_pages` - Basic deduplication: Spirited Away
  on TMDB pages 1 and 2 appears once
- `test_discover_deduplicates_multiple_duplicates_across_pages` - Heavy duplication: multiple movies repeated
  across pages, buffer fetches until 20 unique
- `test_discover_deduplication_works_with_backend_filters` - Deduplication + backend filters work together
  (rating filtering + dedup)
- `test_discover_respects_max_buffer_pages_with_heavy_duplication` - Safety limit: stops at max_buffer_pages=5
  even if < 20 unique movies
- `test_discover_no_cross_page_duplicates` - Cross-page deduplication: movie on TMDB page 2 AND 4 appears on
  our page 1 only, not page 2
- `test_discover_backward_navigation_consistency` - Backward navigation (page 1 → 2 → back to 1) returns
  identical page 1 results

### Shared Fixtures & Dependencies

**Fixtures used:**

- `api_client` - Django test client (from conftest)
- `user` - User fixture for authenticated tests (from conftest)

**Mocks:**

- `core.services.tmdb_api_client.TMDBApiClient.get`
- `core.services.tmdb_api_client.TMDBApiClient.get_movie_details`
- `core.services.tmdb_api_client.TMDBApiClient.get_now_playing_movies`
- `core.services.tmdb_api_client.TMDBApiClient.search_movies`

**Test helpers:**

- `create_movie_stub()` - Local helper in this file to create Movie objects
- `create_movie_dict()` - From test_fixtures_tmdb, creates TMDB movie dict
- `create_paginated_tmdb_response()` - From test_fixtures_tmdb, creates TMDB pagination response

**Common imports:**

- `ApiResponse` from core.services.api_response
- `TMDBResponseData` from core.types.api_types
- `HTTPStatus` constants from core.tests.test_helpers

### Natural Groupings

**By endpoint:**

- Discover endpoint: 15 tests (filtering, filter integration, pagination, deduplication) - **~1080 lines**
- Paginated endpoints (now-playing, upcoming, search): 1 test - **~80 lines**
- Genres/Keywords/People endpoints: 5 tests - **~140 lines**
- Movie detail endpoint: 2 tests - **~100 lines**

**By aspect (within Discover):**

- Basic filtering & validation: 2 tests - **~90 lines**
- Filter integration (backend filters): 3 tests - **~250 lines**
- Pagination metadata: 4 tests - **~240 lines**
- Buffer deduplication: 6 tests - **~500 lines**

**Key insight:** Discover endpoint dominates this file (15/23 tests, ~1080 lines). Splitting by endpoint+aspect
will create focused, maintainable files.

### Proposed Split Strategy

**Approach:** Endpoint + aspect split (recommended by research)

**Rationale:**

- Discover endpoint is 71% of file (~1080 lines) - too large for single file
- Discover has 4 clear aspects (filtering, filter integration, pagination, deduplication)
- Other endpoints are small enough to keep together
- Each split file will be 80-500 lines (within recommended 200-400 range)

**Proposed files:**

1. **`test_paginated_endpoints_contract.py`** (~80 lines, integration/)
   - Basic contract test for all paginated endpoints (now-playing, upcoming, search, discover)
   - Single parametrized test covering common pagination structure

2. **`test_discover_filtering.py`** (~90 lines, integration/)
   - Discover filter parameters and validation
   - Tests: filter parameter mapping, invalid parameter validation

3. **`test_discover_filter_integration.py`** (~250 lines, integration/)
   - Backend filter integration (two-pass filtering architecture)
   - Tests: backend filter extraction, rating filtering, buffer + filtering interaction

4. **`test_discover_pagination.py`** (~240 lines, integration/)
   - Pagination metadata tracking (smart buffer)
   - Tests: next_tmdb_page_start metadata, pagination continuation, sequential pages, fallback behavior

5. **`test_discover_deduplication.py`** (~500 lines, integration/)
   - Buffer deduplication (TDD tests for Phase 3-6 work)
   - Tests: basic dedup, heavy duplication, dedup + filters, safety limits, cross-page dedup, navigation consistency

6. **`test_genres_keywords_people.py`** (~140 lines, integration/)
   - Genres, keywords, and people endpoints
   - Tests: genre list, keyword pagination/search, people pagination/search

7. **`test_movie_detail.py`** (~100 lines, integration/)
   - Movie detail endpoint with authentication variations
   - Tests: authenticated (with user_movie_data), unauthenticated (user_movie_data null)

**Total:** 7 files, all under 500 lines, most 80-250 lines

**Directory placement:** All files go to `backend/apps/movie/tests/integration/`

- All are integration tests (API endpoints with mocked TMDB)
- No unit test candidates identified (no isolated service/model tests)

### Migration Notes

**Shared setup to preserve:**

- Import block (lines 1-27) - copy to all files, trim unused imports per file
- URL constants (lines 32-40) - copy to files that use those URLs
- Helper function `create_movie_stub()` (lines 48-68) - copy to files using it (movie detail tests)

**Fixtures to migrate:**

- `api_client` and `user` are already in app-level conftest.py - no changes needed
- Test helpers `create_movie_dict()` and `create_paginated_tmdb_response()` are in test_fixtures_tmdb - already shared

**No fixture extraction needed:**

- All tests use existing shared fixtures
- No new conftest.py fixtures required

**Post-split verification:**

- Run `pytest apps/movie/tests/integration/` to verify all 23 tests still pass
- Verify no import errors
- Verify test count matches (23 tests across 7 files)

---

## test_result_filtering.py Analysis (1412 lines)

**Status:** ✅ Analysis complete (Phase 3, Task 3.2)

**Analyzed:** 2025-10-30

### Overview

Unit tests for TMDB result filtering and buffer mechanism. Tests the filtering logic that handles TMDB API data
hygiene issues (incorrect release years, placeholder ratings). Uses mocked MovieService to verify filtering
behavior without external API calls.

### Test Catalog (30 test functions)

#### 1. Year Filtering Tests (4 tests, ~198 lines)

**Tests:**

- `test_discover_movies_filters_incorrect_release_years` - Filters out movies with incorrect years from TMDB
- `test_search_movies_filters_incorrect_release_years` - Year filtering works for search endpoint
- `test_year_filtering_handles_single_year` - Filters single year correctly
- `test_year_filtering_handles_missing_release_dates` - Handles movies with null/missing release dates

#### 2. Rating Filtering Tests (3 tests, ~139 lines)

**Tests:**

- `test_discover_movies_filters_incorrect_ratings` - Filters placeholder (0.0) ratings and out-of-range ratings
- `test_rating_filtering_handles_range` - Correctly applies vote_average_gte/lte range
- `test_rating_filtering_handles_missing_ratings` - Handles movies with null/missing vote_average

#### 3. Vote Count Quality Filtering Tests (3 tests, ~117 lines)

**Tests:**

- `test_rating_filter_excludes_low_vote_count_movies` - Excludes movies below vote_count threshold (10 votes)
- `test_general_browsing_applies_higher_vote_threshold` - General browsing uses higher threshold
- `test_vote_count_filter_excludes_movies_without_vote_count` - Handles movies with null/missing vote_count

#### 4. Combined Filtering Tests (1 test, ~60 lines)

**Tests:**

- `test_combined_year_and_rating_filtering` - Year + rating filters work together correctly

#### 5. Buffer Mechanism Tests (5 tests, ~294 lines)

**Tests:**

- `test_buffer_mechanism_fetches_page_n_plus_1_when_under_threshold` - Buffer fetches page 2 when page 1 < 20
  results after filtering
- `test_buffer_mechanism_does_not_fetch_when_full_page_achieved` - No buffer fetch when page 1 has 20+ results
- `test_buffer_mechanism_fills_page_even_with_few_initial_results` - Buffer continues fetching until 20 results
  or exhausted
- `test_buffer_mechanism_does_not_fetch_on_last_page` - No buffer fetch when on last TMDB page
- `test_buffer_movies_also_pass_filters_no_leakage` - Buffer movies also pass all filters (no leakage)

#### 6. Different Endpoint Context Tests (2 tests, ~100 lines)

**Tests:**

- `test_filtering_applies_to_now_playing_endpoint` - Filtering works for now-playing endpoint
- `test_filtering_applies_to_upcoming_endpoint` - Filtering works for upcoming endpoint

#### 7. No Filtering Tests (2 tests, ~80 lines)

**Tests:**

- `test_no_filters_returns_all_results_unchanged` - No filters = all results returned unchanged
- `test_no_buffer_fetch_when_no_filters_applied` - No buffer fetch when no filters (no data hygiene needed)

#### 8. Completeness Filtering Tests (4 tests, ~160 lines)

**Tests:**

- `test_filter_movies_excludes_missing_poster` - Excludes movies with null/empty poster_path
- `test_filter_movies_excludes_empty_title` - Excludes movies with null/empty title
- `test_filter_movies_completeness_with_all_valid` - All valid movies pass completeness check
- `test_completeness_filter_applies_with_other_filters` - Completeness + year/rating filters work together

#### 9. Historical Validation Tests (3 tests, ~120 lines)

**Tests:**

- `test_filter_movies_excludes_pre_cinema_dates` - Excludes movies before 1888 (first film year)
- `test_filter_movies_includes_first_film_year` - Includes movies from 1888 (edge case)
- `test_historical_validation_with_year_filters` - Historical validation + year filters work together

#### 10. Genre Quality Filtering Tests (3 tests, ~144 lines)

**Tests:**

- `test_genre_filter_excludes_movies_with_empty_genres` - Excludes movies with empty genre_ids list
- `test_genre_filter_works_with_completeness_checks` - Genre + completeness filters work together
- `test_combined_genre_and_vote_filters_with_rating_filter` - Genre + vote + rating filters all work together

### Shared Fixtures & Dependencies

**Fixtures used:**

- None (unit tests use direct MovieService instantiation with mocked TMDB client)

**Mocks:**

- `Mock(spec=['get'])` - Mocked TMDB API client

**Test helpers:**

- `create_movie_dict()` - From test_fixtures_tmdb, creates TMDB movie dict
- `create_paginated_tmdb_response()` - From test_fixtures_tmdb, creates TMDB pagination response
- `TMDBMovieBase` - Type for movie creation (from test_fixtures_tmdb)

**Common imports:**

- `ApiResponse` from core.services.api_response
- `PaginatedMovieResponseSchema` from movie.schemas
- `MovieService` from movie.services.movie_service

### Natural Groupings

**By filter type:**

- Year filtering: 4 tests (~198 lines)
- Rating filtering: 3 tests (~139 lines)
- Vote count filtering: 3 tests (~117 lines)
- Completeness filtering: 4 tests (~160 lines)
- Historical validation: 3 tests (~120 lines)
- Genre quality filtering: 3 tests (~144 lines)
- Combined filtering: 1 test (~60 lines)

**By mechanism:**

- Buffer mechanism: 5 tests (~294 lines)
- Endpoint context: 2 tests (~100 lines)
- No filtering baseline: 2 tests (~80 lines)

**Key insight:** Filter types are well-separated and independent. Buffer mechanism is the largest section
(~294 lines). Splitting by filter domain creates focused, maintainable files.

### Proposed Split Strategy

**Approach:** Filter domain split (recommended by research)

**Rationale:**

- Each filter type is independent with clear domain boundaries
- Easy to locate tests for specific filter
- Supports parallel development (different filters developed independently)
- Buffer mechanism is shared concern, should be in its own file
- File sizes will be 80-294 lines (well within recommended 200-400 range)

**Proposed files:**

1. **`test_year_filtering.py`** (~200 lines, unit/)
   - Year filtering tests (4 tests)
   - Includes combined year+rating test (shares year filtering logic)
   - Tests: incorrect years, single year, missing dates, combined year+rating

2. **`test_rating_filtering.py`** (~140 lines, unit/)
   - Rating filtering tests (3 tests)
   - Tests: placeholder ratings, range handling, missing ratings

3. **`test_vote_count_filtering.py`** (~120 lines, unit/)
   - Vote count quality filtering tests (3 tests)
   - Tests: low vote exclusion, general browsing threshold, missing vote_count

4. **`test_completeness_filtering.py`** (~160 lines, unit/)
   - Completeness filtering tests (4 tests)
   - Tests: missing poster, empty title, all valid, completeness + other filters

5. **`test_historical_validation.py`** (~120 lines, unit/)
   - Historical validation tests (3 tests)
   - Tests: pre-cinema dates, first film year, historical + year filters

6. **`test_genre_quality_filtering.py`** (~144 lines, unit/)
   - Genre quality filtering tests (3 tests)
   - Tests: empty genres, genre + completeness, genre + vote + rating

7. **`test_buffer_mechanism.py`** (~294 lines, unit/)
   - Buffer mechanism tests (5 tests)
   - Tests: fetch on under-threshold, no fetch when full, continues fetching, last page handling, filter
     leakage prevention

8. **`test_endpoint_filtering_integration.py`** (~180 lines, unit/)
   - Different endpoint context tests (2 tests)
   - No filtering baseline tests (2 tests)
   - Tests cross-cutting concerns (filtering applies consistently across endpoints, baseline behavior)

**Total:** 8 files, all under 300 lines, most 120-200 lines

**Directory placement:** All files go to `backend/apps/movie/tests/unit/`

- All are unit tests (MovieService with mocked TMDB client, no database, no external APIs)
- Tests isolated service layer filtering logic

### Migration Notes

**Shared setup to preserve:**

- Import block (lines 1-32) - copy to all files, trim unused imports per file
- Test helpers are already in test_fixtures_tmdb - no duplication needed

**No fixture extraction needed:**

- All tests use direct MovieService instantiation with mocked client
- No shared fixtures to migrate
- No conftest.py changes required

**Post-split verification:**

- Run `pytest apps/movie/tests/unit/` to verify all 30 tests still pass
- Verify no import errors
- Verify test count matches (30 tests across 8 files)

---

## Other Oversized Files (500+ lines)

**Status:** ✅ Assessment complete (Phase 3, Task 3.3)

**Analyzed:** 2025-10-30

### Files Identified (>500 lines)

**Total:** 11 files over 500 lines threshold

**Already analyzed (Phase 3.1-3.2):**

- ✅ test_movie_api.py (1512 lines) - Split recommended → 7 files
- ✅ test_result_filtering.py (1412 lines) - Split recommended → 8 files

**Additional files assessed:**

1. test_movie_enrichment_service.py (672 lines, 17 tests)
2. test_user_movie_data_api.py (666 lines, 20 tests)
3. test_watchlist_endpoint.py (660 lines, 10 tests)
4. test_movie_service_buffer_deduplication.py (589 lines, 7 tests)
5. test_user_api.py (574 lines, 22 tests)
6. test_response_builder.py (563 lines, 2 tests)
7. test_token_refresh_scenarios.py (519 lines, estimated 15+ tests)
8. test_movie_service.py (501 lines, estimated 12+ tests)
9. test_error_recovery.py (500 lines, estimated 10+ tests)

### Assessment Results

#### Files Recommended for Splitting

**1. test_user_movie_data_api.py (666 lines, 20 tests)**

**Rationale:**

- Multiple endpoints tested (user movies, watchlist, ratings, reviews)
- Borderline 2x over threshold (400 line target)
- Would benefit from endpoint-based split
- Likely 3-4 files: user_movies, watchlist, ratings/reviews

**Proposed action:** Split by endpoint (Phase 4)

**2. test_watchlist_endpoint.py (660 lines, 10 tests)**

**Rationale:**

- Borderline 2x over threshold
- However, only 10 tests suggests high verbosity per test
- Need to examine if tests are naturally separable or if file is cohesive
- May have separate concerns (authentication, filtering, enrichment, isolation, error handling)

**Proposed action:** Examine structure, split if natural boundaries found (Phase 4)

**3. test_user_api.py (574 lines, 22 tests)**

**Rationale:**

- Borderline over threshold (574 vs 400-500 range)
- Many tests (22) suggests multiple concerns
- Likely covers registration, profile, password management, deletion
- Would benefit from feature-based split

**Proposed action:** Split by feature (registration, profile, password, etc.) (Phase 4)

#### Files Recommended to Keep Intact

**1. test_movie_enrichment_service.py (672 lines, 17 tests)**

**Rationale:**

- Single cohesive focus: movie enrichment service
- Borderline (1.5x over threshold)
- 17 tests = reasonable ~40 lines per test
- Splitting would create artificial boundaries
- Tests likely cover: basic enrichment, cast/crew, genres, runtime, error handling

**Decision:** Keep intact - cohesive single service tests

**2. test_movie_service_buffer_deduplication.py (589 lines, 7 tests)**

**Rationale:**

- TDD tests for specific feature (buffer deduplication)
- Single focused concern
- Only 7 tests = high verbosity per test (~84 lines/test avg)
- Tests are likely comprehensive scenario coverage (basic dedup, heavy duplication, max_buffer_pages,
  cross-page, etc.)
- Splitting would fragment feature test coverage

**Decision:** Keep intact - single feature TDD tests

**3. test_response_builder.py (563 lines, 2 tests)**

**Rationale:**

- Only 2 tests = extremely high verbosity per test (~280 lines/test)
- Likely parametrized tests with extensive scenarios
- Splitting 2 tests doesn't make sense

**Decision:** Keep intact - parametrized/comprehensive tests

**4. test_token_refresh_scenarios.py (519 lines, estimated 15+ tests)**

**Rationale:**

- Borderline at threshold
- Single cohesive focus: token refresh scenarios
- Scenario-based testing likely requires comprehensive setup

**Decision:** Keep intact - borderline acceptable, cohesive focus

**5. test_movie_service.py (501 lines, estimated 12+ tests)**

**Rationale:**

- At threshold (501 lines)
- Single service tests (MovieService)
- Marginally over - not worth split churn

**Decision:** Keep intact - at threshold, cohesive

**6. test_error_recovery.py (500 lines, estimated 10+ tests)**

**Rationale:**

- Exactly at threshold
- Single cohesive focus: error recovery patterns

**Decision:** Keep intact - at threshold, cohesive

### Summary

**Files requiring action (Phase 4):**

- test_user_movie_data_api.py (666 lines) → Split by endpoint
- test_watchlist_endpoint.py (660 lines) → Examine and potentially split
- test_user_api.py (574 lines) → Split by feature

**Files to keep intact:**

- test_movie_enrichment_service.py (672 lines) - Single service
- test_movie_service_buffer_deduplication.py (589 lines) - Single feature TDD
- test_response_builder.py (563 lines) - Only 2 parametrized tests
- test_token_refresh_scenarios.py (519 lines) - Borderline, cohesive
- test_movie_service.py (501 lines) - At threshold, cohesive
- test_error_recovery.py (500 lines) - At threshold, cohesive

**Rationale for decisions:**

- **Split criteria:** Multiple concerns, multiple endpoints, clear domain boundaries, 2x+ over threshold
- **Keep intact criteria:** Single cohesive focus, borderline threshold, artificial split boundaries, TDD/feature
  tests, parametrized tests

---

## Post-Migration Refactoring Opportunities

**Status:** To be documented in Phase 7, Task 7.3

**Will analyze:**

1. **DRY violations** - Duplicate test setup, assertions, mocks
2. **Missing test helpers** - Repeated patterns that could be abstracted
3. **Fixture organization** - Consolidation opportunities, unused fixtures
4. **Test readability** - Naming improvements, docstring quality
5. **Test complexity** - Tests doing too much, should be split

**Categorization:**

- Critical: Blocks maintainability, fix now
- Nice-to-have: Polish, defer to follow-up task list

---

## Migration Decisions Log

### pytest Configuration (Phase 5)

**Decision pending:** Whether to add markers to individual tests

**Option A:** No markers (directory structure only)

- Pro: Simpler, directory structure is sufficient
- Con: Can't easily select "all slow tests across unit and integration"

**Option B:** Add markers to all tests

- Pro: Maximum flexibility for test selection
- Con: Maintenance overhead, markers can get stale

**Recommendation:** Option A (directory structure primary), add markers selectively for `slow` and `api` only

### Fixture Splitting (Phase 2)

**Decision made:** Keep fixtures at app-level `conftest.py`

**Rationale:**

- Only 14 fixtures project-wide
- No navigation problems at current scale
- Premature to use `pytest_plugins` pattern
- Revisit at 50+ fixtures

### Test File Naming After Split

**Decision made:** Use `test_{resource}_{feature}_{aspect}.py` pattern

**Examples:**

- `test_movie_discover_filtering.py` (resource=movie, feature=discover, aspect=filtering)
- `test_user_authentication_tokens.py` (resource=user, feature=authentication, aspect=tokens)

**Rationale:**

- Clear hierarchy
- Easy to locate tests
- Matches research findings from Django REST Framework
- Keeps names under 50 characters

---

## Success Metrics

**Target outcomes:**

- ✅ All test files under 400 lines (except intentionally documented exceptions)
- ✅ Clear unit/integration separation in all 4 apps
- ✅ 100% test pass rate maintained throughout migration
- ✅ No change in total test count (103 tests)
- ✅ Directory-based execution works (`pytest tests/unit/`, `pytest tests/integration/`)
- ✅ Improved test discoverability and navigation

**Quality gates:**

- All tests pass after each file move/split
- Zero linting violations
- Zero type errors
- CI/CD pipeline runs successfully

---

## References

### Research Sources

**pytest Ecosystem:**

- pytest official docs: <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Django REST Framework tests: <https://github.com/encode/django-rest-framework/tree/master/tests>
- pytest-django documentation
- pytest-with-eric.com: Best practices articles

**React/Vitest Ecosystem:**

- Vitest official docs: <https://vitest.dev/guide/>
- React Testing Library philosophy
- Jest documentation
- Ant Design testing practices

**Industry Guidance:**

- Google testing blog (testing pyramid)
- Microsoft testing best practices
- Martin Fowler on test organization

### Internal Documentation

- `.arc/reference/strategies/strategy-testing-methodology.md` - Updated standards
- `.arc/active/incidental/tasks-test-organization-standardization.md` - Task list
- `backend/pyproject.toml` - pytest configuration
