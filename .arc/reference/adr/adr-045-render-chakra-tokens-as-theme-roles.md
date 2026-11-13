# ADR-045: Render Chakra's own tokens as theme roles

## Status

Accepted (2026-11-13)

## Context

Chakra's recipes and global styles color a component with Chakra's own semantic names: `bg`, `fg` and `border`
with their variants, the `gray` palette (the page's default `colorPalette`), and the `xs` to `2xl` shadows. Wherever
a production component did not override a recipe's color, those names rendered Chakra's grays in every theme. Most
components already set their own colors; the remaining defaults were the shadows on overlays and on five components,
text selection, loading placeholders, and the keyboard highlight in Select and Menu, where Chakra's
`bg.emphasized/60` and the select recipe's `tertiary/12` measured 1.0 to 1.3:1 against the list.

Two merge behaviors made recipe overrides unreliable. Chakra merges a configured slot list with its own by position,
so the select recipe's four-slot list replaced Chakra's `label` and `positioner` slots, and the radio group recipe's
list dropped Chakra's `indicator`. A recipe's variant styles also merge over its base styles key by key, so the
select trigger's resting border and background lost to Chakra's default `outline` variant.

Alternatives considered:

- **Override each component:** set a theme role on every production use that leaves a recipe color unset, about ten
  components today. Every Chakra component added later, and every overlay, needs the same review.
- **Replace Chakra's recipes:** define complete project recipes for every component used. This duplicates Chakra's
  layout and state styles and must track their changes on each upgrade.
- **Point Chakra's names at theme roles (chosen):** redefine the names once, so every unoverridden default renders
  a role in every theme and color mode.

## Decision

We will define Chakra's own color and shadow names as references to theme roles:

| Chakra name | Theme role |
| --- | --- |
| `bg`, `bg.subtle`, `bg.muted`, `bg.emphasized`, `bg.inverted`, `bg.panel` | `background`, `layer-01`, `muted`, `layer-hover-01`, `foreground`, `popover` |
| `bg.error`, `bg.warning`, `bg.success`, `bg.info` | `destructive`, `warning`, `success`, `info` at 10% |
| `fg`, `fg.muted`, `fg.subtle`, `fg.inverted` | `foreground`, `on-muted`, `on-muted`, `background` |
| `border`, `border.emphasized`, `border.muted`, `border.subtle`, `border.inverted` | `border-strong-01`, `border-strong-02`, `border-subtle-01`, `border-subtle-00`, `foreground` |
| `fg` and `border` `.error`, `.warning`, `.success`, `.info` | `destructive`, `warning`, `success`, `info` |
| `gray.contrast`, `gray.fg`, `gray.subtle`, `gray.muted`, `gray.emphasized`, `gray.solid`, `gray.border` | `background`, `foreground`, `layer-01`, `muted`, `layer-hover-01`, `foreground`, `border-strong-01` |
| `gray.focusRing` | `ring` |
| shadows `xs`, `sm`, `md`, `lg`, `xl`, `2xl` | `shadow-sm`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-lg`, `shadow-lg` |

What a name mapping cannot express is set in the theme's recipes and global styles:

- Dialog and drawer backdrops use `backdrop`; Chakra's is a fixed `blackAlpha.500`.
- Warning, success and error toasts draw what an info toast does: `foreground` text, the toast's own border on the
  action button and a `muted` hover fill, where Chakra gives them a solid status fill with white text, borders and
  hover fills.
- Selected text is drawn in `foreground` on `tertiary/20`, so secondary text and links stay readable while
  selected.
- In Menu and Select, the highlighted item (keyboard or pointer) is a solid `tertiary` fill with `on-tertiary` text.
  A chosen option shows its check mark instead of a fill, so the highlight stays distinguishable from the choice.
- A project slot recipe lists its slots from Chakra's anatomy, and colors that Chakra's default variant also sets
  live in that variant. The select trigger's outline variant draws `border` and `border.emphasized`, which the
  mapping already points at the trigger's roles, so naming them in the variant keeps them explicit rather than
  changing what renders.

Components keep naming roles directly; the mapping governs only what they leave unset. The contrast check enforces
the pairs the mapping relies on.

## Consequences

### Positive

- Every unoverridden Chakra default that draws one of the mapped names renders a theme role, including in components
  added later, with one definition in the theme.
- Keyboard highlights in Select and Menu measure at least 4.55:1 against their list, and highlighted text at least
  5.0:1, in all five themes and both modes.
- The focus ring Chakra draws by default uses `ring`, at least 4.32:1 on the page, cards, overlays and `layer-02`.
- Selected text measures at least 4.85:1 on the page, cards, overlays, `layer-02` and `muted`.

### Negative

- `border` resolves to `border-strong-01`, which falls below 3:1 on overlay surfaces in some dark themes (2.30:1 in
  IBM Carbon). An input on an overlay must name `border-strong-02` itself, as the layer-aware form inputs do.
- Chakra's names now mean theme roles, so Chakra's documentation of their values no longer describes this app.
- Selected text loses its own color, links included, while it is selected.
- A Chakra upgrade that adds a semantic name or slot needs review against the mapping.

### Risks

- Chakra's palettes other than `gray`, and its `inner` and `inset` shadows, are not mapped. A component that sets a
  non-gray `colorPalette`, Chakra's alert in its `surface`, `outline` and `solid` variants, and its radio marks when
  invalid still draw Chakra's colors. Production uses none of these: its alerts use the `subtle`
  variant, and the switch, slider, progress and segment-group recipes that draw `inset` appear only on development
  pages.
