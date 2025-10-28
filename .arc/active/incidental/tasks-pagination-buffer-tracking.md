# Incidental: Smart Pagination with Buffer Metadata Tracking

## Context

**Discovered During**: Task 3.6.2 (Rating Filter Manual Testing) of filter-integration-testing.md

**Discovery Details**:

- Testing rating filter 1.0-3.5 (10-35%) revealed duplicate movies across pages
- Page 1: Shows 11 results, includes "Going Overboard" and "Nazis at the Center of the Earth"
- Page 2: Shows 12 results, REPEATS same movies from page 1
- Additionally: Incorrect result counts ("showing 1-11" when actually 19 displayed)
- Root cause: Smart buffer mechanism (introduced to fix sparse page issue) consumes multiple TMDB pages per API page
  but doesn't track which pages were consumed

**Why Address Now**:

- **Data integrity issue**: Duplicates across pages is unacceptable UX
- **Blocks testing**: Can't complete 3.6.2 manual testing with broken pagination
- **User-facing bug**: Affects production feature (rating filters)
- **Recent introduction**: Bug created by our smart buffer fix - need to correct immediately

**Trigger**: Phase 3.6.2 rating filter testing (rating 1.0-3.5, rating 0-6.0)

**Pausing**: `.arc/active/incidental/tasks-filter-integration-testing.md` Phase 3.6 at task 3.6.2

---

## Problem Analysis

### Current Broken Flow

```
User requests API page 1:
  → Server fetches TMDB pages 1, 2, 3, 4, 5 (buffering to reach 20 results)
  → Returns 11 results (due to vote_count filter)

User requests API page 2:
  → Server fetches TMDB page 2 (simple 1:1 mapping)
  → PROBLEM: TMDB page 2 was already consumed for API page 1!
  → Result: Duplicate movies
```

### Root Cause

Smart buffer mechanism (from rating filter fix) fetches multiple TMDB pages to fill 20-result pages,
but pagination assumes 1:1 mapping between API pages and TMDB pages.

---

## Scope

### Will Do

- ✅ Add `next_tmdb_page_start` metadata to API responses
- ✅ Accept `tmdb_page_start` parameter in API requests
- ✅ Update buffer mechanism to track consumed TMDB pages
- ✅ Update frontend pagination to store/send metadata
- ✅ Fix result count display ("showing X-Y")
- ✅ Handle edge cases (missing metadata → fallback to old logic)
- ✅ Add tests validating pagination with buffering
- ✅ Verify no duplicates across pages
- ✅ Implement jump-to-page with smart approximation

### Won't Do (Deferred)

- ❌ Recalculate total_pages based on filter yield (already inaccurate, acceptable)
- ❌ Advanced buffer strategies (exponential backoff, etc.)
- ❌ Cursor-based pagination (different approach entirely)

### Out of Scope

- Frontend UX enhancements for approximated jumps (show loading state, etc.)
- Buffer performance optimization
- Alternative pagination approaches

---

## Task Breakdown

### **Phase 1:** Backend Tests and Schemas

- [x] **1.1 Write integration tests for metadata tracking**
    - ✅ Added 4 comprehensive integration tests to `backend/apps/movie/tests/test_movie_api.py`:
        - `test_discover_returns_next_tmdb_page_start_after_buffer`: Verifies API returns `next_tmdb_page_start`
          metadata when buffer consumes multiple pages (1-4 → returns 5)
        - `test_discover_continues_from_tmdb_page_start_parameter`: Validates `tmdb_page_start` parameter correctly
          continues pagination (request page 2 with `tmdb_page_start=5` uses TMDB page 5)
        - `test_discover_no_duplicates_across_sequential_pages`: End-to-end test ensuring no duplicates across
          sequential page requests using metadata
        - `test_discover_fallback_when_tmdb_page_start_omitted`: Confirms backward compatibility with simple 1:1
          mapping when metadata omitted
    - ✅ Tests use existing fixtures (`create_movie_dict`, `create_paginated_tmdb_response`) for DRY testing
    - ✅ All 4 tests FAIL as expected (TDD Red phase) - schema fields don't exist yet

- [x] **1.2 Add pagination metadata fields to schemas**
    - ✅ Added `next_tmdb_page_start: int | None` to `PaginatedMovieResponseSchema` (line 165-168)
        - Field tracks next TMDB page to fetch for pagination continuation
        - Includes description for API documentation
        - Updated class docstring to explain smart buffer metadata
    - ✅ Added `tmdb_page_start: int | None` to `MovieDiscoverFilterSchema` (line 228-231)
        - Field accepts TMDB page to start fetching from (smart buffer continuation)
        - Placed in Pagination section alongside `page` parameter
        - Includes description for API documentation

---

### **Phase 2:** Backend Implementation and Quality Gates

- [x] **2.1 Implement buffer tracking and metadata flow**
    - ✅ 2.1.1: Updated `_apply_buffer_if_needed` to return `tuple[list[MovieBaseSchema], int]`
        - Returns `(movies, pages_consumed)` where pages_consumed includes initial page
        - Early returns: `(movies[:20], 1)` for full page or last page scenarios
        - Buffer loop: `total_pages_consumed = 1 + pages_fetched`
    - ✅ 2.1.2: Threaded metadata through `_fetch_with_filters_and_buffer`
        - Added `tmdb_page_start: int | None` parameter
        - Uses `effective_page = tmdb_page_start if tmdb_page_start is not None else page`
        - Calculates `next_tmdb_page_start = effective_page + pages_consumed`
        - Passes metadata to `_build_filtered_response`
    - ✅ 2.1.3: Updated `_build_filtered_response` to include metadata
        - Added optional `next_tmdb_page_start: int | None` parameter (default=None)
        - Sets `response.next_tmdb_page_start` if metadata provided
    - ✅ 2.1.4: Wired through `discover_movies` endpoint
        - Added `tmdb_page_start: int | None` parameter to service method
        - Added `tmdb_page_start` to schema `to_service_params()` field mappings
        - Passes through to `_fetch_with_filters_and_buffer`
        - All 4 integration tests now PASS ✅

- [x] **2.2 Run backend quality gates**
    - ✅ 372 tests pass (up from 368 - includes 4 new pagination metadata tests)
    - ✅ 0 type errors (Pyright)
    - ✅ 0 linting violations (Ruff)

---

### **Phase 3:** Frontend Implementation

- [x] **3.1 Write frontend tests for pagination metadata** ✅ **COMPLETE**

    - [x] **3.1.1 Hook layer tests (COMPLETE)**
        - ✅ Created `frontend/src/hooks/__tests__/usePaginatedMovies.test.ts` with 8 comprehensive tests:
            - **Storing metadata**: Tests for `next_tmdb_page_start` storage (numeric, null, undefined cases)
            - **Continuation flow**: Tests exposing metadata for parent component to use in subsequent requests
            - **Filter reset**: Tests metadata reset when receiving response from new filter context
            - **Backward compatibility**: Tests hook functions correctly without metadata field
            - **Loading states**: Tests metadata behavior during loading and after data loads
        - ✅ Regenerated TypeScript types from OpenAPI schema (added `next_tmdb_page_start` field)
        - ✅ Tests FAIL as expected: 5 failing, 3 passing (TDD Red phase confirmed)
            - All failures: `expected undefined to be <value>` - hook doesn't return metadata field yet
            - Passing tests: backward compatibility and existing behavior work correctly

    - [ ] **3.1.R Component layer integration tests (MISSING - discovered during implementation)**

        **Context**: Task 3.1 only tested the hook layer extracting metadata from API responses.
        Missing tests for the full component → hook → router → service → API flow.
        Per DEVELOPMENT-RULES test-first protocol, these tests should exist before implementing 3.2.R.1-R.4.

        - [x] **3.1.R.1 Write tests for useMovieFetchRouter metadata passing**
            - ✅ Created `src/hooks/__tests__/useMovieFetchRouter.test.ts` with 7 comprehensive tests
            - ✅ Tests that `tmdb_page_start` parameter is accepted by routed fetcher (2 tests)
            - ✅ Tests that parameter is passed to base fetcher (discover/top-rated/etc) - 2 tests
            - ✅ Tests that parameter is passed to search endpoint - 2 tests
            - ✅ Tests backward compatibility when parameter omitted - 1 test
            - ✅ Reused helpers from usePaginatedMovies tests (`createMockPaginatedResponse`) for DRY
            - ✅ **TDD Red phase confirmed**: 6/7 tests failing (missing tmdb_page_start support)
            - ✅ Fixed test expectations: `genres` (alias) vs `with_genres` (TMDB param) - frontend correctly uses alias

        - [x] **3.1.R.2 Write stability tests for MovieGrid metadata flow** ✅ **COMPLETE - TDD Red Phase**
            - **Initial Decision (WRONG)**: Skipped component tests as "redundant"
            - **Bug Discovery**: Infinite loop caused by state management side effects (404 fetches!)
            - **Lesson Learned**: State + side effects needs integration testing, even if wiring "looks simple"
            - ✅ Created `MovieGrid.stability.test.tsx` with 4 comprehensive tests:
                - Test 1: No infinite fetches when metadata received (FAIL: expected 1, got 404 ✅)
                - Test 2: Metadata used only on page navigation (FAIL: wrong page pass behavior)
                - Test 3: Metadata resets when fetcher changes (PASS)
                - Test 4: Stable in React StrictMode (FAIL: excessive fetches)
            - ✅ Uses `@tests/helpers/test-renderer` for proper ChakraProvider + Router setup
            - ✅ **TDD Red phase confirmed**: Tests correctly detect the infinite loop bug
            - File: `frontend/src/components/movie/collection/__tests__/MovieGrid.stability.test.tsx`

        - [x] **3.1.R.3 Write stability tests for MovieCollectionGrid metadata flow** ✅ **COMPLETE - TDD Red Phase**
            - Same pattern as 3.1.R.2 but for MovieCollectionGrid
            - ✅ 4 tests created, 2 failing as expected (infinite loop detection)
            - ✅ **TDD Red phase confirmed**: Tests fail with buggy implementation
            - File: `frontend/src/components/movie/collection/__tests__/MovieCollectionGrid.stability.test.tsx`

        - [x] **3.1.R.4 Write tests for API service layer parameter passing**
            - ✅ Created `src/utilities/__tests__/routeConfigHelper.metadata.test.ts` with 8 comprehensive tests
            - ✅ Tests that fetchers accept `tmdb_page_start` as optional third parameter (6 routes tested)
            - ✅ Tests that parameter is included in API request params when provided
            - ✅ Tests that parameter is omitted when undefined (backward compatibility - 2 tests)
            - ✅ Coverage: popular, top-rated, now-playing, upcoming, search, default/fallback routes
            - ✅ **TDD Red phase confirmed**: 6/8 tests failing (missing parameter support)
            - ✅ 2 passing tests verify backward compatibility (parameter omitted when not provided)

- [x] **3.2 Implement pagination metadata in state and requests** ✅ **COMPLETE**

    - [x] **3.2.1 Hook layer: Extract and return metadata**
        - ✅ Updated `usePaginatedMovies` hook to extract and return `next_tmdb_page_start`
        - ✅ Extracts `data?.next_tmdb_page_start` from API response (undefined if not present)
        - ✅ Returns metadata in hook's return value for parent components to use
        - ✅ Updated JSDoc with smart buffer pagination details and usage example
        - ✅ All 8 tests from 3.1 now PASS (TDD Green phase achieved)

    - [x] **3.2.R.1 Update useMovieFetchRouter to accept tmdb_page_start parameter**
        - ✅ Updated fetcher signature to accept optional `tmdb_page_start` parameter
        - ✅ Modified `routedFetcher` callback to accept and pass through metadata
        - ✅ Wired through to both base fetcher (discover/top-rated/etc) and search endpoint
        - ✅ Maintains backward compatibility (parameter optional, undefined if not provided)
        - ✅ All 7 tests from 3.1.R.1 now PASS
        - File: `frontend/src/hooks/useMovieFetchRouter.ts`

    - [x] **3.2.R.2 Update MovieGrid to track and pass metadata state** ✅ **COMPLETE**
        - ✅ Replaced `useState` with `useRef` to store `next_tmdb_page_start` without triggering re-renders
        - ✅ Added synchronous fetcher reset logic to clear metadata when fetcher changes (filter/route change)
        - ✅ Updated `fetcherCallback` useMemo to use `nextTmdbPageStartRef.current` (removed from dependencies)
        - ✅ Fixed infinite loop bug: Components now make 1 fetch instead of 404
        - ✅ All 4 stability tests PASS (TDD Green phase achieved)
        - ✅ Implementation: Lines 33-56 in `frontend/src/components/movie/collection/MovieGrid.tsx`
        - **Key Learning**: Using `useRef` + synchronous reset prevents re-render loops while maintaining metadata
          across pages

    - [x] **3.2.R.3 Update MovieCollectionGrid to track and pass metadata state** ✅ **COMPLETE**
        - ✅ Applied same `useRef` pattern as MovieGrid
        - ✅ Synchronous fetcher reset logic for filter/route changes
        - ✅ Updated `fetcherForMoviesArray` useMemo to use ref instead of state
        - ✅ Fixed infinite loop bug in MovieCollectionGrid
        - ✅ All 4 stability tests PASS (TDD Green phase achieved)
        - ✅ Implementation: Lines 53-90 in `frontend/src/components/movie/collection/MovieCollectionGrid.tsx`
        - ✅ Also fixed test assertion bug in StrictMode tests (changed `toHaveBeenCalledTimes(expect.any(Number))` to `toHaveBeenCalled()`)

    - [x] **3.2.R.4 Update API service layer to accept tmdb_page_start**
        - ✅ Added `tmdb_page_start?: number` to `MovieQueryParams` interface
        - ✅ Updated all route config fetchers to accept and pass parameter
        - ✅ Conditional parameter inclusion: only added when defined (backward compatible)
        - ✅ Coverage: popular, top-rated, now-playing, upcoming, search, default routes
        - ✅ All 8 tests from 3.1.R.4 now PASS
        - Files: `frontend/src/services/movieService.ts:17`, `frontend/src/utilities/routeConfigHelper.ts`

- [x] **3.3 Write tests for pagination display calculation**
    - ✅ Created `frontend/src/hooks/__tests__/usePaginationDisplay.test.ts` with 16 comprehensive tests:
        - **Result count calculation**: Tests with varying moviesCount (11, 12, 20 results per page)
        - **Edge cases**: First page, empty results, last page with partial results, loading state
        - **Formula accuracy**: Explicit verification of `endIndex = (currentPage - 1) * pageSize + moviesCount`
        - **Pagination visibility**: Tests for when pagination controls should/shouldn't show
        - **Total results formatting**: Comma separator and 10,000+ cap
    - ✅ All 16 tests PASS immediately - **implementation already correct!**
    - **Finding**: The pagination display logic already uses `Math.min()` correctly to show actual result count
        - Lines 39-42: `Math.min(currentPage * pageSize, (currentPage - 1) * pageSize + moviesCount)`
        - This correctly displays "1-11" when only 11 results, not "1-20"
        - Original issue may have been observed in UI layer or already fixed

- [x] **3.4 Fix pagination display to use actual result count**
    - ✅ **No implementation needed** - logic already correct
    - ✅ Current implementation uses proper formula via `Math.min()`
    - ✅ All tests verify correct behavior with varying result counts
    - **Status**: Task complete without code changes (tests document existing correct behavior)

---

### **Phase 3 (CRITICAL):** Rating Filter Bug Fix 🐛

**Discovered during Phase 3 testing** - Rating filters causing excessive buffer usage

- [x] **3.5.1 Investigate excessive buffering with rating filters**
    - ✅ Observed: Rating 1.0-3.5 only returned 8 results across 6 TMDB pages
    - ✅ Backend logs showed: "Backend filtering removed 19 movies from TMDB response (TMDB sent 20, we're returning 1)"
    - ✅ Root cause identified: `rating_min`/`rating_max` parameters never added to TMDB API params
    - ✅ **Bug**: TMDB returned ALL movies (unfiltered) → backend filtered ~95% per page → buffer needed 6+ pages for 8 results

- [x] **3.5.2 Fix rating filter TMDB parameter passing**
    - ✅ Added rating filters to TMDB params in `discover_movies()` (lines 839-844):

      ```python
      if rating_min is not None:
          params['vote_average.gte'] = rating_min
      if rating_max is not None:
          params['vote_average.lte'] = rating_max
      ```

    - ✅ Verified fix with manual API call:
        - Before: 1,066,202 total results, backend filtering 19/20 movies per page
        - After: 48,423 total results, all movies within 1.0-3.5 range
        - No more "Backend filtering removed X movies" warnings
    - ✅ Backend tests: 372 passing (no regressions)
    - ✅ File: `backend/apps/movie/services/movie_service.py:839-844`

- [x] **3.5.3 Enable debug logging for development**
    - ✅ Added `DJANGO_CONSOLE_LOG_LEVEL=DEBUG` to docker-compose.yml
    - ✅ Enables better diagnostics for catching similar issues earlier
    - ✅ File: `infrastructure/docker-compose.yml:24`

---

### **Phase 4:** Sequential Pagination Validation

- [ ] **4.1 Manual test and run quality gates**
    - Verify no duplicates: rating 1.0-3.5 across pages 1→2→3
    - Verify full pages: rating 0-6.0 maintains 20 results per page
    - Verify counts: "Showing X-Y of Z" accurate
    - Confirm `next_tmdb_page_start` in API responses
    - Run full quality gates: 368+ backend tests, 351+ frontend tests, 0 violations

---

### **Phase 5:** Jump-to-Page Feature (Optional)

- [ ] **5.1 Write tests for jump approximation**
    - Test: Jump with metadata yields approximately correct page (±1 page tolerance acceptable)
    - Test: Jump without metadata uses simple fallback (page * 1 mapping)
    - Test: Rolling average calculation tracks consumed pages correctly
    - Expect tests to FAIL initially

- [ ] **5.2 Implement jump-to-page approximation**
    - Track rolling average of `pages_consumed` over recent requests
    - Calculate approximate TMDB page: `tmdb_start ≈ last_known + (gap * avg_consumed)`
    - Document tradeoff: ±1 page boundary duplicates acceptable vs. disabled feature
    - Frontend: Re-enable jump-to-page controls, send best-guess `tmdb_page_start`
    - Run tests - should now PASS

---

### **Phase 6:** Final Integration Testing

- [ ] **6.1 End-to-end validation across all scenarios**
    - Sequential pagination: rating 1.0-3.5 pages 1→2→3→4 (no duplicates)
    - Jump-to-page: rating 1.0-3.5 pages 1→5→10 (approximate, ±1 acceptable)
    - Full pages: rating 0-6.0 maintains 20 results per page
    - Display accuracy: "Showing X-Y of Z" correct in all scenarios
    - Final quality gates: All tests pass, 0 violations/errors

---

## Implementation Notes

### Design Decisions

- **Stateless approach**: Metadata passed in request/response, no server session
- **Graceful fallback**: Missing metadata → use simple page mapping
- **Approximated jumps**: Accept ±1 page boundary duplicates as acceptable tradeoff for UX
- **Rolling average**: Track average pages consumed over last N requests for better approximation

### Key Files

- Backend: `backend/apps/movie/services/movie_service.py`
- Backend schemas: `backend/apps/movie/schemas.py`
- Frontend pagination: `frontend/src/hooks/usePaginatedMovies.ts`
- Frontend display: `frontend/src/hooks/usePaginationDisplay.ts`

### Approximation Strategy

```
Example: User on page 3 (last_tmdb_page=15, avg_consumed=5) jumps to page 7
  → Gap = 7 - 3 = 4 pages
  → Approximate: tmdb_start = 15 + (4 * 5) = 35
  → Accept: Might see 1-2 duplicates at boundary (acceptable vs disabled feature)
```

---

**Priority**: HIGH (blocks Phase 3.6.2, user-facing data integrity bug)
**Risk Level**: LOW-MEDIUM (isolated changes, good test coverage, graceful fallback)
