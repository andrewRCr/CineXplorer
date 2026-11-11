# Completion: CineXplorer Default Palette

**Completed:** 2026-11-11
**Branch:** `technical/palette`
**Category:** Technical
**Context:** Establish CineXplorer's own palette before rebuilding its page layouts.

## Summary

Marquee gives CineXplorer its own default palette: antique brass on warm black, with pale cards on a deep-cream
light page. Scores use a small colored dot beside a neutral number, certifications use neutral badges, and the
restyled movie surfaces and alerts draw their colors from the selected theme. Existing palette choices remain
available, and a visitor's stored selection still takes precedence.

## Key Deliverables

- A Marquee adapter in both modes, registered first and used by the default application and test systems, with
  matching browser theme colors and pre-paint fallbacks.
- An importable contrast validator covering the required rendered pairs, including translucent alert backgrounds,
  with explicit theme scopes and tests that detect insufficient contrast.
- Shared TMDB and numeric user-rating chips, preserving accessible explanations and neutral low-vote states while
  classifying TMDB scores by the rounded value shown.
- Neutral certification badges and themed selection pills with no inset ring and a semantic keyboard-focus outline
  tested for every certification.
- Themed alert tints and action outlines, corrected production color references, and explicit theme colors for movie
  card text, detail-page dividers and tags.
- Updated theme and styling guidance, with accepted ADR-041 for Marquee and ADR-042 for score dots and neutral
  certifications; ADR-008 and ADR-003 record their partial supersession.

## Implementation Highlights

- Marquee composes Carbon's surface and button mapping, shared border and interaction helpers, and conservative
  shadows. Its palette sets the badge fill and star gold explicitly; no new theme roles are needed.
- Contrast checks resolve translucent colors against their actual backing surfaces. Accepted decorative-border
  and existing-palette exceptions remain explicit instead of being counted as passing contrast evaluations.
- A shared chip keeps numeric text neutral while the decorative dot carries the tier. The few-votes state remains
  a filled neutral chip without a dot, and user ratings retain their star labels.
- Chakra's merged recipe variants and checked/focus styles need distinct overrides. Computed-style tests use the
  project system without cascade layers and independently resolve the expected semantic colors.

## Verification

The full local backend and frontend suites, lint, formatting, type checks, contrast validation, production build and
browser smoke specifications passed. Local axe scans include the registration notice without the former login
contrast baseline entry. The focused certification tests also passed after extending keyboard-focus coverage.

Independent criteria and code reviews found no implementation gaps. PR CI passed in run 43026012637; merge
`3206071f` passed main CI, deployed to staging and passed staging smoke in run 43027791715. Live browse and movie
detail checks in both Marquee modes confirmed the page colors, outlined score dots with neutral numbers and a
neutral certification badge. Every Success Criterion is now met.

## Related Documentation

- Draft: `draft-palette.md`
- PRD: `prd-palette.md`
- Tasks: `tasks-palette.md`
- Decisions: ADR-041 and ADR-042

## Follow-Up Work

- After the new layouts are in place, compare the current deep-page/pale-card light order with the reversed order.
  The current Marquee values remain the approved palette for this delivery.
