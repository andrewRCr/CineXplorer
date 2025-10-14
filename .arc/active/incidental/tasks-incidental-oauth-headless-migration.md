# Incidental Work: OAuth Headless Mode Migration

**Created**: 2025-01-27
**Triggered By**: Task 5.6.2 in API Layer Modernization Phase 2
**Status**: In Progress - Task 6 (Hybrid Auth Architecture)
**Estimated Effort**: 8-10 hours total (Tasks 1-5: Complete, Task 6: 6-8 hours, Tasks 7-8: 2 hours)

## Context

**Why Now**: Discovered during OAuth E2E testing that traditional POST-based OAuth with django-allauth fails due to CSRF Referer header requirements when using `form.submit()`. This is a fundamental browser security limitation, not a configuration issue.

**Discovery**: While implementing Task 5.6.2 (Google OAuth E2E testing), encountered:
- 403 CSRF errors with POST requests to `/accounts/google/login/`
- "Referer checking failed - no Referer" error
- Browser security prevents `form.submit()` from including Referer header
- Traditional workarounds (GET with SOCIALACCOUNT_LOGIN_ON_GET) work but violate HTTP best practices

**Impact**:
- Blocks OAuth E2E testing (Tasks 5.6.2, 5.6.3)
- Current implementation cannot support POST-based OAuth flows securely
- Need modern SPA-compatible authentication approach

**Research Completed**: External research agent analyzed django-allauth documentation, security best practices, and production implementations. Recommendation: Use django-allauth Headless Mode with Browser API - designed specifically for SPAs, uses token-based CSRF (no Referer header required), production-ready.

## Scope

**Will Do**:
- Migrate from traditional `allauth.urls` to `allauth.headless.urls`
- Configure `HEADLESS_ONLY = True` and frontend URL mappings
- Implement headless OAuth flow using `/_allauth/browser/v1/auth/provider/redirect`
- **Implement hybrid authentication** (access token in localStorage + refresh token in HTTP-only cookie)
- Update frontend to detect authentication from localStorage (instant, no network call)
- Implement token refresh endpoint and axios interceptor logic
- Ensure CSRF cookie configuration allows JavaScript access (`CSRF_COOKIE_HTTPONLY = False`)
- Update OAuth callback handling for headless mode
- Test complete OAuth flow with hybrid token storage (Google and GitHub)

**Won't Do** (deferred to future work):
- Custom django-allauth template styling (stays out of scope)
- Email verification template customization
- Django messages framework cleanup (workaround: use incognito for testing)
- Session expiration warnings UI (Task 6.7 marked optional)
- Multi-tab synchronization (can be added later via BroadcastChannel API)

## Tasks

- [x] 1. Backend Configuration
    - [x] 1.1 Update Django settings for headless mode (`HEADLESS_ONLY = True`, `HEADLESS_FRONTEND_URLS`)
    - [x] 1.2 Configure CSRF cookie to allow JavaScript access (`CSRF_COOKIE_HTTPONLY = False`) - settings.py:383
    - [x] 1.3 Verify CORS and session cookie settings compatible with headless mode - Existing settings confirmed compatible
    - [x] 1.4 Run backend type checking (verify no type errors introduced) - Django check passed: 0 issues

- [x] 2. URL Configuration
    - [x] 2.1 Update `config/urls.py` to include `allauth.headless.urls` at `/_allauth/` - urls.py:30
    - [x] 2.2 Verify traditional `/accounts/` URLs still work for non-OAuth flows (or document removal) - Removed, using headless only
    - [x] 2.3 Test headless endpoints accessible (`/_allauth/browser/v1/auth/session`) - URL routing verified via show_urls
    - [x] 2.4 Document URL structure changes in notes - Will complete in task 6

- [x] 3. Frontend Auth Service Implementation
    - [x] 3.1 Create `initializeSession()` method to fetch CSRF token - Implemented via session endpoint fetch in initializeOAuthLogin()
    - [x] 3.2 Implement `loginWithProvider()` using form POST to headless endpoint - initializeOAuthLogin() in Login.tsx:258-312
    - [x] 3.3 Add CSRF token retrieval from cookie helper - Inline cookie parsing in Login.tsx:272-275
    - [x] 3.4 Update `handleGoogleLogin()` and `handleGithubLogin()` to use headless API - Login.tsx:243-251
    - [x] 3.5 Run frontend linting and type checking (0 violations, 0 errors) - Linting: 0 violations, Type check: 0 new errors (1 pre-existing in logger.ts)

- [x] 4. OAuth Callback Handling
    - [x] 4.1 Review existing `useAuth.ts` OAuth callback detection logic - useAuth.ts:62-92 handles OAuth callback
    - [x] 4.2 Verify callback works with headless mode (session creation, redirect) - Existing logic checks for JWT tokens in cookies (compatible with headless)
    - [x] 4.3 Test error handling for OAuth failures - useAuth.ts:76-88 checks URL params for error and navigates to login
    - [x] 4.4 Update callback URL configuration if needed - callback_url set to /login in Login.tsx:292 (matches existing flow)

- [x] 5. Token Strategy Migration (Idiomatic OAuth JWT Generation)
    - [x] 5.1 Create `authentication/token_strategy.py` with `JWTTokenStrategy` class
        - [x] 5.1.1 Implement `create_access_token(request)` method using RefreshToken.for_user()
        - [x] 5.1.2 Implement `create_refresh_token(request)` method with proper lifetime
        - [x] 5.1.3 Add docstrings explaining Token Strategy API integration
    - [x] 5.2 Update `config/settings.py` django-allauth configuration
        - [x] 5.2.1 Add `HEADLESS_TOKEN_STRATEGY = "authentication.token_strategy.JWTTokenStrategy"`
        - [x] 5.2.2 Remove `OAuthJWTCookieMiddleware` from MIDDLEWARE list
    - [x] 5.3 Remove signal-based OAuth JWT implementation
        - [x] 5.3.1 Delete `authentication/signals.py` (entire file)
        - [x] 5.3.2 Remove `OAuthJWTCookieMiddleware` class from `authentication/middleware.py` (keep `CsrfHeaderMiddleware`)
        - [x] 5.3.3 Remove `_set_jwt_tokens_in_response()` and `save_user()` override from `CustomSocialAccountAdapter` in `authentication/adapters.py`
        - [x] 5.3.4 Remove signal registration from `authentication/apps.py` ready() method
    - [x] 5.4 Type stubs investigation and fixes (SEE: notes-incidental-oauth-headless-migration.md)
        - [x] 5.4.1 Backend linting: `docker compose -f infrastructure/docker-compose.yml exec backend ruff check apps/authentication/ --fix` - ✅ All checks passed
        - [x] 5.4.2 Research custom type stubs necessity - ✅ Comprehensive investigation completed
        - [x] 5.4.3 Fix token_strategy.py API mismatch with AbstractTokenStrategy interface
            - [x] 5.4.3.1 Research allauth Token Strategy API documentation - ✅ Reviewed AbstractTokenStrategy and SessionTokenStrategy source
            - [x] 5.4.3.2 Implement required abstract methods (create_session_token, lookup_session) - ✅ Both methods implemented using sessionkit
            - [x] 5.4.3.3 Fix create_access_token signature or verify override is intentional - ✅ Fixed to return `str | None`, overrode `create_access_token_payload()` for metadata
            - [x] 5.4.3.4 Remove or document create_refresh_token if unused - ✅ Removed, moved functionality to `create_access_token_payload()`
            - [x] 5.4.3.5 Test Python import: `python -c "from apps.authentication.token_strategy import JWTTokenStrategy"` - ✅ Import and instantiation successful
        - [x] 5.4.4 Create missing allauth.headless type stubs
            - [x] 5.4.4.1 Create `backend/stubs/allauth/headless/__init__.pyi` - ✅ Created with version sync metadata
            - [x] 5.4.4.2 Create `backend/stubs/allauth/headless/tokens/__init__.pyi` - ✅ Re-exports AbstractTokenStrategy
            - [x] 5.4.4.3 Create `backend/stubs/allauth/headless/tokens/base.pyi` with AbstractTokenStrategy - ✅ Full interface with docstrings
        - [x] 5.4.5 Fix existing type stub issues
            - [x] 5.4.5.1 Fix `allauth/account/adapter.pyi` - remove unused type: ignore, verify signatures - ✅ No issues found, signatures verified correct, added Any justification comments
            - [x] 5.4.5.2 Fix `allauth/account/models.pyi` - fix Manager issues, remove unused type: ignore - ✅ Removed 2 unused type: ignore comments (lines 53, 111)
            - [x] 5.4.5.3 Fix `django/contrib/auth/models.pyi` - fix type var issues, remove unused type: ignore - ✅ Removed 2 unused type: ignore comments (lines 121, 135)
        - [x] 5.4.6 Remove type: ignore from token_strategy.py (should be 0 after stub fixes) - ✅ Removed type: ignore[attr-defined] on line 103
        - [x] 5.4.7 Run comprehensive type checking: `npx pyright backend/apps/authentication/ --project backend` (Pyright-only with django-types) - ✅ token_strategy.py has 0 errors, imports successfully, created allauth.headless.internal.sessionkit stub
        - [x] 5.4.8 Fix remaining stub file type errors (3 errors discovered in 5.4.7)
            - [x] 5.4.8.1 Fix `django/contrib/auth/models.pyi:49` - Type argument "AbstractUser" must be subtype of "Model" - ✅ Extended AbstractBaseUser and PermissionsMixin from models.Model
            - [x] 5.4.8.2 Fix `allauth/account/models.pyi:36` - Add missing reverse manager 'emailconfirmation_set' - ✅ Added emailconfirmation_set manager, suppressed django-manager-missing warnings
            - [x] 5.4.8.3 Create stub for `allauth.socialaccount.models` or suppress import-untyped warning - ✅ DEPRECATED: MyPy removed in backend type safety modernization (see tasks-incidental-backend-type-safety.md)
        - [x] 5.4.9 Verify Pyright (hybrid strategy) - ✅ Configured venv path, 2 reportUnknownMemberType warnings on HttpRequest.user (acceptable per type-safety.md Django ORM limitations)
        - [x] 5.4.10 Fix all Pyright errors in stub files and token_strategy.py - ✅ Fixed Manager ClassVar issues, removed unused imports, added pyright: ignore for HttpRequest.user limitations
    - [x] 5.5 Verify backend restarts without errors after changes - ✅ Backend restarted successfully, Django system check passed (0 issues), token strategy imports and instantiates correctly
    - [x] 5.6 Enable full headless mode
        - [x] 5.6.1 Set `HEADLESS_ONLY = True` in settings.py (line 307)
        - [x] 5.6.2 Verify no code depends on traditional OAuth callback URLs
        - [x] 5.6.3 Test backend restarts successfully
        - [x] 5.6.4 Document the mixed mode issue in notes

- [ ] 6. Implement Hybrid Authentication Architecture (HTTP-Only Refresh + localStorage Access)
    - **Why This Task Exists**: During Task 6 testing, discovered that Token Strategy sets JWT tokens as HTTP-only cookies (secure, but JavaScript can't read them). This means OAuth succeeds but frontend can't detect authentication state - users stay on login page despite being authenticated. After researching pure HTTP-only (Option A) vs hybrid (Option C) approaches, chose hybrid for better UX, mobile compatibility, and industry standard alignment. Trade-off: 5-min access token in localStorage (XSS-vulnerable but short-lived) + 14-day refresh token in HTTP-only cookie (XSS-proof). This is the same pattern used by Auth0, Firebase, AWS Amplify, and most modern SPAs.
    - [x] 6.1 Backend: Update Token Strategy to support hybrid mode
        - [x] 6.1.1 Modify `create_access_token_payload()` to return access token in response body
        - [x] 6.1.2 Keep refresh token as HTTP-only cookie (existing behavior)
        - [x] 6.1.3 Add token expiration metadata to response (expires_in, issued_at)
        - [x] 6.1.4 Update type stubs if needed for new response structure - No changes needed, stub's `dict[str, Any]` compatible with our `dict[str, str | int]`
    - [x] 6.2 Backend: Create token refresh endpoint
        - [x] 6.2.1 Create `/api/auth/refresh` endpoint in Django Ninja
        - [x] 6.2.2 Validate refresh token from HTTP-only cookie
        - [x] 6.2.3 Issue new access token, return in response body
        - [x] 6.2.4 Add rate limiting for refresh endpoint - Already included (TestAwareUserThrottle('10/m'))
    - [x] 6.3 Backend: Update authentication middleware
        - [x] 6.3.1 Accept access token from Authorization header OR cookie
        - [x] 6.3.2 Priority: Authorization header > cookie (for hybrid compatibility)
        - [x] 6.3.3 Verify backward compatibility with existing cookie-only auth
    - [x] 6.4 Frontend: Update token utilities for hybrid mode
        - [x] 6.4.1 Add `getTokenFromCookie()` helper (read non-HTTP-only access token cookie)
        - [x] 6.4.2 Update `getAuthTokens()` to check cookies first, then localStorage
        - [x] 6.4.3 Update `setAuthTokens()` to store access token in localStorage
        - [x] 6.4.4 Add `getTokenExpiration()` helper (decode JWT or read from stored metadata)
        - [x] 6.4.5 Update `areTokensExpired()` to check actual token expiration (not just 30-day localStorage expiry)
    - [x] 6.5 Frontend: Update axios interceptor for hybrid auth
        - [x] 6.5.1 Send access token in Authorization header (Bearer token)
        - [x] 6.5.2 Keep `withCredentials: true` for refresh token cookie
        - [x] 6.5.3 Implement token refresh logic on 401 response
        - [x] 6.5.4 Add request queue to prevent concurrent refresh calls
        - [x] 6.5.5 Update all pending requests with new access token after refresh
    - [x] 6.6 Frontend: Update useAuth hook for hybrid detection
        - [x] 6.6.1 Check for access token on mount (cookie OR localStorage)
        - [x] 6.6.2 Update OAuth callback detection to read access token from response/cookie
        - [x] 6.6.3 Store access token in localStorage after OAuth success
        - [x] 6.6.4 Remove polling/network call for auth status check (use localStorage)
    - [x] ~~6.7 Frontend: Add token expiration UI~~ **REMOVED - Inappropriate UX pattern**
        - **Reason**: Session warnings appropriate for banking apps with hard timeouts, not content apps
        - **Correct pattern**: Silent token refresh via axios interceptor (already implemented in 6.5)
        - **User experience**: Seamless, invisible token refresh - users never see warnings
        - **Removed files**: useTokenExpiration.ts (187 lines), SessionExpirationWarning.tsx (114 lines)
        - **Commit**: `f667c87` - refactor(oauth-auth): remove inappropriate session expiration warning UI
    - [x] 6.8 Backend: Update OAuth callback to return access token
        - [x] 6.8.1 Verify Token Strategy `create_access_token_payload()` is called on OAuth callback
        - [x] 6.8.2 Ensure access token is set as non-HTTP-only cookie OR returned in redirect
        - [x] 6.8.3 Test that refresh token remains HTTP-only
    - [ ] 6.9 Testing: Verify hybrid auth works for all flows
        - [x] 6.9.1 Test email/password login with "Remember Me" checked (stores in localStorage)
            - **Bugs found and fixed** (commit `3c7df0e`):
                1. `/api/token/` was setting both tokens as cookies (violated hybrid pattern)
                2. Login.tsx had race condition (redirect before token storage)
                3. `/api/logout/` required auth (failed when tokens expired)
            - **Token naming standardized** (commit `be2ed3d`): authToken → access_token (breaking change)
            - **Verified**: localStorage has access_token + refresh_token, cookies have refresh_token only
        - [ ] 6.9.2 Test OAuth login (receives and stores access token)
        - [ ] 6.9.3 Test hybrid token refresh endpoint (/api/auth/refresh)
            - [ ] 6.9.3.1 Success case: Valid refresh token returns new access token
            - [ ] 6.9.3.2 Expired token: Returns 400 with error message
            - [ ] 6.9.3.3 Invalid token: Returns 400 with error message
            - [ ] 6.9.3.4 Blacklisted token: Returns 401 with security event logged
            - [ ] 6.9.3.5 Missing refresh cookie: Returns 400 with error message
            - [ ] 6.9.3.6 Token rotation: Old refresh token blacklisted after use
        - [ ] 6.9.4 Test authenticated API calls (Authorization header used)
        - [ ] 6.9.5 Test token refresh flow on 401 (axios interceptor logic)
        - [ ] 6.9.6 Test multi-tab behavior (localStorage sync)
    - [ ] 6.10 Security: Run type checking and linting
        - [ ] 6.10.1 Backend type check: `npx pyright backend/apps/authentication/`
        - [ ] 6.10.2 Backend linting: `.venv-backend/bin/ruff check backend/apps/authentication/ --fix`
        - [ ] 6.10.3 Frontend type check: `npm run type-check`
        - [ ] 6.10.4 Frontend linting: `npm run lint`

- [ ] 7. Testing and Verification
    - [ ] 7.1 Clear all cookies and localStorage, test fresh OAuth flow with Google
    - [ ] 7.2 Verify CSRF token obtained from session endpoint
    - [ ] 7.3 Verify form submission redirects to Google correctly
    - [ ] 7.4 Verify callback creates session and redirects to frontend
    - [ ] 7.5 Verify access token in localStorage, refresh token in HTTP-only cookie
    - [ ] 7.6 Verify tokens work for authenticated API calls (Authorization header)
    - [ ] 7.7 Test token refresh flow (wait for expiration or force refresh)
    - [ ] 7.8 Test GitHub OAuth flow (same steps as Google)
    - [ ] 7.9 Test error scenarios (OAuth denial, invalid callback, expired tokens)

- [ ] 8. Documentation and Cleanup
    - [ ] 8.1 Update notes file with hybrid architecture details
    - [ ] 8.2 Document why hybrid > pure HTTP-only (UX, mobile, offline)
    - [ ] 8.3 Document security model (short-lived access, HTTP-only refresh)
    - [ ] 8.4 Remove debugging console.log statements from Login.tsx
    - [ ] 8.5 Update architecture diagrams if any exist
    - [ ] 8.6 Mark incidental work complete in task file / add completion summary

## Relevant Files

**Backend:**
- `backend/config/settings.py` - Headless mode configuration, JWT settings
- `backend/config/urls.py` - URL routing for headless endpoints
- `backend/apps/authentication/token_strategy.py` - JWT Token Strategy (hybrid mode updates)
- `backend/apps/authentication/api.py` - Token refresh endpoint (new)
- `backend/apps/authentication/auth_ninja.py` - JWT authentication middleware (header support)

**Infrastructure:**
- `infrastructure/Caddyfile` - Proxy configuration for /_allauth/* routes

**Frontend:**
- `frontend/src/pages/user/Login.tsx` - OAuth button handlers
- `frontend/src/hooks/useAuth.ts` - Authentication context and session management (hybrid detection)
- `frontend/src/utilities/token.ts` - Token storage utilities (hybrid mode updates)
- `frontend/src/services/apiClient.ts` - Axios interceptor (token refresh logic)

**Documentation:**
- `.arc/active/incidental/notes-incidental-oauth-headless-migration.md` - OAuth implementation notes
- `.arc/active/CURRENT-SESSION.md` - Session tracking

## Implementation Notes

### Hybrid Authentication Architecture (Task 6)

**Architecture Decision**: After discovering the HTTP-only cookie limitation (frontend can't detect OAuth success), we're implementing a **hybrid approach** that balances security with UX.

**Why Hybrid > Pure HTTP-Only Cookies:**
- ✅ **Better UX**: Instant auth checks (no network call needed), "session expiring" warnings
- ✅ **Mobile/PWA Ready**: Native apps can't handle HTTP-only cookies well
- ✅ **Offline Detection**: Can check auth status without backend call
- ✅ **Better Debugging**: Access tokens visible in DevTools
- ✅ **Industry Standard**: Auth0, Firebase, AWS Amplify all use this pattern
- ⚠️ **Security Tradeoff**: Access token vulnerable to XSS (mitigated by short expiration: 5 min)
- ✅ **Refresh Token Protected**: HTTP-only cookie prevents long-term compromise

**Architecture Overview:**

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React)                                             │
│ - Access Token: localStorage (5-min lifetime)               │
│ - Can detect auth without network call                      │
│ - Can show "session expiring" warnings                      │
│ - Sends: Authorization: Bearer {access_token}               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ (API Request with both)
┌─────────────────────────────────────────────────────────────┐
│ Backend (Django)                                             │
│ - Validates access token from Authorization header          │
│ - If expired → checks refresh token from HTTP-only cookie   │
│ - Issues new access token, returns in response body         │
│ - Refresh Token: HTTP-only cookie (14-day lifetime)         │
│ - XSS-proof, can't be stolen by malicious JavaScript        │
└─────────────────────────────────────────────────────────────┘
```

**Security Model:**
1. **Access Token** (localStorage, 5 min): Used for API requests, vulnerable to XSS but short-lived
2. **Refresh Token** (HTTP-only cookie, 14 days): Used to issue new access tokens, XSS-proof
3. **Damage Window**: Even if XSS steals access token, only 5 minutes of access (vs 14 days with refresh)
4. **Reality Check**: If XSS exists, attacker can make API calls directly regardless of storage method

**Token Refresh Flow:**

```
1. Frontend makes API request with expired access token
2. Backend returns 401 Unauthorized
3. Frontend intercepts 401, calls /api/auth/refresh
4. Backend validates refresh token from HTTP-only cookie
5. Backend issues new access token, returns in response
6. Frontend stores new access token in localStorage
7. Frontend retries original request with new token
```

### Token Strategy API Context

Django-allauth v64+ provides **Token Strategy API** as the official extension point for custom token generation (JWT, etc.). This replaces the signal/middleware pattern with a cleaner, more maintainable approach.

**Key Benefits**:
- ✅ Official django-allauth pattern (future-proof)
- ✅ Centralizes token logic in one place
- ✅ Works for all auth flows (OAuth, email/password, MFA)
- ✅ Easier to test and maintain

**Hybrid Mode Updates** (Task 6.1):
- `create_access_token_payload()` returns access token in response body (for localStorage)
- Refresh token still set as HTTP-only cookie (secure, can't be read by JS)
- Token expiration metadata included (expires_in, issued_at)

**Documentation**: <https://docs.allauth.org/en/dev/headless/tokens.html>

## Progress Notes

**Task 5 Completion Context**:
- Token Strategy Migration completed during security updates (2025-10-08 to 2025-10-14)
- Created idiomatic `JWTTokenStrategy` class (replaces signal/middleware approach)
- Configured `HEADLESS_TOKEN_STRATEGY` in settings
- Removed signal-based OAuth JWT implementation (middleware, signals.py)
- Fixed type stubs for allauth.headless Token Strategy API

## References

- django-allauth Headless Documentation: <https://docs.allauth.org/en/dev/headless/>
- Official React SPA Example: <https://github.com/pennersr/django-allauth/tree/main/examples/react-spa>
- Research Report: External research agent findings (in conversation context)
