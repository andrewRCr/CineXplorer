"""
Tests for custom Django admin interface.
"""

from http import HTTPStatus
from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.test import Client
from django.urls import reverse

if TYPE_CHECKING:
    from django.contrib.auth.models import User as UserType

User = get_user_model()


@pytest.fixture
def admin_client(db: None) -> tuple[Client, "UserType", "UserType"]:
    """Create admin client with logged-in superuser and a regular test user.

    Returns:
        tuple: (client, admin_user, regular_user)
    """
    client = Client()

    # django-types limitation - UserManager.create_superuser type not inferred
    admin_user = cast(
        "UserType",
        User.objects.create_superuser(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
            username="testAdminUser",
            email="testAdminUser@example.com",
            password="testpass123",
        ),
    )
    # django-types limitation - force_login typing issue with User vs AbstractBaseUser
    client.force_login(cast(AbstractBaseUser, admin_user))  # pyright: ignore[reportArgumentType]

    # django-types limitation - UserManager.create_user type not inferred
    regular_user = cast(
        "UserType",
        User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
            username="testUser@example.com",
            email="testUser@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        ),
    )

    return client, admin_user, regular_user


# ============================================================================
# Admin Interface Tests
# ============================================================================


def test_users_list(admin_client: tuple[Client, "UserType", "UserType"]) -> None:
    """Tests that created test users are listed on the page."""

    client, _admin_user, user = admin_client

    # Using Django's default User model (auth.User)
    url = reverse("admin:auth_user_changelist")
    res = client.get(url)

    assert res.status_code == HTTPStatus.OK
    assert user.first_name in res.content.decode()
    assert user.last_name in res.content.decode()
    assert user.email in res.content.decode()


def test_edit_user_page(admin_client: tuple[Client, "UserType", "UserType"]) -> None:
    """Tests that the user edit page works as expected."""

    client, _admin_user, user = admin_client

    # Using Django's default User model (auth.User)
    url = reverse("admin:auth_user_change", args=[user.id])
    res = client.get(url)

    assert res.status_code == HTTPStatus.OK


def test_create_user_page(admin_client: tuple[Client, "UserType", "UserType"]) -> None:
    """Tests that the create user page works as expected."""

    client, _admin_user, _user = admin_client

    # Using Django's default User model (auth.User)
    url = reverse("admin:auth_user_add")
    res = client.get(url)

    assert res.status_code == HTTPStatus.OK
