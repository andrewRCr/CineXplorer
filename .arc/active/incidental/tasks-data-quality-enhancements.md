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

## Scope

### Will Do

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

### **Phase 1:** Production Company Blacklist Infrastructure

**Purpose:** Create Django model for blacklisting production companies, mirroring movie blacklist pattern.

- [x] **1.1 Create movie blacklist model** *(completed prior to task list creation)*

    - [x] **1.1.1 Create `BlacklistedMovie` model in `movie/models.py`**
        - Fields: `tmdb_id` (unique, indexed), `reason`, `added_at`
        - Registered in admin for easy management

    - [x] **1.1.2 Create and run migration**
        - Migration: `0001_add_blacklisted_movie.py`

    - [x] **1.1.3 Integrate into `apply_buffer_if_needed` in `pagination.py`**
        - `get_blacklisted_ids()` function with 5-minute cache
        - Blacklisted IDs filtered from initial results and seeded into `seen_ids`

- [ ] **1.2 Create production company blacklist model**

    **Goal:** Enable filtering by production company for studios that exclusively produce problematic content.

    - [ ] **1.2.1 Create `BlacklistedProductionCompany` model in `movie/models.py`**
        - Fields: `tmdb_company_id` (unique, indexed), `name`, `reason`, `added_at`
        - `name` field for human readability (TMDB IDs aren't meaningful)
        - Register in admin with list display and search

    - [ ] **1.2.2 Create and run migration**
        - Verify migration applies cleanly

    - [ ] **1.2.3 Run quality gates**
        - Linting: 0 violations
        - Type checking: 0 errors

### **Phase 2:** Research Problematic Production Companies

**Purpose:** Identify studios that exclusively produce adult/exploitation content mislabeled in TMDB.

**Note:** Not limited to Japanese studios - sample data skewed Japanese due to Z-A sort unicode clustering.
Any country may have studios producing mislabeled adult content.

- [ ] **2.1 Research studios from sample data and patterns**

    **Goal:** Build verified list of companies to blacklist, with documentation.

    - [ ] **2.1.1 Research Japanese studios from initial sample**
        - Nikkatsu Corporation (known for "Roman Porno" division 1971-1988)
        - Pink Pineapple
        - Osu Production
        - Okura Pictures
        - Sekine Production
        - Determine: Does each company ALSO produce legitimate content?
        - Document: Exclusive adult studio vs mixed catalog

    - [ ] **2.1.2 Search for additional studios (any country)**
        - Query TMDB for movies with similar patterns (low vote, short runtime, Romance/Drama)
        - Extract production company names from results
        - Research each for content exclusivity
        - Document country of origin for reference

- [ ] **2.2 Document research findings**

    - [ ] **2.2.1 Update notes file with research results**
        - Company name, TMDB ID, verdict (blacklist/skip), rationale
        - Distinguish exclusive adult studios from mixed catalogs

### **Phase 3:** Integrate Production Company Filtering

- [ ] **3.1 Add production company filtering to buffer logic**

    **Goal:** Exclude movies from blacklisted production companies during result processing.

    - [ ] **3.1.1 Create `get_blacklisted_company_ids()` function in `pagination.py`**
        - Mirror `get_blacklisted_ids()` pattern
        - 5-minute cache TTL
        - Return set of TMDB company IDs

    - [ ] **3.1.2 Determine filtering approach**
        - Option A: Filter in `apply_buffer_if_needed` (requires company data in response)
        - Option B: Filter in `apply_filters` before buffer
        - Document decision based on TMDB response structure

    - [ ] **3.1.3 Implement filtering**
        - Add filtering logic per decision
        - Handle movies with multiple production companies (exclude if ANY is blacklisted)

    - [ ] **3.1.4 Run quality gates**
        - All tests pass
        - Linting: 0 violations
        - Type checking: 0 errors

### **Phase 4:** Centralize Filter Policy (DRY Refactor)

**Purpose:** Single source of truth for vote count filtering rules across all views/sorts.

- [ ] **4.1 Create centralized filter policy configuration**

    - [ ] **4.1.1 Create filter policy in `filtering.py`**
        - Define policy dict/dataclass for each view type
        - Include: `default_min_vote_count`, sort-specific overrides
        - Document rationale for each rule

    - [ ] **4.1.2 Refactor `api.py` to use centralized policy**
        - Remove inline bypass logic (lines 256-264)
        - Import and apply policy from `filtering.py`
        - Verify identical behavior

    - [ ] **4.1.3 Refactor `movie_service.py` to use centralized policy**
        - Update `get_now_playing_movies` and `get_upcoming_movies`
        - Reference policy instead of hardcoded `min_vote_count = None`

    - [ ] **4.1.4 Update test configs to reference same policy**
        - `endpoint_configs.py` should import from `filtering.py`
        - Single source of truth for test expectations

- [ ] **4.2 Revisit `original_title` sort vote threshold**

    **Goal:** Determine if alphabetical sorts should have reduced (not zero) vote threshold.

    - [ ] **4.2.1 Analyze tradeoffs**
        - Current: `None` (no threshold) - lets low-quality content through
        - Option: Lower threshold (5?) - filters worst noise, keeps legitimate obscure films
        - Document decision and rationale

    - [ ] **4.2.2 Implement decision**
        - Update centralized policy with chosen threshold
        - If changed, verify no unintended filtering of legitimate content

    - [ ] **4.2.3 Run quality gates**
        - All tests pass (update test expectations if threshold changed)
        - Linting: 0 violations

### **Phase 5:** Populate Blacklists

- [ ] **5.1 Populate production company blacklist**

    - [ ] **5.1.1 Add verified exclusive adult studios to blacklist**
        - Use Django admin or migration
        - Include reason for each entry

- [ ] **5.2 Populate movie blacklist with known problematic titles**

    - [ ] **5.2.1 Add sample problematic movies identified during research**
        - TMDB IDs: 405342, 634220, 969777, 153726, 202438, 1263190 (if not caught by company filter)
        - Only add movies that slip through company filter

### **Phase 6:** Verification and Quality Gates

- [ ] **6.1 Manual verification**

    - [ ] **6.1.1 Test Z-A sort for problematic content**
        - Browse with `original_title.desc` sort
        - Verify blacklisted companies/movies excluded
        - Document any remaining issues

    - [ ] **6.1.2 Test other views for regressions**
        - Popular, Top Rated, Now Playing, Upcoming
        - Verify legitimate content not filtered

- [ ] **6.2 Final quality gates**

    - [ ] **6.2.1 Run full backend test suite**
        - All tests pass

    - [ ] **6.2.2 Run linting and type checking**
        - 0 violations, 0 errors

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
