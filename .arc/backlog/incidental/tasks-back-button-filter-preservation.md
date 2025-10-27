# Incidental Task List: Back to Results Button Filter Preservation

**Created**: 2025-10-27
**Priority**: Medium (workaround available: browser back button)
**Type**: Bug Fix - Navigation/UX
**Estimated Effort**: 1-2 hours

## Context

**Discovery Source**: Phase 3.6 manual testing (filter integration testing)

**Problem Statement**:
The "Back to Results" button on movie detail pages loses filter query parameters.
This results in a blank/black screen when returning from a movie with active filters applied.

**Current Behavior**:

- User applies filters (e.g., year: 1980-1983, genres: Comedy)
- User clicks into movie detail
- User clicks "Back to Results" button
- Page returns to `/popular?page=1` WITHOUT filter params
- Result: blank screen (no movies match the now-missing filters)

**Expected Behavior**:

- "Back to Results" should preserve ALL query parameters (page, from, query, minYear, maxYear, genres, etc.)
- User returns to exact same filtered results they came from

**Workaround**:

- Browser back button works correctly (uses full history state)

**Why This Matters**:

- Poor UX - users lose their filter context
- Browser back works but custom button doesn't (inconsistent behavior)
- Discovered during data quality testing, affects user experience of new filtering features

## Root Cause Analysis

**Investigation Complete** (2025-10-27):

**Affected Files**:

1. `frontend/src/components/movie/MovieCard.tsx` (lines 133-139)
   - Only passes `page`, `from`, `query` to detail page
   - Missing: minYear, maxYear, genres, and other filter params

2. `frontend/src/pages/movie/MovieDetail.tsx` (lines 116-120)
   - Reconstructs URL with only 3 params: `page`, `from`, `query`
   - Ignores all filter parameters

3. `frontend/src/components/movie/collection/MovieCollectionGrid.tsx` (lines 189-193)
   - Passes limited params to MovieCard

**Why Browser Back Works**:

- Browser uses full history state including all URL params
- Custom "Back to Results" button manually constructs partial URL

## Scope

**Will Do**:

- [ ] Preserve all current URL search params when navigating to detail page
- [ ] Reconstruct complete URL with all filters in "Back to Results" button
- [ ] Test with various filter combinations (year, genres, rating)
- [ ] Verify no regression in search results navigation

**Won't Do** (out of scope):

- Deep linking optimization (separate enhancement)
- History state management refactoring (if not needed)
- Filter state management restructuring (works correctly, just not preserved in nav)

## Success Criteria

- [ ] "Back to Results" button preserves all active filters
- [ ] Navigation works correctly for: Popular, Now Playing, Top Rated, Upcoming, Search
- [ ] Filter combinations work: year + genres, year + rating, all filters together
- [ ] Browser back button continues to work as expected
- [ ] No regressions in existing navigation flows

---

## Phase 1: Implement Filter Preservation

### 1.1 Update MovieCard Query String Construction

- [ ] 1.1.1 Capture all current URL search params
    - Read full `useSearchParams()` instead of just page/from/query
    - Preserve unknown params for forward compatibility

- [ ] 1.1.2 Pass all params to detail page URL
    - Update `queryString` memoization (line 133-139)
    - Include: minYear, maxYear, genres, rating filters, etc.

### 1.2 Update MovieDetail Back Button URL

- [ ] 1.2.1 Read all search params from URL
    - Capture complete param set, not just page/from/query

- [ ] 1.2.2 Reconstruct full back URL
    - Update back URL construction (lines 116-120)
    - Preserve all filter params in "Back to Results" link

### 1.3 Verify MovieCollectionGrid Compatibility

- [ ] 1.3.1 Check if additional props needed
    - Review if MovieCollectionGrid needs changes
    - May already work if MovieCard gets full params

---

## Phase 2: Testing & Validation

### 2.1 Manual Testing

- [ ] 2.1.1 Test Popular page with year filter
    - Apply year filter (1980-1983)
    - Navigate to movie detail
    - Click "Back to Results"
    - Verify: Returns to filtered results

- [ ] 2.1.2 Test with multiple filters
    - Apply year + genres + rating filters
    - Navigate to movie detail
    - Click "Back to Results"
    - Verify: All filters preserved

- [ ] 2.1.3 Test all collection types
    - Popular, Now Playing, Top Rated, Upcoming
    - Verify back button works for each

- [ ] 2.1.4 Test search results
    - Search with query + filters
    - Verify back button preserves search term and filters

### 2.2 Regression Testing

- [ ] 2.2.1 Test navigation without filters
    - Verify unfiltered navigation still works

- [ ] 2.2.2 Test browser back button
    - Ensure no regression in browser back behavior

- [ ] 2.2.3 Test pagination
    - Verify page numbers preserved correctly

### 2.3 Quality Gates

- [ ] 2.3.1 Run frontend tests
    - All existing tests must pass

- [ ] 2.3.2 Run frontend linting
    - ESLint passes

- [ ] 2.3.3 Run frontend type checking
    - TypeScript builds successfully

---

## Notes & Observations

**Key Insights**:

- Bug was masked because browser back button works
- Custom navigation button doesn't use history state
- Affects user experience of newly implemented filter features (Phase 3)

**Technical Approach**:

- Solution should be straightforward: preserve all URL params
- No complex state management needed (URL is source of truth)
- Risk: Low (isolated change, clear failure mode)

**Related Work**:

- Discovered during: `.arc/active/incidental/tasks-filter-integration-testing.md` Phase 3.6
- Impacts: Phase 3 data quality filtering features
