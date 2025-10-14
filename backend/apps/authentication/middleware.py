"""
Custom CSRF middleware for Django Ninja API endpoints.

This middleware provides CSRF protection for Django Ninja APIs with path-based
exemptions, working around Django Ninja bug #1464 where csrf=True causes
valid CSRF tokens to be rejected.

CSRF Protection Strategy:
- Django Ninja: csrf=False (avoid bug #1464 entirely)
- Django's CsrfViewMiddleware: DISABLED (conflicts with custom middleware)
- This custom middleware: Path-based CSRF validation

Exemption Strategy:
- Path-based: All public endpoints listed in EXEMPT_PATH_PREFIXES
- Simple and reliable for small, stable authentication API

Why Custom Middleware:
1. Django Ninja bug #1464 makes csrf=True unreliable
2. Setting csrf=False on NinjaAPI applies @csrf_exempt to ALL endpoints
3. This middleware provides selective CSRF protection without Django Ninja conflicts
"""
from __future__ import annotations

import logging

from django.http import HttpRequest, JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('cinexplorer.auth')

# Path-based exemptions for public authentication endpoints
# These endpoints should NOT require CSRF tokens:
# - Public authentication: login, register, logout, email verification
# - Infrastructure: CSRF token generation endpoint
#
# PATH MAINTENANCE GUIDE:
# Add new path when:
#   - Creating public auth endpoint (accessible before login)
#   - Adding infrastructure endpoint (health checks, metrics)
#   - Implementing OAuth callbacks (state parameter provides CSRF protection)
#
# Do NOT add when:
#   - Endpoint requires authentication (has JWT cookie - needs CSRF)
#   - Endpoint performs state-changing operations with user data
#   - Unsure → default to CSRF protection (more secure)
#
# OAuth Headless API (django-allauth):
# Django-allauth headless mode OAuth endpoints are CSRF-exempt because:
# 1. OAuth 2.0 'state' parameter provides CSRF protection at protocol level
# 2. State is random, unpredictable, stored in backend session, validated on callback
# 3. Adding CSRF cookies would be redundant (defense-in-depth but not required)
# 4. Django-allauth headless is designed for SPA OAuth without traditional CSRF
# Reference: https://docs.allauth.org/en/dev/headless/
#   "/_allauth/",  # OAuth: Headless API (state parameter provides CSRF protection)
#
# Refactoring Risks:
# - Prefix matching: "/api/token/" exempts "/api/token/refresh/" too
# - URL changes must update this list
# - Run CSRF test suite after URL structure changes
EXEMPT_PATH_PREFIXES = [
    "/api/register/",           # Public: User registration
    "/api/token/",              # Public: Login (obtain tokens)
    "/api/csrf/",               # Infrastructure: CSRF token generation
    "/api/logout/",             # Public: Logout (clears cookies)
    "/api/verify-email/",       # Public: Email verification
    "/api/resend-verification/", # Public: Resend verification email
    "/_allauth/",               # OAuth: django-allauth headless (state provides CSRF protection)
]


class CsrfHeaderMiddleware(MiddlewareMixin):
    """
    Custom CSRF middleware for API endpoints with path-based exemptions.

    Validates CSRF tokens for authenticated state-changing requests while
    exempting public authentication endpoints.

    How it works:
    1. Exempt paths in EXEMPT_PATH_PREFIXES (public endpoints)
    2. Exempt unauthenticated requests (auth should fail first with 401)
    3. For authenticated POST/PUT/PATCH/DELETE: validate CSRF token
    4. Token must match: cookie 'csrftoken' == header 'X-CSRFToken'

    CSRF Protection:
    - Cookie: 'csrftoken' (set by /api/csrf/ endpoint)
    - Header: 'X-CSRFToken' (must be sent by frontend)
    - Validation: Double-submit cookie pattern
    """

    def process_request(self, request: HttpRequest) -> JsonResponse | None:
        """
        Process incoming request and validate CSRF if needed.

        Args:
            request: The incoming HTTP request

        Returns:
            JsonResponse with 403 if CSRF validation fails, None to continue
        """
        # Exempt paths that don't require CSRF (public auth endpoints)
        # Note: /api/token/ matches both login and refresh, but refresh should NOT be exempt
        # Check for exact match on refresh endpoint first (requires CSRF per Option A decision)
        if request.path == "/api/token/refresh/":
            # Refresh endpoint requires CSRF - do NOT exempt
            pass  # Continue to CSRF validation below
        elif any(request.path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES):
            return None

        # Check if request has JWT authentication cookies
        # JWT auth happens at Django Ninja endpoint level, not middleware,
        # so request.user is not yet set. We check for JWT cookies directly.
        from django.conf import settings
        access_token_name = settings.SIMPLE_JWT.get('ACCESS_TOKEN_NAME', 'access_token')
        has_jwt_cookie = access_token_name in request.COOKIES

        # CSRF protection only needed when JWT cookies are present
        # If no JWT cookie, request will fail authentication (401) before reaching endpoint
        if not has_jwt_cookie:
            return None

        # Validate CSRF for state-changing methods
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            cookie_token = request.COOKIES.get("csrftoken")
            header_token = request.headers.get("X-CSRFToken")

            if not cookie_token or not header_token or cookie_token != header_token:
                logger.warning(
                    f"CSRF validation failed: Path={request.path}, "
                    f"Method={request.method}, "
                    f"HasJWTCookie={has_jwt_cookie}, "
                    f"CookiePresent={bool(cookie_token)}, "
                    f"HeaderPresent={bool(header_token)}"
                )
                # Standardized error format: {"error": "message"} for all errors
                # Optional "detail" field for debugging (development only)
                from django.conf import settings
                error_response = {"error": "CSRF token missing or invalid."}
                if settings.DEBUG:
                    error_response["detail"] = (
                        f"CSRF validation failed for {request.method} {request.path}. "
                        f"Ensure X-CSRFToken header matches csrftoken cookie."
                    )
                return JsonResponse(error_response, status=403)

        return None
