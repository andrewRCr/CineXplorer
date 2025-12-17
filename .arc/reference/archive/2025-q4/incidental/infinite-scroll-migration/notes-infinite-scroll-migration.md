# Notes: Infinite Scroll Migration

**Status:** Completed
**Completed:** 2025-12-17
**Related Task List:** `tasks-infinite-scroll-migration.md`

Supporting analysis and design decisions for the infinite scroll migration.

---

## Table of Contents

- [Data Quality Architecture Analysis](#data-quality-architecture-analysis)
- [File References](#file-references)
- [Decision Log](#decision-log)

---

## Data Quality Architecture Analysis

### Context

Before implementing Phase 4 (integration), we analyzed how the existing data quality mechanisms
interact with infinite scroll and sequential pagination patterns. The dedup/buffer system was
designed for random-access pagination, which is being retired.

### Backend Data Quality Pipeline (per API call)

```
TMDB API
  → [Blacklist Filter]
  → [Completeness Filter]
  → [Year/Rating/Vote Filters]
  → [Buffer Mechanism: fetch more TMDB pages if < 20 results]
  → [Session Deduplication via Redis]
  → Response with next_tmdb_page_start cursor
```

**Key mechanisms:**

1. **Buffer**: If filters reduce results below 20, backend fetches additional TMDB pages
   (up to 5 extra) to fill the response
2. **Deduplication**: Redis tracks returned IDs per session+filter combo to prevent
   cross-page duplicates
3. **Cursor tracking**: `next_tmdb_page_start` tells frontend where to resume

### Issue Found: Session Clear Logic

The dedup session clear condition in `paginated.py`:

```python
# Original logic (designed for random-access)
if page == 1 and dedup_tracker:
    dedup_tracker.clear_session(params)
```

**Intent**: "page=1 means user navigated back to start, so clear session for fresh results"

**Problem for infinite scroll**: Frontend sends `page=1` on every request (only `tmdb_page_start`
varies), so every "load more" clears the dedup session, breaking cross-page deduplication.

| Request   | page | tmdb_page_start | Backend behavior                          |
|-----------|------|-----------------|-------------------------------------------|
| Initial   | 1    | undefined       | Clear session, fetch from TMDB page 1     |
| Load more | 1    | 5               | Clear session (bug!), fetch from TMDB p 5 |
| Load more | 1    | 9               | Clear session (bug!), fetch from TMDB p 9 |

### Solution: Refined Clear Condition

```python
# New logic: only clear on true fresh start
if page == 1 and tmdb_page_start is None and dedup_tracker:
    dedup_tracker.clear_session(params)
```

**Behavior:**

- `page=1` + no `tmdb_page_start` = Fresh navigation (clear session)
- `page=1` + `tmdb_page_start=X` = Continuation (preserve session)

This fixes infinite scroll without any frontend changes to the page parameter.

### Sequential Pagination (Pattern B) - Page Display

For sequential pagination A/B comparison, we want **discrete pages** (not accumulated):

**Wrong approach** - accumulate and slice:

```typescript
// Flattens all pages, then slices - problematic with variable page sizes
const allMovies = pages.flatMap(p => p.results);
const currentPage = allMovies.slice(pageIndex * 20, (pageIndex + 1) * 20);
```

**Correct approach** - access TanStack Query pages directly:

```typescript
// Each pages[n] is one API response (~20 movies)
const currentPageMovies = query.data?.pages[currentPageIndex]?.results ?? [];
```

This naturally handles variable page sizes (buffer may return 15-20 movies depending on
data availability) and aligns with TanStack Query's design.

### Variable Page Sizes

Backend buffer ensures **API responses** target ~20 movies, but actual count varies:

- Response 1: 20 movies (consumed TMDB pages 1-3)
- Response 2: 20 movies (consumed TMDB pages 4-5)
- Response 3: 15 movies (end of data, consumed TMDB pages 6-7)

Sequential UI must handle this gracefully - show what the API returns, don't assume fixed 20.

### Random-Access Compatibility

**Not maintaining.** Random-access pagination is being retired due to fundamental
incompatibility with our buffer/dedup mechanisms. The refined clear condition isn't
about backward compatibility - it's about correctly distinguishing "fresh start" from
"continuation" for the patterns we're keeping (infinite scroll, sequential).

---

## File References

- Backend dedup logic: `backend/apps/movie/services/pipelines/paginated.py` (lines 189-191)
- Dedup tracker: `backend/apps/movie/services/deduplication_tracker.py`
- Frontend infinite grid: `frontend/src/components/movie/collection/InfiniteMovieGrid.tsx`
- useInfiniteMovies hook: `frontend/src/hooks/useInfiniteMovies.ts`

---

## Decision Log

| Date       | Decision                           | Rationale                                        |
|------------|------------------------------------|--------------------------------------------------|
| 2025-12-11 | Refine dedup clear condition       | Fix infinite scroll without frontend changes     |
| 2025-12-11 | Sequential uses direct page access | Handle variable sizes, align with TanStack Query |
| 2025-12-11 | No random-access backward compat   | Being retired, no value in maintaining           |
