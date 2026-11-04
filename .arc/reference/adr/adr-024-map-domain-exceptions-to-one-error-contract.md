# ADR-024: Map Domain Exceptions to One Error Contract

## Status

Accepted (Owner, 2026-11-03)

Implemented by: the shared API error handler, PR #65. The services move to it as they change.

## Context

`DEVELOPMENT-RULES.md` says API routes handle HTTP concerns only and services hold the business logic. In practice
the services raised Django Ninja's `HttpError` directly: the movie, people, keyword, validator and UserMovieData
services did, following the service-layer strategy's own template. Two things follow from that:

- Services chose HTTP status codes, which the layering rule gives to the API layer.
- No handler was registered for anything else, so an unexpected error in production reached the client as Django's
  HTML 500 page.

The API also answers errors in three shapes: `{"error": ...}` from authentication, `{"detail": ...}` elsewhere, and
`{success, error}` from the logging endpoints. In DEBUG, authentication adds debug text under `detail`, which the
frontend shows. A shared `ApiErrorSchema` exists, but only the error-code listing uses it; no error response does.

### Alternatives Considered

- **Keep `HttpError` in services.** No work now, but the layering rule stays broken and unhandled errors stay HTML.
- **Domain exceptions and one handler now; services move when they change (chosen).** About half a day to a day.
- **Also unify authentication's `{"error"}` bodies now.** About 1.5–2 days: some 20 response bodies, 63 test
  assertions and the sign-in page. The authentication code is being reworked for launch, so this waits until
  after launch.

## Decision

We will have services raise domain exceptions, never `HttpError`, and map them to responses in one place.

- `apps/core/exceptions.py` defines a `DomainError` base and `NotFoundError` (404), `ConflictError` (409),
  `InvalidInputError` (400), `PermissionDeniedError` (403) and `UpstreamError` (502; 503 when the upstream service is
  busy, 504 on a timeout). The `Error` suffix follows the project's lint rules and keeps `PermissionDeniedError` from
  shadowing Django's `PermissionDenied`.
- `apps/core/api_errors.py` registers the handlers in `config/api.py`. A domain error answers with its status and
  `{"detail": str, "code"?: str}`, where `code` comes from the existing `ErrorCode` enum. A validation error answers
  422 with `{"detail": "field: message; …", "code": "validation_error"}` in place of Ninja's list. Any other exception
  answers 500 `{"detail": "Internal server error"}` in every mode, and its traceback goes to the log only.
- New endpoints use `{"detail"}`. Authentication's `{"error"}` bodies move after launch.

## Consequences

### Positive

- Services no longer depend on HTTP, and the API layer owns status codes, as the layering rule says.
- Every API error is JSON, including unexpected ones, and no exception text reaches a client.
- The frontend can rely on reading `detail` as a string, which it already did.

### Negative

- Two shapes remain until authentication moves: `{"error"}` there, `{"detail"}` everywhere else.
- Existing `HttpError` raises outside the moved modules keep working through Ninja's own handler, so the codebase
  holds both styles until each service is next touched.
- Every 422 body changed shape at once. No frontend code read the old list.

### Risks

- The 500 handler logs the full traceback, and a traceback can quote personal data (a database integrity error can
  quote a duplicate email). The logging rules name this handler as their one exception: it can't tell which errors
  carry personal data, and an unexpected error can't be diagnosed without its traceback. Django already logged the
  same tracebacks before this change. A broad `except` around an error known to carry personal data logs the
  exception's type only.

## References

- `.arc/reference/constitution/DEVELOPMENT-RULES.md` § Layered Architecture and § Errors and Logging
- `.arc/reference/strategies/project/strategy-service-layer.md`
- [ADR-025](adr-025-fold-repository-into-service-layer.md), whose service raises these exceptions
