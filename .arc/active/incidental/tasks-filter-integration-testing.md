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

### 1.1 Map Complete Filter Data Flow

- [ ] 1.1.1 Document frontend filter UI → API parameter mapping
    - Map AdvancedMovieFilters state to movieFilterMapper output
    - Map minimal vs expanded filter styles to different parameter sets
    - Document all filter types: year, rating, runtime, genre, sort, decade
    - Identify which filters go to TMDB API vs backend filtering
    - **Deliverable**: Data flow diagram (can be markdown table)

- [ ] 1.1.2 Document API schema → service parameter mapping
    - Trace MovieDiscoverFilterSchema fields through `to_service_params()`
    - Identify which schema fields map to TMDB API params
    - Identify which schema fields should map to backend filtering params
    - Document the gap: what fields exist but aren't mapped
    - **Deliverable**: Parameter mapping table (schema field → service param)

- [ ] 1.1.3 Document service-level filtering mechanisms
    - Map `year_min`/`year_max`/`rating_min`/`rating_max` parameter usage
    - Trace `_apply_filters()` and `_apply_buffer_if_needed()` logic
    - Identify which endpoints use filtering: discover, search, now_playing, upcoming
    - Document current state: which parameters are populated vs always None
    - **Deliverable**: Service filtering flow documentation

### 1.2 Audit Current Test Coverage

- [ ] 1.2.1 Analyze backend service unit test coverage
    - Review `test_result_filtering.py` (what it tests, what it misses)
    - Review `test_movie_service.py` (filter-related tests)
    - Identify: Do tests call service methods with year_min/rating_min directly?
    - Identify: Do any tests validate the API→service integration?
    - **Deliverable**: Service test coverage report

- [ ] 1.2.2 Analyze backend API integration test coverage
    - Review `test_movie_api.py` discover/search endpoint tests
    - Check: Do tests validate actual filter results or just response structure?
    - Check: Do tests send filter parameters and assert filtered data?
    - Check: Do tests validate year_min/rating_min are populated from schema?
    - **Deliverable**: API test coverage report

- [ ] 1.2.3 Analyze frontend test coverage
    - Review filter component tests
    - Check: Do tests validate parameters sent to API?
    - Check: Do tests validate movieFilterMapper output format?
    - Check: Do tests mock API responses with filtered data?
    - **Deliverable**: Frontend test coverage report

- [ ] 1.2.4 Identify integration test gaps
    - Document missing tests for frontend → backend parameter flow
    - Document missing tests for TMDB bad data filtering
    - Document missing tests for schema mapping logic
    - Prioritize gaps by risk (critical path vs edge cases)
    - **Deliverable**: Prioritized list of missing tests

### 1.3 Validate Current Filter Behavior

- [ ] 1.3.1 Manual testing: Rating filters (FIXED in working tree)
    - Test minimal style rating filter (minRating only)
    - Test expanded style rating filter (minRating + maxRating)
    - Verify parameters sent to backend (browser network tab)
    - **Expected**: Should work now after parameter rename fix
    - **Deliverable**: Rating filter validation report

- [ ] 1.3.2 Manual testing: Year filters (BROKEN - 1979 in 1980-1983)
    - Test minimal style year filter (decade, minYear)
    - Test expanded style year filter (minYear + maxYear range)
    - Check for data leakage (movies outside requested range)
    - Document specific examples of bad data
    - **Deliverable**: Year filter validation report with examples

- [ ] 1.3.3 Manual testing: Combined filters
    - Test year + rating combined
    - Test genre + year + rating combined
    - Test sort options with filters
    - Check for interaction bugs
    - **Deliverable**: Combined filter validation report

- [ ] 1.3.4 Analyze TMDB API response quality
    - Capture actual TMDB API responses for filtered queries
    - Identify bad data patterns (wrong years, missing ratings, etc.)
    - Quantify data quality issues (what % of results are incorrect?)
    - **Deliverable**: TMDB data quality analysis

### 1.4 Phase 1 Completion Report

- [ ] 1.4.1 Synthesize findings into comprehensive report
    - Complete filter data flow documentation
    - Complete test coverage gap analysis
    - Complete current behavior validation
    - Prioritized list of issues to fix in Phase 2
    - **Deliverable**: Phase 1 completion report

- [ ] 1.4.2 Review findings with user before proceeding to Phase 2
    - Present gap analysis and proposed fixes
    - Confirm approach for Phase 2 implementation
    - Adjust scope if needed based on findings
    - Get approval to proceed

---

## Phase 2: Fix Gaps & Complete Migration

**Purpose**: Systematically fix all identified gaps, complete the filter migration, and establish comprehensive test coverage.

**Note**: Specific subtasks will be refined based on Phase 1 findings. Below is the expected scope.

### 2.1 Fix Frontend Parameter Mapping

- [ ] 2.1.1 COMPLETED: Fix rating parameter names
    - Changed `min_rating` → `vote_average_gte` ✅
    - Changed `max_rating` → `vote_average_lte` ✅
    - Changed `max_runtime` → `with_runtime_lte` ✅
    - Frontend tests passing (333/333) ✅

- [ ] 2.1.2 Add frontend integration tests for parameter mapping
    - Test movieFilterMapper outputs correct parameter names
    - Test all filter styles (minimal vs expanded)
    - Test edge cases (only min, only max, both)
    - Ensure future renames caught by tests

### 2.2 Complete Backend Schema → Service Wiring

- [ ] 2.2.1 Update MovieDiscoverFilterSchema.to_service_params()
    - Extract year range from `release_date_gte`/`lte` → `year_min`/`year_max`
    - Extract rating range from `vote_average_gte`/`lte` → `rating_min`/`rating_max`
    - Maintain TMDB API parameters (they're primary filtering)
    - Backend filtering becomes second-pass data hygiene

- [ ] 2.2.2 Update API endpoint to pass filtering parameters
    - Modify `discover_movies` API handler to extract year/rating ranges
    - Pass `year_min`/`year_max`/`rating_min`/`rating_max` to service
    - Update for other affected endpoints (search, now_playing, upcoming)
    - Remove misleading type ignore comment

- [ ] 2.2.3 Add comprehensive API integration tests
    - Test discover endpoint filters out TMDB bad data
    - Test year filtering: request 1980-1983, verify no 1979 results
    - Test rating filtering: request 7.0+, verify no 6.9 results
    - Test combined filters work correctly
    - Test buffer mechanism still works with filtering

### 2.3 Fix Documentation & Docstrings

- [ ] 2.3.1 Update service method docstrings
    - Clarify "client-side filtering is second pass for data hygiene"
    - Remove ambiguous "filters applied client-side" language
    - Document TMDB API filters vs backend hygiene filters
    - Update examples to show both filter types

- [ ] 2.3.2 Update schema docstrings
    - Document which parameters go to TMDB API
    - Document which parameters trigger backend filtering
    - Clarify frontend convenience aliases (decade, genres)

- [ ] 2.3.3 Update filter mapper docstrings
    - Document parameter name mappings
    - Update examples with correct parameter names
    - Clarify minimal vs expanded filter behavior

### 2.4 Establish Comprehensive Test Coverage

- [ ] 2.4.1 Add missing service unit tests
    - Test `to_service_params()` extracts year/rating ranges correctly
    - Test edge cases: only min, only max, both, neither
    - Test decade conversion logic
    - Test parameter name mapping (genres alias, etc.)

- [ ] 2.4.2 Add missing API integration tests
    - Test full request→response flow with filters
    - Test actual data filtering (not just response structure)
    - Test parameter passing from schema to service
    - Test error cases (invalid year ranges, etc.)

- [ ] 2.4.3 Add missing frontend integration tests
    - Test parameter format sent to API
    - Test filter state → API params mapping
    - Test edge cases in movieFilterMapper

- [ ] 2.4.4 Document testing patterns for future features
    - Create testing checklist for cross-layer features
    - Document integration test approach
    - Update testing strategy docs if needed

### 2.5 Quality Gates & Validation

- [ ] 2.5.1 Run full backend test suite
    - Target: 100% pass rate
    - Verify new tests passing
    - Verify no regressions

- [ ] 2.5.2 Run full frontend test suite
    - Target: 100% pass rate
    - Verify new tests passing
    - Verify no regressions

- [ ] 2.5.3 Run all linting checks
    - Backend: Ruff (0 violations)
    - Frontend: ESLint (0 violations)
    - Markdown: markdownlint (0 violations)

- [ ] 2.5.4 Run type checking
    - Backend: Pyright (0 errors in production code)
    - Frontend: TypeScript (0 errors)

- [ ] 2.5.5 Manual validation of filter functionality
    - Test year filters: no bad data leaks (1979 issue resolved)
    - Test rating filters: work correctly
    - Test runtime filters: work correctly
    - Test combined filters: work correctly
    - Test all filter styles (minimal + expanded)

### 2.6 Documentation Updates

- [ ] 2.6.1 Update TECHNICAL-ARCHITECTURE.md if needed
    - Document filter architecture if not already covered
    - Document testing approach for cross-layer features

- [ ] 2.6.2 Update testing strategy docs
    - Document integration test patterns established
    - Add filter testing as example of cross-layer validation

- [ ] 2.6.3 Update this task list with Phase 1 findings
    - Refine Phase 2 subtasks based on actual gaps discovered
    - Document any surprises or additional issues found

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

**Version**: 1.0 (Initial creation - will be updated after Phase 1 discovery)
