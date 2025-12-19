# Notes: Data Quality Enhancements

**Task List:** `tasks-data-quality-enhancements.md`
**Completed:** 2025-12-07

---

## Table of Contents

1. [Sample Problematic Movies](#sample-problematic-movies)
2. [Test Gap Investigation](#test-gap-investigation)
3. [Nikkatsu Bulk Blacklist Decision](#nikkatsu-bulk-blacklist-decision)

---

## Sample Problematic Movies

Reference data showing why the movie blacklist was needed. These movies appeared in browse results
despite `adult: false` TMDB flag, particularly visible in Z-A alphabetical sorts where full-width
Unicode characters cluster titles together.

| TMDB ID | Title                                 | Company              | Vote Count | Issue                        |
|---------|---------------------------------------|----------------------|------------|------------------------------|
| 405342  | Office Ladies: Lesbians in Uniforms 3 | Nikkatsu Corporation | 9          | Pink film, `adult: false`    |
| 634220  | Sex Highway: Woman's Parking Lot      | Nikkatsu Corporation | 2          | Pink film, `adult: false`    |
| 969777  | SM kyoshitsu: shikkin                 | Osu Production       | 2          | Exploitation, `adult: false` |
| 153726  | Rapeman 4                             | Pink Pineapple       | 7          | Exploitation, `adult: false` |
| 202438  | XX: Beautiful Prey                    | (none listed)        | 15         | Passes vote filter           |
| 1263190 | White Room: Tomarenai Ai              | Sekine/Okura         | 1          | Pink film, `adult: false`    |

**Z-A clustering explanation:** Original titles use full-width Unicode characters (U+FF21-U+FF3A instead
of U+0041-U+005A) which sort after standard ASCII, causing these to cluster in alphabetical sorts.

---

## Test Gap Investigation

During Phase 8 investigation of why tests didn't catch the Z-A underfill issue, identified broader
test coverage gaps. This informed test additions and documents remaining gaps for future work.

| Gap                                                     | Severity | Status                                                           |
|---------------------------------------------------------|----------|------------------------------------------------------------------|
| No integration test for `original_title.desc`           | High     | **Fixed** - Added to `test_browse_sort_options.py`               |
| No test verifying alphabetical sorts bypass vote filter | High     | **Fixed** - `TestAlphabeticalSortBypassesVoteFilter` class added |
| No smoke tests with real TMDB data                      | Medium   | Deferred - fragile dependency on external API                    |
| No TMDB error scenario tests (timeout, rate limit, 5xx) | Medium   | Deferred - separate resilience testing effort                    |
| No tests with realistic data volumes (100+ movies)      | Low      | Deferred - current tests adequate for logic verification         |
| Cross-page deduplication test marked xfail              | Low      | Known issue, tracked separately                                  |
| No filter combination tests (genre + year + rating)     | Low      | Deferred - edge case coverage                                    |

**Root cause:** Policy unit tests verified threshold decisions existed, but no integration test verified
the policy was correctly applied end-to-end for alphabetical sorts. Added tests now verify both:

1. Low-vote movies are returned (not filtered) for A-Z sorts
2. No `vote_count.gte` parameter sent to TMDB for alphabetical sorts

---

## Nikkatsu Bulk Blacklist Decision

During Phase 8 manual verification, discovered recurring Nikkatsu Corporation content in Z-A results.
Investigation revealed Nikkatsu's "Roman Porno" era (1971-1988) contains ~983 pink films incorrectly
marked `adult: false` in TMDB. TMDB lacks certification data for these films, preventing automated
filtering.

**Decision:** Bulk blacklist all Nikkatsu films from 1971-1988.

**Rationale:**

- Portfolio showcase context: adult content leaking is more harmful than missing niche legitimate content
- Modern Nikkatsu (2000+) preserved: Attack on Titan, Death Note, Cold Fish, etc.
- Classic pre-1971 preserved: Youth of the Beast, The Insect Woman, etc.

**Blacklist additions from this decision:**

| Category                       | Count   | Reason                                                |
|--------------------------------|---------|-------------------------------------------------------|
| Nikkatsu 1971-1988             | 979     | `Nikkatsu Roman Porno era (1971-1988) bulk blacklist` |
| Non-Nikkatsu (user-identified) | 8       | `Problematic content (manual verification Phase 8)`   |
| **Total added**                | **987** |                                                       |

**Final blacklist count after this phase:** 2,110 movies (was 1,123)
