# Completed Atomic Tasks - 2026 Q4

Permanent record of completed atomic tasks. New entries are added at the top (reverse chronological).

Reference format: "see `completed-atomic-2026-q4.md`" or "see {task name} in `completed-atomic-2026-q4.md`"

---

- [x] Evaluate: Hide or alter MovieUserScore badge for movies with no/insufficient votes
    - **Outcome:** Below 10 TMDB votes the score badge is neutral: cards show "—"; the detail page shows
      "Not yet rated" with no votes, or the average with its count ("6.8 · 4 votes") for 1-9 votes. Scores with
      10 or more votes keep their traffic-light colors, and the user-rating badge is unchanged. Unreleased
      movies take the same vote rule, since TMDB accepts votes before wide release. The detail endpoint now
      returns `vote_count`, which it had always left null. Design and decisions in `tasks-score-badge-low-votes.md`.
    - **Files:** `MovieUserScore.tsx`, `MovieCard.tsx`, `MovieDetail.tsx`, `response_factories.py`, their tests

    - **Branch:** `technical/score-badge-low-votes`

- [x] Revert MovieUserScore badge colors to traffic light scheme
    - **Outcome:** TMDB scores map to success (green, ≥7.5), warning (yellow, 5.0-7.4) and error (red, <5.0);
      user-rating badges take the same variants on their own thresholds (≥8, 5-7, <5), so the two badges read as
      one color language. Variant names changed, but no test asserted them. The badge recipe note, the
      `imdb-gold` token comment, the theme-debug swatches and the styling and color-token strategies now describe
      the traffic-light mapping, and no description of the retired success/info/warning scheme remains.
    - **Files:** `MovieUserScore.tsx`, `badge.ts`, `types.ts`, `CineXplorerExtensionsSection.tsx`,
      `strategy-component-styling.md`, `strategy-color-tokens.md`

    - **Branch:** `fix/score-badge-colors`
