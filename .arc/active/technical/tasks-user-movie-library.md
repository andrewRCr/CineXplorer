# Task List: User Movie Library

**PRD:** `prd-user-movie-library.md`
**Created:** 2026-11-14
**Branch:** `technical/user-movie-library`
**Base Branch:** `main`
**Status:** Complete
**Completed:** 2026-11-15

## Overview

**Purpose:** Give signed-in visitors their films on two pages: the Watchlist page as a grid of cards, and the Library,
with a Films view of every film they have seen and History, the timeline of their viewings, reviews and changes; the
bar's links read Explore, Watchlist and Library, a film opened from these pages leads back to the place the visitor
left, and a signed-in smoke spec covers the journey.

**Design:** `draft-user-movie-library.md`, which revises the shared draft `draft-user-movie-uis.md`. The shared draft
stays in the backlog until whichever of the card controls and the Library archives last, which moves it into its
archive folder.

**Integration:** the like rule and record of changes (ADR-051) landed on `main` and joined this branch in merge
`516150cb`; History reads that contract. The same merge supplied Home, whose Recently watched section was added here.

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
        - Added the shared heading, themed Library navigation and child outlet. Watchlist's heading reads Watchlist.
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
          second watched and queued, adds the first through a catalog card, finds it through Watchlist and removes it
          there. Removal is scoped to its fixture card; the second remains, so no empty-account assumption is needed.
        - Own catalog fixtures use the seed's titles; the spec skips staging and scans sign-in, Explore and Watchlist.
          Reconstructing the text-only Watchlist failed on its missing removal control; restoring the grid passed.
        - Review fix: queuing the second fixture made the old global removal locator fail with two matches. The scoped
          locator and retained-film assertion pass without clearing or modifying unrelated account films.
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
        - Review fix: the card and footer now share a flex column so the footer contributes to row measurement.
          A real-browser bounds assertion failed with 28px overflow before the fix and passes afterward; related
          component tests and frontend gates pass.

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

- [x] **4.2 History lists viewings and reviews under month headings, loading as the visitor scrolls — R17, R18, R19,
  R25, R26, R30, R33**

    **Goal:** `/library/history` shows each viewing and undated review as its own read-only row under month headings,
    each day's date once, in a measured virtualized list that pages by 100, refreshes after any save, and shows its
    loading, failed and empty states.

    - [x] **4.2.a Cover the timeline and its reads**
        - Seven coupled cases cover month/day labels, viewing/review fields and plain clamped text, title links,
          loading/empty states, first/later Retry, numbered paging, deduplication, end-of-list and fetch exclusion,
          and refresh after record and entry writes. All failed against the empty view, then passed implemented.
        - An additional later-error placement assertion failed with Retry above the rows and passes beneath them.
    - [x] **4.2.b Build the read and the view**
        - Added the typed History service/query under the Library key, stable entry/month keys and measured timeline,
          with small decorative posters, stars, rewatch marks and review tags. Semantic styling uses shared components.
        - Related frontend tests: 446 passed across 29 files; lint and type-check pass. The run emits existing act
          warnings in authentication/entry tests; no failures or unrelated test edits.
    - [x] **4.2.c Extend the browser journey and pagination strategy**
        - The signed-in journey opens History, waits for its successful private read and scans the view. Replacing
          the route with its old placeholder made that read assertion fail; restored, the browser spec passes.
        - The pagination strategy names the private History list; Markdown lint passes.

- [x] **4.3 A film opened from History returns to the same rows — R27, R28**

    **Goal:** Following "Back to History" restores History's position with its rows' measured heights keyed by what
    each row shows, so a row keeps its height whatever loads before it, under the same condition as the grid pages.

    - [x] **4.3.a Cover measured History returns**
        - Five cases use the real History view, back link and virtualizer: deep return, a logged viewing inserting an
          entry above the measured rows, fresh arrival, simulated reload (including a second return without scrolling)
          and a change of user. The shared geometry fixture preserves native viewport coordinates and scroll events.
        - The deep-return case failed before persistence; narrow index-key, ungated-memory, uncleared-user and
          unconditional-offset reconstructions failed the corresponding cases. All twelve History cases pass restored.
    - [x] **4.3.b Share measured scroll restoration**
        - Extracted the grid's memory/persistence composition into `useMeasuredLibrary`, now used by grid and History.
          Both keep fresh snapshots under their position key and restore only with the signal, heights and saved flag.
        - All 69 related cases pass, including both grid pages' measured returns. Frontend lint/type-check and all
          three Library, browse and catalog-return browser specs pass. New test queries were corrected for lint.
        - Review fix: only an initial-load error resets personal views to the top. Grid and History cases hold a
          failing next page after measurements settle and prove the failure preserves that position before Retry;
          both failed at zero before the fix and pass afterward. Related tests and frontend/browser gates pass.

- [x] **4.4 ADR-050 records the Library, and the documents say what it changes — R33**

    **Goal:** ADR-050 reads `Proposed` with the Library's decisions, ADR-044's and ADR-039's Status sections name what
    it supersedes, and the README describes the pages as they are.

    - [x] **4.4.a Write ADR-050**
        - Added the Proposed record from the template: separate destinations, Explore and the personal navigation,
          fluid measured grid, the Library timeline and private reads beside the unchanged dated-entry list, shown
          changes and grouped expansion, and the deterministic signed-in smoke journey.
        - The record distinguishes the current viewing/review read from the later recorded-change integration.
    - [x] **4.4.b Update the Status sections and the README**
        - Added the precise partial supersessions to ADR-044 and ADR-039, keeping existing statuses and supersessions.
          Added R33's dated realization note to ADR-027's Status without changing its decision.
        - README names Explore, Watchlist and the Library's Films/History views among built features; Library is no
          longer in the development list. Changed ADRs and task documentation pass Markdown lint; README is excluded
          by repository lint configuration and was checked manually.

- [x] **4.5 Check the Library's views and their returns**

    **Goal:** The segment's exit criterion is shown on this branch, with what ran and the result recorded here.

    - After the review corrections, all three browser specs passed: `library.spec.ts`, `back-to-results.spec.ts` and
      `browse.spec.ts`, against this branch's browsable stack. The Library spec checks real footer bounds and removes
      only its first fixture while the second stays queued.
    - All 92 cases pass across `LibraryGrid.test.tsx`, `LibraryScrollReturn.test.tsx`, `LibraryFilms.test.tsx`,
      `Watchlist.test.tsx`, `LibraryHistory.test.tsx` and `BackToCollectionLink.test.tsx`.
    - Frontend lint/type-check and changed Markdown passed.

### **Phase 5:** History shows the visitor's changes, with `main` merged

_Mode:_ `slice` — closes on History showing the visitor's own changes, grouped by day and kind, on a branch carrying
`main` with the record of changes.

_Exit criterion:_ `library.spec.ts` passes in full, finding the second fixture film's "Marked watched" change in
History, with each case of R34 that holds applied.

- [x] **5.1 Merge `main` and confirm the record of changes meets the PRD's contract — R34**

    **Goal:** The branch carries `main` with the like rule and the record of changes, and what landed matches § 6's
    expected contract, or the PRD is amended before anything is built on it.

    - [x] **5.1.a Merge the shipped backend and Home**
        - Owner explicitly approved merging `main`; integrated `1f7416f5`, containing the recorded-change and landing
          page work. Resolved nine shared-file conflicts, preserving Home and all personal routes, query options,
          return labels, accessibility baselines, regressions and ADR supersessions.
    - [x] **5.1.b Confirm and name the recorded-change contract**
        - `UserMovieChange` in `models.py`, through its ordinary `objects` manager: `record` (cascading, related name
          `changes`), `field` (`UserMovieChange.Field`: watchlist/watched/liked/rating), `turned_on`, nullable `rating`,
          `from_entry`, `created_at` (one timestamp per save) and `made_on` (the save's local day, UTC if omitted).
        - `movie_state_rules.record_changes` records supplied turn-ons and non-watchlist reversals. Entry writes
          supply only rating, so their like removals remain reversals and their other turn-ons and automatic watchlist
          removals produce no row. Undo deletes each changed supplied field's latest differing row and records none.
        - The service holds the record lock, shares the save clock with join stamps, and enforces the like rule with
          a database constraint and backfill migration. Library `added` uses the first active list in watchlist,
          watched, liked order. The source and shipped regression cases match the expected contract; no amendment.
        - Home is present without Recently watched; the log dialog is absent at this merge. Task 5.5 applies those
          cases using the actual `SignedInHome`, `WatchlistSection`, `WhatsOn` and shared `FilmSection` components.
    - [x] **5.1.c Regenerate contracts and check integration**
        - Applied the two new migrations to the worktree stack; regenerated OpenAPI/types from its merged backend.
          Kept `ReadOptions` on Library reads and Home's return address/label beside the personal destinations.
        - All 3,367 frontend cases across 117 files and 709 user-movie/core backend cases pass; covering Library,
          sign-in, phone, browse and catalog-return browser specs pass (10 cases). Preserved focused merge regressions
          also pass. Frontend lint/types, Ruff lint/format, isolated locked-dependency Python checking and changed
          Markdown pass. A Markdown line-wrap correction was mechanical.

- [x] **5.2 History's read selects the shown changes and groups them by day and field — R20, R22, R23, R24**

    **Goal:** The history route adds one `changes` row per day and field holding the films with a shown change that
    day, counted and sampled as R24 says, ordered with the entries and paged without ever splitting a group, in a
    fixed number of queries.

    - [x] **5.2.a Cover selection, grouping and ordering through the route**
        - Directly seeded changes cover turn-ons, owner isolation, ignored entry ratings and reversals, immediate
          own-field reversals, intervening other-field saves (including mixed entry writes), re-liking, Undo deletion,
          latest shown ratings, multi-field save timestamps and local days.
        - Four/nine-film groups stay whole between entry pages and sample at most eight films newest first. Kind,
          field and entry-ID ties stay deterministic. Mixed pages take exactly three queries with 10 or 500 films,
          spanning 10 or 100 groups; entry-only pages still take two.
        - The initial change-kind case and five selection cases failed before their implementation. Narrow valid
          SQL reconstructions failed the already-satisfied ordering, grouping, sample, local-day and batching cases;
          the intended query passes restored. The required union tag also failed its OpenAPI case before correction.
    - [x] **5.2.b Build the shared PostgreSQL selection and typed union**
        - Added focused psycopg SQL composition: owner changes, distinct saves and next save, reversal suppression,
          latest shown change per film/day/field, grouped rows and one ordered union with entries. Values remain bound
          parameters. One further query samples every group on the page; schemas validate the typed query boundary.
        - Astra recommended these explicit stages over nested correlated ORM selections. Documented the timeline's
          direct pagination metadata as the QuerySet-helper exception in the pagination strategy and Proposed ADR.
        - Regenerated the required-tag union and client types. All 420 user-movie tests, 501 related frontend tests,
          the Library browser journey, Ruff lint/format, Python and TypeScript checking, frontend lint and Markdown
          pass. SQL parameter typing and test/line formatting corrections were mechanical.
        - Prepared 5.6's separate retained heavy account early to check this approach: 2,500 viewings, 500 undated
          reviews, 10,000 changes, 420 watched films and 70 queued films. Through the signed-in route, warmed pages 1
          and 30 returned in 94.107–103.977 ms across five runs each. Raw evidence is retained; Task 5.6 records the
          final measurement.

- [x] **5.3 A group's films page from their own route — R21, R24**

    **Goal:** `GET /user-movie-data/history/changes` returns one day and field's films with a shown change, most recent
    first and each once, 100 at a time, and an empty page for a day and field with none.

    - [x] **5.3.a Cover the private group contract**
        - Ten route/contract cases failed while the route was absent. The 250-film case covers paging, rerating and
          deduplication, latest-first order, ownership, a next-day reversal that must still hide an earlier change,
          a past-end page and an empty day/field. Required inputs, invalid day/field/bounds, authentication and
          OpenAPI statuses are covered; all 37 History cases pass implemented.
    - [x] **5.3.b Share the shown-change selection**
        - Added the bounded required day/field schema and thin private GET before the ID route. The service counts
          and pages the same shown selection, filtering day/field afterward; no date restriction can hide a next save.
        - Shared the stored-film payload with timeline samples, regenerated OpenAPI/client types, and retained 401/422
          declarations. All 429 user-movie tests, Ruff lint/format, Python and client type checking, and the Library
          browser spec pass. Import and line formatting were corrected mechanically.

- [x] **5.4 History draws change rows and groups, expanded in memory — R20, R21, R25, R28, R30**

    **Goal:** A day's changes of one kind show as up to 3 quiet rows or one group with a strip of up to 8 posters and
    "Show all {n}", which expands in place 100 films at a time and stays expanded across a return, and the spec finds
    the setup's "Marked watched" change.

    - [x] **5.4.a Cover change rows and group interactions**
        - Added `LibraryHistoryChanges.test.tsx` beside the existing entry/return cases: four single and group labels,
          rating stars, decorative posters, film links, first/later errors and Retry, 100-film paging and collapse,
          return persistence, user reset, repeated timeline groups and exclusion during refetch.
        - Labels, expansion and film return failed before implementation. Narrow valid reconstructions exposed
          reset, duplicate-group and fetch-guard failures; restoring the implementation passed all 24 History cases.
    - [x] **5.4.b Build the change rows**
        - Timeline keys deduplicate day/field groups alongside entry IDs; each changes row remains one measured item.
          Small sets draw quiet film rows; larger groups sample eight posters and page explicitly through the shared
          query factory. Failed pages retain their films and Retry; fetching excludes another page.
        - Expansion lives with the existing Library memory and notifies mounted rows on user change. Frontend lint,
          formatting, type-check and 513 related cases across 36 files pass; the test selector's type error was fixed.
    - [x] **5.4.c Finish the watched-change browser assertion**
        - The local journey finds the second fixture's Marked watched row, expanding its day's watched group when
          present, then scans History. Hiding change rows made the assertion fail; restoring them passed the spec.

- [x] **5.5 Apply what `main` holds of the neighbouring work — R34, R35**

    **Goal:** Each case of R34c and R34d that holds at the merge is in place with its tests, and a case that doesn't is
    recorded as such here.

    - [~] **5.5.a Card controls' log dialog case**
        - The approved merge of `main` at `1f7416f5` had no log dialog or `useEntryDialog`; R34c did not apply.
          Existing empty states, card actions and browser removal match that merge.
    - [x] **5.5.b Add Recently watched to signed-in Home — R34d**
        - The merged Home matched the planned paths and lacked this section; its implementation needed no task-plan
          correction.
        - [x] **5.5.b.1 Cover Home's viewing read and rows**
            - Added `RecentlyWatched.test.tsx`: five newest viewings, duplicate films as separate entries, calendar
              dates, rewatch, posters, year, stars and Home links, section order and both See all destinations.
              Viewings alone and a read error choose the visitor set; Retry recovers; an empty result hides the section.
            - Extended Home's first-read cases to wait for viewings alongside session and watchlist. New behaviors
              failed before implementation; forcing an empty section visible also failed the empty-state assertion.
        - [x] **5.5.b.2 Build the section and combined first-read gate**
            - Activity reads accept optional read options; the shared factory reads five for Home with its error
              policy. Home chooses its first set after both personal reads settle, counting either error as content.
            - Reused FilmSection with generic result data and a read-only list whose length controls its empty state.
              Viewing rows use entry IDs, semantic colors, local calendar formatting and native time elements.
    - [x] **5.5.c Check the applicable integration**
        - All 518 related cases across 37 files, frontend lint, formatting and type-check pass. Chakra's time-element
          prop type error was corrected through `asChild`. All seven sign-in and phone-width browser cases pass.

- [x] **5.6 History's read meets its timing on a heavy account — criterion 15**

    **Goal:** The history route answers page 1 and page 30 at `page_size` 100 each in under 300 ms at the backend for
    criterion 15's account, with the measurement recorded here before review.

    - Retained the idempotent seed, private credentials, account audit, measurement scripts and all raw logs outside
      the repository. The dedicated verified account has 2,500 viewings, 500 undated
      reviews and 10,000 changes on 400 distinct days spanning 400 days; 4,830 changes are reversals or entry ratings.
      It has 420 watched films, 70 queued films, synthetic film IDs starting at 2,100,000,000 and a shown watched group
      of 200 on 2025-10-12. The development spec's account is separate.
    - Measured source `ed41e827`, in this checkout's backend container through the authenticated Django route client,
      one warm-up then five requests per page, `page_size: 100`, each returning 100 rows from 3,111 total rows:
        - Page 1: **99.447, 95.112, 95.990, 99.255, 95.495 ms**.
        - Page 30: **95.109, 94.427, 94.771, 94.150, 95.175 ms**.
        - Slowest: **99.447 ms**, below the unchanged 300 ms bound. Warm-ups, each sample, audit and source hashes
          are retained.
    - Preserved the earlier approach measurements and an incomplete run whose result serialization lacked a JSON
      import. Corrected instrumentation records each sample immediately; the complete run above used that script.
      No application setting, logging level or bound changed for measurement.

- [x] **5.7 Check the full journey**

    **Goal:** The segment's exit criterion is shown on this branch after `main`'s merge, with what ran and the result
    recorded here.

    - All six covering specs pass against the worktree's browsable stack at source `ca03c082`: `library.spec.ts`,
      `sign-in.spec.ts`, `phone-width.spec.ts`, `back-to-results.spec.ts`, `browse.spec.ts` and `movie-detail.spec.ts`
      (**11 browser cases**). The Library journey finds the watched fixture's change and scans the personal pages.
    - Fresh independent read-only review covered the complete `516150cb..ca03c082` diff and `516150cb`'s merge
      integration against both parents, requirements and all six review dimensions: **no material findings**.
      The review assessed test source; it did not rerun the suites or measurements. The completion advisory found
      no demonstrated blocker.

### **Phase 6:** Verification

- [x] **6.1 Verify the work**

    - Earlier verification met the 14 criteria applicable at its recorded merge. The latest main integration makes
      criterion 14 applicable too; Task 6.5 revalidated every affected frontend/document criterion and proved the
      newly applicable card changes. All 15 criteria are met. Backend, seed and timing evidence remains applicable
      because backend and generated contract files are unchanged since the original verification. Code review exposed
      a missing fresh-visit sequence in criterion 9; Task 6.3 corrected and reverified it. The heavy-account checks
      and retained route timings were assessed before review. ADR-050 reads Accepted with its date.
    - Before this integration, the full verification run passed: backend and frontend suites, lint, formatting,
      type checks, contrast,
      production build, API regeneration without drift, and all eight Chromium specs. Application source did not
      change during verification; CI and the separate code review remain for completion.
    - Independent criteria verification covered the complete change and reported one minor documentation gap.
      The approved corrections below close it; the wording-only fix check was skipped on the approved
      recommendation. That pass covers its original target; the main/logging integration forms a new target for
      the separately offered independent companion.
    - [x] **6.1.a Complete the smoke-tier documentation references**
        - Corrected the desktop-spec count to seven, then named library.spec.ts and its signed-in Watchlist and
          Library journey in QUICK-REFERENCE and the quality-gates strategy. A source sweep confirmed all four
          required reference sites name the spec and count eight specs. Markdown lint and whitespace checks passed.

- [x] **6.2 Align the new tests with the frontend import standard**

    **Goal:** New test and helper imports use the configured aliases across directories while resolving to the same
    modules and preserving the covered behavior.

    - Replaced eight cross-directory relative imports in the Library grid/page tests, Recently watched test and
      shared Library helper with source or test aliases. Same-directory relative imports were preserved.
    - Confirmed each alias resolves to the original module. All 80 affected tests across eight files passed;
      frontend lint, TypeScript checking, single-file formatting and whitespace checks passed.
    - This is a mechanical import correction; no behavior or test assertions changed.

- [x] **6.3 Retire old restoration state when a personal collection opens fresh**

    **Goal:** A fresh Watchlist, Films or History visit starts at the top and its next film/back round trip cannot
    restore a previous visit's position; eligible deep returns and History expansion remain intact.

    - Added the missing fresh-visit/film-return cases for both grids, extended History's fresh-arrival case, and
      covered same-address navigation without remounting. These five coupled behaviors share one lifecycle rule;
      they ran together before implementation and all failed at the old 6,500px position, then passed with the fix.
    - Added an optional fresh-visit callback to the existing scroll-persistence hook. Visit classification runs
      before restoration; consuming its signal remains passive so the router is subscribed. Fresh personal visits
      invalidate only the active key's eligibility, leaving other keys, measurements and expanded groups intact.
    - A StrictMode case proves that the signal is consumed during loading and the valid return restores once content
      arrives. Narrow in-memory reconstructions failed for misclassified signal clearing and for consuming the
      signal before router subscription; the intended source passes without modifying production files for the runs.
    - All 3,389 frontend tests across 119 files, frontend lint and types, single-file formatting, production build
      and whitespace checks passed. The covering Library, browse and Back to Results browser cases passed. Backend
      source and
      API contracts were unchanged, so their existing verification evidence remains applicable.
    - Live fresh visits and same-address links returned to zero on all three personal pages. Deep Films returned
      to 10,500px with identical visible links; History returned to 321,300px with its 200-film group expanded.
      Reload/second-return, both required grid widths and the complete 1024px bar also passed. The independent
      material fix check remains a separate code-review step.

- [x] **6.4 Use semantic element queries in the Library browser journey**

    **Goal:** The signed-in journey uses the permitted role, label and visible-text queries while retaining
    film-specific save/removal checks and row containment of the complete film cells, including empty date slots.

    - Replaced the card-class query with a named button in the controlled catalogue's fixture order. The journey
      still finds the exact first film on Watchlist afterward, and removes it through its title-scoped grid cell
      while checking that the second film remains.
    - Replaced the date-slot test-ID query with semantic grid cells. Each cell must fit within its measured row,
      and its scrollable content height must fit within the cell, so descendants such as the empty date slot cannot
      overflow unnoticed. Explicit visible-row and visible-cell checks prevent an empty loop from passing.
    - A retained browser proof executes the assertion block directly from the spec. With the original card/footer
      structure reconstructed in that browser's DOM, the prior cell-bounds assertion accepts the broken layout and
      the revised assertion rejects it. Reloading the intact application makes the revised assertion pass. No
      application source or film records change for that reconstruction.
    - The covering Chromium journey, single-file ESLint and formatting, frontend TypeScript and whitespace checks
      passed. Application source did not change; existing component, backend, build and timing evidence was retained.

- [x] **6.5 Integrate current main and the shared film-log controls**

    **Goal:** The merged Library uses the shared Watchlist toggle and log dialog, offers logging from both empty
    views with stable focus return, and proves every newly applicable R34c behavior without losing existing returns.

    - [x] **6.5.a Merge main and reconcile the shared contracts**
        - Merged main at 95381be7, preserving both query families and both smoke-test assertions at their overlapping
          sites. Removed obsolete icon-name baselines and reconciled all eleven specs in living references.
        - Regenerated the API artifacts without drift, installed the merged form dependency and generated theme
          typings. Frontend lint/types, 18 focused query-consumer tests and the changed documents' lint passed.
          One mechanical markdown line wrap was corrected. Runtime logging composition follows below.
    - [x] **6.5.b Cover the logging integration before implementation**
        - Four coupled empty-view cases failed first for the missing Log a film button. They now cover both views'
          film picker, today's enabled date and persistent navigation focus after immediate or held list refreshes.
          An in-memory reconstruction without the explicit focus preference made both delayed cases fail again.
        - A host cancellation case failed before the opt-in preference existed; all 29 host cases then passed,
          retaining ordinary opener/fallback and ownership behavior. Updated shared-toggle removal assertions and
          the signed-in journey's queued-film logging, detail entry, Films and History checks.
    - [x] **6.5.c Implement the specified shared-dialog composition**
        - Added one shared empty-state Log button using the existing film picker/date options. The Library outlet
          supplies a persistent current-navigation ref; an optional preference makes that connected target win even
          when a delayed refresh leaves the opener mounted after closure. Existing callers retain opener-first focus.
        - Preserved filtered-empty behavior, shared query invalidation and scroll lifecycle. ADR-050 and the
          completion document record the actual dialog composition and browser journey.
    - [x] **6.5.d Verify the merged behavior and applicable criteria**
        - The full frontend suite passed all 3,553 cases across 133 files. All 28 Chromium cases across eleven
          specs passed, including the Library log journey, full-width Log control and mouse/keyboard/touch tracking.
          Frontend lint, types, touched-file formatting, contrast and production build passed; schema regeneration
          produced no drift. Corrected one remaining old removal label and unsupported component-query options.
        - Live isolated users proved both empty-view picker/date/save/focus outcomes, a card-origin Liked row and
          five films marked watched in one expandable group. The initial group proof toggled off a film that liking
          had already marked watched; isolating those actions corrected the fixture. Both users and six reference
          films were removed afterward. The heavy performance account received no writes.
        - Both grids drew seven 160px columns at 1280px and two 179px columns at 390px. Films returned to identical
          rows at 10,500px; reload and a second no-scroll return started at zero. From the viewing below the expanded
          200-film group, History returned to identical links at 321,300px with expansion retained. The full bar,
          including Log and account controls, fitted at 1024px. Screenshots were inspected.
        - Backend and generated contract files match the original verification tree; both measured History source
          hashes match the retained timing source. Existing backend, seed and performance results remain applicable.
          Astra's bounded completion advice found no concrete focus-contract gap; independent review remains separate.

---

## Implementation Findings

- **The virtualizer under jsdom.** These tests use the real window virtualizer, measuring rows from a stubbed
  `offsetHeight` on elements carrying `data-index`. The test setup's `ResizeObserver` is a no-op, so
  `measureElement` falls back to `offsetHeight`: with a 100px estimate and 300px measured rows, row 2 started at
  600px. Remounted with `takeSnapshot()`'s items as `initialMeasurementsCache` and nothing measurable, row 2
  still started at 600px. The grid and return tests assert offsets against measured sizes that differ from the
  estimate, rather than merely checking that scrolling happened.
- **Page padding.** The shared page container uses `px={{ base: 2, md: 6, lg: 8 }}`. The personal pages add no
  horizontal padding of their own, preserving the required column counts.
- **Calendar dates.** `last_logged_on`, `watched_on`, `made_on` and a change's `day` are calendar dates. Formatting
  them without `Date`'s UTC parse avoids shifting them a day back west of UTC.

## Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven in the browser before review** is checked by hand on
the branch's local stack, and **Measured before review** on it, before the code review.

### Implemented

- [x] 1. **The smoke spec.** `library.spec.ts` passes against a worktree's browsable stack: the film added from a card
  is found through the bar's Watchlist link and removed (under R34c, logged off the watchlist); the Films view and
  History show the film the setup marked watched, with History's "Marked watched" change; and the scans of `/watchlist`,
  `/library` and `/library/history` pass. Run against staging, it is skipped. (R29, R30, R32)

    **Evidence:** Verified at bbb1502d: the full local Chromium run passed all 22 cases across eight specs,
    including library.spec.ts and its three personal-page accessibility scans. The staging skip is explicit in the
    spec; staging was not contacted.

    **Integration evidence:** All 28 Chromium cases across eleven specs passed on the merged controls, including
    the queued-film log, detail entry, Films/History checks and personal-page scans. The explicit staging skip
    remains; staging was not contacted.

- [x] 2. **The bar.** Component tests show Explore, Watchlist and Library signed in, and Explore alone signed out, in
  the bar and the drawer, each current exactly on its addresses (R1). `phone-width.spec.ts`'s 1024px step finds every
  bar item fully visible, none overlapping another, and no sideways scroll. `sign-in.spec.ts` and `phone-width.spec.ts`
  pass with their Explore and Library assertions. (R1, R31)

    **Evidence:** Verified at bbb1502d: NavBar, NavDrawer and BaseLayout coverage passed in the 119-file frontend
    suite; sign-in and phone-width passed in Chromium, including the signed-in 1024px bounds and overlap check.

    **Integration evidence:** The 3,553-case frontend run passed navigation coverage. The full Chromium run
    passed sign-in and phone-width, whose signed-in 1024px assertions now include Log.

- [x] 3. **Addresses and headings.** Tests show `/library/anything` shows Not Found; a signed-out visitor at
  `/library?liked=true` is sent to sign in and returned there; `/watchlist` shows the Watchlist page with no redirect.
  The Library's `h1` reads "Library" on both views and the Watchlist page's reads "Watchlist"; the "Library" navigation
  landmark holds Films and History, the current one marked as the current page, and neither link carries a query string.
  (R2 to R4)

    **Evidence:** Verified at bbb1502d: App.test.tsx covers the unknown child, sign-in return with filters, exact
    addresses, one heading and query-free current Library navigation; all cases passed in the full frontend run.

    **Integration evidence:** The complete frontend run passed App and Library routing, heading and current
    navigation cases with the new outlet context.

- [x] 4. **The Watchlist page.** Component tests show it reads `watchlist: true` with `page_size: 100`; each sort option
  sends its pair and sets the address as R10 says; an unknown sort falls back with the address corrected; the empty
  state; and a removal from a card refetching the loaded pages and dropping the film. (R7 to R11)

    **Evidence:** Verified at bbb1502d: Watchlist.test.tsx and LibraryGrid.test.tsx passed their network assertions
    for six sort pairs, canonical addresses, replace navigation, empty/error states, card removal and sequential
    loaded-page refetches.

    **Integration evidence:** The complete frontend run passed six-sort reads and removal/refetch cases using
    the shared card Watchlist toggle.

- [x] 5. **The Films view.** Component tests show it reads `watched: true`; each toggle exposes `aria-pressed`, adds its
  filter, joins the address and survives a sort change; each sort option's pair; the "Last watched" line on a film with
  a dated viewing only, with the line's height kept on the others; the empty state with no filter on; and "No films
  match" whenever a filter is on and nothing matches, with Clear filters keeping the sort. (R12 to R16)

    **Evidence:** Verified at bbb1502d: LibraryFilms.test.tsx passed all ten sort pairs, combined toggles and
    preserved parameters, dated-only Last watched with a reserved 24px slot, both empty states and sort-preserving
    Clear filters.

    **Integration evidence:** The complete frontend run passed Films sorts, filters, date slots and empty
    states; new empty-view cases also prove picker/date/save/focus behavior.

- [x] 6. **The grid.** Tests show the column count is 2 for a 390px screen's content width and 7 for a 1280px screen's,
  with no column under 150px at any width; a next page is not requested while the list is fetching, nor once the last
  page read is not below `total_pages`, an empty list's included; a film repeated across two pages is drawn once;
  placeholder cards while the first page loads; each page's failure message with Retry; and Retry beneath the grid when
  a later page fails. (R5 to R7)

    **Evidence:** Verified at bbb1502d: LibraryGrid.test.tsx and libraryGrid.test.ts passed measured rows, paging
    guards, terminal and empty pages, duplicate removal, placeholders and first/later-page retries. The live stack
    also drew 7 desktop columns at 160px and 2 phone columns at 179px.

    **Integration evidence:** The complete frontend run retained paging, duplicate, failure and measurement
    coverage. Live merged cards draw seven 160px columns at 1280px and two 179px columns at 390px on both grids.

- [x] 7. **History's read.** API tests with stored films, entries and recorded changes show: each row kind with its day
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

    **Evidence:** Verified at bbb1502d: the complete 1,660-test backend run includes test_history_api.py covering
    owned row kinds, stable order, shown-change selection, grouping and sampling, whole-group pagination, group
    reads, bounds, privacy and fixed query counts at 10/500 rows. Both generated route contracts include
    200/401/422; regeneration produced no diff.
- [x] 8. **History in the frontend.** Component tests show month headings; a day's date once; a viewing's stars, rewatch
  icon and review lines; a review's "Review" tag; 3 changes of a kind drawn as single rows and 4 as a group with "Show
  all 4"; expanding reading the changes route, "Show more" reading its next page, and "Show fewer"; a group still
  expanded after leaving for a film and returning, and collapsed after a change of user; rows joined without duplicates;
  the loading, failed and empty states; and a record save refetching History. (R17 to R21, R25, R26)

    **Evidence:** Verified at bbb1502d: LibraryHistory.test.tsx and LibraryHistoryChanges.test.tsx passed display,
    deduplication, three/four-film boundaries, failed-page retries, expansion paging, save refetch and user-change
    reset cases. Live expansion loaded all 200 films over two group pages and survived a film return.

    **Integration evidence:** The complete frontend run passed History display, paging, invalidation, expansion
    and failure cases. Live return retained all 200 expanded films; isolated live card actions produced the new
    History changes.

- [x] 9. **Back links.** Tests show a film opened from each page carries R27's `from` and query, the film page's back
  link reads and opens R27's label and address with its scroll signal, and returning on that signal restores the saved
  position and gives the page's virtualizer back the row heights it measured, keyed as R28 says, while arriving without
  it starts at the top with none; a return on the signal to a page holding no heights, or no position saved since the
  app loaded, starts at the top, as does a second return after a reload with no scrolling between; and choosing a sort,
  or turning a filter on or off, starts at the top and replaces the history entry. (R10, R12, R27, R28)

    **Evidence:** Verified at bbb1502d: BackToCollectionLink, LibraryScrollReturn, LibraryHistory and
    useScrollPersistence cases passed destinations, query preservation, restore signals, measured heights, reset
    guards and replace navigation. Live Films and History returns restored the same visible links at 10,500px and
    321,300px; detail reload and the subsequent no-scroll return both opened Films at zero.

    **Correction evidence:** Independent code review exposed stale eligibility after a fresh visit. Task 6.3's
    regressions failed first for Watchlist, Films and History and same-address navigation, then passed with
    key-specific invalidation. The full frontend suite and covering browser cases passed. Live fresh visits at
    zero remained at zero after another film/back round trip on all three pages; valid deep returns, group expansion,
    signal consumption during delayed loading and reload behavior were retained. The initial verification had not
    covered this repeated-visit sequence.

    **Integration evidence:** The complete frontend run passed return lifecycle coverage. Live Films restored
    identical links at 10,500px; a viewing below the expanded History group returned to identical links at
    321,300px. Reload and second return opened Films at zero.

- [x] 10. **The seed.** The seed's tests show the two fixture cards created in a database without them, left unchanged
  on a second run, and no user data created for them. (R29)

    **Evidence:** Verified at bbb1502d: test_seed_dev_data.py passed creation and repeat-seeding preservation,
    absence of user records and both fixture saves with TMDB forbidden.
- [x] 11. **The documents.** ADR-050 reads `Accepted` with its date; ADR-044's, ADR-039's and ADR-027's Status sections
  say what R33 says; the documents R33 names read as it says, and a search for the smoke specs' file names and counts
  finds every living site naming the new spec. (R33)

    **Evidence:** Verified at bbb1502d plus the approved local documentation corrections: QUICK-REFERENCE,
    the quality-gates strategy, the technical overview and the testing strategy name library.spec.ts and count
    eight specs. ADR-050 reads Accepted (2026-11-15); ADR-044, ADR-039 and ADR-027 carry the required Status notes.
    The README, pagination strategy and styling example match R33. Both corrections from the author and independent
    criteria passes passed markdown lint and a final source sweep.

    **Integration evidence:** Living smoke references now count eleven specs; ADR-050 records the shared-dialog
    integration and current journey. Required related ADR Status notes remain intact. Documentation lint and the
    final reference sweep passed.

- [x] 12. **The neighbouring work.** Whichever of R34c and R34d applies at the merge is in place, with its tests: the
  empty states' "Log a film" opening the dialog with the date on, the spec's dialog steps passing in place of step 4,
  and its step 1 and the Watchlist page's removal test pressing the card's Watchlist toggle; or Home's "Recently
  watched" listing five viewings as R35 says, its "See all" opening `/library/history`, and a visitor with only viewings
  not seeing the nothing-saved set. (R34, R35)

    **Evidence:** Verified at bbb1502d against the main merge in 516150cb: Home is present and the card-controls log
    dialog is absent, so R34d applies and R34c does not. RecentlyWatched.test.tsx passed the five-viewing read,
    repeated films, row fields, destination, first-read settling, retry, empty-section omission and viewings-only
    visitor state.

    **Integration evidence:** Main at 95381be7 includes the shared dialog. Both empty views now offer date
    enabled film-picker logging with persistent navigation focus, proven with immediate and held refreshes and
    the live backend. The Chromium journey logs off Watchlist and finds the entry on detail and in both Library
    views; toggle-removal and Recently watched coverage passed.

### Proven in the browser before review

- [x] 13. **The pages by hand.** On the branch's local stack, signed in, with at least 300 watched films and a group of
  more than 100 changes on one day: the Watchlist page and Films view show 7 columns at 1280px and 2 at 390px; scrolling
  deep into the Films view, opening a film and following "Back to Library" returns to the same rows, as does "Back to
  History" from below an expanded group, while reloading the film page before following "Back to Library" opens the
  Films view at the top, and so does a second return from a film opened there without scrolling; and the bar fits at
  1024px with the longest link set it can show.

    **Evidence:** Verified on the local stack at bbb1502d with 420 watched films, 70 queued films and a 200-film
    watched group. A live Chromium walk and screenshot inspection confirmed both grid widths, identical visible rows
    after deep returns, zero after reload and second return, and the complete signed-in bar fitting at 1024px
    without overlap or overflow. History was traversed through all 32 pages, the group expanded over two pages, and
    a viewing below it opened and returned at 321,300px with expansion retained. Only synthetic films' external
    catalogue detail responses were supplied as fixtures; authentication, personal reads and History used the live
    backend.

    **Integration evidence:** On the merged controls, both grid widths, deep Films return, reload/second return,
    and a viewing below the expanded 200-film History group passed again. The complete 1024px bar includes Log,
    search and account controls without overlap or overflow. The heavy account was read only; screenshots were
    inspected.

- [x] 14. **Changes from cards,** if the card controls are on `main` at the merge: liking a film from a card adds a
  "Liked" row to History, and marking 5 films watched from cards on one day shows one "Marked 5 films watched" row.

    **Integration evidence:** The live isolated-user proof observed a Liked row after a card Like action, then
    one Marked 5 films watched group after five separate card Watched actions. Expanding it showed all five
    films. Temporary users and film fixtures were removed afterward.

### Measured before review

- [x] 15. **History's timing.** On the local stack, for an account holding 2,500 viewings, 500 reviews saved without a
  date and 10,000 recorded changes over 400 days, at least a quarter of them reversals or rating changes an entry write
  made, and some days with more than 100 films of one kind: the history route at `page_size` 100 answers page 1 and page
  30 (rows 2,901 to 3,000) each in under 300 ms, timed at the backend, with the measurement recorded before review.

    **Evidence:** Verified against retained measurement source ed41e827: current history query and service hashes
    match the measured source. A fresh account audit confirmed 2,500 viewings, 500 undated reviews, 10,000 changes
    across 400 days, 4,830 qualifying reversals/entry ratings and a shown 200-film group. Page 1 samples were
    99.447, 95.112, 95.990, 99.255 and 95.495ms; page 30 samples were 95.109, 94.427, 94.771, 94.150 and 95.175ms,
    all below 300ms. Original raw measurements were preserved.
