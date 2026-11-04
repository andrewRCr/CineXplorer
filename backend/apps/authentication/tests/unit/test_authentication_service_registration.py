"""Unit tests for AuthenticationService registration flow."""

from __future__ import annotations

from contextlib import nullcontext
from unittest.mock import Mock, patch

from django.core.exceptions import ValidationError
from django.test import override_settings

from apps.authentication.tests.mock_paths import (
    AUTH_SERVICE_SEND_VERIFICATION_EMAIL,
    AUTH_SERVICE_TRANSACTION_ATOMIC,
)
from apps.authentication.tests.test_helpers import (
    create_register_input,
    normalize_response_data,
)
from apps.authentication.tests.unit.types import AuthServiceFactory


@patch(AUTH_SERVICE_SEND_VERIFICATION_EMAIL)
@patch(AUTH_SERVICE_TRANSACTION_ATOMIC, nullcontext)
def test_register_user_success(
    mock_send_email: Mock,
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_register_input()
    request = Mock()

    deps.user_model.objects.filter.return_value.exists.return_value = False
    mock_user = Mock(id=1, email=payload.email)
    deps.user_model.objects.create_user.return_value = mock_user
    mock_email_address = Mock()
    deps.email_address_model.objects.create.return_value = mock_email_address
    mock_send_email.return_value = True  # Email sent successfully

    status, data = service.register_user(request, payload)

    assert status == 201
    data_dict = normalize_response_data(data)
    assert data_dict["user_id"] == 1
    assert data_dict["email"] == payload.email
    assert data_dict["email_sent"] is True
    deps.email_address_model.objects.create.assert_called_once_with(
        user=mock_user,
        email=payload.email,
        verified=False,
        primary=True,
    )
    mock_send_email.assert_called_once_with(request, mock_email_address, signup=True)
    deps.logger.info.assert_called()


@override_settings(FORBIDDEN_USERNAMES={"testuser"})
def test_register_user_rejects_forbidden_username(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_register_input(username="testuser")

    status, data = service.register_user(Mock(), payload)

    assert status == 409
    data_dict = normalize_response_data(data)
    assert "not allowed" in str(data_dict["error"])
    deps.user_model.objects.filter.assert_not_called()
    deps.logger.warning.assert_called()


def test_register_user_rejects_existing_username(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_register_input(username="dupeuser")

    username_exists = Mock()
    username_exists.exists.return_value = True
    email_exists = Mock()
    email_exists.exists.return_value = False
    deps.user_model.objects.filter.side_effect = [username_exists, email_exists]

    status, data = service.register_user(Mock(), payload)

    assert status == 409
    data_dict = normalize_response_data(data)
    assert "Username already associated" in str(data_dict["error"])
    deps.logger.warning.assert_called()


def test_register_user_rejects_existing_email(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_register_input(email="dupe@example.com")

    username_exists = Mock()
    username_exists.exists.return_value = False
    email_exists = Mock()
    email_exists.exists.return_value = True
    deps.user_model.objects.filter.side_effect = [username_exists, email_exists]

    status, data = service.register_user(Mock(), payload)

    assert status == 409
    data_dict = normalize_response_data(data)
    assert "Email address already associated" in str(data_dict["error"])
    deps.logger.warning.assert_called()


def test_register_user_rejects_weak_password(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    payload = create_register_input()

    deps.user_model.objects.filter.return_value.exists.return_value = False
    deps.validate_password_fn.side_effect = ValidationError(["Too weak"])

    status, data = service.register_user(Mock(), payload)

    assert status == 400
    data_dict = normalize_response_data(data)
    assert data_dict["error"] == "Password validation failed."
    assert "Too weak" in str(data_dict["details"])
    deps.logger.warning.assert_called()


@patch(AUTH_SERVICE_SEND_VERIFICATION_EMAIL)
@patch(AUTH_SERVICE_TRANSACTION_ATOMIC, nullcontext)
def test_register_user_returns_500_on_email_failure(
    mock_send_email: Mock,
    auth_service_factory: AuthServiceFactory,
) -> None:
    """Test that email sending failure returns 500 and logs error.

    Note: With transaction.atomic(), rollback is automatic - no manual delete() needed.
    The transaction ensures atomicity; this test verifies error handling behavior.
    """
    service, deps = auth_service_factory()
    payload = create_register_input()
    request = Mock()

    deps.user_model.objects.filter.return_value.exists.return_value = False
    mock_user = Mock(id=1, email=payload.email)
    deps.user_model.objects.create_user.return_value = mock_user
    mock_email_address = Mock()
    deps.email_address_model.objects.create.return_value = mock_email_address
    mock_send_email.return_value = False  # Email send failed

    status, data = service.register_user(request, payload)

    assert status == 500
    data_dict = normalize_response_data(data)
    assert data_dict["email_sent"] is False
    assert "Unable to send verification email" in str(data_dict["error"])
    deps.logger.error.assert_called()
