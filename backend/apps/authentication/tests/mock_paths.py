"""
Centralized mock target paths for authentication app tests.

This module provides constants for commonly-mocked module paths,
eliminating string duplication across test files and ensuring
path updates only need to happen in one place.

Usage:
    from apps.authentication.tests.mock_paths import AUTH_SERVICE_SEND_VERIFICATION_EMAIL

    with patch(AUTH_SERVICE_SEND_VERIFICATION_EMAIL):
        ...
"""

# =============================================================================
# Authentication Service Paths
# =============================================================================

# Email sending (registration flow)
AUTH_SERVICE_SEND_VERIFICATION_EMAIL = (
    "apps.authentication.services.authentication_service.send_verification_email_to_address"
)

# Transaction management (for unit test isolation)
AUTH_SERVICE_TRANSACTION_ATOMIC = (
    "apps.authentication.services.authentication_service.transaction.atomic"
)

# Schema paths
AUTH_SCHEMA_PROFILE_MODEL_VALIDATE = (
    "apps.authentication.schemas.UserProfileSchema.model_validate"
)
