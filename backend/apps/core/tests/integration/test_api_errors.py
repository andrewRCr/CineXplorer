"""Tests that API errors reach the client as JSON with a `detail` and an optional `code`.

The domain-error and unhandled-error cases run on a separate API with the same handlers
registered and a route that raises each error, since no project route fails that way on
request. The validation and body-limit cases run on real routes.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from http import HTTPStatus

import pytest
from django.conf import settings
from django.http import HttpRequest
from django.test import Client, override_settings
from ninja import NinjaAPI
from ninja.errors import HttpError
from ninja.testing import TestClient
from ninja.testing.client import NinjaResponse

from apps.core.api_errors import register_error_handlers
from apps.core.exceptions import (
    ConflictError,
    DomainError,
    InvalidInputError,
    NotFoundError,
    PermissionDeniedError,
    UpstreamError,
)
from apps.core.schemas import ErrorCode
from apps.core.tests.test_helpers import json_post

PRIVATE_TEXT = "private.person@example.com"

ERRORS: dict[str, Callable[[], DomainError]] = {
    "not-found": NotFoundError,
    "conflict": ConflictError,
    "invalid-input": InvalidInputError,
    "permission-denied": PermissionDeniedError,
    "upstream": UpstreamError,
    "upstream-busy": lambda: UpstreamError("External API is busy", status_code=503),
    "with-code": lambda: NotFoundError("Movie not found", code=ErrorCode.MOVIE_NOT_FOUND),
}

errors_api = NinjaAPI(urls_namespace="api-errors-test")
register_error_handlers(errors_api)


@errors_api.get("/domain/{name}")
def raise_domain_error(request: HttpRequest, name: str) -> None:
    raise ERRORS[name]()


@errors_api.get("/http-error")
def raise_http_error(request: HttpRequest) -> None:
    raise HttpError(418, "Short and stout")


@errors_api.get("/unhandled")
def raise_unhandled(request: HttpRequest) -> None:
    raise RuntimeError(f"duplicate key value ({PRIVATE_TEXT})")


client = TestClient(errors_api)


def get(path: str) -> NinjaResponse:
    """GET a path on the test API."""
    # Ninja's test client leaves its `data` parameter's types unknown.
    return client.get(path)  # pyright: ignore[reportUnknownMemberType]


@pytest.mark.parametrize(
    ("name", "status", "body"),
    [
        ("not-found", 404, {"detail": "Not found"}),
        ("conflict", 409, {"detail": "Conflict with existing data"}),
        ("invalid-input", 400, {"detail": "Invalid request"}),
        ("permission-denied", 403, {"detail": "Permission denied"}),
        ("upstream", 502, {"detail": "External API error"}),
        ("upstream-busy", 503, {"detail": "External API is busy"}),
        ("with-code", 404, {"detail": "Movie not found", "code": "movie_not_found"}),
    ],
)
def test_domain_error_answers_with_its_status_and_detail(
    name: str, status: int, body: dict[str, str]
) -> None:
    response = get(f"/domain/{name}")

    assert response.status_code == status
    assert response.json() == body


def test_http_error_keeps_its_status_and_detail() -> None:
    response = get("/http-error")

    assert response.status_code == 418
    assert response.json() == {"detail": "Short and stout"}


@pytest.mark.parametrize("debug", [False, True])
def test_unhandled_error_answers_with_json_and_logs_the_traceback(
    debug: bool, caplog: pytest.LogCaptureFixture
) -> None:
    with override_settings(DEBUG=debug), caplog.at_level(logging.ERROR, "apps.core.api_errors"):
        response = get("/unhandled")

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert response.json() == {"detail": "Internal server error"}
    assert PRIVATE_TEXT not in response.content.decode()
    [record] = [r for r in caplog.records if r.name == "apps.core.api_errors"]
    assert record.levelno == logging.ERROR
    assert record.exc_info is not None
    assert isinstance(record.exc_info[1], RuntimeError)


@pytest.mark.django_db
def test_validation_error_answers_with_one_detail_string(api_client: Client) -> None:
    response = api_client.get("/api/movies/now-playing?page=abc")

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert response.json() == {
        "detail": "page: Input should be a valid integer, unable to parse string as an integer",
        "code": "validation_error",
    }


@pytest.mark.django_db
def test_validation_error_names_every_invalid_field(api_client: Client) -> None:
    response = json_post(api_client, "/api/logs/", {"level": "NOPE", "timestamp": "now"})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    detail = response.json()["detail"]
    assert detail.startswith("level: Input should be")
    assert "; message: Field required" in detail


@pytest.mark.django_db
@pytest.mark.parametrize("debug", [False, True])
def test_oversized_body_answers_with_json_and_warns_without_a_traceback(
    debug: bool, api_client: Client, caplog: pytest.LogCaptureFixture
) -> None:
    limit = settings.DATA_UPLOAD_MAX_MEMORY_SIZE
    assert limit is not None
    payload: dict[str, object] = {"email": PRIVATE_TEXT, "padding": "x" * (limit + 1)}

    with override_settings(DEBUG=debug), caplog.at_level(logging.WARNING, "apps.core.api_errors"):
        response = json_post(api_client, "/api/register/", payload)

    assert response.status_code == HTTPStatus.REQUEST_ENTITY_TOO_LARGE
    assert response.json() == {"detail": "Request body too large"}
    assert PRIVATE_TEXT not in response.content.decode()
    [record] = [r for r in caplog.records if r.name == "apps.core.api_errors"]
    assert record.levelno == logging.WARNING
    assert record.exc_info is None
    assert PRIVATE_TEXT not in record.getMessage()
