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

**R3.** The hero's films are a fixed list of classic films identified by unique TMDB IDs, kept as a constant in
movie app backend code and changed through pull requests, like the catalog's window presets. Each read picks one
entry at random. The Owner is considering about 200–250 films, but settles the size after review; it is not a minimum
for merge. With N entries an immediate repeat has probability 1/N, which is accepted without tracking past picks.

- **The list.** The Owner chooses the films. The build starts from twelve provisional films: _Casablanca_,
  _Rear Window_, _Seven Samurai_, _Vertigo_, _North by Northwest_, _Lawrence of Arabia_, _2001: A Space Odyssey_,
  _The Godfather_, _Chinatown_, _Jaws_, _Alien_ and _Blade Runner_. A test asserts unique IDs without naming any
  particular ID. At merge, only films the Owner has signed off ship; additional approved films can follow in later
  pull requests. The full candidate list need not block the first merge.
- **Focus, checked artwork, short title and mirroring.** Each entry contains its TMDB ID, optional `focus_point`,
  optional `backdrop_path`, optional `title` and `mirrored`, false unless set. A point has paired finite `x` and `y`
  percentages from 0 to 100 inclusive, used as CSS `object-position`, not a TMDB crop. An unset point is returned as
  `null`, and the full-bleed hero uses `50% 28%`. Focus applies only to the full-bleed layout; the stacked portrait
  image is shown whole without a focus point. A stored backdrop path is the exact TMDB image path the Owner checked;
  when unset the current primary backdrop is used. A stored title is a shorter form of the film's title that the Owner
  chose, such as _Dr. Strangelove_, set only for a film whose full title cannot fit the credit space R8 reserves; when
  unset, TMDB's title is used. A mirrored entry's full-bleed image is flipped horizontally by a CSS transform when it is
  shown, for a frame whose subject would otherwise sit under the pitch panel: in a wide window the cover crop fills the
  hero's width, so a point can move the frame only vertically. Its point is given in the flipped frame, as the sheet
  shows it. The stacked image stays unflipped, and no flipped copy of an image is stored or served. The Owner flips only
  frames without legible writing or a well-known detail the flip would reverse. A listed development candidate retains
  all four fields; an unlisted candidate has no configured point, backdrop, title or mirroring. No request parameter
  supplies any of them. No focus editor is built into the app.
- **The check.** First screen the candidates by script through the DEBUG server's `GET /api/movies/featured?film={id}`:
  flag 404s, absent backdrops, unresolved title/year matches and credits (title, directors, year and any visible
  tagline) that may not fit R7's position. Other failed reads or image loads remain unresolved, never a passing screen.
  Flags advise; the Owner decides on each film. An external review sheet, kept in the landing run folder outside the
  repository and app, uses those responses without an API key. For each film it shows the same backdrop at the hero's
  wide, near-1024px and phone proportions, using the hero's actual layouts: cover fit, focus, pitch and text panels in
  the wide and near-1024px views; the whole image with its credit in the phone view. Points start at `50% 28%`; a click
  changes the two full-bleed views while the phone frame and credit stay unchanged. A toggle flips the two full-bleed
  views and the full frame, moving any point with its subject, while the phone view stays unflipped. It exports
  `FeaturedFilm(...)` lines containing the backdrop path shown, optional custom focus, any short title, any mirroring
  and a title-and-year comment. The Owner reviews each film in one page mode, settling its flags (an identity or year
  flag by explicit confirmation) and choosing its point and any flip in the sheet; no film needs a built-hero check
  before approval. The component's dark full-bleed and page-mode stacked treatments are checked in both modes once,
  rather than twice for every film. Approved entries are then applied to the list together. A script confirms that the
  DEBUG endpoint returns each applied entry's point, path, title and mirroring, reruns the credit-fit screen over every
  applied entry with the title it ships at each width where the credit has a reserved space, and captures the built hero
  through `/?film={tmdb_id}` at 2000×1000, 1024×1000 and 390×844, in one page mode, for every film with a custom point,
  mirroring or a flag. The Owner reviews those captures together: the subject survives the two full-bleed crops, and at
  phone width the whole frame shows with its credit fitting, not a focus-dependent crop. A film that fails is reframed,
  given a short title where its credit does not fit, or excluded before it ships. Credits must fit their reserved space
  and remain legible before an entry ships. A point exchanges visible edges; it cannot recover the full cover-cropped
  frame. Unapproved candidates stay out of the shipped list. A development Home passes its address's `film` parameter to
  the endpoint; a DEBUG server serves any candidate, listed or not. A production build never sends it and a production
  server ignores it for the random choice.

**R4.** `GET /movies/featured` serves the hero's film:

- public (no authentication), and registered before the detail route `/movies/{tmdb_id}`, as the list routes are;
- it returns a schema of its own, `FeaturedMovieSchema`: `tmdb_id`, `title`, `release_date`, `backdrop_path`, `tagline`,
  `directors`, `focus_point` and `mirrored`. `directors` is a list of director names from TMDB's appended credits: crew
  entries whose job is `Director`, in crew order, once per person; blank names are omitted. Missing credits or no named
  director returns `[]`. Backdrop and tagline are nullable, and an empty tagline from TMDB is returned as `null`.
  `focus_point` is either `null` or an object with required numeric `x` and `y` in the inclusive range 0–100, taken from
  the selected list entry (R3), not from TMDB. `backdrop_path` returns the entry’s checked path when present, otherwise
  TMDB’s current primary backdrop path. `title` returns the entry's short title when present, otherwise TMDB's title.
  `mirrored` returns the entry's flag: `false` when unset and for an unlisted candidate;
- it takes one optional query parameter, `film`, honored only as R3 gives it; no request parameter supplies a
  focus point, a backdrop path, a title or mirroring;
- a `MovieService` method picks the film (R3), through a choice that tests can replace, and reads it with one TMDB
  detail call through the client's `get_movie_details` with `append_to_response=credits`. This is one HTTP request,
  not a separate credits call; release dates are not appended. Only director names reach this response, not the full
  cast/crew payload. The route only extracts the parameter, calls the service and returns its result;
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

- the page's one `h1`, "Track what you watch. Find what's next.", using `text-wrap: balance`;
- in the full-bleed layout only, the line "New releases, all-time classics, and everything in between." It names
  the range of films rather than listing features, which the band does (R14). The stacked layout omits this line.
  TMDB attribution is the footer's, as on every page;
- **Create account**, the primary button opening `/register`, then **Sign in**, returning to Home after sign-in.
  The demo account's later "Try the demo" keeps its reserved first place; nothing stands in for it here.

**R7.** The hero has two arrangements, selected by the window rather than device identity:

- **Stacked:** below 1024px when the window is portrait (height at least width). The entire backdrop is shown at the
  top, without a fade, focus point or mirroring, using `object-fit: contain` in R8's full-width 16:9 area. Its aspect
  ratio is preserved; a non-16:9 image letterboxes rather than being cropped. A dark background remains under the image.
  Directly beneath it, the credit is left-aligned to the shared content edge, above the headline and actions.
  The text block, credit and controls follow the page's selected palette and mode through existing roles; the
  stacked hero is not forced dark. No text sits on the image.
- **Full bleed:** at 1024px and wider, and in landscape windows below 1024px. The backdrop covers the hero and uses
  the input focus point, defaulting to `50% 28%`; a mirrored film's backdrop is flipped horizontally, with the point
  given in the flipped frame. The hero alone scopes the selected theme's dark palette in either
  page mode. The pitch sits lower left on its own text panel. At 1024px and wider the credit stays
  on the right, right-aligned to the shared container edge, its bottom level with the actions row. In compact
  landscape windows below 1024px, the credit is above the pitch and right-aligned to that same container's right
  edge. It never follows the actions in compact layouts.
- **Text panels:** in full bleed, the pitch and the credit each sit on a separate hard-edged panel: a rectangle with
  square corners and no feathered edge, filled with the scoped dark `background` at about 90% opacity and extending
  about 24px of padding beyond its text. Each panel fits its text, and the text keeps the shared content edges. At
  1024px and wider the headline's two sentences each take their own line, as do the pitch line's two phrases ("New
  releases, all-time classics," / "and everything in between."), so the pitch panel is as wide as its longest line.
  A credit whose rows each fit on one line gets a panel as wide as its longest row; when a row wraps, the panel spans
  the credit's column, with at most about a word of slack under natural wrapping. Below 1024px a wrapped headline's
  panel may likewise span the content width. Panels never overlap, and at least 16px of image separates them; in
  compact landscape a credit fits its 128px row only if its panel also keeps that separation from the pitch panel.
  A panel's outer edge either meets the window's edge or stands at least 16px from it: where its padding would leave
  a narrower strip of image along the window's edge, as in compact landscape and windows up to about 1450px wide
  (the page content stops widening at 1440px), the panel runs flush to that edge instead. That choice follows the
  window width through CSS alone, so a static copy of the hero's markup and styles places the panels as the built
  hero does.
  Outside the panels the image keeps only a bottom fade that settles its lower edge, with no side-to-side darkening.
  The stacked layout has no panels, since its text does not sit on the image.

The credit is shown only while a backdrop is available and has this order:

1. The title alone, about 18px semibold in capitals with slightly widened letter spacing, linked with `from=home`,
   `tertiary-hover` on hover and a visible focus ring. The capitals are a CSS transform, and the link carries an
   explicit accessible name equal to the title, since browsers can expose transformed text in capitals. A long title
   wraps within the credit's column without truncation; it wraps naturally rather than balanced, which keeps a
   wrapped panel's slack under about a word.
2. Director names and release year, about 16px regular, as "Stanley Kubrick | 1968", using `foreground`. The
   separator is muted (`on-muted`), spaced slightly wider than a word space and hidden from assistive technology.
   Show the available names comma-separated; if names or year are absent, show the remaining part without an orphan
   separator. Omit the row when both are absent. This is plain text, with no link or hover effect.
3. The optional tagline, about 15px in `on-muted`, plain text clamped to two lines. It is visible at 768px and wider
   in stacked portrait and desktop layouts, but hidden in compact landscape below 1024px as well as below 768px.
   Thus 768×1024 portrait shows it, while 768×600 and 900×700 landscape do not.

The text panels carry the full-bleed text's contrast: at least 4.5:1 for normal text, including metadata and muted
tagline, and 3:1 for large text, measured over bright frames. There is no amber variant or fade into a light
page. All colors use existing semantic roles. The bar, rows and footer continue following the page mode.

Images are decorative (`alt=""`). Responsive TMDB sources include `original` when rendered image width exceeds 1280
device pixels; do not upscale `w1280` in that case or use site-only `*_multi_faces` or `*_face` crops.
The presentation takes film data, optional focus and mirroring as inputs, using both only in full bleed. Home owns the
featured read and development film parameter. The presentation does not pick a film or read its own route/query;
its inputs remain reusable for a later movie-page design without implementing that page here.

**R8.** Pending data, loaded artwork and read/image failure never move the pitch or actions at a fixed window size.
The full-bleed hero retains its 73svh height, minimum 480px at 1024px and wider and 560px in compact landscape.
Its compact credit occupies a reserved 128px row above the pitch even when no credit is shown. Desktop credit arrival
must not change the pitch row's height.

The stacked hero's height follows its image, reserved credit and pitch. Hold the 16:9 image area while pending and
on missing/failed artwork; retain a dark band instead of releasing the space. Releasing it would shift the pitch,
the reason the earlier phone strip was rejected. Hold 96px for the credit below 768px and 128px at wider stacked
widths, including its top inset, so arriving title/director/tagline text does not shift the pitch. Credits, with the
title in capitals, must fit that reservation at film acceptance. No title truncation is added: a film whose full
title cannot fit takes a short title (R3) or is excluded. Resizing can change arrangement and height, but
never introduces sideways page scrolling or credit/pitch overlap.

**R9.** A failed read, missing backdrop or failed image leaves the pitch and actions, with no image, credit or error
toast. In full bleed the existing dark fallback and reserved height remain. In stacked mode the dark image band and
credit reservation remain above the page-mode pitch. No failed image slot or caption space is released.

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

- At every supported width, the row's measured width and a whole-card count determine one shared card width.
  Prefer the grids' `CARD_WIDTH` (194px) and never go below 138px, the narrowest card the card controls fit (§ 6).
  Use the existing 16px gap: round `(row width + gap) / (194px + gap)` to choose the count, with at least one card,
  reducing it when needed to keep cards at least 138px. Divide the remaining width equally across that count.
- Every settled viewport shows complete cards, with no partial card at either edge. The loading placeholders and
  the watchlist's scroller use the same width calculation and count. A shorter list simply shows its films.
- The list scrolls sideways natively by swipe and trackpad, snaps to card edges, and hides its scrollbar. The two
  buttons, "Previous films" and "Next films", remain visible at every width. Each moves by the measured whole-card
  count, including the gaps; it is disabled at its corresponding end, and both are disabled when the list fits.
- The last page clamps to the final complete set of cards, overlapping the previous page when needed rather than
  showing a partial card or adding empty cells. After native scrolling, buttons page from the actual first card in
  view; resizing realigns the view to complete card edges using the new count.
- Keyboard focus moving through the cards brings each card into view. Nothing advances on its own. Button scrolling
  is smooth, and instant under `prefers-reduced-motion: reduce`.

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
| Browse every film | What's in theaters, what's coming, or the whole catalog by genre, year and rating. |
| Keep a watchlist | Save films from any poster and find them waiting on Home. |
| Know before you watch | The story, cast, crew, score and runtime of any film, on one page. |

It needs no read, so it has no loading or failed state.

**R15.** A **diary** lists viewings. "Recently watched" is its one use, built under R30 when its sources exist:

- It lists the visitor's five most recent logged viewings, newest first, one entry per viewing, so a film seen twice
  can appear twice, read from the user-movie tracking model's list of viewings (§ 6, Neighbouring work).
- Each entry shows the viewing's date; beside it, when the viewing is marked as a rewatch, the rewatch icon (a circular
  arrow named "Rewatch"); a small poster; the title and year; and the viewing's rating in the read-only star display.
  The icon and the star display are the tracking model's, shared with the Library's History and the film page.
- Each entry links to its film's page (R25), and "See all" opens the Library's History (`/library/history`), the
  timeline of the visitor's viewings, reviews and other changes to their films, newest first.

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
list; the visitor does that on the Watchlist page and in the Library. A card's own actions, which mark one film, are
offered on Home as wherever cards show. There is no hero. It shows, in order:

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
watchlist, the card shows alone. "See all" opens `/watchlist`, the Watchlist page, where the bar's Watchlist link
leads. The section's loading and failure are the watchlist read's (R22).

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
calendar's and the diary's entries) and the hero's credit title open the film's page with `from=home`, and the
movie page's
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
controls, the placeholders, the hero's text panels and bottom fade (its scoped dark `background`), the band's background
(`layer-01`) and the calendar's
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
- **b. If `main` has the Library's History (`/library/history`) and the tracking model's list of viewings,**
  signed-in Home builds "Recently watched" (R15) in its place (R18), with its read joining R22's, and the
  nothing-saved set counts its viewings.
- **c. If `main`'s `MovieCard` gives its watched and liked buttons accessible names and wires them,** this work adds no
  `/` baseline entry and restores no `/browse` or `/search` entry (R28); keeps `main`'s form of the signed-out rule
  (R26) where the two differ. This work retains R6's headline and line and R14's band copy; any copy expansion
  accompanying the card controls belongs with those controls, not this merge condition.
- **d. If `main` orders the watchlist as a queue on the Watchlist page,** the watchlist section reads "Up next" in
  place of "Your watchlist" and leads with the first film in the queue: its read sends the sort value and direction
  that put the queue's first film first, as the Watchlist page does, in place of R20's defaults (the endpoint's
  `direction` defaults to `desc`), and the frontend's `UserMoviesQueryParams` carries `sort` and `direction`, gaining
  them unless `main`'s already does. The large card gains a "Reorder" link to the Watchlist page (`/watchlist`),
  since the queue is ordered only there.

## 5. Non-Goals (Out of Scope)

- **The demo account,** with its sign-in, seeding and nightly purge, and its "Try the demo" button: an accounts and
  sign-in concern of its own (§ 8, decision 16).
- **The Films hub:** a page of this work's section forms and its own (a numbered top-ten list, genre and decade tiles
  that open the catalog already filtered), which follows as its own work and settles its own sections. Until it exists,
  Films opens the catalog.
- **The user-movie tracking model, card controls and Library,** and what they own: the list of logged viewings, card
  actions, the Watchlist page, and the Library with its History. This work builds "Recently watched" only under R30.
- **Card actions on the large card:** planned follow-up work, once the user-movie card controls settle those actions.
  Until then the large card links to the film's page.
- **The watchlist's queue and its ordering:** the queue's own work. Home reads the order it sets (R20, R30).
- **The app's other toasts:** sign-in progress and errors, registration progress, and the verified and signed-out
  notices move inline as separate work, with a rule for when a toast fits. This work removes only the sign-in welcome
  (R23).
- **The privacy and terms pages and their links** from Home and the footer, and Home's line on why the app asks for
  Google sign-in data, which must agree with the policy those pages publish.
- **The footer,** including its TMDB attribution, already in `Footer`.
- **The movie detail page's redesign.** It can use the two new detail fields (R5) and the input-based hero later;
  this work changes only its back link (R25), not its presentation or API focus metadata.
- **Content beyond these sections:** curated collections, trending, "this week in film history", trailers and where to
  watch.
- **Caching TMDB responses on the server.**
- **A separate tablet page.** The hero alone has R7's two arrangements and tagline rules. The calendar keeps its
  existing below-1024px arrangement; poster counts come from available row width. No third tablet page or hero
  arrangement is added.

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
      `button-name` baseline entries (R28). Any associated copy changes belong with the controls; this work keeps
      R6's pitch and R14's band copy.
    - **The Library** keeps the Watchlist page at `/watchlist`, which shows the watchlist with its sorts and no
      redirect, and adds the Library at `/library`, the films the visitor has seen, with History at
      `/library/history`, the timeline of their viewings and reviews. The bar's Watchlist link stays, Library joins
      it and Films reads Explore. If this work merges first, the Library's work adds "Recently watched" as R15
      designs it.
    - **The watchlist queue** adds an order the visitor sets on the Watchlist page, which the Library endpoint returns
      as one more sort value. If this work merges first, the queue's work makes R30d's change.
- **A first visit starts a session per list request.** Each list request from a visitor without a session creates one
  (`_create_dedup_tracker`), so Home's two parallel section requests on a first visit can create two, of which the
  browser keeps the last. The catalog already does this, one request at a time, and the nightly `clearsessions` removes
  expired ones. Each duplicate-tracking record expires after an hour, so Home's second context adds at most two short-
  lived records per page load.
- **Images.** The local smoke target aborts requests to other origins, so images there never load: the hero then shows
  the pitch alone (R9), and posters leave their alt text, as the catalog's cards already do there (R10). Axe can't
  measure text over an image and leaves such text for manual review rather than failing it. R7's contrast comes from
  the scoped dark palette and the separate pitch and credit panels. Check the actual text
  bounds and contrast over bright frames, including the muted tagline; a green axe scan alone does not prove it.
- **TMDB backdrops change.** A curated entry can pin the exact backdrop path the Owner checked, so a changed
  primary backdrop does not silently change its framing. An entry without a stored path still follows the primary.
  A pinned image can later disappear; R9 then keeps the pitch without artwork or credit. Recheck and replace the
  path, reframe or remove that film through a pull request. The panels protect text contrast, not image availability.
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
  The pitch's line names the range of films rather than features, so it holds as features arrive. The band names
  only what works when this work merges (R14), and grows with the card controls in the controls' work. R30c does not
  overwrite the approved pitch or band. New names are in sentence case; only the hero's film title is set in capitals.
- **Widths.** At 1024px (`lg`), where the bar switches, full-bleed credit uses the desktop right-hand column and
  calendar weeks sit side by side. Below it, portrait stacks the image while landscape keeps full bleed with credit
  above the pitch. Stacked taglines appear from 768px; compact landscape omits them. Rows derive whole-card counts
  from their own width. Phone layouts fit from 360px.

## 8. Design Decisions

1. **Home renders by sign-in status at `/`, replacing `Featured`** (R1, R2). A separate landing route was not
   considered: Google checks the app's homepage, and the wordmark on every page links to `/`. The loading state while
   `status` resolves keeps a returning visitor from seeing the pitch flash. Its cost is accepted: every visitor without
   a stored token, first-time visitors included, waits for the session read before the pitch shows, since a returning
   Google or GitHub visitor also has no stored token. _ADR: the new ADR below, which supersedes ADR-044 in part._
2. **The hero is a classic film from an Owner-sized fixed list, picked at random on each page load** (R3, R4), and held
   while the app stays loaded, until a reload or a change of user, so coming back to Home doesn't swap the film under
   the visitor. The list keeps the identity of films chosen by hand, and its size and a new film on each load make the
   page feel alive. One film a day from a dozen was considered first, the same film all day so that it could be checked
   by hand; a development-only parameter showing any film answers that need with a random pick too. The week's
   top trending title needs no list, but gives up the identity the list provides, and some weeks the top title is a poor
   fit for the first screen. With N unique IDs an immediate repeat has probability 1/N and is accepted. The
   candidate pool may reach 200–250; signed-off films can ship in stages. The external three-crop sheet and scripted
   flags keep review practical. The sheet's views are the built hero's own markup and styles, so films are approved
   there and checked once more as a batch: by script against the endpoint, and by the Owner over built-hero captures
   of custom-point or flagged films. A per-film round trip through the app, applying each moved point before viewing
   it, was dropped as costing most of the review's time while repeating what the sheet already shows. Phone
   review checks the whole frame and credit fit, not focus cropping.
   Checked backdrop paths preserve the reviewed image, and a stored short title keeps a film whose full title cannot
   fit its credit space, rather than truncating titles for every film. A mirrored entry keeps a frame whose subject
   would sit under the pitch panel: a wide hero's cover crop fills its width, so a point cannot move the subject
   sideways, and the frame would otherwise be excluded. TMDB's API terms forbid making derivatives of its content and
   say nothing specific about how images are displayed; the flip, like the crop and the panels, is applied only when
   the image is shown, and no flipped copy is stored or served. The stacked image stays unflipped, since no text
   covers it. _ADR: revise this work's Proposed ADR-046 for curated artwork metadata, the short title, mirroring and
   the review method; sheet controls are temporary review tooling and need no separate ADR._
3. **A small hero endpoint reads the hero's film from TMDB** (R4, R5): one TMDB detail call, a schema with only what the
   hero shows, and no stored state. Having the frontend pick the film and call the detail endpoint was rejected:
   the list would live in the frontend and every page load would pay its two TMDB calls. The hero now needs director
   names, so it appends credits to its own single detail request and returns only those names. Storing the backdrop
   and tagline on `Movie` and serving the hero from the database was
   rejected: a migration and two card fields that no card shows, kept only for the hero, and `Movie` rows exist only
   for films someone has saved. When TMDB fails, the hero falls back to the pitch rather than to another film, since
   the pitch stands alone (R9). _ADR: the new ADR below._
4. **The hero preserves the whole frame in narrow portrait windows and stays full bleed elsewhere** (R3, R6–R9).
   Portrait-only stacking below 1024px avoids severe phone cropping without a tall image stack in narrow landscape
   windows. Width-only stacking was rejected after the 900×700 preview put actions below the initial view.
   Stacked text follows page mode because it no longer sits on an image; full bleed retains the scoped dark palette,
   with the pitch and credit on separate hard-edged text panels. Feathered fades sized to the text were replaced:
   their soft edges vanished on dark frames and read as smudges on bright ones. A hard panel looks the same on every
   frame and carries the contrast itself, so the image needs no side-to-side darkening and shows at full strength
   outside the panels. Compact landscape credits stay above the pitch, right-aligned, with no tagline;
   desktop credits keep their right-hand position. Title, director/year and permitted tagline form separate rows.
   Keeping the stacked image and credit spaces on failure avoids the shift caused by releasing a phone strip.
   Full-bleed focus defaults to `50% 28%`; the stack ignores it. _ADR: revise this work's Proposed ADR-046 for the
   arrangements, text panels, director read, palette scope and retained fallback. Credit typography, the title's
   capitals and the separator's spacing are tactical._
5. **Home's copy names only what works when it merges** (R6, R14, R30c): a visitor who reads "rate what you've seen"
   and can't would distrust the rest. The headline states the app's purpose and stands either way. The pitch line
   names the range of films rather than features, so it holds as features arrive; the band lists features and grows
   with them. _ADR: `none`
   (temporary: the copy grows with the card controls)._
6. **Rows of posters share one component, and cards hide their actions signed out** (R11, R26). Each row draws
   `MovieCard`, so card actions added later reach every row without a change here. A signed-out visitor sees no card
   actions anywhere, rather than controls that do nothing or fail; the user-movie card controls adopt the same rule.
   The shorter signed-out card leaves the catalog grid's fixed row spacing as it is, so signed-out catalog rows sit
   further apart for now. A row height chosen by sign-in status was set aside: a scroll position saved under one status
   and restored under the other would land on another row, and the card controls change that spacing anyway. Row cards
   fill a whole-card viewport near the grids' width and never go below 138px, so the controls fit. Count-based
   paging, card-edge snapping and shared loading geometry avoid a clipped card at any settled width. _ADR: the
   new ADR below._
7. **Signed-in Home is a quick look at what's next and recent, sending the visitor on** (R18, R20 to R22). Each page
   keeps its own job: Films is the same program for everyone, personal only in the marks on its cards; the Watchlist
   page and the Library hold everything the visitor has kept and are the only places they sort, filter or reorder;
   Home shows the top of the visitor's lists and a little of what's on. A smaller copy of those pages or of the
   catalog was rejected: a personal list on Home competes with them, and rows of what's on alone repeat what Films
   shows everyone. The page set is held while shown, so a first save doesn't rebuild the page under the pointer.
   _ADR: the new ADR below._
8. **The watchlist leads with the film the Watchlist page puts first** (R20, R30d), which becomes the first film in
   the visitor's queue once the watchlist can be ordered: the film they plan to see next. The newest addition, what
   the order gives today, is not necessarily that film. Home reads the Library endpoint's default order today and
   sends the queue's sort value and direction once the queue exists. Reordering the queue on Home was rejected: the
   Watchlist page stays the one place the visitor reorders it, and the large card links there. _ADR: the new ADR
   below._
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
    tagline cut to two lines; 1024px as the bar's switch, changing the credit's arrangement and the calendar but not
    prescribing poster widths; and the band's heading visually hidden, its points carrying the visible titles.
    _ADR: `none` (tactical)._
19. **One change** (§ 6, The size). The hero endpoint serves this page, the two detail fields come from the same TMDB
    response, and Home's two forms share the section forms. The demo account and moving the app's other toasts inline
    are separate concerns and stay their own work. _ADR: `none` (meets none of the ADR criteria)._
20. **Home renders outside the app's padded container** (R2), so the hero and the band can span the viewport while
    Home's other sections keep every page's width and padding. A `100vw` breakout inside the container was set aside:
    it scrolls sideways while a vertical scrollbar shows. _ADR: `none` (tactical)._

**ADRs this work delivers:**

- **New: ADR-046, "Open Home on a classic film and sections of films"** (decisions 1 to 4, 6 to 11, and 15). It
  records Home's two forms by sign-in status at `/`; the hero's classic film, picked at random from a fixed list and
  served by its own endpoint with director names, optional focus, checked-backdrop and short-title metadata; a dark
  full-bleed hero with hard-edged text panels and a page-mode whole-frame portrait stack; Home's section forms and
  states; signed-in Home's job beside Films, the Watchlist page and the Library, its greeting on arrival and its
  watchlist order; what's on from catalog views; cards without actions for signed-out visitors; and
  `background.spec.ts` supplying Home's responses itself in both smoke targets. It supersedes in part:
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

1. [~] Backend tests, with TMDB replaced at its client and the random choice replaced, show `GET /movies/featured`
   answering without authentication with `tmdb_id`, `title`, `release_date`, `backdrop_path` and `tagline`; the film
   the choice picks from the list; with `DEBUG` on, an ID passed as `film` served, whether or not it is on the list;
   with `DEBUG` off, a `film` ignored for the choice's pick; one TMDB detail call per request and no credits call;
   an empty tagline returned as `null`; and a failed TMDB call answered 502 and an unknown ID 404, each with
   `{"detail": ...}`. They show `MovieDetailSchema` carrying `backdrop_path` and `tagline`.

   _Superseded by the 2026-11-13 amendment; replacement: criterion 18._

2. Component tests show Home at `/` in the loading state with no `h1` and no pitch while `status` is `resolving`, the
   signed-out page while it is `anonymous`, the signed-in page while it is `authenticated`, and Home switching when
   `status` changes; signed-out Home rendering the hero, "Popular in theaters", "Most anticipated" and the band, in
   that order, with no card actions; and `routing.test.tsx` shows `/featured` redirecting to `/` and rendering Home.
3. [~] Component tests show the hero's `h1`, line and actions before its read settles; once it settles with a film, the
   credit naming the title and year, with the tagline when present, linking to the film with `from=home`; the pitch
   and actions with no credit, no image and no "Server error" toast when the read fails, when `backdrop_path` is `null`
   and when the image fails to load; the same film after navigating away from Home and back, with no second read; the
   hero's query options never stale, with `gcTime: Infinity` and no refetch on mount, focus or reconnect, checked on
   the options themselves, since the test client already keeps every query; and, in a development build, Home at
   `/?film={tmdb_id}` passing that ID to the read.

   _Superseded by the 2026-11-13 amendment; replacement: criterion 19._

4. Component tests show each section form but the band with its title and placeholders while loading, absent with no
   films, and failed with its title, "Couldn't load these films." and Retry, which refetches that section's read alone;
   no "Server error" toast on a failed section, while a failed read on the watchlist page still raises it; each
   section as a `section` named by its `h2`; and `PosterPlaceholder` for a film without a `poster_path` in a row, in
   the calendar and on the large card.
5. [~] Component tests of the poster row, with the list's scroll measurements supplied since jsdom does no layout,
   show at most 20 cards in a list; "Previous films" disabled at the start and "Next films" at the end, and both
   when the list
   doesn't overflow; Next scrolling by the visible width, smoothly, and instantly under reduced motion; and "See all"
   present or absent with its destination.

   _Superseded by the 2026-11-13 amendment; replacement: criterion 20._

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
    without them where R30c applies (criterion 30).
14. [~] In the browsable stack at 1280×800 and 360×800, in light and dark mode, checked by hand: the hero and the band
    spanning the viewport with no sideways scroll, and Home's other sections at every page's width; the wide hero
    keeping its height with and without a film, and the phone hero holding the backdrop's space while the read is
    pending and releasing it when the image fails; the calendar showing weeks side by side with up to three films at
    1280 and stacked with up to two at 360; row cards 194px wide at 1280 and no narrower than 138px at 360; every row
    scrolling by its buttons, by swipe (touch emulation) and by Tab through its cards; scrolling instant with reduced
    motion emulated; and nothing on Home drawing a color outside its theme roles. The Owner's list has replaced the
    provisional one, and the Owner has signed off each film on it in the built hero, in both modes, through `/?film=`
    (R3).

    _Superseded by the 2026-11-13 amendment; replacement: criterion 21._

15. A search of `.arc/reference`, outside the archive and the ADR bodies, and of the root README finds no description
    of one pagination context for every movie request, of Back to Results as the only spec supplying its own responses
    on staging, or of the landing page as in development, as current; ADR-002's, ADR-026's, ADR-039's and ADR-044's
    statuses name ADR-046 as superseding them in part, each with its part named, and ADR-046 reads `Accepted`.
16. [~] R30's changes, each where its condition held at the final merge of `main`: the API types match the merged
    backend (CI's type-drift check passes); with the Activity tab on `main`, component tests show "Recently
    watched" as R15
    gives it and the nothing-saved set counting viewings; with named card buttons on `main`, the scans pass without the
    three `button-name` entries and the pitch's line and the band name watching, rating and liking; and with the queue
    on `main`, component tests show the watchlist read sending the queue's sort value and direction, "Up next" leading
    with the queue's first film, and the large card's "Reorder" link.

    _Superseded by the 2026-11-13 amendment; replacement: criterion 22._

18. [~] Backend tests, with TMDB replaced at its client and the random choice replaced, show `GET /movies/featured`
    answering without authentication with `tmdb_id`, `title`, `release_date`, `backdrop_path`, `tagline` and nullable
    `focus_point`; the film the choice picks from the list and its configured point, or `null` when unset. Both point
    coordinates accept 0 and 100 and reject non-finite or out-of-range values. With `DEBUG` on, a listed candidate
    carries its configured point and an unlisted candidate returns `null`; with `DEBUG` off the random entry's film
    and point are returned instead. They show one TMDB detail call per request and no credits call, an empty tagline
    returned as `null`, and a failed TMDB call answered 502 and an unknown ID 404, each with `{"detail": ...}`.
    `MovieDetailSchema` retains its backdrop and tagline fields. Regenerated OpenAPI and frontend types carry the
    featured focus-point contract.

    _Superseded by the 2026-11-14 amendment; replacement: criterion 23._

19. [~] Component tests show R6's exact headline, line and actions before the film read settles; once it settles,
    the title and year alone link with `from=home` and the optional tagline is noninteractive text. The pitch and
    actions remain with no credit, image or Server error toast on read failure, a null backdrop or image failure.
    The film stays the same across navigation with one read; query options remain never stale, `gcTime: Infinity`
    and no refetch on mount, focus or reconnect, checked on the options themselves. In development, `/?film={tmdb_id}`
    passes that ID to the read. The input-based hero uses a supplied focus point, including edge values, and defaults
    to `50% 28%` when unset; Home passes the featured response's point without another read. No selected-layout or
    amber preview option remains in the delivered page.

    _Superseded by the portrait/director amendment of 2026-11-14; replacement: criterion 25._

20. Row geometry and component tests, with browser measurements supplied in jsdom, show at most twenty cards,
    whole-card counts and widths near 194px and never below 138px, count-based paging including gaps, the overlapping
    final complete page, paging from the actual position after native scrolling, and realignment after resizing.
    Previous is disabled at the start, Next at the end, and both when the list fits. Loading placeholders and the
    watchlist scroller use the same count. See all is present with its destination or absent as supplied. Button
    scrolling is smooth and instant under reduced motion. Browser checks show no partial cards at rest, card-edge
    snapping, a hidden scrollbar and visible buttons at every checked width.

21. [~] In the browsable stack at 2000×1000, 1024×1000 and 390×844, in light and dark page mode, the hero alone keeps
    the dark palette and fills the viewport width without page overflow. It holds its 73svh height (subject to R8's
    minimum) before loading, with a film and on read or image failure, with no movement of pitch or actions. The
    cover crop follows the input point at every width, defaulting to `50% 28%`. The desktop credit's bottom aligns
    with the actions and its right edge with the content container; on phones it follows the actions aligned left.
    Its title is about 18px semibold with title-only hover and visible keyboard focus, and its noninteractive
    tagline about 15px muted and at most two lines. Separate neutral fades cover the actual pitch and credit bounds
    with at least 75% image suppression; bright-frame checks show the required text contrast, including the tagline.
    At 1280×800 and 360×800 the calendar still shows side-by-side weeks with up to three films and stacked weeks
    with up to two respectively. At those widths and the three hero widths, rows show complete cards at least
    138px wide, with buttons, swipe, trackpad and Tab movement and instant reduced-motion scrolling. The band spans
    the viewport, the other sections retain the shared page width, and all colors use existing roles. The Owner's
    final films and focus points replace the provisional list, each signed off through `/?film=` at wide,
    near-1024px and phone widths in both modes (R3).

    _Superseded by the 2026-11-14 amendment; replacement: criterion 24._

22. [~] R30's changes, each where its condition held at the final merge of `main`: the API types match the merged
    backend (CI's type-drift check passes); with the Activity tab and viewing source on `main`, component tests show
    Recently watched as R15 gives it and the nothing-saved set counting viewings; with named card controls on `main`,
    the scans pass without the three button-name baselines; and with the queue on `main`, component tests show the
    watchlist read sending its sort and direction, Up next leading with its first film, and the large card's Reorder
    link. The approved R6 pitch and R14 band copy are retained; this merge condition does not expand them.

    _Superseded by the Library-pages amendment of 2026-11-14; replacement: criterion 30._

23. [~] Backend tests, with TMDB replaced at its client and the random choice replaced, show `GET /movies/featured`
    answering without authentication with `tmdb_id`, `title`, `release_date`, `backdrop_path`, `tagline` and nullable
    `focus_point`; the film the choice picks from the list and its configured point, or `null` when unset. Both point
    coordinates accept 0 and 100 and reject non-finite or out-of-range values. With `DEBUG` on, a listed candidate
    carries its configured point and an unlisted candidate returns `null`; with `DEBUG` off the random entry's film
    and point are returned instead. They show one TMDB detail call per request and no credits call, an empty tagline
    returned as `null`, and a failed TMDB call answered 502 and an unknown ID 404, each with `{"detail": ...}`.
    `MovieDetailSchema` retains its backdrop and tagline fields. Regenerated OpenAPI and frontend types carry the
    featured focus-point contract.
    The list's IDs are unique without
    depending on particular IDs. Selection returns an entry's checked backdrop path when present, even when TMDB's
    primary changes or is null; without a checked path it returns the current primary. Listed DEBUG candidates keep
    that override, unlisted candidates use TMDB, and production returns the random entry's metadata. No extra TMDB
    request or request-supplied focus or backdrop is introduced.

    _Superseded by the portrait/director amendment of 2026-11-14; replacement: criterion 26._

24. [~] In the browsable stack at 2000×1000, 1024×1000 and 390×844, in light and dark page mode, the hero alone keeps
    the dark palette and fills the viewport width without page overflow. It holds its 73svh height (subject to R8's
    minimum) before loading, with a film and on read or image failure, with no movement of pitch or actions. The
    cover crop follows the input point at every width, defaulting to `50% 28%`. The desktop credit's bottom aligns
    with the actions and its right edge with the content container; on phones it follows the actions aligned left.
    Its title is about 18px semibold with title-only hover and visible keyboard focus, and its noninteractive
    tagline about 15px muted and at most two lines. Separate neutral fades cover the actual pitch and credit bounds
    with at least 75% image suppression; bright-frame checks show the required text contrast, including the tagline.
    At 1280×800 and 360×800 the calendar still shows side-by-side weeks with up to three films and stacked weeks
    with up to two respectively. At those widths and the three hero widths, rows show complete cards at least
    138px wide, with buttons, swipe, trackpad and Tab movement and instant reduced-motion scrolling. The band spans
    the viewport, the other sections retain the shared page width, and all colors use existing roles. Each film
    shipped at merge has Owner sign-off from
    the external three-crop review sheet in one mode, with its shown backdrop path stored. The screen flags failed
    lookups, missing artwork and potential credit-fit problems for Owner decisions. Every custom-point or flagged
    film is additionally checked in the built hero at all three hero widths in one mode; the component's two-mode
    check above is not repeated per film. Unapproved candidates remain out of the shipped list and may follow by
    later pull request. The sheet exports entry lines with title/year comments, optional focus and checked paths;
    it remains outside the repository and application, uses the DEBUG endpoint and holds no API key.

    _Superseded by the portrait/director amendment of 2026-11-14; replacement: criterion 27._

25. Component tests retain the immediate headline/actions, lifetime query, navigation and quiet failure contract
    of criterion 19, with the new arrangements: the pitch line appears only in full bleed; the title alone links;
    director/year is plain text with available parts and no orphan separator; missing names use the year alone.
    Taglines appear on desktop and stacked widths from 768px, and disappear on smaller phones and all compact
    landscape views. Supplied and default focus apply only in full bleed; the portrait stack shows the whole frame.
    Home supplies API director data, with no preview-name fixtures or layout/surface query selectors remaining.

26. [~] Backend tests, with TMDB replaced at its client and the random choice replaced, show `GET /movies/featured`
    answering without authentication with `tmdb_id`, `title`, `release_date`, `backdrop_path`, `tagline`,
    `directors` and nullable
    `focus_point`; the film the choice picks from the list and its configured point, or `null` when unset. Both point
    coordinates accept 0 and 100 and reject non-finite or out-of-range values. With `DEBUG` on, a listed candidate
    carries its configured point and an unlisted candidate returns `null`; with `DEBUG` off the random entry's film
    and point are returned instead. They show one TMDB detail call per request and no separate credits or
    release-dates call, an empty tagline
    returned as `null`, and a failed TMDB call answered 502 and an unknown ID 404, each with `{"detail": ...}`.
    `MovieDetailSchema` retains its backdrop and tagline fields. Regenerated OpenAPI and frontend types carry the
    featured focus-point contract.
    The list's IDs are unique without
    depending on particular IDs. Selection returns an entry's checked backdrop path when present, even when TMDB's
    primary changes or is null; without a checked path it returns the current primary. Listed DEBUG candidates keep
    that override, unlisted candidates use TMDB, and production returns the random entry's metadata. No extra TMDB
    request or request-supplied focus or backdrop is introduced.

    Tests show named Director crew returned once per person in crew order, multiple directors, empty/absent credits
    returning `[]`, and non-director or blank-name crew omitted. Credits are appended within the one detail request;
    generated OpenAPI/frontend types expose the director-name list and no full cast/crew payload.

    _Superseded by the label-panel amendment of 2026-11-14; replacement: criterion 28._

27. [~] Browser checks in both page modes retain criterion 24's whole-card rows, calendar, band, shared widths,
    overflow, keyboard/swipe/trackpad/reduced-motion and text contrast checks. At 390×844 and 768×1024 the hero stacks
    a whole image over credit and pitch, follows page mode, omits the pitch line, and ignores focus. At 900×700 and
    768×600 it stays full bleed with credit above the pitch, right-aligned and without a tagline; at 1024×1000 and
    2000×1000 the dark full-bleed arrangement and right-hand credit remain. Taglines appear on the portrait tablet.
    Pending, loaded and failed reads/images retain pitch/action coordinates and reserved image/credit space.
    Bright-frame measurements include the new 16px director row; title-only hover and keyboard focus remain.
    All films shipped at merge have Owner approval through the external sheet in one mode, retaining the exact shown
    backdrop path. Script flags failed reads/artwork, identity/year mismatches and credit-fit problems for decisions.
    Custom-point or flagged films receive built checks at wide and near-1024px focus crops and phone whole-frame
    credit fit; no phone focus crop or per-film two-mode requirement remains. The sheet uses actual layout snapshots,
    preserves focus for full bleed only, exports approved entry lines with title/year comments and checked paths,
    and remains outside the repository/app without an API key. Pending candidates can follow in later pull requests.

    _Superseded by the label-panel amendment of 2026-11-14; replacement: criterion 29._

28. [~] Backend tests retain criterion 26's featured-film coverage, and also show an entry's optional short title
    returned as `title` in place of TMDB's: kept for a listed DEBUG candidate and for the random entry in
    production, while an unlisted candidate and an entry without one return TMDB's title. The response shape, the
    one TMDB detail call and the generated OpenAPI and frontend types are unchanged, and no request parameter
    supplies a title.

    _Superseded by the mirrored-backdrop amendment of 2026-11-14; replacement: criterion 31._

29. [~] Browser checks in both page modes retain criterion 27's rows, calendar, band, shared widths, overflow,
    interaction, arrangement, reserved-space, hover and focus checks, with these changes. In full bleed at 2000×1000,
    1500×900, 1450×900, 1280×800, 1024×1000, 900×700 and 768×600, the pitch and the credit sit on separate hard-edged
    panels that fit their text and never overlap, with at least 16px of image between them. A panel runs flush to the
    window's edge exactly where its padding would leave less than 16px of image there, and otherwise stands at least
    16px from it; flush at 1450×900 and below, inset at 1500×900 and wider. At 1024px and wider the headline's sentences
    and the line's two phrases take their own lines, and the pitch panel is no wider than its longest line plus its
    padding. A credit panel is no wider than its longest row plus its padding, or its column plus its padding when a row
    wraps; on a side where a panel runs flush, that limit extends to the window's edge. Long titles wrap without
    truncation. Outside the panels the image keeps only its bottom fade. Measured over bright frames, panel text reaches
    4.5:1 for normal text, including director/year and the muted tagline, and 3:1 for large text. The film title shows
    in capitals while the browser's accessibility tree names its link with the title in its own case, and the
    director/year separator is muted and hidden from assistive technology. The hero shows R6's line and the band R14's
    points. With capitalized titles, every shipped film's credit fits its reservation at 360×800, 390×844, 768×1024,
    900×700 and 768×600. All films shipped at merge have Owner approval through the external sheet in one mode,
    retaining the exact shown backdrop path and any short title. Script flags failed reads/artwork, identity/year
    mismatches and credit-fit problems for decisions. A script confirms each applied entry's point, path and title
    through the DEBUG endpoint, and the Owner has reviewed built-hero captures of every custom-point or flagged film at
    2000×1000, 1024×1000 and 390×844 in one mode. The sheet uses actual layout snapshots, preserves focus for full bleed
    only, exports approved entry lines with title/year comments, checked paths and short titles, and remains outside the
    repository/app without an API key. Pending candidates can follow in later pull requests.

    _Superseded by the mirrored-backdrop amendment of 2026-11-14; replacement: criterion 32._

30. R30's changes, each where its condition held at the final merge of `main`: the API types match the merged
    backend (CI's type-drift check passes); with the Library's History and the viewing source on `main`, component
    tests show Recently watched as R15 gives it, its See all opening `/library/history`, and the nothing-saved set
    counting viewings; with named card controls on `main`, the scans pass without the three button-name baselines;
    and with the queue on `main`, component tests show the watchlist read sending its sort and direction, Up next
    leading with its first film, and the large card's Reorder link opening `/watchlist`. The approved R6 pitch and
    R14 band copy are retained; this merge condition does not expand them.

31. Backend tests retain criterion 28's featured-film coverage, except that the response and the generated OpenAPI
    and frontend types gain `mirrored`, and also show an entry's `mirrored` returned as configured: kept for a listed
    DEBUG candidate and for the random entry in production, and `false` for an entry without it and for an unlisted
    candidate. The one TMDB detail call is unchanged, and no request parameter supplies mirroring.

32. Browser checks retain criterion 29's checks, with these changes. Component tests show a mirrored film's
    full-bleed image flipped horizontally with its position the mirror of its point (`100 − x`), so a point given in
    the flipped frame holds; its stacked image unflipped; an unmirrored film's image unchanged; and no text flipped.
    Home passes the featured response's `mirrored` to the presentation. The script confirms each applied entry's
    mirroring with its point, path and title through the DEBUG endpoint, and the Owner's built-hero captures cover
    every mirrored film as well as every custom-point or flagged one. The sheet flips its two full-bleed views and its
    full frame, but not its phone view; moves a set point with its subject when the flip changes, returning an
    approved film to pending; and exports and saves the flip with each approved entry.

### Proven after merge

17. The pull request's end-to-end smoke job passes with the seven specs, and after merge the staging smoke run passes
    the six it runs (it skips sign-up), `background.spec.ts` with its stubbed reads. Staging serves `/` to a signed-out
    browser without a redirect: the address stays `/` and the page shows the headline.

## 10. Open Questions

None.

## Amendments

- **2026-11-13 — Full-width dark hero, film focus and whole-card rows (Owner).** Replaces the page-colored strip
  and detached credit with the selected full-width neutral-fade design, scoped to the dark palette in either page
  mode. Records the revised credit placement and type, per-film optional focus points with a `50% 28%` default,
  the balanced headline and new line, and whole-card row sizing and paging. Updates R3, R4, R6–R9 and R11, with
  corresponding theme, copy, image and decision wording. Criteria 1, 3, 5, 14 and 16 are superseded by 18–22;
  implementation Tasks 4.7–4.9 precede the final film checks in 5.1. ADR disposition: revise this work's Proposed
  ADR-046 for the dark hero, contrast source and focus metadata; row measurements, copy and credit typography are
  tactical details and require no additional ADR. The film page's later reuse and a focus editor remain outside
  this work.

- **2026-11-14 — Scale film review and retain checked backdrops (Owner).** The Owner may choose 200–250 films
  or a smaller staged list. R3's external three-crop sheet and scripted flags replace exhaustive two-mode built-hero
  checks; only custom-point or flagged films need three built views, in one mode. R4 returns the optional checked
  backdrop path from each entry instead of a changed primary. Adds ID uniqueness coverage and updates decision 2,
  the backdrop risk, ADR-046 and Tasks 5.0–5.1. Criteria 18 and 21 are superseded by 23 and 24. ADR disposition:
  revise this work's Proposed ADR-046 for checked artwork and the review method; temporary external sheet controls
  require no separate ADR. The app's no-editor and no-request-focus boundaries remain.

- **2026-11-14 — Whole-frame portrait hero and director credit (Owner).** Below 1024px, portrait windows stack a
  whole image above a page-mode credit and pitch; landscape retains full bleed. Retained image/credit space prevents
  failure shifts. Compact landscape credit is above the pitch, right-aligned and without a tagline. The credit now
  separates title from director/year; tagline remains from 768px on portrait/tablet and desktop only. Director names
  use appended credits within one TMDB detail request. Focus applies to full bleed only, and the external sheet's
  phone view/check becomes whole frame plus credit fit. Updates R3/R4/R6–R9, the tablet non-goal, decisions, affected
  tasks and ADR-046. Criteria 19, 23 and 24 are superseded by 25–27. ADR disposition: amend this work's Proposed
  ADR-046 for layout, source of director metadata, palette and retained failure space; type sizes remain tactical.

- **2026-11-14 — Label panels, broader pitch and batch film checks (Owner).** Feathered text fades looked
  inconsistent across frames, so the full-bleed pitch and credit now sit on separate hard-edged panels of about 24px
  padding that fit their text, flush to the window's edge exactly where under 16px of image would remain, through CSS
  alone. From 1024px the headline and line break into short fixed lines so the pitch panel fits its longest line; a
  credit panel spans its column only when a row wraps. The image loses its side-to-side darkening. The film title is
  set in capitals, with an explicit accessible name in its own case, and a muted, wider director/year separator; an
  entry may carry a short title for a film whose full title cannot fit its credit space, and fit is rescreened with
  shipped titles after import. The pitch line names the range of films rather than a partial feature list,
  without TMDB attribution, which the footer keeps; the band's points cover the whole catalog and the film page in
  place of the search bar, which every page already shows. Film review moves to
  the sheet alone: approved entries are applied together, checked against the endpoint by script, and built-hero
  captures of custom-point or flagged films are reviewed as one batch, replacing per-film built-hero checks. Updates
  R3, R4, R6–R8, R14 and R27, decisions 2, 4 and 5, the copy, image and backdrop notes, the summary of ADRs this work
  delivers, ADR-046, and in the task list Tasks 4.13, 4.14 and 5.1, the Phase 4 exit criterion and the Implementation
  Notes. Criteria 26 and 27 are superseded by 28 and 29. ADR disposition: revise this work's Proposed ADR-046 for the
  text panels, short title and review method; copy, the title's capitals and the separator's spacing are tactical.

- **2026-11-14 — The Library's pages (Owner).** The Library's settled design keeps the Watchlist page at
  `/watchlist` with no redirect and adds the Library at `/library` with History, the timeline of viewings and
  reviews, at `/library/history`; it has no Activity tab and no `/library/watchlist`, and the bar's Watchlist link
  stays. R15's "See all", R30b's condition and R30d's queue page and "Reorder" link now name History and the Watchlist
  page, so "Recently watched" is built whichever work merges first and "Reorder" opens a page that exists. Updates
  R15, R18, R20, R30b and R30d, the Library non-goal, the neighbouring-work note, decisions 7 and 8 and the summary of
  ADRs this work delivers, and in the task list Tasks 5.2 and 5.4. Criterion 22 is superseded by 30. ADR disposition:
  revise this work's Proposed ADR-046 so ordering stays on the watchlist's own page rather than in the Library; no
  new ADR. Home's design is unchanged.

- **2026-11-14 — Mirrored backdrops (Owner).** In a wide window the cover crop fills the hero's width, so a point
  can't move a subject out from under the pitch panel, and during review the Owner found frames that would work
  flipped. An entry may set `mirrored`: its full-bleed image is flipped horizontally by a CSS transform when shown,
  with its point given in the flipped frame; the stacked image stays unflipped (Owner), and no flipped copy is stored
  or served. The Owner accepted that TMDB's terms, which forbid derivatives of its content without addressing
  display, allow this display treatment. The endpoint returns `mirrored`; the sheet gains a flip toggle; the batch
  check and captures cover mirrored films. Updates R3, R4 and R7, decision 2 and ADR-046, and in the task list a new
  Task 4.15, Tasks 5.1.b and 5.1.c and the Phase 4 exit criterion. Criteria 28 and 29 are superseded by 31 and 32.
  ADR disposition: revise this work's Proposed ADR-046 for the mirroring metadata; no new ADR.
