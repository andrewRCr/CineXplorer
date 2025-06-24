"""
Core database models.
"""

from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MaxValueValidator, MinValueValidator

import tmdbsimple as tmdb


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
    REQUIRED_FIELDS = ['email']

    objects = UserManager()


class UserMovieData(models.Model):
    """ Represents a user's data about a particular movie. """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )

    tmdb_id = models.IntegerField()
    title = models.CharField(max_length=255)
    user_watched = models.BooleanField(default=False)
    user_on_watchlist = models.BooleanField(default=False)
    user_liked = models.BooleanField(default=False)
    user_rating = models.IntegerField(
        default=0, validators=[MinValueValidator(1), MaxValueValidator(10)])
    user_review = models.TextField(blank=True)

    def __str__(self) -> str:
        return str(self.title)
