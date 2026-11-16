# Draft: User Movie Library

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-14

**Purpose:** Give signed-in visitors two pages for their own films, a Watchlist and a Library, with History as the
Library's timeline, and design the rule change and the record of changes that History's other rows need. This
revises the core user-movie UIs' draft (`draft-user-movie-uis.md`, on `main` since the tracking model merged at
`3a66bf47`). These parts of it change:

- decision 2's date-added rule for combined filters (decision 7 here);
- decision 3's rules: a like marks a film watched, and un-marking Watched clears the like (decision 5). Like's new
  effects, marking a film watched and taking it off the watchlist with the watchlist's Undo, reach the controls' card
  and panel;
- decision 5, one Library page with five tabs (decisions 1 to 4 and 8);
- decision 12's smoke-spec steps (decision 10);
- the Boundary fit's scan grouping of `/library/:tab` and its baseline entry, now `/watchlist` and `/library`
  (decision 11);
- Signed-in Home's links into the Activity tab and through the `/watchlist` redirect (decision 11), and its sentence
  that the Library is the only page where a visitor sorts, filters or reorders their films: the Watchlist page does
  too (decision 2);
- the Won't Do lines that left out an activity feed beyond viewings, and favorites (decisions 4, 6 and 12).

Any other passage of it that assumes the five-tab Library follows decisions 1 to 4: the Watchlist, Watched, Liked,
Rated and Activity tabs become the Watchlist page, the Films view, its Liked and Rated filters, and History;
`/library/{tab}` becomes `/library` and `/library/history`; and the bar's one Library link becomes its Watchlist and
Library links. A sweep on 2026-11-14 found such passages in decision 1 (the queue's order, read by the Watchlist tab),
decision 2 (the Rated tab, and the cross-film entry list "for Activity", which History replaces with its own read),
decision 15 (Activity), the Open note (the queue ordered on the Watchlist tab), the success signal (the four tabs) and
the Boundary fit (the Watched tab's date line, and the bar's one Library link).

Beyond the shared draft, History's quiet rows bring the ROADMAP's Cut Journal into launch scope (decision 4). The
Library unit builds the pages, History and the spec; a short backend unit, right after the tracking model, builds
decisions 5 to 7 under ADR-051.

---

## Problem / Motivation

Today a signed-in visitor's films have one page. `/watchlist` (`Watchlist`, `frontend/src/pages/user/Watchlist.tsx`)
lists the watchlist's titles as plain text from `libraryQuery`'s first 100 records, and the bar's personal link reads
"Watchlist" (`MainNavLinks`), which ADR-044 holds as the Library link's stand-in "until a Library page exists". The
tracking model (ADR-047, merged to `main` at `3a66bf47`) adds what a Library needs: watched, liked,
the watchlist and a current rating on each film's record, each list's join time, and dated entries for viewings and
reviews.

The shared draft's decision 5 put all of it on one Library page with five tabs: Watchlist, Watched, Liked, Rated and
Activity. Seen whole, the five overlap:

- **Liked and Rated describe films, not places.** A rating already marks a film watched (ADR-047's rules,
  `apply_record_save`), so every rated film is a watched film; liked films are mostly watched films too.
- **"Watched" and "Activity" collide.** A tab named Watched reads as "what I watched recently", which is what Activity
  shows; the tab actually lists every film ever seen.
- **"Activity" reads as a social feed,** which the META-PRD (§ 3) puts out of scope, and suggests events beyond
  viewings.
- **"Library" names a container,** so the films-seen tab still needs a word of its own.

The META-PRD already holds a cleaner model (§ 2, § 4): a **Watchlist** with drag-and-drop and a "Next Up" queue of its
top films, and a **Library** of the films a visitor has watched, with a Favorites subset, watch history and personal
ratings; marking a film watched is "adding it to their library".

A timeline of viewings alone also misses the other things a visitor does with films: liking one, rating it from a
card, adding it to the watchlist. The record can't show those over time. It keeps only each list's latest join time
(`watchlist_added_at`, `watched_added_at`, `liked_added_at`), which a re-join overwrites and a removal leaves in place,
and no time at all for a rating.

## Alternatives

**How the visitor's films are organized.**

- **One Library with five tabs** (the shared draft's decision 5): the overlaps above.
- **"Library" as an umbrella over Watchlist · Seen · History:** one bar link, as ADR-044 planned, but "Library" still
  names a container, and a tab called Seen beside a card control called Watched splits the vocabulary.
- **A new umbrella name:** none holds up. "Films" names what all three destinations hold, "All films" is the
  catalog's first release window, and "Profile" the account page.
- **Two pages, the META-PRD's (chosen):** "Library" means the films you've seen, so each word means one thing, and
  `/watchlist` stays a real page.

**The catalog's bar label.** ADR-044 named it Films, as the entry to the whole film domain. With a Watchlist and a
Library beside it, every bar destination holds films, so the word no longer says what is particular to the catalog,
and the Library's own Films view would repeat it. **Explore (chosen)** names what only the catalog offers: every film,
to discover through filters and sorting. It echoes the app's name, CineXplorer, and still fits when the planned Films
hub takes the link. The catalog's address stays `/browse`. Browse matches that address and the "Browse by" bar
(`QuickBrowseBar`), but Explore fits both the filterable catalog and the hub better. Keeping Films in both places
costs nothing and each link's landmark tells them apart, but a visitor scanning the page still sees one word leading
two places.

**The timeline's name.** **History (chosen)** is the META-PRD's own word ("watch history") and reads as ordered by
time, so Home's "Recently watched" leads naturally into it. Journal sits close to Letterboxd's "Diary"; Viewings is
exact but clinical; Activity carries the social-feed sense; and Log collides with the bar's Log button.

**Liked as a filter of films seen.** Under ADR-047 a like doesn't mark a film watched, and the controls' cards offer
Like on every film, so a film liked but never marked watched would appear on no page. **Liking marks a film watched
(chosen)**, as rating does: a like means the visitor liked the film. Leaving the rule as it is would hide those films.

**History's other events.**

- **Rows derived from the stored join times:** rows would move or be wrong. A re-join overwrites the earlier time; a
  removal leaves its time in place, so a direct removal can't be told from one logging made; ratings have no time; and
  a film marked watched by hand can't be told from one a viewing marked.
- **Viewings only:** what the shared draft designed, but each change not recorded is lost for good, since a record of
  changes can capture only from the day it ships.
- **A record of changes (chosen):** one row per change the visitor makes, written with the save.

**Bulk marking.** New members often mark dozens or hundreds of films watched in a sitting, or over a few days.
**Grouping by day and kind (chosen)** follows History's day-by-day layout and needs no special mode; a fixed time window
is harder to predict, and a setup mode that records nothing would lose real history.

**Refreshing after a save.** A save can add a film to a list, remove one or reorder one, and the endpoint pages by
offset. **Refetching every loaded page (chosen)** stays correct. Keeping only a few pages loaded makes scrolling back
up refetch earlier pages, which needs loading backwards; patching the cached pages in place leaves membership and order
stale until the list is reopened.

## Decisions

Settled by the Owner, 2026-11-14, after the Library Study design reference.

1. **Two pages: the Watchlist and the Library.**
   - The signed-in bar reads Explore · Watchlist · Library, and the phone drawer carries the same links; signed out,
     it reads Explore. Explore takes Films' place as the catalog's link, current on the same three catalog URLs; the
     catalog's address stays `/browse`. Watchlist is the current link on `/watchlist`; Library on `/library` and
     `/library/history`. The bar fits at 1024px, its narrowest full width.
   - **URLs:** `/watchlist`, `/library` (the films view) and `/library/history`. There is no redirect. Any other
     `/library/…` path shows Not Found.
   - The Library's two views are links in a navigation landmark named "Library", reading Films and History, like the
     catalog's release windows (ADR-044). With the catalog's link reading Explore, "Films" names this view alone. No
     page or tab shows a count.
   - The Library unit owns both pages. Next Up's row goes above the Watchlist grid and Favorites' above the Library
     grid (decision 12).

   ADR disposition: ADR-050, new, delivered by the Library unit. It records the two pages and their URLs, the bar's two
   personal links, the catalog's link reading Explore, and the Library's own grid (decision 8). It supersedes ADR-044
   in part: the bar's one Library link, reading Watchlist until a Library page exists and current only on
   `/watchlist`; the catalog's link reading Films; and its sentence that Films can later open a Films hub without
   changing the bar. A future Films hub opens from Explore, and its page title is its own unit's to decide. ADR-046
   (the landing page) supersedes other parts of ADR-044, so the two don't overlap. If ADR-046 is accepted before its
   sentences that decision 11 lists change, ADR-050 supersedes those sentences in part.

2. **The Watchlist page** lists the films on the watchlist in a grid.
   - **Sorts:** date added (when the film joined the watchlist; the default, newest first), title, and release date,
     each both ways. One dropdown pairs field and direction ("Date added: newest"), like the catalog's sort
     (`SortDropdown`).
   - **The URL** carries `sort` and `direction` only when they differ from the default. An unknown value falls back to
     the default.
   - Next Up's unit adds "Your order" as a sort (the shared draft's decision 1).
   - A film already watched, kept as a rewatch queue, shows the controls' watched mark on its card once that card is on
     `main` (decision 11).
   - **Empty:** "Your watchlist is empty", with Explore films.

   ADR disposition: `none`, a tactical choice.

3. **The Library's Films view** lists every watched film once.
   - **Filters:** Liked and Rated, as toggle buttons (`aria-pressed`). They combine, travel in the URL (`liked`,
     `rated`) and stay when the sort changes.
   - **Sorts:** date added (when the film was marked watched; the default, newest first), last watched (the latest dated
     viewing; films never logged come last both ways), your rating (unrated films last), title, and release date, each
     both ways. One dropdown pairs field and direction ("Last watched: newest"), as on the Watchlist page.
   - **The URL** carries `sort` and `direction` only when they differ from the default, as decision 2's does. An
     unknown value falls back to the default.
   - A film with dated viewings shows "Last watched" and that date beneath its card, in the grid cell, outside
     `MovieCard`.
   - **Empty:** "Your Library is empty", with Log a film once the log dialog exists, and Explore films. A filter with no
     matches says "No films match", with Clear filters.
   - It reads `GET /user-movie-data/movies` with `watched` and the filter flags (`get_library`).

   ADR disposition: covered by ADR-050 for the view. The labels, filter controls and empty-state copy are `none`, a
   tactical choice.

4. **History, the Library's timeline,** is one list, newest first, under month headings, with each day's date shown
   once beside its first row.
   - **A viewing** (a dated entry) is its own row: the date, a small poster, the title and year, the entry's rating
     (`RatingStars`), the rewatch icon (`RewatchIcon`) and the review's first two lines. It links to the film's page.
     Viewings never collapse.
   - **A review saved without a date** gets its own row on the day it was written (`UserMovieEntry.made_on`), tagged
     "Review".
   - **Quiet rows,** shorter, muted and with a tiny poster, show the visitor's own changes outside logging, the rows
     decision 6 lets History show:
     - added to the watchlist;
     - marked watched;
     - liked;
     - rated, with the stars.

     A change that a viewing or a rule caused never gets a row of its own; the viewing, or the action the visitor took,
     stands alone. Counted over the rows History shows (decision 6), a film appears once per kind within a day, and a
     film re-rated that day shows the last of those ratings.
   - **Bulk changes:** more than 3 films with quiet rows of one kind on one day collapse into one row ("Marked 87 films
     watched", "Added 12 films to your watchlist"), with a strip of small posters and "Show all 87", which expands in
     place.
   - **Order:** viewings sit on their `watched_on` date, reviews on `made_on`, and recorded changes on the day stored
     with them (decision 6), so no read needs a time zone. Within a day, the most recently made comes first. A day's
     changes of one kind sit together where the latest of them does, whether collapsed or drawn as up to 3 rows.
   - **The read:** `GET /user-movie-data/history` returns numbered pages of up to 100 rows, newest first, in History's
     own row type. Each row carries its kind (viewing, review or change group) and its day: a viewing's `watched_on`, a
     review's `made_on`, or a group's stored day.
     - **A viewing** and **a review** also carry the entry's fields and the film's title, release date and poster, as
       an activity row does (`ActivityEntrySchema`).
     - **A change group** carries its field, its count of films and up to 8 of them, each rated film with its last
       shown rating that day. The server groups every day's changes by field, so a page boundary never splits a
       group, and the client draws a group of 3 or fewer films as single rows.
     - **Expanding a group** reads `GET /user-movie-data/history/changes` for that day and field, in numbered pages of
       100.
     - `GET /user-movie-data/entries` (`get_activity`) and its row type stay as they are, dated viewings only, for
       Home's "Recently watched".
   - **Refreshing:** History's reads sit under the Library's query key (`libraryKey`), which every record save and entry
     write invalidates (decision 9), so a change made from a card shows on the next read.
   - **Paging:** numbered pages of 100 rows, in virtualized rows measured as they draw. Pages are joined without
     duplicate rows, an entry by its ID and a group by its day and field, since one film can rightly appear more than
     once.
   - **Rows are read-only.** Entries are edited on the film's page.
   - **Built here** (Owner, 2026-11-14): the quiet rows, the grouping and reviews saved without a date. Reviews need
     only the History read, since they are entries already. The quiet rows need the backend unit's record of changes
     on `main`, which this unit merges before building them.
   - **Launch scope:** this brings the ROADMAP's Cut Journal (the features plan's § 12, a timeline of watchlist
     additions, viewings, ratings and likes) into launch scope as History. With Favorites committed (decision 12), the
     ROADMAP's Cut line "Journal and Favorites" goes, and the features plan's status line, its summary's Journal and
     Favorites items, § 12 and Favorites' sections follow.

   ADR disposition: ADR-050 records History as the Library's timeline and its read: the history endpoint, its row
   kinds and its grouping by day and field, beside the unchanged dated-only entry list. The threshold of 3, the sample
   of 8, the row styles and the month headings are `none`, a tactical choice.

5. **Liking marks a film watched.** This is built by the backend unit.
   - **The rules** (ADR-047's rules layer, `apply_record_save`):
     - A record save that turns Liked on for an unwatched film, leaving `user_watched` out, marks it watched.
     - The existing rule for a film that changes from unwatched to watched without a date then takes it off the
       watchlist, unless the save keeps it there. The watchlist's Undo is offered, as the shared draft's decision 10
       does for every watchlist change.
     - An entry saved with Liked on already marks an unwatched film watched.
   - **Un-marking Watched** (a save with `user_watched: false` and no `user_liked`) also turns Liked off. The watched
     lock is unchanged: it covers the current rating and entries only.
   - **Contradictions:** a save supplying `user_liked: true` with `user_watched: false` answers 400, like ADR-047's
     other self-contradictory saves.
   - **The database holds it:** liked implies watched, a constraint beside `user_movie_rating_watched`.
   - **Existing records:** the migration marks each liked, unwatched record watched, taking `watched_added_at` from
     `liked_added_at`, and leaves its watchlist as it is. Its reverse leaves them watched, as the tracking model's
     migration (`0003_movie_entries`, `restore_record_history`) leaves the rated films it converted.

   ADR disposition: ADR-051, new, delivered by the backend unit. It supersedes ADR-047 in part: which facts mark a film
   watched.

6. **A record of changes.** This is built by the backend unit.
   - **What's recorded:** one private row per change to the watchlist, watched, liked or the rating. Each row holds:
     - the film's record;
     - the field;
     - its new value (on or off; the rating's value, or cleared);
     - whether an entry write made it;
     - when the change was made, shared by the rows one save writes;
     - the day it happened in the visitor's time zone. Record saves gain an optional `time_zone`, filled from the
       browser by the save layer as entry writes are and checked as theirs is (an unknown zone answers 422), so the
       day is fixed when written, as ADR-047 fixes an entry's `made_on`. A save without one, from a tab opened before
       the deploy or a direct API call, records its day in UTC.
   - **Where it's written:** in the same transaction, under the record's row lock. For record saves, that is where the
     save compares the stored record with the result: `UserMovieDataService.save` keeps the previous values, which
     `stamp_list_joins` uses for the list flags, and the comparison extends to the rating. For entry writes, it is
     where `UserMovieEntryService.create` and `edit` set Liked and the current rating. A save that changes nothing
     records nothing.
   - **Which changes are recorded:**
     - **Turn-ons** (added to the watchlist, marked watched, liked, rated or re-rated) only when the visitor's own
       record save supplied them. A rule's turn-on folds into the action taken: rating an unwatched film records
       "rated", not also "watched". An entry write's turn-ons are part of the viewing, except its changes to the
       current rating: those are recorded as rows History never shows, so a rating's latest row always holds the
       current rating (Undo, below).
     - **Reversals** (removed, unwatched, unliked, rating cleared) whatever caused them, including a like that an entry
       write or un-marking Watched turns off. An Undo is the exception for the fields it changes (Undo, below).
     - **No watchlist removal a rule makes is recorded:** neither the one when a film becomes watched (marked, rated,
       liked or given an undated review) nor the one when a viewing is logged on or after the day the film joined the
       watchlist, a rewatch included. So "Added to watchlist" survives seeing or logging the film.
   - **What History shows:** the turn-ons recorded from the visitor's own record saves, never reversals or an entry
     write's rating rows. One save's rows count as one step, whatever order they're written in. A row is hidden when the
     film's next save that records a change, not counting an entry write's rating rows, reverses it in its own field:
     an addition by its removal, a mark by its unmark, a like by its unlike, a rating by its clearing. That is judged
     against that next save only. Later changes never alter it; only Undo, by deleting a row, changes which save comes
     next. Re-liking adds a new row and leaves the hidden one hidden, and a save that changes anything else in between
     keeps the row as history. History's read applies this selection, built by the Library unit, and ADR-050 records it
     (Owner, 2026-11-14); the backend unit records the rows and deletes them on Undo.
   - **Undo** (ADR-047's Undo mark, `undo: true`, unchanged). The controls' toasts send it with the fields their save
     changed, and when Watched is among them, also the watchlist and Liked at the values that save returned (the
     controls' R33). For each field the Undo save changes, Undo deletes that field's latest row when that row recorded
     the change being undone, meaning its value differs from the one Undo restores. A field it supplies at its current
     value is left alone. Undo records nothing for the fields it changes; a reversal its rules cause in another field
     is recorded as any reversal is.
     - Undoing an addition deletes the "added" row.
     - Undoing a removal deletes the removal, so the earlier row shows again.
     - Undoing a removal that a rule made deletes nothing, since none was recorded.
     - Undoing a logging that changed the rating deletes the logging's hidden rating row, the rating's latest.
   - **An older Undo:** the controls keep a toast's Undo working after later saves of the film, limited to the fields
     its own save changed, plus the watchlist and Liked when Watched is among them (R33). When a later save changed the
     same field, that field's latest row isn't the change the Undo meant, so History can keep or lose the wrong quiet
     row. That edge is accepted, as the controls accept the rules acting on such an Undo.
   - **A re-rating** records a new "rated" row, and earlier ones stay.
   - **No backfill:** the stored join times hold only the latest of each, and before launch only test data exists.
   - **Privacy:** rows belong to the film's record. They are deleted with it (`DELETE /user-movie-data/{tmdb_id}`) and
     with the account, and only the owner's History reads them. The privacy policy must name the record of changes
     before it is published, as the tracking model requires for dated entries and join times.

   ADR disposition: ADR-051 records the record of changes: what it holds, including the day stored at write, what
   writes it, how reversals and Undo erase, the older-Undo edge it accepts, and why there is no backfill.

7. **"Date added" with combined filters.** When several of watchlist, watched and liked are filtered, the `added` sort
   uses the first of them, in that order, rather than the record's creation time. ADR-047 records the creation time
   for that case (`get_library`'s `added_field`). This is built by the backend unit. Until it lands, the Library's
   Liked filter sorts "date added" by when the film first got any mark.

   ADR disposition: ADR-051, superseding ADR-047 in part (the date-added rule for combined filters).

8. **The Library's own grid** draws `MovieCard` for the Watchlist page and the Films view.
   - **Columns** are fluid, at least 150px wide: 2 on a 390px phone and 7 at 1280px. The controls' card actions need at
     least 138px (the shared draft's decision 6). The catalog grids keep their fixed 194px card (`CARD_WIDTH`,
     `gridConstants`).
   - **Rows** are virtualized with `@tanstack/react-virtual`'s window virtualizer and measured as they draw.
   - **Paging:** pages load in numbered pages of 100, the endpoint's maximum, as the visitor nears the end.
     - A next page waits until no fetch is running, as `VirtualizedMovieGrid` does, so it can't cancel a refetch.
     - Pages are joined with duplicate films dropped.
   - History pages the same way, joining its pages without duplicate rows rather than films (decision 4).

   ADR disposition: covered by ADR-050.

9. **Refreshing after a save.** Every record save and entry write invalidates the Library's reads (`libraryKey`, in
   `useUserMovieState` and `useMovieEntries`), and a loaded list refetches each page it holds, in order. This is
   accepted.
   - **Cost:** about 3 queries per page. A list scrolled through 2,000 films costs 20 requests per save, and reads
     have no throttle.
   - While a refetch runs, scrolling loads no further page.
   - **Revisit** when a profile shows the cost. Bounding it later needs only the one paging hook.
   - Next Up's drag-and-drop will need to patch these cached pages.

   ADR disposition: `none`, a tactical choice with its revisit trigger recorded here.

10. **One signed-in smoke spec.** This changes the shared draft's decision 12 where the pages changed.
    - **Fixtures:** it runs on its own fixture films, with IDs above TMDB's range. The development seed
      (`seed_dev_data`, which stores no films today) gains their cards, so a save never asks TMDB for them. It signs in
      as the dev account and first deletes its fixture records (`DELETE /user-movie-data/{tmdb_id}`). Its setup also
      marks a second fixture film watched through the same API, sending a time zone as the save layer does, so the
      Films view, and History's quiet row, have content when scanned; the tabs' contents are proven by component tests.
    - **Steps:**
      1. Add a fixture film to the watchlist from a card.
      2. Follow the bar's Watchlist link and find the film there.
      3. Open the Library's Films and History views, scanning each page for accessibility.
      4. Remove the film.

      The log dialog's steps join from whichever of the controls and the Library merges second (decision 11).
    - Staging skips it, as it skips sign-up.
    - `sign-in.spec.ts` and `phone-width.spec.ts` keep asserting the Watchlist link, add Library, and assert Explore
      where they assert Films. The NavBar, NavDrawer and BaseLayout component tests follow, as do the component-styling
      strategy's top-bar example and the README's list of what's built ("Films (All films, In theaters and Coming
      soon)").
    - It updates every document that names or counts the smoke specs: ADR-027's Status, the testing strategy,
      TECHNICAL-OVERVIEW, QUICK-REFERENCE and the quality-gates strategy.

    ADR disposition: ADR-050. It supersedes ADR-044 in part (its list of smoke specs) and ADR-039 in part (its
    watchlist exclusion), and closes ADR-027's deferred watchlist test. ADR-046 supersedes ADR-039 for another part
    (Back to Results), with no overlap.

11. **Meeting points.** Each depends on what `main` holds when a unit merges `main` before its pull request.
    - **The controls:** the Library's and History's empty states open the log dialog, and the smoke spec gains the
      dialog's steps; whichever unit merges second adds them. The steps combine both units' checks: log the fixture
      film from a card with a date, a rating and a review; find the entry on the film's page; and find the film in
      Films and History and off the watchlist. The controls' PRD (R41c) names only the entry on the film's page, so
      this is relayed to the controls once this draft is approved. If the Library merges first, its accessibility scans
      find today's unnamed card buttons. The Library then adds `button-name` baseline entries (`axeBaseline`) for
      `/watchlist` and `/library`, which the controls remove once Watched and Liked have names. The Watchlist's watched
      mark (decision 2), and the success signal's steps taken from a card, arrive with the controls' card.
    - **The landing page:** Home's "Recently watched" (the five newest dated viewings) and its "See all" into
      `/library/history`; whichever merges second adds them. Home's watchlist "See all" keeps opening `/watchlist`.
      The landing page's PRD, task list and ADR-046 assume the shared draft's Library. Relayed through the project's
      planning once this draft is approved, every passage that does follows these replacements:
      - the Activity tab (`/library/activity`) becomes History (`/library/history`), which lists every viewing among
        the visitor's other changes;
      - the Watchlist tab (`/library/watchlist`) becomes the Watchlist page (`/watchlist`), with no redirect, and the
        bar's Watchlist link keeps its name; the queue is ordered there, and "Reorder" opens it;
      - there are no `/library/{tab}` tabs;
      - the Library holds the films the visitor has seen, and the Watchlist and Library pages are where they sort,
        filter or reorder; Home's watchlist leads with the Watchlist page's first film;
      - the bar's Films link reads Explore (decision 1), and the Films hub the landing page plans as its own work opens
        from Explore.

      A sweep on 2026-11-14 found such passages in the PRD's R15, R18, R20, R30b and R30d, § 5, § 6 (the Library page
      and the watchlist queue), decisions 7 and 8, and § 9's criteria 16 and 22; in the task list's tasks 5.4.a and
      5.4.c, the notes that name the Activity tab, and its copy of those criteria; and in ADR-046's paragraph on
      signed-in Home.
    - **The backend unit:** History's quiet rows need its record of changes on `main` (decision 4).
    - **The backend unit and the controls:** the backend unit adds `time_zone` to every record save in
      `saveMutationOptions` (decision 6), which the controls rewrite (their R37). Whichever of the two merges second
      keeps it there. A save-layer test asserts it on every record save, so a merge that drops it fails rather than
      quietly filing changes on their UTC day, and the watchlist tests' expected request bodies gain it. This too is
      relayed to the controls once this draft is approved.

    ADR disposition: `none`; it orders delivery and decides nothing about the system.

12. **Next Up and Favorites are reserved, not built here.** Both are designed and built in Next Up's unit. Favorites is
    committed (Owner, 2026-11-14), at about 1 to 1.5 days in that unit.
    - **Next Up:** the head of the watchlist's own order, in a row above the Watchlist grid.
    - **Favorites:** a short, hand-ordered pick of films seen, in a row above the Library grid. The Owner's direction
      for that design:
      - capped at 6 (one row) or 12, no more;
      - added only on the Library page's row and reordered by drag-and-drop, with no control on cards;
      - favoriting a watched film that isn't liked also likes it, and un-favoriting keeps the like;
      - still open: whether un-liking a favorite drops it.

    ADR disposition: `none`; it orders delivery and decides nothing about the system. Whether Favorites needs an ADR is
    Next Up's unit's to decide.

### Success signal

The signed-in smoke spec passes locally: a fixture film added to the watchlist from a card is found through the bar's
Watchlist link, and the Library's Films and History views, holding the fixture film the spec marked watched, pass
their accessibility scans. Once the log dialog exists, logging that film puts it in Films and History and takes it off
the watchlist. Once the controls' card exists, liking a film from a card adds a quiet "Liked" row to History, and
marking 5 films watched on one day shows one collapsed row.

### Boundary fit

Read 2026-11-14 against the size marks: a spec of about 1,500 lines, more than six phases, or about 10,000 changed
lines.

- **The Library unit** (decisions 1 to 4 and 8 to 11) stays one unit. The figures below are forecasts, inferred from
  the shared draft's sizing:
    - The pages, the grid and the spec: about 2.25 to 2.75 days and 2,700 to 3,300 changed lines.
    - History's quiet rows, grouping and reviews (built here, Owner 2026-11-14): about 1.5 to 2 days and 1,500 to
      2,000 lines more, since merging viewings, reviews and grouped changes into one paged list is the costly part.
    - With Home's "Recently watched", about 0.25 day more.
    - In all, about 3.75 to 5 days and 4,200 to 5,600 changed lines, under every mark.
- **The backend unit** (decisions 5 to 7, ADR-051, with record saves gaining `time_zone`) runs about 1 to 1.5 days. It
  lands on its own: it follows the tracking model through the same rules layer, lock and migration review, and both UI
  units need the server to apply its rule.
- **Favorites** goes to Next Up's unit.

## Unknowns and Assumptions

- **The backend unit merges before this unit builds History's quiet rows** (assumed). Until it does, those tasks wait;
  the rest of the unit doesn't depend on it.
- **The merged History query** pages one ordered union of entries and grouped changes by offset, with a count. That
  is assumed cheap at launch scale; the PRD names what it measures.
- **The shared draft stays as written** on `main`; this draft's Purpose names where the design departs from it, by
  passage and by rule.

## Scope Boundary (Won't Do)

- **The controls' work:** card controls, the film page's panel, the log dialog and the Log button.
- **Editing or deleting entries,** which happens on the film's page.
- **Next Up, drag-and-drop and Favorites** (Next Up's unit), and search suggestions.
- **Showing removals,** backfilling the record of changes, and importing from other services.
- **Sharing** ratings, reviews, entries or History, and any social feed.
- **Counts** on pages or tabs.
- **The catalog grids'** data layer and phone layout.
- **Signed-in Home** beyond decision 11's meeting point.
