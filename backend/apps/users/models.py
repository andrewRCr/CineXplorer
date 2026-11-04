"""The project's user model, set as `AUTH_USER_MODEL`."""

from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """A CineXplorer account: Django's standard user, owned by this project.

    `date_joined` records when the account was created.
    """

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # allauth matches addresses ignoring case, so two accounts can't share one in
            # any case. Accounts without an address are exempt.
            models.UniqueConstraint(
                Lower("email"),
                condition=~models.Q(email=""),
                name="users_user_email_unique_ignoring_case",
            ),
        ]
