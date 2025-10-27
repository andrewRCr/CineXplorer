# Feature Backlog - Implementation Status

**Work Classification**: Feature

**Document Purpose:** Track user-facing feature implementation status per META-PRD. This focuses on FEATURES
(what users can do), NOT technical/infrastructure work.

**Scope:**

- Features from META-PRD Section 2 "Core Features" or approved sub-PRDs
- **EXCLUDES UserMovieData features** - see `feature/notes-user-movie-data-features.md` for comprehensive tracking
  of ratings, reviews, watchlist, library, favorites, liked, log, and journal features

**Related Documentation:**

- **UserMovieData features**: `feature/notes-user-movie-data-features.md` (dedicated tracking doc)
- **Technical/infrastructure**: `technical/notes-backend-modernization.md`, `technical/notes-frontend-modernization.md`
- **UI/UX improvements**: `notes-frontend-ux-improvements.md` (polish, accessibility, performance, UX infrastructure)

**Status Update:** 2025-10-22 (UserMovieData features moved to dedicated tracking document)

---

**Note:** UserMovieData domain features (watchlist, ratings, reviews, library, favorites, liked, log, journal)
are tracked in `feature/notes-user-movie-data-features.md`. This document covers Discovery, Collections, and
Recommendations features only.

---

## Discovery & Browse Features

### Movie Detail Pages

**Backend**: ✅ Complete

- TMDB API integration working
- Movie data retrieval tested

**Frontend**: ⚠️ Rough first draft

- Current: Basic layout exists, functional
- Missing: Polished layout, functional user action controls (ratings/reviews/watchlist/liked),
  improved UX/design, related movies section?, cast/crew links

**META-PRD Reference**: Section 2.2 "Movie detail pages with comprehensive information"

**Priority**: HIGH (core feature, gateway to user actions)

**Work Needed**:

- Polish layout and design (first draft → production quality)
- Implement user action controls (integrate watchlist/rating/review/liked features)
- Add cast/crew member links (to future Person Detail pages)
- Consider: Related movies, trailers, user reviews display

---

### Person Detail Pages (Actors/Crew)

**Backend**: ⚠️ TMDB API supports this

- TMDB provides person endpoints (biography, filmography, images)
- No custom backend work needed beyond API integration

**Frontend**: ❌ Not implemented

**META-PRD Reference**: Section 2.2 "Actor and key crew profile pages"

**Priority**: MEDIUM (enhances discovery, wiki-style navigation)

**Concept**:

- Mirror MovieDetail page structure
- Display: person bio, photo, filmography (with links back to movie pages)
- Wiki-style interlinking: Movie Detail ↔ Person Detail ↔ Movie Detail
- Browse actor's other films, see their career timeline

**Implementation Notes**:

- URL pattern: `/person/{tmdb_person_id}`
- Leverage existing TMDB person API endpoints
- Filmography displayed as movie grid (reuse existing components)
- Similar layout philosophy to MovieDetail page

---

### Advanced Search & Filters

**Status**: ✅ Complete

**META-PRD Reference**: Section 2.2 "Advanced search functionality with multiple filters"

**Priority**: N/A (already implemented)

**Notes**: User confirmed this is fully functional.

---

## Collections & Lists Features

### Movie Lists/Collections

**Backend**: ❌ Not started

- Planned: UserMovieList and UserMovieListItem models
- Planned: CRUD API endpoints for list management
- Planned: TMDB keywords integration for tagging

**Frontend**: ❌ Not implemented

- Planned: List detail pages (`/lists/{id}`)
- Planned: Composite cover generation (2×6 poster grid)
- Planned: Sidebar integration with system collections

**PRD**: `.arc/backlog/sub-prds/prd-user-movie-lists.md` (pre-modernization, may need updates)

**Task List**: `.arc/backlog/tasks/tasks-user-movie-lists.md` (not started)

**META-PRD Reference**: Implicit in Section 2.3 (personal movie management)

**Priority**: HIGH (both user-created lists and curated system collections)

**Scope**:

- **User-created lists**: Custom collections, drag-and-drop reordering, keyword tagging
- **System collections**: AFI Top 100, IMDb Top 250, Oscar Best Picture, Palme d'Or (curated, read-only)
- **Sidebar integration**: Collections section with 4 system lists featured

**Implementation Notes**:

- PRD exists but predates modernization (may need Django Ninja migration, pytest patterns, etc.)
- Backend models need to be created from scratch
- Frontend components leverage existing MovieGrid patterns
- System collections provide immediate value while user list management UI is built

---

## Recommendations System

### "For You" Recommendations Page

**Backend**: ❌ Not implemented

- Needs: Metadata-based recommendation engine
- Dependency: User rating data, movie metadata analysis
- Algorithms: Genre matching, director/actor preferences, rating similarity

**Frontend**: ❌ Not implemented

- Needs: "For You" page displaying recommended movies
- Display: Grid of recommended movies with explanation ("Because you liked X")

**META-PRD Reference**: Section 2.4 "Personalized Recommendations"

- "For You" page with curated movie suggestions
- Metadata-based recommendation engine
- Recommendations based on user preferences and history

**Priority**: HIGH (core value proposition of app)

**Status**: Major feature requiring dedicated planning

**Implementation Notes**:

- Likely needs dedicated PRD beyond META-PRD scope
- Recommendation algorithms can start simple (genre matching) and evolve
- Leverage TMDB keywords from movie lists feature for improved matching
- Consider: collaborative filtering (if multi-user), content-based filtering (metadata), hybrid approaches
- Display explanations: "Recommended because you rated [similar movie] highly"

**Dependencies**:

- Requires substantial user rating data to be effective
- Movie Lists/Collections feature provides keyword infrastructure
- Could start with basic genre/director matching, evolve to sophisticated algorithms

---

## Out of Scope (Per META-PRD Section 3)

**Do NOT include in feature planning** - explicitly excluded from scope:

- ❌ Social features (following users, activity feeds, sharing lists)
- ❌ TV show tracking
- ❌ User statistics/analytics dashboards
- ❌ Third-party streaming platform integration (stretch goal only, not planned)

---

## Summary Statistics

**Scope Note:** This backlog tracks NON-UserMovieData features only. For UserMovieData domain features
(8 features including watchlist, ratings, reviews, library, etc.), see `feature/notes-user-movie-data-features.md`.

**By Implementation Status**:

- ✅ **Fully Complete**: 1 feature (Advanced Search)
- ⚠️ **Rough Draft**: 1 feature (Movie Detail pages - needs polish)
- ❌ **Not Started**: 3 features (Movie Lists/Collections, Person Pages, Recommendations)

**By Priority**:

- **HIGH**: 3 features (Movie Detail polish, Movie Lists, Recommendations)
- **MEDIUM**: 1 feature (Person Pages)

**By Feature Category**:

- **Discovery/Browse**: 2 features (Movie Detail, Person Detail)
- **Collections**: 1 feature (Movie Lists)
- **Recommendations**: 1 feature (For You page)

**Total Features Tracked**: 4 features (+ 8 UserMovieData features in separate doc = 12 total feature set)

---

**Last Updated**: 2025-10-22 (UserMovieData features moved to dedicated tracking document)
