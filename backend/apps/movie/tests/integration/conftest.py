"""Integration test fixtures for movie app.

Provides fixtures for integration tests that interact with the movie API endpoints.
These fixtures wrap common setup patterns to reduce boilerplate in tests.

"""

from __future__ import annotations

from datetime import UTC, date, timedelta
from typing import TYPE_CHECKING, Protocol

import pytest
from core.services.api_response import ApiResponse
from core.tmdb_models.tmdb_responses import TMDBMovieBase
from movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
)

if TYPE_CHECKING:
    pass


class TMDBResponseFactory(Protocol):
    """Protocol for mock TMDB response factory fixture."""

    def __call__(
        self,
        movies: list[TMDBMovieBase] | None = None,
        page: int = 1,
        total_pages: int = 1,
        total_results: int | None = None,
    ) -> ApiResponse: ...


@pytest.fixture
def mock_tmdb_response_factory() -> TMDBResponseFactory:
    """Factory for creating mock TMDB API responses.

    Creates validated Pydantic models and converts to dict for ApiResponse.
    No cast() needed - test data is validated at construction.

    Usage:
        @patch("core.services.tmdb_api_client.TMDBApiClient.get")
        def test_something(mock_tmdb_get, mock_tmdb_response_factory):
            movies = [create_tmdb_movie(1, "Movie", "2025-01-01", 7.5)]
            mock_tmdb_get.return_value = mock_tmdb_response_factory(movies)
            ...

    Returns:
        Factory function that creates ApiResponse with validated TMDB data
    """

    def factory(
        movies: list[TMDBMovieBase] | None = None,
        page: int = 1,
        total_pages: int = 1,
        total_results: int | None = None,
    ) -> ApiResponse:
        if movies is None:
            movies = [
                create_tmdb_movie(
                    1, "Default Movie", "2025-10-15", 7.5, vote_count=1000
                ),
            ]
        # Create validated Pydantic model
        tmdb_response = create_paginated_tmdb_response(
            movies, page, total_pages, total_results
        )
        # Convert to dict for ApiResponse (which holds unvalidated data)
        return ApiResponse(200, tmdb_response.model_dump())

    return factory


@pytest.fixture
def expected_date_ranges() -> dict[str, tuple[date, date]]:
    """Expected date ranges for date-constrained endpoints.

    Centralizes date calculation logic for date correctness tests.
    Keys match endpoint names in EndpointConfig.

    Returns:
        Dict mapping endpoint name to (min_date, max_date) tuple
    """
    from datetime import datetime

    today = datetime.now(tz=UTC).date()
    return {
        "now-playing": (today - timedelta(days=30), today + timedelta(days=5)),
        "upcoming": (today + timedelta(days=5), today + timedelta(days=60)),
    }
