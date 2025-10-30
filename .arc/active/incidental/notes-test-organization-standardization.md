# Notes: Test Organization Standardization

**Created:** 2025-10-30
**Related Task List:** `.arc/active/incidental/tasks-test-organization-standardization.md`
**Purpose:** Document research findings, decision rationale, and file analysis for test organization migration

---

## Research Summary

### External Research Completed (2025-10-30)

**Scope:** Best practices for organizing and splitting large test files in pytest (Python/Django) and Vitest/Jest
(TypeScript/React) ecosystems.

**Sources:**

- Django REST Framework test structure (62+ test files)
- pytest official documentation
- FastAPI projects
- React Testing Library ecosystem
- Industry articles on test organization

**Key Research Questions:**

1. How do mature Python/Django projects organize unit vs integration tests?
2. What are idiomatic file splitting patterns for large test files?
3. When and how should test files be split?
4. What naming conventions are standard?
5. How should pytest be configured for directory-based organization?

---

## Key Findings

### pytest (Backend) Best Practices

**Directory-based separation is the industry standard:**

```
tests/
├── conftest.py          # Shared fixtures
├── unit/
│   └── services/
│       └── test_movie_service.py
└── integration/
    └── api/
        └── test_movie_api.py
```

**NOT file-suffix based** (e.g., `test_foo.py` vs `test_foo_integration.py` is not idiomatic)

**File splitting thresholds:**

- < 200 lines: Keep together
- 200-400 lines: Consider splitting if multiple features/endpoints
- 400-800 lines: Should split into 2-3 files
- 800+ lines: **Must split** - aim for 200-400 per file

**Splitting strategies by test type:**

1. **API integration tests:** Split by endpoint + aspect
   - Example: `test_discover_filtering.py`, `test_discover_pagination.py`, `test_search_queries.py`
   - Django REST Framework pattern: Splits serializers by type, relations by field type

2. **Business logic tests:** Split by domain/feature
   - Example: `test_genre_filters.py`, `test_rating_filters.py`, `test_date_filters.py`
   - Each logical domain gets its own file

3. **Service tests:** Split by service method or concern
   - Example: `test_movie_service_discovery.py`, `test_movie_service_enrichment.py`

**Naming conventions:**

- Pattern: `test_{resource}_{feature}_{aspect}.py`
- Examples: `test_movie_discover_filtering.py`, `test_user_authentication_tokens.py`
- Shorter names when context clear from directory structure

**pytest configuration:**

- Use markers as **supplement** for selective execution
- Directory structure is **primary** organization
- Standard markers: `unit`, `integration`, `e2e`, `slow`, `api`

### Vitest/React Best Practices

**Co-location is dominant pattern:**

- Tests live beside components: `Button.tsx` → `Button.test.tsx`
- Use `__tests__/` directories (our current pattern - already idiomatic)
- Suffixes for test types: `.test.tsx` (unit), `.integration.test.tsx` (integration)

**E2E tests separate:**

- Live in `/e2e` directory with Playwright config
- Use `.spec.ts` extension (Playwright convention)

### Fixture Organization

**Keep at app-level conftest.py:**

- Only split into `fixtures/` directory if >200 fixtures (we have 14)
- `pytest_plugins` pattern is premature optimization at our scale
- Revisit at 50+ fixtures project-wide

**Directory-level conftest.py:**

- `tests/conftest.py` - Shared fixtures (primary location)
- `tests/unit/conftest.py` - Unit-specific fixtures (if needed)
- `tests/integration/conftest.py` - Integration-specific fixtures (if needed)

---

## Decision Rationale

### Why Directory-Based Separation?

**Chosen approach:** `tests/unit/`, `tests/integration/`, `tests/e2e/`

**Over file suffixes** (`test_foo.py`, `test_foo_integration.py`):

- ✅ Industry standard (pytest docs, Django REST Framework, FastAPI)
- ✅ Tool-agnostic (works regardless of test runner)
- ✅ Easier selective execution (`pytest tests/unit/` vs `pytest -m unit`)
- ✅ Better for parallel test execution
- ✅ Clear separation visible in file tree
- ✅ Scales better (subdirectories for large apps)

**Real-world validation:**

- Django REST Framework: 62+ test files in organized directories
- FastAPI projects: Mirror source structure with `tests/unit/`, `tests/integration/`
- pytest documentation explicitly recommends directory-based organization

### Why Split by Endpoint+Aspect for API Tests?

**For our 1512-line `test_movie_api.py`:**

**Chosen approach:** Split by endpoint + aspect (filtering, pagination, sorting)

**Rationale:**

- Aligns with how developers think ("I'm working on discover filtering")
- Each file focuses on one endpoint's behavior facet
- Easier to find related tests
- More maintainable as endpoints grow
- Matches Django REST Framework pattern

**Alternative considered:** Split by endpoint only (all discover tests in one file)

- Would still result in 500+ line files
- Less granular, harder to navigate

### Why Split by Filter Domain for Business Logic?

**For our 1412-line `test_result_filtering.py`:**

**Chosen approach:** Split by filter type (genre, rating, date, language, keyword, combined)

**Rationale:**

- Natural domain boundaries (each filter type is independent)
- Easy to locate tests for specific filter
- Supports parallel development (different engineers own different filters)
- Matches how features are added (one filter type at a time)

**Alternative considered:** Split by test concern (validation, application, edge cases)

- Would mix unrelated filter types in same file
- Harder to find all tests for a specific filter

### Why Keep Frontend Tests As-Is?

**Current frontend structure:**

- Co-located tests in `__tests__/` directories
- Suffix-based test types (`.integration.test.tsx`)

**Decision:** No changes needed

- Already follows React/Vitest best practices
- Co-location is idiomatic for component tests
- `__tests__/` directories are supported pattern
- Not worth migration churn

---

## Real-World Examples

### Django REST Framework Test Structure

**URL:** <https://github.com/encode/django-rest-framework/tree/master/tests>

**Organization:**

- Flat `tests/` directory with 62+ test files
- Splits by component type: `test_serializer.py`, `test_serializer_nested.py`, `test_serializer_lists.py`
- Splits by relationship type: `test_relations_pk.py`, `test_relations_slug.py`, `test_relations_hyperlink.py`
- Subdirectories for complex features: `authentication/`, `schemas/`, `browsable_api/`

**Key insight:** DRF splits large concerns (serializers, relations) into multiple focused files

### pytest Official Documentation

**URL:** <https://docs.pytest.org/en/stable/explanation/goodpractices.html>

**Recommendations:**

- Separate `tests/` directory from source code
- Use `src/` layout for packages
- Prefix all test files with `test_`
- Use directory structure to mirror application structure

---

## File Analysis

### Pre-Migration State

**Total backend test files:** ~20 across 4 apps

**Largest files:**

1. `test_movie_api.py` - 1,512 lines (3-7x over threshold)
2. `test_result_filtering.py` - 1,412 lines (3-5x over threshold)
3. `test_movie_enrichment_service.py` - 672 lines (borderline)
4. `test_user_movie_data_api.py` - 666 lines (borderline)
5. `test_watchlist_endpoint.py` - 660 lines (borderline)

**Total test count:** 103 tests (from pytest migration notes)

---

## test_movie_api.py Analysis (1512 lines)

**Status:** Analysis pending (Phase 3, Task 3.1)

**Analysis will document:**

- Catalog of all test functions with purposes
- Identified natural groupings (by endpoint, by feature, by test type)
- Shared fixtures and dependencies
- Proposed split strategy with line count estimates
- File structure recommendation

**Preliminary observations:**

- Likely contains tests for multiple endpoints (discover, search, list, detail)
- Each endpoint likely has tests for filtering, pagination, sorting
- Strong candidate for endpoint+aspect split pattern

---

## test_result_filtering.py Analysis (1412 lines)

**Status:** Analysis pending (Phase 3, Task 3.2)

**Analysis will document:**

- List of test categories (genre filters, rating filters, date filters, etc.)
- Test types identified (validation, application, edge cases, errors)
- Fixture dependencies and shared setup
- Proposed split strategy with line count estimates
- File structure recommendation

**Preliminary observations:**

- Likely tests all filter types (genre, rating, date, language, keyword)
- May include combination/interaction tests
- Strong candidate for filter domain split pattern

---

## Other Oversized Files (500+ lines)

**Status:** Identification pending (Phase 3, Task 3.3)

**Files to assess:**

- `test_movie_enrichment_service.py` (672 lines)
- `test_user_movie_data_api.py` (666 lines)
- `test_watchlist_endpoint.py` (660 lines)

**For each file, will document:**

- Whether split is beneficial or file should remain intact
- Logical boundaries if splitting
- Rationale for decision

---

## Post-Migration Refactoring Opportunities

**Status:** To be documented in Phase 7, Task 7.3

**Will analyze:**

1. **DRY violations** - Duplicate test setup, assertions, mocks
2. **Missing test helpers** - Repeated patterns that could be abstracted
3. **Fixture organization** - Consolidation opportunities, unused fixtures
4. **Test readability** - Naming improvements, docstring quality
5. **Test complexity** - Tests doing too much, should be split

**Categorization:**

- Critical: Blocks maintainability, fix now
- Nice-to-have: Polish, defer to follow-up task list

---

## Migration Decisions Log

### pytest Configuration (Phase 5)

**Decision pending:** Whether to add markers to individual tests

**Option A:** No markers (directory structure only)

- Pro: Simpler, directory structure is sufficient
- Con: Can't easily select "all slow tests across unit and integration"

**Option B:** Add markers to all tests

- Pro: Maximum flexibility for test selection
- Con: Maintenance overhead, markers can get stale

**Recommendation:** Option A (directory structure primary), add markers selectively for `slow` and `api` only

### Fixture Splitting (Phase 2)

**Decision made:** Keep fixtures at app-level `conftest.py`

**Rationale:**

- Only 14 fixtures project-wide
- No navigation problems at current scale
- Premature to use `pytest_plugins` pattern
- Revisit at 50+ fixtures

### Test File Naming After Split

**Decision made:** Use `test_{resource}_{feature}_{aspect}.py` pattern

**Examples:**

- `test_movie_discover_filtering.py` (resource=movie, feature=discover, aspect=filtering)
- `test_user_authentication_tokens.py` (resource=user, feature=authentication, aspect=tokens)

**Rationale:**

- Clear hierarchy
- Easy to locate tests
- Matches research findings from Django REST Framework
- Keeps names under 50 characters

---

## Success Metrics

**Target outcomes:**

- ✅ All test files under 400 lines (except intentionally documented exceptions)
- ✅ Clear unit/integration separation in all 4 apps
- ✅ 100% test pass rate maintained throughout migration
- ✅ No change in total test count (103 tests)
- ✅ Directory-based execution works (`pytest tests/unit/`, `pytest tests/integration/`)
- ✅ Improved test discoverability and navigation

**Quality gates:**

- All tests pass after each file move/split
- Zero linting violations
- Zero type errors
- CI/CD pipeline runs successfully

---

## References

### Research Sources

**pytest Ecosystem:**

- pytest official docs: <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Django REST Framework tests: <https://github.com/encode/django-rest-framework/tree/master/tests>
- pytest-django documentation
- pytest-with-eric.com: Best practices articles

**React/Vitest Ecosystem:**

- Vitest official docs: <https://vitest.dev/guide/>
- React Testing Library philosophy
- Jest documentation
- Ant Design testing practices

**Industry Guidance:**

- Google testing blog (testing pyramid)
- Microsoft testing best practices
- Martin Fowler on test organization

### Internal Documentation

- `.arc/reference/strategies/strategy-testing-methodology.md` - Updated standards
- `.arc/active/incidental/tasks-test-organization-standardization.md` - Task list
- `backend/pyproject.toml` - pytest configuration
