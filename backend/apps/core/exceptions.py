"""Domain exceptions that services raise for the API layer to answer.

Services raise these rather than HTTP errors. One handler, registered on the API in
`apps.core.api_errors`, turns each into a response with the exception's status and a
`{"detail": ..., "code": ...}` body, where `code` appears only when one was given.
"""

from __future__ import annotations

from typing import Literal

from apps.core.schemas import ErrorCode


class DomainError(Exception):
    """Base for the errors a service raises; each subclass fixes its HTTP status.

    Args:
        detail: Message for the client; the class's default when omitted. It reaches the
            response, so it never carries an external service's text or a secret.
        code: Machine-readable error code for the client, when one applies.
    """

    status_code: int = 500
    default_detail: str = "Internal server error"

    def __init__(self, detail: str | None = None, *, code: ErrorCode | None = None) -> None:
        self.detail = detail if detail is not None else self.default_detail
        self.code = code
        super().__init__(self.detail)


class NotFoundError(DomainError):
    """The requested resource does not exist, or is not the requester's to see."""

    status_code = 404
    default_detail = "Not found"


class ConflictError(DomainError):
    """The request conflicts with existing data, such as a duplicate."""

    status_code = 409
    default_detail = "Conflict with existing data"


class InvalidInputError(DomainError):
    """The request is well-formed but its values can't be acted on."""

    status_code = 400
    default_detail = "Invalid request"


class PermissionDeniedError(DomainError):
    """The requester may not perform this action."""

    status_code = 403
    default_detail = "Permission denied"


class UpstreamError(DomainError):
    """An external service failed, was busy or timed out.

    Args:
        detail: Fixed message for the client, never the service's own error text.
        status_code: 502 when the service failed, 503 when it was busy, 504 when it
            timed out.
        code: Machine-readable error code for the client, when one applies.
    """

    status_code = 502
    default_detail = "External API error"

    def __init__(
        self,
        detail: str | None = None,
        *,
        status_code: Literal[502, 503, 504] = 502,
        code: ErrorCode | None = None,
    ) -> None:
        super().__init__(detail, code=code)
        self.status_code = status_code


__all__ = [
    "ConflictError",
    "DomainError",
    "InvalidInputError",
    "NotFoundError",
    "PermissionDeniedError",
    "UpstreamError",
]
