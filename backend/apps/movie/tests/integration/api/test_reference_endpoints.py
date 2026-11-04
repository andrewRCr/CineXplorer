"""Integration tests for reference data endpoints (genres, keywords, people).

These endpoints provide lookup data for filtering and display purposes.
They wrap TMDB API calls and return structured responses.
"""

from unittest.mock import Mock, patch

import pytest
from django.test import Client

from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import HTTPStatus
from apps.core.types.api_types import TMDBResponseData
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET

pytestmark = pytest.mark.django_db


# =========================
# Genres Endpoint Tests
# =========================


@patch(TMDB_CLIENT_GET)
def test_get_movie_genres(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test retrieving the list of available movie genres from TMDB."""
    # Arrange: Mock TMDB genres response
    genres_data = {
        "genres": [
            {"id": 28, "name": "Action"},
            {"id": 12, "name": "Adventure"},
            {"id": 16, "name": "Animation"},
        ]
    }
    mock_api_response = ApiResponse(status_code=200, data=genres_data)
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the genres endpoint
    res = api_client.get("/api/genres")

    # Assert: Check response structure
    assert res.status_code == HTTPStatus.OK
    data: list[dict[str, object]] = res.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert data[0]["id"] == 28
    assert data[0]["name"] == "Action"


# =========================
# Keywords Endpoint Tests
# =========================


@patch(TMDB_CLIENT_GET)
def test_get_popular_keywords(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test retrieving popular keywords with pagination."""
    # Arrange: Mock TMDB keywords response
    keywords_data: TMDBResponseData = {
        "results": [
            {"id": 1, "name": "superhero"},
            {"id": 2, "name": "based on novel"},
        ],
        "page": 1,
        "total_pages": 10,
        "total_results": 100,
    }
    mock_api_response = ApiResponse(status_code=200, data=keywords_data)
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the popular keywords endpoint
    res = api_client.get("/api/keywords", {"page": 1})

    # Assert: Check response structure
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert "results" in data
    assert "page" in data
    assert data["page"] == 1
    assert len(data["results"]) == 2


@patch(TMDB_CLIENT_GET)
def test_search_keywords(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test searching for keywords by query string."""
    # Arrange: Mock TMDB search keywords response
    keywords_data: TMDBResponseData = {
        "results": [{"id": 5, "name": "superhero movie"}],
        "page": 1,
        "total_pages": 1,
        "total_results": 1,
    }
    mock_api_response = ApiResponse(status_code=200, data=keywords_data)
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the search keywords endpoint
    res = api_client.get("/api/keywords/search", {"query": "superhero"})

    # Assert: Check response structure
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["name"] == "superhero movie"


# =========================
# People Endpoint Tests
# =========================


@patch(TMDB_CLIENT_GET)
def test_get_popular_people(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test retrieving popular people (actors, directors, etc.) with pagination."""
    # Arrange: Mock TMDB people response
    people_data: TMDBResponseData = {
        "results": [
            {"id": 1, "name": "Tom Hanks", "known_for_department": "Acting"},
            {"id": 2, "name": "Steven Spielberg", "known_for_department": "Directing"},
        ],
        "page": 1,
        "total_pages": 20,
        "total_results": 200,
    }
    mock_api_response = ApiResponse(status_code=200, data=people_data)
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the popular people endpoint
    res = api_client.get("/api/people", {"page": 1})

    # Assert: Check response structure
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert "results" in data
    assert "page" in data
    assert data["page"] == 1
    assert len(data["results"]) == 2


@patch(TMDB_CLIENT_GET)
def test_search_people(mock_tmdb_get: Mock, api_client: Client) -> None:
    """Test searching for people by query string."""
    # Arrange: Mock TMDB search people response
    people_data: TMDBResponseData = {
        "results": [{"id": 31, "name": "Tom Cruise", "known_for_department": "Acting"}],
        "page": 1,
        "total_pages": 1,
        "total_results": 1,
    }
    mock_api_response = ApiResponse(status_code=200, data=people_data)
    mock_tmdb_get.return_value = mock_api_response

    # Act: Call the search people endpoint
    res = api_client.get("/api/people/search", {"query": "Tom Cruise"})

    # Assert: Check response structure
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["name"] == "Tom Cruise"
