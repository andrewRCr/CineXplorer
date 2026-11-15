# Task List: User Movie Controls

**PRD:** `prd-user-movie-controls.md`
**Created:** 2026-11-14
**Branch:** `technical/user-movie-controls`
**Base Branch:** `main`
**Status:** Complete
**Completed:** 2026-11-15

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

- [x] **4.3.R Keep the film panel and log identities distinct**
    - The App journey exposed a duplicate sibling key (`550`) on the two components (run
      `0013437022dc46e5abe7578203b80f5b`). Prefix each component's film key so film changes still reset their state
      independently and React can distinguish the siblings.
    - All 42 related tests passed without that warning, including the App journey. Touched-file lint, formatting,
      type-check and the film-detail smoke passed (run `6f8ee20c25d942158cfd34a095177f88`).

- [x] **4.4 An entry is edited or deleted from the log — R18**

    **Goal:** Edit opens the dialog on that entry, and Delete asks first, removes the entry only on confirmation, updates
    the list and panel from the server's answer without a toast, and leaves focus on a sensible control.

    - [x] **4.4.a Cover editing, confirmed deletion and focus through the real dialog and MSW**
        - Ten new log cases cover Edit's date/rating/review/rewatch prefill, fixed film, confirmation copy, Cancel,
          next/previous/newly visible row focus, empty-log fallback, no success toast and a failed DELETE's retry.
          Held refreshes prove deletion and focus finish without waiting for GET; read failure keeps Retry usable;
          an older read is cancelled; a retired user's response cannot patch the next log or move focus.
        - Edit and all six initial delete cases failed before their controls were wired. Three held-refresh cases
          then failed until the successful response updated the entry cache. Narrow regressions failed all three
          refresh/cancellation/retirement cases (run `f9d9fd0d23ba4b6b90ebb0f95e63b3ed`), then were restored.
        - The detail-page only-entry case proves the panel takes the returned record and focus reaches Review. It
          failed with that fallback disconnected (run `8113f4f778604500a573f2e6d4789663`), then passed restored.
    - [x] **4.4.b Connect Edit and Delete to the shared entry hooks**
        - Edit calls `useEntryDialog`; `DeleteEntryConfirmation` uses the prescribed copy, Cancel and Delete.
          `useMovieEntries` applies a confirmed deletion and returned record to an existing film-log cache before
          its normal invalidations, under its ownership guard. It neither invents an absent list nor adds a fetch.
        - Deletion phases derive dialog closure from the rendered removal. The root survives an empty list;
          connected Edit refs select the next/previous row, otherwise `fallbackFocus` supplies Review. Ownership and
          mount guards protect asynchronous completion and focus. Cancel restores its opener; failure permits retry.
        - All 169 related tests, touched-file lint, format and type-check passed. Film-detail and phone smokes passed
          (run `8486f058264f45ed80046cfb43d83943`). Lint corrections replaced effect-driven closure and render-time
          ref reads with derived state; type corrections removed an unsupported role-query option.

- [x] **4.5 ADR-048 records the controls, and the ADRs it supersedes say so — R40, R41b**

    **Goal:** ADR-048 (`Proposed`) records the decisions the PRD assigns it, and each ADR it supersedes in part names
    what in its Status.

    - [x] **4.5.a Write ADR-048 from the ADR template**
        - Records capability-selected card actions, one dialog host and its entry points, server-derived feedback and
          selective Undo, the signed-out panel's explanation, cards without signed-out actions, and navigation's Log.
          Context and consequences explain the alternatives and costs without planning-history dependencies.
        - Fetched `main` remains `46ae700b`, already carried by the approved merge `ab48e577`. It has no ADR-046, so
          ADR-048 records signed-out card behavior directly; no landing-page supersession applies at this head.
    - [x] **4.5.b Add the partial supersession to ADR-044's Status**
        - Names only Log in the wide bar and "Log a film" in the phone drawer. Navigation links and the original
          decision body stay intact. Markdown lint passed.

### **Phase 5:** The journey holds with `main` merged

_Exit criterion:_ criterion 1's journey test passes, and on the browsable stack the smoke specs pass with no
`button-name` baseline entry for `/browse` or `/search`, `phone-width.spec.ts` scanning both signed in.

- [x] **5.1 Merge `main` and apply what it holds — R41**

    **Goal:** The branch carries `main` as it stands before the pull request, with each change R41 assigns to what
    `main` holds made and checked against `main`'s code at that merge.

    - [x] **5.1.a Confirm the carried `main`**
        - Fetched `main` is still `46ae700b`, already an ancestor through the explicitly approved merge `ab48e577`.
          No new merge was required or performed.
    - [x] **5.1.b Check each conditional integration case**
        - The backend and both generated API files match `main`; no schema regeneration applies. The later backend
          rule/time-zone case is absent: the record PATCH schema has no `time_zone` field.
        - Neither ADR-046/the landing page nor ADR-050/the Library pages is on this `main`. Their conditional copy,
          routing, smoke, empty-state and supersession edits do not apply. ADR-048 records signed-out cards directly.
    - [x] **5.1.c Check the applied footprint**
        - No conditional code changes were needed; this task records the ancestry and case audit. Markdown lint
          passed.

- [x] **5.2 The tracking journey runs as one integration test — R2, R3, R16, R19, R21, R22, R29, R32**

    **Goal:** One test walks criterion 1's journey through the app's real routes, signed in, from a card's watchlist
    control to two logged entries on the film's page.

    - Added `frontend/tests/integration/tracking-journey.test.tsx`, rendering the real App, grid, navigation and shared
      dialog under the theme/query providers. MSW supplies each completed record and ordered entry list.
    - The visitor watchlists a hover card, logs today's 3.5-star viewing and review, sees its watched mark and rating,
      the Logged/removed-from-watchlist feedback and Undo, an empty Watchlist, then the entry on the film page. They
      requeue from the panel and use the bar's Log for a same-day rewatch at five stars with another review. Both
      entries retain their own reviews and ratings; the Watchlist is empty and the card shows five stars.
    - Native history updates align the test environment's writable location. A local geometry adapter supplies layout
      boxes only inside the open, visibly rendered dialog, enabling its real focus trap and keyboard rating; jsdom
      otherwise supplies zero boxes. No component, virtualizer, hook or router is mocked.
    - The complete journey passes; suppressing only watchlist-removal feedback fails at its description (run
      `935c92cc3ee54e259b2f013e7e01a040`), then passes restored. All related tests, lint, formatting and type-check pass.
      The journey also exposed the sibling-key correction recorded in 4.3.R.

- [x] **5.3 Check the journey and the signed-in scans**

    **Goal:** The segment's exit criterion is shown on this branch after `main`'s merge, with what ran and the result
    recorded here.

    - On source head `658cb7b7`, the tracking-journey repeat passed (run `ca13e70b28174f169a5c2700d1f93154`).
    - All 10 tests across `phone-width.spec.ts`, `sign-in.spec.ts`, `browse.spec.ts`, `back-to-results.spec.ts` and
      `movie-detail.spec.ts` passed against the isolated browsable stack (run `ade247e80777401db1c9e9dab11c9179`). No
      additional spec was required by the conditional integration audit.
    - The phone spec scans signed-in browse and search. Their `button-name` baseline allowances are absent; the
      existing browse `aria-hidden-focus` baseline is unchanged. Markdown lint passes for this result record.

### **Phase 6:** Verification

- [x] **6.1 Verify the work**

    - Validated all 15 active criteria against the complete change and resulting tree; two criteria are superseded by
      approved amendments. The full verification checks and live browser/visual evidence passed.
    - Independent criteria verification covered the same complete subject, found no issues and left no unresolved
      evidence. Its fresh criterion-related and browser checks passed. Evidence for each criterion is recorded below.
    - ADR-048 and ADR-049 read Accepted (2026-11-15). PRD and task-list statuses are Complete.

    - [x] **6.1.a Cover the tracking journey in Chromium with mouse, keyboard and touch**
        - Added three two-log browser journeys at 1280px with mouse and keyboard, and 390px with touch. Real local
          authentication, record/entry writes and watchlist reads run with temporary verified users and stored movie
          fixtures; catalogue responses read persisted tracking state. Cleanup preserves the development account.
        - The journeys check watchlist removal, separate reviews and ratings, rewatch defaults, opener/fallback focus,
          measured card geometry and current rating after reload. Staging skips these fixture-mutating cases.
        - Full Chromium suite passes all 26 cases; the staging-target check skips all five new journey/rating cases.
          The initial touch journey failed on the half-star defect, then passed after its approved correction.
    - [x] **6.1.b Group pointer actions on a continuous backdrop and move tooltips above**
        - One solid `popover` bar backs transparent buttons; icons use `tertiary` on hover and retain pressed states.
          Tooltips open above the controls. ADR-048 records the grouping.
        - The original transparent group failed the browser surface assertion; the updated mouse journey checks the
          shared surface, all four hover colors and upper tooltip. Visual inspection covers both poster extremes in
          all five palettes and both color modes; related tests, lint, formatting and type checks pass.
    - [x] **6.1.c Correct half-star selection on the first pointer activation**
        - Shared `HalfStarRatingItem` resolves a completed click/tap against the item's midpoint, prevents the
          widget's whole-star overwrite and preserves focus, native keyboard stepping and disabled guards. The film
          panel discards its pending keyboard preview before an immediate pointer save; the dialog updates its form.
        - First-pointer mouse and touch regressions failed at 4 rather than 3.5 stars before the correction. The
          corrected panel/sheet persists half and whole stars after reload; the complete dialog journeys pass too.
          A cancelled touch is observed beyond the save debounce and remains unrated after reload. A narrow
          pointer-down-save reconstruction fails that cancellation assertion; restoring completed activation passes.
        - Full browser suite, related component/integration tests, type checks, ESLint and formatting pass.

    - [x] **6.1.d Resolve the independent verification companion and close verification**
        - Independent verification considered every active criterion and the complete 81-file subject, including
          required failure/recovery behavior and visual evidence. It found no issues or unresolved evidence.
        - Fresh checks passed 264 tests across 20 criterion-related files and 15 browser cases. The reviewed file
          hashes matched before and after the pass. No findings required a fix, deferral or further verification pass.

- [x] **6.2 Retire private entry drafts when authentication ownership ends**

    **Goal:** Private entry content disappears when its owner's session ends, including without navigation, and
    a pending submission cannot acquire a later user's ownership.

    - Each dialog opening retains its owner and existing ownership-abort signal. Retirement clears the form,
      retained entry, discard confirmation and focus references; callbacks remain bound to their opening.
      The form checks its immutable owner before queueing a write. Normal close/focus and same-owner saves retain
      their behavior.
    - New regressions failed before the correction for edit/new/discard retirement and a submit during ownership
      change. Removing the already-aborted guard failed the late-listener case; restoring it passes.
    - Related entry, authentication, session and integration checks pass all 248 tests across 13 files. All six
      affected browser cases pass, including the mouse/keyboard/touch journeys; frontend type checks, touched-file
      lint/format checks and documentation checks pass.

- [x] **6.3 Close card and browser verification gaps**

    **Goal:** Cards preserve their text-line layout throughout the supported width range, and tracking browser
    checks use semantic locators and accessibility audits at settled page, dialog and sheet states.

    - [x] **6.3.a Preserve minimum-width metadata and rating alignment**
        - The year can shrink and truncate on one line while retaining its full accessible text. A local-only
          controlled-width browser fixture compares unknown/known-year cards with score, watched and rating at
          138px and 194px. It failed on the unknown year's 42px versus 21px height before the fix, then passed.
          The fixture measures component geometry; the browse columns retain their fixed width.
    - [x] **6.3.b Audit tracking pages, entry dialogs and rating sheets**
        - The shared scanner runs after ready checks on login/home, the tracking pages, the entry dialog and phone
          rating-sheet states. Measured entrance-opacity failures led to a bounded wait for finite motion inside
          dialogs, alert dialogs and notification regions before one audit; motion, rules and baselines stay intact.
        - Before/after diagnostics show the rating dialog at opacity 0.08–0.17 during its entrance, then opacity 1
          with passing audits after settling. The complete 27-case Chromium suite and six local-fixture staging-skip
          cases pass; the latter uses the local URL and performs no staging-service access.
    - [x] **6.3.c Locate cards, radios and notification focus semantically**
        - Cards expose named article semantics. Journeys locate their card by role/name, select the checked or first
          radio by role, and read focus within a semantically located notification region. Keyboard-only traversal,
          opener/fallback focus, both logs, persistence and geometry assertions remain covered by the browser run.
        - All 131 related tests across seven files, frontend type checking, touched-file lint/format checks and
          documentation checks pass. Reference guidance records the geometry fixture and scoped motion readiness.

## Implementation Notes

- **Pointer kind and breakpoints in tests.** `tests/setup.ts` stubs `window.matchMedia` to answer no to every query,
  so a card renders the "⋯" menu (`(hover: hover)` false) and breakpoint hooks resolve to their base value (phones).
  Tests choose the pointer kind or a wide layout by stubbing `matchMedia` for that query. One set of controls renders at
  a time (D1), so a test never sees two copies.
- **Signed in, in tests.** Store a token from `tests/helpers/auth.ts` and call `authHandlers()`, as
  `MovieDetail.test.tsx` does, then render under `AuthContextProvider`. No default MSW handler serves record saves or
  entry routes; each test answers with the records its case needs.
- **Independent pagination contexts.** `apiClient` preserves a caller's `X-Pagination-Context`;
  `ReadOptions = Pick<AxiosRequestConfig, "headers" | "shouldReportServerError">` passes through `getPaginated`,
  `fetchPaginatedMovies` and `searchMovies`. The picker supplies its own context, independently of the catalog lists.
- **Conditional integration boundaries.** The audit at `46ae700b` found no landing page, Library pages or later
  record-save time-zone field. The integration cases are defined in the PRD's R41. The test adaptation map identifies
  the affected cases without making their presence part of this delivery:
    - **Card controls.** `Home.test.tsx`'s first-save composition and `WatchlistSection.test.tsx`'s real-card saves use
      `(hover: hover)`, scope Watchlist to the film's action group and distinguish state with `aria-pressed`.
      Signed-out Home asserts neither a named action group nor a touch trigger. Library coverage includes the
      Watchlist page's removal case and the card actions in `library.spec.ts`.
    - **Record-save time zone.** The conditional field belongs beside the exact save-body assertions in feedback,
      dialog, card, panel/rating, detail and journey tests. Entry writes already supply the visitor's time zone.
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
- **Ratings.** `RatingGroup` supplies half-step keyboard input; `HalfStarRatingItem` resolves completed pointer
  activation from the item's midpoint. Displayed stars (0.5 to 5) convert to stored points by multiplying by two.
  Zero stars counts as no rating. Pointer selection cancels the panel's pending keyboard preview before saving.
- **Contrast.** Card controls use existing checked token pairs (`foreground` and `tertiary` over `popover`).
  The palette contrast check and visual poster inspection cover the shared backing surface and pressed colors.

## Success Criteria

**Implemented** criteria are checked locally and in CI. Criterion 16 supplies browser interaction and geometry
proof; criterion 17 is checked visually on the branch's local stack before code review.

### Implemented

- [x] 1. **The tracking journey.** An integration test renders the app's routes signed in, with MSW answering each step
  with the records and lists the server returns for it, and shows: adding a film to the watchlist from a card's hover
  control; logging it from the card's "Review or log" with today's date, three and a half stars and a review; the card
  then showing "Rated 3.5 out of 5 stars" and the watched mark, a "Logged" toast saying "Also removed from your
  watchlist." with Undo, `/watchlist` no longer listing the film, and the film's page listing the entry; adding it to
  the watchlist again from the panel; logging it from the bar's Log on the film page, with Rewatch on by default, a new
  rating and a new review; and then `/watchlist` no longer listing the film, the page listing two entries, each with
  its own rating and review, and the card showing the new rating.
- [x] 2. **Touch.** With `(hover: none)`, a card shows the "⋯" button and no hover group; its menu's items save or open
  the dialog; a locked Watched item is `aria-disabled`, reachable with the arrow keys, changes nothing when chosen, and
  shows the lock's explanation. Closing a dialog opened from the menu returns focus to the "⋯" button.
- [x] 3. **The lock.** A rated film, and a film with entries, show Watched locked on the card, in the menu and on the
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
- [x] 5. **The dialog.** Tests show each row of R22 sending its request; Save disabled until R23 holds; an edit with the
  switch off and no review refused with its message; an emptied rating on the third path sending `user_rating: null`;
  changing the film re-reading its list; Rewatch on by default for a same-day or earlier viewing and following the date
  for a new entry, and an edit keeping the entry's mark; a future or empty date refused with its message; with a review
  typed, closing asking to discard; and a change of page closing the dialog.
- [x] 6. **The picker.** Tests show no request below two characters, one request after typing pauses, items with
  poster, title and year, each list state's text, and a choice reaching `onSelect`; a picker search carrying its own
  `X-Pagination-Context`, not the tab's, and `apiClient` keeping a caller's context; the combobox recipe's highlighted
  item has the solid `tertiary` fill.
- [x] 7. **Signed out and resolving.** Cards render no controls while signed out or resolving; the panel's controls
  save nothing signed out and show the sign-in note with a link back to the page; while resolving they are inert with
  no note.
- [x] 8. **The bar.** Log shows signed in on wide screens and opens the dialog on the picker, or on the film on a film
  page; the drawer's "Log a film" does the same on phones; neither shows signed out.
- [x] 9. **The entries list.** Tests show the order, "No date", the rewatch icon, an excerpt with "Read more", "Show
  all", Edit opening the dialog on the entry, Delete asking first and sending the `DELETE` only on confirmation, unique
  button names for two entries on one date, and focus moving to the next entry's Edit after a delete.
- [x] 10. **The rating control.** A pointer selection sends one save; arrowing across the stars sends one save after
  the pause; arrowing down to zero stars, like Clear rating, sends `user_rating: null`; on phones, Rate opens the sheet.
- [x] 11. **The row height.** The browse grid's tests assert its row estimate equals `CARD_WIDTH × 1.5 +
  CARD_TEXT_HEIGHT` and its gap equals `GAP`.
- [x] 12. **Accessibility.** `e2e/axe-baseline.ts` has no `button-name` entry for `/browse` or `/search`, and the smoke
  specs, which scan both routes signed in, pass.
- [x] 13. **The documents.** ADR-048 and ADR-049 read `Accepted` with their dates; ADR-044's Status names what ADR-048
  supersedes; TECHNICAL-OVERVIEW's forms line and the component-styling strategy's highlight rule read as R40 says;
  `react-hook-form` 7 is in `frontend/package.json` and its lockfile.

### Proven in the browser before review

- [~] 14. **The journey by hand.** _Superseded by criteria 16 and 17 (amendment, 2026-11-14)._
  On the branch's local stack, signed in, criterion 1's journey runs at 1280px wide
  with a mouse and with the keyboard alone, and at 390px with touch emulation, with `/watchlist` dropping the film after
  each log; a rendered card's height equals `CARD_WIDTH × 1.5 + CARD_TEXT_HEIGHT`; and the card's controls read
  clearly over a light and a dark poster in each palette.

### Implemented, added by amendment

- [x] 15. **Toasts and Undo.** Tests show, for each row of R32, the title, the description and whether Undo is
  offered, and the Undo's request: liking an unwatched film on the watchlist sends `{ user_liked: false, user_watched:
  false, user_on_watchlist: true, undo: true }`; un-marking Watched on a liked film on the watchlist sends `{
  user_watched: true, user_liked: true, user_on_watchlist: true, undo: true }`; Clear rating sends `{ user_rating:
  <earlier rating>, undo: true }`, each with `time_zone` beside these fields once R41d applies; a dialog save that
  created an entry offers Undo even when no film field changed, and sends its `DELETE` and then the save, and sends no
  save when the `DELETE` fails, including after the dialog has closed. Marking watched, liking and rating without a
  watchlist change show no toast. After a change of user, Undo sends nothing. `useUserMovieState`'s watchlist tests
  pass with their assertions unchanged by this work, their mock answers keeping the payload's `user_watched`.

- [x] 16. **The tracking journey in a browser.** Playwright runs criterion 1's complete two-log journey against the local
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

- [x] 17. **Poster readability.** On the branch's local stack, the card's shared action bar and icons read clearly over
    a light and a dark poster in each palette.

### Verification evidence

Verification covered the complete work unit, including the browser journeys and rating corrections recorded in
Task 6.1. Fresh checks and source inspection supplied the evidence below. Independent verification covered the same
subject and all active criteria without findings.

| Criterion | Evidence                                                                                                                                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | The App/MSW tracking integration runs both same-day viewings, list changes and distinct reviews/ratings; the full frontend suite passed.                                                                                                                                                            |
| 2         | Card-control tests cover touch actions, reachable locked Watched and surviving-trigger focus; the touch browser journey restores focus after both entry points.                                                                                                                                     |
| 3         | Card/panel tests cover rating and entry locks, no save on activation and liked-only unlocking; the feedback test verifies the server's 409 reason and retained state.                                                                                                                               |
| 4         | Superseded by criterion 15 in the approved amendment.                                                                                                                                                                                                                                               |
| 5         | Form/host tests verify all four save paths, validity, date errors, prefill, film changes, rewatch defaults, discard confirmation and history closure.                                                                                                                                               |
| 6         | Picker/hook tests verify the minimum, debounce, states, compact items and selection; HTTP tests preserve explicit context; the recipe test verifies highlighted fill.                                                                                                                               |
| 7         | Card/panel tests exercise anonymous and resolving sessions, inert writes and the return-to-page sign-in link.                                                                                                                                                                                       |
| 8         | Bar/drawer tests verify picker and loaded-film entry points and signed-out absence; browser journeys operate both wide Log and the phone drawer.                                                                                                                                                    |
| 9         | Log tests cover server order, undated entries, excerpts, expansion, positional names, edit, confirmation, deletion failure and focus after confirmed removal.                                                                                                                                       |
| 10        | Rating tests retain one pointer save, debounced keyboard save, zero/Clear behavior and the phone sheet; browser regressions persist first-click/tap halves and whole stars.                                                                                                                         |
| 11        | The virtualizer test asserts the computed estimate and separate gap; Chromium measures the 194-by-419 card in every journey mode.                                                                                                                                                                   |
| 12        | Browse/search have no button-name baseline entries; the full Chromium suite passes, including signed-in phone scans on both routes.                                                                                                                                                                 |
| 13        | ADR-048/049 are Accepted (2026-11-15), ADR-044 names the partial supersession, the forms/highlight guidance agrees, and both dependency files contain React Hook Form 7.                                                                                                                            |
| 14        | Superseded by criteria 16 and 17 in the approved verification amendment.                                                                                                                                                                                                                            |
| 15        | Feedback and dialog tests cover title/description/silence, minimal Undo bodies, deletion-before-save, failure stopping and user-change guards; watchlist assertions are unchanged apart from whole-record answers. The conditional record-save time-zone change is absent from the integrated base. |
| 16        | All three local browser journeys pass with real writes and reads, isolated records, focus and reload checks; all five new cases skip on the staging target.                                                                                                                                         |
| 17        | Visually inspected five palette contact sheets, each showing light/dark modes over light/dark poster fixtures, with neutral and pressed icons. The solid shared bar keeps the icons readable in all 20 combinations.                                                                                |
