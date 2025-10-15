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

- [ ] **7. Minimal Watchlist Implementation** - Testing infrastructure (prerequisite for Task 8)
    - **Goal**: Create minimal watchlist feature to validate authentication patterns with real API calls
    - **Why Now**: Proves auth works end-to-end, establishes reusable enrichment pattern for future work
    - **Scope**: Basic implementation only - full feature in API Layer P2
    - **Note**: While this implements watchlist functionality, it's scoped as TEST INFRASTRUCTURE for OAuth validation (Task 8). Full watchlist feature deferred to API Layer P2. Kept in OAuth task list because it's a direct prerequisite for Task 8, not independent work.
    - **Architecture Decision**: Reusable enrichment service pattern
        - **No new schemas needed**: Reuse existing `MovieBaseSchema` with `user_movie_data` field (already present!)
        - **Class-based service**: Use Task 2.0 patterns (dependency injection) from Backend Modernization
        - **Universal application**: Same enrichment works for discover pages AND user-specific pages
        - **DRY principle**: Single service enriches movies with user data across all endpoints
    - **Forward-Compatibility Note**: Implements class-based service with dependency injection (Backend Modernization Task 2.0 pattern) rather than function-based pattern currently in movie_service.py. Avoids creating technical debt that would need immediate refactoring.
    - [ ] 7.1 Backend Service - MovieEnrichmentService (class-based with dependency injection)
        - [ ] Create `user_movie_data/services/movie_enrichment_service.py`
        - [ ] Implement `MovieEnrichmentService` class with `__init__(user_movie_data_repository=None)` for DI
        - [ ] Method: `enrich_movies_with_user_data(movies: list[MovieBaseSchema], user: User | None) -> list[MovieBaseSchema]`
        - [ ] If user is None: return movies unchanged (unauthenticated users)
        - [ ] If user is authenticated: bulk query UserMovieData, map to UserMovieDataSchema, populate movie.user_movie_data
        - [ ] Use efficient querying: `filter(user=user, movie__tmdb_id__in=tmdb_ids).select_related('movie')`
        - [ ] Professional type annotations (no Any usage)
        - [ ] Docstrings following project standards
    - [ ] 7.2 Backend Integration - Update movie discovery endpoints to use enrichment
        - [ ] Update `movie/api.py` endpoints to optionally accept authenticated user
        - [ ] Pass `request.user if request.user.is_authenticated else None` to service
        - [ ] Call enrichment service on response before returning
        - [ ] Update endpoints: `get_now_playing_movies`, `get_upcoming_movies`, `search_movies`, `discover_movies`, `get_movie_detail`
        - [ ] NO breaking changes: enrichment is transparent (existing `user_movie_data: None` becomes populated)
    - [ ] 7.3 Backend API - Watchlist endpoint using enrichment service
        - [ ] Add GET `/api/user-movie-data/movies` endpoint (authenticated only)
        - [ ] Optional query param: `?watchlist=true` for filtering
        - [ ] Query UserMovieData for user, get tmdb_ids, fetch TMDB data (or from local Movie cache)
        - [ ] Use enrichment service to populate user_movie_data (same service as discover!)
        - [ ] Returns `PaginatedMovieResponseSchema` (consistent with all movie endpoints)
    - [ ] 7.4 Quality Checks - Backend implementation
        - [ ] Backend linting: 0 violations (`ruff check` with auto-fix)
        - [ ] Backend type checking: 0 errors (`npx pyright`)
        - [ ] Run tests: Verify no regressions in movie/user_movie_data domains
    - [ ] 7.5 Frontend Service - Watchlist API client
        - [ ] Regenerate TypeScript types from OpenAPI schema (`npm run generate-types`)
        - [ ] Add `getUserMovies()` function in appropriate service file
        - [ ] Type-safe request/response handling (uses generated types)
    - [ ] 7.6 Frontend Component - MovieCard onClick handler
        - [ ] Add onClick handler to watchlist button (RiPlayListAddLine)
        - [ ] POST to `/api/user-movie-data` with `{movie_id, user_on_watchlist: true}`
        - [ ] Show simple success notification (toast or console.log for minimal impl)
        - [ ] Handle error cases (movie already on watchlist, network errors)
    - [ ] 7.7 Frontend Page - Minimal Watchlist display
        - [ ] Create `/watchlist` route in router
        - [ ] Create simple Watchlist page component
        - [ ] Fetch watchlist data on mount (`getUserMovies({watchlist: true})`)
        - [ ] Display movie titles as simple text list (no fancy UI needed)
        - [ ] Show "No movies on watchlist" if empty
    - [ ] 7.8 Quality Checks - Full stack validation
        - [ ] Frontend linting: 0 violations (`npm run lint`)
        - [ ] Frontend type checking: 0 errors (`npm run type-check`)
        - [ ] Manual smoke test: Add movie → See in list → Verify enrichment on discover pages
        - [ ] Verify: Unauthenticated users see movies without user_movie_data (null)
        - [ ] Verify: Authenticated users see movies with user_movie_data populated
    - **Future Enhancement** (API Layer P2): Full MovieCard grid, pagination, filtering, remove from watchlist, bulk operations

- [ ] **8. Manual E2E Validation** - Critical path testing (lean scope)
    - **Goal**: Prove OAuth implementation works in isolation, document expected behavior
    - **Scope**: Basic flows only - comprehensive testing deferred to API Layer P2 Task 5.6
    - [ ] 8.1 JWT Pattern - Quick validation (5-10 min)
        - [ ] 8.1.1 Register → Login → Add movie to watchlist → Verify persists after refresh
        - [ ] 8.1.2 Check DevTools: JWT tokens present, logout clears cookies
        - [ ] 8.1.3 **SKIP**: Extensive token refresh testing, multi-tab, all edge cases (deferred)
    - [ ] 8.2 OAuth Pattern - Google flow (10-15 min)
        - [ ] 8.2.1 Click "Continue with Google" → Complete OAuth → Verify callback success
        - [ ] 8.2.2 Check DevTools: NO JWT tokens, session cookie present
        - [ ] 8.2.3 Add movie to watchlist → Refresh page → Session persists
        - [ ] 8.2.4 Logout → Session cleared
        - [ ] 8.2.5 **SKIP**: Extensive multi-tab testing, all error scenarios (deferred)
    - [ ] 8.3 OAuth Pattern - GitHub flow (5-10 min)
        - [ ] 8.3.1 Repeat 8.2.1-8.2.4 with GitHub OAuth
        - [ ] 8.3.2 **SKIP**: Comprehensive cross-provider testing (deferred)
    - [ ] 8.4 Quick isolation check (5 min)
        - [ ] 8.4.1 OAuth user → Add watchlist items
        - [ ] 8.4.2 Logout → Login as JWT user → Verify independent data
        - [ ] 8.4.3 **SKIP**: Extensive cross-pattern scenarios (deferred to API P2)
    - [ ] 8.5 Critical error paths only (5 min)
        - [ ] 8.5.1 OAuth denial (click Cancel) → Verify graceful error, no crash
        - [ ] 8.5.2 Invalid session → Verify redirect to login
        - [ ] 8.5.3 **SKIP**: Network errors, expired tokens, all edge cases (deferred)
    - [ ] 8.6 Document results in notes file (5 min)
        - [ ] 8.6.1 Brief execution log (critical paths work: Yes/No)
        - [ ] 8.6.2 Any bugs found (must fix before closing)
        - [ ] 8.6.3 Note items deferred to API Layer P2

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
        - [ ] 9.4.3 Verify all parent tasks marked [x]

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
- `backend/apps/movie/api.py` - **UPDATED (Task 7)**: Discovery endpoints now use enrichment service for authenticated users
- `backend/apps/movie/schemas.py` - **EXISTING**: MovieBaseSchema already has `user_movie_data` field (no changes needed)
- `backend/apps/user_movie_data/api.py` - **UPDATED (Task 7)**: New watchlist endpoint using enrichment service

**Frontend**:

- `frontend/src/pages/user/Login.tsx` - OAuth initiation (form POST), loading state with minimum display time
- `frontend/src/hooks/useAuth.ts` - Session-based OAuth callback handler, JWT checks skipped for OAuth users
- `frontend/src/utilities/token.ts` - Token utilities (JWT pattern)
- `frontend/src/services/apiClient.ts` - Two-pattern auth support (`credentials: 'include'`)
- `frontend/src/components/layout/LoadingContent.tsx` - Reusable loading component (DRY)
- `frontend/src/components/layout/LoadingLayout.tsx` - Uses LoadingContent
- `frontend/src/assets/GoogleLogo.tsx` - Official Google brand logo
- `frontend/src/assets/GitHubLogo.tsx` - Official GitHub Octocat logo
- `frontend/src/types/api.ts` - **UPDATED (Task 7)**: Regenerated TypeScript types (PaginatedMovieResponseSchema with user_movie_data)
- `frontend/openapi.json` - **UPDATED (Task 7)**: Regenerated OpenAPI schema from backend
- `frontend/src/services/userMovieDataService.ts` - **NEW (Task 7)**: API client for getUserMovies() and watchlist operations
- `frontend/src/pages/user/Watchlist.tsx` - **NEW (Task 7)**: Minimal watchlist page component
- `frontend/src/components/movie/MovieCard.tsx` - **UPDATED (Task 7)**: Add onClick handler for watchlist button

## Task List Coordination

### This Task List (OAuth Incidental) - What We Do

**Backend Automated Tests** (Task 6.9.7):
- 8+ tests in `test_session_auth.py`
- Session authentication works
- JWT authentication still works
- Both logout patterns work
- Token refresh works

**Manual E2E Validation** (Task 7) - Critical Path Only:
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

### Backend Modernization (Much Later) - Infrastructure

**NOT in OAuth or API Layer P2**:
- ❌ Playwright E2E automation (dedicated task after API layer complete)
- ❌ Redis/Celery infrastructure
- ❌ Performance optimization
- ❌ Multi-tab synchronization (nice-to-have)

See `.arc/upcoming/tasks/tasks-backend-modernization.md` for future work.

---

## Completion Summary

{To be filled in upon completion}

---

**Note**: See research doc and notes file for detailed implementation context, architectural decisions, and lessons learned.
