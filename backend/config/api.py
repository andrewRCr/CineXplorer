"""
Main Django Ninja API configuration for CineXplorer.

This module creates the central NinjaAPI instance with:
- Native JWT cookie authentication integration
- OpenAPI security schema documentation
- Global error handling and logging
- Type-safe endpoint registration
"""
from __future__ import annotations

from ninja import NinjaAPI

# Import our native JWT authentication scheme
from apps.authentication.api import auth_router
from apps.authentication.auth_ninja import jwt_cookie_auth
from apps.core.api import core_router
from apps.movie.api import genres_router, keywords_router, movies_router, people_router
from apps.user_movie_data.api import user_movie_data_router

# Create the main NinjaAPI instance with native authentication
# csrf=False: Disable Django Ninja CSRF entirely to avoid bug #1464
# CSRF protection provided by custom CsrfHeaderMiddleware with path-based exemptions
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
    csrf=False  # Custom middleware handles CSRF (avoid Django Ninja bug #1464)
)

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
