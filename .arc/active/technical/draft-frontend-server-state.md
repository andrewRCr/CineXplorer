# Draft: Frontend Server State

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-11

**Purpose:** Move the frontend's server data onto TanStack Query: reads through queries built by one factory, a user's
movie data changed through one save hook whose saves show at once wherever the movie appears, and the session as a
query whose change of user clears the cache. It builds on the user-movie data API (`prd-user-movie-data.md`), whose
frontend adaptation it replaces, and on ADR-027 and ADR-028, which set the direction.

---

## Problem / Motivation

The frontend's rules say server data is read through TanStack Query with keys from one key factory, changed through
mutations that update or invalidate the cache, and never fetched in `useEffect`. Once the user-movie data API lands,
the frontend still breaks that rule in four places, and the breaks show as wrong state on screen:

- **Cached cards go stale after a save.** `MovieCard` keeps its own copy of the watchlist flag
  (`localWatchlistState`) and saves through `useMovieActions` and `toggleMovieWatchlist`. Nothing writes the result
  back into the cached list pages `useInfiniteMovies` holds (nothing in the frontend writes to the query cache), so
  another grid, or the same card remounted after navigating back, reads the pre-save state from the cache until the
  list refetches. The detail page fetches afresh on every visit and saves through `useUserMovieData`'s `update`, which
  writes only that hook's local state, so a save made there leaves every cached card stale.
- **The detail page fetches twice, by hand.** Its movie comes from `useMovieDetail`, a wrapper over `useApiRequest`,
  which fetches in an effect. Its user state comes from a second effect fetch in `useUserMovieData`
  (`getUserMovieDataByTmdbId`, `GET /user-movie-data/{tmdb_id}`), although the detail payload already carries
  `user_movie_data` (`enrich_single_movie_with_user_movie_data` in `get_movie_detail`). The page detects "not found"
  by matching `404` in the error text.
- **The watchlist page and the session fetch in effects.** `Watchlist` reads the Library (`getUserMovies`) in an
  effect. `useAuth` reads the provider session (`checkOAuthSession`) and the password user's profile
  (`getUserDetails`, `getUserProfile`) in effects.
- **Signing in or out leaves the previous user's data cached.** `useAuth`'s `logout` never touches the query cache, so
  the grids' cached pages keep the previous user's flags. Lists cached while signed out carry no user state
  (`user_movie_data` is `null` for an anonymous request), and signing in leaves them that way.

Two smaller problems ride with them. `queryClient` (`lib/queryClient.ts`) retries every failed query twice, a 404 or
401 included. Undo on the watchlist toast was deferred until saves could keep cards in sync, since an Undo would have
bypassed the card's private copy; with that copy gone, it can be built.

The core user-movie screens (the watched, liked, rating and review controls, the Log form, the Library) build on the
hooks this work introduces, so it lands before them.

## Alternatives

ADR-027 settles the direction: all server data through TanStack Query, keys from one factory, a movie's user state read
from the list and detail payloads that already carry it, and one mutation hook with an optimistic update and a
rollback. ADR-028 puts the session on a query. The choices left open here:

- **What the factory holds.** _Keys alone_, with each hook supplying its own fetch function. **TanStack's
  `queryOptions` for each query (chosen):** the key and the function that fetches it live together, and the key
  carries its data's type, so reading an exact entry, such as the detail, is type-checked against what it holds.
- **How a save shows wherever the movie appears.**
    - _Invalidate and refetch every movie list after a save:_ the lists are TMDB-backed and expensive to refetch, and
      a refetched grid can shift under the reader.
    - _Patch every cached copy in place,_ the cache route of TanStack Query's optimistic updates: an infinite list's
      next-page load builds its result from the pages it held when the load started, so a load that lands after a save
      undoes the save on every loaded page. Re-applying saves after each overlapping load needs a record of the saves,
      which is the chosen design with extra steps; cancelling loads before a save would change the grids' paging,
      which this work leaves alone.
    - **Show each movie's payload overlaid by this tab's saves of it (chosen),** the UI route: the saves are kept in
      TanStack Query's mutation cache and read with `useMutationState`, so no list or detail entry is written and no
      load can undo a save (Decision 4).
- **What a failed save restores.** _A snapshot from before the save, or the fields it changed:_ a queued save's
  "before" value is the optimistic value of the save ahead of it, so two queued saves that both fail leave a value the
  server never held. **Nothing (chosen):** a failed save drops out of what is shown.
- **Ordering saves of one movie.** _Disabling a control while its own save is pending_ (what `MovieCard` does today)
  doesn't cover Undo, which saves from a toast. **Saves of one movie run one at a time, in the order they were made
  (chosen)**, through TanStack Query's mutation scope keyed by TMDB ID, so the server applies them in the order they
  show.
- **The movie detail page.** _Leave it for the detail redesign:_ the page would keep its two effect fetches and its own
  save beside the shared hook until then. _An interim query for the user state alone, by TMDB ID:_ the separate fetch
  ADR-027 rules out. **Move the detail page's movie onto a query now (chosen, Owner 2026-11-11)**, reading its user
  state from the payload; the redesign builds on the query.
- **Clearing one user's data.** _The user's ID in every key:_ every key carries it, and the previous user's data stays
  in memory until garbage collection. **Reset every query except the session, and clear this tab's saves, when the
  signed-in user changes (chosen).**
- **The Library read.** _An infinite query over page numbers now:_ nothing scrolls the Library yet; the screens that
  will decide it. **A plain query keyed by its full parameter set (chosen).**
- **Undo.** _Left to the core user-movie screens._ **Added to the watchlist toast now (chosen, Owner 2026-11-11)**, as
  the opposite save through the same hook.

## Decisions

### 1. Queries come from one factory of query options

One module builds every query's options with TanStack's `queryOptions`: its key and the function that fetches it.
The keys cover movie lists (by view and parameters), a movie's detail (by TMDB ID), the Library (by its full parameter
set) and the session. Because each key carries its data's type, reading an exact entry, such as the detail, is
type-checked against what that entry holds. The browse grids take their keys from the factory, keep their own fetchers
(Scope Boundary) and keep their meaning: `VirtualizedMovieGrid` and `SequentialMovieGrid` keep separate caches, as
today. Their scroll positions are keyed by `useScrollPersistence` from the route's source, query and browse
parameters, not the query key, so nothing there changes.

_ADR:_ covered by ADR-027 (keys from one key factory). Building full query options rather than bare keys is `none`, a
tactical choice.

### 2. Client defaults: retries and refetching

Queries retry twice on a network error or a 5xx response, and never on a 4xx: `apiClient`'s response interceptor
already renews the token and retries a 401 itself. Mutations never retry. The existing defaults stay: data stale after
five minutes, kept thirty, and no refetch on window focus or reconnect. No query keeps its previous data across a key
change: a new key shows its loading state, as the pages do today. Each query passes TanStack's `signal` to its
request, so a superseded or unmounted read is aborted; the grids' fetchers keep their own `{ request, cancel }` shape
(Scope Boundary).

`apiClient`'s "Server error" toast takes a fixed `id`, so a retried read that fails again updates the toast already
showing instead of stacking another (the toaster replaces a toast created with an `id` it already shows). The grids,
which already retry, stop stacking it too.

_ADR:_ `none`: tactical choices.

### 3. The movie detail page reads through a query

The detail page's movie is a query on its detail key, and its user state is the payload's `user_movie_data`, shown
through the save hook's overlay (Decision 4). `useApiRequest`, `useMovieDetail` and `useUserMovieData` are removed, and
with them the frontend's only read of `GET /user-movie-data/{tmdb_id}` (`getUserMovieDataByTmdbId`); the route itself
stays in the API. "Not found" is the query's 404 status, not a match on the error text. The page's layout doesn't
change.

_ADR:_ covered by ADR-027, whose Decision reads every movie's user state from the detail payload. Its Status named the
detail redesign for this page; this change moves it, so ADR-027 takes a dated amendment saying the detail query moved
with this change, so that the page reads its user state from a cached payload and saves through the shared hook. Its
Status names this change as the move, with the end-to-end watchlist test its Decision names still to come.

### 4. One save hook changes a user's movie data

One hook saves any field of a user's movie data through `PATCH /user-movie-data/{tmdb_id}` (`saveUserMovieData`). It
replaces `useMovieActions`, `useUserMovieData`'s `update` and `movieInteractionService`, including its four
placeholder functions that only reject.

**What a movie shows.** Wherever a movie's user state appears, it is the movie's payload (`user_movie_data` from the
list page or detail entry that holds it), overlaid by the record of its latest successful save in this tab, then by
the fields of its saves still pending, in the order they were made. One hook applies this overlay, and anything that
shows a movie's user state reads it through that hook: a payload read directly can be stale for a movie saved in this
tab. The value a control sends next, such as the watchlist toggle's opposite, comes from the shown state, never from
the payload alone.

**A save:**

- **shows at once,** as a pending save, wherever the movie appears;
- **runs after any earlier save of the same movie** has settled (Alternatives);
- **on success,** becomes the movie's latest successful save, so its record, including fields the server derives
  (such as clearing the watched date when a movie is marked unwatched), is what shows; and invalidates the Library
  queries, whose membership and order come from the database. It writes nothing into movie lists or the detail entry,
  so no list is refetched and no list's next-page load can undo it;
- **on failure,** drops out of what is shown, which falls back to the movie's latest successful save or its payload,
  and shows the error toast. A save refused for the save limits (429) fails like any other.

Saves are kept in TanStack Query's mutation cache with no garbage-collection time (`gcTime: Infinity`): by default a
settled save is removed five minutes after nothing observes it, and a grid kept mounted would then show its stale
payload again. They are cleared the moment the signed-in user changes (Decision 7), a sign-out included, whose query
reset alone waits: a save still in flight then drops out of what is shown, and a save still queued never runs.
Clearing doesn't stop a save already running, so a save's success and failure work checks first that no change of user
has happened since it started, and does nothing if one has: no toast, no Undo and no Library invalidation. The session
version alone can't tell it, since only sign-out and a password sign-in advance it (`invalidateAuthSession`). Each
save's toast takes an id of its own, and the same change dismisses the save toasts still showing, so an Undo offered
before it can't save after it; other toasts, such as the server-error toast, stay.

Each of these belongs to the save, not to the control that started it, so a save finishes the same way after its card
has scrolled out of the virtualized grid or unmounted, and Undo works from a toast whose card is gone. TanStack Query
runs the callbacks passed to a `mutate` call only while the calling component is mounted, so this work goes in the
mutation's own options.

A watchlist save's success toast reads "Added to watchlist" or "Removed from watchlist", with an Undo action that saves
the opposite value through the same hook; Undo's own save shows the same toast without a further Undo. One click runs
Undo once: the toast renderer (`renderToast` in `toaster.tsx`) stops passing the action's `onClick` to
`Toast.ActionTrigger`, whose own trigger props already call it, so the two handlers no longer both run. The detail
page and the cards use the same hook, so the detail page's watchlist button gains the toasts the cards already show.

_ADR:_ covered by ADR-027 as amended: one mutation hook whose optimistic update shows over the payloads, with a failed
save dropping out as its rollback. The dated amendment records the overlay and why the cache route doesn't hold up
against infinite lists. Ordering saves by movie and keeping them until a change of user are `none`: tactical mechanics.
Undo and the toasts are `none`: tactical interface choices.

### 5. Every control of a movie reads its state through the shared hook

`MovieCard`'s private copy (`localWatchlistState`) goes. The card shows its movie's state through the save hook's
overlay, over the payload in the cached page the grid passes it; the hook's subscription to the saves re-renders the
card whatever its memo comparison, and a card remounted mid-save still shows the save. Controls stay enabled while a
save is pending: a second click saves again, queued behind the first and computed from the shown state, so a quick
double toggle sends `true` then `false` and ends at `false`. The card's `disabled={isUpdating}` goes, and the detail
page's watchlist button shows no loading state while a save is pending, since Chakra's `loading` disables a button.

_ADR:_ covered by ADR-027 as amended (Decision 4).

### 6. The watchlist page reads the Library through a query

`Watchlist` reads `GET /user-movie-data/movies` through a Library query, keyed by every parameter it sends. It keeps
its interim display: `watchlist=true`, the first page at a `page_size` of 100, as a text list. The query runs only for
a signed-in user, and every save invalidates it (Decision 4).

_ADR:_ `none`: temporary, until the Library screens replace this page.

### 7. The session is a query, and a change of user clears the cache

The session query holds the signed-in user's profile, or `null` when nobody is signed in.

- **Its read:** with a stored access token, it renews an expired token through the shared `refreshAccessToken`, then
  reads the profile (`getUserProfile`); without one, it reads allauth's session endpoint, as `checkOAuthSession`
  does. Any failure other than a cancellation or a changed session version reads as nobody signed in, clearing stored
  tokens on the password path, as `getUserDetails` and the mount check do today. It doesn't retry, never goes stale,
  and doesn't refetch on mount or focus: only the writers below change it.
- **The status** derives from it: a profile is `authenticated`, `null` is `anonymous`, and before the first read
  completes it is `authenticated` when the stored credentials sign the user in at once (a current access token and
  the stored sign-in flag, as `useAuth`'s initial state decides today), otherwise `resolving`. `useAuth`'s `status`,
  `isAuthenticated`, `user`, `login`, `logout` and `register` keep their shapes, so `AuthContext`'s consumers don't
  change.
- **Its writers** each cancel any session read in flight first: while the query holds no data, TanStack Query joins a
  new read to the one in flight rather than starting another. Then a password sign-in, after storing the new token,
  reads the session afresh; the OAuth callback writes the provider's user; sign-out invalidates the session version
  (`invalidateAuthSession`) and writes `null`; a failed renewal, at load or in the 60-second check, writes `null`. A
  read started under an earlier session version never lands (`getAuthSessionVersion`).
- **What stays an effect:** the 60-second renewal, which ADR-027 excepts because it renews a credential rather than
  reading data a page shows; and the OAuth callback's detection and redirect, which reacts to navigation and reads the
  session through the query.
- **A change of user clears the cache.** When the status moves between `authenticated` and `anonymous`, in either
  direction, or the profile's user changes from one user to another, every query except the session is reset, this
  tab's saves are cleared and their toasts dismissed (Decision 4), and what is on screen refetches. Lists cached while
  signed out carry no user state, so signing in needs this as much as signing out. Stored credentials that sign the
  user in at once count: if the session's first read then finds nobody signed in, the status moves from
  `authenticated` to `anonymous`, and the lists fetched with those credentials are cleared. A sign-in, by password or
  through the OAuth callback, is always a change, whatever the status was: one completed while the first session read
  was still in flight would otherwise keep lists fetched with no user. Otherwise the move out of `resolving` clears
  nothing: lists fetched meanwhile already carried whatever user the server saw, by bearer token or session cookie.
  That rests on the prerequisite in Unknowns. A profile arriving for a user already shown as signed in is not a change.
- **Sign-out's query reset waits for its sign-out request.** Its status reads `anonymous` at once, and that is the
  change of user: the saves are cleared and their toasts dismissed then. Only the query reset waits until its sign-out
  request (`authService.logout`, or allauth's session DELETE for a provider user) has settled, whether it succeeded or
  failed. Until the request settles a provider user's session cookie still identifies them, so a page still mounted
  during the navigation to sign-in would refetch the previous user's data and cache it as signed out. The waiting reset
  runs even if someone has signed in meanwhile: it touches only queries, so that user's saves stay, and their screen
  loads again from its first page. Every other change resets at once.

Sign-in, registration, email verification and the password reset requests stay direct calls: they are commands, not
data a page reads from the cache, and only sign-in and sign-out touch the cache, through the session.

_ADR:_ covered by ADR-028 (the session onto TanStack Query) and by ADR-027 as amended: its renewal exception, and
clearing a user's data on every change of signed-in user, sign-in included, which the dated amendment records beside
the sign-out its Consequences name. ADR-028's Status names this change for the session query. Keeping the auth
commands as direct calls is `none`: a tactical reading of the frontend data rule.

### 8. Tests mock the network

Every test this change touches mocks the network with MSW, queries by role and accessible name, and interacts through
`userEvent`, with the real query client from `TestProviders`. `MovieDetail.test.tsx` moves off its four `vi.mock`s
(`useMovieDetail`, `useUserMovieData`, `useAuth`, `movieService`). The save hook, the card, the detail page, the
watchlist page and the session have behavior tests, including:

- a failed save; two queued saves of one movie that both fail, and two where the first succeeds and the second fails;
- a list's next page landing after a save, with the save still showing;
- Undo, counting one save per click, and a save that settles after its card unmounted;
- signing out and in, and a password sign-in completed during the first session read;
- a sign-out whose request is held: its query reset waits, a save settling meanwhile shows no toast, and a sign-in
  during the wait keeps its saves and shows its own data after the late reset;
- stored credentials the session's first read rejects, with a save settling after it that shows no toast and
  refetches no Library;
- a save's toast, gone after a change of user, and a 5xx on the first session read after stored credentials signed the
  user in at once, which signs them out and leaves its "Server error" toast showing.

`TestProviders` turns retries off, so the client's retry rule (Decision 2) has its own test against
`lib/queryClient`'s defaults. `useApiRequest.test.ts`, `useMovieActions.test.ts` and `useUserMovieData.test.ts` go
with their hooks, and `useAuth.test.tsx` keeps its behavior cases against the query-backed hook. The grid tests, which
mock `useInfiniteMovies` and the collection context, are left as they are (Scope Boundary).

_ADR:_ `none`: it follows the testing rules.

### 9. Reference documents follow the code

The technical overview's Data Fetching section, which presents `useApiRequest`, describes queries from the factory and
the save hook instead. The authentication strategy's Token Refresh Flow, which says moving authentication state onto
TanStack Query is separate, and its Authentication Hook section, which describes the profile-loading effect and
`getUserDetails`, describe the session query.

_ADR:_ `none`: documentation of the decisions above.

### Boundary

This stays one change: the save, the queries and the session are one concern, since a change of user clears the
queries and the saves together, and the session query alone is too small to stand on its own. The forecast is about
2,500–4,000 changed lines in four or five phases, which one review of the whole change can hold.

_ADR:_ `none`: how the work is delivered.

**ADRs this work delivers:** no new ADR. A dated amendment to ADR-027 recording three things: the detail query moved
with this change (Decision 3); a movie's user state shows over the payloads with this tab's saves, because an infinite
list's next-page load undoes a patch in place (Decision 4); and every change of signed-in user, sign-in included,
clears the cache (Decision 7). The Status lines of ADR-027 and ADR-028 name this change.

## Unknowns and Assumptions

- **The API this builds on.** The frontend is read as the user-movie data change leaves it, before that change merges;
  this draft is re-checked against `main` once it does. Its minimal frontend adaptation (one PATCH, the read by TMDB
  ID, the watchlist through the Library) is what Decisions 3 to 6 replace.
- **A prerequisite: renewing an expired token before a request.** The public movie routes find the user through
  `get_current_user_optional`, which treats an expired Bearer token as no user rather than answering 401, and
  `apiClient`'s request interceptor attaches the stored token without checking its expiry. So a list or detail read
  sent with an expired token carries no user state: at load for a returning password user, and in the minute after a
  five-minute token expires until `useAuth`'s 60-second check renews it (inferred from code, not run). A separate fix
  makes a request carrying an expired stored token renew it before it is sent. This work's build starts only once that
  fix and the user-movie data change are both on `main`; Decision 7's rule that leaving `resolving` clears nothing
  rests on it.
- **A save shadows another tab's later change.** A movie saved in this tab shows that save's record over its payload
  until the page reloads or the signed-in user changes, so a later change to the same movie from another tab or device
  doesn't show here until then. Accepted.
- **Concurrent work.** The token fix also edits `apiClient.ts`, where Decision 2's toast changes; whichever lands
  second rebases onto the other. The palette work, which also changed `MovieCard.tsx`, `MovieDetail.tsx` and the test
  render helpers, is already on `main`, so this work builds on it.
- **Session failure semantics** stay as they are: a network failure reading the session signs a password user out and
  clears stored tokens. A failed sign-out request leaves the server's session live, so a provider user's cookie still
  answers later reads. A sign-out in one tab doesn't reach another tab's state. None of these changes here.

## Scope Boundary (Won't Do)

- **The grids' data layer:** their fetchers and `{ request, cancel }` shape, `useMovieCollectionState`, the two views'
  separate caches, and their tests' mocking of `useInfiniteMovies`. Restoring browse positions past the first pages
  after a reload, and moving the grid tests onto MSW, go with the core user-movie screens.
- **The Library and watchlist screens,** sort controls, the watched, liked, rating and review controls, and the Log
  form. They build on the save hook and the Library query.
- **The detail page's redesign** and layout.
- **Drag-and-drop and Next Up.**
- **The end-to-end watchlist spec,** written after this change against the new hooks (ADR-027).
- **Special handling of a refused save (429)** beyond the ordinary failure.
- **Renewing an expired token before a request,** the separate fix this work's build waits for.
- **Authentication's error shapes,** cross-tab session sync, and the development page `TestLogin`.

**Success signal:** in a frontend test with the network mocked, toggling a card's watchlist control twice sends `true`
then `false`; the card and the movie's detail page show the same state without any movie list being refetched, and
still do after the list's next page lands; a failed save, or two queued saves that both fail, leave the server's value
showing; and once a sign-out's request has succeeded, no cached query or save holds the previous user's data.
