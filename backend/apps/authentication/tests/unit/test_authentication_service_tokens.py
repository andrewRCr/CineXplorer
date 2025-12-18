"""Unit tests for AuthenticationService token management."""
from __future__ import annotations

from datetime import timedelta
from unittest.mock import Mock

from authentication.tests.test_helpers import (
    create_mock_refresh_token,
    create_token_input,
    normalize_response_data,
)
from authentication.tests.unit.types import AuthServiceFactory
from ninja_jwt.exceptions import TokenError


def test_obtain_token_success(auth_service_factory: AuthServiceFactory) -> None:
    service, deps = auth_service_factory()
    payload = create_token_input()
    request = Mock()
    response = Mock()

    mock_user = Mock(id=42, username="testuser")
    deps.authenticate_fn.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = True

    mock_refresh = create_mock_refresh_token(user_id=42)
    deps.refresh_token_cls.for_user.return_value = mock_refresh

    status, data = service.obtain_token(request, response, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert data_dict["user_id"] == 42
    assert data_dict["access_token"] == "access-token"
    assert data_dict["refresh_token"] == "refresh-token"
    deps.set_cookie.assert_called_once_with(
        response,
        deps.jwt_settings_provider.return_value.refresh_token_name,
        "refresh-token",
        deps.jwt_settings_provider.return_value.refresh_lifetime,
        deps.jwt_settings_provider.return_value.samesite,
    )
    deps.logger.info.assert_called()


def test_obtain_token_requires_credentials(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, _deps = auth_service_factory()
    payload = create_token_input(login="", password="")

    status, data = service.obtain_token(Mock(), Mock(), payload)

    assert status == 400
    data_dict = normalize_response_data(data)
    assert "required" in str(data_dict["error"])


def test_obtain_token_rejects_invalid_credentials(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_token_input()

    deps.authenticate_fn.return_value = None

    status, data = service.obtain_token(Mock(), Mock(), payload)

    assert status == 401
    data_dict = normalize_response_data(data)
    assert "Unable to authenticate" in str(data_dict["error"])
    deps.logger.warning.assert_called()


def test_obtain_token_rejects_unverified_email(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_token_input()

    deps.authenticate_fn.return_value = Mock(id=1)
    deps.email_address_model.objects.filter.return_value.exists.return_value = False

    status, data = service.obtain_token(Mock(), Mock(), payload)

    assert status == 403
    data_dict = normalize_response_data(data)
    assert "verify your email" in str(data_dict["error"])
    deps.logger.warning.assert_called()


def test_refresh_token_requires_cookie(auth_service_factory: AuthServiceFactory) -> None:
    service, _deps = auth_service_factory()
    request = Mock(COOKIES={})

    status, data = service.refresh_token(request, Mock())

    assert status == 400
    data_dict = normalize_response_data(data)
    assert "No valid refresh token" in str(data_dict["error"])


def test_refresh_token_success(auth_service_factory: AuthServiceFactory) -> None:
    service, deps = auth_service_factory()

    request = Mock(COOKIES={"refresh_token": "old-refresh"})
    response = Mock()

    old_refresh = create_mock_refresh_token(user_id=7, access_token="old-access")
    deps.refresh_token_cls.return_value = old_refresh
    deps.user_model.objects.get.return_value = Mock(id=7)
    new_refresh = create_mock_refresh_token(
        user_id=7,
        access_token="new-access",
        refresh_token="new-refresh",
    )
    deps.refresh_token_cls.for_user.return_value = new_refresh

    status, data = service.refresh_token(request, response)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert data_dict["user_id"] == 7
    assert data_dict["access_token"] == "old-access"
    assert data_dict["refresh_token"] == "new-refresh"
    assert deps.set_cookie.call_count == 2
    deps.blacklist_token_fn.assert_called_once_with(old_refresh)


def test_refresh_token_blacklisted_error(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock(COOKIES={"refresh_token": "old-refresh"})

    deps.refresh_token_cls.side_effect = TokenError("Token is blacklisted")
    deps.extract_user_id_fn.return_value = 99
    deps.build_error_response_fn.return_value = {
        "error": "Token has been revoked. Please login again."
    }

    status, data = service.refresh_token(request, Mock())

    assert status == 401
    data_dict = normalize_response_data(data)
    assert data_dict["error"] == "Token has been revoked. Please login again."
    deps.logger.warning.assert_called()


def test_hybrid_refresh_sets_only_refresh_cookie(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock(COOKIES={"refresh_token": "old-refresh"})
    response = Mock()

    old_refresh = create_mock_refresh_token(user_id=7, access_token="old-access")
    deps.refresh_token_cls.return_value = old_refresh
    deps.user_model.objects.get.return_value = Mock(id=7)
    new_refresh = create_mock_refresh_token(
        user_id=7,
        access_token="new-access",
        refresh_token="new-refresh",
    )
    deps.refresh_token_cls.for_user.return_value = new_refresh
    deps.check_token_blacklist_fn.return_value = False

    status, data = service.hybrid_refresh_token(request, response)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert data_dict["access_token"] == "old-access"
    assert data_dict["expires_in"] == int(timedelta(minutes=5).total_seconds())
    assert isinstance(data_dict["issued_at"], str)
    deps.set_cookie.assert_called_once_with(
        response,
        deps.jwt_settings_provider.return_value.refresh_token_name,
        "new-refresh",
        deps.jwt_settings_provider.return_value.refresh_lifetime,
        deps.jwt_settings_provider.return_value.samesite,
    )


def test_logout_clears_refresh_cookie(auth_service_factory: AuthServiceFactory) -> None:
    service, deps = auth_service_factory()
    response = Mock()

    status, data = service.logout(response)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Logged out" in str(data_dict["message"])
    response.set_cookie.assert_called_once_with(
        deps.jwt_settings_provider.return_value.refresh_token_name,
        "",
        max_age=0,
        httponly=True,
        secure=True,
        samesite=deps.jwt_settings_provider.return_value.samesite,
        path="/",
        domain=None,
    )
