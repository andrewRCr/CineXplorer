# Completion: Score Badge Below 10 Votes

**Completed**: 2026-10-31
**Branch**: `technical/score-badge-low-votes`
**Category**: Technical
**Context**: The first change through CineXplorer's ported process after its resume: a fix built and design-reviewed
in a sandbox copy, brought in by replay, then verified and reviewed here

## Summary

The TMDB score badge no longer presents missing or thin vote data as a real community score. Below 10 votes it is
neutral: cards show "—", and the detail page shows "Not yet rated" or the average with its vote count. Scores backed by
10 or more votes keep their traffic-light colors, and the detail endpoint now returns the vote count it had always
left null.

## Key Deliverables

- `MovieUserScore`: a `voteCount` prop and a `compact` or `detailed` presentation, with the threshold as
  `SCORE_DISPLAY_MIN_VOTES`; every placeholder carries a `title` saying why no score is shown. The user-rating badge is
  unchanged
- `MovieCard` and `MovieDetail` pass the vote count and the uncoerced average, so a missing average no longer becomes
  a red "0.0"
- `create_movie_detail_from_tmdb` maps `vote_count`, filling a field `MovieDetailSchema` already declared; no schema or
  generated-type change
- Tests for every vote band in both presentations, including badge-variant checks under a layer-free copy of the
  project theme system, and an endpoint test for the vote count
- Theme comments, the theme-debug page and the styling, color-token and data-quality strategies describe the neutral
  below-threshold state

## Implementation Highlights

- Ten votes is a frontend display constant, separate from the backend's spam-filtering vote threshold; a missing count
  or average counts as zero votes. Unreleased movies take the same rule, since TMDB accepts votes before wide release
- "NR" was rejected because it collides with the certification of the same name shown just above the score on the
  detail page; hiding the badge was rejected because it empties the detail page's `User Score:` label
- Replayed one task at a time from the sandbox branch: each task's new tests ran first against `main`'s code and
  failed for the expected reason, and a mutation check showed the badge-variant assertions catch a wrong color
- The traffic-light colors themselves landed first as their own pull request, since the vote rule builds on them
- One independent verification pass and one independent code review, every finding settled with the Owner; the score
  display was confirmed on the running stack for a zero-vote, a one-vote and a well-rated movie. The new tests that
  passed before the change each failed against a narrow reconstruction of the missing behavior
- The branch also carries the previous work unit's archive move

## Related Documentation

- Tasks: `tasks-score-badge-low-votes.md`
- `strategy-component-styling.md` § Movie Ratings and `strategy-color-tokens.md`

## Follow-Up Work

- ADR-003's score-display decision no longer matches practice; a superseding ADR is captured as its own concern
