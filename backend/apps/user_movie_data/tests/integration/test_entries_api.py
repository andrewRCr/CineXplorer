"""Entry routes expose private history with shared errors and record summaries."""

import json
from collections.abc import Iterator
from unittest.mock import patch

import pytest
from django.core.serializers.json import DjangoJSONEncoder
from django.test import Client

from apps.core.models import Movie
from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.models import UserMovieData, UserMovieEntry
from apps.user_movie_data.tests.test_helpers import create_user_movie_data
from apps.users.models import User
from config.api import api

pytestmark = pytest.mark.django_db
URL = "/api/user-movie-data/550/entries"
BODY: dict[str, object] = {
    "watched_on": "2020-01-01",
    "rating": 7,
    "review": "Review",
    "liked": True,
    "time_zone": "UTC",
}


@pytest.fixture(autouse=True)
def tmdb() -> Iterator[TMDBStub]:
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(550, "Stored card", "2020-01-01", 8.0))
    with patch(TMDB_CLIENT_GET_MOVIE_DETAILS, side_effect=stub.get_movie_details):
        yield stub


@pytest.fixture
def signed_in() -> tuple[Client, User]:
    user = create_user()
    client = Client()
    authenticate_client(client, user.username, "testpass123")
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
    return client, user


def test_entry_create_returns_history_and_record(
    signed_in: tuple[Client, User], tmdb: TMDBStub
) -> None:
    client, user = signed_in
    response = client.post(URL, BODY, content_type="application/json")
    assert response.status_code == 201
    payload = response.json()
    assert payload["entry"] == {
        "id": UserMovieEntry.objects.get().pk,
        "tmdb_id": 550,
        "watched_on": "2020-01-01",
        "rating": 7,
        "review": "Review",
        "rewatch": False,
    }
    assert payload["record"] == {
        "tmdb_id": 550,
        "user_watched": True,
        "user_on_watchlist": False,
        "user_liked": True,
        "user_rating": 7,
        "has_entries": True,
        "last_logged_on": "2020-01-01",
    }
    assert UserMovieData.objects.get().user == user
    assert client.post(URL, BODY, content_type="application/json").status_code == 201
    assert UserMovieEntry.objects.count() == 2
    assert tmdb.requested_endpoints == ["movie/550"]


@pytest.mark.parametrize(
    "fields",
    [
        {"watched_on": None, "review": None},
        {"watched_on": None, "rewatch": True},
        {"watched_on": "2999-01-01"},
    ],
)
def test_create_invalid_semantics_precede_tmdb(
    signed_in: tuple[Client, User], tmdb: TMDBStub, fields: dict[str, object]
) -> None:
    client, _ = signed_in
    response = client.post(URL, {**BODY, **fields}, content_type="application/json")
    assert response.status_code == 400
    assert set(response.json()) == {"detail"}
    assert tmdb.requested_ids == []
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()
    assert not UserMovieEntry.objects.exists()


@pytest.mark.parametrize(
    "fields",
    [{"rating": 11}, {"review": "bad\x00review"}, {"time_zone": "Mars/Base"}, {"liked": None}],
)
def test_create_invalid_shape_is_422(
    signed_in: tuple[Client, User], fields: dict[str, object]
) -> None:
    client, _ = signed_in
    response = client.post(URL, {**BODY, **fields}, content_type="application/json")
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert not UserMovieEntry.objects.exists()


@pytest.mark.parametrize(
    ("status", "timeout", "expected"),
    [(400, False, 400), (404, False, 404), (500, False, 502), (429, False, 503), (504, True, 504)],
)
def test_create_upstream_errors(
    signed_in: tuple[Client, User], tmdb: TMDBStub, status: int, timeout: bool, expected: int
) -> None:
    client, _ = signed_in
    tmdb.add_error(550, status, timeout=timeout)
    response = client.post(URL, BODY, content_type="application/json")
    assert response.status_code == expected
    assert set(response.json()) == {"detail"}
    assert not UserMovieEntry.objects.exists()
    assert not UserMovieData.objects.exists()
    assert not Movie.objects.exists()


def test_create_requires_authentication() -> None:
    response = Client().post(URL, BODY, content_type="application/json")
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.parametrize("tmdb_id", ["0", "-1", "bad"])
def test_create_validates_movie_id(signed_in: tuple[Client, User], tmdb_id: str) -> None:
    client, _ = signed_in
    assert (
        client.post(
            f"/api/user-movie-data/{tmdb_id}/entries", BODY, content_type="application/json"
        ).status_code
        == 422
    )


def test_create_preserves_another_users_record(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    other = create_user_movie_data(create_user(username="other"), user_watched=True, user_rating=9)
    response = client.post(URL, BODY, content_type="application/json")
    assert response.status_code == 201
    other.refresh_from_db()
    assert other.user_rating == 9
    assert UserMovieEntry.objects.get().record.user == user


def test_openapi_entry_create_contract() -> None:
    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value
        for key, value in schema["paths"].items()
        if key.endswith("/user-movie-data/{tmdb_id}/entries")
    )
    responses = path["post"]["responses"]
    assert {int(status) for status in responses} == {201, 400, 401, 403, 404, 422, 502, 503, 504}
    for status, response in responses.items():
        if int(status) >= 400:
            assert (
                response["content"]["application/json"]["schema"]["$ref"]
                == "#/components/schemas/ErrorResponseSchema"
            )
