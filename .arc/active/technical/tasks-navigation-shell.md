# Task List: Navigation Shell

**PRD:** `prd-navigation-shell.md`
**Created:** 2026-11-12
**Branch:** `technical/navigation-shell`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Replace the two-row bar and the sidebar with one top bar, present Browse, Now Playing and Upcoming as one
Films catalog whose header names what is showing, and keep the bar and footer in place while a page loads or fails.

## Scope

### Will Do

- Fix the shared theme sources that let Chakra's own colors reach the shell: focus outlines, the select indicator,
  input placeholders and expanded buttons, with two new contrast pairs
- One bar at every width (the wordmark, Films, the Library link, search, and Sign in or an account menu on Chakra's
  `Menu`), with a phone row, a drawer and an inline phone search below 1024px
- Remove the sidebar, the second row, links that lead nowhere and what they leave unused; one 65px `layout-navbar`;
  `/browse/sequential` in development builds only
- Loading and error boundaries in `BaseLayout` under a last-resort boundary above the router, and one `h1` per page
- The catalog's window tabs, its URL rules for each window, a header title composed from the selection, the filter
  bar's names and the home page's labels
- The smoke tier's sign-in spec, a phone-width spec and the axe baseline; the documentation R31 names; a new ADR

### Won't Do

- The Films hub, the landing page, the Library page, Log, the footer or the theme picker
- Search suggestions, a tablet layout, or the catalog's grid and data layer
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** The theme's shared sources draw theme roles

_Mode:_ `layer` — closes on the project's recipes and global styles naming theme roles where Chakra's own colors
reached the shell's pieces.

_Exit criterion:_ theme tests show the focus outlines, the select indicator, input placeholders and each variant's
expanded fill resolving to theme roles, and `npm run verify-contrast` passes with the two added pairs.

- [x] **1.1 Focus outlines draw `ring` in the button, checkbox and switch recipes — R29**

    **Goal:** A keyboard-focused button, checkbox or switch draws a 2px solid outline in `ring`, not in the text color
    the `outline` shorthand leaves today.

    - [x] **1.1.a Write the focus-outline tests**
        - Eight rendered keyboard-focus cases cover five button variants, default and outline checkboxes, and a
          switch, with contrasting text. All eight failed on the text-colored outline before the fix.
    - [x] **1.1.b Set each recipe's focus outline by width, style and color**
        - Explicit width and style preserve the ring color and offset in every recipe variant. All eight cases pass.

- [x] **1.2 The select indicator, input placeholders and expanded buttons take theme roles — R29**

    **Goal:** No select arrow, placeholder or expanded button in the app draws Chakra's `fg.*` or `colorPalette.*`
    colors.

    - [x] **1.2.a Write the tests**
        - Rendered indicator colors (enabled and disabled), global placeholder CSS and four expanded button variants
          failed before their fixes. The existing select border-focus behavior failed against a narrow temporary
          color change, then passed after restoration.
    - [x] **1.2.b Set the roles at their shared sources**
        - The fourth select slot styles the indicator without moving other slots; placeholders use `on-muted`;
          expanded buttons use their own pressed colors, with subtle using its hover colors and ghost transparent.

- [x] **1.3 The contrast check covers the error display's ring and the menu's highlight — R29**

    **Goal:** `npm run verify-contrast` holds `ring` on the alert's `destructive/10` tint over `background`, and
    `tertiary` on `popover`, at 3:1 in all five themes.

    - Both UI-threshold pairs are included. Contrast validation: 1,398 passed, 272 scoped out, zero failures.
    - Related recipes, contrast and certification checks: seven files, 1,592 tests passed. ESLint, Prettier, Chakra
      type generation and TypeScript checks passed.

### **Phase 2:** One bar at 1024px and wider

_Mode:_ `slice` — closes on one bar at every width, its drawer, phone search and account menu working, over pages that
each carry one `h1`.

- [x] **2.1 Sign in's target follows the visitor's page — R5**

    **Goal:** Sign in on any page points at a sign-in URL that returns there; on the sign-in pages, at one the sign-in
    page accepts.

    - [x] **2.1.a Write `signInPathFor` tests in `src/utilities/__tests__/returnPath.test.ts`**
        - Eleven fail-first cases cover a filtered app URL, login's safe and unsafe next values, and all sign-in
          pages with queries, mixed case and trailing slashes.
    - [x] **2.1.b Implement `signInPathFor(pathname, search)` in `src/utilities/returnPath.ts`**
        - Reuses `loginPathFor` and the existing safety policy. All 42 return-path tests, lint, formatting and
          TypeScript checks passed.

- [x] **2.2 One labelled search field serves the bar — R6, R29**

    **Goal:** The field is labelled "Search films", submits the trimmed query to `/search?query=`, ignores a blank
    one, and marks focus on its border only while the input has it.

    - [x] **2.2.a Write `SearchField` tests in `src/components/layout/navbar/__tests__/SearchField.test.tsx`**
        - Five fail-first cases exercise Enter/button submission, encoding, blank queries, autofocus/Escape and the
          rendered input/button focus styles, with observable submission and close callbacks.
    - [x] **2.2.b Implement `SearchField`, replacing `NavBarSearch`**
        - A labelled form uses `:has(input:focus-visible)` for its border. The bar and temporary sidebar use it.
          All five tests, lint, formatting and TypeScript passed. Both real-session sign-in smoke cases passed.

- [x] **2.3 The account control shows Sign in, holds its space, or opens the account menu — R3, R5, R29, R30**

    **Goal:** Signed out shows a Sign in link that returns to the page; resolving holds the space; signed in opens a
    two-item menu with menu roles, keyboard highlighting, and Escape back to its trigger.

    - [x] **2.3.a Write `AccountControl` tests, replacing `NavBarUserMenu.test.tsx`**
        - Five fail-first cases cover held session state, the sign-in return link, menu roles and keyboard focus,
          username truncation and theme colors, Profile navigation, and the real logout HTTP boundary.
    - [x] **2.3.b Implement `AccountControl` and its menu on Chakra's `Menu`**
        - Both bar rows use the new control; removed the hand-built menu and its item component. The two items are
          Profile and Sign out. The full username labels the trigger, with its text hidden below `lg`.
        - A browser axe failure exposed the decorative initial entering the visible label despite `aria-hidden`.
          Rendering it as generated decorative content preserves the full-username name and passes that check.
        - Five component tests, lint, formatting and TypeScript passed. All five smoke specs passed (six cases),
          including the updated menu sign-out steps and axe scans.

- [x] **2.4 The wide bar names its places and marks the current one — R1, R2, R4, R21, R28, R29, R30, R31**

    **Goal:** At 1024px and wider one 65px row, the page's banner, holds the wordmark, Films, the Library link for
    signed-in visitors, search and the account control, with the current place marked.

    - [x] **2.4.a Write the bar's tests and `catalogWindow`'s**
        - Rendered bar tests cover its landmark, decorative wordmark, all sign-in states, current-page marks,
          forbidden links, navigation notification and resolved theme/focus styles. Route tests cover case and
          trailing slashes, non-catalog paths, and fetcher agreement. Cases were seen failing against stubs; the
          null cases failed against a narrow overmatch before the implementation was restored.
    - [x] **2.4.b Rebuild the wide row of `NavBar` as its own component**
        - `WideNavBar`, `Wordmark` and `MainNavLinks` compose search and account controls. Films and authenticated
          Watchlist are the only main links. Removed the second row and its no-op action. The bar and layout token
          both use 65px; removed the two navbar foundation heights. The old phone row remains until 3.2.
    - [x] **2.4.c Bring `e2e/sign-in.spec.ts` to the bar**
        - Browser checks cover banner controls, its token-sized height, Watchlist, and the account trigger's computed
          keyboard ring. The banner assertion failed with a temporary missing landmark, then passed after
          restoration. Color assertions independently resolve the ring and wait for the existing CSS transition.
        - All five smoke specs (six cases) passed; related bar and route checks: six files, 57 tests passed. Lint,
          formatting, type generation, TypeScript and documentation lint passed.
    - [x] **2.4.d Update `strategy-component-styling.md`**
        - Documented the wordmark's keyboard ring, the bar links' colors/current-page underline, and the menu's
          solid accent highlight for keyboard and pointer navigation.

### **Phase 3:** The phone bar replaces the sidebar

- [x] **3.1 The drawer holds the bar's links — R2, R8, R29**

    **Goal:** Below 1024px a "Menu" drawer opened by "Open menu" lists Films and, signed in, the Library link, and
    closes on Escape, its close button or a chosen link, with focus back on the menu button.

    - [x] **3.1.a Write `NavDrawer` tests in `src/components/layout/navbar/__tests__/NavDrawer.test.tsx`**
        - Seven fail-first cases cover all auth states, current Films, Escape/close focus return, link navigation,
          and panel/header/backdrop/link theme roles. The keyboard style test supplies rectangles for the rendered
          controls, since jsdom has no layout, and waits for Chakra's asynchronous initial focus.
    - [x] **3.1.b Implement `NavDrawer` on Chakra's `Drawer`**
        - Its trigger owns focus return; column `MainNavLinks` closes it on navigation. Replaced the phone row's old
          menu trigger. All seven cases passed with lint, formatting and TypeScript checks.
        - Shell shadows retain the bar's existing `base` and the menu/drawer recipe defaults, as the Non-Goals require.

- [x] **3.2 The phone row and its search — R7, R9**

    **Goal:** Below 1024px the row holds the menu button, the wordmark, a search button and the account control, and
    an open search takes the row's place until Escape, Close search or a submitted query.

    - [x] **3.2.a Write the phone row's tests**
        - Five fail-first cases cover its named controls, input autofocus, hidden/unmounted row controls and Tab
          order, both close actions with focus return, and query submission.
    - [x] **3.2.b Implement the phone row**
        - `PhoneNavBar` composes the shared controls; its search replaces the row and restores focus on close.
          `NavBar` switches rows through CSS at `lg`. All 38 navbar tests, lint, formatting and TypeScript passed.

- [x] **3.3 The sidebar, its drawer and the links that lead nowhere go — R10, R11, R28, R31**

    **Goal:** Nothing in `frontend/src` reaches the sidebar, `useSidebar`, the navigation constants or their tokens,
    and production builds serve no development routes.

    - [x] **3.3.a Remove the sidebar and what only it used**
        - Removed the four sidebar modules, old mobile trigger, hook and navigation constants. The app's content now
          takes the full container; the shared layout no longer mounts the overlay viewport. Removed unused route
          names, unrouted constants and the sidebar dimensions/z-index, including debug readouts and diagram.
        - Criterion 10's source search finds no removed names; the navbar retains its one 65px value.
    - [x] **3.3.b Register `/browse/sequential` only in development builds**
        - Guarded its lazy import and route. The production build passed and emitted zero BrowseSequential chunks.
    - [x] **3.3.c Update `strategy-layout-tokens.md`**
        - The guide uses the single 65px bar, its phone/wide rows and current token names/stacking values, with the
          full-width content diagram and no sidebar examples.
        - Full frontend run: 83 files, 2,744 tests passed. All five smoke specs (six cases), touched-source lint,
          formatting, type generation, TypeScript, build and documentation lint passed.

- [x] **3.4 A phone-width spec drives the bar at 360×800 — R30, R31**

    **Goal:** The smoke tier shows, in both targets, every bar control fitting a 360px phone, signed out and in, and
    the drawer, search and account menu working there.

    - [x] **3.4.a Write `e2e/phone-width.spec.ts`**
        - Measures every whole bar control and token height signed out/in, checks the hidden username, drawer
          links/Escape/focus return, Films navigation, search submission and the two account items. Scans all reached
          pages and the open drawer. Local search uses a generated-type catalogue fixture; the spec also runs in
          staging's existing target. Its missing-phone-row assertion failed against a narrow visibility break.
        - The search ready check waits for the result count's loading-opacity transition to finish before axe.
          A local image inspection confirmed the decorative avatar initial remains visible at phone width.
    - [x] **3.4.b Clear the sidebar's axe baseline entries**
        - Removed all six sidebar entries. Added only `/search`'s observed unnamed movie-card buttons, which are
          outside the shell scope. All six specs (seven cases) passed locally, including every axe scan.
    - [x] **3.4.c Describe a six-spec tier**
        - Updated the testing and quality-gate strategies, technical overview and quick reference with six specs and
          the 360×800 phone shell beside the 1280×800 flows. Lint, formatting, TypeScript and documentation lint passed.

### **Phase 4:** Pages load, fail and title themselves inside the shell

_Exit criterion:_ at 1280×800 and 360×800, `sign-in.spec.ts` and the phone-width spec pass: every bar control in
view at `layout-navbar`'s height, the drawer, the phone search and the account menu opening and closing, the axe scans
passing without the sidebar's entries, and one `h1` on each page they reach.

- [x] **4.1 The content area holds loading and errors — R12, R13, R14, R15, R16, R17, R29**

    **Goal:** A loading or failing page shows its state between a working bar and footer, a failed page clears on
    navigation without remounting the content area, and a failure in the shell itself still gets a full-page display.

    - [x] **4.1.a Write the content area's tests in `src/components/layout/__tests__/BaseLayout.test.tsx`**
        - Eight cases cover error placement and usable navigation, query reset, retry, kept state across path/query,
          lazy loading with both OAuth providers, one overlay dismissal, and the resolved separator color.
        - New behaviors failed before implementation. Kept state failed against temporary path and query keys, then
          passed after restoration; the real footer and theme provider participate in these tests.
    - [x] **4.1.b Write the app-level tests in `src/__tests__/App.test.tsx`**
        - A throwing overlay-dismissal callback exercises the outer shell boundary without mocking a project module.
          The protected development page retains a page-level lazy fallback. Each passed initially, failed with its
          narrow guard/fallback break, and passed after restoration.
    - [x] **4.1.c Move the boundaries into the shell**
        - `BaseLayout` keeps bar/footer around a flexible content area with error and Suspense boundaries. A reset
          prop clears errors on path/query changes without a React key. The error heading is an `h1` and its
          separator uses `border-subtle-01`.
        - The bar dismisses the preload overlay once per mount; provider loading shows inside the shell. The outer
          app boundary remains, and `/testlogin` uses the layout-mode fallback. Removed `LoadingLayout`.
        - Eight related test files, 56 cases passed; desktop/phone smoke: three cases passed. Lint, formatting and
          TypeScript checks passed.

- [x] **4.2 Each page in the shell has one `h1` — R12, R30**

    **Goal:** Every page state R12 lists shows exactly one `h1`, its own title, and the loading states that show no
    title show none.

    - [x] **4.2.a Write the heading tests**
        - HTTP-based `MovieDetail.headings.test.tsx` covers loaded, 404, 503 and held loading states, leaving the
          legacy mocked back-link tests untouched. Extended watchlist/reset/login/guard tests and added registration
          coverage. All missing headings failed first; temporary loading headings proved the no-heading cases fail.
    - [x] **4.2.b Give each page its `h1`**
        - Movie detail's title and both failures use `h1`. Watchlist keeps its title above all four states; password
          reset titles use `h1`; sign-in and registration have visually hidden titles outside OAuth loading.
    - [x] **4.2.c Assert one `h1` on each page the smoke specs scan**
        - `scanPage` requires exactly one `h1`, including visually hidden titles and the page behind an open drawer.
          The assertion failed on the old sign-in form, then passed with the heading.
        - Related pages: eight files, 54 tests passed; the protected-route and page checks also passed. All six
          smoke specs (seven cases), lint, formatting and TypeScript passed.

- [x] **4.3 Check the shell at both widths — R30**

    **Goal:** The exit criterion holds in a real browser: the bar, its drawer, search and menu at 1280×800 and
    360×800, with axe and one `h1` on each page.

    - The same six-spec run passed the two 1280×800 sign-in cases and the 360×800 phone case, including bar heights,
      whole-control bounds, drawer/search/account interaction, axe and exactly one `h1` per scanned page.

### **Phase 5:** Films: one catalog that names what it shows

_Mode:_ `slice` — closes on the three lists as one catalog, with window tabs and a header that names what is showing.

_Exit criterion:_ against the browsable stack, `browse.spec.ts`, `back-to-results.spec.ts` and `movie-detail.spec.ts`
pass with the catalog's URLs and saved `scroll-` keys unchanged, `/browse` shows "Popular films" above its three
window tabs, and the phone-width spec follows Films there.

- [x] **5.1 The header's title names what is showing — R23, R24, R25, R26**

    **Goal:** One function gives every catalog title R23 to R25 define, exactly as written, from the window and the
    request's sort, language, genres and years.

    - [x] **5.1.a Write `catalogTitle` tests in `src/utilities/__tests__/catalogTitle.test.ts`**
        - All 76 cases failed against a behavior stub. Coverage includes every offered table row, every genre's
          wording, language/genre composition, unknown labels and sorts, three-genre suppression, year forms and
          invalid bounds, omitted window years, and the written examples. Unoffered language-free A-to-Z rows are
          normalized by the existing caller rule rather than exposed as a title choice.
    - [x] **5.1.b Implement `catalogTitle(window, browseParams)` in `src/utilities/catalogTitle.ts`**
        - A table names the window/order; labelled selection words and years fill it. `readYearBounds`, extracted
          from the request mapper, keeps the title's parsed bounds and the outgoing dates aligned.
        - Six related test files, 104 cases passed. Lint, formatting and TypeScript checks passed.

- [x] **5.2 A window ignores what it fixes — R21**

    **Goal:** However a visitor reaches In theaters or Coming soon, neither the request nor the URL carries years,
    nor Coming soon a Highest rated sort, and the URL is replaced rather than pushed.

    - [x] **5.2.a Write the window rule's tests in `Browse.test.tsx`**
        - Real routed layouts under StrictMode and MSW cover both windows' years, Coming soon's rating sort alone
          and with years, first-request parameters, retained genres and Back returning to the prior entry. These
          four cases failed before implementation. All films' retained years failed against a narrow overmatch.
    - [x] **5.2.b Implement the rule in `useMovieCollectionState`, beside the A to Z reset**
        - The layout passes `catalogWindow`'s window; the hook renders corrected parameters before fetching and
          replaces all fixed fields together, alongside the title-sort rule.
        - Four related files, 50 tests passed; browse and filtered-detail smoke cases passed. Lint, formatting and
          TypeScript checks passed.

- [x] **5.3 The windows are tabs under a header that stays in every state — R18, R19, R20, R23, R29**

    **Goal:** The catalog shows its composed title above three window tabs while results load, are empty or fail,
    and switching tabs keeps the filters that still apply.

    - [x] **5.3.a Write the header and tab tests**
        - Routed HTTP cases cover all three links, current-window marking, preserved applicable filters, titles and
          counts in loading/loaded/empty/failed states, search without tabs, and resolved theme and keyboard colors.
        - Added public-props `GridHeader` tests and routed sequential cases rather than extending the older grid
          tests' internal mocks. Narrow temporary breaks proved the existing sequential title and hidden controls.
        - Related tests: 61 passed across six files, including both existing grid suites; lint, format and types pass.
        - A further mounted-layout case checks Coming soon's first HTTP request, simultaneous year/sort resets,
          retained filters and Back to the original All films URL. It failed with a temporary push replacing the
          URL writer's replace, then passed after restoration; all 20 routed Browse cases, lint, format and types pass.

    - [x] **5.3.b Implement the tabs and the header**
        - The layout composes window titles from normalized selection; search retains its object title and the
          sequential page retains Browse. Context now expresses both title shapes without a cast.
        - Three Release windows links sit beneath the persistent title. Count and pagination visibility remain
          separate, preserving sequential controls and the existing scroll behavior.

    - [x] **5.3.c Assert the catalog's header in `e2e/browse.spec.ts`**
        - The spec checks Popular films, the three window links and the current link; a temporary wrong title
          demonstrated its failure. Browse, Back to Results, movie detail and phone specs all pass (four cases).

- [x] **5.4 The filter bar and the home page use the catalog's names — R22, R27, R29, R30**

    **Goal:** The filter bar and the home page name the windows as the tabs do, and the advanced-filters toggle is
    named, reports its state and takes the button ring.

    - [x] **5.4.a Write the tests**
        - Fail-first cases cover the two disabled year labels, the Film filters landmark, the named advanced toggle
          with changing expansion state and resolved keyboard ring/border colors, and all three home-page targets.
        - Related tests: 95 passed across eight files; lint, format and types pass after removing an unsupported
          option from a new role query. All six smoke specs pass (seven cases), including the four required by 5.6.

    - [x] **5.4.b Rename and fix them**
        - Year labels and home buttons use the catalog's window names; the home section is Films. The filter bar is
          Film filters, and Advanced filters exposes its panel state and inherits the shared button focus recipe.
        - The browse button-name baseline now describes only the cards' unnamed icon buttons.

- [ ] **5.5 The decision record and the README describe the shell — R31**

    **Goal:** A new ADR records the bar and the one catalog, ADR-002 and ADR-039 point to it, and the README names
    Films and its windows.

    - [ ] **5.5.a Write the ADR "Navigate through one top bar into one film catalog"**
        - The next free number, reading `Proposed`, from `adr-template.md`; it records decisions 1, 2, 4, 6 to 9 and
          19 as § 8 of the PRD lists them, and the parts of ADR-002 and ADR-039 it supersedes

    - [ ] **5.5.b Point ADR-002 and ADR-039 at it**
        - Each Status reads `Accepted; Superseded in part by` the new ADR

    - [ ] **5.5.c Name Films in the README's feature line**
        - "Browse, Now Playing, Upcoming" becomes Films with All films, In theaters and Coming soon

    - [ ] **5.5.d Run R31's search over `.arc/reference`, outside the archive and the ADR bodies, and the README**
        - Fix any other statement it finds still describing the old shell as current

- [ ] **5.6 Check the catalog through the smoke specs — R30**

    **Goal:** The exit criterion holds in a real browser, with the catalog's URLs, scroll keys and Back to Results
    unchanged.

    - Run `browse.spec.ts`, `back-to-results.spec.ts`, `movie-detail.spec.ts` and `phone-width.spec.ts` against the
      browsable stack; record what ran and the result

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation, the new ADR set to `Accepted`, and
  the verification review)

## Implementation Notes

- **Colors in tests:** render with `styleSystem` and compare with `expectResolvedColor`
  (`frontend/tests/helpers/theme-styles.ts`), as `alert.test.tsx` and `MovieDetail.styles.test.tsx` do. jsdom
  computes neither `:hover` nor a pseudo-element, so hover colors are checked by eye and the placeholder through the
  generated global CSS.
- **Breakpoints in tests:** jsdom evaluates media queries at a fixed 1024px width, where `lg` (64rem) matches, so
  which controls show at which width is the smoke specs' to check. `NavBar` renders both rows, which share names
  ("CineXplorer", the account trigger), so component tests render the wide row and the phone row each on its own;
  the switch between the rows sits on `NavBar`'s two row wrappers, never inside a row's own component, or a row
  tested alone would be hidden. The specs find bar controls by role: Playwright's `getByLabel` also matches an
  `aria-label` on any element, hidden ones included, so "Search films" would match the hidden row's control too.
- **New modules fail first on behavior:** a test of a component or function that doesn't exist yet is seen failing
  against a stub that exports it, not on the missing import.
- **Chakra's portals:** `Menu` and `Drawer` content renders in a portal at the end of `document.body`; query it through
  `screen`, not within the banner.
- **Sign-in state in tests:** `authHandlers`, `clearBrowserAuth`, `profile` and `gate` in `frontend/tests/helpers/`
  drive the session as `NavBarUserMenu.test.tsx` does today.
- **The error boundary today:** a caught error goes to `logger.reportCriticalError`, and in development only it resets
  itself after 30 seconds; tests run outside development. `ErrorBoundary.integration.test.tsx` shows how its tests
  quiet the console.
- **Smoke runs:** `node scripts/worktree.mjs browse` starts the browsable stack and prints its address; run a spec from
  `frontend/` with `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e -- e2e/<spec>`.
- **Tests that pass before their implementation:** a case the current code already satisfies (the select trigger's
  border focus, `/browse?minYear=1990` keeping its years, the sequential page's title and hidden controls, 4.1.a's
  kept state, 4.1.b's app-level cases) is seen failing against a narrow break of that behavior, then passing once it
  is restored, and the completion notes record it.

## Success Criteria

### Implemented

- [ ] 1. Component tests show the bar's links and the drawer's, signed out, resolving and signed in, as R1, R4, R5 and
  R8 list; Films marked `aria-current="page"` on the three catalog URLs only, and the Library link on `/watchlist`
  only; and no link in the bar or the drawer to `/journal`, `/library`, `/log`, `/settings` or `/featured`. Which
  controls show at which width is a CSS breakpoint that jsdom, fixed at a 1024px width, can't vary, so the smoke specs
  check it (criterion 12).
- [ ] 2. Component tests show the account menu with menu roles and `aria-expanded`, holding exactly Profile and Sign
  out; Escape closing the account menu, the drawer and the phone search field and returning focus to the control that
  opened each; and the phone search field, while open, leaving none of the row's other controls reachable by role or
  by Tab.
- [ ] 3. Unit tests show Sign in's target: `/login?next=` with the current path and query on an app page; the same
  `next` on `/login?next=%2Fwatchlist`; and `/login` on `/login` without `next`, on `/register` and on
  `/forgot-password`.
- [ ] 4. Unit tests show the header's title for every row of R23's table, with and without a language or genre, and
  R24's and R25's rules: each genre's wording and their order, three or more genres with and without a language, each
  year form, and no years on In theaters or Coming soon; a sort outside the five, a language or genre without a label,
  and three genres of which one has no label, as R23's last paragraph gives them; each bound that doesn't read as a
  number, as R25 gives them; and a range whose `minYear` is the later year. The examples given in R23 to R25 come out
  exactly as written.
- [ ] 5. Tests show In theaters and Coming soon, reached by a URL carrying `minYear` and `maxYear`, and Coming soon
  reached with `sortBy=vote_average.desc`, replacing the URL without them (no new history entry) and requesting the
  window without them; and a tab switch keeping genres, rating range, certifications, language and sort.
- [ ] 6. Tests show the catalog's title and window tabs, and the search page's title, visible when results are empty
  and when the request fails.
- [ ] 7. Tests show a page that throws rendering the error display between the bar and the footer, with the bar's
  links working, and a location change clearing it without remounting the content area; and a lazily loaded page
  showing the loading state with the bar present.
- [ ] 8. Component tests show one `h1` in each page state R12 changes: the movie detail page loaded, not found and
  failed; the watchlist page loading, failed, empty and listed; the password-reset page before and after sending; the
  sign-in and registration pages; and a page showing the content area's error display; and no `h1` while the movie
  detail page loads its film, while the sign-in check runs, or while the sign-in page completes a Google or GitHub
  sign-in.
- [ ] 9. `/browse/sequential` is registered only when `import.meta.env.DEV` is true, as `/dev/*` and `/testlogin` are,
  and a production build (`npm run build`) emits no `BrowseSequential` chunk.
- [ ] 10. A search of `frontend/src` finds no import of the removed sidebar components or of `useSidebar`, no
  `USER_NAVIGATION_ITEMS` or `MOVIE_VIEW_NAVIGATION_ITEMS`, no `layout-sidebar`, `sidebar-width`,
  `navbar-height-mobile` or `navbar-height-desktop` size and no `sidebar` z-index token; and `layout-navbar` resolves
  to 65px at every breakpoint.
- [ ] 11. Tests over the theme show the select recipe's indicator color, the global placeholder style, the button
  recipe's expanded fill in each variant R29 names, and the button, checkbox and switch recipes' focus outline (color
  `ring`, with no `outline` shorthand) naming theme roles; the select trigger and the search field focusing with a
  `tertiary` border and no outline, the field's border staying unchanged while its Search button has focus, and the
  advanced-filters toggle with a `ring` outline; component tests show the surfaces, borders and text of the pieces R29
  lists resolving to the roles it names, among them the account menu's panel with its 1px `border-subtle-02` border
  and `on-popover` items and, opened and moved with ArrowDown, its highlighted item filled with `tertiary` under
  `on-tertiary` text, and the bar's links and the window tabs, focused from the keyboard, drawing a `ring` outline,
  compared as resolved semantic variables (`var(--chakra-colors-…)`); the sign-in spec finds the account menu's
  trigger, focused from the keyboard, drawing its outline in `ring`'s color; and `npm run verify-contrast` passes with
  R29's two added pairs.
- [ ] 12. The smoke tier passes locally with six specs: `sign-in.spec.ts` finding the wide bar's controls at 1280×800
  as R30 lists; the phone-width spec at 360×800 finding every bar control's whole box inside the viewport signed out
  and signed in, the account trigger showing no username text, and the drawer's and the search field's controls; the
  axe scans without the sidebar's six baseline entries; exactly one `h1` on each page the specs reach; and the bar,
  found by its banner landmark, rendering at `layout-navbar`'s height at both viewports.
- [ ] 13. The documentation search R31 describes finds nothing, and ADR-002's and ADR-039's statuses name the new ADR,
  which reads `Accepted`.
- [ ] 14. Component tests show, with `oauth_in_progress` set to `google` and to `github`, the shell calling
  `window.__dismissPreloadOverlay` once it renders, and the content area showing "Logging in with Google..." or
  "Logging in with GitHub..." under the bar while the page loads (R17); and a component that throws in the bar itself
  rendering the last-resort full-page error display, and `/testlogin` showing its page-level loading fallback while it
  loads (R16).
- [ ] 15. Component tests show the bar as the banner landmark; the wordmark as a link named "CineXplorer" and not a
  heading; the account menu's trigger named by the full username, its username text cut off past 12rem with an
  ellipsis (a 12rem maximum width, no wrapping, hidden overflow); the phone bar's buttons named "Open menu", "Search
  films" and "Close search", and the drawer titled "Menu"; and the search field labelled "Search films", with that
  placeholder, submitting the trimmed query to `/search?query=` on Enter and on its Search button, and doing nothing
  for a blank query (R1, R3, R6 to R9).
- [ ] 16. Component tests show the window tabs as three links in a `nav` labelled "Release windows", the current one
  marked `aria-current="page"` (R19); the disabled year field reading "Release Year (In theaters)" and "Release Year
  (Coming soon)", the filter bar's region labelled "Film filters", and the advanced-filters toggle named "Advanced
  filters" with `aria-expanded` following its panel (R22); and the home page's section headed "Films", with buttons
  "All films", "In theaters" and "Coming soon" opening the three catalog URLs (R27).

### Proven after merge

- [ ] 17. The pull request's end-to-end smoke job passes with the six specs, and after merge the staging smoke run
  passes the five it runs (it skips sign-up), the phone-width spec included; staging serves the not-found page at
  `/browse/sequential`.
