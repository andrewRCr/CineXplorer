# Incidental: Navigation & Filter State Preservation

**Created:** 2025-10-29
**Branch:** `technical/service-layer-modernization`
**Status:** Complete ✅

## Context

**Discovered:** Manual testing during Phase 3.6 (data quality filtering implementation in
pagination-buffer-tracking.md)

**Interrupts:** `tasks-pagination-buffer-tracking.md` at Phase 3.6, Task 3.6.e (manual verification)

**Problem:** Custom "Back to Results" button loses filter query params (blank screens), and advanced panel
collapses when navigating back despite active filters.

**Why Now:** Blocks manual testing confidence for pagination work, affects UX of newly implemented filtering
features, and orthogonal navigation domain allows isolated fix without interfering with filter logic.

## Root Cause Analysis

### Issue 1: Back Button Filter Loss

**Affected Files:**

- `frontend/src/components/movie/MovieCard.tsx` (lines 133-139)
- `frontend/src/pages/movie/MovieDetail.tsx` (lines 116-120)
- `frontend/src/components/movie/collection/MovieCollectionGrid.tsx` (lines 189-193)

**Problem:** Custom "Back to Results" button only passes `page`, `from`, `query` params, ignoring minYear,
maxYear, genres, rating filters, etc.

**Workaround:** Browser back button works (uses full history state)

### Issue 2: Advanced Panel Collapse

**Affected Files:**

- `frontend/src/components/movie/collection/useMovieCollectionState.tsx`

**Problem:** `showAdvanced` UI state not preserved when navigating detail→back. User applies advanced filters
(e.g., rating 1.0-3.5), panel expands, navigates to detail, clicks back, panel collapses even though filters
still active.

**Current Implementation:** Effect-based auto-expand implemented with 18/18 tests passing, but needs browser
verification.

### Issue 3: Test Coverage Gaps

**Problem:** Missing comprehensive state management integration tests. Without thorough test coverage, manual
testing is the only verification method, which is time-consuming and error-prone.

## Scope

### Will Do

- Fix "Back to Results" button to preserve all filter query params
- Complete `showAdvanced` fix (verify effect-based solution in browser)
- Comprehensive automated tests for URL param preservation
- Comprehensive automated tests for UI state preservation across navigation
- Integration tests for navigation flows and edge cases
- Regression testing for existing navigation
- Manual verification of all navigation flows with filters

### Won't Do

- Deep linking optimization (separate enhancement)
- Advanced history state management refactoring (current solution works)
- Performance optimization of state updates (premature)
- Filter state management restructuring (works correctly, navigation is the issue)

---

## Tasks

### **Phase 1:** Write Tests for URL Parameter Preservation

- [x] **1.1 Create test for MovieCard query string in `MovieCard.test.tsx`** ✅

    **Completed:** Added 6 comprehensive tests for URL parameter preservation in MovieCard.test.tsx:133-139

    - Test: All filter params included in detail page link
    - Test: Preserves filter params from URL search params
    - Test: Unknown params preserved (forward compatibility)
    - Test: Empty filter params handled correctly
    - Test: Genres array parameter correct format
    - Test: URL-encodes special characters
    - Tests FAIL as expected (implementation incomplete)

- [x] **1.2 Create test for MovieDetail back button URL in `MovieDetail.test.tsx`** ✅

    **Completed:** Created comprehensive test suite with 20 tests covering:

    - Basic back URL construction (4 tests)
    - Search vs collection routes (5 tests)
    - Filter combinations (5 tests)
    - Edge cases (4 tests)
    - Loading and error states (2 tests)
    - Tests FAIL as expected (implementation incomplete)

- [x] **1.3 Create integration test in `MovieCollectionGrid.integration.test.tsx`** ✅

    **Completed:** Created integration test suite with 11 tests covering:

    - Apply filters → navigate to detail (3 tests)
    - Multiple navigation cycles (1 test)
    - Different route types (3 tests)
    - Complex filter combinations (2 tests)
    - Edge cases (2 tests)
    - Also created reusable `test-renderer-with-routes.tsx` helper for future integration tests
    - Tests FAIL as expected (implementation incomplete)

### **Phase 2:** Implement URL Parameter Preservation

- [x] **2.1 Update MovieCard query string construction** ✅

    **Completed:** Modified MovieCard.tsx to read all URL parameters via useSearchParams() and
    preserve them in detail page links.

    - [x] **2.1.a Modify `MovieCard.tsx` to capture all URL params** ✅
        - Added `useSearchParams` import from react-router-dom
        - Refactored `queryString` memoization to read all params from URL
        - Preserves all filter params (minYear, maxYear, genres, ratings, runtime, sortBy)
        - Maintains backward compatibility with props (currentPage, source, query)
        - Preserves unknown params for forward compatibility
        - All parameters properly URL-encoded
        - File: `components/movie/MovieCard.tsx:28,133-171`

    - [x] **2.1.b Run MovieCard tests - should now PASS** ✅
        - Fixed test setup to use `renderWithRoute` with proper search params
        - Updated test expectation for URL-encoded genres parameter (28%2C12)
        - All 32 MovieCard tests now pass (6/6 URL preservation tests passing)
        - 0 type errors, 0 lint violations

- [x] **2.2 Update MovieDetail back button URL** ✅

    **Completed:** Modified MovieDetail.tsx to preserve all URL parameters in back button,
    extracted back button into reusable component, and added back button to loading/error
    states for better UX.

    - [x] **2.2.a Modify `MovieDetail.tsx` back URL construction** ✅
        - Created `allParams` memo to capture all URL parameters (lines 47-53)
        - Extracted back button into `BackButton` memoized component (lines 62-93)
        - Filters out empty parameter values to keep URLs clean
        - Properly URL-encodes all parameters
        - **Bonus improvement:** Back button now visible during loading/error states
        - Refactored to eliminate code duplication (DRY principle)
        - File: `pages/movie/MovieDetail.tsx:47-93,131-150,160-163`

    - [x] **2.2.b Run MovieDetail tests - should now PASS** ✅
        - Fixed test helper to use `renderWithRoute` with proper routing context
        - Updated test assertions for URL-encoded genres parameter
        - All 20 MovieDetail tests now pass (18 URL preservation + 2 loading/error state)
        - 0 type errors, 0 lint violations

- [x] **2.3 Verify MovieCollectionGrid compatibility** ✅

    **Completed:** Verified MovieCollectionGrid correctly passes parameters to MovieCard, confirmed dual-source pattern
    works as intended, and validated with integration tests.

    - [x] **2.3.a Review MovieCollectionGrid integration code** ✅
        - Confirmed MovieCollectionGrid passes currentPage, source, query props to MovieCard (lines 204-209)
        - Verified parameter flow: useMovieCollectionContext → MovieCollectionGrid → MovieCard
        - Validated dual-source pattern: URL provides filters, props provide page/source/query
        - Props correctly override URL values (parent controls pagination state)
        - No code changes needed - integration already correct

    - [x] **2.3.b Run integration tests - should now PASS** ✅
        - Updated 3 test assertions for URL-encoded genres parameter
        - All 11 MovieCollectionGrid integration tests now pass
        - Tests verify: filter preservation, navigation cycles, different routes, complex filter combinations
        - 0 type errors, 0 lint violations

### **Phase 3:** UI State Preservation Tests and Verification

- [x] **3.1 Review and enhance showAdvanced state test coverage** ✅

    **Completed:** Comprehensive review of 18 existing tests confirms excellent coverage.

    - [x] **3.1.a Review existing test coverage** ✅

        **Analysis Complete:**

        **Well-Covered Areas (18 tests total):**
        - Smart initialization from URL (6 tests): rating filters, year range, single year, genres only, no filters, remount
        - Manual toggle behavior (2 tests): toggle function, direct setter
        - Derived state hasAdvancedFilters (4 tests): rating, year range, single year, genres
        - Clear filters action (1 test): clears and collapses
        - Filter state management (3 tests): partial updates, count, hasActiveFilters
        - Non-URL-synced mode (2 tests): local state, defaultFilters auto-expand

        **Coverage Gaps Identified:**
        - Runtime filters auto-expand (implementation lines 202-204 NOT tested)
        - Effect dependency changes (filter updates after mount)
        - Manual collapse after auto-expand (user override behavior)
        - resetToDefaults action (untested)
        - isFiltersCollapsed state (no tests)

        **Gap Assessment:** All critical navigation flows already covered. Gaps are edge cases that don't
        block Phase 3 goals. Runtime filter auto-expand is implemented but rarely used (users typically
        select preset ranges). Manual override after auto-expand is UX edge case. Integration tests exist
        (Phase 2) for actual navigation.

    - [x] **3.1.b Determine need for integration tests** ✅

        **Decision:** No new integration tests needed for showAdvanced.

        **Rationale:**
        - Phase 2 already has 11 comprehensive integration tests covering full navigation flows
        - Test at useMovieCollectionState.test.tsx:171-213 already covers remount scenario
        - Effect-based auto-expand logic is simple and deterministic
        - All critical state transitions have unit test coverage
        - Manual browser verification (Task 3.2) will catch any real-world issues

        **Minor gaps (runtime, resetToDefaults) are low-priority edge cases not worth delaying for.**

        **Integration Discovery:** The hook exists with 18 passing tests but is NOT wired to production.
        `MovieCollectionLayout.tsx` uses manual `useState(false)` instead of the tested hook. Task 3.2
        will integrate the hook to enable auto-expand functionality.

- [x] **3.2 Integrate useMovieCollectionState into MovieCollectionLayout** ✅

    **Completed:** Successfully wired up the tested hook to production, enabling auto-expand functionality.

    - [x] **3.2.a Replace useState pattern in MovieCollectionLayout** ✅
        - Replaced `useMovieCollectionUrl` import with `useMovieCollectionState`
        - Removed manual `useState` for `showAdvanced` and `isFiltersCollapsed`
        - Destructured hook returns:
          `filters`, `onFiltersChange`, `currentPage`, `onPageChange`, `showAdvanced`,
          `toggleAdvanced`, `isFiltersCollapsed`, `toggleFiltersCollapsed`
        - Updated FilterSection props to use `toggleAdvanced` and `toggleFiltersCollapsed` directly
        - All component props and outlet context working correctly
        - File: `components/movie/collection/MovieCollectionLayout.tsx:1,12,72-85,159,161`

    - [x] **3.2.b Run frontend tests to verify no regressions** ✅
        - All 453 tests passing (25 test files)
        - Hook's 18 tests passing (included in total)
        - 0 type errors, 0 lint violations
        - Test duration: 8.07s

    - [x] **3.2.c Remove truly dead code** ✅
        - Removed `resetToDefaults` action from interface (line 60)
        - Removed `resetFilters` memo and `resetToDefaults` callback (lines 249-265)
        - Removed `resetToDefaults` from return object (line 285)
        - Tests still passing: 453/453 ✅
        - File: `components/movie/collection/useMovieCollectionState.tsx:60,249-265,272`

- [x] **3.3 Manual browser verification of showAdvanced auto-expand**

    **Verified:** Auto-expand works as intended - panel stays expanded when returning with advanced filters.

    **Note:** Investigation revealed dead code (`isFiltersCollapsed`, `browseLayout` distinction, decade handling
    in browseParamMapper). Created atomic task for cleanup - separate concern from navigation/state preservation.

### **Phase 4:** URL Parsing Robustness Tests ✅

**Scope revision (2025-12-09):** Original tasks (navigation flow, rapid navigation, browser back/forward)
were either already covered by `MovieCollectionGrid.integration.test.tsx` or untestable in JSDOM.
Refocused to address the actual gap: `browseUrlSync.ts` has zero tests despite handling URL parsing.

- [x] **4.1 Write tests for `browseUrlSync.ts`** ✅

    **Completed:** Created `frontend/src/utilities/__tests__/browseUrlSync.test.ts` with 37 tests covering
    `parseBrowseParamsFromUrl()` function. Tests organized into three describe blocks matching subtask structure.

    - [x] **4.1.a Valid URL parsing scenarios** (13 tests)
        - Empty/minimal search strings return defaults
        - Single params, arrays, all params together
        - Defaults applied for missing parameters

    - [x] **4.1.b Invalid/malformed URL handling** (10 tests)
        - Invalid genre IDs filtered (NaN check)
        - Non-numeric year/rating passed through as-is (current behavior documented)
        - Unknown sortBy passed through (type coercion)
        - Unknown params ignored

    - [x] **4.1.c Edge cases** (14 tests)
        - Empty param values, trailing/leading commas
        - URL encoding, unicode, whitespace preservation
        - Stress tests (long values, many genres)

- [x] **4.2 Quality gate** ✅
    - [x] 4.2.a Full frontend test suite: 546 tests pass (37 new)

### **Phase 5:** Quality Gates & Manual Verification ✅

- [x] **5.1 Run automated quality checks** ✅
    - [x] 5.1.a Frontend tests: 549 pass (37 browseUrlSync + 3 user override bugfix)
    - [x] 5.1.b Frontend linting: 0 violations
    - [x] 5.1.c Frontend type checking: 0 errors
    - [x] 5.1.d Backend tests: 611 pass

- [x] **5.2 Comprehensive manual testing** ✅

    **Goal:** Build confidence through systematic manual verification.

    - [x] **5.2.a Test URL param preservation across routes**
        - Popular: year 1980-1983 → detail → back → verify filters
        - Popular: genres Action+Comedy → detail → back → verify
        - Popular: rating 7.0-10.0 → detail → back → verify
        - Popular: ALL filters → detail → back → verify
        - Now Playing with filters → detail → back
        - Top Rated with filters → detail → back
        - Upcoming with filters → detail → back
        - Search with query + filters → detail → back

    - [x] **5.2.b Test advanced panel state preservation**
        - Rating filter (panel expands) → detail → back → verify expanded
        - Year range (panel expands) → detail → back → verify expanded
        - Single year (collapsed) → detail → back → verify collapsed

    - [x] **5.2.c Test pagination + navigation**
        - Filters active → page 2 → detail → back → verify page 2 + filters
        - Filters active → page 3 → detail → back → detail → back → verify state

    - [x] **5.2.d Test browser navigation**
        - Verify browser back still works
        - Verify browser forward works
        - Verify history state correct

    **Note:** Search backward nav bug discovered and fixed during 5.2 testing.
    See "Search/Browse Architecture Cleanup" in `completed-atomic-2025-q4.md`.

**Bugfix(es) discovered during 5.2 testing:**

- User override for advanced panel wasn't working for genre-based or certification-based advanced filters.
Root cause: `getAdvancedFilterHash()` only included rating, year range, and language - not genres or certifications.
Fixed by adding all advanced filter conditions to the hash. Added 3 new tests to prevent regression.

---

## Success Criteria

- [x] "Back to Results" button preserves ALL active filters
- [x] Advanced panel stays expanded when returning to filtered results
- [x] Navigation works for all routes: Popular, Now Playing, Top Rated, Upcoming, Search
- [x] Filter combinations work: year + genres, rating + year, all together
- [x] Browser back button continues to work as expected
- [x] Comprehensive test suite gives confidence in navigation/state behavior
    - 573 frontend tests (including 37 browseUrlSync, 11 routeConfigHelper.search, 13 searchUrlSync)
    - 611 backend tests
- [x] Manual testing confirms all flows work in browser
- [x] Zero regressions in existing navigation

---
