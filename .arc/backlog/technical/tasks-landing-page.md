# Task List: Landing Page

**PRD:** `prd-landing-page.md`
**Created:** 2026-11-13
**Branch:** `technical/landing-page`
**Base Branch:** `main`
**Status:** Pending

## Overview

**Purpose:** Replace `Featured` at `/` with Home in two forms by sign-in status: signed out, a pitch fronted by a
classic film chosen by hand, then what's in theaters and coming soon, then a band of what a visitor can do; signed in,
the visitor's watchlist first, then the same sections, built from section forms a later Films hub can reuse.

## Scope

### Will Do

- `GET /movies/featured`, serving one film at random from a fixed list of classic films, and the detail schema's
  backdrop and tagline
- Request options on Home's reads: no global server-error toast, and a pagination context of their own
- The section forms (poster row, calendar, large card, band) with their loading, empty and failed states
- The signed-out hero; signed-out and signed-in Home at `/`, rendered outside the padded container
- The greeting on arrival in place of the sign-in toast, and the watchlist section led by a large card
- Card actions for signed-in visitors only; films opened from Home leading back to Home
- The smoke tier's three changed specs, its fixtures and baseline; the documentation and ADR-046
- The Owner's list of films, and `main`'s neighbouring work applied as R30 gives it

### Won't Do

- The demo account, the Films hub, the user-movie tracking model, card controls, Library and queue
- The privacy and terms pages, the app's other toasts, the footer and the movie page's redesign
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** Home's reads are served and requested apart from the catalog

_Mode:_ `layer` — closes on the hero's endpoint and a read path that carries Home's own request options.

_Exit criterion:_ backend tests show `GET /movies/featured`'s contract and the detail schema's two fields, and
`apiClient` tests show Home's section requests carrying their own pagination context without the server-error toast,
while the catalog's requests keep the tab's context and the toast.

- [ ] **1.1 `GET /movies/featured` serves a classic film from a fixed list — R3, R4**

    **Goal:** Anyone can read one film picked at random from the list, with only what the hero shows, and a failed
    TMDB read answers as the detail lookup's does.

    - [ ] **1.1.a Write the service's tests in `backend/apps/movie/tests/unit/services/test_featured_movie.py`**
        - Build `MovieService` with `TMDBStub` (`tests/tmdb_stub.py`) and a fixed chooser; give
          `create_tmdb_movie_detail` (`tests/tmdb_test_builders.py`) `backdrop_path` and `tagline` parameters
        - Test: the chooser receives the list and its pick is the film read
        - Test: with `DEBUG` on (`override_settings`), a `film` ID is read whether or not it is listed; with `DEBUG` off,
          `film` is ignored and the chooser's pick is read
        - Test: one TMDB request per read, `movie/{id}`, and no credits request (`TMDBStub.requested_endpoints`)
        - Test: an empty tagline and a missing backdrop come back as `None`
        - Test: a TMDB 5xx or timeout raises `UpstreamError` and a TMDB 404 `NotFoundError`, with no other film read
        - Test: a 200 whose body fails validation (no `title`) raises `UpstreamError`
        - Expect tests to FAIL initially

    - [ ] **1.1.b Write the endpoint's tests in `backend/apps/movie/tests/integration/api/test_featured_movie.py`**
        - Patch the TMDB client at `TMDB_CLIENT_GET_MOVIE_DETAILS` and `TMDB_CLIENT_GET` (`tests/mock_paths.py`), as
          `test_movie_detail.py` does, with a detail response per requested ID
        - Test: an anonymous `GET /api/movies/featured` answers 200 with exactly `tmdb_id`, `title`, `release_date`,
          `backdrop_path` and `tagline`, for a film on the list
        - Test: with `DEBUG` on, `?film={id}` answers with that film; with `DEBUG` off, it answers with a listed film
        - Test: a TMDB failure answers 502 and an unknown ID 404, each with `{"detail": ...}`; an invalid TMDB body
          answers 502
        - Expect tests to FAIL initially

    - [ ] **1.1.c Implement the list, the schema, the service method and the route**
        - `FEATURED_FILM_IDS` in a new `backend/apps/movie/featured.py`: the provisional twelve R3 names, each ID
          looked up and its title and year confirmed in the backend container's `manage.py shell` with
          `from apps.core.services.tmdb_api_client import TMDBApiClient` and `response.is_success()` (QUICK-REFERENCE
          § TMDB API Queries has the shape, but imports `core.services` and reads `is_success` without calling it),
          with a comment that a film joins after it is checked in the built hero in both modes
        - `FeaturedMovieSchema` in `schemas.py`: `tmdb_id`, `title`, `release_date`, and nullable `backdrop_path`
          and `tagline`
        - `MovieService` takes `choose_film: Callable[[Sequence[int]], int]`, defaulting to `random.choice`;
          `get_featured_movie(film: int | None)` reads `film` only when `settings.DEBUG`, otherwise the chooser's
          pick, through one `get_movie_details` call with no `append_to_response`; a failed read goes through
          `handle_tmdb_api_error(..., lookup=True)`, and invalid data raises `UpstreamError` as `get_movie_by_id` does
        - A factory beside `create_movie_detail_from_tmdb` builds the schema; the tagline goes through
          `empty_str_to_none` (`apps.core.utils`), which also reads a blank one as `None`, and 1.2 reuses it
        - Route `@movies_router.get("/featured", response=FeaturedMovieSchema, auth=None)` registered before
          `/{tmdb_id}`, with an optional `film: int` query parameter: it extracts it, calls the service and returns
        - Tests should now PASS

- [ ] **1.2 The detail schema carries the backdrop and tagline — R5**

    **Goal:** `GET /movies/{tmdb_id}` returns `backdrop_path` and `tagline` from the TMDB response it already reads,
    and the frontend's types know both endpoints.

    - [ ] **1.2.a Add the fields' tests to `test_movie_detail.py`**
        - Test: the detail response carries `backdrop_path` and `tagline` from TMDB's detail; an empty tagline reads
          `null`; both read `null` when TMDB omits them
        - Expect tests to FAIL initially

    - [ ] **1.2.b Add both fields to `MovieDetailSchema` and `create_movie_detail_from_tmdb`**
        - Nullable, the tagline through `empty_str_to_none` as in 1.1.c; the movie page doesn't show them
        - Tests should now PASS

    - [ ] **1.2.c Regenerate the API types**
        - `npm run generate-types --prefix frontend` against this worktree's test stack; `frontend/openapi.json` and
          `frontend/src/types/api.ts` carry `FeaturedMovieSchema`, the route and the two detail fields
        - `e2e/catalogue.ts`'s `movieDetail()` still type-checks (`npm run type-check` covers `e2e/`)

- [ ] **1.3 Home's reads pass request options and a pagination context of their own — R10, R24**

    **Goal:** A Home read can opt out of the global server-error toast and carry Home's own pagination context, while
    every other reader keeps both behaviors as they are.

    - [ ] **1.3.a Write the read path's tests in `src/services/__tests__/apiClient.test.ts`**
        - Replace the assertion of one shared context for every movie endpoint (around line 419) with: the catalog's
          list requests (`browseMovies`, `getNowPlayingMovies`, `getUpcomingMovies`, `searchMovies`) carry the tab's
          context; a request that sets `X-Pagination-Context` keeps it; a read passed `homeSectionOptions` carries
          `getHomePaginationContextId()`, which differs from the tab's
        - Test: a 500 on a read passed `homeReadOptions` shows no "Server error" toast, and the same read without
          options shows it
        - Test: `getFeaturedMovie()` sends no `film`, `getFeaturedMovie(550)` sends `film=550`, and its 500 shows no
          toast
        - Test: `getUserMovies` given `homeReadOptions` shows no toast on a 500
        - Expect tests to FAIL initially

    - [ ] **1.3.b Pass request options through the read path**
        - `HttpService.getPaginated<T>(params?, options?)`, with `options` a
          `Pick<AxiosRequestConfig, "headers" | "shouldReportServerError">` merged into the request beside `signal`
          and `params`; `fetchPaginatedMovies`, `getNowPlayingMovies`, `getUpcomingMovies` and `getUserMovies` take
          the same optional `options` and pass it on; callers that pass none are unchanged
        - `getFeaturedMovie(film?: number)` in `movieService.ts`: `apiClient.get` on `/movies/featured` with the
          opt-out, and `params: { film }` only when given, returning `{ request, cancel }` as `HttpService.get` does
        - `getHomePaginationContextId()` in `paginationContext.ts`: a second ID, made once per page load
        - A new `src/services/homeRequests.ts` exports Home's two option sets: `homeReadOptions` (the opt-out alone,
          for the watchlist read) and `homeSectionOptions` (the opt-out and `X-Pagination-Context` set to Home's ID,
          for the what's on reads)
        - The request interceptor in `apiClient.ts` sets the tab's context on the movie list endpoints only when the
          request carries none
        - Tests should now PASS

    - [ ] **1.3.c State the two-context rule where the one-context rule is stated**
        - `strategy-pagination.md` § Multi-Tab Isolation and the interceptor example in `strategy-service-layer.md`
          (around line 271): the catalog's lists share the tab's context, and Home's section requests carry a second
          one, so they never clear the catalog's record
        - The same document's `services/` file list (around line 230) gains `homeRequests.ts`, and its
          `getPaginated` signature (around line 318) takes the optional `options`
        - Search `.arc/reference` outside the archive and the ADR bodies, and the root README, for any other
          statement of one context for every movie request (criterion 15), and correct each

### **Phase 2:** The hero and what's on render as Home's sections

_Mode:_ `slice` — closes on signed-out and signed-in Home at `/` showing the pitch, the hero's film and what's on, with
the three changed smoke specs passing.

- [ ] **2.1 Cards show their actions only to signed-in visitors — R26**

    **Goal:** A signed-out or resolving visitor sees no card action on any `MovieCard`, and a signed-in one keeps the
    working watchlist toggle.

    **Check:** `browse.spec.ts`, `movie-detail.spec.ts` and `back-to-results.spec.ts` (signed-out catalog cards) and
    `phone-width.spec.ts` (signed-in `/browse` and `/search`).

    - [ ] **2.1.a Write the sign-in cases in `MovieCard.test.tsx`**
        - Test: no button in the card while `status` is `anonymous` or `resolving`, counted by role, since the
          Watched and Liked buttons have no accessible name
        - The "MovieCard watchlist saves" cases (around line 628) and the "MovieCard shared-save composition" cases
          (around line 793) render signed in, through `AuthContextProvider` with a stored `token()` and
          `authHandlers()` (`tests/helpers/auth.ts`), as `MovieDetail.test.tsx`'s card case does; the cases that
          don't touch the actions stay as they are
        - Expect the signed-out and resolving cases to FAIL initially

    - [ ] **2.1.b Render `MovieCard`'s footer only when `useAuthContext()?.status` is `authenticated`**
        - A missing context counts as signed out, as `ProtectedRoute` reads it
        - `ROW_HEIGHT` in `VirtualizedMovieGrid` stays 449; run its tests unchanged
        - Tests should now PASS

- [ ] **2.2 Films opened from Home lead back to Home — R25**

    **Goal:** A film page opened with `from=home` shows "Back to Home", which opens `/`.

    **Check:** `movie-detail.spec.ts` and `back-to-results.spec.ts`.

    - [ ] **2.2.a Add the `home` cases to `BackToCollectionLink.test.tsx`**
        - Test: `from=home` reads "Back to Home" and links to `/`, carrying no other parameter
        - Test: the existing sources keep "Back to Results" and their routes
        - Expect tests to FAIL initially

    - [ ] **2.2.b Give `buildBackUrl` and the label a `home` source, and add Home's film link**
        - `from=home` returns `/`; the button reads "Back to Home" for it, since `MovieDetail` passes no label; the
          component's comments describe the `home` source beside the collection routes
        - `homeFilmPath(tmdbId)` in a new `src/utilities/filmLinks.ts` returns `/movie/{tmdbId}?from=home`, for the
          hero's credit, the calendar and the large card; Home's `MovieCard`s take `source="home"`
        - Tests should now PASS

- [ ] **2.3 A poster row scrolls up to 20 cards inside a section with its states — R10, R11, R27**

    **Goal:** Any query of films renders as a titled section whose row scrolls by swipe, trackpad, buttons and focus,
    never moves on its own, and shows its own loading, empty and failed states without the server-error toast.

    - [ ] **2.3.a Write the section's and the row's tests in `src/components/movie/sections/__tests__/`**
        - Section: a `section` named by its `h2` (`aria-labelledby`); "See all" a link in its header, or absent;
          while loading, the title and placeholders; with no films, nothing rendered; on failure, the title,
          "Couldn't load these films." and **Retry**, which refetches that section's read alone (a sibling section's
          request count unchanged)
        - Row, with the list's `scrollWidth`, `clientWidth` and `scrollLeft` supplied, since jsdom does no layout: at
          most 20 cards in a `ul` of `li`; "Previous films" disabled at the start and "Next films" at the end, both
          when the list doesn't overflow; Next scrolls by the visible width with `behavior: "smooth"`, and `"auto"`
          under `prefers-reduced-motion: reduce` (`matchMedia` stub)
        - A film without a `poster_path` shows `PosterPlaceholder`; a card's links carry `from=home`
        - Home's In theaters read failing with a 500 (MSW) shows the failed state and no "Server error" toast, with
          a `Toaster` mounted (the shared renderer mounts none), as `MovieCard.test.tsx` does
        - Home's In theaters and Coming soon reads carry `getHomePaginationContextId()` in `X-Pagination-Context`, not
          the tab's `getPaginationContextId()`, checked in the MSW handlers
        - Expect tests to FAIL initially

    - [ ] **2.3.b Add Home's section queries to `src/lib/queries.ts`**
        - `homeWindowQuery(window)` for `"now-playing"` and `"upcoming"`: page 1, no sort (the catalog's default
          order), key `["movies", "home", window]`, read with `homeSectionOptions` (1.3)

    - [ ] **2.3.c Build the section shell, the scroller and the row section**
        - `FilmSection` (`src/components/movie/sections/`): a title, an optional "See all" destination, optional
          header controls, the query's result and the films it yields; renders R10's three states around its
          children
        - `usePosterScroll()` returns the list's ref and the state and handlers of both buttons; `PosterScroller`
          takes that ref, the films and a `source`, and lays out at most 20 `MovieCard`s in a `ul`, `CARD_WIDTH` wide
          at `lg` and never under 138px below, scrolling natively; `PosterScrollButtons` takes the state and handlers
          and renders "Previous films" and "Next films" wherever a header places it (the row section's here, the
          watchlist section's in 4.2)
        - `PosterRowSection`: a title, an optional "See all" and a query yielding films, composing the two
        - Theme roles: the buttons through the button recipe's variants, the placeholders as the grids' skeletons draw
          them (`GridSkeletonLoader`)
        - Tests should now PASS

- [ ] **2.4 A calendar groups Coming soon by the week each film opens — R10, R12, R27**

    **Goal:** Coming soon's most popular films show grouped by opening week, at most four weeks and three films a week
    at wide widths, each film linking to its page.

    - [ ] **2.4.a Write the grouping's unit tests in `src/utilities/__tests__/`**
        - Test: only the first 20 films are taken
        - Test: a Monday's and a Sunday's release fall in the same week, and a Friday's in another week its own
        - Test: the first four weeks with films, in date order, an empty week skipped
        - Test: up to three films a week with three as the cap and up to two with two, each week counting the rest of
          its films among the 20 as "and N more"
        - Test: a week whose Monday is November 16 is headed "Week of November 16"
        - Expect tests to FAIL initially

    - [ ] **2.4.b Implement `groupByOpeningWeek(films, perWeek)` in `src/utilities/`**
        - Calendar arithmetic on the `YYYY-MM-DD` dates in UTC, so no time zone shifts a day; a film without a
          release date is left out (Coming soon's window filters by date)
        - Tests should now PASS

    - [ ] **2.4.c Write the calendar's component tests**
        - Test: each week's `h3`, with its day of the month drawn apart; each entry's small poster, or
          `PosterPlaceholder`, its title, its weekday and day ("Fri 20"), its first genre or none, and its link with
          `from=home`; "and N more" as plain text
        - Test: titled "Most anticipated", with "See all" opening `/browse/upcoming`; its states through `FilmSection`
        - Expect tests to FAIL initially

    - [ ] **2.4.d Build `ReleaseCalendar` in `src/components/movie/sections/`**
        - Takes a title, a "See all" destination and a query yielding films; Home passes `homeWindowQuery("upcoming")`
        - Day numerals in `tertiary`; weeks side by side at `lg`, stacked below; three films a week at `lg` and two
          below, with "and N more" counted for the cap that shows
        - Genre names from `browseOptions.ts`'s genre map, looked up in `genreOptions` by `String(id)` as
          `catalogTitle.ts` does
        - Tests should now PASS

- [ ] **2.5 The hero shows the pitch at once and the film when it arrives — R3, R6, R7, R8, R9, R25, R27**

    **Goal:** The headline, line and actions show before any read settles; the film's backdrop and credit join when it
    arrives; any failure leaves the pitch alone with no toast.

    - [ ] **2.5.a Write the hero's tests in `src/pages/home/__tests__/HomeHero.test.tsx`**
        - Test: the `h1` "Track the films you watch. Find the next one.", R6's line, **Create account** opening
          `/register` and **Sign in** linking to `signInPathFor("/", "")`, all before the read settles (MSW held)
        - Test: once settled with a film, the credit "{title} ({year})" with its tagline when present, linking to
          `/movie/{id}?from=home`, and the backdrop image
        - Test: the pitch and actions with no credit, no image and no "Server error" toast (a `Toaster` mounted)
          when the read fails, when `backdrop_path` is `null`, and when the image fires `error`
        - Test: the same film after navigating away from Home and back, with one read
        - Test: `featuredFilmQuery()`'s options are `staleTime: Infinity`, `gcTime: Infinity` and `false` for
          `refetchOnMount`, `refetchOnWindowFocus` and `refetchOnReconnect`, checked on the options object, since the
          test client already keeps every query
        - Test: at `/?film=550`, the read sends `film=550` (Vitest runs a development build)
        - Expect tests to FAIL initially

    - [ ] **2.5.b Add `featuredFilmQuery(film?)` to `src/lib/queries.ts`**
        - Key `["featured", film ?? null]`, read through `getFeaturedMovie` (1.3), with the options above and the
          client's default retry

    - [ ] **2.5.c Build `HomeHero` in `src/pages/home/`**
        - The pitch's copy exactly as R6 gives it; **Create account** as the primary button, **Sign in** a link to
          `signInPathFor("/", "")`; nothing stands in the first place the demo will take
        - `film` from `useSearchParams` only when `import.meta.env.DEV`
        - The backdrop from TMDB's `w1280` size, decorative (`alt=""`); a gradient of `background` covers the text side
          and fades into the page below, and every word sits where it is opaque
        - The credit above the headline, its tagline cut to two lines; at `lg`, one height with or without a film,
          its text set at the bottom; below `lg`, the backdrop above the text, its space held while the read is
          pending and released when it settles without a backdrop or the image fails
        - Tests should now PASS

- [ ] **2.6 The band says what a visitor can do — R14, R27**

    **Goal:** A full-width band on `layer-01` lists R14's three points under a visually hidden heading, with no read.

    - Test first, in `src/pages/home/__tests__/HomeBand.test.tsx`: the hidden `h2` "What you can do" and R14's three
      `h3` titles with their lines; expect it to FAIL initially
    - Build `HomeBand` in `src/pages/home/`: full width, `layer-01`, the heading hidden with `VisuallyHidden`; the
      test should now PASS

### **Phase 3:** Home replaces Featured at `/`

_Exit criterion:_ locally, `background.spec.ts` sees the headline signed out with Home's three reads stubbed, and
`sign-in.spec.ts` and `phone-width.spec.ts` sign in and land on `/` showing "Popular in theaters", each scan passing.

- [ ] **3.1 Home renders by sign-in status, signed out in full and signed in with what's on — R1, R16, R17, R18,
  R27**

    **Goal:** Home shows a loading state without an `h1` while sign-in resolves, then the form `status` gives,
    following every change: signed out, the hero, "Popular in theaters", "Most anticipated" and the band; signed in, a
    visually hidden "Home" `h1` over the same what's on, which Phase 4 builds on.

    - [ ] **3.1.a Write Home's tests in `src/pages/home/__tests__/Home.test.tsx`**
        - Render `<Home />` itself, through `AuthContextProvider` and MSW; `/` still serves `Featured` until 3.2
        - Test: resolving shows the loading state with no `h1` and no pitch; anonymous shows signed-out Home; a stored
          token shows signed-in Home; a stored token whose session read fails switches to the pitch
        - Test: signed out, the hero, "Popular in theaters", "Most anticipated" and the band in that order, one `h1`
          (the headline) and no button in any card; each "See all" opening `/browse/now-playing` and
          `/browse/upcoming`
        - Test: signed in, no hero, the visually hidden `h1` "Home", and both what's on sections
        - Expect tests to FAIL initially

    - [ ] **3.1.b Build `Home` and its two forms in `src/pages/home/`**
        - `Home` renders `LoadingContent mode="content"` while `resolving`, and the form `status` gives otherwise
        - `WhatsOn`: a `PosterRowSection` over `homeWindowQuery("now-playing")` and a `ReleaseCalendar` over
          `homeWindowQuery("upcoming")`, titled by `catalogTitle(window, DEFAULT_BROWSE_PARAMS)`, cards with
          `source="home"`
        - Signed out: `HomeHero`, `WhatsOn`, `HomeBand`; signed in: the hidden "Home" `h1` and `WhatsOn`
        - `AppLayout`'s container props move to an export it and Home share; Home wraps all but the hero and the band
          in them, so its sections keep every page's width and padding
        - Tests should now PASS

- [ ] **3.2 Home replaces Featured at `/`, outside the padded container, and the smoke tier follows — R2, R28**

    **Goal:** `/` serves Home without the padded container while every other page keeps it, `/featured` still
    redirects there, and the three specs that land on `/` wait for the new Home in the same change.

    **Check:** at 3.2.c, where `/` changes: `background.spec.ts`, `sign-in.spec.ts` and `phone-width.spec.ts`; and
    `back-to-results.spec.ts`, `movie-detail.spec.ts` and `browse.spec.ts`, since every page renders through the
    changed `AppLayout`.

    - [ ] **3.2.a Write the route and layout tests**
        - `src/__tests__/App.test.tsx`, which renders the real `App` at a path: signed out, with MSW answering the
          session and Home's reads, `/` shows Home's headline. No case here follows the `/featured` redirect:
          `tests/setup.ts` fixes `window.location`, so the router stays on the first path after a redirect
        - `src/components/layout/__tests__/AppLayout.test.tsx`: a page at another path renders inside the padded
          container, and Home at `/` doesn't
        - Expect both to FAIL initially: `Featured` still serves `/`, and `AppLayout` wraps every page
        - `tests/integration/routing.test.tsx` is a copy of the route table, not `App`'s own: it mocks
          `@/pages/home/Home` in place of `Featured` and checks it at `/` and after the `/featured` redirect, as R2
          asks, and its comments (lines 5 and 51) name Home. With Home built in 3.1 it passes at once, so the change
          is a rename; the `App.test.tsx` case is the one that proves the switch

    - [ ] **3.2.b Supply Home's three reads in `e2e/catalogue.ts`**
        - `catalogueResponse` answers `/api/movies/featured` with `backdrop_path: null`, and the first pages of
          `/api/movies/now-playing` and `/api/movies/upcoming` with posters at `null`
        - `useHomeCatalogue(page, baseURL)` routes the same three on the page, in both targets, as
          `useRestoreCatalogue` does
        - Nothing requests them until 3.2.c, so every spec still passes

    - [ ] **3.2.c Route `/` to Home, remove `Featured`, let only Home skip the container, and move the specs with it**
        - `App.tsx` lazy-loads `src/pages/home/Home.tsx` at `ROUTES.HOME`, its comment (line 80) naming Home;
          `/featured` keeps its redirect
        - Delete `pages/movie/Featured.tsx` and `Featured.test.tsx`; correct `routes.ts`'s `HOME` comment
        - `AppLayout` skips its `Container` when `useMatch(ROUTES.HOME)` matches, so the bar and footer stay mounted
          across navigation; no `100vw` breakout
        - `background.spec.ts` calls `useHomeCatalogue` before every test (`test.beforeEach`), and waits for "Track
          the films you watch. Find the next one." where it waited for "Welcome to CineXplorer" (lines 72 and 150)
        - `sign-in.spec.ts` (line 192) and `phone-width.spec.ts` (line 56) wait for the "Popular in theaters" heading
        - `axe-baseline.ts`: a `/` `button-name` entry for signed-in Home's cards; the `/browse` and `/search`
          `button-name` reasons name the signed-in cards
        - Tests should now PASS, and the Check's six specs with them

    - [ ] **3.2.d Name `background.spec.ts` beside Back to Results**
        - The `staging` bullet in `strategy-testing-methodology.md` (around line 855) and TECHNICAL-OVERVIEW § 7's
          Targets: `background.spec.ts` supplies Home's reads itself in both targets, since its console checks must
          not depend on live TMDB

- [ ] **3.3 Home's layout holds at both widths in both modes — R2, R6, R7, R8, R11, R12, R14, R27**

    **Goal:** What jsdom can't lay out is checked by hand on the running app, in the browsable stack at 1280×800 and
    360×800, in light and dark mode.

    - The hero and the band span the viewport with no sideways scroll; the sections keep every page's width
    - The wide hero keeps its height with and without a film (`/?film=` with a film TMDB gives no backdrop); the phone
      hero holds the backdrop's space while the read is pending and releases it when the image fails (block
      `image.tmdb.org` in devtools)
    - The calendar's weeks side by side with up to three films at 1280, stacked with up to two at 360
    - Row cards 194px wide at 1280 and no narrower than 138px at 360; each row scrolls by its buttons, by swipe (touch
      emulation) and by Tab through its cards; scrolling is instant with reduced motion emulated
    - No color outside theme roles on Home (R27)

- [ ] **3.4 Check Home in the smoke tier** (run `background.spec.ts`, `sign-in.spec.ts` and `phone-width.spec.ts`)

    **Goal:** The phase's exit criterion is shown by a local run against the browsable stack, with what ran recorded.

### **Phase 4:** Signed-in Home greets on arrival and leads with the watchlist

_Mode:_ `slice` — closes on signed-in Home greeting the visitor on arrival and leading with their watchlist.

_Exit criterion:_ in the browsable stack, signing in lands on Home greeting the account by name with its watchlist's
newest film as the large card; navigating away and back shows no greeting; an account with an empty watchlist sees the
nothing-saved line; and `sign-in.spec.ts` and `phone-width.spec.ts` pass.

- [ ] **4.1 A large card shows one film at one height — R13, R27**

    **Goal:** One film shows large with its poster, title, year, runtime, genres and overview, linking to its page,
    at one height whichever film it shows.

    - [ ] **4.1.a Write `LargeFilmCard`'s tests in `src/components/movie/sections/__tests__/`**
        - Test: the poster (or `PosterPlaceholder`), title, release year, runtime when TMDB has one, genres named
          through `genreOptions` and the overview; its link to `/movie/{id}?from=home`; no card actions
        - Expect tests to FAIL initially

    - [ ] **4.1.b Build `LargeFilmCard` in `src/components/movie/sections/`**
        - The overview cut to a set number of lines at each width, so the card keeps one height
        - Tests should now PASS

- [ ] **4.2 The watchlist section leads with the newest addition and follows saves — R10, R20, R21**

    **Goal:** "Your watchlist" shows the watchlist's first film large and the rest in a row, in the Library's `added`
    order, changing at once as the visitor saves.

    **Check:** `sign-in.spec.ts` and `phone-width.spec.ts` (signed-in `/`).

    - [ ] **4.2.a Write the section's tests in `src/pages/home/__tests__/WatchlistSection.test.tsx`**
        - Test: the read sends `watchlist=true`, `page=1` and `page_size=20` and no sort, so the endpoint's `added`
          order, newest first, applies
        - Test: the first film as the large card and the rest in the scroller, its buttons in the section's header;
          one film shows the card alone; "See all" opens `/watchlist`
        - Test: adding a never-saved film from a what's on card puts it in the large card's place; removing a film
          from a what's on card removes it from the section, and removing the last removes the section
        - Test: a failed read shows the section's failed state with no "Server error" toast, a `Toaster` mounted,
          while the watchlist page's failed read still raises it (`Watchlist.test.tsx`'s failure case, rendering the
          `Toaster`)
        - The shared `userMoviesHandler` is static; the save cases use a per-test handler that records saves and
          serves the watchlist newest first, as `Watchlist.test.tsx`'s refetch case does
        - Expect tests to FAIL initially

    - [ ] **4.2.b Build `WatchlistSection` in `src/pages/home/`**
        - `libraryQuery(params, options?)` passes `homeReadOptions` to `getUserMovies` (no pagination context: it is
          not a movie list endpoint); the key stays `[...libraryKey, params]`, so a save's invalidation refreshes it
        - A `FilmSection` titled "Your watchlist" holding `LargeFilmCard` and a `PosterScroller` with `source="home"`,
          its `PosterScrollButtons` in the section's header
        - Tests should now PASS

- [ ] **4.3 Signed-in Home greets on arrival, and the visitor's reads decide the page — R18, R19, R22**

    **Goal:** Signed-in Home greets once per load or sign-in, then waits for the visitor's reads, shows their sections
    or the nothing-saved set, and holds that set while it is shown.

    **Check:** `sign-in.spec.ts` and `phone-width.spec.ts` (signed-in `/`).

    - [ ] **4.3.a Write signed-in Home's tests in `Home.test.tsx`**
        - Each case starts "after load": `beforeEach` calls `beginUserChange`, the change the greeting compares
          against, so no case depends on another's greeting; 3.1's interim signed-in cases are rewritten to the
          arrival rule
        - Test: no hero; the greeting, the watchlist section and what's on, in that order
        - Test: "Welcome back, {first name}" on the first render after load, and the username when no first name is
          set; the visually hidden "Home" after navigating away and back; the greeting again after `beginUserChange`
          records a sign-in
        - Test: the loading state until the session and watchlist reads first settle
        - Test: a failed watchlist read shown in its section's failed state under the greeting, and its Retry
          showing that section's placeholders with the greeting and what's on still in place
        - Test: an empty watchlist shows "Welcome, {name}", "Films you add to your watchlist will show up here." and
          both what's on sections; the hidden "Home" and the line after navigating back; the set held after the
          visitor saves a first film
        - Expect tests to FAIL initially

    - [ ] **4.3.b Build the greeting and signed-in Home's composition**
        - The greeting is held in memory: the change count it greeted at, compared with `getChangeCount()`
          (`lib/session.ts`), so `beginUserChange` clears it and nothing is stored
        - The name from the session's user, `first_name` or else `username`; the hidden `h1` with `VisuallyHidden`
        - A stored sign-in is `authenticated` before the session read lands, while `user` is still `null`; Home
          stays in its loading state until the session read and the watchlist read have each settled once; the
          set (the visitor's sections or nothing-saved) is chosen then and held in component state while Home shows;
          a Retry never returns the page to loading; `status` turning `anonymous` drops the signed-in page
        - Replaces the interim signed-in form from 3.1
        - Tests should now PASS

- [ ] **4.4 Signing in shows no welcome toast — R23**

    **Goal:** Neither the password sign-in nor a Google or GitHub return shows "Welcome back", and both still land
    where they did.

    **Check:** `sign-in.spec.ts` and `phone-width.spec.ts` (the password sign-in).

    - [ ] **4.4.a Update the sign-in tests**
        - `Login.test.tsx`'s "returns there after a password sign-in" also shows no "Welcome back" toast
        - `useAuth.test.tsx`'s two provider-return cases keep their navigation checks and assert no "Welcome back"
          toast (around lines 1091 and 1152)
        - Expect the new assertions to FAIL initially

    - [ ] **4.4.b Remove the toast from `Login.tsx` and `useAuth.ts`**
        - `Login`'s `onSubmit` success and `useAuth`'s provider-return branch; the navigation stays
        - `LoginSuccessData` and `login()`'s `displayName` existed only for the toast: `login()` returns
          `AuthResult<void>` as `register()` does, and `useAuth.test.tsx`'s assertion of it (around line 362) follows
        - `AuthResult`'s JSDoc in `src/types/auth-state.ts` (line 20) drops "displayName for login, void for
          register", since every caller then takes `void`
        - Tests should now PASS

- [ ] **4.5 ADR-046 and the README describe the shipped Home — R29**

    **Goal:** A new ADR records Home's design, the four ADRs it supersedes in part point to it, and the README lists
    Home as built.

    - [ ] **4.5.a Write ADR-046, "Open Home on a classic film and sections of films", reading `Proposed`**
        - Decisions 1 to 4, 6 to 11 and 15, as § 8's ADR list gives them, from `adr-template.md`
        - Confirm 046 is still free on `main` (`git ls-tree origin/main .arc/reference/adr/`); the neighbouring
          user-movie units also plan ADRs

    - [ ] **4.5.b Point ADR-002, ADR-026, ADR-039 and ADR-044 at it**
        - Each Status section gains `Superseded in part by ADR-046 ({part})`, naming its part as § 8 gives it, beside
          any supersession it already names; the bodies stay as written

    - [ ] **4.5.c Move the landing page to "Built" in the root README**
        - A home page with a classic film and what's in theaters and coming soon, and the visitor's watchlist first
          once signed in; the status line stops naming a landing page as in development

    - [ ] **4.5.d Run criterion 15's search**
        - `.arc/reference`, outside the archive and the ADR bodies, and the root README: no current description of
          one pagination context for every movie request, of Back to Results as the only spec supplying its own
          responses on staging, or of the landing page as in development

- [ ] **4.6 Check signed-in Home in the browsable stack and the smoke tier** (scripted scenario, then
  `sign-in.spec.ts` and `phone-width.spec.ts`)

    **Goal:** The phase's exit criterion is shown on the running app and by the two specs, with what ran recorded.

    - Empty the worktree's dev account's watchlist from `/watchlist` first (`browse` keeps an existing account's
      films), then sign in afresh: Home greets it by name, with the nothing-saved line
    - Add a film the account has never saved from "Popular in theaters" (a film saved before keeps its place, R21),
      reload: "Your watchlist" leads with it as the large card
    - Open Films and come back by the wordmark: no greeting, the sections at the top
    - Add a second never-saved film: it takes the large card's place, the first moving into the row; check both
      widths

### **Phase 5:** Home is ready to merge

_Mode:_ `slice` — closes on Home composing with what `main` holds at merge, and showing the Owner's films.

_Exit criterion:_ with `main` merged in, regenerating the API types leaves no diff, each R30 condition's result is
recorded, and the three changed smoke specs pass.

- [ ] **5.1 The Owner's films replace the provisional list — R3**

    **Goal:** The hero's list is the Owner's, and each film on it is signed off in the built hero in both modes.

    - [ ] **5.1.a Replace `FEATURED_FILM_IDS` with the Owner's list**
        - The Owner chooses the films and settles the list's size (R3); ask for the list if it isn't in hand, and stop
          until it is
        - Each ID looked up and its title and year confirmed as 1.1.c does; no test changes
    - [ ] **5.1.b Show each film to the Owner through `/?film={tmdb_id}`, in light and dark mode**
        - The browsable stack's development build and its `DEBUG` server; the still reads behind the gradient and the
          credit fits above the headline; a film that fails comes off the list

- [ ] **5.2 Checkpoint on the user-movie tracking model before merging `main` — R30**

    **Goal:** The Owner decides whether to wait for `technical/user-movie-tracking` before this work takes `main`.

    - Check its state: its pull request (`gh pr list --head technical/user-movie-tracking --state all`) and its
      session notes; ask `project-manager.CX` when it is expected to merge
    - Bring the Owner what it changes here: the API schema (R30a), the Library's `added` order (R20 reads it with no
      change) and the shared frontend layer its draft says Home draws; R30b also needs the Library's Activity tab,
      which the Library's unit delivers, so the tracking model alone doesn't bring "Recently watched"
    - Stop for the Owner's decision; record it here

- [ ] **5.3 Merge `main` and regenerate the API types — R30**

    **Goal:** The branch holds `main`, and the frontend's API types match the merged backend.

    - [ ] **5.3.a Merge `origin/main` into the branch**
        - Fetch first; resolve conflicts in shared files (`MovieCard.tsx`, `queries.ts`, `userMovieService.ts`, the
          API types) keeping both sides' behavior, R26's rule included
    - [ ] **5.3.b Regenerate `frontend/openapi.json` and `frontend/src/types/api.ts` from the merged backend**
        - The movie and Library tests run against the merged code

- [ ] **5.4 Apply what `main` holds — R15, R30**

    **Goal:** Each of R30's conditions is checked against `main`'s code at the merge, and its change is made only when
    it holds.

    - [ ] **5.4.a Recently watched, if `main` has the Library's Activity tab and the tracking model's list of
      viewings**
        - Check both against `main`'s code, then ground R15 in them: the viewings list and its read, the rewatch icon
          and the read-only star display
        - Tests first, per criterion 16: "Recently watched" as R15 gives it, between the watchlist and what's on (R18),
          its read joining R22's, the nothing-saved set counting viewings, and a failed read with no "Server error"
          toast, a `Toaster` mounted; expect them to FAIL initially
        - Build the diary form and the section; the viewings read takes `homeReadOptions` through request options on
          its fetcher, as 1.3 gives `getUserMovies`; the tests should now PASS
        - Mark `[~]` with what `main` lacked when the condition fails
    - [ ] **5.4.b Named card buttons, if `main`'s `MovieCard` names and wires its watched and liked buttons**
        - Tests first: 2.5.a's and 2.6's copy assertions take R30c's line and band point; expect them to FAIL
        - Change the copy; remove the three `button-name` entries (R28); keep `main`'s form of the signed-out rule
          where it differs; the tests should now PASS
        - Mark `[~]` when the condition fails
    - [ ] **5.4.c The queue, if `main` orders the watchlist as a queue on the Library's Watchlist tab**
        - Tests first, per criterion 16: the watchlist read sends the queue's sort value and direction as the
          Watchlist tab does, the section reads "Up next" and leads with the queue's first film, and the large card
          links "Reorder" to `/library/watchlist`; expect them to FAIL
        - Add `sort` and `direction` to `UserMoviesQueryParams` and make the change; the tests should now PASS
        - Mark `[~]` when the condition fails
    - Repeat 5.3 and this task if `main` moves before the pull request merges (criterion 16 reads the final merge)

- [ ] **5.5 Check Home over the merged code** (generate the API types, then run `background.spec.ts`,
  `sign-in.spec.ts` and `phone-width.spec.ts`)

    **Goal:** The phase's exit criterion is shown on the merged branch, with what ran and each R30 result recorded.

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1)

## Implementation Notes

- **The interim signed-in Home (3.1 to 4.3)** is deliberate: the three specs change once, in 3.2, the task that
  routes `/` to Home, and the signed-in specs' wait for "Popular in theaters" holds from then on.
- **`scanPage` counts `h1`s, hidden ones included,** and expects one (`e2e/axe.ts`). Home's loading state has none,
  so a spec scans only after its heading wait.
- **Page routes win over the fixtures' context routes** in Playwright, which is how `useRestoreCatalogue` and
  `useHomeCatalogue` stub reads on both targets.
- **The test query client retries nothing and keeps every query** (`tests/helpers/test-providers.tsx`), so the hero's
  lifetime options are checked on the options object, and a failed read shows its state without the retry delay.
- **`MovieCard` copies the page's query string into its links,** dropping only pagination; on `/?film=` in a
  development build its links carry `film` too, which the movie page ignores.
- **The module-level `_movie_service` in `api.py` is built at import,** so the endpoint tests replace TMDB at the
  client's class path, and the chooser is replaced in the service tests, where `MovieService` is constructed.
- **The browsable stack runs its backend with `DEBUG` on** (`backend/config/.env`), so `/?film=` serves any film
  there, for 3.3 and 5.1.b.
- **The neighbouring user-movie units** are separate work units (tracking, controls, Library, then the queue). The
  tracking model lands first, changes the API schema and the Library's `added` order, and its draft lands shared
  frontend pieces Home draws; 5.2 checks its state before `main` merges in.

---

## Success Criteria

### Implemented

- [ ] 1. Backend tests, with TMDB replaced at its client and the random choice replaced, show `GET /movies/featured`
  answering without authentication with `tmdb_id`, `title`, `release_date`, `backdrop_path` and `tagline`; the film
  the choice picks from the list; with `DEBUG` on, an ID passed as `film` served, whether or not it is on the list;
  with `DEBUG` off, a `film` ignored for the choice's pick; one TMDB detail call per request and no credits call;
  an empty tagline returned as `null`; and a failed TMDB call answered 502 and an unknown ID 404, each with
  `{"detail": ...}`. They show `MovieDetailSchema` carrying `backdrop_path` and `tagline`.
- [ ] 2. Component tests show Home at `/` in the loading state with no `h1` and no pitch while `status` is `resolving`,
  the signed-out page while it is `anonymous`, the signed-in page while it is `authenticated`, and Home switching when
  `status` changes; signed-out Home rendering the hero, "Popular in theaters", "Most anticipated" and the band, in
  that order, with no card actions; and `routing.test.tsx` shows `/featured` redirecting to `/` and rendering Home.
- [ ] 3. Component tests show the hero's `h1`, line and actions before its read settles; once it settles with a film,
  the credit naming the title and year, with the tagline when present, linking to the film with `from=home`; the
  pitch and actions with no credit, no image and no "Server error" toast when the read fails, when `backdrop_path` is
  `null` and when the image fails to load; the same film after navigating away from Home and back, with no second
  read; the hero's query options never stale, with `gcTime: Infinity` and no refetch on mount, focus or reconnect,
  checked on the options themselves, since the test client already keeps every query; and, in a development build,
  Home at `/?film={tmdb_id}` passing that ID to the read.
- [ ] 4. Component tests show each section form but the band with its title and placeholders while loading, absent
  with no films, and failed with its title, "Couldn't load these films." and Retry, which refetches that section's
  read alone; no "Server error" toast on a failed section, while a failed read on the watchlist page still raises it;
  each section as a `section` named by its `h2`; and `PosterPlaceholder` for a film without a `poster_path` in a row,
  in the calendar and on the large card.
- [ ] 5. Component tests of the poster row, with the list's scroll measurements supplied since jsdom does no layout,
  show at most 20 cards in a list; "Previous films" disabled at the start and "Next films" at the end, and both when
  the list doesn't overflow; Next scrolling by the visible width, smoothly, and instantly under reduced motion; and
  "See all" present or absent with its destination.
- [ ] 6. Unit tests of the calendar's grouping show the first 20 films taken; a Monday's and a Sunday's release in the
  same week and a Friday's in its own; the first four weeks with films, an empty week skipped; up to three films a
  week with three as the cap and up to two with two, each with "and N more" counting the rest of that week among the
  20; and the heading "Week of November 16" for a week whose Monday is November 16. Component tests show each entry's
  weekday and day, its first genre or none, and its link with `from=home`.
- [ ] 7. Component tests show the large card's poster, title, year, runtime when present, genres and overview, its
  link with `from=home`, no card actions, and the card alone with one film on the watchlist; and signed-out Home's
  band, under its hidden heading, with R14's three points.
- [ ] 8. Component tests of signed-in Home show no hero, and its sections in R18's order with the watchlist's first
  film as the large card and the rest in its row, read with `watchlist`, page 1, 20 films and the default `added`
  sort, newest first; the greeting "Welcome back, {first name}", and the username when no first name is set, on the
  first render after load; the visually hidden "Home" after navigating away and back; the greeting again after
  `beginUserChange` records a sign-in; "Welcome, {name}", the nothing-saved line and both what's-on sections for a
  visitor with an empty watchlist, and that set held after the visitor saves a first film; the loading state until
  the session and watchlist reads first settle; a failed watchlist read shown in its section's failed state under the
  greeting, and its Retry showing that section's placeholders with the greeting and what's on still in place; a film
  added from what's on taking the large card's place; and a film removed from the watchlist leaving the section.
- [ ] 9. Tests show no "Welcome back" toast after a password sign-in (`Login`) or a Google or GitHub return
  (`useAuth`), and `useAuth.test.tsx`'s provider-return cases still checking where the return navigates.
- [ ] 10. `apiClient.test.ts` shows the catalog's list requests carrying the tab's pagination context, Home's section
  requests carrying a different one, and the interceptor keeping a context the caller set.
- [ ] 11. Tests show the movie page's back link reading "Back to Home" and opening `/` for `from=home`, and every film
  link on Home and the hero's credit carrying `from=home`.
- [ ] 12. `MovieCard.test.tsx` shows no card actions while `status` is `anonymous` or `resolving`, and the watchlist
  toggle working signed in; `VirtualizedMovieGrid`'s tests pass with its row spacing unchanged.
- [ ] 13. The smoke tier passes locally with seven specs: `background.spec.ts` waiting for the headline with Home's
  three reads stubbed, `sign-in.spec.ts` and `phone-width.spec.ts` waiting for "Popular in theaters" after signing in,
  and the axe scans passing with the `button-name` entries for `/browse`, `/search` and `/`, each with its reason, or
  without them where R30c applies (criterion 16).
- [ ] 14. In the browsable stack at 1280×800 and 360×800, in light and dark mode, checked by hand: the hero and the
  band spanning the viewport with no sideways scroll, and Home's other sections at every page's width; the wide hero
  keeping its height with and without a film, and the phone hero holding the backdrop's space while the read is
  pending and releasing it when the image fails; the calendar showing weeks side by side with up to three films at
  1280 and stacked with up to two at 360; row cards 194px wide at 1280 and no narrower than 138px at 360; every row
  scrolling by its buttons, by swipe (touch emulation) and by Tab through its cards; scrolling instant with reduced
  motion emulated; and nothing on Home drawing a color outside its theme roles. The Owner's list has replaced the
  provisional one, and the Owner has signed off each film on it in the built hero, in both modes, through `/?film=`
  (R3).
- [ ] 15. A search of `.arc/reference`, outside the archive and the ADR bodies, and of the root README finds no
  description of one pagination context for every movie request, of Back to Results as the only spec supplying its
  own responses on staging, or of the landing page as in development, as current; ADR-002's, ADR-026's, ADR-039's and
  ADR-044's statuses name ADR-046 as superseding them in part, each with its part named, and ADR-046 reads
  `Accepted`.
- [ ] 16. R30's changes, each where its condition held at the final merge of `main`: the API types match the merged
  backend (CI's type-drift check passes); with the Activity tab on `main`, component tests show "Recently watched" as
  R15 gives it and the nothing-saved set counting viewings; with named card buttons on `main`, the scans pass without
  the three `button-name` entries and the pitch's line and the band name watching, rating and liking; and with the
  queue on `main`, component tests show the watchlist read sending the queue's sort value and direction, "Up next"
  leading with the queue's first film, and the large card's "Reorder" link.

### Proven after merge

- [ ] 17. The pull request's end-to-end smoke job passes with the seven specs, and after merge the staging smoke run
  passes the six it runs (it skips sign-up), `background.spec.ts` with its stubbed reads. Staging serves `/` to a
  signed-out browser without a redirect: the address stays `/` and the page shows the headline.
