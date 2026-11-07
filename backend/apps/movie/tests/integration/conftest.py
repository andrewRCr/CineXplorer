"""Integration test fixtures for movie app.

Provides fixtures for integration tests that interact with the movie API endpoints.

Note:
    For creating mock TMDB responses, use create_mock_paginated_response() from
    movie.tests.test_helpers directly rather than fixtures. Direct function calls
    are more explicit and available to both unit and integration tests.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import uuid4

import pytest
from django.conf import settings
from django.core.cache import cache
from django.test import override_settings

from apps.movie.services.data_quality.filters import BLACKLIST_CACHE_KEY

if TYPE_CHECKING:
    from datetime import date


@pytest.fixture(autouse=True)
def isolated_movie_cache() -> Iterator[None]:
    """Give Django cache entries a per-test namespace while retaining Redis session tracking."""
    prefix = settings.CACHES["default"].get("KEY_PREFIX", "")
    cache_settings = {
        **settings.CACHES,
        "default": {
            **settings.CACHES["default"],
            "KEY_PREFIX": f"{prefix}:movie-test-{uuid4()}",
        },
    }
    with override_settings(CACHES=cache_settings):
        try:
            yield
        finally:
            cache.delete(BLACKLIST_CACHE_KEY)


@pytest.fixture
def expected_date_ranges() -> dict[str, tuple[date, date]]:
    """Expected date ranges for date-constrained endpoints.

    Centralizes date calculation logic for date correctness tests.
    Keys match endpoint names in EndpointConfig.

    Date windows:
        - now-playing: today-30 to today+5 (currently in theaters)
        - upcoming: today+5 to today+65 (future releases)

    Returns:
        Dict mapping endpoint name to (min_date, max_date) tuple
    """
    today = datetime.now(tz=UTC).date()
    return {
        "now-playing": (today - timedelta(days=30), today + timedelta(days=5)),
        "upcoming": (today + timedelta(days=5), today + timedelta(days=65)),
    }
