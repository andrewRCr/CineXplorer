# Backend Modernization - Technical Notes

**Document Purpose:** Track technical debt and improvement opportunities identified during development
that should be addressed in a comprehensive backend modernization effort.

**Status:** Planning / Future Work
**Priority:** Medium

---

## Document Organization

This document is organized by implementation priority:

1. **Service Layer Patterns** - Core architectural improvements (apply patterns established during API Layer P2)
   - Pagination & Batch Operations (reusable helpers)
   - Class-Based Service Refactoring (function-based → class-based with DI)
2. **Asynchronous Task Processing** - Background job infrastructure (Celery/Redis)
3. **End-to-End Testing** - Comprehensive E2E testing (Playwright)
4. **Code Quality Improvements** - Django best practices, refactoring opportunities
5. **Completed Foundation Work** - Reference for what's already done

---

## Service Layer Patterns

### Pagination & Batch Operations

**Status:** Not yet implemented, HIGH PRIORITY for Backend Modernization
**Source:** Extracted from `tasks-enhance-user-movie-data-api.md` (originally created as incidental work)

**Context:**

During API Layer Modernization P2, discovered that the `/api/user-movie-data/movies` endpoint is missing
pagination support and has architectural inconsistencies (N+1 queries, DRY violations). Rather than fixing
ad-hoc, this work establishes **reusable service layer patterns** that become reference implementations for
the broader Backend Modernization effort.

**Why This Is Infrastructure Work (Not Feature Work):**

- Creates **generic, reusable helpers** (pagination, batch fetching, response building)
- Establishes **architectural patterns** for service composition
- Fixes **mutation anti-patterns** in enrichment service (functional approach)
- Improves **type safety** (remove unnecessary type ignores)
- These patterns will be **applied across all services** during Backend Modernization

**What Will Be Created:**

### 1. Generic Pagination Helper

**Location:** `backend/apps/core/pagination.py`

**Purpose:** Reusable Django QuerySet pagination (not limited to user-movie-data domain)

**Signature:**

```python
def paginate_queryset(
    queryset: QuerySet,
    page: int,
    page_size: int = 20
) -> tuple[QuerySet, dict[str, int]]:
    """
    Generic Django QuerySet pagination.

    Returns:
        - Paginated queryset (sliced)
        - Pagination metadata (page, total_pages, total_results)

    """
```

**Benefits:**

- DRY: Single implementation for all endpoints needing pagination
- Type-safe: Full type annotations
- Validated: Bounds checking (page >= 1, page_size limits)
- Tested: Comprehensive edge case coverage

### 2. TMDB Batch Fetch Helper

**Location:** `backend/apps/movie/helpers.py` (addition)

**Purpose:** Encapsulate N+1 TMDB API call pattern with error handling

**Signature:**

```python
def fetch_movies_batch(tmdb_ids: list[int]) -> list[MovieBaseSchema]:
    """
    Fetch multiple movies from TMDB with graceful error handling.

    Skips movies that are unavailable (404) rather than failing entire batch.
    Returns successfully fetched movies only.

    """
```

**Benefits:**

- DRY: Eliminates copy-paste TMDB fetch loops across endpoints
- Resilient: Graceful error handling (skip unavailable movies)
- Observable: Structured logging for batch operations
- Tested: Handles partial failures, complete failures, empty input

### 3. User Movies Response Builder (High-Level Composition)

**Location:** `backend/apps/movie/helpers.py` (addition)

**Purpose:** Compose pagination + TMDB fetch + enrichment into single high-level function

**Signature:**

```python
def build_user_movies_response(
    user_data_qs: QuerySet[UserMovieData],
    user: AbstractBaseUser,
    page: int,
    page_size: int = 20
) -> PaginatedMovieResponseSchema:
    """
    Build paginated movie response from UserMovieData QuerySet.

    Handles complete flow: pagination → TMDB fetch → enrichment → response.

    """
```

**Benefits:**

- DRY: Eliminates duplicate pagination + fetch + enrich logic
- Clear: Single function encapsulates entire flow
- Maintainable: Changes to flow happen in one place
- Testable: High-level integration tests

### 4. Fix MovieEnrichmentService Mutation

**Location:** `backend/apps/movie/movie_enrichment_service.py`

**Current Issue:** `enrich_movies_with_user_movie_data()` mutates input list in-place

**Fix:** Return new list with enriched copies (functional approach)

**Benefits:**

- Prevents unexpected side effects (callers get clean data)
- Aligns with Pydantic's immutable-by-default philosophy
- Makes code easier to reason about (pure function)

### 5. Type Safety Improvements

**Location:** `backend/apps/user_movie_data/api.py`, `backend/apps/movie/movie_enrichment_service.py`

**Current Issue:** Unnecessary `# pyright: ignore[reportUnknownMemberType]` comments despite `.pyi` stubs

**Fix:** Investigate why type ignores are needed and remove if possible

**Potential Causes:**

- ForeignKey traversal limitations in django-types
- Missing type information in `.pyi` stubs
- Type narrowing opportunities

**Expected Outcome:** Either eliminate ignores OR document as legitimate django-types limitation

**Testing Requirements:**

- Unit tests for generic pagination helper (edge cases, bounds checking)
- Unit tests for batch fetch helper (partial failures, empty input, TMDB errors)
- Integration tests for response builder (full flow validation)
- Update existing watchlist endpoint tests (pagination parameters)
- Mutation fix validation (ensure no in-place mutations)

**Documentation:**

- Inline docstrings with usage examples
- Add architectural pattern documentation to TECHNICAL-ARCHITECTURE.md
- Document when to use each helper (decision guide)

**Effort Estimate:** 4-6 hours

- Helper creation: 2-3 hours
- Testing: 1-2 hours
- Documentation: 1 hour

**References:**

- Original incidental task list: `.arc/upcoming/tasks-enhance-user-movie-data-api.md` (to be deleted after migration)
- CodeRabbit Finding #7: Identified missing pagination + architectural issues
- Type Safety Strategy: `.arc/reference/strategies/strategy-type-safety.md`

---

### Class-Based Service Refactoring (Function-Based → Class-Based)

**Status:** Not yet implemented, HIGH PRIORITY for Backend Modernization

**Context:**

During API Layer P2, established service layer pattern via MovieEnrichmentService and authentication services
(class-based with dependency injection). This pattern needs to be applied to remaining function-based services
across the codebase for consistency, testability, and maintainability.

**Why Class-Based Services:**

- **Dependency Injection**: Clear dependencies passed via constructor (easier testing, no hidden globals)
- **Single Responsibility**: Each service class has one clear purpose
- **State Management**: Instance variables for service configuration (user context, API clients)
- **Composability**: Services can depend on other services via DI
- **Testability**: Easy to mock dependencies in tests

**Current Function-Based Services (Need Refactoring):**

1. **`backend/apps/movie/movie_service.py`** - Movie TMDB integration functions
   - Multiple functions with repeated TMDB client instantiation
   - No shared state management
   - Difficult to mock TMDB calls in tests

2. **`backend/apps/core/email_service.py`** - Email sending functions (ZeptoMail)
   - Functions taking configuration as parameters
   - No session/connection reuse
   - Difficult to test without actual email sends

3. **Other service modules** - Any remaining function-based utilities

**Target Pattern (Established Reference):**

```python
class MovieEnrichmentService:
    """
    Class-based service with dependency injection.

    Example of established pattern from API Layer P2.
    """
    def __init__(self, user: User, tmdb_client: TMDBClient):
        self.user = user
        self.tmdb_client = tmdb_client

    def enrich_movies_with_user_movie_data(
        self,
        movies: list[MovieBaseSchema]
    ) -> list[MovieBaseSchema]:
        """
        Single responsibility: enrich movie data with user-specific info.

        Benefits:
        - User context available via self.user
        - TMDB client injected (easy to mock in tests)
        - Clear method signature (no hidden dependencies)
        """
        # Implementation...
```

**Refactoring Tasks:**

**1. Movie Service Refactoring:**

Create `MovieService` class to replace function-based `movie_service.py`:

```python
class MovieService:
    """Movie TMDB integration service."""

    def __init__(self, tmdb_client: TMDBClient):
        self.tmdb_client = tmdb_client

    def get_movie_by_id(self, tmdb_id: int) -> MovieDetailSchema:
        """Fetch single movie from TMDB."""
        # Migrate from function

    def search_movies(
        self,
        query: str,
        page: int = 1
    ) -> PaginatedMovieResponseSchema:
        """Search movies by title."""
        # Migrate from function

    def discover_movies(
        self,
        filters: DiscoverFilters,
        page: int = 1
    ) -> PaginatedMovieResponseSchema:
        """Discover movies with filters."""
        # Migrate from function
```

**2. Email Service Refactoring:**

Create `EmailService` class to replace function-based `email_service.py`:

```python
class EmailService:
    """Email sending service via ZeptoMail."""

    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email
        self._session = None  # Reusable HTTP session

    def send_verification_email(self, user: User, token: str) -> None:
        """Send email verification message."""
        # Migrate from function

    def send_password_reset_email(self, user: User, token: str) -> None:
        """Send password reset message."""
        # Migrate from function
```

**3. Update API Endpoints:**

Update all API endpoints to instantiate service classes:

```python
# Before (function-based)
from movie.movie_service import get_movie_by_id

@router.get("/movies/{tmdb_id}")
def movie_detail(tmdb_id: int):
    movie = get_movie_by_id(tmdb_id)  # Direct function call
    return movie

# After (class-based with DI)
from movie.movie_service import MovieService
from movie.tmdb_client import get_tmdb_client

@router.get("/movies/{tmdb_id}")
def movie_detail(tmdb_id: int):
    tmdb_client = get_tmdb_client()  # Factory function
    movie_service = MovieService(tmdb_client)
    movie = movie_service.get_movie_by_id(tmdb_id)
    return movie
```

**4. Service Factory Functions:**

Create factory functions for common service instantiation patterns:

```python
# backend/apps/movie/service_factory.py
def get_movie_service() -> MovieService:
    """Factory for MovieService with default TMDB client."""
    return MovieService(get_tmdb_client())

def get_movie_enrichment_service(user: User) -> MovieEnrichmentService:
    """Factory for MovieEnrichmentService with user context."""
    return MovieEnrichmentService(user, get_tmdb_client())
```

**Testing Improvements:**

Class-based services enable better testing via dependency injection:

```python
# Before: Hard to test without actual TMDB calls
def test_get_movie_by_id():
    movie = get_movie_by_id(123)  # Makes actual API call
    assert movie.title == "Expected Title"

# After: Easy to mock dependencies
def test_get_movie_by_id():
    mock_client = MockTMDBClient()
    mock_client.set_movie_response(123, {"title": "Expected Title"})

    service = MovieService(mock_client)
    movie = service.get_movie_by_id(123)

    assert movie.title == "Expected Title"
    assert mock_client.get_movie_called_with == 123
```

**Documentation Requirements:**

- Add service layer architecture documentation to TECHNICAL-ARCHITECTURE.md
- Document when to use class-based vs function-based approaches
- Provide decision guide: "Is this a service? Should it be a class?"
- Document DI patterns and factory functions

**Effort Estimate:** 10-15 hours

- Movie service refactoring: 4-5 hours
- Email service refactoring: 2-3 hours
- Update API endpoints: 2-3 hours
- Factory functions + tests: 2-3 hours
- Documentation: 1-2 hours

**Benefits:**

- Consistent service layer pattern across entire codebase
- Easier testing via dependency injection
- Better code organization (related methods grouped in classes)
- Clear dependency graphs (explicit via constructor parameters)
- Established pattern for future services

**References:**

- Established patterns: `backend/apps/movie/movie_enrichment_service.py`
- Authentication services: `backend/apps/authentication/services/`
- Service Layer Architecture (completed): See "Completed Foundation Work" section below

---

## Asynchronous Task Processing (Celery/Redis) - PLANNED

**Status:** Not yet implemented, planned for Backend Modernization

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

## End-to-End Testing (Playwright) - PLANNED

**Status:** Not yet implemented, planned for Backend Modernization

**Goal:** Comprehensive e2e testing covering critical user journeys and validating full application stack.

**Critical User Flows to Test:**

1. **Authentication Flows** (Highest Priority)
   - Password-based registration → email verification → login → logout
   - OAuth Google login → logout
   - OAuth GitHub login → logout
   - JWT token refresh (automatic via interceptor)
   - Two-pattern auth isolation (JWT vs session cookies)

2. **Movie Discovery & Search** (High Priority)
   - Search movies by title
   - Browse discover page (trending, popular)
   - View movie details
   - Navigate between pages

3. **Watchlist Management** (High Priority)
   - Add movie to watchlist (authenticated user)
   - Remove movie from watchlist
   - View watchlist page
   - Verify user isolation (different users see different watchlists)

4. **Future Features** (Medium Priority - when UI is built)
   - Movie ratings (when UI implemented)
   - Movie reviews (when UI implemented)
   - Profile management (when UI implemented)

**Technical Considerations:**

- Playwright runs browser-based tests (Chrome, Firefox, Safari)
- Requires test database + Docker environment running
- Test data management (fixtures, cleanup between tests)
- CI integration (run on PR, detect failures before merge)
- Visual regression testing (screenshot comparison)

**Test Strategy:**

- Focus on critical paths first (auth, watchlist)
- Expand coverage iteratively
- Parallel test execution for speed
- Headless mode for CI, headed mode for debugging

**Open Questions:**

- Should Playwright tests run in CI on every commit, or only on PR?
- How do we handle test data isolation between parallel test runs?
- Should we implement visual regression testing from the start, or add later?
- How do we coordinate e2e tests with existing backend unit/integration tests?

**References:**

- Playwright documentation: <https://playwright.dev/>
- Playwright with Django patterns
- CI integration examples

---

## Code Quality Improvements

This section covers Django best practices, refactoring opportunities, and technical debt items
that should be addressed during Backend Modernization.

### App Configuration - Django Best Practices

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

### Shared Module Deprecation and Migration

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
   - Document in TECHNICAL-ARCHITECTURE.md that Pydantic schemas are the single source of truth

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

### TMDB Model Double Validation Performance

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
- Document new pattern in TECHNICAL-ARCHITECTURE.md

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

### Service Layer Architecture ✅ ESTABLISHED

**What Was Done:**

- Extracted authentication services to class-based architecture with dependency injection
- Created MovieEnrichmentService as example service pattern
- Established service layer patterns (class-based, DI, single responsibility)

**Reference:** `.arc/reference/archive/tasks/incidental/tasks-incidental-auth-service-extraction.md`, `.arc/reference/archive/tasks/incidental/tasks-incidental-oauth-headless-migration.md`

**What Remains for Backend Modernization:**

- Apply service layer pattern to remaining function-based services (movie_service.py, email_service.py, etc.)
- Extract common service base classes/mixins if patterns emerge
- Document service layer architecture in TECHNICAL-ARCHITECTURE.md

**Example Pattern (MovieEnrichmentService):**

```python
class MovieEnrichmentService:
    """Class-based service with dependency injection."""
    def __init__(self, user: User, tmdb_client: TMDBClient):
        self.user = user
        self.tmdb_client = tmdb_client

    def enrich_with_user_data(self, movie_data: dict[str, Any]) -> dict[str, Any]:
        # Single responsibility: enrich movie data with user-specific info
        ...
```

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
