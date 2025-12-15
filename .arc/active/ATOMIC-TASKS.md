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

<!-- CRITICAL - App-Breaking Bugs -->

- [ ] **CRITICAL: Fix deduplication accumulation causing premature end-of-results**
    - **Priority:** App-breaking - trumps all other work
    - **Symptom:** Browsing with filters (e.g., NC-17 certification) hits "end of results" after ~12 pages
      (~220 movies) despite TMDB having 208,984+ results. User sees "loading more" indicator that eventually
      stops, results appear truncated.
    - **Root Cause Analysis (completed):**
        - Session-based deduplication tracker (Redis) accumulates ALL returned movie IDs across pagination
        - Each page fetch adds 20 IDs to Redis set for that filter combination
        - By page 12: Redis has 200+ IDs stored
        - When fetching page 13+, most TMDB results are filtered as "already returned"
        - Buffer mechanism (5 page limit) exhausts trying to find 20 "new" movies
        - Returns fewer than 20 results, eventually 0
        - **This is working as designed for infinite scroll** (prevents showing same movie twice), BUT:
            - Causes progressive page sparsity
            - Eventually causes empty pages / premature end-of-results
    - **Key Files:**
        - `backend/apps/movie/services/deduplication_tracker.py` - Session tracking logic
        - `backend/apps/movie/services/pipelines/paginated.py` - Buffer + dedup integration (lines 74-145)
        - Session clears only at `page=1 AND tmdb_page_start=None` (line 201)
    - **Investigation Context:**
        - API tests show NC-17 returns full pages through page 450+ when fetched fresh
        - User's "353 total results" mystery: API returns `total_results: 208984` from TMDB, so frontend
          may be calculating differently or showing cached/stale data (secondary issue, investigate after)
    - **Fix Options to Evaluate:**
        1. **Disable cross-page dedup for sequential pagination** - Different behavior for infinite vs sequential
        2. **Time-based session expiry** - Clear dedup set periodically (may cause mid-scroll duplicates)
        3. **Sliding window dedup** - Only track last N pages worth of IDs instead of all
        4. **Accept sparser pages** - Increase buffer limit (currently 5) to compensate
        5. **Rethink dedup strategy** - Is cross-page dedup actually needed? TMDB may not return many duplicates
    - **Related Issue (secondary):** Frontend showing "353 results" instead of "10,000+ results" for NC-17
        - Needs investigation: Is this stale cache, different calculation, or actual bug?
        - Address after fixing dedup accumulation issue
    - **Test Reproduction:**
        - Browse with NC-17 certification filter (default sort)
        - Scroll/paginate through results
        - Observe results becoming sparser, eventually empty
        - Compare: Fresh API call `curl -sk 'https://localhost:8000/api/movies/browse?certification=NC-17&tmdb_page_start=100'`
          returns 20 results (proving TMDB has data)
    - **Effort:** Medium-High (requires design decision, implementation, testing)
    - **Context:** Discovered during Phase 4.6 A/B evaluation prep (tasks-infinite-scroll-migration.md)

<!-- Documentation -->

- [ ] Create `strategy-data-quality.md` - Document TMDB data quality mechanisms
    - **Context:** Extracted from `tasks-filter-integration-testing.md` Phase 4.2 (documentation scope change)
    - **Content to cover:**
        - Two-pass filtering architecture (TMDB API primary, backend second-pass hygiene)
        - VoteCountPolicy: Tiered thresholds (STRICT/MODERATE/BYPASS) and when each applies
        - CompletenessPolicy: Poster and title requirements
        - Historical validation: EARLIEST_VALID_RELEASE_YEAR (1888)
        - Frontend timezone-safe date parsing pattern
        - TMDB API quirks and known bugs (reference research doc)
        - Parameter flow: Frontend filters → API params → service params → TMDB query + backend filter
    - **Location:** `.arc/reference/strategies/project/strategy-data-quality.md`
    - **Priority:** Low - code is well-documented, this is for discoverability
    - **Effort:** ~1-2 hours

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

- [ ] Refactor Movie Collection URL/State Hooks for Clarity and Separation of Concerns
    - **Context:** Discovered during Task 3.7.b (tasks-pagination-buffer-tracking.md) - hooks are
      functional but messy, hard to parse, mixed responsibilities
    - **Goal:** Clean separation, improved readability, proper DRY
    - **Scope:** 3 hooks + supporting utilities
    - **⚠️ Deferred until:** After `tasks-infinite-scroll-migration.md` Phase 4 (Integration) completes.
      Hooks will be significantly modified during infinite scroll integration - refactoring now would
      be wasted effort. Re-evaluate after integration: some items (R.1-R.4, R.8) likely still applicable,
      others (R.5, R.7, R.9) may be addressed or obsoleted by the migration.

    - [ ] **R.1 Fix "search" terminology confusion in comments/docs**
        - Problem: "search" used for both URL query strings (browser API) and movie search feature
        - Files: `browseUrlSync.ts`, `searchUrlSync.ts`, `useMovieCollectionUrl.tsx`
        - Change: Use "query string" or "URL params" instead of "search string/params" in comments
        - Small effort, big clarity win

    - [ ] **R.2 Extract `deepEqual` utility from useMovieCollectionUrl**
        - Currently: Generic comparison function buried at top of hook file (lines 9-33)
        - Move to: `utilities/deepEqual.ts` or use `fast-deep-equal` package
        - Update imports in `useMovieCollectionUrl.tsx`

    - [ ] **R.3 Extract sessionStorage utilities from useMovieCollectionState**
        - Currently: 4 module-level functions (lines 16-87) for advanced panel override tracking
        - Extract to: `utilities/advancedPanelOverride.ts`
        - Functions: `getAdvancedFilterHash`, `hasUserOverride`, `setUserOverride`, `clearUserOverride`
        - Reduces file length by ~70 lines before hook even starts

    - [ ] **R.4 Move `hasAdvancedFilterValues` to browseParamUtils.ts**
        - Currently: Exported from `useMovieCollectionState.tsx` (lines 127-165)
        - Better home: `utilities/browseParamUtils.ts` with other param utilities
        - Note: Duplicates some decade detection logic with `getAdvancedFilterHash` - consolidate
        - Update imports in `useMovieCollectionState.tsx`, `BrowseControlsSection.tsx` (if used)

    - [ ] **R.5 Audit and remove `enableUrlSync=false` code path if unused**
        - Currently: Dual-mode complexity with URL-synced vs local state
        - Check: Is non-URL-synced mode actually used anywhere?
        - If unused: Remove `localBrowseParams`, `localCurrentPage`, `localTmdbPageStart`, ternaries
        - If used: Document where and why
        - Estimated reduction: ~30 lines + significant complexity

    - [ ] **R.6 Use `generateBrowseUrl()` in handleBrowseParamsChange**
        - Currently: `handleBrowseParamsChange` (lines 101-136) builds URL inline with URLSearchParams
        - We have: `browseUrlSync.ts` with `generateBrowseUrl()` for this exact purpose
        - Benefit: Consistency with URL sync pattern, DRY

    - [ ] **R.7 Fix language sort reset effect bug**
        - Currently: Effect at line 237-241 calls `urlHandleBrowseParamsChange` directly
        - Bug: Ignores `enableUrlSync` flag - would try URL update even in local mode
        - Fix: Use `onBrowseParamsChange` (the unified handler) instead

    - [ ] **R.8 Simplify derived state in useMovieCollectionState**
        - Currently: Individual useMemos for `hasActiveFilters`, etc., then wrapped in `derivedState` useMemo
        - The wrapper useMemo (lines 305-310) adds no value
        - Remove wrapper, spread individual values directly in return

    - [ ] **R.9 (Optional, larger scope) Consider hook decomposition**
        - If after R.1-R.8 hooks are still complex, consider splitting:
            - `useBrowseParamsUrl` - browse params ↔ URL sync only
            - `usePaginationUrl` - pagination ↔ URL sync only
            - `useRouteChangeReset` - route transition detection
            - `useMovieCollectionUrl` becomes thin composer
        - **Defer decision** until R.1-R.8 complete - may not be needed

    - **Files:**
        - `frontend/src/components/movie/collection/useMovieCollectionUrl.tsx`
        - `frontend/src/components/movie/collection/useMovieCollectionState.tsx`
        - `frontend/src/utilities/browseUrlSync.ts`
        - `frontend/src/utilities/searchUrlSync.ts`
        - `frontend/src/utilities/browseParamUtils.ts`
        - New: `frontend/src/utilities/deepEqual.ts` (or package)
        - New: `frontend/src/utilities/advancedPanelOverride.ts`

    - **Priority:** Low (functional, not blocking)
    - **Effort:** Medium (R.1-R.8 individually small, R.9 larger if needed)
    - **Risk:** Low (refactor with existing test coverage)

<!-- Navigation/Routing -->

- [ ] Extract `BackToCollectionButton` shared component
    - **Context:** `MovieDetail.tsx:58-93` has inline BackButton with comment noting extraction
      opportunity if PersonDetail needs similar functionality
    - **Current implementation:**
        - Reads `from` and filter params from URL
        - Constructs back URL based on source route (search, browse, browse/*)
        - Preserves all query params for filter state
    - **Implementation:**
        1. Create `frontend/src/components/navigation/BackToCollectionButton.tsx`
        2. Props: `from: string`, `params: Record<string, string>`, optional `label?: string`
        3. Move URL construction logic from MovieDetail
        4. Update MovieDetail to use shared component
        5. (Future) Use in PersonDetail when that page is built
    - **Files:** New component, `MovieDetail.tsx`
    - **Defer until:** PersonDetail is being built (avoid premature abstraction)

<!-- Data Quality -->

- [ ] Examine the following movies for production company patterns (i.e., do any of them produce 90%+ 'adult' content?)
for potential bulk blacklisting; if not found, blacklist individually (movies are mislabeled as non-adult on TMDB):
    - 280460, 50633, 1113566, 264865, 199214, 329872, 406167, 222270, 264975, 1241742, 89632, 28325, 134451, 318947,
    458353, 40348, 397298, 29194, 460229, 97697, 1069286, 28555, 33790, 315294, 57267, 45042, 196013,  29926, 333941,
    433111, 141585, 151182, 715394, 505039, 474531, 331250, 278954, 424626
