"""Tests for core models."""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

from apps.core import models
from apps.user_movie_data.models import UserMovieData

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
    user_movie_data: UserMovieData = UserMovieData.objects.create(
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

    movie_review_str = "Blade Runner is one of the greatest films of all time."
    movie = models.Movie.objects.create(
        tmdb_id=78,
        title="Blade Runner",
        # ...other movie fields...
    )
    user_movie_data: UserMovieData = UserMovieData.objects.create(
        user=user,
        movie=movie,
        user_watched=True,
        user_on_watchlist=True,
        user_liked=True,
        user_rating=10,
        user_review=movie_review_str,
    )

    assert user_movie_data.user_watched is True
    assert user_movie_data.user_on_watchlist is True
    assert user_movie_data.user_liked is True
    assert user_movie_data.user_rating == 10
    assert user_movie_data.user_review == movie_review_str
