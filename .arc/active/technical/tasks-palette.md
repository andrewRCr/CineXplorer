# Task List: CineXplorer Default Palette

**PRD:** `prd-palette.md`
**Created:** 2026-11-10
**Branch:** `technical/palette`
**Base Branch:** `main`
**Status:** In Progress

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

- [ ] **2.3 The page paints Marquee before the app loads — R7, R18**

    **Goal:** Before React mounts, the page paints Marquee's dark background, and a valid stored `cinexplorer-bg`
    still takes precedence.

    - `frontend/index.html`: the `theme-color` tags become `#110E0A` (dark) and `#F2E8CE` (light); every `#161616`
      (the two CSS fallbacks, the first script's default and the second script's fallback) becomes `#110E0A`; the
      comment "Default: IBM Carbon dark" names Marquee's dark page
    - The stored-background precedence and the dark first paint for light-mode systems stay as they are
    - **Check:** `grep -c "#161616" frontend/index.html` prints 0

- [ ] **2.4 The theme documentation names Marquee the default — R9, R18**

    **Goal:** The documentation describes Marquee as CineXplorer's own default palette beside the four adapted design
    systems.

    - `.arc/reference/strategies/project/style/strategy-color-tokens.md` "Theme-Specific Availability": a Marquee row
      (`brand` is the brass `primary`; `brandSecondary` and `brandTertiary` undefined)
    - The same strategy's "Adapter implementation" paragraph, which lists the adapters as `githubAdapter`,
      `carbonAdapter`, `gitlabAdapter` and `materialAdapter`: name the five by their real factories
      (`createMarqueeAdapter`, `createGithubAdapter`, `createCarbonAdapter`, `createPajamasAdapter`,
      `createMaterialAdapter`)
    - `.arc/reference/constitution/TECHNICAL-OVERVIEW.md` § 3, the Theme System paragraph, and the root `README.md`
      feature line ("spanning four design systems"): CineXplorer's own palette, Marquee, is the default beside the four
      adapted design systems; the overview's "integrates 4 major design systems" and "Extensible for future
      CineXplorer-specific theming" describe that
    - `frontend/src/theme/color/palettes/cinexplorer-original.ts`: the header, which lists the four design-system
      palettes as what the application uses, names Marquee

### **Phase 3:** Scores show a dot beside a neutral number

_Mode:_ `slice` — closes on dot chips and neutral certifications on the browse grid and a movie's detail page.

- [ ] **3.1 Pin the score chip with failing tests — R10, R11, R12, R13, R14**

    **Goal:** Each tier's dot, the few-votes chip and the unchanged accessible text are pinned by failing tests in both
    presentations.

    - [ ] **3.1.a Share the resolved-color assertion**
        - Move `MovieUserScore.test.tsx`'s layer-free system and its resolved-color comparison into
          `frontend/tests/helpers/` as one assertion for any CSS color property of an element against a token
          expression (for example `background-color` against `var(--chakra-colors-success)`, or `border-color`
          against `var(--chakra-colors-border-subtle-01)`)
        - `TestProviders` and the shared renderers (`test-renderer.tsx`, `test-renderer-with-routes.tsx`) take an
          optional Chakra system, so a page rendered with routes can use the layer-free one; document the option in
          `frontend/tests/README.md`. Tasks 4.1, 5.1 and 5.2 use this assertion and option
        - The existing `MovieUserScore` tests pass unchanged on the moved helper

    - [ ] **3.1.b Rewrite `MovieUserScore.test.tsx`'s style cases for the chip**
        - Test (both presentations): a scored TMDB score has a transparent background, a `border-subtle-01` border, no
          box shadow (Chakra's `outline` badge draws an inset ring in a palette gray), and a dot whose background is
          `success` at 7.5 and at 7.47 (shown "7.5"), `foreground` at 7.4, 5.0 and 4.97 (shown "5.0"), and
          `destructive` at 4.9; the number is in `foreground`
        - Find a chip by its `title` and its dot as the chip's `aria-hidden` child (task 3.2's contract). Assert a
          transparent background directly on the element; the shared assertion's reference rejects transparent values
        - Test: no votes and fewer than 10 votes keep the `badge` fill with `on-badge` text, no dot and no border,
          with today's labels ("—", "Not yet rated", "6.2 · 4 votes", "9.0 · 1 vote")
        - Test: a user rating takes the chip with its own tiers (8 good; 7 and 5 middle; 4 low), labeled "★ 8"
          beside a TMDB score and "★ 8/10" alone, the star in the number's color
        - Test: the dot is hidden from assistive technology; the accessible text stays "TMDB Rating: 7.5" and "Your
          Rating: ★ 8"; each chip keeps its `title`
        - Test: no score or user rating has a `success`, `warning` or `destructive` background
        - Keep the existing label, vote-count and title cases
        - Expect the style cases to FAIL initially. Cases today's code already satisfies (the few-votes and no-votes
          chips' fill, labels and absent dot; the accessible text and titles) pass at once: show each failing against
          a narrow reconstruction (for example a few-votes chip given a dot) and passing once restored, and record
          that (`testing-standards`)

- [ ] **3.2 Scores render as dot chips — R10, R11, R12, R13, R14**

    **Goal:** A score reads at a glance from a small dot beside a neutral number, and its color always agrees with the
    number shown.

    - `frontend/src/components/movie/MovieUserScore.tsx`: take the tier from the displayed value (the average rounded
      to one decimal), not the raw average; user-rating tiers 8 to 10, 5 to 7, 1 to 4
    - The scored chip: no fill, a 1px `border-subtle-01` outline, an 8px dot in the tier's role (`success`,
      `foreground`, `destructive`) hidden from assistive technology, then the label in `foreground` after its visually
      hidden prefix; the few-votes chip stays the `neutral` badge, with no dot or outline
    - The user rating's star stays in the label text, in `foreground`; the user-rating-only and combined presentations
      keep their layout
    - The test contract: each chip's root carries its `title`, and the dot is the chip's only `aria-hidden` child
    - The component's comments describe the dot tiers instead of traffic-light badges, including
      `SCORE_DISPLAY_MIN_VOTES`'s
    - Tests should now PASS
    - **Check:** `browse.spec.ts`, `movie-detail.spec.ts` and `back-to-results.spec.ts` against the browsable stack

- [ ] **3.3 The score guidance and the score-display ADR describe the chip — R18**

    **Goal:** The guidance, comments and debug page describe dot chips for scores and `imdb-gold` for star icons only,
    and the score decisions are recorded.

    - [ ] **3.3.a Strategies**
        - `strategy-color-tokens.md`: the TMDB score rows (high, medium, low, fewer than 10 votes) and the "User rating
          stars" row of the token table, the ✅ examples, and the decision list's score and user-rating items
        - `strategy-component-styling.md`: the decision tree's TMDB score and user-rating-star lines; the "TMDB
          Community Scores" section; the "User Personal Ratings" section, narrowed to star icons such as a row of
          rating stars, with a user rating shown as a number taking the score chip

    - [ ] **3.3.b Code comments and the debug page**
        - `frontend/src/theme/recipes/badge.ts`: the header's note on TMDB scores, and the `neutral` variant's use
          cases, describe the dot chip; the status variants stay as general labels
        - `frontend/src/theme/color/types.ts`, the `imdb-gold` doc comment: its "Standard" line (one fixed gold) says
          each theme sets its gold; its "NOT for badge backgrounds" note (traffic-light scores) says scores take the
          dot chip; its usage reads star icons, such as a row of rating stars, with a user rating shown as a number
          taking the score chip
        - `frontend/src/theme/color/extensions.ts`: the header's "Movie score displays" category; the
          `standardRatingColors` doc block, with its stale `#876B06` and its case for one gold across all themes; and
          `createExtensions`' "Use standard IMDb gold (consistent across themes)" and its inline "across all themes"
          comment. They say instead that `imdb-gold` colors star icons, and that `standardRatingColors` is the gold
          of the four adapted palettes while Marquee sets its own
        - `frontend/src/pages/dev/theme-debug/sections/CineXplorerExtensionsSection.tsx`: the score examples render
          `MovieUserScore` (good, middle, low, and fewer than 10 votes) with a caption on the dot tiers, replacing the
          filled boxes; the user-rating example describes the theme's `imdb-gold` instead of "#785F05 / #F5C518"; the
          section's closing note
        - `frontend/src/pages/dev/theme-debug/sections/FeedbackStatusSection.tsx`: the note on TMDB scores

    - [ ] **3.3.c Write the ADR "Mark scores with a colored dot", reading `Proposed`**
        - Next free number when written; decisions 6 to 13: on movie surfaces color marks scores only; the dot, its
          tiers and colors, the chip, the user rating, the decorative dot, neutral certifications; supersedes ADR-003
          in part, its assignment of the gold rating token to score displays (TMDB scores, and user ratings shown as
          a number), while star icons keep `imdb-gold`
        - ADR-003's Status becomes `Accepted; Superseded in part by` the new ADR

### **Phase 4:** Certifications are neutral

_Exit criterion:_ on the browse grid and a movie's detail page, in both modes under Marquee, scores show dot chips,
certification badges are neutral, and a selected certification pill is brass with no other ring.

- [ ] **4.1 Pin neutral certifications with failing tests — R15, R16**

    **Goal:** Neutral badges for every rating and the brass selected pill, with its ring and focus ring, are pinned by
    failing tests.

    - [ ] **4.1.a Write `frontend/src/components/movie/__tests__/CertificationBadge.test.tsx`**
        - Test: each of G, PG, PG-13, R, NC-17 and NR has a `badge` background and `on-badge` text, titled "Rated
          {certification}"
        - Test: a missing certification renders nothing
        - Expect tests to FAIL initially for G, PG, PG-13, R and NC-17. NR and the missing certification already pass:
          show each failing against a narrow reconstruction and passing once restored, and record that

    - [ ] **4.1.b Write `frontend/src/components/movie/browse/__tests__/CertificationFilter.test.tsx`**
        - Test: for every rating, a selected pill has a `tertiary` background, `on-tertiary` text, a `tertiary` border
          and no box shadow
        - Test: a selected pill focused from the keyboard (`userEvent.tab()`) has its outline in `ring`
        - Test: an unselected pill has a transparent background (asserted directly), a `border-strong-01` border and
          `on-muted` text
        - Expect the selected-pill cases to FAIL initially. The unselected pill already passes: show it failing against
          a narrow reconstruction and passing once restored, and record that

- [ ] **4.2 Certifications render neutral, and a selected pill brass — R15, R16, R18**

    **Goal:** Color on the detail page marks scores only, and a selected filter pill reads as the app's selected
    control in every theme.

    - `frontend/src/components/movie/utils/certificationUtils.ts`: remove `CERTIFICATION_VARIANT_MAP`,
      `getCertificationVariant` and `CertificationVariant`; `Certification` and `CERTIFICATION_OPTIONS` stay; the
      header comment no longer mentions color
    - `frontend/src/components/movie/CertificationBadge.tsx`: the `neutral` variant for every certification; its doc
      comment and example describe a neutral badge
    - `frontend/src/components/movie/browse/CertificationFilter.tsx`: remove `VARIANT_TO_TOKENS`; a selected pill is
      a `tertiary` fill with `on-tertiary` text and a `tertiary` border, its hover keeping those; the checked state
      draws no inset ring; the keyboard focus ring is in `ring` instead of `colorPalette.focusRing`; the unselected
      pill and hover styles stay; the doc comment describes the brass selection
    - Set the selected border and the absent ring under `_checked`: the checkbox card's `outline` variant sets a
      `colorPalette.solid` border and inset ring there, and in the tests' layer-free system its `_checked` rule beats
      a base prop (see Implementation Notes)
    - Tests should now PASS
    - **Check:** `browse.spec.ts` and `movie-detail.spec.ts`

- [ ] **4.3 Check scores and certifications together in Marquee** (run `browse.spec.ts` and `movie-detail.spec.ts`,
  then a scripted screenshot scenario in both modes)

    **Goal:** Scores, certifications and the selected pill are shown working together on the browse grid and a detail
    page, with what ran and what was seen recorded.

    - Run both specs against this worktree's browsable stack and record the result
    - The specs scan in light mode only and do not look at colors. A throwaway Playwright script, kept outside the
      repository, signs in to the browsable stack and screenshots, in dark and light: the browse grid (good, middle,
      low and few-votes scores; two certification pills selected, one focused from the keyboard) and a movie's detail
      page. Read the screenshots against the Phase 4 exit criterion, record what was seen, and show them to the Owner
      with the report

### **Phase 5:** Every color comes from the active theme

_Mode:_ `slice` — closes on alerts, the movie card and the detail page drawing every color from the active theme.

_Exit criterion:_ the search Success Criterion 9 names finds nothing in production code, and `sign-up.spec.ts` scans
`/login` with the registration notice showing and passes without the `color-contrast` baseline entry.

- [ ] **5.1 Alerts take their themed tint — R19, R5**

    **Goal:** No alert color comes from a Chakra palette, and the floating alert's action outline holds 3:1 on its
    tint.

    - [ ] **5.1.a Remove the `/login` baseline entry, if 2.2.d kept it**
        - Only when 2.2.d found the registration notice violating: remove the `/login` `color-contrast` entry from
          `frontend/e2e/axe-baseline.ts` and run `sign-up.spec.ts`, which fails on the notice until 5.1.c
        - Otherwise mark this subtask `[~]`, citing 2.2.d's result

    - [ ] **5.1.b Write the alert tests**
        - Test: an `Alert.Root` for each status (`success`, `warning`, `error`, `info`), with no variant and with
          `variant="subtle"`: its background resolves to the status color at 10% (`error` to `destructive/10`) and its
          root text to `foreground`
        - Test: a `FloatingAlert` with an action: the action button's border resolves to `border-strong-02`. Render it
          under a `.dark` ancestor (Chakra's dark condition): in Marquee light `border-strong-02` and the outline
          button's `button-outline` are the same color (`#7C705B`), so a light-mode test passes before the fix; in
          dark mode they differ (`#908980` and `#736A5F`). Assert first that the two roles resolve differently there
        - Files: `frontend/src/theme/recipes/__tests__/alert.test.tsx` and
          `frontend/src/components/common/__tests__/FloatingAlert.test.tsx`, using the shared assertion from 3.1.a
        - Expect tests to FAIL initially

    - [ ] **5.1.c The recipe's tint and text take precedence**
        - `frontend/src/theme/recipes/alert.ts`: Chakra's default alert recipe, merged in by `createSystem`, applies
          its `variant` styles after `status`, and `variant` defaults to `subtle` (`colorPalette.subtle` background,
          `colorPalette.fg` text). Make each status's tint and a `foreground` root text win for the `subtle` variant,
          for example with `compoundVariants` per status; keep the icon, title and description colors; update the
          header comment
        - `frontend/src/components/common/FloatingAlert.tsx`: the action button sets `borderColor="border-strong-02"`
          in place of `button-outline`, its rest border, and restates the outline variant's `primary` hover and active
          border (`_hover`, `_active`), which a base `borderColor` prop otherwise overrides in the app, as
          `ErrorBoundary.tsx`'s "Report Issue" restates its own; the alert recipe gains no button rule
        - `ErrorBoundary.tsx`'s "Report Issue" keeps its own `destructive` border and text
        - Tests should now PASS, with `ErrorBoundary.integration.test.tsx`

    - [ ] **5.1.d Retire the checks on Chakra's fills**
        - `frontend/src/theme/color/contrast-checks.ts`: remove `NATIVE_ALERT_SURFACES`, the native alert text and
          interaction pairs and the `@chakra-ui/react/theme` import; the tint checks stay
        - **Check:** `npm run verify-contrast` passes; `sign-up.spec.ts` and `sign-in.spec.ts` pass without the
          `/login` `color-contrast` entry

- [ ] **5.2 The movie card and the detail page draw no recipe-default color — R17**

    **Goal:** The card's text, the detail page's dividers and its tags take theme roles instead of Chakra's grays.

    - [ ] **5.2.a Write failing tests**
        - `frontend/src/components/movie/__tests__/MovieCard.test.tsx`: the card's title text resolves to
          `foreground`
        - `frontend/src/pages/movie/__tests__/MovieDetail.test.tsx`, with the layer-free system: each of the four
          separators has its border in `border-subtle-01`; the genre and company tags have no box shadow
        - Expect tests to FAIL initially

    - [ ] **5.2.b Fix them**
        - `frontend/src/components/movie/MovieCard.tsx`: `Card.Root` sets `color="foreground"`
        - `frontend/src/pages/movie/MovieDetail.tsx`: the four `Separator`s take `borderColor="border-subtle-01"`, as
          the sub-navigation's and sidebar's do; the genre and company `Tag.Root`s draw no inset ring (the tag recipe
          draws one in `colorPalette.muted`)
        - Tests should now PASS
        - **Check:** `browse.spec.ts` and `movie-detail.spec.ts`

- [ ] **5.3 Production components name only roles the themes define — R17**

    **Goal:** Every color role named in `frontend/src`, outside the debug pages and tests, resolves to a theme role.

    - `frontend/src/pages/core/Forbidden.tsx` and `NotFound.tsx`: remove `colorPalette="accent"`; the button recipe's
      solid variant already colors the button from `primary`
    - `fg-muted` to `on-muted`: `GridHeader.tsx` (its style object), `GridEmptyState.tsx` (two texts) and
      `VirtualizedMovieGrid.tsx` (the spinner and two texts); `fg-error` to `destructive` in `GridErrorState.tsx`
    - `frontend/src/components/core/chakra/toaster.tsx`: `borderColor="border"` to `border-subtle-01`
    - `frontend/src/components/core/chakra/color-mode.tsx`: remove `LightMode` and `DarkMode`, which nothing imports,
      and any import only they used
    - `frontend/src/pages/user/Login.tsx` and `frontend/src/components/layout/LoadingLayout.tsx`: the GitHub logo's
      wrapper takes `color="foreground"` instead of `"black"`; remove `LoadingLayout`'s comment calling black a brand
      exception
    - **Check:** a search of `frontend/src`, outside `frontend/src/pages/dev/` and test files, finds none of
      `fg-muted`, `fg-error`, `colorPalette="accent"`, `colorPalette="gray"`, `borderColor="border"`, `color="fg"` or
      `color="black"`; `sign-in.spec.ts` and `browse.spec.ts`

- [ ] **5.4 Removed role names are described as removed — R18**

    **Goal:** No guidance tells a reader that `accent`, a `-foreground` name or any other removed alias still works.

    - No alias role is defined anywhere under `frontend/src/theme`, so every statement that one is kept, deprecated or
      still usable says instead that it was removed, pointing to `tertiary` and the `on-*` roles
    - `frontend/src/theme/color/types.ts`: the comments calling the `-foreground` names deprecated (the section
      comments before the action colors and before the status colors); the `primary` doc's "use with
      `primary-foreground`"; the `secondary` example's `color="secondary-foreground"`; the `tertiary` doc's
      "Replaces: `accent` (deprecated …)"
    - `strategy-color-tokens.md`: the "Deprecated: -foreground suffix" example; the "Deprecated Aliases (Backward
      Compatibility)" table and its guidance; item 12 of the token categories ("Deprecated Aliases … Maintained for
      backward compatibility"); "Tertiary vs Accent Naming"; the token count's "Deprecated aliases: 9"
    - `strategy-component-styling.md` "Deprecated Token Aliases": the dotted aliases it says are "maintained for
      backward compatibility" were removed too; correct that sentence (the same stale claim, for the dotted names)
    - **Check:** a case-insensitive search of `types.ts` and the two style strategies for `deprecated`, `backward
      compat`, `accent-foreground`, `primary-foreground`, `secondary-foreground` and `success-foreground` finds only
      statements that the names were removed

- [ ] **5.5 Check `/login` passes without its baseline entry** (run `sign-up.spec.ts` and `sign-in.spec.ts`, and the
  Success Criterion 9 search)

    **Goal:** The sign-in page, with and without the registration notice, is shown passing its axe scans under
    Marquee with no `color-contrast` entry, and the search shown empty, with what ran recorded.

    - Run both specs against this worktree's browsable stack; run the search 5.3 names; record both results

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1)
- [ ] **6.2 Prove the post-merge criteria** (Success Criterion 11's staging half; load `archive-completed.md` § 9)

## Implementation Notes

- **Two `ThemeName` types.** The union in `frontend/src/theme/color/index.ts` must gain `marquee` before
  `definitions.ts` can call `createUnifiedTheme("marquee", …)`; a missing switch case still type-checks but throws
  when `definitions.ts` loads. `ThemeName` in `frontend/src/theme/index.ts` is the registry's keys, so adding Marquee
  to `themeRegistry` breaks `ThemeDebug.tsx`'s two maps until they gain it, in the same subtask (2.2.a).
- **The palette values are measured.** R2 and R3 were measured against every R5 pair and the script's existing pairs.
  A failing pair is a PRD amendment, never a quietly tuned value; only the `tertiary` hover and active steps are open,
  bounded by their pairs.
- **Computed styles in jsdom.** Resolve them with the layer-free system (`createSystem(config, { disableLayers: true
  })`), as the existing badge checks do (`testing-standards`). A throwaway test during planning showed jsdom
  resolving `var()` colors, a `color-mix()` tint (as `color(srgb … / 0.1)`), inset box shadows, and a checkbox card's
  `data-focus-visible` outline after `userEvent.tab()`; the separator's and tag's recipe colors resolve the same way.
- **The two cascades differ at recipe state styles.** In the app, recipe styles sit in a cascade layer, so any style
  prop beats any recipe style. The layer-free system leaves them unlayered, so a recipe's state rule (`_checked`,
  `_hover`) outranks a base prop by specificity. Set a state's styles under the same condition the recipe uses (the
  selected pill's border and ring under `_checked`), and the tests and the app agree. The focus ring is outside this
  seam: the recipe sets `--focus-ring-color` on the root itself, so a base `focusRingColor` prop wins in both
  cascades (a planning probe showed it in each).
- **Chakra's recipe defaults.** `createSystem(defaultConfig, …)` merges the project's recipes into Chakra's, keeping
  Chakra's variant order. The alert applies `variant` after `status`; the checkbox card's `outline` variant draws a
  checked inset ring in `colorPalette.solid` and its root's `focusVisibleRing` uses `colorPalette.focusRing`; the
  separator draws in `border`; the tag's default variant draws an inset ring in `colorPalette.muted`.
- **The `/login` baseline entry.** The baseline matches by route and rule alone, so while the entry stands it absorbs
  any `color-contrast` violation on `/login`, and matched violations are logged without their elements. Its recorded
  reason, white text on blue, matches no text in the registration notice. Task 2.2.d removes it once, when Marquee
  becomes the default, to find the element; the branch it takes decides whether the entry goes then or in task 5.1.
- **End-to-end runs.** Start this worktree's browsable stack with `node scripts/worktree.mjs browse` and run specs
  from `frontend/` with `E2E_BASE_URL` set to its address. The scans run in light mode only; dark-mode contrast rests
  on `verify-contrast`.
- **ADR numbers** are taken when each ADR is written; another work unit may take a number first.
- **Code comments** say what the code does; no requirement numbers, PRD sections or process names.

## Success Criteria

- [ ] 1. `npm run verify-contrast` (from `frontend/`) reports five themes × two modes and passes, with Marquee among
  them, and Marquee's adapter returns the values in R2 and R3 for the roles they list (checked against the tables).
  The script no longer checks Chakra's alert fills.
- [ ] 2. `verify-contrast` checks every pair R5 lists, on its surfaces and in the themes R5 names for it, and fails
  when any color in such a pair is changed to a value below that pair's threshold.
- [ ] 3. With nothing stored, `getInitialTheme()` returns `marquee` and Marquee is first in `themeRegistry`; with
  `cinexplorer-theme` set to `ibm-carbon`, it returns `ibm-carbon`.
- [ ] 4. `frontend/index.html` has `theme-color` values `#110E0A` and `#F2E8CE`, and contains no `#161616`.
- [ ] 5. Unit tests show, in both presentations: a scored TMDB score as an outlined chip whose dot resolves to
  `success`, `foreground` or `destructive` by the displayed value (7.47 → "7.5", good; 4.97 → "5.0", middle; 7.4 →
  middle; 4.9 → low); a score below 10 votes as the filled neutral chip with no dot and its existing labels; the dot
  hidden from assistive technology and the accessible text unchanged ("TMDB Rating: 7.5").
- [ ] 6. Unit tests show a user rating as the same chip with its thresholds (8 good, 7 and 5 middle, 4 low) and its
  labels "★ 8" beside a TMDB score and "★ 8/10" alone.
- [ ] 7. Unit tests show every certification badge with the `badge` background, and a selected certification-filter
  pill, for every rating, with the `tertiary` background, no inset ring, and a focus ring in `ring`;
  `CERTIFICATION_VARIANT_MAP` no longer exists.
- [ ] 8. Tests show a rendered alert, for each status, with no variant and with `variant="subtle"`, whose background
  resolves to its status color at 10% and whose root text resolves to `foreground`, not a Chakra palette color; and a
  rendered `FloatingAlert` with an action, whose action button's border resolves to `border-strong-02`.
- [ ] 9. A search of `frontend/src` outside `frontend/src/pages/dev/` and test files finds no `fg-muted`, `fg-error`,
  `colorPalette="accent"`, `colorPalette="gray"`, `borderColor="border"`, `color="fg"` or `color="black"`; a rendered
  movie card's title resolves to `foreground`; and a rendered movie detail page's separators resolve to
  `border-subtle-01`, and its genre and company tags draw no inset ring.
- [ ] 10. A search of `frontend/index.html`, `frontend/src`, `frontend/tests`, `frontend/scripts`, the style
  strategies and TECHNICAL-OVERVIEW finds no description of IBM Carbon as the default, of traffic-light or
  status-colored scores, of status-colored certifications, of the four design-system palettes as the only ones, of
  gold as the color of score displays or of one gold across all themes, or of `accent` or a `-foreground` name as a
  working role; the color-token strategy's adapter list and brand table, TECHNICAL-OVERVIEW § 3 and the root README
  name Marquee; the theme selector shows "Marquee".
- [ ] 11. Proven live: the pull request's end-to-end smoke job passes with its axe scans under Marquee, with no new axe
  baseline entry and without the `/login` `color-contrast` entry, and after merge the staging site renders the browse
  grid and a movie's detail page in Marquee in both modes, with dot chips for scores and neutral certifications.
