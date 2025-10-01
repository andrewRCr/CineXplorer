# Authentication Modernization - Task List

## Relevant Files

### Backend Core
- `backend/apps/accounts/models.py` - Custom User and EmailVerificationToken models removed (migration complete)
- `backend/apps/accounts/admin.py` - Custom admin configurations removed (using Django defaults)
- `backend/apps/authentication/` - Authentication app that will be migrated to use django-allauth
- `backend/apps/authentication/views.py` - Email verification endpoint temporarily stubbed (Task 5.0 will integrate with allauth)
- `backend/apps/core/services/email_service.py` - Email verification method temporarily stubbed (Task 5.0 will integrate with allauth)
- `backend/config/settings.py` - Remove AUTH_USER_MODEL, add allauth apps
- `backend/config/urls.py` - Add allauth URL patterns
- `backend/requirements/req.txt` - Add django-allauth dependency
- `backend/config/.env` - Updated with new database credentials and OAuth variables
- `backend/config/.env.example` - Template for environment variables
- `infrastructure/docker-compose.yml` - Updated database credentials to cinexplorer_dev/cinexplorer_user
- `infrastructure/docker-compose.ci.yml` - Documented intentional CI credential differences

### Django-allauth Integration
- `backend/apps/authentication/email_verification.py` - Compatibility service for email_verified semantics via allauth EmailAddress
- `backend/apps/authentication/adapters.py` - Custom allauth adapter for ZeptoMail integration
- `backend/apps/authentication/auth_ninja.py` - Update JWT auth to work with default User model
- `backend/templates/account/` - Allauth email templates with CineXplorer branding

### Type Checking & CI/CD
- `backend/scripts/type_check.py` - Enable mypy --strict execution
- `backend/mypy.ini` - Update configuration for strict mode
- `.github/workflows/checks.yml` - Update CI to run mypy --strict

### OAuth Configuration
- `backend/config/.env.example` - Add OAuth client ID/secret variables
- `backend/apps/authentication/admin.py` - Configure Sites and SocialApp models

### Testing
- `backend/apps/authentication/tests/test_e2e.py` - New comprehensive E2E test suite
- `backend/apps/authentication/tests/fixtures.py` - Test fixtures for authentication scenarios
- `backend/apps/authentication/tests/test_oauth_mocks.py` - Mock OAuth providers

### Frontend Updates
- `frontend/src/pages/user/Login.tsx` - Add social login buttons
- `frontend/src/pages/user/Register.tsx` - Update for allauth endpoints
- `frontend/src/services/authService.ts` - Update API endpoints if needed

### Documentation
- `_docs/notes/notes-authentication-modernization.md` - Implementation notes and decisions (transient, not committed)
- `README.md` - Update OAuth setup instructions
- `_docs/PROJECT-STATUS.md` - Update feature status

## Tasks

- [x] 1.0 Setup and Dependencies
  - [x] 1.1 Create feature branch `feature/authentication-modernization`
  - [x] 1.2 Add django-allauth to requirements.txt and install (`pip install django-allauth`)
  - [x] 1.3 Create database backup: `pg_dump cinexplorer > backup_pre_auth_migration_$(date +%Y%m%d).sql`
  - [x] 1.4 Document current admin credentials for recreation after migration
  - [x] 1.5 Add OAuth environment variables to `.env.example` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)

- [x] 2.0 Database Migration and User Model Cleanup
  - [x] 2.1 Remove AUTH_USER_MODEL setting from `backend/config/settings.py`
  - [x] 2.2 Create compatibility helper service to expose `email_verified` semantics via allauth's EmailAddress records
  - [x] 2.3 Update all references to custom User model to use `django.contrib.auth.models.User`
  - [x] 2.4 Remove custom User and EmailVerificationToken models from `backend/apps/accounts/models.py`
  - [x] 2.5 Update database naming in `.env` and `docker-compose.yml` to use `cinexplorer_dev` / `cinexplorer_user` / `cinexplorer_dev_pass`
  - [x] 2.6 Drop old database and recreate with new credentials (executed via volume wipe)
  - [x] 2.7 Database automatically created by Postgres with new credentials from docker-compose.yml
  - [x] 2.8 Run migrations: `docker compose -f infrastructure/docker-compose.yml exec backend python manage.py migrate`
  - [x] 2.9 Create new superuser account: `admin` / `admin@localhost` (documented credentials)

- [ ] 3.0 Django-allauth Integration
  - [x] 3.1 Add allauth apps to INSTALLED_APPS in settings.py (django.contrib.sites, allauth, allauth.account, allauth.socialaccount, allauth.socialaccount.providers.google, allauth.socialaccount.providers.github)
  - [x] 3.2 Configure allauth settings in settings.py (SITE_ID, ACCOUNT_EMAIL_VERIFICATION, ACCOUNT_LOGIN_METHODS, ACCOUNT_SIGNUP_FIELDS, etc.)
  - [x] 3.3 Add allauth URL patterns to `backend/config/urls.py`
  - [x] 3.4 Configure Sites framework with correct domain (localhost:8444 for dev) and run allauth migrations
  - [ ] 3.5 Update JWTCookieAuth class in `backend/apps/authentication/auth_ninja.py` to work with default User model
  - [ ] 3.6 Verify existing authentication endpoints remain compatible

- [ ] 4.0 OAuth Provider Configuration
  - [ ] 4.1 Create Google Cloud OAuth 2.0 credentials and configure redirect URI
  - [ ] 4.2 Create GitHub OAuth App and configure callback URL
  - [ ] 4.3 Create SocialApp entries in Django admin for Google provider
  - [ ] 4.4 Create SocialApp entries in Django admin for GitHub provider
  - [ ] 4.5 Test OAuth flow for Google authentication
  - [ ] 4.6 Test OAuth flow for GitHub authentication
  - [ ] 4.7 Document test accounts for demo purposes

- [ ] 5.0 Email System Integration
  - [ ] 5.1 Create custom allauth adapter in `backend/apps/authentication/adapters.py` subclassing DefaultAccountAdapter
  - [ ] 5.2 Override send_mail() method to use ZeptoMail service
  - [ ] 5.3 Override send_confirmation_mail() for email verification
  - [ ] 5.4 Override password reset email method
  - [ ] 5.5 Configure ACCOUNT_ADAPTER setting to use custom adapter
  - [ ] 5.6 Create allauth email templates in `backend/templates/account/` with CineXplorer branding
  - [ ] 5.7 Test email verification flow with ZeptoMail
  - [ ] 5.8 Verify dev-mode email logging continues to function

- [ ] 6.0 Type Safety Verification
  - [ ] 6.1 Update `backend/scripts/type_check.py` to enable mypy execution
  - [ ] 6.2 Add --strict flag to mypy command in type_check.py
  - [ ] 6.3 Remove any mypy skip/workaround branches from type_check.py
  - [ ] 6.4 Run `python backend/scripts/type_check.py` and verify 0 errors from Pyright
  - [ ] 6.5 Run `docker compose exec backend mypy apps/ --strict` and verify 0 errors
  - [ ] 6.6 Document any django-allauth type stub limitations
  - [ ] 6.7 Update `.github/workflows/checks.yml` to call updated type_check.py script
  - [ ] 6.8 Verify no increase in `type: ignore` comments

- [ ] 7.0 Comprehensive Testing, Type Safety, and Quality Assurance
  - [ ] 7.1 Create test fixtures in `backend/apps/authentication/tests/fixtures.py`
  - [ ] 7.2 Implement mock OAuth providers in `backend/apps/authentication/tests/test_oauth_mocks.py`
  - [ ] 7.3 Write E2E test for password authentication (username and email login)
  - [ ] 7.4 Write E2E test for Google OAuth flow (complete redirect and callback)
  - [ ] 7.5 Write E2E test for GitHub OAuth flow (complete redirect and callback)
  - [ ] 7.6 Write E2E test for CSRF protection (authenticated endpoints)
  - [ ] 7.7 Write E2E test for JWT token refresh (rotation and expiry)
  - [ ] 7.8 Write E2E test for logout (cookie clearing and invalidation)
  - [ ] 7.9 Write E2E test for email verification (allauth EmailAddress flow)
  - [ ] 7.10 Write E2E test for email uniqueness constraint (allauth enforcement)
  - [ ] 7.11 Write E2E test for password reset flow (allauth implementation)
  - [ ] 7.12 Review and update existing authentication tests for allauth compatibility
  - [ ] 7.13 Verify all authentication endpoints have test coverage (registration, login, logout, refresh, verify-email)
  - [ ] 7.14 Test user profile endpoints with default User model (GET/PATCH user data)
  - [ ] 7.15 Run full authentication test suite and verify 100% pass rate
  - [ ] 7.16 Run authentication tests with coverage: verify >= 90% for authentication app
  - [ ] 7.17 Verify all authentication tests complete in < 60 seconds
  - [ ] 7.18 Run full backend test suite (all apps) and verify 100% pass rate
  - [ ] 7.19 Verify zero type errors in authentication module (Pyright + mypy --strict)
  - [ ] 7.20 Document any unavoidable type: ignore comments with rationale
  - [ ] 7.21 Test authentication with frontend integration (manual smoke test)

- [ ] 8.0 Code Cleanup and Final Documentation
  - [ ] 8.1 Remove temporary email verification bridge (`backend/apps/authentication/email_verification.py`)
  - [ ] 8.2 Replace all `email_verification_service` calls with direct allauth EmailAddress API
  - [ ] 8.3 Remove all EmailVerificationToken references from views, admin, email_service
  - [ ] 8.4 Verify no references to custom User model or EmailVerificationToken remain
  - [ ] 8.5 Remove CustomUserModelBackend if replaced by allauth authentication backend
  - [ ] 8.6 Verify no dead code or unused imports remain
  - [ ] 8.7 Update README.md with OAuth setup instructions
  - [ ] 8.8 Update `_docs/PROJECT-STATUS.md` to reflect completed authentication modernization
  - [ ] 8.9 Add social login buttons to `frontend/src/pages/user/Login.tsx`
  - [ ] 8.10 Update frontend authentication service if endpoint changes are needed
  - [ ] 8.11 Test complete authentication flow end-to-end in development environment
  - [ ] 8.12 Verify all quality gates pass (tests, linting, type checking)
  - [ ] 8.13 Prepare deployment notes for production OAuth configuration
