"""Tests that the admin shows the blacklist but can't change it: the tracked file is its source."""

from __future__ import annotations

from http import HTTPStatus
from typing import cast

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client
from django.urls import reverse

from apps.movie.models import BlacklistedMovie


@pytest.fixture
def admin_client(db: None) -> Client:
    """A client signed in as a superuser."""
    # django-types doesn't type UserManager.create_superuser
    user = cast(
        AbstractBaseUser,
        get_user_model().objects.create_superuser(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
            username="blacklistadmin", email="blacklistadmin@example.com", password="testpass123"
        ),
    )
    client = Client()
    client.force_login(user)
    return client


def test_the_admin_lists_the_blacklist(admin_client: Client) -> None:
    BlacklistedMovie.objects.create(tmdb_id=100, reason="Mislabeled adult content on TMDB")

    response = admin_client.get(reverse("admin:movie_blacklistedmovie_changelist"))

    assert response.status_code == HTTPStatus.OK
    assert b"Mislabeled adult content on TMDB" in response.content


def test_the_admin_cannot_add_change_or_delete_entries(admin_client: Client) -> None:
    entry = BlacklistedMovie.objects.create(tmdb_id=100, reason="Mislabeled adult content on TMDB")

    add = admin_client.get(reverse("admin:movie_blacklistedmovie_add"))
    change = admin_client.post(
        reverse("admin:movie_blacklistedmovie_change", args=[entry.pk]),
        {"tmdb_id": 100, "reason": "Edited in the admin"},
    )
    delete = admin_client.post(
        reverse("admin:movie_blacklistedmovie_delete", args=[entry.pk]), {"post": "yes"}
    )

    assert add.status_code == HTTPStatus.FORBIDDEN
    assert change.status_code == HTTPStatus.FORBIDDEN
    assert delete.status_code == HTTPStatus.FORBIDDEN
    assert BlacklistedMovie.objects.get(pk=entry.pk).reason == "Mislabeled adult content on TMDB"
