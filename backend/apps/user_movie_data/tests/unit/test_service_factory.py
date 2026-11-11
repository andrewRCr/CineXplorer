"""Unit tests for service factory functions.

This module tests the factory functions that create service instances with
appropriate dependencies injected.
"""

from __future__ import annotations

from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService
from apps.user_movie_data.services.service_factory import get_movie_enrichment_service


def test_get_movie_enrichment_service_returns_service_instance() -> None:
    """Test that factory returns a MovieEnrichmentService instance."""
    # Act
    service = get_movie_enrichment_service()

    # Assert
    assert isinstance(service, MovieEnrichmentService)


def test_factory_creates_new_instance_each_call() -> None:
    """Test that factory creates a new service instance on each call."""
    # Act
    service1 = get_movie_enrichment_service()
    service2 = get_movie_enrichment_service()

    # Assert: Different instances
    assert service1 is not service2
