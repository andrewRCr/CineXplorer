"""Save limits count atomically in Redis, independently for each authenticated user."""

from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import timedelta
from threading import Barrier
from typing import cast
from uuid import uuid4

import pytest
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.core.cache import caches
from django.db import close_old_connections, connection
from django.http import HttpRequest
from django.test import Client, RequestFactory, override_settings
from django.urls import get_resolver
from django.utils import timezone
from freezegun import freeze_time
from ninja_jwt.tokens import AccessToken

from apps.core.tests.test_helpers import (
    authenticate_client,
    closed_local_port,
    create_user,
    get_csrf_token,
)
from apps.user_movie_data.tests.test_helpers import create_movie
from apps.users.models import User

pytestmark = pytest.mark.django_db
URL = "/api/user-movie-data/550"


@pytest.fixture(autouse=True)
def isolated_counters() -> Iterator[None]:
    # Build Pydantic date schemas before freezegun replaces the date class.
    get_resolver().resolve("/api/csrf/")
    caches = deepcopy(settings.CACHES)
    caches["default"]["KEY_PREFIX"] = f"movie-save-test-{uuid4().hex}"
    with (
        override_settings(CACHES=caches, TESTING=False),
        freeze_time("2026-11-10 12:00:00"),
    ):
        yield


def signed_client(user: User, mode: str) -> Client:
    client = Client()
    # The installed auth stubs omit the project model's inheritance.
    auth_user = cast(AbstractBaseUser, user)
    if mode == "bearer":
        authenticate_client(client, user.username, "testpass123")
        # Keep the signed credential valid while the daily-limit test advances time.
        token = AccessToken.for_user(auth_user)
        token.payload["exp"] = int((timezone.now() + timedelta(days=2)).timestamp())
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    else:
        client.force_login(auth_user)
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)
    return client


@pytest.mark.parametrize("mode", ["bearer", "session"])
def test_minute_limit_leaves_refused_save_unchanged(mode: str) -> None:
    user = create_user()
    create_movie()
    client = signed_client(user, mode)
    for number in range(30):
        assert client.patch(
            URL, {"user_rating": 7}, content_type="application/json"
        ).status_code == (201 if number == 0 else 200)
    refused = client.patch(URL, {"user_rating": 9}, content_type="application/json")
    assert refused.status_code == 429
    assert refused.json() == {"detail": "Too many requests."}
    assert refused["Retry-After"] == "60"
    assert client.get(URL).json()["user_rating"] == 7


@pytest.mark.parametrize("mode", ["bearer", "session"])
def test_daily_limit_after_one_thousand_saves(mode: str) -> None:
    user = create_user()
    create_movie()
    client = signed_client(user, mode)
    with freeze_time("2026-11-10 12:00:00") as clock:
        for number in range(1000):
            response = client.patch(URL, {"user_rating": 7}, content_type="application/json")
            assert response.status_code == (201 if number == 0 else 200), (
                number,
                response.content,
            )
            clock.tick(delta=timedelta(seconds=2))
        refused = client.patch(URL, {"user_rating": 9}, content_type="application/json")
        assert refused.status_code == 429
        assert int(refused["Retry-After"]) == 43200 - 2000
        assert client.get(URL).json()["user_rating"] == 7


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("mode", ["bearer", "session"])
def test_forty_simultaneous_saves_allow_exactly_thirty(mode: str) -> None:
    user = create_user()
    create_movie()
    base = signed_client(user, mode)
    barrier = Barrier(40)

    def save(_: int) -> int:
        close_old_connections()
        client = Client()
        client.defaults.update(base.defaults)
        client.cookies.update(base.cookies)
        try:
            barrier.wait(timeout=20)
            return client.patch(
                URL, {"user_liked": True}, content_type="application/json"
            ).status_code
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=40) as pool:
        responses = list(pool.map(save, range(40)))
    assert responses.count(201) == 1
    assert responses.count(200) == 29
    assert responses.count(429) == 10


@pytest.mark.parametrize("window", [60, 86400])
def test_first_counter_half_a_second_before_window_end_is_counted(window: int) -> None:
    from apps.user_movie_data.throttles import SaveThrottle

    user = create_user()
    request: HttpRequest = RequestFactory().patch(URL)
    request.auth = user  # pyright: ignore[reportAttributeAccessIssue] - Ninja adds auth at runtime
    instant = "2026-11-10 12:00:59.500000" if window == 60 else "2026-11-10 23:59:59.500000"
    throttle = SaveThrottle(limit=1, window_seconds=window)
    with freeze_time(instant) as clock:
        assert throttle.allow_request(request) is True
        assert throttle.allow_request(request) is False
        assert throttle.wait() == 1
        clock.tick(delta=timedelta(seconds=0.5))
        assert throttle.allow_request(request) is True


def test_deleted_counter_restarts_at_one(monkeypatch: pytest.MonkeyPatch) -> None:
    user = create_user()
    create_movie()
    client = signed_client(user, "session")
    backend = caches["default"]
    real_incr = backend.incr
    first = True

    def delete_then_increment(key: str, delta: int = 1, version: int | None = None) -> int:
        nonlocal first
        if first:
            first = False
            backend.delete(key, version=version)
        return real_incr(key, delta=delta, version=version)

    monkeypatch.setattr(backend, "incr", delete_then_increment)
    for number in range(30):
        assert client.patch(
            URL, {"user_liked": True}, content_type="application/json"
        ).status_code == (201 if number == 0 else 200)
    assert (
        client.patch(URL, {"user_liked": False}, content_type="application/json").status_code
        == 429
    )
    assert client.get(URL).json()["user_liked"] is True


@pytest.mark.parametrize("mode", ["bearer", "session"])
def test_cache_unreachable_still_saves(mode: str) -> None:
    user = create_user()
    create_movie()
    client = signed_client(user, mode)
    caches = deepcopy(settings.CACHES)
    caches["default"]["LOCATION"] = f"redis://127.0.0.1:{closed_local_port()}/0"
    caches["default"]["OPTIONS"] = {"socket_connect_timeout": 0.05, "socket_timeout": 0.05}
    with override_settings(CACHES=caches):
        response = client.patch(URL, {"user_on_watchlist": True}, content_type="application/json")
    assert response.status_code == 201
    assert response.json()["user_on_watchlist"] is True


def test_refusals_count_for_both_windows_and_later_end_wins() -> None:
    from apps.user_movie_data.throttles import SaveThrottle

    user = create_user()
    request = RequestFactory().patch(URL)
    request.auth = user  # pyright: ignore[reportAttributeAccessIssue] - Ninja adds auth at runtime
    minute = SaveThrottle(limit=1, window_seconds=60)
    day = SaveThrottle(limit=1, window_seconds=86400)
    assert minute.allow_request(request)
    assert day.allow_request(request)
    assert not minute.allow_request(request)
    assert not day.allow_request(request)
    assert day.wait() == 43200
    # A refusal remains counted when a larger limit is applied to the same window.
    larger = SaveThrottle(limit=2, window_seconds=60)
    assert not larger.allow_request(request)


def test_reads_deletes_and_another_users_saves_remain_available() -> None:
    user = create_user()
    other = create_user(username="other")
    create_movie()
    client = signed_client(user, "session")
    for _ in range(30):
        client.patch(URL, {"user_liked": True}, content_type="application/json")
    assert (
        client.patch(URL, {"user_liked": False}, content_type="application/json").status_code
        == 429
    )
    assert client.get(URL).status_code == 200
    assert client.delete(URL).status_code == 204
    assert (
        signed_client(other, "session")
        .patch(URL, {"user_rating": 8}, content_type="application/json")
        .status_code
        == 201
    )
