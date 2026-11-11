"""Service behavior against persisted users, movies and user records."""

from __future__ import annotations

import pytest

from apps.core.exceptions import NotFoundError
from apps.core.tests.test_helpers import create_user
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService
from apps.user_movie_data.tests.test_helpers import create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user() -> User:
    return create_user()


@pytest.fixture
def tmdb() -> TMDBStub:
    return TMDBStub()


@pytest.fixture
def service(tmdb: TMDBStub) -> UserMovieDataService:
    return UserMovieDataService(tmdb_client=tmdb)


def test_service_initialization_with_defaults(user: User) -> None:
    record = create_user_movie_data(user)
    assert UserMovieDataService().get_by_tmdb_id(user, record.movie.tmdb_id).pk == record.pk


def test_injected_service_does_not_read_another_users_record(
    service: UserMovieDataService, user: User
) -> None:
    record = create_user_movie_data(create_user(username="other"))
    with pytest.raises(NotFoundError, match="not found"):
        service.get_by_tmdb_id(user, record.movie.tmdb_id)


def test_get_by_tmdb_id_returns_user_movie_data(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user)
    result = service.get_by_tmdb_id(user, record.movie.tmdb_id)
    assert result.pk == record.pk
    assert result.movie.tmdb_id == 550


def test_get_by_tmdb_id_raises_when_not_found(service: UserMovieDataService, user: User) -> None:
    with pytest.raises(NotFoundError) as error:
        service.get_by_tmdb_id(user, 99999)
    assert error.value.status_code == 404
