"""
Shared Error Code Constants

Centralized error codes used across CineXplorer frontend and backend.
This ensures consistency and prevents drift between error definitions.

This file should be kept in sync with frontend/shared/error-codes.ts
"""

from __future__ import annotations

from enum import StrEnum
from types import MappingProxyType
from typing import Final, Literal, Mapping


# Error code enums using StrEnum for type safety and better IDE support
class ErrorCode(StrEnum):
    """Error codes used throughout the CineXplorer API."""

    # Authentication errors
    EMAIL_NOT_VERIFIED = 'email_not_verified'
    INVALID_CREDENTIALS = 'invalid_credentials'
    ACCOUNT_DISABLED = 'account_disabled'
    ACCOUNT_LOCKED = 'account_locked'
    INVALID_AUTHORIZATION = 'invalid_authorization'
    INVALID_REFRESH_TOKEN = 'invalid_refresh_token'

    # User Management Errors
    USERNAME_EXISTS = 'username_exists'
    EMAIL_EXISTS = 'email_exists'
    INVALID_USERNAME = 'invalid_username'
    WEAK_PASSWORD = 'weak_password'

    # Movie Data Errors
    MOVIE_NOT_FOUND = 'movie_not_found'
    INVALID_RATING = 'invalid_rating'
    DUPLICATE_RATING = 'duplicate_rating'

    # General API Errors
    VALIDATION_ERROR = 'validation_error'
    PERMISSION_DENIED = 'permission_denied'
    RESOURCE_NOT_FOUND = 'resource_not_found'
    RATE_LIMITED = 'rate_limited'


class ErrorCategory(StrEnum):
    """Error categories for better organization."""

    AUTHENTICATION = 'authentication'
    USER_MANAGEMENT = 'user_management'
    MOVIE_DATA = 'movie_data'
    API_GENERAL = 'api_general'


# Legacy aliases for backward compatibility (deprecated - use ErrorCode enum directly)
class ERROR_CODES:
    """
    Deprecated: Use ErrorCode enum instead.

    Legacy namespace class maintained for backward compatibility.
    Will be removed in auth-modernization phase.
    """

    EMAIL_NOT_VERIFIED = ErrorCode.EMAIL_NOT_VERIFIED
    INVALID_CREDENTIALS = ErrorCode.INVALID_CREDENTIALS
    ACCOUNT_DISABLED = ErrorCode.ACCOUNT_DISABLED
    ACCOUNT_LOCKED = ErrorCode.ACCOUNT_LOCKED
    INVALID_AUTHORIZATION = ErrorCode.INVALID_AUTHORIZATION
    INVALID_REFRESH_TOKEN = ErrorCode.INVALID_REFRESH_TOKEN
    USERNAME_EXISTS = ErrorCode.USERNAME_EXISTS
    EMAIL_EXISTS = ErrorCode.EMAIL_EXISTS
    INVALID_USERNAME = ErrorCode.INVALID_USERNAME
    WEAK_PASSWORD = ErrorCode.WEAK_PASSWORD
    MOVIE_NOT_FOUND = ErrorCode.MOVIE_NOT_FOUND
    INVALID_RATING = ErrorCode.INVALID_RATING
    DUPLICATE_RATING = ErrorCode.DUPLICATE_RATING
    VALIDATION_ERROR = ErrorCode.VALIDATION_ERROR
    PERMISSION_DENIED = ErrorCode.PERMISSION_DENIED
    RESOURCE_NOT_FOUND = ErrorCode.RESOURCE_NOT_FOUND
    RATE_LIMITED = ErrorCode.RATE_LIMITED


class ERROR_CATEGORIES:
    """
    Deprecated: Use ErrorCategory enum instead.

    Legacy namespace class maintained for backward compatibility.
    Will be removed in auth-modernization phase.
    """

    AUTHENTICATION = ErrorCategory.AUTHENTICATION
    USER_MANAGEMENT = ErrorCategory.USER_MANAGEMENT
    MOVIE_DATA = ErrorCategory.MOVIE_DATA
    API_GENERAL = ErrorCategory.API_GENERAL


# Immutable mapping from error codes to categories
_ERROR_CODE_TO_CATEGORY_DICT: dict[str, ErrorCategory] = {
    # Authentication errors
    ErrorCode.EMAIL_NOT_VERIFIED: ErrorCategory.AUTHENTICATION,
    ErrorCode.INVALID_CREDENTIALS: ErrorCategory.AUTHENTICATION,
    ErrorCode.ACCOUNT_DISABLED: ErrorCategory.AUTHENTICATION,
    ErrorCode.ACCOUNT_LOCKED: ErrorCategory.AUTHENTICATION,
    ErrorCode.INVALID_AUTHORIZATION: ErrorCategory.AUTHENTICATION,
    ErrorCode.INVALID_REFRESH_TOKEN: ErrorCategory.AUTHENTICATION,
    # User management errors
    ErrorCode.USERNAME_EXISTS: ErrorCategory.USER_MANAGEMENT,
    ErrorCode.EMAIL_EXISTS: ErrorCategory.USER_MANAGEMENT,
    ErrorCode.INVALID_USERNAME: ErrorCategory.USER_MANAGEMENT,
    ErrorCode.WEAK_PASSWORD: ErrorCategory.USER_MANAGEMENT,
    # Movie data errors
    ErrorCode.MOVIE_NOT_FOUND: ErrorCategory.MOVIE_DATA,
    ErrorCode.INVALID_RATING: ErrorCategory.MOVIE_DATA,
    ErrorCode.DUPLICATE_RATING: ErrorCategory.MOVIE_DATA,
    # General API errors
    ErrorCode.VALIDATION_ERROR: ErrorCategory.API_GENERAL,
    ErrorCode.PERMISSION_DENIED: ErrorCategory.API_GENERAL,
    ErrorCode.RESOURCE_NOT_FOUND: ErrorCategory.API_GENERAL,
    ErrorCode.RATE_LIMITED: ErrorCategory.API_GENERAL,
}

ERROR_CODE_TO_CATEGORY: Final[Mapping[str, ErrorCategory]] = MappingProxyType(
    _ERROR_CODE_TO_CATEGORY_DICT
)


def is_error_in_category(error_code: ErrorCode | str, category: ErrorCategory) -> bool:
    """
    Check if an error code belongs to a category.

    Args:
        error_code: Known ErrorCode enum member or string (for forward compatibility)
        category: ErrorCategory to check against

    Returns:
        True if the error code belongs to the specified category

    Note: Accepts str for forward compatibility with unknown/future error codes.
    """
    return ERROR_CODE_TO_CATEGORY.get(str(error_code)) == category


def get_error_category(error_code: ErrorCode | str) -> ErrorCategory:
    """
    Get category for an error code.

    Args:
        error_code: Known ErrorCode enum member or string (for forward compatibility)

    Returns:
        ErrorCategory for the code, defaults to API_GENERAL for unknown codes

    Note: Accepts str for forward compatibility with unknown/future error codes.
    """
    return ERROR_CODE_TO_CATEGORY.get(str(error_code), ErrorCategory.API_GENERAL)