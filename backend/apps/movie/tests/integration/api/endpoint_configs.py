"""Endpoint configuration for parametrized API tests.

Defines endpoint configurations used by parametrized tests to run the same
test logic against all movie discovery endpoints (browse, now-playing, upcoming).

Usage:
    from movie.tests.integration.api.endpoint_configs import ALL_ENDPOINTS, EndpointConfig

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    def test_endpoint_returns_results(config: EndpointConfig) -> None:
        response = api_client.get(f"{config.url}?page=1")
        ...
"""

from __future__ import annotations

from typing import NamedTuple


class EndpointConfig(NamedTuple):
    """Configuration for parametrized endpoint tests.

    Attributes:
        name: Display name for test output (used in parametrize ids)
        url: API endpoint path
        has_date_preset: Whether endpoint has date constraints
        min_vote_count_applied: Whether MIN_VOTE_COUNT filtering is enforced
        protected_keys: TMDB parameter keys that user cannot override
    """

    name: str
    url: str
    has_date_preset: bool
    min_vote_count_applied: bool
    protected_keys: list[str]


# Endpoint configurations
BROWSE_CONFIG = EndpointConfig(
    name="browse",
    url="/api/movies/browse",
    has_date_preset=False,
    min_vote_count_applied=True,
    protected_keys=[],
)

NOW_PLAYING_CONFIG = EndpointConfig(
    name="now-playing",
    url="/api/movies/now-playing",
    has_date_preset=True,
    min_vote_count_applied=False,  # Disabled: new releases may have low vote counts
    protected_keys=[
        "primary_release_date.gte",
        "primary_release_date.lte",
        "with_release_type",
    ],
)

UPCOMING_CONFIG = EndpointConfig(
    name="upcoming",
    url="/api/movies/upcoming",
    has_date_preset=True,
    min_vote_count_applied=False,  # Unreleased movies have 0 votes
    protected_keys=[
        "primary_release_date.gte",
        "primary_release_date.lte",
        "with_release_type",
    ],
)

# Endpoint lists for parametrization
ALL_ENDPOINTS = [BROWSE_CONFIG, NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
DATE_CONSTRAINED_ENDPOINTS = [NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
