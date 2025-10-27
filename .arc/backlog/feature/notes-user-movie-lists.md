# User Movie Lists/Collections - Feature Notes

**Document Purpose:** Track planning for custom movie lists/collections feature.
This captures the concept and key decisions for future reference when work becomes active.

**Status:** Planning / Future Work (Post-Frontend Modernization)
**Priority:** Medium (after Service Layer + Backend Modernization + Frontend Modernization)

**Work Classification:** Feature

---

## Overview

User Movie Lists (also called "Collections") enables users to create and organize custom movie collections
beyond the built-in watchlist/library features. The system supports both user-created lists and curated
system collections for discovery.

**Core Value:**

- Enables personal organization (e.g., "Best Sci-Fi", "Movies to Watch with Family")
- Provides curated discovery via system collections (AFI Top 100, IMDb Top 250, Oscar winners, etc.)
- Establishes foundation for future recommendation capabilities via TMDB keywords

**Relationship to Existing Features:**

- Distinct from Watchlist (single list of "want to watch")
- Distinct from Library/Watched (single list of "have watched")
- Complements UserMovieData domain (ratings, reviews, favorites)

---

## Core Concept

### Backend Data Models

**UserMovieList:**

- Fields: id, user (nullable for system lists), title, description, created_at, updated_at, is_system_list
- Supports both user-created and system-curated collections
- Nullable user field enables system collections (AFI Top 100, etc.)

**UserMovieListItem:**

- Fields: id, list, movie (TMDB ID), position/order, added_at
- Through model enabling many-to-many with ordering
- Position field supports drag-and-drop reordering capability

**TMDB Keywords Integration:**

- Leverage existing TMDB keyword endpoints for list tagging
- Enables future recommendation system (movies with shared keywords)
- No custom categories outside TMDB ecosystem (maintains TMDB compliance)

### Frontend Features

**Individual List Page:**

- URL pattern: `/lists/{id}`
- Composite cover image (2×6 grid of movie posters from list contents)
- Movie grid display (reuses existing MovieGrid component patterns)
- List metadata (title, description, count, tags/keywords if applicable)

**Sidebar Integration:**

- Dedicated "Collections" section
- Initially populated with 4 curated system collections
- Future: User lists appear here when created

**Composite Cover Generation:**

- HTML5 Canvas API for poster collage (2×6 grid)
- Caching strategy TBD (client-side vs backend generation)
- Fallback handling for missing posters

---

## System Collections (Curated Lists)

**Initial System Collections** (4 lists to populate sidebar):

1. **AFI Top 100** - American Film Institute's Top 100 Films
2. **IMDb Top 250** - Community-rated top films
3. **Oscar Best Picture Winners** - Academy Award winners (all years)
4. **Palme d'Or Winners** - Cannes Film Festival top prize winners

**Data Population:**

- Django management command for initial seeding
- Research required: Map historical film lists to TMDB IDs
- Validation: Handle missing/unavailable TMDB movies gracefully

---

## Implementation Phases (Historical Planning)

**Phase 1: Backend Foundation**

- Django models (UserMovieList, UserMovieListItem)
- CRUD API endpoints (create, read, update, delete)
- Service layer for business logic
- Test coverage for models and APIs

**Phase 2: Frontend Display**

- Individual list page components
- Composite cover image generation
- Movie grid integration (reuse existing patterns)
- Responsive design

**Phase 3: System Collections**

- Research and compile 4 curated collections
- Data population via management command
- Sidebar integration

**Phase 4: User List Management UI** (Future)

- Create/edit/delete UI for user-generated lists
- Add/remove movies from lists
- Drag-and-drop reordering
- List privacy settings (if social features added later)

---

## Technical Considerations

### Database Design

- PostgreSQL with Django ORM relationships
- Foreign key to User (nullable for system lists)
- Many-to-many with Movie via through model (enables ordering)
- Indexing on user_id and is_system_list for efficient queries

### TMDB Integration

- Existing keywords API already implemented (reuse)
- Movie ID validation (ensure referenced movies exist in TMDB)
- Error handling for deleted/unavailable movies
- Rate limiting compliance

### Frontend Architecture

- React components following existing patterns (PageHeader, MovieGrid)
- URL routing with React Router
- Leverage existing Chakra UI components where possible
- State management via TanStack Query (after Frontend Modernization)

### Performance

- Lazy loading of list contents for large collections
- Composite cover caching strategy
- Efficient queries with select_related/prefetch_related

---

## Non-Goals (Out of Scope)

- **Social features**: No public/private lists, sharing, or collaborative editing
- **User comments**: No notes on individual movies within lists (use reviews instead)
- **Advanced filtering**: Keep list views simple (just movie grid)
- **Watchlist integration**: Lists are separate from watchlist/library features
- **Real-time collaboration**: Single-user editing only

---

## Key Decisions to Make (When Work Becomes Active)

1. **Composite cover caching**: Client-side generation vs backend pre-generation?
2. **Keyword tagging UI**: How do users discover and apply TMDB keywords?
3. **List limits**: Should users have max number of lists? Max movies per list?
4. **Default ordering**: Chronological (added_at) vs manual (position field)?
5. **List privacy**: Future consideration if social features are added

---

## Dependencies

**Prerequisites:**

- ✅ Backend API framework (Django Ninja - complete)
- ✅ UserMovieData models (complete)
- ⏳ Frontend Modernization (TanStack Query for state management)
- ⏳ Service Layer patterns (pagination, batch operations)

**Blocked By:**

- Service Layer Modernization (pagination helpers needed for large lists)
- Frontend Modernization (TanStack Query for cleaner data fetching)

**Enables:**

- Future recommendation system (via TMDB keyword overlap)
- Enhanced discovery features (curated collections sidebar)
- User organization capabilities beyond watchlist/library

---

## References

**Original Planning Documents** (archived for historical context):

- `.arc/backlog/feature/prd-user-movie-lists.md` (deleted - consolidated into notes)
- `.arc/backlog/feature/tasks-user-movie-lists.md` (deleted - consolidated into notes)

**Related Features:**

- `notes-user-movie-data-features.md` - Related UserMovieData domain features (watchlist, ratings, reviews)
- `notes-feature-backlog.md` - Other discovery features (movie/person detail pages)

---

**Next Steps:**

When ready to begin implementation:

1. Create fresh PRD from this notes file (via `workflows/1-create-prd.md`)
2. Generate task breakdown (via `workflows/2-generate-tasks.md`)
3. Create feature branch and begin implementation
4. Ensure Backend + Frontend Modernization are complete first (dependencies)

**Estimated Effort** (from original planning): 2-3 weeks (backend + frontend + system collections)
