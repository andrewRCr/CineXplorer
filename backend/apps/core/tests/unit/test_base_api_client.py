"""Unit tests for BaseApiClient exception handling and helper methods.

Tests the error handling paths, helper methods, and edge cases
in the abstract base API client class.
"""

# pyright: reportPrivateUsage=false
# Testing protected methods (_safe_headers_dict) is intentional in unit tests

from unittest.mock import Mock, patch

import pytest
import requests

from apps.core.services.base_api_client import BaseApiClient


class ConcreteApiClient(BaseApiClient):
    """Concrete implementation of BaseApiClient for testing."""

    def prepare_headers(self, headers: dict[str, str] | None = None) -> dict[str, str]:
        prepared = {"Accept": "application/json"}
        if headers:
            prepared.update(headers)
        return prepared

    def get_sanitized_params(self, params: dict[str, object] | None = None) -> dict[str, object]:
        if not params:
            return {}
        # Remove 'secret' key for testing
        return {k: v for k, v in params.items() if k != "secret"}


class TestBaseApiClientInit:
    """Tests for BaseApiClient initialization."""

    def test_init_sets_base_url(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.base_url == "https://api.example.com"

    def test_init_strips_trailing_slash(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com/")
        assert client.base_url == "https://api.example.com"

    def test_init_sets_timeout(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com", timeout=60)
        assert client.timeout == 60

    def test_init_sets_max_retries(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com", max_retries=3)
        assert client.max_retries == 3

    def test_init_creates_session(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.session is not None

    def test_init_configures_retry_when_max_retries_positive(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com", max_retries=3)
        # Verify adapter is mounted (retry strategy is configured)
        adapters = client.session.adapters
        assert "https://" in adapters
        assert "http://" in adapters


class TestBaseApiClientHelpers:
    """Tests for helper methods."""

    def test_generate_correlation_id_returns_uuid_string(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        correlation_id = client.generate_correlation_id()
        assert isinstance(correlation_id, str)
        assert len(correlation_id) == 36  # UUID format

    def test_generate_correlation_id_returns_unique_values(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        ids = [client.generate_correlation_id() for _ in range(100)]
        assert len(set(ids)) == 100

    def test_build_url_joins_base_and_endpoint(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        url = client.build_url("users/123")
        assert url == "https://api.example.com/users/123"

    def test_build_url_handles_leading_slash(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        url = client.build_url("/users/123")
        assert url == "https://api.example.com/users/123"


class TestBaseApiClientErrorClassification:
    """Tests for error classification methods."""

    def test_classify_error_returns_server_error_for_500(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.classify_error(500) == "server_error"

    def test_classify_error_returns_server_error_for_503(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.classify_error(503) == "server_error"

    def test_classify_error_returns_rate_limit_for_429(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.classify_error(429) == "rate_limit"

    def test_classify_error_returns_client_error_for_400(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.classify_error(400) == "client_error"

    def test_classify_error_returns_client_error_for_404(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.classify_error(404) == "client_error"

    def test_classify_error_returns_unknown_for_300(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert client.classify_error(300) == "unknown"

    def test_get_error_details_returns_message_for_known_codes(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        assert "Bad Request" in client.get_error_details(400)
        assert "Unauthorized" in client.get_error_details(401)
        assert "Forbidden" in client.get_error_details(403)
        assert "Not Found" in client.get_error_details(404)
        assert "Rate Limited" in client.get_error_details(429)
        assert "Internal Server Error" in client.get_error_details(500)

    def test_get_error_details_returns_generic_for_unknown_codes(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        result = client.get_error_details(418)  # I'm a teapot
        assert "418" in result
        assert "Unexpected" in result


class TestBaseApiClientSafeHeadersDict:
    """Tests for the _safe_headers_dict helper method."""

    def test_safe_headers_dict_extracts_real_headers(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        response = Mock()
        response.headers = {"Content-Type": "application/json", "X-Custom": "value"}

        result = client._safe_headers_dict(response)
        assert result == {"Content-Type": "application/json", "X-Custom": "value"}

    def test_safe_headers_dict_returns_empty_for_mock_without_items(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        response = Mock()
        response.headers = Mock(spec=[])  # No 'items' method

        result = client._safe_headers_dict(response)
        assert result == {}

    def test_safe_headers_dict_handles_type_error(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        response = Mock()
        # Configure headers.items to raise TypeError
        response.headers = Mock()
        response.headers.items = Mock(side_effect=TypeError("not iterable"))

        result = client._safe_headers_dict(response)
        assert result == {}

    def test_safe_headers_dict_handles_attribute_error(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        response = Mock()
        # Configure to raise AttributeError on dict()
        del response.headers

        # This should handle the AttributeError gracefully
        try:
            result = client._safe_headers_dict(response)
            # If it doesn't raise, it should return empty dict
            assert result == {}
        except AttributeError:
            pytest.fail("_safe_headers_dict should handle AttributeError")


class TestBaseApiClientExceptionHandling:
    """Tests for handle_request_exception method."""

    def test_handle_timeout_exception(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        error = requests.exceptions.Timeout("Connection timed out")

        response = client.handle_request_exception(
            error=error,
            correlation_id="test-123",
            endpoint="/api/test",
            duration_ms=30500,
            url="https://api.example.com/api/test",
            params={"page": 1},
        )

        assert response.status_code == 504
        assert response.error_message == "API request timed out"
        assert response.error_category == "network_error"
        assert response.correlation_id == "test-123"
        assert response.endpoint == "/api/test"

    def test_handle_connection_error(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        error = requests.exceptions.ConnectionError("Connection refused")

        response = client.handle_request_exception(
            error=error,
            correlation_id="test-456",
            endpoint="/api/data",
            duration_ms=1500,
            url="https://api.example.com/api/data",
        )

        assert response.status_code == 502
        assert response.error_message == "API connection failed"
        assert response.error_category == "network_error"

    def test_handle_generic_request_exception(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        error = requests.exceptions.RequestException("Unknown error")

        response = client.handle_request_exception(
            error=error,
            correlation_id="test-789",
            endpoint="/api/resource",
            duration_ms=500,
            url="https://api.example.com/api/resource",
        )

        assert response.status_code == 502
        assert response.error_message == "API request failed"
        assert response.error_category == "request_error"

    def test_handle_exception_sanitizes_params(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        error = requests.exceptions.Timeout("timeout")

        # Our concrete client removes 'secret' from params
        with patch.object(client, "logger") as mock_logger:
            client.handle_request_exception(
                error=error,
                correlation_id="test",
                endpoint="/api",
                duration_ms=100,
                url="https://api.example.com/api",
                params={"page": 1, "secret": "hidden"},
            )

            # Verify logger was called (it logs the sanitized params)
            assert mock_logger.error.called


class TestBaseApiClientResponseProcessing:
    """Tests for response processing methods."""

    def test_process_successful_response_parses_json(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        response = Mock()
        response.status_code = 200
        response.json.return_value = {"result": "success"}
        response.headers = {"Content-Type": "application/json"}
        response.content = b'{"result": "success"}'

        result = client.process_successful_response(
            response=response, correlation_id="test-123", endpoint="/api/test", duration_ms=100
        )

        assert result.is_success()
        assert result.data == {"result": "success"}

    def test_process_successful_response_handles_invalid_json(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")
        response = Mock()
        response.status_code = 200
        response.json.side_effect = ValueError("Invalid JSON")
        response.headers = {"Content-Type": "text/html"}
        response.content = b"<html>error</html>"
        response.text = "<html>error</html>"

        result = client.process_successful_response(
            response=response, correlation_id="test-123", endpoint="/api/test", duration_ms=100
        )

        # Should return error response for invalid JSON
        assert result.status_code == 500
        assert result.error_category == "json_parsing_error"

    def test_process_error_response_categorizes_errors(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")

        for status_code, expected_category in [
            (500, "server_error"),
            (503, "server_error"),
            (429, "rate_limit"),
            (400, "client_error"),
            (404, "client_error"),
        ]:
            response = Mock()
            response.status_code = status_code
            response.headers = {}
            response.content = b""
            response.text = ""

            result = client.process_error_response(
                response=response, correlation_id="test", endpoint="/api", duration_ms=100
            )

            assert result.status_code == status_code
            assert result.error_category == expected_category


class TestBaseApiClientGetMethod:
    """Tests for the get method."""

    def test_get_makes_request_with_correct_url(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")

        with patch.object(client.session, "get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"data": "test"}
            mock_response.headers = {}
            mock_response.content = b"{}"
            mock_get.return_value = mock_response

            client.get("/users/123")

            mock_get.assert_called_once()
            call_args = mock_get.call_args
            assert call_args[0][0] == "https://api.example.com/users/123"

    def test_get_passes_params(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")

        with patch.object(client.session, "get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {}
            mock_response.headers = {}
            mock_response.content = b"{}"
            mock_get.return_value = mock_response

            client.get("/users", params={"page": 1, "limit": 10})

            call_args = mock_get.call_args
            assert call_args[1]["params"] == {"page": 1, "limit": 10}

    def test_get_filters_none_params(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")

        with patch.object(client.session, "get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {}
            mock_response.headers = {}
            mock_response.content = b"{}"
            mock_get.return_value = mock_response

            client.get("/users", params={"page": 1, "filter": None})

            call_args = mock_get.call_args
            # None values should be filtered out
            assert call_args[1]["params"] == {"page": 1}

    def test_get_handles_network_exception(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com")

        with patch.object(client.session, "get") as mock_get:
            mock_get.side_effect = requests.exceptions.ConnectionError("Network error")

            result = client.get("/users")

            assert result.status_code == 502
            assert result.error_category == "network_error"

    def test_get_uses_timeout(self) -> None:
        client = ConcreteApiClient(base_url="https://api.example.com", timeout=45)

        with patch.object(client.session, "get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {}
            mock_response.headers = {}
            mock_response.content = b"{}"
            mock_get.return_value = mock_response

            client.get("/users")

            call_args = mock_get.call_args
            assert call_args[1]["timeout"] == 45
