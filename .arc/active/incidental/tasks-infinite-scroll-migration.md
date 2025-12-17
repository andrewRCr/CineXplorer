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

- [x] **3.3 Integrate CollapsibleSubNav with MovieCollectionLayout**

    - [x] **3.3.a Move QuickBrowseBar into CollapsibleSubNav**
        - Updated `BrowseControlsSection.tsx` to wrap QuickBrowseBar in CollapsibleSubNav
        - Integrated `useScrollState` hook with 200px threshold, 15px hysteresis
        - Collapse logic: `isPastThreshold && direction === "down"`
        - Added `layout-subnav` token (52px) to theme for DRY layout calculations
        - Slimmed QuickBrowseBar: `p={4}` → `py={2} px={4}`, `gap={4}` → `gap={2}`
        - Fixed z-index (9) so sub-nav slides under navbar (10) when collapsing
        - Updated Sidebar sticky positioning to use new layout token
        - AdvancedFiltersPanel remains in content area as planned

    - [x] **3.3.b Handle route-aware visibility**
        - Existing `showBrowseControls` prop already provides route-aware control
        - `/browse/*` routes → `showBrowseControls={true}` (sub-nav visible)
        - `/search` route → `showBrowseControls={false}` (sub-nav hidden, for future work)
        - All 127 collection tests passing

    - [x] **3.3.c Test collapse/expand behavior**
        - Manual testing confirmed: collapses on scroll down past 200px threshold
        - Expands on scroll up (15px hysteresis prevents flicker)
        - Expands when returning to top of page (direction === 'idle')
        - Sub-nav slides "under" navbar (z-index 9 vs navbar 10)
        - Tested on desktop viewport

- [x] **3.4 Implement BackToTopButton component**

    - [x] **3.4.a Write tests for BackToTopButton**
        - 18 tests in `src/components/navigation/__tests__/BackToTopButton.test.tsx`
        - Coverage: visibility (threshold-based), click behavior, accessibility, positioning

    - [x] **3.4.b Implement BackToTopButton component**
        - Location: `src/components/navigation/BackToTopButton.tsx`
        - Uses `useScrollState` hook for visibility control
        - Smooth scroll via `window.scrollTo({ top: 0, behavior: 'smooth' })`
        - Fixed position bottom-right with `bottom="6" right="6"` padding
        - Chakra IconButton with `LuChevronUp` icon, `variant="solid"`, `rounded="full"`

    - [x] **3.4.c Run tests - 18/18 passing**

    - [x] **3.4.d Integrate BackToTopButton with BrowseControlsSection**
        - Added to `BrowseControlsSection.tsx` (co-located with CollapsibleSubNav)
        - `onScrollToTop` callback sets `forceExpand` state to expand sub-nav
        - Uses same threshold (200px) as CollapsibleSubNav for consistency
        - 145 collection tests passing

- [x] **3.5 Create SequentialPaginationCtrl component**

    Rationale: Create sequential (prev/next only) pagination as alternative to
    infinite scroll. Random-access pagination is being retired due to buffer/data
    quality issues - the final choice will be sequential OR infinite, not random-access.

    - [x] **3.5.a Write tests for SequentialPaginationCtrl**
        - 18 tests in `src/components/movie/collection/__tests__/SequentialPaginationCtrl.test.tsx`
        - Coverage: button states, click handlers, accessibility, edge cases

    - [x] **3.5.b Implement SequentialPaginationCtrl component**
        - Location: `src/components/movie/collection/SequentialPaginationCtrl.tsx`
        - Simple prev/next IconButtons with LuChevronLeft/Right icons
        - Props: `hasPrev`, `hasNext`, `onPrev`, `onNext`, `isLoading`
        - Memoized with useCallback handlers, nav role with aria-label

    - [x] **3.5.c Run tests - 18/18 passing**

    Note: A/B comparison testing (sequential vs infinite) deferred to end of
    Phase 4 after infinite scroll is wired up to browse routes.

- [x] **3.6 Run quality gates**
    - [x] Frontend tests: 703 passing (5 pre-existing MovieDetail failures - pagination-related)
    - [x] Type checking: 0 errors
    - [x] Linting: 0 violations

---

### **Phase 4:** Integration with Browse/Discover Routes

**Purpose:** Wire infinite scroll into browse pages while preserving ability to A/B test
sequential pagination. Old random-access pagination infrastructure will be removed after
A/B decision (Phase 4.5).

**Design notes:** See `notes-infinite-scroll-migration.md` for data quality analysis.

- [x] **4.1 Fix backend dedup session logic for infinite scroll**

    **Problem:** Current logic clears dedup session when `page == 1`, but infinite scroll
    always sends `page=1` (only `tmdb_page_start` varies). This breaks cross-page deduplication.

    - [x] **4.1.a Update dedup clear condition**
        - Changed `paginated.py` line ~201: `if page == 1 and tmdb_page_start is None and dedup_tracker:`
        - Moved `tmdb_page_start` extraction before the clear check
        - Added explanatory comment about infinite scroll support

    - [x] **4.1.b Add/update tests for new behavior**
        - Added `test_page_1_with_tmdb_page_start_preserves_session` - verifies continuation
          requests (page=1 + tmdb_page_start) preserve dedup session
        - Added `test_page_1_without_tmdb_page_start_clears_session` - verifies fresh start
          (page=1 without cursor) clears session
        - All existing pagination tests continue to pass

    - [x] **4.1.c Run backend quality gates**
        - Backend tests: 613 passing
        - Backend linting: 0 violations
        - Python type checking: 0 errors

- [x] **4.2 Wire InfiniteMovieGrid to browse routes**

    **Note:** Keep existing `MovieCollectionGrid` intact for now - needed for sequential
    A/B comparison. Wire `InfiniteMovieGrid` as the default, but don't delete old code yet.

    - [x] **4.2.a Update MovieCollectionLayout outlet context**
        - Added `browseParams` to outlet context for TanStack Query cache invalidation
        - Updated `useMovieCollectionContext` hook to resolve `browseParams`
        - Updated `InfiniteMovieGrid` to include `browseParams` in query key

    - [x] **4.2.b Switch default grid to InfiniteMovieGrid**
        - Updated `Browse.tsx`, `NowPlaying.tsx`, `Upcoming.tsx` to use `InfiniteMovieGrid`
        - `SearchResults.tsx` kept as-is (Phase 6 work)
        - Routes verified: `/browse/popular`, `/browse/now-playing`, `/browse/upcoming`

    - [x] **4.2.c Incremental quality gates**
        - Frontend type checking: 0 errors
        - Frontend linting: 0 violations
        - Tests: 703 passed, 5 pre-existing failures (MovieDetail expects `page=` in URLs)

- [x] **4.3 Create SequentialMovieGrid for A/B comparison**

    **Approach:** Sequential pagination uses `useInfiniteMovies` but displays discrete pages
    (not accumulated). Access `pages[currentIndex]` directly from TanStack Query.

    - [x] **4.3.a Create SequentialMovieGrid component**
        - Uses `useInfiniteMovies` for data fetching (same as infinite)
        - Extended `useInfiniteMovies` to expose `pages` array and `pageCount`
        - Tracks `currentPageIndex` state
        - Displays `pages[currentPageIndex].results` (discrete, not accumulated)
        - Integrates `SequentialPaginationCtrl` for prev/next navigation
        - "Next" calls `fetchNextPage()` if needed, then increments index
        - "Prev" decrements index (data already cached)

    - [x] **4.3.b Write tests for SequentialMovieGrid**
        - 14 tests covering: Initial load, next/prev navigation, cache behavior,
          variable page sizes, loading states, empty/error states, page indicator

    - [x] **4.3.c Add temporary sequential route for A/B testing**
        - Route: `/browse/sequential`
        - Created `BrowseSequential.tsx` page component
        - Added route constant `ROUTES.BROWSE_SEQUENTIAL`
        - Uses same `MovieCollectionLayout` as other browse routes

- [x] **4.4 Update URL handling (applies to both approaches)**

    - [x] **4.4.a Remove page params from URLs**
        - `MovieCard` now strips `page` and `tmdb_page_start` from generated links
        - `currentPage` prop deprecated (kept for backward compat with old grid)
        - `paginationUrlSync.ts` kept for legacy `MovieCollectionGrid` (not deleted yet)

    - [x] **4.4.b Update MovieCard link generation**
        - Updated `MovieCard.tsx` to skip page params in query string
        - Updated 4 tests in `MovieCard.test.tsx` to expect no page params
        - Updated 6 tests in `MovieCollectionGrid.integration.test.tsx`

    - [x] **4.4.c Update MovieDetail back navigation**
        - Updated `MovieDetail.tsx` to skip `page` and `tmdb_page_start` in back URL
        - Updated 20 tests in `MovieDetail.test.tsx` to expect no page params

- [x] **4.5 Run quality gates**
    - Frontend tests: 721 passed (all tests updated for no-page behavior)
    - Type checking: 0 errors
    - Linting: 0 violations
    - Both infinite (`/browse`) and sequential (`/browse/sequential`) routes functional

- [x] **4.5.a Add results header/footer chrome (pre-4.6 work)**

    **Context:** Before A/B testing, restored the results header/footer UI that existed in
    `MovieCollectionGrid` but was missing from the new grids.

    - [x] **Extended `useInfiniteMovies` to expose `totalResults`**
        - Added `totalResults` to hook return type (from first page response)

    - [x] **Created reusable header/footer components:**
        - `ResultsHeaderBar` - Results count text + optional pagination controls slot
        - `ResultsFooterBar` - Optional pagination controls slot with top border

    - [x] **Created `useResultsText` hooks for mode-specific formatting:**
        - `useInfiniteResultsText`: "X results" (simple total count)
        - `useSequentialResultsText`: "Showing X-Y of Z results" (discrete page range)
        - Both handle 10,000+ cap for large result sets

    - [x] **Wired components into grids:**
        - `InfiniteMovieGrid`: Header only (results count, no pagination controls)
        - `SequentialMovieGrid`: Header + footer with `SequentialPaginationCtrl`

    - [x] **Updated tests for new UI:**
        - Added `totalResults` to all mock hook returns in `SequentialMovieGrid.test.tsx`
        - Updated pagination button queries to use `getAllByLabelText` (header+footer = 2 controls)
        - Replaced "Page indicator" tests with "Results text formatting" tests

    **Deferred test refactoring (to Phase 7 cleanup):**
    - Test fixtures/helpers could be consolidated (mock hook return object created repeatedly)
    - Consider helper factory: `createMockInfiniteMoviesReturn({ pages, totalResults, ... })`
    - Defer until after Phase 4.6 decision - no need to over-invest in both pagination variants
    - If one variant is removed, its tests are deleted anyway

---

### ~~**Phase 5:** Scroll Restoration PoC (Virtualization Approach)~~ ✓

**Purpose:** Prove that infinite scroll + virtualization delivers satisfactory back-nav UX.
Success here unlocks the ADR decision for infinite scroll.

**Why virtualization:**

- Solves scroll position restoration (scroll-to-index APIs built-in)
- Solves long-scroll performance (only visible items rendered in DOM)
- Industry-standard pattern (Netflix, Twitter, etc.)
- Portfolio value: demonstrates production-grade engineering

**Approach change rationale (2025-12-15):**

Original plan was A/B test (Phase 4.6) → decision → scroll restoration (Phase 5).
Restructured to: scroll restoration PoC first → decision based on results.

This de-risks the infinite scroll commitment by proving the hardest UX requirement
(back-nav position preservation) before making the architectural decision.

- [x] **5.1 Research and select virtualization library**

    - [x] **5.1.a Evaluate candidate libraries**
        - **react-window**: React 19 incompatible (GitHub #793 closed "not planned"). Ruled out.
        - **react-virtuoso**: Attempted implementation. Issues discovered:
            - VirtuosoGrid lacks `initialTopMostItemIndex` (can't mount at scroll position)
            - `useWindowScroll` + scroll restoration has multiple documented bugs (#284, #658, #848)
            - CSS `gap` breaks internal measurements ("kryptonite" per docs)
            - Required `!important` overrides to make grid layout work
            - Conclusion: Bad fit for our window scroll + restoration + responsive grid requirements
        - **@tanstack/react-virtual**: Headless approach, more boilerplate but full control.
          Supports window scroll via `useWindowVirtualizer`, native `gap` option,
          manual scroll restoration via `initialOffset` (straightforward with fixed heights).

    - [x] **5.1.b Select library and document rationale**
        - **Selected: @tanstack/react-virtual**
        - **Rationale**: After failed react-virtuoso attempt, research confirmed @tanstack/react-virtual
          addresses all pain points: window scroll works reliably, CSS gap is first-class option,
          scroll restoration is manual but explicit (better than magic that doesn't work).
        - Trade-off: More boilerplate (dual-virtualizer pattern for responsive grid) but predictable behavior.
        - **Not ADR-worthy**: Library selection informed by practical failure, not architectural decision.

- [x] **5.2 Implement virtualized VirtualizedMovieGrid** (TDD approach)

    - [x] **5.2.a Write tests for VirtualizedMovieGrid** (test-first)
        - Created shared test utilities: `__tests__/grid-test-utils.tsx`
            - `createMockMovie`, `createMockMovies`, `createMockPage` factories
            - `createMockHookReturn` for `useInfiniteMovies` mock setup
            - Browser API mocks: IntersectionObserver, sessionStorage, window scroll, ResizeObserver
            - DRY: Reusable across all grid component tests
        - Created `VirtualizedMovieGrid.test.tsx` with 15 tests covering:
            - Virtualization: only visible items rendered (2 tests)
            - Loading states: skeleton + next-page spinner (2 tests)
            - Error handling: display + retry (2 tests)
            - Empty state (1 test)
            - Infinite scroll: fetch triggers + guards (4 tests)
            - Scroll persistence: save/restore/clear on filter change (3 tests)
            - Virtualizer configuration (1 test - estimateSize, gap)
        - Tests fail with expected "module not found" errors (TDD red phase)
        - Linting: 0 violations

    - [x] **5.2.b Install @tanstack/react-virtual and create component**
        - Installed `@tanstack/react-virtual` (added 2 packages)
        - Created `VirtualizedMovieGrid.tsx` (370 lines) with:
            - `useWindowVirtualizer` for window-level scroll virtualization
            - Row-based virtualization (calculates rows from movies + columnCount)
            - ResizeObserver for responsive column count (auto-fit 194px cards)
            - Near-bottom detection via virtualizer range for infinite scroll
            - Debounced fetchNextPage (150ms) to prevent rapid requests
            - Preserved loading/error/empty states from InfiniteMovieGrid
        - All 17 tests pass (TDD green phase)

    - [x] **5.2.c Implement scroll position persistence**
        - Save `window.scrollY` to sessionStorage on scroll (debounced 200ms)
        - Storage key: `scroll-{source}-{sortedFilterParams}` (filter-specific)
        - Restore via `initialOffset` option on mount
        - Filter change detection: prevScrollKeyRef tracks key changes
        - Quality gates: Linting 0, Type checking 0, Tests 17/17

    - [x] **5.2.d Wire up VirtualizedMovieGrid to browse routes**
        - Created `BrowseVirtualized.tsx` page component
        - Added `ROUTES.BROWSE_VIRTUALIZED` constant
        - Wired up route in App.tsx: `/browse/virtualized`
        - Quality gates: Linting 0, Type checking 0

- [x] **5.3 Validate back-nav experience**

    - [x] **5.3.a Manual testing scenarios**
        - Back navigation: position restored ✓
        - Filter change: correctly resets to top ✓
        - Long scroll (200+ items): smooth performance ✓
        - Bugs found and fixed during testing:
            - Continuous auto-loading on param change (virtualizer seeing stale scroll position)
            - Column count dropping to 1 on filter removal (ResizeObserver on unmounting Box)
            - Browser refresh behavior (browser scroll restoration race, page height timing)
            - sessionStorage cleanup (added max 20 stored positions)
            - Error state scroll reset (scrolls to top on fetch error)

    - [x] **5.3.b Document results and go/no-go decision**
        - Restoration is instantaneous for back-nav (cached data)
        - Refresh starts at top (expected - no pre-fetching of pages)
        - **Go decision:** UX is acceptable for infinite scroll commitment
        - App-level `history.scrollRestoration = 'manual'` set in main.tsx

- [x] **5.4 Refactor grid components and organize directory structure**

    - Created `collection/shared/` with extracted utilities and components
    - Net reduction of ~239 lines through DRY consolidation

    - [x] **5.4.a Extract shared grid utilities**
        - `gridConstants.ts`: CARD_WIDTH, GAP, SKELETON_COUNT, placeholderMovie, calculateColumnCount
        - `scrollPersistence.ts`: getScrollStorageKey, getSavedScrollPosition, saveScrollPosition, etc.

    - [x] **5.4.b Extract shared UI components**
        - `GridErrorState.tsx`, `GridEmptyState.tsx`, `GridSkeletonLoader.tsx`
        - Reusable across all grid implementations

    - [x] **5.4.c Update grid components to use shared code**
        - All three grids (Virtualized, Infinite, Sequential) now import from shared/

    - [x] **5.4.d Organize collection directory structure**
        - Moved hooks to `src/hooks/`: useMovieCollectionState.ts, useMovieCollectionUrl.ts
        - Moved grid tests to `collection/__tests__/grids/`

    - [x] **5.4.e Preserve non-virtualized grids**
        - InfiniteMovieGrid, SequentialMovieGrid, SequentialPaginationCtrl retained
        - MovieCollectionGrid + MoviePaginationCtrl stay until Phase 7-8

- [x] **5.5 Quality gates**
    - Frontend tests: 763 passed
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 6:** ADR Decision - Commit to Infinite Scroll

**Purpose:** Based on Phase 5 results, make final architectural decision.

**Prerequisites:** Phase 5.3.b documents satisfactory back-nav UX (Go decision).

- [x] **6.1 Create ADR and update strategy docs**
    - **ADR-020:** `adr-020-adopt-virtualized-infinite-scroll-for-browse.md`
        - Context: Buffer mechanism path-dependency, random-access broken, industry research
        - Alternatives: Random-access (broken), sequential (Letterboxd - friction), virtualized (chosen)
        - Decision: @tanstack/react-virtual + @tanstack/react-query + sessionStorage scroll restoration
    - **strategy-pagination.md v1.1:** Added Virtualization and Scroll Restoration sections
    - **strategy-data-quality.md:** Verified accurate, no changes needed (cross-refs pagination)

- [x] **6.2 Apply post-decision UI refinements**
    - Renamed `ResultsHeaderBar` → `GridHeader` (clearer naming for header section of grids)
    - Added `title` prop to `GridHeader` for integrated title+results layout
    - Added `renderPageHeader` prop to `MovieCollectionLayout`
    - Updated all grid components to support title in GridHeader when PageHeader disabled
    - Route config: browse routes use `renderPageHeader={false}` (title in GridHeader)
    - Route config: sequential route uses `renderPageHeader={true}` (reference - title in PageHeader)

- [x] **6.3 Migrate main browse routes to VirtualizedMovieGrid**
    - Updated `Browse.tsx`, `NowPlaying.tsx`, `Upcoming.tsx` to use `VirtualizedMovieGrid`
    - Removed `InfiniteMovieGrid.tsx` and its test file (redundant - VirtualizedMovieGrid provides same
      infinite scroll behavior with virtualization; SequentialMovieGrid provides behavioral alternative)
    - Updated comment references in GridHeader, SequentialMovieGrid, gridConstants, grid-test-utils, ResultsFooterBar

- [x] **6.4 Remove virtualized temp route**
    - Removed `/browse/virtualized` route from App.tsx
    - Deleted `BrowseVirtualized.tsx` page component
    - Removed `ROUTES.BROWSE_VIRTUALIZED` constant
    - Updated `BrowseSequential.tsx` comment to reflect "reference implementation" status

---

### **Phase 7:** Search Results Migration & Random-Access Cleanup

**Purpose:** Migrate search to virtualized infinite scroll and remove obsolete random-access pagination.

- [x] **7.1 Analyze current search implementation**
    - SearchResults.tsx is minimal (31 lines) - just extracts query, redirects if empty, renders grid
    - MovieCollectionGrid.tsx (279 lines) - complex random-access with `tmdb_page_start` ref tracking
    - MoviePaginationCtrl.tsx (321 lines) - jump-to-page UI with smart pagination algorithm
    - Migration straightforward: both grids use same `useMovieCollectionContext` hook
    - Test files to delete: 3 files, ~1,562 lines total
    - Potential unused hooks after migration: `usePageChangeHandler`, `usePaginationDisplay`

- [x] **7.2 Migrate search to virtualized infinite scroll**

    - [x] **7.2.a Update SearchResults.tsx**
        - Replaced `MovieCollectionGrid` import with `VirtualizedMovieGrid`
        - Query param handling unchanged (already handled in component)
        - Scroll persistence automatic via VirtualizedMovieGrid's query key

    - [x] **7.2.b Test search-specific behaviors**
        - Verified: New search query resets results and scroll position
        - Verified: Back-nav from search result detail restores position
        - Verified: Refresh after back-nav resets to top (not restore)

- [x] **7.3 Fix search scroll restoration bugs**

    **Context:** Fixed three scroll restoration issues: inconsistent query handling,
    race condition on back-nav, and fresh load detection with cached data.

    - [x] **7.3.a Remove `query` from browseParams URL parsing (root cause fix)**
        - Removed `query` from `BrowseParams` interface in `browseTypes.ts`
        - Removed `query` from `DEFAULT_BROWSE_PARAMS` in `browseDefaults.ts`
        - Removed query parsing from `parseBrowseParamsFromUrl` in `browseUrlSync.ts`
        - Removed `addQuery` helper from `browseParamMapper.ts`
        - Removed query checks from `hasActiveFilters` and `countActiveParams` in `browseParamUtils.ts`
        - Removed bandaid fixes from `VirtualizedMovieGrid.tsx` (stableBrowseParams, paramsWithoutQuery)
        - Updated `MovieCollectionLayout.tsx` to use `searchQuery` directly (no fallback to browseParams.query)
        - Updated tests: browseUrlSync.test.ts, browseParamUtils.test.ts, useMovieCollectionState.test.tsx,
          useMovieFetchRouter.test.ts, ClearBrowseParamsButton.test.tsx
        - All quality gates pass (type checking, linting, 746 tests)

    - [x] **7.3.b Fix scroll position race condition on back-nav**

        **Problem:** Scroll restoration was inconsistent - position would be partially restored
        then immediately overwritten with wrong value. Affected both browse and search.

        **Root cause:** Race condition between `window.scrollTo()` and virtualizer rendering.
        When navigating back, scroll was attempted before virtualizer had full content height,
        causing browser to scroll only as far as possible. Scroll handler then saved this
        wrong (partial) position, overwriting the correct saved value.

        **Fix implemented:**
        - Added `isRestoringScrollRef` guard to prevent saving during restoration
        - Re-scroll after layout (rAF + 50ms timeout) to catch full content height
        - Clear guard after 100ms to allow normal saving
        - Added cleanup on unmount for timeouts

        **Note:** Original hypothesis about ~600px offset was correct - it was a timing issue.
        The offset varied based on how much content the virtualizer had rendered at scroll time.

    - [x] **7.3.c Fix scroll position not resetting on fresh page load**

        **Problem:** Scroll position doesn't reset to top on fresh page load (page refresh,
        direct navigation) when TanStack Query cache is still valid.

        **Root cause:** The `hadCachedDataOnMountRef` heuristic (`!isLoading && movies.length > 0`)
        couldn't distinguish between back-navigation and page refresh - both scenarios have
        cached data on mount when cache is valid.

        **Solution:** Replaced cache-based heuristic with explicit location state signaling
        plus state clearing to handle refresh-after-back-nav edge case:

        - Created `BackToCollectionLink` component that passes `state={{ restoreScroll: true }}`
        - `VirtualizedMovieGrid` captures state in ref on mount, then clears it via `navigate()`
        - Back-nav: state captured → scroll restored → state cleared
        - Refresh after back-nav: state already cleared → reset to top

        **Why state clearing:** Location state persists across page refresh for the same
        history entry. Performance API (`navigation.type`) can't distinguish SPA navigation
        from the original page load type. Clearing state after consuming ensures refresh
        won't incorrectly restore.

        **Files changed:**
        - New: `components/navigation/BackToCollectionLink.tsx` - Reusable back link component
        - Modified: `VirtualizedMovieGrid.tsx` - Uses `shouldRestoreScrollRef` + state clearing
        - Modified: `MovieDetail.tsx` - Uses `BackToCollectionLink` component
        - Modified: `grid-test-utils.tsx` - Added MemoryRouter to `renderWithProvider`
        - Modified: `VirtualizedMovieGrid.test.tsx` - Updated scroll restore test with location state

    - [x] **7.3.d Extract scroll persistence to reusable hook (refactor)**

        Extracted ~150 lines of scroll persistence logic from VirtualizedMovieGrid into
        a reusable `useScrollPersistence` hook for PersonGrid and future virtualized lists.

        **Architecture:**

        ```
        hooks/movie/useScrollPersistence.ts (new) - React behavior/orchestration
            └── components/movie/collection/shared/scrollStorage.ts (renamed)
        ```

        **Changes:**
        - Renamed `scrollPersistence.ts` → `scrollStorage.ts`
        - Created `hooks/movie/useScrollPersistence.ts` with extracted logic
        - Hook returns `{ initialOffset }` (manages scroll listener internally)
        - Updated VirtualizedMovieGrid to use new hook (447 → 299 lines)
        - Added 10 tests for useScrollPersistence hook
        - All frontend tests passing at time of completion

- [x] **7.4 Remove obsolete random-access pagination**

    Removed random-access pagination components and their tests. These were superseded
    by VirtualizedMovieGrid with infinite scroll.

    - [x] **7.4.a Delete random-access components**
        - Deleted `MovieCollectionGrid.tsx` (279 lines)
        - Deleted `MoviePaginationCtrl.tsx` (321 lines)

    - [x] **7.4.b Delete associated tests**
        - Deleted `MovieCollectionGrid.integration.test.tsx`
        - Deleted `MovieCollectionGrid.stability.test.tsx`
        - Deleted `MoviePaginationCtrl.test.tsx`
        - Total: 61 tests removed (~1,562 lines)

    - [x] **7.4.c Clean up imports and exports**
        - Removed deprecated `currentPage` prop from MovieCard
        - Updated useMovieCollectionContext comments to reference VirtualizedMovieGrid
        - No index file exports needed (components not exported)

- [x] **7.5 Quality gates**
    - Frontend tests: 695 passing (61 removed with deleted files)
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 8:** Expand Frontend Test Coverage ✓

**Purpose:** Address critical test coverage gaps for scroll persistence, virtualization, and
infinite scroll behavior before finalizing the migration.

**Result:** Added 83 tests across 5 areas. Frontend test suite: 778 tests passing.

| Area                    | Before | After    | Notes                                           |
|-------------------------|--------|----------|-------------------------------------------------|
| scrollStorage utilities | 0      | 40 tests | Key generation, save/retrieve, cleanup, errors  |
| BackToCollectionLink    | 0      | 28 tests | URL building, param filtering, rendering        |
| useScrollPersistence    | 10     | 16 tests | +6 edge cases (rapid scroll, unmount, guards)   |
| useInfiniteMovies       | 10     | 15 tests | +5 edge cases (empty page, cursor, concurrent)  |
| VirtualizedMovieGrid    | 17     | 21 tests | +4 edge cases (resize, few results, small fetch)|

- [x] **8.1 Add scrollStorage utility tests**

    **File:** `components/movie/collection/shared/__tests__/scrollStorage.test.ts`

    Created 40 tests covering all exported functions with behavior verification.

    - [x] **8.1.a Test storage key generation** (15 tests)
        - Key structure, param sorting, array handling, falsy filtering, special chars

    - [x] **8.1.b Test scroll position save/retrieve** (10 tests)
        - Round-trip persistence, missing keys, edge values (0, large numbers)

    - [x] **8.1.c Test cleanup logic (MAX_STORED_POSITIONS)** (8 tests)
        - Under/at limit behavior, current key protection, FIFO removal

    - [x] **8.1.d Test error handling** (5 tests)
        - Graceful degradation: getItem/setItem throws, quota exceeded, iteration errors

    - Integration scenarios (3 tests) - filter differentiation, multi-save behavior

- [x] **8.2 Add BackToCollectionLink tests**

    **File:** `components/navigation/__tests__/BackToCollectionLink.test.tsx`

    Created 28 tests covering URL building, param filtering, rendering behavior.

    - [x] **8.2.a Test URL building from search params** (8 tests)
        - search/browse/preset routes, default handling, filter preservation

    - [x] **8.2.b Test parameter filtering** (6 tests)
        - Excludes page/tmdb_page_start/from, includes filters, URL encoding

    - [x] **8.2.c Test location state** (3 tests)
        - Renders as Link, clickable, no text decoration

    - [x] **8.2.d Test component rendering** (7 tests)
        - Label text, custom labels, button, variants, arrow indicator

    - Edge cases (4 tests) - empty params, unknown from values, ordering

- [x] **8.3 Scroll persistence integration tests** (skipped - sufficient coverage)

    **Assessment:** Full integration tests skipped. Confident in coverage because:

    1. **Hook-level tests verify real behavior** (16 tests in useScrollPersistence.test.tsx):
       - Back-navigation restore, filter change resets, refresh behavior
       - Edge cases: rapid scrolling, unmount during debounce, restoration guards

    2. **Utility tests verify storage logic** (40 tests in scrollStorage.test.ts):
       - Key generation, save/retrieve, cleanup, error handling

    3. **Component tests verify integration points** (21 tests in VirtualizedMovieGrid.test.tsx):
       - Virtualizer receives correct initialOffset, scroll persistence save/restore

    **Why not full integration tests?** TanStack Virtual has no official testing guide.
    Research (external-research-analyst) found the ideal approach requires mocking
    browser APIs (ResizeObserver, getBoundingClientRect, scrollTo) while letting
    the real hook run. Effort: 4-8 hours. Given our hybrid coverage (real hook tests
    and component tests with mocked virtualizer), marginal value doesn't justify cost.

- [x] **8.4 Add edge case and race condition tests**

    - [x] **8.4.a useScrollPersistence edge cases** (6 tests added)
        - Large position, rapid 16ms scrolling, unmount during debounce
        - Position 0 handling, genre key differentiation, restoration guard

    - [x] **8.4.b VirtualizedMovieGrid edge cases** (4 tests added)
        - rowCount calculation, few results, single result, small content fetch

    - [x] **8.4.c useInfiniteMovies edge cases** (5 tests added)
        - Empty middle page, cursor null after non-null, query key reference
        - Concurrent fetchNextPage, page 0 response handling

- [x] **8.5 Quality gates**
    - 778 frontend tests passing (increased from ~695)
    - Type checking: 0 errors
    - Linting: 0 violations

---

### **Phase 9:** Final Cleanup and Documentation ✓

**Purpose:** Clean up remaining obsolete code and update documentation.

**Note:** `MovieCollectionGrid` and `MoviePaginationCtrl` removed in Phase 7.
`SequentialMovieGrid` and related components retained as reference implementations (Task 5.4.e).

- [x] **9.1 Clean up remaining obsolete code** ✓

    - [x] **9.1.a Review and clean unused utilities** ✓
        - Deleted `paginationUrlSync.ts` + test (40 tests) - dead code chain
        - Deleted `usePageChangeHandler.ts` - completely unused
        - Deleted `usePaginationDisplay.ts` + test (16 tests) - completely unused
        - Refactored `useMovieCollectionUrl.ts` - removed pagination, now browse-params only
        - Refactored `useMovieCollectionState.ts` - removed pagination from interface
        - Refactored `useMovieCollectionContext.ts` - removed pagination from interfaces
        - Updated `MovieCollectionLayout.tsx` - removed pagination from outlet context
        - Updated test mocks in `useMovieCollectionState.test.tsx`
        - **Net test reduction:** 778 → 722 tests (56 dead code tests removed)
        - API pagination types in `api.ts` retained (auto-generated, still used by backend)

    - [x] **9.1.b Clean up unused exports and imports** ✓
        - Verified: No dead exports in index files (none exported deleted utilities)
        - Verified: ESLint clean - no unused imports detected
        - Verified: Build passes with no unused import warnings
        - Note: `hasAdvancedFilterValues` export retained (intentional public API per docstring)

    - [x] **9.1.c Evaluate test helper consolidation** ✓ (deferred from Task 4.5.a)
        - Evaluated: `createMockHookReturn()` already exists in `grid-test-utils.tsx`
        - Pattern matches requested factory: accepts `{ movies, pages, totalResults, hasNextPage, ... }`
        - Central mocks in `tests/mocks/movieData.ts` for general movie data
        - Grid-specific utilities in `grids/grid-test-utils.tsx` for component tests
        - **Decision:** Consolidation already complete from Phase 8 - no changes needed

- [x] **9.2 Update project documentation** ✓

    - [x] **9.2.a Update frontend modernization plan** ✓
        - Updated `plan-frontend-modernization.md` TanStack Query section
        - Documented implemented scope (browse/search infinite scroll)
        - Preserved broader evaluation framing for further adoption opportunities
        - Listed unexplored benefits: background refetch, deduplication, cache invalidation, optimistic updates

    - [x] **9.2.b Add virtualization patterns to strategy docs** ✓
        - Already documented in `strategy-pagination.md` v1.1 (updated earlier this session)
        - Virtualization section: library choice (@tanstack/react-virtual), rationale, implementation
        - Scroll Restoration section: three-layer approach, sessionStorage persistence
        - Key Files Reference: all relevant files documented

- [x] **9.3 Final quality gates** ✓
    - All frontend tests passing (722 tests) - verified after Task 9.1.a
    - TypeScript: 0 errors - verified after Task 9.1.a
    - ESLint: 0 violations - verified after Task 9.1.a
    - No code changes since last quality gate run (9.2 was docs-only)

---

### **Phase 10:** Manual Verification and Sign-off

**Purpose:** End-to-end manual testing of all affected flows.

- [x] **10.1 Browse flow verification** ✓
    - Load `/browse/popular` - virtualized infinite scroll works ✓
    - Scroll down, content loads automatically ✓
    - Apply filters - results reset, scroll to top ✓
    - Change sort - results reset correctly ✓
    - QuickBrowseBar collapses/expands correctly ✓
    - "Back to top" button appears and works ✓
    - Long scroll (200+ items) - smooth performance, no jank ✓

- [x] **10.2 Navigation flow verification** ✓
    - Browse → scroll 50+ items → MovieDetail → back → scroll position restored ✓
    - Browse with filters → MovieDetail → back → filters AND position preserved ✓
    - Browse → search → back → browse state and position correct ✓
    - **Issue found and fixed:** Scroll position not restored with year filters
        - **Root cause:** `useMovieCollectionUrl` initialized `browseParams` with defaults
        via useState, then synced from URL via useEffect. Scroll restoration happened
        before URL sync, so scroll key was calculated with wrong params (missing filters).
        - **Fix:** Initialize browseParams directly from URL in useState initializer
        (`parseBrowseParamsFromUrl(location.search)`) instead of defaults.
        - **Modified:** `frontend/src/hooks/movie/useMovieCollectionUrl.ts`
        - **Tests:** 146 related tests pass (scrollStorage, useScrollPersistence,
        useMovieCollectionState, VirtualizedMovieGrid)

- [x] **10.3 Search flow verification** ✓
    - Search for movies - virtualized infinite scroll works ✓
    - New search resets results and position ✓
    - Search → detail → back → position restored ✓
    - Empty search handled gracefully ✓

- [x] **10.4 Edge case verification** ✓
    - Very restrictive filters (few results) - end state correct ✓
    - No results - empty state displayed ✓
    - Network error - error state with retry ✓
    - Rapid scrolling - no duplicate fetches, no errors ✓
        - **Note:** `flushSync` console warning may appear on rapid direction reversal.
          This is a known cosmetic issue in @tanstack/react-virtual when scroll events
          fire during React's render cycle. No functional impact; acceptable trade-off.
    - Cache expiry (30+ min away) - graceful degradation (start at top) ✓
        - Not practically testable; by design starts at top if TanStack Query cache expired

---

## Success Criteria

- [x] Virtualized infinite scroll replaces pagination for browse and search ✓
- [x] Back navigation restores exact scroll position (virtualization-powered) ✓
- [x] Long scroll sessions perform smoothly (200+ items, no jank) ✓
- [x] QuickBrowseBar collapses on scroll down, expands on scroll up ✓
- [x] "Back to top" button available for quick return ✓
- [x] Filter changes reset results and scroll position appropriately ✓
- [x] No regression in data quality (buffer mechanism still works) ✓
- [x] TanStack Query properly integrated and configured ✓
- [x] ADR documents pagination approach decision with rationale ✓
- [x] All obsolete pagination code removed ✓
- [x] All quality gates pass (tests, linting, type checking) ✓
- [x] Pre-existing `MovieDetail.test.tsx` pagination test failures resolved ✓
    - All 18 MovieDetail tests now passing
- [x] Ready for archival ✓

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
