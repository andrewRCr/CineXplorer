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
centralizing filter rules completes the data quality toolkit.

**Architecture Improvement:** During planning, identified naming confusion between TMDB query parameters
(first pass) and our data quality filters (second pass). Refactoring naming and moving blacklist logic
to the correct layer.

**Pivot (Phase 6):** Originally planned production company blacklist filtering, but discovered TMDB
discover/search endpoints don't return production company data (only available in detail endpoints).
Pivoted to using company research to bulk-populate the movie blacklist instead.

## Scope

### Will Do

- Clarify architecture: rename files/functions to distinguish TMDB params from data quality filters
- Move movie blacklist from pagination layer to data quality filter layer
- Add test coverage for movie blacklist functionality
- Research problematic production companies (pink film studios, etc.)
- Populate movie blacklist with movies from researched problematic studios
- Centralize vote count filter policy (DRY refactor)
- Revisit `original_title` sort vote threshold

### Won't Do

- Production company runtime filtering (data not in list endpoints - see Pivot note above)
- Deep link pre-population (documented in buffer-deduplication Won't Do)
- Automated content classification (manual curation only)
- TMDB reporting (their tagging, our responsibility to filter)
- Search result filtering (if user searches for it, they can find it)

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

**Purpose:** Add test coverage for movie blacklist functionality.

- [x] **3.1 Write tests for movie blacklist (retroactive)**

    Created `test_blacklist_filtering.py` with 12 tests covering `get_blacklisted_ids()`,
    `filter_movies_by_blacklist()`, and pipeline integration. Added DRY `create_movie_schema()`
    helper.

    - [x] **3.1.1 Create `test_blacklist_filtering.py` in `tests/unit/services/filtering/`**
        - 4 tests for `get_blacklisted_ids()`: empty DB, correct IDs, cache hit, cache timeout
        - 5 tests for `filter_movies_by_blacklist()`: excludes blacklisted, empty blacklist,
          all blacklisted, empty input, preserves order

    - [x] **3.1.2 Add integration test for blacklist in data quality pipeline**
        - 3 tests for `apply_data_quality_filters()`: blacklist applied, runs first,
          combined with year/rating filters

    - [x] **3.1.3 Run quality gates**
        - 452 tests pass (12 new), linting clean, type checking 0 errors

- [x] ~~**3.2 Write tests for production company blacklist (TDD)**~~ **PIVOTED**

    **Removed:** Production company blacklist not feasible - TMDB discover/search endpoints
    don't return production company data. Tests and model removed. Research findings preserved
    for use in Phase 6 (populating movie blacklist).

### **Phase 4:** ~~Production Company Blacklist Model~~ **PIVOTED**

**Removed:** See Phase 3.2 note. Model, migration, admin, and tests removed.

### **Phase 5:** Research Problematic Production Companies

**Purpose:** Identify studios that exclusively produce adult/exploitation content mislabeled in TMDB.
Research findings used to populate movie blacklist in Phase 6.

**Note:** Not limited to Japanese studios - sample data skewed Japanese due to Z-A sort unicode clustering.
Any country may have studios producing mislabeled adult content.

- [x] **5.1 Research studios from sample data and patterns**

    Researched all five studios from initial sample. Three confirmed for blacklisting,
    two skipped due to mixed catalogs with legitimate mainstream content.

    - [x] **5.1.1 Research Japanese studios from initial sample**

        **BLACKLIST (exclusively adult content):**

        | Company           | TMDB ID | Content                 | Notes                                        |
        | ----------------- | ------- | ----------------------- | -------------------------------------------- |
        | Pink Pineapple    | 80856   | 100% hentai/adult anime | Note: TMDB has duplicate at 267239 (unused)  |
        | Osu Production    | 174515  | Adult/pink films        | 1986-era pink films                          |
        | Sekine Production | 142460  | Adult/pink films        | 30 titles, all adult                         |

        **SKIP (mixed catalog - has legitimate mainstream):**

        | Company              | Content | Notes                                                                                                                        |
        | -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
        | Nikkatsu Corporation | Mixed   | Major studio (1912-present). Roman Porno 1971-88, but also acclaimed directors (Suzuki, Imamura), modern mainstream output   |
        | Okura Pictures       | Mixed   | OP Pictures Plus division produces R-15 mainstream. 90% pink film market but has legitimate arm                              |

    - [x] **5.1.2 Search for additional studios (any country)**
        Searched Wikipedia pink film article for known studios, verified in TMDB.

        **Additional BLACKLIST studios found:**

        | Company           | TMDB ID | Movies | Content         |
        | ----------------- | ------- | ------ | --------------- |
        | Kokuei            | 9301    | 185    | 100% pink films |
        | Shintoho Pictures | 73435   | 452    | 100% adult      |
        | Million Film      | 120194  | 95     | 100% pink films |

        **Total: 6 studios, ~762 movies covered by blacklist**

- [x] **5.2 Document research findings**

    - [x] **5.2.1 Update task list with research results**
        - Documented in 5.1.1 above with TMDB IDs and rationale

### **Phase 6:** Populate Movie Blacklist from Company Research

**Purpose:** Use Phase 5 research to bulk-populate movie blacklist with titles from problematic studios.

- [x] **6.1 Query TMDB for movies from blacklisted companies**

    Created `populate_blacklist` management command in `movie/management/commands/`.

    - [x] **6.1.1 Query each company's filmography via TMDB API**
        - Command uses discover endpoint with `with_companies` parameter
        - Paginates through all results (respecting TMDB 500 page limit)
        - Rate limiting: 0.3s delay between requests

    - [x] **6.1.2 Filter to movies that would appear in browse results**
        - Uses `include_adult=False` to find mislabeled content
        - Skips movies properly marked `adult: true` in TMDB

- [x] **6.2 Populate movie blacklist**

    - [x] **6.2.1 Create management command**
        - `python manage.py populate_blacklist` (dry run by default)
        - `--commit` flag to actually add entries
        - `--company <ID>` to process single company
        - Reason field includes company name and TMDB ID for traceability

    - [x] **6.2.2 Run and verify**
        - **1,123 movies blacklisted** (final count after pattern analysis)
        - Initial: 733 from 6 studios
        - Pattern analysis added 4 more studios: Xces Film (311), Cement Match (58),
          Office Burrows (8), Shin Nihon Eizo (2)
        - Manual additions: 11 movies (Nikkatsu Roman Porno, no-company titles)
        - Fixed Pink Pineapple ID: 80856 (267239 was duplicate with all adult=true)

    - [x] **6.2.3 Run quality gates**
        - All tests pass
        - Linting: 0 violations

**Studios in blacklist (10 total):**

| Company           | TMDB ID | Movies | Source           |
| ----------------- | ------- | ------ | ---------------- |
| Shintoho Pictures | 73435   | ~403   | Phase 5          |
| Xces Film         | 213979  | ~311   | Pattern analysis |
| Kokuei            | 9301    | ~177   | Phase 5          |
| Million Film      | 120194  | ~87    | Phase 5          |
| Cement Match      | 84362   | ~58    | Pattern analysis |
| Pink Pineapple    | 80856   | ~33    | Phase 5          |
| Sekine Production | 142460  | ~30    | Phase 5          |
| Office Burrows    | 219019  | ~8     | Pattern analysis |
| Osu Production    | 174515  | ~3     | Phase 5          |
| Shin Nihon Eizo   | 127883  | ~2     | Pattern analysis |

### **Phase 7:** Services Directory Reorganization & Filter Policy (DRY Refactor)

**Purpose:** Clean separation of concerns in `movie/services/` and single source of truth for
vote count filtering rules.

**Context:** During Phase 7 planning, identified that `movie/services/` had grown cluttered with
mixed concerns (services, TMDB boundary, data quality, pipelines). Reorganizing first ensures
the vote count policy lands in the right place and establishes clear architecture for future work.

- [x] **7.1 Reorganize `movie/services/` directory structure**

    Created three packages for separation of concerns:

    - `tmdb_api_boundary/`: TMDB API transformation (query_params.py, response_factories.py)
    - `data_quality/`: Second-pass data quality filtering (filters.py)
    - `pipelines/`: Multi-stage processing workflows (paginated.py, batch.py)

    File moves (via git mv for history preservation):

    - `tmdb_query_params.py` → `tmdb_api_boundary/query_params.py`
    - `schema_factories.py` → `tmdb_api_boundary/response_factories.py`
    - `data_quality_filters.py` → `data_quality/filters.py`
    - `pagination.py` → `pipelines/paginated.py`
    - `batch_operations.py` → `pipelines/batch.py`

    Updated 25+ import statements and test patch paths across codebase.

    - [x] **7.1.1 Create `tmdb_api_boundary/` package**
    - [x] **7.1.2 Create `data_quality/` package**
    - [x] **7.1.3 Create `pipelines/` package**
    - [x] **7.1.4 Run quality gates** - 203 tests pass, linting clean, type checking 0 errors

- [x] **7.2 Create centralized vote count policy**

    Created `data_quality/policy.py` as single source of truth for vote count filtering rules.

    **VoteCountPolicy class provides:**

    - `VOTE_COUNT_THRESHOLD = 10` constant (moved from query_params)
    - `should_bypass_for_sort(sort_by)` - bypass for release_date, original_title, popularity.asc
    - `should_bypass_for_endpoint(endpoint)` - bypass for now_playing, upcoming
    - `get_threshold(endpoint, sort_by)` - combined logic returning threshold or None

    **Consumers refactored:**

    - `api.py`: Replaced inline bypass logic with `VoteCountPolicy.get_threshold()`
    - `movie_service.py`: Now-playing/upcoming use policy instead of hardcoded None
    - `query_params.py`: Imports `VOTE_COUNT_THRESHOLD` from policy
    - `filters.py`, `paginated.py`: Import from policy (renamed MIN_VOTE_COUNT → VOTE_COUNT_THRESHOLD)
    - `endpoint_configs.py`: Derives `min_vote_count_applied` from policy at runtime

    - [x] **7.2.1 Create `data_quality/policy.py`**
    - [x] **7.2.2 Refactor `api.py` to use centralized policy**
    - [x] **7.2.3 Refactor `movie_service.py` to use centralized policy**
    - [x] **7.2.4 Update `tmdb_api_boundary/query_params.py`**
    - [x] **7.2.5 Update test configs to reference same policy**
    - [x] **7.2.6 Run quality gates** - 203 tests pass, linting clean, type checking 0 errors

- [x] **7.3 Expand policy.py and refactor filters.py**

    Clean separation achieved - policy defines "what/why", filters implement "how".

    **policy.py now contains:**

    - `VoteCountPolicy` - vote count threshold bypass rules
    - `CompletenessPolicy` - movie data completeness validation with methods:
        - `has_valid_poster()`, `has_valid_title()`, `has_valid_genres()`, `has_valid_overview()`
        - `is_complete()` combining all checks
    - `EARLIEST_VALID_RELEASE_YEAR = 1888` - historical validation cutoff
    - `OVERVIEW_PLACEHOLDER_PATTERNS` - known TMDB placeholder text
    - `MovieDataProtocol` - Protocol to avoid circular imports

    **filters.py refactored:**

    - Orchestration function (`apply_data_quality_filters`) moved to TOP
    - `filter_movies_by_completeness` now one-liner using `CompletenessPolicy.is_complete()`
    - `filter_movies_by_year` uses `EARLIEST_VALID_RELEASE_YEAR` from policy
    - Docstrings trimmed (rationale lives in policy)
    - Stale comments fixed

    - [x] **7.3.1 Expand `policy.py` module**
    - [x] **7.3.2 Refactor `filters.py` to use policy**
    - [x] **7.3.3 Run quality gates** - 203 tests pass, linting clean, type checking 0 errors

- [x] **7.4 Extract API boundary layer (param_transformer refactor)**

    **Completed:** Created `services/api_boundary/` package mirroring `tmdb_api_boundary/`:
    - `service_params.py` - ServiceParams model (data contract between API and service layers)
    - `param_transformer.py` - HTTP→ServiceParams transformation logic + mappings

    **Architecture achieved:**
    - `schemas.py` now defines HTTP shapes only (no transformation logic)
    - `api_boundary/` handles inbound transformation (HTTP → ServiceParams)
    - `tmdb_api_boundary/` handles outbound transformation (ServiceParams → TMDB API)
    - Clean dependency flow: api.py → schemas + api_boundary → services

    - [x] **7.4.1 Create `api_boundary/` package structure**
    - [x] **7.4.2 Move code from `query_params.py`**
    - [x] **7.4.3 Update `schemas.py`** - removed `to_service_params()` and `_apply_derived_params()`
    - [x] **7.4.4 Update call sites in `api.py`** - 3 call sites updated
    - [x] **7.4.5 Update tests** - `test_schemas.py` updated to use `transform_to_service_params()`
    - [x] **7.4.6 Run quality gates** - 452 backend tests, 460 frontend tests, 0 lint/type errors

- [x] **7.5 Refine VoteCountPolicy bypass logic**

    **Completed:** Refined vote count threshold policy to apply by default, with
    smart context-aware bypassing only where truly necessary.

    **Key changes implemented:**
    1. `original_title.*` sorts: Now apply threshold (was bypassed)
    2. `release_date.asc`: Now apply threshold (was bypassed)
    3. `release_date.desc`: Context-aware via `year_max` parameter:
       - Recent content (no filter, this year, last year): Bypass
       - Historical content (year_max < current_year - 1): Apply threshold

    **New test coverage:** 23 direct unit tests for VoteCountPolicy in
    `tests/unit/services/data_quality/test_vote_count_policy.py`

    - [x] **7.5.1 Update `VoteCountPolicy.get_threshold()` signature**
    - [x] **7.5.2 Implement refined bypass logic**
    - [x] **7.5.3 Update call site in `api.py`** - passes `year_max=params.year_max`
    - [x] **7.5.4 Add direct unit tests for VoteCountPolicy** - 23 tests
    - [x] **7.5.5 Run quality gates** - 475 backend tests, 460 frontend, 0 lint/type errors

### **Phase 8:** Verification and Quality Gates

- [ ] **8.1 Manual verification**

    - [ ] **8.1.1 Test Z-A sort for problematic content**
        - Browse with `original_title.desc` sort
        - Verify blacklisted movies excluded
        - Document any remaining issues

    - [ ] **8.1.2 Test other views for regressions**
        - Popular, Top Rated, Now Playing, Upcoming
        - Verify legitimate content not filtered

    - [x] **8.1.3 Investigate test gap - why Z-A underfill wasn't caught**
        - Root cause: No integration test for `original_title.desc` sort
        - Policy unit tests existed but no end-to-end verification
        - Added `TestAlphabeticalSortBypassesVoteFilter` class to `test_browse_sort_options.py`
        - Tests verify: low-vote movies returned, no `vote_count.gte` sent to TMDB
        - Documented additional test gaps in Notes section (deferred: smoke tests, error scenarios)

    - [x] **8.1.4 Add additional blacklist entries from manual verification**
        - Researched production companies for user-identified problematic movies
        - Found patterns: Nikkatsu (1971-1988), Kato Eizo Kobo, Watanabe Production
        - Bulk blacklisted: Nikkatsu 1971-1988 (979), Kato Eizo Kobo (38), Watanabe Production (92)
        - Individual blacklists: 72 additional movies (Korean content, misc)
        - Final blacklist: 2,281 movies (was 1,123, +1,158 this session)

    - [x] **8.1.5 Fix bugs discovered during other-view testing**
        - **Bug 1: Rating sort (vote_average.desc) returning only 3 results**
            - Root cause: TMDB API received `vote_count.gte=3` (MODERATE) while backend
              filter used `10` (STRICT), causing 70% of results filtered out
            - Fix: Pass `min_vote_count` from VoteCountPolicy to `build_tmdb_params()`
            - Files: `query_params.py`, `movie_service.py`, `test_browse_sort_options.py`
        - **Bug 2: 500 error on movie detail page for TMDB ID 1591004**
            - Root cause: TMDB returns `release_date: ""` (empty string) for some entries,
              Pydantic validation fails parsing empty string as date
            - Fix: Normalize empty string release_date to None before schema validation
            - File: `response_factories.py`

    - [x] **8.1.6 Remaining verification items**
        - [x] Blacklisted True Detective: Season One (ID 1591004) - TV show in TMDB movie DB
        - [x] Investigated pagination display mismatch:
            - Display text now accurate (was timing/state issue, self-resolved)
            - `popularity.asc` causes short pages (17 vs 20) due to heavy filtering
            - Root cause: 5-page buffer limit + 2,282 blacklisted movies + completeness filter
        - Added blacklist command patterns to QUICK-REFERENCE.md for future sessions

    - [x] **8.1.7 Remove problematic sort options from UI**
        - Removed `popularity.asc` and `vote_average.asc` - produce garbage results
        - Rationale: Only title and release date are meaningful bidirectionally;
          popularity/rating "low to high" returns untracked/unrated content
        - Consolidated to single dropdown with 6 coherent options:
          Most Popular, Highest Rated, Newest, Oldest, Title A-Z, Title Z-A
        - Deleted `SortSelector.tsx` (advanced dropdown), renamed `SortDropdownMinimal` → `SortDropdown`
        - Centered Year+Rating inputs in AdvancedMovieFilters (removed sort from that row)
        - Quality gates: 438 frontend tests, 485 backend tests, 0 lint/type errors

- [ ] **8.2 Final quality gates**

    - [ ] **8.2.1 Run full backend test suite**
        - All tests pass

    - [ ] **8.2.2 Run linting and type checking**
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
    - **Note:** Moved to data quality layer in Phase 2

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

---

**Test Gap Investigation (Phase 8.1b):**

During investigation of why tests didn't catch the Z-A underfill issue, identified broader test coverage gaps:

| Gap | Severity | Status |
| --- | -------- | ------ |
| No integration test for `original_title.desc` | High | **Fixed** - Added to `test_browse_sort_options.py` |
| No test verifying alphabetical sorts bypass vote filter | High | **Fixed** - `TestAlphabeticalSortBypassesVoteFilter` class added |
| No smoke tests with real TMDB data | Medium | Defer - fragile dependency on external API |
| No TMDB error scenario tests (timeout, rate limit, 5xx) | Medium | Defer - separate resilience testing effort |
| No tests with realistic data volumes (100+ movies) | Low | Defer - current tests adequate for logic verification |
| Cross-page deduplication test marked xfail | Low | Known issue, tracked separately |
| No filter combination tests (genre + year + rating) | Low | Defer - edge case coverage |

**Root cause:** Policy unit tests verified threshold decisions existed, but no integration test verified
the policy was correctly applied end-to-end for alphabetical sorts. Added tests now verify both:

1. Low-vote movies are returned (not filtered) for A-Z/Z-A sorts
2. No `vote_count.gte` parameter sent to TMDB for alphabetical sorts

---

**Nikkatsu Bulk Blacklist (Phase 8.1a):**

During manual verification, discovered recurring Nikkatsu Corporation content in Z-A results.
Investigation revealed Nikkatsu's "Roman Porno" era (1971-1988) contains ~983 pink films
incorrectly marked `adult: false` in TMDB. TMDB lacks certification data for these films,
preventing automated filtering.

**Decision:** Bulk blacklist all Nikkatsu films from 1971-1988.

- Portfolio showcase context: adult content leaking is more harmful than missing niche legitimate content
- Modern Nikkatsu (2000+) preserved: Attack on Titan, Death Note, Cold Fish, etc.
- Classic pre-1971 preserved: Youth of the Beast, The Insect Woman, etc.

**Blacklist additions:**

| Category | Count | Reason |
| -------- | ----- | ------ |
| Nikkatsu 1971-1988 | 979 | `Nikkatsu Roman Porno era (1971-1988) bulk blacklist` |
| Non-Nikkatsu (user-identified) | 8 | `Problematic content (manual verification Phase 8)` |
| **Total added** | **987** | |

**Final blacklist count:** 2,110 movies (was 1,123)
