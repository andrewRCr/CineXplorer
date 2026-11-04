"""Service factory for authentication domain."""

from __future__ import annotations

from apps.authentication.services.authentication_service import AuthenticationService


def get_authentication_service() -> AuthenticationService:
    """Create AuthenticationService with default dependencies."""
    return AuthenticationService()


__all__ = ["get_authentication_service"]
