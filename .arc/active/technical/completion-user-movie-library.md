# Completion: User Movie Library

**Completed:** 2026-11-15
**Branch:** `technical/user-movie-library`
**Category:** Technical
**Context:** Personal film pages and a private timeline for the user-movie interface.

## Summary

The Watchlist is a sortable poster grid, and the Library separates films seen from their History of viewings,
undated reviews and selected personal changes. Explore, Watchlist and Library lead to distinct destinations, and
opening a film from a personal page preserves its return destination and position while the app stays loaded.

## Key Deliverables

- Protected Library Films and History views, with combinable Liked and Rated filters, address-based sorting and
  calendar-date labels; the Watchlist remains at its own address.
- A shared personal-film grid with fluid columns and measured virtual rows, distinct from the catalog grids.
- Private History and group-film reads with stable pagination, selected turn-ons, immediate reversal suppression,
  per-day grouping and expandable groups.
- Recently watched on signed-in Home, listing viewings rather than distinct films and linking to History.
- Empty-view logging through the shared film picker with the date enabled and focus returning to the persistent
  Library navigation; card Watchlist toggles and a browser journey from queued film to logged entry.
- Seeded film cards and a signed-in browser journey covering persistence and accessibility across the personal
  pages, alongside component and backend integration coverage.
- Accepted ADR-050, related decision-record Status notes, and updated navigation, pagination and testing guidance.

## Implementation Highlights

- Personal lists and History read numbered pages under the Library query key. Record saves and entry writes refresh
  every loaded page so membership and ordering stay current.
- Measured row heights, saved-position eligibility and expanded groups live in app memory. An explicit back-link
  signal restores the position over those heights; reloads and user changes clear that memory. A fresh visit retires
  the active page/query key's old return eligibility, including same-address navigation without remounting.
- History uses parameterized PostgreSQL stages to select each film's next save, suppress immediate reversals,
  retain the latest shown change per film/day/field, and combine grouped changes with entries. A batched sample read
  keeps query counts independent of collection size.
- Full verification passed, including live layout and deep-return checks with a heavy account. Retained backend
  timings met the required first-page and deep-page bound, and the measured source hashes matched the verified tree.

## Related Documentation

- Design: `draft-user-movie-library.md`
- PRD: `prd-user-movie-library.md`
- Detailed work and criterion evidence: `tasks-user-movie-library.md`
- Decisions: ADR-050; related Status notes on ADR-027, ADR-039 and ADR-044.

## Integration

The merged shared card controls and log dialog are composed into both empty Library views. The signed-in journey
logs a queued film, checks its removal from Watchlist and finds its entry on detail, Films and History. Named card
controls need no button-name accessibility exception. Existing signed-in Home behavior remains covered.
