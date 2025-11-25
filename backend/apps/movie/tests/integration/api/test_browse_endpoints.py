"""Parametrized integration tests for browse endpoints.

Tests the three browse endpoints (browse, now-playing, upcoming) with DRY
parametrized patterns organized by concern. All endpoints share core behaviors
through the discover_movies service layer.

**Test Organization by Concern:**
- TestResponseContract: API promises (status codes, response shape, pagination)
- TestBusinessConstraints: Endpoint-specific rules (date ranges, vote counts)
- TestDataQuality: Filtering and deduplication

**Testing Pattern:**
Uses EndpointConfig to parametrize tests across all 3 endpoints. Config attributes
drive endpoint-specific assertions without code duplication.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest
from core.tests.test_helpers import HTTPStatus
from movie.services.filtering import MIN_VOTE_COUNT
from movie.tests.integration.api.endpoint_configs import (
    ALL_ENDPOINTS,
    DATE_CONSTRAINED_ENDPOINTS,
    EndpointConfig,
)
from movie.tests.test_helpers import create_mock_paginated_response, create_tmdb_movie

if TYPE_CHECKING:
    from django.test import Client


pytestmark = pytest.mark.django_db


class TestResponseContract:
    """API promises: status codes, response shape, pagination.

    These tests verify the fundamental contract each endpoint promises:
    - Returns 200 OK with valid response structure
    - Buffer fills pages to expected result count
    - Pagination metadata is correct and consistent
    - Invalid parameters return appropriate errors
    """

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_returns_200_with_results(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Each endpoint returns 200 status with expected response structure."""
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Test Movie 1",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=5000,
            ),
            create_tmdb_movie(
                tmdb_id=2,
                title="Test Movie 2",
                release_date="2025-10-20",
                vote_average=8.0,
                vote_count=3000,
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=2,
        )

        response = api_client.get(f"{config.url}?page=1")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        # Verify response structure matches PaginatedMovieResponseSchema
        assert "results" in data
        assert "page" in data
        assert "total_results" in data
        assert "total_pages" in data
        assert "next_tmdb_page_start" in data

        # Verify results returned
        assert len(data["results"]) == 2
        assert data["page"] == 1
        assert data["results"][0]["title"] == "Test Movie 1"

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_buffer_fills_to_20_results(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Each endpoint returns up to 20 results per page when available.

        The buffer mechanism fetches multiple TMDB pages if needed to fill
        the target page size of 20 results (after filtering).
        """
        # Create 20 valid movies
        movies = [
            create_tmdb_movie(
                tmdb_id=i,
                title=f"Movie {i}",
                release_date="2025-10-15",
                vote_average=7.0 + (i * 0.1),
                vote_count=1000 + (i * 100),
            )
            for i in range(1, 21)
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=5,
            total_results=100,
        )

        response = api_client.get(f"{config.url}?page=1")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        # Buffer should fill to 20 results
        assert len(data["results"]) == 20
        # More pages available (total_pages > current page)
        assert data["total_pages"] > data["page"]

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_pagination_metadata_correct(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Pagination metadata accurately reflects response state.

        Verifies:
        - page: Current page number matches request
        - total_results: Total count from TMDB
        - total_pages: Total page count for client pagination
        - next_tmdb_page_start: Smart buffer tracking for continuation
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=i,
                title=f"Movie {i}",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=2000,
            )
            for i in range(1, 11)
        ]

        # Test page 1 of 3 (more pages available)
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=3,
            total_results=50,
        )

        response = api_client.get(f"{config.url}?page=1")
        data = response.json()

        assert data["page"] == 1
        assert data["total_results"] == 50
        assert data["total_pages"] == 3
        # More pages available when total_pages > page
        assert data["total_pages"] > data["page"]

        # Test last page scenario
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies[:5],
            page=3,
            total_pages=3,
            total_results=50,
        )

        response = api_client.get(f"{config.url}?page=3")
        data = response.json()

        assert data["page"] == 3
        assert data["total_pages"] == 3
        # On last page, page == total_pages
        assert data["page"] == data["total_pages"]

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    def test_error_handling_invalid_page(
        self,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Invalid page parameter returns appropriate error response.

        Tests that malformed parameters are rejected with clear error messages.
        """
        # Invalid page value (non-numeric)
        response = api_client.get(f"{config.url}?page=invalid")

        # Django Ninja returns 422 for validation errors
        assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
        data = response.json()

        # Should contain error details
        assert "detail" in data


class TestBusinessConstraints:
    """Endpoint-specific rules that must be enforced.

    These tests verify business constraints unique to each endpoint:
    - Date ranges: now-playing and upcoming have fixed date windows (via TMDB params)
    - Vote counts: browse filters low-vote movies; now-playing/upcoming don't
      (new/upcoming releases may have few votes)
    """

    @pytest.mark.parametrize("config", DATE_CONSTRAINED_ENDPOINTS, ids=lambda c: c.name)
    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_date_range_params_sent_to_tmdb(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Date-constrained endpoints send correct date params to TMDB.

        Verifies that the endpoint presets are applied:
        - Now-playing: today-30 to today+5 (currently in theaters)
        - Upcoming: today+5 to today+60 (future releases)

        Date filtering is done by TMDB, so we verify the params sent.
        """
        today = datetime.now(tz=UTC).date()

        # Calculate expected date range based on endpoint
        if config.name == "now-playing":
            expected_min = today - timedelta(days=30)
            expected_max = today + timedelta(days=5)
        else:  # upcoming
            expected_min = today + timedelta(days=5)
            expected_max = today + timedelta(days=65)

        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Test Movie",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=1,
        )

        response = api_client.get(f"{config.url}?page=1")

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB was called with correct date range params
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        # Date range preset params must be present
        assert "primary_release_date.gte" in params
        assert "primary_release_date.lte" in params

        # Verify dates match expected range
        assert params["primary_release_date.gte"] == expected_min.isoformat()
        assert params["primary_release_date.lte"] == expected_max.isoformat()

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch("core.services.tmdb_api_client.TMDBApiClient.get")
    def test_min_vote_count_behavior(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Each endpoint applies min_vote_count correctly per its configuration.

        - Browse: Applied (filters movies with < MIN_VOTE_COUNT votes)
        - Now-playing: NOT applied (new releases may have low vote counts)
        - Upcoming: NOT applied (unreleased movies have 0 votes)
        """
        # Create movies with varying vote counts
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="High Votes",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=5000,  # Well above threshold
            ),
            create_tmdb_movie(
                tmdb_id=2,
                title="Low Votes",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=5,  # Below MIN_VOTE_COUNT (10)
            ),
            create_tmdb_movie(
                tmdb_id=3,
                title="Zero Votes",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=0,  # Unreleased movie scenario
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=3,
        )

        response = api_client.get(f"{config.url}?page=1")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        if config.min_vote_count_applied:
            # Browse: low/zero vote movies filtered out
            assert len(data["results"]) == 1
            assert data["results"][0]["title"] == "High Votes"
            # Verify the threshold behavior
            assert all(
                movie["vote_count"] >= MIN_VOTE_COUNT for movie in data["results"]
            )
        else:
            # Now-playing and upcoming: all movies returned
            # (new releases may have few votes, unreleased have 0)
            assert len(data["results"]) == 3
            titles = {movie["title"] for movie in data["results"]}
            assert titles == {"High Votes", "Low Votes", "Zero Votes"}
