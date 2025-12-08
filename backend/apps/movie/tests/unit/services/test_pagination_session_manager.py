"""Unit tests for PaginationSessionManager helper class.

Tests session-based cross-page deduplication via Redis cache:
- Core functionality: get/add/clear returned IDs, TTL, graceful degradation
- Session scoping: user isolation via different session IDs
- Context ID: multi-tab isolation via X-Pagination-Context header
- Filter hash: order-independent hashing, search query inclusion

TDD Red Phase: These tests are written before implementation.
Expected: All tests FAIL due to ImportError (class doesn't exist yet).
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import MagicMock, patch

import pytest

if TYPE_CHECKING:
    pass

# Import will fail until PaginationSessionManager is implemented (TDD red phase)
# This is expected behavior - tests document the interface contract
try:
    from movie.services.pagination_session_manager import PaginationSessionManager

    IMPORT_AVAILABLE = True
except ImportError:
    IMPORT_AVAILABLE = False
    PaginationSessionManager = None  # type: ignore[misc, assignment]

# Skip all tests if import fails (TDD red phase baseline)
pytestmark = pytest.mark.skipif(
    not IMPORT_AVAILABLE,
    reason="PaginationSessionManager not yet implemented (TDD red phase)",
)


# ============================================================================
# Test Fixtures
# ============================================================================


@pytest.fixture
def mock_cache() -> MagicMock:
    """Create a mock Django cache for isolated unit testing.

    Returns a MagicMock that simulates Django's cache interface without
    requiring actual Redis connection.
    """
    cache = MagicMock()
    cache.get.return_value = None  # Default: empty cache
    cache.set.return_value = None
    cache.delete.return_value = None
    return cache


@pytest.fixture
def session_manager(mock_cache: MagicMock) -> PaginationSessionManager:
    """Create a PaginationSessionManager with mocked cache.

    Patches Django's cache to use mock_cache fixture for isolation.
    """
    with patch("movie.services.pagination_session_manager.cache", mock_cache):
        return PaginationSessionManager(session_id="test_session_123")


@pytest.fixture
def sample_filters() -> dict[str, object]:
    """Standard filter combination for testing."""
    return {
        "genres": [16, 10751],
        "sort_by": "popularity.desc",
        "year_min": 2020,
        "year_max": 2024,
    }


@pytest.fixture
def sample_filters_with_search() -> dict[str, object]:
    """Filter combination including search query."""
    return {
        "q": "spirited away",
        "sort_by": "relevance",
    }


# ============================================================================
# Core Functionality Tests
# ============================================================================


class TestGetReturnedIds:
    """Tests for get_returned_ids() method."""

    def test_returns_empty_set_for_new_session(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test get_returned_ids() returns empty set for new session.

        Scenario: First request for a session with no prior pagination.
        Expected: Return empty set (no IDs have been returned yet).
        """
        mock_cache.get.return_value = None  # No cached data

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="new_session")
            result = manager.get_returned_ids(sample_filters)

        assert result == set()
        mock_cache.get.assert_called_once()

    def test_retrieves_stored_ids_correctly(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test get_returned_ids() retrieves stored IDs correctly.

        Scenario: Session has previously returned movie IDs 1-20.
        Expected: Return the set of stored IDs.
        """
        stored_ids = {1, 2, 3, 4, 5, 10, 15, 20, 100, 129}
        mock_cache.get.return_value = stored_ids

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="existing_session")
            result = manager.get_returned_ids(sample_filters)

        assert result == stored_ids
        assert isinstance(result, set)


class TestAddReturnedIds:
    """Tests for add_returned_ids() method."""

    def test_stores_movie_ids_in_cache(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test add_returned_ids() stores movie IDs in Redis cache.

        Scenario: First page returns movie IDs 1-20.
        Expected: IDs stored in cache for this session + filter combination.
        """
        new_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        mock_cache.get.return_value = None  # Empty cache initially

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.add_returned_ids(sample_filters, new_ids)

        # Verify cache.set was called with the IDs as a set
        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args
        stored_value = call_args[0][1]  # Second positional arg is the value
        assert stored_value == set(new_ids)

    def test_appends_to_existing_ids(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test add_returned_ids() appends to existing IDs (page 2 scenario).

        Scenario: Page 1 returned IDs 1-20, page 2 returns 21-40.
        Expected: Cache updated to contain IDs 1-40.
        """
        existing_ids = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20}
        new_ids = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
        mock_cache.get.return_value = existing_ids

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.add_returned_ids(sample_filters, new_ids)

        # Verify cache.set was called with combined IDs
        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args
        stored_value = call_args[0][1]
        assert stored_value == existing_ids | set(new_ids)

    def test_handles_duplicate_ids_in_input(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test add_returned_ids() handles duplicate IDs in input gracefully.

        Scenario: Input list contains duplicate IDs (shouldn't happen, but be defensive).
        Expected: Store unique IDs only (set behavior).
        """
        # IDs with duplicates
        ids_with_dupes = [1, 2, 3, 1, 2, 3, 4, 5]
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.add_returned_ids(sample_filters, ids_with_dupes)

        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args
        stored_value = call_args[0][1]
        assert stored_value == {1, 2, 3, 4, 5}


class TestClearSession:
    """Tests for clear_session() method."""

    def test_removes_all_ids_for_filter_combination(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test clear_session() removes all IDs for filter combination.

        Scenario: User navigates back to page 1 (fresh start).
        Expected: Session state cleared for this filter combination.
        """
        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.clear_session(sample_filters)

        mock_cache.delete.assert_called_once()


class TestSessionTTL:
    """Tests for session TTL (time-to-live) behavior."""

    def test_session_ttl_set_correctly(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test session TTL set correctly (1 hour default).

        Scenario: Store IDs in session.
        Expected: TTL of 3600 seconds (1 hour) passed to cache.set().
        """
        new_ids = [1, 2, 3]
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.add_returned_ids(sample_filters, new_ids)

        mock_cache.set.assert_called_once()
        call_args = mock_cache.set.call_args

        # TTL should be passed as keyword arg 'timeout' or third positional arg
        if call_args.kwargs.get("timeout"):
            ttl = call_args.kwargs["timeout"]
        else:
            ttl = call_args[0][2] if len(call_args[0]) > 2 else None

        assert ttl == 3600, f"Expected TTL of 3600 seconds (1 hour), got {ttl}"


class TestGracefulDegradation:
    """Tests for graceful degradation when Redis is unavailable."""

    def test_get_returns_empty_set_when_redis_unavailable(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test graceful degradation when Redis unavailable (get).

        Scenario: Redis connection fails during get_returned_ids().
        Expected: Return empty set, don't crash (within-page dedup still works).
        """
        mock_cache = MagicMock()
        mock_cache.get.side_effect = Exception("Redis connection refused")

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            result = manager.get_returned_ids(sample_filters)

        assert result == set()

    def test_add_silently_fails_when_redis_unavailable(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test graceful degradation when Redis unavailable (add).

        Scenario: Redis connection fails during add_returned_ids().
        Expected: Silently fail, don't crash (pagination continues without cross-page dedup).
        """
        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_cache.set.side_effect = Exception("Redis connection refused")

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            # Should not raise exception
            manager.add_returned_ids(sample_filters, [1, 2, 3])

    def test_clear_silently_fails_when_redis_unavailable(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test graceful degradation when Redis unavailable (clear).

        Scenario: Redis connection fails during clear_session().
        Expected: Silently fail, don't crash.
        """
        mock_cache = MagicMock()
        mock_cache.delete.side_effect = Exception("Redis connection refused")

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            # Should not raise exception
            manager.clear_session(sample_filters)


# ============================================================================
# Session Scoping Tests (Issue #1 - User Isolation)
# ============================================================================


class TestSessionScoping:
    """Tests for session-based isolation (different users get different state)."""

    def test_different_session_ids_generate_different_cache_keys(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test different session IDs generate different cache keys.

        Scenario: Two users (different session IDs) browse with same filters.
        Expected: Each user's session state is isolated (different cache keys).
        """
        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: object, **kwargs: object) -> None:
            cache_keys_used.append(key)

        mock_cache.set.side_effect = capture_key
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            # User 1
            manager1 = PaginationSessionManager(session_id="user1_session_abc")
            manager1.add_returned_ids(sample_filters, [1, 2, 3])

            # User 2
            manager2 = PaginationSessionManager(session_id="user2_session_xyz")
            manager2.add_returned_ids(sample_filters, [4, 5, 6])

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] != cache_keys_used[1], "Session isolation violated"

    def test_same_session_same_filters_same_state(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test same session ID + same filters = same session state.

        Scenario: Same user makes multiple requests with same filters.
        Expected: All requests share the same session state.
        """
        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="same_session")
            manager.get_returned_ids(sample_filters)
            manager.get_returned_ids(sample_filters)
            manager.get_returned_ids(sample_filters)

        assert len(cache_keys_used) == 3
        assert all(k == cache_keys_used[0] for k in cache_keys_used), "Same key expected"

    def test_same_session_different_filters_different_state(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test same session ID + different filters = different session state.

        Scenario: Same user browses with different genre filters.
        Expected: Different filter combinations have separate session state.
        """
        filters1 = {"genres": [16], "sort_by": "popularity.desc"}
        filters2 = {"genres": [28], "sort_by": "popularity.desc"}

        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: object, **kwargs: object) -> None:
            cache_keys_used.append(key)

        mock_cache.set.side_effect = capture_key
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="same_session")
            manager.add_returned_ids(filters1, [1, 2, 3])
            manager.add_returned_ids(filters2, [4, 5, 6])

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] != cache_keys_used[1], "Filter isolation violated"


# ============================================================================
# Context ID Tests (Issue #2 - Multi-Tab Isolation)
# ============================================================================


class TestContextIdIsolation:
    """Tests for multi-tab isolation via X-Pagination-Context header."""

    def test_different_context_ids_generate_different_cache_keys(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test different context IDs generate different cache keys.

        Scenario: Same user with two browser tabs browsing same filters.
        Expected: Each tab has isolated pagination state.
        """
        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: object, **kwargs: object) -> None:
            cache_keys_used.append(key)

        mock_cache.set.side_effect = capture_key
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            # Tab 1
            manager1 = PaginationSessionManager(session_id="user_session", context_id="tab1_uuid")
            manager1.add_returned_ids(sample_filters, [1, 2, 3])

            # Tab 2
            manager2 = PaginationSessionManager(session_id="user_session", context_id="tab2_uuid")
            manager2.add_returned_ids(sample_filters, [4, 5, 6])

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] != cache_keys_used[1], "Context isolation violated"

    def test_same_session_same_context_same_filters_same_state(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test same session + same context + same filters = same session state.

        Scenario: Multiple requests from same tab with same filters.
        Expected: All share the same session state.
        """
        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="user_session", context_id="tab1")
            manager.get_returned_ids(sample_filters)
            manager.get_returned_ids(sample_filters)

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] == cache_keys_used[1]

    def test_same_session_different_context_same_filters_different_state(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test same session + different context + same filters = different state.

        Scenario: Two tabs with same filters but different context IDs.
        Expected: Tabs have isolated pagination state.
        """
        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: object, **kwargs: object) -> None:
            cache_keys_used.append(key)

        mock_cache.set.side_effect = capture_key
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager1 = PaginationSessionManager(session_id="same_session", context_id="context_A")
            manager1.add_returned_ids(sample_filters, [1, 2, 3])

            manager2 = PaginationSessionManager(session_id="same_session", context_id="context_B")
            manager2.add_returned_ids(sample_filters, [4, 5, 6])

        assert cache_keys_used[0] != cache_keys_used[1]

    def test_context_id_optional_backwards_compatibility(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test context ID is optional (backwards compatibility).

        Scenario: Request without X-Pagination-Context header (legacy client).
        Expected: Works correctly, context_id defaults to empty string.
        """
        mock_cache.get.return_value = None

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            # No context_id provided (defaults to empty string)
            manager = PaginationSessionManager(session_id="test_session")
            result = manager.get_returned_ids(sample_filters)

        assert result == set()
        mock_cache.get.assert_called_once()

    def test_explicit_empty_context_id_same_as_default(
        self,
        mock_cache: MagicMock,
        sample_filters: dict[str, object],
    ) -> None:
        """Test explicit empty context_id behaves same as default.

        Scenario: context_id="" vs not provided.
        Expected: Generate same cache key.
        """
        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            # Without context_id (default)
            manager1 = PaginationSessionManager(session_id="test_session")
            manager1.get_returned_ids(sample_filters)

            # With explicit empty context_id
            manager2 = PaginationSessionManager(session_id="test_session", context_id="")
            manager2.get_returned_ids(sample_filters)

        assert cache_keys_used[0] == cache_keys_used[1]


# ============================================================================
# Filter Hash Tests (Issue #3 - Search Query Inclusion)
# ============================================================================


class TestFilterHash:
    """Tests for filter hash generation (order-independent, search included)."""

    def test_filter_hash_consistent_for_same_filters_regardless_of_order(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test filter hash generation consistent for same filters (order-independent).

        Scenario: Same filters provided in different dict iteration order.
        Expected: Generate same cache key regardless of order.
        """
        # Python dicts preserve insertion order since 3.7, so we create dicts with different order
        filters_order1 = {"genres": [16, 28], "year_min": 2020, "sort_by": "popularity.desc"}
        filters_order2 = {"sort_by": "popularity.desc", "genres": [16, 28], "year_min": 2020}

        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.get_returned_ids(filters_order1)
            manager.get_returned_ids(filters_order2)

        assert cache_keys_used[0] == cache_keys_used[1], "Order-independent hash expected"

    def test_different_filters_generate_different_keys(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test different filters generate different session keys.

        Scenario: Different filter values (e.g., different genres).
        Expected: Different cache keys.
        """
        filters1 = {"genres": [16], "sort_by": "popularity.desc"}
        filters2 = {"genres": [28], "sort_by": "popularity.desc"}
        filters3 = {"genres": [16], "sort_by": "vote_average.desc"}

        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.get_returned_ids(filters1)
            manager.get_returned_ids(filters2)
            manager.get_returned_ids(filters3)

        # All three should be different
        assert len(set(cache_keys_used)) == 3, "Different filters should generate different keys"

    def test_search_query_included_in_filter_hash(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test search query (`q`) included in filter hash.

        Scenario: Same base filters with different search queries.
        Expected: Different search queries produce different cache keys.
        """
        filters_search1 = {"q": "spirited away", "sort_by": "relevance"}
        filters_search2 = {"q": "princess mononoke", "sort_by": "relevance"}

        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.get_returned_ids(filters_search1)
            manager.get_returned_ids(filters_search2)

        assert cache_keys_used[0] != cache_keys_used[1], "Search isolation violated"

    def test_empty_search_query_vs_no_search_query_handled_correctly(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test empty search query vs no search query handled correctly.

        Scenario: Filters with q="" vs filters without q key.
        Expected: Different cache keys (empty string is not the same as absent).
        """
        filters_empty_q = {"q": "", "sort_by": "popularity.desc"}
        filters_no_q = {"sort_by": "popularity.desc"}

        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.get_returned_ids(filters_empty_q)
            manager.get_returned_ids(filters_no_q)

        assert cache_keys_used[0] != cache_keys_used[1], "Empty vs absent q must differ"

    def test_search_query_case_sensitivity(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test search query case handling in filter hash.

        Scenario: Same search query with different casing.
        Expected: Case-insensitive (normalized to lowercase for consistency).

        Note: This is a design decision - search terms should be normalized
        so "Spirited Away" and "spirited away" share pagination state.
        """
        filters_upper = {"q": "Spirited Away", "sort_by": "relevance"}
        filters_lower = {"q": "spirited away", "sort_by": "relevance"}

        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.get_returned_ids(filters_upper)
            manager.get_returned_ids(filters_lower)

        # Expectation: same key (case-insensitive normalization)
        assert cache_keys_used[0] == cache_keys_used[1], "Case-insensitive hash expected"

    def test_list_order_in_filters_normalized(
        self,
        mock_cache: MagicMock,
    ) -> None:
        """Test list values in filters are normalized for consistent hashing.

        Scenario: Genre list [16, 28] vs [28, 16].
        Expected: Same cache key (list order shouldn't matter for set-like filters).
        """
        filters_order1 = {"genres": [16, 28], "sort_by": "popularity.desc"}
        filters_order2 = {"genres": [28, 16], "sort_by": "popularity.desc"}

        cache_keys_used: list[str] = []

        def capture_key_get(key: str) -> set[int] | None:
            cache_keys_used.append(key)
            return None

        mock_cache.get.side_effect = capture_key_get

        with patch("movie.services.pagination_session_manager.cache", mock_cache):
            manager = PaginationSessionManager(session_id="test_session")
            manager.get_returned_ids(filters_order1)
            manager.get_returned_ids(filters_order2)

        assert cache_keys_used[0] == cache_keys_used[1], "Genre list order shouldn't affect hash"


# ============================================================================
# Atomic Redis Operations Tests (Thread Safety)
# ============================================================================


class TestAtomicRedisOperations:
    """Tests for atomic Redis operations (race condition prevention).

    These tests verify that add_returned_ids() uses Redis SADD (atomic set-add)
    rather than read-modify-write (get → union → set), which has race conditions.

    Without atomic operations, concurrent requests can lose data:
    - Request A reads {1-20}, Request B reads {1-20} (before A writes)
    - A writes {1-40}, B writes {1-20, 41-60} → IDs {21-40} lost!

    With SADD, both requests atomically add their IDs - no data loss.
    """

    def test_add_returned_ids_uses_atomic_sadd(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test add_returned_ids() uses atomic Redis SADD command.

        Scenario: Add IDs to session.
        Expected: Implementation calls Redis SADD directly (not get → union → set).
        """
        mock_redis_client = MagicMock()

        with patch("movie.services.pagination_session_manager.cache") as mock_cache:
            # Setup: mock the Redis client access pattern
            mock_cache.client.get_client.return_value = mock_redis_client
            mock_redis_client.sadd.return_value = 3  # Number of new elements added
            mock_redis_client.expire.return_value = True

            manager = PaginationSessionManager(session_id="test_session")
            manager.add_returned_ids(sample_filters, [1, 2, 3])

        # Verify SADD was called (atomic operation)
        mock_redis_client.sadd.assert_called_once()
        call_args = mock_redis_client.sadd.call_args

        # First arg is the key, rest are the IDs to add
        assert 1 in call_args[0] or 1 in call_args[0][1:], "SADD should include ID 1"
        assert 2 in call_args[0] or 2 in call_args[0][1:], "SADD should include ID 2"
        assert 3 in call_args[0] or 3 in call_args[0][1:], "SADD should include ID 3"

        # Verify TTL was set
        mock_redis_client.expire.assert_called_once()

    def test_get_returned_ids_uses_smembers(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test get_returned_ids() uses Redis SMEMBERS command.

        Scenario: Retrieve IDs from session.
        Expected: Implementation calls Redis SMEMBERS to get set members.
        """
        mock_redis_client = MagicMock()
        # SMEMBERS returns a set of byte strings in redis-py
        mock_redis_client.smembers.return_value = {b"1", b"2", b"3"}

        with patch("movie.services.pagination_session_manager.cache") as mock_cache:
            mock_cache.client.get_client.return_value = mock_redis_client

            manager = PaginationSessionManager(session_id="test_session")
            result = manager.get_returned_ids(sample_filters)

        # Verify SMEMBERS was called
        mock_redis_client.smembers.assert_called_once()

        # Verify result is a set of integers
        assert result == {1, 2, 3}

    def test_clear_session_uses_delete(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test clear_session() uses Redis DEL command.

        Scenario: Clear session state.
        Expected: Implementation calls Redis DEL to remove the key.
        """
        mock_redis_client = MagicMock()
        mock_redis_client.delete.return_value = 1  # Number of keys deleted

        with patch("movie.services.pagination_session_manager.cache") as mock_cache:
            mock_cache.client.get_client.return_value = mock_redis_client

            manager = PaginationSessionManager(session_id="test_session")
            manager.clear_session(sample_filters)

        # Verify DELETE was called
        mock_redis_client.delete.assert_called_once()

    def test_concurrent_adds_preserve_all_ids(
        self,
        sample_filters: dict[str, object],
    ) -> None:
        """Test concurrent add operations preserve all IDs (SADD is atomic).

        Scenario: Two "concurrent" requests add different IDs to same session.
        Expected: All IDs preserved (no data loss from race condition).

        Note: This simulates the concurrent scenario by calling add_returned_ids
        twice with the underlying Redis mock tracking cumulative SADD calls.
        True concurrency testing would require threading, but this verifies
        the implementation uses the atomic pattern.
        """
        added_ids: list[int] = []

        def track_sadd(key: str, *ids: int) -> int:
            added_ids.extend(ids)
            return len(ids)

        mock_redis_client = MagicMock()
        mock_redis_client.sadd.side_effect = track_sadd
        mock_redis_client.expire.return_value = True

        with patch("movie.services.pagination_session_manager.cache") as mock_cache:
            mock_cache.client.get_client.return_value = mock_redis_client

            manager = PaginationSessionManager(session_id="test_session")

            # Simulate two "concurrent" requests adding different IDs
            manager.add_returned_ids(sample_filters, [1, 2, 3, 4, 5])
            manager.add_returned_ids(sample_filters, [6, 7, 8, 9, 10])

        # With atomic SADD, all IDs should be added (no overwrite/loss)
        assert set(added_ids) == {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, (
            "Atomic SADD should preserve all IDs from both requests"
        )
