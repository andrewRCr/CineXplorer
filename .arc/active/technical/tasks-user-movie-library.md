# Task List: User Movie Library

**PRD:** `prd-user-movie-library.md`
**Created:** 2026-11-14
**Branch:** `technical/user-movie-library`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Give signed-in visitors their films on two pages: the Watchlist page as a grid of cards, and the Library,
with a Films view of every film they have seen and History, the timeline of their viewings, reviews and changes; the
bar's links read Explore, Watchlist and Library, a film opened from these pages leads back to the place the visitor
left, and a signed-in smoke spec covers the journey.

**Design:** `draft-user-movie-library.md`, which revises the shared draft `draft-user-movie-uis.md`. The shared draft
stays in the backlog until whichever of the card controls and the Library archives last, which moves it into its
archive folder.

**Waits on:** the like rule and the record of changes, a separate backend change (ADR-051). Phase 5 builds History's
change rows once it is on `main`, and this work's pull request waits for it (R34b); Phases 1 to 4 do not.

## Scope

### Will Do

- Rename the bar's catalog link Explore and add Library beside Watchlist, in the bar and the drawer, with `/library`
  and `/library/history` under one "Library" heading and navigation
- Build the Library's own grid: columns of at least 150px, measured rows under the window virtualizer, and numbered
  pages of 100 through one infinite query under `libraryKey`, refetched after every save
- Rebuild `/watchlist` on the grid with six sorts in the address, and build the Films view with the Liked and Rated
  filters, ten sorts and the "Last watched" line
- Build History's read (`GET /user-movie-data/history`, and `GET /user-movie-data/history/changes` once the record of
  changes is on `main`) and its view: month headings, viewings, reviews, change rows and groups
- Lead films opened from the three pages back to them, restoring the scroll position over the row heights measured
  before
- Store two fixture films in the development seed and add the signed-in smoke spec `library.spec.ts`, with the
  accessibility baseline's new routes
- Write ADR-050 with the Status notes on ADR-044, ADR-039 and ADR-027, and update the documents R33 names
- Merge `main` before the pull request and apply what it holds (R34, R35), and measure History's read on a heavy
  account

### Won't Do

- The like rule, the record of changes, the date-added rule for combined filters, or record saves' time zone (the
  backend change this work waits on)
- The card controls, the log dialog or the Log button, beyond what R34c adds if the dialog is on `main`
- Editing entries from History, showing removals, Next Up, drag-and-drop, Favorites, or counts on any page
- The catalog's grids: their fixed card width, data layer and phone layout
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** The bar's Explore, Watchlist and Library lead to their pages

_Mode:_ `slice` — closes on a film added from a catalog card, found on the Watchlist page through the bar's Watchlist
link, and removed there, in the browser.

- [x] **1.1 The bar reads Explore, Watchlist and Library, each current on its own addresses — R1, R31, R33**

    **Goal:** A signed-in visitor sees Explore, Watchlist and Library in the bar and the drawer and a signed-out
    visitor Explore alone, each link marked current exactly on its addresses, and the bar fits at 1024px.

    - [x] **1.1.a Cover the navigation links and their current state**
        - Updated the bar, drawer and layout cases for Explore and Library, including exact Library addresses,
          an unknown child and encoded paths. The coupled navigation cases ran together: 25 failed against the old
          links, then all 37 cases passed with the new links.
    - [x] **1.1.b Change the shared navigation links**
        - Added the two Library route constants, retained the catalog current-link rule, and matched Library and
          History exactly. Updated the styling strategy's top-bar example.
    - [x] **1.1.c Cover the links and the full-width bar in the browser**
        - Updated sign-in and phone navigation assertions; the 1024px check covers every bar control's bounds,
          adjacent overlap and document overflow. A temporary 900px search minimum made it fail at 1482px against
          the 1024px viewport; restoring the flexible search passed. Both specs passed (7 tests).
        - Frontend lint, type-check after typegen, and the strategy document's markdown lint passed.

- [x] **1.2 `/library` and `/library/history` show the Library under one heading, and `/watchlist` its own — R2, R3,
  R4**

    **Goal:** The three addresses render only for a signed-in visitor, any other `/library/…` address shows Not Found,
    and both Library views sit under one "Library" `h1` with a "Library" navigation whose current link is marked and
    carries no query.

    - [x] **1.2.a Cover addresses, sign-in return, headings and navigation**
        - App route tests cover the unknown child, the sign-in round trip with `liked=true`, Watchlist at its own
          address, and both Library views with one heading and query-free current links. Watchlist's existing
          heading assertions now expect Watchlist. The cases ran red before implementation; the unknown-child case
          also failed against a temporary wildcard child and passed once it was removed.
        - App tests use jsdom's real location so browser history updates are visible to BrowserRouter.
    - [x] **1.2.b Add the protected Library routes and page**
        - Added the shared heading, themed Library navigation and child outlet; the two child regions await their
          later tasks. Watchlist's heading now reads Watchlist.
        - All 15 App/Watchlist tests, frontend lint, type-check and formatting passed.

### **Phase 2:** The watchlist shows as a grid of cards, sorted by the address

_Exit criterion:_ `library.spec.ts`'s setup and steps 1, 2 and 4 pass against the browsable stack with `/watchlist`
scanned, and `sign-in.spec.ts` and `phone-width.spec.ts` pass with their Explore and Library assertions.

- [x] **2.1 The Library's grid draws films in columns of at least 150px and pages by 100 — R5, R6, R7, R8**

    **Goal:** Any list of the visitor's films draws as a virtualized grid of as many 150px-or-wider columns as fit,
    loads the next 100 as the visitor nears the end only while no fetch runs and another page exists, shows each film
    once, and refetches every loaded page after a save.

    - [x] **2.1.a Cover column widths**
        - Covered phone and desktop counts, every integer width from 150px to 2,560px, and widths below the minimum;
          both cases failed against a one-column stand-in before the fluid calculation passed.
    - [x] **2.1.b Cover the grid through MSW and the real virtualizer**
        - Eight cases cover page parameters, measured 300px rows against a 449px estimate, placeholders, empty and
          final-page termination, retries for first/later pages and failed save refetches, repeats, and every loaded
          page refreshing after a save. Narrow breaks proved existing mechanisms fail their cases before restoration;
          removing the fetch guard specifically read page 3 during a held refetch.
    - [x] **2.1.c Build the read and the grid**
        - Added typed collection filters and sorts, the Library infinite-query factory, fluid columns, measured
          window rows, guarded paging, per-page errors and Retry, and a fixed footer slot when provided.
        - Retry distinguishes a failed next page from a failed refetch, so saves can recover at the final page.
        - Eight focused cases, 402 tests affected by the query/service changes, frontend lint, type-check and
          formatting passed. Astra's bounded advice led to the reproduced refetch-Retry correction before completion.

- [x] **2.2 The Watchlist page lists the watchlist in the grid, sorted by the address — R9, R10, R11**

    **Goal:** `/watchlist` reads the watchlist's films into the grid with a "Sort by" dropdown whose six options each
    send their pair, the address carries only a sort that differs from the default and is corrected in place when the
    page doesn't offer it, and an empty watchlist offers Explore films.

    - [x] **2.2.a Cover the Watchlist grid and six sorts through the network**
        - Cases cover each field/direction pair and address, invalid values falling back with replacement, multiple
          choices replacing history, empty Explore link, first-page Retry and card removal after a save.
        - Thirteen Watchlist cases failed against the plain-text page, then passed; the App cases also pass (21 total).
    - [x] **2.2.b Build the shared sort hook, labelled select and Watchlist page**
        - Sort changes replace history, omit defaults and preserve unrelated parameters. The select uses the browse
          trigger styles and a visible Sort by label. The page adds no horizontal padding and reads through LibraryGrid.
        - Frontend lint, type-check and formatting pass. The signed-in browser journey also passes on this page.

- [x] **2.3 The development seed stores two fixture films — R29**

    **Goal:** Every seeded development database holds the two fixture cards, created when missing and left as they are
    when present, with no user data, and a save of either never asks TMDB.

    - [x] **2.3.a Cover fixture creation, repeat seeding and saving without TMDB**
        - The coupled seed cases first failed on missing cards and unexpected TMDB reads. They cover both IDs,
          titles, dates, absent posters, preserving an edited card and creating no user data.
    - [x] **2.3.b Seed the fixture cards**
        - The command's single fixture table feeds `get_or_create`, preserving existing cards and seeding no records.
        - All 305 core tests, pinned Ruff lint/format and core Pyright passed. Completed independently while the
          grid's frontend checks ran; no backend API contract changed.

- [x] **2.4 The signed-in spec adds a film from a card, finds it on the Watchlist page and removes it — R30, R32,
  R33**

    **Goal:** `library.spec.ts` starts from the same state on every local run, skips on staging, and proves a
    watchlist add and removal through the bar with `/watchlist` scanned, and the documents that count the smoke specs
    count it.

    - [x] **2.4.a Extend the accessibility baseline**
        - Added the three personal routes and the Watchlist card button-name baseline with the catalog's reason.
    - [x] **2.4.b Add the local signed-in journey**
        - Signs in directly toward Explore, resets both seeded films' records with Bearer and CSRF headers, marks the
          second watched, adds the first through a catalog card, finds it through Watchlist and removes it there.
        - Own catalog fixtures use the seed's titles; the spec skips staging and scans sign-in, Explore and Watchlist.
          Reconstructing the text-only Watchlist failed on its missing removal control; restoring the grid passed.
    - [x] **2.4.c Describe the new smoke spec**
        - Updated the technical overview, quick reference, testing strategy and quality-gates strategy for eight
          specs, seven journeys and staging's skipped saved-film journey. Markdown lint, spec lint and type-check pass.

- [x] **2.5 Check the watchlist journey in the browser**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - Refreshed the browsable stack and seeded fixtures. Library, sign-in and phone-width specs all passed together
      (8 tests), including the Watchlist scan and the signed-in 1024px bar check.

### **Phase 3:** The Films view lists every film seen, and films lead back to where they were opened

_Mode:_ `slice` — closes on the Library's two views listing the visitor's films and timeline, each returning a film's
back link to the place the visitor left.

- [x] **3.1 The Films view lists watched films, with Liked and Rated filters, ten sorts and the date line — R12, R13,
  R14, R15, R16, R30, R32**

    **Goal:** `/library` reads the visitor's watched films into the grid with the toggles and the sort in the address,
    each surviving the other's change, a "Last watched" line under each film with a dated viewing, and an empty view
    that tells "Your Library is empty" from "No films match" by its filters alone.

    - [x] **3.1.a Cover the Films view through MSW**
        - Seventeen cases first failed against the empty region, then passed for all ten sorts, filter combinations
          and query preservation, calendar dates and fixed date slots, distinct empty states, invalid sorts and Retry.
        - A further source/query case failed with MovieCard's source omitted and passed restored (18 cases total).
    - [x] **3.1.b Build the Films view**
        - The protected Library index uses the shared grid and labelled select, selected subtle filter buttons,
          query replacement and a calendar-date line. Every cell reserves the same footer height.
    - [x] **3.1.c Extend the signed-in journey**
        - The spec finds the second seeded film through Library and scans the view; the baseline includes its card
          buttons. Replacing the index with its old empty region failed the new assertion; restoring it passed.
        - Frontend lint, type-check and formatting passed; the shared App and Watchlist tests also pass.

- [x] **3.2 Films opened from the Watchlist page and the Films view lead back there — R27**

    **Goal:** A card on either page opens its film with `from=watchlist` or `from=library` and the page's query, and
    the film page's back link reads "Back to Watchlist" or "Back to Library" and opens that page with that query and
    its scroll signal; `from=history` reads "Back to History" and opens `/library/history`.

    - [x] **3.2.a Cover personal sources and return links**
        - The three new back-link cases failed against the old catalog-only routes, then passed with their correct
          labels, addresses and restore signals. Existing catalog and custom-label cases remain unchanged (31 total).
        - Watchlist and Films card-link cases failed with their source omitted and passed restored. The Films case
          landed with its page; Watchlist's lands here. All 22 App/Watchlist and 18 Films cases pass.
    - [x] **3.2.b Extend the return destinations**
        - Added Watchlist, Library and History destinations and default labels while preserving explicit labels and
          catalog fallback behavior. Both grids already pass their sources from their page tasks.
        - Frontend lint, type-check and formatting passed.

- [x] **3.3 Returning to the Watchlist page or the Films view restores the scroll over the rows measured before — R10,
  R12, R28**

    **Goal:** The back link's signal returns the visitor to the saved position with the virtualizer given back the row
    heights it measured, only while the page holds both a position saved since the app loaded and those heights; any
    other arrival, a reload, a change of user, and any sort or filter change start at the top.

    - [x] **3.3.a Cover the hook and real-page returns**
        - Three new hook cases failed first and pass for restore denial, the returned key and save notifications
          outside the restore guard; existing catalog cases remain unchanged (19 total).
        - Shared `LibraryScrollReturn.test.tsx` renders each real page and its back link: deep return with measured
          heights, fresh arrival, a reload and a second return without scrolling, user change, sort/filter reset and
          history replacement. Native scroll coordinates and row ResizeObserver entries model the browser boundary.
        - Narrow reconstructions failed when measurements were omitted, fresh arrivals received old heights, the
          saved-since-load condition was removed, or filter reset was removed; the intended implementation passes.
    - [x] **3.3.b Keep measured heights and gate restoration**
        - Added app-memory measurements and saved-position keys, cleared by `beginUserChange`. The grid captures
          snapshots on permitted saves and unmount; only a signalled return with both kinds of memory receives them.
        - Extended the existing hook with optional restore/save callbacks and its key; collection parameters now
          share the existing deterministic key formatter without changing catalog keys.
        - All 499 affected frontend tests, frontend lint, type-check and formatting passed. Generic fixture records
          now consistently satisfy the watched, liked and rated filters used by these reads.
    - [x] **3.3.c Preserve catalog navigation**
        - The browsable stack's Back to Results and browse specs both passed (2 tests).

### **Phase 4:** History lists the visitor's viewings and reviews

_Exit criterion:_ `library.spec.ts` finds the second fixture film in the Films view and opens and scans `/library` and
`/library/history`, and criterion 9's tests show a film opened deep in the Films view, and from History, returning to
the same rows.

- [x] **4.1 History's read returns viewings and reviews in one stable order — R22, R24**

    **Goal:** `GET /user-movie-data/history` pages the signed-in user's viewings and undated reviews, days newest first
    and the most recently made first within a day, in a fixed number of queries, with nothing of any other user's.

    - [x] **4.1.a Cover private timeline reads**
        - Cases cover viewing/review fields and days, ownership, creation-time/kind/ID tie-breaking, paging and
          defaults, empty/past-end pages, authentication, bounds and declared OpenAPI statuses.
        - Four behavior cases failed before the route existed. Narrow public/unbounded and non-eager-loading
          reconstructions then failed the security, bounds and query-cost cases; all twelve cases pass restored.
        - Both 10-entry and 500-entry collections take exactly two service queries for a page.
    - [x] **4.1.b Build the read, contract and route**
        - Added the dedicated history service with one annotated queryset and related stored cards, inherited paging
          bounds and an entry-row schema alias ready for a further row kind. The thin route precedes the ID route.
        - Regenerated OpenAPI and frontend types, including 401 and 422. All 331 user-movie tests, pinned Ruff
          lint/format, Python checking in an isolated environment with locked dependencies, and frontend type-check
          pass. The host's shared tools remain unchanged.

- [ ] **4.2 History lists viewings and reviews under month headings, loading as the visitor scrolls — R17, R18, R19,
  R25, R26, R30, R33**

    **Goal:** `/library/history` shows each viewing and undated review as its own read-only row under month headings,
    each day's date once, in a measured virtualized list that pages by 100, refreshes after any save, and shows its
    loading, failed and empty states.

    - [ ] **4.2.a Write the cases in `pages/user/__tests__/LibraryHistory.test.tsx`**
        - MSW answers `/user-movie-data/history` per page with rows shaped as the regenerated types say
        - Month headings as `h2` ("November 2026"); a day's date ("Nov 14") once, beside its first row
        - A viewing shows a decorative small poster (empty alt, or the placeholder), the title and release year,
          `RatingStars` at `sm` when rated, `RewatchIcon` when a rewatch, and the review's first two lines as plain
          text; a review shows a "Review" tag in place of the rewatch icon
        - Each title links to its film with `from=history`
        - It reads page 1 with `page_size: 100`; the next page as the visitor nears the end, only while no fetch runs
          and another page exists; an entry repeated across pages drawn once
        - Placeholder rows while the first page loads; "Couldn't load your history." with Retry; a later page's
          failure shows Retry in its place
        - Empty: "Your history is empty" with "Explore films" to `/browse`
        - A record save through `useUserMovieState`, and an entry write through `useMovieEntries`, refetch History
        - Expect tests to FAIL initially

    - [ ] **4.2.b Build the read and the view**
        - `getHistory` in `services/userMovieDataService.ts` beside `getActivity`, and `historyPagesQuery` in
          `lib/queries.ts` keyed `[...libraryKey, "history"]`, numbered pages as 2.1.c's
        - `pages/user/LibraryHistory.tsx`: pages joined without duplicate rows, keyed by what each row shows (an
          entry's ID; 5.4 adds a `changes` row's day and field), month headings keyed by month, all under one
          `useWindowVirtualizer` with `measureElement` and `getItemKey` by those keys
        - The row component draws posters from TMDB's smaller poster sizes as `MovieCard` builds its URL, the quiet
          text with semantic tokens, and the review clamped to two lines
        - Tests should now PASS

    - [ ] **4.2.c Extend `library.spec.ts` and the pagination strategy**
        - Step 3's next part: open History from the Library's navigation and `scanPage`; finding the "Marked watched"
          change waits for 5.4
        - `strategy-pagination.md` names History's read among the database-served lists in `PaginatedResponse`
        - Run the spec against the browsable stack

- [ ] **4.3 A film opened from History returns to the same rows — R27, R28**

    **Goal:** Following "Back to History" restores History's position with its rows' measured heights keyed by what
    each row shows, so a row keeps its height whatever loads before it, under the same condition as the grid pages.

    - [ ] **4.3.a Write the cases in `LibraryHistory.test.tsx`**
        - A return on the back link's signal restores the position and the rows' measured heights (Implementation
          Notes, "The virtualizer under jsdom"), and a row keeps its measured height whatever loads before it; arriving
          without it starts at the top; a return after a simulated reload, or after a change of user, starts at the top
        - Expect tests to FAIL initially

    - [ ] **4.3.b Use the scroll memory in History**
        - `LibraryHistory` calls `useScrollPersistence` with source `history`, building `canRestore` and `onSave` from
          the memory as 3.3.b's grid does; its virtualizer's `takeSnapshot()` is kept under `scrollStorageKey` and
          handed back as `initialMeasurementsCache`
        - Tests should now PASS

- [ ] **4.4 ADR-050 records the Library, and the documents say what it changes — R33**

    **Goal:** ADR-050 reads `Proposed` with the Library's decisions, ADR-044's and ADR-039's Status sections name what
    it supersedes, and the README describes the pages as they are.

    - [ ] **4.4.a Write ADR-050**
        - `.arc/reference/adr/adr-050-…md` from `adr-template.md`, following `strategy-adr-methodology.md`, Status
          `Proposed`
        - It records what R33's first bullet lists: the two pages and their addresses with no redirect; the bar's
          Explore, Watchlist and Library; the Films and History views; the Library's own grid; History as the
          Library's timeline and its read (row kinds, the selection of shown changes, the grouping by day and field,
          the changes route) beside the unchanged list of dated entries; and the signed-in smoke spec
        - It supersedes ADR-044 in part (the one personal link reading Watchlist and current only on `/watchlist`, the
          catalog's link reading Films, the sentence that Films can later open a Films hub, and its list of the
          smoke tier's specs) and ADR-039 in part (watchlists outside the smoke tier)

    - [ ] **4.4.b Update the Status sections and the README**
        - ADR-044's and ADR-039's Status say what ADR-050 supersedes, keeping every supersession already there;
          ADR-046 and ADR-048, on other branches, also supersede parts of ADR-044, and a merge keeps all of them
        - `README.md`'s "Built" list says Explore for Films and names the Watchlist page and the Library with its
          History; its "In development" list no longer names the library
        - Markdown lint the changed files

- [ ] **4.5 Check the Library's views and their returns**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - Run `e2e/library.spec.ts`, `e2e/back-to-results.spec.ts` and `e2e/browse.spec.ts` against the browsable stack
    - Run `LibraryGrid.test.tsx`, `LibraryFilms.test.tsx`, `Watchlist.test.tsx`, `LibraryHistory.test.tsx` and
      `BackToCollectionLink.test.tsx`

### **Phase 5:** History shows the visitor's changes, with `main` merged

_Mode:_ `slice` — closes on History showing the visitor's own changes, grouped by day and kind, on a branch carrying
`main` with the record of changes.

_Exit criterion:_ `library.spec.ts` passes in full, finding the second fixture film's "Marked watched" change in
History, with each case of R34 that holds applied.

- [ ] **5.1 Merge `main` and confirm the record of changes meets the PRD's contract — R34**

    **Goal:** The branch carries `main` with the like rule and the record of changes, and what landed matches § 6's
    expected contract, or the PRD is amended before anything is built on it.

    - [ ] **5.1.a Merge `main` into the branch** (the Owner approves the merge)
        - If the record of changes is not on `main` yet, stop: this phase waits for it (R34b)

    - [ ] **5.1.b Check the landed record of changes against § 6, and record its names here**
        - One row per change a save makes to a film's watchlist, watched, liked or current rating, deleted with the
          film's record; each holding the record, the field, the new value (on or off; the rating's value, or
          cleared), whether an entry write made it, the made time every row of one save shares, and the day in the
          visitor's time zone (a record save without `time_zone` records its UTC day)
        - Turn-ons only from the visitor's own record saves; an entry write recording its rating changes and a like
          it removes, never its other turn-ons; reversals whatever caused them, except a watchlist removal a rule
          makes; an Undo deleting the field's latest row when it recorded the change being undone
        - The like rule, and `added` sorting by the first of `watchlist`, `watched` and `liked` the query filters
        - Record the model, fields and manager names here for 5.2 to 5.4; a mismatch with § 6 is a design question:
          stop and amend the PRD

    - [ ] **5.1.c Apply what the merge changes everywhere**
        - Regenerate the API types if the schema changed (R34a); where `main`'s Library read or back link changed,
          keep its form (R34e)
        - Run the frontend tests and the `user_movie_data` and `core` backend tests

- [ ] **5.2 History's read selects the shown changes and groups them by day and field — R20, R22, R23, R24**

    **Goal:** The history route adds one `changes` row per day and field holding the films with a shown change that
    day, counted and sampled as R24 says, ordered with the entries and paged without ever splitting a group, in a
    fixed number of queries.

    - [ ] **5.2.a Write the change cases in `test_history_api.py`**
        - Recorded changes are seeded directly through the model 5.1.b names, each save with its own made time (two
          saves sharing one read as a single save)
        - A change row only for a record save's turn-on; never for an entry write's rating change, or a reversal
        - A change hidden when the film's next save reverses it in its own field, and shown when a save of another
          field came between; re-liking after an unlike shows the new like only; an entry write's like removal hides
          the like before it; a save holding only an entry write's rating change does not count as the next save;
          deleting a reversal shows the change it hid
        - A film once per kind per day, with its latest shown change; for ratings, that change's value
        - 4 films of one kind on a day form one row with `count` 4 and its `films` most recent first; 9 films sample 8
        - Changes sit on their stored day, not their made time's UTC date; within a day a kind's row sits where its
          latest change does among the day's rows; ties order viewings, reviews, then changes by field (`watchlist`,
          `watched`, `liked`, `rating`)
        - A group is never split across two pages; another user's changes are never returned
        - The 10-row and 500-row query counts stay equal with changes among the rows
        - Expect tests to FAIL initially

    - [ ] **5.2.b Build the selection, the grouping and the union**
        - Shown changes: the record saves' turn-ons whose film's next save (the earliest later made time among that
          film's rows, leaving out entry writes' rating changes) holds no reversal in the same field; per film, day and
          field, the latest of them
        - Grouped rows (day, field, count, latest made time) joined to 4.1's entry rows in one ordered, paged query
          with one count; each page's samples (up to 8 films per group, most recent first) in one more query
        - `HistoryChangeFilmSchema` (`tmdb_id`, `title`, `release_date`, `poster_path`, `rating`) and the
          `kind: "changes"` member (`day`, `field`, `count`, `films`) of `HistoryRowSchema`
        - Regenerate the API types
        - Tests should now PASS

- [ ] **5.3 A group's films page from their own route — R21, R24**

    **Goal:** `GET /user-movie-data/history/changes` returns one day and field's films with a shown change, most recent
    first and each once, 100 at a time, and an empty page for a day and field with none.

    - [ ] **5.3.a Write the cases in `test_history_api.py`**
        - Paging a group of 250 films; most recent first; each film once; an empty page for a day and field with no
          shown change; another user's changes never returned
        - 401 with no user; 422 for a missing or malformed `day`, an unknown `field` and `page_size` 101; the
          committed OpenAPI schema lists 401 and 422 for both routes
        - Expect tests to FAIL initially

    - [ ] **5.3.b Build the route on 5.2's selection**
        - `GET /history/changes`, declared before `/{tmdb_id}`, with `day` and `field` required
        - Regenerate the API types
        - Tests should now PASS

- [ ] **5.4 History draws change rows and groups, expanded in memory — R20, R21, R25, R28, R30**

    **Goal:** A day's changes of one kind show as up to 3 quiet rows or one group with a strip of up to 8 posters and
    "Show all {n}", which expands in place 100 films at a time and stays expanded across a return, and the spec finds
    the setup's "Marked watched" change.

    - [ ] **5.4.a Write the change cases in `LibraryHistory.test.tsx`**
        - 3 changes of a kind on a day show as 3 quiet rows (muted text, tiny posters) reading R20's labels, "Rated"
          with the stars; 4 show as one group, "Marked 4 films watched" (each kind's label per R20), a strip of up to 8
          posters and "Show all 4"
        - "Show all {n}" reads `/history/changes` with the row's `day` and `field`, page 1 and `page_size: 100`, and
          lists the films inside the row as change rows without dates; "Show more" reads the next page while more
          remain; "Show fewer" collapses it; a failed read shows Retry in its place
        - A group stays expanded after leaving for a film and returning; a change of user collapses every group
        - A `changes` row repeated across pages is drawn once, by its day and field
        - The films in rows and groups link with `from=history`
        - Expect tests to FAIL initially

    - [ ] **5.4.b Build the change rows**
        - One virtualized row per `changes` row, holding its single rows or its group with the films it has expanded,
          keyed by day and field
        - The group's films through an infinite query under `libraryKey`, numbered pages as 2.1.c's
        - Expanded groups kept in the Library scroll memory (3.3.b), cleared with it
        - Tests should now PASS

    - [ ] **5.4.c Finish step 3 of `library.spec.ts`**
        - Find the second fixture film's "Marked watched" change: its own row, or, when the account marked more than 3
          films watched that day, among the films of that day's group after "Show all {n}"; `scanPage`

- [ ] **5.5 Apply what `main` holds of the neighbouring work — R34, R35**

    **Goal:** Each case of R34c and R34d that holds at the merge is in place with its tests, and a case that doesn't is
    recorded as such here.

    - [ ] **5.5.a If `main` has the card controls' log dialog (R34c)**
        - The Films view's and History's empty states add "Log a film", calling `useEntryDialog().open({ dateOn: true,
          returnFocus })` with the current view's link in the Library navigation; tests that it opens the dialog on its
          picker with the date on, and that focus lands on that link once the empty state has gone
        - In `library.spec.ts`, the dialog's steps replace step 4, as R34c lists them; step 1 and `Watchlist.test.tsx`'s
          removal from a card press the card's Watchlist toggle
        - The spec serves the first fixture film's detail from its own `page.route`, titled as the seed titles it (R29),
          since the dialog's steps open its page and `fixtures.ts` would answer it as "Movie 2000000001"; it scans that
          page
        - `phone-width.spec.ts`'s 1024px step adds Log to the bar items it checks (R1); the controls' task list adds it
          only when the controls merge second
        - ADR-050 records the dialog's steps; no `button-name` baseline entry stays for `/watchlist` or `/library` if
          the cards name their icon buttons
        - The controls' own task list applies the same case if it merges second; only one of the two lands it

    - [ ] **5.5.b If `main`'s signed-in Home lacks "Recently watched" (R34d)**

        **Note:** Planned against `technical/landing-page`'s Home (`pages/home/SignedInHome.tsx`, `WatchlistSection.tsx`,
        `WhatsOn.tsx`, `services/homeRequests.ts`); after 5.1's merge, check it against `main`'s Home and correct these
        subtasks in place before building. If Home already has the section, nothing changes.

        - [ ] **5.5.b.1 Write the cases in `pages/home/__tests__/Home.test.tsx` and `RecentlyWatched.test.tsx`**
            - Signed-in Home shows a section headed "Recently watched" after the watchlist's section and before what's
              on
            - It reads `/user-movie-data/entries` with `page: 1` and `page_size: 5` and lists those viewings newest
              first, one per viewing (a film seen twice appears twice), each with its date, `RewatchIcon` when a
              rewatch, a small poster, the title and release year, and `RatingStars` at `sm`; each links to its film
              with `from=home`
            - "See all" opens `/library/history`; the watchlist section's "See all" still opens `/watchlist`
            - Home's first render waits for this read with the watchlist's; a visitor with no watchlist films and some
              viewings sees the section, not the nothing-saved set; a visitor with neither sees the nothing-saved set; a
              visitor with no viewings sees no section
            - A failed read shows the section's failed state with Retry, which reads again, as the watchlist's section
              does
            - Expect tests to FAIL initially

        - [ ] **5.5.b.2 Build the section**
            - `getActivity` and `activityQuery` take an optional `ReadOptions`, as the landing page's `getUserMovies`
              and `libraryQuery` do; `homeActivityQuery()` beside `homeWatchlistQuery()` reads page 1 with `page_size`
              5 and `homeReadOptions`
            - `SignedInHome` chooses its set once both reads settle: nothing-saved only when the watchlist is empty and
              there are no viewings, an error in either counting as having something, as the watchlist's does today
            - `RecentlyWatched` in `pages/home/`, between `WatchlistSection` and `WhatsOn`, on the shared `FilmSection`
              (`components/movie/sections/`) as `WatchlistSection` is: it gives the `h2`, "See all", the failed state
              ("Couldn't load these films." with Retry) and no section when the read returns none
            - Each viewing's row is keyed by its entry's ID, since one film can appear twice
            - Tests should now PASS

    - [ ] **5.5.c Record here which cases held, and run the tests and specs they touched**

- [ ] **5.6 History's read meets its timing on a heavy account — criterion 15**

    **Goal:** The history route answers page 1 and page 30 at `page_size` 100 each in under 300 ms at the backend for
    criterion 15's account, with the measurement recorded here before review.

    - Build an account of its own, so the spec's development account stays as it is, through `manage.py shell` on the
      worktree's stack with a script that is not committed but kept outside the repository until the work unit
      archives, since verification reuses the account and may run in a later session
    - The account holds 2,500 viewings, 500 undated reviews and 10,000 recorded changes over 400 days, at least a
      quarter of them reversals or entry writes' rating changes, and some days with more than 100 films of one kind, on
      cards with IDs above TMDB's range; and, for criterion 13's browser proof in verification, at least 300 watched
      films, at least 20 films on the watchlist, a password, and a verified primary `EmailAddress`, as `seed_dev_data`
      gives the development account (an unverified address can't sign in)
    - Time each page inside the backend container through the route, signed in as the account, after one warm-up
      request: five runs per page, each recorded here; criterion 15 holds when the slowest is under 300 ms

- [ ] **5.7 Check the full journey**

    **Goal:** The segment's exit criterion is shown on this branch after `main`'s merge, with what ran and the result
    recorded here.

    - Run `e2e/library.spec.ts`, `e2e/sign-in.spec.ts`, `e2e/phone-width.spec.ts`, `e2e/back-to-results.spec.ts`,
      `e2e/browse.spec.ts` and `e2e/movie-detail.spec.ts` against the browsable stack

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; ADR-050 set
  `Accepted` before merge; criteria 13 and 14 proven in the browser and criterion 15's measurement recorded before
  review; after any later merge of `main`, R34 rechecked and the API types regenerated if its schema changed)

## Implementation Notes

- **Signed in, in tests.** Store a token from `tests/helpers/auth.ts` and call `authHandlers()`, then render under
  `AuthContextProvider`, as `Watchlist.test.tsx` does. The default `userMoviesHandler` reads only `watchlist` and
  always answers one page, and no default handler serves History's routes, so each test answers with its own handlers
  and asserts the parameters each read sends.
- **The virtualizer under jsdom.** `VirtualizedMovieGrid.test.tsx` mocks `useWindowVirtualizer`; these tests use the
  real one. A probe during planning showed it, under jsdom, measuring rows from a stubbed `offsetHeight` on elements
  carrying `data-index` (`tests/setup.ts`' `ResizeObserver` is a no-op, so `measureElement` falls back to
  `offsetHeight`): with a 100px estimate and 300px rows, row 2 started at 600px. Remounted with `takeSnapshot()`'s
  items as `initialMeasurementsCache` and nothing measurable, row 2 still started at 600px. So 2.1, 3.3 and 4.3 assert
  row positions (each row's offset) against measured sizes that differ from the estimate.
- **Page padding.** `AppLayout` pads `px={{ base: 2, md: 6, lg: 8 }}`, which R5's column counts assume. Today's
  `Watchlist.tsx` adds `p={8}`; a page that adds horizontal padding changes the counts.
- **Calendar dates.** `last_logged_on`, `watched_on`, `made_on` and a change's `day` are calendar dates: format them
  without passing through `Date`'s UTC parse, which shifts a date a day back west of UTC.
- **The record of changes.** Nothing on `main` names it yet, so Phase 5 is written in § 6's terms; 5.1.b records the
  landed names, and 5.2 to 5.4 use them.
- **Merges of `main`.** A merge before 5.1, the Owner approving each, keeps the branch's tests green and applies only
  the API types and what R34e asks; 5.1 and 5.5 apply the rest. Overlaps known today:
    - `technical/landing-page` changes `BackToCollectionLink.tsx` (`from=home` returning to `/`, the label read from
      `from`), `getUserMovies` (a `ReadOptions` argument), `MovieCard.tsx` (its footer only while signed in),
      `axe-baseline.ts` (a `/` entry), `App.tsx`, `routes.ts`, `queries.ts`, `sign-in.spec.ts` and
      `phone-width.spec.ts` (the heading they wait for after signing in, "Popular in theaters" in place of "Welcome to
      CineXplorer"; `library.spec.ts` waits for neither, 2.4.b)
    - `technical/user-movie-controls` changes `queries.ts` and the card itself; its R41c puts the log dialog's steps
      in `library.spec.ts` if the Library merges first
- **Tests that pass on arrival** are shown failing against a narrow break of the behavior, then passing restored, and
  the completion notes say so.
- **E2E runs** use the worktree's browsable stack (`node scripts/worktree.mjs browse`, `SITE_PORT` from
  `infrastructure/.env`) through `arc-offload`, as QUICK-REFERENCE shows. `browse` reruns `seed_dev_data`, so an
  existing worktree database gains the fixture films.

## Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven in the browser before review** is checked by hand on
the branch's local stack, and **Measured before review** on it, before the code review.

### Implemented

- [ ] 1. **The smoke spec.** `library.spec.ts` passes against a worktree's browsable stack: the film added from a card
  is found through the bar's Watchlist link and removed (under R34c, logged off the watchlist); the Films view and
  History show the film the setup marked watched, with History's "Marked watched" change; and the scans of `/watchlist`,
  `/library` and `/library/history` pass. Run against staging, it is skipped. (R29, R30, R32)
- [ ] 2. **The bar.** Component tests show Explore, Watchlist and Library signed in, and Explore alone signed out, in
  the bar and the drawer, each current exactly on its addresses (R1). `phone-width.spec.ts`'s 1024px step finds every
  bar item fully visible, none overlapping another, and no sideways scroll. `sign-in.spec.ts` and `phone-width.spec.ts`
  pass with their Explore and Library assertions. (R1, R31)
- [ ] 3. **Addresses and headings.** Tests show `/library/anything` shows Not Found; a signed-out visitor at
  `/library?liked=true` is sent to sign in and returned there; `/watchlist` shows the Watchlist page with no redirect.
  The Library's `h1` reads "Library" on both views and the Watchlist page's reads "Watchlist"; the "Library" navigation
  landmark holds Films and History, the current one marked as the current page, and neither link carries a query string.
  (R2 to R4)
- [ ] 4. **The Watchlist page.** Component tests show it reads `watchlist: true` with `page_size: 100`; each sort option
  sends its pair and sets the address as R10 says; an unknown sort falls back with the address corrected; the empty
  state; and a removal from a card refetching the loaded pages and dropping the film. (R7 to R11)
- [ ] 5. **The Films view.** Component tests show it reads `watched: true`; each toggle exposes `aria-pressed`, adds its
  filter, joins the address and survives a sort change; each sort option's pair; the "Last watched" line on a film with
  a dated viewing only, with the line's height kept on the others; the empty state with no filter on; and "No films
  match" whenever a filter is on and nothing matches, with Clear filters keeping the sort. (R12 to R16)
- [ ] 6. **The grid.** Tests show the column count is 2 for a 390px screen's content width and 7 for a 1280px screen's,
  with no column under 150px at any width; a next page is not requested while the list is fetching, nor once the last
  page read is not below `total_pages`, an empty list's included; a film repeated across two pages is drawn once;
  placeholder cards while the first page loads; each page's failure message with Retry; and Retry beneath the grid when
  a later page fails. (R5 to R7)
- [ ] 7. **History's read.** API tests with stored films, entries and recorded changes show: each row kind with its day
  and fields; days newest first, and within a day the most recently made first; an undated review on its `made_on` day;
  a change row only for a record save's turn-on, never for an entry write's rating change or a reversal; a change hidden
  when the film's next save reverses it, and shown when a save of another field came between; re-liking after an unlike
  showing the new like only; a save holding only an entry write's rating change not counting as the next save; deleting
  a reversal showing the change it hid; a film once per kind per day, with the day's last rating; 4 films of one kind on
  a day forming one group with `count` 4 and its films most recent first, and 9 films sampling 8; a group never split
  across two pages; the changes route paging a group's films and answering an empty page for a day and field with none;
  another user's entries and changes never returned; 401 with no user; 422 for a page size over 100, an unknown field or
  a malformed day; and a page taking the same number of queries with 10 rows as with 500. The committed OpenAPI schema
  lists these statuses for both routes. (R22 to R24)
- [ ] 8. **History in the frontend.** Component tests show month headings; a day's date once; a viewing's stars, rewatch
  icon and review lines; a review's "Review" tag; 3 changes of a kind drawn as single rows and 4 as a group with "Show
  all 4"; expanding reading the changes route, "Show more" reading its next page, and "Show fewer"; a group still
  expanded after leaving for a film and returning, and collapsed after a change of user; rows joined without duplicates;
  the loading, failed and empty states; and a record save refetching History. (R17 to R21, R25, R26)
- [ ] 9. **Back links.** Tests show a film opened from each page carries R27's `from` and query, the film page's back
  link reads and opens R27's label and address with its scroll signal, and returning on that signal restores the saved
  position and gives the page's virtualizer back the row heights it measured, keyed as R28 says, while arriving without
  it starts at the top with none; a return on the signal to a page holding no heights, or no position saved since the
  app loaded, starts at the top, as does a second return after a reload with no scrolling between; and choosing a sort,
  or turning a filter on or off, starts at the top and replaces the history entry. (R10, R12, R27, R28)
- [ ] 10. **The seed.** The seed's tests show the two fixture cards created in a database without them, left unchanged
  on a second run, and no user data created for them. (R29)
- [ ] 11. **The documents.** ADR-050 reads `Accepted` with its date; ADR-044's, ADR-039's and ADR-027's Status sections
  say what R33 says; the documents R33 names read as it says, and a search for the smoke specs' file names and counts
  finds every living site naming the new spec. (R33)
- [ ] 12. **The neighbouring work.** Whichever of R34c and R34d applies at the merge is in place, with its tests: the
  empty states' "Log a film" opening the dialog with the date on, the spec's dialog steps passing in place of step 4,
  and its step 1 and the Watchlist page's removal test pressing the card's Watchlist toggle; or Home's "Recently
  watched" listing five viewings as R35 says, its "See all" opening `/library/history`, and a visitor with only viewings
  not seeing the nothing-saved set. (R34, R35)

### Proven in the browser before review

- [ ] 13. **The pages by hand.** On the branch's local stack, signed in, with at least 300 watched films and a group of
  more than 100 changes on one day: the Watchlist page and Films view show 7 columns at 1280px and 2 at 390px; scrolling
  deep into the Films view, opening a film and following "Back to Library" returns to the same rows, as does "Back to
  History" from below an expanded group, while reloading the film page before following "Back to Library" opens the
  Films view at the top, and so does a second return from a film opened there without scrolling; and the bar fits at
  1024px with the longest link set it can show.
- [ ] 14. **Changes from cards,** if the card controls are on `main` at the merge: liking a film from a card adds a
  "Liked" row to History, and marking 5 films watched from cards on one day shows one "Marked 5 films watched" row.

### Measured before review

- [ ] 15. **History's timing.** On the local stack, for an account holding 2,500 viewings, 500 reviews saved without a
  date and 10,000 recorded changes over 400 days, at least a quarter of them reversals or rating changes an entry write
  made, and some days with more than 100 films of one kind: the history route at `page_size` 100 answers page 1 and page
  30 (rows 2,901 to 3,000) each in under 300 ms, timed at the backend, with the measurement recorded before review.
