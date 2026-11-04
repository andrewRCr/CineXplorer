"""Tests for the project's user model: its email uniqueness ignores case."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.users.models import User


def test_user_model_is_the_projects() -> None:
    assert get_user_model() is User


@pytest.mark.django_db
def test_email_in_another_case_is_refused() -> None:
    User.objects.create_user(username="first", email="Person@Example.com")

    with pytest.raises(IntegrityError):
        User.objects.create_user(username="second", email="person@example.com")


@pytest.mark.django_db
def test_accounts_without_email_may_coexist() -> None:
    User.objects.create_user(username="first", email="")
    User.objects.create_user(username="second", email="")

    assert User.objects.filter(email="").count() == 2
