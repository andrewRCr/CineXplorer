# Completed Atomic Tasks - 2026 Q4

Permanent record of completed atomic tasks. New entries are added at the top (reverse chronological).

Reference format: "see `completed-atomic-2026-q4.md`" or "see {task name} in `completed-atomic-2026-q4.md`"

---

- [x] Revert MovieUserScore badge colors to traffic light scheme
    - **Outcome:** TMDB scores map to success (green, ≥7.5), warning (yellow, 5.0-7.4) and error (red, <5.0);
      user-rating badges take the same variants on their own thresholds (≥8, 5-7, <5), so the two badges read as
      one color language. Variant names changed, but no test asserted them. The badge recipe note, the
      `imdb-gold` token comment, the theme-debug swatches and the styling and color-token strategies now describe
      the traffic-light mapping, and no description of the retired success/info/warning scheme remains.
    - **Files:** `MovieUserScore.tsx`, `badge.ts`, `types.ts`, `CineXplorerExtensionsSection.tsx`,
      `strategy-component-styling.md`, `strategy-color-tokens.md`

    - **Branch:** `fix/score-badge-colors`
