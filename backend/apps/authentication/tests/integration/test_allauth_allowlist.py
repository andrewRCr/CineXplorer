"""Only the browser authentication operations used by the site are reachable."""

from __future__ import annotations

from typing import TYPE_CHECKING
from urllib.parse import urlparse

import pytest
from django.contrib.auth import get_user_model

from apps.authentication.tests.fixtures import create_social_app

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser
    from django.test import Client


@pytest.mark.django_db
def test_allauth_signup_is_closed(api_client: Client) -> None:
    response = api_client.post(
        "/_allauth/browser/v1/auth/signup",
        {"username": "bypassed", "email": "bypassed@example.com", "password": "TestPass123!"},
        content_type="application/json",
    )
    assert response.status_code == 404
    assert not get_user_model().objects.filter(username="bypassed").exists()


@pytest.mark.django_db
def test_allauth_password_login_is_closed(api_client: Client, verified_user: AbstractUser) -> None:
    response = api_client.post(
        "/_allauth/browser/v1/auth/login",
        {"username": verified_user.username, "password": "testpass123"},
        content_type="application/json",
    )
    assert response.status_code == 404
    assert "_auth_user_id" not in api_client.session


@pytest.mark.django_db
@pytest.mark.parametrize(
    "path,method",
    [
        ("/_allauth/app/v1/auth/session", "get"),
        ("/_allauth/browser/v1/config", "get"),
        ("/_allauth/browser/v1/auth/session", "post"),
    ],
)
def test_unlisted_allauth_operations_are_closed(
    api_client: Client, path: str, method: str
) -> None:
    api_client.raise_request_exception = False
    response = getattr(api_client, method)(path)
    assert response.status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize("method", ["get", "delete"])
def test_browser_session_reaches_allauth(api_client: Client, method: str) -> None:
    response = getattr(api_client, method)("/_allauth/browser/v1/auth/session")
    assert response.status_code == 401
    assert response.json()["status"] == 401


@pytest.mark.django_db
def test_password_request_reaches_allauth(api_client: Client) -> None:
    response = api_client.post(
        "/_allauth/browser/v1/auth/password/request",
        {"email": "unknown@example.com"},
        content_type="application/json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == 200


@pytest.mark.django_db
def test_password_reset_reaches_allauth(api_client: Client) -> None:
    response = api_client.post(
        "/_allauth/browser/v1/auth/password/reset",
        {"key": "invalid-key", "password": "TestPass123!"},
        content_type="application/json",
    )
    assert response.status_code == 400
    assert response.json()["status"] == 400


@pytest.mark.django_db
def test_provider_redirect_reaches_google(api_client: Client) -> None:
    create_social_app("google")
    response = api_client.post(
        "/_allauth/browser/v1/auth/provider/redirect",
        {"provider": "google", "process": "login", "callback_url": "http://testserver/login"},
    )
    assert response.status_code == 302
    assert urlparse(response["Location"]).hostname == "accounts.google.com"
