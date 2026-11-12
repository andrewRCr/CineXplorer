"""Existing user state survives the reversible model reshape."""

from datetime import UTC, datetime

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from freezegun import freeze_time


@pytest.mark.django_db(transaction=True)
def test_review_cleanup_and_reversible_schema() -> None:
    previous: tuple[tuple[str, str], ...] = (
        ("user_movie_data", "0001_initial"),
        ("core", "0009_change_tmdb_id_to_positive"),
    )
    executor = MigrationExecutor(connection)
    latest = executor.loader.graph.leaf_nodes()
    try:
        executor.migrate(list(previous))
        apps = executor.loader.project_state(previous).apps
        user = apps.get_model("users", "User").objects.create(
            username="migration", email="migration@example.com"
        )
        movie_model = apps.get_model("core", "Movie")
        record_model = apps.get_model("user_movie_data", "UserMovieData")
        for movie_id, review in enumerate(("", "a" * 10001, " " * 10000 + "a"), 1):
            movie = movie_model.objects.create(tmdb_id=movie_id, title="Existing movie")
            record_model.objects.create(user=user, movie=movie, user_review=review)
        with freeze_time("2026-01-01 10:00:00"):
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
        current_apps = executor.loader.project_state(latest).apps
        records = current_apps.get_model("user_movie_data", "UserMovieData").objects.order_by(
            "movie_id"
        )
        assert list(records.values_list("user_review", flat=True)) == [None, "a" * 10000, None]
        assert (
            list(records.values_list("created_at", flat=True))
            == [datetime(2026, 1, 1, 10, tzinfo=UTC)] * 3
        )
        executor = MigrationExecutor(connection)
        executor.migrate(list(previous))
        restored = executor.loader.project_state(previous).apps.get_model(
            "user_movie_data", "UserMovieData"
        )
        assert list(
            restored.objects.order_by("movie_id").values_list("user_review", flat=True)
        ) == [None, "a" * 10000, None]
        assert "watched_at" not in {field.name for field in restored._meta.fields}
    finally:
        MigrationExecutor(connection).migrate(latest)
