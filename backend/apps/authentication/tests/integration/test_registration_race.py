"""Tests that a registration losing a race to a rival account answers 409.

Registration checks for an existing username or address before it creates the
account, so a rival registered between the check and the insert reaches the
database's unique constraints instead. The service takes its user model by
injection; these tests give it one whose existence checks miss the rival, as a
request that checked first would, while the insert runs against the real table.
"""

from __future__ import annotations

from http import HTTPStatus

import pytest
from django.test import RequestFactory

from apps.authentication.schemas import RegisterInputSchema
from apps.authentication.services.authentication_service import (
    AuthenticationService,
    UserManagerProtocol,
    UserProtocol,
    UserQuerySetProtocol,
)
from apps.core.tests.test_helpers import create_user
from apps.users.models import User

CONFLICT_ERROR = "Username or email address already associated with an existing account."


class _ManagerAfterTheCheck:
    """The user manager as a request sees it when a rival registers after its checks."""

    def create_user(self, **kwargs: str) -> UserProtocol:
        return User.objects.create_user(**kwargs)

    def get(self, **kwargs: object) -> UserProtocol:
        return User.objects.get(**kwargs)

    def filter(self, **kwargs: object) -> UserQuerySetProtocol:
        return User.objects.none()


class UserModelAfterTheCheck:
    """The project's user model, with existence checks that miss the rival account."""

    objects: UserManagerProtocol = _ManagerAfterTheCheck()
    DoesNotExist: type[Exception] = User.DoesNotExist


def register(username: str, email: str) -> tuple[int, object]:
    """Register through the service with the racing user model."""
    service = AuthenticationService(user_model=UserModelAfterTheCheck())
    request = RequestFactory().post("/api/register/")
    payload = RegisterInputSchema(username=username, email=email, password="TestPass123!")
    return service.register_user(request, payload)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("username", "email"),
    [
        ("newcomer", "Rival@Example.com"),  # the rival holds the address, in another case
        ("rival", "newcomer@example.com"),  # the rival holds the username
    ],
)
def test_registration_that_loses_a_race_answers_conflict(username: str, email: str) -> None:
    create_user(username="rival", email="rival@example.com")

    status, body = register(username, email)

    assert status == HTTPStatus.CONFLICT
    assert body == {"error": CONFLICT_ERROR}
    assert User.objects.count() == 1
