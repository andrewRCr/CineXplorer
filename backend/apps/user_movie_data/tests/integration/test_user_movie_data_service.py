"""Service behavior against persisted users, movies and user records."""

from __future__ import annotations

import pytest
from django.db import transaction
from ninja.errors import HttpError

from apps.core.exceptions import NotFoundError
from apps.core.models import Movie
from apps.core.tests.test_helpers import create_user
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.models import UserMovieData
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
    return UserMovieDataService(movie_service=MovieService(tmdb_client=tmdb))


def test_service_initialization_with_defaults(user: User) -> None:
    record = create_user_movie_data(user)
    assert UserMovieDataService().get_by_tmdb_id(user, record.movie.tmdb_id).pk == record.pk


def test_injected_service_does_not_read_another_users_record(
    service: UserMovieDataService, user: User
) -> None:
    record = create_user_movie_data(create_user(username="other"))
    with pytest.raises(HttpError, match="not found"):
        service.get_by_tmdb_id(user, record.movie.tmdb_id)


def test_create_with_existing_movie_succeeds(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    movie = create_movie(title="Blade Runner")
    result = service.create(user, movie.pk, user_on_watchlist=True)
    saved = UserMovieData.objects.get(pk=result.pk)
    assert saved.user.pk == user.pk
    assert saved.movie.tmdb_id == movie.pk
    assert saved.user_on_watchlist is True
    assert tmdb.requested_ids == []


def test_create_fetches_from_tmdb_when_movie_not_local(
    service: UserMovieDataService, user: User
) -> None:
    result = service.create(user, 550, user_on_watchlist=True)
    assert Movie.objects.get(pk=550).title == "Movie 550"
    assert UserMovieData.objects.get(pk=result.pk).user_on_watchlist is True


def test_create_raises_when_tmdb_movie_not_found(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    tmdb.add_error(99999, 404)
    with pytest.raises(NotFoundError) as error:
        service.create(user, 99999)
    assert error.value.status_code == 404
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


def test_create_raises_when_already_exists(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user)
    with pytest.raises(HttpError) as error, transaction.atomic():
        service.create(user, record.movie.tmdb_id)
    assert error.value.status_code == 400
    assert UserMovieData.objects.count() == 1


def test_get_by_id_returns_user_movie_data(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user, user_watched=True, user_rating=9)
    result = service.get_by_id(user, record.pk)
    assert (result.pk, result.movie.tmdb_id, result.user_watched, result.user_rating) == (
        record.pk,
        record.movie.tmdb_id,
        True,
        9,
    )


def test_get_by_id_raises_when_not_found(service: UserMovieDataService, user: User) -> None:
    with pytest.raises(HttpError) as error:
        service.get_by_id(user, 999)
    assert error.value.status_code == 404


def test_get_by_tmdb_id_returns_user_movie_data(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user)
    result = service.get_by_tmdb_id(user, record.movie.tmdb_id)
    assert result.pk == record.pk
    assert result.movie.tmdb_id == 550


def test_get_by_tmdb_id_raises_when_not_found(service: UserMovieDataService, user: User) -> None:
    with pytest.raises(HttpError) as error:
        service.get_by_tmdb_id(user, 99999)
    assert error.value.status_code == 404


def test_update_partial_fields_succeeds(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user, user_on_watchlist=True, user_review="Keep this")
    result = service.update(user, record.pk, user_watched=True, user_rating=9)
    record.refresh_from_db()
    assert result.pk == record.pk
    assert record.user_watched is True
    assert record.user_rating == 9
    assert record.user_on_watchlist is True
    assert record.user_review == "Keep this"


def test_update_raises_when_not_found(service: UserMovieDataService, user: User) -> None:
    with pytest.raises(HttpError) as error:
        service.update(user, 999, user_watched=True)
    assert error.value.status_code == 404


def test_update_with_no_changes_succeeds(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user, user_watched=True, user_rating=9, user_review="Keep")
    before = (record.user_watched, record.user_rating, record.user_review)
    result = service.update(user, record.pk)
    record.refresh_from_db()
    assert result.pk == record.pk
    assert (record.user_watched, record.user_rating, record.user_review) == before


def test_delete_succeeds(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user)
    service.delete(user, record.pk)
    assert not UserMovieData.objects.filter(pk=record.pk).exists()
    assert Movie.objects.filter(pk=record.movie.tmdb_id).exists()


def test_delete_raises_when_not_found(service: UserMovieDataService, user: User) -> None:
    with pytest.raises(HttpError) as error:
        service.delete(user, 999)
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


@pytest.mark.parametrize("operation", ["get_by_id", "get_by_tmdb_id", "update", "delete"])
def test_user_cannot_access_other_users_data(
    service: UserMovieDataService, user: User, operation: str
) -> None:
    record = create_user_movie_data(create_user(username="other"), user_rating=7)
    operations = {
        "get_by_tmdb_id": lambda: service.get_by_tmdb_id(user, record.movie.tmdb_id),
        "update": lambda: service.update(user, record.pk, user_rating=9),
        "delete": lambda: service.delete(user, record.pk),
        "get_by_id": lambda: service.get_by_id(user, record.pk),
    }
    with pytest.raises(HttpError) as error:
        operations[operation]()
    assert error.value.status_code == 404
    record.refresh_from_db()
    assert record.user_rating == 7


def test_all_operations_scope_to_user(service: UserMovieDataService, user: User) -> None:
    movie = create_movie()
    other_record = create_user_movie_data(
        create_user(username="other"), movie, user_on_watchlist=True
    )
    assert service.get_user_movies(user).results == []
    assert service.get_all_user_movies(user).results == []
    own_record = service.create(user, movie.pk, user_rating=9)
    service.update(user, own_record.pk, user_liked=True)
    service.delete(user, own_record.pk)
    other_record.refresh_from_db()
    assert other_record.user_rating is None
    assert other_record.user_on_watchlist is True
    assert UserMovieData.objects.count() == 1
