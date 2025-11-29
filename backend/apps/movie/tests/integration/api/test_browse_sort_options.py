"""Integration tests for Browse endpoint sort options.

Tests that sort options flow through the full stack correctly and that
vote_average sorting respects MIN_VOTE_COUNT for data quality.

**Test Organization:**
- TestSortOptionsReturnResults: Each sort option returns 200 with results
- TestVoteAverageSortMinVoteCount: vote_average sort enforces MIN_VOTE_COUNT
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest
from core.tests.test_helpers import HTTPStatus
from movie.services.tmdb_query_params import MIN_VOTE_COUNT
from movie.tests.test_helpers import create_mock_paginated_response, create_tmdb_movie

if TYPE_CHECKING:
    from django.test import Client


pytestmark = pytest.mark.django_db

# Sort options exposed in minimal UI dropdown
MINIMAL_UI_SORT_OPTIONS = [
    pytest.param("popularity.desc", id="popularity-desc"),
    pytest.param("vote_average.desc", id="vote-average-desc"),
    pytest.param("release_date.desc", id="release-date-desc"),
    pytest.param("release_date.asc", id="release-date-asc"),
    pytest.param("original_title.asc", id="title-asc"),
]


class TestSortOptionsReturnResults:
    """Each sort option flows through the stack and returns results.

    These tests verify:
    - Endpoint returns 200 OK with each sort option
    - Sort parameter is correctly passed to TMDB
    - Response structure is valid
    """

    @pytest.mark.parametrize("sort_option", MINIMAL_UI_SORT_OPTIONS)
    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_sort_option_returns_results(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        sort_option: str,
    ) -> None:
        """Each sort option returns 200 with valid results."""
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Test Movie A",
                release_date="2025-01-15",
                vote_average=8.5,
                vote_count=5000,
            ),
            create_tmdb_movie(
                tmdb_id=2,
                title="Test Movie B",
                release_date="2025-02-20",
                vote_average=7.0,
                vote_count=3000,
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=2,
        )

        response = api_client.get(f"/api/movies/browse?page=1&sort_by={sort_option}")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        # Verify response structure
        assert "results" in data
        assert "page" in data
        assert len(data["results"]) == 2

        # Verify sort_by was passed to TMDB
        mock_tmdb_get.assert_called()
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
        assert params.get("sort_by") == sort_option


class TestVoteAverageSortMinVoteCount:
    """vote_average sort enforces MIN_VOTE_COUNT for data quality.

    When sorting by vote_average, the endpoint should:
    1. Send vote_count.gte=10 to TMDB (upstream filtering)
    2. Return only movies with vote_count >= MIN_VOTE_COUNT

    This prevents low-vote movies (often low-quality content) from
    appearing at the top of rating-sorted results.
    """

    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_vote_average_sort_sends_min_vote_count_to_tmdb(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
    ) -> None:
        """vote_average sort includes vote_count.gte in TMDB params."""
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Highly Rated Movie",
                release_date="2025-01-15",
                vote_average=9.0,
                vote_count=500,
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=1,
        )

        response = api_client.get("/api/movies/browse?page=1&sort_by=vote_average.desc")

        assert response.status_code == HTTPStatus.OK

        # Verify vote_count.gte was sent to TMDB
        mock_tmdb_get.assert_called()
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
        assert params.get("vote_count.gte") == MIN_VOTE_COUNT

    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_vote_average_sort_filters_low_vote_movies(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
    ) -> None:
        """vote_average sort filters out movies below MIN_VOTE_COUNT."""
        # Mock returns mix of high and low vote count movies
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Popular Movie",
                release_date="2025-01-15",
                vote_average=8.5,
                vote_count=1000,  # Above threshold
            ),
            create_tmdb_movie(
                tmdb_id=2,
                title="Low Vote Movie",
                release_date="2025-02-20",
                vote_average=9.5,
                vote_count=5,  # Below MIN_VOTE_COUNT (10)
            ),
            create_tmdb_movie(
                tmdb_id=3,
                title="Another Good Movie",
                release_date="2025-03-10",
                vote_average=7.5,
                vote_count=500,  # Above threshold
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=3,
        )

        response = api_client.get("/api/movies/browse?page=1&sort_by=vote_average.desc")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        # Low vote movie should be filtered out by backend
        assert len(data["results"]) == 2
        returned_ids = [movie["tmdb_id"] for movie in data["results"]]
        assert 1 in returned_ids  # Popular Movie (1000 votes)
        assert 2 not in returned_ids  # Low Vote Movie (5 votes) - filtered
        assert 3 in returned_ids  # Another Good Movie (500 votes)

        # All returned movies should have vote_count >= MIN_VOTE_COUNT
        for movie in data["results"]:
            assert movie["vote_count"] >= MIN_VOTE_COUNT
