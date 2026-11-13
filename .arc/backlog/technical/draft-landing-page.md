# Draft: Landing Page

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-13

**Purpose:** Replace the stub home page with Home in two forms: signed out, a pitch led by a classic film of the
day; signed in, the visitor's own films first. Both are composed of sections in a few different forms (rows of
posters, a calendar of films opening soon, one film shown large, a band of text), so neither reads as a browse grid,
and a later Films hub reuses them. It is the third item of the ROADMAP's Stage 4 design track, after the palette and the
navigation shell, and it comes before the privacy and terms pages, since Google's app publishing and brand
verification need the homepage, privacy policy and terms live.

---

## Problem / Motivation

**The first screen shows no film.** `/` renders `Featured` (`frontend/src/pages/movie/Featured.tsx`): an `h1` reading
"Welcome to CineXplorer", one line of copy, and a card titled "Films" with three buttons into the catalog's windows. It
makes no request and looks the same signed in and out. A first-time visitor learns nothing about what the app does, and
a returning one sees nothing of their own.

**The homepage has outside readers.** Google checks the app's homepage when it publishes the OAuth app and verifies its
branding. Its app homepage requirements ask that the page represent the app and its brand, fully describe what the app
does, explain why the app requests user data, and link to the privacy policy named on the consent screen; that it be
hosted on a verified domain without redirecting elsewhere; and that it be visible without signing in. This work covers
the first two, the last, and serving the page without a redirect: the signed-out pitch at `/` names the app and says
what it does. The privacy policy's link and the line on why the app asks for data are the privacy and terms work's
(Scope Boundary), since the line must agree with the policy it publishes. The staging host already sits on a verified
domain, and the launch re-verifies the branding with the production host; this work keeps `/` serving the page itself,
with no redirect. The app asks Google only for the `profile` and `email` scopes, django-allauth's defaults with an email
required at sign-up: the visitor's name, profile picture and email address.

**What it should feel like.** The product principle applies here first: CineXplorer chooses, frames and orders what it
shows, like a cinema's program. A classic film chosen by hand fronts the page, not whatever tops a popularity chart this
week.

**What exists to build on.**

- **Film data.** TMDB's detail response already carries `backdrop_path` (on `TMDBMovieBase`) and `tagline` (on
  `TMDBMovieDetail`), but no schema passes either on: `MovieDetailSchema` and `MovieListItemSchema` have neither, and
  the stored `Movie` row (`backend/apps/core/models.py`) keeps card fields only. The detail endpoint,
  `MovieService.get_movie_by_id`, calls TMDB on every request: the details, then the credits.
- **Lists.** The catalog's windows are `GET /movies/browse`, `/movies/now-playing` and `/movies/upcoming`, each run
  through the data-quality filters and the page top-up. None is cached on the server. There is no trending endpoint.
  Coming soon covers theatrical releases opening 5 to 65 days from today, most popular first.
- **The visitor's films.** `GET /user-movie-data/movies` returns the Library, filtered by flag (`watchlist`, `watched`,
  `liked`, `rated`) and sorted (`added`, `watched`, `rating`, `title`, `release`), read from stored cards; the frontend
  reads it through `libraryQuery`. A stored card is taken from TMDB's detail response when the film is first saved:
  poster, title, release date, score, runtime, genre IDs and overview.
- **Cards.** `MovieCard` shows the poster, title, full release date and score, with the watchlist toggle working and the
  watched and liked buttons not yet wired. It shows all three to signed-out visitors too: the two unwired ones do
  nothing, and the toggle flips, is refused, flips back and shows a "Failed to update watchlist" toast. Nothing lays
  films out in a row: the catalog's grids are `VirtualizedMovieGrid` and `SequentialMovieGrid`. The frontend names
  genres from a constant map in `browseOptions.ts`, without a request.
- **Sign-in state.** `useAuthContext` gives `status`: `resolving`, `anonymous` or `authenticated`. Signing in shows a
  "Welcome back" toast, from `Login` on the password path and from `useAuth` on a Google or GitHub return.

## Alternatives

**Where the hero film comes from.**

- **A fixed list of classics, one a day (chosen).** About ten to twelve TMDB IDs kept in backend configuration and
  rotated by date. The same film all day, so it can be checked by hand and reads as chosen.
- **A random film from the list on each visit.** Livelier, but the page differs on every load, which makes it harder to
  check.
- **The week's top trending title.** No list to keep, but it gives up the identity the list provides, and some weeks the
  top title is a poor fit for the first screen.

**How the hero gets its data.**

- **The frontend picks the day's film and calls the detail endpoint.** Rejected: the list would live in the frontend,
  and every visit would pay the detail endpoint's two TMDB calls for a credits list the hero doesn't show.
- **Store the backdrop and tagline on `Movie` and serve the hero from the database.** Rejected: a migration and two card
  fields that no card shows, kept only for the hero, and `Movie` rows exist only for films someone has saved.
- **A small hero endpoint that reads the day's film from TMDB (chosen).** One TMDB detail call, a schema with only what
  the hero shows, and no stored state.

**What Home's sections of what's on show.** The approved wireframe has "Trending this week", then now playing and coming
soon. Since then, Home's sections took a rule: each one has "See all" into the catalog.

- **Sections that preview catalog views (chosen).** Each is the first page of a catalog view, titled the way the
  catalog's header titles that view, and "See all" opens that exact view: "Popular in theaters" into
  `/browse/now-playing`, "Most anticipated" into `/browse/upcoming`. The title says why the films are there, no new
  endpoint or cache is needed, and the visitor lands on a page whose header matches the section they left.
- **A trending section from TMDB's trending endpoint.** A new endpoint through the data-quality filters, with a cache.
  Its only frame is TMDB's activity, so the section can't say why a film is in it, where a window's title can ("in
  theaters", "coming soon"), with popularity, itself fed by activity, only ordering the films inside it. The catalog has
  no trending view either, so its "See all" would open the catalog's popular view under a different name, or be left
  out.
- **A trending window in the catalog.** Rejected: a fourth window is a change to the catalog, not to Home.

**Text over the hero's image.** No theme role exists for text over a photograph, and colors must come from theme roles.

- **Compose from existing roles (chosen, after a mockup in both modes).** A gradient of the page's `background` covers
  the text side of the backdrop and fades into the page below, so the text sits on `background` and keeps the contrast
  the palettes are already checked for, in both modes. The hero follows the mode like the rest of the page.
- **A dark hero in both modes.** Needs new roles for the scrim and the text on it, in the role types, every palette and
  the contrast check.

**What signed-in Home is for.**

- **A smaller copy of the Library or of the catalog.** Rejected: a personal list on Home competes with the Library, and
  rows of what's on alone repeat what Films shows everyone.
- **A quick look at what's next and recent, sending the visitor on (chosen).** Short sections from the visitor's lists,
  each opening the page that holds the whole list, and a little of what's on.

**How each page is composed.**

- **Rows of posters only.** One component, but a page of rows reads as the catalog's grid turned sideways.
- **Sections in a few forms (chosen, after a composition mockup).** Film sites that avoid that look mix poster rows with
  other forms: one film shown large, numbered lists, tiles, lists led by dates or text, and bands of text. Home takes
  four (decision 13): poster rows; a calendar for what's coming, grouping films by the week they open, since when they
  open is why those films are there and a row of posters, though each card shows its date, can't group them; the
  visitor's next film shown large; and a band of text. Numbered lists and genre and decade tiles suit the Films hub, not
  Home.

**Which watchlist film leads signed-in Home.**

- **The newest addition.** What the Library's default order puts first today, but not necessarily the film the visitor
  means to watch next.
- **The first film in the visitor's queue (chosen).** The film they plan to see next. Home shows the watchlist in the
  order the Library's Watchlist tab does, so it follows the queue once the watchlist can be ordered, and until then
  leads with the newest addition.
- **Reordering the queue on Home.** Rejected: the Library stays the one place the visitor sorts, filters or reorders
  their lists, and the large card links there to reorder.

**What's on for a signed-in visitor.**

- **What's in theaters only.** One section, but before "Recently watched" exists the page would end on two rows of
  posters in a row.
- **Both catalog sections, as signed out (chosen).** No extra build, since the signed-out page builds both; a different
  form to end the page on; and one rule for every visitor, a visitor with nothing saved included.

**A count under the greeting.** Rejected: the greeting shows only on arrival, so a line under it would come and go with
it.

**How signed-in Home opens.**

- **A greeting every time,** as on a member's home page that the visitor opens on purpose. Here Home is also the front
  door, reached by the wordmark from every page, so a greeting each time reads as a banner.
- **No visible heading.** Quick to the rows, but cold on arrival.
- **A greeting on arrival only (chosen).** It welcomes the visitor once per visit or sign-in, and later visits go
  straight to the rows.

**"Try the demo".**

- **The demo account's own work adds it (chosen).** This work leaves the primary slot of the hero's actions to that
  button: until the demo exists, "Create account" leads and "Sign in" follows, and the demo work puts "Try the demo"
  first without changing the layout. No link leads nowhere in the meantime.
- **Build the demo here.** A seeded account per visitor, a sign-in without a password, and a nightly purge: an account
  and authentication concern of its own, about 1–1.5 days, apart from the page.
- **Show the button disabled until then.** Rejected: a control that does nothing.

## Decisions

The decisions under Resolved are settled, and none is open.

### Resolved

1. **Home renders by sign-in state, at `/`.** While `status` is `resolving`, the content area shows a loading state
   rather than either form, so a returning visitor doesn't see the pitch flash first. Signed out (`anonymous`), the
   pitch; signed in (`authenticated`), the visitor's Home; Home follows `status` whenever it changes. Signing in from
   Home returns to Home, signed in, since Sign in returns to the page the visitor was on; signing out loads the sign-in
   page afresh (`useAuth`'s `logout`), so signing out never switches Home to the pitch in place. A stored sign-in counts
   as `authenticated` at once, before the session read confirms it (`useAuth`'s `initialStatus`); if that read fails,
   `status` turns `anonymous` and Home shows the pitch, as it follows `status`. `Featured` and its Films card are
   replaced, and `/featured` stays an alias that redirects to `/`; `routing.test.tsx`, which mocks `Featured` and
   expects it at `/` and after the redirect, checks the new Home instead, and `Featured.test.tsx` goes with `Featured`.
   ADR disposition: the new ADR in decision 2, which supersedes ADR-044 in part (the sentence giving the home page a
   Films section that offers the three windows).
2. **The hero is a film of the day from a fixed list of classics.** The list is TMDB IDs in a backend constant, changed
   through a pull request like the catalog's other presets. The day's film is the entry at the UTC date's ordinal modulo
   the list's length, so it changes at midnight UTC, as the catalog's newest-first default already counts "today" in
   UTC. The list itself is content, chosen by hand: each film is checked in the built hero, in both modes, before it
   joins the list. ADR disposition: a new ADR, ADR-046, "Open Home on a film of the day and sections of films", covering
   Home's two forms, the hero and the sections (decisions 1–6, 12 and 13).
3. **A hero endpoint serves the day's film:** `GET /movies/featured`, public, returning the TMDB ID, title, release
   date, `backdrop_path` and `tagline`, from one TMDB detail call through `get_movie_details` in a `MovieService`
   method. No server cache, like the catalog's list endpoints; on the client the query client's defaults apply (fresh
   for five minutes, refetched on a later visit). The detail schema gains the same two fields, `backdrop_path` and
   `tagline` on `MovieDetailSchema`, which the detail page's redesign uses. ADR disposition: covered by the new ADR in
   decision 2.
4. **The hero shows the pitch at once, and the film when it arrives.** The page's `h1` (the headline, "Track the films
   you watch. Find the next one."), one line saying what the app does, and the actions (decision 11) render without
   waiting for the film. When the hero's read settles, the film's backdrop fills the hero and its credit appears above
   the headline: the title and year, with the tagline when TMDB has one, linking to the film's page, with no label of
   its own. The credit, the headline, the line and the actions all sit on the gradient's solid part, where the text is
   on `background`. On wide screens the hero keeps one height whether or not a film arrives, with its text set at the
   bottom, so the credit grows upward and the headline and actions never move. On phones the backdrop sits above the
   text and fades into the page; its space is held while the read is pending, and released only when the read settles
   without a backdrop. If the read fails, or the image fails to load, or the film has no backdrop, the hero stays as the
   pitch and actions on the page background, without a film. The headline states what the app is for, so it stands
   whether or not every part of tracking has merged; the line and the band carry what works when this work merges. A
   band of text at the foot of the page (decision 13) says what a visitor can do, in three points, naming only what
   works when this work merges: browsing what's in theaters and coming soon, keeping a watchlist, and finding any film
   by search. Watched, rating and liking join the band and the pitch's line with the user-movie card controls, added by
   whichever of this work and that work merges second. ADR disposition: covered by the new ADR in decision 2.
5. **Rows of posters share one component.** A row has a title, an optional "See all" destination and a TanStack query
   that yields films. Every row in this work previews a catalog view or the visitor's own list, so each has "See all"; a
   later row with nothing to open, such as a curated collection, leaves it out. A row shows at most 20 films, each as
   `MovieCard`, so card actions added to `MovieCard` reach every row. `MovieCard` changes in one way: it shows no card
   actions to a signed-out visitor, so no control on the signed-out homepage does nothing or fails, and the catalog
   gains the same. Signed in, the watched and liked buttons stay unwired until the user-movie card controls wire them,
   as in the catalog today. The user-movie card controls adopt the same rule; whichever of the two merges second keeps
   that work's form of it. `MovieCard.test.tsx`'s watchlist cases render signed in. States: while loading, the title and
   placeholder cards hold the row's space; a row with no films doesn't render; a failed row keeps its title and shows a
   one-line message with a Retry button, so a visitor can tell a failure from an empty list. The row is a `section`
   named by its `h2`, with its films in a list. It scrolls sideways by swipe and trackpad, and by previous and next
   buttons that move a row's width and disable at the ends; keyboard focus moving through the cards brings each into
   view; nothing advances on its own, and scrolling is instant when the visitor asks for reduced motion. Poster rows are
   one of Home's four section forms (decision 13). ADR disposition: covered by the new ADR in decision 2.
6. **Signed-in Home is a quick look at what's next and recent for the visitor.** Each page keeps its own job: Films is
   the same program for everyone, personal only in the marks on its cards; the Library holds everything the visitor has
   kept and is the only place they sort, filter or reorder their lists; Home shows the top of the visitor's lists and a
   little of what's on, each section's "See all" opening the page that holds the whole list, and never sorts, filters or
   reorders. A card's own actions, which mark one film, are offered on Home as wherever cards show. There is no hero.
   What it shows, in order:
   - the visitor's watchlist, titled "Your watchlist", in the order the Library's Watchlist tab shows it: the first film
     as a large card, the rest as a poster row (decision 13), "See all" into `/watchlist` (the bar's Library link, until
     the Library page replaces it). Today that order is the Library's `added` order, newest first, so the newest
     addition leads. `ordered_for_library` sorts `added` by the record's `created_at` today; the user-movie tracking
     model changes it to when the film joined that list, which Home reads unchanged. Once the watchlist can be ordered,
     the tab shows the visitor's queue, and so does Home: the section reads "Up next", the first film in the queue
     leads, and the large card links to the Library's Watchlist tab to reorder, since the queue is ordered only there.
     Whichever of this work and the queue's work merges second makes that change: the section's order, its title and the
     link;
   - "Recently watched", as a diary (decision 13): the visitor's five most recent logged viewings, read from the
     user-movie tracking model's list of viewings, "See all" into the Library's Activity tab (`/library/activity`),
     which lists every viewing newest first. Whichever of this work and the Library merges second adds it;
   - what's on, as every visitor sees it (decision 12).

   **The greeting.** A greeting is the page's `h1` when the visitor arrives: the first time signed-in Home renders after
   the app loads (a new visit, a new tab or a reload) or after the visitor signs in. It reads "Welcome back, {name}",
   with the account's first name, or its username when none is set, and stays while the page is shown. Coming back to
   Home by navigating within the app shows no greeting: the `h1` is visually hidden ("Home") and the sections start at
   the top. Whether the visitor has been greeted is held in memory for the loaded app and cleared whenever the signed-in
   user changes (a sign-in, a sign-out or a session that ends, as `session.ts`'s change count, which `beginUserChange`
   advances, records), so a visitor who signs in again on another page is greeted on reaching Home; nothing is stored.
   Signing in no longer shows a "Welcome back" toast, on the password path (`Login`) or the Google and GitHub return
   (`useAuth`): Home's greeting welcomes a visitor who arrives there, and elsewhere the account menu shows they're
   signed in. `useAuth.test.tsx`'s two provider-return cases keep their checks of where the return navigates and drop
   the toast's, since the same branch does both.

   **The visitor's reads decide the page.** While the session read (which carries the name the greeting uses) or the
   watchlist read is pending, Home stays in its loading state, as it does while `status` resolves; once "Recently
   watched" exists, its read joins them. If either list's read fails, Home shows the visitor's sections with that one in
   its failed state (title, message, Retry), greeted "Welcome back". A visitor with nothing of their own to show (no
   films on the watchlist and, once "Recently watched" exists, no logged viewings) is greeted "Welcome, {name}", sees
   one line saying the films they add to their watchlist will show up here, then what's on (decision 12), so Home opens
   with more than one section of films. Which set shows is chosen when the reads settle and holds while Home is shown,
   so saving a first film doesn't rebuild the page under the pointer; the visitor's own sections show from their next
   visit. If `status` turns `anonymous` while Home is shown, the held set is dropped with the signed-in page.

   Within the watchlist section, changes show at once, since a save refreshes the Library's read. Adding a film from a
   card in what's on puts it first when it is the newest addition: today, a film the visitor has never saved anything
   about, since `added` follows the record's creation and a film saved before keeps its place; once the tracking model
   records when a film joined the list, every film added. It then takes the large card's place, and the card keeps one
   height (decision 13), so the swap doesn't move the page; it is accepted. The page does move when the section's row
   appears (a second film added) or goes (all but one removed), and when the whole section appears or goes: a visitor
   with logged viewings and an empty watchlist adds a first film, which brings the section in above, or a visitor
   removes the last film. Each follows the visitor's own action on a rare transition, and is accepted. Removing a film
   from the watchlist, from any card on Home that shows it, removes it from the section. On Home the last one can be
   removed only through a card in what's on that shows the same film, since the large card has no actions; the section
   then goes, the rest of the page stays as shown until the next visit, and that visit shows the nothing-saved set,
   unless "Recently watched" has logged viewings to show. ADR disposition: covered by the new ADR in decision 2.
7. **Home's sections never disturb a catalog view's duplicate tracking.** The backend tracks the titles a catalog view
   has returned per session, tab (`X-Pagination-Context`, one ID per page load from `getPaginationContextId`) and filter
   set, and clears that record on every first-page request (`fetch_with_filters_and_buffer`). A section on Home asking
   for the same view's first page in the same tab, a row or the calendar, would clear the record of a catalog view the
   visitor had scrolled, and on their return within the query client's five-minute `staleTime`, when the cached pages
   are shown without a refetch, its next page could repeat films already shown, since `useInfiniteMovies` doesn't
   dedupe. So each such request carries its own pagination context. `apiClient`'s request interceptor sets the header on
   the movie list endpoints today, over any value the caller passed, so the section's context has to survive it. Three
   places state one context per tab and change with it: `strategy-pagination.md` § Multi-Tab Isolation, the interceptor
   example in `strategy-service-layer.md`, and `apiClient.test.ts`, which asserts one shared context for every movie
   endpoint. ADR disposition: `none`, a tactical choice inside the existing pagination design.
8. **Films opened from Home lead back to Home.** Every film link on Home (its cards, the large card, and the calendar's
   and diary's entries) and the hero's credit carry `from=home`, and the movie page's back link reads "Back to Home" and
   opens `/`. Today `buildBackUrl` sends a missing `from` to `/browse/now-playing` and any unknown one to
   `/browse/{from}`, which would be a dead link. ADR disposition: `none`, a tactical choice.
9. **What this work builds takes theme roles, not a Chakra recipe's own colors,** including the row's controls, the
   hero's gradient, the band's background (`layer-01`) and the calendar's large week numerals (`tertiary`, a text role
   already checked for contrast on `background`); the Films card that drew Chakra's card colors goes with `Featured`.
   ADR disposition: `none`, obvious from code: DEVELOPMENT-RULES and `strategy-color-tokens.md` already require theme
   roles.
10. **The smoke tier keeps its seven specs, and three of them change.** `background.spec.ts` waits for "Welcome to
    CineXplorer" signed out and waits for the new headline instead. `sign-in.spec.ts` and `phone-width.spec.ts` sign in,
    land on `/` and wait for the same old heading; they wait for the "Popular in theaters" heading instead, which every
    signed-in Home shows, loading or failed, since the greeting's text varies with the account and its films. Locally,
    `fixtures.ts` fails a test on any `/api/movies` request without a fixture and aborts every request to another
    origin, so Home's new requests get fixtures there. `background.spec.ts` fails on any console error, which a failed
    response or image logs, and it also runs against staging, where `fixtures.ts` routes nothing; so it stubs Home's
    three reads itself on both targets, as `back-to-results.spec.ts` does through `useRestoreCatalogue`, with the day's
    film at `backdrop_path: null` and posters without images, and its color-mode checks never depend on live TMDB. The
    other specs read live TMDB on staging. `MovieCard`'s watched and liked buttons have no accessible name, which
    `axe-baseline.ts` excuses on `/browse` and `/search`. Cards show no actions signed out (decision 5), but both routes
    are also scanned signed in: `phone-width.spec.ts` signs in, then scans `/browse` and `/search` (`browse.spec.ts`,
    `back-to-results.spec.ts` and `movie-detail.spec.ts` scan `/browse` signed out). So both entries stay, their reason
    now the signed-in cards, and signed-in Home, scanned by `sign-in.spec.ts` and `phone-width.spec.ts`, takes the same
    entry for `/`; the user-movie card controls remove all three when they name the buttons. Two documents describe the
    staging target's one self-stubbing spec and gain `background.spec.ts` beside it: `strategy-testing-methodology.md`'s
    `staging` bullet and TECHNICAL-OVERVIEW § 7's Targets. ADR disposition: a dated amendment to ADR-039, whose Decision
    names Back to Results as the spec that supplies its own responses in both targets, adding `background.spec.ts` and
    its reason (its console checks must not depend on live TMDB); the rest follows ADR-039's tier and baseline policy
    unchanged.
11. **The hero's actions leave the first place to the demo.** Until the demo account exists, "Create account" leads and
    "Sign in" follows as a link. The demo account's own work puts "Try the demo" first, "Create account" second and a
    line saying the demo needs no sign-up, without changing the hero's layout. ADR disposition: `none`, a temporary
    arrangement until that work lands.
12. **What's on comes from catalog views, the same for every visitor.** What's in theaters (`/browse/now-playing`) as a
    poster row, then what's coming (`/browse/upcoming`) as a calendar (decision 13), signed in or out. Each reads the
    first page of its window in the catalog's default order, popularity: the row shows it in that order, and the
    calendar groups it by week. Each is titled as the catalog's header titles that view ("Popular in theaters", "Most
    anticipated"), and its "See all" opens that view. There is no trending endpoint. The hero's and sections' requests
    opt out of `apiClient`'s global "Server error" toast (`shouldReportServerError`), since each shows its own fallback.
    ADR disposition: covered by the new ADR in decision 2; ADR-026, whose Decision names a Redis cache for "the landing
    page's trending list", takes a dated amendment pointing to the new ADR.
13. **Home is composed of four section forms.** Signed out: the hero, "Popular in theaters" as a poster row, "Most
    anticipated" as a calendar, then the band. Signed in: the greeting, the watchlist (a large card leading a poster
    row), "Recently watched" as a diary once the Library exists (decision 6), then the same two sections of what's on.
    Each section is a `section` named by its `h2`. Each form but the band has the row's states (decision 5): while
    loading, its title and placeholders hold its space; with no films it doesn't render; when its read fails it keeps
    its title and shows a one-line message with Retry.

    - **Poster row:** decision 5.
    - **Calendar.** "Most anticipated" reads Coming soon's first page (most popular first, with its own pagination
      context, decision 7) and takes its first 20 films, the same cap as a row, since a page the backend tops up can
      hold up to 39 (ADR-038). It groups them by the week each film opens, Monday to Sunday, so a Friday opening keeps
      its weekend. It shows the first four weeks that have films, in date order; a week without films is skipped. Each
      week is headed by an `h3` ("Week of" and its Monday's day and month) over a list of up to three films on wide
      screens and two on phones, in popularity order, with "and N more" as plain text when it has others among the 20,
      since "See all" opens the whole window. Each film shows a small poster, its title, its release day and its first
      genre, named from the frontend's genre map. The weeks sit side by side on wide screens and stack on phones. TMDB's
      release dates are calendar dates, grouped without a time zone.
    - **Large card.** The watchlist's first film (decision 6) shows its poster, title, year, runtime when TMDB has one,
      genres, and overview (cut to a set number of lines at each width, so the card keeps one height whichever film
      leads), linking to the film's page. Like the calendar's and diary's entries, it carries no card actions: the
      film's page has them, and giving the card the poster card's actions is planned follow-up work. The rest of the
      watchlist follows as a poster row's scrolling list under the same heading, with the row's previous and next
      buttons in the section's header; with one film on the watchlist, the card shows alone. The card's loading and
      failure are the watchlist read's (decision 6).
    - **Diary.** "Recently watched" lists the visitor's five most recent logged viewings, newest first, one entry per
      viewing, so a film seen twice can appear twice and the section is the top of the Activity tab its "See all" opens.
      Each entry shows its date, the rewatch icon (a circular arrow named "Rewatch") beside the date when the viewing is
      marked as a rewatch, a small poster, the title and year, and the viewing's rating in the read-only star display.
      The user-movie tracking model provides the icon and the star display, shared with the Activity tab and the film
      page, and the section reads that work's entries, so both exist before it can be built. Whichever of this work and
      the Library merges second builds it (decision 6).
    - **Band.** Decision 4's three points across the page's full width on the `layer-01` background, just above the
      footer, on signed-out Home only. It needs no read, so it has no loading or failed state.

    Numbered lists and genre and decade tiles suit the Films hub (decision 14), not Home, and this work builds neither.
    ADR disposition: covered by the new ADR in decision 2.
14. **The Films hub follows as its own work.** A sketch beside the composition mockup gives it this work's poster rows
    and calendar, plus a numbered top-ten list and genre and decade tiles that open the catalog already filtered, which
    the catalog's address supports (`genres`, `minYear`, `maxYear`). It is sized medium, about 1–1.5 days once this
    work's poster row and calendar exist; its own draft settles its sections. ADR disposition: `none`; it orders
    delivery and decides nothing about the system.

### Open

None.

### Success signal

Signed out at `/`, at desktop and phone width, the page shows the pitch at once and the day's film behind it when it
arrives, its credit linking to the film, the headline as its one `h1`, the actions, "Popular in theaters" as a row and
"Most anticipated" as a calendar grouped by week, each with a working "See all", and the band; with the hero's read
failing, the pitch and actions still render, with no error toast. The calendar shows at most four weeks and three films
a week (two on phones), counting the rest. Signed in, a greeting heads Home on arrival and not after navigating back
within the app, and no sign-in toast appears; the visitor's watchlist leads, its first film as the large card, and the
same what's on follows; a visitor with nothing saved is welcomed and sees what's on. Every row scrolls by its buttons,
by swipe and by keyboard focus. An empty section is absent, and a failed one says so with Retry. Signed out, cards show
no actions. A film opened from Home leads back to Home. The day's film changes at midnight UTC and holds all day. The
smoke tier passes with the three changed specs and the baseline entry for `/`.

### Boundary fit

Stays one work unit. The hero endpoint serves this page, the two detail fields come from the same TMDB response, and the
two forms of Home share the section forms. The demo account is a separate concern (accounts and sign-in) and stays its
own work (decision 11), and so is moving the app's other toasts inline. The forecast is about 2,500–4,200 changed lines
in four or five phases, well under this project's size marks (a PRD near 1,500 lines, a task list near 1,000 lines or
past six phases, a change near 10,000 lines).

### Next

Formalize into the PRD.

## Unknowns and Assumptions

- **The list of films is still being chosen.** The mechanism doesn't depend on it: the list is data, and a starter list
  lets the build proceed.
- **Each listed film's TMDB backdrop is assumed to stay suitable.** The still behind the hero is TMDB's primary backdrop
  for the film, which TMDB's contributors can change. The gradient keeps the text legible whatever the image; a film
  whose still stops reading well is swapped out of the list.
- **A first visit starts a session per row request.** Each list request from a visitor without a session creates one
  (`_create_dedup_tracker`), so parallel row requests on a first visit can create two or three, of which the browser
  keeps the last. The catalog already does this, one request at a time; the nightly `clearsessions` removes expired
  ones.
- **Axe can't measure text over an image.** It leaves such text for manual review rather than failing it, so decision
  4's contrast holds by construction: all the hero's text, the credit included, sits where the gradient is opaque
  `background`.
- **The user-movie card controls change `MovieCard` in parallel.** Rows use `MovieCard`, so the card actions that work
  adds reach Home's rows without change here. This work's one change to it, hiding card actions from signed-out
  visitors, is a rule that work adopts too; the second to merge takes `main` first and keeps that work's form of it.
- **The queue's work is assumed to expose its order through the Library.** Home reads the watchlist in the order the
  Library's Watchlist tab shows it (decision 6), which assumes the queue's work, whose order field and reorder endpoint
  are its own design, gives the Library endpoint that order as a sort.
- **The calendar's shape changes from week to week.** Coming soon's most popular films can bunch into a few weeks or
  spread across two months; showing the first four weeks with films, at most three each, bounds it either way, and a
  quiet season shows fewer weeks. Two consequences follow: "and N more" counts the others among the 20 the calendar
  takes, not every film opening that week, and the most popular film can open after the fourth week shown. The title
  still names the view "See all" opens, where every film appears.

## Scope Boundary (Won't Do)

- **The demo account** and its sign-in, seeding and nightly purge (decision 11).
- **The Films hub:** a page composed of this work's section forms and its own, after this work (decision 14). Until it
  exists, Films opens the catalog.
- **The user-movie tracking model, card controls and Library:** the list of logged viewings, card actions, the Library
  and its Activity tab are theirs; "Recently watched" is added by whichever of this work and the Library merges second
  (decision 6).
- **The poster card's actions on the large card:** planned follow-up work, once the user-movie card controls settle
  those actions; until then the card links to the film's page (decision 13).
- **The watchlist's queue and its ordering:** the queue's own work; Home reads the order it sets (decision 6).
- **The app's other toasts:** sign-in progress and errors, registration progress, and the verified and signed-out
  notices move inline as separate work, with a rule for when a toast fits.
- **The privacy and terms pages and their links** from the homepage and the footer: the next work, which also adds the
  homepage's line on why the app asks for Google sign-in data, since it must agree with the policy (Problem /
  Motivation).
- **The footer,** including its TMDB attribution, already in `Footer`.
- **The movie detail page's redesign:** it uses the two new detail fields, and this work changes only its back link.
- **Content beyond these sections:** curated collections, "this week in film history", trailers and where to watch.
- **Caching TMDB responses on the server.**
