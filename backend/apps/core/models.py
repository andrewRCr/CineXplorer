"""
Core database models.
"""

from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone
from datetime import timedelta


class UserManager(BaseUserManager):
    """ Custom manager for users. """

    def create_user(self, username, email, password=None, **extra_fields):
        """ Create, save and return a new custom app user. """

        if not username:
            raise ValueError('User must have a username.')
        if not email:
            raise ValueError('User must have an email address.')
        user = self.model(username=username,
                          email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, username, email, password):
        """ Create, save and return a new superuser. """

        user = self.create_user(username, email, password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)

        return user


class User(AbstractBaseUser, PermissionsMixin):
    """ Custom app user class. """

    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    email_verified = models.BooleanField(default=False)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'username'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['email']

    objects = UserManager()


class EmailVerificationToken(models.Model):
    """Token for email verification."""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='email_verification_token'
    )
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"

    def __str__(self):
        return f"Verification token for {self.user.username}"

    @property
    def is_expired(self):
        """Check if the token has expired."""
        return timezone.now() > self.expires_at

    def save(self, *args, **kwargs):
        """Set expiration time on save if not set."""
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)


class Movie(models.Model):
    """
    Represents a minimal local stub for a TMDB movie.
    Used as an anchor for user-specific data.
    """
    tmdb_id = models.IntegerField(primary_key=True)
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255, blank=True, null=True)
    release_date = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return self.title


class UserMovieData(models.Model):
    """ Represents a user's data about a particular movie. """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    movie = models.ForeignKey(
        'Movie',
        on_delete=models.CASCADE,
        related_name='user_movie_data'
    )
    user_watched = models.BooleanField(default=False, db_index=True)
    user_on_watchlist = models.BooleanField(default=False, db_index=True)
    user_liked = models.BooleanField(default=False, db_index=True)
    user_rating = models.IntegerField(
        null=True, blank=True, default=None,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    user_review = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self) -> str:
        return f"{self.user.username} - {self.movie.title}"
