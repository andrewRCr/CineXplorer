"""Email handling on GitHub and Google sign-in callbacks."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, TypedDict
from unittest import TestCase
from unittest.mock import Mock
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialAccount
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from django.conf import settings
from django.contrib.sites.models import Site
from django.test import Client, override_settings
from requests import Response, Session

from apps.authentication.tests.fixtures import create_social_app
from apps.core.tests.email_transport import (
    ACCEPTED_RESPONSE_BODY,
    ERROR_RESPONSE_BODY,
    zeptomail_api_stand_in,
)
from apps.core.tests.test_helpers import create_user, get_csrf_token
from apps.users.models import User

if TYPE_CHECKING:
    from django.core.mail import EmailMessage
    from django.http import HttpResponse


class GitHubEmail(TypedDict):
    email: str
    primary: bool
    verified: bool


def stub_provider_http(
    monkeypatch: pytest.MonkeyPatch, responses: dict[tuple[str, str], object]
) -> None:
    def provider_request(method: str, url: str, **_kwargs: object) -> Response:
        key = (method.upper(), url)
        assert key in responses, f"Unexpected provider request: {method} {url}"
        response = Mock(spec=Response)
        response.status_code = 200
        response.headers = {"content-type": "application/json"}
        response.json.return_value = responses[key]
        return response

    def provider_session(_adapter: DefaultSocialAccountAdapter) -> Session:
        session = Session()
        monkeypatch.setattr(session, "request", provider_request)
        return session

    monkeypatch.setattr(DefaultSocialAccountAdapter, "get_requests_session", provider_session)


def provider_callback(
    client: Client,
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    responses: dict[tuple[str, str], object],
    *,
    process: str = "login",
    assume_verified: bool = False,
    callback_url: str | None = None,
) -> HttpResponse:
    """Run the real redirect and callback, replacing only provider HTTP responses."""
    app = create_social_app(provider)
    if assume_verified:
        app.settings = {"verified_email": True}
        app.save()
    redirect = client.post(
        "/_allauth/browser/v1/auth/provider/redirect",
        {
            "provider": provider,
            "process": process,
            "callback_url": callback_url or f"{settings.FRONTEND_URL}/login",
        },
    )
    assert redirect.status_code == 302
    state = parse_qs(urlparse(redirect["Location"]).query)["state"][0]

    stub_provider_http(monkeypatch, responses)
    return client.get(
        f"/accounts/{provider}/login/callback/", {"code": "provider-test-code", "state": state}
    )


def github_callback(
    client: Client,
    monkeypatch: pytest.MonkeyPatch,
    emails: list[GitHubEmail],
    *,
    profile_email: str | None = "secondary@example.com",
    process: str = "login",
    assume_verified: bool = False,
) -> HttpResponse:
    responses: dict[tuple[str, str], object] = {
        ("POST", "https://github.com/login/oauth/access_token"): {
            "access_token": "provider-test-token",
            "token_type": "bearer",
            "scope": "user:email",
        },
        ("GET", "https://api.github.com/user"): {
            "id": 123456,
            "login": "github-person",
            "email": profile_email,
            "name": "GitHub Person",
        },
        ("GET", "https://api.github.com/user/emails"): emails,
    }
    return provider_callback(
        client, monkeypatch, "github", responses, process=process, assume_verified=assume_verified
    )


@pytest.mark.django_db
@pytest.mark.parametrize("secondary_owner_exists", [False, True])
def test_github_signup_keeps_only_primary_verified_email(
    api_client: Client, monkeypatch: pytest.MonkeyPatch, secondary_owner_exists: bool
) -> None:
    if secondary_owner_exists:
        create_user(username="secondary-owner", email="secondary@example.com")
    response = github_callback(
        api_client,
        monkeypatch,
        [
            {"email": "secondary@example.com", "primary": False, "verified": True},
            {"email": "unverified@example.com", "primary": False, "verified": False},
            {"email": "primary@example.com", "primary": True, "verified": True},
        ],
    )
    assert response.status_code == 302
    account = SocialAccount.objects.get(provider="github", uid="123456")
    user = User.objects.get(pk=account.user.pk)
    assert user.email == "primary@example.com"
    assert list(
        EmailAddress.objects.filter(user=user).values_list("email", "primary", "verified")
    ) == [("primary@example.com", True, True)]
    profile = account.extra_data
    assert isinstance(profile, dict)
    assert profile["email"] == "primary@example.com"
    session = api_client.get("/_allauth/browser/v1/auth/session")
    assert session.status_code == 200
    assert session.json()["data"]["user"]["id"] == user.pk
    assert "messages" not in response.cookies


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("emails", "assume_verified"),
    [
        ([], False),
        (
            [
                {"email": "primary@example.com", "primary": True, "verified": False},
                {"email": "secondary@example.com", "primary": False, "verified": True},
            ],
            False,
        ),
        (
            [
                {"email": "primary@example.com", "primary": True, "verified": False},
                {"email": "secondary@example.com", "primary": False, "verified": True},
            ],
            True,
        ),
    ],
)
def test_github_without_verified_primary_cannot_use_another_email(
    api_client: Client,
    monkeypatch: pytest.MonkeyPatch,
    emails: list[GitHubEmail],
    assume_verified: bool,
) -> None:
    create_user(username="secondary-owner", email="secondary@example.com")
    before = list(EmailAddress.objects.values_list("pk", "email", "primary", "verified"))
    github_callback(api_client, monkeypatch, emails, assume_verified=assume_verified)
    assert not SocialAccount.objects.filter(provider="github", uid="123456").exists()
    assert User.objects.count() == 1
    assert list(EmailAddress.objects.values_list("pk", "email", "primary", "verified")) == before
    assert api_client.get("/_allauth/browser/v1/auth/session").status_code == 401


@pytest.mark.django_db
def test_github_connect_keeps_existing_emails_and_normalizes_profile_email(
    api_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = create_user(username="existing-person", email="existing@example.com")
    EmailAddress.objects.create(
        user=user, email="existing-secondary@example.com", primary=False, verified=True
    )
    before = list(EmailAddress.objects.values_list("pk", "email", "primary", "verified"))
    assert api_client.login(username=user.username, password="testpass123")
    response = github_callback(
        api_client,
        monkeypatch,
        [
            {"email": "primary@example.com", "primary": True, "verified": True},
            {"email": "secondary@example.com", "primary": False, "verified": True},
        ],
        process="connect",
    )
    assert response.status_code == 302
    account = SocialAccount.objects.get(provider="github", uid="123456")
    assert account.user.pk == user.pk
    profile = account.extra_data
    assert isinstance(profile, dict)
    assert profile["email"] == "primary@example.com"
    user.refresh_from_db()
    assert user.email == "existing@example.com"
    assert list(EmailAddress.objects.values_list("pk", "email", "primary", "verified")) == before


@pytest.mark.django_db
def test_google_keeps_configured_email_verification(
    api_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = google_callback(api_client, monkeypatch, "google@example.com", assume_verified=True)
    assert response.status_code == 302
    account = SocialAccount.objects.get(provider="google", uid="google-person")
    assert list(
        EmailAddress.objects.filter(user=account.user).values_list("email", "primary", "verified")
    ) == [("google@example.com", True, True)]
    assert api_client.get("/_allauth/browser/v1/auth/session").status_code == 200
    assert "messages" not in response.cookies


def google_callback(
    client: Client,
    monkeypatch: pytest.MonkeyPatch,
    email: str,
    *,
    assume_verified: bool = False,
    callback_url: str | None = None,
) -> HttpResponse:
    return provider_callback(
        client,
        monkeypatch,
        "google",
        {
            ("POST", "https://oauth2.googleapis.com/token"): {
                "access_token": "provider-test-token",
                "token_type": "Bearer",
            },
            ("GET", "https://www.googleapis.com/oauth2/v2/userinfo"): {
                "id": "google-person",
                "email": email,
                "verified_email": False,
                "name": "Google Person",
            },
        },
        assume_verified=assume_verified,
        callback_url=callback_url,
    )


@pytest.mark.django_db
@pytest.mark.parametrize("is_active", [True, False], ids=["active", "inactive"])
def test_unverified_google_email_for_existing_account_sends_recovery_link(
    api_client: Client,
    monkeypatch: pytest.MonkeyPatch,
    mailoutbox: list[EmailMessage],
    is_active: bool,
) -> None:
    user = create_user(email="existing@example.com")
    user.is_active = is_active
    user.save(update_fields=["is_active"])
    callback_url = f"{settings.FRONTEND_URL}/login?next=%2Fwatchlist"
    response = google_callback(api_client, monkeypatch, user.email, callback_url=callback_url)

    assert response.status_code == 302
    assert response["Location"] == callback_url
    assert len(mailoutbox) == 1
    message = mailoutbox[0]
    assert message.to == [user.email]
    assert "Account Already Exists" in message.subject
    assert f"Hello from {Site.objects.get_current().name}!" in message.body
    assert user.email in message.body
    assert "If your account is active" in message.body
    assert f"{settings.FRONTEND_URL}/forgot-password" in message.body.split()
    assert "If you can't recover access, contact cinexplorer@andrewcreekmore.dev." in message.body
    assert not SocialAccount.objects.filter(provider="google").exists()
    assert list(User.objects.values_list("pk", flat=True)) == [user.pk]
    user.refresh_from_db()
    assert user.is_active == is_active
    assert api_client.get("/_allauth/browser/v1/auth/session").status_code == 401


@pytest.mark.django_db
@override_settings(
    ACCOUNT_RATE_LIMITS={},
    EMAIL_BACKEND="apps.core.email_backend.ZeptoMailEmailBackend",
    ZOHO_ZEPTOMAIL_API_KEY_TOKEN="placeholder-mail-key",
)
def test_unverified_google_email_failed_delivery_preserves_return_destination(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = create_user()
    client = Client(raise_request_exceptions=False)
    callback_url = f"{settings.FRONTEND_URL}/login?next=%2Fwatchlist"
    with (
        zeptomail_api_stand_in(status=400, body=ERROR_RESPONSE_BODY) as transport,
        TestCase().assertLogs("cinexplorer.auth", level="ERROR") as logs,
    ):
        failed = google_callback(client, monkeypatch, user.email, callback_url=callback_url)
        retried = google_callback(client, monkeypatch, user.email, callback_url=callback_url)

    assert failed.status_code == 302
    location = urlparse(failed["Location"])
    assert location._replace(query="").geturl() == f"{settings.FRONTEND_URL}/login"
    assert parse_qs(location.query) == {
        "next": ["/watchlist"],
        "error": ["unknown"],
        "error_process": ["login"],
    }
    assert retried.status_code == 302
    assert retried["Location"] == callback_url
    # The failed send consumed the allowance, so the immediate retry skips mail.
    assert len(transport.requests) == 1
    assert not SocialAccount.objects.filter(provider="google").exists()
    assert client.get("/_allauth/browser/v1/auth/session").status_code == 401

    (record,) = logs.records
    assert record.getMessage() == (
        "We couldn't send the email. Please try again in a few minutes."
        " | endpoint=/accounts/google/login/callback/"
    )
    assert record.exc_info is None
    assert record.stack_info is None
    assert user.email not in str(vars(record))


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("mail_status", "mail_body", "retry"),
    [
        pytest.param(201, ACCEPTED_RESPONSE_BODY, False, id="accepted"),
        pytest.param(201, ACCEPTED_RESPONSE_BODY, True, id="cooldown"),
        pytest.param(400, ERROR_RESPONSE_BODY, False, id="refused"),
    ],
)
@override_settings(
    ACCOUNT_RATE_LIMITS={},
    EMAIL_BACKEND="apps.core.email_backend.ZeptoMailEmailBackend",
    ZOHO_ZEPTOMAIL_API_KEY_TOKEN="placeholder-mail-key",
)
def test_google_token_sign_in_redirects_when_email_verification_is_required(
    monkeypatch: pytest.MonkeyPatch,
    mail_status: int,
    mail_body: str,
    retry: bool,
) -> None:
    user = create_user()
    app = create_social_app("google")
    now = datetime.now(UTC)
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Google test certificate")])
    certificate = (
        x509.CertificateBuilder()
        .issuer_name(issuer)
        .subject_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(minutes=5))
        .sign(private_key, hashes.SHA256())
    )
    # Use the real signature validation against the test provider's certificate.
    stub_provider_http(
        monkeypatch,
        {
            ("GET", "https://www.googleapis.com/oauth2/v1/certs"): {
                "test-key": certificate.public_bytes(serialization.Encoding.PEM).decode()
            }
        },
    )
    credential = jwt.encode(
        {
            "iss": "https://accounts.google.com",
            "aud": app.client_id,
            "exp": now + timedelta(minutes=5),
            "sub": "google-person",
            "email": user.email,
            "email_verified": False,
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )
    client = Client(enforce_csrf_checks=True, raise_request_exceptions=False)
    csrf_token = get_csrf_token(client)
    client.cookies["g_csrf_token"] = "test-google-csrf"
    payload = {"credential": credential, "g_csrf_token": "test-google-csrf"}
    with zeptomail_api_stand_in(status=mail_status, body=mail_body) as transport:
        if retry:
            client.post("/accounts/google/login/token/", payload, HTTP_X_CSRFTOKEN=csrf_token)
        response = client.post(
            "/accounts/google/login/token/",
            payload,
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    assert len(transport.requests) == 1
    assert response.status_code == 302
    location = urlparse(response["Location"])
    assert location._replace(query="").geturl() == f"{settings.FRONTEND_URL}/login"
    expected_error = (
        {"error": ["unknown"], "error_process": ["login"]}
        if mail_status == 400
        else {"error": ["oauth"]}
    )
    assert parse_qs(location.query) == expected_error
    assert not SocialAccount.objects.filter(provider="google").exists()
    assert client.get("/_allauth/browser/v1/auth/session").status_code == 401
