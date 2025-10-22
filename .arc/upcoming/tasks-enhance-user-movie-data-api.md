# User Movie Data API Enhancements (Reclassified from Incidental)

> **⚠️ RECLASSIFICATION DECISION (2025-10-21)**
>
> **Originally Created As**: Incidental work during API Layer Modernization P2
>
> **Reclassified To**: Separate planned work streams to better align with project structure:
>
> - **Pagination Feature** → Integrate with upcoming UserMovieData feature work (feature branch)
>     - Rationale: Pagination is a product feature enhancement, not technical infrastructure
>     - Grouping: Combine with other planned UserMovieData features for cohesive feature release
>
> - **DRY Helpers, Type Safety, N+1 Optimization** → Integrate into Backend Modernization phase
>     - Rationale: Service layer patterns, architectural improvements, performance optimization
>     - Perfect fit: Backend Modernization explicitly scoped for service layer pattern application
>     - Scope alignment: These are infrastructure/architecture improvements, not feature additions
>
> **Why Not Incidental**: The original "incidental" classification was made during active feature work.
> Upon reflection, this work represents two distinct categories of planned improvements that deserve
> proper integration into their respective workflows rather than ad-hoc "incidental" treatment.
>
> **Action**: This task list remains in `.arc/upcoming/` as reference material. Work will be broken out
> and integrated into appropriate feature/technical branches when those phases begin.

**Created**: 2025-10-21
**Triggered By**: CodeRabbit Finding #7 during local pre-PR review (agent-pre-merge-review workflow)
**Status**: Deferred (awaiting integration into appropriate work streams)
**Original Estimated Effort**: 3-4 hours (will be re-estimated when broken out)

## Context

**Why Now**: Production endpoint (`/api/user-movie-data/movies`) is missing pagination support that frontend
expects, creating potential performance issues and poor UX for users with large collections (100+ movies).
Additionally, discovered multiple DRY violations and architectural inconsistencies during investigation.

**Discovery**: During CodeRabbit local review of API Layer Modernization P2 branch, Finding #7 identified:

1. Missing pagination (frontend TypeScript expects `page?: number`, backend doesn't implement it)
2. N+1 TMDB API calls (loops calling `get_movie_by_id()` individually)
3. In-place mutation in enrichment service (violates functional programming principles)
4. Type safety opportunities with existing `.pyi` stubs

**Impact**:

- **Performance**: N+1 TMDB calls for users with large watchlists (100+ movies = 100+ API calls)
- **UX**: No pagination means slow page loads and poor mobile experience
- **Code Quality**: Multiple DRY violations and architectural inconsistencies
- **Type Safety**: Unnecessary `pyright: ignore` comments with `.pyi` stubs in place

## Scope

**Will Do**:

- Add pagination support to `/api/user-movie-data/movies` endpoint (page, page_size parameters)
- Create reusable `paginate_queryset()` helper for Django QuerySet pagination
- Create `fetch_movies_batch()` helper to encapsulate TMDB N+1 loop pattern
- Create `build_user_movies_response()` high-level response builder (DRY composition)
- Fix in-place mutation in `MovieEnrichmentService.enrich_movies_with_user_movie_data()`
- Investigate and remove unnecessary `pyright: ignore` comments in user_movie_data domain
- Update frontend TypeScript service to use pagination parameters
- Add comprehensive tests for pagination edge cases
- Document architectural patterns in implementation notes

**Won't Do** (deferred or out of scope):

- TMDB batch API investigation (no batch endpoint available per TMDB API docs)
- Caching layer for TMDB responses (deferred to Backend Modernization)
- Generic pagination for all endpoints (scope limited to user-movie-data domain)
- Performance optimization beyond N+1 elimination (future work)

## Tasks

### Phase 1: Create Reusable Pagination Helpers

- [ ] 1.1 Create Django QuerySet pagination helper
    - [ ] 1.1.1 Create `backend/apps/core/pagination.py` module
    - [ ] 1.1.2 Implement `paginate_queryset()` function with type annotations
    - [ ] 1.1.3 Add validation (page >= 1, page_size bounds)
    - [ ] 1.1.4 Return tuple: (paginated_queryset, pagination_metadata)
    - [ ] 1.1.5 Add comprehensive docstring with examples
    - [ ] 1.1.6 Run incremental quality checks (ruff, pyright)

- [ ] 1.2 Create TMDB batch fetch helper
    - [ ] 1.2.1 Create `backend/apps/movie/helpers.py` addition (or new module if too large)
    - [ ] 1.2.2 Implement `fetch_movies_batch(tmdb_ids: list[int]) -> list[MovieBaseSchema]`
    - [ ] 1.2.3 Encapsulate loop + error handling pattern from current endpoint
    - [ ] 1.2.4 Add graceful error handling (skip unavailable movies)
    - [ ] 1.2.5 Add structured logging for batch operations
    - [ ] 1.2.6 Add comprehensive docstring with examples
    - [ ] 1.2.7 Run incremental quality checks (ruff, pyright)

- [ ] 1.3 Create user movies response builder (high-level DRY)
    - [ ] 1.3.1 Create `build_user_movies_response()` in movie/helpers.py
    - [ ] 1.3.2 Compose pagination + TMDB fetch + enrichment
    - [ ] 1.3.3 Accept QuerySet, page, page_size parameters
    - [ ] 1.3.4 Return complete `PaginatedMovieResponseSchema`
    - [ ] 1.3.5 Add comprehensive docstring with architectural notes
    - [ ] 1.3.6 Run incremental quality checks (ruff, pyright)

### Phase 2: Fix User Movie Data Endpoint

- [ ] 2.1 Add pagination parameters to endpoint
    - [ ] 2.1.1 Add `params: PaginationParams` to function signature
    - [ ] 2.1.2 Extract page parameter with default (page = params.page or 1)
    - [ ] 2.1.3 Define page_size constant (DEFAULT_PAGE_SIZE = 20)
    - [ ] 2.1.4 Update docstring with pagination documentation
    - [ ] 2.1.5 Run incremental quality checks (ruff, pyright)

- [ ] 2.2 Refactor endpoint to use new helpers
    - [ ] 2.2.1 Replace manual logic with `build_user_movies_response()` call
    - [ ] 2.2.2 Verify watchlist filter still works correctly
    - [ ] 2.2.3 Remove hardcoded pagination metadata
    - [ ] 2.2.4 Update endpoint docstring with new behavior
    - [ ] 2.2.5 Run incremental quality checks (ruff, pyright)

- [ ] 2.3 Update frontend TypeScript service
    - [ ] 2.3.1 Verify `UserMoviesQueryParams.page` is used in API calls
    - [ ] 2.3.2 Update JSDoc if pagination behavior changed
    - [ ] 2.3.3 Run frontend type checking (npm run type-check)

### Phase 3: Fix In-Place Mutation

- [ ] 3.1 Fix MovieEnrichmentService mutation
    - [ ] 3.1.1 Read current `movie_enrichment_service.py` implementation
    - [ ] 3.1.2 Change return type to return new list (not mutate input)
    - [ ] 3.1.3 Create new MovieBaseSchema instances instead of mutating
    - [ ] 3.1.4 Update docstring to reflect functional approach
    - [ ] 3.1.5 Update all callers (movie/helpers.py, user_movie_data/api.py)
    - [ ] 3.1.6 Run incremental quality checks (ruff, pyright)

### Phase 4: Type Safety Improvements

- [ ] 4.1 Investigate type ignores in user_movie_data domain
    - [ ] 4.1.1 Audit all `pyright: ignore` comments in user_movie_data/
    - [ ] 4.1.2 Check if `.pyi` stubs provide necessary type information
    - [ ] 4.1.3 Test removing ignores one-by-one with pyright
    - [ ] 4.1.4 Document legitimate ignores (django-types limitations)
    - [ ] 4.1.5 Remove unnecessary ignores with proper type assertions
    - [ ] 4.1.6 Run full pyright check (zero errors target)

- [ ] 4.2 Investigate type ignores in enrichment service
    - [ ] 4.2.1 Check `umd.movie.tmdb_id` type inference (line 71, 123, 135-136)
    - [ ] 4.2.2 Verify `.pyi` stubs declare `movie: Movie` with `tmdb_id: int`
    - [ ] 4.2.3 Test if explicit type assertions eliminate ignores
    - [ ] 4.2.4 Document ForeignKey traversal limitations if unavoidable
    - [ ] 4.2.5 Run incremental quality checks (pyright)

### Phase 5: Testing

- [ ] 5.1 Write tests for pagination helper
    - [ ] 5.1.1 Create `backend/apps/core/tests/test_pagination.py`
    - [ ] 5.1.2 Test basic pagination (page 1, page 2, page 3)
    - [ ] 5.1.3 Test edge cases (page > total_pages, page < 1, empty QuerySet)
    - [ ] 5.1.4 Test page_size boundaries (min, max, default)
    - [ ] 5.1.5 Test total_pages calculation (various total_results counts)
    - [ ] 5.1.6 Run tests (pytest apps/core/tests/test_pagination.py)

- [ ] 5.2 Write tests for batch fetch helper
    - [ ] 5.2.1 Create tests in `backend/apps/movie/tests/test_helpers.py`
    - [ ] 5.2.2 Test successful batch fetch (all movies available)
    - [ ] 5.2.3 Test partial failures (some movies unavailable)
    - [ ] 5.2.4 Test complete failures (TMDB API down)
    - [ ] 5.2.5 Test empty input list
    - [ ] 5.2.6 Run tests (pytest apps/movie/tests/test_helpers.py)

- [ ] 5.3 Update existing watchlist endpoint tests
    - [ ] 5.3.1 Read `test_watchlist_endpoint.py` current tests
    - [ ] 5.3.2 Add pagination parameter tests (page 1, page 2, page 3)
    - [ ] 5.3.3 Test pagination with watchlist filter
    - [ ] 5.3.4 Test edge cases (page beyond last page)
    - [ ] 5.3.5 Update pagination structure assertions
    - [ ] 5.3.6 Run tests (pytest apps/user_movie_data/tests/test_watchlist_endpoint.py)

### Phase 6: Documentation & Quality Gates

- [ ] 6.1 Update documentation
    - [ ] 6.1.1 Add pagination patterns to implementation notes (this task list)
    - [ ] 6.1.2 Document DRY helper architecture decisions
    - [ ] 6.1.3 Document type safety investigation findings
    - [ ] 6.1.4 Update API endpoint docstrings

- [ ] 6.2 Run full quality gates
    - [ ] 6.2.1 Backend tests: 100% pass rate (pytest apps/)
    - [ ] 6.2.2 Frontend tests: 100% pass rate (npm test)
    - [ ] 6.2.3 Backend linting: 0 violations (ruff check)
    - [ ] 6.2.4 Frontend linting: 0 violations (npm run lint)
    - [ ] 6.2.5 Type checking: 0 errors (pyright backend, npm run type-check)
    - [ ] 6.2.6 Markdown linting: 0 violations (markdownlint-cli2)

## Implementation Notes

### Architectural Pattern: TMDB vs User-Movie-Data Flow

**Key Discovery**: TMDB endpoints and user-movie-data endpoint have *inverted* architectures:

- **TMDB flow**: External API → Full movies → Enrich with user data
- **User data flow**: Local DB → Movie IDs → Fetch full movies → Enrich with user data

The user-movie-data endpoint does the TMDB flow backwards. We start with user data and need to fetch movies,
whereas TMDB endpoints start with movies and fetch user data. This explains why existing helpers
(`enrich_response_with_user_movie_data()`) don't fit - they're designed for the opposite direction.

**Solution**: Create complementary helpers for the user-data-first flow:

1. `paginate_queryset()` - Generic Django pagination
2. `fetch_movies_batch()` - TMDB fetching from IDs
3. `build_user_movies_response()` - Composition layer

### DRY Principles Applied

**Helper 1: Generic Pagination**

```python
# Reusable across ALL local DB endpoints
def paginate_queryset(
    queryset: QuerySet,
    page: int,
    page_size: int = 20
) -> tuple[QuerySet, dict[str, int]]:
    """Generic Django QuerySet pagination."""
    total_count = queryset.count()
    total_pages = (total_count + page_size - 1) // page_size

    start = (page - 1) * page_size
    end = start + page_size

    return (
        queryset[start:end],
        {
            'page': page,
            'total_pages': total_pages,
            'total_results': total_count
        }
    )
```

**Helper 2: Batch TMDB Fetch**

```python
# Encapsulates N+1 loop pattern with error handling
def fetch_movies_batch(tmdb_ids: list[int]) -> list[MovieBaseSchema]:
    """Fetch multiple movies from TMDB with error handling.

    Returns movies that succeed, skips failures gracefully.
    """
    movies: list[MovieBaseSchema] = []
    for tmdb_id in tmdb_ids:
        try:
            movie_detail = movie_service.get_movie_by_id(tmdb_id)
            movies.append(movie_detail)
        except HttpError:
            # Skip movies that are no longer available in TMDB
            continue
    return movies
```

**Helper 3: Response Builder (High-Level DRY)**

```python
# Composes pagination + fetch + enrichment
def build_user_movies_response(
    user_data_qs: QuerySet[UserMovieData],
    user: AbstractBaseUser,
    page: int,
    page_size: int = 20
) -> PaginatedMovieResponseSchema:
    """Build paginated movie response from UserMovieData QuerySet.

    Handles: pagination, TMDB fetching, enrichment, error handling.
    """
    # Paginate QuerySet
    paginated_qs, pagination_meta = paginate_queryset(user_data_qs, page, page_size)

    # Extract TMDB IDs from paginated data only
    tmdb_ids = [umd.movie.tmdb_id for umd in paginated_qs]

    # Batch fetch movies
    movies = fetch_movies_batch(tmdb_ids)

    # Enrich with user data
    enriched_movies = enrichment_service.enrich_movies_with_user_movie_data(movies, user)

    return PaginatedMovieResponseSchema(
        page=pagination_meta['page'],
        total_pages=pagination_meta['total_pages'],
        total_results=pagination_meta['total_results'],
        results=enriched_movies
    )
```

### Type Safety Investigation Context

**Existing Infrastructure**:

- `.pyi` stub files exist: `backend/apps/core/models.pyi`, `backend/apps/user_movie_data/models.pyi`
- Stubs declare: `UserMovieData.movie: Movie` and `Movie.tmdb_id: int`
- Configuration: `pyrightconfig.json` with `reportUnknownMemberType: "information"`

**Current Ignores**:

```python
# user_movie_data/api.py:71
tmdb_ids = [umd.movie.tmdb_id for umd in user_data_qs]  # pyright: ignore[reportUnknownMemberType]

# movie_enrichment_service.py:123, 135-136
user_data_map: dict[int, UserMovieData] = {
    umd.movie.tmdb_id: umd  # pyright: ignore[reportUnknownMemberType]
    for umd in user_data_qs
}
```

**Investigation Questions**:

1. Why does Pyright report `reportUnknownMemberType` despite `.pyi` stubs?
2. Is this a ForeignKey traversal limitation in django-types?
3. Can explicit type assertions eliminate ignores?
4. Per Type Safety Strategy: Are these "acceptable information-level warnings" or fixable?

**Expected Outcome**: Either eliminate ignores with proper patterns OR document as legitimate django-types
ForeignKey limitation per strategy-type-safety.md lines 320-329.

### Mutation Fix Pattern

**Current (Mutates Input)**:

```python
def enrich_movies_with_user_movie_data(
    self,
    movies: list[MovieBaseSchema],
    user: AbstractBaseUser | None
) -> list[MovieBaseSchema]:
    for movie in movies:
        movie.user_movie_data = UserMovieDataSchema(...)  # MUTATES
    return movies  # Returns mutated input
```

**Fixed (Functional Approach)**:

```python
def enrich_movies_with_user_movie_data(
    self,
    movies: list[MovieBaseSchema],
    user: AbstractBaseUser | None
) -> list[MovieBaseSchema]:
    enriched = []
    for movie in movies:
        # Create new instance instead of mutating
        enriched_movie = movie.model_copy(deep=True)
        enriched_movie.user_movie_data = UserMovieDataSchema(...)
        enriched.append(enriched_movie)
    return enriched  # Returns new list
```

**Rationale**: Functional approach prevents unexpected side effects, aligns with Pydantic's immutable-by-default philosophy.

## References

- **CodeRabbit Finding #7**: `backend/apps/user_movie_data/api.py lines 34-109`
- **Frontend Service**: `frontend/src/services/userMovieService.ts` (expects pagination)
- **Frontend Route**: `frontend/src/constants/routes.ts:6` (`WATCHLIST` production feature)
- **Type Safety Strategy**: `.arc/reference/strategies/strategy-type-safety.md` (lines 320-329)
- **Existing Helpers**: `backend/apps/movie/helpers.py` (`enrich_response_with_user_movie_data()`)
- **Related Tests**: `backend/apps/user_movie_data/tests/test_watchlist_endpoint.py`

---

**Next Steps After Completion**:

1. Resume CodeRabbit local review (process remaining findings)
2. Commit all CodeRabbit fixes in single batch
3. Run full quality gate verification
4. Create pull request for API Layer Modernization P2
