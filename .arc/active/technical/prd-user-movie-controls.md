# PRD: User Movie Controls

**Type:** Technical
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Complete
**Created:** 2026-11-14

---

## 1. Introduction / Overview

The tracking model gives each signed-in user one record per film (watched, on the watchlist, liked, and one current
rating of 1–10, with whether the film has entries and when it was last logged) and any number of **entries**, each a
dated viewing, an undated review, or both, with its own rating, review and rewatch mark. The server applies the rules
between them: rating or logging an unwatched film marks it watched, a viewing that answers the watchlist takes the film
off it, and Watched can't be un-marked while the film has a rating or any entry. In the frontend, `useUserMovieState`
shows each film's state from its page's payload with the film's saves on top, `saveMutationOptions` runs the saves,
`useMovieEntries` writes entries, and `RatingStars` and `RewatchIcon` draw a rating and a rewatch.

Almost none of it is reachable:

- **Cards.** Of `MovieCard`'s three footer icons only the watchlist toggle works; Watched and Liked have no handler and
  no accessible name (the accessibility baseline excuses them on `/browse` and `/search`). The card shows no rating of
  the visitor's.
- **The film page.** "Your Actions" (`MovieDetail`) has a working watchlist button and two placeholders, "Mark as
  Watched" and "Rate Movie", with no handler; all three are disabled signed out with no explanation. There is no like,
  rating, review or log anywhere, and no way to see a film's entries.
- **Logging.** Nothing opens an entry: no dialog, no Log button.

This work makes the tracking model usable. Signed-in visitors mark films watched, like them, add them to the watchlist
and rate them from cards and the film page; they log and review through one **"Review or log"** dialog that opens from
cards, the film page and the bar; and they see, edit and delete their entries on the film page. Each change shows what
the server returned, and a change that removes something offers Undo. Signed-out visitors see cards without actions,
and the film page's panel explains that tracking needs an account.

The design was settled in the shared draft for the user-movie pages (`draft-user-movie-uis.md`), whose alternatives
and reasons this PRD does not repeat; every binding decision is stated here.

## 2. Goals

1. **Tracking is one action away wherever a film appears.** Watched, Like, Watchlist and "Review or log" on every card
   a signed-in visitor sees; those plus the rating and the film's entries on its page; Log in the bar.
2. **Controls show what the server decided.** A control's state comes from the record the server returns, so a rule's
   effect (a film leaving the watchlist, a like cleared) shows as soon as the save answers, and no rule is repeated in
   the client.
3. **Nothing is lost without a way back.** A watchlist change, a cleared rating, a like a rule removed and a save from
   the dialog each offer Undo, which restores the film as it was; deleting an entry asks first.
4. **Keyboard, pointer and touch all reach every action,** at phone width, with every control named and its state
   exposed, so the accessibility baseline's allowances for unnamed card buttons go.
5. **Signed-out visitors see clean cards** and learn on the film page what an account adds.
6. **Search suggestions stay easy to add.** The dialog's film picker is built so a suggestions endpoint, and the bar's
   search later adopting the same combobox, each change one place.

## 3. User Stories

- As a signed-in visitor browsing films, I want to mark a film watched, like it or put it on my watchlist from its
  card, without leaving the grid.
- As a visitor who just watched a film, I want to log it with today's date, a half-star rating and a few lines of
  review, from the card, the film's page or the bar.
- As a visitor rewatching a film, I want to log the rewatch with its own rating and review, and keep the first viewing
  as it was.
- As a visitor on a film's page, I want to see every time I logged or reviewed it, and correct or delete an entry.
- As a visitor who clicked the wrong control, I want to undo it and get the film back exactly as it was, watchlist
  place included.
- As a touch user, I want the same actions from a visible button on the card, since there is no hover.
- As a signed-out visitor, I want cards without controls I can't use, and the film page to tell me what signing in
  gives me.

## 4. Requirements

Every requirement is **P0** unless marked otherwise. "Phones" means widths below the `md` breakpoint (768px); "wide
screens" for the bar means the `lg` breakpoint (1024px) and up, where `NavBar` switches to `WideNavBar` today. A
**save** is a `PATCH /user-movie-data/{tmdb_id}` sent through `useUserMovieState`'s `save`; an **entry write** is a
create, edit or delete through the shared entry writes (R38).

### The card

**R1. Layout.** `MovieCard` shows the poster first, with no border around the card or the poster
(`MovieCardContainer`'s border goes with the card's). Below the poster sits the **text block**:

- the title, at most two lines, keeping today's truncation tooltip;
- one line with the release **year** (today's long date goes; "Year unknown" when there is no date), TMDB's score
  beside it (`MovieUserScore`, as today), and the watched mark (R2);
- the **stars line** (R2).

The text block has one fixed height, `CARD_TEXT_HEIGHT`, kept with `CARD_WIDTH` in `gridConstants.ts` and sized to
hold the two-line title, the year line and the stars line, so every card is the same height whatever it shows,
signed in or out. The card's hover effects (its shadow, the poster's scale and the accent line) stay.

**R2. At rest.** The stars line shows the film's current rating as `RatingStars` at its small size, and nothing when
there is no rating; its height is kept either way. The year line ends with a small eye icon, the **watched mark**,
when the film is watched: one image with the accessible name "Watched". With no record (signed out, or a film never
saved) neither shows.

**R3. Controls on hover and focus.** Where the primary input can hover (the media query `(hover: hover)`, read through
Chakra's `useMediaQuery`, so the choice follows a change of input), each card has a group of four controls over the
poster:

- **Watched** (eye), **Like** (heart), **Watchlist** (today's watchlist icons) and **Review or log** (pen), in that
  order, each a 28px icon button with 6px between them (130px in all), centered along the poster's bottom edge 8px
  above it, sharing one continuous solid `popover` backing bar so the controls read as one group over any poster;
- the group is a `role="group"` named "Your actions for {title}", placed in reading order after the poster's link and
  before the title, and outside the link;
- it is hidden at rest and shows while the pointer is over the card or focus is within the group, so Tab reaches each
  control and reveals the group;
- each control has a tooltip above it with its name. Hovering a control colors its icon `tertiary`; pressed icons
  keep their `tertiary` state at rest. Watched, Like and Watchlist have the stable accessible names "Watched",
  "Like" and "Watchlist" with `aria-pressed` for their state, and show the pressed state in `tertiary`; "Review or
  log" has that name;
- activating Watched, Like or Watchlist saves the opposite of its shown state (`user_watched`, `user_liked`,
  `user_on_watchlist`); "Review or log" opens the dialog on the card's film, not changeable, with the date on (R19).
  No activation follows the poster's link.

**R4. The touch menu.** Where the primary input can't hover (`(hover: none)`), the card has no hover group. Instead, a
32px "⋯" button named "Actions for {title}" sits at the poster's top-right corner, 6px in, on a solid backing surface,
visible at rest. It opens a menu (Chakra `Menu`) holding Watched, Like and Watchlist as checkbox items, checked by the
film's state, and "Review or log" as an item; choosing one acts as R3 says and closes the menu. A locked Watched item
(R9) is marked `aria-disabled` rather than disabled, so the arrow keys still reach it; choosing it changes nothing and
leaves the menu open. The menu's highlighted item uses the menu recipe's solid `tertiary` fill.

**R5. Signed in only.** A card renders its controls (the hover group or the "⋯" button) only while the visitor is
signed in (`status` is `authenticated`): never while sign-in is resolving or for an anonymous visitor. The loading
grid's placeholder cards (`GridSkeletonLoader`) render no controls and take the card's new height.

**R6. Widths.** No card a pointer or touch reaches is narrower than 138px, the narrowest the hover group fits with 4px
to spare on each side. The browse, search and sequential grids keep their fixed 194px column (`CARD_WIDTH`); any other
page that draws `MovieCard` in a row or grid keeps it at 138px or wider.

**R7. The browse grid's row height.** `VirtualizedMovieGrid`'s `ROW_HEIGHT`, the virtualizer's estimate for one row,
is the card's height at `CARD_WIDTH`, computed from the constants rather than written as a literal: the poster's
height (`CARD_WIDTH × 1.5`) plus `CARD_TEXT_HEIGHT`. The virtualizer keeps `GAP` as its separate gap between rows, so
a row's stride stays `ROW_HEIGHT + GAP`. The grid's test that asserts today's 449px estimate asserts the computed
value, its assertion of the 16px gap stays, and its mocked rows take the new height.

**R8. Re-rendering.** `MovieCard`'s memo comparison compares every field of the film's record the card shows
(`user_watched`, `user_liked`, `user_on_watchlist`, `user_rating`, `has_entries`), so a refetched page updates its
cards.

### The watched lock

**R9.** Watched is **locked** while the shown record has a current rating or any entry (`user_rating` is not null, or
`has_entries` is true), whether or not the film is liked. A locked Watched control:

- stays focusable, with `aria-disabled="true"`, shows a lock icon, and sends no save when activated;
- carries the explanation "Watched stays on while this film has your rating or any entries.": as its tooltip and
  accessible description on a card's hover group; as a second line inside the "⋯" menu's Watched item (R4); and on
  the film page's panel as its accessible description and as a status note (`role="status"`) beneath the toggles,
  shown when the visitor activates it.

### The film page's panel

**R10. One component, in place of "Your Actions".** The panel is one self-contained component that lays out as a row
or a column, chosen by a prop, so a later page design can place it. On today's `MovieDetail` it replaces the "Your
Actions" block where that block stands, as a row that wraps on narrow screens, under the heading "Your film". It reads
the film's state through `useUserMovieState`, as the page does today.

**R11. Toggles.** Watched, Like and Watchlist are buttons with an icon and those words, `aria-pressed` for their state,
and the pressed state from a button recipe variant rather than inline colors. They save as R3's controls do; Watched
shows the lock (R9).

**R12. The rating, on wide screens.** At `md` and up, the panel shows Chakra's `RatingGroup` labelled "Your rating":
five stars with halves, half a star per point, so the stars' value times two is the saved `user_rating` (★★★½ is 7). A
pointer selection saves at once. Keyboard changes save once the value has been still for 500ms or focus leaves the
stars, so moving across the stars with the arrow keys sends one save. "Clear rating" sits beside the stars while the
film is rated and saves `user_rating: null`. A value of zero stars, which the arrow keys can reach, counts as no rating:
it clears the rating as Clear rating does, with its toast.

**R13. The rating, on phones.** Below `md`, the panel shows the current rating as `RatingStars` (or "Not rated") with a
"Rate" button that opens a bottom sheet (Chakra `Drawer`, placed at the bottom) titled "Your rating". The sheet holds
the stars at a size where each half-star is at least 24px wide, "Clear rating" while rated, and "Done". The rating
saves as R12 says; Done only closes the sheet.

**R14. Review.** A "Review" button opens the dialog on the film, not changeable, with the date off (R19).

**R15. Signed out, and while sign-in resolves.** For an anonymous visitor the panel still shows its toggles, its
rating and Review, but none of them saves and the stars take no value. Activating any of them shows a status note
(`role="status"`) beneath the panel: "Sign in to mark films watched, rate and log them, and keep a watchlist.", with a
"Sign in" link that returns to this page (`signInPathFor` with the page's path and query). While sign-in is resolving
the panel shows its controls inert (`aria-disabled`, no note), at the same size, so it doesn't shift when the status
settles.

### The film's entries

**R16. The list.** Beneath the panel, a signed-in visitor sees their entries for the film under the heading "Your log",
read from `movieEntriesQuery`, in the order the server returns them: latest first, with an undated entry at the day it
was made. Each entry shows its date ("Nov 14, 2026") or "No date"; the rewatch icon (`RewatchIcon`) when it is a
rewatch; its rating as `RatingStars` at the small size; the start of its review (R17); and Edit and Delete buttons named
by the entry's position in the list, counting from the latest, and its date ("Edit entry 1, Nov 14, 2026", "Delete entry
3, undated"), so no two buttons share a name. A film without entries shows no list. While the list loads it shows
placeholder rows; if the read fails it shows "Couldn't load your log." with Retry.

**R17. Excerpts and "Show all".** A review longer than 280 characters shows its first 280, cut back to the last space,
with an ellipsis and "Read more", which shows the whole review in place and turns into "Show less". Reviews keep their
line breaks and render as plain text. The list shows the latest three entries; "Show all ({count})" shows the rest in
place.

**R18. Edit and Delete.** Edit opens the dialog on that entry (R19). Delete asks first, in a dialog titled "Delete
this entry?" saying "This removes its date, rating and review. Watched and your current rating stay as they are.",
with Cancel and Delete. Confirming deletes the entry; the list and the panel update from the record the server
returns, with no success toast. Focus then moves to the next entry's Edit (the one that took the deleted entry's
place, or the one above it when the last was deleted), or to the panel's Review when no entries remain.

### The "Review or log" dialog

**R19. One dialog, opened from anywhere.** One dialog host is mounted once in the app's layout, and every entry point
opens it through one hook, `useEntryDialog()`, whose `open(options)` takes:

- `film`: the film to start on (its TMDB ID, title, release year and poster path), or none to start on the picker;
- `dateOn`: whether "Watched on" starts on;
- `filmChangeable`: whether a chosen film can be changed;
- `entry`: an entry to edit, which fixes the film;
- `returnFocus`: optional, the control to return focus to when the one that opened the dialog is gone, for an entry
  point whose control closes with its menu or drawer.

The entry points are: a card's "Review or log" (its film, date on, not changeable); the panel's Review (its film,
date off, not changeable); an entry's Edit (that entry); the bar's Log (R29); and any later page, such as the
Library's empty states, through the same call. The dialog has no URL and opens over the current page. Closing it
returns focus to the control that opened it or, when that control is gone, to the nearest that remains, which its
entry point names through `returnFocus`: the card's "⋯" button after the dialog opened from its menu, and the drawer's
"Open menu" after "Log a film".

**R20. Shape.** The dialog is titled "Review or log", or "Edit entry" when editing. On phones it fills the screen;
from `md` up it is centered, at most 560px wide. Its form is built with React Hook Form 7. Its fields, in order:

1. **Film:** the chosen film's poster, title and year, with "Change" when it can be changed; otherwise the film
   picker (R26).
2. **Watched on:** a switch and a date input (`type="date"`), today by default and never later than today, both in the
   visitor's time zone. Beside the date, **Rewatch**, a checkbox, shown while the switch is on.
3. **Rating:** the half-star `RatingGroup` labelled "Rating", with "Clear" beside it while it has a value. Zero stars
   counts as no rating.
4. **Review:** a text area labelled "Review", at most 10,000 characters, showing the count once it passes 9,000.
5. **Liked:** a checkbox.

Then Cancel and Save.

**R21. Prefill.** On opening with a film, and on choosing one, the dialog reads the film's entry list
(`movieEntriesQuery`). The list's record, with the film's saves on top through `useUserMovieState`, gives the rating and
Liked, so a like or rating saved since the list was read still shows. A new entry starts with that rating and an empty
review. Rewatch starts on when the film has a dated entry on or before the chosen date, so a second viewing the same day
counts, and follows the date as it changes until the visitor sets it; this default applies only to a new entry. Editing
starts from the entry's date (or the switch off for an undated entry), rating, review and rewatch mark, with Liked from
the record, and keeps that mark unless the visitor changes it. While the list loads the fields are inert; if the read
fails the dialog shows "Couldn't load this film's log." with Retry, and Save stays disabled.

**R22. What Save does.**

| Dialog | Switch | Review | Save sends |
| --- | --- | --- | --- |
| New | On | Any | An entry create: the date, rating, review (or none), rewatch mark and Liked |
| New | Off | Written | An entry create with no date: the rating, review and Liked |
| New | Off | Empty | A save of `user_rating` (null when the rating was emptied) and `user_liked`, with no entry |
| Edit | Either | Either | An entry edit: the whole entry and Liked |

Rewatch is sent only with a date. Emptying the rating on the third path clears the film's current rating, and Liked
alone on an unwatched film marks it watched as the server's like rule says (§ 6). An edit never falls to the third
path: an edited entry with the switch off and no review is invalid (R23).

**R23. When Save is enabled.** Save is enabled once a film is chosen and its list has been read, and:

- for a new entry: the switch is on, or a review is written, or the rating or Liked differs from the record;
- for an edit: a field differs from the entry or Liked from the record, and the entry keeps a date or a review. With
  the switch off and the review empty, the dialog says "An entry needs a date or a review."

With the switch on, Save also needs a date that is set and no later than today in the visitor's time zone; otherwise
the dialog says "Enter a date no later than today, or turn off Watched on." A review of only spaces counts as
empty.

**R24. Changing the film.** Choosing another film re-reads its list and resets the rating, Liked and Rewatch from it
(R21), keeping the date and any review typed.

**R25. Saving and closing.** While saving, Save shows its progress and the fields are inert. On success the dialog
closes and its toast shows (R31, R32). On failure it stays open with everything as typed, and the shared error toast shows.
**P1:** closing (Cancel, Escape or the close button) with a review typed or changed asks "Discard your review?", with
Keep editing and Discard. A change of page while the dialog is open (only Back or Forward, including a phone's back
gesture, can make one) closes it without saving and without asking: the app's router (`BrowserRouter`) can't hold a
navigation to ask first.

### The film picker

**R26. A standalone combobox.** The picker is its own component (`MoviePicker`), not part of the dialog, built on
Chakra's `Combobox`. It takes its items from an input it is given (R27) and reports a choice through one callback,
`onSelect(item)`; a free-text submit is left for the bar's search when it adopts the component. Its input is labelled
"Film". An item holds only what a suggestion needs: `tmdbId`, `title`, `year` and `posterPath`.

**R27. One query entry owns the search.** One entry in the query-key factory (`lib/queries.ts`), with its hook, owns
the fetch, the debounce and the two-character minimum, so a suggestions endpoint replaces the search endpoint in that
one place. It reads the first page of `GET /movies/search` for the trimmed text, maps its results to items, and keeps
the first ten. The hook waits until typing has paused for 300ms, sends nothing for fewer than two characters, and keeps
the previous items showing while the next search loads. The backend's search is unchanged; its filters
(`apply_data_quality_filters`, `MovieService._filter_non_visual_content`) stay callable on their own.

The picker's requests carry a pagination context of their own (`X-Pagination-Context`), one per page load and
distinct from the tab's. The server keeps a record per session, context and query of the films a list has returned,
and clears it on every first-page request, so a picker search under the tab's context would clear the search page's
record for the same text, and that page's later pages could repeat films. `apiClient`'s request interceptor, which
today sets the tab's context on the movie list endpoints over any value the caller passed, keeps a context the caller
set and adds the tab's only when the request has none. The picker's query entry passes its context through optional
request options that `HttpService.getPaginated`, which today sends only the query parameters and the abort signal,
and the movie search fetcher built on it (`searchMovies`) take; no other caller passes them. The documents that state
the one-context rule (`strategy-pagination.md` § Multi-Tab Isolation, the interceptor example in
`strategy-service-layer.md`) and `apiClient.test.ts` follow, naming the catalog's lists as sharing the tab's context
and the picker as carrying its own. The landing page makes the same interceptor and request-option change for Home's
sections; whichever of the two merges second keeps one form of both, and the documents name both callers that carry
their own context (R41b).

**R28. States and look.** With fewer than two characters typed the list is closed. While searching the list shows
"Searching…"; with no results, `No films match "{text}".`; on a failed search, "Search failed. Keep typing to try
again." Each item shows a small poster (or the poster placeholder), the title and the year. The highlighted item has a
solid `tertiary` fill with `on-tertiary` text, from a new combobox recipe, and the chosen item shows a check mark
(`Combobox.ItemIndicator`), never a fill.

### The bar

**R29. Log, on wide screens.** While signed in, `WideNavBar` shows a small "Log" button (`size="sm"`, a plus icon and
the word "Log", about 72px wide) between the search field and the account control. It opens the dialog with the date on:
on a film page (`/movie/:id`), on that film, changeable, once the page's film has loaded; elsewhere, and on a film page
whose film is still loading, failed to load or doesn't exist, on the picker. Signed out or while sign-in resolves, there
is no Log button. `SearchField` itself is unchanged.

**R30. "Log a film", on phones.** While signed in, the phone drawer (`NavDrawer`) starts with a full-width "Log a film"
button above its links. It closes the drawer and opens the dialog as R29 says.

### Feedback and Undo

**R31. When a toast follows.** A toast follows:

- a save that toggles the watchlist, titled from the record the server returned, as today; and a save whose returned
  record shows a rule changed the watchlist;
- Clear rating;
- a save that clears a like the save itself didn't turn off (un-marking Watched on a liked film);
- every save or entry create from the dialog (R22's first three rows);
- an entry edit (without Undo).

Nothing else toasts: marking watched, liking or rating without one of those effects, and deleting an entry, show only
their new state.

**R32. Titles.** A toast's title names what the visitor did; its description names what the rules did besides, if
anything:

| What the visitor did | Title |
| --- | --- |
| Toggled the watchlist | "Added to watchlist" or "Removed from watchlist" |
| Marked watched, or un-marked it | "Marked as watched" or "Marked as not watched" |
| Liked | "Liked" |
| Rated | "Rated" |
| Cleared the rating | "Rating cleared" |
| Saved the dialog with the date on | "Logged" |
| Saved the dialog with a review and the date off | "Review saved" |
| Saved the dialog with neither | "Saved" |
| Saved an edited entry | "Entry updated" |

| What the rules did besides | Description |
| --- | --- |
| Marked the film watched | "Also marked as watched." |
| Took it off the watchlist | "Also removed from your watchlist." |
| Both | "Also marked as watched and removed from your watchlist." |
| Cleared the like | "Your like was removed." |

A log, or marking the film watched, never adds "Also marked as watched.", which it says already.

**R33. Undo restores the film.** Every toast R31 lists, but the entry edit's, offers Undo. A save's toast compares the
film's **shown state** at the moment the visitor acted with the **record the save returned**, across `user_watched`,
`user_on_watchlist`, `user_liked` and `user_rating`. Undo sends one save, marked `undo: true`, supplying every field
that differs at its earlier value. So that the watchlist and like rules don't act during an Undo, whenever
`user_watched` differs it also supplies `user_on_watchlist` and `user_liked`, each it doesn't already supply at its
value in the returned record. No other field is added, so an older toast's Undo doesn't revert later saves of other
fields, though the rules can still act on it: restoring a rating to a film un-marked since, for one, marks it watched
again, and the watchlist rule may then remove it. The Undo mark keeps the film's place on any list it returns to. When
no field differs, a save's toast offers no Undo; the toast after the dialog creates an entry always offers it (R34).

**R34. The dialog's Undo.** After a dialog save that created an entry, Undo first deletes that entry; only once the
delete succeeds does it send R33's save, compared against the shown state when Save was pressed, and only if a field
differs. After the dialog's third path it sends R33's save alone. Undo works after the dialog has closed. If either
step fails, the shared error toast shows and nothing further is sent.

**R35. After an Undo.** An Undo's own save offers no Undo. It shows a toast only when the record it returns has the
film on or off the watchlist where the record it undid did not, titled by the watchlist's new state ("Added to
watchlist" or "Removed from watchlist"), as the shipped watchlist Undo does. After the signed-in user changes, Undo
does nothing.

**R36. A refused un-mark.** If the server refuses to un-mark Watched (409, because the film gained a rating or an
entry since the page read it), the error toast is titled "Couldn't change Watched" and its description is the
server's reason. The control shows the film as watched, since the failed save leaves the shown state.

### Shared layer, accessibility and documents

**R37. Where feedback lives.** `saveMutationOptions` gives the toasts and Undo for saves (R31 to R33, R35, R36): its
variables carry the shown state the save started from, and a save the dialog sends is marked so it shows no toast of
its own. The dialog host shows the toasts for its saves and entry edits, and runs R34's Undo through the entry write
options (R38) and `saveMutationOptions`, so exactly one toast follows each action. Neither predicts a rule: a pending
save shows only the fields it sends, and a pending entry write shows nothing until the server answers.

**R38. Entry writes run without a mounted hook.** The shared entry writes expose their mutation options, as
`saveMutationOptions` does, so a toast's Undo can delete an entry after the dialog that created it has closed.
`useMovieEntries` builds on those options and keeps its interface.

**R39. Accessibility.** Every control this work adds has an accessible name, every toggle exposes its state, and
every dialog, sheet and menu takes and returns focus. The accessibility baseline (`e2e/axe-baseline.ts`) loses its
`button-name` entries for `/browse` and `/search` (and `/`, if present), and the smoke specs' scans pass without them.

**R40. Documents.**

- **ADR-048 (new)** records the card's controls on hover, focus and touch; the dialog over the current page and its
  entry points; the film page's explanation for signed-out visitors; feedback and Undo (R31 to R36); and the bar's Log
  and the drawer's "Log a film". It supersedes ADR-044 in part, only to add Log to what the wide bar holds and "Log a
  film" to the drawer; the bar's and the drawer's links stay as ADR-044 and any later ADR record them. ADR-044's Status
  says so.
- **ADR-049 (new)** records React Hook Form for new and rewritten forms. `react-hook-form` 7 joins
  `frontend/package.json` and its lockfile, and TECHNICAL-OVERVIEW's forms line names it for new and rewritten forms,
  with Formik remaining in the sign-in, registration and password forms until they are rewritten.
- **The component-styling strategy's** rule that the menu and select recipes give the highlighted item a solid
  `tertiary` fill, with a check mark on the chosen option, names the combobox recipe too.

### Neighbouring work

**R41.** Before this work's pull request merges, `main` is merged into its branch. What `main` then holds decides
these further changes, each checked against `main`'s code at that merge:

- **a. API types, always.** If `main` has changed the backend's schema, `frontend/openapi.json` and
  `frontend/src/types/api.ts` are regenerated.
- **b. If `main` has the landing page,** this work also removes the `/` `button-name` baseline entry, and names
  watching, rating and liking in signed-out Home's copy: the hero's line reads "See what's in theaters and coming soon,
  keep a watchlist, and log, rate and like what you've seen. Film data from TMDB.", and the band's second point becomes
  "Track your films" over "Keep a watchlist, and mark films watched, rate and like them from any poster." ADR-048 then
  cites ADR-046 for the rule that cards show actions only to signed-in visitors; without it, ADR-048 records that rule.
  The interceptor keeping a caller's context and the paginated fetcher's request options are then already on `main`:
  this work passes the picker's context through them and adds the picker to the documents' callers with their own
  context (R27). And ADR-048 supersedes in part ADR-046's statements that the catalog's row spacing stays unchanged
  and that signed-out cards are shorter, since cards now share one height and the row height is computed (R1, R7);
  ADR-046's Status says so.
- **c. If `main` has the Library pages,** this work puts the dialog's steps in the signed-in smoke spec in place of its
  step 4, which removed the first fixture film from its card on `/watchlist` (logging that film from its card with
  today's date, a rating and a review, which takes it off the watchlist since it is logged on the day it joined, and
  seeing it leave the page; finding the entry on the film's page; and finding the film in Films, `/library`, and
  History, `/library/history`), with a dated note on ADR-050 recording that they were added; adds "Log a film" to the
  Films view's empty state ("Your Library is empty") and History's ("Your history is empty"), which opens the dialog on
  its picker with the date on and, since the empty state goes once a film is logged, returns focus to the current view's
  link in the Library's navigation (`open({ dateOn: true, returnFocus })`); and removes the `button-name` baseline
  entries the Library added for its routes. The bar's catalog link then reads Explore (ADR-050), and any test this work
  adds that names that link follows it. Without those pages, this work adds none of these.
- **d. If `main` has the backend unit that adds the server's like rule,** the like rule changes nothing here: the
  controls already show what the server returns and their tests already follow the rule (§ 6). The same unit fills an
  optional `time_zone` on every record save in `saveMutationOptions`, with a test asserting it; the rewritten options
  (R37) keep filling it, that test stays, and the watchlist tests keep the expected request bodies `main` gives
  them.

## 5. Non-Goals

- **The tracking model itself.** The record, its rules, the entries and their endpoints are used here, not changed.
  No backend change is expected.
- **The server's like rule.** It is a separate backend change (§ 6); these controls only show its results.
- **No Watchlist, Library or History pages,** and no bar links to them; `/watchlist` keeps its plain list. R41c says
  what this work adds if those pages are already on `main`.
- **Drag-and-drop with Next Up, and search suggestions.** Suggestions' endpoint, and the bar's search adopting the
  picker, come with that work; the picker only leaves the seams (R26, R27).
- **The movie detail redesign.** The panel replaces today's actions in place; the redesign places it.
- **Home beyond R41b's copy,** and actions on Home's large card.
- **The browse grids' data layer, tests beyond the row height, and phone layout.** Only the card they draw, its height
  and the row height change.
- **Moving the sign-in, registration and password forms to React Hook Form.** They move when they are next rewritten.
- **The demo account** and its "Try the demo", which joins the panel's sign-in note once it exists.
- **Sharing, favorites, and history beyond viewings.** Ratings, reviews and entries stay private to their owner; no
  control here records likes or watchlist changes as events, and favorites add no control to cards or the panel.
- **Restoring a deleted entry.** Delete asks first instead (R18).

## 6. Technical Considerations

**The contract.** These controls read and write only what the tracking model serves (`prd-user-movie-tracking.md`):

- the record (`UserMovieDataSchema`): `user_watched`, `user_on_watchlist`, `user_liked`, `user_rating` (1–10 or null),
  `has_entries` and `last_logged_on`, carried on every list and detail payload and every write's answer;
- the record save, whose omitted fields stay unchanged except where a rule changes them, whose supplied fields always
  win over the rules, and whose `undo: true` keeps a list's join time when the film returns to it;
- the entry list for a film (its record and its entries, latest first), and entry create, edit (a whole-entry `PUT`)
  and delete, each answering with the entry and the film's record; creates and edits carry Liked and the browser's
  time zone, which the shared hook fills;
- the **current rating**: a record save sets or clears it; a new entry with a rating sets it when that entry is the
  film's latest; editing the latest entry's rating updates it; no entry write clears it;
- the rules: rating or creating an entry on an unwatched film marks it watched; a film that changes from unwatched to
  watched without a date, or gets an entry dated on or after the day it joined the watchlist, leaves the watchlist; an
  entry edit or delete changes neither; and the **watched lock**, under which un-marking Watched answers 409 with a
  reason while the film has a current rating or any entry.

**The like rule.** A separate backend change, planned to land after the tracking model, adds four behaviors these
controls build and test against:

- liking an unwatched film marks it watched, as a rating does, so by the rule above a film on the watchlist leaves it;
- un-marking Watched on a liked film clears the like;
- the watched lock is unchanged: a like never locks Watched;
- existing records that are liked but not watched are marked watched when the change lands.

This work doesn't wait for it. Its controls show whatever record the server returns, and R31's toast for a cleared like
compares the record before and after, so it is right before and after that change lands. Its component tests answer
saves with records that follow these behaviors.

**The shared frontend layer.** `useUserMovieState` (`{ state, save }`), `saveMutationOptions` (one queue per film, under
the key `["movie-save", tmdbId]`), `useMovieEntries`, `movieEntriesQuery`, `RatingStars` and `RewatchIcon` come from the
tracking model. This work changes two of them: `saveMutationOptions` gives the wider toasts and Undo for saves (R37),
and the entry writes expose their options (R38). The watchlist's titles, its Undo body and the toast after an Undo stay
as they are, so `useUserMovieState`'s watchlist tests keep their assertions; their mock answers change to keep the
payload's `user_watched: true`, as a real server does for a watchlist toggle, since R33 compares the whole record. The
card's and the film page's signed-in watchlist tests (`MovieCard.test.tsx`, `MovieDetail.test.tsx`) render signed
in, choose the pointer kind (the test setup's `matchMedia` stub answers no to every query), and find the controls by
their new names (D2). The film page's test that expects disabled controls while sign-in resolves or for an anonymous
visitor ("disables saves while …") is rewritten to R15's behavior, which criterion 7 covers.

**Errors.** Errors reach callers as Axios errors carrying the status and the server's `detail`; the shared hooks show
an error toast for a failed save or entry write ("Failed to save changes", "Failed to update watchlist", "Failed to
save entry"). R36 is the one case that reads the status. A 5xx also raises the app's global server-error toast, as
today.

**Limits.** Saves, entry creates and entry edits share the server's save windows (30 a minute, 1,000 a day), which is
why keyboard changes to the rating wait for a pause (R12). The picker's searches are debounced (R27); the search
endpoint has no throttle or cache, which suggestions' own endpoint will address.

**Signed-in state.** Controls read `status` from `useAuthContext()`. Signing out or switching users resets every user
query and drops stale saves, toasts and Undos through the session's change count, as the shared layer does today.

**Tests.** Frontend tests mock the network with MSW and query by role and accessible name, as the testing strategy
says. No default MSW handler exists for record saves or entry routes; each test answers with the records its case
needs, and the journey test (criterion 1) answers each of its steps in turn. Pointer kind is chosen in tests by
stubbing `matchMedia` for `(hover: hover)`.

**Privacy.** A film's entries and reviews are read only for their signed-in owner, on that owner's film page, and are
never shown to anyone else.

**Size.** The task list forecasts about 7,000 to 7,500 changed lines of code and tests, about 10,000 with the planning
documents, over six phases in a task list of about 770 lines: the change set reaches the project's 10,000-line mark with
the planning documents, and runs above the shared draft's 5,000 to 6,000 for this unit. It stays one work unit (Owner,
2026-11-14). The change is frontend only, with no data, migration or API contract change, since every write goes through
the tracking model's reviewed endpoints, so one review reads the composition of its controls phase by phase, and its
code and tests stay under the 10,000-line mark.

## 7. Design Considerations

- **Tokens and recipes.** Colors, surfaces and the pressed state come from semantic tokens and recipes, never inline
  values; the panel's toggles move today's inline watchlist colors into a recipe variant. The controls' backing
  surfaces and pressed state use token pairs the contrast check covers in every palette.
- **Icons** come from the icon sets the app already uses (`react-icons`): an eye for Watched, a heart for Like,
  today's playlist icons for the watchlist, a pen for "Review or log", a plus for Log, a lock for the lock.
- **Stars.** A user's rating always shows as gold half stars: `RatingStars` where it is read, `RatingGroup` where it
  is set.
- **The shared draft** (`draft-user-movie-uis.md`) holds the alternatives weighed for the dialog, touch access,
  signed-out cards and the picker's seams.

## 8. Design Decisions

- **D1: hover and focus on wide pointers, a "⋯" menu on touch** (R3, R4), chosen by whether the primary input can
  hover, over a width breakpoint, which gives touch tablets hover-only controls and mouse users on narrow windows a
  menu, and over long-press, which nothing reveals and which competes with the browser's own. One set of controls per
  card, chosen by the media query, over rendering both and hiding one with CSS, which would give tests and assistive
  technology two copies. _ADR:_ ADR-048 (new).
- **D2: stable names with `aria-pressed`** for Watched, Like and Watchlist (R3, R11), over names that change with the
  state ("Add to watchlist", "Remove from watchlist", as the card has today), which would announce the action and the
  state at once. _ADR:_ `none`, a tactical choice applying DEVELOPMENT-RULES' rule for toggles.
- **D3: a fixed text block and a computed row height** (R1, R7), over measuring the browse grid's rows, which changes
  its data layer, and over letting the stars line collapse when there is no rating, which would make cards in a row
  uneven. Signed-in and signed-out cards share one height, since the controls sit over the poster. _ADR:_ `none`, a
  tactical choice; if ADR-046 is on `main`, ADR-048 supersedes its row-spacing statements (R41b).
- **D4: the lock as `aria-disabled` with its reason** (R9), over `disabled`, which drops the control from the tab order
  and hides why, and over Chakra's disabled menu item, which the arrow keys skip. _ADR:_ `none`, a tactical choice; the
  lock itself is covered by ADR-047.
- **D5: "phones" as below `md`** for the full-screen dialog and the rating sheet (R13, R20), over the bar's `lg`,
  which would fill a tablet's whole screen with a short form. The bar keeps `lg`. _ADR:_ `none`, a tactical choice.
- **D6: keyboard rating changes wait for a pause** (R12), over saving every arrow press, which spends the shared save
  window on intermediate values. _ADR:_ `none`, a tactical choice.
- **D7: one dialog host with one open call** (R19), over each entry point mounting its own dialog, so the bar, cards,
  the panel and later pages share one form, one prefill and one Undo. _ADR:_ ADR-048 (new) records a dialog over the
  current page and its entry points.
- **D8: a native date input** (R20), over Chakra's `DatePicker`, which would add a recipe and a calendar for one
  field that the browser's own control serves accessibly. _ADR:_ `none`, a tactical choice.
- **D9: React Hook Form 7 with its built-in validation** (R20), over Formik, which has had no release since 2.4.9
  (November 2025), and over adding a schema library for one form's few rules. _ADR:_ ADR-049 (new).
- **D10: the picker's own query entry** (R26, R27), over reusing the search page's infinite query, whose pages, cursor
  and cards a picker doesn't need and which a suggestions endpoint couldn't replace in one place. Its own pagination
  context, over the tab's, which would clear the search page's record of films shown. _ADR:_ `none`, a structure
  obvious from the code.
- **D11: a toast names the action and the rules' effects** (R31, R32), over a title per combination. Toasts follow
  only effects the visitor might not see or would want back, so plain toggles stay silent. _ADR:_ ADR-048 (new).
- **D12: Undo from the shown state to the returned record** (R33, R34), over restoring from the last confirmed record,
  which misses pending saves the visitor saw, and over sending every field, which would revert later saves of other
  fields. Supplying the watchlist and Liked with Watched stops the watchlist and like rules acting during an Undo, as
  when undoing an un-mark on a film queued for a rewatch. Nothing is added when restoring a like or a rating, since
  the film was watched when it had them; if a later save has un-marked it, the rules act on that Undo, an edge
  accepted over pinning further fields that would revert later saves. _ADR:_ ADR-048 (new); ADR-047 records the Undo
  mark.
- **D13: a cleared like toasts with Undo** (R31), as Clear rating does, over a silent change: the like is something the
  visitor set, and a card shows no like at rest, so the toast is the only sign on a card that it went. _ADR:_ ADR-048
  (new).
- **D14: the toast after an Undo stays as shipped** (R35), showing only a watchlist change, over a toast for every
  Undo, which would follow most Undos with a second message about what the visitor just asked for. _ADR:_ ADR-048
  (new).
- **D15: a refused un-mark shows the server's reason** (R36), over refetching the page's films to correct the lock,
  since the refusal needs the same user to have changed the film elsewhere since the page loaded. _ADR:_ `none`, a
  tactical choice.
- **D16: the latest three entries and 280-character excerpts** (R16, R17), over showing every entry and review in
  full, which would push the rest of the film page down for a heavy rewatcher. _ADR:_ `none`, a tactical choice.
- **D17: asking before discarding a typed review** (R25, P1), over closing silently, since a review can be long and
  Escape is easy to press. _ADR:_ `none`, a tactical choice.
- **D18: the signed-out panel explains on use** (R15), over disabling its controls with no explanation, as today, or
  hiding the panel, which would leave the page with nothing saying what an account adds. _ADR:_ ADR-048 (new).
- **D19: cards without actions for signed-out visitors** (R5), over controls that explain themselves on use, which
  would put controls no one can use on every card. _ADR:_ ADR-046 if it is on `main` when this work merges `main`,
  which ADR-048 then cites; otherwise ADR-048 (new) records it.
- **D20: Log in the bar and the drawer** (R29, R30), over a Log button on the film page, which the bar already covers
  there, and over a phone bar button, since the phone row is full at 360px. _ADR:_ ADR-048 (new), superseding ADR-044
  in part only to add Log and "Log a film".
- **D21: entry write options exposed** (R38), over keeping the dialog's host mounted to run its Undo, which would tie
  Undo to one component's lifetime. _ADR:_ `none`, a structure obvious from the code, mirroring `saveMutationOptions`.
- **D22: Rewatch on when an earlier or same-day viewing exists** (R21), over only an earlier day's, which would mark a
  second viewing the same day as a first. _ADR:_ `none`, a tactical choice.
- **D23: changing the film keeps the date and the review** (R24), over resetting the whole form, since the visitor
  most often changes the film after picking the wrong one. _ADR:_ `none`, a tactical choice.
- **D24: entry buttons named by position and date** (R16), over the date alone, which two viewings on one day share.
  _ADR:_ `none`, a tactical choice.
- **D25: the fallbacks and the date rule** (R18, R19, R23, R29): focus moving to the nearest remaining control when
  the dialog's opener or a deleted entry is gone, over leaving it on the page's body, with an entry point whose control
  closes with its menu or drawer naming that control through `open()`'s `returnFocus`; Log opening on the picker on a
  film page whose film hasn't loaded, over a disabled Log; and Save refusing an empty or future date with its message,
  over leaving the server's 400 to the error toast. _ADR:_ `none`, tactical choices.

- **D26: browser coverage for the tracking journey** replaces repeated manual interaction checks with three
  Playwright cases using real local authentication and writes and deterministic catalogue content. Isolated test
  records keep the development account's history intact; staging does not run fixture-mutating cases. Geometry is
  measured in the browser, and poster readability remains a visual check. _ADR:_ `none`, a tactical testing choice.
- **D27: one continuous backing bar for pointer actions** groups the four icons visually; hover colors the icon
  with `tertiary`, and tooltips appear above the controls. This improves readability over posters while preserving
  pressed states, action order and touch behavior. _ADR:_ ADR-048 records the card controls.

**ADRs this work delivers:** ADR-048 (new), superseding ADR-044 in part, and ADR-049 (new); and, if the Library's
pages are on `main` when this work merges it, a dated note on ADR-050 (R41c).

## 9. Success Criteria

### Implemented

1. **The tracking journey.** An integration test renders the app's routes signed in, with MSW answering each step with
   the records and lists the server returns for it, and shows: adding a film to the watchlist from a card's hover
   control; logging it from the card's "Review or log" with today's date, three and a half stars and a review; the
   card then showing "Rated 3.5 out of 5 stars" and the watched mark, a "Logged" toast saying "Also removed from your
   watchlist." with Undo, `/watchlist` no longer listing the film, and the film's page listing the entry; adding it to
   the watchlist again from the panel; logging it from the bar's Log on the film page, with Rewatch on by default, a
   new rating and a new review; and then `/watchlist` no longer listing the film, the page listing two entries, each
   with its own rating and review, and the card showing the new rating.
2. **Touch.** With `(hover: none)`, a card shows the "⋯" button and no hover group; its menu's items save or open the
   dialog; a locked Watched item is `aria-disabled`, reachable with the arrow keys, changes nothing when chosen, and shows
   the lock's explanation. Closing a dialog opened from the menu returns focus to the "⋯" button.
3. **The lock.** A rated film, and a film with entries, show Watched locked on the card, in the menu and on the panel,
   with the explanation, and activating it sends no request. A film that is only liked shows Watched unlocked. A 409
   from an un-mark shows "Couldn't change Watched" with the server's reason.
4. **Toasts and Undo.** _Superseded by criterion 15 (amendment, 2026-11-14)._ Tests show, for each row of R32, the
   title, the description and whether Undo is offered, and the Undo's request: liking an unwatched film on the watchlist
   sends `{ user_liked: false, user_watched: false, user_on_watchlist: true, undo: true }`; un-marking Watched on a
   liked film on the watchlist sends `{ user_watched: true, user_liked: true, user_on_watchlist: true, undo: true }`;
   Clear rating sends `{ user_rating: <earlier rating>, undo: true }`; a dialog save that created an entry offers Undo
   even when no film field changed, and sends its `DELETE` and then the save, and sends no save when the `DELETE` fails,
   including after the dialog has closed. Marking watched, liking and rating without a watchlist change show no toast.
   After a change of user, Undo sends nothing. `useUserMovieState`'s watchlist tests pass with their assertions
   unchanged, their mock answers keeping the payload's `user_watched`.
5. **The dialog.** Tests show each row of R22 sending its request; Save disabled until R23 holds; an edit with the
   switch off and no review refused with its message; an emptied rating on the third path sending `user_rating: null`;
   changing the film re-reading its list; Rewatch on by default for a same-day or earlier viewing and following the
   date for a new entry, and an edit keeping the entry's mark; a future or empty date refused with its message; with a
   review typed, closing asking to discard; and a change of page closing the dialog.
6. **The picker.** Tests show no request below two characters, one request after typing pauses, items with poster,
   title and year, each list state's text, and a choice reaching `onSelect`; a picker search carrying its own
   `X-Pagination-Context`, not the tab's, and `apiClient` keeping a caller's context; the combobox recipe's highlighted
   item has the solid `tertiary` fill.
7. **Signed out and resolving.** Cards render no controls while signed out or resolving; the panel's controls save
   nothing signed out and show the sign-in note with a link back to the page; while resolving they are inert with no
   note.
8. **The bar.** Log shows signed in on wide screens and opens the dialog on the picker, or on the film on a film page;
   the drawer's "Log a film" does the same on phones; neither shows signed out.
9. **The entries list.** Tests show the order, "No date", the rewatch icon, an excerpt with "Read more", "Show all",
   Edit opening the dialog on the entry, Delete asking first and sending the `DELETE` only on confirmation, unique
   button names for two entries on one date, and focus moving to the next entry's Edit after a delete.
10. **The rating control.** A pointer selection sends one save; arrowing across the stars sends one save after the
    pause; arrowing down to zero stars, like Clear rating, sends `user_rating: null`; on phones, Rate opens the
    sheet.
11. **The row height.** The browse grid's tests assert its row estimate equals `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT`
    and its gap equals `GAP`.
12. **Accessibility.** `e2e/axe-baseline.ts` has no `button-name` entry for `/browse` or `/search`, and the smoke
    specs, which scan both routes signed in, pass.
13. **The documents.** ADR-048 and ADR-049 read `Accepted` with their dates; ADR-044's Status names what ADR-048
    supersedes; TECHNICAL-OVERVIEW's forms line and the component-styling strategy's highlight rule read as R40 says;
    `react-hook-form` 7 is in `frontend/package.json` and its lockfile.

### Proven in the browser before review

14. **The journey by hand.** _Superseded by criteria 16 and 17 (amendment, 2026-11-14)._
    On the branch's local stack, signed in, criterion 1's journey runs at 1280px wide with a
    mouse and with the keyboard alone, and at 390px with touch emulation, with `/watchlist` dropping the film after each
    log; a rendered card's height equals `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT`; and the card's controls read clearly
    over a light and a dark poster in each palette.

### Implemented, added by amendment

15. **Toasts and Undo.** Tests show, for each row of R32, the title, the description and whether Undo is offered, and
    the Undo's request: liking an unwatched film on the watchlist sends `{ user_liked: false, user_watched: false,
    user_on_watchlist: true, undo: true }`; un-marking Watched on a liked film on the watchlist sends `{ user_watched:
    true, user_liked: true, user_on_watchlist: true, undo: true }`; Clear rating sends `{ user_rating: <earlier
    rating>, undo: true }`, each with `time_zone` beside these fields once R41d applies; a dialog save that created an
    entry offers Undo even when no film field changed, and sends its `DELETE` and then the save, and sends no save when
    the `DELETE` fails, including after the dialog has closed. Marking watched, liking and rating without a watchlist
    change show no toast. After a change of user, Undo sends nothing. `useUserMovieState`'s watchlist tests pass with
    their assertions unchanged by this work, their mock answers keeping the payload's `user_watched`.

16. **The tracking journey in a browser.** Playwright runs criterion 1's complete two-log journey against the local
    development stack at 1280px with a mouse, 1280px with the keyboard alone, and 390px with touch emulation.
    Authentication, film saves, entry writes and watchlist reads use the real backend and database; catalogue content
    is deterministic. Each case owns isolated temporary records and cleans them up without changing the development
    account's records. Each log removes the film from `/watchlist`; the film page shows both entries with their own
    reviews and ratings, and returning to browse shows the second rating. The keyboard case reaches and operates the
    controls through keyboard input; closing the dialog restores focus to the entry point, including the touch-menu
    and phone-drawer fallbacks. A rendered card measures `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT`. On pointers the four
    actions share one continuous backing bar, each icon highlights on hover, and its tooltip appears above it.
    These cases run in local CI; they do not create or delete fixture records on staging.

### Proven visually before review, added by amendment

17. **Poster readability.** On the branch's local stack, the card's shared action bar and icons read clearly over
    a light and a dark poster in each palette.

## 10. Open Questions

None.

## Amendments

- **2026-11-14, at task generation.** R19's `open()` takes an optional `returnFocus`, which an entry point whose control
  closes with its menu or drawer passes, and D25 says so (the task list's review found the fallback had no carrier).
  R41c's dialog steps replace the Library spec's step 4 and combine its checks with this work's, it adds the Library's
  empty states' "Log a film" itself (the Library adds it only when the dialog is already on `main`), and tests this
  work adds follow the catalog link's rename to Explore; R41d keeps the backend unit's `time_zone` on record saves;
  criterion 4 is superseded by criterion 15, whose watchlist tests keep the assertions `main` gives them and whose
  Undo bodies carry `time_zone` once R41d applies (the Library's draft, decisions 6, 10 and 11, and its PRD's R34c
  set these meeting points after this PRD was written).

- **2026-11-14, during verification.** Criterion 14 is superseded by criteria 16 (a three-input Playwright journey
  with real local authentication and writes, isolated fixture records, focus checks and measured card geometry) and
  17 (manual poster readability). R3 groups pointer actions on one continuous backdrop, highlights each icon on hover
  and places tooltips above; criterion 16 covers those changes. The browser journey closes the gap between jsdom
  integration coverage and real keyboard/touch behavior; the visual change follows the local mouse inspection.
