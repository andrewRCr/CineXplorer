"""Endpoint configuration for parametrized API tests.

Defines endpoint configurations used by parametrized tests to run the same
test logic against all movie discovery endpoints (browse, now-playing, upcoming).

Usage:
    from apps.movie.tests.integration.api.endpoint_configs import ALL_ENDPOINTS, EndpointConfig

    @pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
    def test_endpoint_returns_results(config: EndpointConfig) -> None:
        response = api_client.get(f"{config.url}?page=1")
        ...
"""

from __future__ import annotations

from typing import NamedTuple

from apps.movie.services.data_quality.policy import VoteCountPolicy


class EndpointConfig(NamedTuple):
    """Configuration for parametrized endpoint tests.

    Attributes:
        name: Display name for test output (used in parametrize ids)
        url: API endpoint path
        has_date_preset: Whether endpoint has date constraints
        min_vote_count_applied: Whether vote count filtering is enforced (from VoteCountPolicy)
        protected_keys: TMDB parameter keys that user cannot override
    """

    name: str
    url: str
    has_date_preset: bool
    min_vote_count_applied: bool
    protected_keys: list[str]


# Endpoint configurations - min_vote_count_applied derived from VoteCountPolicy
BROWSE_CONFIG = EndpointConfig(
    name="browse",
    url="/api/movies/browse",
    has_date_preset=False,
    min_vote_count_applied=VoteCountPolicy.get_threshold(endpoint="browse") is not None,
    protected_keys=[],
)

NOW_PLAYING_CONFIG = EndpointConfig(
    name="now-playing",
    url="/api/movies/now-playing",
    has_date_preset=True,
    min_vote_count_applied=VoteCountPolicy.get_threshold(endpoint="now_playing") is not None,
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
    min_vote_count_applied=VoteCountPolicy.get_threshold(endpoint="upcoming") is not None,
    protected_keys=[
        "primary_release_date.gte",
        "primary_release_date.lte",
        "with_release_type",
    ],
)

# Endpoint lists for parametrization
ALL_ENDPOINTS = [BROWSE_CONFIG, NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
DATE_CONSTRAINED_ENDPOINTS = [NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
