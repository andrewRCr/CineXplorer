# Service Layer Modernization - Technical Notes

**Document Purpose:** Track service layer architectural improvements that establish reusable patterns and improve code
organization, testability, and maintainability.

**Status:** Planning / Future Work
**Priority:** High (unblocks UserMovieData features and establishes patterns for future services)

**Work Classification:** Technical Infrastructure

---

## Overview

During API Layer Modernization P2, service layer patterns were established via MovieEnrichmentService and
authentication services (class-based with dependency injection).
This document tracks two categories of service layer work:

1. **Pagination & Batch Operations** - Reusable helpers for common data access patterns
2. **Class-Based Service Refactoring** - Migrate function-based services to class-based architecture

**Why This Work Comes First:**

- Establishes reference implementations for pagination, batch operations, service composition
- Unblocks UserMovieData feature work (requires pagination)
- Creates consistent service layer patterns before broader Backend Modernization
- Shorter scope (14-21 hours) enables focused feature branch

---

## Pagination & Batch Operations

**Status:** Not yet implemented, HIGH PRIORITY
**Source:** Extracted from `tasks-enhance-user-movie-data-api.md` (originally created as incidental work)

### Context

During API Layer Modernization P2, discovered that the `/api/user-movie-data/movies` endpoint is missing pagination
support and has architectural inconsistencies (N+1 queries, DRY violations). Rather than fixing ad-hoc, this work
establishes **reusable service layer patterns** that become reference implementations.

### Why This Is Infrastructure Work (Not Feature Work)

- Creates **generic, reusable helpers** (pagination, batch fetching, response building)
- Establishes **architectural patterns** for service composition
- Fixes **mutation anti-patterns** in enrichment service (functional approach)
- Improves **type safety** (remove unnecessary type ignores)
- These patterns will be **applied across all services** during Backend Modernization

### What Will Be Created

#### 1. Generic Pagination Helper

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

#### 2. TMDB Batch Fetch Helper

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

#### 3. User Movies Response Builder (High-Level Composition)

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

#### 4. Fix MovieEnrichmentService Mutation

**Location:** `backend/apps/movie/movie_enrichment_service.py`

**Current Issue:** `enrich_movies_with_user_movie_data()` mutates input list in-place

**Fix:** Return new list with enriched copies (functional approach)

**Benefits:**

- Prevents unexpected side effects (callers get clean data)
- Aligns with Pydantic's immutable-by-default philosophy
- Makes code easier to reason about (pure function)

#### 5. Type Safety Improvements

**Location:** `backend/apps/user_movie_data/api.py`, `backend/apps/movie/movie_enrichment_service.py`

**Current Issue:** Unnecessary `# pyright: ignore[reportUnknownMemberType]` comments despite `.pyi` stubs

**Fix:** Investigate why type ignores are needed and remove if possible

**Potential Causes:**

- ForeignKey traversal limitations in django-types
- Missing type information in `.pyi` stubs
- Type narrowing opportunities

**Expected Outcome:** Either eliminate ignores OR document as legitimate django-types limitation

### Testing Requirements

- Unit tests for generic pagination helper (edge cases, bounds checking)
- Unit tests for batch fetch helper (partial failures, empty input, TMDB errors)
- Integration tests for response builder (full flow validation)
- Update existing watchlist endpoint tests (pagination parameters)
- Mutation fix validation (ensure no in-place mutations)

### Documentation

- Inline docstrings with usage examples
- Add architectural pattern documentation to TECHNICAL-ARCHITECTURE.md
- Document when to use each helper (decision guide)

### Effort Estimate: 4-6 hours

- Helper creation: 2-3 hours
- Testing: 1-2 hours
- Documentation: 1 hour

### References

- Original incidental task list: `.arc/upcoming/tasks-enhance-user-movie-data-api.md` (deleted after migration)
- CodeRabbit Finding #7: Identified missing pagination + architectural issues
- Type Safety Strategy: `.arc/reference/strategies/strategy-type-safety.md`

---

## Class-Based Service Refactoring (Function-Based → Class-Based)

**Status:** Not yet implemented, HIGH PRIORITY

### Context

During API Layer P2, established service layer pattern via MovieEnrichmentService and authentication services
(class-based with dependency injection). This pattern needs to be applied to remaining function-based services
across the codebase for consistency, testability, and maintainability.

### Why Class-Based Services

- **Dependency Injection**: Clear dependencies passed via constructor (easier testing, no hidden globals)
- **Single Responsibility**: Each service class has one clear purpose
- **State Management**: Instance variables for service configuration (user context, API clients)
- **Composability**: Services can depend on other services via DI
- **Testability**: Easy to mock dependencies in tests

### Current Function-Based Services (Need Refactoring)

1. **`backend/apps/movie/movie_service.py`** - Movie TMDB integration functions
   - Multiple functions with repeated TMDB client instantiation
   - No shared state management
   - Difficult to mock TMDB calls in tests

2. **`backend/apps/core/email_service.py`** - Email sending functions (ZeptoMail)
   - Functions taking configuration as parameters
   - No session/connection reuse
   - Difficult to test without actual email sends

3. **Other service modules** - Any remaining function-based utilities

### Target Pattern (Established Reference)

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

### Refactoring Tasks

#### 1. Movie Service Refactoring

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

#### 2. Email Service Refactoring

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

#### 3. Update API Endpoints

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

#### 4. Service Factory Functions

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

### Testing Improvements

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

### Documentation Requirements

- Add service layer architecture documentation to TECHNICAL-ARCHITECTURE.md
- Document when to use class-based vs function-based approaches
- Provide decision guide: "Is this a service? Should it be a class?"
- Document DI patterns and factory functions

### Effort Estimate: 10-15 hours

- Movie service refactoring: 4-5 hours
- Email service refactoring: 2-3 hours
- Update API endpoints: 2-3 hours
- Factory functions + tests: 2-3 hours
- Documentation: 1-2 hours

### Benefits

- Consistent service layer pattern across entire codebase
- Easier testing via dependency injection
- Better code organization (related methods grouped in classes)
- Clear dependency graphs (explicit via constructor parameters)
- Established pattern for future services

### References

- Established patterns: `backend/apps/movie/movie_enrichment_service.py`
- Authentication services: `backend/apps/authentication/services/`
- Service Layer Architecture (completed): See Backend Modernization notes

---

## Total Effort Estimate

**Combined Service Layer Modernization: 14-21 hours**

- Pagination & Batch Operations: 4-6 hours
- Class-Based Service Refactoring: 10-15 hours

**Benefits of Focused Scope:**

- Shorter feature branch (easier to review, less merge risk)
- Unblocks UserMovieData features sooner (pagination helpers ready)
- Establishes consistent patterns before broader Backend Modernization
- Clear deliverable: "Service layer patterns complete"

---

## Foundation Work Already Complete

### Service Layer Architecture ✅ ESTABLISHED

**What Was Done:**

- Extracted authentication services to class-based architecture with dependency injection
- Created MovieEnrichmentService as example service pattern
- Established service layer patterns (class-based, DI, single responsibility)

**Reference:** `.arc/reference/archive/tasks/incidental/tasks-incidental-auth-service-extraction.md`, `.arc/reference/archive/tasks/incidental/tasks-incidental-oauth-headless-migration.md`

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

**Next Steps:**

When ready to begin implementation, create PRD from this notes file following `workflows/1-create-prd.md`.
This work should precede broader Backend Modernization (Celery, Playwright, code quality) as it establishes
foundational patterns.
