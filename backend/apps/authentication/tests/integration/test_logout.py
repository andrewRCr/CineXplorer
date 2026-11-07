"""Sign-out revokes refresh credentials and clears their browser cookie."""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth.base_user import AbstractBaseUser
from django.db import connection, transaction
from django.test import Client
from ninja_jwt.token_blacklist.models import BlacklistedToken
from ninja_jwt.tokens import RefreshToken

from apps.core.tests.test_helpers import create_fresh_client, get_csrf_token, json_post

if TYPE_CHECKING:
    from apps.users.models import User


@pytest.mark.django_db
def test_signed_out_refresh_token_cannot_renew(verified_user: User) -> None:
    client = Client(enforce_csrf_checks=True)
    login = json_post(
        client,
        "/api/token/",
        {"login": verified_user.username, "password": "testpass123"},
        HTTP_X_CSRFTOKEN=get_csrf_token(client),
    )
    assert login.status_code == HTTPStatus.OK
    copied_token = login.cookies["refresh_token"].value
    jti = RefreshToken(copied_token).payload["jti"]
    assert not BlacklistedToken.objects.filter(token__jti=jti).exists()

    signed_out = json_post(client, "/api/logout/", {}, HTTP_X_CSRFTOKEN=get_csrf_token(client))
    assert signed_out.status_code == HTTPStatus.OK
    assert signed_out.json() == {"message": "Logged out successfully."}
    assert signed_out.cookies["refresh_token"].value == ""
    assert signed_out.cookies["refresh_token"]["max-age"] == 0
    replay_client = create_fresh_client(refresh_token=copied_token)
    renewed = json_post(
        replay_client, "/api/auth/refresh", {}, HTTP_X_CSRFTOKEN=get_csrf_token(replay_client)
    )
    assert renewed.status_code == HTTPStatus.UNAUTHORIZED
    assert "access_token" not in renewed.json()
    assert BlacklistedToken.objects.filter(token__jti=jti).exists()


@pytest.mark.django_db
def test_logout_does_not_report_success_when_revocation_cannot_persist(
    verified_user: User,
) -> None:
    client = Client(raise_request_exception=False)
    login = json_post(
        client, "/api/token/", {"login": verified_user.username, "password": "testpass123"}
    )
    assert login.status_code == HTTPStatus.OK
    copied_token = login.cookies["refresh_token"].value
    jti = RefreshToken(copied_token).payload["jti"]
    csrf_token = get_csrf_token(client)

    # The real database rejects new blacklist rows; the test transaction removes this constraint.
    table = connection.ops.quote_name(BlacklistedToken._meta.db_table)
    with connection.cursor() as cursor:
        cursor.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT reject_revocation CHECK (FALSE) NOT VALID"
        )
    with transaction.atomic():
        signed_out = json_post(client, "/api/logout/", {}, HTTP_X_CSRFTOKEN=csrf_token)

    assert signed_out.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "Logged out successfully" not in signed_out.content.decode()
    assert not BlacklistedToken.objects.filter(token__jti=jti).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("cookie_state", ["missing", "expired", "blacklisted", "malformed"])
def test_logout_clears_cookie_when_no_usable_refresh_token_remains(
    verified_user: User, cookie_state: str
) -> None:
    client = Client(enforce_csrf_checks=True)
    if cookie_state in {"expired", "blacklisted"}:
        refresh = RefreshToken.for_user(cast(AbstractBaseUser, verified_user))
        if cookie_state == "expired":
            refresh.payload["exp"] = 1
        else:
            refresh.blacklist()
        client.cookies["refresh_token"] = str(refresh)
    elif cookie_state == "malformed":
        client.cookies["refresh_token"] = "not-a-refresh-token"
    before = BlacklistedToken.objects.filter(token__user=verified_user).count()

    signed_out = json_post(client, "/api/logout/", {}, HTTP_X_CSRFTOKEN=get_csrf_token(client))

    assert signed_out.status_code == HTTPStatus.OK
    assert signed_out.json() == {"message": "Logged out successfully."}
    cookie = signed_out.cookies["refresh_token"]
    assert cookie.value == ""
    assert cookie["max-age"] == 0
    assert cookie["httponly"] is True
    assert cookie["secure"] is True
    assert cookie["samesite"] == "Lax"
    assert cookie["path"] == "/"
    assert BlacklistedToken.objects.filter(token__user=verified_user).count() == before
