# Incidental Work: Authentication Security Updates

**Created**: 2025-10-08
**Triggered By**: External research audit during OAuth headless migration (tasks-incidental-oauth-headless-migration.md)
**Status**: Pending
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
- Implement rate limiting on authentication endpoints (login, register, refresh)
- Add refresh token blacklisting with djangorestframework-simplejwt
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

- [ ] 1. Critical Security Settings (Production Blockers)
    - [ ] 1.1 Add cookie security settings to `config/settings.py`
        - [ ] 1.1.1 Add `SESSION_COOKIE_SECURE = not DEBUG` (HTTPS enforcement)
        - [ ] 1.1.2 Add `CSRF_COOKIE_SECURE = not DEBUG` (HTTPS enforcement)
        - [ ] 1.1.3 Add `SESSION_COOKIE_HTTPONLY = True` (XSS protection)
        - [ ] 1.1.4 Add `SESSION_COOKIE_SAMESITE = 'Lax'` (CSRF protection)
    - [ ] 1.2 Add HSTS and SSL security headers
        - [ ] 1.2.1 Add production-only HSTS settings (SECURE_HSTS_SECONDS, INCLUDE_SUBDOMAINS, PRELOAD)
        - [ ] 1.2.2 Add `SECURE_SSL_REDIRECT = True` for production
        - [ ] 1.2.3 Add `SECURE_PROXY_SSL_HEADER` for Caddy proxy compatibility
    - [ ] 1.3 Add additional security headers
        - [ ] 1.3.1 Set `X_FRAME_OPTIONS = 'DENY'` (clickjacking protection)
        - [ ] 1.3.2 Set `SECURE_CONTENT_TYPE_NOSNIFF = True` (MIME sniffing protection)
        - [ ] 1.3.3 Set `SECURE_BROWSER_XSS_FILTER = True` (legacy XSS protection)
    - [ ] 1.4 Run incremental quality checks
        - [ ] 1.4.1 Backend linting: `docker compose -f infrastructure/docker-compose.yml exec backend ruff check config/ --fix`
        - [ ] 1.4.2 Verify Django check passes: `docker compose -f infrastructure/docker-compose.yml exec backend python manage.py check`
    - [ ] 1.5 Verify backend restarts without errors

- [ ] 2. JWT Cookie Configuration Fix
    - [ ] 2.1 Update `SIMPLE_JWT` configuration in `config/settings.py`
        - [ ] 2.1.1 Change `JWT_COOKIE_SAMESITE` from "None" to "Lax" (same-origin security)
        - [ ] 2.1.2 Reduce `REFRESH_TOKEN_LIFETIME` from 30 days to 14 days (per RFC 8725)
        - [ ] 2.1.3 Add comments explaining SameSite="Lax" rationale (same-origin via Caddy)
    - [ ] 2.2 Test JWT cookie behavior in development
        - [ ] 2.2.1 Login via `/api/token/` and verify cookies set with SameSite=Lax
        - [ ] 2.2.2 Make authenticated request to `/api/profile/` and verify cookies sent
        - [ ] 2.2.3 Verify no browser console warnings about SameSite cookies

- [ ] 3. Rate Limiting Implementation
    - [ ] 3.1 Install django-ratelimit package
        - [ ] 3.1.1 Add `django-ratelimit` to backend requirements
        - [ ] 3.1.2 Run `docker compose -f infrastructure/docker-compose.yml build backend` to install
        - [ ] 3.1.3 Verify package installed: `docker compose exec backend pip show django-ratelimit`
    - [ ] 3.2 Apply rate limiting to authentication endpoints
        - [ ] 3.2.1 Add `@ratelimit` decorator to `obtain_token()` (5 attempts/minute per IP)
        - [ ] 3.2.2 Add `@ratelimit` decorator to `register_user()` (3 attempts/hour per IP)
        - [ ] 3.2.3 Add `@ratelimit` decorator to `refresh_token()` (10 attempts/minute per IP)
        - [ ] 3.2.4 Add error handling for rate limit exceeded (429 status code)
    - [ ] 3.3 Configure cache backend for rate limiting (if not already configured)
        - [ ] 3.3.1 Verify CACHES setting in `config/settings.py` (default LocMemCache acceptable for dev)
        - [ ] 3.3.2 Add comments explaining cache requirement for rate limiting
    - [ ] 3.4 Test rate limiting behavior
        - [ ] 3.4.1 Make 6 rapid login attempts and verify 429 error on 6th attempt
        - [ ] 3.4.2 Wait 1 minute and verify login works again
        - [ ] 3.4.3 Document rate limit thresholds in API documentation
    - [ ] 3.5 Run incremental quality checks
        - [ ] 3.5.1 Backend linting: `docker compose exec backend ruff check apps/authentication/api.py --fix`
        - [ ] 3.5.2 Type checking: `npx pyright backend/apps/authentication/api.py`

- [ ] 4. Refresh Token Blacklisting (Token Rotation Security)
    - [ ] 4.1 Install token blacklist app
        - [ ] 4.1.1 Add `rest_framework_simplejwt.token_blacklist` to INSTALLED_APPS
        - [ ] 4.1.2 Run migrations: `docker compose exec backend python manage.py migrate`
        - [ ] 4.1.3 Verify migrations applied: Check for `token_blacklist_*` tables
    - [ ] 4.2 Update `refresh_token()` endpoint in `authentication/api.py`
        - [ ] 4.2.1 Import blacklist: `from rest_framework_simplejwt.tokens import RefreshToken`
        - [ ] 4.2.2 Add `old_token.blacklist()` call before generating new token
        - [ ] 4.2.3 Add try/except for blacklist errors (token already blacklisted, expired)
        - [ ] 4.2.4 Return appropriate error for blacklisted tokens (401 Unauthorized)
    - [ ] 4.3 Add token reuse detection logging
        - [ ] 4.3.1 Log when blacklisted token is reused (security event)
        - [ ] 4.3.2 Include IP address and user agent in log entry
        - [ ] 4.3.3 Consider adding alert threshold (multiple reuse attempts = attack)
    - [ ] 4.4 Test token blacklisting behavior
        - [ ] 4.4.1 Login and obtain refresh token
        - [ ] 4.4.2 Use refresh token to get new access token (should succeed)
        - [ ] 4.4.3 Attempt to reuse old refresh token (should fail with 401)
        - [ ] 4.4.4 Verify blacklist entry created in database
    - [ ] 4.5 Run incremental quality checks
        - [ ] 4.5.1 Backend tests: `docker compose exec backend python manage.py test authentication.tests --keepdb`
        - [ ] 4.5.2 Type checking: `npx pyright backend/apps/authentication/api.py`

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
        - [ ] 8.4.1 Backend: `python backend/scripts/type_check.py` (hybrid Pyright + mypy)
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
- `backend/config/settings.py` - Security settings, JWT config, middleware, INSTALLED_APPS

**Authentication Module:**
- `backend/apps/authentication/api.py` - Rate limiting, token blacklisting, logging
- `backend/apps/authentication/middleware.py` - CSRF middleware removal
- `backend/requirements.txt` - Add django-ratelimit dependency

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

### Rate Limiting Configuration

```python
# Example rate limit decorator usage
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def obtain_token(request, response, payload):
    # Limit: 5 login attempts per minute per IP
    # block=True returns 429 when limit exceeded
```

**Key Selection**: Use `'ip'` for anonymous endpoints, `'user'` for authenticated

**Rate Values**: Format is `'count/period'` where period: `s`(second), `m`(minute), `h`(hour), `d`(day)

### Token Blacklisting Pattern

```python
# Before generating new token, blacklist the old one
from rest_framework_simplejwt.tokens import RefreshToken

old_refresh = RefreshToken(old_token_value)
old_refresh.blacklist()  # Marks as used in database

# If old token is reused, validation will fail
# Log this as potential security incident
```

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
- django-ratelimit Documentation: <https://django-ratelimit.readthedocs.io/>
- djangorestframework-simplejwt Token Blacklist: <https://django-rest-framework-simplejwt.readthedocs.io/en/latest/blacklist_app.html>
