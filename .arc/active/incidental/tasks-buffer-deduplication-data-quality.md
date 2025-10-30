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
- Within-page deduplication implemented (Phase 2) but NO cross-page tracking
- Result: Same movie can appear on consecutive pages

**Frontend Impact:**

- MovieCard uses `key={movie.tmdb_id}` for React rendering
- Duplicate keys cause React to skip rendering second occurrence
- User sees 19 cards when backend sends 20 (with 1 duplicate)

**Complete Investigation:** See `.arc/active/incidental/notes-buffer-deduplication-data-quality.md` for full
analysis and solution options.

## Scope

### Will Do

- ✅ Add within-page deduplication to backend buffer logic (Phase 1-2 complete)
- Add session-based cross-page deduplication (Option 1 - Redis cache)
- Write comprehensive tests for both deduplication types (TDD approach)
- Clean up debug logging from frontend buffer reset fix
- Manual verification of all three symptoms resolved
- Integration with pagination-buffer-tracking Phase 3.7 (coordination)

### Won't Do

- Report to TMDB (their documented behavior, our responsibility to handle)
- Frontend deduplication (backend is correct place for data quality)
- Change React key strategy (using `tmdb_id` is correct)
- Refactor buffer mechanism beyond deduplication (working as designed)
- Cursor-based pagination (different approach, out of scope)
- Frontend exclude lists (ugly URLs, complex state management)

---

## Tasks

### **Phase 1:** Write Tests for Within-Page Buffer Deduplication (TDD)

**Status:** ✅ COMPLETE

- [x] **1.1 Write unit tests for `_apply_buffer_if_needed` deduplication**

    **Goal:** Verify buffer correctly deduplicates and continues fetching to reach 20 unique movies.

    - [x] **1.1.1 Create test file `test_movie_service_buffer_deduplication.py`**
        - ✅ Test: Buffer with no duplicates returns first 20 movies
        - ✅ Test: Buffer with 1 duplicate fetches additional page to reach 20 unique
        - ✅ Test: Buffer with multiple duplicates across pages continues until 20 unique
        - ✅ Test: Buffer respects `max_buffer_pages` limit even with duplicates
        - ✅ Test: Deduplication preserves first occurrence order
        - ✅ Test: Empty results after deduplication handled correctly
        - ✅ Test: Buffer applies filters to buffer pages during deduplication
        - File location: `backend/apps/movie/tests/test_movie_service_buffer_deduplication.py` (7 comprehensive tests)

    - [x] **1.1.2 Run unit tests and verify failure messages**
        - ✅ All 7 tests executed successfully (TDD red phase)
        - ✅ 6/7 tests FAILED as expected, 1/7 PASSED (baseline case)

- [x] **1.2 Write integration tests for discover endpoint with duplicates**

    - [x] **1.2.1 Create integration tests in `test_movie_api.py`**
        - ✅ Test: Multi-genre filter returns 20 unique movies (Spirited Away scenario)
        - ✅ Test: Multiple duplicates across pages handled correctly
        - ✅ Test: Deduplication works with backend filters (year/rating)
        - ✅ Test: Respects `max_buffer_pages` safety limit
        - File location: `backend/apps/movie/tests/test_movie_api.py` (4 integration tests)

    - [x] **1.2.2 Run integration tests and verify failures**
        - ✅ All 4 integration tests FAILED as expected (TDD red phase)

### **Phase 2:** Implement Within-Page Backend Buffer Deduplication

**Status:** ✅ IMPLEMENTATION COMPLETE, QUALITY GATES PENDING

- [x] **2.1 Implement deduplication in `_apply_buffer_if_needed`**

    **Location:** `backend/apps/movie/services/movie_service.py:458-494`

    - [x] **2.1.1 Add deduplication logic after buffer concatenation**
        - ✅ Implemented deduplication inside buffer loop (lines 483-490)
        - ✅ Track `seen_ids` with set for O(1) lookup
        - ✅ Build `deduplicated` list preserving first occurrence order
        - ✅ Loop continues after dedup if count < 20
        - ✅ Returns up to 20 unique movies with correct page count

    - [x] **2.1.2 Run unit tests - should now PASS**
        - ✅ All 7 unit tests PASS (TDD green phase)

    - [x] **2.1.3 Run integration tests - should now PASS**
        - ✅ All 4 integration tests PASS (TDD green phase)

- [ ] **2.2 Run backend quality gates**

    - [ ] **2.2.1 Run backend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/`
        - Expect: All tests pass (30+ tests)

    - [ ] **2.2.2 Run backend linting**
        - Command: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - Expect: 0 violations

    - [ ] **2.2.3 Run Python type checking**
        - Command: `npx pyright backend/apps/ backend/config/ --project backend`
        - Expect: 0 errors

### **Phase 3:** Write Tests for Session-Based Cross-Page Deduplication (TDD Red Phase)

**Purpose:** Implement Redis-based session tracking to prevent duplicates across pagination requests (Option 1).

- [ ] **3.1 Write unit tests for `PaginationSessionManager` helper class**

    **Goal:** Test session state management (store/retrieve/clear returned movie IDs).

    - [ ] **3.1.1 Create test file `test_pagination_session_manager.py`**
        - Test: `get_returned_ids()` returns empty set for new session
        - Test: `add_returned_ids()` stores movie IDs in Redis cache
        - Test: `get_returned_ids()` retrieves stored IDs correctly
        - Test: `clear_session()` removes all IDs for filter combination
        - Test: Filter hash generation consistent for same filters (order-independent)
        - Test: Different filters generate different session keys
        - Test: Session TTL set correctly (1 hour default)
        - Test: Graceful degradation when Redis unavailable
        - File: `backend/apps/movie/tests/test_pagination_session_manager.py`
        - Expect tests to FAIL initially (class not implemented)

    - [ ] **3.1.2 Run unit tests and verify failure messages**
        - Verify import errors or assertion failures
        - Document baseline behavior

- [ ] **3.2 Write integration tests for cross-page deduplication**

    **Goal:** Verify session tracking prevents duplicates across paginated requests.

    - [ ] **3.2.1 Add cross-page deduplication tests to `test_movie_api.py`**
        - Test: Movie appearing on TMDB pages 2 and 4 only returned once across our pages 1-2
        - Test: Page 1 request stores returned IDs in session
        - Test: Page 2 request excludes IDs already returned on page 1
        - Test: Session cleared on page=1 (fresh start for backward navigation)
        - Test: Different filter combinations use different sessions
        - Test: Session expires after TTL (1 hour)
        - Test: System works with Redis unavailable (degrades to within-page only)
        - Expect tests to FAIL initially (session integration not implemented)

    - [ ] **3.2.2 Run integration tests and verify failures**
        - Document expected failure patterns
        - Verify within-page deduplication still works (Phase 2)

### **Phase 4:** Implement Session-Based Cross-Page Deduplication (TDD Green Phase)

- [ ] **4.1 Create `PaginationSessionManager` helper class**

    **Location:** `backend/apps/movie/services/pagination_session_manager.py` (new file)

    - [ ] **4.1.1 Implement session manager class**
        - Method: `get_returned_ids(filters: dict) -> set[int]` - Retrieve session state
        - Method: `add_returned_ids(filters: dict, ids: list[int]) -> None` - Update session
        - Method: `clear_session(filters: dict) -> None` - Reset on page 1 or filter change
        - Method: `_generate_filter_hash(filters: dict) -> str` - Normalize and hash filters
        - Use Django cache framework (Redis backend)
        - Set 1-hour TTL on all cache operations
        - Graceful degradation if cache unavailable (log warning, return empty set)
        - ~100 lines estimated

    - [ ] **4.1.2 Run unit tests - should now PASS**
        - All `PaginationSessionManager` tests pass (8 tests)

- [ ] **4.2 Integrate session tracking into buffer logic**

    **Location:** `backend/apps/movie/services/movie_service.py`

    - [ ] **4.2.1 Import and instantiate session manager**
        - Add import: `from .pagination_session_manager import PaginationSessionManager`
        - Instantiate in `MovieService.__init__()` or as module-level singleton

    - [ ] **4.2.2 Update `_apply_buffer_if_needed` to use session tracking**
        - Accept `filters` parameter (dict with all filter values)
        - Call `session_manager.get_returned_ids(filters)` at start
        - Add session IDs to `seen_ids` set (combine with within-page dedup)
        - After building results, call `session_manager.add_returned_ids(filters, returned_ids)`
        - ~20 lines modified

    - [ ] **4.2.3 Thread filter context through endpoint methods**
        - Update `discover_movies()`, `search_movies()`, etc. to build filter dict
        - Pass filter dict to `_apply_buffer_if_needed()` calls
        - ~30 lines modified across multiple methods

    - [ ] **4.2.4 Implement page=1 session clearing**
        - In endpoint methods, check if `page == 1`
        - If page=1, call `session_manager.clear_session(filters)` before buffer
        - Ensures backward navigation gets fresh results
        - ~10 lines added

    - [ ] **4.2.5 Run integration tests - should now PASS**
        - All cross-page deduplication tests pass (7 tests)
        - All existing within-page tests still pass (11 tests)

- [ ] **4.3 Run backend quality gates**

    - [ ] **4.3.1 Run all backend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Expect: All tests pass (40+ tests now)

    - [ ] **4.3.2 Run backend linting with auto-fix**
        - Command: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - Expect: 0 violations

    - [ ] **4.3.3 Run Python type checking**
        - Command: `npx pyright backend/apps/ backend/config/ --project backend`
        - Expect: 0 errors

### **Phase 5:** Coordination with pagination-buffer-tracking Phase 3.7

**Context:** Phase 3.7 in `tasks-pagination-buffer-tracking.md` handles URL metadata persistence (`tmdb_page_start`).
Session-based deduplication complements this by ensuring no duplicates when metadata tracking is working correctly.

**Integration Point:** Phase 3.7.4.1 manual verification includes "No duplicate movies when navigating forward to page 4"
which depends on our cross-page deduplication being complete.

- [ ] **5.1 Document dependency in pagination-buffer-tracking task list**

    - [ ] **5.1.1 Add note to Phase 3.7 prerequisite section**
        - Document that Phase 3.7 verification assumes cross-page dedup complete
        - Cross-reference: `tasks-buffer-deduplication-data-quality.md` Phase 4 complete
        - File: `.arc/active/incidental/tasks-pagination-buffer-tracking.md`

    - [ ] **5.1.2 Verify no code conflicts**
        - Phase 3.7 handles URL params (`tmdb_page_start`)
        - Our Phase 4 handles session state (returned movie IDs)
        - Confirm independent operation (no overlap)

### **Phase 6:** Final Cleanup, Quality Gates, and Manual Verification

- [ ] **6.1 Clean up frontend debug logging**

    **Context:** Frontend buffer reset fix (Phase 2 prerequisite) added console.log statements for debugging.

    - [ ] **6.1.1 Remove debug logging from `MovieCollectionGrid.tsx`**
        - Remove console.log statements (buffer reset events)
        - Keep buffer reset logic intact
        - File: `frontend/src/components/movie/collection/MovieCollectionGrid.tsx`

    - [ ] **6.1.2 Remove debug logging from `MovieGrid.tsx`**
        - Remove console.log statements (same pattern)
        - Keep buffer reset logic intact
        - File: `frontend/src/components/movie/collection/MovieGrid.tsx`

    - [ ] **6.1.3 Run frontend tests - should still PASS**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Expect: All 453 tests pass

- [ ] **6.2 Run frontend quality gates**

    - [ ] **6.2.1 Run frontend linting**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Expect: 0 violations

    - [ ] **6.2.2 Run TypeScript type checking**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Expect: 0 errors

- [ ] **6.3 Manual browser verification**

    **Test Case:** Multi-genre filter (Animation + Family) across multiple pages

    - [ ] **6.3.1 Verify within-page duplicate fix**
        - Navigate to Popular page 1
        - Apply Animation (16) + Family (10751) filters
        - Verify: NO duplicate movies on single page
        - Verify: Exactly 20 unique movies displayed

    - [ ] **6.3.2 Verify cross-page duplicate fix**
        - From page 1, navigate to page 2
        - Verify: NO movies from page 1 appear on page 2
        - Navigate to page 3
        - Verify: NO movies from pages 1-2 appear on page 3
        - Check specific movies (Spirited Away, Mulan, Luca) appear only once

    - [ ] **6.3.3 Verify backward navigation consistency**
        - From page 3, click browser back to page 2
        - Verify: Same movies as original page 2 visit
        - Click back to page 1
        - Verify: Same movies as original page 1 visit (session cleared on page 1)

    - [ ] **6.3.4 Verify filter change resets session**
        - On page 2 with Animation+Family
        - Change to Animation only
        - Verify: New set of movies (session cleared)
        - Page numbering restarts at 1

    - [ ] **6.3.5 Verify no regressions**
        - Test: Popular, Now Playing, Top Rated, Upcoming views
        - Test: Single genre filters work correctly
        - Test: Search with filters works correctly
        - Test: Pagination metadata (`next_tmdb_page_start`) still tracking

- [ ] **6.4 Run comprehensive quality gates**

    - [ ] **6.4.1 Run all backend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Expect: All tests pass (40+ tests)

    - [ ] **6.4.2 Run all frontend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Expect: All 453 tests pass

    - [ ] **6.4.3 Run all linting**
        - Backend: `.venv-backend/bin/ruff check backend/apps/ backend/config/`
        - Frontend: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Markdown: `npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`
        - Expect: 0 violations total

    - [ ] **6.4.4 Run all type checking**
        - Python: `npx pyright backend/apps/ backend/config/ --project backend`
        - TypeScript: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Expect: 0 errors total

---

## Success Criteria

- [x] Within-page deduplication working (Phase 1-2 complete)
- [ ] Cross-page deduplication working (no duplicates across pagination sequence)
- [ ] Backward navigation consistent (page 1 results same after page 2 → page 1)
- [ ] Filter changes reset session (new filters = new pagination sequence)
- [ ] All pages consistently show 20 results (no incomplete pages)
- [ ] Session tracking graceful degradation (works without Redis, logs warning)
- [ ] 100% test pass rate (backend + frontend, 40+ backend, 453 frontend)
- [ ] Zero linting violations, zero type errors
- [ ] Coordination documented with pagination-buffer-tracking Phase 3.7
- [ ] All quality gates pass
- [ ] Ready to resume navigation work at Task 3.3

---

## Related Files

### Backend

- `backend/apps/movie/services/movie_service.py` - Buffer deduplication implementation (within-page + cross-page)
- `backend/apps/movie/services/pagination_session_manager.py` - Session tracking helper (new file, Phase 4)
- `backend/apps/movie/tests/test_movie_service_buffer_deduplication.py` - Within-page dedup tests
- `backend/apps/movie/tests/test_pagination_session_manager.py` - Session manager tests (new file, Phase 3)
- `backend/apps/movie/tests/test_movie_api.py` - Integration tests (within-page + cross-page)

### Frontend

- `frontend/src/components/movie/collection/MovieCollectionGrid.tsx` - Buffer reset fix + debug logging (cleanup Phase 6)
- `frontend/src/components/movie/collection/MovieGrid.tsx` - Buffer reset fix + debug logging (cleanup Phase 6)
- `frontend/src/components/movie/collection/MovieCollectionLayout.tsx` - Filter style split (completed stash work)
- `frontend/src/components/movie/collection/useMovieCollectionState.tsx` - Enhanced filter detection (completed stash work)

### Documentation

- `.arc/active/incidental/notes-buffer-deduplication-data-quality.md` - Complete investigation and solution analysis
- `.arc/active/incidental/tasks-pagination-buffer-tracking.md` - Related Phase 3.7 (URL metadata persistence)

### Configuration

- `backend/config/settings.py` - Verify Redis cache backend configured (CACHES setting)
- `infrastructure/docker-compose.yml` - Redis container already available
