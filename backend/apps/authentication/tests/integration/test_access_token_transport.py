"""Access tokens use Bearer headers; refresh credentials stay in cookies."""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client
from ninja_jwt.token_blacklist.models import BlacklistedToken
from ninja_jwt.tokens import RefreshToken

from apps.core.tests.test_helpers import get_csrf_token, json_post

if TYPE_CHECKING:
    from apps.users.models import User


@pytest.mark.django_db
def test_access_cookie_does_not_authenticate_but_bearer_header_does(verified_user: User) -> None:
    access = str(RefreshToken.for_user(cast(AbstractBaseUser, verified_user)).access_token)
    client = Client()
    client.cookies["access_token"] = access

    rejected = client.get("/api/profile/")
    assert rejected.status_code == HTTPStatus.UNAUTHORIZED

    authorized = client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {access}")
    assert authorized.status_code == HTTPStatus.OK
    assert authorized.json()["id"] == verified_user.id


@pytest.mark.django_db
def test_legacy_refresh_route_does_not_issue_or_rotate_credentials(verified_user: User) -> None:
    refresh = RefreshToken.for_user(cast(AbstractBaseUser, verified_user))
    jti = refresh.payload["jti"]
    client = Client(enforce_csrf_checks=True)
    client.cookies["refresh_token"] = str(refresh)

    response = json_post(
        client, "/api/token/refresh/", {}, HTTP_X_CSRFTOKEN=get_csrf_token(client)
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "access_token" not in response.cookies
    assert "refresh_token" not in response.cookies
    assert not BlacklistedToken.objects.filter(token__jti=jti).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("authorization", ["", "Basic unsupported", "Bearer invalid-token"])
def test_provider_session_remains_authenticated_without_a_valid_bearer_token(
    verified_user: User, authorization: str
) -> None:
    client = Client()
    client.force_login(cast(AbstractBaseUser, verified_user))

    response = client.get("/api/profile/", HTTP_AUTHORIZATION=authorization)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["id"] == verified_user.id
