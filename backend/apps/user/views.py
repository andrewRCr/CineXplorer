"""
Views for the user API.

Type Checking Notes:
====================
This file contains Django REST framework view definitions which interact with Django's
dynamic model system and DRF's generic views. The following type: ignore patterns are used:

- DRF generic view return types: DRF expects specific return types that may not align
  with our custom User model union types.
- Django model field access: User model fields may show as "unknown" types due to
  Django's metaclass-based field system.
- DRF mixin method calls: Multiple inheritance with mixins can create complex type
  scenarios that Pyright cannot fully resolve.

All type: ignore comments follow the pattern "# DRF [category]" to indicate they're
related to Django REST framework limitations, not code quality issues.
"""
from __future__ import annotations
# from typing import Any  # Removed per Quality Gate #6

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

import secrets
from django.contrib.auth.models import AbstractUser, AnonymousUser
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from user.serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    RegisterSerializer,
    UserSerializer
)
from core.services.email_service import email_service
from core.models import EmailVerificationToken, User


@method_decorator(csrf_exempt, name='dispatch')
class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    """ Defines a POST request view that registers a new user in the system. """

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        """ Handles user registration. """

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']

            forbidden_usernames = settings.FORBIDDEN_USERNAMES
            if username.lower() in forbidden_usernames:
                return Response({
                    'error': f'Username "{username}" is not allowed.'
                }, status=status.HTTP_409_CONFLICT)

            # Create the user
            user = serializer.save()

            # Send verification email
            email_sent = email_service.send_verification_email(user)

            if email_sent:
                return Response({
                    'message': 'Registration successful. Please check your email '
                               'to verify your account.',
                    'user_id': user.id,
                    'email': user.email,
                    'email_sent': True
                }, status=status.HTTP_201_CREATED)
            else:
                # Email failed to send - delete the user and return error
                user.delete()
                return Response({
                    'error': 'Registration failed. Unable to send verification email. '
                             'Please try again later or contact support.',
                    'email_sent': False
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

    def get_object(self) -> AbstractUser | AnonymousUser:  # type: ignore[return-value]  # DRF return type  # noqa: E501
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

    def finalize_response(self, request: Request, response: Response,
                          *args: object, **kwargs: object) -> Response:
        """ Set JWT tokens as HTTP-only cookies in the response. """
        refresh_token = response.data.get('refresh')
        if refresh_token:
            response.set_cookie(
                settings.SIMPLE_JWT['REFRESH_TOKEN_NAME'],
                refresh_token,
                **self._get_cookie_kwargs(
                    settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'])
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

        return super().finalize_response(request, response, *args,
                                         **kwargs)  # type: ignore[misc]  # DRF mixin call


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

    def post(self, request: Request, format: str | None = None) -> Response:
        """ Clear the JWT cookies on logout. """
        response = Response("Logged out successfully.")
        response.set_cookie(settings.SIMPLE_JWT['REFRESH_TOKEN_NAME'], '', expires=0)
        response.set_cookie(settings.SIMPLE_JWT['ACCESS_TOKEN_NAME'], '', expires=0)

        return response


class CsrfTokenView(APIView):
    authentication_classes = []  # No auth required

    def get(self, request: Request) -> Response:
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


@method_decorator(csrf_exempt, name='dispatch')
class EmailVerificationView(APIView):
    """Handles email verification when users click the verification link."""
    permission_classes = [permissions.AllowAny]

    def get(self, request: Request, token: str, *args: object, **kwargs: object) -> Response:
        """Verify user's email address using the token."""
        try:
            # Find the verification token
            verification_token = EmailVerificationToken.objects.get(token=token)

            # Check if token is expired
            if verification_token.is_expired:
                return Response({
                    'error': 'Verification link has expired. Please request a new one.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Mark user as verified
            user = verification_token.user
            was_already_verified = user.email_verified
            user.email_verified = True
            user.save()

            # Delete the used token
            verification_token.delete()

            # Send welcome email only if user wasn't already verified
            if not was_already_verified:
                email_service.send_welcome_email(user)

            return Response({
                'message': 'Email verified successfully! You can now log in to your account.',
                'email_verified': True
            }, status=status.HTTP_200_OK)

        except EmailVerificationToken.DoesNotExist:
            return Response({
                'error': 'Invalid verification link.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({
                'error': 'An error occurred during verification.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class ResendVerificationView(APIView):
    """Allows users to resend verification emails."""
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Resend verification email to the provided email address."""
        email = request.data.get('email')

        if not email:
            return Response({
                'error': 'Email address is required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            if user.email_verified:
                return Response({
                    'error': 'This email address is already verified.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Send new verification email
            email_sent = email_service.send_verification_email(user)

            if email_sent:
                return Response({
                    'message': 'Verification email sent successfully.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to send verification email. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response({
                'message': 'If the email address exists, a verification email has been sent.'
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({
                'error': 'An error occurred. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
