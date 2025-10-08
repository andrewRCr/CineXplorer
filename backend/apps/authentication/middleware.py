"""
Custom CSRF middleware for API endpoints.

Provides double-submit cookie pattern for CSRF protection, with exemptions
for JWT-authenticated endpoints that don't require CSRF protection.

Note: This custom middleware will be removed in favor of Django's built-in
CsrfViewMiddleware as part of security hardening work.
"""
from __future__ import annotations

import logging

from django.http import HttpRequest, JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

# Prefix-based exemptions for token-related endpoints
EXEMPT_PATH_PREFIXES = ["/api/register/", "/api/token/", "/api/logout/"]


class CsrfHeaderMiddleware(MiddlewareMixin):
    """
    Custom CSRF middleware for API endpoints.

    EXEMPT_PATH_PREFIXES contains endpoints that are exempt from CSRF checks because:
        - Registration, token obtain, token refresh, and logout endpoints must be accessible
            to unauthenticated users.
        - These endpoints use JWT for authentication and do not rely on cookies for auth.
        - CSRF protection is not needed for login, registration, token obtain, token refresh,
            or logout in a JWT-based API.
        - All other unsafe endpoints (using cookies for auth) remain protected by CSRF.
    """

    def process_request(self, request: HttpRequest) -> JsonResponse | None:
        # Check if path starts with any exempt prefix
        if any(request.path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES):
            return None

        # CSRF protection is only needed for authenticated users.
        # Unauthenticated requests have no session/cookies, so there's no CSRF risk.
        # Let authentication fail first (401), then enforce CSRF for authenticated users (403).
        if not getattr(request, "user", None) or not request.user.is_authenticated:
            return None

        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            cookie_token = request.COOKIES.get("XSRF-TOKEN")
            # Accept either X-CSRFToken or X-XSRF-TOKEN header
            header_token = request.headers.get("X-CSRFToken") or request.headers.get(
                "X-XSRF-TOKEN"
            )

            if not cookie_token or not header_token or cookie_token != header_token:
                logger.warning(
                    f"CSRF validation failed: Path={request.path}, "
                    f"Method={request.method}, "
                    f"Authenticated={request.user.is_authenticated}, "
                    f"CookiePresent={bool(cookie_token)}, "
                    f"HeaderPresent={bool(header_token)}"
                )
                return JsonResponse(
                    {"detail": "CSRF token missing or invalid."}, status=403
                )

        return None
