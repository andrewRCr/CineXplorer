# Completion: User Movie Changes

**Completed:** 2026-11-15
**Branch:** `technical/user-movie-changes`
**Category:** Technical
**Context:** Supply the film facts and private change records the Library and History need.

## Summary

Liking an unwatched film now marks it watched, with the invariant held by the database. Record saves and entry
writes keep a private record of changes on the visitor's day, Undo erases the changes it reverses, and date added
under combined filters uses the first filtered list's join time.

## Key Deliverables

- Like and unwatch rules, a database constraint and a migration converting existing liked, unwatched films.
- `UserMovieChange` rows for watchlist, watched, liked and rating changes, with value constraints and deletion
  alongside the owning film record or account.
- Recording from record saves and entry writes, and deletion of differing latest rows for changed Undo fields.
- An optional validated save time zone with a UTC fallback, filled by the shared browser save layer, including Undo;
  synchronized API schema and frontend types.
- Date-added sorting by watchlist, watched, then liked join time, falling back to record creation without those
  filters; ADR-051 and the corresponding ADR-047 and architecture documentation updates.

## Implementation Highlights

- Recording runs inside the existing transaction under the film record's lock. Each write shares one timestamp
  across its change rows and newly stamped list joins, fixing the visitor's day when written.
- Explicit record changes are recorded; derived turn-ons and watchlist removals fold into the action that caused
  them. Entry writes record current-rating changes and like removals without duplicating the viewing itself.
- Undo leaves unchanged supplied fields alone and preserves an earlier row already matching the restored value.
  An older Undo after another save can still remove the wrong row or none; this edge is explicitly accepted.
- The conversion reverses by removing its constraint while leaving converted films watched. Reversing the change
  table migration drops recorded changes. No earlier change history is backfilled.

## Validation

The full local backend, frontend and browser suites passed, along with lint, formatting, type checks, contrast,
production build and markdown checks. Migration state and regenerated API types have no drift. Criteria 1–11 are
met; the independent criteria verification found no gaps. Criterion 12 requires staging evidence after merge.

## Related Documentation

- PRD: `prd-user-movie-changes.md`
- Tasks and per-criterion evidence: `tasks-user-movie-changes.md`
- Decision: `adr-051-record-private-movie-changes.md`

## Follow-Up Work

- The Library builds History's read and presentation; this work supplies its private change records.
- The card controls retain the shared save layer's time-zone fill and request-body tests when integrating.
- Before publication, the privacy policy must describe retained watchlist, watched, liked and rating changes with
  their time and day, erased with the film's data or account.
- Record criterion 12's proof from the merge commit's staging deploy log and the following passing smoke run before
  archiving the work.
