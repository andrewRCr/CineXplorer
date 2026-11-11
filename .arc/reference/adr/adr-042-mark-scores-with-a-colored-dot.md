# ADR-042: Mark Scores with a Colored Dot

## Status

Proposed

Supersedes ADR-003 in part: its assignment of gold to numeric TMDB and user score displays. Star icons keep gold.

## Context

Filled green, amber and red score badges compete with movie posters and put amber beside Marquee's brass accent.
Certification colors give color a second meaning on movie surfaces. Plain numbers would lose the score's quick read.
Numeric user ratings also need to remain distinguishable from a TMDB score beside them.

Amber dots fail graphic contrast on light surfaces; a muted-gray middle dot is poorly separated from red under
color-blind simulation. Dedicated score roles could preserve more separation but would add roles to every adapter.
Comparing raw averages while displaying rounded numbers can show "7.5" with the middle tier.

## Decision

We will use an outlined, unfilled chip with a neutral number and an 8px colored dot for numeric scores. On movie
surfaces color will mark scores only; certifications will use neutral badges.

TMDB tiers follow the value displayed to one decimal: at least 7.5 uses `success`, 5.0–7.4 uses `foreground`, and
below 5.0 uses `destructive`. Fewer than 10 votes retain the filled neutral chip without a dot, with the existing
placeholder, average/count or no-votes label. Numeric user ratings use the same chip with thresholds at 8 and 5;
labels keep a neutral star, "★ 8" beside TMDB and "★ 8/10" alone. Gold remains for star icons such as a row of stars.

The chip outline uses `border-subtle-01`; the number uses `foreground`. We will reuse status roles for the good and
low dots, holding their graphic contrast on actual and hovered surfaces to 3:1. The middle dot uses `foreground`.
The dot is decorative and hidden from assistive technology. Titles and visually hidden explanations stay unchanged.

## Consequences

### Positive

- Scores retain a quick tier signal with less color competing with posters.
- The tier agrees with the number shown, including rounding boundaries.
- Neutral certifications leave color with one meaning on movie surfaces.
- Shared roles preserve the theme interface and the existing palettes.

### Negative

- Good and low dots have less separation under color-blind simulation than dedicated score colors would provide.
- Decorative outlines fade below the visibility floor on hovered light cards; the number and dot carry the score.
- The dot has not yet been assessed in the future phone-width card layout.
- No production caller currently supplies a numeric user rating; its first caller may revisit the star label.
