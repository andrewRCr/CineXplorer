"""Django CSRF checks protect public, JWT and session-only unsafe requests."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

import pytest
from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from django.contrib.auth import get_user_model
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client, override_settings

from apps.core.models import Movie
from apps.core.tests.test_helpers import create_user, get_csrf_token
from apps.user_movie_data.models import UserMovieData

if TYPE_CHECKING:
    from pathlib import Path

    from django.core.mail import EmailMessage

pytestmark = pytest.mark.django_db
CSRF_ERROR = {"detail": "CSRF token missing or invalid."}
CASES = [
    "login",
    "registration",
    "logout",
    "verification",
    "resend",
    "hybrid_refresh",
    "password_request",
    "session_patch",
    "session_delete",
]


@pytest.fixture
def entry() -> UserMovieData:
    user = create_user(username="csrfviewer")
    movie = Movie.objects.create(tmdb_id=12345, title="Blade Runner")
    return UserMovieData.objects.create(user=user, movie=movie, user_rating=5)


def request_data(case: str, entry: UserMovieData) -> tuple[str, str, dict[str, object]]:
    if case == "verification":
        user = create_user(
            username="unverified", email="unverified@example.com", email_verified=False
        )
        address = EmailAddress.objects.create(
            user=user, email=user.email, verified=False, primary=True
        )
        return "post", "/api/verify-email/", {"key": EmailConfirmationHMAC(address).key}
    cases: dict[str, tuple[str, str, dict[str, object]]] = {
        "login": (
            "post",
            "/api/token/",
            {"login": entry.user.username, "password": "testpass123"},
        ),
        "registration": (
            "post",
            "/api/register/",
            {"username": "newcsrf", "email": "newcsrf@example.com", "password": "TestPass123!"},
        ),
        "logout": ("post", "/api/logout/", {}),
        "resend": ("post", "/api/resend-verification/", {"resend_token": "x" * 32}),
        "hybrid_refresh": ("post", "/api/auth/refresh", {}),
        "password_request": (
            "post",
            "/_allauth/browser/v1/auth/password/request",
            {"email": entry.user.email},
        ),
        "session_patch": (
            "patch",
            f"/api/user-movie-data/{entry.movie.tmdb_id}",
            {"user_rating": 8},
        ),
        "session_delete": ("delete", f"/api/user-movie-data/{entry.movie.tmdb_id}", {}),
    }
    return cases[case]


@pytest.mark.parametrize("case", CASES)
@pytest.mark.parametrize("token_mode", ["missing", "mismatch", "matching"])
def test_unsafe_requests_require_matching_csrf(
    case: str, token_mode: str, entry: UserMovieData, mailoutbox: list[EmailMessage]
) -> None:
    client = Client(enforce_csrf_checks=True)
    method, path, payload = request_data(case, entry)
    if case.startswith("session_"):
        # The Django test-client stub does not recognize the project model inheritance.
        client.force_login(cast(AbstractBaseUser, entry.user))
        assert "access_token" not in client.cookies
    if case == "logout":
        client.cookies["refresh_token"] = "existing-refresh-cookie"
    users_before = get_user_model().objects.count()
    verified_before = list(EmailAddress.objects.order_by("pk").values_list("pk", "verified"))
    messages_before = len(mailoutbox)
    headers: dict[str, str] = {}
    if token_mode != "missing":
        token = get_csrf_token(client)
        headers["HTTP_X_CSRFTOKEN"] = token if token_mode == "matching" else "a" * 32
    response = getattr(client, method)(path, payload, content_type="application/json", **headers)
    if token_mode == "matching":
        assert response.status_code < 500
        if response.status_code != 204:
            assert response.json() != CSRF_ERROR
        if case == "session_patch":
            entry.refresh_from_db()
            assert entry.user_rating == 8
        if case == "session_delete":
            assert not UserMovieData.objects.filter(pk=entry.pk).exists()
        return
    assert response.status_code == 403
    assert response.json() == CSRF_ERROR
    assert get_user_model().objects.count() == users_before
    assert (
        list(EmailAddress.objects.order_by("pk").values_list("pk", "verified")) == verified_before
    )
    assert len(mailoutbox) == messages_before
    entry.refresh_from_db()
    assert entry.user_rating == 5
    if case == "logout":
        assert client.cookies["refresh_token"].value == "existing-refresh-cookie"
    if case == "login":
        assert "refresh_token" not in response.cookies


def test_cross_site_origin_is_rejected_even_with_matching_token(entry: UserMovieData) -> None:
    client = Client(enforce_csrf_checks=True)
    token = get_csrf_token(client)
    response = client.post(
        "/api/token/",
        {"login": entry.user.username, "password": "testpass123"},
        content_type="application/json",
        secure=True,
        HTTP_X_CSRFTOKEN=token,
        HTTP_ORIGIN="https://another-site.example",
    )
    assert response.status_code == 403
    assert response.json() == CSRF_ERROR
    assert "refresh_token" not in response.cookies


def test_log_reporting_accepts_post_without_csrf() -> None:
    client = Client(enforce_csrf_checks=True)
    response = client.post(
        "/api/logs/",
        {"level": "INFO", "message": "CSRF test", "timestamp": "2026-11-04T12:00:00Z"},
        content_type="application/json",
    )
    assert response.status_code == 201


@override_settings(ENVIRONMENT="development")
def test_development_log_reporting_accepts_post_without_csrf(tmp_path: Path) -> None:
    client = Client(enforce_csrf_checks=True)
    with override_settings(BASE_DIR=tmp_path):
        response = client.post(
            "/api/dev-logs/write/", {"log_line": "CSRF test"}, content_type="application/json"
        )
    assert response.status_code == 200


def test_unauthenticated_patch_with_csrf_reaches_authentication(entry: UserMovieData) -> None:
    client = Client(enforce_csrf_checks=True)
    token = get_csrf_token(client)
    response = client.patch(
        f"/api/user-movie-data/{entry.movie.tmdb_id}",
        {"user_rating": 8},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 401
    entry.refresh_from_db()
    assert entry.user_rating == 5


def test_safe_authenticated_request_needs_no_csrf(entry: UserMovieData) -> None:
    client = Client(enforce_csrf_checks=True)
    client.force_login(cast(AbstractBaseUser, entry.user))
    assert client.get("/api/profile/").status_code == 200


def test_csrf_endpoint_sets_a_usable_token(entry: UserMovieData) -> None:
    client = Client(enforce_csrf_checks=True)
    client.force_login(cast(AbstractBaseUser, entry.user))
    response = client.get("/api/csrf/")
    assert response.status_code == 200
    token = response.json()["csrf_token"]
    assert "csrftoken" in response.cookies
    for rating in (6, 7):
        response = client.patch(
            f"/api/user-movie-data/{entry.movie.tmdb_id}",
            {"user_rating": rating},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == 200
        entry.refresh_from_db()
        assert entry.user_rating == rating
