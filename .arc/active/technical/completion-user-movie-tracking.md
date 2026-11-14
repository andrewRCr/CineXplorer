# Completion: User Movie Tracking

**Completed:** 2026-11-14
**Branch:** `technical/user-movie-tracking`
**Category:** Technical
**Context:** Shared tracking model and frontend layer for viewing controls and the Library

## Summary

Films now keep their current watched, watchlist, liked and rating facts separately from a private history of
viewings and reviews. Each entry retains its own date, review and rating, while backend saves enforce the rules
between those facts and history. The frontend has the shared queries, serialized writes and display components
that later controls and pages can use.

## Key Deliverables

- `UserMovieEntry` stores dated viewings and undated reviews, with optional ratings and rewatch markers. The
  reversible migration carries existing dates, reviews and ratings into entries and initializes list join times.
- Record saves and entry writes apply the tracking rules under the owning record's lock. Database constraints
  enforce the record and entry invariants; a film with a rating or entries cannot be marked unwatched.
- Authenticated entry routes create, replace, delete and read a film's history, with a paginated cross-film list
  of dated viewings. Creates and edits share the record save's throttle counters and carry the user's time zone.
- Records expose `has_entries` and `last_logged_on` through annotated reads. The Library sorts each filtered list
  by its join time, and watchlist Undo restores the earlier position.
- Frontend entry queries and writes share the existing ownership boundary and film-save queue. Confirmed server
  records supply entry effects; pending entry writes add no guessed state.
- `RatingStars` displays earned gold half stars, and `RewatchIcon` supplies an accessible rewatch marker.
  `MovieUserScore` retains the TMDB score display.
- ADR-047 records the decisions, with partial supersession notices on ADR-043, ADR-027 and ADR-042. Living
  contracts, strategy examples and generated API types reflect the new record and entry model.

## Implementation Highlights

- The current rating remains independently editable. Only a rated entry that is latest under the specified
  effective-date order can update it; deleting an entry never recomputes or clears that rating.
- Row locking serializes entry writes with record saves. The concurrency test drives both lock orders against
  PostgreSQL, preserving the watched invariant whichever operation runs first.
- Record saves capture their annotated acknowledgement before releasing the parent lock. Request-level races
  cover competing deletion and watchlist updates without replacing database results.
- Record deletion, including admin single and bulk deletion, locks its parent selection before collecting
  entries. Request-level concurrency tests cover deletion overlapping entry creation and editing.
- Retired queued entry operations reject their callers and release mounted observers from pending state,
  including offline and unmounted callers, while later owners can write normally.
- Stored local creation dates keep undated history ordering stable while the request's time zone governs future
  viewing-date validation and watchlist join-day comparisons.
- Reversing the migration restores the latest dated viewing and latest review to the earlier record shape.
  Additional entries are necessarily lost in that reverse.
- Log-summary annotations preserve one query for list enrichment and two for a Library page. The admin can view
  and delete records but cannot bypass the save rules by adding or changing them.

## Validation

The full local backend, frontend and browser suites passed during verification, together with lint, formatting,
type checking, Markdown lint, contrast and generated-type drift checks. The deletion and cancellation corrections
then passed the affected backend app and frontend tests, lint, formatting and type checks. The save-acknowledgement
correction passed its competing-request regressions, the backend app tests, lint, formatting and type checks.
API and MSW coverage includes ownership, validation, failed writes, replacement semantics, throttling, query
counts, Undo, queue order and user-change cancellation.
The live development-stack journey exercised real TMDB-backed saves, viewings, rewatches, Library reads, Undo
position and the Redis throttle; a later readback confirmed the retained history and record summaries.

## Related Documentation

- Shared design: `draft-user-movie-uis.md`, retained in the backlog for the controls and Library units
- PRD: `prd-user-movie-tracking.md`
- Tasks and criterion evidence: `tasks-user-movie-tracking.md`
- Decision: ADR-047, Keep Film Facts and Viewing Entries

## Follow-Up Work

- Criterion 16 requires the merge commit's staging deploy to apply the migration, followed by a passing staging
  smoke run. Its evidence must be recorded before archival.
- The controls and Library remain separate planned work. The last of those units to archive moves the shared
  design draft from the backlog into its archive folder.
