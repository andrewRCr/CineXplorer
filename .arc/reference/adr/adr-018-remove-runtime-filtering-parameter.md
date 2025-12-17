# ADR-018: Remove Runtime Filtering Parameter

## Status

Accepted

## Context

The browse/discover feature included runtime filtering parameters (`minRuntime`/`maxRuntime`) in `BrowseParams`,
with UI code commented out pending future implementation. Investigation was needed to determine whether runtime
filtering could ever be implemented or should be removed entirely.

### The Technical Problem

TMDB's runtime filtering via discover endpoint (`with_runtime.gte`/`with_runtime.lte`) is fundamentally broken:

1. **Data contamination**: TMDB's runtime filters check against ALL language translations, not just the requested
   language. A single incorrect runtime entry in any translation causes false positives.

2. **Evidence**: Filtering "Under 90 min" returns MORE results than no filter (725,797 vs 19,676). Avatar: The Way
   of Water appears in "under 100 min" results because a Dutch translation incorrectly shows 90 minutes instead of
   the actual 192 minutes.

3. **No fix planned**: TMDB has explicitly stated a `local_runtime.lte/gte` parameter (filtering by region-specific
   runtime) is "not planned."

### Alternatives Considered

| Approach                           | Description                                                                                        | Verdict                                                                             |
|------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| **N+1 Batch Fetching**             | Fetch discover results, then batch-fetch `/movie/{id}` for each to get runtime, filter client-side | Impractical: 10-12 sec latency per page, 20+ API calls per page                     |
| **Gradual Cache Population**       | Build persistent cache that fetches runtime data opportunistically over time                       | Viable for production apps, but broken initial UX; not suitable for portfolio app   |
| **Manual Data Corrections**        | Submit corrections to TMDB for incorrect translations                                              | Not scalable: 8 hours per fix, thousands of entries                                 |
| **Minimum Threshold (`gte=3`)**    | Filter out obvious typos (0-2 min entries)                                                         | Doesn't solve core problem; still gets false positives from legitimate translations |
| **Alternative APIs (OMDb, Trakt)** | Switch to different movie API                                                                      | Same N+1 problem; no API offers runtime filtering that works                        |

### Portfolio App Consideration

This is a portfolio/showcase application, not a production app with sustained user traffic. Workarounds that
require gradual cache population or accept degraded initial UX are inappropriate for this context.

## Decision

We will remove runtime as a browse parameter entirely rather than preserving commented-out code for "future
implementation."

This includes:

- Remove `minRuntime`/`maxRuntime` from `BrowseParams` type
- Remove runtime from `DEFAULT_BROWSE_PARAMS`
- Delete commented-out runtime UI code
- Remove runtime-related dead code (mappers, utilities, tests)
- Keep runtime display in movie detail view (actual data from detail endpoint, not filtering)

## Consequences

### Positive

- Cleaner codebase without dead code and unused type fields
- No false promise of "future implementation" for a feature that cannot work
- Removes maintenance burden of preserving outdated commented code
- Honest engineering decision documented for portfolio reviewers

### Negative

- Users cannot filter by runtime (feature gap vs. some competitors)
- If TMDB ever fixes their API, we would need to re-implement from scratch

### References

- [TMDB Forum - Runtime Filter Issues](https://www.themoviedb.org/talk/5d6ee5296aa8e0735e424e6c)
- [TMDB Forum - with_runtime.gte Not Working](https://www.themoviedb.org/talk/612cb5606a34480043d1e28e)
- [TMDB Forum - Discover Endpoint Runtime Filter](https://www.themoviedb.org/talk/61444f80aaf897002a07ca24)
- [GitHub - Radarr Issue #10936](https://github.com/Radarr/Radarr/issues/10936) (chose not to use runtime filtering)
