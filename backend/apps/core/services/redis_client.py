"""Protocol-based Redis adapter for type-safe atomic SET operations.

Provides a typed interface for atomic Redis SET operations (SADD, SMEMBERS, DEL,
EXPIRE) through Django's cache backend. All type-unsafe access to Django internals
and redis-py's sync/async return types are isolated in the adapter implementation.

Architecture:
    - AtomicSetOperations Protocol defines the type-safe interface
    - DjangoRedisAdapter implements the Protocol, handling all type conversions
    - Business logic depends only on the Protocol, achieving zero type ignores

Why this exists:
    Django's cache interface doesn't type raw Redis client access, and redis-py
    uses Union[Awaitable[T], T] return types to support both sync and async modes.
    This adapter isolates these typing issues to a single location.

Usage:
    from apps.core.services.redis_client import get_atomic_set_client

    client = get_atomic_set_client()
    if client is not None:
        client.sadd("my_set", 1, 2, 3)
        members = client.smembers("my_set")  # Returns set[int]
        client.delete("my_set")
"""

from __future__ import annotations

import logging
from typing import Protocol

from django.core.cache import cache
from redis.exceptions import RedisError

logger = logging.getLogger("cinexplorer.redis")


class AtomicSetOperations(Protocol):
    """Type-safe interface for atomic Redis SET operations.

    This Protocol defines the contract for session-based pagination tracking.
    Any implementation (real Redis adapter, mock, fake) can satisfy this interface.

    All methods are designed for integer set operations, as our use case is
    tracking TMDB movie IDs.
    """

    def sadd(self, key: str, *values: int) -> int:
        """Atomically add integer values to a set.

        Args:
            key: Redis key name
            *values: Integer values to add

        Returns:
            Number of new members added (not already in set)
        """
        ...

    def smembers(self, key: str) -> set[int]:
        """Get all members of a set as integers.

        Args:
            key: Redis key name

        Returns:
            Set of integer values, or empty set if key doesn't exist
        """
        ...

    def delete(self, key: str) -> bool:
        """Delete a key.

        Args:
            key: Redis key name

        Returns:
            True if key existed and was deleted, False otherwise
        """
        ...

    def expire(self, key: str, seconds: int) -> bool:
        """Set time-to-live on a key.

        Args:
            key: Redis key name
            seconds: TTL in seconds

        Returns:
            True if key exists and TTL was set, False otherwise
        """
        ...


class DjangoRedisAdapter:
    """Adapter implementing AtomicSetOperations using Django's Redis cache.

    ALL type ignores are contained in this class. Business logic that depends
    on AtomicSetOperations has zero type ignores.

    Type ignores explained:
    - attr-defined: Django cache doesn't expose _cache or get_client() in types
    - union-attr: redis-py returns Union[Awaitable, T] for sync/async compatibility
    - arg-type: Type conversions from redis-py's generic returns
    """

    def __init__(self) -> None:
        """Initialize adapter, acquiring Redis client from Django cache.

        Raises:
            AttributeError: If cache backend doesn't support raw Redis access
        """
        self._client = self._get_redis_client()

    def _get_redis_client(self) -> object:
        """Get underlying Redis client from Django cache.

        Returns object type to avoid redis.Redis generic issues.
        We know it's a Redis client internally.
        """
        cache_backend = cache._cache  # type: ignore[attr-defined]
        return cache_backend.get_client(write=True)  # type: ignore[attr-defined]

    def sadd(self, key: str, *values: int) -> int:
        """Atomically add values to a set."""
        if not values:
            return 0
        result = self._client.sadd(key, *values)  # type: ignore[union-attr]
        return int(result)  # type: ignore[arg-type]

    def smembers(self, key: str) -> set[int]:
        """Get all members of a set as integers."""
        raw_result = self._client.smembers(key)  # type: ignore[union-attr]
        # Redis returns bytes, convert to int
        return {int(member) for member in raw_result}  # type: ignore[union-attr]

    def delete(self, key: str) -> bool:
        """Delete a key."""
        result = self._client.delete(key)  # type: ignore[union-attr]
        return bool(result)  # type: ignore[arg-type]

    def expire(self, key: str, seconds: int) -> bool:
        """Set TTL on a key."""
        result = self._client.expire(key, seconds)  # type: ignore[union-attr]
        return bool(result)  # type: ignore[arg-type]


def get_atomic_set_client() -> AtomicSetOperations | None:
    """Factory function to get an AtomicSetOperations implementation.

    Returns None if Redis is unavailable (graceful degradation).
    Callers should handle None by falling back to degraded behavior
    (e.g., skip cross-page deduplication).

    Returns:
        AtomicSetOperations implementation, or None if unavailable.

    Example:
        client = get_atomic_set_client()
        if client is not None:
            seen_ids = client.smembers("pagination:session123")
            client.sadd("pagination:session123", 1, 2, 3)
    """
    try:
        return DjangoRedisAdapter()
    except AttributeError:
        logger.warning(
            "Cache backend does not support raw Redis client access. "
            "Ensure CACHES['default']['BACKEND'] is RedisCache."
        )
        return None
    except RedisError as e:
        logger.error(
            "Failed to initialize Redis adapter | error_type=%s",
            type(e).__name__,
            extra={"error_type": type(e).__name__},
        )
        return None
