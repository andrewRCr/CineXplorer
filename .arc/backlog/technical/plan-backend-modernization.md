# Plan: Backend Modernization

**Document Purpose:** Track technical debt and improvement opportunities identified during development
that should be addressed in a comprehensive backend modernization effort.

**Status:** Mostly dropped or done (2026-11-06). Asynchronous task processing and the TMDB double-validation refactor
are dropped; app configuration and the shared module are done. `ROADMAP.md` lists what launch builds.

**Work Classification:** Technical Infrastructure

**Note:** Service Layer Modernization has been split into its own document
(`notes-service-layer-modernization.md`) and should be completed first as it establishes foundational patterns.

---

## Document Organization

This document covers Backend Modernization work AFTER Service Layer Modernization completes:

1. **Asynchronous Task Processing** - Background job infrastructure (Celery/Redis)
2. **Code Quality Improvements** - Django best practices, refactoring opportunities
3. **Completed Foundation Work** - Reference for what's already done

**Prerequisite:** Service Layer Modernization (see `notes-service-layer-modernization.md`)

---

## Asynchronous Task Processing (Celery/Redis) - DROPPED

**Status:** Dropped (2026-11-06): its one use was sending email in the background, and sending it synchronously is
fine at this size; the server's timers run the nightly jobs.

**Goal:** Implement background task processing for heavy operations and demonstrate scalable backend architecture patterns.

**Candidate Operations for Background Tasks:**

1. **Email Notifications** (High Priority)
   - Email verification sends (already using ZeptoMail service)
   - Password reset emails (when implemented)
   - User notification emails (future features)
   - Benefit: Non-blocking user registration/login flows

2. **Data Synchronization** (Medium Priority)
   - TMDB data refresh for cached movies
   - Bulk movie data imports (if needed)
   - User data exports (future feature)
   - Benefit: Keep data fresh without blocking user requests

3. **Heavy Computational Operations** (Low Priority)
   - Movie recommendation calculations (future feature)
   - User statistics aggregation (future feature)
   - Benefit: Responsive UI for compute-intensive operations

**Technical Considerations:**

- Redis already available in Docker Compose (used for Django cache)
- Celery worker needs to be added to docker-compose.yml
- Task monitoring/retry logic needs design
- Result backend for frontend progress tracking
- Integration with existing Django patterns

**Open Questions:**

- Should we implement comprehensive async infrastructure first, or start with high-impact operations (emails)?
- How do we handle task failures and retries?
- What monitoring/observability do we need for background tasks?

**References:**

- Celery documentation: <https://docs.celeryq.dev/>
- Django + Celery integration patterns
- Redis backend configuration

---

## Code Quality Improvements

This section covers Django best practices, refactoring opportunities, and technical debt items
that should be addressed during Backend Modernization.

### App Configuration - Django Best Practices ✅ COMPLETE

**Done (2025-12-19, `df96acbc`):** every app's `AppConfig.name` is its full dotted path, such as `apps.authentication`,
and `INSTALLED_APPS` uses those names.

**Issue:** All Django apps use short names in `AppConfig.name`
(e.g., `name = 'authentication'`) instead of full dotted module paths
(e.g., `name = 'apps.authentication'`).

**Current State:**

- `sys.path.insert(0, APPS_DIR)` in `config/settings.py` line 31 allows short names to work
- All 5 apps affected: `accounts`, `authentication`, `core`, `movie`, `user_movie_data`
- INSTALLED_APPS references short names
- ~50+ import statements use short names across codebase

**Best Practice:**
Django documentation recommends full dotted paths in `AppConfig.name` to:

- Avoid `sys.path` manipulation
- Make imports explicit and unambiguous
- Improve IDE/tooling support
- Align with standard Python packaging practices

**Recommended Fix:**

1. Update all `apps.py` files to use full paths (e.g., `name = 'apps.authentication'`)
2. Update INSTALLED_APPS to reference full AppConfig paths (e.g., `'apps.authentication.apps.AuthenticationConfig'`)
3. Update all imports across codebase from `from authentication` to `from apps.authentication`
4. Remove `sys.path.insert(0, APPS_DIR)` manipulation from settings
5. Run comprehensive test suite to verify no broken imports

**Effort Estimate:** Medium (2-3 hours)

- Low risk but requires careful testing
- Should be done atomically for all apps at once
- No database migrations required

**CodeRabbit Finding:** Identified in Task 7.4 IDE-based CodeRabbit review
**Deferred Reason:** Should be done comprehensively for all apps at once

---

### Shared Module Deprecation and Migration ✅ COMPLETE

**Done (2025-12-17, `2b0c1763`):** the root `shared/` module was removed, with OpenAPI-generated types in its place.

**Issue:** Root-level `shared/` module contains redundant TypedDict definitions that duplicate Django Ninja's
Pydantic schema functionality.

**Current State:**

- `shared/api_types.py`: TypedDict definitions for API contracts (barely used - only 1 active import in `tmdb.py`)
- `shared/error_codes.py`: Error code constants (actively used in authentication serializers)
- Located at project root (not in `backend/` directory)
- Deprecation warning added in `shared/__init__.py`

**Problem:**

- **api_types.py redundancy:** Django Ninja Pydantic schemas are the source of truth and auto-generate
  TypeScript types via OpenAPI
- Manual TypedDict duplication creates maintenance burden and potential drift from actual API contracts
- Root-level package location is non-standard (should be in `backend/` if kept)

**Usage Analysis:**

- `shared.api_types`: Only imported in `backend/apps/core/views/tmdb.py` for `TMDBMovieResponse`, `TMDBSearchResponse` types
- `shared.error_codes`: Actively used in `backend/apps/authentication/serializers.py` for error code constants

**Recommended Migration:**

1. **Migrate TMDB Types to Pydantic Schemas:**
   - Create `backend/apps/core/schemas/tmdb_schemas.py` with proper Pydantic models
   - Replace TypedDict usage in `tmdb.py` with Pydantic schemas
   - Benefit: Validation, serialization, and OpenAPI documentation for TMDB responses

2. **Relocate Error Codes:**
   - Move `shared/error_codes.py` → `backend/shared/error_codes.py` (proper Python package location)
   - Update import in `authentication/serializers.py`: `from shared.error_codes import ERROR_CODES`
   - Consider migrating to enum-based approach for better type safety:

     ```python
     from enum import Enum

     class ErrorCode(str, Enum):
         EMAIL_NOT_VERIFIED = 'email_not_verified'
         INVALID_AUTHORIZATION = 'invalid_authorization'
         # ...
     ```

3. **Remove api_types.py:**
   - Delete `shared/api_types.py` entirely
   - Remove from `shared/__init__.py` exports
   - Verify no remaining imports

4. **Post-Cleanup:**
   - If only error_codes remains, consider renaming `backend/shared/` → `backend/core/constants/` or similar
   - Document in TECHNICAL-OVERVIEW.md that Pydantic schemas are the single source of truth

**Effort Estimate:** Low-Medium (2-3 hours)

- Create Pydantic schemas for TMDB types
- Update tmdb.py imports and usage
- Relocate error_codes.py to backend/
- Update authentication imports
- Test both modules work correctly
- Remove shared/api_types.py
- Update documentation

**Benefits:**

- Eliminates manual type duplication
- Leverages Django Ninja's type generation workflow
- Better validation with Pydantic schemas
- Cleaner project structure

**CodeRabbit Finding:** Identified in Task 7.4 IDE-based CodeRabbit review (deprecation warning suggestion)

---

### TMDB Model Double Validation Performance - DROPPED

**Status:** Dropped (2026-11-06): nothing shows a performance problem, as the deferral below already judged.

**Issue:** Movie service validates TMDB responses twice: first into TMDB* Pydantic models, then
`model_dump()` and re-validate into application schemas.

**Current Pattern:**

```python
# Example from create_paginated_movie_response_from_tmdb
tmdb_search = TMDBMovieSearchResponse.model_validate(tmdb_response, strict=False)  # 1st validation
pagination_data = {
    'results': [MovieBaseSchema.model_validate(movie.model_dump()) for movie in tmdb_search.results]  # 2nd validation
}
```

**Performance Impact:**

- Double parsing overhead: TMDB response → TMDB model → dict → app schema
- Extra allocations from intermediate `model_dump()` dict creation
- More CPU cycles for redundant validation

**Proposed Optimization:**
Create overload functions or factory methods that accept typed TMDB models directly:

```python
def create_movie_base_from_tmdb_model(tmdb_movie: TMDBMovieBase) -> MovieBaseSchema:
    """Direct conversion without re-parsing."""
    return MovieBaseSchema(
        tmdb_id=tmdb_movie.id,
        title=tmdb_movie.title,
        # ... map fields directly
    )
```

**Benefits:******

- Eliminate redundant validation overhead
- Reduce allocations (no intermediate dicts)
- Maintain type safety with direct field mapping
- Better performance for bulk operations (search results, discover)

**Trade-offs:**

- More code to maintain (direct mapping functions)
- Less flexible than dict-based approach
- Need to update mappings when schemas change

**When to Address:**

- Backend Modernization phase (comprehensive service refactoring)
- If profiling shows this as performance bottleneck
- When implementing caching layer (reduce validation overhead)

**Effort Estimate:** Medium (4-6 hours)

- Create direct mapping functions for each TMDB → app schema conversion
- Update all service methods to use direct mappers
- Add benchmarks to verify performance improvement
- Document new pattern in TECHNICAL-OVERVIEW.md

**CodeRabbit Finding:** Identified in Task 7.4 IDE-based CodeRabbit review
**Deferred Reason:** Premature optimization; current performance acceptable; Backend Modernization will
comprehensively refactor service patterns

---

## Completed Foundation Work (API Layer P2 + Incidental Tasks)

**Status Update (2025-10-17):** Eight incidental task lists completed during API Layer P2 execution provide
significant foundation for Backend Modernization. Many items originally planned for Backend Modernization
are now COMPLETE.

### Type Safety Infrastructure ✅ COMPLETE

**What Was Done:**

- Pyright strict mode enabled across entire backend
- Custom type stubs created for third-party libraries (django-allauth, ninja-jwt, Django extensions)
- Stub maintenance contract established (version tracking, update protocol)
- Zero type errors achieved across entire codebase
- CI integration complete (blocking type checks in GitHub Actions)

**Reference:**
`.arc/reference/archive/tasks/incidental/tasks-incidental-backend-type-safety.md`,
`tasks-incidental-config-type-safety.md`,
`tasks-incidental-fix-backend-type-errors.md`

**What Remains for Backend Modernization:**

- Continue maintaining zero type errors as new code is added
- Update custom stubs when dependencies are upgraded
- Apply type safety patterns to any new services/utilities

**Key Patterns Established:**

- Custom `.pyi` stubs for libraries without type hints
- Maintenance contract headers in stubs (version, update date)
- Pyright as primary type checker (fast, strict)
- MyPy optional for Django-aware validation (if needed)

---

### Test Infrastructure ✅ COMPLETE

**What Was Done:**

- Migrated 197 backend tests from unittest to pytest (100% pass rate)
- Established shared fixtures (`apps/conftest.py`, `authentication/tests/conftest.py`)
- Created test helpers (`core/tests/test_helpers.py` - authenticate_client, get_csrf_token, HTTPStatus enum)
- Configured pytest-xdist for parallel execution (2-4x faster)
- Coverage infrastructure configured in `pyproject.toml`

**Reference:** `.arc/reference/archive/tasks/incidental/tasks-incidental-pytest-migration.md`

**What Remains for Backend Modernization:**

- Run formal coverage reports to establish baseline
- Add tests for any gaps identified in coverage
- Maintain 100% pass rate as new features are added

**Key Patterns Established:**

- Pytest fixtures for common test setup
- Shared test helpers for DRY test code
- Parametrized tests for comprehensive coverage
- Parallel execution for fast feedback

---

### Security Hardening ✅ COMPLETE

**What Was Done:**

- Rate limiting configured (5/min login, 3/hr register, 10/min token refresh)
- Token blacklisting enabled (automatic rotation on refresh)
- Security headers configured (environment-aware HSTS, CSP, X-Frame-Options)
- CSRF middleware refined for Django Ninja + session auth hybrid
- 93 security-focused tests added (CSRF protection, token lifecycle, rate limiting)

**Reference:** `.arc/reference/archive/tasks/incidental/tasks-incidental-security-updates.md`

**What Remains for Backend Modernization:**

- Audit for additional security improvements (if any)
- Security headers already production-ready (A+ security posture)

**Key Patterns Established:**

- Environment-aware security configuration (dev vs production)
- Rate limiting using Django Ratelimit
- Token rotation on refresh (security best practice)

---

### Service Layer Architecture ✅ PATTERNS ESTABLISHED

**What Was Done:**

- Extracted authentication services to class-based architecture with dependency injection
- Created MovieEnrichmentService as example service pattern
- Established service layer patterns (class-based, DI, single responsibility)

**Reference:** `.arc/reference/archive/tasks/incidental/tasks-incidental-auth-service-extraction.md`, `.arc/reference/archive/tasks/incidental/tasks-incidental-oauth-headless-migration.md`

**Remaining Work:**

- **See `notes-service-layer-modernization.md`** for pagination helpers, batch operations, and class-based service refactoring
- This work should complete BEFORE broader Backend Modernization (Celery, code quality)

---

### API Layer Modernization ✅ COMPLETE

**What Was Done:**

- DRF completely eliminated, Django Ninja is the standard
- Two-pattern authentication established (JWT + session cookies for OAuth)
- Type generation pipeline functional (OpenAPI → TypeScript)
- All endpoints migrated to Django Ninja
- Custom auth patterns for hybrid authentication

**Reference:** `.arc/active/feature/tasks-api-layer-modernization-p2.md`

**What Remains for Backend Modernization:**

- Build on Django Ninja patterns (no DRF migration needed)
- Respect two-pattern authentication (JWT for email/password, session cookies for OAuth)
- Continue using type generation pipeline for frontend integration

**Key Patterns Established:**

- Django Ninja for all API endpoints
- Pydantic schemas as single source of truth
- JWTCookieAuth + SessionAuth hybrid authentication
- OpenAPI schema generation → TypeScript types

---

### Authentication System ✅ COMPLETE

**What Was Done:**

- django-allauth integration complete (headless mode)
- Two-pattern authentication working (JWT + session cookies)
- OAuth flows validated (Google, GitHub)
- 8 session auth tests, 20 password auth tests
- Email verification using allauth EmailAddress API

**Reference:** `.arc/reference/archive/tasks/incidental/tasks-incidental-oauth-headless-migration.md`

**What Remains for Backend Modernization:**

- NO authentication work needed - system is complete
- Respect existing patterns, don't break them
- ZeptoMail service should remain coordinated with allauth adapter

**Notes for Backend Modernization:**

- Authentication patterns are FINAL - don't refactor them
- User model is Django's default User (via allauth) - no custom user model

---

## Obsolete/Completed Items

**The following notes sections reference work that is now COMPLETE and should NOT be re-done in Backend Modernization:**

1. **Authentication Serializers - DRF Anti-Pattern**
   - **Status:** ✅ OBSOLETE - DRF completely eliminated
   - **Resolution:** Replaced with Django Ninja Pydantic schemas in API Layer P2
   - **Action:** No work needed

2. **User Model **str** Method**
   - **Status:** ✅ COMPLETE - Verified during auth modernization
   - **Resolution:** Using Django's default User model (via allauth), `get_username()` works correctly
   - **Action:** No work needed

3. **Dependency Management**
   - **Status:** ⏳ DEFERRED - No current issues, can address if needed
   - **Note:** Auth modernization changed dependencies significantly, but no CI flakiness observed
   - **Action:** Monitor for CI flakiness, address if becomes a problem

---

## Future Items

(Additional items to be added as identified)
