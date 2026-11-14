"""Viewing history writes exercise real transactions and the TMDB boundary."""

from datetime import UTC, date, datetime

import pytest
from freezegun import freeze_time

from apps.core.exceptions import DomainError, InvalidInputError
from apps.core.models import Movie
from apps.core.tests.test_helpers import create_user
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.models import UserMovieData, UserMovieEntry
from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService
from apps.user_movie_data.tests.test_helpers import create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user() -> User:
    return create_user()


@pytest.fixture
def tmdb() -> TMDBStub:
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(550, "Stored card", "2020-01-01", 8.0))
    return stub


@pytest.fixture
def service(tmdb: TMDBStub) -> UserMovieEntryService:
    return UserMovieEntryService(tmdb_client=tmdb)


def body(**changes: object) -> UserMovieEntryWriteSchema:
    return UserMovieEntryWriteSchema.model_validate(
        {"watched_on": "2020-01-01", "liked": False, "time_zone": "UTC", **changes}
    )


def test_first_entry_fetches_card_once_and_retains_viewing(
    service: UserMovieEntryService, user: User, tmdb: TMDBStub
) -> None:
    with freeze_time("2020-02-01 12:00:00"):
        result = service.create(user, 550, body(rating=7, review="  A review  ", liked=True))
    entry = UserMovieEntry.objects.get()
    record = UserMovieData.objects.get()
    assert (entry.watched_on, entry.rating, entry.review, entry.rewatch, entry.made_on) == (
        date(2020, 1, 1),
        7,
        "  A review  ",
        False,
        date(2020, 2, 1),
    )
    assert record.user_watched
    assert record.user_liked
    assert record.user_rating == 7
    assert record.watched_added_at == datetime(2020, 2, 1, 12, tzinfo=UTC)
    assert record.liked_added_at == record.watched_added_at
    assert result.record.has_entries
    assert result.record.last_logged_on == date(2020, 1, 1)
    assert result.entry.id == entry.pk
    service.create(user, 550, body())
    assert tmdb.requested_endpoints == ["movie/550"]
    assert Movie.objects.get(pk=550).title == "Stored card"


@pytest.mark.parametrize(
    ("watched", "watched_on", "expected_watchlist"),
    [
        (False, None, False),
        (True, None, True),
        (False, "2020-01-01", True),
        (True, "2020-01-01", True),
        (False, "2020-01-02", False),
        (True, "2020-01-02", False),
        (True, "2020-01-03", False),
    ],
)
def test_create_watchlist_rules(
    service: UserMovieEntryService,
    user: User,
    watched: bool,
    watched_on: str | None,
    expected_watchlist: bool,
) -> None:
    record = create_user_movie_data(
        user,
        user_watched=watched,
        user_on_watchlist=True,
        watchlist_added_at=datetime(2020, 1, 2, 12, tzinfo=UTC),
    )
    service.create(user, 550, body(watched_on=watched_on, review="Review"))
    record.refresh_from_db()
    assert record.user_watched
    assert record.user_on_watchlist is expected_watchlist


@pytest.mark.parametrize(
    "changes",
    [
        {"watched_on": None},
        {"watched_on": None, "review": "Review", "rewatch": True},
        {"watched_on": "2020-02-02"},
    ],
)
def test_invalid_entry_does_not_fetch_or_write(
    service: UserMovieEntryService, user: User, tmdb: TMDBStub, changes: dict[str, object]
) -> None:
    with freeze_time("2020-02-01 12:00:00"), pytest.raises(InvalidInputError):
        service.create(user, 550, body(**changes))
    assert tmdb.requested_ids == []
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()
    assert not UserMovieEntry.objects.exists()


@pytest.mark.parametrize(
    ("status", "timeout", "expected"),
    [(404, False, 404), (400, False, 400), (500, False, 502), (429, False, 503), (504, True, 504)],
)
def test_entry_tmdb_failure_writes_nothing(
    service: UserMovieEntryService,
    user: User,
    tmdb: TMDBStub,
    status: int,
    timeout: bool,
    expected: int,
) -> None:
    tmdb.add_error(550, status, timeout=timeout)
    with pytest.raises(DomainError) as error:
        service.create(user, 550, body())
    assert error.value.status_code == expected
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()
    assert not UserMovieEntry.objects.exists()


def test_current_rating_uses_latest_effective_date(
    service: UserMovieEntryService, user: User
) -> None:
    record = create_user_movie_data(user, user_watched=True, user_rating=3)
    with freeze_time("2020-02-01 12:00:00"):
        latest = service.create(user, 550, body(watched_on="2020-01-20", rating=7))
        service.create(user, 550, body(watched_on="2020-01-01", rating=9))
        service.create(user, 550, body(watched_on="2020-01-21"))
        record.refresh_from_db()
        assert record.user_rating == 7
        service.create(user, 550, body(watched_on=None, review="Undated", rating=8))
        record.refresh_from_db()
        assert record.user_rating == 8
        service.create(user, 550, body(watched_on=None, review="Same-day later", rating=10))
        record.refresh_from_db()
        assert record.user_rating == 10
    assert UserMovieEntry.objects.get(pk=latest.entry.id).rating == 7


def test_time_zone_today_and_made_on(service: UserMovieEntryService, user: User) -> None:
    with freeze_time("2020-01-01 12:00:00"):
        result = service.create(
            user, 550, body(watched_on="2020-01-02", time_zone="Pacific/Kiritimati")
        )
        assert UserMovieEntry.objects.get(pk=result.entry.id).made_on == date(2020, 1, 2)
        with pytest.raises(InvalidInputError):
            service.create(
                user, 550, body(watched_on="2020-01-03", time_zone="Pacific/Kiritimati")
            )
        undated = service.create(
            user, 550, body(watched_on=None, review="Review", time_zone="Pacific/Kiritimati")
        )
        assert UserMovieEntry.objects.get(pk=undated.entry.id).made_on == date(2020, 1, 2)


def test_watchlist_join_day_is_local(service: UserMovieEntryService, user: User) -> None:
    record = create_user_movie_data(
        user,
        user_watched=True,
        user_on_watchlist=True,
        watchlist_added_at=datetime(2020, 1, 2, 4, tzinfo=UTC),
    )
    service.create(user, 550, body(watched_on="2020-01-01", time_zone="America/Chicago"))
    record.refresh_from_db()
    assert not record.user_on_watchlist


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("first", ["create", "unwatch"])
def test_entry_create_and_unwatch_serialize_on_parent(
    service: UserMovieEntryService, user: User, tmdb: TMDBStub, first: str
) -> None:
    import time
    from concurrent.futures import ThreadPoolExecutor

    from django.db import close_old_connections, connection, transaction

    from apps.core.exceptions import ConflictError
    from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService

    record = create_user_movie_data(user, user_watched=True)

    def run(operation: str) -> int:
        close_old_connections()
        try:
            if operation == "create":
                service.create(user, 550, body())
                return 201
            try:
                UserMovieDataService(tmdb_client=tmdb).save(user, 550, {"user_watched": False})
                return 200
            except ConflictError:
                return 409
        finally:
            connection.close()

    def wait_for_waiters(expected: int) -> None:
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_stat_clear_snapshot()")
                cursor.execute(
                    "SELECT count(*) FROM pg_stat_activity "
                    "WHERE datname = current_database() AND pid <> pg_backend_pid() "
                    "AND wait_event_type = 'Lock'"
                )
                row = cursor.fetchone()
            if row is not None and row[0] >= expected:
                return
            time.sleep(0.01)
        raise AssertionError(f"Expected {expected} blocked database writers")

    second = "unwatch" if first == "create" else "create"
    with ThreadPoolExecutor(max_workers=2) as pool:
        with transaction.atomic():
            UserMovieData.objects.select_for_update().get(pk=record.pk)
            first_result = pool.submit(run, first)
            wait_for_waiters(1)
            second_result = pool.submit(run, second)
            wait_for_waiters(2)
        statuses = {
            first: first_result.result(timeout=20),
            second: second_result.result(timeout=20),
        }
    assert statuses == {"create": 201, "unwatch": 409 if first == "create" else 200}
    record.refresh_from_db()
    assert record.user_watched
    assert UserMovieEntry.objects.filter(record=record).count() == 1
    assert tmdb.requested_ids == []
