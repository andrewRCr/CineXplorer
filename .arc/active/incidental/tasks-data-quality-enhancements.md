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
- DRY refactor: centralize filter defaults, state utilities, and sort constants (Phase 10)

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

        | Company           | TMDB ID | Content                 | Notes                                       |
        |-------------------|---------|-------------------------|---------------------------------------------|
        | Pink Pineapple    | 80856   | 100% hentai/adult anime | Note: TMDB has duplicate at 267239 (unused) |
        | Osu Production    | 174515  | Adult/pink films        | 1986-era pink films                         |
        | Sekine Production | 142460  | Adult/pink films        | 30 titles, all adult                        |

        **SKIP (mixed catalog - has legitimate mainstream):**

        | Company              | Content | Notes                                                                                                                      |
        |----------------------|---------|----------------------------------------------------------------------------------------------------------------------------|
        | Nikkatsu Corporation | Mixed   | Major studio (1912-present). Roman Porno 1971-88, but also acclaimed directors (Suzuki, Imamura), modern mainstream output |
        | Okura Pictures       | Mixed   | OP Pictures Plus division produces R-15 mainstream. 90% pink film market but has legitimate arm                            |

    - [x] **5.1.2 Search for additional studios (any country)**
        Searched Wikipedia pink film article for known studios, verified in TMDB.

        **Additional BLACKLIST studios found:**

        | Company           | TMDB ID | Movies | Content         |
        |-------------------|---------|--------|-----------------|
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
|-------------------|---------|--------|------------------|
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

- [x] **8.1 Manual verification**

    - [x] **8.1.1 Test Z-A sort for problematic content**
        - Verified blacklisted movies excluded from Z-A sort results
        - No problematic content observed in testing

    - [x] **8.1.2 Test other views for regressions**
        - Browse, Now Playing, Upcoming verified working
        - Discovered Title A-Z/Z-A Unicode sorting limitation (non-Latin titles sort incorrectly)
        - Root cause: TMDB API limitation - `original_title` sort uses Unicode code-point ordering
        - Resolution: Phase 9 adds language filter; title sorts only available when Latin-script language selected

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

    - [x] **8.1.8 Fix Highest Rated vote count threshold**
        - Issue: "Highest Rated" sort showed obscure films with 15 fans rating 9.5 instead of
          universally loved films. STRICT threshold (10 votes) was insufficient for statistical validity.
        - Root cause: 10 votes too low - niche films with devoted fanbases dominate results
        - Fix: Context-aware threshold for `vote_average` sorts:
            - **No rating filter**: STRICT (200 votes) - "Top rated" expectation needs famous films
            - **With rating filter**: MODERATE (3 votes) - user browsing within a band
        - Implementation:
            - Updated `STRICT_VOTE_THRESHOLD` from 10 to 200 (matches TMDB Top Rated minimum)
            - Added `rating_min`/`rating_max` params to `VoteCountPolicy.get_threshold()`
            - Updated `param_transformer.py` to pass rating context
            - Added `TestVoteCountPolicyRatingContext` test class (6 new tests)
        - Also fixed: Pre-existing test issues (missing `@pytest.mark.django_db` decorators)
          in buffer mechanism and completeness filtering tests
        - Quality gates: 491 backend tests, 438 frontend tests, 0 lint/type errors

    - [x] **8.1.9 Fix rating filter not affecting vote threshold in browse endpoint**
        - Issue: Browser testing showed "Highest Rated + rating filter" produced same results as
          without filter - context-aware threshold from 8.1.8 wasn't being applied
        - Root cause: `api.py` browse endpoint had redundant `VoteCountPolicy.get_threshold()` call
          that OVERWROTE the correctly computed `min_vote_count` from `transform_to_service_params()`
            - The duplicate call was missing `rating_min`/`rating_max` params
        - Fix: Removed redundant code (lines 254-260) and unused `VoteCountPolicy` import from `api.py`
            - `transform_to_service_params()` now solely responsible for vote count threshold
        - Verification: With rating filter (0.0-10.0) → min_vote_count=3 (MODERATE);
          Without rating filter → min_vote_count=200 (STRICT)
        - Quality gates: 491 backend tests, 0 lint/type errors

    - [x] **8.1.10 Disable "Highest Rated" sort option in Upcoming view**
        - Issue: Upcoming movies have 0 votes, so STRICT threshold (200) filters everything
        - Fix: Pass `pageSource` to `SortDropdown` component; conditionally add `disabled: true`
          to "Highest Rated" option when `pageSource === "upcoming"`
        - Files: `SortDropdown.tsx`, `LetterboxdStyleFilters.tsx`
        - Quality gates: 438 frontend tests, 0 lint/type errors

    - [x] **8.1.11 Fix "Oldest" sort returning scrambled dates in date-constrained views**
        - Issue: Upcoming/Now-Playing "Oldest" (release_date.asc) showed dates out of order
        - Root cause: TMDB API bug - `release_date.asc` sorts by earliest regional release date
          globally, not the displayed `release_date` field. Known issue since 2019.
        - Fix: Map `release_date.asc/desc` → `primary_release_date.asc/desc` in `build_tmdb_params()`
        - Verification: Dates now correctly sorted ascending/descending
        - Files: `query_params.py`, `test_browse_sort_options.py`
        - Reference: <https://www.themoviedb.org/talk/59d3f79ec3a3684561005cd5>
        - Quality gates: 491 backend tests, 0 lint/type errors

### **Phase 9:** Language Filter & Conditional Alphabetic Sort ✓

**Purpose:** Add language filter to enable meaningful alphabetic sorting. Title A-Z/Z-A
only works correctly with single Latin-script languages due to TMDB Unicode sorting limitations.

- [x] **9.1 Backend: Write tests and wire language filter parameter**

    - [x] **9.1.a Write integration test for language filter**
        - Added to `test_browse_endpoints.py` in TestDataQuality class
        - `test_filter_passthrough_language`: Verifies `with_original_language` sent to TMDB
        - `test_filter_no_language_when_all_selected`: Verifies no param when omitted
        - Both tests parametrized across all 3 endpoints (browse, now-playing, upcoming)

    - [x] **9.1.b-c Wire language filter through backend layers**
        - Added `language: str | None` to `ServiceParams` (`service_params.py`)
        - Added `'language': 'language'` to `HTTP_TO_SERVICE_MAPPING` (`param_transformer.py`)
        - Added `'language': 'with_original_language'` to `PARAM_MAPPING` (`query_params.py`)

    - [x] **9.1.d-e Tests pass + quality gates**
        - 6/6 language filter tests pass (3 passthrough + 3 no-language)
        - 497 backend tests pass, 0 lint/type errors

    **Incidental fix**: Added `conftest.py` with autouse fixture to mock blacklist DB query
    for all unit tests in `unit/services/`. Removed 5 unnecessary `@pytest.mark.django_db`
    markers that were added reactively when blacklist was moved to data quality layer.

- [x] **9.2 Frontend: Write tests and add language filter dropdown**

    - [x] **9.2.a Write tests for language filter state and URL persistence**
        - Added 5 tests in "Language filter" describe block
        - Tests: default empty, update via onFiltersChange, filterCount, URL persistence

    - [x] **9.2.b-f Implementation and quality gates**
        - Added `languageOptions` constant (19 languages + "All Languages")
        - Added `language: string` to `MovieFilters` interface
        - Wired through state hooks, URL sync, filterCount, hasActiveFilters
        - Added language dropdown to AdvancedMovieFilters (alongside Year/Rating)
        - Updated test files to use DRY helper functions
        - 443 frontend tests passing, 0 lint/type errors

- [x] **9.3 Conditional alphabetic sort**

    - [x] **9.3.a-e Implementation complete**
        - Created `sortOptionFiltering.ts` utility with `isLatinScriptLanguage`, `getAvailableSortOptions`, `isTitleSort`
        - Created comprehensive `SortDropdown.test.tsx` (13 tests) - covers basic rendering, selection, upcoming
        disable, and conditional title sorts
        - Created `sortOptionFiltering.test.ts` (12 tests) - covers utility functions
        - Added 4 auto-reset tests to `useMovieCollectionState.test.tsx`
        - Updated SortDropdown to filter options based on language
        - Added auto-reset effect in useMovieCollectionState for title→non-Latin transitions
        - 472 frontend tests passing, 0 lint/type errors

- [x] **9.4 Expanded script detection + Z-A sort removal**

    **Context:** Browser testing revealed Phase 9.1-9.3 language filter only caught CJK mislabeled
    movies. Further investigation found Thai, Devanagari, Sinhalese, Cyrillic, Tamil, Malayalam,
    and many other scripts slipping through. More critically, Z-A sort with English language
    filter returned only 8 movies on page 1 due to TMDB data quality issues.

    **Root cause:** Unicode ordering causes non-Latin script characters (U+0370+) to sort
    BEFORE Latin 'Z' (U+005A). When sorting Z-A (descending), ALL mislabeled movies with
    non-Latin original_titles cluster at the front of results. No amount of filtering can
    fix this - the data quality problem is too pervasive.

    **Solution:**

    - [x] **9.4.a Remove Z-A sort from UI** - Fundamentally broken for Latin languages
        - Removed `original_title.desc` from `SortOptionValue` type and `sortOptions` array
        - Updated `SORT_OPTIONS` in `useMovieCollectionState.tsx`
        - Updated `TITLE_SORT_VALUES` → `TITLE_SORT_VALUE` (singular) in `sortOptionFiltering.ts`

    - [x] **9.4.b Rename "Title A-Z" to "Alphabetical"** - No longer needs direction indicator
        - Updated label in `movieFilterOptions.ts`
        - Updated all test assertions

    - [x] **9.4.c Expand non-Latin script detection** - One-time cost for other views
        - Renamed `contains_cjk_characters` → `contains_non_latin_script`
        - Renamed `_CJK_PATTERN` → `_NON_LATIN_SCRIPT_PATTERN`
        - Added 16 new script ranges:
            - South Asian: Bengali, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam
            - Southeast Asian: Lao, Myanmar
            - Middle Eastern: (already had Arabic, Hebrew)
            - European non-Latin: Greek, Cyrillic, Armenian, Georgian
        - Added 8 new test cases for script detection

    - [x] **9.4.d Update backend integration tests**
        - Removed `original_title.desc` from `MINIMAL_UI_SORT_OPTIONS`
        - Updated `ALPHABETICAL_SORT_OPTIONS` to only include A-Z
        - Updated class docstrings to document Z-A removal

    - [x] **9.4.e Quality gates**
        - 531 backend tests pass, 471 frontend tests pass
        - 0 lint/type errors

### **Phase 10:** Browse Domain Refactor (DRY + Naming Clarity)

**Purpose:** Consolidate duplicated filter/sort logic AND establish clear, consistent naming
across the browse domain. This phase addresses both DRY violations discovered during Phase 9
language filter implementation and conceptual clarity issues in the filter/sort domain.

**Problems Addressed:**

- Default values duplicated in 4+ files
- `hasActiveFilters` logic duplicated in 3 files with inconsistencies
- Default sort hardcoded in 6+ locations
- Sort options duplicated in 2 files
- ClearFiltersButton only checks 6 of 10 fields
- `MovieFilters` type conflates filters and sort without clear naming
- "Letterboxd" terminology meaningless to developers unfamiliar with the site
- "Minimal" vs "Advanced" naming inconsistent across files
- `MinimalMovieFilters` type is vestigial legacy complexity
- Types exported from component files instead of dedicated type files
- Backend param mapping lacks unified documentation
- 100+ lines of commented runtime filter code (technical debt)

**Key Terminology Changes:**

| Old                       | New                        | Rationale                                     |
|---------------------------|----------------------------|-----------------------------------------------|
| `MovieFilters`            | `BrowseParams`             | Umbrella type includes sort, not just filters |
| `filterDefaults.ts`       | `browseDefaults.ts`        | Matches umbrella naming                       |
| `movieFilterOptions.ts`   | `browseOptions.ts`         | Consistency                                   |
| `DEFAULT_FILTERS`         | `DEFAULT_BROWSE_PARAMS`    | Matches type name                             |
| `LetterboxdStyleFilters`  | `QuickBrowseBar`           | Describes what it is                          |
| `AdvancedMovieFilters`    | `AdvancedFiltersPanel`     | Clearer purpose                               |
| `filterStyle: "minimal"`  | `browseLayout: "compact"`  | Describes form factor                         |
| `filterStyle: "expanded"` | `browseLayout: "expanded"` | Consistent pairing                            |
| `showAdvanced`            | `isAdvancedPanelOpen`      | Clearer intent                                |
| `hasActiveFilters`        | `hasActiveBrowseParams`    | Includes sort                                 |
| `filterCount`             | `activeParamCount`         | More accurate                                 |
| `clearFilters()`          | `resetBrowseParams()`      | More accurate                                 |
| `filters/` directory      | `browse/` directory        | Matches domain                                |
| `MinimalMovieFilters`     | (deleted)                  | Legacy complexity                             |

**Phase Strategy:**

1. Create new files with correct names, migrate content
2. Update imports across codebase (use `git mv` for renames)
3. Delete old files
4. Update tests throughout (not as separate phase)

---

#### 10.1: Initial Constants (COMPLETED)

- [x] **10.1 Create filter defaults constant** (now `browseDefaults.ts`)

    - [x] **10.1.a Create `frontend/src/constants/filterDefaults.ts`**
        - Created with `DEFAULT_FILTERS` (10 fields), `DEFAULT_SORT`, and `MovieFilters` type
        - NOTE: Will be renamed to `browseDefaults.ts` with updated naming in 10.3

    - [x] **10.1.b Update consumers to use DEFAULT_FILTERS**
        - Updated 4 files: AdvancedMovieFilters, LetterboxdStyleFilters, useMovieCollectionUrl,
          useMovieCollectionState
        - Removed local DEFAULT_FILTERS from useMovieCollectionState.tsx (was duplicate)
        - AdvancedMovieFilters re-exports MovieFilters type for existing consumers

    - [x] **10.1.c Update DEFAULT_SORT consumers**
        - Updated 4 files: AdvancedMovieFilters, urlSync, useMovieCollectionUrl, useMovieCollectionState
        - LetterboxdStyleFilters uses DEFAULT_FILTERS spread (includes sortBy)

    - [x] **10.1.d Run frontend tests and linting**
        - 471 tests pass, type check clean, lint clean

---

#### 10.2: Type System Foundation ✓

- [x] **10.2 Establish type single source of truth**

    - [x] **10.2.a Create `frontend/src/types/browseTypes.ts`**
        - Created with `BrowseParams` (10 fields), `SortOptionValue` union type, `SortOption` interface
        - Comprehensive documentation on field meanings and "not set" conventions

    - [x] **10.2.b Simplify `urlSync.ts` and eliminate MinimalMovieFilters**
        - Simplified to return only `BrowseParams` type
        - Deleted `MinimalMovieFilters` from LetterboxdStyleFilters.tsx
        - Updated useMovieCollectionUrl.tsx to use simplified return

    - [x] **10.2.c Remove duplicate type definitions**
        - Removed `MovieFilters` interface from `@types/movie.d.ts`
        - Updated `filterDefaults.ts` to import types from browseTypes.ts
        - Updated `AdvancedMovieFilters.tsx` to import from browseTypes.ts
        - Added backward-compat re-exports in movieFilterOptions.ts

    - [x] **10.2.d Update all type imports across codebase**
        - Updated 13 files to use `BrowseParams` from `@/types/browseTypes`
        - Removed all `MovieFiltersType` and `UnifiedMovieFilters` aliases

    - [x] **10.2.e Run type check and fix any errors**
        - Type check passes (tsc -b clean)

    - [x] **10.2.f Update affected tests**
        - Updated 4 test files to use BrowseParams
        - All 471 tests pass

---

#### 10.3: Constants Consolidation

- [x] **10.3 Rename and consolidate constants**

    - [x] **10.3.a Rename `filterDefaults.ts` → `browseDefaults.ts`**
        - Renamed file, constant `DEFAULT_FILTERS` → `DEFAULT_BROWSE_PARAMS`
        - Updated 5 files with imports

    - [x] **10.3.b Rename `movieFilterOptions.ts` → `browseOptions.ts`**
        - Removed backward-compat re-exports `SortOption, SortOptionValue`
        - Updated 5 source files + 1 test file with imports

    - [x] **10.3.c Remove duplicate SORT_OPTIONS from useMovieCollectionState.tsx**
        - Imported `sortOptions` from browseOptions.ts
        - Deleted local `SORT_OPTIONS` array, updated check to use `.some()`

    - [x] **10.3.d Update all constant imports** (completed in 10.3.a, 10.3.b)

    - [x] **10.3.e Run tests and fix broken imports**
        - Fixed unused `SortOptionValue` import in browseOptions.ts
        - Type check clean, 471 tests pass, lint clean

---

#### 10.4: Utilities Refactor

- [ ] **10.4 Create and rename utilities**

    - [ ] **10.4.a Create `frontend/src/utilities/browseParamUtils.ts`**
        - `hasActiveBrowseParams(params: BrowseParams): boolean` - checks all 10 fields
        - `countActiveParams(params: BrowseParams): number` - consistent count logic
        - `isDefaultSort(sortBy: string): boolean` - uses DEFAULT_SORT
        - Document what counts as "active" for each field type

    - [ ] **10.4.b Write tests for browseParamUtils**
        - Create `browseParamUtils.test.ts`
        - Test hasActiveBrowseParams with various combinations
        - Test countActiveParams accuracy
        - Test edge cases (empty strings, empty arrays, default sort)

    - [ ] **10.4.c Rename `sortOptionFiltering.ts` → `sortAvailability.ts`**
        - Use `git mv frontend/src/utilities/sortOptionFiltering.ts frontend/src/utilities/sortAvailability.ts`
        - Update imports in browseOptions.ts
        - Function names are fine (isLatinScriptLanguage, getAvailableSortOptions, isTitleSort)
        - Move test file: `git mv sortOptionFiltering.test.ts sortAvailability.test.ts`

    - [ ] **10.4.d Rename `movieFilterMapper.ts` → `browseParamMapper.ts`**
        - Use `git mv frontend/src/utilities/movieFilterMapper.ts frontend/src/utilities/browseParamMapper.ts`
        - Rename function: `mapFiltersToApiParams` → `mapBrowseParamsToApi`
        - Update parameter name: `filters` → `browseParams`
        - Update `filterStyle` param → `browseLayout`
        - Move test file: `git mv movieFilterMapper.test.ts browseParamMapper.test.ts`
        - Update test file content (function names, variable names)

    - [ ] **10.4.e Rename `urlSync.ts` → `browseUrlSync.ts`**
        - Use `git mv frontend/src/utilities/urlSync.ts frontend/src/utilities/browseUrlSync.ts`
        - Rename function: `initializeFiltersFromUrl` → `parseBrowseParamsFromUrl`
        - Update return type documentation

    - [ ] **10.4.f Update all utility imports across codebase**

---

#### 10.5: Component Directory Restructure

- [ ] **10.5 Rename and reorganize browse components**

    - [ ] **10.5.a Create `components/movie/browse/` directory**
        - `mkdir frontend/src/components/movie/browse`
        - `mkdir frontend/src/components/movie/browse/__tests__`

    - [ ] **10.5.b Move and rename QuickBrowseBar**
        - `git mv frontend/src/components/movie/filters/LetterboxdStyleFilters.tsx frontend/src/components/movie/browse/QuickBrowseBar.tsx`
        - Rename component: `LetterboxdStyleFilters` → `QuickBrowseBar`
        - Rename props interface: `LetterboxdStyleFiltersProps` → `QuickBrowseBarProps`
        - Update internal variable names: `filters` → `browseParams`, etc.
        - Remove MinimalMovieFilters export (deleted in 10.2.b)

    - [ ] **10.5.c Move and rename AdvancedFiltersPanel**
        - `git mv frontend/src/components/movie/filters/AdvancedMovieFilters.tsx frontend/src/components/movie/browse/AdvancedFiltersPanel.tsx`
        - Rename component: `AdvancedMovieFilters` → `AdvancedFiltersPanel`
        - Rename props interface: `MovieFiltersProps` → `AdvancedFiltersPanelProps`
        - Remove type re-export (types now in browseTypes.ts)
        - Update internal variable names

    - [ ] **10.5.d Move and rename ClearBrowseButton**
        - `git mv frontend/src/components/movie/filters/ClearFiltersButton.tsx frontend/src/components/movie/browse/ClearBrowseButton.tsx`
        - Rename component: `ClearFiltersButton` → `ClearBrowseButton`
        - Update props interface name
        - Update to use `hasActiveBrowseParams` from browseParamUtils

    - [ ] **10.5.e Move and rename SearchBox**
        - `git mv frontend/src/components/movie/filters/CollapsibleSearchBox.tsx frontend/src/components/movie/browse/SearchBox.tsx`
        - Rename component: `CollapsibleSearchBox` → `SearchBox`
        - "Collapsible" is implementation detail, not needed in name

    - [ ] **10.5.f Move remaining components (no rename needed)**
        - `git mv frontend/src/components/movie/filters/ConnectedDropdowns.tsx frontend/src/components/movie/browse/`
        - `git mv frontend/src/components/movie/filters/SortDropdown.tsx frontend/src/components/movie/browse/`
        - `git mv frontend/src/components/movie/filters/GenreSelector.tsx frontend/src/components/movie/browse/`
        - `git mv frontend/src/components/movie/filters/YearSelector.tsx frontend/src/components/movie/browse/`
        - `git mv frontend/src/components/movie/filters/RatingSelector.tsx frontend/src/components/movie/browse/`
        - `git mv frontend/src/components/movie/filters/SearchBar.tsx frontend/src/components/movie/browse/`

    - [ ] **10.5.g Move and update test files**
        - Move all test files from `filters/__tests__/` to `browse/__tests__/`
        - Rename test files where component names changed:
            - `ClearFiltersButton.test.tsx` → `ClearBrowseButton.test.tsx`
            - `SortDropdown.test.tsx` stays
            - etc.
        - Update imports in all test files
        - Update component references in tests

    - [ ] **10.5.h Delete old filters/ directory**
        - Verify all files moved successfully
        - `rm -r frontend/src/components/movie/filters/`

    - [ ] **10.5.i Update all component imports across codebase**
        - Search for `from "@/components/movie/filters/`
        - Update to `from "@/components/movie/browse/`
        - Update component names in JSX

---

#### 10.6: State & Props Naming Updates

- [ ] **10.6 Update state management naming**

    - [ ] **10.6.a Update `useMovieCollectionState.tsx`**
        - Rename state: `filters` → `browseParams`
        - Rename handler: `onFiltersChange` → `onBrowseParamsChange`
        - Rename derived: `hasActiveFilters` → `hasActiveBrowseParams`
        - Rename derived: `filterCount` → `activeParamCount`
        - Rename action: `clearFilters` → `resetBrowseParams`
        - Rename state: `showAdvanced` → `isAdvancedPanelOpen`
        - Keep `hasAdvancedFilters` (accurate - refers to detailed filter values)
        - Update to use utilities from browseParamUtils.ts

    - [ ] **10.6.b Update `useMovieCollectionUrl.tsx`**
        - Rename state: `unifiedFilters` → `browseParams`
        - Rename handler: `handleUnifiedFiltersChange` → `handleBrowseParamsChange`
        - Rename param: `defaultFilters` → `defaultBrowseParams`
        - Update to use `parseBrowseParamsFromUrl` from browseUrlSync

    - [ ] **10.6.c Rename and update FilterSection → BrowseControlsSection**
        - `git mv frontend/src/components/movie/collection/FilterSection.tsx frontend/src/components/movie/collection/BrowseControlsSection.tsx`
        - Rename component and props interface
        - Rename prop: `filterStyle` → `browseLayout`
        - Update values: `"minimal"` → `"compact"`, keep `"expanded"`
        - Rename prop: `showAdvanced` → `isAdvancedPanelOpen`
        - Update child component references

    - [ ] **10.6.d Update `MovieCollectionLayout.tsx`**
        - Update prop types and names to match new conventions
        - Update `filterStyle` → `browseLayout` in props and JSX
        - Update state variable names passed to children
        - Update comments referencing old names

    - [ ] **10.6.e Update all consumer components**
        - Search for old prop/variable names across codebase
        - Update consistently (grep for: `filterStyle`, `showAdvanced`, `onFiltersChange`,
          `hasActiveFilters`, `filterCount`, `clearFilters`)

    - [ ] **10.6.f Update hook tests**
        - `useMovieCollectionState.test.tsx` - update all variable names and assertions
        - Update any other affected test files

---

#### 10.7: Utility Consumer Updates

- [ ] **10.7 Wire up new utilities**

    - [ ] **10.7.a Update components to use browseParamUtils**
        - `ClearBrowseButton.tsx` - use `hasActiveBrowseParams` (fixes missing fields bug)
        - `AdvancedFiltersPanel.tsx` - use `hasActiveBrowseParams` for panel state
        - `useMovieCollectionState.tsx` - use utilities instead of inline logic
        - `useMovieCollectionUrl.tsx` - use `isDefaultSort` for URL omission

    - [ ] **10.7.b Update browseParamMapper consumers**
        - Update function call: `mapFiltersToApiParams` → `mapBrowseParamsToApi`
        - Update param: `filterStyle` → `browseLayout`
        - Files: useMovieFetchRouter.ts, any direct consumers

    - [ ] **10.7.c Verify no old names remain**
        - Grep for: `MovieFilters` (should only be in browseTypes.ts comment if anywhere)
        - Grep for: `filterDefaults`, `movieFilterOptions`
        - Grep for: `hasActiveFilters`, `filterCount`, `clearFilters` (old names)
        - Grep for: `LetterboxdStyle`, `MinimalMovieFilters`
        - Grep for: `@/components/movie/filters/`
        - Grep for: `backward.compat`, `re-export` (verify no temp shims remain)

---

#### 10.8: Dead Code Cleanup

- [ ] **10.8 Remove technical debt**

    - [ ] **10.8.a Remove commented runtime filter code from ConnectedDropdowns.tsx**
        - Delete 100+ lines of commented-out runtime filter code
        - Add brief comment: "Runtime filtering disabled due to TMDB API data quality issues.
          See runtimeOptions in browseOptions.ts for future re-enablement."

    - [ ] **10.8.b Verify no active runtime references**
        - Ensure minRuntime/maxRuntime fields exist in BrowseParams but UI is disabled
        - Confirm no broken imports or references to runtime UI

---

#### 10.9: Backend Documentation

- [ ] **10.9 Document parameter transformation pipeline**

    - [ ] **10.9.a Add docstrings to param mapping files**
        - `param_transformer.py` - document HTTP → ServiceParams transformation
        - `query_params.py` - document ServiceParams → TMDB API transformation
        - Add cross-references between files explaining the two-step pipeline

    - [ ] **10.9.b Create inline mapping reference**
        - In `query_params.py`, add comment block showing full pipeline:
          `HTTP param → ServiceParams field → TMDB API param`
        - Example: `language → language → with_original_language`

    - [ ] **10.9.c Run backend linting**

---

#### 10.10: Quality Gates & Verification

- [ ] **10.10 Full quality gates and manual verification**

    - [ ] **10.10.a Run full test suite**
        - Backend: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Frontend: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`

    - [ ] **10.10.b Run all linting and type checking**
        - Backend lint: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - Frontend lint: `docker compose ... exec frontend npm run lint`
        - TypeScript: `docker compose ... exec frontend npm run type-check`
        - Python types: `npx pyright backend/apps/ backend/config/ --project backend`
        - Markdown: `npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`

    - [ ] **10.10.c Manual browser testing**
        - Verify language filter works (Phase 9 feature)
        - Verify title sorts appear/disappear correctly
        - Verify A-Z sort works correctly with English filter
        - Verify "Clear" button works from all UI locations
        - Verify active param count badge accurate in all states
        - Test URL persistence (bookmarks, refresh, back/forward navigation)

### **Phase 11:** Certification Filter & MovieDetail Enhancements

**Purpose:** Add content rating filter (MPAA ratings) to browse filtering, with MovieDetail display
enhancements to enable visual verification of filter results.

**Dependencies:** Phase 10 creates centralized `DEFAULT_BROWSE_PARAMS` (in `browseDefaults.ts`) and
`browseParamUtils.ts`. Phase 11 adds certification fields to `BrowseParams` type and these utilities
rather than duplicating logic.

**Scope decisions:**

- US-only (certification_country hardcoded to "US") - simplest UX, can add country selection later
- Multi-select UI using CheckboxGroup + CheckboxCard (users may want G+PG, or PG-13+R)
- MovieDetail enhancements FIRST to enable browser testing of filter results
- Ratings: NR (Not Rated), G, PG, PG-13, R, NC-17
- Color-coded rating badges using existing Badge recipe variants (WCAG compliant across themes)

**Rating Badge Design Specs:**

| Rating | Badge Variant | Background Token | Text Token       | Rationale                    |
|--------|---------------|------------------|------------------|------------------------------|
| G      | `success`     | `success`        | `on-success`     | Green = safe for all ages    |
| PG     | `info`        | `info`           | `on-info`        | Blue = informational/neutral |
| PG-13  | `warning`     | `warning`        | `on-warning`     | Orange = parental caution    |
| R      | `error`       | `destructive`    | `on-destructive` | Red = restricted             |
| NC-17  | `error`       | `destructive`    | `on-destructive` | Red = adults only            |
| NR     | `neutral`     | `badge`          | `on-badge`       | Gray = no rating info        |

**Implementation pattern:**

```tsx
// Using Badge recipe - handles bg/text automatically
<Badge variant="warning">PG-13</Badge>

// Or manual if needed (recipe preferred)
<Box bg="warning" color="on-warning" px={3} py={1} borderRadius="md">
  PG-13
</Box>
```

**Why status variants:** Reuses existing infrastructure, ensures WCAG contrast compliance across
all themes, and color associations are intuitive (green=safe, red=restricted).

#### Backend: MovieDetail Data Extraction

- [ ] **11.1 Extract certification from TMDB release_dates**

    TMDB nests certifications in `release_dates` (per-release, per-country). Need extraction logic.

    - [ ] **11.1.a Update TMDB API call to include release_dates**
        - Add `append_to_response=release_dates` to movie detail fetch
        - File: Identify where detail API call is made

    - [ ] **11.1.b Create certification extraction helper**
        - Function: `extract_us_certification(release_dates: dict) -> str | None`
        - Logic: Find US entry → find theatrical release (type 3) or first available → return certification
        - Handle missing data gracefully (return None)

    - [ ] **11.1.c Add us_certification field to MovieDetailSchema**
        - Add `us_certification: str | None = None` to response schema
        - Named explicitly since we're extracting US MPAA rating specifically
        - Populate from extraction helper (None when no US rating exists)

    - [ ] **11.1.d Run backend tests and linting**

- [ ] **11.2 Add spoken_languages to MovieDetail response**

    TMDB returns `spoken_languages` as array of objects at top level - simpler extraction.

    - [ ] **11.2.a Create SpokenLanguageSchema**
        - Fields: `iso_639_1: str`, `english_name: str`
        - Skip `name` field (inconsistently populated per TMDB docs)

    - [ ] **11.2.b Add spoken_languages to MovieDetailSchema**
        - Add `spoken_languages: list[SpokenLanguageSchema]`
        - Extract from TMDB response

    - [ ] **11.2.c Run backend tests and linting**

#### Frontend: MovieDetail Display

- [ ] **11.3 Display certification and spoken_languages in MovieDetail**

    - [ ] **11.3.a Add certification badge to header**
        - Display next to runtime (e.g., "PG-13 · 2h 15m")
        - When `us_certification` is None: simply omit the badge (no placeholder text)
        - Layout should not break or look awkward when badge is absent
        - **Styling:** Use Badge recipe with status variants per Rating Badge Design Specs
        - Create `RatingBadge` component or helper that maps rating → Badge variant
        - Example: `G` → `<Badge variant="success">G</Badge>`
        - Recipe handles bg/text token pairing automatically (WCAG compliant)

    - [ ] **11.3.b Add spoken languages to metadata area**
        - Display as comma-separated list (e.g., "English, Japanese")
        - Place in appropriate location (near genres or below tagline)

    - [ ] **11.3.c Update TypeScript types for new fields**
        - Add `us_certification?: string` and `spoken_languages?: SpokenLanguage[]` to MovieDetail type
        - Types auto-generated from OpenAPI schema, so may just need `npm run generate-types`

    - [ ] **11.3.d Run frontend tests and type checking**

#### Frontend: Certification Filter UI

- [ ] **11.4 Add certifications to browse params and defaults**

    - [ ] **11.4.a Update BrowseParams type**
        - Add `certifications: string[]` field (array for multi-select)
        - File: `types/browseTypes.ts`
        - Default: `[]` (empty = no filter applied)

    - [ ] **11.4.b Add to DEFAULT_BROWSE_PARAMS (Phase 10 constant)**
        - Add `certifications: []` to `browseDefaults.ts`

    - [ ] **11.4.c Define certification options**
        - Add `certificationOptions` to `browseOptions.ts`
        - Values: `["NR", "G", "PG", "PG-13", "R", "NC-17"]`
        - Labels match values for clarity

- [ ] **11.5 Add CheckboxGroup + CheckboxCard UI to AdvancedFiltersPanel**

    - [ ] **11.5.a Add certification CheckboxGroup component**
        - Use `CheckboxGroup` wrapper with `CheckboxCard.Root` for each rating
        - Horizontal layout with `HStack` or `Flex wrap`
        - Compact pill-style cards (no indicator, just label)
        - Example pattern from Chakra docs: `checkbox-card-with-group`
        - **Styling:** Use same status variant colors as MovieDetail badges
        - Each card uses its rating's semantic tokens (G=success, PG=info, etc.)
        - Unselected: muted/outline appearance
        - Selected: solid background with status color + `on-*` text token
        - Reuse `RatingBadge` helper or shared `RATING_VARIANT_MAP` config

    - [ ] **11.5.b Wire to browse params state**
        - On change: update `certifications` array in browseParams
        - Selected cards show visual checked state

    - [ ] **11.5.c Update resetBrowseParams() to reset certifications**
        - Already handled by DEFAULT_BROWSE_PARAMS if Phase 10 complete (resets to `[]`)

    - [ ] **11.5.d Run frontend linting and tests**

#### Frontend: Wire Filter to API

- [ ] **11.6 Update API param mapping**

    - [ ] **11.6.a Update browseParamMapper.ts**
        - Add certification mapping in `mapBrowseParamsToApi()`
        - If `certifications.length > 0`: join with `|` (OR logic) for TMDB
        - Always include `certification_country: "US"` when certifications present
        - Example: `certifications: ["G", "PG"]` → `certification=G|PG&certification_country=US`

    - [ ] **11.6.b Update MovieQueryParams interface**
        - Add `certification?: string` and `certification_country?: string` to movieService.ts

    - [ ] **11.6.c Update browseUrlSync for array field**
        - Ensure certifications array serializes/deserializes properly in URL
        - Pattern: `?certifications=G,PG,PG-13` or similar

    - [ ] **11.6.d Run frontend type checking**

#### Backend: Complete Param Pipeline

- [ ] **11.7 Wire certification_country through backend**

    - [ ] **11.7.a Add certification_country to HTTP_TO_SERVICE_MAPPING**
        - File: param_transformer.py
        - Add: `'certification_country': 'certification_country'`
        - Note: `certification` already mapped

    - [ ] **11.7.b Add certification_country to ServiceParams**
        - File: service_params.py
        - Add: `certification_country: str | None = None`

    - [ ] **11.7.c Add certification_country to PARAM_MAPPING**
        - File: query_params.py
        - Add: `'certification_country': 'certification_country'`
        - Note: `certification` already mapped

    - [ ] **11.7.d Run backend linting and type checking**

#### Testing & Verification

- [ ] **11.8 Integration testing**

    - [ ] **11.8.a Write backend integration test for certification param**
        - Test that `/api/movies/browse?certification=PG-13&certification_country=US` works
        - Test multi-value: `certification=G|PG`
        - Verify params pass through to TMDB API call

    - [ ] **11.8.b Manual browser testing**
        - Navigate to movie detail (US film) → verify certification badge displays
        - Navigate to movie detail (non-US film) → verify no badge, layout still clean
        - Navigate to movie detail → verify spoken languages display
        - Select "PG-13" from certification filter → verify results change
        - Click through to movie detail → verify it shows "PG-13" certification
        - Select multiple ratings (G + PG) → verify both appear in results
        - Verify URL includes certifications param
        - Verify Clear button resets certifications
        - Verify active param count badge includes certifications when active

    - [ ] **11.8.c Run full quality gates**
        - All backend tests
        - All frontend tests
        - Linting (backend + frontend + markdown)
        - Type checking (Python + TypeScript)

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

| Gap                                                     | Severity | Status                                                           |
|---------------------------------------------------------|----------|------------------------------------------------------------------|
| No integration test for `original_title.desc`           | High     | **Fixed** - Added to `test_browse_sort_options.py`               |
| No test verifying alphabetical sorts bypass vote filter | High     | **Fixed** - `TestAlphabeticalSortBypassesVoteFilter` class added |
| No smoke tests with real TMDB data                      | Medium   | Defer - fragile dependency on external API                       |
| No TMDB error scenario tests (timeout, rate limit, 5xx) | Medium   | Defer - separate resilience testing effort                       |
| No tests with realistic data volumes (100+ movies)      | Low      | Defer - current tests adequate for logic verification            |
| Cross-page deduplication test marked xfail              | Low      | Known issue, tracked separately                                  |
| No filter combination tests (genre + year + rating)     | Low      | Defer - edge case coverage                                       |

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

| Category                       | Count   | Reason                                                |
|--------------------------------|---------|-------------------------------------------------------|
| Nikkatsu 1971-1988             | 979     | `Nikkatsu Roman Porno era (1971-1988) bulk blacklist` |
| Non-Nikkatsu (user-identified) | 8       | `Problematic content (manual verification Phase 8)`   |
| **Total added**                | **987** |                                                       |

**Final blacklist count:** 2,110 movies (was 1,123)
