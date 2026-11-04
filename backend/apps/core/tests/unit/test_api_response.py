"""Unit tests for ApiResponse utility methods.

Tests the helper methods on ApiResponse dataclass that provide
convenient access to response data, headers, and error information.
"""

from apps.core.services.api_response import RATE_LIMIT_HEADER_MAPPING, ApiResponse


class TestApiResponseStatusChecks:
    """Tests for status code classification methods."""

    def test_is_success_returns_true_for_200(self) -> None:
        response = ApiResponse(status_code=200)
        assert response.is_success() is True

    def test_is_success_returns_true_for_201(self) -> None:
        response = ApiResponse(status_code=201)
        assert response.is_success() is True

    def test_is_success_returns_true_for_204(self) -> None:
        response = ApiResponse(status_code=204)
        assert response.is_success() is True

    def test_is_success_returns_false_for_400(self) -> None:
        response = ApiResponse(status_code=400)
        assert response.is_success() is False

    def test_is_success_returns_false_for_500(self) -> None:
        response = ApiResponse(status_code=500)
        assert response.is_success() is False

    def test_is_client_error_returns_true_for_400(self) -> None:
        response = ApiResponse(status_code=400)
        assert response.is_client_error() is True

    def test_is_client_error_returns_true_for_404(self) -> None:
        response = ApiResponse(status_code=404)
        assert response.is_client_error() is True

    def test_is_client_error_returns_true_for_499(self) -> None:
        response = ApiResponse(status_code=499)
        assert response.is_client_error() is True

    def test_is_client_error_returns_false_for_200(self) -> None:
        response = ApiResponse(status_code=200)
        assert response.is_client_error() is False

    def test_is_client_error_returns_false_for_500(self) -> None:
        response = ApiResponse(status_code=500)
        assert response.is_client_error() is False

    def test_is_server_error_returns_true_for_500(self) -> None:
        response = ApiResponse(status_code=500)
        assert response.is_server_error() is True

    def test_is_server_error_returns_true_for_503(self) -> None:
        response = ApiResponse(status_code=503)
        assert response.is_server_error() is True

    def test_is_server_error_returns_false_for_400(self) -> None:
        response = ApiResponse(status_code=400)
        assert response.is_server_error() is False

    def test_is_server_error_returns_false_for_200(self) -> None:
        response = ApiResponse(status_code=200)
        assert response.is_server_error() is False

    def test_is_rate_limited_returns_true_for_429(self) -> None:
        response = ApiResponse(status_code=429)
        assert response.is_rate_limited() is True

    def test_is_rate_limited_returns_false_for_other_codes(self) -> None:
        for code in [200, 400, 500, 503]:
            response = ApiResponse(status_code=code)
            assert response.is_rate_limited() is False


class TestApiResponseDataAccess:
    """Tests for data access methods."""

    def test_has_data_returns_true_when_data_present(self) -> None:
        response = ApiResponse(status_code=200, data={"key": "value"})
        assert response.has_data() is True

    def test_has_data_returns_true_for_empty_dict(self) -> None:
        response = ApiResponse(status_code=200, data={})
        assert response.has_data() is True

    def test_has_data_returns_true_for_list_data(self) -> None:
        response = ApiResponse(status_code=200, data=[1, 2, 3])
        assert response.has_data() is True

    def test_has_data_returns_false_when_data_none(self) -> None:
        response = ApiResponse(status_code=200, data=None)
        assert response.has_data() is False

    def test_get_json_data_returns_dict_when_data_is_dict(self) -> None:
        data = {"key": "value", "nested": {"inner": 1}}
        response = ApiResponse(status_code=200, data=data)
        assert response.get_json_data() == data

    def test_get_json_data_returns_none_when_data_is_list(self) -> None:
        response = ApiResponse(status_code=200, data=[1, 2, 3])
        assert response.get_json_data() is None

    def test_get_json_data_returns_none_when_data_is_none(self) -> None:
        response = ApiResponse(status_code=200, data=None)
        assert response.get_json_data() is None


class TestApiResponseHeaderAccess:
    """Tests for header access methods."""

    def test_get_header_returns_value_for_exact_match(self) -> None:
        response = ApiResponse(status_code=200, headers={"Content-Type": "application/json"})
        assert response.get_header("Content-Type") == "application/json"

    def test_get_header_returns_value_case_insensitive(self) -> None:
        response = ApiResponse(status_code=200, headers={"Content-Type": "application/json"})
        assert response.get_header("content-type") == "application/json"

    def test_get_header_returns_default_when_not_found(self) -> None:
        response = ApiResponse(status_code=200, headers={"Other": "value"})
        assert response.get_header("Missing", default="default") == "default"

    def test_get_header_returns_none_when_no_default(self) -> None:
        response = ApiResponse(status_code=200, headers={"Other": "value"})
        assert response.get_header("Missing") is None

    def test_get_header_returns_default_when_no_headers(self) -> None:
        response = ApiResponse(status_code=200, headers=None)
        assert response.get_header("Any", default="default") == "default"


class TestApiResponseRateLimitInfo:
    """Tests for rate limit header extraction."""

    def test_get_rate_limit_info_returns_none_when_no_headers(self) -> None:
        response = ApiResponse(status_code=200, headers=None)
        assert response.get_rate_limit_info() is None

    def test_get_rate_limit_info_returns_none_when_no_rate_headers(self) -> None:
        response = ApiResponse(status_code=200, headers={"Content-Type": "application/json"})
        assert response.get_rate_limit_info() is None

    def test_get_rate_limit_info_extracts_limit(self) -> None:
        response = ApiResponse(status_code=200, headers={"x-ratelimit-limit": "100"})
        info = response.get_rate_limit_info()
        assert info is not None
        assert info["limit"] == 100

    def test_get_rate_limit_info_extracts_remaining(self) -> None:
        response = ApiResponse(status_code=200, headers={"x-ratelimit-remaining": "50"})
        info = response.get_rate_limit_info()
        assert info is not None
        assert info["remaining"] == 50

    def test_get_rate_limit_info_extracts_reset(self) -> None:
        response = ApiResponse(status_code=200, headers={"x-ratelimit-reset": "1234567890"})
        info = response.get_rate_limit_info()
        assert info is not None
        assert info["reset"] == 1234567890

    def test_get_rate_limit_info_extracts_retry_after(self) -> None:
        response = ApiResponse(status_code=429, headers={"retry-after": "60"})
        info = response.get_rate_limit_info()
        assert info is not None
        assert info["retry_after"] == 60

    def test_get_rate_limit_info_extracts_all_headers(self) -> None:
        response = ApiResponse(
            status_code=429,
            headers={
                "x-ratelimit-limit": "100",
                "x-ratelimit-remaining": "0",
                "x-ratelimit-reset": "1234567890",
                "retry-after": "30",
            },
        )
        info = response.get_rate_limit_info()
        assert info is not None
        assert info["limit"] == 100
        assert info["remaining"] == 0
        assert info["reset"] == 1234567890
        assert info["retry_after"] == 30

    def test_get_rate_limit_info_handles_non_numeric_values(self) -> None:
        response = ApiResponse(status_code=200, headers={"x-ratelimit-limit": "not-a-number"})
        info = response.get_rate_limit_info()
        assert info is not None
        assert info["limit"] == "not-a-number"


class TestApiResponseContentInfo:
    """Tests for content information extraction."""

    def test_get_content_info_extracts_content_type(self) -> None:
        response = ApiResponse(status_code=200, headers={"content-type": "application/json"})
        info = response.get_content_info()
        assert info["content_type"] == "application/json"

    def test_get_content_info_extracts_content_length_as_int(self) -> None:
        response = ApiResponse(status_code=200, headers={"content-length": "1234"})
        info = response.get_content_info()
        assert info["content_length"] == 1234

    def test_get_content_info_calculates_data_size_for_string(self) -> None:
        response = ApiResponse(status_code=200, data="hello")
        info = response.get_content_info()
        assert info["data_size"] == 5

    def test_get_content_info_calculates_data_size_for_dict(self) -> None:
        response = ApiResponse(status_code=200, data={"key": "value"})
        info = response.get_content_info()
        assert "data_size" in info
        data_size = info["data_size"]
        assert isinstance(data_size, int) and data_size > 0

    def test_get_content_info_handles_no_headers(self) -> None:
        response = ApiResponse(status_code=200, headers=None)
        info = response.get_content_info()
        assert "content_type" not in info or info.get("content_type") is None


class TestApiResponseErrorSummary:
    """Tests for error summary generation."""

    def test_get_error_summary_returns_none_for_success(self) -> None:
        response = ApiResponse(status_code=200)
        assert response.get_error_summary() is None

    def test_get_error_summary_returns_dict_for_error(self) -> None:
        response = ApiResponse(
            status_code=500,
            error_message="Server error",
            error_details="Internal error occurred",
            error_category="server_error",
            correlation_id="abc-123",
            endpoint="/api/test",
            duration_ms=150,
        )
        summary = response.get_error_summary()
        assert summary is not None
        assert summary["status_code"] == 500
        assert summary["error_message"] == "Server error"
        assert summary["error_details"] == "Internal error occurred"
        assert summary["error_category"] == "server_error"
        assert summary["correlation_id"] == "abc-123"
        assert summary["endpoint"] == "/api/test"
        assert summary["duration_ms"] == 150

    def test_get_error_summary_includes_rate_limit_info_for_429(self) -> None:
        response = ApiResponse(
            status_code=429, error_message="Rate limited", headers={"retry-after": "60"}
        )
        summary = response.get_error_summary()
        assert summary is not None
        assert "rate_limit_info" in summary
        rate_limit_info = summary["rate_limit_info"]
        assert isinstance(rate_limit_info, dict)
        assert rate_limit_info["retry_after"] == 60

    def test_get_error_summary_includes_rate_limit_info_when_retry_after_present(self) -> None:
        # Some servers return 503 with Retry-After for throttling
        response = ApiResponse(
            status_code=503, error_message="Service unavailable", headers={"retry-after": "120"}
        )
        summary = response.get_error_summary()
        assert summary is not None
        assert "rate_limit_info" in summary

    def test_get_error_summary_excludes_none_values(self) -> None:
        response = ApiResponse(status_code=400, error_message="Bad request")
        summary = response.get_error_summary()
        assert summary is not None
        # Should not contain None-valued keys
        for value in summary.values():
            assert value is not None


class TestApiResponseLegacyDict:
    """Tests for legacy dictionary format conversion."""

    def test_to_legacy_dict_returns_data_for_success(self) -> None:
        data = {"results": [1, 2, 3], "total": 3}
        response = ApiResponse(status_code=200, data=data)
        assert response.to_legacy_dict() == data

    def test_to_legacy_dict_returns_empty_dict_for_success_without_data(self) -> None:
        response = ApiResponse(status_code=200, data=None)
        assert response.to_legacy_dict() == {}

    def test_to_legacy_dict_returns_empty_dict_for_non_dict_data(self) -> None:
        response = ApiResponse(status_code=200, data=[1, 2, 3])
        assert response.to_legacy_dict() == {}

    def test_to_legacy_dict_returns_error_format_for_error(self) -> None:
        response = ApiResponse(
            status_code=500, error_message="Server error", correlation_id="abc-123"
        )
        legacy = response.to_legacy_dict()
        assert legacy["error"] == "Server error"
        assert legacy["status"] == 500
        assert legacy["correlation_id"] == "abc-123"

    def test_to_legacy_dict_includes_error_details_when_present(self) -> None:
        response = ApiResponse(
            status_code=400,
            error_message="Bad request",
            error_details="Invalid parameter",
            correlation_id="xyz-789",
        )
        legacy = response.to_legacy_dict()
        assert legacy["error_details"] == "Invalid parameter"

    def test_to_legacy_dict_generates_error_message_when_missing(self) -> None:
        response = ApiResponse(status_code=404, correlation_id="test-id")
        legacy = response.to_legacy_dict()
        error_msg = legacy["error"]
        assert isinstance(error_msg, str)
        assert "Request failed with status 404" in error_msg


class TestApiResponseStringRepresentation:
    """Tests for string representation."""

    def test_str_includes_success_for_200(self) -> None:
        response = ApiResponse(status_code=200, correlation_id="abc-123", duration_ms=150)
        result = str(response)
        assert "SUCCESS" in result
        assert "200" in result
        assert "abc-123" in result
        assert "150ms" in result

    def test_str_includes_error_for_500(self) -> None:
        response = ApiResponse(status_code=500, correlation_id="xyz-789")
        result = str(response)
        assert "ERROR" in result
        assert "500" in result


class TestRateLimitHeaderMappingConstant:
    """Tests for the shared rate limit header mapping constant."""

    def test_mapping_contains_expected_keys(self) -> None:
        expected_keys = {
            "x-ratelimit-limit",
            "x-ratelimit-remaining",
            "x-ratelimit-reset",
            "retry-after",
        }
        assert set(RATE_LIMIT_HEADER_MAPPING.keys()) == expected_keys

    def test_mapping_contains_expected_values(self) -> None:
        expected_values = {"limit", "remaining", "reset", "retry_after"}
        assert set(RATE_LIMIT_HEADER_MAPPING.values()) == expected_values
