# ADR-012: Separate Button Pattern Semantics from Color Semantics

## Status

Accepted

## Context

### The Conflation Problem

CineXplorer's theme system currently conflates **color semantics** (primary/secondary/tertiary) with
**button pattern semantics** (filled/outline/ghost). This creates confusion and inconsistency when implementing buttons
across different design systems.

**Example of the problem:**

```tsx
// What should a "secondary button" be?
<Button bg="secondary" color="on-secondary">Cancel</Button>
// ❌ This uses gray color - but is it filled or outline?
// ❌ Which design system pattern does this represent?
```

### Color Tokens Are Not Button Tokens

Our current semantic color tokens:

- `primary` - Primary action color (green/blue/orange/purple per theme)
- `secondary` - Gray-ish color for subtle backgrounds
- `tertiary` - Interactive text/link color
- `muted` - Deemphasized, non-interactive backgrounds

These represent **colors**, not **button patterns**. But we've been using them to mean both, which breaks down when
implementing actual buttons.

### The Real-World Pattern: Outline Buttons Use Primary

Through visual validation across all 4 themes (GitHub, IBM Carbon, GitLab, Material), we discovered:

**Industry standard outline button pattern:**

- Background: Transparent
- Border: Primary action color (NOT gray)
- Text: Primary action color

**Examples from our themes:**

- **GitHub Primer**: Outline buttons use green (primary)
- **IBM Carbon**: Outline buttons use blue (primary) - they call this "tertiary button"
- **GitLab Pajamas**: Outline buttons use orange (primary)
- **Material Design 3**: Outline buttons use purple (primary)

**The confusion:** We were calling these "secondary buttons" but they should use the **primary** color, just with a
different pattern (outline vs filled).

### Chakra UI v3 Already Separates These Concepts

Chakra UI v3 provides 4 button **patterns**:

- `variant="solid"` - Filled background
- `variant="outline"` - Transparent bg + border
- `variant="subtle"` - Muted filled background
- `variant="ghost"` - Text-only, no border

These patterns are separate from color choice. But to use them consistently across themes, we need to decide which
**color** each pattern should use.

### The Secondary Color Question

Our `secondary` color (gray-ish) is not used for outline buttons. It's used for:

- Subtle filled buttons (Chakra's "subtle" variant)
- Subtle backgrounds
- Secondary UI elements

This is actually closer to Chakra's "subtle" variant than outline buttons.

### Alternatives Considered

**Option A: Use color tokens directly in components**

```tsx
<Button variant="outline" borderColor="primary" color="primary">Cancel</Button>
```

- ❌ Problem: Inconsistent - different devs might use "tertiary" for outline buttons
- ❌ Not obvious which color to use for which pattern

**Option B: Document patterns in strategy doc (no new tokens)**

- ❌ Problem: Relies on developer memory
- ❌ Easy to make mistakes when building new components
- ❌ Not enforced by type system

**Option C: Add button-specific helper tokens (CHOSEN)**

```tsx
<Button variant="outline" borderColor="button-outline" color="on-button-outline">Cancel</Button>
```

- ✅ Self-documenting: "button-outline" clearly indicates this is for outline buttons
- ✅ Consistent: All themes map identically (button-outline → primary)
- ✅ Type-safe: Enforced by TypeScript
- ✅ Minimal: Only 4 new tokens needed

## Decision

We will **add four button-specific helper tokens** to the `UnifiedTheme` interface that map consistently across all
themes, separating button pattern semantics from color semantics.

**New tokens:**

```typescript
"button-outline": string;        // For outline button border/text (maps to primary)
"on-button-outline": string;     // Text on outline buttons (maps to on-primary)
"button-subtle": string;         // For subtle filled buttons (maps to secondary)
"on-button-subtle": string;      // Text on subtle buttons (maps to on-secondary)
```

**Mapping strategy:**

All themes use **identical mappings**:

```typescript
// Every theme adapter (GitHub, IBM Carbon, GitLab, Material)
"button-outline": primary,
"on-button-outline": onPrimary,
"button-subtle": secondary,
"on-button-subtle": onSecondary,
```

**Usage patterns with Chakra UI v3:**

```tsx
// Solid button (highest emphasis) - uses primary color, filled
<Button variant="solid" bg="primary" color="on-primary">
  Save
</Button>

// Outline button (high emphasis) - uses primary color, transparent bg
<Button variant="outline" borderColor="button-outline" color="button-outline">
  Cancel
</Button>

// Subtle button (medium emphasis) - uses secondary color, filled
<Button variant="subtle" bg="button-subtle" color="on-button-subtle">
  Options
</Button>

// Ghost button (low emphasis) - text-only
<Button variant="ghost" color="foreground">
  Skip
</Button>

// Interactive text/links (not buttons) - uses tertiary color
<Link color="tertiary">Learn more</Link>
```

**Existing tokens remain unchanged:**

- `primary` / `on-primary` - Still used for filled buttons (and other UI elements)
- `secondary` / `on-secondary` - Still used for subtle backgrounds
- `tertiary` / `on-tertiary` - Still used for links/interactive text (NOT buttons)
- `muted` / `on-muted` - Still used for disabled/deemphasized states (NOT buttons)

## Consequences

### Positive

1. **Self-documenting API**: Token names clearly indicate usage (`button-outline` vs `primary`)
2. **Cross-theme consistency**: All themes behave identically for button patterns
3. **Type safety**: TypeScript enforces correct token usage
4. **Aligns with Chakra v3**: Maps naturally to Chakra's variant system
5. **Reduces cognitive load**: Developers don't need to remember "which color for outline buttons?"
6. **Clarifies color semantics**: `primary`/`secondary`/`tertiary` are clearly about colors, not button types
7. **Fixes visual bugs**: Resolves inconsistent button appearance across themes

### Negative

1. **More tokens**: Adds 4 tokens to the interface (increases surface area)
2. **Indirection layer**: Components use `button-outline` instead of `primary` directly
3. **Documentation burden**: Need to document when to use button tokens vs color tokens
4. **Migration work**: Existing button implementations may need updates

### Risks

1. **Over-engineering concern**: Are we adding tokens for something that could be documented?
   - **Mitigation**: Helper tokens are minimal (4 total) and solve real confusion
   - **Mitigation**: Self-documenting API reduces long-term documentation burden

2. **Pattern leakage**: Will we need button-specific tokens for every pattern?
   - **Mitigation**: Only covering the 2 ambiguous patterns (outline, subtle)
   - **Mitigation**: Ghost uses `foreground`, solid uses `primary` directly

3. **Theme evolution**: What if a theme needs different mappings?
   - **Mitigation**: Mappings can diverge per-theme if needed in future
   - **Mitigation**: Current identical mappings work for all 4 existing themes

## Related ADRs

- **ADR-010**: Establish Core Semantic Color Token Architecture
    - ADR-012 clarifies that ADR-010's color tokens are for colors, not button patterns
    - Complements by defining how colors are used in button contexts

- **ADR-011**: Standardize on "on-color" Foreground Naming Convention
    - ADR-012 follows the same `on-*` naming pattern for button tokens
    - Maintains consistency with foreground token naming

## Implementation Notes

**Visual demonstration:**

ThemeDebug.tsx will be updated to separate:

- **"Core Colors" section**: Display color tokens as circles (not button-like)
- **"Core Actions" section**: Demonstrate actual button patterns with Chakra variants

**Files affected:**

- `frontend/src/theme/color/types.ts` - Add 4 new tokens
- `frontend/src/theme/color/adapters/*.ts` - Map tokens in all 4 adapters
- `frontend/src/pages/ThemeDebug.tsx` - Update demonstrations

**Date**: 2025-11-08
**Author**: CineXplorer Development Team
