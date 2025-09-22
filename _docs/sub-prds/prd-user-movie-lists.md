# Sub-PRD: User Movie Lists

## 1. Introduction/Overview

This feature introduces a comprehensive User Movie Lists system that enables users to create, manage, and organize custom collections of movies. The system serves dual purposes: providing immediate value through curated system collections (for sidebar content) while establishing the foundation for user-generated content and future recommendation capabilities.

The feature leverages existing TMDB keywords infrastructure for tagging and integrates seamlessly with the current application architecture. System collections will showcase prestigious film lists (AFI Top 100, IMDb Top 250, Oscar winners, Palme d'Or winners) while user lists provide personal organization capabilities.

## 2. Goals

- **Primary**: Implement backend UserMovieList model with full CRUD capability
- **Secondary**: Create read-only frontend display for individual list pages
- **Tertiary**: Populate sidebar with 4 curated system collections
- **Strategic**: Establish foundation for user list management UI and recommendations system
- **Technical**: Leverage existing TMDB keywords for list tagging and future recommendations

## 3. User Stories

- **As a movie enthusiast**, I want to view curated collections like "AFI Top 100" so I can discover critically acclaimed films
- **As a user**, I want to see a list page with movie grid and composite cover art so I can browse collection contents effectively  
- **As a user**, I want lists to show movies in meaningful order so I can understand the collection's structure
- **As a developer**, I want a scalable backend architecture so I can easily add list management UI later
- **As a product owner**, I want to leverage TMDB keywords so the system integrates with future recommendation features

## 4. Functional Requirements

### 4.1 Data Model & Backend (Phase 1)
1. **UserMovieList model** with fields: id, user (nullable for system lists), title, description, created_at, updated_at, is_system_list
2. **UserMovieListItem model** with fields: id, list, movie (TMDB ID), position/order, added_at  
3. **Keywords integration** using existing TMDB keyword endpoints for list tagging
4. **CRUD API endpoints** for list management (create, read, update, delete lists and list items)
5. **Ordering support** with position field for drag-and-drop reordering capability
6. **System list flagging** to distinguish curated collections from user-generated content

### 4.2 Frontend Display (Phase 2)  
7. **Individual list page** with URL pattern `/lists/{id}`
8. **Composite cover image generation** using 2×6 grid of movie posters from list contents
9. **Movie grid display** with consistent styling matching existing browse pages
10. **List metadata display** showing title, description, movie count, and tags (if applicable)
11. **Responsive design** ensuring proper display across device sizes

### 4.3 System Collections (Phase 3)
12. **Four curated collections**: AFI Top 100, IMDb Top 250, Oscar Best Picture Winners, Palme d'Or Winners
13. **Sidebar integration** displaying system collections in dedicated "Collections" section
14. **Data population** with researched movie lists and appropriate TMDB movie IDs
15. **Professional presentation** with curated descriptions and proper historical context

### 4.4 TMDB Keywords Integration (Research Phase)
16. **Keyword tagging capability** for lists using existing search/popular keyword endpoints
17. **TMDB compliance** ensuring no custom tags/categories are created outside TMDB ecosystem
18. **Future-ready architecture** supporting recommendation system integration via shared keyword metadata

## 5. Non-Goals (Out of Scope)

- User list creation/editing UI (Phase 4 - future implementation)
- Public/private list settings (no social features planned)
- List sharing or collaborative editing capabilities  
- User comments or notes on individual movies within lists
- Advanced filtering within list views (keep simple for now)
- Integration with user's existing watchlist/library (separate features)

## 6. Technical Considerations

### 6.1 Database Design
- **PostgreSQL** with Django ORM relationships
- **Foreign key** to User model (nullable for system lists)
- **Many-to-many** relationship with Movie via through model for ordering
- **Indexing** on user_id and is_system_list for efficient queries

### 6.2 TMDB Integration  
- **Existing keywords API** already implemented in backend
- **Movie ID validation** ensuring referenced movies exist in TMDB
- **Error handling** for deleted or unavailable TMDB movies
- **Rate limiting compliance** with TMDB API usage guidelines

### 6.3 Frontend Architecture
- **React components** following existing patterns (PageHeader, MovieGrid, etc.)
- **Composite image generation** using HTML5 Canvas API for poster collages
- **Responsive grid** leveraging existing Chakra UI MovieGrid component
- **URL routing** with React Router for individual list pages

### 6.4 Performance Considerations
- **Lazy loading** of list contents for large collections
- **Image optimization** for composite cover generation
- **Caching strategy** for system collections (rarely change)
- **Pagination support** for lists exceeding standard page sizes

## 7. Success Metrics

- **Backend API completeness**: All CRUD endpoints functional and tested
- **Frontend display quality**: List pages render correctly with proper composite covers
- **System collections accuracy**: All 4 collections populated with correct movie data
- **Performance benchmarks**: List pages load within 2 seconds for typical collection sizes
- **Foundation readiness**: Architecture supports user list management UI implementation

## 8. Implementation Phases

### Phase 1: Backend Foundation
- Django models for UserMovieList and UserMovieListItem
- API endpoints for list CRUD operations
- TMDB keywords integration research and implementation
- Database migrations and admin interface setup

### Phase 2: Frontend Display
- Individual list page component development
- Composite cover image generation functionality  
- Movie grid integration with existing components
- Responsive design implementation and testing

### Phase 3: System Collections
- Research and data compilation for 4 target collections
- Database population scripts for system lists
- Sidebar integration and navigation updates
- Content review and quality assurance

### Phase 4: User Management UI (Future)
- List creation and editing interfaces
- Drag-and-drop reordering functionality
- Keyword tagging UI integration
- User experience testing and refinement

## 9. Open Questions

- **Composite image caching**: Should generated covers be cached server-side or generated client-side each time?
- **System list updates**: How frequently should curated collections be updated, and what process should be used?
- **Keyword tag limits**: Should there be restrictions on number of keywords per list to maintain usability?
- **List size limits**: What maximum number of movies per list should be supported for performance?
- **Mobile experience**: Any specific mobile-first considerations for list browsing and cover art display?