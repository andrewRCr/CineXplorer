# ADR-026: Store TMDB Card Data on Saved Movies

## Status

Accepted (Owner, 2026-11-03)

Implemented by: the planned UserMovieData consolidation.

## Context

A user's Library lists every movie they have saved. To draw each card, the backend calls TMDB once per saved movie,
one after another (`fetch_movies_batch` in `apps/movie/services/pipelines/batch.py`; TMDB's API has no batch fetch),
and the list isn't paginated. At 50–250 ms a call, that is about 2.5–12 seconds for 50 movies and 10–50 seconds for
200, while holding one of the server's 8 request slots.

The local `Movie` row stores only `tmdb_id`, `title`, `poster_path` and `release_date`, written once when a movie is
first saved and never refreshed. Cards also need the vote average, runtime, genres and overview.

Two constraints bound the choice:

- TMDB's terms of use (§ 1.C) don't allow its content to be cached for longer than six months. That already applies
  to the `Movie` rows the app stores today.
- Production Redis is capped at 48 MB with `allkeys-lru` eviction. It also holds throttle counters and
  verification-resend state, so a large cache would evict them.

### Alternatives Considered

- **(a) A Redis cache for all TMDB GETs.** About 1–1.5 days. Cold loads stay serial, and a big cache crowds out
  throttle and resend state under the 48 MB cap.
- **Lean: paginate, fetch each page's movies in parallel, and add a refresh job.** About 1.25–1.75 days. TMDB stays
  on the Library's critical path.
- **(b) Store the card fields on `Movie`, paginate, and refresh (chosen).** About 1.75–2.75 days. Ratings can drift by
  up to a day.

## Decision

We will store the fields a movie card needs on the local `Movie` row and serve the Library from the database.

- The card fields are written when a user saves a movie, refreshed when anyone opens that movie's detail page, and
  refreshed by a nightly job. The nightly job also keeps every stored row inside TMDB's six-month limit.
- Saving is an upsert by TMDB ID, `PUT /user-movie-data/{tmdb_id}`, so a card's controls no longer read a record and
  then patch it. The `Movie` row is created with `get_or_create`, so two concurrent first saves can't race into an
  error.
- The Library is paginated, with page bounds and one response envelope set out in `strategy-pagination.md`.
- Redis keeps small caches only: the genre list and the landing page's trending list.

## Consequences

### Positive

- The Library loads from one database query per page, whatever the size of the collection.
- Fewer TMDB calls, and Redis stays free for throttling and resend state.
- The refresh job brings data the app already stores within TMDB's caching terms.

### Negative

- A movie's vote average and other card fields can be up to a day old.
- `Movie` grows several columns, a migration, and a nightly job to run and monitor.
- Card data is written in three places (the save, the detail view and the nightly job), which must agree.

### Risks

- If the nightly job stops running, rows can age past the six-month limit unnoticed. The job needs a heartbeat
  check, so a missed run raises an alert.

This doesn't change [ADR-018](adr-018-remove-runtime-filtering-parameter.md): storing a saved movie's runtime for
its card doesn't make runtime filterable across TMDB's catalogue.

## References

- [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use), § 1.C
- `backend/apps/core/models.py` (`Movie`), `backend/apps/movie/services/pipelines/batch.py`
- `.arc/reference/strategies/project/strategy-pagination.md`
- [ADR-025](adr-025-fold-repository-into-service-layer.md), the service these writes go through
