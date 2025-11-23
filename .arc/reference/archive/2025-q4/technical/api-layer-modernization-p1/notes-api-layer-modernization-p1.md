This notes document currently covers **Phase 1 (Proof of Concept)** of the API Layer Modernization, focusing primarily on the `movie` app and any foundational/shared logic in the `core` app. The migration of other apps will be handled in a subsequent phase after this PoC is successfully completed.

---

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

## Notes: Frontend Modernization Requirements for Future Backend Cleanup

**Context**: During the Django Ninja migration, some backward compatibility extensions were added to frontend types to maintain existing functionality. When the remaining apps are migrated and the backend API is fully modernized, the frontend will need updates to remove these compatibility layers.

### Type System Modernization Required

**Current Compatibility Extensions** (Task 5.4):

- `Movie` interface extends `MovieDetailSchema` with additional TMDB fields
- `MovieBase` interface extends `MovieBaseSchema` with frontend-specific fields
- Additional fields added: `backdrop_path`, `vote_count`, `popularity`, `original_language`, `original_title`, `adult`, `video`

**Future Cleanup Tasks**:

1. **Remove Extended Movie Types**: Use pure `MovieDetailSchema` and `MovieBaseSchema` from backend
2. **Backend Schema Enhancement**: Add missing TMDB fields to backend schemas if needed for frontend functionality
3. **Null Safety Enforcement**: Update frontend components to handle proper null/undefined types
4. **Remove Type Compatibility Layers**: Eliminate frontend-specific extensions in favor of backend contracts

### Frontend Component Updates Required

**Identified Type Safety Issues** (from Task 5.4):

- `MovieCard.tsx:90` - `release_date` now `string | null | undefined`, needs null check before `new Date()`
- `MovieCard.tsx:242` - `vote_average` now `number | null | undefined`, needs default handling
- `tests/mocks/movieData.ts` - Mock data needs to match new optional field contracts

**Systematic Frontend Modernization Checklist**:

1. **Component Null Safety**: Add null checks for all optional fields across movie components
2. **Mock Data Updates**: Update all test mocks to match strict OpenAPI contracts
3. **Service Layer**: Remove any frontend-side data transformation that duplicates backend logic
4. **Type Import Cleanup**: Remove manual type definitions in favor of auto-generated types
5. **Validation Logic**: Ensure frontend validation aligns with backend Pydantic schemas

### Backend API Modernization Dependencies

**For Full Compatibility Removal**:

1. **Complete API Migration**: All apps (authentication, user_movie_data, accounts) migrated to Django Ninja
2. **Unified Schema Standards**: Consistent field naming and optional field handling across all endpoints
3. **TMDB Integration Review**: Determine which TMDB fields should be part of backend contracts vs frontend-only
4. **Error Handling Standardization**: Uniform error response formats across all Django Ninja endpoints

### Migration Strategy Recommendations

**Phase 1** (Current): Maintain backward compatibility extensions while proving Django Ninja integration
**Phase 2** (Future): After remaining app migrations are complete:

1. Audit all frontend type extensions against actual usage
2. Propose backend schema additions for legitimately needed TMDB fields
3. Remove unnecessary type extensions and update components accordingly
4. Validate that frontend fully leverages auto-generated types without manual overrides

**Benefits of Future Cleanup**:

- True single source of truth for API contracts
- Elimination of frontend-backend type drift
- Simplified type maintenance (auto-generated only)
- Better error detection when API contracts change

### Technical Debt Tracking

**Current Acceptable Technical Debt** (temporary for PoC):

- Extended movie types with frontend-specific fields
- Type compatibility layers in `@types/movie.d.ts`
- Manual null handling in components not yet modernized

**Future Elimination Targets**:

- All `extends MovieDetailSchema` type extensions
- Manual type definitions that duplicate backend schemas
- Component code that assumes non-nullable fields
- Test mocks that don't match strict backend contracts

This documentation ensures that the temporary compatibility measures taken during the Django Ninja proof-of-concept can be systematically removed during the full API modernization phase.

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
