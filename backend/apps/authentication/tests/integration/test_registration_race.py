"""Tests that a registration losing a race to a rival account answers 409.

Registration checks for an existing username or address, validates the password,
then creates the account, so a rival that registers in between reaches the
database's unique constraints rather than the checks. The service takes its password
validator by injection; these tests give it one that registers the rival at that
moment. The real checks run and pass, and the insert meets the rival's row.
"""

from __future__ import annotations

from http import HTTPStatus

import pytest
from django.test import RequestFactory

from apps.authentication.schemas import RegisterInputSchema
from apps.authentication.services.authentication_service import AuthenticationService
from apps.core.tests.test_helpers import create_user
from apps.users.models import User

CONFLICT_ERROR = "Username or email address already associated with an existing account."


def rival_registers(password: str) -> None:
    """Stand in for password validation, registering a rival account meanwhile."""
    create_user(username="rival", email="rival@example.com")


def register(username: str, email: str) -> tuple[int, object]:
    """Register through the service while the rival registers mid-request."""
    service = AuthenticationService(validate_password_fn=rival_registers)
    request = RequestFactory().post("/api/register/")
    payload = RegisterInputSchema(username=username, email=email, password="TestPass123!")
    return service.register_user(request, payload)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("username", "email"),
    [
        ("newcomer", "Rival@Example.com"),  # the rival takes the address, in another case
        ("rival", "newcomer@example.com"),  # the rival takes the username
    ],
)
def test_registration_that_loses_a_race_answers_conflict(username: str, email: str) -> None:
    status, body = register(username, email)

    assert status == HTTPStatus.CONFLICT
    assert body == {"error": CONFLICT_ERROR}
    assert list(User.objects.values_list("username", flat=True)) == ["rival"]
