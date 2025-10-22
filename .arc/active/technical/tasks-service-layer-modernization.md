# Task List: Service Layer Modernization

**PRD Reference:** `.arc/active/technical/prd-service-layer-modernization.md`
**Branch:** `technical/service-layer-modernization`

# Overview

**Purpose:** Modernize CineXplorer's service layer by creating reusable pagination/batch helpers and refactoring
all remaining function-based services to class-based architecture with dependency injection. Establishes consistent
patterns across movie, UserMovieData, and authentication domains.

## Architecture Patterns

- **Class-based services** with constructor dependency injection (established pattern)
- **Factory functions** for common instantiation (e.g., `get_movie_service()`)
- **Functional programming principles**: Immutable data, pure functions, composable helpers
- **Service layer responsibility**: ALL business logic belongs here, NOT in API endpoints

## Current State

- `MovieEnrichmentService`: Exists but incomplete DI (has constructor signature, doesn't use it; mutates in-place)
- `movie_service.py`: Function-based TMDB integration (needs class conversion + result filtering/buffer)
- `ZeptomailService`: Already class-based (verify patterns only)
- `UserMovieDataService`: Doesn't exist (logic currently in API layer)
- `AuthenticationService`: Doesn't exist (logic currently in API layer)
- **TMDB Result Filtering**: Currently in frontend (`useEnhancedFetcher`), needs migration to service layer

## Testing Strategy

- **Test-first protocol** applies to all new services/helpers
- **Coverage targets**: 80% general, 90%+ critical paths (pagination, batch fetch, result filtering, authentication)
- **Integration tests** verify API endpoints unchanged after service extraction

## Test-First Protocol Reminders

- Tasks 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 4.1, 5.1 all follow test-first protocol
- Write tests BEFORE implementation for all new helpers/services
- Verify tests fail initially (red), then pass after implementation (green)
- Use existing test modules as reference for structure and style
- Use existing test_helpers and fixtures for consistency

## Dependency Flow

- Phase 1 (pagination/batch helpers) must complete before Phase 4 (UserMovieDataService uses them)
- Phase 2 (MovieEnrichmentService) should complete before Phase 4 (UserMovieDataService may depend on it)
- Phases 3, 4, 5 can theoretically run in parallel but sequential is safer for integration

## Success Criteria

- Zero business logic in API endpoints (all extracted to services)
- 100% service layer adoption (movie, UserMovieData, authentication)
- All tests pass, zero linting/type errors
- TECHNICAL-ARCHITECTURE.md updated with service patterns

---

## Tasks

### **Phase 1.0: Create Pagination & Batch Operation Helpers (5-7 hours)**

- [x] **1.1 Create Generic Pagination Helper**
    - [x] 1.1.1 Write tests for `paginate_queryset` function (test-first)
        - Valid pagination scenarios (various page numbers, page sizes)
        - Bounds checking (page < 1, page > total_pages)
        - Page size limits enforcement
        - Empty QuerySet handling
        - Target coverage: 90%+ (critical path)
    - [x] 1.1.2 Implement `paginate_queryset` in `backend/apps/core/pagination.py`
        - Accept QuerySet, page number, optional page_size
        - Return tuple: (paginated QuerySet slice, pagination metadata dict)
        - Validate bounds, enforce limits
        - Full type annotations (no `Any` usage)
        - Comprehensive docstring with usage examples
    - [x] 1.1.3 Run tests and incremental quality checks (pagination.py, test_pagination.py)

- [x] **1.2 Create TMDB Batch Fetch Helper**
    - [x] 1.2.1 Write tests for `fetch_movies_batch` function (test-first)
        - Successful batch fetches (all IDs valid)
        - Partial failures (some IDs return 404)
        - Complete failures (all IDs fail)
        - Empty input list handling
        - TMDB API error handling
        - Target coverage: 90%+ (critical path)
    - [x] 1.2.2 Implement `fetch_movies_batch` in `backend/apps/movie/services/batch_operations.py`
        - Accept list of TMDB IDs
        - Return list of successfully fetched `MovieBaseSchema` objects
        - Gracefully handle partial failures (don't fail entire batch)
        - Structured logging for batch operations
        - Full type annotations
        - Comprehensive docstring
    - [x] 1.2.3 Run tests and incremental quality checks (batch_operations.py, test_batch_operations.py)

- [x] **1.3 Create User Movies Response Builder**
    - [x] 1.3.1 Write tests for `build_user_movies_response` function (test-first)
        - Full flow validation (pagination → fetch → enrich → response)
        - Pagination metadata correctness
        - User-specific enrichment data inclusion
        - Edge cases (empty watchlist, unavailable movies)
        - Target coverage: 80%+ (general)
    - [x] 1.3.2 Implement `build_user_movies_response` in `backend/apps/user_movie_data/services/response_builder.py`
        - Accept UserMovieData QuerySet, user object, page number, optional page_size
        - Compose: pagination → TMDB fetch → enrichment → response
        - Return `PaginatedMovieResponseSchema` with enriched data
        - Use `paginate_queryset` from 1.1.2
        - Use `fetch_movies_batch` from 1.2.2
        - Use `MovieEnrichmentService` for enrichment
        - Full type annotations, comprehensive docstring
    - [x] 1.3.3 Run tests and incremental quality checks (response_builder.py, test_response_builder.py)

- [x] **1.4 Investigate and Eliminate Type Ignores**
    - [x] 1.4.1 Audit type ignores in `backend/apps/user_movie_data/api.py`
        - **Found**: 1 type ignore for `reportUnknownMemberType` on `umd.movie.tmdb_id` list comprehension
        - **Root cause**: Chained attribute access through ForeignKey relationship
        - **Solution**: Replaced with `values_list('movie__tmdb_id', flat=True)` for type-safe query
        - **Result**: Type ignore eliminated, more efficient SQL (single query vs iteration)
    - [x] 1.4.2 Audit type ignores in `backend/apps/user_movie_data/services/movie_enrichment_service.py`
        - **Found**: 3 type ignores for `reportUnknownMemberType` on ForeignKey field access
        - **Root cause**: Dict comprehension with chained access + redundant field extraction
        - **Solution 1**: Explicit loop with intermediate variable for dict building
        - **Solution 2**: Reuse Pydantic-validated data instead of re-extracting from ORM
        - **Result**: All 3 type ignores eliminated, clearer logic (use validated data)
    - [x] 1.4.3 Run type checking to verify improvements (target: zero unnecessary type ignores)
        - **Achievement**: 4/4 type ignores eliminated (100% removal)
        - **Pyright**: 0 errors, 0 warnings, 0 informations
        - **Tests**: 55/55 passing (all user_movie_data tests)
        - **Key insight**: Better patterns > suppression comments

- [x] **1.5 Phase 1 Quality Gate**
    - [x] 1.5.1 Run full backend test suite
        - **Result**: 298/298 tests passed (100%)
        - **Note**: 1 teardown error (database cleanup with concurrent tests - not a test failure)
    - [x] 1.5.2 Run all backend linting checks
        - **Result**: All checks passed (Ruff)
    - [x] 1.5.3 Run Python type checking
        - **Result**: 9 errors (test fixtures - acceptable django-types limitations), 46 informations (acceptable)
        - **Production code**: 0 errors
    - [x] 1.5.4 Run markdown linting
        - **Result**: 0 errors (49 files checked)

---

### **Phase 2.0: Complete MovieEnrichmentService Refactoring (1-2 hours)**

- [ ] **2.1 Fix Mutation Anti-Pattern**
    - [ ] 2.1.1 Write tests verifying non-mutation behavior (test-first)
        - Assert input list unchanged after enrichment
        - Verify enriched data returns new list with new MovieBaseSchema instances
        - Ensure original schemas remain unmodified
    - [ ] 2.1.2 Refactor `enrich_movies_with_user_movie_data` method
        - Return new list with enriched copies
        - Do NOT mutate input list in-place
        - Use Pydantic's `.model_copy(update={...})` for immutable updates
        - Update docstring to document non-mutation guarantee
    - [ ] 2.1.3 Run tests and verify no regressions (test_movie_enrichment_service.py)

- [ ] **2.2 Implement Actual Dependency Injection**
    - [ ] 2.2.1 Create UserMovieData repository interface/class
        - Define repository with `get_for_user_and_movies(user, tmdb_ids)` method
        - Implement concrete repository using Django ORM
        - Located in `backend/apps/user_movie_data/repositories.py`
    - [ ] 2.2.2 Write tests verifying DI implementation (test-first)
        - Test service with mocked repository
        - Verify ORM is NOT called directly (uses injected repository)
        - Verify repository injection works correctly
    - [ ] 2.2.3 Refactor MovieEnrichmentService to use injected repository
        - Update constructor to inject repository (already has signature)
        - Replace direct ORM calls with repository method calls
        - Update `_repository` usage (currently unused)
        - Maintain backward compatibility (default repository if none injected)
    - [ ] 2.2.4 Update service factory function
        - Create `get_movie_enrichment_service(user)` factory
        - Located in `backend/apps/user_movie_data/services/service_factory.py`
        - Returns MovieEnrichmentService with default repository
    - [ ] 2.2.5 Run tests and incremental quality checks (user_movie_data service/tests)

- [ ] **2.3 Phase 2 Quality Gate**
    - [ ] 2.3.1 Run full backend test suite
    - [ ] 2.3.2 Run all backend linting checks
    - [ ] 2.3.3 Run Python type checking

---

### **Phase 3.0: Refactor MovieService to Class-Based Architecture (6-9 hours)**

- [ ] **3.1 Create MovieService Class**
    - [ ] 3.1.1 Write tests for MovieService class methods (test-first)
        - Test `get_movie_by_id` with mocked TMDB client
        - Test `search_movies` with mocked TMDB client
        - Test `discover_movies` with mocked TMDB client
        - Test all existing function-based operations
        - Target coverage: 80%+ (general)
    - [ ] 3.1.2 Create `MovieService` class in `backend/apps/movie/services/movie_service.py`
        - Convert all function-based TMDB integration to class methods
        - Inject TMDB client via constructor (dependency injection)
        - Methods: `get_movie_by_id`, `search_movies`, `discover_movies`, etc.
        - Maintain existing functionality exactly (no behavior changes)
        - Follow pattern from MovieEnrichmentService and ZeptomailService
        - Full type annotations, comprehensive docstrings
    - [ ] 3.1.3 Create service factory function
        - Implement `get_movie_service()` in `backend/apps/movie/services/service_factory.py`
        - Returns MovieService with default TMDB client
    - [ ] 3.1.4 Run tests and incremental quality checks (movie service/tests)

- [ ] **3.2 Add TMDB Result Filtering & Buffer Mechanism**
    - [ ] 3.2.1 Write tests for filtering and buffer logic (test-first)
        - Mock TMDB client returns movies with incorrect release years
        - Verify service filters out mismatched movies (year, rating)
        - **Note**: Runtime filtering NOT tested (TMDB API limitation - not implemented)
        - Verify service backfills from next page when gaps detected
        - Test minimum threshold logic (don't backfill if <10 natural results)
        - Test buffer application maintains correct filters
        - Test across different endpoint contexts (discover, search, now playing, upcoming)
        - Target coverage: 90%+ (critical UX path)
    - [ ] 3.2.2 Implement filtering helper in `backend/apps/movie/services/result_filtering.py`
        - Create `filter_movies_by_year(movies, year_criteria)` function
        - Create `filter_movies_by_rating(movies, rating_criteria)` function
        - **Note**: Runtime filtering NOT implemented (TMDB API doesn't support it - documented limitation)
        - Full type annotations, comprehensive docstrings
        - Document TMDB API quirks (incorrect year filtering despite API filters)
    - [ ] 3.2.3 Implement buffer mechanism in MovieService paginated methods
        - Add `_fetch_and_filter_page()` private helper method
        - Add `_apply_buffer_if_needed()` private helper method
        - Update `discover_movies()` to use filtering + buffer
        - Update `search_movies()` to use filtering + buffer (used in search results with filter refinement)
        - Update `get_now_playing_movies()` to use filtering + buffer
        - Update `get_upcoming_movies()` to use filtering + buffer
        - Strategy: Fetch page N+1 if results < 18 after filtering (maintain 20/page target)
        - Ensure buffer movies also pass client-side filters (prevent leakage)
        - Apply across all contexts: discover pages, search results (wherever users refine filters)
    - [ ] 3.2.4 Run tests and incremental quality checks (result_filtering.py, movie service)
    - [ ] 3.2.5 Document frontend simplification opportunities
        - Create tech debt task to remove client-side filtering from `useEnhancedFetcher`
        - Note: Frontend can now trust backend returns correctly filtered results
        - Future: Remove `movieFilterUtils.ts` filtering functions (after verification)

- [ ] **3.3 Update API Endpoints to Use MovieService Class**
    - [ ] 3.3.1 Update movie API endpoints in `backend/apps/movie/api.py`
        - Replace direct function calls with `get_movie_service()` factory
        - Instantiate service at endpoint level or module level (determine best approach)
        - Maintain exact same API behavior (backward compatibility)
    - [ ] 3.3.2 Update movie helpers in `backend/apps/movie/helpers.py` if needed
        - Verify enrichment helpers work with new service class
        - Update imports if necessary
    - [ ] 3.3.3 Run API integration tests (test_api.py - verify all endpoints work)
    - [ ] 3.3.4 Run incremental quality checks (movie app)

- [ ] **3.4 Phase 3 Quality Gate**
    - [ ] 3.4.1 Run full backend test suite
    - [ ] 3.4.2 Run all backend linting checks
    - [ ] 3.4.3 Run Python type checking

---

### **Phase 4.0: Create UserMovieDataService (4-5 hours)**

- [ ] **4.1 Create UserMovieDataService Class**
    - [ ] 4.1.1 Write tests for UserMovieDataService CRUD operations (test-first)
        - Test CREATE: TMDB fetch → Movie stub creation → UserMovieData creation
        - Test UPDATE: Partial field updates with validation
        - Test DELETE: Authorization and deletion logic
        - Test QUERY: Filtering (watchlist, ratings) with pagination
        - Mock dependencies: Movie repository, TMDB client
        - Target coverage: 80%+ (general)
    - [ ] 4.1.2 Create `UserMovieDataService` class in `backend/apps/user_movie_data/services/user_movie_data_service.py`
        - Extract business logic from `backend/apps/user_movie_data/api.py`
        - Implement CREATE operations (fetch from TMDB, create Movie stub, create UserMovieData)
        - Implement UPDATE operations (partial updates with validation)
        - Implement DELETE operations (authorization checks, deletion)
        - Implement QUERY operations (filtering with pagination using helpers from 1.1)
        - Inject dependencies: Movie repository (or ORM), TMDB client
        - Use pagination helper from 1.1.2
        - Use batch fetch helper from 1.2.2
        - Follow DI pattern from MovieEnrichmentService
        - Full type annotations, comprehensive docstrings
    - [ ] 4.1.3 Create service factory function
        - Implement `get_user_movie_data_service()` in `backend/apps/user_movie_data/services/service_factory.py`
        - Returns UserMovieDataService with injected dependencies
    - [ ] 4.1.4 Run tests and incremental quality checks (user_movie_data service/tests)

- [ ] **4.2 Update UserMovieData API Endpoints to Use Service Layer**
    - [ ] 4.2.1 Refactor UserMovieData API endpoints in `backend/apps/user_movie_data/api.py`
        - Replace inline business logic with service calls
        - Extract all CREATE/UPDATE/DELETE/QUERY logic to service layer
        - Use `get_user_movie_data_service()` factory
        - API layer should ONLY handle: request/response, authentication, validation
        - Maintain exact same API contracts (backward compatibility)
    - [ ] 4.2.2 Update watchlist endpoint tests to verify pagination
        - Validate pagination parameters work correctly
        - Test pagination metadata in responses
        - Verify page size enforcement
    - [ ] 4.2.3 Run API integration tests (verify all 5 endpoints work, auth/error handling unchanged)
    - [ ] 4.2.4 Run incremental quality checks (user_movie_data app)

- [ ] **4.3 Phase 4 Quality Gate**
    - [ ] 4.3.1 Run full backend test suite
    - [ ] 4.3.2 Run all backend linting checks
    - [ ] 4.3.3 Run Python type checking

---

### **Phase 5.0: Create AuthenticationService (4-6 hours)**

- [ ] **5.1 Create AuthenticationService Class**
    - [ ] 5.1.1 Write tests for AuthenticationService methods (test-first)
        - Test REGISTRATION: User creation, password validation, forbidden usernames, allauth EmailAddress integration
        - Test LOGIN/LOGOUT: Authentication, token generation/blacklisting, cookie management
        - Test TOKEN MANAGEMENT: Refresh token validation, blacklisting, rotation
        - Test EMAIL VERIFICATION: Verification flow, resend logic, EmailConfirmation handling
        - Test USER PROFILE: GET/PATCH operations with validation
        - Mock dependencies: Email service, token utilities
        - Target coverage: 90%+ (security-critical)
    - [ ] 5.1.2 Create `AuthenticationService` class in `backend/apps/authentication/services/authentication_service.py`
        - Extract business logic from `backend/apps/authentication/api.py`
        - Implement registration logic (user creation, validation, allauth integration)
        - Implement login/logout logic (authentication, tokens, cookies)
        - Implement token management (refresh, blacklisting, rotation)
        - Implement email verification (verify flow, resend logic)
        - Implement user profile operations (GET, PATCH with validation)
        - Inject dependencies: Email service, token utilities
        - Follow established DI pattern
        - Full type annotations, comprehensive docstrings
        - **Note**: This is backend service; frontend auth service already exists
    - [ ] 5.1.3 Create service factory function
        - Implement `get_authentication_service()` in `backend/apps/authentication/services/service_factory.py`
        - Returns AuthenticationService with injected email service, token utilities
    - [ ] 5.1.4 Run tests and incremental quality checks (authentication service/tests)

- [ ] **5.2 Update Authentication API Endpoints to Use Service Layer**
    - [ ] 5.2.1 Refactor Authentication API endpoints in `backend/apps/authentication/api.py`
        - Replace inline business logic with service calls
        - Extract all registration/login/token/verification/profile logic to service layer
        - Use `get_authentication_service()` factory
        - API layer should ONLY handle: request/response, authentication, rate limiting
        - Maintain exact same API contracts (backward compatibility)
    - [ ] 5.2.2 Run API integration tests (verify all 9 endpoints work, security features unchanged)
    - [ ] 5.2.3 Run incremental quality checks (authentication app)

- [ ] **5.3 Phase 5 Quality Gate**
    - [ ] 5.3.1 Run full backend test suite
    - [ ] 5.3.2 Run all backend linting checks
    - [ ] 5.3.3 Run Python type checking

---

### **Phase 6.0: Integration Testing & Documentation (2-3 hours)**

- [ ] **6.1 Verify Email Service Patterns**
    - [ ] 6.1.1 Review `ZeptomailService` in `backend/apps/core/services/email_service.py`
        - Verify it follows same DI patterns as other services
        - Verify constructor injection for configuration
        - Confirm it's already class-based (no refactoring needed)
    - [ ] 6.1.2 Verify email service factory exists
        - Check for `get_email_service()` factory function
        - Ensure it follows established pattern
    - [ ] 6.1.3 Document email service as reference implementation (if exemplary)

- [ ] **6.2 Run Comprehensive Integration Tests**
    - [ ] 6.2.1 Run full UserMovieData integration test suite (all 5 endpoints after service extraction)
    - [ ] 6.2.2 Run full Authentication integration test suite (all 9 endpoints after service extraction)
    - [ ] 6.2.3 Run full Movie integration test suite (all endpoints after MovieService refactoring)

- [ ] **6.3 Update TECHNICAL-ARCHITECTURE.md**
    - [ ] 6.3.1 Add service layer architecture patterns section
        - Document class-based service pattern with DI
        - Provide decision guide: "When to use class-based vs function-based"
        - Document pagination helper usage guidelines
        - Document batch operation patterns
        - Document dependency injection patterns and best practices
    - [ ] 6.3.2 Add reference implementations section
        - Link to MovieService (TMDB integration)
        - Link to UserMovieDataService (CRUD with pagination)
        - Link to AuthenticationService (security-critical operations)
        - Link to MovieEnrichmentService (composition pattern)
        - Link to ZeptomailService (email integration)
    - [ ] 6.3.3 Add architectural guidelines
        - Guideline: "Business logic belongs in service layer, NOT API endpoints"
        - Guideline: "Use factory functions for service instantiation"
        - Guideline: "Use dependency injection for testability"
        - Security note: "Authentication service handles security-critical operations"
    - [ ] 6.3.4 Run markdown linting on TECHNICAL-ARCHITECTURE.md

- [ ] **6.4 Final Quality Gate (All Gates)**
    - [ ] 6.4.1 Run full backend test suite with coverage
    - [ ] 6.4.2 Address any coverage gaps (target: 80% general, 90%+ critical paths)
    - [ ] 6.4.3 Run all backend linting checks
    - [ ] 6.4.4 Run Python type checking (comprehensive)
    - [ ] 6.4.5 Run frontend tests (ensure no regressions)
    - [ ] 6.4.6 Run frontend linting
    - [ ] 6.4.7 Run frontend type checking
    - [ ] 6.4.8 Run markdown linting on all documentation

- [ ] **6.5 Final Pre-Archival and PR Documentation Pass**
    - [ ] 6.5.1 Generate completion metadata
        - Document all completed work across 6 phases
        - List success metrics achieved
        - Provide quality gate results summary
    - [ ] 6.5.2 Check if PROJECT-STATUS.md needs updates
        - Update Service Layer Modernization status to "Complete"
        - Update next priorities if needed
        - Update timestamp

---

## Implementation Notes

{ to be added as needed during implementation }
