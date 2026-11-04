"""Centralized mock helpers for test suite DRY principles.

This module provides centralized functions for creating ApiResponse mocks with
validated Pydantic data. Centralizes the validation→serialization→ApiResponse
boundary in one place to improve maintainability and document type boundaries.

Type Boundary Documentation:
Pydantic's .model_dump() returns dict[str, Any] due to limitations in Pydantic's
type system. Any is confined to this external serialization boundary. Data validation
happens at Pydantic model construction, before .model_dump() serialization.

The architectural pattern:
    Test Builder (Returns Pydantic Model)
        ↓ [Model validated at construction]
    .model_dump() [Pydantic API boundary - dict[str, Any]]
        ↓ [Simulates JSON serialization from external API]
    ApiResponse [Pre-validation container - Mapping[str, object]]
        ↓ [Passed to service layer]
    Service validates with Pydantic
        ↓ [Type-safe processing]

This mirrors production where external APIs return raw dicts that get validated
by services. Tests use the same validation boundary pattern.
"""

from __future__ import annotations

from apps.core.services.api_response import ApiResponse
from apps.core.tmdb_models.tmdb_responses import (
    TMDBMovieBase,
)

from .tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
    create_tmdb_movie_detail,
)


def create_mock_paginated_response(
    movies: list[TMDBMovieBase] | None = None,
    page: int = 1,
    total_pages: int = 1,
    total_results: int | None = None,
    status_code: int = 200,
    headers: dict[str, str] | None = None,
    correlation_id: str | None = None,
) -> ApiResponse:
    """Create mock ApiResponse with validated paginated TMDB movie data.

    Centralizes the pattern of creating Pydantic models, serializing via
    .model_dump(), and wrapping in ApiResponse. This eliminates duplication
    across test files and documents the type boundary in one place.

    Args:
        movies: List of TMDBMovieBase models. If None, creates a single
            default movie for convenience.
        page: Current page number (default: 1)
        total_pages: Total number of pages (default: 1)
        total_results: Total results count. If None, defaults to len(movies)
        status_code: HTTP status code (default: 200)
        headers: Optional HTTP headers (for rate limiting tests, etc.)
        correlation_id: Optional correlation ID for tracing

    Returns:
        ApiResponse with validated paginated movie data

    Example:
        >>> # Success response with custom movies
        >>> movies = [
        ...     create_tmdb_movie(1, "Movie 1", "2022-01-01", 8.0),
        ...     create_tmdb_movie(2, "Movie 2", "2022-02-01", 7.5),
        ... ]
        >>> response = create_mock_paginated_response(movies, page=1, total_pages=5)

        >>> # Quick success response with defaults (single movie)
        >>> response = create_mock_paginated_response()

        >>> # Multi-page scenario
        >>> response = create_mock_paginated_response(
        ...     movies=[...], page=2, total_pages=10, total_results=200
        ... )

        >>> # Rate limiting scenario
        >>> response = create_mock_paginated_response(
        ...     status_code=429,
        ...     headers={
        ...         "x-ratelimit-limit": "40",
        ...         "x-ratelimit-remaining": "0",
        ...         "x-ratelimit-reset": "1234567890",
        ...         "retry-after": "1",
        ...     },
        ... )

    Note:
        Pydantic's .model_dump() returns dict[str, Any] due to its type system.
        Any is confined to Pydantic's external serialization boundary. The data
        has already been validated at model construction.

    When NOT to use:
        Do NOT use this helper for tests that intentionally test TMDB data quality
        issues (missing fields, None values, invalid data). Those tests need to
        bypass Pydantic validation to verify service layer filtering. See
        test_result_filtering.py module docstring "MOCK CREATION PATTERNS" for details.
    """
    # Create default movie if none provided (convenience for simple tests)
    if movies is None:
        movies = [create_tmdb_movie(1, "Test Movie", "2022-01-01", 8.0)]

    # Build validated Pydantic model
    tmdb_response = create_paginated_tmdb_response(
        movies=movies,
        page=page,
        total_pages=total_pages,
        total_results=total_results,
    )

    # Pydantic .model_dump() boundary - see module docstring for details
    return ApiResponse(
        status_code=status_code,
        data=tmdb_response.model_dump(),  # type: ignore[arg-type]
        headers=headers,
        correlation_id=correlation_id,
    )


def create_mock_movie_detail_response(
    tmdb_id: int = 1,
    title: str = "Test Movie",
    release_date: str = "2022-01-01",
    vote_average: float = 8.0,
    runtime: int = 120,
    overview: str = "Test movie overview",
    status_code: int = 200,
    headers: dict[str, str] | None = None,
    correlation_id: str | None = None,
    **kwargs: object,
) -> ApiResponse:
    """Create mock ApiResponse with validated TMDB movie detail data.

    Centralizes movie detail mock creation with sensible defaults for quick
    test setup. Additional keyword arguments are passed to create_tmdb_movie_detail()
    for customization (genres, production_companies, etc.).

    Args:
        tmdb_id: TMDB movie ID (default: 1)
        title: Movie title (default: "Test Movie")
        release_date: Release date in YYYY-MM-DD format (default: "2022-01-01")
        vote_average: Rating 0.0-10.0 (default: 8.0)
        runtime: Runtime in minutes (default: 120)
        overview: Movie synopsis (default: "Test movie overview")
        status_code: HTTP status code (default: 200)
        headers: Optional HTTP headers
        correlation_id: Optional correlation ID for tracing
        **kwargs: Additional arguments passed to create_tmdb_movie_detail()
            (genres, production_companies, poster_path, vote_count, genre_ids)

    Returns:
        ApiResponse with validated movie detail data

    Example:
        >>> # Quick success response with defaults
        >>> response = create_mock_movie_detail_response()

        >>> # Custom movie detail
        >>> response = create_mock_movie_detail_response(
        ...     tmdb_id=123,
        ...     title="Inception",
        ...     release_date="2010-07-16",
        ...     vote_average=8.8,
        ...     runtime=148,
        ...     genres=[{"id": 28, "name": "Action"}, {"id": 878, "name": "Sci-Fi"}],
        ... )

        >>> # Error response (not found)
        >>> response = create_mock_movie_detail_response(status_code=404, tmdb_id=999999)

    Note:
        Pydantic's .model_dump() returns dict[str, Any] due to its type system.
        Any is confined to Pydantic's external serialization boundary. The data
        has already been validated at model construction.
    """
    # Build validated Pydantic model
    movie_detail = create_tmdb_movie_detail(
        tmdb_id=tmdb_id,
        title=title,
        release_date=release_date,
        vote_average=vote_average,
        runtime=runtime,
        overview=overview,
        **kwargs,  # type: ignore[arg-type]
    )

    # Pydantic .model_dump() boundary - see module docstring for details
    return ApiResponse(
        status_code=status_code,
        data=movie_detail.model_dump(),  # type: ignore[arg-type]
        headers=headers,
        correlation_id=correlation_id,
    )


def create_mock_error_response(
    status_code: int,
    error_message: str | None = None,
    error_details: str | None = None,
    error_category: str | None = None,
    headers: dict[str, str] | None = None,
    correlation_id: str | None = None,
    endpoint: str | None = None,
    method: str = "GET",
) -> ApiResponse:
    """Create mock ApiResponse for error scenarios.

    Provides consistent error response mocking for testing error handling,
    rate limiting, network failures, etc.

    Args:
        status_code: HTTP error status code (400-599)
        error_message: Human-readable error message
        error_details: Additional error details or stack trace
        error_category: Error category (e.g., "rate_limit", "not_found", "server_error")
        headers: Optional HTTP headers (useful for rate limit headers)
        correlation_id: Optional correlation ID for tracing
        endpoint: API endpoint that failed (for logging/debugging)
        method: HTTP method (default: "GET")

    Returns:
        ApiResponse representing an error state

    Example:
        >>> # Not found error
        >>> response = create_mock_error_response(
        ...     status_code=404, error_message="Movie not found", error_category="not_found"
        ... )

        >>> # Rate limit error with headers
        >>> response = create_mock_error_response(
        ...     status_code=429,
        ...     error_message="Rate limit exceeded",
        ...     error_category="rate_limit",
        ...     headers={
        ...         "x-ratelimit-limit": "40",
        ...         "x-ratelimit-remaining": "0",
        ...         "retry-after": "1",
        ...     },
        ... )

        >>> # Server error with details
        >>> response = create_mock_error_response(
        ...     status_code=500,
        ...     error_message="Internal server error",
        ...     error_details="Database connection failed",
        ...     error_category="server_error",
        ...     endpoint="/api/movies/123",
        ... )

        >>> # Network timeout
        >>> response = create_mock_error_response(
        ...     status_code=504, error_message="Gateway timeout", error_category="timeout"
        ... )
    """
    # Generate default error message if not provided
    if error_message is None:
        error_message = f"Request failed with status {status_code}"

    return ApiResponse(
        status_code=status_code,
        data=None,  # Error responses typically have no data
        headers=headers,
        correlation_id=correlation_id,
        error_message=error_message,
        error_details=error_details,
        error_category=error_category,
        endpoint=endpoint,
        method=method,
    )


def create_mock_tmdb_error_response(
    status_code: int,
    status_message: str | None = None,
    tmdb_status_code: int | None = None,
    headers: dict[str, str] | None = None,
    correlation_id: str | None = None,
) -> ApiResponse:
    """Create mock ApiResponse for TMDB API error responses.

    TMDB returns errors as JSON in the response body with their own error
    codes and messages. This helper matches that structure for realistic
    test mocking.

    This is different from create_mock_error_response() which uses ApiResponse's
    error fields (error_message, error_details) - that's for internal application
    errors. This helper is specifically for mocking TMDB's external API error format.

    Args:
        status_code: HTTP status code (404, 429, 500, etc.)
        status_message: TMDB error message. If None, uses default for status code.
        tmdb_status_code: TMDB's internal status code. If None, maps from HTTP code.
        headers: Optional HTTP headers (useful for rate limit headers)
        correlation_id: Optional correlation ID for tracing

    Returns:
        ApiResponse with TMDB-formatted error in data field

    TMDB Status Code Mapping:
        - 404 → 34 (The resource you requested could not be found)
        - 429 → 25 (Your request count is over the allowed limit)
        - 500 → 11 (Internal error)
        - Other → 7 (Invalid API key)

    Example:
        >>> # Not found error (404)
        >>> response = create_mock_tmdb_error_response(
        ...     status_code=404, status_message="The resource you requested could not be found"
        ... )
        >>> # Returns: ApiResponse(404, data={'status_message': '...', 'status_code': 34})

        >>> # Rate limit error (429) with headers
        >>> response = create_mock_tmdb_error_response(
        ...     status_code=429,
        ...     status_message="Your request count is over the allowed limit",
        ...     headers={
        ...         "x-ratelimit-limit": "40",
        ...         "x-ratelimit-remaining": "0",
        ...         "retry-after": "1",
        ...     },
        ... )

        >>> # Server error (500)
        >>> response = create_mock_tmdb_error_response(
        ...     status_code=500, status_message="Internal error"
        ... )

    Note:
        This helper reflects TMDB's actual error response format. Production
        TMDBApiClient receives these errors from TMDB and passes them through
        in ApiResponse.data for service layer validation/handling.

        For internal application errors (not from TMDB), use
        create_mock_error_response() instead.
    """
    # Default TMDB status code mapping
    if tmdb_status_code is None:
        tmdb_status_code = {
            404: 34,  # Resource not found
            429: 25,  # Rate limit exceeded
            500: 11,  # Internal error
            401: 7,  # Invalid API key
            503: 11,  # Service unavailable (treat as internal error)
        }.get(status_code, 7)  # Default to "Invalid API key" for unknown codes

    # Default TMDB status messages
    if status_message is None:
        status_message = {
            404: "The resource you requested could not be found.",
            429: "Your request count is over the allowed limit.",
            500: "Internal error - something went wrong.",
            401: "Invalid API key: You must be granted a valid key.",
            503: "Service unavailable.",
        }.get(status_code, f"Request failed with status {status_code}")

    return ApiResponse(
        status_code=status_code,
        data={"status_message": status_message, "status_code": tmdb_status_code},
        headers=headers,
        correlation_id=correlation_id,
    )


# Convenience exports for common scenarios
__all__ = [
    "create_mock_error_response",
    "create_mock_movie_detail_response",
    "create_mock_paginated_response",
    "create_mock_tmdb_error_response",
    "create_paginated_tmdb_response",
    # Re-export builders for convenience (single import point)
    "create_tmdb_movie",
    "create_tmdb_movie_detail",
]
