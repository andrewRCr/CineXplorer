# Feature Backlog - Implementation Status

**Document Purpose:** Track user-facing feature implementation status per META-PRD. This focuses on FEATURES
(what users can do), NOT technical/infrastructure work (see
`notes-backend-modernization.md` and `notes-frontend-modernization.md` for that).

**Scope:** Only features from META-PRD Section 2 "Core Features" or approved sub-PRDs.

**Status Update:** 2025-10-17 (aligned with API Layer P2 near-completion + 8 completed incidental task lists)

---

## UserMovieData Features

These features all share the same backend foundation (UserMovieData model) and will have integrated UI on movie
detail pages and library/watchlist views.

### Watchlist Management

**Backend**: ✅ Complete

- `user_watchlist` field in UserMovieData
- CRUD API endpoints tested (Django Ninja)
- User isolation validated

**Frontend**: ❌ Minimal implementation

- Current: Text list display only
- Missing: Movie grid with posters, drag-and-drop reordering, "Next Up" queue section

**META-PRD Reference**: Section 2.3 "Watchlist: Movies the user wants to watch"

- Drag-and-drop reordering capability
- "Next Up" queue featuring top watchlist items

**Priority**: HIGH (core feature)

**Notes**: Basic CRUD validated during OAuth incidental work, but UI needs significant enhancement.

---

### Ratings System

**Backend**: ✅ Complete

- `user_rating` field in UserMovieData (IntegerField, 1-10 scale)
- API endpoints tested
- Validation in place

**Frontend**: ❌ Placeholder controls only

- Current: No functional rating UI on movie detail pages
- Missing: Star/numeric rating component, display on movie cards, edit capability, rating distribution display

**META-PRD Reference**: Section 2.3 "Personal ratings"

**Priority**: HIGH (core feature, drives recommendations)

**Implementation Notes**:

- 1-10 integer scale (no half ratings)
- Display on movie cards when user has rated
- Rating component on movie detail page
- Consider showing aggregate/community ratings alongside user rating (TMDB provides this)

---

### Reviews System

**Backend**: ✅ Complete

- `user_review` field in UserMovieData (TextField)
- Character limit: 800-1000 chars (to be enforced in validation)
- API endpoints support review CRUD

**Frontend**: ❌ Placeholder

- Current: No review creation/editing UI
- Missing: Review text area on movie detail, review display/formatting, character counter, edit/delete capability

**META-PRD Reference**: Section 2.3 "Reviews: User-generated movie reviews and ratings"

**Priority**: HIGH (core feature)

**Implementation Notes**:

- Simple text field (few paragraphs max)
- NOT a complex review system with separate model
- Display below movie details or in dedicated tab
- Character counter during composition
- Basic Markdown formatting support?

---

### Library/Watched Tracking

**Backend**: ✅ Complete

- `user_watched` field in UserMovieData (BooleanField)
- Marking movie as watched automatically adds to library
- API endpoints complete

**Frontend**: ❌ Placeholder page

- Current: Library navigation exists, page is placeholder
- Missing: Movie grid view of watched movies, sort/filter controls (by rating, liked, date watched), favorites section integration

**META-PRD Reference**: Section 2.3 "Library: Movies the user has watched"

- Watch history and personal ratings
- "Favorites" section with reorderable subset

**Priority**: HIGH (core feature)

**Implementation Notes**:

- Library page will extend existing discovery filter/sort controls
- Can filter by: liked movies only, rating ranges, watch date
- Can sort by: user rating, watch date, title, release date
- Includes "Favorites" section at top (see below)

---

### Favorites Subset

**Backend**: ❌ Not implemented yet

- Need to add `user_favorited` field to UserMovieData (BooleanField or PositiveSmallIntegerField for ordering)
- Cap: 6-10 movies maximum (validation needed)
- Ordering support if drag-and-drop reordering planned

**Frontend**: ❌ Not implemented

- Will be displayed as separate section at top of Library page
- NOT a separate page
- Similar structure to "Next Up" queue on Watchlist page

**META-PRD Reference**: Section 2.3 "Favorites section with reorderable subset"

**Priority**: HIGH (enhances library organization)

**Implementation Notes**:

- Small, curated subset of library (6-10 movie cap)
- Displayed at top of Library page as dedicated section
- Reorderable (drag-and-drop) - requires position/ordering field
- Distinct from `user_liked` (which is unlimited and used for filtering)

---

### Liked Movies (Filtering/Sorting)

**Backend**: ✅ Complete

- `user_liked` field in UserMovieData (BooleanField)
- API supports filtering by liked status

**Frontend**: ❌ Toggle exists, filtering not implemented

- Current: Like toggle on movie cards/details (functionality unclear)
- Missing: Filter/sort controls on Library and Watchlist pages

**META-PRD Reference**: Implicit in Section 2.3 (part of library management)

**Priority**: HIGH (core organization feature)

**Implementation Notes**:

- NOT the same as Favorites (which is limited subset)
- Used for filtering: "Show only liked movies in library"
- Icon toggle on movie cards (heart icon?)
- No cap on number of liked movies

---

### Log (Quick Add)

**Backend**: ✅ APIs exist

- UserMovieData CRUD endpoints support all operations
- No additional backend work needed

**Frontend**: ❌ Button exists (non-functional)

- Current: "Log" button in layout, no modal/functionality
- Missing: Modal with fuzzy movie search, quick toggles (watched/liked), rating input, submit flow

**META-PRD Reference**: Not explicit in META-PRD (convenience feature)

**Priority**: HIGH (major UX convenience, similar to Letterboxd)

**Concept**:

- Quick add outside of movie context (you know exact movie, want fast entry)
- Modal with fuzzy search by title
- Once movie selected: toggle watched/liked, enter rating, optionally add review
- Submit creates/updates UserMovieData entry
- Similar to Letterboxd's quick log feature

**Implementation Notes**:

- Fuzzy search uses existing TMDB search API
- Form pre-fills if movie already in user's data
- Can be accessed from anywhere in app (global button/shortcut)

---

### Journal (Timeline View)

**Backend**: ✅ Data exists

- UserMovieData has timestamps (created_at, updated_at)
- Can query user's actions in chronological order
- No additional backend work needed beyond sorting/pagination

**Frontend**: ❌ Placeholder navigation only

- Current: Journal navigation button exists, no page/content
- Missing: Timeline view component, action formatting, date grouping

**META-PRD Reference**: Not explicit in META-PRD (view-only feature)

**Status**: 🤔 Tentatively planned (not final decision)

**Priority**: MEDIUM (view-only convenience feature)

**Concept**:

- Timeline of user's movie actions in descending chronological order
- "On this day you watched and rated X movie"
- Strictly a VIEW page (no editing from journal)
- Group by date (today, yesterday, this week, etc.)

**Implementation Notes**:

- Uses existing UserMovieData with timestamp sorting
- Display format: Date header → movie cards with actions shown
- Actions: watched date, rating given, review added, etc.
- Pagination for long histories

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

**PRD**: `.arc/upcoming/sub-prds/prd-user-movie-lists.md` (pre-modernization, may need updates)

**Task List**: `.arc/upcoming/tasks/tasks-user-movie-lists.md` (not started)

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

**By Implementation Status**:

- ✅ **Fully Complete**: 4 features (Advanced Search, Authentication, Watchlist backend, Ratings backend)
- ⚠️ **Backend Complete, Frontend Missing**: 5 features
  (Ratings UI, Reviews UI, Library/Watched UI, Liked filtering, Log modal)
- ❌ **Not Started**: 4 features (Favorites field, Movie Lists, Person Pages, Recommendations)
- 🤔 **Rough Draft**: 1 feature (Movie Detail pages - needs polish)
- 🤷 **Tentative**: 1 feature (Journal - decision pending)

**By Priority**:

- **HIGH**: 11 features
  (Watchlist UI, Ratings UI, Reviews UI, Library UI, Favorites, Liked, Log,
  Movie Detail polish, Movie Lists, Recommendations)
- **MEDIUM**: 2 features (Person Pages, Journal)

**By Feature Category**:

- **UserMovieData**: 8 features (Watchlist, Ratings, Reviews, Library, Favorites, Liked, Log, Journal)
- **Discovery/Browse**: 3 features (Movie Detail, Person Detail, Advanced Search)
- **Collections**: 1 feature (Movie Lists)
- **Recommendations**: 1 feature (For You page)

---

**Last Updated**: 2025-10-17 (aligned with API Layer P2 completion, backend status verified against code)
