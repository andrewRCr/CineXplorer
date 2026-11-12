# Task List: Frontend Server State

**PRD:** `prd-frontend-server-state.md`
**Created:** 2026-11-11
**Branch:** `technical/frontend-server-state`
**Base Branch:** `main`
**Status:** Complete
**Completed:** 2026-11-12

## Overview

**Purpose:** Read the movie detail, the watchlist page and the session through TanStack queries built by one factory,
show each movie's user state as its payload under this tab's saves, and clear the previous user's data at every change
of signed-in user.

## Scope

### Will Do

- Client defaults that retry only network errors and 5xx, one shared "Server error" toast, and one query factory
- One save hook that shows each movie's payload overlaid by this tab's saves, runs a movie's saves in order, and offers
  Undo on the watchlist toast
- Cards and the detail page's watchlist button reading their state through that hook
- The detail page, the watchlist page and the session read through queries, with the session's writers
- A change-of-user step at every way the signed-in user changes, and sign-out ending on a freshly loaded sign-in page
- Tests at the network for everything touched, the reference documents, and ADR-027's dated amendment

### Won't Do

- Change the grids' fetchers, their separate caches or their tests' mocking; restore browse positions past the first
  pages; move the grid tests onto MSW
- Add screens or controls, redesign the detail page, add drag-and-drop or Next Up, or write an end-to-end watchlist spec
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** Queries share one factory and the client's retry rule

_Mode:_ `layer` — closes on the client's defaults and the query factory in place, before any read moves onto a query.

_Exit criterion:_ the retry test passes against `lib/queryClient`'s defaults, two failing reads leave one "Server error"
toast, and the grid tests and the browse smoke specs pass with the grids' keys taken from the factory.

- [x] **1.1 A query retries only a network error or a 5xx — D2**

    **Goal:** A read that got no response or a 5xx is retried twice with the existing backoff, while a 4xx, a
    cancellation or any other error fails at once, and a save is never retried.

    - [x] **1.1.a Test the retry rule in `frontend/src/lib/__tests__/queryClient.test.ts`**
        - MSW counts reads through the production client's defaults for network, 500, 404, 401, cancellation and
          unexpected errors; a failed mutation is sent once. Fake timers advance the existing backoff.
        - The refusal, cancellation and unexpected-error cases failed against the previous defaults. Narrow breaks
          disabling query retries and enabling mutation retries failed the other cases by request count.

    - [x] **1.1.b Give `queryClient` the retry rule**
        - Retry twice only for uncancelled axios network errors or 5xx; mutations explicitly never retry.
        - Existing backoff, cache times and refetch settings stay. All seven retry tests pass.

- [x] **1.2 Retried reads share one "Server error" toast — D2**

    **Goal:** A read that fails with a 5xx again after a retry updates the "Server error" toast already showing instead
    of stacking another, in the grids too.

    - [x] **1.2.a Test two failing reads in `apiClient.test.ts`**
        - Two MSW 500 responses render one visible server-error toast; the test failed with two before the change.
    - [x] **1.2.b Give the toast a fixed `id` in `apiClient`'s response interceptor**
        - The shared `server-error` ID updates the showing toast. Confirmed against locked Zag 1.47.0.
        - The client-related run passed all 268 tests in 27 files; frontend type-check, file lint and formatting passed.

- [x] **1.3 The grids take their query keys from one factory — D1**

    **Goal:** Query keys come from `lib/queries.ts`, with the grids' key values unchanged, so their two caches and the
    scroll restoration behave as before.

    - [x] **1.3.a Create `frontend/src/lib/queries.ts`**
        - Typed readonly builders retain the virtualized and infinite key values.
    - [x] **1.3.b Take the grids' keys from the factory**
        - Both grids use the builders; `useInfiniteMovies` accepts readonly `QueryKey`.
        - File lint, formatting, frontend type-check and 54 related tests pass unchanged.
        - The browse and Back to Results Chromium specs pass on the worktree's browsable stack (two tests).

### **Phase 2:** A save shows at once on every card

_Mode:_ `slice` — closes on a save showing at once on its card, its detail page and the watchlist page, each reading
through the shared save hook.

- [x] **2.1 The save hook shows a movie's payload under this tab's saves — D4, D8**

    **Goal:** A movie shows its payload replaced by its latest successful save and overlaid by its pending saves; saves
    of one movie reach the server in the order made, and a failed save leaves the last value the server confirmed.

    - [x] **2.1.a Test the hook in `frontend/src/hooks/movie/__tests__/useUserMovieState.test.tsx`**
        - Twelve network tests cover empty state, pending overlays, full server records, ordered queued saves,
          failures, server-derived toast titles, Library-only invalidation after unmount and six-minute retention.
        - Tests failed against the inert hook. Narrow breaks proved the movie-query and failed-save invalidation
          guards, server-derived toast title and retention. The retention test installs fake time before unmount.
    - [x] **2.1.b Write `useUserMovieState` and the save's mutation options**
        - Shared options scope saves by movie and retain them indefinitely. Callbacks guard the user-change count,
          invalidate only Library on success and issue individually identified save toasts after caller unmount.
        - The hook replaces the payload with the last successful record and overlays pending patches in cache order.
        - Frontend type-check, formatting, file lint and all 51 related tests pass. A mechanical prefer-const lint
          error in the initial session counter was corrected.

- [x] **2.2 A change of user stops every kept save — D4, D7, D8**

    **Goal:** One session-module step advances the change count, clears the kept saves, dismisses the save toasts still
    showing and resets every query but the session, so no save made before it acts after it.

    - [x] **2.2.a Test the step in `frontend/src/lib/__tests__/session.test.tsx`**
        - Network tests prove running saves settle without toast or Library refetch, queued saves never dispatch,
          movie queries reset and the session stays. Save toasts disappear while server errors stay visible.
        - Tests failed against the inert step; resetting the session and removing every toast each failed a narrow
          reconstruction. All 15 related tests pass.
    - [x] **2.2.b Add the step to `lib/session.ts`**
        - `beginUserChange` advances ownership, clears saves and removes visible save toasts. `resetUserQueries`
          excludes the session key; `changeOfUser` composes both. The session key is owned here.
        - Frontend type-check, file lint and formatting pass after guarding the toast API's optional ID.

- [x] **2.3 A watchlist toast offers Undo, one save per click — D4, D8**

    **Goal:** Undo on a watchlist save's toast saves the opposite value once per click, also after the component that
    started the save is gone, and its own toast offers no further Undo.

    - [x] **2.3.a Test Undo in `useUserMovieState.test.tsx`**
        - One click sends one opposite PATCH, including after the original component unmounts, and Undo's toast has
          no further action. Both cases failed without Undo and with the renderer's duplicate handler; always
          offering Undo failed the negative assertion.
    - [x] **2.3.b Add Undo, and stop the renderer's second call**
        - Undo runs the same guarded mutation options through a component-independent observer; the renderer leaves
          action dispatch to its trigger. Frontend type-check, formatting, lint and all 285 related tests pass.
        - The unrelated login visibility failure was repaired separately in #180 and merged from main. Main also
          brought TanStack Query 5.106.0; ordered saves, cache clearing and retention pass against that version.

- [x] **2.4 Cards show and save their state through the save hook — D5, D8**

    **Goal:** A card shows its movie's shared state, stays enabled while saving, and still shows a save after it
    remounts or its list's next page lands, with no movie list refetched.

    - [x] **2.4.a Test the card in `MovieCard.test.tsx`'s watchlist saves**
        - Coupled card cases cover queued double toggles, enabled controls, pending and settled remounts, held
          next-page loads, no first-page refetch, Library invalidation after unmount and Undo from a card's toast.
        - New behaviors failed with the private state. Reconstructing cache-only saves failed after page arrival;
          invalidating lists failed the first-page request count; component-bound callbacks lost the unmounted toast.
        - Existing 500/429 rollback cases remain. A mechanically invalid empty BrowseParams fixture was corrected to
          the factory's supported undefined value.
    - [x] **2.4.b Move `MovieCard` onto `useUserMovieState`**
        - The card displays the shared state and saves its opposite without disabling the control. Removed the
          private watchlist copy, legacy action hook and tests, and interaction service with its placeholders.
        - Formatting, file lint, frontend type-check and all 50 related tests pass. The browse, movie-detail and
          Back to Results Chromium specs pass (three tests) on the stack using TanStack Query 5.106.0.

### **Phase 3:** The detail and watchlist pages read through queries

_Exit criterion:_ in frontend tests with the network mocked, a card's watchlist save shows at once on the card and on
its detail page with no movie list refetched, still shows after the list's next page lands, and refetches the watchlist
page; on the browsable stack the same journey works against the real API, with Undo from a toast.

- [x] **3.1 The detail page reads its movie through a query — D3, D5, D2, D1, D8**

    **Goal:** The detail page makes one request for its movie, shows its user state from the payload under this tab's
    saves, tells "not found" by status, and saves through the shared hook with its toasts and Undo.

    - [x] **3.1.a Move `MovieDetail.test.tsx` onto MSW**
        - Removed all four internal mocks. Movie and auth reads now use MSW with the real provider; back-link,
          loading, error and score assertions remain, awaiting network-dependent content where needed.
        - All 21 migrated cases failed under temporary broken back links and score props, then passed restored.
          File formatting, lint and frontend type-check pass.

    - [x] **3.1.b Test the query-backed page**
        - Real-auth network cases cover one movie request and no user-state read, payload state, enabled pending
          saves, toasts/Undo, anonymous and resolving controls, status-specific errors, cancellation, and a card save
          over a detail cached before a next-page load.
        - New behaviors failed before the move. Narrow breaks failed status classification, disabled controls,
          cancellation, the single-request count and the composition case's first-page request count.
    - [x] **3.1.c Read the detail through the factory's detail query**
        - The factory owns the typed detail query and a reusable signal-to-service-cancel adapter. The page reads
          through `useQuery` and shared saves, with 404s detected by status and no loading state on pending saves.
        - Removed the effect-fetch hooks and their tests and the separate user-state read. Layout stays unchanged.
        - Formatting, file lint, frontend type-check and 134 related tests pass, including unchanged detail styles;
          the movie-detail and Back to Results Chromium specs pass (two tests).

- [x] **3.2 The watchlist page reads the Library through a query — D6, D2, D1, D8**

    **Goal:** The watchlist page requests `watchlist=true` with a `page_size` of 100 only while someone is signed in,
    and refetches after a save.

    - [x] **3.2.a Test the page in `Watchlist.test.tsx`**
        - The real auth provider, current stored token and auth handlers wrap the kept request, list, empty, loading
          and error cases. A save removes the displayed movie through a Library refetch; signed-out visitors make
          no Library request. Both new cases failed against the effect reader.
        - Narrow breaks separately failed the watchlist filter, page size and four display states.
    - [x] **3.2.b Read the Library through the factory's Library query**
        - The factory keys every parameter and links cancellation. Watchlist queries its first hundred watchlisted
          cards only while authenticated, preserving its text display. Both test-guide examples now provide auth.
        - Formatting, file lint, documentation lint, frontend type-check and 141 related tests pass, as does the
          real-session sign-in Chromium spec (one test).

- [x] **3.3 The technical overview describes the query factory and the save hook — D9**

    **Goal:** A reader of the technical overview learns that server data is read through queries from `lib/queries.ts`
    and changed through the save hook, not through `useApiRequest`.

    - The Data Fetching bullet now describes the query factory, grids' own fetchers, save overlays and ordering,
      retained confirmed records and Library-only invalidation. Documentation lint passes.

- [x] **3.4 Check a save shows everywhere at once**

    **Goal:** The save, the card, the detail page and the watchlist page are shown to compose, in tests and against the
    real API, with what ran and the result recorded.

    - The eight named card, cached-detail and Library-refetch composition cases pass.
    - Against the browsable stack's real API, the seeded account added a movie from its card, opened its detail,
      used the toast's Undo, returned to the card and opened the settled watchlist. The card and detail agreed;
      the server received watchlist `true` then `false`, no separate user-state GET occurred, and the watchlist
      excluded the movie. The scenario script and log are retained with the work unit's run artifacts.

### **Phase 4:** The session is read through one query

_Mode:_ `slice` — closes on a change of signed-in user leaving no cached query, kept save or save toast of the previous
user's.

- [x] **4.1 The session query replaces `useAuth`'s sign-in state — D7, D1, D8**

    **Goal:** `useAuth`'s `status`, `isAuthenticated`, `user`, `login`, `logout` and `register` keep their shapes and
    behavior over a `['session']` query, whose first read replaces the mount check and the profile effect.

    - [x] **4.1.a Give `useAuth`'s tests a query client**
        - Every hook and component mount now wraps its MemoryRouter in TestProviders. All 56 kept cases pass
          against the existing hook; file lint, formatting and frontend type-check pass.

    - [x] **4.1.b Add the session query**
        - The session module reads a renewed password profile or allauth's session, guards session versions and
          clears rejected current credentials. Its query never retries or goes stale and does not refetch on mount,
          focus or reconnect. The read leaves requests running when the query itself is canceled.
    - [x] **4.1.c Derive `useAuth`'s state from the query, and write it from each writer**
        - Removed mount/profile effect reads and `getUserDetails`; status derives from the session with the current
          stored-token fallback. Writers cancel obsolete reads; password sign-in awaits a fresh plain query read.
          The provider callback retains its request until 4.2.
        - A held-profile test proves completion commits the fresh cache value. A real Login/ProtectedRoute journey
          proves navigation waits for that read; missing cache writes and premature completion each failed.
        - Observer assertions now await rendering; partial-fake-interval cases advance their existing clock. A
          diagnostic proved the frozen polling interval checked once although the hook had become authenticated.
        - Kept sign-out's initial write/navigation synchronous after cancellation, correcting an await that changed
          navigation ordering. Formatting, lint, type-check, all 215 related tests and all five Chromium specs pass.

- [x] **4.2 A provider's return is read once, by the session query — D7, D8**

    **Goal:** On a provider's return the session's first read asks allauth first and lands the provider's user over any
    stored token, and the callback's effect reacts to that read without sending a request.

    - [x] **4.2.a Test the provider's return in `useAuth.test.tsx`**
        - Six cases cover expired/current password credentials replaced by the provider, token/no-token fallback
          after allauth finds nobody, original destinations across held reads, welcome/flag handling and later
          sign-in arrivals. Five failed before the move; the token fallback was already a passing behavior.
        - Nine narrow reconstructions failed the protected boundaries: authenticated callback skips, wrong welcome,
          late destinations, retained flags, token-first reads, missing fallback/landing and duplicate allauth reads.
    - [x] **4.2.b Read allauth first on a provider's return**
        - The observer passes a first-render return context to the session query; writer reads omit it. Provider
          discovery precedes stored-token handling and clears both token stores on success. A failed discovery
          falls through without a second allauth read.
        - The callback effect reacts to the landed query and captured destination, with no fetch. Later sign-in
          arrivals clear leftover flags without clearing a newly started provider flow on its original page.
        - Formatting, lint, type-check, 221 related tests and the real-session sign-in Chromium spec pass.

    - [x] **4.2.c Search for effects that fetch**
        - Audited 202 source files and 33 effects, following local helper calls and service imports. Only the
          60-second credential-renewal effect performs network work. Query drivers remain allowed; the callback
          effect fetches nothing and `useAuth` defines no `getUserDetails`. The development TestLogin helper stays
          as the explicit non-goal. Audit script and output are retained with the run artifacts.

### **Phase 5:** A change of user leaves nothing of the previous user's

_Exit criterion:_ in frontend tests each way the signed-in user changes clears the kept saves and refetches what is on
screen, and a held sign-out shows no toast for a save settling meanwhile and loads `/login?signed_out=true` only once
its request settles; on the browsable stack, signing out and in again shows no previous session's state, and
`sign-in.spec.ts` passes.

- [x] **5.1 Every change of user clears the saves and refetches the lists — D7, D8**

    **Goal:** The step runs at exactly the points D7's table names, so no save, Undo or list of the previous user's acts
    or shows after a change, and leaving `resolving` otherwise clears nothing.

    - [x] **5.1.a Test each change in `useAuth.test.tsx`**
        - Added ten HTTP-level cases with real list queries, kept saves, held profile/session reads and recorded
          bearer headers. Covered initial credential rejection (current and renewed), idle renewal failure,
          overlapping password sign-in, failed fresh profile, provider return, save-toast removal, server-error
          preservation and the two initial landings that are not changes.
        - Change cases failed before their wiring. Narrow reconstructions also failed for provider reset omission,
          resetting at either unchanged landing, retaining save toasts and dismissing the server-error toast.

    - [x] **5.1.b Run the step at each writer and at the first read's landing**
        - Sign-in clears saves at token storage and resets other queries after its fresh read lands. Initial reads
          reset on rejected stored credentials or a provider return; writer reads carry no first-read context.
          Idle renewal failure resets with its anonymous write. The query supplies its own client to the read.
        - Type-check, touched-file lint/format, related tests and the real sign-in Chromium spec pass.

- [x] **5.2 Sign-out ends on a freshly loaded sign-in page — D7, D8**

    **Goal:** Sign-out reads `anonymous`, clears the saves and moves to the sign-in page at once, then loads
    `/login?signed_out=true` afresh once its request settles, whether it succeeded or failed, and the sign-in page shows
    the signed-out notice only to someone not signed in.

    - [x] **5.2.a Test sign-out**
        - Held password and provider sign-out success/failure while a save settled; checked immediate anonymous state,
          route and save clearing, no late-save feedback, no immediate sign-out notice and reload only after settling.
          New sign-ins retain their token through an older sign-out's success or failure.
        - Covered the menu's sign-in destination and the reloaded page's anonymous-only notice, including a pending
          allauth read. The browser spec now checks the sign-in destination and navigation bar's Login control.
        - Tests failed before implementation. Seven narrow reconstructions failed for delayed state/navigation,
          premature notice/reload, clearing newer credentials and notices shown to signed-in or resolving visitors.
          The browser assertion failed against the previous home destination.

    - [x] **5.2.b Rewrite `logout`, `handleLogout` and the sign-in page's notice**
        - Sign-out cancels the session read, writes anonymous, clears saves and other queries, then navigates to Login.
          After either request outcome it loads `/login?signed_out=true` afresh. The menu delegates navigation to it.
          Login shows the priority notice only once its status is anonymous and clears the parameter.
        - Type-check, touched-file lint/format, 137 related tests and the real sign-in Chromium spec pass.

- [x] **5.3 The reference documents describe the session query and the change of user — D9, D3, D4, D7**

    **Goal:** The authentication strategy, ADR-027 and ADR-028 describe what shipped, so a later reader finds the
    session query, the change of user and the save overlay recorded with their reasons.

    - [x] **5.3.a Rewrite the authentication strategy's Token Refresh Flow and Authentication Hook sections**
        - Documented the session query, first read, status and writers; the idle credential renewal is the only
          remaining fetching effect. Described save ownership, precise reset points and the sign-out reload/notice.
          The strategy's version header is unchanged. Markdown lint passes.
    - [x] **5.3.b Amend ADR-027, and update the Status lines of ADR-027 and ADR-028**
        - Added one locally dated ADR-027 amendment for the detail query, mutation-cache overlay and next-page
          replacement rationale, and every change of user. Both Status sections name Frontend Server State;
          ADR-027 records the deferred watchlist E2E test. Markdown lint passes.

- [x] **5.4 Check a change of user end to end**

    **Goal:** Sign-out, sign-in and the saves are shown to compose against the real session, with what ran and the
    result recorded.

    - All 20 named ownership-change, held sign-out, Login-notice and menu cases pass, as does the real sign-in
      Chromium spec. Type-check and lint passed with the implementation tasks.
    - On the seeded browsable stack, saved Resident Evil, signed out while its save toast showed, and observed the
      document load of `/login?signed_out=true`, the signed-out notice and no save toast or Undo. Anonymous Browse
      showed no saved flags; a new sign-in restored the selected card's saved state. Test saves were removed afterward.
    - `check-user-change-composition.mjs` and `user-change-composition.log` are retained in the work unit's runs folder.
      The script uses actual UI navigation and real API/session requests. Initial script selector errors were corrected
      before the complete successful run.

### **Phase 6:** Verification

- [x] **6.1 Verify the work**

    - All eight Success Criteria met with evidence below. The full local check set passed; after the approved feedback
      repairs, all 2,712 frontend tests, lint, type-check and the real-session sign-in smoke passed again. The author
      walk, one complete independent criteria pass and its clean fix check are retained in the review log.
    - ADR-027’s amendment and both ADR Status sections match the delivered behavior; no new ADR required acceptance.

    - [x] **6.1.a Retire save feedback before global server-error notification**
        - Saves and Undo carry their invocation ownership through asynchronous setup. Retired saves do not dispatch;
          an optional request predicate suppresses late global error feedback without changing current-session errors.
        - Six new late-500 cases failed before the fix, then passed. Narrow reconstructions also proved the pre-dispatch
          guard and current-save error feedback. Full frontend tests, lint, type-check and sign-in smoke passed.
    - [x] **6.1.b Remove queued save toasts on a change of user**
        - Retain generated save-toast IDs until the user changes, then remove queued and visible entries by ID while
          preserving unrelated feedback. The real-toaster overflow regression failed with two confirmations left
          behind, then passed. Reference explanations describe invocation ownership and queued-toast cleanup.
    - [x] **6.1.c Settle independent verification and close the criteria**
        - The Owner authorized the independent fix check; it found no incomplete repair or introduced failure.
          Both pass-1 findings are fixed, all criteria are met and verification is complete.

## Implementation Notes

- **The query client.** Code reaches the cache through `useQueryClient()` or the `client` a query or mutation
  function's context carries (TanStack Query 5.105.3), never by importing `lib/queryClient`. `TestProviders` builds its
  own client, so a module-level import would act on the wrong cache in every test.
- **Module layout.** `lib/queries.ts` holds the keys and query options; `lib/session.ts` the session key and read, the
  change count, the save-toast id maker and the step; and `hooks/movie/useUserMovieState.ts` the hook and the save's
  options. `lib/queries.ts` and the hook import from `lib/session.ts`, never the reverse.
- **Mutation mechanics relied on,** confirmed against 5.105.3 at design time: a queued save in a scope is pending with
  its variables while it waits; `onMutate` runs when the save is made, before it waits its turn; clearing the mutation
  cache removes queued saves from their scope, while a running save still calls its options' callbacks; callbacks
  passed to `mutate` run only while the caller is mounted.
- **A writer's fresh session read.** The session query never goes stale, so `fetchQuery` with its options returns the
  cached value. Cancel any read in flight (`cancelQueries`), then fetch `sessionQuery()`'s options, without the
  first-read context, with `staleTime: 0`, and await it.
- **Detecting a provider's return.** Decide it at `useAuth`'s first render, from the router location (the sign-in path
  with a provider referrer or the `oauth_in_progress` flag, as the callback detects it today), not from
  `window.location`, which `tests/setup.ts` replaces. Decide it before any child's cleanup runs, since `useOAuthFlow`
  removes the flag when the sign-in page unmounts. Keep the page it requests (`next`) from that same location, since the
  sign-in page may redirect a signed-in visitor before the read lands.
- **Save feedback ownership.** Save variables carry the ownership count from invocation, including Undo, before
  asynchronous mutation setup. Both save callbacks and global error feedback compare it; retired saves do not dispatch.
  Save-toast IDs are retained until the user changes so cleanup reaches queued notifications as well as visible ones.
- **Toasts in tests.** The toasters are module-level: render `<Toaster />` (and `<PriorityToaster />` for the auth
  toasts) where a test reads them, and remove leftover toasts before each test, as `MovieCard.test.tsx` does with
  `toaster.remove()`.
- **The page load in tests.** `tests/setup.ts` makes `window.location` a writable plain object, so a test reads
  `window.location.href` after sign-out; reset it before each test.
- **Signed-in tests.** `tests/helpers/auth.ts` gives `token()`, `profile`, `authHandlers()` and `clearBrowserAuth()`;
  a current stored token with `authHandlers()` signs in at once. A component under test that reads the status renders
  inside `AuthContextProvider`, not a hand-built context value.
- **Tests that pass before their implementation.** A case the current code already satisfies is seen failing against a
  narrow break of that behavior, then passing once it is restored (reconstruct and revert), and the completion notes
  record it. Migrated tests of unchanged behavior (3.1.a) follow the same rule; tests that change only their wrapper
  (4.1.a) are the regression net and need no new failure. The assertions a test task names as passing first are
  those known at planning, not a complete list: any other assertion seen passing at its first run follows the same
  rule.
- **Scripted checks.** `node scripts/worktree.mjs browse` starts the browsable stack and prints its address; its
  seeded account signs in. Keep each scenario's script and output in the work unit's runs folder, and record the
  result in the check task.

## Success Criteria

All criteria are implemented criteria, checked locally and in CI; each is marked with its evidence beside it.

- [x] 1. **The success signal.** In a frontend test with the network mocked: toggling a card's watchlist control twice
  sends `true` then `false`; the card and the movie's detail page show the same state without any movie list being
  refetched, and still do after the list's next page lands; a failed save, or two queued saves that both fail, leave
  the server's value showing; and a sign-out clears the kept saves at once and, once its request has settled, loads the
  sign-in page afresh, so no cached query or kept save of the previous user's outlives it. (D4, D5, D7)

  _Evidence:_ Full frontend run at `45fb1bee`: MovieCard held double-toggle and next-page/remount cases; MovieDetail
  cached-detail composition; shared-save failures; session clearing and held sign-out cases passed.

- [x] 2. **Saves.** Tests show: with two queued saves of one movie where the first succeeds and the second fails, the
  first save's record shows; a save that settles after its card unmounted still shows its toast and invalidates the
  Library; a card remounted mid-save shows the save; Undo sends one save per click, its own toast offers no Undo, and
  it works from a toast whose card is gone. (D4, D5)

  _Evidence:_ Shared-save and MovieCard tests passed ordered success/failure combinations, pending/settled remounts,
  unmounted feedback and Library invalidation, and mounted/unmounted Undo with exact PATCH counts and no further Undo.

- [x] 3. **A change of user.** Tests show: during a sign-out whose request is held, a save settling meanwhile shows no
  toast, and the sign-in page loads afresh only once the request settles, whether it succeeded or failed; the sign-in
  page shows the signed-out notice from `signed_out=true` only when nobody is signed in; after stored credentials the
  first session read rejects, a save settling later shows no toast and refetches no Library; after an expired stored
  token's renewal succeeds and the profile read fails, the lists refetch without the user and the saves are cleared; a
  failed renewal at the 60-second check refetches the lists and clears the saves; a password sign-in completed during
  the first session read refetches the lists; a password sign-in whose fresh read fails clears the saves when its
  token is stored and refetches the lists after the read, without the token; a provider's return whose first read
  finds the provider's user clears a stale stored token and refetches the lists fetched while resolving, with allauth's
  session endpoint read once; a save's toast is gone after a change of user; and a 5xx on the first session read after
  stored credentials signed the user in at once signs them out and leaves its "Server error" toast showing. (D4, D7)

  _Evidence:_ The named ownership-change and sign-out cases passed, including six added late-save-500 cases. The
  overflow regression clears queued save confirmations and Undo while retaining unrelated errors; a separate case
  retires saves before dispatch when setup yields. Narrow reconstructions failed, then restored guards passed. The
  complete frontend suite (2,712 tests) and real-session sign-in smoke passed after both fixes. The independent fix check
  found no incomplete repair or introduced failure.

- [x] 4. **Client defaults.** A test against `lib/queryClient`'s defaults shows a query retries twice on a network error
  and on a 5xx, and not on a 4xx or a cancellation; and a test shows two failing reads leave one "Server error" toast.
  (D2)

  _Evidence:_ Production-default retry tests passed: three network/500 reads; one refusal/cancellation/other read; one
  failed mutation. The two-read, one-visible-server-error-toast case passed.

- [x] 5. **The detail page.** Tests show a 404 shows "Movie Not Found", the page makes one request for the movie and
  none to `GET /user-movie-data/{tmdb_id}`, and its watchlist button shows the save toasts. (D3)

  _Evidence:_ MovieDetail tests passed status-specific 404/500, one movie read and zero separate user-state reads,
  payload state, enabled pending save with toasts/Undo, and request cancellation on unmount.

- [x] 6. **The watchlist page.** A test shows it requests `watchlist=true` with a `page_size` of 100 through its query,
  and refetches after a save. (D6)

  _Evidence:_ Watchlist tests passed the query parameters, successful-save refetch, signed-out request suppression,
  and loading/error/empty/list states.

- [x] 7. **The old paths are gone.** A search of `frontend/src` and `frontend/tests` finds no `useApiRequest`,
  `useMovieDetail`, `useUserMovieData`, `useMovieActions`, `movieInteractionService`, `getUserMovieDataByTmdbId` or
  `localWatchlistState`; `useAuth` defines no `getUserDetails`; no `useEffect` in `frontend/src` calls `apiClient`,
  `fetch` or a service that reads or changes server data (today `authService`, `httpService`, `movieService`,
  `userMovieDataService` and `userMovieService`), apart from the 60-second renewal in `useAuth.ts`;
  `NavBarUserMenu.tsx`'s sign-out doesn't navigate; `MovieDetail.test.tsx` has no `vi.mock`; and `MovieCard.tsx` passes
  no `disabled` to its watchlist control. (D3–D8)

  _Evidence:_ Fresh searches found none of the removed paths or forbidden getUserDetails/vi.mock uses. An AST-assisted
  audit of 202 source files and 34 effects, with helper-call inspection, found only the allowed idle renewal. Menu
  sign-out has no navigation; the card watchlist control has no disabled prop.

- [x] 8. **Documents.** The technical overview's Data Fetching section describes the query factory and the save hook,
  not `useApiRequest`; the authentication strategy's Token Refresh Flow and Authentication Hook sections describe the
  session query and the change of user; ADR-027 carries the dated amendment D4's disposition describes, and the Status
  lines of ADR-027 and ADR-028 name this change. (D9)

  _Evidence:_ The overview, authentication sections, dated ADR-027 amendment and both Status attributions match the
  implementation. F1’s approved wording correction makes the amendment independent of delivery history; the
  attribution remains in Status. Markdown lint passes.
