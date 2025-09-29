This task list currently covers **Phase 1 (Proof of Concept)** of the API Layer Modernization, focusing primarily on the `movie` app and any foundational/shared logic in the `core` app. The migration of other apps will be handled in a subsequent phase after this PoC is successfully completed.

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
- `frontend/src/types/api.ts` - ✅ Auto-generated TypeScript types from Django Ninja OpenAPI schema.
- `backend/apps/core/tmdb_models/tmdb_responses.py` - ✅ Pydantic models for TMDB API response structures providing complete type safety.
- `backend/apps/core/tmdb_models/__init__.py` - ✅ Package initialization for TMDB response models.
- `backend/apps/core/types/api_types.py` - ✅ Type aliases for API layer type safety (TMDBParams, TMDBResponseData).
- `backend/apps/core/types/__init__.py` - ✅ Package initialization for core type definitions.
- `backend/apps/core/services/validators.py` - ✅ Response validators for type-safe ApiResponse → Pydantic model conversion.
- `_docs/tasks/tasks-api-layer-modernization-p1.md` - This task list file.

### Files to be Modified
- `backend/requirements/req.txt` - To add the `django-ninja` dependency.
- `backend/.dockerignore` - Added to exclude node_modules from Docker build context.
- `backend/config/urls.py` - ✅ Updated to wire in the main Ninja API router and remove old DRF movie URLs.
- `backend/config/api.py` - ✅ Updated to register separate routers for clean URL structure.
- `backend/middleware/logging.py` - ✅ Fixed type checking issues for dynamic HttpRequest attributes.
- `backend/apps/movie/tests/*` - API tests will be adapted for the new Ninja endpoints.
- `frontend/package.json` - ✅ Added `openapi-typescript` dev dependency and `generate-types` script.
- `frontend/src/services/movieService.ts` - ✅ Updated to use clean API endpoint URLs and auto-generated types.
- `frontend/src/@types/movie.d.ts` - ✅ Updated to use auto-generated types with frontend extensions.
- `frontend/src/utilities/routeConfigHelper.ts` - ✅ Updated to work with new endpoint structure.
- `.gitignore` - ✅ Updated to exclude generated `frontend/openapi.json` file.
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
  - [x] 5.2 Install `openapi-typescript` as dev dependency and configure type generation script in `frontend/package.json`.
  - [x] 5.3 Generate initial TypeScript definitions from Django Ninja OpenAPI endpoint and validate output structure.
  - [x] 5.3.5 Implement combined type generation approach (development + CI/CD) with automated schema export and CI validation workflow.
  - [x] 5.4 Create new type module at `frontend/src/types/api.ts` and integrate with existing movie type definitions.
  - [x] 5.5 Update `frontend/src/services/movieService.ts` to use auto-generated types, ensuring API client compatibility.
  - [x] 5.5.5 Restructure Django Ninja API endpoints for clean URL design using multiple routers (movies, genres, keywords, people).
  - [x] 5.6 Refactor frontend components to import and use the new auto-generated types, removing manual type definitions.
  - [x] 5.6.5 Verify and update type checking scripts, perform comprehensive type safety validation across frontend and backend.
  - [x] 5.6.6 Fix test infrastructure to use new clean URL structure instead of legacy `/api/movie/movies/` paths.
  - [x] 5.6.7 Fix remaining test failures (parameter validation, authentication flow, Django Ninja migration issues).
  - [x] 5.6.8 Implement proper TMDB response Pydantic models to replace TypedDict stubs and achieve complete type safety.
  - [x] 5.6.9 Remove legacy router compatibility code and finalize clean architecture implementation.
  - [x] 5.6.10 **Establish Robust Type Safety Foundation** - Address 117 type errors in movie API layer to complete foundational type safety requirements.
    - [x] 5.6.10.1 Create type system infrastructure with TMDBParams type alias and response validation types.
    - [x] 5.6.10.2 Implement typed response validators (`validate_tmdb_response`, `validate_tmdb_list_response`) for bridging ApiResponse → Pydantic gap.
    - [x] 5.6.10.3 Update movie service layer methods with proper type aliases and explicit type conversions.
    - [x] 5.6.10.4 Fix API layer type annotations (discover_movies helper function, parameter handling).
    - [x] 5.6.10.5 Update test infrastructure with proper type annotations for mocks and test helpers.
    - [x] 5.6.10.6 Validate complete type safety: Zero type errors in movie app production code, minimal justified type ignores in tests.

- [ ] 6.0 **Complete Phase 1 with Zero Technical Debt**
  - [x] 6.1 Fix remaining test infrastructure type annotations (52 errors in test files identified by pyright).
  - [ ] 6.2 Run comprehensive linting on entire backend and resolve any issues.
  - [ ] 6.3 Validate all quality gates pass (tests, type checking, linting) completely, with the only allowable exceptions being in non-core (shared) and non-Movie code (i.e., User/Accounts/UserMovieData) to ensure rock-solid Phase 1 foundation.
  - [ ] 6.4 Thoroughly test all core and movie-related features in the running application to confirm frontend integration works correctly.

- [ ] 7.0 **Phase 1 Completion and Authentication Modernization Preparation**
  - [ ] 7.1 Update PROJECT-STATUS.md with Phase 1 completion status and achievements.
  - [ ] 7.2 Update prd-api-layer-modernization-p1.md with Phase 2 scope (full api-layer migration, i.e., UserMovieData and Accounts/User to Django-Ninja) and next steps, using insights gained from Phase 1's Core / Movie migration (see notes/notes-api-layer-modernization-p1.md). Note that Phase 2 is deferred until after Authentication Modernization is complete.
  - [ ] 7.3 Create comprehensive atomic commit for Phase 1 completion with proper task references.
  - [ ] 7.4 Merge feature/api-layer-modernization branch to main after all quality gates pass.
  - [ ] 7.5 Follow completion/archive workflow for Phase 1 documentation.

