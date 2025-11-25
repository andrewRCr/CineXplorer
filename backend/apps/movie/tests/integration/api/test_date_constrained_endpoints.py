"""Integration tests for date-constrained movie endpoints.

Tests the thin wrapper pattern for now-playing and upcoming endpoints,
verifying filter support and preset enforcement per ADR-002.

**Test Organization:**
- Preset Verification: Verify presets are applied correctly (date ranges, release_type)
- Protected Key Tests: Verify user cannot override protected params
- Filter Passthrough: Verify non-protected filters work alongside presets
- Browse Endpoint: Verify browse has full user control (no presets)

"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest
from core.tests.test_helpers import HTTPStatus
from movie.tests.test_helpers import create_mock_paginated_response, create_tmdb_movie

if TYPE_CHECKING:
    from django.test import Client


pytestmark = pytest.mark.django_db


# =============================================================================
# Preset Verification Tests
# =============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_preset_includes_release_type(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Now-playing preset includes with_release_type for theatrical releases.

    The now-playing preset should filter for theatrical releases (types 2|3)
    to exclude digital-only premieres and limited releases.
    """
    movies = [
        create_tmdb_movie(
            tmdb_id=1,
            title="Theatrical Release",
            release_date="2025-10-15",
            vote_average=7.5,
            vote_count=1000,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    response = api_client.get("/api/movies/now-playing?page=1")

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB received with_release_type param
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert "with_release_type" in params
    # Types 2|3 = Theatrical + Theatrical (limited)
    assert params["with_release_type"] == "2|3"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_preset_includes_release_type(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Upcoming preset includes with_release_type for theatrical releases.

    The upcoming preset should filter for theatrical releases (types 2|3)
    to exclude digital-only premieres and limited releases.
    """
    movies = [
        create_tmdb_movie(
            tmdb_id=1,
            title="Future Theatrical",
            release_date="2025-12-15",
            vote_average=0.0,
            vote_count=0,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    response = api_client.get("/api/movies/upcoming?page=1")

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB received with_release_type param
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert "with_release_type" in params
    # Types 2|3 = Theatrical + Theatrical (limited)
    assert params["with_release_type"] == "2|3"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_preset_date_range_correct(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Now-playing preset uses correct date range (today-30 to today+5).

    Date range captures movies currently in theaters:
    - Start: 30 days ago (recent releases still showing)
    - End: 5 days in future (accounts for timezone and early screenings)
    """
    movies = [
        create_tmdb_movie(
            tmdb_id=1,
            title="In Theaters",
            release_date="2025-10-15",
            vote_average=7.5,
            vote_count=1000,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    response = api_client.get("/api/movies/now-playing?page=1")

    assert response.status_code == HTTPStatus.OK

    # Calculate expected date range
    today = datetime.now(tz=UTC).date()
    expected_min = today - timedelta(days=30)
    expected_max = today + timedelta(days=5)

    # Verify TMDB received correct date range
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert params["primary_release_date.gte"] == expected_min.isoformat()
    assert params["primary_release_date.lte"] == expected_max.isoformat()


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_preset_date_range_correct(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Upcoming preset uses correct date range (today+5 to today+65).

    Date range captures upcoming theatrical releases:
    - Start: 5 days from now (where now-playing ends)
    - End: 65 days from now (captures ~2 months of upcoming releases)
    """
    movies = [
        create_tmdb_movie(
            tmdb_id=1,
            title="Coming Soon",
            release_date="2025-12-15",
            vote_average=0.0,
            vote_count=0,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    response = api_client.get("/api/movies/upcoming?page=1")

    assert response.status_code == HTTPStatus.OK

    # Calculate expected date range
    today = datetime.now(tz=UTC).date()
    expected_min = today + timedelta(days=5)
    expected_max = today + timedelta(days=65)

    # Verify TMDB received correct date range
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert params["primary_release_date.gte"] == expected_min.isoformat()
    assert params["primary_release_date.lte"] == expected_max.isoformat()


# =============================================================================
# Protected Key Tests
# =============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_release_type_cannot_be_overridden(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Protected key: user cannot override with_release_type on now-playing.

    Even if user provides with_release_type in query params, the preset
    value should be used instead.
    """
    movies = [
        create_tmdb_movie(
            tmdb_id=1,
            title="Protected Release",
            release_date="2025-10-15",
            vote_average=7.5,
            vote_count=1000,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    # Try to override with_release_type (should be ignored)
    response = api_client.get("/api/movies/now-playing?page=1&with_release_type=1")

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB received preset value, NOT user value
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # Should be preset "2|3", not user-provided "1"
    assert params["with_release_type"] == "2|3"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_release_type_cannot_be_overridden(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Protected key: user cannot override with_release_type on upcoming.

    Even if user provides with_release_type in query params, the preset
    value should be used instead.
    """
    movies = [
        create_tmdb_movie(
            tmdb_id=1,
            title="Protected Future",
            release_date="2025-12-15",
            vote_average=0.0,
            vote_count=0,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    # Try to override with_release_type (should be ignored)
    response = api_client.get("/api/movies/upcoming?page=1&with_release_type=4")

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB received preset value, NOT user value
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # Should be preset "2|3", not user-provided "4"
    assert params["with_release_type"] == "2|3"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_date_preset_cannot_be_overridden(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Protected key: user cannot override date range on now-playing."""
    movies = [
        create_tmdb_movie(
            tmdb_id=800,
            title="Protected Movie",
            release_date="2025-10-25",
            vote_average=7.0,
            vote_count=1000,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    # Try to override date range (should be ignored)
    response = api_client.get(
        "/api/movies/now-playing?page=1&release_date_gte=2020-01-01&release_date_lte=2020-12-31"
    )

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB was called with preset dates, NOT user-provided dates
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # The preset dates should be recent (today - 30 days to today + 5 days)
    # NOT the 2020 dates the user tried to provide
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    # Verify dates are NOT 2020 (protected keys worked)
    assert not params["primary_release_date.gte"].startswith("2020")
    assert not params["primary_release_date.lte"].startswith("2020")


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_date_preset_cannot_be_overridden(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Protected key: user cannot override date range on upcoming."""
    movies = [
        create_tmdb_movie(
            tmdb_id=900,
            title="Future Protected",
            release_date="2025-11-30",
            vote_average=6.5,
            vote_count=50,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    # Try to override date range (should be ignored)
    response = api_client.get(
        "/api/movies/upcoming?page=1&release_date_gte=2020-01-01&release_date_lte=2020-12-31"
    )

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB was called with preset dates, NOT user-provided dates
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # The preset dates should be future (today + 5 days to today + 65 days)
    # NOT the 2020 dates the user tried to provide
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    # Verify dates are NOT 2020 (protected keys worked)
    assert not params["primary_release_date.gte"].startswith("2020")
    assert not params["primary_release_date.lte"].startswith("2020")


# =============================================================================
# Filter Passthrough Tests
# =============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_now_playing_accepts_genre_filter(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Now-playing endpoint accepts genre filter alongside presets."""
    movies = [
        create_tmdb_movie(
            tmdb_id=550,
            title="Fight Club",
            release_date="2025-10-15",
            vote_average=8.4,
            vote_count=5000,
            genre_ids=[28, 18],
        ),
        create_tmdb_movie(
            tmdb_id=551,
            title="Action Movie",
            release_date="2025-10-20",
            vote_average=7.5,
            vote_count=3000,
            genre_ids=[28],
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=2,
    )

    response = api_client.get("/api/movies/now-playing?page=1&with_genres=28")

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data["results"]) == 2

    # Verify TMDB received genre filter AND preset params
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert params["with_genres"] == "28"
    assert "primary_release_date.gte" in params  # Preset still applied
    assert "with_release_type" in params  # Preset still applied


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_upcoming_accepts_rating_filter(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Upcoming endpoint accepts rating filter alongside presets."""
    movies = [
        create_tmdb_movie(
            tmdb_id=600,
            title="Upcoming Blockbuster",
            release_date="2025-11-15",
            vote_average=8.0,
            vote_count=100,
        ),
        create_tmdb_movie(
            tmdb_id=601,
            title="Future Hit",
            release_date="2025-11-20",
            vote_average=7.8,
            vote_count=50,
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=2,
    )

    response = api_client.get("/api/movies/upcoming?page=1&vote_average_gte=7.5")

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data["results"]) == 2

    # Verify TMDB received rating filter AND preset params
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert params["vote_average.gte"] == 7.5
    assert "primary_release_date.gte" in params  # Preset still applied
    assert "with_release_type" in params  # Preset still applied


# =============================================================================
# Browse Endpoint Tests
# =============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_accepts_all_filters(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Browse endpoint accepts all filter types (no presets)."""
    movies = [
        create_tmdb_movie(
            tmdb_id=700,
            title="Classic Movie",
            release_date="1999-03-31",
            vote_average=8.8,
            vote_count=25000,
            genre_ids=[18],
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    response = api_client.get(
        "/api/movies/browse?page=1&with_genres=18&sort_by=vote_average.desc"
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["title"] == "Classic Movie"

    # Verify TMDB received all filter params
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    assert params["with_genres"] == "18"
    assert params["sort_by"] == "vote_average.desc"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_allows_full_date_control(
    mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Browse endpoint: user has full control over date filters (no presets)."""
    movies = [
        create_tmdb_movie(
            tmdb_id=1000,
            title="2020 Movie",
            release_date="2020-06-15",
            vote_average=7.5,
            vote_count=5000,
            genre_ids=[18],
        ),
    ]
    mock_tmdb_get.return_value = create_mock_paginated_response(
        movies=movies,
        page=1,
        total_pages=1,
        total_results=1,
    )

    # User provides date range - should be respected (no presets)
    response = api_client.get(
        "/api/movies/browse?page=1&release_date_gte=2020-01-01&release_date_lte=2020-12-31"
    )

    assert response.status_code == HTTPStatus.OK

    # Verify TMDB was called with USER-PROVIDED dates
    assert mock_tmdb_get.call_count >= 1
    call_args = mock_tmdb_get.call_args_list[0]
    params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("params", {})

    # Browse has no protected keys, so user dates should be used
    assert params["primary_release_date.gte"] == "2020-01-01"
    assert params["primary_release_date.lte"] == "2020-12-31"
