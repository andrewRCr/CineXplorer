"""Refresh-cookie persistence follows the password sign-in choice."""

from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING, cast

import pytest
from django.test import Client
from ninja_jwt.token_blacklist.models import BlacklistedToken
from ninja_jwt.tokens import RefreshToken

from apps.authentication.tests.fixtures import TEST_USER_PASSWORD
from apps.authentication.utils import get_jwt_settings
from apps.core.tests.test_helpers import get_csrf_token, json_post

if TYPE_CHECKING:
    from django.contrib.auth.base_user import AbstractBaseUser
    from django.http import HttpResponse

    from apps.users.models import User


def assert_refresh_cookie(response: HttpResponse, *, persistent: bool) -> RefreshToken:
    cookie = response.cookies["refresh_token"]
    lifetime = get_jwt_settings().refresh_lifetime
    assert cookie["max-age"] == (int(lifetime.total_seconds()) if persistent else "")
    assert bool(cookie["expires"]) is persistent
    assert cookie["httponly"] is True
    assert cookie["secure"] is True
    assert cookie["samesite"] == "Lax"
    token = RefreshToken(cookie.value)
    issued_at, expires_at = token.payload["iat"], token.payload["exp"]
    assert isinstance(issued_at, int)
    assert isinstance(expires_at, int)
    assert expires_at - issued_at == int(timedelta(days=14).total_seconds())
    assert token.payload["remember_me"] is persistent
    return token


@pytest.mark.django_db
@pytest.mark.parametrize("remember_me", [False, True, None])
def test_sign_in_sets_refresh_cookie_persistence(
    verified_user: User, remember_me: bool | None
) -> None:
    client = Client(enforce_csrf_checks=True)
    csrf = get_csrf_token(client)
    payload: dict[str, object] = {
        "login": verified_user.username,
        "password": TEST_USER_PASSWORD,
    }
    if remember_me is not None:
        payload["remember_me"] = remember_me
    response = json_post(client, "/api/token/", payload, HTTP_X_CSRFTOKEN=csrf)
    assert response.status_code == 200
    assert_refresh_cookie(response, persistent=remember_me is True)


@pytest.mark.django_db
@pytest.mark.parametrize("remember_me", [False, True, None])
def test_rotations_preserve_persistence_and_revoke_previous_tokens(
    verified_user: User, remember_me: bool | None
) -> None:
    # The project user inherits Django's base user at runtime.
    original = RefreshToken.for_user(cast("AbstractBaseUser", verified_user))
    if remember_me is not None:
        original.payload["remember_me"] = remember_me
    first_value = str(original)
    client = Client(enforce_csrf_checks=True)
    csrf = get_csrf_token(client)
    client.cookies["refresh_token"] = first_value
    previous = original

    for _ in range(2):
        previous_value = client.cookies["refresh_token"].value
        response = json_post(client, "/api/auth/refresh", {}, HTTP_X_CSRFTOKEN=csrf)
        assert response.status_code == 200
        current = assert_refresh_cookie(response, persistent=remember_me is not False)
        assert response.cookies["refresh_token"].value != previous_value
        assert BlacklistedToken.objects.filter(token__jti=previous.payload["jti"]).exists()
        previous = current

    replay = Client(enforce_csrf_checks=True)
    csrf = get_csrf_token(replay)
    replay.cookies["refresh_token"] = first_value
    assert json_post(replay, "/api/auth/refresh", {}, HTTP_X_CSRFTOKEN=csrf).status_code == 401
