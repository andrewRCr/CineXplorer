# Incidental: Infinite Scroll Migration with TanStack Query

**Created:** 2025-12-10
**Branch:** `technical/service-layer-modernization`
**Status:** Pending

## Context

**Discovered:** During Phase 3.7.d (metadata persistence debugging) of `tasks-pagination-buffer-tracking.md`

**Interrupts:** `.arc/active/incidental/tasks-pagination-buffer-tracking.md` at Phase 3.7, Task 3.7.d

**Problem:** Path-dependent pagination creates inherent complexity with random-access numbered pages.
Our buffer mechanism consumes variable TMDB pages per display page, making page N content depend on
navigation path taken. This conflicts fundamentally with random-access pagination UX.

**Why Now:** Research revealed that infinite scroll + TanStack Query is the industry-standard solution
for content discovery apps with filtered/buffered data. Major platforms (TMDB.org, Netflix, Spotify)
use this pattern. Continuing to patch numbered pagination fights against our data model.

**Research Summary:** See CURRENT-SESSION.md for full research findings. Key points:

- Random-access pagination assumes stable page-to-content mapping (we don't have this)
- Infinite scroll eliminates path-dependency problem (always sequential)
- TanStack Query's `useInfiniteQuery` handles cursor tracking natively
- Matches our planned frontend modernization (TanStack Query adoption)

---

## Scope

### Will Do

- Integrate TanStack Query for movie discovery/browse/search
- Replace paginated grid with infinite scroll (auto-load on scroll)
- Make QuickBrowseBar sticky (filters always visible while scrolling)
- Add "Back to top" button that appears on scroll
- Implement scroll position restoration for back navigation
- Remove pagination-specific code (controls, URL page params, metadata tracking)
- Update/replace tests for new patterns
- Apply same infinite scroll pattern to search results

### Won't Do

- Redux Toolkit integration (separate concern - global client state, not server state)
- React Router data loader migration (not required for this change)
- Backend API changes (current API with `tmdb_page_start` already supports our needs)
- TanStack Query for non-browse endpoints (auth, user data - incremental adoption later)

### Won't Do (Superseded from pagination-buffer-tracking)

- Phase 4: Sequential pagination validation (obsolete - no numbered pages)
- Phase 5: Jump-to-page approximation (obsolete - no random access)
- Phase 6: Final integration testing for numbered pagination (replaced by new tests)

---

## Tasks

### **Phase 1:** TanStack Query Setup and Infrastructure

**Purpose:** Establish TanStack Query in the project with proper configuration.

- [ ] **1.1 Install and configure TanStack Query**

    - [ ] **1.1.a Install dependencies**
        - Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
        - Verify compatibility with React 19

    - [ ] **1.1.b Create QueryClient configuration**
        - Create `src/lib/queryClient.ts` with sensible defaults
        - Configure stale time, cache time, retry logic
        - Consider: `staleTime: 5 * 60 * 1000` (5 min for movie data)

    - [ ] **1.1.c Add QueryClientProvider to app root**
        - Wrap app in `QueryClientProvider`
        - Add React Query DevTools (dev mode only)
        - File: `src/App.tsx` or `src/main.tsx`

- [ ] **1.2 Create base infinite query hook for movies**

    **Goal:** Reusable hook that wraps `useInfiniteQuery` for our movie fetching pattern.

    - [ ] **1.2.a Write tests for `useInfiniteMovies` hook**
        - Test: Returns paginated results correctly
        - Test: `fetchNextPage` triggers next page load with correct `tmdb_page_start`
        - Test: `hasNextPage` reflects API response (`next_tmdb_page_start` presence)
        - Test: Filter changes reset query (new query key)
        - Test: Error states handled correctly
        - Expect tests to FAIL initially

    - [ ] **1.2.b Implement `useInfiniteMovies` hook**
        - Accept fetcher function and query key dependencies
        - Use `getNextPageParam` to extract `next_tmdb_page_start` from response
        - Flatten pages into single movies array for consumers
        - Return `{ movies, fetchNextPage, hasNextPage, isFetching, isLoading, error }`
        - Tests should now PASS

    - [ ] **1.2.c Run quality gates**
        - Frontend tests passing
        - Type checking: 0 errors
        - Linting: 0 violations

---

### **Phase 2:** Infinite Scroll Component

**Purpose:** Create the scroll-based loading UI component.

- [ ] **2.1 Write tests for infinite scroll behavior**

    - [ ] **2.1.a Create `InfiniteMovieGrid.test.tsx`**
        - Test: Renders initial movies on mount
        - Test: Shows loading skeleton while fetching
        - Test: Triggers `fetchNextPage` when scroll sentinel visible
        - Test: Shows "end of results" when `hasNextPage` is false
        - Test: Handles empty results state
        - Test: Handles error state with retry option
        - Expect tests to FAIL initially

- [ ] **2.2 Implement `InfiniteMovieGrid` component**

    - [ ] **2.2.a Create scroll detection with Intersection Observer**
        - Create sentinel element at bottom of grid
        - Use `useRef` + `IntersectionObserver` to detect visibility
        - Trigger `fetchNextPage` when sentinel enters viewport
        - Debounce to prevent rapid-fire fetches

    - [ ] **2.2.b Implement loading and end states**
        - Show skeleton cards while `isFetching` and has content
        - Show "Loading..." on initial load (`isLoading`)
        - Show "No more results" when `!hasNextPage`
        - Show empty state when no results match filters

    - [ ] **2.2.c Implement error handling**
        - Display error message on fetch failure
        - Provide "Retry" button that calls `refetch()`
        - Don't lose already-loaded content on error

    - [ ] **2.2.d Run tests - should now PASS**

- [ ] **2.3 Run quality gates**
    - Frontend tests passing
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 3:** Sticky QuickBrowseBar and Back-to-Top

**Purpose:** Enhance UX with always-visible controls and quick navigation.

- [ ] **3.1 Make QuickBrowseBar sticky**

    - [ ] **3.1.a Analyze current QuickBrowseBar positioning**
        - Review current CSS/Chakra styling
        - Identify parent container constraints
        - Determine appropriate z-index

    - [ ] **3.1.b Implement sticky positioning**
        - Add `position: sticky`, `top: 0` (or appropriate offset for header)
        - Ensure proper z-index layering (above grid, below modals)
        - Add subtle shadow/border when stuck for visual feedback
        - Test across viewport sizes

    - [ ] **3.1.c Verify advanced filters panel behavior**
        - Ensure expanded panel scrolls with content (not sticky)
        - Or: Consider collapsible sticky panel UX
        - Document chosen approach

- [ ] **3.2 Implement "Back to top" button**

    - [ ] **3.2.a Write tests for BackToTopButton**
        - Test: Hidden when at top of page
        - Test: Visible after scrolling down threshold (e.g., 500px)
        - Test: Click scrolls to top smoothly
        - Test: Proper accessibility (aria-label, keyboard accessible)
        - Expect tests to FAIL initially

    - [ ] **3.2.b Implement BackToTopButton component**
        - Track scroll position with `useEffect` + scroll listener
        - Show/hide based on threshold
        - Use `window.scrollTo({ top: 0, behavior: 'smooth' })`
        - Style: Fixed position, bottom-right, subtle but visible
        - Use semantic token styling per strategy docs

    - [ ] **3.2.c Run tests - should now PASS**

- [ ] **3.3 Run quality gates**
    - Frontend tests passing
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 4:** Integration with Browse/Discover Routes

**Purpose:** Wire infinite scroll into existing browse pages, replacing pagination.

- [ ] **4.1 Update MovieCollectionLayout for infinite scroll**

    - [ ] **4.1.a Modify outlet context**
        - Remove `initialCurrentPage`, `initialTmdbPageStart`, `onPageChange`
        - Add query key dependencies for TanStack Query
        - Keep `fetcher`, `source`, `enhancedFetcher`, `browseParams`

    - [ ] **4.1.b Update child component expectations**
        - `MovieCollectionGrid` → `InfiniteMovieGrid` (or rename in place)
        - Remove pagination control rendering

- [ ] **4.2 Replace MovieCollectionGrid with infinite scroll**

    - [ ] **4.2.a Refactor MovieCollectionGrid**
        - Replace `usePaginatedMovies` with `useInfiniteMovies`
        - Remove pagination state management (refs, page tracking)
        - Integrate Intersection Observer for scroll loading
        - Keep existing movie card rendering logic

    - [ ] **4.2.b Update or remove pagination-specific code**
        - Remove `MoviePaginationCtrl` usage
        - Remove `usePageChangeHandler` usage
        - Simplify component significantly

    - [ ] **4.2.c Verify all browse routes work**
        - Test: `/browse/popular`
        - Test: `/browse/top-rated`
        - Test: `/browse/now-playing`
        - Test: `/browse/upcoming`
        - Test: Browse with filters applied

- [ ] **4.3 Update URL handling**

    - [ ] **4.3.a Simplify URL parameters**
        - Remove `page` and `tmdb_page_start` from URL
        - Keep filter params (`genres`, `minRating`, `sortBy`, etc.)
        - Update `paginationUrlSync.ts` or remove if no longer needed

    - [ ] **4.3.b Update MovieCard link generation**
        - Remove page number from detail links
        - Filters still preserved in URL for back navigation

    - [ ] **4.3.c Update MovieDetail back navigation**
        - Back button returns to browse with filters (no page)
        - Scroll position restoration handled separately (Phase 5)

- [ ] **4.4 Run quality gates**
    - Frontend tests passing (many pagination tests now obsolete - update/remove)
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 5:** Scroll Position Restoration

**Purpose:** Ensure back navigation returns user to their scroll position.

- [ ] **5.1 Research scroll restoration approaches**

    **Note:** React Router may handle this automatically. Verify before implementing.

    - [ ] **5.1.a Test default React Router behavior**
        - Navigate: Browse → scroll → MovieDetail → back
        - Does scroll position restore automatically?
        - Document findings

    - [ ] **5.1.b Evaluate TanStack Query cache behavior**
        - Does cached data restore instantly on back nav?
        - Is there a flash of loading state?
        - Document findings

- [ ] **5.2 Implement scroll restoration if needed**

    - [ ] **5.2.a Choose restoration strategy**
        - Option A: React Router's `<ScrollRestoration />` component
        - Option B: Manual scroll position tracking in sessionStorage
        - Option C: Rely on browser default + TanStack cache
        - Document chosen approach with rationale

    - [ ] **5.2.b Implement chosen strategy**
        - Implementation varies by chosen approach
        - Test: Browse → scroll 2000px → detail → back → position restored
        - Test: Browse → scroll → different route → back → position restored

- [ ] **5.3 Run quality gates**
    - Frontend tests passing
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 6:** Search Results Migration

**Purpose:** Apply same infinite scroll pattern to search results.

- [ ] **6.1 Analyze current search implementation**

    - [ ] **6.1.a Review search results rendering**
        - Identify shared vs different code paths from browse
        - Determine reuse opportunity for `useInfiniteMovies`

- [ ] **6.2 Migrate search to infinite scroll**

    - [ ] **6.2.a Update search results component**
        - Use `useInfiniteMovies` with search fetcher
        - Apply same infinite scroll UI pattern
        - Ensure query param (`q`) properly handled

    - [ ] **6.2.b Test search-specific behaviors**
        - Test: New search query resets results
        - Test: Empty search state
        - Test: No results state

- [ ] **6.3 Run quality gates**
    - Frontend tests passing
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 7:** Cleanup and Documentation

**Purpose:** Remove obsolete code and update documentation.

- [ ] **7.1 Remove deprecated pagination code**

    - [ ] **7.1.a Delete obsolete files**
        - `MoviePaginationCtrl.tsx` (or mark deprecated if used elsewhere)
        - `usePageChangeHandler.ts`
        - Pagination-specific test files

    - [ ] **7.1.b Clean up unused exports**
        - Review `paginationUrlSync.ts` - remove or simplify
        - Remove pagination types from shared types
        - Clean up imports across codebase

    - [ ] **7.1.c Remove obsolete tests**
        - Delete pagination-specific stability tests
        - Delete URL metadata persistence tests (replaced by new approach)
        - Update test counts in documentation

- [ ] **7.2 Update project documentation**

    - [ ] **7.2.a Update frontend modernization plan**
        - Mark TanStack Query as "Implemented (browse/search)"
        - Note remaining adoption scope (auth, user data)
        - Update `.arc/backlog/technical/plan-frontend-modernization.md`

    - [ ] **7.2.b Add TanStack Query patterns to strategy docs**
        - Document query key conventions
        - Document infinite query patterns
        - Consider adding to testing methodology

- [ ] **7.3 Final quality gates**
    - All frontend tests passing
    - All backend tests passing (should be unaffected)
    - Type checking: 0 errors (frontend + backend)
    - Linting: 0 violations (frontend + backend)
    - Markdown linting: 0 violations

---

### **Phase 8:** Manual Verification and Sign-off

**Purpose:** End-to-end manual testing of all affected flows.

- [ ] **8.1 Browse flow verification**
    - Load `/browse/popular` - infinite scroll works
    - Scroll down, content loads automatically
    - Apply filters - results reset, scroll to top
    - Change sort - results reset correctly
    - QuickBrowseBar stays visible while scrolling
    - "Back to top" button appears and works

- [ ] **8.2 Navigation flow verification**
    - Browse → scroll → MovieDetail → back → scroll position restored
    - Browse with filters → MovieDetail → back → filters preserved
    - Browse → search → back → browse state correct

- [ ] **8.3 Search flow verification**
    - Search for movies - infinite scroll works
    - New search resets results
    - Empty search handled gracefully

- [ ] **8.4 Edge case verification**
    - Very restrictive filters (few results) - end state correct
    - No results - empty state displayed
    - Network error - error state with retry
    - Rapid scrolling - no duplicate fetches, no errors

---

## Success Criteria

- [ ] Infinite scroll replaces pagination for browse and search
- [ ] QuickBrowseBar is sticky (always visible while scrolling)
- [ ] "Back to top" button available for quick return
- [ ] Back navigation restores scroll position (or near it)
- [ ] Filter changes reset results appropriately
- [ ] No regression in data quality (buffer mechanism still works)
- [ ] TanStack Query properly integrated and configured
- [ ] All obsolete pagination code removed
- [ ] All quality gates pass (tests, linting, type checking)
- [ ] Ready for archival

---

## Implementation Notes

### TanStack Query Key Strategy

```typescript
// Query keys should include all dependencies that affect results
const queryKey = ['movies', 'discover', {
  ...browseParams,  // filters, sort
  source,           // popular, top-rated, etc.
}];

// Search has different key structure
const searchQueryKey = ['movies', 'search', { query, ...filters }];
```

### Infinite Query Page Param

```typescript
useInfiniteQuery({
  queryKey,
  queryFn: ({ pageParam }) => fetchMovies(pageParam),
  initialPageParam: { page: 1, tmdb_page_start: undefined },
  getNextPageParam: (lastPage) =>
    lastPage.next_tmdb_page_start
      ? { page: lastPage.page + 1, tmdb_page_start: lastPage.next_tmdb_page_start }
      : undefined,  // No more pages
});
```

### Intersection Observer Pattern

```typescript
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetching) {
        fetchNextPage();
      }
    },
    { threshold: 0.1 }
  );

  if (sentinelRef.current) observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [hasNextPage, isFetching, fetchNextPage]);
```

---

## Related Files

**Will be modified:**

- `frontend/src/App.tsx` or `main.tsx` - QueryClientProvider
- `frontend/src/components/movie/collection/MovieCollectionGrid.tsx` - Major refactor
- `frontend/src/components/movie/collection/MovieCollectionLayout.tsx` - Context changes
- `frontend/src/components/movie/collection/QuickBrowseBar.tsx` - Sticky positioning
- `frontend/src/components/movie/MovieCard.tsx` - Simplify links
- `frontend/src/pages/movie/MovieDetail.tsx` - Simplify back navigation
- `frontend/src/utilities/paginationUrlSync.ts` - Simplify or remove

**Will be created:**

- `frontend/src/lib/queryClient.ts` - TanStack Query configuration
- `frontend/src/hooks/useInfiniteMovies.ts` - Core infinite query hook
- `frontend/src/components/common/BackToTopButton.tsx` - Scroll-to-top UI

**Will be removed/deprecated:**

- `frontend/src/components/movie/collection/MoviePaginationCtrl.tsx`
- `frontend/src/hooks/usePageChangeHandler.ts`
- Various pagination-specific tests
