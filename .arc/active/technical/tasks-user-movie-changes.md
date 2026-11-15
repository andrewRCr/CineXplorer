# Task List: User Movie Changes

**PRD:** `prd-user-movie-changes.md`
**Created:** 2026-11-14
**Completed:** 2026-11-15
**Branch:** `technical/user-movie-changes`
**Base Branch:** `main`
**Status:** Complete

## Overview

**Purpose:** Make liking mark a film watched, keep a private record of each change to a film's watchlist, watched,
liked and rating on the visitor's own day, erased by Undo, and sort date added by the first list filtered, so the
Library lists every liked film and History can show a visitor's changes.

## Scope

### Will Do

- Apply the like rule in `apply_record_save` and `UserMovieDataService.save`, hold it with the
  `user_movie_liked_watched` constraint, and convert liked, unwatched records in a reversible migration
- Sort `get_library`'s date added by the first of the watchlist, watched and liked the read filters
- Accept an optional `time_zone` on record saves through the validator entry writes use
- Add `UserMovieChange` with its migration, record changes from record saves and entry writes under the record's lock,
  and delete the row an Undo undoes
- Fill `time_zone` on every record save in `saveMutationOptions`, and regenerate the API types
- Rewrite the existing tests that hold the replaced rules, as the PRD's § 6 Testing lists them
- Write ADR-051, change ADR-047's Status, and name the record of changes in TECHNICAL-OVERVIEW
- Merge `main` before the pull request and keep the time zone fill wherever the save layer then lives

### Won't Do

- History's read or routes, or which recorded changes it shows; any page, control or toast
- A backfill, an admin view of recorded changes, or any read of them
- Change the watched lock
- The privacy policy's text, drafted outside this repository
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** The like rule and date added hold in the saves, the reads and the database

_Mode:_ `layer` — closes on the record's rules as ADR-051 changes them, held by the database, with existing records
converted and the tests that held the replaced rules rewritten, before the record of changes records what those rules
do.

_Exit criterion:_ `user_movie_data`'s tests pass under the new rules: a like marks an unwatched film watched,
un-marking Watched clears the like, the database refuses a liked, unwatched record, the migration converts one going
forward and leaves it watched going back, and date added sorts by the first filtered list.

- [x] **1.1 Liking marks a film watched, and un-marking Watched clears the like — D1**

    **Goal:** A record save that likes an unwatched film leaves it watched, and off the watchlist unless the save keeps
    it there; un-marking Watched clears the like once the lock allows it; and a save that likes a film while un-marking
    Watched is refused with 400 before the film's card is read or its record locked.

    - [x] **1.1.a Write the like rule's tests in `test_save_service.py` and `test_user_movie_data_api.py`**
        - Covered first likes, watchlist removal or retention, join stamps, un-marking, locked liked films,
          contradictions before TMDB, and entry likes. Six new cases failed on the old rules. The three early-pass
          cases failed with the lock skipped for liked films and entry marking disabled, then passed restored.
    - [x] **1.1.b Rewrite the existing lock and concurrent-first-save tests**
        - Lock tests omit a contradictory like; concurrent watched and liked writes merge in either order.
    - [x] **1.1.c Apply the like rule and reject its contradiction before TMDB**
        - Likes mark watched; an allowed un-mark clears an omitted like; explicit watchlist choices stay in force.
        - All 328 app tests passed; pinned Ruff lint and format and app Pyright passed.

- [x] **1.2 The database refuses a liked, unwatched record, and existing ones become watched — D2**

    **Goal:** No write of any kind can leave a film liked but unwatched; every such record already stored is watched
    from the time it was liked; and the migration runs backward, leaving those records watched.

    - [x] **1.2.a Write the constraint and migration tests**
        - The ORM test failed before the constraint; the conversion test failed against an empty migration.
          Forward migration replaces an old watched time with the like time, preserves watchlist and other records;
          reversing leaves the conversion in place and permits liked, unwatched records again.
    - [x] **1.2.b Rewrite the existing liked, unwatched fixtures**
        - Updated library filters, join-time, Undo and timestamp fixtures to start liked films watched.
    - [x] **1.2.c Add `user_movie_liked_watched` and reversible migration `0004`**
        - Conversion precedes the constraint and flushes deferred constraints. Reverse conversion is a no-op.
        - All 663 app and core/movie integration tests passed with a fresh database; no migration drift.
          Pinned Ruff and app Pyright passed.

- [x] **1.3 Date added sorts by the first filtered list — D9**

    **Goal:** The Library's `added` sort reads the join time of the first list a read filters, in the order watchlist,
    watched, liked, so the Films view, which always filters watched films, sorts by when each film was marked watched.

    - [x] **1.3.a Test date added under single and combined filters**
        - Three films sort differently by creation, watchlist, watched and liked times, in both directions.
          Combined cases failed on the old rule; all 18 cases failed with deliberately wrong timestamp selection.
    - [x] **1.3.b Pick the first filtered list's join time in `get_library`**
        - Watchlist precedes watched, then liked; no list filter keeps creation time.
        - All 334 app tests, pinned Ruff lint/format and app Pyright passed.

### **Phase 2:** A record save records its changes on the visitor's day

_Mode:_ `slice` — closes on a change recorded from the browser's save to its row on the visitor's day, and erased by
its Undo.

- [x] **2.1 Record saves accept the visitor's time zone — D3**

    **Goal:** A record save may carry an IANA zone, checked exactly as an entry write's is, without counting as a field
    to save, and the service receives it for dating the save's changes; a save without one still works.

    - [x] **2.1.a Test record-save time zone validation**
        - Unknown, empty and over-long zones failed before validation. Known, absent and null cases failed
          against required/rejecting validation; zone-only failed when counted as a record field. Restored all.
    - [x] **2.1.b Share the zone validator and accept an optional patch zone**
        - Both schemas use the same annotated validator; the patch zone stays outside the four record fields.
        - All 342 app tests, pinned Ruff lint/format and app Pyright passed.

- [x] **2.2 The record of changes keeps one write-once row per change — D4, D8**

    **Goal:** `UserMovieChange` holds each change's field, new value, whether an entry write made it, its save's time
    and its day; the database refuses a row that breaks its rules; and rows go with their record or account.

    - [x] **2.2.a Test change constraints, cascades and admin exclusion**
        - Eight invalid-row cases failed with each relevant constraint removed individually; both corrected
          cascade cases failed with `PROTECT`; admin exclusion failed with the model registered. Restored all.
    - [x] **2.2.b Add `UserMovieChange` and reversible migration `0005`**
        - Stores the four fields, value, source, save time and day; rows are write-once and cascade with records.
        - All 353 app tests (before recording tests), pinned Ruff lint/format and app Pyright passed; no drift.

- [x] **2.3 A record save records what the visitor changed — D4, D5**

    **Goal:** Each record save writes, in its transaction under the record's lock, one row for each field the visitor
    changed and for a like a rule removed, sharing one time with the join times it stamps, on the visitor's day.

    - [x] **2.3.a Test record-save recording in `test_movie_changes.py`**
        - Covered all ten save-table cases, no-ops, refused saves, shared row/join time and zoned/UTC days.
          Fourteen cases failed without recording. Six cases failed with unchanged-value recording, history written
          before rejection, or a separate clock read for joins, then passed restored.
    - [x] **2.3.b Take one locked-save time and record changes in its transaction**
        - Extended the before-state to rating; the shared helper records supplied changes and non-watchlist
          reversals. Entry writes now pass their locked-save time to the join stamper too.
        - All 372 app tests, pinned Ruff lint/format and app Pyright passed.

- [x] **2.4 The save layer sends the browser's time zone — D10**

    **Goal:** Every record save the frontend sends, Undo included, carries the browser's IANA zone, and a test fails if
    a later change drops it.

    - [x] **2.4.a Regenerate the API schema and types** from this worktree's own backend.
    - [x] **2.4.b Test the browser zone on plain saves and toast Undo**
        - Both mounted and unmounted cases failed without the zone; `Pacific/Auckland` is supplied by the browser
          boundary. Updated every exact save-body assertion in the shared hook, movie card and session tests.
    - [x] **2.4.c Fill `time_zone` in the shared save mutation**
        - Every execution reads the browser's current zone. Related tests: 250 passed across 13 files;
          frontend lint and type-check passed after Chakra type generation.

### **Phase 3:** Entry writes and Undo keep the record of changes true

_Exit criterion:_ with `main` merged, criterion 1's test (a like, then its Undo, through the API) passes, and the save
layer's test shows the browser's zone on a plain save and on an Undo.

- [x] **3.1 An entry write records its rating changes and a like it turned off — D6**

    **Goal:** Entry creates and edits record, from the entry and on the write's day, exactly the changes they make to
    the current rating and a like they turn off, so a rating's latest row always holds the current rating.

    - [x] **3.1.a Test entry-write recording**
        - Current-rating and like-removal cases failed before recording. Backdated creates, derived marks,
          review-only edits and deletion failed under narrow reconstructions, then passed restored.
        - Both create and edit retain Auckland's day and mark their rows as from the entry.
    - [x] **3.1.b Record from entry creates and edits**
        - Both snapshot the four fields under the lock and use the shared helper; only rating is supplied.
          The new entry's day and its change rows use the locked-save time.
        - All 380 app tests, pinned Ruff lint/format and app Pyright passed.
        - Added an advancing-clock entry-create regression across Auckland midnight after the advisor's source
          inspection. It fails with a second join clock read and with the validation day's date, then passes
          restored. The full app run passed 392 tests; pinned Ruff and app Pyright also passed.

- [x] **3.2 An Undo deletes the row it undoes — D7**

    **Goal:** An Undo records nothing for the fields it supplied and changed, and deletes each such field's latest row
    when that row's value differs from the one it restores, so History shows what it would have shown had the undone
    change never happened.

    - [x] **3.2.a Test Undo row deletion and preservation**
        - Covered additions, explicit and derived removals, the like/unwatch/watchlist restore, logging with and
          without an earlier rating, unchanged fields, omitted like reversal, and timestamp/ID ordering.
        - Eight original cases and both ordering cases failed before implementation; preservation tests failed
          with unconditional deletion including unchanged supplied values, then passed restored.
    - [x] **3.2.b Test a like and its Undo through the authenticated API**
        - The Auckland save writes only the like beside the original addition; Undo restores the record and
          leaves only that addition. The test failed before Undo deletion.
    - [x] **3.2.c Delete differing latest rows for supplied changed Undo fields**
        - Omitted reversals still record normally. The recorder keeps fields already at the supplied value.
        - All 391 app tests, pinned Ruff lint/format and app Pyright passed.

- [x] **3.3 ADR-051 records the like rule, the record of changes and date added — D11**

    **Goal:** A reader of the decision records finds the like rule, the record of changes and the date-added rule in
    ADR-051, and ADR-047 says which of its parts ADR-051 replaces.

    - [x] **3.3.a Write ADR-051 reading `Proposed`**
        - Records the like invariant and conversion, private write-once rows and local days, save/entry/Undo
          recording, accepted older-Undo edge, cascade and rollback, no backfill, and combined-filter date added.
    - [x] **3.3.b Add ADR-047's partial-supersession Status**
        - Names the replaced watched facts and combined-filter date-added rule; retains its acceptance date and
          earlier supersessions.
    - [x] **3.3.c Name the record of changes in TECHNICAL-OVERVIEW and check changed docstrings**
        - The rules, library sort and write-once model docstrings describe the new behavior. Markdown lint passed.

- [x] **3.4 Merge `main` and apply what it holds — D10**

    **Goal:** The branch carries `main` as it stands before the pull request, with the time zone filled wherever the
    save layer then lives, and the API types matching the merged backend.

    - [x] **3.4.a Merge `main` at `9962f991` into the branch**
        - Clean automatic merge, including the architecture overview, movie-card tests and generated API files.
    - [x] **3.4.b Apply the cases present on `main`**
        - No card-controls rewrite was present: `saveMutationOptions` and its zone assertions remain in place.
        - No new `user_movie_data` migration was present: this branch retains `0004` and `0005` in order.
        - Home's API schemas were added. Regenerated schema/types from this worktree's backend; the automatic
          merge already matched that output, with the optional patch zone retained.
    - [x] **3.4.c Check the merged integration**
        - All 392 user-movie app tests and 284 related frontend tests across 18 files passed.
        - Pinned backend Ruff lint/format, app Pyright, frontend lint/type-check after type generation,
          migration drift and markdown checks passed.

- [x] **3.5 Check a like and its Undo from the save layer to the record of changes**

    **Goal:** The segment's exit criterion is shown on this branch after `main`'s merge, with what ran and the result
    recorded here.

    - Checked the merged code at `9461d9db`: all 39 cases in `test_movie_changes.py` passed in this worktree's
      test stack, and both browser-zone save/Undo cases in `useUserMovieState.test.tsx` passed through `arc-offload`.
    - The like and Undo API scenario retains only the original watchlist addition, on the approved row contract;
      plain browser saves and Undo both carry the browser's time zone.

### **Phase 4:** Verification

- [x] **4.1 Verify the work** (load `archive-completed.md` § 1, with the Verification note below)

    - Author criteria walk: criteria 1–11 met against the complete change at `b3fbace3` and the ADR acceptance;
      evidence is recorded below. Criterion 12 remains for the staging deploy after merge.
    - Full checks passed: 1,620 backend tests, 3,294 frontend tests across 112 files, all 21 E2E cases, pinned
      backend lint/format, full Pyright (zero errors or warnings), frontend lint/type-check, contrast validation,
      production build and markdown lint. Migration and regenerated API types have no drift.
    - Independent criteria verification pass 1 returned no findings over the same target. Criteria 1–11 are met;
      the explicitly post-merge criterion 12 stays open for staging proof. No implementation fixes were needed.

## Implementation Notes

- **Running the backend's tests.** Only in this worktree's own stack, one run at a time on the machine:
  `S="-f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml"`, then
  `docker compose $S up -d dev-db redis backend` and `docker compose $S exec -T backend nice -n 15 pytest
  apps/user_movie_data/`. `npm run generate-types` exports the schema from this stack's backend. Bring the stack down
  when idle. pytest reuses its database (`--reuse-db` in `backend/pyproject.toml`), which applies a new migration but
  never re-applies an edited one: after changing, reconstructing or restoring a migration, run once with
  `--create-db`.
- **Fixtures.** Each test file defines its own (`user`, `tmdb`, `service`, `signed_in`; see `test_save_service.py`,
  `test_entry_service.py` and `test_activity_api.py`). `create_user_movie_data` stamps the join time of each list a
  record is created on; `TMDBStub` serves cards without a request.
- **Time.** Freeze it with `freezegun` where a day or a join time matters. Under a frozen clock two saves of one film
  share a `created_at` and read as one save, so a test making several saves of one film advances the clock between
  them. A frozen clock also returns one instant to every read, so a test that one save takes one time uses
  `auto_tick_seconds`, which moves the clock at each read.
- **Migrations.** `test_migrations.py` drives `MigrationExecutor` back to earlier states and forward to the latest,
  so `0004` and `0005` must both reverse. `0003_movie_entries` flushes deferred constraints before later schema
  operations; follow it if `0004`'s data step and constraint meet the same error.
- **Cases that pass early.** Some cases hold before the code they pin: 1.1.a's 409 cases, 2.1.a's known and missing
  zones, the cases in 2.3.a, 3.1.a and 3.2.a where a write records or deletes nothing, and 3.2.a's like removal by an
  Undo's un-mark once 2.3.b lands. 2.3.a's shared time fails first only because no rows exist. See each fail against a
  narrow reconstruction of the behavior it pins (for example, the lock's checks skipped for a liked film, a required
  zone or one refusing every name, recording every changed field, a second clock read for the join times, an Undo
  deleting a field's latest row whatever its value, or an Undo recording nothing), then restore; an import error isn't
  that failure.
- **Release checks.** If `main` is merged again after 3.4, recheck 3.4.b's cases and the API types. Criterion 12
  requires the staging deploy and following smoke result after merge.
- **Code review.** The code review before the push (`archive-completed.md` § 5) is the PRD's one migration review:
  brief it to cover `0004` and `0005` together, forward and back.

## Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven after merge** needs the change running on staging,
so it is checked once the change has merged, with its evidence recorded before the work is archived.

### Implemented

- [x] 1. **A like, then its Undo, through the API.** One backend test, at a time whose UTC day differs from
  Auckland's, adds a film to the watchlist with a PATCH, then likes it with `time_zone: "Pacific/Auckland"`. The film
  comes back watched, liked and off the watchlist; its rows are the addition and one `liked` row, turned on, not from
  an entry, on Auckland's day, with no `watched` or watchlist-removal row. An Undo PATCH supplying `user_liked: false`,
  `user_watched: false` and `user_on_watchlist: true` returns the film unwatched, unliked and on the watchlist, deletes
  the `liked` row, keeps the addition and records nothing. (D1, D3, D4, D5, D7)
- [x] 2. **The like rule.** Tests show: liking an unwatched film on the watchlist marks it watched and takes it off,
  and keeps it on when the save supplies the watchlist; un-marking Watched on a liked film clears the like; with a
  current rating or an entry, that un-mark answers 409 and the film stays watched and liked; `user_liked: true` with
  `user_watched: false` answers 400 and changes nothing; an entry created with Liked on an unwatched film leaves it
  watched and liked. (D1)
- [x] 3. **The database and the migration.** Written through the ORM, a liked, unwatched record is refused. Migrated
  forward, a liked, unwatched record is watched with `watched_added_at` equal to its `liked_added_at` and its
  watchlist unchanged, and other records are unchanged; migrated back, the constraint is gone and that record stays
  watched. The app's existing migration test passes. (D2)
- [x] 4. **What a record save records.** Tests show each row of D5's table, and that a field supplied at its current
  value and a save that changes nothing record nothing. One save's rows share one `created_at`, equal to the join time
  it stamps. (D4, D5)
- [x] 5. **What an entry write records.** Tests show: a create that becomes the latest entry with a rating records one
  `rating` row from the entry; a backdated create that isn't the latest records none; a create that marks the film
  watched, likes it and takes it off the watchlist records no row for those; a create or an edit with Liked off on a
  liked film records the like's removal from the entry; an edit that changes the latest entry's rating records it, and
  one that changes only its review records nothing; an entry delete records nothing. Each row's `made_on` is the
  write's day in its time zone. (D6)
- [x] 6. **Undo.** Tests show each case D7 lists, that a field an Undo supplies at its current value keeps its rows,
  that an Undo records nothing for the fields it supplied and changed, and that an Undo un-marking Watched without
  supplying Liked records the like's removal. (D7)
- [x] 7. **The time zone on saves.** A save's rows are on its zone's day, and on the UTC day when `time_zone` is
  absent or null; an unknown zone answers 422 and changes nothing; a save supplying only `time_zone` answers 400. (D3,
  D4)
- [x] 8. **Rows stay with their record.** Deleting the film's record through the API, and deleting the user, delete
  its rows; the admin doesn't list them. (D8)
- [x] 9. **Date added.** Tests show the Library's `added` sort, each direction, by `watched_added_at` when filtering
  watched and liked, by `watchlist_added_at` when filtering the watchlist and watched, and by creation time when
  filtering rated alone, over records whose times order differently in each. (D9)
- [x] 10. **The save layer.** A frontend test shows a plain record save and an Undo each sending the browser's time
  zone, and the tests that assert a record save's body expect it. `openapi.json` and `api.ts` carry `time_zone` on the
  record save. (D10)
- [x] 11. **The documents.** ADR-051 reads `Accepted` with its date; ADR-047's Status first line reads "Accepted;
  Superseded in part by ADR-051 (...)", naming the parts D11 names; TECHNICAL-OVERVIEW names the record of changes.
  (D11)

### Proven after merge

- [ ] 12. **The migrations run on staging.** The deploy job for the merge commit applies this work's migrations on
  staging (its log lists them applied), and the staging smoke run that follows the deploy passes. (D2, D4)

### Verification evidence

The author walk covers the complete diff from `9962f991` through `b3fbace3`, the resulting tree and ADR-051's
acceptance. The full app run includes all backend checks named below; the full frontend run includes the save-layer
checks. Independent verification is recorded separately in the work unit's review log.

1. `test_movie_changes.py::test_like_and_undo_through_api_keep_only_original_addition` checks the returned and
   persisted flags, exact surviving rows and Auckland's day with the UTC day different.
2. `test_save_service.py` checks first likes, watchlist removal/retention, join stamps, unwatch clearing, entry likes
   and contradiction before TMDB. `test_user_movie_data_api.py` checks 400 and both locked 409 cases without writes.
3. `test_models.py::test_database_like_requires_watched_record` exercises the database constraint.
   `test_migrations.py` checks conversion, unchanged records and reverse behavior, and the existing full migration
   round trip. Both migrations also applied successfully to the worktree's development database.
4. `test_movie_changes.py` covers all ten save-table cases, unchanged fields, refused saves and a shared row/join
   time under an advancing clock. `record_changes` runs in the record save's locked transaction.
5. The same file checks entry create/edit rating and like-removal rows with Auckland days, backdated creates,
   derived marks, review-only edits and deletion; its advancing-clock test crosses Auckland midnight.
6. Its Undo tests check additions, explicit and derived removals, liking, logging with/without an earlier rating,
   unchanged supplied values, omitted like removal and timestamp/ID ordering.
7. It checks absent/null UTC fallback and Auckland's day; API tests check valid/optional zones, invalid, empty and
   over-long zones refused with 422, and a zone-only save refused with 400.
8. `test_user_movie_data_api.py::test_changes_cascade_with_record_or_user` checks API record deletion and account
   deletion while preserving unrelated rows. `test_admin.py::test_changes_are_not_registered_with_admin` passes.
9. `test_watchlist_endpoint.py::test_added_sort_uses_first_filtered_list` checks nine filter combinations in both
   directions, with distinct record, watchlist, watched and liked orders.
10. `useUserMovieState.test.tsx` observes `Pacific/Auckland` on a plain save and toast Undo, both mounted and
    unmounted. Movie-card/session request assertions include the zone. Regeneration from this worktree's backend
    leaves `openapi.json` and `api.ts` unchanged, with the optional patch zone present.
11. ADR-051 reads `Accepted (2026-11-15)`; ADR-047 retains its acceptance date and the required partial-supersession
    Status. TECHNICAL-OVERVIEW names `UserMovieChange`; both decision texts stand without planning history.
12. Not yet provable: requires the merge commit's staging deploy log and following staging smoke result.
