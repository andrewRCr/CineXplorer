# Incidental: Buffer Deduplication for TMDB Data Quality

**Created:** 2025-10-30
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress

## Context

**Discovered:** Manual testing revealed multi-genre filter duplicates
(Animation + Family filters showing Spirited Away twice on page 1)

**Interrupts:** `.arc/active/incidental/tasks-navigation-filter-state-preservation.md` at Task 3.3 (manual browser verification)

**Problem:** TMDB API returns duplicate movies across pagination boundaries (e.g., Spirited Away on page 1 position 19
AND page 2 position 1), backend buffer concatenates without deduplication, causing React key collisions and incomplete pages.

**Why Now:** Blocks manual testing confidence for navigation work, produces user-visible bugs (duplicates, incomplete pages
showing 17-19 instead of 20), and represents missing second-pass data quality filter consistent with existing architecture.

## Root Cause Analysis

**Three symptoms, one root cause:**

1. **Duplicates in results** - TMDB pagination instability + no backend deduplication
2. **Incomplete pages (17-19 vs 20)** - React key collision from duplicate `tmdb_id` values
3. **Filter state bleeding** - Stale `tmdb_page_start` parameters (ALREADY FIXED by buffer reset work)

**TMDB API Verification (curl):**

- Direct query to TMDB: `genres=16,10751`, `sort_by=popularity.desc`
- Result: Spirited Away (ID 129) appears on page 1 position 19 AND page 2 position 1
- This is documented TMDB behavior (eventually-consistent DB, real-time popularity changes)

**Backend Buffer Logic (`movie_service.py:402-485`):**

- Concatenates movies from multiple pages: `combined_movies = combined_movies + buffer_movies`
- NO deduplication by `tmdb_id` before returning first 20 results
- Result: Same movie appears twice in response array

**Frontend Impact:**

- MovieCard uses `key={movie.tmdb_id}` for React rendering
- Duplicate keys cause React to skip rendering second occurrence
- User sees 19 cards when backend sends 20 (with 1 duplicate)

**Complete Investigation:** See `.arc/active/incidental/notes-filter-duplication-investigation.md` for full evidence,
timeline, and API response analysis.

## Scope

### Will Do

- Add deduplication to backend buffer logic (`_apply_buffer_if_needed`)
- Write comprehensive tests for deduplication (TDD approach)
- Clean up debug logging from frontend buffer reset fix
- Restore and fix stashed performance optimization (filter visibility + re-render)
- Manual verification of all three symptoms resolved

### Won't Do

- Report to TMDB (their documented behavior, our responsibility to handle)
- Frontend deduplication (backend is correct place for data quality)
- Change React key strategy (using `tmdb_id` is correct)
- Refactor buffer mechanism beyond deduplication (working as designed)

---

## Tasks

### **Phase 1:** Write Tests for Buffer Deduplication (TDD)

- [ ] **1.1 Write unit tests for `_apply_buffer_if_needed` deduplication**

    **Goal:** Verify buffer correctly deduplicates and continues fetching to reach 20 unique movies.

    - [ ] **1.1.1 Create test file `test_movie_service_buffer_deduplication.py`**
        - Test: Buffer with no duplicates returns first 20 movies
        - Test: Buffer with 1 duplicate fetches additional page to reach 20 unique
        - Test: Buffer with multiple duplicates across pages continues until 20 unique
        - Test: Buffer respects `max_buffer_pages` limit even with duplicates
        - Test: Deduplication preserves first occurrence order
        - Test: Empty results after deduplication handled correctly
        - File location: `backend/apps/movie/tests/services/test_movie_service_buffer_deduplication.py`
        - Expect tests to FAIL initially

    - [ ] **1.1.2 Run unit tests and verify failure messages**

- [ ] **1.2 Write integration tests for discover endpoint with duplicates**

    - [ ] **1.2.1 Create integration test in `test_discover_api.py`**
        - Test: Multi-genre filter (16,10751) returns 20 unique movies
        - Test: Response includes no duplicate `tmdb_id` values
        - Test: `next_tmdb_page_start` correctly reflects pages consumed
        - Test: Works across different filter combinations
        - Expect tests to FAIL initially

    - [ ] **1.2.2 Run integration tests and verify failures**

### **Phase 2:** Implement Backend Buffer Deduplication

- [ ] **2.1 Implement deduplication in `_apply_buffer_if_needed`**

    **Location:** `backend/apps/movie/services/movie_service.py` lines 402-485

    - [ ] **2.1.1 Add deduplication logic after buffer concatenation**
        - Create `seen_ids` set to track `tmdb_id` values
        - Build `deduplicated` list excluding duplicates
        - Continue buffer loop if deduplication reduces count below 20
        - Return up to 20 unique movies with correct page count
        - File: `backend/apps/movie/services/movie_service.py:402-485`

    - [ ] **2.1.2 Run unit tests - should now PASS**

    - [ ] **2.1.3 Run integration tests - should now PASS**

- [ ] **2.2 Run backend quality gates**
    - [ ] 2.2.1 Backend tests: `docker compose exec backend pytest apps/movie/`
    - [ ] 2.2.2 Backend linting: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
    - [ ] 2.2.3 Python type checking: `npx pyright backend/apps/ backend/config/ --project backend`

### **Phase 3:** Frontend Buffer Reset Fix Cleanup

- [ ] **3.1 Remove debug console.log statements**

    - [ ] **3.1.1 Clean up `MovieCollectionGrid.tsx` debug logging**
        - Remove console.log from lines 60, 85-89, 101-110
        - Keep buffer reset logic intact (lines 59-64, 98-111)
        - File: `frontend/src/components/movie/collection/MovieCollectionGrid.tsx`

    - [ ] **3.1.2 Clean up `MovieGrid.tsx` debug logging**
        - Remove console.log statements (same pattern as MovieCollectionGrid)
        - Keep buffer reset logic intact
        - File: `frontend/src/components/movie/collection/MovieGrid.tsx`

    - [ ] **3.1.3 Run frontend tests - should still PASS**
        - `docker compose exec frontend npm test`
        - Verify buffer reset fix still working (no stale params)

- [ ] **3.2 Run frontend quality gates**
    - [ ] 3.2.1 Frontend linting: `docker compose exec frontend npm run lint`
    - [ ] 3.2.2 TypeScript checking: `docker compose exec frontend npm run type-check`

### **Phase 4:** Restore and Fix Stashed Performance Optimization

**Context:** Stash contains filter visibility fix + re-render optimization with undefined
variable bug (`actualFilterStyle` referenced but not defined)

- [ ] **4.1 Restore stashed changes**

    - [ ] **4.1.1 Apply stash and review changes**
        - Command: `git stash pop stash@{0}`
        - Files affected: `MovieCollectionLayout.tsx`, `useMovieCollectionState.tsx`
        - Review changes for merge conflicts

- [ ] **4.2 Fix undefined variable bug**

    - [ ] **4.2.1 Fix `actualFilterStyle` reference in `MovieCollectionLayout.tsx`**
        - Replace undefined `actualFilterStyle` with `filterStyle` (line 183)
        - Verify split logic: `apiFilterStyle` for API, `filterStyle` for UI
        - File: `frontend/src/components/movie/collection/MovieCollectionLayout.tsx`

    - [ ] **4.2.2 Run frontend tests - should PASS**

- [ ] **4.3 Run frontend quality gates**
    - [ ] 4.3.1 Frontend tests: `docker compose exec frontend npm test`
    - [ ] 4.3.2 Frontend linting: `docker compose exec frontend npm run lint`
    - [ ] 4.3.3 TypeScript checking: `docker compose exec frontend npm run type-check`

### **Phase 5:** Manual Verification and Final Quality Gates

- [ ] **5.1 Manual browser verification**

    **Test Case:** Multi-genre filter (Animation + Family)

    - [ ] **5.1.1 Verify duplicate fix**
        - Navigate to Popular page 1
        - Apply Animation (16) + Family (10751) filters
        - Verify: NO duplicate movies visible (e.g., Spirited Away appears once only)
        - Verify: Exactly 20 unique movies displayed

    - [ ] **5.1.2 Verify page completeness**
        - Check multiple filter combinations
        - Verify: All pages show 20 results (no incomplete 17-19 pages)
        - Verify: Pagination metadata correct (`next_tmdb_page_start` tracking)

    - [ ] **5.1.3 Verify no regressions**
        - Test: Popular, Now Playing, Top Rated, Upcoming views
        - Test: Single genre filters work correctly
        - Test: Search with filters works correctly
        - Test: Navigation state preservation still working (from Task 3.1-3.2)

- [ ] **5.2 Run full quality gates**
    - [ ] 5.2.1 All backend tests: `docker compose exec backend pytest apps/`
    - [ ] 5.2.2 All frontend tests: `docker compose exec frontend npm test`
    - [ ] 5.2.3 All linting: backend + frontend + markdown
    - [ ] 5.2.4 All type checking: Python + TypeScript

- [ ] **5.3 Commit all changes**
    - [ ] 5.3.1 Review `git status` and `git diff`
    - [ ] 5.3.2 Commit backend deduplication + frontend fixes
    - [ ] 5.3.3 Update CURRENT-SESSION.md to resume navigation work at Task 3.3

---

## Success Criteria

- [ ] NO duplicate movies in any API responses (verified by tests + manual testing)
- [ ] All pages consistently show 20 results (no incomplete 17-19 pages)
- [ ] Buffer deduplication transparent to users (handles TMDB instability automatically)
- [ ] 100% test pass rate (backend + frontend)
- [ ] Zero linting violations, zero type errors
- [ ] Performance optimization restored and working (no undefined variable bugs)
- [ ] All quality gates pass
- [ ] Can resume navigation work at Task 3.3 with confidence

---

## Related Files

### Backend

- `backend/apps/movie/services/movie_service.py` - Buffer deduplication implementation
- `backend/apps/movie/tests/services/test_movie_service_buffer_deduplication.py` - New test file
- `backend/apps/movie/tests/test_discover_api.py` - Integration tests

### Frontend

- `frontend/src/components/movie/collection/MovieCollectionGrid.tsx` - Buffer reset fix cleanup
- `frontend/src/components/movie/collection/MovieGrid.tsx` - Buffer reset fix cleanup
- `frontend/src/components/movie/collection/MovieCollectionLayout.tsx` - Stashed performance optimization
- `frontend/src/components/movie/collection/useMovieCollectionState.tsx` - Stashed helper export

### Investigation

- `.arc/active/incidental/notes-filter-duplication-investigation.md` - Complete investigation findings
