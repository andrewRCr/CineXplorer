"""A save acknowledges its own result before another writer can replace it."""

import time
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from queue import Queue
from threading import Event

import pytest
from django.db import close_old_connections, connection
from django.test import Client

from apps.core.tests.test_helpers import authenticate_client, create_user, json_patch
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.schemas import UserMovieDataSchema
from apps.user_movie_data.tests.test_helpers import create_user_movie_data


def _wait_for_competitor(future: Future[int], saver_pid: int, competitor_pid: int) -> None:
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if future.done():
            future.result()
            return
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_stat_clear_snapshot()")
            cursor.execute(
                "SELECT %s = ANY(pg_blocking_pids(%s))",
                [saver_pid, competitor_pid],
            )
            row = cursor.fetchone()
        if row is not None and row[0]:
            return
        time.sleep(0.01)
    raise AssertionError("Competing write neither completed nor waited for the save")


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("competing_operation", ["delete", "overwrite"])
def test_save_acknowledges_its_result_before_competing_write(competing_operation: str) -> None:
    user = create_user()
    record = create_user_movie_data(user)
    clients = [Client(), Client()]
    for client in clients:
        authenticate_client(client, user.username, "testpass123")
    response_read = Event()
    release_read = Event()
    backend_pids: Queue[int] = Queue()

    def report_connection() -> None:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_backend_pid()")
            row = cursor.fetchone()
        assert row is not None
        backend_pids.put(row[0])

    def pause_response_read(
        execute: Callable[..., object],
        sql: str,
        params: object,
        many: bool,
        context: dict[str, object],
    ) -> object:
        # Only schedule the real query; services, transactions and results remain unchanged.
        if sql.startswith("SELECT") and 'AS "has_entries"' in sql:
            response_read.set()
            assert release_read.wait(timeout=15), "Save response read was not released"
        return execute(sql, params, many, context)

    def save() -> tuple[int, bytes]:
        close_old_connections()
        try:
            report_connection()
            with connection.execute_wrapper(pause_response_read):
                response = json_patch(
                    clients[0], "/api/user-movie-data/550", {"user_on_watchlist": True}
                )
            return response.status_code, response.content
        finally:
            connection.close()

    def compete() -> int:
        close_old_connections()
        try:
            report_connection()
            if competing_operation == "delete":
                return clients[1].delete("/api/user-movie-data/550").status_code
            return json_patch(
                clients[1], "/api/user-movie-data/550", {"user_on_watchlist": False}
            ).status_code
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        pending_save = pool.submit(save)
        try:
            saver_pid = backend_pids.get(timeout=10)
            assert response_read.wait(timeout=10), "Save did not reach its response read"
            pending_competitor = pool.submit(compete)
            competitor_pid = backend_pids.get(timeout=10)
            _wait_for_competitor(pending_competitor, saver_pid, competitor_pid)
        finally:
            release_read.set()
        status, content = pending_save.result(timeout=20)
        competing_status = pending_competitor.result(timeout=20)

    assert status == 200
    result = UserMovieDataSchema.model_validate_json(content)
    assert result.tmdb_id == 550
    assert result.user_on_watchlist is True
    assert result.has_entries is False
    assert result.last_logged_on is None
    assert competing_status == (204 if competing_operation == "delete" else 200)
    if competing_operation == "delete":
        assert not UserMovieData.objects.filter(pk=record.pk).exists()
    else:
        record.refresh_from_db()
        assert record.user_on_watchlist is False
