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


def test_edit_and_delete_return_entry_and_updated_record(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    created = client.post(URL, {**BODY, "rewatch": True}, content_type="application/json").json()
    entry_id = created["entry"]["id"]
    response = client.put(
        f"{URL}/{entry_id}",
        {"review": "Only review", "liked": False, "time_zone": "America/Chicago"},
        content_type="application/json",
    )
    assert response.status_code == 200
    edited = response.json()
    assert edited["entry"] == {
        "id": entry_id,
        "tmdb_id": 550,
        "watched_on": None,
        "rating": None,
        "review": "Only review",
        "rewatch": False,
    }
    assert edited["record"]["user_rating"] == 7
    assert edited["record"]["last_logged_on"] is None
    assert not edited["record"]["user_liked"]
    assert edited["record"]["has_entries"]
    deleted = client.delete(f"{URL}/{entry_id}")
    assert deleted.status_code == 200
    assert deleted.json()["entry"] == edited["entry"]
    assert deleted.json()["record"] == {**edited["record"], "has_entries": False}
    assert client.delete(f"{URL}/{entry_id}").status_code == 404
    assert not UserMovieEntry.objects.exists()


@pytest.mark.parametrize("method", ["put", "delete"])
@pytest.mark.parametrize("target", ["other-user", "other-film", "missing"])
def test_entry_writes_hide_unowned_entries(
    signed_in: tuple[Client, User], method: str, target: str
) -> None:
    from datetime import date

    client, user = signed_in
    owner = create_user(username="other") if target == "other-user" else user
    record = create_user_movie_data(owner, user_watched=True)
    entry = UserMovieEntry.objects.create(
        record=record, review="Private", made_on=date(2020, 1, 1)
    )
    film_id = 551 if target == "other-film" else 550
    entry_id = entry.pk + 100 if target == "missing" else entry.pk
    response = getattr(client, method)(
        f"/api/user-movie-data/{film_id}/entries/{entry_id}", BODY, content_type="application/json"
    )
    assert response.status_code == 404
    assert set(response.json()) == {"detail"}
    entry.refresh_from_db()
    assert entry.review == "Private"


@pytest.mark.parametrize("method", ["put", "delete"])
def test_entry_writes_require_authentication(method: str) -> None:
    response = getattr(Client(), method)(f"{URL}/1", BODY, content_type="application/json")
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.parametrize("method", ["put", "delete"])
@pytest.mark.parametrize("entry_id", ["0", "-1", "bad"])
def test_entry_writes_validate_id(
    signed_in: tuple[Client, User], method: str, entry_id: str
) -> None:
    client, _ = signed_in
    assert (
        getattr(client, method)(
            f"{URL}/{entry_id}", BODY, content_type="application/json"
        ).status_code
        == 422
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"watched_on": None, "review": None},
        {"watched_on": None, "rewatch": True},
        {"watched_on": "2999-01-01"},
    ],
)
def test_edit_invalid_semantics_change_nothing(
    signed_in: tuple[Client, User], changes: dict[str, object]
) -> None:
    client, _ = signed_in
    entry_id = client.post(URL, BODY, content_type="application/json").json()["entry"]["id"]
    before_entry = UserMovieEntry.objects.values().get(pk=entry_id)
    before_record = UserMovieData.objects.values().get()
    response = client.put(
        f"{URL}/{entry_id}", {**BODY, **changes}, content_type="application/json"
    )
    assert response.status_code == 400
    assert UserMovieEntry.objects.values().get(pk=entry_id) == before_entry
    assert UserMovieData.objects.values().get() == before_record


def test_record_delete_removes_entries(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    assert client.post(URL, BODY, content_type="application/json").status_code == 201
    assert client.delete("/api/user-movie-data/550").status_code == 204
    assert not UserMovieEntry.objects.exists()
    assert not UserMovieData.objects.exists()
    assert Movie.objects.filter(pk=550).exists()


def test_openapi_entry_edit_and_delete_contract() -> None:
    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value
        for key, value in schema["paths"].items()
        if key.endswith("/user-movie-data/{tmdb_id}/entries/{entry_id}")
    )
    for method, statuses in [
        ("put", {200, 400, 401, 403, 404, 422}),
        ("delete", {200, 401, 403, 404, 422}),
    ]:
        responses = path[method]["responses"]
        assert {int(status) for status in responses} == statuses
        for status, response in responses.items():
            if int(status) >= 400:
                assert (
                    response["content"]["application/json"]["schema"]["$ref"]
                    == "#/components/schemas/ErrorResponseSchema"
                )


def test_film_entries_default_without_card_lookup(
    signed_in: tuple[Client, User], tmdb: TMDBStub
) -> None:
    client, _ = signed_in
    response = client.get(URL)
    assert response.status_code == 200
    assert response.json() == {
        "record": {
            "tmdb_id": 550,
            "user_watched": False,
            "user_on_watchlist": False,
            "user_liked": False,
            "user_rating": None,
            "has_entries": False,
            "last_logged_on": None,
        },
        "entries": [],
    }
    assert not Movie.objects.exists()
    assert tmdb.requested_ids == []


def test_film_entries_order_and_summary(signed_in: tuple[Client, User], tmdb: TMDBStub) -> None:
    from datetime import date

    from django.utils import timezone

    client, user = signed_in
    record = create_user_movie_data(user, user_watched=True)
    dated = UserMovieEntry.objects.create(
        record=record, watched_on=date(2020, 1, 2), rating=7, made_on=date(2020, 1, 1)
    )
    old = UserMovieEntry.objects.create(
        record=record, watched_on=date(2020, 1, 1), made_on=date(2020, 1, 1)
    )
    undated = UserMovieEntry.objects.create(
        record=record, review="Undated", made_on=date(2020, 1, 3)
    )
    tie = UserMovieEntry.objects.create(
        record=record, watched_on=date(2020, 1, 3), rewatch=True, made_on=date(2020, 1, 1)
    )
    UserMovieEntry.objects.filter(pk__in=[undated.pk, tie.pk]).update(created_at=timezone.now())
    response = client.get(URL)
    assert response.status_code == 200
    payload = response.json()
    assert [entry["id"] for entry in payload["entries"]] == [tie.pk, undated.pk, dated.pk, old.pk]
    assert payload["entries"][1]["review"] == "Undated"
    assert payload["record"]["has_entries"] is True
    assert payload["record"]["last_logged_on"] == "2020-01-03"
    assert tmdb.requested_ids == []


def test_film_entries_are_private(signed_in: tuple[Client, User]) -> None:
    from datetime import date

    client, _ = signed_in
    other = create_user_movie_data(create_user(username="other"), user_watched=True, user_rating=9)
    UserMovieEntry.objects.create(record=other, review="Private", made_on=date(2020, 1, 1))
    response = client.get(URL)
    assert response.status_code == 200
    assert response.json()["entries"] == []
    assert response.json()["record"]["user_rating"] is None
    assert not response.json()["record"]["has_entries"]


def test_film_entry_read_authentication_and_validation(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    assert Client().get(URL).status_code == 401
    for movie_id in ["0", "-1", "bad"]:
        assert client.get(f"/api/user-movie-data/{movie_id}/entries").status_code == 422


def test_film_entry_read_query_count_is_fixed(signed_in: tuple[Client, User]) -> None:
    from datetime import date

    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    client, user = signed_in
    record = create_user_movie_data(user, user_watched=True)
    UserMovieEntry.objects.create(record=record, review="First", made_on=date(2020, 1, 1))
    with CaptureQueriesContext(connection) as small:
        first = client.get(URL)
    for number in range(30):
        UserMovieEntry.objects.create(
            record=record, review=f"Review {number}", made_on=date(2020, 1, 1)
        )
    with CaptureQueriesContext(connection) as large:
        second = client.get(URL)
    assert len(first.json()["entries"]) == 1
    assert len(second.json()["entries"]) == 31
    assert len(small) == len(large)


def test_openapi_film_entries_read_contract() -> None:
    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value
        for key, value in schema["paths"].items()
        if key.endswith("/user-movie-data/{tmdb_id}/entries")
    )
    assert {int(status) for status in path["get"]["responses"]} == {200, 401, 422}
