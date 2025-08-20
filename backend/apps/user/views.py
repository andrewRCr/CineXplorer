from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
"""
Views for the user API.
"""

import secrets
from django.contrib.auth.models import AbstractUser, AnonymousUser
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from user.serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    RegisterSerializer,
    UserSerializer
)


@method_decorator(csrf_exempt, name='dispatch')
class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    """ Defines a POST request view that registers a new user in the system. """

    def post(self, request, *args, **kwargs):
        """ Handles user registration. """

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']

            forbidden_usernames = settings.FORBIDDEN_USERNAMES
            if username.lower() in forbidden_usernames:
                return Response({
                    'error': f'Username "{username}" is not allowed.'
                }, status=status.HTTP_409_CONFLICT)

            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        errors = serializer.errors
        if 'username' in errors and "non_field_errors" not in errors:
            return Response({
                'error': errors['username'][0]
            }, status=status.HTTP_409_CONFLICT)
        if 'email' in errors and "non_field_errors" not in errors:
            return Response({
                'error': errors['email'][0]
            }, status=status.HTTP_409_CONFLICT)

        return Response(errors, status=status.HTTP_400_BAD_REQUEST)


class CreateUserView(generics.CreateAPIView):
    """ Defines a POST request view that creates a new user in the system. """

    serializer_class = UserSerializer


class ManageUserView(generics.RetrieveUpdateAPIView):
    """ Defines a GET/PUT/PATCH request view that updates an authenticated user's basic info. """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> AbstractUser | AnonymousUser:  # type: ignore
        """ Retrieves and returns the currently authenticated user. """

        return self.request.user


class JwtSetCookieMixin:
    """ Mixin to set JWT tokens as HTTP-only cookies. """

    def _get_cookie_kwargs(self, max_age: int) -> dict:
        """Return default cookie arguments."""
        return {
            "max_age": max_age,
            "httponly": True,
            "secure": True,  # set to True in production
            "samesite": settings.SIMPLE_JWT['JWT_COOKIE_SAMESITE'],
        }

    def finalize_response(self, request, response, *args, **kwargs):
        """ Set JWT tokens as HTTP-only cookies in the response. """
        refresh_token = response.data.get('refresh')
        if refresh_token:
            response.set_cookie(
                settings.SIMPLE_JWT['REFRESH_TOKEN_NAME'],
                refresh_token,
                **self._get_cookie_kwargs(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'])
            )
            del response.data['refresh']  # prevent from being sent in the response body
        access_token = response.data.get('access')
        if access_token:
            response.set_cookie(
                settings.SIMPLE_JWT['ACCESS_TOKEN_NAME'],
                access_token,
                **self._get_cookie_kwargs(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'])
            )
            del response.data['access']  # prevent from being sent in the response body

        return super().finalize_response(request, response, *args, **kwargs)  # type: ignore


@method_decorator(csrf_exempt, name='dispatch')
class JWTCookieTokenObtainPairView(JwtSetCookieMixin, TokenObtainPairView):
    """ Extends TokenObtainPairView to save response to http-only cookie. """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class JWTCookieTokenRefreshView(JwtSetCookieMixin, TokenRefreshView):
    """ Extends TokenRefreshView to save response to http-only cookie. """
    serializer_class = CustomTokenRefreshSerializer


class LogOutAPIView(APIView):
    """ Defines a POST request view that logs out the user by clearing the JWT cookies. """

    def post(self, request, format=None):
        """ Clear the JWT cookies on logout. """
        response = Response("Logged out successfully.")
        response.set_cookie(settings.SIMPLE_JWT['REFRESH_TOKEN_NAME'], '', expires=0)
        response.set_cookie(settings.SIMPLE_JWT['ACCESS_TOKEN_NAME'], '', expires=0)

        return response


class CsrfTokenView(APIView):
    authentication_classes = []  # No auth required

    def get(self, request):
        token = secrets.token_urlsafe(32)
        response = Response({"csrfToken": token})
        response.set_cookie(
            "XSRF-TOKEN",
            token,
            httponly=False,  # Must be readable by JS
            secure=True,     # Only over HTTPS
            samesite="Lax",  # Less strict for localhost dev
            domain=None,     # Important for localhost
            path="/",       # Ensure cookie is available everywhere
            # Partitioned=True,  # For future Chrome support (not yet in Django)
        )
        return response
