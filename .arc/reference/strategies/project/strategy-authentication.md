# Authentication Strategy and Implementation Guide

**Version:** 1.0 | **Updated:** 2025-10-16 | **Status:** Active

**Version history (latest first):** 1.0 – Initial strategy (two-pattern hybrid authentication documented)

## Purpose

Authoritative guidance for authentication and authorization in CineXplorer. Documents the dual-pattern
authentication architecture (JWT for email/password, session cookies for OAuth), security model,
implementation patterns, and testing approach. The decision and the alternatives weighed are recorded in
[ADR-040](../../adr/adr-040-sign-in-with-a-header-token-and-a-refresh-cookie.md).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Patterns](#authentication-patterns)
3. [Security Model](#security-model)
4. [Implementation Details](#implementation-details)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Testing Strategy](#testing-strategy)
8. [Common Pitfalls](#common-pitfalls)
9. [Maintenance Guidelines](#maintenance-guidelines)

---

## Architecture Overview

### Design Principles

1. **Security-first approach** - HTTP-only cookies, CSRF protection, CORS properly configured
2. **Dual-pattern authentication** - JWT tokens for email/password, session cookies for OAuth
3. **Seamless user experience** - Both patterns work transparently for end users
4. **Industry-standard flows** - Follow OAuth 2.0 and JWT best practices
5. **Defense in depth** - Multiple layers of security validation

### Why Two Patterns?

**Email/Password (JWT Tokens)**:

- ✅ Custom Django Ninja endpoint (full control over response format)
- ✅ Hybrid authentication (browser storage for instant checks + HTTP-only cookie for security)
- ✅ Explicit token lifecycle management
- ✅ Suitable for programmatic access (future API clients)

**OAuth (Session Cookies)**:

- ✅ Django-allauth headless mode (battle-tested, maintained)
- ✅ HTTP-only session cookies (more secure than localStorage tokens)
- ✅ Simpler implementation (no client-side token management)
- ✅ Standard OAuth 2.0 flow (works across all providers)
- ⚠️ Backend controls authentication entirely (cannot customize token format without major hackery)

**Consistency Note**: While using two patterns may seem inconsistent, it's the most pragmatic approach.
Attempting to force JWT tokens for OAuth would require overriding django-allauth's callback views,
going against its design and making upgrades difficult.

---

## Authentication Patterns

### Pattern 1: Email/Password (JWT + Hybrid Storage)

**Flow Diagram**:

```
┌──────────────┐                                 ┌────────────────┐
│   Browser    │                                 │    Backend     │
│  (Frontend)  │                                 │    (Django)    │
└──────┬───────┘                                 └────────┬───────┘
       │                                                  │
       │ 1. POST /api/token/                              │
       │    {login, password}                             │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                              2. Validate credentials
       │                              3. Generate JWT tokens
       │                                                  │
       │ 4. Response:                                     │
       │    {                                             │
       │      access_token: "...",  (5-min)               │
       │      user_id: 123                                │
       │    }                                             │
       │ 5. Set-Cookie: refresh_token (HttpOnly)          │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 6. Store access_token (local/session storage)    │
       │ 7. Remove old refresh copies from browser storage │
       │ 8. Refresh token cookie auto-sent by browser     │
       │                                                  │
       │ 9. API Request:                                  │
       │    Authorization: Bearer {access_token}          │
       │    Cookie: refresh_token (auto-sent)             │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                              10. Validate access_token
       │                              11. If expired → 401;
       │                                  client refreshes, retries
       │                                                  │
       │ 12. 200 OK + Response Data                       │
       │<─────────────────────────────────────────────────┤
```

**Token Storage Strategy**:

| Token Type        | Storage Location  | Lifetime  | Access                 | Purpose                                |
|-------------------|-------------------|-----------|------------------------|----------------------------------------|
| **Access Token**  | Browser storage   | 5 minutes | JavaScript can read    | API authorization, instant auth checks |
| **Refresh Token** | HTTP-only cookie  | 14 days   | JavaScript CANNOT read | Automatic token refresh, XSS-proof     |
| **CSRF Token**    | Cookie (readable) | 52 weeks  | JavaScript can read    | CSRF protection for unsafe methods     |

The access token goes to local storage when the user asks to be remembered, and to session storage otherwise.
The same choice controls the refresh cookie: remembered sign-ins set a 14-day cookie, while other sign-ins omit
Max-Age and Expires so the cookie lasts for the browser session. A new sign-in defaults to not remembered when the
optional request field is omitted. The signed refresh token carries this choice, and each replacement token and
cookie preserve it through rotation. Tokens issued before this choice was recorded keep their persistent-cookie
behavior. The refresh token's own 14-day validity and the access token's 5-minute validity are unchanged.

**Why Hybrid Storage?**

1. **Access token in browser storage**: Frontend can instantly check authentication without a network call
2. **Short lifetime (5 min)**: XSS attacks only steal 5-minute token, not 14-day refresh token
3. **Refresh token in HTTP-only cookie**: Long-lived token is XSS-proof, auto-sent with requests
4. **Session warnings possible**: Frontend can decode JWT expiration for UX

**Token Refresh Flow**:

The session query renews an expired stored access token through `refreshAccessToken` before reading the profile.
`useAuth` also calls that shared renewal at its 60-second idle check. Password users remain signed in when renewal
succeeds; a current session's failure clears stored tokens and lands an anonymous session. Provider sessions have no
access token and never request a refresh. No timer renews a token ahead of its expiry. Before the first session read
lands, a current stored token and sign-in flag give an immediate authenticated status; otherwise the status is
resolving ([ADR-028](../../adr/adr-028-use-three-state-sign-in-status.md)). The idle effect renews a credential;
profile and provider-session data are read by the query.

The API client's request interceptor also waits for renewal when the stored access token is expired, before
attaching its Bearer header. This avoids an initial `401` when expiry can be determined locally. A request uses
at most one renewal; a later refusal does not renew again or clear the successfully
renewed session. Password sign-in, registration, email verification and resending, password-reset requests and
anonymous log reporting bypass both interceptor renewal paths. A previous session therefore cannot block account
recovery or registration, replace an authentication response, or make background reporting redirect to sign-in.
These calls retain their normal response handling and CSRF protection.

For personalized public movie reads, a supplied Bearer credential that cannot authenticate through JWT or the
provider session receives `401` with a Bearer `invalid_token` challenge. Authentication resolves once at endpoint
entry, before pagination state or movie fetching, and enrichment reuses that result. A refused request therefore
cannot consume unseen movies before a renewed retry. Requests without a Bearer credential can still browse
anonymously, and valid provider sessions still personalize responses. This server-side check is the
fallback when a device clock runs behind or an access token expires in transit; the client's expiry check avoids
that extra refused request when its clock agrees. Token lifetime and validation leeway are unchanged.

The session read, idle check and both API client interceptors call the same exported `refreshAccessToken()` function.
It returns
one pending promise per tab, so every caller receives the same token or failure. On browsers with Web Locks it holds
`cinexplorer-auth-refresh` across the storage reread, request, validation and storage update. A token another tab
stored while it waited is reused only when it is unexpired and expires strictly later than the starting token.
Otherwise the function sends `POST /api/auth/refresh` with credentials and CSRF, presenting the current rotated
refresh cookie. A valid response replaces the access token in the original browser storage; a session-storage
sign-in stays in session storage. Without Web Locks, the pending promise still coordinates callers in one tab.

Only this function posts a refresh. On current-session renewal failure, the interceptors redirect to sign-in
with `session_expired=true` and the safe current path, query and fragment in `next`, using `loginPathFor`.
Sign-in pages are excluded from the return path. The session read and idle check instead land anonymous and run
the change-of-user step described below. A failed retry
of the original API request does not invalidate a successful refresh.

A provider-return session read owns resolution from before allauth discovery through any password fallback. The idle
check starts no renewal while this identity is active. API requests continue using credentials and shared renewal;
they never wait for discovery, since fallback itself uses the API client. During owned resolution, renewal failure
rejects its API caller without clearing credentials or redirecting. Failure effects require the current auth version,
live stored password access credentials (expired tokens count), no resolution owner and an uncancelled originating
request. The idle handler also checks its original user-change count before and after awaiting query cancellation.
Anonymous fallback clears both stores before releasing ownership, so later subscribers to the same rejection cannot
redirect. Successful fallback retains normal subsequent password-failure handling.

Renewal failures retain their status, data and classification, attributed separately to each caller's original
request. They are terminal for that operation, preserving its consumed renewal budget and feedback policy; the refresh
transport's request cannot enter recovery again or supply a token payload as a successful profile/movie response.
Shared failures are never mutated to carry another caller's configuration. The session query's cancellation signal
reaches native provider fetches, profile requests and renewal continuations. Cancellation makes that caller inert
after ownership release without aborting shared renewal another caller still needs. Cleanup releases only the
identity it acquired; explicit authentication invalidation retires ownership as well as renewal work.

Explicit sign-out invalidates this tab's pending renewal before clearing credentials. Queued work checks the session
version before starting a request; sent work is canceled before the logout request, and completion checks precede
storage writes. The successful logout response deletes any refresh cookie applied before cancellation; later headers
from that canceled request cannot replace the deletion or a subsequent sign-in's cookie. This concerns renewal
controlled by the signing-out tab. Hook and interceptor continuations ignore cancellation or a changed session version
rather than restoring authentication or clearing a later sign-in. API requests retain their originating session
version through preparation and retries, so a late `401` cannot renew or clear a newer sign-in. A successful new
password sign-in retires prior work and clears both storages before storing its chosen credentials. Accepting a
provider session also invalidates prior work before clearing password tokens, so older interceptor renewal failures
cannot redirect it. An older promise's finalizer cannot release a newer session's shared promise.

---

### Pattern 2: OAuth (Session Cookies Only)

**Flow Diagram**:

```
┌──────────────┐                ┌─────────────┐                ┌────────────────┐
│   Browser    │                │   Google/   │                │    Backend     │
│  (Frontend)  │                │   GitHub    │                │    (Django)    │
└──────┬───────┘                └──────┬──────┘                └────────┬───────┘
       │                               │                                │
       │ 1. POST /_allauth/browser/v1/auth/provider/redirect            │
       │    {provider: "google", callback_url: "/login", ...}           │
       ├───────────────────────────────────────────────────────────────>│
       │                               │                                │
       │                               │           2. Create Django session
       │                               │           3. Generate OAuth state
       │                               │           4. Store callback_url
       │                               │                                │
       │ 5. 302 Redirect to Google OAuth                                │
       │    (with state parameter)                                      │
       │<───────────────────────────────────────────────────────────────┤
       │                               │                                │
       │ 6. Redirect to Google                                          │
       ├──────────────────────────────>│                                │
       │                               │                                │
       │                               │ 7. User authenticates          │
       │                               │                                │
       │ 8. 302 Redirect to backend callback                            │
       │    /accounts/google/login/callback/?code=XXX&state=YYY         │
       │<──────────────────────────────┤                                │
       │                               │                                │
       │ 9. Follow redirect to backend                                  │
       ├───────────────────────────────────────────────────────────────>│
       │                               │                                │
       │                               │           10. Validate state
       │                               │           11. Exchange code for tokens
       │                               │           12. Create/update user
       │                               │           13. Set session cookie
       │                               │           14. Update is_authenticated
       │                               │                                │
       │ 15. 302 Redirect to callback_url (/login)                      │
       │     Set-Cookie: sessionid (HttpOnly)                           │
       │<───────────────────────────────────────────────────────────────┤
       │                               │                                │
       │ 16. Check authentication via session endpoint                  │
       │     GET /_allauth/browser/v1/auth/session                      │
       │     Cookie: sessionid (auto-sent)                              │
       ├───────────────────────────────────────────────────────────────>│
       │                               │                                │
       │                               │           17. Validate session cookie
       │                               │           18. Return user data
       │                               │                                │
       │ 19. {data: {user: {...}}, meta: {is_authenticated: true}}      │
       │<───────────────────────────────────────────────────────────────┤
       │                               │                                │
       │ 20. Navigate to /home                                          │
```

**Key Differences from JWT Pattern**:

1. **No JWT tokens** - Authentication is purely session cookie-based
2. **No URL parameters** - Tokens are NOT delivered via URL after OAuth (common misconception)
3. **Session endpoint** - Must check `/_allauth/browser/v1/auth/session` to verify authentication
4. **Automatic cookie handling** - Browser sends `sessionid` cookie with every request
5. **Backend-managed** - Django controls session lifecycle entirely

**Why No JWT Tokens for OAuth?**

The site exposes only four exact browser paths under `/_allauth/browser/v1/`:
`auth/session` (`GET`, `DELETE`), `auth/password/request` (`POST`), `auth/password/reset` (`POST`), and
`auth/provider/redirect` (`POST`). The middleware answers `404` for other paths or methods, including all
`/_allauth/app/` requests and allauth's own sign-up and password sign-in. Those two operations use the project's
endpoints and their throttles. Provider callbacks remain under `/accounts/`.

Browser OAuth uses HTTP-only session cookies. The app client's session-token mechanism is unreachable.

GitHub email intake keeps only addresses marked both primary and verified by GitHub, before account matching or
storage. The public profile email is normalized to that address, or null when none qualifies; provider trust
settings cannot promote an unverified GitHub address. Other providers retain allauth's verification behavior.
Existing email rows are not removed, and connecting GitHub does not replace the account's existing email.

**Attempting to force JWT tokens for browser OAuth would require**:

- Overriding django-allauth's callback view completely
- Manually implementing OAuth token exchange
- Fighting against the framework's design
- Making security and maintenance harder

**Conclusion**: Accept session cookies for OAuth. They're more secure anyway (HTTP-only, no JavaScript access).

---

## Security Model

### CSRF Protection

`CsrfProtectionMiddleware` subclasses Django's `CsrfViewMiddleware` and checks unsafe requests independently of
authentication, including public sign-in, registration, refresh, password reset and session-only writes. Ninja's
view exemption does not bypass these checks. Safe methods retain Django's behavior.

- Django validates the `csrftoken` cookie against `X-CSRFToken`, or the `csrfmiddlewaretoken` form field. Masked
  tokens are accepted; a response token need not be identical to the cookie secret.
- Origin and HTTPS Referer checks use Django's host and `CSRF_TRUSTED_ORIGINS` rules.
- A refusal is always `403 {"detail": "CSRF token missing or invalid."}`, including in debug mode.
- Only `POST /api/logs/` (anonymous reporting), `POST /api/dev-logs/write/` (development console capture), and
  `/__debug__/` (the development toolbar's SQL panel) are exempt.
- Responses for which `get_token` runs set the cookie, including allauth's session check. `GET /api/csrf/` also
  explicitly sets it. Django test clients skip checks unless constructed with `enforce_csrf_checks=True`.

The frontend initializes a missing cookie before sending an unsafe request:

```typescript
await ensureCsrfTokenCookie(apiBaseUrl);
const csrfToken = getCsrfToken(); // Reads csrftoken
await apiClient.post("/logout/", {}, {
  headers: { "X-CSRFToken": csrfToken || "" },
});
```

The API client's request interceptor covers all four unsafe methods. Its bare refresh POST, password-reset
completion, OAuth session DELETE and OAuth start form also initialize and send the token. Safe requests do not
initialize a cookie. The OAuth start form submits synchronously when the cookie exists and waits for initialization
when it is absent. Its `csrfmiddlewaretoken` is required; the provider callback separately validates OAuth's random,
session-bound `state` parameter.

### CORS Configuration

Configure `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in the backend environment as comma-separated lists.
The [backend settings module](../../../../backend/config/settings.py) reads both lists from the environment, with
local-origin defaults only when `ENVIRONMENT` is `development`; both default to empty lists otherwise. Set the
deployed frontend origins explicitly for staging and production.

`CORS_ALLOW_CREDENTIALS` is enabled. Session cookies are HTTP-only and use `SameSite=Lax` for OAuth redirects.
`SESSION_COOKIE_SECURE` and `CSRF_COOKIE_SECURE` are enabled in production and staging, while development allows
HTTP. `CSRF_COOKIE_HTTPONLY` is disabled so JavaScript can read the token for the `X-CSRFToken` header.
Use `settings.py` as the source of truth for the defaults and environment conditions.

**Frontend** - All requests must include `credentials: 'include'`:

```typescript
// CRITICAL: Send cookies with every request
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,  // Sends cookies
});
```

### XSS Protection

**JWT Pattern**:

- Access token in browser storage (vulnerable to XSS but short-lived: 5 minutes)
- Refresh token in HTTP-only cookie (XSS-proof, 14-day lifetime)
- **Trade-off**: Convenience (instant auth checks) vs absolute security

**OAuth Pattern**:

- Session cookie is HTTP-only (XSS-proof, no JavaScript access)
- **Better XSS protection** than JWT pattern

**General XSS Mitigation**:

1. Content Security Policy (CSP) headers
2. Input sanitization on backend
3. React automatically escapes JSX
4. No `dangerouslySetInnerHTML` without sanitization

### User Isolation

**Database level**:

- All user-specific data queries filtered by the user `get_current_user(request)` returns, which the route hands to
  the service layer
- Django ORM enforces foreign key relationships
- Backend tests validate isolation from another user's data; the cross-pattern case is a manual check
  ([Manual E2E Validation](#manual-e2e-validation), item 4)

**API level**:

- Django Ninja authentication required on protected endpoints
- `JWTSessionAuth` is the API-wide default (`NinjaAPI(auth=jwt_session_auth)` in `backend/config/api.py`); public
  operations opt out with `auth=None`
- Automatic 401 response if unauthenticated

**Example**:

```python
@user_movie_data_router.get("/movies", response=MovieListResponseSchema)
def get_user_movies(request: HttpRequest, query: Query[LibraryQuerySchema]) -> MovieListResponseSchema:
    # The Bearer token's user or the session's user; request.user comes
    # only from the session, never from the token
    user = get_current_user(request)
    return _service.get_library(user, query)
```

---

## Implementation Details

### Backend: Django Ninja + django-allauth

**Authentication Class** (`backend/apps/authentication/auth_ninja.py`):

```python
from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest
from ninja.security.http import HttpAuthBase

class JWTSessionAuth(HttpAuthBase):
    """Authenticate a Bearer access token, falling back to the Django session."""

    openapi_scheme = "bearer"

    def __call__(self, request: HttpRequest) -> AbstractUser | None:
        # Unlike HttpBearer, the session path also runs without an Authorization header.
        return self.authenticate(request)

    def authenticate(self, request: HttpRequest) -> AbstractUser | None:
        # 1. A valid access token in the Authorization header (password users)
        # 2. Otherwise an authenticated request.user from the session (Google and GitHub users)
        ...

jwt_session_auth = JWTSessionAuth()
```

The access token is read only from the `Authorization` header. A missing or invalid token falls through to the
session; with neither, the operation answers `401`.

**Hybrid Authentication** (one class serves both patterns):

```python
from apps.authentication.auth_ninja import JWTSessionAuth, get_current_user

user_movie_data_router = Router(tags=["user-movie-data"], auth=JWTSessionAuth())

@user_movie_data_router.get("/movies")
def get_user_movies(request: HttpRequest):
    user = get_current_user(request)  # Works for both JWT and OAuth users
    ...
```

`get_current_user` and `get_current_user_optional` run the same check, raising `401` or returning `None` when
neither credential is present.

**Django-allauth Configuration** (`backend/config/settings.py`):

```python
# Headless mode (disables HTML views, keeps OAuth callbacks)
HEADLESS_ONLY = True

# Frontend URLs for redirects
HEADLESS_FRONTEND_URLS = {
    # Email confirmation links come from CustomAccountAdapter.get_email_confirmation_url()
    "account_reset_password_from_key": f"{FRONTEND_URL}/login?reset={{key}}",
    "account_signup": f"{FRONTEND_URL}/auth/signup",
    "socialaccount_login_error": f"{FRONTEND_URL}/login?error=oauth",
}
```

Session-cookie security and origin configuration follow the [CORS configuration](#cors-configuration) above.

**URL Configuration** (`backend/config/urls.py`):

```python
urlpatterns = [
    # Django Ninja API (JWT endpoints)
    path("api/", api.urls),

    # Django-allauth headless API (OAuth initiation)
    path("_allauth/", include("allauth.headless.urls")),

    # Django-allauth traditional URLs (OAuth callbacks)
    # REQUIRED even with HEADLESS_ONLY=True
    path("accounts/", include("allauth.urls")),
]
```

**Critical**: Both `_allauth/` and `accounts/` URLs must be present. With `HEADLESS_ONLY = True`, the traditional
URLs only register OAuth callback views (login/signup HTML views are disabled).

### Frontend: React + Axios

**Authentication Hook** (`frontend/src/hooks/auth/useAuth.ts`):

The provider-return read owns session resolution through discovery and password fallback, independently of rendered
status. Idle renewal pauses while it is owned. Query cancellation reaches provider and profile work; late results
cannot change credentials or user ownership, and old cleanup cannot release a replacement read. Explicit sign-in/out
supersede that ownership through authentication invalidation. Background failure authority follows the live
credential/version/cancellation rule in Token Refresh Flow above.

`useAuth` reads the shared `['session']` query built by `lib/queries.ts`. It holds a profile or `null`, never goes
stale, does not retry, and does not refetch on mount, focus or reconnect. Its first read receives the initial route's
provider-return context. On a provider return it asks allauth first and invalidates prior authentication work before
clearing stored password tokens if it finds the provider's user. Otherwise it renews an expired stored token and
reads the password profile, or asks allauth when no token exists. A failed password read clears stored tokens and
returns `null`; it does not fall through to provider discovery. Cancellation or an obsolete authentication-session
version cannot land or clear credentials.

The status derives from the query: a profile is `authenticated`, `null` is `anonymous`. While its data is still
undefined, it is `authenticated` only with a current stored token and sign-in flag, and `resolving` otherwise.
`isAuthenticated` and the hook's public commands retain their shapes for context consumers. The OAuth callback
effect reacts to this first result, clears provider-flow flags and handles feedback and navigation; it fetches
nothing. Only the 60-second credential-renewal effect makes a network request.

Session writers cancel any in-flight session read before replacing it:

- Password sign-in invalidates prior renewal, clears both storages and stores the token in local storage for
  remember-me or session storage otherwise. It immediately retires old saves, then reads the session afresh and
  resolves after that result lands. Other queries reset after the read, including when it rejects the new token.
- Sign-out invalidates renewal, clears tokens, writes `null`, runs the change-of-user step and navigates to Login
  immediately. It sends the password logout request or allauth's CSRF-protected session DELETE, then loads
  `/login?signed_out=true` afresh after success or failure. This drops data fetched with a provider cookie while
  the request was pending. A newer password sign-in's token survives that reload. Login shows the signed-out notice
  only after the fresh session reads `anonymous`, then clears the parameter.
- Failed idle renewal writes `null` and runs the change-of-user step only while its original authentication version
  and user ownership remain current, checked before and after canceling the session read. An older renewal cannot
  clear a provider session that landed while it was pending.

The change-of-user step advances this tab's save ownership count, detaches and aborts the old save-generation
controller, clears its mutation cache, removes its visible and queued save toasts and resets every query except the
session. This refetches visible lists while late saves can
neither show feedback nor invalidate Library. Each save carries its original ownership count from invocation, before
mutation setup can yield; the request's global error toast checks it too. Password sign-in splits that step as above;
the initial session read also runs it when a provider return lands a user, or when it clears rejected stored
credentials. An initial profile landing for a user already shown as signed in, and an anonymous landing without a
stored token, leave the caches intact. Unrelated feedback, including the global server-error toast, remains visible.

`getSaveSignal` synchronously checks a save's invocation count and lazily supplies one `AbortSignal` per current
ownership generation. Ordinary saves and Undo pass it through the service request configuration before Axios
preparation starts. A user change aborts old preparation, renewal continuations and in-flight save transport; the
signal remains effective during the browser adapter's asynchronous XSRF-cookie read before sending. The shared
renewal has its own controller. Canceling the save caller therefore does not cancel another current caller's renewal;
authentication invalidation retains its separate effects. Cancellation cannot undo a write already received by the
server, so settlement and feedback still compare the original count. Unmounting a control and finishing one save
do not abort the generation. The server-error feedback predicate remains separate from request cancellation.

Password sign-out blacklists a valid refresh token before expiring its HttpOnly cookie, so a copy cannot renew
credentials afterward. Missing, expired, malformed or already revoked refresh cookies still receive a successful
sign-out and cookie deletion. The endpoint requires CSRF protection, but no authenticated session. A blacklist write
failure follows the API's standard server-error response rather than reporting successful sign-out.

**API Client Configuration** (`frontend/src/services/apiClient.ts`):

The client sends credentials for both authentication patterns and attaches an access token when one is stored.
Its request interceptor initializes CSRF only for unsafe methods:

```typescript
apiClient.interceptors.request.use(async (config) => {
  const { access_token } = getAuthTokens();
  if (access_token) config.headers.Authorization = `Bearer ${access_token}`;

  if (config.method && ["post", "put", "patch", "delete"].includes(config.method.toLowerCase())) {
    await ensureCsrfTokenCookie(apiBaseUrl);
    config.headers["X-CSRFToken"] = getCsrfToken() || "";
  }
  return config;
});
```

The response interceptor handles `401` for password users through the same pending refresh as the hook, provided
the request has not used its renewal and does not bypass renewal. It preserves the originating authentication
version and passes the original request to `refreshRequestToken`. Its refresh branch is:

```typescript
const sessionVersion = originalRequest._authSessionVersion ?? getAuthSessionVersion();
assertAuthSessionVersion(sessionVersion, originalRequest.signal);
originalRequest._retry = true;
const renewedToken = await refreshRequestToken(sessionVersion, originalRequest);
originalRequest.headers.Authorization = `Bearer ${renewedToken}`;
return apiClient(originalRequest);
```

`refreshRequestToken` checks the originating version and cancellation before and after awaiting renewal. Failure is
terminal for that operation. An Axios failure gets a per-caller error clone carrying the original request
configuration and feedback policy.
Credential clearing and an expired-session redirect require `canHandlePasswordFailure`: current version, present
password credentials, no resolution owner and an uncancelled originating request. The retry above runs only after
renewal succeeds, outside failure handling.

`refreshAccessToken` owns the shared transport, CSRF initialization and token storage. It accepts only a `200`
response with a nonempty string `access_token`. Failure releases the shared pending promise so a later operation
can attempt renewal. OAuth users hold no access token, so their `401` responses never enter this branch.

---

## API Endpoints

### JWT Authentication Endpoints (Django Ninja)

| Endpoint            | Method | Auth Required        | Purpose              | Request Body                                         | Response                                                                     |
|---------------------|--------|----------------------|----------------------|------------------------------------------------------|------------------------------------------------------------------------------|
| `/api/token/`       | POST   | No                   | Email/password login | `{login, password}`                                  | `{access_token, user_id, username, first_name, email_verified}` + Set-Cookie |
| `/api/auth/refresh` | POST   | Yes (cookie)         | Refresh access token | (empty)                                              | `{access_token, expires_in, issued_at}` + Set-Cookie                         |
| `/api/logout/`      | POST   | No                   | Logout JWT user      | (empty)                                              | `{message}` + Clear cookies                                                  |
| `/api/register/`    | POST   | No                   | User registration    | `{username, email, password, first_name, last_name}` | `201 Created`                                                                |
| `/api/profile/`     | GET    | Yes (JWT or session) | Get user profile     | N/A                                                  | `{id, username, email, ...}`                                                 |

**Example: Login**:

```bash
curl -k -c cookies.txt https://localhost:8444/api/csrf/
# Use the returned csrf_token value with the cookie jar.
curl -k -b cookies.txt -c cookies.txt -X POST https://localhost:8444/api/token/ \
  -H "Content-Type: application/json" \
  -H "Origin: https://localhost:8444" \
  -H "X-CSRFToken: <csrf_token>" \
  -d '{"login": "user@example.com", "password": "password123"}'

# Response:
# {
#   "access_token": "eyJ...",
#   "user_id": 123
# }
# Set-Cookie: refresh_token=eyJ...; HttpOnly; Secure; SameSite=Lax
```

### OAuth Endpoints (django-allauth)

The four browser paths listed below are the complete allowlist; every other headless path or method answers `404`.
Unsafe methods require CSRF even before sign-in. Provider callbacks are outside the headless prefix.

| Endpoint                                      | Method | Auth Required | Purpose                   | Request Body                                             | Response                                            |
|-----------------------------------------------|--------|---------------|---------------------------|----------------------------------------------------------|-----------------------------------------------------|
| `/_allauth/browser/v1/auth/provider/redirect` | POST   | No            | Initiate OAuth flow       | `{provider, callback_url, process, csrfmiddlewaretoken}` | 302 redirect to provider                            |
| `/_allauth/browser/v1/auth/session`           | GET    | Yes (cookie)  | Check authentication      | N/A                                                      | `{data: {user, methods}, meta: {is_authenticated}}` |
| `/_allauth/browser/v1/auth/session`           | DELETE | Yes (cookie)  | Logout OAuth user         | N/A                                                      | `200 OK` + Clear session cookie                     |
| `/_allauth/browser/v1/auth/password/request`  | POST   | No            | Request password reset    | `{email}`                                                | `200 OK`                                            |
| `/_allauth/browser/v1/auth/password/reset`    | POST   | No            | Complete password reset   | `{key, password}`                                        | `200` or `401` on success                           |
| `/accounts/{provider}/login/callback/`        | GET    | No            | OAuth callback (internal) | N/A                                                      | 302 redirect to callback_url                        |

**Example: Initiate Google OAuth**:

```javascript
// Initialize the required token before constructing the OAuth form.
if (!getCsrfToken()) await ensureCsrfTokenCookie(apiBaseUrl);
const csrfToken = getCsrfToken();
const form = document.createElement("form");
form.method = "POST";
form.action = "https://localhost:8444/_allauth/browser/v1/auth/provider/redirect";

const fields = {
  provider: "google",
  callback_url: "https://localhost:8444/login",  // Where to send user after OAuth
  process: "login",
  csrfmiddlewaretoken: csrfToken
};

Object.entries(fields).forEach(([key, value]) => {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = key;
  input.value = value;
  form.appendChild(input);
});

document.body.appendChild(form);
form.submit();  // Browser redirects to Google OAuth
```

**Example: Check OAuth Session**:

```bash
curl -X GET https://localhost:8444/_allauth/browser/v1/auth/session \
  -H "Cookie: sessionid=..." \
  --cookie-jar cookies.txt

# Response:
# {
#   "status": 200,
#   "data": {
#     "user": {
#       "id": 123,
#       "username": "john",
#       "email": "john@example.com",
#       ...
#     },
#     "methods": [
#       {"method": "socialaccount", "at": 1234567890, ...}
#     ]
#   },
#   "meta": {
#     "is_authenticated": true,
#     "session_token": null  # Only for app mode
#   }
# }
```

### Protected Endpoints (Both Patterns Supported)

All endpoints authenticated by `JWTSessionAuth` support both authentication patterns:

| Endpoint                                                | Auth Pattern   | How It Works                                                                    |
| ------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `GET /api/profile/`                                     | JWT or Session | JWT: `Authorization: Bearer {token}` header<br>Session: `Cookie: sessionid=...` |
| `GET /api/user-movie-data/movies`                       | JWT or Session | Same as above                                                                   |
| `GET`, `PATCH`, `DELETE /api/user-movie-data/{tmdb_id}` | JWT or Session | Same as above                                                                   |

`JWTSessionAuth` checks the Bearer header first, then the session. Handlers read the user from
`get_current_user(request)`, since `request.user` comes only from the session, never from the token.

---

## Frontend Integration

### OAuth Flow Implementation

**OAuth hook** (`frontend/src/hooks/auth/useOAuthFlow.ts`):

`initializeOAuth` ensures the CSRF cookie, builds the provider form with `csrfmiddlewaretoken`, records the provider
and start time in session storage, and submits the form through the site's origin. The browser follows the provider
redirect. Errors are reported to the caller's error callback; a throwing callback rejects the completion promise.

```typescript
const { initializeOAuth } = useOAuthFlow(setGeneralError);
<Button onClick={() => { void initializeOAuth("google"); }}>Google</Button>
```

**OAuth UX Enhancements**:

1. **Minimum Display Time** - Fast OAuth (<3s) shows spinner for 500ms minimum (prevents flash)
2. **Gated Navigation** - Don't navigate until both auth check completes AND minimum display time elapsed
3. **Synchronous State Initialization** - Initialize OAuth state from sessionStorage on component mount (prevents form flash)
4. **OAuth-Aware Loading Layout** - Shows provider-specific spinner during callback (prevents visual jump)

**Rationale**: Professional UX requires consistent visual feedback regardless of OAuth speed.
Fast OAuth feels broken without minimum display time.

### Token Utilities

**Token Storage** (`frontend/src/utilities/tokenUtils.ts`):

`setAuthTokens(accessToken, storage)` stores only the access token, authentication flag and expiration in the chosen
browser storage. Password sign-in uses local storage when “Remember me” is selected and session storage otherwise;
renewal preserves that choice. The default is local storage.

`getAuthTokens()` returns `{ access_token, storage }`, checking local storage, then session storage. Both the getter
and setter remove obsolete `refresh_token` keys from local and session storage, including
when no access token exists. The getter runs during authentication initialization, so existing browser copies are
removed on load without signing the user out. Refresh credentials are issued and rotated only in an HttpOnly cookie;
JavaScript neither reads nor stores them.

`clearAuthTokens()` clears the access credentials and obsolete refresh copies from both storage locations.
`areTokensExpired()` checks the stored access-token expiration.

---

## Testing Strategy

### Backend Automated Tests

**Test Coverage**:

1. **Session Authentication Tests** (`backend/apps/authentication/tests/integration/test_session_auth.py`):
   - JWT authentication still works after OAuth migration
   - JWT token refresh generates new tokens
   - Session authentication persists across requests
   - OAuth logout clears session cookie
   - JWT logout clears the refresh cookie
   - Hybrid auth supports both patterns on same endpoint

2. **CSRF Protection Tests** (`backend/apps/authentication/tests/integration/test_csrf_protection.py`):
   - CSRF token required for unsafe methods
   - Missing CSRF token returns 403
   - Invalid CSRF token returns 403
   - Safe methods (GET, HEAD, OPTIONS) don't require CSRF

3. **User Isolation Tests** (various):
   - UserMovieData filtered by authenticated user
   - Cannot access other users' data

   The cross-pattern case (a password user cannot see a Google or GitHub user's data) is a manual check.

4. **Sign-Out Tests** (`backend/apps/authentication/tests/integration/test_logout.py`):
   - A signed-out refresh token cannot renew (it is blacklisted)
   - Sign-out reports failure when revocation cannot be stored
   - The cookie is cleared when no usable refresh token remains

5. **Access Token Transport Tests**
   (`backend/apps/authentication/tests/integration/test_access_token_transport.py`):
   - An access cookie does not authenticate; the Bearer header does
   - The removed refresh route issues and rotates nothing
   - A provider session authenticates without a valid Bearer token

**Test Helpers** (`backend/apps/core/tests/test_helpers.py`):

`authenticate_client(client, username, password)` signs in through `/api/token/`, retains the HttpOnly refresh cookie,
and sends the returned access token in the client's default Authorization Bearer header. Shared fixtures use this
helper so test authentication follows the browser's transport.

### Manual E2E Validation

**Critical Path Testing** (Task 8 - Manual E2E Validation):

1. **JWT Pattern**:
   - Login → Add to watchlist → Verify icon changes
   - Toggle watchlist (add/remove) → Verify state updates
   - Refresh page → Verify state persists
   - Logout → Verify tokens cleared

2. **OAuth Google Flow**:
   - Click "Continue with Google" → Complete OAuth → Verify callback success
   - Check DevTools: NO JWT tokens, only sessionid cookie
   - Add/remove from watchlist → Verify CRUD works
   - Refresh page → Verify session persists
   - Close browser → Reopen → Verify session still valid
   - Logout → Verify session cleared

3. **OAuth GitHub Flow**:
   - Click "Continue with GitHub" → Complete OAuth → Verify callback success
   - Basic watchlist test → Verify works
   - Logout → Verify session cleared

4. **Cross-Pattern User Isolation** (CRITICAL SECURITY TEST):
   - OAuth user → Add movie X to watchlist
   - Logout → Login as JWT user
   - Navigate to same movie → Verify icon is OUTLINE (not filled)
   - JWT user → Add movie X to watchlist
   - Logout → Login as OAuth user again
   - Navigate to movie X → Verify icon is FILLED (state preserved)
   - **CRITICAL**: No cross-contamination between users

5. **Critical Error Paths**:
   - OAuth abortion (browser back button) → Verify returns to login cleanly
   - Delete session cookie → Attempt API call → Verify 401 handled gracefully
   - Verify error handling code exists (try/catch blocks in place)

**Deferred to API Layer P2**:

- Comprehensive edge case testing
- Full error recovery scenarios
- Production certification

### Future Testing Improvements

- Error logging/monitoring integration
- Multi-tab session synchronization

---

## Common Pitfalls

### Pitfall 1: Expecting Tokens in URL After OAuth

**Symptom**: URL after OAuth is `/login` with no query parameters

**Cause**: Browser mode doesn't deliver tokens via URL (only app mode does)

**Solution**: Call session endpoint to check authentication:

```typescript
const response = await fetch(
  'https://localhost:8444/_allauth/browser/v1/auth/session',
  { method: 'GET', credentials: 'include' }
);

const data = await response.json();
if (data?.meta?.is_authenticated) {
  // User is authenticated via session cookie
}
```

### Pitfall 2: Missing `credentials: 'include'`

**Symptom**: Session endpoint returns `authenticated: false` even after successful OAuth

**Cause**: Session cookie not sent with request

**Solution**: Add `credentials: 'include'` (or `withCredentials: true` for axios) to ALL fetch/axios calls

### Pitfall 3: ALLOWED_HOSTS Missing Port

**Symptom**: OAuth callback fails with `error=unknown`

**Cause**: `callback_url` host validation fails (e.g., `localhost:5173` not in ALLOWED_HOSTS)

**Solution**: Include port number in ALLOWED_HOSTS:

```python
ALLOWED_HOSTS = [
    "localhost",
    "localhost:5173",  # MUST include port
    "localhost:8444",
]
```

### Pitfall 4: SESSION_COOKIE_SAMESITE = "Strict"

**Symptom**: Session lost during OAuth redirect

**Cause**: `Strict` prevents cookies on cross-origin redirects

**Solution**: Use `"Lax"` instead:

```python
SESSION_COOKIE_SAMESITE = "Lax"  # NOT "Strict"
```

### Pitfall 5: Mixing Browser and App Mode Patterns

**Symptom**: Implementing Token Strategy expecting it to work for browser OAuth

**Cause**: Token Strategy only used for app mode, not browser mode

**Solution**: Accept that browser OAuth uses session cookies. Don't try to force JWT tokens.

### Pitfall 6: OAuth Provider Callback Misconfiguration

**Symptom**: 404 on OAuth callback (`/accounts/google/login/callback/`)

**Cause**: OAuth provider configured with wrong redirect URI

**Solution**: Verify OAuth app settings:

- Google: `https://yourdomain.com/accounts/google/login/callback/`
- GitHub: `https://yourdomain.com/accounts/github/login/callback/`

**Critical**: OAuth providers MUST redirect to backend URLs, not frontend URLs.

### Pitfall 7: Removing `path("accounts/", ...)` from urls.py

**Symptom**: OAuth callback fails, `NoReverseMatch` errors

**Cause**: Missing traditional URLs for OAuth callbacks

**Solution**: Keep both URL patterns:

```python
urlpatterns = [
    path("_allauth/", include("allauth.headless.urls")),  # Headless API
    path("accounts/", include("allauth.urls")),           # OAuth callbacks (REQUIRED)
]
```

With `HEADLESS_ONLY = True`, traditional URLs only register OAuth callbacks (login/signup HTML views are disabled).

---

## Maintenance Guidelines

### OAuth Provider Configuration

**Google Cloud Console**:

1. Navigate to APIs & Services → Credentials
2. Select OAuth 2.0 Client ID
3. Authorized redirect URIs:
   - Development: `https://localhost:8444/accounts/google/login/callback/`
   - Production: `https://yourdomain.com/accounts/google/login/callback/`

**GitHub OAuth App**:

1. Navigate to Settings → Developer settings → OAuth Apps
2. Select your app
3. Authorization callback URL:
   - Development: `https://localhost:8444/accounts/github/login/callback/`
   - Production: `https://yourdomain.com/accounts/github/login/callback/`

**Testing OAuth Changes**:

1. Update provider configuration
2. Test OAuth flow in browser (click "Continue with Google/GitHub")
3. Verify callback succeeds (redirects to frontend, session established)
4. Check DevTools Network tab for redirect chain
5. Verify session endpoint returns authenticated user

### JWT Token Configuration

**Token Lifetimes** (`backend/config/settings.py`):

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),   # Short-lived
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),    # Long-lived
    "ROTATE_REFRESH_TOKENS": True,                   # Rotate on refresh
    "BLACKLIST_AFTER_ROTATION": True,                # Invalidate old tokens
}
```

**Adjusting Lifetimes**:

- **Access token**: Balance security (shorter = better) vs UX (longer = fewer refreshes)
- **Refresh token**: 14 days is standard for "Remember Me" functionality
- **Production**: Consider shorter lifetimes for high-security applications

### Security Audit Checklist

Run before production deployment:

- [ ] All endpoints with user data require authentication
- [ ] CSRF protection enabled and tested
- [ ] CORS configured with explicit origins (no wildcards)
- [ ] Session cookies are HTTP-only, Secure, SameSite=Lax
- [ ] Refresh token cookies are HTTP-only, Secure, SameSite=Lax
- [ ] OAuth providers configured with correct callback URLs
- [ ] ALLOWED_HOSTS includes only trusted domains
- [ ] CSRF_TRUSTED_ORIGINS includes only trusted domains
- [ ] Access token lifetime is reasonably short (≤15 minutes)
- [ ] User isolation tests passing (cross-pattern isolation verified)
- [ ] XSS protection in place (CSP headers, input sanitization)

### Adding New OAuth Providers

1. **Register OAuth app** with provider (Google, GitHub, Facebook, etc.)
2. **Configure callback URL**: `https://yourdomain.com/accounts/{provider}/login/callback/`
3. **Add provider to django-allauth**:

   ```python
   INSTALLED_APPS = [
       ...
       'allauth.socialaccount.providers.google',
       'allauth.socialaccount.providers.github',
       'allauth.socialaccount.providers.facebook',  # New provider
   ]
   ```

4. **Configure the app for its environment**:
   - Development uses Django admin's `/admin/socialaccount/socialapp/`: add a Social Application with the
     provider, client ID, secret and development Site. The four Google/GitHub environment variables are ignored.
   - Staging and production read `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and
     `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` from the backend env file into
     `SOCIALACCOUNT_PROVIDERS[provider]["APP"]`. Set both variables for a provider or neither; a partial pair
     stops startup and names the missing variable. An unconfigured provider cannot sign in.
   - A new provider also needs its complete credential-pair handling in settings. Keep allauth's default scopes
     unless the application needs more.
   - Use separate apps for deployed hosts. Never add a database Social Application for a provider that also has
     a settings app: allauth's lookup rejects the duplicate.

5. **Add UI button** in `Login.tsx`:

   ```typescript
   <Button onClick={() => initializeOAuthLogin("facebook")}>
     <FaFacebook /> Facebook
   </Button>
   ```

6. **Test flow** end-to-end (initiate → callback → session check → authenticated)

---

## Related Documentation

- [DEVELOPMENT-RULES](../../constitution/DEVELOPMENT-RULES.md) - Development standards and quality gates
- [TECHNICAL-OVERVIEW](../../constitution/TECHNICAL-OVERVIEW.md) - System architecture overview
- [ADR-040](../../adr/adr-040-sign-in-with-a-header-token-and-a-refresh-cookie.md) - Header token, refresh cookie
  and provider sessions
- `research-django-allauth-headless-oauth.md` - Comprehensive OAuth research (archived)
- `tasks-oauth-headless-migration.md` - Implementation history (archived)
- [django-allauth Headless Documentation](https://docs.allauth.org/en/latest/headless/) - Official docs
- [React SPA Example](https://codeberg.org/allauth/django-allauth/src/branch/main/examples/react-spa) - Official implementation

---

**Document Status**: This strategy document is the authoritative reference for all authentication-related
decisions, implementations, and troubleshooting in CineXplorer. Update this document when authentication
patterns change or new providers are added.
