"""
Lightweight metrics and monitoring service for CineXplorer.

Provides a simple abstraction for recording metrics and errors that can be
extended to integrate with monitoring systems (Prometheus, Datadog, Sentry, etc.)
without requiring immediate infrastructure setup.

Current implementation: Structured logging with metric-friendly format
Future: Can be extended to emit to Prometheus, StatsD, or other backends
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class MetricsService:
    """
    Simple metrics service using structured logging.

    This provides a metrics abstraction that can be easily extended to integrate
    with monitoring backends (Prometheus, Datadog, Sentry, etc.) when needed.

    Current implementation logs metrics in a structured format that can be
    parsed by log aggregation systems (ELK, Splunk, CloudWatch, etc.).
    """

    @staticmethod
    def increment(
        metric_name: str,
        labels: dict[str, Any] | None = None,
        value: int = 1
    ) -> None:
        """
        Increment a counter metric.

        Args:
            metric_name: Metric name (e.g., 'email_verification_mark_failed_total')
            labels: Optional labels/tags (e.g., {'service': 'auth', 'user_id': 123})
            value: Increment value (default: 1)

        Example:
            MetricsService.increment(
                'email_verification_mark_failed_total',
                labels={'service': 'authentication', 'user_id': 123}
            )
        """
        labels = labels or {}

        # Log in structured format for metrics aggregation
        logger.info(
            f"METRIC_INCREMENT: {metric_name}",
            extra={
                "metric_type": "counter",
                "metric_name": metric_name,
                "metric_value": value,
                "metric_labels": labels,
            }
        )

        # TODO: Add Prometheus/StatsD integration when monitoring backend is configured
        # Example: prometheus_client.Counter(metric_name, labels).inc(value)

    @staticmethod
    def record_error(
        error_type: str,
        error_message: str,
        context: dict[str, Any] | None = None,
        exception: Exception | None = None
    ) -> None:
        """
        Record an error event for monitoring/alerting.

        Args:
            error_type: Error classification (e.g., 'email_verification_failure')
            error_message: Human-readable error description
            context: Optional context data (user_id, request_id, etc.)
            exception: Optional exception object for stack trace

        Example:
            MetricsService.record_error(
                'email_verification_failure',
                'Failed to mark email as verified',
                context={'user_id': 123, 'email': 'user@example.com'},
                exception=e
            )
        """
        context = context or {}

        # Log error with structured context
        log_extra = {
            "error_type": error_type,
            "error_context": context,
        }

        if exception:
            logger.exception(
                f"ERROR_EVENT: {error_type} - {error_message}",
                extra=log_extra,
                exc_info=exception
            )
        else:
            logger.error(
                f"ERROR_EVENT: {error_type} - {error_message}",
                extra=log_extra
            )

        # TODO: Add Sentry/error tracking integration when configured
        # Example: sentry_sdk.capture_exception(exception, contexts=context)


# Singleton instance for convenience
_metrics = MetricsService()


def increment(
    metric_name: str,
    labels: dict[str, Any] | None = None,
    value: int = 1
) -> None:
    """Convenience function for incrementing metrics."""
    _metrics.increment(metric_name, labels, value)


def record_error(
    error_type: str,
    error_message: str,
    context: dict[str, Any] | None = None,
    exception: Exception | None = None
) -> None:
    """Convenience function for recording errors."""
    _metrics.record_error(error_type, error_message, context, exception)
