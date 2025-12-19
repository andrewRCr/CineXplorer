"""Shared typing definitions for AuthenticationService unit tests."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from unittest.mock import Mock

from apps.authentication.services.authentication_service import AuthenticationService


@dataclass
class AuthServiceDeps:
    """Container for AuthenticationService dependency mocks."""

    user_model: Mock
    email_address_model: Mock
    email_confirmation_model: Mock
    email_confirmation_hmac: Mock
    authenticate_fn: Mock
    validate_password_fn: Mock
    refresh_token_cls: Mock
    jwt_settings_provider: Mock
    set_cookie: Mock
    blacklist_token_fn: Mock
    check_token_blacklist_fn: Mock
    extract_user_id_fn: Mock
    build_error_response_fn: Mock
    client_info_getter: Mock
    logger: Mock


type AuthServiceFactory = Callable[..., tuple[AuthenticationService, AuthServiceDeps]]


__all__ = ["AuthServiceDeps", "AuthServiceFactory"]
