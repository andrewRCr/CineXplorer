# Task List: User-Movie Data Layer

**PRD:** `prd-user-movie-data.md`
**Created:** 2026-11-10
**Branch:** `technical/user-movie-data`
**Base Branch:** `main`
**Status:** Complete

## Overview

**Purpose:** Consolidate the backend's user-movie data into one service over a constrained model, saved with one PATCH
by TMDB ID, with the Library served from card data stored on `Movie` and kept fresh nightly.

## Scope

### Will Do

- Move the service's tests onto the test database, then fold `UserMovieDataRepository` into the service over one
  QuerySet
- Reshape `UserMovieData` (timestamps, watched date, database constraints) and give `Movie` card fields and
  timestamps, in two reversible migrations
- One `PATCH /user-movie-data/{tmdb_id}` upsert, with GET and DELETE by TMDB ID, per-user save limits, and declared
  error responses on every user-movie-data route
- A paginated, filtered and sorted Library read from the database in two queries
- Card data written by one mapping from three writers (a first save, the detail view, a nightly refresh run by the
  maintenance job)
- The frontend's minimal adaptation to the new routes, the regenerated API types, a new ADR and an amendment to ADR-026

### Won't Do

- Move the frontend's server state onto TanStack Query, or add any new screen or control
- A watchlist order field, drag-and-drop, Next Up, rating history or more than one viewing per movie
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** The service's tests and its data stand on the database

_Mode:_ `layer` — closes on the service tested against the database, the repository folded into it, and both models
reshaped.

_Exit criterion:_ both migrations apply and reverse, the constraint tests pass writing through the ORM, and the
rewritten service tests pass with `repositories.py` deleted.

- [x] **1.1 The service's tests run against the test database — D1**

    **Goal:** Today's service behaviour is pinned by tests that read and write the test database, replacing only TMDB,
    so the fold and the model changes that follow can't change it unnoticed.

    **Checkpoint:** Committed as `8e3d1376` before the repository fold at `a75fa1cb`.

    - [x] **1.1.a Add the factory functions and a TMDB stub**
        - Plain saved-row factories accept keyword overrides; `TMDBStub` serves configured details, credits, error
          responses or invalid payloads and records requests without accessing the network.
    - [x] **1.1.b Rewrite the user-movie service tests against the database**
        - Moved to `tests/integration/`, using the default repository and a real `MovieService` with the injected
          TMDB stub. Library tests replace only the batch client's TMDB boundary. Wiring assertions became user
          isolation checks across reads, updates, deletes, creates and lists; each existing behavior is retained.
    - [x] **1.1.c Rewrite the enrichment tests against the database**
        - Moved to `tests/integration/`; assertions cover returned schemas, preserved fields, non-mutation, user
          isolation and query counts. Removed the five unused mock/schema/pagination builders.
    - [x] **1.1.d See each rewritten test fail, then pass**
        - All 44 rewritten cases (the original 39 plus parameterized filter/ownership cases) failed under temporary
          behavior mutations, restored after each run: wrong identifiers/statuses, omitted filters/user scoping,
          changed persisted fields, skipped deletion, wrong card title/list metadata/results, omitted enrichment
          fields, unnecessary queries, copied early returns, input mutation, altered cards and invented user data.
        - Every case passed against restored production code. No production behavior changed in this task.

- [x] **1.2 The repository folds into the service over one QuerySet — D2, D3**

    **Goal:** The service reads and writes the ORM through one QuerySet with no class between them, and 1.1's tests
    pass, changed only in how they build the service and in the exception classes they expect.

    - [x] **1.2.a Add `UserMovieDataQuerySet` as `UserMovieData`'s manager**
        - Shared filters scope to a user, watchlist, watched/rated state and TMDB IDs. A typed manager returns that
          QuerySet and preserves database routing hints; one documented ignore covers django-types' invariant manager.
    - [x] **1.2.b Move both services and their factories onto it**
        - User-data services use the ORM directly; only the TMDB client is injected. Factories construct the new
          services; the obsolete factory wiring assertion is removed. Existing service tests changed only their
          constructor and expected domain exception classes. Interim record-ID methods and TMDB list fetching remain.
    - [x] **1.2.c Delete `repositories.py` and everything that presents it**
        - Removed the repository and its live references from API/service docs, the service-layer strategy,
          technical overview and README. General guidance on optional repositories remains.
        - Both touched apps pass 540 tests; Ruff, format, strict Pyright and changed-document lint pass. Django detects
          no migration from the manager change.

- [x] **1.3 `UserMovieData` holds its invariants in the database — D4**

    **Goal:** The database itself refuses an out-of-range rating, an empty, whitespace-only or overlong review, a date
    on an unwatched record and a second record for one user and movie, and the migration runs both ways.

    - [x] **1.3.a Write the constraint tests in `tests/integration/test_models.py`**
        - Direct ORM writes cover rating bounds, empty/ASCII/Unicode whitespace-only and overlong reviews, an
          unwatched date, uniqueness and undated watched records, plus creation/update timestamps.
        - Missing constraints, cleanup and timestamps failed before implementation. Removing the watched-date
          constraint demonstrated its behavioral red after the field existed. Removing uniqueness and rejecting
          undated watched records demonstrated the two cases that passed on arrival.
    - [x] **1.3.b Write the migration tests**
        - Historical rows prove truncation before blank normalization (including a review whose first 10,000
          characters are spaces), migration-time creation dates, reversal and retained cleaned reviews. The test
          restores the latest schema in teardown.
    - [x] **1.3.c Reshape the model and write the migration**
        - Added timestamps, watched date, named uniqueness, four database checks and the user/creation index; removed
          single-flag indexes. The reversible migration cleans reviews before adding constraints.
        - The text check uses Python's whitespace set: PostgreSQL's Unicode classification admitted some whitespace
          that normalization removes; a failing regression case proved the gap before its correction.
    - [x] **1.3.d The admin form cleans and bounds the review**
        - The form normalizes blank reviews to null, preserves other text verbatim and refuses overlong/NUL reviews.
          Normalization/whitespace cases failed first; removing length and NUL safeguards demonstrated those existing
          refusals fail, then pass after restoration.
        - All 97 user-data tests pass on freshly migrated databases; Ruff, formatting, strict Pyright and migration
          drift checks pass. Installed django-types' old CheckConstraint signature has narrow documented ignores.

- [x] **1.4 `Movie` stores card fields and timestamps — D8**

    **Goal:** A `Movie` row can hold everything a Library card shows and when it was last refreshed, with rows stored
    before the change migrated and the migration reversible.

    - [x] **1.4.a Write the model and migration tests**
        - Three tests failed before implementation: missing card defaults, absent timestamps and the historical
          row's missing creation time. They now cover independent genre arrays, ordinary/admin save timestamps,
          unchanged refresh time on plain saves, existing-row migration defaults and reversal.
    - [x] **1.4.b Add the fields and the `core` migration**
        - Added nullable card fields and refresh time, an integer genre array and creation/update timestamps.
          The reversible migration sets existing rows' creation time without fetching TMDB.
        - All 386 tests in core/user-data pass, with Ruff, formatting, strict Pyright (including ArrayField) and
          migration drift checks passing. Phase 1's exit criterion is met.

### **Phase 2:** One save by TMDB ID, bounded per user

_Mode:_ `slice` — closes on a record saved, read and deleted by TMDB ID through the running stack.

_Exit criterion:_ on the worktree's browsable stack, a signed-in user's first PATCH of an unstored movie answers 201 and
stores its card fields, a second answers 200, GET returns the record, DELETE answers 204, and the 31st save within one
clock minute answers 429.

- [x] **2.1 One mapping turns TMDB's details into a movie's card fields — D3, D8**

    **Goal:** Every writer of card data (a first save, the detail view, the nightly refresh) gets the same `Movie` field
    values from one TMDB details response, with TMDB's unknowns stored as `null`.

    - [x] **2.1.a Write the mapping's tests**
        - Six cases cover card values, genre derivation, empty/null unknowns and malformed details/date values.
          Every case failed against an unprocessed payload before validation and normalization were added.
    - [x] **2.1.b Implement the mapping**
        - `movie_card_fields` validates details once and returns stored fields, mapping unknown dates/runtime/overview
          to null and deriving genre IDs from genres. Invalid input raises a fixed-message 502 domain error.
        - All 465 movie-app tests, Ruff, formatting and strict Pyright pass.

- [x] **2.2 The service saves, reads and deletes a user's record by TMDB ID — D2, D3, D6**

    **Goal:** One service call sets or clears any field from any prior state, the first save included, and two
    concurrent first saves of one movie both succeed.

    - [x] **2.2.a Write the save's service tests**
        - Twenty-three cases exercise defaults/card writes, omission/null semantics, watched rules and rollback,
          early body checks, each upstream failure, retained empty state, ownership and TMDB-ID read/delete.
        - Cases fail against create-only behavior; existing upstream/missing-record cases were seen failing under
          temporary incorrect error mapping. A duplicate error could initially satisfy a watched-rule assertion;
          checking its message exposed that false positive before implementation.
    - [x] **2.2.b Write the concurrency test**
        - Two real transactions overlap at a barrier in the injected TMDB client. Both saves succeed, leaving one
          movie and one user record with both fields. Reconstructing lookup-then-create after implementation produces
          a duplicate movie primary-key failure; restoring `get_or_create` passes.
    - [x] **2.2.c Implement the save, the read and the delete**
        - Validate body-only conditions first, fetch/create missing Movie cards outside the user-state transaction,
          then lock/get-or-create the user's record, apply supplied fields and enforce the watched rule atomically.
          Stored movies make no TMDB request. Deletes use TMDB IDs and keep the Movie row.
        - Legacy record-ID deletion is temporarily named `delete_by_record_id`; its existing route/tests follow it.
          All 120 user-data tests, Ruff, formatting and strict Pyright pass after source restoration.

- [x] **2.3 The routes address records by TMDB ID and declare their responses — D3, D5, D6**

    **Goal:** GET, PATCH and DELETE `/user-movie-data/{tmdb_id}` answer exactly D6's Responses table, every error body
    has the shared schema, and nothing addresses a record by its database ID.

    - [x] **2.3.a Add `ErrorResponseSchema`**
        - Both shared-handler body variants validate as a string detail and optional error code; both tests failed
          against the initial wrong detail type before the schema was implemented.
    - [x] **2.3.b Write the schema tests, then the schemas**
        - One required-field response schema now serves saved state and movie enrichment. PATCH distinguishes
          omissions/nulls, refuses null flags and invalid ratings/reviews, and normalizes only blank reviews.
          Twenty-one schema cases failed before implementation; movie list/detail cases failed on their old exact
          field sets and now include watched_at without database ID/title.
    - [x] **2.3.c Write the API tests for the new routes**
        - Forty-six cases cover saves from empty/full state, null clearing, malformed/missing/empty bodies, watched
          rules, ownership, authentication, positive TMDB IDs, upstream errors and exact OpenAPI status/schema sets.
        - The old routes failed 37 cases; the nine passing cases were seen failing under temporary narrow breaks of
          authentication, path validation, missing/malformed body handling, validation status, lookup errors and the
          movies route. Removing CSRF checks failed all four missing/mismatched-token PATCH/DELETE cases.
    - [x] **2.3.d Implement the routes**
        - GET/PATCH/DELETE use TMDB IDs, declare their success/error responses and keep business logic in the service.
          Removed the POST/query routes, obsolete schemas and record-ID methods/tests. Session/Bearer and enforced
          CSRF tests use the new paths.
        - All 1,190 tests in the four touched apps pass after restoring every mutation. Ruff, formatting, strict
          Pyright and documentation lint pass. The OpenAPI test uses Django's encoder for lazy translated text.
    - [x] **2.3.e Update references to removed routes and schemas**
        - Updated core HTTP helper examples and the authentication, testing and type-safety strategies to the shared
          schemas and TMDB-ID PATCH contract.

- [x] **2.4 Saves are limited per user per minute and per day — D6**

    **Goal:** One account's 31st save in a clock minute and 1,001st in a UTC day answer 429 with `Retry-After` and change
    nothing, counts stay exact under concurrent saves, and a cache fault lets saves through.

    - [x] **2.4.a Write the save-limit tests**
        - Thirteen Redis-backed cases isolate counters by cache prefix and cover both authentication paths, minute/day
          limits, unchanged refused writes, 40 concurrent saves, sub-second window ends, an evicted counter,
          unreachable cache and independent reads/deletes/users.
        - Eleven cases failed under pass-through counting; both cache-unreachable cases failed when cache errors
          escaped. Further mutations proved user-key isolation, unthrottled reads and lost increments: synchronized
          non-atomic counters let all 40 requests through instead of 30.
        - Schemas initialize before time freezes; long-lived signed credentials keep daily-window tests about limits.
    - [x] **2.4.b Implement the throttle**
        - One class, two instances on PATCH only. Atomic cache increments use authenticated user IDs and fixed UTC
          windows; expiry rounds up, a missing counter retries from one, cache errors never escape, and wait state
          stays thread-local. Ordinary tests bypass counting.
        - All 161 user-data tests, Ruff, formatting and strict Pyright pass after source restoration.

- [x] **2.5 A new ADR records the save — D6**

    **Goal:** The save's design and the reasons for it (the upsert by TMDB ID, an omitted field against an explicit
    `null`, concurrent saves without a 409, and the save limits) are recorded where a later reader looks for them.

    - Added proposed ADR-043, "Save a User's Movie Data with One PATCH by TMDB ID", recording partial saves,
      explicit clearing, concurrent insertion/locking, exact per-user fixed-window limits and cache fault behavior,
      with alternatives, reasons and operational limits.
    - ADR-025/026 Status lines name only the superseded duplicate-save 409 and PUT save. Their remaining decisions
      stand; ADR-043 is Accepted following verification. All three changed ADRs pass markdown lint.

- [x] **2.6 Check a save end to end**

    **Goal:** The save composes through the real stack: routing, sign-in, CSRF, TMDB and the Redis counters.

    - A scripted scenario through the worktree's browsable stack signed in as dev with bearer credentials and
      matching CSRF/Origin headers. The previously unstored TMDB movie 550 saved with 201, updated with 200, read
      with 200, deleted with 204 and then read as 404. Its Movie row retained mapped vote data, runtime and refresh time.
    - All 31 PATCH attempts ran in one fixed minute: 30 succeeded and the last answered 429 with Retry-After 58.
      The script and output are retained with the work unit's run evidence. Phase 2's exit criterion is met.

### **Phase 3:** The Library is served from the database

_Mode:_ `slice` — closes on a filtered, sorted page of a user's movies read from the database with no TMDB request.

_Exit criterion:_ on the browsable stack, a filtered and sorted Library page for a user with two saved movies returns
one item at `page_size=1` carrying the `Movie` row's card fields, with `total_pages` 2 and no TMDB request.

- [x] **3.1 The Library serves a filtered, sorted page from the database in two queries — D6, D7**

    **Goal:** `GET /user-movie-data/movies` answers every case of Success Criterion 9 from the database, with the
    service's read at two queries and the endpoint's count the same for 1 record as for 200, and no TMDB request.

    - [x] **3.1.a Write the service's query test**
        - A 200-record Library reads its page in exactly two queries and receives stored card values with no TMDB
          request. The old batch/enrichment path failed the cost assertion before the database read replaced it.
    - [x] **3.1.b Write the Library's API tests**
        - Twenty-eight cases cover independent/combined filters, all five sorts in both directions, nulls last,
          TMDB-ID ties, defaults, page bounds/counts, stored payloads, cleared records, fixed endpoint cost and OpenAPI.
          Each test guards the TMDB boundary against requests.
        - The old route failed the new behavior cases. Temporary public-list and missing-state-filter mutations
          demonstrated the authentication/cleared-record regressions; using row IDs as the tie key failed all ten sort
          cases after insertion order was made different from TMDB-ID order.
    - [x] **3.1.c Implement the read and the route**
        - QuerySet filters and stable orderings feed paginate_queryset with select_related movies. A bounded query
          schema validates the route; its declared errors use the shared schema. The old list/enrichment methods
          and their tests/imports are removed.
        - All 171 user-data tests pass; the 29 Library cases pass after every mutation is restored. Ruff, formatting
          and strict Pyright pass.

- [x] **3.2 The batch fetch is gone, and the pagination strategy states the database-list rule — D2, D7**

    **Goal:** Nothing fetches a list's movies from TMDB one at a time, and the pagination strategy and
    `MovieListResponseSchema` describe lists served from the database.

    - [x] **3.2.a Remove the batch pipeline and its tests**
        - Deleted the unused fetch module and 13 tests, removed batch mock paths/package mentions/lint exceptions,
          and updated service-layer guidance and its index. Living-source/document searches find no removed batch or
          list-helper symbols outside historical decisions/records.
    - [x] **3.2.b State the rule for database-served lists**
        - The pagination strategy now states bounds, validation, empty-page/count semantics, unique-key ordering and
          refetch after writes. It and the response schema distinguish a TMDB exhaustion cursor from the database
          list's always-null cursor. Updated the auth example and technical service inventory.
        - All 623 tests in both touched apps pass, as do Ruff, formatting, strict Pyright and changed-document lint.

- [x] **3.3 Check a Library page end to end**

    **Goal:** The Library composes through the real stack: query validation, the read and the response.

    - The scripted browsable-stack scenario signed in as dev, saved two movies, then read watchlist pages sorted by
      title ascending at page_size 1. Both pages answered 200 with total_pages/total_results 2, distinct TMDB IDs
      550 and 278, and null TMDB cursors. Every returned card field matched its stored Movie row.
    - The application log contains TMDB messages from the setup lookup and none during the two Library requests.
      Script/output and the request log excerpt are retained with the run evidence. Phase 3's exit criterion is met.

### **Phase 4:** Stored card data stays fresh

_Mode:_ `slice` — closes on stored rows refreshed by the movie's detail view and by the nightly job.

_Exit criterion:_ on the browsable stack, viewing a stored movie's detail moves its `refreshed_at`, and
`refresh_movie_cards` run in the backend container refreshes the stalest rows, prints its counts and exits zero.

- [x] **4.1 The detail view refreshes a stored movie's card and answers bad TMDB data with 502 — D3, D8**

    **Goal:** Viewing a stored movie's detail updates its card fields and `refreshed_at` and never creates a row, and
    TMDB data that fails validation answers 502 with the shared body instead of 500.

    - [x] **4.1.a Write the detail tests**
        - Six cases cover stored card/timestamp refresh, no insertion for an unstored movie, and 502 responses for
          invalid details, credits, detail-schema dates and empty data, leaving stored cards unchanged on failure.
        - Refresh/validation cases failed first. Accidental insertion and a wrong empty-data status demonstrated
          the two behaviors that already held, then all six passed after restoration.
    - [x] **4.1.b Implement in `MovieService.get_movie_by_id`**
        - Validate conversion before updating existing rows through the shared card mapping; set updated_at and
          refreshed_at together. Empty/invalid data raises UpstreamError. The route remains HTTP-only and the successful
          service unit test now has database access. Documented the conversion-error boundary.
        - All 458 movie-app tests, Ruff, formatting and strict Pyright pass; the six new cases pass after mutations.

- [x] **4.2 `refresh_movie_cards` keeps every stored card within seven days — D9**

    **Goal:** Each run refreshes the stalest rows one request at a time for at most 20 minutes, never deletes or
    blanks a row, and exits non-zero exactly when a row is more than seven days old afterwards.

    - [x] **4.2.a Write the command's tests**
        - Eleven cases cover null-first/oldest-first ordering, the 20-minute budget, each upstream failure type,
          unchanged failed cards, timestamps, counts, never-refreshed rows, exact seven-day age and an empty catalogue.
          Ten cases failed against a no-op command; omitting null refresh ages demonstrated the added never-refreshed
          failure before restoration.
    - [x] **4.2.b Implement the command**
        - Inject the TMDB client, stream IDs in age order, fetch/map one card at a time and update both timestamps.
          Domain failures leave rows untouched. The command prints counts, then raises CommandError with stale IDs
          exactly when any row lacks a refresh time or is more than seven days old; it deletes no row.
        - All 469 movie-app tests, Ruff, formatting and strict Pyright pass.

- [x] **4.3 The nightly maintenance job runs the refresh — D9**

    **Goal:** The maintenance job runs the refresh after the clean-ups and before the success ping, journals its output
    every night, and the deploy README covers its alert and the previous release.

    - [x] **4.3.a Write the job's tests**
        - Three behavioral failures proved the clean output/order, failed-refresh tail and previous-release failure.
          Fake Docker checks the command file in the checked-out tree, matching the older release's missing command.
    - [x] **4.3.b Add the maintenance step**
        - Refresh runs after both clean-ups. Clean output reaches the journal; failures retain the last 20 lines and
          send the failure heartbeat. All eight deployment tests pass in disposable containers.
    - [x] **4.3.c Document nightly operations**
        - Explain freshness alerts, manual resolution of removed movies and the previous release's expected failure.
          All eight deployment tests pass again; Ruff, formatting, shell syntax and README markdown lint pass.
          These deployment tests run locally and are outside CI.

- [x] **4.4 ADR-026 records this change as its realization — D7, D9**

    **Goal:** ADR-026 tells a later reader how a removed movie is handled and what freshness and Library cost the
    realization delivered, without changing its Decision.

    - Dated append-only amendments record the removed-movie risk, bounded freshness and the two-query Library read.
      Status records realization; the Decision and original consequences remain intact. Markdown lint passes.

- [x] **4.5 Check the refresh end to end**

    **Goal:** The refresh composes through the real stack: the command, TMDB and the rows it keeps.

    - On the isolated browsable stack, cleared both stored rows' refresh times. GET movie 550 returned 200 and
      refreshed its card; the real command then refreshed both rows, printed `Refreshed: 2; failed: 0` and exited 0.
      Both timestamps advanced together. Script and output retained with the work unit's run evidence.

### **Phase 5:** The frontend saves through the one PATCH

_Mode:_ `slice` — closes on the watchlist toggle, the detail page and the watchlist page working against the new API.

_Exit criterion:_ on the browsable stack, a signed-in user adds a never-touched movie to the watchlist from its detail
page, sees it on the watchlist page, and takes it off again from its card.

- [x] **5.1 The frontend saves and reads through the new routes — D5, D6, D10**

    **Goal:** The watchlist toggle, the detail page and the watchlist page work against the new routes, and the
    frontend type-checks against the regenerated types.

    - [x] **5.1.a Test watchlist saves through MSW**
        - Replace internal service mocks with real network-backed services. Assert one PATCH with the requested
          state, a second click sending false despite an initially empty prop, pending state, retry recovery,
          failure toasts and rollback for 500 and 429. The existing card toggle gains an accessible name and state.
        - Restoring the old save services produced three body/method failures; narrow feedback/loading mutations
          produced five behavioral failures. Restored implementation passes.
    - [x] **5.1.b Test detail reads and first saves**
        - Test the TMDB path read, 404 as no record/no error, and a first PATCH taking its complete returned record.
          The updated transition test failed on the old response guard; the 404 case failed on old error handling.
          Restoring the loaded-record prerequisite separately proved the first-save failure.
    - [x] **5.1.c Test the watchlist request bounds**
        - The request test failed without page_size and passes with watchlist=true and page_size=100.
    - [x] **5.1.d Adapt callers and regenerate the API contract**
        - Export this worktree's actual OpenAPI and regenerate TypeScript together. Replace create/retry and
          record-ID saves with one PATCH by TMDB ID; pass the card's displayed destination state explicitly.
          The detail hook accepts untouched movies and the complete shared schema; fixtures carry all seven fields.
        - Library queries accept page_size and retain real cancellation; the watchlist keeps its text list.
          The PATCH input alias permits omission because the generator treats defaulted flags as required.
        - All 51 focused tests and all 999 related frontend tests pass (62 files), with ESLint, formatting and
          TypeScript. The three required Chromium smokes pass: browse, Back to Results and movie detail.
          This is task validation; full-work verification and CI remain ahead.
    - [x] **5.1.e Search live symbols and route prose**
        - The whole-repository search finds none of the removed symbols outside ADRs and the excluded planning
          records. Reviewed remaining user-movie-data route references; generic HTTP tests use an independent sample
          resource rather than invented user-movie routes. Current GET/PATCH/DELETE paths use TMDB IDs.

- [x] **5.2 Check the frontend end to end**

    **Goal:** The adapted call sites compose with the real API in a browser.

    - Walked the real isolated stack in headless Chromium through Playwright, with no catalogue mocks. Alien (348)
      was absent from stored movies and its user-data GET returned 404. The signed-in dev account added it from
      detail with one PATCH (201), saw it on the watchlist (watchlist=true, page_size=100), then removed it from its
      search card with one PATCH carrying false (200). Revisiting the watchlist showed it absent.
    - Script, sanitized request/result log and three screenshots retained with the work unit's run evidence; visually
      checked the watchlist and removed card. The initial script's exact username selector missed the avatar's added
      accessible initial; correcting that selector completed the journey. No application fix was needed.

### **Phase 6:** Verification

- [x] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; the new
  ADR set `Accepted` before merge; before the merge deploys, staging holds at least one stored movie, which the Owner
  saves through the app with the staging test account if none is; the staging criterion is proven after merge, § 9)

    - Author criteria walk: Implemented 1–13 proven, including the hosted API type-drift job on PR #173.
      The complete local verification run passes: 1,220 backend tests (96.31% coverage), 999 frontend tests, five
      Chromium smokes, lint/format/types and markdown. Eight deploy-script tests, contrast and production build pass.
      Historical pre-fold service checkpoint: 44 tests pass at `8e3d1376`.
    - Integrated main at `9dd9d400`, retaining both service-testing and Marquee README descriptions. Refreshed
      frontend dependencies and the backend image from the merged lockfiles. The integrated full run passes
      1,237 backend tests (96.16% coverage), 2,609 frontend tests and all five Chromium smokes. Ruff, format,
      Pyright, ESLint, TypeScript, markdown, contrast and production build pass; API regeneration produces no diff.
    - PR #173 at `b6783c10`: CI run `43055091005` passes API types, backend tests, frontend, images and docs.
      Backend checks reject eight obsolete CheckConstraint call suppressions against locked django-types 0.24.0;
      removed them and their stale comment. With CI’s pinned Pyright 1.1.414 and locked Python 3.13 dependencies,
      the full check changes from eight errors to zero errors/warnings; Ruff and format pass. The production AST
      is identical. Browser smoke was still pending at the failed-gate stop.
    - Corrected head `0c3be00a` passes every required job, including `ci-ok`, in CI run `43107100580`.
      The complete local run, independent verification and code reviews, accepted ADRs and hosted CI close
      verification. The staging criterion remains due after merge.
      Criteria evidence is recorded below and in the work unit's review log.

- [x] **6.2 Bound card text before storage and retain unstored detail reads**

    **Goal:** Storage-incompatible title or poster text is an upstream error for a card writer, while an unstored
    detail response remains displayable and a failed refresh row does not stop later movies.

    - Shared card mapping runs the existing Movie field validators for title and poster_path, translating their
      failures to UpstreamError. Accepted values and a nullable poster remain unchanged. Detail reads map and update
      card fields only when the stored row exists; ordinary detail validation still runs for every response.
    - Added 17 regression cases for 255/256 boundaries, no first-save writes on rejection, unchanged stored rows and
      timestamps, unstored detail responses, and refresh continuation with fresh/stale failed rows. The coupled
      storage-boundary cases were written together: 12 failed before the fix; five already-supported boundary/null
      cases failed under a temporary over-restrictive guard, restored before the passing run.
    - All 63 tests in the four focused files pass; both affected backend apps pass 657 tests. Ruff, formatting,
      strict Pyright and the movie-detail and Back to Results browser smokes pass. The broader verification run
      preceded this correction; CI remains the next full check.
    - Removed the two orphaned batch-policy comment lines from the Ruff configuration.

## Implementation Notes

- **The TMDB boundary in tests:** service and command tests inject the stub from 1.1.a. API tests can't, since each
  router builds its services when it is imported; they patch `TMDBApiClient` at the class, as
  `test_watchlist_endpoint.py` does today (`TMDB_CLIENT_GET` and `TMDB_CLIENT_GET_MOVIE_DETAILS` in
  `apps/movie/tests/mock_paths.py`). 1.1's Library tests and 3.1.a replace `fetch_movies_batch`'s module client with
  the stub until 3.1.c.
- **Deploy-script tests:** CI doesn't run `infrastructure/deploy/tests/`. From that folder,
  `python3 -m unittest test_nightly test_installed_operations` runs them; they need the
  `cinexplorer-bootstrap:launch-readiness-test` image, built from `Dockerfile.bootstrap` there if it's missing.
- **Migration tests:** use Django's `MigrationExecutor` from the previous migration's state, writing rows through
  historical models, with `django_db(transaction=True)`:
  foreign keys here are deferred, so rows inserted in one transaction leave pending trigger events and Postgres refuses
  the next `ALTER TABLE`. Migrate back to the latest state in teardown, so a database kept by `--reuse-db` keeps the
  current schema.
- **Tests that pass before their implementation:** a case the current code already satisfies is seen failing against a
  narrow break of that behaviour, then passing once it is restored (reconstruct and revert), and the completion notes
  record it.
- **Threads and transactions:** the concurrency and simultaneous-save tests need `django_db(transaction=True)`, as
  `apps/core/tests/integration/test_health_check.py` uses it.
- **An unreachable cache:** `closed_local_port()` in `apps/core/tests/test_helpers.py` gives an address that refuses
  connections.
- **Scripted checks:** the browsable stack (`node scripts/worktree.mjs browse`) prints its address; it reaches TMDB with
  the worktree's `backend/config/.env`. Keep each scenario's script and output under the work unit's runs folder, and
  record the result in the check task.

## Success Criteria

### Implemented

- [x] 1. **The success signal.** With 200 records for one user, a test shows the service's Library read runs exactly two
  queries (the count, and the page with its movies) and the TMDB stub receives no request, and another shows the
  endpoint runs the same number of queries for 1 record as for 200; and API tests show one
  `PATCH /user-movie-data/{tmdb_id}` sets each field from a record holding no state and from one holding every field,
  and clears a rating, a review and a watched date with an explicit `null`. (D6, D7)

  _Evidence (2026-11-11):_ Full backend verification passes `test_library_of_two_hundred_movies_uses_two_queries`,
  the endpoint 1-versus-200 query-count test, and the parameterized empty/full-state and explicit-null API tests.

- [x] 2. **Service tests on the database.** The rewritten service tests pass at the commit that adds them, before the
  repository is removed; they replace only TMDB, and no test in `apps/user_movie_data` mocks the repository, the
  QuerySet or `MovieService`. (D1)

  _Evidence (2026-11-11):_ The 44 rewritten database service tests were rerun successfully from an archived backend
  at commit `8e3d1376`, before the repository fold at `a75fa1cb`. Current service tests substitute TMDB, with no
  repository, QuerySet or MovieService mocks.

- [x] 3. **The fold is complete.** `repositories.py` and `pipelines/batch.py` with its tests are gone, and a search of the
  repository outside ADRs and the planning records in `.arc/backlog/`, `.arc/active/` and `.arc/reference/archive/`
  finds no `UserMovieDataRepository`, `fetch_movies_batch`, `get_all_user_movies`, `UserMovieDataDetailSchema`,
  `UserMovieDataCreateSchema`, `UserMovieDataUpdateSchema`, `UserMovieDataModelSchema` or `by-tmdb-id`, and no test,
  test helper or docstring sends or shows a request to a removed route or to a user-movie-data route addressed by a
  record's database ID. `UserMovieDataService` takes no repository or `MovieService`. (D2)

  _Evidence (2026-11-11):_ Tracked-source search outside the specified ADR/planning/archive exclusions finds none of
  the removed names. Route-reference inspection finds TMDB IDs throughout tests/helpers/docstrings; the service
  constructor injects only TMDB. The repository, batch module and batch tests are deleted.

- [x] 4. **Errors.** No `HttpError` remains in `apps/user_movie_data` or in `MovieService.get_movie_by_id`. The committed
  OpenAPI schema lists, for each user-movie-data route, exactly the success and error statuses in D6's Responses
  table, each error with `ErrorResponseSchema`. A test shows the movie detail endpoint answers 502 with the shared
  body when TMDB's details or credits response fails validation. (D3)

  _Evidence (2026-11-11):_ Committed OpenAPI statuses match D6 exactly and every declared error references
  `ErrorResponseSchema`. Full backend verification passes schema-contract and invalid-details/credits 502 tests; the
  changed services contain no HttpError.

- [x] 5. **Database constraints.** Tests writing through the ORM directly show the database rejects a rating of 0 and of
  11, an empty and a whitespace-only review, a review of 10,001 characters, a `watched_at` on an unwatched record and a
  second record for one user and movie, and accepts a watched record with no date. A migration test shows an existing
  empty review becomes `null`, one of 10,001 characters is truncated to 10,000, and one of 10,001 characters whose
  first 10,000 are spaces becomes `null`. Both migrations apply and reverse. (D4, D8)

  _Evidence (2026-11-11):_ Full backend verification passes direct-ORM constraint tests and both migration
  apply/reverse tests, including legacy review normalization and truncation.

- [x] 6. **The save's contract.** API tests show: a first save answers 201 and a second 200, both with
  `UserMovieDataSchema`; a field left out keeps its value; `null` for a flag, a rating of 11, a review of 10,001
  characters and a review containing a NUL character each answer 422, as does a request with no body; a body of
  `{}`, a body that isn't valid JSON and a `watched_at` date on an unwatched result each answer 400; marking a movie
  unwatched clears its date, and `watched_at: null` with `user_watched: false` is accepted; a whitespace-only review
  is stored as `null`; a save leaving no state keeps the record, which GET returns and the Library leaves out; GET
  and DELETE answer 404 with no record; DELETE answers 204 and keeps the `Movie` row; each route answers 401 with no
  user and never reads or writes another user's record; and, with CSRF checks enforced, a session-signed-in PATCH and
  DELETE answer 403 without a token and succeed with a matching one. (D2, D5, D6)

  _Evidence (2026-11-11):_ Full backend verification passes the save lifecycle, field/null/body validation,
  watched-date, empty-state retention, ownership and enforced-CSRF cases in the API and authentication integration
  suites.

- [x] 7. **Concurrent first saves.** Two first saves of one unstored movie, sent at once on two threads with real
  transactions, both succeed, leaving one `Movie` row and one record holding both saves' fields. (D6)

  _Evidence (2026-11-11):_ Full backend verification passes the two-thread first-save test using real transactions,
  leaving one Movie and one user record with both fields.

- [x] 8. **Save limits.** With throttling enabled against the Redis cache, for a user signed in by bearer token and for
  one signed in by session, the 31st save within one clock minute and the 1,001st within one UTC day answer 429 with a
  `Retry-After` header and change nothing; 40 saves from one user sent at the same moment on parallel threads, within
  one minute, leave exactly 30 succeeding; a save half a second before either window ends succeeds and is counted; a
  save whose counter is deleted between its creation and its increment succeeds and counts as one; with `CACHES`
  pointed at an address that refuses connections, a save still succeeds; and another user's saves from the same
  address, and the first user's reads and deletes, still succeed. (D6)

  _Evidence (2026-11-11):_ Full backend verification passes bearer/session minute/day limits, forty concurrent
  saves, half-second boundaries, deleted counters, unreachable cache and user/read/delete isolation. The configured
  test cache uses Redis.

- [x] 9. **The Library.** API tests show each filter alone and combined, each sort in both directions with nulls last and
  ties ordered by TMDB ID, records with no state left out of the unfiltered list, a 422 for an unknown `sort`, a `page`
  of 0 or 1,000,001 and a `page_size` of 101, an empty page past the end with valid counts, and `next_tmdb_page_start`
  null on every page. Each item carries the `Movie` row's card fields and the user's data. (D7)

  _Evidence (2026-11-11):_ Full backend verification passes all filters, combined filters, both directions of every
  sort, nulls/ties, invalid bounds, stored payloads, empty-state omission and past-end pagination, with null TMDB
  cursors.

- [x] 10. **Card data.** Tests show a save of an unstored movie creates its `Movie` row with the mapped card fields and
  `refreshed_at` set, turning an empty release date, a runtime of 0 and an empty overview into `null` and deriving
  `genre_ids` from `genres`; a save of a stored movie makes no TMDB request; an unknown TMDB ID answers 404 and a
  TMDB failure an upstream error, writing nothing; and the detail view updates a stored row's card fields and
  `refreshed_at` and creates no row for an unstored movie. (D8)

  _Evidence (2026-11-11):_ Full backend verification passes card mapping/normalization, missing-versus-stored saves,
  upstream failures without writes, stored detail refresh and no creation for an unstored detail view. Retained live
  save/detail scenarios agree with those paths.

- [x] 11. **The nightly refresh.** Command tests show it refreshes rows stalest first with rows lacking `refreshed_at`
  ahead, stops at 20 minutes, leaves a failing row unchanged for each failure kind D9 names, deletes no row, prints its
  counts and then the stale IDs last, and exits non-zero exactly when a row is more than seven days old after the
  run. `test_nightly.py` shows the maintenance job runs the step after the clean-ups and before the success ping and
  keeps its output in the journal on a clean night; `test_installed_operations.py` and the deploy README state the
  previous release's failing step, and the README's "Nightly jobs and monitoring" section gives the procedure for
  settling a removed movie. (D9)

  _Evidence (2026-11-11):_ Full backend verification passes command order/budget/failure/freshness tests; all eight
  nightly and installed-operations tests pass. The README records rollback compatibility and removed-movie handling.
  Retained live refresh evidence reports two refreshed rows and exit zero.

- [x] 12. **The frontend.** Frontend tests show the watchlist toggle sends one PATCH carrying the value the card shows it
  moving to, so a second click on a card first drawn with no user data sends `false`; the detail page treats a 404
  as no record and adds an untouched movie to the watchlist; and the watchlist page requests `watchlist=true` with
  a `page_size` of 100. The API types are regenerated and CI's type-drift check passes. (D10)

  _Evidence (2026-11-11):_ Frontend verification passes all 999 tests, including the true-then-false card save,
  detail-hook 404/first save and bounded Watchlist request. All five browser smokes pass. Regenerating OpenAPI and
  TypeScript produces no diff, and the local equivalent of the CI drift check passes. PR #173’s API types job
  passes on `b6783c10` in CI run `43055091005` (job `130642288032`).

- [x] 13. **Reference documents.** `strategy-pagination.md` states the rule for database-served lists, and its
  End-of-Results Signal section and `MovieListResponseSchema`'s docstring say a null `next_tmdb_page_start` ends only
  a TMDB-backed list; the service-layer strategy and the technical overview no longer present the removed repository.
  (D2, D7)

  _Evidence (2026-11-11):_ Source inspection confirms the database-list pagination rule, TMDB-only null-cursor
  exhaustion semantics, matching response docstring, and updated service/technical references. Full markdown lint
  passes.

### Proven after merge

- [ ] 1. **The refresh runs on staging.** With at least one movie stored on staging before the merge deploys (saved
  through the app with the staging test account if none is), a nightly maintenance run after the deploy succeeds:
  the heartbeat reports success, and the journal shows the refresh step exiting zero with a refreshed count of at
  least one and no stale ID. Afterwards `GET /user-movie-data/movies` for that account returns the movie stored before
  the deploy with its `vote_average` and `vote_count` filled. (D8, D9)
