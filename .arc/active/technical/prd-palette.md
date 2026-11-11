# PRD: CineXplorer Default Palette

**Type:** Technical
**Form:** detailed · PRD
**Class:** Heavy
**Status:** Ready for Implementation
**Created:** 2026-11-10

---

## 1. Introduction/Overview

CineXplorer ships four palettes, each adapted from a public design system (GitHub Primer, IBM Carbon, GitLab Pajamas
and Material Design 3, built by `createUnifiedTheme` in `frontend/src/theme/color/index.ts`). IBM Carbon is the
default. None of them is CineXplorer's own, and the page layouts about to be rebuilt (the top bar and navigation, the
landing page, the legal pages) need the default palette settled first. The layout and type of the earlier design
reference stand: Space Grotesk for headings and Work Sans for text. Its proposed palette, based on the author's
portfolio site, made the app look like the portfolio and is not used.

This work adds CineXplorer's own palette, **Marquee**: antique brass on warm black, with a deep-cream light mode. It
reads as an old picture palace, warm and quiet, so the posters carry the color. Marquee becomes the default theme; the
four existing palettes stay selectable and unchanged.

Scores change with it. Today `getTmdbBadgeVariant` in `frontend/src/components/movie/MovieUserScore.tsx` fills TMDB
score badges with the status colors: `success` at 7.5 and up, `warning` from 5.0 to 7.4, `destructive` below 5.0, and
a neutral badge below `SCORE_DISPLAY_MIN_VOTES` (10). Three saturated fills compete with the posters, and a warm
accent lands beside one of them. Scores become a small colored dot beside a neutral number, certification badges
become neutral, and on movie surfaces color marks scores only. The work also corrects the color references that
resolve to no role in any theme, and the documentation that describes the replaced behavior.

## 2. Goals

1. CineXplorer has its own default palette, Marquee, in dark and light, with WCAG AA contrast in both modes, on every
   surface the app puts each color on: 4.5:1 for text, and 3:1 for strong borders, focus rings and score dots. Subtle
   borders are decorative and meet the contrast script's 1.3:1 visibility floor on surfaces at rest.
2. On movie surfaces, color marks scores only: a score is a colored dot beside a neutral number, and certification
   badges are neutral.
3. A score's color always agrees with the number shown.
4. Every color role a production component names resolves to a role the themes define, no color on a movie card or
   the movie detail page comes from a Chakra palette through a recipe default, and the documentation describes the
   shipped behavior.
5. The four existing palettes stay selectable and unchanged, and a visitor's stored theme choice is kept.

## 3. User Stories

- As a visitor browsing movies, I want a warm, quiet interface that lets the posters carry the color, so the app feels
  like a place for film rather than a generic platform.
- As a visitor scanning the browse grid, I want to see at a glance which films score well or poorly, without filled
  badges competing with the posters.
- As a visitor using light mode, I want the same warm character as dark mode, with text I can read.
- As a screen-reader user, I want a score read as its number, as it is today.
- As a visitor who chose another theme, I want my choice kept when the default changes.

## 4. Requirements

### Marquee palette

**R1.** A new theme, `marquee`, labeled "Marquee", joins the theme system: a `marquee` member in the `ThemeName`
union and a case in `createUnifiedTheme`'s switch (`frontend/src/theme/color/index.ts`), a Marquee adapter in
`frontend/src/theme/color/adapters/`, and a `marqueeTheme` entry in `frontend/src/theme/color/definitions.ts`. It
provides every `UnifiedTheme` role in both modes and adds no role to `UnifiedTheme`.

**R2.** Marquee's dark mode takes these values. Its layers lighten with elevation, as every theme's dark mode does.

| Role | Value |
| --- | --- |
| Page, card, panel, raised (`background`, `layer-01`, `layer-02`, `layer-03`) | `#110E0A`, `#191510`, `#221E18`, `#2D2721` |
| Text, secondary text (`foreground`, `on-muted`) | `#EFE9DC`, `#B1A898` |
| Main button and its label (`primary`, `on-primary`) | `#D1AF6B`, `#110E0A` |
| Links and focus ring (`tertiary`, `ring`) | `#D8BA7E` |
| Stars (`imdb-gold`) | `#DCB970` |
| `secondary`; `badge` | `#3A332B`; `#433C34` |
| `success`, `destructive`, `warning`, `info` | `#86C163`, `#D08F93`, `#FED071`, `#8DB4D6` |
| Labels on status fills (`on-success`, `on-destructive`, `on-warning`, `on-info`) | `#110E0A` |
| Border bases: subtle, strong | `#413B33`, `#736A5F` (per-layer values in R4) |

**R3.** Marquee's light mode takes these values. Its layers alternate two tones, with the lighter tone on cards and
raised surfaces: a deep-cream page and panel under pale-cream cards. The four existing palettes keep the opposite
order (the page is the lighter tone).

| Role | Value |
| --- | --- |
| Page and panel (`background`, `layer-02`) | `#F2E8CE` |
| Card and raised (`layer-01`, `layer-03`) | `#FBF6E9` |
| Text, secondary text (`foreground`, `on-muted`) | `#221E14`, `#5F594B` |
| Main button and its label (`primary`, `on-primary`) | `#755327`, `#FFFFFF` |
| Links and focus ring (`tertiary`, `ring`) | `#755327` |
| Stars (`imdb-gold`) | `#7F5806` |
| `secondary`; `badge` | `#D6C8A9`; `#DFD2B4` |
| `success`, `destructive`, `warning`, `info` | `#376A0D`, `#693137`, `#9C3A11`, `#2F5E86` |
| Labels on status fills (`on-success`, `on-destructive`, `on-warning`, `on-info`) | `#FFFFFF` |
| Border bases: subtle, strong | `#D3C5AA`, `#7C705B` (the same on every layer, R4) |

**R4.** Marquee's remaining roles follow `createCarbonAdapter` (`frontend/src/theme/color/adapters/ibm-carbon.ts`),
with Marquee's values:

- `popover` is `layer-02` with `foreground` on it; `muted` is `layer-01`.
- `brand` is `primary` with `on-primary` on it; `on-tertiary` is `on-primary`.
- `on-secondary`, `on-badge`, `on-button-subtle` and `on-button-subtle-selected` are `foreground`.
- The button roles map as Carbon's do: `button-outline` is the strong border on layer-01, `button-outline-primary` and
  `on-button-outline-primary` are `primary`, `button-subtle` is `secondary`, `button-subtle-selected` is layer-02's
  selected state.
- Hover, selected and active states for `layer-01`, `layer-02`, `primary` and `secondary` come from
  `deriveInteractionStates` in `frontend/src/theme/color/utils.ts`, over each surface's own text color.
- `tertiary-hover` and `tertiary-active` are `tertiary` adjusted with `adjustColor`, lighter in dark mode and darker in
  light, since Marquee has no published hover value; the active step is larger than the hover step.
- Borders come from `deriveBorderHierarchy` (same file): `progressive` in dark mode from `#413B33` and `#736A5F`,
  `alternating` in light mode from `#D3C5AA` and `#7C705B`.
- Shadows are Carbon's (`carbonShadows`), the backdrop is Carbon's, and `drag-active` and `drop-zone` come from
  `createExtensions` as in Carbon (secondary's hover state, and `muted`).
- `badge` and `imdb-gold` take R2's and R3's values, not `createExtensions`' (which sets `badge` to `muted` and the
  standard gold).

**R5.** Each element this work restyles has its rendered color pairs listed here, and `npm run verify-contrast`
(`frontend/scripts/verify-theme-contrast.ts`, run in CI) checks every listed pair. A pair the four existing palettes
already meet is checked in all five themes. A pair they do not meet, which this work leaves to them (§ 5), is checked
for Marquee alone: the script gains a way to limit a pair to named themes, and these pairs name Marquee.

| Element | Pair (threshold) | Surfaces | Themes |
| --- | --- | --- | --- |
| Score chip (R10) | dot: `success`, `foreground`, `destructive` (3:1) | `background`, `layer-01` to `layer-03`, `layer-hover-01`, `layer-hover-02` | all five |
| Score chip | number and star: `foreground` (4.5:1) | as the dot row | all five |
| Score chip | outline: `border-subtle-01` (1.3:1) | `background` | all five |
| Score chip | outline: `border-subtle-01` (1.3:1) | `layer-01` | Marquee |
| Selected certification pill (R16) | `tertiary` fill on `layer-01` (3:1); `on-tertiary` label on `tertiary` (4.5:1); focus ring: `ring` on `layer-01` (3:1) | the sub-navigation (`layer-01`) | all five |
| Certification badge (R15) | `on-badge` on `badge` (4.5:1) | — | all five |
| Error pages' main button (R17) | `on-primary` on `primary` (4.5:1) | — | all five |
| Grid's secondary text and loading spinner (R17) | `on-muted` (4.5:1) | `background` | all five |
| Detail page's dividers (R17) | `border-subtle-01` (1.3:1) | `background` | all five |
| Movie card's text (R17) | `foreground` (4.5:1) | `layer-01`, `layer-hover-01` | all five |
| GitHub logo (R17) | `foreground` (3:1) | its `layer-02` tile | all five (as text) |
| Status text, toast titles included | each status color as text (4.5:1) | `background`, `layer-01` to `layer-03` | all five |
| Toast (R17) | border: `border-subtle-01` (1.3:1) | `layer-03` | Marquee |
| Alert (R19) | title or heading: each status color as text (4.5:1); icon: the same color (3:1, held by the text pair); description: `foreground` (4.5:1) | its own 10% tint over `background` and `layer-01` to `layer-03` | all five |
| Alert | action button's label: `on-button-outline` (4.5:1) | as above | all five |
| Alert | action button's outline: `border-strong-02` (3:1); dismiss icon: `tertiary` (3:1) | as above | Marquee |

These pairs fall short and are accepted:

- Marquee's chip outline on a hovered light card measures 1.24:1. It is decorative: the dot and number carry the
  score, and the state is transient.
- In the four existing palettes the chip outline sits below 1.3:1 on a card in Carbon light (1.20:1) and Pajamas light
  (1.11:1), and at 1.03 to 1.10:1 on a hovered card in all four light modes and in Carbon and Pajamas dark. It is
  decorative there too, and their border values do not change (§ 5).
- In the four existing palettes the toast's `border-subtle-01` sits below 1.3:1 on `layer-03` in GitHub dark
  (1.15:1), Carbon (1.20:1 light, 1.23:1 dark) and Pajamas (1.11:1 light, 1.02:1 dark). Chakra's `border`, which
  the toast resolves to today, is itself below 1.3:1 there in every light mode and in Material Design 3 dark (1.04
  to 1.21:1), and just under it in GitHub dark. The change raises all of those but GitHub dark's, and lowers the dark
  borders of GitHub, Carbon and Pajamas (from 1.30, 1.91 and 1.55:1). The border is decorative: the toast's
  status-colored left edge and shadow mark it. The toaster overrides its recipe's `border-strong-02` (4.27 to
  4.50:1 in Marquee) to keep a light edge, as the theme menu and the genre popover keep subtle borders; a subtle role
  keeps that, and none clears `layer-03` in every theme (`border-subtle-02` measures 1.00:1 in Carbon dark).
- In the four existing palettes some alert action outlines and dismiss icons fall below 3:1 on the tints; R19
  records them.

### Default theme

**R6.** Marquee is the default theme: `defaultThemeName` in `frontend/src/theme/index.ts` is `marquee`, and Marquee is
the first entry of `themeRegistry`, so the theme selector lists it first. A theme choice stored under
`cinexplorer-theme` still selects that theme; a visitor with no stored choice gets Marquee. The test renderers'
default system (`defaultSystem`) becomes Marquee's.

**R7.** `frontend/index.html` paints Marquee before the app loads: the `theme-color` tags are `#110E0A` (dark) and
`#F2E8CE` (light), and the pre-paint background's default and every fallback value (now Carbon's `#161616`, in the
CSS and in both inline scripts) are `#110E0A`. A valid stored `cinexplorer-bg` still takes precedence.

**R8.** Every place that names the default theme or lists the themes includes Marquee. The known places:

- `ThemeSelector` (`frontend/src/components/common/ThemeSelector.tsx`), which shows each theme's `label` ("Marquee",
  "IBM Carbon") rather than its id (today `THEME_OPTIONS` takes the displayed text from `theme.name`, so the selector
  reads "ibm-carbon"), and whose fallback label becomes "Marquee";
- the theme list in `frontend/scripts/verify-theme-contrast.ts` and its header comment, which becomes 5 themes × 2
  modes = 10 variants;
- `ThemeDebug`'s theme switcher list and its two name maps (`frontend/src/pages/dev/theme-debug/ThemeDebug.tsx`), and
  the per-theme brand labels in `SemanticColorsSection.tsx` beside it, which name Marquee's brand as its brass
  `primary` (without an entry they fall back to another theme's label);
- the theme-name union in `getShadowValues` (`frontend/src/theme/color/shadows.ts`);
- the comments naming IBM Carbon the default in `frontend/src/theme/index.ts` and
  `frontend/src/theme/color/definitions.ts`, and `frontend/tests/README.md`'s description of the test renderers'
  default system.

A list or map of theme names found beyond these changes the same way.

**R9.** The theme documentation names Marquee: the color-token strategy's list of theme adapters and its
"Theme-Specific Availability" table of brand tokens (Marquee: `brand` is the brass `primary`, `brandSecondary` and
`brandTertiary` undefined), the Theme System paragraph of TECHNICAL-OVERVIEW § 3, and the root README's feature line
on the token system ("spanning four design systems"). The last two say that CineXplorer's own palette, Marquee, is
the default beside the four adapted design systems.

### Score display

**R10.** A scored TMDB score (`SCORE_DISPLAY_MIN_VOTES` votes or more) is an outlined chip with no fill, so it shows
the surface beneath: a `border-subtle-01` outline, an 8px dot in the tier's color, then the number in `foreground`, in
both the compact (card) and detailed (detail page) presentations. No status fill remains on a score.

**R11.** The tier is taken from the number as displayed (rounded to one decimal), not from the raw average: 7.5 and
up is good (`success` dot), 5.0 to 7.4 is middle (`foreground` dot), below 5.0 is low (`destructive` dot). An average
of 7.47 shows "7.5" with the good dot, and one of 4.97 shows "5.0" with the middle dot.

**R12.** A score with fewer than `SCORE_DISPLAY_MIN_VOTES` votes, or none, keeps today's filled neutral chip
(`badge` with `on-badge`), with no dot and no outline, and its existing labels: "—" on cards; "Not yet rated", or the
average with its count ("6.2 · 4 votes", "9.0 · 1 vote"), on the detail page.

**R13.** A user rating (`userRating`, a whole number from 1 to 10) uses the same chip with its own thresholds: 8 to 10
good, 5 to 7 middle, 1 to 4 low. Its label keeps the star in the number's color, "★ 8" beside a TMDB score and
"★ 8/10" alone, and the user-rating-only and combined presentations otherwise keep their current layout. No status
fill remains on a user rating.

**R14.** The dot is decorative: hidden from assistive technology. Each chip's accessible text is unchanged, the number
with its visually hidden prefix ("TMDB Rating: 7.5", "Your Rating: ★ 8"), and each chip keeps its `title`.

### Certifications

**R15.** `CertificationBadge` renders every certification (G, PG, PG-13, R, NC-17, NR) with the neutral `badge` /
`on-badge` pair the genre tags use. The per-rating status-color map, `CERTIFICATION_VARIANT_MAP` in
`frontend/src/components/movie/utils/certificationUtils.ts`, is removed along with the lookup that reads it.

**R16.** In `CertificationFilter` (`frontend/src/components/movie/browse/CertificationFilter.tsx`), a selected pill is
a `tertiary` fill with `on-tertiary` text and a `tertiary` border, for every rating, the way the genre filter's checked
boxes (`GenrePopover`) and the theme menu's current item already show selection. A selected pill shows no other ring:
Chakra's checkbox card defaults to its `outline` variant, whose checked state draws a 1px inset ring in
`colorPalette.solid` (the global palette is `gray`, so near-black in light mode and white in dark), and that ring is
removed, since the `tertiary` border already marks the selection. The pill's keyboard focus ring uses `ring`, as the
project's button, checkbox and switch recipes set it (`outlineColor: "ring"`), not the checkbox card's default
`colorPalette.focusRing` (Chakra's gray.400, 2.38:1 on Marquee light's `layer-01`). An unselected pill keeps its
`border-strong-01` outline and `on-muted` text, and the hover styles stay as they are. No pill uses a status color or a
Chakra palette color.

### Corrections

**R17.** Production components (everything under `frontend/src/` outside `frontend/src/pages/dev/` and tests) name
only color roles the themes define. The known misses:

- `colorPalette="accent"` on the main button in `frontend/src/pages/core/Forbidden.tsx` and `NotFound.tsx` names a
  palette no theme defines. It is removed: the button recipe's default solid variant already colors the button from
  `primary`.
- `fg-muted` in `GridHeader.tsx`, `GridEmptyState.tsx` and `VirtualizedMovieGrid.tsx` moves to `on-muted`; `fg-error`
  in `GridErrorState.tsx` to `destructive`; `borderColor="border"` in
  `frontend/src/components/core/chakra/toaster.tsx` to `border-subtle-01`.
- `LightMode` and `DarkMode` in `frontend/src/components/core/chakra/color-mode.tsx`, which nothing imports and which
  set Chakra's `fg` and raw `gray` palette, are removed.
- The GitHub logo on the sign-in loading screens (`frontend/src/pages/user/Login.tsx` and
  `frontend/src/components/layout/LoadingLayout.tsx`) is wrapped in Chakra's raw `color="black"`. `LoadingContent`
  shows it on a `layer-02` tile, where black is nearly invisible in dark mode (1.72:1 on Carbon's, 1.20:1 on
  Marquee's). It takes `foreground` instead (13.70:1 on Marquee's dark tile), so the mark stays monochrome: ink in
  light mode, ivory in dark. `LoadingLayout`'s comment calling black a brand exception goes with it.

On the movie card and the movie detail page no color comes from a Chakra recipe default either:

- `MovieCard`'s `Card.Root` (`frontend/src/components/movie/MovieCard.tsx`) sets its background and border but not its
  text color, so Chakra's card recipe colors the card's text, the title included, with Chakra's own `fg` (black in
  light mode, `gray.50` in dark). The card sets `foreground`.
- The detail page (`frontend/src/pages/movie/MovieDetail.tsx`) has four `Separator`s that set no border color, so
  Chakra's separator recipe draws them in its own `border` gray (1.04:1 on Marquee's light page). They take
  `border-subtle-01`, as the sub-navigation's and sidebar's separators already do.
- The detail page's genre and company tags (`Tag.Root` with `badge` and `on-badge`) keep the inset ring Chakra's tag
  recipe draws in `colorPalette.muted`, a gray. The ring is removed.

**R18.** Documentation and comments that describe replaced behavior are corrected:

- The doc comments in `frontend/src/theme/color/types.ts` that recommend `primary-foreground`,
  `secondary-foreground` or `accent`, and the color-token strategy's statements that the `accent` alias and the
  `-foreground` names still work for backward compatibility, say instead that those names were removed and point to
  `tertiary` and the `on-*` roles.
- The color-token strategy, the component-styling strategy, and the comments in `frontend/src/theme/recipes/badge.ts`,
  `types.ts`, `certificationUtils.ts`, `CertificationBadge.tsx` and `CertificationFilter.tsx`, and on the theme debug
  page (`CineXplorerExtensionsSection.tsx`, `FeedbackStatusSection.tsx`), describe the dot chip and neutral
  certifications instead of filled traffic-light scores and status-colored certifications.
- The component-styling strategy's "Light Mode Alternating Pattern" section, and the three statements of the expected
  light order (white, gray, white) in the theme debug page's `LayerSystemSection.tsx`, add Marquee's order: deep page,
  pale card.
- The guidance that user-rating stars use `imdb-gold` (the component-styling strategy's "User Personal Ratings"
  section, the color-token strategy's "User rating stars" rows, and the `imdb-gold` doc comment in `types.ts`) is
  narrowed to star icons, such as a row of rating stars; a user rating shown as a number takes the score chip (R13).
  The theme debug page's user-rating example (`CineXplorerExtensionsSection.tsx`), which hard-codes the standard
  golds "#785F05 / #F5C518", describes the theme's `imdb-gold` instead of fixed values. In
  `frontend/src/theme/color/extensions.ts`, the comments that assign rating tokens to "Movie score displays" and call
  the standard gold "consistent across all themes", and the doc block's stale star value (`#876B06`), say instead that
  `imdb-gold` colors star icons, and that `standardRatingColors` is the gold of the four adapted palettes while
  Marquee sets its own.
- The comment "Default: IBM Carbon dark" in `frontend/index.html`'s pre-paint script, and the header of
  `frontend/src/theme/color/palettes/cinexplorer-original.ts`, which lists the four design-system palettes as what
  the application uses, name Marquee.

The badge recipe keeps its `success`, `warning`, `error` and `info` variants for general status labels; only its
score and certification descriptions change.

**R19.** Alerts take their themed status tint in every theme. The alert recipe (`frontend/src/theme/recipes/alert.ts`)
sets each status's background to a 10% tint of the status color (`success/10`, `destructive/10`, `warning/10`,
`info/10`), but Chakra's default alert recipe, merged into the system by `createSystem`, applies its `subtle` variant
after the status variant: `alert` defaults to `variant: "subtle"`, whose root background is `colorPalette.subtle` and
whose root text is `colorPalette.fg`, from Chakra's raw red, green, blue and orange palettes. The themed tint and
`foreground` root text take precedence, so no alert color comes from a Chakra palette, both for `FloatingAlert` (no
variant passed) and for the error boundary's alert (`variant="subtle"`). The contrast script's checks against
Chakra's fills (`NATIVE_ALERT_SURFACES` and the pairs built on it) are removed, since no alert renders those fills; its
checks on the tints stay.

`FloatingAlert` (`frontend/src/components/common/FloatingAlert.tsx`) sets `border-strong-02`, the strong border for
raised surfaces, on its action button, in place of the outline variant's `button-outline` (`border-strong-01`); the
alert recipe gains no rule for buttons. The error boundary's "Report Issue" button sets its own `destructive` border
and text and keeps them: that is the status color on its own tint, checked as text (R5). The alert floats above the
page with its own tint and shadow, and `button-outline` falls below 3:1 on the tints over the page and a card: in
Marquee dark to 2.75:1 (it is 2.96:1 on Chakra's fills today), and in Carbon and Pajamas dark from 3.13:1 and 3.20:1
on Chakra's fills to 2.31:1 and 2.32:1. With `border-strong-02` the outline measures 3.33:1 or more (dark) and 3.39:1
or more (light) on Marquee's tints over every surface, and 3.49:1 or more on every dark palette's over the page and a
card.

In the four existing palettes every alert pair was measured on Chakra's fills and on the tints, for each status, over
the page and over a card, where alerts render: the title and icon, the description, the action button's outline and
label, and the dismiss icon, with text held to 4.5:1 and the rest to 3:1. Every title, icon, description, label and
dismiss icon passes on both. The action button's outline changes as follows:

- **Eight pairs newly fail,** all in light mode, where `border-strong-02` is the same color as `border-strong-01`:
  GitHub success and warning over the page and a card (3.14:1 to 2.96:1 and 2.79:1; 3.01:1 to 2.97:1 and 2.80:1),
  Carbon success over the page and a card (3.02:1 to 2.83:1 and 2.59:1), and Pajamas success and warning over a card
  (3.23:1 to 2.62:1; 3.09:1 to 2.61:1). They are accepted: those light strong borders sit at only 3.01 to 3.23:1 on
  Chakra's fills today, and the one alert in production that carries an action is the info alert, whose outline
  already fails in those three palettes (2.72 to 2.91:1) and over a card still does.
- **Twelve pairs fail before and after,** and stay with those palettes' borders (§ 5): destructive and info in GitHub
  and Carbon light, and warning in Carbon light, over the page and a card; destructive and info in Pajamas light over
  a card.
- **Four pairs go from failing to passing:** info in GitHub dark over the page and a card (2.97:1 to 4.65:1 and
  4.15:1), and destructive and info in Pajamas light over the page (2.90:1 to 3.01:1; 2.91:1 to 3.06:1).

Over panels and raised surfaces, where no alert renders, the existing palettes' dark outlines fall further (to 1.89:1
in Carbon) and Carbon's and Pajamas' dark dismiss icons fall below 3:1 (to 2.66:1 and 2.87:1); Marquee's pass there
too (R5).

## 5. Non-Goals (Out of Scope)

- **More palettes.** No palette beyond Marquee is added; others may follow after launch.
- **Layout.** The top bar and navigation, the landing page and the legal pages keep their current layout; they are
  rebuilt on this palette afterwards.
- **The existing palettes.** The four adapters' values and `UnifiedTheme`'s roles do not change (R18 changes only
  comments in `types.ts`). Their borders keep the shortfalls R5 and R19 record, which is why those pairs are checked
  for Marquee alone.
- **Score tokens.** No score-specific color roles are added; dots reuse `success`, `foreground` and `destructive`.
- **Light-mode first paint.** A first visit with the system in light mode still paints the dark page before the app
  loads, then switches once the app mounts, as it does under Carbon today. Choosing the pre-paint background by
  `prefers-color-scheme` is out of scope.
- **The color-mode provider.** `next-themes` and its console warning about a script tag are unchanged, and
  `index.html` keeps its inline scripts; no Content Security Policy is added.
- **Browse filters.** The certification filter's selected state changes only as R16 states; its design is revisited
  when the browse layout is rebuilt.
- **A white or ink accent.** No white fill (or ink fill in light mode) is used on any control.
- **Chakra defaults elsewhere.** Outside the movie card and the detail page, a few Chakra recipe defaults still draw
  Chakra's own colors in every theme, such as the sidebar list's keyboard-highlight outline (`border.emphasized`) and
  the landing page card's border and heading. Auditing them is separate work.

## 6. Technical Considerations

- **Stored state.** `cinexplorer-theme` is written only when a visitor picks a theme, so visitors who never picked
  one move to Marquee and the rest keep their choice. `cinexplorer-bg` holds the last background the app painted; on a
  returning visitor's first load after release, `index.html` paints that stored color (Carbon's `#161616` or
  `#ffffff`) until the app mounts and stores Marquee's. This one-time flash is accepted.
- **What checks find a missed place.** There are two `ThemeName` types. The union in
  `frontend/src/theme/color/index.ts` must gain `marquee` before `definitions.ts` can call
  `createUnifiedTheme("marquee", …)`. A missing case in `createUnifiedTheme`'s switch still type-checks, since its
  `default` throws, but it throws when `definitions.ts` loads, so any test that imports the theme fails. `ThemeName`
  in `frontend/src/theme/index.ts` is the registry's keys, so once Marquee is registered, the `Record<ThemeName, …>`
  maps in `ThemeDebug.tsx` fail type-checking until they gain it. The theme list in the contrast script, the union in
  `getShadowValues`, the brand labels and the comments are typed against neither, so they are found by search.
- **Tests and the default theme.** Component tests render with `defaultSystem` and compare resolved semantic
  variables (`MovieUserScore.test.tsx` compares a badge's background with `var(--chakra-colors-success)`), not
  Carbon's hex values, so they follow the new default. A test that tells two roles apart needs them to resolve to
  different values in Marquee; `success`, `foreground`, `destructive` and `badge` do.
- **End-to-end checks.** The browser smoke specs and their axe scans run under the default theme, so they run under
  Marquee from this change on. Marquee adds no entry to the axe baseline (`frontend/e2e/axe-baseline.ts`): a new
  violation is fixed, not listed. A baseline entry the run reports as unmatched under Marquee (the reporter logs it
  and does not fail) is removed. The baseline matches by route and rule alone (`frontend/e2e/axe.ts`), so its
  `/login` `color-contrast` entry would absorb any contrast violation on that page: under Marquee that entry is
  removed, and the `/login` scan passes without it. The scans run in light mode only (`playwright.config.ts` sets no
  color scheme); dark-mode contrast rests on `verify-contrast` (R5).
- **Where alerts may sit.** Alerts render over the page (the error boundary) or float over the page and the sign-in
  card (`FloatingAlert`). Their 10% status tint (R19) is translucent, so each pair's contrast depends on the surface
  beneath. R5 checks Marquee's alert pairs over all four surfaces, so a Marquee alert can sit on a panel or raised
  surface; in the existing palettes some outlines and dismiss icons fall below 3:1 there (R19).
- **Measured values.** Every value in R2 and R3 was measured with WCAG 2 contrast math, and a scratch Marquee adapter
  built from them passed `verify-contrast` as it stands on `main`, with status text and alert text over all four
  surfaces. The tightest status-text pair is light `success` on its alert tint over the page, 4.66:1; in dark mode it
  is `destructive` on its tint over a raised surface, 4.77:1. The lowest score-dot pair is light `success` on a
  hovered panel, 4.23:1.

## 7. Design Considerations

- **Character.** Warm and dark-first, with a warm light mode; refined and quiet, avoiding both the neutral-platform
  look and the black, white, red and yellow "movie" cliché. Brass marks the main action and links; scores carry the
  only other color on movie surfaces.
- **How far the look was checked.** A throwaway build of Marquee was viewed with real posters, in both modes, in the
  browse grid (good, middle and low scores) and on a signed-out detail page, and held up as a base for the layout
  work. Signed-in states (live action buttons, the certification filter's selected pills) were not viewed.
- **The dot at phone width.** The 8px dot read at card size in that build; it was not checked on a phone-width layout.
  The cards are rebuilt for small screens after this work, and the dot's size can change then.
- **A lighter cream.** A lighter light mode (page `#F5EEDD`, cards `#FCF9F1`) also passed every contrast pair. It is
  the alternative if the deep cream reads heavy once the new layouts land; this work ships the deep cream.

## 8. Design Decisions

1. **Marquee's direction.** Four directions were studied in dark and light against the design reference's layout,
   beside the portfolio-based proposal. Distances are OKLab color differences scaled by 100; under 8 reads as one
   color at button size. The portfolio-based coral shared the portfolio's look, didn't read as film, and sat 6.0 from
   the error red. Velvet (a claret main button, pale rose links) sat closest to the cliché, and its button stood only
   2.4:1 against the dark page. Nitrate (petrol teal) measured cleanest but read cooler than the aim. Screening Room
   (ivory, no accent) read as defaulted rather than chosen. Marquee's brass reads as film without being loud; its weak
   spot, amber 8.2 from brass, is removed by the neutral middle score and the neutral certifications.
   _ADR: the new Marquee ADR._
2. **Light mode stays, in deep cream, on alternating layers.** `Theme` (`frontend/src/theme/types.ts`) requires both
   modes, so dropping light mode was not an option. Of two cream levels that both passed every pair, the deeper one
   was chosen; the lighter one is the alternative in § 7. The layers alternate as ADR-008 sets for light modes, but
   with the lighter tone on cards and raised surfaces, which keeps the approved look of a deep page under pale cards.
   The stars were darkened from the studied `#9E711E` to `#7F5806` because the contrast script holds `imdb-gold` to
   4.5:1 as text; they now sit close to the brass links, and no production view renders stars yet.
   _ADR: the new Marquee ADR, which supersedes ADR-008 in part._
3. **Marquee's other roles follow Carbon.** Carbon's mapping is the one the layer system was designed around (ADR-006),
   so Marquee composes it rather than inventing one; it departs only where Marquee has its own values (badge, stars,
   borders from its own bases, tertiary states without a published hover). Carbon's route for `badge` (`muted`) would
   color the few-votes chip like the card under it; Marquee's `badge` sits 16.2 (dark) and 11.0 (light) from the
   card. On a hovered card the gap narrows, and the chip still reads apart by having no dot and no outline. Light
   `warning` is a rust (`#9C3A11`) rather than an amber because the alert and toast recipes use `warning` as title
   text. _ADR: the new Marquee ADR._
4. **Marquee becomes the default; the four palettes stay selectable.** Its id is `marquee`, its label "Marquee", and it
   comes first in the selector. ADR-006 anticipated a CineXplorer theme as the long-term default; this is it.
   _ADR: the new Marquee ADR, citing ADR-006._
5. **No white accent.** White fills (`#FCFAF6`, and ink in light mode) were tried on the on-watchlist button and on the
   current page in the top bar. They looked right in place but outweighed the brass main button, and the screens read
   more balanced without them. The black-and-white flip stays a candidate for a later place that needs a break in
   color: the white sits only 5.2 from the ivory text, so it works only as a fill, and it would need a role of its own,
   since `secondary` also colors the switch's off track (`switchRecipe` in `frontend/src/theme/recipes/switch.ts`).
   _ADR: recorded as a rejected alternative in the new Marquee ADR._
6. **Scores take the dot.** Filled badges are the loudest option, and three saturated fills compete with the posters; a
   plain number loses the quick read scores are meant to give. A colored dot beside a neutral number keeps the quick
   read with far less color. _ADR: the new score-display ADR._
7. **The middle dot takes the text color.** Of the three candidates, amber measured 2.5 to 2.8:1 on the light detail
   panel, under the 3:1 a graphic needs; grey (`on-muted`) fell to 4.4 from the low dot in light mode under
   color-blind simulation (with the study's dot colors). With the shipped colors, the closest pair of good, middle and
   low under color-blind simulation is 7.3 in dark (decision 20) and 9.8 in light. _ADR: the new score-display ADR._
8. **Dots reuse `success` and `destructive`.** One green and one red per mode pass both as an 8px dot (3:1) on every
   surface R5 lists for the dot, hovered ones included, and as status text (4.5:1) on every surface and tint R5
   checks for text. Dedicated score colors would keep a wider color-blind margin (12.4) but add roles to
   `UnifiedTheme` and to all four existing adapters. _ADR: the new score-display ADR._
9. **The chip.** Scored tiers share an outlined chip so a middle score (neutral dot, neutral number) still reads as a
   score; too few votes keeps the filled neutral chip with no dot, so it reads apart from a middle score. The outline
   is decorative: it fades to 1.24:1 on a hovered light card, which is accepted rather than darkening every light
   divider (a subtle base of `#CFC1A5` would reach 1.30:1 there), since the dot and number carry the score.
   _ADR: the new score-display ADR._
10. **The tier follows the number shown.** Comparing the raw average while the label rounds would show "7.5" with the
    middle dot; beside dots that reads as a bug. _ADR: the new score-display ADR._
11. **The user rating takes the dot too, and keeps its star.** Scores read the same wherever they appear. The star
    tells a user's rating apart from the TMDB score beside it; dropping it would leave two look-alike numbers. No
    production view passes `userRating` yet, so the path is proven by unit tests, and its first caller can revisit the
    label. The chip's "★" is text in the number's color; `imdb-gold` stays the color of star icons, such as a row of
    rating stars. _ADR: the new score-display ADR._
12. **The dot is decorative.** The number carries the score for every reader, and the filled badge's color was never
    announced either. Announcing a tier name ("high") would repeat what the number says and add tier names to define.
    _ADR: the new score-display ADR._
13. **Certifications become neutral.** With status colors on G, PG, PG-13, R and NC-17 beside the score, color on the
    detail page would mean two things; neutral certifications leave it meaning scores only, and take amber out of the
    page. The filter's selected pill drops its status fill too. A neutral `badge` fill was the first choice, but the
    filter sits on the sub-navigation (`layer-01`), and in GitHub Primer, IBM Carbon and GitLab Pajamas `badge` is
    `layer-01` itself (in Material Design 3 it sits only 1.05:1 away in light mode and 1.74:1 in dark), while
    `on-badge` is `on-muted` in all four; selecting a pill would mostly just remove its outline. It takes `tertiary`
    instead, the color the app already uses for a selected control, which stands 4.55:1 or more from `layer-01`, with
    its label 5.00:1 or more, in every theme.
    _ADR: the new score-display ADR for the badges; `none` for the filter pill (temporary, until the browse layout)._
14. **One change.** The palette, the score display, the neutral certifications and the corrections ship together: all
    concern how color is used on movie surfaces and whether every color reference resolves to the active palette. The
    font removal was a separate concern and shipped on its own, first. _ADR: `none` (meets none of the ADR
    criteria)._
15. **Every listed pair is checked by the contrast script.** The script on `main` checks status text and alert text in
    every theme, and the four existing palettes pass it, so each pair R5 lists is added there rather than to a
    separate test. The pairs those palettes do not meet (the chip outline on a card, the toast border, and the alert's
    action outline and dismiss icon) would fail the script if added for every theme, and fixing them is outside this
    work (§ 5), so the script gains a theme scope on a pair and these name Marquee; a later fix to those palettes
    widens the scope. _ADR: `none` (tactical, obvious from code)._
16. **Corrections and documentation.** The undefined roles, the unused color-mode exports, the recipe-default grays
    on the movie card and the detail page, and the stale descriptions are fixed where found. _ADR: `none` (tactical
    cleanup, obvious from code)._
17. **The badge recipe keeps its status variants.** Once scores and certifications stop using them, `success`,
    `warning`, `error` and `info` badges have no production caller, but they remain the recipe's general status
    labels and are shown on the theme debug page; removing them would narrow a shared component for no goal of this
    work. _ADR: `none` (obvious from code)._
18. **A one-time flash of the stored background is accepted.** Clearing or migrating `cinexplorer-bg` on release
    would add a versioned storage step to remove one frame of the previous theme's color on a returning visitor's
    first load. _ADR: `none` (tactical)._
19. **Alerts take the themed tint.** Chakra's default alert recipe has been overriding the project's status tint with
    its raw palette fills in every theme. Keeping those fills would put cool raw reds and blues under Marquee and
    leave alert colors outside the palette; restoring the tint the recipe already declares keeps every alert color in
    the active theme. The tint lowers the contrast of a neutral button outline inside an alert, so `FloatingAlert`'s
    action takes the raised surface's strong border (`border-strong-02`) rather than accepting a sub-3:1 outline in
    Marquee or narrowing Goal 1 to exempt it. In the existing palettes' light modes that border is the same color as
    `button-outline`, so some light-mode outline pairs newly fail; R19 lists them and accepts them, since the only
    alert in production that carries an action is an info alert. A `foreground` border would clear every tint but
    would depart from the button system's neutral outline for one control.
    _ADR: `none` (tactical styling: restores the recipe's documented tint and sets one control's border; obvious from
    code)._
20. **Dark `destructive` is lighter than the draft's.** The contrast script on `main` holds `destructive` as text on a
    hovered raised surface (`layer-hover-02`) and every status color as an alert title on its tint over panels and
    raised surfaces; the draft's `#BE7E82` measured 3.70:1, 4.46:1 (`layer-02`) and 3.96:1 (`layer-03`) there.
    `#D08F93` keeps its hue and chroma and only lightens, to within one 8-bit step of the least that passes: 4.57:1
    on `layer-hover-02` and 4.77:1 on its tint over `layer-03`. It narrows the dots' closest pair under color-blind
    simulation in dark mode from 10.9 to 7.3, still well above the 4.4 at which the draft rejected a grey middle dot.
    A lower-chroma rose-mauve (`#C292A0`) passes and keeps 9.7, but reads greyer and less as a warning red.
    _ADR: the new Marquee ADR, with the rejected rose-mauve._

**ADRs this work delivers:**

- **New: "Adopt Marquee as the default palette"** (decisions 1 to 5 and 20). It cites ADR-006 and supersedes ADR-008
  in part: for Marquee, light layers alternate with the lighter tone on cards and raised surfaces. ADR-008's status
  becomes `Accepted; Superseded in part by` the new ADR.
- **New: "Mark scores with a colored dot"** (decisions 6 to 13): on movie surfaces, color marks scores only. It
  supersedes ADR-003 in part, its assignment of the gold rating token to score displays (TMDB scores, and user
  ratings shown as a number); star icons keep `imdb-gold`. ADR-003's status becomes `Accepted; Superseded in part by`
  the new ADR.

Both are numbered when written, are written reading `Proposed` with the implementation, and are set to `Accepted`
before the work merges.

## 9. Success Criteria

1. `npm run verify-contrast` (from `frontend/`) reports five themes × two modes and passes, with Marquee among them,
   and Marquee's adapter returns the values in R2 and R3 for the roles they list (checked against the tables). The
   script no longer checks Chakra's alert fills.
2. `verify-contrast` checks every pair R5 lists, on its surfaces and in the themes R5 names for it, and fails when any
   color in such a pair is changed to a value below that pair's threshold.
3. With nothing stored, `getInitialTheme()` returns `marquee` and Marquee is first in `themeRegistry`; with
   `cinexplorer-theme` set to `ibm-carbon`, it returns `ibm-carbon`.
4. `frontend/index.html` has `theme-color` values `#110E0A` and `#F2E8CE`, and contains no `#161616`.
5. Unit tests show, in both presentations: a scored TMDB score as an outlined chip whose dot resolves to `success`,
   `foreground` or `destructive` by the displayed value (7.47 → "7.5", good; 4.97 → "5.0", middle; 7.4 → middle;
   4.9 → low); a score below 10 votes as the filled neutral chip with no dot and its existing labels; the dot hidden
   from assistive technology and the accessible text unchanged ("TMDB Rating: 7.5").
6. Unit tests show a user rating as the same chip with its thresholds (8 good, 7 and 5 middle, 4 low) and its labels
   "★ 8" beside a TMDB score and "★ 8/10" alone.
7. Unit tests show every certification badge with the `badge` background, and a selected certification-filter pill,
   for every rating, with the `tertiary` background, no inset ring, and a focus ring in `ring`;
   `CERTIFICATION_VARIANT_MAP` no longer exists.
8. Tests show a rendered alert, for each status, with no variant and with `variant="subtle"`, whose background
   resolves to its status color at 10% and whose root text resolves to `foreground`, not a Chakra palette color; and a
   rendered `FloatingAlert` with an action, whose action button's border resolves to `border-strong-02`.
9. A search of `frontend/src` outside `frontend/src/pages/dev/` and test files finds no `fg-muted`, `fg-error`,
   `colorPalette="accent"`, `colorPalette="gray"`, `borderColor="border"`, `color="fg"` or `color="black"`; a rendered
   movie card's title resolves to `foreground`; and a rendered movie detail page's separators resolve to
   `border-subtle-01`, and its genre and company tags draw no inset ring.
10. A search of `frontend/index.html`, `frontend/src`, `frontend/tests`, `frontend/scripts`, the style strategies and
    TECHNICAL-OVERVIEW finds no description of IBM Carbon as the default, of traffic-light or status-colored scores,
    of status-colored certifications, of the four design-system palettes as the only ones, of gold as the color of
    score displays or of one gold across all themes, or of `accent` or a `-foreground` name as a working role; the
    color-token strategy's adapter list and brand table, TECHNICAL-OVERVIEW § 3 and the root README name Marquee; the
    theme selector shows "Marquee".
11. Proven live: the pull request's end-to-end smoke job passes with its axe scans under Marquee, with no new axe
    baseline entry and without the `/login` `color-contrast` entry, and after merge the staging site renders the
    browse grid and a movie's detail page in Marquee in both modes, with dot chips for scores and neutral
    certifications.

## 10. Open Questions

None.
