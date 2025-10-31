# ADR-001: Use TMDB Discover Endpoint for Filtered Movie Browsing

## Status

Accepted

## Context

TMDB provides two patterns for retrieving movie collections:

**1. List endpoints** (`/movie/popular`, `/movie/now_playing`, `/movie/upcoming`, `/movie/top_rated`):

- Pre-computed curated lists that accept ONLY `page`, `language`, and `region` parameters
- Do NOT support filtering by genre, year, rating, vote count, or other attributes
- Designed as convenience wrappers with fixed presets
- TMDB official guidance: "If you would like to tweak any of the default filters you should use the discover endpoint"

**2. Discover endpoint** (`/discover/movie`):

- Supports 40+ filter parameters including genre, rating, date range, runtime, keywords, people
- All sorting options available
- Designed explicitly for filtered queries

**Current Architecture Issues:**

Our application requires filtered movie browsing (by genre, year, rating) within different contexts (popular,
now playing, top rated, upcoming). The current implementation has critical flaws:

- API routes for now-playing/upcoming only accept `page` parameter
- Service layer accepts filters but cannot send them to TMDB list endpoints (architectural confusion)
- Frontend sends filter parameters that are silently dropped by backend
- Upcoming endpoint returns NO results (broken)
- Now Playing filtering doesn't work in browser
- Testing gaps allowed these issues to go unnoticed (we primarily tested Popular, which uses discover)

**Alternatives Considered:**

- **Option A (Rejected)**: Continue using list endpoints, document no-filtering limitation
    - Pro: Simpler TMDB integration
    - Con: Breaks user expectation (filters displayed but don't work)
    - Con: Doesn't fix upcoming endpoint failure
- **Option B (Rejected)**: Dual-mode system (discover when filtering, lists when not)
    - Pro: Could leverage TMDB's curated lists
    - Con: Complex branching logic
    - Con: Inconsistent behavior confuses testing and debugging
- **Option C (Chosen)**: Thin wrappers around discover with semantic URLs
    - Pro: Single consistent implementation (DRY)
    - Pro: All contexts support full filtering
    - Pro: Clean semantic URLs for users
    - Pro: Backend controls presets (frontend agnostic)

## Decision

We will use the `/discover/movie` endpoint for all movie browsing queries, applying presets to simulate
list endpoint behavior when needed.

**Implementation pattern:**

- User-facing routes remain semantic: `/movies/popular`, `/movies/now-playing`, `/movies/top-rated`, `/movies/upcoming`
- Each route is a thin wrapper (10-20 lines) that:
    1. Defines preset filters for that context (e.g., popularity sort, date ranges, release types)
    2. Merges user-provided filters with presets using a `merge_with_preset()` function
    3. Delegates to unified `discover_movies()` service method
- All filtering, pagination, buffer management, and client-side data quality logic remains in the single
  discover implementation
- Frontend code requires no changes (routes stay the same, filters now work as expected)

**Preset definitions:**

- Popular: `sort_by=popularity.desc`
- Now Playing: `with_release_type=2|3`, date range covering theatrical releases (window TBD during investigation)
- Top Rated: `sort_by=vote_average.desc`, `vote_count.gte=200`, `without_genres=99,10755`
- Upcoming: `with_release_type=2|3`, date range covering future releases (window TBD during investigation)

## Consequences

### Positive

- Users can apply filters within any browsing context (popular, now playing, top rated, upcoming)
- Single consistent endpoint architecture eliminates code duplication across four implementations
- Easier to test: one endpoint pattern instead of four different patterns
- Clearer frontend-backend contract: all routes accept identical filter parameters
- Fixes broken upcoming endpoint (will return results with proper date range)
- Fixes silently-dropped filters issue (filters now actually apply)
- Aligns with TMDB's explicit design intent and official recommendations
- Easier to add new preset views in future (just add wrapper route with preset definition)

### Negative

- Cannot directly leverage TMDB's pre-computed curated lists (must use discover with presets instead)
- Must maintain preset mappings for each list type
- Wrapper pattern adds indirection (though minimal - 10-20 lines per route)
- Need to ensure preset parameters don't conflict with user-provided filters (requires merge strategy)
- Must document and test merge behavior when user filters contradict presets

### Risks

- If TMDB changes discover endpoint behavior or rate limits, all list types are affected
- Must carefully validate that presets accurately replicate list endpoint behavior
- Date range windows for now-playing/upcoming need investigation (current 30-day window may be incorrect)
- Merge strategy for protected_keys needs design (e.g., should users be able to override sort_by on popular?)

### Follow-up Work Required

- Investigate upcoming endpoint failure: determine correct date range window for results
- Design merge strategy: define which preset keys are "protected" vs user-overridable
- Implement comprehensive test coverage: 60-80 new tests across all endpoints (Phase 2 of consolidation plan)
- Document merge behavior and preset definitions in codebase comments
