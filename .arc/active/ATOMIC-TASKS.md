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

- [ ] Centralize test mock creation with DRY helpers
    - **Context**: Test mocking duplicated across 13+ files. Each test manually creates Pydantic models, calls
      `.model_dump()`, wraps in ApiResponse. Recent validation work exposed this - had to manually fix pattern
      in every test file. Also need to document Pydantic `.model_dump()` type boundary (returns `dict[str, Any]`
      causing 25 Pyright errors).
    - **Problem**: Not DRY - changes to mock pattern require touching every test. Type errors from Pydantic's
      `.model_dump()` scattered across tests.
    - **Solution**: Centralized helpers handle validation→serialization→ApiResponse boundary in one place with
      proper type annotations and `# type: ignore[arg-type]` documentation.
    - **Subtasks:**
        - [ ] 1. Create centralized mock helper functions in `apps/movie/tests/test_helpers.py`
            - [ ] 1.1. `create_mock_paginated_response()` - handles list[TMDBMovieBase] → ApiResponse
            - [ ] 1.2. `create_mock_movie_detail_response()` - handles TMDBMovieDetail → ApiResponse
            - [ ] 1.3. `create_mock_error_response()` - handles error scenarios
            - [ ] 1.4. Document Pydantic `.model_dump()` type boundary with inline comments
        - [ ] 2. Update test files to use helpers (~13 files, group by similarity)
            - [ ] 2.1. Service layer tests (`test_movie_service.py`, `test_batch_operations.py`)
            - [ ] 2.2. API integration tests (`test_movie_api.py`, `test_endpoint_enrichment_integration.py`)
            - [ ] 2.3. Filtering/pagination tests (`test_result_filtering.py`, `test_movie_service_buffer_deduplication.py`)
            - [ ] 2.4. Integration conftest (`integration/conftest.py`)
            - [ ] 2.5. Remaining test files using manual mock construction
        - [ ] 3. Verify and document
            - [ ] 3.1. Run quality gates (pytest, pyright, ruff) - expect 0 Pyright errors, 159 tests passing
            - [ ] 3.2. Update strategy-type-safety.md if needed (document Pydantic boundary pattern)
    - **Test scenarios to support**: Success/error responses, partial failures, rate limiting, empty responses,
      multi-page scenarios, side effects (different responses per call)
    - **Acceptance criteria**: All tests use helpers, no manual `.model_dump()` in tests, 0 Pyright errors,
      all 159 tests pass
    - **Files to update**: ~13 test files + 1 new helper module
    - **Estimated effort**: 2-3 hours (systematic migration)

- [ ] Rename TMDBMovieSearchResponse to TMDBPaginatedMovieResponse
    - **Context**: Current name is misleading - used for ALL paginated movie endpoints (discover, search,
      now-playing, upcoming, browse), not just search
    - **Files to update**:
        - `backend/apps/core/tmdb_models/tmdb_responses.py` - Rename class definition
        - All imports across service layer, pagination, schema factories
        - Update docstring to reflect generic paginated movie response nature
    - **Why now**: Discovered during test validation work - naming confusion could cause future bugs
    - **Estimated scope**: ~15 files, mostly import changes

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
