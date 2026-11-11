"""Nightly refresh keeps cards fresh without discarding failed rows."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from freezegun import freeze_time

from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.movie.management.commands.refresh_movie_cards import Command
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.tests.test_helpers import create_movie

pytestmark = pytest.mark.django_db


def configured_stub(*movie_ids: int) -> TMDBStub:
    stub = TMDBStub()
    for movie_id in movie_ids:
        stub.add_movie(
            create_tmdb_movie_detail(
                movie_id, f"Refreshed {movie_id}", "2020-01-01", 8.5, runtime=117
            )
        )
    return stub


def test_refresh_orders_null_then_oldest_and_updates_timestamps() -> None:
    with freeze_time("2026-11-01 12:00:00"):
        create_movie(111, title="Old", runtime=80, refreshed_at=timezone.now() + timedelta(days=8))
        create_movie(222, title="Old", runtime=80, refreshed_at=timezone.now() + timedelta(days=1))
        create_movie(333, title="Old", runtime=80)
    stub = configured_stub(111, 222, 333)
    output = StringIO()
    with freeze_time("2026-11-10 12:00:00"):
        call_command(Command(tmdb_client=stub), stdout=output)
        for movie in Movie.objects.all():
            assert movie.title == f"Refreshed {movie.tmdb_id}"
            assert movie.runtime == 117
            assert movie.refreshed_at == timezone.now()
            assert movie.updated_at == timezone.now()
            assert movie.created_at < movie.updated_at
    assert stub.requested_ids == [333, 222, 111]
    assert "Refreshed: 3; failed: 0" in output.getvalue()
    assert Movie.objects.count() == 3


def test_twenty_minute_budget_leaves_unvisited_rows_for_next_run() -> None:
    with freeze_time("2026-11-10 12:00:00") as clock:
        create_movie(333)
        create_movie(222, refreshed_at=timezone.now() - timedelta(days=3))
        last = create_movie(111, refreshed_at=timezone.now() - timedelta(days=1))
        unchanged = last.refreshed_at

        class SlowTMDB(TMDBStub):
            def get_movie_details(self, movie_id: int, **kwargs: object) -> ApiResponse:
                clock.tick(delta=timedelta(minutes=10))
                return super().get_movie_details(movie_id, **kwargs)

        stub = SlowTMDB()
        for movie_id in (111, 222, 333):
            stub.add_movie(
                create_tmdb_movie_detail(movie_id, f"Refreshed {movie_id}", "2020-01-01", 8.0)
            )
        output = StringIO()
        call_command(Command(tmdb_client=stub), stdout=output)
        last.refresh_from_db()
        assert last.refreshed_at == unchanged
        assert (
            Movie.objects.filter(refreshed_at__gte=timezone.now() - timedelta(minutes=20)).count()
            == 2
        )
        assert Movie.objects.count() == 3
        assert stub.requested_ids == [333, 222]
        assert "Refreshed: 2; failed: 0" in output.getvalue()


@pytest.mark.parametrize(
    "failure", ["timeout", "server", "busy", "invalid", "removed", "never_refreshed"]
)
def test_failed_stale_row_is_unchanged_and_reports_its_id_last(failure: str) -> None:
    with freeze_time("2026-11-10 12:00:00"):
        create_movie(
            title="Keep card",
            runtime=80,
            refreshed_at=None
            if failure == "never_refreshed"
            else timezone.now() - timedelta(days=8),
        )
        before = Movie.objects.values().get(pk=550)
        stub = TMDBStub()
        if failure == "invalid":
            stub.details[550] = ApiResponse(status_code=200, data={"id": 550})
        else:
            status = {
                "timeout": 504,
                "server": 500,
                "busy": 429,
                "removed": 404,
                "never_refreshed": 500,
            }[failure]
            stub.add_error(550, status, timeout=failure == "timeout")
        output = StringIO()
        with pytest.raises(CommandError, match="Stale TMDB IDs: 550"):
            call_command(Command(tmdb_client=stub), stdout=output)
        assert "Refreshed: 0; failed: 1" in output.getvalue()
        assert Movie.objects.values().get(pk=550) == before


@pytest.mark.parametrize("age", [2, 7])
def test_failed_row_no_more_than_seven_days_old_does_not_fail_run(age: int) -> None:
    with freeze_time("2026-11-10 12:00:00"):
        create_movie(refreshed_at=timezone.now() - timedelta(days=age))
        before = Movie.objects.values().get(pk=550)
        stub = TMDBStub()
        stub.add_error(550, 500)
        output = StringIO()
        call_command(Command(tmdb_client=stub), stdout=output)
        assert "Refreshed: 0; failed: 1" in output.getvalue()
        assert Movie.objects.values().get(pk=550) == before


def test_empty_catalogue_reports_zero_counts_without_request() -> None:
    stub = TMDBStub()
    output = StringIO()
    call_command(Command(tmdb_client=stub), stdout=output)
    assert "Refreshed: 0; failed: 0" in output.getvalue()
    assert stub.requested_ids == []
