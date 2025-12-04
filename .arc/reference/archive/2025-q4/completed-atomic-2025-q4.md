# Completed Atomic Tasks - 2025 Q4

Permanent record of completed atomic tasks. New entries are added at the top (reverse chronological).

Reference format: "see `completed-atomic-2025-q4.md`" or "see {task name} in `completed-atomic-2025-q4.md`"

---

- [x] Fix naming consistency: filters→browseParams where sort is included
    - **Outcome:** Renamed variables/props that were called "filters" but actually held BrowseParams (includes sort)
    - **Changes:**
        - `SortDropdown.tsx`: prop `filters` → `browseParams` (component uses sortBy AND language)
        - `QuickBrowseBar.tsx`: updated prop usage
        - `SortDropdown.test.tsx`: `createMockFilters()` → `createMockBrowseParams()`, prop updates
        - `useMovieFetchRouter.test.ts`: `createEmptyFilters()` → `createEmptyBrowseParams()`, `mockFilters` → `mockBrowseParams`
        - `browseParamMapper.test.ts`: `const filters` → `const browseParams` variable names
    - **Not changed (correctly named):**
        - `ConnectedDropdowns.tsx`: only uses actual filters (genre, year) - `filters` prop appropriate
        - `hasAdvancedFilterValues()`: only checks filter values - `filters` param appropriate
    - **Quality gates:** Type check ✅, Lint ✅, 34 affected tests pass ✅

    - **Branch:** `technical/service-layer-modernization`

- [x] Fix pre-existing linting issues in freezegun stub
    - **Outcome:** Fixed 2 ruff violations in `backend/stubs/freezegun/__init__.pyi`
    - **Changes:**
        - UP035: `typing.ContextManager` → `contextlib.AbstractContextManager`
        - PIE790: Removed unnecessary `...` after docstring
    - **Quality gates:** Ruff ✅, Pyright ✅, 7 token refresh tests pass ✅

    - **Branch:** `technical/service-layer-modernization`

- [x] Refactor auth domain technical debt
    - **Outcome:** Fixed circular dependencies using useRef pattern, standardized auth return types
      with AuthResult<T> discriminated union, migrated 25 console statements to logger service,
      fixed MovieDetail.tsx architecture violation (direct useAuth import → useAuthContext).
    - **Files:** useAuth.ts, auth-state.d.ts, MovieDetail.tsx, Login.tsx, Register.tsx,
      authService.ts, apiClient.ts
    - **Quality gates:** All passed

    - **Branch:** `technical/service-layer-modernization`

- [x] Standardize TMDB paginated response class naming
    - **Outcome:** Renamed misleading "SearchResponse" classes to "PaginatedResponse" pattern for consistency
    - **Renames performed:**
        - `TMDBMovieSearchResponse` → `TMDBPaginatedMovieResponse` (used for discover, search, browse, now-playing, upcoming)
        - `TMDBKeywordSearchResponse` → `TMDBPaginatedKeywordResponse`
        - `TMDBPersonSearchResponse` → `TMDBPaginatedPersonResponse`
    - **Cleanup:** Deleted unused `backend/shared/api_types.py` (deprecated file with no imports)
    - **Files modified:** 8 code files (definition, exports, imports across service layer and tests)
    - **Quality gates:** 408 tests passing, 0 Ruff violations, 0 Pyright errors in modified files

- [x] Centralize test mock creation with DRY helpers
    - **Outcome:** Eliminated test mock duplication across 8 files (97 `.model_dump()` occurrences)
    - **Changes:**
        - Created `apps/movie/tests/test_helpers.py` with 4 core helpers:
            - `create_mock_paginated_response()` - paginated movie lists
            - `create_mock_movie_detail_response()` - movie detail responses
            - `create_mock_error_response()` - HTTP error scenarios with headers
            - `create_mock_tmdb_error_response()` - TMDB-specific error format (discovered during migration)
        - Migrated 8 test files (97 occurrences total):
            - `test_movie_service.py` (7), `test_batch_operations.py` (15 - 8 movie + 7 TMDB errors)
            - `test_movie_api.py` (35), `test_result_filtering.py` (36 - mixed patterns)
            - `test_endpoint_enrichment_integration.py` (4), `integration/api/test_date_constrained_endpoints.py` (6)
        - Removed duplicate 51-line `mock_tmdb_response_factory` fixture from `integration/conftest.py`
    - **Architecture patterns documented:**
        - **Pattern 1** (89 tests): Use helper for valid data (abstracts `.model_dump()`)
        - **Pattern 2** (8 tests): Use raw builder for data quality tests (bypass Pydantic validation for intentionally invalid data)
        - Module docstrings explain when/why to use each pattern
    - **Type safety:** Pydantic `.model_dump()` boundary documented in helper docstrings with `# type: ignore[arg-type]` per strategy-type-safety.md
    - **Benefits:** DRY (single source of truth), eliminates scattered type ignores, documents type boundaries, distinguishes TMDB vs app errors
    - **Quality gates:** 159 tests passing ✅, 0 Ruff violations ✅, 0 Pyright errors ✅

- [x] Validate test data with Pydantic models (eliminate cast() properly)
    - **Outcome:** Test builders return validated Pydantic models, tests use `.model_dump()` for ApiResponse
    - **Changes:**
        - Updated `tmdb_test_builders.py` functions to return Pydantic models (TMDBMovieBase, TMDBMovieDetail, TMDBMovieSearchResponse)
        - Functions renamed for accuracy: `create_raw_tmdb_movie` → `create_tmdb_movie`, `create_movie_detail_dict` → `create_tmdb_movie_detail`
        - All 10 test files updated to call `.model_dump()` when passing to ApiResponse
        - Removed duplicate TMDBMovieDetail TypedDict (already imported from core)
        - Updated integration conftest fixture to use validated models
    - **Architecture validated:** Tests build validated models → dump to dict for ApiResponse → service validates (follows validation boundary pattern from strategy-type-safety.md)
    - **Benefits:**
        - Invalid test data caught at construction (early failure)
        - No cast() needed (data genuinely validated, not type-asserted)
        - Tests use same validation as production code
        - Clearer validation boundaries
    - **Files modified:** 10 test files total
        - Core: `tmdb_test_builders.py`, `integration/conftest.py`
        - Tests: `test_endpoint_enrichment_integration.py`, `test_movie_api.py`, `test_movie_service.py`, `test_batch_operations.py`, `test_movie_service_buffer_deduplication.py`, `test_result_filtering.py`, `integration/api/test_date_constrained_endpoints.py`
    - **Quality gates:** Tests 159/159 ✅, Ruff ✅, Pyright 25 errors (Pydantic `.model_dump()` returns `dict[str, Any]` - acceptable per strategy as external API boundary)
    - **Follow-up task created:** Centralize test mock creation with DRY helpers (in ATOMIC-TASKS.md)

- [x] Extract BaseTMDBService for all service classes
    - **Outcome:** Created shared base class with DI pattern and error handling helper
    - **Changes:**
        - Created `BaseTMDBService` in `base_service.py` with common `__init__` and `_get_validated_response()` method
        - MovieService, KeywordService, PeopleService now inherit from base
        - KeywordService/PeopleService use `self._get_validated_response()` instead of importing
        - Documented why MovieService uses typed validators (needs Pydantic models directly)
    - **Benefits:** DRY foundation, discoverable error handling, consistent patterns across services
    - **Files:** `backend/apps/movie/services/base_service.py`, `movie_service.py`, `keyword_service.py`, `people_service.py`
    - **Quality gates:** Ruff ✅, Pyright ✅, Tests 159/159 ✅

- [x] Update tests for ServiceParams Pydantic refactor
    - **Outcome:** All 159 movie tests pass after signature updates
    - **Changes:**
        - `test_result_filtering.py`: Updated 17 `discover_movies()` calls to use `params=ServiceParams(...)`
        - `test_endpoint_preset_merge.py`: Updated 2 assertions for underscore notation (`release_date_gte` instead of `release_date.gte`)
    - **Files:** `backend/apps/movie/tests/test_result_filtering.py`, `backend/apps/movie/tests/unit/helpers/test_endpoint_preset_merge.py`
    - **Quality gates:** Ruff ✅, Pyright ✅, Tests 159/159 ✅

- [x] Refactor ServiceParams to Pydantic BaseModel
    - **Outcome:** ServiceParams is now a validated Pydantic model with attribute access
    - **Benefits achieved:**
        - Real runtime validation (extra="forbid" catches typos)
        - Attribute access (`params.year_min`) with IDE type awareness
        - Consistent with Django Ninja patterns
        - No more cast() lies or theatrical type safety
    - **Changes:**
        - Created `ServiceParams(BaseModel)` in filtering.py with `get_tmdb_params()` method
        - Updated `to_service_params()` to return validated model
        - Service methods now take `params: ServiceParams | None`
        - API layer passes model directly (no unpacking)
        - Protected keys and presets use underscore notation
        - Moved `MIN_VOTE_COUNT` to filtering.py (broke import cycle)
    - **Files:** `filtering.py`, `schemas.py`, `movie_service.py`, `api.py`, `helpers.py`, `result_filtering.py`, `pagination.py`
    - **Tests:** 140 pass, 19 need signature updates (separate task)

- [x] Extract service error handling helper
    - **Outcome:** Created `get_validated_response()` helper in schema_factories.py
    - **Changes:** Refactored keyword_service.py and people_service.py to use helper
    - **Removed:** ~40 lines of repetitive error handling code across 4 methods
    - **Files:** `backend/apps/movie/services/schema_factories.py`, `keyword_service.py`, `people_service.py`
    - **Tests:** All 20 keyword/people service tests pass

- [x] Declarative derived params extraction in schemas.py
    - **Outcome:** Created `DERIVED_PARAM_TRANSFORMS` mapping in filtering.py with `cast` for type safety
    - **Changes:** Reduced `_apply_derived_params()` from 10 repetitive lines to 3-line loop over mapping
    - **Removed type ignores:** Used `cast()` instead of `type: ignore` per type safety strategy
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`
    - **Tests:** All 159 movie tests pass

- [x] Consolidate redundant parameter mappings + Rename FILTER_MAPPING + Add TypedDict + Simplify mapping flow
    - **Outcome:** Single source of truth in `filtering.py` with `PARAM_MAPPING`, `HTTP_TO_SERVICE_MAPPING`, and `ServiceParams` TypedDict
    - **Changes:** Schema imports and uses mappings from filtering.py, removed underscore/dot duplication, standardized on dot notation (e.g. `release_year.gte`) for TMDB consistency
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`, `backend/apps/movie/tests/test_movie_service.py`
    - **Note:** `type: ignore[arg-type]` remains for kwargs unpacking - follow-up task created for Unpack refactor

- [x] Research accessibility guidelines for input field focus rings
    - **Outcome:** CSS `:focus-visible` spec always matches on text inputs (by design), not browser bug
    - **Decision:** Use border-only focus indicators for text inputs (matches GitHub/Google/Linear)
    - **Pattern:** Border color change to `tertiary` on focus (no outline ring needed)
    - **Special case:** Select dropdowns get keyboard-only rings (button-like components)
    - **WCAG compliance:** Meets 2.4.7 (Focus Visible) and 2.4.13 (Focus Appearance)
    - **Documentation:** ADR-015, ThemeDebug reference implementations updated
    - **Files updated:** UIElementTokensSection.tsx, FormControlsSection.tsx (Input/Textarea/NumberInput/Select)
