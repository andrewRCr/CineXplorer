# ADR-019: Accept TMDB Certification Filtering Limitation

## Status

Accepted

## Context

The browse/discover feature includes certification filtering (MPAA ratings: G, PG, PG-13, R, NC-17) to let users
filter movies by content rating. Investigation revealed a fundamental limitation in TMDB's discover API that
cannot be bypassed through API parameters.

### The Technical Problem

TMDB's `certification` and `with_release_type` parameters operate independently at different filtering layers:

1. **`certification` filter** matches movies with that rating in ANY release type (theatrical, digital, physical,
   limited, premiere, TV)
2. **`with_release_type=3`** (theatrical) only controls which release date is returned, not which certification
   is matched
3. **No parameter combination exists** to filter by "theatrical certification only"

### Evidence

- **Saw (TMDB ID 176)**: Appears in NC-17 results despite theatrical release being R, because it has an NC-17
  "uncut" digital release
- **A Clockwork Orange (TMDB ID 185)**: Shows NC-17 because TMDB conflates the historical X rating (no longer
  in their system) with NC-17

### Alternatives Considered

| Approach                             | Description                                                  | Verdict                                          |
|--------------------------------------|--------------------------------------------------------------|--------------------------------------------------|
| **Parameter combinations**           | Try `with_release_type=3` with `certification`               | Doesn't work - parameters are independent        |
| **Client-side post-filtering**       | Fetch detail data for each result, filter by theatrical cert | Impractical: N+1 API calls, 10+ seconds per page |
| **Accept limitation for NC-17 only** | Other ratings work acceptably; NC-17 is edge case            | Viable - most users won't filter NC-17           |

### Research Sources

- TMDB Talk forums confirmed this is architectural, not a bug
- Kometa/Plex Meta Manager team documented same limitation (GitHub Issue #464)

## Decision

We will accept this limitation and add a UI disclaimer when NC-17 is selected.

This includes:

- Display disclaimer text on CertificationFilter component when NC-17 is selected: "May include alternate
  versions (uncut, re-releases) rated NC-17"
- MovieDetail page continues to show theatrical (Type 3) certification via `extract_us_certification()`,
  which is accurate for display purposes
- No attempt to work around the API limitation client-side

## Consequences

### Positive

- Honest UX: Users are informed about the limitation rather than confused by unexpected results
- No performance penalty from N+1 API calls
- Certification filtering works correctly for G, PG, PG-13, R (vast majority of use cases)
- Clean implementation without complex workarounds

### Negative

- NC-17 filter results may include movies with theatrical R rating but NC-17 alternate releases
- Users filtering NC-17 may see fewer "true" NC-17 theatrical releases than expected
- Cannot distinguish between original NC-17 releases and re-rated content

### References

- [TMDB Forum - Release Types and Certification](https://www.themoviedb.org/talk/59d3f79ec3a3684561005cd5)
- [Kometa GitHub Issue #464](https://github.com/Kometa-Team/Kometa/issues/464) - Same limitation documented
