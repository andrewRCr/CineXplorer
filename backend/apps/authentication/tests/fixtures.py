"""
Test fixtures and helpers for authentication tests.

This module provides reusable test data creation utilities for authentication
testing, following the pattern established in the movie app tests.
"""
from typing import TypedDict, Unpack

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount, SocialApp
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.contrib.sites.models import Site

User = get_user_model()


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
def create_user(
    email_verified: bool = True,
    **params: Unpack[UserParams]
) -> AbstractUser:
    """
    Create and return a new user for testing.

    Args:
        email_verified: Whether to mark the user's email as verified (default: True)
        **params: Additional user parameters (username, email, password, etc.)

    Returns:
        Created user instance
    """
    # Set defaults
    defaults: dict[str, str] = {
        'username': 'testuser',
        'email': 'testuser@example.com',
        'password': 'testpass123',
        'first_name': 'Test',
        'last_name': 'User'
    }

    # Create user
    user = User.objects.create_user(**{**defaults, **params})

    # Mark email as verified if requested using allauth EmailAddress API
    # Use get_or_create to support --keepdb flag (reusing test database)
    if email_verified:
        EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'verified': True, 'primary': True}
        )

    return user


def create_unverified_user(**params: Unpack[UserParams]) -> AbstractUser:
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
    user: AbstractUser,
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
    password: str = 'testpass123',
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
    password: str = 'testpass123',
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
