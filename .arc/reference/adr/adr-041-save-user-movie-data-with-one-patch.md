# ADR-041: Save a User's Movie Data with One PATCH by TMDB ID

## Status

Proposed

## Context

A user's watchlist, watched and liked flags, rating, review and watched date belong to one record per movie.
A client changing one field should not need to find the record's database ID or determine whether it already exists.
A partial save also needs to distinguish an omitted field from an explicit request to clear a nullable value.

ADR-026 chose an upsert by TMDB ID using PUT. PUT ordinarily describes replacement of a representation; these
controls change individual fields while retaining everything omitted. ADR-025 separately named a duplicate-save
409. An upsert has no duplicate-save conflict to return, including when two first saves arrive together.

The first save of an unstored movie fetches its card from TMDB. Stored cards then require nightly refresh. A single
account sending unbounded saves could consume the shared TMDB key and grow the catalogue faster than the refresh
budget covers. About 5,000 details requests fit in one night's 20-minute budget; its seven-day window covers about
35,000 rows. A person importing viewing history still needs room for hundreds of saves a day.

Alternatives considered:

- Separate create and update calls leave existence checks and races with the client.
- A PUT upsert removes the existence check but does not express partial updates clearly.
- A duplicate-save 409 asks the client to resolve a race the database can resolve itself.
- Django Ninja's built-in user rate throttle reads and rewrites a history non-atomically, losing counts under
  concurrent requests. It also keys on request.user, which bearer authentication does not set.
- Failing closed when Redis is unreachable either blames the user with 429 or lets an exception escape the throttle
  stage before Ninja's JSON error handling runs.

## Decision

We will save with `PATCH /user-movie-data/{tmdb_id}`. An omitted field keeps its stored value; an explicit null clears
rating, review or watched date. Flags cannot be null. A first save creates the record with defaults and answers 201;
a later save answers 200 with the same response schema. GET and DELETE use the same TMDB ID and scope to the
signed-in user's record.

We will create a missing Movie row with get_or_create after fetching its card outside the user-state transaction.
Within one transaction, select_for_update().get_or_create locks or creates the user's record before applying the
supplied fields. Concurrent saves merge those fields in sequence instead of returning a duplicate-save conflict.
A save leaving no state keeps the record for GET; collection reads omit it. Marking a movie unwatched clears its date.

We will count every PATCH attempt against two fixed windows per authenticated user: 30 in a clock minute and 1,000
in a UTC day. Both windows count refused attempts too. Counters use the user returned by authentication, including
bearer authentication, with atomic Redis increments and keys identifying the window and its start. Their expiry
rounds up to whole seconds, and a counter evicted between creation and increment restarts at one. A refusal answers
429 with Retry-After for the later refusing window's end. Reads, deletes and another user's saves remain available.

Cache errors allow the save through and are logged without connection details. The nightly freshness alert remains
the detector while counting is unavailable. This replaces ADR-026's PUT save and ADR-025's duplicate-save 409;
their remaining decisions stand.

## Consequences

### Positive

- Every control saves through one call without a database ID or an existence probe.
- Partial updates and explicit clearing have one contract shared across clients.
- Database uniqueness and row locks resolve concurrent first saves while preserving both updates.
- With counters available and retained, one account needs about 35 days to add more rows than the seven-day refresh window
  covers. The minute limit bounds the rate of save-triggered TMDB lookups.

### Negative

- The server maintains two expiring counters per active saving account and handles eviction and cache faults.
- Fixed windows allow up to twice the limit across a boundary; the daily average remains bounded over many days.
- A stored empty record remains until explicitly deleted, and the Library must filter it out.
- The save contract replaces the old routes before launch; an old browser tab can interpret a record ID as a TMDB ID
  until it reloads.

### Risks

- Redis eviction resets a counter, and an unreachable cache removes the save bounds temporarily. The freshness
  alert must be acted on if catalogue growth exceeds the nightly budget.
- Several accounts can collectively grow the catalogue faster; per-user limits are not a global quota.
