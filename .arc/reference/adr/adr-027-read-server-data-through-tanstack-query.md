# ADR-027: Read Server Data Through TanStack Query

## Status

Accepted (Owner, 2026-11-03)

Superseded in part by ADR-047 (one mutation hook changing movie data with an optimistic update). The overlay of
pending and confirmed saves stands.

Implemented by: Frontend Server State (`prd-frontend-server-state.md`), including the movie detail query. The
end-to-end watchlist test remains deferred.

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

- **A first step now**, mainly so an end-to-end watchlist test could be written early. That test can be written
  after the full move instead.
- **The full move, inside the planned rework of the user's movie data (chosen).** With its test rewrites, the
  rework's largest part. The movie detail query is left to the detail page's redesign, which rewrites that page
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

## Amendment (2026-11-12)

- The movie detail page reads its movie and user state from one cached payload.
- A movie's user state is its payload overlaid by this tab's pending and confirmed saves, retained in the mutation
  cache. A failed save drops out of that overlay, revealing the preceding state. Patching an infinite list in place
  would be undone by its next-page load, which returns earlier pages' original user data; the overlay survives that
  replacement and is shared by cards and detail views.
- Every change of signed-in user, including sign-in, clears kept saves and resets every query except the session.
  Sign-in clears saves when it stores its token, then resets queries after the fresh session read lands. Sign-out
  also loads the sign-in page afresh after its request settles, dropping data fetched while a provider cookie was
  still live.
- A change of user cancels the previous user's save requests, including asynchronous request preparation and
  in-flight transport. Saves obtain one signal for their invocation's ownership generation before entering the HTTP
  client; the user-change step retires that generation synchronously. This prevents old work from acquiring
  replacement credentials while Axios prepares a request. Cancellation cannot guarantee reversal of a write the
  server already received, so count-based settlement and feedback guards remain. Current-owner saves still finish
  after their control unmounts, and one canceled caller does not abort shared renewal for another current caller.

## References

- `.arc/reference/constitution/DEVELOPMENT-RULES.md` § Frontend Data and Accessibility
- [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md), which this extends from the browse grids to all server data
- [ADR-028](adr-028-use-three-state-sign-in-status.md)
