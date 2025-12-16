# ADR-020: Adopt Virtualized Infinite Scroll for Browse

## Status

Accepted

## Context

CineXplorer's movie browse/discover feature uses a buffer mechanism to maintain consistent 20-result pages
despite data quality filtering. This creates a fundamental problem: **page content is path-dependent**.

### The Technical Problem

The buffer mechanism consumes variable numbers of TMDB API pages per display page depending on how many
movies pass data quality filters. If TMDB page 7 yields only 14 "good" movies, the buffer fetches pages
8-9 to fill the display page. The next request starts at page 10.

This means:

1. **Display page N has no stable content mapping** - its movies depend on buffer consumption of all
   prior pages
2. **Random-access pagination is fundamentally broken** - jumping to "page 5" without loading pages 1-4
   produces different results than arriving sequentially
3. **Deep-link sharing is unreliable** - `?page=10` shows different movies for different users/sessions

### Research Findings

Investigation of major content platforms revealed consistent patterns:

| Platform    | Pagination Approach   | Jump-to-Page? | Notes                                       |
|-------------|-----------------------|---------------|---------------------------------------------|
| TMDB.org    | Infinite scroll       | No            | Same API we use                             |
| Netflix     | Infinite scroll       | No            | Category rows, virtualized                  |
| Prime Video | Infinite scroll       | No            | Category grids                              |
| Letterboxd  | Sequential pagination | No            | Closest analogue; suffers from explicit nav |

Letterboxd is particularly relevant as a movie discovery platform similar to CineXplorer. Their sequential
pagination (Previous/Next buttons) works but creates friction compared to infinite scroll.

### Alternatives Considered

| Approach                        | Description                                 | Verdict                                                         |
|---------------------------------|---------------------------------------------|-----------------------------------------------------------------|
| **Random-access pagination**    | Current implementation with jump-to-page UI | Broken: path-dependency makes random access meaningless         |
| **Sequential pagination**       | "Previous/Next" only, no jump               | Viable but suboptimal UX (explicit button clicks)               |
| **Infinite scroll**             | Auto-load on scroll, no page numbers        | Viable, natural UX for discovery                                |
| **Virtualized infinite scroll** | Infinite scroll + DOM virtualization        | Chosen: scales to thousands of items, preserves scroll position |

### Back Navigation Requirements

User expectation: Click movie detail, press back, return to same scroll position with results intact.

Testing validated this works with:

- sessionStorage persistence of scroll position (keyed by filter params)
- TanStack Query cache maintaining loaded pages
- `history.scrollRestoration = 'manual'` at app level
- Virtualizer's `initialOffset` for position restoration

## Decision

We will adopt **virtualized infinite scroll** using:

1. **@tanstack/react-virtual** for DOM virtualization (renders only visible rows)
2. **@tanstack/react-query** with `useInfiniteQuery` for data fetching and caching
3. **sessionStorage-based scroll restoration** for back navigation UX

The implementation pattern:

```typescript
// Data layer: useInfiniteMovies hook
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['movies', filters],
    queryFn: ({ pageParam }) => fetchMovies({ tmdb_page_start: pageParam }),
    getNextPageParam: (lastPage) => lastPage.next_tmdb_page_start,
});

// UI layer: VirtualizedMovieGrid component
const virtualizer = useWindowVirtualizer({
    count: Math.ceil(movies.length / columns),
    estimateSize: () => rowHeight,
    overscan: 2,
    initialOffset: restoreScrollPosition(filterKey),
});
```

## Consequences

### Positive

- **Aligns with data model**: Sequential loading matches buffer mechanism's sequential nature
- **Better back-nav UX**: Scroll position restoration is natural with virtualization
- **Performance at scale**: Only visible rows in DOM (critical for 1000+ movie grids)
- **Industry standard**: Matches user expectations from Netflix, Amazon, TMDB.org
- **Eliminates broken feature**: Removes jump-to-page that never worked correctly
- **Simpler mental model**: No confusion about what "page 5" means

### Negative

- **No deep-link to position**: Can't share URL that jumps to specific results
- **No "skip to end"**: Users must scroll through content sequentially
- **Scroll position is session-local**: Different browser/device shows different position
- **Filter change resets position**: Changing filters starts from top (by design)

### Migration Impact

- **Search results**: Will migrate to same pattern (Phase 7 of `tasks-infinite-scroll-migration.md`)
- **Watchlist/user collections**: Future consideration (smaller datasets, may not need virtualization)
- **Tests**: MovieDetail "Back to Results" tests updated to remove `page=` param expectations

### Technical Notes

- `SequentialMovieGrid` retained as reference implementation for button-based sequential pagination
- Shared utilities extracted to `collection/shared/` for DRY across grid implementations
- Movie-domain hooks organized in `hooks/movie/` following domain organization pattern

## References

- [Phase 5 Implementation - `tasks-infinite-scroll-migration.md`](../../active/incidental/tasks-infinite-scroll-migration.md)
- [Pagination Strategy](../strategies/project/strategy-pagination.md)
- [Data Quality Strategy](../strategies/project/strategy-data-quality.md)
- [@tanstack/react-virtual Documentation](https://tanstack.com/virtual/latest)
- [@tanstack/react-query Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
