This task list covers **Phase 1 (Proof of Concept)** of the API Layer Modernization, focusing exclusively on the `movie` app. The migration of other apps will be handled in a subsequent phase after this PoC is successfully completed.

---

## Relevant Files

### Files to be Created
- `backend/config/api.py` - ✅ Central `NinjaAPI` instance with native JWT authentication, OpenAPI documentation, and enhanced endpoints.
- `backend/apps/movie/api.py` - ✅ Created with Django Ninja router and all 10 movie endpoints migrated from DRF.
- `backend/apps/movie/schemas.py` - ✅ Created with comprehensive Pydantic schemas replacing DRF serializers.
- `backend/apps/authentication/auth_ninja.py` - ✅ Enhanced Django Ninja JWT cookie authentication with native integration, OpenAPI schema, and comprehensive error handling.
- `backend/shared/__init__.py` - ✅ Temporary shared module stub (to be replaced by Pydantic schemas).
- `backend/shared/api_types.py` - ✅ TMDB API type definitions stub (temporary).
- `backend/shared/error_codes.py` - ✅ Error codes constants stub (temporary).
- `_docs/tasks/tasks-prd-api-layer-modernization.md` - This task list file.

### Files to be Modified
- `backend/requirements/req.txt` - To add the `django-ninja` dependency.
- `backend/.dockerignore` - Added to exclude node_modules from Docker build context.
- `backend/config/urls.py` - ✅ Updated to wire in the main Ninja API router and remove old DRF movie URLs.
- `backend/middleware/logging.py` - ✅ Fixed type checking issues for dynamic HttpRequest attributes.
- `backend/apps/movie/tests/*` - API tests will be adapted for the new Ninja endpoints.
- `frontend/package.json` - To add a `pydantic-to-typescript` style development dependency.
- `frontend/src/services/movieService.ts` - To update API endpoint URLs.
- `frontend/src/@types/movie.d.ts` - Will be replaced by auto-generated types.
- `_docs/PROJECT-STATUS.md` - To add this new feature to the project status.

### Files to be Removed/Deprecated
- `backend/apps/movie/views.py` - ✅ Removed old DRF views after successful migration.
- `backend/apps/movie/serializers.py` - ✅ Removed old DRF serializers after successful migration.
- `backend/apps/movie/urls.py` - ✅ Removed DRF-specific URL configuration for the `movie` app.

## Tasks

- [x] 1.0 **Project Setup & Initial Configuration**
- [x] 1.1 Add `django-ninja` to `backend/requirements/req.txt`.
  - [x] 1.2 Run `docker-compose build backend` to install the new dependency.
  - [x] 1.3 Create `backend/config/api.py` and instantiate the main `NinjaAPI`.
  - [x] 1.4 Update `backend/config/urls.py` to include the new Ninja API under a single `/api/` path.
  - [x] 1.5 Create a temporary health-check endpoint (e.g., `@api.get("/health")`) to verify the basic setup is working.

- [x] 2.0 **Foundational Issues Resolution**
  - [x] 2.1 Resolve import path inconsistencies (`from apps.core.models` vs `from core.models`) across the codebase.
  - [x] 2.1.5 Fix broader import resolution issues preventing module discovery (`user.views`, `core.views.health_check`, etc.).
  - [x] 2.2 Address missing `shared` module dependency that contains TMDB API type definitions.
  - [x] 2.3 Ensure `python manage.py check` passes cleanly to validate Django Ninja setup.
  - [x] 2.4 Verify type checking and linting pass on the foundational authentication components.

- [x] 2.5 **Authentication Layer Migration (Continued)**
  - [x] 2.5.1 Create `backend/apps/authentication/auth_ninja.py`.
  - [x] 2.5.2 In the new file, define a class `JWTCookieAuth` that implements a Ninja security scheme (e.g., `APIKeyCookie`).
  - [x] 2.5.3 Implement Django Ninja native integration mitigation: Add OpenAPI security schema, proper error handling, and dependency injection wrapper to get full native Ninja benefits.
  - [x] 2.5.4 Configure the main `NinjaAPI` instance in `backend/config/api.py` to use this as a global authentication scheme.
  - [x] 2.5.5 Create a temporary authenticated test endpoint to verify the new auth scheme correctly protects routes and identifies the user.

- [x] 3.0 **Proof-of-Concept: Migrate `movie` App Endpoints**
  - [x] 3.1 Create `backend/apps/movie/api.py` and `backend/apps/movie/schemas.py`.
  - [x] 3.2 In `schemas.py`, create Pydantic `ModelSchema` classes for the `Movie` model and any other data structures needed for the movie API.
  - [x] 3.25 Update `movie` service helpers to emit typed payloads aligned with the new Pydantic schemas (replace dict[str, object] return values).
    - [x] 3.25.1 Create Pydantic model factory utilities for converting TMDB API responses to schema instances
    - [x] 3.25.2 Update single resource methods (get_movie_by_id) to return MovieDetailSchema instead of dict[str, object]
    - [x] 3.25.3 Update paginated resource methods (get_nowPlaying_movies, search_movies, etc.) to return PaginatedMovieResponseSchema
    - [x] 3.25.4 Update supporting data methods (get_movie_genres, search_keywords, etc.) to return appropriate Pydantic schemas
    - [x] 3.25.5 Replace error dictionaries with HttpError exceptions throughout service layer for proper Django Ninja integration
    - [x] 3.25.6 Update any remaining helper functions and validate all service methods return proper Pydantic types
  - [x] 3.3 In `api.py`, create a `Router` instance.
  - [x] 3.4 Systematically migrate each endpoint from the old `movie/views.py` to a path operation function in `api.py`, using the new Pydantic schemas for request bodies and responses.
    - [x] 3.4.1 Migrate supporting data endpoints (genres, keywords, people) - 5 simple endpoints
    - [x] 3.4.2 Migrate single resource endpoint (movie detail by ID) with user data integration
    - [x] 3.4.3 Migrate basic paginated endpoints (now playing, upcoming, search movies) - 3 endpoints
    - [x] 3.4.4 Migrate complex discovery endpoint with parameter processing and validation
  - [x] 3.5 Add the new `movie` router to the main `NinjaAPI` instance.
  - [x] 3.6 Once all `movie` endpoints are migrated and confirmed working, delete the old `backend/apps/movie/views.py` and `backend/apps/movie/serializers.py` files.

- [x] 4.0 **Testing and Validation**
  - [x] 4.1 Adapt the existing API tests in the `movie` app to target the new Ninja endpoints using Django's test client.
  - [x] 4.1.5 Conduct test coverage analysis for the movie app to identify gaps and ensure Django Ninja migration maintains existing coverage.
  - [x] 4.2 Ensure all adapted tests for the `movie` app pass successfully.
  - [x] 4.2.5 Create dedicated service layer tests for movie_service.py to test parameter mapping, error handling, and business logic separately from API integration tests.
  - [x] 4.3 Use the interactive API docs at `/api/docs` to manually test the new `movie` endpoints and confirm functionality.
  - [x] 4.3.5 Verify that test patterns established in movie app migration are suitable as blueprints for
  other app migrations (authentication, user_movie_data).
  - [x] 4.4 Run `npx pyright backend/apps/movie/` and `mypy --strict` on the movie directory and resolve all type errors.
    - **Note:** `mypy --strict` currently fails with an upstream `django-stubs` internal error (https://github.com/typeddjango/django-stubs/issues/2461). Use Pyright as the primary guardrail and track the upstream fix before re-enabling full mypy coverage.
  - [x] 4.4.5 Document testing standards and patterns discovered during movie app migration for use in future app migrations.

- [ ] 5.0 **Frontend Integration and Type Generation Workflow**
  - [x] 5.1 Research and select a `pydantic-to-typescript` tool approach for automatic type generation.
    - **Decision**: Selected OpenAPI-based approach using `openapi-typescript` package
    - **Rationale**: Leverages Django Ninja's native OpenAPI generation at `/api/openapi.json` for complete API contract typing
    - **Benefits**: Frontend-only toolchain, full request/response types, industry standard workflow
  - [ ] 5.2 Install `openapi-typescript` as dev dependency and configure type generation script in `frontend/package.json`.
  - [ ] 5.3 Generate initial TypeScript definitions from Django Ninja OpenAPI endpoint and validate output structure.
  - [ ] 5.4 Create new type module at `frontend/src/types/api.ts` and integrate with existing movie type definitions.
  - [ ] 5.5 Update `frontend/src/services/movieService.ts` to use auto-generated types, ensuring API client compatibility.
  - [ ] 5.6 Refactor frontend components to import and use the new auto-generated types, removing manual type definitions.
  - [ ] 5.7 Thoroughly test all movie-related features in the running application to confirm the frontend integration works correctly.

## Notes: Architectural Notes for Future Refactoring

**Issue Identified**: Complex parameter processing logic is currently in the API layer (`movie/api.py`) rather than the service layer (`movie/services/movie_service.py`). This includes:
- Decade parsing ("1990s" → date ranges)
- Parameter aliases (`genres` → `with_genres`)
- Business rules (upcoming movie date calculations)

**Recommendation**: Move this logic to the service layer in a future refactor to follow proper layered architecture patterns. The API layer should focus on request/response handling while the service layer handles business logic.

**Impact**: This architectural improvement would make service layer tests more meaningful and improve separation of concerns, but is deferred to avoid scope creep during the Django Ninja migration proof-of-concept.

## Notes: Testing Standards and Patterns for Future App Migrations

### Established Testing Architecture

**Three-Layer Testing Strategy:**
1. **API Integration Tests** (`test_movie_api.py`) - End-to-end API contract validation
2. **Service Layer Tests** (`test_movie_service.py`) - Business logic and parameter mapping
3. **Specialized Integration Tests** (`test_paginated_views.py`) - Specific endpoint patterns

### Testing Patterns Discovered

**1. External API Mocking Strategy:**
- **Pattern**: Mock `tmdb_client.get()` calls at the service layer, not raw `requests.get()`
- **Rationale**: Tests the actual service interface while remaining fast and reliable
- **Implementation**: Use `@patch('movie.services.movie_service.tmdb_client.get')` consistently
- **Mock Structure**: Return `ApiResponse` objects with realistic TMDB-style data structures

**2. Django Ninja URL Testing:**
- **Pattern**: Use direct URL strings (`'/api/movie/movies/now-playing'`) rather than reverse()
- **Rationale**: Django Ninja doesn't integrate with Django's URL reversal system
- **Helper Functions**: Create URL builder functions for parameterized endpoints (e.g., `movie_detail_url(tmdb_id)`)

**3. Service Layer Parameter Mapping Tests:**
- **Purpose**: Validate business logic transformations independent of API layer
- **Focus Areas**: Parameter aliasing (friendly names → TMDB parameters), data validation, error handling
- **Example**: Testing that `genres='28,12'` parameter gets mapped to `with_genres` in TMDB calls

**4. Pydantic Schema Integration Testing:**
- **Pattern**: Verify that service methods return proper Pydantic schema instances
- **Coverage**: Test both success cases (proper schema structure) and error cases (HttpError exceptions)
- **Type Safety**: Ensure tests validate the typed return values match schema definitions

**5. Authentication Integration:**
- **Pattern**: Test both authenticated and unauthenticated access patterns
- **Implementation**: Use Django's test client with session-based authentication for protected endpoints
- **Coverage**: Verify user-specific data integration (user movie ratings, watch status, etc.)

### Quality Standards Established

**Test Coverage Requirements:**
- **API Endpoints**: 100% coverage for all HTTP methods and response codes
- **Service Methods**: Parameter mapping, error handling, and business logic validation
- **Schema Validation**: Ensure Pydantic schemas work correctly with real and mock data
- **Error Scenarios**: Test external API failures, invalid parameters, and authentication failures

**Test Performance Standards:**
- **Speed**: All tests should run in <2 seconds per test case
- **Isolation**: No test should depend on external services or previous test state
- **Reliability**: Tests should pass consistently regardless of external conditions

**Code Quality Integration:**
- **Type Safety**: All test code should pass Pyright with zero errors
- **Linting**: Follow flake8 standards with max-line-length=99
- **Documentation**: Each test file should have module-level docstrings explaining the testing strategy

### Patterns Suitable for Future App Migrations

**1. Authentication App Migration:**
- Apply the same three-layer testing approach
- Focus on authentication flow testing and JWT token management
- Test authentication endpoints and user session management

**2. User_Movie_Data App Migration:**
- Emphasize testing the relationship between user data and movie data
- Test complex query patterns and user-specific data filtering
- Validate data consistency across user interactions

**3. Accounts App Migration:**
- Focus on User model and profile management endpoints
- Test user data integrity and account management flows

### Recommended Testing Workflow for Future Migrations

1. **Start with Service Layer Tests**: Validate business logic before API integration
2. **Build API Integration Tests**: Ensure end-to-end functionality works correctly
3. **Add Specialized Pattern Tests**: Cover unique endpoint behaviors (pagination, search, etc.)
4. **Validate Type Safety**: Run Pyright on all test code before marking complete
5. **Performance Verification**: Ensure test suite execution time remains reasonable

### Technical Debt and Improvement Opportunities

**Architecture Improvements for Future Iterations:**
- Consider moving complex parameter processing logic from API layer to service layer
- Standardize error handling patterns across all service methods
- Implement consistent logging and monitoring integration points

**Testing Infrastructure Enhancements:**
- Create shared test fixtures for common TMDB response patterns
- Develop helper utilities for authentication setup in tests
- Consider adding integration tests that run against a test TMDB API key for validation

This testing foundation provides a solid blueprint for migrating the remaining apps while maintaining high code quality and comprehensive test coverage.

### Type Safety Standards Established

**Strict Type Safety Compliance:**
- **Zero `typing.Any` usage** in production code (movie app, services, schemas)
- **Eliminated non-compliant `Any` usage** in test helper functions by using proper TypedDict types
- **Proper use of `object`** for truly generic data (external API responses, test payloads)
- **Justified `type: ignore` removal** - removed unnecessary type suppression in Django model ID access

**Acceptable `Any` Usage Patterns:**
- **External API stubs only**: Temporary stub files (`core/types.py`, `shared/api_types.py`) for TMDB response structures
- **Test mock data**: `Dict[str, object]` for variable external API response structures
- **All instances documented**: Clear justification for any remaining `Any` usage

**Type Safety Improvements Made:**
- Replaced `**params: Any` with proper `TypedDict` specifications in test helpers
- Converted generic `Dict[str, Any]` to `Dict[str, object]` for external data
- Removed unnecessary `type: ignore` for Django model ID field access
- Established pattern for handling Django model fields in Pydantic schemas

**Blueprint for Future Migrations:**
- Use specific TypedDict types for function parameters instead of `Any`
- Use `object` for truly unknown external data structures
- Document any necessary `type: ignore` with specific Django internal justification
- Prefer explicit type annotations over type suppression

This type safety foundation ensures the movie app serves as an exemplary blueprint for maintaining strict type safety standards across all future app migrations.

### Frontend Type Generation Research and Implementation Plan

**Research Summary (Task 5.1):**
Evaluated three approaches for automatic TypeScript type generation from Pydantic schemas:

**Option 1 - Direct Pydantic Tools:**
- `pydantic-to-typescript` (v2.0.0) and `pydantic-to-typescript2` packages
- Pros: Direct schema conversion, single source of truth
- Cons: Python toolchain dependency, limited to models only, no API context

**Option 2 - OpenAPI-based (SELECTED):**
- `openapi-typescript` package (v7.9.1, 229+ npm projects using it)
- Leverages Django Ninja's native OpenAPI generation at `/api/openapi.json`
- Pros: Complete API contract typing, frontend-only toolchain, industry standard, includes request/response context
- Implementation: `npx openapi-typescript http://localhost:8000/api/openapi.json -o src/types/api.ts`

**Option 3 - JSON Schema:**
- `json-schema-to-typescript` for manual schema export
- Use case: Custom schema handling and manual exports

**Selected Implementation Strategy:**
1. **Package**: `openapi-typescript` as dev dependency
2. **Source**: Django Ninja OpenAPI endpoint (`/api/openapi.json`)
3. **Output**: `frontend/src/types/api.ts` with complete API contract types
4. **Integration**: Replace manual types in `movie.d.ts` and update service layer
5. **Workflow**: Build script integration for automated type updates

**Benefits for CineXplorer:**
- Single source of truth from API contract
- Automatic propagation of schema changes
- Full type safety including endpoints, parameters, responses
- Future-proof standard OpenAPI toolchain
- Blueprint for user and user_movie_data app migrations

**Technical Considerations:**
- Requires backend API running during frontend build
- Generated types may need occasional frontend-specific adjustments
- Non-breaking implementation alongside existing manual types