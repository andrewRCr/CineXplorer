# ADR-041: Adopt Marquee as the Default Palette

## Status

Accepted (2026-11-11)

Supersedes ADR-008 in part: Marquee's light layers put the lighter tone on cards and raised surfaces.

## Context

CineXplorer's four palettes adapt public design systems. The application needs its own visual identity, warm and
quiet enough for film posters to carry the color. ADR-006 anticipated a CineXplorer default while establishing
Carbon's layer-based elevation architecture.

The alternatives have different costs:

- Portfolio-derived coral repeats the portfolio's identity and sits too close to error red.
- Velvet's claret is close to a familiar cinema cliché and its dark main button has only 2.4:1 contrast.
- Nitrate's petrol teal passes contrast but feels cooler than the intended character.
- Screening Room's ivory without an accent reads as an unchosen default.
- A white accent outweighs the brass main action and needs a new role: `secondary` also colors switch tracks.
- Dropping light mode conflicts with the theme contract. A lighter cream passes contrast but lacks the chosen
  deep-cream character; it remains an option if the layouts later feel heavy.

Carbon's mapping already supplies the required roles. Its badge extension would match a card surface, so a separate
neutral badge fill is needed. Gold stars must meet text contrast in light mode. Dark destructive text also needs to
clear hovered panels and tinted raised surfaces: `#BE7E82` fails those pairs. The lighter `#D08F93` passes, while
rose-mauve `#C292A0` would preserve more color-blind separation but reads greyer and less like warning red.

## Decision

We will make Marquee, antique brass on warm black with a deep-cream light mode, CineXplorer's default palette.
We will retain the four adapted palettes and preserve stored theme choices.

Marquee will compose Carbon's surface and button mapping, border and interaction helpers, and conservative shadows,
with its own colors. Dark layers progressively lighten. Light layers alternate a deep-cream page and panel with
pale-cream cards and raised surfaces, reversing the adapted palettes' tone order. Badge fills and star gold take
Marquee's own values; light warning is rust so it can also serve as readable status text. Dark destructive is
`#D08F93`; light star gold is `#7F5806`. We will add no role or white accent.

## Consequences

### Positive

- CineXplorer has a distinct identity while posters remain visually prominent.
- Both modes meet the checked text, focus, graphic and border contrast requirements.
- Shared mappings keep components independent of palette and avoid changing existing theme values.

### Negative

- The deep cream may feel heavy after future layout changes.
- The lighter dark destructive narrows color-blind separation between score-dot colors; the closest simulated
  separation is 7.3 rather than 10.9 with the darker red.
- Decorative chip borders remain below the visibility floor on hovered light cards, and existing palettes retain
  their accepted border shortfalls.
- Returning visitors can briefly see their stored previous background before the app paints Marquee.
