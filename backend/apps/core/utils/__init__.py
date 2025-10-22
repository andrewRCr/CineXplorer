"""Core application utilities.

This module provides cross-domain utilities and helpers that are used across
multiple applications in the CineXplorer project.

Sub-modules:
- http: HTTP request/response utilities
- validators: Pydantic field validators
- schemas: Generic schema definitions
"""

from .http import build_error_response, get_client_info
from .schemas import PaginatedResponse
from .validators import empty_str_to_none

__all__ = [
    "PaginatedResponse",
    "build_error_response",
    "empty_str_to_none",
    "get_client_info",
]
