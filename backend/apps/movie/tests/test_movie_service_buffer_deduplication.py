"""Unit tests for pagination module's buffer deduplication logic.

Tests the apply_buffer_if_needed function to verify:
- Buffer correctly deduplicates movies by tmdb_id
- Buffer continues fetching to reach 20 unique movies when duplicates present
- Buffer respects max_buffer_pages safety limit
- Deduplication preserves first occurrence order
- Empty results after deduplication handled correctly

"""
from __future__ import annotations

from unittest.mock import Mock

from core.tmdb_models.tmdb_responses import TMDBMovieBase, TMDBPaginatedMovieResponse
from movie.schemas import MovieBaseSchema
from movie.services.pagination import apply_buffer_if_needed
from movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
)

# ============================================================================
# Test Fixtures and Helpers
# ============================================================================


def convert_to_schema(tmdb_movie: TMDBMovieBase) -> MovieBaseSchema:
    """Convert TMDBMovieBase Pydantic model to MovieBaseSchema.

    Mirrors the transformation done in pagination module (id → tmdb_id mapping).

    Args:
        tmdb_movie: Validated TMDBMovieBase Pydantic model

    Returns:
        MovieBaseSchema with tmdb_id field
    """
    movie_dict = tmdb_movie.model_dump()
    # Rename id to tmdb_id for MovieBaseSchema
    movie_dict['tmdb_id'] = movie_dict.pop('id')
    # Normalize empty string dates to None (TMDB API quirk)
    if movie_dict.get('release_date') == '':
        movie_dict['release_date'] = None
    return MovieBaseSchema.model_validate(movie_dict)


def create_mock_fetch_func(
    page_responses: dict[int, TMDBPaginatedMovieResponse]
) -> Mock:
    """Create mock fetch function that returns TMDBPaginatedMovieResponse for each page.

    The buffer method expects fetch_func to return a TMDBPaginatedMovieResponse
    (Pydantic BaseModel with 'results', 'page', etc. attributes).

    Args:
        page_responses: Mapping of page number to TMDBPaginatedMovieResponse Pydantic model

    Returns:
        Mock function that returns TMDBPaginatedMovieResponse for given page number
    """
    def fetch_page(page: int) -> TMDBPaginatedMovieResponse:
        if page not in page_responses:
            # Return empty response for pages beyond what we defined
            return create_paginated_tmdb_response(
                movies=[],
                page=page,
                total_pages=max(page_responses.keys()) if page_responses else 1
            )
        return page_responses[page]

    mock_func = Mock(side_effect=fetch_page)
    return mock_func


# ============================================================================
# Buffer Deduplication Tests
# ============================================================================


def test_buffer_no_duplicates_returns_first_20() -> None:
    """Test buffer with no duplicates returns first 20 movies unchanged.

    Scenario: Page 1 has 20 unique movies, no buffering needed.
    Expected: Return first 20 movies, pages_consumed=1, no additional fetches.
    """
    # Arrange: Create 20 unique movies for page 1
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 21)
    ]
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Create mock fetch function (should not be called)
    mock_fetch = Mock()

    # Call buffer function directly from pagination module
    result_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=5,
        year_min=None,
        year_max=None,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Return first 20, no additional fetches
    assert len(result_movies) == 20
    assert pages_consumed == 1
    assert result_movies[0].tmdb_id == 1
    assert result_movies[19].tmdb_id == 20
    mock_fetch.assert_not_called()


def test_buffer_with_one_duplicate_fetches_additional_page() -> None:
    """Test buffer with 1 duplicate fetches additional page to reach 20 unique.

    Scenario: Page 1 has 19 movies, page 2 has movie ID 19 (duplicate) + 20 new movies.
    Expected: Deduplication removes duplicate, continues fetching page 2, returns 20 unique.
    """
    # Arrange: Create page 1 with 19 movies (IDs 1-19)
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 20)  # 1-19
    ]

    # Create page 2: Duplicate ID 19 at start + new movies 20-39
    page2_movies = [
        create_tmdb_movie(
            tmdb_id=19,  # DUPLICATE from page 1
            title="Movie 19",
            release_date="2023-01-01",
            vote_average=7.0
        )
    ] + [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(20, 40)  # 20-39 (20 new movies)
    ]

    # Setup page responses
    page_responses = {
        2: create_paginated_tmdb_response(page2_movies, page=2, total_pages=5)
    }
    mock_fetch = create_mock_fetch_func(page_responses)

    # Convert page 1 to schemas
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Act: Call buffer method
    result_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=5,
        year_min=None,
        year_max=None,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Should deduplicate ID 19 and fetch page 2 to reach 20 unique
    assert len(result_movies) == 20, "Should return 20 unique movies"
    assert pages_consumed == 2, "Should consume page 1 + page 2"

    # Verify IDs are unique and in order (1-20)
    result_ids = [movie.tmdb_id for movie in result_movies]
    assert result_ids == list(range(1, 21)), "Should have movies 1-20 without duplicate"
    assert result_ids.count(19) == 1, "ID 19 should appear exactly once"

    # Verify page 2 was fetched
    mock_fetch.assert_called_once_with(2)


def test_buffer_with_multiple_duplicates_continues_until_20_unique() -> None:
    """Test buffer with duplicates across multiple pages continues until 20 unique.

    Scenario: Page 1 has 17 movies, pages 2-3 each have heavy duplicates.
    Expected: Continue fetching pages, deduplicating, until 20 unique movies achieved.
    """
    # Arrange: Page 1 with 17 movies (IDs 1-17)
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 18)  # 1-17
    ]

    # Page 2: Heavy duplicates (15-17 repeated) + only 1 new (18) = 4 total
    # After dedup: Just ID 18 is new → Total unique so far: 18
    page2_movies = [
        create_tmdb_movie(
            tmdb_id=15, title="Movie 15", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=16, title="Movie 16", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=17, title="Movie 17", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=18, title="Movie 18", release_date="2023-01-01", vote_average=7.0
        ),
    ]

    # Page 3: More duplicates (17, 18) + new 19-21 = 5 total
    # After dedup: IDs 19, 20, 21 are new → Total unique: 21 (finally >= 20)
    page3_movies = [
        create_tmdb_movie(
            tmdb_id=17, title="Movie 17", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=18, title="Movie 18", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=19, title="Movie 19", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=20, title="Movie 20", release_date="2023-01-01", vote_average=7.0
        ),
        create_tmdb_movie(
            tmdb_id=21, title="Movie 21", release_date="2023-01-01", vote_average=7.0
        ),
    ]

    # Setup page responses
    page_responses = {
        2: create_paginated_tmdb_response(page2_movies, page=2, total_pages=5),
        3: create_paginated_tmdb_response(page3_movies, page=3, total_pages=5),
    }
    mock_fetch = create_mock_fetch_func(page_responses)

    # Convert page 1 to schemas
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Act: Call buffer method
    result_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=5,
        year_min=None,
        year_max=None,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Should fetch pages 2 and 3, deduplicate, return 20 unique
    assert len(result_movies) == 20, "Should return 20 unique movies"
    assert pages_consumed == 3, "Should consume pages 1, 2, and 3"

    # Verify IDs are unique and in order (1-20)
    result_ids = [movie.tmdb_id for movie in result_movies]
    assert result_ids == list(range(1, 21)), "Should have movies 1-20 without duplicates"

    # Verify all IDs are unique
    assert len(set(result_ids)) == 20, "All IDs should be unique"

    # Verify both pages were fetched
    assert mock_fetch.call_count == 2
    mock_fetch.assert_any_call(2)
    mock_fetch.assert_any_call(3)


def test_buffer_respects_max_buffer_pages_limit() -> None:
    """Test buffer respects max_buffer_pages safety limit even with duplicates.

    Scenario: Heavy duplication causes buffer to hit 5-page limit before reaching 20 unique.
    Expected: Stop at max_buffer_pages=5, return whatever unique movies collected.
    """
    # Arrange: Page 1 with 10 movies (IDs 1-10)
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 11)  # 1-10
    ]

    # Create pages 2-6 each with heavy duplication (only 1 new movie per page)
    page_responses: dict[int, TMDBPaginatedMovieResponse] = {}
    for page_num in range(2, 7):  # Pages 2-6 (5 buffer pages)
        # Each page has 9 duplicates + 1 new movie
        page_movies = [
            create_tmdb_movie(
                tmdb_id=i,
                title=f"Movie {i}",
                release_date="2023-01-01",
                vote_average=7.0
            )
            for i in range(1, 10)  # Duplicates 1-9
        ] + [
            create_tmdb_movie(
                tmdb_id=10 + page_num - 1,  # One new movie per page
                title=f"Movie {10 + page_num - 1}",
                release_date="2023-01-01",
                vote_average=7.0
            )
        ]
        page_responses[page_num] = create_paginated_tmdb_response(
            page_movies, page=page_num, total_pages=10
        )

    mock_fetch = create_mock_fetch_func(page_responses)

    # Convert page 1 to schemas
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Act: Call buffer method
    result_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=10,
        year_min=None,
        year_max=None,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Should stop at max_buffer_pages=5 with only 15 unique movies (10 + 5 new)
    assert len(result_movies) == 15, (
        "Should return 15 unique movies (10 initial + 5 from buffer pages)"
    )
    assert pages_consumed == 6, "Should consume page 1 + 5 buffer pages (max limit)"

    # Verify fetched exactly 5 buffer pages (pages 2-6)
    assert mock_fetch.call_count == 5, "Should fetch exactly 5 buffer pages (max limit)"

    # Verify IDs are unique and in order (1-15)
    result_ids = [movie.tmdb_id for movie in result_movies]
    assert result_ids == list(range(1, 16)), "Should have movies 1-15"
    assert len(set(result_ids)) == 15, "All IDs should be unique"


def test_buffer_deduplication_preserves_first_occurrence_order() -> None:
    """Test deduplication keeps first occurrence and maintains order.

    Scenario: Same movie appears on page 1 position 5 and page 2 position 1.
    Expected: Keep page 1 occurrence (first seen), maintain original ordering.
    """
    # Arrange: Page 1 with movies 1-19 (Spirited Away at position 19)
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 20)  # 1-19
    ]
    # Make ID 19 "Spirited Away" for clarity
    page1_movies[-1] = create_tmdb_movie(
        tmdb_id=129,
        title="Spirited Away",
        release_date="2001-07-20",
        vote_average=8.5
    )

    # Page 2: Spirited Away appears FIRST (duplicate) + new movies 20-39
    page2_movies = [
        create_tmdb_movie(
            tmdb_id=129,  # DUPLICATE - Spirited Away
            title="Spirited Away",
            release_date="2001-07-20",
            vote_average=8.5
        )
    ] + [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(20, 40)  # 20-39
    ]

    # Setup page responses
    page_responses = {
        2: create_paginated_tmdb_response(page2_movies, page=2, total_pages=5)
    }
    mock_fetch = create_mock_fetch_func(page_responses)

    # Convert page 1 to schemas
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Act: Call buffer method
    result_movies, _pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=5,
        year_min=None,
        year_max=None,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Spirited Away should appear at position 19 (from page 1), not moved
    assert len(result_movies) == 20
    assert result_movies[18].tmdb_id == 129, "Spirited Away should be at position 19 (index 18)"
    assert result_movies[18].title == "Spirited Away"

    # Verify first 18 are IDs 1-18, position 19 is Spirited Away (129), position 20 is ID 20
    result_ids = [movie.tmdb_id for movie in result_movies]
    assert result_ids[:18] == list(range(1, 19)), "First 18 should be movies 1-18"
    assert result_ids[18] == 129, "Position 19 should be Spirited Away (first occurrence)"
    assert result_ids[19] == 20, "Position 20 should be movie 20 (from page 2 after duplicate)"

    # Verify no duplicate of ID 129
    assert result_ids.count(129) == 1, "Spirited Away should appear exactly once"


def test_buffer_empty_results_after_deduplication() -> None:
    """Test buffer handles edge case of empty results after deduplication.

    Scenario: Page 1 has 10 movies, page 2 returns only duplicates (all 10 seen before).
    Expected: Return 10 unique movies, continue to page 3 if needed to try reaching 20.
    """
    # Arrange: Page 1 with 10 movies (IDs 1-10)
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 11)  # 1-10
    ]

    # Page 2: All duplicates (IDs 1-10 again)
    page2_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 11)  # Same IDs 1-10
    ]

    # Page 3: New movies 11-30
    page3_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(11, 31)  # 11-30 (20 new)
    ]

    # Setup page responses
    page_responses = {
        2: create_paginated_tmdb_response(page2_movies, page=2, total_pages=5),
        3: create_paginated_tmdb_response(page3_movies, page=3, total_pages=5),
    }
    mock_fetch = create_mock_fetch_func(page_responses)

    # Convert page 1 to schemas
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Act: Call buffer method
    result_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=5,
        year_min=None,
        year_max=None,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Should continue past empty page 2 to page 3, return 20 unique
    assert len(result_movies) == 20, "Should return 20 unique movies"
    assert pages_consumed == 3, "Should consume pages 1, 2 (all dupes), and 3"

    # Verify IDs are 1-20 (10 from page 1, 0 new from page 2, 10 from page 3)
    result_ids = [movie.tmdb_id for movie in result_movies]
    assert result_ids == list(range(1, 21)), "Should have movies 1-20"
    assert len(set(result_ids)) == 20, "All IDs should be unique"

    # Verify both buffer pages were fetched
    assert mock_fetch.call_count == 2
    mock_fetch.assert_any_call(2)
    mock_fetch.assert_any_call(3)


def test_buffer_deduplication_with_filters_applied_to_buffer_pages() -> None:
    """Test buffer applies same filters to buffer pages during deduplication.

    Scenario: Year filter 2020-2024 active, buffer pages should respect this filter.
    Expected: Buffer pages filtered correctly, deduplication still works.
    """
    # Arrange: Page 1 with 15 movies from 2020-2024 (IDs 1-15)
    page1_movies = [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(1, 16)  # 1-15
    ]

    # Page 2: Mix of old movies (filtered out) and new movies (2020-2024)
    # Include duplicate ID 15 + movies from 2019 (filtered) + new 2023 movies
    page2_movies = [
        create_tmdb_movie(
            tmdb_id=15, title="Movie 15", release_date="2023-01-01", vote_average=7.0
        ),  # Duplicate
        create_tmdb_movie(
            tmdb_id=100, title="Old Movie 1", release_date="2019-01-01", vote_average=7.0
        ),  # Filtered
        create_tmdb_movie(
            tmdb_id=101, title="Old Movie 2", release_date="2018-01-01", vote_average=7.0
        ),  # Filtered
    ] + [
        create_tmdb_movie(
            tmdb_id=i,
            title=f"Movie {i}",
            release_date="2023-01-01",
            vote_average=7.0
        )
        for i in range(16, 36)  # 16-35 (20 new movies from 2023)
    ]

    # Setup page responses
    page_responses = {
        2: create_paginated_tmdb_response(page2_movies, page=2, total_pages=5)
    }
    mock_fetch = create_mock_fetch_func(page_responses)

    # Convert page 1 to schemas
    filtered_movies = [convert_to_schema(movie) for movie in page1_movies]

    # Act: Call buffer method with year filter
    result_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies=filtered_movies,
        current_page=1,
        total_pages=5,
        year_min=2020,
        year_max=2024,
        rating_min=None,
        rating_max=None,
        fetch_next_page_func=mock_fetch,
    )

    # Assert: Should deduplicate ID 15, filter out 2019/2018 movies,
    # return 20 unique from 2020-2024
    assert len(result_movies) == 20, "Should return 20 unique movies"
    assert pages_consumed == 2, "Should consume pages 1 and 2"

    # Verify IDs are 1-20 (no old movie IDs 100, 101)
    result_ids = [movie.tmdb_id for movie in result_movies]
    assert result_ids == list(range(1, 21)), "Should have movies 1-20"
    assert 100 not in result_ids, "Old movie 100 should be filtered out"
    assert 101 not in result_ids, "Old movie 101 should be filtered out"
    assert result_ids.count(15) == 1, "ID 15 should appear exactly once (deduplicated)"

    # Verify all movies are from 2020-2024
    for movie in result_movies:
        assert movie.release_date is not None, f"Movie {movie.tmdb_id} should have release_date"
        year = movie.release_date.year
        assert 2020 <= year <= 2024, f"Movie {movie.tmdb_id} year {year} should be 2020-2024"
