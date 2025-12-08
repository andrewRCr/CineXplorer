"""Service layer parameter model for search endpoint.

SearchServiceParams defines the structured parameters that the search_movies()
service method accepts. This is the canonical representation of search filter
parameters after HTTP parsing and before service logic execution.

Naming convention:
- Backend: *ServiceParams (e.g., BrowseServiceParams, SearchServiceParams)
- Frontend: *Params (e.g., BrowseParams, SearchParams)
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class SearchServiceParams(BaseModel):
    """Service layer parameters for search endpoint.

    This Pydantic model provides:
    - Runtime validation
    - Attribute access (params.query) with IDE type awareness
    - extra="forbid" to catch typos at runtime
    - Satisfies HashableParams Protocol for DeduplicationTracker

    Unlike BrowseServiceParams, search doesn't use TMDB filter params -
    TMDB search only accepts query string. All filtering is backend-only.
    """

    # Required: search query
    query: str

    # Backend filtering params (not sent to TMDB API - search only accepts query)
    year_min: int | None = None
    year_max: int | None = None
    rating_min: float | None = None
    rating_max: float | None = None

    model_config = ConfigDict(extra="forbid")


__all__ = ["SearchServiceParams"]
