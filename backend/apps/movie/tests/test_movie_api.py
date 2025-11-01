"""
Integration tests for the movie API endpoints.

These tests verify the behavior of the movie API, which relies on external
calls to the The Movie Database (TMDB) API. The external calls are mocked
to ensure tests are fast, reliable, and independent of the external service.

Converted to pytest style with parametrization to reduce code duplication.
"""
from typing import TypedDict, Unpack, cast
from unittest.mock import Mock, patch

import pytest
from core.models import Movie
from core.services.api_response import ApiResponse
from core.tests.test_helpers import HTTPStatus
from core.types.api_types import TMDBResponseData
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client
from movie.tests.test_fixtures_tmdb import create_movie_dict, create_paginated_tmdb_response
from user_movie_data.models import UserMovieData

# HTTP status codes for Django Ninja endpoints
HTTP_200_OK = HTTPStatus.OK
HTTP_400_BAD_REQUEST = HTTPStatus.BAD_REQUEST
HTTP_404_NOT_FOUND = HTTPStatus.NOT_FOUND
HTTP_422_UNPROCESSABLE_ENTITY = HTTPStatus.UNPROCESSABLE_ENTITY

# =========================
# Django Ninja API URLs
# =========================
NOW_PLAYING_URL = '/api/movies/now-playing'
UPCOMING_URL = '/api/movies/upcoming'
SEARCH_URL = '/api/movies/search'
BROWSE_URL = '/api/movies/browse'


def movie_detail_url(tmdb_id: int) -> str:
    """Return the detail URL for a movie by TMDB ID."""
    return f'/api/movies/{tmdb_id}'


# =========================
# Test Setup Helper Methods
# =========================


class MovieParams(TypedDict, total=False):
    """Type for movie creation parameters."""
    title: str
    poster_path: str | None
    release_date: str | None


def create_movie_stub(tmdb_id: int, **params: Unpack[MovieParams]) -> Movie:
    """
    Create and return a new Movie stub object.
    This mimics the behavior of the service layer, which creates a local stub
    for a movie fetched from the TMDB API.
    """
    # tmdb_id is required parameter
    defaults: dict[str, object] = {
        'title': 'Default Movie Title',
        'poster_path': '/default.jpg',
        'release_date': '2025-01-01',
    }
    defaults.update(params)
    return Movie.objects.create(tmdb_id=tmdb_id, **defaults)


# =========================
# Paginated Endpoint Tests (Parametrized)
# =========================


@pytest.mark.django_db
@pytest.mark.parametrize('mock_path,url,params', [
    (
        'core.services.tmdb_api_client.TMDBApiClient.get',  # Now uses browse endpoint
        NOW_PLAYING_URL,
        {'page': 1}
    ),
    (
        'core.services.tmdb_api_client.TMDBApiClient.get',
        UPCOMING_URL,
        {'page': 1}
    ),
    (
        'core.services.tmdb_api_client.TMDBApiClient.get',  # Now uses browse endpoint
        SEARCH_URL,
        {'query': 'test'}
    ),
    (
        'core.services.tmdb_api_client.TMDBApiClient.get',
        BROWSE_URL,
        {'page': 1}
    ),
], ids=['now_playing', 'upcoming', 'search', 'browse'])
def test_paginated_endpoint_contract(
    api_client: Client,
    mock_path: str,
    url: str,
    params: dict[str, str | int]
) -> None:
    """
    Test that paginated movie endpoints return the correct response structure.

    Parametrized to test: now-playing, upcoming, search, and browse endpoints.
    All should return paginated results with the same structure, including:
    - Pagination metadata (page, total_pages, results count)
    - Individual movie fields (tmdb_id, title, poster_path, release_date)
    - Pass-through fields from TMDB (vote_average, etc.)

    This test consolidates coverage from both test_movie_api.py and
    the legacy test_paginated_views.py.
    """
    # Arrange: Define a standard mock TMDB API response
    movies = [create_movie_dict(101, 'Test Movie', '2023-01-01', 8.0, poster_path='/test.jpg')]
    tmdb_payload: TMDBResponseData = cast(
        TMDBResponseData,
        create_paginated_tmdb_response(movies, page=1, total_pages=1)
    )
    mock_api_response = ApiResponse(
        status_code=200,
        data=tmdb_payload  # type: ignore[arg-type]
    )

    # Act: Mock TMDB method and call the API endpoint
    with patch(mock_path, return_value=mock_api_response):
        res = api_client.get(url, params)

    # Assert: Check the response status and overall structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert 'results' in data
    assert 'page' in data
    assert 'total_pages' in data
    assert data['page'] == 1
    assert data['total_pages'] == 1  # Single page result
    assert len(data['results']) == 1

    # Assert: Check the structure and content of individual movie data
    first_movie = data['results'][0]
    assert first_movie['tmdb_id'] == 101
    assert first_movie['title'] == 'Test Movie'
    assert 'poster_path' in first_movie
    assert first_movie['poster_path'] == '/test.jpg'
    assert 'release_date' in first_movie
    assert first_movie['release_date'] == '2023-01-01'
    # Verify pass-through fields from TMDB are included
    assert 'vote_average' in first_movie
    assert first_movie['vote_average'] == 8.0


# =========================
# Browse Endpoint Tests
# =========================


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_with_filters(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test the browse endpoint with various filter parameters."""
    # Arrange: Define a standard mock TMDB API response
    movies = [create_movie_dict(101, 'Test Movie', '2023-01-01', 8.0)]
    tmdb_payload: TMDBResponseData = cast(
        TMDBResponseData,
        create_paginated_tmdb_response(movies, page=1, total_pages=1)
    )
    mock_api_response = ApiResponse(
        status_code=200,
        data=tmdb_payload  # type: ignore[arg-type]
    )
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the browse endpoint with filters
    filters: dict[str, str | int | float] = {
        'sort_by': 'release_date.desc',
        'genres': '28,12',  # Action, Adventure
        'year': 2023,
        'vote_average_gte': 7.0,
        'vote_average_lte': 10.0,
        'release_date_gte': '2023-01-01',
        'release_date_lte': '2023-12-31',
        'runtime_gte': 90,
        'runtime_lte': 180,
        'certification': 'PG-13'
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Check the response status and structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert 'results' in data
    assert 'page' in data
    assert 'total_pages' in data

    # Verify that the mock was called with correct parameters
    mock_tmdb_get.assert_called_once()
    call_args = mock_tmdb_get.call_args

    # Verify the endpoint path and parameters passed to TMDB client
    endpoint = call_args[0][0]  # First positional argument is the endpoint
    # Parameters
    params = (
        call_args[0][1] if len(call_args[0]) > 1 else
        call_args[1].get('params', {})
    )

    # Check that the correct TMDB endpoint is called
    assert endpoint == "discover/movie"

    # Check critical parameter mappings from API to TMDB format
    assert params['sort_by'] == 'release_date.desc'
    assert params['with_genres'] == '28,12'
    assert params['year'] == 2023
    assert params['vote_average.gte'] == 7.0
    assert params['vote_average.lte'] == 10.0
    assert params['primary_release_date.gte'] == '2023-01-01'
    assert params['primary_release_date.lte'] == '2023-12-31'
    # Runtime filtering is disabled due to TMDB API data quality issues
    # assert 'with_runtime.gte' not in params
    # assert 'with_runtime.lte' not in params
    assert params['certification'] == 'PG-13'


@pytest.mark.django_db
@pytest.mark.parametrize('invalid_param,invalid_value', [
    ('year', 'invalid'),
    ('vote_average_gte', 'invalid'),
    ('with_runtime_gte', 'invalid'),
], ids=['invalid_year', 'invalid_vote_average_gte', 'invalid_runtime_gte'])
def test_browse_invalid_parameters(
    api_client: Client,
    invalid_param: str,
    invalid_value: str
) -> None:
    """
    Test the browse endpoint with invalid parameter values.

    Parametrized to test various Pydantic validation errors.
    All should return 422 status with error details.
    """
    # Act: Send request with invalid parameter
    res = api_client.get(BROWSE_URL, {invalid_param: invalid_value})

    # Assert: Check validation error response
    assert res.status_code == HTTP_422_UNPROCESSABLE_ENTITY
    data = res.json()
    assert 'detail' in data  # Django Ninja uses 'detail' for errors


# =========================
# Genres, Keywords, People Endpoint Tests
# =========================


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_get_movie_genres(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test retrieving the list of available movie genres from TMDB."""
    # Arrange: Mock TMDB genres response
    genres_data = {
        'genres': [
            {'id': 28, 'name': 'Action'},
            {'id': 12, 'name': 'Adventure'},
            {'id': 16, 'name': 'Animation'}
        ]
    }
    mock_api_response = ApiResponse(status_code=200, data=genres_data)
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the genres endpoint
    res = api_client.get('/api/genres')

    # Assert: Check response structure
    assert res.status_code == HTTP_200_OK
    data: list[dict[str, object]] = res.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert data[0]['id'] == 28
    assert data[0]['name'] == 'Action'


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_get_popular_keywords(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test retrieving popular keywords with pagination."""
    # Arrange: Mock TMDB keywords response
    keywords_data: TMDBResponseData = {
        'results': [
            {'id': 1, 'name': 'superhero'},
            {'id': 2, 'name': 'based on novel'}
        ],
        'page': 1,
        'total_pages': 10,
        'total_results': 100
    }
    mock_api_response = ApiResponse(status_code=200, data=keywords_data)  # type: ignore[arg-type]
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the popular keywords endpoint
    res = api_client.get('/api/keywords', {'page': 1})

    # Assert: Check response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert 'results' in data
    assert 'page' in data
    assert data['page'] == 1
    assert len(data['results']) == 2


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_search_keywords(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test searching for keywords by query string."""
    # Arrange: Mock TMDB search keywords response
    keywords_data: TMDBResponseData = {
        'results': [
            {'id': 5, 'name': 'superhero movie'}
        ],
        'page': 1,
        'total_pages': 1,
        'total_results': 1
    }
    mock_api_response = ApiResponse(status_code=200, data=keywords_data)  # type: ignore[arg-type]
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the search keywords endpoint
    res = api_client.get('/api/keywords/search', {'query': 'superhero'})

    # Assert: Check response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert 'results' in data
    assert len(data['results']) == 1
    assert data['results'][0]['name'] == 'superhero movie'


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_get_popular_people(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test retrieving popular people (actors, directors, etc.) with pagination."""
    # Arrange: Mock TMDB people response
    people_data: TMDBResponseData = {
        'results': [
            {'id': 1, 'name': 'Tom Hanks', 'known_for_department': 'Acting'},
            {'id': 2, 'name': 'Steven Spielberg', 'known_for_department': 'Directing'}
        ],
        'page': 1,
        'total_pages': 20,
        'total_results': 200
    }
    mock_api_response = ApiResponse(status_code=200, data=people_data)  # type: ignore[arg-type]
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the popular people endpoint
    res = api_client.get('/api/people', {'page': 1})

    # Assert: Check response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert 'results' in data
    assert 'page' in data
    assert data['page'] == 1
    assert len(data['results']) == 2


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_search_people(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test searching for people by query string."""
    # Arrange: Mock TMDB search people response
    people_data: TMDBResponseData = {
        'results': [
            {'id': 31, 'name': 'Tom Cruise', 'known_for_department': 'Acting'}
        ],
        'page': 1,
        'total_pages': 1,
        'total_results': 1
    }
    mock_api_response = ApiResponse(status_code=200, data=people_data)  # type: ignore[arg-type]
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the search people endpoint
    res = api_client.get('/api/people/search', {'query': 'Tom Cruise'})

    # Assert: Check response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert 'results' in data
    assert len(data['results']) == 1
    assert data['results'][0]['name'] == 'Tom Cruise'


# =========================
# Movie Detail Endpoint Tests
# =========================


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
@patch('core.services.tmdb_api_client.TMDBApiClient.get_movie_details')
def test_get_movie_detail_authenticated(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    api_client: Client,
    user: object
) -> None:
    """
    Test retrieving movie details with user_movie_data for an authenticated user.
    """
    # Arrange: Create the local movie stub and user data
    movie_stub = create_movie_stub(78, title='Blade Runner')
    UserMovieData.objects.create(
        user=user,  # type: ignore[arg-type]
        movie=movie_stub,
        user_rating=9,
        user_review='Great movie!'
    )

    # Arrange: Mock the TMDB client API responses for movie info and credits
    mock_info_response = ApiResponse(
        status_code=200,
        data={
            'id': 78, 'title': 'Blade Runner', 'overview': 'A classic.',
            'poster_path': '/br.jpg', 'release_date': '1982-06-25',
            'vote_average': 8.1, 'genres': [], 'production_companies': [], 'vote_count': 100
        }
    )

    mock_credits_response = ApiResponse(
        status_code=200,
        data={'crew': [], 'cast': []}
    )

    # Set up the mock returns for each TMDB client method
    mock_get_movie_details.return_value = mock_info_response
    mock_tmdb_get.return_value = mock_credits_response

    # Act
    api_client.force_login(cast(AbstractBaseUser, user))
    url = movie_detail_url(movie_stub.tmdb_id)
    res = api_client.get(url)

    # Assert
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data['tmdb_id'] == movie_stub.tmdb_id
    assert 'title' in data
    assert 'user_movie_data' in data
    user_data = data['user_movie_data']
    # User integration now implemented (Task 7 - OAuth headless migration)
    # Movie detail endpoint enriches response with user-specific data
    assert user_data is not None
    assert user_data['user_rating'] == 9
    assert user_data['user_review'] == 'Great movie!'


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
@patch('core.services.tmdb_api_client.TMDBApiClient.get_movie_details')
def test_get_movie_detail_unauthenticated(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """
    Test retrieving movie details without user_movie_data for an unauthenticated user.
    """
    # Arrange
    tmdb_id = 78
    create_movie_stub(tmdb_id, title='Blade Runner')

    mock_info_response = ApiResponse(
        status_code=200,
        data={
            'id': tmdb_id, 'title': 'Blade Runner', 'overview': 'A classic.',
            'poster_path': '/br.jpg', 'release_date': '1982-06-25',
            'vote_average': 8.1, 'genres': [], 'production_companies': [], 'vote_count': 100
        }
    )
    mock_credits_response = ApiResponse(
        status_code=200,
        data={'crew': [], 'cast': []}
    )
    mock_get_movie_details.return_value = mock_info_response
    mock_tmdb_get.return_value = mock_credits_response

    # Act
    url = movie_detail_url(tmdb_id)
    res = api_client.get(url)

    # Assert
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data['tmdb_id'] == tmdb_id
    assert 'user_movie_data' in data
    assert data['user_movie_data'] is None


# =========================
# Filter Integration Tests
# =========================
# These tests validate the complete filter parameter flow from API → Schema → Service
# Critical for two-pass filtering architecture (TMDB API + backend data hygiene)


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_api_extracts_backend_filter_params(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test browse API extracts year_min/max and rating_min/max for backend filtering.

    This integration test validates the critical missing functionality:
    1. API receives release_date_gte/lte and vote_average_gte/lte
    2. Schema extracts these into backend filtering parameters
    3. Service receives year_min/max, rating_min/max for data hygiene

    This test will FAIL initially because schema.to_service_params() doesn't
    extract backend filtering parameters. This demonstrates the bug.
    """
    # Arrange: Mock TMDB to return movies with some bad data
    movies = [
        create_movie_dict(1, '2022 Movie (Good)', '2022-01-01', 8.0),
        # Should be filtered out by backend filtering
        create_movie_dict(2, '2019 Movie (Bad - Outside Range)', '2019-01-01', 8.0),
    ]
    tmdb_payload: TMDBResponseData = cast(
        TMDBResponseData,
        create_paginated_tmdb_response(movies, page=1, total_pages=1)
    )
    mock_api_response = ApiResponse(
        status_code=200,
        data=tmdb_payload  # type: ignore[arg-type]
    )
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call API with year range filter
    filters: dict[str, str | int | float] = {
        'release_date_gte': '2020-01-01',
        'release_date_lte': '2029-12-31',
        'vote_average_gte': 7.0
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Response successful
    assert res.status_code == HTTP_200_OK
    data = res.json()

    # CRITICAL: Backend filtering should remove the 2019 movie
    # This will FAIL because backend filtering never activates (params not extracted)
    assert len(data['results']) == 1, (
        "Backend filtering should remove movies outside year range. "
        "Expected 1 movie (2022), got {} movies. "
        "This failure demonstrates the bug: schema doesn't extract year_min/max."
    ).format(len(data['results']))

    # Verify only the 2022 movie is in results
    returned_ids = {movie['tmdb_id'] for movie in data['results']}
    assert 1 in returned_ids, "2022 movie should be in results"
    assert 2 not in returned_ids, (
        "2019 movie should be filtered out by backend filtering. "
        "Bug: year_min/max not extracted from release_date params"
    )


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_api_filters_bad_ratings_from_tmdb(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test browse API backend filtering removes movies with bad ratings.

    TMDB sometimes returns movies with placeholder 0.0 ratings or ratings
    outside the requested range. Backend filtering should catch these.
    """
    # Arrange: Mock TMDB to return movies with placeholder ratings
    movies = [
        create_movie_dict(1, 'Good Rating Movie', '2022-01-01', 8.0),  # Good
        create_movie_dict(2, 'Placeholder Rating Movie', '2022-01-01', 0.0),  # Bad - placeholder
        create_movie_dict(3, 'Low Rating Movie', '2022-01-01', 6.5),  # Bad - below threshold
    ]
    tmdb_payload: TMDBResponseData = cast(
        TMDBResponseData,
        create_paginated_tmdb_response(movies, page=1, total_pages=1)
    )
    mock_api_response = ApiResponse(
        status_code=200,
        data=tmdb_payload  # type: ignore[arg-type]
    )
    mock_tmdb_get.return_value = mock_api_response

    # Act: Request movies rated 7.5+
    filters: dict[str, str | int | float] = {
        'vote_average_gte': 7.5
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Only high-rated movie returned
    assert res.status_code == HTTP_200_OK
    data = res.json()

    # CRITICAL: Backend filtering should remove placeholder and low-rated movies
    # This will FAIL because rating_min not extracted from vote_average_gte
    assert len(data['results']) == 1, (
        "Backend filtering should remove movies with rating < 7.5. "
        "Expected 1 movie, got {} movies. "
        "Bug: rating_min not extracted from vote_average_gte"
    ).format(len(data['results']))

    returned_ids = {movie['tmdb_id'] for movie in data['results']}
    assert 1 in returned_ids, "Good rating movie should be in results"
    assert 2 not in returned_ids, "Placeholder rating (0.0) should be filtered"
    assert 3 not in returned_ids, "Low rating (6.5) should be filtered"


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_api_buffer_mechanism_with_filtering(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test buffer mechanism still works correctly with backend filtering enabled.

    When page 1 has < 20 valid movies after filtering, the buffer mechanism
    should fetch page 2 AND apply the same filters to buffer movies.

    Critical: Buffer movies must also pass backend filtering (no leakage).
    """
    # Arrange: Page 1 has 15 valid + 5 invalid, page 2 has 10 valid
    page_1_movies = [
        # 15 valid movies (2020-2029, rating 7.5+)
        *[
            {
                'id': i,
                'title': f'Valid Movie {i}',
                'poster_path': f'/test{i}.jpg',
                'release_date': '2022-01-01',
                'vote_average': 8.0, 'vote_count': 100,
                'genre_ids': [28, 12]  # Required for backend filtering
            }
            for i in range(1, 16)
        ],
        # 5 invalid movies (wrong year or rating)
        {
            'id': 101,
            'title': 'Wrong Year 2019',
            'poster_path': '/bad1.jpg',
            'release_date': '2019-01-01',  # Outside range
            'vote_average': 8.0, 'vote_count': 100,
            'genre_ids': [28, 12]
        },
        {
            'id': 102,
            'title': 'Low Rating',
            'poster_path': '/bad2.jpg',
            'release_date': '2022-01-01',
            'vote_average': 6.0,  # Below threshold
            'genre_ids': [28, 12]
        },
        {
            'id': 103,
            'title': 'Wrong Year 2030',
            'poster_path': '/bad3.jpg',
            'release_date': '2030-01-01',  # Outside range
            'vote_average': 8.0, 'vote_count': 100,
            'genre_ids': [28, 12]
        },
        {
            'id': 104,
            'title': 'Placeholder Rating',
            'poster_path': '/bad4.jpg',
            'release_date': '2022-01-01',
            'vote_average': 0.0,  # Placeholder
            'genre_ids': [28, 12]
        },
        {
            'id': 105,
            'title': 'Wrong Year 2018',
            'poster_path': '/bad5.jpg',
            'release_date': '2018-01-01',  # Outside range
            'vote_average': 8.0, 'vote_count': 100,
            'genre_ids': [28, 12]
        },
    ]

    page_2_movies = [
        # 10 valid movies for buffer
        *[
            {
                'id': 20 + i,
                'title': f'Buffer Movie {i}',
                'poster_path': f'/buffer{i}.jpg',
                'release_date': '2023-01-01',
                'vote_average': 7.8, 'vote_count': 100,
                'genre_ids': [28, 12]  # Required for backend filtering
            }
            for i in range(1, 11)
        ],
    ]

    page_1_response = ApiResponse(
        status_code=200,
        data=cast(TMDBResponseData, {
            'results': page_1_movies,
            'page': 1,
            'total_pages': 5,
            'total_results': 80
        })
    )

    page_2_response = ApiResponse(
        status_code=200,
        data=cast(TMDBResponseData, {
            'results': page_2_movies,
            'page': 2,
            'total_pages': 5,
            'total_results': 80
        })
    )

    # Mock returns page 1, then page 2 when buffer is triggered
    mock_tmdb_get.side_effect = [page_1_response, page_2_response]

    # Act: Request filtered movies
    filters: dict[str, str | int | float] = {
        'release_date_gte': '2020-01-01',
        'release_date_lte': '2029-12-31',
        'vote_average_gte': 7.5
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Buffer mechanism activated (2 TMDB calls)
    assert mock_tmdb_get.call_count == 2, (
        "Buffer mechanism should fetch page 2 when filtered results < 20"
    )

    assert res.status_code == HTTP_200_OK
    data = res.json()

    # CRITICAL: Result should have 20 movies (15 from page 1 + 5 from page 2)
    # Invalid movies should NOT leak into results
    # This will FAIL because backend filtering not active
    assert len(data['results']) == 20, (
        "Buffer should fetch page 2 to reach 20 results. "
        "Expected 20 valid movies, got {}. "
        "Bug: Backend filtering not active → buffer doesn't filter properly"
    ).format(len(data['results']))

    returned_ids = {movie['tmdb_id'] for movie in data['results']}

    # Verify invalid movies NOT in results
    invalid_ids = {101, 102, 103, 104, 105}
    assert invalid_ids.isdisjoint(returned_ids), (
        "Invalid movies should be filtered out. "
        "Bug: Backend filtering not working"
    )

    # Verify buffer movies ARE in results
    buffer_ids = set(range(21, 26))  # First 5 buffer movies
    assert buffer_ids.issubset(returned_ids), (
        "Buffer movies should be included to reach 20 results"
    )


# =========================
# Pagination Metadata Tracking Tests (Smart Buffer)
# =========================


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_returns_next_tmdb_page_start_after_buffer(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test that API returns next_tmdb_page_start metadata when buffer consumes multiple pages.

    When buffer mechanism fetches multiple TMDB pages (e.g., pages 1-4) to fill
    a single API response, the API should return next_tmdb_page_start=5 to tell
    the client where pagination should continue.

    This prevents duplicates when client requests next API page.
    """
    # Arrange: Create scenario where page 1 needs buffering (sparse results)
    # Page 1: 11 valid movies (triggers buffer)
    page_1_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(1, 12)
    ]

    # Pages 2-4: Fill buffer to reach 20 results (3 pages, 3 movies each = 9 more)
    page_2_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(12, 15)
    ]
    page_3_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(15, 18)
    ]
    page_4_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(18, 21)
    ]

    # Mock TMDB responses
    mock_tmdb_get.side_effect = [
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_1_movies, page=1, total_pages=10, total_results=200
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_2_movies, page=2, total_pages=10, total_results=200
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_3_movies, page=3, total_pages=10, total_results=200
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_4_movies, page=4, total_pages=10, total_results=200
        ))),
    ]

    # Act: Request browse with filters that trigger sparse results
    filters: dict[str, str | float] = {
        'vote_average_gte': 7.5
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Response includes next_tmdb_page_start metadata
    assert res.status_code == HTTP_200_OK
    data = res.json()

    # Buffer fetched pages 1-4, so next request should start at page 5
    assert 'next_tmdb_page_start' in data, (
        "Response must include next_tmdb_page_start metadata"
    )
    assert data['next_tmdb_page_start'] == 5, (
        f"After consuming TMDB pages 1-4, next start should be 5, "
        f"got {data.get('next_tmdb_page_start')}"
    )

    # Should have exactly 20 results (11 from page 1 + 9 from pages 2-4)
    assert len(data['results']) == 20, (
        f"Expected 20 results after buffering, got {len(data['results'])}"
    )


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_continues_from_tmdb_page_start_parameter(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test that tmdb_page_start parameter correctly continues pagination.

    When client provides tmdb_page_start from previous response's next_tmdb_page_start,
    the API should start fetching from that TMDB page instead of using simple 1:1 mapping.

    This ensures sequential page requests don't create duplicates.
    """
    # Arrange: Simulate requesting "API page 2" but starting from TMDB page 5
    # (because previous request consumed TMDB pages 1-4)
    page_5_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(21, 41)  # 20 movies, IDs 21-40
    ]

    mock_tmdb_get.return_value = ApiResponse(
        200,
        cast(TMDBResponseData, create_paginated_tmdb_response(
            page_5_movies, page=5, total_pages=10, total_results=200
        ))
    )

    # Act: Request with tmdb_page_start=5 (from previous next_tmdb_page_start)
    filters: dict[str, str | int] = {
        'page': 2,  # API page 2
        'tmdb_page_start': 5,  # But continue from TMDB page 5
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Request succeeded
    assert res.status_code == HTTP_200_OK
    data = res.json()

    # Verify tmdb_page_start parameter was respected (behavior check)
    # Results should be from TMDB page 5 (IDs 21-40), NOT from API page 2
    returned_ids = {movie['tmdb_id'] for movie in data['results']}
    expected_ids = set(range(21, 41))
    assert returned_ids == expected_ids, (
        f"Expected IDs 21-40 from TMDB page 5 (tmdb_page_start=5), got {returned_ids}. "
        "This validates tmdb_page_start parameter correctly overrides simple page mapping."
    )


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_no_duplicates_across_sequential_pages(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test that sequential pagination with metadata produces no duplicates.

    Real-world scenario:
    1. Request API page 1 → returns movies 1-20, next_tmdb_page_start=5
    2. Request API page 2 with tmdb_page_start=5 → returns movies 21-40
    3. No movies should appear in both responses
    """
    # Arrange: Set up two sequential requests with buffer scenario
    # Request 1: API page 1, consumes TMDB pages 1-4
    page_1_movies = [create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0) for i in range(1, 12)]
    page_2_movies = [create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0) for i in range(12, 15)]
    page_3_movies = [create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0) for i in range(15, 18)]
    page_4_movies = [create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0) for i in range(18, 21)]

    # Request 2: API page 2, starts from TMDB page 5
    page_5_movies = [create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0) for i in range(21, 41)]

    # Mock responses for both requests
    mock_tmdb_get.side_effect = [
        # First request: pages 1-4
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_1_movies, page=1, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_2_movies, page=2, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_3_movies, page=3, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_4_movies, page=4, total_pages=10
        ))),
        # Second request: page 5
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_5_movies, page=5, total_pages=10
        ))),
    ]

    # Act 1: Request API page 1
    res1 = api_client.get(BROWSE_URL, {'vote_average_gte': 7.5})
    assert res1.status_code == HTTP_200_OK
    data1 = res1.json()
    movies_page_1 = {m['tmdb_id'] for m in data1['results']}
    next_tmdb_start = data1['next_tmdb_page_start']

    # Act 2: Request API page 2 with metadata
    res2 = api_client.get(BROWSE_URL, {
        'page': 2,
        'tmdb_page_start': next_tmdb_start,
        'vote_average_gte': 7.5
    })
    assert res2.status_code == HTTP_200_OK
    data2 = res2.json()
    movies_page_2 = {m['tmdb_id'] for m in data2['results']}

    # Assert: No duplicates between pages
    duplicates = movies_page_1 & movies_page_2
    assert len(duplicates) == 0, (
        f"Found {len(duplicates)} duplicate movies across pages: {duplicates}"
    )

    # Assert: Page 1 has IDs 1-20, Page 2 has IDs 21-40
    assert movies_page_1 == set(range(1, 21)), "Page 1 should have movies 1-20"
    assert movies_page_2 == set(range(21, 41)), "Page 2 should have movies 21-40"


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_fallback_when_tmdb_page_start_omitted(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test fallback behavior when tmdb_page_start parameter is missing.

    For backward compatibility, if client doesn't provide tmdb_page_start,
    API should fall back to simple 1:1 page mapping (old behavior).

    This ensures existing clients continue to work (though may see duplicates).
    """
    # Arrange: Simulate old-style request without metadata
    page_2_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(21, 41)
    ]

    mock_tmdb_get.return_value = ApiResponse(
        200,
        cast(TMDBResponseData, create_paginated_tmdb_response(
            page_2_movies, page=2, total_pages=10
        ))
    )

    # Act: Request API page 2 WITHOUT tmdb_page_start
    res = api_client.get(BROWSE_URL, {'page': 2})

    # Assert: Should fall back to simple mapping (API page 2 → TMDB page 2)
    assert res.status_code == HTTP_200_OK
    data = res.json()

    # Verify fallback behavior: results from TMDB page 2 (IDs 21-40)
    returned_ids = {movie['tmdb_id'] for movie in data['results']}
    expected_ids = set(range(21, 41))
    assert returned_ids == expected_ids, (
        f"Expected IDs 21-40 from TMDB page 2 (fallback behavior), got {returned_ids}. "
        "Without tmdb_page_start, should use simple 1:1 mapping (API page = TMDB page)"
    )


# =========================
# Buffer Deduplication Integration Tests (TDD)
# =========================


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_deduplicates_when_tmdb_returns_duplicate_across_pages(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test browse endpoint deduplicates when TMDB returns same movie on consecutive pages.

    Real-world bug scenario: TMDB eventually-consistent DB returns Spirited Away (ID 129)
    on both page 1 position 19 AND page 2 position 1 (multi-genre filter: Animation + Family).

    Expected behavior (after Phase 2 implementation):
    - Buffer deduplicates by tmdb_id
    - Continues fetching page 2 to reach 20 unique movies
    - Returns 20 unique movies (no duplicate tmdb_id values)

    TDD: Expect this test to FAIL before Phase 2 implementation.
    """
    # Arrange: Page 1 has 19 movies (IDs 1-18, then Spirited Away 129)
    page_1_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(1, 19)  # IDs 1-18
    ] + [
        create_movie_dict(129, 'Spirited Away', '2001-07-20', 8.5)  # ID 129 at position 19
    ]

    # Page 2: DUPLICATE 129 at position 1 + new movies 20-39
    page_2_movies = [
        create_movie_dict(129, 'Spirited Away', '2001-07-20', 8.5)  # DUPLICATE
    ] + [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(20, 40)  # IDs 20-39 (20 new movies)
    ]

    mock_tmdb_get.side_effect = [
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_1_movies, page=1, total_pages=5
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_2_movies, page=2, total_pages=5
        ))),
    ]

    # Act: Request browse API page 1 with multi-genre filter
    res = api_client.get(BROWSE_URL, {
        'page': 1,
        'with_genres': '16,10751'  # Animation + Family (real-world filter)
    })

    # Assert: Should return 20 unique movies
    assert res.status_code == HTTP_200_OK
    data = res.json()
    results = data['results']

    # Verify: Exactly 20 movies returned
    assert len(results) == 20, f"Expected 20 unique movies, got {len(results)}"

    # Verify: No duplicate tmdb_id values
    tmdb_ids = [movie['tmdb_id'] for movie in results]
    unique_ids = set(tmdb_ids)
    assert len(unique_ids) == 20, (
        f"Found duplicate tmdb_id values. "
        f"Unique: {len(unique_ids)}, Total: {len(tmdb_ids)}. "
        f"Duplicates: {[id for id in tmdb_ids if tmdb_ids.count(id) > 1]}"
    )

    # Verify: Contains IDs 1-20 (Spirited Away 129 replaced by movie 20)
    # After deduplication: 1-18, 129, 20 (first 20 unique after removing duplicate 129)
    assert 129 in unique_ids, "Should contain Spirited Away (first occurrence)"
    assert tmdb_ids.count(129) == 1, "Spirited Away should appear exactly once"

    # Verify: next_tmdb_page_start reflects both pages consumed (1 + 1 buffer page)
    assert data['next_tmdb_page_start'] == 3, (
        "Should consume TMDB pages 1 and 2, next should be 3"
    )


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_deduplicates_multiple_duplicates_across_pages(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test browse endpoint handles multiple duplicates across multiple buffer pages.

    Scenario: Heavy duplication from TMDB requires fetching multiple buffer pages
    to accumulate 20 unique movies.

    TDD: Expect this test to FAIL before Phase 2 implementation.
    """
    # Arrange: Page 1 has 17 movies (IDs 1-17)
    page_1_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(1, 18)  # IDs 1-17
    ]

    # Page 2: Heavy duplicates (15-17 repeated) + only 1 new (18) = 4 total
    # After dedup: Just ID 18 is new → Total unique so far: 18
    page_2_movies = [
        create_movie_dict(15, 'Movie 15', '2022-01-01', 8.0),  # DUPLICATE
        create_movie_dict(16, 'Movie 16', '2022-01-01', 8.0),  # DUPLICATE
        create_movie_dict(17, 'Movie 17', '2022-01-01', 8.0),  # DUPLICATE
        create_movie_dict(18, 'Movie 18', '2022-01-01', 8.0),  # NEW
    ]

    # Page 3: More duplicates (17, 18) + new 19-21 = 5 total
    # After dedup: IDs 19, 20, 21 are new → Total unique: 21 (finally >= 20)
    page_3_movies = [
        create_movie_dict(17, 'Movie 17', '2022-01-01', 8.0),  # DUPLICATE
        create_movie_dict(18, 'Movie 18', '2022-01-01', 8.0),  # DUPLICATE
        create_movie_dict(19, 'Movie 19', '2022-01-01', 8.0),  # NEW
        create_movie_dict(20, 'Movie 20', '2022-01-01', 8.0),  # NEW
        create_movie_dict(21, 'Movie 21', '2022-01-01', 8.0),  # NEW
    ]

    mock_tmdb_get.side_effect = [
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_1_movies, page=1, total_pages=5
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_2_movies, page=2, total_pages=5
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_3_movies, page=3, total_pages=5
        ))),
    ]

    # Act: Request browse API
    res = api_client.get(BROWSE_URL, {'page': 1})

    # Assert: Should return 20 unique movies
    assert res.status_code == HTTP_200_OK
    data = res.json()
    results = data['results']

    assert len(results) == 20, f"Expected 20 unique movies, got {len(results)}"

    # Verify: No duplicates
    tmdb_ids = [movie['tmdb_id'] for movie in results]
    unique_ids = set(tmdb_ids)
    assert len(unique_ids) == 20, f"Found {len(tmdb_ids) - len(unique_ids)} duplicates"

    # Verify: Contains IDs 1-20
    # Page 1: IDs 1-17 (17 unique)
    # Page 2 after dedup: ID 18 (1 new) → Total: 18 unique
    # Page 3 after dedup: IDs 19-21 (3 new) → Total: 21 unique
    # Return first 20: IDs 1-20
    expected_ids = set(range(1, 21))
    assert unique_ids == expected_ids, f"Expected IDs 1-20, got {unique_ids}"

    # Verify: Consumed 3 TMDB pages (1 initial + 2 buffer)
    assert data['next_tmdb_page_start'] == 4, "Should consume pages 1, 2, 3"


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_deduplication_works_with_backend_filters(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test deduplication works correctly when combined with backend year/rating filters.

    Scenario: Year filter active (2020-2024), TMDB returns duplicates,
    buffer must apply filters AND deduplicate.

    TDD: Expect this test to FAIL before Phase 2 implementation.
    """
    # Arrange: Page 1 has 17 movies
    page_1_movies = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(1, 18)  # IDs 1-17
    ]

    # Page 2: Heavy duplicates (15-17 repeated) + only 1 new (18) = 4 total
    # After dedup: Just ID 18 is new → Total unique so far: 18
    page_2_movies = [
        create_movie_dict(15, 'Movie 15', '2023-01-01', 8.0),  # DUPLICATE
        create_movie_dict(16, 'Movie 16', '2023-01-01', 8.0),  # DUPLICATE
        create_movie_dict(17, 'Movie 17', '2023-01-01', 8.0),  # DUPLICATE
        create_movie_dict(18, 'Movie 18', '2023-01-01', 8.0),  # NEW
    ]

    # Page 3: More duplicates (17, 18) + new 19-21 + low-rated movies = 8 total
    # With rating filter (7.5+): IDs 19-21 pass, low-rated filtered out
    # After dedup: IDs 19, 20, 21 are new → Total unique: 21 (finally >= 20)
    page_3_movies = [
        create_movie_dict(17, 'Movie 17', '2023-01-01', 8.0),  # DUPLICATE
        create_movie_dict(18, 'Movie 18', '2023-01-01', 8.0),  # DUPLICATE
        create_movie_dict(19, 'Movie 19', '2023-01-01', 8.0),  # NEW
        create_movie_dict(20, 'Movie 20', '2023-01-01', 8.0),  # NEW
        create_movie_dict(21, 'Movie 21', '2023-01-01', 8.0),  # NEW
        create_movie_dict(100, 'Low Rated 1', '2023-01-01', 5.0),  # FILTERED (rating)
        create_movie_dict(101, 'Low Rated 2', '2023-01-01', 6.0),  # FILTERED (rating)
        create_movie_dict(102, 'Low Rated 3', '2023-01-01', 7.0),  # FILTERED (rating)
    ]

    mock_tmdb_get.side_effect = [
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_1_movies, page=1, total_pages=5
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_2_movies, page=2, total_pages=5
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_3_movies, page=3, total_pages=5
        ))),
    ]

    # Act: Request with rating filter
    res = api_client.get(BROWSE_URL, {
        'page': 1,
        'rating_min': 7.5,
        'rating_max': 10.0
    })

    # Assert: Should return 20 unique movies passing rating filter
    assert res.status_code == HTTP_200_OK
    data = res.json()
    results = data['results']

    assert len(results) == 20, f"Expected 20 movies, got {len(results)}"

    # Verify: No duplicates
    tmdb_ids = [movie['tmdb_id'] for movie in results]
    assert len(set(tmdb_ids)) == 20, "Should have 20 unique tmdb_id values"

    # Verify: No low-rated movies leaked through
    assert 100 not in tmdb_ids, "Low-rated movie 100 (5.0) should be filtered"
    assert 101 not in tmdb_ids, "Low-rated movie 101 (6.0) should be filtered"
    assert 102 not in tmdb_ids, "Low-rated movie 102 (7.0) should be filtered"

    # Verify: IDs 15, 17, 18 appear exactly once (deduplicated)
    assert tmdb_ids.count(15) == 1, "ID 15 should appear exactly once"
    assert tmdb_ids.count(17) == 1, "ID 17 should appear exactly once"
    assert tmdb_ids.count(18) == 1, "ID 18 should appear exactly once"

    # Verify: All movies meet rating threshold
    for movie in results:
        rating = movie['vote_average']
        assert rating >= 7.5, f"Movie {movie['tmdb_id']} rating {rating} below 7.5"


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_respects_max_buffer_pages_with_heavy_duplication(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test browse respects max_buffer_pages safety limit with extreme duplication.

    Scenario: Pathological case where TMDB returns mostly duplicates,
    buffer should stop at 5 additional pages even if < 20 unique movies collected.

    TDD: Expect this test to FAIL before Phase 2 implementation.
    """
    # Arrange: Page 1 has 10 movies
    page_1_movies = [
        create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
        for i in range(1, 11)  # IDs 1-10
    ]

    # Pages 2-6: Each has 9 duplicates + 1 new movie (heavy duplication)
    page_responses = [
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            page_1_movies, page=1, total_pages=10
        )))
    ]

    for page_num in range(2, 7):  # Pages 2-6 (5 buffer pages)
        page_movies = [
            create_movie_dict(i, f'Movie {i}', '2022-01-01', 8.0)
            for i in range(1, 10)  # Duplicates 1-9
        ] + [
            create_movie_dict(
                10 + page_num - 1,
                f'Movie {10 + page_num - 1}',
                '2022-01-01',
                8.0
            )  # One new movie per page
        ]
        page_responses.append(
            ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
                page_movies, page=page_num, total_pages=10
            )))
        )

    mock_tmdb_get.side_effect = page_responses

    # Act: Request browse API
    res = api_client.get(BROWSE_URL, {'page': 1})

    # Assert: Should stop at max_buffer_pages=5 with only 15 unique movies
    assert res.status_code == HTTP_200_OK
    data = res.json()
    results = data['results']

    # After page 1 (10 movies) + 5 buffer pages (1 new each) = 15 unique total
    assert len(results) == 15, (
        f"Expected 15 unique movies (stopped at max_buffer_pages), got {len(results)}"
    )

    # Verify: All unique IDs (1-15)
    tmdb_ids = [movie['tmdb_id'] for movie in results]
    assert set(tmdb_ids) == set(range(1, 16)), "Should have unique IDs 1-15"

    # Verify: Consumed exactly 6 pages (1 initial + 5 buffer max)
    assert data['next_tmdb_page_start'] == 7, (
        "Should consume pages 1-6 (max_buffer_pages=5), next should be 7"
    )

    # Verify: TMDB client called 6 times (initial + 5 buffer)
    assert mock_tmdb_get.call_count == 6, (
        f"Should call TMDB 6 times (1 initial + 5 buffer), got {mock_tmdb_get.call_count}"
    )


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_no_cross_page_duplicates(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test that movies don't appear on multiple pages (cross-page deduplication).

    Scenario: TMDB returns duplicates across page boundaries (e.g., Spirited Away on
    TMDB page 2 and TMDB page 4). Our page 1 shows it, page 2 should NOT show it again.

    Real-world issue: After implementing within-page deduplication, users report
    seeing Spirited Away on page 1 AND page 2, Mulan on page 2 AND page 3, etc.
    """
    # Simulate TMDB pagination instability: Movie ID 19 appears on TMDB pages 2 AND 4
    # Our page 1 will consume TMDB pages 1-2 (with buffer)
    # Our page 2 will consume TMDB pages 3-4 (starting from next_tmdb_page_start)
    # Movie 19 should appear on our page 1 (from TMDB page 2), NOT on our page 2

    # TMDB Page 1: IDs 1-17 (17 movies, triggers buffer)
    tmdb_page_1 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(1, 18)
    ]

    # TMDB Page 2: IDs 18-20 (3 movies) - Page 1 buffer fetch
    # After dedup: Our page 1 has IDs 1-20, next_tmdb_page_start=3
    tmdb_page_2 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(18, 21)
    ]

    # TMDB Page 3: IDs 21-37 (17 movies, triggers buffer for our page 2)
    tmdb_page_3 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(21, 38)
    ]

    # TMDB Page 4: IDs 19, 38-40 (DUPLICATE 19 + 3 new) - Page 2 buffer fetch
    # CRITICAL: ID 19 was already shown on our page 1 (from TMDB page 2)
    # It should NOT appear on our page 2
    tmdb_page_4 = [
        create_movie_dict(19, 'Movie 19', '2023-01-01', 8.0),  # DUPLICATE from page 1!
    ] + [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(38, 41)
    ]

    mock_tmdb_get.side_effect = [
        # Page 1 request: TMDB pages 1-2
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_1, page=1, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_2, page=2, total_pages=10
        ))),
        # Page 2 request: TMDB pages 3-4 (starting from next_tmdb_page_start=3)
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_3, page=3, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_4, page=4, total_pages=10
        ))),
    ]

    # Act: Fetch page 1
    page_1_res = api_client.get(BROWSE_URL, {'page': 1})
    assert page_1_res.status_code == HTTP_200_OK
    page_1_data = page_1_res.json()
    page_1_ids = {movie['tmdb_id'] for movie in page_1_data['results']}

    # Act: Fetch page 2 using next_tmdb_page_start from page 1
    page_2_res = api_client.get(BROWSE_URL, {
        'page': 2,
        'tmdb_page_start': page_1_data['next_tmdb_page_start']
    })
    assert page_2_res.status_code == HTTP_200_OK
    page_2_data = page_2_res.json()
    page_2_ids = {movie['tmdb_id'] for movie in page_2_data['results']}

    # Assert: NO overlap between page 1 and page 2
    overlap = page_1_ids & page_2_ids
    assert len(overlap) == 0, (
        f"Found {len(overlap)} duplicate movie(s) across pages: {overlap}. "
        f"Page 1 IDs: {sorted(page_1_ids)}, Page 2 IDs: {sorted(page_2_ids)}"
    )

    # Specifically verify movie 19 is NOT on both pages
    assert 19 in page_1_ids, "Movie 19 should appear on page 1"
    assert 19 not in page_2_ids, "Movie 19 should NOT appear on page 2 (cross-page duplicate)"


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_browse_backward_navigation_consistency(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test that navigating back to page 1 returns consistent results.

    Scenario: User navigates page 1 → page 2 → back to page 1.
    Page 1 should show identical results both times.

    Real-world issue: Users report that navigating backwards changes page 1 results completely.
    """
    # Setup: Page 1 will fetch TMDB pages 1-2 (buffer), return IDs 1-20
    tmdb_page_1 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(1, 18)  # 17 movies, triggers buffer
    ]

    tmdb_page_2 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(18, 21)  # 3 movies, total 20 after buffer
    ]

    # Page 2 will fetch TMDB pages 3-4
    tmdb_page_3 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(21, 38)  # 17 movies, triggers buffer
    ]

    tmdb_page_4 = [
        create_movie_dict(i, f'Movie {i}', '2023-01-01', 8.0)
        for i in range(38, 41)  # 3 movies, total 20
    ]

    # Mock will be called in order: page 1 fetch (TMDB 1, 2), page 2 fetch (TMDB 3, 4), page 1 again (TMDB 1, 2)
    mock_tmdb_get.side_effect = [
        # First page 1 request
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_1, page=1, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_2, page=2, total_pages=10
        ))),
        # Page 2 request
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_3, page=3, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_4, page=4, total_pages=10
        ))),
        # Second page 1 request (backward navigation)
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_1, page=1, total_pages=10
        ))),
        ApiResponse(200, cast(TMDBResponseData, create_paginated_tmdb_response(
            tmdb_page_2, page=2, total_pages=10
        ))),
    ]

    # Act: Fetch page 1 (first time)
    page_1_first = api_client.get(BROWSE_URL, {'page': 1})
    assert page_1_first.status_code == HTTP_200_OK
    page_1_first_data = page_1_first.json()
    page_1_first_ids = [movie['tmdb_id'] for movie in page_1_first_data['results']]

    # Act: Fetch page 2
    page_2_res = api_client.get(BROWSE_URL, {
        'page': 2,
        'tmdb_page_start': page_1_first_data['next_tmdb_page_start']
    })
    assert page_2_res.status_code == HTTP_200_OK

    # Act: Navigate BACK to page 1 (should give same results as first time)
    # IMPORTANT: Should NOT send tmdb_page_start when going back to page 1
    page_1_second = api_client.get(BROWSE_URL, {'page': 1})
    assert page_1_second.status_code == HTTP_200_OK
    page_1_second_data = page_1_second.json()
    page_1_second_ids = [movie['tmdb_id'] for movie in page_1_second_data['results']]

    # Assert: Page 1 results should be IDENTICAL both times
    assert page_1_first_ids == page_1_second_ids, (
        f"Page 1 results changed after backward navigation!\n"
        f"First visit:  {page_1_first_ids}\n"
        f"Second visit: {page_1_second_ids}\n"
        f"Differences: Added {set(page_1_second_ids) - set(page_1_first_ids)}, "
        f"Removed {set(page_1_first_ids) - set(page_1_second_ids)}"
    )

    # Assert: Order should also be preserved
    assert page_1_first_data['results'] == page_1_second_data['results'], (
        "Page 1 movie order changed after backward navigation"
    )
