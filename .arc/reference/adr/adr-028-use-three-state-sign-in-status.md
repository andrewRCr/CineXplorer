# ADR-028: Use a Three-State Sign-In Status

## Status

Accepted (Owner, 2026-11-03)

Implemented by: #104, which adds the status, the guarded layout route and the return to the requested page after
sign-in. Frontend Server State (`prd-frontend-server-state.md`) moves the session onto TanStack Query while
preserving that status and return-path behavior.
Its dated amendment below specifies ownership while a provider-return read is pending.

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
- **Right after it merges, before the core screens (chosen).** A frontend change to `useAuth`, its callers and the
  routes.
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

## Amendments

**Amendment (2026-11-12): Pending session resolution owns authentication.** A provider-return session query acquires
a version-bound identity before discovery and retains it through any password renewal and profile fallback. Stored
credentials can still give an immediate authenticated display, but background password failure cannot cancel that
read, publish anonymous or redirect while it owns resolution. Idle checks start no renewal during that interval.
API requests continue normally, including shared renewal; waiting for discovery would deadlock the fallback profile
read that uses the same client.

Background failure effects require the originating authentication version, present password access credentials
(including expired credentials), no resolution owner and an uncancelled API caller. Idle handling also requires its
original user-change count and rechecks after awaiting query cancellation. Failed fallback clears both credential
stores synchronously before releasing ownership. Thus a shared renewal rejection cannot redirect either before
the reader concludes or afterward, when credentials are absent. Successful fallback retains ordinary subsequent
password-failure handling.

Each API caller keeps its renewal budget, version, cancellation signal and feedback policy. Renewal failure is
terminal for that operation and preserves the underlying failure with caller-specific attribution; it cannot replay
the refresh request or fulfill a movie/profile read with token data. Query cancellation reaches provider and profile
requests and their renewal continuations, preventing late credential or user changes even after ownership ends.
Canceling one caller leaves shared renewal available to other current callers. Cleanup releases only its own
identity. Explicit successful password sign-in and sign-out invalidate prior ownership and renewal before replacing
credentials or session data. Provider acceptance checks cancellation and version, then invalidates prior work,
clears password credentials and returns its profile synchronously.

## References

- `frontend/src/hooks/auth/useAuth.ts`, `frontend/src/components/auth/ProtectedRoute.tsx`, `frontend/src/App.tsx`
- [ADR-027](adr-027-read-server-data-through-tanstack-query.md)
