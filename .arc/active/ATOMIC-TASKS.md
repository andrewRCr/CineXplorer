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

- [ ] Investigate pytest-cov coverage measurement issue (external research)
    - Observed: `CoverageWarning: Module apps.movie was previously imported, but not measured`
    - Symptom: Some modules show 0% coverage (helpers.py, schemas.py) while others show 100% (api.py)
      despite tests clearly exercising all modules
    - Likely cause: Module import timing - modules imported during test collection/fixture setup
      before coverage measurement starts
    - Research: pytest-cov documentation, Django-specific coverage patterns, potential fixes
    - Goal: Either fix configuration or document as known limitation with workaround
    - Context: Discovered during endpoint consolidation quality gates (Phase 6.1.b)

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
