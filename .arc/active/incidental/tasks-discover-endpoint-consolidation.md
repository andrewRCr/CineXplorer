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
- Implement thin wrapper architecture (2 endpoints: now-playing/upcoming use discover with date presets)
- Define preset merge logic (user filters + endpoint presets) for date-constrained endpoints
- Create Featured page stub at `/featured` (minimal landing page for interim use)
- Implement Browse page at `/browse` (general discover with full filter control, no protected keys)
- Update frontend routing from `/movies/*` to `/browse/*` structure
- Research Featured page patterns for future hero implementation (planning only)
- Regenerate frontend types and verify all pages work in browser
- Write tests in forward-compatible locations for test organization Phase 4+

### Won't Do

- Implement popular/top-rated as separate endpoints (redundant - just sort options)
- Design/implement full Featured hero page (separate future work - stub only now)
- Modify discover endpoint implementation (keep as-is, just add wrappers)
- Add new filter types or parameters (use existing TMDB capabilities)
- Refactor unrelated service layer code

---

## Tasks

### **Phase 1:** Investigation & Test Gap Analysis

**Purpose:** Understand root causes and current state before writing code.

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

- [ ] **1.2 Diagnose now-playing endpoint issues**

    **Goal:** Investigate and fix two known issues with now-playing endpoint before test coverage audit.

    - [ ] **1.2.1 Investigate filter/sort parameter handling**
        - Check API route signature in `backend/apps/movie/api.py`
        - Verify FilterParams are accepted and passed to service layer
        - Test if genre/rating filters work via manual curl/browser testing
        - Test if sort parameter works
        - Document findings: Are params accepted? Passed through? Working end-to-end?
        - Root cause: "Backend silently drops filters" per notes line 14

    - [ ] **1.2.2 Investigate date range coverage gap**
        - Current behavior: Returns movies up to Oct 22 (9 days in past from Oct 31)
        - Expected behavior: Should return movies through today + 5 days (Nov 5)
        - Check `get_now_playing_movies()` implementation in movie_service.py
        - Compare with TMDB's native `/movie/now_playing` endpoint date range
        - Test with/without `region` parameter (may have same incompatibility as Upcoming)
        - Document actual date range vs expected "theater planning window" (past releases + upcoming weekend)

    - [ ] **1.2.3 Determine root causes and fixes needed**
        - Summary of Issue 1: Filter/sort handling (route, service, or both?)
        - Summary of Issue 2: Date range configuration
        - Recommended fixes with rationale
        - Update notes file with findings

    - [ ] **1.2.4 Apply fixes to now-playing endpoint**
        - Fix filter/sort parameter handling (route and/or service layer)
        - Fix date range if needed (remove region? adjust window?)
        - Add any needed parameter threading (like min_vote_count)
        - Test endpoint returns results with filters working
        - Verify date coverage matches expected range (through today + 5)
        - Quality gates: Run linting and type checking on modified files

- [ ] **1.3 Audit current test coverage**

    **Goal:** Create endpoint × feature matrix showing actual coverage and validated gaps.

    - [ ] **1.3.1 Catalog existing tests per endpoint**
        - List all tests touching discover, now-playing, upcoming, popular, top-rated
        - Identify which features each endpoint tests (filtering, pagination, buffer, errors)
        - Document test file locations and organization state
        - Note: Test organization is mid-migration, tests in intermediate state

    - [ ] **1.3.2 Create coverage matrix**
        - Matrix format: Endpoint (rows) × Feature (columns)
        - Features: Genre filtering, rating filtering, pagination, buffer mechanism, error handling, user enrichment
        - Mark tested (✅) vs gaps (❌) for each combination
        - Document in notes file under "Coverage Matrix" section

    - [ ] **1.3.3 Calculate actual test gap**
        - Count missing endpoint × feature combinations
        - Estimate realistic test count needed (not speculation)
        - Consider DRY patterns will reduce test function count
        - Update notes file with validated estimate (replace "60-80" speculation)

- [ ] **1.4 Design DRY test structure**

    **Goal:** Minimize test duplication through parametrized patterns and shared fixtures.

    - [ ] **1.4.1 Identify common behaviors across endpoints**
        - All should handle genre filters
        - All should handle pagination correctly
        - All should handle invalid parameters gracefully
        - All should support buffer mechanism
        - All should respect user authentication for enrichment

    - [ ] **1.4.2 Design parametrized test pattern**
        - Pattern for testing all 4 endpoints with same behavior
        - Use `@pytest.mark.parametrize('endpoint,preset_params', [...])` approach
        - Define endpoint configurations (URL, expected preset keys)
        - Document pattern in notes file with code example

    - [ ] **1.4.3 Design shared fixtures for test data**
        - Reusable TMDB mock responses
        - Common filter parameter sets
        - Expected response structures
        - Forward-compatible with test organization (place in integration/conftest.py)
        - Follow type safety strategy (properly typed fixtures, no `Any`)

    - [ ] **1.4.4 Plan test file organization**
        - Where new tests should live: `backend/apps/movie/tests/integration/api/`
        - File naming: Follow test organization Phase 3 decisions
        - Anticipated files: `test_curated_endpoints.py` for wrapper-specific tests
        - Shared behavior tests may extend existing discover test files
        - Document strategy for forward compatibility

- [ ] **1.5 Featured page architecture research and planning**

    **Goal:** Research hero-style Featured page patterns and document future implementation approach.

    - [ ] **1.5.1 Create notes file for future Featured page design work**
        - Create: `.arc/active/incidental/notes-featured-page-design.md`
        - Document decision context (ADR-002 reference)
        - Create placeholder sections for research findings

    - [ ] **1.5.2 Research TMDB trending/popular endpoints**
        - Identify available TMDB endpoints: `/trending/*`, `/movie/popular`, others
        - Document parameters, response formats, update frequency
        - Determine what content can be used for Featured page
        - Document findings in notes file

    - [ ] **1.5.3 Research industry patterns for hero landing pages**
        - TMDB website: Analyze home page structure, content types, layout
        - Letterboxd: Analyze featured content strategy, collections approach
        - Netflix: Analyze hero sections, horizontal scrolling patterns
        - Other movie discovery services (IMDb, Trakt, etc.)
        - Document findings in notes file

    - [ ] **1.5.4 Analyze content strategy options for Featured page**
        - What content types: Trending, popular this week, featured collections, new releases
        - Update frequency: How to keep content fresh with TMDB APIs
        - Layout patterns: Hero sections, horizontal scrolls, grid layouts
        - Relationship to Browse/Now Playing/Upcoming: How Featured complements browse tools
        - Document options and trade-offs in notes file

    - [ ] **1.5.5 Scope future Featured page hero implementation**
        - Required components (hero section, collections, navigation)
        - Data requirements (TMDB API endpoints identified in 1.5.2)
        - Frontend work estimate
        - Testing approach
        - Document in notes file for future task list creation

    - [ ] **1.5.6 Update notes file with implementation timeline**
        - Recommendation: After all active task lists complete
        - Rationale: This is feature work, not technical debt
        - Interim: Stub Featured page provides functional navigation

### **Phase 2:** Write Comprehensive Tests (Test-First)

**Purpose:** Establish test coverage BEFORE refactoring architecture to prevent regressions.

- [ ] **2.1 Write tests for merge logic behavior**

    **Goal:** Test preset + user filter merging before implementing merge helper.

    - [ ] **2.1.1 Create test file for merge logic in `test_endpoint_preset_merge.py`**
        - Location: `backend/apps/movie/tests/unit/helpers/` (forward-compatible)
        - Test: User filters + preset (additive merge)
        - Test: User conflicts with protected key (preset wins)
        - Test: User conflicts with non-protected key (user wins)
        - Test: Empty user filters (preset only)
        - Test: Empty preset (user only)
        - Expect tests to FAIL initially (helper doesn't exist yet)

    - [ ] **2.1.2 Run merge logic tests and verify failures**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py`
        - Document expected failure messages

- [ ] **2.2 Write parametrized endpoint behavior tests**

    **Goal:** Test that date-constrained endpoints (now-playing/upcoming) support common filtering behaviors.

    - [ ] **2.2.1 Create parametrized test file in `test_date_constrained_endpoints.py`**
        - Location: `backend/apps/movie/tests/integration/api/` (forward-compatible)
        - Use parametrized pattern from Phase 1.3.2 for now-playing and upcoming
        - Test: Genre filter works on both endpoints
        - Test: Rating filter works on both endpoints
        - Test: Multiple filters work together on both endpoints
        - Test: Invalid filter parameters return clear errors on both endpoints
        - Test: Pagination works with filters on both endpoints
        - Test: Buffer mechanism works on both endpoints
        - Follow type safety strategy: Properly typed fixtures, use ModelSchema patterns
        - Expect tests to FAIL initially (endpoints don't accept filters yet)

    - [ ] **2.2.2 Write preset-specific tests for date-constrained endpoints**
        - Test: Now-playing preset includes correct date range and release_type
        - Test: Upcoming preset includes correct future date range and release_type
        - Test: Protected keys (date range, release_type) cannot be overridden by user filters
        - Test: Non-protected filters (genre, rating) can be applied alongside presets
        - Expect tests to FAIL initially

    - [ ] **2.2.3 Write tests for Browse page discover usage**
        - Location: Add to existing discover test files or new `test_browse_page.py`
        - Test: Browse page calls discover endpoint
        - Test: Browse page defaults to `sort_by=popularity.desc`
        - Test: Browse page allows user to change sort (no protected keys)
        - Test: Browse page supports all filters (genre, rating, year, keywords, people)
        - Expect tests for existing discover functionality to PASS

    - [ ] **2.2.4 Run endpoint tests and verify failures where expected**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/api/test_date_constrained_endpoints.py`
        - Document failure count and messages for date-constrained endpoint tests
        - Browse/discover tests should mostly pass (existing functionality)

- [ ] **2.3 Fix upcoming endpoint tests**

    **Goal:** Update existing tests with working date range from Phase 1.1 findings.

    - [ ] **2.3.1 Update upcoming date range in test fixtures**
        - Apply date range determined in Phase 1.1
        - Update mock TMDB responses to match new window
        - Location: Existing `test_movie_api.py` or new test location if migrated

    - [ ] **2.3.2 Add missing upcoming endpoint tests**
        - Test: Returns non-empty results
        - Test: Date range is correct (future dates only)
        - Test: Genre filters work
        - Test: Pagination works
        - Add to parametrized tests if possible (DRY)

    - [ ] **2.3.3 Run upcoming tests and verify they pass**
        - Tests should PASS with corrected date range
        - Document results

- [ ] **2.4 Implement DRY test patterns and shared fixtures**

    **Goal:** Extract common test logic to reduce duplication.

    - [ ] **2.4.1 Create shared fixtures in integration conftest**
        - Location: `backend/apps/movie/tests/integration/conftest.py`
        - Fixture: `date_constrained_endpoint_configs` (parametrize helper for now-playing/upcoming)
        - Fixture: `mock_tmdb_discover_response` (reusable TMDB response)
        - Fixture: `common_filter_params` (genre, rating, year test cases)
        - Follow type safety strategy: Properly typed return values

    - [ ] **2.4.2 Refactor new tests to use shared fixtures**
        - Update test_date_constrained_endpoints.py to use shared fixtures
        - Ensure no test duplication across endpoint tests
        - Measure duplication reduction

    - [ ] **2.4.3 Run full test suite and verify all new tests pass or fail as expected**
        - New date-constrained endpoint tests requiring implementation should FAIL
        - Tests for existing discover/browse behavior should PASS
        - Document test count: X test functions, Y total executions with parametrization

- [ ] **2.5 Write tests for Featured stub page and routing**

    **Goal:** Test-first for minimal Featured page component and routing changes from `/movies/*` to `/browse/*`.

    - [ ] **2.5.1 Create frontend test file for Featured page**
        - Location: `frontend/src/pages/__tests__/Featured.test.tsx` (or similar based on structure)
        - Test: Featured page component renders without errors
        - Test: Displays welcome message "Welcome to CineXplorer"
        - Test: Displays browse navigation section
        - Test: Contains links to 3 browse views (Browse, Now Playing, Upcoming)
        - Verify link destinations: /browse, /browse/now-playing, /browse/upcoming
        - Expect tests to FAIL initially (component doesn't exist yet)

    - [ ] **2.5.2 Create routing tests for new `/browse/*` structure**
        - Test: `/` route redirects to `/featured`
        - Test: `/featured` route renders Featured component
        - Test: `/browse` route renders Browse page (general discover)
        - Test: `/browse/now-playing` route renders Now Playing page
        - Test: `/browse/upcoming` route renders Upcoming page
        - Test: Old `/movies/*` routes redirect to `/browse/*` or return 404
        - Expect tests to FAIL initially (routes not updated yet)

    - [ ] **2.5.3 Create tests for Browse page component**
        - Test: Browse page renders with discover endpoint integration
        - Test: Browse page shows filters (genre, rating, year, sort, etc.)
        - Test: Sort defaults to popularity but can be changed
        - Test: All filter controls are enabled (no protected keys)
        - Expect tests to FAIL initially (Browse page doesn't exist yet)

    - [ ] **2.5.4 Run Featured/routing tests and verify failures**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Featured`
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Browse`
        - Document expected failure messages

### **Phase 3:** Architecture Implementation

**Purpose:** Implement thin wrapper pattern and merge logic to make tests pass.

- [ ] **3.1 Implement preset merge helper**

    **Goal:** Create merge_with_preset() helper function with protected keys support.

    - [ ] **3.1.1 Create merge helper in `movie_helpers.py`**
        - Function: `merge_with_preset(user_filters, preset, protected_keys=None)`
        - Logic: Protected keys always use preset value
        - Logic: Non-protected keys merge (user + preset)
        - Logic: User keys not in preset are preserved
        - Location: `backend/apps/movie/helpers.py` or similar

    - [ ] **3.1.2 Define protected_keys for each endpoint**
        - Popular: `['sort_by']` (user can't override sort)
        - Now-playing: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Top-rated: `['sort_by', 'vote_count.gte']`
        - Upcoming: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Document in code comments with rationale

    - [ ] **3.1.3 Run merge logic tests - should now PASS**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py`
        - All merge tests should pass

- [ ] **3.2 Convert date-constrained routes to thin wrappers**

    **Goal:** Update now-playing and upcoming routes to call discover with date presets.

    - [ ] **3.2.1 Update `/now-playing` route to use discover wrapper pattern**
        - Accept `FilterParams` in route signature
        - Define preset with date range from Phase 1.1 findings + release_type
        - Call `merge_with_preset()` with protected_keys: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Call `discover_movies()` with merged filters
        - Update docstring to document wrapper pattern and protected keys
        - Location: `backend/apps/movie/api.py`

    - [ ] **3.2.2 Update `/upcoming` route to use discover wrapper pattern**
        - Accept `FilterParams` in route signature
        - Define preset with corrected date range from Phase 1.1 + release_type
        - Call `merge_with_preset()` with protected_keys: `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`
        - Call `discover_movies()` with merged filters
        - Update docstring to document wrapper pattern and protected keys

    - [ ] **3.2.3 Remove or update popular/top-rated routes**
        - Remove `/popular` route (Browse page calls `/discover` directly)
        - Remove `/top-rated` route (Browse page calls `/discover` with user-selected sort)
        - Or: Keep as simple redirects to `/discover` with suggested defaults (document if keeping)
        - Update API documentation

    - [ ] **3.2.4 Run date-constrained endpoint tests - should now PASS**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/integration/api/test_date_constrained_endpoints.py`
        - All now-playing and upcoming tests should pass

- [ ] **3.3 Update service layer**

    **Goal:** Remove duplicate service methods, keep only discover implementation.

    - [ ] **3.3.1 Remove old service methods**
        - Remove `get_now_playing_movies()` if it exists
        - Remove `get_upcoming_movies()` if it exists
        - Keep `discover_movies()` as core implementation
        - Keep `get_popular_movies()` only if needed, otherwise remove
        - Keep `get_top_rated_movies()` only if needed, otherwise remove
        - Location: `backend/apps/movie/movie_service.py`

    - [ ] **3.3.2 Update service docstrings**
        - Document that `discover_movies()` is core implementation
        - Note that routes handle endpoint-specific presets
        - Update any outdated comments

    - [ ] **3.3.3 Run full test suite and verify no regressions**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/movie/tests/`
        - All movie tests should pass
        - Verify test count matches expected (previous + new tests)

- [ ] **3.4 Run quality gates on backend changes**

    - [ ] **3.4.1 Run backend linting**
        - Command: `.venv-backend/bin/ruff check backend/apps/movie/ --fix`
        - Verify 0 violations

    - [ ] **3.4.2 Run Python type checking**
        - Command: `npx pyright backend/apps/movie/ --project backend`
        - Verify 0 type errors
        - Follow type safety strategy: No `Any` usage, proper typing

- [ ] **3.5 Implement stub home page and routing**

    **Goal:** Create minimal home page component with navigation structure per ADR-002 specifications.

    - [ ] **3.5.1 Create Featured page component**
        - Location: `frontend/src/pages/Featured.tsx` (or similar based on structure)
        - Content: Welcome message "Welcome to CineXplorer"
        - Content: Browse navigation section with links to:
            - Browse → `/browse` (general discover)
            - Now Playing → `/browse/now-playing`
            - Upcoming → `/browse/upcoming`
        - Style: Basic, functional layout (no hero design yet)
        - Purpose: Interim landing page for testing and navigation

    - [ ] **3.5.2 Create or update Browse page component**
        - Location: `frontend/src/pages/Browse.tsx` or update existing Popular component
        - Functionality: General movie discover with full filter control
        - Default sort: `popularity.desc` (but user can change)
        - All filters enabled: genre, rating, year, sort, keywords, people (no protected keys)
        - Reuses existing MovieCollectionLayout and filter components
        - Calls `/api/movies/discover` endpoint

    - [ ] **3.5.3 Update routing configuration**
        - Update: `/` route → Redirect to `/featured`
        - Add: `/featured` route → Featured component
        - Update: `/browse` route → Browse page (general discover)
        - Update: `/browse/now-playing` route → Now Playing page (previously `/movies/now-playing`)
        - Update: `/browse/upcoming` route → Upcoming page (previously `/movies/upcoming`)
        - Remove or redirect: Old `/movies/*` routes
        - Location: Router configuration file (`frontend/src/App.tsx` or routes file)

    - [ ] **3.5.4 Update route constants**
        - Location: `frontend/src/constants/routes.ts`
        - Update all route paths from `/movies/*` to `/browse/*`
        - Add `/featured` constant
        - Update ROUTE_NAMES to include "Featured" and "Browse"

    - [ ] **3.5.5 Update navigation components**
        - Update sidebar/nav menu with Featured, Browse, Now Playing, Upcoming
        - Update all navigation links to use new `/browse/*` paths
        - Ensure Featured shows as active when on `/featured`
        - Update any breadcrumbs or active route indicators
        - Location: Navigation component files

    - [ ] **3.5.6 Run Featured/Browse page tests - should now PASS**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Featured`
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test Browse`
        - All Featured/Browse tests should pass
        - Routing tests should pass

    - [ ] **3.5.7 Run frontend quality gates**
        - Frontend linting: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - TypeScript type checking: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Verify 0 violations/errors

### **Phase 4:** Frontend Updates & Manual Testing

**Purpose:** Verify changes work in browser and update documentation.

- [ ] **4.1 Regenerate API types**

    - [ ] **4.1.1 Run type generation from OpenAPI spec**
        - Command: `DEV_SKIP_TLS=true NODE_ENV=development npm run generate-types` (from frontend/)
        - Verify FilterParams now available for all 4 endpoints
        - Check for type conflicts or errors

    - [ ] **4.1.2 Review generated types**
        - Verify date-constrained endpoints (now-playing, upcoming) accept filters
        - Verify discover endpoint accepts all filters (used by Browse page)
        - Check that preset fields are documented in schema
        - Commit updated types if correct

- [ ] **4.2 Manual testing in browser**

    **Goal:** Verify all pages work with filtering, pagination, routing, and user experience is smooth.

    - [ ] **4.2.0 Test Featured stub page**
        - Navigate to home: `https://localhost:8444/`
        - Verify redirects to `https://localhost:8444/featured`
        - Verify welcome message displays: "Welcome to CineXplorer"
        - Verify browse navigation section displays
        - Verify 3 browse links present and labeled correctly
        - Click Browse link → verify navigates to `/browse`
        - Return to Featured, click Now Playing → verify navigates to `/browse/now-playing`
        - Return to Featured, click Upcoming → verify navigates to `/browse/upcoming`
        - Verify no console errors on Featured page

    - [ ] **4.2.1 Test Browse page (general discover)**
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

    - [ ] **4.2.2 Test Now Playing page**
        - Navigate to Now Playing page: `https://localhost:8444/browse/now-playing`
        - Verify movies load (not empty!)
        - Verify movies have current/recent release dates
        - Apply genre filter → verify results update
        - Apply rating filter → verify results update
        - Test pagination → verify filters preserved
        - Verify date range cannot be changed (protected)

    - [ ] **4.2.3 Test Upcoming page**
        - Navigate to Upcoming page: `https://localhost:8444/browse/upcoming`
        - Verify movies load (NOT empty - this was broken!)
        - Verify movies have future release dates
        - Apply genre filter → verify results update
        - Apply rating filter → verify results update
        - Test pagination → verify filters preserved
        - Verify date range cannot be changed (protected)

    - [ ] **4.2.4 Test navigation and routing**
        - From Featured, navigate to each browse option
        - From Browse/Now Playing/Upcoming, navigate back to Featured via nav
        - Verify active nav indicators update correctly
        - Test browser back/forward buttons
        - Verify old `/movies/*` URLs redirect or 404 appropriately

    - [ ] **4.2.5 Check browser console for errors**
        - Open developer console
        - Navigate through all pages (Featured, Browse, Now Playing, Upcoming)
        - Verify no console errors
        - Verify no network errors (check Network tab)

- [ ] **4.3 Update documentation**

    - [ ] **4.3.1 Update API route docstrings**
        - Document that now-playing/upcoming are thin wrappers around discover
        - List preset parameters for each endpoint (date range, release type)
        - Document protected_keys and merge behavior
        - Note that Browse page calls discover directly (no wrapper needed)
        - Document that popular/top-rated are accessed via Browse page sort options

    - [ ] **4.3.2 Add code comments for merge logic**
        - Explain why protected_keys exist (preserve date-constrained context)
        - Document merge rules (preset wins for protected keys)
        - Add examples in comments

    - [ ] **4.3.3 Update architecture documentation**
        - Update TECHNICAL-OVERVIEW with routing structure (if applicable)
        - Document Featured page + Browse architecture
        - Reference ADR-002 for decision rationale
        - Document 3-endpoint simplified structure

### **Phase 5:** Verification & Cleanup

**Purpose:** Final quality gates and atomic commits.

- [ ] **5.1 Run full quality gates**

    - [ ] **5.1.1 Run backend test suite**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Verify 100% pass rate
        - Verify test count increased by expected amount

    - [ ] **5.1.2 Run backend test suite with coverage**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec backend pytest --cov=apps.movie
          --cov-report=term-missing apps/movie/tests/`
        - Verify coverage maintained or improved
        - Check that new wrapper code is covered

    - [ ] **5.1.3 Run frontend tests**
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Should be unchanged (backend-only changes)
        - Verify 100% pass rate

    - [ ] **5.1.4 Run all linting and type checking**
        - Backend linting: `.venv-backend/bin/ruff check backend/apps/ backend/config/`
        - Python type checking: `npx pyright backend/apps/ backend/config/ --project backend`
        - Frontend linting: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`
        - Frontend type checking: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`
        - Verify 0 violations/errors across all checks

- [ ] **5.2 Code review and cleanup**

    - [ ] **5.2.1 Review all changed files**
        - Check for commented-out code → remove
        - Check for unused imports → remove
        - Check for consistent naming patterns
        - Check for consistent code style
        - Verify all tests follow type safety strategy

    - [ ] **5.2.2 Verify no dead code remains**
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
5. `frontend/src/pages/Browse.tsx` - General browse/discover page
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

1. **Why does upcoming fail?** Phase 1.1 will diagnose (date window, region, TMDB data quality)
2. **Actual test gap size?** Phase 1.2 will validate with coverage matrix (not "60-80" speculation)
3. **Best DRY patterns?** Phase 1.3 will design parametrized approach to minimize duplication
4. **TMDB trending endpoints?** Phase 1.4 will research available endpoints for Featured page

### Success Criteria

- ✅ Date-constrained endpoints (now-playing, upcoming) accept filter parameters with date presets
- ✅ Both endpoints support genre, rating, year, keyword, people filters (dates protected)
- ✅ Upcoming endpoint returns results reliably
- ✅ Browse page provides full discover functionality with NO protected keys
- ✅ Featured page provides functional navigation (stub for interim, hero design future)
- ✅ Comprehensive test coverage prevents future regressions
- ✅ Architecture is DRY (one discover implementation, two thin wrappers, Browse calls discover directly)
- ✅ Frontend routing updated to `/browse/*` structure
- ✅ Frontend types updated, all pages work in browser
- ✅ All quality gates pass (100% test pass rate, 0 linting/type errors)
- ✅ Test organization can proceed with Phase 4 using correct endpoint names
- ✅ Featured page research documented for future hero implementation

---

**Version:** 1.0 | **Created:** 2025-10-30
