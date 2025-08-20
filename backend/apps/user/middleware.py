
"""
Custom CSRF middleware for API endpoints.

EXEMPT_PATHS contains endpoints that are exempt from CSRF checks because:
    - Registration, token obtain, token refresh, and logout endpoints must be accessible
        to unauthenticated users.
    - These endpoints use JWT for authentication and do not rely on cookies for auth.
    - CSRF protection is not needed for login, registration, token obtain, token refresh,
        or logout in a JWT-based API.
    - All other unsafe endpoints (using cookies for auth) remain protected by CSRF.
"""

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

EXEMPT_PATHS = ['/api/register/', '/api/token/', '/api/logout/', '/api/token/refresh/']


class CsrfHeaderMiddleware(MiddlewareMixin):
    def process_request(self, request):
        print(
            f"[CSRF Middleware] Path: {request.path}, Method: {request.method}, Authenticated: {getattr(request, 'user', None) and request.user.is_authenticated}")
        if request.path in EXEMPT_PATHS:
            return None
        # CSRF protection is only needed for authenticated users.
        # Unauthenticated requests have no session/cookies, so there's no CSRF risk.
        # Let authentication fail first (401), then enforce CSRF for authenticated users (403).
        if not getattr(request, "user", None) or not request.user.is_authenticated:
            return None
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            cookie_token = request.COOKIES.get("XSRF-TOKEN")
            header_token = request.headers.get("X-CSRFToken")
            if not cookie_token or not header_token or cookie_token != header_token:
                return JsonResponse({"detail": "CSRF token missing or invalid."}, status=403)
