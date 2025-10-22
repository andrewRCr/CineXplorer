# PRD: Service Layer Modernization

## 1. Introduction/Overview

This PRD defines the scope for modernizing CineXplorer's service layer by establishing reusable patterns for data
access, batch operations, and service composition. This work creates foundational infrastructure that unblocks
UserMovieData feature development and establishes consistent patterns across the entire service layer.

**Problem Statement:** During API Layer Modernization Phase 2, service layer patterns were established
(MovieEnrichmentService, frontend auth service), but backend service layer remains incomplete:

- Missing pagination support across endpoints (blocks UserMovieData features)
- Function-based movie service lacks dependency injection pattern
- Duplicate TMDB batch fetch logic across endpoints
- MovieEnrichmentService is incomplete: has DI signature but doesn't use it (calls ORM directly), mutates data in-place
- UserMovieData CRUD business logic resides in API layer (should be in service layer)
- Authentication business logic resides in API layer (registration, token management, email verification, user profiles)
- Unnecessary type ignores despite available stubs

**Solution:** Create reusable pagination/batch helpers and refactor remaining function-based services to class-based
architecture with dependency injection, establishing consistent patterns before broader Backend Modernization.

**Work Classification:** Technical Infrastructure

## 2. Goals

1. **Unblock Feature Development:** Create pagination helpers that enable UserMovieData feature endpoints
2. **Establish Reusable Patterns:** Provide reference implementations for pagination, batch operations, and service
   composition
3. **Improve Maintainability:** Eliminate duplicate code and establish consistent service layer architecture
4. **Enhance Type Safety:** Remove unnecessary type ignores and improve type inference
5. **Enable Testing:** Make services easier to test through dependency injection

## 3. User Stories

**As a backend developer**, I want reusable pagination helpers so that I can add paginated endpoints without
duplicating pagination logic across the codebase.

**As a backend developer**, I want class-based services with dependency injection so that I can easily mock
dependencies in tests and maintain clear separation of concerns.

**As a backend developer**, I want batch TMDB fetch helpers so that I can avoid N+1 query patterns and handle partial
failures gracefully across multiple endpoints.

**As a feature developer**, I want consistent service layer patterns so that I can understand and extend services
without learning different patterns in each domain.

**As a QA engineer**, I want functional, non-mutating service methods so that I can reason about data flow and avoid
unexpected side effects in complex operations.

## 4. Functional Requirements

### 4.1 Pagination & Batch Operations

**4.1.1** The system must provide a generic Django QuerySet pagination helper (`paginate_queryset`) that:

- Accepts a QuerySet, page number, and optional page size
- Returns a paginated QuerySet slice and pagination metadata (page, total_pages, total_results)
- Validates bounds (page >= 1, enforces page_size limits)
- Is fully type-safe with complete type annotations
- Is domain-agnostic (located in `backend/apps/core/pagination.py`)

**4.1.2** The system must provide a TMDB batch fetch helper (`fetch_movies_batch`) that:

- Accepts a list of TMDB IDs
- Returns a list of successfully fetched `MovieBaseSchema` objects
- Gracefully handles partial failures (404s, API errors) without failing the entire batch
- Includes structured logging for batch operations
- Is fully type-safe

**4.1.3** The system must provide a high-level user movies response builder (`build_user_movies_response`) that:

- Accepts a UserMovieData QuerySet, user object, page number, and optional page size
- Composes pagination → TMDB fetch → enrichment → response in a single function
- Returns a `PaginatedMovieResponseSchema` with enriched movie data
- Handles the complete flow for paginated user movie endpoints

**4.1.4** The system must complete MovieEnrichmentService refactoring:

- **Fix mutation anti-pattern**: Return new list with enriched copies instead of mutating input in-place
- **Implement actual DI**: Currently has DI signature but doesn't use injected repository (uses ORM directly)
- **Repository pattern**: Inject UserMovieData repository for actual dependency inversion
- Align with Pydantic's immutable-by-default philosophy
- Make the method pure (no side effects)

**4.1.5** The system must investigate and eliminate unnecessary type ignores in:

- `backend/apps/user_movie_data/api.py`
- `backend/apps/movie/movie_enrichment_service.py`
- Document any remaining ignores as legitimate django-types limitations if they cannot be removed

### 4.2 Class-Based Service Refactoring

**4.2.1** The system must refactor `backend/apps/movie/movie_service.py` to `MovieService` class:

- Convert all function-based TMDB integration functions to class methods
- Inject TMDB client via constructor (dependency injection pattern)
- Maintain existing functionality: `get_movie_by_id`, `search_movies`, `discover_movies`
- **Add TMDB result filtering and buffer mechanism** (migrate from frontend):
    - Filter out movies with incorrect release years (TMDB API quirk - returns wrong years despite API filters)
    - Filter movies by rating criteria (client-side validation)
    - **Note**: Runtime filtering NOT implemented (TMDB API doesn't support it properly - documented limitation)
    - Backfill from next page when filtering creates gaps (<18 results)
    - Ensure buffer movies also pass client-side filters (prevent leakage)
    - Maintain consistent page size (target 20 results per page)
    - Apply to all paginated endpoints: `discover_movies()`, `search_movies()`, `get_now_playing_movies()`, `get_upcoming_movies()`
    - Used across multiple UI contexts: discover pages, search results (all support filter refinement)
- Follow established pattern from authentication services

**4.2.2** The system must create `UserMovieDataService` class to extract business logic from API layer:

- **CREATE operations**: TMDB fetch → Movie stub creation → UserMovieData creation logic
- **UPDATE operations**: Partial field updates with validation
- **DELETE operations**: Authorization and deletion logic
- **QUERY operations**: Filtering (watchlist, ratings, etc.) with pagination support
- Inject dependencies: Movie repository (or ORM QuerySet manager), TMDB client
- Use pagination helpers created in 4.1.1
- Use batch fetch helpers created in 4.1.2
- Follow established DI pattern

**4.2.3** The system must create `AuthenticationService` class to extract business logic from API layer:

- **Registration**: User creation, password validation, forbidden username checks, allauth EmailAddress integration
- **Login/Logout**: Authentication, token generation/blacklisting, cookie management
- **Token Management**: Refresh token validation, blacklisting, rotation
- **Email Verification**: Verification flow, resend logic, EmailConfirmation handling
- **User Profile**: GET/PATCH operations with validation
- Inject dependencies: Email service, token utilities
- Follow established DI pattern
- **Note**: Frontend auth service already exists; this is backend service extraction

**4.2.4** The system must verify email service follows established patterns:

- Email service (`ZeptomailService`) is already class-based with injected configuration
- Verify it follows the same DI patterns as other services
- No refactoring needed (already modernized)

**4.2.5** The system must update all API endpoints to use service classes:

- Replace direct function calls with service class instantiation
- Extract business logic from UserMovieData API endpoints to service layer
- Extract business logic from Authentication API endpoints to service layer
- Use dependency injection pattern throughout
- Maintain backward compatibility (no API contract changes)

**4.2.6** The system must create service factory functions for common instantiation patterns:

- `get_movie_service()` - MovieService with default TMDB client
- `get_user_movie_data_service()` - UserMovieDataService with dependencies
- `get_authentication_service()` - AuthenticationService with email service, token utilities
- `get_movie_enrichment_service(user)` - MovieEnrichmentService with user context
- Email service factory already exists (`get_email_service()` in email_service.py)
- Located in appropriate `service_factory.py` modules per domain

### 4.3 Testing Requirements

**4.3.1** The system must provide unit tests for generic pagination helper covering:

- Valid pagination (various page numbers, page sizes)
- Bounds checking (page < 1, page > total_pages)
- Page size limits enforcement
- Empty QuerySet handling
- **Target Coverage:** 90%+ (critical path)

**4.3.2** The system must provide unit tests for TMDB batch fetch helper covering:

- Successful batch fetches (all IDs valid)
- Partial failures (some IDs return 404)
- Complete failures (all IDs fail)
- Empty input list handling
- TMDB API error handling
- **Target Coverage:** 90%+ (critical path)

**4.3.3** The system must provide integration tests for user movies response builder covering:

- Full flow validation (pagination → fetch → enrich → response)
- Pagination metadata correctness
- User-specific enrichment data inclusion
- Edge cases (empty watchlist, unavailable movies)
- **Target Coverage:** 80%+ (general)

**4.3.4** The system must update existing watchlist endpoint tests to:

- Validate pagination parameters
- Test pagination metadata in responses
- Verify page size enforcement

**4.3.5** The system must provide tests validating MovieEnrichmentService refactoring:

- Assert input list unchanged after enrichment (mutation fix)
- Verify enriched data returns new list
- Test repository injection works correctly (DI implementation)
- Verify ORM is no longer called directly (uses injected repository)

**4.3.6** The system must provide tests for refactored service classes:

- MovieService class methods (with mocked TMDB client)
- **TMDB result filtering and buffer mechanism:**
    - Mock TMDB client returns movies with incorrect release years
    - Verify service filters out mismatched movies (year, rating)
    - **Note**: Runtime filtering not tested (TMDB API limitation - not implemented)
    - Verify service backfills from next page when gaps detected
    - Test minimum threshold logic (don't backfill if <10 natural results)
    - Test buffer application maintains correct filters (prevent leakage)
    - Test across different endpoint contexts (discover, search, now playing, upcoming)
- UserMovieDataService class methods (CRUD operations with mocked dependencies)
- AuthenticationService class methods (registration, login, token management, email verification, user profile)
- Email service verification (already has tests, verify they follow patterns)
- Service factory functions return correctly configured instances
- **Target Coverage:** 80%+ (general) for service classes, 90%+ for authentication (security-critical),
  90%+ for result filtering (critical UX path)

**4.3.7** The system must verify API endpoints still work after service extraction:

- **UserMovieData**: All 5 endpoints maintain same behavior (GET /movies, GET /by-tmdb-id, POST, PATCH, DELETE)
- **Authentication**: All 9 endpoints maintain same behavior (register, login, logout, refresh, verify, resend, profile
  GET/PATCH, CSRF)
- Integration tests validate end-to-end flow through new service layer
- Authorization and error handling unchanged
- Security features unchanged (rate limiting, token blacklisting, CSRF protection)

### 4.4 Documentation Requirements

**4.4.1** All new helpers and services must include comprehensive docstrings with:

- Purpose and usage description
- Parameter documentation with types
- Return value documentation
- Usage examples where helpful
- Notes on error handling behavior

**4.4.2** The system must update `TECHNICAL-ARCHITECTURE.md` (final task) with:

- Service layer architecture patterns section
- Decision guide: "When to use class-based vs function-based approaches"
- Pagination helper usage guidelines
- Dependency injection patterns and best practices
- Links to reference implementations (MovieService, UserMovieDataService, AuthenticationService, MovieEnrichmentService,
  ZeptomailService)
- Guideline: "Business logic belongs in service layer, not API endpoints"
- Security note: "Authentication service handles security-critical operations (token management, user verification)"

## 5. Non-Goals (Out of Scope)

**5.1** This work does NOT include:

- Frontend UI implementation for UserMovieData features (separate feature work)
- Asynchronous task processing (Celery/Redis) - deferred to Backend Modernization
- End-to-end testing infrastructure (Playwright) - deferred to Backend Modernization
- Additional service layer refactoring beyond movie, UserMovieData, and authentication services
- Cache layer implementation for TMDB responses (future enhancement after filtering in place)
- New UserMovieData or authentication features (only refactoring existing operations)
- OAuth provider integration changes (keep existing allauth integration as-is)
- **Removing frontend filtering logic immediately** (document as tech debt, remove after backend verification)

**5.2** Generic pagination helper is NOT:

- TMDB API pagination (different pattern - uses page parameter in API requests)
- Frontend pagination logic (handled by React components)
- A Django Rest Framework paginator (we use Django Ninja with Pydantic)

**5.3** Service refactoring does NOT:

- Change any API contracts or endpoint signatures
- Modify frontend service layer integration
- Require frontend code changes
- Impact existing feature behavior

## 6. Technical Considerations

### 6.1 Architecture Patterns

**Service Layer Pattern Established:**

- Class-based services with constructor dependency injection
- Single responsibility per service
- Factory functions for common instantiation patterns
- Reference implementation: `MovieEnrichmentService` (completed in API Layer P2)

**Functional Programming Principles:**

- Immutable data patterns (no in-place mutations)
- Pure functions where possible (predictable, testable)
- Composable helpers (pagination + fetch + enrich)

### 6.2 Dependencies

**Required:**

- Existing TMDB client integration
- Pydantic schemas (`MovieBaseSchema`, `PaginatedMovieResponseSchema`)
- Django ORM QuerySet support
- Type stubs: django-types, custom stubs (allauth, ninja-jwt)

**Testing Dependencies:**

- pytest framework (migration complete as of 2025-10-13)
- pytest fixtures for service instantiation
- Mock TMDB client for service tests

### 6.3 Type Safety Strategy

**Follow established patterns from [Type Safety Strategy](../strategies/strategy-type-safety.md):**

- Zero tolerance for unnecessary `Any` usage
- Use `object` for unknown types, `dict[str, object]` for generic dictionaries
- Comprehensive type annotations on all public methods
- Investigate and document/eliminate all `# pyright: ignore` comments

### 6.4 Testing Strategy

**Follow established patterns from [Testing Methodology Strategy](../strategies/strategy-testing-methodology.md):**

- **Coverage Targets:** 80% general, 90%+ critical paths (pagination, batch fetch)
- **Test-First Protocol:** Write tests before implementation for all new helpers/services per DEVELOPMENT-RULES
- Integration over unit tests where practical
- Fixtures for service instantiation with mocked dependencies

### 6.5 Performance Considerations

**Pagination:**

- Use Django QuerySet slicing (efficient database queries)
- Avoid loading entire QuerySet into memory
- Leverage database-level pagination

**Batch Operations:**

- Graceful degradation on partial failures (don't block entire batch)
- Structured logging for observability
- Consider future caching layer (out of scope for this work)

**Result Filtering & Buffer Mechanism:**

- **TMDB API Quirk:** TMDB often returns movies with incorrect release years despite API filters
- **Client-side filtering:** Apply year/rating filters after TMDB responds to ensure accuracy
    - **Genre filtering:** Handled by TMDB API (works correctly)
    - **Year filtering:** Client-side (TMDB returns incorrect years)
    - **Rating filtering:** Client-side validation
    - **Runtime filtering:** NOT implemented (TMDB API doesn't support it properly - documented limitation)
- **Buffer strategy:** Fetch page N+1 when filtering creates gaps (<18 results), backfill to maintain 20/page
- **Minimum threshold:** Only backfill if ≥10 natural results (avoid filling when filter is too restrictive)
- **Filter consistency:** Buffer movies must also pass client-side filters to prevent "leakage"
- **Performance:** Server-side filtering enables future caching layer (cache filtered results, not raw TMDB)
- **Usage scope:** Applied to discover pages AND search results (all contexts where users refine filters)

## 7. Success Metrics

**Objective Criteria:**

1. **Pattern Establishment:**
   - All service layer code uses class-based services with DI (100% adoption)
   - Generic pagination helper used by UserMovieData service
   - Zero function-based services remaining (movie, UserMovieData, authentication complete)
   - Zero business logic in API endpoints (all extracted to services)
   - Complete backend service layer coverage across all domains

2. **Code Quality:**
   - Zero type errors (Pyright strict mode)
   - Zero linting violations (Ruff)
   - 100% test pass rate
   - Coverage targets met (80% general, 90%+ critical paths)

3. **Documentation:**
   - All helpers/services have comprehensive docstrings
   - TECHNICAL-ARCHITECTURE.md updated with service layer patterns
   - Decision guides provided for future service implementations

4. **Feature Enablement:**
   - Pagination helpers successfully integrated into at least one UserMovieData endpoint
   - Foundation ready for remaining UserMovieData feature work

**Qualitative Criteria:**

- Code is easier to understand and maintain (consistent patterns)
- Services are easier to test (dependency injection enables mocking)
- Developers can extend service layer without learning new patterns

## 8. Open Questions

None. Scope is well-defined based on comprehensive planning completed during Backend Modernization preparation.

## 9. Implementation Notes

### 9.1 Work Sequencing

**Phase 1: Pagination & Batch Operations (5-7 hours)**

- Generic pagination helper + tests
- TMDB batch fetch helper + tests
- User movies response builder + tests
- MovieEnrichmentService completion (mutation fix + actual DI implementation) + tests
- Type safety improvements

**Phase 2: MovieEnrichmentService Completion (1-2 hours)**

- Fix mutation anti-pattern (return new list instead of mutating input)
- Implement actual dependency injection (use injected repository instead of ORM)
- Create UserMovieData repository interface/class
- Update service factory function
- Tests + quality checks

**Phase 3: MovieService Class-Based Refactoring (6-9 hours)**

- MovieService class creation + tests
- **TMDB result filtering and buffer mechanism:**
    - Filtering helper functions (year, rating, runtime)
    - Buffer mechanism implementation (fetch page N+1 when gaps detected)
    - Integration into all paginated methods (discover, search, now playing, upcoming)
    - Document frontend simplification opportunities
- Update API endpoints to use MovieService class
- Integration testing + quality checks

**Phase 4: UserMovieDataService Creation (4-5 hours)**

- UserMovieDataService creation (extract from API layer) + tests
- Update API endpoints to use service class
- Service factory function + tests
- Integration testing

**Phase 5: AuthenticationService Creation (4-6 hours)**

- AuthenticationService creation (extract from API layer) + tests
- Update API endpoints to use service class
- Service factory function + tests
- Verify email service patterns (already class-based)
- Integration testing (verify Authentication endpoints unchanged)

**Phase 6: Integration Testing & Documentation (2-3 hours)**

- Final integration testing across all services
- TECHNICAL-ARCHITECTURE.md update with service patterns
- Verify all quality gates pass

**Total Effort Estimate:** 23-32 hours

**Note:** Initial estimate was 14-21h. Adjustments:

- Reduced 2-3h (email service already class-based)
- Added 1h (MovieEnrichmentService needs actual DI implementation, not just mutation fix)
- Added 4-5h (UserMovieDataService creation - extract business logic from API layer)
- Added 4-6h (AuthenticationService creation - extract security-critical logic, complete service layer coverage)
- Added 2-3h (TMDB result filtering and buffer mechanism - migrate from frontend to service layer)

### 9.2 Feature Branch Workflow

- Branch: `technical/service-layer-modernization` (created from main)
- Incremental commits following atomic commit workflow
- Quality gates enforced after each parent task
- PR to main when all work complete

### 9.3 Foundation Work Already Complete

**Service Layer Architecture (Partially Established):**

- Authentication services extracted to class-based architecture with DI
- MovieEnrichmentService created with class-based structure but incomplete DI (has signature, doesn't use it)
- Patterns partially validated during API Layer Modernization Phase 2

**References:**

- `.arc/reference/archive/tasks/incidental/tasks-incidental-auth-service-extraction.md`
- `.arc/reference/archive/tasks/incidental/tasks-incidental-oauth-headless-migration.md`

**Current Frontend Implementation (to be migrated):**

- TMDB result filtering: `frontend/src/hooks/useEnhancedFetcher.ts` (lines 126-272)
- Filter utilities: `frontend/src/utilities/movieFilterUtils.ts` (year, rating, runtime filters)
- TECHNICAL-ARCHITECTURE.md reference (line 80): "dynamically fills gaps using a pre-fetched buffer"
- Current limitation: Only fills from current page buffer, not next page

### 9.4 Related Work

**Blocks:**

- UserMovieData feature UI work (pagination required)

**Prepares for:**

- Backend Modernization (establishes service patterns before async work)
- Future service implementations (provides reference patterns)

**References:**

- Original discovery: CodeRabbit Finding #7 (API Layer P2 review)
- Planning phase: Backend Modernization preparation (2025-10-22)

---

**Next Steps:** Generate task breakdown using `workflows/2-generate-tasks.md`
