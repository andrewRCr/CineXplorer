# Incidental: Navigation & Filter State Preservation

**Created:** 2025-10-29
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress

## Context

**Discovered:** Manual testing during Phase 3.6 (data quality filtering implementation in
pagination-buffer-tracking.md)

**Interrupts:** `.arc/active/incidental/tasks-pagination-buffer-tracking.md` at Phase 3.6, Task 3.6.5
(manual verification)

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

- [ ] **1.1 Create test for MovieCard query string in `MovieCard.test.tsx`**

    **Goal:** Verify all URL params captured and passed to detail page.

    - Test: All filter params included in detail page link
    - Test: Unknown params preserved (forward compatibility)
    - Test: Empty params handled correctly
    - Expect tests to FAIL initially (implementation incomplete)

- [ ] **1.2 Create test for MovieDetail back button URL in `MovieDetail.test.tsx`**

    **Goal:** Verify complete param set reconstructed for back navigation.

    - Test: All params from URL read correctly
    - Test: Genres array parsed correctly
    - Test: Back URL matches original filtered page
    - Expect tests to FAIL initially (implementation incomplete)

- [ ] **1.3 Create integration test in `MovieCollectionGrid.integration.test.tsx`**
    - Test: Apply filters → navigate to detail → back → verify all params
    - Test: Page + filters → detail → back → verify both preserved
    - Test: Search query + filters → detail → back → verify both
    - Expect tests to FAIL initially

### **Phase 2:** Implement URL Parameter Preservation

- [ ] **2.1 Update MovieCard query string construction**

    - [ ] **2.1.1 Modify `MovieCard.tsx` to capture all URL params**
        - Read full `useSearchParams()` instead of just page/from/query
        - Include: minYear, maxYear, genres, minRating, maxRating, minRuntime, maxRuntime, sortBy
        - Preserve unknown params for forward compatibility
        - File location: `components/movie/MovieCard.tsx:133-139`

    - [ ] **2.1.2 Run MovieCard tests - should now PASS**

- [ ] **2.2 Update MovieDetail back button URL**

    - [ ] **2.2.1 Modify `MovieDetail.tsx` back URL construction**
        - Capture complete param set from URL
        - Parse genres array correctly
        - Reconstruct full back URL with all filter params
        - File location: `pages/movie/MovieDetail.tsx:116-120`

    - [ ] **2.2.2 Run MovieDetail tests - should now PASS**

- [ ] **2.3 Verify MovieCollectionGrid compatibility**

    - [ ] **2.3.1 Review MovieCollectionGrid integration code**
        - Check prop passing between grid and MovieCard
        - Verify parameter flow through component tree

    - [ ] **2.3.2 Run integration tests - should now PASS**

### **Phase 3:** UI State Preservation Tests and Verification

- [ ] **3.1 Review and enhance showAdvanced state test coverage**

    **Note:** 18 tests already exist for `useMovieCollectionState` auto-expand logic.

    - [ ] **3.1.1 Review existing test coverage**
        - Verify all state transitions tested
        - Check edge cases covered (rating filters, year range, single year, genres only)
        - Identify any gaps

    - [ ] **3.1.2 Add integration tests if needed**
        - Test navigation flows with real router context
        - Test state persistence across component unmount/remount
        - Test effect timing and dependencies
        - Expect new tests to FAIL if gaps found

- [ ] **3.2 Manual browser verification of showAdvanced auto-expand**
    - Apply rating filter → navigate to detail → back → verify expanded
    - Apply year range → detail → back → verify expanded
    - Single year filter → detail → back → verify collapsed
    - Genres only → detail → back → verify collapsed
    - Test across remounts (detail→back→detail→back)

- [ ] **3.3 Verify and test isFiltersCollapsed state preservation**
    - Check if isFiltersCollapsed needs similar treatment
    - Write tests if needed
    - Manual test: Expand filters → detail → back → verify expanded

### **Phase 4:** Integration Testing and Edge Cases

- [ ] **4.1 Write navigation flow integration tests**

    - [ ] **4.1.1 Create comprehensive user journey tests**
        - Test: Popular → apply filters → detail → back → verify state
        - Test: Search → apply filters → detail → back → verify state
        - Test: Top Rated → filters → detail → back → pagination → detail → back
        - Expect tests to FAIL if implementation gaps exist

    - [ ] **4.1.2 Create route change tests**
        - Test: Popular with filters → switch to Top Rated → verify state reset
        - Test: Search results → navigate to Popular → verify independent state
        - Expect tests to FAIL if state management has issues

- [ ] **4.2 Write edge case tests**

    - [ ] **4.2.1 Create rapid navigation tests**
        - Test: Quick detail→back→detail→back sequences
        - Verify no race conditions or state corruption
        - Expect tests to FAIL if timing issues exist

    - [ ] **4.2.2 Create invalid state tests**
        - Test: URL with malformed filter params
        - Test: Missing required params
        - Verify graceful degradation
        - Expect tests to FAIL if error handling incomplete

- [ ] **4.3 Write and run regression tests**

    - [ ] **4.3.1 Create tests for existing navigation**
        - Test: Navigation without filters
        - Test: Pagination without filters
        - Test: Direct URL access to detail pages

    - [ ] **4.3.2 Create browser navigation tests**
        - Test: Browser back button
        - Test: Browser forward button
        - Test: History state correctness

    - [ ] **4.3.3 Run all integration tests - should PASS**

### **Phase 5:** Quality Gates & Manual Verification

- [ ] **5.1 Run automated quality checks**
    - [ ] 5.1.1 Run full frontend test suite (all 416+ tests pass, no warnings)
    - [ ] 5.1.2 Run frontend linting (ESLint 0 violations)
    - [ ] 5.1.3 Run frontend type checking (TypeScript 0 errors)
    - [ ] 5.1.4 Run backend tests sanity check (verify no unintended changes)

- [ ] **5.2 Comprehensive manual testing**

    **Goal:** Build confidence through systematic manual verification.

    - [ ] **5.2.1 Test URL param preservation across routes**
        - Popular: year 1980-1983 → detail → back → verify filters
        - Popular: genres Action+Comedy → detail → back → verify
        - Popular: rating 7.0-10.0 → detail → back → verify
        - Popular: ALL filters → detail → back → verify
        - Now Playing with filters → detail → back
        - Top Rated with filters → detail → back
        - Upcoming with filters → detail → back
        - Search with query + filters → detail → back

    - [ ] **5.2.2 Test advanced panel state preservation**
        - Rating filter (panel expands) → detail → back → verify expanded
        - Year range (panel expands) → detail → back → verify expanded
        - Single year (collapsed) → detail → back → verify collapsed

    - [ ] **5.2.3 Test pagination + navigation**
        - Filters active → page 2 → detail → back → verify page 2 + filters
        - Filters active → page 3 → detail → back → detail → back → verify state

    - [ ] **5.2.4 Test browser navigation**
        - Verify browser back still works
        - Verify browser forward works
        - Verify history state correct

---

## Success Criteria

- [ ] "Back to Results" button preserves ALL active filters
- [ ] Advanced panel stays expanded when returning to filtered results
- [ ] Navigation works for all routes: Popular, Now Playing, Top Rated, Upcoming, Search
- [ ] Filter combinations work: year + genres, rating + year, all together
- [ ] Browser back button continues to work as expected
- [ ] Comprehensive test suite gives confidence in navigation/state behavior
- [ ] Manual testing confirms all flows work in browser
- [ ] Zero regressions in existing navigation

---

## Notes & Observations

**Key Insights:**

- Navigation bugs were masked because browser back button works correctly
- Custom navigation components don't automatically get history state benefits
- Effect-based UI state solution elegant but needs browser verification
- Comprehensive tests essential for confidence in state management

**Technical Approach:**

- URL params: Straightforward pass-through, low risk
- UI state: Effect-based auto-expand using existing filters as signal
- Testing: Build integration test suite to prevent regressions
- Risk: Low (isolated changes, clear failure modes, workarounds exist)

**Dependencies:**

```
Current cleanup (navigation/state) → Build rock-solid foundation
                                   ↓
Resume pagination (Phase 3.6.5) → Manual verification now easier
                                ↓
Resume filter-integration (3.6.2+) → Verify with confidence
```

**Key Lesson:** Manual testing revealed systemic gap in navigation/state testing. Addressing comprehensively
now prevents future rework and builds confidence for ongoing feature development.
