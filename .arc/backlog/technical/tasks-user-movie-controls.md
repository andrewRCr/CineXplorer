# Task List: User Movie Controls

**PRD:** `prd-user-movie-controls.md`
**Created:** 2026-11-14
**Branch:** `technical/user-movie-controls`
**Base Branch:** `main`
**Status:** Pending

## Overview

**Purpose:** Make the tracking model usable: Watched, Like, Watchlist and "Review or log" on every card a signed-in
visitor sees, the same plus the rating and the film's entries on its page, and Log in the bar, each change showing what
the server decided and offering Undo where something was removed.

**Shared design:** `draft-user-movie-uis.md` covers the tracking model, these controls and the Library. It stays in the
backlog until whichever of the controls and the Library archives last, which moves it into its archive folder.

## Scope

### Will Do

- Give saves the toasts and Undo of R31 to R36 in `saveMutationOptions`, and expose the entry writes' mutation options
  so Undo can delete an entry after the dialog has closed
- Build the "Review or log" dialog: one host in the app's layout opened through `useEntryDialog()`, a React Hook Form
  form that prefills from the film's log, Save's four paths, its toasts and Undo, and the discard prompt
- Build `MoviePicker` on Chakra's `Combobox`, with one query entry owning the search and its own pagination context,
  and the interceptor and paginated fetcher changes that carry it
- Add Log to the wide bar and "Log a film" to the phone drawer
- Rebuild `MovieCard`: poster first, a fixed text block with the year, score, watched mark and stars line, the hover
  and focus group on pointers, the "⋯" menu on touch, controls only for signed-in visitors, and the computed row height
- Replace "Your Actions" on the film page with the "Your film" panel (toggles, the lock, the rating on wide screens and
  in a sheet on phones, Review, the signed-out note) and the "Your log" list with Edit and Delete
- Write ADR-048 and ADR-049, add `react-hook-form` 7, and update TECHNICAL-OVERVIEW, the component-styling strategy,
  the pagination and service-layer strategies, ADR-044's Status and the accessibility baseline
- Merge `main` before the pull request and apply what it holds (R41)

### Won't Do

- Change the tracking model, its rules or its endpoints; no backend change is expected
- Watchlist, Library or History pages, or bar links to them; `/watchlist` keeps its plain list
- Search suggestions' endpoint, the bar's search adopting the picker, drag-and-drop or Next Up
- The movie detail redesign, Home beyond R41b's copy, or actions on Home's large card
- The browse grids' data layer or phone layout, beyond the card, its height and the row height
- Move the sign-in, registration and password forms to React Hook Form; restore a deleted entry
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** Every save shows what the server decided, and can be undone

_Mode:_ `layer` — closes on the save layer every control draws: a save's toast and Undo from the shown state and the
returned record, a refused un-mark's message, and entry writes that run without a mounted hook.

_Exit criterion:_ the save layer's tests show each save row of R32 with its description and Undo, criterion 15's save
Undo bodies, the 409 message, and `useMovieEntries`' tests passing on the exposed options.

- [ ] **1.1 A save's toast names what the visitor did and what the rules did, and offers Undo — R31, R32, R33, R35,
  R37**

    **Goal:** Watchlist toggles, saves whose answer shows a rule changed the watchlist or cleared a like, and Clear
    rating each toast with R32's title and description and an Undo that restores R33's fields, while plain watched,
    like and rating saves stay silent and a dialog's saves show no success toast of their own.

    - [ ] **1.1.a Write the feedback cases in `src/hooks/movie/__tests__/useUserMovieState.feedback.test.tsx`**
        - Render a probe over `useUserMovieState` with `<Toaster />`, answering each `PATCH` through MSW with the
          record its case needs (no default handler exists)
        - Test each save row of R32 and R31's rules: watchlist on and off titled from the returned record; marking an
          unwatched film on the watchlist watched ("Marked as watched", "Also removed from your watchlist."); liking
          and rating an unwatched film on the watchlist ("Also marked as watched and removed from your watchlist.");
          Clear rating ("Rating cleared"); un-marking Watched on a liked film ("Marked as not watched", "Your like was
          removed."); a log or a watched mark never adding "Also marked as watched."
        - Test silence: marking watched, liking and rating with no watchlist change show no toast, including liking and
          rating an unwatched film that isn't on the watchlist, which the rule marks watched; un-liking a liked film,
          and un-marking Watched on a film that isn't liked, show none; a save marked `silent` shows no success toast,
          and its failure still shows the shared error toast
        - Test that a toast never describes the visitor's own change: removing a film from the watchlist shows "Removed
          from watchlist" with no description
        - Test Undo bodies (criterion 15): liking an unwatched film on the watchlist sends
          `{ user_liked: false, user_watched: false, user_on_watchlist: true, undo: true }`; un-marking Watched on a
          liked film on the watchlist sends `{ user_watched: true, user_liked: true, user_on_watchlist: true, undo:
          true }`; Clear rating sends `{ user_rating: <earlier rating>, undo: true }`; a toast whose save changed no
          field offers no Undo
        - Test R35: an Undo's save offers no Undo, and toasts only when its record has the film on or off the
          watchlist where the undone record did not, titled by the watchlist's new state; after a change of user, Undo
          sends nothing
        - Expect tests to FAIL initially

    - [ ] **1.1.b Keep the shipped watchlist tests' assertions with whole-record answers**
        - In `useUserMovieState.test.tsx`, change the watchlist cases' mock answers to keep the probe payload's
          `user_watched: true` (`createMockUserMovieData` defaults it to `false`); their assertions stay unchanged, and
          if an earlier merge of `main` brought the backend unit's `time_zone` on record saves, their expected bodies
          keep it as `main` has them (R41d)

    - [ ] **1.1.c Carry the shown state into every save and build the feedback from it**
        - `SaveVariables` (`movieWriteOptions.ts`) gains `shown` (the state the save started from) and `silent` (a
          dialog's save: no success toast of its own); `useUserMovieState`'s `save` passes its current `state` as
          `shown`
        - Add `src/hooks/movie/saveFeedback.ts`, taking `shown`, the returned record and `sent` (the record fields
          whose change the title already names; for a save, the fields it sent): the R32 title from the fields sent (a
          watchlist toggle's from the returned record's `user_on_watchlist`, as today); R31's toast decision from its
          list (a watchlist toggle, Clear rating, or a watchlist change or a cleared like outside `sent`); R32's
          description from the fields outside `sent` that differ between `shown` and the returned record; and R33's
          Undo body from every field that differs, `sent` included (at their shown values; with `user_watched`, also
          `user_on_watchlist` and `user_liked` at their returned values where not already supplied). Exported so the
          dialog host (2.4) composes the same comparison
        - `saveMutationOptions`' `onSuccess` toasts per R31 through `createSaveToastId()`, and its Undo sends R33's body
          through a `MutationObserver` as today, guarded by the change count; the Undo's own success follows R35
        - `save(changes)` keeps its signature for the card and the panel. A caller that needs the result (the dialog,
          2.3 and 2.4) runs `saveMutationOptions` through its own `useMutation` and awaits `mutateAsync` with `shown`
          and `silent`; it shares the film's mutation key, so `useUserMovieState` still shows the pending fields
        - If an earlier merge of `main` brought the backend unit's `time_zone` on record saves, `saveMutationOptions`
          keeps filling it and its test stays (R41d)
        - Tests should now PASS, with `useUserMovieState.test.tsx` and `useUserMovieState.ownership.test.tsx`

- [ ] **1.2 A refused un-mark says why — R36**

    **Goal:** When the server answers 409 to un-marking Watched, the visitor reads "Couldn't change Watched" with the
    server's reason, and the control shows the film watched.

    - [ ] **1.2.a Write the 409 case in `useUserMovieState.feedback.test.tsx`**
        - Answer `{ user_watched: false }` with 409 and a `detail`; expect the error toast's title and description, and
          the shown state watched once the save settles; other failures keep "Failed to save changes" and "Failed to
          update watchlist"
        - Expect tests to FAIL initially
    - [ ] **1.2.b Read the status in `saveMutationOptions`' `onError`** (`getErrorStatus` in `axiosErrorUtils`)
        - Tests should now PASS

- [ ] **1.3 Entry writes expose their mutation options — R38**

    **Goal:** An entry delete can run from a toast's Undo after the component that started it has unmounted, while
    `useMovieEntries` keeps its interface and its tests.

    - [ ] **1.3.a Write the unmounted delete case in `src/hooks/movie/__tests__/useMovieEntries.test.tsx`**
        - A `MutationObserver` built from the exposed options deletes an entry with no hook mounted, joins the film's
          write queue, and invalidates the entries and Library keys; a write from an earlier user is refused
        - Expect tests to FAIL initially
    - [ ] **1.3.b Export `entryMutationOptions(tmdbId)` from `useMovieEntries.ts`, and build the hook on it**
        - As `useUserMovieState.ts` exports `saveMutationOptions`: move `mutationFn`, `onMutate`, `onSuccess` and
          `onError` out of the hook, which keeps its time zone and ownership handling and its returned interface
        - Tests should now PASS, with the existing `useMovieEntries.test.tsx` cases unchanged

### **Phase 2:** A film is logged or reviewed from the bar

_Mode:_ `slice` — closes on the tracking journey running end to end (criterion 1), from the bar and the cards through
the film page.

- [ ] **2.1 The picker finds films as the visitor types, under its own pagination context — R26, R27, R28, R40**

    **Goal:** Typing two or more characters in the "Film" combobox lists up to ten films with poster, title and year
    after a 300ms pause, reports a choice through `onSelect`, and never clears the search page's record of films shown.

    - [ ] **2.1.a Check `main` for the landing page before starting**
        - Fetch, and run `node scripts/worktree.mjs overlap frontend/src/services/apiClient.ts
          frontend/src/services/httpService.ts frontend/src/services/movieService.ts`
        - If the landing page is on `main`, propose merging `main` first (the Owner approves the merge), apply what an
          early merge can ("Merges of `main`" in the Implementation Notes), then build on its interceptor check and
          `ReadOptions`; otherwise make 2.1.c's change in the landing page's form (see Implementation Notes), so
          whichever merges second keeps one form

    - [ ] **2.1.b Write the read path's tests**
        - `src/services/__tests__/apiClient.test.ts`: the interceptor keeps a caller's `X-Pagination-Context` on the
          movie list endpoints and adds the tab's only when the request has none; the existing one-context case is
          renamed to the catalog's lists sharing the tab's context
        - `src/services/__tests__/httpService.test.ts`: `getPaginated` sends the request options it is given
        - Expect tests to FAIL initially

    - [ ] **2.1.c Let the read path carry a caller's context**
        - The interceptor in `apiClient.ts` sets the tab's context only when none is set; `HttpService.getPaginated`,
          `fetchPaginatedMovies` and `searchMovies` take optional request options; `paginationContext.ts` gains the
          picker's context, one per page load
        - Tests should now PASS

    - [ ] **2.1.d Write the query entry's tests in `src/hooks/movie/__tests__/useMoviePickerItems.test.tsx`**
        - Fake timers: no request below two characters (trimmed); one request after typing pauses for 300ms; the first
          page of `GET /movies/search` for the trimmed text; results mapped to `{ tmdbId, title, year, posterPath }`
          and cut to ten; the previous items kept while the next search loads; the request carrying the picker's
          context, not the tab's (criterion 6)
        - Expect tests to FAIL initially

    - [ ] **2.1.e Add `moviePickerQuery(text)` to `src/lib/queries.ts` and its hook in `useMoviePickerItems.ts`**
        - The entry owns the fetch, the hook the debounce and the minimum, so a suggestions endpoint replaces the
          search in this one place
        - Tests should now PASS

    - [ ] **2.1.f Write `MoviePicker`'s tests in `src/components/movie/__tests__/MoviePicker.test.tsx`**
        - Labelled "Film"; closed under two characters; "Searching…"; `No films match "{text}".`; "Search failed. Keep
          typing to try again."; items with a poster (or `PosterPlaceholder`), title and year; choosing an item calls
          `onSelect` with it, by keyboard and pointer; the chosen item shows a check mark
        - In `src/theme/recipes/__tests__/`, the combobox recipe gives the highlighted item a solid `tertiary` fill with
          `on-tertiary` text (criterion 6)
        - Expect tests to FAIL initially

    - [ ] **2.1.g Build `src/components/movie/MoviePicker.tsx` and `src/theme/recipes/combobox.ts`**
        - Chakra `Combobox` fed by `useMoviePickerItems`; `Combobox.ItemIndicator` for the chosen item, never a fill;
          export it from `recipes/index.ts`, register it under `slotRecipes` in `src/theme/index.ts`, and run
          `npm run typegen`
        - Tests should now PASS

    - [ ] **2.1.h State the two contexts and the combobox highlight where the rules are written**
        - `strategy-pagination.md` § Multi-Tab Isolation and the interceptor example in `strategy-service-layer.md`:
          the catalog's lists share the tab's context, and the picker carries its own (with Home's too, if the landing
          page is on `main`)
        - `strategy-component-styling.md`: the highlight rule for the menu and select recipes names the combobox recipe

- [ ] **2.2 One dialog opens over any page and gives focus back — R19, R20, R39**

    **Goal:** Any component under the app's layout, the bar included, can call `useEntryDialog().open(options)` to show
    one "Review or log" dialog over the current page, and closing it returns focus to the control that opened it, or to
    the nearest that remains.

    - [ ] **2.2.a Write the host's tests in `src/components/movie/entry/__tests__/EntryDialogHost.test.tsx`**
        - A test opener inside `EntryDialogHost` calling `open()` shows a dialog titled "Review or log", or "Edit entry"
          with `entry`, with no change of URL (what the options do to the form is tested in 2.3)
        - Closing returns focus to the opener; when the opener has unmounted, to the `returnFocus` it passed (the
          menu's and the drawer's own cases come in 3.1 and 2.5)
        - `useEntryDialog()` outside a host renders without error, and its `open` throws when called
        - Expect tests to FAIL initially
    - [ ] **2.2.b Add the context, `useEntryDialog()` and `EntryDialogHost`, mounted once in `BaseLayout`**
        - `src/contexts/EntryDialogContext.ts`, `src/hooks/movie/useEntryDialog.ts`,
          `src/components/movie/entry/EntryDialogHost.tsx`
        - `BaseLayout` holds the bar for both `AppLayout` and `AuthLayout` (sign-in, registration, password), so the
          provider wraps its `NavBar` and content there, and Log works on every page that shows it
        - `useEntryDialog()` reads a context whose default `open` throws when called; `EntryDialogHost` is the provider,
          taking `children` (see Implementation Notes on tests that open the dialog)
        - `open(options)` takes R19's `film`, `dateOn`, `filmChangeable` and `entry`, and the optional `returnFocus`, a
          function returning the element, read through Ark's `finalFocusEl` when the dialog closes
        - Chakra `Dialog`: full screen below `md`, centered and at most 560px wide from `md` up, from the dialog
          recipe or props, never inline colors
        - Tests should now PASS

- [ ] **2.3 The dialog starts from the film's log and saves what R22 says — R20, R21, R22, R23, R24, R40**

    **Goal:** Each row of R22 sends its request from a form prefilled per R21, Save enables only as R23 says, and
    changing the film re-reads its log and resets the rating, Liked and Rewatch while keeping the date and review.

    - [ ] **2.3.a Add `react-hook-form` 7 to `frontend/package.json` and its lockfile**

    - [ ] **2.3.b Write the form's tests in `src/components/movie/entry/__tests__/EntryForm.test.tsx`**
        - Fields in order (Film, Watched on with Rewatch beside the date while on, Rating with Clear, Review, Liked),
          then Cancel and Save; the film's poster, title and year with "Change" when changeable, otherwise
          `MoviePicker`
        - Prefill (R21): rating and Liked from the log's record with the film's saves on top; a new entry's empty
          review; Rewatch on for a dated entry on or before the chosen date (same day included), following the date
          until the visitor sets it; an edit from the entry's date (or the switch off), rating, review and mark, Liked
          from the record; fields inert while the log loads; "Couldn't load this film's log." with Retry, Save disabled
        - Each row of R22 sends its request (criterion 5); Rewatch sent only with a date; emptying the rating on the
          third path sends `user_rating: null`; Liked alone on an unwatched film sends the third path's save
        - R23: Save disabled until a film is chosen and its log read, and then, for a new entry, until the switch is
          on, a review is written, or the rating or Liked differs from the record; for an edit, until a field differs
          and the entry keeps a date or a review; "An entry needs a date or a review." for an edit with the switch off
          and no review; "Enter a date no later than today, or turn off Watched on." for an empty or future date; a
          review of spaces counts as empty; zero stars counts as no rating
        - The date input defaults to today in the visitor's time zone and allows no later day; the review stops at
          10,000 characters and shows its count past 9,000
        - R24: choosing another film re-reads its log and resets the rating, Liked and Rewatch, keeping the date and
          review
        - A successful Save calls `onSaved` once with its result, `sent` included; a failed one doesn't, and leaves the
          fields as typed
        - Cancel calls `onCancel` and nothing else; typing or changing the review reports `onReviewDirtyChange(true)`,
          and returning it to its starting text reports `false`
        - Expect tests to FAIL initially

    - [ ] **2.3.c Build `src/components/movie/entry/EntryForm.tsx` with React Hook Form's built-in validation**
        - Reads `movieEntriesQuery` and shows the record through `useUserMovieState`; the rating is Chakra's half-star
          `RatingGroup` labelled "Rating", its stars times two the `rating` sent, filled stars in `imdb-gold`; a native
          `type="date"` input
        - Entry creates and edits await `useMovieEntries`' `createEntry` and `editEntry`; the third path awaits
          `saveMutationOptions`' `mutateAsync` (1.1.c), marked `silent`, with `shown` the state when Save was pressed
        - `EntryForm`'s props: R19's `film`, `dateOn`, `filmChangeable` and `entry`, as `open()` received them, and
          three callbacks. `onSaved(result)` is called once the awaited write answers, with `{ kind: "create" | "edit" |
          "save", dateOn, shown, record, entryId, sent }` (`entryId` for a create; `sent` the record fields whose change
          the title names: `user_liked` on every kind, `user_rating` on the third path, and `user_watched` with the date
          on, since a log says it already). `onCancel()` is called by Cancel. `onReviewDirtyChange(dirty)` reports
          whether the review differs from its starting text
        - The form owns R25's progress, inert fields and failure state; the host owns closing, the discard prompt and
          the toast (2.4)
        - Tests should now PASS

    - [ ] **2.3.d Write ADR-049 (`Proposed`): React Hook Form for new and rewritten forms**
        - From the ADR template: Formik's last release (2.4.9, November 2025), built-in validation over a schema
          library, and Formik staying in the sign-in, registration and password forms until they are rewritten
        - TECHNICAL-OVERVIEW's forms line names React Hook Form for new and rewritten forms, with Formik remaining in
          those three forms

- [ ] **2.4 Saving closes the dialog with one toast, and its Undo restores the film — R25, R31, R32, R34, R37**

    **Goal:** A dialog save shows its progress, closes on success with exactly one toast titled per R32, offers an Undo
    that deletes a created entry before restoring the film's fields, and leaves everything as typed on failure.

    - [ ] **2.4.a Write the save and Undo cases in `EntryDialogHost.test.tsx`**
        - While saving, Save shows its progress and the fields are inert; on success the dialog closes and one toast
          shows: "Logged", "Review saved", "Saved" or "Entry updated", with R32's descriptions from comparing the shown
          state at Save with the returned record outside `sent`: no "Also marked as watched." after a log, and no "Your
          like was removed." when the visitor turned Liked off
        - Undo (criterion 15): a create's toast always offers Undo, which sends the `DELETE` and then R33's save only if
          a field differs, and no save when the `DELETE` fails, including after the dialog has closed; the third
          path's Undo sends R33's save alone; an entry edit's toast offers none; after a change of user, Undo sends
          nothing
        - A failed save keeps the dialog open with everything as typed and shows the shared error toast
        - The picker inside the dialog: opened with no film, choosing a film in the "Film" picker by keyboard, and by
          pointer, keeps the dialog open and shows that film; Save then sends the chosen film's write
        - P1: Cancel, Escape or the close button with a review typed or changed asks "Discard your review?" with Keep
          editing and Discard; Keep editing leaves the dialog open as typed, Discard closes it; with no review change,
          each closes at once, including on the next opening after a typed review was saved or discarded; Back or
          Forward closes the dialog without saving or asking
        - Expect tests to FAIL initially
    - [ ] **2.4.b Render the form, show the host's toasts and run R34's Undo**
        - The host renders `EntryForm` (2.3.c) in the dialog's body with the options `open` received. The form's
          `onCancel` and the Dialog's own close (`onOpenChange`: Escape, the close button, a click outside) make one
          close request, which asks "Discard your review?" while `onReviewDirtyChange` last reported `true`; the host
          clears that flag on each `open()`. A successful save and a change of location close without it
        - Close, toast and build Undo from `onSaved`'s result; compose `saveFeedback.ts` (1.1.c) with its `shown`,
          `record` and `sent` for the description and save body; Undo deletes through `entryMutationOptions` (1.3.b)
          with a `MutationObserver`, then saves through `saveMutationOptions`, guarded by the change count; the host
          closes on the router's location change
        - Tests should now PASS

- [ ] **2.5 The bar's Log and the drawer's "Log a film" open the dialog — R29, R30**

    **Goal:** A signed-in visitor opens the dialog from the bar on any page, on the film when they are on its loaded
    page, and the bar holds no Log button for anyone else.

    - [ ] **2.5.a Write the bar's cases in `src/components/layout/navbar/__tests__/`**
        - `WideNavBar`: "Log" between the search field and the account control while signed in, none while signed out
          or resolving; it opens the dialog on the picker with the date on; on `/movie/:id` with the film loaded, on
          that film, changeable; on a film page still loading, failed or not found, including a refetch that answered
          404 over cached data, on the picker
        - `NavDrawer.test.tsx`: a full-width "Log a film" above the links while signed in, none otherwise; it closes the
          drawer, opens the dialog as Log does, and closing the dialog returns focus to "Open menu"
        - Both render inside `EntryDialogHost` and assert what the dialog shows: the "Film" picker, or the film's title
          with "Change"
        - Expect tests to FAIL initially

    - [ ] **2.5.b Add the buttons to `WideNavBar.tsx` and `NavDrawer.tsx`**
        - `size="sm"`, a plus icon and "Log"; `SearchField` unchanged; "Log a film" passes `returnFocus` with the
          drawer's "Open menu"
        - On `/movie/:id`, Log opens on the film only when `getQueryState` on `movieDetailQuery`'s key reports
          `success`
        - Tests should now PASS

    - [ ] **2.5.c Run `e2e/phone-width.spec.ts` and `e2e/sign-in.spec.ts` against the browsable stack**
        - `phone-width.spec.ts` signs in, opens the drawer with its new first button, and crosses to the wide bar at
          1024px; `sign-in.spec.ts` scans signed-in `/` at 1280px with Log in the bar, and tabs through the bar to the
          account menu
        - Also look at the wide bar at 1024px signed in, since neither spec measures it, and confirm Log fits without
          overflow

### **Phase 3:** Cards carry the controls

- [ ] **3.1 Signed-in visitors act from a card by pointer, keyboard or touch — R3, R4, R5, R8, R9, R19, R39**

    **Goal:** On a hover-capable pointer a signed-in visitor reveals a named group of four controls by hovering the
    card or tabbing into it, on touch a visible "⋯" menu holds the same actions, a locked Watched explains itself and
    sends nothing, and no one else sees a control.

    **Note:** Check `main` for the landing page first, as 2.1.a does: it changes `MovieCard.tsx` and `axe-baseline.ts`,
    and its tests press today's card buttons. A merge here applies only what an early merge can (Implementation Notes,
    "Merges of `main`").

    - [ ] **3.1.a Write the hover group's cases in `src/components/movie/__tests__/MovieCard.test.tsx`**
        - Stub `matchMedia` to answer yes for `(hover: hover)` and render signed in: a group named "Your actions for
          {title}" after the poster's link and before the title, with Watched, Like, Watchlist and "Review or log" in
          order, each with its tooltip; the toggles named "Watched", "Like" and "Watchlist" with `aria-pressed`
        - Activating a toggle saves the opposite of its shown state; "Review or log" opens the dialog (inside
          `EntryDialogHost`) showing the card's film without "Change", with the date on; no activation follows the
          poster's link
        - The lock (criterion 3): a rated film and a film with entries show Watched with `aria-disabled="true"`, the
          lock icon and the explanation as tooltip and accessible description, and activating it sends no request; a
          film only liked shows Watched unlocked
        - Signed out and while sign-in resolves: no controls (criterion 7); `GridSkeletonLoader`'s placeholder cards
          render none signed in
        - R8: a rerender with a changed `user_watched`, `user_liked`, `user_on_watchlist`, `user_rating` or
          `has_entries` updates the controls
        - Expect tests to FAIL initially

    - [ ] **3.1.b Write the menu's cases in `MovieCard.test.tsx`** (criterion 2)
        - With `(hover: none)`: the "⋯" button named "Actions for {title}" and no hover group; checkbox items checked
          by the film's state; choosing one saves or opens the dialog and closes the menu
        - A locked Watched item is `aria-disabled`, reached with the arrow keys, changes nothing when chosen, leaves the
          menu open and shows the explanation as a second line
        - A dialog opened from the menu (inside `EntryDialogHost`) returns focus to the "⋯" button when it closes
        - Expect tests to FAIL initially

    - [ ] **3.1.c Move the tests that click today's footer to the new controls**
        - In `MovieCard.test.tsx`, render each case signed in (a stored token, `authHandlers()` and
          `AuthContextProvider`) with `(hover: hover)` stubbed, and press "Watchlist": "queues two quick toggles while
          keeping the control enabled", "keeps a %s save when its card remounts", "rolls back a failed save (%s)",
          "keeps a save when the next page lands and the cards remount…", "shows a save toast and refetches the
          Library after its card unmounts" and "runs Undo from a toast whose card is gone"
        - `MovieDetail.test.tsx`'s "shows a card save over a previously cached detail…": its card step uses the card's
          new control; its film-page step changes in 4.1.b
        - If the branch carries the landing page or the Library by now, move their card tests too, as "Merges of
          `main`" in the Implementation Notes lists them; a later merge moves them then

    - [ ] **3.1.d Replace the card's footer with the group and the menu, shown only while signed in**
        - The footer's three icon buttons go. `useMediaQuery(["(hover: hover)"], { ssr: false })` chooses one set of
          controls (D1), so the first paint already has the right set, as `NavDrawer` and `AccountControl` read theirs;
          `useAuthContext()?.status` gates both; a `MovieCard` prop the skeleton sets withholds them from placeholder
          cards
        - The memo comparison covers `user_watched`, `user_liked`, `user_on_watchlist`, `user_rating` and
          `has_entries` (R8)
        - The group: 28px icon buttons 6px apart, centered 8px above the poster's bottom edge, each on a solid backing
          surface from a token pair the contrast check covers; hidden at rest, shown on the card's hover or focus
          within the group; pressed state in `tertiary`
        - The menu: Chakra `Menu` with the menu recipe's highlight; the "⋯" button 32px, 6px in from the poster's
          top-right corner, on a solid backing surface, visible at rest; "Review or log" passes `returnFocus` with the
          "⋯" button
        - The lock's rule and its explanation in one shared module the panel (4.1) also uses
        - Tests should now PASS

    - [ ] **3.1.e Clear the cards' allowance from the accessibility baseline**
        - Remove the `button-name` entries for `/browse` and `/search` from `e2e/axe-baseline.ts`, and the landing
          page's `/` entry and the Library's entries if the branch carries them by now; the reporter only logs an
          unmatched entry, so the removal is what proves the names
        - Run `e2e/phone-width.spec.ts`, which scans both routes signed in, against the browsable stack, with
          `e2e/sign-in.spec.ts` when the `/` entry goes and `e2e/library.spec.ts` when the Library's go

- [ ] **3.2 Every card has one height and shows the visitor's rating and watched mark — R1, R2, R5, R6, R7**

    **Goal:** Cards draw the poster first with no border and a fixed text block (title, year and score, stars line), so
    every card in a row is the same height signed in or out, and the browse grid's row estimate is computed from that
    height.

    - [ ] **3.2.a Write the layout cases in `MovieCard.test.tsx`**
        - The year ("Year unknown" without a date) replaces the long date; the stars line shows `RatingStars` ("Rated
          3.5 out of 5 stars" for 7) or nothing; the watched mark is one image named "Watched" when watched; neither
          shows with no record; the poster's link, the title's link and the score stay
        - A rerender with a changed `user_rating` or `user_watched` updates the stars line and the watched mark
        - Rewrite the date-formatting cases, and "memoizes expensive calculations" (it asserts the long date's month),
          to the year
        - Expect tests to FAIL initially

    - [ ] **3.2.b Write the row height cases in `collection/__tests__/grids/VirtualizedMovieGrid.test.tsx`**
        - `estimateSize` equals `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT` (criterion 11); the gap assertion stays at `GAP`;
          the mocked rows take the new height
        - Expect tests to FAIL initially

    - [ ] **3.2.c Rebuild the card's text block and compute the row height**
        - `CARD_TEXT_HEIGHT` in `gridConstants.ts`, sized for the two-line title, the year line and the stars line;
          `ROW_HEIGHT` in `VirtualizedMovieGrid.tsx` computed from it; the borders of `MovieCard` and
          `MovieCardContainer` go; the shadow, the poster's scale and the accent line stay
        - `GridSkeletonLoader`'s placeholder cards take the new height
        - Every page that draws `MovieCard` keeps it at 138px or wider (R6)
        - Tests should now PASS

    - [ ] **3.2.d Run `e2e/browse.spec.ts` and `e2e/back-to-results.spec.ts` against the browsable stack**

### **Phase 4:** The film page tracks the film and lists its log

- [ ] **4.1 The "Your film" panel's toggles, lock, Review and signed-out note — R9, R10, R11, R14, R15**

    **Goal:** On the film page, a signed-in visitor toggles Watched, Like and Watchlist and opens Review from one panel
    that can lay out as a row or a column, a locked Watched explains itself on use, and a signed-out visitor learns what
    an account adds without anything saving.

    - [ ] **4.1.a Write the panel's cases in `src/components/movie/tracking/__tests__/FilmPanel.test.tsx`**
        - Under the heading "Your film": Watched, Like and Watchlist buttons with icons and words and `aria-pressed`,
          each saving the opposite of its state; Review opens the dialog (inside `EntryDialogHost`) showing the film
          without "Change", with the date off
        - The lock: `aria-disabled`, the explanation as accessible description and as a `role="status"` note beneath
          the toggles when activated, no request (criterion 3)
        - Anonymous: the controls show and nothing saves; activating any shows the sign-in note with a "Sign in" link
          to `signInPathFor` with the page's path and query. Resolving: inert with `aria-disabled`, no note
          (criterion 7)
        - Expect tests to FAIL initially

    - [ ] **4.1.b Update `src/pages/movie/__tests__/MovieDetail.test.tsx`**
        - Rewrite "disables saves while …" to R15's behavior
        - Render signed in and find the panel's "Watchlist" (with `aria-pressed`, not "Add to Watchlist") in "replaces
          cached details and save controls when a refetch returns 404" (its `/to Watchlist/` absence check names the
          panel's "Watchlist" instead), "reads the movie once without requesting separate user state", "shows the
          payload's watchlist state", "keeps its save enabled and shows save toasts with Undo", and the film-page step
          of "shows a card save over a previously cached detail…"
        - `MovieDetail.headings.test.tsx` and `MovieDetail.styles.test.tsx` render the page with no auth or dialog
          provider and keep passing

    - [ ] **4.1.c Build `src/components/movie/tracking/FilmPanel.tsx` and place it in `MovieDetail`**
        - A `direction` prop for row or column, and `reviewRef`, a ref the panel sets on its Review button so the log can
          move focus there (4.4); on `MovieDetail` it replaces the "Your Actions" block where it stands, as a row that
          wraps on narrow screens, reading the film through `useUserMovieState` as the page does
        - The toggles use the button recipe's `subtle` variant with `selected` from the film's state (the styling
          strategy's toggle pattern) and `aria-pressed` from the same state, retiring the inline watchlist colors and
          their TODO
        - Tests should now PASS

    - [ ] **4.1.d Run `e2e/movie-detail.spec.ts` against the browsable stack**

- [ ] **4.2 The visitor rates the film from the panel, with the stars or a sheet — R12, R13**

    **Goal:** A pointer selection saves at once, keyboard changes save once after a 500ms pause or on leaving the stars,
    zero stars clears the rating as Clear rating does, and phones rate in a bottom sheet with touch-sized stars.

    - [ ] **4.2.a Write the rating's cases in `src/components/movie/tracking/__tests__/FilmRating.test.tsx`**
        - Criterion 10. At `md` and up: `RatingGroup` labelled "Your rating"; a pointer selection sends one save of
          stars × 2; arrowing across the stars sends one save after 500ms still, or on blur; arrowing to zero stars,
          like Clear rating, sends `user_rating: null` with the "Rating cleared" toast; Clear rating shows only while
          rated
        - Below `md`: `RatingStars` or "Not rated" with "Rate", which opens a bottom sheet titled "Your rating" holding
          the stars, Clear rating while rated, and Done, which only closes it; the sheet returns focus to "Rate"
        - Signed out, the stars take no value and show the panel's sign-in note (R15)
        - Expect tests to FAIL initially
    - [ ] **4.2.b Build `src/components/movie/tracking/FilmRating.tsx` inside the panel**
        - The wide and phone forms chosen by a breakpoint hook, not CSS, so one set renders; the sheet a Chakra
          `Drawer` placed at the bottom, each half-star at least 24px wide; filled stars in `imdb-gold`
        - Tests should now PASS

- [ ] **4.3 The film's log lists the visitor's entries — R16, R17**

    **Goal:** Beneath the panel, a signed-in visitor sees their entries for the film in the server's order, each with its
    date, rewatch mark, rating and the start of its review, with the latest three shown first.

    - [ ] **4.3.a Write the list's cases in `src/components/movie/tracking/__tests__/FilmLog.test.tsx`** (criterion 9)
        - Under "Your log": the server's order; "Nov 14, 2026" or "No date"; `RewatchIcon` for a rewatch; `RatingStars`
          at the small size; Edit and Delete named by position and date ("Edit entry 1, Nov 14, 2026", "Delete entry 3,
          undated"), unique for two entries on one date
        - Excerpts: a review over 280 characters cut back to its last space with an ellipsis and "Read more", which
          shows the whole review in place and becomes "Show less"; line breaks kept, plain text
        - The latest three, then "Show all ({count})" in place; no list without entries or signed out; placeholder rows
          while loading; "Couldn't load your log." with Retry
        - Expect tests to FAIL initially
    - [ ] **4.3.b Build `src/components/movie/tracking/FilmLog.tsx` and place it beneath the panel**
        - Reads `movieEntriesQuery` only for a signed-in visitor
        - Tests should now PASS

- [ ] **4.4 An entry is edited or deleted from the log — R18**

    **Goal:** Edit opens the dialog on that entry, and Delete asks first, removes the entry only on confirmation, updates
    the list and panel from the server's answer without a toast, and leaves focus on a sensible control.

    - [ ] **4.4.a Write the cases in `FilmLog.test.tsx`** (criterion 9)
        - Edit opens the dialog (inside `EntryDialogHost`) titled "Edit entry", with the entry's date, rating and
          review; Delete opens "Delete this entry?" with its text, Cancel and Delete, and sends the `DELETE` only on
          confirmation; no success toast
        - Focus moves to the next entry's Edit (the one above when the last was deleted), or, when none remain, to the
          element `fallbackFocus` returns (a stand-in button in this file)
        - In `MovieDetail.test.tsx`, deleting a film's only entry moves focus to the panel's Review
        - Expect tests to FAIL initially
    - [ ] **4.4.b Add Edit and Delete through `useEntryDialog` and `useMovieEntries().deleteEntry`**
        - `FilmLog` takes `fallbackFocus: () => HTMLElement | null`; `MovieDetail` passes one that reads the panel's
          `reviewRef` (4.1.c)
        - Tests should now PASS

- [ ] **4.5 ADR-048 records the controls, and the ADRs it supersedes say so — R40, R41b**

    **Goal:** ADR-048 (`Proposed`) records the decisions the PRD assigns it, and each ADR it supersedes in part names
    what in its Status.

    **Note:** Check `main` for the landing page first, as 2.1.a does, so ADR-046 is on the branch before it's cited; a
    merge here applies only what an early merge can (Implementation Notes, "Merges of `main`"). The landing page also
    rewrites ADR-044's Status line; whichever of the two merges second keeps both supersessions.

    - [ ] **4.5.a Write ADR-048 from the ADR template**
        - The card's controls on hover, focus and touch (D1); the dialog over the current page and its entry points
          (D7); feedback and Undo (D11 to D14); the film page's explanation for signed-out visitors (D18); the bar's
          Log and the drawer's "Log a film" (D20); cards without actions for signed-out visitors (D19), cited to
          ADR-046 if the branch carries it by then, recorded here otherwise (5.1.b re-cites it when the merge brings
          ADR-046)
        - Supersedes ADR-044 in part, only to add Log to the wide bar and "Log a film" to the drawer; with ADR-046 on
          the branch, also ADR-046's statements that the catalog's row spacing stays unchanged and that signed-out
          cards are shorter
    - [ ] **4.5.b Add the supersession to ADR-044's Status** (and ADR-046's, when it applies)

### **Phase 5:** The journey holds with `main` merged

_Exit criterion:_ criterion 1's journey test passes, and on the browsable stack the smoke specs pass with no
`button-name` baseline entry for `/browse` or `/search`, `phone-width.spec.ts` scanning both signed in.

- [ ] **5.1 Merge `main` and apply what it holds — R41**

    **Goal:** The branch carries `main` as it stands before the pull request, with each change R41 assigns to what
    `main` holds made and checked against `main`'s code at that merge.

    - [ ] **5.1.a Merge `main` into the branch** (the Owner approves the merge)

    - [ ] **5.1.b Apply each case that holds**
        - a. If the backend's schema changed, regenerate `frontend/openapi.json` and `frontend/src/types/api.ts`
        - b. The landing page: remove the `/` `button-name` entry where 3.1.e didn't already; move its card tests to the
          new controls where 3.1 didn't already ("Merges of `main`"); set the hero's line and the band's second point to
          R41b's copy; keep one form of the interceptor check and the request options, passing the picker's context
          through them; name both callers with their own context in the strategies, where 2.1.h didn't already; and,
          where 4.5 didn't already, cite ADR-046 in ADR-048 for cards without actions for signed-out visitors (D19),
          supersede ADR-046's statements on row spacing and shorter signed-out cards, and say so in ADR-046's Status;
          where the merge meets 4.5.b's edit to ADR-044's Status line, keep both supersessions
        - c. The Library pages: in the signed-in smoke spec (`library.spec.ts`), replace step 4, which removed the first
          fixture film from its card on `/watchlist`, with the dialog's steps: log that film from its card with today's
          date, a rating and a review, which takes it off the watchlist since it is logged on the day it joined, and see
          it leave the page; find the entry on the film's page; find the film in Films, `/library`, and History,
          `/library/history`. Step 1's add from a card, and the Watchlist page's test of a removal from a card, move to
          the new controls ("Merges of `main`"). Add a dated note to ADR-050 recording the dialog's steps. Add "Log a
          film" to the Films view's and History's empty states, calling `useEntryDialog().open({ dateOn: true,
          returnFocus })` with the current view's link in the Library's navigation, with tests that it opens the dialog
          on the picker and that focus lands on that link once the empty state has gone. Add Log to the bar items
          `phone-width.spec.ts` checks at 1024px (the Library's R1). Remove the Library's `button-name` entries where
          3.1.e didn't already. Tests this work adds that name the bar's catalog link call it Explore
        - d. The backend unit: the like rule changes nothing; the rewritten `saveMutationOptions` keeps filling
          `time_zone` on record saves and its test stays; every record-save body this work's tests assert exactly gains
          it, as "Merges of `main`" says, and the watchlist tests keep the expected bodies `main` gives them (1.1.b)
        - Record in this task which cases held; a case that doesn't hold is noted as such

    - [ ] **5.1.c Run the tests and specs the applied cases touch**

- [ ] **5.2 The tracking journey runs as one integration test — R2, R3, R16, R19, R21, R22, R29, R32**

    **Goal:** One test walks criterion 1's journey through the app's real routes, signed in, from a card's watchlist
    control to two logged entries on the film's page.

    - Write `frontend/tests/integration/tracking-journey.test.tsx`: render `<App />` at `/browse` as
      `src/__tests__/App.test.tsx` does (`ThemeSelectProvider`, `TestProviders`, the location aligned with history),
      with `<Toaster />`, signed in, MSW answering each step in turn with the records and lists the server returns
    - A probe on this branch showed that under `<App />` in jsdom the real grid draws cards at `/browse` without
      mocking the virtualizer, and role queries reach `WideNavBar` but not the phone bar, so the journey presses the
      wide bar's Log; stub `matchMedia` to answer yes for `(hover: hover)` for the card's hover group
    - The steps and checks are criterion 1's, in its order
    - It passes on arrival; show it failing against a narrow break (for example the watchlist rule's description
      dropped), then passing restored

- [ ] **5.3 Check the journey and the signed-in scans**

    **Goal:** The segment's exit criterion is shown on this branch after `main`'s merge, with what ran and the result
    recorded here.

    - Run `tests/integration/tracking-journey.test.tsx`
    - Run `e2e/phone-width.spec.ts`, `e2e/sign-in.spec.ts`, `e2e/browse.spec.ts`, `e2e/back-to-results.spec.ts` and
      `e2e/movie-detail.spec.ts` against the worktree's browsable stack, with any spec 5.1 added

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; ADR-048 and
  ADR-049 set `Accepted` before merge; criterion 14 proven in the browser before review; after any later merge of
  `main`, R41 rechecked and the API types regenerated if its schema changed)

## Implementation Notes

- **Pointer kind and breakpoints in tests.** `tests/setup.ts` stubs `window.matchMedia` to answer no to every query,
  so a card renders the "⋯" menu (`(hover: hover)` false) and breakpoint hooks resolve to their base value (phones).
  Tests choose the pointer kind or a wide layout by stubbing `matchMedia` for that query. One set of controls renders at
  a time (D1), so a test never sees two copies.
- **Signed in, in tests.** Store a token from `tests/helpers/auth.ts` and call `authHandlers()`, as
  `MovieDetail.test.tsx` does, then render under `AuthContextProvider`. No default MSW handler serves record saves or
  entry routes; each test answers with the records its case needs.
- **The landing page's overlap.** `technical/landing-page` has committed the same read-path change R27 asks for:
  `!config.headers.has("X-Pagination-Context")` in the interceptor, and `ReadOptions = Pick<AxiosRequestConfig,
  "headers" | "shouldReportServerError">` passed through `getPaginated` and `fetchPaginatedMovies`, with a second
  context in `paginationContext.ts`. It also renders `MovieCard`'s footer only while signed in, adds a `/`
  `button-name` baseline entry and keeps Home's row cards at `minW="138px"`. If it hasn't merged when 2.1 starts, write
  the same form so the second merge keeps one. It touches `MovieCard.tsx` and `axe-baseline.ts` too, and its
  `Home.test.tsx` and `WatchlistSection.test.tsx` press today's card buttons, so 3.1 checks `main` again.
- **Merges of `main`.** A merge of `main` before 5.1 (at 2.1.a, 3.1 or 4.5) keeps the branch's tests green and applies
  only what its inputs allow then: the API types if the schema changed (5.1.b's case a), one form of the read path (case
  b), the `time_zone` below (case d), and the card tests below. The `/` and the Library's `button-name` entries cover
  today's unnamed card buttons, so 3.1.e removes those the branch carries by then; everything else 5.1.b lists waits for
  5.1.b, which applies each case that holds. Two reach tests this work writes before 5.1:
    - **Card tests elsewhere.** After the merge, `git grep -inE "add to watchlist|remove from watchlist" -- frontend/src
      frontend/e2e frontend/tests` and move every hit that presses or looks for a card's control (the film page's own
      hits are 4.1.b's). Before 3.1 they still pass and 3.1.c moves them; after it, the merge moves them. The landing
      page's: `Home.test.tsx`'s "holds the nothing-saved set after a first save and shows the watchlist on the next
      visit" and `WatchlistSection.test.tsx`'s "updates the leading film and removes saved films through real card
      saves" stub `(hover: hover)` and press "Watchlist" in the card's "Your actions for {title}" group, telling adding
      from removing by `aria-pressed`; `Home.test.tsx`'s "composes signed-out Home in order with named sections and no
      card actions" asserts the row has no "Your actions for {title}" group and no "Actions for {title}" button. The
      Library's: `library.spec.ts`'s step 1, its step 4 until 5.1.b(c) replaces it, and its Watchlist page test of a
      removal from a card.
    - **The backend unit's `time_zone`.** The save layer fills it on every record save, so it joins every record-save
      body this work's tests assert exactly (1.1.a, 2.3.b, 2.4.a, 3.1, 4.1, 4.2, the moved `MovieCard` and
      `MovieDetail` cases, and 5.2), asserted as `main`'s own test asserts it. Where the merge conflicts in a test 3.1.c
      or 4.1.b moved, keep this branch's side and add the field.
- **Undo after unmount.** `saveMutationOptions`' watchlist Undo builds a `MutationObserver` from the options, so it
  runs after the card or dialog that saved has gone; the dialog's Undo does the same with `entryMutationOptions`. Each
  checks `getChangeCount()` first, and toasts take their IDs from `createSaveToastId()` so a change of user removes
  them.
- **Focus return.** Ark's dialog reads `finalFocusEl` when it closes, so the host returns focus to the opener while it
  is still connected, and otherwise to the element `returnFocus` gives. A menu item and the drawer's button unmount as
  their menu or drawer closes, so their entry points pass the control that survives (the "⋯" button, "Open menu").
- **Tests that open the dialog.** `useEntryDialog()` outside a host throws only when `open` is called, so a component
  that holds an entry point renders under the existing wrappers. A test that opens the dialog renders its subject
  inside `EntryDialogHost`, answers `movieEntriesQuery` through MSW, and asserts what the dialog shows (its title, the
  film, the date switch), not the arguments `open` received.
- **The bar's film.** On `/movie/:id`, Log reads the film's query state from the cache (`movieDetailQuery`'s key) when
  it is pressed, so it sends no request of its own. It opens on the film only when that state is `success`; a pending
  read, a failure, or a refetch that answered 404 over cached data (which keeps the old data with an error status)
  falls back to the picker.
- **Dates.** Today in the visitor's time zone is the local calendar date, never `toISOString()`, which is UTC; entry
  writes already carry the time zone through `useMovieEntries`.
- **Ratings.** `RatingGroup` with `allowHalf` holds stars (0.5 to 5); the saved `user_rating` and an entry's `rating`
  are stars × 2. Zero stars counts as no rating everywhere.
- **Contrast.** The card controls' backing surfaces and pressed state use pairs `src/theme/color/contrast-checks.ts`
  already checks (for example `foreground` and `tertiary` over `popover`); a new pair is added there, and
  `npm run verify-contrast` covers every palette.
- **Tests that pass on arrival** are shown failing against a narrow break of the behavior, then passing restored, and
  the completion notes say so.
- **E2E runs** use the worktree's browsable stack (`node scripts/worktree.mjs browse`, `SITE_PORT` from
  `infrastructure/.env`) through `arc-offload`, as QUICK-REFERENCE shows.

## Success Criteria

**Implemented** criteria are checked locally and in CI. **Proven in the browser before review** is checked by hand on
the branch's local stack before the code review.

### Implemented

- [ ] 1. **The tracking journey.** An integration test renders the app's routes signed in, with MSW answering each step
  with the records and lists the server returns for it, and shows: adding a film to the watchlist from a card's hover
  control; logging it from the card's "Review or log" with today's date, three and a half stars and a review; the card
  then showing "Rated 3.5 out of 5 stars" and the watched mark, a "Logged" toast saying "Also removed from your
  watchlist." with Undo, `/watchlist` no longer listing the film, and the film's page listing the entry; adding it to
  the watchlist again from the panel; logging it from the bar's Log on the film page, with Rewatch on by default, a new
  rating and a new review; and then `/watchlist` no longer listing the film, the page listing two entries, each with
  its own rating and review, and the card showing the new rating.
- [ ] 2. **Touch.** With `(hover: none)`, a card shows the "⋯" button and no hover group; its menu's items save or open
  the dialog; a locked Watched item is `aria-disabled`, reachable with the arrow keys, changes nothing when chosen, and
  shows the lock's explanation. Closing a dialog opened from the menu returns focus to the "⋯" button.
- [ ] 3. **The lock.** A rated film, and a film with entries, show Watched locked on the card, in the menu and on the
  panel, with the explanation, and activating it sends no request. A film that is only liked shows Watched unlocked. A
  409 from an un-mark shows "Couldn't change Watched" with the server's reason.
- [~] 4. **Toasts and Undo.** _Superseded by criterion 15 (amendment, 2026-11-14)._ Tests show, for each row of R32, the
  title, the description and whether Undo is offered, and the Undo's request: liking an unwatched film on the watchlist
  sends `{ user_liked: false, user_watched: false, user_on_watchlist: true, undo: true }`; un-marking Watched on a liked
  film on the watchlist sends `{ user_watched: true, user_liked: true, user_on_watchlist: true, undo: true }`; Clear
  rating sends `{ user_rating: <earlier rating>, undo: true }`; a dialog save that created an entry offers Undo even
  when no film field changed, and sends its `DELETE` and then the save, and sends no save when the `DELETE` fails,
  including after the dialog has closed. Marking watched, liking and rating without a watchlist change show no toast.
  After a change of user, Undo sends nothing. `useUserMovieState`'s watchlist tests pass with their assertions
  unchanged, their mock answers keeping the payload's `user_watched`.
- [ ] 5. **The dialog.** Tests show each row of R22 sending its request; Save disabled until R23 holds; an edit with the
  switch off and no review refused with its message; an emptied rating on the third path sending `user_rating: null`;
  changing the film re-reading its list; Rewatch on by default for a same-day or earlier viewing and following the date
  for a new entry, and an edit keeping the entry's mark; a future or empty date refused with its message; with a review
  typed, closing asking to discard; and a change of page closing the dialog.
- [ ] 6. **The picker.** Tests show no request below two characters, one request after typing pauses, items with
  poster, title and year, each list state's text, and a choice reaching `onSelect`; a picker search carrying its own
  `X-Pagination-Context`, not the tab's, and `apiClient` keeping a caller's context; the combobox recipe's highlighted
  item has the solid `tertiary` fill.
- [ ] 7. **Signed out and resolving.** Cards render no controls while signed out or resolving; the panel's controls
  save nothing signed out and show the sign-in note with a link back to the page; while resolving they are inert with
  no note.
- [ ] 8. **The bar.** Log shows signed in on wide screens and opens the dialog on the picker, or on the film on a film
  page; the drawer's "Log a film" does the same on phones; neither shows signed out.
- [ ] 9. **The entries list.** Tests show the order, "No date", the rewatch icon, an excerpt with "Read more", "Show
  all", Edit opening the dialog on the entry, Delete asking first and sending the `DELETE` only on confirmation, unique
  button names for two entries on one date, and focus moving to the next entry's Edit after a delete.
- [ ] 10. **The rating control.** A pointer selection sends one save; arrowing across the stars sends one save after
  the pause; arrowing down to zero stars, like Clear rating, sends `user_rating: null`; on phones, Rate opens the sheet.
- [ ] 11. **The row height.** The browse grid's tests assert its row estimate equals `CARD_WIDTH × 1.5 +
  CARD_TEXT_HEIGHT` and its gap equals `GAP`.
- [ ] 12. **Accessibility.** `e2e/axe-baseline.ts` has no `button-name` entry for `/browse` or `/search`, and the smoke
  specs, which scan both routes signed in, pass.
- [ ] 13. **The documents.** ADR-048 and ADR-049 read `Accepted` with their dates; ADR-044's Status names what ADR-048
  supersedes; TECHNICAL-OVERVIEW's forms line and the component-styling strategy's highlight rule read as R40 says;
  `react-hook-form` 7 is in `frontend/package.json` and its lockfile.

### Proven in the browser before review

- [ ] 14. **The journey by hand.** On the branch's local stack, signed in, criterion 1's journey runs at 1280px wide
  with a mouse and with the keyboard alone, and at 390px with touch emulation, with `/watchlist` dropping the film after
  each log; a rendered card's height equals `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT`; and the card's controls read
  clearly over a light and a dark poster in each palette.

### Implemented, added by amendment

- [ ] 15. **Toasts and Undo.** Tests show, for each row of R32, the title, the description and whether Undo is
  offered, and the Undo's request: liking an unwatched film on the watchlist sends `{ user_liked: false, user_watched:
  false, user_on_watchlist: true, undo: true }`; un-marking Watched on a liked film on the watchlist sends `{
  user_watched: true, user_liked: true, user_on_watchlist: true, undo: true }`; Clear rating sends `{ user_rating:
  <earlier rating>, undo: true }`, each with `time_zone` beside these fields once R41d applies; a dialog save that
  created an entry offers Undo even when no film field changed, and sends its `DELETE` and then the save, and sends no
  save when the `DELETE` fails, including after the dialog has closed. Marking watched, liking and rating without a
  watchlist change show no toast. After a change of user, Undo sends nothing. `useUserMovieState`'s watchlist tests
  pass with their assertions unchanged by this work, their mock answers keeping the payload's `user_watched`.
