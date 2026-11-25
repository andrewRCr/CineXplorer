"""The record of films a list has shown keeps its expiry when Redis stops answering."""

from __future__ import annotations

import select
import socket
import threading
from collections.abc import Generator, Iterator
from contextlib import contextmanager
from copy import deepcopy
from typing import cast
from urllib.parse import urlsplit
from uuid import uuid4

from django.conf import settings
from django.test import override_settings
from redis import Redis

from apps.movie.services.api_boundary.browse_service_params import BrowseServiceParams
from apps.movie.services.deduplication_tracker import SESSION_TTL_SECONDS, DeduplicationTracker


@contextmanager
def relay_withholding_replies(target: tuple[str, int], command: bytes) -> Generator[int]:
    """Relay a local port to target, passing back no replies once a client sends command."""
    with socket.create_server(("127.0.0.1", 0)) as listener:

        def relay() -> None:
            while True:
                try:
                    client, _ = listener.accept()
                except OSError:
                    return  # The listener was shut down.
                with client, socket.create_connection(target) as upstream:
                    withholding = False
                    while True:
                        readable, _, _ = select.select([client, upstream], [], [])
                        if client in readable:
                            sent = client.recv(4096)
                            if not sent:
                                break
                            withholding = withholding or command in sent
                            upstream.sendall(sent)
                        if upstream in readable:
                            reply = upstream.recv(4096)
                            if not reply:
                                break
                            if not withholding:
                                client.sendall(reply)

        thread = threading.Thread(target=relay, daemon=True)
        thread.start()
        try:
            yield listener.getsockname()[1]
        finally:
            listener.shutdown(socket.SHUT_RDWR)
            thread.join(timeout=5)


def test_shown_films_expire_when_redis_stops_answering_mid_write() -> None:
    session_id = f"withheld-reply-{uuid4().hex}"
    tracker = DeduplicationTracker(session_id=session_id)
    params = BrowseServiceParams(genres="16")
    redis_url = str(settings.CACHES["default"]["LOCATION"])
    location = urlsplit(redis_url)
    target = (location.hostname or "redis", location.port or 6379)
    caches = deepcopy(settings.CACHES)
    with relay_withholding_replies(target, b"SADD") as port:
        caches["default"]["LOCATION"] = f"redis://127.0.0.1:{port}{location.path}"
        with override_settings(CACHES=caches):
            tracker.add_returned_ids(params, [1, 2, 3])

    # redis-py leaves from_url's optional **kwargs untyped.
    redis_client = Redis.from_url(redis_url, decode_responses=True)  # pyright: ignore[reportUnknownMemberType]
    try:
        # Redis ran the write it never answered.
        assert tracker.get_returned_ids(params) == {1, 2, 3}
        # Redis leaves scan_iter's key type unspecified.
        scanned = cast(
            "Iterator[str]",
            redis_client.scan_iter(  # pyright: ignore[reportUnknownMemberType]
                match=f"pagination_session:{session_id}:*"
            ),
        )
        [key] = scanned
        lifetime = redis_client.ttl(key)
        assert isinstance(lifetime, int)
        assert 0 < lifetime <= SESSION_TTL_SECONDS
    finally:
        tracker.clear_session(params)
        redis_client.close()
