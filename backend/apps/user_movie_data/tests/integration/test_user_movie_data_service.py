"""Service behavior against persisted users, movies and user records."""

from __future__ import annotations

import pytest

from apps.core.exceptions import NotFoundError
from apps.core.tests.test_helpers import create_user
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user() -> User:
    return create_user()


@pytest.fixture
def tmdb(monkeypatch: pytest.MonkeyPatch) -> TMDBStub:
    stub = TMDBStub()
    for movie_id in (111, 222, 333, 550):
        stub.add_movie(create_tmdb_movie_detail(movie_id, f"Movie {movie_id}", "2023-01-01", 8.0))
    monkeypatch.setattr("apps.movie.services.pipelines.batch.tmdb_client", stub)
    return stub


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


def test_get_user_movies_returns_paginated_list(service: UserMovieDataService, user: User) -> None:
    for movie_id in (111, 222, 333):
        create_user_movie_data(user, create_movie(movie_id), user_rating=8)
    result = service.get_user_movies(user, page=2, page_size=2)
    assert (result.page, result.total_pages, result.total_results) == (2, 2, 3)
    assert [movie.tmdb_id for movie in result.results] == [111]
    assert result.results[0].user_movie_data is not None
    assert result.results[0].user_movie_data.user_rating == 8


@pytest.mark.parametrize("filter_name", ["watchlist_only", "watched_only", "rated_only"])
def test_get_user_movies_with_filter(
    service: UserMovieDataService, user: User, filter_name: str
) -> None:
    fields = {
        "watchlist_only": "user_on_watchlist",
        "watched_only": "user_watched",
        "rated_only": "user_rating",
    }
    create_user_movie_data(
        user,
        create_movie(111),
        **{fields[filter_name]: 8 if filter_name == "rated_only" else True},
    )
    create_user_movie_data(user, create_movie(222))
    result = service.get_user_movies(user, **{filter_name: True})
    assert result.total_results == 1
    assert [movie.tmdb_id for movie in result.results] == [111]


def test_get_user_movies_returns_empty_for_no_data(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    result = service.get_user_movies(user)
    assert (result.page, result.total_pages, result.total_results, result.results) == (1, 0, 0, [])
    assert tmdb.requested_ids == []


def test_get_user_movies_skips_unavailable_tmdb_movies(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    for movie_id in (111, 222, 333):
        create_user_movie_data(user, create_movie(movie_id))
    tmdb.add_error(222, 404)
    result = service.get_user_movies(user)
    assert result.total_results == 3
    assert [movie.tmdb_id for movie in result.results] == [333, 111]


def test_get_all_user_movies_returns_full_list(service: UserMovieDataService, user: User) -> None:
    for movie_id in (111, 222):
        create_user_movie_data(user, create_movie(movie_id))
    result = service.get_all_user_movies(user)
    assert (result.page, result.total_pages, result.total_results) == (1, 1, 2)
    assert [movie.tmdb_id for movie in result.results] == [222, 111]


def test_get_all_user_movies_returns_empty_for_no_data(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    result = service.get_all_user_movies(user)
    assert (result.page, result.total_pages, result.total_results, result.results) == (1, 0, 0, [])
    assert tmdb.requested_ids == []


def test_get_all_user_movies_skips_unavailable_tmdb_movies(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    for movie_id in (111, 222, 333):
        create_user_movie_data(user, create_movie(movie_id))
    tmdb.add_error(222, 404)
    result = service.get_all_user_movies(user)
    assert result.total_results == 2
    assert [movie.tmdb_id for movie in result.results] == [333, 111]
