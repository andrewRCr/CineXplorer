# Incidental Work: Authentication Security Updates

**Created**: 2025-10-08
**Triggered By**: External research audit during OAuth headless migration (tasks-incidental-oauth-headless-migration.md)
**Status**: In Progress (resumed after backend type safety completion - Task 3 completed, ready for Task 4)
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
- Refine custom CSRF middleware (investigation revealed Django Ninja bug requires custom solution)
- Add comprehensive authentication event logging
- Update settings for environment-aware configuration (dev vs production)
- Add comprehensive automated tests for all security features (Task 7.5: ~20 new tests, 90%+ coverage)
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

- [x] 4. Refresh Token Blacklisting (Token Rotation Security - django-ninja-jwt)
    - [x] 4.1 Enable ninja-jwt token blacklist app (already installed with ninja-jwt)
        - [x] 4.1.1 Add `ninja_jwt.token_blacklist` to INSTALLED_APPS
        - [x] 4.1.2 Configure settings: `ROTATE_REFRESH_TOKENS = True`, `BLACKLIST_AFTER_ROTATION = True`
        - [x] 4.1.3 Run migrations: `docker compose exec backend python manage.py migrate`
        - [x] 4.1.4 Verify migrations applied: Check for `token_blacklist_outstandingtoken` and `token_blacklist_blacklistedtoken` tables
    - [x] 4.2 Update `refresh_token()` endpoint in `authentication/api.py`
        - [x] 4.2.1 Import blacklist: `from ninja_jwt.tokens import RefreshToken` (already imported, verify blacklist method available)
        - [x] 4.2.2 Add `old_token.blacklist()` call before generating new token (or rely on BLACKLIST_AFTER_ROTATION auto-blacklist)
        - [x] 4.2.3 Add try/except for blacklist errors (token already blacklisted, expired, invalid)
        - [x] 4.2.4 Return appropriate error for blacklisted tokens (401 Unauthorized)
    - [x] 4.3 Add token reuse detection logging
        - [x] 4.3.1 Log when blacklisted token is reused (security event)
        - [x] 4.3.2 Include IP address and user agent in log entry
        - [x] 4.3.3 Consider adding alert threshold (multiple reuse attempts = attack) - **DEFERRED to observability sprint**
            - **Decision:** Defer automatic alert thresholds to future observability sprint
            - **Rationale:** Current WARNING logs provide full audit trail; alert thresholds should be designed holistically with monitoring dashboards and incident response workflows rather than point solution now
            - **Current solution:** Individual logs per reuse attempt with complete forensic data (user_id, IP, user_agent)
            - **Future implementation:** Redis-based counter with sliding time window, integrated with monitoring dashboards (observability sprint)
            - **Documentation:** Added comprehensive entry to `.arc/upcoming/notes/notes-future-modernization.md` with implementation guidance
    - [x] 4.4 Test token blacklisting behavior
        - [x] 4.4.1 Login and obtain refresh token - ✅ Successful (user_id=25, token tracked)
        - [x] 4.4.2 Use refresh token to get new access token (should succeed) - ✅ Token rotation working
        - [x] 4.4.3 Attempt to reuse old refresh token (should fail with 401) - ✅ Rejected with 401 + revoked error
        - [x] 4.4.4 Verify blacklist entry created in `token_blacklist_blacklistedtoken` table - ✅ 1 entry created
        - [x] 4.4.5 Verify outstanding token tracked in `token_blacklist_outstandingtoken` table - ✅ 2 tokens tracked
        - **Bug Fix**: Original implementation used `set_jti()`/`set_exp()` which doesn't trigger blacklisting. Fixed by using `RefreshToken.for_user()` for new token generation and manual `old_refresh.blacklist()` call.
        - **Test Script**: `backend/scripts/test_token_blacklist.sh` - comprehensive operational validation covering all 5 subtasks + security logging verification
    - [x] 4.5 Set up token cleanup (maintenance)
        - [x] 4.5.1 Document `flushexpiredtokens` management command for periodic cleanup (already documented at lines 63-64)
        - [x] 4.5.2 Production deployment checklist added to maintenance section with cron job recommendation
    - [x] 4.6 Run incremental quality checks
        - [x] 4.6.1 Backend tests: `docker compose exec backend python manage.py test authentication.tests --keepdb` - ✅ 20/20 tests pass
        - [x] 4.6.2 Type checking: `npx pyright backend/apps/authentication/api.py --project backend` - ✅ 0 errors
        - [x] 4.6.3 Verify ninja-jwt type stubs provide blacklist type coverage - ✅ py.typed marker confirmed, contextlib.suppress used

- [x] 5. CSRF Middleware Refinement & Edge Case Resolution
    **Context**: Originally planned to remove existing custom CSRF middleware in favor of Django's built-in. Investigation revealed Django Ninja bug #1464 requires custom middleware. Pivoted to refining existing implementation with JWT cookie detection, path-based exemptions, and edge case handling. See notes file for full analysis.
    - [x] 5.1 Investigate Django Ninja + Django CSRF integration compatibility
        - [x] 5.1.1 Research Django Ninja CSRF best practices (external-research-analyst agent)
        - [x] 5.1.2 Analyze findings and determine correct approach
        - [x] 5.1.3 Decision: Refine existing custom middleware (Django Ninja bug #1464 prevents built-in use)
    - [x] 5.2 Refine CsrfHeaderMiddleware implementation
        - [x] 5.2.1 Implement JWT cookie detection (auth happens at endpoint level, not middleware)
        - [x] 5.2.2 Maintain path-based exemption system (EXEMPT_PATH_PREFIXES)
        - [x] 5.2.3 Update middleware documentation with implementation rationale
    - [x] 5.3 Test complete CSRF flow
        - [x] 5.3.1 Run CSRF test suite (9 tests) - ✅ ALL PASSING
        - [x] 5.3.2 Verify authenticated endpoints require CSRF token
        - [x] 5.3.3 Verify public endpoints (login, register) exempt from CSRF
    - [x] 5.4 Address edge cases and enhancements
        - [x] 5.4.1 DECISION: Refresh endpoint CSRF requirement → ✅ **APPROVED Option A** (require CSRF)
        - [x] 5.4.2 Verify path-based exemption list complete (6 endpoints)
        - [x] 5.4.3 Add edge case tests (middleware ordering, token lifecycle, refresh CSRF requirement)
        - [x] 5.4.4 Create frontend CSRF integration guide in notes file
        - [x] 5.4.5 Add CSRF failure monitoring recommendations to notes
    - [x] 5.5 Run incremental quality checks
        - [x] 5.5.1 Backend linting: `.venv-backend/bin/ruff check` - ✅ 0 violations
        - [x] 5.5.2 Type checking: `npx pyright` - ✅ 0 errors
        - [x] 5.5.3 Django check: `docker compose exec backend python manage.py check` - ✅ 0 issues

- [x] 6. Authentication Event Logging & Error Response Standardization
    - [x] 6.1 Standardize error response format across authentication endpoints
        - [x] 6.1.1 Audit current error responses (401, 403, 400, 429, 409, 500)
        - [x] 6.1.2 Ensure consistent structure: `{"error": "message"}` for user-facing errors
        - [x] 6.1.3 Add `{"detail": "technical detail"}` for debugging (development-only per user approval)
        - [x] 6.1.4 Verify CSRF middleware error format matches standard (changed from `{"detail"}` to `{"error"}`)
        - [x] 6.1.5 Document standard error format in notes file for Task 7.5 test writing
    - [x] 6.2 Add logging to `authentication/api.py`
        - [x] 6.2.1 Import logger: `import logging; logger = logging.getLogger('cinexplorer.auth')` (already exists, verified)
        - [x] 6.2.2 Log failed login attempts with IP, login identifier, user agent
        - [x] 6.2.3 Log successful logins with user ID, login identifier, IP, user agent
        - [x] 6.2.4 Log registration attempts (successful and failed) with IP, username, email
        - [x] 6.2.5 Log token refresh attempts (successful) with user ID, IP
    - [x] 6.3 Configure logging settings if needed
        - [x] 6.3.1 Verify `cinexplorer.auth` logger configured in LOGGING (inherits from `cinexplorer` parent logger)
        - [x] 6.3.2 Set appropriate log level (INFO for prod, DEBUG for dev) - Already configured via DJANGO_LOG_LEVEL env var
        - [x] 6.3.3 Add log rotation if not already configured - Already configured (10MB files, 5 backups)
    - [x] 6.4 Test logging output
        - [x] 6.4.1 Trigger failed login and check logs
        - [x] 6.4.2 Trigger successful login and check logs
        - [x] 6.4.3 Verify sensitive data not logged (passwords, tokens)

- [x] 7. Environment-Aware Configuration
    - [x] 7.1 Add `ENVIRONMENT` setting to `config/settings.py`
        - [x] 7.1.1 Add `ENVIRONMENT = env('ENVIRONMENT', default='development')`
        - [x] 7.1.2 Support values: 'development', 'staging', 'production'
    - [x] 7.2 Update security settings to be environment-aware
        - [x] 7.2.1 Wrap production-only settings in `if ENVIRONMENT == 'production'` block
        - [x] 7.2.2 Keep development-friendly defaults for `ENVIRONMENT == 'development'`
        - [x] 7.2.3 Add staging environment configuration (balanced security)
    - [x] 7.3 Document environment variables in README or .env.example
        - [x] 7.3.1 Add `ENVIRONMENT` to .env.example with description
        - [x] 7.3.2 Document which settings change per environment
        - [x] 7.3.3 Add deployment checklist for production settings

- [ ] 7.5 Add Automated Tests for Security Features (Comprehensive Test Coverage)
    - [x] 7.5.1 Security Headers Tests (Task 1 validation)
        - [x] 7.5.1.1 Test: Response includes X-Frame-Options: DENY header
        - [x] 7.5.1.2 Test: Response includes X-Content-Type-Options: nosniff header
        - [x] 7.5.1.3 Test: Response includes X-XSS-Protection header
        - [x] 7.5.1.4 Test: Session cookie has Secure attribute (check cookie object, environment-aware)
        - [x] 7.5.1.5 Test: CSRF cookie has Secure attribute (check cookie object, environment-aware)
        - [x] 7.5.1.6 Test: HSTS headers present in production environment (Strict-Transport-Security)
        - [x] 7.5.1.7 Test: HSTS headers absent in development environment
    - [x] 7.5.2 JWT Cookie SameSite Tests (Task 2 completion)
        - [x] 7.5.2.1 Test: Login response sets access_token cookie with SameSite=Lax
        - [x] 7.5.2.2 Test: Login response sets refresh_token cookie with SameSite=Lax
        - [x] 7.5.2.3 Test: Token refresh response maintains SameSite=Lax for both cookies
        - **Bug Fix**: All CSRF tests were using incorrect cookie name 'XSRF-TOKEN' instead of Django's default 'csrftoken'. Fixed in test_security.py and test_user_api.py to match custom CSRF middleware expectations (double-submit cookie pattern with 'csrftoken' cookie + 'X-CSRFToken' header).
    - [ ] 7.5.3 Rate Limiting Tests (Task 3 validation)
        - [ ] 7.5.3.1 Create test helper: `clear_rate_limit_cache()` to flush Redis between tests
        - [ ] 7.5.3.2 Test: 5 rapid login attempts succeed (within 5/minute limit)
        - [ ] 7.5.3.3 Test: 6th login attempt within minute returns 429 Too Many Requests
        - [ ] 7.5.3.4 Test: 3 registration attempts in hour succeed (within 3/hour limit)
        - [ ] 7.5.3.5 Test: 4th registration attempt within hour returns 429
        - [ ] 7.5.3.6 Test: 10 token refresh attempts succeed (within 10/minute limit)
        - [ ] 7.5.3.7 Test: 11th refresh attempt within minute returns 429
    - [ ] 7.5.4 Token Blacklisting Tests (Task 4 validation - critical security path)
        - [ ] 7.5.4.1 Test: First token refresh succeeds (new tokens issued)
        - [ ] 7.5.4.2 Test: Reusing old refresh token after rotation returns 401 Unauthorized
        - [ ] 7.5.4.3 Test: Error response includes "revoked" message for blacklisted token
        - [ ] 7.5.4.4 Test: New refresh token continues to work after old one blacklisted
        - [ ] 7.5.4.5 Test: Database blacklist table contains entry for revoked token
        - [ ] 7.5.4.6 Test: Database outstanding tokens table tracks all issued tokens
    - [ ] 7.5.5 Authentication Security Logging Tests (Task 6 validation)
        - [ ] 7.5.5.1 Create test helper: `LogCaptureMixin` or use Django's assertLogs context manager
        - [ ] 7.5.5.2 Test: Failed login logs WARNING with IP address and username
        - [ ] 7.5.5.3 Test: Successful login logs INFO with user_id
        - [ ] 7.5.5.4 Test: Blacklisted token reuse logs WARNING with user_id, IP, and user_agent
        - [ ] 7.5.5.5 Test: Rate limit violation logs appropriate level (verify throttle logging)
        - [ ] 7.5.5.6 Test: Successful registration logs INFO
        - [ ] 7.5.5.7 Test: Passwords never appear in any log output (security check)
        - [ ] 7.5.5.8 Test: Token values never appear in any log output (security check)
    - [ ] 7.5.6 Error Response Format Tests (Task 6 standardization)
        - [ ] 7.5.6.1 Test: 401 responses use `{"error": "message"}` format (invalid credentials)
        - [ ] 7.5.6.2 Test: 403 responses use `{"error": "message"}` format (email not verified)
        - [ ] 7.5.6.3 Test: 409 responses use `{"error": "message"}` format (username exists)
        - [ ] 7.5.6.4 Test: 429 responses use `{"error": "message"}` format (rate limit exceeded)
        - [ ] 7.5.6.5 Test: 400 responses use `{"error": "message"}` format (invalid token)
        - [ ] 7.5.6.6 Test: DEBUG=True includes `{"detail": "..."}` field for technical details
        - [ ] 7.5.6.7 Test: DEBUG=False excludes `{"detail": "..."}` field (production mode)
        - [ ] 7.5.6.8 Test: CSRF error responses use `{"error": "message"}` format (middleware consistency)
    - [ ] 7.5.7 Environment-Aware Configuration Tests (Task 7 validation)
        - [ ] 7.5.7.1 Test helper: Override settings with `@override_settings(ENVIRONMENT='production')`
        - [ ] 7.5.7.2 Test: SESSION_COOKIE_SECURE=True in production environment
        - [ ] 7.5.7.3 Test: SESSION_COOKIE_SECURE=True in staging environment
        - [ ] 7.5.7.4 Test: SESSION_COOKIE_SECURE=False in development environment
        - [ ] 7.5.7.5 Test: CSRF_COOKIE_SECURE follows same pattern as SESSION_COOKIE_SECURE
        - [ ] 7.5.7.6 Test: SECURE_HSTS_SECONDS=31536000 in production (1 year)
        - [ ] 7.5.7.7 Test: SECURE_HSTS_SECONDS=3600 in staging (1 hour)
        - [ ] 7.5.7.8 Test: SECURE_HSTS_SECONDS undefined in development (no HSTS)
        - [ ] 7.5.7.9 Test: SECURE_SSL_REDIRECT=True in production and staging
        - [ ] 7.5.7.10 Test: SECURE_SSL_REDIRECT undefined in development
        - [ ] 7.5.7.11 Test: Invalid ENVIRONMENT value logs warning and defaults to 'development'
    - [ ] 7.5.8 Run full authentication test suite and verify coverage
        - [ ] 7.5.8.1 Command: `python manage.py test apps.authentication --keepdb`
        - [ ] 7.5.8.2 Verify all tests pass (20 existing + ~30 new = 50+ tests expected)
        - [ ] 7.5.8.3 Run coverage: `coverage run --source=apps.authentication manage.py test apps.authentication --keepdb`
        - [ ] 7.5.8.4 Generate coverage report: `coverage report -m`
        - [ ] 7.5.8.5 Verify 90%+ coverage for authentication app (critical path requirement per testing strategy)
        - [ ] 7.5.8.6 Document any uncovered lines and justify why they're acceptable

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
    - [ ] 9.1 Update notes file with security improvements
        - [ ] 9.1.1 Document security settings added
        - [ ] 9.1.2 Document rate limiting configuration
        - [ ] 9.1.3 Document token blacklisting implementation
        - [ ] 9.1.4 Document CSRF improvements
    - [ ] 9.2 Add completion summary and outcomes to this incidental task list; mark its status as "Completed"

## Relevant Files

**Backend Settings:**
- `backend/config/settings.py` - Security settings (cookies, HSTS, headers), JWT config, middleware, INSTALLED_APPS (ninja_jwt.token_blacklist added), environment-aware configuration (ENVIRONMENT setting)
- `backend/config/.env.example` - Environment variable documentation and production deployment checklist
- `backend/stubs/environ/__init__.pyi` - Type stubs for django-environ library

**Authentication Module:**
- `backend/apps/authentication/api.py` - Django Ninja throttling, token blacklisting (automatic rotation with BLACKLIST_AFTER_ROTATION), reuse detection logging with IP/user agent, standardized error responses
- `backend/apps/authentication/middleware.py` - Custom CSRF middleware with JWT cookie detection and path-based exemptions
- `backend/apps/authentication/tests/test_user_api.py` - Automated test suite (20 existing tests, Task 7.5 adds ~20 more)

**Operational Testing:**
- `backend/scripts/test_token_blacklist.sh` - Manual validation script for token blacklisting (operational validation, not part of automated suite)

**Documentation:**
- `.arc/active/CURRENT-SESSION.md` - Session tracking
- `.arc/active/notes-api-layer-modernization-p2.md` - Implementation notes
- `.arc/active/tasks-incidental-oauth-headless-migration.md` - Related OAuth work (paused)
- `.arc/upcoming/notes/notes-future-modernization.md` - Deferred alert threshold implementation (Task 4.3.3)

## Implementation Notes

### Security Settings Priority

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
- `token_blacklist_outstandingtoken` - Tracks all issued tokens (JTI, user, creation time, expiry)
- `token_blacklist_blacklistedtoken` - Tracks revoked tokens (foreign key to OutstandingToken, blacklisted_at timestamp)

**Maintenance & Production Deployment:**

Token blacklist tables will grow over time as refresh tokens are issued and rotated. Expired tokens should be periodically cleaned up to prevent unbounded database growth.

**Management Command:**

```bash
# Remove expired tokens from both tables
python manage.py flushexpiredtokens

# Docker container command
docker compose -f infrastructure/docker-compose.yml exec backend python manage.py flushexpiredtokens
```

**Production Deployment Checklist:**
1. **Cron Job Setup** (recommended daily cleanup):

   ```cron
   # Daily at 2 AM: Flush expired JWT tokens
   0 2 * * * cd /app && python manage.py flushexpiredtokens
   ```

2. **Monitoring**:
   - Track `token_blacklist_outstandingtoken` row count (should stabilize after cleanup schedule established)
   - Monitor for excessive blacklist reuse attempts (potential security incidents logged as WARNING)
   - Alert on table growth > 100K rows (may need more frequent cleanup)

3. **Database Indexes** (already created by django-ninja-jwt migrations):
   - `token_blacklist_outstandingtoken.user_id` - Query by user
   - `token_blacklist_outstandingtoken.jti` - Token lookup (unique)
   - `token_blacklist_blacklistedtoken.token_id` - Blacklist check

**Expected Behavior:**
- Refresh token lifetime: 14 days
- Outstanding tokens accumulate during active user sessions
- Blacklisted tokens created on each refresh (old token blacklisted, new token issued)
- After 14 days, tokens expire and become eligible for cleanup
- Daily flush keeps table size manageable (≈ active users × 2-3 tokens)

### CSRF Custom Middleware Rationale

**Why Custom Middleware?**

Django Ninja bug #1464 prevents using Django's built-in `CsrfViewMiddleware`:
- ❌ Setting `csrf=True` on auth classes causes valid tokens to be rejected
- ❌ Setting `csrf=False` disables ALL CSRF protection (unacceptable)
- ❌ Bug unresolved as of Django Ninja v1.4.3

**Custom Middleware Solution:**

Custom `CsrfHeaderMiddleware` provides:
- ✅ JWT cookie detection (auth happens at endpoint level, not middleware)
- ✅ Path-based exemptions for public endpoints (login, register, etc.)
- ✅ Double-submit cookie pattern (same as Django's built-in)
- ✅ Refresh endpoint requires CSRF (Option A - limits stolen session lifetime)
- ✅ All 9 CSRF tests passing

**Implementation Details:**
- See `backend/apps/authentication/middleware.py` for implementation
- See notes file (Task 5.5) for comprehensive analysis and decision rationale
- Monitor Django Ninja issue #1464 for future resolution

### Comprehensive Test Coverage Strategy (Task 7.5)

**Rationale**: Per `.arc/reference/strategies/strategy-testing-methodology.md`:
- **Critical paths require 90%+ coverage** (authentication is critical path)
- **Integration tests over unit tests** (test real workflows, not mocks)
- **Focus on behavioral security logic** (not infrastructure settings)

**Coverage Targets**:
- Security headers: Validate middleware applies headers correctly
- JWT cookie attributes: Verify SameSite=Lax, Secure, HttpOnly set correctly
- Rate limiting: Test throttle behavior (success under limit, 429 over limit)
- Token blacklisting: **Critical** - Test reuse rejection (401), database tracking
- Security logging: Verify sensitive data never logged, events captured with forensics

**Test Organization**:
- Add tests to existing `apps/authentication/tests/test_user_api.py` file
- Use existing test helpers from `core/tests/test_helpers.py` (create_user, json_post)
- Create minimal new helpers: `clear_rate_limit_cache()`, log capture with `assertLogs()`
- Follow existing patterns (e.g., `AuthCookieIntegrationTests` class for cookie validation)

**Operational vs. Automated Testing**:
- `test_token_blacklist.sh` = **Operational validation** (manual, curl-based, full-stack)
- Task 7.5 tests = **Automated test suite** (CI/CD, Django test harness, regression prevention)
- Both serve different purposes: operational for deployment verification, automated for development workflow

**Expected Outcome**:
- 20 existing tests + ~30 new tests = 50+ total authentication tests
- 90%+ coverage for authentication app (exceeds 70% minimum, meets critical path requirement)
- All security features validated in CI/CD pipeline (no manual testing required for regression)

**Updated Test Coverage** (after audit):
- 7.5.1: Security Headers (7 tests) - includes HSTS validation
- 7.5.2: JWT Cookie SameSite (3 tests)
- 7.5.3: Rate Limiting (7 tests)
- 7.5.4: Token Blacklisting (6 tests)
- 7.5.5: Authentication Logging (8 tests)
- 7.5.6: Error Response Format (8 tests) - **NEW** validates Task 6 standardization
- 7.5.7: Environment-Aware Config (11 tests) - **NEW** validates Task 7 implementation
- **Total new tests: ~50 tests** (20 existing + 30 new)

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
