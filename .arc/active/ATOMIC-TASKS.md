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

- [ ] Simplify sort options UI
    - Add "Release Date (Oldest)" to minimal sort dropdown
    - Increase minimal dropdown width to fit longest label
    - Remove advanced sort dropdown entirely (confusing/meaningless results for reverse sorts)
    - Center release year and rating inputs in advanced filters row to visually balance
    - Rationale: Reverse sorts (popularity.asc, vote_average.asc, title Z-A) produce meaningless data (untracked/unrated
    movies, Unicode sorting issues)

- [ ] Consolidate redundant parameter mappings
    - **Problem:** Two places define mappings that must stay in sync - `schemas.py to_service_params` and `filtering.py FILTER_MAPPING`
    - **Risk:** Gaps like `vote_count_gte` missing from one causes silent failures
    - **Fix:** Create single source of truth in `filtering.py`, have schema reference it
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`
    - **Estimate:** ~1-2 hours

- [ ] Rename FILTER_MAPPING to PARAM_MAPPING
    - **Problem:** `FILTER_MAPPING` contains `sort_by` which isn't a filter - confusing when searching for sort logic
    - **Fix:** Rename to `PARAM_MAPPING` in `filtering.py`, update frontend `movieFilterMapper.ts` to `paramMapper`
    - **Files:** `backend/apps/movie/services/filtering.py`, `frontend/src/utilities/movieFilterMapper.ts`
    - **Estimate:** ~30 min

- [ ] Add TypedDict for service params
    - **Problem:** `to_service_params()` returns generic dict, `discover_movies()` expects typed params - requires
    `type: ignore`
    - **Fix:** Create `ServiceParams` TypedDict with proper types, use in return annotation
    - **Alternative:** Extract known params (year_min, rating_min, etc.) explicitly before `**kwargs`
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/api.py`
    - **Estimate:** ~1 hour

- [ ] Simplify schema/service mapping flow
    - **Problem:** Multiple mapping layers: HTTP → Schema → Service → filtering.py → TMDB
    - **Fix:** Schema just validates/extracts, single authoritative mapping in service layer
    - **Approach:** Move all TMDB param name knowledge to `filtering.py`, schema passes through field names unchanged
    - **Files:** `backend/apps/movie/schemas.py`, `backend/apps/movie/services/filtering.py`, `backend/apps/movie/services/movie_service.py`
    - **Estimate:** ~2-3 hours
    - **Note:** Consider doing after "Consolidate redundant parameter mappings" task

- [ ] Investigate login session loss during testing
    - Context: ession appeared lost during theme system visual testing (no explicit logout)
    - Test session persistence during normal navigation
    - Test session across browser refreshes
    - Test session timeout behavior
    - Document reproduction steps if found, or close as testing artifact

## Completed (This Week)

<!-- Move completed tasks here (marked [x]); delete all during weekly review  -->

- [x] Research accessibility guidelines for input field focus rings
    - **Outcome:** CSS `:focus-visible` spec always matches on text inputs (by design), not browser bug
    - **Decision:** Use border-only focus indicators for text inputs (matches GitHub/Google/Linear)
    - **Pattern:** Border color change to `tertiary` on focus (no outline ring needed)
    - **Special case:** Select dropdowns get keyboard-only rings (button-like components)
    - **WCAG compliance:** Meets 2.4.7 (Focus Visible) and 2.4.13 (Focus Appearance)
    - **Documentation:** ADR-015, ThemeDebug reference implementations updated
    - **Files updated:** UIElementTokensSection.tsx, FormControlsSection.tsx (Input/Textarea/NumberInput/Select)
