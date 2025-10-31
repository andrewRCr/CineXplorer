# ADR-002: Featured Page and Browse Architecture

## Status

Accepted

## Context

During the endpoint consolidation work (documented in `.arc/active/incidental/tasks-discover-endpoint-consolidation.md`
and `.arc/active/incidental/notes-discover-endpoint-consolidation.md`), we are implementing a thin wrapper pattern
where curated endpoints call the discover endpoint with presets.

### The Protected Keys UX Problem

The wrapper pattern creates a UX constraint: certain filter parameters must be "protected" to preserve each endpoint's
semantic identity. For example, a "Popular" endpoint must always sort by `popularity.desc` - allowing users to override
this would break the endpoint's meaning.

**Original architecture problem:**

- Home page (`/`) currently redirects to Popular movies (`/movies/popular`)
- Popular endpoint has protected `sort_by` parameter
- Default user experience lands on a page where `sort_by` filter control is disabled
- Poor first impression - users encounter limitation immediately on landing

### Endpoint Analysis: Sort Options vs. Date Constraints

Examining the four originally planned curated endpoints reveals a key distinction:

**Sort-based endpoints (Popular, Top Rated):**

- Popular: Just `sort_by=popularity.desc` (protected key)
- Top Rated: Just `sort_by=vote_average.desc` + `vote_count.gte=200` (protected keys)
- These are merely default sort options, not genuine constraints
- Both already exist as sort options in the browse UI
- Having separate pages for these becomes redundant

**Date-constrained endpoints (Now Playing, Upcoming):**

- Now Playing: Date range (current releases) + release type (theatrical)
- Upcoming: Date range (future releases) + release type (theatrical)
- These represent genuine time-based constraints
- Cannot easily replicate "movies in theaters right now" with general filters
- Serve distinct, time-specific discovery purposes

**Key insight:** Popular and Top Rated are sort preferences, not distinct browsing contexts. Now Playing and Upcoming
are genuinely different contexts defined by time constraints.

### Routing Structure Considerations

**Current structure:** `/movies/*` (domain-specific)

- `/movies/popular`, `/movies/now-playing`, etc.
- Matches API structure (`/api/movies/*`)
- Domain-oriented approach

**Alternative:** `/browse/*` (action-specific)

- CineXplorer context makes "browse movies" obvious (app is inherently about movies)
- Leaves `/browse` path available for unrestricted discover page
- Action-oriented, parallel with `/search` (both are actions)
- Separates frontend (user actions) from backend (domain structure)
- Future-proof: `/movie/:id` and `/person/:id` are detail views, `/browse/*` are discovery actions

### Options Considered

**Option A: Four curated endpoints with `/movies/*` routing**

- `/movies/popular`, `/movies/now-playing`, `/movies/top-rated`, `/movies/upcoming`
- Default page has protected sort parameter
- Two endpoints (popular/top-rated) are just sort options
- Redundant with browse UI controls

**Option B: Separate Featured page + simplified browse endpoints with `/browse/*` routing**

- Featured page (`/featured`) as landing/showcase with trending content
- General `/browse` page with full filter control, defaults to popularity sort
- Time-constrained endpoints (`/browse/now-playing`, `/browse/upcoming`)
- Featured page is navigable in nav, serves dual purpose (landing + trending content destination)
- Industry standard: TMDB, Letterboxd, Netflix use hero-style landing pages
- Solves protected keys UX issue (main browse page has NO protected keys)

**Option C: Keep four endpoints but change routing to `/browse/*`**

- Better routing structure but retains redundant Popular/Top Rated endpoints
- Doesn't solve the core UX issue (main page still has protected keys)

## Decision

We will implement **Option B: Featured page with simplified browse architecture**.

### Routing Structure

**Landing and navigation:**

- `/` → Redirects to `/featured` (explicit endpoint for clarity and navigability)
- `/featured` → Featured/hero page (trending/popular content showcase, no filtering)
  - Navigable in nav as "Featured"
  - Serves dual purpose: landing page + trending content destination
  - Future: Rich hero design with featured collections, horizontal scrolling
  - Immediate: Minimal stub with welcome message and browse links

**Browse functionality:**

- `/browse` → General movie discovery with full filter control
  - Defaults to `sort_by=popularity.desc` but user can change (NO protected keys)
  - Full access to all filters: genre, rating, year, keywords, people
  - Primary unrestricted exploration tool

- `/browse/now-playing` → Movies currently in theaters
  - Date range preset (current window around today)
  - Release type preset (theatrical)
  - Protected keys: date range, release type
  - User can still filter by genre, rating, etc.

- `/browse/upcoming` → Movies coming soon to theaters
  - Date range preset (future releases)
  - Release type preset (theatrical)
  - Protected keys: date range, release type
  - User can still filter by genre, rating, etc.

**Detail views:**

- `/movie/:id` → Movie detail page
- `/person/:id` → Person detail page (future)

**Other:**

- `/search` → Search results (unchanged)

### Navigation Structure

Primary navigation:

1. **Featured** → `/featured` (Hero/trending content, default landing page)
2. **Browse** → `/browse` (General discovery, full filter control)
3. **Now Playing** → `/browse/now-playing` (Time-constrained: current releases)
4. **Upcoming** → `/browse/upcoming` (Time-constrained: future releases)

All navigation items are filterable browse tools EXCEPT Featured (which is a curated showcase).

### Backend Endpoint Strategy

**Endpoints to implement:**

1. `/api/movies/discover` - Core discover endpoint (already exists, unchanged)
2. `/api/movies/now-playing` - Thin wrapper around discover with date/release-type preset
3. `/api/movies/upcoming` - Thin wrapper around discover with future date/release-type preset

**Endpoints NOT implemented:**

- ~~`/api/movies/popular`~~ - Frontend calls `/api/movies/discover` with default `sort_by=popularity.desc`
- ~~`/api/movies/top-rated`~~ - User selects top-rated sort via `/browse` UI

**Rationale:** Popular and top-rated are sort options, not distinct endpoints. The browse page provides both via its
sort UI controls.

### Frontend Implementation

**Immediate (part of endpoint consolidation work):**

1. **Featured stub page** at `/featured`:
   - Welcome message: "Welcome to CineXplorer"
   - "Browse" section with navigation links
   - Minimal, functional design (no hero styling yet)
   - Purpose: Enable testing and provide interim navigation

2. **Browse pages**:
   - `/browse` - Calls discover endpoint, defaults to popularity sort, full filter control
   - `/browse/now-playing` - Calls now-playing endpoint, filterable except date range
   - `/browse/upcoming` - Calls upcoming endpoint, filterable except date range

3. **Routing updates**:
   - `/` redirects to `/featured`
   - Update all navigation links from `/movies/*` to `/browse/*`
   - Update route definitions throughout frontend

**Future (separate task list):**

- Research TMDB trending/popular endpoints for Featured page content
- Design Featured page hero layout and content strategy
- Implement rich Featured page with trending collections
- Document in `notes-featured-page-design.md` (created during endpoint consolidation Phase 1.4)

## Consequences

### Positive

- **Better first impression**: Landing page is showcase, not limited browse view
- **Solves protected keys UX issue**: Main browse page (`/browse`) has NO protected keys - full user control
- **Cleaner architecture**: Only 3 backend endpoints instead of 4 (popular/top-rated eliminated as redundant)
- **Clear navigation hierarchy**: Featured (showcase) vs. Browse tools (exploration)
- **Action-oriented routing**: `/browse/*` is parallel with `/search` (both are user actions)
- **Leaves paths open**: `/browse` available for general discover, distinct from time-constrained views
- **Industry alignment**: Follows patterns from successful movie discovery services (TMDB, Letterboxd, Netflix)
- **Separation of concerns**: Frontend routes (user actions) vs. backend routes (domain structure)
- **Eliminates redundancy**: Popular/top-rated sorting already exists in browse UI controls
- **Featured page dual purpose**: Landing page AND navigable trending content destination

### Negative

- **Routing structure change**: Frontend routes diverge from backend routes (`/browse/*` vs. `/api/movies/*`)
  - Mitigated by: Healthy separation of concerns, frontend is action-oriented, backend is domain-oriented
- **Content strategy required**: Featured page needs logic for trending content
  - Mitigated by: TMDB provides popular/trending endpoints, research in Phase 1.4
- **Implementation effort**: Featured page design requires research and implementation
  - Mitigated by: Stub page provides interim functionality, full design is separate task list
- **Three endpoints instead of TMDB's four list endpoints**: Deviates from direct API mapping
  - Mitigated by: Our wrapper pattern already deviates, this simplification improves UX

### Risks

- **Featured stub period**: Minimal page may feel incomplete during interim
  - Mitigated by: Clear browse navigation links, functional even if not polished
- **Content freshness**: Featured page must stay current
  - Addressed in: Future implementation research (Phase 1.4)

---

**Date:** 2025-10-31

**Related Work:**

- `.arc/active/incidental/tasks-discover-endpoint-consolidation.md` (current work)
- `.arc/active/incidental/notes-discover-endpoint-consolidation.md` (investigation)
- Future: `notes-featured-page-design.md` (to be created in Phase 1.4)
