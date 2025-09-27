from __future__ import annotations

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.request import Request
from rest_framework_simplejwt.tokens import Token
from django.conf import settings
from django.contrib.auth.models import AbstractUser


class JWTCookieAuthentication(JWTAuthentication):
    """ Custom JWT Authentication class to handle cookies. """

    def authenticate(self, request: Request) -> tuple[AbstractUser, Token] | None:
        """ Override to check for JWT in cookies. """

        raw_access_token = request.COOKIES.get(
            settings.SIMPLE_JWT['ACCESS_TOKEN_NAME']) or None
        if raw_access_token:
            validated_token = self.get_validated_token(raw_access_token)
            return self.get_user(validated_token), validated_token
        return None
