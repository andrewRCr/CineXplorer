"""Database invariants for a user's movie state, independent of service validation."""

from datetime import date

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone
from freezegun import freeze_time

from apps.core.tests.test_helpers import create_user
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "fields",
    [
        {"user_rating": 0},
        {"user_rating": 11},
        {"user_review": ""},
        {"user_review": " \t\n"},
        {"user_review": "\u00a0\u2007\u202f"},
        {"user_review": "a" * 10001},
        {"watched_at": date(2026, 1, 1), "user_watched": False},
    ],
    ids=[
        "rating-zero",
        "rating-eleven",
        "empty-review",
        "whitespace-review",
        "unicode-whitespace-review",
        "long-review",
        "unwatched-date",
    ],
)
def test_database_refuses_invalid_state(fields: dict[str, object]) -> None:
    user = create_user()
    movie = create_movie()
    with pytest.raises(IntegrityError), transaction.atomic():
        create_user_movie_data(user, movie, **fields)


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
    assert getattr(record, "watched_at", None) is None


def test_record_timestamps_track_creation_and_save() -> None:
    with freeze_time("2026-01-01 10:00:00"):
        record = create_user_movie_data(create_user())
        created = timezone.now()
        assert getattr(record, "created_at", None) == created
        assert getattr(record, "updated_at", None) == created
    with freeze_time("2026-01-02 10:00:00"):
        record.user_liked = True
        record.save()
        record.refresh_from_db()
        assert record.created_at == created
        assert record.updated_at == timezone.now()
