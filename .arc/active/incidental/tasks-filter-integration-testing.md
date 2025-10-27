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

- [x] 2.4.5 Manual validation & TMDB API investigation (COMPLETE)
    - **Result**: Our implementation is CORRECT - TMDB has confirmed bugs ✅
    - **Comprehensive External Research Completed**: See `research-tmdb-api-date-filtering.md` for full analysis
    - **Key Findings**:
        1. **Our Code is Correct** ✅
           - Parameters properly formatted per TMDB documentation
           - `primary_release_date.gte/lte` is the correct choice
           - Removing `region` was right (confirmed incompatible)
           - Two-pass filtering architecture is industry best practice
        2. **TMDB Has Confirmed API Bug** ❌
           - Official status: In TMDB backlog since September 23, 2024 (no ETA)
           - Bug: Discover endpoint returns movies outside requested date ranges
           - Scope: 2-3 out-of-range movies per page average (community reports)
        3. **TMDB Has Data Quality Issues** ⚠️
           - Primary release dates contain errors (re-releases, placeholders, data entry)
           - Placeholder convention: YYYY-01-01 for historical films when exact date unknown
           - Different endpoints return different dates for same movie (expected behavior)
        4. **Our Backend Filtering is Essential** ✅
           - Successfully catches TMDB's out-of-range results
           - Logging shows it's working as designed (NOT a bug, it's a feature!)
           - Two-pass architecture compensates for TMDB unreliability
    - **Nefeli Date Discrepancy Explained - CORRECTED**:
        - **BOTH endpoints return `1980-01-01`** (TMDB placeholder, not different dates)
        - **Frontend timezone bug**: `new Date("1980-01-01")` converts UTC → local timezone
        - In US Eastern timezone: 1980-01-01 00:00 UTC → 1979-12-31 19:00 EST
        - UI shows "December 31, 1979" due to JS date parsing, not TMDB returning different data
        - Backend correctly sees `1980-01-01` and includes in 1980-1983 range ✅
        - **Root cause**: Frontend display bug, not TMDB data inconsistency
    - **Evidence & Citations**:
        - 10+ TMDB forum threads (including staff confirmations)
        - Official TMDB documentation
        - Community GitHub issues
        - All sources documented in research file
    - **Conclusion**: NO CODE CHANGES REQUIRED
        - Our implementation is correct per TMDB documentation
        - Issues are on TMDB's side (confirmed bug + data quality)
        - Backend filtering is working exactly as designed
        - When logs show "Backend filtering removed N movies", this is our safety net catching TMDB's mistakes ✅
    - **Recommendations**: See research doc for optional enhancements (monitoring, documentation)

---

## Phase 3: Backend Data Quality Enhancements

**Purpose**: Strengthen backend filtering to catch more TMDB data quality issues identified in research.

**Approach**: Conservative enhancements with high ROI, low risk. No aggressive Phase 2 enhancements (too many false positives).

### 3.1 Implement Vote Count Quality Filter ✅

**Goal**: Exclude movies with unreliable ratings (low vote counts) when user filters by rating.

- [x] 3.1.1 Write unit tests for vote count filtering (TEST-FIRST)
    - **Completed**: 4 comprehensive tests added to `test_result_filtering.py`
    - Tests: Low vote exclusion, no filter bypass, missing vote_count handling, threshold respect
    - All tests follow existing patterns using `create_movie_dict()` helper
    - Used DRY principles with existing fixtures and helpers

- [x] 3.1.2 Update `filter_movies_by_rating()` in `result_filtering.py`
    - **Completed**: Added `min_vote_count` parameter (default: 50)
    - Vote count check only applies when rating filters active (rating_min/rating_max specified)
    - Movies with `vote_count < min_vote_count` or `None` excluded
    - Comprehensive docstring with quality rationale and examples

- [x] 3.1.3 Add configuration to `settings.py`
    - **Completed**: `TMDB_MIN_VOTE_COUNT_THRESHOLD` environment variable
    - Default: 50 votes (statistically significant threshold)
    - Configurable via environment for different deployments

- [x] 3.1.4 Update `_apply_filters()` to use vote count check
    - **Completed**: Passes `settings.TMDB_MIN_VOTE_COUNT_THRESHOLD` to filter function
    - Import added: `from django.conf import settings`
    - Integrated seamlessly with existing filter chain

- [x] 3.1.5 Verify tests pass
    - **Completed**: All 21 tests pass (4 new + 17 existing)
    - Linting passes (ruff clean)
    - Type checking passes (pyright 0 errors on modified files)
    - Fixed compatibility: Updated `create_movie_dict()` helper to include `vote_count=100` default
    - Additional changes needed:
        - Added `vote_count` field to `MovieBaseSchema`
        - Added `vote_count` field to `TMDBMovieBase` TypedDict (test fixtures)
        - Updated `create_movie_base_from_tmdb()` to include vote_count in mapping

**Actual Impact**:

- Rating filters now exclude unreliable low-vote movies (e.g., 2 votes @ 10/10)
- Only applies when user explicitly filters by rating (browsing unaffected)
- Configurable threshold allows tuning for different environments
- Comprehensive test coverage ensures behavior correctness

### 3.2 Implement Completeness Filter ✅

**Goal**: Always exclude movies without critical display fields (poster, title).

- [x] 3.2.1 Write unit tests for completeness filtering (TEST-FIRST)
    - **Completed**: Added 4 comprehensive tests (lines 1061-1225 in test_result_filtering.py)
    - Test: `test_filter_movies_excludes_missing_poster()` - excludes movies without poster_path
    - Test: `test_filter_movies_excludes_empty_title()` - excludes movies with empty/whitespace titles
    - Test: `test_filter_movies_completeness_with_all_valid()` - doesn't exclude valid movies
    - Test: `test_completeness_filter_applies_with_other_filters()` - works with combined filters
    - **Test-first approach**: Tests written first, failed initially, then passed after implementation
    - Enhanced `create_movie_dict()` helper with optional `poster_path` parameter for testing

- [x] 3.2.2 Create `filter_movies_by_completeness()` in `result_filtering.py`
    - **Completed**: Lines 188-234 in result_filtering.py
    - Excludes movies with missing/empty `poster_path` (prevents broken images)
    - Excludes movies with empty/whitespace-only `title` (prevents blank cards)
    - Comprehensive docstring with quality rationale and examples
    - Always applied (not configurable - basic UI quality requirement)

- [x] 3.2.3 Update `_apply_filters()` to apply completeness filter
    - **Completed**: Integrated at line 370 in movie_service.py
    - Applied FIRST in filter chain (before year/rating filters)
    - Always enabled for all endpoints (discover, search, now_playing, upcoming)
    - Logging inherited from existing filter warning system
    - Removed early-return optimization to ensure completeness filter always runs

- [x] 3.2.4 Verify tests pass
    - **Completed**: All 25 result_filtering tests pass (21 existing + 4 new)
    - Quality gates clean: ruff (0 violations), pyright (0 errors)
    - Fixed test data consistency: Added vote_count to all TMDB test payloads

**Actual Impact**:

- UI grid quality improved: No broken poster images or empty title cards
- Always-on filtering ensures consistent quality across all movie endpoints
- Test coverage comprehensive: Validates poster, title, and combined filter scenarios
- DRY test helpers: Enhanced existing `create_movie_dict()` for reusability

**Phase 3.2 Cleanup (Leave It Cleaner)** ✅

- [x] Fix 4 tests with removed 'region' parameter references
    - **Completed**: Removed 'region' assertions from test_movie_api.py, test_movie_service.py, test_schemas.py
    - **Root cause**: Phase 2 removed 'region' parameter (TMDB incompatible), tests not updated
    - **Files**: 3 test files, 4 locations total
    - **No comments left**: Removed parameter doesn't need explanation in code

- [x] Fix 5 ruff violations in tmdb_api_client.py
    - **Completed**: Fixed nested if (SIM102) + 4 line-length violations (E501)
    - **SIM102**: Combined nested if statements using `and` operator
    - **E501**: Split long lines, extracted variables for readability
    - **Files**: backend/apps/core/services/tmdb_api_client.py (lines 204, 218, 219, 232, 233)

- [x] Complete test helper refactor (consistency)
    - **Completed**: Converted 2 remaining movie tests to use helpers
    - **Tests converted**: test_paginated_endpoint_contract, test_discover_with_filters
    - **Pattern established**: All movie tests now use create_movie_dict() + create_paginated_tmdb_response()
    - **Keyword/people tests**: Left as-is (simple 2-3 field payloads, no reuse benefit)
    - **Rationale**: Consistency across movie tests, wait for keyword/people expansion before adding helpers

- [x] Fix 3 pyright type errors (type safety strategy compliance)
    - **Completed**: Added explicit type annotations to logging code
    - **Files**: backend/apps/core/services/tmdb_api_client.py
    - **Fix**: Added `list[dict[str, object]]` annotations to sample_results and all_results
    - **Result**: 0 errors (down from 3), consistent with strategy-type-safety.md

- [x] Fix 3 additional line-length violations discovered during cleanup
    - **Completed**: Fixed E501 violations in test_fixtures_tmdb.py, test_movie_api.py, logging.py
    - **Pattern**: Moved comments above lines, split long parameter documentation

**Cleanup Quality Gates** ✅

- Tests: 365/365 pass (1 pre-existing teardown error unrelated to changes)
- Linting: 0 violations (ruff clean across backend + config)
- Type checking: 0 errors, 46 informational (expected Django ORM limitations)
- Markdown: 0 errors (58 files checked)

### 3.3 Implement Historical Validation

**Goal**: Exclude obviously invalid dates (before 1888 - first film ever made).

- [ ] 3.3.1 Write unit tests for historical validation (TEST-FIRST)
    - Test: Movies before 1888 excluded
    - Test: Movies from 1888+ included
    - Test: Invalid dates logged as data quality issue
    - File: `backend/apps/movie/tests/test_result_filtering.py`

- [ ] 3.3.2 Add historical validation to `filter_movies_by_year()`
    - Constant: `FIRST_FILM_YEAR = 1888`
    - Exclude any movie with `release_year < 1888`
    - Log data quality issue when found

- [ ] 3.3.3 Verify tests pass
    - Run unit tests, confirm all passing
    - Verify implementation matches test expectations

**Expected Impact**: Catch obvious data errors (extremely rare, but zero risk)

### 3.4 Fix Frontend Date Timezone Bug

**Goal**: Fix MovieCard date display showing wrong date due to timezone conversion.

- [ ] 3.4.1 Write test for correct date display (TEST-FIRST)
    - Test: ISO date "1980-01-01" displays as "January 1, 1980" (not December 31, 1979)
    - Test: Verify no timezone shifting
    - File: `frontend/src/components/movie/__tests__/MovieCard.test.tsx`

- [ ] 3.4.2 Update `MovieCard.tsx` date formatting (lines 102-111)
    - Replace `new Date(movie.release_date)` with timezone-safe parsing
    - Parse ISO date as local date: `const [year, month, day] = date.split('-').map(Number)`
    - Construct date in local timezone: `new Date(year, month - 1, day)`

- [ ] 3.4.3 Verify test passes
    - Run frontend tests, confirm date display correct

- [ ] 3.4.4 Search for other date parsing instances
    - Check MovieDetailPage, any other components displaying release dates
    - Apply same fix anywhere using `new Date(iso_date_string)`
    - Ensure consistent date display across app

**Expected Impact**: UI shows correct dates matching backend data (no more timezone shifts)

### 3.5 Quality Gate & Testing

- [ ] 3.5.1 Run all backend tests
    - Verify new filtering logic doesn't break existing tests
    - All new unit tests passing (vote count, completeness, historical validation)
    - 100% pass rate required

- [ ] 3.5.2 Run frontend tests
    - Verify date fix doesn't break components
    - All tests passing

- [ ] 3.5.3 Run linting checks
    - Backend: `ruff check` passes
    - Frontend: `npm run lint` passes
    - Markdown: `markdownlint` passes

- [ ] 3.5.4 Run type checking
    - Backend: `pyright` zero errors
    - Frontend: `npm run type-check` passes

### 3.6 Manual Validation - Final Data Quality Assessment

**Goal**: Assess end-result data quality after all enhancements to determine if additional work needed.

- [ ] 3.6.1 Test discover page with year filters
    - Apply filter: 1980-1983
    - Verify: No pre-1980 or post-1983 movies appear
    - Check: Date display matches backend data (timezone bug fixed)
    - Sample 20-30 movies, assess accuracy rate

- [ ] 3.6.2 Test rating filters with vote count threshold
    - Apply filter: 7.5+ rating
    - Verify: No low-vote-count movies with unreliable ratings
    - Check: All displayed ratings based on 50+ votes
    - Note any remaining quality issues

- [ ] 3.6.3 Assess completeness filter effectiveness
    - Browse discover/search results
    - Verify: No broken poster images
    - Verify: No empty titles
    - Visual inspection of grid quality

- [ ] 3.6.4 Assess overall data quality improvement
    - **Target**: 90%+ accuracy acceptable
    - Sample 50-100 movies across different filters
    - Document: % of movies with accurate data
    - Decide: Is quality acceptable, or more filtering needed?
    - **If <90% accurate**: Identify patterns in bad data for potential additional filters
    - **If ≥90% accurate**: Conclude Phase 3, data quality acceptable ✅

**Note on Future Work**:
Redis/Celery infrastructure (planned in `notes-backend-modernization.md`) could enable multi-call
optimizations like fetching `/release_dates` for detail pages without performance penalty.
Defer this work until async infrastructure available.

**Expected Impact**: Comprehensive data quality assessment, informed decision on further work

---

## Phase 4: Cleanup & Documentation

**Purpose**: Complete optional enhancements and integrate learnings into permanent documentation.

### 4.1 Optional: Non-Visual Filtering Enhancement

**Question from Phase 1.1.3**: Should non-visual filtering apply to discover/browse?

- [ ] 4.1.1 Decide: Apply non-visual filter to discover endpoint?
    - Currently: Only applied to search
    - Consideration: Soundtracks rarely appear in discover results (genre-filtered)
    - Decision: [User input needed]
    - If yes: Add `pre_filter_func` parameter to discover buffer calls

### 4.2 Documentation Integration

- [ ] 4.2.1 Integrate notes into TECHNICAL-ARCHITECTURE.md
    - Add "Filter Architecture" section based on notes Phase 1.1.3
    - Include: Two-pass filtering design, parameter flow diagram
    - Document: TMDB API quirks, backend data hygiene role
    - Reference research document for TMDB bug details

- [ ] 4.2.2 Update testing strategy documentation
    - Document: Integration test pattern for cross-layer features
    - Include: Filter testing as example case study
    - Lesson learned: "Unit tests alone missed integration bug"

- [ ] 4.2.3 Document data quality enhancements
    - Update service layer docs with new filtering logic
    - Document vote count threshold, completeness requirements
    - Note frontend timezone fix and safe date parsing pattern

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
