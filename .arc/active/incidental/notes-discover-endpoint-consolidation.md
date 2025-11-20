# Notes: Discover Endpoint Consolidation

**Created:** 2025-10-30
**Task List:** `.arc/active/incidental/tasks-discover-endpoint-consolidation.md` (created from these notes)
**Context:** Investigation during test organization Phase 3 revealed architectural issues requiring immediate fix
before continuing test splits

---

## Executive Summary

**What We Discovered:**

- Frontend sends filter parameters to now-playing/upcoming endpoints, but backend silently drops them
- Upcoming endpoint returns no results (broken)
- Architecture is inconsistent: discover supports filtering, list endpoints don't
- Testing gaps allowed these issues to go unnoticed

**Why This Matters:**

- We're about to split tests by endpoint (Phase 4 of test organization)
- Can't name tests correctly if endpoints will change
- Can't test broken functionality reliably

**Decision:** Pause test organization, fix endpoint architecture and testing, THEN resume with correct naming.

**Approach:** Consolidate all movie browsing around discover endpoint using thin wrapper pattern (Option 1A)

---

## Investigation Summary

### How We Got Here

**During test organization Phase 3 (2025-10-30):**

1. Analyzing test_movie_api.py for splitting
2. Noticed tests primarily use discover endpoint, not now-playing/upcoming
3. Tested in browser: filtering doesn't work on Now Playing page
4. Tested in browser: Upcoming page shows NO results at all
5. Checked backend logs: filters being sent but dropped

**Key Insight:** We've been developing exclusively with "Popular" (which uses discover), so broken endpoints
went unnoticed.

### What Investigation Revealed

**TMDB API Research:**

- TMDB explicitly states: "use discover for filtering"
- List endpoints (`/movie/popular`, `/movie/now_playing`, etc.) are convenience wrappers
- List endpoints accept ONLY `language`, `page`, `region` - NO filtering support
- All are "discover with presets" behind the scenes

**Our Architecture:**

- API routes for now-playing/upcoming only accept page parameter (broken)
- Service layer accepts filters but can't send them to TMDB (architectural confusion)
- Frontend sends filters that are silently ignored (bad UX)
- We use discover for "popular" already (correct approach, but not standardized)

**Testing Gaps:**

- Now Playing endpoint has no filter tests
- Upcoming endpoint has no "returns results" test
- No DRY test structure for common endpoint behaviors
- Each endpoint tested in isolation, patterns not verified across all endpoints

---

## Phase 1.1: Upcoming Endpoint Diagnosis (COMPLETED 2025-10-31)

### Root Cause: region + primary_release_date Incompatibility

**Finding:** Upcoming endpoint returns NO results because our implementation uses `region: "US"` with
`primary_release_date` filters, which are **incompatible** per TMDB API research (see
`.arc/active/incidental/research-tmdb-api-date-filtering.md` lines 77-88).

**Evidence:**

1. **Our Implementation** (movie_service.py:645-658):

   ```python
   params: TMDBParams = {
       "region": "US",  # ← PROBLEMATIC
       "primary_release_date.gte": min_date,
       "primary_release_date.lte": max_date,
       # ...
   }
   ```

2. **Test Results**:
   - WITH `region="US"`: 0 results from TMDB
   - WITHOUT `region`: 1626 results for 30-day window, 2039 for 60-day window
   - System date: 2025-10-31
   - Test window: Oct 31 - Nov 30 (30 days) or Oct 31 - Dec 30 (60 days)

3. **TMDB Native Endpoint Behavior**:
   - `/movie/upcoming` reports date range: Nov 5 - Nov 26 (3 weeks ahead)
   - BUT returns movies from July-October (outside reported range)
   - Shows TMDB's own bug (confirmed in research doc)

4. **Our Endpoint Behavior**:
   - Reports: 1625 total results (from TMDB)
   - Returns: 0 movies (all filtered out by backend)
   - `next_tmdb_page_start: 7` (buffer fetched 6 pages, gave up at safety limit)
   - Backend filtering correctly removes out-of-range dates from TMDB

### TMDB Coverage Analysis

**Now Playing endpoint:**

- Date range: Sept 24 to Nov 5 (42-day window)
- Coverage: 37 days PAST + 5 days FUTURE
- Logic: "Movies in theaters now + this coming weekend"
- Results: 6,497 movies

**Upcoming endpoint:**

- Date range: Nov 5 to Nov 26 (21-day window)
- Coverage: Starts exactly where Now Playing ends
- Logic: "Plan ahead for next few weeks"
- Results: 1,348 movies

**Key Finding:** TMDB endpoints are **adjacent** (no gap, no overlap). The 5-day buffer isn't arbitrary - it's architectural.
It defines the boundary between "theater planning window" (Now Playing) and "future anticipation" (Upcoming).

### Date Window Recommendation

**Optimal Configuration** (based on testing and TMDB coverage analysis):

```python
# Remove region parameter (incompatible with primary_release_date)
today = datetime.now(tz=UTC)
min_date = (today + timedelta(days=5)).strftime("%Y-%m-%d")  # Start where Now Playing ends
max_date = (today + timedelta(days=60)).strftime("%Y-%m-%d")  # 60-day window from today

params: TMDBParams = {
    "include_adult": False,
    "include_video": False,
    "language": "en-US",
    # "region": "US",  # ← REMOVE (incompatible)
    "sort_by": "popularity.desc",
    "with_release_type": "2|3",
    "primary_release_date.gte": min_date,  # today + 5
    "primary_release_date.lte": max_date,  # today + 60
}
```

**Rationale:**

1. **Remove `region`**: Research confirms incompatibility with `primary_release_date` filters (TMDB behavior becomes undefined)
2. **Start at today + 5 days**: Matches TMDB's architectural boundary, prevents overlap with Now Playing
3. **55-day effective window** (days 5-60): Better coverage than TMDB's 21-day window, supports "plan ahead" use case
4. **Date-constrained with release_type**: Preserves "upcoming theatrical releases" semantics
5. **Keep `primary_release_date`**: Correct choice per research (filters on world premiere date)

### Now Playing Verification Needed

**Status**: Not yet tested in Phase 1.1 (focused on upcoming diagnosis)
**Next**: Should verify now-playing also works without `region` parameter
**Note**: Research doc (lines 77-88) confirms same incompatibility applies to ALL primary_release_date usage

---

## Phase 1.2: Now Playing Endpoint Investigation (COMPLETED 2025-10-31)

**Purpose:** Investigate two known issues with now-playing endpoint before proceeding to test coverage audit.

### Issue #1: Filter/Sort Parameters Not Working

**Root Cause Identified:**

API route signature mismatch - the endpoint doesn't accept filter parameters from the frontend.

**Evidence:**

1. **API Route** (`backend/apps/movie/api.py:117-127`):

   ```python
   @movies_router.get("/now-playing", ...)
   def get_now_playing_movies(
       request: HttpRequest,
       params: PaginationParams,  # ← Only accepts page parameter
   ):
       response = _movie_service.get_now_playing_movies(page=params.page or 1)
       # ← No filter parameters passed to service
   ```

2. **Service Method** (`backend/apps/movie/services/movie_service.py:566-573`):

   ```python
   def get_now_playing_movies(
       self,
       page: int = 1,
       year_min: int | None = None,     # ← Service CAN accept filters
       year_max: int | None = None,
       rating_min: float | None = None,
       rating_max: float | None = None,
   ) -> PaginatedMovieResponseSchema:
   ```

3. **Comparison with Discover Endpoint** (`backend/apps/movie/api.py:161-165`):

   ```python
   @movies_router.get("/discover", ...)
   def discover_movies(
       request: HttpRequest,
       filters: FilterParams,  # ← Accepts full FilterParams (genres, ratings, years, sort, etc.)
   ):
   ```

**Finding:** The API route only accepts `PaginationParams` (page only), not `FilterParams` (genres, ratings, sort,
etc.). Frontend sends filters, but they're silently ignored by Django Ninja because they're not in the route signature.

### Issue #2: Date Range Coverage Gap

**Root Cause Identified:**

Using TMDB's native `/movie/now_playing` endpoint with uncontrollable date range instead of discover wrapper.

**Evidence:**

1. **Current Implementation** (`backend/apps/movie/services/movie_service.py:594-596`):

   ```python
   def fetch_now_playing_page(page_num: int) -> TMDBMovieSearchResponse:
       """Fetch a specific now playing page."""
       page_response = self._tmdb_client.get_now_playing_movies(page=page_num)
       # ← Calls TMDB's native endpoint with NO date parameters
   ```

2. **TMDB Client** (`backend/apps/core/services/tmdb_api_client.py:545-557`):

   ```python
   def get_now_playing_movies(self, page: int = 1, **kwargs: object) -> ApiResponse:
       params = {"page": page, **kwargs}
       return self.get("movie/now_playing", params)
       # ← Calls TMDB's native /movie/now_playing with TMDB's default date range
   ```

3. **Actual Date Range Behavior** (tested 2025-10-31):
   - System date: Oct 31, 2025
   - Returns movies through: Oct 22, 2025 (9 days in the PAST)
   - Expected per ADR-002: Through today + 5 days (Nov 5) for "theater planning window"
   - Gap: 13 days missing (Oct 23 - Nov 5)

4. **TMDB Coverage Analysis** (from Phase 1.1, lines 111-126):
   - TMDB's native now_playing: Sept 24 - Nov 5 (42-day window)
   - TMDB's date range: 37 days past + 5 days future
   - Endpoint boundary: Ends at today + 5, where Upcoming begins

**Finding:** TMDB's native `/movie/now_playing` endpoint has its own date range logic that we cannot control. To match
ADR-002 requirements (date range preset for "current window around today" extending to today + 5 days), we need to use
the discover endpoint with explicit date filters, similar to the upcoming endpoint fix.

### Recommended Fixes

**Fix #1: Add Filter Parameter Support**

Update API route to accept and pass through filter parameters:

```python
@movies_router.get("/now-playing", response=PaginatedMovieResponseSchema, auth=None)
def get_now_playing_movies(
    request: HttpRequest,
    filters: FilterParams,  # ← Change from PaginationParams to FilterParams
):
    """Retrieve currently playing movies with pagination, filtering, and user-specific data."""
    # Extract parameters from filters schema
    # Pass to service layer with date presets (protected keys)
    # Service should call discover endpoint, not native now_playing
```

**Fix #2: Convert to Discover Wrapper with Date Preset**

Replace native TMDB endpoint call with discover wrapper pattern (same as upcoming endpoint):

1. **Date Range Configuration:**
   - Start: today - 30 days (past releases still in theaters)
   - End: today + 5 days (upcoming weekend, matches TMDB boundary)
   - Total window: 35 days
   - Release type: `2|3` (theatrical)

2. **Implementation Pattern** (follow upcoming endpoint):
   - Use discover endpoint via `TMDBApiClient.discover_movies()`
   - Add `primary_release_date.gte` and `primary_release_date.lte` parameters
   - Remove any `region` parameter (incompatible with date filters per Phase 1.1 findings)
   - Add `min_vote_count` parameter threading (allow override, default to MIN_VOTE_COUNT)
   - Add `with_release_type=2|3` preset

3. **Protected Keys** (per ADR-002):
   - Date range (primary_release_date.gte/lte)
   - Release type (with_release_type)
   - User CAN filter by genre, rating, keywords
   - User CAN change sort order

**Rationale:**

1. **Architecture Alignment**: Matches ADR-002 thin wrapper pattern and upcoming endpoint implementation
2. **Filter Support**: Enables genre/rating/sort filtering that frontend already sends
3. **Date Control**: Explicit date range ensures "theater planning window" coverage (past + upcoming weekend)
4. **Consistency**: Both time-constrained endpoints (now-playing, upcoming) use same discover-based pattern
5. **No Region Issues**: Avoid region + date incompatibility discovered in Phase 1.1

---

## TMDB API Research Findings

### What TMDB Actually Supports

**Verified via TMDB API documentation and forum discussions (2025-10-30):**

#### List Endpoints (Pre-computed, Curated)

**All list endpoints accept ONLY:**

- `language` - Localization
- `page` - Pagination
- `region` - ISO 3166-1 country code for release dates

**`/movie/popular`:**

- Default preset: `sort_by=popularity.desc`
- NO genre filtering, NO custom sorting, NO advanced filters

**`/movie/top_rated`:**

- Default preset: `sort_by=vote_average.desc`, `without_genres=99,10755`, `vote_count.gte=200`
- NO custom filtering

**`/movie/now_playing`:**

- Default preset: `with_release_type=2|3` (theatrical), date range (current releases)
- NO custom filtering

**`/movie/upcoming`:**

- Default preset: `with_release_type=2|3`, date range (future releases)
- NO custom filtering

#### Discovery Endpoint (Full Filtering)

**`/discover/movie`:**

- **40+ filter parameters supported**
- **All sorting options**
- **Genre, rating, date, runtime, keyword, people filtering**
- **Region, language, certification filtering**

### TMDB's Official Recommendation

**From TMDB forum (official staff response):**

> "The now_playing call is really just a discover call behind the scenes, and **if you would like to
> tweak any of the default filters you should use the discover endpoint**."

**Translation:** TMDB explicitly designed discover for filtering. List endpoints are convenience wrappers
with fixed presets.

---

## Chosen Solution: Option 1A - Discover Wrappers with Semantic URLs

### Architecture Pattern

**User-facing URLs (clean, semantic):**

- `/movies/popular`
- `/movies/now-playing`
- `/movies/top-rated`
- `/movies/upcoming`

**Backend implementation (thin wrappers around discover):**

```python
@movies_router.get("/popular", response=PaginatedMovieResponseSchema, auth=None)
def get_popular_movies(request: HttpRequest, filters: FilterParams):
    """Popular movies - sorted by popularity with full filtering support."""
    # Merge user filters with popular preset
    preset = {'sort_by': 'popularity.desc'}
    merged_filters = merge_with_preset(filters, preset)
    return discover_movies(request, merged_filters)

@movies_router.get("/now-playing", response=PaginatedMovieResponseSchema, auth=None)
def get_now_playing_movies(request: HttpRequest, filters: FilterParams):
    """Now playing movies - theatrical releases with full filtering support."""
    # Merge user filters with now-playing preset
    today = datetime.now(tz=UTC).strftime("%Y-%m-%d")
    max_date = (datetime.now(tz=UTC) + timedelta(days=60)).strftime("%Y-%m-%d")
    preset = {
        'with_release_type': '2|3',
        'primary_release_date.gte': today_minus_30_days,  # TBD: adjust window
        'primary_release_date.lte': max_date
    }
    merged_filters = merge_with_preset(filters, preset)
    return discover_movies(request, merged_filters)

# Similar for top-rated and upcoming...
```

**All filtering logic stays in `discover_movies()` - one implementation, four entry points.**

### Why This Approach

**Benefits:**

1. ✅ Clean, semantic URLs (user never sees `/discover?sort_by=...`)
2. ✅ All filtering logic in one place (DRY, maintainable)
3. ✅ Consistent behavior across all endpoints
4. ✅ API is self-documenting (`/api/movies/popular` is clear)
5. ✅ Backend controls presets (frontend doesn't need TMDB knowledge)
6. ✅ Easy to add new preset views (just add a wrapper route)
7. ✅ Aligns with TMDB's design intent (use discover for filtering)

**What Changes:**

- API route handlers become ~10-20 lines each (thin wrappers)
- Service layer: keep discover_movies(), remove now_playing/upcoming implementations
- All filtering/pagination/buffer logic stays in discover implementation
- Frontend: no changes needed (routes stay the same, filters now work)

---

## Critical Questions to Answer During Implementation

### 1. Investigation: Why Does Upcoming Fail?

**Current implementation:** `movie_service.py:645-658`

```python
today = datetime.now(tz=UTC)
min_date = today.strftime("%Y-%m-%d")
max_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")

params = {
    "with_release_type": "2|3",
    "primary_release_date.gte": min_date,
    "primary_release_date.lte": max_date,
}
```

**Possible causes:**

- **30-day window too narrow?** TMDB might not have movies in this specific range
- **Today as min_date?** Should be today or slightly before (movies "coming soon")?
- **Region mismatch?** Code removed region param due to compatibility issues
- **TMDB data quality?** Their "upcoming" data might be sparse
- **Release type filter too strict?** 2|3 is theatrical only

**Investigation tasks:**

1. Test discover directly with these exact parameters via curl/Postman
2. Test with wider date range (90 days, 180 days)
3. Test with min_date = today - 7 days (include recent releases as "upcoming")
4. Test without region parameter
5. Check TMDB's own `/movie/upcoming` endpoint for comparison
6. Document findings and determine correct window

**Decision needed:** What date range should "upcoming" use?

- Option A: today → today+30 (current, may be too narrow)
- Option B: today → today+90 (wider window)
- Option C: today-7 → today+60 (include very recent releases)
- Option D: Match TMDB's upstream endpoint behavior

### 2. Filter Subset Rules: What Filters Make Sense Per Endpoint?

**Should all endpoints accept ALL filters?**

**Analysis:**

**Popular (`sort_by=popularity.desc`):**

- ✅ Genre filters - "popular action movies"
- ✅ Rating filters - "popular movies rated 8+"
- ✅ Keyword filters - "popular heist movies"
- ✅ People filters - "popular movies with Tom Hanks"
- ✅ Date/year filters - "popular movies from 2020s"
- ⚠️ Sort override - user changes to `release_date.desc`? (contradicts "popular")

**Now Playing (theatrical releases with date range):**

- ✅ Genre filters - "action movies now playing"
- ✅ Rating filters - "highly rated movies now playing"
- ✅ Keyword filters - "heist movies now playing"
- ✅ People filters - "movies with Tom Hanks now playing"
- ❌ Date/year filters - contradicts preset date range
- ❌ Sort override - date range already implies recency

**Top Rated (`sort_by=vote_average.desc`, `vote_count.gte=200`):**

- ✅ Genre filters - "top rated sci-fi movies"
- ✅ Keyword filters - "top rated time travel movies"
- ✅ People filters - "top rated movies with Meryl Streep"
- ✅ Date/year filters - "top rated movies from 1990s"
- ⚠️ Rating filters - might contradict "top rated" nature
- ❌ Sort override - defeats "top rated" purpose

**Upcoming (future releases with date range):**

- ✅ Genre filters - "upcoming action movies"
- ✅ Rating filters - "highly anticipated movies" (if they have ratings)
- ✅ Keyword filters - "upcoming superhero movies"
- ✅ People filters - "upcoming movies with director X"
- ❌ Date/year filters - contradicts preset date range
- ❌ Sort override - date range already implies future

**Recommendation:** Document three filter categories per endpoint:

1. **Encouraged** - Makes semantic sense, should be supported
2. **Questionable** - May contradict preset, allow but document behavior
3. **Blocked** - Contradicts preset entirely, reject with helpful error

**Decision needed:**

- Accept all filters everywhere (simplest, let user decide)?
- Block contradicting filters (stricter, prevents confusion)?
- Allow all but document which are "weird" (middle ground)?

### 3. Preset Merge Strategy: How Do User Filters + Presets Interact?

**Conflict scenarios:**

**Scenario 1: User sort contradicts preset**

```python
# Preset (popular)
{'sort_by': 'popularity.desc'}

# User requests
{'sort_by': 'release_date.desc'}

# Result options:
# A) User wins - Now shows recent movies, NOT popular (confusing?)
# B) Preset wins - Ignore user sort (limiting?)
# C) Error - "Can't override sort on this endpoint" (strict?)
```

**Scenario 2: User date range on date-based preset**

```python
# Preset (now-playing)
{'primary_release_date.gte': '2025-10-01', 'primary_release_date.lte': '2025-11-30'}

# User requests
{'primary_release_date.gte': '2020-01-01', 'primary_release_date.lte': '2025-12-31'}

# Result options:
# A) User wins - Defeats "now playing" purpose
# B) Preset wins - User filter ignored
# C) Intersection - Use most restrictive (preset in this case)
# D) Error - "Date filters not allowed on this endpoint"
```

**Scenario 3: User filters ADD to preset**

```python
# Preset (popular)
{'sort_by': 'popularity.desc'}

# User requests
{'genres': '28', 'vote_average.gte': '7.0'}

# Result: ✅ Merge cleanly - "popular action movies rated 7+"
```

**Recommended merge rules:**

**General principle:** Presets define the "identity" of the endpoint, user filters narrow/refine

**Rules:**

1. **Additive filters** (genres, keywords, people, ratings): Always merge (user + preset)
2. **Conflicting parameters** (sort_by, date ranges on date-based endpoints):
   - **Preset wins** - Preserve endpoint semantics
   - **OR**: Allow override with warning in logs
3. **Compatible parameters** (date range on non-date-based endpoints): User wins

**Implementation approach:**

```python
def merge_with_preset(user_filters, preset, protected_keys=None):
    """Merge user filters with endpoint preset.

    Args:
        user_filters: Filters from user request
        preset: Endpoint's default filters
        protected_keys: Keys that preset overrides (e.g., ['sort_by'] for popular)

    Returns:
        Merged filter dict with preset taking precedence for protected keys
    """
    merged = {**user_filters}

    # Protected keys: preset always wins
    for key in (protected_keys or []):
        if key in preset:
            merged[key] = preset[key]

    # Non-protected preset keys: add if not present in user filters
    for key, value in preset.items():
        if key not in protected_keys and key not in user_filters:
            merged[key] = value

    return merged

# Usage
popular_filters = merge_with_preset(
    user_filters,
    {'sort_by': 'popularity.desc'},
    protected_keys=['sort_by']  # User can't override sort on popular
)
```

**Decision needed:**

- Define protected_keys for each endpoint
- Document merge behavior in API docs
- Add tests verifying merge behavior

### 4. Test Organization Naming Strategy

**Since we're refactoring endpoints, how should we name tests?**

**Current split proposal:**

```
test_movie_api.py (1512 lines) → 7 files:
- test_paginated_endpoints_contract.py
- test_discover_filtering.py
- test_discover_filter_integration.py
- test_discover_pagination.py
- test_discover_deduplication.py
- test_genres_keywords_people.py
- test_movie_detail.py
```

**After consolidation, should it be:**

**Option A: Keep "discover" in names** (implementation-focused)

```
test_discover_filtering.py
test_discover_pagination.py
test_discover_endpoints.py  # Tests popular/now-playing/top-rated/upcoming wrappers
```

**Option B: Use behavior names** (behavior-focused)

```
test_filtering_behavior.py
test_pagination_behavior.py
test_curated_endpoints.py  # Tests popular/now-playing/top-rated/upcoming
```

**Option C: Use endpoint names** (user-focused)

```
test_popular_endpoint.py
test_now_playing_endpoint.py
test_top_rated_endpoint.py
test_upcoming_endpoint.py
test_filtering_shared.py    # Shared filtering behavior
test_pagination_shared.py   # Shared pagination behavior
```

**Recommendation: Hybrid approach**

- Keep discover-named files for core behavior (filtering, pagination, buffer, dedup)
- Add curated_endpoints file for wrapper-specific tests
- Rationale: Most tests are about discover behavior, wrappers are thin (~10 lines each)

**Decision needed:** Finalize naming before Phase 4 test splits

---

## Featured Page and Browse Architecture Decision

### Context

The protected keys pattern (documented above) creates a UX constraint: curated endpoints must disable certain filter
controls to preserve their semantic identity.

**Analysis of originally planned endpoints:**

Two categories emerged:

1. **Sort-based** (Popular, Top Rated): Just sort preferences, already exist in browse UI controls
2. **Date-constrained** (Now Playing, Upcoming): Genuine time-based contexts that can't be replicated with filters

**Key insight:** Popular/Top Rated are redundant as separate endpoints - they're sort options, not distinct browsing
contexts.

### Decision: Featured Page + Simplified Browse Architecture

**Documented in:** ADR-002 (`.arc/reference/adr/adr-002-featured-page-and-browse-architecture.md`)

**Routing structure:**

- `/` → Redirects to `/featured`
- `/featured` → Featured/hero page (trending showcase, navigable in nav as "Featured")
- `/browse` → General discover, full filter control, defaults to popularity sort (NO protected keys)
- `/browse/now-playing` → Date-constrained, filterable except date range
- `/browse/upcoming` → Date-constrained, filterable except date range

**Why `/browse/*` instead of `/movies/*`?**

- CineXplorer context makes "browse movies" obvious
- Action-oriented (parallel with `/search`)
- Leaves `/browse` path available for general discover
- Healthy separation: frontend (actions) vs. backend (domain)

**Backend endpoints (3 instead of 4):**

1. `/api/movies/discover` - Core implementation (unchanged)
2. `/api/movies/now-playing` - Thin wrapper with date/release-type preset
3. `/api/movies/upcoming` - Thin wrapper with future date/release-type preset

**NOT implemented:**

- ~~`/api/movies/popular`~~ - Browse page calls discover with default `sort_by=popularity.desc`
- ~~`/api/movies/top-rated`~~ - User selects via browse UI sort controls

**Navigation structure:**

1. Featured → `/featured` (Hero/trending, default landing, navigable)
2. Browse → `/browse` (General discovery, full control)
3. Now Playing → `/browse/now-playing` (Time-constrained)
4. Upcoming → `/browse/upcoming` (Time-constrained)

**Immediate implementation (this task list):**

1. **Featured stub page** at `/featured`:
   - Welcome message: "Welcome to CineXplorer"
   - Browse navigation links
   - Minimal functional design (no hero styling yet)

2. **Browse pages**:
   - `/browse` - Full filter control, defaults to popularity
   - `/browse/now-playing` - Filterable except dates
   - `/browse/upcoming` - Filterable except dates

3. **Research and planning** (Phase 1.4):
   - Create `notes-featured-page-design.md`
   - Research TMDB trending/popular endpoints
   - Research industry patterns (TMDB, Letterboxd, Netflix)
   - Document content strategy for Featured page

**Future implementation (separate task list):**

- Rich Featured page with trending collections
- Horizontal scrolling sections
- Strategic CTAs
- Timing: After current active task lists complete

### Impact on Current Work

**Simplified from 4 endpoints to 3:**

- Less testing required (3 curated endpoints, not 4)
- No popular/top-rated wrapper implementations needed
- Browse page tests discover endpoint directly

**Task list updates:**

- **Phase 1.4**: Create notes file, research Featured page patterns and TMDB endpoints
- **Phase 2.5**: Write tests for Featured stub page and `/browse/*` routing
- **Phase 3.5**: Implement Featured stub and browse routing
- **Phase 4**: Manual testing includes Featured page

**Routing changes:**

- Frontend: `/featured`, `/browse`, `/browse/now-playing`, `/browse/upcoming`
- Backend: `/api/movies/discover`, `/api/movies/now-playing`, `/api/movies/upcoming`
- Navigation components need route updates
- Tests need route updates

---

## Implementation Plan

**See task list:** `.arc/active/incidental/tasks-discover-endpoint-consolidation.md`

The implementation plan has been formalized into a properly structured task list following test-first protocol and
incidental work formatting standards. Key phases:

1. **Phase 1:** Investigation & Test Gap Analysis (diagnose upcoming, audit coverage, design DRY patterns, Featured page
   research)
2. **Phase 2:** Write Comprehensive Tests (test-first: merge logic tests, endpoint tests for 3 curated views, upcoming
   fixes, Featured stub tests)
3. **Phase 3:** Architecture Implementation (implement merge helper, convert 2 routes to wrappers - now-playing/upcoming,
   implement Featured stub, update routing to `/browse/*`)
4. **Phase 4:** Frontend Updates & Manual Testing (regenerate types, browser testing with new routing, documentation)
5. **Phase 5:** Verification & Cleanup (quality gates, code review, atomic commits)

**Simplified architecture:**

- 3 backend endpoints (discover, now-playing, upcoming) instead of 4
- `/browse` page calls discover directly (no popular/top-rated wrappers)
- Featured page at `/featured` (navigable, serves as landing + trending destination)
- All tests placed in forward-compatible locations for test organization Phase 4+ completion

---

## Filter Rules Summary (To Be Finalized)

### Popular Endpoint

**Preset:**

```python
{'sort_by': 'popularity.desc'}
```

**Recommended filters:**

- ✅ genres - "popular action movies"
- ✅ vote_average_gte/lte - "popular highly-rated movies"
- ✅ primary_release_year - "popular movies from 2020"
- ✅ with_keywords - "popular heist movies"
- ✅ with_people - "popular movies with actor X"

**Questionable filters:**

- ⚠️ sort_by override - Contradicts "popular" identity (decision: preset wins)

**Protected keys:** `['sort_by']`

### Now Playing Endpoint

**Preset:**

```python
{
    'with_release_type': '2|3',  # Theatrical
    'primary_release_date.gte': '<today_minus_N_days>',  # TBD in Phase 1.1
    'primary_release_date.lte': '<today_plus_N_days>',   # TBD in Phase 1.1
}
```

**Recommended filters:**

- ✅ genres - "action movies now playing"
- ✅ vote_average_gte/lte - "highly-rated movies now playing"
- ✅ with_keywords - "superhero movies now playing"
- ✅ with_people - "movies with actor X now playing"

**Questionable/blocked filters:**

- ❌ primary_release_date - Contradicts date range preset (decision: preset wins)
- ❌ primary_release_year - Contradicts date range preset (decision: preset wins)
- ⚠️ sort_by override - May contradict recency (decision: TBD)

**Protected keys:** `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`

### Top Rated Endpoint

**Preset:**

```python
{
    'sort_by': 'vote_average.desc',
    'without_genres': '99,10755',  # Exclude documentary, TV movies
    'vote_count.gte': '200'
}
```

**Recommended filters:**

- ✅ genres - "top rated sci-fi movies"
- ✅ primary_release_year - "top rated movies from 1990s"
- ✅ with_keywords - "top rated time-travel movies"
- ✅ with_people - "top rated movies with director X"

**Questionable filters:**

- ⚠️ vote_average_gte/lte - Might contradict "top rated" (decision: allow, narrowing is okay)
- ⚠️ sort_by override - Defeats "top rated" purpose (decision: preset wins)

**Protected keys:** `['sort_by', 'vote_count.gte']`

### Upcoming Endpoint

**Preset:**

```python
{
    'with_release_type': '2|3',  # Theatrical
    'primary_release_date.gte': '<today>',              # TBD in Phase 1.1
    'primary_release_date.lte': '<today_plus_N_days>',  # TBD in Phase 1.1
}
```

**Recommended filters:**

- ✅ genres - "upcoming action movies"
- ✅ with_keywords - "upcoming superhero movies"
- ✅ with_people - "upcoming movies with actor X"

**Questionable/blocked filters:**

- ❌ primary_release_date - Contradicts date range preset (decision: preset wins)
- ❌ primary_release_year - Contradicts date range preset (decision: preset wins)
- ⚠️ vote_average filters - Upcoming movies may not have ratings yet (decision: allow but may return few results)

**Protected keys:** `['with_release_type', 'primary_release_date.gte', 'primary_release_date.lte']`

---

## Impact on Test Organization

### Why We Must Fix This First

**Can't proceed with test organization Phase 4 (file splits) because:**

1. **Naming will change:** Tests currently reference "discover", but wrappers will be "popular/now-playing/etc."
2. **Broken functionality:** Can't reliably test broken endpoints
3. **Architecture uncertainty:** Don't know final endpoint structure
4. **Test count will change:** New comprehensive tests add 60-80 tests

**After this work:**

- Endpoint architecture is stable and standardized
- All endpoints work with filtering
- Comprehensive test coverage prevents regressions
- Clear naming for test files based on actual endpoints

### Updated Test Split Strategy

**After consolidation, test_movie_api.py (1512 lines + new tests) → 8 files:**

1. **`test_discover_filtering.py`** (~150 lines)
   - Core discover filtering logic
   - Filter parameter validation
   - Multiple filter combinations

2. **`test_discover_filter_integration.py`** (~250 lines)
   - Backend filter integration (two-pass filtering)
   - Rating filtering with buffer
   - Year filtering with buffer

3. **`test_discover_pagination.py`** (~300 lines)
   - Pagination metadata tracking
   - tmdb_page_start continuation
   - Sequential page consistency
   - Fallback behavior

4. **`test_discover_deduplication.py`** (~500 lines)
   - Buffer deduplication logic
   - Cross-page dedup
   - Heavy duplication handling
   - Dedup + filters interaction

5. **`test_curated_endpoints.py`** (~200 lines) **NEW**
   - Popular endpoint with preset
   - Now Playing endpoint with preset
   - Top Rated endpoint with preset
   - Upcoming endpoint with preset
   - Preset merge behavior
   - Filter application on curated endpoints

6. **`test_paginated_endpoints_contract.py`** (~100 lines)
   - Basic pagination structure
   - Common response format
   - Error handling

7. **`test_genres_keywords_people.py`** (~140 lines)
   - Unchanged from original proposal

8. **`test_movie_detail.py`** (~100 lines)
   - Unchanged from original proposal

**Total:** 8 files, ~1740 lines (includes new comprehensive tests)

### Resume Point After Completion

**Once this incidental task list is complete:**

1. Return to `tasks-test-organization-standardization.md`
2. Update Phase 3 analysis with new endpoint names
3. Update Phase 4 split strategy with final file list
4. Continue with Phase 4: Execute file splits (with correct naming)

---

## Dependencies

**This work blocks:**

- `tasks-test-organization-standardization.md` Phase 4+ (file splits)
- Any new endpoint-related features
- Test naming decisions

**This work requires:**

- Pausing test organization at Phase 3 complete
- No concurrent endpoint-related changes
- Backend and frontend coordination

**This work unblocks:**

- Test organization with correct naming
- Reliable endpoint testing going forward
- Feature development on now-playing/upcoming/top-rated pages

---

## Decisions Pending User Input

- **Upcoming date window:** Determine from Phase 1.1 investigation
- **Filter subset rules:** Allow all filters or block contradicting ones?
- **Merge strategy:** User or preset wins for conflicts?
- **Protected keys:** Which params should preset always control?
- **Test naming:** Final naming strategy for split files

---

## References

- TMDB API Documentation: <https://developer.themoviedb.org/reference>
- TMDB Forum (list endpoints): <https://www.themoviedb.org/talk/5968944c92514133fe019679>
- TMDB Forum (top rated): <https://www.themoviedb.org/talk/5e51b605a93d250017491739>
- Backend logs (2025-10-30): Filter parameters being dropped from now-playing requests
- Test organization task list: `.arc/active/incidental/tasks-test-organization-standardization.md`

---

## Next Steps

**Immediate:**

1. User review and approval of this approach
2. Create `tasks-discover-endpoint-consolidation.md` from these notes
3. Begin Phase 1: Investigation

**After completion:**

1. Resume `tasks-test-organization-standardization.md` at Phase 4
2. Use correct endpoint naming in test splits
3. Continue with comprehensive test coverage

---

## Phase 3 Frontend Migration: Sort/Filter Parameter Issue Discovery

**Date Discovered:** 2025-11-20
**Context:** During Task 3.6 cleanup, user reported sorting functionality broken in the Browse UI

### Issue Discovery

During Task 3.6 (Clean up old frontend code), after completing SortDropdownMinimal cleanup, the user reported:

> "the minimal sort dropdown no longer appears to function - it doesn't seem to apply any sort options"

Further testing revealed this was NOT caused by the SortDropdownMinimal changes, but was a **pre-existing issue** now
exposed by the routing changes.

### Symptom Inventory by Sort Option

| Sort Option | UI Label | sort_by Value | Results | Behavior |
|-------------|----------|---------------|---------|----------|
| Popularity (desc) | "Popularity" | `popularity.desc` | 20/page | ✅ Works correctly |
| Popularity (asc) | "Popularity (Low to High)" | `popularity.asc` | 0 | ❌ No results |
| Rating (desc) | "Rating" | `vote_average.desc` | 0 | ❌ No results |
| Rating (asc) | N/A | `vote_average.asc` | 0 | ❌ No results |
| Release Date (desc) | "Release Date" | `release_date.desc` | Unknown | ❌ No results |
| Title (A-Z) | "A-Z" | `original_title.asc` | 2 | ❌ Only 2 results despite 10k+ total |

### Root Cause Analysis

**Discovery path:**

1. Backend logs showed requests were correctly sending `sort_by` parameter
2. Backend returned 200 OK with valid response structure
3. But results array was empty or nearly empty
4. Added `vote_count_gte=200` to request - still 0 results
5. Checked logs - `vote_count.gte` NOT appearing in TMDB API params
6. Found parameter defined in schema (`schemas.py:281`) but not extracted

**Root causes identified:**

1. **Schema `to_service_params` missing mapping** (`schemas.py:388-398`)
   - `vote_count_gte` field exists in schema but NOT in `field_mappings` dict
   - Parameter never extracted from incoming request

2. **`FILTER_MAPPING` missing entry** (`filtering.py:12-28`)
   - Even if extracted, wouldn't be mapped to TMDB parameter name
   - `vote_count.gte` → `vote_count.gte` mapping absent

3. **Backend min_vote_count filter** (`result_filtering.py`)
   - Default MIN_VOTE_COUNT = 10 votes
   - When sorting by rating without TMDB-side vote_count filter, TMDB returns obscure 10/10 movies with 1-2 votes
   - Backend filter removes them all → 0 results

### Fixes Applied

**1. Added to `filtering.py` FILTER_MAPPING:**

```python
'vote_count_gte': 'vote_count.gte',
'vote_count.gte': 'vote_count.gte',
'vote_count_lte': 'vote_count.lte',
'vote_count.lte': 'vote_count.lte',
```

**2. Added to `schemas.py` to_service_params field_mappings:**

```python
'vote_count_gte': 'vote_count.gte',
'vote_count_lte': 'vote_count.lte',
```

**Verification:** After fixes, `vote_count.gte` now appears in TMDB API params and returns 20 results.

### What Remains To Be Fixed

**1. Automatic vote_count_gte for rating sorts (CRITICAL)**

The frontend doesn't send `vote_count_gte` when user selects rating sort. Need to automatically add it.

**Recommended approach:** Backend adds default `vote_count.gte` when `sort_by` is `vote_average.*`

- Location: `filtering.py build_tmdb_params()`
- Similar to how `sort_by` defaults to `popularity.desc`
- Keeps TMDB-specific logic in backend

**2. Verify all sort options work correctly**

After auto-vote_count fix, need to test:

- vote_average.desc with auto vote_count
- vote_average.asc with auto vote_count
- original_title.asc (why only 2 results?)
- original_title.desc
- release_date.desc
- popularity.asc

**3. Determine appropriate vote_count threshold**

Current test used 200. Need to decide:

- What's the right default? 50? 100? 200?
- Should it vary by sort type?
- TMDB's top-rated uses 200+ historically

### Architectural Concerns Identified

#### 1. Redundant Parameter Mapping

Two places define parameter mappings:

- `schemas.py to_service_params field_mappings` - schema → service params
- `filtering.py FILTER_MAPPING` - service params → TMDB params

This creates maintenance burden and allows gaps like we discovered. Should consolidate.

#### 2. Sort/Filter Logic Conflation

Sort and filter are different concerns but conflated in naming:

- `FILTER_MAPPING` contains sort_by
- `movieFilterMapper.ts` handles both sorts and filters
- Looking for sort logic in "filter" files is confusing

**Recommendation:** Consider separation or at least rename to `PARAM_MAPPING` / `paramMapper`

#### 3. Schema Extraction vs Service Mapping

The flow is:

```
HTTP Request → Schema (to_service_params) → Service → filtering.py → TMDB
```

Each layer has its own mapping. Could simplify to:

- Schema just validates and extracts
- Single authoritative mapping in service layer

### Test Coverage Gaps

**Why wasn't this caught?**

1. Tests for Popular page always used `popularity.desc` (works)
2. Top Rated tests existed but may have expected the broken behavior
3. No integration tests verifying "sort by X returns non-zero results"
4. Filter parameter mapping not tested end-to-end

**Phase 5 Implications:**

Phase 5.1.3 says "Evaluate popular/top-rated test intent" - this must now include:

- Verify all sort options return results
- Test parameter passthrough end-to-end (schema → TMDB)
- Test with representative thresholds (vote_count, etc.)

**Suggested Phase 5 additions:**

1. **Parametrized sort option tests** - All sort_by values return non-zero results
2. **Parameter passthrough verification** - All schema fields reach TMDB params
3. **Filter interaction tests** - Sort + filter combinations work together
4. **Threshold boundary tests** - Verify min_vote_count doesn't over-filter

### Task List Considerations

**Does this warrant its own task list?**

Factors for:

- Multiple interconnected issues
- Architectural concerns beyond just "fix the bug"
- Need to audit all sort options systematically

Factors against:

- Closely related to current endpoint consolidation work
- Phase 5 will cover testing comprehensively
- Core fix is small (2 mapping additions + 1 default)

**Recommendation:** Keep in current task list but:

1. Add explicit subtask for the backend auto-vote_count fix
2. Expand Phase 5 scope as noted above
3. Document architectural concerns for future refactoring

**Other active task lists to consider:**
There are in various states of completion, and should be carefully considered as far as how they potentailly relate
to these issues and any changes made here:

- `tasks-test-organization-standardization.md` - May have relevant test structure decisions
- `tasks-filter-integration-testing.md`
- `tasks-navigation-filter-state-preservation.md`
- `tasks-pagination-buffer-tracking.md`
- `tasks-buffer-deduplication-data-quality.md`

### Fixes Implemented (2025-11-20)

**1. Rating sort auto-threshold (`filtering.py`)**

Added auto-application of `vote_count.gte` in `build_tmdb_params()` for rating-based sorts:

- When `sort_by` contains `vote_average`, automatically adds `vote_count.gte = MIN_VOTE_COUNT` (10)
- Uses data quality threshold, NOT curation threshold (200)
- Ensures movies pass backend filter without inadvertently curating results

**Rationale for MIN_VOTE_COUNT (10) vs TMDB's 200:**

The initial fix used 200 (matching TMDB's `/movie/top_rated` endpoint), but this conflates sorting with curation:

- **TMDB top_rated endpoint**: Curated "all-time greats" → 200+ votes appropriate
- **Browse sort control**: "Sort these results by rating" → should be true sorting

With 200 threshold, the sort control becomes a de facto "Top Rated" view, losing its utility as an actual
sorting mechanism. Users selecting "Rating" sort expect to sort their current results, not see classics.

**Decision:** Curated "top rated" content belongs in the upcoming Collections feature (IMDB Top 250, AFI Top 100,
etc.), not in sort controls. The rating sort uses MIN_VOTE_COUNT (10) for data quality only.

**2. Conditional min_vote_count bypass (`api.py`)**

Added logic in `browse_movies()` to bypass backend `min_vote_count` filter for certain sorts:

- `release_date.desc/asc` → bypass (new movies have few votes)
- `original_title.asc/desc` → bypass (alphabetical ≠ quality)
- `popularity.asc` → bypass (least popular by definition)

This mirrors how `now-playing` and `upcoming` endpoints use `min_vote_count=None`.

**3. Sort behavior analysis**

Tested all sort options and documented findings:

- `vote_average.desc/asc`: ✅ Works with 200-vote threshold
- `popularity.desc`: ✅ Works (default behavior)
- `popularity.asc`: ⚠️ 17 results (genre completeness filter removes most)
- `release_date.desc`: ✅ Works (e.g., "Avatar 5" for 2031)
- `original_title.asc`: ✅ Works (starts with "!")
- `original_title.desc`: ⚠️ Unicode sorting issues (mathematical bold chars sort after Z)

**4. UX decision: Simplify sort options**

Created atomic task to remove advanced sort dropdown - reverse sorts produce meaningless data (untracked movies, not
"worst movies"). Keep release_date (oldest) as only reverse option in minimal dropdown.

### Architectural Concerns for Future Cleanup

#### 1. Redundant Parameter Mapping

Two places define parameter mappings that must stay in sync:

- `schemas.py to_service_params field_mappings` - schema → service params
- `filtering.py FILTER_MAPPING` - service params → TMDB params

**Risk:** Gaps like `vote_count_gte` missing from one but not the other.
**Fix complexity:** Medium (~1-2 hours) - Consolidate to single source of truth, possibly in filtering.py with schema
referencing it.

#### 2. Sort/Filter Logic Conflation

- `FILTER_MAPPING` contains `sort_by` (not a filter)
- `movieFilterMapper.ts` handles both sorts and filters
- Confusing when searching for sort-related code

**Fix complexity:** Low (~30 min) - Rename to `PARAM_MAPPING` / `paramMapper` for accuracy.

#### 3. Type Safety Gap in API Layer

`to_service_params()` returns `dict[str, str | int | float | bool]` but `discover_movies()` expects typed parameters.
Currently using `type: ignore` comments.

**Fix complexity:** Medium (~1 hour) - Create TypedDict for service params return type, or extract known params
explicitly before `**kwargs`.

#### 4. Schema Extraction vs Service Mapping Flow

Current flow has multiple mapping layers:

```
HTTP Request → Schema (to_service_params) → Service → filtering.py → TMDB
```

Each layer has its own mapping logic. Could simplify to schema just validates, single authoritative mapping in service layer.

**Fix complexity:** High (~2-3 hours) - Architectural change affecting multiple files.

### Summary: Current State

| Item | Status |
|------|--------|
| Parameter mapping fixes | ✅ Applied (both files) |
| Auto vote_count for rating sorts | ✅ Implemented (MIN_VOTE_COUNT = 10, not 200) |
| Conditional min_vote_count bypass | ✅ Implemented (api.py browse_movies) |
| All sort options verified | ✅ Tested and documented |
| Backend tests pass | ✅ Verified (408 passed, 1 xfailed) |
| UX simplification | 📋 Atomic task created |
| Architectural concerns | 📋 Documented above for future cleanup |

### Remaining Before Phase 3.7

- Decide: Fix architectural concerns now or defer to atomic tasks?
- Update CURRENT-SESSION.md with progress
