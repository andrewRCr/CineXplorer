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
            fixed: list[tuple[str, str]] = [("user_movie_data", "0002_constrain_user_movie_data")]
            executor.migrate(list(fixed))
        current_apps = executor.loader.project_state(fixed).apps
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


@pytest.mark.django_db(transaction=True)
def test_viewing_history_migrates_forward_and_back() -> None:
    from datetime import date

    previous: list[tuple[str, str]] = [
        ("user_movie_data", "0002_constrain_user_movie_data"),
        ("core", "0010_movie_card_fields"),
    ]
    target: list[tuple[str, str]] = [("user_movie_data", "0003_movie_entries")]
    executor = MigrationExecutor(connection)
    latest = executor.loader.graph.leaf_nodes()
    created = datetime(2020, 1, 1, tzinfo=UTC)
    updated = datetime(2020, 2, 1, tzinfo=UTC)
    try:
        executor.migrate(list(previous))
        historical = executor.loader.project_state(previous).apps
        user = historical.get_model("users", "User").objects.create(username="history")
        movies = historical.get_model("core", "Movie")
        records = historical.get_model("user_movie_data", "UserMovieData")
        for movie_id, fields in [
            (
                1,
                {
                    "user_watched": True,
                    "watched_at": date(2020, 1, 2),
                    "user_review": "First",
                    "user_rating": 7,
                    "user_liked": True,
                },
            ),
            (2, {"user_review": "Undated"}),
            (3, {"user_rating": 9, "user_on_watchlist": True}),
        ]:
            movie = movies.objects.create(tmdb_id=movie_id, title="Existing")
            records.objects.create(user=user, movie=movie, **fields)
        records.objects.update(created_at=created, updated_at=updated)
        executor = MigrationExecutor(connection)
        executor.migrate(list(target))
        current = executor.loader.project_state(target).apps
        records = current.get_model("user_movie_data", "UserMovieData")
        entries = current.get_model("user_movie_data", "UserMovieEntry")
        first = records.objects.get(movie_id=1)
        entry = entries.objects.get(record=first)
        assert (
            getattr(entry, "watched_on", None),
            getattr(entry, "review", None),
            getattr(entry, "rating", None),
            getattr(entry, "rewatch", None),
            getattr(entry, "made_on", None),
        ) == (
            date(2020, 1, 2),
            "First",
            7,
            False,
            updated.date(),
        )
        assert (getattr(entry, "created_at", None), getattr(entry, "updated_at", None)) == (
            updated,
            updated,
        )
        assert (
            getattr(first, "watched_added_at", None),
            getattr(first, "liked_added_at", None),
        ) == (
            created,
            created,
        )
        second = records.objects.get(movie_id=2)
        assert getattr(second, "user_watched", None)
        assert getattr(second, "watched_added_at", None) == updated
        assert getattr(entries.objects.get(record=second), "watched_on", None) is None
        third = records.objects.get(movie_id=3)
        assert getattr(third, "user_watched", None)
        assert getattr(third, "user_on_watchlist", None)
        assert (
            getattr(third, "watched_added_at", None),
            getattr(third, "watchlist_added_at", None),
        ) == (
            updated,
            created,
        )
        assert not entries.objects.filter(record=third).exists()
        entries.objects.create(record=first, watched_on=date(2020, 3, 1), made_on=date(2020, 3, 1))
        entries.objects.create(record=first, review="Newest review", made_on=date(2020, 4, 1))
        executor = MigrationExecutor(connection)
        executor.migrate(list(previous))
        restored = executor.loader.project_state(previous).apps.get_model(
            "user_movie_data", "UserMovieData"
        )
        row = restored.objects.get(movie_id=1)
        assert (
            getattr(row, "watched_at", None),
            getattr(row, "user_review", None),
            getattr(row, "user_rating", None),
        ) == (
            date(2020, 3, 1),
            "Newest review",
            7,
        )
        assert getattr(restored.objects.get(movie_id=3), "user_watched", None)
    finally:
        MigrationExecutor(connection).migrate(latest)
