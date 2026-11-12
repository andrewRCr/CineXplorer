"""A configurable TMDB client that never makes network requests."""

from __future__ import annotations

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.core.tmdb_models.tmdb_responses import TMDBMovieDetail
from apps.movie.tests.test_helpers import create_mock_error_response


class TMDBStub(TMDBApiClient):
    """Serve explicit per-movie responses and record requested movie IDs.

    Unconfigured requests fail immediately, so a missing fixture cannot reach TMDB.
    Credits default to a valid empty cast and crew for configured movies.
    """

    def __init__(self) -> None:
        self.details: dict[int, ApiResponse] = {}
        self.credits: dict[int, ApiResponse] = {}
        self.requested_ids: list[int] = []
        self.requested_endpoints: list[str] = []

    def add_movie(self, detail: TMDBMovieDetail) -> None:
        self.details[detail.id] = ApiResponse(status_code=200, data=detail.model_dump())
        self.credits[detail.id] = ApiResponse(status_code=200, data={"cast": [], "crew": []})

    def add_error(self, movie_id: int, status_code: int, *, timeout: bool = False) -> None:
        self.details[movie_id] = create_mock_error_response(
            status_code=status_code,
            error_category="network_error" if timeout else None,
        )

    def get_movie_details(self, movie_id: int, **kwargs: object) -> ApiResponse:
        return self.get(f"movie/{movie_id}", params=kwargs)

    def get(
        self,
        endpoint: str,
        params: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
        **kwargs: object,
    ) -> ApiResponse:
        parts = endpoint.strip("/").split("/")
        if len(parts) not in (2, 3) or parts[0] != "movie":
            raise AssertionError(f"Unexpected TMDB endpoint: {endpoint}")
        movie_id = int(parts[1])
        self.requested_ids.append(movie_id)
        self.requested_endpoints.append(endpoint)
        responses = self.credits if len(parts) == 3 and parts[2] == "credits" else self.details
        if movie_id not in responses:
            raise AssertionError(f"No TMDB response configured for {endpoint}")
        return responses[movie_id]
