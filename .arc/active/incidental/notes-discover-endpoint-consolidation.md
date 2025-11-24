# Notes: Discover Endpoint Consolidation

**Created:** 2025-10-30
**Task List:** `.arc/active/incidental/tasks-discover-endpoint-consolidation.md` (created from these notes)
**Context:** Investigation during test organization Phase 3 revealed architectural issues requiring immediate fix
before continuing test splits

---

## Phase 5 Test Audit

### Test File Locations

**Forward-compatible locations (already migrated):**

- `tests/integration/api/test_date_constrained_endpoints.py` - 6 tests
- `tests/unit/helpers/test_endpoint_preset_merge.py` - 14 tests

**Old locations (need migration during test-organization Phase 4):**

- `tests/test_movie_api.py` - 22 tests
- `tests/test_result_filtering.py` - 33 tests
- `tests/test_endpoint_enrichment_integration.py` - 6 tests

---

### Tests by Endpoint

#### Browse Endpoint (`/api/movies/browse`)

**test_movie_api.py** (17 tests):

| Test | Feature | Lines |
|------|---------|-------|
| `test_paginated_endpoint_contract` | Contract | 99 |
| `test_browse_with_filters` | Filtering | 162 |
| `test_browse_invalid_parameters` | Error handling | 233 |
| `test_browse_api_extracts_backend_filter_params` | Filter extraction | 512 |
| `test_browse_api_filters_bad_ratings_from_tmdb` | Rating filtering | 573 |
| `test_browse_api_buffer_mechanism_with_filtering` | Buffer + filtering | 626 |
| `test_browse_returns_next_tmdb_page_start_after_buffer` | Pagination tracking | 787 |
| `test_browse_continues_from_tmdb_page_start_parameter` | Pagination continuation | 863 |
| `test_browse_no_duplicates_across_sequential_pages` | Deduplication | 911 |
| `test_browse_fallback_when_tmdb_page_start_omitted` | Pagination fallback | 993 |
| `test_browse_deduplicates_when_tmdb_returns_duplicate_across_pages` | Deduplication | 1040 |
| `test_browse_deduplicates_multiple_duplicates_across_pages` | Deduplication | 1117 |
| `test_browse_deduplication_works_with_backend_filters` | Dedup + filters | 1194 |
| `test_browse_respects_max_buffer_pages_with_heavy_duplication` | Buffer limits | 1282 |
| `test_browse_no_cross_page_duplicates` | Cross-page dedup | 1360 |
| `test_browse_backward_navigation_consistency` | Navigation | 1452 |

**test_date_constrained_endpoints.py** (2 tests):

| Test | Feature | Lines |
|------|---------|-------|
| `test_browse_still_works_after_rename` | Rename verification | 121 |
| `test_browse_allows_full_date_control` | No protected keys | 230 |

**test_endpoint_enrichment_integration.py** (3 tests):

| Test | Feature | Lines |
|------|---------|-------|
| `test_discovery_endpoint_enriches_user_movie_data_for_authenticated_user` | User enrichment | 74 |
| `test_discovery_endpoint_works_for_unauthenticated_user` | Anonymous access | 149 |
| `test_discovery_endpoint_returns_none_for_movies_without_user_data` | Missing data handling | 207 |

---

#### Now-Playing Endpoint (`/api/movies/now-playing`)

**test_date_constrained_endpoints.py** (2 tests):

| Test | Feature | Lines |
|------|---------|-------|
| `test_now_playing_returns_results_with_genre_filter` | Genre filtering | 39 |
| `test_now_playing_date_preset_cannot_be_overridden` | Protected keys | 160 |

**test_result_filtering.py** (1 test):

| Test | Feature | Lines |
|------|---------|-------|
| `test_filtering_applies_to_now_playing_endpoint` | Filter application | 837 |

**test_endpoint_enrichment_integration.py** (parametrized - included in browse tests)

---

#### Upcoming Endpoint (`/api/movies/upcoming`)

**test_date_constrained_endpoints.py** (2 tests):

| Test | Feature | Lines |
|------|---------|-------|
| `test_upcoming_returns_results_with_rating_filter` | Rating filtering | 80 |
| `test_upcoming_date_preset_cannot_be_overridden` | Protected keys | 195 |

**test_result_filtering.py** (1 test):

| Test | Feature | Lines |
|------|---------|-------|
| `test_filtering_applies_to_upcoming_endpoint` | Filter application | 871 |

**test_endpoint_enrichment_integration.py** (parametrized - included in browse tests)

---

#### Popular/Top-Rated Endpoints (ELIMINATED)

**NO TESTS EXIST** - These endpoints were eliminated per ADR-002. The `keyword/popular` and `person/popular` references
in test files are TMDB API paths, not our endpoints.

---

### Merge Logic Tests

**test_endpoint_preset_merge.py** (14 tests in TestMergeWithPreset class):

| Test | Feature |
|------|---------|
| `test_protected_keys_override_user_values` | Core merge behavior |
| `test_non_protected_keys_merge_correctly` | Non-protected precedence |
| `test_user_only_keys_preserved` | User filter preservation |
| `test_empty_user_filters` | Empty user handling |
| `test_empty_preset` | Empty preset handling |
| `test_no_protected_keys` | No protection scenario |
| `test_now_playing_protected_keys_constant` | Constant verification |
| `test_upcoming_protected_keys_constant` | Constant verification |
| `test_browse_protected_keys_constant` | Constant verification |
| `test_realistic_now_playing_scenario` | Integration scenario |
| `test_realistic_upcoming_scenario` | Integration scenario |
| `test_year_filters_blocked_for_now_playing` | Year blocking |
| `test_realistic_browse_scenario` | Integration scenario |

---

### Other Tests (not endpoint-specific)

**test_movie_api.py** (5 tests):

- `test_get_movie_genres` - Genres endpoint
- `test_get_popular_keywords` - Keywords endpoint
- `test_search_keywords` - Keywords search
- `test_get_popular_people` - People endpoint
- `test_search_people` - People search

**test_movie_api.py** (2 tests):

- `test_get_movie_detail_authenticated` - Movie detail with auth
- `test_get_movie_detail_unauthenticated` - Movie detail without auth

---

### Key Findings

1. **No popular/top-rated tests** - Endpoints eliminated per ADR-002, no migration needed
2. **Browse endpoint well-tested** - 22 tests covering filtering, pagination, buffer, deduplication
3. **Now-playing/upcoming undertested** - Only 3 tests each, mostly for protected keys
4. **Forward-compatible tests exist** - 20 tests already in new locations
5. **Merge logic comprehensively tested** - 14 unit tests cover all scenarios

---

### Coverage Matrix

**Legend:** ✅ Tested | ❌ Gap | ⚠️ Service-level only (no API test)

---

#### Tier 1: Basic Correctness (Sanity Checks) - HIGHEST PRIORITY

These catch fundamental breaks. Test per-endpoint first.

| Check | Browse | Now-Playing | Upcoming |
|-------|--------|-------------|----------|
| Returns 200 + results | ✅ | ❌ | ❌ |
| Buffer fills to 20 results | ✅ | ❌ | ❌ |
| Date range correctness | N/A | ❌ | ❌ |
| min_vote_count correctness | ❌ | ❌ | ❌ |

**Endpoint-specific date constraints:**

- **Now-Playing**: All movies within `today-30` to `today+5` (no older than ~month, no further than weekend)
- **Upcoming**: All movies within `today+5` to `today+60` (future only, not past)
- **Browse**: No date constraints (user controls via filters)

**min_vote_count behavior:**

- **Browse**: Applied (MIN_VOTE_COUNT threshold)
- **Now-Playing**: Applied (released movies have votes)
- **Upcoming**: NOT applied (unreleased movies have 0 votes) ← This was the bug

---

#### Tier 2: Universal Behaviors - Test Strategy TBD in 5.2

These apply to all endpoints. Design question: test once, or parametrized across all 3?

| Feature | Browse | Now-Playing | Upcoming | Test Strategy |
|---------|--------|-------------|----------|---------------|
| Completeness filtering | ⚠️ | ❌ | ❌ | Service-level exists, API smoke? |
| Pagination metadata | ✅ | ❌ | ❌ | Parametrize? |
| Buffer mechanism | ✅ | ❌ | ❌ | Parametrize? |
| Deduplication | ✅ | ❌ | ❌ | Parametrize? |
| Error handling | ✅ | ❌ | ❌ | Parametrize? |
| User enrichment | ✅ | ✅ | ✅ | Already parametrized ✅ |

**Design consideration for 5.2:** Since wrappers can have bugs (e.g., min_vote_count), consider parametrized smoke tests
that prove universal behaviors work through each endpoint's code path. Not full edge-case coverage per endpoint, just
"does this work here too?"

---

#### Tier 3: Endpoint-Specific Features

| Feature | Browse | Now-Playing | Upcoming |
|---------|--------|-------------|----------|
| Protected keys | ✅ | ✅ | ✅ |
| Preset merge logic | ✅ | ✅ | ✅ |
| Genre filtering | ✅ | ✅ | ❌ |
| Rating filtering | ✅ | ❌ | ✅ |
| Year filtering | ⚠️ | ❌ | ❌ |
| Sort options | ❌ | N/A | N/A |

---

**Coverage Summary:**

| Endpoint | Tier 1 | Tier 2 | Tier 3 | Overall |
|----------|--------|--------|--------|---------|
| Browse | 1/4 (25%) | 5/6 (83%) | 4/6 (67%) | 10/16 (63%) |
| Now-Playing | 0/4 (0%) | 1/6 (17%) | 3/6 (50%) | 4/16 (25%) |
| Upcoming | 0/4 (0%) | 1/6 (17%) | 3/6 (50%) | 4/16 (25%) |

**Critical finding:** Tier 1 (basic correctness) has 0% coverage for now-playing and upcoming. This explains why the min
vote_count bug and other fundamental issues weren't caught (recently found/fixed in unrelated work).

---

### Test Gap Calculation

**Raw Gap Count by Tier:**

| Tier | Browse | Now-Playing | Upcoming | Total |
|------|--------|-------------|----------|-------|
| Tier 1 (Sanity) | 1 | 4 | 4 | 9 |
| Tier 2 (Universal) | 1 | 5 | 5 | 11 |
| Tier 3 (Specific) | 2 | 2 | 2 | 6 |
| **Total** | 4 | 11 | 11 | **26** |

**With DRY Patterns (Estimated Test Functions):**

**Tier 1: ~3-4 test functions**

- `test_endpoint_returns_results` - parametrized × 3 endpoints
- `test_date_range_correctness` - parametrized × 2 date-constrained endpoints
- `test_min_vote_count_behavior` - parametrized × 3 endpoints (different expectations per endpoint)
- `test_buffer_fills_page` - parametrized × 3 endpoints

**Tier 2: ~5 test functions (extend existing to parametrize)**

- `test_completeness_filtering_smoke` - parametrized × 3 endpoints
- `test_pagination_metadata` - extend existing browse test to × 3
- `test_buffer_mechanism` - extend existing browse test to × 3
- `test_deduplication` - extend existing browse test to × 3
- `test_error_handling` - extend existing browse test to × 3

**Tier 3: ~4 test functions**

- `test_sort_options_return_results` - parametrized × N user-exposed sort options (Browse only)
- `test_year_filtering` - parametrized × 3 endpoints
- Add to existing parametrized filter tests: genre for Upcoming, rating for Now-Playing

**Total Estimate: ~12-13 new test functions**

Most are parametrized, so actual test executions will be higher (e.g., 3 sort options × 6 sort values = 18 test cases
from 1 function).

---

**Key Principle:** If tests pass but app is broken, tests aren't serving their purpose.

Tests should catch:

- Endpoints returning 0 results when they shouldn't
- Sort options breaking silently
- Date constraints being violated
- min_vote_count being applied/not applied incorrectly

**Test Strategy:**

- Parametrized smoke tests for universal behaviors across all 3 endpoints
- Catches wrapper-specific bugs (like min_vote_count in upcoming)
- Test user-exposed functionality (sort options we expose, not all TMDB options)
- DRY but thorough enough to trust "green = working"

---

## Phase 5.2: DRY Test Design

### 5.2.b: Parametrized Test Pattern

**Goal:** Single test function runs against multiple endpoints with endpoint-specific expectations.

**Pattern: Endpoint Configuration Tuples**

```python
from datetime import date, timedelta
from typing import NamedTuple

class EndpointConfig(NamedTuple):
    """Configuration for parametrized endpoint tests."""
    name: str                    # Display name for test output
    url: str                     # API endpoint path
    has_date_preset: bool        # Whether endpoint has date constraints
    min_vote_count_applied: bool # Whether MIN_VOTE_COUNT is enforced
    protected_keys: list[str]    # Keys user cannot override

# Endpoint configurations
BROWSE_CONFIG = EndpointConfig(
    name="browse",
    url="/api/movies/browse",
    has_date_preset=False,
    min_vote_count_applied=True,
    protected_keys=[],
)

NOW_PLAYING_CONFIG = EndpointConfig(
    name="now-playing",
    url="/api/movies/now-playing",
    has_date_preset=True,
    min_vote_count_applied=True,
    protected_keys=["primary_release_date.gte", "primary_release_date.lte", "with_release_type"],
)

UPCOMING_CONFIG = EndpointConfig(
    name="upcoming",
    url="/api/movies/upcoming",
    has_date_preset=True,
    min_vote_count_applied=False,  # Unreleased movies have 0 votes
    protected_keys=["primary_release_date.gte", "primary_release_date.lte", "with_release_type"],
)

ALL_ENDPOINTS = [BROWSE_CONFIG, NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
DATE_CONSTRAINED_ENDPOINTS = [NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
```

**Example: Parametrized Sanity Test**

```python
import pytest
from unittest.mock import Mock, patch

@pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_endpoint_returns_results(
    mock_tmdb_get: Mock,
    api_client: Client,
    config: EndpointConfig,
    mock_tmdb_movies: list[TMDBMovieBaseRawDict],
) -> None:
    """Sanity: Each endpoint returns 200 with results."""
    tmdb_response = create_paginated_tmdb_response(mock_tmdb_movies)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    response = api_client.get(f"{config.url}?page=1")

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0
    assert data["page"] == 1
```

**Example: Endpoint-Specific Expectations**

```python
@pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
@patch("core.services.tmdb_api_client.TMDBApiClient.get")
def test_min_vote_count_behavior(
    mock_tmdb_get: Mock,
    api_client: Client,
    config: EndpointConfig,
) -> None:
    """Each endpoint applies min_vote_count correctly per its configuration."""
    # Create movies with varying vote counts
    movies = [
        create_raw_tmdb_movie(1, "High Votes", "2025-10-15", 7.5, vote_count=5000),
        create_raw_tmdb_movie(2, "Low Votes", "2025-10-15", 7.5, vote_count=10),
        create_raw_tmdb_movie(3, "Zero Votes", "2025-10-15", 7.5, vote_count=0),
    ]
    tmdb_response = create_paginated_tmdb_response(movies)
    mock_tmdb_get.return_value = ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    response = api_client.get(f"{config.url}?page=1")
    data = response.json()

    if config.min_vote_count_applied:
        # Browse and now-playing: low/zero vote movies filtered out
        assert all(m["vote_count"] >= MIN_VOTE_COUNT for m in data["results"])
    else:
        # Upcoming: all movies returned (unreleased have 0 votes)
        assert len(data["results"]) == 3
```

**Pattern Benefits:**

- Single test function covers all endpoints
- `ids=lambda c: c.name` gives readable test output: `test_endpoint_returns_results[browse]`
- Endpoint-specific logic via config attributes, not code duplication
- Easy to add new endpoints - just add config to list

---

### 5.2.c: Shared Fixtures Design

**Location:** `backend/apps/movie/tests/integration/conftest.py`

**Existing Infrastructure (keep using directly):**

- `create_raw_tmdb_movie()` - Builder for individual movies
- `create_paginated_tmdb_response()` - Builder for paginated responses
- These are in `test_fixtures_tmdb.py` and work well as explicit calls

**New Fixtures to Create:**

**Fixture 1: Mock TMDB Response Factory**

```python
from typing import Protocol

class TMDBResponseFactory(Protocol):
    def __call__(
        self,
        movies: list[TMDBMovieBaseRawDict] | None = None,
        page: int = 1,
        total_pages: int = 1,
        total_results: int | None = None,
    ) -> ApiResponse: ...

@pytest.fixture
def mock_tmdb_response_factory() -> TMDBResponseFactory:
    """Factory for creating mock TMDB API responses with various configurations."""
    def factory(
        movies: list[TMDBMovieBaseRawDict] | None = None,
        page: int = 1,
        total_pages: int = 1,
        total_results: int | None = None,
    ) -> ApiResponse:
        if movies is None:
            movies = [
                create_raw_tmdb_movie(1, "Default Movie", "2025-10-15", 7.5, vote_count=1000),
            ]
        tmdb_response = create_paginated_tmdb_response(movies, page, total_pages, total_results)
        return ApiResponse(200, cast(TMDBResponseData, tmdb_response))

    return factory
```

**Fixture 3: Date Range Expectations**

```python
from datetime import date, timedelta

@pytest.fixture
def expected_date_ranges() -> dict[str, tuple[date, date]]:
    """Expected date ranges for date-constrained endpoints."""
    today = date.today()
    return {
        "now-playing": (today - timedelta(days=30), today + timedelta(days=5)),
        "upcoming": (today + timedelta(days=5), today + timedelta(days=60)),
    }
```

**Why These Fixtures:**

- `mock_tmdb_response_factory`: Wraps both response creation AND `ApiResponse(200, cast(...))` boilerplate
- `expected_date_ranges`: Centralizes date calculation logic for date correctness tests
- Filter test cases: Inline in tests (simple enough, no fixture needed)

**Why NOT a `mock_tmdb_movies` fixture:**

- Most tests need specific movie configurations (vote counts, dates, genres)
- Generic fixture isn't useful - the builder functions are already clean
- Explicit `create_raw_tmdb_movie()` calls show exactly what's being tested

**Fixture Placement:**

- New fixtures: `tests/integration/conftest.py`
- Endpoint configs (NamedTuple): `tests/integration/api/endpoint_configs.py` module (shared across test files)
- Existing helpers: Stay in `test_fixtures_tmdb.py` (continue calling directly)

---

### 5.2.d: Test File Organization

**Forward-Compatible Location:** `backend/apps/movie/tests/integration/api/`

This matches the test-organization-standardization plan (Phase 4). Tests placed here now won't need moving.

**Proposed Files:**

| File | Purpose | Tests |
|------|---------|-------|
| `test_endpoint_sanity.py` | Tier 1 sanity checks | ~4 functions, 10-12 test cases |
| `test_endpoint_behaviors.py` | Tier 2 universal behaviors | ~5 functions, 15+ test cases |
| `test_browse_sort_options.py` | Sort options (Browse only) | ~3 functions, 8-10 test cases |
| `test_date_constrained_endpoints.py` | Already exists - extend | Add date range correctness tests |

**File Details:**

**`test_endpoint_sanity.py`** (~150-200 lines)

```
- test_endpoint_returns_results (×3 endpoints)
- test_buffer_fills_to_20_results (×3 endpoints)
- test_date_range_correctness (×2 date-constrained)
- test_min_vote_count_behavior (×3 endpoints)
```

Critical tests that catch fundamental breaks. If these fail, endpoint is broken.

**`test_endpoint_behaviors.py`** (~250-300 lines)

```
- test_completeness_filtering (×3 endpoints)
- test_pagination_metadata (×3 endpoints)
- test_filter_passthrough (×3 endpoints × N filter types)
- test_error_handling (×3 endpoints)
- test_deduplication_smoke (×3 endpoints)
```

Universal behaviors that should work identically across all endpoints.

**`test_browse_sort_options.py`** (~150-200 lines)

```
- test_sort_options_return_results (×8 sort options)
- test_vote_average_sort_respects_min_vote_count
- test_sort_with_filters_combination
```

Browse-specific - now-playing/upcoming have fixed sort (release_date).

**Naming Conventions:**

- `test_{scope}_{feature}.py` - e.g., `test_endpoint_sanity.py`
- Functions: `test_{what}_{detail}` - e.g., `test_date_range_correctness`
- Parametrized IDs: Use endpoint name - `[browse]`, `[now-playing]`, `[upcoming]`

**What NOT to Create:**

- No separate files per endpoint (defeats DRY purpose)
- No `test_now_playing_*.py` or `test_upcoming_*.py` (use parametrization)
- No duplication of existing `test_date_constrained_endpoints.py` tests

**Existing File Extensions:**

- `test_date_constrained_endpoints.py`: Add `test_date_range_correctness` tests (date validation)
- `test_endpoint_preset_merge.py`: Already complete (14 tests) - no changes needed

---

### Implementation Order for 5.4

Task list restructured to implement infrastructure first:

1. **5.4.a**: Create test infrastructure (endpoint configs + fixtures)
2. **5.4.b**: Write Tier 1 sanity tests (highest priority, catches real bugs)
3. **5.4.c**: Write Tier 2 behavior tests
4. **5.4.d**: Extend date-constrained tests with preset-specific tests
5. **5.4.e**: Write sort options tests (Browse-specific)
6. **5.4.f**: Run all tests and verify pass

**Rationale:** Fixtures are infrastructure that tests depend on. Creating them first (5.4.a)
allows all subsequent tests to be written cleanly without boilerplate.

---
