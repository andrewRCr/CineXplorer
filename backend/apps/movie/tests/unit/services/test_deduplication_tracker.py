"""Unit tests for DeduplicationTracker helper class.

Tests session-based cross-page deduplication via Redis cache:
- Core functionality: get/add/clear returned IDs, TTL, graceful degradation
- Session scoping: user isolation via different session IDs
- Context ID: multi-tab isolation via X-Pagination-Context header
- Params hash: deterministic hashing of BrowseServiceParams
- Atomic operations: SADD/SMEMBERS/DEL for thread safety

All tests mock the AtomicSetOperations Protocol interface, not the raw Redis
client. The adapter handles bytes↔int conversion internally.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from apps.movie.services.api_boundary.browse_service_params import BrowseServiceParams
from apps.movie.services.deduplication_tracker import DeduplicationTracker
from apps.movie.tests.mock_paths import DEDUP_GET_CLIENT

# Alias for backwards compatibility with existing tests
GET_CLIENT_PATH = DEDUP_GET_CLIENT


# ============================================================================
# Test Fixtures
# ============================================================================


@pytest.fixture
def mock_client() -> MagicMock:
    """Create a mock AtomicSetOperations client for isolated unit testing.

    Returns a MagicMock that simulates the AtomicSetOperations Protocol interface.
    Unlike raw Redis, smembers returns set[int] (adapter handles conversion).
    """
    client = MagicMock()
    client.smembers.return_value = set()  # Default: empty set of ints
    client.sadd.return_value = 0  # Default: no new elements added
    client.delete.return_value = False  # Default: key didn't exist
    client.expire.return_value = True
    return client


@pytest.fixture
def sample_params() -> BrowseServiceParams:
    """Standard params combination for testing."""
    return BrowseServiceParams(
        genres="16,10751",
        sort_by="popularity.desc",
        year_min=2020,
        year_max=2024,
    )


@pytest.fixture
def sample_params_with_search() -> BrowseServiceParams:
    """Params combination including search-like filters."""
    return BrowseServiceParams(
        keywords="spirited,away",
        sort_by="relevance",
    )


# ============================================================================
# Core Functionality Tests
# ============================================================================


class TestGetReturnedIds:
    """Tests for get_returned_ids() method."""

    def test_returns_empty_set_for_new_session(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test get_returned_ids() returns empty set for new session.

        Scenario: First request for a session with no prior pagination.
        Expected: Return empty set (no IDs have been returned yet).
        """
        mock_client.smembers.return_value = set()  # No cached data

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="new_session")
            result = manager.get_returned_ids(sample_params)

        assert result == set()
        mock_client.smembers.assert_called_once()

    def test_retrieves_stored_ids_correctly(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test get_returned_ids() retrieves stored IDs correctly.

        Scenario: Session has previously returned movie IDs 1-20.
        Expected: Return the set of stored IDs.
        """
        # Protocol adapter returns set[int] directly (not bytes)
        stored_ids = {1, 2, 3, 4, 5, 10, 15, 20, 100, 129}
        mock_client.smembers.return_value = stored_ids

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="existing_session")
            result = manager.get_returned_ids(sample_params)

        assert result == stored_ids
        assert isinstance(result, set)


class TestAddReturnedIds:
    """Tests for add_returned_ids() method."""

    def test_stores_movie_ids_in_cache(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test add_returned_ids() stores movie IDs via Redis SADD.

        Scenario: First page returns movie IDs 1-20.
        Expected: IDs stored via SADD for this session + params combination.
        """
        new_ids = list(range(1, 21))  # [1, 2, ..., 20]

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.add_returned_ids(sample_params, new_ids)

        # Verify SADD was called with all IDs
        mock_client.sadd.assert_called_once()
        call_args = mock_client.sadd.call_args
        # First arg is key, rest are IDs
        added_ids = set(call_args[0][1:])
        assert added_ids == set(new_ids)

    def test_appends_to_existing_ids(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test add_returned_ids() appends to existing IDs (page 2 scenario).

        Scenario: Page 1 returned IDs 1-20, page 2 returns 21-40.
        Expected: SADD adds new IDs to existing set (atomic, no read needed).

        Note: With atomic SADD, we don't need to read existing IDs first.
        Redis handles the union internally.
        """
        new_ids = list(range(21, 41))  # [21, 22, ..., 40]

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.add_returned_ids(sample_params, new_ids)

        # Verify SADD was called (atomic add, no read required)
        mock_client.sadd.assert_called_once()
        call_args = mock_client.sadd.call_args
        added_ids = set(call_args[0][1:])
        assert added_ids == set(new_ids)

    def test_handles_duplicate_ids_in_input(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test add_returned_ids() handles duplicate IDs in input gracefully.

        Scenario: Input list contains duplicate IDs (shouldn't happen, but defensive).
        Expected: SADD handles duplicates naturally (set semantics).
        """
        ids_with_dupes = [1, 2, 3, 1, 2, 3, 4, 5]

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.add_returned_ids(sample_params, ids_with_dupes)

        # SADD called - Redis handles dedup internally
        mock_client.sadd.assert_called_once()


class TestClearSession:
    """Tests for clear_session() method."""

    def test_removes_all_ids_for_params_combination(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test clear_session() removes all IDs for params combination.

        Scenario: User navigates back to page 1 (fresh start).
        Expected: Session state cleared via Redis DELETE.
        """
        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.clear_session(sample_params)

        mock_client.delete.assert_called_once()


class TestSessionTTL:
    """Tests for session TTL (time-to-live) behavior."""

    def test_session_ttl_set_correctly(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test session TTL set correctly (1 hour default).

        Scenario: Store IDs in session.
        Expected: TTL of 3600 seconds (1 hour) set via EXPIRE.
        """
        new_ids = [1, 2, 3]

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.add_returned_ids(sample_params, new_ids)

        # Verify EXPIRE was called with 3600 seconds
        mock_client.expire.assert_called_once()
        call_args = mock_client.expire.call_args
        ttl = call_args[0][1]
        assert ttl == 3600, f"Expected TTL of 3600 seconds (1 hour), got {ttl}"


class TestGracefulDegradation:
    """Tests for graceful degradation when Redis is unavailable."""

    def test_get_returns_empty_set_when_redis_unavailable(
        self,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test graceful degradation when Redis unavailable (get).

        Scenario: Redis connection fails during get_returned_ids().
        Expected: Return empty set, don't crash (within-page dedup still works).
        """
        with patch(GET_CLIENT_PATH, return_value=None):
            manager = DeduplicationTracker(session_id="test_session")
            result = manager.get_returned_ids(sample_params)

        assert result == set()

    def test_add_silently_fails_when_redis_unavailable(
        self,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test graceful degradation when Redis unavailable (add).

        Scenario: Redis connection fails during add_returned_ids().
        Expected: Silently fail, don't crash (pagination continues without cross-page dedup).
        """
        with patch(GET_CLIENT_PATH, return_value=None):
            manager = DeduplicationTracker(session_id="test_session")
            # Should not raise exception
            manager.add_returned_ids(sample_params, [1, 2, 3])

    def test_clear_silently_fails_when_redis_unavailable(
        self,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test graceful degradation when Redis unavailable (clear).

        Scenario: Redis connection fails during clear_session().
        Expected: Silently fail, don't crash.
        """
        with patch(GET_CLIENT_PATH, return_value=None):
            manager = DeduplicationTracker(session_id="test_session")
            # Should not raise exception
            manager.clear_session(sample_params)


# ============================================================================
# Session Scoping Tests (Issue #1 - User Isolation)
# ============================================================================


class TestSessionScoping:
    """Tests for session-based isolation (different users get different state)."""

    def test_different_session_ids_generate_different_cache_keys(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test different session IDs generate different cache keys.

        Scenario: Two users (different session IDs) browse with same params.
        Expected: Each user's session state is isolated (different cache keys).
        """
        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: int) -> int:
            cache_keys_used.append(key)
            return len(args)  # Return number of IDs added

        mock_client.sadd.side_effect = capture_key

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            # User 1
            manager1 = DeduplicationTracker(session_id="user1_session_abc")
            manager1.add_returned_ids(sample_params, [1, 2, 3])

            # User 2
            manager2 = DeduplicationTracker(session_id="user2_session_xyz")
            manager2.add_returned_ids(sample_params, [4, 5, 6])

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] != cache_keys_used[1], "Session isolation violated"

    def test_same_session_same_params_same_state(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test same session ID + same params = same session state.

        Scenario: Same user makes multiple requests with same params.
        Expected: All requests share the same session state (same cache key).
        """
        cache_keys_used: list[str] = []

        def capture_key_smembers(key: str) -> set[int]:
            cache_keys_used.append(key)
            return set()

        mock_client.smembers.side_effect = capture_key_smembers

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="same_session")
            manager.get_returned_ids(sample_params)
            manager.get_returned_ids(sample_params)
            manager.get_returned_ids(sample_params)

        assert len(cache_keys_used) == 3
        assert all(k == cache_keys_used[0] for k in cache_keys_used), "Same key expected"

    def test_same_session_different_params_different_state(
        self,
        mock_client: MagicMock,
    ) -> None:
        """Test same session ID + different params = different session state.

        Scenario: Same user browses with different genre params.
        Expected: Different params combinations have separate session state.
        """
        params1 = BrowseServiceParams(genres="16", sort_by="popularity.desc")
        params2 = BrowseServiceParams(genres="28", sort_by="popularity.desc")

        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: int) -> int:
            cache_keys_used.append(key)
            return len(args)

        mock_client.sadd.side_effect = capture_key

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="same_session")
            manager.add_returned_ids(params1, [1, 2, 3])
            manager.add_returned_ids(params2, [4, 5, 6])

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] != cache_keys_used[1], "Params isolation violated"


# ============================================================================
# Context ID Tests (Issue #2 - Multi-Tab Isolation)
# ============================================================================


class TestContextIdIsolation:
    """Tests for multi-tab isolation via X-Pagination-Context header."""

    def test_different_context_ids_generate_different_cache_keys(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test different context IDs generate different cache keys.

        Scenario: Same user with two browser tabs browsing same params.
        Expected: Each tab has isolated pagination state.
        """
        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: int) -> int:
            cache_keys_used.append(key)
            return len(args)

        mock_client.sadd.side_effect = capture_key

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            # Tab 1
            manager1 = DeduplicationTracker(session_id="user_session", context_id="tab1_uuid")
            manager1.add_returned_ids(sample_params, [1, 2, 3])

            # Tab 2
            manager2 = DeduplicationTracker(session_id="user_session", context_id="tab2_uuid")
            manager2.add_returned_ids(sample_params, [4, 5, 6])

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] != cache_keys_used[1], "Context isolation violated"

    def test_same_session_same_context_same_params_same_state(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test same session + same context + same params = same session state.

        Scenario: Multiple requests from same tab with same params.
        Expected: All share the same session state.
        """
        cache_keys_used: list[str] = []

        def capture_key_smembers(key: str) -> set[int]:
            cache_keys_used.append(key)
            return set()

        mock_client.smembers.side_effect = capture_key_smembers

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="user_session", context_id="tab1")
            manager.get_returned_ids(sample_params)
            manager.get_returned_ids(sample_params)

        assert len(cache_keys_used) == 2
        assert cache_keys_used[0] == cache_keys_used[1]

    def test_same_session_different_context_same_params_different_state(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test same session + different context + same params = different state.

        Scenario: Two tabs with same params but different context IDs.
        Expected: Tabs have isolated pagination state.
        """
        cache_keys_used: list[str] = []

        def capture_key(key: str, *args: int) -> int:
            cache_keys_used.append(key)
            return len(args)

        mock_client.sadd.side_effect = capture_key

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager1 = DeduplicationTracker(session_id="same_session", context_id="context_A")
            manager1.add_returned_ids(sample_params, [1, 2, 3])

            manager2 = DeduplicationTracker(session_id="same_session", context_id="context_B")
            manager2.add_returned_ids(sample_params, [4, 5, 6])

        assert cache_keys_used[0] != cache_keys_used[1]

    def test_context_id_optional_backwards_compatibility(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test context ID is optional (backwards compatibility).

        Scenario: Request without X-Pagination-Context header (legacy client).
        Expected: Works correctly, context_id defaults to empty string.
        """
        mock_client.smembers.return_value = set()

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            # No context_id provided (defaults to empty string)
            manager = DeduplicationTracker(session_id="test_session")
            result = manager.get_returned_ids(sample_params)

        assert result == set()
        mock_client.smembers.assert_called_once()

    def test_explicit_empty_context_id_same_as_default(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test explicit empty context_id behaves same as default.

        Scenario: context_id="" vs not provided.
        Expected: Generate same cache key.
        """
        cache_keys_used: list[str] = []

        def capture_key_smembers(key: str) -> set[int]:
            cache_keys_used.append(key)
            return set()

        mock_client.smembers.side_effect = capture_key_smembers

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            # Without context_id (default)
            manager1 = DeduplicationTracker(session_id="test_session")
            manager1.get_returned_ids(sample_params)

            # With explicit empty context_id
            manager2 = DeduplicationTracker(session_id="test_session", context_id="")
            manager2.get_returned_ids(sample_params)

        assert cache_keys_used[0] == cache_keys_used[1]


# ============================================================================
# Params Hash Tests
# ============================================================================


class TestParamsHash:
    """Tests for params hash generation (deterministic hashing)."""

    def test_same_params_generate_same_hash(
        self,
        mock_client: MagicMock,
    ) -> None:
        """Test same params generate same cache key.

        Scenario: Identical BrowseServiceParams instances.
        Expected: Generate same cache key.
        """
        params1 = BrowseServiceParams(genres="16,28", sort_by="popularity.desc", year_min=2020)
        params2 = BrowseServiceParams(genres="16,28", sort_by="popularity.desc", year_min=2020)

        cache_keys_used: list[str] = []

        def capture_key_smembers(key: str) -> set[int]:
            cache_keys_used.append(key)
            return set()

        mock_client.smembers.side_effect = capture_key_smembers

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.get_returned_ids(params1)
            manager.get_returned_ids(params2)

        assert cache_keys_used[0] == cache_keys_used[1], "Same params should hash equally"

    def test_different_params_generate_different_keys(
        self,
        mock_client: MagicMock,
    ) -> None:
        """Test different params generate different session keys.

        Scenario: Different param values (e.g., different genres).
        Expected: Different cache keys.
        """
        params1 = BrowseServiceParams(genres="16", sort_by="popularity.desc")
        params2 = BrowseServiceParams(genres="28", sort_by="popularity.desc")
        params3 = BrowseServiceParams(genres="16", sort_by="vote_average.desc")

        cache_keys_used: list[str] = []

        def capture_key_smembers(key: str) -> set[int]:
            cache_keys_used.append(key)
            return set()

        mock_client.smembers.side_effect = capture_key_smembers

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.get_returned_ids(params1)
            manager.get_returned_ids(params2)
            manager.get_returned_ids(params3)

        # All three should be different
        assert len(set(cache_keys_used)) == 3, "Different params should generate different keys"

    def test_none_values_excluded_from_hash(
        self,
        mock_client: MagicMock,
    ) -> None:
        """Test None values are excluded from hash (exclude_none=True).

        Scenario: Params with explicit None vs params without field.
        Expected: Both hash the same (None values excluded).
        """
        # BrowseServiceParams has many optional fields that default to None
        params_minimal = BrowseServiceParams(genres="16")
        params_explicit_none = BrowseServiceParams(genres="16", sort_by=None, year_min=None)

        cache_keys_used: list[str] = []

        def capture_key_smembers(key: str) -> set[int]:
            cache_keys_used.append(key)
            return set()

        mock_client.smembers.side_effect = capture_key_smembers

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.get_returned_ids(params_minimal)
            manager.get_returned_ids(params_explicit_none)

        assert cache_keys_used[0] == cache_keys_used[1], "None values should not affect hash"


# ============================================================================
# Atomic Redis Operations Tests (Thread Safety)
# ============================================================================


class TestAtomicRedisOperations:
    """Tests for atomic Redis operations (race condition prevention).

    These tests verify that add_returned_ids() uses atomic SADD operation
    rather than read-modify-write (get -> union -> set), which has race conditions.

    Without atomic operations, concurrent requests can lose data:
    - Request A reads {1-20}, Request B reads {1-20} (before A writes)
    - A writes {1-40}, B writes {1-20, 41-60} -> IDs {21-40} lost!

    With SADD, both requests atomically add their IDs - no data loss.
    """

    def test_add_returned_ids_uses_atomic_sadd(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test add_returned_ids() uses atomic SADD command.

        Scenario: Add IDs to session.
        Expected: Implementation calls SADD directly (not get -> union -> set).
        """
        mock_client.sadd.return_value = 3  # Number of new elements added
        mock_client.expire.return_value = True

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.add_returned_ids(sample_params, [1, 2, 3])

        # Verify SADD was called (atomic operation)
        mock_client.sadd.assert_called_once()
        call_args = mock_client.sadd.call_args

        # First arg is the key, rest are the IDs to add
        assert 1 in call_args[0] or 1 in call_args[0][1:], "SADD should include ID 1"
        assert 2 in call_args[0] or 2 in call_args[0][1:], "SADD should include ID 2"
        assert 3 in call_args[0] or 3 in call_args[0][1:], "SADD should include ID 3"

        # Verify TTL was set
        mock_client.expire.assert_called_once()

    def test_get_returned_ids_uses_smembers(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test get_returned_ids() uses SMEMBERS command.

        Scenario: Retrieve IDs from session.
        Expected: Implementation calls SMEMBERS to get set members.
        """
        # Protocol adapter returns set[int] directly
        mock_client.smembers.return_value = {1, 2, 3}

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            result = manager.get_returned_ids(sample_params)

        # Verify SMEMBERS was called
        mock_client.smembers.assert_called_once()

        # Verify result is a set of integers
        assert result == {1, 2, 3}

    def test_clear_session_uses_delete(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test clear_session() uses DELETE command.

        Scenario: Clear session state.
        Expected: Implementation calls DELETE to remove the key.
        """
        mock_client.delete.return_value = True  # Key existed and was deleted

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")
            manager.clear_session(sample_params)

        # Verify DELETE was called
        mock_client.delete.assert_called_once()

    def test_concurrent_adds_preserve_all_ids(
        self,
        mock_client: MagicMock,
        sample_params: BrowseServiceParams,
    ) -> None:
        """Test concurrent add operations preserve all IDs (SADD is atomic).

        Scenario: Two "concurrent" requests add different IDs to same session.
        Expected: All IDs preserved (no data loss from race condition).

        Note: This simulates the concurrent scenario by calling add_returned_ids
        twice with the underlying mock tracking cumulative SADD calls.
        True concurrency testing would require threading, but this verifies
        the implementation uses the atomic pattern.
        """
        added_ids: list[int] = []

        def track_sadd(key: str, *ids: int) -> int:
            added_ids.extend(ids)
            return len(ids)

        mock_client.sadd.side_effect = track_sadd
        mock_client.expire.return_value = True

        with patch(GET_CLIENT_PATH, return_value=mock_client):
            manager = DeduplicationTracker(session_id="test_session")

            # Simulate two "concurrent" requests adding different IDs
            manager.add_returned_ids(sample_params, [1, 2, 3, 4, 5])
            manager.add_returned_ids(sample_params, [6, 7, 8, 9, 10])

        # With atomic SADD, all IDs should be added (no overwrite/loss)
        assert set(added_ids) == {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, (
            "Atomic SADD should preserve all IDs from both requests"
        )
