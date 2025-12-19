# Task List: Service Layer Modernization

**PRD:** `.arc/active/technical/prd-service-layer-modernization.md`
**Created:** 2025-10-22
**Branch:** `technical/service-layer-modernization`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Modernize CineXplorer's service layer by creating reusable pagination/batch helpers and refactoring
all remaining function-based services to class-based architecture with dependency injection.

## Scope

### Will Do

- Create generic pagination and batch operation helpers
- Refactor `MovieEnrichmentService` to use repository pattern with proper DI
- Convert function-based `MovieService` to class-based with DI
- Create `KeywordService` and `PeopleService` (extracted from movie domain)
- Migrate TMDB result filtering from frontend to service layer
- Create `UserMovieDataService` with repository pattern for ORM abstraction
- Create `AuthenticationService` for security-critical operations
- Update all API endpoints to use service layer (thin wrapper pattern)
- Update TECHNICAL-OVERVIEW.md with service architecture documentation

### Won't Do

- Performance optimization beyond current scope (separate enhancement)
- Async/await conversion (deferred to Backend Modernization)
- New UserMovieData or authentication features (only refactoring)
- Frontend changes beyond removing migrated filtering logic

## Architecture Decisions

**Dependency Injection Pattern:**

- **External APIs** (TMDB): Inject client abstraction (`TMDBApiClient` via `MovieService`)
- **Internal data** (ORM): Inject repository abstraction (`UserMovieDataRepository`)
- **Cross-cutting services**: Inject service instances (`ZeptomailService`, `MovieService`)

**Testing Strategy:**

- Test-first protocol for all new services/helpers
- Coverage targets: 80% general, 90%+ critical paths (auth, filtering)
- Mock repositories/services for unit tests, real DB for integration tests

---

## Tasks

### **Phase 1:** Create Pagination & Batch Operation Helpers

- [x] **1.1 Create Generic Pagination Helper**
    - [x] 1.1.a Write tests for `paginate_queryset` function (test-first)
        - Valid pagination scenarios (various page numbers, page sizes)
        - Bounds checking (page < 1, page > total_pages)
        - Page size limits enforcement
        - Empty QuerySet handling
        - Target coverage: 90%+ (critical path)
    - [x] 1.1.b Implement `paginate_queryset` in `backend/apps/core/pagination.py`
        - Accept QuerySet, page number, optional page_size
        - Return tuple: (paginated QuerySet slice, pagination metadata dict)
        - Validate bounds, enforce limits
        - Full type annotations (no `Any` usage)
        - Comprehensive docstring with usage examples
    - [x] 1.1.c Run tests and incremental quality checks (pagination.py, test_pagination.py)

- [x] **1.2 Create TMDB Batch Fetch Helper**
    - [x] 1.2.a Write tests for `fetch_movies_batch` function (test-first)
        - Successful batch fetches (all IDs valid)
        - Partial failures (some IDs return 404)
        - Complete failures (all IDs fail)
        - Empty input list handling
        - TMDB API error handling
        - Target coverage: 90%+ (critical path)
    - [x] 1.2.b Implement `fetch_movies_batch` in `backend/apps/movie/services/batch_operations.py`
        - Accept list of TMDB IDs
        - Return list of successfully fetched `MovieBaseSchema` objects
        - Gracefully handle partial failures (don't fail entire batch)
        - Structured logging for batch operations
        - Full type annotations
        - Comprehensive docstring
    - [x] 1.2.c Run tests and incremental quality checks (batch_operations.py, test_batch_operations.py)

- [x] **1.3 Create User Movies Response Builder**
    - [x] 1.3.a Write tests for `build_user_movies_response` function (test-first)
        - Full flow validation (pagination → fetch → enrich → response)
        - Pagination metadata correctness
        - User-specific enrichment data inclusion
        - Edge cases (empty watchlist, unavailable movies)
        - Target coverage: 80%+ (general)
    - [x] 1.3.b Implement `build_user_movies_response` in `backend/apps/user_movie_data/services/response_builder.py`
        - Accept UserMovieData QuerySet, user object, page number, optional page_size
        - Compose: pagination → TMDB fetch → enrichment → response
        - Return `PaginatedMovieResponseSchema` with enriched data
        - Use `paginate_queryset` from 1.1.2
        - Use `fetch_movies_batch` from 1.2.2
        - Use `MovieEnrichmentService` for enrichment
        - Full type annotations, comprehensive docstring
    - [x] 1.3.c Run tests and incremental quality checks (response_builder.py, test_response_builder.py)

- [x] **1.4 Investigate and Eliminate Type Ignores**
    - [x] 1.4.a Audit type ignores in `backend/apps/user_movie_data/api.py`
        - **Found**: 1 type ignore for `reportUnknownMemberType` on `umd.movie.tmdb_id` list comprehension
        - **Root cause**: Chained attribute access through ForeignKey relationship
        - **Solution**: Replaced with `values_list('movie__tmdb_id', flat=True)` for type-safe query
        - **Result**: Type ignore eliminated, more efficient SQL (single query vs iteration)
    - [x] 1.4.b Audit type ignores in `backend/apps/user_movie_data/services/movie_enrichment_service.py`
        - **Found**: 3 type ignores for `reportUnknownMemberType` on ForeignKey field access
        - **Root cause**: Dict comprehension with chained access + redundant field extraction
        - **Solution 1**: Explicit loop with intermediate variable for dict building
        - **Solution 2**: Reuse Pydantic-validated data instead of re-extracting from ORM
        - **Result**: All 3 type ignores eliminated, clearer logic (use validated data)
    - [x] 1.4.c Run type checking to verify improvements (target: zero unnecessary type ignores)
        - **Achievement**: 4/4 type ignores eliminated (100% removal)
        - **Pyright**: 0 errors, 0 warnings, 0 informations
        - **Tests**: 55/55 passing (all user_movie_data tests)
        - **Key insight**: Better patterns > suppression comments

- [x] **1.5 Phase 1 Quality Gate**
    - [x] 1.5.a Run full backend test suite
        - **Result**: 298/298 tests passed (100%)
        - **Note**: 1 teardown error (database cleanup with concurrent tests - not a test failure)
    - [x] 1.5.b Run all backend linting checks
        - **Result**: All checks passed (Ruff)
    - [x] 1.5.c Run Python type checking
        - **Result**: 9 errors (test fixtures - acceptable django-types limitations), 46 informations (acceptable)
        - **Production code**: 0 errors
    - [x] 1.5.d Run markdown linting
        - **Result**: 0 errors (49 files checked)

---

### **Phase 2:** Complete MovieEnrichmentService Refactoring

- [x] **2.1 Fix Mutation Anti-Pattern**
    - [x] 2.1.a Write tests verifying non-mutation behavior (test-first)
        - Assert input list unchanged after enrichment
        - Verify enriched data returns new list with new MovieBaseSchema instances
        - Ensure original schemas remain unmodified
        - **Result**: 3 new tests added, all failing as expected (RED phase)
    - [x] 2.1.b Refactor `enrich_movies_with_user_movie_data` method
        - Return new list with enriched copies
        - Do NOT mutate input list in-place
        - Use Pydantic's `.model_copy(update={...})` for immutable updates
        - Update docstring to document non-mutation guarantee
        - **Result**: All 14 tests passing (GREEN phase)
    - [x] 2.1.c Run tests and verify no regressions (test_movie_enrichment_service.py)
        - **Result**: Ruff 0 errors, Pyright 0 errors, 14/14 tests passing

- [x] **2.2 Implement Actual Dependency Injection**
    - [x] 2.2.a Create UserMovieData repository interface/class
        - Define repository with `get_for_user_and_movies(user, tmdb_ids)` method
        - Implement concrete repository using Django ORM
        - Located in `backend/apps/user_movie_data/repositories.py`
        - **Result**: Repository created, returns `dict[int, UserMovieData]`
    - [x] 2.2.b Write tests verifying DI implementation (test-first)
        - Test service with mocked repository
        - Verify ORM is NOT called directly (uses injected repository)
        - Verify repository injection works correctly
        - **Result**: 3 DI tests added (MockUserMovieDataRepository class), all passing
    - [x] 2.2.c Refactor MovieEnrichmentService to use injected repository
        - Update constructor to inject repository (already has signature)
        - Replace direct ORM calls with repository method calls
        - Update `_repository` usage (currently unused)
        - Maintain backward compatibility (default repository if none injected)
        - **Result**: 10-line ORM query replaced with 1 repository call, updated docstrings
    - [x] 2.2.d Update service factory function
        - Create `get_movie_enrichment_service()` factory
        - Located in `backend/apps/user_movie_data/services/service_factory.py`
        - Returns MovieEnrichmentService with default repository
        - **Result**: Factory created with 3 tests, all passing
    - [x] 2.2.e Run tests and incremental quality checks (user_movie_data service/tests)
        - **Result**: Ruff 0 errors, Pyright 0 errors, 64/64 tests passing

- [x] **2.3 Phase 2 Quality Gate**
    - [x] 2.3.a Run full backend test suite
        - **Result**: 307 passed, 1 teardown error (database cleanup, not a test failure)
    - [x] 2.3.b Run all backend linting checks
        - **Result**: Ruff 0 violations (all checks passed)
    - [x] 2.3.c Run Python type checking
        - **Result**: Pyright 0 errors, 0 warnings, 46 informations (config/logging only)

**Phase 2 Complete**: MovieEnrichmentService now immutable, testable, and ORM-agnostic with full DI implementation

---

### **Phase 3:** Refactor MovieService to Class-Based Architecture

- [x] **3.1 Create MovieService Class**
    - [x] 3.1.a Write tests for MovieService class methods (test-first)
        - Test `get_movie_by_id` with mocked TMDB client
        - Test `search_movies` with mocked TMDB client
        - Test `discover_movies` with mocked TMDB client
        - Test all existing function-based operations
        - Target coverage: 80%+ (general)
        - **Result**: 14 tests created, all failing as expected (RED phase)
        - **File**: `backend/apps/movie/tests/test_movie_service_class.py`
    - [x] 3.1.b Create `MovieService` class in `backend/apps/movie/services/movie_service.py`
        - Convert all function-based TMDB integration to class methods
        - Inject TMDB client via constructor (dependency injection)
        - Methods: `get_movie_by_id`, `search_movies`, `discover_movies`, etc.
        - Maintain existing functionality exactly (no behavior changes)
        - Follow pattern from MovieEnrichmentService and ZeptomailService
        - Full type annotations, comprehensive docstrings
        - **Result**: MovieService class implemented, 12/14 tests passing
        - **Remaining**: Factory function tests (next subtask)
    - [x] 3.1.c Create service factory function
        - Implement `get_movie_service()` in `backend/apps/movie/services/service_factory.py`
        - Returns MovieService with default TMDB client
        - **Result**: Factory function implemented, all 14/14 tests passing
    - [x] 3.1.d Run tests and incremental quality checks (movie service/tests)
        - **Tests**: 14/14 passing (100%)
        - **Linting**: 0 violations (Ruff)
        - **Type checking**: 0 errors, 0 warnings (Pyright)

- [x] **3.2 Add TMDB Result Filtering & Buffer Mechanism**
    - [x] 3.2.a Write tests for filtering and buffer logic (test-first)
        - Mock TMDB client returns movies with incorrect release years
        - Verify service filters out mismatched movies (year, rating)
        - **Note**: Runtime filtering NOT tested (TMDB API limitation - not implemented)
        - Verify service backfills from next page when gaps detected
        - Test minimum threshold logic (don't backfill if <10 natural results)
        - Test buffer application maintains correct filters
        - Test across different endpoint contexts (discover, search, now playing, upcoming)
        - Target coverage: 90%+ (critical UX path)
        - **Result**: 20 tests created in `test_result_filtering.py` (640 lines)
    - [x] 3.2.b Implement filtering helper in `backend/apps/movie/services/result_filtering.py`
        - Create `filter_movies_by_year(movies, year_criteria)` function
        - Create `filter_movies_by_rating(movies, rating_criteria)` function
        - **Note**: Runtime filtering NOT implemented (TMDB API doesn't support it - documented limitation)
        - Full type annotations, comprehensive docstrings
        - Document TMDB API quirks (incorrect year filtering despite API filters)
        - **Result**: 2 filtering functions created (210 lines), 0 linting/type errors
    - [x] 3.2.c Implement buffer mechanism in MovieService paginated methods
        - Add `_apply_filters()` private helper method (converts TMDB models to schemas, applies year/rating filters)
        - Add `_apply_buffer_if_needed()` private helper method (3-tier threshold: ≥20/10-19/<10)
        - Add `_convert_schema_to_tmdb_movie()` helper (bidirectional schema conversion with date normalization)
        - Update `discover_movies()` to use filtering + buffer (added year_min, year_max, rating_min, rating_max params)
        - Update `search_movies()` to use filtering + buffer (preserves non-visual content filtering)
        - Update `get_now_playing_movies()` to use filtering + buffer
        - Update `get_upcoming_movies()` to use filtering + buffer
        - Strategy: Fetch page N+1 if 10-19 results after filtering (3-tier threshold logic)
        - Ensure buffer movies also pass client-side filters (prevent leakage)
        - Handle empty string dates → None normalization (TMDB API quirk)
        - **Result**: Buffer mechanism implemented across all 4 paginated methods (+157 lines)
    - [x] 3.2.d Run tests and incremental quality checks (result_filtering.py, movie service)
        - Fixed 4 test mock issues (total_pages, mock specs, date handling)
        - **Tests**: 17/17 passing (100%) for result_filtering + 89/89 all movie tests (100%)
        - **Linting**: 0 violations (Ruff)
        - **Type checking**: 0 errors (Pyright)
    - [x] 3.2.e Refactor MovieService for DRY & Separation of Concerns ("Leave It Cleaner" protocol)
        - **Goal**: Reduce MovieService from 867 lines to ~500 lines by extracting repeated patterns
        - **Context**: Post-implementation refactoring before moving to API endpoint updates (Task 3.3)
        - [x] 3.2.e.1 Extract Pydantic factory functions to schema_factories.py
            - Create `backend/apps/movie/services/schema_factories.py`
            - Move 6 factory functions from movie_service.py:
                - `create_movie_base_from_tmdb()`
                - `create_movie_detail_from_tmdb()`
                - `create_paginated_movie_response_from_tmdb()`
                - `create_paginated_keyword_response_from_tmdb()`
                - `create_paginated_person_response_from_tmdb()`
                - `create_genre_list_from_tmdb()`
            - Move `handle_tmdb_api_error()` helper
            - Update imports in movie_service.py (import from schema_factories)
            - **Rationale**: Separates TMDB→Schema conversion (data transformation) from business logic
            - **Impact**: Removes ~390 lines from movie_service.py, creates reusable module for other services
        - [x] 3.2.e.2 Extract non-visual content filtering to private helper method
            - Create `_filter_non_visual_content(movies: list[TMDBMovieBase]) -> list[TMDBMovieBase]` in MovieService
            - Centralizes skip_terms list (soundtrack, score, etc.) and filtering logic
            - **Impact**: Eliminates 50 lines of duplication in search_movies (appears twice: main + buffer)
        - [x] 3.2.e.3 Extract common response building logic to private helper method
            - Create `_build_filtered_response(movies: list[MovieBaseSchema], page: int, total_pages: int) -> PaginatedMovieResponseSchema`
            - Handles: MovieBaseSchema → TMDBMovieBase conversion + TMDBMovieSearchResponse creation + paginated response
            - **Impact**: Eliminates 48 lines of duplication across 4 paginated methods
        - [x] 3.2.e.4 Extract paginated fetch-filter-buffer pattern to private template method
            - Create `_fetch_with_filters_and_buffer(fetch_func, page, year_min, year_max, rating_min, rating_max, pre_filter_func=None)`
            - Encapsulates workflow: fetch → pre-filter (optional) → year/rating filter → buffer → response
            - Uses template method pattern: invariant workflow with variant behavior injection
            - **Impact**: Eliminates ~160 lines of duplication across 4 methods (discover, search, now_playing, upcoming)
        - [x] 3.2.e.5 Update all 4 paginated methods to use new helpers
            - Refactored discover_movies() - reduced from 167→117 lines (50 lines saved, uses template method)
            - Refactored search_movies() - reduced from 124→50 lines (74 lines saved, uses template with non-visual pre-filter)
            - Refactored get_now_playing_movies() - reduced from 91→62 lines (29 lines saved, uses template method)
            - Refactored get_upcoming_movies() - reduced from 105→76 lines (29 lines saved, uses template method)
            - **Actual impact**: Eliminated 182 lines of duplication, each method now follows consistent pattern
            - Methods now highly readable: define fetch function → call template method
            - **Quality gates**: 0 linting errors, 0 type errors, 89/89 tests passing (100%)
        - [x] 3.2.e.6 Run tests and incremental quality checks
            - **Tests**: 89/89 passing (100% pass rate, no behavior changes - pure refactoring)
            - **Linting**: 0 violations (Ruff)
            - **Type checking**: 0 errors (Pyright)
            - **Actual final sizes**:
                - `movie_service.py`: 1489 lines (down from 1933 → 1538 after DRY → 1489 final)
                - `schema_factories.py`: 470 lines (new reusable module)
                - **Net change**: -444 lines total (1933→1489), massive maintainability improvement

- [x] **3.3 Update API Endpoints to Use MovieService Class**
    - [x] 3.3.a Update movie API endpoints in `backend/apps/movie/api.py`
        - Replaced direct function calls with `get_movie_service()` factory
        - Used module-level singleton pattern (`_movie_service = get_movie_service()`)
        - Maintained backward compatibility (keyword/people endpoints still use old functions until Task 3.4)
        - Added TODO comments for keyword/people migration in Task 3.4
        - Added justified type ignore for discover_movies **kwargs unpacking
        - **Result**: 6 movie endpoints migrated to MovieService class, 4 keyword/people deferred
    - [x] 3.3.b Update movie helpers in `backend/apps/movie/helpers.py` if needed
        - **No changes needed**: Helpers work on response schemas, not service layer
        - Enrichment helpers use MovieEnrichmentService (separate from MovieService)
        - Verified separation of concerns: MovieService (TMDB) → helpers (user enrichment)
    - [x] 3.3.c Run API integration tests (test_movie_api.py - verify all movie endpoints work)
        - **test_movie_api.py**: 15/15 passing (100%)
        - **test_endpoint_enrichment_integration.py**: 16/16 passing (100%)
        - **All movie tests**: 89/89 passing (100%)
        - Verified backward compatibility maintained
    - [x] 3.3.d Run incremental quality checks (movie app)
        - **Linting**: 0 violations (Ruff, 1 auto-fixed)
        - **Type checking**: 0 errors (Pyright)

- [x] **3.4 Extract Keyword and People Services**
    - [x] 3.4.a Write tests for KeywordService class (test-first)
        - Created `backend/apps/movie/tests/test_keyword_service_class.py` (246 lines)
        - **Tests created (10 total)**:
            - Constructor tests: injected client, default client
            - get_popular_keywords: uses client, handles errors, default page
            - search_keywords: uses client, handles empty query, handles errors
            - Factory function tests: creates service, returns correct type
        - **Result**: 10/10 tests failing as expected (RED phase - module doesn't exist yet)
        - **Linting**: 0 violations (Ruff, 1 auto-fixed)
        - **Type errors**: 65 (expected - module doesn't exist)
    - [x] 3.4.b Create KeywordService class in `backend/apps/movie/services/keyword_service.py`
        - Created `keyword_service.py` (176 lines) with DI pattern
        - **Methods implemented**:
            - `get_popular_keywords(page: int = 1)` - Fetches popular keywords from TMDB
            - `search_keywords(query: str)` - Searches keywords, handles empty/short queries
        - Added `get_keyword_service()` factory to `service_factory.py`
        - Full type annotations, comprehensive docstrings with examples
        - **Result**: 10/10 tests passing (GREEN phase - successful TDD cycle)
        - **Linting**: 0 violations (Ruff, 1 auto-fixed)
        - **Type checking**: 0 errors (Pyright)
    - [x] 3.4.c Write tests for PeopleService class (test-first)
        - Created `backend/apps/movie/tests/test_people_service_class.py` (286 lines)
        - **Tests created (10 total)**:
            - Constructor tests: injected client, default client
            - get_popular_people: uses client, handles errors, default page
            - search_people: uses client, handles empty query, handles errors
            - Factory function tests: creates service, returns correct type
        - **Result**: 10/10 tests failing as expected (RED phase - module doesn't exist yet)
        - **Linting**: 0 violations (Ruff)
        - **Type errors**: 65 (expected - `movie.services.people_service` module not created yet)
        - **Bonus work**: Created reusable TypedDict fixtures, eliminated all `typing.Any` usage from tests
            - Created `test_fixtures_tmdb.py` (11 TypedDicts for TMDB API responses)
            - Replaced 15 `dict[str, Any]` → precise TypedDicts across 4 test files
            - Replaced 6 `TMDBResponseData` → `TMDBMovieResponse` for precision
            - Used `NotRequired` (Python 3.11+) for explicit optional fields
            - **Impact**: 0 type errors in all non-PeopleService test files, 0 ANN401 violations
    - [x] 3.4.d Create PeopleService class in `backend/apps/movie/services/people_service.py`
        - Created `people_service.py` (176 lines) with DI pattern
        - **Methods implemented**:
            - `get_popular_people(page: int = 1)` - Fetches popular actors, directors from TMDB
            - `search_people(query: str)` - Searches people by name, handles empty/short queries
        - Added `get_people_service()` factory to `service_factory.py`
        - Full type annotations, comprehensive docstrings with examples
        - **Result**: 10/10 tests passing (GREEN phase - successful RED → GREEN TDD cycle)
        - **Linting**: 0 violations (Ruff)
        - **Type checking**: 0 errors (Pyright)
    - [x] 3.4.e Update API endpoints to use new services
        - Update keywords endpoints in `backend/apps/movie/api.py`:
            - Replace `movie_service.get_popular_keywords()` → `keyword_service.get_popular_keywords()`
            - Replace `movie_service.search_keywords()` → `keyword_service.search_keywords()`
        - Update people endpoints in `backend/apps/movie/api.py`:
            - Replace `movie_service.get_popular_people()` → `people_service.get_popular_people()`
            - Replace `movie_service.search_people()` → `people_service.search_people()`
        - Use factory functions for instantiation
        - Maintain exact same API behavior (backward compatibility)
    - [x] 3.4.f Run incremental quality checks
        - **Linting**: 0 violations (Ruff) on keyword_service.py, people_service.py, api.py
        - **Type checking**: 0 errors (Pyright) on new services
        - **Tests**: Verify API endpoints still work (keywords and people routes)

- [x] **3.5 Clean Up Old Code and Frontend Duplication**

    - [x] 3.5.a Remove old function-based implementations and tests
        - **Remove old function-based service code from movie_service.py**:
            - Remove all old function-based service functions (lines 44-658):
                - `fetch_movie_runtimes()`, `get_movie_by_id()`, `get_now_playing_movies()`, `get_upcoming_movies()`
                - `search_movies()`, `discover_movies()`, `get_movie_genres()`
                - `get_popular_keywords()`, `search_keywords()`, `get_popular_people()`, `search_people()`
            - Remove "Helper Functions" section header (line 44)
            - Remove "Class-Based Service Architecture" section header (line 657)
            - Remove any temporal comments distinguishing new from old
            - **Expected result**: movie_service.py reduces from 1489 lines → ~874 lines
        - **Remove old function-based tests**:
            - Delete `backend/apps/movie/tests/test_movie_service.py` entirely
            - **Rationale**: These test the old function-based code being removed
            - New class-based code covered by test_movie_service_class.py, test_keyword_service_class.py, test_people_service_class.py
        - **Remove temporal/relative language from remaining files**:
            - Update `test_movie_service_class.py` docstring:
                - Remove "class-based architecture" language (it's just "the architecture" now)
                - Remove references to "injected client (not global tmdb_client)" - there is no global anymore
                - Simplify to describe what the tests do, not what they're replacing
            - Update `test_keyword_service_class.py` docstring (same changes)
            - Update `test_people_service_class.py` docstring (same changes)
            - Remove `_class` suffix from test file names (now the only implementation)
        - Verify no references to old functions remain in codebase (grep for old function names)
        - Run full test suite to confirm nothing broken

    - [x] 3.5.b Remove client-side filtering from frontend (broken into 3 subtasks)
        - **Context**: Backend now handles all year/rating filtering + buffer mechanism
        - **Rationale**: Eliminates duplication, single source of truth in backend

        - [x] 3.5.b.1 Refactor frontend fetcher architecture and remove client-side filtering
            - **Completed**: Comprehensive refactoring of frontend fetcher hooks
            - **Files Created**:
                - `useMovieFetchRouter.ts` (119 lines) - Simplified from useEnhancedFetcher (290→119 lines, 59% reduction)
                - `usePaginatedMovies.ts` (64 lines) - Renamed from useMoviesArray with enhanced docs
            - **Files Deleted**:
                - `useEnhancedFetcher.ts` (290 lines removed)
                - `useMoviesArray.ts` (39 lines removed)
                - `useMoviesFetcher.ts` (30 lines removed - thin wrapper inlined to MovieCollectionGrid)
            - **Files Enhanced**:
                - `useApiRequest.ts` - Added comprehensive docstring with data flow diagram
                - `useMovieCollectionContext.ts` - Added comprehensive docstring explaining outlet pattern
            - **Files Updated** (imports):
                - `MovieCollectionLayout.tsx` - useEnhancedFetcher → useMovieFetchRouter
                - `MovieCollectionGrid.tsx` - useMoviesArray → usePaginatedMovies, inlined adapter
                - `MovieGrid.tsx` - useMoviesArray → usePaginatedMovies
            - **Results**:
                - Removed client-side filtering (backend handles year/rating/runtime filters)
                - Removed buffer filling logic (backend handles pagination)
                - Removed pagination metadata calculation (backend provides correct values)
                - Net: -190 lines (42% reduction), -1 file, +comprehensive documentation
                - Quality: 0 TypeScript errors, 0 ESLint violations
                - Architecture now self-documenting through clear naming + data flow diagrams

        - [x] 3.5.b.2 Evaluate and clean up movieFilterUtils.ts
            - **Completed**: Comprehensive cleanup and rename of filter utilities
            - **Analysis findings**:
                - Only mapFiltersToApiParams actively used (by useMovieFetchRouter.ts)
                - 4 filter functions never imported (filterMoviesByYear, filterMoviesByRating, filterMoviesByRuntime, calculatePaginationMetadata)
                - 3 type definitions only used internally by deleted functions
                - mapFiltersToApiParams returned 4 values but only filterParams was used
                - 90 lines of commented-out runtime filtering code (dead weight)
            - **Changes made**:
                - Created `movieFilterMapper.ts` (115 lines) - renamed for clarity (mapping, not filtering)
                - Deleted `movieFilterUtils.ts` (394 lines)
                - Removed 4 unused functions (160 lines)
                - Removed 3 unused type definitions
                - Removed 90 lines of commented-out code
                - Simplified mapFiltersToApiParams to return only filterParams (removed dead criteria objects)
                - Updated import in useMovieFetchRouter.ts (removed destructuring)
            - **Results**:
                - Net reduction: 279 lines (70% smaller)
                - Clear single responsibility (UI filters → API params transformation)
                - Name accurately reflects purpose (mapper vs utils)
                - Quality: 0 TypeScript errors, 333/333 tests passing
                - Architecture: Clean separation (mapping in utility, routing in hook, filtering in backend)

        - [x] 3.5.b.3 Re-evaluate discover_movies type safety
            - **Status**: Completed via incidental work `22_filter-integration-testing` (archived 2025-12-10)
            - **Work completed**:
                - Schema `to_service_params()` refactored with declarative mapping + year/rating extraction
                - Frontend parameter mapping fixed (min_rating → vote_average_gte, etc.)
                - 13 integration tests added (schema + API) - all passing
                - 15 frontend mapper tests added - all passing
                - Docstrings updated ("client-side" → "second-pass data hygiene")
                - Vote count quality filter added (TMDB_MIN_VOTE_COUNT_THRESHOLD setting)
                - Completeness filter added (excludes movies without poster/title)
                - TMDB API quirks documented (confirmed API bug on their side)
            - **Type ignore**: Retained for `**kwargs` unpacking (justified, necessary for dynamic params)

- [x] **3.6 Phase 3 Quality Gate**
    - [x] 3.6.a Run full backend test suite - **615/615 passed**
    - [x] 3.6.b Run all backend linting checks - **0 violations (Ruff)**
    - [x] 3.6.c Run Python type checking - **0 errors, 46 informations (Pyright)**
    - [x] 3.6.d Run full frontend test suite - **723/723 passed**
    - [x] 3.6.e Run frontend linting and type checking - **0 errors (ESLint + TypeScript)**

---

### **Phase 4:** Create UserMovieDataService

- [x] **4.1 Create UserMovieDataService Class**

    **Goal:** Encapsulate all business logic related to user movie data management, including CRUD operations
    and filtering with pagination.

    - [x] 4.1.a Write tests for UserMovieDataService CRUD operations (test-first)
        - Test CREATE: TMDB fetch → Movie stub creation → UserMovieData creation
        - Test UPDATE: Partial field updates with validation
        - Test DELETE: Authorization and deletion logic
        - Test QUERY: Filtering (watchlist, ratings) with pagination
        - Mock dependencies: `UserMovieDataRepository` (extended with CRUD), `MovieService`
        - Use existing test helpers: `create_user()`, `create_mock_paginated_response()`
        - Target coverage: 80%+ (general)
        - Expect tests to FAIL initially
        - **Completed**: 21 tests written in `test_user_movie_data_service.py`
            - Created shared `user_movie_data/tests/test_helpers.py` (DRY)
            - Added `create_mock_user()` to `core/tests/test_helpers.py`
            - Refactored `test_movie_enrichment_service.py` to use shared helpers
            - All 21 tests fail as expected (service not implemented)

    - [x] 4.1.b Extend `UserMovieDataRepository` with CRUD methods
        - Added methods: `create()`, `update()`, `delete()`, `get_by_id()`, `get_by_tmdb_id()`, `get_filtered()`
        - Added movie helpers: `get_movie_by_tmdb_id()`, `create_movie_stub()` (for create flow)
        - Kept existing `get_for_user_and_movies()` unchanged
        - Full type annotations, comprehensive docstrings
        - Uses `paginate_queryset` helper from Phase 1
        - Quality checks pass (ruff, pyright)

    - [x] 4.1.c Create `UserMovieDataService` class in `backend/apps/user_movie_data/services/user_movie_data_service.py`
        - Implemented: `create()`, `get_by_id()`, `get_by_tmdb_id()`, `update()`, `delete()`, `get_user_movies()`
        - DI pattern: Injects `UserMovieDataRepository` and `MovieService`
        - CREATE flow: Check local → fetch TMDB → create stub → create UserMovieData
        - Authorization: All ops pass user to repository for scoped queries
        - Full type annotations, comprehensive docstrings
        - All 21 unit tests pass, quality checks pass (ruff, pyright)

    - [x] 4.1.d Create service factory function
        - Added `get_user_movie_data_service()` to `service_factory.py`
        - Injects `UserMovieDataRepository` and `MovieService` via `get_movie_service()`

    - [x] 4.1.e Run tests and incremental quality checks (user_movie_data service/tests)
        - All 85 user_movie_data tests pass (21 unit + 64 integration)
        - Quality checks pass (ruff, pyright)

- [x] **4.2 Update UserMovieData API Endpoints to Use Service Layer**

    **Goal:** Refactor API endpoints to delegate business logic to the new service layer, ensuring separation of concerns.

    - [x] 4.2.a Refactor UserMovieData API endpoints in `backend/apps/user_movie_data/api.py`
        - Replaced inline business logic with service calls (5 endpoints)
        - Using `get_user_movie_data_service()` factory
        - API layer now handles only: request/response, authentication, validation

    - [x] 4.2.b Schema naming consistency refactor
        **Goal:** Establish consistent, semantic schema naming across codebase.

        - [x] 4.2.b.1 Rename single-item schema with documentation
            - `MovieBaseSchema` → `MovieListItemSchema`
            - Update docstrings to document `MovieDetailSchema` inheritance relationship

        - [x] 4.2.b.2 Rename collection response schemas
            - `PaginatedMovieResponseSchema` → `MovieListResponseSchema`
            - `PaginatedKeywordResponseSchema` → `KeywordListResponseSchema`
            - `PaginatedPersonResponseSchema` → `PersonListResponseSchema`

        - [x] 4.2.b.3 Update all backend usages (~18 code files)
            - Updated schema name references across backend services, tests, and docs
            - Ensured backend test assertions and fixtures reference new schema names

        - [x] 4.2.b.4 Regenerate frontend types and update aliases
            - Regenerated OpenAPI types from updated schema names
            - Updated frontend aliases to MovieListResponse/KeywordListResponse/PersonListResponse

        - [x] 4.2.b.5 Add `get_all_user_movies()` method to UserMovieDataService
            - Dedicated method for non-paginated user movie fetching
            - Updated api.py to use new method and return service response

        - [x] 4.2.b.6 Run incremental quality checks (schema files, affected services)
            - Ruff: backend/apps/user_movie_data
            - Pyright: backend/apps/, backend/config/ (0 errors, 0 warnings; infos only)

    - [x] 4.2.c Run API integration tests (verify all 5 endpoints work, auth/error handling unchanged)
        - pytest apps/user_movie_data/tests/integration (46 passed)
    - [x] 4.2.d Run incremental quality checks (user_movie_data app)
        - Ruff: backend/apps/user_movie_data

- [x] **4.3 Phase 4 Quality Gate**
    - [x] 4.3.a Run full backend test suite
        - pytest apps/ (639 passed)
    - [x] 4.3.b Run all backend linting checks
        - Ruff: backend/apps/, backend/config/
    - [x] 4.3.c Run Python type checking
        - Pyright: backend/apps/, backend/config/ (0 errors, 0 warnings; infos only)

- [x] **4.4 UserMovieData Service Consistency Audit**

    **Goal:** Remove duplication in user movie query logic, ensure consistent enrichment,
    and clarify pagination metadata semantics on TMDB misses.

    - [x] 4.4.a Refactor query methods to share batch + enrichment pipeline
        - Reused `fetch_movies_batch` + `MovieEnrichmentService` for list methods
        - Eliminated per-item TMDB calls in service layer query path
        - Preserved queryset ordering after batch fetch

    - [x] 4.4.b Align pagination metadata semantics
        - Paginated method: keep metadata from DB count, note TMDB skips
        - Non-paginated method: total_results reflects returned items

    - [x] 4.4.c Update tests for metadata behavior on TMDB misses
        - Added unit assertions for DB-count vs returned-count metadata

    - [x] 4.4.d Run incremental quality checks (user_movie_data app)
        - Ruff: backend/apps/user_movie_data
        - pytest apps/user_movie_data/tests/unit/test_user_movie_data_service.py (24 passed)

- [x] **4.5 Address Minor Phase 3 Issues Found During Review**

    **Goal:** Resolve small consistency gaps discovered in movie service layer audit.

    - [x] 4.5.a Guard MovieService.search_movies against empty queries
        - Returns empty MovieListResponseSchema for short/blank queries
        - Added unit coverage to avoid TMDB calls on invalid input

    - [x] 4.5.b Add backend year_min/year_max for decade filters
        - Ensure second-pass year filtering runs for decade-based queries
        - Added schema transformer coverage for decade mapping

    - [x] 4.5.c Make schema-to-TMDB conversion explicit about extra fields
        - Excluded user_movie_data during schema-to-TMDB conversion

    - [x] 4.5.d Run incremental quality checks (movie service layer)
        - Ruff: backend/apps/movie
        - pytest apps/movie/tests/unit/test_schemas.py apps/movie/tests/unit/services/test_movie_service.py (25 passed)

---

### **Phase 5:** Create AuthenticationService

- [x] **5.1 Create AuthenticationService Class**

    **Goal:** Encapsulate all business logic related to user authentication, registration, token management,
    email verification, and profile management (?) in a dedicated service layer.

    - [x] 5.1.a Write tests for AuthenticationService methods (test-first)
        - Added unit tests for registration, login/logout, refresh + hybrid refresh, email verification/resend, and profile
        - Mocked allauth email primitives + token utilities, kept auth logging assertions in place
        - Split tests by concern under `backend/apps/authentication/tests/unit/`
        - **Test status:** Failing (ModuleNotFoundError) until AuthenticationService is implemented in 5.1.b

    - [x] 5.1.b Create `AuthenticationService` class in `backend/apps/authentication/services/authentication_service.py`
        - Extracted auth business logic from API routes into service methods
        - Implemented registration/login/logout, refresh + hybrid refresh, email verification/resend, profile ops
        - Added DI seams for allauth primitives, token utilities, logging, and helpers
        - Preserved existing behavior and logging semantics
        - **Note**: This is backend service; frontend auth service already exists
        - **Note**: OAuth logout remains handled by allauth session endpoint (out of scope)

    - [x] 5.1.c Create service factory function
        - Implemented `get_authentication_service()` returning default AuthenticationService

    - [x] 5.1.d Run tests and incremental quality checks (authentication service/tests)
        - docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/authentication/tests/unit/ (26 passed)

- [x] **5.2 Update Authentication API Endpoints to Use Service Layer**

    - [x] 5.2.a Refactor Authentication API endpoints in `backend/apps/authentication/api.py`
        - Replaced inline logic with `AuthenticationService` calls via factory
        - API layer now focused on HTTP concerns (auth, throttling, response shaping)
        - Maintained existing endpoint contracts and response schemas

    - [x] 5.2.b Run API integration tests (verify all 9 endpoints work, security features unchanged)
        - docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/authentication/tests/integration/
        (132 passed)

    - [x] 5.2.c Run incremental quality checks (authentication app)
        - .venv-backend/bin/ruff check backend/apps/authentication

- [x] **5.3 Phase 5 Quality Gate**
    - [x] 5.3.a Run full backend test suite
        - docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/ (667 passed)
    - [x] 5.3.b Run all backend linting checks
        - .venv-backend/bin/ruff check backend/apps/ backend/config/ --fix
    - [x] 5.3.c Run Python type checking
        - npx pyright backend/apps/ backend/config/ --project backend (0 errors, 46 informations)

---

### **Phase 6:** Integration Testing & Documentation

- [x] **6.1 Verify Email Service Patterns**

    - [x] 6.1.a Review `ZeptomailService` in `backend/apps/core/services/email_service.py`
        - **Class-based**: ✓ Yes, proper class structure
        - **Config injection**: Reads from Django settings via `getattr()` in constructor (appropriate for email config)
        - **DI pattern variation**: Uses lazy singleton + proxy pattern (different from fresh-instance factories)
        - **Testing seam**: `dev_mode` flag enables testing without constructor injection
        - **No refactoring needed**: Pattern is valid for stateless email service with settings-based config

    - [x] 6.1.b Verify email service factory exists
        - ✓ `get_email_service()` at lines 116-129, lazy singleton with `_email_service_instance`
        - ✓ Follows established factory pattern (docstring, clear usage example)

    - [x] 6.1.c Verify allauth email adapter wiring
        - ✓ `CustomAccountAdapter` properly overrides `send_mail()` to use ZeptoMail API
        - ✓ `get_email_confirmation_url()` returns frontend URL for verification links
        - ✓ AuthenticationService has DI seams for EmailAddress, EmailConfirmation, EmailConfirmationHMAC
        - ✓ Injection defaults to actual allauth models, enabling mock injection for tests

    - [x] 6.1.d Code quality audit of email service and adapters
        - ✓ Type checking: 0 errors (both files)
        - ✓ Linting: All checks passed
        - **Finding 1 - Dead code**: `ZeptomailService.send_welcome_email()` never called; `welcome.html` unused
        - **Finding 2 - DRY violation**: `CustomAccountAdapter` duplicates ZeptoMail API code
        - **Finding 3 - Type safety**: `context: dict[str, Any]` acceptable (allauth external API)
        - **Discovery**: Official `django-zoho-zeptomail` package provides Django email backend
        - **Decision**: Refactor to use official package, remove custom API code, wire welcome email

- [ ] **6.2 Email Infrastructure Refactor (django-zoho-zeptomail)**

    - [x] 6.2.a Install and configure django-zoho-zeptomail
        - ✓ Added `django-zoho-zeptomail >= 0.0.3` to `backend/requirements/req.txt`
        - ✓ Configured `EMAIL_BACKEND` to use `ZohoZeptoMailEmailBackend`
        - ✓ Added `ZOHO_ZEPTOMAIL_API_KEY_TOKEN` (reuses existing env var)
        - ✓ Added `ZOHO_ZEPTOMAIL_HOSTED_REGION` setting (optional, for non-US)
        - ✓ `DEFAULT_FROM_EMAIL` uses existing `ZEPTOMAIL_SENDER_EMAIL`
        - ✓ Test mode uses `django.core.mail.backends.locmem.EmailBackend`
        - ✓ Removed old MockEmailService hack from settings_test.py
        - ✓ Docker container rebuilt with new dependency

    - [x] 6.2.b Write tests for email verification flow (TDD - test-first)
        - ✓ Created `test_email_backend.py` with 7 tests
        - ✓ Tests verify emails captured in `django.core.mail.outbox`
        - ✓ 5 pass, 2 fail (RED phase) - awaiting 6.2.c to fix adapter
        - Tests: backend config, outbox empty, resend sends email, verification link in body,
          no email for nonexistent user, no email for already verified, no email on verify success

    - [x] 6.2.c Simplify CustomAccountAdapter
        - ✓ Removed `send_mail()` override (~150 lines of custom ZeptoMail API code)
        - ✓ Removed `_get_headers()` method
        - ✓ Removed `__init__` with config duplication (`api_key`, `base_url`, `dev_mode`)
        - ✓ Kept only `get_email_confirmation_url()` for frontend URLs
        - ✓ Updated docstring to reflect simplified purpose
        - ✓ Adapter reduced from 237 lines to 51 lines (~80% reduction)
        - ✓ All 7 email backend tests now pass (TDD GREEN phase)
        - ✓ All 165 authentication tests pass (no regressions)

    - [x] 6.2.d Write tests for welcome email feature (TDD - test-first)
        - ✓ `test_email_verification_success_sends_welcome_email` - verifies email sent
        - ✓ `test_welcome_email_contains_username` - verifies personalization
        - ✓ `test_welcome_email_contains_frontend_link` - verifies CTA link
        - ✓ 3 tests fail (RED phase) - awaiting 6.2.e implementation

    - [ ] 6.2.e Create welcome email utility and wire to verification
        - Create `send_welcome_email(user)` function using Django's `send_mail()`
        - Use existing `welcome.html` template
        - Call from `AuthenticationService.verify_email()` on success
        - Add appropriate logging

    - [ ] 6.2.f Remove deprecated email code
        - Delete `ZeptomailService` class from `email_service.py`
        - Delete `get_email_service()` factory function
        - Delete `_EmailServiceProxy` class and `email_service` proxy
        - Delete `email_service.pyi` stub file
        - Update any imports if needed

    - [ ] 6.2.g Run incremental quality checks
        - Type check modified files
        - Lint modified files
        - Run authentication test suite

- [ ] **6.3 Run Comprehensive Integration Tests**

    - [ ] 6.3.a Run full UserMovieData integration test suite (all 5 endpoints after service extraction)
    - [ ] 6.3.b Run full Authentication integration test suite (all 9 endpoints after service extraction)
    - [ ] 6.3.c Run full Movie integration test suite (all endpoints after MovieService refactoring)

- [ ] **6.4 Update TECHNICAL-OVERVIEW.md**

    - [ ] 6.4.a Add service layer architecture patterns section
        - Document class-based service pattern with DI
        - Provide decision guide: "When to use class-based vs function-based"
        - Document pagination helper usage guidelines
        - Document batch operation patterns
        - Document dependency injection patterns and best practices

    - [ ] 6.4.b Add reference implementations section
        - Link to MovieService (TMDB integration)
        - Link to UserMovieDataService (CRUD with pagination)
        - Link to AuthenticationService (security-critical operations)
        - Link to MovieEnrichmentService (composition pattern)
        - Document email approach (Django backend with django-zoho-zeptomail)

    - [ ] 6.4.c Add architectural guidelines
        - Guideline: "Business logic belongs in service layer, NOT API endpoints"
        - Guideline: "Use factory functions for service instantiation"
        - Guideline: "Use dependency injection for testability"
        - Security note: "Authentication service handles security-critical operations"

    - [ ] 6.4.d Run markdown linting on TECHNICAL-OVERVIEW.md

- [ ] **6.5 Final Quality Gate (All Gates)**

    - [ ] 6.5.a Run full backend test suite with coverage
    - [ ] 6.5.b Address any coverage gaps (target: 80% general, 90%+ critical paths)
    - [ ] 6.5.c Run all backend linting checks
    - [ ] 6.5.d Run Python type checking (comprehensive)
    - [ ] 6.5.e Run frontend tests (ensure no regressions)
    - [ ] 6.5.f Run frontend linting
    - [ ] 6.5.g Run frontend type checking
    - [ ] 6.5.h Run markdown linting on all documentation

- [ ] **6.6 Final Pre-Archival and PR Documentation Pass**

    - [ ] 6.6.a Generate completion metadata
        - Document all completed work across 6 phases
        - List success metrics achieved
        - Provide quality gate results summary

    - [ ] 6.6.b Check if PROJECT-STATUS.md needs updates
        - Update Service Layer Modernization status to "Complete"
        - Update next priorities if needed
        - Update timestamp

---

## Success Criteria

- [ ] Zero business logic in API endpoints (all extracted to services)
- [ ] 100% service layer adoption across domains:
    - [x] `MovieService` (class-based, TMDB integration)
    - [x] `KeywordService` (class-based, extracted from movie)
    - [x] `PeopleService` (class-based, extracted from movie)
    - [x] `MovieEnrichmentService` (repository pattern, proper DI)
    - [ ] `UserMovieDataService` (repository pattern, CRUD with pagination)
    - [ ] `AuthenticationService` (service injection, security-critical)
    - [ ] Email infrastructure (django-zoho-zeptomail backend, welcome email wired)
- [ ] Repository pattern implemented for ORM abstraction:
    - [x] `UserMovieDataRepository` exists with `get_for_user_and_movies()`
    - [ ] `UserMovieDataRepository` extended with CRUD methods
    - [ ] Unit tests mock repository, not ORM directly
- [x] TMDB result filtering migrated from frontend to service layer
- [x] Frontend filtering code removed (`useEnhancedFetcher`, `movieFilterUtils`)
- [ ] All API endpoints use service layer (thin wrapper pattern)
- [ ] TECHNICAL-OVERVIEW.md updated with service architecture documentation
- [ ] All quality gates pass:
    - [ ] Backend tests pass (target: 80% general, 90%+ critical paths)
    - [ ] Backend linting: 0 violations (Ruff)
    - [ ] Backend type checking: 0 errors (Pyright)
    - [ ] Frontend tests pass
    - [ ] Frontend linting: 0 violations (ESLint)
    - [ ] Frontend type checking: 0 errors (TypeScript)
- [ ] Ready for archival
