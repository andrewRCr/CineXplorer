# ADR-032: Hold TMDB Results to a Data-Quality Bar

## Status

Accepted (Owner, 2025-12-02; blacklist moved to tracked data and an adult-title opt-in declined, 2026-11-04)

Recorded 2026-11-04 from sources of the time.

Implemented by: PR #8 (`ebc1e586`, 2025-12-19), which carried the stages: `8b461afa`, `0c9bf75a` and `710304b6`
(2025-10-27), `2f8964d8` and `89e9fd6f` (2025-10-29), `a64c9a5d` (2025-11-01), `6c5932a3` and `c6f5aa83`
(2025-11-29), `d9d9ff8e`, `3bbef90a` and `3d4637a9` (2025-12-01), `7f01f324` and `8cb52389` (2025-12-02); PR #75
(`031327a5`, 2026-11-04), the tracked blacklist file.

## Context

[ADR-031](adr-031-filter-tmdb-results-in-the-backend.md) moved year and rating filtering into the backend, where
short pages are topped up from later TMDB pages. That pass then grew from checking what the user asked for into a bar
for what may be shown at all. TMDB can't filter on "has poster" or "has overview", and its own flags and filters let
through incomplete entries, unrated ones and mislabeled content (the data-quality strategy, 2025-12-15).

Adult titles stay out of lists and search as a product norm. TMDB's API leaves them out unless a request asks for
them, and Letterboxd does not import titles TMDB flags as adult. CineXplorer keeps the same default and enforces it
where TMDB's flag fails (stated 2026-11-04).

The stages arrived one at a time, from 2025-10-27 to 2025-12-02, each answering a recorded problem:

- **Completeness.** Poster and title came first, against broken images and blank cards (`8b461afa`). Genres
  followed when a 1.0–3.5 rating band showed inappropriate poster art despite `adult: false` and
  `include_adult=False`; empty genre lists "correlate with misclassified content" (`2f8964d8`). The overview followed
  after 11 of 100 upcoming movies sampled had an empty or "Details Here" overview (measured 2025-11-01, `a64c9a5d`).
- **Year.** Besides the user's range (ADR-031), dates before 1888, the year of the first film, are treated as data
  errors (`0c9bf75a`). Research the same day found TMDB staff confirming, in a forum thread (References), that
  discover returns movies outside the requested dates, a bug "in the backlog since September 23, 2024".
- **Vote count.** It began at 50 votes, for rating filters only: "A movie with 2 votes averaging 10/10 is
  meaningless compared to 500 votes averaging 8.5" (`710304b6`). After brief stops at none and at 5 for rating
  filters (`1be5bf00`, `2f8964d8`), it became 10 everywhere, because 5 "still allows adult content leakage"
  (`89e9fd6f`). A universal 10 proved "too aggressive for niche use cases like alphabetical browsing, causing
  sparse pages that look like a broken app", and context tiers replaced it (`3bbef90a`), bypassing only where a
  threshold "fundamentally breaks functionality (e.g., upcoming: unreleased movies have 0 votes)" (`3d4637a9`).
  For "Highest Rated" without rating bounds, 200 votes replaced 10: obscure films with 15 fans rating 9.5 outranked
  universally loved ones, and 200 "matches TMDB Top Rated" (`7f01f324`). The same 200 had been tried and withdrawn
  on 2025-11-20 as conflating "sorting with curation" (`527821d0`, `78f46f51`). It came back only for "Highest
  Rated" without rating bounds, to match TMDB's Top Rated list; a rating sort with bounds keeps the 3-vote tier, so it
  still sorts rather than curates.
- **Blacklist.** Pink and exploitation films marked `adult: false` appeared in browse results, clustered in title
  sorts (`6c5932a3`). A per-studio filter was planned and dropped: TMDB's list results carry no production
  companies (`b6c49a54`). Studio research seeded a per-movie list instead (`c6f5aa83`: 1,123 films from 10 studios).
  Listing Nikkatsu's whole 1971–1988 output was justified because "adult content leaking
  is more harmful than missing niche legitimate content" (archived notes, 2025-12-07). The policy code assigns
  such cases to the blacklist rather than to "broad vote-based filtering" (`3bbef90a`); a later check of a 108-film
  batch found 76% of the flagged films had 10 or more votes, so "raising threshold wouldn't help" (`67c5cc94`,
  2025-12-09). The list lived only as database rows, edited through the admin and the `populate_blacklist` command,
  until a development database reset on 2026-11-04 lost the hand picks. They were rebuilt from the IDs recorded
  when they were chosen, and the list moved into a tracked file.
- **Language script.** A language filter was added to make alphabetical sorting meaningful, and with it a check for
  mislabeled content, since TMDB tags some films with the wrong original language. Browser testing found a first,
  CJK-only check missed Thai, Devanagari, Cyrillic and other scripts, and it was widened (`8cb52389`). Z–A with an
  English filter still returned "only 8 movies on page 1", and was removed (`86261b93`).

Alternatives considered:

- **TMDB's catalogue as returned, or with TMDB's own filters only:** the cases above reach the page.
- **One vote threshold everywhere (10 votes, 2025-10-29 to 2025-12-01):** tried, and replaced for thinning some
  sorts to a few results.
- **A blacklist by production company, checked per request:** not possible without company data in list results.
- **Reporting mislabels to TMDB, or classifying content automatically:** out of scope; the reasons recorded are only
  "their tagging, our responsibility to filter" and "manual curation only".
- **The blacklist as database rows edited in the admin:** the arrangement until 2026-11-04; a reset database loses
  every hand pick.
- **An opt-in to show adult titles, or letting search bypass the bar:** considered 2026-11-04 and not taken; to be
  revisited only if users ask for it after launch.
- **A five-stage bar, with a blacklist kept as tracked data for what thresholds can't catch (chosen).**

## Decision

We will pass every result of the paginated listings (discover, search, now playing and upcoming) through five checks,
in this order, before it reaches the page:

1. **Language script:** when the user filters by a Latin-script language, drop movies whose original title contains
   a non-Latin script.
2. **Blacklist:** drop the TMDB IDs listed in `backend/apps/movie/data/blacklist.csv`, the source of truth. Rule
   rows (a production company's catalogue, optionally limited to an era) are rewritten from TMDB by
   `regenerate_blacklist`; hand picks are added by pull request. `sync_blacklist` loads the file into the
   `BlacklistedMovie` table at development setup and in every deploy, and the admin shows the table read-only.
3. **Completeness:** require a poster, a title, at least one genre and an overview that isn't empty or a placeholder.
4. **Year:** require a release date from 1888 on, inside the user's year range when one is set.
5. **Rating:** require the vote count the context calls for, then the user's rating range. The count is 200 for a
   rating sort without rating bounds; none for search, now playing, upcoming, least popular, and newest-first sorts
   that can include this year or last; and 3 everywhere else ("at least a few people have seen this").

The vote threshold is also sent to TMDB as `vote_count.gte`, so TMDB pre-filters to the same bar, and discover and
search requests ask TMDB to leave out the titles it flags as adult (`include_adult=false`). The detail page is
outside the bar, so only a direct link shows a blacklisted title. Runtime is not part of the bar
([ADR-018](adr-018-remove-runtime-filtering-parameter.md)).

## Consequences

### Positive

- Cards in a grid have a poster, a title, genres and a description.
- Known mislabeled adult titles stay out of browse, search and the date-bound lists.
- "Highest Rated" ranks films with enough votes to mean something, while rating bands and title browsing keep niche
  films with a few votes.
- The rules and their reasons live in one policy module, applied in one pass.
- The blacklist survives any database reset, and each change to it is a reviewable diff.

### Negative

- More TMDB requests per page: every rejection is made up from later TMDB pages (ADR-031), so pages consume a varying
  number of them. [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md) replaced numbered pages because of it.
- Legitimate films are excluded. Completeness rejected about 35% of US NC-17 titles (353 to about 231) and about 5%
  of US R titles (measured 2025-12-15, data-quality strategy); NC-17 results also carry the certification limitation
  [ADR-019](adr-019-accept-tmdb-certification-filtering-limitation.md) accepts. The Nikkatsu entry removes that
  studio's 1971–1988 output wholesale.
- A blacklist to maintain: 2,856 entries by 2025-12-25 (PR #9), added in batches after research and review. Rule
  rows depend on TMDB's discover endpoint returning a company's whole catalogue; a failed, malformed or incomplete
  fetch leaves the file unchanged.
- Some sorts were given up rather than filtered: Z–A, where Unicode ordering puts mislabeled titles first ("no amount
  of filtering can fix this"), and least popular and lowest rated, which "produce garbage results" (least popular
  also came up short, 17 of 20). "Highest Rated" is disabled for upcoming movies, which have few or no votes.
- The vote policy is a matrix of endpoint, sort, rating bounds and year, mirrored into TMDB's query. When the two
  disagreed, a rating sort returned 3 results.
- The page's `total_results` is TMDB's count, not the number that passes.
- Lists that skip the vote threshold still show unrated movies; since 2026-10-31 the score badge shows TMDB's 0.0
  average as neutral below 10 votes.

### Risks

- A database that has not run `sync_blacklist` filters nothing by blacklist, so each deploy must run it after
  migrating.
- The script check runs only under a Latin-script language filter, so a mislabeled film in an unfiltered list passes.

Current state: the tracked file held 2,480 entries when it landed (1,846 rule rows, 634 hand picks). Some hand
picks the reset lost are not yet recovered, and are being found again by browsing.

## References

- `backend/apps/movie/services/data_quality/policy.py`, `backend/apps/movie/services/data_quality/filters.py`
- `backend/apps/movie/data/blacklist.csv`, `backend/apps/movie/models.py` (`BlacklistedMovie`),
  `backend/apps/movie/services/data_quality/blacklist_file.py`,
  `backend/apps/movie/services/data_quality/blacklist_rules.py`,
  `backend/apps/movie/management/commands/sync_blacklist.py`,
  `backend/apps/movie/management/commands/regenerate_blacklist.py`; PR #75
- `backend/apps/movie/services/tmdb_api_boundary/query_params.py` (`vote_count.gte`),
  `frontend/src/constants/browseOptions.ts` (removed sorts)
- `.arc/reference/strategies/project/strategy-data-quality.md` (2025-12-15; vote-count section rewritten 2026-11-01;
  blacklist section rewritten 2026-11-04)
- `.arc/reference/research/research-tmdb-api-date-filtering.md`, and the TMDB thread it cites:
  <https://www.themoviedb.org/talk/61654be19d592c00613683d5>
- TMDB's discover reference (`include_adult`, default false):
  <https://developer.themoviedb.org/reference/discover-movie>; Letterboxd's "Film not imported" notice, shown at
  `letterboxd.com/tmdb/{TMDB ID}` for an entry TMDB flags as adult (seen 2026-11-04)
- `.arc/reference/archive/2025-q4/incidental/19_data-quality-enhancements/notes-data-quality-enhancements.md`,
  `.arc/reference/archive/2025-q4/incidental/19_data-quality-enhancements/tasks-data-quality-enhancements.md`,
  `.arc/reference/archive/2025-q4/incidental/23_pagination-buffer-tracking/tasks-pagination-buffer-tracking.md`,
  `.arc/reference/archive/2025-q4/completed-atomic-2025-q4.md`
- Commits `8b461afa`, `0c9bf75a`, `710304b6`, `1be5bf00`, `2f8964d8`, `89e9fd6f`, `a64c9a5d`, `527821d0`,
  `78f46f51`, `6c5932a3`, `b6c49a54`, `c6f5aa83`, `3bbef90a`, `3d4637a9`, `7f01f324`, `86261b93`, `8cb52389`,
  `67c5cc94`
- [ADR-018](adr-018-remove-runtime-filtering-parameter.md),
  [ADR-019](adr-019-accept-tmdb-certification-filtering-limitation.md),
  [ADR-020](adr-020-adopt-virtualized-infinite-scroll.md), [ADR-031](adr-031-filter-tmdb-results-in-the-backend.md)
