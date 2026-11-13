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
- Tests at the network for everything touched, the reference documents, and dated amendments to ADR-027 and ADR-028

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

- [x] **6.2 Preserve a newer session when an older idle renewal fails**

    **Goal:** A failed idle renewal may write anonymous only while its original user ownership remains current,
    including across the cancellation boundary; a landed provider session must survive an earlier renewal failure.

    - Capture the original user-change count alongside the authentication version; check both before and after
      cancellation so an obsolete idle-renewal failure cannot write anonymous over a newer provider session.
    - The held-provider cases failed with renewal responses 401 and 500 before the guard, then passed. All 88 auth
      tests and the full 2,714-test frontend suite passed, including current-user renewal-failure behavior; lint,
      type-check, reference Markdown lint and the real-session sign-in smoke passed. Updated the reference explanations.
    - Committed the correction; its independent fix check found no incomplete repair or introduced failure.
      No new architectural decision was required.

- [x] **6.3 Retire older API authentication work on provider sign-in**

    **Goal:** Accepting a provider session retires older password renewal work, so its failure cannot redirect the
    newly signed-in provider user to Login.

    - Invalidate the authentication session before clearing stored password tokens and landing the provider user.
      This applies the existing replacement rule at provider acceptance, covering both API interceptor renewal paths.
    - Four network regressions failed on the unwanted Login redirect before the fix, then passed: expiry before
      dispatch and response-401 recovery, each with a held renewal returning 401 or 500 after provider sign-in.
      They preserve the provider profile and location and confirm subsequent session-authenticated reads work.
    - All 2,718 frontend tests, frontend lint and type-check, sign-in smoke and reference Markdown lint passed.
      Updated authentication references and the completion summary; a mechanical line-wrap lint error was corrected.

- [x] **6.4 Make provider discovery and password fallback own session resolution — D7 amendment**

    **Goal:** A provider-return session read, including password fallback, determines authentication while it is
    pending; background password work cannot cancel it, replace its result or redirect it.

    - [x] **6.4.a Prove the resolution lifecycle through the network**
        - Added 28 MSW cases using the real session query, hook and API client. Held discovery and password fallback
          cover idle suppression, both API renewal entry paths, 401/500 failures, successful fallback, current profile
          rejection, cancellation, explicit sign-in/out, shared transport and replacement-owner cleanup.
        - Both shared-rejection waiter orders conclude anonymous without redirect; both stores clear before release.
          Terminal renewal failures use one refresh even when another could succeed, and shared callers retain their
          own feedback policies. Ordinary failure handling resumes after success, cancellation and superseding login.
        - Revised the earlier idle regression to start renewal before provider discovery; separate cases now prove
          no idle renewal starts during discovery. The four API failures after provider acceptance remain covered.
        - Behavioral failures preceded passing checks. Narrow reconstructions proved already-supported outcomes,
          including owner release, per-caller context, shared-transport survival, supersession and profile refusal.
    - [x] **6.4.b Enforce one resolution-ownership rule**
        - The authentication coordinator holds a version-bound identity acquired synchronously by the provider-return
          read and retained through fallback. Cancellation/final cleanup releases only its own identity; explicit
          authentication invalidation retires ownership and renewal work.
        - API and idle failure handling share the current-version, live-password-credential and no-owner predicate.
          API callers also require an uncancelled signal; idle handling retains its original change-count checks
          before and after cancellation. No idle renewal starts during resolution; API work never waits on discovery.
        - Query cancellation reaches provider/profile requests and renewal continuations without aborting shared
          renewal for another caller. Per-caller error clones retain original request budget, version, signal and
          feedback policy, making renewal failure terminal while preserving its underlying error semantics.
        - Anonymous fallback clears both stores synchronously before releasing ownership. Successful fallback keeps
          ordinary password-failure authority. No additional epoch, waiter history or persisted state was introduced.
    - [x] **6.4.c Document the implemented ownership contract**
        - Added ADR-028's dated amendment and updated both authentication-strategy sections, the completion summary
          and test guidance for resolution ownership, supersession, cancellation and terminal caller-attributed errors.
    - [x] **6.4.d Verify the amendment and close its criterion**
        - All 2,744 frontend tests in 76 files pass, including 28 resolution cases. Frontend lint, generated Chakra
          types, TypeScript, changed-file formatting, affected Markdown lint and real-session Chromium sign-in/out
          smoke pass. Backend/schema code is unchanged; build and contrast remain CI checks.
        - Criterion 9 is validated below; criteria 1–8 and their evidence remain unchanged. A bounded Astra completion
          consultation identified the required current-fallback profile-refusal coverage, now proved red/green; it
          found no additional implementation defect. This is advice, not an independent implementation check.
        - An independent fix check found no runtime defect. Its one minor finding, the authentication strategy's
          outdated renewal-failure example, was corrected.

- [x] **6.5 Bind save requests to their invocation's user through transport — D4 amendment**

    **Goal:** A save made before a change of user cannot acquire replacement credentials or start a PATCH or
    recovery replay afterward; cancellation and late settlement cannot affect the replacement user's state.

    - [x] **6.5.a Prove the request-preparation and transport boundaries**
        - Added 13 real-hook/TanStack/Axios/MSW cases: replacement credentials between the mutation guard and HTTP
          preparation; native Cookie Store preparation for normal save and Undo; held CSRF/count-only retirement;
          both renewal entry paths with 200/401/500, a surviving live waiter; and already-sent 200/500 cancellation.
        - Native preparation sends no retired PATCH, and a replacement generation still saves successfully. Retired
          callers produce no replay, obsolete feedback/Library invalidation or credential clearing/redirect of their
          own. Already-received requests abort locally without a server-rollback assertion.
        - Both original boundary cases failed before implementation. Narrow reconstructions without generation abort
          failed native/CSRF/renewal/in-flight assertions; reusing the aborted controller failed new-owner success.
          Restored code passes. Corrected a fixture wait that held reset queries behind the same cookie gate.
        - Adapted older held-save checks to require Axios cancellation, retaining UI state, feedback and invalidation
          assertions; the first full run identified 11 stale success-status expectations. Current-owner, ordering,
          unmount and exact Undo controls remain green. The touched limit-refusal fixture now uses its API error shape.
    - [x] **6.5.b Carry one owner-generation signal through the existing request path**
        - The session module's `getSaveSignal(change)` synchronously rejects obsolete invocations and lazily returns
          one current-generation signal. Shared save options forward it through the existing service configuration;
          ordinary save and Undo use the same path. Existing API cancellation handles preparation and renewal.
        - `beginUserChange` advances the count, detaches and aborts the old controller before clearing saves/feedback.
          Later saves acquire a fresh signal. No new epoch, per-request registry, persistence, transport substitution
          or XSRF policy. Current-owner unmount/settlement does not abort siblings; count-based effects stay guarded.
        - Shared refresh keeps its separate controller. Caller retirement cannot acquire replacement credentials,
          dispatch/replay or trigger stale failure effects; authentication invalidation retains its own semantics.
    - [x] **6.5.c Document save cancellation and its server-side limit**
        - Extended ADR-027's dated amendment and updated authentication/test guidance and completion summary for the
          generation signal, preparation/in-flight cancellation and retained guards. Server-received work may still
          complete; no rollback guarantee or new ADR file.
    - [x] **6.5.d Verify the repair and close its criterion**
        - Full frontend: 2,757 tests in 77 files pass, including all 13 new ownership cases. ESLint, generated Chakra
          types, TypeScript, changed-file formatting, affected Markdown and real-session Chromium sign-in/out pass.
          The browser check waited for routed local capacity before its successful run; routing policy was unchanged.
        - Criterion 10 is validated below; goals and criteria 1–9 are unchanged. Bounded Astra completion advice found
          no required omission; it is not an independent implementation check. An independent fix check of the
          repair returned no findings.

- [x] **6.6 Show not-found after a cached detail refetch returns 404 — D3**

    **Goal:** A detail read that returns 404 shows "Movie Not Found" even when a prior successful movie remains cached.

    - A successful-read-then-404 network regression failed with the cached title/save control still visible, then
      passed after making the explicit 404 enter the existing not-found branch despite retained query data.
    - All 31 related detail tests, frontend lint/generated types/type-check/format, affected Markdown and both
      detail/back-navigation Chromium smoke specs pass. Existing status-specific errors and successful cached-detail
      save composition pass. An independent fix check of the repair returned no findings.

- [x] **6.7 Integrate main's Remember Me coverage with query-backed authentication**

    **Goal:** The integrated branch preserves Remember Me cookie persistence and query-backed session/sign-out
    behavior, with the conflicting tests covering both before publication.

    - Resolved both test conflicts: retained both Remember Me modes, refresh-cookie attributes and two rotations,
      plus the Login destination/selector after sign-out and query-subscriber wait after sign-in. The submitted
      remember_me value remains asserted. Automatic production merges preserve login forwarding and profile cancellation.
    - All 2,783 frontend tests in 78 files, lint, generated types/type-check, affected formatting/Markdown and both
      real-session sign-in/out Chromium cases pass. Imported backend and other main-only files match main.
      An independent integration check returned no findings.
    - PR CI identified two unformatted JSX examples in the test guide. Applied Prettier's line-wrap-only correction;
      the full frontend format check and affected Markdown pass. No runtime or test behavior changed.

- [x] **6.8 Finish asynchronous test work before fixture teardown**

    **Goal:** Save-overflow and navbar sign-out tests retain their assertions while completing or retiring their
    asynchronous work before the next fixture or test environment replaces it.

    - Pre-filled 23 real toast slots and completed three saves, retaining one visible and two queued confirmations.
      Removing unrelated entries reopens slots and proves old confirmations/Undo stay gone. Fixture unmount retires
      unfinished saves. Navbar sign-out waits for its final reload from a fresh location sentinel.
    - Narrow visible-only toast cleanup and omitted final reload each fail the corresponding assertion; restored
      production code passes. Full coverage passes all 2,783 tests in 78 files, clears thresholds and reports no
      unhandled errors. Lint, generated types/type-check, affected formatting/Markdown and whitespace checks pass.
      An independent check of the repair returned no findings; production behavior and global timeout settings are
      unchanged.

- [x] **6.9 Integrate shared navigation with query-backed user state**

    **Goal:** The shared account control and page headings coexist with query-backed reads and logout-owned
    navigation, preserving both the navigation shell and server-state behavior.

    - AccountControl retains the shared menu and delegates navigation to logout; its migrated regression observes
      both the Login route and terminal reload. Watchlist retains its authenticated Library query under the shared
      heading; Login retains notice and heading coverage, and browser selectors use the shared navigation.
    - The sign-out regression failed on the extra Home navigation before its removal. The first coverage run exposed
      heading fixtures mounted at the wrong route; mounting them at /login fixes the provider-return setup without
      a production change. Retired component locators now identify AccountControl; required behaviors are unchanged.
    - Full coverage passes all 3,006 tests in 93 files with no unhandled errors; all 17 Chromium scenarios across
      seven specs pass. Frontend lint, type-check, formatting and affected Markdown/whitespace checks pass.
      An independent integration check returned no findings.

- [x] **6.10 Preserve authentication mount lifetimes through the session query**

    **Goal:** Unmount cancels provider discovery without letting an obsolete read handle shared renewal or disturb
    its live callers, and a replayed mount stays resolving until its current discovery completes.

    - Retained the query-backed hook and its signal-aware session reader unchanged while integrating main's six
      mount-lifecycle cases. Both ordinary and StrictMode fixtures use the real query provider; their original
      cancellation, credential-store and live-caller assertions remain.
    - Narrow reconstructions fail all six behaviors: missing signal forwarding leaves provider work alive and clears
      retired credentials, aborting shared renewal breaks live callers, and premature anonymous state breaks replay.
      Production files were restored byte-for-byte before final checks.
    - All 101 focused auth tests and the full 3,012-test suite in 94 files pass, with coverage thresholds satisfied and
      no unhandled errors. Lint, types, formatting, affected Markdown/whitespace and both Remember Me browser cases
      pass. An independent integration check returned no findings, and CI passed on the pull request's final head
      (run 43369989459).

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
- **Pending provider ownership.** Keep resolution identity and the failure predicate with API authentication
  coordination. The session reader acquires/releases ownership; the API client does not import the session module.
  Ownership spans password fallback and ends safely on cancellation or explicit-command supersession. API requests
  never wait on the provider read, whose fallback uses that same client.
- **Originating API work.** Nested renewal keeps the caller's request budget, auth version, AbortSignal and feedback
  policy. A renewal failure cannot become a new 401 operation or replay the refresh URL as the caller's request.
  A canceled profile caller stays canceled after resolution-owner release, while other callers can still use their
  shared renewal. Context belongs to each caller, not a mutable field on a shared failure.
- **Current password failure authority.** Check live stored access credentials, even when expired, at the effect
  boundary. Anonymous fallback clears both stores before owner release; a later subscriber to the same rejection
  cannot acquire authority from that release. A successful fallback retains credentials and ordinary handling.
- **Save request and feedback ownership.** Keep the count captured at invocation, including Undo, before async
  mutation setup. Task 6.5 carries that count into synchronous generation-signal acquisition and existing HTTP
  cancellation, so retirement reaches request/adapter preparation and in-flight transport. Keep callbacks and
  global error feedback comparing the count even after cancellation; no server rollback is guaranteed.
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
  complete frontend suite (2,712 tests) and real-session sign-in smoke passed after both fixes. The independent fix
  check
  found no incomplete repair or introduced failure.

  _Additional evidence:_ The provider session survives an older idle renewal’s held 401/500 failure; all 88 auth
  cases and the full frontend suite passed after the ownership guard. Four additional API-renewal cases preserve
  provider sign-in and location after old failures; the full 2,718-test suite passed after provider invalidation.

- [x] 4. **Client defaults.** A test against `lib/queryClient`'s defaults shows a query retries twice on a network error
  and on a 5xx, and not on a 4xx or a cancellation; and a test shows two failing reads leave one "Server error" toast.
  (D2)

  _Evidence:_ Production-default retry tests passed: three network/500 reads; one refusal/cancellation/other read; one
  failed mutation. The two-read, one-visible-server-error-toast case passed.

- [x] 5. **The detail page.** Tests show a 404 shows "Movie Not Found", the page makes one request for the movie and
  none to `GET /user-movie-data/{tmdb_id}`, and its watchlist button shows the save toasts. (D3)

  _Evidence:_ MovieDetail tests passed status-specific 404/500, one movie read and zero separate user-state reads,
  payload state, enabled pending save with toasts/Undo, and request cancellation on unmount. A successful cached
  detail followed by a 404 refetch now shows not-found and removes the previous title/save controls, proved red/green.

- [x] 6. **The watchlist page.** A test shows it requests `watchlist=true` with a `page_size` of 100 through its query,
  and refetches after a save. (D6)

  _Evidence:_ Watchlist tests passed the query parameters, successful-save refetch, signed-out request suppression,
  and loading/error/empty/list states.

- [x] 7. **The old paths are gone.** A search of `frontend/src` and `frontend/tests` finds no `useApiRequest`,
  `useMovieDetail`, `useUserMovieData`, `useMovieActions`, `movieInteractionService`, `getUserMovieDataByTmdbId` or
  `localWatchlistState`; `useAuth` defines no `getUserDetails`; no `useEffect` in `frontend/src` calls `apiClient`,
  `fetch` or a service that reads or changes server data (today `authService`, `httpService`, `movieService`,
  `userMovieDataService` and `userMovieService`), apart from the 60-second renewal in `useAuth.ts`;
  `AccountControl.tsx`'s sign-out doesn't navigate; `MovieDetail.test.tsx` has no `vi.mock`; and `MovieCard.tsx` passes
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

- [x] 9. **Pending provider resolution.** Network tests show: while provider discovery or its password fallback is held,
   the idle check starts no renewal; background API renewal failure through either interceptor path rejects its request
   without clearing credentials, canceling or replacing the session query, or redirecting. A later valid provider
   response lands authenticated. An unavailable provider continues to successful password fallback or anonymous on
   fallback failure, without losing resolution ownership between them. Cancellation and explicit sign-in/out
   prevent obsolete responses and cleanup from changing the replacement session. After resolution ends, a current
   password session still receives ordinary renewal-failure handling. An earlier password renewal settling after
   provider acceptance cannot clear that user or redirect. If the first renewal returns 401 and a later one would
   succeed, the original API operation still rejects after exactly one renewal; it never receives refresh-token
   response data as a successful movie/profile read. Canceling the query during held fallback 401 recovery prevents
   its later renewal failure from clearing credentials or redirecting after ownership release. Another current
   caller can still complete their shared renewal. When fallback initiates shared renewal before a background API
   caller joins and it fails, the session lands anonymous, both credential stores are cleared, the caller rejects
   after one refresh and no redirect occurs, through both API entry paths and with reversed waiter order. After
   successful password fallback, later failure while current password credentials remain present still receives
   ordinary handling. (D7)

  _Evidence:_ All 28 resolution cases pass in the full 2,744-test frontend run: held discovery/fallback, both API
  paths and failure statuses, both shared-rejection waiter orders, one terminal renewal, per-caller feedback,
  cancellation with another successful shared caller, explicit command supersession, identity-safe old cleanup,
  current profile refusal, ordinary later failure and already-started idle/API failures after provider acceptance.
  Narrow reconstructions produced the corresponding observable failures before restoration. Lint, types,
  formatting, affected Markdown and real-session sign-in/out smoke pass. An independent fix check found no runtime
  defect; its one minor finding, the authentication strategy's outdated renewal-failure example, was corrected.

- [x] 10. **Save request ownership.** Network tests show a save retired after its mutation guard, before Axios prepares
    the request, sends no PATCH with a replacement provider session or password token. Holding the actual browser
    adapter's asynchronous cookie preparation, then changing user before releasing it, also sends no retired PATCH.
    A change-count-only transition, held CSRF initialization and held renewal success/failure leave the old caller
    canceled with no PATCH/replay, obsolete feedback or Library invalidation, or credential clearing/redirect of its
    own. Canceling a save generation alone does not abort a separate current caller's shared renewal. Both ordinary
    saves and Undo carry the signal. An already-sent request is canceled locally without obsolete settlement effects
    or a claim of server rollback. Current-owner saves, ordering, completion after unmount and Undo still work.
    (D4, D7)

  _Evidence:_ All 13 ownership cases pass in the full 2,757-test run: mutation-to-HTTP turnover, native cookie
  preparation for ordinary save/Undo, CSRF/count-only retirement, both renewal paths and 200/401/500 outcomes,
  surviving shared caller, in-flight transport cancellation and new-generation success. Behavioral red/green and
  narrow reconstructions prove the boundaries. Existing auth-command tests require canceled retired saves with
  state/feedback/invalidation guards intact; current-owner/order/unmount/Undo controls pass. Lint, types, formatting,
  Markdown and real-session sign-in/out pass. An independent fix check of the repair returned no findings.
