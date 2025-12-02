"""Service layer parameter model - the data contract between API and services.

ServiceParams defines the structured parameters that service layer methods accept.
This is the canonical representation of filter/query parameters after HTTP parsing
and before service logic execution.

This model is used by:
- param_transformer: produces ServiceParams from HTTP schemas
- query_params (tmdb_api_boundary): consumes ServiceParams to build TMDB API params
- data_quality filters: reads filtering parameters like min_vote_count
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..data_quality.policy import VOTE_COUNT_THRESHOLD


class ServiceParams(BaseModel):
    """Service layer parameters for movie discovery.

    This Pydantic model provides:
    - Runtime validation
    - Attribute access (params.year_min) with IDE type awareness
    - extra="forbid" to catch typos at runtime
    - Consistent pattern with Django Ninja schemas

    TMDB API params use underscore notation (Pythonic), converted to dot notation
    in get_tmdb_params() for TMDB API compatibility.
    """

    # TMDB API params
    sort_by: str | None = None
    genres: str | None = None
    keywords: str | None = None
    people: str | None = None
    year: int | None = None
    language: str | None = None  # Original language filter (maps to with_original_language)
    vote_average_gte: float | None = None
    vote_average_lte: float | None = None
    vote_count_gte: int | None = None
    vote_count_lte: int | None = None
    release_date_gte: str | None = None
    release_date_lte: str | None = None
    certification: str | None = None
    region: str | None = None
    with_release_type: str | None = None
    tmdb_page_start: int | None = None

    # Backend filtering params (not sent to TMDB API)
    year_min: int | None = None
    year_max: int | None = None
    rating_min: float | None = None
    rating_max: float | None = None
    min_vote_count: int | None = VOTE_COUNT_THRESHOLD  # None = disabled, int = threshold

    model_config = ConfigDict(extra="forbid")

    def get_tmdb_params(self) -> dict[str, str | int | float | bool]:
        """Get TMDB API params with dot notation, excluding backend-only fields.

        Converts underscore notation (Pythonic) to dot notation (TMDB API format)
        and excludes backend-only filtering parameters.

        Returns:
            Dictionary ready for build_tmdb_params() with dot notation keys
        """
        # Backend-only fields that shouldn't go to TMDB API
        backend_only = {
            'year_min', 'year_max', 'rating_min', 'rating_max', 'min_vote_count'
        }

        # Map underscore to dot notation for TMDB API
        underscore_to_dot = {
            'vote_average_gte': 'vote_average.gte',
            'vote_average_lte': 'vote_average.lte',
            'vote_count_gte': 'vote_count.gte',
            'vote_count_lte': 'vote_count.lte',
            'release_date_gte': 'release_date.gte',
            'release_date_lte': 'release_date.lte',
        }

        result: dict[str, str | int | float | bool] = {}
        for key, value in self.model_dump(exclude_none=True).items():
            if key in backend_only:
                continue
            # Convert to dot notation if needed
            output_key = underscore_to_dot.get(key, key)
            result[output_key] = value

        return result


__all__ = ["ServiceParams"]
