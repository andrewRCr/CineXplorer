"""Integration tests for Browse endpoint sort options.

Tests that sort options flow through the full stack correctly and that
vote count thresholds are applied (or bypassed) based on sort type.

**Test Organization:**
- TestSortOptionsReturnResults: Each sort option returns 200 with results
- TestVoteAverageSortMinVoteCount: vote_average sort enforces STRICT threshold
- TestAlphabeticalSortBypassesVoteFilter: original_title sorts bypass vote filtering
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest

from apps.core.tests.test_helpers import HTTPStatus
from apps.movie.services.data_quality.policy import STRICT_VOTE_THRESHOLD, VOTE_COUNT_THRESHOLD
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET
from apps.movie.tests.test_helpers import create_mock_paginated_response, create_tmdb_movie

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
    # Note: original_title.desc (Z-A) removed from UI due to TMDB data quality issues
    # Unicode ordering causes non-Latin mislabeled movies to cluster at front of Z-A results
]


class TestSortOptionsReturnResults:
    """Each sort option flows through the stack and returns results.

    These tests verify:
    - Endpoint returns 200 OK with each sort option
    - Sort parameter is correctly passed to TMDB
    - Response structure is valid
    """

    @pytest.mark.parametrize("sort_option", MINIMAL_UI_SORT_OPTIONS)
    @patch(TMDB_CLIENT_GET)
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
        # Note: release_date sorts are mapped to primary_release_date to fix TMDB API bug
        # where release_date.asc sorts by earliest regional date, not displayed date
        mock_tmdb_get.assert_called()
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
        expected_sort = sort_option.replace("release_date.", "primary_release_date.")
        assert params.get("sort_by") == expected_sort


class TestVoteAverageSortMinVoteCount:
    """vote_average sort enforces VOTE_COUNT_THRESHOLD for data quality.

    When sorting by vote_average, the endpoint should:
    1. Send vote_count.gte=10 to TMDB (upstream filtering)
    2. Return only movies with vote_count >= VOTE_COUNT_THRESHOLD

    This prevents low-vote movies (often low-quality content) from
    appearing at the top of rating-sorted results.
    """

    @patch(TMDB_CLIENT_GET)
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

        # Verify vote_count.gte was sent to TMDB with STRICT threshold
        # vote_average sorts use STRICT (10) not MODERATE (3) for statistical validity
        mock_tmdb_get.assert_called()
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
        assert params.get("vote_count.gte") == STRICT_VOTE_THRESHOLD

    @patch(TMDB_CLIENT_GET)
    def test_vote_average_sort_filters_low_vote_movies(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
    ) -> None:
        """vote_average sort filters out movies below VOTE_COUNT_THRESHOLD."""
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
                vote_count=5,  # Below STRICT_VOTE_THRESHOLD (10) for vote_average sorts
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

        # All returned movies should have vote_count >= VOTE_COUNT_THRESHOLD
        for movie in data["results"]:
            assert movie["vote_count"] >= VOTE_COUNT_THRESHOLD


# Alphabetical sort option - only A-Z remains in UI
# Note: Z-A removed due to TMDB data quality issues (Unicode ordering causes
# non-Latin mislabeled movies to cluster at front of Z-A results)
ALPHABETICAL_SORT_OPTIONS = [
    pytest.param("original_title.asc", id="title-asc"),
]


class TestAlphabeticalSortUsesModerateFilter:
    """Alphabetical sort uses MODERATE (3 votes) threshold as spam filter.

    When sorting by original_title (A-Z), we apply a light spam filter:
    - 0-2 vote movies are filtered (often garbage metadata, test entries, spam)
    - 3+ vote movies are kept (legitimate content that real users have watched)

    This balances data quality with comprehensive browsing. The 3-vote threshold
    is low enough to include niche/obscure content while filtering obvious junk.

    Note: Z-A sort was removed from UI due to TMDB data quality issues. Unicode
    ordering causes non-Latin mislabeled movies to cluster at the front of Z-A
    results, making it unusable for Latin languages.
    """

    @pytest.mark.parametrize("sort_option", ALPHABETICAL_SORT_OPTIONS)
    @patch(TMDB_CLIENT_GET)
    def test_alphabetical_sort_filters_low_vote_spam(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        sort_option: str,
    ) -> None:
        """Alphabetical sorts apply MODERATE threshold (3 votes) as spam filter.

        Movies with <3 votes are filtered as likely garbage/spam.
        Movies with 3+ votes are kept as legitimate content.
        """
        # Mix of movies: some below threshold (filtered), some above (kept)
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Zebra Movie",
                release_date="2025-01-15",
                vote_average=6.0,
                vote_count=0,  # Filtered: 0 votes = likely garbage
            ),
            create_tmdb_movie(
                tmdb_id=2,
                title="Alpha Movie",
                release_date="2025-02-20",
                vote_average=7.0,
                vote_count=2,  # Filtered: below MODERATE threshold
            ),
            create_tmdb_movie(
                tmdb_id=3,
                title="Beta Movie",
                release_date="2025-03-10",
                vote_average=8.0,
                vote_count=3,  # Kept: exactly at MODERATE threshold
            ),
            create_tmdb_movie(
                tmdb_id=4,
                title="Gamma Movie",
                release_date="2025-04-01",
                vote_average=7.5,
                vote_count=10,  # Kept: above MODERATE threshold
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=4,
        )

        response = api_client.get(f"/api/movies/browse?page=1&sort_by={sort_option}")

        assert response.status_code == HTTPStatus.OK
        data = response.json()

        # Only movies with 3+ votes should be returned
        assert len(data["results"]) == 2
        returned_ids = [movie["tmdb_id"] for movie in data["results"]]
        assert 1 not in returned_ids  # 0 votes - filtered
        assert 2 not in returned_ids  # 2 votes - filtered
        assert 3 in returned_ids  # 3 votes - kept
        assert 4 in returned_ids  # 10 votes - kept

    @pytest.mark.parametrize("sort_option", ALPHABETICAL_SORT_OPTIONS)
    @patch(TMDB_CLIENT_GET)
    def test_alphabetical_sort_sends_moderate_vote_count_to_tmdb(
        self,
        mock_tmdb_get: Mock,
        api_client: Client,
        sort_option: str,
    ) -> None:
        """Alphabetical sorts request vote_count.gte=3 from TMDB.

        MODERATE threshold (3 votes) is sent to TMDB for upstream filtering,
        reducing the amount of garbage data we need to filter client-side.
        """
        movies = [
            create_tmdb_movie(
                tmdb_id=1,
                title="Test Movie",
                release_date="2025-01-15",
                vote_average=7.0,
                vote_count=100,
            ),
        ]
        mock_tmdb_get.return_value = create_mock_paginated_response(
            movies=movies,
            page=1,
            total_pages=1,
            total_results=1,
        )

        response = api_client.get(f"/api/movies/browse?page=1&sort_by={sort_option}")

        assert response.status_code == HTTPStatus.OK

        # Verify vote_count.gte=3 (MODERATE) was sent to TMDB
        mock_tmdb_get.assert_called()
        call_args = mock_tmdb_get.call_args_list[0]
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})
        assert params.get("vote_count.gte") == 3, (
            f"Alphabetical sort {sort_option} should send vote_count.gte=3 to TMDB"
        )
