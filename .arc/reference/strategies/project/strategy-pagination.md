# Pagination Strategy

**Version:** 1.1 | **Updated:** 2025-12-16 | **Status:** Active

## Purpose

Authoritative reference for CineXplorer's pagination architecture. Covers the buffer mechanism,
deduplication tracking, cursor-based pagination, and frontend integration. Use when debugging
pagination issues, extending pagination features, or onboarding to the codebase.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Buffer Mechanism](#buffer-mechanism)
3. [Deduplication Tracker](#deduplication-tracker)
4. [Cursor-Based Pagination](#cursor-based-pagination)
5. [Frontend Integration](#frontend-integration)
6. [Virtualization](#virtualization)
7. [Scroll Restoration](#scroll-restoration)
8. [Content Pool Depletion](#content-pool-depletion)
9. [Key Files Reference](#key-files-reference)

---

## Architecture Overview

### The Problem

TMDB returns 20 results per page. After our data quality filters (completeness, vote count, etc.),
some pages may have fewer than 20 "good" movies. Without compensation, users would see inconsistent
page sizes (20, then 15, then 18, etc.).

### The Solution

A **buffer mechanism** fetches additional TMDB pages to maintain consistent 20-result pages.
A **deduplication tracker** prevents the same movie from appearing twice across pagination requests.

```
Frontend Request: /browse?certification=R&tmdb_page_start=7
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: fetch_with_filters_and_buffer()                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Fetch TMDB page 7                    → 20 raw movies     │
│ 2. Apply data quality filters           → 14 good movies    │
│ 3. Check dedup (Redis)                  → 14 unique movies  │
│ 4. Need 6 more → Buffer pages 8, 9      → +8 good movies    │
│ 5. Return 20 movies + next cursor       → tmdb_page_start=10│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
Frontend: Store next cursor, display 20 movies
```

---

## Buffer Mechanism

### How It Works

Located in `paginated.py:apply_buffer_if_needed()` (lines 28-145).

```python
# Simplified logic
def apply_buffer_if_needed(filtered_movies, fetch_next_page_func, dedup_tracker, ...):
    # Start with movies that passed data quality filters
    combined_movies = deduplicate_against_session(filtered_movies)

    # If we have 20+, no buffering needed
    if len(combined_movies) >= 20:
        return combined_movies[:20], pages_consumed=1

    # Buffer: fetch additional pages until we have 20 or hit limit
    pages_fetched = 0
    max_buffer_pages = 5

    while len(combined_movies) < 20 and pages_fetched < max_buffer_pages:
        next_page_movies = fetch_next_page_func(next_page)
        filtered_buffer = apply_data_quality_filters(next_page_movies)
        deduplicated_buffer = deduplicate_against_seen(filtered_buffer)
        combined_movies.extend(deduplicated_buffer)
        pages_fetched += 1

    return combined_movies[:20], pages_consumed=(1 + pages_fetched)
```

### Configuration

| Parameter          | Value | Rationale                              |
|--------------------|-------|----------------------------------------|
| `max_buffer_pages` | 5     | Balances API calls vs page consistency |
| Target page size   | 20    | Matches TMDB's default, good UX        |

### When Buffer Activates

Buffer only activates when initial results < 20 after filtering. For most queries (R-rated,
popular genres), buffer rarely activates. For restrictive filters (NC-17, niche combos),
buffer activates frequently.

---

## Deduplication Tracker

### Purpose

Prevents the same movie from appearing twice across pagination requests within a session.
Without this, TMDB API instability or filter edge cases could show duplicates.

### Implementation

Located in `deduplication_tracker.py`.

```python
class DeduplicationTracker:
    def __init__(self, session_id: str, context_id: str = ""):
        self.session_id = session_id
        self.context_id = context_id
        self.redis = get_redis_connection()

    def _generate_key(self, params) -> str:
        # Unique key per session + tab + filter combination
        params_hash = hashlib.md5(str(sorted(params.items()))).hexdigest()[:8]
        return f"dedup:{self.session_id}:{self.context_id}:{params_hash}"

    def add_returned_ids(self, params, movie_ids: list[int]):
        key = self._generate_key(params)
        self.redis.sadd(key, *movie_ids)
        self.redis.expire(key, 3600)  # 1 hour TTL

    def get_returned_ids(self, params) -> set[int]:
        key = self._generate_key(params)
        return {int(id) for id in self.redis.smembers(key)}

    def clear_session(self, params):
        key = self._generate_key(params)
        self.redis.delete(key)
```

### Key Components

| Component     | Source                        | Purpose                                  |
|---------------|-------------------------------|------------------------------------------|
| `session_id`  | Django session                | Identifies user session                  |
| `context_id`  | `X-Pagination-Context` header | Multi-tab isolation                      |
| `params_hash` | MD5 of filter params          | Different filters = different dedup sets |
| TTL           | 1 hour                        | Auto-cleanup of stale sessions           |

### Session Lifecycle

```
Fresh page load (page=1, no cursor)
    → clear_session() called
    → Redis set deleted
    → Clean start

Pagination continues (tmdb_page_start=N)
    → get_returned_ids() → set of previously shown IDs
    → New results filtered against this set
    → add_returned_ids() → track newly shown IDs

After 1 hour idle
    → Redis TTL expires
    → Set auto-deleted
```

### Multi-Tab Isolation

Each browser tab generates a unique `context_id` via `crypto.randomUUID()` on page load.
This prevents Tab A's pagination from affecting Tab B's results.

```typescript
// frontend/src/services/paginationContext.ts
const paginationContextId = crypto.randomUUID();
export function getPaginationContextId(): string {
    return paginationContextId;
}
```

Sent via header on every movie endpoint request:

```typescript
// frontend/src/services/apiClient.ts
config.headers["X-Pagination-Context"] = getPaginationContextId();
```

---

## Cursor-Based Pagination

### The Cursor: `next_tmdb_page_start`

Instead of traditional page numbers, we use a TMDB page cursor. This accounts for buffer
consumption - if we consumed TMDB pages 7-9 to fill one display page, the next request
should start at page 10.

### Calculation

```python
# In fetch_with_filters_and_buffer()
effective_page = tmdb_page_start if tmdb_page_start else page
pages_consumed = 1 + buffer_pages_fetched

calculated_next_page = effective_page + pages_consumed

# Return null to signal end-of-results
if calculated_next_page > tmdb_response.total_pages or len(final_movies) == 0:
    next_tmdb_page_start = None
else:
    next_tmdb_page_start = calculated_next_page
```

### End-of-Results Signal

`next_tmdb_page_start = null` signals to frontend that no more results exist.
This triggers `hasNextPage = false` in TanStack Query.

Conditions for end-of-results:

1. Calculated next page exceeds TMDB's `total_pages`
2. Zero movies returned (buffer exhausted with no unique movies)

---

## Frontend Integration

**Primary implementation:** `VirtualizedMovieGrid` (virtualized infinite scroll)
**Reference implementations:** `InfiniteMovieGrid`, `SequentialMovieGrid` (non-virtualized)

### useInfiniteMovies Hook

Located in `frontend/src/hooks/movie/useInfiniteMovies.ts`.

```typescript
export function useInfiniteMovies({ queryKey, fetcher }) {
    return useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetcher({ pageParam }),

        // Initial page has no cursor
        initialPageParam: undefined,

        // Extract cursor for next request
        getNextPageParam: (lastPage) => lastPage.next_tmdb_page_start ?? undefined,

        // Flatten pages into single movie array
        select: (data) => ({
            movies: data.pages.flatMap(page => page.results),
            totalResults: data.pages[0]?.total_results ?? 0,
        }),
    });
}
```

### hasNextPage Logic

TanStack Query automatically sets `hasNextPage` based on `getNextPageParam`:

- Returns `undefined` → `hasNextPage = false`
- Returns number → `hasNextPage = true`

### InfiniteMovieGrid Component (Reference)

Uses Intersection Observer to trigger `fetchNextPage()` when user scrolls near bottom:

```typescript
const observer = new IntersectionObserver(
    (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    },
    { threshold: 0.1, rootMargin: "100px" }
);
```

---

## Virtualization

### Why Virtualization

Movie grids can contain hundreds or thousands of items. Without virtualization:

- DOM contains all movie cards (1000+ elements)
- Memory usage grows linearly with results
- Scroll performance degrades significantly

With virtualization, only visible rows are rendered (typically 3-5 rows + 2 overscan).

### Implementation

**Primary component:** `VirtualizedMovieGrid` using `@tanstack/react-virtual`

```typescript
// Window-based virtualizer (scrolls with page, not internal container)
const virtualizer = useWindowVirtualizer({
    count: Math.ceil(movies.length / columns),
    estimateSize: () => rowHeight,
    overscan: 2,  // Render 2 rows above/below viewport
});

// Only render visible rows
{virtualizer.getVirtualItems().map((virtualRow) => (
    <GridRow key={virtualRow.key} style={{ transform: `translateY(${virtualRow.start}px)` }}>
        {/* Render movies for this row */}
    </GridRow>
))}
```

### Configuration

| Parameter     | Value | Rationale                              |
|---------------|-------|----------------------------------------|
| `overscan`    | 2     | Smooth scrolling without visible pop-in|
| `estimateSize`| 340px | Approximate row height for card + gap  |

### When to Use

- **VirtualizedMovieGrid**: Browse, search, any large result set
- **InfiniteMovieGrid**: Reference only (non-virtualized infinite scroll)
- **SequentialMovieGrid**: Reference only (button-based pagination)

---

## Scroll Restoration

### The Problem

When users navigate: Browse → Movie Detail → Back, they expect to return to their scroll position
with all previously loaded movies intact.

### Solution

Three-layer approach:

1. **TanStack Query cache** - Retains all loaded pages in memory
2. **sessionStorage persistence** - Stores scroll position keyed by filter params
3. **Virtualizer initialOffset** - Restores exact scroll position on mount

### Implementation

```typescript
// Save position before navigation
const saveScrollPosition = (filterKey: string) => {
    sessionStorage.setItem(`scroll:${filterKey}`, String(window.scrollY));
};

// Restore on mount
const restoreScrollPosition = (filterKey: string): number => {
    const saved = sessionStorage.getItem(`scroll:${filterKey}`);
    return saved ? parseInt(saved, 10) : 0;
};

// Apply to virtualizer
const virtualizer = useWindowVirtualizer({
    // ... other config
    initialOffset: restoreScrollPosition(filterKey),
});
```

### Key Behaviors

| Scenario           | Expected Behavior                              |
|--------------------|------------------------------------------------|
| Back from detail   | Exact scroll position restored, all data intact|
| Filter change      | Scroll resets to top (new query)               |
| Tab refresh        | Position lost (sessionStorage per-tab)         |
| App-level setting  | `history.scrollRestoration = 'manual'`         |

### App-Level Configuration

```typescript
// main.tsx - Disable browser's native scroll restoration
if (typeof window !== 'undefined') {
    history.scrollRestoration = 'manual';
}
```

This prevents the browser from attempting scroll restoration before our data loads.

---

## Content Pool Depletion

### Definition

When the total available content (after TMDB filters + data quality filters) is smaller
than users might expect, pagination naturally ends earlier. **This is correct behavior,
not a bug.**

### Example: NC-17 Certification

| Stage                        | Count   | Notes                                 |
|------------------------------|---------|---------------------------------------|
| TMDB total (worldwide NC-17) | 208,984 | Without `certification_country`       |
| TMDB total (US NC-17 only)   | 353     | With `certification_country=US`       |
| After data quality filters   | ~231    | ~35% filtered (missing posters, etc.) |
| Display pages                | ~12     | All valid content shown               |

### Why It's Not a Bug

The system correctly:

1. Fetches all available TMDB pages
2. Applies data quality filters consistently
3. Returns `next_tmdb_page_start = null` when exhausted
4. Frontend shows "No more results"

### Affected Scenarios

Small pools are expected for:

- NC-17 certification (~350 US movies total)
- Restrictive filter combinations (G + Documentary: ~340)
- Very old release years (1920s: ~2000)
- Niche language + certification combos

---

## Key Files Reference

| File                        | Location                                           | Purpose                                    |
|-----------------------------|----------------------------------------------------|--------------------------------------------|
| `paginated.py`              | `backend/apps/movie/services/pipelines/`           | Buffer mechanism, cursor calculation       |
| `deduplication_tracker.py`  | `backend/apps/movie/services/`                     | Redis-based session tracking               |
| `useInfiniteMovies.ts`      | `frontend/src/hooks/movie/`                        | TanStack Query infinite scroll             |
| `VirtualizedMovieGrid.tsx`  | `frontend/src/components/movie/collection/`        | Primary grid - virtualized infinite scroll |
| `InfiniteMovieGrid.tsx`     | `frontend/src/components/movie/collection/`        | Reference - non-virtualized infinite       |
| `SequentialMovieGrid.tsx`   | `frontend/src/components/movie/collection/`        | Reference - button-based pagination        |
| `scrollPersistence.ts`      | `frontend/src/components/movie/collection/shared/` | sessionStorage scroll position helpers     |
| `gridConstants.ts`          | `frontend/src/components/movie/collection/shared/` | Shared grid configuration (row height, etc)|
| `paginationContext.ts`      | `frontend/src/services/`                           | Multi-tab context ID                       |
| `apiClient.ts`              | `frontend/src/services/`                           | X-Pagination-Context header                |

---

## Version History

- **1.1** (2025-12-16): Added Virtualization and Scroll Restoration sections, updated file references
- **1.0** (2025-12-15): Initial strategy document
