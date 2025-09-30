# Authentication Modernization - Sub-PRD

**Document Version:** 1.0  
**Created:** 2025-09-27  
**Feature Priority:** High (Critical Blocker Resolution)  
**Implementation Phase:** Between API-Layer-Modernization Phase 1 & Phase 2

## Introduction/Overview

This Sub-PRD defines the migration from custom User model authentication to django-allauth, eliminating the django-stubs mypy --strict bug while significantly enhancing the portfolio value through professional social authentication. This modernization unblocks comprehensive type checking, reduces demo friction for potential employers, and establishes industry-standard authentication patterns.

**Critical Context:** This addresses the django-stubs internal error (`AssertionError: Must not defer during final iteration`) that prevents mypy --strict mode, which is blocking the Backend Modernization Sub-PRD type safety objectives.

## Goals

1. **Eliminate django-stubs typing bug** by removing custom AUTH_USER_MODEL setting that triggers circular dependency in django-stubs plugin initialization
2. **Enable comprehensive type safety** by allowing mypy --strict mode without internal errors
3. **Enhance portfolio demonstration value** through professional social login reducing demo friction for recruiters/employers
4. **Preserve existing functionality** maintaining all current authentication features and user experience
5. **Maintain email verification system** integrating existing ZeptoMail service with allauth email management
6. **Establish foundation for scalability** providing industry-standard authentication platform for future features

## User Stories

1. **As a prospective employer reviewing the demo**, I want to sign in quickly with my Google/GitHub account so that I can evaluate the application without signup friction.

2. **As the developer**, I want to run mypy --strict on the entire codebase so that I can achieve comprehensive type safety and demonstrate professional Python practices.

3. **As an existing user**, I want to continue logging in with my username or email so that the authentication experience remains unchanged.

4. **As the developer**, I want to preserve the existing email verification workflow so that the branded ZeptoMail templates and tracking continue working.

5. **As a prospective employer**, I want to see industry-standard authentication implementation so that I can assess the developer's knowledge of professional Django patterns.

## Functional Requirements

### Core Authentication Migration

1. **The system must migrate from custom User model to default Django User model** eliminating the AUTH_USER_MODEL setting that triggers the django-stubs bug.

   **Migration Strategy: Fresh Database (Recommended for Demo)**

   Given this is a portfolio/demo project with development-only data, the migration will use a fresh database approach:

   **Prerequisites:**
   - Full database export/backup: `pg_dump cinexplorer > backup_pre_auth_migration_$(date +%Y%m%d).sql`
   - Schema snapshot: `python manage.py sqlmigrate <app> <migration_num> > schema_snapshot.sql`
   - Document current admin account credentials
   - Verify no production data exists

   **Migration Steps:**
   1. Create feature branch: `feature/authentication-modernization`
   2. Install django-allauth: `pip install django-allauth`
   3. Remove AUTH_USER_MODEL setting from settings.py
   4. Update INSTALLED_APPS to include allauth apps
   5. Drop existing database: `docker compose exec dev-db psql -U postgres -c "DROP DATABASE cinexplorer;"`
   6. Create fresh database: `docker compose exec dev-db psql -U postgres -c "CREATE DATABASE cinexplorer;"`
   7. Run migrations: `python manage.py migrate`
   8. Create new superuser: `python manage.py createsuperuser`
   9. Configure allauth settings and providers

   **Verification Checks (Post-Migration):**
   - ✅ Login with username succeeds
   - ✅ Login with email succeeds
   - ✅ Social auth (Google) returns OAuth redirect
   - ✅ Social auth (GitHub) returns OAuth redirect
   - ✅ Email verification flow sends verification email
   - ✅ Email uniqueness enforced at database level
   - ✅ JWT tokens generated and validated correctly
   - ✅ mypy --strict runs without django-stubs errors

   **Rollback Procedure:**
   If migration fails or issues discovered:
   1. Switch to main branch: `git checkout main`
   2. Stop containers: `docker compose down`
   3. Restore database: `docker compose exec -T dev-db psql -U postgres cinexplorer < backup_pre_auth_migration_*.sql`
   4. Restart containers: `docker compose up -d`
   5. Verify rollback: `python manage.py check` and test login
   6. Expected outcome: System returns to pre-migration state with custom User model

   **Alternative: In-Place Data Migration (NOT RECOMMENDED)**

   If production data existed (which it doesn't), an in-place migration would require:
   - Create reversible data migration to copy custom User → Django User
   - Map custom fields to default User model equivalents
   - Handle social account data separately
   - Test migration on staging DB copy
   - Maintain downtime window (estimated 5-10 minutes)
   - Risk: Complex migration with potential data loss

   Decision: Use fresh database approach for this demo/portfolio project.

2. **The system must implement django-allauth** providing username/email login functionality identical to the current custom backend.

3. **The system must support social authentication** for Google and GitHub OAuth to reduce demo friction.

4. **The system must preserve all existing user data** through data migration ensuring no user accounts are lost. *(Note: For demo environment, recreating test accounts with fresh database is acceptable and preferred.)*

5. **The system must maintain email verification functionality** integrating the existing ZeptoMail service through custom allauth adapters.

### Email System Integration

6. **The system must leverage allauth's authentication UX improvements** for both social and traditional login flows.

7. **The system must maintain ZeptoMail service integration** preserving email delivery, tracking, and development mode capabilities.

8. **The system must implement email template refresh** using allauth templates as starting point with CineXplorer branding opportunities.

9. **The system must configure custom allauth adapter** integrating with existing email_service.py infrastructure where beneficial.

### Type Safety & Development

9. **The system must enable mypy --strict mode** on all backend code without django-stubs internal errors.

10. **The system must maintain existing API contracts** ensuring no breaking changes to authentication endpoints.

11. **The system must update authentication serializers** to work with default User model while preserving JWT functionality.

### Social Authentication Setup

12. **The system must configure Google OAuth** for development environment (`localhost:8444`) with portfolio demonstration capabilities.

13. **The system must configure GitHub OAuth** for development environment appealing to developer/recruiter audiences.

14. **The system must implement social account linking** if standard Django practice and reasonable implementation effort.

15. **The system must document production OAuth setup** for future deployment configuration.

### Security & Compatibility

15. **The system must maintain JWT cookie authentication** preserving the existing secure token handling.

   **CSRF Protection Strategy for JWT Cookies:**

   The system uses JWT tokens stored in HTTP-only cookies, which requires explicit CSRF protection:

   **Enforcement Mechanism:**
   - Django's built-in CSRF middleware with CsrfViewMiddleware
   - DRF's SessionAuthentication-style CSRF checking for cookie-based auth
   - CSRF token passed via `X-CSRFToken` header (from `csrftoken` cookie)
   - Double-submit cookie pattern: CSRF token in cookie + header validation

   **Required Cookie Flags:**
   - `HttpOnly=True` - Prevents JavaScript access to JWT tokens
   - `Secure=True` - HTTPS-only transmission (enforced in production)
   - `SameSite=Lax` - Protects against CSRF while allowing normal navigation
     (Note: `SameSite=Strict` would break OAuth redirects)

   **CSRF Validation Flow:**
   1. GET `/api/auth/csrf/` returns CSRF token in `csrftoken` cookie
   2. Frontend reads CSRF token from cookie
   3. Frontend includes token in `X-CSRFToken` header for POST/PUT/DELETE
   4. Django CsrfViewMiddleware validates token matches cookie
   5. Requests without valid CSRF token return 403 Forbidden

   **Exempted Endpoints:**
   - `/api/auth/login/` - Public login endpoint (uses rate limiting instead)
   - `/api/auth/register/` - Public registration endpoint (uses rate limiting)
   - Social OAuth callbacks - Django-allauth handles CSRF for OAuth flows

16. **The system must preserve user profile functionality** maintaining first_name, last_name, and other user fields.

17. **The system must handle email_verified status** migrating or recreating this functionality using allauth's email address verification.

## Non-Goals (Out of Scope)

- **Additional social providers** beyond Google and GitHub (can be added later)
- **Password reset functionality** (allauth provides this automatically, but UI customization is deferred)
- **Account management UI** beyond basic allauth templates (customization is future work)
- **Two-factor authentication** (not required for current project scope)
- **Enterprise SSO** (not applicable to portfolio project)

## Design Considerations

- **Backward Compatibility**: All existing authentication functionality must continue working identically
- **Data Integrity**: User accounts, emails, and relationships must be preserved during migration
- **Email Branding**: Existing ZeptoMail templates and tracking must continue working
- **Type Safety**: The migration must enable mypy --strict mode throughout the backend
- **Portfolio Value**: Social login must provide seamless demo experience for recruiters

## Technical Considerations

### Implementation Strategy
- **Migration Approach**: Direct migration with thorough testing (existing user data is development/testing only)
- **Deployment Architecture**: Development OAuth setup for `localhost:8444` (Docker Compose + Caddy)
- **Production OAuth**: Deferred until deployment architecture is finalized
- **Admin Account**: Preserve core admin account data during migration

### Integration Details
- **Django-stubs Compatibility**: Using default User model eliminates the circular dependency bug
- **Email System Strategy**: Leverage allauth's low-friction UX while preserving ZeptoMail integration
- **Template Approach**: Start with standard allauth templates, opportunity for branding refresh
- **Social Account Linking**: Include if standard practice and not excessive effort
- **Testing Strategy**: Comprehensive flow testing for all authentication paths

## Success Metrics

### Primary Success Criteria
1. **Bug Resolution (Priority #1)**: mypy --strict runs without django-stubs internal errors
2. **Feature Parity**: All existing authentication features (username/email login, email verification) work identically
3. **Type Safety**: Comprehensive type checking enabled across backend

### Secondary Success Criteria
4. **Registration Friction Reduction**: Social login significantly reduces demo signup barriers
5. **Social Login**: Google and GitHub OAuth fully functional for development demonstration
6. **Email Integration**: ZeptoMail service continues working with enhanced UX
7. **Portfolio Enhancement**: Industry-standard authentication showcases professional Django patterns

### E2E Test Plan (Required for Merge)

All E2E tests must pass in CI before merge approval. Tests use Django's test client and REST framework test utilities.

**Test Environment Setup:**
- Test database with isolated schema
- Mock OAuth providers (Google, GitHub) using test credentials
- Email backend: django.core.mail.backends.locmem.EmailBackend (capture emails in memory)
- Test fixtures: 3 users (admin, verified user, unverified user)
- Social app configs: Test Google/GitHub OAuth apps

**Required E2E Tests:**

1. **E2E Login - Password Authentication**
   - **Test**: POST /api/auth/login/ with valid username + password
   - **Acceptance Criteria**:
     - Login succeeds within 200ms (p95)
     - Response includes JWT access token in HTTP-only cookie
     - Response includes CSRF token in csrftoken cookie
     - Response body contains user data (id, username, email)
     - HTTP 200 status code

2. **E2E Login - Social OAuth (Google)**
   - **Test**: GET /accounts/google/login/ → OAuth redirect → callback
   - **Acceptance Criteria**:
     - Redirect to Google OAuth consent page (HTTP 302)
     - OAuth callback creates new user if email not exists
     - OAuth callback logs in existing user if email matches
     - JWT token set after successful OAuth flow
     - Social account linked to user account

3. **E2E Login - Social OAuth (GitHub)**
   - **Test**: GET /accounts/github/login/ → OAuth redirect → callback
   - **Acceptance Criteria**: Same as Google OAuth test

4. **E2E CSRF Protection on Mutations**
   - **Test**: POST /api/user-movie-data/ without CSRF token
   - **Acceptance Criteria**:
     - Request returns 403 Forbidden
     - Error message indicates missing CSRF token
     - Request succeeds when X-CSRFToken header included
     - DELETE requests also protected by CSRF

5. **E2E Token Refresh and Expiry**
   - **Test**: POST /api/auth/refresh/ with valid refresh token
   - **Acceptance Criteria**:
     - New access token returned in HTTP-only cookie
     - Access token expiry resets to configured lifetime (15 minutes)
     - Refresh token rotated (new refresh token issued)
     - Expired access token rejected with 401 Unauthorized

6. **E2E Logout**
   - **Test**: POST /api/auth/logout/ with valid session
   - **Acceptance Criteria**:
     - Access token cookie deleted (Max-Age=0)
     - Refresh token cookie deleted
     - Subsequent requests with old token return 401
     - CSRF token remains valid (doesn't break CSRF)

7. **E2E Email Verification Flow**
   - **Test**: Register new user → verify email link → login
   - **Acceptance Criteria**:
     - Registration sends verification email
     - Email contains valid verification link
     - Clicking link activates account
     - Login succeeds after verification
     - Login fails before verification (if ACCOUNT_EMAIL_VERIFICATION='mandatory')
     - Email captured in test email backend

8. **E2E Email Uniqueness**
   - **Test**: Register two users with same email
   - **Acceptance Criteria**:
     - Second registration returns 400 Bad Request
     - Error message indicates duplicate email
     - Database constraint prevents duplicate emails

**CI Integration Requirements:**
- Tests run in `.github/workflows/checks.yml` backend job
- All 8 test scenarios must pass (0 failures)
- Test coverage for authentication module >= 85%
- Tests must complete within 60 seconds total
- Failure of any test blocks PR merge

**Test Execution Commands:**
```bash
# Run E2E auth tests
docker compose exec backend python manage.py test authentication.tests.test_e2e --settings=config.settings_test

# Run with coverage
docker compose exec backend coverage run --source='authentication' manage.py test authentication.tests.test_e2e
docker compose exec backend coverage report --fail-under=85
```

## Open Questions

1. **Social Account Linking Complexity**: Research required to determine if social account linking is standard Django practice and implementation effort involved.

2. **Email System Integration Details**: Technical analysis needed to determine optimal integration between allauth email system and existing ZeptoMail service.

3. **Admin Account Migration**: Define specific approach for preserving core admin account during User model migration.

4. **Production OAuth Timeline**: Coordinate OAuth production setup with deployment architecture decisions.

---

**Next Steps:**
1. Review and approve this Sub-PRD
2. Complete API-Layer-Modernization Task 5.0 (frontend integration)
3. Merge API-Layer-Modernization Phase 1 to main branch
4. Generate detailed task breakdown for Authentication Modernization
5. Create feature branch: `feature/authentication-modernization` from main
6. Begin implementation starting with foundation setup

**Dependencies:**
- API-Layer-Modernization Phase 1 completion (Task 5.0)
- Access to Google/GitHub OAuth application setup
- Backend development environment with existing user data

**Blockers Resolved:**
- Django-stubs mypy --strict bug (validated as eliminated by this approach)
- Type safety implementation for Backend Modernization Sub-PRD