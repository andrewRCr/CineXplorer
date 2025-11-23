# Completed Atomic Tasks - 2025 Q4

Permanent record of completed atomic tasks. New entries are added at the top (reverse chronological).

Reference format: "see `completed-atomic-2025-q4.md`" or "see {task name} in `completed-atomic-2025-q4.md`"

---

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
