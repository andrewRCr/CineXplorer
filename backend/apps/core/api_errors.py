"""Turn exceptions raised while answering an API request into JSON error responses.

Every error body has the shape `{"detail": str, "code": str}`, with `code` only when
one applies. Ninja's own handlers already answer `HttpError` and `Http404` this way,
and keep doing so; services that raise `HttpError` move to the domain exceptions in
`apps.core.exceptions` as they change.
"""

from __future__ import annotations

import logging

from django.core.exceptions import RequestDataTooBig
from django.http import HttpRequest, HttpResponse
from ninja import NinjaAPI
from ninja.errors import ValidationError

from apps.authentication.auth_ninja import InvalidBearerTokenError
from apps.core.exceptions import DomainError
from apps.core.schemas import ErrorCode

logger = logging.getLogger(__name__)


def register_error_handlers(api: NinjaAPI) -> None:
    """Register handlers for authentication, domain and request errors."""

    @api.exception_handler(InvalidBearerTokenError)
    def invalid_bearer_token(request: HttpRequest, exc: InvalidBearerTokenError) -> HttpResponse:
        response = api.create_response(request, error_body(exc.message), status=exc.status_code)
        response["WWW-Authenticate"] = 'Bearer error="invalid_token"'
        return response

    @api.exception_handler(DomainError)
    def domain_error(request: HttpRequest, exc: DomainError) -> HttpResponse:
        return api.create_response(
            request, error_body(exc.detail, exc.code), status=exc.status_code
        )

    @api.exception_handler(ValidationError)
    def validation_error(request: HttpRequest, exc: ValidationError) -> HttpResponse:
        return api.create_response(
            request,
            error_body(describe_validation_errors(exc), ErrorCode.VALIDATION_ERROR),
            status=422,
        )

    @api.exception_handler(RequestDataTooBig)
    def request_too_large(request: HttpRequest, exc: RequestDataTooBig) -> HttpResponse:
        logger.warning("Request body exceeded upload memory limit")
        return api.create_response(request, error_body("Request body too large"), status=413)

    @api.exception_handler(Exception)
    def unhandled_error(request: HttpRequest, exc: Exception) -> HttpResponse:
        # The client gets a fixed message whatever the setting of DEBUG; the log keeps the
        # traceback, since an unexpected error can't be diagnosed without it.
        logger.error("Unhandled error answering %s %s", request.method, request.path, exc_info=exc)
        return api.create_response(request, error_body("Internal server error"), status=500)


def error_body(detail: str, code: ErrorCode | None = None) -> dict[str, str]:
    """Build an error response body, leaving `code` out when there is none."""
    if code is None:
        return {"detail": detail}
    return {"detail": detail, "code": code.value}


def describe_validation_errors(exc: ValidationError) -> str:
    """Name each invalid field with Pydantic's message for it, such as "page: ..."."""
    parts: list[str] = []
    for error in exc.errors:
        location = error.get("loc", ())
        message = error.get("msg", "Invalid value")
        parts.append(f"{location[-1]}: {message}" if location else str(message))
    return "; ".join(parts)
