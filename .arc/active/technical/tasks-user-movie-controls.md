# Task List: User Movie Controls

**PRD:** `prd-user-movie-controls.md`
**Created:** 2026-11-14
**Branch:** `technical/user-movie-controls`
**Base Branch:** `main`
**Status:** In Progress

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

- [x] **1.1 A save's toast names what the visitor did and what the rules did, and offers Undo — R31, R32, R33, R35,
  R37**

    **Goal:** Watchlist toggles, saves whose answer shows a rule changed the watchlist or cleared a like, and Clear
    rating each toast with R32's title and description and an Undo that restores R33's fields, while plain watched,
    like and rating saves stay silent and a dialog's saves show no success toast of their own.

    - [x] **1.1.a Cover feedback, silence and Undo in `useUserMovieState.feedback.test.tsx`**
        - MSW responses exercise watched, like, rating, Clear rating and cleared-like feedback; Undo restores the
          differing fields with watched-rule companions. Watchlist titles follow the returned record, and unchanged
          saves offer no Undo. Silent saves retain error feedback; retired users cannot send Undo.
        - Six new behavior cases failed before implementation. A narrow reconstruction removing the silence and
          no-change guards failed seven further cases; restoring the guards passed all 42 save/ownership tests.

    - [x] **1.1.b Preserve the shipped watchlist assertions with whole-record answers**
        - The watchlist title and Undo fixtures retain the probe's watched state; assertions and request bodies stay
          unchanged.

    - [x] **1.1.c Compare the shown state with the returned record for feedback and Undo**
        - Saves carry `shown` and optional `silent`; `saveFeedback.ts` computes titles, rule descriptions, toast
          eligibility and the minimal restoration body. Undo runs through an independent mutation observer and
          remains guarded by user ownership. Its own feedback only reports changed watchlist membership.
        - Focused save/ownership tests, ESLint, Prettier and the frontend type check passed.

- [x] **1.2 A refused un-mark says why — R36**

    **Goal:** When the server answers 409 to un-marking Watched, the visitor reads "Couldn't change Watched" with the
    server's reason, and the control shows the film watched.

    - [x] **1.2.a Cover a refused un-mark in `useUserMovieState.feedback.test.tsx`**
        - The 409 case failed against generic feedback, then passed with the server's reason and the watched state
          retained. The existing watchlist and ordinary-save failure cases stay green.
    - [x] **1.2.b Read status and reason in `saveMutationOptions`' error handler**
        - Only a 409 while un-marking Watched uses "Couldn't change Watched" and the server reason. Other failures
          keep their shared titles and retry message. All 43 save/ownership tests, ESLint, format and type checks pass.

- [x] **1.3 Entry writes expose their mutation options — R38**

    **Goal:** An entry delete can run from a toast's Undo after the component that started it has unmounted, while
    `useMovieEntries` keeps its interface and its tests.

    - [x] **1.3.a Cover standalone deletion and ownership in `useMovieEntries.test.tsx`**
        - Without a mounted hook, a deletion queues behind a record save, updates the returned record, and refreshes
          Library, the film's entries and activity. An earlier user's write is refused before transport.
        - Narrow reconstructions without standalone deletion and without the ownership signal each failed their
          corresponding behavioral case; restoring both passed the new cases and the unchanged entry suite. Delete
          response fixtures include the deleted entry, checked against the generated response type.
    - [x] **1.3.b Export `entryMutationOptions(tmdbId)` and build the hook on it**
        - Extracted the shared write, invalidation and error options; the hook retains time-zone filling, retirement
          handling and its public interface. The related frontend run passed 268 tests across 14 files; ESLint,
          formatting and frontend type checking passed.

### **Phase 2:** A film is logged or reviewed from the bar

_Mode:_ `slice` — closes on the tracking journey running end to end (criterion 1), from the bar and the cards through
the film page.

- [x] **2.1 The picker finds films as the visitor types, under its own pagination context — R26, R27, R28, R40**

    **Goal:** Typing two or more characters in the "Film" combobox lists up to ten films with poster, title and year
    after a 300ms pause, reports a choice through `onSelect`, and never clears the search page's record of films shown.

    - [x] **2.1.a Fetch and check `main` and read-path overlap**
        - The landing page is not on `main`; no merge was needed. The shared interceptor and `ReadOptions` changes
          use its committed form, so whichever merges second keeps one implementation.
    - [x] **2.1.b Cover explicit pagination contexts and paginated request options**
        - Both new cases failed with rejected requests before implementation; all 33 API-client/HTTP-service cases
          passed afterward. The existing context case now names the catalog lists sharing the tab context.
    - [x] **2.1.c Carry caller options through the movie search read path**
        - `ReadOptions` carries headers and the error-reporting predicate. The interceptor preserves a caller's
          pagination context; paginated services and search forward it. The picker has its own per-page UUID.
    - [x] **2.1.d Cover the picker query through MSW and fake timers**
        - Covers the two-character minimum, trimming, 300ms debounce, first-page mapping to ten items, retained
          results and an independent stable context. A clear-and-retype case exposed an obsolete-query retry before
          the new debounce; it failed before the query's enable guard was corrected.
    - [x] **2.1.e Add `moviePickerQuery` and `useMoviePickerItems`**
        - The query owns search and mapping; the hook owns debounce, minimum and previous items. Fetching requires
          current trimmed text to match the debounced key, preventing obsolete requests after clearing and retyping.
    - [x] **2.1.f Cover picker selection, status messages and the highlight recipe**
        - Behavioral failures preceded the component and theme implementation. Keyboard and pointer choose a film;
          loading, empty and error states render and recover, posters have a placeholder and choices show a check.
          The recipe test compares computed highlight colors with independently resolved theme roles.
    - [x] **2.1.g Build `MoviePicker` and register the combobox recipe**
        - Uses Chakra's combobox and empty/loading contracts with named options, item indicators and semantic colors;
          generated the theme types. Corrected the new selection test to await popup closure.
        - The frontend suite passed 3,228 tests across 104 files. After the final debounce guard, all eight focused
          picker/recipe tests, full ESLint and frontend type checking passed; formatting and markdown lint passed.
    - [x] **2.1.h Document contexts and the combobox highlight**
        - Pagination and service-layer strategies distinguish catalog and picker contexts and optional read options.
          The styling strategy extends keyboard/pointer highlight and check-mark selection rules to comboboxes.

- [x] **2.2 One dialog opens over any page and gives focus back — R19, R20, R39**

    **Goal:** Any component under the app's layout, the bar included, can call `useEntryDialog().open(options)` to show
    one "Review or log" dialog over the current page, and closing it returns focus to the control that opened it, or to
    the nearest that remains.

    - [x] **2.2.a Cover host opening and focus return in `EntryDialogHost.test.tsx`**
        - Six cases failed before implementation: create/edit titles without navigation, focus to the opener or a
          surviving fallback, Escape, and a missing host reported only when `open` is called.
    - [x] **2.2.b Add the context, hook and shared host to `BaseLayout`**
        - The host wraps the bar and content on app and auth pages. It retains opener/fallback references through
          closing and uses Chakra's final-focus callback. Responsive dialog sizing is full screen below `md`,
          centered with a 560px maximum above it; surfaces use semantic colors.
        - The related run passed 16 tests across three files. Full ESLint, formatting and frontend type checking
          passed; the focus callback explicitly returns null when no fallback exists.

- [x] **2.3 The dialog starts from the film's log and saves what R22 says — R20, R21, R22, R23, R24, R40**

    **Goal:** Each row of R22 sends its request from a form prefilled per R21, Save enables only as R23 says, and
    changing the film re-reads its log and resets the rating, Liked and Rewatch while keeping the date and review.

    - [x] **2.3.a Add React Hook Form 7 and its lock entry**
        - Installed 7.92.0; npm reported no vulnerabilities. Existing authentication forms retain Formik.
    - [x] **2.3.b Cover prefill, validation, four save paths and draft retention through MSW**
        - Twelve coupled form cases failed before implementation. Additional cases prove review counting and length,
          zero-star clearing, progress, newer-save prefill and whitespace-only no-op edits. Narrow reconstructions
          without counting, zero normalization, progress and the save overlay failed their corresponding cases.
        - Covers local calendar dates, same-day rewatch defaults and visitor override, undated edits, read retry,
          changing films while retaining date/review, typed fields after a write failure and Cancel without a write.
    - [x] **2.3.c Build `EntryForm` with built-in validation and shared writes**
        - `EntryFormFields` separates widget bindings from prefill and submission; `entryFormValues` holds date and
          rewatch helpers. Record saves are silent, results include the shown state and title-owned fields, and writes
          remain bound to their invoking user. A semantic rating recipe fills whole and half stars in `imdb-gold`.
        - All 18 focused form/recipe tests and all 3,253 frontend tests across 107 files passed. Full ESLint,
          formatting, frontend type checking and documentation lint passed; theme types were regenerated.
    - [x] **2.3.d Write ADR-049 (`Proposed`) and update the forms overview**
        - Records React Hook Form for new and rewritten forms, built-in validation, and retaining Formik in existing
          sign-in, registration and password-recovery forms. The release source confirms Formik 2.4.9 in November
          2025; TECHNICAL-OVERVIEW names both libraries and their scope.

- [x] **2.4 Saving closes the dialog with one toast, and its Undo restores the film — R25, R31, R32, R34, R37**

    **Goal:** A dialog save shows its progress, closes on success with exactly one toast titled per R32, offers an Undo
    that deletes a created entry before restoring the film's fields, and leaves everything as typed on failure.

    - [x] **2.4.a Cover integrated save feedback, Undo and closing in `EntryDialogHost.test.tsx`**
        - Eighteen new behavior cases failed before integration. Covers all four titles with one toast, descriptions
          outside the title-owned fields, deletion before restoration, deletion-only Undo, failure stopping restoration,
          stale-user Undo, readied fields and drafts after failure, picker keyboard/pointer selection, discard choices
          for Cancel/Close/Escape, reopening after save or discard, and Back/Forward without a prompt.
        - A held save also proves progress and inert fields, then cancellation/reopening without its eventual answer
          closing or replacing the newer draft.
    - [x] **2.4.b Compose the form, feedback and shared mutation options in the host**
        - `entryDialogFeedback` compares shown/returned fields for descriptions and minimal Undo, deletes created
          entries through standalone options before restoration, and checks ownership between its asynchronous steps.
          Creation results require an entry ID in their type.
        - The host resets dirty state on each opening, asks before discarding a changed review, and closes on location
          changes. Opening IDs bind asynchronous completion to its own dialog while feedback still reports the save.
        - All 24 host tests and all 51 related tests across four files passed; full ESLint, formatting and frontend
          type checking passed.

- [x] **2.5 The bar's Log and the drawer's "Log a film" open the dialog — R29, R30**

    **Goal:** A signed-in visitor opens the dialog from the bar on any page, on the film when they are on its loaded
    page, and the bar holds no Log button for anyone else.

    - [x] **2.5.a Cover navigation logging entry points through the dialog**
        - Added cases for authenticated, anonymous and resolving visitors, ordering, picker defaults and focus return.
          Film-page cases cover success, pending, failure, 404 and failed refetch over cached data without another read.
        - Observed the new entry-point cases fail before implementation; visibility guards were narrowly reconstructed
          to show the negative cases failing, then restored.
    - [x] **2.5.b Add the wide bar and drawer buttons**
        - Shared opening logic reads the film query's current success state at activation. The drawer closes before
          opening the dialog and returns focus to its surviving trigger.
    - [x] **2.5.c Verify navigation in the browser**
        - All seven phone-width and sign-in smoke cases pass (run `a9979b69dd9a4619bcdc599636fefbab`). The signed-in
          1024px bar fits without overflow. All 53 related component tests, lint, type-check and formatting pass.
        - The first phone run failed contrast during the drawer's fade; a paused-animation diagnostic reproduced
          transient contrast failures and cleared them on completion. The approved fix waits for opacity 1 before
          scanning, retaining the contrast check without an exception.

### **Phase 3:** Cards carry the controls

- [x] **3.1 Signed-in visitors act from a card by pointer, keyboard or touch — R3, R4, R5, R8, R9, R19, R39**

    **Goal:** On a hover-capable pointer a signed-in visitor reveals a named group of four controls by hovering the
    card or tabbing into it, on touch a visible "⋯" menu holds the same actions, a locked Watched explains itself and
    sends nothing, and no one else sees a control.

    - [x] **3.1.a Cover pointer controls, the lock, authentication and refreshes**
        - Added `MovieCardControls.test.tsx` beside the existing large card suite: stable names and order outside the
          poster link, opposite-state saves, fixed-film logging, rating/entry locks, liked-only unlocking, all five
          refreshed record fields, anonymous/resolving visitors and hidden skeleton descendants.
    - [x] **3.1.b Cover touch actions and focus return**
        - All three checkbox actions save, close the menu and show the returned checked state when reopened. Keyboard
          navigation reaches locked Watched, whose activation saves nothing and keeps the explanation visible. Closing
          the logging dialog returns focus to the surviving menu trigger.
        - The behavior slices failed before implementation. Seven additional guard/refresh/menu reconstructions failed
          as expected (run `3030e802824f42fe9c91f6370cea401b`), then the source was restored.
    - [x] **3.1.c Move existing card-save composition cases to the new controls**
        - The queue, remount, rollback, page extension, post-unmount toast, Library invalidation and Undo cases now run
          authenticated on a hover-capable input. Stable Watchlist names are scoped to their film where needed. The
          detail-cache integration uses the same control.
    - [x] **3.1.d Replace footer actions with reusable pointer and touch controls**
        - `MovieCardActions` chooses controls through `useMediaQuery` without a server fallback. Pointer controls are
          28px with 6px gaps, revealed on card hover or group focus; touch uses a visible 32px menu trigger. Solid
          backing surfaces and pressed colors use existing checked token pairs, including an opaque locked control.
        - `watchedLock` shares the rule and explanation; the card memo compares all shown record fields. Skeleton cards
          suppress controls explicitly.
    - [x] **3.1.e Remove the cards' accessibility allowances and check the merged surface**
        - Removed `/browse` and `/search` button-name allowances. This exposed pre-existing unnamed browse selects;
          their separate fix merged through PR #206 and was integrated from main in `ab48e577`.
        - Both phone and browse smoke specs pass without the button-name allowances (run
          `dc013d535f044723aad9458f463a8ce1`). All 178 related tests passed after integration; the final fixture/opacity
          refinement passed all 125 related cases, lint, type-check and formatting. The unsupported Testing Library
          `exact` option was corrected mechanically after type-check reported it.

- [x] **3.2 Every card has one height and shows the visitor's rating and watched mark — R1, R2, R5, R6, R7**

    **Goal:** Cards draw the poster first with no border and a fixed text block (title, year and score, stars line), so
    every card in a row is the same height signed in or out, and the browse grid's row estimate is computed from that
    height.

    - [x] **3.2.a Cover the year, rating and watched display**
        - Replaced long-date cases with exact year and unknown-year cases, preserving the title links and score.
          Added record presence/absence and refreshed rating/Watched cases; the display tests failed before the change.
        - The Watched image explicitly overrides Chakra's decorative icon default so its accessible name is exposed.
    - [x] **3.2.b Assert the computed row height and retain the separate gap**
        - The virtualizer's item-size assertion failed at 449px against the new 419px contract. Its mocked rows use the
          computed height and `GAP`; the gap assertion remains independent.
    - [x] **3.2.c Fix the text block and share its height with the virtualizer**
        - `CARD_TEXT_HEIGHT` is 128px, reserving two title lines, year/score/Watched and the stars line. With the 194px
          poster width, the row estimate is `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT` (419px), excluding the gap.
        - Removed both card borders; retained shadows, poster scale and the accent line. Cards have a 138px minimum;
          current collection grids keep their 194px columns. Skeletons inherit the same geometry.
    - [x] **3.2.d Check browse and restored navigation in the browser**
        - Both browse and back-to-results smokes pass (run `eb0faed15c3a4fa29943f3a061246ef2`). Rendered cards measure
          194×419px at 1280px and 390px viewports (run `7577d5eec6ed428dbce52f600bdab89f`).
        - All 163 related tests, touched-file lint, frontend type-check and formatting pass.

### **Phase 4:** The film page tracks the film and lists its log

- [x] **4.1 The "Your film" panel's toggles, lock, Review and signed-out note — R9, R10, R11, R14, R15**

    **Goal:** On the film page, a signed-in visitor toggles Watched, Like and Watchlist and opens Review from one panel
    that can lay out as a row or a column, a locked Watched explains itself on use, and a signed-out visitor learns what
    an account adds without anything saving.

    - [x] **4.1.a Cover the panel's actions, lock and authentication behavior**
        - Eleven cases cover both toggle directions, fixed-film Review with its date off, both lock conditions and
          their activation note, and all actions while anonymous or resolving. Anonymous actions show the exact
          sign-in note and return link; resolving actions stay inert without a note.
        - The initial eight cases failed before implementation. The three added off-toggle cases failed against a
          narrow always-on reconstruction (run `37e295054859466eaf415177707a0949`), then the source was restored.
    - [x] **4.1.b Update detail-page save and authentication integration cases**
        - Stable Watchlist names and pressed state replace the old action labels, including cached-404, single-read,
          payload, toast/Undo and card-to-detail composition cases. Authentication integration now asserts inert
          controls and anonymous sign-in guidance.
        - The heading and styling suites still render without auth or dialog providers and pass.
    - [x] **4.1.c Place the reusable film panel on the detail page**
        - `FilmPanel` replaces the old inline-colored actions with subtle selected toggles and Review, using the shared
          state and watched-lock rule. Its row/column prop and Review ref support later placement and focus return.
          The page keys it by film so activation notes reset on navigation.
    - [x] **4.1.d Check the detail flow**
        - All 50 related tests, touched-file lint, frontend type-check and formatting pass. The movie-detail smoke
          passes (run `b696a7b419c84a4d9e1d6816bf7a1545`).

- [x] **4.2 The visitor rates the film from the panel, with the stars or a sheet — R12, R13**

    **Goal:** A pointer selection saves at once, keyboard changes save once after a 500ms pause or on leaving the stars,
    zero stars clears the rating as Clear rating does, and phones rate in a bottom sheet with touch-sized stars.

    - [x] **4.2.a Cover rating interaction, ownership and rollback through the panel**
        - Seventeen MSW cases cover pointer conversion, the 500ms keyboard pause, internal and external blur, zero
          and Clear with feedback, mixed pointer/keyboard input, pending Clear, both phone states, focus return,
          unchanged Done, anonymous/resolving input, film/user/unmount retirement and refused-save rollback.
        - Coupled keyboard cases were written together. Phone cases failed before the sheet existed; mixed-input
          cases caught duplicate/stale saves from click/value-change ordering. A narrow reconstruction failed all
          seven auth, ownership, rollback and Done cases (run `8e096f116580429d9d788daa3f751daf`), then was restored.
          Both inert-star ARIA cases also failed before their explicit disabled state was added.
        - Fake clocks replace timeout functions only, keep the animation clock running, await focus transitions,
          and retain the fake clock through request settlement.
    - [x] **4.2.b Add `FilmRating` to the panel**
        - A breakpoint hook renders one form: inline stars at `md`, or the rating/Not rated with Rate below it.
          The bottom Drawer has 48px stars, Clear while rated and Done, returning focus to Rate.
        - One consuming flush serves timer, blur, sheet close and click; click flush waits until Chakra's value
          change settles. Preview resets when handed to the save layer, so rejected saves restore confirmed stars.
          Ownership/film guards and cleanup discard retired input. Inert controls show the panel's sign-in guidance
          only for anonymous visitors; whole and half stars use the existing gold recipe.
        - All 67 related tests, touched-file ESLint, formatting and type-check passed. Film-detail and phone smokes
          passed (run `7a20f757b22c41d398509b98daed6cf5`).

- [x] **4.3 The film's log lists the visitor's entries — R16, R17**

    **Goal:** Beneath the panel, a signed-in visitor sees their entries for the film in the server's order, each with its
    date, rewatch mark, rating and the start of its review, with the latest three shown first.

    - [x] **4.3.a Cover the log list and its placement through MSW**
        - Seven list cases cover server order, same-day and undated control names, dates, rewatch and rating display,
          three rows then Show all, word-boundary and unbroken-word excerpts, plain text with line breaks, expansion,
          the 280-character boundary, placeholders, an empty log, signed-out reads and Retry.
        - The initial list and page-placement cases failed before implementation. Four excerpt/loading/retry cases
          failed before those views existed. A narrow reconstruction failed all three boundary/empty/auth cases
          (run `fd7da4c306384404aeb63239058ff02c`), then was restored.
    - [x] **4.3.b Add `FilmLog` beneath the panel**
        - Uses `movieEntriesQuery` only while authenticated, preserves server order, and shows date, small rating
          stars, rewatch, a plain-text excerpt and positional Edit/Delete controls. Reviews expand independently;
          Show all reveals the remaining entries. Loading shows three placeholders; failure offers Retry; no entries
          or no signed-in visitor renders no log.
        - Added a detail-page placement case and empty-log responses for its existing signed-in fixtures. All 47
          related tests, touched-file lint, format and type-check passed; the film-detail smoke passed (run
          `875368ec71844cc58e3f0073a4af5067`). A lint correction replaced a direct DOM query in the plain-text test.

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
