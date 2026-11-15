"""Private timeline reads merge viewings and undated reviews in a stable order."""

from datetime import UTC, date, datetime, timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.user_movie_data.models import UserMovieChange, UserMovieData, UserMovieEntry
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db
URL = "/api/user-movie-data/history"


@pytest.fixture
def signed_in() -> tuple[Client, User]:
    user = create_user()
    client = Client()
    authenticate_client(client, user.username, "testpass123")
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
    return client, user


def test_history_returns_owned_viewings_and_reviews(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    record = create_user_movie_data(
        user, create_movie(111, title="Stored film"), user_watched=True
    )
    viewing = UserMovieEntry.objects.create(
        record=record, watched_on=date(2020, 1, 1), made_on=date(2026, 11, 14), rating=7
    )
    review = UserMovieEntry.objects.create(
        record=record, review="An undated review", made_on=date(2020, 1, 2)
    )
    combined = UserMovieEntry.objects.create(
        record=record,
        watched_on=date(2020, 1, 3),
        made_on=date(2026, 11, 14),
        rating=9,
        review="Two lines\nA second line",
        rewatch=True,
    )
    other = create_user_movie_data(create_user(username="other"), record.movie)
    UserMovieEntry.objects.create(
        record=other, watched_on=date(2020, 1, 4), made_on=date(2020, 1, 4)
    )
    response = client.get(URL)
    assert response.status_code == 200
    data = response.json()
    assert (data["page"], data["total_pages"], data["total_results"]) == (1, 1, 3)
    assert [(row["id"], row["kind"], row["day"]) for row in data["results"]] == [
        (combined.pk, "viewing", "2020-01-03"),
        (review.pk, "review", "2020-01-02"),
        (viewing.pk, "viewing", "2020-01-01"),
    ]
    assert data["results"][0] == {
        "id": combined.pk,
        "kind": "viewing",
        "day": "2020-01-03",
        "tmdb_id": 111,
        "watched_on": "2020-01-03",
        "rating": 9,
        "review": "Two lines\nA second line",
        "rewatch": True,
        "title": "Stored film",
        "release_date": "2023-01-01",
        "poster_path": "/poster.jpg",
    }


def test_history_breaks_ties_by_created_time_kind_and_id(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    day = date(2020, 1, 1)
    viewing = UserMovieEntry.objects.create(record=record, watched_on=day, made_on=day)
    latest_viewing = UserMovieEntry.objects.create(record=record, watched_on=day, made_on=day)
    review = UserMovieEntry.objects.create(record=record, review="Review", made_on=day)
    newest_review = UserMovieEntry.objects.create(record=record, review="Newest", made_on=day)
    instant = timezone.now()
    UserMovieEntry.objects.filter(record=record).update(created_at=instant)
    UserMovieEntry.objects.filter(pk=newest_review.pk).update(
        created_at=instant + timedelta(seconds=1)
    )
    response = client.get(URL)
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["results"]] == [
        newest_review.pk,
        latest_viewing.pk,
        viewing.pk,
        review.pk,
    ]


def test_history_pages_and_keeps_counts_past_the_end(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    day = date(2020, 1, 1)
    entries = [
        UserMovieEntry.objects.create(record=record, watched_on=day, made_on=day)
        for _ in range(25)
    ]
    default = client.get(URL)
    assert default.status_code == 200
    assert len(default.json()["results"]) == 20
    page = client.get(URL, {"page": 2, "page_size": 10}).json()
    assert [row["id"] for row in page["results"]] == [
        entry.pk for entry in reversed(entries[5:15])
    ]
    assert (page["page"], page["total_pages"], page["total_results"]) == (2, 3, 25)
    past = client.get(URL, {"page": 999, "page_size": 10}).json()
    assert past == {"page": 999, "total_pages": 3, "total_results": 25, "results": []}


def test_empty_history_has_no_further_page(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    response = client.get(URL)
    assert response.status_code == 200
    assert response.json() == {"page": 1, "total_pages": 0, "total_results": 0, "results": []}


@pytest.mark.parametrize(
    "query", [{"page": 0}, {"page": 1000001}, {"page_size": 0}, {"page_size": 101}]
)
def test_history_bounds(signed_in: tuple[Client, User], query: dict[str, int]) -> None:
    client, _ = signed_in
    response = client.get(URL, query)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_history_requires_authentication() -> None:
    response = Client().get(URL)
    assert response.status_code == 401
    assert isinstance(response.json()["detail"], str)


@pytest.mark.parametrize("row_count", [10, 500])
def test_history_query_cost_is_independent_of_collection_size(
    signed_in: tuple[Client, User], row_count: int
) -> None:
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    from apps.user_movie_data.schemas import HistoryQuerySchema
    from apps.user_movie_data.services.user_movie_history_service import UserMovieHistoryService

    _, user = signed_in
    record = create_user_movie_data(user)
    day = date(2020, 1, 1)
    UserMovieEntry.objects.bulk_create(
        [UserMovieEntry(record=record, watched_on=day, made_on=day) for _ in range(row_count)]
    )
    with CaptureQueriesContext(connection) as queries:
        result = UserMovieHistoryService().get_history(user, HistoryQuerySchema(page_size=100))
    assert len(queries) == 2
    assert result.total_results == row_count
    assert len(result.results) == min(row_count, 100)


def test_openapi_history_contract() -> None:
    import json

    from django.core.serializers.json import DjangoJSONEncoder

    from config.api import api

    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value for key, value in schema["paths"].items() if key.endswith("/user-movie-data/history")
    )
    assert {int(status) for status in path["get"]["responses"]} == {200, 401, 422}
    assert "kind" in schema["components"]["schemas"]["HistoryChangesSchema"]["required"]
    group_paths = [
        value
        for key, value in schema["paths"].items()
        if key.endswith("/user-movie-data/history/changes")
    ]
    assert len(group_paths) == 1
    assert {int(status) for status in group_paths[0]["get"]["responses"]} == {200, 401, 422}


def change(
    record: UserMovieData,
    field: str = "watched",
    *,
    at: datetime = datetime(2020, 1, 1, tzinfo=UTC),
    day: date = date(2020, 1, 1),
    on: bool = True,
    from_entry: bool = False,
    rating: int | None = None,
) -> UserMovieChange:
    return UserMovieChange.objects.create(
        record=record,
        field=field,
        turned_on=on,
        rating=rating,
        from_entry=from_entry,
        created_at=at,
        made_on=day,
    )


def test_history_groups_private_record_turn_ons_and_excludes_other_changes(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    for index, field in enumerate(["watchlist", "watched", "liked", "rating"], 1001):
        record = create_user_movie_data(user, create_movie(index, title=f"Film {index}"))
        change(record, field, rating=8 if field == "rating" else None)
    change(create_user_movie_data(user, create_movie(2001)), on=False)
    change(create_user_movie_data(user, create_movie(2002)), "rating", rating=9, from_entry=True)
    change(create_user_movie_data(create_user(username="other-changes"), create_movie(3001)))
    response = client.get(URL)
    assert response.status_code == 200
    data = response.json()
    assert data["total_results"] == 4
    assert [(row["kind"], row["field"], row["count"]) for row in data["results"]] == [
        ("changes", field, 1) for field in ["watchlist", "watched", "liked", "rating"]
    ]
    assert data["results"][-1] == {
        "kind": "changes",
        "day": "2020-01-01",
        "field": "rating",
        "count": 1,
        "films": [
            {
                "tmdb_id": 1004,
                "title": "Film 1004",
                "poster_path": "/poster.jpg",
                "release_date": "2023-01-01",
                "rating": 8,
            }
        ],
    }


@pytest.mark.parametrize(
    ("field", "entry_rating_between", "reversal_from_entry"),
    [
        ("watched", False, False),
        ("watched", True, False),
        ("liked", False, True),
    ],
)
def test_history_hides_only_an_own_field_reversed_at_the_next_save(
    signed_in: tuple[Client, User],
    field: str,
    entry_rating_between: bool,
    reversal_from_entry: bool,
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record, field)
    if entry_rating_between:
        change(
            record, "rating", at=first.created_at + timedelta(minutes=1), rating=8, from_entry=True
        )
    change(
        record,
        field,
        at=first.created_at + timedelta(minutes=2),
        on=False,
        from_entry=reversal_from_entry,
    )
    assert client.get(URL).json()["results"] == []


def test_history_undoing_a_reversal_reveals_the_change_it_hid(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record)
    reversal = change(record, at=first.created_at + timedelta(minutes=1), on=False)
    assert client.get(URL).json()["results"] == []
    reversal.delete()
    rows = client.get(URL).json()["results"]
    assert [(row["field"], row["count"]) for row in rows] == [("watched", 1)]


def test_history_uses_the_latest_shown_rating_not_a_newer_hidden_rating(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record, "rating", rating=6)
    change(record, "watchlist", at=first.created_at + timedelta(minutes=1))
    change(record, "rating", at=first.created_at + timedelta(minutes=2), rating=9)
    change(record, "rating", at=first.created_at + timedelta(minutes=3), on=False)
    rows = client.get(URL).json()["results"]
    rating = next(row for row in rows if row["field"] == "rating")
    assert rating["count"] == 1
    assert rating["films"][0]["rating"] == 6


@pytest.mark.parametrize("entry_save", [False, True])
def test_history_ignores_later_reversals_after_an_intervening_other_field_save(
    signed_in: tuple[Client, User],
    entry_save: bool,
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record)
    if entry_save:
        # One entry write can change rating and remove a like at the same time.
        change(
            record, "rating", at=first.created_at + timedelta(minutes=1), rating=8, from_entry=True
        )
        change(
            record, "liked", at=first.created_at + timedelta(minutes=1), on=False, from_entry=True
        )
    else:
        change(record, "watchlist", at=first.created_at + timedelta(minutes=1))
    change(record, at=first.created_at + timedelta(minutes=2), on=False)
    rows = client.get(URL).json()["results"]
    assert next(row for row in rows if row["field"] == "watched")["count"] == 1


def test_history_keeps_only_the_new_like_after_unliking_and_reliking(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record, "liked")
    change(
        record, "liked", at=first.created_at + timedelta(days=1), day=date(2020, 1, 2), on=False
    )
    change(record, "liked", at=first.created_at + timedelta(days=2), day=date(2020, 1, 3))
    rows = client.get(URL).json()["results"]
    assert [(row["field"], row["day"], row["count"]) for row in rows] == [
        ("liked", "2020-01-03", 1)
    ]


@pytest.mark.parametrize("film_count", [4, 9])
def test_history_samples_one_whole_group_between_entry_pages(
    signed_in: tuple[Client, User],
    film_count: int,
) -> None:
    client, user = signed_in
    instant = datetime(2020, 1, 1, tzinfo=UTC)
    for index in range(1, film_count + 1):
        record = create_user_movie_data(user, create_movie(1000 + index))
        change(record, at=instant + timedelta(minutes=index))
    entry_record = create_user_movie_data(user, create_movie(2000))
    newest = UserMovieEntry.objects.create(
        record=entry_record, watched_on=date(2020, 1, 1), made_on=date(2020, 1, 1)
    )
    oldest = UserMovieEntry.objects.create(
        record=entry_record, watched_on=date(2020, 1, 1), made_on=date(2020, 1, 1)
    )
    UserMovieEntry.objects.filter(pk=newest.pk).update(
        created_at=instant + timedelta(minutes=film_count + 1)
    )
    UserMovieEntry.objects.filter(pk=oldest.pk).update(created_at=instant + timedelta(seconds=30))
    pages = [client.get(URL, {"page": page, "page_size": 1}).json() for page in range(1, 5)]
    assert [page["total_results"] for page in pages] == [3, 3, 3, 3]
    assert pages[0]["results"][0]["id"] == newest.pk
    group = pages[1]["results"][0]
    assert group["count"] == film_count
    assert [film["tmdb_id"] for film in group["films"]] == list(
        range(1000 + film_count, 1000 + film_count - min(8, film_count), -1)
    )
    assert pages[2]["results"][0]["id"] == oldest.pk
    assert pages[3]["results"] == []


def test_history_uses_stored_local_days_then_kind_for_ties(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    day = date(2020, 1, 1)
    instant = datetime(2020, 1, 2, 0, 30, tzinfo=UTC)
    record = create_user_movie_data(user)
    change(record, at=instant, day=day)
    viewing = UserMovieEntry.objects.create(record=record, watched_on=day, made_on=day)
    review = UserMovieEntry.objects.create(record=record, made_on=day, review="Review")
    UserMovieEntry.objects.filter(record=record).update(created_at=instant)
    rows = client.get(URL).json()["results"]
    assert [(row["kind"], row["day"]) for row in rows] == [
        ("viewing", "2020-01-01"),
        ("review", "2020-01-01"),
        ("changes", "2020-01-01"),
    ]
    assert rows[0]["id"] == viewing.pk
    assert rows[1]["id"] == review.pk


@pytest.mark.parametrize("row_count", [10, 500])
def test_history_mixed_page_takes_three_queries_with_any_collection_size(
    signed_in: tuple[Client, User],
    row_count: int,
) -> None:
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    from apps.user_movie_data.schemas import HistoryQuerySchema
    from apps.user_movie_data.services.user_movie_history_service import UserMovieHistoryService

    _, user = signed_in
    instant = datetime(2020, 1, 1, tzinfo=UTC)
    for index in range(row_count):
        record = create_user_movie_data(user, create_movie(index + 1000))
        UserMovieEntry.objects.create(
            record=record, watched_on=instant.date(), made_on=instant.date()
        )
        change(
            record,
            at=instant + timedelta(days=index % 100, minutes=1),
            day=instant.date() + timedelta(days=index % 100),
        )
    UserMovieEntry.objects.filter(record__user=user).update(created_at=instant)
    with CaptureQueriesContext(connection) as queries:
        result = UserMovieHistoryService().get_history(user, HistoryQuerySchema(page_size=100))
    assert len(queries) == 3
    assert result.total_results == row_count + min(row_count, 100)
    first = result.results[0]
    assert first.kind == "changes"
    assert first.count == (row_count + 99) // 100
    assert len(first.films) == first.count


def test_history_treats_multiple_fields_at_one_time_as_one_save(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record, "watchlist")
    change(record, "watched", at=first.created_at)
    change(record, "watchlist", at=first.created_at + timedelta(minutes=1), on=False)
    rows = client.get(URL).json()["results"]
    assert [(row["field"], row["count"]) for row in rows] == [("watched", 1)]


def test_history_uses_latest_rating_once_per_film_in_a_day(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    first = change(record, "rating", rating=6)
    change(record, "rating", at=first.created_at + timedelta(minutes=1), rating=9)
    rows = client.get(URL).json()["results"]
    assert len(rows) == 1
    assert rows[0]["count"] == 1
    assert rows[0]["films"][0]["rating"] == 9


CHANGES_URL = URL + "/changes"


def test_history_group_films_page_once_in_latest_order(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    instant = datetime(2020, 1, 1, tzinfo=UTC)
    records = [create_user_movie_data(user, create_movie(1001 + i)) for i in range(250)]
    for index, record in enumerate(records):
        change(record, "rating", at=instant + timedelta(seconds=index), rating=6)
    change(records[0], "rating", at=instant + timedelta(minutes=10), rating=9)
    hidden = create_user_movie_data(user, create_movie(9000))
    change(hidden, "rating", at=instant + timedelta(minutes=5), rating=7)
    change(hidden, "rating", at=instant + timedelta(days=1), day=date(2020, 1, 2), on=False)
    change(
        create_user_movie_data(create_user(username="other-group"), create_movie(9999)),
        "rating",
        rating=8,
    )
    pages = [
        client.get(
            CHANGES_URL, {"day": "2020-01-01", "field": "rating", "page": page, "page_size": 100}
        )
        for page in range(1, 5)
    ]
    assert [page.status_code for page in pages] == [200] * 4
    data = [page.json() for page in pages]
    assert [page["total_results"] for page in data] == [250] * 4
    assert [page["total_pages"] for page in data] == [3] * 4
    films = [film for page in data for film in page["results"]]
    assert [film["tmdb_id"] for film in films] == [1001, *range(1250, 1001, -1)]
    assert films[0]["rating"] == 9
    assert data[3]["results"] == []
    empty = client.get(CHANGES_URL, {"day": "2020-01-02", "field": "watchlist"}).json()
    assert empty == {"page": 1, "total_pages": 0, "total_results": 0, "results": []}


@pytest.mark.parametrize(
    "query",
    [
        {},
        {"day": "2020-01-01"},
        {"field": "watched"},
        {"day": "bad", "field": "watched"},
        {"day": "2020-01-01", "field": "unknown"},
        {"day": "2020-01-01", "field": "watched", "page_size": 101},
        {"day": "2020-01-01", "field": "watched", "page": 0},
    ],
)
def test_history_group_rejects_invalid_queries(
    signed_in: tuple[Client, User], query: dict[str, object]
) -> None:
    client, _ = signed_in
    response = client.get(CHANGES_URL, query)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_history_group_requires_authentication() -> None:
    response = Client().get(CHANGES_URL, {"day": "2020-01-01", "field": "watched"})
    assert response.status_code == 401
