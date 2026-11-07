# ADR-038: Return Every Title a Topped-Up Page Reads

## Status

Accepted (Owner, 2026-11-04)

Recorded 2026-11-06 from sources of the time.

Implemented by: PR #93 (`b7e398c4`, 2026-11-05).

## Context

[ADR-031](adr-031-filter-tmdb-results-in-the-backend.md) filters TMDB's results in the backend and, when filtering
leaves a page short, tops it up from the following TMDB pages "toward 20 results". The top-up kept the first 20
titles it read, but the next request's cursor starts after the last TMDB page read, so the rest of that page was
never shown. Measured against live TMDB data, a 1980s horror browse scrolled to its end never showed 584 of its
1,894 qualifying titles (30.8%); the first 200 requests of a 1990s browse missed 35.9%; unfiltered browsing, which
rarely tops up, missed 2.9% over 30 requests.

Since [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md), browsing appends each response to an infinite scroll,
so nothing a user sees depends on a response holding exactly 20.

Alternatives weighed:

- **Re-read the page:** the next request starts on the TMDB page the top-up came from, and the session's duplicate
  check skips what was already shown. One more TMDB request per top-up, about half again in filtered browsing, and
  without Redis each top-up's titles would show twice.
- **Remember the position:** the cursor carries the page and how far into it the last response got. One more TMDB
  request per top-up, and the cursor, the API types and the frontend change.
- **Return everything read (chosen):** a topped-up response carries every unique qualifying title it read. No extra
  TMDB requests, no reliance on Redis, and no change to what the frontend sends back; responses vary in size.

The reasons recorded for the choice: it is the smallest change that removes the loss; users see only infinite
scroll, where a longer response adds cards; and the page-number cursor that later work builds on stays simple. The
Owner's: "the 20 per page thing is, as far as I know (though it's been a year nearly) purely an artifact of the
paginated approach prior to infinite scroll".

## Decision

We will return every unique qualifying title a topped-up response reads, and record each for the session's
duplicate check. The top-up still reads further TMDB pages until the response holds at least 20 titles or five
extra pages have been read, so a response holds up to 39: fewer than 20 from the first page, plus the whole page
that took it past 20. The cursor, the request parameters and the response shape are unchanged. This replaces
ADR-031's top-up toward 20 results; the rest of ADR-031 stands.

## Consequences

### Positive

- Every qualifying title a browse reads is shown, once: a 1980s horror browse scrolled to its end showed all 1,934
  it read.
- TMDB requests per response are unchanged, and nothing depends on Redis to avoid repeats.
- The API contract and the frontend's cursor handling are unchanged.

### Negative

- Response size varies, from fewer than 20 (when the five-page limit or TMDB's last page stops the top-up) to 39.
  Anything that counts results per response must not assume 20: the paged results view now counts its range from
  the pages before it.
- A first response can be taller than the frontend's 20-card loading placeholder, which matters to anything that
  restores a scroll position against it.

## References

- PR #93
- `backend/apps/movie/services/pipelines/paginated.py` (`apply_buffer_if_needed`)
- `.arc/reference/strategies/project/strategy-pagination.md` § The Solution
- [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md), [ADR-031](adr-031-filter-tmdb-results-in-the-backend.md)
