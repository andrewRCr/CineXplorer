"""
Unit tests for TMDB response factory functions.

Tests the data extraction and transformation logic in response_factories.py:
- Error handling functions (handle_tmdb_api_error, get_validated_response)
- Movie schema factories (create_movie_base_from_tmdb, create_movie_detail_from_tmdb)
- Paginated response factories
- Genre list factory
- Certification extraction helper
"""
from __future__ import annotations

from unittest.mock import Mock

import pytest
from core.services.api_response import ApiResponse
from core.tmdb_models.tmdb_responses import (
    TMDBCountryReleases,
    TMDBReleaseDate,
    TMDBReleaseDatesResponse,
)
from movie.schemas import (
    GenreSchema,
    MovieBaseSchema,
    MovieDetailSchema,
    PaginatedKeywordResponseSchema,
    PaginatedMovieResponseSchema,
    PaginatedPersonResponseSchema,
)
from movie.services.tmdb_api_boundary.response_factories import (
    create_genre_list_from_tmdb,
    create_movie_base_from_tmdb,
    create_movie_detail_from_tmdb,
    create_paginated_keyword_response_from_tmdb,
    create_paginated_movie_response_from_tmdb,
    create_paginated_person_response_from_tmdb,
    extract_us_certification,
    get_validated_response,
    handle_tmdb_api_error,
)
from ninja.errors import HttpError

# ============================================================================
# extract_us_certification Tests
# ============================================================================


class TestExtractUsCertification:
    """Tests for US certification extraction from TMDB release_dates."""

    def test_returns_none_when_release_dates_is_none(self) -> None:
        """Should return None when no release_dates provided."""
        result = extract_us_certification(None)
        assert result is None

    def test_returns_none_when_no_results(self) -> None:
        """Should return None when results array is empty."""
        release_dates = TMDBReleaseDatesResponse(results=[])
        result = extract_us_certification(release_dates)
        assert result is None

    def test_returns_none_when_no_us_entry(self) -> None:
        """Should return None when no US country entry exists."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='GB',
                    release_dates=[
                        TMDBReleaseDate(certification='15', type=3)
                    ]
                ),
                TMDBCountryReleases(
                    iso_3166_1='FR',
                    release_dates=[
                        TMDBReleaseDate(certification='12', type=3)
                    ]
                ),
            ]
        )
        result = extract_us_certification(release_dates)
        assert result is None

    def test_returns_theatrical_certification_when_available(self) -> None:
        """Should return theatrical (type 3) certification when present."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[
                        TMDBReleaseDate(certification='PG', type=2),  # Limited theatrical
                        TMDBReleaseDate(certification='PG-13', type=3),  # Theatrical
                        TMDBReleaseDate(certification='R', type=4),  # Digital
                    ]
                )
            ]
        )
        result = extract_us_certification(release_dates)
        assert result == 'PG-13'

    def test_prefers_theatrical_over_other_types(self) -> None:
        """Should prefer type 3 (theatrical) even if other types come first."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[
                        TMDBReleaseDate(certification='R', type=1),  # Premiere
                        TMDBReleaseDate(certification='PG-13', type=3),  # Theatrical
                    ]
                )
            ]
        )
        result = extract_us_certification(release_dates)
        assert result == 'PG-13'

    def test_falls_back_to_first_valid_cert_when_no_theatrical(self) -> None:
        """Should return first valid certification when no theatrical exists."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[
                        TMDBReleaseDate(certification='', type=1),  # Empty
                        TMDBReleaseDate(certification='R', type=4),  # Digital
                        TMDBReleaseDate(certification='PG-13', type=5),  # Physical
                    ]
                )
            ]
        )
        result = extract_us_certification(release_dates)
        assert result == 'R'

    def test_returns_none_when_all_certifications_empty(self) -> None:
        """Should return None when all certification strings are empty."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[
                        TMDBReleaseDate(certification='', type=3),
                        TMDBReleaseDate(certification='', type=4),
                    ]
                )
            ]
        )
        result = extract_us_certification(release_dates)
        assert result is None

    def test_returns_none_when_us_entry_has_no_releases(self) -> None:
        """Should return None when US entry exists but has no release_dates."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[]
                )
            ]
        )
        result = extract_us_certification(release_dates)
        assert result is None

    def test_finds_us_entry_among_multiple_countries(self) -> None:
        """Should correctly find US entry when mixed with other countries."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='GB',
                    release_dates=[TMDBReleaseDate(certification='15', type=3)]
                ),
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[TMDBReleaseDate(certification='R', type=3)]
                ),
                TMDBCountryReleases(
                    iso_3166_1='AU',
                    release_dates=[TMDBReleaseDate(certification='MA15+', type=3)]
                ),
            ]
        )
        result = extract_us_certification(release_dates)
        assert result == 'R'

    @pytest.mark.parametrize('rating', ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'])
    def test_returns_all_mpaa_ratings_correctly(self, rating: str) -> None:
        """Should correctly return all standard MPAA ratings."""
        release_dates = TMDBReleaseDatesResponse(
            results=[
                TMDBCountryReleases(
                    iso_3166_1='US',
                    release_dates=[TMDBReleaseDate(certification=rating, type=3)]
                )
            ]
        )
        result = extract_us_certification(release_dates)
        assert result == rating


# ============================================================================
# Error Handling Tests
# ============================================================================


class TestHandleTmdbApiError:
    """Tests for TMDB API error handling and HTTP status code mapping."""

    def test_raises_404_for_not_found(self) -> None:
        """Should raise HttpError(404) for TMDB 404 responses."""
        api_response = ApiResponse(status_code=404, data=None, error_message="Not found")

        with pytest.raises(HttpError) as exc_info:
            handle_tmdb_api_error(api_response, operation="test_operation")

        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.message).lower()

    def test_raises_429_for_rate_limit(self) -> None:
        """Should raise HttpError(429) for TMDB rate limit responses."""
        api_response = ApiResponse(status_code=429, data=None, error_message="Rate limited")

        with pytest.raises(HttpError) as exc_info:
            handle_tmdb_api_error(api_response, operation="test_operation")

        assert exc_info.value.status_code == 429
        assert "rate limit" in str(exc_info.value.message).lower()

    def test_raises_400_for_client_errors(self) -> None:
        """Should raise HttpError(400) for 4xx client errors (except 404, 429)."""
        api_response = ApiResponse(status_code=422, data=None, error_message="Validation error")

        with pytest.raises(HttpError) as exc_info:
            handle_tmdb_api_error(api_response, operation="test_operation")

        assert exc_info.value.status_code == 400

    def test_raises_500_for_server_errors(self) -> None:
        """Should raise HttpError(500) for 5xx server errors."""
        api_response = ApiResponse(status_code=503, data=None, error_message="Service unavailable")

        with pytest.raises(HttpError) as exc_info:
            handle_tmdb_api_error(api_response, operation="test_operation")

        assert exc_info.value.status_code == 500


class TestGetValidatedResponse:
    """Tests for API response validation and data extraction."""

    def test_returns_data_on_success(self) -> None:
        """Should return JSON data when API response is successful."""
        expected_data = {'id': 123, 'title': 'Test Movie'}
        api_response = ApiResponse(status_code=200, data=expected_data)

        result = get_validated_response(api_response, operation="test_operation")

        assert result == expected_data

    def test_raises_error_on_api_failure(self) -> None:
        """Should raise HttpError when API response indicates failure."""
        api_response = ApiResponse(status_code=404, data=None, error_message="Not found")

        with pytest.raises(HttpError) as exc_info:
            get_validated_response(api_response, operation="test_operation")

        assert exc_info.value.status_code == 404

    def test_raises_500_when_data_is_empty(self) -> None:
        """Should raise HttpError(500) when successful response has no data."""
        # Mock a response that is_success() but returns None from get_json_data()
        api_response = Mock(spec=ApiResponse)
        api_response.is_success.return_value = True
        api_response.get_json_data.return_value = None
        api_response.correlation_id = 'test-123'

        with pytest.raises(HttpError) as exc_info:
            get_validated_response(api_response, operation="test_operation")

        assert exc_info.value.status_code == 500


# ============================================================================
# Movie Schema Factory Tests
# ============================================================================


class TestCreateMovieBaseFromTmdb:
    """Tests for MovieBaseSchema creation from TMDB data."""

    def test_creates_schema_with_valid_data(self) -> None:
        """Should create MovieBaseSchema from valid TMDB movie data."""
        from datetime import date

        tmdb_data = {
            'id': 550,
            'title': 'Fight Club',
            'poster_path': '/poster.jpg',
            'release_date': '1999-10-15',
            'vote_average': 8.4,
            'vote_count': 25000,
            'genre_ids': [18, 53],
            'overview': 'An insomniac office worker...',
        }

        result = create_movie_base_from_tmdb(tmdb_data)

        assert isinstance(result, MovieBaseSchema)
        assert result.tmdb_id == 550
        assert result.title == 'Fight Club'
        assert result.release_date == date(1999, 10, 15)
        assert result.vote_average == 8.4

    def test_normalizes_empty_string_release_date_to_none(self) -> None:
        """Should convert empty string release_date to None (TMDB API quirk)."""
        tmdb_data = {
            'id': 999,
            'title': 'Unreleased Movie',
            'poster_path': '/poster.jpg',
            'release_date': '',  # Empty string from TMDB
            'vote_average': 0.0,
            'vote_count': 0,
            'genre_ids': [28],
            'overview': 'Coming soon...',
        }

        result = create_movie_base_from_tmdb(tmdb_data)

        assert result.release_date is None

    def test_normalizes_whitespace_release_date_to_none(self) -> None:
        """Should convert whitespace-only release_date to None."""
        tmdb_data = {
            'id': 998,
            'title': 'Another Movie',
            'release_date': '   ',  # Whitespace only
            'vote_average': 5.0,
        }

        result = create_movie_base_from_tmdb(tmdb_data)

        assert result.release_date is None

    def test_handles_missing_optional_fields(self) -> None:
        """Should handle missing optional fields gracefully."""
        tmdb_data = {
            'id': 100,
            'title': 'Minimal Movie',
            # No poster_path, release_date, overview, etc.
        }

        result = create_movie_base_from_tmdb(tmdb_data)

        assert result.tmdb_id == 100
        assert result.title == 'Minimal Movie'

    def test_raises_http_error_on_invalid_data(self) -> None:
        """Should raise HttpError when data validation fails."""
        tmdb_data = {
            # Missing required 'id' field
            'title': 'Invalid Movie',
        }

        with pytest.raises(HttpError) as exc_info:
            create_movie_base_from_tmdb(tmdb_data)

        assert exc_info.value.status_code == 500


class TestCreateMovieDetailFromTmdb:
    """Tests for MovieDetailSchema creation from TMDB data."""

    def test_creates_schema_with_movie_data_only(self) -> None:
        """Should create MovieDetailSchema from movie data without credits."""
        movie_data = {
            'id': 550,
            'title': 'Fight Club',
            'poster_path': '/poster.jpg',
            'release_date': '1999-10-15',
            'vote_average': 8.4,
            'runtime': 139,
            'overview': 'An insomniac office worker...',
            'genres': [
                {'id': 18, 'name': 'Drama'},
                {'id': 53, 'name': 'Thriller'},
            ],
            'production_companies': [
                {'id': 508, 'name': 'Regency', 'logo_path': '/logo.png', 'origin_country': 'US'},
            ],
        }

        result = create_movie_detail_from_tmdb(movie_data)

        assert isinstance(result, MovieDetailSchema)
        assert result.tmdb_id == 550
        assert result.runtime == 139
        assert len(result.genres) == 2
        assert result.genres[0].name == 'Drama'
        assert len(result.production_companies) == 1

    def test_creates_schema_with_credits_data(self) -> None:
        """Should create MovieDetailSchema including cast and crew."""
        movie_data: dict[str, object] = {
            'id': 550,
            'title': 'Fight Club',
            'release_date': '1999-10-15',
            'vote_average': 8.4,
            'runtime': 139,
            'overview': 'Test overview',
            'genres': [],
            'production_companies': [],
        }
        credits_data: dict[str, object] = {
            'cast': [
                {
                    'id': 819,
                    'name': 'Edward Norton',
                    'character': 'The Narrator',
                    'profile_path': '/profile.jpg',
                    'cast_id': 1,
                    'credit_id': 'abc123',
                    'order': 0,
                },
            ],
            'crew': [
                {
                    'id': 7467,
                    'name': 'David Fincher',
                    'job': 'Director',
                    'department': 'Directing',
                    'profile_path': '/director.jpg',
                    'credit_id': 'def456',
                },
            ],
        }

        result = create_movie_detail_from_tmdb(movie_data, credits_data)

        assert len(result.cast) == 1
        assert result.cast[0].name == 'Edward Norton'
        assert result.cast[0].character == 'The Narrator'
        assert len(result.crew) == 1
        assert result.crew[0].name == 'David Fincher'
        assert result.crew[0].job == 'Director'

    def test_normalizes_empty_release_date(self) -> None:
        """Should convert empty string release_date to None."""
        movie_data: dict[str, object] = {
            'id': 999,
            'title': 'Upcoming Film',
            'release_date': '',
            'vote_average': 0.0,
            'runtime': 0,
            'overview': '',
            'genres': [],
            'production_companies': [],
        }

        result = create_movie_detail_from_tmdb(movie_data)

        assert result.release_date is None

    def test_handles_null_runtime(self) -> None:
        """Should default runtime to 0 when null."""
        movie_data: dict[str, object] = {
            'id': 100,
            'title': 'No Runtime',
            'release_date': '2023-01-01',
            'vote_average': 7.0,
            'runtime': None,
            'overview': 'Test',
            'genres': [],
            'production_companies': [],
        }

        result = create_movie_detail_from_tmdb(movie_data)

        assert result.runtime == 0

    def test_extracts_us_certification_from_release_dates(self) -> None:
        """Should extract US certification when release_dates included."""
        movie_data: dict[str, object] = {
            'id': 550,
            'title': 'Fight Club',
            'release_date': '1999-10-15',
            'vote_average': 8.4,
            'runtime': 139,
            'overview': 'Test',
            'genres': [],
            'production_companies': [],
            'release_dates': {
                'results': [
                    {
                        'iso_3166_1': 'US',
                        'release_dates': [
                            {'certification': 'R', 'type': 3, 'release_date': '', 'note': ''},
                        ],
                    },
                ],
            },
        }

        result = create_movie_detail_from_tmdb(movie_data)

        assert result.us_certification == 'R'


# ============================================================================
# Paginated Response Factory Tests
# ============================================================================


class TestCreatePaginatedMovieResponseFromTmdb:
    """Tests for paginated movie response creation."""

    def test_creates_paginated_response(self) -> None:
        """Should create PaginatedMovieResponseSchema from TMDB response."""
        tmdb_response: dict[str, object] = {
            'page': 1,
            'total_pages': 5,
            'total_results': 100,
            'results': [
                {
                    'id': 550,
                    'title': 'Fight Club',
                    'release_date': '1999-10-15',
                    'vote_average': 8.4,
                    'vote_count': 25000,
                    'poster_path': '/poster.jpg',
                    'genre_ids': [18],
                    'overview': 'Test',
                },
                {
                    'id': 680,
                    'title': 'Pulp Fiction',
                    'release_date': '1994-09-10',
                    'vote_average': 8.5,
                    'vote_count': 24000,
                    'poster_path': '/pulp.jpg',
                    'genre_ids': [53],
                    'overview': 'Test',
                },
            ],
        }

        result = create_paginated_movie_response_from_tmdb(tmdb_response)

        assert isinstance(result, PaginatedMovieResponseSchema)
        assert result.page == 1
        assert result.total_pages == 5
        assert result.total_results == 100
        assert len(result.results) == 2
        assert result.results[0].tmdb_id == 550
        assert result.results[1].tmdb_id == 680

    def test_handles_empty_results(self) -> None:
        """Should handle empty results array gracefully."""
        tmdb_response: dict[str, object] = {
            'page': 1,
            'total_pages': 0,
            'total_results': 0,
            'results': [],
        }

        result = create_paginated_movie_response_from_tmdb(tmdb_response)

        assert result.page == 1
        assert result.total_results == 0
        assert len(result.results) == 0


class TestCreatePaginatedKeywordResponseFromTmdb:
    """Tests for paginated keyword response creation."""

    def test_creates_paginated_keyword_response(self) -> None:
        """Should create PaginatedKeywordResponseSchema from TMDB response."""
        tmdb_response: dict[str, object] = {
            'page': 1,
            'total_pages': 1,
            'total_results': 2,
            'results': [
                {'id': 9715, 'name': 'superhero'},
                {'id': 9717, 'name': 'based on comic'},
            ],
        }

        result = create_paginated_keyword_response_from_tmdb(tmdb_response)

        assert isinstance(result, PaginatedKeywordResponseSchema)
        assert len(result.results) == 2
        assert result.results[0].name == 'superhero'


class TestCreatePaginatedPersonResponseFromTmdb:
    """Tests for paginated person response creation."""

    def test_creates_paginated_person_response(self) -> None:
        """Should create PaginatedPersonResponseSchema from TMDB response."""
        tmdb_response: dict[str, object] = {
            'page': 1,
            'total_pages': 1,
            'total_results': 1,
            'results': [
                {
                    'id': 819,
                    'name': 'Edward Norton',
                    'profile_path': '/profile.jpg',
                    'known_for_department': 'Acting',
                },
            ],
        }

        result = create_paginated_person_response_from_tmdb(tmdb_response)

        assert isinstance(result, PaginatedPersonResponseSchema)
        assert len(result.results) == 1
        assert result.results[0].name == 'Edward Norton'


# ============================================================================
# Genre List Factory Tests
# ============================================================================


class TestCreateGenreListFromTmdb:
    """Tests for genre list creation."""

    def test_creates_genre_list(self) -> None:
        """Should create list of GenreSchema from TMDB genre response."""
        tmdb_response: dict[str, object] = {
            'genres': [
                {'id': 28, 'name': 'Action'},
                {'id': 12, 'name': 'Adventure'},
                {'id': 16, 'name': 'Animation'},
            ],
        }

        result = create_genre_list_from_tmdb(tmdb_response)

        assert len(result) == 3
        assert all(isinstance(g, GenreSchema) for g in result)
        assert result[0].id == 28
        assert result[0].name == 'Action'

    def test_handles_empty_genres(self) -> None:
        """Should return empty list when no genres."""
        tmdb_response: dict[str, object] = {'genres': []}

        result = create_genre_list_from_tmdb(tmdb_response)

        assert result == []
