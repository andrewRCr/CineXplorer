"""Social adapter hooks used by the application.

Synchronized with django-allauth 65.21.1; verified 2026-11-12.
Re-check these signatures against socialaccount/adapter.py on upgrades.
"""

from allauth.socialaccount.models import SocialLogin
from allauth.socialaccount.providers.base import Provider
from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest

class DefaultSocialAccountAdapter:
    def is_email_verified(self, provider: Provider, email: str) -> bool: ...
    def populate_user(
        self, request: HttpRequest, sociallogin: SocialLogin, data: dict[str, object]
    ) -> AbstractUser: ...
