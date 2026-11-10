# ADR-040: Sign In with a Header Token and a Refresh Cookie, and Sessions for Google and GitHub

## Status

Accepted (Owner, 2025-10-14; sessions for Google and GitHub 2025-10-15; refresh before sign-out 2026-11-03; refreshes
taking turns across tabs 2026-11-04; the refresh token only in its cookie, and revoked at sign-out, 2026-11-06)

Recorded 2026-11-10 from sources of the time.

Implemented by: PR #3 (`927cda65`, 2025-10-21); refresh before sign-out in PR #78 (`c08b977c`, 2026-11-05); the
refresh token kept only in its cookie in PR #122 (`f6f76b52`, 2026-11-06), and revoked at sign-out in PR #123
(`073d3bae`, 2026-11-07); the access token read only from its header in PR #125 (`ec4d7708`, 2026-11-07).

## Context

The API first authenticated with an access token held in an HttpOnly cookie, protected by a CSRF check, and the
authentication rewrite planned the same for users who sign in with Google. Moving to allauth's headless mode
([ADR-034](adr-034-use-django-allauth-in-headless-mode.md)) showed the limit of that: with the token in an HttpOnly
cookie, the "frontend can't detect OAuth success". A day later, allauth's browser mode turned out to issue a session for
Google and GitHub sign-in, and its token delivery serves only its `app` client. The detection problem that prompted the
hybrid no longer applied to them, and the hybrid stayed for password users on the reasons below.

Alternatives weighed:

- **Tokens only in HttpOnly cookies**, as before.
- **A hybrid: a short-lived access token the frontend holds and sends in a header, with the refresh token in an
  HttpOnly cookie (chosen).**
- **Tokens for Google and GitHub users too:** "Not recommended". It "would require overriding django-allauth's
  callback views", and four attempts through middleware and adapters had failed.
- **Sessions for Google and GitHub users, beside the tokens (chosen).**

The reasons recorded for the hybrid: "Instant auth checks (no network call needed), 'session expiring' warnings";
the access token is "vulnerable to XSS (mitigated by short expiration: 5 min)", and the refresh token's "HTTP-only
cookie prevents long-term compromise"; and it is an "Industry standard pattern (Auth0, Firebase, AWS Amplify)". For
two patterns: it is "the most pragmatic approach", since forcing tokens on provider sign-in would mean overriding
allauth's callbacks, "going against its design and making upgrades difficult", and "django-allauth browser mode is
designed for session cookies, and they're more secure than localStorage tokens anyway."

In 2026, password users were signed out after five idle minutes. A longer access-token lifetime was weighed and not
taken: "a 5-minute access token limits what a stolen one can do, and the 14-day refresh token in its HTTP-only cookie
exists to renew it". The frontend refreshes before signing a user out instead.

## Decision

We will sign password users in with two tokens. A 5-minute access token, the only token in the response body, comes back
to the frontend; the frontend keeps it in local storage when the user asks to be remembered, and in session storage
otherwise, and sends it as a `Bearer` header. A 14-day refresh token is kept only in an HttpOnly, Secure, SameSite=Lax
cookie, rotated on each use, with the old one blacklisted; signing out blacklists the current one. When the access
token has expired, the frontend renews it, one tab at a time, before treating the user as signed out. Users who sign
in with Google or GitHub get no tokens: the API falls back to allauth's session cookie for them, and the frontend
reads their state from allauth's session endpoint.

## Consequences

### Positive

- The frontend knows a password user's state from storage, without a request, while the access token is current.
- A stolen access token works for at most five minutes, and the refresh token sits where script on the page
  cannot read it.
- allauth's provider flows run as the library designs them, with no override of its callbacks.

### Negative

- The API and the frontend handle two patterns, and each sign-in path has its own way to read state and sign out.
- Script running on the page can read the access token, so the design leans on its short lifetime.
- A visitor whose access token has expired waits for a renewal request before the app knows their state
  ([ADR-028](adr-028-use-three-state-sign-in-status.md)).

## References

- `.arc/reference/strategies/project/strategy-authentication.md`
- `.arc/reference/archive/2025-q4/incidental/09_oauth-headless-migration/` (tasks, notes and research)
- `.arc/reference/archive/2026-q4/technical/08_launch-readiness/prd-launch-readiness.md`: design decisions 23 and 24
- `backend/apps/authentication/auth_ninja.py` (`JWTSessionAuth`), `backend/apps/authentication/api.py`,
  `backend/config/settings.py` (`SIMPLE_JWT`)
- `frontend/src/hooks/auth/useAuth.ts`, `frontend/src/services/apiClient.ts`
- Commits `0f194222` (hybrid tokens), `b0affb37` (session fallback)
- Commit `9fd3b53b` (2025-10-14): the hybrid plan in the OAuth migration's task list, where the quoted reasons stand
- [ADR-028](adr-028-use-three-state-sign-in-status.md), [ADR-034](adr-034-use-django-allauth-in-headless-mode.md)
- PRs #3, #78, #122, #123 and #125
