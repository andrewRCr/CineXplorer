from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import cast

from core.services.tmdb_api_client import TMDBApiClient
from core.services.validators import (
    validate_tmdb_paginated_response,
    validate_tmdb_response,
)
from core.tmdb_models.tmdb_responses import (
    TMDBGenreListResponse,
    TMDBMovieBase,
    TMDBPaginatedMovieResponse,
)
from core.types.api_types import TMDBParams
from ninja.errors import HttpError

from ..helpers import (
    NOW_PLAYING_PROTECTED_KEYS,
    UPCOMING_PROTECTED_KEYS,
    merge_with_preset,
)
from ..schemas import (
    GenreSchema,
    MovieDetailSchema,
    MovieListResponseSchema,
)
from .api_boundary import BrowseServiceParams, SearchServiceParams
from .base_service import BaseTMDBService
from .data_quality.policy import VoteCountPolicy
from .deduplication_tracker import DeduplicationTracker
from .pipelines.paginated import fetch_with_filters_and_buffer
from .tmdb_api_boundary.query_params import build_tmdb_params
from .tmdb_api_boundary.response_factories import (
    create_genre_list_from_tmdb,
    create_movie_detail_from_tmdb,
    handle_tmdb_api_error,
)

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')

# Initialize the TMDB API client
tmdb_client = TMDBApiClient()


class MovieService(BaseTMDBService):
    """
    Movie service with dependency injection for TMDB integration.

    This service encapsulates all TMDB API interactions with constructor-based
    dependency injection, enabling testability and maintaining separation of
    concerns. All business logic for movie discovery, search, and retrieval
    is centralized in this service layer.

    Inherits from BaseTMDBService for common DI pattern and logging.

    Usage:
        # Production usage (default client)
        service = MovieService()
        movies = service.search_movies("inception")

        # Testing with mock client
        mock_client = MockTMDBApiClient()
        service = MovieService(tmdb_client=mock_client)
        movies = service.search_movies("test")
    """

    # ========================================================================
    # Core Discovery Methods
    # ========================================================================

    def discover_movies(
        self,
        page: int = 1,
        params: BrowseServiceParams | None = None,
        dedup_tracker: DeduplicationTracker | None = None,
    ) -> MovieListResponseSchema:
        """
        Core TMDB discover wrapper with full filtering capabilities.

        This is the foundational discovery method that other service methods build upon.
        Date-constrained methods (get_now_playing_movies, get_upcoming_movies) call this
        method internally with preset filters to create curated endpoints.

        Architecture:
            - Service layer handles all business logic (presets, filter merging)
            - API layer is thin (HTTP concerns only, delegates to service methods)
            - This method is the internal workhorse for all discovery operations

        Args:
            page: Page number for pagination
            params: BrowseServiceParams model containing:
                Backend filtering (second-pass data hygiene):
                - year_min/year_max: Release year range (inclusive)
                - rating_min/rating_max: Rating range (inclusive)
                - tmdb_page_start: Starting TMDB page for smart buffer continuation
                - min_vote_count: Minimum vote count filter (None to disable)

                TMDB API filters:
                - sort_by: Sort order (popularity.desc, release_date.desc, etc.)
                - genres: Comma-separated genre IDs
                - year: Release year
                - vote_average_gte/lte: Rating range
                - keywords: Comma-separated keyword IDs
                - people: Comma-separated person IDs
                - release_date_gte/lte: Release date range
                - with_release_type: Release type (2|3 for theatrical)
                - certification: Certification rating

        Returns:
            MovieListResponseSchema with discovered movies, including
            next_tmdb_page_start metadata for pagination continuation

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Runtime filtering is disabled due to TMDB API limitations.
            Year and rating filters use two-pass architecture: TMDB API (primary)
            + backend filtering (catches data quality issues).
        """
        import logging
        logger = logging.getLogger('cinexplorer.movie')

        # Use empty params if none provided
        if params is None:
            params = BrowseServiceParams()

        # Extract backend filtering params (used for TMDB API first-pass and logging)
        year_min = params.year_min
        year_max = params.year_max
        rating_min = params.rating_min
        rating_max = params.rating_max
        min_vote_count = params.min_vote_count  # None = disabled, int = threshold

        logger.debug(
            f"Discover movies request: page={page}, year_min={year_min}, year_max={year_max}, "
            f"rating_min={rating_min}, rating_max={rating_max}, params={params}"
        )

        # Build TMDB API parameters using filtering module
        # Pass min_vote_count to ensure TMDB first-pass filtering matches backend filter
        tmdb_filters = params.get_tmdb_params()
        api_params = build_tmdb_params(
            page, rating_min, rating_max, min_vote_count, **tmdb_filters
        )

        # Log TMDB params at DEBUG level for diagnostics
        logger.debug(
            f"TMDB discover params: rating_min={rating_min}, "
            f"rating_max={rating_max}, full_params={api_params}"
        )

        def fetch_discover_page(page_num: int) -> TMDBPaginatedMovieResponse:
            """Fetch a specific discover page with current filters."""
            page_params = api_params.copy()
            page_params['page'] = page_num
            page_response = self._tmdb_client.get(
                "discover/movie",
                cast(dict[str, object], page_params)
            )
            return validate_tmdb_paginated_response(
                page_response,
                TMDBPaginatedMovieResponse
            )

        return fetch_with_filters_and_buffer(
            fetch_discover_page,
            page,
            params,
            dedup_tracker=dedup_tracker,
        )

    def get_now_playing_movies(
        self,
        page: int = 1,
        params: BrowseServiceParams | None = None,
        dedup_tracker: DeduplicationTracker | None = None,
    ) -> MovieListResponseSchema:
        """
        Retrieves movies currently playing in theaters with filtering.

        This is a thin wrapper around discover_movies() with protected date range
        and release type presets. The date range covers the "theater planning window"
        (today - 30 days to today + 5 days) to include both current releases and
        upcoming weekend movies.

        Protected parameters (enforced by preset, cannot be overridden):
        - Date range: today - 30 days to today + 5 days (35-day window)
        - Release type: 2|3 (theatrical releases only)
        - Year/primary_release_year: Redundant with date range (prevented)

        Users can apply additional filters:
        - Genres: Filter by genre IDs
        - Ratings (vote_average_gte/lte): Filter by rating range
        - Keywords: Filter by keyword IDs
        - People: Filter by cast/crew
        - Sort (sort_by): Change sort order (default: popularity.desc)

        Args:
            page: Page number for pagination
            params: BrowseServiceParams model with user-provided filters

        Returns:
            MovieListResponseSchema with now playing movies

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Business logic (preset building, filter merging) handled in Service layer.
            API layer is thin - only extracts parameters and delegates to this method.
        """
        if params is None:
            params = BrowseServiceParams()

        # Build date range preset (today - 30 days to today + 5 days)
        preset = self._build_date_constrained_preset(-30, 5)

        # Merge user filters with preset (protected keys override user values)
        user_filters = params.model_dump(exclude_none=True)
        merged_filters = merge_with_preset(user_filters, preset, NOW_PLAYING_PROTECTED_KEYS)

        # Apply vote count policy (now-playing bypasses threshold - new releases have low votes)
        merged_filters['min_vote_count'] = VoteCountPolicy.get_threshold(endpoint="now_playing")
        merged_params = BrowseServiceParams.model_validate(merged_filters)

        # Call discover endpoint with merged filters (thin wrapper pattern)
        return self.discover_movies(page=page, params=merged_params, dedup_tracker=dedup_tracker)

    def get_upcoming_movies(
        self,
        page: int = 1,
        params: BrowseServiceParams | None = None,
        dedup_tracker: DeduplicationTracker | None = None,
    ) -> MovieListResponseSchema:
        """
        Retrieves upcoming movies releasing soon in theaters with filtering.

        This is a thin wrapper around discover_movies() with protected date range
        and release type presets. The date range covers the "upcoming planning window"
        (today + 5 days to today + 65 days) to show movies releasing soon in theaters.
        Starts 5 days in the future to avoid overlap with Now Playing endpoint.

        Protected parameters (enforced by preset, cannot be overridden):
        - Date range: today + 5 days to today + 65 days (60-day window)
        - Release type: 2|3 (theatrical releases only)
        - Year/primary_release_year: Redundant with date range (prevented)

        Users can apply additional filters:
        - Genres: Filter by genre IDs
        - Ratings (vote_average_gte/lte): Filter by rating range
        - Keywords: Filter by keyword IDs
        - People: Filter by cast/crew
        - Sort (sort_by): Change sort order (default: popularity.desc)

        Args:
            page: Page number for pagination
            params: BrowseServiceParams model with user-provided filters

        Returns:
            MovieListResponseSchema with upcoming movies

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Business logic (preset building, filter merging) handled in Service layer.
            API layer is thin - only extracts parameters and delegates to this method.

            Region parameter intentionally omitted - incompatible with primary_release_date
            filters per TMDB API research (see research-tmdb-api-date-filtering.md).
        """
        if params is None:
            params = BrowseServiceParams()

        # Build date range preset (today + 5 days to today + 65 days)
        preset = self._build_date_constrained_preset(5, 65)

        # Merge user filters with preset (protected keys override user values)
        user_filters = params.model_dump(exclude_none=True)
        merged_filters = merge_with_preset(user_filters, preset, UPCOMING_PROTECTED_KEYS)

        # Apply vote count policy (upcoming bypasses threshold - unreleased movies have 0 votes)
        merged_filters['min_vote_count'] = VoteCountPolicy.get_threshold(endpoint="upcoming")
        merged_params = BrowseServiceParams.model_validate(merged_filters)

        # Call discover endpoint with merged filters (thin wrapper pattern)
        return self.discover_movies(page=page, params=merged_params, dedup_tracker=dedup_tracker)

    # ========================================================================
    # Search Methods
    # ========================================================================

    def search_movies(
        self,
        page: int = 1,
        params: SearchServiceParams | None = None,
        dedup_tracker: DeduplicationTracker | None = None,
    ) -> MovieListResponseSchema:
        """
        Searches for movies by query string using TMDB.

        Args:
            page: Page number for pagination
            params: SearchServiceParams model containing:
                - query: Search query string (required)
                - year_min/year_max: Release year range (backend filtered)
                - rating_min/rating_max: Rating range (backend filtered)
            dedup_tracker: Optional tracker for cross-page deduplication

        Returns:
            MovieListResponseSchema with filtered search results

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Year and rating filters use two-pass architecture: TMDB API (primary)
            + backend filtering (catches data quality issues).
            Non-visual content (soundtracks, scores, etc.) is filtered out.
        """
        if params is None:
            params = SearchServiceParams(query="")

        def fetch_search_page(page_num: int) -> TMDBPaginatedMovieResponse:
            """Fetch a specific search page with current query."""
            page_response = self._tmdb_client.search_movies(
                query=params.query,
                page=page_num,
                include_adult=False,
                language="en-US",
                region="US"
            )
            return validate_tmdb_paginated_response(page_response, TMDBPaginatedMovieResponse)

        return fetch_with_filters_and_buffer(
            fetch_search_page,
            page,
            params,
            pre_filter_func=self._filter_non_visual_content,
            dedup_tracker=dedup_tracker,
        )

    # ========================================================================
    # Movie Detail Methods
    # ========================================================================

    def get_movie_by_id(self, tmdb_id: int) -> MovieDetailSchema:
        """
        Retrieves movie details and credits from TMDB by movie ID.

        Args:
            tmdb_id: TMDB movie ID

        Returns:
            MovieDetailSchema instance with validated movie data

        Raises:
            HttpError: If movie not found, API error, or data processing fails
        """
        # Use injected TMDB client for movie details
        # Include release_dates for US certification extraction
        info_response = self._tmdb_client.get_movie_details(
            tmdb_id,
            append_to_response='release_dates'
        )
        if not info_response.is_success():
            handle_tmdb_api_error(
                info_response,
                operation='get_movie_details',
                movie_id=tmdb_id,
                error_stage='fetching_movie_info'
            )

        # Use injected TMDB client for credits
        credits_response = self._tmdb_client.get(f"movie/{tmdb_id}/credits")
        if not credits_response.is_success():
            handle_tmdb_api_error(
                credits_response,
                operation='get_movie_credits',
                movie_id=tmdb_id,
                error_stage='fetching_credits'
            )

        info_result = info_response.get_json_data()
        credits_result = credits_response.get_json_data()

        # Type guard: ensure we have valid dictionaries
        if not info_result or not credits_result:
            logger.error(
                "Failed to get valid response data from TMDB",
                extra={
                    'correlation_id': info_response.correlation_id,
                    'operation': 'get_movie_by_id',
                    'movie_id': tmdb_id,
                    'info_data_valid': bool(info_result),
                    'credits_data_valid': bool(credits_result)
                }
            )
            raise HttpError(500, "Failed to get valid response data from TMDB")

        # Use factory function to create properly typed MovieDetailSchema
        return create_movie_detail_from_tmdb(info_result, credits_result)

    # ========================================================================
    # Resource Methods
    # ========================================================================

    def get_movie_genres(self) -> list[GenreSchema]:
        """
        Retrieves the list of movie genres from TMDB.

        Returns:
            List of GenreSchema instances

        Raises:
            HttpError: If API error or data processing fails
        """
        response = self._tmdb_client.get("genre/movie/list")

        # Use type-safe validator
        tmdb_response = validate_tmdb_response(response, TMDBGenreListResponse)
        result = tmdb_response.model_dump()

        return create_genre_list_from_tmdb(result)

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    def _build_date_constrained_preset(
        self,
        start_days_offset: int,
        end_days_offset: int,
    ) -> TMDBParams:
        """Build date range preset for time-constrained endpoints.

        Creates a preset dictionary with date range and release type filters
        for endpoints like now-playing and upcoming that enforce specific
        time windows.

        Args:
            start_days_offset: Days to offset from today for start date
                (negative for past, positive for future)
            end_days_offset: Days to offset from today for end date
                (negative for past, positive for future)

        Returns:
            TMDBParams dict with date range and release type preset

        Example:
            # Now Playing: today - 30 days to today + 5 days
            preset = self._build_date_constrained_preset(-30, 5)

            # Upcoming: today + 5 days to today + 65 days
            preset = self._build_date_constrained_preset(5, 65)
        """
        today = datetime.now(tz=UTC)
        start_date = (today + timedelta(days=start_days_offset)).strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=end_days_offset)).strftime("%Y-%m-%d")

        return {
            "release_date_gte": start_date,
            "release_date_lte": end_date,
            "with_release_type": "2|3",  # Theatrical releases only
        }

    def _filter_non_visual_content(self, movies: list[TMDBMovieBase]) -> list[TMDBMovieBase]:
        """Filter out non-visual content from movie search results.

        This filters out soundtracks, scores, and other non-visual media that
        sometimes appear in TMDB search results despite being irrelevant to
        visual movie discovery.

        Args:
            movies: List of TMDB movie objects to filter

        Returns:
            Filtered list with non-visual content removed

        Note:
            Uses a conservative approach - only filters obvious non-visual content
            to minimize false positives.
        """
        # Skip terms for identifying non-visual content
        skip_terms = [
            'soundtrack', 'score', 'music from',
            'original motion picture soundtrack',
            'original score', 'music score', 'film score',
            'motion picture score'
        ]

        filtered: list[TMDBMovieBase] = []
        for movie in movies:
            title = movie.title or ''
            title_lower = title.lower()

            # Skip if title contains non-visual indicators
            if any(skip_term in title_lower for skip_term in skip_terms):
                logger.debug("Filtering out non-visual content", extra={
                    'operation': 'filter_non_visual',
                    'title': title,
                    'reason': 'non_visual_content'
                })
                continue

            filtered.append(movie)

        return filtered
