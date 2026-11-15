# PRD: User Movie Changes

**Type:** Technical
**Form:** detailed · RFC
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2026-11-14

---

## 1. Introduction / Context

Each signed-in user has one record per film (`UserMovieData`): watched, on the watchlist, liked, a current rating of
1–10, and the time the film last joined each list (`watched_added_at`, `watchlist_added_at`, `liked_added_at`).
Entries (`UserMovieEntry`) hold dated viewings and reviews. The rules layer (`apply_record_save`,
`apply_entry_create` and `stamp_list_joins` in `movie_state_rules.py`) keeps the record consistent under its row lock:
a rating or an entry marks an unwatched film watched; a record save that makes a film watched takes it off the
watchlist unless the save keeps it there, as does an entry dated on or after the day the film joined it, or an undated
one on an unwatched film; and Watched can't be un-marked while the film has a rating or an entry. ADR-047 records these
rules.

The Library gives a visitor two pages for their films: a Watchlist, and a Library of the films they've seen, with
Liked and Rated filters and History, a timeline of what they did. Three things it needs are missing:

- **A like doesn't mark a film watched.** Only a rating or an entry does. A film liked but never marked watched
  appears on no Library page, since Liked filters the films seen.
- **The record can't show changes over time.** It keeps only each list's latest join time: a re-join overwrites the
  earlier time, a removal leaves its time in place, a removal the visitor made can't be told from one a rule made, and
  a rating has no time at all. History's rows for adding to the watchlist, marking watched, liking and rating would
  move or be wrong if derived from these. A change that isn't recorded when it happens is lost for good, so the record
  has to exist from the day History's rows are wanted.
- **"Date added" under combined filters is the record's creation time** (`get_library`'s `added_field`). The Films
  view always filters watched films, so with the Liked filter on it sorts by when the film was first saved in any way,
  which can precede watching it by years.

A change's day must be the visitor's own, but record saves carry no time zone today; entry writes already do.

This work makes liking mark a film watched, keeps a private record of each change to a film's watchlist, watched,
liked and rating with its day fixed when written, and sorts date added by the first list filtered. It records changes
and erases them on Undo; which of them History shows is decided by History's read, built with the Library.

## 2. Goals

1. Every liked film is a watched film, and the database holds that, so the Library lists every liked film.
2. Each change a visitor makes to a film's watchlist, watched, liked or rating is recorded with the save that made it,
   on the visitor's day, so History can show it; an Undo erases what it undoes.
3. The Library's date added sorts by when the film joined the first list the read filters.
4. Existing clients keep working: a record save without a time zone stays valid, and no response shape changes.

## 3. Non-Goals

- **History's read and routes,** and the selection of which recorded changes it shows. The Library builds them,
  testing them by seeding recorded changes directly; here, tests assert the rows written and deleted.
- **Showing changes anywhere, and any control or toast.** The card controls show the like rule's results. In the
  frontend this work only fills the time zone on record saves (D10).
- **A backfill.** The stored join times hold only the latest join of each list, and before launch only test data
  exists.
- **Recording entries' own creation, edits or deletions,** which are their own history, or changes to join times.
- **An admin view of recorded changes,** and any read of them outside the owner's History.
- **An index for History's read.** Every one of its queries reads one user's rows first; the Library measures it.
- **The watched lock.** It is unchanged: it covers the current rating and entries, never a like.
- **The privacy policy's text,** which is drafted outside this repository (§ 6, Security and privacy).

## 4. Proposed Design

### D1. Liking marks a film watched, and un-marking Watched clears the like

In `apply_record_save`, beside the rating's rule:

- **A like marks watched.** A record save that supplies `user_liked: true` and leaves out `user_watched` marks an
  unwatched film watched. The existing rule then takes a film that changes from unwatched to watched off the
  watchlist, unless the save supplies `user_on_watchlist`.
- **Un-marking clears the like.** A save that supplies `user_watched: false` and leaves out `user_liked` also turns
  Liked off, once the watched lock allows the un-mark. While the film has a current rating or an entry, the un-mark
  still answers 409 with its reason and nothing changes, the like included.
- **A contradiction answers 400.** A save supplying `user_liked: true` with `user_watched: false` answers 400 with
  "A like requires a watched movie" and changes nothing. `UserMovieDataService.save` checks it before taking the
  lock, beside the rating's contradiction.
- **Entry writes already hold the rule.** Creating an entry marks the film watched (`apply_entry_create`), and an
  edited entry's film has an entry, so the lock keeps it watched.

Marking a film watched by a like stamps `watched_added_at` as any mark does (`stamp_list_joins`).

### D2. The database holds the like rule, and existing records are converted

- **A constraint,** `user_movie_liked_watched`: a record is not liked or it is watched, beside
  `user_movie_rating_watched`.
- **The conversion.** Before the constraint is added, a data migration marks each liked, unwatched record watched,
  setting its `watched_added_at` to its `liked_added_at` and leaving its watchlist as it is. The like's time replaces
  any earlier `watched_added_at`, which dated a watched period that had ended. A liked record always has
  `liked_added_at` (`user_movie_liked_added`), so `user_movie_watched_added` holds.
- **The reverse** removes the constraint and leaves converted records watched, as `0003_movie_entries` leaves the
  rated films it converted: the reverse can't tell which records it converted.
- The migration records no changes.

### D3. Record saves carry an optional time zone

- `UserMovieDataPatchSchema` gains `time_zone`, an optional IANA zone name, checked as `UserMovieEntryWriteSchema`'s
  is, through one shared validator: an unknown zone answers 422 and nothing changes.
- It isn't a field of the record: a save that supplies only `time_zone` still answers 400 ("Provide at least one movie
  data field").
- An absent or null `time_zone` dates the save's changes by their UTC day. This covers a tab opened before the deploy
  and a direct API call.

### D4. The record of changes

A new model in `user_movie_data`, `UserMovieChange`, holds one row per change to one field of one film's record:

| Column | Type | Holds |
| --- | --- | --- |
| `record` | foreign key to `UserMovieData`, cascading, `related_name="changes"` | the film's record |
| `field` | text, one of `watchlist`, `watched`, `liked`, `rating` | the fact that changed |
| `turned_on` | boolean | true for added, marked watched, liked, rated or re-rated; false for removed, un-marked, unliked or rating cleared |
| `rating` | small integer, nullable | for a `rating` row that set a rating, the new rating; otherwise null |
| `from_entry` | boolean | whether an entry create or edit made the change |
| `created_at` | timestamp | when the save was made, shared by every row that save writes |
| `made_on` | date | the save's day in the visitor's time zone (D3), or its UTC day without one |

- **Constraints:** `field` is one of the four values; `rating` is 1–10 or null; a `rating` row is `turned_on` exactly
  when it has a rating; a row of another field has none.
- **Write-once.** A row is inserted with its save and never changed, only deleted (D7, D8). `created_at` is its
  creation time, and there is no `updated_at` (Owner, 2026-11-14). The model's docstring and ADR-051 say so, since the
  rules for data integrity otherwise ask every model for both times.
- **A save's time.** Each save takes one time, once the record's row lock is held, and uses it for its rows'
  `created_at` and for the join times it stamps (`stamp_list_joins`). A film's saves run one after another under the
  lock, so on the server's clock their times follow the order they ran. A film's rows order by `created_at`, then ID.
  Under a frozen clock two saves would share a time and read as one save, so a test that makes several saves of one
  film advances the clock between them.
- **What History reads.** A save is the set of a film's rows sharing one `created_at`. History's read tells a turn-on
  from a reversal by `turned_on`, a record save's row from an entry write's by `from_entry`, and places each row on its
  `made_on`.

### D5. What a record save records

`UserMovieDataService.save` records in the same transaction, under the record's lock, where it compares the stored
record with the result: it keeps the previous list flags for `stamp_list_joins`, and the comparison extends to the
rating. For each of the four fields the save changed, with `from_entry` false:

- **A field the save supplied** is recorded, on or off (an Undo is the exception, D7).
- **A field a rule changed:**
    - a turn-on is not recorded, since it folds into the action taken: rating or liking an unwatched film records
      "rated" or "liked", not also "watched";
    - Liked turned off by un-marking Watched is recorded;
    - a watchlist removal is not recorded: a film that became watched leaves the watchlist by rule, and "added to the
      watchlist" survives it.

A field supplied at its current value changes nothing, and a save that changes nothing records nothing.

| The save supplies | The film before | Rows recorded |
| --- | --- | --- |
| `user_on_watchlist: true` | no record | watchlist on |
| `user_on_watchlist: false` | on the watchlist | watchlist off |
| `user_watched: true` | unwatched, on the watchlist | watched on |
| `user_watched: true, user_on_watchlist: true` | unwatched, on the watchlist | watched on |
| `user_rating: 8` | unwatched, on the watchlist | rating on, 8 |
| `user_liked: true` | unwatched, on the watchlist | liked on |
| `user_rating: 7` | watched, rated 8 | rating on, 7 |
| `user_rating: null` | watched, rated 8 | rating off |
| `user_watched: false` | watched and liked, unrated, no entries | watched off, liked off |
| `user_liked: false` | watched and liked | liked off |

### D6. What an entry write records

`UserMovieEntryService.create` and `edit` record in the same transaction, under the same lock, where they set Liked
and the current rating, with `from_entry` true and `made_on` from the write's own time zone:

- **A change to the current rating** is recorded as a `rating` row, on with the new rating: a create that becomes the
  film's latest entry with a rating, or an edit that changes the current rating under ADR-047's rule for edits.
  History never shows these rows. They keep a rating's latest row equal to the current rating, which an Undo relies on
  (D7).
- **Liked turned off** by the write (`liked: false` on a liked film) is recorded.
- **Its other changes** are part of the viewing and not recorded: marking the film watched, liking it and taking it
  off the watchlist.

An entry delete changes no fact of the record and records nothing. An entry write never clears the rating.

### D7. An Undo erases what it undoes

A record save marked `undo: true` (ADR-047's Undo mark, otherwise unchanged) records nothing for the fields it
supplied and changed. For each of them, it deletes that field's latest row (by `created_at`, then ID) when that row's
value differs from the value the Undo restores, which is the field's value after the save: for a flag, a different
`turned_on`; for the rating, a different value, a cleared rating counting as one. A field it
supplies at its current value is left alone. A change its rules make in another field is recorded as D5 says; in
practice, that is Liked turned off when an Undo un-marks Watched without supplying Liked.

The controls' toasts send these Undos (`prd-user-movie-controls.md`):

- **Undoing an addition** to the watchlist deletes the "added" row.
- **Undoing a removal** deletes the removal's row, so the addition before it is the latest again.
- **Undoing a removal a rule made** deletes nothing: none was recorded, and the latest watchlist row is the addition,
  matching what the Undo restores.
- **Undoing a like that marked the film watched** (`user_liked: false, user_watched: false, user_on_watchlist: true`)
  deletes the "liked" row. Watched and the watchlist recorded nothing in that save; their latest rows, such as the
  film's addition to the watchlist, already hold the values restored and stay.
- **Undoing a logging that changed the rating:** the controls delete the entry, then send the Undo with the earlier
  rating, which deletes the logging's `rating` row, the rating's latest.

**An older Undo,** sent after a later save changed the same field, finds a latest row that isn't the change it
undoes, so it can delete the wrong row or none. That edge is accepted, as the controls accept the rules acting on
such an Undo; History can then keep or lose the wrong change.

### D8. Recorded changes stay with their record

- Rows cascade with their record: deleting the film's record (`DELETE /user-movie-data/{tmdb_id}`, or the admin's
  delete through `delete_records`) or the account deletes them.
- No route in this work reads them, and the admin doesn't register the model. Only the owner's History will read them.

### D9. Date added with combined filters

`get_library` sorts `added` by the join time of the first of `watchlist`, `watched` and `liked` the read filters, in
that order. With none of them filtered (no filter, or `rated` alone) it sorts by the record's creation time, as now.
The Films view, which always filters watched films, therefore sorts date added by when each film was marked watched,
whatever else it filters.

### D10. The save layer sends the browser's time zone

`saveMutationOptions` adds `time_zone` from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) to every
record save it sends, Undo included, as `useMovieEntries` does for entry writes. A save-layer test asserts it on a
plain save and on an Undo, so a merge that drops it fails rather than quietly filing changes on their UTC day. The
tests that assert a record save's request body (the watchlist tests among them) expect it. `frontend/openapi.json` and
`frontend/src/types/api.ts` are regenerated.

### D11. Documents

- **ADR-051** (new), written `Proposed` with the work and set to `Accepted (YYYY-MM-DD)` before it merges. It records
  the like rule, its constraint and the conversion (D1, D2); the record of changes (D3 to D8): what it holds,
  including the day stored when written and record saves' optional time zone with its UTC fallback, what writes it
  and what each write records, how Undo erases rows, the older-Undo edge it accepts, and why there is no backfill;
  and date added with combined filters (D9). Its context notes that ADR-047 declined membership-history rows for
  want of a reader, which History now is; the join times stay.
- **ADR-047's Status** first line becomes "Accepted; Superseded in part by ADR-051 (which facts mark a film watched,
  and the date-added sort under combined filters)", the form the ADR methodology gives a partial supersession. The
  paragraph after it keeps the acceptance date, 2026-11-14, and the existing paragraph on what ADR-047 supersedes
  stays.
- **TECHNICAL-OVERVIEW**'s `user_movie_data` entry names the record of changes beside the record and entries.
- Docstrings on the changed rules and the new model state the new behavior.

## 5. Design Decisions

- **D1: liking marks a film watched,** over leaving the rule as it is, which hides a liked, never-watched film from
  every Library page, and over refusing a like on an unwatched film, which would fail the card's Like where it's
  offered. A like means the visitor has seen the film, as a rating does. **Un-marking Watched clears the like,** over
  refusing the un-mark while liked, as a rating or an entry refuses it: a like is a single mark, which the card
  controls' toast for the un-mark offers back with Undo, so the visitor isn't made to unlike first. _ADR:_ ADR-051
  (new), superseding ADR-047 in part (which facts mark a film watched).
- **D2: a database constraint,** over checks in the service alone, as the rules for data integrity require. **The
  conversion takes the like's time** for `watched_added_at`, over keeping an earlier one: the like rule makes the like
  the moment the film counts as watched, and an earlier time dates a watched period that ended. _ADR:_ covered by
  ADR-051.
- **D3: an optional time zone with a UTC fallback,** over a required one, which would fail every save from a tab
  opened before the deploy and every direct API call, and over a profile time zone, which is wrong while travelling
  (ADR-047). The fallback's UTC day is wrong only for those clients' saves made in the hours each day when their date
  and UTC's differ, as many hours as their offset from UTC: 6 in US Central, 13 in Auckland's summer. _ADR:_ covered
  by ADR-051.
- **D4: a record of changes,** over History rows derived from the join times, which move or are wrong (§ 1), and over
  viewings alone, which loses every other change for good. **The day is stored when written,** over computing it at
  read, so no read needs a time zone and a day doesn't move when the visitor travels, as an entry's `made_on` doesn't.
  **Two value columns,** `turned_on` and `rating`, over one integer encoding both, so a turn-on reads the same for
  every field. **No `updated_at`,** over keeping one that always equals `created_at`, since rows are write-once (Owner,
  2026-11-14). _ADR:_ ADR-051 records the record and its stored day; the column names are `none`, a tactical choice.
- **D5 and D6: turn-ons only when the visitor's own record save supplied them,** over recording every change, so
  History shows what the visitor did and not each rule's effect. **Reversals whatever caused them,** so History can
  hide a change that the film's next save reversed. **No watchlist removal a rule makes,** so "added to the watchlist"
  survives seeing or logging the film. **An entry write's rating changes, recorded and never shown,** so a rating's
  latest row always holds the current rating and an Undo of a logging finds its row. _ADR:_ ADR-051.
- **D7: an Undo deletes the row it undoes,** over recording the reversal it makes: an Undo means the change didn't
  happen. Recording undoing a removal as a new addition would show a new "added to the watchlist" on the Undo's day,
  where deleting the removal shows the original addition again, as the Undo mark keeps the original join time. _ADR:_
  ADR-051.
- **D8: rows cascade with their record,** so deleting a film's data or the account leaves none of its history.
  _ADR:_ covered by ADR-051. Leaving the model out of the admin is `none`, a tactical choice.
- **D9: the first filtered list's join time,** over the record's creation time when several lists are filtered: that
  time can precede watching by years, and the Films view, which always filters watched films, would fall back to it
  whenever Liked is on. _ADR:_ ADR-051, superseding ADR-047 in part (the date-added sort under combined filters).
- **D10: the save layer fills the zone,** over each caller passing it, as entry writes already do. _ADR:_ covered by
  ADR-051.
- **D11:** _ADR:_ `none`; documents follow the change.

**ADRs this work delivers:** ADR-051 (new), and the partial-supersession notice on ADR-047's Status.

## 6. Cross-cutting Considerations

### Security and privacy

- Every write path already scopes the record to the signed-in user (the save's `get_or_create` by user, the entry
  writes' lock by user and film), and rows are written only through them. Nothing here reads the rows.
- `time_zone` is client-supplied but sets only the day of the visitor's own changes, and is checked as a known IANA
  zone by the validator entry writes use.
- The site's privacy policy, drafted outside this repository, must name the record of changes before it is published:
  each change to a film's watchlist, watched, liked and rating, with its time and day, kept until the film's data or
  the account is deleted. It must already name dated entries and join times.

### Performance

- A record save adds one insert of up to four rows; an Undo adds a lookup and at most one delete per field it
  changed; an entry write adds at most two rows. All run under the lock the save already holds. No read changes cost.
- The foreign key's index serves the Undo's lookup, since one record has few rows.

### Testing

- Backend tests use the real test database through the services and the API, replacing only time where a day
  matters, and never patching the project's own services. They cover the like rule and its contradiction beside the
  lock, the constraint, the migration in both directions, every case of D5, D6 and D7, the time zone, cascades, and
  date added under combined filters.
- The existing migration test, which migrates back to the app's first migration and forward again, keeps passing
  with the new migrations.
- Existing tests that hold the replaced rules are rewritten to the new ones: every test that writes a liked, unwatched
  record directly (through the test factory, or a Django `save()` or `update()`), which the new constraint refuses;
  sends `user_liked: true` with `user_watched: false`; or depends on a like leaving a film unwatched or on the
  watchlist, or on combined filters sorting by creation time. Across the backend's tests, all of them are in
  `user_movie_data`'s integration tests:
    - `test_watchlist_endpoint.py`: the liked-only fixtures in `test_filters_and_default_state_selection`, with its
      expected results, and in `test_page_envelope_stored_card_and_empty_page`; and the case of
      `test_added_sort_uses_one_filtered_list` filtering the watchlist and watched, which now sorts by the watchlist's
      join time.
    - `test_models.py`: `test_record_timestamps_track_creation_and_save`, which likes an unwatched record; and the
      `user_liked` case of `test_active_flag_requires_join_time`, which starts from a watched record so it still tests
      `user_movie_liked_added` alone.
    - `test_save_service.py`: the `user_liked` case of `test_undo_keeps_existing_join_time`, which likes an unwatched
      record; `test_concurrent_first_saves_merge_fields`, whose like and watchlist saves interact under D1 when the
      watchlist save runs first, so it keeps proving that two first saves merge with fields whose rules don't interact
      in either order; and the watched lock's tests `test_unwatch_rated_record_changes_nothing` and
      `test_entries_lock_watched_and_roll_back_save`, which send a like with the un-mark, now a 400 before the lock is
      reached, so they test the lock without one.
    - `test_user_movie_data_api.py`: `test_entries_prevent_unwatching`, for the same reason.
- Frontend tests mock the network with MSW and read the request body of each record save.
- No page changes, so no smoke spec changes.

### Migration and rollout

- **One deploy:** migrations, then code. On staging and production the conversion runs over test data only, before
  launch. CI's deploy from `main` applies it; nothing is deployed by hand.
- **Clients on the old code:** a save without `time_zone` records its changes on their UTC day, and a like on an
  unwatched film comes back watched in the record the server returns, which the frontend shows.
- **The Library** builds History's change rows once this work is on `main`, and its pull request merges after this
  one.
- **The card controls** rewrite `saveMutationOptions`. Before this work's pull request merges, `main` is merged into
  its branch: if `main` then has the controls' rewrite, the time zone fill and its test go into it. If this work
  merges first, the controls keep the fill, the test stays, and the watchlist tests keep their expected bodies. API
  types are regenerated after that merge.
- **Rolling back** the migrations drops the table, losing recorded changes, and the constraint; converted records stay
  watched.

### Size

About 1,500 to 2,000 changed lines of code, tests and documents, most of them backend tests, forecast from the
tracking model's backend change (about 3,400 changed lines, two-thirds of them tests); about 1 to 1.5 days. It stays
one unit: the like rule, the record of changes and the date-added rule share the rules layer, the record's lock and
one migration review, and the record of changes records the like rule's effects, so they are built and tested
together. Date added alone would be a one-line change.

### User-facing impact

None on `main` at merge: no page offers a like today, and History doesn't exist yet. With the card controls, liking
an unwatched film shows it watched and, on the watchlist, takes it off with the watchlist's Undo; un-marking Watched
clears its like.

## 7. Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven after merge** needs the change running on staging,
so it is checked once the change has merged, with its evidence recorded before the work is archived.

### Implemented

1. **A like, then its Undo, through the API.** One backend test, at a time whose UTC day differs from Auckland's,
   adds a film to the watchlist with a PATCH, then likes it with `time_zone: "Pacific/Auckland"`. The film comes back
   watched, liked and off the watchlist; its rows are the addition and one `liked` row, turned on, not from an entry,
   on Auckland's day, with no `watched` or watchlist-removal row. An Undo PATCH supplying `user_liked: false`,
   `user_watched: false` and `user_on_watchlist: true` returns the film unwatched, unliked and on the watchlist,
   deletes the `liked` row, keeps the addition and records nothing. (D1, D3, D4, D5, D7)
2. **The like rule.** Tests show: liking an unwatched film on the watchlist marks it watched and takes it off, and
   keeps it on when the save supplies the watchlist; un-marking Watched on a liked film clears the like; with a
   current rating or an entry, that un-mark answers 409 and the film stays watched and liked; `user_liked: true` with
   `user_watched: false` answers 400 and changes nothing; an entry created with Liked on an unwatched film leaves it
   watched and liked. (D1)
3. **The database and the migration.** Written through the ORM, a liked, unwatched record is refused. Migrated
   forward, a liked, unwatched record is watched with `watched_added_at` equal to its `liked_added_at` and its
   watchlist unchanged, and other records are unchanged; migrated back, the constraint is gone and that record stays
   watched. The app's existing migration test passes. (D2)
4. **What a record save records.** Tests show each row of D5's table, and that a field supplied at its current value
   and a save that changes nothing record nothing. One save's rows share one `created_at`, equal to the join time it
   stamps. (D4, D5)
5. **What an entry write records.** Tests show: a create that becomes the latest entry with a rating records one
   `rating` row from the entry; a backdated create that isn't the latest records none; a create that marks the film
   watched, likes it and takes it off the watchlist records no row for those; a create or an edit with Liked off on a
   liked film records the like's removal from the entry; an edit that changes the latest entry's rating records it,
   and one that changes only its review records nothing; an entry delete records nothing. Each row's `made_on` is the
   write's day in its time zone. (D6)
6. **Undo.** Tests show each case D7 lists, that a field an Undo supplies at its current value keeps its rows, that
   an Undo records nothing for the fields it supplied and changed, and that an Undo un-marking Watched without
   supplying Liked records the like's removal. (D7)
7. **The time zone on saves.** A save's rows are on its zone's day, and on the UTC day when `time_zone` is absent or
   null; an unknown zone answers 422 and changes nothing; a save supplying only `time_zone` answers 400. (D3, D4)
8. **Rows stay with their record.** Deleting the film's record through the API, and deleting the user, delete its
   rows; the admin doesn't list them. (D8)
9. **Date added.** Tests show the Library's `added` sort, each direction, by `watched_added_at` when filtering watched
   and liked, by `watchlist_added_at` when filtering the watchlist and watched, and by creation time when filtering
   rated alone, over records whose times order differently in each. (D9)
10. **The save layer.** A frontend test shows a plain record save and an Undo each sending the browser's time zone,
    and the tests that assert a record save's body expect it. `openapi.json` and `api.ts` carry `time_zone` on the
    record save. (D10)
11. **The documents.** ADR-051 reads `Accepted` with its date; ADR-047's Status first line reads "Accepted;
    Superseded in part by ADR-051 (...)", naming the parts D11 names; TECHNICAL-OVERVIEW names the record of changes.
    (D11)

### Proven after merge

12. **The migrations run on staging.** The deploy job for the merge commit applies this work's migrations on staging
    (its log lists them applied), and the staging smoke run that follows the deploy passes. (D2, D4)

## 8. Open Questions

None.
