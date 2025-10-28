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
DISCOVER_URL = '/api/movies/discover'


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
        'core.services.tmdb_api_client.TMDBApiClient.get_now_playing_movies',
        NOW_PLAYING_URL,
        {'page': 1}
    ),
    (
        'core.services.tmdb_api_client.TMDBApiClient.get',
        UPCOMING_URL,
        {'page': 1}
    ),
    (
        'core.services.tmdb_api_client.TMDBApiClient.search_movies',
        SEARCH_URL,
        {'query': 'test'}
    ),
    (
        'core.services.tmdb_api_client.TMDBApiClient.get',
        DISCOVER_URL,
        {'page': 1}
    ),
], ids=['now_playing', 'upcoming', 'search', 'discover'])
def test_paginated_endpoint_contract(
    api_client: Client,
    mock_path: str,
    url: str,
    params: dict[str, str | int]
) -> None:
    """
    Test that paginated movie endpoints return the correct response structure.

    Parametrized to test: now-playing, upcoming, search, and discover endpoints.
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
# Discover Endpoint Tests
# =========================


@pytest.mark.django_db
@patch('core.services.tmdb_api_client.TMDBApiClient.get')
def test_discover_with_filters(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test the discover endpoint with various filter parameters."""
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

    # Act: Call the discover endpoint with filters
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
    res = api_client.get(DISCOVER_URL, filters)

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
def test_discover_invalid_parameters(
    api_client: Client,
    invalid_param: str,
    invalid_value: str
) -> None:
    """
    Test the discover endpoint with invalid parameter values.

    Parametrized to test various Pydantic validation errors.
    All should return 422 status with error details.
    """
    # Act: Send request with invalid parameter
    res = api_client.get(DISCOVER_URL, {invalid_param: invalid_value})

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
def test_discover_api_extracts_backend_filter_params(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test discover API extracts year_min/max and rating_min/max for backend filtering.

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
    res = api_client.get(DISCOVER_URL, filters)

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
def test_discover_api_filters_bad_ratings_from_tmdb(
    mock_tmdb_get: Mock,
    api_client: Client
) -> None:
    """Test discover API backend filtering removes movies with bad ratings.

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
    res = api_client.get(DISCOVER_URL, filters)

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
def test_discover_api_buffer_mechanism_with_filtering(
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
                'vote_average': 8.0, 'vote_count': 100
            }
            for i in range(1, 16)
        ],
        # 5 invalid movies (wrong year or rating)
        {
            'id': 101,
            'title': 'Wrong Year 2019',
            'poster_path': '/bad1.jpg',
            'release_date': '2019-01-01',  # Outside range
            'vote_average': 8.0, 'vote_count': 100
        },
        {
            'id': 102,
            'title': 'Low Rating',
            'poster_path': '/bad2.jpg',
            'release_date': '2022-01-01',
            'vote_average': 6.0  # Below threshold
        },
        {
            'id': 103,
            'title': 'Wrong Year 2030',
            'poster_path': '/bad3.jpg',
            'release_date': '2030-01-01',  # Outside range
            'vote_average': 8.0, 'vote_count': 100
        },
        {
            'id': 104,
            'title': 'Placeholder Rating',
            'poster_path': '/bad4.jpg',
            'release_date': '2022-01-01',
            'vote_average': 0.0  # Placeholder
        },
        {
            'id': 105,
            'title': 'Wrong Year 2018',
            'poster_path': '/bad5.jpg',
            'release_date': '2018-01-01',  # Outside range
            'vote_average': 8.0, 'vote_count': 100
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
                'vote_average': 7.8, 'vote_count': 100
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
    res = api_client.get(DISCOVER_URL, filters)

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
