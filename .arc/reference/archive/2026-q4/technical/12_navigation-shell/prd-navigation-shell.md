# PRD: Navigation Shell

**Type:** Technical
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Complete
**Created:** 2026-11-11

---

## 1. Introduction/Overview

CineXplorer's navigation is spread over three surfaces that repeat the same links. `NavBar`
(`frontend/src/components/layout/navbar/NavBar.tsx`) draws two rows on wide screens: the wordmark, search and account
menu, then a row with a LOG button and Profile, Watchlist, Library and Journal tabs from `USER_NAVIGATION_ITEMS`
(`frontend/src/constants/navigation.ts`). `AppLayout` adds `Sidebar` beside every page on wide screens, and on
narrower ones `MobileMenuButton` opens the same `SidebarContent` in a drawer (`sidebarDrawer`). `SidebarContent` lists
the user links again, then Featured, Browse, Now Playing and Upcoming from `MOVIE_VIEW_NAVIGATION_ITEMS`.

**Links lead nowhere, and every visitor sees them.** Library and Journal have no route in `frontend/src/App.tsx`, so
they open the 404 page. Log does nothing: `NavBar`'s `handleLogClick` is empty, `NavBarUserMenu`'s only closes the
menu, and the sidebar's only writes a debug log. Neither the tab row nor the sidebar checks sign-in, so signed-out
visitors see Profile, Watchlist, Library, Journal and LOG. Featured links to `/featured`, which redirects to `/`, and
both `NavBar` and `SidebarContent` mark the current page by an exact path match, so Featured is never shown as
current. Below 1024px the account menu lists Profile twice: it adds `USER_NAVIGATION_ITEMS`, which include Profile,
then Profile again.

**The pieces fall short on accessibility.** `NavBar`'s wordmark is an `h1` on every page. The catalog (`GridHeader`)
and the home page (`Featured`) add their own `h1` beside it, while the movie detail, watchlist and sign-in pages have
no `h1` but the wordmark. `NavBarUserMenu`'s dropdown is hand-built: no menu roles, no `aria-expanded`, and Escape
doesn't close it. `NavBarSearch`'s input is named only by its placeholder. The sidebar's listbox has no accessible
name and holds a separator it may not contain; `frontend/e2e/axe-baseline.ts` carries six exceptions for it, on `/`,
`/browse` and `/movie/:id`.

**A failing page takes the whole app down.** In `App.tsx`, `ErrorBoundary` sits outside `BrowserRouter`, and one
`Suspense` with `LoadingLayout` as its fallback wraps every route and layout. A render error replaces the whole app,
top bar and footer included, until "Try Again", and nothing resets it on navigation. On a first visit the fallback is
a full-page spinner with no top bar (`LoadingContent` in its `layout` mode).

**Browse, Now Playing and Upcoming are one catalog, but the pages don't say so.** All three render through one
`MovieCollectionLayout`, and `getFetcherAndSource` (`frontend/src/utilities/routeConfigResolver.ts`) picks the list
from the path. The backend's `get_now_playing_movies` and `get_upcoming_movies`
(`backend/apps/movie/services/movie_service.py`) add a theatrical release window (30 days back to 5 ahead, and 5 to 65
days ahead) to the same discover call that `/browse` makes with no window. The two windows also skip the minimum vote
count that `/browse` sets by sort and filters (`VoteCountPolicy`), though `build_tmdb_params` still asks TMDB for 3
votes on rating sorts. Order is separate from the window: `DEFAULT_SORT` is popularity, and `SortDropdown` offers the
same sorts on all three, disabling only Highest Rated on Upcoming. The header (`GridHeader`'s title) reads "Browse",
"Now Playing" or "Upcoming". It names neither the window nor the order, so the default view reads as every film in an
arbitrary order rather than a place with a purpose.

This work replaces the navigation with one top bar, presents the three lists as one film catalog, **Films**, whose
header says what is showing, and keeps the bar and footer standing while a page loads or fails. CineXplorer should
feel chosen and framed, like a cinema's program rather than a view over a database's records: TMDB supplies the
data, and the app decides what to show and how. The navigation is the frame for that. It names a few places, each
with a clear job, and the pages that follow (a landing page, a Library page, a Films hub) build inside it.

## 2. Goals

1. One top bar is the only site navigation on every page in the shell, at every width; the catalog's window tabs and
   filter bar are the catalog's own navigation regions. Every link in the bar opens a routed page, and links show only
   to visitors who can use them.
2. Each page has exactly one `h1`, its own title. The bar's controls are named, its menus, drawer and phone search
   close on Escape and return focus to the control that opened them, and the sidebar's six axe exceptions are gone.
3. Browse, Now Playing and Upcoming are one catalog with three release windows, and its header names what is
   showing: the window, the sort, and the language, genres and years selected.
4. A page that is loading or has failed shows its state with the bar and footer in place, and a failed page clears
   when the visitor navigates.
5. The catalog's URLs, saved scroll positions and Back to Results keep working unchanged.

## 3. User Stories

- As a visitor, I want a few clearly named places in one bar, so I know where I can go and no link leads nowhere.
- As a visitor browsing films, I want the header to say what I'm looking at ("Highest-rated French-language horror
  films, 1970s"), so the list reads as a selection rather than a database view.
- As a visitor moving between all films, those in theaters and those coming soon, I want my genres, language and sort
  to carry over.
- As a signed-out visitor, I want Sign in to bring me back to the page I was on.
- As a keyboard or screen-reader user, I want the menus, the drawer and the search field announced as what they are
  and closed by Escape with my focus back where it was, and each page to have one heading that names it.
- As a phone user, I want a bar that fits my screen, with its links in a drawer and search one tap away.
- As a visitor who reaches a broken page, I want the bar to stay so I can go elsewhere, and the error to go when I do.

## 4. Requirements

### The top bar

**R1.** One top bar replaces the two-row bar and the sidebar on every page in the shell: the pages under `AppLayout`,
and the sign-in, registration and password-reset pages under `AuthLayout`. The bar is the page's `header` element, its
banner landmark. At 1024px and wider (Chakra's `lg`), from left to right, it holds:

- the wordmark (the logo and "CineXplorer"): a link to `/` named "CineXplorer", whose logo image is decorative, and
  not a heading;
- **Films**, a link to `/browse`, then the Library link (R4) for signed-in visitors, in a `nav` labelled "Main";
- the search field (R6);
- at the right, **Sign in** (R5) when signed out, or the account menu (R3) when signed in.

**R2.** The bar marks the current page with `aria-current="page"` and an underline in the accent color (`tertiary`)
on its link. Films is current on `/browse`, `/browse/now-playing` and `/browse/upcoming`, and the Library link on
`/watchlist`. No link is current anywhere else, including the home, search, movie detail, profile and sign-in pages.
The drawer's links (R8) are marked the same way.

**R3.** The account menu is built on Chakra's `Menu`. Its trigger is named by the full username and carries
`aria-haspopup` and `aria-expanded`. At 1024px and wider it shows the username, cut off with an ellipsis past 12rem,
and the avatar's initial; below 1024px it shows the avatar's initial alone (R7). The menu holds exactly two items at
every width: **Profile**, which opens `/profile`, and **Sign out**, which signs the visitor out and opens `/`, as
Logout does today. It carries menu roles (`menu`, `menuitem`). The arrow keys move between items: focus stays on the
menu, and Chakra marks the item the arrow keys or the pointer reach as highlighted (`data-highlighted`), which R29
styles. Escape closes it and returns focus to its trigger; choosing an item closes it.

**R4.** The Library link opens today's watchlist page, `/watchlist`, and reads "Watchlist" until a Library page
replaces it. It shows only while the sign-in status (`status` from `useAuthContext`) is `authenticated`; while the
status is `resolving` it is absent.

**R5.** **Sign in** is a link, shown while the status is `anonymous`, that returns visitors to the page they were on
through `loginPathFor` (`frontend/src/utilities/returnPath.ts`) with the current path and query. `safeReturnPath`
refuses the sign-in pages as return paths, so on those pages:

- on `/login`, the link keeps that page's own `next`: it points at `/login` with the same `next` when the page has
  one, and at `/login` when it has none;
- on `/register` and `/forgot-password`, it points at `/login`.

While the status is `resolving`, neither Sign in nor the account menu shows, and the bar holds the control's space,
as `NavBarUserMenu` does today.

**R6.** The search field is one component, used in the wide bar and in the phone search (R9). It submits to
`/search?query=` with the trimmed query, as `NavBarSearch` does today: Enter or its "Search" button submits, and an
empty or blank query does nothing. The input has a label of its own, "Search films", visually hidden, and the
placeholder "Search films". No suggestions appear while typing.

### The phone bar

**R7.** Below 1024px the bar holds, from left to right: a menu button named "Open menu", the wordmark (R1), a search
button named "Search films", and Sign in or the account menu (R3, R5). Films and the Library link sit in the drawer
(R8), not in the phone bar. One breakpoint, `lg`, switches the bar, the drawer and the phone search together. The bar
fits one row with no sideways overflow from 360px wide, signed in and signed out: the account trigger shows the
avatar's initial alone (R3), and the wordmark's name takes a smaller size than at 1024px and wider.

**R8.** The menu button opens a drawer, built on Chakra's `Drawer` and titled "Menu", that holds the bar's own links
in a `nav` labelled "Main": Films and, for signed-in visitors, the Library link (R4), marked as R2 says. Signed out,
it holds Films alone. Escape or the drawer's close button closes it and returns focus to the menu button, and
choosing a link closes it.

**R9.** The search button opens the search field (R6) in place of the bar's row, with focus in its input, beside a close
button named "Close search". While it is open the row's other controls (the menu button, the wordmark, the search button
and Sign in or the account menu) are hidden: out of sight, out of the tab order and out of the accessibility tree.
Escape or the close button closes it, brings the row back and returns focus to the search button. Submitting a query
closes it and opens the results page.

### What the shell removes

**R10.** The work removes:

- the sidebar and its drawer (`Sidebar`, `SidebarContent`, `SidebarDrawer`, `SidebarOverlay` and its
  `sidebarDrawer`, `useSidebar`) and `AppLayout`'s sidebar column;
- the wide bar's second row, with its LOG button and tabs, and the account menu's LOG, Watchlist, Library, Journal and
  Settings entries;
- `USER_NAVIGATION_ITEMS`, `MOVIE_VIEW_NAVIGATION_ITEMS` and `NAVIGATION_SECTIONS`;
- every link to `/journal`, `/library`, `/log` and `/featured`.

The Settings route and page stay, reachable by their URL. Code, tokens and constants these removals leave without a
consumer go with them.

**R11.** Routes:

- `/browse/sequential`, the sequential-pagination reference page (`BrowseSequential`), is registered only in
  development builds, as the `/dev/*` pages and `/testlogin` are. Production serves no development routes.
- `/` stays the home page, and `/featured` stays an alias that redirects to it.
- Every other route is unchanged.

### Page headings

**R12.** Each page in the shell has exactly one `h1`, its own title, in every state it shows once loaded:

- the home page: "Welcome to CineXplorer", as today;
- the catalog: its header's title (R23), in every state (R20);
- the search page: "Search Results" with its query, as today, in every state (R20);
- the movie detail page: the movie's title, and "Movie Not Found" or "Error Loading Movie" in those states (each an
  `h2` today);
- the watchlist page: "My Watchlist", shown above its loading, error and empty states as well as its list (today plain
  text shown only with the list);
- the password-reset page: "Reset your password", and "Check your email" once sent (today plain text);
- the sign-in and registration pages: a visually hidden `h1`, "Sign in" and "Create an account";
- the profile, settings, not-found and forbidden pages: their existing `h1`;
- the content area's error display (R13): its heading, "Oops! Something went wrong" (an `h2` today).

A loading state that shows no title yet has none, such as the content area's (R13), the movie detail page's while its
film loads, the sign-in check `ProtectedRoute` shows before the pages that need a signed-in visitor, and the sign-in
page's while it completes a Google or GitHub sign-in. Development-only pages are exempt.

### Loading and errors

**R13.** The content area between the bar and the footer holds the page's loading state and its errors. `BaseLayout`,
which `AppLayout` and `AuthLayout` share, wraps its content in an error boundary and a `Suspense` boundary, with the
bar and the footer outside both. A page that is loading shows the loading state (a spinner and "Loading...", as
`LoadingContent`'s `content` mode draws them) in the content area. A page that throws shows the error display ("Oops!
Something went wrong" and Try Again, as `ErrorBoundary` draws them today, with that heading as the page's `h1`) in the
content area. The bar and the footer stay in place and usable in both states.

**R14.** In-app navigation keeps React Router's default: `BrowserRouter` applies each location change inside a React
transition, so the current page stays on screen until the next has loaded. The loading state shows on a first visit,
and wherever the content area mounts afresh, such as moving from the sign-in page into the app.

**R15.** A page's error clears when the location's path or query changes. The content area's error boundary resets on
that change, rather than remounting the content with a new key, which would discard the page's state and show the
loading state for pages not yet loaded. Try Again still resets it in place.

**R16.** A last-resort error boundary stays above the router, for failures in the shell itself, and shows the
full-page error display. Routes outside the shell (the development-only `/testlogin`) keep a page-level loading
fallback.

**R17.** While `oauth_in_progress` is set in session storage, on a return from Google or GitHub sign-in, the content
area's loading state shows "Logging in with Google..." or "Logging in with GitHub..." with the provider's logo, as
`LoadingLayout` does today. On that return `frontend/index.html` covers the screen with a preload overlay that blocks
clicks, and only `LoadingLayout` dismisses it today (`window.__dismissPreloadOverlay`); the shell dismisses it when it
first renders.

### The film catalog

**R18.** `/browse`, `/browse/now-playing` and `/browse/upcoming` become one catalog, Films, with three release
windows: **All films**, **In theaters** and **Coming soon**, in that order. The URLs, the list identifiers (`browse`,
`now-playing`, `upcoming`) and the backend's presets and endpoints stay as they are. There is no Top rated window.

**R19.** The windows are tabs under the catalog's header, at every width: a `nav` labelled "Release windows" holding
three links, each opening its window's URL, the current one marked with `aria-current="page"`. Each tab's link
carries the current query string, so switching keeps the filters that still apply (genres, rating range,
certifications, language and the sort), and the window opened drops what it fixes (R21). The search page shows no
tabs.

**R20.** The header's title and the window tabs stay in place while results load, when there are none, and when they
fail to load. The same holds for the search page's title. Today `VirtualizedMovieGrid` fades its header out
(`showHeader`) unless results exist or are loading. The result count shows while loading and with results, as today,
and is hidden when there are none or they fail; the empty and error states carry their own messages.

**R21.** A window ignores what it fixes however the visitor arrives: by a tab, a link, or a bookmarked or shared URL.
In theaters and Coming soon remove `minYear` and `maxYear`, and Coming soon replaces a Highest rated sort
(`sortBy=vote_average.desc`) with the default sort. Each rewrites the URL in place, replacing the history entry, as
`useMovieCollectionState` already does for an A to Z sort without a Latin-script language. Highest rated stays
disabled in Coming soon's sort menu, as `SortDropdown` has it today.

**R22.** In the filter bar, the disabled year field names its window: "Release Year (In theaters)" and "Release Year
(Coming soon)" (`YearSelector`), in place of "(Now Playing)" and "(Upcoming)". The filter bar's navigation region
(`CollapsibleSubNav`), labelled "Browse filters" today, is labelled "Film filters". The advanced-filters toggle, an
icon-only button today with no name or state, is named "Advanced filters" and carries `aria-expanded` for its panel. The
sort menu's labels stay as they are.

**R23.** The catalog's header names what is showing, in place of "Browse", "Now Playing" and "Upcoming". The window
and the sort set the title, and a language or genre fills its slot, `{films}` (written `{Films}` where it starts the
title):

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

The sorts are, by value: Most popular `popularity.desc`, Highest rated `vote_average.desc`, Newest
`release_date.desc`, Oldest `release_date.asc`, and A to Z `original_title.asc` (the sort menu's "Alphabetical").
Highest rated isn't offered on Coming soon (R21). A to Z is offered only with a Latin-script language
(`getAvailableSortOptions` in the menu, `useMovieCollectionState`'s reset for a URL), so an A to Z title always names a
language.

A URL can carry values the table doesn't name, since the sort, language, genres and years pass from the URL unchecked
(`parseBrowseParamsFromUrl` drops only genres that aren't numbers). The title describes what the request asks for. A
sort outside the five names no sort: the title is the window's name ("All films", "In theaters", "Coming soon"),
followed by `{films}` after a colon when a language or genre fills it ("All films: French-language horror films") and
by the years as R25 gives them. A language or genre with no label in `languageOptions` or `genreOptions` is left out
of `{films}`, though every genre the URL carries counts toward R24's three.

**R24.** `{films}` is the language, then the genres, then "films":

- The language is its `languageOptions` label with "-language": "French-language films".
- Each genre is its `genreOptions` label in lowercase, except that Animation reads "animated" and TV Movie
  "made-for-TV". Genres are ordered alphabetically by those words and two are joined with "and": "comedy and horror
  films", "French-language comedy and horror films", "Horror films longest in theaters".
- With three or more genres, none is named. With a language the slot reads as the language alone ("French-language
  films"); without one the title takes the table's "No language or genre" column.

**R25.** On All films the years follow the title after a comma, both bounds included: a decade when the bounds are a
decade's first and last years ("1980s"), one year when they are equal ("1994"), a range otherwise ("1975–1983", with an
en dash), "since 1990" with only a lower bound, and "through 1970" with only an upper. The bounds are the ones the
request sends, read with `parseInt` as `addReleaseDateRange` reads them (so "1990s" reads as 1990): a lower bound that
doesn't read as a number sends no years, the upper bound with it, and the title shows none; an upper bound that doesn't
read, beside a lower bound that does, reads "since" the lower bound, as the request then runs to the current year; and
an upper bound alone that doesn't read shows none. A range reads `minYear` first and `maxYear` second, even when
`minYear` is the later year ("1990–1980", which finds no films). Examples: "Highest-rated French-language horror films,
1970s", "Popular films, 1980s", "French-language films, A to Z, since 1990". In theaters and Coming soon never show
years (R21).

**R26.** The title names no rating range or certification, which stay in the filter bar, and no minimum vote count,
which differs between `/browse` and the windows. Newest on All films puts films not yet released first, the order
Coming soon calls "furthest out", since `addReleaseDateRange` (`frontend/src/utilities/browseParamMapper.ts`) sends
no upper release date without a year and `VoteCountPolicy` sets no vote minimum for newest-first; the title still
reads "Newest films", naming the sort as the sort menu does. The search page keeps its own title.

**R27.** Until a landing page replaces it, the home page's "Browse Movies" section takes the catalog's names: its
heading reads "Films", and its three buttons read "All films", "In theaters" and "Coming soon", opening the same
URLs as today.

### Layout tokens

**R28.** The bar is one row at every width, the height of today's phone bar: 64px plus its 1px bottom border.
`layout-navbar` (`frontend/src/theme/layout/semantic-tokens.ts`) holds that one value, 65px, itself at every breakpoint,
and `navbar-height-mobile` and `navbar-height-desktop` (65px and 93px in `foundations.ts`), which only it reads, are
removed. What reads `layout-navbar` follows it unchanged: `CollapsibleSubNav`'s offset, the toaster, `FloatingAlert` and
the development pages `ThemeDebug` and `LayoutDebug`. The `layout-sidebar` and `sidebar-width` sizes and the `sidebar`
z-index token, whose only other reader is `LayoutDebug`, are removed with the sidebar, and `LayoutDebug` drops its
sidebar width and z-index readouts.

### Theme roles

**R29.** These pieces, the shell's own, take theme roles, never Chakra's own color tokens (`border`,
`border.emphasized`, `fg`, `fg.muted`, `bg.*`, `colorPalette.*` or palette values such as `blackAlpha.500`, whether a
recipe or Chakra's global styles draw them): the bar, the account menu, the drawer, the search fields, the window tabs,
the error display, and the catalog's filter bar, which is `CollapsibleSubNav` with the controls it holds
(`QuickBrowseBar` and the advanced filters panel). Other pages R12 and R27 change keep their colors apart from what the
shared fixes below reach. Every border these pieces draw names its color, since one that names none takes Chakra's
global border color, `border`. Where a Chakra default would reach a piece, it takes these roles:

- the bar: `layer-01` with a `border-strong-01` bottom border, as today's bar; its links' text `foreground`, where
  Chakra's link recipe would draw `colorPalette.fg`, and the current page's underline `tertiary` (R2);
- the search fields: a 1px `border-strong-01` border, turning `border-strong-02` with a `tertiary/8` fill on hover,
  around an input that draws no border or outline of its own, as `NavBarSearch` does today; the border turns `tertiary`
  while the input has focus, and not while the Search button does, which draws its own ring (today's field marks both).
  Chakra's input recipe would draw a `border` border and an inside focus ring in its own gray
  (`colorPalette.focusRing`);
- the account menu: its trigger as today's (`foreground` text, `layer-hover-01` on hover), with the avatar `layer-02`
  and its initial `foreground`, in place of Chakra's `colorPalette.muted` and `colorPalette.fg`; its panel `popover`
  with a 1px `border-subtle-02` border, and `on-popover` text on the panel and its items, which Chakra's menu recipe
  gives `fg`; and its highlighted item (R3) a solid `tertiary` fill with `on-tertiary` text, from the keyboard and the
  pointer alike, in place of Chakra's `bg.emphasized/60`. These are set on the account menu itself rather than in a menu
  recipe: one would also fill the footer's theme picker's highlighted item with `tertiary`, the fill that marks its
  chosen theme, so the two would look alike there (§ 5);
- the drawer: its panel `background` and its header `layer-01`, with `border-strong-01` borders, as today's sidebar
  drawer, and its links' text `foreground`; its backdrop `backdrop`, as the app's dialogs use, in place of Chakra's
  `blackAlpha.500`;
- the window tabs: `foreground` text, with the current tab marked in `tertiary`;
- the error display: its separator `border-subtle-01`, in place of Chakra's `border`;
- the filter bar: its controls already set theme roles on every part they draw, apart from the select indicator below.

Where a Chakra default comes from a shared source, it is fixed there:

- the project's select recipe gives its indicator, the dropdown arrow, `foreground` at rest, as the language select's
  arrow already draws, and `on-muted` when disabled, as the disabled filters' value text draws, in place of
  `fg.muted` and `fg.subtle` (the genre and year selects in `ConnectedDropdowns`, and `SortDropdown`);
- one global style gives input placeholders `on-muted`, in place of Chakra's global `fg.muted/80` (`YearSelector`,
  `RatingSelector` and the bar's search fields);
- the project's button recipe gives each variant Chakra fills while expanded (solid, subtle, outline and ghost) its own
  pressed colors in that state, and subtle, which has none, its hover colors, in place of Chakra's `colorPalette.*`
  fills. This reaches the error display's copy buttons while their tooltip is open (`data-expanded`), and any other
  button that carries `aria-expanded` without a background of its own; a background set on the button itself, as today's
  account trigger sets `layer-01`, already overrides the recipe. Chakra's `surface` variant, which the app doesn't use,
  keeps its own;
- the project's button, checkbox and switch recipes set their focus outline's width and style rather than the `outline`
  shorthand. Chakra's own recipes for those three give them a focus ring whose color comes first, so the shorthand the
  project adds after it resets the color, and their focus rings, the genre checkboxes' among them, draw in the text
  color today. The radio recipe already draws `ring`.

Chakra's global text-selection color (`colorPalette.emphasized/80`) stays (§ 5).

Focus takes the forms ADR-015 and ADR-017 set. ADR-015 gives non-editable controls an outline ring on keyboard focus
only and text inputs a border; ADR-017 moves select triggers to the border:

- A 2px `ring` outline on keyboard focus: the links (the wordmark, Films, the Library link, Sign in, the drawer's links
  and the window tabs), which set it themselves, since Chakra's link recipe draws its ring in its own gray and a router
  link draws the browser's; the buttons, from the button recipe (the account menu's trigger, the phone bar's menu,
  search and close-search buttons, the drawer's close button, the search field's Search button, the error display's
  buttons, and in the filter bar the genre popover's trigger, the clear button, the advanced panel's buttons and the
  advanced-filters toggle, which drops the border form it draws today); and the genre checkboxes and certification
  cards, from the checkbox recipe and the cards' own `focusRingColor`.
- A `tertiary` border with no outline: the text inputs (the search fields, the filter bar's year and rating inputs) and
  the select triggers (genre, year, sort and language).
- The account menu's items and the select dropdowns' options never take focus: Chakra's `Menu` and `Select` keep it on
  the list and mark the current item as highlighted. The menu's highlighted item takes the fill above; the options keep
  the select recipe's `tertiary/12` highlight (§ 5).

The outlines and borders sit on `background`, `layer-01` or `layer-02`, where `npm run verify-contrast` already checks
`ring` and `tertiary` at 3:1 in all five themes, apart from the error display's Try Again and Report Issue buttons,
whose rings sit on the alert's `destructive/10` tint over `background`; the script gains `ring` on that tint at 3:1. The
menu's highlight sits on `popover`, so the script gains `tertiary` on `popover` at 3:1. Both new pairs pass in every
theme today; `on-tertiary` on `tertiary`, and `foreground` on `layer-02` for the avatar's initial, are pairs the script
already checks. A piece placed on another surface adds its pairs to the script.

### The smoke tier

**R30.** The browser smoke tier follows the shell:

- `e2e/sign-in.spec.ts`, at the tier's desktop viewport (1280×800), finds the bar's Films link and search field and
  the signed-out "Sign in" link, then, signed in, the Watchlist link, the account menu by the username, and its "Sign
  out" item, whose role on Chakra's `Menu` is `menuitem`.
- The sidebar's six entries in `e2e/axe-baseline.ts` (`aria-input-field-name` and `aria-required-children` on `/`,
  `/browse` and `/movie/:id`) are removed, and the scans pass without them. The other entries stay unless a run
  reports them unmatched.
- A new spec runs at phone width (360×800) in both targets, local and staging, as every spec but sign-up does (staging
  skips sign-up). Signed out and then signed in, it finds every control of the bar wholly inside the viewport, measuring
  each control's whole box (`boundingBox()`) rather than accepting one partly in view; signed in, it finds the account
  trigger showing no username text. Signed in, it opens the drawer and finds
  Films and Watchlist in it, follows Films to the catalog, opens the search field and submits a query to the results
  page, and opens the account menu to find Profile and Sign out. Its pages get the axe scans the other specs' pages
  get. The local target answers catalogue requests only from fixtures and fails on
  one without a fixture (`catalogueResponse` in `e2e/catalogue.ts`), so it gains a response for the movie search
  (`/api/movies/search`).
- A violation these scans find in the pieces R29 lists is fixed. The two `/browse` entries stay (§ 5):
  `aria-hidden-focus`, for the collapsed filter drawer, and `button-name`, whose reason names the movie cards' unnamed
  icon buttons alone once R22 names the advanced-filters toggle. Entries match by route and rule, so on `/browse` they
  excuse those two rules in the bar, the drawer and the window tabs too; the scans of the other routes and the component
  tests (criteria 15 and 16) check those pieces' names instead. One they find anywhere else, such as the results grid's
  cards on `/search`, takes a baseline entry with its reason, as the tier's baseline provides for violations that
  predate a change; `/search` joins the baseline's routes if it needs one.
- Each page the specs scan has exactly one `h1`. The sign-in and phone-width specs find the bar by its banner
  landmark (R1) and check that its rendered height equals `layout-navbar` at their viewports. The sign-in spec also
  checks that the account menu's trigger, focused from the keyboard, draws its outline in `ring`'s color (R29).
- `e2e/browse.spec.ts`, `e2e/back-to-results.spec.ts` and `e2e/movie-detail.spec.ts` pass with the URLs unchanged; an
  assertion on an old header name or on the sidebar follows the new shell.

### Documentation

**R31.** The documentation describes the shipped shell:

- `strategy-layout-tokens.md`: the one-row bar and its single `layout-navbar` value, with no `navbar-height-*` sizes,
  sidebar or sidebar tokens;
- the smoke tier's descriptions: `strategy-testing-methodology.md` (its spec count, its one 1280×800 viewport, which the
  phone-width spec's 360×800 joins, and phone viewports no longer outside the tier), `strategy-quality-gates.md` ("all
  five specs"), TECHNICAL-OVERVIEW § 7's coverage, and QUICK-REFERENCE's "five Chromium specs" name six specs, the
  phone-width shell spec among them;
- `strategy-component-styling.md`: its guidance that logo and brand elements want no focus ring (a logo link takes no
  underline but keeps ADR-015's keyboard focus ring, as R29 gives the wordmark), its "Navbar menu items" example drawn
  as underlined text links, and the hover-surface pattern it gives menu items under "Interaction States on Surfaces" and
  "Surface Hover Pattern" (the account menu's highlighted item, which is also its keyboard focus mark, takes a solid
  `tertiary` fill, R29);
- ADR-002's and ADR-039's Status lines, which name the new ADR (§ 8);
- the root README's feature line, which names the catalog's lists "Browse, Now Playing, Upcoming" today and names
  Films with All films, In theaters and Coming soon.

A search of `.arc/reference`, outside the archive and the ADR bodies, and of the root README finds no other description
of the app's sidebar, the two-row bar or its 93px height, five smoke specs or a smoke tier only at 1280×800, Browse, Now
Playing and Upcoming as the catalog's pages, bar links drawn as underlined text links, a logo link without a focus ring,
or menu items marked only by a hover surface, as current.

## 5. Non-Goals (Out of Scope)

- **Other pages.** The Films hub, a signed-in home page and the landing page; the Library page, Log and the demo
  account with its "Try the demo" button; the footer's redesign; removing the Settings route and page, and slimming the
  profile page; person pages. The shell links to each once it exists.
- **Content.** Curated collections, trending and other poster rows, trailers and where-to-watch data.
- **The theme picker.** It stays in the footer, and `Footer` doesn't change, though R29's shared button fix reaches its
  trigger while its menu is open; whether palettes stay selectable is not decided here.
- **Color mode.** The dark first paint on a light-mode first visit, and the color-mode provider's script warning,
  are unchanged.
- **Chakra colors elsewhere.** Components outside R29's list keep any Chakra recipe colors they draw, the pages R12 and
  R27 change among them, except where a shared fix in R29 reaches them. Chakra's shadow tokens stay wherever they draw,
  such as today's bar's `boxShadow="base"`, the filter bar's `boxShadow="sm"`, and the select, genre popover, menu and
  drawer recipes' shadows.
- **Text selection.** Chakra's global text-selection color (`colorPalette.emphasized/80`) stays, in the shell's pieces
  too: it reaches every page alike, so it belongs to the same check over the app's other components.
- **The select options' highlight.** The select dropdowns' options keep the select recipe's `tertiary/12` highlight,
  which falls below 3:1 against the dropdown. Changing it reaches every select in the app, and needs a form that also
  shows on a chosen option, which the recipe fills with `tertiary`, the color `ring` takes in most themes.
- **The catalog's grid and data layer.** Cards, infinite scroll, restoring positions past the first pages, filters on
  the search page, whether All films includes films not yet released, and the backend's window presets, which still
  honor year bounds derived from dates in a direct API request. The header's visibility in every state (R20) is the
  exception.
- **The filter bar's other accessibility exceptions.** The `/browse` baseline entries for the collapsed filter drawer's
  focusable controls (`aria-hidden-focus`) and for unnamed buttons (`button-name`) stay. Once R22 names the
  advanced-filters toggle, the second covers only the movie cards' two unnamed icon buttons, and the cards are outside
  this work. The first comes from the filter bar sliding away as the page scrolls down while its controls stay in the
  tab order; taking them out needs its own design for focus already inside the bar.
- **Search suggestions.** The search field shows nothing while typing; it submits to the results page.
- **A tablet layout.** Widths from 768 to 1023px get the phone bar; tuning the bar for tablets is later responsive
  work.
- **Alerts.** `FloatingAlert` keeps its width and position, apart from following the bar's height (R28).
- **The home page's controls.** Its buttons keep their behavior; only their labels change (R27).
- **Routing infrastructure.** Imports stay on `react-router-dom`; moving them to `react-router`, or to React
  Router's data router, is separate.

## 6. Technical Considerations

- **Dependencies.** The work builds on `@chakra-ui/react` 3.38.0, which `main` carries with its Dependabot updates
  resumed. 3.38 changes some DOM and accessibility wiring from 3.37, such as a popover title rendered as a heading and
  field errors linked through `aria-describedby`, which can touch menu and drawer tests, so they are written against
  it. Chakra's `Menu` and
  `Drawer` ship with it (`ThemeSelector` already uses `Menu`), so no package is added. React Router stays at v7 through
  `react-router-dom`.
- **What must keep working with the URLs unchanged** (R18):
    - `getFetcherAndSource` derives the list, its fetcher and today's title from substrings of the path;
    - `MovieCard` writes `from` into detail links, and `BackToCollectionLink`'s `buildBackUrl` rebuilds `/browse`,
      `/browse/{from}` or `/search` from it;
    - `useScrollPersistence` keys saved positions by list and filters (`getScrollStorageKey`);
    - `ConnectedDropdowns`, `SortDropdown` and `YearSelector` compare the list identifier to constrain years and
      sorts;
    - `e2e/browse.spec.ts`, `e2e/back-to-results.spec.ts` and `e2e/movie-detail.spec.ts` visit `/browse` and assert on
      its URL and saved `scroll-` keys.
- **Sign-in status.** The bar reads `status` (`resolving`, `anonymous`, `authenticated`) from `useAuthContext`, and
  `ProtectedRoute` waits on the same status. A planned move of the session query onto TanStack Query is expected to
  keep that three-state status; the bar follows it if it changes.
- **The bar's height feeds other components** (R28). `CollapsibleSubNav` fixes the filter bar at the `layout-navbar`
  offset, and the toaster and `FloatingAlert` place themselves below it, so the token must equal the bar's rendered
  height at every width.
- **One search component, one breakpoint.** The wide bar and the phone search share the search field (R6), and one
  breakpoint switches the bar, the drawer and the phone search (R7) while the bar's height stays the same at every
  width. A later suggestions list changes that one component, and a later breakpoint change moves one value and no
  layout token.
- **The preload overlay** (R17). It sits outside React's root in `index.html` and shows only on a return from Google
  or GitHub sign-in. The shell renders first on every load, so it is the one place that can dismiss the overlay before
  any page has loaded.

## 7. Design Considerations

- **Character.** The bar is slim and quiet, in the Marquee palette: the wordmark, two links, search and the account
  control. The accent marks the current page and focus; the posters carry the color below.
- **What was compared.** A navigation study in Marquee compared where the Library link goes, how the current page is
  marked, and how much the header names, in a desktop frame and three phone frames (the bar, the drawer open and
  search open), with a table of header wording. Its spacing, type sizes, breakpoints and wordmark were placeholders;
  R7 and R28 settle the breakpoint and the height.
- **Names.** New names are in sentence case: Films, All films, In theaters, Coming soon, Sign in, Sign out.
- **Tablets.** Below 1024px the phone bar keeps every control reachable; on a tablet its drawer holds only two links,
  which is sparse but works until the bar is tuned for tablets.

## 8. Design Decisions

1. **One top bar, with one Films link into one catalog** (R1–R3, R18). Three ways to reach the catalog were set
   aside. A Browse menu (Popular, Now playing, Upcoming), as TMDB's Movies menu does it, is clean, but "Browse" has no
   page of its own, and named lists drift from their names once the sort changes (TMDB's "Popular Movies" page offers
   a rating sort). Flat links for each list put three items in the bar that open the same page. One Browse link with
   tabs on the page would have "Browse" name both the link and the page, louder than what is showing. One Films link
   leaves the windows and the header on the page, and a future Films hub can take over the same link. The wordmark
   stops being a heading so that each page's title is its one `h1`, and the account menu moves to Chakra's `Menu` for
   its roles and keyboard handling. The current page is marked by an underline in the accent color rather than a pale
   highlight behind the label, and only the catalog's three URLs mark Films: a detail page opened from search or the
   home page is not in the catalog. _ADR: the new ADR below._
2. **On phones, the links sit in a drawer** (R7–R9), even signed out with only Films to hold: the four controls already
   fill a phone's width, the drawer has room for what arrives later (Log, the Library page), and it works the same
   signed in and out. It holds the bar's own links rather than the three windows, which would be three links opening the
   same page and would change when a Films hub arrives. Search is a field in the bar on wide screens and an icon on
   phones, rather than a Search link to a separate page, since the results page already exists. Opened, the field takes
   the row's place, so the controls it covers can't be reached by keyboard while hidden. _ADR: the new ADR below._
3. **Every link opens a routed page, and links show only to visitors who can use them** (R4, R10, R11). Journal goes,
   Settings leaves the account menu, the Library link opens the watchlist page under its name until a Library page
   exists, and Log and "Try the demo" arrive with their own pages. `/browse/sequential` joins the development-only
   routes. _ADR: `none`: the links are temporary until those pages exist, and the gating is obvious from code,
   following the development-only routes already in `App.tsx`._
4. **The Library link sits in the bar beside Films** (R1, R4), one click from anywhere to the visitor's own films,
   rather than in the account menu, which would keep the bar identical signed in and out but put the Library one
   click deeper. _ADR: the new ADR below._
5. **Sign in returns visitors to the page they were on** (R5), through the `loginPathFor` that `ProtectedRoute`
   already uses; `NavBarUserMenu`'s Login button sends no return path today. _ADR: `none` (tactical)._
6. **Three lists become one catalog with three release windows** (R18, R27). The backend's presets stay as they are,
   and so do the URLs, which saved scroll positions, Back to Results and the smoke specs key on. There is no Top rated
   window: sorting by rating already gives it. The default view is the catalog sorted by popularity, named for it,
   rather than a curated hub of poster rows, whose rows would overlap the landing page's unless a signed-in home page
   becomes about the visitor's own films. TMDB documents its popularity as a lifetime score fed mostly by each day's
   activity (votes, views, favorites and watchlist additions), so the default view leads with films people are
   engaging with now, wherever they are in their release. _ADR: the new ADR below records the one catalog; ADR-002's
   browse routes and endpoints stand._
7. **The windows are tabs, and they keep the filters that still apply** (R19, R21, R22). Each window has its own
   URL, so the tabs are links in a labelled `nav`. A window ignores what it fixes by one rule, however the visitor
   arrives, so a bookmarked or shared URL can't narrow a window by years or ask Coming soon for a rating sort.
   _ADR: the new ADR below._
8. **The header names what is showing** (R20, R23–R26). Fixed lists, each owning its order (Popular, Top rated, In
   theaters, Coming soon) with no sort control, would be simpler but remove free sorting; a header built from what is
   selected keeps free filtering and sorting and always matches. Naming only the window and the sort would need just a
   fixed table, leaving the filters to the filter bar; naming the language, genres and years too reads as a
   description of the selection, at the cost of the composition rule in R24 and R25. The rating range and
   certifications stay in the filter bar only. "Newest films" leading with unreleased films is accepted: the title
   names the sort as the sort menu does, and keeping unreleased films out of All films belongs to the catalog's data
   layer. The header and the tabs stay visible when a window is empty or fails, so the page still says where the
   visitor is. _ADR: the new ADR below._
9. **Films opens the catalog's default view until a Films hub exists,** and then the hub; the bar doesn't change when
   the hub arrives. _ADR: the new ADR below._
10. **The theme picker stays in the footer** rather than moving to the bar, where a palette picker that prominent
    reads as a portfolio showcase rather than a product. _ADR: `none` (obvious from code)._
11. **Search keeps its results page** (R6), and its field gets a label of its own rather than only a placeholder.
    _ADR: `none` (tactical)._
12. **Page loading and page errors render inside the shell** (R13–R17). React Router's transitions keep the current
    page on screen until the next has loaded, rather than showing the loading state on every navigation. A page's
    error clears by resetting the boundary rather than remounting the content, which would discard the page's state.
    The boundaries sit in `BaseLayout`, so the sign-in, registration and password-reset pages load and fail inside the
    shell too, and a last-resort boundary stays above the router. _ADR: `none` (a framework convention)._
13. **The shell's own pieces take theme roles** (R29), and the focus marks R29 assigns reach 3:1. The filter bar counts
    with its controls, since it is the catalog's own chrome and carries the filters between windows. R29 names a role
    wherever a Chakra component or global style these pieces render would otherwise draw Chakra's own color, so none is
    left for the build to find. Defaults from a shared source are fixed there (the select recipe, one global placeholder
    style, the button recipe's expanded fill and the recipes' focus outline) rather than per component, which would
    leave the same defaults wherever else those sources reach; the bar's own buttons need the outline fix to draw `ring`
    at all. Focus follows ADR-015 and ADR-017 control by control, so the advanced-filters toggle, a button, takes the
    ring in place of the border it draws today. Chakra's `Menu` keeps focus on the menu and marks the current item as
    highlighted, by pointer as well as keyboard: a ring there would show on hover, which ADR-015's keyboard-only rings
    rule out, and the hover surfaces the styling strategy gives menu items reach at most 2.1:1 against the menu. The
    highlighted item takes a solid `tertiary` fill, as Chakra's own `solid` menu variant does, which reaches at least
    4.9:1. The select dropdowns' options are highlighted the same way and keep the select recipe's tint: that recipe
    reaches every select in the app, and a chosen option is already filled with `tertiary`, so their highlight needs a
    design of its own. That, the global text-selection color, and the same check over the app's other components are
    separate work. _ADR: `none` for the theme roles (obvious from code: DEVELOPMENT-RULES and `strategy-color-tokens.md`
    already require them); covered by ADR-015 and ADR-017 for the focus forms; `none` for the menu's highlight (neither
    ADR covers an item that never takes focus, and the fill follows Chakra's own menu variant)._
14. **Dependencies are pinned to what lands first.** The work builds on Chakra UI 3.38.0, and React Router imports stay
    on `react-router-dom`. _ADR: `none` (tactical)._
15. **The bar switches to its phone layout below 1024px** (R7). The full bar needs the width: the wordmark, two
    links, a search field up to 300px wide and the account control. `lg` is where today's bar and sidebar switch, so
    tablets keep a layout they already get. Switching at 768px (`md`) would give tablets the full bar, at the risk of
    crowding it; tuning for tablets is later responsive work, and one breakpoint keeps that a one-value change.
    _ADR: `none` (tactical)._
16. **The bar is one 65px row at every width** (R28), the height of today's phone bar, so `layout-navbar` holds one
    value and a later breakpoint change moves no layout token. _ADR: `none` (tactical; ADR-007's token approach
    stands)._
17. **The grid's header stays visible in every state, on the catalog and on search alike** (R20), rather than for the
    catalog's windows only: one rule in the grid rather than a condition per page, and the search page keeps a
    visible `h1` when it finds nothing. _ADR: `none` (tactical)._
18. **The sort menu's labels stay as they are** (R22, R23). The titles' wording comes from R23's table, mapped to
    each sort's value, rather than from relabelling the menu in sentence case: the smaller change. _ADR: `none`
    (tactical)._
19. **The phone-width spec runs in both smoke targets** (R30), as every other spec but sign-up does, rather than locally
    only: the shell is the same code on staging, and the phone layout is where it differs most from the desktop specs.
    _ADR: the new ADR below._
20. **The Library link shows only once the sign-in status is `authenticated`** (R4), so it never flashes for a
    visitor whose session turns out to be gone; the account control already holds its space while the status
    resolves. _ADR: `none` (tactical)._
21. **The names given in R1, R6–R9, R12, R19 and R22** label each control and region for assistive technology in the
    shell's own words. _ADR: `none` (tactical)._
22. **One change.** The bar, the drawer, the account menu, the catalog's header and windows, and the loading and
    error states are one design: the Films link opens the catalog, whose windows are its own states, and the bar's
    height places the catalog's filter bar. _ADR: `none` (meets none of the ADR criteria)._
23. **The phone bar fits from 360px wide** (R3, R7, R30). Usernames can run to 150 characters and the four phone
    controls already fill the width, so below 1024px the account trigger shows the avatar's initial alone, still named
    by the username, and the wordmark's name shrinks; at 1024px and wider the username is cut off past 12rem. Truncating
    the username on phones too would still leave too little room at 360px. The phone spec runs at 360×800, the
    narrowest common phone width, since a bar that fits there fits wider phones too. _ADR: `none` (tactical)._

**ADRs this work delivers:**

- **New: "Navigate through one top bar into one film catalog"** (decisions 1, 2, 4, 6–9 and 19). It records the bar's
  anatomy at both widths, its current-page marking and the phone drawer; Films as the one entry into one catalog of
  three release windows, whose header names what is showing; `/` as the home page, with `/featured` an alias that
  redirects to it; and one phone-width spec of the shell in the browser smoke tier.
    - It supersedes ADR-002 in part: its Navigation Structure (Featured, Browse, Now Playing and Upcoming as separate
      items), the landing entries of its Routing Structure (`/` redirecting to `/featured`, and Featured in the
      navigation), and the matching items of its Frontend Implementation (the Featured stub at `/featured`, and `/`
      redirecting to it). ADR-002's browse routes, endpoints and backend strategy stand.
    - It supersedes ADR-039 in part: its Decision's five specs, and the exclusion of mobile viewports its Consequences
      record. The tier gains the phone-width spec of the shell.
    - ADR-002's and ADR-039's statuses become `Accepted; Superseded in part by` the new ADR.

It is numbered when written, is written reading `Proposed` with the implementation, and is set to `Accepted` before
the work merges.

## 9. Success Criteria

### Implemented

1. Component tests show the bar's links and the drawer's, signed out, resolving and signed in, as R1, R4, R5 and R8
   list; Films marked `aria-current="page"` on the three catalog URLs only, and the Library link on `/watchlist` only;
   and no link in the bar or the drawer to `/journal`, `/library`, `/log`, `/settings` or `/featured`. Which controls
   show at which width is a CSS breakpoint that jsdom, fixed at a 1024px width, can't vary, so the smoke specs check
   it (criterion 12).
2. Component tests show the account menu with menu roles and `aria-expanded`, holding exactly Profile and Sign out;
   Escape closing the account menu, the drawer and the phone search field and returning focus to the control that opened
   each; and the phone search field, while open, leaving none of the row's other controls reachable by role or by Tab.
3. Unit tests show Sign in's target: `/login?next=` with the current path and query on an app page; the same `next`
   on `/login?next=%2Fwatchlist`; and `/login` on `/login` without `next`, on `/register` and on `/forgot-password`.
4. Unit tests show the header's title for every row of R23's table, with and without a language or genre, and R24's
   and R25's rules: each genre's wording and their order, three or more genres with and without a language, each year
   form, and no years on In theaters or Coming soon; a sort outside the five, a language or genre without a label,
   and three genres of which one has no label, as R23's last paragraph gives them; each bound that doesn't read as a
   number, as R25 gives them; and a range whose `minYear` is the later year. The examples given in R23 to R25 come out
   exactly as written.
5. Tests show In theaters and Coming soon, reached by a URL carrying `minYear` and `maxYear`, and Coming soon reached
   with `sortBy=vote_average.desc`, replacing the URL without them (no new history entry) and requesting the window
   without them; and a tab switch keeping genres, rating range, certifications, language and sort.
6. Tests show the catalog's title and window tabs, and the search page's title, visible when results are empty and
   when the request fails.
7. Tests show a page that throws rendering the error display between the bar and the footer, with the bar's links
   working, and a location change clearing it without remounting the content area; and a lazily loaded page showing
   the loading state with the bar present.
8. Component tests show one `h1` in each page state R12 changes: the movie detail page loaded, not found and failed; the
   watchlist page loading, failed, empty and listed; the password-reset page before and after sending; the sign-in and
   registration pages; and a page showing the content area's error display; and no `h1` while the movie detail page
   loads its film, while the sign-in check runs, or while the sign-in page completes a Google or GitHub sign-in.
9. `/browse/sequential` is registered only when `import.meta.env.DEV` is true, as `/dev/*` and `/testlogin` are, and
   a production build (`npm run build`) emits no `BrowseSequential` chunk.
10. A search of `frontend/src` finds no import of the removed sidebar components or of `useSidebar`, no
    `USER_NAVIGATION_ITEMS` or `MOVIE_VIEW_NAVIGATION_ITEMS`, no `layout-sidebar`, `sidebar-width`,
    `navbar-height-mobile` or `navbar-height-desktop` size and no `sidebar` z-index token; and `layout-navbar` resolves
    to 65px at every breakpoint.
11. Tests over the theme show the select recipe's indicator color, the global placeholder style, the button recipe's
    expanded fill in each variant R29 names, and the button, checkbox and switch recipes' focus outline (color `ring`,
    with no `outline` shorthand) naming theme roles; the select trigger and the search field focusing with a `tertiary`
    border and no outline, the field's border staying unchanged while its Search button has focus, and the
    advanced-filters toggle with a `ring` outline; component tests show the surfaces, borders and text of the pieces R29
    lists resolving to the roles it names, among them the account menu's panel with its 1px `border-subtle-02` border
    and `on-popover` items and, opened and moved with ArrowDown, its highlighted item filled with `tertiary` under
    `on-tertiary` text, and the bar's links and the window tabs, focused from the keyboard, drawing a `ring` outline,
    compared as resolved semantic variables (`var(--chakra-colors-…)`); the sign-in spec finds the account menu's
    trigger, focused from the keyboard, drawing its outline in `ring`'s color; and `npm run verify-contrast` passes with
    R29's two added pairs.
12. The smoke tier passes locally with six specs: `sign-in.spec.ts` finding the wide bar's controls at 1280×800 as R30
    lists; the phone-width spec at 360×800 finding every bar control's whole box inside the viewport signed out and
    signed in, the account trigger showing no username text, and the drawer's and the search field's controls; the axe
    scans without the sidebar's six baseline entries; exactly one `h1` on each page the specs reach; and the bar, found
    by its banner landmark, rendering at `layout-navbar`'s height at both viewports.
13. The documentation search R31 describes finds nothing, and ADR-002's and ADR-039's statuses name the new ADR,
    which reads `Accepted`.
14. Component tests show, with `oauth_in_progress` set to `google` and to `github`, the shell calling
    `window.__dismissPreloadOverlay` once it renders, and the content area showing "Logging in with Google..." or
    "Logging in with GitHub..." under the bar while the page loads (R17); and a component that throws in the bar
    itself rendering the last-resort full-page error display, and `/testlogin` showing its page-level loading
    fallback while it loads (R16).
15. Component tests show the bar as the banner landmark; the wordmark as a link named "CineXplorer" and not a
    heading; the account menu's trigger named by the full username, its username text cut off past 12rem with an
    ellipsis (a 12rem maximum width, no wrapping, hidden overflow); the phone bar's buttons named "Open menu",
    "Search films" and "Close search", and the drawer titled "Menu"; and the search field labelled "Search films",
    with that placeholder, submitting the trimmed query to `/search?query=` on Enter and on its Search button, and
    doing nothing for a blank query (R1, R3, R6 to R9).
16. Component tests show the window tabs as three links in a `nav` labelled "Release windows", the current one marked
    `aria-current="page"` (R19); the disabled year field reading "Release Year (In theaters)" and "Release Year (Coming
    soon)", the filter bar's region labelled "Film filters", and the advanced-filters toggle named "Advanced filters"
    with `aria-expanded` following its panel (R22); and the home page's section headed "Films", with buttons "All
    films", "In theaters" and "Coming soon" opening the three catalog URLs (R27).

### Proven after merge

17. The pull request's end-to-end smoke job passes with the six specs, and after merge the staging smoke run passes the
    five it runs (it skips sign-up), the phone-width spec included; staging serves the not-found page at
    `/browse/sequential`.

## 10. Open Questions

None.

## Amendments

- **2026-11-12,** during task generation, on the Owner's approval: R29 names the select indicator's roles,
  `foreground` at rest and `on-muted` when disabled, where it named only "a theme role". They are the colors the
  language select's arrow and the disabled filters' value text already draw. Decision 13's disposition for the theme
  roles (`none`, obvious from code) covers it. Wording only; the Success Criteria are unchanged, and the task list's
  review reads the PRD.
- **2026-11-12,** at the task list's review, on the Owner's approval: criterion 1's reason for leaving widths to the
  smoke specs now says jsdom is fixed at a 1024px width, where it said jsdom applies no breakpoint; jsdom evaluates
  media queries at that one width. Wording only; what criterion 1 checks is unchanged.
