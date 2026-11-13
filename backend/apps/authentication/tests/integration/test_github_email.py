"""GitHub callbacks retain only the provider's primary verified email."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypedDict
from unittest.mock import Mock
from urllib.parse import parse_qs, urlparse

import pytest
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from requests import Response, Session

from apps.authentication.tests.fixtures import create_social_app
from apps.core.tests.test_helpers import create_user
from apps.users.models import User

if TYPE_CHECKING:
    from django.http import HttpResponse
    from django.test import Client


class GitHubEmail(TypedDict):
    email: str
    primary: bool
    verified: bool


def provider_callback(
    client: Client,
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    responses: dict[tuple[str, str], object],
    *,
    process: str = "login",
    assume_verified: bool = False,
) -> HttpResponse:
    """Run the real redirect and callback, replacing only provider HTTP responses."""
    app = create_social_app(provider)
    if assume_verified:
        app.settings = {"verified_email": True}
        app.save()
    redirect = client.post(
        "/_allauth/browser/v1/auth/provider/redirect",
        {"provider": provider, "process": process, "callback_url": "http://testserver/login"},
    )
    assert redirect.status_code == 302
    state = parse_qs(urlparse(redirect["Location"]).query)["state"][0]

    def provider_request(_session: Session, method: str, url: str, **_kwargs: object) -> Response:
        key = (method.upper(), url)
        assert key in responses, f"Unexpected provider request: {method} {url}"
        response = Mock(spec=Response)
        response.status_code = 200
        response.headers = {"content-type": "application/json"}
        response.json.return_value = responses[key]
        return response

    monkeypatch.setattr(Session, "request", provider_request)
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
    response = provider_callback(
        api_client,
        monkeypatch,
        "google",
        {
            ("POST", "https://oauth2.googleapis.com/token"): {
                "access_token": "provider-test-token",
                "token_type": "Bearer",
            },
            ("GET", "https://www.googleapis.com/oauth2/v2/userinfo"): {
                "id": "google-person",
                "email": "google@example.com",
                "verified_email": False,
                "name": "Google Person",
            },
        },
        assume_verified=True,
    )
    assert response.status_code == 302
    account = SocialAccount.objects.get(provider="google", uid="google-person")
    assert list(
        EmailAddress.objects.filter(user=account.user).values_list("email", "primary", "verified")
    ) == [("google@example.com", True, True)]
    assert api_client.get("/_allauth/browser/v1/auth/session").status_code == 200
