"""
Main Django Ninja API configuration for CineXplorer.

This module creates the central NinjaAPI instance that serves as the entry point
for all Django Ninja-based API endpoints. It will be used to register app-specific
routers and handle global API configuration.
"""
from __future__ import annotations

from ninja import NinjaAPI

# Create the main NinjaAPI instance
api = NinjaAPI(
    title="CineXplorer API",
    version="1.0.0",
    description="A modern, type-safe API for the CineXplorer movie discovery application",
    docs_url="/docs",
    openapi_url="/openapi.json",
)


@api.get("/health")
def health_check() -> dict[str, str]:
    """
    Temporary health check endpoint to verify Django Ninja setup.

    Returns:
        Simple status response indicating the API is working.
    """
    return {"status": "ok", "message": "Django Ninja API is working!"}


# TODO: Add app routers here as they are created
# Example: api.add_router("/movie/", "apps.movie.api.router")
