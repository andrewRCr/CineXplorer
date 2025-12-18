"""Unit tests for AuthenticationService profile operations."""
from __future__ import annotations

import pytest
from authentication.tests.test_helpers import create_user_profile_update_input
from core.tests.test_helpers import create_user


@pytest.mark.django_db
def test_get_user_profile_includes_computed_fields(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()

    user = create_user(first_name="Test", last_name="User")
    deps.email_address_model.objects.filter.return_value.exists.return_value = True

    profile = service.get_user_profile(user)

    assert profile.email == user.email
    assert profile.email_verified is True
    assert profile.full_name == "Test User"


@pytest.mark.django_db
def test_update_user_profile_updates_fields_and_password(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    user = create_user(first_name="Old", last_name="Name", password="oldpass123")
    payload = create_user_profile_update_input(
        email="new@example.com",
        first_name="New",
        last_name="Name",
        password="newpass123",
    )
    deps.email_address_model.objects.filter.return_value.exists.return_value = False

    profile = service.update_user_profile(user, payload)

    assert profile.email == "new@example.com"
    assert profile.full_name == "New Name"
    user.refresh_from_db()
    assert user.check_password("newpass123") is True


@pytest.mark.django_db
def test_update_user_profile_partial_update(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    user = create_user(first_name="Old", last_name="Name")
    payload = create_user_profile_update_input(first_name="Updated", password=None)
    deps.email_address_model.objects.filter.return_value.exists.return_value = False

    profile = service.update_user_profile(user, payload)

    assert profile.full_name == "Updated User"
