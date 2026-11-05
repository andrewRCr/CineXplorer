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

from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest

from apps.core.tests.test_helpers import HTTPStatus
from apps.movie.services.data_quality.policy import VOTE_COUNT_THRESHOLD
from apps.movie.tests.integration.api.endpoint_configs import (
    ALL_ENDPOINTS,
    DATE_CONSTRAINED_ENDPOINTS,
    EndpointConfig,
)
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET
from apps.movie.tests.test_helpers import create_mock_paginated_response, create_tmdb_movie

if TYPE_CHECKING:
    from datetime import date

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
    @patch(TMDB_CLIENT_GET)
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

        # Verify response structure matches MovieListResponseSchema
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
    @patch(TMDB_CLIENT_GET)
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
    @patch(TMDB_CLIENT_GET)
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

    @pytest.mark.parametrize(
        ("invalid_param", "invalid_value"),
        [
            ("year", "invalid"),
            ("vote_average_gte", "invalid"),
        ],
        ids=["invalid_year", "invalid_vote_average"],
    )
    def test_error_handling_invalid_filter_params(
        self,
        api_client: Client,
        invalid_param: str,
        invalid_value: str,
    ) -> None:
        """Invalid filter parameters return appropriate error response.

        Tests that Pydantic validation errors are properly returned for
        malformed filter values (year, vote_average, etc.).
        """
        # Use browse endpoint as it accepts all filter params
        response = api_client.get(f"/api/movies/browse?{invalid_param}={invalid_value}")

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
    @patch(TMDB_CLIENT_GET)
    def test_date_range_params_sent_to_tmdb(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
        expected_date_ranges: dict[str, tuple[date, date]],
    ) -> None:
        """Date-constrained endpoints send correct date params to TMDB.

        Verifies that the endpoint presets are applied:
        - Now-playing: today-30 to today+5 (currently in theaters)
        - Upcoming: today+5 to today+65 (future releases)

        Date filtering is done by TMDB, so we verify the params sent.
        """
        expected_min, expected_max = expected_date_ranges[config.name]

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
    @patch(TMDB_CLIENT_GET)
    def test_min_vote_count_behavior(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Each endpoint applies min_vote_count correctly per its configuration.

        - Browse: Applied (filters movies with < VOTE_COUNT_THRESHOLD votes)
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
                vote_count=2,  # Below MODERATE_VOTE_THRESHOLD (3) for browse
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
            assert all(movie["vote_count"] >= VOTE_COUNT_THRESHOLD for movie in data["results"])
        else:
            # Now-playing and upcoming: all movies returned
            # (new releases may have few votes, unreleased have 0)
            assert len(data["results"]) == 3
            titles = {movie["title"] for movie in data["results"]}
            assert titles == {"High Votes", "Low Votes", "Zero Votes"}


class TestDataQuality:
    """Data quality tests: completeness, filtering, and deduplication.

    These tests verify that all endpoints maintain data quality standards:
    - Completeness filtering: Movies without required fields (poster, overview) filtered out
    - Filter passthrough: User filters (genre, rating, year) work on all endpoints
    - Deduplication: No duplicate movies appear in results
    """

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_completeness_filtering(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """All endpoints filter out movies missing required fields.

        Movies must have poster_path, title, and overview to be included.
        This ensures UI can render movie cards without placeholder handling.
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Complete Movie",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
                poster_path="/poster_1.jpg",
                overview="A complete movie with all required fields.",
            ),
            create_tmdb_movie(
                tmdb_id=2,
                title="No Poster",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
                poster_path="",  # Empty string = missing poster
                overview="Movie missing poster path.",
            ),
            create_tmdb_movie(
                tmdb_id=3,
                title="No Overview",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
                poster_path="/poster_3.jpg",
                overview="",  # Empty string = missing overview
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

        # Only complete movie should pass through
        assert len(data["results"]) == 1
        assert data["results"][0]["title"] == "Complete Movie"
        assert data["results"][0]["poster_path"] == "/poster_1.jpg"
        assert data["results"][0]["overview"] == "A complete movie with all required fields."

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_passthrough_genre(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Genre filter param is passed through to TMDB API.

        Verifies with_genres parameter reaches TMDB (filtering done by TMDB).
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Action Movie",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
                genre_ids=[28],  # Action
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=1,
        )

        # Genre ID 28 = Action
        response = api_client.get(f"{config.url}?page=1&genres=28")

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB received genre filter
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "with_genres" in params
        assert params["with_genres"] == "28"

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_passthrough_rating(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Rating filter params are passed through to TMDB API.

        Verifies vote_average.gte/lte parameters reach TMDB.
        API uses vote_average_gte/lte (HTTP params), service converts to TMDB format.
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="High Rated Movie",
                release_date="2025-10-15",
                vote_average=8.5,
                vote_count=1000,
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=1,
        )

        # API uses vote_average_gte/lte as HTTP query params
        response = api_client.get(f"{config.url}?page=1&vote_average_gte=7.0&vote_average_lte=9.0")

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB received rating filters (converted to dot notation)
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "vote_average.gte" in params
        assert "vote_average.lte" in params
        assert params["vote_average.gte"] == 7.0
        assert params["vote_average.lte"] == 9.0

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_passthrough_multiple(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Multiple filters can be combined on all endpoints.

        Verifies that genre + rating filters work together.
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Action Thriller",
                release_date="2025-10-15",
                vote_average=8.0,
                vote_count=1000,
                genre_ids=[28, 53],  # Action, Thriller
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=1,
        )

        # Combine genre and rating filters (use vote_average_gte for HTTP param)
        response = api_client.get(f"{config.url}?page=1&genres=28&vote_average_gte=7.0")

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB received both filters
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "with_genres" in params
        assert params["with_genres"] == "28"
        assert "vote_average.gte" in params
        assert params["vote_average.gte"] == 7.0

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_deduplication_across_pages(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """No duplicate movies appear in results when buffer fetches multiple pages.

        The buffer mechanism fetches additional TMDB pages to fill page size.
        When TMDB returns the same movie ID across page boundaries (a known
        TMDB quirk), duplicates must be filtered out.

        Scenario: TMDB page 1 has 18 movies, page 2 has 5 movies including
        a duplicate (ID 18). Buffer should deduplicate and return all 22 unique.
        """
        # Page 1: 18 unique movies (not enough to fill 20-movie target)
        page1_movies = [
            create_tmdb_movie(
                tmdb_id=i,
                title=f"Movie {i}",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            )
            for i in range(1, 19)  # IDs 1-18
        ]

        # Page 2: 5 movies including duplicate of ID 18
        page2_movies = [
            create_tmdb_movie(
                tmdb_id=18,  # Duplicate from page 1
                title="Movie 18 (Duplicate)",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            ),
            create_tmdb_movie(
                tmdb_id=19,
                title="Movie 19",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            ),
            create_tmdb_movie(
                tmdb_id=20,
                title="Movie 20",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            ),
            create_tmdb_movie(
                tmdb_id=21,
                title="Movie 21",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            ),
            create_tmdb_movie(
                tmdb_id=22,
                title="Movie 22",
                release_date="2025-10-15",
                vote_average=7.5,
                vote_count=1000,
            ),
        ]

        # Mock TMDB returning page 1, then page 2
        mock_tmdb_get.side_effect = [
            create_mock_paginated_response(
                movies=page1_movies,
                page=1,
                total_pages=3,
                total_results=60,
            ),
            create_mock_paginated_response(
                movies=page2_movies,
                page=2,
                total_pages=3,
                total_results=60,
            ),
        ]

        response = api_client.get(f"{config.url}?page=1")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        # Extract tmdb_id from results
        result_ids = [movie["tmdb_id"] for movie in data["results"]]

        # Verify no duplicates
        assert len(result_ids) == len(set(result_ids)), "Duplicate movie IDs found in results"

        # Buffer returns every unique movie it read
        # Page 1 had 18, page 2 added 4 new (19, 20, 21, 22) with 1 duplicate (18)
        assert sorted(result_ids) == list(range(1, 23))

        # ID 18 should appear exactly once (first occurrence kept)
        assert result_ids.count(18) == 1

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_passthrough_language(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Language filter param is passed through to TMDB API.

        Verifies with_original_language parameter reaches TMDB when a specific
        language is selected (filtering done by TMDB).
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="English Movie",
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

        # Language code "en" = English
        response = api_client.get(f"{config.url}?page=1&language=en")

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB received language filter
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "with_original_language" in params
        assert params["with_original_language"] == "en"

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_no_language_when_all_selected(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """No language param sent to TMDB when 'All Languages' is selected.

        When user selects "All Languages" (empty/None), the with_original_language
        parameter should NOT be included in TMDB request. This matches TMDB's
        default behavior of returning movies in all languages.
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Any Language Movie",
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

        # No language param = all languages (default)
        response = api_client.get(f"{config.url}?page=1")

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB did NOT receive language filter
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "with_original_language" not in params

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_passthrough_certification(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Certification filter params are passed through to TMDB API.

        Verifies certification and certification_country parameters reach TMDB.
        TMDB requires certification_country (e.g., 'US') alongside certification
        (e.g., 'PG-13') to filter by MPAA rating.
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="PG-13 Movie",
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

        # Single certification with country
        response = api_client.get(
            f"{config.url}?page=1&certification=PG-13&certification_country=US"
        )

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB received certification params
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "certification" in params
        assert params["certification"] == "PG-13"
        assert "certification_country" in params
        assert params["certification_country"] == "US"

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    @patch(TMDB_CLIENT_GET)
    def test_filter_passthrough_certification_multiple(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        config: EndpointConfig,
    ) -> None:
        """Multiple certifications passed through with pipe separator (OR logic).

        TMDB accepts pipe-separated values for certification to filter by
        multiple ratings (e.g., 'G|PG' means G OR PG).
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Family Movie",
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

        # Multiple certifications with pipe separator
        response = api_client.get(
            f"{config.url}?page=1&certification=G|PG&certification_country=US"
        )

        assert response.status_code == HTTPStatus.OK

        # Verify TMDB received multi-value certification
        assert mock_tmdb_get.call_count >= 1
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

        assert "certification" in params
        assert params["certification"] == "G|PG"
        assert "certification_country" in params
        assert params["certification_country"] == "US"
