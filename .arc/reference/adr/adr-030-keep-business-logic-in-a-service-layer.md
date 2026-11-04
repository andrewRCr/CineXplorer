# ADR-030: Keep Business Logic in a Service Layer

## Status

Accepted (Owner, 2025-10-22)

Recorded 2026-11-04 from sources of the time.

Implemented by: PR #8 (`ebc1e586`, 2025-12-19), which moved the backend's business logic into seven class-based
services. The layering rule entered `DEVELOPMENT-RULES.md` (version 2.11) on 2025-10-31 (`2321d784`).

## Context

After the move to Django Ninja ([ADR-029](adr-029-replace-drf-with-django-ninja.md)), the backend's structure was
uneven. The proposal of 2025-10-22 listed, among its problems:

- "UserMovieData CRUD business logic resides in API layer (should be in service layer)", and authentication's
  logic (registration, token management, email verification, profiles) did too.
- "Function-based movie service lacks dependency injection pattern."
- The same TMDB batch-fetch logic was repeated across endpoints.
- The enrichment service had a dependency-injection signature but called the ORM directly.

Alternatives considered:

- **Business logic in the API routes:** the existing state for user movie data and authentication.
- **Function-based services:** the existing movie service.
- **Class-based services with constructor injection (chosen),** with a repository for user movie data that the
  services take by injection.

No other arrangement was compared. The reasons were two of the proposal's goals, "Improve Maintainability:
Eliminate duplicate code and establish consistent service layer architecture" and "Enable Testing: Make services
easier to test through dependency injection", and the four the strategy gave when the work finished:

- "Testability: Services with injected dependencies can be tested with mocks"
- "Separation of concerns: API layer stays thin and focused on HTTP"
- "Reusability: Service methods can be called from multiple API endpoints"
- "Maintainability: Business logic changes don't require API layer changes"

## Decision

We will keep API routes to HTTP concerns: an endpoint extracts its parameters, calls a service and returns the
response. All business logic (filtering, calculations, presets, orchestration) lives in the service layer, in
classes that take their dependencies, such as the TMDB client, through the constructor, with production defaults.
Pure, deterministic helpers may stay plain functions. User movie data is read and written through a repository the
services receive the same way.

## Consequences

### Positive

- Endpoints stay thin, and one service method can serve several endpoints.
- A service's external clients can be replaced in tests by passing a stand-in to the constructor, without patching.
- New backend code has one documented pattern to follow (`strategy-service-layer.md`).

### Negative

- An endpoint's behavior is split across a route and a service, and for user movie data a repository as well.
- Each service class carries constructor wiring and defaults that a plain function would not need.

Current state: ADR-024 replaced the `HttpError` that services raised, choosing status codes themselves, with domain
exceptions mapped in one handler; ADR-025 folded the UserMovieData repository into its service, and the strategy now
makes repositories optional and tests services against the real database.

## References

- `.arc/reference/constitution/DEVELOPMENT-RULES.md` § Layered Architecture (Backend)
- `.arc/reference/strategies/project/strategy-service-layer.md`: version 1.0 (`5719d12f`) § Why This Matters, and the
  current version
- `.arc/reference/archive/2025-q4/technical/25_service-layer-modernization/prd-service-layer-modernization.md`
  §§ 1 and 2
- `.arc/reference/archive/2025-q4/technical/25_service-layer-modernization/completion-service-layer-modernization.md`
- [ADR-024](adr-024-map-domain-exceptions-to-one-error-contract.md),
  [ADR-025](adr-025-fold-repository-into-service-layer.md)
