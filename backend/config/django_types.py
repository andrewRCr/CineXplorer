"""
Django type extensions for mypy.

This module provides type extensions for Django objects to support
custom attributes and patterns used in the application.
"""
from __future__ import annotations

from django.http import HttpRequest as DjangoHttpRequest


class HttpRequest(DjangoHttpRequest):
    """Extended HttpRequest with custom attributes."""

    # Custom attributes added by middleware
    correlation_id: str
    start_time: float