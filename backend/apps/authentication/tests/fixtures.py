"""
Test data factory functions for authentication tests.

This module provides factory functions for creating test data with fine-grained
control over parameters. Use these when you need multiple instances with custom
values in a single test (e.g., creating users with different email verification
states, custom credentials, or OAuth configurations).

For simple single-instance cases, use the pytest fixtures in conftest.py instead,
which wrap these factory functions for convenience.

Pattern Choice:
    - Use pytest fixtures (conftest.py): Single instance, standard configuration
    - Use factory functions (this file): Multiple instances, custom parameters

Example:
    # Factory pattern (this file) - for complex scenarios
    def test_email_verification_edge_cases():
        verified = create_user(email='verified@example.com', email_verified=True)
        unverified = create_user(email='unverified@example.com', email_verified=False)
        assert verified != unverified

    # Fixture pattern (conftest.py) - for simple scenarios
    def test_user_profile(verified_user):
        assert verified_user.email == 'testuser@example.com'
"""
from typing import TYPE_CHECKING, TypedDict, Unpack

from allauth.socialaccount.models import SocialAccount, SocialApp

# Import canonical create_user from core test helpers
from core.tests.test_helpers import create_user
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site

if TYPE_CHECKING:
    from django.contrib.auth.models import User as UserType

User = get_user_model()

# Test data constants
# Used across all authentication tests for consistency
TEST_USER_PASSWORD = 'testpass123'


# Type definitions for fixture parameters
class UserParams(TypedDict, total=False):
    """Type for user creation parameters."""
    username: str
    email: str
    password: str
    first_name: str
    last_name: str


class RegisterPayload(TypedDict):
    """Type for user registration payload."""
    username: str
    email: str
    password: str
    first_name: str
    last_name: str


class LoginPayload(TypedDict, total=False):
    """Type for login payload (username or email)."""
    username: str
    email: str
    password: str


# User creation fixtures
# Note: create_user is imported from core.tests.test_helpers (canonical version)


def create_unverified_user(**params: Unpack[UserParams]) -> "UserType":
    """
    Create a user with unverified email.

    Convenience wrapper around create_user(email_verified=False).
    """
    return create_user(email_verified=False, **params)


def create_social_app(provider: str = 'google', site_id: int = 1) -> SocialApp:
    """
    Create a social auth app (OAuth provider) for testing.

    Args:
        provider: Provider name ('google', 'github', etc.)
        site_id: Site ID to link to (default: 1)

    Returns:
        Created SocialApp instance
    """
    # Get or create the site
    site = Site.objects.get_or_create(
        pk=site_id,
        defaults={'domain': 'localhost:8444', 'name': 'CineXplorer Test'}
    )[0]

    # Ensure single SocialApp per provider/site
    social_app, _ = SocialApp.objects.get_or_create(
        provider=provider,
        name=f'{provider.capitalize()} OAuth',
        defaults={
            'client_id': f'test_{provider}_client_id',
            'secret': f'test_{provider}_secret',
        },
    )
    social_app.sites.add(site)

    return social_app


def create_social_account(
    user: "UserType",
    provider: str = 'google',
    uid: str | None = None
) -> SocialAccount:
    """
    Create a social account linking a user to an OAuth provider.

    Args:
        user: User to link
        provider: Provider name ('google', 'github', etc.)
        uid: Unique ID from provider (defaults to user's email)

    Returns:
        Created SocialAccount instance
    """
    if uid is None:
        uid = user.email

    # Ensure social app exists
    create_social_app(provider)

    return SocialAccount.objects.create(
        user=user,
        provider=provider,
        uid=uid,
        extra_data={
            'email': user.email,
            'name': f'{user.first_name} {user.last_name}',
            'picture': 'https://example.com/avatar.jpg'
        }
    )


# Payload creation fixtures
def create_register_payload(
    username: str = 'testuser',
    email: str = 'testuser@example.com',
    password: str = TEST_USER_PASSWORD,
    first_name: str = 'Test',
    last_name: str = 'User'
) -> RegisterPayload:
    """
    Create a registration payload for API testing.

    Args:
        username: Username
        email: Email address
        password: Password
        first_name: First name
        last_name: Last name

    Returns:
        Registration payload dict
    """
    return {
        'username': username,
        'email': email,
        'password': password,
        'first_name': first_name,
        'last_name': last_name
    }


def create_login_payload(
    identifier: str = 'testuser',
    password: str = TEST_USER_PASSWORD,
    use_email: bool = False
) -> LoginPayload:
    """
    Create a login payload for API testing.

    Args:
        identifier: Username or email (depending on use_email)
        password: Password
        use_email: Whether to use email login (default: False = username)

    Returns:
        Login payload dict
    """
    if use_email:
        return {
            'email': identifier,
            'password': password
        }
    else:
        return {
            'username': identifier,
            'password': password
        }
