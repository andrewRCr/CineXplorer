from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings


class JWTCookieAuthentication(JWTAuthentication):
    """ Custom JWT Authentication class to handle cookies. """

    def authenticate(self, request):
        """ Override to check for JWT in cookies. """

        raw_access_token = request.COOKIES.get(
            settings.SIMPLE_JWT['ACCESS_TOKEN_NAME']) or None
        if raw_access_token:
            validated_token = self.get_validated_token(raw_access_token)
            return self.get_user(validated_token), validated_token
        return None
