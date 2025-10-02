# Sub-PRD: API Layer Modernization Phase 2 - Complete Django Ninja Migration

**Document Version:** 1.0
**Created:** 2025-09-29
**Feature Priority:** High (Post-Authentication Modernization)
**Implementation Phase:** Deferred (After Authentication Modernization completion)

## 1. Introduction/Overview

This document outlines Phase 2 of the API Layer Modernization initiative, which will complete the migration from Django REST Framework (DRF) to Django Ninja across all remaining backend applications. Building on the proven patterns and architecture established in Phase 1 (movie domain), Phase 2 will migrate the `user_movie_data`, `authentication`, and `accounts` domains to achieve a fully unified, type-safe API layer.

**Important Note:** This PRD integrates all deferred work from Authentication Modernization, including:

- Email verification bridge removal (Tasks 8.1-8.2)
- Frontend OAuth UI integration (Tasks 8.9-8.10)
- Deferred authentication tests (Tasks 7.3-7.11)
- Complete type safety for authentication module

All Authentication Modernization components (CustomAccountAdapter, email_verification_service, OAuth configuration) are documented and ready for Phase 2 integration.

## 2. Goals

1. **Complete API Layer Unification:** Migrate all remaining DRF endpoints to Django Ninja, establishing a single, consistent API framework across the entire backend.

2. **Achieve Comprehensive Type Safety:** Eliminate all remaining type errors in the API layer using strict mypy validation, leveraging the django-allauth foundation to enable full type checking.

3. **Apply Phase 1 Lessons Learned:** Implement the proven patterns, testing strategies, and architectural approaches established during the movie domain migration.

4. **Establish Production-Ready API:** Create a fully type-safe, well-documented, and maintainable API layer that serves as the foundation for all future backend development.

5. **Enable Full Frontend Type Generation:** Complete the auto-generated TypeScript workflow to cover all API endpoints, eliminating manual type maintenance.

## 3. User Stories

- **As a frontend developer,** I want all API endpoints to follow consistent Django Ninja patterns so that I can rely on unified error handling, authentication, and response structures across all features.

- **As a backend developer,** I want comprehensive type safety across the entire API layer so that I can catch integration bugs during development and refactor with complete confidence.

- **As a product owner,** I want the API migration completed so that the team can focus on feature development rather than framework modernization tasks.

- **As a prospective employer,** I want to see a fully modernized, type-safe API architecture that demonstrates expertise in contemporary Python/Django practices and commitment to code quality.

- **As a system maintainer,** I want unified API documentation and consistent endpoint patterns so that debugging and extending the system is straightforward.

## 4. Functional Requirements

### 4.1 UserMovieData Domain Migration

1. **Replace DRF Views:** All DRF-based views in `backend/apps/user_movie_data/views.py` must be migrated to Django Ninja path operation functions with proper routing structure.

2. **Replace DRF Serializers:** All DRF serializers in `backend/apps/user_movie_data/serializers.py` must be replaced with equivalent Pydantic schemas in a new `backend/apps/user_movie_data/schemas.py` file.

3. **Preserve User Data Functionality:** All existing user movie data operations must maintain identical functionality:
   - Movie rating/unrating operations
   - Watchlist add/remove operations
   - Watch status tracking
   - User review management
   - Favorites management
   - User movie data retrieval and aggregation

4. **Maintain Movie Domain Integration:** User movie data endpoints must continue to integrate seamlessly with the migrated movie domain APIs, preserving the `user_movie_data` field population in movie responses.

5. **Apply Authentication Patterns:** Use the established JWT cookie authentication scheme consistently across all user movie data endpoints.

### 4.2 Authentication/Accounts Domain Migration

6. **Replace DRF Authentication Views:** All remaining DRF-based authentication endpoints in `backend/apps/authentication/` must be migrated to Django Ninja, including:
   - User profile management endpoints
   - Email verification workflows (currently stubbed in views.py - Task 5.0 stubbed endpoints)
   - Registration and resend verification endpoints
   - Any custom authentication utilities

7. **Replace DRF User Serializers:** All DRF serializers related to user management must be replaced with Pydantic schemas that work with the modernized authentication system.

8. **Remove Email Verification Bridge:** Delete the temporary email verification bridge (`backend/apps/authentication/email_verification.py`) deferred from Authentication Modernization (Tasks 8.1-8.2).
   - Replace all `email_verification_service` calls with direct allauth EmailAddress API in Django Ninja endpoints
   - Remove bridge dependency from email_service.py stubbed methods
   - Update all remaining references to use allauth native methods

9. **Integrate with django-allauth:** Ensure all migrated endpoints work seamlessly with the django-allauth foundation established during Authentication Modernization.
   - Use allauth EmailAddress API directly: `EmailAddress.objects.filter(user=user, verified=True).exists()`
   - Ensure API-triggered flows (registration, resend verification) invoke the ZeptoMail integration via custom account adapter (`authentication.adapters.CustomAccountAdapter`)
   - Leverage allauth's native email confirmation workflow instead of custom token generation

10. **Preserve Authentication Workflows:** All existing authentication and user management functionality must be preserved with identical behavior.
    - Maintain the public contract for fields like `email_verified`, `full_name`, and JWT cookie handling while delegating persistence to django-allauth.

11. **Complete Type Safety:** Eliminate all temporary type: ignore comments from authentication module.
    - Remove type: ignore comments from email_verification.py when bridge is deleted
    - Resolve DRF-related type errors by replacing DRF serializers/views with Pydantic/Django Ninja
    - Achieve zero type errors in authentication domain (both Pyright and MyPy --strict)

### 4.3 Cross-Domain Integration and Type Safety

12. **Unified API Structure:** All endpoints must follow the clean URL structure established in Phase 1 (`/api/domain/action` pattern).

13. **Consistent Error Handling:** Apply the standardized error response patterns established in Phase 1 across all migrated endpoints.

14. **Complete Type Safety:** Achieve zero mypy --strict errors across all migrated domains, with documented type: ignore statements only for unavoidable Django internals.

15. **Comprehensive Testing Migration:** Update all existing tests to use Django Ninja patterns, following the three-layer testing strategy established in Phase 1.

### 4.4 Frontend Integration

16. **Complete Type Generation:** Extend the OpenAPI-based TypeScript generation to cover all API endpoints, eliminating all manual type definitions.

17. **Frontend Service Updates:** Update all frontend API service modules to use the new Django Ninja endpoints and auto-generated types.

18. **OAuth UI Integration:** Add social login buttons to frontend Login.tsx and integrate with allauth OAuth flows (deferred from Authentication Modernization Task 8.9-8.10).
    - Implement Google and GitHub login buttons
    - Update authentication context to handle OAuth redirects
    - Ensure consistent UX between OAuth and password authentication flows

19. **Unified Documentation:** Ensure all endpoints appear in the unified Django Ninja API documentation at `/api/docs`.

## 5. Non-Goals (Out of Scope)

- **Architectural Refactoring:** Major service layer restructuring, parameter logic movement, and other architectural improvements are deferred to the Backend Modernization feature.
- **Database Schema Changes:** No changes to underlying data models or database structure.
- **New Feature Development:** No new functionality beyond what currently exists in DRF endpoints.
- **Performance Optimization:** Focus is on migration correctness, not performance improvements.
- **UI/UX Changes:** No modifications to frontend user interface beyond type integration and OAuth login button integration (Item 18 - deferred from Authentication Modernization).

## 6. Design Considerations

### API Design Patterns

- Follow the router-based organization established in Phase 1 (`user_movie_data_router`, `auth_router`)
- Use the same Pydantic schema patterns for request/response validation
- Apply consistent authentication decorators and error handling

### Type Safety Strategy

- Leverage the hybrid Pyright (development) + MyPy (CI/CD) approach proven in Phase 1
- Use the established response validation patterns for external API integration
- Maintain the same level of type annotation rigor established in the movie domain

### Testing Strategy

- Apply the three-layer testing architecture: API integration, service layer, and specialized tests
- Use the established mocking patterns for external dependencies
- Follow the Django Ninja URL testing patterns (direct URLs vs reverse())

## 7. Technical Considerations

### Dependencies

- **Authentication Modernization:** Must be 100% complete before Phase 2 begins, including:
    - Custom account adapter: `authentication.adapters.CustomAccountAdapter` (extends `allauth.account.adapter.DefaultAccountAdapter`) with ZeptoMail integration
    - Email verification bridge: `authentication.email_verification.email_verification_service` (temporary compatibility layer to be removed in Phase 2)
    - OAuth configuration: Google and GitHub social apps configured in Django admin
    - django-allauth URLs: `/accounts/*` for OAuth callbacks and email verification
    - **Note:** All deferred work from Authentication Modernization (Tasks 8.1-8.2, 8.9-8.10) must be completed in Phase 2
- **Phase 1 Foundation:** All Phase 1 patterns and utilities must remain stable
- **Frontend Type Generation:** OpenAPI workflow must be working reliably

### Integration Points

- **Movie Domain Integration:** User movie data must integrate with Phase 1 movie endpoints
- **Authentication Integration:** All endpoints must work with the modernized auth system
- **Frontend Service Layer:** All existing frontend API calls must be preserved

### Risk Mitigation

- **Phased Implementation:** Consider sub-phases within Phase 2 if domains prove complex
- **Testing First:** Ensure all existing functionality is well-tested before migration
- **Rollback Capability:** Git history provides rollback mechanism if critical issues arise during migration

## 8. Success Metrics

### Primary Success Criteria

1. **Zero Type Errors (CI-Enforced):**
   - **Pyright:** `npx pyright backend/apps/user_movie_data backend/apps/authentication backend/apps/accounts` (0 errors)
   - **MyPy:** `docker compose exec backend mypy apps/user_movie_data apps/authentication apps/accounts --strict --config-file mypy.ini` (0 errors)
   - **CI Check:** Both commands must pass in GitHub Actions workflow before merge approval
   - **Justification Required:** Any `type: ignore` comments must have inline explanation

2. **Complete Test Coverage:** 100% of existing API functionality is covered by updated tests
   - **Backend Tests:** `docker compose exec backend python manage.py test apps.user_movie_data apps.authentication apps.accounts --settings=config.settings_test` (100% pass rate)
   - **Authentication Tests:** Include comprehensive integration tests deferred from Authentication Modernization (password auth, CSRF, JWT refresh, logout, email verification, password reset)
   - **OAuth Tests:** Utilize fixtures and mocks created in Authentication Modernization for Google/GitHub OAuth flow testing
   - **CI Check:** Test suite must pass with 0 failures in GitHub Actions workflow

3. **Full Frontend Integration:** All frontend features work identically with new API endpoints
   - **Type Generation:** `npm run generate-types` produces valid TypeScript types from OpenAPI schema
   - **Frontend Tests:** `docker compose exec frontend npm test` (100% pass rate)
   - **Manual Verification:** All user-facing features tested in development environment

4. **Unified Documentation:** All endpoints are documented in the Django Ninja API docs
   - **OpenAPI Schema:** `/api/openapi.json` includes all migrated endpoints
   - **Swagger UI:** All endpoints accessible and testable at `/api/docs`

### Secondary Success Criteria

5. **Performance Parity:** Response times are equivalent or better than DRF endpoints
   - **Measurement:** Compare average response times for equivalent operations before/after migration

6. **Code Reduction:** Overall reduction in boilerplate code compared to DRF implementation
   - **Measurement:** Line count comparison between old DRF serializers/views and new Pydantic schemas/routers

7. **Developer Experience:** Improved development workflow with better type checking and validation
   - **Measurement:** Qualitative assessment of development friction reduction

## 9. Open Questions

1. ~~**Authentication Integration Complexity:** Will the django-allauth migration introduce any new patterns that require PRD updates?~~
   - **Resolved:** Authentication Modernization complete. All components documented in Section 7 (Dependencies).

2. **UserMovieData Schema Complexity:** Are there complex nested relationships in user movie data that will require special Pydantic schema design?

3. **Frontend Breaking Changes:** Will the migration require any breaking changes to frontend API consumption patterns?

4. **Testing Data Migration:** Do we need to establish test data patterns for the more complex user-related test scenarios?

## 10. Deferred Work from Authentication Modernization

**Tracked Items to Complete in Phase 2:**

### Backend Cleanup

- **Task 8.1-8.2:** Remove email verification bridge (`authentication.email_verification.py`)
    - Delete temporary compatibility layer
    - Replace all `email_verification_service` calls with allauth EmailAddress API
    - Update `email_service.py` stubbed methods

### Frontend Integration

- **Task 8.9-8.10:** OAuth UI integration
    - Add Google/GitHub login buttons to Login.tsx
    - Update authentication context for OAuth flow handling
    - Ensure unified UX between OAuth and password authentication

### Testing

- **Task 7.3, 7.6-7.11:** Comprehensive authentication tests
    - Password authentication tests
    - CSRF protection tests
    - JWT token refresh tests
    - Logout tests
    - Email verification tests
    - Email uniqueness tests
    - Password reset tests
    - Utilize fixtures/mocks from `authentication/tests/fixtures.py` and `test_oauth_mocks.py`

### Type Safety

- Remove all type: ignore comments from authentication module
- Achieve zero Pyright + MyPy --strict errors
- Complete type safety for all authentication-related code

---

**Implementation Timeline:** Phase 2 implementation will begin only after:

1. Authentication Modernization is 100% complete and merged to main
2. This PRD is reviewed and updated (if necessary) based on auth modernization outcomes
3. Backend development capacity is available (not blocked by other high-priority features)

**Next Steps:**

1. Complete Authentication Modernization
2. Review and finalize this PRD
3. Generate detailed task breakdown for Phase 2 implementation
4. Create feature branch: `feature/api-layer-modernization-p2` from main
5. Begin systematic migration starting with UserMovieData domain
