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

- [ ] **1.1 Write integration tests for metadata tracking**
    - Test: Buffer consumes multiple pages, returns `next_tmdb_page_start` in response
    - Test: Subsequent request with `tmdb_page_start` parameter continues from correct page
    - Test: No duplicate movies across sequential page requests
    - Test: Fallback behavior when `tmdb_page_start` omitted (uses simple 1:1 mapping)
    - Location: `backend/apps/movie/tests/test_movie_api.py` or new test file
    - Expect tests to FAIL initially (schema fields don't exist yet)

- [ ] **1.2 Add pagination metadata fields to schemas**
    - Add `next_tmdb_page_start: int | None` to `PaginatedMovieResponseSchema`
    - Add `tmdb_page_start: int | None` to `MovieDiscoverFilterSchema`
    - Document: Response field tracks last TMDB page consumed, request field continues from there
    - Run type checking to verify changes compile

---

### **Phase 2:** Backend Implementation and Quality Gates

- [ ] **2.1 Implement buffer tracking and metadata flow**
    - [ ] 2.1.1 Update `_apply_buffer_if_needed` to return consumed page count
        - Change return type from `list[MovieBaseSchema]` to `tuple[list[MovieBaseSchema], int]`
        - Track pages fetched in while loop, return `(movies[:20], pages_consumed)`
        - Note: Include initial page in count (e.g., fetched pages 1-4 → return 4, not 3)
    - [ ] 2.1.2 Thread metadata through `_fetch_with_filters_and_buffer`
        - Accept `tmdb_page_start: int | None` parameter
        - Use as starting page if provided, otherwise use `page` from request
        - Calculate `next_tmdb_page_start = current_page + pages_consumed` after buffer
        - Pass to `_build_filtered_response` as new parameter
    - [ ] 2.1.3 Update `_build_filtered_response` to include metadata
        - Add `next_tmdb_page_start: int | None` parameter
        - Include in `PaginatedMovieResponseSchema` instantiation
    - [ ] 2.1.4 Wire through `discover_movies` endpoint
        - Extract `tmdb_page_start` from request schema
        - Pass to `_fetch_with_filters_and_buffer`
        - Run integration tests - should now PASS

- [ ] **2.2 Run backend quality gates**
    - 368+ tests pass (including new pagination tests)
    - 0 type errors, 0 linting violations

---

### **Phase 3:** Frontend Implementation

- [ ] **3.1 Add pagination metadata to state and requests**
    - Update `usePaginatedMovies` hook to track `nextTmdbPageStart` in state
    - Store value from API response's `next_tmdb_page_start` field
    - Include `tmdb_page_start` parameter in discover/search API requests
    - Send previous response's `next_tmdb_page_start` value (omit if undefined/null)
    - Reset metadata when filters change (indicates new search context)

- [ ] **3.2 Fix pagination display to use actual result count**
    - Update `usePaginationDisplay` to calculate from actual `moviesCount`
    - Formula: `endIndex = (currentPage - 1) * 20 + moviesCount`
    - Fixes incorrect "showing 1-20" when only 11 results returned

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
