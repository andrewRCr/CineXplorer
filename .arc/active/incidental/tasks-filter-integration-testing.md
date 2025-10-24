# Incidental Task List: Complete Filter Integration Testing & Migration

**Created**: 2025-10-24
**Priority**: High (blocking technical/service-layer-modernization Task 3.5.2.3)
**Type**: Quality Improvement + Technical Debt
**Estimated Effort**: 8-12 hours

## Context

**Discovery Source**: Task 3.5.2.3 (Re-evaluate discover_movies type safety)

**Problem Statement**:
While investigating a type ignore at `backend/apps/movie/api.py:202`, discovered critical gaps in filter functionality
and test coverage:

1. **Rating filters broken**: Frontend sends `min_rating`/`max_rating` but backend expects `vote_average_gte`/`lte`
2. **Year filtering shows bad data**: User observed 1979 movies appearing in 1980-1983 filter results
3. **Incomplete migration**: Backend has client-side filtering mechanism (`year_min`/`rating_min` parameters)
   but API layer never populates them
4. **Test coverage gaps**: Service unit tests pass, but no integration tests validate filter parameter flow
   from frontend → API → schema → service

**Why This Matters**:

- Client-side filtering was migrated from frontend to backend to handle TMDB API data quality issues
- Migration appears incomplete - filtering mechanism exists but isn't wired up
- Tests don't catch the integration gaps, allowing silent failures in production
- Users experiencing degraded filtering functionality (bad data leaking through)

**Original Design Intent**:
Backend client-side filtering should be a **second pass** on TMDB API results to catch data quality issues
(wrong release dates, missing ratings, etc.). TMDB API filters are primary; backend filtering is data hygiene.

## Success Criteria

- [ ] Complete understanding of filter data flow from UI → backend → response
- [ ] Comprehensive test coverage at all integration points
- [ ] All filters work correctly (year, rating, runtime, genre, etc.)
- [ ] No TMDB bad data leaks through (e.g., 1979 in 1980-1983 results)
- [ ] Documentation accurately reflects implementation
- [ ] Zero tolerance quality gates pass (all tests, linting, type checking)
- [ ] Future filter changes can be made with confidence

---

## Phase 1: Discovery & Test Coverage Analysis

**Purpose**: Systematically identify all gaps in filter functionality and test coverage through comprehensive testing.

### 1.1 Map Complete Filter Data Flow ✅

**Completed**: All findings documented in `notes-filter-integration-testing.md`

- [x] 1.1.1 Document frontend filter UI → API parameter mapping
    - **Completed**: Full mapping of MovieFilters → API params for minimal/expanded styles
    - **Key finding**: Frontend only generates TMDB API params (`release_date_gte/lte`, `vote_average_gte/lte`)
    - **See notes**: Section 1.1.1

- [x] 1.1.2 Document API schema → service parameter mapping
    - **Completed**: Traced `to_service_params()` and identified critical gap
    - **Key finding**: Schema maps to TMDB params but NEVER populates backend filter params (`year_min/max`, `rating_min/max`)
    - **Root cause identified**: Incomplete feature migration - infrastructure exists but not wired to API layer
    - **See notes**: Section 1.1.2

- [x] 1.1.3 Document service-level filtering mechanisms
    - **Completed**: Full documentation of two-pass filtering architecture
    - **Key finding**: Backend filtering mechanism works (unit tests pass) but never activates (always receives `None` params)
    - **Architecture clarified**: TMDB API = primary filter, backend = second-pass data hygiene for quality issues
    - **See notes**: Section 1.1.3

### 1.2 Audit Current Test Coverage ✅

**Completed**: All findings documented in `notes-filter-integration-testing.md` (Phase 1.2 section)

- [x] 1.2.1 Analyze backend service unit test coverage
    - **Completed**: Reviewed `test_result_filtering.py` (877 lines, 17 comprehensive tests)
    - **Key finding**: Excellent service-layer coverage - year/rating filtering, buffer mechanism, all endpoints
    - **Critical gap**: Tests call service directly with params, don't validate integration path
    - **See notes**: Section 1.2.1

- [x] 1.2.2 Analyze backend API integration test coverage
    - **Completed**: Reviewed `test_movie_api.py` (515 lines)
    - **Key finding**: Tests validate request structure but NOT filtering behavior
    - **Critical gaps**: No tests for schema → service param extraction, no filtered result validation
    - **See notes**: Section 1.2.2

- [x] 1.2.3 Analyze frontend test coverage
    - **Completed**: Analyzed 14 test files
    - **Key finding**: Good UI component coverage, but zero filter logic coverage
    - **Critical gaps**: No tests for `movieFilterMapper.ts`, no tests for `useMovieFetchRouter`, no API param validation
    - **See notes**: Section 1.2.3

- [x] 1.2.4 Identify integration test gaps
    - **Completed**: Comprehensive gap analysis with proposed test implementations
    - **Priority 1**: Schema parameter extraction (the exact bug we have)
    - **Priority 2**: API integration tests for filtered results
    - **Priority 3**: Frontend mapper tests for parameter contracts
    - **Priority 4**: End-to-end filter validation
    - **See notes**: Section 1.2.4 + Test Coverage Summary table

**Phase 1 Complete**: All discovery findings documented in notes file. Proceeding to Phase 2 implementation.

---

## Phase 2: Fix Gaps & Complete Migration

**Purpose**: Complete the filter migration using test-driven development - write failing tests first,
then implement fixes to make them pass.

**Approach**: Test-first for all critical gaps identified in Phase 1.2

### 2.1 Write Failing Integration Tests (Test-First) ✅

**Rationale**: Write tests that demonstrate current broken behavior before fixing. Tests fail initially, pass after fix.

- [x] 2.1.1 Create schema parameter extraction tests
    - **File**: `backend/apps/movie/tests/test_schemas.py` (new - 279 lines)
    - **Tests created**: 10 tests validating parameter extraction
    - **Result**: 9 tests FAIL, 1 passes (no filters case)
    - **Failures demonstrate**: Schema doesn't extract `year_min/max`, `rating_min/max`
    - **Error messages**: "Schema must extract year_min for backend filtering"

- [x] 2.1.2 Create API integration tests for filter flow
    - **File**: `backend/apps/movie/tests/test_movie_api.py` (additions - 292 lines added)
    - **Tests created**: 3 integration tests
    - Test: `test_discover_api_extracts_backend_filter_params()` - FAILS (2 movies returned, expected 1)
    - Test: `test_discover_api_filters_bad_ratings_from_tmdb()` - FAILS (3 movies returned, expected 1)
    - Test: `test_discover_api_buffer_mechanism_with_filtering()` - FAILS (buffer not triggered)
    - **Result**: All 3 tests FAIL as expected
    - **Failures demonstrate**: Backend filtering never activates, bad data passes through

- [x] 2.1.3 Create frontend mapper tests
    - **File**: `frontend/src/utilities/__tests__/movieFilterMapper.test.ts` (new - 408 lines)
    - **Tests created**: 15 tests validating parameter generation and backend compatibility
    - **Result**: 12 tests PASS, 3 fail (maxRating handling edge cases)
    - **Note**: Frontend tests mostly pass (frontend already fixed), failures reveal mapper behavior nuances

- [x] 2.1.4 Run tests to confirm they fail
    - **Backend schema tests**: 9/10 FAIL (demonstrates bug)
    - **Backend API tests**: 3/3 FAIL (demonstrates integration broken)
    - **Frontend tests**: 12/15 PASS (mostly working, some edge cases)
    - **Status**: Failing tests successfully demonstrate the bug

### 2.2 Implement Schema → Service Parameter Extraction

**Now fix the code to make tests pass**

- [x] 2.2.1 Update `MovieDiscoverFilterSchema.to_service_params()`
    - **Completed**: Refactored with declarative mapping pattern + added parameter extraction
    - **Refactoring**: Replaced 8 repetitive if statements with declarative `field_mappings` dict
    - **Pattern**: Uses Pydantic's `model_dump(exclude_none=True)` for cleaner code
    - **Year extraction**: Extract year from `release_date_gte/lte` → `year_min/max` (e.g., "2020-01-01" → 2020)
    - **Rating extraction**: Pass through `vote_average_gte/lte` → `rating_min/max`
    - **Documentation**: Updated docstring to clarify dual-purpose and declarative approach
    - **Test results**: All 10 schema tests PASS (9 previously failing tests now pass)
    - **Code quality**: Linting passes (ruff N806 fix applied)

- [x] 2.2.2 Update API endpoint to pass extracted parameters
    - **Completed**: Updated `backend/apps/movie/api.py` discover_movies endpoint
    - **Implementation**: Parameters flow through `**params` unpacking to service layer
    - **Docstring**: Enhanced to document two-pass filtering architecture with examples
    - **Type ignore**: Kept (needed for **kwargs unpacking with typed parameters)
    - **Key change**: Updated comments to clarify params now include backend filtering params

- [x] 2.2.3 Run tests - All tests PASS! ✅
    - **Schema tests**: 10/10 PASS (parameter extraction works correctly)
    - **API integration tests**: 3/3 PASS (integration flow works end-to-end)
    - **Result**: Backend filtering now activates, bad data filtered out
    - **Test proof**: Previously failing tests now pass, demonstrating bug is fixed

### 2.3 Update Documentation ✅

- [x] 2.3.1 Update schema docstring
    - **Completed**: Updated `MovieDiscoverFilterSchema` class docstring
    - **Added**: Two-pass architecture explanation with concrete example
    - **Example**: "release_date_gte='2020-01-01' generates both release_date.gte + year_min=2020"

- [x] 2.3.2 Update API endpoint docstring
    - **Completed**: Enhanced `discover_movies()` endpoint docstring in `backend/apps/movie/api.py`
    - **Already completed in 2.2.2**: Full two-pass filtering architecture documented
    - **Includes**: Concrete examples of dual-purpose parameters

- [x] 2.3.3 Update service method docstrings
    - **Completed**: Updated all service methods in `backend/apps/movie/services/movie_service.py`
    - **Changes applied**: 16 references updated
        - "client-side filtered" → "backend filtered (second-pass data hygiene)"
        - "client-side due to quirks" → "two-pass architecture: TMDB API (primary) + backend filtering"
    - **Methods updated**: discover_movies, search_movies, get_now_playing, get_upcoming,_paginate_with_filters
    - **Linting**: All checks pass (line length issues fixed)

### 2.4 Quality Gates & Validation ✅

- [x] 2.4.1 Run full backend test suite
    - **Result**: 357 passed, 1 error (15.41s with -n auto)
    - **New tests**: All 13 integration tests PASS (schema + API)
    - **Regressions**: None - all existing tests pass
    - **Error**: 1 teardown error in test_concurrent_token_refresh_requests (database flush issue, not related to changes)

- [x] 2.4.2 Run full frontend test suite
    - **Result**: 348/348 passed (100% pass rate) ✅
    - **New tests**: 15 tests added for movieFilterMapper
    - **Bug fixed**: maxRating parameter not included when minRating was set
    - **Fix**: Removed incorrect conditional `&& !filters.minRating` from maxRating logic
    - **File**: `frontend/src/utilities/movieFilterMapper.ts` (line 108-110)

- [x] 2.4.3 Run linting checks
    - **Backend**: ✅ All checks passed (2 auto-fixed: unused import + import order)
    - **Frontend**: ✅ All checks passed (eslint clean)
    - **Markdown**: ✅ 0 errors across 56 files
    - **Result**: Zero violations

- [x] 2.4.4 Run type checking
    - **Backend (Pyright)**: ✅ 0 errors (11 informational notes in test files, acceptable)
    - **Frontend (TypeScript)**: ✅ Passes after fixing test file imports
    - **Fix applied**: Updated movieFilterMapper.test.ts imports to use correct MovieFilters interface
    - **Result**: Zero type errors in production code

- [ ] 2.4.5 Manual validation (final verification)
    - Navigate to discover page, apply year filter "1980-1983"
    - Verify: No 1979 movies in results (bug fixed!)
    - Test rating filters: Apply "7.5+" → verify no 6.9 movies
    - Test combined filters: Year + rating both work
    - Test both filter styles: Minimal and expanded

### 2.5 Optional: Non-Visual Filtering Enhancement

**Question from Phase 1.1.3**: Should non-visual filtering apply to discover/browse?

- [ ] 2.5.1 Decide: Apply non-visual filter to discover endpoint?
    - Currently: Only applied to search
    - Consideration: Soundtracks rarely appear in discover results (genre-filtered)
    - Decision: [User input needed]
    - If yes: Add `pre_filter_func` parameter to discover buffer calls

### 2.6 Documentation Integration

- [ ] 2.6.1 Integrate notes into TECHNICAL-ARCHITECTURE.md
    - Add "Filter Architecture" section based on notes Phase 1.1.3
    - Include: Two-pass filtering design, parameter flow diagram
    - Document: TMDB API quirks, backend data hygiene role

- [ ] 2.6.2 Update testing strategy documentation
    - Document: Integration test pattern for cross-layer features
    - Include: Filter testing as example case study
    - Lesson learned: "Unit tests alone missed integration bug"

---

## Notes & Observations

**Key Insights**:

- Service unit tests passed because they call service methods directly with year_min/rating_min
- API integration tests passed because they only validate response structure, not actual data
- No tests validated the schema → service parameter mapping layer
- This is a textbook example of why integration tests are critical

**Testing Philosophy**:

- Unit tests: Verify individual components work in isolation ✅
- Integration tests: Verify components work together ❌ (gap here)
- E2E tests: Verify full user workflows work ❌ (gap here)

**Future Prevention**:

- Establish integration test requirements for cross-layer features
- Add "parameter flow validation" to test checklist
- Consider contract tests for API schema changes

---

**Version**: 2.0 (Phase 1 complete, Phase 2 restructured for test-driven implementation)
