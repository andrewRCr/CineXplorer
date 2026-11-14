"""Save, read and delete movie state using its catalogue identifier."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.db import close_old_connections, connection
from django.utils import timezone

from apps.core.exceptions import DomainError, InvalidInputError, NotFoundError, UpstreamError
from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import create_user
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def tmdb() -> TMDBStub:
    stub = TMDBStub()
    stub.add_movie(
        create_tmdb_movie_detail(
            550, "Stored card", "2023-01-01", 8.5, runtime=117, overview="Overview"
        )
    )
    return stub


@pytest.fixture
def service(tmdb: TMDBStub) -> UserMovieDataService:
    return UserMovieDataService(tmdb_client=tmdb)


@pytest.fixture
def user() -> User:
    return create_user()


def test_first_save_stores_card_and_default_user_state(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    record, created = service.save(user, 550, {"user_on_watchlist": True})
    assert created is True
    record.refresh_from_db()
    assert record.user_on_watchlist is True
    assert (
        record.user_watched,
        record.user_liked,
        record.user_rating,
    ) == (False, False, None)
    movie = Movie.objects.get(pk=550)
    assert (movie.title, movie.runtime, movie.overview, movie.vote_average, movie.vote_count) == (
        "Stored card",
        117,
        "Overview",
        8.5,
        100,
    )
    assert movie.refreshed_at is not None
    assert movie.refreshed_at <= timezone.now()
    assert tmdb.requested_endpoints == ["movie/550"]


def test_save_stored_movie_makes_no_request(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    create_movie()
    record, created = service.save(user, 550, {"user_liked": True})
    assert created is True
    assert record.user_liked is True
    assert tmdb.requested_ids == []


@pytest.mark.parametrize(
    ("status", "timeout", "expected", "http_status"),
    [
        (404, False, NotFoundError, 404),
        (400, False, InvalidInputError, 400),
        (422, False, InvalidInputError, 400),
        (500, False, UpstreamError, 502),
        (429, False, UpstreamError, 503),
        (504, True, UpstreamError, 504),
    ],
)
def test_tmdb_failure_writes_nothing(
    service: UserMovieDataService,
    user: User,
    tmdb: TMDBStub,
    status: int,
    timeout: bool,
    expected: type[DomainError],
    http_status: int,
) -> None:
    tmdb.add_error(550, status, timeout=timeout)
    with pytest.raises(expected) as error:
        service.save(user, 550, {"user_on_watchlist": True})
    assert error.value.status_code == http_status
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


def test_invalid_tmdb_data_writes_nothing(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    tmdb.details[550] = ApiResponse(status_code=200, data={"id": 550})
    with pytest.raises(UpstreamError) as error:
        service.save(user, 550, {"user_on_watchlist": True})
    assert error.value.status_code == 502
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


@pytest.mark.parametrize(
    "fields", [{}, {"unknown": True}, {"user_rating": 7, "user_watched": False}]
)
def test_body_only_errors_precede_tmdb(
    service: UserMovieDataService, user: User, tmdb: TMDBStub, fields: dict[str, object]
) -> None:
    with pytest.raises(InvalidInputError):
        service.save(user, 550, fields)
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()
    assert tmdb.requested_ids == []


def test_clearing_last_state_keeps_readable_record(
    service: UserMovieDataService, user: User
) -> None:
    record = create_user_movie_data(user, user_on_watchlist=True)
    service.save(user, 550, {"user_on_watchlist": False})
    result = service.get_by_tmdb_id(user, 550)
    assert result.pk == record.pk
    assert result.user_on_watchlist is False


def test_delete_by_tmdb_id_keeps_movie(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    create_user_movie_data(user)
    service.delete(user, 550)
    assert not UserMovieData.objects.exists()
    assert Movie.objects.filter(pk=550).exists()
    assert tmdb.requested_ids == []


@pytest.mark.parametrize("operation", ["read", "delete"])
def test_missing_record_does_not_call_tmdb(
    service: UserMovieDataService, user: User, tmdb: TMDBStub, operation: str
) -> None:
    action = service.get_by_tmdb_id if operation == "read" else service.delete
    with pytest.raises(NotFoundError):
        action(user, 550)
    assert tmdb.requested_ids == []


def test_operations_preserve_other_users_data(service: UserMovieDataService, user: User) -> None:
    movie = create_movie()
    other = create_user_movie_data(
        create_user(username="other"), movie, user_watched=True, user_rating=9
    )
    service.save(user, 550, {"user_rating": 3})
    assert service.get_by_tmdb_id(user, 550).user_rating == 3
    service.delete(user, 550)
    other.refresh_from_db()
    assert other.user_rating == 9
    assert UserMovieData.objects.count() == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_first_saves_merge_fields() -> None:
    barrier = Barrier(2)

    class OverlappingTMDB(TMDBStub):
        def get_movie_details(self, movie_id: int, **kwargs: object) -> ApiResponse:
            barrier.wait(timeout=10)
            return super().get_movie_details(movie_id, **kwargs)

    stub = OverlappingTMDB()
    stub.add_movie(create_tmdb_movie_detail(550, "Concurrent movie", "2023-01-01", 8.0))
    user = create_user()
    service = UserMovieDataService(tmdb_client=stub)

    def save(fields: dict[str, object]) -> bool:
        close_old_connections()
        try:
            return service.save(user, 550, fields)[1]
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        payloads: list[dict[str, object]] = [{"user_liked": True}, {"user_on_watchlist": True}]
        futures = [pool.submit(save, fields) for fields in payloads]
        created = [future.result(timeout=20) for future in futures]
    assert sorted(created) == [False, True]
    assert Movie.objects.count() == 1
    assert UserMovieData.objects.count() == 1
    record = UserMovieData.objects.get()
    assert record.user_liked is True
    assert record.user_on_watchlist is True


@pytest.mark.parametrize("field", ["title", "poster_path"])
def test_first_save_of_unstorable_card_writes_nothing(
    service: UserMovieDataService, user: User, tmdb: TMDBStub, field: str
) -> None:
    payload = create_tmdb_movie_detail(550, "Title", "2020-01-01", 8.0).model_dump()
    payload[field] = "x" * 256
    tmdb.details[550] = ApiResponse(status_code=200, data=payload)
    with pytest.raises(UpstreamError) as error:
        service.save(user, 550, {"user_on_watchlist": True})
    assert error.value.status_code == 502
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


@pytest.mark.parametrize(
    ("watched", "on_watchlist", "fields", "expected"),
    [
        (False, True, {"user_rating": 7}, (True, False, 7)),
        (False, True, {"user_watched": True}, (True, False, None)),
        (False, True, {"user_watched": True, "user_on_watchlist": True}, (True, True, None)),
        (True, True, {"user_rating": 7}, (True, True, 7)),
        (True, False, {"user_on_watchlist": True}, (True, True, None)),
    ],
)
def test_record_save_rules(
    service: UserMovieDataService,
    user: User,
    watched: bool,
    on_watchlist: bool,
    fields: dict[str, object],
    expected: tuple[bool, bool, int | None],
) -> None:
    record = create_user_movie_data(user, user_watched=watched, user_on_watchlist=on_watchlist)
    service.save(user, 550, fields)
    record.refresh_from_db()
    assert (record.user_watched, record.user_on_watchlist, record.user_rating) == expected


def test_contradictory_rating_precedes_tmdb(
    service: UserMovieDataService, user: User, tmdb: TMDBStub
) -> None:
    with pytest.raises(InvalidInputError, match="rating"):
        service.save(user, 550, {"user_watched": False, "user_rating": 7})
    assert tmdb.requested_ids == []
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


def test_unwatch_rated_record_changes_nothing(service: UserMovieDataService, user: User) -> None:
    from apps.core.exceptions import ConflictError

    record = create_user_movie_data(user, user_watched=True, user_rating=7)
    with pytest.raises(ConflictError, match="Clear the rating before marking this film unwatched"):
        service.save(user, 550, {"user_watched": False, "user_liked": True})
    record.refresh_from_db()
    assert record.user_watched
    assert not record.user_liked
    assert record.user_rating == 7


def test_unwatch_and_clear_rating_together(service: UserMovieDataService, user: User) -> None:
    record = create_user_movie_data(user, user_watched=True, user_rating=7)
    service.save(user, 550, {"user_watched": False, "user_rating": None})
    record.refresh_from_db()
    assert not record.user_watched
    assert record.user_rating is None


@pytest.mark.parametrize(
    ("flag", "stamp"),
    [
        ("user_watched", "watched_added_at"),
        ("user_on_watchlist", "watchlist_added_at"),
        ("user_liked", "liked_added_at"),
    ],
)
def test_list_join_timestamps(
    service: UserMovieDataService, user: User, flag: str, stamp: str
) -> None:
    from freezegun import freeze_time

    with freeze_time("2020-01-01 10:00:00"):
        record = create_user_movie_data(user)
        service.save(user, 550, {flag: True})
        record.refresh_from_db()
        first = timezone.now()
        assert getattr(record, stamp) == first
    with freeze_time("2020-02-01 10:00:00"):
        service.save(user, 550, {flag: True})
        record.refresh_from_db()
        assert getattr(record, stamp) == first
        service.save(user, 550, {flag: False})
        record.refresh_from_db()
        assert getattr(record, stamp) == first
        service.save(user, 550, {flag: True})
        record.refresh_from_db()
        assert getattr(record, stamp) == timezone.now()


def test_rating_rule_stamps_watched_join(service: UserMovieDataService, user: User) -> None:
    from freezegun import freeze_time

    create_movie()
    with freeze_time("2020-01-01 10:00:00"):
        record, _ = service.save(user, 550, {"user_rating": 7})
        assert record.watched_added_at == timezone.now()
    service.save(user, 550, {"user_rating": None})
    record.refresh_from_db()
    assert record.user_rating is None
    assert record.user_watched
