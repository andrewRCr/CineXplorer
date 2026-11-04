"""Unit tests for AuthenticationService profile operations."""

from __future__ import annotations

import pytest

from apps.authentication.tests.test_helpers import normalize_response_data
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
