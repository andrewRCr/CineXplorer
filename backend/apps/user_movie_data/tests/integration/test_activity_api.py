"""Private dated activity pages retain deterministic order and bounded query cost."""

from datetime import date

import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.user_movie_data.models import UserMovieEntry
from apps.user_movie_data.schemas import ActivityQuerySchema
from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db
URL = "/api/user-movie-data/entries"


@pytest.fixture
def signed_in() -> tuple[Client, User]:
    user = create_user()
    client = Client()
    authenticate_client(client, user.username, "testpass123")
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
    return client, user


@pytest.fixture
def activity(signed_in: tuple[Client, User]) -> list[UserMovieEntry]:
    _, user = signed_in
    first = create_user_movie_data(
        user, create_movie(111, title="First film", poster_path="/first.jpg"), user_watched=True
    )
    second = create_user_movie_data(
        user,
        create_movie(222, title="Second film", release_date=None, poster_path=None),
        user_watched=True,
    )
    old = UserMovieEntry.objects.create(
        record=first, watched_on=date(2020, 1, 1), rating=5, made_on=timezone.now().date()
    )
    tie_first = UserMovieEntry.objects.create(
        record=first, watched_on=date(2020, 1, 3), rating=7, made_on=timezone.now().date()
    )
    tie_last = UserMovieEntry.objects.create(
        record=second,
        watched_on=date(2020, 1, 3),
        rating=8,
        review="Full review",
        rewatch=True,
        made_on=timezone.now().date(),
    )
    middle = UserMovieEntry.objects.create(
        record=second, watched_on=date(2020, 1, 2), made_on=timezone.now().date()
    )
    UserMovieEntry.objects.filter(pk__in=[tie_first.pk, tie_last.pk]).update(
        created_at=timezone.now()
    )
    UserMovieEntry.objects.create(record=first, review="Undated", made_on=timezone.now().date())
    other = create_user_movie_data(create_user(username="other"), first.movie, user_watched=True)
    UserMovieEntry.objects.create(
        record=other, watched_on=date(2020, 1, 4), made_on=timezone.now().date()
    )
    return [tie_last, tie_first, middle, old]


def test_activity_pages_dated_owned_entries(
    signed_in: tuple[Client, User], activity: list[UserMovieEntry]
) -> None:
    client, _ = signed_in
    response = client.get(URL, {"page_size": 2})
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"page", "total_pages", "total_results", "results"}
    assert (payload["page"], payload["total_pages"], payload["total_results"]) == (1, 2, 4)
    assert [entry["id"] for entry in payload["results"]] == [entry.pk for entry in activity[:2]]
    assert payload["results"][0] == {
        "id": activity[0].pk,
        "tmdb_id": 222,
        "watched_on": "2020-01-03",
        "rating": 8,
        "review": "Full review",
        "rewatch": True,
        "title": "Second film",
        "release_date": None,
        "poster_path": None,
    }
    second = client.get(URL, {"page": 2, "page_size": 2}).json()
    assert [entry["id"] for entry in second["results"]] == [entry.pk for entry in activity[2:]]
    assert second["results"][1]["title"] == "First film"
    assert second["results"][1]["poster_path"] == "/first.jpg"
    past = client.get(URL, {"page": 3, "page_size": 2}).json()
    assert past == {"page": 3, "total_pages": 2, "total_results": 4, "results": []}


@pytest.mark.parametrize(
    "query", [{"page": 0}, {"page": 1000001}, {"page_size": 0}, {"page_size": 101}]
)
def test_activity_bounds(signed_in: tuple[Client, User], query: dict[str, int]) -> None:
    client, _ = signed_in
    response = client.get(URL, query)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_activity_requires_authentication() -> None:
    assert Client().get(URL).status_code == 401


def test_activity_has_one_count_and_one_row_query(
    signed_in: tuple[Client, User], activity: list[UserMovieEntry]
) -> None:
    _, user = signed_in
    service = UserMovieEntryService()
    with CaptureQueriesContext(connection) as queries:
        result = service.get_activity(user, ActivityQuerySchema(page_size=2))
    assert len(queries) == 2
    assert [entry.id for entry in result.results] == [entry.pk for entry in activity[:2]]
    assert result.total_results == 4


def test_openapi_activity_contract() -> None:
    import json

    from django.core.serializers.json import DjangoJSONEncoder

    from config.api import api

    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value for key, value in schema["paths"].items() if key.endswith("/user-movie-data/entries")
    )
    assert {int(status) for status in path["get"]["responses"]} == {200, 401, 422}
