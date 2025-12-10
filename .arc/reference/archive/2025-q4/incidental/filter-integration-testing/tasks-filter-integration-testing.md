# Incidental Task List: Complete Filter Integration Testing & Migration

**Created**: 2025-10-24
**Completed**: 2025-12-10
**Branch:** `technical/service-layer-modernization`
**Status:** Complete
**Type**: Quality Improvement + Technical Debt

## Context

**Discovery Source**: Task 3.5.b.3 (Re-evaluate discover_movies type safety) - `tasks-service-layer-modernization.md`

**Interrupts:** `tasks-service-layer-modernization.md` at Task 3.5.b.3

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

---

### **Phase 1:** Discovery & Test Coverage Analysis

**Purpose**: Systematically identify all gaps in filter functionality and test coverage through comprehensive testing.

- [x] **1.1 Map Complete Filter Data Flow**

    - [x] 1.1.a Document frontend filter UI → API parameter mapping
        - **Completed**: Full mapping of MovieFilters → API params for minimal/expanded styles
        - **Key finding**: Frontend only generates TMDB API params (`release_date_gte/lte`, `vote_average_gte/lte`)

    - [x] 1.1.b Document API schema → service parameter mapping
        - **Completed**: Traced `to_service_params()` and identified critical gap
        - **Key finding**: Schema maps to TMDB params but NEVER populates backend filter params (`year_min/max`, `rating_min/max`)
        - **Root cause identified**: Incomplete feature migration - infrastructure exists but not wired to API layer

    - [x] 1.1.c Document service-level filtering mechanisms
        - **Completed**: Full documentation of two-pass filtering architecture
        - **Key finding**: Backend filtering mechanism works (unit tests pass) but never activates.
          It always receives `None` params.
        - **Architecture clarified**: TMDB API = primary filter, backend = second-pass data hygiene for quality issues

- [x] **1.2 Audit Current Test Coverage**

    - [x] 1.2.a Analyze backend service unit test coverage
        - **Completed**: Reviewed `test_result_filtering.py` (877 lines, 17 comprehensive tests)
        - **Key finding**: Excellent service-layer coverage - year/rating filtering, buffer mechanism, all endpoints
        - **Critical gap**: Tests call service directly with params, don't validate integration path

    - [x] 1.2.b Analyze backend API integration test coverage
        - **Completed**: Reviewed `test_movie_api.py` (515 lines)
        - **Key finding**: Tests validate request structure but NOT filtering behavior
        - **Critical gaps**: No tests for schema → service param extraction, no filtered result validation

    - [x] 1.2.c Analyze frontend test coverage
        - **Completed**: Analyzed 14 test files
        - **Key finding**: Good UI component coverage, but zero filter logic coverage
        - **Critical gaps**: No tests for `movieFilterMapper.ts`, no tests for `useMovieFetchRouter`, no API param validation

    - [x] 1.2.d Identify integration test gaps
        - **Completed**: Comprehensive gap analysis with proposed test implementations
        - **Priority 1**: Schema parameter extraction (the exact bug we have)
        - **Priority 2**: API integration tests for filtered results
        - **Priority 3**: Frontend mapper tests for parameter contracts
        - **Priority 4**: End-to-end filter validation

**Phase 1 Complete**: All discovery findings documented in notes file. Proceeding to Phase 2 implementation.

---

### **Phase 2:** Fix Gaps & Complete Migration

**Purpose**: Complete the filter migration using test-driven development - write failing tests first,
then implement fixes to make them pass.

**Approach**: Test-first for all critical gaps identified in Phase 1.2

- [x] **2.1 Write Failing Integration Tests (Test-First)**

    - [x] 2.1.a Create schema parameter extraction tests
        - **File**: `backend/apps/movie/tests/test_schemas.py` (new - 279 lines)
        - **Tests created**: 10 tests validating parameter extraction
        - **Result**: 9 tests FAIL, 1 passes (no filters case)
        - **Failures demonstrate**: Schema doesn't extract `year_min/max`, `rating_min/max`
        - **Error messages**: "Schema must extract year_min for backend filtering"

    - [x] 2.1.b Create API integration tests for filter flow
        - **File**: `backend/apps/movie/tests/test_movie_api.py` (additions - 292 lines added)
        - **Tests created**: 3 integration tests
        - Test: `test_discover_api_extracts_backend_filter_params()` - FAILS (2 movies returned, expected 1)
        - Test: `test_discover_api_filters_bad_ratings_from_tmdb()` - FAILS (3 movies returned, expected 1)
        - Test: `test_discover_api_buffer_mechanism_with_filtering()` - FAILS (buffer not triggered)
        - **Result**: All 3 tests FAIL as expected
        - **Failures demonstrate**: Backend filtering never activates, bad data passes through

    - [x] 2.1.c Create frontend mapper tests
        - **File**: `frontend/src/utilities/__tests__/movieFilterMapper.test.ts` (new - 408 lines)
        - **Tests created**: 15 tests validating parameter generation and backend compatibility
        - **Result**: 12 tests PASS, 3 fail (maxRating handling edge cases)
        - **Note**: Frontend tests mostly pass (frontend already fixed), failures reveal mapper behavior nuances

    - [x] 2.1.d Run tests to confirm they fail
        - **Backend schema tests**: 9/10 FAIL (demonstrates bug)
        - **Backend API tests**: 3/3 FAIL (demonstrates integration broken)
        - **Frontend tests**: 12/15 PASS (mostly working, some edge cases)
        - **Status**: Failing tests successfully demonstrate the bug

- [x] **2.2 Implement Schema → Service Parameter Extraction**

    - [x] 2.2.a Update `MovieDiscoverFilterSchema.to_service_params()`
        - **Completed**: Refactored with declarative mapping pattern + added parameter extraction
        - **Refactoring**: Replaced 8 repetitive if statements with declarative `field_mappings` dict
        - **Pattern**: Uses Pydantic's `model_dump(exclude_none=True)` for cleaner code
        - **Year extraction**: Extract year from `release_date_gte/lte` → `year_min/max` (e.g., "2020-01-01" → 2020)
        - **Rating extraction**: Pass through `vote_average_gte/lte` → `rating_min/max`
        - **Documentation**: Updated docstring to clarify dual-purpose and declarative approach
        - **Test results**: All 10 schema tests PASS (9 previously failing tests now pass)
        - **Code quality**: Linting passes (ruff N806 fix applied)

    - [x] 2.2.b Update API endpoint to pass extracted parameters
        - **Completed**: Updated `backend/apps/movie/api.py` discover_movies endpoint
        - **Implementation**: Parameters flow through `**params` unpacking to service layer
        - **Docstring**: Enhanced to document two-pass filtering architecture with examples
        - **Type ignore**: Kept (needed for **kwargs unpacking with typed parameters)
        - **Key change**: Updated comments to clarify params now include backend filtering params

    - [x] 2.2.c Run tests - All tests PASS! ✅
        - **Schema tests**: 10/10 PASS (parameter extraction works correctly)
        - **API integration tests**: 3/3 PASS (integration flow works end-to-end)
        - **Result**: Backend filtering now activates, bad data filtered out
        - **Test proof**: Previously failing tests now pass, demonstrating bug is fixed

- [x] **2.3 Update Documentation**

    - [x] 2.3.a Update schema docstring
        - **Completed**: Updated `MovieDiscoverFilterSchema` class docstring
        - **Added**: Two-pass architecture explanation with concrete example
        - **Example**: "release_date_gte='2020-01-01' generates both release_date.gte + year_min=2020"

    - [x] 2.3.b Update API endpoint docstring
        - **Completed**: Enhanced `discover_movies()` endpoint docstring in `backend/apps/movie/api.py`
        - **Already completed in 2.2.2**: Full two-pass filtering architecture documented
        - **Includes**: Concrete examples of dual-purpose parameters

    - [x] 2.3.c Update service method docstrings
        - **Completed**: Updated all service methods in `backend/apps/movie/services/movie_service.py`
        - **Changes applied**: 16 references updated
            - "client-side filtered" → "backend filtered (second-pass data hygiene)"
            - "client-side due to quirks" → "two-pass architecture: TMDB API (primary) + backend filtering"
        - **Methods updated**: discover_movies, search_movies, get_now_playing, get_upcoming,_paginate_with_filters
        - **Linting**: All checks pass (line length issues fixed)

- [x] **2.4 Quality Gates & Validation**

    - [x] 2.4.a Run full backend test suite
        - **Result**: 357 passed, 1 error (15.41s with -n auto)
        - **New tests**: All 13 integration tests PASS (schema + API)
        - **Regressions**: None - all existing tests pass
        - **Error**: 1 teardown error in test_concurrent_token_refresh_requests (database flush issue, not related to changes)

    - [x] 2.4.b Run full frontend test suite
        - **Result**: 348/348 passed (100% pass rate) ✅
        - **New tests**: 15 tests added for movieFilterMapper
        - **Bug fixed**: maxRating parameter not included when minRating was set
        - **Fix**: Removed incorrect conditional `&& !filters.minRating` from maxRating logic
        - **File**: `frontend/src/utilities/movieFilterMapper.ts` (line 108-110)

    - [x] 2.4.c Run linting checks
        - **Backend**: ✅ All checks passed (2 auto-fixed: unused import + import order)
        - **Frontend**: ✅ All checks passed (eslint clean)
        - **Markdown**: ✅ 0 errors across 56 files
        - **Result**: Zero violations

    - [x] 2.4.d Run type checking
        - **Backend (Pyright)**: ✅ 0 errors (11 informational notes in test files, acceptable)
        - **Frontend (TypeScript)**: ✅ Passes after fixing test file imports
        - **Fix applied**: Updated movieFilterMapper.test.ts imports to use correct MovieFilters interface
        - **Result**: Zero type errors in production code

    - [x] 2.4.e Manual validation & TMDB API investigation (COMPLETE)
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

### **Phase 3:** Backend Data Quality Enhancements

**Purpose**: Strengthen backend filtering to catch more TMDB data quality issues identified in research.

**Approach**: Conservative enhancements with high ROI, low risk. No aggressive Phase 2 enhancements (too many false positives).

- [x] **3.1 Implement Vote Count Quality Filter**

    **Goal**: Exclude movies with unreliable ratings (low vote counts) when user filters by rating.

    - [x] 3.1.a Write unit tests for vote count filtering (TEST-FIRST)
        - **Completed**: 4 comprehensive tests added to `test_result_filtering.py`
        - Tests: Low vote exclusion, no filter bypass, missing vote_count handling, threshold respect
        - All tests follow existing patterns using `create_movie_dict()` helper
        - Used DRY principles with existing fixtures and helpers

    - [x] 3.1.b Update `filter_movies_by_rating()` in `result_filtering.py`
        - **Completed**: Added `min_vote_count` parameter (default: 50)
        - Vote count check only applies when rating filters active (rating_min/rating_max specified)
        - Movies with `vote_count < min_vote_count` or `None` excluded
        - Comprehensive docstring with quality rationale and examples

    - [x] 3.1.c Add configuration to `settings.py`
        - **Completed**: `TMDB_MIN_VOTE_COUNT_THRESHOLD` environment variable
        - Default: 50 votes (statistically significant threshold)
        - Configurable via environment for different deployments

    - [x] 3.1.d Update `_apply_filters()` to use vote count check
        - **Completed**: Passes `settings.TMDB_MIN_VOTE_COUNT_THRESHOLD` to filter function
        - Import added: `from django.conf import settings`
        - Integrated seamlessly with existing filter chain

    - [x] 3.1.e Verify tests pass
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

- [x] **3.2 Implement Completeness Filter**

    **Goal**: Always exclude movies without critical display fields (poster, title).

    - [x] 3.2.a Write unit tests for completeness filtering (TEST-FIRST)
        - **Completed**: Added 4 comprehensive tests (lines 1061-1225 in test_result_filtering.py)
        - Test: `test_filter_movies_excludes_missing_poster()` - excludes movies without poster_path
        - Test: `test_filter_movies_excludes_empty_title()` - excludes movies with empty/whitespace titles
        - Test: `test_filter_movies_completeness_with_all_valid()` - doesn't exclude valid movies
        - Test: `test_completeness_filter_applies_with_other_filters()` - works with combined filters
        - **Test-first approach**: Tests written first, failed initially, then passed after implementation
        - Enhanced `create_movie_dict()` helper with optional `poster_path` parameter for testing

    - [x] 3.2.b Create `filter_movies_by_completeness()` in `result_filtering.py`
        - **Completed**: Lines 188-234 in result_filtering.py
        - Excludes movies with missing/empty `poster_path` (prevents broken images)
        - Excludes movies with empty/whitespace-only `title` (prevents blank cards)
        - Comprehensive docstring with quality rationale and examples
        - Always applied (not configurable - basic UI quality requirement)

    - [x] 3.2.c Update `_apply_filters()` to apply completeness filter
        - **Completed**: Integrated at line 370 in movie_service.py
        - Applied FIRST in filter chain (before year/rating filters)
        - Always enabled for all endpoints (discover, search, now_playing, upcoming)
        - Logging inherited from existing filter warning system
        - Removed early-return optimization to ensure completeness filter always runs

    - [x] 3.2.d Verify tests pass
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

- [x] **3.3 Implement Historical Validation**

    **Goal**: Exclude obviously invalid dates (before 1888 - first film ever made).

    - [x] 3.3.a Write unit tests for historical validation (TEST-FIRST)
        - **Completed**: Added 3 comprehensive tests (lines 1168-1289 in test_result_filtering.py)
        - Test: `test_filter_movies_excludes_pre_cinema_dates()` - excludes pre-1888 dates
        - Test: `test_filter_movies_includes_first_film_year()` - includes 1888 (boundary year)
        - Test: `test_historical_validation_with_year_filters()` - works with user filters
        - **Test-first approach**: Tests written first, failed initially, then passed after implementation
        - **Pattern used**: Used existing `create_movie_dict()` helper for consistency

    - [x] 3.3.b Add historical validation to `filter_movies_by_year()`
        - **Completed**: Added `FIRST_FILM_YEAR = 1888` constant (line 38 in result_filtering.py)
        - **Implementation**: Added historical validation check in filter function (lines 96-99)
        - **Always applied**: Validation runs regardless of user filters (data quality requirement)
        - **Integration**: Updated `movie_service.py` to always call year filter (line 354)
        - **Documentation**: Enhanced docstring with historical validation details

    - [x] 3.3.c Verify tests pass
        - **Completed**: All 3 new tests pass, full suite 368/368 pass (1 pre-existing teardown error)
        - **Quality gates**: Ruff (0 violations), Pyright (0 errors)
        - **Implementation verified**: Filter correctly excludes pre-1888 dates, includes 1888+

    **Actual Impact**:

    - Always excludes movies with release dates before 1888 (first film ever made)
    - Prevents obviously invalid historical data from appearing in UI
    - Always-on validation (not dependent on user filters)
    - Zero performance impact (single comparison per movie)
    - Comprehensive test coverage validates boundary conditions

- [x] **3.4 Fix Frontend Date Timezone Bug**

    **Goal**: Fix MovieCard date display showing wrong date due to timezone conversion.

    - [x] 3.4.a Write test for correct date display (TEST-FIRST)
        - **Completed**: Added 3 comprehensive tests in MovieCard.test.tsx (lines 176-228)
        - Test: `displays ISO date without timezone shifting` - validates exact "January 1, 1980" format
        - Test: `handles year boundary dates correctly` - validates "December 31, 1999" stays correct
        - Test: `parses ISO date components directly` - validates multiple edge cases
        - **Critical improvement**: Tests check exact formatted strings (e.g., "January 1, 1980") to catch the bug
        even in UTC test environments
        - **Test environment issue addressed**: Container runs in UTC, so generic tests would pass with broken code

    - [x] 3.4.b Update `MovieCard.tsx` date formatting (lines 102-130)
        - **Completed**: Replaced `new Date(movie.release_date)` with timezone-safe parsing
        - **Implementation**: Parse ISO string components → create Date in local timezone
        - **Code**: Split on "-", parseInt year/month/day, create `new Date(year, month-1, day)`
        - **Validation**: Added NaN checks for robustness
        - **Documentation**: Detailed comments explaining the timezone bug and fix

    - [x] 3.4.c Verify test passes
        - **Completed**: All 348 frontend tests pass (including 3 new date tests)
        - **Quality gates**: ESLint (0 violations), TypeScript (0 errors)

    - [x] 3.4.d Search for other date parsing instances
        - **Completed**: Grep search found all `new Date()` uses in frontend
        - **Fixed**: MovieDetail.tsx (lines 66-83) - same timezone-safe parsing pattern
        - **Verified safe**: Other uses are correct (current timestamps, Unix timestamps, Date constructor with components)
        - **Consistency**: Both components now use identical timezone-safe parsing logic

    **Actual Impact**:

    - UI now displays dates matching backend data exactly (no timezone shifts)
    - "1980-01-01" displays as "January 1, 1980" in all timezones (previously "December 31, 1979" in US Eastern)
    - Consistent fix across all components (MovieCard, MovieDetail)
    - Robust tests validate fix even in UTC environments
    - Zero performance impact (string parsing is negligible)

- [x] **3.5 Quality Gate & Testing**

    - [x] 3.5.a Run all backend tests
        - ✅ 368/368 tests passing (100% pass rate)
        - All Phase 3 filtering logic verified (vote count, completeness, historical validation)
        - Test teardown error remains fixed

    - [x] 3.5.b Run frontend tests
        - ✅ 348/348 tests passing
        - Date fix working correctly, all component tests passing

    - [x] 3.5.c Run linting checks
        - ✅ Backend: ruff check passes (1 unused import auto-fixed)
        - ✅ Frontend: npm run lint passes
        - ✅ Markdown: markdownlint passes (58 files, 0 errors)

    - [x] 3.5.d Run type checking
        - ✅ Backend: pyright 0 errors (46 informational messages expected)
        - ✅ Frontend: npm run type-check passes

    **Summary**: All quality gates passing. Codebase is in excellent health with all Phase 3 enhancements verified.

- [x] **3.6 Manual Validation - Final Data Quality Assessment**

    **Goal**: Assess end-result data quality after all enhancements to determine if additional work needed.

    **Integration/E2E Bug Protocol**: During manual testing, bugs requiring integration or E2E test coverage
    (navigation, URL state, pagination display, etc.) will be documented in
    `.arc/backlog/technical/notes-backend-modernization.md` under "Known Bugs Requiring E2E Test Coverage"
    for comprehensive testing during Backend Modernization Phase 1. These bugs may receive quick fixes or
    incidental tasks for the fix, but E2E test infrastructure will be built as dedicated planned work.

    - [x] 3.6.a Test discover page with year filters
        - Apply filter: 1980-1983
        - Verify: No pre-1980 or post-1983 movies appear
        - Check: Date display matches backend data (timezone bug fixed)
        - Sample 20-30 movies, assess accuracy rate
        - **Result**: ✅ PASSING - Year filters accurate, no bad data leaking through
        - **Bugs found**: Adult content question (resolved - TMDB correctly classifies), pagination result
        count bug (fixed immediately - 382a822), back button navigation bug (incidental task + documented
        in backend-modernization notes for E2E testing)

    - [x] 3.6.b Test rating filters with vote count threshold
        - **Result**: ✅ PASSING - Rating filters work correctly with tiered vote count policy
        - **Evolution**: Original plan specified 50-vote threshold; actual implementation uses sophisticated
          `VoteCountPolicy` with tiered thresholds (STRICT=200 for rating sorts, MODERATE=3 for general,
          BYPASS=None for search/upcoming). This is better design - evolved during intervening work.
        - **Verified**: Rating filter 7.5+ returns only movies ≥7.5; vote count policy applies per context
        - **Historical note**: Pagination bug that caused pause was addressed by infinite scroll migration
          decision - numbered pagination being replaced entirely

    - [x] 3.6.c Assess completeness filter effectiveness
        - **Result**: ✅ PASSING - No broken posters or empty titles in API responses
        - **Verified**: `jq` query for null poster_path or empty title returns no results
        - **Filter active**: CompletenessPolicy excludes movies missing poster or title

    - [x] 3.6.d Assess overall data quality improvement
        - **Result**: ✅ SATISFACTORY - Data quality mechanisms comprehensive and working
        - **Verified mechanisms**:
            - Year filters: 1980-1983 query returns only movies in that range
            - Historical validation: Oldest movie returned is 1888 (first films), nothing invalid
            - Completeness filter: Active, no broken UI elements
            - Vote count policy: Tiered thresholds based on context
            - Frontend timezone fix: Dates display correctly (verified in earlier sessions)
        - **Note on measurement**: Empirical percentage not practical to calculate, but qualitative
          assessment confirms high quality. Multiple intervening task lists (4-5) added additional
          quality mechanisms since original task written. Quality is observably satisfactory.

    **Note on Future Work**:
    Redis/Celery infrastructure (planned in `notes-backend-modernization.md`) could enable multi-call
    optimizations like fetching `/release_dates` for detail pages without performance penalty.
    Defer this work until async infrastructure available.

    **Expected Impact**: Comprehensive data quality assessment, informed decision on further work

---

### **Phase 4:** Cleanup & Documentation

**Purpose**: Complete optional enhancements and integrate learnings into permanent documentation.

- [x] **4.1 Optional: Non-Visual Filtering Enhancement**

    - **Decision**: Skip - non-visual filtering (soundtracks, etc.) rarely affects discover/browse results
      since genre filtering already excludes most non-visual content. Low value for the complexity.
    - **Status**: Not implemented, acceptable as-is

- [x] **4.2 Documentation Integration**

    - **Decision**: Documentation scope changed - creating atomic task for dedicated `strategy-data-quality.md`
      instead of integrating into TECHNICAL-OVERVIEW.md (wrong place for this level of detail)
    - **Atomic task created**: See ATOMIC-TASKS.md for "Create strategy-data-quality.md" task
    - **Testing strategy**: No updates needed - integration test pattern established through this work

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

## Success Criteria

- [x] Complete understanding of filter data flow from UI → backend → response
- [x] Comprehensive test coverage at all integration points
- [x] All filters work correctly (year, rating, runtime, genre, etc.)
- [x] No TMDB bad data leaks through (e.g., 1979 in 1980-1983 results)
- [x] Documentation accurately reflects implementation (atomic task for strategy doc)
- [x] Zero tolerance quality gates pass (all tests, linting, type checking)
- [x] Future filter changes can be made with confidence
