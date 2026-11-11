# Completion: User-Movie Data Layer

**Prepared:** 2026-11-11
**Status:** Draft — post-merge staging evidence remains open
**Branch:** `technical/user-movie-data`
**Category:** Technical
**Context:** Establish the stored data and save contract used by the planned movie controls and Library.

## Summary

A signed-in user can save any part of their movie state with one PATCH addressed by TMDB ID, including their first
save and explicit clearing of nullable values. Library pages read stored movie cards and user state from the database,
while detail views and nightly maintenance keep saved cards fresh.

## Key Deliverables

- A service over shared QuerySet filters, with its database behavior tested before the repository was removed.
- Reversible Movie and UserMovieData migrations, timestamps and database constraints on persisted user state.
- One partial-save contract, owner-scoped reads and deletes, declared error responses and per-user save limits.
- A filtered, sorted, paginated Library whose service read uses two queries without contacting TMDB.
- Shared card mapping used by first saves, stored detail views and a bounded nightly refresh with freshness alerts.
- Watchlist and detail callers adapted to the new routes, with regenerated API schemas and TypeScript types.
- ADR-043 for the partial-save decision and the corresponding amendments to ADR-025 and ADR-026.

## Implementation Highlights

- A missing card is fetched before the user-state transaction. Database uniqueness and a row lock serialize
  concurrent saves while omitted fields retain their stored values.
- Fixed-window Redis counters bound each user's saves; cache failures permit saves and leave freshness monitoring
  as the detector while counting is unavailable.
- Failed refreshes leave stored cards unchanged. Maintenance reports rows older than seven days and retains its
  output in the journal; removed movies require an operator's decision.
- The frontend sends the destination state displayed by the card, so repeated clicks work even when its original
  movie prop carried no saved user data.

## Validation

The local verification run passes backend and frontend suites, Chromium smokes, deployment-script tests, lint,
formatting, type checks, semantic-token contrast and the production build. Regenerating the OpenAPI schema and
TypeScript produces no diff. The rewritten service tests also pass at their original pre-fold commit `8e3d1376`.
Criterion-level evidence is recorded in `tasks-user-movie-data.md`.

The card-storage correction is covered by regression cases for existing text limits, unchanged failed rows,
unstored detail display and refresh continuation. Both affected backend app suites and the covering browser smokes
pass after that correction, together with lint, formatting and Python type checks.

After integrating the current palette and dependency updates, the full backend and frontend suites and every
browser smoke pass again. Lint, formatting, types, contrast, production build and regenerated API artifacts also
pass on that integrated tree.

PR #173 at `0c3be00a` passes every required CI job, including `ci-ok`, in run `43107100580`.
The API type-drift job proves Implemented criterion 12. CI’s locked Django stubs exposed eight obsolete constraint
suppressions; their removal passes the pinned checker and leaves the production AST unchanged.

## Remaining Evidence

- Before the merge deploys, staging must contain at least one saved movie, added through the app with the staging
  test account if necessary. After deployment, its nightly refresh must report success, refresh at least one row
  without stale IDs, and leave the stored movie's vote fields populated in that account's Library response.
- The completion date and final status will be recorded when the required evidence is available.

## Related Documentation

- Draft: `draft-user-movie-data.md`
- PRD: `prd-user-movie-data.md`
- Tasks: `tasks-user-movie-data.md`

## Follow-Up Work

The frontend's move to shared server-state queries and mutations, new user-facing movie controls, and watchlist
ordering remain separate planned work. This change supplies their backend contract without adding those interfaces.
