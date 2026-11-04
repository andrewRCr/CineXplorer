"""Tests for the data migration that stores existing email addresses in lowercase."""

from __future__ import annotations

import importlib

import pytest
from allauth.account.models import EmailAddress
from django.apps import apps
from django.contrib.auth import get_user_model

from apps.core.tests.test_helpers import create_user

migration = importlib.import_module("apps.authentication.migrations.0001_lowercase_emails")


@pytest.mark.django_db
def test_lowercases_user_and_email_records() -> None:
    """Mixed-case addresses become lowercase on the user and on its email record."""
    mixed = create_user(username="mixed", email="Mixed.Case@Example.com")
    lower = create_user(username="lower", email="lower@example.com")
    no_email = create_user(username="noemail", email="", email_verified=False)

    migration.lowercase_emails(apps, None)

    mixed.refresh_from_db()
    lower.refresh_from_db()
    no_email.refresh_from_db()
    assert mixed.email == "mixed.case@example.com"
    assert EmailAddress.objects.get(user=mixed).email == "mixed.case@example.com"
    assert lower.email == "lower@example.com"
    assert no_email.email == ""


@pytest.mark.django_db
def test_stops_when_two_users_share_an_address_once_lowercased() -> None:
    """Addresses that differ only in case across users stop the migration unchanged."""
    first = create_user(username="first", email="Same@example.com")
    create_user(username="second", email="same@example.com")

    with pytest.raises(RuntimeError, match="differ only in case"):
        migration.lowercase_emails(apps, None)

    first.refresh_from_db()
    assert first.email == "Same@example.com"


@pytest.mark.django_db
def test_stops_when_one_user_has_two_records_differing_in_case() -> None:
    """One user's email records that differ only in case stop the migration unchanged."""
    user = create_user(username="twice", email="twice@example.com")
    EmailAddress.objects.create(
        user=user, email="Twice@example.com", verified=False, primary=False
    )

    with pytest.raises(RuntimeError, match="differ only in case"):
        migration.lowercase_emails(apps, None)

    assert EmailAddress.objects.filter(email="Twice@example.com").exists()
    assert get_user_model().objects.filter(username="twice").exists()
