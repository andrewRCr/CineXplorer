# Service Layer Strategy

**Version:** 1.2 | **Updated:** 2026-11-04 | **Status:** Active

## Purpose

Authoritative reference for CineXplorer's service layer architecture. Covers backend class-based services,
dependency injection patterns, ORM access, batch operations, and frontend service organization.
Use when implementing new services, understanding existing patterns, or onboarding to the codebase.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Services](#backend-services)
   - [Class-Based Service Pattern](#class-based-service-pattern)
   - [Decision Guide: Class vs Function](#decision-guide-class-vs-function)
   - [Repository Pattern](#repository-pattern)
   - [Service Composition](#service-composition)
   - [Batch Operations](#batch-operations)
   - [Factory Functions](#factory-functions)
   - [Reference Implementations](#reference-implementations-backend)
3. [Frontend Services](#frontend-services)
   - [Organization](#organization)
   - [apiClient Pattern](#apiclient-pattern)
   - [httpService Pattern](#httpservice-pattern)
   - [Domain Services](#domain-services)
   - [Reference Implementations](#reference-implementations-frontend)
4. [Key Files Reference](#key-files-reference)

---

## Architecture Overview

### Layered Architecture Principle

**Business logic belongs in the service layer, NOT in API endpoints.**

```
┌─────────────────────────────────────────────────────────────┐
│ API Layer (Django Ninja routes)                             │
│ - HTTP concerns only: parse request, return response        │
│ - Parameter extraction and validation                       │
│ - Maps domain exceptions to responses (one handler)         │
│ - Delegates ALL business logic to service layer             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Service Layer                                               │
│ - Business logic, calculations, filtering                   │
│ - Orchestration of multiple operations                      │
│ - Data transformation and enrichment                        │
│ - External API integration (TMDB)                           │
│ - Raises domain exceptions, never HttpError                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Access Layer                                           │
│ - The Django ORM, from services, or from a repository       │
│   where a query is shared                                   │
│ - API client abstraction for external data                  │
│ - Query optimization (select_related, bulk queries)         │
└─────────────────────────────────────────────────────────────┘
```

### Why This Matters

- **Testability**: Services take their external clients (TMDB) by injection, so tests replace only that
  boundary and run against the real database
- **Separation of concerns**: API layer stays thin and focused on HTTP
- **Reusability**: Service methods can be called from multiple API endpoints
- **Maintainability**: Business logic changes don't require API layer changes

---

## Backend Services

### Class-Based Service Pattern

CineXplorer uses class-based services with constructor injection for all non-trivial business logic.

**Structure:**

```python
class MyService:
    """
    Service for [domain] operations.

    Architecture:
        - Class-based with dependency injection
        - [External client] injection for testability
        - Raises domain exceptions; the API layer maps them to responses
    """

    def __init__(
        self,
        dependency: SomeDependency | None = None,
    ) -> None:
        """
        Initialize with optional dependency injection.

        Args:
            dependency: Injected dependency. If None, creates default.
        """
        if dependency is not None:
            self._dependency = dependency
        else:
            self._dependency = SomeDependency()

    def do_something(self, ...) -> ResultType:
        """Business logic method using injected dependency."""
        return self._dependency.fetch_data(...)
```

**Key characteristics:**

- Constructor accepts optional dependencies (default to production implementations)
- Private attributes (`_dependency`) for injected dependencies
- Full type annotations (no `Any` usage)
- Comprehensive docstrings with usage examples
- Raises domain exceptions from `apps/core/exceptions.py` (`NotFoundError`, `ConflictError`, `InvalidInputError`,
  `PermissionDeniedError`, `UpstreamError`); the handlers in `apps/core/api_errors.py` map them to responses

### Decision Guide: Class vs Function

Use this guide when deciding whether to implement as a class-based service or standalone function.

**Use class-based service when:**

| Criterion                                             | Example                                                |
|-------------------------------------------------------|--------------------------------------------------------|
| Has external dependencies (API clients, repositories) | MovieService needs TMDBApiClient                       |
| Wraps an external client tests replace                | MovieService with a stub TMDB client                   |
| Has multiple related methods sharing state            | AuthenticationService with shared user model           |
| Benefits from inheritance                             | BaseTMDBService shared by MovieService, KeywordService |
| Stateful operations (caching, connection pooling)     | Future: services with connection pools                 |

**Use standalone function when:**

| Criterion                                     | Example                                 |
|-----------------------------------------------|-----------------------------------------|
| Pure transformation, no external dependencies | `merge_with_preset()` filter merging    |
| Single-purpose utility                        | `paginate_queryset()` pagination helper |
| No need for mocking (logic is deterministic)  | Data quality filter functions           |
| Called from within services (helper role)     | `_filter_non_visual_content()`          |

**Rule of thumb:** If it wraps an external client, use a class and inject the client. If the logic is pure and
deterministic, a function is fine.

### Repository Pattern

Repositories are optional: a service can use the Django ORM directly. A repository gives a query several services
share one home.

**When to use:**

- Multiple services share data access patterns
- Complex queries that should be encapsulated

Shared queries can live on a model's custom QuerySet. Services that use a repository exercise its real queries
against the test database, replacing only external clients.

### Service Composition

Services can depend on other services or repositories for complex operations.

A service can build another service with the same injected external client. For example, `UserMovieDataService`
uses `MovieService(tmdb_client=self._tmdb_client)` to look up an unstored movie and uses the model's custom QuerySet
for persisted user data.

**Composition examples in codebase:**

| Service                                     | Depends On                  | Purpose                          |
| ------------------------------------------- | --------------------------- | -------------------------------- |
| UserMovieDataService                        | TMDBApiClient, MovieService | CRUD + TMDB fetching             |
| MovieEnrichmentService                      | UserMovieDataQuerySet       | Enriches movies with user data   |
| UserMovieDataService._build_enriched_movies | MovieEnrichmentService      | Composes enrichment into queries |

### Batch Operations

For operations on multiple items (fetching, processing), use batch patterns with graceful degradation.

**Pattern:**

```python
def fetch_movies_batch(movie_ids: list[int]) -> list[MovieListItemSchema]:
    """
    Fetch multiple movies with graceful degradation.

    - Successfully fetched movies are returned
    - Failed fetches are logged but don't fail the entire batch
    - Duplicate IDs are deduplicated
    - Empty input returns empty list
    """
    if not movie_ids:
        return []

    unique_ids = list(set(movie_ids))
    successfully_fetched: list[MovieListItemSchema] = []
    failed_count = 0

    for movie_id in unique_ids:
        try:
            response = tmdb_client.get_movie_details(movie_id)
            if response.is_success():
                successfully_fetched.append(transform(response))
            else:
                failed_count += 1
                logger.warning("Failed to fetch movie", extra={...})
        except Exception as e:
            failed_count += 1
            logger.error("Unexpected error", extra={...}, exc_info=True)

    logger.info(f"Batch complete: {len(successfully_fetched)} succeeded, {failed_count} failed")
    return successfully_fetched
```

**Key characteristics:**

- Graceful degradation (partial failures don't fail entire operation)
- Deduplication of input IDs
- Structured logging with success/failure counts
- Empty input handling (no-op, no API calls)

### Factory Functions

Factory functions provide convenient service instantiation for production code while preserving
testability through constructor injection.

**Structure:**

```python
# service_factory.py
def get_movie_service() -> MovieService:
    """
    Create MovieService with default dependencies.

    For testing, bypass this factory and inject a stub TMDB client
    into the service constructor.

    Example:
        # Production
        service = get_movie_service()

        # Testing (bypass factory)
        stub_client = StubTMDBClient()
        service = MovieService(tmdb_client=stub_client)
    """
    tmdb_client = TMDBApiClient()
    return MovieService(tmdb_client=tmdb_client)
```

**Usage pattern:**

- Production code uses factory: `service = get_movie_service()`
- Tests bypass the factory and inject a stub TMDB client: `service = MovieService(tmdb_client=stub)`

### Reference Implementations (Backend)

| Service                | File                                                   | Pattern                              | Purpose                                         |
| ---------------------- | ------------------------------------------------------ | ------------------------------------ | ----------------------------------------------- |
| MovieService           | `movie/services/movie_service.py`                      | Class + DI, inherits BaseTMDBService | TMDB integration for discovery, search, details |
| KeywordService         | `movie/services/keyword_service.py`                    | Class + DI, inherits BaseTMDBService | TMDB keyword operations                         |
| PeopleService          | `movie/services/people_service.py`                     | Class + DI, inherits BaseTMDBService | TMDB people/cast operations                     |
| UserMovieDataService   | `user_movie_data/services/user_movie_data_service.py`  | Class + DI + composition             | CRUD with TMDB integration                      |
| MovieEnrichmentService | `user_movie_data/services/movie_enrichment_service.py` | Class + ORM                          | Enriches movies with user data                  |
| AuthenticationService  | `authentication/services/authentication_service.py`    | Class + DI (extensive)               | Security-critical auth operations               |
| BaseTMDBService        | `movie/services/base_service.py`                       | Base class                           | Shared DI pattern for TMDB services             |
| fetch_movies_batch     | `movie/services/pipelines/batch.py`                    | Function                             | Batch TMDB fetching with graceful degradation   |

---

## Frontend Services

### Organization

Frontend services are organized in `frontend/src/services/`:

```
services/
├── apiClient.ts          # Axios instance with auth interceptors
├── httpService.ts        # Generic HTTP service factory
├── movieService.ts       # Movie domain operations
├── authService.ts        # Authentication operations
├── userMovieDataService.ts  # User movie data operations
├── userMovieService.ts   # User-specific movie operations
├── paginationContext.ts  # Multi-tab pagination isolation
├── consoleCapture.ts     # Development logging
└── logger.ts             # Application logging
```

### apiClient Pattern

Central axios instance with interceptors for cross-cutting concerns.

**Responsibilities:**

```typescript
const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,  // Send cookies (session, refresh token)
});

// Request interceptor: attach auth, CSRF, pagination context
apiClient.interceptors.request.use((config) => {
    // JWT access token (if email/password auth)
    const { access_token } = getAuthTokens();
    if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
    }

    // CSRF token for unsafe methods
    if (unsafeMethods.includes(config.method)) {
        config.headers["X-CSRFToken"] = getCsrfToken();
    }

    // Pagination context for movie endpoints
    if (isMovieEndpoint(config.url)) {
        config.headers["X-Pagination-Context"] = getPaginationContextId();
    }

    return config;
});

// Response interceptor: handle 401, token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Token refresh logic...
        }
        return Promise.reject(error);
    }
);
```

**Key features:**

- Centralized auth header injection
- Automatic CSRF token attachment
- Token refresh with request queuing
- Pagination context for deduplication

### httpService Pattern

Generic HTTP service factory for RESTful resources.

**Structure:**

```typescript
class HttpService {
    endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    get<T>(id: string | number) {
        const controller = new AbortController();
        const request = apiClient.get<T>(`${this.endpoint}/${id}`, {
            signal: controller.signal,
        });
        return { request, cancel: () => controller.abort() };
    }

    getPaginated<T>(params?: Record<string, unknown>) {
        // Paginated resource fetch with cancellation
    }

    create<T>(entity: T) { ... }
    update<T>(id, entity: T) { ... }
    remove(id) { ... }
}

const create = (endpoint: string) => new HttpService(endpoint);
export default create;
```

**Usage:**

```typescript
// Create service instances
const fetchBrowseMoviesService = create("/movies/browse");
const fetchMovieGenresService = create("/genres");

// Use for operations
const { request, cancel } = fetchBrowseMoviesService.getPaginated(params);
```

### Domain Services

Domain services compose httpService with domain-specific logic.

**Pattern:**

```typescript
// movieService.ts

// Service instances for endpoints
export const fetchBrowseMoviesService = create("/movies/browse");
export const fetchSearchMoviesService = create("/movies/search");

// Type-safe wrapper functions
export const browseMovies = (params?: MovieQueryParams) => {
    return fetchPaginatedMovies(fetchBrowseMoviesService, params);
};

export const searchMovies = (params?: MovieQueryParams) => {
    return fetchPaginatedMovies(fetchSearchMoviesService, params);
};

export const getMovieDetail = (tmdb_id: string | number) => {
    return fetchSingleMovie(fetchMovieDetail(), tmdb_id);
};
```

**Characteristics:**

- Service instances per endpoint
- Type-safe wrapper functions with domain types
- Query parameter interfaces (MovieQueryParams)
- Convenience functions for common operations

### Reference Implementations (Frontend)

| Service              | File                               | Purpose                                                 |
|----------------------|------------------------------------|---------------------------------------------------------|
| apiClient            | `services/apiClient.ts`            | Axios instance with auth, CSRF, pagination interceptors |
| httpService          | `services/httpService.ts`          | Generic HTTP service factory with CRUD operations       |
| movieService         | `services/movieService.ts`         | Movie domain: browse, search, detail, genres            |
| authService          | `services/authService.ts`          | Authentication: login, logout, register, verify         |
| userMovieDataService | `services/userMovieDataService.ts` | User movie data CRUD                                    |
| paginationContext    | `services/paginationContext.ts`    | Multi-tab pagination isolation                          |

---

## Key Files Reference

### Backend

| File                          | Location                                 | Purpose                            |
| ----------------------------- | ---------------------------------------- | ---------------------------------- |
| `movie_service.py`            | `backend/apps/movie/services/`           | Main movie operations (TMDB)       |
| `base_service.py`             | `backend/apps/movie/services/`           | Base class for TMDB services       |
| `service_factory.py`          | `backend/apps/movie/services/`           | Factory functions for movie domain |
| `user_movie_data_service.py`  | `backend/apps/user_movie_data/services/` | User movie data CRUD               |
| `movie_enrichment_service.py` | `backend/apps/user_movie_data/services/` | Enrichment with user data          |
| `authentication_service.py`   | `backend/apps/authentication/services/`  | Auth operations                    |
| `batch.py`                    | `backend/apps/movie/services/pipelines/` | Batch TMDB fetching                |

### Frontend

| File                      | Location                 | Purpose                 |
|---------------------------|--------------------------|-------------------------|
| `apiClient.ts`            | `frontend/src/services/` | Axios with interceptors |
| `httpService.ts`          | `frontend/src/services/` | Generic HTTP factory    |
| `movieService.ts`         | `frontend/src/services/` | Movie domain wrapper    |
| `authService.ts`          | `frontend/src/services/` | Auth operations         |
| `userMovieDataService.ts` | `frontend/src/services/` | User movie data         |
| `paginationContext.ts`    | `frontend/src/services/` | Multi-tab isolation     |

---

## Related Documentation

- [Pagination Strategy](strategy-pagination.md) - Buffer mechanism, deduplication, cursor pagination
- [Authentication Strategy](strategy-authentication.md) - Auth patterns, JWT, OAuth flows
- [Testing Methodology](strategy-testing-methodology.md) - Testing services against the real database
- [Type Safety Strategy](strategy-type-safety.md) - Type annotations in services

---

## Version History

- **1.2** (2026-11-04): Name the domain exceptions' module and the handlers that map them
- **1.1** (2026-11-03): Domain exceptions in place of `HttpError`; tests use the real database, not mock
  repositories
- **1.0** (2025-12-19): Initial strategy document
