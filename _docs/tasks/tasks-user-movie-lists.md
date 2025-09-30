## Relevant Files

- `backend/apps/user_movie_data/models.py` - Add UserMovieList and UserMovieListItem models
- `backend/apps/user_movie_data/serializers.py` - Add list serializers to existing file
- `backend/apps/user_movie_data/views.py` - Add list endpoints to existing ViewSet
- `backend/apps/user_movie_data/services/list_service.py` - New service for list business logic
- `backend/apps/user_movie_data/tests/test_user_movie_lists_api.py` - New test file for lists
- `backend/apps/core/admin.py` - Add list models to existing admin
- `backend/apps/movie/services/keyword_service.py` - Enhanced keyword integration
- `frontend/src/pages/lists/` - List page components directory
- `frontend/src/pages/lists/ListDetailPage.tsx` - Individual list display page
- `frontend/src/components/lists/` - List-related UI components
- `frontend/src/components/lists/ListHeader.tsx` - List page header with composite cover
- `frontend/src/components/lists/CompositeListCover.tsx` - Auto-generated cover component
- `frontend/src/components/lists/ListMovieGrid.tsx` - Movie grid for list display
- `frontend/src/services/listService.ts` - Frontend API service for lists
- `frontend/src/hooks/useListData.tsx` - Custom hook for list data management
- `frontend/src/components/layout/Sidebar.tsx` - Updated sidebar with collections
- `backend/management/commands/populate_system_lists.py` - Data population script
- `backend/data/system_lists.json` - System collections data file

### Notes

- Unit tests should be placed alongside code files (e.g., `models.test.py`, `ListHeader.test.tsx`)
- Use `docker-compose exec backend python manage.py test --keepdb` for backend tests
- Use `docker-compose exec frontend npm test` for frontend tests
- Follow existing patterns in `backend/apps/movie/` for new Django app structure
- Leverage existing MovieGrid component and styling patterns

## Tasks

- [ ] 1.0 Backend Data Models and Database Setup
  - [ ] 1.1 Add UserMovieList model to `core/models.py` with proper relationships
  - [ ] 1.2 Add UserMovieListItem model to `core/models.py` with position/ordering support
  - [ ] 1.3 Create and run database migrations for new models
  - [ ] 1.4 Add list models to Django admin interface in `core/admin.py`
  - [ ] 1.5 Write comprehensive model tests in `user_movie_data/tests/`
  - [ ] 1.6 Update existing UserMovieData relationships if needed

- [ ] 2.0 API Endpoints for List Management  
  - [ ] 2.1 Add list serializers to existing `user_movie_data/serializers.py`
  - [ ] 2.2 Extend existing UserMovieDataViewSet with list management endpoints
  - [ ] 2.3 Create list service layer in `user_movie_data/services/list_service.py`
  - [ ] 2.4 Add list item management endpoints (add, remove, reorder movies)
  - [ ] 2.5 Leverage existing authentication and permissions from ViewSet
  - [ ] 2.6 Write API endpoint tests in new `test_user_movie_lists_api.py`

- [ ] 3.0 TMDB Keywords Integration Enhancement
  - [ ] 3.1 Research optimal TMDB keywords API usage patterns for list tagging
  - [ ] 3.2 Enhance existing keyword service with list-specific functionality
  - [ ] 3.3 Add keyword relationship to UserMovieList model if needed
  - [ ] 3.4 Create keyword validation and error handling
  - [ ] 3.5 Write tests for keyword integration with user lists
  - [ ] 3.6 Document keyword usage patterns for future recommendations system

- [ ] 4.0 Frontend List Display Components
  - [ ] 4.1 Create ListDetailPage component with routing (`/lists/{id}`)
  - [ ] 4.2 Implement ListHeader component with metadata display
  - [ ] 4.3 Create ListMovieGrid component leveraging existing MovieGrid
  - [ ] 4.4 Add responsive design and mobile-friendly layout
  - [ ] 4.5 Implement loading states and error handling
  - [ ] 4.6 Write component tests for all new list display elements

- [ ] 5.0 Composite Cover Image Generation
  - [ ] 5.1 Research HTML5 Canvas API for poster composite generation
  - [ ] 5.2 Implement CompositeListCover component with 2×6 poster grid
  - [ ] 5.3 Add image loading, error handling, and fallback covers
  - [ ] 5.4 Optimize image sizing and performance for various screen sizes
  - [ ] 5.5 Implement caching strategy for generated composite covers
  - [ ] 5.6 Write tests for cover generation including edge cases (missing posters)

- [ ] 6.0 System Collections Data and Population
  - [ ] 6.1 Research and compile AFI Top 100 movie list with TMDB IDs
  - [ ] 6.2 Research and compile IMDb Top 250 movie list with TMDB IDs
  - [ ] 6.3 Research and compile Oscar Best Picture Winners with TMDB IDs
  - [ ] 6.4 Research and compile Cannes Palme d'Or Winners with TMDB IDs
  - [ ] 6.5 Create Django management command for system list population
  - [ ] 6.6 Write data validation and error handling for missing TMDB movies

- [ ] 7.0 Sidebar Integration and Navigation
  - [ ] 7.1 Update Sidebar component to include Collections section
  - [ ] 7.2 Add navigation links for all 4 system collections
  - [ ] 7.3 Implement proper active state highlighting for list pages
  - [ ] 7.4 Ensure responsive behavior and mobile navigation compatibility
  - [ ] 7.5 Update existing tests to account for new navigation structure
  - [ ] 7.6 Test complete user flow from sidebar to list display