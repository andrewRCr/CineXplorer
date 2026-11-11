# Draft: User-Movie Data Layer

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-10

**Purpose:** Consolidate the backend's user-movie data (watchlist, watched, liked, rating and review) into one service
over a constrained model, saved with one call addressed by TMDB ID, and serve the Library from card data stored on
`Movie` instead of one TMDB call per saved movie. The frontend's move of its server state onto TanStack Query is
separate work that builds on this API.

---

## Problem / Motivation

Every user feature planned for launch builds on this layer: the watched, liked, rating and review controls, the Log
form, the Library and the watchlist grid. Today it can't carry them:

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

There are no real users yet, so the migrations carry no data worth keeping, and every later user feature is cheaper
on the consolidated layer than ahead of it.

## Alternatives

ADR-024 (domain exceptions), ADR-025 (repository folded into the service) and ADR-026 (card data stored on `Movie`)
already settle the direction; they record the alternatives behind it. The choices left open here:

- **How a save is addressed and sent.**
    - _Today's create-or-patch:_ the client keeps choosing, and keeps the GET-then-PATCH fallback.
    - _`PUT /user-movie-data/{tmdb_id}`, replacing the whole record:_ simple, but a card holding stale state in one
      tab overwrites a rating or review written in another.
    - _`PUT` with merge semantics:_ the same behaviour as a PATCH under a verb that promises replacement.
    - **`PATCH /user-movie-data/{tmdb_id}` as an upsert (chosen):** a field left out is unchanged, so no stale card
      can wipe another field, and PATCH may create a missing resource. ADR-026 named `PUT`; a new ADR supersedes
      that part of it (Decision 6).
- **A watchlist order field in this migration.** Adding it now would spare drag-and-drop a later migration, but where
  new movies land and whether positions are dense or sparse are that feature's design, and this work would have to
  maintain the field on every watchlist change with nothing reading it. Left out (Owner, 2026-11-10): drag-and-drop
  adds it, with a backfill from `created_at`, in a migration of its own.
- **Library pagination.** _A cursor_ suits TMDB's buffered pages, not a database list with a deterministic order.
  **Page numbers through the existing `paginate_queryset` (chosen)**, which already bounds page size and reports
  counts.
- **Test data.** _factory_boy_ would add a dependency for one app's tests. **Plain factory functions in the app's test
  helpers (chosen)**, replacing the mock builders there.
- **Delivery as one change or two.** Backend and frontend together forecast about 9,000–12,000 changed lines and
  some eight task phases, past the size a single review here is meant to hold. **The backend lands first as this
  change (chosen, Owner 2026-11-10)**; the frontend's TanStack Query move follows as its own, against the API this one
  publishes. The seam between them is the generated API contract.

## Decisions

### 1. The service tests move to the real database first

Before any code moves, the 39 mock-based tests are rewritten to call the service against the test database, replacing
only TMDB at its client (`TMDBApiClient`), as the testing standards require. Model data comes from plain factory
functions in `apps/user_movie_data/tests/test_helpers.py`, which replace `create_mock_user_movie_data` and
`create_mock_movie`. The rewritten tests pass against the current code, so they guard the fold and the model change
that follow.

_ADR:_ covered by ADR-025 for moving the tests to the database; plain factory functions are `none`, a tactical choice
(see Alternatives).

### 2. The repository folds into the service, over one QuerySet

`UserMovieDataRepository` is deleted. A custom QuerySet on `UserMovieData` carries the filters several queries share:
scoping to a user, the watchlist, watched, liked and rated filters, "holds any state" (a flag, a rating or a review),
and the lookup of a user's rows for a set of TMDB IDs that enriches movie lists. No class sits between the service and
the ORM; whether the enrichment stays its own small class is an implementation choice, since it holds no data access of
its own. `UserMovieDataService` takes no injected repository or `MovieService`. It takes its TMDB client by injection,
as `MovieService` does (`tmdb_client`), and tests pass a stub built from `movie/tests/tmdb_test_builders.py`. The three
tests in `test_service_factory.py` that build services around the repository are rewritten or removed with it.

Every living reference document (the strategies and the technical overview), code comment, docstring, test helper and
configuration entry that names the removed repository, `pipelines/batch.py` or anything in it, the removed routes, the
replaced schemas or the replaced Library method (`get_all_user_movies`) changes in the same change. ADRs, archived
records and backlog plans stay as written. `pipelines/batch.py` is removed whole, since nothing else in it is used.

Under the upsert (Decision 6) a save can't duplicate a record, so ADR-025's sentence mapping a duplicate save to a
`ConflictError` no longer describes anything; a concurrent first save resolves through `get_or_create` instead.

_ADR:_ the fold is covered by ADR-025; the dropped 409 is superseded by Decision 6's new ADR.

### 3. Errors are domain exceptions, declared on the routes

The service raises `NotFoundError` when the user has no record for a movie, and TMDB failures reach it as the domain
exceptions `handle_tmdb_api_error` already raises (`NotFoundError`, `InvalidInputError` for TMDB's 400 and 422, and
`UpstreamError`). In `get_movie_by_id`, a validation failure anywhere in converting TMDB's data (the details, the
credits or the detail schema) is an `UpstreamError` (502), as `validate_tmdb_response` already answers for the genre
list, where today `unhandled_error` answers it 500; so is one in the card mapping a save calls (Decision 8), and the
nightly run counts it a failed row (Decision 9). Other endpoints keep their current handling, and
`response_factories.py`'s module docstring says so. No `HttpError` remains in the app.

Every route declares its error responses, so the generated frontend types carry them, with a shared schema in
`apps/core/schemas.py` matching the body `error_body` builds: `detail`, and `code` when there is one. The existing
`ApiErrorSchema` describes the error-code listing's entries (`code`, `message`, `category`, …), not that body, so it
isn't used for them.

_ADR:_ covered by ADR-024 for the domain exceptions and their status codes; declaring the error responses on the
routes, with the shared schema, is `none`: a framework convention plain from the code.

### 4. One migration reshapes `UserMovieData`

- `created_at` and `updated_at`.
- `watched_at`, a nullable date: the calendar day the user watched the movie, as the client sends it. The server's
  clock runs on UTC and never supplies the date. A `CheckConstraint` keeps it null unless `user_watched` is true;
  watched with no date is allowed and means the date is unknown. Marking a movie unwatched clears it.
- A `CheckConstraint` holding `user_rating` null or between 1 and 10; the validators stay for admin forms.
- A review is null or holds text: the request schema and the admin form both turn an empty or whitespace-only review
  into `null`, and a `CheckConstraint` rejects an empty or whitespace-only one. The migration converts existing ones
  to `null` first.
- `UniqueConstraint(user, movie)` replaces `unique_together`.
- One index on `(user, -created_at)` replaces the three single-flag indexes.
- Not added: a watchlist order field (see Alternatives), rating history or more than one viewing per movie.

Existing rows take the migration time as `created_at`; they exist only in development and staging databases.

_ADR:_ `none`: the fields and constraints follow DEVELOPMENT-RULES § Data Integrity and are plain from the code.

### 5. One schema for a user's data about a movie

The endpoints and the movie list and detail payloads share one schema, replacing `UserMovieDataDetailSchema` and
`apps.movie.schemas.UserMovieDataSchema`: `tmdb_id`, `user_watched`, `user_on_watchlist`, `user_liked`, `user_rating`,
`user_review` and `watched_at`. The row's database `id` leaves the API, since nothing addresses a record by it any more.

_ADR:_ `none`: a tactical choice that follows from Decision 6.

### 6. The API is addressed by TMDB ID

| Route | Behaviour |
| --- | --- |
| `GET /user-movie-data/{tmdb_id}` | The user's record for the movie; 404 when there is none. |
| `PATCH /user-movie-data/{tmdb_id}` | Upsert: 201 when it creates the record, 200 when it updates it. |
| `DELETE /user-movie-data/{tmdb_id}` | 204; 404 when there is no record. |
| `GET /user-movie-data/movies` | The Library (Decision 7). |

`POST /user-movie-data`, `PATCH` and `DELETE /user-movie-data/{id}`, and `GET /user-movie-data/by-tmdb-id` are removed.

**The PATCH.** Every field is optional. A field left out keeps its value, or its default when the record is created
(flags false, the rest null). An explicit `null` clears `user_rating`, `user_review` or `watched_at`; `null` for a flag
is a 422. A request whose result is unwatched but carries a `watched_at` is a 400 (`InvalidInputError`), and so is a
body with no fields. A save that leaves a record with no flag, rating or review keeps the record (Owner, 2026-11-10):
GET still returns it, and the Library leaves it out (Decision 7).

**The order of a save.** The service first runs the checks the body alone decides (an empty body, or a `watched_at`
holding a date sent with `user_watched: false`), then makes sure the `Movie` row exists (Decision 8), outside any
transaction, since that may call TMDB. Then, in one `transaction.atomic` block, it takes and locks the user's record
in one `select_for_update().get_or_create(...)` call, which re-creates a record a concurrent DELETE removed, applies
the fields and the watched rule, and saves. Saves to the same movie run one after another, and two first saves both
succeed. Only the watched rule needs the stored record; a first save it rejects leaves the `Movie` row behind, which
is accepted, since the nightly refresh keeps it current. Only the admin deletes a `Movie` row (the nightly refresh
deletes none, Decision 9). A save that an admin delete lands between fails its deferred foreign key when the block
commits, and `unhandled_error` answers 500, a window accepted as too narrow to handle.

**Ownership.** Each route reads and writes only the signed-in user's record, with tests for another user's record and
for no user.

_ADR:_ a new ADR for the save, superseding ADR-026 in part (its `PUT` save) and ADR-025 in part (its duplicate-save
409, Decision 2).

### 7. The Library is paginated and served from the database

`GET /user-movie-data/movies`:

- **Filters:** `watchlist`, `watched`, `liked` and `rated`, each a boolean that restricts when true, combined with
  AND. With none set, the list holds every record with any state, so a movie taken off the watchlist and never
  otherwise touched drops out.
- **Order:** `sort` is one of `added` (`created_at`, the default), `watched` (`watched_at`), `rating` (the user's
  rating; there is no sort by TMDB's score), `title` or `release` (`release_date`), and `direction` is `desc` (the
  default) or `asc`. Nulls sort last either way, and every order ends on the TMDB ID, so the order is deterministic
  and pages don't overlap while the list is unchanged. A write between two page requests shifts the rows after it,
  so a client refetches the pages it has loaded after any write (a save or a DELETE). `added` is when the user first
  saved anything about the movie, so a movie taken off the watchlist and added back keeps its first date; the
  watchlist's own order comes with drag-and-drop.
- **Pages:** `page` from 1 (default 1) and `page_size` from 1 to 100 (default 20), validated by the query schema, so
  a value outside them is a 422; `paginate_queryset` slices. A page past the end returns no results with valid counts.
- **Response:** `MovieListResponseSchema`, each item built from the `Movie` row's card fields with the user's data
  attached. A further page exists while `page` is below `total_pages`; `next_tmdb_page_start` is null because a
  database list has no TMDB cursor, not because the list has ended.
- **Cost:** the page's rows with their movies in one query, plus the count; no TMDB call. A test pins the query count.
  `fetch_movies_batch` loses its only caller, and `pipelines/batch.py` goes whole with its tests (Decision 2).

`strategy-pagination.md` gains the rule for lists served from the database: page numbers through `paginate_queryset`,
these bounds, a 422 outside them, an empty page past the end, the `MovieListResponseSchema` envelope with `page` and
`total_pages` signalling a further page and `next_tmdb_page_start` null, an order that ends on a unique key, and a
client's refetch of its loaded pages after any write (a save or a DELETE). Its End-of-Results section and
`MovieListResponseSchema`'s docstring change to say that a null `next_tmdb_page_start` ends only a TMDB-backed list.

_ADR:_ the pagination is covered by ADR-026, which names that strategy rule; page numbers over a cursor, and the filter
and sort set, are `none`: tactical choices plain from the code.

### 8. Card data is stored on `Movie` and written by one mapping

`Movie` (in `apps/core/models.py`) gains nullable `vote_average`, `vote_count`, `runtime` and `overview`, a
`genre_ids` integer array that defaults to empty, and `created_at`, `updated_at` and `refreshed_at`, since it is no
longer written once. `updated_at` moves on any write, the admin's included, as DEVELOPMENT-RULES § Data Integrity
requires. `refreshed_at` is set whenever one of the writers below stores the card fields and moved by nothing else, so
Decision 9's stale check reads it. This is a `core` migration beside the `UserMovieData` one.

The card fields come from TMDB's movie-details response alone, one request per movie, through one mapping that
validates the response as `TMDBMovieDetail` and maps it to the `Movie` fields. It turns TMDB's empty release date into
null, as `create_movie_detail_from_tmdb` and `create_movie_base_from_tmdb` do, stores a runtime of 0 or null and an
empty or null overview as null, and derives `genre_ids` from `genres`. `create_movie_detail_from_tmdb`, which turns
those unknowns into 0 and `""`, stays the detail page's. Three writers use the mapping:

1. **A save** whose `Movie` row is missing fetches the details and creates the row with `get_or_create`, carrying the
   card fields. A save of a movie already stored makes no TMDB request. An unknown TMDB ID is a 404 and a TMDB
   failure an upstream error, with nothing written.
2. **A movie's detail view:** the movie service call behind the detail endpoint (today `MovieService.get_movie_by_id`,
   called from `get_movie_detail`) updates the row's card fields from the details it has fetched when the row exists,
   and never creates one. The route stays HTTP-only. Since the method changes here, its remaining `HttpError(502)`
   becomes an `UpstreamError`.
3. **The nightly refresh** (Decision 9).

Rows stored before the migration show the new fields empty, with no `refreshed_at`, until the first refresh:
migrations make no TMDB calls.

_ADR:_ covered by ADR-026.

### 9. The nightly refresh runs inside the existing maintenance job

A `refresh_movie_cards` management command runs as a new step of `infrastructure/deploy/maintenance.sh`, after the
token and session clean-ups and before the success ping. That script's heartbeat already reports a failed step and a
missed night, which is the alert ADR-026's risk calls for.

**What it keeps.** Every stored `Movie` row's card fields are at most seven days old, or the night reports a failure,
well inside TMDB's six-month limit. A row's age is its `refreshed_at` (Decision 8); a row without one counts as stale.

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
admin (Owner, 2026-11-10). Deleting its `Movie` row ends the alert and takes its users' records with it. To keep those
records, a person first moves them to the movie's new TMDB ID, adding that movie's row if it isn't stored and merging
any record a user already has for it, then deletes the old row. Until it is settled, the maintenance check stays
failed and reports no other failed step or missed night, so settling it is prompt work. Nothing automatic clears or
deletes a row, so a fault that answers 404 broadly changes no data.

The command takes its TMDB client by injection, and its tests pass a stub (Decision 2);
`infrastructure/deploy/tests/test_nightly.py` covers the new step.

On the supported previous release (`f49b683`), whose backend has no `refresh_movie_cards`, the step fails and the
heartbeat reports it. That is correct, since nothing refreshes the rows there, and the deploy README's compatibility
statement and `infrastructure/deploy/tests/test_installed_operations.py` change to say so.

_ADR:_ the refresh is covered by ADR-026, whose nightly job keeps every stored row inside TMDB's limit. How the job
treats a movie TMDB has removed (an alert, then a person settles it) is a dated amendment to ADR-026's Risks: it adds to
the risk ADR-026 names without changing its Decision. The job's home and its run rules are tactical.

### 10. The frontend adapts minimally

Removing the old routes breaks `userMovieDataService.ts`, which names them: its route constants change, its read by
TMDB ID takes the ID as a path parameter in place of `?tmdb_id=`, its create and update-by-id calls become the PATCH,
and `deleteUserMovieData`, which nothing calls, is removed. `userMovieService.ts`'s Library query gains `page_size`,
its `page`, ignored until now, takes effect, and its docstrings stop promising TMDB enrichment. The three call sites
below adapt minimally on top, and the frontend's TanStack Query move replaces them next:

- `toggleMovieWatchlist` sends one `PATCH /user-movie-data/{tmdb_id}`, and its create-then-retry path goes. The value
  it sends is the one the card shows it moving to, passed in from `MovieCard`'s displayed state through
  `useMovieActions`' `toggleWatchlist`, which takes it as an argument, not one derived from the `movie` prop: nothing
  refreshes that prop after a save, so a second click on a card first drawn with no user data would otherwise send
  `true` again while the card shows the movie removed.
- `useUserMovieData` reads `GET /user-movie-data/{tmdb_id}`, treats a 404 as no record, and saves through the PATCH,
  so a movie never touched before can be added to the watchlist from its detail page.
- `Watchlist.tsx` reads the Library with `watchlist=true`, first page at the largest page size, and keeps its text
  list. A watchlist longer than 100 shows its first 100 until the frontend work lands (accepted, Owner 2026-11-10:
  there are no real users yet).

The API types are regenerated, and the affected tests follow the new routes.

_ADR:_ `none`: temporary, replaced by the frontend work.

### Boundary

Recorded as two separate changes (Owner, 2026-11-10). This half forecasts about 5,000–7,000 changed lines, some 1,800
of them deletions (the repository and the mock-based tests), in five or six phases; it is one concern, the backend
layer and its contract, reviewed as one change.

_ADR:_ `none`: how the work is delivered, not a decision about the system.

## Unknowns and Assumptions

- **Refresh volume.** Stored movies stay in the hundreds before launch. At 50–250 ms a request, one at a time, 1,000
  rows take one to four minutes a night, and the 20-minute budget covers about 5,000. A much larger catalogue would
  want parallel requests; nothing needs them yet.
- **Staging's existing rows** show cards without the new fields until the first nightly run after the deploy. That's
  acceptable before launch, and avoids running the command on staging by hand.
- **TMDB's details response carries every card field.** `TMDBMovieDetail` validates `vote_average`, `vote_count`,
  `runtime`, `overview` and `genres` today; `genre_ids` derive from `genres`.
- **The removed `id` and `title` have no other frontend reader.** `id`'s readers are `toggleMovieWatchlist` and
  `useUserMovieData`, both adapted here, and nothing reads `title` from a user's data; task generation re-checks.
  On the backend, `create_movie_stub` and the Django admin are the only writers of `Movie` today.

## Scope Boundary (Won't Do)

- **The frontend's server state on TanStack Query:** the query key factory, one save hook with optimistic updates and
  rollback, `MovieCard`'s private copy of its state removed, the session as a query, the cache cleared on sign-out,
  and the detail page's user-data query. Separate work that builds on this API.
- **The movie detail page's movie query**, which moves with the detail page's redesign.
- **A watchlist order field, drag-and-drop and Next Up.**
- **The Library and watchlist screens, sort controls, and the watched, liked, rating and review controls with the Log
  form**, which build on this API.
- **Rating history or more than one viewing per movie.**
- **Redis caches for the genre list and trending movies**, which come with the landing page.
- **Moving authentication's `{"error"}` bodies to the shared error shape.**
- **The movie grids' scroll restore after a reload and their tests' move onto MSW.** Nothing here changes the grids.

**Success signal:** for a user with 200 saved movies, `GET /user-movie-data/movies` returns a page from the database in
a pinned number of queries with no TMDB request, and one `PATCH /user-movie-data/{tmdb_id}` saves any field from any
prior state, including clearing a rating.
