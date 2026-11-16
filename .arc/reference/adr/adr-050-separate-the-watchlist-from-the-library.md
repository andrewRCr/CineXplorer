# ADR-050: Separate the Watchlist from the Library

## Status

Accepted (2026-11-15)

Supersedes ADR-044 in part (the personal and catalog links, the future Films hub entrance, and the smoke-spec list)
and ADR-039 in part (excluding watchlists from the smoke tier).

## Context

A watchlist holds films a visitor plans to see; a library holds films they have seen. Making both one set of tabs
would repeat films across Watched, Liked and Rated, while an Activity tab could suggest a social feed. The catalog's
Films link would also share a name with a personal Films view.

The catalog grid couples fixed-width cards to buffered TMDB pagination. Personal lists come from the database in
numbered pages, and need fluid cards to fit two columns on a phone. A timeline must combine viewings, undated reviews
and selected personal changes in one order. Merging independently paginated sources in the browser cannot preserve
that order across page boundaries.

ADR-044 established one primary personal link, temporarily named Watchlist, and the catalog entrance named Films.
ADR-039 excluded watchlist writes from its browser tier. Stored development films now allow a deterministic signed-in
journey without reaching TMDB during a save.

## Decision

We will keep the Watchlist at `/watchlist` and put the Library at `/library`, with no redirects between them. The
signed-in bar and phone drawer offer Explore, Watchlist and Library; signed-out visitors see Explore. Explore keeps
opening `/browse`; any future Films hub opens from Explore. The Library owns one heading and two views: Films at
`/library`, and History at `/library/history`.

Films lists watched films, with Liked and Rated as combinable filters. The Watchlist lists planned films. Both use a
personal grid with fluid columns at least 150px wide, measured window-virtualizer rows and numbered pages of 100.
Sorts and filters live in the address; every save refetches loaded pages so membership and order stay current. The
catalog grid keeps its existing data layer and layout.

History is the Library's read-only timeline. Each dated viewing sits on its watched day; an undated review sits on
the day it was written. Each has its own row, under month headings, with a day's date beside its first row. Entries
are edited on the film page. History also shows selected record-save changes: additions to the watchlist, watched
marks, likes and ratings. It leaves out entry-write changes and removals. A turn-on is hidden only if the film's next
save reverses its own field; entry-write rating changes do not count when finding that next save. A later save does
not change that decision. Undo can remove a reversal and reveal the change again. Each film counts once per day and
field, using its latest shown change and, for ratings, that change's value.

The backend selects and groups those changes by stored day and field. Up to three films draw individually; larger
groups show a count and up to eight posters, with expansion in place. Days run newest first, then rows by creation
time (a group's latest change), with deterministic kind, entry-ID and field tie-breaks. A group never splits across
pages. `GET /user-movie-data/history` returns the unified viewing, review and changes rows; the private
`GET /user-movie-data/history/changes` pages one required day and field's films for expansion. Both use bounded
numbered pagination and only the signed-in visitor's stored data. The existing `/user-movie-data/entries` dated-entry
list and its schema stay unchanged for consumers needing viewings alone.

The mixed timeline uses a parameterized PostgreSQL selection shared with its group reads. Named query stages form
saves before selecting each next save, suppress reversals before deduplicating films, then group and join entries.
One count and ordered page plus one batched sample query keep the number of queries independent of collection size
and avoid nested correlated selections. It returns the same bounded pagination envelope as database QuerySets.

Until the record of changes is available, History returns viewings and reviews; the changes member and group route
are added with it. The frontend reads History under the Library query key and measures rows keyed by their content,
so saves refresh the timeline and existing entries retain their measured heights when other rows move before them.
The three personal views extend the existing back-link and scroll persistence: a return restores only with its
explicit signal, measured heights and a position saved during the loaded app. A reload or user change clears memory.

We will add `library.spec.ts` to the signed-in browser smoke tier. The development seed stores two fixture film
cards, without user data. Setup clears their prior personal state and marks the second watched, then the journey
adds the first from a catalog card, finds it through Watchlist, opens and scans the Library's Films and History
views, and removes the first from the Watchlist. Once recorded changes are available it finds the setup's
watched change for the second film in History. The spec is skipped on staging, where the tier does not change
account data. The tier has eleven specs, including tracking, rating and card-layout checks, with phone navigation
and touch interactions at their own viewports. Existing fixture, accessibility, credential and artifact policies stand.

## Consequences

### Positive

- Planned and seen films have clear destinations, while History remains alongside the films it describes.
- One server timeline order and indivisible change groups make pagination predictable.
- Fluid measured cards use the phone's width without coupling personal reads to TMDB's pagination.
- The signed-in browser journey covers actual persistence and accessible personal routes with deterministic films.

### Negative

- A separate personal grid and timeline need their own measurement and return-position coverage.
- Refetching every loaded page after a save costs more as a session accumulates pages.
- Change selection and grouped expansion add backend query and frontend state complexity.

### Risks

- Change rows depend on the recorded-change model and its save/Undo semantics; the complete journey waits for them.
- Integration with the logging dialog and signed-in Home must preserve their shared navigation and data contracts.
