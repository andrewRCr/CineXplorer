"""
Core database models.

Type Checking Notes:
====================
This file contains Django model definitions which use Django's
metaclass-based model system. Pyright (our development type checker) has
limited understanding of Django's dynamic model field system, even with
django-stubs installed. The following type: ignore patterns are used:

- Django model fields (CharField, IntegerField, etc.): These show as
  "partially unknown" types because Pyright cannot fully resolve Django's
  field metaclass magic. This is a known limitation.
- Django model field access (self.field_name): Field values accessed on
  model instances may show as "unknown" types because they're dynamically
  generated.
- Django manager/QuerySet methods: Some Django ORM operations show type
  issues due to generic type complexity.

All type: ignore comments in this file are documented with the pattern
"# Django [category]" to indicate they're related to Django framework
limitations, not code quality issues.

This is the recommended approach per Django + Pyright community best practices.
"""

from django.conf import settings
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.utils import timezone
from datetime import timedelta


class UserManager(BaseUserManager):  # type: ignore[misc]  # Django manager
    """ Custom manager for users. """

    def create_user(self, username: str, email: str,
                    password: str | None = None,
                    **extra_fields: object) -> 'User':
        """ Create, save and return a new custom app user. """

        if not username:
            raise ValueError('User must have a username.')
        if not email:
            raise ValueError('User must have an email address.')
        user = self.model(
            username=username,  # type: ignore[misc]  # Django manager
            email=self.normalize_email(email),
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, username: str, email: str, password: str) -> 'User':
        """ Create, save and return a new superuser. """

        user = self.create_user(
            username, email, password
        )  # type: ignore[misc]  # Django manager
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)

        return user


class User(AbstractBaseUser, PermissionsMixin):
    """ Custom app user class. """

    username = models.CharField(
        max_length=255, unique=True
    )  # type: ignore[misc]  # Django field
    email = models.EmailField(
        max_length=255, unique=True
    )  # type: ignore[misc]  # Django field
    email_verified = models.BooleanField(
        default=False
    )  # type: ignore[misc]  # Django field
    first_name = models.CharField(
        max_length=255
    )  # type: ignore[misc]  # Django field
    last_name = models.CharField(
        max_length=255
    )  # type: ignore[misc]  # Django field
    is_active = models.BooleanField(
        default=True
    )  # type: ignore[misc]  # Django field
    is_staff = models.BooleanField(
        default=False
    )  # type: ignore[misc]  # Django field

    USERNAME_FIELD = 'username'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['email']

    objects: UserManager = (
        UserManager()
    )  # type: ignore[misc]  # Django manager


class EmailVerificationToken(models.Model):
    """Token for email verification."""
    user = models.OneToOneField(  # type: ignore[misc]  # Django field
        User,
        on_delete=models.CASCADE,
        related_name='email_verification_token'
    )
    token = models.CharField(
        max_length=64, unique=True
    )  # type: ignore[misc]  # Django field
    created_at = models.DateTimeField(
        auto_now_add=True
    )  # type: ignore[misc]  # Django field
    expires_at = models.DateTimeField()  # type: ignore[misc]  # Django field

    class Meta:
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"

    def __str__(self) -> str:
        return (
            f"Verification token for {self.user.username}"
        )  # type: ignore[attr-defined]  # Django field access

    @property
    def is_expired(self) -> bool:
        """Check if the token has expired."""
        return (
            timezone.now() > self.expires_at
        )  # type: ignore[attr-defined]  # Django field access

    def save(self, *args: object, **kwargs: object) -> None:
        """Set expiration time on save if not set."""
        if not self.expires_at:  # type: ignore[attr-defined]
            self.expires_at = (
                timezone.now() + timedelta(hours=24)
            )  # type: ignore[attr-defined]  # Django field access
        super().save(*args, **kwargs)


class Movie(models.Model):
    """
    Represents a minimal local stub for a TMDB movie.
    Used as an anchor for user-specific data.
    """
    tmdb_id = models.IntegerField(
        primary_key=True
    )  # type: ignore[misc]  # Django field
    title = models.CharField(
        max_length=255
    )  # type: ignore[misc]  # Django field
    poster_path = models.CharField(
        max_length=255, blank=True, null=True
    )  # type: ignore[misc]  # Django field
    release_date = models.DateField(
        null=True, blank=True
    )  # type: ignore[misc]  # Django field

    def __str__(self) -> str:
        return self.title  # type: ignore[attr-defined]  # Django field access


class UserMovieData(models.Model):
    """ Represents a user's data about a particular movie. """

    user = models.ForeignKey(  # type: ignore[misc]  # Django field
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    movie = models.ForeignKey(  # type: ignore[misc]  # Django field
        'Movie',
        on_delete=models.CASCADE,
        related_name='user_movie_data'
    )
    user_watched = models.BooleanField(
        default=False, db_index=True
    )  # type: ignore[misc]  # Django field
    user_on_watchlist = models.BooleanField(
        default=False, db_index=True
    )  # type: ignore[misc]  # Django field
    user_liked = models.BooleanField(
        default=False, db_index=True
    )  # type: ignore[misc]  # Django field
    user_rating = models.IntegerField(  # type: ignore[misc]  # Django field
        null=True, blank=True, default=None,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    user_review = models.TextField(
        blank=True, null=True
    )  # type: ignore[misc]  # Django field

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self) -> str:
        return (
            f"{self.user.username} - {self.movie.title}"
        )  # type: ignore[attr-defined]  # Django field access
