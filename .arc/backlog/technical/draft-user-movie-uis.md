# Draft: Core User-Movie UIs

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-13

**Purpose:** Give signed-in visitors working controls for their films on cards and the movie detail page (watched,
liked, watchlist and a half-star rating), dated entries that record each viewing with its own rating and review, an
Activity timeline of those viewings, and one Library page for their films. It ships in three work units: the
tracking model, the controls, and the Library.

---

## Problem / Motivation

**The data layer stores one record per film; the controls barely exist.** The backend keeps one record per user and
movie with `user_watched`, `user_on_watchlist`, `user_liked`, `user_rating` (1–10), `user_review` and `watched_at`
(`UserMovieData`), saves any of them with one `PATCH /user-movie-data/{tmdb_id}` (`UserMovieDataService.save`), and
serves a paginated Library filtered by watchlist, watched, liked or rated and sorted five ways
(`UserMovieDataService.get_library`, `LibraryQuerySchema`). The frontend reads each movie's state from the list and
detail payloads and saves through one hook, `useUserMovieState`, which overlays pending and confirmed saves on the
payload and offers Undo for watchlist changes (`saveMutationOptions`). Almost none of it is reachable:

- **Cards:** of `MovieCard`'s three footer icons, only the watchlist toggle works; Watched and Liked have no handler and
  no accessible name. The card doesn't show the user's rating. Signed-out visitors see the same icons, and their saves
  fail.
- **The detail page:** "Your Actions" (`MovieDetail`) has a working watchlist button and two placeholders, "Mark as
  Watched" and "Rate Movie", with no handler; all three are disabled signed out with no explanation. There is no like
  control, rating input or review anywhere.
- **The watchlist:** `/watchlist` (`Watchlist`) lists titles as plain text from `libraryQuery`'s first 100 records.
  There is no Library page; the bar's Library link reads "Watchlist" and opens `/watchlist` until one exists
  (`MainNavLinks`).
- **Logging:** nothing. The navigation shell removed the old LOG buttons, which did nothing.
- **Ratings:** no rating control exists. `MovieUserScore` has a branch for a user's rating ("★ 8") that no caller
  uses.

**The record can't hold a history.** One `watched_at` per film holds one viewing, so logging a rewatch would erase the
earlier date, and one `user_review` holds one opinion, so a revised view replaces the old one. The Library's "Date
added" sort orders by the record's creation time (`created_at`), which is when the film first got any state: a film
liked in March and watchlisted in November sorts on the Watchlist tab as March.

Logging what you've watched and managing the watchlist are the app's main uses, so launch needs them.

## Alternatives

**How "watched" and viewings relate.**

- **One date per film,** as today's `watched_at`. A rewatch overwrites the earlier date, and that history can't be
  recovered later.
- **Everything a viewing, with the date optional,** and watched derived from "has any viewing". Marking a film watched
  would create an undated viewing, an event that never happened; un-marking would have to choose which viewings to
  delete; and Watched's date added would become the oldest viewing's creation time.
- **Watched as a per-film fact, entries as their own records (chosen).** Watched says "I've seen this" with no time,
  so it holds everything seen, dated or not. An entry records a viewing on a date, a review, or both; a film can have
  many. Creating an entry marks the film watched.

**Where ratings and reviews live.**

- **One rating and one review per film.** Simple, but re-rating rewrites every past viewing in the timeline, and a
  revised review replaces the old one.
- **One rating and review per film, with each entry keeping a copy.** Keeps history, but copies can't be corrected
  without editing the film's current values.
- **A rating and a review on each entry, editable at any time, plus one current rating per film (chosen).** Opinions
  change over time, and each entry keeps what you thought then. The film's current rating is what cards and the Rated
  tab show. A re-rating never changes a review; a new review is a new entry, and the old one stays.

**When a film leaves the watchlist.**

- **Never by itself.** Watching a film from the watchlist would need a second action in the common case.
- **Whenever the film is watched.** A watched film couldn't sit on the watchlist, so a rewatch queue couldn't exist.
- **When a viewing answers the watchlist (chosen):** the film changes from unwatched to watched without a date, or an
  entry is dated on or after the day it joined the watchlist. A rewatch queue stays until the rewatch is logged, since
  its film is already watched.

**Whether the entry dialog is a dialog or a page.**

- **A page at its own URL.** Linkable, but the bar's Log button would navigate away from whatever the visitor was
  doing, and a card's menu would leave the grid.
- **A dialog with no URL (chosen).** It opens over the current page and closing it returns there. On phones it fills
  the screen.

**Where the rules between fields live** (watched and the watchlist; ratings, reviews and entries marking a film
watched).

- **In each control that saves.** Every caller would have to repeat the rules, and another client could break them.
- **In the backend's saves (chosen).** They are rules of the data, so they belong with `UserMovieDataService` and the
  entry service, and every caller gets them.

**How the Library lists films.**

- **The browse grid** (`VirtualizedMovieGrid`). Its data layer is bound to TMDB's cursor paging through
  `useInfiniteMovies` and the collection context, and its virtualization serves lists of thousands.
- **Its own grid of the same cards (chosen),** loading the Library endpoint's numbered pages of 100, its maximum, as
  the visitor scrolls, and virtualizing its rows with `@tanstack/react-virtual`, as the browse grid does. A heavy
  user's Watched tab can hold thousands of films, so only the visible rows draw cards.

**How touch reaches card actions.**

- **Long-press.** Hidden: nothing shows it exists, and it competes with the browser's own long-press on a link.
- **A visible "⋯" button (chosen)** that opens a menu of the same actions.

**What signed-out visitors see on cards.**

- **The actions, explaining themselves when used.** Every card would carry controls a visitor can't use.
- **No actions (chosen).** Cards stay clean; the detail page's panel remains the place that explains and offers
  sign-in.

**Whether drag-and-drop with Next Up and search suggestions belong here.** Either would carry this work further past
the project's size marks (§ Boundary fit), and each brings its own backend contract (an order field with its
migration and a reorder endpoint; a suggestions endpoint) that lands cleanly on its own. Designing them here would
also decide the queue's order before the Library it lives in exists. They go to their own unit, which designs them.

## Decisions

Every decision below is settled (Owner, 2026-11-13). The work ships in three units (§ Boundary fit), so each ADR
disposition names the unit whose work delivers that ADR.

### Resolved

1. **Drag-and-drop with Next Up and search suggestions are designed and built in their own unit** (Owner,
   2026-11-13, relayed through the project's planning). Drag-and-drop with Next Up stays committed and follows the
   Library as a short unit whose draft designs it. Search suggestions come in at the first room, decided when the
   tracking model's unit closes. The tracking model needs no hook for the queue. The queue's order field, its
   migration and its reorder endpoint come with that unit, which can seed positions from the watchlist join time
   decision 2 adds, and its order joins the Library endpoint as one more sort value, which Home and the Watchlist tab
   both read. The entry dialog's movie picker ships here as a combobox searching through the existing
   `GET /movies/search`, so suggestions later change only its endpoint. ADR disposition: none; it orders delivery and
   decides nothing about the system.

   **Seams for search suggestions** (Owner, 2026-11-13, relayed through the project's planning). Suggestions are
   central to the app feeling finished, so this work leaves them no harder to add. The controls' unit builds the
   picker so that:
   - it is a standalone combobox component, not part of the dialog, and takes its item source as an input, so the
     bar's `SearchField` can later adopt it as the one combobox for both;
   - one query-factory entry and its hook own the fetching, the debounce and the two-character minimum, so the
     suggestions endpoint replaces the search endpoint in one place;
   - its items hold only what a suggestion needs (TMDB ID, title, year and poster), mapped from the search results, so
     a lighter suggestions payload needs no change to the component;
   - selecting a film is its own callback, and the bar's free-text submit joins as a separate one when the bar adopts
     it;
   - the bar's Log button (decision 11) sits beside `SearchField` without restructuring it;
   - if the controls change the search service, its filters stay callable on their own (`apply_data_quality_filters`
     and `MovieService._filter_non_visual_content`), since the suggestions endpoint reuses them;
   - its list highlights as Select and Menu do: a solid `tertiary` fill on the highlighted option and a check mark
     (`Combobox.ItemIndicator`) on the chosen one, never a fill, so the suggestions dropdown matches later. Chakra's
     own combobox highlight is a faint `bg.emphasized/60`, so the controls' unit adds a combobox recipe with the solid
     `tertiary` highlight and names the combobox in the component-styling strategy's Menu and Select rule.

   The picker covers an estimated half day to a day of suggestions' 1.5 to 3 days, leaving about 1 to 2: the cached,
   throttled suggestions endpoint, and the bar's search adopting the combobox with its free-text submit. ADR
   disposition: none; a component structure obvious from the code, and for the list's highlight, a tactical choice
   applying the component-styling strategy's Menu and Select rule.

2. **Watched is a fact about a film; entries record viewings and reviews.**
   - **The film's record** keeps watched, the watchlist, liked and one current rating, and records when the film
     joined each list: when it was marked watched, watchlisted and liked. Leaving a list keeps its join time; joining
     stamps a new one, unless the save is an Undo (decision 10), so an undone removal keeps its place. `watched_at`
     and `user_review` leave the record.
   - **Entries** are a new table, many per film. Each has an optional date watched, an optional rating (1–10) and an
     optional review (up to 10,000 characters), and needs a date or a review: an entry is a viewing, a review, or
     both. A dated entry can be marked a rewatch (decision 4's checkbox). Any entry can be edited (its date, rating,
     review and rewatch mark) or deleted at any time, older ones included.
   - **The current rating** is what cards, the Rated tab and the panel's stars show. A film's entries fall in one order:
     by date, with an undated entry counting as dated on the day it was made in the visitor's time zone, and ties by
     when each was made; the latest entry is the last in that order. The panel's stars set the current rating, and so
     does a new entry with a rating, unless another entry comes after it in that order, so a backdated log doesn't
     override a more recent review. Editing the rating on the latest entry updates it too, so correcting tonight's entry
     corrects the card; editing any older entry leaves it alone. "Latest" is judged after an edit. An edit sets the
     current rating from the entry's rating only when the entry is then the latest and the edit changed its rating or
     made it the latest, so fixing a typo in tonight's review doesn't undo a later re-rating. An entry write never
     clears the current rating; Clear rating does (decision 7), and so does an Undo restoring an earlier empty rating
     (decision 10).
   - **Migration:** each record with a date or a review becomes one entry carrying its date, its review and its rating.
     A record rated or reviewed but not marked watched becomes watched, since decision 3's lock requires it, and keeps
     its watchlist as it is. The join times come from the record's creation and update times, which is approximate;
     few records exist before launch. The records' admin becomes view-and-delete only, since its form wrote the flags
     past the rules; deleting there removes the record's entries too.
   - **Endpoints:** entries get their own list (for a film, and across films for Activity), create, edit and delete,
     each scoped to the signed-in user. A film's list also returns the film's record, or its defaults when there is
     none, which the dialog reads (decision 4). Every entry write returns the entry and the film's record.
     - **Creating an entry** sends the entry (its date, rating, review and rewatch mark) and Liked. In one
       transaction the service adds the entry, sets Liked, sets the current rating from the entry's rating by the rule
       above (an entry with no rating leaves it alone), and applies decision 3's rules by the entry's own date, so a
       dated entry never counts as watched without a date.
     - **Editing an entry** changes the entry and Liked, and sets the current rating as the rule above says. It
       doesn't re-run decision 3's watchlist rules.
     - **Time zone:** entry writes carry the browser's time zone, and the service reads the entry's date, the day the
       film joined the watchlist and "today" in it, since the server keeps UTC (`TIME_ZONE`) and a visitor's evening
       can fall on the next UTC day.
     - **Limits:** entry creates and edits count against ADR-043's save windows, since a create for an unstored film
       fetches its card from TMDB; entry deletes don't, as record deletes don't.
     - **Deleting a record** (`DELETE /user-movie-data/{tmdb_id}`, which no page calls) deletes its entries.
   - **The Library endpoint** changes with the record (`ordered_for_library`, `with_state`). The `added` sort orders
     by the join time of the one list the query filters, or by the record's creation time with none or several. The
     `watched` sort becomes last logged, the latest dated entry's date. `UserMovieDataSchema` carries it wherever a
     record is read, and beside it whether the film has any entry, so every card's Watched control can show decision
     3's lock without reading the entries. `with_state` stops reading the review.
   - **In the frontend,** entry writes run as saves of their film, under `saveMutationOptions`'s per-film mutation key
     and scope, so `useUserMovieState`'s overlay shows the record they return and they queue behind the film's other
     saves. They invalidate the Library queries and the entry lists. This unit also makes the shipped watchlist Undo
     send the save's Undo mark.
   - **The shared frontend layer:** this unit also lands what the controls, the Library and Home all draw, so the two
     later units build side by side: the entry queries and mutations in the query-key factory with their hooks, the
     read-only star display for a rating (decision 6) and the rewatch icon (decision 15).

   ADR disposition: a new ADR, numbered when written and delivered by the tracking model's unit, recording how films
   are tracked (decisions 2 and 3) and the stars that show a user's rating (decision 6). It supersedes ADR-043 in
   part: the save no longer carries the watched date or the review, so their explicit-null clearing and "marking a
   movie unwatched clears its date" go; "an omitted field keeps its stored value" gives way to the rules, which change
   watched and the watchlist as a save's side effects; and the save gains its Undo mark (decision 10). ADR-043's upsert,
   record and throttle decisions stand. It also supersedes ADR-027 in part ("one mutation hook ... with an optimistic
   update"): entry writes are further saves of the film, whose effects come from the server's rules and show when it
   returns the record. ADR-027's overlay of pending and confirmed saves stands.

3. **The rules, enforced in the backend's saves.**
   - Watched and the watchlist are independent: a film can be both, as a rewatch queue, and adding to the watchlist is
     allowed at any time.
   - The watchlist drops a film, with Undo, in two cases only: the film changes from unwatched to watched without a
     date (marked, rated, or given an undated review), or an entry is made dated on or after the day the film joined
     the watchlist. An entry for an earlier viewing, and rating or reviewing a film already watched, leave the
     watchlist alone.
   - A rating or an entry on an unwatched film marks it watched.
   - Watched can't be un-marked while the film has a current rating or any entry. The control is locked with an
     explanation; the database holds the rating part as a constraint, and the service enforces the entries part.
   - Deleting an entry leaves watched as it is.

   The rules change fields a save leaves out, so the tracking model's unit also amends DEVELOPMENT-RULES' PATCH rule:
   an absent field stays unchanged except where the data's rules change it (Owner, 2026-11-13). The type-safety
   strategy's Pattern 3, which says the same of `UserMovieDataPatchSchema`, changes with it.

   ADR disposition: the same new ADR as decision 2.

4. **One dialog, "Review or log."** Its fields are the film, "Watched on" with a switch and a date (today by default,
   never in the future, both in the visitor's time zone), Rewatch (a checkbox beside the date, on by default when the
   film has an earlier-dated entry), the rating, the review and Liked. With the date on, saving makes a dated entry;
   with it off and a review written, an undated review entry; with it off and no review, it saves the current rating
   and Liked as a save of the film, with no entry. The dialog's rating is the entry's; decision 2 says when it also
   sets the current rating. A new entry starts with the current rating filled in and an empty review. On opening, from
   any entry point, the dialog reads the film's entry list. Its record, overlaid by the film's saves through
   `useUserMovieState`, gives the prefill, so a Like or rating saved since the list was read still shows; its entries
   give the Rewatch default. Editing an existing entry opens the same dialog on that entry. It has no URL, and on
   phones it fills the screen. It opens from:
   - the bar's Log button on wide screens and "Log a film" at the top of the drawer on phones, with the date on: on a
     film page, with that film chosen and changeable; elsewhere, on the movie picker;
   - a card's "Review or log" control, with the date on: among the hover actions on wide screens, and in the "⋯" menu
     on touch;
   - the film page's Review button, with the date off;
   - Edit on an entry in the film page's list.

   There is no Log button on the film page; the bar's Log covers it. ADR disposition: the controls' ADR (decision 6)
   records a dialog over a page; decision 2's ADR records what each save does.

5. **One Library page with five tabs.** `/library/watchlist`, `/library/watched`, `/library/liked`, `/library/rated`
   and `/library/activity`. `/watchlist` redirects to `/library/watchlist`, and the bar's link reads "Library". Tabs
   are links in a `nav`, as the catalog's release windows are; a sort and direction other than the tab's default join
   the URL; there are no per-tab counts; each tab has an empty state that suggests a next step.
   - Watchlist, Watched and Liked sort by date added by default, meaning when the film joined that list, newest first;
     Rated sorts by the current rating, highest first.
   - Watched lists every watched film once, logged or not. A film with dated entries shows its latest date beneath
     its card, in the grid cell rather than inside `MovieCard`, and the tab also sorts by last logged.
   - Rated has no date-added sort, since rating a film records no join time.
   - Activity lists dated entries newest first, by date and on the same date by when each was made, one per entry, so a
     rewatch is its own entry. Each shows the date, a small poster, the title and year, the entry's rating, the rewatch
     icon, and the start of its review. It is the list the landing page's "Recently watched" shows the top five of. It
     loads the cross-film entry list in numbered pages of 100 as the visitor scrolls, with measured, virtualized rows
     like the film tabs'. The Library includes this timeline of viewings at the Owner's request (2026-11-13).
   - The film tabs use the Library's own virtualized grid, drawing the same cards and loading further pages as the
     visitor scrolls (§ Alternatives). It measures its rows rather than fixing their height, so the card's height can
     change under it.

   ADR disposition: a new ADR, delivered by the Library's unit, recording the Library's tab URLs as ADR-044 records
   the catalog's release windows, its own grid, and the bar's link: it reads Library and is current on every
   `/library` page, superseding ADR-044 in part (the link current only on `/watchlist`). Decision 2's ADR covers
   Activity's entries and the join times.

6. **The card.** Poster first, with no border; the title and the year below it, and TMDB's score beside the year
   rather than on the poster, since it has no backing surface over poster art. At rest a card shows the current rating
   as small gold stars on their own line, and a small watched mark. On hover and keyboard focus, four controls appear
   over the poster with no menu: Watched, Like, Watchlist and "Review or log". At 28px each with 6px gaps they take
   130px, so they fit today's 194px grid card (`CARD_WIDTH`), which keeps its width, and any card from 138px up; the
   PRD confirms no card a pointer reaches is narrower. On touch, a "⋯" button shows at rest and opens a menu with the
   same four. ADR disposition: decision 2's ADR records the stars, since the tracking model delivers their display,
   superseding in part ADR-042's chip for a user's rating ("★ 8"), which would read "8" for four stars, and changing
   the color-token and component-styling strategies' guides for a user's rating. A new ADR, delivered by the controls'
   unit, records the rest: the card's controls on hover and touch, and decisions 4, 9, 10 and 11.

7. **The rating control.** Chakra's `RatingGroup`, five stars with halves, half a star per point (★★★½ is 7). The
   panel's stars save when set, and a "Clear rating" button beside them clears the current rating. On phones, Rate
   opens a bottom sheet with the stars. ADR disposition: none; a tactical choice.

8. **The film page's panel.** It replaces "Your Actions" on today's page and holds Watched, Like and Watchlist as
   toggles with `aria-pressed` (Watched showing its lock), the stars with Clear rating, and Review. Beneath it, the
   owner sees their entries in the reverse of decision 2's order, latest first, so an undated entry sits at the day it
   was made: each entry's date or "No date", its rating, the rewatch icon, and the review's first lines up to a set
   length with "Read more" expanding it in place, plus Edit and Delete. The list shows the latest few with "Show all".
   The panel is one self-contained component that lays out as a row or a column: on today's page it replaces "Your
   Actions" in place, and the detail redesign chooses its position (a column beside the poster, a rail opposite it, or
   a row beside the title). ADR disposition: none; a tactical choice.

9. **Signed-out visitors see no card actions; the film page explains.** Cards drop their actions for anonymous
   visitors. The film page's panel still shows; using it explains that tracking needs an account and offers Sign in,
   returning to the page through `loginPathFor`. "Try the demo" joins it once the demo account exists. ADR
   disposition: the controls' ADR (decision 6).

10. **Feedback and Undo.** A toast with Undo follows a watchlist change (including a rule's), clearing the current
    rating, and saving the dialog. Undo restores the fields the save changed, as a save marked as an Undo, so a film it
    puts back on a list keeps its join time (decision 2); the dialog's Undo first deletes the entry it added. Deleting
    an entry asks for confirmation instead of offering Undo, since re-creating it would re-run the rules. Saving an edit
    to an entry shows a toast without Undo, since the entry can be edited again. Other toggles show their pressed state
    with no toast. ADR disposition: the controls' ADR (decision 6); decision 2's ADR records the Undo mark on the save.

11. **The bar's Log button.** On wide screens, a Log button between the search field and the account control, signed
    in only; on phones, "Log a film" at the top of the drawer, since the phone row is full at 360px. ADR disposition:
    the controls' ADR (decision 6) records it, superseding ADR-044 in part, since ADR-044 lists what the wide bar holds
    and gives the drawer the same primary links.

12. **One signed-in browser smoke spec** covering the watchlist, the Library and the dialog, which ADR-027 left for
    after the query move. It grows the smoke tier by one and runs against the local target only. A save fetches an
    unstored film's card from TMDB, which CI's development stack can't reach with its placeholder token, and fixture
    films exist only in the browser's fixtures. So the spec uses its own fixture films, with IDs far above TMDB's range,
    and the development seed stores their cards; seeding then never touches a real film's card in a worktree. The spec
    signs in as the persistent development account, so before its journey it deletes its fixture films' records
    (`DELETE /user-movie-data/{tmdb_id}`, which removes their entries), and every local run starts from the same state.
    Staging skips it, as it skips sign-up, since the staging run changes none of its account's data. The Library's unit
    adds the spec with the watchlist's and the Library's steps. It updates every reference document that names the smoke
    specs, counts them or describes what they cover, found by searching for the spec file names and the counts: among
    them ADR-027's Status (the deferred watchlist test), the testing strategy, TECHNICAL-OVERVIEW, QUICK-REFERENCE and
    the quality-gates strategy. The dialog's steps join from whichever of the controls and the Library merges second.
    ADR disposition: the Library's ADR (decision 5) records it, superseding ADR-044 in part (its list of six smoke
    specs), as ADR-044 did ADR-039's, and ending ADR-039's exclusion of watchlists from the tier. If the controls add
    the dialog's steps after the Library merges, they add a dated note to that ADR recording when that part was
    realized.

13. **React Hook Form 7 for the dialog,** rather than Formik, which the sign-in forms use. Formik has had no release
    since 2.4.9 (2025-11-10), so new and rewritten forms move to React Hook Form, starting with this dialog. ADR
    disposition: a new ADR, delivered by the controls' unit, recording React Hook Form for new and rewritten forms; that
    unit also updates TECHNICAL-OVERVIEW's forms line.

14. **The browse grid's two inbox entries are errands, not part of this work.** Restoring browse positions past the
    first pages after a reload, and moving the grid tests onto MSW, concern the browse grids' data layer and tests,
    which this work doesn't change. It changes only the card they draw, and with it the browse grid's fixed row height
    (`ROW_HEIGHT`) and the tests that assert it, which the controls' unit updates. Both moved to the inbox's errand
    section.
    ADR disposition: none; a routing decision.

15. **A rewatch shows an icon.** An entry marked a rewatch shows a rewatch icon (a circular arrow) beside its date
    wherever entries list: Activity, the film page's entries and Home's "Recently watched". Its accessible name is
    "Rewatch". ADR disposition: none; a tactical choice.

### Open

None. Drag-and-drop with Next Up's design, and search suggestions' design and size, moved to the queue's own unit
(decision 1; Owner, 2026-11-13). What that unit inherits from the landing page's design: the queue is ordered only
on the Library's Watchlist tab, and Home shows the watchlist in that tab's order, leading with a large card for the
first film that links to the tab to reorder.

### Success signal

A signed-in visitor adds a film to the watchlist from a card, finds it on the Watchlist tab, logs it with a date, a
half-star rating and a review, and finds it on the Watched, Rated and Activity tabs and off the watchlist.
They re-add it to the watchlist, log a rewatch with a new rating and review, and see it leave the watchlist again,
with two entries in Activity and on the film page, each keeping its own rating and review. Every control works by
keyboard and touch; a signed-out visitor sees no card actions, and the film page's panel offers sign-in.

### Boundary fit

Entry read (2026-11-13): the core controls, the Library and the dialog are one design, sharing the rules, the rating
control and the dialog's entry points across cards, the film page and the bar. Outcome then: stays one work unit, with
drag-and-drop with Next Up and search suggestions building right after.

Re-run (2026-11-13). Decisions 2, 3 and 5 add a tracking model: the entries table and its data migration, the join
times, the current rating's rules, the entry endpoints, the Activity tab and the film page's list of entries. The
estimate, calibrated on the navigation shell (about 5,000 changed lines in 3.5 to 5 days):

| Part | Days (estimate) | Changed lines (estimate) |
| --- | --- | --- |
| Tracking model: entries, migration, rules, join times, endpoints, the ADR | 3 to 3.5 | 3,500 to 4,000 |
| Controls: cards, the film page's panel and entries, the dialog, the bar | 4.5 to 5 | 5,000 to 6,000 |
| Library: five tabs with Activity, the redirect, the smoke spec | 2.5 to 3 | 3,000 to 3,500 |
| Whole | 10 to 11.5 | 11,500 to 13,500 |

As one unit it passes the 10,000-changed-line mark and forecasts a task list of more than six phases, so the boundary
returns to the Owner. The design's seams are its three layers, each landable on its own:

- **(a) Three units, in order:** the tracking model (the backend change and its ADR; today's frontend keeps working
  with its types updated); then the controls (cards, the panel, the dialog, the bar's Log; today's `/watchlist` stays
  until the Library replaces it); then the Library with Activity and the smoke spec. Drag-and-drop with Next Up then
  builds on the Library.
- **(b) Two units:** the tracking model, then everything else. The second still forecasts more than six phases.
- **(c) One unit,** which needs the Owner's decision and a recorded reason that one review of the whole change set
  can hold it.

Outcome (Owner, 2026-11-13): cut-map (a). The tracking model is a data migration that deserves a review of its own,
and landing it first lets the landing page's "Recently watched" and the queue's sort build against the entries and
join times sooner. Each part becomes its own work unit with its own PRD, task list and branch; all three share this
draft. Order (cleared with the project's planning, 2026-11-13):

- **The tracking model first,** on this branch, `technical/user-movie-tracking`. Besides the backend change, it takes
  the Library endpoint's changes and the shared frontend layer the other two build on (decision 2). By the design
  review's estimate (2026-11-13), that moves 300 to 500 changed lines into it from the other two units; the whole's
  estimate stands.
- **The controls and the Library side by side,** each on its own branch from `main` with its PRD written while the
  tracking model builds, merging `main` once it has merged and before writing its task list. Both draw the tracking
  model's shared layer and `MovieCard`, which the controls own; the Watched tab's date line sits beneath the card in
  the Library's grid cell. The Log button is the controls' and the bar's Library link the Library's. They meet in the
  Library's empty states that open the dialog and in the smoke spec's dialog steps (decision 12); whichever merges
  second adds those. If the Library merges first, its scans find today's unnamed card buttons, so `scanPage` groups
  its tabs as `/library/:tab`, as it groups `/movie/:id`, and the Library adds a `button-name` entry for that route
  to the accessibility baseline, which the controls remove with the others.
- **Drag-and-drop with Next Up after the Library.**

Meeting points with the landing page:

- Whichever of it and the tracking model merges second regenerates the frontend's API types after merging `main`,
  since both change the schema.
- Whichever of it and the Library merges second adds signed-in Home's "Recently watched" and its "See all". It shows
  each viewing's rating with the tracking model's star display.
- The landing page applies decision 9's rule early, so Home shows no card actions to signed-out visitors (Owner,
  2026-11-13); whichever of it and the controls merges second keeps the controls' form of the rule. The landing page
  keeps the accessibility baseline's `/browse` and `/search` `button-name` entries, since signed-in cards still lack
  names there, and adds one for `/` (`axeBaseline`); the controls remove all three once Watched and Liked have
  accessible names.
- Signed-out Home's band and its pitch line name only what works when the landing page merges (Owner, 2026-11-13,
  relayed); if it merges before the controls, the controls add watching, rating and liking to both.

### Next

The tracking model's PRD, on this branch; the controls' and the Library's PRDs on their own branches while it builds.

## Unknowns and Assumptions

- **The save hook generalizes.** `saveMutationOptions` builds Undo only for `user_on_watchlist`, as its inverse. Undo
  for a rule's side effect or the dialog's save restores several fields at once from the record before the save, and
  the dialog's first deletes the entry it added (decision 10).
- **Library pages shift after a write.** The endpoint orders by a key that ends on the TMDB ID, but a save moves rows
  between pages, so a client refetches the pages it has loaded after any write (`strategy-pagination.md`).
  `useUserMovieState` already invalidates every Library query on a successful save (`libraryKey`), and entry writes
  run as saves (decision 2). With pages of 100, a tab scrolled through 2,000 films refetches 20 pages in sequence
  after each save, at least 60 database queries (per page, the count and rows in `get_library` and the user lookup
  in `JWTSessionAuth`); the Library's PRD accepts that cost or bounds it.
- **The dialog's picker searches through the full search endpoint.** `search_movies` runs its buffered pipeline on
  every request and has no throttle or cache; the picker sends debounced queries of two or more characters, and the
  service returns nothing for shorter ones. Search suggestions, when their unit builds them, replace it.
- **Un-marking watched with entries is a service rule.** A database check holds the current rating's part of the lock,
  but a check can't see rows in another table.
- **The migrated join times are approximate.** Records have no time each list began, so the migration takes the
  record's creation and update times.
- **Ratings, reviews and entries stay private** to their owner; nothing here shares them. The privacy policy's text is
  drafted outside this repository for the privacy and terms pages, which the roadmap places after the landing page,
  and its draft describes one rating and one short review per movie. The review notes kept with that draft record
  that before those pages ship, the policy must name dated entries, each with its own rating and review, and the join
  times.

## Scope Boundary (Won't Do)

- **Drag-and-drop with Next Up and search suggestions:** designed and built in their own unit (decision 1).
- **The movie detail redesign:** the backdrop, the layout around it, the cast rail. This work replaces the current
  page's actions in place; the redesign places the panel (decision 8).
- **Signed-in Home** (the landing page's design). Its rows are short and read-only, each ending in "See all" into the
  Library tab that holds the whole list, which decision 5's tab URLs serve; the Library is the only page where a
  visitor sorts, filters or reorders their films. Home's poster rows draw `MovieCard`, so its actions reach them, and
  marking a film watched in the watchlist row takes it off the row, with Undo. "Recently watched" lists the five
  newest dated entries, one per entry, each with its date, its rating as stars and the rewatch icon, with "See all"
  into the Activity tab, and reads the entry endpoint; whichever of the Library unit and the landing page merges second
  adds it. Until the Library exists, the watchlist row's "See all" opens `/watchlist`, which then redirects.
- **The browse grids' data layer, and their tests beyond the row height** (decision 14), and the browse grid's phone
  layout, which the responsive finish takes.
- **An activity feed beyond viewings** (ratings, likes or watchlist changes as events), a reviews page, lists,
  favorites, and any sharing of ratings, reviews or entries.
- **The demo account;** "Try the demo" joins the panel when it exists.
