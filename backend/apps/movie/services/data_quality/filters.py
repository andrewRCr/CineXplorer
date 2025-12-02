"""Data quality filters for TMDB API responses.

This module provides the filter implementations that apply policies defined in
policy.py. These are "second pass" filters applied to TMDB responses, distinct
from TMDB query parameters (first pass) in tmdb_api_boundary/query_params.py.

Architecture:
    policy.py - Defines "what" and "why" (rules, thresholds, rationale)
    filters.py - Implements "how" (list filtering operations)

TMDB API Quirks Addressed:
    - Year filtering: TMDB sometimes returns movies from wrong decades
    - Rating filtering: TMDB returns movies with 0.0 ratings despite filters
    - Language mislabeling: TMDB has films with wrong original_language tags
    - Runtime filtering: NOT SUPPORTED (requires individual movie detail fetches)

Filter Pipeline (applied in apply_data_quality_filters):
    1. Language script filter (on TMDBMovieBase, before conversion)
    2. Blacklist filtering (content policy - exclude specific TMDB IDs)
    3. Completeness filter (always enabled - basic quality requirement)
    4. Year filtering (always enabled for historical validation)
    5. Rating filtering with vote threshold
"""

from __future__ import annotations

import logging
import re

from core.tmdb_models.tmdb_responses import TMDBMovieBase
from django.core.cache import cache
from movie.schemas import MovieBaseSchema

from .policy import (
    EARLIEST_VALID_RELEASE_YEAR,
    VOTE_COUNT_THRESHOLD,
    CompletenessPolicy,
)

logger = logging.getLogger('cinexplorer.tmdb')

__all__ = [
    'LATIN_SCRIPT_LANGUAGES',
    'apply_data_quality_filters',
    'contains_non_latin_script',
    'filter_movies_by_blacklist',
    'filter_movies_by_completeness',
    'filter_movies_by_language_script',
    'filter_movies_by_rating',
    'filter_movies_by_year',
    'get_blacklisted_ids',
]

# ============================================================================
# Constants
# ============================================================================

# Cache settings for blacklisted movie IDs
BLACKLIST_CACHE_KEY = "movie_blacklist_ids"
BLACKLIST_CACHE_TIMEOUT = 300  # 5 minutes

# Languages that use Latin script. When filtering for these languages, we expect
# original_title to be in Latin characters. CJK characters indicate mislabeling.
# Matches frontend sortOptionFiltering.ts LATIN_SCRIPT_LANGUAGES.
LATIN_SCRIPT_LANGUAGES: frozenset[str] = frozenset([
    'en',  # English
    'es',  # Spanish
    'fr',  # French
    'de',  # German
    'it',  # Italian
    'pt',  # Portuguese
    'nl',  # Dutch
    'sv',  # Swedish
    'da',  # Danish
    'no',  # Norwegian
    'fi',  # Finnish
    'pl',  # Polish
    'tr',  # Turkish
    'id',  # Indonesian
    'ms',  # Malay
    'vi',  # Vietnamese (uses Latin with diacritics)
    'tl',  # Tagalog/Filipino
])

# Regex pattern for non-Latin scripts that indicate language mislabeling
# When a film is tagged as a Latin-script language (English, Spanish, etc.)
# but has these characters in original_title, it's likely mislabeled
_NON_LATIN_SCRIPT_PATTERN = re.compile(
    r'['
    # CJK (Chinese, Japanese, Korean)
    r'\u3000-\u303f'   # CJK Symbols and Punctuation
    r'\u3040-\u309f'   # Hiragana
    r'\u30a0-\u30ff'   # Katakana
    r'\u4e00-\u9fff'   # CJK Unified Ideographs
    r'\uac00-\ud7af'   # Hangul Syllables
    r'\uff00-\uffef'   # Halfwidth and Fullwidth Forms
    # South Asian scripts (Indic)
    r'\u0900-\u097f'   # Devanagari (Hindi, Marathi, Sanskrit)
    r'\u0980-\u09ff'   # Bengali
    r'\u0a80-\u0aff'   # Gujarati
    r'\u0b00-\u0b7f'   # Oriya
    r'\u0b80-\u0bff'   # Tamil
    r'\u0c00-\u0c7f'   # Telugu
    r'\u0c80-\u0cff'   # Kannada
    r'\u0d00-\u0d7f'   # Malayalam
    r'\u0d80-\u0dff'   # Sinhalese
    # Southeast Asian scripts
    r'\u0e00-\u0e7f'   # Thai
    r'\u0e80-\u0eff'   # Lao
    r'\u1000-\u109f'   # Myanmar (Burmese)
    # Middle Eastern scripts
    r'\u0600-\u06ff'   # Arabic
    r'\u0590-\u05ff'   # Hebrew
    # European non-Latin scripts
    r'\u0370-\u03ff'   # Greek
    r'\u0400-\u04ff'   # Cyrillic (Russian, Ukrainian, etc.)
    r'\u0530-\u058f'   # Armenian
    r'\u10a0-\u10ff'   # Georgian
    r']'
)


# ============================================================================
# Utility Functions
# ============================================================================


def contains_non_latin_script(text: str | None) -> bool:
    """Check if text contains non-Latin script characters.

    Used to detect language mislabeling - if a film is tagged as a Latin-script
    language but has non-Latin characters in its original_title, it's likely
    mislabeled (e.g., Thai film tagged as English).

    Detects scripts from major film industries:
    - CJK: Chinese, Japanese, Korean
    - South Asian: Devanagari, Bengali, Gujarati, Oriya, Tamil, Telugu, Kannada,
      Malayalam, Sinhalese
    - Southeast Asian: Thai, Lao, Myanmar
    - Middle Eastern: Arabic, Hebrew
    - European non-Latin: Greek, Cyrillic, Armenian, Georgian

    Args:
        text: String to check, or None

    Returns:
        True if text contains any non-Latin script characters, False otherwise
    """
    if not text:
        return False
    return bool(_NON_LATIN_SCRIPT_PATTERN.search(text))


# ============================================================================
# Orchestration Function (Main Entry Point)
# ============================================================================


def apply_data_quality_filters(
    movies: list[TMDBMovieBase],
    year_min: int | None = None,
    year_max: int | None = None,
    rating_min: float | None = None,
    rating_max: float | None = None,
    min_vote_count: int | None = VOTE_COUNT_THRESHOLD,
    language_filter: str | None = None,
) -> list[MovieBaseSchema]:
    """Apply all data quality filters to TMDB movie list.

    This is the main orchestration function for second-pass filtering. It converts
    TMDB response models to application schemas and applies the full filter pipeline.

    Args:
        movies: List of TMDBMovieBase objects from API response
        year_min: Minimum release year (inclusive), None for no lower bound
        year_max: Maximum release year (inclusive), None for no upper bound
        rating_min: Minimum rating (inclusive), None for no lower bound
        rating_max: Maximum rating (inclusive), None for no upper bound
        min_vote_count: Minimum vote count threshold. None to skip vote filtering.
            Default: VOTE_COUNT_THRESHOLD (3 - moderate tier)
        language_filter: Language code user filtered by (e.g., "en"). Used to detect
            mislabeled content where original_title script doesn't match language.

    Returns:
        Filtered list of MovieBaseSchema objects matching all criteria

    Pipeline Order:
        1. Language script filter - detect mislabeled content (runs on TMDBMovieBase)
        2. Blacklist filter - exclude problematic TMDB IDs
        3. Completeness filter - require poster, title, genres, overview
        4. Year filter - validate release year (includes 1888 historical check)
        5. Rating filter - apply rating range and vote count threshold
    """
    # Apply language script filter BEFORE conversion (needs original_title field)
    movies = filter_movies_by_language_script(movies, language_filter)

    # Convert TMDB models to schemas (map id → tmdb_id for compatibility)
    movie_schemas: list[MovieBaseSchema] = []
    for m in movies:
        movie_dict = m.model_dump()
        movie_dict['tmdb_id'] = movie_dict.pop('id')
        # Normalize empty string dates to None (TMDB API quirk)
        if movie_dict.get('release_date') == '':
            movie_dict['release_date'] = None
        movie_schemas.append(MovieBaseSchema.model_validate(movie_dict))

    # Apply filter pipeline
    movie_schemas = filter_movies_by_blacklist(movie_schemas)
    movie_schemas = filter_movies_by_completeness(movie_schemas)
    movie_schemas = filter_movies_by_year(movie_schemas, year_min, year_max)
    movie_schemas = filter_movies_by_rating(
        movie_schemas, rating_min, rating_max, min_vote_count=min_vote_count
    )

    return movie_schemas


# ============================================================================
# Language Script Filtering
# ============================================================================


def filter_movies_by_language_script(
    movies: list[TMDBMovieBase],
    language_filter: str | None,
) -> list[TMDBMovieBase]:
    """Filter out movies with mismatched language/script.

    TMDB has data quality issues where films are tagged with incorrect
    original_language values. This filter detects the common case: films
    tagged as Latin-script languages (English, Spanish, etc.) but with
    CJK characters in their original_title.

    This filter runs on TMDBMovieBase (before schema conversion) because
    original_title is not included in MovieBaseSchema.

    Args:
        movies: List of TMDBMovieBase objects from API response
        language_filter: Language code user filtered by (e.g., "en"), or None

    Returns:
        Filtered list excluding mislabeled content. If no language filter
        is active or the language is non-Latin, returns movies unchanged.

    Examples:
        - language_filter="en", original_title="호모 비디오쿠스" → FILTERED
        - language_filter="en", original_title="The Matrix" → KEPT
        - language_filter="ko", original_title="기생충" → KEPT (CJK expected)
        - language_filter=None → all movies KEPT (no filter active)
    """
    # No filter if language not specified or not a Latin-script language
    if not language_filter or language_filter not in LATIN_SCRIPT_LANGUAGES:
        return movies

    filtered: list[TMDBMovieBase] = []
    filtered_count = 0

    for movie in movies:
        # If original_title has non-Latin script but language filter is Latin, it's mislabeled
        if contains_non_latin_script(movie.original_title):
            filtered_count += 1
            logger.debug(
                f"Filtered mislabeled movie: {movie.id} '{movie.original_title}' "
                f"(tagged as '{movie.original_language}', filter='{language_filter}')"
            )
            continue
        filtered.append(movie)

    if filtered_count > 0:
        logger.info(
            f"Language script filter removed {filtered_count} mislabeled movies "
            f"(filter='{language_filter}')"
        )

    return filtered


# ============================================================================
# Blacklist Filtering
# ============================================================================


def get_blacklisted_ids() -> set[int]:
    """Get set of blacklisted TMDB movie IDs from cache or database.

    Results are cached for 5 minutes to avoid repeated database queries.
    """
    cached = cache.get(BLACKLIST_CACHE_KEY)
    if cached is not None:
        return cached

    from movie.models import BlacklistedMovie

    blacklist_ids = set(
        BlacklistedMovie.objects.values_list("tmdb_id", flat=True)
    )

    cache.set(BLACKLIST_CACHE_KEY, blacklist_ids, BLACKLIST_CACHE_TIMEOUT)
    logger.debug(f"Loaded {len(blacklist_ids)} blacklisted movie IDs from database")

    return blacklist_ids


def filter_movies_by_blacklist(
    movies: list[MovieBaseSchema],
) -> list[MovieBaseSchema]:
    """Filter out movies on the blacklist.

    Excludes movies whose TMDB IDs are in the BlacklistedMovie table.
    This is a content policy filter for problematic TMDB content.
    """
    blacklist_ids = get_blacklisted_ids()

    if not blacklist_ids:
        return movies

    return [m for m in movies if m.tmdb_id not in blacklist_ids]


# ============================================================================
# Completeness Filtering
# ============================================================================


def filter_movies_by_completeness(
    movies: list[MovieBaseSchema],
) -> list[MovieBaseSchema]:
    """Filter to movies meeting completeness requirements.

    Uses CompletenessPolicy to validate each movie has required display data.
    See policy.py CompletenessPolicy for validation rules and rationale.
    """
    return [m for m in movies if CompletenessPolicy.is_complete(m)]


# ============================================================================
# Year Filtering
# ============================================================================


def filter_movies_by_year(
    movies: list[MovieBaseSchema],
    year_min: int | None = None,
    year_max: int | None = None,
) -> list[MovieBaseSchema]:
    """Filter movies by release year range with historical validation.

    Always excludes movies before EARLIEST_VALID_RELEASE_YEAR (1888) regardless
    of user-specified filters. See policy.py for historical validation rationale.

    Args:
        movies: List of MovieBaseSchema objects to filter
        year_min: Minimum year (inclusive). None means no lower bound.
        year_max: Maximum year (inclusive). None means no upper bound.

    Returns:
        Filtered list. Movies without release_date are excluded.
    """
    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        if movie.release_date is None:
            continue

        movie_year = movie.release_date.year

        # Historical validation (always applied)
        if movie_year < EARLIEST_VALID_RELEASE_YEAR:
            continue

        # User-specified year range
        if year_min is not None and movie_year < year_min:
            continue
        if year_max is not None and movie_year > year_max:
            continue

        filtered.append(movie)

    return filtered


# ============================================================================
# Rating Filtering
# ============================================================================


def filter_movies_by_rating(
    movies: list[MovieBaseSchema],
    rating_min: float | None = None,
    rating_max: float | None = None,
    min_vote_count: int | None = VOTE_COUNT_THRESHOLD,
) -> list[MovieBaseSchema]:
    """Filter movies by rating range with vote count quality check.

    Vote count filtering can be applied independently of rating filtering
    for general browsing quality. See policy.py VoteCountPolicy for threshold
    bypass rules.

    Args:
        movies: List of MovieBaseSchema objects to filter
        rating_min: Minimum rating (inclusive, 0.0-10.0). None for no lower bound.
        rating_max: Maximum rating (inclusive, 0.0-10.0). None for no upper bound.
        min_vote_count: Minimum votes required. None to skip. Default: VOTE_COUNT_THRESHOLD.

    Returns:
        Filtered list matching all specified criteria.
    """
    # Fast path: no filters
    if rating_min is None and rating_max is None and min_vote_count is None:
        return movies

    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Vote count check (independent of rating filters)
        if min_vote_count is not None and (
            movie.vote_count is None or movie.vote_count < min_vote_count
        ):
            continue

        # Rating range checks (only if filters specified)
        if rating_min is not None or rating_max is not None:
            if movie.vote_average is None:
                continue

            if rating_min is not None and movie.vote_average < rating_min:
                continue
            if rating_max is not None and movie.vote_average > rating_max:
                continue

        filtered.append(movie)

    return filtered


# ============================================================================
# Runtime Filtering (NOT IMPLEMENTED)
# ============================================================================
# Runtime filtering is NOT implemented because TMDB discover/search endpoints
# do not return runtime data. Would require N separate API calls to movie
# details endpoint, which is impractical given rate limits (40 req/10 sec).
# See module docstring for more details.
# ============================================================================
