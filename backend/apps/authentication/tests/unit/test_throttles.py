"""Concurrent requests keep their own throttle state on shared throttle objects."""

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from threading import Event, current_thread
from typing import cast

import pytest
from django.core.cache import caches
from django.http import HttpRequest
from django.test import RequestFactory

from apps.authentication.throttles import (
    TestAwareAnonThrottle as AnonThrottle,
)
from apps.authentication.throttles import (
    TestAwareUserThrottle as UserThrottle,
)
from apps.core.tests.test_helpers import create_user


@pytest.fixture(params=[AnonThrottle, UserThrottle])
def throttle_requests(
    request: pytest.FixtureRequest,
    db: None,
) -> Iterator[tuple[AnonThrottle | UserThrottle, HttpRequest, HttpRequest]]:
    throttle_class = cast(type[AnonThrottle] | type[UserThrottle], request.param)
    throttle = throttle_class("2/m")
    # Use one real Redis backend across threads, including the controlled read boundary.
    throttle.cache = caches["default"]
    first = RequestFactory().get("/", REMOTE_ADDR="192.0.2.1")
    second = RequestFactory().get("/", REMOTE_ADDR="192.0.2.2")
    for index, http_request in enumerate((first, second)):
        # Test-only Django request attributes are absent from the request stubs.
        setattr(http_request, "_test_enable_throttling", True)  # noqa: B010
        http_request.user = create_user(username=f"concurrent{index}")
    yield throttle, first, second
    for http_request in (first, second):
        key = throttle.get_cache_key(http_request)
        assert key is not None
        throttle.cache.delete(key)


def test_interleaved_requests_record_each_clients_history(
    throttle_requests: tuple[AnonThrottle | UserThrottle, HttpRequest, HttpRequest],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    throttle, first, second = throttle_requests
    backend = throttle.cache
    first_key, second_key = throttle.get_cache_key(first), throttle.get_cache_key(second)
    assert first_key is not None
    assert second_key is not None
    backend.delete_many([first_key, second_key])
    history_read, release = Event(), Event()
    original_get = backend.get
    first_thread: list[int | None] = []

    def held_get(key: str, default: object = None, version: int | None = None) -> object:
        result = original_get(key, default, version=version)
        if current_thread().ident == first_thread[0]:
            history_read.set()
            assert release.wait(5), "Second request did not finish"
        return result

    monkeypatch.setattr(backend, "get", held_get)

    def first_request() -> bool:
        first_thread.append(current_thread().ident)
        return throttle.allow_request(first)

    with ThreadPoolExecutor(max_workers=2) as executor:
        pending = executor.submit(first_request)
        try:
            assert history_read.wait(5), "First request did not reach its history read"
            assert executor.submit(throttle.allow_request, second).result(timeout=5)
        finally:
            release.set()
        assert pending.result(timeout=5)

    assert len(backend.get(first_key, [])) == 1
    assert len(backend.get(second_key, [])) == 1


def test_refused_request_wait_uses_its_own_history(
    throttle_requests: tuple[AnonThrottle | UserThrottle, HttpRequest, HttpRequest],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    throttle, first, second = throttle_requests
    first_key, second_key = throttle.get_cache_key(first), throttle.get_cache_key(second)
    assert first_key is not None
    assert second_key is not None
    throttle.cache.delete_many([first_key, second_key])
    throttle.cache.set(first_key, [990.0, 980.0], 60)
    monkeypatch.setattr(throttle, "timer", lambda: 1000.0)
    refused, release = Event(), Event()

    def refused_request() -> float | None:
        assert not throttle.allow_request(first)
        refused.set()
        assert release.wait(5), "Second request did not finish"
        return throttle.wait()

    with ThreadPoolExecutor(max_workers=2) as executor:
        pending = executor.submit(refused_request)
        try:
            assert refused.wait(5), "First request was not refused"
            assert executor.submit(throttle.allow_request, second).result(timeout=5)
        finally:
            release.set()
        assert pending.result(timeout=5) == 40.0
