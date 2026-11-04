"""Unit tests for buffer mechanism in TMDB result processing.

Tests the buffer logic that maintains consistent page sizes (20 results per page)
even when filtering removes some results. The buffer mechanism fetches additional
pages when needed to fill the target page size.
"""

from __future__ import annotations

from unittest.mock import Mock

from apps.core.services.api_response import ApiResponse
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.test_helpers import create_mock_paginated_response
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie


def test_buffer_mechanism_fetches_page_n_plus_1_when_under_threshold() -> None:
    """Test that service fetches page N+1 when filtered results fall below 20.

    Buffer threshold logic:
    - If filtered_count >= 20: Return first 20 (full page achieved)
    - If 10 <= filtered_count < 20: Fetch page N+1 to backfill
    - If filtered_count < 10: Return what we have (filter too restrictive)
    """
    # Arrange: Page 1 has 12 valid movies after filtering (needs buffer)
    mock_client = Mock(spec=["get"])

    # Page 1: 20 movies, but only 12 match filters
    page_1_movies = [
        # 12 movies matching 2022 + 7.5+ rating
        create_tmdb_movie(1, "Good A", "2022-01-01", 8.0),
        create_tmdb_movie(2, "Good B", "2022-01-01", 7.5),
        create_tmdb_movie(3, "Good C", "2022-01-01", 8.2),
        create_tmdb_movie(4, "Good D", "2022-01-01", 7.8),
        create_tmdb_movie(5, "Good E", "2022-01-01", 8.5),
        create_tmdb_movie(6, "Good F", "2022-01-01", 7.9),
        create_tmdb_movie(7, "Good G", "2022-01-01", 8.1),
        create_tmdb_movie(8, "Good H", "2022-01-01", 7.6),
        create_tmdb_movie(9, "Good I", "2022-01-01", 8.3),
        create_tmdb_movie(10, "Good J", "2022-01-01", 7.7),
        create_tmdb_movie(11, "Good K", "2022-01-01", 8.0),
        create_tmdb_movie(12, "Good L", "2022-01-01", 7.5),
        # 8 movies filtered out (wrong year or rating)
        create_tmdb_movie(101, "Wrong Year", "2021-01-01", 8.0),
        create_tmdb_movie(102, "Wrong Rating", "2022-01-01", 6.0),
        create_tmdb_movie(103, "Wrong Year 2", "2019-01-01", 7.5),
        create_tmdb_movie(104, "Wrong Rating 2", "2022-01-01", 5.5),
        create_tmdb_movie(105, "Wrong Year 3", "2023-01-01", 8.0),
        create_tmdb_movie(106, "Wrong Rating 3", "2022-01-01", 7.0),
        create_tmdb_movie(107, "Wrong Year 4", "2020-01-01", 7.5),
        create_tmdb_movie(108, "Wrong Rating 4", "2022-01-01", 6.5),
    ]

    # Page 2: 20 movies, 10 match filters (buffer page)
    page_2_movies = [
        # 10 movies matching filters (for buffer)
        create_tmdb_movie(21, "Buffer A", "2022-01-01", 8.0),
        create_tmdb_movie(22, "Buffer B", "2022-01-01", 7.5),
        create_tmdb_movie(23, "Buffer C", "2022-01-01", 8.2),
        create_tmdb_movie(24, "Buffer D", "2022-01-01", 7.8),
        create_tmdb_movie(25, "Buffer E", "2022-01-01", 8.5),
        create_tmdb_movie(26, "Buffer F", "2022-01-01", 7.9),
        create_tmdb_movie(27, "Buffer G", "2022-01-01", 8.1),
        create_tmdb_movie(28, "Buffer H", "2022-01-01", 7.6),
        # 10 movies filtered out
        *[create_tmdb_movie(200 + i, f"Buffer Wrong {i}", "2021-01-01", 6.0) for i in range(10)],
    ]

    page_1_response = create_mock_paginated_response(page_1_movies, page=1, total_pages=10)
    page_2_response = create_mock_paginated_response(page_2_movies, page=2, total_pages=10)

    # Mock client returns page 1 on first call, page 2 on second call
    mock_client.get.side_effect = [page_1_response, page_2_response]

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with filters
    result = service.discover_movies(
        page=1, params=BrowseServiceParams(year_min=2022, year_max=2022, rating_min=7.5)
    )

    # Assert: Service fetched page 2 as buffer
    assert mock_client.get.call_count == 2

    # Assert: Result contains 20 movies (12 from page 1 + 8 from page 2)
    assert len(result.results) == 20

    # Verify all returned movies match filters
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


def test_buffer_mechanism_does_not_fetch_when_full_page_achieved() -> None:
    """Test that service does NOT fetch page N+1 when filtered results >= 20."""
    # Arrange: Page 1 has exactly 20 valid movies after filtering
    mock_client = Mock(spec=["get"])

    # Page 1: 20 movies, all 20 match filters (full page)
    page_1_movies = [
        create_tmdb_movie(i, f"Good Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 21)
    ]

    page_1_response = create_mock_paginated_response(page_1_movies, page=1, total_pages=10)
    mock_client.get.return_value = page_1_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with filters
    result = service.discover_movies(
        page=1, params=BrowseServiceParams(year_min=2022, year_max=2022, rating_min=7.5)
    )

    # Assert: Service only fetched page 1 (no buffer needed)
    assert mock_client.get.call_count == 1

    # Assert: Result contains exactly 20 movies
    assert len(result.results) == 20


def test_buffer_mechanism_fills_page_even_with_few_initial_results() -> None:
    """Test that service keeps fetching pages to fill to 20 even with restrictive filters.

    With smart buffering, if page 1 only yields 8 movies after filtering but more
    pages are available, we should fetch additional pages to reach 20 results.
    This ensures consistent page sizes even with restrictive filters.
    """
    # Arrange: Page 1 has only 8 valid movies, page 2 has 12 more
    mock_client = Mock(spec=["get"])

    # Page 1: 20 movies, but only 8 match very restrictive filters
    page_1_movies = [
        # 8 movies matching filters
        create_tmdb_movie(1, "Good A", "2022-01-01", 9.0),
        create_tmdb_movie(2, "Good B", "2022-01-01", 8.9),
        create_tmdb_movie(3, "Good C", "2022-01-01", 8.8),
        create_tmdb_movie(4, "Good D", "2022-01-01", 8.7),
        create_tmdb_movie(5, "Good E", "2022-01-01", 8.6),
        create_tmdb_movie(6, "Good F", "2022-01-01", 8.5),
        create_tmdb_movie(7, "Good G", "2022-01-01", 9.1),
        create_tmdb_movie(8, "Good H", "2022-01-01", 9.2),
        # 12 movies filtered out
        *[create_tmdb_movie(100 + i, f"Wrong {i}", "2022-01-01", 7.0) for i in range(12)],
    ]

    # Page 2: 12 more matching movies
    page_2_movies = [
        *[
            create_tmdb_movie(20 + i, f"Good {chr(73 + i)}", "2022-01-01", 8.5 + i * 0.1)
            for i in range(12)
        ],
        # 8 movies filtered out
        *[create_tmdb_movie(200 + i, f"Wrong {i}", "2022-01-01", 7.0) for i in range(8)],
    ]

    def mock_get_side_effect(*args: object, **kwargs: object) -> ApiResponse:
        params: dict[str, object] = args[1] if len(args) > 1 else kwargs.get("params", {})  # pyright: ignore[reportAssignmentType]
        page_num = params.get("page", 1)

        if page_num == 1:
            return create_mock_paginated_response(page_1_movies, page=1, total_pages=10)
        if page_num == 2:
            return create_mock_paginated_response(page_2_movies, page=2, total_pages=10)
        # Fallback for unexpected page numbers
        return create_mock_paginated_response(
            [],
            page=page_num,  # pyright: ignore[reportArgumentType]
            total_pages=10,
        )

    mock_client.get.side_effect = mock_get_side_effect
    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with restrictive filters (rating 8.5+)
    result = service.discover_movies(
        page=1, params=BrowseServiceParams(year_min=2022, year_max=2022, rating_min=8.5)
    )

    # Assert: Service fetched pages 1 and 2 to fill to 20
    assert mock_client.get.call_count == 2

    # Assert: Result contains exactly 20 movies (full page achieved)
    assert len(result.results) == 20


def test_buffer_mechanism_does_not_fetch_on_last_page() -> None:
    """Test that service does NOT fetch page N+1 when on last page.

    If we're on page 10 of 10, there is no page 11 to fetch for buffer.
    """
    # Arrange: Page 10 (last page) has 15 movies after filtering
    mock_client = Mock(spec=["get"])

    page_10_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 7.5 + (i * 0.1)) for i in range(1, 16)
    ]

    page_10_response = create_mock_paginated_response(page_10_movies, page=10, total_pages=10)
    mock_client.get.return_value = page_10_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 10 (last page)
    params = BrowseServiceParams(year_min=2022, year_max=2022)
    result = service.discover_movies(page=10, params=params)

    # Assert: Service only fetched page 10 (no page 11 exists)
    assert mock_client.get.call_count == 1

    # Assert: Result contains 15 movies (partial page, no buffer available)
    assert len(result.results) == 15


def test_buffer_movies_also_pass_filters_no_leakage() -> None:
    """Test that buffer movies MUST also pass filters (prevent leakage).

    Critical: If we fetch page 2 for buffer, we must apply the SAME filters
    to page 2 movies. Otherwise, incorrect movies "leak" into results.
    """
    # Arrange: Page 1 has 15 valid movies, page 2 has mix of valid/invalid
    mock_client = Mock(spec=["get"])

    page_1_movies = [
        create_tmdb_movie(i, f"Page1 Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 16)
    ]

    # Page 2 buffer: 10 valid + 10 invalid movies
    page_2_movies = [
        # 10 valid movies (should be used for buffer)
        *[
            create_tmdb_movie(20 + i, f"Valid Buffer {i}", "2022-01-01", 7.5 + (i * 0.1))
            for i in range(1, 11)
        ],
        # 10 invalid movies (should NOT leak into results)
        *[
            create_tmdb_movie(100 + i, f"Invalid Buffer {i}", "2019-01-01", 6.0)
            for i in range(1, 11)
        ],
    ]

    page_1_response = create_mock_paginated_response(page_1_movies, page=1, total_pages=10)
    page_2_response = create_mock_paginated_response(page_2_movies, page=2, total_pages=10)

    mock_client.get.side_effect = [page_1_response, page_2_response]

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with filters
    result = service.discover_movies(
        page=1, params=BrowseServiceParams(year_min=2022, year_max=2022, rating_min=7.5)
    )

    # Assert: Result contains 20 movies (15 from page 1 + 5 from page 2)
    assert len(result.results) == 20

    # Critical: ALL movies must match filters (no leakage from buffer)
    invalid_ids = {100 + i for i in range(1, 11)}
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert invalid_ids.isdisjoint(returned_ids), "Invalid buffer movies leaked into results!"

    # Verify all returned movies match filters
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5
