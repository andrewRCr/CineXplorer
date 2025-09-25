"""
Shared Erro    # Authentication errors
    EMAIL_NOT_VERIFIED = 'email_not_verified'
    INVALID_CREDENTIALS = 'invalid_credentials'
    ACCOUNT_DISABLED = 'account_disabled'
    ACCOUNT_LOCKED = 'account_locked'
    INVALID_AUTHORIZATION = 'invalid_authorization'
    INVALID_REFRESH_TOKEN = 'invalid_refresh_token'
    INVALID_AUTHORIZATION = 'invalid_authorization'
    INVALID_REFRESH_TOKEN = 'invalid_refresh_token'stants

Centralized error codes used across CineXplorer frontend and backend.
This ensures consistency and prevents drift between error definitions.

This file should be kept in sync with frontend/shared/error-codes.ts
"""

from __future__ import annotations
from typing import Literal


# Error Codes - Keep in sync with frontend/shared/error-codes.ts
class ERROR_CODES:
    """Error codes used throughout the CineXplorer API"""

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


# Error Categories
class ERROR_CATEGORIES:
    """Error categories for better organization"""

    AUTHENTICATION = 'authentication'
    USER_MANAGEMENT = 'user_management'
    MOVIE_DATA = 'movie_data'
    API_GENERAL = 'api_general'


# Type hints for better IDE support
ErrorCode = Literal[
    'email_not_verified', 'invalid_credentials', 'account_disabled', 'account_locked',
    'invalid_authorization', 'invalid_refresh_token',
    'username_exists', 'email_exists', 'invalid_username', 'weak_password',
    'movie_not_found', 'invalid_rating', 'duplicate_rating',
    'validation_error', 'permission_denied', 'resource_not_found', 'rate_limited'
]

ErrorCategory = Literal['authentication', 'user_management', 'movie_data', 'api_general']


# Maps error codes to their categories
ERROR_CODE_TO_CATEGORY: dict[str, ErrorCategory] = {
    # Authentication errors
    'email_not_verified': ERROR_CATEGORIES.AUTHENTICATION,
    'invalid_credentials': ERROR_CATEGORIES.AUTHENTICATION,
    'account_disabled': ERROR_CATEGORIES.AUTHENTICATION,
    'account_locked': ERROR_CATEGORIES.AUTHENTICATION,
    'invalid_authorization': ERROR_CATEGORIES.AUTHENTICATION,
    'invalid_refresh_token': ERROR_CATEGORIES.AUTHENTICATION,

    # User management errors
    'username_exists': ERROR_CATEGORIES.USER_MANAGEMENT,
    'email_exists': ERROR_CATEGORIES.USER_MANAGEMENT,
    'invalid_username': ERROR_CATEGORIES.USER_MANAGEMENT,
    'weak_password': ERROR_CATEGORIES.USER_MANAGEMENT,

    # Movie data errors
    'movie_not_found': ERROR_CATEGORIES.MOVIE_DATA,
    'invalid_rating': ERROR_CATEGORIES.MOVIE_DATA,
    'duplicate_rating': ERROR_CATEGORIES.MOVIE_DATA,

    # General API errors
    'validation_error': ERROR_CATEGORIES.API_GENERAL,
    'permission_denied': ERROR_CATEGORIES.API_GENERAL,
    'resource_not_found': ERROR_CATEGORIES.API_GENERAL,
    'rate_limited': ERROR_CATEGORIES.API_GENERAL,
}


def is_error_in_category(error_code: str, category: ErrorCategory) -> bool:
    """Check if an error code belongs to a category"""
    return ERROR_CODE_TO_CATEGORY.get(error_code) == category


def get_error_category(error_code: str) -> ErrorCategory:
    """Get category for an error code"""
    return ERROR_CODE_TO_CATEGORY.get(error_code, ERROR_CATEGORIES.API_GENERAL)
