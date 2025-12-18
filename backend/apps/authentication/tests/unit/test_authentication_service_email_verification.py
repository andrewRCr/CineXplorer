"""Unit tests for AuthenticationService email verification flows."""
from __future__ import annotations

from unittest.mock import Mock

from authentication.tests.test_helpers import (
    create_email_verification_input,
    create_resend_verification_input,
)


def test_verify_email_success_with_hmac(auth_service_factory: tuple[callable, type]) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_email_verification_input()

    email_address = Mock(verified=False, email="test@example.com")
    confirmation = Mock(email_address=email_address)
    deps.email_confirmation_hmac.from_key.return_value = confirmation

    status, data = service.verify_email(request, payload)

    assert status == 200
    assert "verified successfully" in data["message"]
    confirmation.confirm.assert_called_once_with(request)


def test_verify_email_falls_back_to_db_confirmation(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_email_verification_input()

    deps.email_confirmation_hmac.from_key.return_value = None
    email_address = Mock(verified=False, email="test@example.com")
    confirmation = Mock(email_address=email_address)
    deps.email_confirmation_model.objects.get.return_value = confirmation

    status, data = service.verify_email(request, payload)

    assert status == 200
    assert "verified successfully" in data["message"]
    confirmation.confirm.assert_called_once_with(request)


def test_verify_email_rejects_already_verified(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_email_verification_input()

    email_address = Mock(verified=True, email="test@example.com")
    confirmation = Mock(email_address=email_address)
    deps.email_confirmation_hmac.from_key.return_value = confirmation

    status, data = service.verify_email(request, payload)

    assert status == 400
    assert "already verified" in data["error"]


def test_verify_email_invalid_key_returns_error(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_email_verification_input()

    class DoesNotExist(Exception):
        pass

    deps.email_confirmation_model.DoesNotExist = DoesNotExist
    deps.email_confirmation_hmac.from_key.return_value = None
    deps.email_confirmation_model.objects.get.side_effect = DoesNotExist()

    status, data = service.verify_email(request, payload)

    assert status == 400
    assert "Invalid or expired" in data["error"]


def test_resend_verification_rejects_verified_email(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_resend_verification_input()

    mock_user = Mock()
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = True

    status, data = service.resend_verification(request, payload)

    assert status == 400
    assert "already verified" in data["error"]


def test_resend_verification_sends_existing_email(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_resend_verification_input()

    mock_user = Mock()
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = False
    email_address = Mock()
    deps.email_address_model.objects.get.return_value = email_address

    status, data = service.resend_verification(request, payload)

    assert status == 200
    assert "Verification email sent" in data["message"]
    email_address.send_confirmation.assert_called_once_with(request)


def test_resend_verification_creates_email_if_missing(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_resend_verification_input()

    class DoesNotExist(Exception):
        pass

    mock_user = Mock()
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = False
    deps.email_address_model.DoesNotExist = DoesNotExist
    deps.email_address_model.objects.get.side_effect = DoesNotExist()

    status, data = service.resend_verification(request, payload)

    assert status == 200
    assert "Verification email sent" in data["message"]
    deps.email_address_model.objects.add_email.assert_called_once_with(
        request,
        mock_user,
        payload.email,
        confirm=True,
    )


def test_resend_verification_hides_missing_user(
    auth_service_factory: tuple[callable, type]
) -> None:
    factory, _deps_type = auth_service_factory
    service, deps = factory()
    request = Mock()
    payload = create_resend_verification_input()

    class UserDoesNotExist(Exception):
        pass

    deps.user_model.DoesNotExist = UserDoesNotExist
    deps.user_model.objects.get.side_effect = UserDoesNotExist()

    status, data = service.resend_verification(request, payload)

    assert status == 200
    assert "verification email has been sent" in data["message"]
