"""
Error codes constants stub.

🚨 TECHNICAL DEBT: These error codes will be moved into Pydantic schemas during
   Django Ninja migration. The new approach will:
   - Define error codes as Pydantic Enum fields in response schemas
   - Auto-generate TypeScript error code types for frontend
   - Ensure type-safe error handling across backend/frontend boundary
   - Provide single source of truth in backend API schemas

Status: Temporary stub - to be replaced by Pydantic Enum in API response schemas.
"""
from __future__ import annotations


class ErrorCodes:
    """
    Error codes used across backend validation and frontend error handling.

    These constants provide shared error codes between Django backend and
    TypeScript frontend for consistent user experience.
    """
    __slots__ = ()  # Prevent instance dict to lock down mutability

    # Authentication & Authorization
    EMAIL_NOT_VERIFIED = 'email_not_verified'
    INVALID_CREDENTIALS = 'invalid_credentials'
    ACCOUNT_DISABLED = 'account_disabled'
    ACCOUNT_LOCKED = 'account_locked'
    INVALID_AUTHORIZATION = 'invalid_authorization'
    INVALID_REFRESH_TOKEN = 'invalid_refresh_token'

    # Validation Errors
    VALIDATION_ERROR = 'validation_error'
    REQUIRED_FIELD_MISSING = 'required_field_missing'
    INVALID_FORMAT = 'invalid_format'

    # Resource Errors
    NOT_FOUND = 'not_found'
    ALREADY_EXISTS = 'already_exists'
    PERMISSION_DENIED = 'permission_denied'

    # System Errors
    INTERNAL_SERVER_ERROR = 'internal_server_error'
    SERVICE_UNAVAILABLE = 'service_unavailable'
    RATE_LIMITED = 'rate_limited'

    def __setattr__(self, name: str, value: object) -> None:
        """Guard against accidental writes to the instance."""
        raise AttributeError(
            "ErrorCodes is read-only; modify at the source or migrate to Enum."
        )


# Global instance for backward compatibility with existing code
ERROR_CODES = ErrorCodes()

# Explicit public surface
__all__ = ("ERROR_CODES", "ErrorCodes")
