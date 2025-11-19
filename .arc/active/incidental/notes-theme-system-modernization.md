# Implementation Notes: Theme System Modernization

**Task List:** `.arc/active/incidental/tasks-theme-system-modernization.md`

---

## WCAG Contrast Validation Whitelist (Task 8.7.a)

**Purpose:** Define valid foreground/background token combinations for automated WCAG AA contrast verification.

**Source:** Derived from documented patterns in:

- `.arc/reference/strategies/project/style/strategy-color-tokens.md`
- `.arc/reference/strategies/project/style/strategy-component-styling.md`
- Recipe files in `frontend/src/theme/recipes/`

**Key Principle:** Only test combinations that actually appear together in the UI. The `on-*` naming convention
makes most pairs self-documenting.

### Category 1: Semantic Pairs (on-* Convention)

**Pattern:** `on-{color}` text on `{color}` background
**Source:** Color Token System strategy, UnifiedTheme interface

```typescript
const semanticPairs = [
  // Action colors
  { fg: 'on-primary', bg: 'primary' },
  { fg: 'on-secondary', bg: 'secondary' },
  { fg: 'on-tertiary', bg: 'tertiary' },

  // Status colors
  { fg: 'on-success', bg: 'success' },
  { fg: 'on-warning', bg: 'warning' },
  { fg: 'on-destructive', bg: 'destructive' },
  { fg: 'on-info', bg: 'info' },

  // Helper colors
  { fg: 'on-badge', bg: 'badge' },
  { fg: 'on-muted', bg: 'muted' },
  { fg: 'on-popover', bg: 'popover' },

  // Button pattern tokens
  { fg: 'on-button-outline', bg: 'button-outline' },
  { fg: 'on-button-outline-primary', bg: 'button-outline-primary' },
  { fg: 'on-button-subtle', bg: 'button-subtle' },
  { fg: 'on-button-subtle-selected', bg: 'button-subtle-selected' },

  // Movie-specific
  { fg: 'on-rating', bg: 'rating' },

  // Brand (optional - may be undefined in some themes)
  { fg: 'on-brand', bg: 'brand', optional: true },
  { fg: 'on-brandSecondary', bg: 'brandSecondary', optional: true },
  { fg: 'on-brandTertiary', bg: 'brandTertiary', optional: true },
];
```

### Category 2: Text on Structural Surfaces

**Pattern:** Primary/secondary text on layer backgrounds
**Source:** Component Styling Strategy - Building Surfaces section

```typescript
const textOnSurfaces = [
  // Primary text on all surfaces
  { fg: 'foreground', bg: 'background' },
  { fg: 'foreground', bg: 'layer-01' },
  { fg: 'foreground', bg: 'layer-02' },
  { fg: 'foreground', bg: 'layer-03' },
  { fg: 'foreground', bg: 'popover' },

  // Secondary/muted text on surfaces
  { fg: 'on-muted', bg: 'background' },
  { fg: 'on-muted', bg: 'layer-01' },
  { fg: 'on-muted', bg: 'layer-02' },
];
```

### Category 3: Interactive Text on Surfaces

**Pattern:** Links, tertiary buttons, ghost buttons on surfaces
**Source:** Component Styling Strategy - Interactive Elements, Button patterns

```typescript
const interactiveOnSurfaces = [
  // Default interactive text
  { fg: 'tertiary', bg: 'background' },
  { fg: 'tertiary', bg: 'layer-01' },
  { fg: 'tertiary', bg: 'layer-02' },

  // Hover states
  { fg: 'tertiary-hover', bg: 'background' },
  { fg: 'tertiary-hover', bg: 'layer-01' },
  { fg: 'tertiary-hover', bg: 'layer-02' },

  // Active/pressed states
  { fg: 'tertiary-active', bg: 'background' },
  { fg: 'tertiary-active', bg: 'layer-01' },
  { fg: 'tertiary-active', bg: 'layer-02' },
];
```

### Category 4: Borders on Surfaces (Layer-Aware)

**Pattern:** Form controls and structural borders
**Source:** Component Styling Strategy - Layer-Aware Border Tokens, Form Inputs

```typescript
const bordersOnSurfaces = [
  // Layer-aware borders (form controls, structural containers)
  { fg: 'border-strong-01', bg: 'layer-01' },
  { fg: 'border-strong-02', bg: 'layer-02' },
  { fg: 'border-strong-03', bg: 'layer-03' },

  // Subtle borders
  { fg: 'border-subtle-00', bg: 'background' },
  { fg: 'border-subtle-02', bg: 'layer-02' },

  // Generic border (decorative only)
  { fg: 'border', bg: 'background' },
  { fg: 'border', bg: 'layer-01' },
];
```

### Category 5: Interaction States on Surfaces

**Pattern:** Hover, selected, active states on interactive surfaces
**Source:** Component Styling Strategy - Interaction State Philosophy, Common Patterns

```typescript
const interactionStates = [
  // Hover states (12% opacity overlay, but need to validate resulting color)
  { fg: 'foreground', bg: 'layer-hover-01' },
  { fg: 'foreground', bg: 'layer-hover-02' },
  { fg: 'on-muted', bg: 'layer-hover-01' },

  // Selected states (16% opacity overlay)
  { fg: 'foreground', bg: 'layer-selected-01' },
  { fg: 'foreground', bg: 'layer-selected-02' },
  { fg: 'on-button-subtle-selected', bg: 'button-subtle-selected' }, // From semantic pairs

  // Active/pressed states (16% opacity overlay)
  { fg: 'foreground', bg: 'layer-active-01' },
  { fg: 'foreground', bg: 'layer-active-02' },
];
```

### Category 6: Focus Indicators

**Pattern:** Focus rings and focused borders
**Source:** Component Styling Strategy - Focus Indicators (ADR-015)

```typescript
const focusIndicators = [
  // Focus rings on surfaces (outline with offset, not direct contact)
  // Note: Rings have 2px offset, so we test against underlying surface
  { fg: 'ring', bg: 'background' },
  { fg: 'ring', bg: 'layer-01' },
  { fg: 'ring', bg: 'layer-02' },

  // Focus border on inputs (tertiary border color change)
  { fg: 'tertiary', bg: 'background' }, // Border color when focused
  { fg: 'tertiary', bg: 'layer-01' },
  { fg: 'tertiary', bg: 'layer-02' },
];
```

### Category 7: Alert/Status Descriptions

**Pattern:** Alert description text on subtle status backgrounds
**Source:** Alert recipe implementation, Component Styling Strategy

```typescript
const alertDescriptions = [
  // Alert descriptions use foreground (not on-success) on 10% opacity backgrounds
  // These are tricky - the backgrounds are 10% opacity tints
  // Validation requires computing the resulting color after opacity blend
  { fg: 'foreground', bg: 'success/10' },  // Need to resolve opacity
  { fg: 'foreground', bg: 'warning/10' },
  { fg: 'foreground', bg: 'destructive/10' },
  { fg: 'foreground', bg: 'info/10' },
];
```

### Category 8: Movie-Specific UI Elements

**Pattern:** Rating stars and drag-drop interactions
**Source:** ThemeDebug CineXplorerExtensionsSection, Component Styling Strategy

```typescript
const movieSpecific = [
  // IMDb-gold rating stars on surfaces (text/icon color)
  { fg: 'imdb-gold', bg: 'background' },
  { fg: 'imdb-gold', bg: 'layer-01' },  // Movie cards
  { fg: 'imdb-gold', bg: 'layer-02' },

  // Drag-and-drop states (verified from ThemeDebug implementation)
  { fg: 'on-secondary', bg: 'drag-active' },  // Item being dragged (secondaryHover bg)
  { fg: 'foreground', bg: 'drop-zone' },      // Valid drop target (muted bg)
];
```

### Implementation Notes

**Script Structure:**

1. **Load theme adapters** - Import all theme definitions from `frontend/src/theme/color/definitions.ts`
2. **Resolve token values** - For each theme, extract actual color values from `lightUnified`/`darkUnified`
3. **Process whitelist** - Iterate through all 8 categories (~80 token pairs total)
4. **Handle opacity tokens** - Resolve tokens like `success/10` by computing blend with layer background
5. **Calculate contrast** - Use WCAG contrast library for each fg/bg pair
6. **Generate report** - List failures with token names, actual colors, contrast ratios

**Special Cases:**

- **Optional tokens** (brand colors): Skip if undefined in theme
- **Opacity tokens** (`success/10`): Compute resulting color by blending with base layer
- **Interaction states**: Already resolved to solid colors in adapters (layer-hover-01, etc.)

**WCAG AA Thresholds:**

- **Normal text** (most foreground tokens): 4.5:1 minimum
- **Large text** (18pt+): 3:1 minimum (not tracked separately - use normal text threshold for simplicity)
- **UI components** (borders, focus rings): 3:1 minimum

**Library Choice:**

Recommend `wcag-contrast` npm package:

- Simple API: `getContrast(fg, bg)` returns ratio
- Returns numeric ratio (e.g., 4.52)
- Handles hex, rgb, rgba color formats
- Small footprint (~5KB)

**Alternative:** `color-contrast-checker` (more features but larger)

---
