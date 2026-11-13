# ADR-044: Navigate through one top bar into one film catalog

## Status

Accepted (2026-11-12)

## Context

The two-row navigation bar and sidebar gave Browse, Now Playing and Upcoming separate entries even though they
share a grid, filters and sort controls. A list's fixed name stopped describing its contents once the visitor
changed its sort. On phones, navigation and search also needed room alongside the wordmark and account control.

ADR-002 established the browse URLs and backend presets, alongside separate primary navigation entries and a
Featured landing page at `/featured`. The browse URLs also identify saved scroll positions and Back to Results
destinations. Those contracts can support a clearer navigation model without a data-layer change.

Alternatives considered:

- A Browse menu groups the lists but gives its parent no destination, and each list's name still drifts from its sort.
- Separate primary links repeat three entrances to the same browsing interface.
- Fixed lists with fixed ordering simplify naming but remove free sorting.
- A curated Films hub can eventually give the domain its own landing page, but overlaps the home page's content
  before the two pages have distinct purposes.
- Keeping the Library in the account menu makes the bar identical for everyone but adds a click to personal films.

ADR-039's browser smoke tier covers desktop journeys. The phone shell uses different controls, so desktop checks
alone cannot establish that navigation fits or that the drawer and search work.

## Decision

We will use one top bar and one Films entry into one catalog. The bar is a single 65px row. At 1024px and wider it
holds the CineXplorer wordmark, Films, the authenticated visitor's Library link, a labelled search field, and Sign in
or the account control. Below that width it holds Open menu, the wordmark, Search films, and the account control.
The phone account trigger shows its initial without username text while retaining the full username as its name.

The wordmark links to `/` and is not a heading. Each page owns its heading. Current links have an accent underline:
Films is current only on the three catalog URLs, and the Library link only on `/watchlist`. That link reads Watchlist
and opens the watchlist until a Library page exists. The account control uses Chakra's Menu for Profile and Sign out
and its keyboard behavior.

The phone drawer contains the same primary links as the wide bar, rather than the catalog windows. Phone search
replaces the row's controls with its labelled field and Close search. Closing the drawer or search restores focus to
its opener; controls displaced by search cannot receive focus. Wide and phone search submit to the existing results
page.

The catalog's release windows are All films at `/browse`, In theaters at `/browse/now-playing`, and Coming soon at
`/browse/upcoming`. They are links in a navigation landmark named Release windows beneath the catalog title, with
the current link marked as the current page. Switching windows preserves applicable filters and sort. In theaters
and Coming soon discard explicit years, and Coming soon replaces a rating sort with popularity. The same normalization
applies to a direct URL, replacing its history entry and correcting the selection before fetching.

The header describes the window and ordering, adding a labelled language, up to two genres and, on All films, the
selected years. Rating ranges and certifications remain in the filter bar. Free sorting remains available; there is
no separate Top rated window. The title and window links remain visible while loading, empty or failed, so visitors
can identify and leave the current selection. The browse URLs, backend presets, scroll keys and Back to Results
destinations remain the same.

Films opens the popularity-sorted catalog until a Films hub exists, then can open that hub without changing the bar.
The home page lives at `/`, with `/featured` redirecting to it as an alias, and has no separate primary navigation
entry. Its Films section offers the same three windows.

We will add a phone-width shell spec at 360×800 to both browser smoke targets. The tier has six specs: registration,
sign-in and sign-out, browse, movie detail, Back to Results, and phone navigation. Staging skips registration as
before. The phone spec checks control bounds, signed-out and signed-in navigation, the drawer, inline search and
account menu. ADR-039's remaining target, fixture, accessibility, credential and artifact policies stand.

This supersedes ADR-002's Navigation Structure, the landing entries in its Routing Structure, and their matching
Frontend Implementation items. Its browse routes, endpoints and backend strategy stand. It supersedes ADR-039's
five-spec list and the mobile-viewport exclusion in its Consequences.

## Consequences

### Positive

- Visitors enter the film domain through one link and choose a release window on the page that owns it.
- Titles continue to describe freely sorted and filtered selections, including unsuccessful requests.
- Personal films remain one click away on wide screens, while phone navigation has room to grow.
- Existing bookmarks, backend presets and scroll restoration retain their contracts.
- The browser gate exercises the layout where the shell's controls differ most from desktop.

### Negative

- Phone navigation needs a drawer interaction, including for a signed-out visitor with only Films available.
- Titles require composition rules that must stay aligned with available filters and sort values.
- The default Films destination is a result grid until a separate hub has its own purpose and content.
- The smoke tier takes another browser journey; it still does not cover every mobile page or browser engine.
