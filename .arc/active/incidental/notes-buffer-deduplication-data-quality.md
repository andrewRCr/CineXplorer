# Buffer Deduplication Implementation Notes

**Created:** 2025-10-30
**Task List:** `.arc/active/incidental/tasks-buffer-deduplication-data-quality.md`
**Status:** Phase 2 Complete, Planning Option 1

---

## Stashed Work (Pre-Investigation)

**Stash:** `stash@{0}` - "WIP: Filter visibility fix + re-render optimization +
navigation state enhancement (has undefined variable bugs)"

These were the ORIGINAL uncommitted changes BEFORE buffer investigation:

### MovieCollectionLayout.tsx

**Intent:** Split filter style logic (API vs UI rendering)

- `actualFilterStyle` → `apiFilterStyle` (for API) + `filterStyle` (for UI)
- Prevents unnecessary re-renders when toggling advanced panel
- Uses `hasAdvancedFilterValues()` helper based on VALUES not UI state

**Bug:** Line 183 still references undefined `actualFilterStyle` (incomplete refactor)

### useMovieCollectionState.tsx

**Intent:** Enhanced filter detection

- Exported `hasAdvancedFilterValues` helper
- Added checks for: multiple genres, non-core genres, advanced sort options
- Enables auto-expand for more scenarios

**Status:** No bugs, but depends on MovieCollectionLayout import

---

## Current Status Update - 2025-10-30 (Post-Phase 2 Implementation)

### Cross-Reference

**Current Task List:** `.arc/active/incidental/tasks-buffer-deduplication-data-quality.md` (Phase 2 Task 2.1 complete)

**Related Task Lists:**

- `.arc/active/incidental/tasks-pagination-buffer-tracking.md` (Phases 1-3.6 complete, Phase 3.7 pending)
- `.arc/active/incidental/tasks-navigation-filter-state-preservation.md` (Paused at Task 3.3)
- `.arc/active/incidental/tasks-filter-integration-testing.md` (Paused at Phase 3.6.2)

### What We've Accomplished (Phase 2 Tasks 2.1.1-2.1.3)

**Implementation Complete:**

- ✅ Added deduplication logic to `_apply_buffer_if_needed` method (movie_service.py:483-490)
- ✅ Uses `seen_ids` set for O(1) lookup efficiency
- ✅ Builds `deduplicated` list preserving first occurrence order
- ✅ Deduplication runs WITHIN buffer loop (after each page fetch)
- ✅ Loop continues if dedup reduces count below 20

**Test Results:**

- ✅ 11/11 TDD tests passing (7 unit tests + 4 integration tests)
- ✅ **Within-page deduplication working:** Single request no longer returns duplicate movies

### New Issues Discovered - Browser Testing

**Issue 1: Cross-Page Duplicates** ❌

- Spirited Away appears on page 1 (position 19) AND page 2 (position 2)
- Mulan appears on page 2 AND page 3
- Luca appears on page 3 AND page 4
- **Root cause:** Deduplication only works WITHIN a single page request, NOT across pagination sequence

**Issue 2: Backward Navigation Inconsistency** ❌

- Navigate: page 1 → page 2 → back to page 1
- Page 1 shows completely different results on second visit
- **Suspicion:** Frontend buffer state (`next_tmdb_page_start`) not being reset properly for backward navigation

### New Tests Written (Catching the Issues)

**Test 1: `test_discover_no_cross_page_duplicates`** ❌ FAILING

- Simulates: Movie ID 19 appears on TMDB pages 2 AND 4
- Our page 1 fetches TMDB pages 1-2 (includes ID 19)
- Our page 2 fetches TMDB pages 3-4 (DUPLICATE ID 19 appears again!)
- **Result:** FAILS - Found 1 duplicate (ID 19) across pages
- **File:** `backend/apps/movie/tests/test_movie_api.py:1328-1417`

**Test 2: `test_discover_backward_navigation_consistency`** ✅ PASSING

- Simulates: page 1 → page 2 → back to page 1
- **Result:** PASSES - Backend returns consistent results
- **Implication:** Backend is correct, frontend issue suspected
- **File:** `backend/apps/movie/tests/test_movie_api.py:1420-1512`

### Root Cause Analysis

**Problem:** Our deduplication implementation is incomplete.

**Current Implementation (Lines 483-490):**

```python
# Deduplicate by tmdb_id, preserving first occurrence order
seen_ids: set[int] = set()
deduplicated: list[MovieBaseSchema] = []
for movie in combined_movies:
    if movie.tmdb_id not in seen_ids:
        seen_ids.add(movie.tmdb_id)
        deduplicated.append(movie)
combined_movies = deduplicated
```

**What it does:** Deduplicates movies within the CURRENT buffer loop iteration
**What it doesn't do:** Track movies already returned in PREVIOUS pagination requests

**Example Failure:**

```
Request 1 (page=1):
  - Fetch TMDB pages 1-2
  - Deduplicate within request → Return movies 1-20
  - Movie 19 included in response

Request 2 (page=2, tmdb_page_start=3):
  - Fetch TMDB pages 3-4
  - Movie 19 appears AGAIN on TMDB page 4
  - Deduplicate within request → But movie 19 wasn't in THIS request's initial set!
  - Return movies including 19 again (DUPLICATE!)
```

### Relationship to Existing Infrastructure

**Metadata Tracking System (Already Implemented):**

From `tasks-pagination-buffer-tracking.md` Phase 2:

- ✅ Backend returns `next_tmdb_page_start` in API response
- ✅ Frontend stores metadata in `nextTmdbPageStartRef` (using useRef)
- ✅ Frontend passes `tmdb_page_start` parameter in subsequent requests
- ✅ Backend uses parameter to continue from correct TMDB page

**What's Missing:**

- ❌ Deduplication doesn't communicate with metadata system
- ❌ No mechanism to track "which movies have already been returned"
- ❌ Frontend metadata may not reset correctly on backward navigation

### Problem Classification

**Problem Type:** Cross-cutting architectural gap

**Scope:**

1. Backend deduplication logic (current scope - partially complete)
2. Metadata tracking system integration (pagination-buffer-tracking)
3. Frontend state management (navigation-filter-state-preservation)
4. URL parameter persistence (navigation-filter-state-preservation Phase 3.7)

**Complexity:** Medium-High

- Involves coordination between backend buffer, metadata tracking, and frontend state
- May require rethinking the deduplication approach entirely
- Alternative approaches have different tradeoffs

### Potential Solutions

**Option 1: Session-Based Tracking (Backend State)**

Store which movies have been returned in this pagination sequence (session/cache):

```python
# Hypothetical implementation
session_returned_ids = cache.get(f"returned_ids_{session_id}_{filter_hash}") or set()

for movie in combined_movies:
    if movie.tmdb_id not in seen_ids and movie.tmdb_id not in session_returned_ids:
        seen_ids.add(movie.tmdb_id)
        deduplicated.append(movie)

session_returned_ids.update([m.tmdb_id for m in deduplicated[:20]])
cache.set(f"returned_ids_{session_id}_{filter_hash}", session_returned_ids)
```

**Pros:**

- Guarantees no cross-page duplicates
- Transparent to frontend
- Works with backward navigation

**Cons:**

- Requires session/cache infrastructure (Redis)
- Needs session management (expiry, cleanup)
- Filter changes must invalidate session
- Adds backend complexity

**Option 2: Frontend Exclude List (Stateless Backend)**

Frontend tracks returned movie IDs, sends exclusion list with requests:

```python
# Backend accepts new parameter
def discover_movies(
    exclude_ids: list[int] | None = None,
    ...
):
    # Filter out excluded IDs from results
    if exclude_ids:
        results = [m for m in results if m.tmdb_id not in exclude_ids]
```

**Pros:**

- Stateless backend (simpler)
- Frontend controls deduplication
- Works with URL state (can persist excluded IDs)

**Cons:**

- Large exclude lists in URLs (ugly, limits)
- Frontend complexity increased
- Backward navigation harder (need to track exclude list per page)
- Cache invalidation still needed on filter changes

**Option 3: Accept Boundary Duplicates (Tradeoff)**

Document that ±1 movie duplicates at page boundaries are acceptable:

```
# Current implementation but with documentation
# "Due to TMDB pagination instability, a movie may appear on consecutive
# pages (e.g., last movie of page 1 and first of page 2). This is rare
# and acceptable vs. backend session complexity."
```

**Pros:**

- Simplest - no changes needed
- Stateless
- Fast

**Cons:**

- User experience degradation
- Doesn't solve the problem
- Test failures remain
- Not acceptable for production quality

**Option 4: Hybrid - Use TMDB Pages as Natural Boundaries**

Redesign buffer to NEVER return movies across TMDB page boundaries:

```python
# Instead of "fill to 20", do "return complete TMDB pages only"
# Page 1: TMDB pages 1-2 = 40 movies → return first 20
# Page 2: TMDB pages 3-4 = 40 movies → return first 20
# No overlap possible if boundaries align
```

**Pros:**

- Stateless
- Guarantees no duplicates
- Simpler than session tracking

**Cons:**

- Changes pagination math significantly
- May return fewer than 20 if TMDB page has <20 after filtering
- Wastes API calls (fetching 40 to return 20)
- Complex edge cases

**Option 5: Smart Buffer Reset (Frontend-Driven)**

Track page navigation direction, reset buffer on backward navigation:

```typescript
// Frontend detects: going from page 2 → page 1
if (newPage < currentPage) {
    // Backward navigation: DON'T send tmdb_page_start
    // Force backend to start fresh from TMDB page 1
}
```

**Pros:**

- Fixes backward navigation issue
- Minimal backend changes
- Uses existing metadata system

**Cons:**

- Doesn't fix forward navigation duplicates
- Frontend must track direction
- Still need cross-page dedup solution

### Recommended Approach (Needs Discussion)

**Two-Phase Solution:**

**Phase 1 (Short-term):** Fix backward navigation (Option 5)

- Update frontend to detect navigation direction
- Reset `tmdb_page_start` on backward navigation
- Fixes Issue 2 immediately
- Low risk, low effort

**Phase 2 (Medium-term):** Full deduplication (Option 1 OR major redesign)

- Evaluate session-based tracking vs. architectural redesign
- Consider pagination-buffer-tracking Phase 3.7 integration
- May require broader pagination strategy discussion
- Higher effort, needs careful design

### Will/Won't Do Considerations

**From Related Task Lists:**

`pagination-buffer-tracking.md` Won't Do:

- ❌ Recalculate total_pages based on filter yield (already inaccurate, acceptable)
- ❌ Advanced buffer strategies (exponential backoff, etc.)
- ❌ Cursor-based pagination (different approach entirely)

`navigation-filter-state-preservation.md` Won't Do:

- ❌ Deep linking optimization (separate enhancement)
- ❌ Advanced history state management refactoring (current solution works)
- ❌ Performance optimization of state updates (premature)

**For Current Work:**

**Should Do:**

- ✅ Fix cross-page duplicates (blocks testing)
- ✅ Fix backward navigation consistency (UX issue)
- ✅ Maintain stateless architecture where possible
- ✅ Integration with existing metadata system

**Should NOT Do:**

- ❌ Over-engineer session management (if simpler solution exists)
- ❌ Change pagination fundamentals (too risky)
- ❌ Implement cursor-based pagination (out of scope)

### Dependencies & Integration Points

**Must Consider:**

1. **pagination-buffer-tracking Phase 3.7** (URL metadata persistence)
   - Designed to solve navigation consistency
   - May address backward navigation issue
   - Should complete before implementing cross-page dedup

2. **navigation-filter-state-preservation Task 3.3** (manual verification)
   - Paused to address our current bug
   - Needs to resume after we're done
   - Filter state may interact with pagination state

3. **filter-integration-testing Phase 3.6.2** (rating filter testing)
   - Also paused for pagination bug
   - Needs pagination working correctly to complete testing

**Integration Risks:**

- Frontend has `nextTmdbPageStartRef` using `useRef` pattern
- Backend has `next_tmdb_page_start` metadata system
- Deduplication must work WITH this system, not around it
- Any solution must preserve the metadata tracking benefits

### Next Steps (Proposed)

**Before Implementation:**

1. **Document & Analyze** ✅ (this section)
2. **Discuss Solution Options** - Review tradeoffs with team/user
3. **Choose Approach** - Based on constraints and priorities
4. **Plan Integration** - How does it fit with pagination-buffer-tracking Phase 3.7?
5. **Update Current Task List** - Document decisions and plan

**For Implementation:**

- Likely need to update both `tasks-buffer-deduplication-data-quality.md` AND
  `tasks-pagination-buffer-tracking.md` if solution touches metadata system
- May need to coordinate with navigation state work
- Tests already written - use TDD to guide implementation

### Questions for Decision-Making

1. **Is session/cache infrastructure available?** (Redis, Celery mentioned in filter-integration-testing notes)
2. **What's the acceptable tradeoff between complexity and UX?**
3. **Should we complete pagination-buffer-tracking Phase 3.7 first?** (URL metadata persistence)
4. **Is stateless backend a hard requirement?**
5. **What's the priority: backward navigation vs. forward duplicates?**

### Files Currently Modified (Uncommitted)

**From Current Work:**

- `backend/apps/movie/services/movie_service.py` - Deduplication implementation
- `backend/apps/movie/tests/test_movie_service_buffer_deduplication.py` - Unit tests
- `backend/apps/movie/tests/test_movie_api.py` - Integration tests (including 2 new cross-page tests)
- `.arc/active/incidental/tasks-buffer-deduplication-data-quality.md` - Task list
- `.arc/active/incidental/notes-buffer-deduplication-data-quality.md` - This file

**From Earlier Investigation:**

- `frontend/src/components/movie/collection/MovieCollectionGrid.tsx` - Buffer reset fix + debug logging
- `frontend/src/components/movie/collection/MovieGrid.tsx` - Buffer reset fix + debug logging

**Stashed:**

- `stash@{0}` - Filter visibility fix + re-render optimization (has bugs, will fix in Phase 4)
