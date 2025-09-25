"""
Shared API Types - Python Implementation

Python TypedDict equivalents of shared/api-types.ts to ensure
API contract consistency between frontend TypeScript and backend Python.

These types should be used in Django views, serializers, and API responses
to maintain strict type safety and prevent API contract drift.
"""
from __future__ import annotations
from typing import TypedDict, NotRequired, Literal
from datetime import datetime

from .error_codes import ErrorCode, ErrorCategory


class ApiError(TypedDict):
    """
    Standard API Error structure
    Matches Django REST framework error format and TypeScript ApiError
    """
    code: ErrorCode
    message: str
    category: NotRequired[ErrorCategory]
    field: NotRequired[str]  # For validation errors on specific fields
    details: NotRequired[dict[str, object]]


class ApiResponseMeta(TypedDict):
    """API Response metadata"""
    timestamp: str
    request_id: NotRequired[str]
    version: NotRequired[str]


class ApiResponse(TypedDict):
    """
    Standard API Response wrapper
    Used for all API endpoints to maintain consistency
    Generic equivalent to TypeScript ApiResponse<T>
    """
    success: bool
    data: NotRequired[object]  # Can be any serialized data
    error: NotRequired[ApiError]
    errors: NotRequired[list[ApiError]]  # For multiple validation errors
    meta: NotRequired[ApiResponseMeta]


class PaginationInfo(TypedDict):
    """Pagination metadata for paginated responses"""
    page: int
    per_page: int
    total_pages: int
    total_count: int
    has_next: bool
    has_previous: bool
    next_page: NotRequired[int]
    previous_page: NotRequired[int]


class PaginatedResponse(TypedDict):
    """
    Paginated API Response
    Matches Django REST framework pagination and TypeScript PaginatedResponse<T>
    """
    success: bool
    data: NotRequired[list[object]]  # List of any serialized data
    error: NotRequired[ApiError]
    errors: NotRequired[list[ApiError]]
    meta: NotRequired[ApiResponseMeta]
    pagination: PaginationInfo


# Authentication Types
class AuthTokenUser(TypedDict):
    """User data included in authentication responses"""
    id: int
    username: str
    email: str
    is_verified: bool


class AuthTokenResponse(TypedDict):
    """Authentication response structure"""
    access_token: str
    refresh_token: str
    token_type: Literal['Bearer']
    expires_in: int
    user: AuthTokenUser


# User Profile Types
class UserPreferences(TypedDict):
    """User preferences structure"""
    theme: Literal['light', 'dark', 'auto']
    language: str
    email_notifications: bool


class UserProfile(TypedDict):
    """Complete user profile data structure"""
    id: int
    username: str
    email: str
    first_name: NotRequired[str]
    last_name: NotRequired[str]
    is_verified: bool
    date_joined: str  # ISO datetime string
    last_login: NotRequired[str]  # ISO datetime string
    avatar_url: NotRequired[str]
    preferences: UserPreferences


# Movie-related Types
class UserMovieData(TypedDict):
    """
    Movie rating/interaction data
    Matches the UserMovieData model from Django and TypeScript interface
    """
    user_rating: NotRequired[int | None]  # 1-10 scale
    user_review: NotRequired[str | None]
    user_watched: bool
    user_on_watchlist: bool
    user_liked: bool
    created_at: str  # ISO datetime string
    updated_at: str  # ISO datetime string


class Genre(TypedDict):
    """Movie genre data"""
    id: int
    name: str


class CastMember(TypedDict):
    """Movie cast member data"""
    id: int
    name: str
    character: str
    profile_path: NotRequired[str]
    order: NotRequired[int]


class CrewMember(TypedDict):
    """Movie crew member data"""
    id: int
    name: str
    job: str
    department: NotRequired[str]
    profile_path: NotRequired[str]


class ProductionCompany(TypedDict):
    """Movie production company data"""
    id: int
    name: str
    logo_path: NotRequired[str]
    origin_country: str


class Movie(TypedDict):
    """
    Core Movie data structure
    Matches TMDB API responses, backend serializer output, and TypeScript Movie interface
    """
    tmdb_id: int
    title: str
    release_date: str  # YYYY-MM-DD format
    runtime: NotRequired[int]
    overview: NotRequired[str]  # Only present in detail views
    poster_path: str | None
    backdrop_path: NotRequired[str | None]
    vote_average: float
    vote_count: NotRequired[int]
    popularity: NotRequired[float]
    original_language: NotRequired[str]
    original_title: NotRequired[str]
    adult: NotRequired[bool]
    video: NotRequired[bool]

    # Relational data (may be included via serializer in detail views)
    genres: NotRequired[list[Genre]]
    cast: NotRequired[list[CastMember]]
    crew: NotRequired[list[CrewMember]]
    production_companies: NotRequired[list[ProductionCompany]]

    # User-specific data (only present when user is authenticated)
    user_movie_data: NotRequired[UserMovieData | None]


# Request Parameter Types
class UserMovieFilter(TypedDict):
    """User-specific movie filtering options"""
    watched: NotRequired[bool]
    on_watchlist: NotRequired[bool]
    liked: NotRequired[bool]
    rated: NotRequired[bool]


class MovieListParams(TypedDict):
    """
    Movie list/filter request parameters
    Used for search, filtering, and pagination
    """
    page: NotRequired[int]
    per_page: NotRequired[int]
    query: NotRequired[str]
    genres: NotRequired[list[int]]
    min_year: NotRequired[int]
    max_year: NotRequired[int]
    min_rating: NotRequired[float]
    max_rating: NotRequired[float]
    min_runtime: NotRequired[int]
    max_runtime: NotRequired[int]
    sort_by: NotRequired[Literal['title', 'release_date', 'vote_average', 'popularity', 'runtime']]
    sort_order: NotRequired[Literal['asc', 'desc']]
    include_adult: NotRequired[bool]
    user_filters: NotRequired[UserMovieFilter]


# User Movie Interaction Request Types
class RateMovieRequest(TypedDict):
    """Request payload for rating a movie"""
    rating: int  # 1-10 scale
    review: NotRequired[str]


class WatchlistRequest(TypedDict):
    """Request payload for watchlist operations"""
    on_watchlist: bool


class LikeMovieRequest(TypedDict):
    """Request payload for liking a movie"""
    liked: bool


class WatchedMovieRequest(TypedDict):
    """Request payload for marking movie as watched"""
    watched: bool


# TMDB-specific Response Types (for internal service use)
class TMDBMovieResponse(TypedDict):
    """TMDB API movie response structure (subset of fields we use)"""
    id: int
    title: str
    release_date: NotRequired[str]
    runtime: NotRequired[int]
    overview: NotRequired[str]
    poster_path: str | None
    backdrop_path: str | None
    vote_average: float
    vote_count: int
    popularity: float
    original_language: str
    original_title: str
    adult: bool
    video: bool
    genres: NotRequired[list[Genre]]


class TMDBSearchResponse(TypedDict):
    """TMDB API paginated search response structure"""
    page: int
    results: list[TMDBMovieResponse]
    total_pages: int
    total_results: int


class TMDBErrorResponse(TypedDict):
    """TMDB API error response structure"""
    success: bool
    status_code: int
    status_message: str


class Keyword(TypedDict):
    """TMDB keyword data"""
    id: int
    name: str


class TMDBKeywordSearchResponse(TypedDict):
    """TMDB API keyword search response structure"""
    page: int
    results: list[Keyword]
    total_pages: int
    total_results: int


class Person(TypedDict):
    """TMDB person data"""
    id: int
    name: str
    profile_path: NotRequired[str | None]
    known_for_department: NotRequired[str]
    popularity: NotRequired[float]


class TMDBPersonSearchResponse(TypedDict):
    """TMDB API person search response structure"""
    page: int
    results: list[Person]
    total_pages: int
    total_results: int