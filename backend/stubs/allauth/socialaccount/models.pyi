"""Type stub file for django-allauth socialaccount models.

Provides explicit type annotations for allauth's SocialApp and SocialAccount
models used in OAuth authentication. NO official type stubs exist for django-allauth.

⚠️ MAINTENANCE CONTRACT
------------------------
Synchronized with: django-allauth 65.12.0 + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading django-allauth or django-types:
1. Check allauth release notes for SocialApp/SocialAccount API changes
2. Check for official allauth type stubs (none exist as of 65.12.0)
3. Run tests - if runtime errors occur, check this stub file first
4. Verify method signatures match actual runtime behavior
5. Update "Last verified" date above

Trade-off: This stub eliminates type errors in test fixtures (~30 lines) but
requires manual verification on allauth upgrades. For a stable library like
allauth, this is acceptable (OAuth models rarely change).

Purpose: Eliminates "Stub file not found" errors in authentication test fixtures
Pattern: Custom stubs for third-party libraries without complete type information
Status: NO official allauth stubs exist - this is REQUIRED (not a supplement)
Provider-specific extra_data uses object because its JSON shape varies by provider.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models

if TYPE_CHECKING:
    from django.contrib.sites.models import Site
    from django.db.models.manager import Manager, ManyToManyRelatedManager

class SocialApp(models.Model):
    """Type stub for allauth's SocialApp model.

    Represents an OAuth provider configuration (client ID, secret, etc.)
    for social authentication.

    Note: DoesNotExist exception is inherited from Model and available at runtime
    """

    # Fields
    provider: str  # e.g., 'google', 'github', 'facebook'
    name: str  # Human-readable provider name
    client_id: str  # OAuth client ID
    secret: str  # OAuth client secret
    key: str  # Optional OAuth key (deprecated for most providers)

    # Many-to-many relations
    sites: ClassVar[ManyToManyRelatedManager[Site, Site]]

    # Manager (override acceptable in stub files)
    objects: ClassVar[Manager[SocialApp]]  # pyright: ignore[reportIncompatibleVariableOverride]

class SocialAccount(models.Model):
    """Type stub for allauth's SocialAccount model.

    Represents a user's social authentication account (OAuth connection
    to a specific provider).

    Note: DoesNotExist exception is inherited from Model and available at runtime
    """

    # Fields
    user: AbstractBaseUser  # User this social account belongs to
    provider: str  # Provider name ('google', 'github', etc.)
    uid: str  # Unique identifier from provider
    extra_data: object  # JSON field containing provider-specific data (profile info, etc.)

    # Manager (override acceptable in stub files)
    objects: ClassVar[Manager[SocialAccount]]  # pyright: ignore[reportIncompatibleVariableOverride]
