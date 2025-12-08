# Incidental: Buffer Deduplication for TMDB Data Quality

**Created:** 2025-10-30
**Branch:** `technical/service-layer-modernization`
**Status:** Active

## Context

**Discovered:** Manual testing revealed multi-genre filter duplicates
(Animation + Family filters showing Spirited Away twice on page 1)

**Interrupts:** `tasks-navigation-filter-state-preservation.md` at Task 3.3

**Resume At:** Task 3.1 (write tests for PaginationSessionManager)

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
- Deep link pre-population (if user bookmarks page 3, we don't pre-fetch pages 1-2 to populate session)
    - **Rationale:** High effort, minimal UX impact. User landing on page 3 never saw pages 1-2, so if a movie
      from those pages reappears on page 4+, they won't perceive it as a duplicate. Only visible if they navigate
      backward after deep linking, which is rare. Accepted as known limitation.

---

## Tasks

### **Phase 1:** Write Tests for Within-Page Buffer Deduplication (TDD)

**Status:** ✅ COMPLETE

- [x] **1.1 Write unit tests for `_apply_buffer_if_needed` deduplication**

    **Goal:** Verify buffer correctly deduplicates and continues fetching to reach 20 unique movies.

    - [x] **1.1.a Create test file `test_movie_service_buffer_deduplication.py`**
        - ✅ Test: Buffer with no duplicates returns first 20 movies
        - ✅ Test: Buffer with 1 duplicate fetches additional page to reach 20 unique
        - ✅ Test: Buffer with multiple duplicates across pages continues until 20 unique
        - ✅ Test: Buffer respects `max_buffer_pages` limit even with duplicates
        - ✅ Test: Deduplication preserves first occurrence order
        - ✅ Test: Empty results after deduplication handled correctly
        - ✅ Test: Buffer applies filters to buffer pages during deduplication
        - File location: `backend/apps/movie/tests/test_movie_service_buffer_deduplication.py` (7 comprehensive tests)

    - [x] **1.1.b Run unit tests and verify failure messages**
        - ✅ All 7 tests executed successfully (TDD red phase)
        - ✅ 6/7 tests FAILED as expected, 1/7 PASSED (baseline case)

- [x] **1.2 Write integration tests for discover endpoint with duplicates**

    - [x] **1.2.a Create integration tests in `test_movie_api.py`**
        - ✅ Test: Multi-genre filter returns 20 unique movies (Spirited Away scenario)
        - ✅ Test: Multiple duplicates across pages handled correctly
        - ✅ Test: Deduplication works with backend filters (year/rating)
        - ✅ Test: Respects `max_buffer_pages` safety limit
        - File location: `backend/apps/movie/tests/test_movie_api.py` (4 integration tests)

    - [x] **1.2.b Run integration tests and verify failures**
        - ✅ All 4 integration tests FAILED as expected (TDD red phase)

### **Phase 2:** Implement Within-Page Backend Buffer Deduplication

**Status:** ✅ IMPLEMENTATION COMPLETE, QUALITY GATES PENDING

- [x] **2.1 Implement deduplication in `_apply_buffer_if_needed`**

    **Location:** `backend/apps/movie/services/movie_service.py:458-494`

    - [x] **2.1.a Add deduplication logic after buffer concatenation**
        - ✅ Implemented deduplication inside buffer loop (lines 483-490)
        - ✅ Track `seen_ids` with set for O(1) lookup
        - ✅ Build `deduplicated` list preserving first occurrence order
        - ✅ Loop continues after dedup if count < 20
        - ✅ Returns up to 20 unique movies with correct page count

    - [x] **2.1.b Run unit tests - should now PASS**
        - ✅ All 7 unit tests PASS (TDD green phase)

    - [x] **2.1.c Run integration tests - should now PASS**
        - ✅ All 4 integration tests PASS (TDD green phase)

### **Phase 3:** Write Tests for Session-Based Cross-Page Deduplication (TDD Red Phase)

**Purpose:** Implement Redis-based session tracking to prevent duplicates across pagination requests (Option 1).

- [x] **3.1 Write unit tests for `PaginationSessionManager` helper class**

    **Goal:** Test session state management (store/retrieve/clear returned movie IDs).

    - [x] **3.1.a Create test file `test_pagination_session_manager.py`**
        Created 24 tests organized into 7 test classes:
        - `TestGetReturnedIds` (2 tests): empty set for new session, retrieves stored IDs
        - `TestAddReturnedIds` (3 tests): stores IDs, appends to existing, handles duplicates
        - `TestClearSession` (1 test): removes all IDs for filter combination
        - `TestSessionTTL` (1 test): verifies 1-hour TTL passed to cache.set()
        - `TestGracefulDegradation` (3 tests): get/add/clear silently fail when Redis unavailable
        - `TestSessionScoping` (3 tests): user isolation via different session IDs
        - `TestContextIdIsolation` (5 tests): multi-tab isolation via context_id parameter
        - `TestFilterHash` (6 tests): order-independent hashing, search query inclusion, case normalization

        File: `backend/apps/movie/tests/unit/services/test_pagination_session_manager.py`

    - [x] **3.1.b Run unit tests and verify failure messages**
        - All 24 tests SKIPPED as expected (TDD red phase)
        - Skip reason: "PaginationSessionManager not yet implemented (TDD red phase)"
        - Tests use `pytest.mark.skipif(not IMPORT_AVAILABLE)` pattern
        - Type errors (106) expected due to `PaginationSessionManager = None` fallback; will resolve in Phase 4

    - [x] **3.1.c Add unit test for atomic Redis operations**
        Added `TestAtomicRedisOperations` class with 4 tests:
        - `test_add_returned_ids_uses_atomic_sadd` - Verifies Redis `SADD` command is called
        - `test_get_returned_ids_uses_smembers` - Verifies Redis `SMEMBERS` command is used
        - `test_clear_session_uses_delete` - Verifies Redis `DEL` command is used
        - `test_concurrent_adds_preserve_all_ids` - Simulates concurrent adds, verifies no data loss

        Total unit tests: 28 (24 original + 4 atomic ops)
        File: `backend/apps/movie/tests/unit/services/test_pagination_session_manager.py`

- [x] **3.2 Write integration tests for cross-page deduplication**

    **Goal:** Verify session tracking prevents duplicates across paginated requests.

    - [x] **3.2.a Add cross-page deduplication tests to `test_browse_pagination.py`**
        Added 8 new tests (all marked `@pytest.mark.xfail`) organized into 4 categories:

        **Core cross-page tests (3 tests):**
        - `test_page_1_stores_returned_ids_in_session` - XFAIL
        - `test_session_cleared_on_page_1_fresh_start` - XFAIL (expanded to test actual session reset)
        - `test_different_filter_combinations_use_different_sessions` - XFAIL

        **Context ID tests (2 tests):**
        - `test_different_pagination_context_headers_use_separate_sessions` - XFAIL (expandeded tests tab isolation with
        page 2)
        - `test_requests_without_context_header_work_backwards_compatible` - XFAIL

        **Search integration tests (1 test):**
        - `test_search_pagination_deduplicates_across_pages` - XFAIL
        - Note: Removed `test_search_results_use_separate_session_from_browse` as redundant
          (search/browse isolation is inherent via different filter hashes, tested at unit level)

        **Graceful degradation (1 test):**
        - `test_graceful_degradation_when_redis_unavailable` - XFAIL

        File: `backend/apps/movie/tests/integration/api/test_browse_pagination.py`

    - [x] **3.2.b Run integration tests and verify failures**
        Test results: 5 passed, 8 xfailed
        - 5 original tests pass (existing pagination behavior)
        - 8 session-based tests XFAIL as expected (all now meaningful tests)
        - Existing xfail `test_browse_no_cross_page_duplicates` still XFAIL
        - Within-page deduplication unaffected (Phase 2 work intact)

### **Phase 4:** Implement Session-Based Cross-Page Deduplication (TDD Green Phase)

- [x] **4.1 Create `PaginationSessionManager` helper class**

    **Location:** `backend/apps/movie/services/pagination_session_manager.py` (new file)

    - [x] **4.1.a Implement session manager class**
        **Constructor:**
        - `__init__(session_id: str, context_id: str = "")` - Initialize with session and optional context
        - `session_id`: Django session key (from `request.session.session_key`)
        - `context_id`: Optional tab isolation ID (from `X-Pagination-Context` header)

        **Methods (UPDATED - uses HashableParams Protocol, not dict):**
        - `get_returned_ids(params: HashableParams) -> set[int]` - Retrieve session state
        - `add_returned_ids(params: HashableParams, ids: list[int]) -> None` - Update session
        - `clear_session(params: HashableParams) -> None` - Reset on page 1 or filter change
        - `_generate_cache_key(params: HashableParams) -> str` - Build key from session_id + context_id + params_hash
        - `_generate_params_hash(params: HashableParams) -> str` - Hash via `model_dump(exclude_none=True)`

        **Cache key format:** `pagination_session:{session_id}:{context_id}:{filter_hash}`

        **Filter hash must include:**
        - All browse filters (genres, sort_by, year_min, year_max, rating_min, rating_max)
        - Search query (`q`) when present
        - View type (popular, top_rated, etc.) if applicable

        **Infrastructure:**
        - **Use Redis SET operations directly** (not Django cache get/set)
            - `SADD key id1 id2...` for atomic additions (race-condition-free)
            - `SMEMBERS key` for retrieval
            - `DEL key` for clearing
            - Access via django-redis: `django.core.cache.cache.client.get_client()`
        - Set 1-hour TTL via `EXPIRE key 3600` after modifications
        - Graceful degradation if Redis unavailable (log warning, return empty set)
        - ~120 lines estimated

        **Thread Safety Note:**
        Using atomic `SADD` prevents race conditions when concurrent requests modify the same
        session. Without this, read-modify-write (`get()` → union → `set()`) could lose IDs:

        ```
        Request A reads {1-20}, Request B reads {1-20} (before A writes)
        A writes {1-40}, B writes {1-20, 41-60} → {21-40} lost!
        ```

        With `SADD`, both requests atomically add their IDs - no data loss.

    - [x] **4.1.b Run unit tests - should now PASS**
        - All 25 `PaginationSessionManager` tests pass (core + scoping + context + params hash + atomic ops + graceful degradation)
        - **Final architecture uses Protocol-based adapter pattern:**
            - `AtomicSetOperations` Protocol: Type-safe interface for Redis SET ops (sadd, smembers, delete, expire)
            - `DjangoRedisAdapter`: Implements Protocol, isolates ALL type ignores (10 total)
            - `HashableParams` Protocol: Accepts any Pydantic model via `model_dump()` method
        - **Type safety achieved:**
            - `redis_client.py` (adapter): 10 type ignores - Django cache internals + redis-py sync/async typing
            - `pagination_session_manager.py` (business logic): **0 type ignores**
            - No `Any`, no `cast()` - uses `object` and Protocol-based contracts
        - **Key design decisions:**
            - Uses `HashableParams` Protocol for extensibility (BrowseServiceParams, SearchServiceParams, future types)
            - Leverages Pydantic boundary validation instead of internal TypeGuards
            - `model_dump(exclude_none=True)` for deterministic hash generation

- [x] **4.2 Integrate session tracking into buffer logic**

    **Scope:** Includes preparatory refactoring for clean, maintainable integration.
    Refactor first (Part 1), then integrate (Part 2), then verify (Part 3).

    **Part 1: Preparatory Refactoring (no behavior change)**

    - [x] **4.2.a Rename PaginationSessionManager → DeduplicationTracker**
        - Renamed class, file, and test file
        - Updated imports and module path for patching
        - All 25 tests pass, linting clean, type check clean

    - [x] **4.2.a2 Rename ServiceParams → BrowseServiceParams**
        - Renamed class and file (`service_params.py` → `browse_service_params.py`)
        - Updated ~90 usages across 20 files (services, tests, helpers, management commands)
        - Removed old re-export from `tmdb_api_boundary/query_params.py` (clean rename)
        - Updated `HashableParams` docstring to reference `BrowseServiceParams`
        - All 603 tests pass, linting clean, type check clean (0 errors)

    - [x] **4.2.b Create SearchServiceParams model**
        - Created `services/api_boundary/search_service_params.py` (40 lines)
        - Fields: `query: str`, `year_min`, `year_max`, `rating_min`, `rating_max`
        - Exported from `api_boundary/__init__.py`

    - [x] **4.2.c Refactor pipeline: separate response building**
        - Extracted `convert_schema_to_tmdb_movie()` and `build_filtered_response()` to
          `pipelines/response_builder.py` (new file, 83 lines)
        - Updated imports in `paginated.py`

    - [x] **4.2.d Refactor pipeline: accept params objects directly**
        - Updated `apply_buffer_if_needed()` and `fetch_with_filters_and_buffer()` signatures
          to accept `params: BrowseServiceParams | SearchServiceParams` instead of individual args
        - Uses `getattr()` for BrowseServiceParams-only fields (min_vote_count, language, tmdb_page_start)
        - Updated callers: `discover_movies()` passes params directly, `search_movies()`
          creates `SearchServiceParams` inline
        - Updated 7 unit tests to use `BrowseServiceParams` constructor
        - All 603 tests pass, linting clean, type check clean (0 errors)

    **Part 2: Session Tracking Integration**

    - [x] **4.2.e Thread DeduplicationTracker through layers**
        - API layer (`api.py`): Added `_create_dedup_tracker()` helper, updated 4 endpoints
        - Service layer (`movie_service.py`): Added `dedup_tracker` param to 4 methods
        - Pipeline layer (`paginated.py`): Added `dedup_tracker` param to both functions
        - Also updated 3 tests using old `search_movies()` signature

    - [x] **4.2.f Update apply_buffer_if_needed() for session tracking**
        - Gets session IDs at start, initializes `seen_ids` with session state
        - Tracks new IDs returned after building final results
        - Properly excludes session IDs from "new IDs" tracking

    - [x] **4.2.g Implement page=1 session clearing**
        - Added clear_session() call at start of `fetch_with_filters_and_buffer()` when page==1

    - [x] **4.2.h Update search_movies() to use SearchServiceParams**
        - Changed service signature from individual params to `SearchServiceParams`
        - Updated API layer to create `SearchServiceParams` from HTTP params

    **Part 3: Verification**

    - [x] **4.2.i Run backend tests - verify all pass**
        - All 603 tests pass
        - `test_graceful_degradation_when_redis_unavailable` now passes (was xfail)
        - 7 xfails remain (expected - require frontend context ID for full verification)

- [ ] **4.3 Add frontend context ID generation (Issue #2 fix)**

    **Purpose:** Generate unique ID per page load for multi-tab isolation.

    **Location:** `frontend/src/hooks/` or API service layer

    - [ ] **4.3.a Generate pagination context ID on page load**
        - Create UUID on initial render (use `useRef` to persist across re-renders)
        - Store in ref, not state (doesn't need to trigger re-renders)
        - Generate once per page load, stable across navigation within same tab
        - ~10 lines

    - [ ] **4.3.b Add context ID to API requests**
        - Add `X-Pagination-Context` header to movie API calls
        - Update `apiClient` or individual fetch calls in movie hooks
        - ~15 lines modified

    - [ ] **4.3.c Run frontend tests - should still PASS**
        - No behavioral change expected (context ID is additive)
        - Verify no regressions in existing functionality

    - [ ] **4.3.d Remove xfail decorators from passing cross-page dedup tests**
        - Run backend tests, identify which xfails now pass (xpassed)
        - Remove `@pytest.mark.xfail` from passing tests
        - Update xfail reasons for any that still fail (with clear explanation why)
        - Verify all formerly-xfail tests now pass without decorator
        - File: `backend/apps/movie/tests/integration/api/test_browse_pagination.py`
        - **Known xpassed already:** `test_graceful_degradation_when_redis_unavailable`

- [ ] **4.4 Run backend quality gates**

    - [ ] **4.4.a Run all backend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Expect: All tests pass (50+ tests now with new dedup tests)

    - [ ] **4.4.b Run backend linting with auto-fix**
        - Command: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - Expect: 0 violations

    - [ ] **4.4.c Run Python type checking**
        - Command: `npx pyright backend/apps/ backend/config/ --project backend`
        - Expect: 0 errors

### **Phase 5:** Coordination with pagination-buffer-tracking Phase 3.7

**Context:** Phase 3.7 in `tasks-pagination-buffer-tracking.md` handles URL metadata persistence (`tmdb_page_start`).
Session-based deduplication complements this by ensuring no duplicates when metadata tracking is working correctly.

**Integration Point:** Phase 3.7.4.1 manual verification includes "No duplicate movies when navigating forward to page 4"
which depends on our cross-page deduplication being complete.

- [ ] **5.1 Document dependency in pagination-buffer-tracking task list**

    - [ ] **5.1.a Add note to Phase 3.7 prerequisite section**
        - Document that Phase 3.7 verification assumes cross-page dedup complete
        - Cross-reference: `tasks-buffer-deduplication-data-quality.md` Phase 4 complete
        - File: `.arc/active/incidental/tasks-pagination-buffer-tracking.md`

    - [ ] **5.1.b Verify no code conflicts**
        - Phase 3.7 handles URL params (`tmdb_page_start`)
        - Our Phase 4 handles session state (returned movie IDs)
        - Confirm independent operation (no overlap)

### **Phase 6:** Final Cleanup, Quality Gates, and Manual Verification

- [ ] **6.1 Clean up frontend debug logging**

    **Context:** Frontend buffer reset fix (Phase 2 prerequisite) added console.log statements for debugging.

    - [ ] **6.1.a Remove debug logging from `MovieCollectionGrid.tsx`**
        - Remove console.log statements (buffer reset events)
        - Keep buffer reset logic intact
        - File: `frontend/src/components/movie/collection/MovieCollectionGrid.tsx`

    - [ ] **6.1.b Remove debug logging from `MovieGrid.tsx`**
        - Remove console.log statements (same pattern)
        - Keep buffer reset logic intact
        - File: `frontend/src/components/movie/collection/MovieGrid.tsx`

    - [ ] **6.1.c Run frontend tests - should still PASS**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Expect: All 453 tests pass

- [ ] **6.2 Run frontend quality gates**

    - [ ] **6.2.a Run frontend linting**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Expect: 0 violations

    - [ ] **6.2.b Run TypeScript type checking**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Expect: 0 errors

- [ ] **6.3 Manual browser verification**

    **Test Case:** Multi-genre filter (Animation + Family) across multiple pages

    - [ ] **6.3.a Verify within-page duplicate fix**
        - Navigate to Popular page 1
        - Apply Animation (16) + Family (10751) filters
        - Verify: NO duplicate movies on single page
        - Verify: Exactly 20 unique movies displayed

    - [ ] **6.3.b Verify cross-page duplicate fix**
        - From page 1, navigate to page 2
        - Verify: NO movies from page 1 appear on page 2
        - Navigate to page 3
        - Verify: NO movies from pages 1-2 appear on page 3
        - Check specific movies (Spirited Away, Mulan, Luca) appear only once

    - [ ] **6.3.c Verify backward navigation consistency**
        - From page 3, click browser back to page 2
        - Verify: Same movies as original page 2 visit
        - Click back to page 1
        - Verify: Same movies as original page 1 visit (session cleared on page 1)

    - [ ] **6.3.d Verify filter change resets session**
        - On page 2 with Animation+Family
        - Change to Animation only
        - Verify: New set of movies (session cleared)
        - Page numbering restarts at 1

    - [ ] **6.3.e Verify no regressions**
        - Test: Popular, Now Playing, Top Rated, Upcoming views
        - Test: Single genre filters work correctly
        - Test: Search with filters works correctly
        - Test: Pagination metadata (`next_tmdb_page_start`) still tracking

- [ ] **6.4 Run comprehensive quality gates**

    - [ ] **6.4.a Run all backend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Expect: All tests pass (40+ tests)

    - [ ] **6.4.b Run all frontend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Expect: All 453 tests pass

    - [ ] **6.4.c Run all linting**
        - Backend: `.venv-backend/bin/ruff check backend/apps/ backend/config/`
        - Frontend: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Markdown: `npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`
        - Expect: 0 violations total

    - [ ] **6.4.d Run all type checking**
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
