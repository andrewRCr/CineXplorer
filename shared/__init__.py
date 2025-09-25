"""
Shared types and constants for CineXplorer

This package contains TypedDict definitions and error codes that are shared
between frontend TypeScript and backend Python to ensure API contract consistency.
"""

from .api_types import (
    # API Response Types
    ApiError,
    ApiResponse,
    ApiResponseMeta,
    PaginatedResponse,
    PaginationInfo,

    # Authentication Types
    AuthTokenResponse,
    AuthTokenUser,

    # User Types
    UserProfile,
    UserPreferences,

    # Movie Types
    Movie,
    UserMovieData,
    Genre,
    CastMember,
    CrewMember,
    ProductionCompany,

    # Request Parameter Types
    MovieListParams,
    UserMovieFilter,
    RateMovieRequest,
    WatchlistRequest,
    LikeMovieRequest,
    WatchedMovieRequest,

    # TMDB Types (internal)
    TMDBMovieResponse,
    TMDBSearchResponse,
    TMDBErrorResponse,
)

from .error_codes import (
    ERROR_CODES,
    ERROR_CATEGORIES,
    ErrorCode,
    ErrorCategory,
    ERROR_CODE_TO_CATEGORY,
    is_error_in_category,
    get_error_category,
)

__all__ = [
    # API Response Types
    'ApiError',
    'ApiResponse',
    'ApiResponseMeta',
    'PaginatedResponse',
    'PaginationInfo',

    # Authentication Types
    'AuthTokenResponse',
    'AuthTokenUser',

    # User Types
    'UserProfile',
    'UserPreferences',

    # Movie Types
    'Movie',
    'UserMovieData',
    'Genre',
    'CastMember',
    'CrewMember',
    'ProductionCompany',

    # Request Parameter Types
    'MovieListParams',
    'UserMovieFilter',
    'RateMovieRequest',
    'WatchlistRequest',
    'LikeMovieRequest',
    'WatchedMovieRequest',

    # TMDB Types (internal)
    'TMDBMovieResponse',
    'TMDBSearchResponse',
    'TMDBErrorResponse',

    # Error Types
    'ERROR_CODES',
    'ERROR_CATEGORIES',
    'ErrorCode',
    'ErrorCategory',
    'ERROR_CODE_TO_CATEGORY',
    'is_error_in_category',
    'get_error_category',
]