"""Private timeline reads merge viewings and undated reviews in a stable order."""

from datetime import date, timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.user_movie_data.models import UserMovieEntry
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
