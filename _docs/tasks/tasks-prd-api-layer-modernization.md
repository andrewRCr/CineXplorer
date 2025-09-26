This task list covers **Phase 1 (Proof of Concept)** of the API Layer Modernization, focusing exclusively on the `movie` app. The migration of other apps will be handled in a subsequent phase after this PoC is successfully completed.

---

## Relevant Files

### Files to be Created
- `backend/config/api.py` - ✅ Central `NinjaAPI` instance with native JWT authentication, OpenAPI documentation, and enhanced endpoints.
- `backend/apps/movie/api.py` - To define the Ninja router and path operations for the `movie` app.
- `backend/apps/movie/schemas.py` - To define the Pydantic schemas that replace DRF serializers for the `movie` app.
- `backend/apps/user/auth_ninja.py` - ✅ Enhanced Django Ninja JWT cookie authentication with native integration, OpenAPI schema, and comprehensive error handling.
- `backend/shared/__init__.py` - ✅ Temporary shared module stub (to be replaced by Pydantic schemas).
- `backend/shared/api_types.py` - ✅ TMDB API type definitions stub (temporary).
- `backend/shared/error_codes.py` - ✅ Error codes constants stub (temporary).
- `_docs/tasks/tasks-prd-api-layer-modernization.md` - This task list file.

### Files to be Modified
- `backend/requirements/req.txt` - To add the `django-ninja` dependency.
- `backend/.dockerignore` - Added to exclude node_modules from Docker build context.
- `backend/config/urls.py` - To wire in the main Ninja API router.
- `backend/middleware/logging.py` - ✅ Fixed type checking issues for dynamic HttpRequest attributes.
- `backend/apps/movie/tests/*` - API tests will be adapted for the new Ninja endpoints.
- `frontend/package.json` - To add a `pydantic-to-typescript` style development dependency.
- `frontend/src/services/movieService.ts` - To update API endpoint URLs.
- `frontend/src/@types/movie.d.ts` - Will be replaced by auto-generated types.
- `_docs/PROJECT-STATUS.md` - To add this new feature to the project status.

### Files to be Removed/Deprecated
- `backend/apps/movie/views.py` - The old DRF views will be removed after migration.
- `backend/apps/movie/serializers.py` - The old DRF serializers will be removed.
- The DRF-specific URL configuration for the `movie` app.

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
  - [x] 2.5.1 Create `backend/apps/user/auth_ninja.py`.
  - [x] 2.5.2 In the new file, define a class `JWTCookieAuth` that implements a Ninja security scheme (e.g., `APIKeyCookie`).
  - [x] 2.5.3 Implement Django Ninja native integration mitigation: Add OpenAPI security schema, proper error handling, and dependency injection wrapper to get full native Ninja benefits.
  - [x] 2.5.4 Configure the main `NinjaAPI` instance in `backend/config/api.py` to use this as a global authentication scheme.
  - [x] 2.5.5 Create a temporary authenticated test endpoint to verify the new auth scheme correctly protects routes and identifies the user.

- [ ] 3.0 **Proof-of-Concept: Migrate `movie` App Endpoints**
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
  - [ ] 3.5 Add the new `movie` router to the main `NinjaAPI` instance.
  - [ ] 3.6 Once all `movie` endpoints are migrated and confirmed working, delete the old `backend/apps/movie/views.py` and `backend/apps/movie/serializers.py` files.

- [ ] 4.0 **Testing and Validation**
  - [ ] 4.1 Adapt the existing API tests in the `movie` app to target the new Ninja endpoints using Django's test client.
  - [ ] 4.2 Ensure all adapted tests for the `movie` app pass successfully.
  - [ ] 4.3 Use the interactive API docs at `/api/docs` to manually test the new `movie` endpoints and confirm functionality.
  - [ ] 4.4 Run `mypy --strict` and `pyright` on the `backend/apps/movie/` directory and resolve all type errors.

- [ ] 5.0 **Frontend Integration and Type Generation Workflow**
  - [ ] 5.1 Research and select a `pydantic-to-typescript` tool and add it as a dev dependency to `frontend/package.json`.
  - [ ] 5.2 Create a script in `package.json` to run the type generator.
  - [ ] 5.3 Run the script to generate a new `movie.d.ts` file from the Pydantic schemas.
  - [ ] 5.4 Refactor the frontend code to import and use these new auto-generated types, removing the old manual types.
  - [ ] 5.5 Update API URLs in `frontend/src/services/movieService.ts` if necessary.
  - [ ] 5.6 Thoroughly test all movie-related features in the running application to confirm the frontend is working correctly with the new API.