# ADR-028: Use a Three-State Sign-In Status

## Status

Accepted (Owner, 2026-11-03)

Implemented by: a frontend change planned right after the launch-readiness change merges, before the core feature
screens are built.

## Context

`useAuth` holds sign-in state as a boolean, `isAuthenticated`. Its first value comes from a stored access token and a
stored flag. A user signed in with Google or GitHub has neither: the browser session authenticates them, and
`useAuth` learns that from a request to allauth's session endpoint after the page loads. Until that request returns,
they read as signed out, so the navigation bar shows the signed-out state and then changes.

Profile, Watchlist and Settings have no route guard. The app's `ProtectedRoute` wraps only a development page, so a
signed-out visitor reaches these pages unguarded.

### Alternatives Considered

- **Alongside the authentication work being done for launch.** That work also edits `useAuth`, so this one waits
  until it merges.
- **Right after it merges, before the core screens (chosen).** About 1–1.5 days.
- **The session as a TanStack query now.** Deferred until the query structure exists
  ([ADR-027](adr-027-read-server-data-through-tanstack-query.md)).

## Decision

We will give the frontend a three-state sign-in status: `resolving`, `authenticated` or `anonymous`.

- The status starts as `resolving` while any sign-in check is in flight, so nothing renders the signed-out state for
  a user who is signed in.
- `isAuthenticated` stays, derived from the status, so existing callers and tests keep working.
- One guarded layout route wraps the pages that need a signed-in user. While the status is `resolving` it waits; when
  it is `anonymous` it redirects to sign-in and returns the user to the page they asked for afterwards.
- The session moves onto TanStack Query with the planned rework of the user's movie data
  ([ADR-027](adr-027-read-server-data-through-tanstack-query.md)).

## Consequences

### Positive

- No flash of the signed-out state for Google and GitHub users.
- Pages that need a user are guarded in one place, and a new page joins by being placed under the layout route.
- After signing in, users land where they meant to go.

### Negative

- Every place that shows sign-in state has to handle `resolving`, usually with a placeholder.
- A brief wait on first load while the session check returns, where today the page renders at once (in the wrong
  state).

## References

- `frontend/src/hooks/auth/useAuth.ts`, `frontend/src/components/auth/ProtectedRoute.tsx`, `frontend/src/App.tsx`
- [ADR-027](adr-027-read-server-data-through-tanstack-query.md)
