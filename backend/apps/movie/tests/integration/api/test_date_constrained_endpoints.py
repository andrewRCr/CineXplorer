"""Integration tests for date-constrained movie endpoints.

Tests the thin wrapper pattern for now-playing and upcoming endpoints,
verifying filter support and preset enforcement per ADR-002.

**Test Organization Note:**
This file is forward-compatible with the test organization standardization
plan (tasks-test-organization-standardization.md). When Phase 4 file splits
execute, these tests are already in their target location.

**Testing Strategy:**
- Basic smoke tests to verify endpoints return results
- Filter parameter support (genres, ratings, etc.)
- Protected key enforcement (date ranges cannot be overridden)
- Browse endpoint remains unchanged after rename

See: `.arc/reference/strategies/strategy-testing-methodology.md` for patterns
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast
from unittest.mock import Mock, patch

import pytest
from core.services.api_response import ApiResponse
from core.tests.test_helpers import HTTPStatus
from core.types.api_types import TMDBResponseData
from movie.tests.test_fixtures_tmdb import create_paginated_tmdb_response, create_raw_tmdb_movie

if TYPE_CHECKING:
    from django.test import Client


pytestmark = pytest.mark.django_db


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_returns_results_with_genre_filter(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Smoke test: now-playing endpoint returns results with genre filter."""
    # Mock TMDB response using existing helpers
    movies = [
        create_raw_tmdb_movie(
            550, "Fight Club", "2025-10-15", 8.4, vote_count=5000, genre_ids=[28, 18]
        ),
        create_raw_tmdb_movie(
            551, "Action Movie", "2025-10-20", 7.5, vote_count=3000, genre_ids=[28]
        ),
    ]
    tmdb_response = create_paginated_tmdb_response(movies, page=1, total_pages=1, total_results=2)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    # Test now-playing with genre filter
    response = api_client.get("/api/movies/now-playing?page=1&with_genres=28")

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2
    assert data["results"][0]["title"] == "Fight Club"
    assert data["page"] == 1

    # Verify TMDB was called with correct parameters
    # (first call only, pagination may make multiple)
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    endpoint = call_args[0][0]  # First positional arg
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
    assert endpoint == "discover/movie"
    assert "with_genres" in params
    assert params["with_genres"] == "28"
    # Verify date range preset is applied
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_returns_results_with_rating_filter(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Smoke test: upcoming endpoint returns results with rating filter."""
    # Mock TMDB response using existing helpers
    movies = [
        create_raw_tmdb_movie(
            600, "Upcoming Blockbuster", "2025-11-15", 8.0, vote_count=100, genre_ids=[28, 12]
        ),
        create_raw_tmdb_movie(
            601, "Future Hit", "2025-11-20", 7.8, vote_count=50, genre_ids=[878]
        ),
    ]
    tmdb_response = create_paginated_tmdb_response(movies, page=1, total_pages=1, total_results=2)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    # Test upcoming with rating filter
    response = api_client.get("/api/movies/upcoming?page=1&vote_average_gte=7.5")

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2
    assert data["results"][0]["title"] == "Upcoming Blockbuster"
    assert data["page"] == 1

    # Verify TMDB was called with correct parameters
    # (first call only, pagination may make multiple)
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    endpoint = call_args[0][0]  # First positional arg
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
    assert endpoint == "discover/movie"
    assert "vote_average.gte" in params
    assert params["vote_average.gte"] == 7.5
    # Verify date range preset is applied
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_still_works_after_rename(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Smoke test: browse endpoint (renamed from discover) still works."""
    # Mock TMDB response using existing helpers
    movies = [
        create_raw_tmdb_movie(
            700, "Classic Movie", "1999-03-31", 8.8, vote_count=25000, genre_ids=[18]
        ),
    ]
    tmdb_response = create_paginated_tmdb_response(movies, page=1, total_pages=1, total_results=1)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    # Test browse with genre and sort filters
    response = api_client.get(
        "/api/movies/browse?page=1&with_genres=18&sort_by=vote_average.desc"
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["title"] == "Classic Movie"
    assert data["page"] == 1

    # Verify TMDB was called with correct parameters
    # (first call only, pagination may make multiple)
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    endpoint = call_args[0][0]  # First positional arg
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
    assert endpoint == "discover/movie"
    assert "with_genres" in params
    assert params["with_genres"] == "18"
    assert "sort_by" in params
    assert params["sort_by"] == "vote_average.desc"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_date_preset_cannot_be_overridden(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Protected keys: user cannot override date range on now-playing."""
    # Mock TMDB response using existing helpers
    movies = [
        create_raw_tmdb_movie(
            800, "Protected Movie", "2025-10-25", 7.0, vote_count=1000, genre_ids=[28]
        ),
    ]
    tmdb_response = create_paginated_tmdb_response(movies, page=1, total_pages=1, total_results=1)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    # Try to override date range (should be ignored)
    response = api_client.get(
        "/api/movies/now-playing?page=1&release_date_gte=2020-01-01&release_date_lte=2020-12-31"
    )

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB was called with preset dates, NOT user-provided dates (first call only)
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # The preset dates should be recent (today - 30 days to today + 5 days)
    # NOT the 2020 dates the user tried to provide
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    # Verify dates are NOT 2020 (protected keys worked)
    assert not params["primary_release_date.gte"].startswith("2020")
    assert not params["primary_release_date.lte"].startswith("2020")


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_date_preset_cannot_be_overridden(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Protected keys: user cannot override date range on upcoming."""
    # Mock TMDB response using existing helpers
    movies = [
        create_raw_tmdb_movie(
            900, "Future Protected", "2025-11-30", 6.5, vote_count=50, genre_ids=[878]
        ),
    ]
    tmdb_response = create_paginated_tmdb_response(movies, page=1, total_pages=1, total_results=1)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    # Try to override date range (should be ignored)
    response = api_client.get(
        "/api/movies/upcoming?page=1&release_date_gte=2020-01-01&release_date_lte=2020-12-31"
    )

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB was called with preset dates, NOT user-provided dates (first call only)
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # The preset dates should be future (today + 5 days to today + 65 days)
    # NOT the 2020 dates the user tried to provide
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    # Verify dates are NOT 2020 (protected keys worked)
    assert not params["primary_release_date.gte"].startswith("2020")
    assert not params["primary_release_date.lte"].startswith("2020")


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_allows_full_date_control(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Browse endpoint: user HAS full control over all filters including dates."""
    # Mock TMDB response using existing helpers
    movies = [
        create_raw_tmdb_movie(
            1000, "2020 Movie", "2020-06-15", 7.5, vote_count=5000, genre_ids=[18]
        ),
    ]
    tmdb_response = create_paginated_tmdb_response(movies, page=1, total_pages=1, total_results=1)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    # User provides date range - should be respected (no presets)
    response = api_client.get(
        "/api/movies/browse?page=1&release_date_gte=2020-01-01&release_date_lte=2020-12-31"
    )

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB was called with USER-PROVIDED dates (no preset override, first call only)
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # Browse has no protected keys, so user dates should be used
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    # Verify dates ARE 2020 (user control worked)
    assert params["primary_release_date.gte"] == "2020-01-01"
    assert params["primary_release_date.lte"] == "2020-12-31"
