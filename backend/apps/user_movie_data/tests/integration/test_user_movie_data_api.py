"""The authenticated save API is addressed only by TMDB ID."""

from __future__ import annotations

import json
from datetime import date
from unittest.mock import patch

import pytest
from django.core.serializers.json import DjangoJSONEncoder
from django.test import Client

from apps.core.models import Movie
from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.test_helpers import create_mock_error_response
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User
from config.api import api

pytestmark = pytest.mark.django_db
URL = "/api/user-movie-data/550"
STATE_FIELDS = {
    "tmdb_id",
    "user_watched",
    "user_on_watchlist",
    "user_liked",
    "user_rating",
    "user_review",
    "watched_at",
}


@pytest.fixture
def signed_in() -> tuple[Client, User]:
    user = create_user()
    client = Client()
    authenticate_client(client, user.username, "testpass123")
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
    return client, user


def test_first_save_then_update_read_and_delete(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    create_movie()
    first = client.patch(URL, {"user_on_watchlist": True}, content_type="application/json")
    assert first.status_code == 201
    assert first.json() == {
        "tmdb_id": 550,
        "user_watched": False,
        "user_on_watchlist": True,
        "user_liked": False,
        "user_rating": None,
        "user_review": None,
        "watched_at": None,
    }
    updated = client.patch(URL, {"user_rating": 9}, content_type="application/json")
    assert updated.status_code == 200
    assert updated.json()["user_on_watchlist"] is False
    assert updated.json()["user_rating"] == 9
    assert client.get(URL).json() == updated.json()
    assert UserMovieData.objects.filter(user=user).count() == 1
    deleted = client.delete(URL)
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert Movie.objects.filter(pk=550).exists()
    assert client.get(URL).status_code == 404
    assert client.delete(URL).status_code == 404


@pytest.mark.parametrize("full_state", [False, True])
@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("user_watched", True),
        ("user_on_watchlist", True),
        ("user_liked", True),
        ("user_rating", 7),
        ("user_review", "Updated"),
        ("watched_at", "2020-01-02"),
    ],
)
def test_each_field_can_be_set_from_empty_or_full_state(
    signed_in: tuple[Client, User], full_state: bool, field: str, value: object
) -> None:
    client, user = signed_in
    record = create_user_movie_data(
        user,
        user_watched=full_state,
        user_on_watchlist=full_state,
        user_liked=full_state,
        user_rating=9 if full_state else None,
        user_review="Old" if full_state else None,
        watched_at=date(2020, 1, 1) if full_state else None,
    )
    if full_state and field in {"user_watched", "user_on_watchlist", "user_liked"}:
        value = False
    payload = {field: value}
    if field == "user_watched" and value is False:
        payload["user_rating"] = None
    if field == "watched_at":
        payload["user_watched"] = True
    response = client.patch(URL, payload, content_type="application/json")
    assert response.status_code == 200
    assert response.json()[field] == value
    assert set(response.json()) == STATE_FIELDS
    record.refresh_from_db()
    assert UserMovieData.objects.count() == 1


@pytest.mark.parametrize("field", ["user_rating", "user_review", "watched_at"])
def test_explicit_null_clears_nullable_fields(signed_in: tuple[Client, User], field: str) -> None:
    client, user = signed_in
    create_user_movie_data(
        user, user_watched=True, user_rating=9, user_review="Old", watched_at=date(2020, 1, 1)
    )
    response = client.patch(URL, {field: None}, content_type="application/json")
    assert response.status_code == 200
    assert response.json()[field] is None
    assert response.json()["user_watched"] is True


@pytest.mark.parametrize(
    "payload",
    [
        {"user_watched": None},
        {"user_on_watchlist": None},
        {"user_liked": None},
        {"user_rating": 0},
        {"user_rating": 11},
        {"user_review": "a" * 10001},
        {"user_review": "bad\x00review"},
    ],
)
def test_invalid_field_is_422_without_writes(
    signed_in: tuple[Client, User], payload: dict[str, object]
) -> None:
    client, _ = signed_in
    response = client.patch(URL, payload, content_type="application/json")
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert isinstance(response.json()["detail"], str)
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


@pytest.mark.parametrize(
    "payload", [{}, {"unknown": True}, {"user_watched": False, "watched_at": "2020-01-01"}]
)
def test_invalid_body_semantics_are_400_without_writes(
    signed_in: tuple[Client, User], payload: dict[str, object]
) -> None:
    client, _ = signed_in
    response = client.patch(URL, payload, content_type="application/json")
    assert response.status_code == 400
    assert isinstance(response.json()["detail"], str)
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


def test_body_missing_and_malformed_json(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    assert client.patch(URL, content_type="application/json").status_code == 422
    response = client.patch(URL, "{", content_type="application/json")
    assert response.status_code == 400
    assert response.json() == {"detail": "Cannot parse request body"}


def test_watched_rule_depends_on_stored_state(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    record = create_user_movie_data(user)
    response = client.patch(URL, {"watched_at": "2020-01-01"}, content_type="application/json")
    assert response.status_code == 400
    record.refresh_from_db()
    assert record.watched_at is None
    record.user_watched = True
    record.watched_at = date(2020, 1, 1)
    record.save()
    response = client.patch(URL, {"user_watched": False}, content_type="application/json")
    assert response.status_code == 200
    assert response.json()["watched_at"] is None
    assert response.json()["user_watched"] is False
    response = client.patch(
        URL, {"user_watched": False, "watched_at": None}, content_type="application/json"
    )
    assert response.status_code == 200


def test_blank_review_clears_last_state_and_get_keeps_record(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    record = create_user_movie_data(user, user_review="Old")
    response = client.patch(URL, {"user_review": " \t\n"}, content_type="application/json")
    assert response.status_code == 200
    assert response.json()["user_review"] is None
    assert client.get(URL).json() == response.json()
    assert UserMovieData.objects.filter(pk=record.pk).exists()


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_routes_require_authentication(method: str) -> None:
    response = getattr(Client(), method)(
        URL, {"user_liked": True}, content_type="application/json"
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
@pytest.mark.parametrize("tmdb_id", ["0", "-1", "not-an-id"])
def test_tmdb_id_must_be_positive(
    signed_in: tuple[Client, User], method: str, tmdb_id: str
) -> None:
    client, _ = signed_in
    response = getattr(client, method)(
        f"/api/user-movie-data/{tmdb_id}", {"user_liked": True}, content_type="application/json"
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_ownership_for_reads_saves_and_deletes(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    other = create_user_movie_data(create_user(username="other"), user_rating=9)
    assert client.get(URL).status_code == 404
    assert client.delete(URL).status_code == 404
    response = client.patch(URL, {"user_rating": 3}, content_type="application/json")
    assert response.status_code == 201
    assert client.get(URL).json()["user_rating"] == 3
    assert client.delete(URL).status_code == 204
    other.refresh_from_db()
    assert other.user_rating == 9
    assert UserMovieData.objects.count() == 1


@pytest.mark.parametrize(("status", "expected"), [(404, 404), (500, 502)])
def test_failed_tmdb_lookup_returns_shared_error_without_writes(
    signed_in: tuple[Client, User], status: int, expected: int
) -> None:
    client, _ = signed_in
    with patch(
        TMDB_CLIENT_GET_MOVIE_DETAILS,
        return_value=create_mock_error_response(status, error_message="private upstream text"),
    ):
        response = client.patch(URL, {"user_on_watchlist": True}, content_type="application/json")
    assert response.status_code == expected
    assert response.json() == {
        "detail": "Resource not found" if status == 404 else "External API error"
    }
    assert "private upstream text" not in response.content.decode()
    assert not Movie.objects.exists()
    assert not UserMovieData.objects.exists()


def test_movies_route_precedes_tmdb_id_route(signed_in: tuple[Client, User]) -> None:
    client, _ = signed_in
    assert client.get("/api/user-movie-data/movies").status_code == 200


def test_openapi_declares_exact_statuses_and_shared_errors() -> None:
    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value
        for key, value in schema["paths"].items()
        if key.endswith("/user-movie-data/{tmdb_id}")
    )
    expected = {
        "get": {200, 401, 404, 422},
        "patch": {200, 201, 400, 401, 403, 404, 409, 422, 429, 502, 503, 504},
        "delete": {204, 401, 403, 404, 422},
    }
    for method, statuses in expected.items():
        responses = path[method]["responses"]
        assert {int(status) for status in responses} == statuses
        for status, response in responses.items():
            if int(status) >= 400:
                assert (
                    response["content"]["application/json"]["schema"]["$ref"]
                    == "#/components/schemas/ErrorResponseSchema"
                )


def test_rating_marks_watched_and_removes_watchlist(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    create_user_movie_data(user, user_on_watchlist=True)
    response = client.patch(URL, {"user_rating": 7}, content_type="application/json")
    assert response.status_code == 200
    assert response.json()["user_watched"] is True
    assert response.json()["user_on_watchlist"] is False


def test_unwatch_rating_errors_and_explicit_clear(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    record = create_user_movie_data(user, user_watched=True, user_rating=7)
    response = client.patch(URL, {"user_watched": False}, content_type="application/json")
    assert response.status_code == 409
    assert response.json() == {"detail": "Clear the rating before marking this film unwatched"}
    record.refresh_from_db()
    assert record.user_watched
    assert record.user_rating == 7
    response = client.patch(
        URL, {"user_watched": False, "user_rating": 3}, content_type="application/json"
    )
    assert response.status_code == 400
    response = client.patch(
        URL, {"user_watched": False, "user_rating": None}, content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["user_watched"] is False
    assert response.json()["user_rating"] is None
