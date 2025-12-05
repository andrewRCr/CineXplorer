"""
Unit tests for TMDB response factory functions.

Tests the data extraction and transformation logic in response_factories.py,
particularly the extract_us_certification helper function.
"""
from __future__ import annotations

import pytest
from core.tmdb_models.tmdb_responses import (
    TMDBCountryReleases,
    TMDBReleaseDate,
    TMDBReleaseDatesResponse,
)
from movie.services.tmdb_api_boundary.response_factories import extract_us_certification

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
