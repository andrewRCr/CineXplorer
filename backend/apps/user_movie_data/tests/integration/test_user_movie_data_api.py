"""
Integration tests for the UserMovieData Django Ninja API endpoints.

This module contains comprehensive tests for the user movie data API,
including authentication, CRUD operations, and user-specific data filtering.

Endpoints tested:
    - GET /api/user-movie-data/by-tmdb-id - Retrieve by TMDB ID
    - POST /api/user-movie-data - Create new entry
    - PATCH /api/user-movie-data/{id} - Partial update
    - DELETE /api/user-movie-data/{id} - Delete entry

All endpoints require JWT authentication via cookies.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from apps.core.models import Movie
from apps.core.tests.test_helpers import HTTPStatus, get_csrf_token
from apps.user_movie_data.models import UserMovieData

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.test import Client

# =========================
# Django Ninja API URLs
# =========================
USER_MOVIE_DATA_CREATE_URL = '/api/user-movie-data'


def user_movie_data_by_tmdb_url(tmdb_id: int) -> str:
    """Return URL for finding UserMovieData by TMDB ID."""
    return f'/api/user-movie-data/by-tmdb-id?tmdb_id={tmdb_id}'


def user_movie_data_detail_url(user_movie_data_id: int) -> str:
    """Return URL for UserMovieData detail operations (PATCH/DELETE)."""
    return f'/api/user-movie-data/{user_movie_data_id}'


# =========================
# Test Fixtures
# =========================


@pytest.fixture
def movie(db: None) -> Movie:
    """Create a test movie stub."""
    return Movie.objects.create(
        tmdb_id=12345,
        title='Blade Runner',
        poster_path='/blade_runner.jpg',
        release_date='1982-06-25'
    )


@pytest.fixture
def other_movie(db: None) -> Movie:
    """Create a second test movie stub."""
    return Movie.objects.create(
        tmdb_id=54321,
        title='Chinatown',
        poster_path='/chinatown.jpg',
        release_date='1974-06-20'
    )


@pytest.fixture
def other_user(db: None) -> User:
    """Create a second test user for ownership tests."""
    from apps.core.tests.test_helpers import create_user
    return create_user(
        email="otheruser@example.com",
        password="testpass123",
        username="otheruser",
    )


@pytest.fixture
def authenticated_user(api_client: Client, db: None) -> tuple[Client, User]:
    """
    Create an authenticated user and return (client, user) tuple.

    Creates a verified user (can login) and authenticates via the JWT token
    endpoint which sets the necessary cookies for Django Ninja JWTCookieAuth.
    """
    from apps.core.tests.test_helpers import authenticate_client, create_user

    # Create verified user (create_user() verifies email by default)
    user = create_user(
        username="testuser",
        email="testuser@example.com",
        password="testpass123"
    )

    # Authenticate client (handles hybrid auth pattern automatically)
    authenticate_client(api_client, user.username, "testpass123")

    return api_client, user


@pytest.fixture
def user_movie_data(authenticated_user: tuple[Client, User], movie: Movie) -> UserMovieData:
    """Create a UserMovieData entry for the authenticated test user."""
    _client, user = authenticated_user
    return UserMovieData.objects.create(
        user=user,
        movie=movie,
        user_watched=True,
        user_on_watchlist=False,
        user_liked=True,
        user_rating=9,
        user_review='Great movie!'
    )


# =========================
# Authentication Tests
# =========================


@pytest.mark.django_db
def test_unauthenticated_get_by_tmdb_id_denied(api_client: Client) -> None:
    """
    Test that unauthenticated GET by TMDB ID is denied.

    The /by-tmdb-id endpoint requires JWT authentication.
    """
    url = user_movie_data_by_tmdb_url(12345)
    res = api_client.get(url)
    assert res.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.django_db
def test_unauthenticated_create_denied(api_client: Client, movie: Movie) -> None:
    """Test that unauthenticated POST requests are denied."""
    payload = {
        'movie_id': movie.tmdb_id,
        'user_watched': True,
        'user_rating': 8
    }
    res = api_client.post(
        USER_MOVIE_DATA_CREATE_URL,
        data=payload,
        content_type='application/json'
    )
    assert res.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.django_db
def test_unauthenticated_update_denied(
    api_client: Client,
    user_movie_data: UserMovieData
) -> None:
    """
    Test that unauthenticated PATCH requests are denied.

    NOTE: Returns 403 (CSRF error) not 401 because CSRF middleware runs
    before endpoint authentication. This is expected behavior.
    """
    url = user_movie_data_detail_url(user_movie_data.id)
    payload = {'user_rating': 10}
    res = api_client.patch(
        url,
        data=payload,
        content_type='application/json'
    )
    assert res.status_code == HTTPStatus.FORBIDDEN


@pytest.mark.django_db
def test_unauthenticated_delete_denied(
    api_client: Client,
    user_movie_data: UserMovieData
) -> None:
    """
    Test that unauthenticated DELETE requests are denied.

    NOTE: Returns 403 (CSRF error) not 401 because CSRF middleware runs
    before endpoint authentication. This is expected behavior.
    """
    url = user_movie_data_detail_url(user_movie_data.id)
    res = api_client.delete(url)
    assert res.status_code == HTTPStatus.FORBIDDEN


# =========================
# GET by TMDB ID Tests
# =========================


@pytest.mark.django_db
def test_get_user_movie_data_by_tmdb_id_success(
    authenticated_user: tuple[Client, User],
    movie: Movie
) -> None:
    """Test successfully retrieving user movie data by TMDB ID."""
    client, user = authenticated_user

    # Arrange: Create user movie data
    user_movie_data = UserMovieData.objects.create(
        user=user,
        movie=movie,
        user_watched=True,
        user_on_watchlist=False,
        user_liked=True,
        user_rating=9,
        user_review='Excellent film!'
    )

    # Act
    url = user_movie_data_by_tmdb_url(movie.tmdb_id)
    res = client.get(url)

    # Assert: Status and basic structure
    assert res.status_code == HTTPStatus.OK
    data = res.json()

    # Assert: UserMovieData fields
    assert data['id'] == user_movie_data.id
    assert data['user_watched'] is True
    assert data['user_on_watchlist'] is False
    assert data['user_liked'] is True
    assert data['user_rating'] == 9
    assert data['user_review'] == 'Excellent film!'

    # Assert: Computed movie fields (from from_orm_with_movie)
    assert data['tmdb_id'] == movie.tmdb_id
    assert data['title'] == movie.title


@pytest.mark.django_db
def test_get_user_movie_data_by_tmdb_id_not_found(
    authenticated_user: tuple[Client, User],
    movie: Movie
) -> None:
    """Test GET by TMDB ID returns 404 when no data exists."""
    client, _user = authenticated_user
    # Don't create UserMovieData - test nonexistent case
    url = user_movie_data_by_tmdb_url(movie.tmdb_id)
    res = client.get(url)

    assert res.status_code == HTTPStatus.NOT_FOUND
    data = res.json()
    assert 'detail' in data
    assert 'not found' in data['detail'].lower()


@pytest.mark.django_db
def test_get_user_movie_data_by_tmdb_id_user_isolation(
    authenticated_user: tuple[Client, User],
    other_user: User,
    movie: Movie
) -> None:
    """Test that users can only retrieve their own movie data by TMDB ID."""
    client, _user = authenticated_user
    # Arrange: Create data for OTHER user only
    UserMovieData.objects.create(
        user=other_user,
        movie=movie,
        user_rating=5
    )

    # Act: Authenticated as 'user', try to get data that belongs to 'other_user'
    url = user_movie_data_by_tmdb_url(movie.tmdb_id)
    res = client.get(url)

    # Assert: Should return 404 (data exists but not for this user)
    assert res.status_code == HTTPStatus.NOT_FOUND


# =========================
# CREATE (POST) Tests
# =========================


@pytest.mark.django_db
def test_create_user_movie_data_success(
    authenticated_user: tuple[Client, User],
    movie: Movie
) -> None:
    """Test successfully creating a new UserMovieData entry."""
    client, user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange
    payload = {
        'movie_id': movie.tmdb_id,
        'user_watched': True,
        'user_on_watchlist': False,
        'user_liked': True,
        'user_rating': 8,
        'user_review': 'Really enjoyed this film.'
    }

    # Act
    res = client.post(
        USER_MOVIE_DATA_CREATE_URL,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    # Assert: Response
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert data['user_watched'] is True
    assert data['user_on_watchlist'] is False
    assert data['user_liked'] is True
    assert data['user_rating'] == 8
    assert data['user_review'] == 'Really enjoyed this film.'
    assert data['tmdb_id'] == movie.tmdb_id
    assert data['title'] == movie.title

    # Assert: Database state
    assert UserMovieData.objects.filter(user=user, movie=movie).exists()
    obj = UserMovieData.objects.get(user=user, movie=movie)
    assert obj.user_rating == 8
    assert obj.user_review == 'Really enjoyed this film.'


@pytest.mark.django_db
def test_create_user_movie_data_with_defaults(
    authenticated_user: tuple[Client, User],
    movie: Movie
) -> None:
    """Test creating UserMovieData with minimal payload (defaults apply)."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange: Only movie_id is required
    payload = {
        'movie_id': movie.tmdb_id
    }

    # Act
    res = client.post(
        USER_MOVIE_DATA_CREATE_URL,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    # Assert
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    # Verify defaults per UserMovieDataCreateSchema
    assert data['user_watched'] is False
    assert data['user_on_watchlist'] is False
    assert data['user_liked'] is False
    assert data['user_rating'] is None
    assert data['user_review'] is None


@pytest.mark.django_db
def test_create_user_movie_data_duplicate_returns_400(
    authenticated_user: tuple[Client, User],
    user_movie_data: UserMovieData
) -> None:
    """Test that creating duplicate UserMovieData returns 400."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange: user_movie_data fixture already exists
    payload = {
        'movie_id': user_movie_data.movie.tmdb_id,
        'user_rating': 10
    }

    # Act
    res = client.post(
        USER_MOVIE_DATA_CREATE_URL,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    # Assert
    assert res.status_code == HTTPStatus.BAD_REQUEST
    data = res.json()
    assert 'detail' in data
    assert 'already exists' in data['detail'].lower()


@pytest.mark.django_db
def test_create_user_movie_data_invalid_movie_id_returns_404(
    authenticated_user: tuple[Client, User]
) -> None:
    """
    Test that creating with nonexistent movie_id returns 404.

    Uses an extremely large TMDB ID that doesn't exist in TMDB API.
    The endpoint will attempt to fetch from TMDB and fail with 404.
    """
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    payload = {
        'movie_id': 999999999,  # ID that doesn't exist in TMDB
        'user_rating': 8
    }

    res = client.post(
        USER_MOVIE_DATA_CREATE_URL,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    assert res.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.django_db
@pytest.mark.parametrize('invalid_rating', [0, 11, -5], ids=['zero', 'too_high', 'negative'])
def test_create_user_movie_data_invalid_rating_returns_422(
    authenticated_user: tuple[Client, User],
    movie: Movie,
    invalid_rating: int
) -> None:
    """
    Test that creating with invalid rating (outside 1-10 range) returns 422.

    Parametrized to test: below minimum (0), above maximum (11), and negative.
    """
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    payload = {
        'movie_id': movie.tmdb_id,
        'user_rating': invalid_rating
    }

    res = client.post(
        USER_MOVIE_DATA_CREATE_URL,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    assert res.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    data = res.json()
    assert 'detail' in data


# =========================
# UPDATE (PATCH) Tests
# =========================


@pytest.mark.django_db
def test_update_user_movie_data_partial_success(
    authenticated_user: tuple[Client, User],
    user_movie_data: UserMovieData
) -> None:
    """Test partial update (PATCH) of UserMovieData."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange
    url = user_movie_data_detail_url(user_movie_data.id)
    payload = {
        'user_rating': 10,
        'user_review': 'Updated review - even better on rewatch!'
    }

    # Act
    res = client.patch(
        url,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    # Assert: Response
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert data['user_rating'] == 10
    assert data['user_review'] == 'Updated review - even better on rewatch!'
    # Other fields should remain unchanged
    assert data['user_watched'] is True
    assert data['user_liked'] is True

    # Assert: Database state
    user_movie_data.refresh_from_db()
    assert user_movie_data.user_rating == 10
    assert user_movie_data.user_review == 'Updated review - even better on rewatch!'
    assert user_movie_data.user_watched is True  # Unchanged


@pytest.mark.django_db
def test_update_user_movie_data_single_field(
    authenticated_user: tuple[Client, User],
    user_movie_data: UserMovieData
) -> None:
    """Test updating a single field (true partial update)."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    url = user_movie_data_detail_url(user_movie_data.id)
    payload = {'user_on_watchlist': True}

    res = client.patch(
        url,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    assert res.status_code == HTTPStatus.OK
    user_movie_data.refresh_from_db()
    assert user_movie_data.user_on_watchlist is True
    # Original values preserved
    assert user_movie_data.user_rating == 9
    assert user_movie_data.user_review == 'Great movie!'


@pytest.mark.django_db
def test_update_user_movie_data_not_found(
    authenticated_user: tuple[Client, User]
) -> None:
    """Test updating nonexistent UserMovieData returns 404."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    url = user_movie_data_detail_url(99999)
    payload = {'user_rating': 10}

    res = client.patch(
        url,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    assert res.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.django_db
def test_update_user_movie_data_wrong_user_returns_404(
    authenticated_user: tuple[Client, User],
    other_user: User,
    movie: Movie
) -> None:
    """Test that users cannot update other users' movie data."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange: Create data for OTHER user
    other_user_data = UserMovieData.objects.create(
        user=other_user,
        movie=movie,
        user_rating=5
    )

    # Act: Authenticated as 'user', try to update 'other_user' data
    url = user_movie_data_detail_url(other_user_data.id)
    payload = {'user_rating': 10}

    res = client.patch(
        url,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    # Assert: Should return 404 (object exists but doesn't belong to user)
    assert res.status_code == HTTPStatus.NOT_FOUND

    # Assert: Data remains unchanged
    other_user_data.refresh_from_db()
    assert other_user_data.user_rating == 5


@pytest.mark.django_db
@pytest.mark.parametrize('invalid_rating', [0, 11], ids=['zero', 'too_high'])
def test_update_user_movie_data_invalid_rating_returns_422(
    authenticated_user: tuple[Client, User],
    user_movie_data: UserMovieData,
    invalid_rating: int
) -> None:
    """Test that updating with invalid rating returns 422."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    url = user_movie_data_detail_url(user_movie_data.id)
    payload = {'user_rating': invalid_rating}

    res = client.patch(
        url,
        data=payload,
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    assert res.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


# =========================
# DELETE Tests
# =========================


@pytest.mark.django_db
def test_delete_user_movie_data_success(
    authenticated_user: tuple[Client, User],
    user_movie_data: UserMovieData
) -> None:
    """Test successfully deleting UserMovieData."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange
    url = user_movie_data_detail_url(user_movie_data.id)
    data_id = user_movie_data.id

    # Act
    res = client.delete(url, HTTP_X_CSRFTOKEN=csrf_token)

    # Assert: Response
    assert res.status_code == HTTPStatus.NO_CONTENT

    # Assert: Object removed from database
    assert not UserMovieData.objects.filter(id=data_id).exists()


@pytest.mark.django_db
def test_delete_user_movie_data_not_found(
    authenticated_user: tuple[Client, User]
) -> None:
    """Test deleting nonexistent UserMovieData returns 404."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    url = user_movie_data_detail_url(99999)
    res = client.delete(url, HTTP_X_CSRFTOKEN=csrf_token)

    assert res.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.django_db
def test_delete_user_movie_data_wrong_user_returns_404(
    authenticated_user: tuple[Client, User],
    other_user: User,
    movie: Movie
) -> None:
    """Test that users cannot delete other users' movie data."""
    client, _user = authenticated_user
    csrf_token = get_csrf_token(client)
    # Arrange: Create data for OTHER user
    other_user_data = UserMovieData.objects.create(
        user=other_user,
        movie=movie,
        user_rating=5
    )
    data_id = other_user_data.id

    # Act: Authenticated as 'user', try to delete 'other_user' data
    url = user_movie_data_detail_url(data_id)
    res = client.delete(url, HTTP_X_CSRFTOKEN=csrf_token)

    # Assert: Should return 404
    assert res.status_code == HTTPStatus.NOT_FOUND

    # Assert: Data still exists
    assert UserMovieData.objects.filter(id=data_id).exists()
