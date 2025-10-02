# Tasks: API Layer Modernization Phase 2

**Feature:** Complete Django Ninja Migration (UserMovieData + Authentication Domains)
**PRD:** `_docs/sub-prds/prd-api-layer-modernization-p2.md`
**Branch:** `feature/api-layer-modernization-p2`
**Status:** Planning

## Relevant Files

### Backend - UserMovieData Domain

- `backend/apps/user_movie_data/api.py` - New Django Ninja router for user movie data endpoints
- `backend/apps/user_movie_data/schemas.py` - Pydantic schemas replacing DRF serializers
- `backend/apps/user_movie_data/views.py` - DRF views to be removed after migration
- `backend/apps/user_movie_data/serializers.py` - DRF serializers to be removed after migration
- `backend/apps/user_movie_data/tests/test_user_movie_data_ninja.py` - Django Ninja tests

### Backend - Authentication Domain

- `backend/apps/authentication/api.py` - New Django Ninja router for authentication endpoints (may already exist as auth_ninja.py)
- `backend/apps/authentication/schemas.py` - Pydantic schemas for user management
- `backend/apps/authentication/views.py` - DRF views to be removed (9 endpoints)
- `backend/apps/authentication/serializers.py` - DRF serializers to be removed
- `backend/apps/authentication/email_verification.py` - Email bridge to be removed
- `backend/apps/authentication/tests/test_auth_ninja.py` - Django Ninja authentication tests

### Frontend

- `frontend/src/services/userMovieDataService.ts` - Update to use new endpoints
- `frontend/src/services/authService.ts` - Update to use new endpoints
- `frontend/src/pages/auth/Login.tsx` - Add OAuth login buttons
- `frontend/src/contexts/AuthContext.tsx` - Update for OAuth flows
- `shared/api-types.ts` - Auto-generated TypeScript types

### Configuration

- `backend/config/urls.py` - Update API router registration
- `scripts/generate_types.py` - Verify type generation includes all endpoints

## Tasks

- [ ] 1.0 UserMovieData Domain Migration
    - [ ] 1.1 Create `backend/apps/user_movie_data/schemas.py` with Pydantic models for user movie data operations
    - [ ] 1.2 Create `backend/apps/user_movie_data/api.py` with Django Ninja router
    - [ ] 1.3 Migrate user movie data ViewSet to Django Ninja path operations (rate, watchlist, watch status, reviews, favorites)
    - [ ] 1.4 Update URL routing to include user_movie_data router
    - [ ] 1.5 Run incremental quality checks (flake8, type checking on modified files)
    - [ ] 1.6 Verify all user movie data endpoints functional with existing frontend

- [ ] 2.0 Authentication Domain Migration - Part 1 (Core Endpoints)
    - [ ] 2.1 Create `backend/apps/authentication/schemas.py` with Pydantic models for registration, login, profile
    - [ ] 2.2 Migrate user registration endpoints (RegisterAPIView, CreateUserView) to Django Ninja
    - [ ] 2.3 Migrate JWT token endpoints (JWTCookieTokenObtainPairView, JWTCookieTokenRefreshView) to Django Ninja with cookie handling
    - [ ] 2.4 Migrate logout endpoint (LogOutAPIView) to Django Ninja
    - [ ] 2.5 Migrate CSRF token endpoint (CsrfTokenView) to Django Ninja
    - [ ] 2.6 Migrate user profile endpoint (ManageUserView) to Django Ninja
    - [ ] 2.7 Run incremental quality checks (flake8, type checking on modified files)

- [ ] 3.0 Authentication Domain Migration - Part 2 (Email Verification Bridge Removal)
    - [ ] 3.1 Migrate EmailVerificationView to Django Ninja using allauth EmailAddress API directly
    - [ ] 3.2 Migrate ResendVerificationView to Django Ninja invoking ZeptoMail via CustomAccountAdapter
    - [ ] 3.3 Remove email_verification_service bridge (`backend/apps/authentication/email_verification.py`)
    - [ ] 3.4 Update any remaining references to use allauth EmailAddress API
    - [ ] 3.5 Remove all type: ignore comments from authentication module (achieve zero type errors)
    - [ ] 3.6 Run full type checking (Pyright + MyPy --strict) on authentication domain
    - [ ] 3.7 Run incremental quality checks (flake8, type checking on modified files)

- [ ] 4.0 Frontend Integration and Type Generation
    - [ ] 4.1 Run `npm run generate-types` to update TypeScript types from OpenAPI schema
    - [ ] 4.2 Update `frontend/src/services/userMovieDataService.ts` to use new Django Ninja endpoints
    - [ ] 4.3 Update `frontend/src/services/authService.ts` to use new Django Ninja endpoints
    - [ ] 4.4 Add OAuth login buttons to `frontend/src/pages/auth/Login.tsx` (Google + GitHub)
    - [ ] 4.5 Update `frontend/src/contexts/AuthContext.tsx` to handle OAuth redirect flows
    - [ ] 4.6 Verify OAuth UX consistency with password authentication flows
    - [ ] 4.7 Run frontend type checking (`npm run type-check`) and fix any type errors
    - [ ] 4.8 Run incremental quality checks (frontend linting, type checking)

- [ ] 5.0 Testing Migration and Quality Gates
    - [ ] 5.1 Create `backend/apps/user_movie_data/tests/test_user_movie_data_ninja.py` with Django Ninja test patterns
    - [ ] 5.2 Migrate existing user movie data tests to Django Ninja patterns
    - [ ] 5.3 Create `backend/apps/authentication/tests/test_auth_ninja.py` for authentication endpoint tests
    - [ ] 5.4 Implement deferred authentication tests (password auth, CSRF, JWT refresh, logout, email verification, password reset)
    - [ ] 5.5 Verify OAuth test infrastructure works with migrated endpoints (using existing fixtures/mocks)
    - [ ] 5.6 Run full backend test suite (`python manage.py test --settings=config.settings_test`)
    - [ ] 5.7 Run full frontend test suite (`npm test`)
    - [ ] 5.8 Run all quality gates (flake8, Pyright, MyPy --strict, markdown linting)
    - [ ] 5.9 Verify 100% test pass rate and zero linting/type errors

- [ ] 6.0 Documentation and Cleanup
    - [ ] 6.1 Remove old DRF files (`views.py`, `serializers.py` from both domains)
    - [ ] 6.2 Update `backend/config/urls.py` to remove DRF URL patterns
    - [ ] 6.3 Verify `/api/docs` (Swagger UI) shows all migrated endpoints
    - [ ] 6.4 Verify `/api/openapi.json` includes complete API schema
    - [ ] 6.5 Update task list to mark all sub-tasks complete
    - [ ] 6.6 Generate standardized readiness report per DEVELOPMENT-RULES.md
    - [ ] 6.7 Update PROJECT-STATUS.md to reflect Phase 2 completion
