"""Unit tests for AuthenticationService email verification flows."""
from __future__ import annotations

from unittest.mock import Mock

from apps.authentication.tests.test_helpers import (
    create_email_verification_input,
    create_resend_verification_input,
    normalize_response_data,
)
from apps.authentication.tests.unit.types import AuthServiceFactory


def test_verify_email_success_with_hmac(auth_service_factory: AuthServiceFactory) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_email_verification_input()

    email_address = Mock(verified=False, email="test@example.com")
    confirmation = Mock(email_address=email_address)
    deps.email_confirmation_hmac.from_key.return_value = confirmation

    status, data = service.verify_email(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "verified successfully" in str(data_dict["message"])
    confirmation.confirm.assert_called_once_with(request)


def test_verify_email_falls_back_to_db_confirmation(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_email_verification_input()

    deps.email_confirmation_hmac.from_key.return_value = None
    email_address = Mock(verified=False, email="test@example.com")
    confirmation = Mock(email_address=email_address)
    deps.email_confirmation_model.objects.get.return_value = confirmation

    status, data = service.verify_email(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "verified successfully" in str(data_dict["message"])
    confirmation.confirm.assert_called_once_with(request)


def test_verify_email_rejects_already_verified(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_email_verification_input()

    email_address = Mock(verified=True, email="test@example.com")
    confirmation = Mock(email_address=email_address)
    deps.email_confirmation_hmac.from_key.return_value = confirmation

    status, data = service.verify_email(request, payload)

    assert status == 400
    data_dict = normalize_response_data(data)
    assert "already verified" in str(data_dict["error"])


def test_verify_email_invalid_key_returns_error(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_email_verification_input()

    class DoesNotExistError(Exception):
        pass

    deps.email_confirmation_model.DoesNotExist = DoesNotExistError
    deps.email_confirmation_hmac.from_key.return_value = None
    deps.email_confirmation_model.objects.get.side_effect = DoesNotExistError()

    status, data = service.verify_email(request, payload)

    assert status == 400
    data_dict = normalize_response_data(data)
    assert "Invalid or expired" in str(data_dict["error"])


def test_resend_verification_rejects_verified_email(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    mock_user = Mock()
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = True

    status, data = service.resend_verification(request, payload)

    assert status == 400
    data_dict = normalize_response_data(data)
    assert "already verified" in str(data_dict["error"])


def test_resend_verification_sends_existing_email(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    mock_user = Mock()
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = False
    email_address = Mock()
    deps.email_address_model.objects.get.return_value = email_address

    status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])
    email_address.send_confirmation.assert_called_once_with(request)


def test_resend_verification_creates_email_if_missing(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    class DoesNotExistError(Exception):
        pass

    mock_user = Mock()
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = False
    deps.email_address_model.DoesNotExist = DoesNotExistError
    deps.email_address_model.objects.get.side_effect = DoesNotExistError()

    status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])
    deps.email_address_model.objects.add_email.assert_called_once_with(
        request,
        mock_user,
        payload.email,
        confirm=True,
    )


def test_resend_verification_hides_missing_user(
    auth_service_factory: AuthServiceFactory,
) -> None:
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    class UserDoesNotExistError(Exception):
        pass

    deps.user_model.DoesNotExist = UserDoesNotExistError
    deps.user_model.objects.get.side_effect = UserDoesNotExistError()

    status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "verification email has been sent" in str(data_dict["message"])
