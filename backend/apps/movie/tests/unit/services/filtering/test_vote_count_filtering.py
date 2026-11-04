"""Unit tests for vote count quality filtering in TMDB result processing.

Tests the tiered vote count threshold logic:
- STRICT (200 votes): For rating-dependent sorts without rating filters
- MODERATE (3 votes): For general browsing, spam filter, rating sorts with filters
- BYPASS (None): For search, alphabetical sorts, upcoming, now-playing

These tests verify the filtering EFFECT through MovieService, complementing
the policy decision tests in test_vote_count_policy.py.
"""

from __future__ import annotations

from unittest.mock import Mock

from apps.core.services.api_response import ApiResponse
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.data_quality.policy import (
    MODERATE_VOTE_THRESHOLD,
    STRICT_VOTE_THRESHOLD,
)
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.test_helpers import create_mock_paginated_response
from apps.movie.tests.tmdb_test_builders import (
    TMDBMovieBaseRawDict,
    create_paginated_tmdb_response,
    create_tmdb_movie,
)


def test_general_browsing_applies_moderate_threshold() -> None:
    """Test that general browsing applies MODERATE threshold (3 votes).

    When no sort is specified (default popularity.desc), the moderate
    threshold (3 votes) is applied as a spam filter while allowing
    niche content through.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=["get"])

    tmdb_movies = [
        # Above moderate threshold (3 votes) - should pass
        create_tmdb_movie(1, "Above Moderate Threshold", "2022-01-01", 8.0, vote_count=10),
        create_tmdb_movie(2, "Just Above", "2022-02-01", 7.0, vote_count=3),
        # Below moderate threshold (3 votes) - should be filtered
        create_tmdb_movie(101, "Below Moderate", "2022-03-01", 8.5, vote_count=2),
        create_tmdb_movie(102, "Very Low", "2022-04-01", 7.5, vote_count=1),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without sort (uses moderate threshold)
    result = service.discover_movies(page=1)

    # Assert: Only movies with 3+ votes returned (moderate threshold applied)
    assert len(result.results) == 2, f"Expected 2 movies with {MODERATE_VOTE_THRESHOLD}+ votes"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, f"< {MODERATE_VOTE_THRESHOLD} votes should be filtered"


def test_vote_average_sort_applies_strict_threshold() -> None:
    """Test that vote_average sorts apply STRICT threshold (200 votes).

    Rating sorts without filters need statistical validity - a niche film with
    15 devoted fans rating 9.5 would otherwise top "highest rated" over
    universally loved films. Strict threshold ensures meaningful ratings.

    Note: min_vote_count is computed by param_transformer in production.
    Here we test the filtering behavior directly with explicit threshold.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=["get"])

    tmdb_movies = [
        # Above strict threshold (200 votes) - should pass
        create_tmdb_movie(1, "Universally Loved", "2022-01-01", 8.0, vote_count=5000),
        create_tmdb_movie(2, "Another Classic", "2022-02-01", 8.5, vote_count=200),
        # Below strict threshold (200 votes) - should be filtered
        create_tmdb_movie(101, "Cult Favorite", "2022-04-01", 9.5, vote_count=150),
        create_tmdb_movie(102, "Niche Gem", "2022-05-01", 9.0, vote_count=50),
        create_tmdb_movie(103, "Obscure Film", "2022-06-01", 10.0, vote_count=15),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with strict threshold (as computed by param_transformer for vote_average sorts)
    params = BrowseServiceParams(sort_by="vote_average.desc", min_vote_count=STRICT_VOTE_THRESHOLD)
    result = service.discover_movies(page=1, params=params)

    # Assert: Only movies with 200+ votes returned (strict threshold applied)
    assert len(result.results) == 2, f"Expected 2 movies with {STRICT_VOTE_THRESHOLD}+ votes"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, f"< {STRICT_VOTE_THRESHOLD} votes should be filtered"
    assert all(
        m.vote_count is not None and m.vote_count >= STRICT_VOTE_THRESHOLD for m in result.results
    )


def test_vote_count_bypass_allows_all_movies() -> None:
    """Test that bypassing vote threshold (None) allows all movies through.

    When min_vote_count=None is passed, no vote filtering should occur.
    This is used for endpoints like search, now_playing, upcoming where
    movies may not have accumulated votes yet.

    Note: min_vote_count is computed by VoteCountPolicy in production.
    Here we test the filtering behavior directly with explicit bypass (None).
    """
    # Arrange: Mock client returns movies with various vote counts including very low
    mock_client = Mock(spec=["get"])

    tmdb_movies = [
        create_tmdb_movie(1, "Alpha Movie", "2022-01-01", 8.0, vote_count=100),
        # Would be filtered by moderate threshold
        create_tmdb_movie(2, "Beta Movie", "2022-02-01", 7.0, vote_count=5),
        # Would be filtered by any threshold
        create_tmdb_movie(3, "Gamma Movie", "2022-03-01", 6.0, vote_count=1),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with bypassed threshold (explicit None)
    result = service.discover_movies(
        page=1, params=BrowseServiceParams(sort_by="popularity.desc", min_vote_count=None)
    )

    # Assert: ALL movies returned when threshold is bypassed
    assert len(result.results) == 3, "All movies should pass when threshold bypassed"


def test_vote_count_filter_excludes_movies_without_vote_count() -> None:
    """Test that movies missing vote_count field are excluded when threshold applied."""
    # Arrange: Mock client returns movies with missing vote_count
    mock_client = Mock(spec=["get"])

    movie_with_votes: TMDBMovieBaseRawDict = {
        "id": 1,
        "title": "Has Vote Count",
        "poster_path": "/poster1.jpg",
        "release_date": "2022-01-01",
        "vote_average": 8.0,
        "vote_count": 100,
        "genre_ids": [18, 28],  # Drama, Action
        "overview": "A great movie with vote count data.",
    }
    movie_without_votes: TMDBMovieBaseRawDict = {
        "id": 2,
        "title": "No Vote Count",
        "poster_path": "/poster2.jpg",
        "release_date": "2022-02-01",
        "vote_average": 8.5,
        "genre_ids": [12, 35],  # Adventure, Comedy
        "overview": "A movie without vote count data.",
        # vote_count field missing (TMDB data quality issue)
    }

    tmdb_movies: list[TMDBMovieBaseRawDict] = [
        movie_with_votes,
        movie_without_votes,
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies (moderate threshold applies)
    result = service.discover_movies(page=1)

    # Assert: Only movie with vote_count field returned
    assert len(result.results) == 1
    assert result.results[0].vote_count == 100


def test_moderate_threshold_between_strict_and_bypass() -> None:
    """Test that moderate threshold (3) correctly filters between strict (200) and bypass.

    This verifies the middle tier behavior - movies with 3-199 votes should:
    - PASS moderate threshold (general browsing, rating sorts with filters)
    - FAIL strict threshold (rating sorts without filters)

    Note: min_vote_count is computed by param_transformer in production.
    Here we test the filtering behavior directly with explicit thresholds.
    """
    mock_client = Mock(spec=["get"])

    # Movie with 50 votes - passes moderate (3), fails strict (200)
    tmdb_movies = [
        create_tmdb_movie(1, "Fifty Votes", "2022-01-01", 9.0, vote_count=50),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # General browsing - should PASS (moderate threshold = 3)
    result_general = service.discover_movies(
        page=1, params=BrowseServiceParams(min_vote_count=MODERATE_VOTE_THRESHOLD)
    )
    assert len(result_general.results) == 1, "50 votes should pass moderate threshold"

    # Rating sort without filter - should FAIL (strict threshold = 200)
    params_rating = BrowseServiceParams(
        sort_by="vote_average.desc", min_vote_count=STRICT_VOTE_THRESHOLD
    )
    result_rating = service.discover_movies(page=1, params=params_rating)
    assert len(result_rating.results) == 0, "50 votes should fail strict threshold"
