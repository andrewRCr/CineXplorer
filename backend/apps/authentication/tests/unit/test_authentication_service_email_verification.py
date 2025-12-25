"""Unit tests for AuthenticationService email verification flows."""
# pyright: reportPrivateUsage = false
from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest

from apps.authentication.tests.test_helpers import (
    create_email_verification_input,
    create_resend_verification_input,
    normalize_response_data,
)
from apps.authentication.tests.unit.types import AuthServiceDeps, AuthServiceFactory

if TYPE_CHECKING:
    from apps.authentication.services.authentication_service import AuthenticationService


# =============================================================================
# Verify Email Tests
# =============================================================================


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


# =============================================================================
# Resend Verification Tests (Token-Based)
# =============================================================================

# The resend flow uses opaque tokens instead of email addresses for security.
# All paths return 200 to prevent user enumeration.


@contextmanager
def mock_token_validation(
    service: AuthenticationService,
    return_user_id: int | None,
) -> Generator[Mock]:
    """Mock _validate_resend_token to return specified user_id (or None for invalid)."""
    with patch.object(
        service, "_validate_resend_token", return_value=return_user_id
    ) as mock:
        yield mock


def setup_user_for_resend(
    deps: AuthServiceDeps,
    *,
    user_id: int = 1,
    email: str = "test@example.com",
    is_verified: bool = False,
) -> Mock:
    """Configure deps for a user lookup by ID with specified verification state."""
    mock_user = Mock(id=user_id, email=email)
    deps.user_model.objects.get.return_value = mock_user
    deps.email_address_model.objects.filter.return_value.exists.return_value = is_verified
    return mock_user


def test_resend_invalid_token_returns_generic_success(
    auth_service_factory: AuthServiceFactory,
) -> None:
    """Invalid/expired token returns 200 to prevent enumeration."""
    service, _ = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    with mock_token_validation(service, return_user_id=None):
        status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])


def test_resend_already_verified_returns_generic_success(
    auth_service_factory: AuthServiceFactory,
) -> None:
    """Already verified user returns 200 to prevent enumeration."""
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    setup_user_for_resend(deps, is_verified=True)

    with mock_token_validation(service, return_user_id=1):
        status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])


def test_resend_sends_to_existing_email_address(
    auth_service_factory: AuthServiceFactory,
) -> None:
    """Valid token triggers send_confirmation on existing EmailAddress."""
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    mock_user = setup_user_for_resend(deps, is_verified=False)
    email_address = Mock()
    deps.email_address_model.objects.get.return_value = email_address

    with mock_token_validation(service, return_user_id=1):
        status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])
    email_address.send_confirmation.assert_called_once_with(request)
    deps.email_address_model.objects.get.assert_called_once_with(
        user=mock_user, email__iexact=mock_user.email
    )


def test_resend_creates_email_address_if_missing(
    auth_service_factory: AuthServiceFactory,
) -> None:
    """Creates EmailAddress record if missing (edge case)."""
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    class DoesNotExistError(Exception):
        pass

    mock_user = setup_user_for_resend(deps, is_verified=False)
    deps.email_address_model.DoesNotExist = DoesNotExistError
    deps.email_address_model.objects.get.side_effect = DoesNotExistError()

    with mock_token_validation(service, return_user_id=1):
        status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])
    deps.email_address_model.objects.add_email.assert_called_once_with(
        request,
        mock_user,
        mock_user.email,
        confirm=True,
    )


def test_resend_user_deleted_returns_generic_success(
    auth_service_factory: AuthServiceFactory,
) -> None:
    """User deleted between token generation and resend returns 200."""
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    class UserDoesNotExistError(Exception):
        pass

    deps.user_model.DoesNotExist = UserDoesNotExistError
    deps.user_model.objects.get.side_effect = UserDoesNotExistError()

    with mock_token_validation(service, return_user_id=1):
        status, data = service.resend_verification(request, payload)

    assert status == 200
    data_dict = normalize_response_data(data)
    assert "Verification email sent" in str(data_dict["message"])


# =============================================================================
# Token Generation/Validation Unit Tests
# =============================================================================


class TestResendTokenGeneration:
    """Unit tests for _generate_resend_token and _validate_resend_token."""

    def test_generate_token_stores_in_cache(
        self, auth_service_factory: AuthServiceFactory
    ) -> None:
        """Token generation stores hash in cache with user_id."""
        service, _ = auth_service_factory()

        with patch(
            "apps.authentication.services.authentication_service.cache"
        ) as mock_cache:
            token = service._generate_resend_token(user_id=42)

        assert len(token) >= 48  # secrets.token_urlsafe(48) produces ~64 chars
        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args
        assert call_args[0][1] == 42  # user_id stored as value
        assert call_args[1]["timeout"] == 600  # 10 minutes

    def test_validate_token_returns_user_id_and_consumes(
        self, auth_service_factory: AuthServiceFactory
    ) -> None:
        """Valid token returns user_id and is consumed (deleted from cache)."""
        service, _ = auth_service_factory()

        with patch(
            "apps.authentication.services.authentication_service.cache"
        ) as mock_cache:
            mock_cache.get.return_value = 42
            result = service._validate_resend_token("valid-token")

        assert result == 42
        mock_cache.get.assert_called_once()
        mock_cache.delete.assert_called_once()

    def test_validate_invalid_token_returns_none(
        self, auth_service_factory: AuthServiceFactory
    ) -> None:
        """Invalid token returns None without deleting."""
        service, _ = auth_service_factory()

        with patch(
            "apps.authentication.services.authentication_service.cache"
        ) as mock_cache:
            mock_cache.get.return_value = None
            result = service._validate_resend_token("invalid-token")

        assert result is None
        mock_cache.delete.assert_not_called()

    def test_token_roundtrip_with_real_cache(
        self, auth_service_factory: AuthServiceFactory
    ) -> None:
        """Token can be generated and validated (integration-like test)."""
        service, _ = auth_service_factory()

        # Use a dict as a simple cache mock for roundtrip
        fake_cache: dict[str, int] = {}

        def fake_set(key: str, value: int, timeout: int) -> None:
            fake_cache[key] = value

        def fake_get(key: str) -> int | None:
            return fake_cache.get(key)

        def fake_delete(key: str) -> None:
            fake_cache.pop(key, None)

        with patch(
            "apps.authentication.services.authentication_service.cache"
        ) as mock_cache:
            mock_cache.set.side_effect = fake_set
            mock_cache.get.side_effect = fake_get
            mock_cache.delete.side_effect = fake_delete

            # Generate token
            token = service._generate_resend_token(user_id=99)

            # First validation succeeds
            result1 = service._validate_resend_token(token)
            assert result1 == 99

            # Second validation fails (single-use)
            result2 = service._validate_resend_token(token)
            assert result2 is None


@pytest.mark.parametrize(
    ("token_user_id", "expected_email_sent"),
    [
        (None, False),  # Invalid token
        (1, True),  # Valid token
    ],
    ids=["invalid_token", "valid_token"],
)
def test_resend_email_sent_only_for_valid_token(
    auth_service_factory: AuthServiceFactory,
    token_user_id: int | None,
    expected_email_sent: bool,
) -> None:
    """Parametrized test: email only sent when token is valid."""
    service, deps = auth_service_factory()
    request = Mock()
    payload = create_resend_verification_input()

    if token_user_id is not None:
        setup_user_for_resend(deps, user_id=token_user_id, is_verified=False)
        email_address = Mock()
        deps.email_address_model.objects.get.return_value = email_address

    with mock_token_validation(service, return_user_id=token_user_id):
        service.resend_verification(request, payload)

    if expected_email_sent:
        deps.email_address_model.objects.get.return_value.send_confirmation.assert_called_once()
    else:
        deps.email_address_model.objects.get.assert_not_called()
