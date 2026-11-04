"""Authentication service for registration, login, tokens, and profile management."""

from __future__ import annotations

import hashlib
import logging
import secrets
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Protocol, cast

from allauth.account.internal.flows.email_verification import (
    send_verification_email_to_address,
)
from allauth.account.models import (
    EmailAddress,
    EmailConfirmation,
    EmailConfirmationHMAC,
)
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, HttpResponse
from ninja_jwt.exceptions import TokenError
from ninja_jwt.tokens import RefreshToken

from apps.authentication.adapters import EMAIL_DELIVERY_FAILURE_MESSAGE, EmailDeliveryError
from apps.authentication.schemas import (
    EmailVerificationInputSchema,
    EmailVerificationResponseSchema,
    HybridTokenRefreshResponseSchema,
    RegisterInputSchema,
    RegisterResponseSchema,
    ResendVerificationInputSchema,
    ResendVerificationResponseSchema,
    TokenObtainInputSchema,
    TokenResponseSchema,
    UserProfileSchema,
)
from apps.authentication.utils import (
    JWTSettings,
    blacklist_token,
    check_token_blacklist,
    extract_user_id_from_token,
    get_jwt_settings,
    set_auth_cookie,
)
from apps.core.exceptions import UpstreamError
from apps.core.services.email_service import UserEmailProtocol, send_welcome_email
from apps.core.utils import build_error_response, get_client_info


class UserProtocol(Protocol):
    """User shape used by authentication service."""

    id: int
    username: str
    email: str
    first_name: str
    last_name: str

    def set_password(self, raw_password: str | None) -> None:
        """Hash and set password."""
        ...

    def save(self, *args: object, **kwargs: object) -> None:
        """Persist changes."""
        ...

    def delete(
        self,
        using: object = ...,
        keep_parents: bool = ...,
    ) -> tuple[int, dict[str, int]]:
        """Delete user."""
        ...


class UserQuerySetProtocol(Protocol):
    """Minimal queryset interface for auth checks."""

    def exists(self) -> bool:
        """Return whether the queryset has results."""
        ...


class UserManagerProtocol(Protocol):
    """Manager interface for the user model."""

    def create_user(self, **kwargs: str) -> UserProtocol:
        """Create a user."""
        ...

    def get(self, **kwargs: object) -> UserProtocol:
        """Fetch a single user."""
        ...

    def filter(self, **kwargs: object) -> UserQuerySetProtocol:
        """Filter users."""
        ...


class UserModelProtocol(Protocol):
    """User model interface with manager."""

    objects: UserManagerProtocol
    DoesNotExist: type[Exception]


class EmailConfirmationHMACProtocol(Protocol):
    """Protocol for EmailConfirmationHMAC dependency injection."""

    @classmethod
    def from_key(cls, key: str) -> EmailConfirmation | None:
        """Return confirmation for key or None."""


# Resend token configuration
RESEND_TOKEN_EXPIRY_SECONDS = 600  # 10 minutes
RESEND_TOKEN_CACHE_PREFIX = "resend_verification_token:"


class AuthenticationService:
    """Service layer for authentication operations with DI support."""

    def __init__(
        self,
        *,
        user_model: type[AbstractBaseUser] | UserModelProtocol | None = None,
        email_address_model: type[EmailAddress] | None = None,
        email_confirmation_model: type[EmailConfirmation] | None = None,
        email_confirmation_hmac: type[EmailConfirmationHMAC] | None = None,
        authenticate_fn: Callable[..., AbstractBaseUser | None] | None = None,
        validate_password_fn: Callable[[str], None] | None = None,
        refresh_token_cls: type[RefreshToken] | None = None,
        jwt_settings_provider: Callable[[], JWTSettings] | None = None,
        set_cookie: Callable[
            [HttpResponse, str, str, timedelta, str],
            None,
        ]
        | None = None,
        blacklist_token_fn: Callable[[RefreshToken], None] | None = None,
        check_token_blacklist_fn: Callable[[RefreshToken], object] | None = None,
        extract_user_id_fn: Callable[[str], str | int] | None = None,
        build_error_response_fn: Callable[..., dict[str, object]] | None = None,
        client_info_getter: Callable[[HttpRequest], tuple[str, str]] | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._user_model = cast(UserModelProtocol, user_model or get_user_model())
        self._email_address_model = email_address_model or EmailAddress
        self._email_confirmation_model = email_confirmation_model or EmailConfirmation
        self._email_confirmation_hmac = email_confirmation_hmac or EmailConfirmationHMAC
        self._authenticate_fn = authenticate_fn or authenticate
        self._validate_password_fn = validate_password_fn or validate_password
        self._refresh_token_cls = refresh_token_cls or RefreshToken
        self._jwt_settings_provider = jwt_settings_provider or get_jwt_settings
        self._set_cookie = set_cookie or set_auth_cookie
        self._blacklist_token_fn = blacklist_token_fn or blacklist_token
        self._check_token_blacklist_fn = check_token_blacklist_fn or check_token_blacklist
        self._extract_user_id_fn = extract_user_id_fn or extract_user_id_from_token
        self._build_error_response_fn = build_error_response_fn or build_error_response
        self._client_info_getter = client_info_getter or get_client_info
        self._logger = logger or logging.getLogger("cinexplorer.auth")

    @staticmethod
    def _mask_email(email: str) -> str:
        """Mask email address for display in error responses.

        Reveals first character of local part and full domain.
        Example: "test@example.com" -> "t***@example.com"
        """
        if "@" not in email:
            return "***"
        local, domain = email.split("@", 1)
        if not local:
            return f"***@{domain}"
        return f"{local[0]}***@{domain}"

    def _generate_resend_token(self, user_id: int) -> str:
        """Generate a cryptographically secure resend token and store in cache.

        Token is stored as a hash in cache with the user_id as value.
        Returns the plain token for inclusion in the response.
        """
        token = secrets.token_urlsafe(48)  # 64 chars base64
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cache_key = f"{RESEND_TOKEN_CACHE_PREFIX}{token_hash}"
        cache.set(cache_key, user_id, timeout=RESEND_TOKEN_EXPIRY_SECONDS)
        self._logger.debug(f"Generated resend token for user_id={user_id}")
        return token

    def _validate_resend_token(self, token: str) -> int | None:
        """Validate a resend token and return the user_id if valid.

        Reading does not consume the token; a successful send does.
        Returns None if token is invalid, expired, or already used.
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cache_key = f"{RESEND_TOKEN_CACHE_PREFIX}{token_hash}"
        user_id = cache.get(cache_key)
        if user_id is not None:
            self._logger.debug(f"Validated resend token for user_id={user_id}")
        return user_id

    # =========================================================================
    # Registration
    # =========================================================================

    def register_user(
        self,
        request: HttpRequest,
        payload: RegisterInputSchema,
    ) -> tuple[int, RegisterResponseSchema | dict[str, object]]:
        """Register a new user and send email verification."""
        client_ip, _ = self._client_info_getter(request)
        forbidden_usernames = settings.FORBIDDEN_USERNAMES
        # allauth lowercases an email before matching it at sign-in, so store it lowercase.
        email = payload.email.lower()

        if payload.username.lower() in forbidden_usernames:
            self._logger.warning(
                "Registration failed: Forbidden username | "
                f"username={payload.username} | ip={client_ip}"
            )
            return 409, {"error": f'Username "{payload.username}" is not allowed.'}

        if self._user_model.objects.filter(username=payload.username).exists():
            self._logger.warning(
                "Registration failed: Username already exists | "
                f"username={payload.username} | ip={client_ip}"
            )
            return 409, {"error": "Username already associated with an existing account."}

        if self._user_model.objects.filter(email__iexact=email).exists():
            self._logger.warning(f"Registration failed: Email already exists | ip={client_ip}")
            return 409, {"error": "Email address already associated with an existing account."}

        try:
            self._validate_password_fn(payload.password)
        except ValidationError as exc:
            self._logger.warning(
                "Registration failed: Weak password | "
                f"username={payload.username} | ip={client_ip}"
            )
            return 400, {
                "error": "Password validation failed.",
                "details": list(exc.messages),
            }

        try:
            with transaction.atomic():
                user = self._user_model.objects.create_user(
                    username=payload.username,
                    email=email,
                    password=payload.password,
                    first_name=payload.first_name or "",
                    last_name=payload.last_name or "",
                )

                # Create email address record (without sending - we'll send manually)
                email_address = self._email_address_model.objects.create(
                    user=user,
                    email=email,
                    verified=False,
                    primary=True,
                )

                # Send verification email and check if it was actually sent
                email_sent = send_verification_email_to_address(
                    request, email_address, signup=True
                )

                if not email_sent:
                    # Email wasn't sent - raise to trigger rollback
                    raise RuntimeError("Verification email could not be sent")

            # Transaction committed successfully - user and email records created
            self._logger.info(
                "Registration successful | "
                f"user_id={user.id} | username={payload.username} | ip={client_ip}"
            )

            return 201, {
                "message": (
                    "Registration successful. Please check your email to verify your account."
                ),
                "user_id": user.id,
                "email": user.email,
                "email_sent": True,
            }
        except IntegrityError as exc:
            # A rival account took the username or address after the checks above, and the
            # database's unique constraints refused this one. The error's text quotes the
            # value, so only its type is logged.
            self._logger.warning(
                "Registration failed: Username or email taken during registration | "
                f"username={payload.username} | ip={client_ip} | "
                f"error_type={type(exc).__name__}"
            )
            return 409, {
                "error": "Username or email address already associated with an existing account."
            }
        except Exception as exc:
            # Transaction automatically rolled back - no manual cleanup needed.
            # The exception's text can carry the address, so only its type is logged.
            self._logger.error(
                "Registration failed: Email sending error | "
                f"username={payload.username} | ip={client_ip} | "
                f"error_type={type(exc).__name__}"
            )
            return 500, {
                "error": (
                    "Registration failed. Unable to send verification email. "
                    "Please try again later or contact support."
                ),
                "email_sent": False,
            }

    # =========================================================================
    # Login / Logout / Token Management
    # =========================================================================

    def obtain_token(
        self,
        request: HttpRequest,
        response: HttpResponse,
        payload: TokenObtainInputSchema,
    ) -> tuple[int, TokenResponseSchema | dict[str, object]]:
        """Authenticate user and return JWT tokens."""
        login = payload.login
        password = payload.password

        client_ip, user_agent = self._client_info_getter(request)

        if not login or not password:
            return 400, {"error": "Username/email and password are required."}

        authenticated_user = self._authenticate_fn(
            request=request,
            username=login,
            password=password,
        )

        if not authenticated_user:
            self._logger.warning(
                f"Login failed: Invalid credentials | ip={client_ip} | user_agent={user_agent}"
            )
            return 401, {"error": "Unable to authenticate with provided credentials."}

        # Single cast after validation - user satisfies both protocol and base class
        user = cast(UserProtocol, authenticated_user)

        if not self._email_address_model.objects.filter(
            user=authenticated_user,
            verified=True,
        ).exists():
            self._logger.warning(
                f"Login failed: Email not verified | user_id={user.id} | ip={client_ip}"
            )
            resend_token = self._generate_resend_token(user.id)
            return 403, {
                "error": (
                    "Please verify your email address before logging in. "
                    "Check your email for the verification link."
                ),
                "email": self._mask_email(user.email),
                "resend_token": resend_token,
            }

        refresh = self._refresh_token_cls.for_user(cast(AbstractBaseUser, authenticated_user))
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        jwt_settings = self._jwt_settings_provider()

        self._set_cookie(
            response,
            jwt_settings.refresh_token_name,
            refresh_token,
            jwt_settings.refresh_lifetime,
            jwt_settings.samesite,
        )

        self._logger.info(
            f"Login successful | user_id={user.id} | ip={client_ip} | user_agent={user_agent}"
        )

        return 200, {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name or None,
            "email_verified": True,
        }

    def refresh_token(
        self,
        request: HttpRequest,
        response: HttpResponse,
    ) -> tuple[int, TokenResponseSchema | dict[str, object]]:
        """Refresh JWT access and refresh tokens using refresh cookie."""
        jwt_settings = self._jwt_settings_provider()
        client_ip, user_agent = self._client_info_getter(request)
        refresh_token_value = request.COOKIES.get(jwt_settings.refresh_token_name)

        if not refresh_token_value:
            return 400, {"error": "No valid refresh token found in cookies."}

        try:
            old_refresh = self._refresh_token_cls(refresh_token_value)
            access_token = str(old_refresh.access_token)

            user_id = old_refresh.payload.get("user_id")
            user = self._user_model.objects.get(id=user_id)

            new_refresh = self._refresh_token_cls.for_user(cast(AbstractBaseUser, user))
            new_refresh_token = str(new_refresh)

            self._blacklist_token_fn(old_refresh)

            self._set_cookie(
                response,
                jwt_settings.access_token_name,
                access_token,
                jwt_settings.access_lifetime,
                jwt_settings.samesite,
            )
            self._set_cookie(
                response,
                jwt_settings.refresh_token_name,
                new_refresh_token,
                jwt_settings.refresh_lifetime,
                jwt_settings.samesite,
            )

            self._logger.info(f"Token refresh successful | user_id={user_id} | ip={client_ip}")

            return 200, {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "user_id": user_id,
                "username": user.username,
                "first_name": user.first_name or None,
                "email_verified": True,
            }
        except TokenError as exc:
            error_message = str(exc).lower()
            if "blacklist" in error_message or "blacklisted" in error_message:
                user_id = self._extract_user_id_fn(refresh_token_value)
                self._logger.warning(
                    "SECURITY: Blacklisted token reuse attempt detected | "
                    f"user_id={user_id} | ip={client_ip} | user_agent={user_agent}"
                )
                return 401, self._build_error_response_fn(
                    "Token has been revoked. Please login again.",
                    debug_detail=(
                        "This refresh token has already been used and is no longer valid."
                    ),
                )
            return 400, {"error": f"Invalid or expired refresh token: {exc!s}"}
        except Exception as exc:
            self._logger.error(
                f"Unexpected error during token refresh: {exc!s}",
                exc_info=True,
            )
            return 400, {"error": "An error occurred during token refresh. Please try again."}

    def hybrid_refresh_token(
        self,
        request: HttpRequest,
        response: HttpResponse,
    ) -> tuple[int, HybridTokenRefreshResponseSchema | dict[str, object]]:
        """Refresh access token and rotate refresh cookie (hybrid auth)."""
        jwt_settings = self._jwt_settings_provider()
        client_ip, user_agent = self._client_info_getter(request)
        refresh_token_value = request.COOKIES.get(jwt_settings.refresh_token_name)

        if not refresh_token_value:
            return 400, {"error": "No valid refresh token found in cookies."}

        try:
            old_refresh = self._refresh_token_cls(refresh_token_value)

            if self._check_token_blacklist_fn(old_refresh):
                user_id = self._extract_user_id_fn(refresh_token_value)
                self._logger.warning(
                    "SECURITY: Blacklisted token reuse attempt (hybrid auth) | "
                    f"user_id={user_id} | ip={client_ip} | user_agent={user_agent}"
                )
                return 401, self._build_error_response_fn(
                    "Token has been revoked. Please login again.",
                    debug_detail=(
                        "This refresh token has already been used and is no longer valid."
                    ),
                )

            access_token = str(old_refresh.access_token)
            user_id = old_refresh.payload.get("user_id")
            user = self._user_model.objects.get(id=user_id)
            new_refresh = self._refresh_token_cls.for_user(cast(AbstractBaseUser, user))
            new_refresh_token = str(new_refresh)

            self._blacklist_token_fn(old_refresh)

            self._set_cookie(
                response,
                jwt_settings.refresh_token_name,
                new_refresh_token,
                jwt_settings.refresh_lifetime,
                jwt_settings.samesite,
            )

            issued_at = datetime.now(UTC)

            self._logger.info(
                f"Hybrid token refresh successful | user_id={user_id} | ip={client_ip}"
            )

            assert isinstance(jwt_settings.access_lifetime, timedelta)
            return 200, {
                "access_token": access_token,
                "expires_in": int(jwt_settings.access_lifetime.total_seconds()),
                "issued_at": issued_at.isoformat(),
            }
        except TokenError as exc:
            error_message = str(exc).lower()
            if "blacklist" in error_message or "blacklisted" in error_message:
                user_id = self._extract_user_id_fn(refresh_token_value)
                self._logger.warning(
                    "SECURITY: Blacklisted token reuse attempt (hybrid auth) | "
                    f"user_id={user_id} | ip={client_ip} | user_agent={user_agent}"
                )
                return 401, self._build_error_response_fn(
                    "Token has been revoked. Please login again.",
                    debug_detail=(
                        "This refresh token has already been used and is no longer valid."
                    ),
                )
            return 400, {"error": f"Invalid or expired refresh token: {exc!s}"}
        except Exception as exc:
            self._logger.error(
                f"Unexpected error during hybrid token refresh: {exc!s}",
                exc_info=True,
            )
            return 400, {"error": "An error occurred during token refresh. Please try again."}

    def logout(self, response: HttpResponse) -> tuple[int, dict[str, object]]:
        """Clear refresh token cookie for logout."""
        jwt_settings = self._jwt_settings_provider()
        response.set_cookie(
            jwt_settings.refresh_token_name,
            "",
            max_age=0,
            httponly=True,
            secure=True,
            samesite=jwt_settings.samesite,
            path="/",
            domain=None,
        )
        return 200, {"message": "Logged out successfully."}

    # =========================================================================
    # Profile Operations
    # =========================================================================

    def get_user_profile(self, user: UserProtocol) -> UserProfileSchema:
        """Return user profile with computed fields."""
        profile = UserProfileSchema.model_validate(user)
        profile.email_verified = self._email_address_model.objects.filter(
            user=user,
            verified=True,
        ).exists()
        profile.full_name = f"{user.first_name} {user.last_name}".strip() or None
        return profile

    # =========================================================================
    # Email Verification
    # =========================================================================

    def verify_email(
        self,
        request: HttpRequest,
        payload: EmailVerificationInputSchema,
    ) -> tuple[int, EmailVerificationResponseSchema | dict[str, str]]:
        """Verify email address using confirmation key."""
        try:
            confirmation = self._email_confirmation_hmac.from_key(payload.key)

            if not confirmation:
                self._logger.info("HMAC failed, trying database lookup")
                confirmation = self._email_confirmation_model.objects.get(key=payload.key)

            email_address = confirmation.email_address
            if email_address.verified:
                self._logger.warning(
                    f"Email verification skipped: user_id={email_address.user_id} already verified"
                )
                return 400, {"error": "Email address is already verified."}

            self._logger.info(f"Confirming email for user_id={email_address.user_id}")
            confirmation.confirm(request)

            # Send welcome email after successful verification
            send_welcome_email(cast(UserEmailProtocol, email_address.user))

            return 200, {
                "message": "Email verified successfully.",
                "email": email_address.email,
            }
        except self._email_confirmation_model.DoesNotExist as exc:
            self._logger.error(f"EmailConfirmation not found: {exc}")
            return 400, {"error": "Invalid or expired verification link."}
        except AttributeError as exc:
            self._logger.error(f"AttributeError during verification: {exc}")
            return 400, {"error": "Invalid or expired verification link."}
        except Exception as exc:
            self._logger.error(
                f"Unexpected error during verification: {exc}",
                exc_info=True,
            )
            return 400, {"error": "Invalid or expired verification link."}

    def resend_verification(
        self,
        request: HttpRequest,
        payload: ResendVerificationInputSchema,
    ) -> tuple[int, ResendVerificationResponseSchema | dict[str, str]]:
        """Resend email verification using opaque token from login error.

        Token-based approach prevents user enumeration while enabling resend
        for all login methods (email or username).
        """
        # Read the token; keep it available until an email has been sent.
        user_id = self._validate_resend_token(payload.resend_token)

        # Generic response for invalid/expired token (don't leak validity)
        if user_id is None:
            self._logger.debug("Resend verification: invalid or expired token")
            return 200, {"message": "Verification email sent successfully."}

        token_hash = hashlib.sha256(payload.resend_token.encode()).hexdigest()
        cache_key = f"{RESEND_TOKEN_CACHE_PREFIX}{token_hash}"
        try:
            user = self._user_model.objects.get(id=user_id)

            # Check if already verified (edge case: verified between login and resend)
            if self._email_address_model.objects.filter(
                user=user,
                verified=True,
            ).exists():
                self._logger.info(f"Resend skipped: user_id={user_id} already verified")
                return 200, {"message": "Verification email sent successfully."}

            # Send verification email
            try:
                email_address = self._email_address_model.objects.get(
                    user=user,
                    email__iexact=user.email,
                )
                email_address.send_confirmation(request)
                self._logger.info(f"Resend verification email sent to user_id={user_id}")
            except self._email_address_model.DoesNotExist:
                # Create EmailAddress record if missing (shouldn't happen normally)
                self._email_address_model.objects.add_email(
                    request,
                    cast(AbstractBaseUser, user),
                    user.email,
                    confirm=True,
                )
                self._logger.info(
                    f"Created EmailAddress and sent verification for user_id={user_id}"
                )

            cache.delete(cache_key)
            return 200, {"message": "Verification email sent successfully."}

        except EmailDeliveryError:
            self._logger.error(
                "%s | endpoint=%s | user_id=%s",
                EMAIL_DELIVERY_FAILURE_MESSAGE,
                request.path,
                user_id,
            )
            cache.set(cache_key, user_id, timeout=RESEND_TOKEN_EXPIRY_SECONDS)
            raise UpstreamError(EMAIL_DELIVERY_FAILURE_MESSAGE, status_code=503) from None
        except self._user_model.DoesNotExist:
            # User deleted between token generation and resend (rare edge case)
            self._logger.warning(f"Resend verification: user_id={user_id} not found")
            return 200, {"message": "Verification email sent successfully."}


__all__ = ["AuthenticationService"]
