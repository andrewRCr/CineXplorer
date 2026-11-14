"""Library filtering, ordering and pagination read stored cards without TMDB."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, date, datetime
from unittest.mock import Mock, patch

import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.test_helpers import create_mock_error_response
from apps.user_movie_data.models import UserMovieData, UserMovieEntry
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User
from config.api import api

pytestmark = pytest.mark.django_db
URL = "/api/user-movie-data/movies"


@pytest.fixture(autouse=True)
def no_tmdb() -> Iterator[Mock]:
    with patch(
        TMDB_CLIENT_GET_MOVIE_DETAILS, return_value=create_mock_error_response(500)
    ) as boundary:
        yield boundary
        boundary.assert_not_called()


@pytest.fixture
def signed_in() -> tuple[Client, User]:
    user = create_user()
    client = Client()
    authenticate_client(client, user.username, "testpass123")
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
    return client, user


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ({}, {111, 222, 333, 444, 777}),
        ({"watchlist": True}, {111, 777}),
        ({"watched": True}, {222, 444, 777}),
        ({"liked": True}, {333, 777}),
        ({"rated": True}, {444, 777}),
        ({"watchlist": True, "watched": True, "liked": True, "rated": True}, {777}),
        ({"watchlist": False}, {111, 222, 333, 444, 777}),
    ],
)
def test_filters_and_default_state_selection(
    signed_in: tuple[Client, User], query: dict[str, object], expected: set[int]
) -> None:
    client, user = signed_in
    for movie_id, fields in [
        (111, {"user_on_watchlist": True}),
        (222, {"user_watched": True}),
        (333, {"user_liked": True}),
        (444, {"user_watched": True, "user_rating": 8}),
        (666, {}),
        (
            777,
            {
                "user_on_watchlist": True,
                "user_watched": True,
                "user_liked": True,
                "user_rating": 9,
            },
        ),
    ]:
        create_user_movie_data(user, create_movie(movie_id), **fields)
    create_user_movie_data(
        create_user(username="other"), create_movie(888), user_on_watchlist=True
    )
    response = client.get(URL, query)
    assert response.status_code == 200
    payload = response.json()
    assert {movie["tmdb_id"] for movie in payload["results"]} == expected
    assert payload["total_results"] == len(expected)
    assert payload["page"] == 1
    assert payload["total_pages"] == 1
    assert payload["next_tmdb_page_start"] is None


@pytest.mark.parametrize("sort", ["added", "watched", "rating", "title", "release"])
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_sort_nulls_last_and_id_ties(
    signed_in: tuple[Client, User], sort: str, direction: str
) -> None:
    client, user = signed_in
    for movie_id in (222, 111, 333):
        missing = movie_id == 333
        movie = create_movie(
            movie_id,
            title="Zed" if missing else "Same",
            release_date=None if missing else date(2020, 1, 1),
        )
        record = create_user_movie_data(
            user,
            movie,
            user_on_watchlist=True,
            user_watched=True,
            user_rating=None if missing else 7,
        )
        if not missing:
            UserMovieEntry.objects.create(
                record=record, watched_on=date(2020, 1, 1), made_on=date(2020, 1, 1)
            )
        UserMovieData.objects.filter(pk=record.pk).update(
            created_at=datetime(2020, 1, 2 if missing else 1, tzinfo=UTC)
        )
    response = client.get(URL, {"sort": sort, "direction": direction})
    assert response.status_code == 200
    expected = (
        [111, 222, 333]
        if direction == "asc"
        else ([222, 111, 333] if sort in {"watched", "rating", "release"} else [333, 222, 111])
    )
    assert [movie["tmdb_id"] for movie in response.json()["results"]] == expected


@pytest.mark.parametrize(
    "query",
    [
        {"sort": "unknown"},
        {"direction": "unknown"},
        {"page": 0},
        {"page": 1000001},
        {"page_size": 101},
        {"page_size": 0},
    ],
)
def test_invalid_query_is_422(signed_in: tuple[Client, User], query: dict[str, object]) -> None:
    client, _ = signed_in
    response = client.get(URL, query)
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_page_envelope_stored_card_and_empty_page(signed_in: tuple[Client, User]) -> None:
    client, user = signed_in
    movie = create_movie(
        550,
        title="Stored title",
        poster_path="/stored.jpg",
        release_date=date(2020, 1, 1),
        vote_average=8.5,
        vote_count=100,
        runtime=117,
        genre_ids=[18],
        overview="Stored overview",
    )
    create_user_movie_data(user, movie, user_on_watchlist=True, user_watched=True, user_rating=9)
    create_user_movie_data(user, create_movie(551), user_liked=True)
    first = client.get(URL, {"page": 1, "page_size": 1, "direction": "asc"}).json()
    assert (
        first["page"],
        first["total_pages"],
        first["total_results"],
        first["next_tmdb_page_start"],
    ) == (1, 2, 2, None)
    assert first["results"][0] == {
        "tmdb_id": 550,
        "title": "Stored title",
        "poster_path": "/stored.jpg",
        "release_date": "2020-01-01",
        "vote_average": 8.5,
        "vote_count": 100,
        "runtime": 117,
        "genre_ids": [18],
        "overview": "Stored overview",
        "user_movie_data": {
            "has_entries": False,
            "last_logged_on": None,
            "tmdb_id": 550,
            "user_watched": True,
            "user_on_watchlist": True,
            "user_liked": False,
            "user_rating": 9,
        },
    }
    second = client.get(URL, {"page": 2, "page_size": 1, "direction": "asc"}).json()
    assert second["results"][0]["tmdb_id"] == 551
    assert second["next_tmdb_page_start"] is None
    past_end = client.get(URL, {"page": 3, "page_size": 1}).json()
    assert (
        past_end["page"],
        past_end["total_pages"],
        past_end["total_results"],
        past_end["results"],
    ) == (3, 2, 2, [])
    assert past_end["next_tmdb_page_start"] is None


def test_cleared_record_is_readable_but_absent_from_library(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    create_user_movie_data(user, user_on_watchlist=True)
    assert (
        client.patch(
            "/api/user-movie-data/550",
            {"user_on_watchlist": False},
            content_type="application/json",
        ).status_code
        == 200
    )
    assert client.get("/api/user-movie-data/550").status_code == 200
    payload = client.get(URL).json()
    assert payload["results"] == []
    assert payload["total_results"] == 0


def test_endpoint_query_count_does_not_grow_with_collection(
    signed_in: tuple[Client, User],
) -> None:
    client, user = signed_in
    create_user_movie_data(user, create_movie(1), user_on_watchlist=True)
    with CaptureQueriesContext(connection) as small:
        first = client.get(URL)
    assert len(first.json()["results"]) == 1
    for movie_id in range(2, 201):
        create_user_movie_data(user, create_movie(movie_id), user_on_watchlist=True)
    with CaptureQueriesContext(connection) as large:
        second = client.get(URL)
    assert len(second.json()["results"]) == 20
    assert second.json()["total_results"] == 200
    assert len(small) == len(large)


def test_library_requires_authentication() -> None:
    assert Client().get(URL).status_code == 401


def test_openapi_declares_library_responses() -> None:
    import json

    from django.core.serializers.json import DjangoJSONEncoder

    schema = json.loads(json.dumps(api.get_openapi_schema(), cls=DjangoJSONEncoder))
    path = next(
        value for key, value in schema["paths"].items() if key.endswith("/user-movie-data/movies")
    )
    responses = path["get"]["responses"]
    assert {int(status) for status in responses} == {200, 401, 422}
    for status in ("401", "422"):
        assert (
            responses[status]["content"]["application/json"]["schema"]["$ref"]
            == "#/components/schemas/ErrorResponseSchema"
        )


@pytest.mark.parametrize(
    ("query", "join_sort"),
    [
        ({"watchlist": True}, True),
        ({"watched": True}, True),
        ({"liked": True}, True),
        ({"watchlist": True, "rated": True}, True),
        ({}, False),
        ({"watchlist": True, "watched": True}, False),
        ({"rated": True}, False),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_added_sort_uses_one_filtered_list(
    signed_in: tuple[Client, User], query: dict[str, object], join_sort: bool, direction: str
) -> None:
    client, user = signed_in
    for movie_id, created_month, joined_month in [(111, 1, 3), (222, 2, 1)]:
        record = create_user_movie_data(
            user,
            create_movie(movie_id),
            user_watched=True,
            user_on_watchlist=True,
            user_liked=True,
            user_rating=7,
        )
        join_times = {
            stamp: datetime(
                2020,
                joined_month if not join_sort or query.get(flag) else created_month,
                1,
                tzinfo=UTC,
            )
            for flag, stamp in [
                ("watchlist", "watchlist_added_at"),
                ("watched", "watched_added_at"),
                ("liked", "liked_added_at"),
            ]
        }
        UserMovieData.objects.filter(pk=record.pk).update(
            created_at=datetime(2020, created_month, 1, tzinfo=UTC), **join_times
        )
    response = client.get(URL, {**query, "sort": "added", "direction": direction})
    assert response.status_code == 200
    expected = [222, 111] if join_sort else [111, 222]
    if direction == "desc":
        expected.reverse()
    assert [movie["tmdb_id"] for movie in response.json()["results"]] == expected
