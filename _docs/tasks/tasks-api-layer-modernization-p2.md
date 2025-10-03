# Tasks: API Layer Modernization Phase 2

**Feature:** Complete Django Ninja Migration (UserMovieData + Authentication Domains)
**PRD:** `_docs/sub-prds/prd-api-layer-modernization-p2.md`
**Branch:** `feature/api-layer-modernization-p2`
**Status:** In Progress

## Overview

This task list implements Phase 2 of the API Layer Modernization, completing the migration from Django REST Framework to Django Ninja. It follows the **ModelSchema blueprint** established in Phase 1, ensuring type-safe Django model CRUD operations with zero unnecessary `type: ignore` comments.

**Key Patterns from Phase 1:**

```python
# Schema Pattern: ModelSchema for Django model CRUD operations
class UserMovieDataModelSchema(ModelSchema):
    class Meta:
        model = UserMovieData
        fields = ["id", "user_watched", ...]

# Schema Pattern: Manual Schema for input DTOs with non-model fields
class UserMovieDataCreateSchema(Schema):
    movie_id: int  # Not on model, requires lookup
    # ... other fields

# Authentication Pattern: get_current_user for type-safe auth access
from authentication.auth_ninja import get_current_user

@router.post("/")
def create_entry(request: HttpRequest, payload: CreateSchema):
    user = get_current_user(request)  # Zero type: ignore needed
    # ... endpoint logic
```

## Relevant Files

### Backend - UserMovieData Domain

- `backend/apps/user_movie_data/models.py` - UserMovieData model (unchanged)
- `backend/apps/user_movie_data/schemas.py` - Pydantic schemas with ModelSchema pattern (COMPLETED)
- `backend/apps/user_movie_data/api.py` - Django Ninja router with 4 endpoints (COMPLETED)
- `backend/config/api.py` - Updated to register user_movie_data_router (COMPLETED)
- `backend/apps/user_movie_data/views.py` - DRF views (TO BE REMOVED)
- `backend/apps/user_movie_data/serializers.py` - DRF serializers (TO BE REMOVED)
- `backend/apps/user_movie_data/tests/test_user_movie_data_ninja.py` - Django Ninja tests (TO BE CREATED)

### Backend - Authentication Domain

- `backend/apps/authentication/auth_ninja.py` - JWTCookieAuth class (already exists)
- `backend/apps/authentication/schemas.py` - Pydantic schemas for auth endpoints (TO BE CREATED)
- `backend/apps/authentication/api.py` - Django Ninja router for auth endpoints (TO BE CREATED)
- `backend/apps/authentication/views.py` - DRF views (9 endpoints, TO BE REMOVED)
- `backend/apps/authentication/serializers.py` - DRF serializers (TO BE REMOVED)
- `backend/apps/authentication/email_verification.py` - Bridge to be removed (deferred from Auth Modernization)
- `backend/apps/authentication/adapters.py` - CustomAccountAdapter with ZeptoMail (unchanged)
- `backend/apps/authentication/tests/test_auth_ninja.py` - Django Ninja auth tests (TO BE CREATED)

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

### Phase 1: UserMovieData Domain Migration

- [x] 1.1 Create UserMovieData schemas with ModelSchema pattern
    - [x] 1.1.1 Create `backend/apps/user_movie_data/schemas.py`
    - [x] 1.1.2 Implement `UserMovieDataModelSchema(ModelSchema)` for base model fields
    - [x] 1.1.3 Implement `UserMovieDataDetailSchema(ModelSchema)` with computed `tmdb_id` and `title` from `obj.movie`
    - [x] 1.1.4 Implement `UserMovieDataCreateSchema(Schema)` with `movie_id: int` field (manual Schema, not on model)
    - [x] 1.1.5 Implement `UserMovieDataUpdateSchema(Schema)` with all optional fields for PATCH (manual Schema)
    - [x] 1.1.6 Add proper `__all__` export list
    - [x] 1.1.7 Run incremental quality checks (ruff, pyright on modified file)

- [x] 1.2 Create UserMovieData Django Ninja router
    - [x] 1.2.1 Create `backend/apps/user_movie_data/api.py` with `user_movie_data_router`
    - [x] 1.2.2 Implement `GET /by-tmdb-id/?tmdb_id={id}` endpoint (returns 404 if not found)
    - [x] 1.2.3 Implement `POST /` endpoint (create new entry, requires movie_id lookup)
    - [x] 1.2.4 Implement `PATCH /{pk}/` endpoint (update existing entry, partial)
    - [x] 1.2.5 Implement `DELETE /{pk}/` endpoint (remove entry, 204 response)
    - [x] 1.2.6 Add authentication (`auth=JWTCookieAuth()`) to all endpoints
    - [x] 1.2.7 Add proper docstrings and type annotations
    - [x] 1.2.8 Run incremental quality checks (ruff, pyright on modified file)

- [x] 1.3 Register UserMovieData router and verify endpoints
    - [x] 1.3.1 Update `backend/config/urls.py` to register `user_movie_data_router`
    - [x] 1.3.2 Verify router imports successfully in Django context
    - [x] 1.3.3 Run incremental quality checks (ruff, mypy on modified files)

### Phase 2: Authentication Domain Migration - Core Endpoints

- [ ] 2.1 Create Authentication schemas with appropriate patterns
    - [ ] 2.1.1 Create `backend/apps/authentication/schemas.py`
    - [ ] 2.1.2 Implement registration schemas (input/response) using manual `Schema` (no direct model mapping)
    - [ ] 2.1.3 Implement JWT token schemas (obtain, refresh, response) using manual `Schema`
    - [ ] 2.1.4 Implement user profile schemas - use `ModelSchema` if direct User model mapping, else manual `Schema`
    - [ ] 2.1.5 Implement CSRF token schema (simple response)
    - [ ] 2.1.6 Implement logout response schema (simple response)
    - [ ] 2.1.7 Add proper `__all__` export list
    - [ ] 2.1.8 Run incremental quality checks (ruff, pyright on modified file)

- [ ] 2.2 Migrate registration endpoints to Django Ninja
    - [ ] 2.2.1 Create `backend/apps/authentication/api.py` with `auth_router`
    - [ ] 2.2.2 Migrate `RegisterAPIView` to `POST /register/` (create user, trigger email verification via CustomAccountAdapter)
    - [ ] 2.2.3 Migrate `CreateUserView` to appropriate endpoint (verify if duplicate or different purpose)
    - [ ] 2.2.4 Ensure allauth `send_email_confirmation()` is invoked for new registrations
    - [ ] 2.2.5 Add proper error handling (duplicate email, validation errors)
    - [ ] 2.2.6 Run incremental quality checks (ruff, pyright on modified files)

- [ ] 2.3 Migrate JWT token endpoints to Django Ninja
    - [ ] 2.3.1 Migrate `JWTCookieTokenObtainPairView` to `POST /token/` (obtain JWT, set httponly cookies)
    - [ ] 2.3.2 Migrate `JWTCookieTokenRefreshView` to `POST /token/refresh/` (refresh JWT, set httponly cookies)
    - [ ] 2.3.3 Ensure cookie attributes match existing implementation (httponly, secure, samesite)
    - [ ] 2.3.4 Verify CORS/CSRF compatibility with cookie handling
    - [ ] 2.3.5 Run incremental quality checks (ruff, pyright on modified files)

- [ ] 2.4 Migrate logout and CSRF endpoints to Django Ninja
    - [ ] 2.4.1 Migrate `LogOutAPIView` to `POST /logout/` (clear JWT cookies, blacklist token if applicable)
    - [ ] 2.4.2 Migrate `CsrfTokenView` to `GET /csrf/` (return CSRF token for AJAX requests)
    - [ ] 2.4.3 Verify logout properly clears authentication state
    - [ ] 2.4.4 Run incremental quality checks (ruff, pyright on modified files)

- [ ] 2.5 Migrate user profile endpoint to Django Ninja
    - [ ] 2.5.1 Migrate `ManageUserView` to `GET /profile/` and `PATCH /profile/` (retrieve/update user profile)
    - [ ] 2.5.2 Use `ModelSchema` if mapping directly to User model fields, else manual `Schema`
    - [ ] 2.5.3 Ensure `email_verified` field computed from allauth EmailAddress API
    - [ ] 2.5.4 Ensure `full_name` field properly mapped (User model or computed)
    - [ ] 2.5.5 Add authentication requirement (`auth=JWTCookieAuth()`)
    - [ ] 2.5.6 Run incremental quality checks (ruff, pyright on modified files)

- [ ] 2.6 Register authentication router and verify endpoints
    - [ ] 2.6.1 Update `backend/config/urls.py` to register `auth_router`
    - [ ] 2.6.2 Verify `/api/docs` shows all migrated authentication endpoints
    - [ ] 2.6.3 Verify `/api/openapi.json` includes authentication schemas
    - [ ] 2.6.4 Test registration flow manually (register → email verification link → verify)
    - [ ] 2.6.5 Test JWT token flow manually (obtain → use → refresh)
    - [ ] 2.6.6 Test logout flow manually
    - [ ] 2.6.7 Run incremental quality checks (ruff, pyright on modified files)

### Phase 3: Authentication Domain Migration - Email Verification Bridge Removal

- [ ] 3.1 Remove email verification bridge (deferred from Authentication Modernization)
    - [ ] 3.1.1 Audit all usages of `email_verification_service` in codebase (grep)
    - [ ] 3.1.2 Migrate `EmailVerificationView` to Django Ninja using allauth `EmailAddress` API directly
    - [ ] 3.1.3 Replace `email_verification_service.verify_email()` with `EmailAddress.objects.filter(user=user, verified=True).exists()`
    - [ ] 3.1.4 Migrate `ResendVerificationView` to Django Ninja invoking `send_email_confirmation()` via allauth
    - [ ] 3.1.5 Remove `email_verification_service` bridge from `email_service.py` stubbed methods
    - [ ] 3.1.6 Delete `backend/apps/authentication/email_verification.py`
    - [ ] 3.1.7 Verify no remaining references to deleted bridge (grep confirmation)
    - [ ] 3.1.8 Run incremental quality checks (ruff, pyright on modified files)

- [ ] 3.2 Remove all type: ignore comments from authentication module
    - [ ] 3.2.1 Audit all `type: ignore` comments in `authentication/` directory (grep)
    - [ ] 3.2.2 Remove `type: ignore` from email_verification.py references (file deleted)
    - [ ] 3.2.3 Remove DRF-related `type: ignore` comments (DRF replaced with Django Ninja)
    - [ ] 3.2.4 Verify remaining `type: ignore` comments are justified (Django internals only)
    - [ ] 3.2.5 Run full type checking on authentication domain (Pyright + MyPy --strict)
    - [ ] 3.2.6 Fix any type errors revealed by removing `type: ignore` comments
    - [ ] 3.2.7 Achieve zero type errors in authentication domain

### Phase 4: Frontend Integration and Type Generation

- [ ] 4.1 Generate TypeScript types from OpenAPI schema
    - [ ] 4.1.1 Run `npm run generate-types` to update `shared/api-types.ts`
    - [ ] 4.1.2 Verify UserMovieData types generated correctly
    - [ ] 4.1.3 Verify authentication types generated correctly
    - [ ] 4.1.4 Fix any type generation issues (schema corrections if needed)
    - [ ] 4.1.5 Run frontend type checking (`npm run type-check`)

- [ ] 4.2 Update UserMovieData frontend service
    - [ ] 4.2.1 Update `frontend/src/services/userMovieDataService.ts` to use new Django Ninja endpoints
    - [ ] 4.2.2 Replace DRF endpoint URLs with Django Ninja URLs
    - [ ] 4.2.3 Update request/response types to use auto-generated types
    - [ ] 4.2.4 Verify error handling matches Django Ninja error responses
    - [ ] 4.2.5 Run frontend type checking (`npm run type-check`)
    - [ ] 4.2.6 Run incremental frontend linting (`npm run lint` on modified files)

- [ ] 4.3 Update authentication frontend service
    - [ ] 4.3.1 Update `frontend/src/services/authService.ts` to use new Django Ninja endpoints
    - [ ] 4.3.2 Replace DRF endpoint URLs with Django Ninja URLs
    - [ ] 4.3.3 Update request/response types to use auto-generated types
    - [ ] 4.3.4 Verify JWT cookie handling works correctly (httponly cookies, CORS)
    - [ ] 4.3.5 Run frontend type checking (`npm run type-check`)
    - [ ] 4.3.6 Run incremental frontend linting (`npm run lint` on modified files)

- [ ] 4.4 Add OAuth login buttons to frontend (deferred from Authentication Modernization)
    - [ ] 4.4.1 Update `frontend/src/pages/auth/Login.tsx` to add Google login button
    - [ ] 4.4.2 Update `frontend/src/pages/auth/Login.tsx` to add GitHub login button
    - [ ] 4.4.3 Implement OAuth redirect handling (redirect to `/accounts/google/login/` and `/accounts/github/login/`)
    - [ ] 4.4.4 Verify button styling matches existing design system
    - [ ] 4.4.5 Run incremental frontend linting and type checking

- [ ] 4.5 Update AuthContext for OAuth flows (deferred from Authentication Modernization)
    - [ ] 4.5.1 Update `frontend/src/contexts/AuthContext.tsx` to handle OAuth redirect callbacks
    - [ ] 4.5.2 Implement OAuth success callback handling (extract tokens, update auth state)
    - [ ] 4.5.3 Implement OAuth error callback handling (display errors, redirect to login)
    - [ ] 4.5.4 Ensure consistent UX between OAuth and password authentication flows
    - [ ] 4.5.5 Run incremental frontend linting and type checking

- [ ] 4.6 Verify frontend integration end-to-end
    - [ ] 4.6.1 Manual test: User registration with password → email verification → login
    - [ ] 4.6.2 Manual test: User login with Google OAuth → redirect → authenticated
    - [ ] 4.6.3 Manual test: User login with GitHub OAuth → redirect → authenticated
    - [ ] 4.6.4 Manual test: User movie data CRUD (add to watchlist, rate, review, delete)
    - [ ] 4.6.5 Manual test: User profile retrieval and updates
    - [ ] 4.6.6 Manual test: JWT token refresh flow
    - [ ] 4.6.7 Manual test: Logout flow (cookies cleared, unauthenticated state)

### Phase 5: Testing Migration and Quality Gates

- [ ] 5.1 Create UserMovieData Django Ninja tests
    - [ ] 5.1.1 Create `backend/apps/user_movie_data/tests/test_user_movie_data_ninja.py`
    - [ ] 5.1.2 Implement test for `GET /by-tmdb-id/` (authenticated, returns 404 if not found)
    - [ ] 5.1.3 Implement test for `POST /` (create entry, requires movie_id)
    - [ ] 5.1.4 Implement test for `PATCH /{pk}/` (update entry, partial updates)
    - [ ] 5.1.5 Implement test for `DELETE /{pk}/` (remove entry, 204 response)
    - [ ] 5.1.6 Implement test for authentication requirement (401 if unauthenticated)
    - [ ] 5.1.7 Implement test for user isolation (user A cannot access user B's data)
    - [ ] 5.1.8 Run user_movie_data tests (`python manage.py test apps.user_movie_data --settings=config.settings_test`)

- [ ] 5.2 Create authentication Django Ninja tests (deferred from Authentication Modernization)
    - [ ] 5.2.1 Create `backend/apps/authentication/tests/test_auth_ninja.py`
    - [ ] 5.2.2 Implement password authentication tests (register, login, token obtain)
    - [ ] 5.2.3 Implement CSRF protection tests (CSRF token required for state-changing operations)
    - [ ] 5.2.4 Implement JWT token refresh tests (refresh token flow, cookie handling)
    - [ ] 5.2.5 Implement logout tests (cookies cleared, token blacklisted if applicable)
    - [ ] 5.2.6 Implement email verification tests (send verification, verify email, resend)
    - [ ] 5.2.7 Implement email uniqueness tests (duplicate email rejected)
    - [ ] 5.2.8 Implement password reset tests (request reset, verify token, reset password)
    - [ ] 5.2.9 Run authentication tests (`python manage.py test apps.authentication --settings=config.settings_test`)

- [ ] 5.3 Verify OAuth test infrastructure (deferred from Authentication Modernization)
    - [ ] 5.3.1 Verify `authentication/tests/fixtures.py` provides OAuth fixtures
    - [ ] 5.3.2 Verify `authentication/tests/test_oauth_mocks.py` provides Google/GitHub mocks
    - [ ] 5.3.3 Implement OAuth flow tests using existing fixtures (Google login, GitHub login)
    - [ ] 5.3.4 Verify OAuth error handling tests (invalid token, network error)
    - [ ] 5.3.5 Run OAuth tests (`python manage.py test apps.authentication.tests.test_oauth_mocks --settings=config.settings_test`)

- [ ] 5.4 Run full quality gate checks
    - [ ] 5.4.1 Run full backend test suite (`docker compose exec backend python manage.py test --settings=config.settings_test`)
    - [ ] 5.4.2 Run full frontend test suite (`docker compose exec frontend npm test`)
    - [ ] 5.4.3 Run backend linting (`docker compose exec backend ruff check apps/ config/`)
    - [ ] 5.4.4 Run frontend linting (`docker compose exec frontend npm run lint`)
    - [ ] 5.4.5 Run frontend type checking (`docker compose exec frontend npm run type-check`)
    - [ ] 5.4.6 Run backend type checking - Pyright (`npx pyright backend/apps/user_movie_data backend/apps/authentication`)
    - [ ] 5.4.7 Run backend type checking - MyPy strict (`docker compose exec backend mypy apps/user_movie_data apps/authentication --strict --config-file mypy.ini`)
    - [ ] 5.4.8 Run markdown linting (`npx markdownlint-cli2 "**/*.md"`)
    - [ ] 5.4.9 Verify 100% test pass rate and zero linting/type errors

### Phase 6: Documentation and Cleanup

- [ ] 6.1 Remove old DRF files
    - [ ] 6.1.1 Delete `backend/apps/user_movie_data/views.py`
    - [ ] 6.1.2 Delete `backend/apps/user_movie_data/serializers.py`
    - [ ] 6.1.3 Delete `backend/apps/authentication/views.py`
    - [ ] 6.1.4 Delete `backend/apps/authentication/serializers.py`
    - [ ] 6.1.5 Delete `backend/apps/user_movie_data/urls.py` (if DRF-specific)
    - [ ] 6.1.6 Delete `backend/apps/authentication/urls.py` (if DRF-specific, preserve allauth URLs)
    - [ ] 6.1.7 Verify no remaining imports of deleted modules (grep confirmation)

- [ ] 6.2 Update URL configuration
    - [ ] 6.2.1 Remove DRF URL patterns from `backend/config/urls.py` (user_movie_data)
    - [ ] 6.2.2 Remove DRF URL patterns from `backend/config/urls.py` (authentication)
    - [ ] 6.2.3 Verify allauth URLs preserved at `/accounts/*`
    - [ ] 6.2.4 Verify all Django Ninja routers registered correctly
    - [ ] 6.2.5 Test URL resolution (`python manage.py show_urls` or equivalent)

- [ ] 6.3 Verify unified API documentation
    - [ ] 6.3.1 Start development server (`docker compose up`)
    - [ ] 6.3.2 Access `/api/docs` (Swagger UI) and verify all endpoints visible
    - [ ] 6.3.3 Verify UserMovieData endpoints documented with correct schemas
    - [ ] 6.3.4 Verify authentication endpoints documented with correct schemas
    - [ ] 6.3.5 Access `/api/openapi.json` and verify complete OpenAPI schema
    - [ ] 6.3.6 Verify schema includes all request/response models

- [ ] 6.4 Update task list and generate readiness report
    - [ ] 6.4.1 Mark all sub-tasks complete in this file
    - [ ] 6.4.2 Update "Relevant Files" section with final file list
    - [ ] 6.4.3 Generate standardized readiness report per DEVELOPMENT-RULES.md
    - [ ] 6.4.4 Include summary of work completed, quality gate results, next steps
    - [ ] 6.4.5 Await user approval for commit/PR creation

- [ ] 6.5 Update PROJECT-STATUS
    - [ ] 6.5.1 Update `_docs/PROJECT-STATUS.md` to reflect Phase 2 completion
    - [ ] 6.5.2 Move API Layer Modernization Phase 2 from "In Progress" to "Completed"
    - [ ] 6.5.3 Update feature progress milestones
    - [ ] 6.5.4 Document any newly completed functionality
    - [ ] 6.5.5 Update priorities if applicable

## Notes

- **ModelSchema Usage:** UserMovieData CRUD endpoints use `ModelSchema` for automatic schema generation from Django models. Type safety is provided by custom `.pyi` stub files (not django-stubs field inference), which give type checkers explicit field type information.
- **Manual Schema Usage:** Create/Update schemas use manual `Schema` due to non-model fields (e.g., `movie_id` lookup)
- **Embedded Schema Unchanged:** `UserMovieDataSchema` in `movie/schemas.py` serves different purpose (embedding in movie responses), remains unchanged
- **Type Safety Implementation:** Custom `.pyi` stub files in `backend/apps/*/models.pyi` provide explicit type annotations for Django model fields, enabling zero `type: ignore` comments for model field access in ModelSchema patterns. See `_docs/reference/type-safety-strategy.md` for complete guidance.
- **Authentication Foundation:** All work builds on Authentication Modernization foundation (CustomAccountAdapter, allauth integration)
- **Deferred Work:** Email verification bridge removal and OAuth UI integration are deferred from Authentication Modernization
- **Testing Strategy:** Three-layer testing (API integration, service layer, specialized tests) per Phase 1 blueprint
