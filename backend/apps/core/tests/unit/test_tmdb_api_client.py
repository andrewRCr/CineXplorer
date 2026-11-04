"""Unit tests for TMDBApiClient.

Tests the TMDB-specific functionality including convenience methods,
error processing, and metadata extraction.
"""

# pyright: reportPrivateUsage=false
# Testing protected methods (_extract_*) is intentional in unit tests

from unittest.mock import Mock, patch

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.core.tests.mock_paths import TMDB_SETTINGS


class TestTMDBApiClientInit:
    """Tests for TMDBApiClient initialization."""

    def test_init_sets_tmdb_base_url(self) -> None:
        client = TMDBApiClient()
        assert client.base_url == "https://api.themoviedb.org/3"

    def test_init_sets_default_timeout(self) -> None:
        client = TMDBApiClient()
        assert client.timeout == 30

    def test_init_accepts_custom_timeout(self) -> None:
        client = TMDBApiClient(timeout=60)
        assert client.timeout == 60

    def test_init_sets_logger_name(self) -> None:
        client = TMDBApiClient()
        assert client.logger.name == "cinexplorer.tmdb"


class TestTMDBApiClientHeaders:
    """Tests for header preparation."""

    def test_prepare_headers_includes_standard_headers(self) -> None:
        client = TMDBApiClient()
        headers = client.prepare_headers()

        assert headers["Accept"] == "application/json"
        assert headers["Content-Type"] == "application/json"
        assert "CineXplorer" in headers["User-Agent"]

    def test_prepare_headers_merges_custom_headers(self) -> None:
        client = TMDBApiClient()
        headers = client.prepare_headers({"X-Custom": "value"})

        assert headers["X-Custom"] == "value"
        assert headers["Accept"] == "application/json"


class TestTMDBApiClientParamSanitization:
    """Tests for parameter sanitization."""

    def test_get_sanitized_params_removes_api_key(self) -> None:
        client = TMDBApiClient()
        params: dict[str, object] = {"api_key": "secret123", "page": 1, "query": "test"}

        sanitized = client.get_sanitized_params(params)

        assert "api_key" not in sanitized
        assert sanitized["page"] == 1
        assert sanitized["query"] == "test"

    def test_get_sanitized_params_handles_none(self) -> None:
        client = TMDBApiClient()
        assert client.get_sanitized_params(None) == {}

    def test_get_sanitized_params_handles_empty_dict(self) -> None:
        client = TMDBApiClient()
        assert client.get_sanitized_params({}) == {}


class TestTMDBApiClientErrorDetails:
    """Tests for TMDB-specific error details."""

    def test_get_error_details_for_401(self) -> None:
        client = TMDBApiClient()
        details = client.get_error_details(401)
        assert "TMDB API key" in details

    def test_get_error_details_for_404(self) -> None:
        client = TMDBApiClient()
        details = client.get_error_details(404)
        assert "TMDB" in details
        assert "movie" in details.lower() or "resource" in details.lower()

    def test_get_error_details_for_429(self) -> None:
        client = TMDBApiClient()
        details = client.get_error_details(429)
        assert "Rate Limited" in details or "TMDB" in details

    def test_get_error_details_for_unknown_code(self) -> None:
        client = TMDBApiClient()
        details = client.get_error_details(418)
        assert "418" in details
        assert "TMDB" in details


class TestTMDBApiClientResponseMetadata:
    """Tests for TMDB response metadata extraction."""

    def test_extract_tmdb_response_metadata_for_paginated(self) -> None:
        client = TMDBApiClient()
        data: dict[str, object] = {
            "page": 1,
            "total_pages": 10,
            "total_results": 200,
            "results": [{"id": 1}, {"id": 2}],
        }

        metadata = client._extract_tmdb_response_metadata(data)

        assert metadata is not None
        assert metadata["page"] == 1
        assert metadata["total_pages"] == 10
        assert metadata["total_results"] == 200
        assert metadata["results_count"] == 2

    def test_extract_tmdb_response_metadata_for_movie_detail(self) -> None:
        client = TMDBApiClient()
        data: dict[str, object] = {"id": 550, "title": "Fight Club"}

        metadata = client._extract_tmdb_response_metadata(data)

        assert metadata is not None
        assert metadata["movie_id"] == 550
        assert metadata["movie_title"] == "Fight Club"

    def test_extract_tmdb_response_metadata_returns_none_for_empty(self) -> None:
        client = TMDBApiClient()
        metadata = client._extract_tmdb_response_metadata({})
        assert metadata is None

    def test_extract_tmdb_response_metadata_handles_non_list_results(self) -> None:
        client = TMDBApiClient()
        # Some endpoints might return results as something without __len__
        data: dict[str, object] = {"page": 1, "results": iter([1, 2, 3])}

        metadata = client._extract_tmdb_response_metadata(data)

        assert metadata is not None
        assert metadata["page"] == 1
        assert metadata["results_count"] == 0  # Can't count iterator


class TestTMDBApiClientRateLimitExtraction:
    """Tests for rate limit header extraction."""

    def test_extract_rate_limit_headers_returns_none_for_empty(self) -> None:
        client = TMDBApiClient()
        assert client._extract_rate_limit_headers(None) is None
        assert client._extract_rate_limit_headers({}) is None

    def test_extract_rate_limit_headers_extracts_values(self) -> None:
        client = TMDBApiClient()
        headers = {
            "x-ratelimit-limit": "40",
            "x-ratelimit-remaining": "39",
            "x-ratelimit-reset": "1234567890",
        }

        info = client._extract_rate_limit_headers(headers)

        assert info is not None
        assert info["limit"] == 40
        assert info["remaining"] == 39
        assert info["reset"] == 1234567890

    def test_extract_rate_limit_headers_handles_retry_after(self) -> None:
        client = TMDBApiClient()
        headers = {"retry-after": "10"}

        info = client._extract_rate_limit_headers(headers)

        assert info is not None
        assert info["retry_after"] == 10

    def test_extract_rate_limit_headers_handles_non_numeric(self) -> None:
        client = TMDBApiClient()
        headers = {"x-ratelimit-limit": "not-a-number"}

        info = client._extract_rate_limit_headers(headers)

        assert info is not None
        assert info["limit"] == "not-a-number"

    def test_extract_rate_limit_headers_handles_mock_objects(self) -> None:
        client = TMDBApiClient()
        # Mock that doesn't support __contains__
        mock_headers = Mock(spec=[])

        info = client._extract_rate_limit_headers(mock_headers)
        assert info is None


class TestTMDBApiClientGetMethod:
    """Tests for the TMDB-specific get method."""

    @patch(TMDB_SETTINGS)
    def test_get_injects_api_key(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-api-key"
        client = TMDBApiClient()

        with patch.object(client.session, "get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"results": []}
            mock_response.headers = {}
            mock_response.content = b"{}"
            mock_get.return_value = mock_response

            client.get("discover/movie", params={"page": 1})

            call_args = mock_get.call_args
            assert call_args[1]["params"]["api_key"] == "test-api-key"
            assert call_args[1]["params"]["page"] == 1

    @patch(TMDB_SETTINGS)
    def test_get_raises_when_api_key_missing(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = None
        client = TMDBApiClient()

        with pytest.raises(ImproperlyConfigured) as exc_info:
            client.get("movie/550")

        assert "TMDB_API_KEY" in str(exc_info.value)

    @patch(TMDB_SETTINGS)
    def test_get_raises_when_api_key_empty(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = ""
        # Mock getattr to return empty string
        del mock_settings.TMDB_API_KEY
        mock_settings.configure_mock(TMDB_API_KEY="")

        client = TMDBApiClient()

        with patch.object(client.session, "get"), pytest.raises(ImproperlyConfigured):
            client.get("movie/550")


class TestTMDBApiClientConvenienceMethods:
    """Tests for convenience wrapper methods."""

    @patch(TMDB_SETTINGS)
    def test_search_movies_calls_correct_endpoint(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-key"
        client = TMDBApiClient()

        with patch.object(client, "get") as mock_get:
            mock_get.return_value = ApiResponse(status_code=200, data={"results": []})

            client.search_movies("The Matrix", page=2)

            mock_get.assert_called_once_with("search/movie", {"query": "The Matrix", "page": 2})

    @patch(TMDB_SETTINGS)
    def test_get_movie_details_calls_correct_endpoint(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-key"
        client = TMDBApiClient()

        with patch.object(client, "get") as mock_get:
            mock_get.return_value = ApiResponse(status_code=200, data={"id": 550})

            client.get_movie_details(550)

            mock_get.assert_called_once_with("movie/550", params={})

    @patch(TMDB_SETTINGS)
    def test_discover_movies_calls_correct_endpoint(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-key"
        client = TMDBApiClient()

        with patch.object(client, "get") as mock_get:
            mock_get.return_value = ApiResponse(status_code=200, data={"results": []})

            client.discover_movies(year=2023, with_genres="28")

            mock_get.assert_called_once_with(
                "discover/movie", params={"year": 2023, "with_genres": "28"}
            )

    @patch(TMDB_SETTINGS)
    def test_get_popular_movies_calls_correct_endpoint(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-key"
        client = TMDBApiClient()

        with patch.object(client, "get") as mock_get:
            mock_get.return_value = ApiResponse(status_code=200, data={"results": []})

            client.get_popular_movies(page=3)

            mock_get.assert_called_once_with("movie/popular", {"page": 3})

    @patch(TMDB_SETTINGS)
    def test_get_top_rated_movies_calls_correct_endpoint(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-key"
        client = TMDBApiClient()

        with patch.object(client, "get") as mock_get:
            mock_get.return_value = ApiResponse(status_code=200, data={"results": []})

            client.get_top_rated_movies(page=1)

            mock_get.assert_called_once_with("movie/top_rated", {"page": 1})

    @patch(TMDB_SETTINGS)
    def test_get_now_playing_movies_calls_correct_endpoint(self, mock_settings: Mock) -> None:
        mock_settings.TMDB_API_KEY = "test-key"
        client = TMDBApiClient()

        with patch.object(client, "get") as mock_get:
            mock_get.return_value = ApiResponse(status_code=200, data={"results": []})

            client.get_now_playing_movies(page=2)

            mock_get.assert_called_once_with("movie/now_playing", {"page": 2})


class TestTMDBApiClientResponseProcessing:
    """Tests for TMDB response processing."""

    def test_process_successful_response_handles_invalid_json(self) -> None:
        client = TMDBApiClient()
        response = Mock()
        response.status_code = 200
        response.json.side_effect = ValueError("Invalid JSON")
        response.text = "<html>Error</html>"
        response.headers = {}
        response.content = b"<html>Error</html>"

        result = client.process_successful_response(
            response=response, correlation_id="test-123", endpoint="movie/550", duration_ms=100
        )

        assert result.status_code == 502
        assert result.error_message is not None
        assert "Bad Gateway" in result.error_message
        assert result.error_category == "json_parsing_error"

    def test_process_error_response_logs_appropriately(self) -> None:
        client = TMDBApiClient()

        for status_code in [500, 429, 400, 300]:
            response = Mock()
            response.status_code = status_code
            response.headers = {}
            response.content = b""
            response.text = ""

            with patch.object(client, "logger") as mock_logger:
                client.process_error_response(
                    response=response, correlation_id="test", endpoint="/api", duration_ms=100
                )

                # Verify appropriate log method was called
                if status_code >= 500:
                    assert mock_logger.error.called
                else:
                    assert mock_logger.warning.called
