"""Failed transactional emails return a retryable error without private log data."""

from __future__ import annotations

import hashlib
import logging
from typing import TYPE_CHECKING
from unittest import TestCase

import pytest
from allauth.account.models import EmailAddress
from django.conf import settings
from django.core.cache import cache
from django.test import Client, override_settings
from redis import Redis

from apps.authentication.services.authentication_service import RESEND_VERIFICATION_CACHE_PREFIX
from apps.authentication.services.service_factory import get_authentication_service
from apps.core.tests.email_transport import ERROR_RESPONSE_BODY, zeptomail_api_stand_in
from apps.core.tests.test_helpers import create_user, get_csrf_token

if TYPE_CHECKING:
    from django.core.mail import EmailMessage

pytestmark = pytest.mark.django_db
FAILURE_MESSAGE = "We couldn't send the email. Please try again in a few minutes."
PASSWORD_REQUEST = "/_allauth/browser/v1/auth/password/request"
RESEND_REQUEST = "/api/resend-verification/"
ADDRESS = "private.viewer@example.com"
FAILED_BACKEND = "apps.core.email_backend.ZeptoMailEmailBackend"


def assert_failure_log(
    records: list[logging.LogRecord], path: str, user_id: int | None = None
) -> None:
    errors = [record for record in records if record.levelno == logging.ERROR]
    assert len(errors) == 1
    assert errors[0].exc_info is None
    assert FAILURE_MESSAGE in errors[0].getMessage()
    assert path in errors[0].getMessage()
    if user_id is not None:
        assert f"user_id={user_id}" in errors[0].getMessage()
    text = "\n".join(str(vars(record)) for record in records)
    assert ADDRESS not in text
    assert "Email delivery failed (template:" not in text
    assert "placeholder-mail-key" not in text


@pytest.mark.parametrize("known_address", [True, False], ids=["account", "no-account"])
@override_settings(
    EMAIL_BACKEND=FAILED_BACKEND, ZOHO_ZEPTOMAIL_API_KEY_TOKEN="placeholder-mail-key"
)
def test_password_request_failed_send_is_retryable(known_address: bool) -> None:
    if known_address:
        create_user(email=ADDRESS)
    client = Client(enforce_csrf_checks=True, raise_request_exceptions=False)
    csrf = get_csrf_token(client)
    with (
        zeptomail_api_stand_in(status=400, body=ERROR_RESPONSE_BODY),
        TestCase().assertLogs("cinexplorer.auth", level="DEBUG") as logs,
    ):
        response = client.post(
            PASSWORD_REQUEST,
            {"email": ADDRESS},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
    assert response.status_code == 503
    assert response.json() == {"detail": FAILURE_MESSAGE}
    assert_failure_log(logs.records, PASSWORD_REQUEST)


def prepare_resend(*, with_address: bool = True) -> tuple[Client, str, str, int]:
    user = create_user(email=ADDRESS, email_verified=False)
    if with_address:
        EmailAddress.objects.create(user=user, email=ADDRESS, verified=False, primary=True)
    client = Client(enforce_csrf_checks=True)
    csrf = get_csrf_token(client)
    login = client.post(
        "/api/token/",
        {"login": user.username, "password": "testpass123"},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf,
    )
    assert login.status_code == 403
    token = login.json()["resend_token"]
    assert isinstance(token, str)
    return client, csrf, token, user.pk


@pytest.mark.parametrize(
    "with_address", [True, False], ids=["existing-address", "missing-address"]
)
def test_failed_resend_renews_lifetime_and_successful_retry_spends_token(
    with_address: bool, mailoutbox: list[EmailMessage]
) -> None:
    client, csrf, token, user_id = prepare_resend(with_address=with_address)
    cache_key = f"{RESEND_VERIFICATION_CACHE_PREFIX}{hashlib.sha256(token.encode()).hexdigest()}"
    redis_key = cache.make_key(cache_key)
    # redis-py leaves from_url's optional **kwargs untyped.
    redis_client = Redis.from_url(settings.CACHES["default"]["LOCATION"])  # pyright: ignore[reportUnknownMemberType]
    try:
        assert redis_client.expire(redis_key, 30)
        shortened_lifetime = redis_client.ttl(redis_key)
        assert isinstance(shortened_lifetime, int)
        assert 0 < shortened_lifetime <= 30
        with (
            override_settings(
                EMAIL_BACKEND=FAILED_BACKEND, ZOHO_ZEPTOMAIL_API_KEY_TOKEN="placeholder-mail-key"
            ),
            zeptomail_api_stand_in(status=400, body=ERROR_RESPONSE_BODY),
            TestCase().assertLogs("cinexplorer.auth", level="DEBUG") as logs,
        ):
            failed = client.post(
                RESEND_REQUEST,
                {"resend_token": token},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf,
            )
        assert failed.status_code == 503
        assert failed.json() == {"detail": FAILURE_MESSAGE}
        assert_failure_log(logs.records, RESEND_REQUEST, user_id)
        renewed_lifetime = redis_client.ttl(redis_key)
        assert isinstance(renewed_lifetime, int)
        assert 599 <= renewed_lifetime <= 600
        with override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            retried = client.post(
                RESEND_REQUEST,
                {"resend_token": token},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf,
            )
            assert retried.status_code == 200
            assert retried.json() == {"message": "Verification email sent successfully."}
            assert len(mailoutbox) == 1
            assert mailoutbox[0].to == [ADDRESS]
            assert cache.get(cache_key) is None
            spent = client.post(
                RESEND_REQUEST,
                {"resend_token": token},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf,
            )
        assert spent.status_code == 200
        assert spent.json() == retried.json()
        assert len(mailoutbox) == 1
    finally:
        cache.delete(cache_key)
        redis_client.close()


def test_checking_resend_token_does_not_spend_it() -> None:
    _, _, token, user_id = prepare_resend()
    service = get_authentication_service()
    cache_key = f"{RESEND_VERIFICATION_CACHE_PREFIX}{hashlib.sha256(token.encode()).hexdigest()}"
    try:
        # The token reader's contract is distinct from the send that consumes it.
        assert service._validate_resend_token(token) == user_id  # pyright: ignore[reportPrivateUsage]
        assert service._validate_resend_token(token) == user_id  # pyright: ignore[reportPrivateUsage]
    finally:
        cache.delete(cache_key)
