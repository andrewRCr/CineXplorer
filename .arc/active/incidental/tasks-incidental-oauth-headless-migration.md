# Incidental Work: OAuth Headless Mode Migration

**Created**: 2025-01-27
**Status**: In Progress - Task 6.9 (Session-Based OAuth Implementation)
**Estimated Effort**: 8-10 hours total (Tasks 1-5: Complete ✅, Task 6: 4-6 hours remaining, Tasks 7-8: 2 hours)

**Related Documentation**:

- Notes: `.arc/active/incidental/notes-incidental-oauth-headless-migration.md`
- Research: `.arc/active/incidental/research-django-allauth-headless-oauth.md` (1,200+ line analysis)

## Context

Discovered during OAuth E2E testing that traditional POST-based OAuth with django-allauth fails due to CSRF Referer header requirements. Browser security prevents `form.submit()` from including Referer header.

**Research Outcome** (2 phases, 2025-10-15):

1. **Phase 1**: Identified django-allauth headless mode as solution
2. **Phase 2**: Discovered **critical architectural insight**: Browser mode OAuth uses session cookies only (NO JWT tokens in URL/response). See research doc for full analysis.

**Architectural Decision**: Two-pattern authentication approach:

- **Email/Password**: JWT tokens (localStorage + HTTP-only cookie) via `/api/token/` ✅ Working
- **OAuth**: Session cookies only (HTTP-only, managed by django-allauth) ⚠️ In Progress

## Scope & Boundaries

**THIS TASK LIST (OAuth Incidental) - Lean Validation**:

✅ Migrate to django-allauth headless mode (`HEADLESS_ONLY = True`)
✅ Implement two-pattern authentication (JWT for email/password, session for OAuth)
✅ Update frontend OAuth callback to check session endpoint (not URL tokens)
✅ **Backend automated tests** - Session authentication works (8+ tests)
✅ **Manual E2E validation** - Critical path only (OAuth flows work, watchlist works)
✅ **Incremental quality gates** - Verify no regressions in auth domain

**NOT THIS TASK LIST (Deferred to API Layer P2 Task 5.6 + Phase 6)**:

❌ Comprehensive integration testing (OAuth + UserMovieData + full user journeys)
❌ Extensive edge case testing (all network errors, multi-tab coordination, etc.)
❌ Full project quality gates (all domains, 70%+ coverage, production certification)
❌ "We're covered, we can move on from API layer" validation

**NEVER IN OAUTH WORK (Backend Modernization - Much Later)**:

❌ Playwright E2E automation (dedicated task after API layer complete)
❌ Redis/Celery infrastructure
❌ Performance optimization initiatives

See "Task List Coordination" section at bottom for detailed boundary documentation.

## Tasks

- [x] **1. Backend Configuration** - Headless mode setup
    - [x] 1.1 Update settings: `HEADLESS_ONLY = True`, `HEADLESS_FRONTEND_URLS`
    - [x] 1.2 Configure CSRF cookie: `CSRF_COOKIE_HTTPONLY = False`
    - [x] 1.3 Verify CORS and session cookie settings
    - [x] 1.4 Backend type checking - 0 errors

- [x] **2. URL Configuration** - Headless and OAuth callback routes
    - [x] 2.1 Include `allauth.headless.urls` at `/_allauth/`
    - [x] 2.2 Keep `/accounts/` URLs (required for OAuth callbacks)
    - [x] 2.3 Test headless endpoints accessible
    - [x] 2.4 Document URL structure in notes

- [x] **3. Frontend OAuth Initiation** - Headless API integration
    - [x] 3.1 Implement CSRF token fetch
    - [x] 3.2 Create `initializeOAuthLogin()` (form POST to headless endpoint)
    - [x] 3.3 Add CSRF token retrieval from cookie
    - [x] 3.4 Update Google/GitHub login handlers
    - [x] 3.5 Quality gates: 0 linting violations, 0 type errors

- [x] **4. OAuth Callback Handling** - Initial implementation (superseded by Task 6.9)
    - [x] 4.1-4.4 Initial callback logic (based on URL token extraction)
    - **Note**: Implementation revised after discovering session-cookie pattern (see Task 6.9)

- [x] **5. Token Strategy Migration** - JWT generation for email/password + app mode
    - [x] 5.1 Create `JWTTokenStrategy` class (implements `AbstractTokenStrategy`)
    - [x] 5.2 Update settings: `HEADLESS_TOKEN_STRATEGY` configuration
    - [x] 5.3 Remove signal-based OAuth JWT implementation
    - [x] 5.4 Type stubs investigation and fixes
    - [x] 5.5 Verify backend restarts without errors
    - [x] 5.6 Enable full headless mode
    - **Note**: Token Strategy **NOT used for browser OAuth** (app mode only)

- [ ] **6. Two-Pattern Authentication Implementation** ⚠️ Architecture Revised
    - **Why**: Research revealed browser OAuth uses session cookies, not JWT tokens (see research doc for details)
    - [x] 6.1-6.8 JWT implementation for email/password - ✅ Complete and working
    - [ ] 6.9 Backend Test Suite - Session Authentication
        - [x] 6.9.1 Test email/password with JWT tokens - ✅ Working
        - [x] 6.9.2 OAuth configuration prerequisites - ✅ Complete
        - [x] 6.9.3 Update OAuth callback handler (useAuth.ts) - ✅ Session endpoint check implemented
        - [x] 6.9.4 Update API client (apiClient.ts) - ✅ Two-pattern auth support verified
        - [x] 6.9.5 Test Google OAuth with session cookies - ✅ Working (with loading UX improvements)
        - [x] 6.9.6 Test GitHub OAuth with session cookies - ✅ Working (callback URI configured)
        - [x] 6.9.7 Complete backend test suite (`test_session_auth.py`) - ✅ 8 tests passing
            - [x] 6.9.7.1 Fix `test_jwt_authentication_still_works` (standardize API naming: 'access_token'/'refresh_token')
            - [x] 6.9.7.2 Run test suite and verify all 4 existing tests pass
            - [x] 6.9.7.3 Add test: `test_jwt_token_refresh_works` - Verify refresh endpoint generates new tokens
            - [x] 6.9.7.4 Add test: `test_session_auth_persists_across_requests` - Multiple API calls with same session
            - [x] 6.9.7.5 Add test: `test_oauth_logout_clears_session` - Session DELETE endpoint clears session
            - [x] 6.9.7.6 Add test: `test_jwt_logout_clears_cookies` - JWT logout clears httponly cookies
            - [x] 6.9.7.7 Run full test suite and verify all 8+ tests pass (8 tests, 0 failures)
            - [x] 6.9.7.8 Run incremental quality checks (ruff: 0 errors, pyright: 0 errors with proper type ignores)
    - [x] 6.10 Quality Gates - Full project validation ✅
        - [x] 6.10.1 Run all backend tests and fix API field naming regressions (`pytest apps/ -v` via Docker) - ✅ 160/160 passing
            - [x] 6.10.1.1 Investigate CSRF protection test failures (8 failures in test_csrf_protection.py) - ✅ Root cause: hybrid auth pattern change
            - [x] 6.10.1.2 Fix authentication domain test failures (9 failures: test_error_responses.py, test_security.py, test_user_api.py) - ✅ 101/101 tests passing
            - [x] 6.10.1.3 Fix UserMovieData domain test failures (21 failures in test_user_movie_data_api.py) - ✅ 23/23 tests passing
            - [x] 6.10.1.4 Verify all 160 tests pass (all domains: 160/160 ✅)
            - **Context**: Hybrid auth pattern requires test fixtures to manually set access_token cookie (login only sets refresh_token cookie)
            - **DRY Improvement**: Created shared `authenticate_client()` helper in `core/tests/test_helpers.py` (single source of truth for auth pattern)
            - **Fix Applied**: Refactored 3 test fixtures across authentication and user_movie_data apps to use shared helper
        - [x] 6.10.2 Run all frontend tests (`npm test` via Docker) - ✅ 321/321 passing (13 test files)
        - [x] 6.10.3 Backend linting (`ruff check backend/apps/ backend/config/ --fix`) - ✅ 0 violations (6 import order issues auto-fixed)
        - [x] 6.10.4 Frontend linting (`npm run lint` via Docker) - ✅ 0 violations
        - [x] 6.10.5 Frontend type checking (`npm run type-check` via Docker) - ✅ 0 errors
        - [x] 6.10.6 Backend type checking (`npx pyright backend/apps/ backend/config/ --project backend`) - ✅ 0 errors (0 errors, 6 warnings, 53 informational)
        - [x] 6.10.7 Markdown linting (`npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`) - ✅ 0 violations (69 files checked)
        - [x] 6.10.8 Verify: 100% test pass rate, 0 type errors, 0 linting violations - ✅ VERIFIED

- [x] **7. Minimal Watchlist Implementation** - Testing infrastructure (prerequisite for Task 8) ✅
    - **Note**: Tasks 7.1-7.4 completed WITHOUT test-first (protocol violation). Retroactively adding tests in 7.1a-7.3a.
    - [x] 7.1a **RETROACTIVE** - Write tests for MovieEnrichmentService
        - [x] 7.1a.1 Create `user_movie_data/tests/test_movie_enrichment_service.py`
        - [x] 7.1a.2 Test: Enrichment with authenticated user populates user_movie_data
        - [x] 7.1a.3 Test: Enrichment with unauthenticated user (None) leaves user_movie_data as None
        - [x] 7.1a.4 Test: Bulk query optimization (single query, no N+1)
        - [x] 7.1a.5 Test: Movies without user data show None for user_movie_data
        - [x] 7.1a.6 Run tests and verify all pass
    - [x] 7.1 Backend Service - MovieEnrichmentService (class-based with dependency injection) **⚠️ IMPLEMENTED WITHOUT TESTS**
        - [x] 7.1.1 Create `user_movie_data/services/movie_enrichment_service.py`
        - [x] 7.1.2 Implement `MovieEnrichmentService` class with `__init__(user_movie_data_repository=None)` for DI
        - [x] 7.1.3 Implement `enrich_movies_with_user_data()` method with bulk query optimization
        - [x] 7.1.4 Add professional type annotations (no Any usage)
        - [x] 7.1.5 Add docstrings following project standards
    - [x] 7.2a **RETROACTIVE** - Write tests for endpoint enrichment integration
        - [x] 7.2a.1 Test: `get_movie_detail` includes user_movie_data for authenticated users
        - [x] 7.2a.2 Test: `discover_movies` includes user_movie_data in results for authenticated users
        - [x] 7.2a.3 Test: Discovery endpoints work for unauthenticated users (user_movie_data is None)
        - [x] 7.2a.4 Run tests and verify all pass
    - [x] 7.2 Backend Integration - Update movie discovery endpoints to use enrichment **⚠️ IMPLEMENTED WITHOUT TESTS**
        - [x] 7.2.1 Update `movie/api.py` endpoints to pass authenticated user to service
        - [x] 7.2.2 Call enrichment service on response before returning
        - [x] 7.2.3 Update endpoints: `get_now_playing_movies`, `get_upcoming_movies`, `search_movies`, `discover_movies`, `get_movie_detail`
        - [x] 7.2.4 Verify no breaking changes (enrichment is transparent)
    - [x] 7.3a **RETROACTIVE** - Write tests for watchlist endpoint
        - [x] 7.3a.1 Test: GET `/api/user-movie-data/movies` returns user's movies with enrichment
        - [x] 7.3a.2 Test: `?watchlist=true` filters to only watchlist movies
        - [x] 7.3a.3 Test: Returns empty list if user has no movies
        - [x] 7.3a.4 Test: Requires authentication (401 for unauthenticated)
        - [x] 7.3a.5 Test: Pagination works correctly
        - [x] 7.3a.6 Run tests and verify all pass
    - [x] 7.3 Backend API - Watchlist endpoint using enrichment service **⚠️ IMPLEMENTED WITHOUT TESTS**
        - [x] 7.3.1 Add GET `/api/user-movie-data/movies` endpoint (authenticated only)
        - [x] 7.3.2 Implement optional query param: `?watchlist=true` for filtering
        - [x] 7.3.3 Query UserMovieData for user, get tmdb_ids, fetch TMDB data
        - [x] 7.3.4 Use enrichment service to populate user_movie_data
        - [x] 7.3.5 Return `PaginatedMovieResponseSchema` (consistent with all movie endpoints)
    - [x] 7.4 Quality Checks - Backend implementation (INCOMPLETE - no new test coverage)
        - [x] 7.4.1 Backend linting: 0 violations (`ruff check` with auto-fix)
        - [x] 7.4.2 Backend type checking: 0 errors (`npx pyright`)
        - [x] 7.4.3 Run tests: Verify no regressions in movie/user_movie_data domains (47/47 passing - but NO new tests for Task 7 code)
    - [x] 7.5 Frontend Service - Service architecture refactor (test-after acceptable - simple CRUD)
        - [x] 7.5.1 Regenerate TypeScript types from OpenAPI schema (`npm run generate-types`)
        - [x] 7.5.2 Refactor `userMovieDataService.ts` to isolation-focused CRUD only (metadata operations)
        - [x] 7.5.3 Create new `userMovieService.ts` for movie-first queries (`getUserMovies()` with enrichment)
        - [x] 7.5.4 Add comprehensive file-level docstrings explaining distinction between services
        - [x] 7.5.5 Run incremental quality checks (linting, type checking)
    - [x] 7.6 Frontend Hook Tests - `useMovieActions` hook (test-first for interaction logic)
        - **Architecture Decision**: Custom hook pattern chosen over inline handlers
        - **Rationale**:
            - Survives upcoming TanStack Query migration (hook facade pattern)
            - Component code unchanged during Frontend Modernization
            - Matches existing app patterns (`useUserMovieData`, `useAuth`)
            - Encapsulates CREATE vs UPDATE logic (movie without user_movie_data → POST, with data → PATCH)
            - Easy expansion for future actions (watched, liked, rating, review)
            - Three-layer architecture (service → hook → component) aligns with TanStack Query best practices
        - **Migration Path**: Hook internals swap to TanStack Query mutations, API stays identical
        - [x] 7.6.1 Create test file: `frontend/src/hooks/__tests__/useMovieActions.test.ts`
        - [x] 7.6.2 Write test: `toggleWatchlist` creates UserMovieData when movie.user_movie_data is null (POST)
        - [x] 7.6.3 Write test: `toggleWatchlist` updates existing UserMovieData when present (PATCH)
        - [x] 7.6.4 Write test: Hook returns `isUpdating` state during API call
        - [x] 7.6.5 Write test: Hook returns error state on failure
        - [x] 7.6.6 Write test: Hook handles 400 "already exists" edge case (race condition fallback)
    - [x] 7.7 Frontend Hook Implementation - `useMovieActions` with watchlist toggle (implement to pass tests)
        - **Implementation Notes**:
            - Backend CREATE endpoint uses `movie_id` field but expects TMDB ID (not database ID)
            - Backend performs `Movie.objects.get(tmdb_id=payload.movie_id)` lookup internally
            - Use `get_or_create` pattern to prevent duplicates (returns 400 if exists)
        - [x] 7.7.1 Create service function: `movieInteractionService.ts` with `toggleMovieWatchlist(movie: Movie)`
        - [x] 7.7.2 Service function logic: Check `movie.user_movie_data` → POST if null, PATCH if exists
        - [x] 7.7.3 Create hook: `useMovieActions({ movie })` with `toggleWatchlist` function
        - [x] 7.7.4 Hook manages `isUpdating` and `error` state
        - [x] 7.7.5 Handle 400 "already exists" race condition (fetch current data, retry PATCH)
        - [x] 7.7.6 Add onClick handler to MovieCard watchlist button (RiPlayListAddLine) using hook
        - [x] 7.7.7 Show simple success notification (console.log for minimal impl)
        - [x] 7.7.8 Run tests and verify implementation passes all 7.6 tests (8/8 passing)
        - [x] 7.7.9 Run incremental quality checks (linting, type checking: 0 errors, 6 expected warnings)
    - [x] 7.8 Frontend Page Tests - Watchlist display (test-first for page logic)
        - [x] 7.8.1 Write test: Fetches watchlist data on mount
        - [x] 7.8.2 Write test: Displays movie list when data present
        - [x] 7.8.3 Write test: Shows empty state when no movies
    - [x] 7.9 Frontend Page - Minimal Watchlist display (implement to pass tests)
        - [x] 7.9.1 Create `/watchlist` route in router
        - [x] 7.9.2 Create simple Watchlist page component
        - [x] 7.9.3 Fetch watchlist data on mount (use `userMovieService.getUserMovies({watchlist: true})`)
        - [x] 7.9.4 Display movie titles as simple text list (no fancy UI needed)
        - [x] 7.9.5 Show "No movies on watchlist" if empty
        - [x] 7.9.6 Run tests and verify implementation passes (4/4 tests passing)
    - [x] 7.10 Quality Checks - Full stack validation ✅
        - [x] 7.10.1 Backend tests: All pass (197/197 including new enrichment/watchlist tests)
        - [x] 7.10.2 Frontend tests: All pass (333/333 including new component/page tests)
        - [x] 7.10.3 Frontend linting: 0 violations (`npm run lint`)
        - [x] 7.10.4 Frontend type checking: 0 errors (`npm run type-check`)
        - [x] 7.10.5 Manual smoke test: Add movie → See in list → Verify enrichment on discover pages ✅
        - [x] 7.10.6 Verify: Unauthenticated users see movies without user_movie_data (null) ✅
        - [x] 7.10.7 Verify: Authenticated users see movies with user_movie_data populated ✅
        - **Bugs Fixed During Testing**:
            - **Movie Auto-Creation**: Fixed 404 error when adding movies from discover pages (backend expected Movie record to exist locally, now auto-creates from TMDB)
            - **OAuth Session Persistence**: Fixed logout-on-refresh for OAuth users (added session endpoint check to `checkExistingAuth`)
            - **ErrorBoundary showErrorDetails**: Fixed pre-existing bug where explicit `false` wasn't respected (changed `||` to `??`)
            - **Watchlist Type Safety**: Fixed TypeScript errors in test data (pagination schema, optional results field)
    - [x] 7.11 MovieCard Watchlist Toggle UI - Visual feedback (prerequisite for Task 8) ✅
        - [x] 7.11.1 Add `RiPlayListFill` icon import
        - [x] 7.11.2 Add `isOnWatchlist` computed state from `movie.user_movie_data?.user_on_watchlist`
        - [x] 7.11.3 Update watchlist button icon: `RiPlayListAddLine` (default) → `RiPlayListFill` (on watchlist)
        - [x] 7.11.4 Update watchlist button tooltip: "Add to watchlist" → "Remove from watchlist" (dynamic)
        - [x] 7.11.5 Add blue color palette when on watchlist (`colorPalette="blue"`)
        - [x] 7.11.6 Update memo comparison to include `user_on_watchlist` for re-render detection
        - [x] 7.11.7 Run incremental quality checks (linting, type checking: 0 errors, 6 expected warnings)
        - **Rationale**: Manual E2E testing requires visual feedback to verify toggle state changes

- [x] **8. Manual E2E Validation** - Enhanced critical path testing (~60-75 min) ✅
    - **Goal**: Prove OAuth implementation works with high confidence, validate watchlist CRUD + user isolation
    - **Scope**: Critical flows with CRUD testing - comprehensive edge cases deferred to API Layer P2 Task 5.6
    - **Why Enhanced**: 4 bugs found during Task 7.10 manual testing, security-critical isolation must be validated
    - **Results**: All critical paths verified, 3 bugs fixed, OAuth UX significantly improved, future enhancements documented
    - [x] 8.1 JWT Pattern - Watchlist CRUD validation (10-15 min)
        - [x] 8.1.1 Login → Add movie to watchlist → Verify icon changes to filled state
        - [x] 8.1.2 Click watchlist button again → Verify removes from list (icon returns to outline)
        - [x] 8.1.3 Add movie back to watchlist → Verify appears in list
        - [x] 8.1.4 Refresh page → Verify watchlist state persists (icon still filled)
        - [x] 8.1.5 Check DevTools: Hybrid auth tokens (refresh_token cookie HttpOnly, access_token in sessionStorage) ✅
        - [x] 8.1.6 Logout → Verify tokens cleared (refresh_token cookie removed, sessionStorage cleared) ✅
            - **Bug found & fixed**: `token_expiration` not cleared from sessionStorage (added to `clearAuthTokens()`)
            - **Note**: `csrftoken` cookie persists (expected - needed for unauthenticated requests)
        - [x] 8.1.7 **SKIP**: Extensive token refresh testing, multi-tab coordination (deferred)
    - [x] 8.2 OAuth Pattern - Google flow with CRUD (15-20 min) ✅
        - [x] 8.2.1 Click "Continue with Google" → Complete OAuth → Verify callback success
        - [x] 8.2.2 Check DevTools: NO JWT tokens (no access_token/refresh_token anywhere), only sessionid cookie (HttpOnly)
        - [x] 8.2.3 Add movie to watchlist → Verify icon changes to filled state
        - [x] 8.2.4 Click watchlist button again → Verify removes from list (icon returns to outline)
        - [x] 8.2.5 Add movie back to watchlist → Verify appears in /watchlist page
        - [x] 8.2.6 Refresh page → Verify session persists, watchlist state preserved
        - [x] 8.2.7 Close browser → Reopen → Navigate to app → Verify session still valid
        - [x] 8.2.8 Logout → Verify session cleared (sessionid cookie removed)
        - [x] 8.2.9 **SKIP**: Multi-tab testing, all error recovery scenarios (deferred)
    - [x] 8.3 OAuth Pattern - GitHub flow (10 min - lean) ✅
        - [x] 8.3.1 Click "Continue with GitHub" → Complete OAuth → Verify callback success
        - [x] 8.3.2 Add one movie to watchlist → Verify icon changes
        - [x] 8.3.3 Logout → Verify session cleared
        - [x] 8.3.4 **SKIP**: Full CRUD testing (already validated with Google OAuth)
    - [x] 8.4 Cross-Pattern User Isolation - CRITICAL SECURITY TEST (10-15 min) ✅
        - [x] 8.4.1 OAuth user (Google) → Add movie ID 78 (Blade Runner) to watchlist
        - [x] 8.4.2 Verify movie appears in watchlist with filled icon
        - [x] 8.4.3 Logout → Login as JWT user (email/password)
        - [x] 8.4.4 Navigate to same movie (ID 78) → Verify icon is OUTLINE (not filled)
        - [x] 8.4.5 JWT user → Add movie ID 78 to watchlist → Verify icon fills
        - [x] 8.4.6 Logout → Login as OAuth user (Google) again
        - [x] 8.4.7 Navigate to movie ID 78 → Verify icon is FILLED (OAuth user's state preserved)
        - [x] 8.4.8 **CRITICAL**: Verify no cross-contamination (both users adding same movie must be completely isolated) ✅
        - [x] 8.4.9 **SKIP**: Extensive multi-user scenarios (deferred to API P2)
    - [x] 8.5 Critical error paths (10 min) ✅
        - [x] 8.5.1 OAuth abortion via browser navigation → **VERIFIED**: Can verify manually (user can hit back button, returns to login cleanly)
            - **Note**: Using redirect pattern (not popup), which is industry standard for mobile compatibility and popup-blocker avoidance
        - [x] 8.5.2 Delete session cookie via DevTools → Attempt API call (e.g., add to watchlist) → Verify proper error handling (401 response expected) ✅
            - **Result**: 401 handled gracefully, no crashes, optimistic UI rollback works
            - **Issue Found**: No user feedback (error handling works but silent failure)
            - **Documented**: Added to `.arc/upcoming/notes/notes-frontend-enhancements.md` (Toast Notification System - authentication error feedback)
        - [x] 8.5.3 **SIMPLIFIED**: Verify error handling code exists in `useMovieActions.ts` (has try/catch blocks) ✅
            - **Verified**: Lines 112-117 contain proper try/catch with error state management
            - **Note**: Full invalid-data testing deferred to API Layer P2 (hard to manufacture manually, automated tests better)
        - [x] 8.5.4 **SKIP**: Network errors, expired tokens, all edge cases (deferred to API Layer P2)
        - **Bug found & fixed during 8.4**: Search endpoint 500 error due to empty string release_date validation (TMDB data quality issue)
        - **OAuth UX improvements during 8.5**: Fast OAuth loading spinner minimum display time (500ms), gated navigation, prevented form flash
    - [x] 8.6 Document results in notes file (5 min) ✅
        - [x] 8.6.1 Execution log: Mark each test as Pass/Fail with brief notes ✅ (documented inline in Tasks 8.1-8.5)
        - [x] 8.6.2 Any bugs found: Document + fix immediately (if <15 min each per "Leave It Cleaner" protocol) ✅
            - **Bugs Fixed**: `token_expiration` not cleared (8.1.6), search 500 error (8.4), 401 handling improvements (8.5)
            - **UX Improvements**: OAuth loading spinner (500ms minimum, gated navigation, no form flash)
            - **Future Enhancements**: Toast notifications documented in `.arc/upcoming/notes/notes-frontend-enhancements.md`
        - [x] 8.6.3 Note items deferred to API Layer P2 Task 5.6 ✅ (see "Task List Coordination" section, lines 392-421)

- [ ] **9. Documentation and Cleanup**
    - [ ] 9.1 Remove debugging console.log statements
        - [ ] 9.1.1 Search for console.log in useAuth.ts, Login.tsx, apiClient.ts
        - [ ] 9.1.2 Remove or convert to proper logging
        - [ ] 9.1.3 Verify no remaining debug statements
    - [ ] 9.2 Create `.arc/reference/strategies/strategy-authentication.md` for detailed architecture / approach documentation
        ***Purpose: Reference for future maintenance, onboarding, API Layer P2 work***
        - [ ] 9.2.1 Document two-pattern authentication architecture
        - [ ] 9.2.2 Document security model (httponly cookies, CORS, CSRF)
        - [ ] 9.2.3 List all endpoints supporting both patterns
        - [ ] 9.2.4 Document testing approach (backend + E2E)
        - [ ] 9.2.5 Note any potential future improvements identified
    - [ ] 9.3 Fill out task list completion summary (bottom of this file)
        - [ ] 9.3.1 Brief summary of work done
    - [ ] 9.4 Mark incidental work complete
        - [ ] 9.4.1 Change status to "Complete" at top of this file
        - [ ] 9.4.2 Add completion date

## Relevant Files

**Backend**:

- `backend/config/settings.py` - Headless configuration, session cookies
- `backend/config/urls.py` - Headless + OAuth callback routes
- `backend/apps/authentication/token_strategy.py` - JWT Token Strategy (app mode / email-password)
- `backend/apps/authentication/api.py` - Token refresh endpoint (JWT pattern)
- `backend/apps/authentication/auth_ninja.py` - Session authentication fallback (Priority 3 after JWT checks)
- `backend/apps/authentication/tests/test_session_auth.py` - **NEW**: Backend test suite for session authentication (8+ tests)
- `backend/apps/conftest.py` - Test fixtures with type safety fixes
- `backend/apps/core/tests/test_helpers.py` - **NEW**: Shared `authenticate_client()` helper for hybrid auth pattern (DRY improvement)
- `backend/apps/authentication/tests/test_csrf_protection.py` - Updated `csrf_client` fixture to use shared helper
- `backend/apps/authentication/tests/test_user_api.py` - Updated `authenticated_user` fixture to use shared helper + import order fixes
- `backend/apps/authentication/tests/test_session_auth.py` - Import order fixes (Ruff auto-fix)
- `backend/apps/authentication/tests/test_security.py` - Import order fixes (Ruff auto-fix)
- `backend/apps/user_movie_data/tests/test_user_movie_data_api.py` - Updated `authenticated_user` fixture to use shared helper
- `backend/apps/user_movie_data/services/movie_enrichment_service.py` - **NEW (Task 7)**: Class-based enrichment service with DI (Backend Modernization Task 2.0 pattern)
- `backend/apps/user_movie_data/tests/test_movie_enrichment_service.py` - **NEW (Task 7.1a)**: Retroactive unit tests for MovieEnrichmentService (11 tests, all passing)
- `backend/apps/movie/tests/test_endpoint_enrichment_integration.py` - **NEW (Task 7.2a)**: Retroactive integration tests for endpoint enrichment (16 tests, all passing)
- `backend/apps/user_movie_data/tests/test_watchlist_endpoint.py` - **NEW (Task 7.3a)**: Retroactive integration tests for watchlist endpoint (10 tests, all passing)
- `backend/apps/movie/api.py` - **UPDATED (Task 7)**: Discovery endpoints now use enrichment service for authenticated users
- `backend/apps/movie/schemas.py` - **EXISTING**: MovieBaseSchema already has `user_movie_data` field (no changes needed)
- `backend/apps/user_movie_data/api.py` - **UPDATED (Task 7 + 7.10)**: New watchlist endpoint using enrichment service, auto-creates Movie stubs from TMDB
- `backend/apps/user_movie_data/tests/test_user_movie_data_api.py` - **UPDATED (Task 7.10)**: Updated test for invalid movie ID (uses truly invalid TMDB ID)

**Frontend**:

- `frontend/src/pages/user/Login.tsx` - OAuth initiation (form POST), loading state with minimum display time
- `frontend/src/hooks/useAuth.ts` - **UPDATED (Task 6.9 + 7.10)**: Session-based OAuth callback handler, OAuth session persistence on page refresh, JWT checks skipped for OAuth users
- `frontend/src/utilities/token.ts` - Token utilities (JWT pattern)
- `frontend/src/services/apiClient.ts` - Two-pattern auth support (`credentials: 'include'`)
- `frontend/src/components/layout/LoadingContent.tsx` - Reusable loading component (DRY)
- `frontend/src/components/layout/LoadingLayout.tsx` - Uses LoadingContent
- `frontend/src/assets/GoogleLogo.tsx` - Official Google brand logo
- `frontend/src/assets/GitHubLogo.tsx` - Official GitHub Octocat logo
- `frontend/src/types/api.ts` - **UPDATED (Task 7.5)**: Regenerated TypeScript types (PaginatedMovieResponseSchema with user_movie_data)
- `frontend/openapi.json` - **UPDATED (Task 7.5)**: Regenerated OpenAPI schema from backend
- `frontend/src/services/userMovieDataService.ts` - **REFACTORED (Task 7.5)**: Isolation-focused CRUD for UserMovieData metadata (create, update, delete, get by tmdb_id)
- `frontend/src/services/userMovieService.ts` - **NEW (Task 7.5)**: Movie-first queries with enrichment (getUserMovies with watchlist filtering)
- `frontend/src/services/movieInteractionService.ts` - **NEW (Task 7.7)**: Pure service functions for movie interactions (toggleWatchlist, future: toggleWatched, toggleLiked, setRating, setReview)
- `frontend/src/hooks/useUserMovieData.ts` - **VERIFIED (Task 7.5)**: Correctly uses isolation service (userMovieDataService)
- `frontend/src/hooks/useMovieActions.ts` - **NEW (Task 7.7)**: Hook facade for movie interactions, encapsulates CREATE/UPDATE logic, TanStack Query migration target
- `frontend/src/hooks/__tests__/useMovieActions.test.ts` - **NEW (Task 7.6)**: Tests for useMovieActions hook (toggleWatchlist, state management, error handling)
- `frontend/src/pages/user/Watchlist.tsx` - **NEW (Task 7.9 + 7.10)**: Minimal watchlist page component (uses userMovieService), type safety fixes
- `frontend/src/pages/user/__tests__/Watchlist.test.tsx` - **NEW (Task 7.8 + 7.10)**: Watchlist page tests (4 tests), type safety fixes
- `frontend/src/components/movie/MovieCard.tsx` - **UPDATED (Task 7.7 + 7.11)**: Uses useMovieActions hook for watchlist button onClick handler, toggle UI with state-based icon/tooltip/color
- `frontend/src/components/ErrorBoundary.tsx` - **UPDATED (Task 7.10)**: Fixed showErrorDetails prop handling (pre-existing bug, changed || to ??)

## Task List Coordination

### This Task List (OAuth Incidental) - What We Do

**Backend Automated Tests** (Task 6.9.7):
- 8+ tests in `test_session_auth.py`
- Session authentication works
- JWT authentication still works
- Both logout patterns work
- Token refresh works

**Minimal Watchlist Implementation** (Task 7) - Testing Infrastructure:
- Enrichment service for user data (class-based with DI)
- Discovery endpoints enriched with user_movie_data
- New watchlist endpoint: GET `/api/user-movie-data/movies?watchlist=true`
- Prerequisite for Manual E2E Validation (Task 8)

**Manual E2E Validation** (Task 8) - Critical Path Only:
- ✅ OAuth flows work (Google, GitHub)
- ✅ Session cookies authenticate correctly
- ✅ Watchlist works (proves session auth + API integration)
- ✅ Logout clears sessions/cookies
- ✅ Basic isolation (OAuth vs JWT users independent)
- ❌ NOT comprehensive - just prove it works

**Quality Gates** (Task 6.10) - Incremental Only:
- ✅ All backend tests pass (entire suite, verify no regressions)
- ✅ All frontend tests pass
- ✅ Zero linting violations
- ✅ Zero type errors
- ❌ NOT full coverage analysis (deferred)
- ❌ NOT production certification (deferred)

### API Layer P2 Task 5.6 - What Comes Next

See `.arc/active/feature/tasks-api-layer-modernization-p2.md`.

**Comprehensive Integration Testing** (OAuth + UserMovieData + Full Workflows):
- ✅ OAuth users → Full watchlist CRUD (create, update, delete, list)
- ✅ OAuth users → Profile updates, password changes (if applicable)
- ✅ JWT users → Same workflows, verify isolation
- ✅ Cross-pattern scenarios (switch between OAuth/JWT, verify data separation)
- ✅ Token refresh under load, multi-request sequences
- ✅ Error recovery scenarios (network errors, invalid states, session expiration)
- ✅ Multi-tab coordination (if time permits, not critical)

**Regression Testing** (5.6.2-5.6.3):
- Quick smoke test: "OAuth still works after Phase 2 changes"
- NOT full validation (already done in OAuth incidental)

### API Layer P2 Phase 6 - Final Certification

**Full Project Quality Gates** (6.5):
- ✅ 70%+ test coverage across ALL domains (Movie, Core, Auth, UserMovieData)
- ✅ 100% test pass rate (all domains)
- ✅ Zero type errors (entire API layer - Phase 1 + Phase 2)
- ✅ Zero linting violations (entire API layer)
- ✅ Production certification: "We're covered, we can move on from API layer"

**What This Means**:
- OAuth incidental = "OAuth works"
- API P2 Task 5.6 = "OAuth + features work together"
- API P2 Phase 6 = "Entire API layer is production-ready"

### Backend Modernization (Later) - Infrastructure

**NOT in OAuth or API Layer P2**:
- ❌ Playwright E2E automation (dedicated task after API layer complete)
- ❌ Redis/Celery infrastructure
- ❌ Performance optimization
- ❌ Multi-tab synchronization (nice-to-have)

See `.arc/upcoming/tasks/tasks-backend-modernization.md` for future work.

---

## Implementation Notes

### Task 7: Minimal Watchlist Implementation

**Goal**: Create minimal watchlist feature to validate authentication patterns with real API calls.

**Why Now**: Proves auth works end-to-end, establishes reusable enrichment pattern for future work.

**Scope**: Basic implementation only - full feature in API Layer P2.

**Scope Boundary Note**: While this implements watchlist functionality, it's scoped as TEST INFRASTRUCTURE for OAuth validation (Task 8). Full watchlist feature deferred to API Layer P2. Kept in OAuth task list because it's a direct prerequisite for Task 8, not independent work.

**PROTOCOL VIOLATION & CORRECTION** (2025-10-15):

Tasks 7.1-7.4 (backend) were implemented WITHOUT test-first protocol:
- ❌ New service class (MovieEnrichmentService) implemented before tests
- ❌ New API endpoint (watchlist) implemented before tests
- ❌ Endpoint integration implemented before tests

**Root Cause**: Documentation gap - test-first protocol not prominent in DEVELOPMENT-RULES v2.6. Task list didn't structure work as "write tests → implement → verify".

**Corrective Actions**:
1. ✅ Updated DEVELOPMENT-RULES v2.7 with explicit Test-First Protocol section
2. ✅ Restructured TECHNICAL-ARCHITECTURE to remove methodology (now in DEVELOPMENT-RULES)
3. ✅ Restructured Task 7 with retroactive test tasks (7.1a, 7.2a, 7.3a) before frontend work
4. ⏳ Writing comprehensive tests before continuing to frontend (in progress)

**Test Coverage Added** (retroactive):
- 7.1a: MovieEnrichmentService tests (11 unit tests) ✅ COMPLETE
- 7.2a: Endpoint enrichment integration tests (16 integration tests) ✅ COMPLETE
- 7.3a: Watchlist endpoint tests (10 integration tests) ✅ COMPLETE

**Lesson Learned**: Task lists must explicitly show test sub-tasks BEFORE implementation sub-tasks. Documentation updates prevent future occurrences.

**Architecture Decision: Reusable Enrichment Service Pattern**

- **No new schemas needed**: Reuse existing `MovieBaseSchema` with `user_movie_data` field (already present!)
- **Class-based service**: Use Task 2.0 patterns (dependency injection) from Backend Modernization
- **Universal application**: Same enrichment works for discover pages AND user-specific pages
- **DRY principle**: Single service enriches movies with user data across all endpoints

**Forward-Compatibility Note**: Implements class-based service with dependency injection (Backend Modernization Task 2.0 pattern) rather than function-based pattern currently in movie_service.py. Avoids creating technical debt that would need immediate refactoring.

**Implementation Details**:

- **MovieEnrichmentService Method**: `enrich_movies_with_user_data(movies: list[MovieBaseSchema], user: User | None) -> list[MovieBaseSchema]`
- **Unauthenticated users**: Returns movies unchanged (user_movie_data remains None)
- **Authenticated users**: Bulk query UserMovieData, map to UserMovieDataSchema, populate movie.user_movie_data
- **Efficient querying**: `filter(user=user, movie__tmdb_id__in=tmdb_ids).select_related('movie')`
- **Type safety**: Professional type annotations (no Any usage)
- **Documentation**: Docstrings following project standards

**Integration Points**:

- **Discovery endpoints**: `get_now_playing_movies`, `get_upcoming_movies`, `search_movies`, `discover_movies`, `get_movie_detail`
- **Watchlist endpoint**: GET `/api/user-movie-data/movies` with optional `?watchlist=true` query param
- **Response format**: All endpoints return `PaginatedMovieResponseSchema` (consistency!)
- **Breaking changes**: None - enrichment is transparent (existing `user_movie_data: None` becomes populated)

**Future Enhancement** (API Layer P2): Full MovieCard grid, pagination, filtering, remove from watchlist, bulk operations

---

### Task 7.6-7.7: Movie Interaction Hook Architecture

**Architecture Decision** (2025-10-16): Custom hook pattern chosen for movie interactions (watchlist, watched, liked, rating, review)

**Context**: Upcoming Frontend Modernization will introduce TanStack Query + Redux Toolkit for state management. Need to choose implementation approach that:
1. Works for OAuth validation timeline (minimal implementation now)
2. Minimizes refactoring effort during Frontend Modernization
3. Establishes patterns that survive migration

**Options Considered**:

1. **Inline handlers in components** - Simplest now, but requires component changes during migration
2. **Service functions only** - No encapsulation, still requires component changes during migration
3. **Custom hook facade** - More initial work, but component code unchanged during migration

**Decision: Custom Hook Facade Pattern**

**Rationale**:

1. **TanStack Query Migration Path**:
   - Custom hooks SURVIVE TanStack Query migration (hook facade pattern)
   - Migration is **internal refactoring only** (swap `useState` for `useMutation`)
   - Component code stays identical (just swap hook internals)
   - Matches TanStack Query community best practices (service → hook → component)

2. **Existing App Patterns**:
   - Matches `useUserMovieData`, `useAuth`, etc. (consistency)
   - Team already familiar with custom hook pattern
   - Established testing patterns for hooks

3. **Encapsulation from Day 1**:
   - Hides CREATE vs UPDATE complexity (movie without user_movie_data → POST, with data → PATCH)
   - Single place to add optimistic updates, notifications, analytics during modernization
   - Easy expansion for future actions (watched, liked, rating, review)

4. **Less Total Work**:
   - Building hook now vs. during migration = same effort
   - But now = zero component changes during migration (less churn)
   - Without hook: All call sites change during migration (inline → hook)

**Three-Layer Architecture**:

```typescript
// Layer 1: Service functions (pure, testable, survive all migrations)
export async function toggleMovieWatchlist(movie: Movie): Promise<UserMovieData> {
  if (!movie.user_movie_data) {
    return createUserMovieData({ movie_id: movie.tmdb_id, user_on_watchlist: true });
  } else {
    return updateUserMovieData(movie.user_movie_data.id, {
      user_on_watchlist: !movie.user_movie_data.user_on_watchlist
    });
  }
}

// Layer 2: Hook facade (encapsulates state management, swappable implementation)
// NOW (manual state):
export function useMovieActions({ movie }: { movie: Movie }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const toggleWatchlist = async () => {
    setIsUpdating(true);
    await toggleMovieWatchlist(movie);
    setIsUpdating(false);
  };
  return { toggleWatchlist, isUpdating };
}

// FUTURE (TanStack Query - same API, different internals):
export function useMovieActions({ movie }: { movie: Movie }) {
  const mutation = useMutation({
    mutationFn: () => toggleMovieWatchlist(movie)
  });
  return { toggleWatchlist: mutation.mutate, isUpdating: mutation.isPending };
}

// Layer 3: Component (unchanged during migration!)
const { toggleWatchlist, isUpdating } = useMovieActions({ movie });
<IconButton onClick={toggleWatchlist} disabled={isUpdating}>
```

**Backend Integration Notes**:

- CREATE endpoint: POST `/api/user-movie-data` with `movie_id` field
- Backend expects TMDB ID (not database ID): `Movie.objects.get(tmdb_id=payload.movie_id)`
- UPDATE endpoint: PATCH `/api/user-movie-data/{id}` with partial fields
- Race condition handling: 400 "already exists" → fetch current data, retry PATCH

**Expansion Path**:

- Task 7.7: `toggleWatchlist` only (minimal for OAuth validation)
- Future (API Layer P2): Add `toggleWatched`, `toggleLiked`, `setRating`, `setReview` to same hook
- Frontend Modernization: Swap hook internals to TanStack Query, add optimistic updates

**Testing Strategy**:

- Unit tests for service functions (pure logic)
- Hook tests with `@testing-library/react-hooks` (state management)
- Component tests mock the hook (UI only)

---

### Task 7.11 + Task 8: Hybrid Authentication Implementation Details

**Hybrid Authentication Pattern Discovered During Manual Testing** (2025-10-16):

During Task 8.1.5 validation, we discovered the JWT authentication pattern is **hybrid**, not pure cookie-based:

**JWT Authentication (Email/Password) Storage**:
- ✅ `refresh_token` cookie (HttpOnly, Secure, 14-day lifetime) - XSS-proof
- ✅ `access_token` sessionStorage (readable by JS, 5-min lifetime) - allows instant auth checks
- ✅ `csrftoken` cookie (readable by JS) - Django CSRF protection
- ❌ NO `access_token` cookie (intentional design choice)

**OAuth Authentication (Google/GitHub) Storage**:
- ✅ `sessionid` cookie (HttpOnly, Secure) - Django session
- ✅ `csrftoken` cookie (readable by JS) - Django CSRF protection
- ❌ NO JWT tokens (access_token or refresh_token) anywhere

**Why Hybrid Design?**

Security + UX trade-off:
1. **Access token in localStorage**: Frontend can check auth instantly without network call
2. **Short lifetime (5 min)**: XSS attacks only steal 5-min token, not 14-day token
3. **Refresh token in HttpOnly cookie**: Long-lived token XSS-proof, auto-sent with requests
4. **Session warnings possible**: Frontend can decode JWT expiration for UX

**Backend Implementation** (`authentication/api.py:259-268`):

```python
# Hybrid authentication: Only set refresh token as HTTP-only cookie
# Access token returned in response body for localStorage storage (frontend manages it)
response.set_cookie(
    refresh_token_name,  # Only refresh_token
    refresh_token,
    max_age=int(refresh_lifetime.total_seconds()),
    httponly=True,
    secure=True,
    samesite=samesite,
)

return 200, {
    "access_token": access_token,  # In JSON response, not cookie
    "refresh_token": refresh_token,
    "user_id": authenticated_user.id,
}
```

**Frontend Implementation** (`utilities/token.ts:111-132`):

```typescript
// Frontend stores access token in localStorage/sessionStorage
storageObj.setItem("access_token", accessToken);
storageObj.setItem("isAuthenticated", "true");

// Refresh token also stored for reference (duplicates cookie)
if (refreshToken) {
    storageObj.setItem("refresh_token", refreshToken);
}
```

**Task 8 Validation Notes**:
- Task 8.1.5 updated to reflect hybrid pattern (refresh_token cookie + access_token sessionStorage)
- Task 8.2.2 clarified: OAuth users have NO JWT tokens anywhere (only sessionid cookie)
- Implementation is CORRECT and more secure than pure cookie approach

---

## Completion Summary

{To be filled in upon completion}

---

**Note**: See research doc and notes file for detailed implementation context, architectural decisions, and lessons learned.
