# Core App - Cross-Domain Utilities

**Version**: 1.0
**Last Updated**: 2025-10-20
**Purpose**: Shared utilities and helpers used across multiple CineXplorer applications

---

## Overview

The Core app provides cross-domain utilities that reduce code duplication and centralize common patterns
across authentication, movie, and user_movie_data domains.

**Design Principle**: "Don't Repeat Yourself" (DRY) - Extract patterns with 3+ repetitions per the Rule of Three.

---

## Utilities Layer (`core/utils/`)

### HTTP Utilities (`core/utils/http.py`)

HTTP request/response helpers for consistent client info extraction and error handling.

#### `get_client_info(request: HttpRequest) -> tuple[str, str]`

Extract client IP and user agent from request for security logging.

**Returns**: `(client_ip, user_agent)` with 'unknown' defaults

**Example**:

```python
from apps.core.utils import get_client_info


@auth_router.post("/login/")
def login(request: HttpRequest):
    client_ip, user_agent = get_client_info(request)
    logger.info(f"Login attempt | ip={client_ip} | user_agent={user_agent}")
    # ... authentication logic
```

**Use When**: Logging authentication events, security monitoring, rate limiting attribution

---

#### `build_error_response(error: str, *, debug_detail: str | None = None) -> dict[str, object]`

Build standardized error response with optional DEBUG-only detail.

**Returns**: `{"error": "message"}` or `{"error": "message", "detail": "debug info"}` if DEBUG=True

**Example**:

```python
from apps.core.utils import build_error_response

# Production (DEBUG=False): {"error": "Token has been revoked"}
# Development (DEBUG=True): {"error": "Token has been revoked", "detail": "Token blacklisted at 2025-10-20 14:30:00"}

return 401, build_error_response(
    "Token has been revoked. Please login again.",
    debug_detail="This refresh token has already been used and is no longer valid.",
)
```

**Use When**: Returning API error responses that need debug information in development

---

### Pydantic Validators (`core/utils/validators.py`)

Reusable Pydantic field validators for common data transformations.

#### `empty_str_to_none(value: str | None) -> str | None`

Convert empty strings to None for optional string fields.

**Use Case**: Django Ninja 1.4.3 + Pydantic 2.12.0 sends empty strings for optional query params instead of None

**Example**:

```python
from apps.core.utils import empty_str_to_none
from pydantic import field_validator


class MovieSearchParamsSchema(Schema):
    query: str
    year: str | None = None

    @field_validator("year", mode="before")
    @classmethod
    def validate_year(cls, v: object) -> str | None:
        return empty_str_to_none(v)
```

**Use When**: Optional query parameters, optional filter fields, any `str | None` field that might receive empty strings

---

### Generic Schemas (`core/utils/schemas.py`)

Generic schema definitions using Python 3.13 type parameters.

#### `PaginatedResponse[T]`

Generic paginated response schema for list endpoints.

**Type Parameter**: `T` - The type of items in results list

**Example**:

```python
from apps.core.utils import PaginatedResponse
from apps.movie.schemas import MovieListItemSchema


class MovieListResponseSchema(PaginatedResponse[MovieListItemSchema]):
    """Movie list response with TMDB pagination metadata."""

    pass


@movies_router.get("/now-playing", response=MovieListResponseSchema)
def get_now_playing(request: HttpRequest) -> MovieListResponseSchema:
    return movie_service.get_now_playing_movies(page=1)
```

**Use When**: Any paginated list endpoint (movies, keywords, people, user movie data)

**Benefits**:

- Type-safe results list
- Eliminates repetitive field definitions
- Python 3.13 generic syntax (modern, clean)

---

## Test Helpers (`core/tests/test_helpers.py`)

Reusable test utilities for reducing boilerplate in test files.

### `create_user_and_auth_payload(username: str = "testuser", password: str = "TestPass123!") -> tuple[User, dict[str, str]]`

Create user and authentication payload in one call (reduces 3-line pattern to 1-line).

**Returns**: `(user, payload)` where payload = `{"login": username, "password": password}`

**Example**:

```python
from apps.core.tests.test_helpers import create_user_and_auth_payload


def test_login_success(api_client):
    # Old way (3 lines):
    # user = create_user(username="testuser", password="TestPass123!")
    # payload = {"login": "testuser", "password": "TestPass123!"}

    # New way (1 line):
    user, payload = create_user_and_auth_payload()

    response = api_client.post("/api/token/", data=payload, content_type="application/json")
    assert response.status_code == 200
```

**Use When**: Authentication endpoint tests, any test requiring user + credentials

---

## Domain-Specific Utilities

While `core/utils/` provides cross-domain utilities, domain-specific helpers are kept in their respective apps:

### Authentication Utilities (`authentication/utils.py`)

JWT token management, settings retrieval, cookie handling.

**Key exports**:

- `JWTSettings` dataclass - Type-safe JWT settings access
- `get_jwt_settings()` - Retrieve JWT configuration
- `set_auth_cookie()` - Set authentication cookies consistently
- `blacklist_token()` - Blacklist refresh tokens
- `check_token_blacklist()` - Check if token is blacklisted
- `extract_user_id_from_token()` - Extract user ID from JWT

**Use When**: Authentication endpoints only (login, logout, token refresh)

---

### Movie Helpers (`movie/helpers.py`)

Movie enrichment with user movie data.

**Key exports**:

- `enrich_response_with_user_movie_data()` - Enrich paginated responses
- `enrich_single_movie_with_user_movie_data()` - Enrich single movie objects

**Use When**: Movie endpoints that need UserMovieData enrichment (now-playing, upcoming, search, discover, detail)

---

## When to Add New Utilities

Follow the **Rule of Three**:

1. **First use**: Inline implementation (no abstraction)
2. **Second use**: Copy-paste with comment noting duplication
3. **Third use**: Extract to utility module

**Decision Tree**:

```
Is this pattern used 3+ times?
├─ No → Keep inline
└─ Yes → Extract to utility
    │
    ├─ Used across multiple domains? → core/utils/
    ├─ Domain-specific (auth only)? → authentication/utils.py
    ├─ Domain-specific (movie only)? → movie/helpers.py
    └─ Test code only? → core/tests/test_helpers.py
```

---

## Quality Standards

All utilities must have:

- ✅ **Comprehensive docstrings** (module, class, function)
- ✅ **Type hints** (strict Pyright compliance)
- ✅ **Usage examples** (in docstrings)
- ✅ **Tests** (for non-trivial logic)

---

## Changelog

**v1.0** (2025-10-20):

- Initial creation during Phase 2 DRY refactoring (Task R.4.3)
- Added HTTP utilities (get_client_info, build_error_response)
- Added Pydantic validators (empty_str_to_none)
- Added generic schemas (PaginatedResponse[T])
- Added test helpers (create_user_and_auth_payload)
