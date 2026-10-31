# Plan: UserMovieData Features

**Document Purpose:** Track user-facing feature work for the UserMovieData domain. These features have complete backend
APIs but need frontend implementation or enhancement.

**Status:** Planning / Future Work
**Priority:** High (after Backend Modernization + Frontend Modernization)

---

## Overview

The UserMovieData domain provides personal movie tracking functionality (watchlist, library, ratings, reviews, favorites).
Backend APIs are complete via API Layer Modernization P2, but frontend UIs range from minimal placeholders to non-existent.

**Sequencing:** These features will be implemented AFTER Backend Modernization and Frontend Modernization complete,
ensuring we're building on solid technical foundations (service layer patterns, state management, routing architecture).

---

## Features Status Summary

**Backend Complete, Frontend Missing** (5 features):

1. **Ratings UI** - star/numeric rating component, display on movie cards
2. **Reviews UI** - text area, display with edit/delete, integration with movie details
3. **Library/Watched Page** - movie grid, favorites section, filters/sorting
4. **Liked Movies Filtering** - filter controls on library/watchlist pages
5. **Log Modal** - quick-add functionality with fuzzy search, toggles, rating input

**Rough Draft (needs enhancement)** (2 features):

6. **Watchlist Page** - current is minimal text list, needs movie grid + drag-and-drop + "Next Up" queue
7. **Movie Detail Page** - functional but rough layout, user action controls need proper integration

**Not Yet Started** (3 features):

8. **Favorites Subset** - add `user_favorited` field, cap enforcement, reorderable display
9. **Movie Lists/Collections** - user-created custom lists with backend models + API + frontend (has existing PRD)
10. **Journal Timeline View** - user action timeline (decision pending on implementation)

---

## Features Detail

### 1. Pagination (Depends on Backend Modernization)

**Status:** Blocked - awaits Backend Modernization service layer patterns

**Context:**

Pagination already exists for TMDB movie endpoints (e.g., `/api/movies/discover`, `/api/movies/search`) which return
paginated responses from the external TMDB API. However, the user-movie-data endpoint (`/api/user-movie-data/movies`)
doesn't implement pagination yet, despite frontend TypeScript expecting it (`UserMoviesQueryParams.page?: number`).

**The Problem:**

User-movie-data endpoints query the local database (UserMovieData model) rather than TMDB, so they need different
pagination logic. Current implementation returns ALL user movies in one response, which becomes a performance issue
for users with large collections (100+ movies).

**The Solution:**

Backend Modernization will create a **generic `paginate_queryset()` helper** that works with any Django QuerySet
(not TMDB-specific). This helper will be used by:

- User-movie-data endpoints (new usage)
- Any future local-DB endpoints that need pagination (future-proofing)
- Potentially TMDB endpoints if we add server-side filtering/caching (optional)

Then this feature work applies the helper to the user-movie-data endpoint with appropriate frontend integration.

**Backend Work (Backend Modernization):**

- Generic `paginate_queryset()` helper (core/pagination.py)
- TMDB `fetch_movies_batch()` helper (movie/helpers.py)
- `build_user_movies_response()` composition helper
- See Backend Modernization notes for full details

**Frontend Work (This Feature):**

- Apply pagination parameters to API calls (`/api/user-movie-data/movies?page=2&watchlist=true`)
- Implement pagination controls UI (page numbers, prev/next buttons, or infinite scroll)
- Update watchlist/library pages to use paginated data
- Feature-level testing (pagination + watchlist flow, pagination + library flow)

**Rationale for Sequencing:**

Backend Modernization establishes the pagination patterns as reference implementations. Feature work then applies
those patterns, preventing ad-hoc implementations that would need refactoring later.

**Effort Estimate:** 2-3 hours (frontend implementation once backend helpers exist)

---

### 2. Full Watchlist Implementation

**Status:** Minimal MVP exists, needs enhancement

**Current State:**

- Backend API complete (`/api/user-movie-data/movies?watchlist=true`)
- Frontend page exists but shows simple text list only
- Missing: movie grid display, drag-and-drop reordering, "Next Up" queue

**What Needs Building:**

- **Movie Grid Display**: Replace text list with visual movie cards (posters, titles, user data)
- **Drag-and-Drop Reordering**: Allow users to reorder watchlist priority
- **"Next Up" Queue**: Feature top N watchlist items as prioritized viewing queue
- **Integration with Pagination**: Use pagination from Feature #1

**Technical Considerations:**

- Drag-and-drop library: react-beautiful-dnd or @dnd-kit/core
- Optimistic updates for reordering (instant UI feedback, rollback on error)
- Backend API may need `order` field on UserMovieData model for persistent ordering
- "Next Up" can be top 5-10 items by order field

**Effort Estimate:** 8-12 hours

- Movie grid layout: 2-3 hours
- Drag-and-drop integration: 4-6 hours
- "Next Up" queue component: 2-3 hours

---

### 3. Favorites System

**Status:** Not yet started (backend field doesn't exist)

**What Needs Building:**

**Backend:**

- Add `user_favorited` boolean field to UserMovieData model (migration required)
- Add favorites cap enforcement (e.g., max 50 favorites)
- Update schemas to include `user_favorited` field
- API endpoint for toggling favorite status

**Frontend:**

- Favorite toggle button/icon on movie cards
- Favorites section on Library page (reorderable subset like watchlist)
- Visual distinction for favorited movies
- Cap enforcement UI (warning when approaching limit, prevent adding beyond cap)

**Technical Considerations:**

- Cap enforcement: backend validation + frontend pre-check
- Reordering: same drag-and-drop pattern as watchlist
- May want separate `/api/user-movie-data/favorites` endpoint or use `?favorited=true` filter

**Effort Estimate:** 6-8 hours

- Backend model + migration: 1 hour
- Backend API: 1-2 hours
- Frontend toggle + display: 2-3 hours
- Favorites section with reordering: 2-3 hours

---

### 4. Library/Watched Page Enhancement

**Status:** Rough draft exists (placeholder page)

**Current State:**

- Backend API complete (`/api/user-movie-data/movies?watched=true`)
- Placeholder frontend page exists
- Missing: movie grid, favorites section, filters, sorting

**What Needs Building:**

- **Movie Grid**: Display watched movies with user data (rating, review preview, date watched)
- **Favorites Section**: Dedicated area for favorited movies (reorderable)
- **Filters**: Genre, year, rating (user's rating vs TMDB rating), favorites-only
- **Sorting**: Date watched, user rating, title, release date
- **Integration with Pagination**: Use pagination from Feature #1

**Technical Considerations:**

- Filter/sort state management (URL params for shareability)
- Favorites section: Could be separate component or filtered view
- Date watched: May need to add `date_watched` timestamp to UserMovieData model (currently just boolean)

**Effort Estimate:** 8-10 hours

- Movie grid layout: 2-3 hours
- Favorites section integration: 2-3 hours
- Filters + sorting UI: 3-4 hours

---

### 5. Ratings UI

**Status:** Backend complete, frontend placeholder

**Current State:**

- Backend field exists (`user_rating` in UserMovieData model)
- API supports setting/updating ratings
- Frontend shows placeholder text only

**What Needs Building:**

- **Rating Component**: Star rating or numeric input (1-10 scale matching TMDB)
- **Display on Movie Cards**: Show user's rating alongside TMDB rating
- **Inline Editing**: Click to edit rating directly on movie cards
- **Movie Detail Integration**: Prominent rating input/display on detail page

**Technical Considerations:**

- Component library: react-rating-stars-component or custom
- Optimistic updates with rollback
- Visual distinction: user rating vs TMDB rating (different colors/labels)
- **Touch target sizing**: When redesigning MovieCard action buttons, use `size="md"` or larger for IconButtons
  (current `size="sm"` is 32×32px, below WCAG AAA 44×44px guideline). Balance with visual design constraints.
- **Tooltip simplification**: Replace custom title tooltip with Chakra's `<Tooltip disabled={!isTitleTruncated}>`,
  eliminating ~40 lines and `isTitleTooltipOpen` state.

**Effort Estimate:** 4-6 hours

- Rating component: 2-3 hours
- Integration across pages: 2-3 hours

---

### 6. Reviews UI

**Status:** Backend complete, frontend placeholder

**Current State:**

- Backend field exists (`user_review` text in UserMovieData model)
- API supports creating/updating/deleting reviews
- Frontend shows placeholder text only

**What Needs Building:**

- **Review Input**: Text area for writing/editing reviews
- **Review Display**: Show reviews on movie detail pages
- **Edit/Delete**: Buttons to modify or remove reviews
- **Character Count**: Optional limit (e.g., 500-1000 characters)
- **Preview on Cards**: Show truncated review on movie cards (first 100 chars + "Read more")

**Technical Considerations:**

- Rich text editing: Keep simple (plain text) or add markdown support?
- Review validation: Minimum length? Profanity filter?
- Display format: Expandable on cards, full display on detail page

**Effort Estimate:** 6-8 hours

- Review input component: 2-3 hours
- Display + edit/delete: 2-3 hours
- Integration across pages: 2 hours

---

### 7. Liked Movies Filtering

**Status:** Backend complete, frontend missing

**Current State:**

- Backend field exists (`user_liked` boolean in UserMovieData model)
- API supports filtering (`?liked=true`)
- Frontend has no filter controls

**What Needs Building:**

- **Filter Toggle**: Checkbox or toggle button to show only liked movies
- **Integration**: Add to library page, watchlist page filter controls
- **State Management**: Persist filter state in URL params

**Technical Considerations:**

- Simple boolean filter, pairs with existing watchlist/watched filters
- May want "liked but not watched" filter combination
- Visual indicator on cards for liked movies (heart icon)

**Effort Estimate:** 2-3 hours

- Filter controls: 1 hour
- Integration + state management: 1-2 hours

---

### 8. Log Modal (Quick Add)

**Status:** Backend complete, frontend not started

**Current State:**

- All backend APIs exist (watchlist, watched, liked, rated)
- No frontend modal implementation

**What Needs Building:**

- **Modal Component**: Overlay with movie search + quick action toggles
- **Fuzzy Search**: Search movies by title (uses existing search API)
- **Quick Toggles**: Checkboxes for watchlist, watched, liked
- **Rating Input**: Optional rating input within modal
- **Keyboard Navigation**: Enter to search, arrow keys to navigate results, Esc to close

**Use Case:**

User hears about a movie and wants to quickly add it to watchlist/library without navigating to movie detail page.
Modal provides fastest path from "I heard about a movie" to "it's tracked in my system."

**Technical Considerations:**

- Search debouncing (wait 300ms after typing stops)
- Result limit (show top 5-10 matches)
- Auto-close on action or manual close button
- Global keyboard shortcut to open modal (e.g., Cmd/Ctrl + K)

**Effort Estimate:** 8-10 hours

- Modal component + search: 4-5 hours
- Quick actions + rating: 2-3 hours
- Keyboard navigation: 2 hours

---

### 9. Movie Detail Page Polish

**Status:** Rough draft exists, needs polish

**Current State:**

- Page is functional but rough layout
- User action controls are placeholders
- Missing proper integration with ratings/reviews/actions

**What Needs Building:**

- **Layout Improvements**: Better visual hierarchy, responsive design
- **User Action Controls**: Integrated watchlist/watched/liked/favorite toggles
- **Ratings Display**: Prominent user rating vs TMDB rating comparison
- **Review Display**: Full review text with edit capability
- **Related Movies**: "You may also like" section using TMDB similar movies

**Effort Estimate:** 10-12 hours

- Layout + responsive design: 4-5 hours
- User action controls integration: 3-4 hours
- Reviews + ratings polish: 2-3 hours
- Related movies section: 1 hour

---

### 10. Favorites Subset (Backend + Frontend)

**Status:** Not yet started

See Feature #3 (Favorites System) above for full details. This is the same feature listed twice for clarity
in the status summary.

---

### 11. Movie Lists/Collections

**Status:** Not yet started (backend models + API + frontend all needed)

**Existing Resources:**

- **PRD**: `.arc/backlog/feature/prd-user-movie-lists.md` (existing, may need updates)
- **Task List**: `.arc/backlog/feature/tasks-user-movie-lists.md` (existing, may need updates)

**Important Note:** This PRD and task list were created before Django Ninja migration. They will need review
and updates to align with current Django Ninja + Pydantic patterns before implementation begins.

**Context:**

User-created custom lists (collections) allow users to organize movies beyond the built-in categories (watchlist,
library, favorites). Examples: "Summer 2024 Movies," "Nolan Films," "Comfort Food Movies," etc.

**What Needs Building:**

**Backend (Models + API):**

- `MovieList` model (list metadata: name, description, user, created_date, is_public)
- `MovieListItem` model (many-to-many through table: list, movie, order, date_added)
- TMDB keywords integration for tagging (leverage TMDB's keyword API)
- API endpoints:
    - Create/update/delete lists
    - Add/remove movies from lists
    - Reorder movies within lists
    - Get user's lists (with movie counts)
    - Get movies in a specific list (paginated)
- List visibility control (private vs public for future social features)

**Frontend:**

- **Lists Management Page**: View all user's lists, create new lists, edit/delete existing
- **List Detail Page**: View movies in a list (`/lists/{id}`), reorder via drag-and-drop, remove movies
- **Composite Cover Generation**: 2×6 poster grid for list covers (visual preview of list content)
- **Add to List Modal**: Quick-add movie to one or more lists (from movie cards, detail page)
- **List Picker**: Multi-select interface for choosing which lists to add a movie to
- **Sidebar Integration**: Collections section with system lists featured (AFI Top 100, IMDb Top 250, etc.)
- **System Lists Integration**: Watchlist and Library could be presented as "special" system lists alongside custom lists

**Technical Considerations:**

**Backend:**

- Ordering: `MovieListItem.order` field for persistent ordering
- Validation: List name length limits, maximum lists per user (cap enforcement)
- Deletion: Cascade behavior (delete list items when list is deleted)
- Pagination: Lists can contain 100s of movies, needs pagination
- Permissions: Only owner can modify their lists (future: sharing/collaboration)

**Frontend:**

- Drag-and-drop: Same pattern as watchlist/favorites reordering
- State management: TanStack Query for server state (after Frontend Modernization)
- Optimistic updates: Instant UI feedback for add/remove/reorder
- List picker UI: Checkbox list or searchable dropdown for selecting lists

**Design Decisions Needed:**

1. **System Lists Integration**:
   - Should watchlist/library appear as "special" system lists in the lists UI?
   - Or keep them separate with dedicated pages?

2. **List Limits**:
   - Maximum number of lists per user? (e.g., 50 lists)
   - Maximum movies per list? (unlimited with pagination, or cap at 500?)

3. **List Visibility**:
   - Implement public/private now, or defer until social features?
   - If public, how do we handle list URLs/sharing?

4. **System Collections**:
   - Should we create "smart" system collections? (e.g., "Highly Rated" = user_rating >= 8)
   - Or only user-created static collections?
   - Curated read-only system collections: AFI Top 100, IMDb Top 250, Oscar Best Picture, Palme d'Or
   - Featured in sidebar (4 system lists prominently displayed)

**Relationship to Other Features:**

- **Favorites**: Could be reimagined as a system list (max 50 items, pinned to top)
- **Watchlist**: Could be reimagined as a system list (unlimited, reorderable)
- **Library**: Could remain separate (all watched movies, not curated like lists)

**Effort Estimate:** 20-25 hours

**Backend:**

- Models + migrations: 2-3 hours
- API endpoints: 6-8 hours
- Tests: 4-5 hours

**Frontend:**

- Lists management page: 3-4 hours
- List detail page + reordering: 3-4 hours
- Add to list modal + picker: 3-4 hours

**Why This Is Substantial Work:**

- Full CRUD operations (Create, Read, Update, Delete) for two models
- Complex ordering logic (drag-and-drop, persist order, handle conflicts)
- Multiple UI surfaces (management page, detail page, modal, picker)
- Integration points across the app (movie cards, detail pages, navigation)

**Sequencing:**

This feature should come AFTER simpler UserMovieData features (ratings, reviews, watchlist/library polish)
because it's more complex and benefits from having established patterns for:

- Drag-and-drop reordering
- Pagination with filters
- Optimistic updates
- Modal interactions

**References:**

- Existing PRD: `.arc/backlog/feature/prd-user-movie-lists.md`
- Existing task list: `.arc/backlog/feature/tasks-user-movie-lists.md`
- META-PRD context: `.arc/reference/constitution/META-PRD.md` (Personal Movie Management section)

---

### 12. Journal Timeline View (Decision Pending)

**Status:** Decision pending on whether to implement

**Context:**

Backend data exists (all user actions have timestamps), but unclear if timeline view provides enough value
to justify implementation effort.

**What It Would Be:**

Chronological timeline of all user actions:

- "Added Inception to watchlist" - 2 days ago
- "Watched The Matrix, rated 9/10" - 1 week ago
- "Liked Interstellar" - 2 weeks ago

**Questions:**

- Is this a valuable feature or just "nice to have"?
- Would users actually use it or is Library page sufficient?
- Social features (sharing timeline) out of scope, so limited use case

**If Implemented:**

- Timeline component with infinite scroll
- Filter by action type (watchlist adds, watches, ratings, likes)
- Export functionality (download as JSON/CSV)

**Effort Estimate:** 8-10 hours (if decision is made to implement)

---

## Dependencies & Sequencing

**Phase 1: Backend Modernization** (establishes patterns)

- Service layer patterns (pagination helpers, batch operations)
- Celery/Redis (if async features needed)
- Playwright E2E testing (validates feature flows)

**Phase 2: Frontend Modernization** (establishes patterns)

- TanStack Query (server state management - replaces manual loading/error states)
- Redux Toolkit (client state management for global UI)
- React Router Data Router (better data loading patterns)

**Phase 3: UserMovieData Feature Work** (applies patterns)

- Features 1-9 implemented using established patterns
- E2E tests added for critical user journeys
- UI/UX polish across all pages

---

## Testing Strategy

**Unit Tests:**

- Rating component edge cases (0-10 range, invalid inputs)
- Review validation (character limits, empty reviews)
- Filter logic (combinations of watchlist + liked + favorited)

**Integration Tests:**

- Pagination + filtering (page 2 of watched + favorited movies)
- Drag-and-drop ordering (optimistic updates + rollback on error)
- Log modal flow (search → select → toggle actions → confirm)

**E2E Tests** (Playwright):

- Complete watchlist flow (add → reorder → mark watched → rate → review)
- Library page filtering and sorting
- Favorites management (add → cap enforcement → reordering)
- Log modal quick-add flow

---

## Future Enhancements (Post-MVP)

**Social Features** (currently out of scope):

- Share watchlists with other users
- Follow users and see their activity
- Movie recommendations based on similar users

**Advanced Features**:

- Custom lists/collections (see separate PRD)
- Movie recommendation engine (see separate notes)
- Calendar view (release dates for watchlist movies)
- Statistics dashboard (movies watched per year, genre breakdown, rating distribution)

---

## Notes

- All backend APIs are production-ready (100% test pass rate, 0 type errors)
- Frontend uses auto-generated TypeScript types from Django Ninja OpenAPI schema
- Service layer patterns from Backend Modernization will make API integration cleaner
- TanStack Query from Frontend Modernization will eliminate manual loading/error state management

---

## Known Architectural Issues (Frontend State Management)

**Discovered:** 2025-12-23 during toast notification implementation
**Root Cause:** Stale props without proper state synchronization
**Resolution:** TanStack Query adoption (see Frontend Modernization)

### Issue 1: Stale Movie Props After API Calls

**Symptom:** After toggling watchlist, subsequent toggles fail or show wrong state.

**Root cause:** `useMovieActions` receives `movie` prop which includes `user_movie_data`. After API call:

1. Service layer updates backend correctly
2. Service returns updated UserMovieData
3. But parent component (movie list) still has stale `movie.user_movie_data`
4. Next toggle reads stale data, tries wrong operation (CREATE vs UPDATE)

**Current workaround:** Service layer fetches fresh data on 400 errors and toggles based on actual server state.

**Proper fix:** TanStack Query cache invalidation - when watchlist mutation succeeds, invalidate movie list
queries so they refetch with updated `user_movie_data`.

### Issue 2: Two Different Hooks for Same Domain

**Hooks:**

- `useMovieActions` - Used by MovieCard, handles CREATE + UPDATE via service layer
- `useUserMovieData` - Used by MovieDetail, only handles UPDATE (requires existing data)

**Problem:** MovieDetail can't add movies to watchlist if user has never interacted with that movie
(no existing UserMovieData record).

**Analysis needed:**

- Is there a good reason for two hooks? (Different use cases? Performance?)
- Or is this development remnants / unconsolidated work?
- Should `useUserMovieData` be enhanced to support CREATE?
- Or should MovieDetail switch to `useMovieActions`? (Type differences: MovieDetailType vs MovieListItem)

**Recommendation:** Consolidate during TanStack Query migration - create unified `useMovieMutations` hook
using `useMutation` with proper cache invalidation.

### Issue 3: Undo Button Deferred

**Context:** Toast notification for "Removed from watchlist" originally had Undo button.

**Problem:** Undo action is disconnected from MovieCard's local state:

1. MovieCard has `localWatchlistState` for optimistic updates
2. Undo in toast calls `toggleWatchlist()` directly (bypasses local state)
3. API succeeds but MovieCard shows wrong state

**Current state:** Undo button removed, deferred until proper state sync exists.

**Proper fix:** TanStack Query mutations with `onSuccess` callback that invalidates queries,
causing MovieCard to refetch and show correct state.

### Issue 4: Axios Error Structure

**Fixed in:** 2025-12-23 (movieInteractionService.ts, useMovieActions.ts)

**Issue:** Error handling checked `error.status` but Axios errors have `error.response.status`.
Race condition handler wasn't triggering because error type check failed.

**Resolution:** Added proper Axios error type guards and message extraction:

- `getErrorStatus(error)` - extracts status from Axios error structure
- `getErrorMessage(error)` - extracts message from various error formats

### Recommended Resolution Path

1. **Short-term (current):** Service layer workarounds in place, Undo button deferred
2. **Medium-term (Frontend Modernization, `plan-frontend-modernization.md`):**
   TanStack Query mutations for user movie data
   - `useMutation` for watchlist/watched/liked/rating toggles
   - `queryClient.invalidateQueries()` on mutation success
   - Optimistic updates with automatic rollback
3. **Long-term (Feature work):** Consolidate hooks into unified patterns

**Related files:**

- `frontend/src/hooks/movie/useMovieActions.ts` - MovieCard integration
- `frontend/src/hooks/movie/useUserMovieData.ts` - MovieDetail integration
- `frontend/src/services/movieInteractionService.ts` - Service layer with workarounds
- `frontend/src/pages/movie/MovieDetail.tsx` - Uses useUserMovieData
- `frontend/src/components/movie/MovieCard.tsx` - Uses useMovieActions

---

**Last Updated:** 2025-12-23
