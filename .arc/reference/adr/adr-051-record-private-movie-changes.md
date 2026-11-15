# ADR-051: Record Private Movie Changes and Treat Likes as Watched

## Status

Accepted (2026-11-15)

Supersedes ADR-047 in part (which facts mark a film watched, and the date-added sort under combined filters).

## Context

The Library lists films a visitor has watched, with Liked and Rated filters. A liked film that was never marked
watched would appear on none of its pages. History also needs to show additions, watched marks, likes and ratings
on the day the visitor made them, including changes made without a viewing entry.

ADR-047 declined membership-history rows because they had no reader. History now supplies that reader. The latest
join times remain useful for list ordering and Undo, but cannot reconstruct earlier joins, explicit removals or
rating changes. Deriving History from them would move or lose past actions. Recording every rule's effect would
also repeat one action as several events, such as a rating and the watched mark it implies.

The visitor's day can differ from UTC and change while travelling. Entry writes already carry a browser time zone;
record saves from older tabs and direct clients do not. Undo means the action never happened, while a reversal is
itself a new action.

## Decision

We will treat a like as a watched fact. A record save that likes an unwatched film marks it watched unless Watched
was supplied; the existing transition rule removes it from the watchlist unless the save explicitly keeps it there.
An allowed un-mark of Watched clears an omitted like. The watched lock still covers the current rating and entries,
not likes. A save explicitly liking and un-marking the same film answers 400 before fetching its movie card.

The database will refuse a liked, unwatched record. The conversion marks existing liked, unwatched films watched,
using the like's timestamp for their watched join even if an earlier watched timestamp remains, and preserves their
watchlist membership. Reversing removes the constraint and leaves converted films watched.

We will keep a private, write-once row for each recorded change, owned by its film record. A row holds its field
(watchlist, watched, liked or rating), whether it turned on, its new rating when applicable, whether an entry write
made it, its save's timestamp and its local day. Database constraints enforce the field and value combinations.
`created_at` is its creation time; it has no `updated_at`, since rows are inserted and deleted, never updated.

Each save records inside its transaction under the film's record lock. It takes one timestamp there for every
change row and list join it stamps. A film's rows order by timestamp, then ID; rows sharing a timestamp belong to one
save. The day is fixed at write time and does not move when the visitor travels. Record saves accept an optional,
validated IANA time zone, filled by the browser's shared save layer, Undo included. An absent or null zone uses the
UTC day for compatibility. A zone alone is not a record field and cannot constitute a save.

A record save records each supplied field it changed, both turn-ons and reversals. Derived turn-ons are part of the
action taken and produce no additional row. A like removed by un-marking Watched is recorded. A derived watchlist
removal is not, so the earlier addition survives watching or logging the film. Unchanged values record nothing.

Entry creates and edits record changes to the current rating and a like they turn off, marked as from an entry and
on the write's local day. These rating rows keep the latest recorded rating aligned with the current rating for
Undo; History will not show them. Backdated creates that do not change the current rating record none. Marking
watched, liking and removing from the watchlist as part of logging produce no rows. Entry deletion changes no
record fact and records nothing.

An Undo records nothing for each supplied field it changes. It deletes that field's latest row when the row's value
differs from the value restored, treating a cleared rating as a value. It leaves a supplied field already at its
value untouched. Thus undoing an addition erases it, undoing an explicit removal exposes the original addition,
and undoing a rule's unrecorded removal keeps that addition. Undoing logging deletes the entry first, then restores
the earlier rating and removes the logging's rating row. Changes to omitted fields still follow the usual rules:
Undo un-marking Watched without supplying Liked records the like's removal.

We accept that an older Undo after a later save of the same field can remove the wrong row or none: it addresses the
latest value, not a particular save. This is the same edge accepted for the record rules acting on an older Undo.

Rows cascade with their film record or account and are absent from the admin. There is no backfill: join times
cannot recover the changes, and only test data exists before launch. Rolling back the table loses its rows. The
privacy policy must describe this retained record of changes before the site is published.

Date added will use the join time of the first filtered list, in the order watchlist, watched, liked. Without one
of those list filters, including rated-only, it uses record creation. Watched films filtered by Liked therefore
remain ordered by when they were marked watched.

## Consequences

### Positive

- Every liked film appears among watched films, with the invariant held for every database writer.
- History can read stable actions and local days without reconstructing them from current membership or travel.
- Undo erases actions and restores the original addition rather than inventing a new addition on the Undo day.
- One record lock and one recording helper keep record saves and entry writes consistent.
- Date added follows the relevant membership under combined Library filters.

### Negative

- Each changed save writes up to four rows; Undo reads and may delete the latest row for each changed supplied field.
- Old clients without a zone can record the UTC day when it differs from their local day.
- An older Undo can keep or remove the wrong history row after a newer save to that field.
- Earlier actions cannot be recovered; deleting a record, an account or the table removes its recorded changes.
