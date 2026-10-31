# Technical: Score Badge Below 10 Votes

**PRD:** none — the design below was written and independently reviewed in a sandbox copy of this repository, where
the change was built; verification and code review never ran there (sandbox kept outside the repository)
**Created:** 2026-10-31
**Completed:** 2026-10-31
**Branch:** `technical/score-badge-low-votes`
**Base Branch:** `main`
**Status:** Complete

## Overview

**Purpose:** Stop the TMDB score badge from presenting "no rating data" or a handful of votes as a real community
score. Below 10 votes, cards show a neutral placeholder and the detail page shows a neutral placeholder or the average
with its vote count; scores with 10 or more votes render as they do today.

`MovieUserScore` maps a TMDB average to `success`, `warning` or `error` and formats it with `score.toFixed(1)`, so it
cannot tell "rated 0" from "not rated". `MovieCard` and `MovieDetail` pass `movie.vote_average ?? 0`, so an unrated
movie shows a red "0.0" (TMDB returns `vote_average: 0.0` with `vote_count: 0`), and an average from two or three votes
reads as authoritative. Such movies reach the UI through search (no vote filter), the `now_playing` and `upcoming`
endpoints (`VoteCountPolicy.get_threshold` returns `None`), `popularity.asc` and recent `release_date.desc` browsing,
and the detail endpoint. The list paths fill `vote_count`; the detail path never does: `create_movie_detail_from_tmdb`
omits it, so `GET /api/movies/{id}` always returns `vote_count: null` although `MovieDetailSchema` declares it.

The implementation is brought in from the sandbox branch by replaying its commits onto `main`, one task per step.
Each task shows its new tests failing against `main`'s code before the change is applied, then runs the task's
checks.

## Design

1. **Display threshold of 10 votes.** A TMDB score backed by fewer than 10 votes is not shown in traffic-light
   colors, because averages from a handful of votes swing to extremes. Ten is a judgment, twice IMDb's display
   minimum for user ratings (five), the nearest documented analogue; the stricter bar costs little because the detail
   page still shows a 1–9-vote average with its count. It is a frontend display constant, separate from the backend's
   `MODERATE_VOTE_THRESHOLD`, which filters spam rather than measuring reliability. A missing `vote_count` or a
   missing `vote_average` counts as zero votes, erring toward the placeholder.
2. **Treatment below the threshold, by surface.** Every below-threshold state uses the existing `neutral` badge
   variant (`badge` / `on-badge`), never a traffic-light variant:
    - Zero votes: "—" on cards, "Not yet rated" on the detail page, with no score
    - 1–9 votes: "—" on cards; on the detail page the average to one decimal with its count, for example
      "6.8 · 4 votes" ("1 vote" when singular)
    - Each placeholder carries a `title` stating why no score is shown

   Rejected: "NR", which collides with the certification of the same name (`certificationUtils.ts`, rendered
   `neutral` directly above the score on the detail page); hiding the badge, which leaves the detail page's
   `User Score:` label empty and misaligns card rows.
3. **No separate rule for unreleased movies.** TMDB accepts votes before wide release (festival screenings), so a
   release date is not evidence of zero votes, and the vote rule already covers the zero-vote case.
4. **The call site selects the presentation.** `MovieUserScore` takes the vote count as a new prop; `MovieCard`
   selects the compact presentation and `MovieDetail` the detailed one. Both pass `movie.vote_count` and pass
   `movie.vote_average` without `?? 0`.
5. **The rule lives in the frontend; the backend fills the detail count.** The backend's only change maps
   `vote_count` in `create_movie_detail_from_tmdb`, filling a field `MovieDetailSchema` already declares, so
   `frontend/openapi.json` and `frontend/src/types/api.ts` stay unchanged. Computing a rating status in the API was
   rejected: it changes both movie schemas and forces type regeneration for a display decision.
6. **Only the TMDB badge changes.** The user-rating badge (`userRating` and `userRatingOnly`) renders exactly as
   today.
7. **Documentation follows the rule.** Every description of TMDB score colors gains the below-threshold `neutral`
   state: the theme comments (`badge.ts`, `types.ts`, `extensions.ts`), the theme-debug page
   (`CineXplorerExtensionsSection.tsx`, `FeedbackStatusSection.tsx`), `strategy-component-styling.md`,
   `strategy-color-tokens.md`, and `strategy-data-quality.md`, whose claim that the vote-count policy handles
   zero-vote averages becomes a pointer to this display rule.

**Accepted trade-offs:** cards hide some real 1–9-vote averages (card space is tight; the detail page shows them); a
movie with fewer than 10 votes can match a rating filter yet show "—" (the policy filters at most 3 votes there);
Upcoming and Now Playing show mostly "—" (the intended correction); a movie with 10 or more pre-release votes shows a
normal score before release (decision 3); the detail payload now carries the real `vote_count`, which no other
caller of `get_movie_by_id` reads, and detail responses are not cached server-side.

## Scope

### Will Do

- The detail endpoint returns TMDB's `vote_count`
- `MovieUserScore` applies the 10-vote rule in a compact and a detailed presentation; `MovieCard` and `MovieDetail`
  pass the count
- Every description of TMDB score colors in active code and documentation states the below-threshold state
- The "Hide or alter MovieUserScore badge" entry leaves `ATOMIC-TASKS.md` for `completed-atomic-2026-q4.md`

### Won't Do

- Change `VoteCountPolicy` or any backend filtering: which movies appear is unchanged, only how their score reads
- Change the 7.5 and 5.0 thresholds for scores backed by 10 or more votes
- Change the user-rating badge
- Change an API schema or the generated frontend types
- Add a date-based rule for unreleased movies
- Correct the `imdb-gold` user-rating guidance in the styling strategies, which describes star icons the app does
  not render (a separate correction)

---

## Tasks

### **Phase 1:** Vote-count rule for the TMDB score badge

- [x] **1.1 Detail endpoint returns the TMDB vote count**
    - `create_movie_detail_from_tmdb` (`response_factories.py`) maps `vote_count` beside `vote_average`;
      `test_get_movie_detail_returns_tmdb_vote_count` (`test_movie_detail.py`) covers it through the endpoint,
      replayed unchanged from the sandbox
    - Against `main`'s factory the new test failed (`None == 100`); it passes with the mapping

- [x] **1.2 Score badge applies the 10-vote rule on cards and the detail page**
    - `MovieUserScore` takes `voteCount` and a `compact` or `detailed` `presentation`, and derives the TMDB badge in
      one `getTmdbBadge` helper shared by the TMDB-only and user-rating layouts, with the threshold as
      `SCORE_DISPLAY_MIN_VOTES`; `MovieCard` and `MovieDetail` (the only call sites) pass `vote_count` and the
      uncoerced average. Replayed unchanged from the sandbox
    - `MovieUserScore.test.tsx` covers zero, 1–9 and 10-or-more votes in both presentations and drops its "0.0"
      expectation; its variant checks render under a layer-free copy of the project system, since the shared
      renderer lacks the badge recipe and jsdom skips `@layer` styles. `MovieCard.test.tsx` and
      `MovieDetail.test.tsx` cover the call sites
    - Against `main`'s components the 20 below-threshold tests failed and the 74 others passed. Swapping two variants
      in the component (`error` to `warning` at 4.9, the zero-vote `neutral` to `success`) failed 13 tests, so the
      variant checks discriminate
    - The new tests that passed on `main` each failed against a narrow reconstruction and passed once it was
      reverted: `<= 10` failed both exactly-10-votes cases; `> 7.5`, `>= 7.4` and `<= 5.0` failed the 7.5, 7.4 and
      5.0 cases in both presentations; dropping the user-rating-only branch failed the hide test; a threshold above
      every count failed `MovieDetail`'s 10-or-more test
    - The "Hide or alter MovieUserScore badge" entry moved to `completed-atomic-2026-q4.md`, naming this branch

- [x] **1.3 Score-color documentation describes the below-threshold state**
    - [x] **1.3.a Frontend theme comments and theme-debug page**
        - `badge.ts`, `types.ts` and `extensions.ts` comments state the 10-vote condition and list TMDB scores below
          10 votes among `neutral` / `badge` uses; `CineXplorerExtensionsSection.tsx` gains a "—" swatch on `badge` /
          `on-badge` with its caption and footer note; `FeedbackStatusSection.tsx`'s note names the neutral variant
          below 10 votes
        - Replayed from the sandbox; the `types.ts` lines the colors change had already rewritten took the sandbox's
          10-vote text with the colors change's "traffic-light" wording

    - [x] **1.3.b Styling and data-quality strategies**
        - `strategy-component-styling.md` (decision tree, the badge variant table, § Movie Ratings with "—" and
          "6.8 · 4 votes" examples and a `MovieUserScore` pointer, `neutral` use cases), `strategy-color-tokens.md`
          (a below-10-votes cheat-sheet row, flowchart step 5) and `strategy-data-quality.md` (the zero-vote quirk
          points to `SCORE_DISPLAY_MIN_VOTES` in `MovieUserScore` for the surfaces the vote-count policy leaves
          unfiltered)
        - Replayed from the sandbox; flowchart step 5, which the colors change had already rewritten, took the
          sandbox's 10-vote text
        - The closing search over code, strategies, ADRs and active docs found no TMDB score color description
          missing the `neutral` state; ADR-003's context line on rating displays is an accepted ADR describing the
          original need, not the current mapping, and stays

### **Phase 2:** Verification

- [x] **2.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)
    - The full local run passed (backend and frontend suites, ruff, ESLint, `type-check`, pyright, markdown lint,
      contrast, the production build, no API-type drift); every Success Criterion is met, with its evidence below;
      one independent verification pass, recorded in the Review Log

---

## Success Criteria

- [x] With zero votes (count `0`, count missing, or average missing), the TMDB badge never renders "0.0" or a
  traffic-light variant: cards show "—" and the detail page shows "Not yet rated", both `neutral`
    - `getTmdbBadge` sends a null average or a falsy count to the `neutral` placeholder; `MovieUserScore.test.tsx`
      checks five zero-vote inputs in both presentations by badge background, and that "0.0" never renders;
      `MovieDetail.test.tsx` checks "Not yet rated"
- [x] With 1–9 votes, cards show "—" and the detail page shows the average to one decimal with its vote count
  ("1 vote" when singular), both `neutral`
    - Tests cover 4 votes in both presentations, the singular at 1 vote and the boundary at 9; `MovieCard.test.tsx`
      checks the card placeholder and `MovieDetail.test.tsx` "6.8 · 4 votes"
- [x] With 10 or more votes, the TMDB badge renders the average to one decimal in `success` (7.5 and above),
  `warning` (5.0–7.4) or `error` (below 5.0), as before
    - `getTmdbBadgeVariant` is unchanged from `main`; tests check 7.5, 7.4, 5.0 and 4.9 in both presentations and
      exactly 10 votes. Swapping two variants failed 13 tests, so the variant checks discriminate
- [x] Every placeholder carries a `title` stating why no score is shown
    - "No TMDB votes yet" on both zero-vote placeholders, "Fewer than 10 TMDB votes" on the card's 1–9-vote "—",
      each asserted in `MovieUserScore.test.tsx`; the detail page's 1–9-vote badge shows a score, not a placeholder
- [x] The user-rating badge renders unchanged in every `MovieUserScore` mode
    - Its JSX in the user-rating-only and combined layouts is unchanged in the diff; new tests check it beside a
      compact placeholder, beside "Not yet rated", and alone
- [x] `GET /api/movies/{id}` returns TMDB's `vote_count`, asserted in `test_movie_detail.py`
    - `test_get_movie_detail_returns_tmdb_vote_count` failed against `main` (`None == 100`) and passes; the live
      backend returns 0, 1 and 15,574 for movies 1003596, 1591604 and 78, and signed-in detail responses keep the
      field (enrichment uses `model_copy`)
- [x] `MovieCard` and `MovieDetail` pass `vote_count` and no longer coerce `vote_average` with `?? 0`
    - They are the only call sites (`MovieCard.tsx` line 311, `MovieDetail.tsx` line 200); no `vote_average ?? 0`
      remains outside tests
- [x] `MovieUserScore.test.tsx` covers the zero-vote, 1–9-vote and 10-or-more-vote cases in both presentations, and
  no longer expects "0.0"
    - All three bands appear in both presentations; "0.0" survives only in two absence checks
- [x] Every description of TMDB score colors in active code and documentation (outside `.arc/reference/archive/`)
  states the below-threshold `neutral` state, and none describes the retired success/info/warning scheme
    - Every editable site states it (theme comments, theme-debug page, the three strategies), and a search finds no
      success/info/warning score description. ADR-003 is excluded: an accepted ADR is immutable (DEVELOPMENT-RULES §
      Architecture Decision Records), and its score-display line describes the original decision; superseding it
      is captured as its own concern
- [x] `frontend/openapi.json` and `frontend/src/types/api.ts` are unchanged; `npm run generate-types` on this branch
  leaves no diff
    - No diff from `main` for either file; the verification run's export from the backend container followed by
      `git diff --exit-code` exited 0
- [x] On the running stack, a movie with no TMDB votes shows "—" on its card and "Not yet rated" on its detail page,
  a movie with 1–9 votes shows "—" and its average with the count, and a movie with 10 or more votes shows the same
  colored score as before (proven live)
    - Observed by the Owner on the primary stack, whose frontend container serves this branch: Avengers: Doomsday
      (1003596, 0 votes) "—" on its Upcoming card and "Not yet rated" on its detail page; Soul Patrol (1591604, 1
      vote) "—" and "1.0 · 1 vote"; Blade Runner (78, 15,574 votes) green "7.9" on its search card and detail page;
      one detail page also checked signed in

## Review Log

- **2026-10-31 · Verification · Pass 1** · fresh read-only subagent (`pragmatic-code-reviewer`) · rubric:
  `verification-review` over the eleven Success Criteria under `validate-criteria`'s evidence standard, with the
  task list unmarked, the branch diff and the raw outputs of the verification run · 1 major, 2 minor, all confirmed
  against source · approved: F1 criterion 11 has no rendered-UI evidence, fixed by the Owner's look at the running
  stack; F2 criterion 9's ADR-003 exclusion recorded in its evidence; F3 the carried parallel-sessions archive commit
  rejected, since `main` takes changes only through pull requests and the next work unit carries each archive move ·
  about 9 minutes · stop: Owner declined a fix check (neither fix touches code)
- **2026-10-31 · Code review · Pass 1** · fresh read-only subagent (`pragmatic-code-reviewer`) · rubric:
  `code-review-standard` (`standard-review/v1`) through `implementation-audit`'s five dimensions plus the repository's
  review guidelines (repository contract coherence), over the whole branch diff, the design and the project rules ·
  3 minor, all confirmed against source · approved: F2 fail-first evidence for the new tests that passed on `main`,
  fixed by reconstruct-and-revert runs recorded under Task 1.2; F1 the card placeholder's reason reaching touch and
  screen-reader users only through `title`, deferred to the inbox as a change across every score badge; F3 the
  ADR-003 follow-up rejected, since it is captured in the inbox · also captured: the data-quality strategy's stale
  Vote Count Policy section · about 10 minutes · stop: Owner declined a fix check (the fix adds evidence only)
