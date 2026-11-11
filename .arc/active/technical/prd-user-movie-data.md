# PRD: User-Movie Data Layer

**Type:** Technical
**Form:** detailed · RFC
**Class:** Heavy
**Status:** Complete
**Created:** 2026-11-10

---

## 1. Introduction / Context

A user's data about a movie (whether it is on their watchlist, watched or liked, and their rating and review) is what
every planned user feature builds on: the watched, liked, rating and review controls, the Log form, the Library and the
watchlist grid. The backend layer that holds it can't carry them today:

- **Saving takes two calls and a guess.** A first save is `POST /user-movie-data` (`create_user_movie_data`), later
  ones `PATCH /user-movie-data/{id}` (`update_user_movie_data`), and reads go through `GET /user-movie-data/by-tmdb-id`.
  The client has to know which applies: `toggleMovieWatchlist` creates, and when the 400 from
  `UserMovieDataService.create` reads "already exists", it fetches by TMDB ID and patches.
- **A rating or review can't be cleared.** `update_user_movie_data` reads each field with `.get()`, so an omitted field
  and an explicit `null` both arrive as `None`, and `UserMovieDataRepository.update` skips every `None`.
- **Two first saves of the same movie race into a 500.** `UserMovieDataService.create` looks the `Movie` up
  (`get_movie_by_tmdb_id`), fetches it from TMDB on a miss, then inserts it (`create_movie_stub`,
  `Movie.objects.create`). Two concurrent first saves collide on the primary key, and nothing catches the
  `IntegrityError`.
- **The model has no history and few guarantees.** `UserMovieData` has no timestamps, so lists sort by `-id`; the 1–10
  rating is enforced only by validators; uniqueness is `unique_together`; and each flag carries its own index.
- **The Library calls TMDB once per saved movie.** Its route (`get_user_movies` in `api.py`) returns every row
  unpaginated (`UserMovieDataService.get_all_user_movies`), and `_build_enriched_movies` draws each card through
  `fetch_movies_batch`: one sequential TMDB request per movie, with `runtime` set to 0
  (`_create_movie_base_from_tmdb_data`). At 50–250 ms a request, 200 movies take 10–50 seconds.
- **`Movie` holds four fields, written once.** `create_movie_stub` stores `tmdb_id`, `title`, `poster_path` and
  `release_date` and nothing refreshes them, while TMDB's terms allow cached content to be kept for at most six months.
- **The service tests don't test the queries.** `UserMovieDataRepository` sits between both services and the ORM, and
  the 39 tests in `test_user_movie_data_service.py` (24) and `test_movie_enrichment_service.py` (15) mock it whole.
- **The service still raises `HttpError`** (`UserMovieDataService.create`, `get_by_id`, `get_by_tmdb_id`), not the
  domain exceptions in `apps/core/exceptions.py`.

There are no real users yet, so the migrations carry no data worth keeping, and every later user feature is cheaper on
the consolidated layer than ahead of it.

This change consolidates the backend's user-movie data into one service over a constrained model, saved with one call
addressed by TMDB ID, and serves the Library from card data stored on `Movie` instead of one TMDB call per saved
movie. It publishes the API contract (D3, D5, D6, D7) that frontend work builds on; the frontend changes only as far
as the removed routes require (D10).

## 2. Goals

1. **One save.** A single `PATCH /user-movie-data/{tmdb_id}` sets or clears any field from any prior state, the first
   save included, without the client knowing whether a record exists; two concurrent saves of one movie both succeed.
2. **Invariants in the database.** One record per user and movie, a rating of 1–10 or none, a review that is none or
   holds text of at most 10,000 characters, a watched date only on a watched movie, and timestamps on every record.
3. **A Library served from the database.** A paginated, filtered and sorted list, read in a fixed number of queries
   per page whatever the collection's size, with no TMDB request.
4. **Stored TMDB content kept fresh.** Every stored `Movie` row's card fields are at most seven days old, or the night
   reports a failure, well inside TMDB's six-month limit.
5. **Bounded saves.** While the cache that counts them is reachable, one account's saves make a bounded number of TMDB
   requests a minute and add a bounded number of stored movies a day, so one account would take weeks to grow the
   stored catalogue past what the nightly refresh covers, and the nightly alert reports it if one does.
6. **Tests of the real queries.** The service's tests run against the test database, replacing only TMDB.
7. **One published contract.** Every route of the user-movie-data API declares its success and error responses, so
   the generated frontend types carry them.

## 3. Non-Goals

- **The frontend's server state stays as it is,** on its current services and hooks: no query key factory, no shared
  save hook with optimistic updates and rollback, `MovieCard` keeps its private copy of its state, the session is not
  a query, the cache is not cleared on sign-out, and the detail page's user data is not a query. Only D10's minimal
  adaptation changes the frontend.
- **The movie detail page's movie data** keeps its current fetch.
- **No watchlist order field, drag-and-drop or Next Up.** The watchlist's own order comes with drag-and-drop, which
  adds its order field in a migration of its own (D4, Design Decisions).
- **No new screens or controls:** no Library or watchlist screens, sort controls, watched, liked, rating or review
  controls, or Log form. They build on this API.
- **No rating history, and no more than one viewing per movie.**
- **No Redis caches** for the genre list or trending movies.
- **Authentication's `{"error"}` bodies keep their shape.**
- **The movie grids are unchanged,** including their scroll restore after a reload and their tests' mocking.

## 4. Proposed Design

### D1. The service tests move to the real database first

Before any code moves, the 39 mock-based tests (`test_user_movie_data_service.py` and
`test_movie_enrichment_service.py`, in `apps/user_movie_data/tests/unit/`) are rewritten to call the service against
the test database, replacing only TMDB at its client (`TMDBApiClient`). Model data comes from plain factory functions
in `apps/user_movie_data/tests/test_helpers.py`, which replace `create_mock_user_movie_data` and `create_mock_movie`.
The rewritten tests pass against the current code, so they guard the fold (D2) and the model change (D4) that follow.

### D2. The repository folds into the service, over one QuerySet

`UserMovieDataRepository` (`apps/user_movie_data/repositories.py`) is deleted. A custom QuerySet on `UserMovieData`
carries the filters several queries share: scoping to a user; the watchlist, watched, liked and rated filters;
"holds any state" (a flag true, a rating or a review); and the lookup of a user's rows for a set of TMDB IDs that
enriches movie lists. No class sits between the service and the ORM. Whether the enrichment stays its own small class
is an implementation choice, since it holds no data access of its own.

`UserMovieDataService` takes no injected repository or `MovieService`. It takes its TMDB client by injection, as
`MovieService` does (`tmdb_client`), and tests pass a stub built from `apps/movie/tests/tmdb_test_builders.py`. The
three tests in `test_service_factory.py` that build services around the repository are rewritten or removed with it.

Every living reference document (the strategies and the technical overview), code comment, docstring, test helper and
configuration entry that names the removed repository, `apps/movie/services/pipelines/batch.py` or anything in it, the
removed routes (D6), the replaced schemas (D5) or the replaced Library method (`get_all_user_movies`) changes in the
same change. So does every test, in any app, that calls a removed route or addresses a record by its database ID; today
these include the CSRF and session-authentication tests in `apps/authentication/tests/integration/`, which move to the
new routes. ADRs, archived records and backlog plans stay as written. `pipelines/batch.py` is removed whole with its
tests, since nothing else in it is used once the Library stops calling `fetch_movies_batch` (D7).

A save can't duplicate a record under the upsert (D6), so no save answers 409; a concurrent first save resolves
through `get_or_create`.

### D3. Errors are domain exceptions, declared on the routes

The service raises `NotFoundError` when the user has no record for a movie, and TMDB failures reach it as the domain
exceptions `handle_tmdb_api_error` already raises: `NotFoundError` for a lookup TMDB answers 404, `InvalidInputError`
for TMDB's 400 and 422, and `UpstreamError` (502; 503 when TMDB rate-limits the server's key; 504 on a timeout). No
`HttpError` remains in `apps/user_movie_data`.

In `MovieService.get_movie_by_id`, a validation failure anywhere in converting TMDB's data (the details, the credits
or the detail schema) is an `UpstreamError` (502), as `validate_tmdb_response` already answers for the genre list,
where today `unhandled_error` answers it 500. So is one in the card mapping a save calls (D8), and the nightly run
counts it a failed row (D9). Other endpoints keep their current handling, and the module docstring of
`apps/movie/services/tmdb_api_boundary/response_factories.py` says so.

**The error schema.** Every route of the user-movie-data API declares its error responses (D6, D7) with one shared
schema, `ErrorResponseSchema` in `apps/core/schemas.py`, matching the body `error_body` builds:

| Field | Type | Presence |
| --- | --- | --- |
| `detail` | string | Always. A fixed message, except a 422's, which names each invalid field with its validation message; never an external service's text. |
| `code` | `ErrorCode` value | Only when the error carries one; 422 always carries `validation_error`. |

Every error these routes answer has this shape: domain errors and validation errors through `api_errors.py`'s
handlers; Django Ninja's own 400 for a request body it can't parse (`{"detail": "Cannot parse request body"}`), 401
(`{"detail": "Unauthorized"}`, with no `code`, whether the request carried no credentials or an invalid or expired
token) and 429 (`{"detail": "Too many requests."}`); the CSRF middleware's 403
(`{"detail": "CSRF token missing or invalid."}`); and the 500 an unexpected error gets
(`{"detail": "Internal server error"}`), which no route declares. The existing `ApiErrorSchema` describes the
error-code listing's entries (`code`, `message`, `category`, …), not that body, so it isn't used for them.

### D4. One migration reshapes `UserMovieData`

- `created_at` and `updated_at`.
- `watched_at`, a nullable date: the calendar day the user watched the movie, as the client sends it. The server's
  clock runs on UTC and never supplies the date. Any valid date is accepted, with no range check. A `CheckConstraint`
  keeps it null unless `user_watched` is true; watched with no date is allowed and means the date is unknown. Marking
  a movie unwatched clears it.
- A `CheckConstraint` holding `user_rating` null or between 1 and 10; the validators stay for admin forms.
- A review is null or holds text of at most 10,000 characters. The request schema (D5) and the admin form both turn
  an empty or whitespace-only review into `null` and refuse a longer one, and both refuse a review containing a NUL
  character, which PostgreSQL text can't hold (the request schema with a 422); a `CheckConstraint` rejects an empty or
  whitespace-only review, and another one longer than 10,000 characters. Before adding them, the migration truncates
  any existing review longer than 10,000 characters to its first 10,000, then converts existing empty or
  whitespace-only reviews to `null`, so truncation can't leave one the constraint rejects. A review is otherwise stored
  as sent, surrounding whitespace included.
- `UniqueConstraint(user, movie)` replaces `unique_together`.
- One index on `(user, -created_at)` replaces the three single-flag indexes.
- Not added: a watchlist order field, rating history or more than one viewing per movie.

Existing rows take the migration time as `created_at`; they exist only in development and staging databases. The
migration is reversible, so the deploy runbook's schema reversal can take a rollback back across it; reversing it
drops the new columns' data and leaves the converted and truncated reviews as they are.

### D5. One schema for a user's data about a movie

The user-movie-data endpoints and the movie list and detail payloads share one schema, `UserMovieDataSchema`,
replacing `UserMovieDataDetailSchema` and `apps.movie.schemas.UserMovieDataSchema`. The row's database `id` leaves
it, since nothing addresses a record by it any more, and so does the movie's `title`, which nothing reads from a
user's data. The save's body schema below replaces `UserMovieDataCreateSchema` and `UserMovieDataUpdateSchema`, and
`UserMovieDataModelSchema`, which no endpoint uses, is removed with them. Every field of `UserMovieDataSchema` is
always present, so the generated frontend types mark each one required:

| Field | Type | Meaning |
| --- | --- | --- |
| `tmdb_id` | integer | The movie's TMDB ID. |
| `user_watched` | boolean | The user has watched the movie. |
| `user_on_watchlist` | boolean | The movie is on the user's watchlist. |
| `user_liked` | boolean | The user likes the movie. |
| `user_rating` | integer 1–10, or `null` | The user's rating; `null` when unrated. |
| `user_review` | string, or `null` | The user's review; `null` when there is none, never empty. |
| `watched_at` | date (`YYYY-MM-DD`), or `null` | The day the user watched it; `null` when unwatched or unknown. |

On the movie endpoints, each item's `user_movie_data` (on `MovieListItemSchema`, and so on `MovieDetailSchema`) is
this schema when the signed-in user has a record for the movie, and `null` for an anonymous request or a movie the user
has no record for.

The save's request body is `UserMovieDataPatchSchema`. Every field is optional; a field left out keeps its stored
value (D6):

| Field | Accepts | Explicit `null` |
| --- | --- | --- |
| `user_watched` | boolean | 422 |
| `user_on_watchlist` | boolean | 422 |
| `user_liked` | boolean | 422 |
| `user_rating` | integer 1–10; otherwise 422 | Clears the rating. |
| `user_review` | string of at most 10,000 characters with no NUL character, otherwise 422; empty or whitespace-only becomes `null` | Clears the review. |
| `watched_at` | date (`YYYY-MM-DD`), any valid date | Clears the date. |

Fields the schema doesn't name are ignored, so a body holding only unknown fields has no known field (D6).

### D6. The API is addressed by TMDB ID

| Route | Behaviour |
| --- | --- |
| `GET /user-movie-data/{tmdb_id}` | The user's record for the movie; 404 when there is none. |
| `PATCH /user-movie-data/{tmdb_id}` | Upsert: 201 when it creates the record, 200 when it updates it. |
| `DELETE /user-movie-data/{tmdb_id}` | 204; 404 when there is no record. |
| `GET /user-movie-data/movies` | The Library (D7). |

`POST /user-movie-data`, `PATCH` and `DELETE /user-movie-data/{id}`, and `GET /user-movie-data/by-tmdb-id` are removed.
A `PATCH` or `DELETE` sent to `/user-movie-data/{n}` doesn't fail afterwards, though: the path now addresses the new
routes, reading `n` as a TMDB ID (§ 6, Release order). Every route requires a signed-in user, by bearer token or session
as today. `tmdb_id` is a positive integer; any other path value is a 422. `/movies` is registered ahead of `/{tmdb_id}`,
so it is never read as a TMDB ID.

**The PATCH.** Every field is optional. A field left out keeps its value, or its default when the record is created
(flags false, the rest null). An explicit `null` clears `user_rating`, `user_review` or `watched_at`; `null` for a flag
is a 422. A request whose result is unwatched but carries a `watched_at` date is a 400 (`InvalidInputError`), and so is
a body with no known field, such as `{}`; a request with no body at all is a 422, and a body that isn't valid JSON gets
Django Ninja's own 400. A `watched_at: null` sent with `user_watched: false` is accepted. A save that leaves a record
with no flag, rating or review keeps the record: GET still returns it, and the Library leaves it out (D7).

**The order of a save.** The service first runs the checks the body alone decides (a body with no known field, or a
`watched_at` holding a date sent with `user_watched: false`), then makes sure the `Movie` row exists (D8), outside any
transaction, since that may call TMDB. Then, in one `transaction.atomic` block, it takes and locks the user's record in
one `select_for_update().get_or_create(...)` call, which re-creates a record a concurrent DELETE removed, applies the
fields and the watched rule, and saves. Saves to the same movie run one after another, and two first saves both succeed.
Only the watched rule needs the stored record; a first save it rejects leaves the `Movie` row behind, which is accepted,
since the nightly refresh keeps it current. Only the admin deletes a `Movie` row (the nightly refresh deletes none, D9).
A save that an admin delete lands between fails its deferred foreign key when the block commits, and `unhandled_error`
answers 500, a window accepted as too narrow to handle.

**Save limits.** Each signed-in user may save at most 30 times in each clock minute and 1,000 times in each UTC day,
however they signed in. Every PATCH counts against both windows, whether or not it reaches TMDB and whether or not it is
refused. A save past either limit answers 429 with a `Retry-After` header giving the seconds until the refusing window
ends (the later, when both refuse), and changes nothing. The limits are two instances of one small throttle class, one
per window, that counts each user's saves in the Django cache on Redis, whose increment is atomic, under a key naming
the window, the window's start and the user that authentication returns (`request.auth`), expiring with the window. So
saves sent at the same moment are each counted. Counting never raises: Django Ninja's `Operation.run` calls
`_run_checks`, which runs the throttles through `_check_throttles`, before the `try` whose `on_exception` answers JSON,
so an exception there would reach the client as the HTML page of Django's default `server_error` (the project sets no
`handler500`). The window's expiry is rounded up to whole seconds, at least one; a counter missing when it is
incremented (expired or evicted meanwhile) starts again at one, so Django's bare `incr`, which raises on a missing key,
isn't enough alone; and a cache error lets the save through, since `_check_throttles` can only allow a request or answer
429, and a 429 would wrongly tell the user they had saved too often. Django Ninja's own rate throttles can't serve:
`SimpleRateThrottle.allow_request` reads a user's history and `throttle_success` writes it back separately, so
concurrent saves from one account overwrite each other's count, and `UserRateThrottle.get_cache_key`, behind the
existing `TestAwareUserThrottle`, keys on `request.user`, which bearer-token sign-in never sets. Like the existing
throttles, the class stands aside in tests unless a test enables throttling. Reads and deletes, and other users' saves,
are not limited by it.

**Ownership.** Each route reads and writes only the signed-in user's record, with tests for another user's record and
for no user.

**Responses.** Each route declares these, with every error body the shared error schema (D3):

| Route | Success | Errors |
| --- | --- | --- |
| `GET /user-movie-data/{tmdb_id}` | 200 `UserMovieDataSchema`, including a record that holds no state | 401 not signed in; 404 no record (no TMDB request is made); 422 invalid `tmdb_id` |
| `PATCH /user-movie-data/{tmdb_id}` | 201 `UserMovieDataSchema` when created; 200 when updated | 400 a body that isn't valid JSON, a body with no known field, a `watched_at` date with an unwatched result, or TMDB rejecting the request; 401; 403 CSRF check failed; 404 TMDB has no such movie; 422 a missing body, an invalid field or an invalid `tmdb_id`; 429 save limit; 502 TMDB failed or answered data that fails validation; 503 TMDB busy; 504 TMDB timed out |
| `DELETE /user-movie-data/{tmdb_id}` | 204, no body; the `Movie` row stays | 401; 403 CSRF check failed; 404 no record; 422 invalid `tmdb_id` |
| `GET /user-movie-data/movies` | 200 `MovieListResponseSchema` (D7) | 401; 422 invalid query |

The PATCH's 404, 502, 503 and 504, and its 400 for TMDB rejecting the request, arise only when the movie isn't stored
yet: a save of a stored movie makes no TMDB request (D8). Any route can also answer an undeclared 500 for an
unexpected error; one case is known, the admin-delete window above. A PATCH body past Django's 2.5 MB upload limit
answers an undeclared 413 with the shared body, as every endpoint that reads a body does through the API-wide
handler.

### D7. The Library is paginated and served from the database

`GET /user-movie-data/movies`, with these query parameters:

| Parameter | Values | Default |
| --- | --- | --- |
| `watchlist`, `watched`, `liked`, `rated` | boolean; each restricts when true, and false restricts nothing | false |
| `sort` | `added`, `watched`, `rating`, `title` or `release` | `added` |
| `direction` | `desc` or `asc` | `desc` |
| `page` | integer from 1 to 1,000,000 | 1 |
| `page_size` | integer from 1 to 100 | 20 |

- **Filters:** `watchlist` keeps records on the watchlist, `watched` watched ones, `liked` liked ones, and `rated` those
  with a rating, combined with AND. With none set, the list holds every record with any state (a flag true, a rating or
  a review), so a movie taken off the watchlist and never otherwise touched drops out.
- **Order:** `added` sorts by `created_at`, `watched` by `watched_at`, `rating` by the user's rating (there is no sort
  by TMDB's score), `title` by the movie's title and `release` by its `release_date`, in `direction`. Nulls sort last
  either way, and every order ends on the TMDB ID in the same direction, so the order is deterministic and pages don't
  overlap while the list is unchanged. A write between two page requests shifts the rows after it, so a client
  refetches the pages it has loaded after any write (a save or a DELETE). `added` is when the user first saved anything
  about the movie, so a movie taken off the watchlist and added back keeps its first date; the watchlist's own order
  comes with drag-and-drop.
- **Pages:** the query schema validates every parameter, so a value outside the table (an unknown `sort` or
  `direction`, a `page` outside 1–1,000,000, a `page_size` outside 1–100) is a 422; `paginate_queryset` slices. A page
  past the end returns no results with valid counts. The page cap only keeps the database offset from overflowing; no
  real list reaches it.
- **Response:** `MovieListResponseSchema`. Each item is a `MovieListItemSchema` built from the `Movie` row's card
  fields (D8), `tmdb_id`, `title`, `poster_path`, `release_date`, `vote_average`, `vote_count`, `runtime`, `genre_ids`
  and `overview`, with the user's `UserMovieDataSchema` as its `user_movie_data`. `page` echoes the request,
  `total_results` counts every matching record and `total_pages` is the page count at this `page_size`. A further page
  exists while `page` is below `total_pages`; `next_tmdb_page_start` is null because a database list has no TMDB cursor,
  not because the list has ended.
- **Cost:** the service's read is the page's rows with their movies in one query, plus the count: two queries whatever
  the collection's size, and no TMDB request. Tests pin the service's two queries and show the endpoint's query count
  doesn't grow with the collection. `fetch_movies_batch` loses its only caller, and `pipelines/batch.py` goes whole
  with its tests (D2).

`strategy-pagination.md` gains the rule for lists served from the database: page numbers through `paginate_queryset`,
these bounds, a 422 outside them, an empty page past the end, the `MovieListResponseSchema` envelope with `page` and
`total_pages` signalling a further page and `next_tmdb_page_start` null, an order that ends on a unique key, and a
client's refetch of its loaded pages after any write (a save or a DELETE). Its End-of-Results Signal section and
`MovieListResponseSchema`'s docstring change to say that a null `next_tmdb_page_start` ends only a TMDB-backed list.

### D8. Card data is stored on `Movie` and written by one mapping

`Movie` (in `apps/core/models.py`) gains nullable `vote_average`, `vote_count`, `runtime` and `overview`, a `genre_ids`
integer array that defaults to empty, and `created_at`, `updated_at` and `refreshed_at`, since it is no longer written
once. `updated_at` moves on any write, the admin's included, as the project's data-integrity rules require.
`refreshed_at` is set whenever one of the writers below stores the card fields and moved by nothing else, so D9's
stale check reads it. This is a `core` migration beside the `UserMovieData` one, reversible like it; existing rows take
the migration time as `created_at`.

The card fields come from TMDB's movie-details response alone, one request per movie, through one mapping that
validates the response as `TMDBMovieDetail` and maps it to the `Movie` fields. It turns TMDB's empty release date into
null, as `create_movie_detail_from_tmdb` and `create_movie_base_from_tmdb` do, stores a runtime of 0 or null and an
empty or null overview as null, and derives `genre_ids` from `genres`. `create_movie_detail_from_tmdb`, which turns
those unknowns into 0 and `""`, stays the detail page's. Three writers use the mapping:

1. **A save** whose `Movie` row is missing fetches the details and creates the row with `get_or_create`, carrying the
   card fields. A save of a movie already stored makes no TMDB request. An unknown TMDB ID is a 404 and a TMDB failure
   an upstream error, with nothing written. This replaces `create_movie_stub`, which goes with the repository (D2).
2. **A movie's detail view:** the movie service call behind the detail endpoint (today `MovieService.get_movie_by_id`,
   called from `get_movie_detail`) updates the row's card fields from the details it has fetched when the row exists,
   and never creates one. The route stays HTTP-only. Since the method changes here, its remaining `HttpError(502)`
   becomes an `UpstreamError`.
3. **The nightly refresh** (D9).

Rows stored before the migration show the new fields empty, with no `refreshed_at`, until the first refresh:
migrations make no TMDB calls.

### D9. The nightly refresh runs inside the existing maintenance job

A `refresh_movie_cards` management command runs as a new step of `infrastructure/deploy/maintenance.sh`, after the
token and session clean-ups and before the success ping. That script's heartbeat already reports a failed step and a
missed night, which is the alert a stopped refresh needs.

**What it keeps.** Every stored `Movie` row's card fields are at most seven days old, or the night reports a failure,
well inside TMDB's six-month limit. A row's age is its `refreshed_at` (D8); a row without one counts as stale.

Each run:

- takes the rows stalest first, those without a `refreshed_at` ahead of the rest, one details request at a time, and
  deletes none;
- stops once it has run for 20 minutes, under the 30 minutes a deploy waits for the operations lock (`flock -w 1800`
  in `bootstrap.sh`'s deploy worker); the rows it didn't reach are the stalest the next night;
- leaves a row that fails unchanged for the next night, whatever the failure: a timeout, a 5xx, a 429, a response that
  fails validation, or a 404 for a movie TMDB no longer has;
- prints how many rows it refreshed and how many failed, then, last, the TMDB IDs of rows more than seven days old;
- exits non-zero, so the heartbeat reports the night as failed, when any row is more than seven days old after the
  run.

`maintenance.sh` keeps this step's output in the maintenance unit's journal every night, not only when a step fails;
the failure ping carries the output's last 20 lines, which end with the stale IDs.

A movie TMDB has removed fails every night, so from its eighth day the heartbeat fails until a person settles it in the
admin. Deleting its `Movie` row ends the alert and takes its users' records with it. To keep those records, a person
first moves them to the movie's new TMDB ID, adding that movie's row if it isn't stored and merging any record a user
already has for it, then deletes the old row. Until it is settled, the maintenance check stays failed and reports no
other failed step or missed night, so settling it is prompt work. Nothing automatic clears or deletes a row, so a fault
that answers 404 broadly changes no data. The deploy README's "Nightly jobs and monitoring" section gains this
procedure, so the person who receives the alert has it.

The command takes its TMDB client by injection, and its tests pass a stub (D2);
`infrastructure/deploy/tests/test_nightly.py` covers the new step.

On the supported previous release (`f49b683`), whose backend has no `refresh_movie_cards`, the step fails and the
heartbeat reports it. That is correct, since nothing refreshes the rows there, and the deploy README's compatibility
statement and `infrastructure/deploy/tests/test_installed_operations.py` change to say so.

### D10. The frontend adapts minimally

Removing the old routes breaks `userMovieDataService.ts`, which names them: its route constants change, its read by
TMDB ID takes the ID as a path parameter in place of `?tmdb_id=`, its create and update-by-id calls become the PATCH,
and `deleteUserMovieData`, which nothing calls, is removed. `userMovieService.ts`'s Library query gains `page_size`,
its `page`, ignored until now, takes effect, and its docstrings stop promising TMDB enrichment. The three call sites
below adapt minimally on top:

- `toggleMovieWatchlist` sends one `PATCH /user-movie-data/{tmdb_id}`, and its create-then-retry path goes. The value
  it sends is the one the card shows it moving to, passed in from `MovieCard`'s displayed state through
  `useMovieActions`' `toggleWatchlist`, which takes it as an argument, not one derived from the `movie` prop: nothing
  refreshes that prop after a save, so a second click on a card first drawn with no user data would otherwise send
  `true` again while the card shows the movie removed.
- `useUserMovieData` reads `GET /user-movie-data/{tmdb_id}`, treats a 404 as no record, and saves through the PATCH,
  so a movie never touched before can be added to the watchlist from its detail page.
- `Watchlist.tsx` reads the Library with `watchlist=true`, first page at the largest page size, and keeps its text
  list. A watchlist longer than 100 shows its first 100.

The API types are regenerated, references to the removed schema types move to their replacements, and the affected
tests follow the new routes. A save refused with a 429 fails as any failed save does today; nothing new handles it.
The adapted call sites keep their existing `useEffect` fetches, and their saves stay direct calls outside any
mutation: an exception to the rule that server data is read through TanStack Query and changed through mutations,
until the frontend's server state moves onto it, since moving them here would be that move (Non-Goals).

## 5. Design Decisions

- **D1: tests first, with plain factory functions.** The tests move before the code so they guard the fold and the
  model change. Plain factory functions in the app's test helpers are chosen over factory_boy, which would add a
  dependency for one app's tests. _ADR:_ covered by ADR-025 for moving the tests to the database; plain factory
  functions are `none`, a tactical choice.
- **D2: fold the repository.** ADR-025 records the alternatives (keep the repository and its mock tests; keep it with
  database tests). Under the upsert a save can't duplicate a record, so ADR-025's sentence mapping a duplicate save to
  a `ConflictError` no longer describes anything. _ADR:_ the fold is covered by ADR-025; the dropped 409 is superseded
  by D6's new ADR.
- **D3: a shared error schema for declared responses**, over reusing `ApiErrorSchema`, whose fields describe the
  error-code listing rather than the body clients receive. _ADR:_ covered by ADR-024 for the domain exceptions and
  their status codes; declaring the error responses on the routes, with the shared schema, is `none`: a framework
  convention plain from the code.
- **D4: constraints in the database, a client-supplied watched date, a bounded review.** The constraints follow the
  project's data-integrity rules. The watched date is the client's calendar day, since the server's UTC clock can't
  know the user's date. Any valid date is accepted over a range check such as refusing future dates: the server can't
  tell the user's today, and a wrong date affects only that user's own sort. A review is bounded at 10,000 characters,
  over leaving it to the 2.5 MB request-body limit, so one account can't store unbounded text; the bound is generous
  for a review, and a review screen may show a lower count of its own. A watchlist order field is left out: where new
  movies land and whether positions are dense or sparse are drag-and-drop's design, and this change would have to
  maintain the field on every watchlist change with nothing reading it; drag-and-drop adds it, with a backfill from
  `created_at`, in a migration of its own. Both migrations (D4, D8) are reversible, over forward-only, because the
  deploy runbook rolls back by reversing the schema as a separate operation and stops at an irreversible migration.
  _ADR:_ `none`: the fields and constraints follow the data-integrity rules, and the bounds and reversibility are
  tactical choices plain from the code.
- **D5: one schema.** It follows from D6: nothing addresses a record by its database `id` any more. _ADR:_ `none`, a
  tactical choice.
- **D6: `PATCH /user-movie-data/{tmdb_id}` as an upsert**, over:
    - today's create-or-patch, which leaves the client choosing and keeps the GET-then-PATCH fallback;
    - `PUT /user-movie-data/{tmdb_id}` replacing the whole record, which is simple, but a card holding stale state in
      one tab overwrites a rating or review written in another;
    - `PUT` with merge semantics, which is the same behaviour as a PATCH under a verb that promises replacement.

  A field left out is unchanged, so no stale card can wipe another field, and PATCH may create a missing resource.
  ADR-026 named `PUT`. **Save limits** are chosen over accepting the risk with the nightly alert as its only detector:
  without them one account could add tens of thousands of stored movies in a day, each first save a TMDB request on
  the server's shared key, past what the nightly refresh covers. The daily limit bounds that growth, so one account
  would need about 35 days to outgrow the refresh's window (about 5,000 rows a night over seven days), while a person
  logging their history can still save about 300 movies a day. The minute limit bounds how fast one account's saves
  can call TMDB; the public movie endpoints, which call TMDB on every request without a limit, are outside it. The
  counts are exact, in fixed windows, over Django Ninja's rate throttles, which lose counts when saves arrive at once
  (and whose user throttle keys on `request.user`, unset for bearer-token sign-in): a script sending saves in parallel
  would otherwise outgrow the refresh's window in days. A fixed window lets one account reach up to twice a limit
  across a window boundary, but over days its saves still average at most 1,000 a day, so the 35-day figure holds.
  These bounds hold while the cache is reachable. A cache error lets saves through, because Django Ninja's throttle
  check can only allow a request or answer 429: a 429 would wrongly blame the user, and raising would answer Django's
  HTML 500. While the cache is down, the nightly alert is the only detector.
  _ADR:_ a new ADR for the save, superseding ADR-026 in part (its `PUT` save) and ADR-025 in part (its duplicate-save
  409), and recording the save limits and their reason.
- **D7: page numbers through `paginate_queryset`**, over a cursor, which suits TMDB's buffered pages, not a database
  list with a deterministic order; `paginate_queryset` already bounds page size and reports counts. _ADR:_ the
  pagination is covered by ADR-026, which names that strategy rule, and the realization amendment to ADR-026 (D9)
  records the page read's count query; page numbers over a cursor, the page cap, and the filter and sort set, are
  `none`: tactical choices plain from the code.
- **D8: card data on `Movie`.** ADR-026 records the alternatives (a Redis cache for TMDB GETs; parallel per-page
  fetches with a refresh job). _ADR:_ covered by ADR-026.
- **D9: inside the existing maintenance job, with removed movies settled by a person.** The job's heartbeat already
  reports a failed step and a missed night. A movie TMDB has removed raises the alert and waits for a person, over
  clearing or deleting it automatically, so a fault that answers 404 broadly changes no data. _ADR:_ the refresh is
  covered by ADR-026, whose nightly job keeps every stored row inside TMDB's limit. How the job treats a movie TMDB has
  removed (an alert, then a person settles it) is a dated amendment to ADR-026's Risks: it adds to the risk ADR-026
  names without changing its Decision. The same amendment notes this change as ADR-026's realization and adds what it
  learned to two of its Consequences, without contradicting them: card fields are at most a day old while one night's
  run covers every row, and at most seven days old before the nightly check fails; and the service's read of a Library
  page also runs a count query, two queries in the service in all. The job's home and its run rules are tactical.
- **D10: minimal adaptation.** The interim watchlist shows its first 100 movies; with no real users yet, nobody has
  more. _ADR:_ `none`: temporary.
- **Delivery: the backend layer and its contract land as this change.** Backend and frontend together forecast about
  9,000–12,000 changed lines, past what one review of the whole change set here is meant to hold. This change alone
  forecasts about 5,000–7,000, some 1,800 of them deletions (the repository and the mock-based tests): one concern, the
  backend layer and its contract, reviewed as one change. The frontend's move of its server state onto TanStack Query
  follows as separate work, and the seam between them is the generated API contract. _ADR:_ `none`: how the work is
  delivered, not a decision about the system.

**ADRs this work delivers:**

- **A new ADR, "Save a user's movie data with one PATCH by TMDB ID"** (D6): the upsert, the meaning of an omitted
  field and of an explicit `null`, concurrent saves resolved by `get_or_create` and a row lock in place of a 409, and
  the per-user save limits, counted exactly in fixed windows while the cache is reachable and letting saves through on
  a cache error, with their reasons. It sets ADR-026's Status to
  `Accepted; Superseded in part by ADR-NNN (the PUT save)` and ADR-025's to
  `Accepted; Superseded in part by ADR-NNN (the duplicate-save 409)`, NNN being its number.
- **A dated amendment to ADR-026** (D7, D9), noting this change as the decision's realization. In its Risks: a movie
  TMDB has removed fails each night's refresh, raises the seven-day alert, and waits for a person to settle it in the
  admin. In its Consequences, as learnings added to them: card fields are at most a day old while one night's run
  covers every row and at most seven days old before the nightly check fails, and the service's read of a Library page
  also runs a count query, two queries in the service in all.

## 6. Cross-cutting Considerations

### Security

- **Ownership.** Every route is scoped to the signed-in user's records; tests cover another user's record and no user
  (D6).
- **CSRF.** PATCH and DELETE are unsafe requests, checked by the existing CSRF middleware for every authentication
  path; its 403 is declared on both (D6), and tests with CSRF checks enforced cover both by TMDB ID (D2).
- **Input bounds.** The rating's range, the review's length and its lack of NUL characters, a positive `tmdb_id`, the
  Library's page bounds and its enumerated `sort` and `direction` are checked by the request and query schemas, and
  the data invariants again by the database (D4, D5, D7).
- **Save limits** bound how many TMDB requests one account's saves make a minute and how many stored movies they add a
  day, while the cache is reachable; a cache error lets saves through (D6).
- **No external text or personal data leaks.** TMDB's status and error text never reach a client (D3). Logs identify a
  record by the user's ID and the TMDB ID, never by review text.

### Performance

- **Library:** two queries per page in the service, whatever the collection's size, and no TMDB request (D7).
- **Saves:** a save of a stored movie makes no TMDB request; a first save of an unstored one makes one (D8).
- **Detail view:** one more database write when the movie is stored (D8).
- **Nightly refresh:** stored movies stay in the hundreds before launch. At 50–250 ms a request, one at a time, 1,000
  rows take one to four minutes a night, and the 20-minute budget covers about 5,000, so at current volume every row
  is refreshed each night. A much larger catalogue would want parallel requests; nothing needs them yet.
- **Throttle state:** the save limits keep two small counters for each user who saved within the current minute or
  day, in the Django cache on Redis, whose production instance is capped at 48 MB with least-recently-used eviction.
  Each counter expires with its window. An evicted counter resets that user's count, and an unreachable cache lets
  saves through: both fail open (D6).

### Testing

- **Test-first** for the model, the service, the endpoints and the command, against the real test database. Only the
  boundaries are replaced: TMDB at its client (an injected stub, D2); time, for the refresh's 20-minute budget and the
  save limits' minute and day windows; and the cache, only for two save-limit cases: unreachable (a settings override
  of `CACHES` to an address that refuses connections) and a counter deleted between its creation and its increment.
- **CSRF:** with CSRF checks enforced, a session-signed-in PATCH and DELETE by TMDB ID are refused without a token and
  accepted with a matching one (D2, D6).
- **Concurrency:** two first saves of one unstored movie, run on two threads with real transactions, both succeed (D6).
- **Constraints** are tested by writing through the ORM directly, past the service, so a test fails if a constraint is
  missing (D4).
- **Query count:** pinned at two for the service's Library read, and the endpoint's shown not to grow with the
  collection (D7).
- **Save limits:** tested with throttling enabled, including saves from one account sent at the same moment, a save
  half a second before a window ends, a counter deleted between its creation and its increment, and an unreachable
  cache. They run against the Redis cache the tests already use, enabling throttling without the existing
  `enable_throttling` marker, which also swaps the cache for a `LocMemCache` that neither truncates expiry to whole
  seconds nor uses the Redis increment D6 relies on (D6).
- **Frontend:** the affected tests follow the new routes, mocking the network rather than internal modules (D10).
- **Deploy scripts:** `test_nightly.py` covers the new step, and `test_installed_operations.py` the previous release's
  failing step (D9).

### Migration and rollout

- **Two migrations,** `core` (the `Movie` fields) and `user_movie_data` (the reshape), both reversible. The review
  truncation, then the conversion of empty or whitespace-only reviews to `null`, run before the review constraints.
  Existing rows take the migration time as `created_at`. Migrations make no TMDB calls.
- **After the deploy,** rows stored before it carry no card fields until the first nightly run. That is acceptable
  before launch, and avoids running the command on staging by hand.
- **Rolling back** across this change follows the deploy runbook: with the backend's writers stopped, this release's
  image reverses both migrations, which they support, and only then does the deploy switch to the older release. A
  release that supplies its own job scripts installs its own maintenance job, without the new step; on `f49b683`,
  which supplies none, the installed job keeps the step, which fails, and the heartbeat reports it (D9).
- **Release order:** backend, migrations and the frontend's adaptation ship together; the old routes are removed in the
  same change that stops the frontend calling them. A browser tab still running the previous frontend after the deploy
  sends its saves to `/user-movie-data/{id}` with a record's database ID, which the new route reads as a TMDB ID, so it
  writes another movie's record. That is accepted: there are no real users, and this deploys before launch.

### User-facing impact

- The watchlist page reads its list from the Library: a watchlist longer than 100 shows its first 100 (D10).
- Until the first nightly refresh, the Library's items for movies stored before the deploy carry no vote average,
  vote count, runtime, genres or overview. No screen shows those fields from the Library yet.
- A movie never touched before can be added to the watchlist from its detail page (D10).

### Assumptions

- **TMDB's details response carries every card field.** `TMDBMovieDetail` validates `vote_average`, `vote_count`,
  `runtime`, `overview` and `genres` today; `genre_ids` derive from `genres`.
- **The removed `id` and `title` have no other frontend reader.** `id`'s readers are `toggleMovieWatchlist`
  (`movieInteractionService.ts`) and `useUserMovieData`, both adapted in D10, and nothing reads `title` from a user's
  data. On the backend, `create_movie_stub` and the Django admin are the only writers of `Movie` today.

## 7. Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven after merge** criteria need the change running on
staging from its deploy, so they are checked once it has merged, with their evidence recorded before the work is
archived. Each criterion is marked with its evidence beside it.

### Implemented

1. **The success signal.** With 200 records for one user, a test shows the service's Library read runs exactly two
   queries (the count, and the page with its movies) and the TMDB stub receives no request, and another shows the
   endpoint runs the same number of queries for 1 record as for 200; and API tests show one
   `PATCH /user-movie-data/{tmdb_id}` sets each field from a record holding no state and from one holding every field,
   and clears a rating, a review and a watched date with an explicit `null`. (D6, D7)
2. **Service tests on the database.** The rewritten service tests pass at the commit that adds them, before the
   repository is removed; they replace only TMDB, and no test in `apps/user_movie_data` mocks the repository, the
   QuerySet or `MovieService`. (D1)
3. **The fold is complete.** `repositories.py` and `pipelines/batch.py` with its tests are gone, and a search of the
   repository outside ADRs and the planning records in `.arc/backlog/`, `.arc/active/` and `.arc/reference/archive/`
   finds no `UserMovieDataRepository`, `fetch_movies_batch`, `get_all_user_movies`, `UserMovieDataDetailSchema`,
   `UserMovieDataCreateSchema`, `UserMovieDataUpdateSchema`, `UserMovieDataModelSchema` or `by-tmdb-id`, and no test,
   test helper or docstring sends or shows a request to a removed route or to a user-movie-data route addressed by a
   record's database ID. `UserMovieDataService` takes no repository or `MovieService`. (D2)
4. **Errors.** No `HttpError` remains in `apps/user_movie_data` or in `MovieService.get_movie_by_id`. The committed
   OpenAPI schema lists, for each user-movie-data route, exactly the success and error statuses in D6's Responses
   table, each error with `ErrorResponseSchema`. A test shows the movie detail endpoint answers 502 with the shared
   body when TMDB's details or credits response fails validation. (D3)
5. **Database constraints.** Tests writing through the ORM directly show the database rejects a rating of 0 and of 11,
   an empty and a whitespace-only review, a review of 10,001 characters, a `watched_at` on an unwatched record and a
   second record for one user and movie, and accepts a watched record with no date. A migration test shows an existing
   empty review becomes `null`, one of 10,001 characters is truncated to 10,000, and one of 10,001 characters whose
   first 10,000 are spaces becomes `null`. Both migrations apply and reverse. (D4, D8)
6. **The save's contract.** API tests show: a first save answers 201 and a second 200, both with
   `UserMovieDataSchema`; a field left out keeps its value; `null` for a flag, a rating of 11, a review of 10,001
   characters and a review containing a NUL character each answer 422, as does a request with no body; a body of
   `{}`, a body that isn't valid JSON and a `watched_at` date on an unwatched result each answer 400; marking a movie
   unwatched clears its date, and `watched_at: null` with `user_watched: false` is accepted; a whitespace-only review
   is stored as `null`; a save leaving no state keeps the record, which GET returns and the Library leaves out; GET
   and DELETE answer 404 with no record; DELETE answers 204 and keeps the `Movie` row; each route answers 401 with no
   user and never reads or writes another user's record; and, with CSRF checks enforced, a session-signed-in PATCH and
   DELETE answer 403 without a token and succeed with a matching one. (D2, D5, D6)
7. **Concurrent first saves.** Two first saves of one unstored movie, sent at once on two threads with real
   transactions, both succeed, leaving one `Movie` row and one record holding both saves' fields. (D6)
8. **Save limits.** With throttling enabled against the Redis cache, for a user signed in by bearer token and for one
   signed in by session, the 31st save within one clock minute and the 1,001st within one UTC day answer 429 with a
   `Retry-After` header and change nothing; 40 saves from one user sent at the same moment on parallel threads, within
   one minute, leave exactly 30 succeeding; a save half a second before either window ends succeeds and is counted; a
   save whose counter is deleted between its creation and its increment succeeds and counts as one; with `CACHES`
   pointed at an address that refuses connections, a save still succeeds; and another user's saves from the same
   address, and the first user's reads and deletes, still succeed. (D6)
9. **The Library.** API tests show each filter alone and combined, each sort in both directions with nulls last and ties
   ordered by TMDB ID, records with no state left out of the unfiltered list, a 422 for an unknown `sort`, a `page` of 0
   or 1,000,001 and a `page_size` of 101, an empty page past the end with valid counts, and `next_tmdb_page_start` null
   on every page. Each item carries the `Movie` row's card fields and the user's data. (D7)
10. **Card data.** Tests show a save of an unstored movie creates its `Movie` row with the mapped card fields and
    `refreshed_at` set, turning an empty release date, a runtime of 0 and an empty overview into `null` and deriving
    `genre_ids` from `genres`; a save of a stored movie makes no TMDB request; an unknown TMDB ID answers 404 and a
    TMDB failure an upstream error, writing nothing; and the detail view updates a stored row's card fields and
    `refreshed_at` and creates no row for an unstored movie. (D8)
11. **The nightly refresh.** Command tests show it refreshes rows stalest first with rows lacking `refreshed_at` ahead,
    stops at 20 minutes, leaves a failing row unchanged for each failure kind D9 names, deletes no row, prints its
    counts and then the stale IDs last, and exits non-zero exactly when a row is more than seven days old after the
    run. `test_nightly.py` shows the maintenance job runs the step after the clean-ups and before the success ping and
    keeps its output in the journal on a clean night; `test_installed_operations.py` and the deploy README state the
    previous release's failing step, and the README's "Nightly jobs and monitoring" section gives the procedure for
    settling a removed movie. (D9)
12. **The frontend.** Frontend tests show the watchlist toggle sends one PATCH carrying the value the card shows it
    moving to, so a second click on a card first drawn with no user data sends `false`; the detail page treats a 404
    as no record and adds an untouched movie to the watchlist; and the watchlist page requests `watchlist=true` with
    a `page_size` of 100. The API types are regenerated and CI's type-drift check passes. (D10)
13. **Reference documents.** `strategy-pagination.md` states the rule for database-served lists, and its
    End-of-Results Signal section and `MovieListResponseSchema`'s docstring say a null `next_tmdb_page_start` ends only
    a TMDB-backed list; the service-layer strategy and the technical overview no longer present the removed repository.
    (D2, D7)

### Proven after merge

1. **The refresh runs on staging.** With at least one movie stored on staging before the merge deploys (saved
   through the app with the staging test account if none is), a nightly maintenance run after the deploy succeeds:
   the heartbeat reports success, and the journal shows the refresh step exiting zero with a refreshed count of at
   least one and no stale ID. Afterwards `GET /user-movie-data/movies` for that account returns the movie stored before
   the deploy with its `vote_average` and `vote_count` filled. (D8, D9)

## 8. Open Questions

None.

## Amendments

- **2026-11-10,** at activation, on the Owner's decision: D6's note on undeclared responses now gives a PATCH body
  past Django's 2.5 MB upload limit an undeclared 413, since an API-wide handler merged to `main` answers every
  oversized body that way; it previously listed that body as a known 500. Wording only: no decision, task or success
  criterion changes.
