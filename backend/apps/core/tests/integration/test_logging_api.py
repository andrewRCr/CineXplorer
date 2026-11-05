"""Tests for the frontend logging API endpoints (Django Ninja).

This module tests the Django Ninja API endpoints that receive frontend log entries
and process them for centralized logging.

Endpoints tested:
- POST /api/logs/ - Frontend log submission
- GET /api/logs/health/ - Logging system health check
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import pytest
from django.test import override_settings

if TYPE_CHECKING:
    from django.test import Client


# Test fixtures


@pytest.fixture
def valid_log_payload() -> dict[str, object]:
    """Create a valid frontend log entry payload."""
    return {
        "level": "ERROR",
        "message": "Test frontend error",
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "url": "https://example.com/test",
        "user_agent": "Mozilla/5.0 Test Browser",
        "session_id": "test-session-123",
        "source": "frontend",
        "environment": "test",
    }


# Frontend Log Submission Tests (POST /api/logs/)


@pytest.mark.django_db
class TestFrontendLogEndpoint:
    """Test cases for the POST /api/logs/ endpoint."""

    def test_valid_log_entry(self, client: Client, valid_log_payload: dict[str, object]) -> None:
        """Test that a valid log entry is processed successfully."""
        response = client.post(
            "/api/logs/",
            data=valid_log_payload,
            content_type="application/json",
        )

        assert response.status_code == 201
        response_data = response.json()
        assert response_data["success"] is True
        assert response_data["message"] == "Log entry received"

    def test_valid_log_entry_with_optional_fields(
        self, client: Client, valid_log_payload: dict[str, object]
    ) -> None:
        """Test log entry with all optional fields."""
        payload = {
            **valid_log_payload,
            "data": {"error_code": "ERR_001", "context": "button_click"},
            "correlation_id": "test-correlation-123",
            "user_id": 42,
            "browser_info": {
                "user_agent": "Mozilla/5.0",
                "language": "en-US",
                "platform": "Linux",
            },
            "recent_interactions": [
                {"type": "click", "target": "#submit-button"},
                {"type": "navigation", "url": "/test"},
            ],
        }

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        assert response.status_code == 201
        response_data = response.json()
        assert response_data["success"] is True

    def test_missing_required_field_level(
        self, client: Client, valid_log_payload: dict[str, object]
    ) -> None:
        """Test that missing 'level' field returns validation error."""
        payload = {**valid_log_payload}
        del payload["level"]

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        assert response.status_code == 422  # Django Ninja validation error
        response_data = response.json()
        assert "detail" in response_data

    def test_missing_required_field_message(
        self, client: Client, valid_log_payload: dict[str, object]
    ) -> None:
        """Test that missing 'message' field returns validation error."""
        payload = {**valid_log_payload}
        del payload["message"]

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        assert response.status_code == 422  # Django Ninja validation error

    def test_missing_required_field_timestamp(
        self, client: Client, valid_log_payload: dict[str, object]
    ) -> None:
        """Test that missing 'timestamp' field returns validation error."""
        payload = {**valid_log_payload}
        del payload["timestamp"]

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        assert response.status_code == 422  # Django Ninja validation error

    def test_invalid_log_level(self, client: Client, valid_log_payload: dict[str, object]) -> None:
        """Test that invalid log level returns validation error."""
        payload = {
            **valid_log_payload,
            "level": "INVALID_LEVEL",
        }

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        # Django Ninja returns 422 for Pydantic schema validation failures
        # (happens before endpoint logic runs, not a business logic 400 error)
        assert response.status_code == 422
        response_data = response.json()
        # Django Ninja validation errors have a different structure
        assert "detail" in response_data

    def test_invalid_timestamp_format(
        self, client: Client, valid_log_payload: dict[str, object]
    ) -> None:
        """Test that invalid timestamp format returns validation error."""
        payload = {
            **valid_log_payload,
            "timestamp": "not-a-valid-timestamp",
        }

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        assert response.status_code == 400
        response_data = response.json()
        assert response_data["success"] is False
        assert "Invalid timestamp format" in response_data["error"]

    def test_all_valid_log_levels(
        self, client: Client, valid_log_payload: dict[str, object]
    ) -> None:
        """Test that all valid log levels are accepted."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "WARN", "ERROR", "CRITICAL"]

        for level in valid_levels:
            payload = {
                **valid_log_payload,
                "level": level,
            }

            response = client.post(
                "/api/logs/",
                data=payload,
                content_type="application/json",
            )

            assert response.status_code == 201, f"Level {level} should be accepted"

    @override_settings(FRONTEND_LOG_MAX_PAYLOAD_SIZE=100)  # 100 bytes
    def test_payload_too_large(self, client: Client, valid_log_payload: dict[str, object]) -> None:
        """Test that oversized payload is rejected."""
        # Create a large payload (>100 bytes with large message)
        payload = {
            **valid_log_payload,
            "message": "X" * 500,  # Large message
        }

        response = client.post(
            "/api/logs/",
            data=payload,
            content_type="application/json",
        )

        assert response.status_code == 413
        response_data = response.json()
        assert response_data["success"] is False
        assert "Payload too large" in response_data["error"]
        assert "max_size_bytes" in response_data

    @override_settings(FRONTEND_LOG_MAX_MESSAGE_LENGTH=50)
    def test_message_truncation(
        self,
        client: Client,
        valid_log_payload: dict[str, object],
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        """Test that long messages are truncated."""
        payload = {
            **valid_log_payload,
            # Use INFO to avoid dual logging (ERROR logs to both frontend and app)
            "level": "INFO",
            "message": "X" * 100,  # Message longer than 50 chars
        }

        with caplog.at_level(logging.INFO, logger="frontend"):
            response = client.post(
                "/api/logs/",
                data=payload,
                content_type="application/json",
            )

        # Should still succeed, message just gets truncated internally
        assert response.status_code == 201

        # Verify truncation occurred in logged message. caplog also captures the request
        # middleware's own logger, so count only the frontend logger's records.
        frontend_records = [record for record in caplog.records if record.name == "frontend"]
        assert len(frontend_records) == 1
        logged_message = frontend_records[0].message
        # Message should be "[FRONTEND] " + 50 chars + "…[truncated]"
        assert "[FRONTEND] " in logged_message
        assert "X" * 50 in logged_message
        assert logged_message.endswith("…[truncated]")
        # Verify the raw message part (after "[FRONTEND] ") was truncated correctly
        raw_part = logged_message.replace("[FRONTEND] ", "")
        assert len(raw_part) == 50 + len("…[truncated]")

    def test_malformed_json(self, client: Client) -> None:
        """Test that malformed JSON returns appropriate error."""
        response = client.post(
            "/api/logs/",
            data="{ invalid json }",
            content_type="application/json",
        )

        assert response.status_code in [400, 422]  # Bad request or validation error

    def test_empty_payload(self, client: Client) -> None:
        """Test that empty payload returns validation error."""
        response = client.post(
            "/api/logs/",
            data={},
            content_type="application/json",
        )

        assert response.status_code == 422  # Django Ninja validation error


# Logging Health Check Tests (GET /api/logs/health/)


@pytest.mark.django_db
class TestLogHealthCheckEndpoint:
    """Test cases for the GET /api/logs/health/ endpoint."""

    def test_health_check_success(self, client: Client) -> None:
        """Test that health check returns healthy status."""
        response = client.get("/api/logs/health/")

        assert response.status_code == 200
        response_data = response.json()
        assert response_data["status"] == "healthy"
        assert response_data["service"] == "logging"
        assert "correlation_id" in response_data
        assert "timestamp" in response_data

    def test_health_check_returns_correlation_id(self, client: Client) -> None:
        """Test that health check includes correlation ID."""
        response = client.get("/api/logs/health/")

        assert response.status_code == 200
        response_data = response.json()
        assert response_data["correlation_id"] is not None
        assert isinstance(response_data["correlation_id"], str)
        assert len(response_data["correlation_id"]) > 0

    def test_health_check_returns_timestamp(self, client: Client) -> None:
        """Test that health check includes ISO format timestamp."""
        response = client.get("/api/logs/health/")

        assert response.status_code == 200
        response_data = response.json()
        assert response_data["timestamp"] is not None

        # Verify it's a valid ISO format timestamp
        timestamp_str = response_data["timestamp"]
        # Should be parseable as datetime
        datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

    def test_health_check_no_authentication_required(self, client: Client) -> None:
        """Test that health check does not require authentication."""
        # No auth header, should still work
        response = client.get("/api/logs/health/")

        assert response.status_code == 200

    def test_health_check_wrong_method(self, client: Client) -> None:
        """Test that wrong HTTP method returns appropriate error."""
        response = client.post("/api/logs/health/")

        assert response.status_code == 405  # Method not allowed
