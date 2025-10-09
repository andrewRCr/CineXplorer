# Incidental Work: Authentication Security Updates

**Created**: 2025-10-08
**Triggered By**: External research audit during OAuth headless migration (tasks-incidental-oauth-headless-migration.md)
**Status**: PAUSED (backend type safety modernization in progress - Task 3 completed)
**Estimated Effort**: 6-8 hours

## Context

**Why Now**: External research audit revealed critical production security gaps and non-idiomatic patterns in authentication layer. These must be addressed before OAuth migration completion and before any production deployment.

**Discovery**: During OAuth headless migration audit, comprehensive security analysis identified:
- ❌ **Critical**: Missing security settings (SESSION_COOKIE_SECURE, HSTS, security headers)
- ❌ **Critical**: Incorrect SameSite cookie configuration (unnecessarily permissive)
- ❌ **High Risk**: No rate limiting on authentication endpoints (brute force vulnerability)
- ⚠️ **Security Gap**: Missing refresh token blacklisting (stolen token reuse possible)
- ⚠️ **Non-idiomatic**: Custom CSRF middleware adds unnecessary complexity
- 📊 **Overall**: 65% production-ready (B+ grade) - solid foundation with critical gaps

**Impact**:
- Blocks production deployment (security vulnerabilities present)
- Brute force attacks possible on login endpoints
- Session hijacking risk over HTTP (development only, but needs config)
- CSRF attack surface unnecessarily expanded
- Improving security posture from B+ to A+ grade

**Audit Report**: External research analyst comprehensive authentication audit (2025-10-08)

## Scope

**Will Do**:
- Add all critical security settings (SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE, security headers)
- Fix SameSite cookie configuration (JWT_COOKIE_SAMESITE: "None" → "Lax")
- Implement rate limiting on authentication endpoints (login, register, refresh) using Django Ninja built-in throttling
- Add refresh token blacklisting with django-ninja-jwt (DRF-free, already installed)
- Reduce refresh token lifetime (30 days → 14 days per RFC 8725)
- Remove custom CSRF middleware (simplify to Django's built-in)
- Add comprehensive authentication event logging
- Update settings for environment-aware configuration (dev vs production)
- Run full quality gates after all changes

**Won't Do** (deferred to future work):
- Content Security Policy (CSP) implementation (complex, requires asset audit)
- Multi-factor authentication (MFA) - separate feature PRD
- Monitoring dashboards for failed logins (observability sprint)
- OAuth state parameter validation testing (covered in OAuth incidental task)
- Token rotation for access tokens (only refresh tokens per best practices)

## Tasks

- [x] 1. Critical Security Settings (Production Blockers)
    - [x] 1.1 Add cookie security settings to `config/settings.py`
        - [x] 1.1.1 Add `SESSION_COOKIE_SECURE = not DEBUG` (HTTPS enforcement)
        - [x] 1.1.2 Add `CSRF_COOKIE_SECURE = not DEBUG` (HTTPS enforcement)
        - [x] 1.1.3 Add `SESSION_COOKIE_HTTPONLY = True` (XSS protection)
        - [x] 1.1.4 Add `SESSION_COOKIE_SAMESITE = 'Lax'` (CSRF protection)
    - [x] 1.2 Add HSTS and SSL security headers
        - [x] 1.2.1 Add production-only HSTS settings (SECURE_HSTS_SECONDS, INCLUDE_SUBDOMAINS, PRELOAD)
        - [x] 1.2.2 Add `SECURE_SSL_REDIRECT = True` for production
        - [x] 1.2.3 Add `SECURE_PROXY_SSL_HEADER` for Caddy proxy compatibility
    - [x] 1.3 Add additional security headers
        - [x] 1.3.1 Set `X_FRAME_OPTIONS = 'DENY'` (clickjacking protection)
        - [x] 1.3.2 Set `SECURE_CONTENT_TYPE_NOSNIFF = True` (MIME sniffing protection)
        - [x] 1.3.3 Set `SECURE_BROWSER_XSS_FILTER = True` (legacy XSS protection)
    - [x] 1.4 Run incremental quality checks
        - [x] 1.4.1 Backend linting: `docker compose -f infrastructure/docker-compose.yml exec backend ruff check config/ --fix`
        - [x] 1.4.2 Verify Django check passes: `docker compose -f infrastructure/docker-compose.yml exec backend python manage.py check`
    - [x] 1.5 Verify backend restarts without errors

- [x] 2. JWT Cookie Configuration Fix
    - [x] 2.1 Update `SIMPLE_JWT` configuration in `config/settings.py`
        - [x] 2.1.1 Change `JWT_COOKIE_SAMESITE` from "None" to "Lax" (same-origin security)
        - [x] 2.1.2 Reduce `REFRESH_TOKEN_LIFETIME` from 30 days to 14 days (per RFC 8725)
        - [x] 2.1.3 Add comments explaining SameSite="Lax" rationale (same-origin via Caddy)
    - [x] 2.2 Test JWT cookie behavior in development
        - [x] 2.2.1 Login via `/api/token/` and verify cookies set with SameSite=Lax
        - [x] 2.2.2 Make authenticated request to `/api/profile/` and verify cookies sent
        - [x] 2.2.3 Verify no browser console warnings about SameSite cookies

- [x] 3. Rate Limiting Implementation (Django Ninja Built-in + Redis Infrastructure)
    - [x] 3.1 Add Redis infrastructure for throttling
        - [x] 3.1.1 Add Redis service to `infrastructure/docker-compose.yml`
        - [x] 3.1.2 Install redis Python client in `backend/requirements/req.txt`
        - [x] 3.1.3 Configure CACHES setting in `config/settings.py` to use Redis backend
        - [x] 3.1.4 Add comments documenting Redis serves throttling now, will serve Celery broker in future (Backend Modernization PRD)
        - [x] 3.1.5 Start Redis container and verify connectivity
    - [x] 3.2 Verify Django Ninja throttling is available (already installed)
        - [x] 3.2.1 Confirm Django Ninja includes throttling module (verified earlier)
        - [x] 3.2.2 Verify cache backend supports atomic operations (Redis configured in 3.1)
    - [x] 3.3 Apply throttling to authentication endpoints
        - [x] 3.3.1 Add `throttle=[AnonRateThrottle('5/m')]` to login endpoint (5 attempts/minute)
        - [x] 3.3.2 Add `throttle=[AnonRateThrottle('3/h')]` to register endpoint (3 attempts/hour)
        - [x] 3.3.3 Add `throttle=[UserRateThrottle('10/m')]` to refresh endpoint (10 attempts/minute)
        - [x] 3.3.4 Import throttling classes from `ninja.throttling`
    - [x] 3.4 Test throttling behavior
        - [x] 3.4.1 Make 6 rapid login attempts and verify 429 error on 6th attempt
        - [x] 3.4.2 Verified throttling resets after clearing cache
        - [x] 3.4.3 Confirmed rate limiting working (attempts 1-5 allowed, 6+ throttled with HTTP 429)
    - [x] 3.5 Run incremental quality checks
        - [x] 3.5.1 Backend linting: `.venv-backend/bin/ruff check backend/apps/authentication/api.py --fix` - Passed (fixed line length)
        - [x] 3.5.2 Type checking: `npx pyright backend/apps/authentication/api.py --project backend` - Throttling imports type-safe (pre-existing Django ORM errors unrelated to our changes)
        - [x] 3.5.3 Verified Django Ninja throttling has py.typed marker - fully type-safe

- [ ] 4. Refresh Token Blacklisting (Token Rotation Security - django-ninja-jwt)
    - [ ] 4.1 Enable ninja-jwt token blacklist app (already installed with ninja-jwt)
        - [ ] 4.1.1 Add `ninja_jwt.token_blacklist` to INSTALLED_APPS
        - [ ] 4.1.2 Configure settings: `ROTATE_REFRESH_TOKENS = True`, `BLACKLIST_AFTER_ROTATION = True`
        - [ ] 4.1.3 Run migrations: `docker compose exec backend python manage.py migrate`
        - [ ] 4.1.4 Verify migrations applied: Check for `token_blacklist_outstandingtoken` and `token_blacklist_blacklistedtoken` tables
    - [ ] 4.2 Update `refresh_token()` endpoint in `authentication/api.py`
        - [ ] 4.2.1 Import blacklist: `from ninja_jwt.tokens import RefreshToken` (already imported, verify blacklist method available)
        - [ ] 4.2.2 Add `old_token.blacklist()` call before generating new token (or rely on BLACKLIST_AFTER_ROTATION auto-blacklist)
        - [ ] 4.2.3 Add try/except for blacklist errors (token already blacklisted, expired, invalid)
        - [ ] 4.2.4 Return appropriate error for blacklisted tokens (401 Unauthorized)
    - [ ] 4.3 Add token reuse detection logging
        - [ ] 4.3.1 Log when blacklisted token is reused (security event)
        - [ ] 4.3.2 Include IP address and user agent in log entry
        - [ ] 4.3.3 Consider adding alert threshold (multiple reuse attempts = attack)
    - [ ] 4.4 Test token blacklisting behavior
        - [ ] 4.4.1 Login and obtain refresh token
        - [ ] 4.4.2 Use refresh token to get new access token (should succeed)
        - [ ] 4.4.3 Attempt to reuse old refresh token (should fail with 401)
        - [ ] 4.4.4 Verify blacklist entry created in `token_blacklist_blacklistedtoken` table
        - [ ] 4.4.5 Verify outstanding token tracked in `token_blacklist_outstandingtoken` table
    - [ ] 4.5 Set up token cleanup (maintenance)
        - [ ] 4.5.1 Document `flushexpiredtokens` management command for periodic cleanup
        - [ ] 4.5.2 Add note to set up daily cron job in production
    - [ ] 4.6 Run incremental quality checks
        - [ ] 4.6.1 Backend tests: `docker compose exec backend python manage.py test authentication.tests --keepdb`
        - [ ] 4.6.2 Type checking: `npx pyright backend/apps/authentication/api.py --project backend`
        - [ ] 4.6.3 Verify ninja-jwt type stubs provide blacklist type coverage (py.typed marker confirmed)

- [ ] 5. Custom CSRF Middleware Removal (Simplification)
    - [ ] 5.1 Remove custom middleware from `MIDDLEWARE` in `config/settings.py`
        - [ ] 5.1.1 Remove line: `"authentication.middleware.CsrfHeaderMiddleware"`
        - [ ] 5.1.2 Keep only Django's built-in: `"django.middleware.csrf.CsrfViewMiddleware"`
        - [ ] 5.1.3 Add comment explaining Django's CSRF handles our use case
    - [ ] 5.2 Update `authentication/middleware.py`
        - [ ] 5.2.1 Remove `CsrfHeaderMiddleware` class (lines 17-60)
        - [ ] 5.2.2 Remove `EXEMPT_PATH_PREFIXES` constant (line 14)
        - [ ] 5.2.3 Keep file for any other middleware (currently none needed)
    - [ ] 5.3 Verify CSRF protection still works
        - [ ] 5.3.1 Test `/api/profile/` PATCH without CSRF token (should fail with 403)
        - [ ] 5.3.2 Test `/api/profile/` PATCH with CSRF token (should succeed)
        - [ ] 5.3.3 Test `/api/token/` POST without CSRF token (should succeed - auth=None)
        - [ ] 5.3.4 Verify Django Ninja automatically handles CSRF for `auth=None` endpoints
    - [ ] 5.4 Run incremental quality checks
        - [ ] 5.4.1 Backend linting: `docker compose exec backend ruff check apps/authentication/middleware.py --fix`
        - [ ] 5.4.2 Django check: `docker compose exec backend python manage.py check`

- [ ] 6. Authentication Event Logging
    - [ ] 6.1 Add logging to `authentication/api.py`
        - [ ] 6.1.1 Import logger: `import logging; logger = logging.getLogger('cinexplorer.auth')`
        - [ ] 6.1.2 Log failed login attempts with IP, username, user agent
        - [ ] 6.1.3 Log successful logins with user ID, username
        - [ ] 6.1.4 Log registration attempts (successful and failed)
        - [ ] 6.1.5 Log token refresh attempts (successful and rate limited)
    - [ ] 6.2 Configure logging settings if needed
        - [ ] 6.2.1 Verify `cinexplorer.auth` logger configured in LOGGING
        - [ ] 6.2.2 Set appropriate log level (INFO for prod, DEBUG for dev)
        - [ ] 6.2.3 Add log rotation if not already configured
    - [ ] 6.3 Test logging output
        - [ ] 6.3.1 Trigger failed login and check logs
        - [ ] 6.3.2 Trigger successful login and check logs
        - [ ] 6.3.3 Verify sensitive data not logged (passwords, tokens)

- [ ] 7. Environment-Aware Configuration
    - [ ] 7.1 Add `ENVIRONMENT` setting to `config/settings.py`
        - [ ] 7.1.1 Add `ENVIRONMENT = env('ENVIRONMENT', default='development')`
        - [ ] 7.1.2 Support values: 'development', 'staging', 'production'
    - [ ] 7.2 Update security settings to be environment-aware
        - [ ] 7.2.1 Wrap production-only settings in `if ENVIRONMENT == 'production'` block
        - [ ] 7.2.2 Keep development-friendly defaults for `ENVIRONMENT == 'development'`
        - [ ] 7.2.3 Add staging environment configuration (balanced security)
    - [ ] 7.3 Document environment variables in README or .env.example
        - [ ] 7.3.1 Add `ENVIRONMENT` to .env.example with description
        - [ ] 7.3.2 Document which settings change per environment
        - [ ] 7.3.3 Add deployment checklist for production settings

- [ ] 8. Full Quality Gates
    - [ ] 8.1 Run all backend tests
        - [ ] 8.1.1 Command: `docker compose -f infrastructure/docker-compose.yml exec backend python manage.py test --keepdb --settings=config.settings_test`
        - [ ] 8.1.2 Verify 100% pass rate (0 failures, 0 errors)
    - [ ] 8.2 Run all frontend tests
        - [ ] 8.2.1 Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - [ ] 8.2.2 Verify 100% pass rate (0 failures)
    - [ ] 8.3 Run all linting checks
        - [ ] 8.3.1 Backend: `docker compose exec backend ruff check apps/ config/`
        - [ ] 8.3.2 Frontend: `docker compose exec frontend npm run lint`
        - [ ] 8.3.3 Markdown: `npx markdownlint-cli2 "README.md" ".arc/**/*.md"`
        - [ ] 8.3.4 Verify zero violations across all checks
    - [ ] 8.4 Run type checking
        - [ ] 8.4.1 Backend: `python backend/scripts/type_check.py` (Pyright-only with django-types)
        - [ ] 8.4.2 Frontend: `docker compose exec frontend npm run type-check`
        - [ ] 8.4.3 Verify zero type errors (excluding documented limitations)
    - [ ] 8.5 Manual smoke testing
        - [ ] 8.5.1 Registration flow end-to-end
        - [ ] 8.5.2 Login with username/email end-to-end
        - [ ] 8.5.3 Token refresh flow
        - [ ] 8.5.4 Logout flow
        - [ ] 8.5.5 Verify rate limiting works as expected

- [ ] 9. Documentation Updates
    - [ ] 9.1 Update CURRENT-SESSION.md
        - [ ] 9.1.1 Mark security updates incidental work complete
        - [ ] 9.1.2 Document what was fixed and why
        - [ ] 9.1.3 Update "Next Action" to resume OAuth incidental work
    - [ ] 9.2 Update notes file with security improvements
        - [ ] 9.2.1 Document security settings added
        - [ ] 9.2.2 Document rate limiting configuration
        - [ ] 9.2.3 Document token blacklisting implementation
        - [ ] 9.2.4 Document CSRF simplification
    - [ ] 9.3 Archive this incidental task list
        - [ ] 9.3.1 Move to `.arc/reference/archive/tasks/`
        - [ ] 9.3.2 Add completion summary and outcomes
        - [ ] 9.3.3 Commit archive with appropriate message

## Relevant Files

**Backend Settings:**
- `backend/config/settings.py` - Security settings (cookies, HSTS, headers), JWT config, middleware, INSTALLED_APPS (refactored to fix type errors)
- `backend/stubs/environ/__init__.pyi` - Type stubs for django-environ library

**Authentication Module:**
- `backend/apps/authentication/api.py` - Django Ninja throttling, token blacklisting, logging
- `backend/apps/authentication/middleware.py` - CSRF middleware removal

**Documentation:**
- `.arc/active/CURRENT-SESSION.md` - Session tracking
- `.arc/active/notes-api-layer-modernization-p2.md` - Implementation notes
- `.arc/active/tasks-incidental-oauth-headless-migration.md` - Related OAuth work (paused)

## Implementation Notes

### Security Settings Priority

**Immediate (Production Blockers)**:
1. SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE
2. Security headers (HSTS, X-Frame-Options)
3. JWT_COOKIE_SAMESITE fix
4. Rate limiting

**High Priority**:
5. Refresh token blacklisting
6. Authentication logging

**Medium Priority**:
7. CSRF middleware removal (simplification)
8. Environment-aware configuration

### Rate Limiting Configuration (Django Ninja Throttling + Redis)

**Decision: Use Django Ninja built-in throttling instead of django-ratelimit**

**Rationale:**
- ✅ **Type safety**: Django Ninja has `py.typed` marker, fully type-safe (django-ratelimit has NO type annotations)
- ✅ **Zero-tolerance compliant**: Passes Pyright strict mode without suppressions
- ✅ **Native integration**: Built into Django Ninja framework (no additional package)
- ✅ **Modern & maintained**: Active development, Django 5.2 compatible
- ❌ django-ratelimit: Stale (July 2023), no type safety, requires `# type: ignore` everywhere

**Decision: Add Redis infrastructure now (minimal scope for throttling)**

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

**Implementation Example:**

```python
from ninja import Router
from ninja.throttling import AnonRateThrottle, UserRateThrottle

router = Router()

# Login: 5 attempts/minute (anonymous users only)
@router.post("/token", throttle=[AnonRateThrottle('5/m')])
def obtain_token(request, payload: LoginPayload):
    # Fully typed, no suppressions needed
    pass

# Registration: 3 attempts/hour (anonymous users)
@router.post("/register", throttle=[AnonRateThrottle('3/h')])
def register_user(request, payload: RegisterPayload):
    pass

# Token refresh: 10 attempts/minute (authenticated users)
@router.post("/refresh", throttle=[UserRateThrottle('10/m')])
def refresh_token(request):
    # UserRateThrottle keys on authenticated user ID
    pass
```

**Rate Format**: `'count/period'` where period: `s`(second), `m`(minute), `h`(hour), `d`(day)

**Throttle Types:**
- `AnonRateThrottle('5/m')` - Keys on IP address (for unauthenticated requests)
- `UserRateThrottle('10/m')` - Keys on user ID (for authenticated requests)
- Automatic 429 status code when limit exceeded

**Cache Backend Requirement**: Redis or Memcached (requires atomic operations, LocMemCache NOT supported)

### Token Blacklisting Pattern (django-ninja-jwt)

**Note:** Using `ninja_jwt.token_blacklist` (already installed, DRF-free)

```python
# Configuration in settings.py
INSTALLED_APPS = [
    # ...
    'ninja_jwt.token_blacklist',  # Enable blacklisting
]

SIMPLE_JWT = {
    # ... existing settings
    'ROTATE_REFRESH_TOKENS': True,  # Issue new refresh token on each refresh
    'BLACKLIST_AFTER_ROTATION': True,  # Auto-blacklist old token after rotation
}

# Programmatic blacklisting (if needed)
from ninja_jwt.tokens import RefreshToken

old_refresh = RefreshToken(old_token_value)
old_refresh.blacklist()  # Marks as used in database

# If old token is reused, validation will fail
# Log this as potential security incident
```

**Database Tables Created:**
- `token_blacklist_outstandingtoken` - Tracks all issued tokens
- `token_blacklist_blacklistedtoken` - Tracks revoked tokens

**Maintenance:**
Run `python manage.py flushexpiredtokens` daily to clean up expired tokens

### CSRF Simplification Rationale

Django's built-in `CsrfViewMiddleware` provides:
- ✅ Double-submit cookie pattern (same as custom middleware)
- ✅ Automatic exemption for safe methods (GET, HEAD, OPTIONS)
- ✅ Django Ninja integration (auth=None endpoints auto-exempt)
- ✅ Battle-tested, maintained by Django core team

Custom middleware adds:
- ❌ Redundant logic (Django already handles this)
- ❌ Maintenance burden
- ❌ Potential edge case conflicts

**Verdict**: Remove custom, use Django's built-in.

## Completion Notes

{To be filled after completion}

## References

- External Research Audit Report: 2025-10-08 comprehensive authentication audit
- OWASP Authentication Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- OWASP Session Management Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
- Django Security Settings: <https://docs.djangoproject.com/en/5.2/ref/settings/#security>
- RFC 8725: JWT Best Current Practices: <https://datatracker.ietf.org/doc/html/rfc8725>
- Django Ninja Throttling: <https://django-ninja.dev/guides/throttling/>
- django-ninja-jwt Token Blacklist: <https://eadwincode.github.io/django-ninja-jwt/blacklist_app/>
- django-ninja-jwt GitHub: <https://github.com/eadwinCode/django-ninja-jwt>
