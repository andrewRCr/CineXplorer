"""
Centralized mock target paths for authentication app tests.

This module provides constants for commonly-mocked module paths,
eliminating string duplication across test files and ensuring
path updates only need to happen in one place.

Usage:
    from apps.authentication.tests.mock_paths import AUTH_SERVICE_EMAIL_ADD

    with patch(AUTH_SERVICE_EMAIL_ADD):
        ...
"""

# =============================================================================
# Authentication Service Paths
# =============================================================================

# Email management
AUTH_SERVICE_EMAIL_ADD = (
    "apps.authentication.services.authentication_service.EmailAddress.objects.add_email"
)

# Schema paths
AUTH_SCHEMA_PROFILE_FROM_ORM = "apps.authentication.schemas.UserProfileSchema.from_orm"
