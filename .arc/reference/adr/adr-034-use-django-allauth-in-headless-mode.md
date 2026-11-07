# ADR-034: Use django-allauth in Headless Mode

## Status

Accepted (Owner, 2025-09-30; headless mode 2025-10-14; endpoint allowlist 2026-11-03)

Recorded 2026-11-06 from sources of the time.

Implemented by: PR #2 (`24803c0c`, 2025-10-02), the move to allauth; PR #3 (`927cda65`, 2025-10-21), headless mode;
PR #78 (`c08b977c`, 2026-11-05), the endpoint allowlist.

## Context

CineXplorer's sign-up, verification and password handling were its own code, on a custom user model, with no sign-in
through other providers. The authentication rewrite of September 2025 set out to replace them with django-allauth,
"eliminating the django-stubs mypy --strict bug while significantly enhancing the portfolio value through
professional social authentication", which "reduces demo friction for potential employers".

allauth's traditional views then broke the React frontend's provider sign-in: "traditional POST-based OAuth with
django-allauth fails due to CSRF Referer header requirements", and running its views beside the headless API
("mixed mode") caused problems of its own. The investigation "identified django-allauth headless mode as solution".

Alternatives weighed:

- **Keep the custom authentication**, extended for provider sign-in.
- **allauth with its traditional views, or mixed with its headless API.**
- **allauth in headless mode only, with the React app driving its flows (chosen).**

In 2026, before sign-up opened on the public host, the question was how to close the allauth endpoints the site
doesn't use. Closing allauth's own sign-up in the account adapter would also have closed sign-up through Google and
GitHub, since "allauth's social adapter asks the account adapter whether sign-up is open", and would have left its
password sign-in and its `app` client open. A filter in Caddy "would leave the development stack different from what
is deployed and the backend reachable on the Compose network". An allowlist was chosen: "anything allauth adds in a
later version stays closed until the site uses it."

The first reason given for the move has since lapsed:
[ADR-023](adr-023-adopt-custom-user-model-before-launch.md) restored a custom user model, and the backend type-checks
with Pyright rather than mypy.

## Decision

We will use django-allauth for provider sign-in with Google and GitHub, password reset and the browser session, in
headless mode only (`HEADLESS_ONLY = True`), so the React app drives each flow through allauth's browser API and
allauth renders no pages of its own. Email verification is mandatory. Registration, password sign-in and email
verification stay the project's own endpoints. Under `/_allauth/`, only the four browser endpoints the frontend
calls answer: the session, the password reset request, the password reset itself and the provider redirect.
Everything else there returns 404.

## Consequences

### Positive

- Google and GitHub sign-in, verification and password reset come from a maintained library rather than project
  code.
- The frontend owns every page a visitor sees, including sign-in and its errors.
- An endpoint a later allauth version adds stays closed until the site uses it.

### Negative

- Users who sign in with Google or GitHub hold allauth's session rather than the API's tokens, so the API
  authenticates two ways.
- The allowlist must be extended by hand when the frontend starts calling another allauth endpoint.
- allauth's headless API and its settings are a surface the frontend depends on; an allauth upgrade can change
  them.

## References

- `.arc/reference/archive/2025-q4/technical/03_authentication-modernization/prd-authentication-modernization.md`
- `.arc/reference/archive/2025-q4/incidental/09_oauth-headless-migration/` (tasks, notes and research)
- `.arc/reference/archive/2026-q4/technical/08_launch-readiness/prd-launch-readiness.md`: R24 and design decision 20
- `backend/config/settings.py` (allauth and `HEADLESS_*`), `backend/config/urls.py`,
  `backend/apps/authentication/middleware.py` (`AllauthEndpointMiddleware`)
- `.arc/reference/strategies/project/strategy-authentication.md`
- [ADR-023](adr-023-adopt-custom-user-model-before-launch.md)
- PRs #2, #3, #78
