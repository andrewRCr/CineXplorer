"""
Django type extensions for type checking.

This module provides type-only extensions for Django objects to support
custom attributes that may be added by middleware.

IMPORTANT: This is a TYPE-ONLY extension for mypy/pyright.
- Use ONLY in type hints, never in isinstance() checks
- Do not import at runtime unless for typing
- Actual middleware must set these attributes at runtime
"""
from __future__ import annotations

from django.http import HttpRequest as DjangoHttpRequest


class HttpRequest(DjangoHttpRequest):
    """
    Extended HttpRequest type for custom middleware attributes.

    TYPE-ONLY CLASS: Use only in function signatures, never in isinstance().

    Custom attributes (set by middleware, not yet implemented):
        correlation_id: Request correlation ID for distributed tracing
        start_time: Request start timestamp for performance monitoring

    Usage in type hints:
        ```python
        from config.django_types import HttpRequest

        def my_view(request: HttpRequest) -> HttpResponse:
            # Type checker knows about request.correlation_id and request.start_time
            logger.info("Request", extra={'correlation_id': request.correlation_id})
        ```

    Testing considerations:
        If using RequestFactory in tests, you must manually set these attributes:
        ```python
        request = RequestFactory().get('/')
        request.correlation_id = 'test-correlation-id'
        request.start_time = time.time()
        ```

    TODO: Implement middleware to actually set these attributes at runtime.
          Until then, accessing these attributes will raise AttributeError.
    """

    # Custom attributes (will be set by future middleware)
    correlation_id: str
    start_time: float


__all__ = ["HttpRequest"]