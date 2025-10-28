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

### Phase 1: Backend Schema Updates (30 min)

**1.1** Update PaginatedMovieResponseSchema with pagination metadata ⏱️ 10 min

- [ ] Add `next_tmdb_page_start` field to response schema
    - Add optional `next_tmdb_page_start: int | None` field
    - Update docstring explaining metadata tracks consumed TMDB pages
    - Run type checking to verify

**1.2** Update MovieDiscoverFilterSchema to accept pagination metadata ⏱️ 10 min

- [ ] Add `tmdb_page_start` parameter to filter schema
    - Add optional `tmdb_page_start: int | None` field
    - Update docstring explaining client sends last known TMDB page
    - Run type checking to verify

**1.3** Add unit tests for schema pagination metadata ⏱️ 10 min

- [ ] Create tests validating metadata serialization
    - Test response schema includes `next_tmdb_page_start`
    - Test request schema accepts `tmdb_page_start` parameter
    - Verify all schema tests pass

---

### Phase 2: Backend Buffer Logic Updates (60 min)

**2.1** Update `_apply_buffer_if_needed` to track consumed pages ⏱️ 20 min

- [ ] Modify buffer function to return consumed page count
    - Change return type to tuple: `(movies, pages_consumed)`
    - Track `pages_fetched` counter in while loop
    - Return `(combined_movies[:20], pages_fetched + 1)` (includes current page)
    - Update all callers (`_fetch_with_filters_and_buffer`) to handle tuple

**2.2** Update `_fetch_with_filters_and_buffer` to use metadata ⏱️ 15 min

- [ ] Thread `tmdb_page_start` parameter through fetch function
    - Accept `tmdb_page_start` parameter (defaults to None)
    - If provided, use as `current_page`; otherwise use `page` from request
    - Calculate `next_tmdb_page_start = current_page + pages_consumed`
    - Pass to `_build_filtered_response`

**2.3** Update `_build_filtered_response` with metadata field ⏱️ 10 min

- [ ] Add pagination metadata to response builder
    - Add `next_tmdb_page_start: int | None` parameter
    - Include in PaginatedMovieResponseSchema instantiation
    - Update docstring explaining metadata purpose

**2.4** Wire metadata through discover_movies endpoint ⏱️ 15 min

- [ ] Connect filter schema to service layer metadata
    - Extract `tmdb_page_start` from MovieDiscoverFilterSchema
    - Pass to `_fetch_with_filters_and_buffer`
    - Verify metadata flows from request → response
    - Manual test with curl to confirm metadata present

---

### Phase 3: Backend Tests (40 min)

**3.1** Add integration test for metadata tracking ⏱️ 20 min

- [ ] Create test validating metadata flows through pagination
    - Test: Buffer consumes pages 1-4, returns `next_tmdb_page_start=5`
    - Test: Second request with `tmdb_page_start=5` starts from page 5
    - Test: No duplicate movies across sequential page requests
    - Verify all pagination tests pass

**3.2** Add test for metadata fallback behavior ⏱️ 10 min

- [ ] Create tests for graceful degradation without metadata
    - Test: Request without `tmdb_page_start` uses old 1:1 mapping
    - Test: Missing metadata doesn't break pagination
    - Verify fallback tests pass

**3.3** Run full backend quality gates ⏱️ 10 min

- [ ] Verify all backend tests and quality checks pass
    - 368+ backend tests pass
    - 0 type errors (pyright)
    - 0 linting violations (ruff)

---

### Phase 4: Frontend State Management (45 min)

**4.1** Update usePaginatedMovies to track metadata ⏱️ 15 min

- [ ] Add pagination metadata to state management
    - Add `nextTmdbPageStart` to pagination state
    - Store value from API `next_tmdb_page_start` response field
    - Reset metadata when filters change (new search)

**4.2** Update API requests to send metadata ⏱️ 15 min

- [ ] Include pagination metadata in discover/search requests
    - Add `tmdb_page_start` parameter to request payload
    - Send previous response's `next_tmdb_page_start` value
    - Handle undefined/null gracefully (omit parameter if missing)

**4.3** Fix pagination display to use actual result count ⏱️ 15 min

- [ ] Update usePaginationDisplay to show accurate counts
    - Use actual `moviesCount` instead of assuming 20 per page
    - Fix calculation: `endIndex = (currentPage - 1) * 20 + moviesCount`
    - Test displays "Showing 1-11" correctly when 11 results returned

---

### Phase 5: Sequential Pagination Testing (30 min)

**5.1** Manual test sequential pagination with metadata ⏱️ 15 min

- [ ] Verify metadata fixes duplicate/count issues
    - Test rating 1.0-3.5: No duplicates across pages 1→2→3
    - Test rating 0-6.0: Full 20 results per page maintained
    - Verify accurate counts: "Showing X-Y of Z"
    - Confirm `next_tmdb_page_start` present in API responses

**5.2** Run full quality gates after sequential pagination ⏱️ 15 min

- [ ] Verify all tests pass with metadata implementation
    - 368+ backend tests pass
    - 351+ frontend tests pass
    - 0 linting violations
    - 0 type errors

---

### Phase 6: Jump-to-Page Approximation (45 min)

**6.1** Implement TMDB page approximation for jumps ⏱️ 20 min

- [ ] Add jump-to-page logic with smart approximation
    - Track rolling average of `pages_consumed` per request
    - Calculate approximate TMDB page for jumps: `tmdb_start ≈ last_known + (gap * avg_consumed)`
    - Accept ±1 page boundary duplicates as acceptable tradeoff
    - Add docstring explaining approximation strategy and tradeoffs

**6.2** Enable jump-to-page controls in frontend ⏱️ 15 min

- [ ] Update pagination UI to support approximate jumps
    - Re-enable jump-to-page controls for filtered results
    - Send best-guess `tmdb_page_start` based on available metadata
    - Fallback to simple mapping if metadata unavailable
    - Test jumps: page 1→5, page 1→10

**6.3** Add tests for approximation accuracy ⏱️ 10 min

- [ ] Create tests validating jump approximation
    - Test: Jump with metadata yields ~correct page (±1 tolerance)
    - Test: Jump without metadata uses fallback gracefully
    - Verify approximation tests pass

---

### Phase 7: Final Integration Testing (20 min)

**7.1** End-to-end validation of pagination with all features ⏱️ 15 min

- [ ] Comprehensive pagination testing across scenarios
    - Sequential: rating 1.0-3.5 pages 1→2→3→4 (no duplicates)
    - Jumps: rating 1.0-3.5 pages 1→5→10 (approximate, acceptable ±1)
    - Full pages: rating 0-6.0 maintains 20 results per page
    - Counts: "Showing X-Y of Z" accurate in all scenarios

**7.2** Final quality gate verification ⏱️ 5 min

- [ ] Confirm all quality standards met
    - All backend tests pass
    - All frontend tests pass
    - 0 violations/errors across stack

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

**Estimated Total**: 3.5 hours (210 minutes)
**Priority**: HIGH (blocks Phase 3.6.2, user-facing data integrity bug)
**Risk Level**: LOW-MEDIUM (isolated changes, good test coverage, graceful fallback)
