"""
Unit tests for batch_operations.py batch fetch helper.

These tests focus on the fetch_movies_batch function that fetches multiple
movies from TMDB by ID in a single batch operation, handling partial failures
gracefully and providing structured logging.

Test coverage targets 90%+ (critical path) as this is a foundational helper.
"""

from unittest.mock import MagicMock, patch

from apps.core.services.api_response import ApiResponse
from apps.movie.schemas import MovieListItemSchema
from apps.movie.services.pipelines.batch import fetch_movies_batch
from apps.movie.tests.mock_paths import BATCH_LOGGER, BATCH_TMDB_GET_MOVIE_DETAILS
from apps.movie.tests.test_helpers import (
    create_mock_movie_detail_response,
    create_mock_tmdb_error_response,
)

# ============================================================================
# Successful Batch Fetch Tests
# ============================================================================


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_all_successful(mock_get_movie_details: MagicMock) -> None:
    """Test successful batch fetch when all movie IDs are valid."""

    # Arrange: Mock TMDB responses for multiple movies
    def mock_tmdb_response(movie_id: int) -> ApiResponse:
        return create_mock_movie_detail_response(
            tmdb_id=movie_id,
            title=f"Movie {movie_id}",
            release_date="2023-01-01",
            vote_average=8.0,
            runtime=120,
            poster_path=f"/poster_{movie_id}.jpg",
        )

    mock_get_movie_details.side_effect = mock_tmdb_response

    # Act: Fetch batch of movies
    movie_ids = [1, 2, 3]
    result = fetch_movies_batch(movie_ids)

    # Assert: All movies fetched successfully
    assert len(result) == 3
    assert all(isinstance(movie, MovieListItemSchema) for movie in result)
    assert result[0].tmdb_id == 1
    assert result[0].title == "Movie 1"
    assert result[1].tmdb_id == 2
    assert result[2].tmdb_id == 3

    # Assert: TMDB client called for each movie
    assert mock_get_movie_details.call_count == 3


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_single_movie(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch with a single movie ID."""
    # Arrange
    mock_get_movie_details.return_value = create_mock_movie_detail_response(
        tmdb_id=42,
        title="Single Movie",
        release_date="2023-06-15",
        vote_average=7.5,
        runtime=90,
        poster_path="/single.jpg",
    )

    # Act
    result = fetch_movies_batch([42])

    # Assert
    assert len(result) == 1
    assert result[0].tmdb_id == 42
    assert result[0].title == "Single Movie"


# ============================================================================
# Partial Failure Tests
# ============================================================================


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_partial_failures(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch when some movie IDs return 404 (graceful degradation)."""

    # Arrange: Mock mixed success and 404 responses
    def mock_tmdb_response(movie_id: int) -> ApiResponse:
        if movie_id == 2:
            # Simulate 404 for movie ID 2
            return create_mock_tmdb_error_response(404)

        return create_mock_movie_detail_response(
            tmdb_id=movie_id,
            title=f"Movie {movie_id}",
            release_date="2023-01-01",
            vote_average=8.0,
            runtime=120,
            poster_path=f"/poster_{movie_id}.jpg",
        )

    mock_get_movie_details.side_effect = mock_tmdb_response

    # Act: Fetch batch with one failing ID
    result = fetch_movies_batch([1, 2, 3])

    # Assert: Only successful fetches returned (2 out of 3)
    assert len(result) == 2
    assert result[0].tmdb_id == 1
    assert result[1].tmdb_id == 3
    # Movie ID 2 should be skipped
    assert all(movie.tmdb_id != 2 for movie in result)


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_multiple_failures(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch when multiple movie IDs fail."""

    # Arrange: Mock multiple failures
    def mock_tmdb_response(movie_id: int) -> ApiResponse:
        if movie_id in [2, 4, 5]:
            # Simulate various failure types
            return create_mock_tmdb_error_response(404)

        return create_mock_movie_detail_response(
            tmdb_id=movie_id,
            title=f"Movie {movie_id}",
            release_date="2023-01-01",
            vote_average=8.0,
            runtime=120,
            poster_path=f"/poster_{movie_id}.jpg",
        )

    mock_get_movie_details.side_effect = mock_tmdb_response

    # Act
    result = fetch_movies_batch([1, 2, 3, 4, 5])

    # Assert: Only successful fetches returned (2 out of 5)
    assert len(result) == 2
    assert result[0].tmdb_id == 1
    assert result[1].tmdb_id == 3


# ============================================================================
# Complete Failure Tests
# ============================================================================


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_all_failures(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch when all movie IDs fail."""
    # Arrange: All requests return 404
    mock_get_movie_details.return_value = create_mock_tmdb_error_response(404)

    # Act
    result = fetch_movies_batch([1, 2, 3])

    # Assert: Empty list returned
    assert len(result) == 0
    assert isinstance(result, list)


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_rate_limit_error(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch when rate limit is hit (should skip movie)."""

    # Arrange: Mock 429 rate limit response
    def mock_tmdb_response(movie_id: int) -> ApiResponse:
        if movie_id == 2:
            return create_mock_tmdb_error_response(429)

        return create_mock_movie_detail_response(
            tmdb_id=movie_id,
            title=f"Movie {movie_id}",
            release_date="2023-01-01",
            vote_average=8.0,
            runtime=120,
            poster_path=f"/poster_{movie_id}.jpg",
        )

    mock_get_movie_details.side_effect = mock_tmdb_response

    # Act: Fetch batch with one rate-limited request
    result = fetch_movies_batch([1, 2, 3])

    # Assert: Rate-limited movie skipped, others succeed
    assert len(result) == 2
    assert result[0].tmdb_id == 1
    assert result[1].tmdb_id == 3


# ============================================================================
# Edge Case Tests
# ============================================================================


def test_fetch_movies_batch_empty_input() -> None:
    """Test batch fetch with empty input list."""
    # Act
    result = fetch_movies_batch([])

    # Assert: Empty list returned without API calls
    assert len(result) == 0
    assert isinstance(result, list)


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_duplicate_ids(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch with duplicate movie IDs (should fetch each once)."""
    # Arrange
    mock_get_movie_details.return_value = create_mock_movie_detail_response(
        tmdb_id=1,
        title="Movie 1",
        release_date="2023-01-01",
        vote_average=8.0,
        runtime=120,
        poster_path="/poster.jpg",
    )

    # Act: Pass duplicate IDs
    result = fetch_movies_batch([1, 1, 1])

    # Assert: Deduplicated - fetch only once
    assert len(result) == 1
    assert mock_get_movie_details.call_count == 1
    assert result[0].tmdb_id == 1


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_invalid_data_format(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch when TMDB returns malformed data."""
    # Arrange: Mock invalid/incomplete data
    mock_get_movie_details.return_value = ApiResponse(
        status_code=200,
        data={"id": 1},  # Missing required fields like title
    )

    # Act: Fetch should handle validation error gracefully
    result = fetch_movies_batch([1])

    # Assert: Invalid data skipped
    assert len(result) == 0


@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_null_response_data(mock_get_movie_details: MagicMock) -> None:
    """Test batch fetch when TMDB returns null/None data."""
    # Arrange
    mock_get_movie_details.return_value = ApiResponse(status_code=200, data=None)

    # Act
    result = fetch_movies_batch([1])

    # Assert: Null data handled gracefully
    assert len(result) == 0


# ============================================================================
# Logging Tests
# ============================================================================


@patch(BATCH_LOGGER)
@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_logs_operation_start(
    mock_get_movie_details: MagicMock, mock_logger: MagicMock
) -> None:
    """Test that batch fetch logs operation start with movie count."""
    # Arrange
    mock_get_movie_details.return_value = create_mock_movie_detail_response(
        tmdb_id=1,
        title="Movie 1",
        release_date="2023-01-01",
        vote_average=8.0,
        runtime=120,
        poster_path="/poster.jpg",
    )

    # Act
    fetch_movies_batch([1, 2, 3])

    # Assert: Operation logged with metadata
    mock_logger.info.assert_called()
    # Check that info was called with batch operation details
    info_calls = list(mock_logger.info.call_args_list)
    assert len(info_calls) > 0
    # Verify first call contains batch fetch info
    first_call = info_calls[0]
    assert "extra" in first_call.kwargs
    assert first_call.kwargs["extra"]["operation"] == "fetch_movies_batch"


@patch(BATCH_LOGGER)
@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_logs_failures(
    mock_get_movie_details: MagicMock, mock_logger: MagicMock
) -> None:
    """Test that batch fetch logs individual failures."""
    # Arrange: Mock failure
    mock_get_movie_details.return_value = create_mock_tmdb_error_response(404)

    # Act
    fetch_movies_batch([999])

    # Assert: Failure logged
    mock_logger.warning.assert_called()
    warning_calls = list(mock_logger.warning.call_args_list)
    assert len(warning_calls) > 0


@patch(BATCH_LOGGER)
@patch(BATCH_TMDB_GET_MOVIE_DETAILS)
def test_fetch_movies_batch_logs_completion(
    mock_get_movie_details: MagicMock, mock_logger: MagicMock
) -> None:
    """Test that batch fetch logs completion with success/failure counts."""

    # Arrange: Mock mixed results
    def mock_tmdb_response(movie_id: int) -> ApiResponse:
        if movie_id == 2:
            return create_mock_tmdb_error_response(404)

        return create_mock_movie_detail_response(
            tmdb_id=movie_id,
            title=f"Movie {movie_id}",
            release_date="2023-01-01",
            vote_average=8.0,
            runtime=120,
            poster_path=f"/poster_{movie_id}.jpg",
        )

    mock_get_movie_details.side_effect = mock_tmdb_response

    # Act
    fetch_movies_batch([1, 2, 3])

    # Assert: Completion logged with counts
    mock_logger.info.assert_called()
    info_calls = list(mock_logger.info.call_args_list)
    # Should have start and end log calls
    assert len(info_calls) >= 2
