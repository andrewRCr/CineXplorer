"""Record private movie changes at the save boundary, on the visitor's day."""

from datetime import date

import pytest
from freezegun import freeze_time

from apps.core.exceptions import ConflictError, InvalidInputError
from apps.core.tests.test_helpers import create_user
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.models import UserMovieChange
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user() -> User:
    return create_user()


@pytest.fixture
def tmdb() -> TMDBStub:
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(550, "Stored", "2020-01-01", 8.0))
    return stub


@pytest.fixture
def service(tmdb: TMDBStub) -> UserMovieDataService:
    return UserMovieDataService(tmdb_client=tmdb)


def rows() -> list[tuple[str, bool, int | None, bool]]:
    return list(
        UserMovieChange.objects.order_by("field").values_list(
            "field", "turned_on", "rating", "from_entry"
        )
    )


@pytest.mark.parametrize(
    ("before", "fields", "expected"),
    [
        (None, {"user_on_watchlist": True}, [("watchlist", True, None, False)]),
        (
            {"user_on_watchlist": True},
            {"user_on_watchlist": False},
            [("watchlist", False, None, False)],
        ),
        ({"user_on_watchlist": True}, {"user_watched": True}, [("watched", True, None, False)]),
        (
            {"user_on_watchlist": True},
            {"user_watched": True, "user_on_watchlist": True},
            [("watched", True, None, False)],
        ),
        ({"user_on_watchlist": True}, {"user_rating": 8}, [("rating", True, 8, False)]),
        ({"user_on_watchlist": True}, {"user_liked": True}, [("liked", True, None, False)]),
        (
            {"user_watched": True, "user_rating": 8},
            {"user_rating": 7},
            [("rating", True, 7, False)],
        ),
        (
            {"user_watched": True, "user_rating": 8},
            {"user_rating": None},
            [("rating", False, None, False)],
        ),
        (
            {"user_watched": True, "user_liked": True},
            {"user_watched": False},
            [("liked", False, None, False), ("watched", False, None, False)],
        ),
        (
            {"user_watched": True, "user_liked": True},
            {"user_liked": False},
            [("liked", False, None, False)],
        ),
    ],
)
def test_record_save_records_only_the_visitors_changes(
    service: UserMovieDataService,
    user: User,
    before: dict[str, object] | None,
    fields: dict[str, object],
    expected: list[tuple[str, bool, int | None, bool]],
) -> None:
    if before is not None:
        create_user_movie_data(user, create_movie(), **before)
    service.save(user, 550, fields)
    assert rows() == expected


@pytest.mark.parametrize(
    "fields", [{"user_watched": True}, {"user_liked": True}, {"user_rating": 8}]
)
def test_unchanged_values_record_nothing(
    service: UserMovieDataService, user: User, fields: dict[str, object]
) -> None:
    create_user_movie_data(user, user_watched=True, user_liked=True, user_rating=8)
    service.save(user, 550, fields)
    assert rows() == []


@pytest.mark.parametrize("conflict", [False, True])
def test_refused_save_records_nothing(
    service: UserMovieDataService, user: User, conflict: bool
) -> None:
    create_user_movie_data(user, user_watched=True, user_rating=8)
    fields: dict[str, object] = {"user_watched": False}
    if not conflict:
        fields["user_liked"] = True
    with pytest.raises(ConflictError if conflict else InvalidInputError):
        service.save(user, 550, fields)
    assert rows() == []


def test_one_save_shares_its_time_with_rows_and_join_stamps(
    service: UserMovieDataService, user: User
) -> None:
    create_movie()
    with freeze_time("2020-01-01 12:00:00", auto_tick_seconds=1):
        record, _ = service.save(user, 550, {"user_watched": True, "user_on_watchlist": True})
    changes = list(UserMovieChange.objects.all())
    assert len(changes) == 2
    assert {change.created_at for change in changes} == {record.watched_added_at}
    assert record.watchlist_added_at == record.watched_added_at


@pytest.mark.parametrize(
    ("fields", "day"),
    [
        ({}, date(2020, 1, 1)),
        ({"time_zone": None}, date(2020, 1, 1)),
        ({"time_zone": "Pacific/Auckland"}, date(2020, 1, 2)),
    ],
)
def test_changes_keep_the_visitors_day_or_utc_fallback(
    service: UserMovieDataService, user: User, fields: dict[str, object], day: date
) -> None:
    with freeze_time("2020-01-01 12:00:00"):
        service.save(user, 550, {"user_on_watchlist": True, **fields})
    assert UserMovieChange.objects.get().made_on == day


@pytest.mark.parametrize("operation", ["create", "edit"])
def test_entry_write_records_rating_on_its_own_day(
    user: User, tmdb: TMDBStub, operation: str
) -> None:
    from apps.user_movie_data.models import UserMovieEntry
    from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
    from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService

    service = UserMovieEntryService(tmdb_client=tmdb)
    payload = UserMovieEntryWriteSchema(
        review="Seen", rating=8, liked=False, time_zone="Pacific/Auckland"
    )
    with freeze_time("2020-01-01 12:00:00"):
        if operation == "create":
            service.create(user, 550, payload)
        else:
            record = create_user_movie_data(user, user_watched=True, user_rating=7)
            entry = UserMovieEntry.objects.create(
                record=record, review="Before", rating=7, made_on=date(2020, 1, 1)
            )
            service.edit(user, 550, entry.pk, payload)
    assert rows() == [("rating", True, 8, True)]
    assert UserMovieChange.objects.get().made_on == date(2020, 1, 2)


@pytest.mark.parametrize("operation", ["create", "edit"])
def test_entry_write_records_like_removal(user: User, tmdb: TMDBStub, operation: str) -> None:
    from apps.user_movie_data.models import UserMovieEntry
    from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
    from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService

    record = create_user_movie_data(user, user_watched=True, user_liked=True)
    service = UserMovieEntryService(tmdb_client=tmdb)
    payload = UserMovieEntryWriteSchema(review="Seen", liked=False, time_zone="Pacific/Auckland")
    with freeze_time("2020-01-01 12:00:00"):
        if operation == "create":
            service.create(user, 550, payload)
        else:
            entry = UserMovieEntry.objects.create(
                record=record, review="Before", made_on=date(2020, 1, 1)
            )
            service.edit(user, 550, entry.pk, payload)
    assert rows() == [("liked", False, None, True)]
    assert UserMovieChange.objects.get().made_on == date(2020, 1, 2)


def test_backdated_entry_does_not_record_rating(user: User, tmdb: TMDBStub) -> None:
    from apps.user_movie_data.models import UserMovieEntry
    from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
    from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService

    record = create_user_movie_data(user, user_watched=True, user_rating=9)
    UserMovieEntry.objects.create(
        record=record, watched_on=date(2020, 1, 2), rating=9, made_on=date(2020, 1, 2)
    )
    UserMovieEntryService(tmdb_client=tmdb).create(
        user,
        550,
        UserMovieEntryWriteSchema(
            watched_on=date(2020, 1, 1),
            rating=5,
            liked=False,
            time_zone="UTC",
        ),
    )
    record.refresh_from_db()
    assert record.user_rating == 9
    assert rows() == []


def test_entry_marks_and_watchlist_removal_record_nothing(user: User, tmdb: TMDBStub) -> None:
    from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
    from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService

    record = create_user_movie_data(user, user_on_watchlist=True)
    response = UserMovieEntryService(tmdb_client=tmdb).create(
        user,
        550,
        UserMovieEntryWriteSchema(
            review="Seen",
            liked=True,
            time_zone="UTC",
        ),
    )
    assert response.record.user_watched
    assert response.record.user_liked
    record.refresh_from_db()
    assert not record.user_on_watchlist
    assert rows() == []


@pytest.mark.parametrize("operation", ["review", "delete"])
def test_entry_review_edit_or_delete_records_nothing(
    user: User, tmdb: TMDBStub, operation: str
) -> None:
    from apps.user_movie_data.models import UserMovieEntry
    from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
    from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService

    record = create_user_movie_data(user, user_watched=True, user_rating=8)
    entry = UserMovieEntry.objects.create(
        record=record, review="Before", rating=8, made_on=date(2020, 1, 1)
    )
    service = UserMovieEntryService(tmdb_client=tmdb)
    if operation == "review":
        service.edit(
            user,
            550,
            entry.pk,
            UserMovieEntryWriteSchema(review="After", rating=8, liked=False, time_zone="UTC"),
        )
    else:
        service.delete(user, 550, entry.pk)
    assert rows() == []


@pytest.mark.parametrize("removal", [False, True])
def test_undo_watchlist_change_erases_only_its_latest_row(
    service: UserMovieDataService, user: User, removal: bool
) -> None:
    with freeze_time("2020-01-01 12:00:00") as clock:
        service.save(user, 550, {"user_on_watchlist": True})
        original = UserMovieChange.objects.get()
        clock.tick(1)
        if removal:
            service.save(user, 550, {"user_on_watchlist": False})
            clock.tick(1)
        service.save(user, 550, {"user_on_watchlist": removal, "undo": True})
    assert list(UserMovieChange.objects.values_list("pk", flat=True)) == (
        [original.pk] if removal else []
    )


def test_undo_rule_removal_keeps_the_original_addition(
    service: UserMovieDataService, user: User
) -> None:
    with freeze_time("2020-01-01 12:00:00") as clock:
        service.save(user, 550, {"user_on_watchlist": True})
        clock.tick(1)
        service.save(user, 550, {"user_rating": 8})
        before = list(UserMovieChange.objects.order_by("pk").values())
        clock.tick(1)
        service.save(user, 550, {"user_on_watchlist": True, "undo": True})
    assert list(UserMovieChange.objects.order_by("pk").values()) == before


def test_undo_like_keeps_watchlist_addition(service: UserMovieDataService, user: User) -> None:
    with freeze_time("2020-01-01 12:00:00") as clock:
        service.save(user, 550, {"user_on_watchlist": True})
        original = UserMovieChange.objects.get().pk
        clock.tick(1)
        service.save(user, 550, {"user_liked": True})
        clock.tick(1)
        record, _ = service.save(
            user,
            550,
            {
                "user_liked": False,
                "user_watched": False,
                "user_on_watchlist": True,
                "undo": True,
            },
        )
    assert not record.user_liked
    assert not record.user_watched
    assert record.user_on_watchlist
    assert list(UserMovieChange.objects.values_list("pk", flat=True)) == [original]


@pytest.mark.parametrize("earlier_rating", [None, 7])
def test_undo_logging_erases_entry_rating_change(
    service: UserMovieDataService, user: User, tmdb: TMDBStub, earlier_rating: int | None
) -> None:
    from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
    from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService

    entries = UserMovieEntryService(tmdb_client=tmdb)
    with freeze_time("2020-01-01 12:00:00") as clock:
        service.save(user, 550, {"user_rating": earlier_rating})
        before = list(UserMovieChange.objects.values())
        clock.tick(1)
        result = entries.create(
            user,
            550,
            UserMovieEntryWriteSchema(
                rating=8,
                review="Seen",
                liked=False,
                time_zone="UTC",
            ),
        )
        assert UserMovieChange.objects.filter(field="rating", from_entry=True).exists()
        entries.delete(user, 550, result.entry.id)
        clock.tick(1)
        record, _ = service.save(user, 550, {"user_rating": earlier_rating, "undo": True})
    assert record.user_rating == earlier_rating
    assert list(UserMovieChange.objects.values()) == before


def test_undo_unchanged_field_keeps_its_rows(service: UserMovieDataService, user: User) -> None:
    with freeze_time("2020-01-01 12:00:00") as clock:
        service.save(user, 550, {"user_on_watchlist": True})
        clock.tick(1)
        service.save(user, 550, {"user_on_watchlist": False})
        before = list(UserMovieChange.objects.order_by("pk").values())
        clock.tick(1)
        service.save(user, 550, {"user_on_watchlist": False, "undo": True})
    assert list(UserMovieChange.objects.order_by("pk").values()) == before


def test_undo_unwatch_records_omitted_like_removal(
    service: UserMovieDataService, user: User
) -> None:
    create_user_movie_data(user, user_watched=True, user_liked=True)
    service.save(user, 550, {"user_watched": False, "undo": True})
    assert rows() == [("liked", False, None, False)]


def test_like_and_undo_through_api_keep_only_original_addition(user: User) -> None:
    from django.test import Client

    from apps.core.tests.test_helpers import authenticate_client, get_csrf_token
    from apps.user_movie_data.models import UserMovieData

    create_movie()
    client = Client()
    with freeze_time("2020-01-01 12:00:00") as clock:
        authenticate_client(client, user.username, "testpass123")
        client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
        url = "/api/user-movie-data/550"
        response = client.patch(url, {"user_on_watchlist": True}, content_type="application/json")
        assert response.status_code == 201
        addition = UserMovieChange.objects.get()
        clock.tick(1)
        response = client.patch(
            url,
            {"user_liked": True, "time_zone": "Pacific/Auckland"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["user_watched"] is True
        assert response.json()["user_liked"] is True
        assert response.json()["user_on_watchlist"] is False
        assert rows() == [("liked", True, None, False), ("watchlist", True, None, False)]
        assert UserMovieChange.objects.get(field="liked").made_on == date(2020, 1, 2)
        clock.tick(1)
        response = client.patch(
            url,
            {
                "user_liked": False,
                "user_watched": False,
                "user_on_watchlist": True,
                "undo": True,
                "time_zone": "Pacific/Auckland",
            },
            content_type="application/json",
        )
        assert response.status_code == 200
    record = UserMovieData.objects.get(user=user)
    for value in [
        response.json(),
        {
            "user_watched": record.user_watched,
            "user_liked": record.user_liked,
            "user_on_watchlist": record.user_on_watchlist,
        },
    ]:
        assert value["user_watched"] is False
        assert value["user_liked"] is False
        assert value["user_on_watchlist"] is True
    assert list(UserMovieChange.objects.values_list("pk", flat=True)) == [addition.pk]


@pytest.mark.parametrize("tied", [False, True])
def test_undo_selects_latest_by_time_then_id(
    service: UserMovieDataService, user: User, tied: bool
) -> None:
    from datetime import UTC, datetime

    record = create_user_movie_data(user, user_on_watchlist=True)
    fields: dict[str, object] = {
        "record": record,
        "field": "watchlist",
        "from_entry": False,
        "made_on": date(2020, 1, 1),
    }
    first = datetime(2020, 1, 1, tzinfo=UTC)
    last = datetime(2020, 1, 2, tzinfo=UTC)
    if tied:
        older = UserMovieChange.objects.create(**fields, created_at=first, turned_on=False)
        latest = UserMovieChange.objects.create(**fields, created_at=first, turned_on=True)
    else:
        latest = UserMovieChange.objects.create(**fields, created_at=last, turned_on=True)
        older = UserMovieChange.objects.create(**fields, created_at=first, turned_on=False)
    service.save(user, 550, {"user_on_watchlist": False, "undo": True})
    assert not UserMovieChange.objects.filter(pk=latest.pk).exists()
    assert list(UserMovieChange.objects.values_list("pk", flat=True)) == [older.pk]
