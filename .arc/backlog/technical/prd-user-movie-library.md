# PRD: User Movie Library

**Type:** Technical
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2026-11-14

---

## 1. Introduction/Overview

A signed-in visitor's films have one page today. `/watchlist` (`Watchlist`, `frontend/src/pages/user/Watchlist.tsx`)
lists the watchlist's titles as plain text from the first 100 records `libraryQuery` returns, and the bar's personal
link reads "Watchlist" (`MainNavLinks`), standing in for a Library link until a Library page exists. The tracking model
on `main` holds what more pages need: on each film's record, whether it is watched, on the watchlist and liked, its
current rating, and when it joined each list; and dated **entries**, each a viewing, a review, or both, with its own
rating and rewatch mark. `GET /user-movie-data/movies` already serves a user's films filtered by list and sorted by
date added, last watched, rating, title or release date.

This work gives signed-in visitors two pages for their own films:

- **The Watchlist page** (`/watchlist`): the films they mean to see, as a grid of cards, sorted by date added, title or
  release date.
- **The Library** (`/library`): every film they have seen, once each, with Liked and Rated filters and five sorts; and
  **History** (`/library/history`), the Library's timeline: every viewing and review, and the changes they made
  outside logging (adding to the watchlist, marking watched, liking, rating), grouped when there are many on one day.

The bar's personal links become **Watchlist** and **Library**, and the catalog's link, Films today, reads **Explore**,
so each word in the bar names one place. A film opened from these pages leads back to them at the place the visitor
left. A signed-in browser smoke spec covers the watchlist and the Library.

The design was settled in the Library's design draft (`draft-user-movie-library.md`), which revises the shared draft
for the user-movie pages (`draft-user-movie-uis.md`) and holds the alternatives weighed; every binding decision is
stated here.

## 2. Goals

1. **Each personal word means one place.** The bar reads Explore · Watchlist · Library signed in; "Library" means the
   films the visitor has seen, and "History" their timeline, so no page or tab overlaps another.
2. **A visitor sees all of their films, however many.** The pages hold thousands of films and History thousands of
   rows, loading as the visitor scrolls, on a phone and on a wide screen.
3. **History shows what the visitor did, not what the rules did.** Viewings and reviews appear as logged; the visitor's
   own changes appear once each, a change they reversed straight away disappears, and a day of bulk marking reads as
   one row.
4. **The pages stay true after any save.** A change made anywhere shows on the next read of every loaded page.
5. **Leaving for a film keeps the visitor's place.** The film page's back link returns to the same page, view, sort
   and filters, and, while the app stays loaded, to the same scroll position within the pages the visitor had loaded.
6. **The signed-in journey is in the smoke tier.** A browser spec adds a film to the watchlist, finds it there, and
   scans the Watchlist, Films and History pages for accessibility.

## 3. User Stories

- As a signed-in visitor, I want my watchlist as posters I can sort, so I can pick what to watch next.
- As a visitor who has logged hundreds of films, I want to see every film I've seen, and narrow it to the ones I liked
  or rated, sorted by when I saw them or how I rated them.
- As a visitor, I want a timeline of what I watched and reviewed, with what I added, liked and rated along the way, so I
  can look back over a month.
- As a new member who marked 200 films watched in one evening, I want that evening to read as one line I can open,
  not 200.
- As a visitor deep in my Library, I want to open a film and come back to where I was.
- As a phone user, I want the same pages at two posters across.

## 4. Requirements

Every requirement is **P0**. "Signed in" means `useAuthContext()`'s `status` is `authenticated`. A **record save** is a
`PATCH /user-movie-data/{tmdb_id}`; an **entry write** is a create, edit or delete of an entry. The **Library
endpoint** is `GET /user-movie-data/movies` (`LibraryQuerySchema`, `UserMovieDataService.get_library`).

### The bar and the addresses

**R1. The bar's links.** `MainNavLinks` reads **Explore**, **Watchlist** and **Library** while signed in, and
**Explore** alone otherwise; the phone drawer (`NavDrawer`) carries the same links, as it does today.

- Explore opens `/browse` and is the current link on the catalog's three addresses, as Films is today.
- Watchlist opens `/watchlist` and is current there.
- Library opens `/library` and is current on `/library` and `/library/history`.

At 1024px, the bar's narrowest full width, signed in, every item in the bar (the wordmark, the three links, the search
field, the card controls' Log button when it is on `main`, and the account control) is fully visible with none
overlapping another, and the page does not scroll sideways. The search field keeps narrowing to make room, as it does
today.

**R2. Addresses.** `/watchlist` shows the Watchlist page, `/library` the Library's Films view and `/library/history`
History. All three need a signed-in visitor: a signed-out visitor is sent to sign in and returned afterwards, as
`ProtectedRoute` does for `/watchlist` today. No address redirects to another, and any other `/library/…` address shows
Not Found. The route constants (`ROUTES`) name the two new addresses.

**R3. The Library page.** Its one `h1` reads "Library" on both views. Beneath it, a navigation landmark named
"Library" holds two links, **Films** (`/library`) and **History** (`/library/history`), drawn as the catalog's release
windows are (`CatalogWindowTabs`): the current one marked as the current page with the accent underline. They don't
carry the Films view's sort or filters. No page, view or link shows a count of films or rows.

**R4. The Watchlist page's heading.** Its one `h1` reads "Watchlist".

### The Library's grid

The Watchlist page and the Films view draw `MovieCard` in one grid of their own, built here. The catalog's grids
(`VirtualizedMovieGrid`, `SequentialMovieGrid`) and their fixed 194px card (`CARD_WIDTH`) are unchanged.

**R5. Columns.** The grid has as many columns as fit its width at 150px or wider, with the shared 16px gap (`GAP`)
between them, and cards fill their column's width. Inside the app's page padding (`AppLayout`), that is 2 columns on a
390px-wide screen and 7 on a 1280px one. No column is narrower than 150px, so every card is wider than the 138px its
hover controls need.

**R6. Rows.** Rows are virtualized with `@tanstack/react-virtual`'s window virtualizer and measured as they draw, so a
row's height follows its cards at any column width, and the Films view's date line (R15) fits.

**R7. Paging.** The grid reads the Library endpoint in numbered pages of 100 (`page_size: 100`, its maximum) through
one infinite query under the Library's query key (`libraryKey`), and requests the next page as the visitor nears the
end of what has loaded. It requests a next page only while no fetch of the list is running, as `VirtualizedMovieGrid`
does, so a next page never cancels a refetch. Pages are joined with any film already shown dropped. Another page exists
while the last page read is below `total_pages`, as the pagination strategy says, so an empty list ends at its first
page. While the first page loads, the grid shows placeholder cards (`GridSkeletonLoader`); if it fails, the page says
"Couldn't load your watchlist." or "Couldn't load your films." with Retry; if a later page fails, Retry shows beneath
the grid.

**R8. Refreshing after a save.** Every record save and every entry write already invalidates `libraryKey`
(`useUserMovieState`, `useMovieEntries`), so a loaded list refetches every page it holds, in order, and a film that
left the list goes and one that joined appears. While that refetch runs, scrolling loads no further page (R7).

The frontend's Library read (`UserMoviesQueryParams`, `getUserMovies`) gains the endpoint's `watched`, `liked` and
`rated` filters and its `sort` and `direction`, typed as the endpoint's values.

### The Watchlist page

**R9. The list.** The page reads the Library endpoint with `watchlist: true` and lists those films in the grid. A
"Sort by" dropdown, a Chakra `Select` labelled "Sort by" and styled as the catalog's sort (`selectStyles`), pairs each
field with its direction:

| Option | `sort` | `direction` |
| --- | --- | --- |
| Date added: newest (the default) | `added` | `desc` |
| Date added: oldest | `added` | `asc` |
| Title: A–Z | `title` | `asc` |
| Title: Z–A | `title` | `desc` |
| Release date: newest | `release` | `desc` |
| Release date: oldest | `release` | `asc` |

Date added is when the film last joined the watchlist. A film already watched and kept as a rewatch queue shows on its
card whatever `MovieCard` shows for a watched film; once the card controls are on `main`, that is their watched mark.

**R10. The address carries the sort.** `sort` and `direction` join the address only when they differ from the default
(`added`, `desc`): "Title: A–Z" is `/watchlist?sort=title&direction=asc`, "Title: Z–A" `/watchlist?sort=title`. A
value the page doesn't offer falls back to the default, and the page corrects the address in place, replacing its
history entry. Choosing a sort also replaces the history entry, as every change of the catalog's options does
(`useMovieCollectionUrl`), so the browser's Back leaves the page rather than stepping back through sorts. Choosing a
sort starts the list at the top.

**R11. Empty.** With no films on the watchlist the page says "Your watchlist is empty", with an "Explore films" link
to `/browse`.

### The Films view

**R12. The list and its filters.** The Films view reads the Library endpoint with `watched: true` and lists every
watched film once. Two toggle buttons, **Liked** and **Rated**, each exposing its state with `aria-pressed`, add
`liked: true` and `rated: true` to the read. They combine; each joins the address as `liked=true` or `rated=true` while
on (any other value counts as off), replacing the history entry as a sort does (R10); and they stay when the sort
changes, as the sort stays when they change.

**R13. Sorts.** A "Sort by" dropdown as on the Watchlist page:

| Option | `sort` | `direction` |
| --- | --- | --- |
| Date added: newest (the default) | `added` | `desc` |
| Date added: oldest | `added` | `asc` |
| Last watched: newest | `watched` | `desc` |
| Last watched: oldest | `watched` | `asc` |
| Your rating: highest | `rating` | `desc` |
| Your rating: lowest | `rating` | `asc` |
| Title: A–Z | `title` | `asc` |
| Title: Z–A | `title` | `desc` |
| Release date: newest | `release` | `desc` |
| Release date: oldest | `release` | `asc` |

Date added is when the film was marked watched. Last watched is the film's latest dated viewing, and films never logged
come last in both directions; unrated films come last in both directions of Your rating. The endpoint orders both so
today (nulls last either way).

**R14. The address carries the sort,** as R10 says, on `/library`.

**R15. The date line.** Beneath each card whose film has a dated viewing, in the grid cell and outside `MovieCard`, a
line reads "Last watched" and that date ("Last watched Nov 14, 2026"), from the record's `last_logged_on`. Every cell
of the Films view keeps that line's height, so a row's cards line up whether they show it or not.

**R16. Empty.** With neither filter on and no films, the view says "Your Library is empty", with an "Explore films"
link to `/browse` (and "Log a film" under R34c). With a filter on and no films, it says "No films match", with "Clear
filters", which turns both filters off and keeps the sort; a visitor with no watched films then sees "Your Library is
empty". The view tells the two apart by its filters alone, with no further read.

### History

**R17. The list.** History is one list, newest first, under month headings (`h2`, "November 2026"). Each day's date
("Nov 14") shows once, beside its first row. Its rows are of three kinds: viewings (R18), reviews (R19) and the
visitor's changes (R20, R21). Rows are read-only: entries are edited on the film's page. Each row's film title links to
the film's page (R27).

**R18. A viewing** (an entry with a date) is its own row on its `watched_on` day, and viewings never collapse. It shows
a small poster (or the poster placeholder), the title and release year, the entry's rating as `RatingStars` at its
small size when it has one, the rewatch icon (`RewatchIcon`) when it is a rewatch, and the first two lines of its
review as plain text.

**R19. A review saved without a date** is its own row on the day it was written (the entry's `made_on`), drawn as a
viewing is, with a "Review" tag in place of the rewatch icon.

**R20. Change rows.** The visitor's own changes outside logging show as quieter rows: shorter, in muted text
(`on-muted`), with a tiny poster. History shows four kinds, and each film once per kind per day, counted over the
changes History shows (R23):

| Kind | One film's row | A group's row |
| --- | --- | --- |
| Added to the watchlist | "Added to your watchlist" | "Added {n} films to your watchlist" |
| Marked watched | "Marked watched" | "Marked {n} films watched" |
| Liked | "Liked" | "Liked {n} films" |
| Rated | "Rated", with the stars | "Rated {n} films" |

A film rated more than once in a day shows that day's last rating. When a day has 3 or fewer films of one kind, each
shows as its own row. When it has more than 3, they collapse into one row (R21).

**R21. A group.** A group's row names the kind and its count (R20), shows a strip of up to 8 tiny posters, and ends
with "Show all {n}". "Show all {n}" expands the group in place: its films follow as change rows without dates, 100 at a
time from `GET /user-movie-data/history/changes` (R24), with "Show more" while more remain, and "Show fewer" collapses
it. Which groups are expanded is kept in memory for the loaded app, so a group is still expanded when the visitor
returns from a film (R28); a reload, or a change of the signed-in user, collapses every group.

**R22. Order.** Viewings sit on their `watched_on` day, reviews on their `made_on` day, and changes on the day stored
with them, in the visitor's time zone when they were made (§ 6), so no read needs a time zone. Days run newest first.
Within a day, the most recently made row comes first: a viewing or review by when its entry was created, a kind's
changes by the latest of them. A day's changes of one kind sit together where the latest of them does, whether drawn as
a group or as up to 3 rows.

**R23. What History shows of the record of changes.** History's read selects, from the record of changes (§ 6), the
**shown changes**. A recorded change is shown when all of these hold:

- a record save made it, not an entry write;
- it turned something on: added the film to the watchlist, marked it watched, liked it, or set its rating (a first
  rating or a re-rating);
- the film's next save does not reverse it in its own field. A **save** is the set of the film's recorded changes
  sharing one made time; the next save is the first later save of the same film that recorded anything, leaving out
  the rating changes an entry write made. It reverses the change when it took the film off the watchlist, un-marked
  it watched, removed the like or cleared the rating, in the change's own field.

Only the next save decides: a later save never changes the outcome, so re-liking a film adds a new shown change and
leaves the hidden one hidden, and a save that changed only another field in between keeps the change shown. Deleting a
recorded change (an Undo does, § 6) changes which save comes next, so undoing a removal shows the change it had
hidden again. Per day and kind, a film counts once, with its latest shown change that day; for ratings, that change's
value.

**R24. The read.** Two routes on `user_movie_data_router`, matched before `/user-movie-data/{tmdb_id}`, as `/movies`
and `/entries` are. Each requires a signed-in user, reads only that user's films, entries and changes, and pages
through `PaginatedResponse` (`page`, `total_pages`, `total_results`, `results`) with the cross-film entry list's bounds
(`page` 1 to 1,000,000, default 1; `page_size` 1 to 100, default 20) and its rule that a page past the end is empty with
valid counts. Neither is throttled, as reads are not. Each answers 401 with no user and 422 for a malformed query, with
the shared error body. The logic lives in the `user_movie_data` service layer; the routes only map HTTP.

- **`GET /user-movie-data/history`** returns History's rows in R22's order, made a stable total order by breaking ties
  by kind (viewings, then reviews, then changes), then viewings and reviews by entry ID, newest first, and a day's
  change rows by field (`watchlist`, `watched`, `liked`, `rating`), as `HistoryRowSchema`: a union told apart by
  `kind`.
    - `kind: "viewing"` and `kind: "review"`: `day` (the row's date), with the entry's fields and its film's
      (`ActivityEntrySchema`'s: `id`, `tmdb_id`, `watched_on`, `rating`, `review`, `rewatch`, `title`, `release_date`,
      `poster_path`).
    - `kind: "changes"`: `day`; `field`, one of `watchlist`, `watched`, `liked` and `rating`; `count`, the number of
      films with a shown change of that kind that day; and `films`, up to 8 of them, most recent first, as
      `HistoryChangeFilmSchema` (`tmdb_id`, `title`, `release_date`, `poster_path`, and `rating`: for the `rating`
      field, the film's last shown rating that day, otherwise null).

  The server groups every day's shown changes by field, so a day and field is one row and a page boundary never
  splits a group.
- **`GET /user-movie-data/history/changes`** takes `day` (a date) and `field` (one of the four), both required, and
  returns that group's films as `HistoryChangeFilmSchema`, most recent first, each once. A day and field with no shown
  change answers an empty page.
- `GET /user-movie-data/entries` (the cross-film list of dated entries, read by `activityQuery`) and
  `ActivityEntrySchema` are unchanged.

Until the record of changes is on `main`, the history route returns viewings and reviews only, and the changes route
and the `changes` kind are built once it is (R34b).

**R25. History in the frontend.** History's reads sit under `libraryKey`, so every record save and entry write
refreshes them (R8). The list reads numbered pages of 100 through one infinite query, requesting the next as the
visitor nears the end, only while no fetch of the list is running and while another page exists (R7's rule); a group's
films read under the same key, by the same rule. Pages are joined without duplicate rows: an entry by its ID, a group
by its day and field (one film can rightly appear in more than one row). Rows are virtualized with the window
virtualizer and measured as they draw, so an expanded group and a review's lines fit. A `changes` row is one
virtualized row however it is drawn: its single rows, or its group with the films it has expanded, which sit inside it.
Each row's key in the virtualizer is what it shows: a viewing or review by its entry's ID, a `changes` row by its day
and field, and a month heading by its month (R28). While the first page loads, History shows placeholder rows; if it
fails, "Couldn't load your history." with Retry; if a later page or a group's films fail, Retry shows in its place.
The client draws a `changes` row of 3 or fewer films as single rows (R20) from its `films`, and a larger one as a group
(R21).

**R26. Empty.** With no rows, History says "Your history is empty", with an "Explore films" link to `/browse` (and "Log
a film" under R34c).

### Back links and scroll

**R27. Films lead back to where they were opened.** A film opened from these pages carries where it came from, and the
film page's back link (`BackToCollectionLink`, whose `buildBackUrl` today sends a missing `from` to
`/browse/now-playing` and an unknown one to `/browse/{from}`) returns there:

| Opened from | The film's address carries | The back link reads | and opens |
| --- | --- | --- | --- |
| A card on the Watchlist page | `from=watchlist`, with the page's sort | "Back to Watchlist" | `/watchlist`, with that sort |
| A card in the Films view | `from=library`, with the view's sort and filters | "Back to Library" | `/library`, with them |
| A row in History, or a film in an expanded group | `from=history` | "Back to History" | `/library/history` |

Cards pass their page through `MovieCard`'s `source`, which sets `from` and keeps the page's own query; History's
links set it themselves. The back link keeps sending its scroll signal (`restoreScroll`), as it does for the catalog.

**R28. Returning restores the scroll position.** Following the back link to the Watchlist page, the Films view or
History scrolls to where the visitor left, through the persistence the catalog's grids use (`useScrollPersistence`):
positions are saved as the visitor scrolls, kept per page and per sort and filters, and restored only on the back
link's signal. Changing a sort or filter starts at the top. Arriving by the bar, the browser's Back button or a reload
starts at the top, as on the catalog. A return reaches as far as the pages the query cache still holds; a position past
them lands at the end of what loads, as on the catalog's grids. History's expanded groups stay expanded (R21).

A saved position means the same rows only if every row above it has the height it had. The catalog's rows have one
fixed height; these are measured (R6, R25), and the virtualizer lays out a row it hasn't measured at its estimate. So
each of the three pages keeps its virtualizer's measured row heights in memory for the loaded app, under the same key
as its position, and hands them back when it restores on the back link's signal (`initialMeasurementsCache`); arriving
any other way starts with none. The grid keys its rows by their index, and History by what each row shows (R25), so a
History row keeps its height whatever loads before it. A reload or a change of the signed-in user drops them, as it
collapses the groups (R21).

A page restores on the back link's signal only while it holds, under the position's key, both the heights it measured
and a position it saved since the app loaded. Otherwise, as after a reload of the film page or of the page itself, or
a change of the signed-in user, the back link opens it at the top. The condition governs the virtualizer's initial
offset as well as the restore; `useScrollPersistence` gains it, and the catalog's grids leave it always met. A save
made on the film page refreshes the list (R8) and can add, remove or move rows above the saved position; the return
then lands at that position over the refreshed list, a shift that is accepted.

### The smoke spec and accessibility

**R29. Fixture films.** Two fixture films with IDs far above TMDB's range (2,000,000,001 and 2,000,000,002) are stored
by the development seed (`seed_dev_data`) as cards (a title, a release date, no poster), created when missing and left
as they are when present, so an existing development database gains them on its next seed. The seed stores no user
data for them. A save of either film finds its card stored and never asks TMDB. Locally, the smoke tier answers the
catalog's reads (`/api/movies…`) from fixtures in the browser, so the spec serves a catalog page holding the fixture
films, and their detail if a step opens one, from its own routes.

**R30. The signed-in spec.** A new spec, `frontend/e2e/library.spec.ts`, at 1280×800, against the local target only;
staging skips it, as it skips sign-up, since the staging run changes none of its account's data.

- **Setup.** It signs in as the target's development account, deletes both fixture films' records
  (`DELETE /user-movie-data/{tmdb_id}`, which removes their entries and recorded changes, so every run starts from the
  same state; a 404, where there is no record, counts as already deleted), and marks the second fixture film watched
  with a record save, sending the browser's time zone as the save layer does.
- **Steps.**
  1. Add the first fixture film to the watchlist from its card in a catalog grid.
  2. Follow the bar's Watchlist link and find the film's card on `/watchlist`; scan the page.
  3. Follow the bar's Library link and find the second fixture film in the Films view; scan the page. Open History and
     find the film's "Marked watched" change: its own row, or, on a day the account has marked more than 3 films
     watched, among the films of that day's "Marked {n} films watched" group after "Show all {n}" (most recent first,
     so on the group's first page); scan the page.
  4. Back on `/watchlist`, remove the first film from the watchlist from its card, and see it leave the page.

Under R34c, the log dialog's steps replace step 4. Step 3's search for the change in History waits for the record of
changes (R34b); until it lands, the step opens and scans History without it.

**R31. The specs and tests that name the bar.** `sign-in.spec.ts` and `phone-width.spec.ts` assert Explore wherever
they assert Films, keep asserting Watchlist, and assert Library signed in. `phone-width.spec.ts`'s 1024px step checks
R1's fit. `NavBar`'s, `NavDrawer`'s and `BaseLayout`'s component tests follow.

**R32. Accessibility.** The scan (`scanPage`) checks each new page: its baseline's routes (`BaselineEntry.route`) gain
`/watchlist`, `/library` and `/library/history`, and each page has one `h1`. Unless `main` names the card's icon
buttons when this work merges it (R34c), the baseline (`e2e/axe-baseline.ts`) gains a `button-name` entry for
`/watchlist` and for `/library`, with the reason the catalog's entries give: the cards' icon buttons lack accessible
names. History draws no cards and adds no entry.

### Documents

**R33.**

- **ADR-050 (new)** records the Watchlist page and the Library with their addresses and no redirect; the bar's
  Explore, Watchlist and Library links; the Library's Films and History views; the Library's own grid (R5 to R7);
  History as the Library's timeline and its read (R17 to R24: its row kinds, the selection of shown changes, the
  grouping by day and field, the changes route), beside the unchanged list of dated entries; and the signed-in smoke
  spec. It is written reading `Proposed` with this work and set to `Accepted` before it merges. It supersedes in part:
    - ADR-044: the bar's one personal link, reading Watchlist until a Library page exists and current only on
      `/watchlist`; the catalog's link reading Films; its sentence that Films can later open a Films hub without
      changing the bar (a future hub opens from Explore); and its list of the smoke tier's specs. ADR-044's Status says
      so.
    - ADR-039: watchlists among what the smoke tier leaves out. ADR-039's Status says so.
- **ADR-027's Status** records that its deferred end-to-end watchlist test is now the signed-in spec (R30).
- **Every document that names, counts or describes the smoke tier's specs** names the new spec and counts it, found by
  searching for the spec files' names and the counts. Known sites: TECHNICAL-OVERVIEW § 7, QUICK-REFERENCE § End-to-End
  Smoke Tests, the testing strategy's E2E sections and the quality-gates strategy. ADRs other than those above, and
  archived records, stay as written.
- **The pagination strategy** names History's read among the database-served lists in `PaginatedResponse`.
- **The component-styling strategy's** top-bar example links Explore.
- **The README's** list of what's built says Explore for Films and names the Watchlist page and the Library with its
  History, and its list of what's in development no longer names the library.

### Neighbouring work

**R34.** Before this work's pull request merges, `main` is merged into its branch. What `main` then holds decides these
further changes, each checked against `main`'s code at that merge:

- **a. API types, always.** `frontend/openapi.json` and `frontend/src/types/api.ts` are regenerated from the merged
  backend.
- **b. The like rule and the record of changes must be on `main`.** History's change rows (R20, R21, R23, R24's
  changes) and the signed-in spec's search for a change in History (R30, step 3) are built after they land, and this
  work's pull request waits for them; the rest of this work does not.
- **c. If `main` has the card controls' log dialog** (opened through `useEntryDialog().open(options)`), the Films view's
  and History's empty states also offer "Log a film", which opens the dialog on its film picker with the date on. Since
  the empty state, and its button with it, goes once a film is logged, the call names where focus returns when the
  dialog closes: the current view's link in the Library navigation (R3), which stays on both views
  (`open({ dateOn: true, returnFocus })`). In the signed-in spec, the dialog's steps replace step 4: back on
  `/watchlist`, log the first fixture film from its card with today's date, a rating and a review, which takes it off
  the watchlist, since it is logged on the day it joined (§ 6), and see it leave the page; find the entry on the film's
  page; and find the film in the Films view and History. ADR-050 then records those steps. The card controls also make
  the card's "Add to watchlist" and "Remove from watchlist" buttons one Watchlist toggle, in the card's hover group or
  its "⋯" menu: the spec's step 1 and the Watchlist page's test of a removal from a card (criterion 4) press it. If
  `main`'s cards then name their icon buttons, no `button-name` baseline entry is added (R32). Without the dialog on
  `main`, the empty states offer no "Log a film", and none of these are added here.
- **d. If `main` has the landing page's signed-in Home without "Recently watched",** this work adds it (R35). If Home
  already has it, opening `/library/history`, nothing changes. If this work merges first, the landing page builds
  R35's section when it merges (its R30b).
- **e. If `main`'s Library read already carries `sort` and `direction`** (`UserMoviesQueryParams`), R8's additions keep
  that form. **If `main`'s back link already knows `from=home`,** R27's cases join it.

**R35. "Recently watched" on Home** (only under R34d). Signed-in Home shows a section titled "Recently watched" after
the watchlist's section and before what's on:

- It reads the cross-film list of dated entries (`activityQuery`, page 1, `page_size` 5): the visitor's five most
  recent viewings, newest first, one per viewing, so a film seen twice can appear twice.
- Each shows the viewing's date; the rewatch icon when it is a rewatch; a small poster; the title and release year; and
  the viewing's rating as `RatingStars` at its small size. Each links to its film's page with `from=home`.
- "See all" opens `/library/history`. The watchlist section's "See all" keeps opening `/watchlist`.
- Its read joins the reads that decide signed-in Home's first render, as Home's other sections' reads do on `main`
  then; its failure shows the section's failed state with Retry; and Home's set for a visitor with nothing saved counts
  viewings, so a visitor with no watchlist films and no viewings sees it. A visitor with no viewings sees no section.

## 5. Non-Goals

- **The card controls, the film page's panel, the log dialog and the Log button.** These pages draw today's
  `MovieCard` and gain the controls when they reach `main`; R34c says what this work adds if the dialog is already
  there.
- **The like rule, the record of changes, the date-added rule for combined filters and record saves' time zone.** They
  are a separate backend change (§ 6); this work reads what it records.
- **Editing or deleting entries from History.** That happens on the film's page.
- **Showing removals** in History, backfilling the record of changes, and importing from other services.
- **Next Up, drag-and-drop, a "Your order" sort, and Favorites.** The watchlist queue's own work designs and builds
  them, with Next Up's row above the Watchlist grid and Favorites' above the Library grid.
- **Sharing** ratings, reviews, entries or History, and any social feed. History is private to its owner.
- **Counts** on pages, views or links.
- **The catalog's grids:** their data layer, their fixed card width and their phone layout, and restoring their
  positions past the pages a reload loads.
- **Signed-in Home** beyond R35, and today's Featured page's "Films" card, which the landing page replaces.
- **Search suggestions.**

## 6. Technical Considerations

**The tracking model on `main`.** The Library endpoint filters by `watchlist`, `watched`, `liked` and `rated` (with no
filter, it lists every film with any state), sorts by `added`, `watched` (last logged), `rating`, `title` and `release`
with nulls last in both directions and the TMDB ID as the final key, and pages up to 100 films with one count and one
row query. `added` sorts by the join time of the one list the query filters among `watchlist`, `watched` and `liked`,
and by the record's creation time when it filters several. Every film it returns carries its record
(`UserMovieDataSchema`), including `last_logged_on`. Entries carry `watched_on`, `made_on` (the day the entry was made,
in the visitor's time zone) and their creation time. Logging a film dated on or after the day it joined the watchlist,
in the visitor's time zone, takes it off the watchlist, as does logging an unwatched film without a date
(`apply_entry_create`).

**The like rule and the record of changes.** A backend change planned to land before this work's pull request merges
(R34b) adds, as an expected contract:

- **The like rule.** Liking an unwatched film marks it watched; un-marking Watched on a liked film clears the like;
  existing liked, unwatched records become watched. Every liked film is then in the Films view.
- **Date added with combined filters.** `added` sorts by the first of `watchlist`, `watched` and `liked` the query
  filters, so the Films view's date added is always when the film was marked watched. Until it lands, the Liked filter
  sorts date added by the record's creation time.
- **The record of changes.** One private row for each change a save makes to a film's watchlist, watched, liked or
  current rating, deleted with the film's record. Each row holds the film's record; the field; its new value (on or
  off; the rating's value, or cleared); whether an entry write made it; when it was made, shared by every row one save
  writes; and the day it happened in the visitor's time zone, which record saves send as entry writes do (a save without
  one records its UTC day). Turn-ons are recorded only when the visitor's own record save supplied them, never when a
  rule made them; an entry write records its changes to the current rating, and its other turn-ons are part of the
  viewing. Reversals are recorded whatever caused them, except a watchlist removal a rule makes. An Undo records
  nothing for the fields it changes and deletes each such field's latest row when that row recorded the change being
  undone. An older Undo, made after a later save changed the same field, finds a field's latest row that isn't the
  change it undoes, so History can keep or lose the wrong change row; that edge is accepted, as the card controls
  accept the rules acting on such an Undo, and History's selection (R23) doesn't correct it.

The record of changes decides what is recorded; History's read decides what shows (R23). Its tests seed recorded
changes directly to cover each case.

**Refreshing costs requests.** A refetch of every loaded page (R8) costs about 3 queries a page: the count, the rows,
and the user's lookup in authentication. A list scrolled through 2,000 films costs 20 requests per save, and reads
have no throttle. This is accepted, to be revisited when a profile shows the cost; bounding it later changes only the
grid's paging hook. Next Up's drag-and-drop will need to patch these cached pages.

**History's read and what it measures.** History's page is one ordered union of entries and grouped changes, paged by
offset with a count, which is expected to be cheap at launch scale. It is measured two ways: a backend test shows a
page takes a fixed number of queries whatever the number of entries and changes, and a local measurement before review
(criterion 15) times the first and a deep page for a heavy account. No index is added: every query reads one user's
rows first.

**Errors.** Reads fail as the Library endpoint's do: Axios errors reach the query, the page shows its failed state
(R7, R25), and a 5xx also raises the app's server-error toast, as today.

**Signed-in state.** The pages render only for a signed-in visitor (R2). Signing out or switching users resets every
user query (`resetUserQueries`), and clears History's expanded groups (R21) and the pages' measured row heights (R28).

**Tests.** Backend tests run against the real test database, with no TMDB call (the history routes read stored cards).
Frontend tests mock the network with MSW, query by role and accessible name and act through `userEvent`. The default
handler for the Library endpoint (`userMoviesHandler`) reads only `watchlist`, so the new pages' tests answer with
their own handlers, which check the filters, sort and page each read sends; no default handler serves History's
routes.

**Privacy.** History reads only its owner's entries and recorded changes, and nothing here shows them to anyone else.

## 7. Design Considerations

- **Tokens.** The quiet rows' muted text, the group strip and the toggles use semantic tokens and existing recipes,
  never raw values; the Liked and Rated toggles show their pressed state through a button recipe variant.
- **Stars and icons.** A rating shows as `RatingStars`, a rewatch as `RewatchIcon`, both from the tracking model.
- **Posters.** Small and tiny posters use TMDB's sizes as cards do, with the poster placeholder when a film has none;
  posters beside a title are decorative (empty alternative text), since the title names the film.
- **The design reference** for the pages' layout is the Library Study, a design page outside this repository; where it
  differs from this PRD, this PRD holds.

## 8. Design Decisions

- **D1: two pages, the Watchlist and the Library** (R1 to R4), over one Library with five tabs (Watchlist, Watched,
  Liked, Rated, Activity), which overlap: every rated film is watched, "Watched" and "Activity" read alike, and
  "Activity" suggests a social feed. Over an umbrella "Library" above Watchlist, Seen and History, where "Library"
  still names a container and "Seen" splits the vocabulary with the cards' Watched. The product charter already names a
  Watchlist page and a Library of films seen. _ADR:_ ADR-050 (new).
- **D2: the catalog's link reads Explore** (R1), over Films, which every bar destination now holds and the Library's
  own Films view repeats, and over Browse, which fits the catalog's address but less well a later Films hub. The
  catalog's address stays `/browse`. _ADR:_ ADR-050 (new), superseding ADR-044 in part.
- **D3: History as the Library's second view** (R3, R17), over a separate page, since it is the timeline of the films
  the Library holds, and over Activity (a social feed), Journal, Viewings and Log (the bar's Log button). _ADR:_
  ADR-050 (new).
- **D4: Liked and Rated as filters of films seen** (R12), over tabs of their own, which list the same films. With the
  like rule (§ 6), no liked film is left off every page. _ADR:_ covered by ADR-050 for the view; the toggles' form is
  `none`, a tactical choice.
- **D5: no redirect and no counts** (R2, R3), over keeping old Library tab addresses alive (none shipped) and over
  counts that would need a second query on every page. _ADR:_ ADR-050 (new) records the addresses; no counts is `none`,
  a tactical choice.
- **D6: the Library's own grid** (R5 to R7), over reusing the catalog's virtualized grid, whose data layer is the
  catalog's buffered pagination and whose 194px column wastes a phone's width; fluid columns of at least 150px over
  the cards' 138px minimum; measured rows over a fixed row height, since a fluid card's height follows its width.
  _ADR:_ ADR-050 (new).
- **D7: refetch every loaded page after a save** (R8), over keeping only a few pages loaded, which needs loading
  backwards when scrolling up, and over patching cached pages, which leaves membership and order stale until the list
  is reopened. _ADR:_ `none`, a tactical choice with its revisit trigger recorded in § 6.
- **D8: History's own read** (R24), over merging the entry list and the changes in the browser, which can't page one
  order across two sources. Groups are formed on the server so a page never splits one; each change's day is stored
  when made, so no read takes a time zone. The dated entry list stays as it is for Home. _ADR:_ ADR-050 (new).
- **D9: History's read selects what shows** (R23), over the record of changes exposing a selection of its own: the
  record keeps what happened, the read decides what a timeline shows, and the selection's tests seed recorded changes
  directly. _ADR:_ ADR-050 (new).
- **D10: groups by day and kind** (R20, R21), over a fixed time window, which is harder to predict, and over a setup
  mode that records nothing, which would lose real history. Grouping above 3 films and a sample of 8 posters are
  tactical. _ADR:_ ADR-050 (new) records the grouping; the threshold, the sample, the row styles and the month
  headings are `none`, tactical choices.
- **D11: a group's films from their own route, 100 at a time** (R21, R24), over carrying every film in the group's
  row, which would put hundreds of films in one page row. _ADR:_ covered by ADR-050, which records the read's routes.
- **D12: back links and scroll return through the existing mechanisms** (R27, R28): `from` values and labels in the
  back link, and the catalog's scroll persistence, over a new restoration mechanism. Expanded groups and measured row
  heights kept in memory over storing them, since a return happens within the loaded app; the heights are handed back
  on return because a measured row laid out at its estimate moves every row below it, which the catalog's fixed rows
  never risk. Without them, after a reload, a return starts at the top, over keeping a stored row height for the grid
  or computing it from the card's sizes: a reload also empties the query cache, so a return could reach only the first
  page, and the card's height has no constant on `main`. _ADR:_ `none`, tactical choices extending existing patterns.
- **D13: one signed-in spec on fixture films the seed stores** (R29, R30), over real films, whose cards a save would
  ask TMDB for (CI's stack can't reach it), and over cleaning up after the run, which a failed run skips. _ADR:_ ADR-050
  (new), superseding ADR-044 (its list of specs) and ADR-039 (its watchlist exclusion) in part.
- **D14: sorts as one dropdown of field and direction, and defaults left out of the address** (R9, R10, R13), as the
  catalog's sort; correcting an unknown value in place, and replacing the history entry on every change, as the
  catalog does for its own changes. _ADR:_ `none`, a tactical choice.
- **D15: one `h1` across the Library's views, with a "Library" navigation** (R3), over a heading per view, matching the
  catalog's windows under one title. _ADR:_ `none`, a tactical choice.
- **D16: empty states and copy** (R11, R16, R26, R20's labels). _ADR:_ `none`, tactical choices.
- **D17: History's read measured by query count and one timing, with no index** (§ 6). _ADR:_ `none`, a tactical choice.
- **D18: whichever of this work, the card controls and the landing page merges second adds what they share** (R34,
  R35). _ADR:_ `none`; it orders delivery and decides nothing about the system.

**ADRs this work delivers:** ADR-050 (new), superseding ADR-044 and ADR-039 in part; a dated note on ADR-027's
Status.

## 9. Success Criteria

### Implemented

1. **The smoke spec.** `library.spec.ts` passes against a worktree's browsable stack: the film added from a card is
   found through the bar's Watchlist link and removed (under R34c, logged off the watchlist); the Films view and
   History show the film the setup marked watched, with History's "Marked watched" change; and the scans of
   `/watchlist`, `/library` and `/library/history` pass. Run against staging, it is skipped. (R29, R30, R32)
2. **The bar.** Component tests show Explore, Watchlist and Library signed in, and Explore alone signed out, in the bar
   and the drawer, each current exactly on its addresses (R1). `phone-width.spec.ts`'s 1024px step finds every bar
   item fully visible, none overlapping another, and no sideways scroll. `sign-in.spec.ts` and `phone-width.spec.ts`
   pass with their Explore and Library assertions. (R1, R31)
3. **Addresses and headings.** Tests show `/library/anything` shows Not Found; a signed-out visitor at
   `/library?liked=true` is sent to sign in and returned there; `/watchlist` shows the Watchlist page with no redirect.
   The Library's `h1` reads "Library" on both views and the Watchlist page's reads "Watchlist"; the "Library"
   navigation landmark holds Films and History, the current one marked as the current page, and neither link carries a
   query string. (R2 to R4)
4. **The Watchlist page.** Component tests show it reads `watchlist: true` with `page_size: 100`; each sort option
   sends its pair and sets the address as R10 says; an unknown sort falls back with the address corrected; the empty
   state; and a removal from a card refetching the loaded pages and dropping the film. (R7 to R11)
5. **The Films view.** Component tests show it reads `watched: true`; each toggle exposes `aria-pressed`, adds its
   filter, joins the address and survives a sort change; each sort option's pair; the "Last watched" line on a film
   with a dated viewing only, with the line's height kept on the others; the empty state with no filter on; and "No
   films match" whenever a filter is on and nothing matches, with Clear filters keeping the sort. (R12 to R16)
6. **The grid.** Tests show the column count is 2 for a 390px screen's content width and 7 for a 1280px screen's,
   with no column under 150px at any width; a next page is not requested while the list is fetching, nor once the
   last page read is not below `total_pages`, an empty list's included; a film repeated across two pages is drawn
   once; placeholder cards while the first page loads; each page's failure message with Retry; and Retry beneath the
   grid when a later page fails. (R5 to R7)
7. **History's read.** API tests with stored films, entries and recorded changes show: each row kind with its day and
   fields; days newest first, and within a day the most recently made first; an undated review on its `made_on` day; a
   change row only for a record save's turn-on, never for an entry write's rating change or a reversal; a change hidden
   when the film's next save reverses it, and shown when a save of another field came between; re-liking after an
   unlike showing the new like only; a save holding only an entry write's rating change not counting as the next save;
   deleting a reversal showing the change it hid; a film once per kind per day, with the day's last rating; 4 films of
   one kind on a day forming one group with `count` 4 and its films most recent first, and 9 films sampling 8; a group
   never split across two pages; the changes route paging a group's films and answering an empty page for a day and
   field with none; another user's entries and changes never returned; 401 with no user; 422 for a page size over 100,
   an unknown field or a malformed day; and a page taking the same number of queries with 10 rows as with 500. The
   committed OpenAPI schema lists these statuses for both routes. (R22 to R24)
8. **History in the frontend.** Component tests show month headings; a day's date once; a viewing's stars, rewatch
   icon and review lines; a review's "Review" tag; 3 changes of a kind drawn as single rows and 4 as a group with "Show
   all 4"; expanding reading the changes route, "Show more" reading its next page, and "Show fewer"; a group still
   expanded after leaving for a film and returning, and collapsed after a change of user; rows joined without
   duplicates; the loading, failed and empty states; and a record save refetching History. (R17 to R21, R25, R26)
9. **Back links.** Tests show a film opened from each page carries R27's `from` and query, the film page's back link
   reads and opens R27's label and address with its scroll signal, and returning on that signal restores the saved
   position and gives the page's virtualizer back the row heights it measured, keyed as R28 says, while arriving
   without it starts at the top with none; a return on the signal to a page holding no heights, or no position saved
   since the app loaded, starts at the top, as does a second return after a reload with no scrolling between; and
   choosing a sort, or turning a filter on or off, starts at the top and replaces the history entry. (R10, R12, R27,
   R28)
10. **The seed.** The seed's tests show the two fixture cards created in a database without them, left unchanged on a
    second run, and no user data created for them. (R29)
11. **The documents.** ADR-050 reads `Accepted` with its date; ADR-044's, ADR-039's and ADR-027's Status sections say
    what R33 says; the documents R33 names read as it says, and a search for the smoke specs' file names and counts
    finds every living site naming the new spec. (R33)
12. **The neighbouring work.** Whichever of R34c and R34d applies at the merge is in place, with its tests: the empty
    states' "Log a film" opening the dialog with the date on, the spec's dialog steps passing in place of step 4, and
    its step 1 and the Watchlist page's removal test pressing the card's Watchlist toggle; or Home's "Recently watched"
    listing five viewings as R35 says, its "See all" opening `/library/history`, and a visitor with only viewings not
    seeing the nothing-saved set. (R34, R35)

### Proven in the browser before review

13. **The pages by hand.** On the branch's local stack, signed in, with at least 300 watched films and a group of more
    than 100 changes on one day: the Watchlist page and Films view show 7 columns at 1280px and 2 at 390px; scrolling
    deep into the Films view, opening a film and following "Back to Library" returns to the same rows, as does "Back to
    History" from below an expanded group, while reloading the film page before following "Back to Library" opens
    the Films view at the top, and so does a second return from a film opened there without scrolling; and the bar
    fits at 1024px with the longest link set it can show.
14. **Changes from cards,** if the card controls are on `main` at the merge: liking a film from a card adds a "Liked"
    row to History, and marking 5 films watched from cards on one day shows one "Marked 5 films watched" row.

### Measured before review

15. **History's timing.** On the local stack, for an account holding 2,500 viewings, 500 reviews saved without a date
    and 10,000 recorded changes over 400 days, at least a quarter of them reversals or rating changes an entry write
    made, and some days with more than 100 films of one kind: the history route at `page_size` 100 answers page 1 and
    page 30 (rows 2,901 to 3,000) each in under 300 ms, timed at the backend, with the measurement recorded before
    review.

## 10. Open Questions

None.
