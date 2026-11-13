# PRD: Landing Page

**Type:** Technical
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2026-11-13

---

## 1. Introduction/Overview

**The first screen shows no film.** `/` renders `Featured` (`frontend/src/pages/movie/Featured.tsx`): an `h1` reading
"Welcome to CineXplorer", one line of copy, and a card titled "Films" with three buttons into the catalog's windows. It
makes no request and looks the same signed in and out. A first-time visitor learns nothing about what the app does, and
a returning one sees nothing of their own.

**The homepage has outside readers.** Google checks the app's homepage when it publishes the OAuth app and verifies its
branding. Its homepage requirements ask that the page represent the app and its brand, fully describe what the app
does, explain why the app requests user data, and link to the privacy policy named on the consent screen; that it be
hosted on a verified domain without redirecting elsewhere; and that it be visible without signing in. This work covers
the first two, the last, and serving the page without a redirect: the signed-out page at `/` names the app and says
what it does, and `/` serves the page itself. The privacy policy's link and the line on why the app asks for data come
with the privacy and terms pages (§ 5), since that line must agree with the policy they publish. The staging host
already sits on a verified domain, and the launch re-verifies the branding with the production host. The app asks
Google only for the `profile` and `email` scopes, django-allauth's defaults with an email required at sign-up: the
visitor's name, profile picture and email address.

**What this work builds.** Home in two forms at `/`. Signed out, a pitch fronted by a classic film from a list chosen by
hand, then what's in theaters and what's coming soon, then a band saying what a visitor can do. Signed in, the
visitor's own films first, then the same sections of what's on. Both are composed of sections in four forms (a row of
posters, a calendar of films opening soon, one film shown large, and a band of text), with a fifth, a diary of the
visitor's viewings, once viewings can be logged. Neither reads as the catalog's grid, and a later Films hub can reuse
the forms. The product principle applies here first: CineXplorer chooses, frames and
orders what it shows, like a cinema's program, so a classic film chosen by hand fronts the page, not whatever tops a
popularity chart this week.

**What exists to build on.**

- **Film data.** TMDB's detail response carries `backdrop_path` (on `TMDBMovieBase`) and `tagline` (on
  `TMDBMovieDetail`), but no schema passes either on: `MovieDetailSchema` and `MovieListItemSchema` have neither, and
  the stored `Movie` row (`backend/apps/core/models.py`) keeps card fields only. The detail endpoint,
  `MovieService.get_movie_by_id`, calls TMDB on every request: the details, then the credits.
- **Lists.** The catalog's windows are `GET /movies/browse`, `/movies/now-playing` and `/movies/upcoming`, each run
  through the data-quality filters and the page top-up. None is cached on the server, and there is no trending
  endpoint. Coming soon covers theatrical releases opening 5 to 65 days from today, most popular first.
- **The visitor's films.** `GET /user-movie-data/movies` returns the Library, filtered by flag (`watchlist`, `watched`,
  `liked`, `rated`) and sorted (`added`, `watched`, `rating`, `title`, `release`), read from stored cards; the frontend
  reads it through `libraryQuery` (`frontend/src/lib/queries.ts`). A stored card is taken from TMDB's detail response
  when the film is first saved: poster, title, release date, score, runtime, genre IDs and overview.
- **Cards.** `MovieCard` shows the poster, title, full release date and score, with the watchlist toggle working and the
  watched and liked buttons not yet wired. It shows all three to signed-out visitors too: the two unwired ones do
  nothing, and the toggle flips, is refused, flips back and shows a "Failed to update watchlist" toast. Nothing lays
  films out in a row: the catalog's grids are `VirtualizedMovieGrid` and `SequentialMovieGrid`. The frontend names
  genres from a constant map in `browseOptions.ts`, without a request.
- **Sign-in state.** `useAuthContext` gives `status`: `resolving`, `anonymous` or `authenticated`. Signing in shows a
  "Welcome back" toast, from `Login` on the password path and from `useAuth` on a Google or GitHub return.

## 2. Goals

1. Signed out, `/` names the app and says what it does as soon as the sign-in check answers, fronted by a classic film
   chosen by hand, and shows what's in theaters and what's coming soon, with no control that does nothing or fails.
2. Signed in, `/` greets the visitor on arrival and shows the top of their watchlist, then what's on, each section
   opening the page that holds the whole list.
3. Home's sections come in four forms (poster row, calendar, large card, band), and a fifth, the diary, once its
   sources exist (R15, R30), that a later page can reuse, each with its loading, empty and failed states, and each
   usable by keyboard and screen reader.
4. Home never disturbs the catalog: its requests leave the catalog's duplicate tracking alone, and a film opened from
   Home leads back to Home.
5. The pitch and its actions render whether or not the hero's film or any section loads, and no failed read of Home's
   own, the hero's or a section's, raises the app's error toast. The app-wide session read keeps its toast.

## 3. User Stories

- As a first-time visitor, I want the first screen to say what CineXplorer is and does, without signing in, so I can
  decide whether to create an account.
- As a visitor, I want to see what's in theaters and what opens in the coming weeks, so I can find something to see.
- As a signed-in visitor, I want my watchlist first, with the film I mean to see next shown large, so Home starts from
  my own films.
- As a visitor who hasn't saved anything yet, I want Home to tell me where my films will appear and still show me
  what's on.
- As a visitor who opens a film from Home, I want its back link to bring me back to Home.
- As a keyboard or screen-reader user, I want each section announced by its heading, rows I can move through by focus
  or by buttons, and nothing moving on its own.
- As a phone user, I want the film, the pitch and every section to fit my screen.

## 4. Requirements

### Home at `/`

**R1.** Home renders at `/` by the sign-in status (`status` from `useAuthContext`), and follows it whenever it changes:

- `resolving`: the content area shows a loading state rather than either form, with no `h1`, so a returning visitor
  doesn't see the pitch flash first;
- `anonymous`: signed-out Home (R16);
- `authenticated`: signed-in Home (R18).

A stored sign-in counts as `authenticated` at once, before the session read confirms it (`useAuth`'s `initialStatus`);
if that read fails, `status` turns `anonymous` and Home shows the pitch. Signing in from Home returns to Home, signed
in, since Sign in returns to the page the visitor was on. Signing out loads the sign-in page afresh (`useAuth`'s
`logout`), so signing out never switches Home to the pitch in place.

**R2.** `Featured` and its Films card are removed. `/featured` stays an alias that redirects to `/`.
`routing.test.tsx`, which mocks `Featured` and expects it at `/` and after the redirect, checks the new Home instead,
and `Featured.test.tsx` is removed with `Featured`.

`AppLayout` lets a route render without its padded container, and only Home does. The hero and the band (R6, R14)
span the viewport's width, and Home places everything else, in both its forms, in the same container, with the width
and padding every other page has. A `100vw` breakout is not used, since it scrolls sideways while a vertical scrollbar
shows.

### The hero's film

**R3.** The hero's films are a fixed list of TMDB IDs of classic films, about 50, kept as a constant in the movie app's
backend code and changed through a pull request, like the catalog's window presets. Each read picks one film from the
list at random, so a new page load usually shows a different film; with about 50 films, the same one shows on two loads
in a row about one time in fifty, which is accepted.

- **The list.** The Owner chooses the films and settles the list's size. The build starts from a provisional list of
  twelve: _Casablanca_, _Rear Window_, _Seven Samurai_, _Vertigo_, _North by Northwest_, _Lawrence of Arabia_,
  _2001: A Space Odyssey_, _The Godfather_, _Chinatown_, _Jaws_, _Alien_ and _Blade Runner_. No test depends on which
  IDs it holds, and the Owner's list replaces it before the work merges.
- **The check.** Each film is checked in the built hero, in light and dark mode, before it joins the list: its still
  reads well behind the gradient, and its credit fits above the headline (R7). So that any film, a candidate as well
  as a listed one, can be shown on demand, a development build's Home passes a `film` parameter from its own address
  (`/?film={tmdb_id}`) to the read, and the backend serves that film, listed or not, when the server runs with `DEBUG`
  on. Otherwise the parameter is ignored and the pick is random: a production build never sends it, and a production
  server never honors it.

**R4.** `GET /movies/featured` serves the hero's film:

- public (no authentication), and registered before the detail route `/movies/{tmdb_id}`, as the list routes are;
- it returns a schema of its own, `FeaturedMovieSchema`: `tmdb_id`, `title`, `release_date`, `backdrop_path` and
  `tagline`, the last two nullable, and an empty tagline from TMDB returned as `null`;
- it takes one optional query parameter, `film`, honored only as R3 gives it;
- a `MovieService` method picks the film (R3), through a choice that tests can replace, and reads it with one TMDB
  detail call through the client's `get_movie_details`, without the credits or release dates the detail page appends;
  the route only extracts the parameter, calls it and returns the result;
- a failed TMDB call raises the domain error the detail lookup raises (`handle_tmdb_api_error` with `lookup=True`:
  `UpstreamError` with 502, 503 or 504, or `NotFoundError` with 404 when TMDB no longer knows the ID), which the API's
  one handler maps to its `{"detail": ...}` response. No other film is tried in its place;
- nothing is cached on the server, like the catalog's list endpoints. The frontend reads it through TanStack Query with
  a key from the key factory, kept for the page's lifetime: never stale, never dropped from the cache
  (`gcTime: Infinity`, where the client's default drops an unobserved query after 30 minutes), and not refetched on
  mount, focus or reconnect. Coming back to Home within the app, however long after, shows the same film without a new
  read, until the page reloads or the signed-in user changes: a change of user resets every query but the session's
  (`resetUserQueries`), so the hero reads, and picks, again. A new page load reads a new one. A failed read is retried
  as the query client's defaults retry every read: a network error or a 5xx twice, after one and then two seconds, and
  a 404 not at all. So a failure shows about three seconds after the first attempt, which is accepted, since the pitch
  doesn't wait for it (R6).

**R5.** `MovieDetailSchema` gains the same two fields, `backdrop_path` and `tagline`, both nullable and taken from the
TMDB detail response it already reads, with an empty tagline returned as `null`. The movie page doesn't show them yet.

### The signed-out hero

**R6.** The hero shows the pitch at once, without waiting for the film:

- the page's one `h1`, the headline: "Track the films you watch. Find the next one.";
- one line saying what the app does: "Browse what's in theaters and coming soon, keep a watchlist, and search any film.
  Film data from TMDB.";
- the actions: **Create account**, the primary button, opening `/register`, then **Sign in**, a link to the sign-in
  page that returns to Home. The first place is left for the demo account's "Try the demo", which that work adds
  without changing the hero's layout; until then nothing stands in for it.

**R7.** When the hero's read settles with a backdrop, the film's backdrop image fills the hero, and a gradient of the
page's `background` color covers the text side of the image and fades into the page below it. The film's credit appears
above the headline: its title and release year, as "Lawrence of Arabia (1962)", with its tagline below when it has one,
cut to two lines. The credit links to the film's page (R25) and carries no label of its own. The credit, the headline,
the line and the actions all sit where the gradient is opaque `background`, so every word of the hero is text on
`background`.

**R8.** The hero's space doesn't jump:

- at 1024px and wider (`lg`), the hero keeps one height whether or not a film arrives, with its text set at the
  bottom, so the credit grows upward and the headline and actions never move;
- below 1024px, the backdrop sits above the text and fades into the page. Its space is held while the read is pending,
  and released when the read settles without a backdrop or when the image fails to load.

**R9.** If the hero's read fails, the film has no backdrop (`backdrop_path` is `null`) or its image fails to load, the
hero stays as the pitch and actions on the page background, with no image and no credit, and no error toast (R10).

### Section forms

**R10.** Every section on Home, of whatever form:

- is a `section` element named by its `h2` (`aria-labelledby`), with "See all", when it has one, as a link in its
  header;
- sends its requests opted out of `apiClient`'s global "Server error" toast (`shouldReportServerError`), as the hero's
  read does, since each shows its own fallback. To carry that option and a pagination context (R24),
  `HttpService.getPaginated`, which today passes only the query parameters and the abort signal, and the movie and
  Library fetchers built on it take optional request options. Only Home's reads pass them, so every other reader, the
  watchlist page's among them, keeps the toast. The hero's read is not a paginated list, and `HttpService.get` takes
  neither options nor query parameters, so the movie service gains a fetcher of the hero's own that passes the opt-out
  and, in a development build, the `film` parameter (R3);
- has three states, except the band, which has no read: while loading, its title and placeholders hold its space; with
  no films it doesn't render at all; when its read fails it keeps its title and shows the line "Couldn't load these
  films." with a **Retry** button that refetches that section's read only. A failed read is retried first, as R4
  describes, so the failed state shows about three seconds after the first attempt;
- shows posters as `MovieCard` does: a film without a `poster_path` shows `PosterPlaceholder`, in the calendar and on
  the large card too, and a poster image that fails to load leaves its alt text. Only the hero hides its image when the
  image fails (R9).

**R11.** A **poster row** has two parts:

- **the scroller,** which takes the films to show as data and lays out at most 20 of them in a list (`ul` of `li`),
  each as `MovieCard`, so card actions added to `MovieCard` reach every row. It provides its two buttons for a header
  to place;
- **the row section,** which takes a title, an optional "See all" destination and a TanStack query that yields films,
  and puts the section, its header with the scroller's buttons, and its states (R10) around the scroller. A row with
  nothing to open, such as a later curated collection, leaves "See all" out.

The watchlist section (R20) uses the scroller alone, inside its own section. In either use:

- Cards keep the grids' width, `CARD_WIDTH` (194px), at 1024px and wider, and are never narrower than 138px below it,
  the narrowest card the user-movie card controls' actions fit (§ 6).
- The list scrolls sideways natively, by swipe and by trackpad, and by the two buttons, named "Previous films" and
  "Next films", that move the list by its visible width and are disabled at the start and the end; both are disabled
  when the list doesn't overflow.
- Keyboard focus moving through its cards brings each card into view.
- Nothing advances on its own. Scrolling by the buttons is smooth, and instant when the visitor asks for reduced motion
  (`prefers-reduced-motion: reduce`).

**R12.** A **calendar** groups films by the week they open. "Most anticipated" (R17) is its one use in this work:

- It reads the first page of Coming soon (`GET /movies/upcoming`, page 1, in the catalog's default order, most popular
  first, with Home's own pagination context, R24) and takes its first 20 films, the same cap as a row, since a page the
  backend tops up can hold up to 39.
- It groups them by the week each film opens, Monday to Sunday, so a Friday opening keeps its weekend. TMDB's release
  dates are calendar dates and are grouped without a time zone.
- It shows the first four weeks that have films, in date order; a week without films is skipped.
- Each week is headed by an `h3` reading "Week of" and its Monday's date, as "Week of November 16" (the cards' en-US
  date style), with the day of the month drawn large in `tertiary`. Under it, a list of up to three films at 1024px and
  wider and up to two below, in popularity order, then "and N more" as plain text when the week has others among the
  20.
- Each film shows a small poster, its title, its release weekday and day ("Fri 20") and its first genre, named from the
  frontend's genre map, or no genre when it has none. Each film links to its page (R25).
- The weeks sit side by side at 1024px and wider, and stack below.
- "See all" opens `/browse/upcoming`, where every film in the window appears.

**R13.** A **large card** shows one film: its poster, title, release year, runtime when TMDB has one, genres (named from
the genre map) and overview, cut to a set number of lines at each width so the card keeps one height whichever film it
shows. It links to the film's page (R25) and carries no card actions; the film's page has them. Its one use in this
work leads the watchlist section (R20).

**R14.** The **band** sits across the page's full width on the `layer-01` background, just above the footer, on
signed-out Home only. Its `h2`, "What you can do", is visually hidden, and it holds three points, each a title as an
`h3` over one line:

| Title | Line |
| --- | --- |
| See what's on | What's in theaters and coming soon, ordered and named for what it is. |
| Keep a watchlist | Save films to see next from any poster, and find them on Home. |
| Search any film | Find any film by its title, from the search in the bar. |

It needs no read, so it has no loading or failed state.

**R15.** A **diary** lists viewings. "Recently watched" is its one use, built under R30 when its sources exist:

- It lists the visitor's five most recent logged viewings, newest first, one entry per viewing, so a film seen twice
  can appear twice, read from the user-movie tracking model's list of viewings (§ 6, Neighbouring work).
- Each entry shows the viewing's date; beside it, when the viewing is marked as a rewatch, the rewatch icon (a circular
  arrow named "Rewatch"); a small poster; the title and year; and the viewing's rating in the read-only star display.
  The icon and the star display are the tracking model's, shared with the Library's Activity tab and the film page.
- Each entry links to its film's page (R25), and "See all" opens the Library's Activity tab (`/library/activity`), which
  lists every viewing, newest first, so the section is that tab's top.

### Signed-out Home

**R16.** Signed-out Home shows, in order: the hero (R6 to R9); "Popular in theaters" as a poster row and "Most
anticipated" as a calendar (R17); then the band (R14). Its one `h1` is the headline. Cards show no actions (R26).

**R17.** **What's on** is the same for every visitor, signed in or out, and comes from the catalog's views:

- "Popular in theaters", a poster row of the first page of In theaters (`GET /movies/now-playing`, page 1, in the
  catalog's default order, popularity, with Home's pagination context, R24), whose "See all" opens
  `/browse/now-playing`;
- "Most anticipated", the calendar (R12), whose "See all" opens `/browse/upcoming`.

Each section is titled as the catalog's header titles the view its "See all" opens, so the visitor lands on a page
whose header matches the section they left.

### Signed-in Home

**R18.** Signed-in Home is a quick look at what's next and recent for the visitor, and sends them on: each section shows
the top of a list, and its "See all" opens the page that holds the whole list. Home never sorts, filters or reorders a
list; the Library is the one place the visitor does. A card's own actions, which mark one film, are offered on Home as
wherever cards show. There is no hero. It shows, in order:

1. the greeting, or the visually hidden heading (R19);
2. the visitor's watchlist (R20);
3. "Recently watched", once it is built (R15, R30);
4. what's on (R17).

**R19.** **The greeting.** The page's `h1` is a greeting when the visitor arrives: the first time signed-in Home renders
after the app loads (a new visit, a new tab or a reload) or after the signed-in user changes. It reads "Welcome back,
{name}", with the account's first name, or its username when no first name is set, and stays while the page is shown.
Coming back to Home by navigating within the app shows no greeting: the `h1` is visually hidden and reads "Home", and
the sections start at the top.

Whether the visitor has been greeted is held in memory for the loaded app, and nothing is stored. It is cleared
whenever the signed-in user changes (a sign-in, a sign-out or a session that ends), the change that `session.ts`
counts through `beginUserChange`, so a visitor who signs in again on another page is greeted on reaching Home.

**R20.** **The watchlist section**, titled "Your watchlist", reads the visitor's watchlist through `libraryQuery` with
`watchlist: true`, page 1 and `page_size` 20, under the Library endpoint's default sort, `added`, newest first: the
order the watchlist page shows today. The first film shows as a large card (R13); the rest follow in a poster row's
scroller (R11) under the same heading, with the scroller's buttons in the section's header; with one film on the
watchlist, the card shows alone. "See all" opens `/watchlist`, where the bar's Watchlist link leads (the Library page
renames it, § 6). The section's loading and failure are the watchlist read's (R22).

`ordered_for_library` sorts `added` by the record's `created_at`, so the newest addition leads. A change to what
`added` sorts by, such as the tracking model's (§ 6), reaches Home with no change to its read. A queue order is a
different sort value and direction, which Home sends under R30d.

**R21.** Within the watchlist section, changes show at once, since a save refreshes the Library's read:

- Adding a film from a card in what's on puts it first when it is the newest addition by the Library's `added` order:
  today, a film the visitor has never saved anything about, since `added` follows the record's creation and a film
  saved before keeps its place. It then takes the large card's place. The card keeps one height (R13), so the swap
  doesn't move the page.
- The page does move when the section's row appears (a second film added) or goes (all but one removed), and when the
  whole section appears or goes: a visitor whose page shows "Recently watched" with an empty watchlist adds a first
  film, which brings the section in above it, or a visitor removes the last film. Each follows the visitor's own action
  on a rare transition, and is accepted.
- Removing a film from the watchlist, from any card on Home that shows it, removes it from the section. The large card
  has no actions, so on Home the last film can be removed only through a card in what's on that shows the same film.
  The section then goes, and the rest of the page stays as shown until the next visit (R22).

**R22.** **The visitor's reads decide the page.**

- Until the session read (which carries the name the greeting uses) and the watchlist read first settle, Home stays in
  its loading state, as it does while `status` resolves (R1). Once "Recently watched" exists, its read joins them.
  After that the page stays as shown: a Retry on a failed section shows that section's own placeholders (R10), and
  never returns the page to its loading state.
- If either list's read fails, Home shows the visitor's sections with that one in its failed state (R10), under the
  greeting the arrival rule gives (R19).
- A visitor with nothing of their own to show (no films on the watchlist and, once "Recently watched" exists, no
  logged viewings) sees the nothing-saved set: on arrival the greeting reads "Welcome, {name}", with the same name rule;
  one line follows, "Films you add to your watchlist will show up here."; then what's on (R17), so Home still opens
  with sections of films. Coming back within the app, the visually hidden "Home" replaces the greeting, and the line
  stays.
- Which set shows is chosen when the reads settle and holds while Home is shown, so saving a first film doesn't rebuild
  the page under the pointer; the visitor's own sections show from their next visit. If `status` turns `anonymous`
  while Home is shown, the held set is dropped with the signed-in page.

**R23.** Signing in no longer shows a "Welcome back" toast, on the password path (`Login`) or on the Google and GitHub
return (`useAuth`). Home's greeting welcomes a visitor who arrives there, and elsewhere the account menu shows they're
signed in. `useAuth.test.tsx`'s two provider-return cases keep their checks of where the return navigates and drop
their checks of the toast, since the same branch does both.

### Home and the catalog

**R24.** **Home's requests never disturb a catalog view's duplicate tracking.** The backend tracks the titles a catalog
view has returned per session, pagination context (the `X-Pagination-Context` header, one ID per page load from
`getPaginationContextId`) and filter set, and clears that record on every first-page request
(`fetch_with_filters_and_buffer`). A section of Home asking for the same view's first page under the tab's context would
clear the record of a catalog view the visitor had scrolled, and on their return within the query client's five-minute
`staleTime`, when the cached pages show without a refetch, the next page could repeat films already shown, since
`useInfiniteMovies` doesn't dedupe.

- Home's section requests (R12, R17) carry a second pagination context of their own, one per page load, distinct from
  the tab's.
- `apiClient`'s request interceptor, which today sets the tab's context on the movie list endpoints over any value the
  caller passed, keeps a context the caller set and adds the tab's only when the request has none. Home's requests set
  theirs through the request options R10 adds to the read path.
- The rule the code follows is stated where the code's one-context rule is stated today: `strategy-pagination.md`
  § Multi-Tab Isolation, the interceptor example in `strategy-service-layer.md`, and `apiClient.test.ts`, which asserts
  one shared context for every movie endpoint. Each now says the catalog's own lists share the tab's context, and Home's
  section requests carry a second one, so they never clear the catalog's record.

**R25.** **Films opened from Home lead back to Home.** Every film link on Home (its cards, the large card, the
calendar's and the diary's entries) and the hero's credit open the film's page with `from=home`, and the movie page's
back link then reads "Back to Home" and opens `/`. Today `buildBackUrl` (`BackToCollectionLink`) sends a missing `from`
to `/browse/now-playing` and an unknown one to `/browse/{from}`, which for `home` would be a dead link.

**R26.** **`MovieCard` shows its card actions only to a signed-in visitor** (`status` is `authenticated`), so no control
on signed-out Home does nothing or fails, and the catalog's and search's cards gain the same. Signed in, the watched and
liked buttons stay unwired until the user-movie card controls wire them, as in the catalog today.
`MovieCard.test.tsx`'s watchlist cases render signed in.

A card without actions has no footer, so it is about 44px shorter than a signed-in card. The catalog's virtualized
grid keeps its fixed row spacing (`ROW_HEIGHT`, 449px, in `VirtualizedMovieGrid`), and its tests stay as they are:
signed-out catalog rows sit further apart until the card controls change the card and that spacing. The spacing
already fits a card with its footer, so nothing overlaps and no row moves when the status resolves to `authenticated`
after the grid has rendered, and saved scroll positions mean the same rows whatever the visitor's status.

### Theme roles, tests and documentation

**R27.** What this work builds takes theme roles, not a Chakra recipe's own colors or raw values: among them the row's
controls, the placeholders, the hero's gradient (`background`), the band's background (`layer-01`) and the calendar's
large week numerals (`tertiary`, a text role already checked for contrast on `background`). The Films card that drew
Chakra's card colors goes with `Featured`.

**R28.** **The browser smoke tier keeps its seven specs, and three of them change.**

- `background.spec.ts` waits for "Welcome to CineXplorer" signed out, and waits for the new headline instead.
  `sign-in.spec.ts` and `phone-width.spec.ts` sign in, land on `/` and wait for the same old heading; they wait for
  the "Popular in theaters" heading instead, which every signed-in Home shows, loading or failed, since the greeting's
  text varies with the account and its films.
- Locally, `fixtures.ts` fails a test on any `/api/movies` request without a fixture and aborts every request to
  another origin, so `catalogueResponse` (`e2e/catalogue.ts`) gains responses for Home's three reads: the hero's film,
  and the first pages of In theaters and Coming soon.
- `background.spec.ts` fails on any console error, which a failed response or image logs, and it also runs against
  staging, where `fixtures.ts` routes nothing. It stubs Home's three reads itself in both targets, as
  `back-to-results.spec.ts` does through `useRestoreCatalogue`, with the hero's film at `backdrop_path: null` and
  posters without images, so its color-mode checks never depend on live TMDB. The other specs read live TMDB on staging.
- `MovieCard`'s watched and liked buttons have no accessible name, which `axeBaseline` (`e2e/axe-baseline.ts`) excuses
  on `/browse` and `/search`. Cards show no actions signed out (R26), but both routes are also scanned signed in:
  `phone-width.spec.ts` signs in, then scans `/browse` and `/search`. So both entries stay, their reason now the
  signed-in cards, and `/` takes the same entry for signed-in Home, which `sign-in.spec.ts` and `phone-width.spec.ts`
  scan. R30c replaces this bullet when the buttons are already named on `main`.
- The two documents that describe the staging target's one self-stubbing spec, the `staging` bullet in
  `strategy-testing-methodology.md` and TECHNICAL-OVERVIEW § 7's Targets, name `background.spec.ts` beside it, with its
  reason.

**R29.** **The documentation describes the shipped Home:**

- the three pagination sites (R24) and the two smoke-tier sites (R28);
- the root README: the landing page moves from "In development, for launch" to "Built", as a home page with a classic
  film and what's in theaters and coming soon, and the visitor's watchlist first once signed in, and the status
  line stops naming a landing page as in development;
- the Status lines of the four ADRs the new ADR supersedes in part (§ 8): ADR-002, ADR-026, ADR-039 and ADR-044.

### Neighbouring work already on `main`

**R30.** Before this work's pull request merges, `main` is merged into its branch. What `main` then holds decides four
further changes, each checked against `main`'s code at that merge:

- **a. API types, always.** The frontend's API types (`frontend/openapi.json` and `frontend/src/types/api.ts`) are
  regenerated from the merged backend, so they carry this work's schema changes (R4, R5) and any on `main`.
- **b. If `main` has the Library's Activity tab (`/library/activity`) and the tracking model's list of viewings,**
  signed-in Home builds "Recently watched" (R15) in its place (R18), with its read joining R22's, and the
  nothing-saved set counts its viewings.
- **c. If `main`'s `MovieCard` gives its watched and liked buttons accessible names and wires them,** this work adds no
  `/` baseline entry and restores no `/browse` or `/search` entry (R28); keeps `main`'s form of the signed-out rule
  (R26) where the two differ; and the pitch's line and the band name what that work makes possible. The line reads
  "Browse what's in theaters and coming soon, keep a watchlist, track and rate what you've watched, and search any
  film. Film data from TMDB.", and the band's second point becomes "Keep track": "Save films to see next, mark what
  you've watched, and rate and like them."
- **d. If `main` orders the watchlist as a queue on the Library's Watchlist tab,** the watchlist section reads "Up next"
  in place of "Your watchlist" and leads with the first film in the queue: its read sends the sort value and direction
  that put the queue's first film first, as the Library's Watchlist tab does, in place of R20's defaults (the endpoint's
  `direction` defaults to `desc`), and the frontend's `UserMoviesQueryParams` gains `sort` and `direction` to carry
  them. The large card gains a "Reorder" link to the Library's Watchlist tab (`/library/watchlist`), since the queue
  is ordered only there.

## 5. Non-Goals (Out of Scope)

- **The demo account,** with its sign-in, seeding and nightly purge, and its "Try the demo" button: an accounts and
  sign-in concern of its own (§ 8, decision 16).
- **The Films hub:** a page of this work's section forms and its own (a numbered top-ten list, genre and decade tiles
  that open the catalog already filtered), which follows as its own work and settles its own sections. Until it exists,
  Films opens the catalog.
- **The user-movie tracking model, card controls and Library,** and what they own: the list of logged viewings, card
  actions, the Library page and its Activity tab. This work builds "Recently watched" only under R30.
- **Card actions on the large card:** planned follow-up work, once the user-movie card controls settle those actions.
  Until then the large card links to the film's page.
- **The watchlist's queue and its ordering:** the queue's own work. Home reads the order it sets (R20, R30).
- **The app's other toasts:** sign-in progress and errors, registration progress, and the verified and signed-out
  notices move inline as separate work, with a rule for when a toast fits. This work removes only the sign-in welcome
  (R23).
- **The privacy and terms pages and their links** from Home and the footer, and Home's line on why the app asks for
  Google sign-in data, which must agree with the policy those pages publish.
- **The footer,** including its TMDB attribution, already in `Footer`.
- **The movie detail page's redesign.** It uses the two new detail fields (R5); this work changes only its back link
  (R25).
- **Content beyond these sections:** curated collections, trending, "this week in film history", trailers and where to
  watch.
- **Caching TMDB responses on the server.**
- **A tablet layout.** Widths below 1024px get the phone layouts of the hero and the calendar, and the rows' narrower
  cards, as the bar does.

## 6. Technical Considerations

- **Neighbouring work.** Four pieces of planned work meet Home. Each is an expected contract here, not shipped
  behavior, and R30 says what this work does when one is already on `main`. When this work merges first, the other
  takes the change:
    - **The user-movie tracking model** records each viewing with its date, rating and rewatch mark, lists them
      newest first, provides the rewatch icon and the read-only star display, and changes the Library's `added` order to
      when the film joined that list. It also changes the API schema, so whichever of the two merges second regenerates
      the frontend's API types after merging `main` (R30a).
    - **The user-movie card controls** wire and name `MovieCard`'s watched and liked buttons, adopt the signed-out
      rule (R26), and place their actions on cards 138px wide or wider, which R11 keeps every row card to. They also
      change the card's height and the grid's row spacing (R26). If this work merges first, they remove the three
      `button-name` baseline entries (R28) and add watching, rating and liking to the pitch's line and the band, in
      R30c's words.
    - **The Library page** gives the visitor's lists tabs at `/library/{tab}`, with `/watchlist` redirecting to its
      Watchlist tab, renames the bar's Watchlist link to Library, and adds the Activity tab. If this work merges first,
      the Library's work adds "Recently watched" as R15 designs it.
    - **The watchlist queue** adds an order the visitor sets on the Library's Watchlist tab, which the Library endpoint
      returns as one more sort value. If this work merges first, the queue's work makes R30d's change.
- **A first visit starts a session per list request.** Each list request from a visitor without a session creates one
  (`_create_dedup_tracker`), so Home's two parallel section requests on a first visit can create two, of which the
  browser keeps the last. The catalog already does this, one request at a time, and the nightly `clearsessions` removes
  expired ones. Each duplicate-tracking record expires after an hour, so Home's second context adds at most two short-
  lived records per page load.
- **Images.** The local smoke target aborts requests to other origins, so images there never load: the hero then shows
  the pitch alone (R9), and posters leave their alt text, as the catalog's cards already do there (R10). Axe can't
  measure text over an image and leaves such text for manual review rather than failing it, so R7's contrast holds by
  construction: every word of the hero sits where the gradient is opaque `background`.
- **TMDB backdrops change.** The still behind the hero is TMDB's primary backdrop for the film, which TMDB's
  contributors can change. The gradient keeps the text legible whatever the image, and a film whose still stops reading
  well is swapped out of the list (R3).
- **The calendar's shape changes from week to week.** Coming soon's most popular films can bunch into a few weeks or
  spread across two months. Showing the first four weeks with films, at most three each, bounds it either way, and a
  quiet season shows fewer weeks. "And N more" counts the others among the 20 the calendar takes, not every film
  opening that week, and the most popular film can open after the fourth week shown; "See all" opens the whole window.
- **The size.** About 2,500–4,200 changed lines in four or five phases, about 2–3.5 days of work at the pace recent
  work of this kind has been estimated at (about 1,150 changed lines a day). The random pick, the request options, the
  hero's own fetcher and the development parameter roughly balance the daily rotation they replace, so the range holds.
  One review of the whole change can hold it.

## 7. Design Considerations

- **Character.** Home reads as a cinema's program, not a database: one film chosen by hand fronts the signed-out page,
  and the sections below change form (a row of posters, a calendar, one film shown large, a band of text), so the page
  never reads as the catalog's grid turned sideways.
- **What was compared.** A landing study in the Marquee palette compared the hero's text following the color mode
  (the still fading into the page's own background) against a dark band in both modes, and signed-in Home opening on a
  visually hidden heading against a visible greeting, at desktop and phone width, with contrast readouts for the hero's
  text. A composition study compared each Home as rows only against sections in several forms, and sketched the Films
  hub. Their stills were drawn stand-ins, the posters color fields, and their spacing and type sizes a first pass.
- **Copy.** The headline states what the app is for, so it stands whether or not every part of tracking has merged.
  The pitch's line and the band name only what works when this work merges (R6, R14), and grow with the card controls
  (R30c). New names are in sentence case.
- **Widths.** 1024px (`lg`) is the one switch for the hero's and the calendar's layouts and the rows' card width, the
  breakpoint where the bar switches to its phone layout. The phone layouts must fit from 360px wide, as the bar does.

## 8. Design Decisions

1. **Home renders by sign-in status at `/`, replacing `Featured`** (R1, R2). A separate landing route was not
   considered: Google checks the app's homepage, and the wordmark on every page links to `/`. The loading state while
   `status` resolves keeps a returning visitor from seeing the pitch flash. Its cost is accepted: every visitor without
   a stored token, first-time visitors included, waits for the session read before the pitch shows, since a returning
   Google or GitHub visitor also has no stored token. _ADR: the new ADR below, which supersedes ADR-044 in part._
2. **The hero is a classic film from a fixed list of about 50, picked at random on each page load** (R3, R4), and held
   while the app stays loaded, until a reload or a change of user, so coming back to Home doesn't swap the film under
   the visitor. The list keeps the identity of films chosen by hand, and its size and a new film on each load make the
   page feel alive. One film a day from a dozen was considered first, the same film all day so that it could be checked
   by hand; a development-only parameter showing any film answers that need with a random pick too. The week's
   top trending title needs no list, but gives up the identity the list provides, and some weeks the top title is a poor
   fit for the first screen. An occasional repeat on two loads in a row is accepted rather than tracking what each
   visitor last saw. _ADR: the new ADR below._
3. **A small hero endpoint reads the hero's film from TMDB** (R4, R5): one TMDB detail call, a schema with only what the
   hero shows, and no stored state. Having the frontend pick the film and call the detail endpoint was rejected:
   the list would live in the frontend, and every page load would pay the detail endpoint's two TMDB calls for a credits
   list the hero doesn't show. Storing the backdrop and tagline on `Movie` and serving the hero from the database was
   rejected: a migration and two card fields that no card shows, kept only for the hero, and `Movie` rows exist only
   for films someone has saved. When TMDB fails, the hero falls back to the pitch rather than to another film, since
   the pitch stands alone (R9). _ADR: the new ADR below._
4. **The hero shows the pitch at once and the film when it arrives, with its text on the page's own background**
   (R6 to R9). No theme role exists for text over a photograph, and colors come from theme roles, so the hero composes
   existing roles: a gradient of `background` holds every word of its text, which keeps the contrast the palettes are
   already checked for, in both modes, and the hero follows the mode like the rest of the page. A dark hero in both
   modes was set aside after a study in both modes: it needs new roles for the scrim and the text on it, in the role
   types, every palette and the contrast check. _ADR: the new ADR below._
5. **Home's copy names only what works when it merges** (R6, R14, R30c): a visitor who reads "rate what you've seen"
   and can't would distrust the rest. The headline states the app's purpose and stands either way. _ADR: `none`
   (temporary: the copy grows with the card controls)._
6. **Rows of posters share one component, and cards hide their actions signed out** (R11, R26). Each row draws
   `MovieCard`, so card actions added later reach every row without a change here. A signed-out visitor sees no card
   actions anywhere, rather than controls that do nothing or fail; the user-movie card controls adopt the same rule.
   The shorter signed-out card leaves the catalog grid's fixed row spacing as it is, so signed-out catalog rows sit
   further apart for now. A row height chosen by sign-in status was set aside: a scroll position saved under one status
   and restored under the other would land on another row, and the card controls change that spacing anyway. Row cards
   keep the grids' width and never go below 138px, so the card controls' actions fit every card a row draws. _ADR: the
   new ADR below._
7. **Signed-in Home is a quick look at what's next and recent, sending the visitor on** (R18, R20 to R22). Each page
   keeps its own job: Films is the same program for everyone, personal only in the marks on its cards; the Library
   holds everything the visitor has kept and is the only place they sort, filter or reorder; Home shows the top of the
   visitor's lists and a little of what's on. A smaller copy of the Library or of the catalog was rejected: a personal
   list on Home competes with the Library, and rows of what's on alone repeat what Films shows everyone. The page set
   is held while shown, so a first save doesn't rebuild the page under the pointer. _ADR: the new ADR below._
8. **The watchlist leads with the film the Library's Watchlist tab puts first** (R20, R30d), which becomes the first
   film in the visitor's queue once the watchlist can be ordered: the film they plan to see next. The newest addition,
   what the order gives today, is not necessarily that film. Home reads the Library endpoint's default order today and
   sends the queue's sort value and direction once the queue exists. Reordering the queue on Home was rejected: the
   Library stays the one place the visitor reorders, and the large card links there. _ADR: the new ADR below._
9. **Signed-in Home greets on arrival only** (R19, R23). Home is also the front door, reached by the wordmark from
   every page, so a greeting every time reads as a banner; no visible heading is quick to the rows but cold on arrival.
   A greeting once per visit or sign-in welcomes the visitor, and replaces the sign-in toast, which would greet twice.
   A count under the greeting was rejected: it would come and go with the greeting. _ADR: the new ADR below._
10. **What's on comes from catalog views, the same for every visitor** (R17). Each section is the first page of a
    catalog view, titled as the catalog titles it, with "See all" into that exact view: the title says why the films
    are there, no new endpoint or cache is needed, and the visitor lands on a page whose header matches. A trending
    section from TMDB's trending endpoint needs a new endpoint through the data-quality filters with a cache; its only
    frame is TMDB's activity, so it can't say why a film is in it, and with no trending view in the catalog its "See
    all" would open the popular view under another name, or be left out. A trending window in the catalog was
    rejected: a fourth window is a change to the catalog, not to Home. Signed in, both sections show rather than in
    theaters alone: the signed-out page builds both, the page ends on a different form, and one rule covers every
    visitor, one with nothing saved included. _ADR: the new ADR below, which supersedes in part what ADR-044 left of
    ADR-002's trending Featured page and ADR-026's Redis cache for "the landing page's trending list"._
11. **Home is composed of four section forms, and a diary once viewings can be logged** (R10 to R15). A page of poster
    rows alone reads as the catalog's grid turned sideways. Film sites that avoid that look mix poster rows with other
    forms: one film shown large, numbered lists, tiles, lists led by dates or text, and bands of text. Home takes four,
    compared in a composition study: poster rows; a calendar for what's coming, since when those films open is why they
    are there, and a row, though each card shows its date, can't group them; the visitor's next film shown large; and a
    band of text. The diary, a list led by dates, joins them for the visitor's viewings once the tracking model logs
    them. Numbered lists and genre and decade tiles suit the Films hub, not Home. The calendar takes the first 20 films,
    the same cap as a row, and weeks run Monday to Sunday so a Friday opening keeps its weekend. _ADR: the new ADR
    below._
12. **Home's section requests carry their own pagination context** (R24), rather than the tab's, so they never clear
    the record of a catalog view the visitor scrolled. The interceptor keeping a caller's context is the smallest
    change that lets a request carry one. _ADR: `none` (tactical, inside the existing pagination design)._
13. **Films opened from Home lead back to Home** (R25), with `from=home` and a "Back to Home" link, rather than the
    dead `/browse/home` link the back link builds today. _ADR: `none` (tactical)._
14. **What this work builds takes theme roles** (R27). ADR-045 already points Chakra's own color names at theme roles,
    but components still name their roles directly. _ADR: `none` (obvious from code: DEVELOPMENT-RULES and
    `strategy-color-tokens.md` already require theme roles)._
15. **The smoke tier keeps seven specs, and `background.spec.ts` supplies Home's responses itself in both targets**
    (R28), since its console checks must not depend on live TMDB; the others wait for a heading every Home of their
    kind shows. _ADR: the new ADR below, which supersedes in part ADR-039's statement that Back to Results is the spec
    supplying its own responses in both targets, adding `background.spec.ts` and its reason; the rest follows
    ADR-039's tier and baseline policy unchanged._
16. **The hero's actions leave the first place to the demo** (R6). Until the demo account exists, "Create account"
    leads and "Sign in" follows; that work puts "Try the demo" first, "Create account" second and a line saying the
    demo needs no sign-up, without changing the layout. Building the demo here was set aside: a seeded account per
    visitor, a sign-in without a password and a nightly purge are an accounts concern of their own, about 1–1.5 days
    apart from the page. Showing the button disabled until then was rejected: a control that does nothing. _ADR:
    `none` (temporary, until that work lands)._
17. **The Films hub follows as its own work** (§ 5), sized at about 1–1.5 days once this work's poster row and
    calendar exist. _ADR: `none` (it orders delivery and decides nothing about the system)._
18. **Particulars settled with the design** (R1, R4, R7, R10, R12, R14): no `h1` while Home loads, as on the other pages
    that load; "Couldn't load these films." with Retry for a failed section; an empty TMDB tagline read as none; the
    tagline cut to two lines, so the wide hero's one height holds every credit; 1024px as the one layout switch, the
    bar's, for the hero, the calendar and the rows' card width; and the band's heading visually hidden, its points
    carrying the visible titles. _ADR: `none` (tactical)._
19. **One change** (§ 6, The size). The hero endpoint serves this page, the two detail fields come from the same TMDB
    response, and Home's two forms share the section forms. The demo account and moving the app's other toasts inline
    are separate concerns and stay their own work. _ADR: `none` (meets none of the ADR criteria)._
20. **Home renders outside the app's padded container** (R2), so the hero and the band can span the viewport while
    Home's other sections keep every page's width and padding. A `100vw` breakout inside the container was set aside:
    it scrolls sideways while a vertical scrollbar shows. _ADR: `none` (tactical)._

**ADRs this work delivers:**

- **New: ADR-046, "Open Home on a classic film and sections of films"** (decisions 1 to 4, 6 to 11, and 15). It
  records Home's two forms by sign-in status at `/`; the hero's classic film, picked at random from a fixed list and
  served by its own endpoint; the hero composed on the page's own background; Home's section forms and their
  states; signed-in Home's job beside Films and the Library, its greeting on arrival and its watchlist order; what's on
  from catalog views; cards without actions for signed-out visitors; and `background.spec.ts` supplying Home's
  responses itself in both smoke targets. It supersedes in part:
    - ADR-044: the sentence giving the home page a Films section that offers the three windows;
    - ADR-002: what ADR-044 left of its trending Featured page: the four Future items in its Frontend Implementation,
      each about the Featured page that Home replaces (researching TMDB's trending endpoints for it, designing its hero
      layout and content strategy, building it with trending collections, and its design notes), and the Consequences
      that rest on a trending Featured page;
    - ADR-026: "the landing page's trending list" among Redis's small caches, since Home has no trending list;
    - ADR-039: Back to Results as the one spec supplying its own responses in both targets, which `background.spec.ts`
      now joins.

  Each of the four takes `Superseded in part by ADR-046 (part)` in its Status line, naming its part in the parentheses
  as above, beside any supersession it already names.

ADR-046 is written reading `Proposed` with the implementation and set to `Accepted` before the work merges.

## 9. Success Criteria

### Implemented

1. Backend tests, with TMDB replaced at its client and the random choice replaced, show `GET /movies/featured`
   answering without authentication with `tmdb_id`, `title`, `release_date`, `backdrop_path` and `tagline`; the film
   the choice picks from the list; with `DEBUG` on, an ID passed as `film` served, whether or not it is on the list;
   with `DEBUG` off, a `film` ignored for the choice's pick; one TMDB detail call per request and no credits call;
   an empty tagline returned as `null`; and a failed TMDB call answered 502 and an unknown ID 404, each with
   `{"detail": ...}`. They show `MovieDetailSchema` carrying `backdrop_path` and `tagline`.
2. Component tests show Home at `/` in the loading state with no `h1` and no pitch while `status` is `resolving`, the
   signed-out page while it is `anonymous`, the signed-in page while it is `authenticated`, and Home switching when
   `status` changes; signed-out Home rendering the hero, "Popular in theaters", "Most anticipated" and the band, in
   that order, with no card actions; and `routing.test.tsx` shows `/featured` redirecting to `/` and rendering Home.
3. Component tests show the hero's `h1`, line and actions before its read settles; once it settles with a film, the
   credit naming the title and year, with the tagline when present, linking to the film with `from=home`; the pitch
   and actions with no credit, no image and no "Server error" toast when the read fails, when `backdrop_path` is `null`
   and when the image fails to load; the same film after navigating away from Home and back, with no second read; the
   hero's query options never stale, with `gcTime: Infinity` and no refetch on mount, focus or reconnect, checked on
   the options themselves, since the test client already keeps every query; and, in a development build, Home at
   `/?film={tmdb_id}` passing that ID to the read.
4. Component tests show each section form but the band with its title and placeholders while loading, absent with no
   films, and failed with its title, "Couldn't load these films." and Retry, which refetches that section's read alone;
   no "Server error" toast on a failed section, while a failed read on the watchlist page still raises it; each
   section as a `section` named by its `h2`; and `PosterPlaceholder` for a film without a `poster_path` in a row, in
   the calendar and on the large card.
5. Component tests of the poster row, with the list's scroll measurements supplied since jsdom does no layout, show at
   most 20 cards in a list; "Previous films" disabled at the start and "Next films" at the end, and both when the list
   doesn't overflow; Next scrolling by the visible width, smoothly, and instantly under reduced motion; and "See all"
   present or absent with its destination.
6. Unit tests of the calendar's grouping show the first 20 films taken; a Monday's and a Sunday's release in the same
   week and a Friday's in its own; the first four weeks with films, an empty week skipped; up to three films a week
   with three as the cap and up to two with two, each with "and N more" counting the rest of that week among the 20;
   and the heading "Week of November 16" for a week whose Monday is November 16. Component tests show each entry's
   weekday and day, its first genre or none, and its link with `from=home`.
7. Component tests show the large card's poster, title, year, runtime when present, genres and overview, its link with
   `from=home`, no card actions, and the card alone with one film on the watchlist; and signed-out Home's band, under
   its hidden heading, with R14's three points.
8. Component tests of signed-in Home show no hero, and its sections in R18's order with the watchlist's first film as
   the large card and the rest in its row, read with `watchlist`, page 1, 20 films and the default `added` sort,
   newest first; the greeting "Welcome back, {first name}", and the username when no first name is set, on the first
   render after load; the visually hidden "Home" after navigating away and back; the greeting again after
   `beginUserChange` records a sign-in; "Welcome, {name}", the nothing-saved line and both what's-on sections for a
   visitor with an empty watchlist, and that set held after the visitor saves a first film; the loading state until the
   session and watchlist reads first settle; a failed watchlist read shown in its section's failed state under the
   greeting, and its Retry showing that section's placeholders with the greeting and what's on still in place; a film
   added from what's on taking the large card's place; and a film removed from the watchlist leaving the section.
9. Tests show no "Welcome back" toast after a password sign-in (`Login`) or a Google or GitHub return (`useAuth`), and
   `useAuth.test.tsx`'s provider-return cases still checking where the return navigates.
10. `apiClient.test.ts` shows the catalog's list requests carrying the tab's pagination context, Home's section
    requests carrying a different one, and the interceptor keeping a context the caller set.
11. Tests show the movie page's back link reading "Back to Home" and opening `/` for `from=home`, and every film link
    on Home and the hero's credit carrying `from=home`.
12. `MovieCard.test.tsx` shows no card actions while `status` is `anonymous` or `resolving`, and the watchlist toggle
    working signed in; `VirtualizedMovieGrid`'s tests pass with its row spacing unchanged.
13. The smoke tier passes locally with seven specs: `background.spec.ts` waiting for the headline with Home's three
    reads stubbed, `sign-in.spec.ts` and `phone-width.spec.ts` waiting for "Popular in theaters" after signing in, and
    the axe scans passing with the `button-name` entries for `/browse`, `/search` and `/`, each with its reason, or
    without them where R30c applies (criterion 16).
14. In the browsable stack at 1280×800 and 360×800, in light and dark mode, checked by hand: the hero and the band
    spanning the viewport with no sideways scroll, and Home's other sections at every page's width; the wide hero
    keeping its height with and without a film, and the phone hero holding the backdrop's space while the read is
    pending and releasing it when the image fails; the calendar showing weeks side by side with up to three films at
    1280 and stacked with up to two at 360; row cards 194px wide at 1280 and no narrower than 138px at 360; every row
    scrolling by its buttons, by swipe (touch emulation) and by Tab through its cards; scrolling instant with reduced
    motion emulated; and nothing on Home drawing a color outside its theme roles. The Owner's list has replaced the
    provisional one, and the Owner has signed off each film on it in the built hero, in both modes, through `/?film=`
    (R3).
15. A search of `.arc/reference`, outside the archive and the ADR bodies, and of the root README finds no description
    of one pagination context for every movie request, of Back to Results as the only spec supplying its own responses
    on staging, or of the landing page as in development, as current; ADR-002's, ADR-026's, ADR-039's and ADR-044's
    statuses name ADR-046 as superseding them in part, each with its part named, and ADR-046 reads `Accepted`.
16. R30's changes, each where its condition held at the final merge of `main`: the API types match the merged backend
    (CI's type-drift check passes); with the Activity tab on `main`, component tests show "Recently watched" as R15
    gives it and the nothing-saved set counting viewings; with named card buttons on `main`, the scans pass without the
    three `button-name` entries and the pitch's line and the band name watching, rating and liking; and with the queue
    on `main`, component tests show the watchlist read sending the queue's sort value and direction, "Up next" leading
    with the queue's first film, and the large card's "Reorder" link.

### Proven after merge

17. The pull request's end-to-end smoke job passes with the seven specs, and after merge the staging smoke run passes
    the six it runs (it skips sign-up), `background.spec.ts` with its stubbed reads. Staging serves `/` to a signed-out
    browser without a redirect: the address stays `/` and the page shows the headline.

## 10. Open Questions

None.
