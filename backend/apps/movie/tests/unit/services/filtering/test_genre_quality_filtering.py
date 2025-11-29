"""
Unit tests for genre quality filtering in TMDB result processing.

Tests the genre completeness validation that ensures movies have at least one
genre assigned. Empty genres are a strong signal of data quality problems.
"""
from __future__ import annotations

from unittest.mock import Mock

from movie.services.movie_service import MovieService
from movie.services.tmdb_query_params import ServiceParams
from movie.tests.test_helpers import create_mock_paginated_response
from movie.tests.tmdb_test_builders import create_tmdb_movie


def test_genre_filter_excludes_movies_with_empty_genres() -> None:
    """Test that movies with empty genre_ids are ALWAYS filtered (completeness check).

    TMDB data quality issue: Some movies (especially misclassified or low-quality
    entries) have empty genre lists. Empty genres is a strong signal of data quality
    problems and should be filtered out just like movies with missing posters.

    This is part of the completeness filter that ALWAYS applies (not conditional
    on rating filters).
    """
    # Arrange: Mock client returns movies with and without genres
    mock_client = Mock(spec=['get'])

    # TMDB returns mix of complete movies and incomplete (no genres) entries
    tmdb_movies = [
        # Complete movies WITH genres (should pass)
        create_tmdb_movie(1, "Complete Movie A", "2020-01-01", 7.5, vote_count=100),
        create_tmdb_movie(2, "Complete Movie B", "2021-01-01", 8.0, vote_count=150),
        create_tmdb_movie(3, "Complete Movie C", "2022-01-01", 6.5, vote_count=75),
        # Incomplete entries WITHOUT genres (should be filtered like missing posters)
        create_tmdb_movie(
            101, "No Genres Entry A", "2020-01-01", 7.0, vote_count=100, genre_ids=[]
        ),
        create_tmdb_movie(
            102, "No Genres Entry B", "2021-01-01", 8.5, vote_count=200, genre_ids=[]
        ),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies WITHOUT rating filter (completeness check still applies)
    result = service.discover_movies(page=1)

    # Assert: Only movies with genres returned (incomplete entries excluded)
    # Note: This test will FAIL initially (TDD Red phase) since genre filtering
    # is not implemented yet in completeness filter
    assert len(result.results) == 3, "Expected 3 complete movies with genres"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2, 3}, "Movies without genres should be filtered out"

    # Verify all returned movies have genres
    for movie in result.results:
        assert hasattr(movie, 'genre_ids'), "MovieBaseSchema should have genre_ids field"
        assert isinstance(movie.genre_ids, list), "genre_ids should be a list"
        assert len(movie.genre_ids) > 0, "Movies should have at least one genre"


def test_genre_filter_works_with_completeness_checks() -> None:
    """Test that genre filtering works alongside other completeness checks.

    Genre check is part of completeness filtering (like poster/title checks).
    All completeness filters should work together consistently.
    """
    # Arrange: Mix of complete/incomplete movies with various issues
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Complete movie (has poster, title, genres)
        create_tmdb_movie(1, "Complete Movie", "2022-01-01", 7.5, vote_count=100),
        # Missing poster (should be filtered)
        create_tmdb_movie(2, "No Poster", "2022-01-01", 8.0, vote_count=150, poster_path=''),
        # Missing genres (should be filtered)
        create_tmdb_movie(3, "No Genres", "2022-01-01", 6.5, vote_count=75, genre_ids=[]),
        # Another complete movie
        create_tmdb_movie(4, "Another Complete", "2022-01-01", 7.0, vote_count=200),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only complete movies returned (both poster and genre checks applied)
    assert len(result.results) == 2, "Expected 2 complete movies"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 4}, "Incomplete movies should be filtered"


def test_combined_genre_and_vote_filters_with_rating_filter() -> None:
    """Test that completeness (genre) and vote count filters both apply with rating filter.

    Dual quality approach:
    - Genre completeness filter: ALWAYS applies (like poster/title checks)
    - Vote count threshold: Universal 10-vote minimum for data quality

    When rating filter is active, both should apply together.
    """
    # Arrange: Mock client returns movies with various genre/vote combinations
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Pass both filters (has genres + 5+ votes)
        create_tmdb_movie(1, "Good Quality A", "2020-01-01", 2.0, vote_count=10),
        create_tmdb_movie(2, "Good Quality B", "2021-01-01", 1.5, vote_count=62),
        # Fail completeness filter (no genres) - filtered by completeness check
        create_tmdb_movie(101, "No Genres", "2020-01-01", 2.5, vote_count=50, genre_ids=[]),
        # Fail vote filter (has genres but < 5 votes) - filtered by vote threshold
        create_tmdb_movie(102, "Low Votes", "2021-01-01", 1.8, vote_count=3),
        # Fail both (no genres + < 5 votes)
        create_tmdb_movie(103, "Fail Both", "2022-01-01", 2.2, vote_count=1, genre_ids=[]),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with rating filter (triggers 5-vote threshold + completeness check)
    result = service.discover_movies(page=1, params=ServiceParams(rating_min=1.0, rating_max=3.5))

    # Assert: Only movies passing BOTH filters returned
    assert len(result.results) == 2, "Expected 2 movies passing both filters"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, "Movies failing either filter should be excluded"

    # Verify all returned movies pass both filters
    for movie in result.results:
        assert hasattr(movie, 'genre_ids') and len(movie.genre_ids) > 0
        assert movie.vote_count is not None and movie.vote_count >= 5
