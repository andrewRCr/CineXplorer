# Completion: Frontend Server State

**Completed:** 2026-11-12
**Branch:** `technical/frontend-server-state`
**Category:** Technical
**Context:** Align movie and session reads and movie saves with the frontend’s query-based server-data model.

## Summary

Cards and movie details share each movie’s saved state, including pending changes and Undo, without refetching
movie lists. Movie detail, watchlist and session reads use shared query options, and a change of signed-in user
clears the previous user’s cached data, retained saves and save feedback.

## Key Deliverables

- A query factory for movie grids, detail, Library and session reads, with retries limited to network and server errors.
- A shared movie-save hook with ordered saves, immediate shared state, failure recovery and Undo after card unmount.
- Query-backed detail and watchlist pages, using user state from the movie payload rather than a separate request.
- A session query covering password and provider sign-in, credential failures, and sign-out to a freshly loaded Login page.
- Network-backed regression coverage and reference updates, including ADR-027’s amendment and both ADR Status sections.

## Implementation Highlights

- Confirmed saves and pending fields overlay each cached movie payload. This survives an infinite list’s next-page
  replacement without patching or refetching movie lists; successful saves invalidate Library queries.
- Saves for a movie run in order. A failed save falls out of the overlay, revealing the last server-confirmed state.
- Saves and Undo carry their invocation ownership through asynchronous setup. Retired saves cannot dispatch or
  create late feedback; user changes remove visible and queued save toasts while preserving unrelated errors.
- One save-generation signal binds that ownership through HTTP preparation, renewal and native transport. A user
  change aborts old requests, including asynchronous cookie preparation and in-flight transport, without aborting
  shared renewal for another current caller. Count-based settlement guards remain because cancellation cannot
  guarantee reversal of a server-received write; current-owner saves still finish after control unmount.
- Password sign-in clears retained saves before reading its fresh session and resetting other queries. Sign-out
  writes anonymous immediately, then loads Login afresh after its request settles, with an anonymous-only notice.
- Accepting a provider session retires earlier password authentication work, including API renewal failures that
  would otherwise redirect to Login.
- An idle credential-renewal failure clears the session only for its original user ownership, so it cannot erase a
  provider sign-in that landed while the renewal was pending.
- Provider-return discovery retains resolution ownership through password fallback. Idle renewal pauses; background
  API failures reject without clearing credentials or redirecting. Anonymous fallback clears both stores before
  release, and successful fallback restores ordinary password-failure handling.
- Session cancellation reaches provider/profile requests and nested renewal without aborting other shared callers.
  Caller-specific failure context keeps renewal terminal and prevents refresh payloads from fulfilling data reads.
  Identity-checked cleanup and authentication invalidation protect replacement reads and explicit sign-in/out.

## Related Documentation

- Draft: `draft-frontend-server-state.md`
- PRD: `prd-frontend-server-state.md`
- Tasks: `tasks-frontend-server-state.md`

## Follow-Up Work

- The full watchlist end-to-end spec remains deferred, as ADR-027 records.
- Grid-test migration to MSW and restoration of browse positions beyond initially reloaded pages remain separate work.
- The Library screens and movie-detail redesign build on these queries and saves; their interfaces are outside this change.
