# Filter Integration Testing - Implementation Notes

**Created**: 2025-10-24
**Related Task List**: `tasks-filter-integration-testing.md`

This document captures detailed findings, data flow mappings, and implementation notes discovered during the filter
integration testing incidental work. Content here will be streamlined and integrated into permanent documentation
(TECHNICAL-OVERVIEW.md or standalone docs) at completion.

---

## Phase 1.1: Complete Filter Data Flow Mapping

### 1.1.1: Frontend Filter UI → API Parameter Mapping

**Status**: ✅ Complete

#### Filter State Structure

The frontend maintains filter state in `MovieFilters` interface (`AdvancedMovieFilters.tsx:11-21`):

```typescript
interface MovieFilters {
    query: string; // Search query
    genres: number[]; // Genre IDs (e.g., [28, 12])
    minYear: string; // e.g., "2020" or "2020s" for decade
    maxYear: string; // e.g., "2023"
    minRating: string; // e.g., "7.0"
    maxRating: string; // e.g., "9.0"
    minRuntime: string; // Currently unused (TMDB API broken)
    maxRuntime: string; // Currently unused (TMDB API broken)
    sortBy: SortOptionValue; // e.g., "popularity.desc"
}
```

**Two Filter Styles**:

- **Minimal**: Letterboxd-style quick filters (genre, year/decade, rating, sort)
- **Expanded**: Full advanced filter panel with all options

#### Parameter Mapping Logic

**Mapper**: `movieFilterMapper.ts:mapFiltersToApiParams()` (frontend/src/utilities/)

**Minimal Style Mapping**:

```typescript
genres: [28, 12]           → genres: "28,12"
minYear: "2020s"           → release_date_gte: "2020-01-01"
                             release_date_lte: "2029-12-31"
minYear: "2020" (no max)   → release_date_gte: "2020-01-01"
                             release_date_lte: "2025-12-31" (current year)
minRating: "7.0"           → vote_average_gte: "7.0"
sortBy: "runtime_90"       → with_runtime_lte: "90", sort_by: "popularity.desc"
sortBy: "rating_desc"      → sort_by: "vote_average.desc"
```

**Expanded Style Mapping**:

```typescript
query                      → query: string
genres: [28, 12]           → genres: "28,12"
minYear: "2020"            → release_date_gte: "2020-01-01"
maxYear: "2023"            → release_date_lte: "2023-12-31"
minYear only               → release_date_lte: current_year-12-31 (implicit)
maxYear only               → release_date_lte: "YYYY-12-31"
minRating: "7.0"           → vote_average_gte: "7.0"
maxRating: "9.0"           → vote_average_lte: "9.0" (only if no minRating)
sortBy                     → sort_by: string (passed through)
```

**Critical Observation**: Frontend mapper only creates `release_date_gte/lte` and `vote_average_gte/lte` -
these are TMDB API parameters, NOT backend filter parameters.

#### API Request Flow

**Request Path**: `useMovieFetchRouter` → `httpService.getPaginated()` → Axios GET with params

**Routing Logic** (frontend/src/hooks/useMovieFetchRouter.ts:75-112):

- If `filters.query` exists → route to `/api/movies/search`
- Else → route to base fetcher (e.g., `/api/movies/discover`)

**Parameter Transmission**: All mapped parameters sent as URL query params via Axios.

---

### 1.1.2: API Schema → Service Parameter Mapping

**Status**: ✅ Complete

#### Schema Reception

**Schema**: `MovieDiscoverFilterSchema` (backend/apps/movie/schemas.py:195-346)

**Key Fields**:

```python
# Pagination
page: int | None

# Genre filters
with_genres: str | None      # "28,12" format
genres: str | None           # Alias for with_genres (frontend convenience)

# Release date filters
release_date_gte: str | None # "YYYY-MM-DD" format from frontend
release_date_lte: str | None # "YYYY-MM-DD" format from frontend
year: int | None             # Alternative: single year

# Rating filters
vote_average_gte: float | None  # From frontend minRating
vote_average_lte: float | None  # From frontend maxRating

# Runtime filters
with_runtime_gte: int | None    # Unused (frontend disabled)
with_runtime_lte: int | None    # Unused (frontend disabled)

# Sorting
sort_by: str | None

# Frontend aliases
decade: str | None           # "2020s" → converted to date range
```

**Empty String Handling**: All fields use `@field_validator('*')` to convert empty strings to None (Django Ninja 1.4.3 quirk).

#### Schema → Service Mapping

**Method**: `MovieDiscoverFilterSchema.to_service_params()` (schemas.py:296-346)

**Current Mapping** (what IS being mapped):

```python
sort_by                    → sort_by
year                       → year
vote_average_gte           → vote_average.gte  # Note the dot!
vote_average_lte           → vote_average.lte
release_date_gte           → release_date.gte
release_date_lte           → release_date.lte
certification              → certification
region                     → region
genres (or with_genres)    → genres
decade                     → release_date.gte + release_date.lte (converted)
```

**🚨 CRITICAL GAP** (what is NOT being mapped):

The schema receives `release_date_gte/lte` and `vote_average_gte/lte` from frontend, which are **TMDB API parameters**.
The schema correctly maps these to `release_date.gte/lte` and `vote_average.gte/lte` for the service layer.

**However**: The service layer has separate parameters `year_min`/`year_max`/`rating_min`/`rating_max` for
**backend client-side filtering** (second-pass data hygiene). These parameters are NEVER populated from the
schema - they always default to `None`.

**Why This Matters** (affects BOTH year AND rating filters):

- Frontend sends: `release_date_gte="2020-01-01"` + `release_date_lte="2029-12-31"` → goes to TMDB API (primary filter)
- Backend should extract: `year_min=2020, year_max=2029` from date strings for client-side filtering (second pass)
- **Current behavior**: `year_min=None, year_max=None` → backend year filtering never activates

- Frontend sends: `vote_average_gte="7.0"` + `vote_average_lte="9.0"` → goes to TMDB API (primary filter)
- Backend should extract: `rating_min=7.0, rating_max=9.0` from these values for client-side filtering (second pass)
- **Current behavior**: `rating_min=None, rating_max=None` → backend rating filtering never activates

---

### 1.1.3: Service-Level Filtering Mechanisms

**Status**: ✅ Complete

#### Service Method Signature

**Method**: `MovieService.discover_movies()` (backend/apps/movie/services/movie_service.py:690-806)

```python
def discover_movies(
    self,
    page: int = 1,
    year_min: int | None = None,      # Backend filtering param (always None from API)
    year_max: int | None = None,      # Backend filtering param (always None from API)
    rating_min: float | None = None,  # Backend filtering param (always None from API)
    rating_max: float | None = None,  # Backend filtering param (always None from API)
    **filters: str | int | float | bool | None  # TMDB API params from schema
) -> PaginatedMovieResponseSchema:
```

#### Parameter Flow Through Service

**Step 1**: Build TMDB API params (lines 737-743)

```python
params: TMDBParams = {
    "include_adult": False,
    "include_video": False,
    "language": "en-US",
    "region": filters.get('region', 'US'),
    "page": page,
}
```

**Step 2**: Map `**filters` to TMDB parameter names (lines 747-781)

```python
filter_mapping = {
    'sort_by': 'sort_by',
    'genres': 'with_genres',
    'year': 'year',
    'vote_average.gte': 'vote_average.gte',  # From schema - goes to TMDB
    'vote_average.lte': 'vote_average.lte',  # From schema - goes to TMDB
    'release_date.gte': 'primary_release_date.gte',  # From schema - goes to TMDB
    'release_date.lte': 'primary_release_date.lte',  # From schema - goes to TMDB
    # ... etc
}

for filter_name, tmdb_param in filter_mapping.items():
    if filter_name in filters and filters[filter_name] is not None:
        params[tmdb_param] = filters[filter_name]  # Added to TMDB request
```

**Step 3**: Fetch from TMDB with filters → `_fetch_with_filters_and_buffer()` (line 799)

```python
return self._fetch_with_filters_and_buffer(
    fetch_discover_page,
    page,
    year_min,      # Always None from API layer
    year_max,      # Always None from API layer
    rating_min,    # Always None from API layer
    rating_max     # Always None from API layer
)
```

#### Backend Filtering Mechanism (Second Pass)

**Method**: `_fetch_with_filters_and_buffer()` (lines 179-310)

**Design Intent**: Apply client-side filtering as **second pass data hygiene** to catch TMDB API quality issues:

- Movies with wrong release dates (e.g., 1979 in 1980-1983 results)
- Movies with missing/incorrect ratings
- Other TMDB data quality problems

**Workflow**:

1. Fetch page from TMDB (with TMDB API filters applied)
2. Check if backend filters needed: `has_filters = (year_min is not None or ...)`
3. If no backend filters → return TMDB response as-is
4. If backend filters exist → apply `_apply_filters()` (lines 329-400)
5. If filtered results < page size → apply buffer mechanism (fetch page N+1 to backfill)

**Filter Functions**:

- `filter_movies_by_year()` (apps/movie/services/result_filtering.py)
- `filter_movies_by_rating()` (apps/movie/services/result_filtering.py)

**🚨 CURRENT STATE**: Backend filtering mechanism exists and works (unit tests pass), but is **never activated**
because `year_min/year_max/rating_min/rating_max` are always `None` from the API layer.

#### Endpoints Using Filtering

**All paginated endpoints support backend filtering**:

1. `discover_movies()` - Main discovery endpoint
2. `search_movies()` - Search with filters
3. `get_now_playing_movies()` - Now playing with filters
4. `get_upcoming_movies()` - Upcoming with filters

**All call `_fetch_with_filters_and_buffer()`** with year/rating parameters.

#### Non-Visual Content Filtering

**Method**: `_filter_non_visual_content()` (lines 97-138)

**Purpose**: Filter out soundtracks, scores, and other non-visual media that appear in TMDB results.

**Skip Terms**:

```python
skip_terms = [
    'soundtrack', 'score', 'music from',
    'original motion picture soundtrack',
    'original score', 'music score', 'film score',
    'motion picture score'
]
```

**Application**:

- ✅ **search_movies()** - Applied via `pre_filter_func` parameter (line 687)
- ❌ **discover_movies()** - NOT applied (no pre_filter_func passed)
- ❌ **get_now_playing_movies()** - NOT applied
- ❌ **get_upcoming_movies()** - NOT applied

**Migration Status**: Successfully migrated from frontend, but only for search endpoint.
Discover/browse endpoints do not filter non-visual content.

**Question for Phase 1.3**: Should non-visual filtering be applied to discover/browse endpoints, or is it only
relevant for search? (Search is more likely to return soundtrack albums when users search for movie titles)

---

## Key Findings Summary

### What Works

1. ✅ Frontend filter UI state management
2. ✅ Frontend filter mapper (movieFilterMapper.ts)
3. ✅ TMDB API parameter transmission to backend
4. ✅ Schema validation and empty string handling
5. ✅ TMDB API filtering (primary filter layer)
6. ✅ Backend filtering mechanism implementation (unit tests pass)
7. ✅ Buffer mechanism for backfilling filtered results

### What's Broken

1. ❌ **Schema never extracts year range from `release_date_gte/lte` for backend filtering**
2. ❌ **Schema never extracts rating range from `vote_average_gte/lte` for backend filtering**
3. ❌ **API layer never populates `year_min/max/rating_min/max` when calling service**
4. ❌ **Backend filtering never activates** → TMDB bad data leaks through
5. ❌ **No integration tests** validate parameter flow from frontend → API → schema → service

### Root Cause

**Incomplete feature migration**: Backend filtering infrastructure was built but never wired to the API layer.
The schema `to_service_params()` maps parameters for TMDB API consumption but doesn't extract year/rating
ranges for backend filtering parameters.

### User Impact

- **Year filters**: 1979 movies appear in 1980-1983 results (confirmed user observation)
- **Rating filters**: Movies with incorrect ratings may appear in filtered results
- **Combined filters**: Bad data from TMDB API passes through unchecked

---

## Architecture Notes

### Design Pattern: Two-Pass Filtering

**TMDB API Layer (Primary)**:

- Purpose: Reduce result set from millions to thousands
- Parameters: `primary_release_date.gte/lte`, `vote_average.gte/lte`, etc.
- Limitation: TMDB data quality issues (wrong dates, missing ratings)

**Backend Filtering Layer (Secondary)**:

- Purpose: Data hygiene - catch TMDB API leakage
- Parameters: `year_min/max`, `rating_min/max`
- Implementation: `_apply_filters()` + `filter_movies_by_year/rating()`
- Current state: Infrastructure exists, never activated

### Why Backend Filtering Matters

TMDB API sometimes returns incorrect data:

- Movies with wrong release_date metadata
- Movies with missing vote_average
- Translation/localization data contamination

Backend filtering is the **safety net** to ensure users only see movies matching their criteria,
even when TMDB API returns bad data.

---

## Next Steps (Phase 1.2+)

1. **Test Coverage Analysis** (Phase 1.2): Understand what tests exist and what's missing
2. **Manual Validation** (Phase 1.3): Confirm bad data patterns with real API calls
3. **Fix Implementation** (Phase 2): Wire schema → service parameter mapping
4. **Integration Tests** (Phase 2): Add comprehensive end-to-end tests

---

## Documentation Integration Plan

**Target Documents**:

- TECHNICAL-OVERVIEW.md - Add "Movie Filtering Architecture" section
    - Two-pass filtering design
    - TMDB API quirks and data quality issues
    - Backend filtering as data hygiene layer
    - Parameter flow diagram

**Alternative**: Create standalone `FILTERING-ARCHITECTURE.md` if section becomes too large.

**Sections to Include**:

1. Overview: Why two-pass filtering exists
2. Filter Parameter Flow (end-to-end diagram)
3. TMDB API Layer: Primary filtering
4. Backend Layer: Second-pass data hygiene
5. Buffer Mechanism: Maintaining page size consistency
6. Known TMDB API Issues: Wrong dates, missing ratings, runtime quirks

---

## Phase 1.2: Test Coverage Analysis

### 1.2.1: Backend Service Unit Test Coverage

**File**: `backend/apps/movie/tests/test_result_filtering.py` (877 lines)

**Status**: ✅ **Excellent comprehensive coverage**

**What's Tested**:

1. **Year Filtering** (Tests 98-289):

    - `test_discover_movies_filters_incorrect_release_years()` - Verifies 2010s movies filtered from 2020s request
    - `test_search_movies_filters_incorrect_release_years()` - Same for search endpoint
    - `test_year_filtering_handles_single_year()` - Single year (not just ranges)
    - `test_year_filtering_handles_missing_release_dates()` - TMDB data quality (None/empty dates)

2. **Rating Filtering** (Tests 295-427):

    - `test_discover_movies_filters_incorrect_ratings()` - Placeholder 0.0 ratings filtered
    - `test_rating_filtering_handles_range()` - Min + max rating ranges
    - `test_rating_filtering_handles_missing_ratings()` - TMDB data quality (None ratings)

3. **Combined Filtering** (Test 434-475):

    - `test_combined_year_and_rating_filtering()` - Both filters applied simultaneously

4. **Buffer Mechanism** (Tests 482-743):

    - `test_buffer_mechanism_fetches_page_n_plus_1_when_under_threshold()` - Backfills when < 20 results
    - `test_buffer_mechanism_does_not_fetch_when_full_page_achieved()` - No buffer when >= 20 results
    - `test_buffer_mechanism_respects_minimum_threshold()` - No buffer when < 10 (filter too restrictive)
    - `test_buffer_mechanism_does_not_fetch_on_last_page()` - No buffer on final page
    - `test_buffer_movies_also_pass_filters_no_leakage()` - **Critical**: Buffer movies must pass filters

5. **Endpoint Coverage** (Tests 750-814):

    - `test_filtering_applies_to_now_playing_endpoint()` - Confirms now_playing uses filtering
    - `test_filtering_applies_to_upcoming_endpoint()` - Confirms upcoming uses filtering

6. **No-Filter Behavior** (Tests 821-877):
    - `test_no_filters_returns_all_results_unchanged()` - Passthrough when no filters
    - `test_no_buffer_fetch_when_no_filters_applied()` - Buffer disabled when no filters

**Testing Approach**:

- Direct service method calls with `year_min/max/rating_min/max` parameters
- Mocked TMDB client responses
- Validates filtering logic in isolation

**Key Strength**: Tests call service methods **directly** with filter parameters, verifying the filtering mechanism
works when parameters are provided.

**Critical Gap**: Tests assume parameters are provided correctly - they don't validate the **integration path**
(frontend → API → schema → service).

---

### 1.2.2: Backend API Integration Test Coverage

**File**: `backend/apps/movie/tests/test_movie_api.py` (515 lines)

**Status**: ⚠️ **Limited filter coverage**

**What's Tested**:

1. **Filter Parameter Mapping** (Test 168-240):

    - `test_discover_with_filters()` - Validates filter parameters passed to TMDB client
    - Checks: `sort_by`, `genres`, `year`, `vote_average_gte/lte`, `release_date_gte/lte`, `certification`, `region`
    - **What it validates**: Schema correctly maps API params → TMDB params (e.g., `genres` → `with_genres`)

2. **Parameter Validation** (Tests 242-266):
    - `test_discover_invalid_parameters()` - Pydantic validation (422 errors for invalid types)

**Testing Approach**:

- Django test client HTTP requests to `/api/movies/discover`
- Mocked TMDB responses
- Validates response structure and TMDB client call arguments

**Critical Gaps**:

1. ❌ **No tests validate filtered results**:

    - Test checks TMDB params sent, but doesn't validate actual filtering behavior
    - Doesn't send filter params and assert filtered data returned
    - Doesn't verify bad data is removed

2. ❌ **No tests validate schema → service parameter extraction**:

    - Test doesn't check if `year_min/max` or `rating_min/max` are extracted from date/rating params
    - Doesn't verify backend filtering parameters are populated

3. ❌ **No integration tests for filter data flow**:
    - Doesn't validate: API params → Schema → Service params → Filtered results
    - Missing end-to-end validation of the complete filter pipeline

**What This Means**: API tests validate the **request structure** but not the **filtering behavior**.

---

### 1.2.3: Frontend Test Coverage

**Files Analyzed**:

- `frontend/src/components/movie/filters/__tests__/*` - Individual filter component tests
- Total frontend test files: 14

**Status**: ⚠️ **Component tests only, no integration tests**

**What's Tested**:

1. **Individual Filter Components**:
    - `ClearFiltersButton.test.tsx` - Clear button UI behavior
    - `GenreSelector.test.tsx` - Genre selection UI
    - `RatingSelector.test.tsx` - Rating input UI
    - `YearSelector.test.tsx` - Year selection UI
    - `SortSelector.test.tsx` - Sort dropdown UI

**Testing Approach**:

- React component unit tests
- User interaction and state management
- UI rendering and accessibility

**Critical Gaps**:

1. ❌ **No tests for `movieFilterMapper.ts`**:

    - Mapper logic has zero test coverage
    - No validation of filter state → API parameter conversion
    - Mapping bugs (like previous `min_rating` → `vote_average_gte` issue) would not be caught

2. ❌ **No tests for `useMovieFetchRouter`**:

    - Hook that routes between search/discover has no tests
    - Filter parameter passthrough not validated

3. ❌ **No integration tests**:

    - No tests validate: Filter UI → Mapper → API call → Response handling
    - Missing end-to-end validation of filter workflow

4. ❌ **No tests validate actual API parameters sent**:
    - Component tests don't mock HTTP layer to verify params
    - Can't catch parameter naming mismatches (the bug we found)

**What This Means**: Frontend has good UI coverage but **zero filter logic coverage**.

---

### 1.2.4: Integration Test Gaps (Summary)

**🚨 Critical Missing Tests**: End-to-end filter parameter flow validation

#### Gap 1: Schema → Service Parameter Extraction

**What's Missing**:

- Test that sends `release_date_gte="2020-01-01"` + `release_date_lte="2029-12-31"` to API
- Validates that service receives `year_min=2020, year_max=2029`
- Test that sends `vote_average_gte=7.0` + `vote_average_lte=9.0` to API
- Validates that service receives `rating_min=7.0, rating_max=9.0`

**Why It Matters**:

- This is the **exact gap** causing the current bug
- Unit tests pass (filtering works) but integration is broken (params never provided)
- Would catch incomplete feature migrations like this one

**Proposed Test**:

```python
def test_discover_api_extracts_backend_filter_params():
    """Integration test: Validate API → Schema → Service param extraction."""
    # Arrange: Send filter params to API
    filters = {
        'release_date_gte': '2020-01-01',
        'release_date_lte': '2029-12-31',
        'vote_average_gte': 7.5
    }

    # Act: Call API with spy on service method
    with patch.object(MovieService, 'discover_movies') as mock_discover:
        api_client.get('/api/movies/discover', filters)

    # Assert: Service called with extracted params
    call_kwargs = mock_discover.call_args.kwargs
    assert call_kwargs['year_min'] == 2020
    assert call_kwargs['year_max'] == 2029
    assert call_kwargs['rating_min'] == 7.5
```

#### Gap 2: Frontend → Backend Parameter Flow

**What's Missing**:

- Test that validates `movieFilterMapper` output matches backend schema expectations
- Test that validates actual HTTP request parameters sent to backend
- Integration test mocking backend API to verify complete filter flow

**Why It Matters**:

- Parameter naming mismatches (like `min_rating` vs `vote_average_gte`) wouldn't be caught
- Frontend refactors could break parameter contracts silently

**Proposed Test**:

```typescript
describe("movieFilterMapper integration", () => {
    it("generates parameters matching backend schema", () => {
        const filters: MovieFilters = {
            minYear: "2020",
            maxYear: "2023",
            minRating: "7.5",
            // ...
        };

        const params = mapFiltersToApiParams(filters, "expanded");

        // Validate exact parameter names backend expects
        expect(params.release_date_gte).toBe("2020-01-01");
        expect(params.release_date_lte).toBe("2023-12-31");
        expect(params.vote_average_gte).toBe("7.5");
    });
});
```

#### Gap 3: End-to-End Filter Validation

**What's Missing**:

- Test that sends filter request through full stack
- Validates actual filtered results returned (not just response structure)
- Confirms TMDB bad data is filtered out

**Why It Matters**:

- Only way to catch issues like "1979 movies in 1980-1983 results"
- Validates the complete two-pass filtering architecture

**Proposed Test**:

```python
def test_discover_filters_remove_bad_tmdb_data_e2e():
    """E2E test: Validate complete filter flow removes bad data."""
    # Arrange: Mock TMDB to return mixed data (some outside filter range)
    tmdb_movies = [
        # Good: 2020-2029 movies
        create_movie(1, "2022 Movie", "2022-01-01", 8.0),
        create_movie(2, "2023 Movie", "2023-01-01", 7.5),
        # Bad: 2019 movie (TMDB data quality issue)
        create_movie(3, "2019 Movie", "2019-01-01", 8.0),
    ]
    mock_tmdb_response(tmdb_movies)

    # Act: Request 2020-2029 movies via API
    response = api_client.get('/api/movies/discover', {
        'release_date_gte': '2020-01-01',
        'release_date_lte': '2029-12-31'
    })

    # Assert: Only 2020-2029 movies in results
    results = response.json()['results']
    assert len(results) == 2
    assert all(2020 <= parse_year(m['release_date']) <= 2029 for m in results)
```

#### Gap 4: Buffer Mechanism Integration

**What's Missing**:

- Integration test validating buffer mechanism via API
- Test that page 2 is fetched when filtered results < 20
- Validates buffer movies also pass filters

**Why It Matters**:

- Buffer mechanism is complex and critical for UX
- Unit tests validate service layer, but API integration not tested

---

### Test Coverage Summary

| Layer                           | Unit Tests              | Integration Tests      | E2E Tests | Status                |
|---------------------------------|-------------------------|------------------------|-----------|-----------------------|
| **API** (Parameter mapping)     | ⚠️ Structure only       | ❌ No filter validation | ❌ None    | **Critical gap**      |
| **Frontend Components**         | ✅ Good UI coverage      | ❌ None                 | ❌ None    | **UI only**           |
| **Frontend Mapper**             | ❌ None                  | ❌ None                 | ❌ None    | **Critical gap**      |
| **Schema** (Param extraction)   | ❌ None                  | ❌ None                 | ❌ None    | **Critical gap**      |
| **Service** (Backend filtering) | ✅ Excellent (877 lines) | ❌ None                 | ❌ None    | **Good in isolation** |

**Overall Assessment**: Excellent service-layer unit tests, but **zero integration test coverage** for the
complete filter pipeline. This is why the bug exists - each layer works in isolation but the integration
is broken.

---

## Phase 1.2 Key Findings

### What We Learned

1. **Service layer filtering is well-tested and works** ✅

    - 17 comprehensive unit tests
    - Covers year/rating filtering, buffer mechanism, all endpoints
    - Would catch any regression in filtering logic

2. **Integration layer has zero test coverage** ❌

    - No tests validate API → Schema → Service parameter flow
    - No tests validate actual filtered results via API
    - No tests validate frontend → backend parameter contracts

3. **Why the bug exists**:

    - Service tests call methods directly with `year_min/max/rating_min/max`
    - API tests only check TMDB param mapping, not backend filtering
    - Schema `to_service_params()` has no tests
    - No integration tests would catch "params never extracted" bug

4. **Test-driven approach needed**:
    - Phase 2 must write integration tests **before** fixing the bug
    - Tests should fail initially (demonstrating current broken state)
    - Tests pass after fix (validating solution)

### Recommended Test Additions (Phase 2)

**Priority 1: Schema Parameter Extraction** (Critical)

```python
# Test: backend/apps/movie/tests/test_schemas.py (new file)
test_discover_schema_extracts_year_from_dates()
test_discover_schema_extracts_rating_from_votes()
test_discover_schema_handles_partial_filters()
```

**Priority 2: API Integration** (Critical)

```python
# Test: backend/apps/movie/tests/test_movie_api.py (additions)
test_discover_api_populates_backend_filter_params()
test_discover_api_returns_filtered_results()
test_discover_api_removes_tmdb_bad_data()
```

**Priority 3: Frontend Mapper** (High)

```typescript
// Test: frontend/src/utilities/__tests__/movieFilterMapper.test.ts (new file)
test_mapper_generates_backend_compatible_params();
test_mapper_handles_minimal_vs_expanded_styles();
test_mapper_date_formatting_matches_backend();
```

**Priority 4: End-to-End** (Medium)

```python
# Test: backend/apps/movie/tests/test_filtering_e2e.py (new file)
test_complete_filter_flow_frontend_to_backend()
test_buffer_mechanism_via_api()
test_combined_filters_e2e()
```

---

**Last Updated**: 2025-10-24 (Phase 1.2 complete)
