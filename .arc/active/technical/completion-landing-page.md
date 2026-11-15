# Completion: Landing Page

**Completed**: 2026-11-14
**Branch**: technical/landing-page
**Category**: Technical
**Context**: Replace the root placeholder with a public introduction and personal Home.

## Summary

Home now opens on a curated classic film and introduces the app to signed-out visitors, followed by films in
theaters and an opening-week calendar. Signed-in visitors receive a greeting on arrival and their watchlist first,
with the same film sections below. Shared section components support later pages without turning Home into the
catalog's grid.

## Key Deliverables

- Public featured-film endpoint with checked artwork, optional focus, director credits, short titles and mirroring;
  generated OpenAPI and TypeScript contracts.
- Responsive hero with readable text panels over full-bleed artwork, or a whole-frame portrait stack, using the
  approved film list and copy.
- Reusable poster rows, release calendar, large film card and section states, with whole-card paging, native
  scrolling, keyboard access and reduced-motion behavior.
- Personal watchlist composition, greeting on arrival, authenticated card actions and links back to Home.
- Root routing and shared-width layout, smoke fixtures, reference documentation and accepted ADR-046.
- Backend, request, component and browser coverage, including calendar loading, empty, failure and isolated Retry
  behavior; completed local verification.

## Implementation Highlights

- Home's section reads carry a pagination context apart from the catalog and suppress the global server-error
  toast. Failed sections retain their own Retry control and recover independently.
- The featured query retains its film across navigation. Artwork and credit reservations keep the pitch and
  actions stable through loading and failures; only full-bleed artwork applies focus and mirroring.
- The shipped film list retains the exact artwork and presentation metadata approved through an external review
  sheet and built-hero captures. The review tooling remains outside the application.
- Signed-in composition waits for the initial session and watchlist reads and holds its selected page form while
  shown. Existing cache invalidation keeps the watchlist current after saves.
- The merged tracking model's API and watchlist order are integrated. History, named card controls and queue
  changes remain with their respective units because their integration conditions were absent at the merge.

## Related Documentation

- Draft: `draft-landing-page.md`
- PRD: `prd-landing-page.md`
- Tasks: `tasks-landing-page.md`

## Follow-Up Work

- Later Library History, card-control and queue work owns the corresponding Home integrations described in the
  PRD.
- The separately captured film-refresh errand covers further removals and additions using the retained review
  tooling.
- Demo sign-in, the Films hub, the movie-page redesign and privacy/terms content remain separate work as scoped
  in the PRD.
