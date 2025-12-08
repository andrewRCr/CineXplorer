"""DeduplicationTracker - Session-based cross-page deduplication via Redis.

This module provides session-scoped tracking of returned movie IDs to prevent
duplicates across pagination boundaries. Uses atomic Redis SET operations for
thread-safe concurrent request handling.

Architecture:
    - Session isolation: Each user session has separate pagination state
    - Context isolation: Multi-tab support via X-Pagination-Context header
    - Filter isolation: Different filter combinations have separate state
    - Atomic operations: SADD/SMEMBERS/DEL prevent race conditions

Cache Key Format:
    pagination_session:{session_id}:{context_id}:{params_hash}

Thread Safety:
    Uses Redis SADD (atomic set-add) instead of read-modify-write pattern.
    This prevents data loss when concurrent requests modify the same session:

    Without SADD (race condition):
        Request A reads {1-20}, Request B reads {1-20} (before A writes)
        A writes {1-40}, B writes {1-20, 41-60} -> IDs {21-40} lost!

    With SADD (atomic):
        Both requests atomically add their IDs - no data loss.

Type Safety:
    This module achieves zero type ignores by:
    - Depending on AtomicSetOperations Protocol (not raw Redis client)
    - Using HashableParams Protocol (satisfied by any Pydantic model)
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Protocol

from core.services.redis_client import get_atomic_set_client

logger = logging.getLogger('cinexplorer.pagination')


class HashableParams(Protocol):
    """Protocol for params that can be hashed for cache key generation.

    Any Pydantic BaseModel satisfies this protocol automatically.
    This allows DeduplicationTracker to work with BrowseServiceParams,
    SearchServiceParams, or any future params type.
    """

    def model_dump(self, *, exclude_none: bool = False) -> dict[str, object]:
        """Serialize params to dict for hashing."""
        ...

# Constants
CACHE_KEY_PREFIX = "pagination_session"
SESSION_TTL_SECONDS = 3600  # 1 hour


class DeduplicationTracker:
    """Tracks returned movie IDs for cross-page deduplication.

    Manages session-scoped state to prevent duplicate movies when paginating
    through TMDB results. Uses Redis SET operations for thread-safe concurrent
    request handling.

    Attributes:
        session_id: Django session key for user isolation
        context_id: Optional tab isolation ID from X-Pagination-Context header

    Example:
        tracker = DeduplicationTracker(
            session_id=request.session.session_key,
            context_id=request.headers.get("X-Pagination-Context", "")
        )

        # Get previously returned IDs
        seen_ids = tracker.get_returned_ids(params)

        # After returning new movies, track them
        tracker.add_returned_ids(params, [movie.tmdb_id for movie in results])

        # On page 1, clear session for fresh start
        tracker.clear_session(params)
    """

    def __init__(self, session_id: str, context_id: str = "") -> None:
        """Initialize deduplication tracker.

        Args:
            session_id: Django session key (from request.session.session_key)
            context_id: Optional tab isolation ID (from X-Pagination-Context header).
                       Defaults to empty string for backwards compatibility.
        """
        self._session_id = session_id
        self._context_id = context_id

    def get_returned_ids(self, params: HashableParams) -> set[int]:
        """Retrieve IDs of movies already returned in this session.

        Uses Redis SMEMBERS for atomic retrieval of all set members.

        Args:
            params: Service parameters (Pydantic-validated at API boundary)

        Returns:
            Set of TMDB movie IDs previously returned, or empty set if none
            or Redis unavailable.
        """
        cache_key = self._generate_cache_key(params)

        try:
            client = get_atomic_set_client()
            if client is None:
                return set()

            return client.smembers(cache_key)

        except Exception as e:
            logger.warning(
                f"Redis unavailable for get_returned_ids: {e}. "
                "Falling back to empty set (cross-page dedup disabled)."
            )
            return set()

    def add_returned_ids(self, params: HashableParams, ids: list[int]) -> None:
        """Add movie IDs to the session's returned set.

        Uses Redis SADD for atomic set-add operation, preventing race conditions
        when concurrent requests modify the same session.

        Args:
            params: Service parameters (Pydantic-validated at API boundary)
            ids: List of TMDB movie IDs to track as returned
        """
        if not ids:
            return

        cache_key = self._generate_cache_key(params)

        try:
            client = get_atomic_set_client()
            if client is None:
                return

            # SADD atomically adds members to set (no race conditions)
            client.sadd(cache_key, *ids)

            # Set/refresh TTL
            client.expire(cache_key, SESSION_TTL_SECONDS)

        except Exception as e:
            logger.warning(
                f"Redis unavailable for add_returned_ids: {e}. "
                "Continuing without cross-page dedup tracking."
            )

    def clear_session(self, params: HashableParams) -> None:
        """Clear all returned IDs for this filter combination.

        Called when user navigates to page 1 for a fresh start.

        Args:
            params: Service parameters (Pydantic-validated at API boundary)
        """
        cache_key = self._generate_cache_key(params)

        try:
            client = get_atomic_set_client()
            if client is None:
                return

            client.delete(cache_key)

        except Exception as e:
            logger.warning(
                f"Redis unavailable for clear_session: {e}. "
                "Session may have stale state."
            )

    def _generate_cache_key(self, params: HashableParams) -> str:
        """Generate cache key for this session + context + params combination.

        Format: pagination_session:{session_id}:{context_id}:{params_hash}

        Args:
            params: Service parameters to include in key

        Returns:
            Unique cache key string
        """
        params_hash = self._generate_params_hash(params)
        return f"{CACHE_KEY_PREFIX}:{self._session_id}:{self._context_id}:{params_hash}"

    def _generate_params_hash(self, params: HashableParams) -> str:
        """Generate deterministic hash of service parameters.

        Uses Pydantic's model_dump() for consistent serialization.
        Excludes None values to ensure params with same non-None values hash equally.

        Args:
            params: Service parameters to hash

        Returns:
            8-character hex hash of parameters
        """
        # model_dump with exclude_none ensures consistent hashing
        # sort_keys in json.dumps ensures key order independence
        params_dict = params.model_dump(exclude_none=True)
        sorted_json = json.dumps(params_dict, sort_keys=True, separators=(',', ':'))

        # Generate short hash (8 chars is sufficient for uniqueness)
        return hashlib.sha256(sorted_json.encode()).hexdigest()[:8]
