# Django-allauth Headless Mode OAuth Research Report

**Research Date**: 2025-10-15
**Context**: OAuth Headless Mode Migration (Task 6.9.2)
**Research Method**: External research agent analysis
**Purpose**: Determine correct OAuth implementation pattern for django-allauth headless mode with hybrid authentication

---

## Executive Summary

**Your OAuth providers (Google/GitHub) should redirect to Django's traditional callback URLs** (e.g., `/accounts/google/login/callback/`), **NOT** to headless API endpoints or frontend URLs. With `HEADLESS_ONLY = True`, django-allauth still registers provider callback views at `/accounts/<provider>/login/callback/` to complete the OAuth handshake. After the OAuth flow completes on the backend, your Token Strategy is invoked to generate JWT tokens, and django-allauth redirects to the frontend URL specified in the `callback_url` parameter from the initial redirect request.

**The critical misunderstanding:** The `callback_url` parameter in the redirect endpoint tells django-allauth where to send the **user** after authentication completes—it does NOT change where the OAuth provider redirects (which must always be the Django backend callback URL).

---

## 1. OAuth Callback Configuration

### WHERE OAUTH PROVIDERS SHOULD REDIRECT

**Google/GitHub OAuth App Configuration:**

```
Authorized Redirect URI: https://yourdomain.com/accounts/google/login/callback/
                         https://yourdomain.com/accounts/github/login/callback/
```

**Critical Points:**
1. **Always use traditional callback URLs** (`/accounts/<provider>/login/callback/`)
2. **With `HEADLESS_ONLY = True`**, these callback views are still registered (they are NOT skipped)
3. **The OAuth provider redirects to the backend**, not the frontend
4. **NEVER configure OAuth providers to redirect to**:
   - `/_allauth/browser/v1/auth/provider/callback` (this doesn't exist)
   - Frontend URLs like `/login` (OAuth provider needs backend endpoint)
   - Headless API endpoints (they don't handle OAuth callbacks)

### HOW callback_url PARAMETER WORKS

**From the official React SPA example:**

```javascript
export function redirectToProvider(providerId, callbackURL, process = AuthProcess.LOGIN) {
  postForm(URLs.REDIRECT_TO_PROVIDER, {
    provider: providerId,
    process,
    callback_url: window.location.protocol + '//' + window.location.host + callbackURL,
    csrfmiddlewaretoken: getCSRFToken()
  })
}
```

**What `callback_url` does:**
- **Stores the frontend URL** where the user should be redirected **after** OAuth completes
- **Saved in Django session state** during the OAuth handshake
- **Used by django-allauth** to redirect the user back to your SPA after authentication
- **Does NOT change** where the OAuth provider redirects (that's always the backend)

**Example:**

```javascript
// Frontend initiates OAuth with:
callback_url: "http://localhost:5173/login"

// Flow:
// 1. Frontend POSTs to /_allauth/browser/v1/auth/provider/redirect
// 2. Django redirects browser to Google OAuth
// 3. Google redirects back to http://yourdomain.com/accounts/google/login/callback/
// 4. Django completes OAuth, invokes Token Strategy, sets cookies
// 5. Django redirects user to callback_url (http://localhost:5173/login)
```

### REQUIRED URL CONFIGURATION

**urls.py:**

```python
urlpatterns = [
    # Headless API endpoints (for frontend to initiate OAuth)
    path("_allauth/", include("allauth.headless.urls")),

    # Traditional URLs (REQUIRED for OAuth provider callbacks)
    # With HEADLESS_ONLY = True, login/signup views are disabled,
    # but provider callback views remain accessible
    path("accounts/", include("allauth.urls")),
]
```

**settings.py:**

```python
HEADLESS_ONLY = True  # Disables HTML views, keeps OAuth callbacks
HEADLESS_FRONTEND_URLS = {
    "socialaccount_login_error": f"{FRONTEND_URL}/login?error=oauth",  # Error fallback
}
```

---

## 2. Complete OAuth Flow (Headless Mode + Hybrid Auth)

### STEP-BY-STEP FLOW

**Step 1: Frontend Initiates OAuth**

```javascript
// Frontend POSTs form to headless redirect endpoint
POST /_allauth/browser/v1/auth/provider/redirect
Body: {
  provider: "google",
  callback_url: "http://localhost:5173/login",  // Where to send user after OAuth
  process: "login",
  csrfmiddlewaretoken: "..."
}
```

**Step 2: Django Creates Session & Redirects to Provider**
- Django creates a session with state information
- Session stores `callback_url` for later use
- Django returns HTTP 302 redirect to Google OAuth URL
- Browser follows redirect to Google

**Step 3: User Authenticates with Google**
- User logs into Google
- Google validates credentials
- Google redirects browser back to Django's callback URL

**Step 4: Google Redirects to Backend Callback**

```
GET /accounts/google/login/callback/?code=...&state=...
```

- OAuth provider ALWAYS redirects here (configured in OAuth app settings)
- Django's OAuth callback view handles this request
- Django validates OAuth `state` parameter against session

**Step 5: Django Completes OAuth & Invokes Token Strategy**
- Django exchanges authorization code for OAuth tokens from Google
- Django creates or updates user account
- Django authenticates the user (`request.user` is now authenticated)
- **Token Strategy is invoked:**

  ```python
  # Your JWTTokenStrategy.create_access_token_payload() is called
  # Returns: { "access_token": "...", "expires_in": 300, "issued_at": "..." }
  ```

**Step 6: Django Sets Response with Tokens**
- **Access token**: Included in response body (or redirect URL parameters)
- **Refresh token**: Set as HTTP-only cookie automatically by django-allauth
- Django retrieves `callback_url` from session state
- Django redirects user to `callback_url` (frontend URL)

**Step 7: Browser Lands on Frontend with Tokens**

```
GET http://localhost:5173/login?access_token=...&expires_in=300&issued_at=...
```

- Frontend extracts access token from URL parameters (or cookies)
- Frontend stores access token in localStorage
- Frontend has refresh token in HTTP-only cookie (automatic)
- User is authenticated

**Step 8: Frontend Uses Tokens**

```javascript
// Access token from localStorage
const accessToken = localStorage.getItem('access_token');

// API requests include access token
fetch('/api/movies', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  credentials: 'include'  // Include refresh token cookie
});
```

---

## 3. Official Pattern vs. What We Tried

| Aspect | What We Tried | Official Pattern | Why Ours Failed |
|--------|---------------|------------------|------------------|
| **OAuth Provider Redirect URI** | Tried various approaches, unclear configuration | `/accounts/google/login/callback/` (traditional URL) | OAuth providers need actual backend endpoint, not headless API |
| **URLs in urls.py** | Removed `path("accounts/", include("allauth.urls"))` | **Keep both**: headless URLs AND traditional URLs | With `HEADLESS_ONLY=True`, provider callbacks are still needed |
| **callback_url Parameter** | Expected it to control OAuth provider redirect | Controls where **user** is redirected after OAuth completes | Misunderstood purpose - OAuth provider always redirects to backend |
| **Token Strategy Invocation** | Tried adapters/middleware to set tokens | Token Strategy invoked automatically after OAuth completes | Token Strategy only works when OAuth flow completes properly at callback URL |
| **Token Delivery** | Expected tokens in cookie OR response | **Access token in response/URL params** + **refresh token in cookie** | Token delivery happens via redirect to frontend with tokens as query params |
| **Adapter Customization** | `CustomSocialAccountAdapter.save_user()` | Not needed - Token Strategy is the official extension point | Adapters are for user data, Token Strategy is for tokens |
| **Middleware Approach** | Custom middleware to intercept OAuth responses | Not needed - Token Strategy handles token generation | Middleware can't intercept before Token Strategy runs |

### KEY INSIGHT: Mixed Mode is Actually Required

Our concern about "mixed mode problems" was understandable but incorrect:
- **You MUST have both** `path("accounts/", ...)` and `path("_allauth/", ...)`
- With `HEADLESS_ONLY = True`, the traditional URLs **only register OAuth callbacks**
- Login/signup HTML views are disabled, but OAuth callbacks remain functional
- This is the **official pattern** for headless OAuth

---

## 4. Recommended Implementation

### STEP 1: Fix OAuth Provider Configuration

**Google Cloud Console:**

```
Authorized redirect URIs:
  https://yourdomain.com/accounts/google/login/callback/
  http://localhost:8000/accounts/google/login/callback/  (for dev)
```

**GitHub OAuth App:**

```
Authorization callback URL:
  https://yourdomain.com/accounts/github/login/callback/
  http://localhost:8000/accounts/github/login/callback/  (for dev)
```

### STEP 2: Ensure urls.py Has Both URL Patterns

**Current config is CORRECT:**

```python
urlpatterns = [
    path("_allauth/", include("allauth.headless.urls")),  # ✅ Headless API
    path("accounts/", include("allauth.urls")),           # ✅ OAuth callbacks
    # ...
]
```

**DO NOT REMOVE** `path("accounts/", include("allauth.urls"))` - this is required!

### STEP 3: Verify settings.py Configuration

**Current config is mostly correct:**

```python
HEADLESS_ONLY = True  # ✅ Correct
HEADLESS_FRONTEND_URLS = {
    "account_confirm_email": f"{FRONTEND_URL}/auth/verify-email",
    "account_reset_password_from_key": f"{FRONTEND_URL}/auth/reset-password",
    "account_signup": f"{FRONTEND_URL}/auth/signup",
    "socialaccount_login_error": f"{FRONTEND_URL}/login?error=oauth",  # ✅ Error fallback
}
HEADLESS_TOKEN_STRATEGY = "authentication.token_strategy.JWTTokenStrategy"  # ✅ Correct
```

**Add to ALLOWED_HOSTS for OAuth callback validation:**

```python
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "localhost:8000",      # ADD THIS - allauth validates callback_url host
    "localhost:5173",      # ADD THIS - frontend URL in callback_url
    "backend",
    "testserver",
]
```

### STEP 4: Fix Frontend OAuth Initiation

**Current Login.tsx approach is CORRECT:**

```javascript
// ✅ This is the right pattern
const form = document.createElement("form");
form.method = "POST";
form.action = "/_allauth/browser/v1/auth/provider/redirect";

const fields = {
  provider: "google",
  callback_url: `${window.location.origin}/login`,  // Frontend URL
  process: "login",
  csrfmiddlewaretoken: csrfToken
};
```

### STEP 5: Update Frontend Token Extraction

**The KEY MISSING PIECE** - Frontend needs to extract tokens from URL parameters:

```javascript
// In useAuth.ts - OAuth callback handler
useEffect(() => {
  const handleOAuthCallback = async () => {
    // Check for tokens in URL parameters (primary for OAuth)
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const issuedAt = params.get('issued_at');

    if (accessToken) {
      console.log('OAuth callback detected - access token in URL parameters');

      // Store access token in localStorage
      localStorage.setItem('access_token', accessToken);
      if (expiresIn) localStorage.setItem('token_expires_in', expiresIn);
      if (issuedAt) localStorage.setItem('token_issued_at', issuedAt);

      // Refresh token is already in HTTP-only cookie (set by django-allauth)

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Set authenticated state
      setIsAuthenticated(true);

      // Navigate to home
      navigate(ROUTES.HOME);
      return;
    }

    // Fallback: Check for tokens in cookie/localStorage (for existing sessions)
    const { access_token, storage } = getAuthTokens();
    if (access_token && !isAuthenticated) {
      console.log(`Existing session detected, access token found in ${storage}`);
      setIsAuthenticated(true);
      navigate(ROUTES.HOME);
      return;
    }

    // OAuth error handling
    const error = params.get('error');
    if (error) {
      console.error("OAuth authentication failed:", error);
      navigate(ROUTES.LOGIN, {
        state: {
          oauthError: true,
          message: "OAuth authentication failed. Please try again."
        }
      });
    }
  };

  handleOAuthCallback();
}, [location, isAuthenticated, navigate]);
```

### STEP 6: Remove Custom Middleware

**Remove OAuthCookieMiddleware** - it's not needed with Token Strategy:

```python
# settings.py
MIDDLEWARE = [
    # ...
    "allauth.account.middleware.AccountMiddleware",
    # "apps.authentication.oauth_cookie_middleware.OAuthCookieMiddleware",  # ❌ REMOVE THIS
]

# Also remove SOCIALACCOUNT_ADAPTER override if it only exists for OAuth tokens
# SOCIALACCOUNT_ADAPTER = "authentication.adapters.CustomSocialAccountAdapter"  # ❌ REMOVE if only for tokens
```

**Delete files:**
- `backend/apps/authentication/oauth_cookie_middleware.py` (entire file)
- Remove `CustomSocialAccountAdapter` from `adapters.py` (if only for OAuth tokens)

The Token Strategy handles token generation automatically.

### STEP 7: Test the Complete Flow

**Test checklist:**
1. ✅ Frontend POSTs to `/_allauth/browser/v1/auth/provider/redirect`
2. ✅ Backend redirects to Google OAuth
3. ✅ Google redirects to `/accounts/google/login/callback/` (not 404)
4. ✅ Backend completes OAuth, calls Token Strategy
5. ✅ Backend redirects to `callback_url` with access token in URL params
6. ✅ Frontend extracts access token from URL, stores in localStorage
7. ✅ Refresh token present in HTTP-only cookie (check DevTools)

---

## 5. Common Pitfalls & Solutions

### PITFALL 1: "NoReverseMatch: Reverse for 'google_callback' not found"

**Cause:** Missing `path("accounts/", include("allauth.urls"))` in urls.py
**Solution:** Keep both headless URLs and traditional URLs (even with `HEADLESS_ONLY=True`)

### PITFALL 2: OAuth callback returns "error=unknown"

**Cause:** Session state lost between redirect and callback (common with cross-domain)
**Solution:** Ensure `callback_url` host is in `ALLOWED_HOSTS` and CORS/CSRF properly configured

### PITFALL 3: Token Strategy not invoked during OAuth

**Cause:** OAuth callback not completing successfully (404, validation error, etc.)
**Solution:** Fix callback URL configuration first, then Token Strategy will work

### PITFALL 4: Tokens not appearing in frontend

**Cause:** Expecting tokens in response body instead of redirect URL parameters
**Solution:** Extract tokens from URL query parameters after OAuth redirect

### PITFALL 5: "CSRF verification failed" during OAuth

**Cause:** `callback_url` domain not in `CSRF_TRUSTED_ORIGINS`
**Solution:** Add frontend URL to both `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`

---

## 6. CineXplorer-Specific Changes Needed

### ✅ Already Correct in Our Implementation

1. ✅ `HEADLESS_ONLY = True` in settings.py
2. ✅ `HEADLESS_TOKEN_STRATEGY = "authentication.token_strategy.JWTTokenStrategy"` configured
3. ✅ Both URL patterns included in urls.py (`_allauth/` and `accounts/`)
4. ✅ Frontend OAuth initiation with `callback_url` parameter (Login.tsx)
5. ✅ JWT Token Strategy implementation (token_strategy.py)

### ⚠️ Needs Fixing

#### Backend Changes

1. **Verify/Update OAuth Provider Configuration:**
   - Google Cloud Console: Set redirect URI to `http://localhost:8000/accounts/google/login/callback/`
   - GitHub OAuth App: Set redirect URI to `http://localhost:8000/accounts/github/login/callback/`

2. **Update ALLOWED_HOSTS in settings.py:**

   ```python
   ALLOWED_HOSTS = [
       "localhost",
       "127.0.0.1",
       "localhost:8000",      # Add for callback_url validation
       "localhost:5173",      # Add for frontend callback_url
       "backend",
       "testserver",
   ]
   ```

3. **Remove Custom OAuth Middleware:**
   - Remove `OAuthCookieMiddleware` from MIDDLEWARE list
   - Delete `backend/apps/authentication/oauth_cookie_middleware.py`
   - Remove `CustomSocialAccountAdapter` from `adapters.py` (if only for OAuth tokens)
   - Remove `SOCIALACCOUNT_ADAPTER` setting (if only for OAuth tokens)

4. **Discard uncommitted changes:**

   ```bash
   git checkout backend/apps/authentication/adapters.py
   git checkout backend/config/settings.py
   git checkout backend/config/urls.py
   rm backend/apps/authentication/oauth_cookie_middleware.py
   ```

#### Frontend Changes

5. **Update useAuth.ts OAuth callback handler:**
   - Add URL parameter extraction for `access_token`, `expires_in`, `issued_at`
   - Store tokens in localStorage when found in URL params
   - Clean up URL after extracting tokens
   - Keep existing cookie/localStorage fallback for non-OAuth sessions

6. **Verify token utility functions support URL parameter flow:**
   - `setAuthTokens()` should accept just access token (refresh token already in cookie)
   - `getAuthTokens()` priority unchanged: cookie → localStorage → sessionStorage

### 📋 Testing Checklist

- [ ] Google OAuth app configured with correct callback URL
- [ ] GitHub OAuth app configured with correct callback URL
- [ ] Backend: `/accounts/google/login/callback/` accessible (not 404)
- [ ] Backend: `/accounts/github/login/callback/` accessible (not 404)
- [ ] OAuth flow redirects to Google correctly
- [ ] OAuth callback completes without errors
- [ ] Token Strategy invoked (check backend logs)
- [ ] Frontend receives redirect with tokens in URL
- [ ] Access token extracted and stored in localStorage
- [ ] Refresh token present in HTTP-only cookie
- [ ] User authenticated and redirected to home page
- [ ] API requests work with access token in Authorization header

---

## 7. Sources & References

### Official Documentation

1. **django-allauth Headless Mode:** <https://docs.allauth.org/en/dev/headless/>
2. **django-allauth Token Strategy:** <https://docs.allauth.org/en/dev/headless/tokens.html>
3. **django-allauth Configuration:** <https://docs.allauth.org/en/dev/headless/configuration.html>
4. **django-allauth Providers:** <https://docs.allauth.org/en/dev/socialaccount/providers/>

### Official Examples

5. **React SPA Example (Complete working implementation):** <https://github.com/pennersr/django-allauth/tree/main/examples/react-spa>
6. **React SPA settings.py:** <https://github.com/pennersr/django-allauth/blob/main/examples/react-spa/backend/backend/settings.py>
7. **React SPA allauth.js:** <https://github.com/pennersr/django-allauth/blob/main/examples/react-spa/frontend/src/lib/allauth.js>
8. **React SPA urls.py:** <https://github.com/pennersr/django-allauth/blob/main/examples/react-spa/backend/backend/urls.py>

### Community Resources

9. **Django Allauth + React Tutorial:** <https://joshkaramuth.com/blog/django-allauth-react/>
10. **GitHub Issue #3996 (Headless OAuth landing on API):** <https://github.com/pennersr/django-allauth/issues/3996>
11. **GitHub Issue #4041 (Google OAuth fails in headless):** <https://github.com/pennersr/django-allauth/issues/4041>
12. **Stack Overflow (Session token problems):** <https://stackoverflow.com/questions/79262845/django-allauth-65-2-0-headless-mode-session-token-problems>

### Key Findings from Research

- **OAuth callbacks are NOT skipped** in `HEADLESS_ONLY` mode (only login/signup HTML views are disabled)
- **Token Strategy is the official extension point** for custom tokens (not adapters/middleware)
- **callback_url parameter controls user redirect**, not OAuth provider redirect
- **Hybrid auth requires extracting tokens from redirect URL parameters**, not just cookies

---

## 8. Architecture Diagrams

### OAuth Flow with Headless Mode

```
┌─────────────┐                                    ┌─────────────┐
│   Browser   │                                    │   Django    │
│  (React)    │                                    │   Backend   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. POST /_allauth/.../provider/redirect         │
       │    (provider=google, callback_url=/login)       │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │ 2. 302 Redirect to Google OAuth                 │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │                                                  │
    ┌──▼──────────┐                                      │
    │   Google    │                                      │
    │   OAuth     │                                      │
    └──┬──────────┘                                      │
       │                                                  │
       │ 3. User authenticates                           │
       │                                                  │
       │ 4. 302 Redirect to callback                     │
       │    /accounts/google/login/callback/             │
       │    (code=..., state=...)                        │
       ├────────────────────────────────────────────────>│
       │                                                  │
       │                                     5. Exchange code for tokens
       │                                     6. Create/update user
       │                                     7. Invoke Token Strategy
       │                                     8. Generate JWT tokens
       │                                                  │
       │ 9. 302 Redirect to callback_url                 │
       │    /login?access_token=...&expires_in=...       │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 10. Extract tokens from URL                     │
       │ 11. Store access_token in localStorage          │
       │ 12. Refresh token already in HTTP-only cookie   │
       │                                                  │
       │ 13. Navigate to /home                           │
       │                                                  │
```

### Token Storage Architecture (Hybrid Auth)

```
┌──────────────────────────────────────────────────────┐
│                  Frontend (React)                     │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │           localStorage                         │  │
│  │  - access_token (5-min lifetime)              │  │
│  │  - token_expires_in                           │  │
│  │  - token_issued_at                            │  │
│  │                                                │  │
│  │  ✓ JavaScript can read                        │  │
│  │  ✓ Used for instant auth detection            │  │
│  │  ✓ Sent in Authorization header               │  │
│  │  ⚠  Vulnerable to XSS (but short-lived)       │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │           HTTP-only Cookie                     │  │
│  │  - refresh_token (14-day lifetime)            │  │
│  │                                                │  │
│  │  ✗ JavaScript CANNOT read                     │  │
│  │  ✓ Automatically sent with requests           │  │
│  │  ✓ XSS-proof                                  │  │
│  │  ✓ Used to refresh access token               │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                         │
                         │ API Request
                         ▼
┌──────────────────────────────────────────────────────┐
│                  Backend (Django)                     │
│                                                       │
│  1. Validate access token from Authorization header  │
│  2. If expired → use refresh token from cookie       │
│  3. If valid → issue new access token                │
│  4. Return new access token in response body         │
│  5. Rotate refresh token in HTTP-only cookie         │
└──────────────────────────────────────────────────────┘
```

---

## 9. Lessons Learned

### What We Learned About django-allauth Headless Mode

1. **"Headless" doesn't mean "no backend endpoints"**
   - Headless mode provides JSON APIs for frontend
   - OAuth callbacks still require backend views
   - `HEADLESS_ONLY = True` disables HTML views, not OAuth mechanics

2. **callback_url is for user navigation, not OAuth routing**
   - OAuth providers always redirect to backend callback URLs
   - `callback_url` tells backend where to send authenticated user
   - This is a two-step redirect: Provider → Backend → Frontend

3. **Token Strategy is the ONLY extension point**
   - Signals/middleware approaches are outdated
   - Adapters are for user data management, not tokens
   - Token Strategy is invoked automatically after OAuth success

4. **Tokens delivered via URL parameters, not just cookies**
   - Access token included in redirect URL query string
   - Refresh token set as HTTP-only cookie
   - Frontend must extract tokens from URL after redirect

### What We Learned About Debugging OAuth

1. **Test OAuth provider configuration first**
   - Verify redirect URIs point to backend callback URLs
   - Use browser network inspector to trace redirects
   - Check for 404s on callback URLs

2. **Session state is critical**
   - OAuth state validation requires session persistence
   - ALLOWED_HOSTS must include callback_url domains
   - CSRF_TRUSTED_ORIGINS must include frontend URL

3. **Token Strategy errors are silent**
   - Token Strategy only invoked if OAuth completes successfully
   - Check backend logs for OAuth callback errors
   - Missing tokens usually means callback failed, not Token Strategy

### Anti-Patterns to Avoid

1. ❌ **Don't remove traditional URLs from urls.py**
   - OAuth callbacks require `/accounts/<provider>/login/callback/`
   - `HEADLESS_ONLY = True` disables HTML views, not callback endpoints

2. ❌ **Don't configure OAuth providers to redirect to frontend**
   - OAuth handshake requires backend endpoint
   - Frontend receives tokens via redirect after OAuth completes

3. ❌ **Don't use adapters/middleware for token generation**
   - Token Strategy is the official pattern
   - Adapters are for user data, not authentication tokens

4. ❌ **Don't expect tokens only in cookies**
   - Headless mode delivers access token via URL parameters
   - Refresh token is in HTTP-only cookie
   - Frontend must extract tokens from both sources

---

## 10. Next Steps

### Immediate Actions

1. **Discard uncommitted changes** (4 failed middleware/adapter attempts)
2. **Verify OAuth provider configuration** (Google Cloud Console, GitHub)
3. **Update frontend token extraction** (useAuth.ts)
4. **Test complete OAuth flow** (Google and GitHub)

### Follow-up Tasks

1. **Update task list** (mark research complete, add implementation subtasks)
2. **Update notes file** (document decision to use official pattern)
3. **Test error scenarios** (OAuth denial, expired state, etc.)
4. **Document OAuth setup** (for future developers)

---

**Report Generated**: 2025-10-15 (Initial Research)
**Research Duration**: ~30 minutes (external research agent)
**Confidence Level**: High (based on official documentation + working examples)
**Status**: Initial research complete - see follow-up research below

---

# FOLLOW-UP RESEARCH: Browser vs App Mode Token Delivery

**Research Date**: 2025-10-15 (Follow-up)
**Context**: OAuth testing revealed tokens NOT in URL parameters after callback
**Research Method**: External research agent deep-dive into official React SPA example
**Purpose**: Determine actual token delivery mechanism for browser-based OAuth flows

---

## Executive Summary: Critical Architectural Clarification

**INITIAL RESEARCH WAS PARTIALLY INCORRECT.** The first research phase incorrectly stated that tokens are delivered via URL parameters after OAuth callback. This is NOT how django-allauth headless browser mode works.

**Critical Finding**: Django-allauth headless mode has **TWO separate client types** with completely different authentication mechanisms:

1. **Browser Client Type** (`/_allauth/browser/v1/`) - Uses **HTTP-only session cookies ONLY**
   - No tokens in URL parameters
   - No tokens in response body
   - Authentication established via session cookie
   - `create_access_token_payload()` NOT used for OAuth flows

2. **App Client Type** (`/_allauth/app/v1/`) - Uses **`X-Session-Token` header**
   - Session token returned in response body
   - Used for mobile apps and non-browser contexts
   - `create_access_token_payload()` IS used here

**Our mistake**: We implemented browser mode endpoints but expected app mode token delivery behavior.

---

## 11. How Token Delivery Actually Works (Browser Mode)

### Browser Mode OAuth Flow (What Actually Happens)

```
1. Frontend POSTs to /_allauth/browser/v1/auth/provider/redirect
   └─> Body: {provider: "google", callback_url: "http://localhost:5173/login", ...}

2. Backend returns 302 redirect to Google OAuth
   └─> Sets Django session cookie with OAuth state

3. User authenticates with Google

4. Google redirects to /accounts/google/login/callback/?code=XXX&state=YYY

5. Backend processes OAuth callback:
   ├─> Exchanges code for tokens with Google
   ├─> Creates/authenticates Django user
   ├─> Updates session (user.is_authenticated = True)
   └─> 302 redirects to callback_url (NO TOKENS IN URL)

6. Frontend receives redirect to http://localhost:5173/login
   └─> Session cookie automatically included (HTTP-only, browser-managed)

7. Frontend checks authentication status:
   └─> Calls /_allauth/browser/v1/auth/session
       └─> Session cookie authenticates the request
           └─> Returns: {data: {auth: {authenticated: true, user: {...}}}}
```

**Key Difference**: No tokens in URL. Authentication is purely cookie-based.

### What create_access_token_payload() Actually Does

**Browser Mode (OAuth via browser redirects)**:
- `create_access_token_payload()` is **NOT called**
- Session cookie is the authentication mechanism
- No JWT tokens generated for OAuth flows
- Token Strategy only used for app mode

**App Mode (mobile apps with X-Session-Token header)**:
- `create_access_token_payload()` **IS called**
- Returns session token in response body
- Client includes `X-Session-Token` header in subsequent requests
- Uses `/_allauth/app/v1/` endpoints (different from browser)

### Official React SPA Example Analysis

**Backend Configuration** (`examples/react-spa/backend/backend/settings.py`):

```python
HEADLESS_ONLY = True

# Note: No HEADLESS_TOKEN_STRATEGY configured!
# Session cookies are used, not custom tokens

HEADLESS_FRONTEND_URLS = {
    "socialaccount_login_error": "/account/provider/callback",
}
```

**Frontend OAuth Handler** (`examples/react-spa/frontend/src/socialaccount/ProviderCallback.js`):

```javascript
export function ProviderCallback () {
  const auth = useAuthStatus()  // Calls session endpoint
  const location = useLocation()

  useEffect(() => {
    // NO token parsing from URL!
    // Just checks auth.status from session endpoint
    if (!auth.isLoading) {
      if (auth.isAuthenticated) {
        navigate('/') // Success
      } else {
        navigate('/login') // Failed
      }
    }
  }, [auth])
}
```

**Authentication Check** (`examples/react-spa/frontend/src/lib/allauth.js`):

```javascript
export function useAuthStatus () {
  const [response, setResponse] = useState(null)

  useEffect(() => {
    // Calls session endpoint - session cookie authenticates automatically
    getSession().then((resp) => {
      setResponse(resp)
    })
  }, [])

  return {
    isLoading: response === null,
    isAuthenticated: response?.data?.auth?.authenticated,
    user: response?.data?.auth?.user
  }
}
```

**Critical Insight**: The official example **never parses URL parameters for tokens**. It relies entirely on session cookies + session endpoint.

---

## 12. Why Our Implementation Failed

### What We Tried to Do

1. Implemented `JWTTokenStrategy` with `create_access_token_payload()`
2. Expected tokens in URL after OAuth: `/login?access_token=...&expires_in=...`
3. Frontend parsed URL parameters to extract tokens
4. Stored access token in localStorage for hybrid auth

### Why It Doesn't Work

| Our Assumption | Reality |
|----------------|---------|
| OAuth uses JWTTokenStrategy | Only app mode uses Token Strategy, browser mode doesn't |
| Tokens delivered in URL parameters | Browser mode uses session cookies only, no URL tokens |
| `create_access_token_payload()` controls OAuth token delivery | This method only invoked for app mode (`/_allauth/app/v1/`) |
| Hybrid auth works for OAuth | Browser mode OAuth is purely session-based |

### The Core Misconception

We conflated two separate authentication flows:

**Email/Password Login** (Django Ninja endpoints):
- Uses our custom `/api/token/` endpoint
- Returns JWT tokens in response body
- Frontend stores in localStorage + HTTP-only cookie
- This DOES use hybrid auth

**OAuth Login** (django-allauth browser endpoints):
- Uses django-allauth's `/_allauth/browser/v1/` endpoints
- Establishes authentication via session cookie
- No JWT tokens involved
- This CANNOT use hybrid auth (session-only)

---

## 13. Correct Implementation for Browser Mode

### Backend: No Changes Needed

Current configuration is correct for browser mode:

```python
# settings.py
HEADLESS_ONLY = True
HEADLESS_FRONTEND_URLS = {
    "socialaccount_login_error": f"{FRONTEND_URL}/login?error=oauth",
}

# Session cookie settings
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# CORS settings
CORS_ALLOW_CREDENTIALS = True
```

**Note**: `HEADLESS_TOKEN_STRATEGY` configuration exists but is **not used for browser OAuth flows**. It's only relevant for app mode.

### Frontend: OAuth Callback Handler

**INCORRECT (What we tried)**:

```typescript
// ❌ Looking for tokens in URL (doesn't work for browser mode)
const params = new URLSearchParams(location.search);
const accessToken = params.get('access_token');  // This will be null
```

**CORRECT (Session-based)**:

```typescript
// After OAuth redirect to /login, check session endpoint
useEffect(() => {
  async function checkOAuthResult() {
    try {
      const response = await fetch(
        'http://localhost:8000/_allauth/browser/v1/auth/session',
        {
          method: 'GET',
          credentials: 'include', // CRITICAL: sends session cookie
        }
      );

      const result = await response.json();

      if (result.status === 200 && result.data.auth.authenticated) {
        // User authenticated via session cookie
        setUser(result.data.auth.user);
        setIsAuthenticated(true);
        navigate('/home');
      } else {
        // Authentication failed
        navigate('/login?error=oauth_failed');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      navigate('/login?error=network');
    }
  }

  checkOAuthResult();
}, [location]);
```

### All API Requests Must Include Credentials

```typescript
// EVERY API call needs credentials: 'include'
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Sends session cookie
  body: JSON.stringify(data),
});
```

---

## 14. Configuration Requirements (Updated)

### Backend Settings (Critical)

```python
# ALLOWED_HOSTS - must include callback_url domain
ALLOWED_HOSTS = [
    "localhost",
    "localhost:5173",  # MUST include port for callback_url validation
    "127.0.0.1",
]

# Session cookie configuration
SESSION_COOKIE_HTTPONLY = True  # Prevents JS access (secure)
SESSION_COOKIE_SAMESITE = "Lax"  # NOT "Strict" (breaks OAuth)
SESSION_COOKIE_SECURE = False  # True only for HTTPS production

# CORS configuration
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]

# CSRF configuration
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
]
```

### OAuth Provider Configuration

**Google Cloud Console**:

```
Authorized redirect URIs:
  http://localhost:8000/accounts/google/login/callback/
```

**GitHub OAuth App**:

```
Authorization callback URL:
  http://localhost:8000/accounts/github/login/callback/
```

**Critical**: OAuth providers must redirect to **backend** URLs, not frontend.

---

## 15. Common Pitfalls (Updated)

### Pitfall #1: Expecting Tokens in URL

**Symptom**: URL after OAuth is `/login` with no query parameters

**Cause**: Browser mode doesn't deliver tokens via URL

**Solution**: Call session endpoint to check authentication

### Pitfall #2: Missing credentials: 'include'

**Symptom**: Session endpoint returns `authenticated: false` even after successful OAuth

**Cause**: Session cookie not sent with request

**Solution**: Add `credentials: 'include'` to all fetch calls

### Pitfall #3: ALLOWED_HOSTS Missing Port

**Symptom**: OAuth callback fails with `error=unknown`

**Cause**: `callback_url` host validation fails (e.g., `localhost:5173` not in ALLOWED_HOSTS)

**Solution**: Include port number in ALLOWED_HOSTS: `"localhost:5173"`

### Pitfall #4: SESSION_COOKIE_SAMESITE = "Strict"

**Symptom**: Session lost during OAuth redirect

**Cause**: `Strict` prevents cookies on cross-origin redirects

**Solution**: Use `"Lax"` instead (fixed in django-allauth recent versions)

### Pitfall #5: Mixing Browser and App Mode Patterns

**Symptom**: Implementing Token Strategy expecting it to work for browser OAuth

**Cause**: Token Strategy only used for app mode, not browser mode

**Solution**: Use session cookies for browser OAuth, reserve Token Strategy for app mode

---

## 16. Architectural Decision: Hybrid Auth with Two Patterns

### Recommended Approach

**Email/Password Login** (JWT tokens):

```
Frontend → /api/token/ → JWT tokens returned → localStorage + HTTP-only cookie
```

**OAuth Login** (Session cookies):

```
Frontend → /_allauth/browser/v1/auth/provider/redirect → OAuth flow → Session cookie set
```

### Why Two Patterns?

**Email/Password**:
- ✅ Custom Django Ninja endpoint (we control response format)
- ✅ Can return JWT tokens in response body
- ✅ Hybrid auth works (localStorage + HTTP-only cookie)

**OAuth**:
- ⚠️ Django-allauth controls OAuth callback response
- ⚠️ Browser mode uses session cookies only
- ⚠️ Cannot customize to return JWT tokens (without major hackery)
- ✅ Session cookies are more secure (HTTP-only, XSS-proof)

### Consistency Considerations

**Option A: Accept Two Patterns** (RECOMMENDED):
- Email/password: JWT tokens (localStorage + cookie)
- OAuth: Session cookies only
- Both work, just different mechanisms
- Simpler implementation, follows official patterns

**Option B: Force JWT for Everything**:
- Would require custom OAuth callback view override
- Goes against django-allauth design
- More complex, harder to maintain
- Not recommended

---

## 17. Implementation Changes Required

### What to Keep

1. ✅ Backend `HEADLESS_ONLY = True` configuration
2. ✅ Backend `ALLOWED_HOSTS` with port numbers
3. ✅ Frontend OAuth initiation (Login.tsx form POST)
4. ✅ OAuth provider configuration (callback URLs)

### What to Change

1. ❌ Remove URL parameter parsing for `access_token` in useAuth.ts
2. ✅ Add session endpoint check after OAuth callback
3. ✅ Ensure `credentials: 'include'` on all API requests
4. ✅ Update documentation to reflect session-based OAuth

### What to Remove

1. ❌ `HEADLESS_TOKEN_STRATEGY` configuration (not used for browser OAuth)
2. ❌ Expectations that `create_access_token_payload()` affects OAuth
3. ❌ Any custom middleware trying to add tokens to OAuth responses

---

## 18. Testing Checklist (Updated)

**Backend Configuration**:
- [ ] `ALLOWED_HOSTS` includes `localhost:5173`
- [ ] `SESSION_COOKIE_SAMESITE = "Lax"`
- [ ] `CORS_ALLOW_CREDENTIALS = True`
- [ ] Both `/_allauth/` and `/accounts/` URLs configured

**OAuth Provider Setup**:
- [ ] Google redirect URI: `http://localhost:8000/accounts/google/login/callback/`
- [ ] GitHub redirect URI: `http://localhost:8000/accounts/github/login/callback/`

**OAuth Flow**:
- [ ] Click "Login with Google" redirects to Google
- [ ] After authentication, redirected to frontend `/login`
- [ ] Session endpoint returns `authenticated: true`
- [ ] User data available in session response
- [ ] Subsequent API calls work with `credentials: 'include'`

**Session Management**:
- [ ] Session persists across page refreshes
- [ ] Logout clears session cookie
- [ ] Session expires after configured timeout

---

## 19. Sources (Follow-up Research)

### Official Resources

1. **django-allauth Headless Documentation**: <https://docs.allauth.org/en/latest/headless/>
2. **React SPA Example** (complete source): <https://codeberg.org/allauth/django-allauth/src/branch/main/examples/react-spa>
3. **Official OpenAPI Specification**: <https://docs.allauth.org/en/dev/headless/openapi-specification/>

### GitHub Issues

4. **Issue #4041**: Google OAuth fails in headless mode (session cookie issue)
5. **Issue #3883**: Session cookie authentication clarification
6. **Issue #4108**: Headless social account issues

### Community Resources

7. **Stack Overflow**: "django-allauth 65.2.0 headless mode session token problems"
8. **HackSoft Guide**: Django OAuth 2.0 implementation patterns

### Key Quote from Maintainer (pennersr)

> "For app based usage, cookies play no role"

This confirms that browser mode (which uses cookies) is fundamentally different from app mode (which uses X-Session-Token header).

---

## 20. Lessons Learned (Updated)

### What We Learned About Browser vs App Mode

1. **Browser mode and app mode are completely different**
   - Browser: Session cookies, `/_allauth/browser/v1/` endpoints
   - App: X-Session-Token header, `/_allauth/app/v1/` endpoints
   - Token Strategy only applies to app mode

2. **Official examples use pure session cookies**
   - React SPA example doesn't use Token Strategy for OAuth
   - No JWT tokens delivered via OAuth in browser mode
   - Session endpoint is checked after OAuth redirect

3. **create_access_token_payload() is misnamed (confusing)**
   - Sounds like it affects all authentication
   - Actually only used for app mode (mobile apps)
   - Not invoked during browser OAuth flows

4. **Browser OAuth is intentionally simple**
   - Session cookies are more secure than tokens
   - Less complex (no token extraction/storage logic)
   - Works out-of-the-box with django-allauth

### What We Learned About Our Mistake

1. **First research was based on incomplete understanding**
   - Looked at Token Strategy docs without testing
   - Assumed `create_access_token_payload()` affected all flows
   - Didn't examine official React SPA example closely enough

2. **Testing revealed the truth**
   - No tokens in URL after OAuth (confirmed by observation)
   - Backend logs showed 302 redirect without tokens
   - Official example uses completely different pattern

3. **Importance of following official patterns**
   - Trying to force custom patterns causes problems
   - Official examples exist for a reason
   - Session cookies are more secure anyway

---

## 21. Final Recommendations

### For CineXplorer Project

**Adopt Two-Pattern Approach**:

1. **Email/Password Login**:
   - Keep existing JWT implementation (`/api/token/`)
   - Hybrid auth (localStorage + HTTP-only cookie)
   - Token refresh flow via axios interceptor

2. **OAuth Login**:
   - Use django-allauth browser mode with session cookies
   - Check `/_allauth/browser/v1/auth/session` after OAuth redirect
   - All API requests include `credentials: 'include'`

**Document the Architectural Decision**:
- Two authentication patterns (JWT vs session)
- Why each pattern exists
- Security tradeoffs and benefits

**Update Task List**:
- Remove URL token extraction tasks
- Add session endpoint integration tasks
- Update testing checklist for session-based OAuth

---

**Follow-up Report Generated**: 2025-10-15
**Research Duration**: ~45 minutes (deep-dive into official examples)
**Confidence Level**: Very High (tested against actual implementation + official examples)
**Status**: Architectural decision made - ready for corrected implementation
