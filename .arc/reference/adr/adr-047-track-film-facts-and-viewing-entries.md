# ADR-047: Keep Film Facts and Viewing Entries

## Status

Accepted (2026-11-14)

Supersedes ADR-043 in part (record date/review fields, their clearing, and unconditional omitted-field preservation),
ADR-027 in part (one optimistic mutation hook for movie data), and ADR-042 in part (numeric user-rating chips).

## Context

A person can watch and review a film several times, with a different rating on each viewing. One date and review on
its record overwrite that history. Watched also describes a fact someone may know without recording a viewing.
The watchlist can hold a watched film as a rewatch queue. Each list needs its own join time: the record's creation
may precede its watchlist, watched or liked membership by years.

The current rating must also live independently of entries. Deriving it from history would lose a rating given
without a viewing; replacing it on every entry would let a backdated log replace a newer opinion. Editing a review
must preserve a later direct re-rating.

Several clients can write the same film. Rules repeated in controls would drift, and entry writes in a separate
frontend queue could race record saves. Optimistically guessing entry effects would copy backend rules into the
client. Dates require the user's local day, which can differ from UTC and change while travelling.

Alternatives considered:

- One date and review per film lose repeat viewings. Deriving watched from entries invents an undated viewing when
  someone marks a film watched, and makes un-marking it choose history to delete.
- Membership-history rows retain every join without a consumer for that history. One join time per list serves the
  current ordering and Undo.
- A separate restore endpoint duplicates a save. Client-supplied join times give the client authority to write any
  membership date.
- A profile time zone can be wrong while travelling; a client-supplied "today" cannot be checked by the server.
- A film-list envelope carries movie cards and a TMDB cursor, which do not fit viewing entries; another custom
  envelope would duplicate the existing generic pagination contract.
- Numeric labels such as "★ 8" read as eight stars beside a five-star control. A read-only rating control retains
  radio semantics and a focus stop on every card.

## Decision

We will keep watched, watchlist membership, liked and the current 1–10 rating on one record per user and film, with
one timestamp for the film's latest join to each list. Viewings and reviews will be separate private entries owned
by that record, each with its own optional rating. Deleting the record deletes its entries.

An entry has a viewing date or a review; a rewatch has a viewing date. Its effective date is its viewing date, or
its immutable local creation day for an undated review. Effective date, creation timestamp and ID determine the
latest entry, with lists presenting latest first. Any entry may be corrected or deleted.

We will enforce the rules in backend services, inside transactions under the film record's row lock. A supplied
record-save field takes precedence; a rule may change an omitted field. A rating marks an unwatched film watched.
A transition to watched removes it from the watchlist unless the save explicitly keeps it there. Creating an entry
marks the film watched; an undated entry removes an unwatched film from the watchlist, and a dated entry removes it
when its date is on or after the local day the film joined that list. Backdated viewings and rating an already
watched film leave the watchlist alone. Entry edits and deletes change neither watched nor watchlist membership.

A film cannot be unwatched while it has a current rating or any entry. The database enforces the rating pairing;
the service checks entries under the same lock every entry write takes. A self-contradictory save answers 400; a
well-formed save refused by the stored state answers 409 without changing it.

A record save sets or clears the current rating directly. Creating the latest entry with a rating sets it. Editing
an entry sets it only when the entry is latest after the edit, has a rating, and its rating changed or the edit made
it latest. A review-only correction preserves a later re-rating. A backdated entry, an entry without a rating, or
deleting an entry never clears the current rating.

The record PATCH retains its upsert and adds an Undo mark. A removal retains its join timestamp. Rejoining normally
stamps a new timestamp; Undo preserves an existing one, restoring list position without accepting a time from the
client. Undo keeps every save rule and lock. Explicit null clears the rating; omission preserves a field except
where these rules change it.

Entry routes sit under their film and return its record with the written entry, including on deletion. The
cross-film activity list contains dated entries only, in latest-first order, using `PaginatedResponse` with
`page`, `total_pages`, `total_results` and `results`. Entry creates and edits share the record save's user counters:
30 writes per minute and 1,000 per day. Reads and deletes do not count.

Every entry create and edit carries the browser's IANA time zone. The server uses it to validate the viewing date,
compare the watchlist join day, and set an entry's immutable local creation day. Reads need no time zone.

The Library's date-added sort uses the selected list's join timestamp when exactly one of watchlist, watched or
liked is filtered. Otherwise it uses record creation time, including rated-only and combined filters. Its watched
sort uses the latest logged viewing date, with undated films last in either direction.

Frontend entry creates, edits and deletes will share their film's record-save queue, retention and user-change
cancellation. The latest confirmed write supplies the displayed record, with pending record-save fields on top.
A pending entry adds no guessed effects: its returned record carries the server's decisions.

A user's rating will appear as earned gold half stars on a five-star scale, with one non-interactive image and one
accessible name. Missing ratings render nothing. TMDB score chips retain their existing numeric presentation.

## Consequences

### Positive

- Rewatches preserve their own dates, reviews and ratings while current film facts remain independently editable.
- One authoritative rules layer and a shared lock keep all writers consistent, including competing requests.
- List ordering reflects membership, and Undo restores position without exposing writable timestamps.
- Stable local creation days keep undated entry order unchanged when users travel.
- Shared frontend queues avoid racing writes and display server decisions without duplicating the rules.
- Static earned stars communicate the rating scale without adding keyboard stops or repeated radio groups.

### Negative

- Record facts and entry history are distinct concepts; deleting history deliberately does not undo current facts.
- Entry writes need a known time zone and share the save budget, including imports and backdated corrections.
- The frontend retains confirmed mutation records until the user changes, so that ownership boundary must clear them.
- A film's date-added position depends on the active list filters; combined filters use record creation instead.
