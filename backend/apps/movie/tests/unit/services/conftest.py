"""Unit test fixtures for movie service tests.

Provides isolation from database dependencies for true unit testing.
"""

from __future__ import annotations

import pytest

from apps.movie.tests.mock_paths import BLACKLIST_GET_IDS


@pytest.fixture(autouse=True)
def mock_blacklist_query(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock blacklist database query for all service unit tests.

    The blacklist filter queries the database for blacklisted movie IDs.
    Unit tests should not depend on database state - they test specific
    service behavior in isolation.

    This autouse fixture ensures all tests in unit/services/ bypass the
    database query. Tests that actually test blacklist behavior should
    use @pytest.mark.django_db and can override this by importing the
    real function.
    """

    def empty_blacklist() -> set[int]:
        return set()

    monkeypatch.setattr(BLACKLIST_GET_IDS, empty_blacklist)
