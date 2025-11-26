# Notes: Test Organization Standardization

**Created:** 2025-10-30
**Last Updated:** 2025-11-26 (Post-endpoint-consolidation reassessment)
**Related Task List:** `.arc/active/incidental/tasks-test-organization-standardization.md`
**Purpose:** Document current state analysis and migration decisions for test organization work

---

## Current State Analysis (2025-11-26)

### Test Suite Growth

| Metric                           | Phase 3 (2025-10-30) | Current | Change |
|----------------------------------|----------------------|---------|--------|
| Total project tests              | 374                  | 454     | +80    |
| Movie app tests                  | ~170                 | 205     | +35    |
| `test_movie_api.py` tests        | 23                   | 28      | +5     |
| `test_result_filtering.py` tests | 30                   | 33      | +3     |

**Note:** Original task list referenced "103 tests" from pytest migration (2025-10-13), but by task
list creation (2025-10-30) the count was already 374. The 103 number was stale documentation.

New tests during endpoint consolidation: ~80 total (51 in new `integration/api/` files).

### New Test Infrastructure (Created During Endpoint Consolidation)

**1. `EndpointConfig` Pattern** (`integration/api/endpoint_configs.py`)

```python
class EndpointConfig(NamedTuple):
    name: str
    url: str
    has_date_preset: bool
    min_vote_count_applied: bool
    protected_keys: list[str]

ALL_ENDPOINTS = [BROWSE_CONFIG, NOW_PLAYING_CONFIG, UPCOMING_CONFIG]
```

Enables DRY parametrized testing across all browse endpoints with endpoint-specific behavior capture.

**2. Test Builders** (`tmdb_test_builders.py`, 338 lines)

Pydantic model builders for validated mock data following type safety strategy.

**3. Centralized Mock Helpers** (`test_helpers.py`)

`create_mock_paginated_response()` wraps builders + ApiResponse for consistent mock creation.

**4. New Test Files in `integration/api/`**

| File                                 | Lines | Tests | Pattern                            |
|--------------------------------------|-------|-------|------------------------------------|
| `test_browse_endpoints.py`           | 648   | 30    | Parametrized by endpoint × concern |
| `test_browse_sort_options.py`        | 191   | 7     | Sort option behaviors              |
| `test_date_constrained_endpoints.py` | 546   | 12    | Date preset enforcement            |

Total: 51 tests using DRY parametrized patterns.

### File Size Analysis

**Files requiring action:**

| File                       | Lines | Tests | Status                 |
|----------------------------|-------|-------|------------------------|
| `test_movie_api.py`        | 1,503 | 28    | Consolidate → delete   |
| `test_result_filtering.py` | 1,561 | 33    | Split by filter domain |

**Files at threshold (keep intact):**

| File                                 | Lines  | Tests           | Rationale                           |
|--------------------------------------|--------|-----------------|-------------------------------------|
| `test_browse_endpoints.py`           | 648    | 30 (90 logical) | DRY parametrized, under 800         |
| `test_date_constrained_endpoints.py` | 546    | 12              | Cohesive focus                      |
| Other 500-670 line files             | varies | varies          | Per Phase 3 decisions (still valid) |

---

## test_movie_api.py Consolidation Plan

### Overlap Analysis

Tests in `test_movie_api.py` that are **covered by new parametrized tests**:

| Old Test                           | New Coverage                                             |
|------------------------------------|----------------------------------------------------------|
| `test_paginated_endpoint_contract` | `TestResponseContract::test_returns_200_with_results`    |
| `test_browse_with_filters`         | `TestDataQuality::test_filter_passthrough_*`             |
| `test_browse_invalid_parameters`   | `TestResponseContract::test_error_handling_invalid_page` |
| 6 deduplication tests              | `TestDataQuality::test_deduplication_across_pages`       |

### Unique Tests to Migrate

**To new `test_reference_endpoints.py`:**

- `test_get_movie_genres`
- `test_get_popular_keywords`
- `test_search_keywords`
- `test_get_popular_people`
- `test_search_people`

**To new `test_movie_detail.py`:**

- `test_get_movie_detail_authenticated`
- `test_get_movie_detail_unauthenticated`

**To existing files or new `test_browse_pagination.py`:**

- `test_browse_returns_next_tmdb_page_start_after_buffer`
- `test_browse_continues_from_tmdb_page_start_parameter`
- `test_browse_no_duplicates_across_sequential_pages`
- `test_browse_fallback_when_tmdb_page_start_omitted`

**Backend filter tests (assess overlap):**

- `test_browse_api_extracts_backend_filter_params`
- `test_browse_api_filters_bad_ratings_from_tmdb`
- `test_browse_api_buffer_mechanism_with_filtering`

### Detailed Overlap Analysis (Task 4.1.1 Audit)

**28 tests in test_movie_api.py analyzed against new integration/api/ tests:**

| Test | Verdict | Rationale |
| ---- | ------- | --------- |
| `test_paginated_endpoint_contract` (4 params) | REDUNDANT | Covered by `TestResponseContract::test_returns_200_with_results` |
| `test_browse_with_filters` | REDUNDANT | Covered by `TestDataQuality::test_filter_passthrough_*` |
| `test_browse_invalid_parameters` (3 params) | PARTIAL | New covers invalid page; old covers year/rating/runtime - **keep unique params** |
| `test_get_movie_genres` | UNIQUE | Reference endpoint - migrate |
| `test_get_popular_keywords` | UNIQUE | Reference endpoint - migrate |
| `test_search_keywords` | UNIQUE | Reference endpoint - migrate |
| `test_get_popular_people` | UNIQUE | Reference endpoint - migrate |
| `test_search_people` | UNIQUE | Reference endpoint - migrate |
| `test_get_movie_detail_authenticated` | UNIQUE | Movie detail endpoint - migrate |
| `test_get_movie_detail_unauthenticated` | UNIQUE | Movie detail endpoint - migrate |
| `test_browse_api_extracts_backend_filter_params` | REDUNDANT | Covered by filter passthrough tests |
| `test_browse_api_filters_bad_ratings_from_tmdb` | REDUNDANT | Covered by `test_min_vote_count_behavior` |
| `test_browse_api_buffer_mechanism_with_filtering` | REDUNDANT | Covered by buffer + filtering tests |
| `test_browse_returns_next_tmdb_page_start_after_buffer` | UNIQUE | Pagination metadata - migrate |
| `test_browse_continues_from_tmdb_page_start_parameter` | UNIQUE | Pagination metadata - migrate |
| `test_browse_no_duplicates_across_sequential_pages` | REDUNDANT | Covered by `test_deduplication_across_pages` |
| `test_browse_fallback_when_tmdb_page_start_omitted` | UNIQUE | Fallback behavior - migrate |
| `test_browse_deduplicates_when_tmdb_returns_duplicate_across_pages` | REDUNDANT | Covered by new parametrized dedup |
| `test_browse_deduplicates_multiple_duplicates_across_pages` | REDUNDANT | Covered (new test less thorough but sufficient) |
| `test_browse_deduplication_works_with_backend_filters` | REDUNDANT | Covered by combined tests |
| `test_browse_respects_max_buffer_pages_with_heavy_duplication` | UNIQUE | Safety limit - migrate |
| `test_browse_no_cross_page_duplicates` (xfail) | UNIQUE | Cross-page dedup - migrate (xfail) |
| `test_browse_backward_navigation_consistency` | UNIQUE | Navigation - migrate |

**Summary:**

- REDUNDANT (delete): 12 tests
- UNIQUE (migrate): 14 tests
- PARTIAL (keep unique params): 2 tests (from `test_browse_invalid_parameters`)

### Migration Strategy

1. **Audit phase:** Read each test, compare to new tests, categorize as redundant/unique
2. **Migrate unique tests** to appropriate files in `integration/api/`
3. **Delete `test_movie_api.py`** once all unique tests migrated
4. **Verify test count:** Start 28 tests, delete 12 redundant, migrate 14 unique + 2 partial = same coverage

### Migration Complete (Task 4.1)

**New files created:**

- `test_reference_endpoints.py` (5 tests) - genres, keywords, people
- `test_movie_detail.py` (2 tests) - authenticated/unauthenticated detail
- `test_browse_pagination.py` (6 tests) - pagination metadata, buffer limits, navigation

**Extended:**

- `test_browse_endpoints.py` (+2 tests) - validation for year/vote_average params

**Deleted:**

- `test_movie_api.py` (28 tests removed, 15 migrated, 13 redundant with existing DRY tests)

**Test count change:** 454 → 441 (12 redundant tests consolidated into existing parametrized tests)

---

## test_result_filtering.py Split Plan

This file tests **service layer** filtering logic (unit tests), distinct from API endpoint
tests. Original split plan remains valid.

### Proposed Split (8 files in `tests/unit/services/filtering/`)

| File                                 | Tests | Lines (est) |
|--------------------------------------|-------|-------------|
| `test_year_filtering.py`             | 4     | ~200        |
| `test_rating_filtering.py`           | 3     | ~140        |
| `test_vote_count_filtering.py`       | 3     | ~120        |
| `test_completeness_filtering.py`     | 4+    | ~180        |
| `test_historical_validation.py`      | 3     | ~120        |
| `test_genre_quality_filtering.py`    | 3     | ~144        |
| `test_buffer_mechanism.py`           | 5     | ~294        |
| `test_endpoint_filtering_context.py` | 4     | ~180        |

Note: 3 new tests added since original analysis (overview filtering). Will be placed in
`test_completeness_filtering.py`.

---

## Other App Migration Notes

### Directory Structure Status

| App             | `tests/unit/` | `tests/integration/` | Notes              |
|-----------------|---------------|----------------------|--------------------|
| movie           | Has conftest  | Has conftest + files | Partially migrated |
| authentication  | Has conftest  | Has conftest         | Structure only     |
| user_movie_data | Has conftest  | Has conftest         | Structure only     |
| core            | Has conftest  | Has conftest         | Structure only     |

### Files to Migrate (No Changes from Phase 3)

Per Phase 3.3 decisions, these files should be split:

- `test_user_movie_data_api.py` (666 lines) → Split by endpoint
- `test_watchlist_endpoint.py` (660 lines) → Examine and potentially split
- `test_user_api.py` (574 lines) → Split by feature

These files should remain intact:

- `test_movie_enrichment_service.py` (672 lines) - Single service focus
- `test_movie_service_buffer_deduplication.py` (589 lines) - TDD feature tests
- `test_response_builder.py` (563 lines) - 2 parametrized tests
- `test_token_refresh_scenarios.py` (519 lines) - Borderline, cohesive
- `test_movie_service.py` (501 lines) - At threshold
- `test_error_recovery.py` (500 lines) - At threshold

---

## Design Decisions

### Line Threshold Flexibility

- **Hard limit:** 800 lines for any test file
- **Soft target:** 400 lines for typical files
- **Exception:** DRY parametrized files can exceed 400 if under 800 and highly cohesive
- **Rationale:** `test_browse_endpoints.py` at 648 lines = 90 logical tests = ~7 lines/case

### EndpointConfig as Standard Pattern

New multi-endpoint API tests should use `EndpointConfig` parametrization:

```python
@pytest.mark.parametrize("config", ALL_ENDPOINTS, ids=lambda c: c.name)
def test_some_behavior(config: EndpointConfig, api_client: Client) -> None:
    response = api_client.get(f"{config.url}?page=1")
    # Test logic using config attributes
```

### Test Organization by Concern

New integration tests should organize by concern, not by endpoint:

```
TestResponseContract     # API promises (status, shape, pagination)
TestBusinessConstraints  # Endpoint-specific rules
TestDataQuality         # Filtering, deduplication
```

---

## Success Metrics

**Targets:**

- All test files under 800 lines (400 preferred, exceptions documented)
- Clear unit/integration separation in all 4 apps
- All 454 tests pass after migration (no regression)
- DRY patterns adopted where applicable
- Directory-based execution works (`pytest tests/unit/`, `pytest tests/integration/`)

**Quality gates per subtask:**

- All tests pass after each file move/split
- Zero linting violations
- Zero type errors
