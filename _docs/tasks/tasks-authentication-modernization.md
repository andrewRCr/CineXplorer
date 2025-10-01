# Authentication Modernization - Task List

## Relevant Files

### Backend Core
- `backend/apps/accounts/models.py` - Custom User and EmailVerificationToken models to be removed
- `backend/apps/authentication/` - Authentication app that will be migrated to use django-allauth
- `backend/config/settings.py` - Remove AUTH_USER_MODEL, add allauth apps
- `backend/config/urls.py` - Add allauth URL patterns
- `backend/requirements.txt` - Add django-allauth dependency

### Django-allauth Integration
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
- `_docs/notes/notes-authentication-modernization.md` - Implementation notes and decisions
- `README.md` - Update OAuth setup instructions
- `_docs/PROJECT-STATUS.md` - Update feature status

## Tasks

- [ ] 1.0 Setup and Dependencies
  - [ ] 1.1 Create feature branch `feature/authentication-modernization`
  - [ ] 1.2 Add django-allauth to requirements.txt and install (`pip install django-allauth`)
  - [ ] 1.3 Create database backup: `pg_dump cinexplorer > backup_pre_auth_migration_$(date +%Y%m%d).sql`
  - [ ] 1.4 Document current admin credentials for recreation after migration
  - [ ] 1.5 Add OAuth environment variables to `.env.example` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)

- [ ] 2.0 Database Migration and User Model Cleanup
  - [ ] 2.1 Remove AUTH_USER_MODEL setting from `backend/config/settings.py`
  - [ ] 2.2 Create compatibility helper service to expose `email_verified` semantics via allauth's EmailAddress records
  - [ ] 2.3 Update all references to custom User model to use `django.contrib.auth.models.User`
  - [ ] 2.4 Remove custom User and EmailVerificationToken models from `backend/apps/accounts/models.py`
  - [ ] 2.5 Drop and recreate database: `docker compose exec dev-db psql -U postgres -c "DROP DATABASE cinexplorer; CREATE DATABASE cinexplorer;"`
  - [ ] 2.6 Run migrations: `docker compose exec backend python manage.py migrate`
  - [ ] 2.7 Create new superuser account with documented credentials

- [ ] 3.0 Django-allauth Integration
  - [ ] 3.1 Add allauth apps to INSTALLED_APPS in settings.py (django.contrib.sites, allauth, allauth.account, allauth.socialaccount, allauth.socialaccount.providers.google, allauth.socialaccount.providers.github)
  - [ ] 3.2 Configure allauth settings in settings.py (SITE_ID, ACCOUNT_EMAIL_VERIFICATION, ACCOUNT_AUTHENTICATION_METHOD, etc.)
  - [ ] 3.3 Add allauth URL patterns to `backend/config/urls.py`
  - [ ] 3.4 Configure Sites framework with correct domain (localhost:8444 for dev)
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

- [ ] 7.0 Testing and Quality Assurance
  - [ ] 7.1 Create test fixtures in `backend/apps/authentication/tests/fixtures.py`
  - [ ] 7.2 Implement mock OAuth providers in `backend/apps/authentication/tests/test_oauth_mocks.py`
  - [ ] 7.3 Write E2E test for password authentication
  - [ ] 7.4 Write E2E test for Google OAuth flow
  - [ ] 7.5 Write E2E test for GitHub OAuth flow
  - [ ] 7.6 Write E2E test for CSRF protection
  - [ ] 7.7 Write E2E test for token refresh
  - [ ] 7.8 Write E2E test for logout
  - [ ] 7.9 Write E2E test for email verification
  - [ ] 7.10 Write E2E test for email uniqueness constraint
  - [ ] 7.11 Run all tests with coverage and verify >= 85% coverage
  - [ ] 7.12 Verify all tests complete in < 60 seconds

- [ ] 8.0 Documentation and Deployment Preparation
  - [ ] 8.1 Update README.md with OAuth setup instructions
  - [ ] 8.2 Document OAuth app configuration in `_docs/notes/notes-authentication-modernization.md`
  - [ ] 8.3 Update `_docs/PROJECT-STATUS.md` to reflect completed authentication modernization
  - [ ] 8.4 Add social login buttons to `frontend/src/pages/user/Login.tsx`
  - [ ] 8.5 Update frontend authentication service if endpoint changes are needed
  - [ ] 8.6 Test complete authentication flow end-to-end in development environment
  - [ ] 8.7 Verify all quality gates pass (tests, linting, type checking)
  - [ ] 8.8 Prepare deployment notes for production OAuth configuration
