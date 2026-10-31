# Authentication Strategy and Implementation Guide

**Version:** 1.0 | **Updated:** 2025-10-16 | **Status:** Active

**Version history (latest first):** 1.0 – Initial strategy (two-pattern hybrid authentication documented)

## Purpose

Authoritative guidance for authentication and authorization in CineXplorer. Documents the dual-pattern
authentication architecture (JWT for email/password, session cookies for OAuth), security model,
implementation patterns, and testing approach.

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
- ✅ Hybrid authentication (localStorage for instant checks + HTTP-only cookie for security)
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
       │    {username, password}                          │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                              2. Validate credentials
       │                              3. Generate JWT tokens
       │                                                  │
       │ 4. Response:                                     │
       │    {                                             │
       │      access_token: "...",  (5-min)               │
       │      refresh_token: "...", (14-day)              │
       │      user_id: 123                                │
       │    }                                             │
       │ 5. Set-Cookie: refresh_token (HttpOnly)          │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 6. Store access_token in sessionStorage          │
       │ 7. Store refresh_token in memory (duplicate)     │
       │ 8. Refresh token cookie auto-sent by browser     │
       │                                                  │
       │ 9. API Request:                                  │
       │    Authorization: Bearer {access_token}          │
       │    Cookie: refresh_token (auto-sent)             │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                              10. Validate access_token
       │                              11. If expired → refresh
       │                                                  │
       │ 12. 200 OK + Response Data                       │
       │<─────────────────────────────────────────────────┤
```

**Token Storage Strategy**:

| Token Type                 | Storage Location  | Lifetime  | Access                 | Purpose                                |
|----------------------------|-------------------|-----------|------------------------|----------------------------------------|
| **Access Token**           | sessionStorage    | 5 minutes | JavaScript can read    | API authorization, instant auth checks |
| **Refresh Token** (copy)   | sessionStorage    | 14 days   | JavaScript can read    | Reference only (duplicate of cookie)   |
| **Refresh Token** (actual) | HTTP-only cookie  | 14 days   | JavaScript CANNOT read | Automatic token refresh, XSS-proof     |
| **CSRF Token**             | Cookie (readable) | Session   | JavaScript can read    | CSRF protection for unsafe methods     |

**Why Hybrid Storage?**

1. **Access token in sessionStorage**: Frontend can instantly check authentication without network call
2. **Short lifetime (5 min)**: XSS attacks only steal 5-minute token, not 14-day refresh token
3. **Refresh token in HTTP-only cookie**: Long-lived token is XSS-proof, auto-sent with requests
4. **Session warnings possible**: Frontend can decode JWT expiration for UX

**Token Refresh Flow**:

```typescript
// Automatic refresh via axios interceptor (apiClient.ts)
// When 401 response received:
// 1. Check if access token exists (OAuth users don't have JWT tokens)
// 2. If JWT user, POST /api/auth/refresh (no body needed)
// 3. Backend validates refresh_token cookie
// 4. Returns new access_token in response body
// 5. Update access_token in sessionStorage
// 6. Retry original request with new token
```

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

Django-allauth headless mode has two distinct client types:

- **Browser mode** (`/_allauth/browser/v1/`) - Uses HTTP-only session cookies (what we use)
- **App mode** (`/_allauth/app/v1/`) - Uses `X-Session-Token` header (for mobile apps)

The browser mode intentionally uses session cookies for security. While django-allauth supports a
`HEADLESS_TOKEN_STRATEGY` setting, it's **only used for app mode**, not browser OAuth flows.

**Attempting to force JWT tokens for browser OAuth would require**:

- Overriding django-allauth's callback view completely
- Manually implementing OAuth token exchange
- Fighting against the framework's design
- Making security and maintenance harder

**Conclusion**: Accept session cookies for OAuth. They're more secure anyway (HTTP-only, no JavaScript access).

---

## Security Model

### CSRF Protection

**How it works**:

1. **Backend sets `csrftoken` cookie** (readable by JavaScript)
2. **Frontend reads cookie** for `POST/PUT/PATCH/DELETE` requests
3. **Frontend sends token in `X-CSRFToken` header**
4. **Backend validates** token matches cookie

**Implementation**:

```typescript
// frontend/src/services/apiClient.ts
// Request interceptor attaches CSRF token automatically
const unsafeMethods = ["post", "put", "patch", "delete"];
if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
  const csrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
  }
}
```

**OAuth CSRF Protection**:

- OAuth uses **OAuth 2.0 state parameter** (more secure than cookies)
- State is random, session-bound, validated on callback
- CSRF token is optional but included for defense-in-depth

### CORS Configuration

**Backend** (`backend/config/settings.py`):

```python
# CORS settings
CORS_ALLOW_CREDENTIALS = True  # REQUIRED for cookies
CORS_ALLOWED_ORIGINS = [
    "https://localhost:8444",  # Caddy proxy
    "http://localhost:5173",   # Vite dev server
]

# Session cookie settings
SESSION_COOKIE_HTTPONLY = True    # Prevents JavaScript access
SESSION_COOKIE_SAMESITE = "Lax"   # NOT "Strict" (breaks OAuth redirects)
SESSION_COOKIE_SECURE = True      # HTTPS only (production)

# CSRF settings
CSRF_COOKIE_HTTPONLY = False      # JavaScript needs to read for X-CSRFToken header
CSRF_TRUSTED_ORIGINS = [
    "https://localhost:8444",
    "http://localhost:5173",
]
```

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

- Access token in sessionStorage (vulnerable to XSS but short-lived: 5 minutes)
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

- All user-specific data queries filtered by `request.user`
- Django ORM enforces foreign key relationships
- Backend tests validate isolation (see Task 8.4 - cross-pattern user isolation test)

**API level**:

- Django Ninja authentication required on protected endpoints
- `auth=JWTAuth` or `auth=SessionAuth` decorators
- Automatic 401 response if unauthenticated

**Example**:

```python
@router.get("/", response=list[UserMovieDataModelSchema])
def get_user_movies(request: HttpRequest) -> list[UserMovieData]:
    # request.user is ALWAYS the authenticated user
    # Cannot access other users' data
    return UserMovieData.objects.filter(user=request.user)
```

---

## Implementation Details

### Backend: Django Ninja + django-allauth

**Authentication Classes** (`backend/apps/authentication/auth_ninja.py`):

```python
from ninja.security import HttpBearer, HttpBasicAuth
from django.contrib.auth.models import AbstractBaseUser
from django.http import HttpRequest

class JWTAuth(HttpBearer):
    """JWT authentication (email/password login)."""

    def authenticate(self, request: HttpRequest, token: str) -> AbstractBaseUser | None:
        # Validate JWT access token
        # Return user if valid, None if invalid
        ...

class SessionAuth:
    """Session authentication (OAuth login)."""

    def __call__(self, request: HttpRequest) -> AbstractBaseUser | None:
        # Check request.user.is_authenticated
        # Return user if authenticated, None otherwise
        ...
```

**Hybrid Authentication** (supports both patterns on same endpoint):

```python
from authentication.auth_ninja import JWTAuth, SessionAuth

# Priority: JWT first, then session
@router.get("/profile", auth=[JWTAuth(), SessionAuth()])
def get_profile(request: HttpRequest):
    # Works for both JWT and OAuth users
    return request.user
```

**Django-allauth Configuration** (`backend/config/settings.py`):

```python
# Headless mode (disables HTML views, keeps OAuth callbacks)
HEADLESS_ONLY = True

# Frontend URLs for redirects
HEADLESS_FRONTEND_URLS = {
    "account_confirm_email": f"{FRONTEND_URL}/auth/verify-email",
    "account_reset_password_from_key": f"{FRONTEND_URL}/auth/reset-password",
    "socialaccount_login_error": f"{FRONTEND_URL}/login?error=oauth",
}

# Session configuration
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"  # Lax allows OAuth redirects
SESSION_COOKIE_SECURE = True     # HTTPS only in production

# CORS configuration
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "https://localhost:8444",  # Production-like (Caddy)
    "http://localhost:5173",   # Development (Vite)
]
```

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

**Authentication Hook** (`frontend/src/hooks/useAuth.ts`):

```typescript
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Instant detection from sessionStorage (JWT pattern)
    const { access_token } = getAuthTokens();
    return access_token !== null && !areTokensExpired();
  });

  // On mount: Check for existing auth (JWT or session)
  useEffect(() => {
    const checkExistingAuth = async () => {
      // 1. Check JWT tokens (email/password pattern)
      const { access_token } = getAuthTokens();
      if (access_token && !areTokensExpired()) {
        setIsAuthenticated(true);
        return;
      }

      // 2. Check OAuth session cookie
      try {
        const response = await fetch(
          'https://localhost:8444/_allauth/browser/v1/auth/session',
          {
            method: 'GET',
            credentials: 'include',  // Send session cookie
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data?.meta?.is_authenticated && data?.data?.user) {
            setUser(data.data.user);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        // Silently fail - user is not authenticated
      }
    };

    checkExistingAuth();
  }, []);

  // OAuth callback handler
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if we just came from an OAuth redirect
      const isFromOAuthRedirect =
        document.referrer.includes('google.com') ||
        document.referrer.includes('github.com') ||
        sessionStorage.getItem('oauth_in_progress') === 'true';

      if (!isFromOAuthRedirect) return;

      // Check session endpoint to see if OAuth completed
      const response = await fetch(
        'https://localhost:8444/_allauth/browser/v1/auth/session',
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.meta?.is_authenticated && data?.data?.user) {
          setUser(data.data.user);
          setIsAuthenticated(true);
          navigate(ROUTES.HOME);
        }
      }
    };

    handleOAuthCallback();
  }, [location.pathname]);

  return { isAuthenticated, user, login, logout };
}
```

**API Client Configuration** (`frontend/src/services/apiClient.ts`):

```typescript
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,  // CRITICAL: Send cookies with every request
});

// Request interceptor: Attach JWT access token and CSRF token
apiClient.interceptors.request.use((config) => {
  // JWT pattern: Attach access token from sessionStorage
  const { access_token } = getAuthTokens();
  if (access_token) {
    config.headers.Authorization = `Bearer ${access_token}`;
  }

  // CSRF protection for unsafe methods
  const unsafeMethods = ["post", "put", "patch", "delete"];
  if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
  }

  return config;
});

// Response interceptor: Handle token refresh (JWT only)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 = authentication error
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if user has JWT tokens (email/password authentication)
      const { access_token } = getAuthTokens();

      // OAuth users won't have JWT tokens - let them handle 401 via session endpoint
      if (!access_token) {
        return Promise.reject(error);
      }

      // JWT user - attempt token refresh
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }  // Send refresh token cookie
        );

        if (response.status === 200 && response.data.access_token) {
          const newAccessToken = response.data.access_token;
          setAuthTokens(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        clearAuthTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## API Endpoints

### JWT Authentication Endpoints (Django Ninja)

| Endpoint              | Method | Auth Required | Purpose              | Request Body                                         | Response                                              |
|-----------------------|--------|---------------|----------------------|------------------------------------------------------|-------------------------------------------------------|
| `/api/token/`         | POST   | No            | Email/password login | `{username, password}`                               | `{access_token, refresh_token, user_id}` + Set-Cookie |
| `/api/auth/refresh`   | POST   | Yes (cookie)  | Refresh access token | (empty)                                              | `{access_token}`                                      |
| `/api/logout/`        | POST   | Yes (JWT)     | Logout JWT user      | (empty)                                              | `{message}` + Clear cookies                           |
| `/api/auth/register/` | POST   | No            | User registration    | `{username, email, password, first_name, last_name}` | `201 Created`                                         |
| `/api/auth/user/`     | GET    | Yes (JWT)     | Get user profile     | N/A                                                  | `{id, username, email, ...}`                          |

**Example: Login**:

```bash
curl -X POST https://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "password123"}' \
  -k

# Response:
# {
#   "access_token": "eyJ...",
#   "refresh_token": "eyJ...",
#   "user_id": 123
# }
# Set-Cookie: refresh_token=eyJ...; HttpOnly; Secure; SameSite=Lax
```

### OAuth Endpoints (django-allauth)

| Endpoint                                      | Method | Auth Required | Purpose                   | Request Body                                             | Response                                            |
|-----------------------------------------------|--------|---------------|---------------------------|----------------------------------------------------------|-----------------------------------------------------|
| `/_allauth/browser/v1/auth/provider/redirect` | POST   | No            | Initiate OAuth flow       | `{provider, callback_url, process, csrfmiddlewaretoken}` | 302 redirect to provider                            |
| `/_allauth/browser/v1/auth/session`           | GET    | Yes (cookie)  | Check authentication      | N/A                                                      | `{data: {user, methods}, meta: {is_authenticated}}` |
| `/_allauth/browser/v1/auth/session`           | DELETE | Yes (cookie)  | Logout OAuth user         | N/A                                                      | `200 OK` + Clear session cookie                     |
| `/accounts/{provider}/login/callback/`        | GET    | No            | OAuth callback (internal) | N/A                                                      | 302 redirect to callback_url                        |

**Example: Initiate Google OAuth**:

```javascript
// Frontend creates and submits form
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

All endpoints with `auth=[JWTAuth(), SessionAuth()]` support both authentication patterns:

| Endpoint                      | Auth Pattern   | How It Works                                                                    |
|-------------------------------|----------------|---------------------------------------------------------------------------------|
| `/api/user-movie-data/`       | JWT or Session | JWT: `Authorization: Bearer {token}` header<br>Session: `Cookie: sessionid=...` |
| `/api/user-movie-data/{id}`   | JWT or Session | Same as above                                                                   |
| `/api/user-movie-data/movies` | JWT or Session | Same as above                                                                   |

Django Ninja tries JWTAuth first, then SessionAuth if JWT fails. Whichever succeeds sets `request.user`.

---

## Frontend Integration

### OAuth Flow Implementation

**Login Component** (`frontend/src/pages/user/Login.tsx`):

```typescript
const initializeOAuthLogin = async (provider: string) => {
  try {
    console.log(`[OAuth] Initializing ${provider} OAuth login`);

    // Get CSRF token from cookie
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    // Create form and submit through Caddy proxy
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://localhost:8444/_allauth/browser/v1/auth/provider/redirect";
    form.target = "_self";  // Force full page reload

    const fields = {
      provider: provider,
      callback_url: "https://localhost:8444/login",
      process: "login",
      ...(csrfToken ? { csrfmiddlewaretoken: csrfToken } : {}),
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    // Track OAuth flow in sessionStorage (for callback detection)
    sessionStorage.setItem('oauth_in_progress', provider);
    sessionStorage.setItem('oauth_start_time', Date.now().toString());

    // Submit form (triggers browser redirect to OAuth provider)
    document.body.appendChild(form);
    form.submit();
  } catch (error) {
    console.error("OAuth initialization error:", error);
    setGeneralError("Failed to initiate OAuth login. Please try again.");
  }
};
```

**OAuth UX Enhancements**:

1. **Minimum Display Time** - Fast OAuth (<3s) shows spinner for 500ms minimum (prevents flash)
2. **Gated Navigation** - Don't navigate until both auth check completes AND minimum display time elapsed
3. **Synchronous State Initialization** - Initialize OAuth state from sessionStorage on component mount (prevents form flash)
4. **OAuth-Aware Loading Layout** - Shows provider-specific spinner during callback (prevents visual jump)

**Rationale**: Professional UX requires consistent visual feedback regardless of OAuth speed.
Fast OAuth feels broken without minimum display time.

### Token Utilities

**Token Storage** (`frontend/src/utilities/token.ts`):

```typescript
export function setAuthTokens(
  accessToken: string,
  refreshToken?: string,
  storage: TokenStorage = "sessionStorage"
): void {
  const storageObj = storage === "localStorage" ? localStorage : sessionStorage;

  storageObj.setItem("access_token", accessToken);
  storageObj.setItem("isAuthenticated", "true");

  if (refreshToken) {
    storageObj.setItem("refresh_token", refreshToken);
  }

  // Store token expiration for validation
  const decoded = jwtDecode<{ exp: number }>(accessToken);
  storageObj.setItem("token_expiration", decoded.exp.toString());
}

export function getAuthTokens(): {
  access_token: string | null;
  refresh_token: string | null;
  storage: TokenStorage | null;
} {
  // Priority: cookie → localStorage → sessionStorage
  // (cookie check for backward compatibility, not used in current implementation)

  // Check localStorage
  const localAccessToken = localStorage.getItem("access_token");
  if (localAccessToken) {
    return {
      access_token: localAccessToken,
      refresh_token: localStorage.getItem("refresh_token"),
      storage: "localStorage",
    };
  }

  // Check sessionStorage
  const sessionAccessToken = sessionStorage.getItem("access_token");
  if (sessionAccessToken) {
    return {
      access_token: sessionAccessToken,
      refresh_token: sessionStorage.getItem("refresh_token"),
      storage: "sessionStorage",
    };
  }

  return { access_token: null, refresh_token: null, storage: null };
}

export function clearAuthTokens(): void {
  // Clear from all storage locations
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("token_expiration");

  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
  sessionStorage.removeItem("isAuthenticated");
  sessionStorage.removeItem("token_expiration");
}

export function areTokensExpired(): boolean {
  const expirationStr = localStorage.getItem("token_expiration") ||
                        sessionStorage.getItem("token_expiration");

  if (!expirationStr) return true;

  const expiration = parseInt(expirationStr, 10);
  const now = Math.floor(Date.now() / 1000);

  return now >= expiration;
}
```

---

## Testing Strategy

### Backend Automated Tests

**Test Coverage**:

1. **Session Authentication Tests** (`backend/apps/authentication/tests/test_session_auth.py`):
   - JWT authentication still works after OAuth migration
   - JWT token refresh generates new tokens
   - Session authentication persists across requests
   - OAuth logout clears session cookie
   - JWT logout clears refresh_token cookie
   - Hybrid auth supports both patterns on same endpoint

2. **CSRF Protection Tests** (`backend/apps/authentication/tests/test_csrf_protection.py`):
   - CSRF token required for unsafe methods
   - Missing CSRF token returns 403
   - Invalid CSRF token returns 403
   - Safe methods (GET, HEAD, OPTIONS) don't require CSRF

3. **User Isolation Tests** (various):
   - UserMovieData filtered by authenticated user
   - Cannot access other users' data
   - Cross-pattern isolation (JWT user cannot see OAuth user's data)

**Test Helpers** (`backend/apps/core/tests/test_helpers.py`):

```python
def authenticate_client(client: Client, user: AbstractBaseUser) -> None:
    """
    Authenticate test client using hybrid auth pattern.

    Sets both access_token and refresh_token cookies to match
    production authentication behavior.

    Args:
        client: Django test client
        user: User to authenticate as
    """
    from authentication.models import CustomUser
    from ninja_jwt.tokens import RefreshToken

    assert isinstance(user, CustomUser)
    refresh = RefreshToken.for_user(user)

    # Set both tokens as cookies (matches hybrid auth pattern)
    client.cookies["access_token"] = str(refresh.access_token)
    client.cookies["refresh_token"] = str(refresh)
```

**Rationale for DRY Helper**: Hybrid auth pattern requires both cookies set. Centralizing this logic in a shared
helper ensures consistency across all test fixtures and reduces duplication.

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
- Multi-tab coordination
- Full error recovery scenarios
- Production certification

### Future Testing Improvements

**Documented in** `.arc/backlog/notes/notes-frontend-enhancements.md`:

- Toast notification system (user feedback for auth errors)
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
   - Development: `http://localhost:8000/accounts/google/login/callback/`
   - Production: `https://yourdomain.com/accounts/google/login/callback/`

**GitHub OAuth App**:

1. Navigate to Settings → Developer settings → OAuth Apps
2. Select your app
3. Authorization callback URL:
   - Development: `http://localhost:8000/accounts/github/login/callback/`
   - Production: `https://yourdomain.com/accounts/github/login/callback/`

**Testing OAuth Changes**:

1. Update provider configuration
2. Test OAuth flow in browser (click "Continue with Google/GitHub")
3. Verify callback succeeds (redirects to frontend, session established)
4. Check DevTools Network tab for redirect chain
5. Verify session endpoint returns authenticated user

### JWT Token Configuration

**Token Lifetimes** (`backend/apps/authentication/models.py`):

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
- [ ] Refresh token cookies are HTTP-only, Secure
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

4. **Add OAuth credentials** via Django admin:
   - Navigate to `/admin/socialaccount/socialapp/`
   - Add new Social Application
   - Provider: Select from dropdown
   - Client ID: From OAuth app settings
   - Secret key: From OAuth app settings
   - Sites: Select your site(s)

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
- `research-django-allauth-headless-oauth.md` - Comprehensive OAuth research (archived)
- `tasks-oauth-headless-migration.md` - Implementation history (archived)
- [django-allauth Headless Documentation](https://docs.allauth.org/en/latest/headless/) - Official docs
- [React SPA Example](https://codeberg.org/allauth/django-allauth/src/branch/main/examples/react-spa) - Official implementation

---

**Document Status**: This strategy document is the authoritative reference for all authentication-related
decisions, implementations, and troubleshooting in CineXplorer. Update this document when authentication
patterns change or new providers are added.
