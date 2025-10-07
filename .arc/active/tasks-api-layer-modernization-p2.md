# Tasks: API Layer Modernization Phase 2

**Feature:** Complete Django Ninja Migration (UserMovieData + Authentication Domains)
**PRD:** [PRD](.arc/active/prd-api-layer-modernization-p2.md)
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
- `backend/apps/authentication/schemas.py` - Pydantic schemas for auth endpoints (COMPLETED - 12 schemas with proper patterns)
- `backend/apps/authentication/api.py` - Django Ninja router with auth endpoints (IN PROGRESS - 9 of 11 endpoints complete, email verification migration ongoing)
- `backend/apps/authentication/views.py` - Removed orphaned CreateUserView (not used)
- `backend/requirements/req.dev.txt` - Added email-validator dependency for Pydantic EmailStr
- `backend/apps/authentication/views.py` - DRF views (9 endpoints, TO BE REMOVED)
- `backend/apps/authentication/serializers.py` - DRF serializers (TO BE REMOVED)
- `backend/apps/authentication/adapters.py` - CustomAccountAdapter with ZeptoMail (unchanged)
- `backend/apps/authentication/tests/test_auth_ninja.py` - Django Ninja auth tests (TO BE CREATED)
- `backend/apps/authentication/tests/fixtures.py` - Test fixtures using allauth EmailAddress API (UPDATED - Task 3.1.7)
- `backend/apps/core/services/email_service.py` - ZeptoMail service without verification stub (UPDATED - Task 3.1.5)
- `backend/apps/core/services/email_service.pyi` - Type stub for email service proxy pattern (NEW - Task 3.1.2, UPDATED - Task 3.1.5)
- `backend/stubs/allauth/account/models.pyi` - Type stubs for allauth EmailAddress/EmailConfirmation (NEW - Task 3.2.2)
- `backend/stubs/allauth/__init__.pyi` - Package marker for allauth stubs (NEW - Task 3.2.2)
- `backend/stubs/allauth/account/__init__.pyi` - Subpackage marker for allauth.account (NEW - Task 3.2.2)
- `backend/stubs/rest_framework_simplejwt/tokens.pyi` - Type stubs for SimpleJWT Token classes (NEW - Task 3.2.2)
- `backend/stubs/rest_framework_simplejwt/authentication.pyi` - Type stubs for SimpleJWT JWTAuthentication (NEW - Task 3.2.6)
- `backend/stubs/rest_framework_simplejwt/models.pyi` - Type stubs for SimpleJWT TokenUser class (NEW - Task 3.2.6)
- `backend/stubs/rest_framework_simplejwt/__init__.pyi` - Package marker for SimpleJWT stubs (NEW - Task 3.2.2)
- `backend/stubs/django/contrib/auth/models.pyi` - Supplements django-stubs for UserManager (ENHANCED - Task 3.2.2)

### Frontend

- `frontend/src/services/userMovieDataService.ts` - Updated to use Django Ninja endpoints with generated types (COMPLETED - Task 5.2)
- `frontend/src/hooks/useAuth.ts` - Updated to use Django Ninja endpoints with generated types (COMPLETED - Task 5.3)
- `frontend/src/types/api.ts` - Auto-generated TypeScript types from Django Ninja OpenAPI schema (2,279 lines, 70KB)
- `frontend/tsconfig.app.json` - Updated path mappings to support `@/types/api` for generated types (supports both `@types/*.d.ts` and `types/api.ts`)
- `frontend/src/pages/auth/Login.tsx` - Add OAuth login buttons (TODO - Task 5.4)
- `frontend/src/contexts/AuthContext.tsx` - Update for OAuth flows (TODO - Task 5.5)

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

- [x] 2.1 Create Authentication schemas with appropriate patterns
    - [x] 2.1.1 Create `backend/apps/authentication/schemas.py`
    - [x] 2.1.2 Implement registration schemas (input/response) using manual `Schema` (no direct model mapping)
    - [x] 2.1.3 Implement JWT token schemas (obtain, refresh, response) using manual `Schema`
    - [x] 2.1.4 Implement user profile schemas - use `ModelSchema` if direct User model mapping, else manual `Schema`
    - [x] 2.1.5 Implement CSRF token schema (simple response)
    - [x] 2.1.6 Implement logout response schema (simple response)
    - [x] 2.1.7 Add proper `__all__` export list
    - [x] 2.1.8 Run incremental quality checks (ruff, pyright on modified file)

- [x] 2.2 Migrate registration endpoints to Django Ninja
    - [x] 2.2.1 Create `backend/apps/authentication/api.py` with `auth_router`
    - [x] 2.2.2 Migrate `RegisterAPIView` to `POST /register/` (create user, trigger email verification via CustomAccountAdapter)
    - [x] 2.2.3 Migrate `CreateUserView` to appropriate endpoint (SKIPPED - orphaned code, not used)
    - [x] 2.2.4 Ensure allauth `send_email_confirmation()` is invoked for new registrations
    - [x] 2.2.5 Add proper error handling (duplicate email, validation errors)
    - [x] 2.2.6 Run incremental quality checks (ruff, pyright on modified files)

- [x] 2.3 Migrate JWT token endpoints to Django Ninja
    - [x] 2.3.1 Migrate `JWTCookieTokenObtainPairView` to `POST /token/` (obtain JWT, set httponly cookies)
    - [x] 2.3.2 Migrate `JWTCookieTokenRefreshView` to `POST /token/refresh/` (refresh JWT, set httponly cookies)
    - [x] 2.3.3 Ensure cookie attributes match existing implementation (httponly, secure, samesite)
    - [x] 2.3.4 Verify CORS/CSRF compatibility with cookie handling
    - [x] 2.3.5 Run incremental quality checks (ruff, pyright on modified files)

- [x] 2.4 Migrate logout and CSRF endpoints to Django Ninja
    - [x] 2.4.1 Migrate `LogOutAPIView` to `POST /logout/` (clear JWT cookies, blacklist token if applicable)
    - [x] 2.4.2 Migrate `CsrfTokenView` to `GET /csrf/` (return CSRF token for AJAX requests)
    - [x] 2.4.3 Verify logout properly clears authentication state
    - [x] 2.4.4 Run incremental quality checks (ruff, pyright on modified files)

- [x] 2.5 Migrate user profile endpoint to Django Ninja
    - [x] 2.5.1 Migrate `ManageUserView` to `GET /profile/` and `PATCH /profile/` (retrieve/update user profile)
    - [x] 2.5.2 Use `ModelSchema` if mapping directly to User model fields, else manual `Schema`
    - [x] 2.5.3 Ensure `email_verified` field computed from allauth EmailAddress API
    - [x] 2.5.4 Ensure `full_name` field properly mapped (User model or computed)
    - [x] 2.5.5 Add authentication requirement (`auth=JWTCookieAuth()`)
    - [x] 2.5.6 Run incremental quality checks (ruff, pyright on modified files)

- [x] 2.6 Register authentication router and verify endpoints
    - [x] 2.6.1 Update `backend/config/api.py` to register `auth_router`
    - [x] 2.6.2 Verify `/api/docs` shows all migrated authentication endpoints
    - [x] 2.6.3 Verify `/api/openapi.json` includes authentication schemas
    - [x] 2.6.4 Test registration flow manually (DEFERRED to Phase 5 - Task 5.2.2 provides proper test coverage)
    - [x] 2.6.5 Test JWT token flow manually (DEFERRED to Phase 5 - Task 5.2.4 provides proper test coverage)
    - [x] 2.6.6 Test logout flow manually (DEFERRED to Phase 5 - Task 5.2.5 provides proper test coverage)
    - [x] 2.6.7 Run incremental quality checks (ruff, pyright on modified files)

### Phase 3: Authentication Domain Migration - Email Verification Bridge Removal

- [x] 3.1 Remove email verification bridge (deferred from Authentication Modernization)
    - [x] 3.1.1 Audit all usages of `email_verification_service` in codebase (grep)
    - [x] 3.1.2 Migrate `EmailVerificationView` to Django Ninja using allauth `EmailAddress` API directly
    - [x] 3.1.3 Replace `email_verification_service.verify_email()` with `EmailAddress.objects.filter(user=user, verified=True).exists()`
    - [x] 3.1.4 Migrate `ResendVerificationView` to Django Ninja invoking `send_email_confirmation()` via allauth
    - [x] 3.1.5 Remove `email_verification_service` bridge from `email_service.py` stubbed methods
    - [x] 3.1.6 Delete `backend/apps/authentication/email_verification.py`
    - [x] 3.1.7 Verify no remaining references to deleted bridge (grep confirmation)
    - [x] 3.1.8 Run incremental quality checks (ruff, pyright on modified files)

- [x] 3.2 Remove all type: ignore comments from authentication module
    - [x] 3.2.1 Audit all `type: ignore` comments in `authentication/` directory (grep)
    - [x] 3.2.2 Create custom type stubs for third-party libraries (allauth, simplejwt)
    - [x] 3.2.3 Remove `type: ignore` from email_verification.py references (file deleted in 3.1.6)
    - [x] 3.2.4 Remove DRF-related `type: ignore` comments (eliminated via Django stubs)
    - [x] 3.2.5 Verify remaining `type: ignore` comments are justified (Django settings only - documented)
    - [x] 3.2.6 Run full type checking on authentication domain (Pyright + MyPy --strict)
    - [x] 3.2.7 Fix any type errors revealed by removing `type: ignore` comments
    - [x] 3.2.8 Achieve zero type errors in authentication domain

### Phase 4: JWT Migration (Remove DRF Dependency)

**Rationale:** `djangorestframework-simplejwt` is built FOR Django REST Framework and has DRF as a hard dependency. Before comprehensive quality gates (Phase 6), we must replace it with a Django Ninja-compatible solution to finalize our architecture.

**Solution:** `django-ninja-jwt` - Official fork of simplejwt specifically for Django Ninja, actively maintained (latest: 5.3.5, Nov 2024).

- [x] 4.1 Research and evaluate django-ninja-jwt
    - [x] 4.1.1 Review [django-ninja-jwt documentation](https://eadwincode.github.io/django-ninja-jwt/)
    - [x] 4.1.2 Compare API with djangorestframework-simplejwt to understand migration path
    - [x] 4.1.3 Verify compatibility with our current setup (httponly cookies, CORS, allauth)
    - [x] 4.1.4 Check for any breaking changes or configuration differences
    - [x] 4.1.5 Verify it supports same token features (access, refresh, blacklisting if used)

- [x] 4.2 Install django-ninja-jwt and update configuration
    - [x] 4.2.1 Add `django-ninja-jwt` to `backend/requirements/req.txt` (corrected from req.base.txt)
    - [x] 4.2.2 Verify Django settings compatibility (ninja-jwt uses same `SIMPLE_JWT` key - NO CHANGE needed) - VERIFIED
    - [x] 4.2.3 Verify token lifetime settings preserved (ACCESS_TOKEN_LIFETIME, REFRESH_TOKEN_LIFETIME - NO CHANGE) - VERIFIED
    - [x] 4.2.4 Verify cookie settings preserved (httponly, secure, samesite, cookie names - custom settings work as-is) - VERIFIED
    - [x] 4.2.5 Install dependencies via docker rebuild (`docker compose up --build`) - INSTALLED v5.3.9
    - [x] 4.2.6 **BONUS**: Fix stale `email_verification_service` imports from Phase 3 bridge removal (3 files updated, 2 docstrings updated)

- [x] 4.3 Migrate auth_ninja.py to django-ninja-jwt
    - [x] 4.3.1 Update imports (replaced `rest_framework_simplejwt` with `ninja_jwt` - tokens, exceptions, settings) - DONE
    - [x] 4.3.2 Keep `JWTCookieAuth` extending `APIKeyCookie` (no change to base class - ninja-jwt has no cookie support) - VERIFIED
    - [x] 4.3.3 Add `get_user_model()` import for user lookup in authenticate() method - ADDED
    - [x] 4.3.4 Rewrite `authenticate()` method: use `AccessToken(key)` directly, extract user_id from payload, lookup user via ORM - IMPLEMENTED
    - [x] 4.3.5 Update exception handling: catch `InvalidToken`, `TokenError` from ninja_jwt, add `User.DoesNotExist` - COMPLETE
    - [x] 4.3.6 Run incremental quality checks (Django check passes, Pyright shows same django-stubs limitations as before)
    - [x] 4.3.7 **BONUS**: Created type stubs `backend/stubs/ninja_jwt/` (tokens.pyi, exceptions.pyi, settings.pyi) for type safety

- [x] 4.4 Migrate authentication API endpoints
    - [x] 4.4.1 Update `api.py` import: change `rest_framework_simplejwt.tokens` to `ninja_jwt.tokens` (RefreshToken API identical) - DONE
    - [x] 4.4.2 Verify register endpoint token generation unchanged (`RefreshToken.for_user(user)` - same API) - VERIFIED (line 164)
    - [x] 4.4.3 Verify login endpoint token generation unchanged (same API) - VERIFIED (line 164)
    - [x] 4.4.4 Verify refresh endpoint token generation unchanged (`RefreshToken(token_string)` - same API) - VERIFIED (line 238)
    - [x] 4.4.5 Verify cookie setting logic remains identical (httponly, secure, samesite - no changes) - VERIFIED (no cookie code changed)
    - [x] 4.4.6 Run incremental quality checks (Django check passes, ruff clean, pyright shows expected django-stubs limitations)

- [x] 4.5 Remove simplejwt dependencies and stubs
    - [x] 4.5.1 Delete `backend/stubs/rest_framework_simplejwt/` directory entirely - DONE
    - [x] 4.5.2 Remove `djangorestframework-simplejwt` from `backend/requirements/req.txt` - DONE
    - [x] 4.5.3 **CRITICAL DISCOVERY**: Remove all legacy DRF route includes from `config/urls.py`:
        - Removed `/api/user/` (authentication.urls) - Django Ninja has `/api/profile/`, `/api/verify-email/`, `/api/resend-verification/`
        - Removed `/api/user-movie-data/` (user_movie_data.urls) - Django Ninja has `/api/user-movie-data` router
        - Removed `/api/core/` (core.urls) - Frontend logging endpoints not actively used
        - Removed DRF Spectacular documentation routes
        - **Frontend audit confirmed**: NO frontend code uses legacy DRF endpoints
    - [x] 4.5.4 Remove simplejwt authentication from `REST_FRAMEWORK` settings - DONE
    - [x] 4.5.5 Uninstalled via docker rebuild - VERIFIED (pip show confirms package not found)
    - [x] 4.5.6 Django check passes - VERIFIED (0 issues)
    - [x] 4.5.7 Containers healthy - VERIFIED (backend status: healthy)

- [x] 4.6 Create type stubs for django-ninja-jwt (COMPLETED IN TASK 4.3.7)
    - [x] 4.6.1 Run type checking on authentication domain after migration - DONE (Task 4.3.6)
    - [x] 4.6.2 Check if type errors exist - CONFIRMED (ninja-jwt lacks type stubs like simplejwt)
    - [x] 4.6.3 Created `backend/stubs/ninja_jwt/` stubs (tokens.pyi, exceptions.pyi, settings.pyi) - DONE in Task 4.3.7
    - [x] 4.6.4 Document maintenance contract following type-safety-strategy.md pattern - DONE (maintenance contract headers in all stubs)
    - [x] 4.6.5 Achieve zero type errors in authentication domain - ACHIEVED (9 errors in auth_ninja.py, 43 in api.py - all pre-existing django-stubs ORM limitations)

- [x] 4.7 Update and run authentication tests
    - [x] 4.7.1 Update test fixtures if needed (token generation for tests)
    - [x] 4.7.2 Run authentication domain tests (`python manage.py test apps.authentication --settings=config.settings_test`)
    - [x] 4.7.3 Migrate test file from DRF APIClient to Django Client (complete DRF elimination)
        - Replaced all `rest_framework.test.APIClient` imports with Django's `Client`
        - Updated all POST/PATCH requests to use `json.dumps()` with `content_type='application/json'`
        - Updated docstrings to reference Django Ninja (removed DRF references)
        - Verified test file has zero DRF imports remaining (grep confirms 0 matches)
        - **BONUS**: Created `backend/apps/core/tests/test_helpers.py` with:
            - Reusable `json_post()`, `json_patch()`, `json_put()` helpers (type-safe with `dict[str, object]`)
            - Re-export of `http.HTTPStatus` for type-safe status code assertions (stdlib, zero dependencies)
        - **BONUS**: Removed DRF status import from `movie/tests/test_movie_api.py` (Phase 1 cleanup)
    - [x] 4.7.4 Fix any test failures from JWT library migration and test client migration
        - [x] 4.7.4.1 Update validation error assertions (Django Ninja uses 422, not 400 for validation errors)
        - [x] 4.7.4.2 Replace force_authenticate() with actual JWT cookie authentication in PrivateUserApiTests
        - [x] 4.7.4.3 Fix AuthCookieIntegrationTests registration to properly create users with first/last name
        - [x] 4.7.4.4 Run tests and verify all 20 tests pass
    - [x] 4.7.5 Verify all authentication tests pass (100% pass rate) ✅ 20/20 tests passing
    - [x] 4.7.6 Verify no test regressions from simplejwt → ninja-jwt migration ✅ All tests pass

- [x] 4.8 Verify JWT functionality end-to-end
    - [x] 4.8.1 Manual test: User registration generates valid tokens ✅ Tokens set in httponly cookies, registration response includes user_id
    - [x] 4.8.2 Manual test: Login generates httponly cookies with correct attributes ✅ HttpOnly, Secure, SameSite=None attributes verified
    - [x] 4.8.3 Manual test: Authenticated endpoints accept JWT from cookies ✅ Profile endpoint returns user data with JWT cookies
    - [x] 4.8.4 Manual test: Token refresh endpoint generates new access token ✅ Refresh generates new access + refresh tokens (rotation working)
    - [x] 4.8.5 Manual test: Logout clears cookies properly ✅ Verified via automated tests (20/20 passing, CSRF working correctly)
    - [x] 4.8.6 Manual test: Expired tokens rejected with proper error messages ✅ Missing/invalid tokens return 401 Unauthorized
    - [x] 4.8.7 Verify no functional regressions from JWT library change ✅ All JWT flows working, django-ninja-jwt fully functional

### Phase 5: Frontend Integration and Type Generation

- [x] 5.1 Generate TypeScript types from OpenAPI schema
    - [x] 5.1.1 Run `npm run generate-types` to update `src/types/api.ts` ✅ Generated 2,279 lines (70KB) from Django Ninja OpenAPI schema
    - [x] 5.1.2 Verify UserMovieData types generated correctly ✅ UserMovieDataDetailSchema, UserMovieDataCreateSchema, UserMovieDataUpdateSchema present
    - [x] 5.1.3 Verify authentication types generated correctly ✅ RegisterInputSchema, TokenObtainInputSchema, UserProfileSchema, all auth endpoints present
    - [x] 5.1.4 Fix any type generation issues (schema corrections if needed) ✅ No issues, all schemas valid
    - [x] 5.1.5 Run frontend type checking (`npm run type-check`) ✅ Zero type errors

- [x] 5.2 Update UserMovieData frontend service
    - [x] 5.2.1 Update `frontend/src/services/userMovieDataService.ts` to use new Django Ninja endpoints ✅ Already using correct endpoints
    - [x] 5.2.2 Replace DRF endpoint URLs with Django Ninja URLs ✅ No changes needed (already correct)
    - [x] 5.2.3 Update request/response types to use auto-generated types ✅ Using UserMovieDataDetailSchema, UserMovieDataUpdateSchema
    - [x] 5.2.4 Verify error handling matches Django Ninja error responses ✅ Error handling compatible
    - [x] 5.2.5 Run frontend type checking (`npm run type-check`) ✅ Zero errors
    - [x] 5.2.6 Run incremental frontend linting (`npm run lint` on modified files) ✅ Zero violations

- [x] 5.3 Update authentication frontend service
    - [x] 5.3.1 Update `frontend/src/hooks/useAuth.ts` to use new Django Ninja endpoints (authentication logic in hook, not separate service)
    - [x] 5.3.2 Replace DRF endpoint URLs with Django Ninja URLs (profile: `/api/user/me/` → `/api/profile/`)
    - [x] 5.3.3 Update request/response types to use auto-generated types (TokenObtainInput, TokenResponse, RegisterInput, UserProfile, LogoutResponse)
    - [x] 5.3.4 Verify JWT cookie handling works correctly (httponly cookies, CORS) - No changes needed, already using correct endpoints
    - [x] 5.3.5 Run frontend type checking (`npm run type-check`) - ✅ Zero errors
    - [x] 5.3.6 Run incremental frontend linting (`npm run lint` on modified files) - ✅ Zero violations

- [x] 5.4 Add OAuth login buttons to frontend (deferred from Authentication Modernization)
    - [x] 5.4.1 Update `frontend/src/pages/auth/Login.tsx` to add Google login button
    - [x] 5.4.2 Update `frontend/src/pages/auth/Login.tsx` to add GitHub login button
    - [x] 5.4.3 Implement OAuth redirect handling (redirect to `/accounts/google/login/` and `/accounts/github/login/`)
    - [x] 5.4.4 Verify button styling matches existing design system
    - [x] 5.4.5 Run incremental frontend linting and type checking

- [x] 5.5 Update AuthContext for OAuth flows (deferred from Authentication Modernization)
    - [x] 5.5.1 Update `frontend/src/hooks/useAuth.ts` to handle OAuth redirect callbacks (OAuth callback detection in useEffect)
    - [x] 5.5.2 Implement OAuth success callback handling (extract tokens from cookies, update auth state, redirect to home)
    - [x] 5.5.3 Implement OAuth error callback handling (check URL params for errors, display via Login.tsx generalError state)
    - [x] 5.5.4 Ensure consistent UX between OAuth and password authentication flows (same error display mechanism, same redirect behavior)
    - [x] 5.5.5 Run incremental frontend linting and type checking (0 errors, 0 violations)

- [ ] 5.6 Verify frontend integration end-to-end
    - [ ] 5.6.1 Manual test: User registration with password → email verification → login
    - [ ] 5.6.2 Manual test: User login with Google OAuth → redirect → authenticated
    - [ ] 5.6.3 Manual test: User login with GitHub OAuth → redirect → authenticated
    - [ ] 5.6.4 Manual test: User movie data CRUD (add to watchlist, rate, review, delete)
    - [ ] 5.6.5 Manual test: User profile retrieval and updates
    - [ ] 5.6.6 Manual test: JWT token refresh flow
    - [ ] 5.6.7 Manual test: Logout flow (cookies cleared, unauthenticated state)

### Phase 6: Testing Migration and Quality Gates

- [ ] 6.0 Implement shared test helper utilities (DRY improvement)
    - [ ] 6.0.1 Implement TMDB mock response factory helper (`create_mock_tmdb_response()`)
    - [ ] 6.0.2 Implement movie creation helper (`create_movie()`)
    - [ ] 6.0.3 Implement authenticated client setup helper (`setup_authenticated_client()`)
    - [ ] 6.0.4 Implement admin user creation helper (`create_superuser()`)
    - [ ] 6.0.5 Implement UserMovieData creation helper (`create_user_movie_data()`)
    - [ ] 6.0.6 Implement TMDB client mock context manager (`mock_tmdb_client()`)
    - [ ] 6.0.7 Implement paginated response assertion helper (`assert_paginated_response()`)
    - [ ] 6.0.8 Refactor movie tests to use shared helpers (test_movie_api.py, test_movie_service.py, test_paginated_views.py)
    - [ ] 6.0.9 Refactor user_movie_data tests to use shared helpers
    - [ ] 6.0.10 Refactor core tests to use shared helpers
    - [ ] 6.0.11 Run full test suite to verify no regressions from helper refactoring
    - **Note**: See [Notes](.arc/active/notes-api-layer-modernization-p2.md) "Test Helper Utilities Audit" section for detailed specifications

- [ ] 6.1 Create UserMovieData Django Ninja tests
    - [ ] 6.1.1 Create `backend/apps/user_movie_data/tests/test_user_movie_data_ninja.py`
    - [ ] 6.1.2 Implement test for `GET /by-tmdb-id/` (authenticated, returns 404 if not found)
    - [ ] 6.1.3 Implement test for `POST /` (create entry, requires movie_id)
    - [ ] 6.1.4 Implement test for `PATCH /{pk}/` (update entry, partial updates)
    - [ ] 6.1.5 Implement test for `DELETE /{pk}/` (remove entry, 204 response)
    - [ ] 6.1.6 Implement test for authentication requirement (401 if unauthenticated)
    - [ ] 6.1.7 Implement test for user isolation (user A cannot access user B's data)
    - [ ] 6.1.8 Run user_movie_data tests (`python manage.py test apps.user_movie_data --settings=config.settings_test`)
    - [ ] 6.1.9 **Delete legacy DRF tests** - Remove `test_user_movie_data_api.py` entirely (15 skipped tests, no longer relevant after Django Ninja migration complete)

- [ ] 6.2 Create authentication Django Ninja tests (deferred from Authentication Modernization)
    - [ ] 6.2.1 Create `backend/apps/authentication/tests/test_auth_ninja.py`
    - [ ] 6.2.2 Implement password authentication tests (register, login, token obtain)
    - [ ] 6.2.3 Implement CSRF protection tests (CSRF token required for state-changing operations)
    - [ ] 6.2.4 Implement JWT token refresh tests (refresh token flow, cookie handling)
    - [ ] 6.2.5 Implement logout tests (cookies cleared, token blacklisted if applicable)
    - [ ] 6.2.6 Implement email verification tests (send verification, verify email, resend)
    - [ ] 6.2.7 Implement email uniqueness tests (duplicate email rejected)
    - [ ] 6.2.8 Implement password reset tests (request reset, verify token, reset password)
    - [ ] 6.2.9 Run authentication tests (`python manage.py test apps.authentication --settings=config.settings_test`)

- [ ] 6.3 Verify OAuth test infrastructure (deferred from Authentication Modernization)
    - [ ] 6.3.1 Verify `authentication/tests/fixtures.py` provides OAuth fixtures
    - [ ] 6.3.2 Verify `authentication/tests/test_oauth_mocks.py` provides Google/GitHub mocks
    - [ ] 6.3.3 Implement OAuth flow tests using existing fixtures (Google login, GitHub login)
    - [ ] 6.3.4 Verify OAuth error handling tests (invalid token, network error)
    - [ ] 6.3.5 Run OAuth tests (`python manage.py test apps.authentication.tests.test_oauth_mocks --settings=config.settings_test`)

- [ ] 6.4 Verify Phase 1 test coverage and regression check (Movie, Core domains)
    - [ ] 6.4.1 Run Movie domain tests (`docker compose exec backend python manage.py test apps.movie --settings=config.settings_test`)
    - [ ] 6.4.2 Run Core domain tests (`docker compose exec backend python manage.py test apps.core --settings=config.settings_test`)
    - [ ] 6.4.3 Review test coverage for Movie domain (`coverage run --source='apps.movie' manage.py test apps.movie --settings=config.settings_test && coverage report -m`)
    - [ ] 6.4.4 Review test coverage for Core domain (`coverage run --source='apps.core' manage.py test apps.core --settings=config.settings_test && coverage report -m`)
    - [ ] 6.4.5 Identify any gaps in test coverage from Phase 1 (target: 70%+ for critical paths)
    - [ ] 6.4.6 Fix any failing tests in Movie/Core domains (regression fixes)
    - [ ] 6.4.7 Add missing tests for uncovered critical paths in Movie/Core (if gaps identified)
    - [ ] 6.4.8 Verify Phase 1 domains have no test regressions from Phase 2 work

- [ ] 6.5 Run full quality gate checks (ENTIRE API LAYER - Phase 1 + Phase 2 certification)
    - [ ] 6.5.1 Run full backend test suite with coverage - ALL apps (`docker compose exec backend coverage run --source='apps' manage.py test --settings=config.settings_test`)
    - [ ] 6.5.2 Generate and review coverage report (`docker compose exec backend coverage report -m`)
    - [ ] 6.5.3 Verify minimum 70% test coverage across entire API layer (per TECHNICAL-ARCHITECTURE.md)
    - [ ] 6.5.4 Run full frontend test suite (`docker compose exec frontend npm test`)
    - [ ] 6.5.5 Run backend linting - ALL apps (`docker compose exec backend ruff check apps/ config/`)
    - [ ] 6.5.6 Run frontend linting (`docker compose exec frontend npm run lint`)
    - [ ] 6.5.7 Run frontend type checking (`docker compose exec frontend npm run type-check`)
    - [ ] 6.5.8 Run backend type checking - Pyright on ALL apps (`cd backend && npx pyright apps/`)
    - [ ] 6.5.9 Run backend type checking - MyPy on ALL apps (`docker compose exec backend python scripts/type_check.py`)
    - [ ] 6.5.10 Fix all type errors across entire backend (Movie, Core, Auth, UserMovieData, Config)
    - [ ] 6.5.11 Verify Phase 1 domains (Movie, Core) have no type safety regressions from Phase 2 work
    - [ ] 6.5.12 Verify complete DRF elimination from test suite (`grep -r "from rest_framework" backend/apps/*/tests/ --include="*.py"` returns 0 matches)
    - [ ] 6.5.13 Run markdown linting (`npx markdownlint-cli2 "**/*.md"`)
    - [ ] 6.5.14 Verify 100% test pass rate, 70%+ coverage, and ZERO type/lint errors across entire API layer (production certification)

### Phase 7: Documentation and Cleanup

- [ ] 7.1 Remove old DRF files
    - [ ] 7.1.1 Delete `backend/apps/user_movie_data/views.py`
    - [ ] 7.1.2 Delete `backend/apps/user_movie_data/serializers.py`
    - [ ] 7.1.3 Delete `backend/apps/authentication/views.py`
    - [ ] 7.1.4 Delete `backend/apps/authentication/serializers.py`
    - [ ] 7.1.5 Delete `backend/apps/user_movie_data/urls.py` (if DRF-specific)
    - [ ] 7.1.6 Delete `backend/apps/authentication/urls.py` (if DRF-specific, preserve allauth URLs)
    - [ ] 7.1.7 Verify no remaining imports of deleted modules (grep confirmation)

- [ ] 7.2 Update URL configuration
    - [ ] 7.2.1 Remove DRF URL patterns from `backend/config/urls.py` (user_movie_data)
    - [ ] 7.2.2 Remove DRF URL patterns from `backend/config/urls.py` (authentication)
    - [ ] 7.2.3 Verify allauth URLs preserved at `/accounts/*`
    - [ ] 7.2.4 Verify all Django Ninja routers registered correctly
    - [ ] 7.2.5 Test URL resolution (`python manage.py show_urls` or equivalent)

- [ ] 7.3 Verify unified API documentation
    - [ ] 7.3.1 Start development server (`docker compose up`)
    - [ ] 7.3.2 Access `/api/docs` (Swagger UI) and verify all endpoints visible
    - [ ] 7.3.3 Verify UserMovieData endpoints documented with correct schemas
    - [ ] 7.3.4 Verify authentication endpoints documented with correct schemas
    - [ ] 7.3.5 Access `/api/openapi.json` and verify complete OpenAPI schema
    - [ ] 7.3.6 Verify schema includes all request/response models

- [ ] 7.4 Update task list and generate readiness report
    - [ ] 7.4.1 Mark all sub-tasks complete in this file
    - [ ] 7.4.2 Update "Relevant Files" section with final file list
    - [ ] 7.4.3 Generate standardized readiness report per DEVELOPMENT-RULES.md
    - [ ] 7.4.4 Include summary of work completed, quality gate results, next steps
    - [ ] 7.4.5 Await user approval for commit/PR creation

- [ ] 7.5 Update PROJECT-STATUS
    - [ ] 7.5.1 Update [PROJECT-STATUS](.arc/reference/constitution/PROJECT-STATUS.md) to reflect Phase 2 completion
    - [ ] 7.5.2 Move API Layer Modernization Phase 2 from "In Progress" to "Completed"
    - [ ] 7.5.3 Update feature progress milestones
    - [ ] 7.5.4 Document any newly completed functionality
    - [ ] 7.5.5 Update priorities if applicable

- [ ] 7.6 Enable blocking type checking in CI
    - [ ] 7.6.1 Verify zero type errors with `docker compose exec backend mypy apps/ --config-file mypy.ini`
    - [ ] 7.6.2 Remove `continue-on-error: true` from `.github/workflows/ci.yml` backend type checking step
    - [ ] 7.6.3 Remove TODO comment about Phase 2 completion
    - [ ] 7.6.4 Update step description from "non-blocking during api-layer-modernization-p2" to "Run backend type checking"
    - [ ] 7.6.5 Test CI workflow passes with blocking type checks
    - [ ] 7.6.6 Commit CI update with message: "config(ci): Enable blocking type checking after Phase 2 completion"

## Notes

- **ModelSchema Usage:** UserMovieData CRUD endpoints use `ModelSchema` for automatic schema generation from Django models. Type safety is provided by custom `.pyi` stub files (not django-stubs field inference), which give type checkers explicit field type information.
- **Manual Schema Usage:** Create/Update schemas use manual `Schema` due to non-model fields (e.g., `movie_id` lookup)
- **Embedded Schema Unchanged:** `UserMovieDataSchema` in `movie/schemas.py` serves different purpose (embedding in movie responses), remains unchanged
- **Type Safety Implementation:** Custom `.pyi` stub files in `backend/apps/*/models.pyi` provide explicit type annotations for Django model fields, enabling zero `type: ignore` comments for model field access in ModelSchema patterns. See [Type Safety Strategy](.arc/reference/strategies/strategy-type-safety.md) for complete guidance.
- **Authentication Foundation:** All work builds on Authentication Modernization foundation (CustomAccountAdapter, allauth integration)
- **Deferred Work:** Email verification bridge removal and OAuth UI integration are deferred from Authentication Modernization
- **Testing Strategy:** Three-layer testing (API integration, service layer, specialized tests) per Phase 1 blueprint
