"""Unit tests for AuthenticationService profile operations."""

from __future__ import annotations

from typing import Protocol, cast

import pytest

from apps.authentication.tests.test_helpers import (
    create_user_profile_update_input,
    normalize_response_data,
)
from apps.authentication.tests.unit.types import AuthServiceFactory
from apps.core.tests.test_helpers import create_user


@pytest.mark.django_db
def test_get_user_profile_includes_computed_fields(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()

    user = create_user(first_name="Test", last_name="User")
    deps.email_address_model.objects.filter.return_value.exists.return_value = True

    profile = service.get_user_profile(user)

    profile_dict = normalize_response_data(profile)
    assert profile_dict["email"] == user.email
    assert profile_dict["email_verified"] is True
    assert profile_dict["full_name"] == "Test User"


@pytest.mark.django_db
def test_update_user_profile_updates_fields_and_password(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    user = create_user(first_name="Old", last_name="Name", password="oldpass123")
    payload = create_user_profile_update_input(
        email="new@example.com",
        first_name="New",
        last_name="Name",
        password="newpass123",
    )
    deps.email_address_model.objects.filter.return_value.exists.return_value = False

    profile = service.update_user_profile(user, payload)

    profile_dict = normalize_response_data(profile)
    assert profile_dict["email"] == "new@example.com"
    assert profile_dict["full_name"] == "New Name"
    user.refresh_from_db()

    class PasswordCheckProtocol(Protocol):
        def check_password(self, raw_password: str) -> bool:
            """Validate a raw password."""
            ...

    assert cast(PasswordCheckProtocol, user).check_password("newpass123") is True


@pytest.mark.django_db
def test_update_user_profile_partial_update(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    user = create_user(first_name="Old", last_name="Name")
    payload = create_user_profile_update_input(first_name="Updated", password=None)
    deps.email_address_model.objects.filter.return_value.exists.return_value = False

    profile = service.update_user_profile(user, payload)

    profile_dict = normalize_response_data(profile)
    assert profile_dict["full_name"] == "Updated User"
