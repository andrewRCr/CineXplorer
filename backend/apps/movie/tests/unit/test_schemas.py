"""Integration tests for HTTP → BrowseServiceParams transformation.

Tests the transform_to_service_params() function that bridges API requests to
service method calls. This is critical for the two-pass filtering architecture where:
1. TMDB API params filter millions → thousands (primary filter)
2. Backend filter params catch bad data (second-pass data hygiene)

The transformer must extract both types of parameters from the same input fields:
- release_date_gte/lte → Both TMDB params AND year_min/max for backend filtering
- vote_average_gte/lte → Both TMDB params AND rating_min/max for backend filtering

Test Strategy: These tests validate the HTTP schema → BrowseServiceParams transformation
to ensure both TMDB and backend filtering parameters are correctly extracted.
"""

from __future__ import annotations

from apps.movie.schemas import MovieDiscoverFilterSchema
from apps.movie.services.api_boundary import transform_to_service_params


class TestMovieDiscoverFilterSchemaParameterExtraction:
    """Test transformer extracts both TMDB and backend filtering parameters.

    The transformer receives filter schema from the API and must produce two
    sets of parameters in BrowseServiceParams:
    1. TMDB API parameters (for primary filtering)
    2. Backend filtering parameters (for second-pass data hygiene)

    Example: release_date_gte="2020-01-01" should produce:
    - release_date_gte: "2020-01-01" (TMDB API param)
    - year_min: 2020 (backend filtering param)
    """

    def test_extracts_year_range_from_release_dates_both_bounds(self) -> None:
        """Test schema extracts year_min and year_max from release_date_gte/lte.

        When user requests movies from 2020-2029, the schema must:
        1. Pass release_date params to TMDB API (primary filter)
        2. Extract year range for backend filtering (data hygiene)

        This test validates the critical missing functionality that caused
        the "1979 movies in 1980-1983 results" bug.
        """
        # Arrange: Create schema with year range filter
        schema = MovieDiscoverFilterSchema(
            release_date_gte="2020-01-01", release_date_lte="2029-12-31"
        )

        # Act: Extract service parameters
        params = transform_to_service_params(schema)

        # Assert: Both TMDB and backend parameters extracted
        # TMDB API parameters (primary filter)
        assert params.release_date_gte == "2020-01-01"
        assert params.release_date_lte == "2029-12-31"

        # Backend filtering parameters (second-pass data hygiene)
        assert params.year_min is not None, "Schema must extract year_min for backend filtering"
        assert params.year_max is not None, "Schema must extract year_max for backend filtering"
        assert params.year_min == 2020
        assert params.year_max == 2029

    def test_extracts_year_min_only_from_release_date_gte(self) -> None:
        """Test schema extracts year_min when only release_date_gte provided.

        User filter: "Movies from 2020 onwards"
        Expected: year_min=2020, year_max not set
        """
        # Arrange: Only minimum date provided
        schema = MovieDiscoverFilterSchema(release_date_gte="2020-01-01")

        # Act
        params = transform_to_service_params(schema)

        # Assert: Extract year_min, year_max not present
        assert params.release_date_gte == "2020-01-01"
        assert params.year_min is not None
        assert params.year_min == 2020
        assert params.year_max is None  # Only min provided

    def test_extracts_year_max_only_from_release_date_lte(self) -> None:
        """Test schema extracts year_max when only release_date_lte provided.

        User filter: "Movies up to 2023"
        Expected: year_max=2023, year_min not set
        """
        # Arrange: Only maximum date provided
        schema = MovieDiscoverFilterSchema(release_date_lte="2023-12-31")

        # Act
        params = transform_to_service_params(schema)

        # Assert: Extract year_max, year_min not present
        assert params.release_date_lte == "2023-12-31"
        assert params.year_max is not None
        assert params.year_max == 2023
        assert params.year_min is None  # Only max provided

    def test_extracts_rating_range_from_vote_average_both_bounds(self) -> None:
        """Test schema extracts rating_min and rating_max from vote_average_gte/lte.

        When user requests movies rated 7.0-9.0, the schema must:
        1. Pass vote_average params to TMDB API (primary filter)
        2. Extract rating range for backend filtering (data hygiene)

        Backend filtering catches movies with placeholder 0.0 ratings and
        other TMDB data quality issues.
        """
        # Arrange: Create schema with rating range filter
        schema = MovieDiscoverFilterSchema(vote_average_gte=7.0, vote_average_lte=9.0)

        # Act
        params = transform_to_service_params(schema)

        # Assert: Both TMDB and backend parameters extracted
        # TMDB API parameters (primary filter)
        assert params.vote_average_gte == 7.0
        assert params.vote_average_lte == 9.0

        # Backend filtering parameters (second-pass data hygiene)
        assert params.rating_min is not None, (
            "Schema must extract rating_min for backend filtering"
        )
        assert params.rating_max is not None, (
            "Schema must extract rating_max for backend filtering"
        )
        assert params.rating_min == 7.0
        assert params.rating_max == 9.0

    def test_extracts_rating_min_only_from_vote_average_gte(self) -> None:
        """Test schema extracts rating_min when only vote_average_gte provided.

        User filter: "Movies rated 7.5+"
        Expected: rating_min=7.5, rating_max not set
        """
        # Arrange: Only minimum rating provided
        schema = MovieDiscoverFilterSchema(vote_average_gte=7.5)

        # Act
        params = transform_to_service_params(schema)

        # Assert: Extract rating_min, rating_max not present
        assert params.vote_average_gte == 7.5
        assert params.rating_min is not None
        assert params.rating_min == 7.5
        assert params.rating_max is None  # Only min provided

    def test_extracts_rating_max_only_from_vote_average_lte(self) -> None:
        """Test schema extracts rating_max when only vote_average_lte provided.

        User filter: "Movies rated up to 8.0"
        Expected: rating_max=8.0, rating_min not set
        """
        # Arrange: Only maximum rating provided
        schema = MovieDiscoverFilterSchema(vote_average_lte=8.0)

        # Act
        params = transform_to_service_params(schema)

        # Assert: Extract rating_max, rating_min not present
        assert params.vote_average_lte == 8.0
        assert params.rating_max is not None
        assert params.rating_max == 8.0
        assert params.rating_min is None  # Only max provided

    def test_extracts_combined_year_and_rating_filters(self) -> None:
        """Test schema extracts both year and rating filters simultaneously.

        User filter: "Movies from 2020-2023 rated 7.5+"
        Expected: All four backend filter params extracted
        """
        # Arrange: Combined year and rating filters
        schema = MovieDiscoverFilterSchema(
            release_date_gte="2020-01-01", release_date_lte="2023-12-31", vote_average_gte=7.5
        )

        # Act
        params = transform_to_service_params(schema)

        # Assert: All TMDB and backend parameters extracted
        assert params.release_date_gte == "2020-01-01"
        assert params.release_date_lte == "2023-12-31"
        assert params.vote_average_gte == 7.5

        # Backend filtering parameters - all four should be present
        assert params.year_min == 2020
        assert params.year_max == 2023
        assert params.rating_min == 7.5
        assert params.rating_max is None  # Only min provided for rating

    def test_no_backend_params_when_no_filters_provided(self) -> None:
        """Test schema doesn't add backend filter params when no filters provided.

        When user doesn't apply filters, backend filtering should not activate.
        Only TMDB API params should be present.
        """
        # Arrange: Empty schema (no filters)
        schema = MovieDiscoverFilterSchema()

        # Act
        params = transform_to_service_params(schema)

        # Assert: No backend filtering parameters
        assert params.year_min is None
        assert params.year_max is None
        assert params.rating_min is None
        assert params.rating_max is None

    def test_handles_edge_case_year_extraction_from_dates(self) -> None:
        """Test year extraction handles various date formats correctly.

        TMDB dates are YYYY-MM-DD format. Year extraction should handle:
        - Start of year: "2020-01-01" → 2020
        - End of year: "2020-12-31" → 2020
        - Mid-year: "2020-06-15" → 2020
        """
        # Arrange: Various date formats
        schema = MovieDiscoverFilterSchema(
            release_date_gte="2020-06-15",  # Mid-year date
            release_date_lte="2023-03-20",  # Early year date
        )

        # Act
        params = transform_to_service_params(schema)

        # Assert: Years extracted correctly regardless of month/day
        assert params.year_min == 2020
        assert params.year_max == 2023

    def test_extracts_year_range_from_decade_filter(self) -> None:
        """Test decade filter maps to both TMDB and backend year params."""
        # Arrange
        schema = MovieDiscoverFilterSchema(decade="1990s")

        # Act
        params = transform_to_service_params(schema)

        # Assert: TMDB date range + backend year range
        assert params.release_date_gte == "1990-01-01"
        assert params.release_date_lte == "1999-12-31"
        assert params.year_min == 1990
        assert params.year_max == 1999

    def test_maintains_existing_tmdb_parameter_mappings(self) -> None:
        """Test that new backend param extraction doesn't break existing TMDB mappings.

        The schema must continue to map all existing TMDB API parameters
        correctly while adding new backend filtering parameters.
        """
        # Arrange: Schema with various TMDB parameters
        schema = MovieDiscoverFilterSchema(
            sort_by="popularity.desc",
            genres="28,12",
            year=2023,
            certification="PG-13",
            region="US",
            release_date_gte="2023-01-01",
            vote_average_gte=7.0,
        )

        # Act
        params = transform_to_service_params(schema)

        # Assert: All existing TMDB mappings still work
        assert params.sort_by == "popularity.desc"
        assert params.genres == "28,12"
        assert params.year == 2023
        assert params.certification == "PG-13"

        # AND new backend filtering params also present
        assert params.year_min == 2023
        assert params.rating_min == 7.0
