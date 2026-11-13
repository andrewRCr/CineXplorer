# PRD: Frontend Server State

**Type:** Technical
**Form:** detailed · RFC
**Class:** Heavy
**Status:** Complete
**Completed:** 2026-11-12
**Created:** 2026-11-11

---

## 1. Introduction / Context

The frontend's rules say server data is read through TanStack Query with keys from one key factory, changed through
mutations that update or invalidate the cache, and never fetched in `useEffect`. Today only the browse grids follow
them, through `useInfiniteMovies`. With the user-movie data API on `main` (§ 6, Prerequisites), the frontend still
breaks that rule in four places, and the breaks show as wrong state on screen:

- **Cached cards go stale after a save.** `MovieCard` keeps its own copy of the watchlist flag
  (`localWatchlistState`) and saves through `useMovieActions` and `toggleMovieWatchlist`. Nothing writes the result
  back into the cached list pages `useInfiniteMovies` holds (nothing in the frontend writes to the query cache), so
  another grid, or the same card remounted after navigating back, reads the pre-save state from the cache until the
  list refetches. The detail page fetches afresh on every visit and saves through `useUserMovieData`'s `update`, which
  writes only that hook's local state, so a save made there leaves every cached card stale.
- **The detail page fetches twice, by hand.** Its movie comes from `useMovieDetail`, a wrapper over `useApiRequest`,
  which fetches in an effect. Its user state comes from a second effect fetch in `useUserMovieData`
  (`getUserMovieDataByTmdbId`, `GET /user-movie-data/{tmdb_id}`), although the detail payload already carries
  `user_movie_data` (`get_movie_detail` returns `enrich_single_movie_with_user_movie_data`'s result). The page detects
  "not found" by matching `404` or `not found` in the error text.
- **The watchlist page and the session fetch in effects.** `Watchlist` reads the Library (`getUserMovies`) in an
  effect. `useAuth` reads allauth's session (`checkOAuthSession`) and the password user's profile (`getUserDetails`,
  which calls `getUserProfile`) in effects.
- **Signing in or out leaves the previous user's data cached.** `useAuth`'s `logout` never touches the query cache, so
  the grids' cached pages keep the previous user's flags. Lists cached while signed out carry no user state
  (`user_movie_data` is `null` for an anonymous request), and signing in leaves them that way.

Two smaller problems ride with them. `queryClient` (`lib/queryClient.ts`) retries every failed query twice, a 404 or a
401 included. And the watchlist toast has no Undo: it was deferred until saves could keep cards in sync, since an Undo
would have bypassed the card's private copy. With that copy gone, it can be built.

The core user-movie screens (the watched, liked, rating and review controls, the Log form, the Library) build on the
queries and the save this change introduces, so it lands before them.

## 2. Goals

1. **One state per movie.** Wherever a movie's user state shows (a card in either grid, its detail page), it is the
   same; a save made in this tab shows there at once, with no movie list refetched, and still shows after a list's
   next page loads.
2. **Only values the server held.** A failed save, or several queued saves that all fail, leave the last value the
   server confirmed showing; saves of one movie reach the server in the order they were made.
3. **No previous user's data.** After the signed-in user changes, no cached query or kept save holds the previous
   user's data (for a sign-out, once its request has settled and the sign-in page has loaded afresh), and no save made
   before the change shows a toast, offers Undo or refetches the Library after it.
4. **Server data through queries.** The movie detail, the watchlist page and the session are read through queries
   whose options come from one factory, and no component or hook fetches server data in an effect: no effect calls
   `apiClient`, `fetch` or a service that reads or changes server data, apart from the 60-second token renewal, which
   renews a credential (D7). An effect may still drive a query, as the virtualized grid's next-page effect does, and
   logging is not server data.
5. **Undo on the watchlist toast,** one save per click, working from a toast whose card is gone.
6. **Tests at the network.** Every test this change touches mocks the network, not the frontend's own hooks and
   services.

## 3. Non-Goals

- **The grids' data layer:** their fetchers and `{ request, cancel }` shape, `useMovieCollectionState`, the two views'
  separate caches, and their tests' mocking of `useInfiniteMovies` and the collection context stay as they are.
  Restoring browse positions past the first pages after a reload, and moving the grid tests onto MSW, are not part of
  this change.
- **No new screens or controls:** no Library or watchlist screens, sort controls, watched, liked, rating or review
  controls, or Log form. They build on the save and the Library query. The watchlist page keeps its interim text
  list (D6).
- **The detail page's redesign and layout.** Its layout doesn't change; its placeholder "Mark as Watched" and "Rate
  Movie" buttons stay placeholders.
- **No drag-and-drop or Next Up.**
- **No end-to-end watchlist spec.** It is written after this change, against the new hooks.
- **A refused save (429) gets no special handling;** it fails as any save does.
- **Renewing an expired token before a request** is a prerequisite delivered separately (§ 6), not part of this
  change.
- **Authentication's error shapes, sync of the session between tabs, and the development page `TestLogin`** stay as
  they are.
- **Signed-out controls keep today's behavior.** A card's watchlist control stays enabled for a signed-out visitor,
  whose save fails with the error toast; the detail page's buttons stay disabled for them.

## 4. Proposed Design

### D1. Queries come from one factory of query options

One module, `frontend/src/lib/queries.ts`, builds every query's options with TanStack's `queryOptions`: its key and
the function that fetches it. Because each key carries its data's type, reading an exact entry, such as the detail, is
type-checked against what it holds. The keys:

| Key | Holds | Fetched by |
| --- | --- | --- |
| `['movies', 'virtualized', source, query, browseParams]` | `VirtualizedMovieGrid`'s pages | the grid's own fetcher |
| `['movies', 'infinite', source, query, browseParams]` | `SequentialMovieGrid`'s pages | the grid's own fetcher |
| `['movies', 'detail', tmdbId]` | one movie's `MovieDetail` payload | `fetchMovieDetail` (D3) |
| `['library', params]` | one Library page (`MovieListResponseSchema`) | `getUserMovies` (D6) |
| `['session']` | the signed-in user's profile, or `null` | D7's read |

The browse grids take their keys from the factory and keep their own fetchers (Non-Goals), with the same key values as
today, so `VirtualizedMovieGrid` and `SequentialMovieGrid` keep separate caches. Their scroll positions are keyed by
`useScrollPersistence` from the route's source, query and browse parameters, not the query key, so nothing there
changes.

### D2. Client defaults: retries, refetching and cancellation

`queryClient`'s defaults change:

- **Retries.** A query retries twice, with the existing backoff, only when its request got no response and was not
  cancelled (a network error), or got a 5xx response. It never retries a 4xx (`apiClient`'s response interceptor
  already renews the token and retries a 401 itself), a cancellation (any error `axios.isCancel` accepts, including
  the `CanceledError`s `apiClient` throws when the session changes), or any other error. Mutations never retry.
- **Kept defaults:** data stale after five minutes, kept thirty, and no refetch on window focus or reconnect.
- **No previous data across a key change:** no query keeps its previous data when its key changes, so a new key shows
  its loading state, as the pages do today.
- **Cancellation.** A query built by the factory aborts its request when TanStack Query aborts the read (a superseded
  or unmounted read): its query function links the `signal` it receives to the `cancel` of the `{ request, cancel }`
  pair `HttpService` returns, so `HttpService`, which the grid fetchers share, is unchanged. The session read (D7)
  passes its query's `AbortSignal` through provider discovery and `authService.getUserProfile` to the profile API
  request. That originating signal remains available to both interceptor paths and their renewal continuations,
  including after the request has already received a 401. They check caller cancellation before starting recovery,
  after awaiting renewal and before credential clearing, redirect or replay. A cancelled caller rejects as
  cancellation without those effects; its read cannot publish a profile or anonymous result. Cancelling one caller
  does not abort the shared renewal another current caller may still need.

`apiClient`'s "Server error" toast takes a fixed `id`, so a retried read that fails again updates the toast already
showing instead of stacking another: the toaster updates a toast in place when it is created with an `id` it already
shows (`create` in `@zag-js/toast`'s store). The grids, which retry under the same defaults, stop stacking it too.

### D3. The movie detail page reads through a query

The detail page's movie is a query on its detail key, and its user state is the payload's `user_movie_data`, shown
through the save hook's overlay (D4). "Not found" is the query's 404 status (`getErrorStatus`), not a match on the
error text; any other failure shows the page's error state as today. `useApiRequest`, `useMovieDetail` and
`useUserMovieData` are removed, and with them the frontend's only read of `GET /user-movie-data/{tmdb_id}`
(`getUserMovieDataByTmdbId`); the route itself stays in the API. The page's layout doesn't change.

The page's watchlist button shows the overlay's state, saves through the save hook (so it gains the toasts and Undo
the cards show, D4), and shows no loading state while a save is pending (D5). It stays disabled unless the status is
`authenticated`, as today.

### D4. One save hook changes a user's movie data

One hook, `useUserMovieState(tmdbId, payload)`, gives a movie's shown state and a `save(changes)` function. Every
save goes through `PATCH /user-movie-data/{tmdb_id}` (`saveUserMovieData`). The save's mutation options are defined
once, with TanStack's `mutationOptions`, and the hook and Undo both run saves through them. It replaces
`useMovieActions`, `useUserMovieData`'s `update` and `movieInteractionService`, including its four placeholder
functions that only reject (`toggleMovieWatched`, `toggleMovieLiked`, `setMovieRating`, `setMovieReview`).

**What a movie shows.** Wherever a movie's user state appears, it is built in this order:

1. the movie's payload: `user_movie_data` from the list page or detail entry that holds it; when that is `null` (the
   user has no record for the movie, or nobody is signed in), a record with no state: every flag false, and
   `user_rating`, `user_review` and `watched_at` null;
2. replaced whole by the record the server returned for the movie's latest successful save in this tab, if any;
3. overlaid by the fields of its saves still pending (running or queued), in the order they were made.

The hook applies this overlay, and anything that shows a movie's user state reads it through the hook: a payload
read directly can be stale for a movie saved in this tab. The value a control sends next, such as the watchlist
toggle's opposite, comes from the shown state, never from the payload alone.

**A save:**

- **shows at once,** as a pending save, wherever the movie appears;
- **runs after any earlier save of the same movie** has settled: saves share a TanStack Query mutation scope keyed by
  the TMDB ID, so the server applies them in the order they show;
- **on success,** becomes the movie's latest successful save, so its record, including fields the server derives
  (marking a movie unwatched clears its watched date), is what shows; and invalidates the Library queries (the
  `['library']` prefix), whose membership and order come from the database. It writes nothing into movie lists or the
  detail entry, so no list is refetched and no list's next-page load can undo it;
- **on failure,** drops out of what is shown, which falls back to the movie's latest successful save or its payload,
  and shows an error toast: "Failed to update watchlist" for a save of the watchlist flag, as today, and "Failed to
  save changes" for any other. A save refused for the save limits (429) fails like any other.

**Saves are kept until the signed-in user changes.** Saves live in TanStack Query's mutation cache with no
garbage-collection time (`gcTime: Infinity`): by default a settled mutation is removed five minutes after nothing
observes it, and a grid kept mounted would then show its stale payload again. They are cleared the moment the
signed-in user changes (D7), a sign-out included. A save still running then drops out of what is shown, and a save
still queued never runs: clearing the mutation cache removes it from its scope, so nothing starts it.

**A change of user stops a save's work.** Clearing doesn't stop a save already running, so its success and failure
work first checks that the signed-in user hasn't changed since the save was made, and does nothing if it has: no
toast, no Undo and no Library invalidation. The check reads the **change count**, a number the session module keeps
and advances in the same step that clears the saves (D7). A save records the count when it is made, a queued save
included, by carrying it with the mutation's variables before asynchronous setup begins, and compares it when it
settles. The request's global error feedback uses that same count; an obsolete save does not dispatch if ownership
changes while its mutation setup yields.
The session version (`getAuthSessionVersion`) can't serve: sign-out and password or provider sign-in advance it
(`invalidateAuthSession`), but stored credentials the session's first read rejects and a failed renewal at the
60-second check do not.

**The work belongs to the save,** not to the control that started it, so a save finishes the same way after its card
has scrolled out of the virtualized grid or unmounted, and Undo works from a toast whose card is gone. TanStack Query
runs the callbacks passed to a `mutate` call only while the calling component is mounted, so the success and failure
work lives in the mutation's own options.

**Toasts and Undo.** A save of the watchlist flag that succeeds shows "Added to watchlist" or "Removed from
watchlist", from the server's record, with an Undo action that saves the opposite value through the same mutation
options. Undo's own save shows the same toast without a further Undo. Each toast a save shows takes an id of its own,
marking it as a save's toast and retaining its id, so a change of user removes both visible and queued save toasts
(D7) while other toasts,
such as the server-error toast, stay. One click runs Undo once: the toast renderer (`renderToast` in `toaster.tsx`)
stops passing the action's `onClick` to `Toast.ActionTrigger`, whose own trigger props already call it, so the two
handlers no longer both run.

### D5. Every control of a movie reads its state through the shared hook

`MovieCard`'s private copy (`localWatchlistState`) goes. The card shows its movie's state through
`useUserMovieState`, over the payload in the cached page the grid passes it; the hook's subscription to the saves
re-renders the card whatever its memo comparison, and a card remounted mid-save still shows the save.

Controls stay enabled while a save is pending: a second click saves again, queued behind the first and computed from
the shown state, so a quick double toggle sends `true` then `false` and ends at `false`. The card's
`disabled={isUpdating}` goes, and the detail page's watchlist button shows no loading state while a save is pending,
since Chakra's `loading` disables a button.

### D6. The watchlist page reads the Library through a query

`Watchlist` reads `GET /user-movie-data/movies` through a Library query keyed by every parameter it sends
(`watchlist=true`, `page_size=100`). It keeps its interim display: the first page as a text list, with its loading,
error and empty states. The query runs only while someone is signed in, and every successful save invalidates it
(D4).

### D7. The session is a query, and a change of user clears the cache

**The session query** (`['session']`) holds the signed-in user's profile, or `null` when nobody is signed in.

- **Its read:**
    - **On a provider's return** (the page loads on the sign-in page arriving from the provider, or with
      `useOAuthFlow`'s in-progress flag set, as the OAuth callback detects it today), it asks allauth's session
      endpoint first. When that finds the provider's user, it invalidates earlier authentication work and clears stored
      tokens, since a provider sign-in replaces any password session, and lands the user. Earlier renewal failures
      cannot redirect the new session. Without a provider user it continues below, without asking allauth again.
    - **With a stored access token,** it renews an expired token through the shared `refreshAccessToken`, then reads
      the profile (`getUserProfile`).
    - **Without one,** it reads allauth's session endpoint, as `checkOAuthSession` does.
    - Any failure other than a cancellation or a changed session version reads as nobody signed in, and on the
      password path clears stored tokens, as `getUserDetails` and the mount check do today. A read started under an
      earlier session version (`getAuthSessionVersion`) neither lands nor clears stored tokens.
- **It doesn't retry, never goes stale, and doesn't refetch on mount or focus:** only its first read and the writers
  below change it, and a reset of the other queries leaves it alone.

**The status** derives from it: a profile is `authenticated`, `null` is `anonymous`, and before the first read
completes it is `authenticated` when the stored credentials sign the user in at once (a current access token and the
stored sign-in flag, as `useAuth`'s initial state decides today), otherwise `resolving`. `useAuth`'s `status`,
`isAuthenticated`, `user`, `login`, `logout` and `register` keep their shapes, so `AuthContext`'s consumers don't
change.

**Pending provider resolution owns the session.** A provider-return read in `readSession` acquires one resolution
identity synchronously, before its first await, tied to the current authentication-session version. That identity
lasts through both allauth discovery and any password-token renewal and profile fallback, until the read returns,
fails or is canceled. Only this owning read may conclude that authentication is anonymous while resolution is
pending. The rendered status and stored credentials stay as described above; an initial `authenticated` status does
not give background password work permission to end the read.

- The authentication coordinator in `apiClient.ts` holds the active identity and version. `readSession` acquires and
  releases it; neither the API client nor the idle checker imports the session module to inspect query state. One
  shared predicate permits background password-failure handling only for the current version, with stored password
  access credentials still present, no active resolution owner and, for API work, an uncancelled originating
  request. Presence includes an expired token: expiry is when legitimate renewal failure needs handling. Read
  `getAuthTokens` at the failure-effect boundary, not an initiating-token snapshot, including again after awaited
  cancellation. The predicate governs both `refreshRequestToken` and the idle-renewal failure handler, whose
  original user-change-count guard also remains. Releasing global resolution ownership does not authorize a
  cancelled request's continuation or work whose password credentials were cleared meanwhile.
- The idle checker in `useAuth` starts no new renewal while that ownership is active. A renewal already in flight
  may settle, but its failure cannot clear credentials, cancel or replace the session query, or redirect while
  resolution is owned. The failure handler checks permission before cancellation and again after its await, alongside
  its
  existing version and user-change-count guards.
- API requests keep using the existing credentials and shared renewal. During owned resolution, renewal failure
  rejects an uncancelled waiting request with the underlying failure's status, response data and error
  classification, without clearing credentials or redirecting. It is not artificially converted to cancellation:
  the session reader's fallback must still be able to handle failure as anonymous. Actual caller cancellation
  instead rejects as cancellation under D2.
  Requests do not wait for provider discovery, because the fallback's profile read uses the same API client and
  could otherwise wait on itself. Successful current-version renewal can update the stored password token for
  fallback; provider acceptance subsequently retires that work and clears the token. Existing request errors and
  global server-error feedback retain their normal handling.
- Each API operation retains its originating request context across preparation, both interceptors and nested
  renewal: its consumed renewal budget, authentication version, cancellation signal and existing feedback policy.
  A failed renewal is terminal for that operation. Its error must not re-enter 401 recovery as a fresh operation,
  and the refresh transport's URL/configuration must never be replayed as the caller's movie/profile operation or
  supply a successful token payload to that caller. The operation gets at most its one renewal through either
  entry path. Propagate the underlying failure semantics with caller-specific attribution rather than relying on
  the nested refresh error's configuration. Shared renewal must not overwrite one caller's context with another's
  or mutate a shared error to carry whichever caller happened to settle last.
- A provider result that finds no user, or a provider request that fails without cancellation, continues through
  the password fallback under the same resolution identity. That reader may renew, read the profile, or clear
  rejected credentials and return `null` through its existing failure path. Ownership is not released between
  discovery and fallback. Before anonymous completion releases ownership, `clearAuthTokens` synchronously removes
  access credentials from both stores. For a shared renewal rejection, an API waiter handling it first is denied
  failure effects by active ownership; a waiter handling it after the reader concludes is denied by missing
  password credentials. Neither order can interrupt the reader's anonymous outcome with a redirect. Keep the
  underlying renewal failure for the reader rather than fabricating cancellation because credentials are absent.
  A successful password fallback retains credentials, so a subsequent current-password-session failure still gets
  ordinary handling, including the API client's expired-session redirect. Preserve `refreshAccessToken`'s check
  for current version and credential presence immediately before its synchronous token write; it cannot recreate
  credentials after the reader cleared them. This uses existing credential state, not another epoch or waiter log.
- The session query passes its cancellation signal into `readSession` and the read's provider/profile requests.
  Cancellation rejects the read as cancellation, retires the identity and prevents its later response from
  clearing credentials, changing user ownership or publishing a profile or `null`; canceled provider discovery
  must not become password fallback. Check cancellation and originating authentication version after asynchronous
  boundaries and before these effects. The profile request and its renewal continuation keep checking their
  originating signal after ownership is released; a late renewal failure cannot clear credentials or redirect
  before the reader sees it. This cancels that caller, not the shared renewal or unrelated current-session work.
  Releasing an identity affects only that identity, so an old completion cannot release a newer read's ownership.
- Explicit successful password sign-in and explicit sign-out supersede resolution through `invalidateAuthSession`
  before replacing credentials or session data. Provider acceptance first checks its originating version and
  cancellation, then synchronously invalidates old authentication work, clears password tokens, runs the
  change-of-user step and returns the provider profile, without another await or rejecting its own version change.
  Authentication invalidation retires the previous resolution identity as well as renewal work. No state is
  persisted or synchronized between tabs.

**Its writers** each cancel any session read in flight first: while the query holds no data, TanStack Query joins a
new read to the one in flight rather than starting another, and a read landing after a write would overwrite it.

- **A password sign-in,** after `authService.login` succeeds and the new token is stored (as today, after
  `invalidateAuthSession` and clearing both storages), reads the session afresh, and `login` resolves once that read
  has landed.
- **Sign-out** invalidates the session version (`invalidateAuthSession`), clears stored tokens and writes `null`, then
  sends its sign-out request, and once that has settled loads the sign-in page afresh (below).
- **A failed renewal at the 60-second check** writes `null` only while the authentication version and change count
  captured at its start remain current, password access credentials remain present and no provider-resolution
  owner is active. It checks these conditions before and after canceling a session read. It cannot end pending
  provider discovery, clear a newer provider session or act after authoritative anonymous completion; outside
  owned resolution, a current password user's failed renewal still signs them out.

**A change of user** is one step in the session module: it advances the change count (D4), clears the saves,
dismisses the save toasts still showing (D4), and resets every query except the session, so what is on screen
refetches. It runs at exactly these points, which are every way the signed-in user can change in this tab:

| When | Runs the step |
| --- | --- |
| A password sign-in stores its new token | always; its query reset waits for its fresh session read to land |
| The session's first read lands the provider's user on a provider's return | always |
| Sign-out writes `null` | always; the sign-in page then loads afresh once the sign-out request settles (below) |
| A failed renewal at the 60-second check writes `null` | always |
| The session's first read lands | only when it finds nobody while a token is stored, and so clears it |

A sign-in is always a change, whatever the status was: one completed while the first session read was still in
flight would otherwise keep lists fetched with no user. The password sign-in runs the step when it stores its new
token, so no save or Undo from before it can act under the new user's token; its query reset waits until its fresh
read has landed, whatever it found, so the lists refetch with whatever credentials that read left (a failed read
clears the new token). A first read that clears stored tokens is a change whatever the status was: lists fetched
before it were sent with those tokens, renewed through the shared renewal when expired, and carried their user, and
the requests after it carry none. Leaving `resolving` otherwise clears nothing: lists fetched meanwhile already
carried whatever user the server saw, by bearer token or session cookie, and later requests carry the same, which
rests on the token-renewal prerequisite (§ 6). A profile arriving for a user already shown as signed in is not a
change. Outside owned provider resolution, a current-session renewal that fails before a request loads the sign-in
page afresh instead (§ 6), which drops the cache with the page, so it needs no step.

**Sign-out loads the sign-in page afresh once its request settles.** Its status reads `anonymous` at once, and that is
the change of user: the step runs then, and the app moves to the sign-in page. Today sign-out ends on the home page
instead, because `NavBarUserMenu`'s `handleLogout` navigates home after calling `logout`; that navigation goes, so
`logout` alone decides where sign-out ends. Once the sign-out request (`authService.logout`, or allauth's session DELETE
for a provider user) has settled, whether it succeeded or failed, sign-out loads `/login?signed_out=true` afresh, and
the sign-in page, when it finds nobody signed in, shows the "You've been logged out" toast from that parameter, as it
shows the `session_expired` notice; the toast sign-out shows today would not survive the page load. Until the request
settles a provider user's session cookie still identifies them, so anything refetched meanwhile could carry their data
under the signed-out state; the page load drops it with the rest of the tab's memory. The load happens whatever happened
during the wait: a password sign-in completed meanwhile keeps its stored token through it. After a failed request the
server's session is still live, so a provider user reads as signed in again once the page has loaded, which matches the
server, and sees no signed-out notice; nor does someone whose password sign-in completed during the wait. The sign-in
page sends either on, as it does any signed-in visitor.

**What stays an effect:** only the 60-second renewal fetches in an effect, calling the shared renewal itself, which
ADR-027 excepts because it renews a credential rather than reading data a page shows. The OAuth callback's handling
stays an effect but fetches nothing: it reacts to the session's first read on a provider's return, whose landing runs
the step where the table above says. When that read lands the provider's user, the callback clears the provider flags
(`oauth_in_progress`, `oauth_start_time`), shows the welcome toast and redirects to the page the user asked for; when
it lands nobody, the callback clears the flags so the sign-in form shows, as today. A provider error in the URL
redirects as today. An effect that drives a query, as the virtualized grid's next-page effect does, and logging, which
can post its entries to the server, are not fetches of server data.

**Commands stay direct calls.** Sign-in, registration, email verification and the password reset requests are
commands, not data a page reads from the cache, so they stay direct calls; only sign-in and sign-out touch the cache,
through the session.

### D8. Tests mock the network

Every test this change touches mocks the network with MSW, queries by role and accessible name, and interacts through
`userEvent`, with a real query client from `TestProviders`. `MovieDetail.test.tsx` moves off its four `vi.mock`s
(`useMovieDetail`, `useUserMovieData`, `useAuth`, `movieService`), and `MovieDetail.styles.test.tsx`, which already
renders the page over MSW, keeps passing. The save hook, the card, the detail page, the watchlist page and the session
have behavior tests, including:

- a failed save; two queued saves of one movie that both fail, and two where the first succeeds and the second fails;
- a list's next page landing after a save, with the save still showing;
- Undo, counting one save per click; Undo from a toast whose card has unmounted; and a save that settles after its
  card unmounted;
- signing out and in, and a password sign-in completed during the first session read;
- a sign-out whose request is held: a save settling meanwhile shows no toast, and the sign-in page loads afresh only
  once the request settles, whether it succeeded or failed; and the sign-in page shows the signed-out notice from
  `signed_out=true` only when nobody is signed in;
- stored credentials the session's first read rejects, with a save settling after it that shows no toast and
  refetches no Library; and an expired stored token whose renewal succeeds while the profile read fails, after which
  the lists refetch without the user and the saves are cleared;
- a failed renewal at the 60-second check, which refetches the lists and clears the saves; a password sign-in whose
  fresh read fails, whose saves clear when its token is stored and whose lists refetch after the read without the
  token; and a provider's return whose first read finds the provider's user, which clears a stale stored token and
  refetches the lists fetched while resolving, with allauth's session endpoint read once;
- a save's toast, gone after a change of user; and a 5xx on the first session read after stored credentials signed
  the user in at once, which signs them out and leaves its "Server error" toast showing.

`TestProviders` turns retries off, so the client's retry rule (D2) has its own test against `lib/queryClient`'s
defaults. `useApiRequest.test.ts`, `useMovieActions.test.ts` and `useUserMovieData.test.ts` go with their hooks, and
`useAuth.test.tsx` keeps its behavior cases against the query-backed hook. The grid tests, which mock
`useInfiniteMovies` and the collection context, are left as they are (Non-Goals). The end-to-end `sign-in.spec.ts`,
which signs out through the user menu, follows sign-out to the sign-in page: its check after sign-out looks for the
navigation bar's Login button, since the sign-in page also has the form's.

### D9. Reference documents follow the code

- The technical overview's Data Fetching section, which presents `useApiRequest` and doesn't mention TanStack Query,
  describes the queries from the factory and the save hook instead.
- The authentication strategy's Token Refresh Flow, which says moving authentication state onto TanStack Query is
  separate, and its Authentication Hook section, which describes the profile-loading effect and `getUserDetails`,
  describe the session query and the change of user.

## 5. Design Decisions

- **D1: full query options in the factory,** over keys alone with each hook supplying its own fetch function: the key
  and the function that fetches it live together, and the key carries its data's type. _ADR:_ covered by ADR-027
  (keys from one key factory); building full options rather than bare keys is `none`, a tactical choice.
- **D2: retry only network errors and 5xx, and link the signal to `cancel`.** Retrying a 4xx repeats a refusal, and
  `apiClient` already handles a 401; a cancellation is deliberate. Linking TanStack's `signal` to the existing
  `cancel` is chosen over adding a `signal` parameter to `HttpService`, which the grid fetchers share. _ADR:_ `none`:
  tactical choices.
- **D3: move the detail page's movie onto a query now (Owner, 2026-11-11),** over leaving it to the detail redesign,
  which would keep its two effect fetches and its own save beside the shared hook until then, and over an interim
  query for the user state alone by TMDB ID, the separate fetch ADR-027 rules out. The redesign builds on the query.
  _ADR:_ covered by ADR-027, whose Decision reads every movie's user state from the detail payload. Its Status named
  the detail redesign for this page; ADR-027's dated amendment records that the detail query moved with this change,
  so the page reads its user state from a cached payload and saves through the shared hook.
- **D4: show each movie's payload overlaid by this tab's saves,** over:
    - invalidating and refetching every movie list after a save: the lists are TMDB-backed and expensive to refetch,
      and a refetched grid can shift under the reader;
    - patching every cached copy in place, the cache route of TanStack Query's optimistic updates: an infinite list's
      next-page load builds its result from the pages it held when the load started, so a load that lands after a
      save undoes the save on every loaded page. Re-applying saves after each overlapping load needs a record of the
      saves, which is this design with extra steps; cancelling loads before a save would change the grids' paging,
      which this change leaves alone.

  **A failed save restores nothing,** over restoring a snapshot from before it or the fields it changed: a queued
  save's "before" value is the optimistic value of the save ahead of it, so two queued saves that both fail would
  leave a value the server never held. **Saves of one movie run one at a time, in order,** over disabling a control
  while its own save is pending (what `MovieCard` does today), which doesn't cover Undo, a save from a toast. **The
  change count** marks a change of user, over the session version, which a rejected stored credential and a failed
  renewal at the 60-second check don't advance, and over checking whether the save is still in the mutation cache,
  which would need an id of each save's own to find it. **Undo is added now (Owner,
  2026-11-11),** over leaving it to the core user-movie screens, as the opposite save through the same mutation options.

  _ADR:_ the overlay is covered by ADR-027 as amended. ADR-027's Decision names one mutation hook "with an optimistic
  update and a rollback on failure" without saying where the optimistic value is kept; the overlay keeps it in the
  mutation cache and rolls back by dropping the failed save, so its dated amendment records how, and why the cache
  route fails against infinite lists, without changing what was decided. Ordering saves by movie, keeping them until
  a change of user, and the change count are `none`: tactical mechanics. Undo and the toasts are `none`: tactical
  interface choices.
- **D5: controls stay enabled while a save is pending,** over disabling them: with saves queued in order and computed
  from the shown state, a second click is a valid save. _ADR:_ covered by ADR-027 as amended (D4).
- **D6: a plain query keyed by the full parameter set,** over an infinite query over page numbers now: nothing scrolls
  the Library yet, and the screens that will scroll it decide its paging. _ADR:_ `none`: temporary, until the Library
  screens replace this page.
- **D7: reset every query except the session, and clear this tab's saves, when the signed-in user changes,** over the
  user's ID in every key, which every key would have to carry, and which leaves the previous user's data in memory until
  garbage collection. **The step runs at the writers and the first read,** over watching the session's value for
  changes, since a sign-in must count even when the status doesn't move, and a watcher would also see the sign-in's own
  write and run the step twice. **Sign-out loads the sign-in page afresh once its request settles,** over resetting at
  once, since a provider user's session cookie still identifies them until the request settles and a still-mounted page
  would refetch their data under the signed-out state, and over a reset that waits for the request, which needs rules of
  its own for what happens during the wait, such as a sign-in. The page load reuses what `apiClient` already does when a
  session expires, at the cost of a page load on sign-out. **A password sign-in's query reset waits for its fresh
  read,** so a failed read, which clears the new token, doesn't leave lists fetched with it. **Sign-out ends on the
  sign-in page,** over loading the home page afresh, where it ends today: the sign-in page already shows a notice from a
  parameter. **On a provider's return the session's first read asks allauth first,** over the callback reading allauth
  from an effect of its own, a fetch in an effect that ADR-027 doesn't except, and over the session's usual read alone,
  whose password path wouldn't ask allauth while a stale token is stored. **That read owns authentication resolution
  through its password fallback,** over guarding individual completion orderings: background failure must not cancel
  discovery, overwrite its result or redirect, whether it settles before or after the provider. Waiting all API work
  on discovery could deadlock the reader's own password-profile fallback. Its owner is independent of rendered
  status, so a current stored token can still give immediate sign-in. **The auth commands stay direct calls,** over
  wrapping them in mutations: they change no cached data but the session, which their writers set. _ADR:_ covered by
  ADR-028 (the session onto TanStack Query) and by ADR-027 as amended: its renewal exception, and clearing a user's data
  on every change of signed-in user, sign-in included, which the dated amendment records beside the sign-out its
  Consequences name. Running the step at named points, sign-out's page load and where it ends, the sign-in's waiting
  reset and the provider-return read are `none`: tactical mechanics. The callback's effect fetches nothing, so ADR-027
  keeps its one exception. Keeping the auth commands as direct calls is `none`: a tactical reading of the frontend data
  rule. The resolution-ownership contract is an amendment to ADR-028: the session read, including fallback, owns
  authentication failure while pending, explicit authentication commands supersede it, and cancellation remains
  authoritative through its nested profile/renewal continuations after ownership release. Coordinator placement,
  identity-checked cleanup, the shared failure predicate and preserving terminal renewal-failure attribution are
  `none`: tactical code organization, concurrency and error handling within the existing one-renewal policy, with
  no new authentication mechanism or persistent data.
- **D8: tests through the network.** _ADR:_ `none`: it follows the testing rules.
- **D9: documents follow the code.** _ADR:_ `none`: documentation of the decisions above.
- **Boundary: one change.** The save, the queries and the session are one concern, since a change of user clears the
  queries and the saves together, and the session query alone is too small to stand on its own. The forecast is about
  2,500–4,000 changed lines in four or five phases, which one review of the whole change can hold. _ADR:_ `none`: how
  the work is delivered.

**ADRs this work delivers:** no new ADR. A dated amendment to ADR-027 recording three things: the detail query moved
with this change (D3); a movie's user state shows over the payloads with this tab's saves, because an infinite list's
next-page load undoes a patch in place (D4); and every change of signed-in user, sign-in included, clears the cache
(D7). The Status lines of ADR-027 and ADR-028 name this change as the move they planned; ADR-027's also says the
end-to-end watchlist test its Decision names is still to come. A dated amendment to ADR-028 will record pending
session-resolution ownership through provider discovery and password fallback, including explicit-command
supersession and request-local cancellation through nested API work, alongside its existing status and query decisions.

## 6. Cross-cutting Considerations

### Prerequisites

Both are on `main`: the user-movie data API (#173) and the token-renewal fix (#174).

**The user-movie data API.** The frontend this change replaces is the minimal adaptation that API shipped with: one save
by TMDB ID through `useMovieActions` and `useUserMovieData`, the detail page's separate read by TMDB ID, and the
watchlist page reading the Library. This change relies on:

- `PATCH /user-movie-data/{tmdb_id}` saving any subset of `user_on_watchlist`, `user_watched`, `user_liked`,
  `user_rating`, `user_review` and `watched_at` for the signed-in user, creating the record when there is none, and
  answering the whole record (`UserMovieDataSchema`: those fields and `tmdb_id`, every field present). A field left
  out keeps its value; an explicit `null` clears the rating, review or watched date; marking a movie unwatched clears
  its watched date. Saves of one movie are applied one after another. One account may save at most 30 times a minute
  and 1,000 times a day; a save past either limit answers 429 and changes nothing. Every user-movie-data route needs a
  signed-in user.
- Every movie list and detail payload carrying `user_movie_data`: the signed-in user's `UserMovieDataSchema` for the
  movie, or `null` for an anonymous request or a movie the user has no record for.
- `GET /user-movie-data/movies` answering a page of the Library (`MovieListResponseSchema`) from the database, filtered
  by `watchlist=true` and sized by `page_size` up to 100; a client refetches the pages it holds after any save.

**Renewing an expired token before a request.** Before the token-renewal fix, the public movie routes found the user
through `get_current_user_optional`, which treated an expired bearer token as no user rather than answering 401, so a
list or detail read sent with an expired stored token carried no user state. The fix closes that from both sides, and
this change retains the first two properties below and refines failure handling during owned provider resolution:

- **No read or save sends an expired token.** A request first renews an expired stored access token through the
  shared `refreshAccessToken` and is sent with the renewed token. Only operations that don't depend on the previous
  session skip renewal: password sign-in, registration, email verification, password-reset requests and log
  reporting. That is what lets leaving `resolving` clear nothing, apart
  from a first read that clears stored tokens (D7).
- **A bearer token the server can't authenticate is refused.** A public route answers 401 when a supplied bearer
  token doesn't authenticate and no session does, so a token the client still took for current is renewed and the
  request retried through `apiClient`'s 401 path, rather than answered without user state.
- **A failed renewal never leaves the tab reading signed in while its requests carry no user.** When the renewal a
  request waits on fails while password credentials remain present for the current session outside owned provider
  resolution (not a cancellation or a changed session version), `apiClient` doesn't send the request: it clears
  stored tokens and loads the sign-in page afresh
  (`/login?next=…&session_expired=true`, returning to the page after sign-in), as its 401 path does, which drops this
  tab's cache with the page. During owned resolution the request still fails without sending an expired token, but
  the session reader determines the user through discovery and fallback rather than letting an interceptor end it
  (D7). If that reader already concluded anonymous and cleared credentials, later subscribers to the same failure
  reject without regaining redirect authority.

### Security

- **No previous user's data after a change of user.** Every change of signed-in user in this tab resets every query
  but the session and clears the kept saves; a save made before the change does no work after it, and an Undo offered
  before it is dismissed with its toast, so it can't save as the next user (D4, D7).
- **Sign-out loads the sign-in page afresh** once its request settles, so nothing this tab cached outlives it,
  including anything a provider user's still-live session cookie refetched during the wait. After a failed provider
  sign-out the user reads as signed in again once the page has loaded, matching the server (D7).
- **No new endpoints, credentials or storage.** Saves use the existing PATCH with its CSRF header; tokens stay where
  they are.

### Performance

- **A save refetches no movie list.** It writes nothing into lists or the detail entry; only the Library queries are
  invalidated, and only a mounted watchlist page refetches (D4, D6).
- **Kept saves grow with the session.** Each save stays in the mutation cache until the signed-in user changes: one
  small entry per save, bounded in practice by the API's limit of 1,000 saves a day per account. Accepted.
- **Each card subscribes to the saves.** `useUserMovieState` reads the mutation cache through `useMutationState`, so
  each save re-runs every mounted card's filter. The virtualized grid keeps a few dozen cards mounted, so a save costs
  a few dozen filter runs over the kept saves. Accepted.
- **A change of user refetches what is on screen;** a sign-in reloads its screen from the first page, and a sign-out
  loads the sign-in page afresh.

### Testing

D8 sets the test approach. The tests replace only the network (MSW), with a real query client; the toaster is the
real one, so toasts are found by role and text. Pending-resolution tests hold discovery and fallback independently,
advance the 60-second check, and settle API renewal through both pre-request expiry and response-401 recovery.
They cover failures before and after provider acceptance, successful and failed password fallback, cancellation,
explicit-command supersession and a subsequent read after cleanup. The retry rule is tested against
`lib/queryClient`'s own defaults, since `TestProviders` turns retries off.

Renewal-failure tests make the first refresh return 401 while a later refresh would succeed, through each API
entry path. The original caller must still reject, with one refresh and no replay of the refresh URL as the
original operation. Cancellation tests hold a fallback profile's 401 recovery, cancel the session query without
changing the authentication version, then fail renewal and observe no credential clearing or redirect. A separate
shared-renewal case cancels one caller while another current caller still completes successfully.

For shared rejection, make allauth unavailable and let password fallback initiate a held renewal before a
background API caller joins it. Reject without cancellation or version supersession: the session lands anonymous,
both stores are cleared, the caller rejects, one refresh was sent and no redirect occurs. Exercise both API entry
paths and reverse the waiter order. A successful-fallback control then fails a later current-password renewal and
observes ordinary failure handling, so suppressing all post-resolution failures cannot pass.

### Migration and rollout

- **Frontend only.** No backend, schema or stored-data change; the API is used as its prerequisite leaves it.
- **Release order.** This change merges after both prerequisites. A tab still running the previous frontend keeps
  working against the same API.
- **The token-renewal fix landed first** and also changed `apiClient.ts` (where D2's toast id changes), the
  authentication strategy's Token Refresh Flow (D9) and `useAuth.test.tsx` (D8), so this change starts from the fixed
  versions of all three.

### User-facing impact

- A save shows at once wherever the movie appears, and survives the grid's next-page loads and navigating back.
- The detail page's watchlist button gains the toasts and Undo the cards show, and no longer shows a loading state
  while saving.
- The watchlist toast offers Undo.
- Controls stay enabled while saving; a quick double toggle ends where the last click left it.
- Signing in reloads the screen's lists, and signing out loads the sign-in page afresh once the sign-out request
  answers, so no list shows the previous user's state. Sign-out now ends on the sign-in page, where it ended on the
  home page.
- **A save shadows another tab's later change.** A movie saved in this tab shows that save's record over its payload
  until the page reloads or the signed-in user changes, so a later change to the same movie from another tab or
  device doesn't show here until then. Accepted.

### Assumptions

- **TanStack Query 5.105.3's mutation behavior,** confirmed against that version: a queued save in a scope is pending
  with its variables (and so shows) while it waits; `onMutate` runs when the save is made, before it waits its turn;
  clearing the mutation cache removes queued saves from their scope, so they never run, while a running save still
  calls its own callbacks; and callbacks passed to a `mutate` call run only while the calling component is mounted.
- **Session failure semantics stay as they are:** a network failure reading the session signs a password user out and
  clears stored tokens; a failed sign-out request leaves the server's session live, so a provider user reads as
  signed in again after sign-out's page load.
- **Tabs share stored tokens but not state.** A sign-out in one tab doesn't reach another tab's state, and a
  remembered sign-in in another tab stores its token where this tab's requests read it, so it reaches this tab's
  requests but not its state or cache. Accepted: the session isn't synced between tabs (Non-Goals).
- **Only `useAuth` reads the profile.** `NavBarUserMenu` shows `user`; no other page reads or refreshes it, so the
  session needs no writer beyond D7's.

## 7. Success Criteria

All criteria are implemented criteria, checked locally and in CI; each is marked with its evidence beside it.

1. **The success signal.** In a frontend test with the network mocked: toggling a card's watchlist control twice sends
   `true` then `false`; the card and the movie's detail page show the same state without any movie list being
   refetched, and still do after the list's next page lands; a failed save, or two queued saves that both fail, leave
   the server's value showing; and a sign-out clears the kept saves at once and, once its request has settled, loads
   the sign-in page afresh, so no cached query or kept save of the previous user's outlives it. (D4, D5, D7)
2. **Saves.** Tests show: with two queued saves of one movie where the first succeeds and the second fails, the first
   save's record shows; a save that settles after its card unmounted still shows its toast and invalidates the
   Library; a card remounted mid-save shows the save; Undo sends one save per click, its own toast offers no Undo, and
   it works from a toast whose card is gone. (D4, D5)
3. **A change of user.** Tests show: during a sign-out whose request is held, a save settling meanwhile shows no toast,
   and the sign-in page loads afresh only once the request settles, whether it succeeded or failed; the sign-in page
   shows the signed-out notice from `signed_out=true` only when nobody is signed in; after stored credentials the first
   session read rejects, a save settling later shows no toast and refetches no Library; after an expired stored token's
   renewal succeeds and the profile read fails, the lists refetch without the user and the saves are cleared; a failed
   renewal at the 60-second check refetches the lists and clears the saves; a password sign-in completed during the
   first session read refetches the lists; a password sign-in whose fresh read fails clears the saves when its token is
   stored and refetches the lists after the read, without the token; a provider's return whose first read finds the
   provider's user clears a stale stored token and refetches the lists fetched while resolving, with allauth's session
   endpoint read once; a save's toast is gone after a change of user; and a 5xx on the first session read after stored
   credentials signed the user in at once signs them out and leaves its "Server error" toast showing. (D4, D7)
4. **Client defaults.** A test against `lib/queryClient`'s defaults shows a query retries twice on a network error and
   on a 5xx, and not on a 4xx or a cancellation; and a test shows two failing reads leave one "Server error" toast.
   (D2)
5. **The detail page.** Tests show a 404 shows "Movie Not Found", the page makes one request for the movie and none to
   `GET /user-movie-data/{tmdb_id}`, and its watchlist button shows the save toasts. (D3)
6. **The watchlist page.** A test shows it requests `watchlist=true` with a `page_size` of 100 through its query, and
   refetches after a save. (D6)
7. **The old paths are gone.** A search of `frontend/src` and `frontend/tests` finds no `useApiRequest`,
   `useMovieDetail`, `useUserMovieData`, `useMovieActions`, `movieInteractionService`, `getUserMovieDataByTmdbId` or
   `localWatchlistState`; `useAuth` defines no `getUserDetails`; no `useEffect` in `frontend/src` calls `apiClient`,
   `fetch` or a service that reads or changes server data (today `authService`, `httpService`, `movieService`,
   `userMovieDataService` and `userMovieService`), apart from the 60-second renewal in `useAuth.ts`;
   `NavBarUserMenu.tsx`'s sign-out doesn't navigate; `MovieDetail.test.tsx` has no `vi.mock`; and `MovieCard.tsx` passes
   no `disabled` to its watchlist control. (D3–D8)
8. **Documents.** The technical overview's Data Fetching section describes the query factory and the save hook, not
   `useApiRequest`; the authentication strategy's Token Refresh Flow and Authentication Hook sections describe the
   session query and the change of user; ADR-027 carries the dated amendment D4's disposition describes, and the
   Status lines of ADR-027 and ADR-028 name this change. (D9)

9. **Pending provider resolution.** Network tests show: while provider discovery or its password fallback is held,
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

## 8. Open Questions

None.

## Amendments

- **2026-11-12:** D7 gives the provider-return session read ownership through discovery and password fallback.
  Background password renewal cannot end that read or redirect it; explicit authentication commands supersede it.
  This closes races in which renewal failure canceled pending provider discovery or acted after provider acceptance.
  Added criterion 9 for the pending-resolution lifecycle; existing goals and criteria 1–8 stay unchanged. ADR-028's
  dated amendment will record the ownership contract, and the task list carries its implementation and verification.
  D2 and D7 carry cancellation through nested profile/renewal work after ownership release and preserve the original
  operation's terminal renewal failure, request budget and feedback attribution across both interceptors.
  Failure authority also requires password credentials still to be present at the effect boundary, so a shared
  rejection cannot regain authority after the reader's anonymous completion clears both stores.
