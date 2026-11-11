# ADR-025: Fold the UserMovieData Repository into Its Service

## Status

Accepted; Superseded in part by ADR-041 (the duplicate-save 409)

Implemented by: the first step of the planned UserMovieData consolidation.

## Context

`UserMovieDataRepository` (`backend/apps/user_movie_data/repositories.py`) sits between `UserMovieDataService` and
the ORM. It adds three things: scoping each query to the user, mapping a database `IntegrityError` to a `ValueError`,
and building the map that enriches movie lists with each user's data.

The service-layer strategy used to present repositories as a way to test services without the database: "tests can
inject mock repositories instead of mocking ORM". The service tests followed it. `test_user_movie_data_service.py`
and `test_movie_enrichment_service.py` mock the repository whole (39 unit tests never touch the database), and some
assert only what the mocks were told to return. That contradicts the project's testing standards, which say to let
the database be real and never mock internals. The strategy was revised on 2026-11-03: repositories are optional, and
a service that uses one is tested through the real repository and the test database.

A planned rework of the `UserMovieData` model adds timestamps, database constraints, and a nullable watched date.
Every model change also has to edit the repository's method signatures.

### Alternatives Considered

- **Keep the repository and its mock-based tests.** Rejected: the tests check the mocks rather than the queries, and
  wouldn't catch a broken model change.
- **Keep the repository, with its tests moved to the real database.** About the same cost as folding it, but every
  model change still edits the repository's signatures as well as the service.
- **Fold it into the service, with a `QuerySet` for the shared filters (chosen).** The 39 mock-based tests move to
  the real database first, then the repository's code moves into the service.

## Decision

We will fold `UserMovieDataRepository` into `UserMovieDataService`. The filters several queries share (user scoping
among them) move to a custom `QuerySet` on the model. Before the fold, the service tests move to the real test
database, so they guard both the fold and the model change that follows it. Tests replace only real boundaries: TMDB,
OAuth providers, mail and time.

A duplicate save becomes a `ConflictError` (409) under
[ADR-024](adr-024-map-domain-exceptions-to-one-error-contract.md), in place of the repository's `ValueError`.

## Consequences

### Positive

- One layer fewer: a model change edits the model, its `QuerySet` and the service.
- Service tests exercise the real queries, constraints and transactions, so they catch what mocks hid.
- The code matches the revised strategy and the testing standards.

### Negative

- The service grows by the repository's query code, and the `QuerySet` becomes a second place to look for data
  access.
- Moving 39 tests to the database first is work that delivers no feature.

## References

- `.arc/reference/strategies/project/strategy-service-layer.md` § Repository Pattern (version 1.1 and later)
- `.arc/reference/strategies/project/strategy-testing-methodology.md`
- [ADR-024](adr-024-map-domain-exceptions-to-one-error-contract.md)
