# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete, move to `completed-atomic-{quarter}.md` in `reference/archive/` (insert at top)
3. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

**Referencing completed work:** "see {task name} in `completed-atomic-2025-q4.md`"

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- Type safety & DRY cleanup tasks - ordered by dependencies -->

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

<!-- Miscellaneous -->

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
