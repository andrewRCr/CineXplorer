# PRD: User Movie Tracking

**Type:** Technical
**Form:** detailed · RFC
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2026-11-13

---

## 1. Introduction / Context

A signed-in user's data about a film lives in one record per user and film, `UserMovieData`: three flags
(`user_watched`, `user_on_watchlist`, `user_liked`), a rating of 1–10 (`user_rating`), one review (`user_review`) and
one watched date (`watched_at`). One call, `PATCH /user-movie-data/{tmdb_id}` (`UserMovieDataService.save`), sets or
clears any of them, and `GET /user-movie-data/movies` (`UserMovieDataService.get_library`) serves the Library: a
paginated list filtered by watchlist, watched, liked or rated and sorted by date added, watched date, rating, title or
release date. In the frontend, `useUserMovieState` shows each film's state from the list and detail payloads with its
pending and confirmed saves on top, and `saveMutationOptions` runs those saves, one film at a time, offering Undo after
a watchlist change.

The record can't hold what tracking films needs:

- **No history.** One `watched_at` holds one viewing, so logging a rewatch erases the earlier date, and one
  `user_review` holds one opinion, so a revised view replaces the old one. A rating can't be kept with the viewing it
  belongs to.
- **"Date added" is the record's creation time.** `ordered_for_library` sorts `added` by `created_at`, when the film
  first got any state: a film liked in March and put on the watchlist in November sorts on the watchlist as March.
- **No rules between fields.** Any combination of flags can be saved: a rated film that isn't watched, a film marked
  watched that stays on the watchlist. Controls that mark films watched, rate them and log viewings are planned, and
  each would have to repeat whatever rules hold between the fields, as would any other client.

This change replaces the record's single viewing and review with **entries**: many per film, each a dated viewing, a
review, or both, with its own rating. The record keeps the film's facts (watched, on the watchlist, liked, and one
current rating), records when the film joined each list, and enforces the rules between them in the backend's saves.
It reshapes the API to match: entry endpoints for one film and across films, the Library's sorts, and a record that
says whether the film has entries and when it was last logged. In the frontend it lands the shared layer that pages
and controls will draw (the entry queries and writes, a read-only star display for a rating, and a rewatch icon),
while today's pages keep working as they are.

## 2. Goals

1. **History survives.** Every viewing and every review is kept with its own date, rating and text; logging a rewatch
   or writing a new review never changes an earlier one, and any entry can be corrected or removed later.
2. **One set of rules, enforced by the server.** Watched, the watchlist, ratings and entries stay consistent whichever
   client writes them, with no rule left to a control to repeat.
3. **Lists sort by when a film joined them.** Each list's "date added" is when the film joined that list, and undoing a
   removal puts the film back in its place.
4. **Every record read carries the film's log summary.** Wherever a film's state is read, it says whether the film has
   entries and the date of its latest logged viewing, at no extra query.
5. **Existing data carries over, and today's pages keep working.** Every stored watched date and review survives as
   an entry carrying the record's rating, and every rating stays the film's current rating; the shipped watchlist
   toggles, their Undo and `/watchlist` keep working.
6. **A shared frontend layer.** Pages can read and write entries, show a rating as stars and mark a rewatch without
   changing the save layer again.

## 3. Non-Goals

- **No new pages or controls.** Cards keep their footer icons (only the watchlist toggle works), the movie detail page
  keeps its "Your Actions" buttons, and `/watchlist` keeps its plain list. There is no rating control, log or review
  dialog, Log button, Library page, Activity timeline or list of a film's entries on its page. The entry queries and
  writes, the star display and the rewatch icon land unused by any page; the star display appears only on the
  development theme page. The data model's migration warrants a review of its own, and pages build more safely on a
  contract that has already settled.
- **No sharing.** Ratings, reviews and entries stay private to their owner: no public profile, feed or review page.
  Social features are outside the product's scope.
- **No history beyond viewings.** Ratings, likes and watchlist changes are not recorded as events; only entries carry
  dates. A timeline of viewings is what tracking needs, and nothing would read other events.
- **No watchlist order, drag-and-drop or Next Up queue,** and no search suggestions. A queue's order field, its
  migration and its reorder endpoint belong with the design of the queue, and suggestions need an endpoint of their
  own; nothing here reads either.
- **No join times in the API.** They order the Library server-side, and no page shows them.
- **No admin page for entries,** and no add or edit form for records: the form saved flags past the rules (D11).
- **No restore of a deleted entry.** Deleting an entry is final at the API, since re-creating it would re-run the
  rules and could change watched and the watchlist again.
- **The browse grids' data layer is unchanged,** apart from the record shape their payloads carry: nothing in it
  depends on what this change alters.
- **No signed-in browser smoke spec.** The new endpoints and hooks are covered by backend and component tests, and no
  page uses them yet for a browser journey to drive.

## 4. Proposed Design

### D1. The record holds the film's facts and when it joined each list

`UserMovieData` keeps `user_watched`, `user_on_watchlist`, `user_liked` and `user_rating` (the film's **current
rating**, D4), its `created_at` and `updated_at`, and gains three nullable timestamps: `watched_added_at`,
`watchlist_added_at` and `liked_added_at`, each **the time the film last joined that list**. `watched_at` and
`user_review` leave the record, with their constraints (`user_movie_watched_date`, `user_movie_review_has_text`,
`user_movie_review_length`).

- **Stamping.** A flag that turns on stamps its join time with the current time, whether the save set it or a rule
  did (D3), unless the save is an Undo (D5) and a join time is already stored, which it then keeps. A flag that turns
  off keeps its join time. A save that leaves a flag as it was leaves its time alone.
- **Constraints.** Besides the existing uniqueness and rating range, the database holds:
    - `user_movie_rating_watched`: a record with a rating is watched;
    - `user_movie_watched_added`, `user_movie_watchlist_added`, `user_movie_liked_added`: a flag that is on has its
      join time.

### D2. Entries record viewings and reviews

A new model, `UserMovieEntry`, belongs to its film's record (`record`, a foreign key to `UserMovieData` with
`related_name="entries"`, deleted with it). A film can have any number of entries. Each holds:

| Field | Type | Meaning |
| --- | --- | --- |
| `watched_on` | date or null | The day the viewing happened; null for a review with no viewing date |
| `rating` | 1–10 or null | The rating given with this entry |
| `review` | text or null | Up to 10,000 characters, never empty or whitespace only |
| `rewatch` | boolean, default false | The viewing was a rewatch |
| `made_on` | date | The day the entry was created, in the user's time zone (D7); never changes |
| `created_at`, `updated_at` | timestamps | As on every model |

The database holds: a date or a review (`user_movie_entry_has_content`); a rating of 1–10 or none; a review that holds
text and is at most 10,000 characters, as the record's review was; and `rewatch` only with a date
(`user_movie_entry_rewatch_dated`). A review is normalized as the record's was: a NUL character is refused, and a
review of only whitespace becomes null.

**Entry order.** A film's entries fall in one order: by **effective date** (`watched_on`, or `made_on` for an undated
entry), then by `created_at`, then by ID. The **latest entry** is the last in that order. The current rating (D4), the
per-film list (D6) and the cross-film list (D6) all use this order.

Any entry can be edited or deleted at any time, older ones included (D6).

### D3. The rules between fields are enforced in the backend's saves

The rules live in one place in the `user_movie_data` services, which both the record save (D5) and entry writes (D6)
call inside their transaction, after taking the record's row lock (`select_for_update`). A rule changes only fields
the request leaves out; a field the request supplies is never overridden.

| Write | Condition | Effect |
| --- | --- | --- |
| Record save | Supplies a rating (not null), omits `user_watched`, and the film is unwatched | Marked watched |
| Record save | The film changes from unwatched to watched, and the save omits `user_on_watchlist` | Removed from the watchlist |
| Entry create | The film is unwatched | Marked watched |
| Entry create | The entry is undated, and the film was unwatched | Removed from the watchlist |
| Entry create | The entry is dated on or after the day the film joined the watchlist, in the user's time zone | Removed from the watchlist |
| Entry edit | — | No change to watched or the watchlist |
| Entry delete | — | No change to the record |

So a film is removed from the watchlist in two cases only: it changes from unwatched to watched without a date (marked
watched, rated, or given an undated review), or an entry is made dated on or after the day it joined the watchlist. A
watched film can be added to the watchlist at any time, as a rewatch queue, and stays there until a rewatch is
logged; an entry for an earlier viewing, and rating a film already watched, leave the watchlist alone. A save that
supplies both `user_watched: true` and `user_on_watchlist: true` keeps both.

**The watched lock.** A film can't be unwatched while it has a current rating or any entry. The database holds the
rating part (`user_movie_rating_watched`); the service checks for entries under the record's lock, and every entry
write takes the same lock, so no order of an un-marking save and an entry create for the same film leaves an
unwatched film with an entry: whichever takes the lock second sees the first's result. Only the record save can
un-mark watched:

- a save that supplies `user_watched: false` with a rating (not null) answers **400**: the request contradicts itself;
- a save that would leave the film unwatched while it keeps its current rating or has any entry answers **409**, with
  a detail naming the cause ("Clear the rating before marking this film unwatched", "Delete this film's entries before
  marking it unwatched", or, when both apply, "Clear the rating and delete this film's entries before marking this
  film unwatched"), and changes nothing.

A save that supplies `user_watched: false` and `user_rating: null` together, on a film with no entries, succeeds.

### D4. The current rating follows the latest entry

The record's `user_rating` is the film's current rating: what cards, the Rated filter and a film's rating display
show. It changes only as follows:

- **A record save** sets or clears it directly (`user_rating` in the PATCH body).
- **Creating an entry with a rating** sets it to the entry's rating when the new entry is the latest entry. A
  backdated entry with another entry after it in the order leaves it alone.
- **Editing an entry** sets it to the entry's rating when, after the edit, the entry is the latest, it has a rating,
  and the edit either changed its rating or made it the latest. Fixing the review of the latest entry leaves a later
  re-rating in place; editing an older entry leaves the current rating alone.
- **No entry write clears it.** An entry with no rating never changes it, and deleting an entry leaves it as it is.
  Only a record save clears it (a PATCH with `user_rating: null`).

### D5. The record save keeps its contract, under the rules, with an Undo mark

`PATCH /user-movie-data/{tmdb_id}` keeps its route, its upsert, its row lock, its card fetch for an unstored film, its
throttle and its 200 / 201 answers. Its body (`UserMovieDataPatchSchema`) drops `user_review` and `watched_at` and
keeps `user_watched`, `user_on_watchlist`, `user_liked` and `user_rating`. An absent field stays unchanged except where
a rule changes it (D3); an explicit null clears the rating. A body with none of the four fields answers 400, as today.

**The Undo mark.** The body gains `undo` (boolean, default false). A save sent with `undo: true` restores fields an
earlier save changed, and changes one thing: a list it puts the film back on keeps the join time stored for it (D1),
so an undone removal returns the film to its place. Rules, the watched lock and every other behavior are the same as
for any save. `undo` alone is not a field to save.

`UserMovieDataSchema`, the record shape on every response that carries one (D8), becomes:

| Field | Type |
| --- | --- |
| `tmdb_id` | integer |
| `user_watched`, `user_on_watchlist`, `user_liked` | boolean |
| `user_rating` | 1–10 or null |
| `last_logged_on` | date or null: the latest `watched_on` among the film's dated entries |
| `has_entries` | boolean: whether the film has any entry, dated or not, so a film's Watched control can show the watched lock (D3) without reading the entries |

`DELETE /user-movie-data/{tmdb_id}` keeps its contract and deletes the record's entries with it.

### D6. Entry endpoints

Every route sits on the existing `user_movie_data_router`, requires a signed-in user, and reads or writes only that
user's data: an entry of another user, or of another film than the path names, answers 404 as a missing one does. A
new entry service, `UserMovieEntryService` in `apps/user_movie_data/services/`, serves the entry routes beside
`UserMovieDataService`, taking its TMDB client by injection as that service does. The schemas live in
`apps/user_movie_data/schemas.py`:

- `UserMovieEntrySchema`: `id`, `tmdb_id`, `watched_on`, `rating`, `review`, `rewatch`.
- `UserMovieEntryWriteSchema`, the body of a create and an edit: `watched_on` (date or null, default null), `rating`
  (1–10 or null, default null), `review` (at most 10,000 characters or null, default null; normalized as in D2),
  `rewatch` (boolean, default false), `liked` (boolean, required) and `time_zone` (an IANA zone name, required; D7).
- `UserMovieEntryWriteResponseSchema`: `entry` (`UserMovieEntrySchema`) and `record` (`UserMovieDataSchema`).
- `MovieEntriesSchema`: `record` (`UserMovieDataSchema`) and `entries` (a list of `UserMovieEntrySchema`).
- `ActivityEntrySchema`: `UserMovieEntrySchema`'s fields plus the film's `title`, `release_date` and `poster_path`.
- `ActivityQuerySchema`: `page` (1 to 1,000,000, default 1) and `page_size` (1 to 100, default 20), as the Library's
  bounds.

| Route | Answers | Errors |
| --- | --- | --- |
| `GET /user-movie-data/{tmdb_id}/entries` | 200 `MovieEntriesSchema` | 401, 422 |
| `POST /user-movie-data/{tmdb_id}/entries` | 201 `UserMovieEntryWriteResponseSchema` | 400, 401, 403, 404, 422, 429, 502, 503, 504 |
| `PUT /user-movie-data/{tmdb_id}/entries/{entry_id}` | 200 `UserMovieEntryWriteResponseSchema` | 400, 401, 403, 404, 422, 429 |
| `DELETE /user-movie-data/{tmdb_id}/entries/{entry_id}` | 200 `UserMovieEntryWriteResponseSchema` | 401, 403, 404, 422 |
| `GET /user-movie-data/entries` | 200 `PaginatedResponse[ActivityEntrySchema]` | 401, 422 |
| `PATCH /user-movie-data/{tmdb_id}` (D5) | 200 or 201 `UserMovieDataSchema`, as today | today's, plus 409 |

Every error body has the shared `ErrorResponseSchema` shape. 403 is the CSRF refusal of an unsafe request signed in by
session, as on the existing routes; 422 is a malformed path, query or body (a rating of 11, a review over 10,000
characters or holding a NUL, an unknown time zone, a missing `liked`); 429 is the save throttle.

- **A film's list** returns the film's record, or the defaults (every flag false, no rating, `has_entries` false,
  `last_logged_on` null) when the user has none, and its entries latest first: the reverse of D2's order. It reads no
  TMDB data and is not paginated.
- **Create** looks up or fetches the film's card exactly as the record save does (`movie_card_fields`, with
  `handle_tmdb_api_error` for TMDB's failures: 404, 400, 502, 503, 504), then, in one transaction under the record's
  lock, creates the record if there is none, adds the entry with `made_on` set to today in the given time zone, sets
  Liked, sets the current rating (D4) and applies D3's rules by the entry's own date. It answers 201 with the entry and
  the record after the write.
- **Edit** replaces the entry's `watched_on`, `rating`, `review` and `rewatch` with the body's (an omitted nullable
  field is null and an omitted `rewatch` false, since an edit sends the whole entry), sets Liked and sets the current
  rating (D4), under the record's lock. It keeps `made_on` and applies none of D3's rules.
- **Delete** removes the entry and changes nothing on the record. It answers 200 with the entry as it was and the
  record after the delete, whose `has_entries` and `last_logged_on` reflect it.
- **Write validation.** After the schema's checks, the service refuses with 400: an entry with neither a date nor a
  review; `rewatch` without a date; a `watched_on` after today in the given time zone.
- **The cross-film list** returns the user's dated entries across all films, latest first by `watched_on`, then by
  `created_at`, then by ID, each with its film's title, release date and poster path. Undated entries are not in it.
  It pages through `paginate_queryset` with the bounds and ordering rules the Library follows (a page past the end is
  empty with valid counts), in the `PaginatedResponse` envelope (`page`, `total_pages`, `total_results`, `results`):
  `MovieListResponseSchema`, the Library's envelope, holds film cards and a TMDB cursor that entries don't have.
- **Limits.** Create and edit carry the record save's two throttle windows (`SaveThrottle`, 30 a minute and 1,000 a
  day). Their counters are keyed by window and user only, so record saves, entry creates and entry edits share one
  count. Reads and deletes are not counted, as record deletes are not.
- **Routing.** `/user-movie-data/entries` is matched before `/user-movie-data/{tmdb_id}`, as `/movies` is today.

### D7. Entry writes carry the user's time zone

The server keeps time in UTC, and a user's evening can fall on the next UTC day, so every entry create and edit sends
the browser's IANA time zone name as `time_zone`. The schema refuses a name the server's time zone database doesn't
know (422). The service reads three dates in that zone: today (refusing a later `watched_on`), the day the film joined
the watchlist (for D3's watchlist rule), and, on create, the entry's `made_on`. Storing `made_on` keeps the entry order
fixed whoever reads it, from wherever; reads carry no time zone. The record save needs none, since its rules compare no
dates.

### D8. Every record read carries the film's log summary

`last_logged_on` and `has_entries` are computed from the entries table by the query that reads the record, through
one `UserMovieDataQuerySet` method that annotates both; they are never stored. Every path that returns
`UserMovieDataSchema` reads the record through it: the record GET, the PATCH response (re-read after the save), the
Library, the movie-list and movie-detail enrichment (`MovieEnrichmentService`), and every entry route's `record`. The
enrichment of a movie list stays one query, and a Library page stays two (the count and the rows).

### D9. The Library endpoint follows the new record

`GET /user-movie-data/movies` keeps its query (`LibraryQuerySchema`) and response, and `ordered_for_library` and
`with_state` change:

- **`added`** sorts by the join time of the one list the query filters when exactly one of `watchlist`, `watched` and
  `liked` is set (`watchlist_added_at`, `watched_added_at` or `liked_added_at`), and by the record's `created_at`
  otherwise: no list filter, several, or `rated` alone, since a rating records no join time.
- **`watched`** sorts by last logged (`last_logged_on`), with records that have no dated entry last in both directions.
- Every sort keeps nulls last and ends on the TMDB ID, as today.
- **`with_state`** (the unfiltered Library) keeps records that are on the watchlist, watched, liked or rated, and stops
  reading the review.

### D10. One migration reshapes the data, reversibly

One migration in `user_movie_data` adds the join times and the entries table, moves the data, drops `watched_at` and
`user_review` with their constraints, and adds D1's and D2's constraints. In the data step:

- **Entries.** Each record with a watched date or a review becomes one entry carrying its date as `watched_on`, its
  review and its rating, with `rewatch` false. The entry's `created_at` and `updated_at` are the record's `updated_at`,
  and its `made_on` is that time's UTC date.
- **Watched.** A record rated or reviewed but not watched becomes watched, since a rating or an entry requires it; its
  watchlist stays as it is.
- **Join times.** Each list a record was already on takes the record's `created_at`, so every list keeps today's
  "date added" order. A record the migration marks watched takes its `updated_at` as `watched_added_at`. Records
  never stored when each list began, so these times are approximate.

The migration reverses: the reverse restores each record's `watched_at` from its latest dated entry and its
`user_review` from the latest entry with a review, by D2's order, then drops the entries and the join times. Other
entries are lost, and records the migration marked watched stay watched. The existing migration test, which migrates
back to the app's first migration and forward again, keeps its checks of the earlier migration by targeting it, and a
new test covers this one in both directions.

### D11. The records' admin becomes view-and-delete only

`UserMovieDataAdmin` stops adding and changing records: its form wrote the flags past the rules. It lists, filters,
searches and shows records read-only, and deletes them, which deletes their entries. `UserMovieDataAdminForm` is
removed. Entries have no admin page.

### D12. The frontend's save layer adopts the new record and adds entries

- **Types.** `frontend/openapi.json` and `frontend/src/types/api.ts` are regenerated from the backend's schema.
  `useUserMovieState`'s default state drops `user_review` and `watched_at` and gains `has_entries: false` and
  `last_logged_on: null`. If `main` has changed the API schema by the time this change merges, the types are
  regenerated again after merging it.
- **The watchlist Undo sends the Undo mark.** The Undo that `saveMutationOptions` offers after a watchlist change sends
  `undo: true` in its PATCH body. The mark travels with the request and never appears in the film's shown state.
- **Entry reads.** `frontend/src/services/userMovieDataService.ts` gains calls for the five entry routes, the two
  reads cancellable as `libraryQuery`'s read is. The query-key factory (`frontend/src/lib/queries.ts`) gains
  `entriesKey` (`["entries"]`), `movieEntriesQuery(tmdbId)` (key `[...entriesKey, "movie", tmdbId]`) and
  `activityQuery(params)` (key `[...entriesKey, "activity", params]`, one numbered page), built like `libraryQuery`.
  Signing out or switching users resets them with every other user query (`resetUserQueries`).
- **Entry writes.** A hook in `frontend/src/hooks/movie/` exposes create, edit and delete for one film. Each is a write
  of that film: it runs under `saveMutationOptions`'s mutation key (`["movie-save", tmdbId]`) and scope
  (`movie-save:{tmdbId}`), so it queues behind the film's other saves and they behind it; it is retained like a save
  (`gcTime: Infinity`) and cancelled and ignored on a change of user like a save (`getSaveSignal`, `getChangeCount`).
  It fills `time_zone` from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`), so callers never pass
  it. On success for the current user it invalidates the Library queries (`libraryKey`) and the entry lists
  (`entriesKey`); on failure it shows an error toast, as a failed save does. It shows no success toast and offers no
  Undo; feedback on success belongs to whatever calls it.
- **The overlay.** `useUserMovieState` reads every write under the film's mutation key: in the order they ran, the
  last confirmed write's record wins over the payload (a save's response is the record; an entry write's is its
  `record`), and pending saves' fields show on top, as today. A pending entry write adds nothing to the shown state:
  its effects come from the server's rules and show when the server returns the record.

### D13. A read-only star display and a rewatch icon

Two presentational components join `frontend/src/components/movie/`:

- **`RatingStars`** shows a rating of 1–10 as gold stars, half a star a point: 7 shows ★★★½. It draws only the stars
  earned, with no empty outlines, in `imdb-gold`, at a small size for cards and lists and a larger one elsewhere. It is
  one non-interactive image with one accessible name, "Rated 3.5 out of 5 stars" ("Rated 4 out of 5 stars" for a whole
  number), and takes no focus. With no rating it renders nothing. `imdb-gold` is already contrast-checked on
  `background`, `layer-01` and `layer-02` in every palette. The development theme page
  (`CineXplorerExtensionsSection`) shows it at several ratings, so it can be seen in every palette.
- **`RewatchIcon`** is a circular-arrow icon from the icon set the app already uses, with the accessible name
  "Rewatch", in the surrounding text color.

`MovieUserScore` drops its unused props for a user's rating (`userRating`, `userRatingOnly`) and their chip: a user's
rating is shown as stars.

### D14. Reference documents follow the change

- **ADR-047** (new; D15) is written reading `Proposed` with this change and set to `Accepted` before it merges.
- **ADR-043, ADR-027 and ADR-042** each record in their Status section the part ADR-047 supersedes
  (`Superseded in part by ADR-047 (part)`), with the rest of each decision standing:
    - ADR-043: the save's watched date and review, their explicit-null clearing, "marking a movie unwatched clears
      its date", and an omitted field always keeping its stored value. Its upsert, record and throttle decisions
      stand.
    - ADR-027: one mutation hook changing a user's movie data with an optimistic update. Its overlay of pending and
      confirmed saves stands.
    - ADR-042: the dot chip and "★ 8" labels for a user's numeric rating. Its TMDB score chips stand.
- **DEVELOPMENT-RULES § API Contracts**: the PATCH rule becomes "PATCH tells an absent field from an explicit null: an
  absent field stays unchanged except where the data's rules change it, and an explicit null clears it."
- **The type-safety strategy's Pattern 3** says the same of `UserMovieDataPatchSchema`.
- **The color-token and component-styling strategies** show a user's rating as `RatingStars` in `imdb-gold`, in
  place of the numeric chip.
- **The service-layer strategy and TECHNICAL-OVERVIEW** name the entry service beside `UserMovieDataService`, and
  TECHNICAL-OVERVIEW's description of the `user_movie_data` app and of the frontend's saves names entries.
- **The pagination strategy** says, wherever it states the database-served list envelope (§ Database-Served Lists,
  and § Cursor-Based Pagination's End-of-Results Signal), that film lists keep `MovieListResponseSchema`, with
  `next_tmdb_page_start` null, and other database-served lists, such as the cross-film entry list, use
  `PaginatedResponse[T]`; both signal another page by `page` against `total_pages`.
- **Every other living site that states a rule this change replaces or departs from changes with it,** found by
  searching for each rule rather than from a list: reference documents, docstrings, comments, generated API types, tests
  and fixtures that name the record's `watched_at` or `user_review`; that say an omitted field always stays unchanged;
  that read a record into `UserMovieDataSchema` without the log summary (D8); or that show a user's rating as a numeric
  chip. Known sites include the type-safety strategy's Pattern 2 and its `read_movie_state` example,
  `UserMovieDataPatchSchema`'s docstring (which the generated `openapi.json` and `api.ts` carry), the comment on
  `saveUserMovieData` in `userMovieDataService.ts`, and the caption on the development theme page. Migrations and the
  migration tests, which must keep naming the old fields (D10), ADRs other than the three above, archived records and
  planning documents stay as written.

### D15. One new ADR records how films are tracked

ADR-047 records: watched, the watchlist, liked and the current rating as facts on the record, with the time the film
joined each list (D1); entries as dated viewings and reviews, each with its own rating, and their order (D2); the rules
in the backend's saves, including the watched lock (D3); how the current rating follows the latest entry (D4); the Undo
mark (D5); the cross-film list of dated entries, the timeline of a user's viewings, in the generic `PaginatedResponse`
envelope (D6); entry creates and edits counting against the save windows (D6); the time zone on entry writes (D7); the
Library's "date added" by the filtered list's join time, falling back to the record's creation time, and its "watched"
sort by last logged (D9); entry writes as further saves of their film whose effects show when the server returns the
record (D12); and a user's rating shown as gold half stars (D13). It supersedes ADR-043, ADR-027 and ADR-042 in part
(D14).

## 5. Design Decisions

- **D1: join times on the record,** over keeping `created_at` as every list's "date added", which sorts a film by when
  it first got any state, and over a membership-history table, which would keep every join with nothing reading the
  history. A removal keeps the time so an Undo can restore it; a fresh join stamps a new one. Not exposing the
  times keeps the response to what pages show. _ADR:_ ADR-047 (new); not exposing them is `none`, a tactical choice.
- **D2: entries as their own table, each with a rating, belonging to the record,** over one date and review per film
  (a rewatch overwrites history that can't be recovered), over making watched "has any viewing" (marking a film
  watched would invent an undated viewing, and un-marking would have to choose which to delete), and over one rating
  per film with a copy on each entry (copies can't be corrected without editing the film's rating). The foreign key to
  the record, over one to the user and the film, gives deletion with the record for free and keeps a film's entries
  where its lock is taken. `made_on` is stored, over computing an undated entry's day at read time from `created_at`,
  which would need a time zone on every read and could reorder entries for a user who travels. _ADR:_ ADR-047 (new).
- **D3: the rules in the backend's saves,** over each control applying them, which every caller would repeat and any
  other client could break. Supplied fields win over rules, so a save means what it says and an Undo restores exactly
  what it sends. The lock's rating part is a database check; its entries part is a service check, since a check
  constraint can't see another table, made race-free by the record lock every write takes. 409 for the lock, over 400,
  because the request is well-formed and the film's state refuses it; 400 for a self-contradicting request.
  _ADR:_ ADR-047 (new).
- **D4: the current rating follows the latest entry,** over one rating per film that every new entry overwrites,
  which would let a backdated log replace a newer opinion, and over deriving it from the latest entry, which would
  leave a rating set directly on a film nowhere to live and lose a rating given without an entry. _ADR:_ ADR-047 (new).
- **D5: an Undo mark on the save,** over the client sending the join times it wants restored (a client could then
  write any time it liked) and over a separate restore endpoint duplicating the save. Dropping the watched date and
  review from the body, and letting rules change omitted fields, supersede part of ADR-043. _ADR:_ ADR-047 (new),
  superseding ADR-043 in part.
- **D6: entry routes nested under their film,** over top-level `/entries/{id}`: a create needs the film to fetch its
  card, and the frontend runs entry writes in the film's save queue. An edit is a `PUT` of the whole entry, over a
  partial `PATCH`, since an edit always sends every field and a replacement has no absent-versus-null case. Delete
  answers with the entry and the record, over 204, so every entry write returns the record the overlay needs. Entry
  creates and edits share the save windows, over windows of their own, because a create fetches an unstored film's
  card from TMDB exactly as a save does. The cross-film list holds dated entries only, since it lists viewings. It uses
  the existing generic `PaginatedResponse[T]`, over `MovieListResponseSchema`, whose film-card items and TMDB cursor
  don't fit entries, and over a new envelope of its own. _ADR:_ the nesting under the film and the delete's answer
  are covered by ADR-047, which records entry writes as saves of their film that return its record (D12); the edit's
  `PUT` is `none`, a tactical choice; the shared windows, the cross-film list of dated entries and its envelope are
  recorded in ADR-047.
- **D7: the time zone in the write's body,** over the client sending "today" (the server couldn't check the claim)
  and over a profile setting (none exists, and it would be wrong while travelling). _ADR:_ ADR-047 (new).
- **D8: the log summary derived at read,** over columns the service keeps in step on every entry write, which would
  be a second source of truth for what the entries already say. _ADR:_ `none`, a tactical choice plain from the code.
- **D9: "date added" by the filtered list's join time,** falling back to the record's creation time where no single
  list applies, over refusing those queries with a new 422. _ADR:_ covered by ADR-047, which this change delivers.
- **D10: a reversible migration with a lossy reverse,** over an irreversible one: the deploy procedure rolls back by
  reversing migrations and stops at an irreversible one, and the app's migration test runs every migration backwards.
  Join times from `created_at` keep each list's current order, over `updated_at`, which any later save moved. _ADR:_
  `none`, tactical choices plain from the code.
- **D11: view-and-delete admin,** over keeping its form, which saves flags past the rules, and over rebuilding the
  rules in the admin. _ADR:_ `none`, a tactical choice.
- **D12: entry writes as saves of their film,** over a mutation of their own, which would race the film's saves and
  whose record the overlay wouldn't show, and over optimistic entry effects, which would copy the server's rules into
  the client. This supersedes ADR-027's "one mutation hook ... with an optimistic update". Error toasts only, over
  success toasts in the shared hook, since each caller's feedback differs. _ADR:_ ADR-047 (new), superseding ADR-027
  in part; the toasts are `none`, a tactical choice.
- **D13: gold half stars for a user's rating,** over ADR-042's numeric chip, whose "★ 8" would read as eight stars
  beside a five-star control. A static image with one accessible name, over Chakra's `RatingGroup` in read-only mode,
  which keeps radio semantics and puts a focus stop in every card. Earned stars only, so the width reads the rating at
  a glance. _ADR:_ ADR-047 (new), superseding ADR-042 in part; the rewatch icon is `none`, a tactical choice.
- **D14: the PATCH rule amended,** over an exception noted beside it, since rules that change omitted fields are now
  the save's contract. _ADR:_ covered by ADR-047, which this change delivers.
- **D15:** the ADR itself.
- **Performance choices** (§ 6): full reviews in the cross-film list, over an excerpt field that would add a second
  shape of the same text for a rare worst case; and no new index, over indexing the join times and entry dates, since
  every query is bounded to one user's rows first. _ADR:_ `none`, tactical choices.

**ADRs this work delivers:** ADR-047 (new), superseding ADR-043, ADR-027 and ADR-042 in part.

## 6. Cross-cutting Considerations

### Security

- Every entry route requires a signed-in user and scopes each read and write to that user's records; an entry ID of
  another user or another film answers 404, never revealing that it exists. Tests cover another user and no user for
  each route.
- Unsafe requests signed in by session keep the CSRF check (403), as on the existing routes.
- Input is bounded: a rating of 1–10, a review of at most 10,000 characters with no NUL, a page size of at most 100,
  and a time zone the server's database knows. Review text and time zone names are never logged.
- Entry creates and edits share the save throttle, so entries add no new route to grow the stored catalogue through
  TMDB lookups faster than ADR-043 bounds.
- Ratings, reviews and entries stay private: no route returns another user's data. The site's privacy policy, drafted
  outside this repository, describes one rating and one short review per film; before it is published it must name
  dated entries, each with its own rating and review, and the times a film joined each list.

### Performance

- A Library page stays two queries and a movie list's enrichment one, with the log summary computed in them (D8).
- A film's list reads its record and its entries in a fixed number of queries; a cross-film page is one count and one
  row query with its films joined.
- Pages of the cross-film list carry full reviews. At 100 entries of 10,000 characters a page is about 1 MB of plain
  ASCII text, and up to about 6 MB for text outside ASCII (12 MB for emoji): the API keeps Django Ninja's default
  `JSONRenderer`, whose `json.dumps` call leaves `ensure_ascii` on and so escapes every non-ASCII character, and
  neither Caddyfile (`infrastructure/Caddyfile`, `infrastructure/Caddyfile.prod`) sets `encode` to compress
  responses. Such a page needs 100 reviews at the maximum length, and it is the requester's own data, so this is
  accepted rather than adding an excerpt field.
- No new index: every query filters to one user's rows first, and one user holds thousands of rows at most.
- A successful entry write invalidates the Library and entry queries, as a save already invalidates the Library.

### Testing

- Test-first for the model, the migration, the rules, the current rating, the endpoints and the frontend hooks. Backend
  tests run against the real test database, replacing only TMDB at its client and time where a test needs a fixed
  clock; frontend tests mock the network with MSW.
- A concurrency test sends an un-marking save and an entry create for one film at once on two threads with real
  transactions, and shows that neither order leaves an unwatched film with an entry (D3).
- The save throttle's tests extend to show that saves, entry creates and entry edits share one count.
- Every test and fixture that writes records directly is brought within D1's constraints, found by searching for
  direct writes in every app, not from a list (`UserMovieData.objects.create`, `create_user_movie_data`, and a field set
  on a fetched record that is then saved): the shared
  factory `create_user_movie_data` stamps the join time of each flag it turns on, and a fixture holding a rating marks
  its record watched (the CSRF tests' fixture in the `authentication` app creates a rated, unwatched record). Tests and
  mocks that name the removed fields change with them, the frontend's `frontend/tests/mocks/movieData.ts` among them.

### Migration and rollout

- One migration, applied by the deploy's existing `migrate` step; it reverses (D10). Few records exist before launch,
  and staging's are test data.
- Backend and frontend deploy together. A browser tab opened before the deploy keeps working: its watchlist toggle
  sends fields the new save still accepts, and nothing in today's frontend reads the removed fields.

### User-facing impact

- `/watchlist` lists films in the order they joined the watchlist, newest first, rather than by when the film first
  got any state.
- Undoing a watchlist removal returns the film to its place; removing it and adding it again by hand moves it to the
  top.
- Nothing else visible changes: no new controls, and the only controls that write (the watchlist toggles) trigger no
  rule, since adding to and removing from the watchlist change nothing else.

## 7. Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven after merge** needs the change running on staging
from its deploy, so it is checked once the change has merged, with its evidence recorded before the work is archived.

### Implemented

1. **The tracking journey, through the API.** One backend test, signed in as one user, adds a film to the watchlist
   with a PATCH; creates an entry dated today with a rating of 7 and a review; and shows the film is watched, off the
   watchlist, rated 7, with `has_entries` true and `last_logged_on` today, listed by the Library's watched, rated and
   unfiltered queries and not its watchlist query, and in the cross-film list. It then adds the film to the watchlist
   again, creates a rewatch entry dated today with a rating of 9 and another review, and shows the film off the
   watchlist again, rated 9, with two entries in the film's list and the cross-film list, newest first, each keeping
   its own rating and review. (D3, D4, D5, D6, D9)
2. **The rules.** Tests show each row of D3's table and its converse: marking an unwatched film watched, rating it, and
   giving it an undated entry each remove it from the watchlist; an entry dated before the day it joined the
   watchlist, and rating or reviewing a film already watched, leave it on; a watched film can be added to the
   watchlist; a save supplying watched and the watchlist together keeps both; an entry edit and an entry delete change
   neither watched nor the watchlist. (D3)
3. **The watched lock.** Un-marking watched answers 409 and changes nothing while the film has a current rating, and
   again while it has an entry; `user_watched: false` with a rating answers 400; `user_watched: false` with
   `user_rating: null` succeeds on a film with no entries. Written through the ORM, a rating on an unwatched record is
   refused by the database, as is a violation of each other constraint in D1 and D2: a flag that is on without its
   join time; an entry with neither a date nor a review; a rewatch without a date; an entry rating of 0 or 11; an
   entry review that is empty, only whitespace, or 10,001 characters. The concurrency test leaves the film watched with
   its entry, whichever request takes the lock first. (D1, D2, D3)
4. **The current rating.** Tests show: a new latest entry with a rating sets it; a backdated entry with a later entry
   after it leaves it; an entry with no rating leaves it; editing the latest entry's rating sets it; editing only the
   latest entry's review after a re-rating by PATCH leaves the re-rating; editing an older entry's rating leaves it;
   moving an entry's date to make it the latest sets it to that entry's rating; deleting any entry leaves it; a PATCH
   with `user_rating: null` clears it. An undated entry orders by the day it was made, and same-day entries by when
   each was made. (D2, D4)
5. **Join times and the Library's sorts.** Tests show each list's join time is stamped when the film joins it and kept
   when it leaves; a removal undone with `undo: true` keeps the film's earlier place in the `added` sort, while a
   removal and a re-add without it moves the film to the top; `added` sorts by the single filtered list's join time
   and by `created_at` for no filter, several, or `rated` alone; `watched` sorts by last logged with films with no
   dated entry last in both directions; the unfiltered Library leaves out a record with no flag and no rating. (D1, D5,
   D9)
6. **Time zones.** With the clock fixed at a UTC time that is already tomorrow in `Pacific/Kiritimati`, an entry dated
   that zone's today is accepted and one dated a day later answers 400; a film added to the watchlist late in the
   evening in `America/Chicago`, which is the next UTC day, is removed by an entry dated that Chicago day; an unknown
   time zone answers 422; an undated entry's `made_on` is the zone's date. (D2, D3, D7)
7. **The endpoints' contract.** API tests show each route's answers and errors in D6's table, with the shared error
   body: create answers 201 and fetches an unstored film's card once; a film's list answers the defaults for a film the
   user has no record of, without a TMDB request; an entry with neither date nor review, a rewatch without a date, and a
   date after today each answer 400; each route answers 401 with no user, and 404 for another user's entry and for an
   entry addressed under another film; with CSRF checks enforced, a session-signed-in create, edit and delete answer
   403 without a token; the cross-film list pages at the given size and holds no undated entry; deleting a record
   deletes its entries. Create and edit each set Liked from the body, stamping its join time when it turns on; an edit
   keeps the entry's `made_on` whatever its time zone and date, sets an omitted `watched_on`, `rating` or `review` to
   null and an omitted `rewatch` to false. The committed OpenAPI schema lists exactly these statuses for each route.
   (D5, D6)
8. **Shared limits.** With throttling enabled, a mix of 31 record saves, entry creates and entry edits within one clock
   minute leaves the 31st answering 429 with `Retry-After`; entry deletes and reads are not counted. (D6)
9. **The log summary on every read.** `has_entries` and `last_logged_on` are correct on the record GET, the PATCH
   response, every entry route's `record`, a Library page, an enriched movie list and the movie detail payload; the
   enrichment of a list stays one query and a Library page two, whatever the number of entries. (D8)
10. **The migration.** A migration test shows: a record with a date, a review and a rating becomes watched with one
    entry carrying all three; a record with only a review becomes one undated entry; a rated, unwatched record on the
    watchlist becomes watched and stays on the watchlist, with `watched_added_at` its `updated_at`; each list a record
    was on takes its `created_at`; and migrating back restores each record's latest watched date and review. (D10)
11. **The admin.** An admin test shows records can be listed and viewed but not added or changed, and deleting one
    deletes its entries. (D11)
12. **The frontend's save layer.** Component tests with MSW show: the watchlist Undo's PATCH body carries
    `undo: true`, and the Undo mark never appears in the shown state; an entry create queued behind a pending save of
    the same film is sent after it, and `useUserMovieState` then shows the record the create returned; a pending entry
    write changes nothing shown; a successful entry write refetches active Library and entry queries; a failed one
    shows an error toast; every entry create and edit sends the browser's time zone; signing out discards queued entry
    writes and resets the entry queries. (D12)
13. **The star display and rewatch icon.** Component tests show `RatingStars` draws ratings 1 to 10 as half a star a
    point, earned stars only, with the accessible names in D13 and no focusable element, and renders nothing with no
    rating; `RewatchIcon` is named "Rewatch"; `MovieUserScore` has no user-rating props. (D13)
14. **The old fields are gone.** A search of the repository outside migrations, the migration tests in
    `backend/apps/user_movie_data/tests/`, ADRs and the planning records in `.arc/backlog/`, `.arc/active/` and
    `.arc/reference/archive/` finds no `user_review` or `watched_at`. (D1, D5, D14)
15. **The documents.** ADR-047 reads `Accepted` with its date; ADR-043, ADR-027 and ADR-042 record their partial
    supersession; DEVELOPMENT-RULES' PATCH rule, the type-safety strategy's Pattern 3, the color-token and
    component-styling strategies, the pagination strategy, the service-layer strategy and TECHNICAL-OVERVIEW read as D14
    says. Every site D14's last bullet reaches (each site its search for a rule this change replaces or departs from
    finds, the known sites it names among them) states the new rule. (D14, D15)

### Proven after merge

16. **The migration runs on staging.** The deploy job for the merge commit applies the migration on staging (its log
    lists it applied), and the staging smoke run that follows the deploy passes. (D10)

## 8. Open Questions

None.
