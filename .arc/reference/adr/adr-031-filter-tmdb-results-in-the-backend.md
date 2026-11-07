# ADR-031: Filter TMDB Results in the Backend and Fill Short Pages

## Status

Accepted (Owner, 2025-10-22); Superseded in part by ADR-038 (page size)

Recorded 2026-11-04 from sources of the time.

Implemented by: PR #8 (`ebc1e586`, 2025-12-19), which carried the backend filters and buffer (`df004eb8`,
`ad0088f8`, 2025-10-23) and the removal of the frontend's filtering (`0e034f7b`, 2025-10-24).

## Context

TMDB's listing endpoints return 20 movies a page, and its filters don't always hold. "TMDB often returns movies
with incorrect release years despite API filters": re-releases and data errors put movies from the wrong decades in
a year range. It also returns 0.0 placeholder ratings despite rating filters.
Genre filtering worked correctly. Runtime filtering was left out as a TMDB limitation
([ADR-018](adr-018-remove-runtime-filtering-parameter.md) later removed its parameter).

The frontend compensated: a fetch hook (`useEnhancedFetcher`) filtered each page by year, rating and runtime after
TMDB answered, and filled the gaps from a buffer. That buffer "only fills from current page buffer, not next page",
so a filtered page could still come up short.

Alternatives considered:

- **TMDB's API filters alone:** wrong years and placeholder ratings reach the page.
- **Filtering in the frontend:** the existing state, with gaps filled only from the current page.
- **Filtering in the backend's movie service, topping short pages up from the following TMDB pages (chosen).**

The reason recorded when this was scoped: "Migrate frontend filtering logic (useEnhancedFetcher) to backend service
layer for better architecture, server-side caching support, and gap-less pagination with next-page lookahead." The
proposal added that "Server-side filtering enables future caching layer (cache filtered results, not raw TMDB)".

## Decision

We will filter TMDB results by year and rating in the backend's movie service, after TMDB responds, on every
paginated listing: discover, search, now playing and upcoming. Genre filtering stays with TMDB's API. When filtering
leaves a page short, the service fetches the next TMDB page, applies the same filters to it, and tops the page up
toward 20 results. The frontend's own filtering and gap filling are removed.

## Consequences

### Positive

- A page holds 20 results wherever TMDB has enough matching movies, instead of coming up short.
- Filtering lives in one tested place on the server, where filtered results can later be cached.
- The frontend shows what the API returns, without filtering or page arithmetic of its own.
- Later quality filters joined the same backend pass rather than adding a second one.

### Negative

- One displayed page can consume several TMDB pages, so the TMDB requests behind a page vary with the filters.
- Page content depends on the path taken: each request starts after the last TMDB page the previous one consumed,
  so a page number has no fixed content. The API now passes a TMDB page cursor (`next_tmdb_page_start`), and
  [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md) builds on this decision, replacing numbered pages with
  virtualized infinite scroll.

Current state: the backend pass has since grown to five stages (language script, blacklist, completeness, year, and
rating with a vote-count threshold), and the buffer now fetches up to five further pages until it has 20, where the
first version fetched one and only when at least 10 results survived; it also drops movies already returned to the
session.

## References

- `.arc/reference/archive/2025-q4/technical/25_service-layer-modernization/prd-service-layer-modernization.md`
  §§ 4.2.1, 6.5 and 9.3
- Commits `227f83c3` (scope and rationale), `df004eb8` (filters), `ad0088f8` (tests), `0e034f7b` (frontend removal)
- `backend/apps/movie/services/data_quality/filters.py` (`apply_data_quality_filters`),
  `backend/apps/movie/services/pipelines/paginated.py` (`apply_buffer_if_needed`)
- `.arc/reference/strategies/project/strategy-data-quality.md`,
  `.arc/reference/strategies/project/strategy-pagination.md`
- [ADR-018](adr-018-remove-runtime-filtering-parameter.md), [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md)
