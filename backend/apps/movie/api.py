"""Django Ninja router for movie endpoints.

This module defines the movie API endpoints using Django Ninja routers and
integrates with the typed movie service layer.
"""

from __future__ import annotations

from ninja import Router
from ninja.errors import HttpError

from .schemas import (
    MovieDetailSchema,
    PaginatedMovieResponseSchema,
    GenreSchema,
    PaginatedKeywordResponseSchema,
    PaginatedPersonResponseSchema,
)

# Create the router instance for movie endpoints
router = Router(tags=["movies"])

# Path operations will be added in Task 3.4
