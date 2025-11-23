# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete, mark `[x]` and move to "Completed (This Week)"
3. During weekly review, delete all completed items
4. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- Type safety & DRY cleanup tasks - ordered by dependencies -->

- [ ] Extract service error handling helper
    - **Problem:** Same 10-line error handling pattern repeated in every service method
    - **Pattern:** `if not response.is_success()` → `handle_error` → `get_json_data()` → `if not result` → `raise`
    - **Fix:** Create `get_validated_response()` helper that wraps the pattern
    - **Benefits:** DRY, consistent error handling, easier to modify logging
    - **Files:** `backend/apps/movie/services/` (all service files)
    - **Estimate:** ~30 min
    - **Note:** Do before base class task

- [ ] Refactor service methods to use Unpack[ServiceParams]
    - **Problem:** `discover_movies()` has untyped `**filters` kwargs - loses type info, requires `type: ignore` at
    call sites
    - **Fix:** Change signature to `**kwargs: Unpack[ServiceParams]` for full type safety
    - **Benefits:** IDE autocomplete, type checking at call sites, no `type: ignore`, self-documenting
    - **Trade-off:** Method body accesses params via `kwargs.get()` instead of explicit args
    - **Files:** `backend/apps/movie/services/movie_service.py`, `backend/apps/movie/api.py`
    - **Estimate:** ~30-45 min
    - **Note:** Do before base class task

- [ ] Extract BaseTMDBService for all service classes
    - **Problem:** MovieService, KeywordService, PeopleService duplicate DI pattern, error handling, logging
    - **Fix:** Create `BaseTMDBService` with shared `__init__`, error handling helper, logging setup
    - **Approach:** All three services extend base; Keyword/People are simple, Movie has complex methods
    - **Benefits:** DRY foundation, consistent patterns across all services, MovieService shares base
    - **Files:** All files in `backend/apps/movie/services/`
    - **Estimate:** ~45 min
    - **Depends on:** Error handling helper, Unpack refactor

- [ ] Add Unpack typing to TMDBApiClient methods
    - **Problem:** Multiple methods use `**kwargs: object` losing all type info
    - **Fix:** Create TypedDict for TMDB API params, use Unpack for type-safe kwargs
    - **Methods:** `discover_movies`, `search_movies`, `get_popular_movies`, etc.
    - **Files:** `backend/apps/core/services/tmdb_api_client.py`
    - **Estimate:** ~45 min
    - **Priority:** Lower - internal infrastructure

- [ ] Investigate login session loss during testing
    - Context: session appeared lost during theme system visual testing (no explicit logout)
    - Test session persistence during normal navigation
    - Test session across browser refreshes
    - Test session timeout behavior
    - Document reproduction steps if found, or close as testing artifact

- [ ] Simplify sort options UI
    - Add "Release Date (Oldest)" to minimal sort dropdown
    - Increase minimal dropdown width to fit longest label
    - Remove advanced sort dropdown entirely (confusing/meaningless results for reverse sorts)
    - Center release year and rating inputs in advanced filters row to visually balance
    - Rationale: Reverse sorts (popularity.asc, vote_average.asc, title Z-A) produce meaningless data (untracked/unrated
    movies, Unicode sorting issues)

## Completed (This Week)

<!-- Move completed tasks here (marked [x]); delete all during weekly review  -->

- [x] Declarative derived params extraction in schemas.py
    - **Outcome:** Created `DERIVED_PARAM_TRANSFORMS` mapping in filtering.py with `cast` for type safety
    - **Changes:** Reduced `_apply_derived_params()` from 10 repetitive lines to 3-line loop over mapping
    - **Removed type ignores:** Used `cast()` instead of `type: ignore` per type safety strategy
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`
    - **Tests:** All 159 movie tests pass

- [x] Consolidate redundant parameter mappings + Rename FILTER_MAPPING + Add TypedDict + Simplify mapping flow
    - **Outcome:** Single source of truth in `filtering.py` with `PARAM_MAPPING`, `HTTP_TO_SERVICE_MAPPING`,
    and `ServiceParams` TypedDict
    - **Changes:** Schema imports and uses mappings from filtering.py, removed underscore/dot duplication, standardized
    on dot notation (e.g. `release_year.gte`) for TMDB consistency
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
