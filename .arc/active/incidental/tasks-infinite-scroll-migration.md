# Incidental: Infinite Scroll Migration with TanStack Query

**Created:** 2025-12-10
**Branch:** `incidental/infinite-scroll-migration`
**Status:** Active

## Context

**Discovered:** During Phase 3.7.d (metadata persistence debugging) of `tasks-pagination-buffer-tracking.md`

**Interrupts:** `tasks-service-layer-modernization.md` at Task 3.5.b.3

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

### Pre-existing Test Failures (to be addressed)

5 tests in `MovieDetail.test.tsx` were failing before this branch started. They test `page=` URL param
preservation in "Back to Results" links - pagination-specific behavior that will be removed/rewritten
as part of this migration.

**Failing tests:**

- `constructs back URL with all filter params` - expects `page=3` in URL
- `constructs search back URL correctly` - expects `page=1` in URL
- `constructs top-rated back URL correctly` - expects `page=1` in URL
- `constructs upcoming back URL correctly` - expects `page=1` in URL
- `handles missing optional params gracefully` - expects `page=1` in URL

**Resolution:** These will be addressed when removing pagination-specific code (Phase 3+). The "Back to
Results" link will remain but without `page=` params. Tests will be updated to reflect infinite scroll
navigation patterns.

---

## Tasks

### **Phase 1:** TanStack Query Setup and Infrastructure

**Purpose:** Establish TanStack Query in the project with proper configuration.

- [x] **1.1 Install and configure TanStack Query**

    - [x] **1.1.a Install dependencies**
        - Installed `@tanstack/react-query@5.90.12` and `@tanstack/react-query-devtools@5.91.1`
        - React 19 compatibility confirmed (v5.39.0+ supports React 19)

    - [x] **1.1.b Create QueryClient configuration**
        - Created `src/lib/queryClient.ts` with movie-optimized defaults
        - staleTime: 5 min, gcTime: 30 min, retry: 2 with exponential backoff
        - Disabled refetchOnWindowFocus/refetchOnReconnect for browsing UX

    - [x] **1.1.c Add QueryClientProvider to app root**
        - Added to `src/main.tsx` wrapping Chakra Provider
        - ReactQueryDevtools added (collapsed by default)

- [x] **1.2 Create base infinite query hook for movies**

    - [x] **1.2.a Write tests for `useInfiniteMovies` hook**
        - Created `useInfiniteMovies.test.tsx` with 10 tests covering all scenarios
        - Tests: paginated results, page flattening, fetchNextPage with cursor,
          hasNextPage states, filter reset, error handling, isFetchingNextPage

    - [x] **1.2.b Implement `useInfiniteMovies` hook**
        - Created `src/hooks/useInfiniteMovies.ts` wrapping `useInfiniteQuery`
        - Uses `next_tmdb_page_start` as cursor via `getNextPageParam`
        - Flattens pages into single movies array
        - Returns: `{ movies, fetchNextPage, hasNextPage, isFetching, isLoading, isFetchingNextPage, error, isError }`

    - [x] **1.2.c Run quality gates**
        - All 10 new tests passing
        - Type checking: 0 errors
        - Linting: 0 violations

---

### **Phase 2:** Infinite Scroll Component

**Purpose:** Create the scroll-based loading UI component.

- [x] **2.1 Write tests for infinite scroll behavior**

    - [x] **2.1.a Create `InfiniteMovieGrid.test.tsx`**
        - Test: Renders initial movies on mount
        - Test: Shows loading skeleton while fetching
        - Test: Triggers `fetchNextPage` when scroll sentinel visible
        - Test: Shows "end of results" when `hasNextPage` is false
        - Test: Handles empty results state
        - Test: Handles error state with retry option
        - Expect tests to FAIL initially

- [x] **2.2 Implement `InfiniteMovieGrid` component**

    - [x] **2.2.a Create scroll detection with Intersection Observer**
        - Create sentinel element at bottom of grid
        - Use `useRef` + `IntersectionObserver` to detect visibility
        - Trigger `fetchNextPage` when sentinel enters viewport
        - Debounce to prevent rapid-fire fetches

    - [x] **2.2.b Implement loading and end states**
        - Show skeleton cards while `isFetching` and has content
        - Show "Loading..." on initial load (`isLoading`)
        - Show "No more results" when `!hasNextPage`
        - Show empty state when no results match filters

    - [x] **2.2.c Implement error handling**
        - Display error message on fetch failure
        - Provide "Retry" button that calls `refetch()`
        - Don't lose already-loaded content on error

    - [x] **2.2.d Run tests - should now PASS**
        - All 7 tests in `InfiniteMovieGrid.test.tsx` passed

- [x] **2.3 Run quality gates**
    - [x] Frontend tests passing (8 InfiniteMovieGrid + 10 useInfiniteMovies = 18 new tests)
    - [x] Type checking: 0 errors
    - [x] Linting: 0 violations

**Phase 2 Completion Notes (2025-12-11):**

Initial implementation reviewed and rewritten to address issues:

1. **Type System Cleanup:**
   - Created `MovieListItem` type for list/grid views (has `genre_ids: number[]`)
   - Created `MovieDetail` type for detail pages (has `genres: GenreSchema[]`)
   - Added deprecated aliases for backwards compatibility
   - Updated `MovieCard`, `MovieCollectionGrid`, `useInfiniteMovies` to use correct types
   - Updated mock factories: `createMockMovieListItem()`, `createMockMovieDetail()`

2. **InfiniteMovieGrid Fixes:**
   - Fixed query key: now uses actual filter values (source, query) instead of function reference
   - Added 150ms debounce for scroll-triggered fetches
   - Fixed placeholder movie shape to use `genre_ids` not `genres`
   - Proper cleanup of timeouts on unmount
   - Correct semantic tokens (`layer-01`, `layer-02`, `fg-muted`, `fg-error`)

3. **Test Improvements:**
   - Added debounce verification test
   - Mock movies use correct `MovieListItem` shape

**Discovered Technical Debt:**

- `@shared/api-types.ts` contains outdated manually-maintained types
- 3 files still use `@shared` for Movie type (`useMovieDetail.ts`, `MovieDetail.tsx`, test)
- Added atomic task for cleanup: "Remove @shared/api-types.ts and migrate to OpenAPI types"

---

### **Phase 3:** Collapsible SubNav and Back-to-Top

**Purpose:** Enhance UX with collapsible browse controls (Pitchfork-style) and quick navigation.

**Design Decision (2025-12-11):**

The QuickBrowseBar will become a collapsible "sub-nav" bar that:

- Sits directly beneath the navbar, spanning full viewport width
- Collapses (slides up/animates out) when scrolling down past threshold
- Reappears when scrolling up (more sensitive than collapse)
- Only appears on list-view pages (browse/*, upcoming, now-playing, search results)
- Advanced filters panel remains in content area (too bulky for sub-nav)

Reference: Pitchfork.com secondary navigation bar behavior.

**Responsive Consideration:**

- Navbar height varies by breakpoint: 65px mobile (single row), 93px desktop (two rows)
- Use `var(--chakra-sizes-layout-navbar)` for positioning (auto-adjusts)
- See: `src/theme/layout/foundations.ts` and `semantic-tokens.ts`
- Pattern already used correctly in ThemeDebug.tsx sticky header

- [x] **3.1 Create shared scroll state hook**

    - [x] **3.1.a Write tests for `useScrollState` hook**
        - 19 tests covering: scrollY tracking, direction detection, isPastThreshold, hysteresis, cleanup, RAF throttling
        - Location: `src/hooks/__tests__/useScrollState.test.ts`

    - [x] **3.1.b Implement `useScrollState` hook**
        - Location: `src/hooks/useScrollState.ts`
        - Configurable `threshold` (default 200px) and `hysteresis` (default 10px)
        - Uses `requestAnimationFrame` for throttling, `useMemo` for stable return object
        - Exports `ScrollDirection` type, `UseScrollStateOptions` and `ScrollState` interfaces

    - [x] **3.1.c Run tests - should now PASS**
        - All 19 tests passing, type checking clean, linting clean

- [x] **3.2 Create CollapsibleSubNav component**

    - [x] **3.2.a Write tests for `CollapsibleSubNav` component**
        - 20 tests covering: rendering, collapse/expand behavior, positioning, styling, accessibility, edge cases
        - Location: `src/components/layout/__tests__/CollapsibleSubNav.test.tsx`

    - [x] **3.2.b Implement `CollapsibleSubNav` component**
        - Location: `src/components/layout/CollapsibleSubNav.tsx`
        - Props: `children`, `isCollapsed` (simplified from original plan - `onCollapseChange` not needed)
        - Fixed position below navbar via `var(--chakra-sizes-layout-navbar)`
        - Full width with `translateY(-100%)` collapse animation (250ms ease-out)
        - Uses `layer-01` bg, `border-strong-01` border, proper z-index and aria attributes

    - [x] **3.2.c Run tests - should now PASS**
        - All 20 tests passing, type checking clean, linting clean

- [ ] **3.3 Integrate CollapsibleSubNav with MovieCollectionLayout**

    - [ ] **3.3.a Move QuickBrowseBar into CollapsibleSubNav**
        - Wrap QuickBrowseBar with CollapsibleSubNav in MovieCollectionLayout
        - Wire `useScrollState` to control collapse state
        - Keep BrowseParams state management in MovieCollectionLayout
        - Advanced filters panel remains in content area (not in sub-nav)

    - [ ] **3.3.b Handle route-aware visibility**
        - Only render CollapsibleSubNav on list-view routes
        - Routes: `/browse/*`, `/upcoming`, `/now-playing`, `/search` (when ready)
        - Use route detection or prop-based control

    - [ ] **3.3.c Test collapse/expand behavior**
        - Verify collapse on scroll down past threshold (~200px)
        - Verify expand on scroll up (should be more sensitive)
        - Verify expand when at top of page
        - Test across viewport sizes

- [ ] **3.4 Implement BackToTopButton component**

    - [ ] **3.4.a Write tests for BackToTopButton**
        - Test: Hidden when at top of page
        - Test: Visible after scrolling down threshold
        - Test: Click scrolls to top smoothly
        - Test: Click triggers sub-nav to reappear (callback prop)
        - Test: Proper accessibility (aria-label, keyboard accessible)
        - Expect tests to FAIL initially

    - [ ] **3.4.b Implement BackToTopButton component**
        - Location: `src/components/navigation/BackToTopButton.tsx`
        - Use `useScrollState` hook for visibility
        - `window.scrollTo({ top: 0, behavior: 'smooth' })` on click
        - Callback prop `onScrollToTop` to notify parent (for sub-nav expand)
        - Style: Fixed position, bottom-right, subtle but visible
        - Use semantic tokens per theme strategy
        - Accessibility: aria-label="Scroll to top", focusable

    - [ ] **3.4.c Run tests - should now PASS**

    - [ ] **3.4.d Integrate BackToTopButton with infinite scroll pages**
        - Add to MovieCollectionLayout or InfiniteMovieGrid
        - Wire `onScrollToTop` to expand CollapsibleSubNav
        - Only show on pages with infinite scroll

- [ ] **3.5 Run quality gates**
    - [ ] Frontend tests passing
    - [ ] Type checking: 0 errors
    - [ ] Linting: 0 violations

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
- [ ] Pre-existing `MovieDetail.test.tsx` pagination test failures resolved (5 tests)
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
