"""Database invariants for a user's movie state, independent of service validation."""

from datetime import date

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone
from freezegun import freeze_time

from apps.core.tests.test_helpers import create_user
from apps.user_movie_data.models import UserMovieData, UserMovieEntry
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data

pytestmark = pytest.mark.django_db


def test_database_refuses_duplicate_user_movie() -> None:
    user = create_user()
    movie = create_movie()
    create_user_movie_data(user, movie)
    with pytest.raises(IntegrityError), transaction.atomic():
        create_user_movie_data(user, movie)


def test_watched_record_accepts_unknown_date() -> None:
    record = create_user_movie_data(create_user(), user_watched=True)
    record.refresh_from_db()
    assert record.user_watched is True
    assert record.watched_added_at is not None


def test_record_timestamps_track_creation_and_save() -> None:
    with freeze_time("2026-01-01 10:00:00"):
        record = create_user_movie_data(create_user())
        created = timezone.now()
        assert getattr(record, "created_at", None) == created
        assert getattr(record, "updated_at", None) == created
    with freeze_time("2026-01-02 10:00:00"):
        record.user_liked = True
        record.liked_added_at = timezone.now()
        record.save()
        record.refresh_from_db()
        assert record.created_at == created
        assert record.updated_at == timezone.now()


def test_database_rating_requires_watched_record() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        create_user_movie_data(create_user(), user_rating=7)


@pytest.mark.parametrize(
    ("flag", "stamp"),
    [
        ("user_watched", "watched_added_at"),
        ("user_on_watchlist", "watchlist_added_at"),
        ("user_liked", "liked_added_at"),
    ],
)
def test_active_flag_requires_join_time(flag: str, stamp: str) -> None:
    record = create_user_movie_data(create_user())
    with pytest.raises(IntegrityError), transaction.atomic():
        UserMovieData.objects.filter(pk=record.pk).update(**{flag: True, stamp: None})


@pytest.mark.parametrize(
    "fields",
    [
        {},
        {"review": "Review", "rewatch": True},
        {"watched_on": date(2020, 1, 1), "rating": 0},
        {"watched_on": date(2020, 1, 1), "rating": 11},
        {"review": ""},
        {"review": " \t\n"},
        {"review": "\u00a0\u2007\u202f"},
        {"review": "a" * 10001},
    ],
)
def test_entry_constraints(fields: dict[str, object]) -> None:
    entry_model = UserMovieEntry
    record = create_user_movie_data(create_user(), user_watched=True)
    with pytest.raises(IntegrityError), transaction.atomic():
        entry_model.objects.create(record=record, made_on=date(2020, 1, 1), **fields)


def test_log_summary_and_entry_order_and_cascade() -> None:
    entry_model = UserMovieEntry
    record = create_user_movie_data(create_user(), user_watched=True)
    latest_dated = entry_model.objects.create(
        record=record, watched_on=date(2020, 1, 2), made_on=date(2020, 1, 1)
    )
    older = entry_model.objects.create(
        record=record, watched_on=date(2020, 1, 1), made_on=date(2020, 1, 1)
    )
    undated = entry_model.objects.create(record=record, review="Review", made_on=date(2020, 1, 3))
    same_day = entry_model.objects.create(
        record=record, watched_on=date(2020, 1, 3), made_on=date(2020, 1, 1)
    )
    entry_model.objects.filter(pk__in=[undated.pk, same_day.pk]).update(created_at=timezone.now())
    assert list(
        entry_model.objects.get_queryset().ordered_for_history().values_list("pk", flat=True)
    ) == [same_day.pk, undated.pk, latest_dated.pk, older.pk]
    summary = UserMovieData.objects.get_queryset().with_log_summary().get(pk=record.pk)
    assert summary.has_entries
    assert summary.last_logged_on == date(2020, 1, 3)
    entry_model.objects.filter(record=record, watched_on__isnull=False).delete()
    summary = UserMovieData.objects.get_queryset().with_log_summary().get(pk=record.pk)
    assert summary.has_entries
    assert summary.last_logged_on is None
    record.delete()
    assert not entry_model.objects.exists()
    empty = create_user_movie_data(create_user(username="empty"), record.movie)
    summary = UserMovieData.objects.get_queryset().with_log_summary().get(pk=empty.pk)
    assert not summary.has_entries
    assert summary.last_logged_on is None


@pytest.mark.parametrize("rating", [0, 11])
def test_record_rating_range(rating: int) -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        create_user_movie_data(create_user(), user_watched=True, user_rating=rating)
