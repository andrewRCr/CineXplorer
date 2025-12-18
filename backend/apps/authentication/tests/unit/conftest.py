"""Unit test fixtures for AuthenticationService."""
from __future__ import annotations

from dataclasses import dataclass
from unittest.mock import Mock

import pytest
from authentication.tests.test_helpers import create_mock_jwt_settings


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


@pytest.fixture()
def auth_service_factory() -> tuple[
    callable[..., tuple["AuthenticationService", AuthServiceDeps]],
    type[AuthServiceDeps],
]:
    """
    Build AuthenticationService with injectable mock dependencies.

    Returns:
        (factory_fn, AuthServiceDeps type) so tests can build service + mocks.
    """
    def _factory(**overrides: object) -> tuple["AuthenticationService", AuthServiceDeps]:
        from authentication.services.authentication_service import AuthenticationService

        user_model = Mock()
        email_address_model = Mock()
        email_address_model.objects = Mock()
        email_confirmation_model = Mock()
        email_confirmation_model.objects = Mock()
        email_confirmation_hmac = Mock()
        authenticate_fn = Mock()
        validate_password_fn = Mock()
        refresh_token_cls = Mock()
        jwt_settings_provider = Mock(return_value=create_mock_jwt_settings())
        set_cookie = Mock()
        blacklist_token_fn = Mock()
        check_token_blacklist_fn = Mock()
        extract_user_id_fn = Mock(return_value="unknown")
        build_error_response_fn = Mock(side_effect=lambda message, **_: {"error": message})
        client_info_getter = Mock(return_value=("127.0.0.1", "test-agent"))
        logger = Mock()

        deps = AuthServiceDeps(
            user_model=user_model,
            email_address_model=email_address_model,
            email_confirmation_model=email_confirmation_model,
            email_confirmation_hmac=email_confirmation_hmac,
            authenticate_fn=authenticate_fn,
            validate_password_fn=validate_password_fn,
            refresh_token_cls=refresh_token_cls,
            jwt_settings_provider=jwt_settings_provider,
            set_cookie=set_cookie,
            blacklist_token_fn=blacklist_token_fn,
            check_token_blacklist_fn=check_token_blacklist_fn,
            extract_user_id_fn=extract_user_id_fn,
            build_error_response_fn=build_error_response_fn,
            client_info_getter=client_info_getter,
            logger=logger,
        )

        # Allow per-test overrides
        for key, value in overrides.items():
            if hasattr(deps, key):
                setattr(deps, key, value)

        service = AuthenticationService(
            user_model=deps.user_model,
            email_address_model=deps.email_address_model,
            email_confirmation_model=deps.email_confirmation_model,
            email_confirmation_hmac=deps.email_confirmation_hmac,
            authenticate_fn=deps.authenticate_fn,
            validate_password_fn=deps.validate_password_fn,
            refresh_token_cls=deps.refresh_token_cls,
            jwt_settings_provider=deps.jwt_settings_provider,
            set_cookie=deps.set_cookie,
            blacklist_token_fn=deps.blacklist_token_fn,
            check_token_blacklist_fn=deps.check_token_blacklist_fn,
            extract_user_id_fn=deps.extract_user_id_fn,
            build_error_response_fn=deps.build_error_response_fn,
            client_info_getter=deps.client_info_getter,
            logger=deps.logger,
        )

        return service, deps

    return _factory, AuthServiceDeps
