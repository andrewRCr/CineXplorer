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
    tmdb_payload: TMDBResponseData = {
        'results': [{
            'id': 101,
            'title': 'Test Movie',
            'poster_path': '/test.jpg',
            'release_date': '2023-01-01',
            'vote_average': 8.0
        }],
        'page': 1,
        'total_pages': 5,
        'total_results': 1
    }
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
    assert data['total_pages'] == 5
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
    tmdb_payload: TMDBResponseData = {
        'results': [{
            'id': 101,
            'title': 'Test Movie',
            'poster_path': '/test.jpg',
            'release_date': '2023-01-01',
            'vote_average': 8.0
        }],
        'page': 1,
        'total_pages': 5,
        'total_results': 1
    }
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
        'certification': 'PG-13',
        'region': 'US'
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
    assert params['region'] == 'US'


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
            'vote_average': 8.1, 'genres': [], 'production_companies': []
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
            'vote_average': 8.1, 'genres': [], 'production_companies': []
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
