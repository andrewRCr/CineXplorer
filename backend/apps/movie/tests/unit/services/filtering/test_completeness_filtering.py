"""Unit tests for completeness filtering in TMDB result processing.

Tests the data completeness validation that ensures movies have required fields
for proper display (poster, title, overview). TMDB data quality issues often
result in incomplete movie entries that should be filtered out.
"""

from __future__ import annotations

from unittest.mock import Mock

from apps.core.services.api_response import ApiResponse
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.test_helpers import create_mock_paginated_response
from apps.movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
)


def test_filter_movies_excludes_missing_poster() -> None:
    """Test that movies without poster_path are excluded for display quality."""
    # Arrange: Mock movies with and without posters
    movies_with_data = [
        create_tmdb_movie(1, "Has Poster", "2022-01-01", 7.5),
        create_tmdb_movie(2, "Missing Poster", "2022-01-01", 8.0, poster_path=""),
        create_tmdb_movie(3, "Has Poster 2", "2022-01-01", 7.8),
        create_tmdb_movie(4, "Null Poster", "2022-01-01", 8.2, poster_path=""),
    ]

    mock_client = Mock(spec=["get"])
    mock_response = create_mock_paginated_response(movies_with_data, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only movies with posters returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 3}

    # Verify all returned movies have posters
    for movie in result.results:
        assert movie.poster_path is not None
        assert movie.poster_path != ""


def test_filter_movies_excludes_empty_title() -> None:
    """Test that movies with empty or whitespace-only titles are excluded."""
    # Arrange: Mock movies with various title states
    # Raw payloads deliberately contain incomplete values.

    tmdb_movies: list[dict[str, object]] = [
        create_tmdb_movie(1, "Valid Title", "2022-01-01", 7.5).model_dump(),
        {  # Empty title
            "id": 2,
            "title": "",
            "poster_path": "/poster_2.jpg",
            "release_date": "2022-01-01",
            "vote_average": 8.0,
            "vote_count": 100,
            "runtime": None,
        },
        create_tmdb_movie(3, "Another Valid", "2022-01-01", 7.8).model_dump(),
        {  # Whitespace-only title
            "id": 4,
            "title": "   ",
            "poster_path": "/poster_4.jpg",
            "release_date": "2022-01-01",
            "vote_average": 8.2,
            "vote_count": 100,
            "runtime": None,
        },
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client = Mock(spec=["get"])
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only movies with valid titles returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 3}

    # Verify all returned movies have valid titles
    for movie in result.results:
        assert movie.title is not None
        assert movie.title.strip() != ""


def test_filter_movies_completeness_with_all_valid() -> None:
    """Test that completeness filter doesn't exclude valid movies."""
    # Arrange: All movies have complete data
    movies_with_data = [
        create_tmdb_movie(i, f"Complete Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 21)
    ]

    mock_client = Mock(spec=["get"])
    mock_response = create_mock_paginated_response(movies_with_data, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: All movies returned (none excluded)
    assert len(result.results) == 20


def test_completeness_filter_applies_with_other_filters() -> None:
    """Test that completeness filter works in combination with year/rating filters."""
    # Arrange: Mix of complete/incomplete movies with year/rating variations
    tmdb_movies: list[dict[str, object]] = [
        # Complete, matching all filters
        create_tmdb_movie(1, "Perfect Movie", "2022-01-01", 8.0).model_dump(),
        # Missing poster, matches year/rating (should be excluded)
        create_tmdb_movie(2, "No Poster", "2022-01-01", 8.0, poster_path="").model_dump(),
        # Complete, wrong year (should be excluded)
        create_tmdb_movie(3, "Wrong Year", "2019-01-01", 8.0).model_dump(),
        # Complete, low rating (should be excluded)
        create_tmdb_movie(4, "Low Rating", "2022-01-01", 6.0).model_dump(),
        # Complete, matching all filters
        create_tmdb_movie(5, "Another Perfect", "2022-01-01", 8.5).model_dump(),
        # Empty title, matches year/rating (should be excluded)
        {
            "id": 6,
            "title": "",
            "poster_path": "/poster_6.jpg",
            "release_date": "2022-01-01",
            "vote_average": 8.0,
            "vote_count": 100,
            "runtime": None,
        },
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client = Mock(spec=["get"])
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with year and rating filters
    result = service.discover_movies(
        page=1, params=BrowseServiceParams(year_min=2022, year_max=2022, rating_min=7.5)
    )

    # Assert: Only complete movies matching all filters returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 5}

    # Verify all movies have complete data and match filters
    for movie in result.results:
        assert movie.poster_path is not None
        assert movie.poster_path != ""
        assert movie.title is not None
        assert movie.title.strip() != ""
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


def test_filter_movies_excludes_empty_overview() -> None:
    """Test that movies with empty or whitespace-only overview are excluded.

    TMDB data quality issue: Some movies (especially unreleased or low-quality
    entries) have empty overview fields, providing no description to users.
    These should be filtered out for display quality.
    """
    # Arrange: Mock movies with various overview states
    tmdb_movies: list[dict[str, object]] = [
        # Valid overview - should pass
        create_tmdb_movie(1, "Valid Overview", "2022-01-01", 7.5).model_dump(),
        # Empty overview - should be filtered
        {
            "id": 2,
            "title": "Empty Overview",
            "poster_path": "/poster_2.jpg",
            "release_date": "2022-01-01",
            "vote_average": 8.0,
            "vote_count": 100,
            "overview": "",
            "genre_ids": [18, 28],
        },
        # Whitespace-only overview - should be filtered
        {
            "id": 3,
            "title": "Whitespace Overview",
            "poster_path": "/poster_3.jpg",
            "release_date": "2022-01-01",
            "vote_average": 7.8,
            "vote_count": 100,
            "overview": "   ",
            "genre_ids": [18, 28],
        },
        # Another valid overview - should pass
        create_tmdb_movie(4, "Another Valid", "2022-01-01", 8.2).model_dump(),
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client = Mock(spec=["get"])
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only movies with valid overviews returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 4}

    # Verify all returned movies have non-empty overviews
    for movie in result.results:
        assert movie.overview is not None
        assert movie.overview.strip() != ""


def test_filter_movies_excludes_placeholder_overview() -> None:
    """Test that movies with placeholder overview 'details here' are excluded.

    TMDB data quality issue: Some movies have the literal placeholder text
    'Details Here' (case-insensitive) instead of actual descriptions. Based on
    analysis of 100 upcoming movies, this is the only text placeholder pattern
    TMDB actually uses (empty strings being the majority).
    """
    # Arrange: Mock movies with placeholder and valid overviews
    tmdb_movies: list[dict[str, object]] = [
        # Valid overview - should pass
        create_tmdb_movie(1, "Valid Overview", "2022-01-01", 7.5).model_dump(),
        # Placeholder "Details Here" - should be filtered
        {
            "id": 2,
            "title": "Cat's Hair",
            "poster_path": "/poster_2.jpg",
            "release_date": "2022-01-01",
            "vote_average": 0.0,
            "vote_count": 0,
            "overview": "Details Here",
            "genre_ids": [18, 10749],
        },
        # Lowercase placeholder "details here" - should be filtered (case-insensitive)
        {
            "id": 3,
            "title": "Nympho",
            "poster_path": "/poster_3.jpg",
            "release_date": "2022-01-01",
            "vote_average": 0.0,
            "vote_count": 0,
            "overview": "details here",
            "genre_ids": [18],
        },
        # Mixed case "Details here" - should be filtered (case-insensitive)
        {
            "id": 4,
            "title": "Mixed Case Placeholder",
            "poster_path": "/poster_4.jpg",
            "release_date": "2022-01-01",
            "vote_average": 7.8,
            "vote_count": 100,
            "overview": "Details here",
            "genre_ids": [28],
        },
        # Another valid overview - should pass
        create_tmdb_movie(5, "Another Valid", "2022-01-01", 8.2).model_dump(),
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client = Mock(spec=["get"])
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only movies with real overviews returned (placeholders filtered)
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 5}

    # Verify no placeholder overviews in results
    for movie in result.results:
        assert movie.overview is not None
        assert movie.overview.strip().lower() != "details here"


def test_overview_filter_works_with_other_completeness_checks() -> None:
    """Test that overview filtering works alongside poster/title/genre checks.

    Overview check is part of completeness filtering (like poster/title/genre checks).
    All completeness filters should work together consistently.
    """
    # Arrange: Mix of complete/incomplete movies with various issues
    mock_client = Mock(spec=["get"])

    tmdb_movies: list[dict[str, object]] = [
        # Complete movie (has poster, title, genres, overview) - should pass
        create_tmdb_movie(1, "Complete Movie", "2022-01-01", 7.5, vote_count=100).model_dump(),
        # Missing poster - should be filtered
        create_tmdb_movie(
            2, "No Poster", "2022-01-01", 8.0, vote_count=150, poster_path=""
        ).model_dump(),
        # Empty overview - should be filtered
        {
            "id": 3,
            "title": "No Overview",
            "poster_path": "/poster_3.jpg",
            "release_date": "2022-01-01",
            "vote_average": 6.5,
            "vote_count": 75,
            "overview": "",
            "genre_ids": [18, 28],
        },
        # Placeholder overview - should be filtered
        {
            "id": 4,
            "title": "Placeholder Overview",
            "poster_path": "/poster_4.jpg",
            "release_date": "2022-01-01",
            "vote_average": 7.0,
            "vote_count": 200,
            "overview": "Details Here",
            "genre_ids": [18],
        },
        # Missing genres - should be filtered
        create_tmdb_movie(
            5, "No Genres", "2022-01-01", 8.0, vote_count=100, genre_ids=[]
        ).model_dump(),
        # Another complete movie - should pass
        create_tmdb_movie(6, "Another Complete", "2022-01-01", 7.8, vote_count=120).model_dump(),
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only complete movies returned (all completeness checks applied)
    assert len(result.results) == 2, "Expected 2 complete movies"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 6}, "Incomplete movies should be filtered"

    # Verify all returned movies have complete data
    for movie in result.results:
        assert movie.poster_path is not None
        assert movie.poster_path != ""
        assert movie.title is not None
        assert movie.title.strip() != ""
        assert hasattr(movie, "genre_ids")
        assert len(movie.genre_ids) > 0
        assert movie.overview is not None
        assert movie.overview.strip() != ""
        assert movie.overview.strip().lower() != "details here"
