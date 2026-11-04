"""Main Django Ninja API configuration for CineXplorer.

This module creates the central NinjaAPI instance with:
- Native JWT cookie authentication integration
- OpenAPI security schema documentation
- JSON error responses for domain, validation and unhandled errors
- Type-safe endpoint registration
"""

from __future__ import annotations

from ninja import NinjaAPI

# Import our native JWT authentication scheme
from apps.authentication.api import auth_router
from apps.authentication.auth_ninja import jwt_cookie_auth
from apps.core.api import core_router
from apps.core.api_errors import register_error_handlers
from apps.movie.api import genres_router, keywords_router, movies_router, people_router
from apps.user_movie_data.api import user_movie_data_router

# Create the main NinjaAPI instance with native authentication
#
# CSRF Architecture (django-ninja 1.5.x):
# - NinjaAPI(): No csrf parameter (removed in 1.5.0)
# - JWTCookieAuth: Passes csrf=False to APIKeyCookie parent (disables Ninja's CSRF)
# - Protection: Custom CsrfHeaderMiddleware with path-based exemptions
#
# This bypasses Django Ninja's CSRF entirely (avoids bug #1464) and uses
# our middleware for header-based CSRF validation on authenticated endpoints.
api = NinjaAPI(
    title="CineXplorer API",
    version="1.0.0",
    description=(
        "A modern, type-safe API for the CineXplorer movie discovery application. "
        "Authentication is handled via JWT tokens in HTTP-only cookies."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
    auth=jwt_cookie_auth,  # Global authentication scheme
)

# Every error reaches the client as JSON: {"detail": ..., "code": ...}
register_error_handlers(api)

# Add app routers
# Register authentication router (no auth prefix)
# Endpoints: /api/register/, /api/token/, etc.
api.add_router("", auth_router)

# Register core endpoints (logging, health checks)
# Endpoints: /api/logs/, /api/logs/health/
api.add_router("", core_router)

# Register movie-related routers with clean URL structure
api.add_router("/movies", movies_router)
api.add_router("/genres", genres_router)
api.add_router("/keywords", keywords_router)
api.add_router("/people", people_router)
api.add_router("/user-movie-data", user_movie_data_router)
