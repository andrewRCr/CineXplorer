# Task List: User Movie Tracking

**PRD:** `prd-user-movie-tracking.md`
**Created:** 2026-11-13
**Branch:** `technical/user-movie-tracking`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Keep each viewing and review of a film as its own dated entry with its own rating, enforce the rules
between watched, the watchlist, ratings and entries in the backend's saves, sort each list by when a film joined it,
and land the shared frontend layer later pages build on, with today's pages working as before.

**The design draft stays in the backlog.** `draft-user-movie-uis.md` designs this unit and the two after it (the
controls and the Library), which check their designs against it and this PRD, reading both from this branch now and
from `main` after merge. At activation (`activate-work-unit.md` Step 4), move only the PRD and this task list, and say
why in the activation commit's body. At archive, leave the draft where it is: the completion document cites
`draft-user-movie-uis.md` by filename and says it stays in the backlog for the two later units. Whichever of them
archives last moves it into its own archive folder.

## Scope

### Will Do

- Reshape `UserMovieData` and add `UserMovieEntry` in one reversible migration that turns each stored watched date and
  review into an entry
- Hold the rules between watched, the watchlist, ratings and entries, including the watched lock, in one place in the
  services, called by the record save and by every entry write
- Add an Undo mark to the record save and the log summary (`has_entries`, `last_logged_on`) to every record read, and
  sort the Library's `added` and `watched` on the new fields
- Add entry endpoints for one film and across films, carrying the user's time zone and sharing the save limits
- Make the records' admin view-and-delete only
- Move the frontend onto the new record: regenerated types, the watchlist Undo sending the mark, entry reads and
  writes that queue as saves of their film, and `RatingStars` and `RewatchIcon`
- Write ADR-047, record the parts of ADR-043, ADR-027 and ADR-042 it supersedes, and update every living site that
  states a rule this change replaces

### Won't Do

- New pages or controls: no rating control, log or review dialog, Library page, Activity timeline or list of a film's
  entries; cards and the detail page keep their current controls
- Watchlist order, drag-and-drop, Next Up or search suggestions, or a history of ratings, likes or watchlist changes
- Expose join times in the API; add an admin page for entries or an add or edit form for records; restore a deleted
  entry
- Change the browse grids' data layer beyond the record shape their payloads carry; add a signed-in smoke spec
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** The record save keeps a film's facts consistent, and the record takes its new shape

_Mode:_ `layer` — closes on the reshaped record and the entries table under every constraint, existing data migrated,
and the record's save, reads, Library and admin working on the new shape, before any entry route builds on them.

- [x] **1.1 The admin lists, shows and deletes records, and no longer adds or changes them — D11**

    **Goal:** No admin form can write a record's flags past the rules, while staff can still find, read and delete
    records.

    - [x] **1.1.a Rewrite `tests/integration/test_admin.py`**
        - Six request-level cases cover the changelist, read-only detail, add GET/POST and change POST refusals,
          and deletion preserving the movie. Add/change cases failed against the existing admin; denying view and
          delete permissions separately broke the already-supported list/delete cases before restoration.
        - The form's review tests went with the form; entries cascade coverage joins in 1.3.e.
    - [x] **1.1.b Make `UserMovieDataAdmin` view-and-delete only in `admin.py`**
        - Removed the custom form and refused add/change permissions; retained standard view/delete permissions,
          list columns, filters, search and ordering.
        - App tests: 174 passed; admin rerun after typed request changes: six passed. Pinned container Ruff and
          Pyright with locked Django stubs passed.

- [x] **1.2 The record save keeps watched, the watchlist and the rating consistent — D3**

    **Goal:** Whatever a client sends, a saved rating leaves the film watched, a film newly watched leaves the
    watchlist unless the save keeps it there, and un-marking a rated film is refused, with no rule overriding a field
    the save supplies.

    - [x] **1.2.a Write the rule tests in `test_save_service.py` and `test_user_movie_data_api.py`**
        - Covered every record-save rule and converse, supplied-field precedence, contradictory request validation
          before TMDB, the rated-film conflict and atomic rollback, and explicit rating clear plus un-watch.
        - Coupled rule cases shared a test batch. New rules failed against the old service; the existing success
          cases failed under narrow unconditional-removal and stored-rating-lock mutations, then passed restored.
        - Updated existing API expectations and pinned 409 in OpenAPI.
    - [x] **1.2.b Add the rules module and call it from `UserMovieDataService.save`**
        - Applied supplied fields and then omitted-field rules inside the save transaction under the record lock;
          body-only contradictions fail before card lookup. The PATCH response declares 409.
        - All 184 app tests, pinned Ruff and Pyright passed.
    - [x] **1.2.c State the save's omission rule where it is written down (D14)**
        - Updated the input schema docstring, DEVELOPMENT-RULES' API contract and type-safety Pattern 3.

- [x] **1.3 Records keep a film's facts, entries its history, and existing data carries over — D1, D2, D8, D9, D10**

    **Goal:** The database refuses every record or entry that breaks D1's and D2's rules, every stored watched date and
    review survives as an entry through a migration that also runs backwards, and every writer and reader of a record
    works on the new shape.

    - [x] **1.3.a Write the model tests in `tests/integration/test_models.py`**
        - Covered rating/watched and join-time constraints, every entry constraint, summary states, effective-date
          ordering with creation-time and ID ties, and cascading deletion. Removing database checks produced fourteen
          behavioral failures; restored checks pass. Creation-order-only sorting fails the history-order assertion.
    - [x] **1.3.b Write the migration tests in `tests/integration/test_migrations.py`**
        - Populated historical rows exercise the forward carry of dates, reviews, ratings and timestamps, watched
          normalization, approximate join times, and the reverse's independent latest dated viewing and review.
        - Kept the earlier cleanup test targeting `0002`, with its other historical dependency states preserved.
    - [x] **1.3.c Reshape the models and write migration `0003`**
        - Added list join times, entry history with its constraints, descending effective-date order and one
          Exists/Subquery log-summary method; removed the record's date/review fields and constraints.
        - One reversible migration carries data between the shapes, flushing deferred constraints before later
          schema operations. The shared factory stamps active lists; record rating-range tests use watched rows.
    - [x] **1.3.d The record save drops the watched date and review and stamps join times**
        - Removed the obsolete input fields/checks and their tests. Shared stamping records only false-to-true
          transitions and retains times on departure and unchanged flags, including rule-driven watched changes.
        - Narrow omitted-stamp, repeated-stamp and departure-clear mutations fail; restored behavior passes.
    - [x] **1.3.e Reads, the Library and the admin follow the new record**
        - Removed the old response fields; the unfiltered Library selects facts only and its watched sort reads the
          latest dated entry, nulls last in both directions. Admin deletion now asserts entry cascade, demonstrated
          failing when cascade is disabled and passing restored.
    - [x] **1.3.f Every other direct writer of a record stays within the constraints**
        - Updated fixtures across authentication, core, movie and user-data tests to use valid watched states and
          stamped list membership; removed obsolete field assertions. Queried all backend writers and old-field uses.
        - Full backend suite: 1,315 passed. Restored targeted run: 61 passed. Pinned Ruff, full-backend Pyright
          (zero errors/warnings), and migration drift check passed. Planned entry guard follows immediately in 2.1.

### **Phase 2:** The record's saves and reads follow its entries and join times

_Exit criterion:_ with entries written through the ORM, un-marking a film with entries answers 409; an undone
watchlist removal keeps the film's place in the watchlist's `added` sort; and the record GET, the PATCH response, a
Library page, an enriched movie list and the movie detail carry a correct log summary, in one query for an enrichment
and two for a Library page.

- [x] **2.1 A film with entries can't be marked unwatched — D3**

    **Goal:** Un-marking a film that has an entry is refused under the record's lock, with a detail naming the cause, so
    no save leaves an unwatched film with an entry.

    - [x] **2.1.a Write the service and API tests**
        - Five new cases failed first, covering entry-only and combined rating/entry causes, rating clear plus
          un-watch, and unchanged persisted state including timestamps and other supplied flags.
    - [x] **2.1.b Check for entries in the rules module, under the lock the save already takes**
        - Refuse un-watching while any entry remains, naming the entry and rating causes from the resulting state.
        - All 179 app tests, Ruff and full-backend Pyright passed; the guard closes the planned migration follow-on.

- [x] **2.2 Every record read carries the film's log summary — D8**

    **Goal:** Wherever a film's state is read, it says whether the film has entries and the date of its latest logged
    viewing, with no added query.

    - [x] **2.2.a Write the tests**
        - Empty, undated-only and dated history are covered through GET, PATCH, Library and enrichment, with dated
          summaries on movie-detail and all discovery routes. Required response shapes include both fields.
        - Tests failed before the fields existed. Constant empty summaries fail discovery assertions; per-record
          entry queries break the fixed-cost enrichment and Library assertions. Restored targeted run: 69 passed.
    - [x] **2.2.b Add the fields and read every path through the annotated QuerySet**
        - Required `has_entries` and `last_logged_on` read annotations; saves re-read their response, and GET,
          Library and enrichment share the annotated QuerySet. Updated type-safety Pattern 2 and its read example.
        - Relevant combined suite: 240 passed. Ruff, full-backend Pyright and documentation checks passed.

- [x] **2.3 The Library's "date added" is when a film joined the filtered list — D9**

    **Goal:** `/watchlist` and any other one-list Library query order films by when they joined that list, falling back
    to the record's creation time where no single list applies.

    - [x] **2.3.a Write the sort tests in `test_watchlist_endpoint.py`**
        - Fourteen cases distinguish each individual list's join time, including watchlist plus rated, from
          creation-time fallback for no list, several lists and rated alone, in both directions.
        - Single-list cases failed first. Mapping every added sort to watched time breaks the fallback and other
          lists' assertions; restored endpoint run passes all 42 cases.
    - [x] **2.3.b Give `ordered_for_library` the filtered list**
        - The service selects one list's timestamp only when exactly one membership filter is active; ordering
          retains nulls-last and TMDB-ID ties. All 201 app tests, Ruff and full-backend Pyright passed.

- [x] **2.4 Undoing a removal puts a film back in its place — D1, D5**

    **Goal:** A save sent with `undo: true` restores a list without moving the film to the top, while a removal and a
    re-add by hand does move it.

    - [x] **2.4.a Write the tests**
        - Covered all three lists' retained join times, first-join stamping and rules under Undo, watched locks,
          a body with only Undo, omission from returned state, and watchlist position after Undo versus a fresh add.
        - Retained-time cases failed first; ignored Undo also breaks the corrected ordering scenario. Narrow
          mutations counting Undo as a field, skipping rules/stamps, or restoring every re-add all fail behaviorally.
        - Corrected test authentication under its frozen clock; restored app suite: 211 passed.
    - [x] **2.4.b Add `undo` to `UserMovieDataPatchSchema` and pass it to the save's stamping**
        - Optional boolean affects only false-to-true join-time restoration when a stored timestamp exists; all
          validation and watched-lock rules remain active. Ruff and full-backend Pyright passed.

### **Phase 3:** A film's viewings and reviews are logged, corrected and read

_Mode:_ `slice` — closes on the tracking journey (criterion 1), from a watchlist save through a logged viewing and a
rewatch, passing in a backend test and on the browsable stack.

- [x] **3.1 Logging an entry keeps the viewing and applies the rules — D2, D3, D4, D6, D7**

    **Goal:** A signed-in user can log a viewing or a review of any film, stored or not; the server dates it in the
    user's time zone, sets Liked and the current rating, and marks the film watched and off the watchlist exactly where
    D3 says.

    - [x] **3.1.a Write the schema tests in `tests/unit/test_schemas.py`**
        - Covered complete-write defaults, required Liked/zone, rating/review bounds, NUL refusal, whitespace
          normalization, and invalid zone names including malformed paths and oversized names. Validator cases failed
          before implementation; optional-required-field and changed-default mutations fail and pass restored.
    - [x] **3.1.b Write the service tests in `tests/integration/test_entry_service.py`**
        - Covered stored/unstored cards, upstream failures without writes, each watchlist rule and converse,
          current-rating order, body-only 400s before TMDB, local today/made-on, and Chicago's local join date.
        - Coupled behaviors shared a red batch against the service scaffold, then passed with the implementation.
    - [x] **3.1.c Write the API tests in `tests/integration/test_entries_api.py`**
        - Covered the full create response, ownership, authentication, input errors, upstream statuses and exact
          OpenAPI errors. Added session-create CSRF cases with persisted-success assertions. Routes failed first.
    - [x] **3.1.d Add the schemas, `UserMovieEntryService.create`, the entry-create rules and the route**
        - Shared the existing card lookup between saves and entries; validated before lookup; created history, Liked,
          current rating and watched/watchlist transitions atomically under the parent lock, returning its summary.
        - Oversized unknown zone names raise a filename-length OSError in the installed zoneinfo loader; that
          specific errno is normalized to validation failure. Other filesystem errors still propagate.
    - [x] **3.1.e Show an un-marking save and an entry create racing for one film**
        - Real threads and transactions queue behind a held parent-row lock, using database waiters to establish each
          order. Both finish watched with one entry; create-first returns a 409 for un-watching.
        - Removing the entries guard makes create-first fail with an allowed un-watch, demonstrating the queue order.
    - [x] **3.1.f Name the entry service in the service-layer strategy and TECHNICAL-OVERVIEW (D14)**
        - Named private viewing/review history and the shared card lookup beside record saves.
        - Full user-data and authentication suites: 564 passed. Ruff, full-backend Pyright and Markdown checks passed.

- [x] **3.2 An entry can be corrected or removed — D4, D6**

    **Goal:** Any entry, old or new, can be replaced or deleted; an edit changes the current rating only where D4 says
    and never watched or the watchlist, and a delete changes nothing on the record.

    - [x] **3.2.a Write the service and API tests**
        - Covered complete replacement/default clearing, immutable made-on, Liked stamping, unchanged watched and
          watchlist flags, and all current-rating edit cases, including review-only corrections after direct re-rating.
        - Verified summaries after later/earlier/cleared dates; deletes preserve facts and return the deleted entry
          with a fresh summary. Older/latest deletion tests fail under recomputed-rating mutation and pass restored.
        - Covered no user, missing/unowned/wrong-film entries, bad IDs, semantic validation, exact OpenAPI statuses
          and session edit/delete CSRF. Route-absence and cascade-disabled reconstructions fail and pass restored.
    - [x] **3.2.b Add `edit` and `delete` to `UserMovieEntryService` and their routes**
        - Lock the owning record before entry lookup. Edits replace only entry content, Liked and the specified
          current-rating cases; deletes keep record facts and return a snapshot taken before deletion.
        - Coupled edit/delete behavior was tested in one red batch; final user-data/auth suites: 601 passed.
          Ruff and full-backend Pyright passed.

- [x] **3.3 A film's entries are read with its record — D2, D6**

    **Goal:** A page can show a film's state and its entries, latest first, from one call that never reaches TMDB.

    - [x] **3.3.a Write the tests**
        - Six cases failed against the absent GET route, then passed with default/untracked responses, privacy,
          effective-date and creation/ID ordering, log summaries, auth/path validation and exact OpenAPI statuses.
        - Query count stays fixed from one to 31 entries; reads make no TMDB request.
    - [x] **3.3.b Add `MovieEntriesSchema`, the read in `UserMovieEntryService` and its route**
        - Compose the annotated owner-scoped record read and one ordered entry query; return an explicit default
          record and empty entries when no record exists. All 299 app tests, Ruff and full-backend Pyright passed.

- [x] **3.4 Saves, entry creates and entry edits share one count — D6**

    **Goal:** Logging and correcting entries can't grow the stored catalogue through TMDB faster than the save limits
    allow.

    - [x] **3.4.a Extend `test_save_limits.py`, and add 429 to the create and edit routes' OpenAPI statuses**
        - Mixed PATCH/POST/PUT requests hit the shared 31st-write refusal with Retry-After in bearer and session
          modes; failed before the route throttles. Exact OpenAPI expectations now include 429 for create/edit.
        - Thirty-one entry reads/deletes remain available without consuming the save count. Giving either read or
          delete the save throttle breaks that assertion; restored behavior passes.
    - [x] **3.4.b Give the create and edit routes the record save's two `SaveThrottle` windows and 429**
        - Both windows use the existing user/window counters. Reads and deletes remain unthrottled.
        - All 302 app tests, Ruff and full-backend Pyright passed.

### **Phase 4:** Viewings are listed across films, and the tracking journey holds end to end

_Exit criterion:_ on the browsable stack, a scripted scenario signed in as the dev user runs criterion 1's journey on
a film not yet stored, restores a watchlist removal with `undo: true` and finds the film in its earlier place, and
sees its 31st write within one minute answer 429.

- [x] **4.1 The cross-film list pages a user's dated entries — D6**

    **Goal:** A timeline of a user's viewings can be read a page at a time, newest first, with each film's title,
    release date and poster, and no undated entry.

    - [x] **4.1.a Write the tests**
        - Covered owner-only dated entries, effective descending viewing/creation/ID order, full reviews and stored
          card fields, numbered pages, empty past-end pages, bounds, authentication and exact OpenAPI statuses.
        - Route/data tests failed first; query-bound cases failed with unbounded schemas before constraints were
          added. Removing the activity route's authority check makes the anonymous-read test fail; restored cases pass.
        - Service query capture proves one count and one joined-row query.
    - [x] **4.1.b Add `ActivityQuerySchema`, `ActivityEntrySchema`, the service method and the route**
        - Page through `paginate_queryset` in `PaginatedResponse[ActivityEntrySchema]`, joining card data with the
          page and registering the static route before TMDB-ID routes. All 310 app tests, Ruff and Pyright passed.
    - [x] **4.1.c The pagination strategy states both database-served envelopes (D14)**
        - Film lists retain the null-cursor movie envelope; dated entry lists use the generic envelope. Both compare
          page with total_pages for continuation. Markdown checks passed.

- [x] **4.2 Pin the tracking journey in one backend test — D3, D4, D5, D6, D9**

    **Goal:** Criterion 1's journey, which composes the rules, the current rating, the entry routes and the Library,
    stays pinned by one test.

    - One API test saves an unstored film to the watchlist, logs today's viewing with rating/review, checks record
      and every Library filter plus activity, then queues a rewatch and confirms both entries retain their own
      reviews/ratings in latest-first order. TMDB is fetched once.
    - Keeping a logged film on the watchlist makes the new journey fail; restoring the rule passes. All 311 app
      tests, Ruff and full-backend Pyright passed.

- [x] **4.3 Check the journey on the browsable stack**

    **Goal:** The entry routes compose through the real stack (routing, sign-in, CSRF, TMDB and the Redis counters),
    with what ran and the result recorded here.

    - Ran `live-journey.py` against the worktree's browsable stack, signed in as dev with bearer, CSRF and Origin
      headers. The fresh development database had zero movie cards before the run.
    - Real TMDB-backed saves, today's viewing rated 7, a rewatch rated 9, all Library filters, both history reads,
      and Undo's earlier watchlist place passed. A fresh minute allowed 30 writes and refused the 31st with 429 and
      Retry-After. All 15 live checks passed.
    - Kept the script, `live-journey-output.json` and the initial card-count evidence in the work unit's gitignored
      personal folder. The five-service stack remains running for the frontend smoke checks.

### **Phase 5:** Pages can build on the new record, and the documents state it

_Mode:_ `layer` — closes on the frontend's shared layer (the new record, the Undo mark, entry reads and writes, the
star display and the rewatch icon) and ADR-047, with every living site stating the new rules.

_Exit criterion:_ the save layer's and the display components' tests pass (criteria 12 and 13), the browse,
movie-detail and sign-in smoke specs pass on the new record, and 5.7's searches find no living site stating a replaced
rule.

- [x] **5.1 The frontend reads the new record — D12**

    **Goal:** The generated types, the mocks and the save hook's empty state match the new record, and today's pages
    show and save as before.

    - [x] **5.1.a Regenerate `frontend/openapi.json` and `frontend/src/types/api.ts`**
        - Generated from this worktree's running backend, including entry routes and record summaries.
    - [x] **5.1.b Follow the new record through the frontend**
        - Empty records, shared mocks and save tests use `has_entries` and `last_logged_on`; the service comment
          qualifies omitted-field behavior. The empty-state test failed on the prior fields and passes restored.
        - All 3,206 related frontend tests, type-check, ESLint and Prettier passed. The browse, movie-detail and
          sign-in smoke specs passed all eight cases against this worktree's stack.

- [x] **5.2 The watchlist Undo sends the Undo mark — D12**

    **Goal:** Undoing a watchlist change from its toast puts the film back in its place, and the mark never shows in
    the film's state.

    - [x] **5.2.a Test the Undo's request in `useUserMovieState.test.tsx`**
        - Mounted and unmounted Undo requests failed without the mark; pending and settled state exclude it.
          A narrow state-spread mutation failed the pending assertion and passes restored.
    - [x] **5.2.b Send `undo: true` in the body of a save whose variables mark it as an Undo**
        - Kept the request mark outside overlay changes; updated the card-level Undo request expectation.
          All 239 related tests, types, ESLint and formatting passed.

- [x] **5.3 Pages can read a film's entries and the cross-film list — D12**

    **Goal:** A later page reads entries through the query factory, and a change of user clears them with every other
    user query.

    - [x] **5.3.a Write the tests**
        - MSW checks both reads and activity pagination, exact entry keys, request aborts and user-change resets.
          Narrow key, cancellation and reset-predicate breaks produced four behavioral failures; restored tests pass.
    - [x] **5.3.b Add the two entry reads to `userMovieDataService.ts`, and the key and queries to `lib/queries.ts`**
        - Reused the service cancellation contract and query signal adapter. All 377 related tests, types, ESLint
          and formatting passed; nine focused tests passed after matching cache fixtures to generated schemas.

- [ ] **5.4 Entry writes run as saves of their film — D12**

    **Goal:** An entry create, edit or delete waits its turn behind the film's other saves, is dropped on a change of
    user, and shows its effects when the server returns the record, with no rule copied into the client.

    - [ ] **5.4.a Write the tests with MSW**
        - An entry create queued behind a pending save of the same film is sent after it, and `useUserMovieState` then
          shows the record the create returned; a successful entry write refetches active Library and entry queries; a
          failed one shows an error toast, and none shows a success toast; every create and edit sends the browser's
          time zone
        - Two cases pass on arrival once the hook exists, so see each fail against a narrow break and pass restored: a
          pending entry write changes nothing shown (the overlay spreads only a save's `changes`), and signing out
          discards queued entry writes (`beginUserChange` clears the whole mutation cache;
          `useUserMovieState.ownership.test.tsx`)
        - Expect the other tests to FAIL initially
    - [ ] **5.4.b Add the entry-write hook in `frontend/src/hooks/movie/`, and teach the overlay entry writes**
        - Writes run under `saveMutationOptions`'s key, scope and `gcTime`, with `getSaveSignal` and `getChangeCount`;
          their variables say which kind of write they are, so the overlay takes a save's response as the record and an
          entry write's `record`, and lays only pending saves' fields on top
        - Add the three entry writes (POST, PUT, DELETE) to `userMovieDataService.ts`, each sending the save's abort
          signal. `HttpService` has no PUT, and its `create` and `remove` take no request config, so call `apiClient`
          with the config or extend `HttpService`
        - `time_zone` comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`
        - TECHNICAL-OVERVIEW's description of the frontend's saves names entry writes (D14)
        - Tests should now PASS

- [ ] **5.5 A rating shows as gold half stars, and a rewatch has its icon — D13**

    **Goal:** Later pages can show a user's rating at a glance and mark a rewatch with components that take no focus
    and read correctly to a screen reader.

    - [ ] **5.5.a Write the component tests**
        - `RatingStars` draws ratings 1 to 10 at half a star a point, earned stars only, as one image named "Rated 3.5
          out of 5 stars" ("Rated 4 out of 5 stars" for a whole number) with no focusable element, at both sizes; it
          renders nothing with no rating
        - `RewatchIcon` is named "Rewatch"
        - A `@ts-expect-error` render of `MovieUserScore` with `userRating` shows the prop is gone, failing type-check
          if it returns
        - Expect tests to FAIL initially

    - [ ] **5.5.b Add `RatingStars` and `RewatchIcon` to `frontend/src/components/movie/`**
        - Icons from `react-icons`, as the app's others; `imdb-gold` for the stars, the surrounding text color for the
          rewatch icon

    - [ ] **5.5.c Drop `MovieUserScore`'s user-rating props and chip, and show the stars on the theme page**
        - Remove `userRating`, `userRatingOnly`, their chip and their tests; `CineXplorerExtensionsSection` shows
          `RatingStars` at several ratings, with captions that describe them
        - The color-token and component-styling strategies show a user's rating as `RatingStars` in `imdb-gold` (D14)
        - Tests should now PASS

- [ ] **5.6 ADR-047 records how films are tracked — D14, D15**

    **Goal:** A later reader finds each decision D15 lists, with its reasons and the alternatives the PRD weighed, and
    each ADR it supersedes in part says which part.

    - Write ADR-047 reading `Proposed`, from `adr-template.md` and the ADR methodology strategy
    - ADR-043, ADR-027 and ADR-042 each add `Superseded in part by ADR-047 (part)` to their Status sections, naming
      the parts D14 lists, the rest of each decision standing

- [ ] **5.7 Every living site states the new rules — D14**

    **Goal:** Nothing outside the kept history states a rule this change replaced; criteria 14 and 15 are this task's
    definition of done.

    - Search for each rule D14's last bullet names: `watched_at` and `user_review`; an omitted field always staying
      unchanged; a record read into `UserMovieDataSchema` without the log summary; a user's rating as a numeric chip.
      Change each living site found; migrations, the migration tests, other ADRs and planning records stay as written
    - Record the searches and their results here; markdown lint passes

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; ADR-047
  set `Accepted` before merge; after merging `main`, regenerate the API types again if its schema changed; criterion
  16 is proven after merge, § 9)

## Implementation Notes

- **Backend tests run in this worktree's own stack** (`worktree-sessions.md` § Test Stack): both Compose files, the
  test stack's `dev-db`, `redis` and `backend`, and `pytest apps/{app}/` for the apps a task touched. API type
  generation (5.1.a) needs that stack or the browsable one running.
- **`--reuse-db`** is on in `backend/pyproject.toml`. Run once with `--create-db` after changing `0003` once it has
  been applied.
- **Migration tests** use Django's `MigrationExecutor` with `django_db(transaction=True)`, write rows through historical
  models, and migrate back to the leaf in teardown, as `test_review_cleanup_and_reversible_schema` does: foreign keys
  here are deferred, so rows inserted in one transaction leave pending trigger events and Postgres refuses the next
  `ALTER TABLE`. The data step
  and its reverse use historical models, which carry no custom QuerySet methods, so the reverse orders entries by D2's
  order itself.
- **Timestamps in the data step.** `auto_now_add` and `auto_now` hold in historical models, so creating an entry or
  saving a record sets its timestamps to the migration's time. Create the entries, then set their `created_at` and
  `updated_at`, and the records' join times and watched flags, with `QuerySet.update`, which leaves `updated_at` as it
  was; read each record's `updated_at` before any write.
- **The log summary as subqueries.** Annotate `has_entries` with `Exists` and `last_logged_on` with a subquery over
  the record's dated entries, not with a join and an aggregate, so pagination's count, `select_related` and the
  query counts stay as they are.
- **The time zone database.** Both backend images carry the system zone files from `python:3.13-alpine` (598 zones
  when probed), so `zoneinfo` knows `Pacific/Kiritimati`. The development lock also installs the `tzdata` package,
  while the production and base locks install it only on Windows, so production resolves zones from the system files.
  `ZoneInfo` raises `ZoneInfoNotFoundError`, a `KeyError`, for an unknown name and `ValueError` for a malformed one.
  In the development image, where it also searches the `tzdata` package, an over-long name raises `OSError` (a
  300-character name when probed), which production reports as `ZoneInfoNotFoundError`. Pydantic turns only the
  `ValueError` into a 422, so the validator catches the other two and raises `ValueError`.
- **Nothing logs a review or a time zone** (PRD § Security); log a record's or entry's ID where a log line is needed.
- **TMDB in tests:** service tests inject `TMDBStub`; API tests patch the client class through
  `TMDB_CLIENT_GET_MOVIE_DETAILS` in `tests/mock_paths.py`, since routers build their services at import.
- **A fixed clock:** `test_save_limits.py`'s `isolated_counters` builds the Pydantic date schemas before `freezegun`
  replaces the date class; a new test that freezes time around a date schema needs the same.
- **Threads and transactions:** 3.1.e needs `django_db(transaction=True)`, as `test_concurrent_first_saves_merge_fields`
  does; 3.4.a's sequential writes don't, as `test_save_limits.py`'s other tests use plain `django_db`.
- **Tests that pass on arrival:** a case the code already satisfies is seen failing against a narrow break of that
  behaviour, then passing once it is restored, and the completion notes say so.
- **The rules module's callers** pass the fields the request supplied, never the merged record, since a rule changes
  only a field the request left out (D3). Stamping (D1) runs after the rules, so a flag a rule turns on is stamped.
- **The overlay's types.** `useUserMovieState`'s `select` cast assumes only saves write the film's mutation key; 5.4
  changes that assumption and its comment.
- **The scripted check (4.3):** `node scripts/worktree.mjs browse` prints the stack's address, and the stack reaches
  TMDB with the worktree's `backend/config/.env`. Write until 429 last, since it holds every further write for the
  rest of the minute.

## Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven after merge** needs the change running on staging
from its deploy, so it is checked once the change has merged, with its evidence recorded before the work is archived.

### Implemented

- [ ] 1. **The tracking journey, through the API.** One backend test, signed in as one user, adds a film to the
  watchlist with a PATCH; creates an entry dated today with a rating of 7 and a review; and shows the film is watched,
  off the watchlist, rated 7, with `has_entries` true and `last_logged_on` today, listed by the Library's watched,
  rated and unfiltered queries and not its watchlist query, and in the cross-film list. It then adds the film to the
  watchlist again, creates a rewatch entry dated today with a rating of 9 and another review, and shows the film off
  the watchlist again, rated 9, with two entries in the film's list and the cross-film list, newest first, each keeping
  its own rating and review. (D3, D4, D5, D6, D9)
- [ ] 2. **The rules.** Tests show each row of D3's table and its converse: marking an unwatched film watched, rating
  it, and giving it an undated entry each remove it from the watchlist; an entry dated before the day it joined the
  watchlist, and rating or reviewing a film already watched, leave it on; a watched film can be added to the
  watchlist; a save supplying watched and the watchlist together keeps both; an entry edit and an entry delete change
  neither watched nor the watchlist. (D3)
- [ ] 3. **The watched lock.** Un-marking watched answers 409 and changes nothing while the film has a current rating,
  and again while it has an entry; `user_watched: false` with a rating answers 400; `user_watched: false` with
  `user_rating: null` succeeds on a film with no entries. Written through the ORM, a rating on an unwatched record is
  refused by the database, as is a violation of each other constraint in D1 and D2: a flag that is on without its join
  time; an entry with neither a date nor a review; a rewatch without a date; an entry rating of 0 or 11; an entry
  review that is empty, only whitespace, or 10,001 characters. The concurrency test leaves the film watched with its
  entry, whichever request takes the lock first. (D1, D2, D3)
- [ ] 4. **The current rating.** Tests show: a new latest entry with a rating sets it; a backdated entry with a later
  entry after it leaves it; an entry with no rating leaves it; editing the latest entry's rating sets it; editing only
  the latest entry's review after a re-rating by PATCH leaves the re-rating; editing an older entry's rating leaves
  it; moving an entry's date to make it the latest sets it to that entry's rating; deleting any entry leaves it; a
  PATCH with `user_rating: null` clears it. An undated entry orders by the day it was made, and same-day entries by
  when each was made. (D2, D4)
- [ ] 5. **Join times and the Library's sorts.** Tests show each list's join time is stamped when the film joins it
  and kept when it leaves; a removal undone with `undo: true` keeps the film's earlier place in the `added` sort,
  while a removal and a re-add without it moves the film to the top; `added` sorts by the single filtered list's join
  time and by `created_at` for no filter, several, or `rated` alone; `watched` sorts by last logged with films with no
  dated entry last in both directions; the unfiltered Library leaves out a record with no flag and no rating. (D1, D5,
  D9)
- [ ] 6. **Time zones.** With the clock fixed at a UTC time that is already tomorrow in `Pacific/Kiritimati`, an entry
  dated that zone's today is accepted and one dated a day later answers 400; a film added to the watchlist late in the
  evening in `America/Chicago`, which is the next UTC day, is removed by an entry dated that Chicago day; an unknown
  time zone answers 422; an undated entry's `made_on` is the zone's date. (D2, D3, D7)
- [ ] 7. **The endpoints' contract.** API tests show each route's answers and errors in D6's table, with the shared
  error body: create answers 201 and fetches an unstored film's card once; a film's list answers the defaults for a
  film the user has no record of, without a TMDB request; an entry with neither date nor review, a rewatch without a
  date, and a date after today each answer 400; each route answers 401 with no user, and 404 for another user's entry
  and for an entry addressed under another film; with CSRF checks enforced, a session-signed-in create, edit and
  delete answer 403 without a token; the cross-film list pages at the given size and holds no undated entry; deleting
  a record deletes its entries. Create and edit each set Liked from the body, stamping its join time when it turns on;
  an edit keeps the entry's `made_on` whatever its time zone and date, sets an omitted `watched_on`, `rating` or
  `review` to null and an omitted `rewatch` to false. The committed OpenAPI schema lists exactly these statuses for
  each route. (D5, D6)
- [ ] 8. **Shared limits.** With throttling enabled, a mix of 31 record saves, entry creates and entry edits within
  one clock minute leaves the 31st answering 429 with `Retry-After`; entry deletes and reads are not counted. (D6)
- [ ] 9. **The log summary on every read.** `has_entries` and `last_logged_on` are correct on the record GET, the
  PATCH response, every entry route's `record`, a Library page, an enriched movie list and the movie detail payload;
  the enrichment of a list stays one query and a Library page two, whatever the number of entries. (D8)
- [ ] 10. **The migration.** A migration test shows: a record with a date, a review and a rating becomes watched with
  one entry carrying all three; a record with only a review becomes one undated entry; a rated, unwatched record on
  the watchlist becomes watched and stays on the watchlist, with `watched_added_at` its `updated_at`; each list a
  record was on takes its `created_at`; and migrating back restores each record's latest watched date and review.
  (D10)
- [ ] 11. **The admin.** An admin test shows records can be listed and viewed but not added or changed, and deleting
  one deletes its entries. (D11)
- [ ] 12. **The frontend's save layer.** Component tests with MSW show: the watchlist Undo's PATCH body carries
  `undo: true`, and the Undo mark never appears in the shown state; an entry create queued behind a pending save of
  the same film is sent after it, and `useUserMovieState` then shows the record the create returned; a pending entry
  write changes nothing shown; a successful entry write refetches active Library and entry queries; a failed one shows
  an error toast; every entry create and edit sends the browser's time zone; signing out discards queued entry writes
  and resets the entry queries. (D12)
- [ ] 13. **The star display and rewatch icon.** Component tests show `RatingStars` draws ratings 1 to 10 as half a
  star a point, earned stars only, with the accessible names in D13 and no focusable element, and renders nothing
  with no rating; `RewatchIcon` is named "Rewatch"; `MovieUserScore` has no user-rating props. (D13)
- [ ] 14. **The old fields are gone.** A search of the repository outside migrations, the migration tests in
  `backend/apps/user_movie_data/tests/`, ADRs and the planning records in `.arc/backlog/`, `.arc/active/` and
  `.arc/reference/archive/` finds no `user_review` or `watched_at`. (D1, D5, D14)
- [ ] 15. **The documents.** ADR-047 reads `Accepted` with its date; ADR-043, ADR-027 and ADR-042 record their partial
  supersession; DEVELOPMENT-RULES' PATCH rule, the type-safety strategy's Pattern 3, the color-token and
  component-styling strategies, the pagination strategy, the service-layer strategy and TECHNICAL-OVERVIEW read as D14
  says. Every site D14's last bullet reaches (each site its search for a rule this change replaces or departs from
  finds, the known sites it names among them) states the new rule. (D14, D15)

### Proven after merge

- [ ] 16. **The migration runs on staging.** The deploy job for the merge commit applies the migration on staging (its
  log lists it applied), and the staging smoke run that follows the deploy passes. (D10)
