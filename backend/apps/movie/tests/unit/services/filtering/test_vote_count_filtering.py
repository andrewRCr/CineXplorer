"""
Unit tests for vote count quality filtering in TMDB result processing.

Tests the vote count threshold logic that ensures rating reliability
by filtering out movies with too few votes (statistical noise).
"""
from __future__ import annotations

from unittest.mock import Mock

from core.services.api_response import ApiResponse
from movie.services.movie_service import MovieService
from movie.services.tmdb_api_boundary.query_params import ServiceParams
from movie.tests.test_helpers import create_mock_paginated_response
from movie.tests.tmdb_test_builders import (
    TMDBMovieBaseRawDict,
    create_paginated_tmdb_response,
    create_tmdb_movie,
)


def test_rating_filter_excludes_low_vote_count_movies() -> None:
    """Test that movies with low vote counts are excluded when rating filter applied.

    Universal 10-vote threshold applies to all scenarios (general browsing and rating filters).
    This filters statistical noise and low-quality content while maintaining broad catalog access.

    When users filter by rating, movies with very few votes are unreliable
    (e.g., a single 10/10 vote makes average 10.0). We exclude movies with
    fewer than 10 votes to ensure rating quality.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Movies with 10+ votes (should pass)
        create_tmdb_movie(1, "Reliable High Rating", "2022-01-01", 8.0, vote_count=100),
        create_tmdb_movie(2, "Another Reliable", "2022-02-01", 8.5, vote_count=500),
        # Movies with < 10 votes (should be filtered)
        create_tmdb_movie(101, "Noise Entry 1", "2022-04-01", 9.5, vote_count=9),
        create_tmdb_movie(102, "Noise Entry 2", "2022-05-01", 8.0, vote_count=5),
        create_tmdb_movie(103, "Noise Entry 3", "2022-06-01", 9.0, vote_count=1),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+ (universal 10-vote threshold applies)
    result = service.discover_movies(page=1, params=ServiceParams(rating_min=7.5))

    # Assert: Only movies with 10+ votes returned (noise entries excluded)
    assert len(result.results) == 2, "Expected 2 movies with 10+ votes"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, "Movies with < 10 votes should be filtered"
    assert all(m.vote_count is not None and m.vote_count >= 10 for m in result.results)


def test_general_browsing_applies_higher_vote_threshold() -> None:
    """Test that general browsing applies universal 10 vote threshold.

    When no rating filter is specified, general browsing uses the universal
    10 vote threshold to maintain catalog quality by filtering statistical noise
    and low-quality content.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Above general threshold (10 votes) - should pass
        create_tmdb_movie(1, "Above General Threshold", "2022-01-01", 8.0, vote_count=15),
        create_tmdb_movie(2, "Well Above", "2022-02-01", 7.0, vote_count=100),
        # Below general threshold (10 votes) - should be filtered
        create_tmdb_movie(101, "Below General", "2022-03-01", 8.5, vote_count=9),
        create_tmdb_movie(102, "Very Low", "2022-04-01", 7.5, vote_count=5),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without rating filter (uses 10 vote general threshold)
    result = service.discover_movies(page=1)

    # Assert: Only movies with 10+ votes returned (general threshold applied)
    assert len(result.results) == 2, "Expected 2 movies with 10+ votes"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, "Movies with < 10 votes should be filtered"


def test_vote_count_filter_excludes_movies_without_vote_count() -> None:
    """Test that movies missing vote_count field are excluded when rating filter applied."""
    # Arrange: Mock client returns movies with missing vote_count
    mock_client = Mock(spec=['get'])

    movie_with_votes: TMDBMovieBaseRawDict = {
        'id': 1, 'title': "Has Vote Count", 'poster_path': '/poster1.jpg',
        'release_date': "2022-01-01", 'vote_average': 8.0, 'vote_count': 100,
        'genre_ids': [18, 28],  # Drama, Action
        'overview': 'A great movie with vote count data.'
    }
    movie_without_votes: TMDBMovieBaseRawDict = {
        'id': 2, 'title': "No Vote Count", 'poster_path': '/poster2.jpg',
        'release_date': "2022-02-01", 'vote_average': 8.5,
        'genre_ids': [12, 35],  # Adventure, Comedy
        'overview': 'A movie without vote count data.',
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

    # Act: Request movies rated 7.5+
    result = service.discover_movies(page=1, params=ServiceParams(rating_min=7.5))

    # Assert: Only movie with vote_count field returned
    assert len(result.results) == 1
    assert result.results[0].vote_count == 100
