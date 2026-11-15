# Completion: User Movie Controls

**Completed:** 2026-11-15
**Branch:** `technical/user-movie-controls`
**Category:** Technical
**Context:** Expose the existing film-tracking model throughout discovery and film pages.

## Summary

Signed-in visitors can mark films watched, like them, keep a watchlist, rate them and record viewings or reviews from
cards, film pages and navigation. Shared feedback explains server-applied changes and offers selective Undo, while
the film page lists entries with editing and confirmed deletion.

## Key Deliverables

- Card actions selected by input capability: a shared hover/focus bar for pointers and a visible menu for touch,
  with accessible names, pressed states, watched locks and a consistent card height.
- One review/log dialog with film search, local viewing dates, rewatch defaults, half-star ratings, reviews and
  Liked; opening and closing preserve the surrounding page and restore focus.
- A reusable film panel with inline ratings or a phone sheet, signed-out guidance, and an entry list with excerpts,
  expansion, Edit and confirmed Delete.
- Log in the wide navigation and phone drawer, prefilled from a successfully loaded film page or opened on the picker.
- Shared save and entry-write feedback, ownership guards and Undo that survives the initiating component's unmount.
- React Hook Form for new and rewritten forms, documented in ADR-049; the controls and feedback contract is recorded
  in ADR-048, with ADR-044's partial supersession identified.

## Implementation Highlights

- Controls display the server's returned record. Undo compares it with the state shown when the action began and
  restores only differing fields; undoing an entry creation deletes the entry before restoring film fields.
- A single dialog host owns drafts and focus restoration. Confirmed entry removal updates the cached list before
  invalidation, so deletion and focus movement finish while the refreshed read is pending.
- Drafts retain their opening's user ownership. Session retirement clears private draft and discard state, and
  a submission already in progress cannot assign the draft to a later user.
- Home and the picker each carry an independent pagination context; the HTTP layer preserves caller-supplied
  contexts. Home describes the shared tracking controls, while every record save and Undo carries the browser's
  time zone.
- Card text height and virtualized row estimates share constants, with the row gap kept separate.
- Cards expose named article semantics; metadata keeps one line at the supported minimum width while preserving
  its accessible text. Browser journeys locate cards and controls through their semantic interface.
- Completed pointer activation resolves half-star selection without relying on hover movement. Keyboard changes keep
  their debounce, and cancelled touch gestures do not select or save.

## Verification

App-level integration coverage follows two logged viewings, watchlist removal, distinct entry reviews and ratings,
and the updated card state. Browser journeys repeat that behavior with mouse, keyboard and touch against real local
authentication and tracking writes; temporary accounts and stored movie fixtures isolate each case from manual data.
Catalogue responses use deterministic content with tracking fields read from persisted records.

Local verification passed the backend and frontend suites, lint, formatting, type checks, semantic-token contrast
checks and the complete browser suite. Poster readability was visually inspected in every palette and color mode.
All active criteria were checked; private draft retirement and late submissions have additional regression coverage.
Browser accessibility audits include the tracking dialog and phone rating sheet after finite motion inside those
surfaces and notifications settles. A controlled-width browser fixture checks card metadata and rating alignment.

## Related Documentation

- Shared design: `draft-user-movie-uis.md`
- PRD: `prd-user-movie-controls.md`
- Detailed work and criterion evidence: `tasks-user-movie-controls.md`
- ADR-048: Expose Film Tracking Through Shared Controls
- ADR-049: Use React Hook Form for New Forms

## Follow-Up Work

No implementation was deferred within the delivered scope.
