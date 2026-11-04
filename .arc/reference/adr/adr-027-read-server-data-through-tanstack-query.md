# ADR-027: Read Server Data Through TanStack Query

## Status

Accepted (Owner, 2026-11-03)

Implemented by: the planned UserMovieData consolidation. The movie detail page moves with its planned redesign.

## Context

[ADR-020](adr-020-adopt-virtualized-infinite-scroll.md) brought in TanStack Query for the browse grids, and
`useInfiniteMovies` is still the only hook that uses it. Movie detail, the user's data for each movie and the watchlist
are fetched by hand in `useEffect`. Three problems follow:

- `MovieCard` keeps its own copy of the watchlist state, which can disagree with other views of the same movie.
- `getUserMovieDataByTmdbId` wraps its request in an `AbortController` it never connects, so its `cancel` aborts
  nothing.
- Nothing clears the query cache on sign-out, so lists can keep the previous user's flags.

The frontend rules now say server data is read through TanStack Query with keys from one key factory, changed through
mutations that update or invalidate the cache, and never fetched in `useEffect`.

### Alternatives Considered

- **A first step now** (about 3 days), mainly so an end-to-end watchlist test could be written early. That test can
  be written after the full move instead.
- **The full move, inside the planned rework of the user's movie data (chosen).** About 3.5–4.5 days with the test
  rewrites, or 2.5–3.5 with the movie detail query left to the detail page's redesign, which rewrites that page
  anyway.

## Decision

We will read and change all server data through TanStack Query.

- Query keys come from one key factory.
- A movie's user state is read from the list and detail payloads that already carry it, not fetched separately.
- One mutation hook changes a user's movie data, with an optimistic update and a rollback on failure.
- The end-to-end watchlist test is written after the move, against the new hooks.

One exception is recorded: the access-token refresh stays in `useAuth`'s effects, since it renews a token rather than
reading data a page shows. The session becomes a query once the query structure exists, as part of the same
rework ([ADR-028](adr-028-use-three-state-sign-in-status.md)).

## Consequences

### Positive

- One cache, so the same movie shows the same state everywhere.
- Signing out can clear every user's data in one call.
- Tests mock the network (MSW) rather than the hooks.

### Negative

- The rework grows: this move and its test rewrites are its largest part.
- Until it lands, the codebase holds both patterns, and the rule is enforced on new code only.

## References

- `.arc/reference/constitution/DEVELOPMENT-RULES.md` § Frontend Data and Accessibility
- [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md), which this extends from the browse grids to all server data
- [ADR-028](adr-028-use-three-state-sign-in-status.md)
