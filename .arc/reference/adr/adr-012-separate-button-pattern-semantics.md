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

### The Real-World Pattern: Two Types of Outline Buttons

Through visual validation across all 4 themes (GitHub, IBM Carbon, GitLab, Material) and component implementation,
we discovered outline buttons serve **two distinct purposes**:

**1. Neutral Utility Outlines (Most Common)**

Used for navigation, OAuth, filters, and utility actions where brand color would be inappropriate:

- Background: Transparent
- Border: Neutral gray (NOT brand color)
- Text: Neutral foreground
- Hover: Shifts to tertiary/accent (signals interactivity)

**Examples:** "Back to Results", OAuth buttons (Google/GitHub), filter toggles, "Cancel" in neutral contexts

**2. Primary Branded Outlines (Less Common)**

Used for primary actions in outline style (high emphasis but less visual weight than solid):

- Background: Transparent
- Border: Primary action color
- Text: Primary action color
- Hover: Stays in primary color family

**Examples from our themes:**

- **GitHub Primer**: Green outline (primary)
- **IBM Carbon**: Blue outline (primary) - they call this "tertiary button"
- **GitLab Pajamas**: Orange outline (primary)
- **Material Design 3**: Purple outline (primary)

**The discovery:** Initial implementation assumed all outline buttons use primary color, but real-world usage revealed
most outline buttons are **neutral utility actions**, not branded primary actions.

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

We will **add eight button-specific helper tokens** to the `UnifiedTheme` interface that map consistently across all
themes, separating button pattern semantics from color semantics and supporting both neutral and branded outline buttons.

**New tokens:**

```typescript
// Neutral outline (DEFAULT - most common use case)
"button-outline": string;              // Neutral border/text (maps to border)
"on-button-outline": string;           // Neutral text (maps to foreground)

// Primary outline (EXPLICIT - branded actions in outline style)
"button-outline-primary": string;      // Primary border/text (maps to primary)
"on-button-outline-primary": string;   // Primary text (maps to on-primary)

// Subtle filled (medium emphasis)
"button-subtle": string;               // Subtle background (maps to secondary)
"on-button-subtle": string;            // Subtle text (maps to on-secondary)

// Subtle selected state (for toggle-style subtle buttons)
"button-subtle-selected": string;      // Selected state background (maps to layer-selected-02)
"on-button-subtle-selected": string;   // Text on selected background (maps to foreground)
```

**Mapping strategy:**

All themes use **identical mappings**:

```typescript
// Every theme adapter (GitHub, IBM Carbon, GitLab, Material)
"button-outline": border,                       // NEUTRAL default
"on-button-outline": foreground,
"button-outline-primary": primary,              // EXPLICIT primary
"on-button-outline-primary": onPrimary,
"button-subtle": secondary,
"on-button-subtle": onSecondary,
"button-subtle-selected": layer-selected-02,    // Selected state uses layer semantics
"on-button-subtle-selected": foreground,        // Pairs with foreground (not on-secondary)
```

**Rationale for selected state tokens:**

When a subtle button is selected, it transitions from "button semantics" (secondary color, paired with on-secondary)
to "interactive surface semantics" (layer-selected-02, paired with foreground). This semantic shift requires different
foreground colors for proper contrast across themes:

- **IBM Carbon light**: `button-subtle` is dark gray (#393939) with white text, but `layer-selected-02` is light
  gray (#e2e2e2) needing dark text
- **Material Design dark**: `button-subtle` is light purple-gray (#CCC2DC) with dark text, but `layer-selected-02`
  needs inverted contrast

Without dedicated selected tokens, components would need conditional color logic per theme, defeating the purpose of
a unified token system.

**Usage patterns with Chakra UI v3:**

```tsx
// Solid button (highest emphasis) - uses primary color, filled
<Button variant="solid" bg="primary" color="on-primary" _hover={{ bg: "primary-hover" }}>
  Save
</Button>

// Primary outline (high emphasis) - branded action in outline style
<Button
  variant="outline"
  borderColor="button-outline-primary"
  color="on-button-outline-primary"
  _hover={{ bg: "primary/8" }}
>
  Learn More
</Button>

// Neutral outline (medium emphasis) - DEFAULT for utility actions
<Button
  variant="outline"
  borderColor="button-outline"
  color="on-button-outline"
  _hover={{ bg: "tertiary/8", borderColor: "tertiary" }}
>
  Cancel
</Button>

// Subtle button (medium-low emphasis) - embedded actions
<Button variant="subtle" bg="button-subtle" color="on-button-subtle" _hover={{ bg: "secondary-hover" }}>
  Options
</Button>

// Subtle button with selected state (toggle-style subtle buttons)
<Button
  variant="subtle"
  bg={isSelected ? "button-subtle-selected" : "button-subtle"}
  color={isSelected ? "on-button-subtle-selected" : "on-button-subtle"}
  _hover={{ bg: isSelected ? "button-subtle-selected" : "secondary-hover" }}
>
  Theme Option
</Button>

// Ghost button (low emphasis) - text-only
<Button variant="ghost" color="tertiary" _hover={{ color: "tertiary-hover" }}>
  Skip
</Button>

// Interactive text/links (not buttons) - uses tertiary color
<Link color="tertiary" _hover={{ color: "tertiary-hover" }}>Learn more</Link>
```

**When to use which button pattern:**

| Pattern             | Emphasis   | Use Cases                               | Examples                                     |
|---------------------|------------|-----------------------------------------|----------------------------------------------|
| **Solid**           | Highest    | Primary actions, most important CTA     | "Save", "Submit", "Browse Movies"            |
| **Primary Outline** | High       | Branded actions in outline style (rare) | "Learn More" on landing page                 |
| **Neutral Outline** | Medium     | Utility actions, navigation, OAuth      | "Cancel", "Back", OAuth buttons, filters     |
| **Subtle**          | Medium-Low | In-context actions, embedded controls   | "Options", "Sort", "Filter", theme selectors |
| **Ghost**           | Lowest     | Dismissive actions, tertiary actions    | "Skip", "Close", "Dismiss"                   |

**Decision tree:**

1. **Is this the main action?** → Solid
2. **Is this a branded action but needs less weight than solid?** → Primary Outline
3. **Is this a utility/navigation action?** → Neutral Outline (most common)
4. **Is this an embedded control within a panel/card?** → Subtle
5. **Is this a dismissive/tertiary action?** → Ghost

**Neutral Outline vs Subtle - Key Distinction:**

- **Neutral Outline**: Standalone actions with distinct boundaries (transparent + border)
- **Subtle**: Embedded actions within context (filled muted background)

**Examples:**

- OAuth buttons: Neutral Outline (standalone utility actions)
- Theme selector buttons: Subtle (embedded within sticky header)
- Light/dark toggle: Neutral Outline (standalone utility toggle)
- "Back to Results": Neutral Outline (navigation action)
- "Filter" toggle: Neutral Outline (standalone control)
- "Sort" dropdown trigger: Subtle (embedded within filter panel)

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

1. **More tokens**: Adds 8 tokens to the interface (increases surface area)
2. **Indirection layer**: Components use `button-outline` instead of `border`/`primary` directly
3. **Documentation burden**: Need to document when to use which outline variant (neutral vs primary)
4. **Migration work**: Existing button implementations need updates
5. **Choice complexity**: Developers must choose between neutral and primary outline variants
6. **Selected state complexity**: Toggle-style subtle buttons require conditional logic for bg/color pairs

### Risks

1. **Over-engineering concern**: Are we adding tokens for something that could be documented?
   - **Mitigation**: Helper tokens are minimal (8 total) and solve real confusion discovered during implementation
   - **Mitigation**: Self-documenting API reduces long-term documentation burden
   - **Mitigation**: Two outline variants reflect real-world usage patterns (neutral utility vs branded actions)
   - **Mitigation**: Selected state tokens eliminate theme-specific conditional logic in components

2. **Wrong variant choice**: Developers might choose primary outline when neutral is more appropriate
   - **Mitigation**: Clear decision tree in documentation
   - **Mitigation**: Default name (`button-outline`) is the more common neutral variant
   - **Mitigation**: Explicit name (`button-outline-primary`) signals special case

3. **Pattern leakage**: Will we need button-specific tokens for every pattern?
   - **Mitigation**: Only covering the 2 ambiguous patterns (outline with 2 variants, subtle)
   - **Mitigation**: Ghost uses `tertiary`, solid uses `primary` directly

4. **Theme evolution**: What if a theme needs different mappings?
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

- `frontend/src/theme/color/types.ts` - Add 8 new tokens (2 outline variants + subtle + subtle-selected)
- `frontend/src/theme/color/adapters/*.ts` - Map tokens in all 4 adapters
- `frontend/src/pages/ThemeDebug.tsx` - Update demonstrations (show both outline variants, use selected tokens)
- `.arc/reference/strategies/project/style/strategy-component-styling.md` - Button pattern guidance and recipes

**Date**: 2025-11-08
**Author**: CineXplorer Development Team
