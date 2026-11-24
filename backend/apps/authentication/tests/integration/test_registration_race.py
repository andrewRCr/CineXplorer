"""Tests that a registration losing a race to a rival account answers 409.

Registration checks for an existing username or address, validates the password,
then creates the account, so a rival that registers in between reaches the
database's unique constraints rather than the checks. The service takes its password
validator by injection; these tests give it one that registers the rival at that
moment. The real checks run and pass, and the insert meets the rival's row.
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING
from unittest import TestCase

import pytest

from apps.authentication.schemas import RegisterInputSchema
from apps.authentication.services.authentication_service import AuthenticationService
from apps.authentication.tests.test_helpers import (
    assert_account_log_correlation,
    start_proxied_request,
)
from apps.core.tests.test_helpers import create_user
from apps.users.models import User

if TYPE_CHECKING:
    from django.test import RequestFactory

CONFLICT_ERROR = "Username or email address already associated with an existing account."


def rival_registers(password: str) -> None:
    """Stand in for password validation, registering a rival account meanwhile."""
    create_user(username="rival", email="rival@example.com")


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("username", "email"),
    [
        ("newcomer", "Rival@Example.com"),  # the rival takes the address, in another case
        ("rival", "newcomer@example.com"),  # the rival takes the username
    ],
)
def test_registration_that_loses_a_race_answers_conflict(
    rf: RequestFactory, username: str, email: str
) -> None:
    service = AuthenticationService(validate_password_fn=rival_registers)
    request, request_id = start_proxied_request(rf, "/api/register/")
    payload = RegisterInputSchema(username=username, email=email, password="TestPass123!")
    with TestCase().assertLogs("cinexplorer.auth", level="WARNING") as captured:
        status, body = service.register_user(request, payload)

    assert status == HTTPStatus.CONFLICT
    assert body == {"error": CONFLICT_ERROR}
    assert list(User.objects.values_list("username", flat=True)) == ["rival"]
    assert_account_log_correlation(
        captured.records, "Registration failed: Username or email taken", request_id
    )
