# API Layer Modernization Phase 2 Notes

**Related Task List:** [tasks-api-layer-modernization-p2.md](tasks-api-layer-modernization-p2.md)
**Status:** COMPLETE
**Completed:** 2025-10-21

## Table of Contents

**Project Context:**

- [Key Patterns from Phase 1](#key-patterns-from-phase-1)
- [Historical Context - Incidental Work](#historical-context---incidental-work)

**Major Investigations & Decisions:**

- [Django Ninja JWT Migration (Phase 4)](#django-ninja-jwt-migration-phase-4)
- [Email Verification Service Bridge Removal (Phase 3)](#email-verification-service-bridge-removal-phase-3)
- [OAuth UX Implementation](#oauth-ux-implementation)

**Implementation Details:**

- [Test Helper Utilities Infrastructure](#test-helper-utilities-infrastructure)
- [DRY Review Findings (R.4)](#dry-review-findings-r4)

---

## Key Patterns from Phase 1

**ModelSchema Blueprint for Type-Safe Django CRUD:**

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

**Implementation Notes:**

- **ModelSchema Usage:** UserMovieData CRUD endpoints use `ModelSchema` for automatic schema generation from Django
  models. Type safety is provided by custom `.pyi` stub files (not django-stubs field inference), which give type
  checkers explicit field type information.
- **Manual Schema Usage:** Create/Update schemas use manual `Schema` due to non-model fields (e.g., `movie_id`
  lookup)
- **Embedded Schema Unchanged:** `UserMovieDataSchema` in `movie/schemas.py` serves different purpose (embedding in
  movie responses), remains unchanged
- **Type Safety Implementation:** Custom `.pyi` stub files in `backend/apps/*/models.pyi` provide explicit type
  annotations for Django model fields, enabling zero `type: ignore` comments for model field access in ModelSchema
  patterns. See [Type Safety Strategy](../../reference/strategies/project/strategy-type-safety.md) for complete guidance.
- **Authentication Foundation:** All work builds on Authentication Modernization foundation (CustomAccountAdapter,
  allauth integration)
- **Deferred Work:** Email verification bridge removal and OAuth UI integration are deferred from Authentication
  Modernization
- **Testing Strategy:** Three-layer testing (API integration, service layer, specialized tests) per Phase 1
  blueprint. See [Testing Strategy](../../reference/strategies/project/strategy-testing-methodology.md) for complete guidance.

---

## Historical Context - Incidental Work

### Incidental Work Completed During API Layer P2

Eight incidental task lists completed during API Layer P2 execution (~170-210 hours):

1. ✅ **WSL2 Migration** - Development environment
2. ✅ **Backend Type Safety** - Pyright strict, custom stubs, 0 type errors
3. ✅ **Config Type Safety** - Settings typing
4. ✅ **Fix Backend Type Errors** - Cleanup violations
5. ✅ **Pytest Migration** - 197 tests converted (100% pass rate)
6. ✅ **Security Updates** - Rate limiting, token blacklisting, CSRF (93 tests)
7. ✅ **Auth Service Extraction** - Class-based services with DI
8. ✅ **OAuth Headless Migration** - Two-pattern auth (JWT + session cookies, 8 OAuth tests, 45 additional tests)

**Current Status:** Phases 1-5 complete (~95%), Phase 6 (~75% complete via incidental work), Phase 7 (~40% complete)
**Remaining Work:** ~5-8 hours (vs 65-100 hours original estimate)
**Quality Baseline:** 530 tests passing (100% pass rate), 0 type errors, 0 linting violations, A+ security posture

**Scope Clarification:**

- **API Layer P2 Goal**: Infrastructure migration (DRF → Django Ninja, JWT patterns, OAuth integration)
- **NOT Feature Completeness**: Ratings/reviews/favorites APIs exist but frontend UI not yet implemented
- Testing focused on validating migrated infrastructure (watchlist CRUD demonstrates API integration works)
- Future feature work will add remaining UI + tests (test-first protocol)

**Key Achievements from Incidental Work:**

- **Test Infrastructure**: pytest with fixtures, shared helpers, coverage configuration
- **Two-Pattern Auth**: JWT (email/password) + session cookies (OAuth) working seamlessly
- **Type Safety**: 0 type errors across entire codebase (Pyright strict mode)
- **Security Posture**: A+ grade (rate limiting, token blacklisting, CSRF protection)
- **Quality Baseline**: 530 tests passing (197 backend + 333 frontend), 100% pass rate

**Opportunistic Refactoring Strategy:**
During API Layer P2 execution, quality improvements were extracted into focused incidental task lists
rather than bloating the main task list.
This approach provided:

- ✅ Clear separation of concerns (feature work vs quality improvements)
- ✅ Comprehensive documentation of quality work
- ✅ Avoided scope creep in main task list
- ✅ "Pre-completed" most testing/quality work that Phase 6 originally planned

**References:**

- All incidental task lists archived: `.arc/reference/archive/incidental/`
- Supporting notes: `.arc/reference/archive/notes/incidental/`

---

## Django Ninja JWT Migration (Phase 4)

**Context:** Phase 4 migrated from `djangorestframework-simplejwt` to `django-ninja-jwt` to eliminate DRF dependency.

### Research and Evaluation (Task 4.1)

**Package:** `django-ninja-jwt` v5.3.9 (Sep 2025, actively maintained)

**Executive Summary:**

`django-ninja-jwt` is a direct fork of `djangorestframework-simplejwt` that removes DRF dependencies and adds Django Ninja
integration. The core JWT functionality and token API remain virtually identical, making migration straightforward.
However, **cookie-based authentication is NOT built-in** - we maintain our custom `JWTCookieAuth` class pattern.

**Migration Effort**: MEDIUM - Requires rewriting `JWTCookieAuth.authenticate()` method
**Risk Level**: LOW - Token generation API is identical (direct fork)

#### Installation & Compatibility

**Dependencies:**

- Python >= 3.7 (✅ Our env: Python 3.13.3)
- Django >= 2.1 (✅ Compatible with Django 5.2)
- Django-Ninja >= 0.16.1
- Django-Ninja-Extra >= 0.14.2

**Compatibility Matrix:**

| Feature | Support | Notes |
|---------|---------|-------|
| httponly cookies | ⚠️ Requires custom impl | Library defaults to Bearer headers. We maintain `JWTCookieAuth(APIKeyCookie)` |
| CSRF protection | ✅ Supported | Django Ninja auto-enables for `APIKeyCookie` subclasses |
| django-allauth | ✅ Compatible | No conflicts - separate concerns |
| CORS | ✅ Supported | Works with django-cors-headers |

#### API Mapping (simplejwt → ninja-jwt)

**Token Generation** (NO CHANGES):

```python
# CURRENT (simplejwt)
from rest_framework_simplejwt.tokens import RefreshToken

# MIGRATION (ninja-jwt) - IDENTICAL API
from ninja_jwt.tokens import RefreshToken

# Usage identical
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)
refresh_token = str(refresh)
```

**Token Validation** (BREAKING CHANGE):

```python
# CURRENT (simplejwt) - Uses helper methods
from rest_framework_simplejwt.authentication import JWTAuthentication

jwt_auth = JWTAuthentication()
validated_token = jwt_auth.get_validated_token(token.encode('utf-8'))
user = jwt_auth.get_user(validated_token)

# MIGRATION (ninja-jwt) - Use token classes directly
from ninja_jwt.tokens import AccessToken
from ninja_jwt.settings import api_settings
from django.contrib.auth import get_user_model

token = AccessToken(token_string)
User = get_user_model()
user_id = token.payload[api_settings.USER_ID_CLAIM]
user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
```

**Key Difference**: `ninja-jwt` doesn't provide `JWTAuthentication.get_validated_token()` / `get_user()` helper methods.
We implement validation logic directly in `JWTCookieAuth`.

#### Configuration

**Settings Key**: NO CHANGE - Uses `SIMPLE_JWT` (not `NINJA_JWT`) for backwards compatibility

All existing settings preserved:

- `ACCESS_TOKEN_LIFETIME`, `REFRESH_TOKEN_LIFETIME`
- Custom cookie settings: `ACCESS_TOKEN_NAME`, `REFRESH_TOKEN_NAME`, `JWT_COOKIE_SAMESITE`

#### Breaking Changes

1. **No `JWTAuthentication` Helper Class** (HIGH IMPACT)
   - Affects: `auth_ninja.py` lines 86-90
   - Solution: Rewrote `authenticate()` method using `AccessToken` class directly

2. **No Built-in Cookie Support** (LOW IMPACT)
   - Library provides header-based controllers only
   - Solution: Continued using our custom endpoints in `api.py`

3. **Exceptions Module** (LOW IMPACT)
   - `from rest_framework_simplejwt.exceptions` → `from ninja_jwt.exceptions`
   - API is identical

#### Implemented JWTCookieAuth Pattern

```python
from ninja_jwt.tokens import AccessToken
from ninja_jwt.exceptions import InvalidToken, TokenError
from ninja_jwt.settings import api_settings
from django.contrib.auth import get_user_model

class JWTCookieAuth(APIKeyCookie):
    param_name: str = get_jwt_cookie_name()

    def __init__(self) -> None:
        super().__init__(csrf=True)

    def authenticate(self, request: HttpRequest, key: str | None) -> AbstractUser | None:
        if not key:
            return None

        try:
            # Validate token using AccessToken class
            token = AccessToken(key)

            # Get user from token payload
            User = get_user_model()
            user_id = token.payload[api_settings.USER_ID_CLAIM]
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})

            return cast(AbstractUser, user) if user else None

        except (InvalidToken, TokenError, User.DoesNotExist):
            return None
```

#### Legacy Code Cleanup (Task 4.5)

**DRF Route Removal:**

- Removed `/api/user/` (authentication.urls) - Django Ninja has `/api/profile/`, `/api/verify-email/`, `/api/resend-verification/`
- Removed `/api/user-movie-data/` (user_movie_data.urls) - Django Ninja has `/api/user-movie-data` router
- Removed `/api/core/` (core.urls) - Frontend logging endpoints not actively used
- Removed DRF Spectacular documentation routes
- **Frontend audit confirmed**: NO frontend code uses legacy DRF endpoints

**Type Stubs:**

- Deleted `backend/stubs/rest_framework_simplejwt/`
- Created `backend/stubs/ninja_jwt/` (tokens.pyi, exceptions.pyi, settings.pyi)
- Followed type-safety-strategy.md maintenance contract pattern

#### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Token validation logic changes | HIGH | Thorough testing of auth flow ✅ |
| Cookie handling breaks | MEDIUM | Cookie logic unchanged - only validation changes ✅ |
| Type safety issues | MEDIUM | Created comprehensive stubs for ninja_jwt ✅ |
| Future breaking changes | LOW | Stable fork, same maintainer |
| django-allauth conflicts | LOW | No conflicts - separate concerns |

**Sources:**

- [Official Docs](https://eadwincode.github.io/django-ninja-jwt/)
- [GitHub Repository](https://github.com/eadwinCode/django-ninja-jwt)
- [PyPI Package](https://pypi.org/project/django-ninja-jwt/) (v5.3.9)

---

## Email Verification Service Bridge Removal (Phase 3)

**Context:** Phase 3 removed the `email_verification_service` bridge and migrated to direct allauth `EmailAddress` API usage.

### Service Audit Results (Task 3.1.1)

**Files using `email_verification_service`**: 7 files, 17 usages total

**Active Django Ninja Code (Migrated):**

1. **`authentication/api.py`** (3 usages):
   - Line 13: Import statement
   - Line 161: Token obtain endpoint - checks if email is verified
   - Line 387: GET profile endpoint - adds `email_verified` field
   - Line 440: PATCH profile endpoint - adds `email_verified` field

2. **`core/services/email_service.py`** (2 usages):
   - Line 9: Import statement
   - Line 66: Marks email verified when stubbed verification auto-succeeds

3. **`authentication/tests/fixtures.py`** (2 usages):
   - Line 10: Import statement
   - Line 73: Creates verified user fixture

**Legacy DRF Code (Removed in Phase 6):**

- `authentication/serializers.py` (3 usages)
- `authentication/views.py` (2 usages)
- `authentication/tests/test_user_api.py` (3 usages)

### Migration Strategy

**Replaced bridge with allauth `EmailAddress` API:**

```python
from allauth.account.models import EmailAddress

# Old: email_verification_service.is_email_verified(user)
# New: EmailAddress.objects.filter(user=user, verified=True).exists()

# Old: email_verification_service.mark_email_verified(user)
# New: EmailAddress.objects.filter(user=user).update(verified=True)
```

### Type Safety Improvement (Task 3.1.2)

**Issue**: `email_service.send_verification_email()` required `type: ignore[misc]` comments due to proxy pattern

**Solution**: Created `.pyi` stub file following type-safety-strategy.md guidance

- Created `backend/apps/core/services/email_service.pyi`
- Explicitly typed `_EmailServiceProxy` methods
- Used `AbstractBaseUser` for maximum flexibility with Django's user model hierarchy
- Removed all 2 `type: ignore` comments from `authentication/api.py` (lines 103, 501)

**Result**: 100% type-safe email service calls with zero `type: ignore` comments

**Pattern**: Custom `.pyi` stubs for proxy patterns that use `__getattr__` magic

### Type Ignore Comments Audit (Task 3.2.1)

**Total Found**: 27 `type: ignore` comments across 3 files in `backend/apps/authentication/`

**Summary Statistics:**

| Category | Count | Status | Action |
|----------|-------|--------|--------|
| Legacy DRF files | 4 | Deleted Phase 6 | None - removed |
| External imports | 3 | Justified | Keep |
| Django ORM methods | 5 | Justified | Keep |
| allauth API calls | 17 | Justified | Keep (third-party limitation) |
| SimpleJWT | 1 | Justified | Keep |
| **TOTAL** | **30** | | |

**Active Code (api.py + fixtures.py)**: 23 comments

- **Justified/Required**: 6 comments (26%) - external imports, Django ORM limitations
- **Third-party library (allauth)**: 17 comments (74%) - could create stubs but acceptable as-is

**Recommendation**: Keep justified comments with documentation. allauth lacks type stubs (no py.typed marker) -
creating custom stubs is possible but not required for this phase.

---

## OAuth UX Implementation

**Context:** Phase 5 added OAuth login buttons and callback handling for Google/GitHub authentication.

### OAuth Interstitial Page Resolution

**Original Problem**: The django-allauth OAuth confirmation page (`/accounts/google/login/`) showed an interstitial
"You are about to sign in..." screen.

**Root Cause**: Frontend was using GET requests (`window.location.href`), which triggers django-allauth's security
confirmation page by default.

**Solution Implemented**: Changed OAuth buttons to use POST form submission with CSRF token

- Created `submitOAuthForm()` helper in `Login.tsx:260-294`
- Ensures CSRF token is fetched before form submission (prevents 403 errors)
- POST requests bypass interstitial while maintaining CSRF protection
- Matches standard OAuth UX on modern web apps (direct redirect to provider)

**Status**: ✅ RESOLVED - OAuth now goes directly to Google/GitHub login pages

**Note**: If custom styling needed in future (branding, messages cleanup), can override
`allauth/templates/socialaccount/` templates (deferred to future UX work)

### Stale Django Messages (Deferred)

**Problem**: Django messages framework persists old messages from previous test sessions, showing outdated info.

**Current State**:

- Messages stored in session/cookies
- Displayed on allauth templates until consumed
- Accumulates during development testing

**Workaround**: Clear browser cookies or use incognito mode for testing

**Proper Solution (deferred to future UX work)**:

1. Add message clearing in logout flow
2. Set message storage to SESSION with proper expiry
3. Review message display logic in custom templates

### Related Code Locations

- **django-allauth URLs**: `config/urls.py:29` (`path("accounts/", include("allauth.urls"))`)
- **OAuth templates**: `allauth/templates/socialaccount/` (in site-packages, can be overridden)
- **Frontend OAuth handlers**: `frontend/src/pages/user/Login.tsx:243-251`
- **Message framework config**: `config/settings.py` (MESSAGE_STORAGE setting)

**Why Deferred**: Per PRD section 5.3: "No modifications to frontend user interface beyond type integration and
OAuth login button integration". Phase 2 focus is API migration and type safety, not UX polish. OAuth functionality
is working correctly; styling/UX improvements should be addressed in dedicated UX work.

---

## Test Helper Utilities Infrastructure

**Context:** Audit conducted to identify repeated test patterns and create shared helpers (Tasks 4.7.3, 6.0).

### High-Impact Opportunities (3+ Files)

#### 1. User Creation Helper ⭐ HIGHEST IMPACT

- **Duplications**: 8+ occurrences across 3 files
- **Status**: ✅ Created in `core/tests/test_helpers.py::create_user()`
- **Files affected**:
    - `authentication/tests/test_user_api.py` (lines 31-45, 330-337)
    - `user_movie_data/tests/test_user_movie_data_api.py` (lines 80-94)
    - `core/tests/test_models.py` (lines 22-30, 42-45, 70-77, 82-87, 106-110)
- **Estimated savings**: ~50 lines

#### 2. JSON Request Helpers

- **Duplications**: 35+ occurrences across 3 files
- **Status**: ✅ Created in `core/tests/test_helpers.py` (`json_post`, `json_patch`, `json_put`)
- **Files affected**:
    - `authentication/tests/test_user_api.py` (20+ uses)
    - `user_movie_data/tests/test_user_movie_data_api.py` (multiple uses)
    - `core/tests/test_logging_api.py` (15+ uses)
- **Estimated savings**: ~70 lines

#### 3-5. Additional Helpers

See Task 6.0 in main task list for complete list of helpers created:

- TMDB mock response factory
- Movie creation helper
- Authenticated client setup
- Admin user creation
- UserMovieData creation
- TMDB client mock context manager
- Paginated response assertions

### Helper Design Principles

All helpers follow type-safety-strategy.md guidelines:

- ✅ Use `dict[str, object]` instead of `Any`
- ✅ Full type hints with Unpack for **kwargs
- ✅ Comprehensive docstrings
- ✅ Zero dependencies on DRF
- ✅ Framework-agnostic where possible

**Total estimated line savings**: ~320 lines
**Code duplication reduction**: 15-20%

---

## DRY Review Findings (R.4)

**Context:** Task R.4 conducted comprehensive DRY review of API layer production and test code.

### Authentication Domain (api.py + schemas.py)

#### Critical Patterns (5+ uses) - Refactored

**Pattern #1: JWT Settings Retrieval** (5 occurrences)

- **Status**: ✅ Refactored to `authentication/utils.py`
- **Impact**: Eliminated 5 repetitions of 6-line settings retrieval block

**Pattern #2: Cookie Setting for Refresh Tokens** (4 occurrences)

- **Status**: ✅ Refactored to `authentication/utils.py::set_auth_cookie()`
- **Impact**: Consolidated cookie setting logic with httponly, secure, samesite attributes

#### Important Patterns (3-4 uses) - Refactored

**Patterns #3-8**:

- Client info extraction → `core/utils/http.py::get_client_info()`
- Error response with DEBUG detail → `core/utils/http.py::build_error_response()`
- Token user ID extraction → `authentication/utils.py`
- Email verification check → User model property or helper
- Full name computation → User model property
- Token blacklist logic → `authentication/utils.py`

### Movie Domain (api.py + schemas.py)

#### Critical Patterns - Refactored

**Pattern #14: User Enrichment Pattern** (5 occurrences)

- **Status**: ✅ Extracted to decorator/helper
- **Impact**: Eliminated repetitive user data enrichment across 5 endpoints

**Pattern #15: Empty List Factory Functions** (7 occurrences)

- **Status**: ✅ Replaced with inline `list` defaults
- **Impact**: Removed 7 unnecessary factory functions

#### Important Patterns - Refactored

**Patterns #16-17**:

- Empty string to None validator → `core/utils/validators.py`
- Paginated response schema → `core/utils/schemas.py::PaginatedResponse[T]`

### Core Domain (api.py + schemas.py)

**Assessment**: ✅ Already well-factored

- Correlation ID extraction already centralized via middleware
- Minimal duplication, no refactoring needed

### User Movie Data Domain (api.py + schemas.py)

**Assessment**: ✅ Mostly clean

- `get_current_user()` already centralized ✅
- User ownership checks use Django helpers appropriately ✅
- Minor improvement: Movie stub creation extracted to service method

### Cross-Module Utilities Structure

**Refactoring created new Core app utilities layer:**

```
backend/apps/core/
├── utils/
│   ├── __init__.py
│   ├── http.py          # get_client_info(), build_error_response()
│   ├── validators.py    # empty_str_to_none validator
│   └── schemas.py       # PaginatedResponse[T]
└── middleware/
    └── logging.py       # get_correlation_id() - already exists ✅

backend/apps/authentication/
└── utils.py             # JWT helpers, token blacklisting

backend/apps/movie/
└── decorators.py        # @enrich_with_user_data
```

### Test Code DRY Review

**Overall Assessment**: ✅ Excellent Test Infrastructure

The test suite demonstrates mature, well-factored testing patterns with minimal unnecessary duplication.
The 3-tier fixture hierarchy (Core → Root → Domain) effectively centralizes shared logic.

**Key Infrastructure:**

- **Tier 1**: Core shared helpers (`core/tests/test_helpers.py`)
- **Tier 2**: Root fixtures (`apps/conftest.py`)
- **Tier 3**: Domain fixtures (per-app conftest.py)

**Only 2 minor improvements identified** (auth payload helper, json_post signature), neither critical.

**Assessment**: Test code quality is HIGH. No significant refactoring needed. ✅

### Summary Statistics

**Critical Patterns (5+ uses):** 4 identified, all refactored
**Important Patterns (3-4 uses):** 11 identified, all refactored
**Total Line Reduction:** ~400 lines across production code
**Test Code:** Already DRY, minimal improvements needed

**Domains Needing Attention:**

- **Authentication (api.py)**: 8 patterns refactored ✅
- **Movie (schemas.py)**: 4 patterns refactored ✅
- **Core**: Already well-factored ✅
- **User Movie Data**: 2 minor improvements ✅
