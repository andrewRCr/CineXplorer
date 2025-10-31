# Incidental: Discover Endpoint Consolidation

**Created:** 2025-10-31
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress

## Context

**Discovered:** Test organization Phase 3 analysis (2025-10-30) - testing in browser revealed broken endpoint architecture

**Interrupts:** `.arc/active/incidental/tasks-test-organization-standardization.md` at Phase 3 complete (paused
before Phase 4 file splits)

**Problem:** Frontend sends filter parameters to now-playing/upcoming endpoints, but backend silently drops them.
Upcoming endpoint returns NO results. Architecture is inconsistent - discover supports filtering, but list endpoints
don't.

**Why Now:**

- About to split tests by endpoint in test organization Phase 4
- Can't name tests correctly if endpoint names/structure will change
- Can't reliably test broken functionality
- Testing gaps allowed these issues to go unnoticed (we only tested "Popular")
- ~4-5 days to fix properly, blocks test organization completion

## Scope

### Will Do

- Diagnose upcoming endpoint failure (why no results returned)
- Audit actual test coverage with endpoint × feature matrix (validate gaps, not assume)
- Design DRY test patterns (parametrized tests, shared fixtures)
- Write comprehensive endpoint tests following test-first protocol
- Implement thin wrapper architecture (3 endpoints: now-playing/upcoming/browse all wrap TMDB discover with varying presets)
- Define preset merge logic (user filters + endpoint presets) for date-constrained endpoints
- Create Featured page stub at `/featured` (minimal landing page for interim use)
- Implement Browse page at `/browse` (general movie browsing with full filter control, no protected keys)
- Update frontend routing from `/movies/*` to `/browse/*` structure
- Research Featured page patterns for future hero implementation (planning only)
- Regenerate frontend types and verify all pages work in browser
- Write tests in forward-compatible locations for test organization Phase 4+

### Won't Do

- Implement popular/top-rated as separate endpoints (redundant - just sort options)
- Design/implement full Featured hero page (separate future work - stub only now)
- Modify backend endpoint implementation (all three are wrappers around TMDB discover)
- Add new filter types or parameters (use existing TMDB capabilities)
- Refactor unrelated service layer code

---

## Tasks

### **Phase 1:** Investigation ✅ COMPLETE

**Purpose:** Understand root causes and current state before writing code.

**Status:** Completed 2025-10-31. Diagnosed upcoming endpoint (1.1) and now-playing endpoint (1.2). Both issues
identified with fixes documented. Test coverage audit and test design moved to Phase 5 (after endpoints are fixed).

- [x] **1.1 Diagnose upcoming endpoint failure**

    **Goal:** Determine why upcoming returns no results and fix date range.

    **Completed:** Root cause identified and fixed. Endpoint now functional with clean separation from Now Playing.
    See notes file Phase 1.1 section for full findings.

    - [x] **1.1.1 Test current implementation with various date windows**
        - Tested: 30, 60, 90, 180-day windows
        - Tested: with and without `region` parameter
        - Finding: WITH `region="US"`: 0 results; WITHOUT `region`: 1626-2039 results
        - Conclusion: Region parameter breaks primary_release_date filtering (confirmed by research doc)

    - [x] **1.1.2 Compare with TMDB's upstream endpoint behavior**
        - Tested TMDB's `/movie/upcoming` directly
        - TMDB reports date range: Nov 5-26 (3 weeks)
        - TMDB returns movies from July-October (outside range) - confirms TMDB bug
        - Our endpoint: 1625 total results, 0 returned (backend filtered all out)
        - TMDB coverage analysis: Now Playing ends at today+5, Upcoming starts at today+5 (adjacent, no overlap)

    - [x] **1.1.3 Document findings and determine correct date range**
        - Root cause: `region: "US"` incompatible with `primary_release_date` filters
        - Recommended fix: Remove `region` parameter, start at today + 5 days, 60-day window
        - Rationale: Research doc confirms incompatibility (lines 77-88), testing validates
        - TMDB analysis shows Now Playing ends at today + 5 days, Upcoming starts at today + 5 days
        - Clean separation prevents overlap between endpoints
        - Documented: Notes file Phase 1.1 section with full evidence and recommendation

    - [x] **1.1.4 Apply immediate fix to unblock endpoint**
        - Goal: Make upcoming endpoint functional before architectural refactor
        - Changes to `get_upcoming_movies()` in movie_service.py:
            - Removed `"region": "US"` parameter (incompatible with primary_release_date)
            - Changed min_date: `today + timedelta(days=5)` (start where Now Playing ends)
            - Changed max_date: `today + timedelta(days=60)` (55-day effective window)
            - Added `min_vote_count` parameter threading through filter chain
            - Set `min_vote_count=None` for upcoming (unreleased movies have 0 votes)
        - Results: 1600 total results, 20 movies per page (working correctly)
        - Overlap verification: Now Playing max date=Oct 22, Upcoming min date=Nov 5 (clean separation)
        - Quality gates: Linting passed, type checking passed (0 errors)

- [x] **1.2 Diagnose now-playing endpoint issues**

    **Goal:** Investigate and fix two known issues with now-playing endpoint before test coverage audit.

    **Completed:** Both issues diagnosed with root causes identified and fixes documented.

    - [x] **1.2.1 Investigate filter/sort parameter handling**

        **Completed:** Root cause identified - API route signature mismatch.

        **Finding:** API route only accepts `PaginationParams` (page only), not `FilterParams`. Service method CAN accept
        filters (year_min/max, rating_min/max), but API route doesn't pass them through. Frontend sends filter
        parameters, but Django Ninja silently ignores them because they're not in the route signature.

        **Evidence:** Compared with browse endpoint which accepts `FilterParams`. See notes file Phase 1.2 for
        detailed code evidence.

    - [x] **1.2.2 Investigate date range coverage gap**

        **Completed:** Root cause identified - using TMDB native endpoint with uncontrollable date range.

        **Finding:** Current implementation calls TMDB's native `/movie/now_playing` endpoint which has TMDB's own date
        range logic (returns through Oct 22, missing 13 days to Nov 5). Cannot control date range with native endpoint.
        To match ADR-002 requirements (date preset for "theater planning window" through today + 5), need to use
        TMDB's discover endpoint with explicit date filters.

        **Evidence:** Tested endpoint returns movies through Oct 22 (9 days past). Expected per ADR-002: through today
        - 5 (Nov 5). TMDB native endpoint doesn't accept date parameters. See notes file Phase 1.2 for detailed
        analysis.

    - [x] **1.2.3 Determine root causes and fixes needed**

        **Completed:** Both issues analyzed, fixes documented in notes file Phase 1.2.

        **Fix #1 - Filter Support:** Change API route from `PaginationParams` to `FilterParams`, extract filter
        parameters, pass to service layer (which already supports them). Service should call TMDB discover internally
        with date presets (protected keys).

        **Fix #2 - Date Range Control:** Convert from native TMDB endpoint to thin wrapper pattern (same as
        upcoming). Date range: today - 30 days to today + 5 days (35-day window). Internally call TMDB discover with
        `primary_release_date.gte/lte`, remove any `region` parameter (incompatible per Phase 1.1), add
        `with_release_type=2|3` preset.

        **Rationale:** Matches ADR-002 thin wrapper pattern, enables filtering that frontend already sends, ensures
        explicit date control for "theater planning window", maintains consistency with upcoming endpoint
        implementation.

    **Note:** Implementation of fixes covered in Phase 2.2 (fix endpoints first, comprehensive testing in Phase 5).
    Phase 1.2 investigation confirmed approach and determined now-playing date range configuration.

---

### **Phase 2:** Fix Broken Endpoints (Implementation)

**Purpose:** Fix now-playing and upcoming endpoints based on Phase 1 investigation findings. Remove popular/top-rated
endpoints per ADR-002.

**Approach:** Implementation-first (diagnosed issues in Phase 1), comprehensive testing in Phase 5.

- [ ] **2.1 Implement preset merge helper**

    **Goal:** Create merge_with_preset() helper function with protected keys support.

    - [ ] **2.1.1 Create merge helper in `movie_helpers.py`**
        - Function: `merge_with_preset(user_filters, preset, protected_keys=None)`
        - Logic: Protected keys always use preset value
        - Logic: Non-protected keys merge (user + preset)
        - Logic: User keys not in preset are preserved
        - Location: `backend/apps/movie/helpers.py` or similar

    - [ ] **2.1.2 Define protected_keys for endpoint presets**
        - Now-playing: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Upcoming: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Browse: `[]` (no protected keys - full user control)
        - Note: Popular/top-rated NOT separate endpoints per ADR-002 (just sort options in Browse UI)
        - Document in code comments with rationale

    - [ ] **2.1.3 Add basic tests for merge logic**
        - Simple verification tests (not comprehensive coverage - that's Phase 5)
        - Test: Protected keys override user values
        - Test: Non-protected keys merge correctly
        - Quick validation that helper works
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py`
        - All merge tests should pass

- [ ] **2.2 Convert date-constrained routes to thin wrappers**

    **Goal:** Update now-playing and upcoming routes to be thin wrappers (call TMDB discover with date presets).

    - [ ] **2.2.1 Update `/now-playing` route to be thin wrapper**
        - **Fix Issue #1 (Filter Support):** Change route signature from `PaginationParams` to `FilterParams`
        - **Fix Issue #2 (Date Range):** Define preset with date range from Phase 1.2 findings:
            - Start: today - 30 days (past releases still in theaters)
            - End: today + 5 days (upcoming weekend, matches TMDB boundary)
            - Total: 35-day window
            - Release type: `2|3` (theatrical)
            - NO `region` parameter (incompatible with date filters per Phase 1.1)
        - Call `merge_with_preset()` with protected_keys: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Call `discover_movies()` with merged filters (internally calls TMDB discover, not native TMDB now_playing)
        - Add `min_vote_count` parameter threading (allow override, default to MIN_VOTE_COUNT)
        - Update docstring to document wrapper pattern and protected keys
        - Verify no overlap with upcoming endpoint (now-playing ends at today+5, upcoming starts at today+5)
        - Location: `backend/apps/movie/api.py`

    - [ ] **2.2.2 Update `/upcoming` route to be thin wrapper**
        - Accept `FilterParams` in route signature
        - Define preset with corrected date range from Phase 1.1 + release_type
        - Call `merge_with_preset()` with protected_keys: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Call `discover_movies()` with merged filters (internally calls TMDB discover)
        - Update docstring to document wrapper pattern and protected keys

    - [ ] **2.2.3 Rename `/discover` route to `/browse` (per ADR-002)**
        - **RENAME** `/api/movies/discover` to `/api/movies/browse`
        - Keep FilterParams signature (already correct)
        - Update docstring to clarify this is general browsing endpoint, thin wrapper with zero presets
        - Rationale (ADR-002): Consistent abstraction layer - all three endpoints are wrappers

    - [ ] **2.2.4 Remove popular/top-rated routes (per ADR-002)**
        - **REMOVE** `/api/movies/popular` route entirely (if it exists)
        - **REMOVE** `/api/movies/top-rated` route entirely (if it exists)
        - Rationale (ADR-002): These are just sort options, not distinct endpoints
        - Browse page will call `/api/movies/browse` with user-selected sort (popularity, top-rated, etc.)
        - Update API documentation to reflect 3-endpoint architecture

    - [ ] **2.2.5 Add basic smoke tests for endpoints**
        - Simple verification (not comprehensive - that's Phase 5)
        - Test: Now-playing returns results with genre filter
        - Test: Upcoming returns results with rating filter
        - Test: Browse still works (no regressions from rename)
        - Quick validation before moving to frontend
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/api/test_date_constrained_endpoints.py`
        - All now-playing and upcoming tests should pass

- [ ] **2.3 Update service layer**

    **Goal:** Ensure service layer supports all three endpoints. Service functions call TMDB discover internally.

    - [ ] **2.3.1 Refactor/remove service methods to align with ADR-002**
        - **KEEP** `get_now_playing_movies()` - refactor to call TMDB discover internally (not native TMDB now_playing)
        - **KEEP** `get_upcoming_movies()` - already refactored in Phase 1.1 to call TMDB discover internally
        - **KEEP** `discover_movies()` as core TMDB discover wrapper (calls TMDB `/discover/movie`)
        - **REMOVE** `get_popular_movies()` - no longer needed (Browse endpoint calls discover_movies directly)
        - **REMOVE** `get_top_rated_movies()` - no longer needed (Browse endpoint calls discover_movies directly)
        - Location: `backend/apps/movie/services/movie_service.py`

    - [ ] **2.3.2 Update service docstrings**
        - Document that `discover_movies()` wraps TMDB `/discover/movie`
        - Document that all three backend endpoints call `discover_movies()` internally
        - Note that API routes handle endpoint-specific presets, service layer is generic
        - Update any outdated comments

    - [ ] **2.3.3 Run existing test suite to check for regressions**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/`
        - All movie tests should pass
        - Verify test count matches expected (previous + new tests)

- [ ] **2.4 Run quality gates on backend changes**

    - [ ] **2.4.1 Run backend linting**
        - Command: `.venv-backend/bin/ruff check backend/apps/movie/ --fix`
        - Verify 0 violations

    - [ ] **2.4.2 Run Python type checking**
        - Command: `npx pyright backend/apps/movie/ --project backend`
        - Verify 0 type errors
        - Follow type safety strategy: No `Any` usage, proper typing

---

### **Phase 3:** Frontend Migration

**Purpose:** Implement Featured page, Browse page, and `/browse/*` routing structure per ADR-002. Clean up old
Popular/Top-Rated code.

**Approach:** Build working frontend that integrates with fixed backend endpoints from Phase 2.

- [ ] **3.1 Create Featured page component**
        - Location: `frontend/src/pages/Featured.tsx` (or similar based on structure)
        - Content: Welcome message "Welcome to CineXplorer"
        - Content: Browse navigation section with links to:
            - Browse → `/browse` (general discover)
            - Now Playing → `/browse/now-playing`
            - Upcoming → `/browse/upcoming`
        - Style: Basic, functional layout (no hero design yet)
        - Purpose: Interim landing page for testing and navigation

- [ ] **3.2 Create or update Browse page component**
        - Location: `frontend/src/pages/Browse.tsx` or update existing Popular component
        - Functionality: General movie browsing with full filter control
        - Default sort: `popularity.desc` (but user can change)
        - All filters enabled: genre, rating, year, sort, keywords, people (no protected keys)
        - Reuses existing MovieCollectionLayout and filter components
        - Calls `/api/movies/browse` endpoint

- [ ] **3.3 Update routing configuration**
        - Update: `/` route → Redirect to `/featured`
        - Add: `/featured` route → Featured component
        - Update: `/browse` route → Browse page (general movie browsing)
        - Update: `/browse/now-playing` route → Now Playing page (previously `/movies/now-playing`)
        - Update: `/browse/upcoming` route → Upcoming page (previously `/movies/upcoming`)
        - Remove or redirect: Old `/movies/*` routes
        - Location: Router configuration file (`frontend/src/App.tsx` or routes file)

- [ ] **3.4 Update route constants**
        - Location: `frontend/src/constants/routes.ts`
        - Update all route paths from `/movies/*` to `/browse/*`
        - Add `/featured` constant
        - Update ROUTE_NAMES to include "Featured" and "Browse"

- [ ] **3.5 Update navigation components**
        - Update sidebar/nav menu with Featured, Browse, Now Playing, Upcoming
        - Update all navigation links to use new `/browse/*` paths
        - Ensure Featured shows as active when on `/featured`
        - Update any breadcrumbs or active route indicators
        - Location: Navigation component files

- [ ] **3.6 Clean up old frontend code (per ADR-002)**
        - Remove any API client calls to `/api/movies/popular` (if they exist)
        - Remove any API client calls to `/api/movies/top-rated` (if they exist)
        - Delete old Popular page component (if separate from Browse page)
        - Delete old Top-Rated page component (if exists)
        - Remove or update tests for old Popular/Top-Rated pages
        - Search codebase for any hardcoded `/movies/popular` or `/movies/top-rated` references

- [ ] **3.7 Regenerate API types**
        - Command: `DEV_SKIP_TLS=true NODE_ENV=development npm run generate-types` (from frontend/)
        - Verify FilterParams now available for all 3 endpoints (browse, now-playing, upcoming)
        - Verify popular/top-rated routes removed from generated types
        - Verify discover route renamed to browse in generated types
        - Check for type conflicts or errors
        - Review generated types and commit if correct

- [ ] **3.8 Run basic frontend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Featured`
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Browse`
        - All Featured/Browse tests should pass
        - Routing tests should pass

- [ ] **3.9 Run frontend quality gates**
        - Frontend linting: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - TypeScript type checking: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Verify 0 violations/errors

---

### **Phase 4:** Manual Testing & Verification

**Purpose:** Verify all pages work in browser with correct routing, filtering, and user experience.

**Approach:** End-to-end manual testing before comprehensive automated test coverage (Phase 5).

- [ ] **4.1 Manual testing in browser**

    **Goal:** Verify all pages work with filtering, pagination, routing, and user experience is smooth.

    - [ ] **4.1.0 Test Featured stub page**
        - Navigate to home: `https://localhost:8444/`
        - Verify redirects to `https://localhost:8444/featured`
        - Verify welcome message displays: "Welcome to CineXplorer"
        - Verify browse navigation section displays
        - Verify 3 browse links present and labeled correctly
        - Click Browse link → verify navigates to `/browse`
        - Return to Featured, click Now Playing → verify navigates to `/browse/now-playing`
        - Return to Featured, click Upcoming → verify navigates to `/browse/upcoming`
        - Verify no console errors on Featured page

    - [ ] **4.1.1 Test Browse page (general browsing)**
        - Navigate to Browse page: `https://localhost:8444/browse`
        - Verify movies load
        - Verify default sort is popularity (check UI state)
        - Change sort to "Top Rated" → verify results update, movies are highly rated
        - Change sort back to "Popular" → verify returns to popular movies
        - Apply genre filter → verify results update
        - Apply rating filter → verify results update
        - Combine filters → verify both apply
        - Test pagination with filters → verify filters preserved
        - Clear filters → verify reset works
        - Verify all filter controls are enabled (no protected keys)

    - [ ] **4.1.2 Test Now Playing page**
        - Navigate to Now Playing page: `https://localhost:8444/browse/now-playing`
        - Verify movies load (not empty!)
        - Verify movies have current/recent release dates
        - Apply genre filter → verify results update
        - Apply rating filter → verify results update
        - Test pagination → verify filters preserved
        - Verify date range cannot be changed (protected)

    - [ ] **4.1.3 Test Upcoming page**
        - Navigate to Upcoming page: `https://localhost:8444/browse/upcoming`
        - Verify movies load (NOT empty - this was broken!)
        - Verify movies have future release dates
        - Apply genre filter → verify results update
        - Apply rating filter → verify results update
        - Test pagination → verify filters preserved
        - Verify date range cannot be changed (protected)

    - [ ] **4.1.4 Test navigation and routing**
        - From Featured, navigate to each browse option
        - From Browse/Now Playing/Upcoming, navigate back to Featured via nav
        - Verify active nav indicators update correctly
        - Test browser back/forward buttons
        - Verify old `/movies/*` URLs redirect or 404 appropriately

    - [ ] **4.1.5 Check browser console for errors**
        - Open developer console
        - Navigate through all pages (Featured, Browse, Now Playing, Upcoming)
        - Verify no console errors
        - Verify no network errors (check Network tab)

- [ ] **4.2 Update documentation**

    - [ ] **4.2.1 Update API route docstrings**
        - Document that all three endpoints (browse, now-playing, upcoming) are thin wrappers around TMDB discover
        - List preset parameters for each endpoint (browse has zero presets, date-constrained have date+release_type)
        - Document protected_keys and merge behavior for date-constrained endpoints
        - Document that popular/top-rated are accessed via Browse page sort options (not separate endpoints)

    - [ ] **4.2.2 Add code comments for merge logic**
        - Explain why protected_keys exist (preserve date-constrained context)
        - Document merge rules (preset wins for protected keys)
        - Add examples in comments

    - [ ] **4.2.3 Update architecture documentation**
        - Update TECHNICAL-OVERVIEW with routing structure (if applicable)
        - Document Featured page + Browse architecture
        - Reference ADR-002 for decision rationale
        - Document 3-endpoint simplified structure

---

### **Phase 5:** Comprehensive Test Coverage

**Purpose:** Audit existing test coverage and write comprehensive tests for all 3 endpoints now that they're working correctly.

**CRITICAL - Test Migration Context:**

This phase addresses a complex test migration challenge. Tests were written when the system had a DIFFERENT architecture:

**What Changed:**

- **OLD:** 4-5 endpoints (discover, now-playing, upcoming, popular, top-rated)
- **NEW:** 3 endpoints (browse, now-playing, upcoming) per ADR-002
- **OLD:** Now-playing used native TMDB endpoint, didn't accept filters
- **NEW:** Now-playing is thin wrapper, accepts filters with date presets
- **OLD:** Upcoming had broken date range (returned 0 results)
- **NEW:** Upcoming is thin wrapper with fixed date range (today+5 to today+60)
- **OLD:** Discover endpoint was named "discover"
- **NEW:** Renamed to "browse" for consistent abstraction layer
- **ELIMINATED:** Popular and top-rated as separate endpoints (now just sort options in Browse UI)

**Test Migration Tasks:**

1. **Catalog existing tests** - Identify what was written for old architecture
2. **Evaluate test intent** - Which tests are still relevant? Which need updates? Which should be deleted?
3. **Update test expectations** - Endpoints now work differently (accept filters, different date ranges, renamed discover→browse)
4. **Migrate test locations** - Tests in intermediate state from test organization work
5. **Write new parametrized tests** - Cover all 3 endpoints efficiently with DRY patterns
6. **Ensure no coverage loss** - Intent from old tests must be preserved even if implementation changes

**DO NOT:**

- Blindly delete tests for popular/top-rated without evaluating if Browse page needs similar coverage
- Assume old endpoint tests work as-is (they were written for broken endpoints or old discover name)
- Skip audit of "what was the intent?" before modifying tests

**Approach:** Systematic audit → design → implement → verify

- [ ] **5.1 Audit current test coverage**

    **Goal:** Create endpoint × feature matrix showing actual coverage NOW (endpoints work, can test accurately).

    **CRITICAL:** Evaluate tests written for 4-5 endpoints, now we have 3. Identify:
    - Tests for popular/top-rated: Delete or migrate intent to Browse page tests?
    - Tests for now-playing: Do they assume broken behavior (no filters)? Need updates?
    - Tests for upcoming: Do they expect 0 results (old bug)? Need updates?
    - Tests for discover/browse: Endpoint renamed, tests need updating for new name

    - [ ] **5.1.1 Catalog existing tests per endpoint**
        - List all tests touching browse/discover, now-playing, upcoming (3 endpoints per ADR-002)
        - Note: discover endpoint renamed to browse - tests will reference old name
        - List all tests for popular/top-rated - mark for evaluation (endpoints eliminated)
        - Identify which features each endpoint tests (filtering, pagination, buffer, errors)
        - Document test file locations and organization state
        - Note: Test organization is mid-migration, tests in intermediate state
        - **Create audit spreadsheet or matrix in notes file**

    - [ ] **5.1.2 Create coverage matrix**
        - Matrix format: Endpoint (rows) × Feature (columns)
        - Endpoints: Browse, Now-Playing, Upcoming (3 only)
        - Features: Genre filtering, rating filtering, year filtering, pagination, buffer mechanism, error handling, user
          enrichment, protected keys, preset merge logic
        - Mark tested (✅) vs gaps (❌) for each combination
        - **Add column:** "Was endpoint tested before refactor?" (old tests may need updates)
        - Document in notes file under "Coverage Matrix" section

    - [ ] **5.1.3 Evaluate popular/top-rated test intent**
        - Review all tests written for `/api/movies/popular` endpoint
        - Review all tests written for `/api/movies/top-rated` endpoint
        - For each test, answer: "What was this testing? Does Browse page need similar coverage?"
        - **Decision matrix:** Delete (no longer relevant) vs Migrate (adapt for Browse page)
        - Document decisions in notes file

    - [ ] **5.1.4 Calculate actual test gap**
        - Count missing endpoint × feature combinations
        - Count tests that need updates (written for old broken behavior)
        - Estimate realistic test count needed (not speculation)
        - Consider DRY patterns will reduce test function count
        - Update notes file with validated estimate

- [ ] **5.2 Design DRY test structure**

    **Goal:** Minimize test duplication through parametrized patterns and shared fixtures.

    - [ ] **5.2.1 Identify common behaviors across endpoints**
        - All 3 endpoints should handle genre filters
        - All 3 endpoints should handle rating filters
        - All 3 endpoints should handle pagination correctly
        - All 3 endpoints should handle invalid parameters gracefully
        - All 3 endpoints should support buffer mechanism
        - All 3 endpoints should respect user authentication for enrichment
        - **NEW:** Now-playing and upcoming should enforce protected keys (date range)

    - [ ] **5.2.2 Design parametrized test pattern**
        - Pattern for testing all 3 endpoints with same behavior (browse, now-playing, upcoming)
        - Use `@pytest.mark.parametrize('endpoint,preset_params', [...])` approach
        - Define endpoint configurations (URL, expected preset keys)
        - Note: Browse has no protected keys; now-playing/upcoming have date + release_type protected
        - Document pattern in notes file with code example

    - [ ] **5.2.3 Design shared fixtures for test data**
        - Reusable TMDB mock responses
        - Common filter parameter sets
        - Expected response structures
        - Forward-compatible with test organization (place in integration/conftest.py)
        - Follow type safety strategy (properly typed fixtures, no `Any`)

    - [ ] **5.2.4 Plan test file organization**
        - Where new tests should live: `backend/apps/movie/tests/integration/api/`
        - File naming: Follow test organization Phase 3 decisions
        - Anticipated files: `test_date_constrained_endpoints.py` for now-playing/upcoming wrapper tests
        - Shared behavior tests may extend existing discover test files
        - Document strategy for forward compatibility

- [ ] **5.3 Write tests for merge logic behavior**

    **Goal:** Comprehensive tests for preset + user filter merging with protected keys.

    **Note:** Basic smoke tests written in Phase 2.1.3. This is comprehensive coverage.

    - [ ] **5.3.1 Create comprehensive test file for merge logic in `test_endpoint_preset_merge.py`**
        - Location: `backend/apps/movie/tests/unit/helpers/` (forward-compatible)
        - Test: User filters + preset (additive merge)
        - Test: User conflicts with protected key (preset wins)
        - Test: User conflicts with non-protected key (user wins)
        - Test: Empty user filters (preset only)
        - Test: Empty preset (user only)
        - Test: Multiple protected keys
        - Test: Edge cases (None values, empty strings)

    - [ ] **5.3.2 Run merge logic tests and verify all pass**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py`
        - All tests should PASS (helper implemented in Phase 2.1)

- [ ] **5.4 Write parametrized endpoint behavior tests**

    **Goal:** Test that all 3 endpoints support common filtering behaviors with correct preset handling.

    **CRITICAL:** These tests verify the FIXED endpoints. Old tests may have assumed broken behavior.

    - [ ] **5.4.1 Create parametrized test file in `test_date_constrained_endpoints.py`**
        - Location: `backend/apps/movie/tests/integration/api/` (forward-compatible)
        - Use parametrized pattern from Phase 5.2.2 for now-playing and upcoming
        - Test: Genre filter works on both endpoints
        - Test: Rating filter works on both endpoints
        - Test: Multiple filters work together on both endpoints
        - Test: Invalid filter parameters return clear errors on both endpoints
        - Test: Pagination works with filters on both endpoints
        - Test: Buffer mechanism works on both endpoints
        - Follow type safety strategy: Properly typed fixtures, use ModelSchema patterns
        - All tests should PASS (endpoints fixed in Phase 2)

    - [ ] **5.4.2 Write preset-specific tests for date-constrained endpoints**
        - Test: Now-playing preset includes correct date range (today-30 to today+5) and release_type
        - Test: Upcoming preset includes correct future date range (today+5 to today+60) and release_type
        - Test: Protected keys (date range, release_type) cannot be overridden by user filters
        - Test: Non-protected filters (genre, rating) can be applied alongside presets
        - Test: Date range verification - now-playing movies have recent dates, upcoming have future dates
        - All tests should PASS

    - [ ] **5.4.3 Write tests for Browse page endpoint usage**
        - Location: Add to existing browse test files or new `test_browse_page.py`
        - Test: Browse page calls browse endpoint (`/api/movies/browse`)
        - Test: Browse page defaults to `sort_by=popularity.desc`
        - Test: Browse page allows user to change sort (no protected keys)
        - Test: Browse page supports all filters (genre, rating, year, keywords, people)
        - **Migrate intent from old popular/top-rated tests** (per 5.1.3 evaluation)
        - Tests for existing browse functionality should PASS

    - [ ] **5.4.4 Update existing endpoint tests**
        - **Update existing upcoming endpoint tests:**
            - Update upcoming date range in test fixtures (now uses today+5 to today+60)
            - Update mock TMDB responses to match new window
            - Remove expectations of 0 results (that was the bug!)
            - Location: Existing `test_movie_api.py` or migrated location
        - **Update now-playing tests:**
            - Update to expect FilterParams acceptance (old tests may assume PaginationParams only)
            - Update date range expectations (now uses today-30 to today+5)
            - Update to test filter functionality (old tests couldn't test this)
        - **Update browse/discover tests:**
            - Update endpoint name from discover to browse
            - Verify all test references updated

    - [ ] **5.4.5 Implement DRY test patterns and shared fixtures**
        - Create shared fixtures in integration conftest
        - Location: `backend/apps/movie/tests/integration/conftest.py`
        - Fixture: `date_constrained_endpoint_configs` (parametrize helper for now-playing/upcoming)
        - Fixture: `mock_tmdb_discover_response` (reusable TMDB response)
        - Fixture: `common_filter_params` (genre, rating, year test cases)
        - Follow type safety strategy: Properly typed return values

    - [ ] **5.4.6 Run endpoint tests and verify all pass**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/api/test_date_constrained_endpoints.py`
        - All endpoint tests should PASS (endpoints are fixed)
        - Document test count: X test functions, Y total executions with parametrization

- [ ] **5.5 Write tests for Featured stub page and routing**

    **Goal:** Test Featured page component and routing changes from `/movies/*` to `/browse/*`.

    **Note:** Basic frontend tests may have been written in Phase 3.8. This is comprehensive coverage.

    - [ ] **5.5.1 Create comprehensive frontend test file for Featured page**
        - Location: `frontend/src/pages/__tests__/Featured.test.tsx` (or similar based on structure)
        - Test: Featured page component renders without errors
        - Test: Displays welcome message "Welcome to CineXplorer"
        - Test: Displays browse navigation section
        - Test: Contains links to 3 browse views (Browse, Now Playing, Upcoming)
        - Verify link destinations: /browse, /browse/now-playing, /browse/upcoming
        - Test: Navigation links work correctly

    - [ ] **5.5.2 Create comprehensive routing tests for new `/browse/*` structure**
        - Test: `/` route redirects to `/featured`
        - Test: `/featured` route renders Featured component
        - Test: `/browse` route renders Browse page (general movie browsing)
        - Test: `/browse/now-playing` route renders Now Playing page
        - Test: `/browse/upcoming` route renders Upcoming page
        - Test: Old `/movies/*` routes redirect to `/browse/*` or return 404
        - Verify redirect logic for legacy URLs

    - [ ] **5.5.3 Create comprehensive tests for Browse page component**
        - Test: Browse page renders with browse endpoint integration
        - Test: Browse page shows filters (genre, rating, year, sort, etc.)
        - Test: Sort defaults to popularity but can be changed
        - Test: All filter controls are enabled (no protected keys)
        - Test: Genre filter updates results
        - Test: Rating filter updates results
        - Test: Sort change updates results
        - **Migrate relevant test intent from old Popular/Top-Rated page tests** (per 5.1.3)

    - [ ] **5.5.4 Run Featured/routing tests and verify all pass**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Featured`
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Browse`
        - All tests should PASS (components implemented in Phase 3)

- [ ] **5.6 Featured page architecture research and planning**

    **Goal:** Research hero-style Featured page patterns and document future implementation approach.

    **Note:** This is future planning work, not implementation. Can be done at end of Phase 5.

    - [ ] **5.6.1 Create notes file for future Featured page design work**
        - Create: `.arc/active/incidental/notes-featured-page-design.md`
        - Document decision context (ADR-002 reference)
        - Create placeholder sections for research findings

    - [ ] **5.6.2 Research TMDB trending/popular endpoints**
        - Identify available TMDB endpoints: `/trending/*`, `/movie/popular`, others
        - Document parameters, response formats, update frequency
        - Determine what content can be used for Featured page
        - Document findings in notes file

    - [ ] **5.6.3 Research industry patterns for hero landing pages**
        - TMDB website: Analyze home page structure, content types, layout
        - Letterboxd: Analyze featured content strategy, collections approach
        - Netflix: Analyze hero sections, horizontal scrolling patterns
        - Other movie discovery services (IMDb, Trakt, etc.)
        - Document findings in notes file

    - [ ] **5.6.4 Analyze content strategy options for Featured page**
        - What content types: Trending, popular this week, featured collections, new releases
        - Update frequency: How to keep content fresh with TMDB APIs
        - Layout patterns: Hero sections, horizontal scrolls, grid layouts
        - Relationship to Browse/Now Playing/Upcoming: How Featured complements browse tools
        - Document options and trade-offs in notes file

    - [ ] **5.6.5 Scope future Featured page hero implementation**
        - Required components (hero section, collections, navigation)
        - Data requirements (TMDB API endpoints identified in 5.6.2)
        - Frontend work estimate
        - Testing approach
        - Document in notes file for future task list creation

    - [ ] **5.6.6 Update notes file with implementation timeline**
        - Recommendation: After all active task lists complete
        - Rationale: This is feature work, not technical debt
        - Interim: Stub Featured page provides functional navigation

---

### **Phase 6:** Final Verification & Cleanup

**Purpose:** Final quality gates, full test suite execution, and atomic commits.

- [ ] **6.1 Run full quality gates**

    - [ ] **6.1.1 Run backend test suite**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Verify 100% pass rate
        - Verify test count increased by expected amount

    - [ ] **6.1.2 Run backend test suite with coverage**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest --cov=apps.movie
          --cov-report=term-missing apps/movie/tests/`
        - Verify coverage maintained or improved
        - Check that new wrapper code is covered

    - [ ] **6.1.3 Run frontend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Should be unchanged (backend-only changes)
        - Verify 100% pass rate

    - [ ] **6.1.4 Run all linting and type checking**
        - Backend linting: `.venv-backend/bin/ruff check backend/apps/ backend/config/`
        - Python type checking: `npx pyright backend/apps/ backend/config/ --project backend`
        - Frontend linting: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Frontend type checking: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Verify 0 violations/errors across all checks

- [ ] **6.2 Code review and cleanup**

    - [ ] **6.2.1 Review all changed files**
        - Check for commented-out code → remove
        - Check for unused imports → remove
        - Check for consistent naming patterns
        - Check for consistent code style
        - Verify all tests follow type safety strategy

    - [ ] **6.2.2 Verify no dead code remains**
        - Confirm old service methods removed
        - Confirm no duplicate helper functions
        - Check for orphaned test fixtures

---

## Implementation Notes

### Test Organization Forward Compatibility

**Current state:** Test organization is mid-migration (Phase 3 complete, Phase 4+ pending)

**Strategy for new tests:**

- Place in final locations: `backend/apps/movie/tests/integration/api/` or `backend/apps/movie/tests/unit/helpers/`
- Use final naming: `test_curated_endpoints.py`, `test_endpoint_preset_merge.py`
- Follow test organization Phase 3 decisions for file splits
- After this work completes, test organization can proceed with Phase 4 using correct endpoint names

**Files we'll create:**

1. `backend/apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py` - Merge logic tests
2. `backend/apps/movie/tests/integration/api/test_date_constrained_endpoints.py` - Now-playing/upcoming tests
3. Updates to `backend/apps/movie/tests/integration/conftest.py` - Shared fixtures
4. `frontend/src/pages/Featured.tsx` - Featured page stub component
5. `frontend/src/pages/Browse.tsx` - General browse page
6. `.arc/active/incidental/notes-featured-page-design.md` - Future hero implementation research

**DRY emphasis:** Use parametrized tests to test both date-constrained endpoints with same logic, minimizing test
function count while maximizing coverage.

### Type Safety Adherence

**Follow strategy-type-safety.md patterns:**

- Properly typed test fixtures (no `Any` usage)
- Use ModelSchema for response validation in tests
- Type mock responses correctly
- Follow Pydantic patterns for test data models

### Architecture Decisions Made

1. **Featured page + simplified browse architecture** (ADR-002)
   - Featured page at `/featured` (navigable landing page)
   - Browse page at `/browse` (general discover, NO protected keys)
   - Date-constrained endpoints: `/browse/now-playing`, `/browse/upcoming`
   - Popular/top-rated accessed via Browse page sort options (not separate endpoints)

2. **Routing structure:** `/browse/*` instead of `/movies/*`
   - Action-oriented routing parallel with `/search`
   - Healthy separation: frontend (actions) vs backend (domain)

3. **Filter merge strategy:** Accept all user filters, preset wins for protected_keys on date-constrained endpoints

### Critical Questions from Investigation

1. **Why does upcoming fail?** Phase 1.1 diagnosed (date window, region, TMDB data quality) ✅
2. **Actual test gap size?** Phase 5.1 will validate with coverage matrix
3. **Best DRY patterns?** Phase 5.2 will design parametrized approach to minimize duplication
4. **TMDB trending endpoints?** Phase 5.6 will research available endpoints for Featured page
5. **Endpoint naming consistency?** Resolved - all three are thin wrappers (browse, now-playing, upcoming) ✅

### Success Criteria

- ✅ Date-constrained endpoints (now-playing, upcoming) accept filter parameters with date presets
- ✅ Both endpoints support genre, rating, year, keyword, people filters (dates protected)
- ✅ Upcoming endpoint returns results reliably
- ✅ Browse page provides full browsing functionality with NO protected keys
- ✅ Featured page provides functional navigation (stub for interim, hero design future)
- ✅ Comprehensive test coverage prevents future regressions
- ✅ Architecture is DRY (all three endpoints are thin wrappers around TMDB discover with varying presets)
- ✅ Frontend routing updated to `/browse/*` structure
- ✅ Frontend types updated, all pages work in browser
- ✅ All quality gates pass (100% test pass rate, 0 linting/type errors)
- ✅ Test organization can proceed with Phase 4 using correct endpoint names
- ✅ Featured page research documented for future hero implementation

---

**Version:** 1.0 | **Created:** 2025-10-30
