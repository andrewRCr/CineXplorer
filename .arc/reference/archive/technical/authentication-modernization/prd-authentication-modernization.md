# Authentication Modernization - Sub-PRD

**Document Version:** 2.0
**Created:** 2025-09-27
**Updated:** 2025-09-30
**Feature Priority:** High (Critical Blocker Resolution)
**Implementation Phase:** Between API-Layer-Modernization Phase 1 & Phase 2

## Introduction/Overview

This Sub-PRD defines the migration from custom User model authentication to django-allauth, eliminating the django-stubs mypy --strict bug while significantly enhancing the portfolio value through professional social authentication. This modernization unblocks comprehensive type checking, reduces demo friction for potential employers, and establishes industry-standard authentication patterns.

**Critical Context:** This addresses the django-stubs internal error (`AssertionError: Must not defer during final iteration`) that prevents mypy --strict mode, which is blocking Backend Modernization type safety objectives and API Layer Modernization Phase 2.

## Goals

1. **Eliminate django-stubs typing bug** by removing custom AUTH_USER_MODEL setting
2. **Enable comprehensive type safety** by allowing mypy --strict mode across entire backend
3. **Enhance portfolio demonstration** through professional social login (Google/GitHub)
4. **Preserve existing functionality** maintaining all current authentication features
5. **Maintain email verification** integrating ZeptoMail service with allauth
6. **Formalize django-allauth + ZeptoMail integration** via custom account adapters or signal hooks so transactional email continues to flow through `core.services.email_service`.
7. **Ensure Django Ninja compatibility** for seamless Phase 2 API migration

## User Stories

1. **As a prospective employer**, I want to sign in quickly with Google/GitHub so I can evaluate the application without signup friction.

2. **As the developer**, I want to run mypy --strict on the entire codebase to achieve comprehensive type safety and demonstrate professional Python practices.

3. **As an existing user**, I want to continue logging in with username or email so the authentication experience remains unchanged.

4. **As the developer**, I want the authentication system to work seamlessly with Django Ninja so API Layer Modernization Phase 2 can proceed without additional refactoring.

## Functional Requirements

### Core Authentication Migration

1. **Migrate from custom User model to default Django User model** eliminating AUTH_USER_MODEL setting.

   **Migration Strategy: Fresh Database**

   Prerequisites:
   - Database backup: `pg_dump cinexplorer > backup_pre_auth_migration_$(date +%Y%m%d).sql`
   - Document admin credentials

   Steps:
   1. Create feature branch: `feature/authentication-modernization`
   2. Install django-allauth: `pip install django-allauth`
   3. Remove AUTH_USER_MODEL setting from settings.py
   4. Introduce a compatibility helper/service that exposes `email_verified` semantics via django-allauth's `EmailAddress` records so downstream code can be updated before model removal.
   5. Remove custom User and EmailVerificationToken models from `backend/apps/accounts/models.py`
   6. Update INSTALLED_APPS to include allauth apps
   7. Drop existing database and create fresh: `docker compose exec dev-db psql -U postgres -c "DROP DATABASE cinexplorer; CREATE DATABASE cinexplorer;"`
   8. Run migrations: `python manage.py migrate`
   9. Create new superuser and configure Sites framework
   10. Create SocialApp entries for Google and GitHub OAuth

   Verification Checks:
   - ✅ Login with username/email succeeds
   - ✅ Social auth (Google/GitHub) returns OAuth redirect
   - ✅ Email verification flow works
   - ✅ JWT tokens generated and validated correctly
   - ✅ mypy --strict runs without django-stubs errors
   - ✅ Custom User and EmailVerificationToken models removed

   Rollback Procedure:
   - Immediate: `git checkout main && docker compose down -v && docker compose up -d`
   - Post-commit: Create rollback branch from pre-migration commit, recreate fresh database
   - Rollback if: django-stubs bug not resolved, OAuth broken, >2 E2E tests failing, Django Ninja integration broken

2. **Implement django-allauth** providing username/email login functionality identical to current backend.

3. **Support social authentication** for Google and GitHub OAuth.

4. **Maintain email verification functionality** integrating ZeptoMail through custom allauth adapters.

### Type Safety & Django Ninja Integration

5. **Validate django-allauth migration resolves django-stubs bug**:
   - Before: Document exact mypy error (`AssertionError: Must not defer during final iteration`)
   - After: `docker compose exec backend mypy apps/ --strict` with 0 errors
   - Scope: All apps (authentication, accounts, user_movie_data, movie, core)
   - CI Integration: Add mypy --strict to GitHub Actions workflow
   - Update `backend/scripts/type_check.py`:
     - Enable mypy execution (uncomment/restore mypy invocation)
     - Add `--strict` flag to mypy command
     - Remove any mypy skip/workaround branches
     - Preserve configured excludes and pytest stub handling (via `mypy.ini` or command-line flags)
     - Run both mypy and pyright sequentially, failing on either error
     - Ensure CI workflow (`.github/workflows/checks.yml`) calls the updated script

6. **Maintain Pyright compatibility**:
   - `npx pyright backend/apps/authentication backend/apps/accounts` with 0 errors
   - Document django-allauth type stubs limitations
   - Update type checking documentation with allauth patterns

7. **Ensure django-allauth compatibility with Django Ninja**:
   - Validate `JWTCookieAuth` class works with allauth default User model
   - Test JWT token generation with django.contrib.auth.models.User
   - Verify authentication decorators remain unchanged for Phase 2
   - Verify OpenAPI authentication schemas remain accurate

8. **Maintain existing API contracts** ensuring no breaking changes to authentication endpoints.

### Email & Social Authentication

9. **Migrate from custom EmailVerificationToken to allauth EmailAddress/EmailConfirmation**:
   - Review allauth's token cleanup strategy
   - Remove custom EmailVerificationToken model
   - Ensure email uniqueness enforced through allauth
   - Provide migration/seed script that creates initial `EmailAddress` entries using ZeptoMail-friendly metadata

10. **Configure Google OAuth** for development (`localhost:8444`):
    - Create Google Cloud OAuth 2.0 credentials
    - Authorized redirect URI: `https://localhost:8444/accounts/google/login/callback/`
    - Configure in Django admin: Sites + SocialApp model
    - Document test account for demo

11. **Configure GitHub OAuth** for development:
    - Create GitHub OAuth App
    - Authorized callback URL: `https://localhost:8444/accounts/github/login/callback/`
    - Configure in Django admin: Sites + SocialApp model
    - Document test account for demo

12. **Maintain ZeptoMail integration** preserving email delivery, tracking, and development mode.
    - Create a custom account adapter (subclass `allauth.account.adapter.DefaultAccountAdapter`) and override the following methods to call `core.services.email_service.get_email_service()` so all outbound auth emails use ZeptoMail:
      - `send_mail()` for generic email sending
      - `send_confirmation_mail()` for email verification flows
      - Password reset method (e.g., `send_password_reset_mail()` or equivalent, exact method name to be verified during implementation)
    - Configure the custom adapter via Django's `ACCOUNT_ADAPTER` setting
    - Ensure dev-mode logging continues to function without allauth swallowing simulated payloads.

13. **Implement email template refresh** using allauth templates with CineXplorer branding.
    - Align template variables with ZeptoMail payloads and Django Ninja error format to keep copy consistent.

### Security & API Quality

14. **Maintain JWT cookie authentication** with CSRF protection:

- Required cookie flags: `HttpOnly=True`, `Secure=True`, `SameSite=Lax`
- CSRF validation: `X-CSRFToken` header for POST/PUT/DELETE
- Exempted endpoints: login, register, OAuth callbacks (use rate limiting)

15. **Implement rate limiting for public authentication endpoints**:
    - Registration: IP-based (10/hour), email-based (3/hour)
    - Email verification resend: 5/hour per user
    - Login: 10 failed attempts/hour per IP
    - OAuth callbacks: 20/hour per IP (prevent replay attacks and callback abuse)
    - Implementation: django-ratelimit or django-defender
    - Log violations with alerting

16. **Implement consistent error response format** (coordinate with API Layer Modernization Phase 2):
    - Structure: `{"detail": string, "error_code": string, "type": string}`
    - Define error code taxonomy (AUTH_REQUIRED, INVALID_CREDENTIALS, etc.)
    - Update OpenAPI documentation to match
    - Consider global Django Ninja error handler

17. **Preserve user profile functionality** (first_name, last_name, etc.).

## Non-Goals (Out of Scope)

- Additional social providers beyond Google/GitHub
- Password reset UI customization (allauth provides default)
- Account management UI beyond basic allauth templates
- Two-factor authentication
- Magic link/passwordless authentication

## Technical Considerations

### Implementation Strategy

- Fresh database approach (development data only)
- Development OAuth for `localhost:8444` (Docker Compose + Caddy)
- Recreate admin account with documented credentials

### Integration Details

- Using default User model eliminates django-stubs circular dependency
- Hybrid Pyright (development) + mypy --strict (CI) approach
- Minimal changes expected to `JWTCookieAuth` class
- Standard allauth templates with branding opportunity

## Success Metrics

### Primary Success Criteria

1. **Bug Resolution**: `docker compose exec backend mypy apps/ --strict` exits with code 0
2. **Feature Parity**: All authentication features work identically to pre-migration
3. **Type Safety**: 0 errors from mypy --strict and Pyright; zero increase in `type: ignore` comments
4. **CI Integration**: Both type checkers passing in GitHub Actions

### Quantifiable Metrics

5. **Test Coverage**: Authentication module >= 85%, all 8 E2E tests passing, <60s total
6. **Migration Completeness**: Custom User/EmailVerificationToken removed, AUTH_USER_MODEL setting removed, 0 references to custom models
7. **Django Ninja Compatibility**: JWT auth works with Django Ninja, OpenAPI docs accurate

### E2E Test Plan (Required for Merge)

**Test Environment:** Test database, mock OAuth providers, in-memory email backend, 3 test fixtures

**Test Fixtures:**

1. **Verified user with username/password only**
   - Username: `testuser`, Email: `testuser@example.com`, Password: `SecurePass123!`
   - Email verification status: Verified (EmailAddress record with `verified=True`)
   - Social accounts: None
   - Used by tests: 1 (Password Authentication), 4 (CSRF Protection), 5 (Token Refresh), 6 (Logout)

2. **User with linked Google social account**
   - Username: `googleuser`, Email: `googleuser@example.com`
   - Email verification status: Verified via social auth
   - Social accounts: Google provider with mocked provider ID
   - Used by tests: 2 (Social OAuth - Google)

3. **User with linked GitHub social account**
   - Username: `githubuser`, Email: `githubuser@example.com`
   - Email verification status: Verified via social auth
   - Social accounts: GitHub provider with mocked provider ID
   - Used by tests: 3 (Social OAuth - GitHub)

**Mock OAuth Providers:**

- Use django-allauth testing utilities or mock provider responses
- Stub OAuth token exchange endpoints (no real external API calls)
- Mock provider user info responses with test account data
- Configure test-specific OAuth app credentials in test settings

**Test Standards:**

- Real CSRF flows (no `force_authenticate()`)
- Use `django.urls.reverse()` (no hardcoded URLs)
- Assert cookies in `response.cookies` AND client state
- Test with `APIClient(enforce_csrf_checks=True)`
- Validate cookie flags (HttpOnly, Secure, SameSite)

**Required Tests:**

1. **Password Authentication**: POST /api/auth/login/ with username+password
   - Login succeeds <200ms, JWT in HttpOnly cookie, CSRF token set, HTTP 200

2. **Social OAuth (Google)**: GET /accounts/google/login/ → OAuth redirect → callback
   - Redirects to Google (302), creates/logs in user, JWT set, social account linked

3. **Social OAuth (GitHub)**: Same as Google OAuth test

4. **CSRF Protection**: POST /api/user-movie-data/ without CSRF token
   - Returns 403, succeeds with X-CSRFToken header

5. **Token Refresh**: POST /api/auth/refresh/ with valid refresh token
   - New access token, expiry reset, refresh token rotated, expired token rejected (401)

6. **Logout**: POST /api/auth/logout/
   - Access/refresh cookies deleted, subsequent requests return 401, CSRF remains valid

7. **Email Verification**: Register → verify email → login
   - Email sent, link activates account, login succeeds after verification

8. **Email Uniqueness**: Register two users with same email
   - Second registration returns 400, database constraint prevents duplicates

**CI Requirements:** All 8 tests pass, >=85% coverage, <60s execution, runs in `.github/workflows/checks.yml`

```bash
# Run tests
docker compose exec backend python manage.py test authentication.tests.test_e2e --settings=config.settings_test

# With coverage
docker compose exec backend coverage run --source='authentication' manage.py test authentication.tests.test_e2e
docker compose exec backend coverage report --fail-under=85
```

## Open Questions

1. **Social account linking**: Standard Django practice and implementation effort?
2. **Email system integration**: Optimal integration between allauth and ZeptoMail?
3. **Error response format**: Global Django Ninja error handler now, or incrementally in Phase 2?
4. **Rate limiting library**: django-ratelimit vs django-defender?

---

## Implementation Notes

**Dependencies:**

- API-Layer-Modernization Phase 1 (Completed)
- Google/GitHub OAuth application setup
- Backend development environment
- Updated ZeptoMail integration contract shared with Backend Modernization and API Layer Phase 2 teams

**Blockers Resolved:**

- Django-stubs mypy --strict bug
- Type safety for Backend Modernization
- Authentication foundation for API-Layer-Modernization Phase 2

**Next Steps:**

1. Generate task breakdown
2. Create feature branch
3. Install/configure django-allauth
4. Fresh database migration
5. Implement E2E test suite
6. Validate type safety (mypy --strict, Pyright)
7. Document OAuth setup

**Related Documentation:**

- [Authentication Modernization Notes](../notes/notes-authentication-modernization.md)
- [API Layer Modernization P2 PRD](.arc/active/prd-api-layer-modernization-p2.md)
- [Backend Modernization PRD](.arc/upcoming/sub-prds/prd-backend-modernization.md)
