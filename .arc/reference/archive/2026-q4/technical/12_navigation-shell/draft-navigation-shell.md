# Draft: Navigation Shell

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-11

**Purpose:** Replace the app's navigation with one top bar, present Browse, Now Playing and Upcoming as one film
catalog whose header says what is showing, and keep the shell standing while a page loads or fails. It is the
second item of the ROADMAP's Stage 4 design track, after the palette; the landing page builds inside it.

---

## Problem / Motivation

**Three navigation surfaces repeat the same links.** `NavBar` draws two rows on wide screens: the wordmark, search and
account menu, then a row with a LOG button and Profile, Watchlist, Library and Journal tabs from
`USER_NAVIGATION_ITEMS`. `AppLayout` adds `Sidebar` beside every page on wide screens, and on phones
`MobileMenuButton` opens the same `SidebarContent` in a drawer (`sidebarDrawer`). `SidebarContent` lists the user
links again, then Featured, Browse, Now Playing and Upcoming from `MOVIE_VIEW_NAVIGATION_ITEMS`.

**Links lead nowhere, and every visitor sees them.**

- Library and Journal have no route in `App.tsx`, so they open the 404 page.
- Log does nothing: every Log entry is an action rather than a link, `NavBar`'s `handleLogClick` is empty,
  `NavBarUserMenu`'s only closes the menu, and the sidebar's only writes a debug log.
- Neither the tab row nor the sidebar checks sign-in, so signed-out visitors see Profile, Watchlist, Library, Journal
  and LOG.
- Featured links to `/featured`, which redirects to `/`, and both `NavBar` and `SidebarContent` mark the current page
  by an exact path match, so Featured is never shown as current.

**The pieces fall short on accessibility.**

- `NavBar`'s wordmark is an `h1` on every page. The catalog (`GridHeader`) and the home page (`Featured`) add their
  own `h1` beside it, while the movie detail, watchlist and sign-in pages have no `h1` but the wordmark.
- `NavBarUserMenu`'s dropdown is hand-built: no menu roles, no `aria-expanded`, and Escape doesn't close it.
- `NavBarSearch`'s input is named only by its placeholder, with no label of its own.
- The sidebar's listbox has no accessible name and holds a separator it may not contain. `axe-baseline.ts` carries
  six exceptions for it, on `/`, `/browse` and `/movie/:id`.

**A failing page takes the whole app down.** In `App.tsx`, `ErrorBoundary` sits outside `BrowserRouter`, and one
`Suspense` with `LoadingLayout` as its fallback wraps every route and layout. A render error replaces the whole
app, top bar and footer included, until "Try Again"; nothing resets it on navigation. On a first visit, the
fallback is a full-page spinner with no top bar (`LoadingContent` in its `layout` mode).

**Browse, Now Playing and Upcoming are one catalog, but the pages don't say so.**

- All three render through one `MovieCollectionLayout`. `getFetcherAndSource` picks the list from the path, and the
  backend's `get_now_playing_movies` and `get_upcoming_movies` add a theatrical release window (30 days back to 5
  ahead, and 5 to 65 days ahead) to the same discover call that `/browse` makes with no window. The two windows also
  skip the minimum vote count that `/browse` sets by sort and filters (`VoteCountPolicy`), though
  `build_tmdb_params` still asks TMDB for 3 votes on rating sorts.
- Order is separate from the window: `DEFAULT_SORT` is popularity, and `SortDropdown` offers the same sorts on all
  three, disabling only Highest Rated on Upcoming.
- The header (`GridHeader`'s title, from `getFetcherAndSource`) reads "Browse", "Now Playing" or "Upcoming". It names
  neither the window nor the order, so the default view reads as every film in an arbitrary order rather than a
  place with a purpose.

**What it should feel like.** CineXplorer should feel chosen and framed, like a cinema's program rather than a view
over a database's records. TMDB supplies the data; the app decides what to show and how to present it. The
navigation is the frame for that: it names a few places, each with a clear job.

## Alternatives

**How the bar reaches the catalog.**

- **A Browse menu** (Popular, Now playing, Upcoming), like TMDB's Movies menu. Clean, but "Browse" has no page of its
  own, and named lists drift from their names once the sort changes (TMDB's "Popular Movies" page offers a rating
  sort).
- **Flat links** for each list. Rejected: three items in the bar that open the same page.
- **One Browse link with tabs on the page.** Rejected: "Browse" would name both the link and the page, louder than
  what is showing.
- **One "Films" link into one catalog (chosen).** The link opens the catalog; the windows and the header live on
  the page. A future Films hub can take over the same link without changing the bar.

**What the catalog's default view is.**

- **A curated hub** of poster rows. Its rows overlap the landing page's unless signed-in Home becomes about the
  visitor's own films; both are other work (Scope Boundary).
- **The catalog sorted by popularity, named for it (chosen for now).** TMDB documents its popularity as a lifetime
  score fed mostly by each day's activity (votes, views, favorites and watchlist additions), so the default view leads
  with films people are engaging with now, wherever they are in their release.

**How lists keep their names honest.**

- **Fixed lists**, each owning its order (Popular, Top rated, In theaters, Coming soon), with no sort control. Simpler,
  but it removes free sorting.
- **One catalog whose header is built from what's selected (chosen).** Free filtering and sorting stay, and the
  header always matches.
- **A Top rated list.** Rejected: sorting by rating already gives it.

**Where the theme picker goes.**

- **The top bar.** Rejected: a palette picker that prominent reads as a portfolio showcase rather than a product.
- **The footer, as today (chosen).**

**How search is reached.** A field in the bar on wide screens and an icon on phones (chosen), rather than a "Search"
link to a separate page: the results page already exists.

**Where the Library link sits.** In the bar beside Films (chosen), one click from anywhere for the visitor's own
films, rather than in the account menu, which would keep the bar identical signed in and out but put the Library one
click deeper.

**What the phone drawer holds.** The bar's own links, Films and the Library (chosen), rather than the three windows,
which would be three links opening the same page and would change when a Films hub arrives.

**How the bar marks the current page.** An underline in the accent color (chosen), rather than a pale highlight
behind the label.

**How much the header names.** The window and sort alone would need only a fixed table, with the filters left to the
filter bar below. Naming the filters too (chosen) reads as a description of the selection, at the cost of a
composition rule (decision 7). It names only the language, genres and years, leaving the rating range and
certifications to the filter bar.

## Decisions

Readiness is `formalization-ready`: every design decision below is settled.

### Resolved

1. **One top bar replaces the two-row bar and the sidebar.** From left to right:
   - the wordmark, a link home rather than a heading. Each page's own title becomes its only `h1`, in every state
     the page shows: the movie detail page's title, "My Watchlist" (moved above the watchlist's loading, empty and
     error states) and the password-reset page's "Reset your password" and "Check your email" become `h1` headings,
     and the sign-in and registration pages, which show no title, gain a visually hidden one. Where a state replaces
     the title, its heading is the `h1`: "Movie Not Found", "Error Loading Movie" and the content area's error
     display. Brief loading states, which show no title yet, have none;
   - **Films**, then **Library** for signed-in visitors;
   - the search field;
   - at the right, **Sign in** when signed out, or the account menu (Profile, Sign out) when signed in. The menu is
     built on Chakra's `Menu`: it carries menu roles and `aria-expanded`, Escape closes it, and focus returns to its
     button.

   The sidebar and its drawer go. The bar marks the current page with an underline in the accent color and
   `aria-current`. ADR disposition: a new ADR, superseding ADR-002 in part: its Navigation Structure (Featured, Browse,
   Now Playing and Upcoming as separate items), the landing entries of its Routing Structure (`/` redirecting to
   `/featured`, and Featured in the navigation), and the matching items of its Frontend Implementation (the Featured
   stub at `/featured`, and `/` redirecting to it). The new ADR records `/` as the home page, with `/featured` an alias
   that redirects to it. It also supersedes ADR-039 in part (its Decision's list of five specs and its exclusion of
   mobile viewports), adding one phone-width spec of the shell to the browser smoke tier; the tier's descriptions in
   `strategy-testing-methodology.md`, `strategy-quality-gates.md` and TECHNICAL-OVERVIEW § 7 change with it.
2. **On phones the bar holds a menu button, the wordmark, a search icon, then the account menu or Sign in.** The menu
   button opens a drawer, built on Chakra's `Drawer`, with the bar's own links: Films and, for signed-in visitors, the
   Library. Escape closes it and focus returns to the menu button. The search icon opens a field over the bar with focus
   in it; Escape or its close button closes it and returns focus to the icon. The links sit in a drawer rather than the
   phone bar, even when signed out with only Films to hold: the four controls already fill a phone's width, the drawer
   has room for what arrives later (Log, the Library page), and it works the same signed in and out. ADR disposition:
   covered by the new ADR in decision 1.
3. **Every link opens a routed page, and links show only to visitors who can use them.** Journal goes. Settings leaves
   the account menu; deleting its route and page belongs to the Profile and Settings work. The Library link opens
   today's watchlist page and reads "Watchlist" until the Library page replaces it. Log and the demo account's "Try
   the demo" arrive with their own work. Production serves no development routes: the `/browse/sequential` reference
   page joins the `/dev/*` pages and `/testlogin` in development builds only. ADR disposition: `none`: the links are
   a temporary choice until those pages exist, and the gating is obvious from code, following the development-only
   routes already in `App.tsx`.
4. **Sign in returns visitors to the page they were on,** through the `loginPathFor` that `ProtectedRoute` already uses.
   `NavBarUserMenu`'s Login button sends no return path today. `safeReturnPath` refuses the sign-in pages as return
   paths, so on the sign-in page the bar's Sign in keeps that page's own `next`; the registration and password-reset
   pages carry none, so there it opens the sign-in page plainly. ADR disposition: `none`, a tactical choice.
5. **Browse, Now Playing and Upcoming become one catalog with three release windows:** All films, In theaters and
   Coming soon. The backend's presets stay as they are, and so do the URLs (`/browse`, `/browse/now-playing` and
   `/browse/upcoming`), which saved scroll positions, Back to Results and the smoke specs key on. There is no Top rated
   list. Until the landing page replaces it, the home page's "Browse Movies" section and its buttons take the
   catalog's names: Films, with All films, In theaters and Coming soon. ADR disposition: the new ADR in decision 1
   records the one catalog; ADR-002's browse routes and endpoints stand.
6. **The windows are tabs under the header, and switching keeps the filters that still apply:** genres, rating,
   certification, language and the sort. A window ignores what it fixes however the visitor arrives, by a tab, a link or
   a bookmarked or shared URL: In theaters and Coming soon remove the year range, and Coming soon resets Highest rated
   to the default sort (`SortDropdown` already disables it there), each rewriting the URL in place as
   `useMovieCollectionState` already does for A to Z without a language. In the filter bar, the disabled year field
   names the window ("Release Year (In theaters)", "(Coming soon)"). Each tab opens its own URL, so the tabs are links
   in a labelled `nav`, the current one marked with `aria-current`. The header and the tabs stay in place when a window
   has no results or fails to load. ADR disposition: covered by the new ADR in decision 1.
7. **The catalog's header names what is showing,** in place of "Browse", "Now Playing" and "Upcoming". The window and
   the sort set the title, and a language or genre fills its slot, `{films}`:

   | Window | Sort | No language or genre | With a language or genre |
   | --- | --- | --- | --- |
   | All films | Most popular | Popular films | Popular {films} |
   | All films | Highest rated | Highest-rated films | Highest-rated {films} |
   | All films | Newest | Newest films | Newest {films} |
   | All films | Oldest | Oldest films | Oldest {films} |
   | All films | A to Z | Not offered | {Films}, A to Z |
   | In theaters | Most popular | Popular in theaters | Popular {films} in theaters |
   | In theaters | Highest rated | Highest rated in theaters | Highest-rated {films} in theaters |
   | In theaters | Newest | Newest in theaters | Newest {films} in theaters |
   | In theaters | Oldest | Longest in theaters | {Films} longest in theaters |
   | In theaters | A to Z | Not offered | {Films} in theaters, A to Z |
   | Coming soon | Most popular | Most anticipated | Most anticipated {films} |
   | Coming soon | Newest | Coming soon, furthest out | {Films} coming soon, furthest out |
   | Coming soon | Oldest | Coming soon, soonest first | {Films} coming soon, soonest first |
   | Coming soon | A to Z | Not offered | {Films} coming soon, A to Z |

   `{films}` is the language, then the genres, then "films": "French-language films", "horror films", "French-language
   comedy and horror films". Genres are lowercase, with Animation read as "animated" and TV Movie as "made-for-TV",
   ordered alphabetically by those words and joined with "and"; with three or more, none is named, and without a
   language the title takes the first column. Highest rated isn't offered on Coming soon (decision 6), and A to Z only
   with a Latin-script language (`getAvailableSortOptions` in the menu, `useMovieCollectionState`'s reset for a URL), so
   A to Z always names one. On All films the years follow after a comma, both bounds included: a decade "1980s", one
   year "1994", a range "1975–1983", "since 1990", "through 1970". Examples: "Highest-rated French-language horror
   films, 1970s", "Popular films, 1980s", "Horror films longest in theaters". The rating range and certifications stay
   in the filter bar only, and In theaters and Coming soon, which fix the dates, never show years. Titles don't name the
   minimum vote count, which differs between `/browse` and the windows. Newest on All films puts films not yet released
   first, the order Coming soon calls "furthest out", since `addReleaseDateRange` sends no upper date without a year and
   `VoteCountPolicy` sets no vote minimum for newest-first; the title names the sort as the sort menu does, and keeping
   unreleased films out of All films belongs to the catalog's data layer. The search page keeps its own title. ADR
   disposition: covered by the new ADR in decision 1.
8. **"Films" opens the catalog's default view until a Films hub exists,** and then the hub; the bar doesn't change
   when the hub arrives. ADR disposition: covered by the new ADR in decision 1.
9. **The theme picker stays in the footer.** This work doesn't change `Footer`. ADR disposition: `none`, obvious from
   the code.
10. **Search keeps its results page.** The bar's field and the phone's search field submit to `/search?query=`, as
    `NavBarSearch` does today, and the field gets a label of its own rather than only a placeholder. ADR disposition:
    `none`, a tactical choice.
11. **Page loading and page errors render inside the shell.** A page that is loading or has thrown shows its state in
    the content area with the top bar and footer still in place. In-app navigation keeps React Router's default:
    `BrowserRouter` applies each location change inside a React transition, so the current page stays on screen until
    the next has loaded, and the loading state shows on a first visit and wherever the content area mounts afresh,
    such as arriving from the sign-in page. A page's error clears when the location changes, by resetting the content
    area's error boundary rather than remounting the content, which would discard the page's state and show the
    loading state for pages not yet loaded. The boundaries sit in `BaseLayout`, which the app's pages and the
    sign-in, registration and password-reset pages share through `AppLayout` and `AuthLayout`, so those pages load
    and fail inside the shell too. A last-resort boundary stays above the router for failures in the shell itself.
    ADR disposition: `none`, a framework convention.
12. **What this work builds or touches takes theme roles, not a Chakra recipe's own colors:** the bar, the menus, the
    drawer, the search field, the error display, and the catalog's filter bar, which `CollapsibleSubNav` fixes under the
    new bar at the `layout-navbar` offset and which carries filters between windows (decision 6). Focus indicators reach
    3:1 or better. The same check over the app's other components is separate work. ADR disposition: `none`, obvious
    from code: DEVELOPMENT-RULES and `strategy-color-tokens.md` already require theme roles.
13. **Dependencies are pinned to what lands first.** The work builds on the `@chakra-ui/react` release that its
    upgrade past 3.37 lands; Dependabot holds Chakra updates until UI compatibility is validated, and the PRD names
    the version. React Router imports stay on `react-router-dom`; moving them to `react-router` is separate work. ADR
    disposition: `none`, tactical.

### Success signal

On every page in the shell (the app's pages and the sign-in, registration and password-reset pages), signed out and
signed in, at phone and desktop width, the top bar is the only site navigation (the catalog's window tabs and filter
bar are its own navigation regions), every link in it opens a routed page, and once loaded the page's own title is its
one `h1`; production serves no development routes. The catalog's header names its window, its sort and the filters the
rule names, including when a window is empty or fails to load. A page that throws leaves the bar and footer in place
and clears when the visitor navigates away. The smoke specs pass with the sidebar's six axe exceptions removed and add
one phone-width spec of the bar, the drawer and the search field. Component tests check that Escape closes the account
menu, the drawer and the phone search field and returns focus to the control that opened each.

### Boundary fit

The bar, the drawer, the account menu, the catalog's header and windows, and the loading and error states are one
design: the Films link in the bar and the drawer opens the catalog, whose windows are its own states, and the shell's
height places the catalog's filter bar, fixed beneath it. It stays one work unit. Its forecast sits well under this
project's size marks (a PRD near 1,500 lines, a task list near 1,000 lines or past six phases, a change near 10,000
lines).

### Next

The PRD.

## Unknowns and Assumptions

- **What must keep working with the URLs unchanged** (decision 5):
    - `getFetcherAndSource` derives the list, its fetcher and its title from substrings of the path;
    - `MovieCard` writes `from` into detail links, and `BackToCollectionLink`'s `buildBackUrl` rebuilds `/browse`,
      `/browse/{from}` or `/search` from it;
    - `useScrollPersistence` keys saved positions by list and filters (`getScrollStorageKey`);
    - `ConnectedDropdowns`, `SortDropdown` and `YearSelector` compare the list name to constrain years and sorts;
    - `e2e/browse.spec.ts`, `back-to-results.spec.ts` and `movie-detail.spec.ts` visit `/browse` and assert on its
      URL and saved `scroll-` keys.
- **The smoke specs select by role and name.** `e2e/sign-in.spec.ts` finds the signed-out "Login" button, the account
  menu by username and its "Logout" item, and the home page's "Welcome to CineXplorer" heading. Renaming to "Sign in"
  and "Sign out" updates them, and on Chakra's `Menu` the Sign out item's role changes from `button` to `menuitem`.
  Removing the sidebar leaves its six `axe-baseline.ts` entries unmatched, which the reporter logs but doesn't fail
  on; they're removed. The specs run at one desktop viewport (1280×800), so the phone-width spec in the success signal
  is the tier's first (decision 1).
- **The bar's height feeds other components.** The `layout-navbar` token (`semantic-tokens.ts`) positions
  `CollapsibleSubNav`, the toaster and `FloatingAlert`; the development pages `LayoutDebug` and `ThemeDebug` read it
  too, and `LayoutDebug` reads the sidebar's token. `strategy-layout-tokens.md` documents a two-row 93 px bar and a
  280 px sidebar, so both the tokens and the strategy change. ADR-007's token approach stands.
- **States to keep.** `LoadingLayout` shows the shell with "Logging in with Google/GitHub" during an OAuth return.
  On that return `index.html` also shows a full-screen overlay that blocks clicks, and only `LoadingLayout` clears it
  (`window.__dismissPreloadOverlay`), so whatever renders first in its place calls it. `NavBarUserMenu` holds the
  sign-in button's space while `status` is `resolving`, and `ProtectedRoute` waits on the same status.
- **Assumption: the sign-in status keeps its shape.** The account menu reads `status` (`resolving`, `anonymous`,
  `authenticated`) from `useAuthContext`. The planned move of the session query onto TanStack Query keeps that
  three-state status.
- **Assumption: the Chakra upgrade changes some DOM and accessibility wiring** (a popover title rendered as a heading,
  field errors linked through `aria-describedby`), which can touch menu and drawer tests. Checked once it lands.

## Scope Boundary (Won't Do)

- **Other pages:** the Films hub, signed-in Home and the landing page; the Library page, Log and the demo account
  with its "Try the demo" button; the footer's redesign; deleting the Settings route and slimming Profile; person
  pages.
- **Content:** curated collections, trending and other poster rows, trailers and where-to-watch data.
- **The theme picker's future**, including whether palettes stay selectable or only light and dark remain.
- **Color mode:** the light-mode first paint and the color-mode provider's script warning, each fixed on its own.
- **Chakra colors elsewhere:** the same theme-role check over components this work doesn't build or touch.
- **The catalog's grid and data layer:** cards, infinite scroll, restoring positions beyond the first pages, filters on
  the search page, and whether All films includes films not yet released. The header's visibility when a window is empty
  or fails to load is the exception (decision 6).
- **Routing infrastructure:** moving imports to `react-router`, or to React Router's data router.
- **Dependencies:** the `@chakra-ui/react` upgrade (decision 13) lands before implementation; the palette has landed.
  The landing page builds inside this shell.
