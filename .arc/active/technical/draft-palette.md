# Draft: CineXplorer Default Palette

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-10

**Purpose:** Design CineXplorer's own default palette, "Marquee", in dark and light, and settle how movie scores use
color, before the navigation shell and page layouts build on it. This is the first item of the ROADMAP's Stage 4
design track.

---

## Problem / Motivation

The app ships four palettes, all adapted from public design systems (`createUnifiedTheme` in
`frontend/src/theme/color/index.ts`: GitHub Primer, IBM Carbon, GitLab Pajamas and Material Design 3). None of them is
CineXplorer's own. The layout work that follows (the navigation shell, the landing page and the legal pages) needs the
default palette settled first.

CineXplorer is hosted on the author's portfolio site, whose default palette is Remedy. An earlier design reference
settled the layout and type (Space Grotesk for headings, Work Sans for text) and proposed a Remedy-based palette. That
palette made the app look like the portfolio, so its colors are replaced here; the layout and type stand.

What the palette aims for:

- Warm and dark-first, with a warm light mode.
- Refined and quiet, so the posters carry the color. It should have some personality, but avoid both the generic
  neutral-platform look and the black, white, red and yellow "movie" cliché.
- WCAG AA contrast in both modes.

Scores are part of the problem. `getTmdbBadgeVariant` in `frontend/src/components/movie/MovieUserScore.tsx` fills TMDB
score badges with the status colors: `success` at 7.5 and up, `warning` from 5.0 to 7.4, `error` below 5.0, and a
neutral badge below `SCORE_DISPLAY_MIN_VOTES`. A warm accent lands beside one of those three. ADR-003, meanwhile,
still assigns scores the gold rating token, which no longer matches the code.

## Alternatives

**Palette direction.** Four directions were studied against the design reference's layout, each in dark and light,
alongside the Remedy-based proposal. Distances below are color differences in OKLab, scaled by 100: under 8 reads as
one color at button size.

- **Remedy-based (earlier proposal):** coral accent on near-neutral warm surfaces. Rejected: it shares the portfolio's
  look, coral doesn't read as film, and coral sat 6.0 from the error red.
- **Marquee (chosen to develop):** antique brass on warm black. It reads as an old picture palace, classic without
  being loud. Its weak spot is amber, 8.2 from brass. A neutral middle score takes amber out of the scores, but
  `warning` still fills the PG-13 certification badge (decision 5 makes them neutral).
- **Velvet:** a deep claret main button with pale rose links and stars. It was the warmest of the four, but muted red
  on black sits closest to the cliché, and the claret button stood only 2.4:1 against the dark page.
- **Nitrate:** petrol teal on warm blacks. It measured cleanest, but reads cooler than the aim.
- **Screening Room:** no accent; ivory on warm black. It read as defaulted rather than chosen.

**Score treatment.**

- **Filled badges (today):** the loudest option. Three saturated fills compete with the posters.
- **A colored dot beside a neutral number (chosen):** it keeps a quick read with far less color on the page.
- **A plain number:** loses the quick read the scores are meant to give.

## Decisions

Readiness is `formalization-ready`: every design decision below is settled.

### Resolved

1. **Direction: Marquee.** Its dark values:

   | Role | Value |
   | --- | --- |
   | Page, card, panel, raised (`background`, `layer-01` to `layer-03`) | `#110E0A`, `#191510`, `#221E18`, `#2D2721` |
   | Border, strong border | `#413B33`, `#736A5F`, derived per layer (decision 15) |
   | Text, secondary text (`foreground`, `on-muted`) | `#EFE9DC`, `#B1A898` |
   | Main button, its label (`primary`, `on-primary`) | `#D1AF6B`, `#110E0A` |
   | Links, focus ring (`tertiary`, `ring`) | `#D8BA7E` |
   | Stars (`imdb-gold`) | `#DCB970` |

   Dark layers lighten with elevation, as ADR-006 and ADR-008 set for every theme. ADR disposition: decision 18.

2. **Light mode stays, in deep cream, on alternating layers.** `Theme` in `frontend/src/theme/types.ts` requires both
   `lightUnified` and `darkUnified`. Of the two cream levels studied, both passing every contrast pair, the deeper one
   is chosen. The layers alternate two tones as ADR-008 sets for light modes, but with the lighter tone on cards and
   raised surfaces rather than on the page, which keeps the approved look of a deep page under pale cards:

   | Role | Value |
   | --- | --- |
   | Page and panel (`background`, `layer-02`) | `#F2E8CE` |
   | Card and raised (`layer-01`, `layer-03`) | `#FBF6E9` |
   | Border, strong border (all layers) | `#D3C5AA` (1.39:1 on the page), `#7C705B` (3.98:1 on the page) |
   | Text, secondary text (`foreground`, `on-muted`) | `#221E14`, `#5F594B` |
   | Main button, its label (`primary`, `on-primary`) | `#755327`, `#FFFFFF` |
   | Links, focus ring (`tertiary`, `ring`) | `#755327` |
   | Stars (`imdb-gold`) | `#7F5806` |

   The repository's contrast check (`frontend/scripts/verify-theme-contrast.ts`) holds `imdb-gold` to 4.5:1 as text,
   which darkened the light-mode stars from the studied `#9E711E`; they now sit close to the brass links. No
   production view renders stars yet.

   The lighter cream (page `#F5EEDD`, cards `#FCF9F1`) also worked, and is the fallback if the deep cream reads heavy
   once the new layouts land.

3. **Scores take the dot treatment:** a small colored dot beside a neutral number, in place of a filled badge.
   Decision 9 gives the chip's anatomy.

4. **The middle score's dot takes the text color,** ivory in dark mode and ink in light, instead of amber. It measured
   best of the three candidates studied: with the study's dot colors, grey (`on-muted`) fell to 4.4 against the low
   score in light mode under color-blind simulation, and amber measured 2.5 to 2.8:1 on the light detail panel,
   under the 3:1 a graphic needs. With decision 14's colors, the closest pair of good, middle and low is 10.9 in dark
   and 9.8 in light.

5. **Certification badges become neutral.** `CERTIFICATION_VARIANT_MAP` in
   `frontend/src/components/movie/utils/certificationUtils.ts` fills ratings with status colors (G success, PG info,
   PG-13 warning, R and NC-17 error), and `CertificationBadge` renders them on the detail page beside the score. They
   move to the neutral `badge` / `on-badge` pair the genre tags use, so color on the detail page means scores only.
   This also takes amber, 8.2 from brass, out of the page.

6. **No white accent in this work.** White fills (`#FCFAF6`, and ink in light mode) were studied on the
   on-watchlist button and on the current page in the top bar. They looked right in place but outweighed the brass
   main button, and the screens read more balanced without them. The black-and-white flip stays a candidate for a
   later place that needs a break in color. Two facts carry forward: the white sits only 5.2 from the ivory body
   text, so it works only as a fill; and it would need a token of its own, since `secondary` also colors the
   switch's off track (`switchRecipe` in `frontend/src/theme/recipes/switch.ts`).

7. **Boundary: stays one work unit.** The palette, the score treatment, the neutral certification badges and the
   corrections in decision 13 are one concern: how color is used on movie surfaces, and whether every color reference
   resolves to the active palette. The font removal is a separate concern and leaves for its own errand (decision 12).
   The forecast change is well under the size marks: one new adapter, the theme registry and its readers, the score
   component, and the corrections.

8. **The user-rating path takes the dot too.** `getUserRatingBadgeVariant` in `MovieUserScore.tsx` fills "★ 8" with
   green, amber and red. No production view passes `userRating` yet; its first caller will come with the user-rating
   interface. The path moves to the same chip as TMDB scores (decision 9), keeping its own thresholds (8 and up good,
   under 5 low), so scores read the same wherever they appear.

9. **The score chip.** Every scored tier (good, middle and low) is an outlined chip: a `border-subtle-01` outline, an
   8px dot, then the number in `foreground`. Too few votes (below `SCORE_DISPLAY_MIN_VOTES`) or none keeps the filled
   `badge` / `on-badge` chip with no dot and its existing labels ("—" on cards; "Not yet rated" or "6.2 · 4 votes" on
   the detail page), so it reads apart from a neutral middle score.

10. **The score color follows the number shown.** `getTmdbBadgeVariant` compares the raw average while the label
    rounds to one decimal, so a film averaging 7.499 shows "7.5" with the middle dot, and one just under 5.0 shows
    "5.0" with the low dot. The filled badges had the same mismatch; beside dots it reads as a bug. The tier is taken
    from the rounded value.

11. **Marquee becomes the default theme,** and the four existing palettes stay selectable. Every place that names the
    default or lists the themes changes with it:
    - `defaultThemeName` and `themeRegistry` in `frontend/src/theme/index.ts`;
    - the `ThemeName` union and `createUnifiedTheme`'s switch in `frontend/src/theme/color/index.ts`, and a
      `marqueeTheme` entry in `frontend/src/theme/color/definitions.ts`;
    - `frontend/index.html`: its two `theme-color` tags and the background painted before the app loads, which
      hard-code Carbon's `#161616` and `#ffffff`;
    - `ThemeSelector`'s "IBM Carbon" fallback label;
    - the theme list in `frontend/scripts/verify-theme-contrast.ts`, and its header comment ("4 themes × 2 modes");
    - `ThemeDebug`'s theme switcher list and its two name maps, and the per-theme brand labels in
      `SemanticColorsSection.tsx`, which would otherwise call Marquee's brand "Material Purple";
    - `getShadowValues`' own list of theme names in `frontend/src/theme/color/shadows.ts` (exported, no caller);
    - the color-token strategy's list of theme adapters and its "Theme-Specific Availability" table of brand tokens,
      which each gain Marquee;
    - comments naming Carbon the default in `frontend/src/theme/index.ts` and `frontend/src/theme/color/definitions.ts`,
      and `frontend/tests/README.md`, which describes the test renderers' default system as IBM Carbon.

    The smoke specs' accessibility scans then run under Marquee.

12. **Inter and Source Sans 3 leave in their own errand,** run before this work's implementation, since both touch
    `MovieCard.tsx` and `MovieUserScore.tsx`. The sweep for it: the two `@font-face` rules each in
    `frontend/src/App.css`; the `inter` and `sourcesans` font tokens in `frontend/src/theme/index.ts`; `fontFamily`
    uses in `MovieCard.tsx`, `MovieUserScore.tsx`, `GridHeader.tsx`, `SortDropdown.tsx` and `QuickBrowseBar.tsx`, and
    throughout the development page `TypographyDebug.tsx`; and the font files under `frontend/src/assets/fonts/`.
    Their text moves to Work Sans. Type-checking does not catch a removed font token, so the sweep is by search.

13. **Color references and docs that no longer match are corrected here.**
    - `Forbidden.tsx` and `NotFound.tsx` pass `colorPalette="accent"`, which no theme defines.
    - Color names that are not `UnifiedTheme` roles: `fg-muted` in `GridHeader.tsx`, `GridEmptyState.tsx` and
      `VirtualizedMovieGrid.tsx`, `fg-error` in `GridErrorState.tsx`, and `border` in `toaster.tsx`. They move to
      `on-muted`, `destructive` and `border-subtle-01`.
    - `LightMode` and `DarkMode` in `frontend/src/components/core/chakra/color-mode.tsx`, which nothing imports, set
      Chakra's `fg` and the raw `gray` palette. They are removed.
    - Doc comments in `frontend/src/theme/color/types.ts` and the color-token strategy still describe the removed
      `accent` alias and `-foreground` names.
    - The color-token and component-styling strategies, and comments in `badge.ts`, `types.ts`,
      `certificationUtils.ts`, `CertificationBadge.tsx`, `CertificationFilter.tsx` and the theme debug page, describe
      filled traffic-light scores and status-colored certifications. They change to the dot chip and neutral
      certifications.
    - The component-styling strategy's "Light Mode Alternating Pattern" section gives the page as the lighter tone,
      and the theme debug page's `LayerSystemSection.tsx` states "white → gray → white" as the expected light order
      in three places. Both add Marquee's order (decision 2).

14. **Score dots reuse `success` and `destructive`;** the middle dot uses `foreground`. One green and one red per mode
    pass as an 8px dot (3:1) and as text (4.5:1) on every surface and tint the app puts them on: page, cards and
    panels; toasts, which sit on `layer-03` with the title in the status color
    (`frontend/src/components/core/chakra/toaster.tsx`);
    and alerts, whose title sits on a 10% tint of the status color over the page or a card
    (`frontend/src/theme/recipes/alert.ts`).

    | Mode | `success` | `destructive` | Labels on fills |
    | --- | --- | --- | --- |
    | Dark | `#86C163` | `#BE7E82` | `#110E0A` |
    | Light | `#376A0D` | `#693137` | `#FFFFFF` |

    The tightest pairs: dark `destructive` on a toast, 4.56:1; light `success` on its alert tint, 4.64:1. The closest
    pair of good, middle and low under color-blind simulation is 10.9 in dark and 9.8 in light, against 12.4 for
    dot-only colors; dedicated score tokens would keep 12.4 but add tokens to `UnifiedTheme` and all four existing
    adapters.

15. **Marquee's other roles.** Marquee maps every `UnifiedTheme` role the way `createCarbonAdapter` does, with these
    values and exceptions:
    - `warning`: dark `#FED071` with an ink label; light `#9C3A11` (a rust, since the alert and toast recipes also use
      `warning` as title text) with a white label.
    - `info`: dark `#8DB4D6` with an ink label; light `#2F5E86` with a white label.
    - `secondary`: dark `#3A332B`, light `#D6C8A9`, with `on-secondary` = `foreground` in both modes.
    - `badge`: dark `#433C34`, light `#DFD2B4`, with `on-badge` = `foreground` (8.97:1 and 11.09:1). Carbon's route
      (`createExtensions` setting `badge` to `muted`) would color the few-votes chip like the card under it; these
      values sit 16.2 (dark) and 11.0 (light) from the card. On a hovered card the gap narrows, and the chip still
      reads apart by having no dot and no outline.
    - `imdb-gold`: the stars in decisions 1 and 2, not `createExtensions`' standard gold.
    - Borders come from `deriveBorderHierarchy`: progressive in dark from `#413B33` and `#736A5F`, alternating in
      light from `#D3C5AA` and `#7C705B`.
    - As in Carbon: `popover` is `layer-02`, `muted` is `layer-01`, hover, selected and active states come from
      `deriveInteractionStates`, and shadows are Carbon's.

    Every status color passes 4.5:1 as text on the surfaces and tints in decision 14.

16. **The certification filter keeps the neutral fill for a selected pill.** `CertificationFilter` fills a selected
    pill with its badge color and outlines an unselected one in `border-strong-01`; with every rating neutral, selected
    is a `badge` fill with `on-badge` (full-strength) text against an outline with muted text. The browse filters are
    redesigned with the layout, which can revisit it.

17. **Contrast coverage.** `frontend/scripts/verify-theme-contrast.ts` tests status colors only under their `on-*`
    labels and as tinted backgrounds, not as text on a surface. Marquee's values were measured as text by hand.
    Tested as text on page, card and panel, the four existing palettes fail: `success` and `destructive` in nine
    pairs (3.44 to 4.48:1), and all four status colors in 23 (1.53 to 4.48:1; IBM Carbon's light `warning` titles
    are about 1.5:1). The toast and alert surfaces in decision 14 add more. That is a separate concern this work
    leaves to its own fix.

18. **ADR dispositions.**
    - **A new ADR adopting Marquee as the default palette** covers decisions 1, 2, 6 (recorded as a rejected
      alternative), 11 and 15. It is the "CineXplorer Custom Theme" ADR that ADR-006 anticipates as the long-term
      default, so it cites ADR-006 rather than superseding it. It supersedes ADR-008 in part: for Marquee, the light
      layers alternate with the lighter tone on cards and raised surfaces.
    - **A new ADR on score display, superseding ADR-003's assignment of the gold rating token to scores,** covers
      decisions 3, 4, 5, 8, 9, 10 and 14: on movie surfaces, color marks scores only.
    - **`none`** for decisions 7 and 17 (they meet none of the five criteria: a delivery boundary, and a measurement
      record that changes nothing), 12 and 13 (tactical cleanup and corrections, obvious from code) and 16
      (temporary, until the browse layout).

### Open

None.

### Next

The PRD, which formalizes these decisions.

### Success Signal

Marquee is the default theme: the browse grid and the movie detail page render in it in both modes, the
background painted before the app loads on a first visit is Marquee's dark page, and `npm run verify-contrast`
passes for all five themes. TMDB scores show the outlined dot chip, with the dot's tier matching the rounded number,
and the user-rating path does the same in its unit tests. No certification badge uses a status color, and no
component outside the development pages (`frontend/src/pages/dev/`) names a color role the themes do not define.

## Unknowns and Assumptions

- **Film feel is checked only roughly.** A throwaway build of Marquee was viewed with real posters, in both modes, in
  the browse grid (high, middle and low scores) and on a signed-out detail page. It held up as a base for the
  layout work. Signed-in states (live action buttons, the certification filter's selected pills) were not viewed,
  and the current layout is due for an overhaul, so the rest of the film-feel judgment moves to that work.
- **The contrast figures are measured, not yet shipped.** A rough build with the dark values and an earlier,
  four-tone light layering passed `npm run verify-contrast`. The alternating light layers (decision 2) and the
  status values (decisions 14 and 15) were measured with the same WCAG math but not yet built.
- **An 8px dot reads at card size** in screenshots of the rough build; it was not checked on a phone-width layout.

## Scope Boundary (Won't Do)

- Further palettes (Gruvbox, Rouge): after launch.
- Layout: the navigation shell, landing page and legal pages follow this work.
- The `next-themes` script warning belongs to the navigation shell. The Content Security Policy comes after the shell.
- The four existing adapters do not change: this work adds no tokens.
- Their status colors' contrast as text (decision 17) is a separate fix.
- Removing Inter and Source Sans 3 is its own errand (decision 12).
- The browse filters' selected-state design (decision 16) waits for the browse layout.
- A first visit with the system in light mode paints dark before the app loads, as it does under Carbon today; it
  goes with the navigation shell's color-mode work.
- A white or ink accent (decision 6).
