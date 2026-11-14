"""Tests for core models."""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

from apps.core import models
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.tests.test_helpers import create_user_movie_data

if TYPE_CHECKING:
    from apps.users.models import User as UserType

User = get_user_model()


# ============================================================================
# User Creation Tests
# ============================================================================


@pytest.mark.django_db
def test_create_user_with_username_and_email_successful() -> None:
    """Tests creating a user with both a username and email; case: success."""
    username: str = "testUser"
    email: str = "test@example.com"
    password: str = "testpass123"

    # django-types limitation - UserManager.create_user type not inferred
    user = cast(
        "UserType",
        User.objects.create_user(  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
            username=username,
            email=email,
            password=password,
        ),
    )

    assert user.username == username
    assert user.email == email
    assert user.check_password(password)  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]


@pytest.mark.django_db
def test_new_user_email_normalized() -> None:
    """Tests newly created user's email is normalized."""
    sample_emails: list[list[str]] = [
        ["test1@EXAMPLE.com", "test1@example.com"],
        ["Test2@Example.com", "Test2@example.com"],
        ["TEST3@EXAMPLE.com", "TEST3@example.com"],
        ["test4@example.COM", "test4@example.com"],
    ]

    for i, (email, expected) in enumerate(sample_emails):
        # django-types limitation - UserManager.create_user type not inferred
        user = cast(
            "UserType",
            User.objects.create_user(f"testUser{i}", email),  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
        )
        assert user.email == expected


@pytest.mark.django_db
def test_new_user_without_username_raises_error() -> None:
    """Tests that creating a user without a username raises a ValueError."""
    with pytest.raises(ValueError, match="The given username must be set"):
        # django-types limitation - UserManager.create_user type not inferred
        User.objects.create_user("", "testUser@example.com")  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]


@pytest.mark.django_db
def test_user_model_allows_empty_email_at_model_level() -> None:
    """Tests the user model allows an empty email at the model layer.

    Note: Application policy enforces email requirement via allauth
    ACCOUNT_SIGNUP_FIELDS configuration. This test verifies model-level
    behavior only. Serializer/form-level validation is tested separately.
    """
    # The user model allows an empty email at the model level
    # django-types limitation - UserManager.create_user type not inferred
    user = cast(
        "UserType",
        User.objects.create_user("testUser", ""),  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
    )
    assert user.pk is not None  # Verify user was persisted
    assert user.username == "testUser"
    assert user.email == ""  # Model layer allows empty email


@pytest.mark.django_db
def test_create_superuser() -> None:
    """Tests creating a new superuser."""
    # django-types limitation - UserManager.create_superuser type not inferred
    user = cast(
        "UserType",
        User.objects.create_superuser(  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
            "testUser", "testUser@example.com", "testPass123"
        ),
    )

    assert user.is_superuser
    assert user.is_staff


# ============================================================================
# UserMovieData Model Tests
# ============================================================================


@pytest.mark.django_db
def test_create_default_user_movie_data() -> None:
    """Tests that creating a default UserMovieData object for a user is successful."""
    # django-types limitation - UserManager.create_user type not inferred
    user = cast(
        "UserType",
        User.objects.create_user(  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
            "testUser", "testUser@example.com", "testPass123"
        ),
    )

    movie = models.Movie.objects.create(
        tmdb_id=78,
        title="Blade Runner",
        # ...other movie fields...
    )
    user_movie_data: UserMovieData = create_user_movie_data(
        user=user,
        movie=movie,
        # ...other UserMovieData fields...
    )

    assert user_movie_data.user == user
    assert user_movie_data.movie.tmdb_id == 78
    assert str(user_movie_data) == f"{user.username} - {movie.title}"


@pytest.mark.django_db
def test_create_nondefault_user_movie_data() -> None:
    """Tests that creating a non-default UserMovieData object for a user is successful."""
    # django-types limitation - UserManager.create_user type not inferred
    user = cast(
        "UserType",
        User.objects.create_user(  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
            "testUser", "testUser@example.com", "testPass123"
        ),
    )

    movie = models.Movie.objects.create(
        tmdb_id=78,
        title="Blade Runner",
        # ...other movie fields...
    )
    user_movie_data: UserMovieData = create_user_movie_data(
        user=user,
        movie=movie,
        user_watched=True,
        user_on_watchlist=True,
        user_liked=True,
        user_rating=10,
    )

    assert user_movie_data.user_watched is True
    assert user_movie_data.user_on_watchlist is True
    assert user_movie_data.user_liked is True
    assert user_movie_data.user_rating == 10


@pytest.mark.django_db
def test_movie_card_defaults_and_independent_genres() -> None:
    from apps.user_movie_data.tests.test_helpers import create_movie

    movie = create_movie()
    for field in ("vote_average", "vote_count", "runtime", "overview", "refreshed_at"):
        assert hasattr(movie, field)
        assert getattr(movie, field) is None
    assert movie.genre_ids == []
    another = create_movie(551)
    movie.genre_ids.append(18)
    movie.save()
    assert another.genre_ids == []
    movie.refresh_from_db()
    assert movie.genre_ids == [18]


@pytest.mark.django_db
def test_movie_timestamps_cover_ordinary_and_admin_saves() -> None:
    from django.contrib.admin import AdminSite, ModelAdmin
    from django.forms import modelform_factory
    from django.test import RequestFactory
    from django.utils import timezone
    from freezegun import freeze_time

    from apps.user_movie_data.tests.test_helpers import create_movie

    with freeze_time("2026-01-01 10:00:00"):
        movie = create_movie()
        created = timezone.now()
        assert getattr(movie, "created_at", None) == created
        assert getattr(movie, "updated_at", None) == created
    with freeze_time("2026-01-02 10:00:00"):
        movie.title = "Updated title"
        movie.refreshed_at = created
        movie.save()
        movie.refresh_from_db()
        assert movie.created_at == created
        assert movie.updated_at == timezone.now()
        assert movie.refreshed_at == created
    with freeze_time("2026-01-03 10:00:00"):
        form_class = modelform_factory(models.Movie, fields=["title"])
        form = form_class(data={"title": "Admin title"}, instance=movie)
        assert form.is_valid()
        ModelAdmin(models.Movie, AdminSite()).save_model(
            RequestFactory().post("/admin/"), form.save(commit=False), form, change=True
        )
        movie.refresh_from_db()
        assert movie.title == "Admin title"
        assert movie.updated_at == timezone.now()
        assert movie.created_at == created
        assert movie.refreshed_at == created


@pytest.mark.django_db(transaction=True)
def test_movie_card_migration_applies_to_existing_rows_and_reverses() -> None:
    from datetime import UTC, datetime

    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor
    from freezegun import freeze_time

    previous = (("core", "0009_change_tmdb_id_to_positive"), ("user_movie_data", "0001_initial"))
    executor = MigrationExecutor(connection)
    latest = executor.loader.graph.leaf_nodes()
    try:
        executor.migrate(list(previous))
        before_apps = executor.loader.project_state(previous).apps
        before_apps.get_model("core", "Movie").objects.create(tmdb_id=550, title="Existing movie")
        with freeze_time("2026-01-01 10:00:00"):
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
        # The leaf migration state has the same fields as the current Movie model.
        movie = cast(
            models.Movie,
            executor.loader.project_state(latest)
            .apps.get_model("core", "Movie")
            .objects.get(pk=550),
        )
        assert movie.title == "Existing movie"
        assert movie.created_at == datetime(2026, 1, 1, 10, tzinfo=UTC)
        assert movie.genre_ids == []
        for field in ("vote_average", "vote_count", "runtime", "overview", "refreshed_at"):
            assert getattr(movie, field) is None
        executor = MigrationExecutor(connection)
        executor.migrate(list(previous))
        restored = executor.loader.project_state(previous).apps.get_model("core", "Movie")
        assert restored.objects.values_list("title", flat=True).get(pk=550) == "Existing movie"
        assert "refreshed_at" not in {field.name for field in restored._meta.fields}
    finally:
        MigrationExecutor(connection).migrate(latest)
