# Task List: User Movie Tracking

**PRD:** `prd-user-movie-tracking.md`
**Created:** 2026-11-13
**Branch:** `technical/user-movie-tracking`
**Base Branch:** `main`
**Status:** Pending

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

- [ ] **1.1 The admin lists, shows and deletes records, and no longer adds or changes them — D11**

    **Goal:** No admin form can write a record's flags past the rules, while staff can still find, read and delete
    records.

    - [ ] **1.1.a Rewrite `tests/integration/test_admin.py`**
        - Test: a superuser's changelist and record page answer 200, the record shown read-only; the add page and a
          change POST are refused and leave the record as it was; a delete from the admin removes the record and keeps
          its movie
        - The form's review tests go with the form; the entries-cascade case joins in 1.3.e, once entries exist
        - The changelist and record page answering 200 and the delete pass on arrival, since today's admin is a plain
          `ModelAdmin`: see each fail against a narrow break of the admin's permissions and pass restored
        - Expect the other tests to FAIL initially
    - [ ] **1.1.b Make `UserMovieDataAdmin` view-and-delete only in `admin.py`**
        - Remove `UserMovieDataAdminForm`; refuse add and change permissions, keep view and delete; the list, filters
          and search stay
        - Tests should now PASS

- [ ] **1.2 The record save keeps watched, the watchlist and the rating consistent — D3**

    **Goal:** Whatever a client sends, a saved rating leaves the film watched, a film newly watched leaves the
    watchlist unless the save keeps it there, and un-marking a rated film is refused, with no rule overriding a field
    the save supplies.

    **Note:** This lands on today's model, before the reshape: these rules read only the flags and the rating. Until
    1.3.f, fixtures still hold rated, unwatched records, so the 409 fires when a save supplies `user_watched: false`,
    never on another save of such a record (D3: only the record save can un-mark watched).

    - [ ] **1.2.a Write the rule tests in `test_save_service.py` and `test_user_movie_data_api.py`**
        - Each record-save row of D3's table and its converse: a rating marks an unwatched film watched and so takes it
          off the watchlist; marking an unwatched film watched takes it off; a save supplying `user_watched: true` and
          `user_on_watchlist: true` keeps both; rating a watched film, and adding a watched film to the watchlist,
          leave the watchlist alone
        - `user_watched: false` with a rating answers 400 before any TMDB request (as
          `test_body_only_errors_precede_tmdb` shows for today's 400); `user_watched: false` on a rated film answers
          409 with "Clear the rating before marking this film unwatched" and changes nothing; `user_watched: false`
          with `user_rating: null` succeeds
        - Rewrite the existing cases these rules change to the new contract, such as
          `test_each_field_can_be_set_from_empty_or_full_state` un-marking a rated film
        - The cases that leave the watchlist on and the null-rating success pass on arrival, since today's save ties
          neither the watchlist nor the rating to watched: see each fail against a narrow break (a rule applied whatever
          the film's state, the 409 reading the stored rating rather than the saved one) and pass restored
        - Expect the other tests to FAIL initially

    - [ ] **1.2.b Add the rules module and call it from `UserMovieDataService.save`**
        - One module in `apps/user_movie_data/services/` holds D3's rules. The save calls it inside its transaction,
          after `select_for_update`, with the record and the fields the request supplied; a rule changes only a field
          the request left out. 2.1 adds the lock's entries check to it, and 3.1 the entry-create rules
        - The 400 is a body-only check (`InvalidInputError`) made before the card lookup, beside today's; the rules
          module raises only the 409 (`ConflictError`), under the lock. Add 409 to the PATCH route's responses and to
          `test_openapi_declares_exact_statuses_and_shared_errors`
        - Tests should now PASS

    - [ ] **1.2.c State the save's omission rule where it is written down (D14)**
        - `UserMovieDataPatchSchema`'s docstring: an absent field stays unchanged except where the data's rules change
          it, and an explicit null clears a nullable field
        - DEVELOPMENT-RULES § API Contracts and the type-safety strategy's Pattern 3, in D14's words

- [ ] **1.3 Records keep a film's facts, entries its history, and existing data carries over — D1, D2, D8, D9, D10**

    **Goal:** The database refuses every record or entry that breaks D1's and D2's rules, every stored watched date and
    review survives as an entry through a migration that also runs backwards, and every writer and reader of a record
    works on the new shape.

    **Check:** the full backend suite once, at 1.3.f: the shared factory and fixtures in four apps change.

    **Note:** From 1.3.c until 1.3.f, the save, the schemas and the fixtures still name the removed fields, so the
    app's suite and pyright fail there by design. At 1.3's start, propose its subtasks as one increment.

    - [ ] **1.3.a Write the model tests in `tests/integration/test_models.py`**
        - Through the ORM the database refuses: a rating on an unwatched record; each flag that is on without its join
          time; an entry with neither a date nor a review; a rewatch without a date; an entry rating of 0 or 11; an
          entry review that is empty, only whitespace (the set `REVIEW_HAS_TEXT_PATTERN` covers), or 10,001 characters
        - Deleting a record deletes its entries. The log-summary QuerySet method gives `has_entries` and the latest
          dated `watched_on` for records with dated, only undated, and no entries. The entry-order method orders by
          `watched_on`, or `made_on` when undated, then `created_at`, then ID
        - Expect tests to FAIL initially

    - [ ] **1.3.b Write the migration tests in `tests/integration/test_migrations.py`**
        - A new test writes rows through `0002`'s historical models, migrates forward and back: a watched record with
          a date, a review and a rating becomes one entry carrying all three; a record with only a review becomes one
          undated entry and is marked watched; a rated, unwatched record on the watchlist is marked watched, stays on
          the watchlist and takes its `updated_at` as `watched_added_at`; each list a record was on takes its
          `created_at`; an entry takes the record's `updated_at` as its timestamps and that time's UTC date as
          `made_on`
        - Before migrating back, add entries at the leaf state so one record holds several: a later dated entry with no
          review, and an undated entry with a review that orders by its `made_on`. Migrating back restores each
          record's date from its latest dated entry and its review from its latest entry with one, by D2's order
        - The existing test migrates to `0002` instead of the leaf, keeping its checks of that migration
        - Expect tests to FAIL initially

    - [ ] **1.3.c Reshape the models and write migration `0003`**
        - `UserMovieData`: `watched_added_at`, `watchlist_added_at` and `liked_added_at`, and D1's four constraints;
          `watched_at`, `user_review` and their three constraints go
        - `UserMovieEntry` per D2's table: `record` (`related_name="entries"`, deleted with it), its constraints
          (`user_movie_entry_has_content`, `user_movie_entry_rewatch_dated`, rating range, review text and length),
          and a QuerySet method for D2's entry order, which 3.1–3.3 use for the current rating and a film's list
        - `UserMovieDataQuerySet` gains the one method that annotates `has_entries` and `last_logged_on` (D8); 1.3.e's
          sort and 2.2's reads use it
        - `0003` in this order: add the join times, and the entries table with its check constraints; the data step and
          its reverse; drop the old constraints and fields; add the record's new constraints. Django adds the entries
          table's foreign key and its index only as the migration ends, so the data step's inserts leave no foreign-key
          check pending
        - Postgres refuses an `ALTER TABLE` while inserted rows leave deferred foreign-key checks pending; if the steps
          after the data step are refused, end the data step (and its reverse) with `SET CONSTRAINTS ALL IMMEDIATE`.
          1.3.b's test, with rows present, is the probe
        - `create_user_movie_data` stamps the join time of each flag it turns on, so every later subtask can build
          records through it; `test_models.py`'s existing cases that set a flag directly set its join time, and those
          naming the removed fields go or move to the new ones. `test_database_refuses_invalid_state`'s ratings of 0
          and 11 go on watched records, through the factory, so they test the range and not only
          `user_movie_rating_watched`
        - `test_models.py` and `test_migrations.py` should now PASS

    - [ ] **1.3.d The record save drops the watched date and review and stamps join times**
        - Tests first in `test_save_service.py`: a flag that turns on stamps its join time with the current time,
          whether the save or a rule turned it on; a flag that turns off keeps its time; a flag left as it was keeps
          its time. Until the save drops the removed fields every save errors, and then the two keep cases pass with no
          stamping written: see each fail against a narrow break (a join time cleared when its flag turns off, every
          supplied flag stamped) and pass restored
        - `UserMovieDataPatchSchema` and `save` drop `user_review`, `watched_at` and the watched-date checks, with
          their test cases
        - Tests should now PASS

    - [ ] **1.3.e Reads, the Library and the admin follow the new record**
        - `UserMovieDataSchema` drops `user_review` and `watched_at` (and `test_schemas.py`'s field set with them);
          `with_state` stops reading the review, still leaving out a record with no flag and no rating
        - The `watched` sort orders by 1.3.c's `last_logged_on`, which the Library's query now annotates, records with
          no dated entry last in both directions: rewrite that case of `test_sort_nulls_last_and_id_ties`
        - `test_admin.py`: deleting a record from the admin deletes its entries. This passes on arrival, since the
          cascade lands in 1.3.c, so see it fail against a narrow break of the cascade and pass restored

    - [ ] **1.3.f Every other direct writer of a record stays within the constraints**
        - A fixture holding a rating marks its record watched; a flag a fixture turns on has its join time
        - Find the writers by searching every app for `UserMovieData.objects.create`, `create_user_movie_data` and a
          field set on a fetched record that is then saved. Known sites: `authentication`'s `test_csrf_protection.py`
          (`entry`, rated and unwatched), `core`'s `test_models.py`, and `movie`'s `test_movie_detail.py` and
          `test_endpoint_enrichment_integration.py`, which also name the removed fields
        - The full backend suite should now PASS

### **Phase 2:** The record's saves and reads follow its entries and join times

_Exit criterion:_ with entries written through the ORM, un-marking a film with entries answers 409; an undone
watchlist removal keeps the film's place in the watchlist's `added` sort; and the record GET, the PATCH response, a
Library page, an enriched movie list and the movie detail carry a correct log summary, in one query for an enrichment
and two for a Library page.

- [ ] **2.1 A film with entries can't be marked unwatched — D3**

    **Goal:** Un-marking a film that has an entry is refused under the record's lock, with a detail naming the cause, so
    no save leaves an unwatched film with an entry.

    - [ ] **2.1.a Write the service and API tests**
        - A film with an entry: `user_watched: false` answers 409 "Delete this film's entries before marking it
          unwatched"; with a rating too, "Clear the rating and delete this film's entries before marking this film
          unwatched"; nothing changes in either case
        - Expect tests to FAIL initially
    - [ ] **2.1.b Check for entries in the rules module, under the lock the save already takes**
        - Tests should now PASS. The concurrency test joins in 3.1.e, once an entry create exists

- [ ] **2.2 Every record read carries the film's log summary — D8**

    **Goal:** Wherever a film's state is read, it says whether the film has entries and the date of its latest logged
    viewing, with no added query.

    - [ ] **2.2.a Write the tests**
        - `has_entries` and `last_logged_on` are correct with no entries, only undated entries, and dated entries, on
          the record GET, the PATCH response, a Library page (`test_watchlist_endpoint.py`), an enriched movie list and
          the movie detail payload (`movie`'s `test_endpoint_enrichment_integration.py` and `test_movie_detail.py`)
        - An enrichment stays one query and a Library page two, whatever the number of entries
          (`test_movie_enrichment_query_optimization.py`, `test_library_service.py`). These pass on arrival, since no
          read touches entries yet: once 2.2.b lands, see each fail against a narrow break (the summary read per record
          from `record.entries`) and pass restored
        - Expect the other tests to FAIL initially
    - [ ] **2.2.b Add the fields and read every path through the annotated QuerySet**
        - `UserMovieDataSchema` gains `has_entries` and `last_logged_on`, which `from_record` reads from 1.3.c's
          annotation. `get_by_tmdb_id`, the PATCH response (re-read after the save), `get_library` and
          `MovieEnrichmentService` read through it
        - The type-safety strategy's Pattern 2 and its `read_movie_state` example read through the method (D14)
        - Tests should now PASS

- [ ] **2.3 The Library's "date added" is when a film joined the filtered list — D9**

    **Goal:** `/watchlist` and any other one-list Library query order films by when they joined that list, falling back
    to the record's creation time where no single list applies.

    - [ ] **2.3.a Write the sort tests in `test_watchlist_endpoint.py`**
        - `added` sorts by `watchlist_added_at`, `watched_added_at` or `liked_added_at` when exactly one of
          `watchlist`, `watched` and `liked` is set, with or without `rated` (a list-plus-rated case among them), and
          by `created_at` with no list filter, several, or `rated` alone; nulls last and TMDB-ID ties as today
        - The `created_at` cases pass on arrival, since `added` sorts by `created_at` for every query today: see them
          fail against a narrow break (`added` mapped to another field) and pass restored
        - Expect the other tests to FAIL initially
    - [ ] **2.3.b Give `ordered_for_library` the filtered list**
        - Tests should now PASS

- [ ] **2.4 Undoing a removal puts a film back in its place — D1, D5**

    **Goal:** A save sent with `undo: true` restores a list without moving the film to the top, while a removal and a
    re-add by hand does move it.

    - [ ] **2.4.a Write the tests**
        - A save with `undo: true` that turns a list back on keeps the stored join time, and stamps one where none is
          stored; rules, the lock and the statuses are as for any save; `{"undo": true}` alone answers 400
        - In the watchlist's `added` sort, a removal undone with `undo: true` keeps the film's earlier place, and a
          removal and re-add without it moves the film to the top
        - Only the kept join time and the kept place fail first: today's schema drops the unknown `undo` key, so such a
          save runs as any other, and the save refuses a body with no data field. Once 2.4.b lands, see each other case
          fail against a narrow break of what it pins (`undo` counted as a data field, `undo` skipping the rules or the
          stamp, a re-add keeping its stored join time) and pass restored
        - Expect the kept-time and kept-place tests to FAIL initially
    - [ ] **2.4.b Add `undo` to `UserMovieDataPatchSchema` and pass it to the save's stamping**
        - Tests should now PASS

### **Phase 3:** A film's viewings and reviews are logged, corrected and read

_Mode:_ `slice` — closes on the tracking journey (criterion 1), from a watchlist save through a logged viewing and a
rewatch, passing in a backend test and on the browsable stack.

- [ ] **3.1 Logging an entry keeps the viewing and applies the rules — D2, D3, D4, D6, D7**

    **Goal:** A signed-in user can log a viewing or a review of any film, stored or not; the server dates it in the
    user's time zone, sets Liked and the current rating, and marks the film watched and off the watchlist exactly where
    D3 says.

    - [ ] **3.1.a Write the schema tests in `tests/unit/test_schemas.py`**
        - `UserMovieEntryWriteSchema`: its defaults; a rating of 0 or 11, a review over 10,000 characters or holding a
          NUL, an unknown `time_zone` (`Mars/Base`, a name of 300 characters) or a malformed one (`../etc/passwd`,
          empty), and a missing `liked` or `time_zone` are refused; a whitespace-only review becomes null
        - Expect tests to FAIL initially

    - [ ] **3.1.b Write the service tests in a new `tests/integration/test_entry_service.py`**
        - An unstored film's card is fetched once (`TMDBStub`), and TMDB's failures write nothing; the record is created
          when there is none; `made_on` is today in the given zone; Liked follows the body, its join time stamped when
          it turns on
        - D3's entry-create rows and their converse: an entry marks an unwatched film watched; an undated entry takes
          an unwatched film off the watchlist, while one for a film already watched leaves it on; an entry dated on or
          after the day the film joined the watchlist, in the user's zone, takes it off; an entry dated before that day
          leaves it on, whether the film was watched or not
        - D4: a new latest entry with a rating sets the current rating; a backdated entry with a later one after it
          leaves it; an entry with no rating leaves it
        - 400, refused before any TMDB request with nothing written (no `Movie`, record or entry): neither a date nor a
          review; a rewatch without a date; a date after today in the zone
        - Time zones (criterion 6), with the clock fixed: at a UTC time already tomorrow in `Pacific/Kiritimati`, that
          zone's today is accepted and the day after refused; a film added late in the evening in `America/Chicago`,
          the next UTC day, is taken off by an entry dated that Chicago day; an undated entry's `made_on` is the zone's
          date
        - Expect tests to FAIL initially

    - [ ] **3.1.c Write the API tests in a new `tests/integration/test_entries_api.py`**
        - `POST /user-movie-data/{tmdb_id}/entries` answers 201 with the entry and the record after the write, its log
          summary included; 400 for each 400 above, with no TMDB request and nothing written; 401, 404 from TMDB, 422
          (an unknown `time_zone` among them) and TMDB's 502, 503 and 504, each with the shared error body; the OpenAPI
          schema lists exactly D6's statuses for the route (429 joins in 3.4)
        - A session-signed-in create without a CSRF token answers 403: add the case to `authentication`'s
          `test_csrf_protection.py`
        - Expect tests to FAIL initially

    - [ ] **3.1.d Add the schemas, `UserMovieEntryService.create`, the entry-create rules and the route**
        - `UserMovieEntrySchema`, `UserMovieEntryWriteSchema` and `UserMovieEntryWriteResponseSchema` in `schemas.py`,
          as D6 defines them (3.3.b and 4.1.b add the others); `time_zone` is refused unless `zoneinfo` knows it
        - `UserMovieEntryService` in `services/` takes its TMDB client by injection, with a factory in
          `service_factory.py`; it shares `UserMovieDataService.save`'s card lookup rather than copying it
        - The three 400s need only the body, the zone and the clock, so they are checked before the card lookup
          (`InvalidInputError`), as the save checks its body
        - One transaction under the record's lock: create the record if needed, add the entry, set Liked, then the
          current rating (D4, by 1.3.c's entry order) and the entry-create rules in 1.2.b's module
        - The route sits on `user_movie_data_router` and handles HTTP only; its `record` is read through the log-summary
          method
        - Tests should now PASS

    - [ ] **3.1.e Show an un-marking save and an entry create racing for one film**
        - A watched, unrated film with no entry: a `user_watched: false` PATCH and an entry create on two threads with
          real transactions; the film ends watched with its entry in either order (criterion 3)
        - The film is stored, so neither request reaches TMDB, and `test_concurrent_first_saves_merge_fields`'s barrier
          in the stub can't order them. Order them with a row lock the test holds: in its own transaction it locks the
          record (`select_for_update`), starts the first request, waits until one backend in this database waits on a
          lock (`pg_stat_activity` where `datname = current_database()` and `wait_event_type = 'Lock'`; each xdist
          worker has its own test database), starts the second, waits for two, and commits. Postgres's tuple lock
          queues the waiters in arrival order. Run both orders
        - It can pass on arrival: see the create-first order fail with 2.1's entries check removed (an unwatched film
          with an entry), which also confirms the order held, then pass restored

    - [ ] **3.1.f Name the entry service in the service-layer strategy and TECHNICAL-OVERVIEW (D14)**
        - Beside `UserMovieDataService`; TECHNICAL-OVERVIEW's description of the `user_movie_data` app names entries

- [ ] **3.2 An entry can be corrected or removed — D4, D6**

    **Goal:** Any entry, old or new, can be replaced or deleted; an edit changes the current rating only where D4 says
    and never watched or the watchlist, and a delete changes nothing on the record.

    - [ ] **3.2.a Write the service and API tests**
        - Edit replaces `watched_on`, `rating`, `review` and `rewatch`, an omitted nullable field becoming null and an
          omitted `rewatch` false; keeps `made_on` whatever the zone and date; sets Liked, stamping its join time when
          it turns on; leaves watched and the watchlist; refuses the three 400s
        - D4 on edit: editing the latest entry's rating sets the current rating; editing only its review after a
          re-rating by PATCH leaves the re-rating; editing an older entry's rating leaves it; moving an entry's date to
          make it the latest sets it to that entry's rating; clearing the latest entry's rating leaves the current
          rating
        - The edit's `record` carries a correct log summary after the entry's date moves later, moves earlier, and is
          cleared (criterion 9)
        - Delete answers 200 with the entry as it was and the record after, its log summary reflecting the delete;
          the current rating, watched and the watchlist stay. `DELETE /user-movie-data/{tmdb_id}` deletes the
          record's entries: that case passes on arrival, since the cascade lands in 1.3.c, so see it fail against a
          narrow break of the cascade and pass restored
        - Both routes: 401 with no user; 404 for a missing entry, another user's, and one addressed under another
          film; 422; their OpenAPI statuses (edit's 429 joins in 3.4); a session-signed-in edit or delete without a
          CSRF token answers 403 (`test_csrf_protection.py`)
        - Expect the other tests to FAIL initially
    - [ ] **3.2.b Add `edit` and `delete` to `UserMovieEntryService` and their routes**
        - `PUT` and `DELETE /user-movie-data/{tmdb_id}/entries/{entry_id}`, under the record's lock; an edit applies
          none of D3's rules
        - Both answer with the record re-read through the log-summary method after the write
        - Tests should now PASS

- [ ] **3.3 A film's entries are read with its record — D2, D6**

    **Goal:** A page can show a film's state and its entries, latest first, from one call that never reaches TMDB.

    - [ ] **3.3.a Write the tests**
        - `GET /user-movie-data/{tmdb_id}/entries` answers the record and its entries in the reverse of D2's order (an
          undated entry by its `made_on`, same-day entries by when each was made); a stored record with dated and
          undated entries carries a correct log summary (criterion 9); a film the user has no record of answers the
          defaults and no entries, with no TMDB request; only the user's own entries; 401 and 422; the route's exact
          OpenAPI statuses (200, 401, 422); a fixed number of queries whatever the number of entries
        - Expect tests to FAIL initially
    - [ ] **3.3.b Add `MovieEntriesSchema`, the read in `UserMovieEntryService` and its route**
        - Tests should now PASS

- [ ] **3.4 Saves, entry creates and entry edits share one count — D6**

    **Goal:** Logging and correcting entries can't grow the stored catalogue through TMDB faster than the save limits
    allow.

    - [ ] **3.4.a Extend `test_save_limits.py`, and add 429 to the create and edit routes' OpenAPI statuses**
        - With throttling enabled, 31 record saves, entry creates and entry edits mixed within one clock minute leave
          the 31st answering 429 with `Retry-After`; entry deletes and reads are not counted
        - The exact OpenAPI statuses 3.1.c and 3.2.a set for the create and edit routes gain 429
        - Deletes and reads going uncounted passes on arrival, since their routes carry no throttle: see it fail against
          a narrow break (a delete or read route given the save's throttle) and pass restored
        - Expect the other tests to FAIL initially
    - [ ] **3.4.b Give the create and edit routes the record save's two `SaveThrottle` windows and 429**
        - Tests should now PASS

### **Phase 4:** Viewings are listed across films, and the tracking journey holds end to end

_Exit criterion:_ on the browsable stack, a scripted scenario signed in as the dev user runs criterion 1's journey on
a film not yet stored, restores a watchlist removal with `undo: true` and finds the film in its earlier place, and
sees its 31st write within one minute answer 429.

- [ ] **4.1 The cross-film list pages a user's dated entries — D6**

    **Goal:** A timeline of a user's viewings can be read a page at a time, newest first, with each film's title,
    release date and poster, and no undated entry.

    - [ ] **4.1.a Write the tests**
        - `GET /user-movie-data/entries`: dated entries only, latest first by `watched_on`, then `created_at`, then ID,
          each with its film's `title`, `release_date` and `poster_path`; pages at the given size in the
          `PaginatedResponse` envelope, a page past the end empty with valid counts; `page` and `page_size` bounded as
          the Library's are (422 outside); only the user's own; 401; one count query and one row query; matched before
          `/{tmdb_id}`; the route's OpenAPI statuses
        - Expect tests to FAIL initially

    - [ ] **4.1.b Add `ActivityQuerySchema`, `ActivityEntrySchema`, the service method and the route**
        - Pages through `paginate_queryset`; the route is declared before the `/{tmdb_id}` routes
        - Tests should now PASS

    - [ ] **4.1.c The pagination strategy states both database-served envelopes (D14)**
        - § Database-Served Lists and § Cursor-Based Pagination's End-of-Results Signal, as D14 says

- [ ] **4.2 Pin the tracking journey in one backend test — D3, D4, D5, D6, D9**

    **Goal:** Criterion 1's journey, which composes the rules, the current rating, the entry routes and the Library,
    stays pinned by one test.

    - Write it in `test_entries_api.py` as criterion 1 states it. Its parts exist by now, so see it fail against a
      narrow break of a rule it relies on, then pass once that is restored

- [ ] **4.3 Check the journey on the browsable stack**

    **Goal:** The entry routes compose through the real stack (routing, sign-in, CSRF, TMDB and the Redis counters),
    with what ran and the result recorded here.

    - A script against the stack `node scripts/worktree.mjs browse` starts, signed in as the dev user with a bearer
      token and matching CSRF and Origin headers: add an unstored film to the watchlist; log an entry dated today,
      rated 7, with a review; read the record, the Library's watchlist, watched, rated and unfiltered queries, the
      film's entries and the cross-film list; add the film to the watchlist again and log a rewatch rated 9; take a
      second film off the watchlist, restore it with `undo: true` and read its place; last, write until one answers
      429
    - Keep the script and its output in the work unit's personal folder

### **Phase 5:** Pages can build on the new record, and the documents state it

_Mode:_ `layer` — closes on the frontend's shared layer (the new record, the Undo mark, entry reads and writes, the
star display and the rewatch icon) and ADR-047, with every living site stating the new rules.

_Exit criterion:_ the save layer's and the display components' tests pass (criteria 12 and 13), the browse,
movie-detail and sign-in smoke specs pass on the new record, and 5.7's searches find no living site stating a replaced
rule.

- [ ] **5.1 The frontend reads the new record — D12**

    **Goal:** The generated types, the mocks and the save hook's empty state match the new record, and today's pages
    show and save as before.

    **Check:** the browse, movie-detail and sign-in smoke specs on the worktree's browsable stack, since cards and the
    detail page read the record.

    **Note:** Type-check fails between 5.1.a and 5.1.b by design, until the code follows the regenerated types. At
    5.1's start, propose its subtasks as one increment.

    - [ ] **5.1.a Regenerate `frontend/openapi.json` and `frontend/src/types/api.ts`**
        - From this worktree's own backend container, with its stack running
    - [ ] **5.1.b Follow the new record through the frontend**
        - `useUserMovieState`'s empty state drops `user_review` and `watched_at` and gains `has_entries: false` and
          `last_logged_on: null`; so does `createMockUserMovieData` in `tests/mocks/movieData.ts`; tests that name the
          removed fields, `useUserMovieState.test.tsx` among them, move to the new ones
        - The comment on `saveUserMovieData` states the new omission rule (D14)
        - Type-check, related tests and the three smoke specs should PASS

- [ ] **5.2 The watchlist Undo sends the Undo mark — D12**

    **Goal:** Undoing a watchlist change from its toast puts the film back in its place, and the mark never shows in
    the film's state.

    - [ ] **5.2.a Test the Undo's request in `useUserMovieState.test.tsx`**
        - The Undo's PATCH body carries `undo: true` and the first save's doesn't
        - While the Undo is pending and after it lands, the shown state holds no `undo`: this passes on arrival, since
          the overlay spreads only `changes`, so see it fail against a narrow break (the mark spread into the state)
          and pass restored
        - Expect the body case to FAIL initially
    - [ ] **5.2.b Send `undo: true` in the body of a save whose variables mark it as an Undo**
        - The mark stays out of `changes`, which the overlay applies
        - Tests should now PASS

- [ ] **5.3 Pages can read a film's entries and the cross-film list — D12**

    **Goal:** A later page reads entries through the query factory, and a change of user clears them with every other
    user query.

    - [ ] **5.3.a Write the tests**
        - With MSW serving both reads, `movieEntriesQuery(tmdbId)` and `activityQuery(params)` return them under keys
          built from `entriesKey`; cancelling a read aborts its request, as `libraryQuery`'s does
        - A change of user resets them (`session.test.tsx`): this passes on arrival once the queries exist, since
          `resetUserQueries` resets every query but the session, so see it fail against a narrow break of that
          predicate and pass restored
        - Expect the other tests to FAIL initially
    - [ ] **5.3.b Add the two entry reads to `userMovieDataService.ts`, and the key and queries to `lib/queries.ts`**
        - The reads return `HttpService`'s `{ request, cancel }`, as `getUserMovies` does; 5.4.b adds the writes
        - Tests should now PASS

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
