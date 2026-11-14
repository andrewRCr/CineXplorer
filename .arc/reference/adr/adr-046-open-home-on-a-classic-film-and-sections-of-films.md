# ADR-046: Open Home on a classic film and sections of films

## Status

Proposed

Supersedes in part ADR-044 (the home page's Films section), ADR-002 (the remaining trending Featured page),
ADR-026 (the landing page's trending-list cache), and ADR-039 (Back to Results as the only self-stubbing smoke spec).

## Context

The home page is the application's public front door and the wordmark's destination. Its static welcome and links
into the catalog neither explain the application through films nor show a returning visitor anything of their own.
The homepage must be visible without signing in and describe the application for visitors and OAuth branding checks.

The catalog already supplies theatrical and upcoming releases with data-quality filtering. The Library supplies
stored watchlist cards in its own order. TMDB's detail response supplies backdrops and taglines. Director names
come from credits; the hero needs that projection, while the full detail page also returns cast and crew and makes
a separate credits request. The application has dark-palette semantic colors
for text and backgrounds, which a hero can scope locally while the rest of the page follows its selected mode.

Alternatives considered included a trending hero without a curated identity, a daily rotation, a page made entirely
of poster rows, a page-colored or side-by-side hero, an amber-tinted fade, and a signed-in page that repeats the
catalog or Library. Picking a film in the browser through the full detail endpoint would expose the curated list
there and pay the full detail endpoint's separate credits request and larger cast/crew response.
Storing backdrop and tagline on saved movie cards would add fields and refresh obligations solely for the hero.

## Decision

We will serve Home at `/`, keeping `/featured` as a redirect. While sign-in resolves, Home shows loading without a
page heading. Signed-out Home shows a classic film and the application's pitch, then what's in theaters and coming
soon, then a band explaining its capabilities. Signed-in Home shows the visitor's watchlist first and the same
what's-on sections. A later list of logged viewings can supply a recently-watched section when that source exists.

We will choose the hero's film randomly from a hand-selected list of classic TMDB IDs with optional percentage
focus points and checked backdrop paths on each page load. A public endpoint returns its ID, title, release date,
backdrop, director names, tagline and nullable focus point through one TMDB detail request with credits appended,
without a separate credits call or server caching. Focus and an optional checked backdrop
path are local list metadata; a stored path replaces TMDB’s primary. An input point anchors the reusable full-bleed
presentation, defaulting to 50% across and 28% down when unset;
the whole-frame portrait arrangement ignores focus. The browser
retains that result for the loaded application's lifetime, until reload or a change of signed-in user. Development
builds can request a particular film for visual checks; production servers ignore
that override. Candidates are screened and reviewed in an external two-crop/whole-frame sheet in one page mode;
custom-point
or flagged films also receive all three built-hero checks. The dark full-bleed and page-mode portrait treatments are
checked in both modes once for the component. Only approved films ship, with further approvals able to follow
through later pull requests.

The pitch and account actions render before the film arrives. Portrait windows below 1024px show the complete
image in a stable 16:9 area above the credit and pitch, without a fade or focus point, preserving image proportions
with letterboxing when necessary. Their text follows page mode; the explanatory pitch line is omitted. The image
and credit spaces remain on failure, avoiding a shift. Landscape windows and widths from 1024px remain full bleed.
The full-bleed hero uses the existing dark palette in both page modes, with a neutral fade under the lower-left
pitch and a separate fade under the film credit. Each
fade suppresses at least 75% of the image beneath its text and is strengthened as needed for text contrast over
bright frames; contrast comes from that minimum darkness, not an opaque page background. The desktop credit sits on
the right aligned with the actions and content edge. In compact landscape it is above
the pitch, right-aligned, without a tagline; in the portrait stack it is below the image and above the pitch,
left-aligned. Its rows are title, director/year, and optional tagline. Only the title links. The tagline is visible
from 768px except compact landscape. Director names come from the appended crew; unavailable names leave the year.
Full bleed reserves roughly 73% of window height with minimum heights; the portrait stack reserves a 16:9 image
area and caption space before its pitch. These reservations hold whether the read succeeds or fails. A failed read
or image retains the pitch and reserved spaces, with the dark image band
in the portrait stack.

We will compose Home from reusable section forms: native scrolling poster rows, an opening-week calendar, a large
film card, and a text band. Sections have named headings and their own loading, empty and retry states. Rows draw
at most twenty existing movie cards, use native scrolling and keyboard focus, and respect reduced motion. Calendars
group the first twenty upcoming films into the first four occupied Monday-to-Sunday weeks, preserving popularity
within each week. Cards show actions only to signed-in visitors; catalog row spacing stays unchanged.

Signed-in Home is a quick look that sends the visitor onward. Films presents a shared program; the Library is where
the visitor sorts, filters or reorders personal lists. Home's watchlist leads with the Library's first film, currently
the newest addition, shown large, followed by the rest in a row. When a watchlist queue exists, its first film and
order will replace that default; ordering remains in the Library. Each section's link opens its complete list.

Home greets a signed-in visitor once per loaded application or change of user, replacing the sign-in welcome toast.
A return within the application uses a visually hidden Home heading. The first session and watchlist reads decide
whether to show the visitor's sections or a nothing-saved introduction; that choice holds while Home is shown, so a
first save does not rebuild the page under the pointer. Section retries keep the greeting and other sections in place.

What's on comes from the catalog's In theaters and Coming soon views, in their default orders and under the same
names used in the catalog. Home uses no trending list or trending cache. Its requests use a separate pagination
context and handle their own failures. Films opened from Home link back to Home.

We will keep one browser smoke tier and its existing target policy. Alongside Back to Results' controlled page
height, `background.spec.ts` supplies Home's three reads itself on both targets so console and color-mode checks
never depend on live TMDB. Other staging journeys continue using live catalog data.

## Consequences

### Positive

- Visitors see films and the application's purpose; returning visitors see their own next films first.
- Section forms can support a later Films hub without reproducing Home as a catalog grid.
- Existing dark-palette roles and sufficiently dark fades keep the text legible; the pitch survives failed reads.
- Home reuses the catalog and Library's contracts without disturbing catalog pagination or duplicating ordering.

### Negative

- First-time and provider visitors wait for the session read before seeing the pitch.
- The curated list requires visual checks. A checked path protects it from primary-backdrop changes, but a pinned
  image can still disappear and require replacement or removal.
- Consecutive page loads can pick the same film, and a user change selects a new one.
- A second saved film can introduce a row; removing films can remove the row or whole section.
- Signed-out catalog cards are shorter while their fixed row spacing still accommodates signed-in controls.
