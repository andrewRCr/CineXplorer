# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete:
   - Mark `[x]` and add completion notes
   - Move to `completed-atomic-{quarter}.md` in `reference/archive/` (insert at top)
   - Add branch line after completion notes (with empty line separator):

     ```markdown
     - [x] Task description
         - **Outcome:** What was done, key changes
         - **Files:** list of modified files

         - **Branch:** `feature/feature-name` or `technical/tech-name`
     ```

3. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

**Referencing completed work:** "see {task name} in `completed-atomic-2025-q4.md`"
    - Quick access: [Completed Atomic Tasks - 2025 Q4](../reference/archive/2025-q4/completed-atomic-2025-q4.md)

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- UI/UX Fixes -->

- [ ] Revert MovieUserScore badge colors to traffic light scheme
    - Change: `≥7.5` success (green), `5.0-7.4` warning (yellow), `<5.0` error (red)
    - Current: success/info/warning doesn't communicate rating quality intuitively
    - Files: `frontend/src/components/movie/MovieUserScore.tsx`
    - Update tests if variant names change
    - Rationale: Traffic light is universally understood for ratings; not implying subjective judgment,
      just visual encoding of the community score number

- [ ] Evaluate: Hide or alter MovieUserScore badge for movies with no/insufficient votes
    - **Problem:** Unreleased movies and movies with few votes display "0.0" or low scores that are
      misleading - a 0.0 implies a terrible rating when it's actually null/no data
    - **Considerations:**
        - Unreleased movies: Should never show a rating badge (no votes possible yet)
        - Low vote count: TMDB has `vote_count` - should we require a minimum threshold?
        - Alternative displays: "Not yet rated", "NR", hide badge entirely, or show vote count context
        - MovieCard vs MovieDetail: May want different thresholds (card = stricter, detail = more lenient)
    - **Research needed:**
        - What does TMDB return for `vote_average` when `vote_count` is 0?
        - What thresholds do other platforms use (Letterboxd, IMDb, Rotten Tomatoes)?
        - Current MovieUserScore component structure and where rating data comes from
    - **Status:** Not committed - needs design decision before implementation
    - **Files:** `frontend/src/components/movie/MovieUserScore.tsx`, `MovieCard.tsx`, `MovieDetail.tsx`

- [ ] Fix UserMovieData icon button coloring on MovieCard
    - Bug: All icon buttons appear same color regardless of state
    - Expected: Neutral when flag=false, tertiary/highlighted when flag=true
    - Approach: Create recipe variant or compound variant for stateful ghost buttons
    - Files: `frontend/src/theme/recipes/` (new or existing), `frontend/src/components/movie/MovieCard.tsx`
    - Pattern will be reused in MovieDetail and other locations

<!-- Miscellaneous -->

- [ ] Investigate login session loss during testing
    - Context: session appeared lost during theme system visual testing (no explicit logout)
    - Test session persistence during normal navigation
    - Test session across browser refreshes
    - Test session timeout behavior
    - Document reproduction steps if found, or close as testing artifact

- [ ] Investigate console.log capture to frontend log file
    - **Context:** QUICK-REFERENCE.md mentions console logs captured to `backend/logs/frontend/.console-logs.txt`
    - **Observation:** Log file exists but only contains structured logger output (`logger.debug()`, etc.)
    - **Problem:** Raw `console.log()` calls aren't being captured - only structured logger calls appear
    - **Question:** Was console.log capture ever implemented, or is QUICK-REFERENCE documentation inaccurate?
    - **If broken:** Implement console.log interception to write to the same log file
    - **If never implemented:** Update QUICK-REFERENCE to accurately reflect current behavior
    - **Files to investigate:**
        - `frontend/src/services/logger.ts` - check for console interception
        - `backend/logs/frontend/` - examine log capture mechanism
        - `.arc/reference/QUICK-REFERENCE.md` - verify/update documentation

- [ ] Investigate pytest-cov coverage measurement issue (external research)
    - Observed: `CoverageWarning: Module apps.movie was previously imported, but not measured`
    - Symptom: Some modules show 0% coverage (helpers.py, schemas.py) while others show 100% (api.py)
      despite tests clearly exercising all modules
    - Likely cause: Module import timing - modules imported during test collection/fixture setup
      before coverage measurement starts
    - Research: pytest-cov documentation, Django-specific coverage patterns, potential fixes
    - Goal: Either fix configuration or document as known limitation with workaround
    - Context: Discovered during endpoint consolidation quality gates (Phase 6.1.b)

<!-- Type System Cleanup -->
<!-- ✅ Verified 2024-12-17: Both tasks still accurate and ready to execute -->

- [ ] Remove `@shared/api-types.ts` and migrate remaining usages to OpenAPI-generated types
    - **Context:** Discovered during infinite scroll type cleanup. The `@shared` directory was meant
      for frontend/backend type sync, but:
        - Backend already migrated to Pydantic models (Task 5.6.8)
        - Movie types are now auto-generated from OpenAPI → `@/@types/movie.d.ts`
        - `@shared/api-types.ts` is manually maintained and **outdated** (missing `genre_ids`, etc.)
    - **Current usages of `@shared` movie types (3 files):**
        - `frontend/src/hooks/useMovieDetail.ts` - imports `Movie`
        - `frontend/src/pages/movie/MovieDetail.tsx` - imports `Movie, Genre, CastMember, CrewMember,
        ProductionCompany, SpokenLanguage`
        - `frontend/src/pages/movie/__tests__/MovieDetail.test.tsx` - imports `Movie` (via mock)
    - **Migration:**
        1. Update `useMovieDetail.ts`: import `MovieDetail` from `@/types/movie`
        2. Update `MovieDetail.tsx`: import from `@/types/movie` (all types available there)
        3. Update `MovieDetail.test.tsx`: use `createMockMovieDetail` from updated mocks
        4. Delete `shared/api-types.ts`
    - **Files:**
        - `frontend/src/hooks/useMovieDetail.ts`
        - `frontend/src/pages/movie/MovieDetail.tsx`
        - `frontend/src/pages/movie/__tests__/MovieDetail.test.tsx`
        - `shared/api-types.ts` (delete)
    - **Priority:** Medium - prevents type drift, completes type system cleanup
    - **Effort:** ~30 minutes
    - **Depends on:** None (can be done anytime)

- [ ] Auto-generate error codes from backend Pydantic Enum → OpenAPI → TypeScript
    - **Context:** Final step to eliminate `shared/` directory entirely. Currently error codes are
      manually duplicated between `backend/shared/error_codes.py` and `shared/error-codes.ts`.
    - **Current state:**
        - `backend/shared/error_codes.py` - Python `ErrorCodes` class with string constants
        - `shared/error-codes.ts` - TypeScript duplicate with same constants + category mapping
        - `frontend/src/pages/user/Login.tsx` - only frontend consumer (imports `ERROR_CODES`)
    - **Implementation approach:**
        1. Create Pydantic `ErrorCode` Enum in backend API schemas (e.g., `apps/core/schemas/errors.py`)
        2. Expose enum in OpenAPI spec (used in error response schemas)
        3. Run `openapi-typescript` - generates TypeScript enum automatically
        4. Create `frontend/src/@types/errors.d.ts` with re-exports and helper functions
        5. Update `Login.tsx` to import from new location
        6. Delete `shared/error-codes.ts` and `shared/error_codes.py`
        7. Delete `shared/` directory entirely (api-types.ts removed by previous task)
    - **Benefits:**
        - Single source of truth (backend Pydantic Enum)
        - Automatic sync on `npm run generate-types`
        - Type-safe error handling (enum vs string constants)
        - No manual maintenance of duplicate files
    - **Files:**
        - New: `backend/apps/core/schemas/errors.py` (or similar location)
        - New: `frontend/src/@types/errors.d.ts`
        - Update: `frontend/src/pages/user/Login.tsx`
        - Delete: `shared/error-codes.ts`, `shared/error_codes.py`, `shared/index.ts`
        - Delete: `shared/` directory, `backend/shared/` directory
    - **Priority:** Low - current approach works, this is cleanup
    - **Effort:** ~1-2 hours (backend schema + frontend migration + testing)
    - **Depends on:** "Remove @shared/api-types.ts" task (do that first)

<!-- Code Quality / Refactoring -->
<!-- ✅ Re-evaluated 2025-12-17 post-infinite-scroll-migration: Updated subtask status below -->

- [ ] Refactor Movie Collection URL/State Hooks for Clarity and Separation of Concerns
    - **Context:** Discovered during Task 3.7.b (tasks-pagination-buffer-tracking.md) - hooks are
      functional but messy, hard to parse, mixed responsibilities
    - **Goal:** Clean separation, improved readability, proper DRY
    - **Scope:** 2 hooks + supporting utilities (hooks moved to `hooks/movie/`)
    - **Status:** Ready to execute - infinite scroll migration complete

    - [ ] **R.1 Fix "search" terminology confusion in comments/docs**
        - Problem: "search" used for both URL query strings (browser API) and movie search feature
        - Files: `browseUrlSync.ts`, `searchUrlSync.ts`, `useMovieCollectionUrl.ts`
        - Change: Use "query string" or "URL params" instead of "search string/params" in comments
        - Small effort, big clarity win

    - [ ] **R.2 Extract `deepEqual` utility from useMovieCollectionUrl**
        - Currently: Generic comparison function at lines 8-30 in `useMovieCollectionUrl.ts`
        - Move to: `utilities/deepEqual.ts` or use `fast-deep-equal` package
        - Update imports in `useMovieCollectionUrl.ts`

    - [ ] **R.3 Extract sessionStorage utilities from useMovieCollectionState**
        - Currently: 4 module-level functions (lines 17-83) for advanced panel override tracking
        - Extract to: `utilities/advancedPanelOverride.ts`
        - Functions: `getAdvancedFilterHash`, `hasUserOverride`, `setUserOverride`, `clearUserOverride`
        - Reduces file length by ~65 lines before hook even starts

    - [ ] **R.4 Move `hasAdvancedFilterValues` to browseParamUtils.ts**
        - Currently: Exported from `useMovieCollectionState.ts` (lines 119-145)
        - Better home: `utilities/browseParamUtils.ts` with other param utilities
        - ✅ Year logic duplication RESOLVED: Both functions now use `yearFilterAnalysis.ts` utility
        - Remaining work: Just move the function to browseParamUtils.ts

    - [x] **R.5 Audit `enableUrlSync=false` code path** *(decision: KEEP)*
        - Finding: Used **only in tests** (18 occurrences), never in production code
        - Decision: Keep for test isolation flexibility - complexity cost is low
        - Tests use local mode to avoid URL mocking complexity
        - No action needed

    - [ ] **R.6 Use `generateBrowseUrl()` in handleBrowseParamsChange**
        - Currently: `handleBrowseParamsChange` builds URL inline with URLSearchParams
        - We have: `browseUrlSync.ts` with `generateBrowseUrl()` for this exact purpose
        - Benefit: Consistency with URL sync pattern, DRY

    - [ ] **R.7 Fix language sort reset effect bug**
        - Currently: Effect at lines 216-222 calls `urlHandleBrowseParamsChange` directly
        - Bug: Ignores `enableUrlSync` flag - would try URL update even in local mode
        - Impact: Low (local mode only used in tests, tests don't exercise this path)
        - Fix: Use `onBrowseParamsChange` (the unified handler) instead

    - [ ] **R.8 Simplify derived state in useMovieCollectionState**
        - Currently: `derivedState` wrapper useMemo at lines 277-282 adds no value
        - Individual useMemos already provide memoization
        - Fix: Remove wrapper, spread values directly in return statement

    - [ ] **R.9 (Optional, larger scope) Consider hook decomposition**
        - Defer decision until R.1-R.8 complete - may not be needed
        - Hooks are cleaner post-migration; evaluate if further splitting warranted

    - **Files:**
        - `frontend/src/hooks/movie/useMovieCollectionUrl.ts`
        - `frontend/src/hooks/movie/useMovieCollectionState.ts`
        - `frontend/src/utilities/browseUrlSync.ts`
        - `frontend/src/utilities/searchUrlSync.ts`
        - `frontend/src/utilities/browseParamUtils.ts`
        - New: `frontend/src/utilities/deepEqual.ts` (or package)
        - New: `frontend/src/utilities/advancedPanelOverride.ts`

    - **Priority:** Low (functional, not blocking)
    - **Effort:** Medium (~2 hours for R.1-R.8, individually small)
    - **Risk:** Low (refactor with existing 722 frontend tests)

<!-- Data Quality -->

- [ ] Examine the following movies for production company patterns (i.e., do any of them produce 90%+ 'adult' content?)
for potential bulk blacklisting; if not found, blacklist individually (movies are mislabeled as non-adult on TMDB):
    - 280460, 50633, 1113566, 264865, 199214, 329872, 406167, 222270, 264975, 1241742, 89632, 28325, 134451, 318947,
    458353, 40348, 397298, 29194, 460229, 97697, 1069286, 28555, 33790, 315294, 57267, 45042, 196013,  29926, 333941,
    433111, 141585, 151182, 715394, 505039, 474531, 331250, 278954, 424626, 225450, 564823,259903,110705,220688,127744,64512,154910,105428,393249,423468,436551,285553,284143,70479,295389,70638,28809,90787,36888,220873,420200,265255,69403,265186,306107,265181,860521,424829,40132,197644,598691,5913,410385,496032,371748,281197,135003,797816,272847,415727,311917,264870,264868,544082,899338,194789,36887,220897,193458,183584,485736,259265,124389,265255,36886
