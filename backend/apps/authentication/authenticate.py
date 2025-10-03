from __future__ import annotations

from typing import TypeVar

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token

# TypeVar for custom user model compatibility
UserT = TypeVar("UserT", bound=AbstractBaseUser)


class JWTCookieAuthentication(JWTAuthentication):
    """ Custom JWT Authentication class to handle cookies. """

    def authenticate(self, request: Request) -> tuple[AbstractBaseUser, Token] | None:
        """ Override to check for JWT in cookies. """

        # Defensively obtain token name with fallback
        simple_jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
        access_token_name = simple_jwt_settings.get('ACCESS_TOKEN_NAME', 'access_token')

        raw_access_token = request.COOKIES.get(access_token_name) or None
        if raw_access_token:
            validated_token = self.get_validated_token(raw_access_token)
            return self.get_user(validated_token), validated_token
        return None
