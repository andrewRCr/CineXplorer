# Task List: Frontend Server State

**PRD:** `prd-frontend-server-state.md`
**Created:** 2026-11-11
**Branch:** `technical/frontend-server-state`
**Base Branch:** `main`
**Status:** In Progress

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

- [ ] **1.2 Retried reads share one "Server error" toast — D2**

    **Goal:** A read that fails with a 5xx again after a retry updates the "Server error" toast already showing instead
    of stacking another, in the grids too.

    - [ ] **1.2.a Test two failing reads in `apiClient.test.ts`**
        - Two GETs answered 500 with `<Toaster />` rendered: one "Server error" toast shows
        - Expect test to FAIL initially (two toasts today)
    - [ ] **1.2.b Give the toast a fixed `id` in `apiClient`'s response interceptor**
        - The toaster updates a toast created with an id it already shows (`create` in `@zag-js/toast`'s store)
        - Tests should now PASS

- [ ] **1.3 The grids take their query keys from one factory — D1**

    **Goal:** Query keys come from `lib/queries.ts`, with the grids' key values unchanged, so their two caches and the
    scroll restoration behave as before.

    - [ ] **1.3.a Create `frontend/src/lib/queries.ts`**
        - Key builders for `['movies', 'virtualized', source, query, browseParams]` and
          `['movies', 'infinite', source, query, browseParams]`, typed `as const`; 3.1, 3.2 and 4.1 add the detail,
          Library and session entries as full `queryOptions`
        - Nothing in it, or in any later module, imports `lib/queryClient` to act on the cache (Implementation Notes)
    - [ ] **1.3.b Take the grids' keys from the factory**
        - `VirtualizedMovieGrid` and `SequentialMovieGrid` build their keys through it and keep their fetchers;
          `useInfiniteMovies`'s `queryKey` widens from `unknown[]` to TanStack's readonly `QueryKey`, so the factory's
          `as const` keys fit and it still accepts any key
        - A refactor with no behavior change: the grid and `useInfiniteMovies` tests pass unchanged
        - Check in `frontend/`, with the worktree's browsable stack running:
          `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/browse.spec.ts e2e/back-to-results.spec.ts`

### **Phase 2:** A save shows at once on every card

_Mode:_ `slice` — closes on a save showing at once on its card, its detail page and the watchlist page, each reading
through the shared save hook.

- [ ] **2.1 The save hook shows a movie's payload under this tab's saves — D4, D8**

    **Goal:** A movie shows its payload replaced by its latest successful save and overlaid by its pending saves; saves
    of one movie reach the server in the order made, and a failed save leaves the last value the server confirmed.

    - [ ] **2.1.a Test the hook in `frontend/src/hooks/movie/__tests__/useUserMovieState.test.tsx`**
        - Real query client from `TestProviders`; MSW answers `PATCH /user-movie-data/{tmdb_id}` with the whole record
          (`createMockUserMovieData`); `<Toaster />` rendered; a small probe component shows the state and saves
        - A `null` payload shows a record with no state: every flag false, and `user_rating`, `user_review` and
          `watched_at` null
        - A save shows at once while pending; on success the returned record shows whole, including a field the server
          derives (unwatching clears `watched_at`) and fields the save didn't send
        - Two saves made back to back reach the server one after the other, in order: the second isn't sent while the
          first is held
        - A failed save drops out and shows its error toast: "Failed to update watchlist" for a watchlist save,
          "Failed to save changes" for any other, each with "Please try again."; a 429 fails the same way
        - Two queued saves that both fail leave the payload; when the first succeeds and the second fails, the first's
          record shows
        - Success invalidates the Library: a mounted query under the `['library']` prefix refetches, while a mounted
          movie list and detail entry are neither refetched nor written; a failed save leaves the Library query alone
        - A save that settles after its component unmounted still shows its toast and invalidates the Library
        - A watchlist save's success toast reads "Added to watchlist" or "Removed from watchlist" from the server's
          record
        - A settled save still shows after more than five minutes with nothing observing it (fake timers)
        - Expect tests to FAIL initially. The cases that something stays untouched (the lists and detail entry, and the
          Library after a failure) are seen failing against a save that invalidates the `['movies']` prefix and a
          failed save that invalidates the Library

    - [ ] **2.1.b Write `useUserMovieState` and the save's mutation options**
        - `frontend/src/hooks/movie/useUserMovieState.ts` exports `useUserMovieState(tmdbId, payload)`, returning
          `{ state, save }`, and `saveMutationOptions(tmdbId)`, built with `mutationOptions` for Undo to reuse (2.3).
          The hook is callable before its movie has loaded (no TMDB ID or payload yet), since the detail page calls it
          above its loading return
        - The options: a mutation key and a `scope` keyed by the TMDB ID, `gcTime: Infinity`, and a `mutationFn`
          through `saveUserMovieData`; a save's variables carry its changed fields and whether it is an Undo
        - `frontend/src/lib/session.ts` starts here with the change count (`getChangeCount()`); 2.2 adds the step that
          advances it. `onMutate` records the count; `onSuccess` and `onError` do nothing once it has changed. Otherwise
          `onSuccess` invalidates the Library's key prefix (added to `lib/queries.ts` here; 3.2 adds its options)
          through the callback's `client` and shows the success toast, and `onError` shows the error toast only. All of
          this lives in the options, never in `mutate` callbacks, so it runs after the caller unmounts
        - The hook reads its movie's saves through `useMutationState` filtered by the mutation key and builds the shown
          state in D4's order: the payload or the empty record, the latest successful save's record, then the pending
          saves' fields in the order made
        - Each toast a save shows takes an id from a maker `lib/session.ts` exports, marking it as a save's toast, for
          2.2's step to dismiss
        - Tests should now PASS

- [ ] **2.2 A change of user stops every kept save — D4, D7, D8**

    **Goal:** One session-module step advances the change count, clears the kept saves, dismisses the save toasts still
    showing and resets every query but the session, so no save made before it acts after it.

    - [ ] **2.2.a Test the step in `frontend/src/lib/__tests__/session.test.tsx`**
        - Run the step against the test's query client (from `TestProviders`), with saves made through
          `useUserMovieState` and a mounted query under the `['library']` prefix, whose requests are counted from a
          save's release (the step's reset refetches it before)
        - A save running when the step runs settles with no toast and no Library refetch, and its value drops out
        - A save still queued then never reaches the server
        - A save's toast showing then is dismissed, while a "Server error" toast stays
        - A mounted movie query refetches; a `['session']` entry keeps its data
        - Expect tests to FAIL initially. What the step leaves alone (the "Server error" toast, the session entry) is
          seen failing against a step that dismisses every toast and one that resets every query
    - [ ] **2.2.b Add the step to `lib/session.ts`**
        - Exports `beginUserChange(client)` (advance the count, clear the mutation cache, dismiss the visible toasts
          whose id marks a save), `resetUserQueries(client)` (reset every query whose key isn't the session's) and
          `changeOfUser(client)`, which runs both; a password sign-in runs the two apart (5.1)
        - The session key is defined in `lib/session.ts`; `lib/queries.ts` imports it, never the reverse
        - Tests should now PASS

- [ ] **2.3 A watchlist toast offers Undo, one save per click — D4, D8**

    **Goal:** Undo on a watchlist save's toast saves the opposite value once per click, also after the component that
    started the save is gone, and its own toast offers no further Undo.

    - [ ] **2.3.a Test Undo in `useUserMovieState.test.tsx`**
        - Undo on "Added to watchlist" sends one PATCH with `user_on_watchlist: false`; its toast reads
          "Removed from watchlist" and offers no Undo
        - Undo from a toast whose component has unmounted still saves and shows its toast
        - Expect tests to FAIL initially; with Undo added and `renderToast` unchanged, a click sends two saves. Undo's
          own toast offering no Undo passes before Undo exists, and is seen failing against Undo on every watchlist
          save's toast
    - [ ] **2.3.b Add Undo, and stop the renderer's second call**
        - The success toast's `action` is Undo, which runs a save marked as an Undo through
          `saveMutationOptions(tmdbId)` and the callback's `client`, outside any component (for example through a
          `MutationObserver`)
        - `renderToast` in `toaster.tsx` stops passing `toast.action.onClick` to `Toast.ActionTrigger`, whose trigger
          props already call it
        - Tests should now PASS

- [ ] **2.4 Cards show and save their state through the save hook — D5, D8**

    **Goal:** A card shows its movie's shared state, stays enabled while saving, and still shows a save after it
    remounts or its list's next page lands, with no movie list refetched.

    - [ ] **2.4.a Test the card in `MovieCard.test.tsx`'s watchlist saves**
        - Two quick clicks send `true` then `false` and end on "Add to watchlist" with `aria-pressed="false"`, the
          control enabled throughout (rewrites the existing double-toggle case)
        - A failed save (500, 429) shows the server's value and the error toast (the existing case, kept)
        - A card remounted mid-save shows the save; a card remounted after a save shows it over its cached payload
        - Cards drawn from a cached list, with the list's next page held: save from a card, release the page, and the
          card still shows the save, as it does when only the cards remount afterwards (the harness's
          `useInfiniteMovies` stays mounted); no request for the list's first page follows the save. Render a harness
          of cards over `useInfiniteMovies` with the factory's key and a load-more control, which keeps page one's
          cards mounted (`SequentialMovieGrid` shows one page at a time, so it can't)
        - A save settling after its card unmounted still shows its toast and invalidates the Library; Undo works from a
          toast whose card has unmounted
        - Expect the remount, Undo and Library cases to FAIL initially (the card's private copy resets on remount, and
          nothing invalidates the Library). Known to pass today: the mounted next-page case, through that
          private copy, seen failing against a save written into the cached page; no request for the list's first page
          after the save, since nothing writes to or invalidates the cache today, seen failing against a save that
          invalidates the movie lists; and the toast after unmount, since `useMovieActions` toasts after its await
          unguarded, seen failing against toasts moved into `mutate` callbacks, which TanStack skips once the card has
          unmounted

    - [ ] **2.4.b Move `MovieCard` onto `useUserMovieState`**
        - Remove `localWatchlistState`, `useMovieActions` and `disabled={isUpdating}`; the control shows
          `state.user_on_watchlist` and saves its opposite, computed from the shown state
        - The memo comparison can stay: the hook's subscription to the saves re-renders the card
        - Delete `useMovieActions.ts` with its test, and `movieInteractionService.ts` with its four rejecting
          placeholders
        - Tests should now PASS
        - Check in `frontend/`, with the browsable stack running:
          `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/browse.spec.ts e2e/movie-detail.spec.ts e2e/back-to-results.spec.ts`

### **Phase 3:** The detail and watchlist pages read through queries

_Exit criterion:_ in frontend tests with the network mocked, a card's watchlist save shows at once on the card and on
its detail page with no movie list refetched, still shows after the list's next page lands, and refetches the watchlist
page; on the browsable stack the same journey works against the real API, with Undo from a toast.

- [ ] **3.1 The detail page reads its movie through a query — D3, D5, D2, D1, D8**

    **Goal:** The detail page makes one request for its movie, shows its user state from the payload under this tab's
    saves, tells "not found" by status, and saves through the shared hook with its toasts and Undo.

    - [ ] **3.1.a Move `MovieDetail.test.tsx` onto MSW**
        - Drop its four `vi.mock`s (`useMovieDetail`, `useUserMovieData`, `useAuth`, `movieService`) and serve
          `GET /movies/{id}` with `createMockMovieDetail`; its back-link, loading, error and score cases keep their
          assertions
        - Each migrated case is seen failing under a temporary narrow break of the behavior it covers, then passing
          (Implementation Notes)

    - [ ] **3.1.b Test the query-backed page**
        - A 404 shows "Movie Not Found", and a 500 shows "Error Loading Movie"
        - Signed in (`AuthContextProvider`, a current stored token, MSW's profile): one request for the movie and none
          to `GET /user-movie-data/{tmdb_id}`; the button shows the payload's `user_on_watchlist` (`true`, so it fails
          while the page reads its user state elsewhere)
        - The watchlist button shows the save toasts and Undo, and stays enabled with no loading state while its save
          is held; it stays disabled unless the status is `authenticated`
        - A movie whose detail entry is cached by an earlier visit, saved from its card, shows the save on its detail
          page after the card list's next page has landed, with no request for the list's first page from the save on
          (routes for a card list and the detail page). `TestProviders`' client has no stale time, so a page refetches
          what it mounts over: the list on its return before the save, and the movie on the detail page's mount
        - Leaving the page while its read is held aborts the request: the handler sees its `signal` aborted
        - Expect the request, toast, button and cached-entry cases to FAIL initially. The status, disabled and abort
          cases pass today (axios's message carries the status the page matches, and `useApiRequest` cancels on
          unmount), and so do the request case's single movie request (`useApiRequest` reads once per fetcher) and the
          cached-entry case's first-page clause (a save invalidates only the Library): see each fail against a narrow
          break (Implementation Notes), the single request against a second read of the movie (the query beside
          `useMovieDetail`), and the clause against a save that invalidates the movie lists

    - [ ] **3.1.c Read the detail through the factory's detail query**
        - `lib/queries.ts` adds `movieDetailQuery(tmdbId)` on `['movies', 'detail', tmdbId]`: its query function calls
          `fetchMovieDetail().get(...)` and links the `signal` it receives to that pair's `cancel`, through a helper
          every factory query uses; `HttpService` is unchanged
        - The page reads it with `useQuery`, shows "Movie Not Found" when `getErrorStatus(error)` is 404, takes its user
          state from `useUserMovieState(movie.tmdb_id, movie.user_movie_data)`, and drops the button's `loading`; the
          layout and the placeholder buttons stay
        - Delete `useApiRequest.ts`, `useMovieDetail.ts` and `useUserMovieData.ts` with their tests, and
          `getUserMovieDataByTmdbId`
        - Tests should now PASS, with `MovieDetail.styles.test.tsx` unchanged
        - Check in `frontend/`, with the browsable stack running:
          `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/movie-detail.spec.ts e2e/back-to-results.spec.ts`

- [ ] **3.2 The watchlist page reads the Library through a query — D6, D2, D1, D8**

    **Goal:** The watchlist page requests `watchlist=true` with a `page_size` of 100 only while someone is signed in,
    and refetches after a save.

    - [ ] **3.2.a Test the page in `Watchlist.test.tsx`**
        - Render under `AuthContextProvider`, signed in with a current stored token and `authHandlers()`; the request,
          list, empty, loading and error cases keep their assertions
        - A save made while the page is mounted refetches the Library
        - No Library request while nobody is signed in
        - Expect the new cases to FAIL initially
    - [ ] **3.2.b Read the Library through the factory's Library query**
        - `lib/queries.ts` adds `libraryQuery(params)` on `['library', params]` over `getUserMovies`, signal linked
        - `Watchlist` reads it with `useQuery`, enabled while the status is `authenticated`, and keeps its text list and
          its loading, error and empty states
        - `frontend/tests/README.md`'s two `Watchlist` examples render it signed in (`AuthContextProvider`, a current
          stored token, `authHandlers()`), as `Watchlist.test.tsx` does
        - Tests should now PASS

- [ ] **3.3 The technical overview describes the query factory and the save hook — D9**

    **Goal:** A reader of the technical overview learns that server data is read through queries from `lib/queries.ts`
    and changed through the save hook, not through `useApiRequest`.

    - Rewrite the Data Fetching bullet in `TECHNICAL-OVERVIEW.md` § 3

- [ ] **3.4 Check a save shows everywhere at once**

    **Goal:** The save, the card, the detail page and the watchlist page are shown to compose, in tests and against the
    real API, with what ran and the result recorded.

    - Run the composition cases from 2.4.a and 3.1.b and the refetch case from 3.2.a by name
    - On the browsable stack, signed in as its seeded account: add a movie to the watchlist from its card (the toast
      offers Undo); open its detail page (it reads "Remove from Watchlist" with no user-data request); Undo from the
      toast there; go back to the list (the card shows the Undo); open the watchlist page (it shows the change)
    - Keep the script and its log in the work unit's runs folder

### **Phase 4:** The session is read through one query

_Mode:_ `slice` — closes on a change of signed-in user leaving no cached query, kept save or save toast of the previous
user's.

- [ ] **4.1 The session query replaces `useAuth`'s sign-in state — D7, D1, D8**

    **Goal:** `useAuth`'s `status`, `isAuthenticated`, `user`, `login`, `logout` and `register` keep their shapes and
    behavior over a `['session']` query, whose first read replaces the mount check and the profile effect.

    - [ ] **4.1.a Give `useAuth`'s tests a query client**
        - `useAuth.test.tsx` mounts inside `TestProviders` around its `MemoryRouter`; the `NavBarUserMenu`,
          `ProtectedRoute` and `Login` tests already render inside `TestProviders`
        - A behavior-preserving move: the kept cases change only their wrapper and pass before it, as its regression
          net

    - [ ] **4.1.b Add the session query**
        - `lib/session.ts` adds the read; `lib/queries.ts` adds `sessionQuery()` on the session key, with
          `retry: false`, `staleTime: Infinity` and no refetch on mount, focus or reconnect
        - 4.2.b gives `sessionQuery` an optional first-read context (whether the page loaded on a provider's return),
          and only `useAuth`'s observer passes it. A writer's fresh read calls `sessionQuery()` and takes only the
          stored-token or allauth path, never the provider branch (4.2) or the step (5.1). Each read runs with the
          options its caller passes, since `Query.fetch` adopts them
        - The read: with a stored access token, renew an expired one through `refreshAccessToken`, then read the profile
          (`authService.getUserProfile`); without one, read allauth's session endpoint (`checkOAuthSession`'s request,
          moved into `lib/session.ts`; the callback's effect keeps calling it until 4.2.b). Any failure but a
          cancellation or a changed session version gives `null` and, on the password path, clears stored tokens; a read
          started under an earlier session version neither lands nor clears stored tokens. It doesn't abort its
          requests

    - [ ] **4.1.c Derive `useAuth`'s state from the query, and write it from each writer**
        - The status: a profile is `authenticated` and `null` is `anonymous`; before the first read lands, a current
          stored token with the stored flag reads `authenticated` (today's initial state), and anything else
          `resolving`
        - Each writer cancels a session read in flight first. Password sign-in, after `authService.login`, runs
          `invalidateAuthSession`, clears both storages and stores the token, then reads the session afresh, and `login`
          resolves once that read has landed. Sign-out runs `invalidateAuthSession`, clears stored tokens and writes
          `null`, then keeps today's navigation, toast and request until 5.2. A failed renewal at the 60-second check
          writes `null`. Until 4.2.b the OAuth callback keeps its request and writes the user it finds, in place of its
          `setUser` and `setStatus`
        - Remove the mount check, the profile effect, `getUserDetails` and its ref; once 4.2.b removes the callback's
          request, the 60-second renewal is the one effect that fetches
        - Kept tests should PASS, with the `NavBarUserMenu`, `ProtectedRoute` and `Login` tests
        - Check in `frontend/`, with the browsable stack running, all five smoke specs, since every page reads the
          status: `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e`

- [ ] **4.2 A provider's return is read once, by the session query — D7, D8**

    **Goal:** On a provider's return the session's first read asks allauth first and lands the provider's user over any
    stored token, and the callback's effect reacts to that read without sending a request.

    - [ ] **4.2.a Test the provider's return in `useAuth.test.tsx`**
        - A token stored by an earlier password session (expired, its renewal answering 200), on a return to `/login`
          with the in-progress flag: the provider's user lands, both storages' tokens are cleared, and allauth's session
          endpoint is read once (today the renewed token survives, and its user's profile loads beside the callback's)
        - allauth finding nobody: the read goes on by the stored-token path, and allauth's session endpoint is read
          once; with a stored token (expired, its renewal answering 200) its user lands and the flags clear with no
          welcome toast, and with no token the status reads `anonymous`
        - Landing the provider's user clears `oauth_in_progress` and `oauth_start_time`, shows the welcome toast and
          returns to the requested page; finding nobody clears the flags. The kept "returning after a provider sign-in"
          cases assert only the route and the error redirect, so the flags and the toast are new assertions
        - With no token stored and allauth's answer held while the route moves on, the provider's user still returns to
          the page requested at the return; and after a page load that wasn't a provider's return, a later arrival at
          `/login` with the flag still set clears both flags
        - Expect the stale-token case to FAIL initially (the renewed token survives), and the no-token case on allauth's
          endpoint read twice (by the first read and the callback). Much of the rest passes before 4.2.b through 4.1.c's
          callback; known at planning, each seen failing against a narrow break: the provider's user landing, against a
          read that takes the stored-token path first; the welcome toast and cleared flags on the provider's user,
          against an effect that keeps today's early return for a signed-in user; allauth read once with a token stored,
          against a callback that still sends its request; the stored-token path's user landing after allauth finds
          nobody, against a provider branch that lands nobody; the flags cleared after any other landing, against an
          effect that keeps them; no welcome toast for the stored-token path's user, against a toast for any user
          landing on a provider's return; `anonymous` with no token, against a read that never lands after finding
          nobody; the requested page kept while the route moves on, against an effect that reads the location at the
          landing; and the leftover flag cleared, against an effect that acts only on a provider's return

    - [ ] **4.2.b Read allauth first on a provider's return**
        - `sessionQuery` takes its optional first-read context here (4.1.b; Implementation Notes): `useAuth` decides the
          return at its first render, with the page it requests, and passes it; on the provider's user the read clears
          stored tokens before landing it, as a password sign-in clears both storages
        - The callback's effect keeps the error redirect and otherwise reacts to the first read's landing on a
          provider's return, so its early return for a signed-in user goes. A user landing with no stored token is the
          provider's (the provider branch clears stored tokens, the stored-token path keeps them): it clears the flags,
          shows the welcome toast and returns to the page requested at the first render. Nobody, or the stored-token
          path's user, only clears the flags. On any later arrival at `/login`, the effect clears a flag still set, as
          today's callback does after finding nobody. It calls no service and no `fetch`
        - Tests should now PASS

    - [ ] **4.2.c Search for effects that fetch**
        - No `useEffect` in `frontend/src` calls `apiClient`, `fetch` or a service that reads or changes server data
          (`authService`, `httpService`, `movieService`, `userMovieDataService`, `userMovieService`), apart from the
          60-second renewal in `useAuth.ts`; `useAuth` defines no `getUserDetails`

### **Phase 5:** A change of user leaves nothing of the previous user's

_Exit criterion:_ in frontend tests each way the signed-in user changes clears the kept saves and refetches what is on
screen, and a held sign-out shows no toast for a save settling meanwhile and loads `/login?signed_out=true` only once
its request settles; on the browsable stack, signing out and in again shows no previous session's state, and
`sign-in.spec.ts` passes.

- [ ] **5.1 Every change of user clears the saves and refetches the lists — D7, D8**

    **Goal:** The step runs at exactly the points D7's table names, so no save, Undo or list of the previous user's acts
    or shows after a change, and leaving `resolving` otherwise clears nothing.

    - [ ] **5.1.a Test each change in `useAuth.test.tsx`**
        - Each case shows a movie list query and a query under the `['library']` prefix and makes a save beside
          `useAuth`, counting list requests and their `Authorization` header, and Library requests from the save's
          release (the step's reset refetches it before)
        - Stored credentials the first read rejects (a 403 on the profile): a save settling after shows no toast and
          refetches no Library, and the lists refetch without the token
        - An expired stored token whose renewal succeeds while the profile read fails: the lists refetch without the
          user, and the saves are cleared
        - A failed renewal at the 60-second check refetches the lists and clears the saves
        - A password sign-in completed during the first session read refetches the lists with its token
        - A password sign-in whose fresh read fails clears the saves when its token is stored, and refetches the lists
          after the read, without the token
        - A provider's return whose first read finds the provider's user clears a stale stored token and refetches the
          lists fetched while resolving, with allauth's session endpoint read once
        - A save's toast is gone after a change of user
        - A 5xx on the first session read after stored credentials signed the user in at once signs them out and leaves
          its "Server error" toast showing
        - Not changes: the first read landing the user already shown signed in, and leaving `resolving` for `anonymous`
          with no stored token, refetch nothing and keep the saves
        - Expect the change cases to FAIL initially; the two cases that aren't changes pass today, and are seen failing
          against a step run at every landing. The 5xx case passes before 5.1.b too, since no step runs to dismiss its
          toast, and is seen failing against a step that dismisses every toast. The provider's return's cleared token
          and single allauth read are 4.2's, already seen failing there

    - [ ] **5.1.b Run the step at each writer and at the first read's landing**
        - A password sign-in runs `beginUserChange` when its token is stored, and `resetUserQueries` once its fresh read
          has landed, whatever it found
        - The first read, the one given the first-read context, runs `changeOfUser` when it lands the provider's user
          on a provider's return, or finds nobody while a token is stored and so clears it; a writer's fresh read never
          runs it
        - A failed renewal at the 60-second check runs `changeOfUser` with its `null` write
        - Tests should now PASS
        - Check in `frontend/`, with the browsable stack running:
          `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/sign-in.spec.ts`

- [ ] **5.2 Sign-out ends on a freshly loaded sign-in page — D7, D8**

    **Goal:** Sign-out reads `anonymous`, clears the saves and moves to the sign-in page at once, then loads
    `/login?signed_out=true` afresh once its request settles, whether it succeeded or failed, and the sign-in page shows
    the signed-out notice only to someone not signed in.

    - [ ] **5.2.a Test sign-out**
        - `useAuth.test.tsx`, with the sign-out request held (`POST /logout/` for a password user, allauth's session
          DELETE for a provider user): the status reads `anonymous`, the saves clear and the route moves to `/login` at
          once, with no toast from `logout`; a save settling meanwhile shows no toast; `window.location.href` becomes
          `/login?signed_out=true` only once the request settles, for a success and for a failure
        - `NavBarUserMenu.test.tsx`: choosing Logout ends on the sign-in route, not home
        - `Login.test.tsx`: `/login?signed_out=true` shows "You've been logged out" when nobody is signed in, and not
          when someone is: a current stored token, or no token with allauth's session answering signed in (the case
          that catches a notice shown while the status is still `resolving`)
        - Expect tests to FAIL initially. Some assertions pass before 5.2.b, each seen failing against a narrow break:
          the status reading `anonymous` and the route moving to `/login` at once (`logout` does both before its
          request), against a `logout` that does them once the request settles; and no notice for a signed-in visitor
          (the sign-in page reads no `signed_out` today), against a notice shown whatever the status (the stored-token
          case) and one shown unless the status reads `authenticated` (the allauth case)
        - `e2e/sign-in.spec.ts`: after Logout, expect the sign-in page, and look for the navigation bar's Login button,
          since the form has its own; the nav bar has no landmark to scope by, and comes before the form (the spec's
          sign-in click takes the form's with `.last()`). Run it on the browsable stack and see it fail: today's
          sign-out ends on the home page

    - [ ] **5.2.b Rewrite `logout`, `handleLogout` and the sign-in page's notice**
        - `logout` notes whether a token is stored, runs `invalidateAuthSession`, clears stored tokens, cancels a
          session read in flight, writes `null`, runs `changeOfUser` and navigates to the sign-in route as today,
          without today's toast; it then sends its request (`authService.logout`, or allauth's session DELETE) and,
          once that settles either way, sets `window.location.href` to `/login?signed_out=true`, as `apiClient` loads
          the sign-in page
        - `NavBarUserMenu`'s `handleLogout` stops navigating home, so `logout` alone decides where sign-out ends
        - `Login` shows the "You've been logged out" toast on the priority toaster from `signed_out=true` once the
          status is `anonymous`, and clears the parameter as it does `session_expired`
        - Tests should now PASS
        - Check in `frontend/`, with the browsable stack running:
          `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/sign-in.spec.ts`

- [ ] **5.3 The reference documents describe the session query and the change of user — D9, D3, D4, D7**

    **Goal:** The authentication strategy, ADR-027 and ADR-028 describe what shipped, so a later reader finds the
    session query, the change of user and the save overlay recorded with their reasons.

    - [ ] **5.3.a Rewrite the authentication strategy's Token Refresh Flow and Authentication Hook sections**
        - `strategy-authentication.md` describes the session query (its read, its writers, the status) and the change of
          user, without the profile-loading effect or `getUserDetails`; its version header stays as it is
    - [ ] **5.3.b Amend ADR-027, and update the Status lines of ADR-027 and ADR-028**
        - One dated amendment records three things: the detail query moved with this change (D3); a movie's user state
          shows over the payloads with this tab's saves, kept in the mutation cache and rolled back by dropping a failed
          save, because an infinite list's next-page load undoes a patch in place (D4); and every change of signed-in
          user, sign-in included, clears the cache (D7)
        - ADR-027's Status names this change as the move it planned and says the end-to-end watchlist test is still to
          come; ADR-028's names it as the session's move onto TanStack Query. The pull request's number joins them once
          it opens

- [ ] **5.4 Check a change of user end to end**

    **Goal:** Sign-out, sign-in and the saves are shown to compose against the real session, with what ran and the
    result recorded.

    - Run the cases from 5.1.a and 5.2.a by name, and `e2e/sign-in.spec.ts` on the browsable stack
    - On the browsable stack, signed in as its seeded account: add a movie to the watchlist and sign out while its toast
      shows; the sign-in page loads with the signed-out notice and no save toast; browse signed out (no card shows the
      watchlist state); sign in again (the lists show the saved state)
    - Keep the script and its log in the work unit's runs folder

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; the work
  adds no new ADR, so no acceptance is due)

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

- [ ] 1. **The success signal.** In a frontend test with the network mocked: toggling a card's watchlist control twice
  sends `true` then `false`; the card and the movie's detail page show the same state without any movie list being
  refetched, and still do after the list's next page lands; a failed save, or two queued saves that both fail, leave
  the server's value showing; and a sign-out clears the kept saves at once and, once its request has settled, loads the
  sign-in page afresh, so no cached query or kept save of the previous user's outlives it. (D4, D5, D7)
- [ ] 2. **Saves.** Tests show: with two queued saves of one movie where the first succeeds and the second fails, the
  first save's record shows; a save that settles after its card unmounted still shows its toast and invalidates the
  Library; a card remounted mid-save shows the save; Undo sends one save per click, its own toast offers no Undo, and
  it works from a toast whose card is gone. (D4, D5)
- [ ] 3. **A change of user.** Tests show: during a sign-out whose request is held, a save settling meanwhile shows no
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
- [ ] 4. **Client defaults.** A test against `lib/queryClient`'s defaults shows a query retries twice on a network error
  and on a 5xx, and not on a 4xx or a cancellation; and a test shows two failing reads leave one "Server error" toast.
  (D2)
- [ ] 5. **The detail page.** Tests show a 404 shows "Movie Not Found", the page makes one request for the movie and
  none to `GET /user-movie-data/{tmdb_id}`, and its watchlist button shows the save toasts. (D3)
- [ ] 6. **The watchlist page.** A test shows it requests `watchlist=true` with a `page_size` of 100 through its query,
  and refetches after a save. (D6)
- [ ] 7. **The old paths are gone.** A search of `frontend/src` and `frontend/tests` finds no `useApiRequest`,
  `useMovieDetail`, `useUserMovieData`, `useMovieActions`, `movieInteractionService`, `getUserMovieDataByTmdbId` or
  `localWatchlistState`; `useAuth` defines no `getUserDetails`; no `useEffect` in `frontend/src` calls `apiClient`,
  `fetch` or a service that reads or changes server data (today `authService`, `httpService`, `movieService`,
  `userMovieDataService` and `userMovieService`), apart from the 60-second renewal in `useAuth.ts`;
  `NavBarUserMenu.tsx`'s sign-out doesn't navigate; `MovieDetail.test.tsx` has no `vi.mock`; and `MovieCard.tsx` passes
  no `disabled` to its watchlist control. (D3–D8)
- [ ] 8. **Documents.** The technical overview's Data Fetching section describes the query factory and the save hook,
  not `useApiRequest`; the authentication strategy's Token Refresh Flow and Authentication Hook sections describe the
  session query and the change of user; ADR-027 carries the dated amendment D4's disposition describes, and the Status
  lines of ADR-027 and ADR-028 name this change. (D9)
