# Task List: CineXplorer Default Palette

**PRD:** `prd-palette.md`
**Created:** 2026-11-10
**Completed:** 2026-11-11
**Branch:** `technical/palette`
**Base Branch:** `main`
**Status:** Complete

## Overview

**Purpose:** Make Marquee, CineXplorer's own brass-on-warm-black palette, the default theme, mark scores with a colored
dot beside a neutral number, make certifications neutral, and draw every color on movie surfaces and alerts from the
active theme.

## Scope

### Will Do

- A Marquee adapter in dark and light, registered first and made the default, with `index.html` painting it before
  the app loads
- Contrast checks that can be imported and limited to named themes, covering every pair the restyled elements render
- A dot chip for TMDB scores and user ratings; neutral certification badges; a brass selected certification pill
- Alerts in their themed tint, and a floating alert's action outline that holds 3:1 on it
- The color references that resolve to no theme role, and the recipe-default grays on the movie card and detail page
- The documentation and comments that describe replaced behavior; two ADRs and the ADR-003 and ADR-008 status lines

### Won't Do

- Further palettes, or changes to the four existing palettes' values or to `UnifiedTheme`'s roles
- The top bar, landing page and legal page layouts; the browse filter's design beyond the selected pill
- Score-specific color roles; a white or ink accent
- Choosing the pre-paint background by `prefers-color-scheme`; changes to the color-mode provider; a Content Security
  Policy
- Chakra recipe defaults outside the movie card and the detail page
- See the PRD's Non-Goals for the reasons

---

## Tasks

### **Phase 1:** Marquee exists and passes every listed pair

_Mode:_ `layer` — closes on Marquee as the default theme, with every pair R5 lists checked in the themes it names.

- [x] **1.1 Marquee's adapter returns its palette in both modes — R1, R2, R3, R4, R8**

    **Goal:** `createUnifiedTheme("marquee", mode)` returns R2's and R3's values and R4's mapping, and every existing
    contrast pair passes on it.

    - [x] **1.1.a Pin the adapter contract**
        - Ten tests cover both palette tables, direct role mappings, derived states and borders, link-state
          luminance, shadows, backdrop and Carbon's role vocabulary. All ten failed with `Unknown theme: marquee`
          before the adapter existed, and passed afterward.
    - [x] **1.1.b Add the adapter and its name**
        - Marquee owns its mode palettes, composes the existing border, state and extension helpers, and overrides
          the badge, its text and star colors. Registered the factory, definition and Carbon shadow mapping.
    - [x] **1.1.c Check Marquee's contrast**
        - Added Marquee first to the script: 121 pairs × 10 variants, all 1,210 passed. Palette tests, frontend
          type-check, touched-file ESLint and formatting passed.

- [x] **1.2 `verify-contrast` checks every pair R5 lists, in the themes R5 names — R5**

    **Goal:** Any color in an R5 pair moved below that pair's threshold fails `verify-contrast`, in each theme R5
    names for the pair and in no other.

    - [x] **1.2.a Extract the importable checks**
        - Moved pairs, thresholds and variant validation into `contrast-checks.ts`; the CLI keeps reporting and
          exit behavior. Pure-move totals before and after: 1,210 passed, none failed or skipped.
    - [x] **1.2.b Pin matrix coverage and mutation behavior**
        - Encoded the R5 rows independently as pair, surface, backdrop, threshold and theme data. The initial run
          had 403 failures and 1,140 passes. Temporarily removing the existing `on-badge`/`badge` entry produced
          15 presence/mutation failures; restoring it and implementing coverage made all 1,543 tests pass.
    - [x] **1.2.c Add scope and missing rendered pairs**
        - Added missing score-dot, edge and tinted-alert control pairs. Scoped skips are reported separately from
          optional tokens: 175 declared pairs × 10 variants, 1,478 passed, 272 scoped out, zero failures.
        - Frontend type-check, touched-file ESLint and formatting passed.

- [x] **1.3 The light-layer guidance and the Marquee ADR describe Marquee — R18**

    **Goal:** A reader of the layer guidance learns Marquee's light order, and the ADRs record why Marquee was chosen
    and what it supersedes.

    - [x] **1.3.a Light-layer order**
        - Styling guidance and all three debug-page descriptions distinguish Marquee's deep/pale/deep/pale cream
          from the adapted palettes' lighter-page order. Type-check, JSX lint, formatting and markdown lint passed.
    - [x] **1.3.b Record the palette decision**
        - Added Proposed ADR-041 with the palette and mode choices, Carbon composition, rejected alternatives and
          contrast tradeoffs; it cites ADR-006. ADR-008's status names the partial supersession for Marquee.

### **Phase 2:** Marquee is the default theme

_Exit criterion:_ with nothing stored the app opens in Marquee and the selector lists "Marquee" first,
`npm run verify-contrast` reports five themes × two modes and passes every R5 pair, and the frontend unit suite passes
under Marquee's `defaultSystem`.

- [x] **2.1 Pin the default theme and the selector's labels with failing tests — R6, R8**

    **Goal:** Marquee as the default, a stored choice kept, and the selector's displayed labels are pinned by failing
    tests.

    - [x] **2.1.a Pin initial selection**
        - Empty and unknown storage select Marquee, stored Carbon is kept, and Marquee is first. Three assertions
          failed initially; the stored-Carbon behavior already passed and was reconstructed in 2.2.a.
    - [x] **2.1.b Pin displayed labels**
        - Real provider/menu tests cover the Marquee trigger and all five display labels in registry order. Both
          failed before the registry/label changes. All six selection tests now pass.

- [x] **2.2 Marquee is registered first and is the default — R6, R8**

    **Goal:** A visitor with no stored choice gets Marquee, a stored choice still wins, and every list of themes names
    Marquee.

    - [x] **2.2.a Registry and selector**
        - Registered Marquee first and default; the selector uses display labels and drops unused descriptions.
          Debug maps and switcher include Marquee. Ignoring storage temporarily made the stored-Carbon assertion
          fail; restoring the code made all four initial-selection tests pass.
    - [x] **2.2.b The other theme lists**
        - Updated brand labels, palette/interface and shadow comments, and Carbon's stale count. Searched theme ids
          and display names across source, scripts and tests; role-specific notes and optional-role cases stay.
    - [x] **2.2.c The test renderers' description**
        - The test README names the application's default Marquee system.
    - [x] **2.2.d Run wider**
        - All 66 frontend test files passed (2,556 tests; four workers under host CPU policy).
        - Removed `/login`'s contrast baseline and ran registration alone: passed, with no violating element.
          Kept the entry removed. All five smoke specs then passed against the worktree's browsable stack; the
          full run reported no unmatched baseline entries. Touched-file ESLint, formatting and type-check passed.

- [x] **2.3 The page paints Marquee before the app loads — R7, R18**

    **Goal:** Before React mounts, the page paints Marquee's dark background, and a valid stored `cinexplorer-bg`
    still takes precedence.

    - Updated both browser theme colors and every default/CSS fallback to Marquee's page values; stored-background
      validation and precedence are unchanged. `#161616` occurs zero times. HTML formatting passed.

- [x] **2.4 The theme documentation names Marquee the default — R9, R18**

    **Goal:** The documentation describes Marquee as CineXplorer's own default palette beside the four adapted design
    systems.

    - Added Marquee's brass brand row and named all five real adapter factories in the color-token strategy.
      TECHNICAL-OVERVIEW, the root README and the original-palette reference header name the own default beside
      four adapted systems. Markdown lint and touched-file TypeScript formatting/lint passed.

### **Phase 3:** Scores show a dot beside a neutral number

_Mode:_ `slice` — closes on dot chips and neutral certifications on the browse grid and a movie's detail page.

- [x] **3.1 Pin the score chip with failing tests — R10, R11, R12, R13, R14**

    **Goal:** Each tier's dot, the few-votes chip and the unchanged accessible text are pinned by failing tests in both
    presentations.

    - [x] **3.1.a Share the resolved-color assertion**
        - Extracted `styleSystem`, token resolution and a computed CSS-color assertion into the shared test helpers.
          Both renderers and their providers accept an optional Chakra system; documented examples include routes.
          All 53 existing score cases passed unchanged after extraction, as did type-check, lint and formatting.

    - [x] **3.1.b Pin the dot chip**
        - Reworked style cases for both presentations, rounded thresholds, neutral chips, user tiers, chip borders,
          text, dot size/visibility and the existing labels/titles. Initial result: 27 failures, 38 passes.
        - Narrow reconstructions of neutral fills and added neutral dots each failed 14 assertions; changed labels,
          titles and prefixes failed 31 assertions. Restoring and implementing the chip made all 65 cases pass.

- [x] **3.2 Scores render as dot chips — R10, R11, R12, R13, R14**

    **Goal:** A score reads at a glance from a small dot beside a neutral number, and its color always agrees with the
    number shown.

    - Shared chip rendering uses a transparent fill, subtle outline, neutral number and an 8px decorative dot;
      neutral few/no-vote chips retain their fill, labels and absent dot. TMDB tiers use the rounded display value;
      user tiers keep 8/5 thresholds, the neutral star and existing combined/standalone layouts.
    - All 65 score cases and 126 related tests across five files passed, plus type-check, touched-file lint and
      formatting. Browse, detail and back-to-results smoke specs passed (three specs).
    - Corrected the related-test invocation to run from `frontend/`, and documented the deliberate inaccessible-dot
      DOM query for ESLint.

- [x] **3.3 The score guidance and the score-display ADR describe the chip — R18**

    **Goal:** The guidance, comments and debug page describe dot chips for scores and `imdb-gold` for star icons only,
    and the score decisions are recorded.

    - [x] **3.3.a Strategies**
        - Both style strategies show dot chips, displayed-value thresholds and neutral low-vote states; numeric
          user ratings use the chip, and gold is for star icons.
    - [x] **3.3.b Code comments and the debug page**
        - Updated badge/type/extension comments and standard-gold scope. The debug page renders real MovieUserScore
          examples for all tiers and few votes; star examples describe the active theme's gold.
        - Type-check, touched-file lint/format, markdown lint and 1,553 palette/contrast tests passed.
    - [x] **3.3.c Record the score decision**
        - Proposed ADR-042 records the dot, tiers, shared roles, chip, user star, accessibility and neutral
          certifications, with alternatives and costs. ADR-003 names the partial numeric-score supersession.

### **Phase 4:** Certifications are neutral

_Exit criterion:_ on the browse grid and a movie's detail page, in both modes under Marquee, scores show dot chips,
certification badges are neutral, and a selected certification pill is brass with no other ring.

- [x] **4.1 Pin neutral certifications with failing tests — R15, R16**

    **Goal:** Neutral badges for every rating and the brass selected pill, with its ring and focus ring, are pinned by
    failing tests.

    - [x] **4.1.a Pin certification badges**
        - Every rating's fill/text/title and missing-value omission are covered. Five colored ratings failed
          initially; reconstructing NR's fill and missing-value behavior made those four previously passing cases
          fail too. The full badge/filter reconstruction run failed 15 cases.
    - [x] **4.1.b Pin selected and unselected pills**
        - All six selected fills, labels, borders and absent inset rings, keyboard focus color, and all six
          unselected styles are covered. Seven selected/focus cases failed initially; reconstructing unselected
          fills made all six previously passing unselected cases fail. All 22 cases now pass.

- [x] **4.2 Certifications render neutral, and a selected pill brass — R15, R16, R18**

    **Goal:** Color on the detail page marks scores only, and a selected filter pill reads as the app's selected
    control in every theme.

    - Removed certification status variants/maps and lookup. Every badge uses the neutral recipe. Selected pills
      use tertiary fill/text/border roles, keep that fill on hover, clear the checked inset ring and focus in `ring`.
    - Passed 47 related tests across five files, type-check, touched-file lint/format, and both browse/detail
      smoke specs. Corrected unsupported `exact` options on Testing Library role queries during type-check.

- [x] **4.3 Check scores and certifications together in Marquee**

    **Goal:** Scores, certifications and the selected pill are shown working together on the browse grid and a detail
    page, with what ran and what was seen recorded.

    - Browse/detail smoke specs passed (two specs on the implementation in `58b588d5`). A throwaway Playwright
      driver signed in through the real local session and captured browse/detail in both modes using catalogue
      fixtures (unavailable poster placeholders; scores 8.0, 6.0, 4.0 and a four-vote placeholder).
    - Inspected all four screenshots: scores have colored dots beside neutral numbers, few-vote chips have no dot,
      detail certification is neutral, G and PG selections are brass, and G's keyboard focus outline uses `ring`.
      Selected pills have no inset shadow. The driver waits for the focus transition to settle and asserts its
      final color before capture. Driver, screenshots and measured colors are retained outside the checkout.

### **Phase 5:** Every color comes from the active theme

_Mode:_ `slice` — closes on alerts, the movie card and the detail page drawing every color from the active theme.

_Exit criterion:_ the search Success Criterion 9 names finds nothing in production code, and `sign-up.spec.ts` scans
`/login` with the registration notice showing and passes without the `color-contrast` baseline entry.

- [x] **5.1 Alerts take their themed tint — R19, R5**

    **Goal:** No alert color comes from a Chakra palette, and the floating alert's action outline holds 3:1 on its
    tint.

    - [~] **5.1.a Remove the `/login` baseline entry, if 2.2.d kept it**
        - Not needed: 2.2.d removed it and registration passed without violations; it remains absent.

    - [x] **5.1.b Pin alert tint and action border**
        - All four statuses with omitted and explicit subtle variants compare rendered tint and root text to theme
          expressions. A dark-ancestor action test first proves raised and neutral border roles differ. All nine
          assertions failed on the prior recipe/button.
    - [x] **5.1.c The recipe's tint and text take precedence**
        - Status/subtle compound styles restore themed tints and foreground root text. Declared the inherited subtle
          variant for compound-style typing. Floating actions use the raised strong border and retain primary
          hover/active borders. ErrorBoundary's own destructive border stays.
        - All 17 alert/ErrorBoundary cases passed; 1,560 alert/contrast cases passed after type generation, plus
          frontend type-check and touched-file lint/format.
    - [x] **5.1.d Retire checks on unused Chakra fills**
        - Removed native alert surfaces/pairs and the Chakra theme import. Tints remain checked: 165 declared pairs,
          1,378 passing evaluations, 272 scoped skips, no failures. Sign-up and sign-in smoke specs passed without
          the `/login` contrast entry.

- [x] **5.2 The movie card and the detail page draw no recipe-default color — R17**

    **Goal:** The card's text, the detail page's dividers and its tags take theme roles instead of Chakra's grays.

    - [x] **5.2.a Pin movie surface colors**
        - Card title foreground, all four detail separator borders, and genre/company tag shadows failed on the
          prior styles. New detail style cases live in `MovieDetail.styles.test.tsx`, using MSW and the real fetch
          path; keeping them separate avoids inheriting the original suite's hoisted hook/service mocks.
    - [x] **5.2.b Apply theme roles**
        - Card root text uses `foreground`; detail separators use `border-subtle-01`; genre/company tags have no
          inset shadow. All 39 card/style cases and 64 related cases passed, plus type-check and touched-file
          lint/format. Browse/detail smoke specs passed (two specs).

- [x] **5.3 Production components name only roles the themes define — R17**

    **Goal:** Every color role named in `frontend/src`, outside the debug pages and tests, resolves to a theme role.

    - Removed the error pages' undefined accent palette, replaced grid text/error and toaster border references,
      removed unimported LightMode/DarkMode wrappers, and themed both GitHub logo wrappers with foreground.
    - The required production-source search is empty. All 266 related tests across 27 files passed, plus frontend
      type-check, formatting and the configured full lint gate. Sign-in/browse smoke specs passed (two specs).
    - An exploratory forced lint of the Chakra snippets hit their documented mixed-export/Fast Refresh exception;
      restored the configured invocation without overriding that deliberate exclusion.

- [x] **5.4 Removed role names are described as removed — R18**

    **Goal:** No guidance tells a reader that `accent`, a `-foreground` name or any other removed alias still works.

    - Corrected the type comments/examples and both style strategies: old aliases define no runtime colors; use
      `tertiary` and canonical `on-*` roles. Removed the compatibility claims and counts of aliases as live tokens.
    - The required case-insensitive search finds old suffix names only in explicitly removed-name examples/table
      entries. Markdown lint, touched-file lint/format and frontend type-check passed.

- [x] **5.5 Check `/login` passes without its baseline entry**

    **Goal:** The sign-in page, with and without the registration notice, is shown passing its axe scans under
    Marquee with no `color-contrast` entry, and the search shown empty, with what ran recorded.

    - Final sign-up/sign-in smoke run passed (two specs) with the registration notice scanned and no `/login`
      contrast baseline entry. The required production-source search returned no matches.
    - The first final registration run returned HTTP 429 after repeated tests exhausted the documented three/hour
      limit. Its trace confirmed 429 and "Too many requests"; clearing only this worktree's registration-history
      key by the documented testing procedure restored the required run. No application throttle changed.
    - A bounded Astra consultation found no material gap in scoped contrast gating or translucent-alert composition.

### **Phase 6:** Verification

- [x] **6.1 Verify the work** (load `archive-completed.md` § 1)

    - Author walk, full verification gates and the independent verification companion completed on `1768cda9`
      plus the coverage repair in Task 6.1.a. Criteria 1–10 are met; criterion 11 awaits its planned PR CI
      and post-merge staging evidence. The work unit's review log retains the criteria evidence and independent report.
    - ADR-041 and ADR-042 are Accepted, dated 2026-11-11; both decision bodies stand independently of planning.
    - Corrected the formatter-reported indentation/wrapping in the new test-helper README example.
    - [x] **6.1.a Cover every certification's keyboard focus**
        - Parameterized the existing focus test across all six ratings, reaching each selected checkbox with Tab
          and checking focus, a solid outline and its resolved `ring` color.
        - Removing the focus-ring override temporarily made all six focus cases fail on Chakra's gray; restoring
          it made the 27 certification filter/badge cases pass. Types and changed-test lint/format passed.

- [ ] **6.2 Prove the post-merge criteria** (Success Criterion 11's staging half; load `archive-completed.md` § 9)

## Implementation Notes

- **Two `ThemeName` types.** Marquee is included in the adapter factory's union and the theme registry's key union.
  A missing factory switch case can type-check but throw when `definitions.ts` loads. The registry's union also
  types the debug page's name maps, keeping those maps aligned with the selectable themes.
- **Measured palette values.** The exact R2 and R3 tables are pinned by adapter tests; the contrast matrix checks
  R5's pairs. Interaction helpers derive hover and active states from the palette. Decorative-border shortfalls
  explicitly accepted by the PRD remain outside the applicable checks.
- **Computed styles in jsdom.** The shared style helper uses the project system with cascade layers disabled and
  compares computed colors against independently resolved semantic expressions. Planning probes established that
  jsdom resolves CSS variables, translucent tints, inset shadows and keyboard-focus outlines with this system.
- **The two cascades differ at recipe state styles.** In the app, recipe styles sit in a cascade layer, so a style
  prop beats a recipe style. The layer-free test system leaves them unlayered, so a recipe's state rule (`_checked`,
  `_hover`) outranks a base prop by specificity. Matching the recipe's condition makes the selected pill's border
  and absent inset ring agree in both systems. The recipe sets `--focus-ring-color` on the root itself, so a base
  `focusRingColor` prop wins in both cascades.
- **Chakra's recipe defaults.** `createSystem(defaultConfig, …)` merges project recipes into Chakra's while keeping
  Chakra's variant order. Alert compound styles restore the themed tint after the subtle variant. The checkbox
  card's checked inset ring, focus ring, separator border and tag inset shadow require separate overrides.
- **The `/login` baseline entry.** Baseline matching uses route and rule alone, so a login contrast entry can absorb
  unrelated contrast violations on that route. The entry was removed, and the local scans passed with and without
  the registration notice under Marquee.
- **End-to-end runs.** Start the worktree's browsable stack with `node scripts/worktree.mjs browse` and run specs from
  `frontend/` with `E2E_BASE_URL` set to its address. The scans run in light mode only; dark-mode contrast is checked
  by `verify-contrast`. Task 6.2 records the separate staging proof in both modes after merge.

## Success Criteria

- [x] 1. `npm run verify-contrast` (from `frontend/`) reports five themes × two modes and passes, with Marquee among
  them, and Marquee's adapter returns the values in R2 and R3 for the roles they list (checked against the tables).
  The script no longer checks Chakra's alert fills.

  Met: the verification CLI run reports five themes × two modes, 1,378 passes, 272 theme-scope skips and no failures.
  `marquee.test.ts` checks both exact palette tables and mappings; the CLI checks only themed alert tints.

- [x] 2. `verify-contrast` checks every pair R5 lists, on its surfaces and in the themes R5 names for it, and fails
  when any color in such a pair is changed to a value below that pair's threshold.

  Met: `contrast-checks.test.ts` independently lists the required pairs, surfaces, thresholds and theme scopes, checks
  their presence, and mutates their foreground colors in both modes. Its cases passed in the full frontend run; the
  CLI imports the same validator.

- [x] 3. With nothing stored, `getInitialTheme()` returns `marquee` and Marquee is first in `themeRegistry`; with
  `cinexplorer-theme` set to `ibm-carbon`, it returns `ibm-carbon`.

  Met: all four initial-selection tests and both rendered selector tests passed, covering empty/unknown storage,
  stored Carbon, registry order and displayed labels.

- [x] 4. `frontend/index.html` has `theme-color` values `#110E0A` and `#F2E8CE`, and contains no `#161616`.

  Met: inspected both meta tags and all pre-paint defaults/fallbacks; the required values are present and `#161616` is
  absent. Stored-background validation and precedence are unchanged.

- [x] 5. Unit tests show, in both presentations: a scored TMDB score as an outlined chip whose dot resolves to
  `success`, `foreground` or `destructive` by the displayed value (7.47 → "7.5", good; 4.97 → "5.0", middle; 7.4 →
  middle; 4.9 → low); a score below 10 votes as the filled neutral chip with no dot and its existing labels; the dot
  hidden from assistive technology and the accessible text unchanged ("TMDB Rating: 7.5").

  Met: the passing score suite covers both presentations, rounding and vote-count boundaries, transparent outlines,
  semantic dot/number colors, neutral placeholders, titles and inaccessible decorative dots.

- [x] 6. Unit tests show a user rating as the same chip with its thresholds (8 good, 7 and 5 middle, 4 low) and its
  labels "★ 8" beside a TMDB score and "★ 8/10" alone.

  Met: the passing score suite checks 8/7/5/4 in both presentations and both combined/user-only layouts, including the
  neutral star and both label forms.

- [x] 7. Unit tests show every certification badge with the `badge` background, and a selected certification-filter
  pill, for every rating, with the `tertiary` background, no inset ring, and a focus ring in `ring`;
  `CERTIFICATION_VARIANT_MAP` no longer exists.

  Met: all six badge and selected-style cases pass, and each rating now has a keyboard-focus/ring-color unit case.
  All six focus cases failed without the semantic ring override and passed after restoration; all 27 certification
  filter/badge cases passed. The removed variant map remains absent.

- [x] 8. Tests show a rendered alert, for each status, with no variant and with `variant="subtle"`, whose background
  resolves to its status color at 10% and whose root text resolves to `foreground`, not a Chakra palette color; and a
  rendered `FloatingAlert` with an action, whose action button's border resolves to `border-strong-02`.

  Met: all eight status/variant tint and foreground cases and the dark-mode floating-action border test passed. The
  action test distinguishes the raised strong border from the former outline role.

- [x] 9. A search of `frontend/src` outside `frontend/src/pages/dev/` and test files finds no `fg-muted`, `fg-error`,
  `colorPalette="accent"`, `colorPalette="gray"`, `borderColor="border"`, `color="fg"` or `color="black"`; a rendered
  movie card's title resolves to `foreground`; and a rendered movie detail page's separators resolve to
  `border-subtle-01`, and its genre and company tags draw no inset ring.

  Met: the exact production-source search returned no matches. Passing rendered tests check the card title, all four
  detail dividers and both tag types through resolved styles.

- [x] 10. A search of `frontend/index.html`, `frontend/src`, `frontend/tests`, `frontend/scripts`, the style
  strategies and TECHNICAL-OVERVIEW finds no description of IBM Carbon as the default, of traffic-light or
  status-colored scores, of status-colored certifications, of the four design-system palettes as the only ones, of
  gold as the color of score displays or of one gold across all themes, or of `accent` or a `-foreground` name as a
  working role; the color-token strategy's adapter list and brand table, TECHNICAL-OVERVIEW § 3 and the root README
  name Marquee; the theme selector shows "Marquee".

  Met: the complete wording/alias searches and contextual inspection found no obsolete live guidance; removed-name
  examples explicitly say they are removed. The adapter list, brand table, overview and README name Marquee, and
  rendered selector tests pass.

- [ ] 11. Proven live: the pull request's end-to-end smoke job passes with its axe scans under Marquee, with no new axe
  baseline entry and without the `/login` `color-contrast` entry, and after merge the staging site renders the browse
  grid and a movie's detail page in Marquee in both modes, with dot chips for scores and neutral certifications.

  Pending the planned delivery stages: this verification run passed all five local smoke specs and axe scans,
  including the registration notice without the removed login baseline. Pull-request CI is not yet available; Task 6.2
  owns the staging half after merge.
