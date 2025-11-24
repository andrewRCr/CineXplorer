# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete, move to `completed-atomic-{quarter}.md` in `reference/archive/` (insert at top)
3. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

**Referencing completed work:** "see {task name} in `completed-atomic-2025-q4.md`"
    - Quick access: [Completed Atomic Tasks - 2025 Q4](../reference/archive/2025-q4/completed-atomic-2025-q4.md)

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- Type Safety -->

- [ ] Validate test data with Pydantic models (eliminate cast() properly)
    - **Context**: Originally attempted generic ApiResponse[T], but deep analysis revealed this violated
      the validation boundary pattern from strategy-type-safety.md. ApiResponse should hold unvalidated
      data; type safety comes from Pydantic validation, not generic parameters.
    - **Real Problem**: Test fixtures use `cast(TMDBResponseData, dict)` because test builders return
      raw dicts instead of validated Pydantic models.
    - **Proper Solution**: Update test builders to return Pydantic models, then dump to dict for ApiResponse.
      This validates test data at construction (catches invalid test data early) and follows the strategy's
      validation boundary pattern.
    - **Files to modify**:
        - `backend/apps/movie/tests/tmdb_test_builders.py` - Return Pydantic models, not dicts
        - `backend/apps/movie/tests/integration/conftest.py` - Use .model_dump() on validated models
        - Related test files that construct mock TMDB data
    - **Benefits**:
        - ✅ No cast() needed (data is actually validated)
        - ✅ Tests use same validation as production
        - ✅ Invalid test data caught at construction, not runtime
        - ✅ Clearer validation boundaries (follows strategy pattern)
        - ✅ ApiResponse stays honest (holds unvalidated dicts, not lying via generics)

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
