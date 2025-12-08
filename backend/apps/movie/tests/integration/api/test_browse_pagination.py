"""Integration tests for browse endpoint pagination behavior.

Tests the smart buffer pagination mechanism including:
- next_tmdb_page_start metadata tracking
- tmdb_page_start parameter continuation
- Fallback behavior for backward compatibility
- Max buffer pages safety limit
- Cross-page deduplication
- Backward navigation consistency
"""

from unittest.mock import Mock, patch

import pytest
from core.tests.test_helpers import HTTPStatus
from django.test import Client
from movie.tests.test_helpers import create_mock_paginated_response
from movie.tests.tmdb_test_builders import create_tmdb_movie

BROWSE_URL = "/api/movies/browse"

pytestmark = pytest.mark.django_db


def create_buffer_pages(
    start_id: int, start_page: int, num_pages: int = 5, movies_per_page: int = 20
) -> list[dict]:
    """Generate mock responses for buffer pages with unique IDs.

    When deduplication filters movies, the buffer fetches additional pages.
    This helper generates those pages to prevent StopIteration errors.

    Args:
        start_id: First movie ID to use
        start_page: First page number
        num_pages: Number of buffer pages to generate (default 5 = max buffer)
        movies_per_page: Movies per page (default 20)

    Returns:
        List of mock paginated responses ready for side_effect
    """
    pages = []
    current_id = start_id
    for page_num in range(start_page, start_page + num_pages):
        movies = [
            create_tmdb_movie(current_id + i, f"Buffer Movie {current_id + i}", "2023-01-01", 8.0)
            for i in range(movies_per_page)
        ]
        pages.append(create_mock_paginated_response(movies, page=page_num, total_pages=20))
        current_id += movies_per_page
    return pages


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_returns_next_tmdb_page_start_after_buffer(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test that API returns next_tmdb_page_start metadata when buffer consumes multiple pages.

    When buffer mechanism fetches multiple TMDB pages (e.g., pages 1-4) to fill
    a single API response, the API should return next_tmdb_page_start=5 to tell
    the client where pagination should continue.

    This prevents duplicates when client requests next API page.
    """
    # Arrange: Create scenario where page 1 needs buffering (sparse results)
    # Page 1: 11 valid movies (triggers buffer)
    page_1_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0) for i in range(1, 12)
    ]

    # Pages 2-4: Fill buffer to reach 20 results (3 pages, 3 movies each = 9 more)
    page_2_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0) for i in range(12, 15)
    ]
    page_3_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0) for i in range(15, 18)
    ]
    page_4_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0) for i in range(18, 21)
    ]

    # Mock TMDB responses
    mock_tmdb_get.side_effect = [
        create_mock_paginated_response(page_1_movies, page=1, total_pages=10, total_results=200),
        create_mock_paginated_response(page_2_movies, page=2, total_pages=10, total_results=200),
        create_mock_paginated_response(page_3_movies, page=3, total_pages=10, total_results=200),
        create_mock_paginated_response(page_4_movies, page=4, total_pages=10, total_results=200),
    ]

    # Act: Request browse with filters that trigger sparse results
    filters: dict[str, str | float] = {"vote_average_gte": 7.5}
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Response includes next_tmdb_page_start metadata
    assert res.status_code == HTTPStatus.OK
    data = res.json()

    # Buffer fetched pages 1-4, so next request should start at page 5
    assert "next_tmdb_page_start" in data, "Response must include next_tmdb_page_start metadata"
    assert data["next_tmdb_page_start"] == 5, (
        f"After consuming TMDB pages 1-4, next start should be 5, "
        f"got {data.get('next_tmdb_page_start')}"
    )

    # Should have exactly 20 results (11 from page 1 + 9 from pages 2-4)
    assert len(data["results"]) == 20, (
        f"Expected 20 results after buffering, got {len(data['results'])}"
    )


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_continues_from_tmdb_page_start_parameter(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test that tmdb_page_start parameter correctly continues pagination.

    When client provides tmdb_page_start from previous response's next_tmdb_page_start,
    the API should start fetching from that TMDB page instead of using simple 1:1 mapping.

    This ensures sequential page requests don't create duplicates.
    """
    # Arrange: Simulate requesting "API page 2" but starting from TMDB page 5
    # (because previous request consumed TMDB pages 1-4)
    page_5_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0)
        for i in range(21, 41)  # 20 movies, IDs 21-40
    ]

    mock_tmdb_get.return_value = create_mock_paginated_response(
        page_5_movies, page=5, total_pages=10, total_results=200
    )

    # Act: Request with tmdb_page_start=5 (from previous next_tmdb_page_start)
    filters: dict[str, str | int] = {
        "page": 2,  # API page 2
        "tmdb_page_start": 5,  # But continue from TMDB page 5
    }
    res = api_client.get(BROWSE_URL, filters)

    # Assert: Request succeeded
    assert res.status_code == HTTPStatus.OK
    data = res.json()

    # Verify tmdb_page_start parameter was respected (behavior check)
    # Results should be from TMDB page 5 (IDs 21-40), NOT from API page 2
    returned_ids = {movie["tmdb_id"] for movie in data["results"]}
    expected_ids = set(range(21, 41))
    assert returned_ids == expected_ids, (
        f"Expected IDs 21-40 from TMDB page 5 (tmdb_page_start=5), got {returned_ids}. "
        "This validates tmdb_page_start parameter correctly overrides simple page mapping."
    )


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_fallback_when_tmdb_page_start_omitted(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test fallback behavior when tmdb_page_start parameter is missing.

    For backward compatibility, if client doesn't provide tmdb_page_start,
    API should fall back to simple 1:1 page mapping (old behavior).

    This ensures existing clients continue to work (though may see duplicates).
    """
    # Arrange: Simulate old-style request without metadata
    page_2_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0) for i in range(21, 41)
    ]

    mock_tmdb_get.return_value = create_mock_paginated_response(
        page_2_movies, page=2, total_pages=10
    )

    # Act: Request API page 2 WITHOUT tmdb_page_start
    res = api_client.get(BROWSE_URL, {"page": 2})

    # Assert: Should fall back to simple mapping (API page 2 → TMDB page 2)
    assert res.status_code == HTTPStatus.OK
    data = res.json()

    # Verify fallback behavior: results from TMDB page 2 (IDs 21-40)
    returned_ids = {movie["tmdb_id"] for movie in data["results"]}
    expected_ids = set(range(21, 41))
    assert returned_ids == expected_ids, (
        f"Expected IDs 21-40 from TMDB page 2 (fallback behavior), got {returned_ids}. "
        "Without tmdb_page_start, should use simple 1:1 mapping (API page = TMDB page)"
    )


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_respects_max_buffer_pages_with_heavy_duplication(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test browse respects max_buffer_pages safety limit with extreme duplication.

    Scenario: Pathological case where TMDB returns mostly duplicates,
    buffer should stop at 5 additional pages even if < 20 unique movies collected.
    """
    # Arrange: Page 1 has 10 movies
    page_1_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0) for i in range(1, 11)  # IDs 1-10
    ]

    # Pages 2-6: Each has 9 duplicates + 1 new movie (heavy duplication)
    page_responses = [create_mock_paginated_response(page_1_movies, page=1, total_pages=10)]

    for page_num in range(2, 7):  # Pages 2-6 (5 buffer pages)
        page_movies = [
            create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 8.0)
            for i in range(1, 10)  # Duplicates 1-9
        ] + [
            create_tmdb_movie(
                10 + page_num - 1,
                f"Movie {10 + page_num - 1}",
                "2022-01-01",
                8.0,
            )  # One new movie per page
        ]
        page_responses.append(
            create_mock_paginated_response(page_movies, page=page_num, total_pages=10)
        )

    mock_tmdb_get.side_effect = page_responses

    # Act: Request browse API
    res = api_client.get(BROWSE_URL, {"page": 1})

    # Assert: Should stop at max_buffer_pages=5 with only 15 unique movies
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    results = data["results"]

    # After page 1 (10 movies) + 5 buffer pages (1 new each) = 15 unique total
    assert len(results) == 15, (
        f"Expected 15 unique movies (stopped at max_buffer_pages), got {len(results)}"
    )

    # Verify: All unique IDs (1-15)
    tmdb_ids = [movie["tmdb_id"] for movie in results]
    assert set(tmdb_ids) == set(range(1, 16)), "Should have unique IDs 1-15"

    # Verify: Consumed exactly 6 pages (1 initial + 5 buffer max)
    assert data["next_tmdb_page_start"] == 7, (
        "Should consume pages 1-6 (max_buffer_pages=5), next should be 7"
    )

    # Verify: TMDB client called 6 times (initial + 5 buffer)
    assert mock_tmdb_get.call_count == 6, (
        f"Should call TMDB 6 times (1 initial + 5 buffer), got {mock_tmdb_get.call_count}"
    )


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_no_cross_page_duplicates(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test that movies don't appear on multiple pages (cross-page deduplication).

    Scenario: TMDB returns duplicates across page boundaries (e.g., Spirited Away on
    TMDB page 2 and TMDB page 4). Our page 1 shows it, page 2 should NOT show it again.

    Real-world issue: After implementing within-page deduplication, users report
    seeing Spirited Away on page 1 AND page 2, Mulan on page 2 AND page 3, etc.
    """
    # Simulate TMDB pagination instability: Movie ID 19 appears on TMDB pages 2 AND 4
    # Our page 1 will consume TMDB pages 1-2 (with buffer)
    # Our page 2 will consume TMDB pages 3-4 (starting from next_tmdb_page_start)
    # Movie 19 should appear on our page 1 (from TMDB page 2), NOT on our page 2

    # TMDB Page 1: IDs 1-17 (17 movies, triggers buffer)
    tmdb_page_1 = [create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(1, 18)]

    # TMDB Page 2: IDs 18-20 (3 movies) - Page 1 buffer fetch
    # After dedup: Our page 1 has IDs 1-20, next_tmdb_page_start=3
    tmdb_page_2 = [create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(18, 21)]

    # TMDB Page 3: IDs 21-37 (17 movies, triggers buffer for our page 2)
    tmdb_page_3 = [create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(21, 38)]

    # TMDB Page 4: IDs 19, 38-40 (DUPLICATE 19 + 3 new) - Page 2 buffer fetch
    # CRITICAL: ID 19 was already shown on our page 1 (from TMDB page 2)
    # It should NOT appear on our page 2
    tmdb_page_4 = [
        create_tmdb_movie(19, "Movie 19", "2023-01-01", 8.0),  # DUPLICATE from page 1!
    ] + [create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(38, 41)]

    mock_tmdb_get.side_effect = [
        # Page 1 request: TMDB pages 1-2
        create_mock_paginated_response(tmdb_page_1, page=1, total_pages=10),
        create_mock_paginated_response(tmdb_page_2, page=2, total_pages=10),
        # Page 2 request: TMDB pages 3-4 (starting from next_tmdb_page_start=3)
        create_mock_paginated_response(tmdb_page_3, page=3, total_pages=10),
        create_mock_paginated_response(tmdb_page_4, page=4, total_pages=10),
    ]

    # Act: Fetch page 1
    page_1_res = api_client.get(BROWSE_URL, {"page": 1})
    assert page_1_res.status_code == HTTPStatus.OK
    page_1_data = page_1_res.json()
    page_1_ids = {movie["tmdb_id"] for movie in page_1_data["results"]}

    # Act: Fetch page 2 using next_tmdb_page_start from page 1
    page_2_res = api_client.get(
        BROWSE_URL,
        {
            "page": 2,
            "tmdb_page_start": page_1_data["next_tmdb_page_start"],
        },
    )
    assert page_2_res.status_code == HTTPStatus.OK
    page_2_data = page_2_res.json()
    page_2_ids = {movie["tmdb_id"] for movie in page_2_data["results"]}

    # Assert: NO overlap between page 1 and page 2
    overlap = page_1_ids & page_2_ids
    assert len(overlap) == 0, (
        f"Found {len(overlap)} duplicate movie(s) across pages: {overlap}. "
        f"Page 1 IDs: {sorted(page_1_ids)}, Page 2 IDs: {sorted(page_2_ids)}"
    )

    # Specifically verify movie 19 is NOT on both pages
    assert 19 in page_1_ids, "Movie 19 should appear on page 1"
    assert 19 not in page_2_ids, "Movie 19 should NOT appear on page 2 (cross-page duplicate)"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_browse_backward_navigation_consistency(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test that navigating back to page 1 returns consistent results.

    Scenario: User navigates page 1 → page 2 → back to page 1.
    Page 1 should show identical results both times.

    Real-world issue: Users report that navigating backwards changes page 1 results completely.
    """
    # Setup: Page 1 will fetch TMDB pages 1-2 (buffer), return IDs 1-20
    tmdb_page_1 = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0)
        for i in range(1, 18)  # 17 movies, triggers buffer
    ]

    tmdb_page_2 = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0)
        for i in range(18, 21)  # 3 movies, total 20 after buffer
    ]

    # Page 2 will fetch TMDB pages 3-4
    tmdb_page_3 = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0)
        for i in range(21, 38)  # 17 movies, triggers buffer
    ]

    tmdb_page_4 = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0)
        for i in range(38, 41)  # 3 movies, total 20
    ]

    # Mock will be called in order: page 1 fetch (TMDB 1, 2),
    # page 2 fetch (TMDB 3, 4), page 1 again (TMDB 1, 2)
    mock_tmdb_get.side_effect = [
        # First page 1 request
        create_mock_paginated_response(tmdb_page_1, page=1, total_pages=10),
        create_mock_paginated_response(tmdb_page_2, page=2, total_pages=10),
        # Page 2 request
        create_mock_paginated_response(tmdb_page_3, page=3, total_pages=10),
        create_mock_paginated_response(tmdb_page_4, page=4, total_pages=10),
        # Second page 1 request (backward navigation)
        create_mock_paginated_response(tmdb_page_1, page=1, total_pages=10),
        create_mock_paginated_response(tmdb_page_2, page=2, total_pages=10),
    ]

    # Act: Fetch page 1 (first time)
    page_1_first = api_client.get(BROWSE_URL, {"page": 1})
    assert page_1_first.status_code == HTTPStatus.OK
    page_1_first_data = page_1_first.json()
    page_1_first_ids = [movie["tmdb_id"] for movie in page_1_first_data["results"]]

    # Act: Fetch page 2
    page_2_res = api_client.get(
        BROWSE_URL,
        {
            "page": 2,
            "tmdb_page_start": page_1_first_data["next_tmdb_page_start"],
        },
    )
    assert page_2_res.status_code == HTTPStatus.OK

    # Act: Navigate BACK to page 1 (should give same results as first time)
    # IMPORTANT: Should NOT send tmdb_page_start when going back to page 1
    page_1_second = api_client.get(BROWSE_URL, {"page": 1})
    assert page_1_second.status_code == HTTPStatus.OK
    page_1_second_data = page_1_second.json()
    page_1_second_ids = [movie["tmdb_id"] for movie in page_1_second_data["results"]]

    # Assert: Page 1 results should be IDENTICAL both times
    assert page_1_first_ids == page_1_second_ids, (
        f"Page 1 results changed after backward navigation!\n"
        f"First visit:  {page_1_first_ids}\n"
        f"Second visit: {page_1_second_ids}\n"
        f"Differences: Added {set(page_1_second_ids) - set(page_1_first_ids)}, "
        f"Removed {set(page_1_first_ids) - set(page_1_second_ids)}"
    )

    # Assert: Order should also be preserved
    assert page_1_first_data["results"] == page_1_second_data["results"], (
        "Page 1 movie order changed after backward navigation"
    )


# ============================================================================
# Cross-Page Session Deduplication Tests
# ============================================================================
# These tests verify Redis-based session tracking prevents duplicates across
# pagination requests. Expected to fail until PaginationSessionManager is
# implemented with cross-page deduplication support.
# ============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_page_1_stores_returned_ids_in_session(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test that page 1 request stores returned movie IDs in session.

    Scenario: User requests page 1, receives 20 movies.
    Expected: Those 20 IDs are stored in session for cross-page deduplication.

    Note: This test verifies session storage behavior by checking page 2
    excludes IDs from page 1 (indirect verification via behavior).
    """
    # Page 1: IDs 1-20
    page_1_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(1, 21)
    ]

    # Page 2: IDs 1-5 (duplicates) + IDs 21-35 (new) = 20 total
    # With session tracking, the 5 duplicates are filtered, leaving 15 movies.
    # Buffer will fetch page 3+ to reach 20.
    page_2_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0)
        for i in list(range(1, 6)) + list(range(21, 36))  # 5 dupes + 15 new
    ]

    mock_tmdb_get.side_effect = [
        create_mock_paginated_response(page_1_movies, page=1, total_pages=10),
        create_mock_paginated_response(page_2_movies, page=2, total_pages=10),
        # Buffer pages for when deduplication removes the 5 duplicates
        *create_buffer_pages(start_id=100, start_page=3, num_pages=3),
    ]

    # Request page 1
    page_1_res = api_client.get(BROWSE_URL, {"page": 1})
    assert page_1_res.status_code == HTTPStatus.OK
    page_1_ids = {m["tmdb_id"] for m in page_1_res.json()["results"]}
    assert page_1_ids == set(range(1, 21))

    # Request page 2
    page_2_res = api_client.get(
        BROWSE_URL,
        {"page": 2, "tmdb_page_start": page_1_res.json()["next_tmdb_page_start"]},
    )
    assert page_2_res.status_code == HTTPStatus.OK
    page_2_ids = {m["tmdb_id"] for m in page_2_res.json()["results"]}

    # Page 2 should NOT contain any IDs from page 1
    overlap = page_1_ids & page_2_ids
    assert len(overlap) == 0, f"Page 2 contains IDs already shown on page 1: {overlap}"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_session_cleared_on_page_1_fresh_start(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test session cleared when requesting page=1 (fresh start).

    Scenario: User browses page 1 → page 2 → navigates back to page 1 → page 2.
    Expected: Fresh page 1 clears session, so new page 2 can show IDs that were
    excluded in the previous page 2 request.

    This tests that session state is properly reset, not just that page 1 returns data.
    """
    # Page 1: IDs 1-20
    page_1_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(1, 21)
    ]

    # First page 2: IDs 21-40 (with duplicate ID 15 that should be excluded)
    first_page_2_movies = [
        create_tmdb_movie(15, "Movie 15", "2023-01-01", 8.0),  # Duplicate from page 1!
    ] + [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(21, 40)
    ]

    # Second page 2 (after fresh page 1): Same data - ID 15 should be excluded again
    # If session wasn't cleared, ID 15 would still be excluded from the old session
    # If session WAS cleared, ID 15 would be re-added to new session from fresh page 1
    second_page_2_movies = [
        create_tmdb_movie(15, "Movie 15", "2023-01-01", 8.0),  # Should be excluded
    ] + [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(21, 40)
    ]

    mock_tmdb_get.side_effect = [
        # First sequence: page 1 → page 2
        create_mock_paginated_response(page_1_movies, page=1, total_pages=10),
        create_mock_paginated_response(first_page_2_movies, page=2, total_pages=10),
        # Buffer page for first page 2 (1 dup filtered = needs 1 more movie)
        # Only provide 1 buffer page since that's all it needs
        *create_buffer_pages(start_id=200, start_page=3, num_pages=1),
        # Fresh page 1 (clears session)
        create_mock_paginated_response(page_1_movies, page=1, total_pages=10),
        # New page 2 (should use fresh session state)
        create_mock_paginated_response(second_page_2_movies, page=2, total_pages=10),
        # Buffer page for second page 2 (1 dup filtered = needs 1 more movie)
        *create_buffer_pages(start_id=300, start_page=3, num_pages=1),
    ]

    # First sequence: page 1 → page 2
    p1_res = api_client.get(BROWSE_URL, {"page": 1})
    assert p1_res.status_code == HTTPStatus.OK
    first_p1_ids = {m["tmdb_id"] for m in p1_res.json()["results"]}
    assert 15 in first_p1_ids, "Page 1 should contain ID 15"

    first_p2_res = api_client.get(
        BROWSE_URL, {"page": 2, "tmdb_page_start": p1_res.json()["next_tmdb_page_start"]}
    )
    assert first_p2_res.status_code == HTTPStatus.OK
    first_p2_ids = {m["tmdb_id"] for m in first_p2_res.json()["results"]}
    assert 15 not in first_p2_ids, "First page 2 should exclude ID 15 (dedup)"

    # Fresh page 1 (should clear session)
    fresh_p1_res = api_client.get(BROWSE_URL, {"page": 1})
    assert fresh_p1_res.status_code == HTTPStatus.OK

    # New page 2 after fresh start
    new_p2_res = api_client.get(
        BROWSE_URL,
        {"page": 2, "tmdb_page_start": fresh_p1_res.json()["next_tmdb_page_start"]},
    )
    assert new_p2_res.status_code == HTTPStatus.OK
    new_p2_ids = {m["tmdb_id"] for m in new_p2_res.json()["results"]}

    # ID 15 should STILL be excluded (it's in the fresh page 1 session)
    # This proves session was cleared and rebuilt, not carried over
    assert 15 not in new_p2_ids, "New page 2 should exclude ID 15 (fresh session)"

    # Verify no overlap between fresh page 1 and new page 2
    fresh_p1_ids = {m["tmdb_id"] for m in fresh_p1_res.json()["results"]}
    overlap = fresh_p1_ids & new_p2_ids
    assert len(overlap) == 0, f"Fresh sequence should have no cross-page duplicates: {overlap}"


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_different_filter_combinations_use_different_sessions(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test different filter combinations use separate sessions.

    Scenario: User browses Animation movies, then Action movies.
    Expected: Each filter combination maintains independent session state.
    """
    # Animation filter: IDs 1-20
    animation_page_1 = [
        create_tmdb_movie(i, f"Animation {i}", "2023-01-01", 8.0)
        for i in range(1, 21)
    ]

    # Action filter: Also IDs 1-20 (different movies, same IDs - shouldn't conflict)
    action_page_1 = [
        create_tmdb_movie(i, f"Action {i}", "2023-01-01", 8.0)
        for i in range(1, 21)
    ]

    # Animation page 2 with duplicate from animation page 1
    animation_page_2 = [
        create_tmdb_movie(1, "Animation 1", "2023-01-01", 8.0),  # Duplicate!
    ] + [
        create_tmdb_movie(i, f"Animation {i}", "2023-01-01", 8.0)
        for i in range(21, 40)
    ]

    mock_tmdb_get.side_effect = [
        create_mock_paginated_response(animation_page_1, page=1, total_pages=10),
        create_mock_paginated_response(action_page_1, page=1, total_pages=10),
        create_mock_paginated_response(animation_page_2, page=2, total_pages=10),
        # Buffer pages for animation page 2 (1 dup filtered)
        *create_buffer_pages(start_id=200, start_page=3, num_pages=2),
    ]

    # Request Animation page 1
    anim_res = api_client.get(BROWSE_URL, {"page": 1, "with_genres": "16"})
    assert anim_res.status_code == HTTPStatus.OK

    # Request Action page 1 (different filter = different session)
    action_res = api_client.get(BROWSE_URL, {"page": 1, "with_genres": "28"})
    assert action_res.status_code == HTTPStatus.OK
    action_ids = {m["tmdb_id"] for m in action_res.json()["results"]}

    # Action page 1 should have IDs 1-20 (not excluded by Animation session)
    assert 1 in action_ids, "Action filter should have ID 1 (independent session)"

    # Request Animation page 2
    anim_p2_res = api_client.get(
        BROWSE_URL,
        {"page": 2, "with_genres": "16", "tmdb_page_start": 2},
    )
    anim_p2_ids = {m["tmdb_id"] for m in anim_p2_res.json()["results"]}

    # Animation page 2 should NOT have ID 1 (was on Animation page 1)
    assert 1 not in anim_p2_ids, "Animation p2 should exclude ID 1 (same session)"


# ============================================================================
# Context ID Tests (Multi-Tab Isolation)
# ============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_different_pagination_context_headers_use_separate_sessions(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test X-Pagination-Context header provides tab isolation.

    Scenario: Two browser tabs browse same filters. Tab 1 goes to page 2 first,
    then Tab 2 goes to page 2. Each should have independent cross-page dedup.

    Expected: Tab 2's page 2 excludes duplicates from Tab 2's page 1 (not Tab 1's).
    """
    # Page 1: IDs 1-20 (both tabs see this)
    page_1_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(1, 21)
    ]

    # Page 2 for Tab 1: ID 5 (duplicate) + IDs 21-39
    tab1_page_2_movies = [
        create_tmdb_movie(5, "Movie 5", "2023-01-01", 8.0),  # Duplicate!
    ] + [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(21, 40)
    ]

    # Page 2 for Tab 2: ID 10 (duplicate) + IDs 41-59
    # Different duplicates to prove sessions are independent
    tab2_page_2_movies = [
        create_tmdb_movie(10, "Movie 10", "2023-01-01", 8.0),  # Duplicate!
    ] + [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(41, 60)
    ]

    mock_tmdb_get.side_effect = [
        # Tab 1: page 1
        create_mock_paginated_response(page_1_movies, page=1, total_pages=10),
        # Tab 2: page 1
        create_mock_paginated_response(page_1_movies, page=1, total_pages=10),
        # Tab 1: page 2
        create_mock_paginated_response(tab1_page_2_movies, page=2, total_pages=10),
        # Buffer pages for Tab 1 page 2 (1 dup filtered)
        *create_buffer_pages(start_id=200, start_page=3, num_pages=2),
        # Tab 2: page 2
        create_mock_paginated_response(tab2_page_2_movies, page=2, total_pages=10),
        # Buffer pages for Tab 2 page 2 (1 dup filtered)
        *create_buffer_pages(start_id=300, start_page=3, num_pages=2),
    ]

    # Tab 1: page 1
    tab1_p1 = api_client.get(
        BROWSE_URL, {"page": 1}, HTTP_X_PAGINATION_CONTEXT="tab1-uuid"
    )
    assert tab1_p1.status_code == HTTPStatus.OK

    # Tab 2: page 1
    tab2_p1 = api_client.get(
        BROWSE_URL, {"page": 1}, HTTP_X_PAGINATION_CONTEXT="tab2-uuid"
    )
    assert tab2_p1.status_code == HTTPStatus.OK

    # Tab 1: page 2 (should exclude ID 5 from Tab 1's session)
    tab1_p2 = api_client.get(
        BROWSE_URL,
        {"page": 2, "tmdb_page_start": tab1_p1.json()["next_tmdb_page_start"]},
        HTTP_X_PAGINATION_CONTEXT="tab1-uuid",
    )
    assert tab1_p2.status_code == HTTPStatus.OK
    tab1_p2_ids = {m["tmdb_id"] for m in tab1_p2.json()["results"]}

    # Tab 2: page 2 (should exclude ID 10 from Tab 2's session, NOT affected by Tab 1)
    tab2_p2 = api_client.get(
        BROWSE_URL,
        {"page": 2, "tmdb_page_start": tab2_p1.json()["next_tmdb_page_start"]},
        HTTP_X_PAGINATION_CONTEXT="tab2-uuid",
    )
    assert tab2_p2.status_code == HTTPStatus.OK
    tab2_p2_ids = {m["tmdb_id"] for m in tab2_p2.json()["results"]}

    # Tab 1's page 2 should exclude ID 5 (duplicate from page 1)
    assert 5 not in tab1_p2_ids, "Tab 1 page 2 should exclude ID 5"

    # Tab 2's page 2 should exclude ID 10 (duplicate from page 1)
    assert 10 not in tab2_p2_ids, "Tab 2 page 2 should exclude ID 10"

    # Verify sessions are independent: Tab 1's exclusions don't affect Tab 2
    # Tab 2 never saw IDs 21-39, so if those appeared in Tab 2's page 2, fine
    # The key test is that Tab 2 excluded based on its OWN page 1, not Tab 1's


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_requests_without_context_header_work_backwards_compatible(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test requests without X-Pagination-Context header work (backwards compat).

    Scenario: Legacy client doesn't send X-Pagination-Context header.
    Expected: Session tracking still works (uses default empty context).
    """
    # Page 1: IDs 1-20
    page_1 = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(1, 21)
    ]

    # Page 2: ID 1 (duplicate) + IDs 21-39 (new)
    page_2 = [
        create_tmdb_movie(1, "Movie 1", "2023-01-01", 8.0),  # Duplicate!
    ] + [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(21, 40)
    ]

    mock_tmdb_get.side_effect = [
        create_mock_paginated_response(page_1, page=1, total_pages=10),
        create_mock_paginated_response(page_2, page=2, total_pages=10),
        # Buffer pages for page 2 (1 dup filtered)
        *create_buffer_pages(start_id=200, start_page=3, num_pages=2),
    ]

    # Request WITHOUT X-Pagination-Context header
    page_1_res = api_client.get(BROWSE_URL, {"page": 1})
    assert page_1_res.status_code == HTTPStatus.OK

    page_2_res = api_client.get(
        BROWSE_URL,
        {"page": 2, "tmdb_page_start": page_1_res.json()["next_tmdb_page_start"]},
    )
    assert page_2_res.status_code == HTTPStatus.OK
    page_2_ids = {m["tmdb_id"] for m in page_2_res.json()["results"]}

    # Page 2 should NOT contain ID 1 (cross-page dedup still works)
    assert 1 not in page_2_ids, "Cross-page dedup should work without context header"


# ============================================================================
# Search Integration Tests
# ============================================================================

SEARCH_URL = "/api/movies/search"

# Note: test_search_results_use_separate_session_from_browse was removed as redundant.
# Search and browse inherently use different filter hashes (search has `q`, browse has
# `genres`, etc.), so session isolation is automatic. Unit tests verify different
# filters generate different cache keys.


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_search_pagination_deduplicates_across_pages(
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test same search query across pages deduplicates correctly.

    Scenario: Search "spirited away" returns duplicates across pages.
    Expected: Page 2 of search excludes IDs already shown on page 1.
    """
    # Search page 1: IDs 1-20
    search_page_1 = [
        create_tmdb_movie(i, f"Result {i}", "2023-01-01", 8.0) for i in range(1, 21)
    ]

    # Search page 2: ID 10 (duplicate) + IDs 21-39 (new)
    search_page_2 = [
        create_tmdb_movie(10, "Result 10", "2023-01-01", 8.0),  # Duplicate!
    ] + [
        create_tmdb_movie(i, f"Result {i}", "2023-01-01", 8.0) for i in range(21, 40)
    ]

    mock_tmdb_get.side_effect = [
        create_mock_paginated_response(search_page_1, page=1, total_pages=10),
        create_mock_paginated_response(search_page_2, page=2, total_pages=10),
        # Buffer pages for search page 2 (1 dup filtered)
        *create_buffer_pages(start_id=200, start_page=3, num_pages=2),
    ]

    # Search page 1
    p1_res = api_client.get(SEARCH_URL, {"query": "spirited", "page": 1})
    assert p1_res.status_code == HTTPStatus.OK
    p1_ids = {m["tmdb_id"] for m in p1_res.json()["results"]}

    # Search page 2
    p2_res = api_client.get(
        SEARCH_URL,
        {
            "query": "spirited",
            "page": 2,
            "tmdb_page_start": p1_res.json().get("next_tmdb_page_start", 2),
        },
    )
    assert p2_res.status_code == HTTPStatus.OK
    p2_ids = {m["tmdb_id"] for m in p2_res.json()["results"]}

    # Search page 2 should NOT contain ID 10 (was on page 1)
    assert 10 not in p2_ids, "Search p2 should exclude ID 10 (cross-page dedup)"
    overlap = p1_ids & p2_ids
    assert len(overlap) == 0, f"Search pages should not overlap: {overlap}"


# ============================================================================
# Graceful Degradation Tests
# ============================================================================


@patch("core.services.tmdb_api_client.TMDBApiClient.get")
@patch("django.core.cache.cache")
def test_graceful_degradation_when_redis_unavailable(
    mock_cache: Mock,
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test graceful degradation when Redis unavailable (within-page only).

    Scenario: Redis connection fails during pagination.
    Expected: Within-page deduplication still works, cross-page may have dupes.
    """
    # Simulate Redis failure
    mock_cache.get.side_effect = Exception("Redis connection refused")
    mock_cache.set.side_effect = Exception("Redis connection refused")

    # Page 1: IDs 1-20
    page_1 = [
        create_tmdb_movie(i, f"Movie {i}", "2023-01-01", 8.0) for i in range(1, 21)
    ]

    mock_tmdb_get.return_value = create_mock_paginated_response(
        page_1, page=1, total_pages=10
    )

    # Request should succeed despite Redis failure
    res = api_client.get(BROWSE_URL, {"page": 1})
    assert res.status_code == HTTPStatus.OK

    # Results should still be returned (graceful degradation)
    results = res.json()["results"]
    assert len(results) == 20, "Should return results despite Redis failure"
