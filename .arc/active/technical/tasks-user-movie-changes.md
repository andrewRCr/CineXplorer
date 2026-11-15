# Task List: User Movie Changes

**PRD:** `prd-user-movie-changes.md`
**Created:** 2026-11-14
**Branch:** `technical/user-movie-changes`
**Base Branch:** `main`
**Status:** In Progress

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

- [ ] **2.3 A record save records what the visitor changed — D4, D5**

    **Goal:** Each record save writes, in its transaction under the record's lock, one row for each field the visitor
    changed and for a like a rule removed, sharing one time with the join times it stamps, on the visitor's day.

    - [ ] **2.3.a Write the recording tests in a new `tests/integration/test_movie_changes.py`**
        - Each row of D5's table, through `UserMovieDataService.save`, checking each row's `field`, `turned_on`,
          `rating` and `from_entry`
        - A rule's turn-on records nothing (rating or liking an unwatched film records no `watched` row), and neither
          does a rule's watchlist removal
        - A field supplied at its current value, and a save that changes nothing, record nothing; a refused save (400
          or 409) records nothing
        - One save's rows share one `created_at`, equal to the join times it stamps (a save marking watched and adding
          to the watchlist together). Write it under `freeze_time(..., auto_tick_seconds=1)`, so every clock read
          differs: under a plain frozen clock a second read returns the same instant and the case can't fail
        - `made_on` is the save's day in its zone, at a frozen time whose UTC day differs from the zone's, and the UTC
          day with the zone absent or null
        - Expect tests to FAIL initially; the cases that record nothing pass early, and the shared time fails first
          only for want of rows (see the notes)

    - [ ] **2.3.b Take one time per save and record its changes**
        - `UserMovieDataService.save` takes the time once the lock is held and passes it to `stamp_list_joins`, which
          stops taking its own; entry writes pass theirs too
        - One function in `movie_state_rules.py` records a save's changes from the four fields' values before it, the
          fields it supplied, its time and day, and whether an entry write made it: a field records when the save
          supplied it and it changed, or when it is a reversal other than the watchlist's. 3.1 and 3.2 build on it
        - Tests should now PASS, with the app's other tests

- [ ] **2.4 The save layer sends the browser's time zone — D10**

    **Goal:** Every record save the frontend sends, Undo included, carries the browser's IANA zone, and a test fails if
    a later change drops it.

    - [ ] **2.4.a Regenerate the API types** (`npm run generate-types` in `frontend/`, from this worktree's own stack),
      so the record save's body type carries `time_zone`

    - [ ] **2.4.b Write the save layer's test in `useUserMovieState.test.tsx`**
        - A plain save and its toast's Undo each send `time_zone` equal to the browser's zone
        - Every test that asserts a record save's exact body expects it, among them `useUserMovieState.test.tsx`,
          `MovieCard.test.tsx` and `session.test.tsx`
        - Expect tests to FAIL initially

    - [ ] **2.4.c Fill `time_zone` in `saveMutationOptions`' `mutationFn`**
        - Read the zone as `useMovieEntries` does for entry writes
        - Tests should now PASS

### **Phase 3:** Entry writes and Undo keep the record of changes true

_Exit criterion:_ with `main` merged, criterion 1's test (a like, then its Undo, through the API) passes, and the save
layer's test shows the browser's zone on a plain save and on an Undo.

- [ ] **3.1 An entry write records its rating changes and a like it turned off — D6**

    **Goal:** Entry creates and edits record, from the entry and on the write's day, exactly the changes they make to
    the current rating and a like they turn off, so a rating's latest row always holds the current rating.

    - [ ] **3.1.a Write the entry-write cases in `test_movie_changes.py`**
        - A create that becomes the latest entry with a rating records one `rating` row, turned on, from the entry
        - A backdated create that isn't the latest records nothing
        - A create that marks the film watched, likes it and takes it off the watchlist records no row for those
        - A create, and an edit, with Liked off on a liked film records the like's removal, from the entry
        - An edit that changes the latest entry's rating records it; one that changes only its review records nothing
        - An entry delete records nothing
        - Each row's `made_on` is the write's day in its zone
        - Expect tests to FAIL initially; the cases that record nothing pass early (see the notes)

    - [ ] **3.1.b Record from `UserMovieEntryService.create` and `edit`**
        - Each keeps the four fields' values before the write and records through 2.3.b's function, passing the rating
          as supplied and marking the rows as the entry's
        - Tests should now PASS, with the app's other tests

- [ ] **3.2 An Undo deletes the row it undoes — D7**

    **Goal:** An Undo records nothing for the fields it supplied and changed, and deletes each such field's latest row
    when that row's value differs from the one it restores, so History shows what it would have shown had the undone
    change never happened.

    - [ ] **3.2.a Write the Undo cases in `test_movie_changes.py`**
        - Each case D7 lists: undoing an addition deletes it; undoing a removal deletes it, leaving the addition
          latest; undoing a rule's removal deletes nothing; undoing a like that marked the film watched (the controls'
          body: `user_liked: false`, `user_watched: false`, `user_on_watchlist: true`) deletes the like's row and keeps
          the addition; undoing a logging that changed the rating (the entry deleted, then the Undo with the earlier
          rating) deletes the logging's `rating` row
        - An Undo writes no row for the fields it supplied and changed
        - A field an Undo supplies at its current value keeps its rows
        - An Undo un-marking Watched without supplying Liked records the like's removal
        - Expect tests to FAIL initially; the cases that delete nothing, and the like's removal, pass early (see the
          notes)

    - [ ] **3.2.b Write criterion 1's test in `test_movie_changes.py`, through the API**
        - At a frozen time whose UTC day differs from Auckland's: add a film to the watchlist, like it with
          `time_zone: "Pacific/Auckland"`, then send the Undo; check the record and the rows after each, as criterion 1
          states
        - Sign in inside the frozen clock, as `test_readding_with_undo_preserves_watchlist_place` does: `ninja_jwt`
          checks the access token's issue and expiry times, so a fixture's token, issued at real time, is refused at the
          frozen time. The token lasts 5 minutes (`SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]`), so sign in again after each
          clock advance, or keep every save within 5 minutes of signing in
        - Expect it to FAIL until 3.2.c

    - [ ] **3.2.c Delete instead of record for an Undo's supplied fields, in 2.3.b's function**
        - A field's latest row is its last by `created_at`, then ID
        - Tests should now PASS, with the app's other tests

- [ ] **3.3 ADR-051 records the like rule, the record of changes and date added — D11**

    **Goal:** A reader of the decision records finds the like rule, the record of changes and the date-added rule in
    ADR-051, and ADR-047 says which of its parts ADR-051 replaces.

    - [ ] **3.3.a Write ADR-051 reading `Proposed`**
        - The number is reserved for this work, not the next free one; start from `adr-template.md`
        - D11's contents: the like rule, its constraint and conversion; the record of changes, its stored day and
          record saves' optional zone with the UTC fallback, what each write records, how Undo erases rows, the
          older-Undo edge it accepts, why there is no backfill, and that rows are write-once; date added under
          combined filters
        - In its context, that ADR-047 declined membership-history rows for want of a reader, which History now is

    - [ ] **3.3.b Change ADR-047's Status**
        - First line: "Accepted; Superseded in part by ADR-051 (which facts mark a film watched, and the date-added
          sort under combined filters)"
        - The paragraph after it keeps the acceptance date, 2026-11-14; the existing paragraph on what ADR-047
          supersedes stays

    - [ ] **3.3.c Name the record of changes in TECHNICAL-OVERVIEW's `user_movie_data` entry**, and check that the
      docstrings of the changed rules, `get_library` and the new model state the new behavior

- [ ] **3.4 Merge `main` and apply what it holds — D10**

    **Goal:** The branch carries `main` as it stands before the pull request, with the time zone filled wherever the
    save layer then lives, and the API types matching the merged backend.

    - [ ] **3.4.a Merge `main` into the branch** (the Owner approves the merge)

    - [ ] **3.4.b Apply each case that holds**
        - If `main` has the card controls' rewrite of `saveMutationOptions`, the fill and its test go into it, and
          every record-save body its tests assert gains `time_zone`
        - If `main` added a `user_movie_data` migration, this work's migrations follow it
        - If the backend's schema changed, regenerate `frontend/openapi.json` and `frontend/src/types/api.ts`
        - Record here which cases held; a case that doesn't hold is noted as such

    - [ ] **3.4.c Run the tests the applied cases touch**

- [ ] **3.5 Check a like and its Undo from the save layer to the record of changes**

    **Goal:** The segment's exit criterion is shown on this branch after `main`'s merge, with what ran and the result
    recorded here.

    - Run `test_movie_changes.py` in this worktree's test stack, and the save layer's time zone test
      (`useUserMovieState.test.tsx`, unless 3.4.b moved it) through `arc-offload`

### **Phase 4:** Verification

- [ ] **4.1 Verify the work** (load `archive-completed.md` § 1, with the Verification note below)

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
- **The card controls' branch** has rewritten `saveMutationOptions` and is still in progress, so 3.4's first case is
  likely to hold if the controls merge first.
- **Cases that pass early.** Some cases hold before the code they pin: 1.1.a's 409 cases, 2.1.a's known and missing
  zones, the cases in 2.3.a, 3.1.a and 3.2.a where a write records or deletes nothing, and 3.2.a's like removal by an
  Undo's un-mark once 2.3.b lands. 2.3.a's shared time fails first only because no rows exist. See each fail against a
  narrow reconstruction of the behavior it pins (for example, the lock's checks skipped for a liked film, a required
  zone or one refusing every name, recording every changed field, a second clock read for the join times, an Undo
  deleting a field's latest row whatever its value, or an Undo recording nothing), then restore; an import error isn't
  that failure.
- **Verification.** ADR-051 is set `Accepted` before merge. If `main` is merged again after 3.4, recheck 3.4.b's cases
  and the API types. Criterion 12 is proven after merge, from the staging deploy.
- **Code review.** The code review before the push (`archive-completed.md` § 5) is the PRD's one migration review:
  brief it to cover `0004` and `0005` together, forward and back.

## Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven after merge** needs the change running on staging,
so it is checked once the change has merged, with its evidence recorded before the work is archived.

### Implemented

- [ ] 1. **A like, then its Undo, through the API.** One backend test, at a time whose UTC day differs from
  Auckland's, adds a film to the watchlist with a PATCH, then likes it with `time_zone: "Pacific/Auckland"`. The film
  comes back watched, liked and off the watchlist; its rows are the addition and one `liked` row, turned on, not from
  an entry, on Auckland's day, with no `watched` or watchlist-removal row. An Undo PATCH supplying `user_liked: false`,
  `user_watched: false` and `user_on_watchlist: true` returns the film unwatched, unliked and on the watchlist, deletes
  the `liked` row, keeps the addition and records nothing. (D1, D3, D4, D5, D7)
- [ ] 2. **The like rule.** Tests show: liking an unwatched film on the watchlist marks it watched and takes it off,
  and keeps it on when the save supplies the watchlist; un-marking Watched on a liked film clears the like; with a
  current rating or an entry, that un-mark answers 409 and the film stays watched and liked; `user_liked: true` with
  `user_watched: false` answers 400 and changes nothing; an entry created with Liked on an unwatched film leaves it
  watched and liked. (D1)
- [ ] 3. **The database and the migration.** Written through the ORM, a liked, unwatched record is refused. Migrated
  forward, a liked, unwatched record is watched with `watched_added_at` equal to its `liked_added_at` and its
  watchlist unchanged, and other records are unchanged; migrated back, the constraint is gone and that record stays
  watched. The app's existing migration test passes. (D2)
- [ ] 4. **What a record save records.** Tests show each row of D5's table, and that a field supplied at its current
  value and a save that changes nothing record nothing. One save's rows share one `created_at`, equal to the join time
  it stamps. (D4, D5)
- [ ] 5. **What an entry write records.** Tests show: a create that becomes the latest entry with a rating records one
  `rating` row from the entry; a backdated create that isn't the latest records none; a create that marks the film
  watched, likes it and takes it off the watchlist records no row for those; a create or an edit with Liked off on a
  liked film records the like's removal from the entry; an edit that changes the latest entry's rating records it, and
  one that changes only its review records nothing; an entry delete records nothing. Each row's `made_on` is the
  write's day in its time zone. (D6)
- [ ] 6. **Undo.** Tests show each case D7 lists, that a field an Undo supplies at its current value keeps its rows,
  that an Undo records nothing for the fields it supplied and changed, and that an Undo un-marking Watched without
  supplying Liked records the like's removal. (D7)
- [ ] 7. **The time zone on saves.** A save's rows are on its zone's day, and on the UTC day when `time_zone` is
  absent or null; an unknown zone answers 422 and changes nothing; a save supplying only `time_zone` answers 400. (D3,
  D4)
- [ ] 8. **Rows stay with their record.** Deleting the film's record through the API, and deleting the user, delete
  its rows; the admin doesn't list them. (D8)
- [ ] 9. **Date added.** Tests show the Library's `added` sort, each direction, by `watched_added_at` when filtering
  watched and liked, by `watchlist_added_at` when filtering the watchlist and watched, and by creation time when
  filtering rated alone, over records whose times order differently in each. (D9)
- [ ] 10. **The save layer.** A frontend test shows a plain record save and an Undo each sending the browser's time
  zone, and the tests that assert a record save's body expect it. `openapi.json` and `api.ts` carry `time_zone` on the
  record save. (D10)
- [ ] 11. **The documents.** ADR-051 reads `Accepted` with its date; ADR-047's Status first line reads "Accepted;
  Superseded in part by ADR-051 (...)", naming the parts D11 names; TECHNICAL-OVERVIEW names the record of changes.
  (D11)

### Proven after merge

- [ ] 12. **The migrations run on staging.** The deploy job for the merge commit applies this work's migrations on
  staging (its log lists them applied), and the staging smoke run that follows the deploy passes. (D2, D4)
