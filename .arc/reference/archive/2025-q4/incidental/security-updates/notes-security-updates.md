# Notes: Authentication Security Updates

**Created**: 2025-10-10
**Completed**: 2025-10-14
**Related Task List**: `tasks-incidental-security-updates.md`
**Status**: Complete

## Table of Contents

**Major Investigations & Decisions:**

- [CSRF Integration Issue Resolution](#csrf-integration-issue-resolution) - Django Ninja bug #1464 investigation and custom middleware solution
- [Refresh Endpoint CSRF Requirement](#refresh-endpoint-csrf-requirement) - Security analysis and Option A decision
- [Decorator vs Path-Based CSRF Exemptions](#decorator-vs-path-based-csrf-exemptions) - Architectural evaluation
- [Frontend CSRF Integration Guide](#frontend-csrf-integration-guide) - Implementation patterns for frontend
- [CSRF Monitoring and Logging](#csrf-monitoring-and-logging) - Production monitoring strategy

**Implementation Details:**

- [Security Settings Priority](#security-settings-priority) - Initial planning and priority order
- [Rate Limiting Implementation](#rate-limiting-implementation) - Django Ninja throttling with Redis
- [Token Blacklisting Implementation](#token-blacklisting-implementation) - django-ninja-jwt configuration
- [Error Response Standardization](#error-response-standardization) - Consistent error format across endpoints

**Historical Context:**

- [Task 3.6 – Throttling Lazy Evaluation](#task-36--throttling-lazy-evaluation-refactoring-2025-10-13) - Test-friendly refactoring
- [Task 4.3.3 – Alert Threshold Deferral](#task-433--alert-threshold-deferral-decision-2025-10-10) - Observability sprint deferral
- [Task 4.4 – Token Blacklisting Bug Fix](#task-44--token-blacklisting-bug-fix-2025-10-10) - RefreshToken.for_user() fix
- [Task 7.5.2 – CSRF Cookie Name Bug Fix](#task-752--csrf-test-cookie-name-bug-fix-2025-10-11) - Test validation fix
- [Task 7.5.9 – Pragmatic Testing Approach](#task-759--pragmatic-testing-approach-decision-2025-10-14) - Coverage threshold decision

**Reference:**

- [External References](#external-references) - Research reports, standards, framework docs

---

## CSRF Integration Issue Resolution

**Context:** Task 5 investigation (2025-10-10) - Originally planned to remove custom CSRF middleware, discovered Django Ninja bug #1464 requires custom solution.

### Problem Discovered

Django Ninja's CSRF implementation conflicts with Django's `CsrfViewMiddleware`:

**Symptoms:**

- With `csrf=True` on auth class: CSRF blocks requests but **rejects valid tokens** ("CSRF check Failed")
- With `csrf=False`: Need to verify if CSRF protection actually works
- Mixed results during testing required deep investigation

### Root Cause Analysis

**Django Ninja Bug #1464** (unresolved as of v1.4.3):

- URL: <https://github.com/vitalik/django-ninja/issues/1464>
- Issue: Setting `csrf=True` on `APIKeyCookie` subclasses causes valid CSRF tokens to be rejected
- Status: Unresolved, no official workaround from maintainers

**How Django Ninja CSRF is designed to work:**

1. `csrf=False` (default): Applies `@csrf_exempt` decorator → NO CSRF protection
2. `csrf=True`: Removes `@csrf_exempt` → Django's `CsrfViewMiddleware` handles validation

**The bug:** When `csrf=True` is set explicitly on auth classes, Django Ninja's internal CSRF handling conflicts with Django's middleware, causing rejection of valid tokens.

### Solution Implemented (Workaround)

**Configuration:**

```python
# backend/apps/authentication/auth_ninja.py
class JWTCookieAuth(APIKeyCookie):
    def __init__(self) -> None:
        super().__init__(csrf=False)  # Prevent Django Ninja interference

# backend/config/api.py
api = NinjaAPI(
    csrf=False  # Prevent Django Ninja CSRF layer
)

# backend/config/settings.py
MIDDLEWARE = [
    # ...
    'django.middleware.csrf.CsrfViewMiddleware',  # Django's CSRF (ENABLED)
    # ...
]
```

**How this works:**

1. `csrf=False` on both auth class and API tells Django Ninja to stay out of CSRF handling
2. Django's `CsrfViewMiddleware` (enabled in settings) performs all CSRF validation
3. Django Ninja doesn't interfere, allowing Django's middleware to work correctly

### Initial Approach: csrf=False Workaround (FAILED)

**Attempted Solution:** Use `csrf=False` on both API and auth class to avoid bug #1464.

**Test Results:** Created comprehensive CSRF tests - **VERIFICATION FAILED**

- ❌ Requests WITHOUT CSRF tokens accepted (HTTP 200 instead of 403)
- ❌ Invalid/fake tokens also accepted
- ⚠️ **CRITICAL**: `csrf=False` disables ALL CSRF protection, not just Django Ninja's layer

**Root Cause:** Django Ninja's `csrf=False` applies `@csrf_exempt` to all endpoints, completely bypassing Django's `CsrfViewMiddleware`.

**Decision:** ROLLED BACK - Security vulnerability unacceptable

---

### Final Solution: Custom CSRF Middleware with JWT Cookie Detection (APPROVED)

**Date**: 2025-10-10 (after comprehensive testing)
**Options Evaluated:**

1. ❌ **Option 1: csrf=True on NinjaAPI, csrf=False on auth** - FAILED verification (still disabled CSRF)
2. ✅ **Option 2: Custom CSRF middleware** - SUCCESS (all 9 tests passing)
3. ⏭️ **Option 3: Per-endpoint auth** - Not needed (Option 2 solved the problem)

**Chosen Solution**: Custom `CsrfHeaderMiddleware` with path-based exemptions

**Key Insight:** JWT auth happens at endpoint level, not middleware level. Solution checks for JWT cookie presence (`access_token` cookie) instead of `request.user.is_authenticated`.

**Result:** All 12 CSRF tests passing ✅

**Implementation:**

```python
# backend/apps/authentication/middleware.py
class CsrfHeaderMiddleware(MiddlewareMixin):
    """Custom CSRF middleware for Django Ninja with JWT cookie detection."""

    def process_request(self, request):
        # 1. Exempt public auth endpoints
        if any(request.path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES):
            return None

        # 2. Check for JWT cookie (not request.user - JWT auth is endpoint-level)
        access_token_name = settings.SIMPLE_JWT.get('ACCESS_TOKEN_NAME', 'access_token')
        has_jwt_cookie = access_token_name in request.COOKIES

        if not has_jwt_cookie:
            return None  # No JWT = request fails auth (401), not CSRF (403)

        # 3. Validate CSRF for state-changing methods
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            cookie_token = request.COOKIES.get("csrftoken")
            header_token = request.headers.get("X-CSRFToken")

            if not cookie_token or not header_token or cookie_token != header_token:
                return JsonResponse({"detail": "CSRF token missing or invalid."}, status=403)

        return None
```

**Configuration:**

```python
# backend/config/settings.py
MIDDLEWARE = [
    # ...
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # MUST run before custom CSRF
    "apps.authentication.middleware.CsrfHeaderMiddleware",  # Custom CSRF with JWT detection
    # ...
]

# backend/config/api.py
api = NinjaAPI(
    csrf=False  # Custom middleware handles CSRF (avoid Django Ninja bug #1464)
)

# backend/apps/authentication/auth_ninja.py
class JWTCookieAuth(APIKeyCookie):
    def __init__(self):
        super().__init__(csrf=False)  # Avoid Django Ninja bug #1464
```

**Test Coverage:** 12 tests passing - blocks invalid tokens, allows valid tokens, exempts public endpoints, handles edge cases

**Edge Cases Documented:**

- Refresh endpoint CSRF requirement (see next section)
- Expired JWT cookie handling
- Frontend integration requirements (see [Frontend CSRF Integration Guide](#frontend-csrf-integration-guide))
- Path maintenance for new public endpoints

---

## Refresh Endpoint CSRF Requirement

**Decision Analysis:** Should `/api/token/refresh/` require CSRF protection?

### Background Context

**Current State:**

- `/api/token/refresh/` endpoint has JWT cookies (access_token + refresh_token)
- NOT in `EXEMPT_PATH_PREFIXES` list
- Currently **REQUIRES CSRF token** due to JWT cookie presence
- Has rate limiting: `UserRateThrottle('10/m')` (10 attempts/minute)

**The Decision:** Should `/api/token/refresh/` require CSRF protection?

### Option A: Require CSRF on Refresh Endpoint (Current Behavior)

**Pros:**

- ✅ **Defense-in-depth** - Multiple layers of protection (rate limiting + CSRF)
- ✅ **Consistent with other state-changing endpoints** - All POST/PATCH/DELETE with JWT cookies require CSRF
- ✅ **Prevents CSRF on token refresh** - Attacker with stolen JWT cookie can't refresh tokens without CSRF
- ✅ **No code changes needed** - Already working this way
- ✅ **Security best practice** - OAuth 2.0 security best practices recommend CSRF protection for token endpoints
- ✅ **Mitigates session extension attacks** - Attacker can't keep stolen session alive by refreshing

**Cons:**

- ⚠️ **Extra frontend complexity** - Frontend must send CSRF token on refresh (automatic refresh flows need token)
- ⚠️ **Potential UX friction** - If CSRF token expires but JWT refresh is valid, user gets 403 instead of seamless refresh
- ⚠️ **Background refresh complexity** - Automatic token refresh in service workers/background tabs must manage CSRF
- ⚠️ **Mobile app complications** - Native mobile apps using cookie-based auth need CSRF token management

**Security Analysis:**

**Threat Model:**

1. **Attacker has JWT cookies but NOT CSRF token** (cookie theft via XSS)
   - Attacker can READ data (GET requests)
   - Attacker CANNOT refresh tokens (blocked by CSRF) ✅
   - **Result:** Session dies after 5 minutes (access token lifetime)

2. **Attacker has both JWT cookies AND CSRF token** (full compromise)
   - Attacker can refresh tokens indefinitely
   - **Result:** Rate limiting is only defense (10 refreshes/minute)

**Risk Reduction:** Requiring CSRF reduces attacker session lifetime from "indefinite" to 5 minutes (access token lifetime)

**Impact:** **HIGH** - Significantly limits damage from cookie theft

---

### Option B: Exempt Refresh Endpoint from CSRF (Add to Exempt List)

**Pros:**

- ✅ **Simpler frontend** - Refresh endpoint works like login (no CSRF needed)
- ✅ **Better UX** - Token refresh always works if JWT is valid (no CSRF mismatch errors)
- ✅ **Mobile-friendly** - Native apps don't need CSRF token management
- ✅ **Background refresh friendly** - Service workers can refresh seamlessly
- ✅ **Consistent with login** - Both login and refresh work without CSRF (symmetric design)

**Cons:**

- ❌ **Reduced security** - Stolen JWT cookies can be refreshed indefinitely
- ❌ **Only rate limiting protects refresh** - Single layer of defense (10/minute)
- ❌ **Session extension vulnerability** - Attacker keeps stolen session alive by refreshing every 5 minutes
- ❌ **Violates defense-in-depth** - Removes a security layer
- ❌ **Not OAuth 2.0 best practice** - RFC 6749 recommends CSRF protection for all token endpoints

**Security Analysis:**

**Threat Model:**

1. **Attacker has JWT cookies** (cookie theft via XSS)
   - Attacker can READ data (GET requests)
   - Attacker CAN refresh tokens indefinitely ❌
   - **Result:** Session stays alive as long as attacker keeps refreshing (indefinite)

2. **Rate limiting provides limited protection:**
   - Attacker can refresh 10 times/minute
   - With 5-minute access token lifetime, attacker needs 1 refresh every 5 minutes
   - **Result:** Rate limiting is NOT a barrier for slow, persistent attacks

**Risk Increase:** Exempting CSRF changes session lifetime from "5 minutes" to "indefinite" for cookie theft scenarios

**Impact:** **HIGH** - Dramatically increases damage from cookie theft

---

### Option C: Hybrid Approach - Optional CSRF on Refresh

**Implementation:**

- Check for CSRF token on refresh endpoint
- If present and valid: proceed
- If absent but rate limit OK: proceed (backward compatibility)
- If absent and rate limit exceeded: 429

**Pros:**

- ✅ **Backward compatible** - Works with or without CSRF
- ✅ **Gradual adoption** - Frontend can add CSRF when ready
- ✅ **Mobile flexibility** - Native apps can skip CSRF

**Cons:**

- ❌ **Security confusion** - Unclear which clients are protected
- ❌ **Implementation complexity** - Custom middleware logic for one endpoint
- ❌ **Maintenance burden** - Special case to document and maintain
- ❌ **False sense of security** - Optional security is weak security
- ❌ **Doesn't solve the core problem** - Still vulnerable for clients that don't send CSRF

---

### Recommendation: **Option A - Require CSRF on Refresh Endpoint**

**Rationale:**

1. **Security over convenience** - Cookie theft is a real threat; limiting session lifetime is critical
2. **Defense-in-depth** - CSRF + rate limiting provides multiple layers
3. **Industry best practice** - OAuth 2.0 RFC 6749 recommends CSRF for token endpoints
4. **Consistent security model** - All state-changing endpoints with JWT cookies require CSRF
5. **Manageable frontend complexity** - Modern frontend frameworks handle CSRF tokens well

**Implementation Impact:**

**Frontend Requirements:**

```typescript
// Refresh flow with CSRF
async function refreshTokens() {
  const csrfToken = getCookie('csrftoken');

  const response = await fetch('/api/token/refresh/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrfToken,  // Required
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // Include cookies
  });

  if (response.status === 403) {
    // CSRF failed - might need to get new CSRF token
    await fetch('/api/csrf/');  // Refresh CSRF token
    return refreshTokens();  // Retry
  }

  return response;
}
```

**Edge Case Handling:**

1. **CSRF expires before JWT refresh:** Get new CSRF token from `/api/csrf/`, then retry
2. **Background refresh:** Store CSRF token in memory, include in refresh requests
3. **Service workers:** Pass CSRF token to service worker during registration

**Testing:**

- Verify refresh works with valid CSRF token
- Verify refresh blocked without CSRF token (403)
- Verify refresh blocked with invalid CSRF token (403)

**Documentation Needed:**

- Frontend integration guide for CSRF + refresh flow
- Error handling strategies for CSRF/refresh mismatches
- Service worker CSRF token management patterns

---

### Alternative Consideration: Access Token Lifetime

**If CSRF on refresh is too problematic**, consider:

- **Increase access token lifetime** from 5 minutes to 15-30 minutes
- **Trade-off:** Longer-lived stolen access tokens vs simpler refresh flow
- **Security impact:** Less frequent refresh = smaller CSRF attack surface
- **Recommendation:** NOT advised - short access token lifetime is a security best practice

---

### Decision Record

**Decision:** ✅ **APPROVED - Option A** (2025-10-10)

**Rationale:** Security over convenience - limits stolen session lifetime to 5 minutes (access token lifetime)

**Justification:**

- Security best practices align with requiring CSRF
- Defense-in-depth principle demands multiple protection layers
- Frontend complexity is manageable with modern frameworks
- Industry standards (RFC 6749) recommend CSRF for token endpoints

---

## Decorator vs Path-Based CSRF Exemptions

**Architectural Evaluation:** Should we use decorators instead of path-based exemptions for CSRF?

### Current Approach: Path-Based Exemptions

**Implementation:**

```python
# In middleware.py
EXEMPT_PATH_PREFIXES = [
    "/api/register/",
    "/api/token/",
    "/api/csrf/",
    "/api/logout/",
]

class CsrfHeaderMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if any(request.path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES):
            return None  # Exempt
        # ... CSRF validation
```

**Pros:**

- ✅ **Centralized visibility** - All exemptions in one place (easy to audit)
- ✅ **Simple implementation** - Straightforward middleware logic
- ✅ **Framework agnostic** - Works with any Django view/endpoint
- ✅ **Easy to test** - Test paths directly without importing views
- ✅ **Global overview** - Security team can review all exemptions quickly
- ✅ **Regex support** - Can use patterns like `/api/public/*`

**Cons:**

- ❌ **Path maintenance** - Must remember to update list when adding/renaming endpoints
- ❌ **Disconnect from code** - Exemption logic separated from endpoint definition
- ❌ **Refactoring risk** - Endpoint URL changes can break exemption
- ❌ **Not self-documenting** - Developer must check middleware to know if endpoint exempt
- ❌ **Path typos** - Typo in path string = accidental CSRF enforcement
- ❌ **No type safety** - Paths are strings, no IDE help

---

### Alternative: Decorator-Based Exemptions

**Implementation:**

```python
# In middleware.py
CSRF_EXEMPT_MARKER = '_csrf_exempt_ninja'

def csrf_exempt_ninja(func):
    """Decorator to exempt Django Ninja endpoints from CSRF protection."""
    setattr(func, CSRF_EXEMPT_MARKER, True)
    return func

class CsrfHeaderMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Check if view function has exemption marker
        if hasattr(request, 'resolver_match') and request.resolver_match:
            view_func = self._get_view_func(request.resolver_match)
            if getattr(view_func, CSRF_EXEMPT_MARKER, False):
                return None  # Exempt

        # ... CSRF validation

    def _get_view_func(self, resolver_match):
        """Extract actual view function, handling Django Ninja wrapping."""
        view_func = resolver_match.func
        if hasattr(view_func, '__wrapped__'):
            return view_func.__wrapped__
        return view_func
```

**Usage:**

```python
# In authentication/api.py
from authentication.middleware import csrf_exempt_ninja

@router.post("/token", auth=None)
@csrf_exempt_ninja  # Explicit exemption
def obtain_token(request, payload: LoginPayload):
    ...

@router.post("/register", auth=None)
@csrf_exempt_ninja  # Explicit exemption
def register_user(request, payload: RegisterPayload):
    ...

@router.post("/refresh")  # No decorator = CSRF required
def refresh_token(request):
    ...
```

**Pros:**

- ✅ **Explicit intent** - Exemption visible at endpoint definition
- ✅ **Co-located logic** - Security decision near the code it affects
- ✅ **Self-documenting** - Developer sees exemption immediately
- ✅ **Refactor-friendly** - Endpoint moves, exemption moves with it
- ✅ **Type-safe** (with proper typing) - Can add type hints for IDE support
- ✅ **No path strings** - No risk of path typos
- ✅ **Scalable** - Works well as API grows (no central list to maintain)

**Cons:**

- ❌ **Scattered exemptions** - Harder to get global view of all exempt endpoints
- ❌ **Implementation complexity** - Middleware needs to inspect view functions
- ❌ **Django Ninja integration** - Need to handle Django Ninja's view wrapping
- ❌ **Testing complexity** - Must import actual view functions to test
- ❌ **Discovery difficulty** - Security audit requires searching codebase
- ❌ **Middleware coupling** - Middleware must understand view resolution

---

### Recommended: Hybrid Approach (Best of Both Worlds)

**Rationale:** Use path-based for infrastructure, decorators for application endpoints

**Implementation:**

```python
# In middleware.py
from typing import Callable

CSRF_EXEMPT_MARKER = '_csrf_exempt_ninja'

# Path-based exemptions for infrastructure endpoints
EXEMPT_PATH_PREFIXES = [
    "/api/csrf/",  # CSRF token endpoint (infrastructure)
    "/admin/",     # Django admin (has own CSRF handling)
]

def csrf_exempt_ninja(func: Callable) -> Callable:
    """
    Decorator to exempt Django Ninja endpoints from CSRF protection.

    Use this for public authentication endpoints that don't require CSRF:
    - Login endpoint
    - Registration endpoint
    - Password reset endpoint

    Do NOT use for endpoints that should be protected by CSRF.
    """
    setattr(func, CSRF_EXEMPT_MARKER, True)
    return func

class CsrfHeaderMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # 1. Check path-based exemptions (infrastructure)
        if any(request.path.startswith(prefix) for prefix in EXEMPT_PATH_PREFIXES):
            return None

        # 2. Check decorator-based exemptions (application)
        if hasattr(request, 'resolver_match') and request.resolver_match:
            view_func = self._get_view_func(request.resolver_match)
            if getattr(view_func, CSRF_EXEMPT_MARKER, False):
                return None

        # 3. Check for JWT cookie and validate CSRF
        # ... (existing JWT + CSRF validation logic)

    def _get_view_func(self, resolver_match):
        """Extract the actual view function, handling Django Ninja wrapping."""
        view_func = resolver_match.func
        if hasattr(view_func, '__wrapped__'):
            return view_func.__wrapped__
        return view_func
```

**Usage Pattern:**

```python
# Infrastructure endpoints - Use path-based (in EXEMPT_PATH_PREFIXES)
# /api/csrf/ - Already in list, no decorator needed

# Application endpoints - Use decorator-based
@router.post("/token", auth=None)
@csrf_exempt_ninja
def obtain_token(request, payload: LoginPayload):
    """Login endpoint - public, no CSRF required."""
    ...

@router.post("/register", auth=None)
@csrf_exempt_ninja
def register_user(request, payload: RegisterPayload):
    """Registration endpoint - public, no CSRF required."""
    ...

@router.post("/logout", auth=None)
@csrf_exempt_ninja
def logout_user(request):
    """Logout endpoint - public, no CSRF required."""
    ...

@router.post("/refresh")  # NO decorator = CSRF REQUIRED
def refresh_token(request):
    """Refresh endpoint - requires CSRF (Option A approved)."""
    ...
```

**Benefits of Hybrid:**

- ✅ **Best of both** - Path-based for infrastructure, decorator for application
- ✅ **Clear separation** - Infrastructure exemptions centralized, app exemptions co-located
- ✅ **Explicit app logic** - Application endpoints clearly marked
- ✅ **Easy infrastructure audit** - Check EXEMPT_PATH_PREFIXES for global exemptions
- ✅ **Easy app audit** - Search for `@csrf_exempt_ninja` decorator
- ✅ **Maintainable** - Each exemption type uses the right tool
- ✅ **Scalable** - Grows with API without central list bloat

**Trade-offs:**

- ⚠️ **Two patterns** - Developers need to know when to use each
- ⚠️ **More code** - Slightly more complex middleware
- ⚠️ **Documentation burden** - Must document when to use path vs decorator

---

### Comparison Summary

| Aspect | Path-Based | Decorator-Based | Hybrid |
|--------|-----------|----------------|--------|
| **Visibility** | 🟢 Excellent (all in one place) | 🟡 Scattered | 🟢 Good (split by type) |
| **Maintainability** | 🔴 Manual updates needed | 🟢 Auto-follows code | 🟢 Best of both |
| **Self-documentation** | 🔴 Separated from code | 🟢 Co-located | 🟢 Clear intent |
| **Refactoring** | 🔴 Breaks on URL change | 🟢 Moves with code | 🟢 Robust |
| **Implementation** | 🟢 Simple | 🟡 Moderate | 🟡 Moderate |
| **Security audit** | 🟢 Easy (one list) | 🟡 Must search codebase | 🟢 Two clear sources |
| **Type safety** | 🔴 String paths | 🟢 Function references | 🟢 Function references |
| **Scalability** | 🔴 List grows | 🟢 Scales well | 🟢 Scales well |

---

### Implementation Recommendation

**For Task 5.5.6.2 (Document exempt path pattern):**

**Immediate Action:**

1. ✅ Document current path-based pattern in middleware comments
2. ✅ Add clear examples of when to add paths to EXEMPT_PATH_PREFIXES
3. ✅ Add warning about path typos and refactoring risks

**Future Enhancement (Optional - separate task):**

1. Implement hybrid approach (decorator + path-based)
2. Migrate application endpoints to decorator pattern
3. Keep infrastructure endpoints path-based
4. Update developer guide with decorator usage
5. Add examples and tests

**Conclusion:**

- **Current approach (path-based)**: Simple, works well for current scale
- **Future consideration**: Hybrid approach when API grows (10+ exempt endpoints)
- **Decision**: Keep path-based, document pattern clearly

---

## Frontend CSRF Integration Guide

### Quick Reference

**CSRF Protection Essentials:**

1. **Get token:** `GET /api/csrf/` → returns `{csrfToken: "..."}`
2. **Send header:** `X-CSRFToken: <token>` on POST/PATCH/DELETE requests
3. **Exempt endpoints:** login, register, logout, verify-email, resend-verification (no CSRF needed)
4. **Error response:** `403 Forbidden` + `{"detail": "CSRF token missing or invalid."}`
5. **Retry logic:** On 403 CSRF error, get new token and retry once

---

### Implementation Pattern

**1. Token Acquisition**

```typescript
// Get CSRF token from backend
export async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf/', {
    method: 'GET',
    credentials: 'include',
  });
  const data = await response.json();
  return data.csrfToken;
}

// Helper to read from cookie (alternative)
export function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}
```

**2. Authenticated Request Helper**

```typescript
export async function authenticatedRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const csrfToken = getCsrfTokenFromCookie() || await getCsrfToken();

  const headers = new Headers(options.headers);

  // Add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
    headers.set('X-CSRFToken', csrfToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',  // Include JWT cookies
  });

  // Handle CSRF token expiry with one retry
  if (response.status === 403) {
    const error = await response.json();
    if (error.detail?.includes('CSRF')) {
      const newToken = await getCsrfToken();
      headers.set('X-CSRFToken', newToken);
      return fetch(url, { ...options, headers, credentials: 'include' }).then(r => r.json());
    }
  }

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}
```

**3. Usage Examples**

```typescript
// Update profile
await authenticatedRequest('/api/profile/', {
  method: 'PATCH',
  body: JSON.stringify({ username: 'newname' }),
});

// Token refresh (requires CSRF per Option A decision)
await authenticatedRequest('/api/token/refresh/', {
  method: 'POST',
});

// Login (exempt - no CSRF needed)
await fetch('/api/token/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username, password }),
});
```

---

### OAuth Integration (Upcoming Work)

**Context:** OAuth headless migration (tasks-incidental-oauth-headless-migration.md) will add social login.

**OAuth Callback Endpoints:**

- `/_allauth/*/callback/` endpoints will need CSRF exemption
- OAuth state parameter provides CSRF protection (different mechanism)
- Add to `EXEMPT_PATH_PREFIXES` when implementing

**OAuth Flow with CSRF:**

1. User clicks "Login with Google/GitHub"
2. Frontend initiates OAuth redirect to provider
3. Provider redirects to `/_allauth/*/callback/`
4. Callback creates session, sets JWT cookies
5. Frontend fetches CSRF token: `GET /api/csrf/`
6. Subsequent mutations include CSRF token

**Implementation Note:**
When adding OAuth callbacks to exempt list in `middleware.py`:

```python
EXEMPT_PATH_PREFIXES = [
    # ... existing paths
    "/_allauth/browser/v1/",  # OAuth: Headless API endpoints
]
```

---

### Error Handling

**CSRF Error (403):**

```json
{"detail": "CSRF token missing or invalid."}
```

**Common Errors:**

- **401 Unauthorized:** Invalid/missing JWT token (auth failed)
- **403 Forbidden (CSRF):** Missing/invalid CSRF token
- **429 Too Many Requests:** Rate limit exceeded

**Error Handling Pattern:**

```typescript
try {
  await authenticatedRequest('/api/profile/', { method: 'PATCH', ... });
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
  } else if (error.status === 403) {
    // CSRF retry logic (already in helper)
  } else if (error.status === 429) {
    // Show "too many requests" message
  }
}
```

---

### Testing Checklist

**Before deploying frontend CSRF integration:**

- [ ] Obtain CSRF token on app startup
- [ ] Send `X-CSRFToken` header on POST/PUT/PATCH/DELETE
- [ ] Verify exempt endpoints work without CSRF (login, register)
- [ ] Test CSRF retry on 403 error
- [ ] Test token refresh flow includes CSRF
- [ ] Verify `credentials: 'include'` on all authenticated requests

**Manual Testing:**

1. Open DevTools → Network tab
2. Trigger mutation (e.g., update profile)
3. Verify `X-CSRFToken` header present
4. Clear `csrftoken` cookie
5. Trigger same mutation
6. Verify: first request 403, retry succeeds

---

### Common Issues

**Problem:** All authenticated requests return 403
**Solution:** Verify CSRF token obtained and header sent. Check Network tab.

**Problem:** Login returns 403
**Solution:** Login is exempt - remove CSRF header from login requests.

**Problem:** Token refresh fails with 403
**Solution:** Refresh endpoint requires CSRF (Option A decision). Include token.

---

## CSRF Monitoring and Logging

### Monitoring Strategy

**What to Monitor:**

- **403 CSRF errors:** Potential attack OR frontend integration bug
- **CSRF error rate spikes:** Check after frontend deployments
- **Correlation with code changes:** New features breaking CSRF flow

**Integration with Task 6 (Authentication Logging):**
Task 6 will add comprehensive authentication event logging:

- Failed login attempts (IP, username, user agent)
- Token refresh attempts (successful and throttled)
- CSRF failures already log via middleware (lines 96-102 in middleware.py):

  ```python
  logger.warning(
      f"CSRF validation failed: Path={request.path}, "
      f"Method={request.method}, HasJWTCookie={has_jwt_cookie}, "
      f"CookiePresent={bool(cookie_token)}, HeaderPresent={bool(header_token)}"
  )
  ```

**Rate Limiting Context:**
Django Ninja throttling (Task 3) provides baseline DDoS protection:

- Login: 5 attempts/minute
- Register: 3 attempts/hour
- Refresh: 10 attempts/minute

CSRF + rate limiting = defense-in-depth.

**Production Monitoring Checklist:**

- [ ] Monitor 403 error rates in application logs
- [ ] Alert on >10 CSRF errors/hour (tunable based on traffic)
- [ ] Track CSRF errors by endpoint (identify problematic flows)
- [ ] Correlate CSRF errors with deployment times (frontend changes)

**Log Analysis:**

```bash
# Find CSRF failures in logs
grep "CSRF validation failed" /var/log/cinexplorer/backend.log

# Count CSRF failures per hour
grep "CSRF validation failed" /var/log/cinexplorer/backend.log | \
  awk '{print $1" "$2}' | cut -d: -f1 | uniq -c
```

---

## CSRF Edge Cases and Testing

### Known Edge Cases (Documented and Tested)

**1. Expired JWT + Valid CSRF**

- **Behavior:** Returns 403 CSRF error (middleware runs before endpoint auth)
- **Test:** `test_csrf_enforced_before_jwt_validation`
- **Impact:** Minor UX issue - CSRF error shown before auth error
- **Rationale:** Middleware ordering trade-off (acceptable)

**2. CSRF Token Lifecycle**

- **Behavior:** Single token valid for multiple requests (session lifetime)
- **Test:** `test_csrf_token_valid_for_multiple_requests`
- **Impact:** No need to fetch token per request (performance benefit)
- **Django behavior:** CSRF tokens don't expire per-request

**3. Refresh Endpoint CSRF Requirement**

- **Behavior:** `/api/token/refresh/` requires CSRF token (Option A implemented)
- **Test:** `test_refresh_endpoint_requires_csrf`
- **Rationale:** Limits stolen session lifetime to 5 minutes (access token lifetime)
- **Implementation:** Explicit middleware check prevents prefix matching exemption
- **Decision:** Option A approved (security over convenience)

**4. Path Prefix Matching (Mitigated)**

- **Risk:** `/api/token/` would match both login and refresh endpoints
- **Mitigation:** Explicit check for `/api/token/refresh/` in middleware (lines 97-101)
- **Behavior:** Login exempt, refresh requires CSRF (as intended)
- **Pattern:** Exact path checks before prefix matching for special cases

---

### Path Maintenance for Future Development

**When to Update `EXEMPT_PATH_PREFIXES` in middleware.py:**

**Add new path when:**

- Creating public auth endpoint (accessible before login)
- Adding infrastructure endpoint (health checks, metrics)
- Implementing OAuth callbacks (state parameter provides CSRF protection)

**Do NOT add when:**

- Endpoint requires authentication (has JWT cookie)
- Endpoint performs state-changing operations with user data
- Unsure → default to CSRF protection (more secure)

**Current Exempt Paths:**

```python
EXEMPT_PATH_PREFIXES = [
    "/api/register/",           # Public: Registration
    "/api/token/",              # Public: Login
    "/api/csrf/",               # Infrastructure: Token generation
    "/api/logout/",             # Public: Logout
    "/api/verify-email/",       # Public: Email verification
    "/api/resend-verification/", # Public: Resend verification
]
```

**Upcoming Work (OAuth Headless Migration):**
When implementing OAuth social logins (tasks-incidental-oauth-headless-migration.md):

```python
EXEMPT_PATH_PREFIXES = [
    # ... existing paths
    "/_allauth/browser/v1/",     # OAuth: Headless API (state parameter validates)
]
```

**Refactoring Considerations:**

- Prefix matching is powerful but risky (broad prefixes exempt too much)
- URL changes must update this list (tests verify behavior)
- Run CSRF test suite after URL structure changes

---

### Test Coverage Summary

**Existing Tests (9 passing):**

1. GET requests exempt from CSRF
2. Login endpoint exempt
3. Register endpoint exempt
4. CSRF blocks PATCH without token
5. CSRF rejects invalid token
6. CSRF accepts valid token
7. CSRF token endpoint generates valid token
8. Token from endpoint works for requests
9. Unauthenticated requests fail with 401 (not 403)

**New Tests (Task 5.5.6.5):**

1. `test_csrf_enforced_before_jwt_validation` - Middleware ordering
2. `test_csrf_token_valid_for_multiple_requests` - Token lifecycle
3. `test_refresh_endpoint_requires_csrf` - Option A verification

**Total:** 12 tests covering core flows + edge cases

---

## CSRF Implementation Summary

**Status:** ✅ Complete and tested (2025-10-10)

**Key Decisions:**

- Custom middleware (workaround for Django Ninja bug #1464)
- Path-based exemptions (simple, reliable for this project)
- Refresh endpoint requires CSRF (Option A - security over convenience)
- JWT cookie detection (not `request.user` - endpoint-level auth)

**Frontend Requirements:**

- Fetch token from `/api/csrf/`
- Send `X-CSRFToken` header on mutations
- Retry once on 403 CSRF errors
- OAuth callbacks will be exempt (state parameter validates)

**Next Steps:**

- Task 6: Authentication logging (failed logins, token reuse)
- Task 7: Environment-aware configuration
- OAuth Headless Migration: Add social login with CSRF exemptions

**Documentation:**

- Frontend integration guide (this section)
- Path maintenance guide (for future endpoints)
- Edge case documentation (tested behaviors)
- OAuth-specific CSRF patterns (for upcoming work)

---

## Security Settings Priority

**Context**: Initial planning phase (2025-10-08) established priority order for security improvements based on risk assessment.

**Immediate (Production Blockers)**:

1. SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE
2. Security headers (HSTS, X-Frame-Options)
3. JWT_COOKIE_SAMESITE fix
4. Rate limiting

**High Priority**:
5. CSRF middleware refinement & edge cases
6. Refresh token blacklisting
7. Authentication logging + error response standardization

**Medium Priority**:
8. Environment-aware configuration

**Status**: All items completed (Tasks 1-7 complete)

---

## Rate Limiting Implementation

### Technology Selection: Django Ninja Built-in Throttling

**Decision: Use Django Ninja built-in throttling instead of django-ratelimit**

**Rationale:**

- ✅ **Type safety**: Django Ninja has `py.typed` marker, fully type-safe (django-ratelimit has NO type annotations)
- ✅ **Zero-tolerance compliant**: Passes Pyright strict mode without suppressions
- ✅ **Native integration**: Built into Django Ninja framework (no additional package)
- ✅ **Modern & maintained**: Active development, Django 5.2 compatible
- ❌ django-ratelimit: Stale (July 2023), no type safety, requires `# type: ignore` everywhere

### Infrastructure Decision: Add Redis Now

**Context:** Backend Modernization PRD (`.arc/upcoming/sub-prds/prd-backend-modernization.md`) plans Redis/Celery for asynchronous task processing (background jobs, email notifications). This is currently paused/upcoming work.

**Current Need:** Django Ninja throttling requires Redis/Memcached for atomic operations (rate limiting state). This is a critical production security blocker (brute force vulnerability).

**Rationale for adding Redis now:**

- ✅ **Unblocks security work**: Enables Task 3 (rate limiting) immediately
- ✅ **Foundation for future**: Same Redis instance will serve as Celery broker later (different database)
- ✅ **Minimal scope**: Redis container only, no Celery yet (just throttling support)
- ✅ **Production requirement**: LocMemCache not suitable for distributed deployments
- 📊 **Strategic alignment**: Infrastructure foundation that future Backend Modernization extends

**Redis Configuration Strategy:**

- Use Redis database 0 for Django cache (throttling state)
- Reserve Redis database 1 for future Celery broker (Backend Modernization PRD Task 6.0)
- Document in docker-compose.yml and settings.py comments

**Rate Format**: `'count/period'` where period: `s`(second), `m`(minute), `h`(hour), `d`(day)

**Throttle Types:**

- `AnonRateThrottle('5/m')` - Keys on IP address (for unauthenticated requests)
- `UserRateThrottle('10/m')` - Keys on user ID (for authenticated requests)
- Automatic 429 status code when limit exceeded

**Cache Backend Requirement**: Redis or Memcached (requires atomic operations, LocMemCache NOT supported)

---

## Token Blacklisting Implementation

**Technology**: django-ninja-jwt `token_blacklist` app (DRF-free, already installed)

**Database Tables Created:**

- `token_blacklist_outstandingtoken` - Tracks all issued tokens (JTI, user, creation time, expiry)
- `token_blacklist_blacklistedtoken` - Tracks revoked tokens (foreign key to OutstandingToken, blacklisted_at timestamp)

**Configuration:**

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'ninja_jwt.token_blacklist',  # Enable blacklisting
]

SIMPLE_JWT = {
    # ... existing settings
    'ROTATE_REFRESH_TOKENS': True,  # Issue new refresh token on each refresh
    'BLACKLIST_AFTER_ROTATION': True,  # Auto-blacklist old token after rotation
}
```

**Expected Behavior:**

- Refresh token lifetime: 14 days
- Outstanding tokens accumulate during active user sessions
- Blacklisted tokens created on each refresh (old token blacklisted, new token issued)
- After 14 days, tokens expire and become eligible for cleanup
- Daily flush keeps table size manageable (≈ active users × 2-3 tokens)

---

## Error Response Standardization

**Purpose:** Consistent error responses across all authentication endpoints to simplify frontend error handling and test writing.

### Standard Format

**All Error Responses:**

```json
{
  "error": "User-facing error message"
}
```

**Development-Only Detail Field:**

```json
{
  "error": "User-facing error message",
  "detail": "Technical debugging information (only when DEBUG=True)"
}
```

## Task 3.6 – Throttling Lazy Evaluation Pattern

- Throttles now evaluate `settings.TESTING` at request time via `TestAwareAnonThrottle` / `TestAwareUserThrottle`.
- Pytest fixtures flip caches between DummyCache (fast default) and LocMemCache for throttling suites.
- Opt-in marker `@pytest.mark.enable_throttling` lets specific tests exercise real throttling while the rest of the suite stays fast.
- Pattern avoids import-time settings access and keeps production behavior unchanged.

## Task 4 – Token Blacklisting Production Checklist

- Run `python manage.py flushexpiredtokens` (Docker equivalent available) to purge expired tokens.
- Schedule a daily cron job (recommended 02:00) to keep blacklist tables from growing unbounded.
- Monitor outstanding/blacklisted token counts and WARN logs for reuse attempts; tune cadence if rows exceed ~100k.
- Current logging includes user_id, IP, and user agent; alert thresholds deferred to observability sprint.

### Error Response Catalog

**400 Bad Request:**

- Missing credentials: `{"error": "Username/email and password are required."}`
- Invalid refresh token: `{"error": "Invalid or expired refresh token: <details>"}`
- No refresh token: `{"error": "No valid refresh token found in cookies."}`
- Already verified: `{"error": "Email address is already verified."}`
- Invalid verification key: `{"error": "Invalid or expired verification link."}`

**401 Unauthorized:**

- Invalid credentials: `{"error": "Unable to authenticate with provided credentials."}`
- Token revoked (with dev detail):
    - Production: `{"error": "Token has been revoked. Please login again."}`
    - Development: `{"error": "...", "detail": "This refresh token has already been used and is no longer valid."}`

**403 Forbidden:**

- Email not verified: `{"error": "Please verify your email address before logging in. Check your email for the verification link."}`
- CSRF validation failed (with dev detail):
    - Production: `{"error": "CSRF token missing or invalid."}`
    - Development: `{"error": "...", "detail": "CSRF validation failed for <METHOD> <PATH>. Ensure X-CSRFToken header matches csrftoken cookie."}`

**409 Conflict:**

- Forbidden username: `{"error": "Username \"<name>\" is not allowed."}`
- Username exists: `{"error": "Username already associated with an existing account."}`
- Email exists: `{"error": "Email address already associated with an existing account."}`

**429 Too Many Requests:**

- Rate limit exceeded: Automatic 429 response from Django Ninja throttling (no custom message needed)

**500 Internal Server Error:**

- Email sending failed: `{"error": "Registration failed. Unable to send verification email. Please try again later or contact support.", "email_sent": false}`

### Success Response Format (Different from Errors)

**Success responses use `"message"` field (not `"error"`):**

```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": 123,
  "email": "user@example.com",
  "email_sent": true
}
```

**Rationale:** Success and error responses are semantically different; using different field names makes client-side handling clearer.

### Implementation Changes (Task 6.1)

**Files Modified:**

1. `backend/apps/authentication/middleware.py` (lines 128-137):
   - Changed CSRF error from `{"detail": "..."}` to `{"error": "..."}`
   - Added development-only `detail` field with technical context

2. `backend/apps/authentication/api.py`:
   - `verify_email()` function: Changed all error responses from `{"message": "..."}` to `{"error": "..."}`
   - `resend_verification()` function: Changed error responses from `{"message": "..."}` to `{"error": "..."}`
   - `refresh_token()` function: Made `detail` field development-only for token blacklisting errors

### Frontend Integration

**Error Detection Pattern:**

```typescript
async function handleResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    // All errors have "error" field
    throw new Error(data.error);
  }

  // Success responses have "message" field (or data fields)
  return data;
}
```

**Development vs Production:**

- In development (`DEBUG=True`): Errors include `detail` field for debugging
- In production (`DEBUG=False`): Errors only include user-facing `error` field
- Frontend should display `error` field to users, log `detail` field if present

### Benefits for Task 7.5 (Test Writing)

**Consistent error assertion pattern:**

```python
# All authentication error tests can follow this pattern
response = self.client.post('/api/endpoint/', data={...})
self.assertEqual(response.status_code, 400)
self.assertIn('error', response.json())
self.assertEqual(response.json()['error'], 'Expected error message')
```

**Simplified test maintenance:**

- Single field to check for errors (`error`)
- Predictable error structure across all endpoints
- No need to check multiple fields (`error`, `message`, `detail`)
- Clear distinction between success (`message`) and error (`error`) responses

---

## Historical Implementation Details

### Task 3.6 – Throttling Lazy Evaluation Refactoring (2025-10-13)

**Problem**: Original implementation used module-level evaluation (`_THROTTLE_* = [] if settings.TESTING else [...]`), which prevented automated testing. Research showed this violates Django best practices and requires refactoring to request-time evaluation.

**Solution**: Implemented custom throttle classes that check `settings.TESTING` at request time (not import time), enabling selective throttling in tests while maintaining fast test suite performance.

**Implementation Details:**

1. **Created test-aware throttle classes** in `apps/authentication/throttles.py`:
   - `TestAwareAnonThrottle` extending `AnonRateThrottle`
   - `TestAwareUserThrottle` extending `UserRateThrottle`
   - Both override `allow_request()` to check `settings.TESTING` at request time
   - Added request attribute check for `_test_enable_throttling` flag

2. **Updated `authentication/api.py`** to use new throttle classes:
   - Replaced `_THROTTLE_LOGIN` with `[TestAwareAnonThrottle('5/m')]`
   - Replaced `_THROTTLE_REGISTER` with `[TestAwareAnonThrottle('3/h')]`
   - Replaced `_THROTTLE_REFRESH` with `[TestAwareUserThrottle('10/m')]`
   - Removed conditional `if settings.TESTING` logic (now handled in classes)

3. **Configured test infrastructure** for selective throttling:
   - Added `conftest.py` autouse fixture for DummyCache by default
   - Registered `enable_throttling` pytest marker in `conftest.py`
   - Added fixture to switch to LocMemCache for marked tests
   - Created `clear_throttle_cache` fixture for cache cleanup

4. **Production behavior**: Verified unchanged (6th request returns 429 as expected)

5. **Test infrastructure**: Opt-in `@pytest.mark.enable_throttling` marker lets specific tests exercise real throttling while the rest of the suite stays fast

**External Research**: See external research report (2025-10-13) for Django Ninja throttling testing patterns and lazy evaluation best practices.

---

### Task 4.3.3 – Alert Threshold Deferral Decision (2025-10-10)

**Decision**: Defer automatic alert thresholds for token reuse detection to future observability sprint.

**Rationale:**

- Current WARNING logs provide full audit trail for each reuse attempt
- Alert thresholds should be designed holistically with monitoring dashboards and incident response workflows rather than as a point solution now
- Current solution provides complete forensic data (user_id, IP, user_agent) per log entry

**Current Implementation:**

- Individual logs per reuse attempt with complete forensic data
- Security team can manually review logs for patterns

**Future Implementation Plan** (Observability Sprint):

- Redis-based counter with sliding time window
- Integrated with monitoring dashboards
- Automatic alerting on threshold breach (e.g., 3+ reuse attempts from same IP in 1 hour)
- Incident response workflow integration

**Documentation**: Added comprehensive entry to `.arc/upcoming/notes/notes-future-modernization.md` with implementation guidance.

---

### Task 4.4 – Token Blacklisting Bug Fix (2025-10-10)

**Bug**: Original implementation used `set_jti()`/`set_exp()` which doesn't trigger blacklisting automatically.

**Root Cause**: Manual JTI/expiry setting bypasses django-ninja-jwt's token tracking system. The `token_blacklist` app requires tokens to be created via `RefreshToken.for_user()` to populate the `OutstandingToken` table.

**Fix**: Changed token generation to use `RefreshToken.for_user()` for new token generation and added manual `old_refresh.blacklist()` call.

**Implementation:**

```python
# Before (broken):
new_refresh = RefreshToken()
new_refresh.set_jti()
new_refresh.set_exp()
# OutstandingToken not created, blacklisting fails

# After (working):
new_refresh = RefreshToken.for_user(request.user)
old_refresh.blacklist()  # Manual blacklist call
# OutstandingToken created automatically, blacklisting works
```

**Verification**: Test script `backend/scripts/test_token_blacklist.sh` provided comprehensive operational validation covering all 5 subtasks + security logging verification.

---

### Task 7.5.2 – CSRF Test Cookie Name Bug Fix (2025-10-11)

**Bug**: All CSRF tests were using incorrect cookie name `'XSRF-TOKEN'` instead of Django's default `'csrftoken'`.

**Impact**: Tests were passing but not actually validating CSRF protection because they were checking the wrong cookie.

**Root Cause**: Angular/XSRF naming convention confusion. Django uses `csrftoken` by default, not `XSRF-TOKEN`.

**Fix**: Updated test files to use correct double-submit cookie pattern:

- Cookie: `csrftoken`
- Header: `X-CSRFToken`

**Files Modified:**

- `test_security.py`
- `test_user_api.py`

**Verification**: All 12 CSRF tests now pass with correct cookie validation.

---

### Task 7.5.9 – Pragmatic Testing Approach Decision (2025-10-14)

**Context**: After raising api.py coverage from 72% → 88%, evaluated whether to continue testing adapters.py and auth_ninja.py.

**Decision**: Stop at 88% api.py coverage. Skip additional coverage work on adapters.py (45%) and auth_ninja.py (58%).

**Rationale Based on Industry Research:**

1. **Coverage Targets Achieved**:
   - Google Testing Blog: "75% commendable, 90% exemplary" → api.py at 87.68% ✅
   - Martin Fowler: "Upper 80s or 90s" → Within target range ✅
   - Security-critical paths: 95%+ coverage (middleware 100%, throttles 100%) ✅

2. **Diminishing Returns Principle**:
   - Google: "Don't obsess about 90% → 95%" (direct quote)
   - Martin Fowler: "Be suspicious of 100% coverage" (indicates testing for metrics, not quality)
   - Industry standard: 80-90% threshold, beyond which tests get harder to write and find fewer problems

3. **Adapters.py (45%) - Thin Wrapper Justification**:
   - Wraps battle-tested libraries (requests, allauth)
   - No significant business logic (email sending is infrastructure)
   - Django REST Framework principle: "Test your own code, not framework code"
   - Proposed tests would mock external APIs = brittle, low value
   - Real bugs surface in integration tests / staging environment

4. **Auth_ninja.py (58%) - Defensive Error Handlers**:
   - JWT exception paths are defensive error handling with minimal business impact
   - django-ninja-jwt already handles JWT validation (don't test library code)
   - Uncovered lines = catch-all exception handlers for logging
   - 85 existing integration tests already validate JWT flows work correctly

5. **Testing Pyramid Compliance**:
   - Google ratio: 70% unit / 20% integration / 10% e2e
   - We have strong integration coverage (85 comprehensive tests)
   - Adding more unit tests for edge cases = inverted pyramid anti-pattern

6. **Time Investment vs. Value**:
   - 2.5 hours for adapters/auth_ninja edge cases = LOW ROI
   - Better spent on full quality gates (Task 8) = HIGH ROI (production readiness)

**Quality Metrics Summary:**

- ✅ 93 total tests (85 baseline + 8 new coverage tests)
- ✅ 100% pass rate
- ✅ 0 linting violations
- ✅ 0 type errors
- ✅ Security-critical code: 95%+ coverage
- ✅ Primary API (api.py): 87.68% coverage (exceeds industry best practice)

**References:**

- Google Testing Blog: "Code Coverage Best Practices" (2020)
- Martin Fowler: "Test Coverage" (bliki), "The Practical Test Pyramid" (2018)
- Django REST Framework: "Testing Pragmatic Approach" (2024)
- External Research Analyst comprehensive report (2025-10-14)

---

## External References

**Research Reports:**

- External Research Audit Report: 2025-10-08 comprehensive authentication audit
- External Research Report: 2025-10-13 Django Ninja throttling testing patterns and lazy evaluation (Task 3.6)
- External Research Report: 2025-10-14 pragmatic testing approach and coverage thresholds (Task 7.5.9)

**Standards & Best Practices:**

- OWASP Authentication Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- OWASP Session Management Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
- RFC 8725: JWT Best Current Practices: <https://datatracker.ietf.org/doc/html/rfc8725>
- Google Testing Blog: "Code Coverage Best Practices" (2020)
- Martin Fowler: "Test Coverage" (bliki), "The Practical Test Pyramid" (2018)

**Framework Documentation:**

- Django Security Settings: <https://docs.djangoproject.com/en/5.2/ref/settings/#security>
- Django Settings Best Practices: <https://docs.djangoproject.com/en/5.2/topics/settings/> (lazy evaluation guidance)
- Django Ninja Throttling: <https://django-ninja.dev/guides/throttling/>
- django-ninja-jwt Token Blacklist: <https://eadwincode.github.io/django-ninja-jwt/blacklist_app/>
- django-ninja-jwt GitHub: <https://github.com/eadwinCode/django-ninja-jwt>
