# ADR-035: Check CSRF on Every Unsafe Request Through Django's Middleware

## Status

Accepted (Owner, 2026-11-03)

Recorded 2026-11-06 from sources of the time.

Implemented by: PR #78 (`c08b977c`, 2026-11-05).

## Context

CineXplorer had checked CSRF in its own middleware since 2025. `CsrfHeaderMiddleware` was added on 2025-08-19 beside
Django's `CsrfViewMiddleware`, on the reasoning that "CSRF protection is not needed for login, registration, token
obtain, token refresh, or logout in a JWT-based API". On 2025-10-10 it replaced Django's middleware. Django Ninja's own
check on cookie authentication rejected valid tokens (its issue #1464); turning that check off on both the API and its
authentication "disables ALL CSRF protection", since Django's middleware skips Django Ninja's views; and the custom
middleware, with path-based exemptions, was the option that passed the CSRF tests.

By 2026-11-03 that design checked almost nothing. It exempted the public authentication paths and everything under
`/_allauth/`, and it checked other unsafe requests only when they carried an `access_token` cookie, which only one
legacy refresh endpoint set. The frontend read its token from a cookie named `XSRF-TOKEN`, which nothing set.
"In effect no request is token-checked": not the refresh endpoints, not requests authenticated by the session alone
(how users signed in with Google or GitHub reach the API), not allauth's browser endpoints, and not sign-in, where a
cross-site form could force a sign-in. The staging deployment had named these gaps before the site went public.

Alternatives weighed:

- **Close the listed gaps in the path list:** keep the custom middleware and add the missing paths.
- **Check every unsafe request by subclassing Django's middleware, with three exemptions (chosen).**

The reasons recorded for the choice: "The path list needed an entry for every new endpoint, and its trigger, an
`access_token` cookie, missed every cookie-authenticated request that exists. Subclassing Django's middleware keeps
Django's token comparison, Origin check and cookie handling and the test client's opt-in, and covers allauth's
browser views, which expect Django's middleware, and Django Ninja's views, which Django's middleware would skip."
Requests authenticated by an `Authorization` header are checked too, although a cross-site page cannot forge them:
"the frontend sends the token on every unsafe request, and one rule is easier to keep right than two."

## Decision

We will check CSRF on every unsafe request with `CsrfProtectionMiddleware`, a subclass of Django's
`CsrfViewMiddleware`. It keeps Django's token comparison and its Origin and Referer checks, and it hides the view
from Django's exemption lookup, so Django Ninja's view-level exemption cannot bypass it. Django Ninja's own check
stays off, so Django's middleware owns the validation. Three paths are exempt: `POST /api/logs/`, which is
anonymous, rate-limited and "changes nothing a forged request could exploit", since a first-time visitor's error
reports must not depend on a cookie; and `POST /api/dev-logs/write/` and `/__debug__/`, which exist only in
development. The frontend reads Django's `csrftoken` cookie, fetching it first when it is missing, and sends it as
`X-CSRFToken` on every unsafe request.

## Consequences

### Positive

- One rule covers every unsafe request, whichever way it is authenticated, including allauth's browser endpoints and
  the session-only requests of users signed in with Google or GitHub.
- The check is Django's own, maintained upstream and exercised by its test client.
- A new endpoint is protected by default; only an exemption needs a decision.

### Negative

- Django's deployment check looks for its own class path rather than a subclass, so its CSRF warning
  (`security.W003`) is silenced in settings.
- Every unsafe call the frontend makes must carry the token, including calls made outside the API client, such as
  the refresh call and the OAuth sign-out.
- Safe methods are not checked, so no `GET` may change state.

## References

- `.arc/reference/archive/2026-q4/technical/08_launch-readiness/prd-launch-readiness.md`: § 1, R20, R21 and design
  decision 14
- `.arc/reference/archive/2026-q4/technical/06_staging-deploy/prd-staging-deploy.md`: R8
- `.arc/reference/archive/2025-q4/incidental/08_security-updates/notes-security-updates.md`
- Commit `1e5c3aeb` (2025-08-19), the first CSRF middleware and its docstring
- `backend/apps/authentication/middleware.py` (`CsrfProtectionMiddleware`), `backend/apps/authentication/auth_ninja.py`,
  `backend/config/settings.py` (`MIDDLEWARE`, `SILENCED_SYSTEM_CHECKS`)
- `backend/apps/authentication/tests/integration/test_csrf_protection.py`
- `frontend/src/utilities/csrfTokenFetcher.ts`, `frontend/src/services/apiClient.ts`
- `.arc/reference/strategies/project/strategy-authentication.md` § CSRF Protection
- [ADR-029](adr-029-replace-drf-with-django-ninja.md)
- PRs #3, #78
