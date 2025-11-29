# Incidental: Data Quality Enhancements

**Created:** 2025-11-29
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress

## Context

**Discovered:** Manual testing of Z-A title sort revealed problematic TMDB content slipping through filters

**Interrupts:** `.arc/active/incidental/tasks-buffer-deduplication-data-quality.md` at Phase 3, Task 3.1

**Problem:** Problematic TMDB content (mislabeled adult material, exploitation films) appears in browse
results despite `adult: false` flag, particularly visible in alphabetical sorts where full-width Unicode
characters cluster these titles together.

**Why Now:** Affects user experience and app perception. Movie blacklist infrastructure now exists;
extending to production companies and centralizing filter rules completes the data quality toolkit.

**Architecture Improvement:** During planning, identified naming confusion between TMDB query parameters
(first pass) and our data quality filters (second pass). Refactoring naming and moving blacklist logic
to the correct layer before adding production company blacklist.

## Scope

### Will Do

- Clarify architecture: rename files/functions to distinguish TMDB params from data quality filters
- Move movie blacklist from pagination layer to data quality filter layer
- Add test coverage for blacklist functionality (TDD for production company)
- Create production company blacklist model (parallel to movie blacklist)
- Research and document problematic production companies (pink film studios, etc.)
- Populate both movie and production company blacklists with verified entries
- Centralize vote count filter policy (DRY refactor)
- Revisit `original_title` sort vote threshold

### Won't Do

- Deep link pre-population (documented in buffer-deduplication Won't Do)
- Automated content classification (manual curation only)
- TMDB reporting (their tagging, our responsibility to filter)

---

## Tasks

### **Phase 1:** Architecture Clarification (Naming Refactor)

**Purpose:** Establish clear naming distinction between TMDB API query parameters (first pass)
and our data quality post-processing filters (second pass).

- [x] **1.1 Rename filter-related files**

    - [x] **1.1.1 Rename `filtering.py` → `tmdb_query_params.py`**
        - Updated 16 import statements across codebase
        - Files: schemas.py, pagination.py, movie_service.py, data_quality_filters.py,
          10 test files, test_tmdb_logging.py management command

    - [x] **1.1.2 Rename `result_filtering.py` → `data_quality_filters.py`**
        - Updated 1 import in pagination.py
        - Updated module docstring to clarify purpose

    - [x] **1.1.3 Run quality gates**
        - 440 tests pass, linting clean, type checking 0 errors

- [x] **1.2 Move and rename orchestration function**

    - [x] **1.2.1 Move `apply_filters()` from `pagination.py` to `data_quality_filters.py`**
        - Renamed to `apply_data_quality_filters()`
        - Function now lives alongside the individual filters it orchestrates
        - `pagination.py` imports and calls it (separation of concerns)

    - [x] **1.2.2 Run quality gates**
        - 440 tests pass, linting clean, type checking 0 errors

### **Phase 2:** Movie Blacklist Architecture Fix

**Purpose:** Move blacklist filtering from pagination/deduplication layer to data quality filter layer.
Blacklist is a content policy (like vote count, completeness) not a pagination concern.

- [x] **2.1 Move blacklist logic to data quality layer**

    - [x] **2.1.1 Add `filter_movies_by_blacklist()` to `data_quality_filters.py`**
        - Moved `get_blacklisted_ids()` function from `pagination.py`
        - Created `filter_movies_by_blacklist()` function mirroring other filter functions
        - Kept 5-minute cache, same behavior

    - [x] **2.1.2 Integrate into `apply_data_quality_filters()`**
        - Added blacklist filtering as FIRST filter in pipeline (efficiency - exclude early)
        - Updated docstring to document 4-stage pipeline

    - [x] **2.1.3 Remove blacklist logic from `pagination.py`**
        - Removed `get_blacklisted_ids()` function and cache constants
        - Removed blacklist filtering from `apply_buffer_if_needed()`
        - Removed `seen_ids` seeding with blacklist (no longer needed)
        - `apply_buffer_if_needed()` now purely handles deduplication

    - [x] **2.1.4 Run quality gates**
        - 440 tests pass, linting clean, type checking 0 errors

### **Phase 3:** Blacklist Test Coverage

**Purpose:** Add test coverage for blacklist functionality. Retroactive for movie blacklist,
TDD for production company blacklist.

- [x] **3.1 Write tests for movie blacklist (retroactive)**

    Created `test_blacklist_filtering.py` with 12 tests covering `get_blacklisted_ids()`,
    `filter_movies_by_blacklist()`, and pipeline integration. Added DRY `create_movie_schema()`
    helper reusable for Phase 3.2 production company tests.

    - [x] **3.1.1 Create `test_blacklist_filtering.py` in `tests/unit/services/filtering/`**
        - 4 tests for `get_blacklisted_ids()`: empty DB, correct IDs, cache hit, cache timeout
        - 5 tests for `filter_movies_by_blacklist()`: excludes blacklisted, empty blacklist,
          all blacklisted, empty input, preserves order

    - [x] **3.1.2 Add integration test for blacklist in data quality pipeline**
        - 3 tests for `apply_data_quality_filters()`: blacklist applied, runs first,
          combined with year/rating filters

    - [x] **3.1.3 Run quality gates**
        - 452 tests pass (12 new), linting clean, type checking 0 errors

- [x] **3.2 Write tests for production company blacklist (TDD)**

    Created `test_production_company_blacklist.py` with 14 TDD tests (all skipped until
    implementation). Added `MovieWithCompanies` helper and pyright suppressions for
    non-existent code pattern.

    - [x] **3.2.1 Write model tests for `BlacklistedProductionCompany`**
        - 3 tests: model creation, unique constraint, str representation
        - Skipped until Phase 4 implementation

    - [x] **3.2.2 Write tests for `get_blacklisted_company_ids()`**
        - 4 tests: empty DB, correct IDs, cache hit, cache timeout
        - Skipped until Phase 6 implementation

    - [x] **3.2.3 Write tests for `filter_movies_by_blacklisted_company()`**
        - 7 tests: excludes blacklisted, ANY company match, no company data,
          empty blacklist, all blacklisted, empty input, preserves order
        - Skipped until Phase 6 implementation

### **Phase 4:** Production Company Blacklist Model

**Purpose:** Create Django model for blacklisting production companies. Tests written in Phase 3.2.

- [x] **4.1 Create production company blacklist model**

    Created `BlacklistedProductionCompany` model with admin interface. TDD model tests now pass.

    - [x] **4.1.1 Create `BlacklistedProductionCompany` model in `movie/models.py`**
        - Fields: `tmdb_company_id` (unique, indexed), `name`, `reason`, `added_at`
        - Registered in admin with list display (name, ID, reason, date) and search

    - [x] **4.1.2 Create and run migration**
        - Migration: `0002_blacklisted_production_company.py`

    - [x] **4.1.3 Run quality gates**
        - 455 tests pass (3 model tests now active), 11 skipped (Phase 6)
        - Linting: clean, Type checking: 0 errors

### **Phase 5:** Research Problematic Production Companies

**Purpose:** Identify studios that exclusively produce adult/exploitation content mislabeled in TMDB.

**Note:** Not limited to Japanese studios - sample data skewed Japanese due to Z-A sort unicode clustering.
Any country may have studios producing mislabeled adult content.

- [ ] **5.1 Research studios from sample data and patterns**

    **Goal:** Build verified list of companies to blacklist, with documentation.

    - [ ] **5.1.1 Research Japanese studios from initial sample**
        - Nikkatsu Corporation (known for "Roman Porno" division 1971-1988)
        - Pink Pineapple
        - Osu Production
        - Okura Pictures
        - Sekine Production
        - Determine: Does each company ALSO produce legitimate content?
        - Document: Exclusive adult studio vs mixed catalog

    - [ ] **5.1.2 Search for additional studios (any country)**
        - Query TMDB for movies with similar patterns (low vote, short runtime, Romance/Drama)
        - Extract production company names from results
        - Research each for content exclusivity
        - Document country of origin for reference

- [ ] **5.2 Document research findings**

    - [ ] **5.2.1 Update notes file with research results**
        - Company name, TMDB ID, verdict (blacklist/skip), rationale
        - Distinguish exclusive adult studios from mixed catalogs

### **Phase 6:** Production Company Filter Integration

**Purpose:** Implement production company filtering in data quality layer.

- [ ] **6.1 Add production company filtering to data quality pipeline**

    **Goal:** Exclude movies from blacklisted production companies during result processing.

    - [ ] **6.1.1 Create `get_blacklisted_company_ids()` in `data_quality_filters.py`**
        - Mirror `get_blacklisted_ids()` pattern
        - 5-minute cache TTL
        - Return set of TMDB company IDs

    - [ ] **6.1.2 Create `filter_movies_by_production_company()` in `data_quality_filters.py`**
        - Check movie's production_companies against blacklist
        - Exclude if ANY production company is blacklisted
        - Handle missing production_companies gracefully

    - [ ] **6.1.3 Integrate into `apply_data_quality_filters()`**
        - Add production company filtering to pipeline
        - Document ordering rationale

    - [ ] **6.1.4 Run quality gates**
        - All tests from 3.2.2 and 3.2.3 now pass
        - All existing tests still pass
        - Linting: 0 violations
        - Type checking: 0 errors

### **Phase 7:** Centralize Filter Policy (DRY Refactor)

**Purpose:** Single source of truth for vote count filtering rules across all views/sorts.

- [ ] **7.1 Create centralized filter policy configuration**

    - [ ] **7.1.1 Create filter policy in `tmdb_query_params.py`**
        - Define policy dict/dataclass for each view type
        - Include: `default_min_vote_count`, sort-specific overrides
        - Document rationale for each rule

    - [ ] **7.1.2 Refactor `api.py` to use centralized policy**
        - Remove inline bypass logic (lines 256-264)
        - Import and apply policy from `tmdb_query_params.py`
        - Verify identical behavior

    - [ ] **7.1.3 Refactor `movie_service.py` to use centralized policy**
        - Update `get_now_playing_movies` and `get_upcoming_movies`
        - Reference policy instead of hardcoded `min_vote_count = None`

    - [ ] **7.1.4 Update test configs to reference same policy**
        - `endpoint_configs.py` should import from `tmdb_query_params.py`
        - Single source of truth for test expectations

- [ ] **7.2 Revisit `original_title` sort vote threshold**

    **Goal:** Determine if alphabetical sorts should have reduced (not zero) vote threshold.

    - [ ] **7.2.1 Analyze tradeoffs**
        - Current: `None` (no threshold) - lets low-quality content through
        - Option: Lower threshold (5?) - filters worst noise, keeps legitimate obscure films
        - Document decision and rationale

    - [ ] **7.2.2 Implement decision**
        - Update centralized policy with chosen threshold
        - If changed, verify no unintended filtering of legitimate content

    - [ ] **7.2.3 Run quality gates**
        - All tests pass (update test expectations if threshold changed)
        - Linting: 0 violations

### **Phase 8:** Populate Blacklists

- [ ] **8.1 Populate production company blacklist**

    - [ ] **8.1.1 Add verified exclusive adult studios to blacklist**
        - Use Django admin or migration
        - Include reason for each entry

- [ ] **8.2 Populate movie blacklist with known problematic titles**

    - [ ] **8.2.1 Add sample problematic movies identified during research**
        - TMDB IDs: 405342, 634220, 969777, 153726, 202438, 1263190 (if not caught by company filter)
        - Only add movies that slip through company filter

### **Phase 9:** Verification and Quality Gates

- [ ] **9.1 Manual verification**

    - [ ] **9.1.1 Test Z-A sort for problematic content**
        - Browse with `original_title.desc` sort
        - Verify blacklisted companies/movies excluded
        - Document any remaining issues

    - [ ] **9.1.2 Test other views for regressions**
        - Popular, Top Rated, Now Playing, Upcoming
        - Verify legitimate content not filtered

- [ ] **9.2 Final quality gates**

    - [ ] **9.2.1 Run full backend test suite**
        - All tests pass

    - [ ] **9.2.2 Run linting and type checking**
        - 0 violations, 0 errors

---

## Completed Work

### Movie Blacklist (completed prior to task list reorganization)

- [x] **Created `BlacklistedMovie` model in `movie/models.py`**
    - Fields: `tmdb_id` (unique, indexed), `reason`, `added_at`
    - Registered in admin for easy management

- [x] **Created migration `0001_add_blacklisted_movie.py`**

- [x] **Initial integration into `apply_buffer_if_needed` in `pagination.py`**
    - `get_blacklisted_ids()` function with 5-minute cache
    - **Note:** Will be moved to data quality layer in Phase 2

---

## Notes

**Sample problematic movies (for reference):**

| TMDB ID | Title                                 | Company              | Vote Count | Issue                        |
|---------|---------------------------------------|----------------------|------------|------------------------------|
| 405342  | Office Ladies: Lesbians in Uniforms 3 | Nikkatsu Corporation | 9          | Pink film, `adult: false`    |
| 634220  | Sex Highway: Woman's Parking Lot      | Nikkatsu Corporation | 2          | Pink film, `adult: false`    |
| 969777  | SM kyoshitsu: shikkin                 | Osu Production       | 2          | Exploitation, `adult: false` |
| 153726  | Rapeman 4                             | Pink Pineapple       | 7          | Exploitation, `adult: false` |
| 202438  | XX: Beautiful Prey                    | (none listed)        | 15         | Passes vote filter           |
| 1263190 | White Room: Tomarenai Ai              | Sekine/Okura         | 1          | Pink film, `adult: false`    |

**Z-A clustering explanation:** Original titles use full-width Unicode characters (Ａ-Ｚ instead of A-Z)
which sort after standard ASCII, causing these to cluster in alphabetical sorts.
