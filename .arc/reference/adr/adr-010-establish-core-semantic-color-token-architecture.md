# ADR-010: Establish Core Semantic Color Token Architecture

## Status

Accepted (2025-11-09); Superseded in part by ADR-012 (Decision 5)

Status updated 2026-11-06 from "Draft (Implementation in progress)": the architecture landed through PR #5
(2025-11-09), and the record was never moved to Accepted.

Implemented by: PR #5 (`ea82a1bd`, 2025-11-09).

## Context

### The Discovery

During theme validation work (2025-11-07), we discovered that our three source design systems (GitHub Primer, IBM Carbon,
GitLab Pajamas) have fundamentally different color architectures that don't align with our initial assumptions:

**Initial Assumption (INCORRECT):**

- All three systems use green for "primary action buttons"
- Primary and success are redundant, both mapping to green
- Simple fix: separate primary (blue) from success (green)

**Actual Reality (Discovered via comprehensive research):**

| System             | Brand Color                         | Primary Action Buttons | Interactive Links    | Architecture                    |
|--------------------|-------------------------------------|------------------------|----------------------|---------------------------------|
| **GitHub Primer**  | None (black/white logo)             | GREEN (#1f883d)        | BLUE (#0969da)       | 2-tier: Actions ≠ Links         |
| **IBM Carbon**     | BLUE (#0f62fe)                      | BLUE (#0f62fe, same)   | BLUE (#0f62fe, same) | 1-tier: Unified blue            |
| **GitLab Pajamas** | PURPLE (#554488) + ORANGE (#e24329) | BLUE (#1f75cb)         | PURPLE (#7759c2)     | 3-tier: Brand ≠ Actions ≠ Links |

**Key Insight:** These systems have different color philosophies:

- **GitHub**: Separates action color (green) from interactive color (blue)
- **IBM**: Uses one blue for everything (brand, buttons, links)
- **GitLab**: Separates brand (purple/orange) from UI actions (blue) from links (purple)

### The Token Type Problem

Our initial "fix" (mapping `primary` to `fg_accent`) created a **fundamental architectural error**:

```typescript
// INCORRECT (what we initially did in 3.5.5.3):
const primary = palette.fg_accent;  // ❌ FOREGROUND token for button BACKGROUNDS
const accent = palette.fg_accent;   // ✅ Correct for links
```

**Issue:** `primary` is used for **button backgrounds** (needs background token), but we mapped it to
a **foreground token** (designed for text/links).

**Industry Pattern (discovered via external research):**

- **Primary**: Background token optimized for filled buttons, large color areas
- **Accent/Tertiary**: Foreground token optimized for text, links, icons

### Industry Research Findings

External research of 8 major design systems revealed:

**Material Design 3 Pattern (Most Comprehensive):**

- **Primary**: Main brand color, used for primary action buttons
- **Secondary**: Supporting color, less prominent actions
- **Tertiary**: Contrasting accent for highlights and links
- **Success/Error/Warning**: Separate status/feedback colors

**Key Finding:** The "Primary/Secondary/Tertiary" hierarchy is an industry standard (Material, Ant Design,
Shopify Polaris, etc.) that provides:

1. Clear visual hierarchy (importance order)
2. Semantic clarity (each has one purpose)
3. Flexibility (works for both simple and complex color systems)

### Current Implementation Issues

**Issue 1: Incorrect Token Types**

```typescript
// Current mapping (WRONG):
primary: palette.fg_accent       // Foreground token used for backgrounds!
accent: palette.fg_accent        // Correct token type for links
```

**Issue 2: Ambiguous Semantics**

- Does "primary" mean "brand color" or "primary action color"?
- For GitLab: Brand is purple, but primary actions are blue
- For GitHub: No brand color, but primary actions are green
- No consistent meaning across systems

**Issue 3: Missing Brand Distinction**

GitLab has distinct brand colors (purple/orange) separate from UI functional colors (blue).
Our current model has no way to represent this.

## Decision

We will adopt a **Material Design 3-aligned semantic hierarchy** with optional brand separation, ensuring token types
match their usage context.

### Decision 1: Primary/Secondary/Tertiary Hierarchy

**Adopt Material's three-tier action hierarchy:**

```typescript
interface UnifiedTheme {
  // ACTION HIERARCHY (required)
  primary: string;              // Primary action buttons (filled)
  "primary-foreground": string; // Text on primary buttons

  secondary: string;            // Secondary action buttons (outline)
  "secondary-foreground": string;

  tertiary: string;             // Interactive text, links, accents
  "tertiary-foreground"?: string; // Optional (often uses default foreground)

  // DEEMPHASIZED (required)
  muted: string;                // Non-interactive, deemphasized backgrounds
  "muted-foreground": string;

  // BRAND (optional)
  brand?: string;               // Logo/brand identity color
  brandSecondary?: string;      // Secondary brand color

  // STATUS (required)
  success: string;
  warning: string;
  destructive: string;
  info: string;
  // ... status foregrounds
}
```

**Semantic Definitions:**

| Token              | Meaning                          | Visual                                 | Usage                            | Token Type           |
|--------------------|----------------------------------|----------------------------------------|----------------------------------|----------------------|
| **primary**        | Primary action buttons           | Filled buttons, often blue or green    | "Submit", "Save", "Continue"     | **Background** token |
| **secondary**      | Subtle backgrounds               | Muted filled backgrounds               | Subtle buttons, secondary UI     | Background token     |
| **tertiary**       | Interactive text, links, accents | Blue or brand color, foreground        | Hyperlinks, focus, highlights    | **Foreground** token |
| **muted**          | Deemphasized, non-interactive    | Subtle gray backgrounds                | Disabled states, subtle surfaces | Background token     |
| **brand**          | Brand identity (optional)        | Logo color, brand moments              | Logo, special brand sections     | Either type          |
| **brandSecondary** | Secondary brand (optional)       | Secondary brand color                  | Additional brand accents         | Either type          |

**Key Distinctions:**

- **Primary vs Tertiary**: Primary is for **button fills** (background token), Tertiary is for **links/text**
(foreground token)
- **Primary vs Brand**: Primary is for **UI actions**, Brand is for **identity** (may be same color, e.g., IBM Carbon)
- **Secondary vs Muted**: Secondary is **subtle interactive** (button backgrounds via `button-subtle`), Muted is
  **non-interactive** (disabled states). See ADR-012 for button token patterns.
- **Tertiary replaces Accent**: Industry uses "tertiary" (Material), we deprecate "accent" in favor of clearer hierarchy

### Decision 2: Correct Token Type Mappings

**For each design system, map to appropriate token types:**

**GitHub Primer:**

```typescript
brand: undefined,                    // No brand color
primary: palette.bg_success,         // GREEN background (action buttons)
tertiary: palette.fg_accent,         // BLUE foreground (links)
```

**Rationale:** GitHub uses green for positive actions ("merge", "create"), blue for interactive text.

**IBM Carbon:**

```typescript
brand: palette.fg_accent,            // BLUE (IBM brand)
primary: palette.fg_accent,          // BLUE background (buttons, same as brand)
tertiary: palette.fg_accent,         // BLUE foreground (links, same as brand)
```

**Rationale:** IBM's unified blue philosophy - one blue for brand, buttons, and links. Semantically distinct tokens,
visually identical values.

**GitLab Pajamas:**

```typescript
brand: "#554488",                    // PURPLE (GitLab brand)
brandSecondary: "#e24329",           // ORANGE (secondary brand)
primary: "#1f75cb",                  // BLUE background (action buttons)
tertiary: "#7759c2",                 // PURPLE foreground (links, brand-aligned)
```

**Rationale:** GitLab's 3-tier architecture - separate colors for brand, actions, and interactive text.

### Decision 3: Optional Brand Tokens

**Add separate brand tokens for systems with distinct brand colors:**

```typescript
brand?: string;          // Optional - Logo/brand identity color
brandSecondary?: string; // Optional - Secondary brand color (e.g., GitLab orange)
```

**Usage Guidelines:**

- **Brand tokens are NOT for general component use**
- Use brand tokens only in:
    - Logo/branding sections
    - Special brand moments (hero sections, marketing pages)
    - Company-specific UI elements
- **Components use functional tokens** (primary/secondary/tertiary) for actions

**Example - GitLab:**

- Logo: Uses `brand` (purple) and `brandSecondary` (orange)
- Primary button: Uses `primary` (blue), NOT brand colors
- Links: Use `tertiary` (purple, happens to match brand but semantically different)

### Decision 4: Deprecate "Accent" in Favor of "Tertiary"

**Rationale:**

- **Industry alignment**: Material Design 3 uses "tertiary", not "accent"
- **Clearer hierarchy**: Primary > Secondary > Tertiary (importance order)
- **Semantic precision**: "Tertiary" indicates position in hierarchy, "accent" is ambiguous

**Migration Path:**

```typescript
// New interface
tertiary: string;
accent: string;  // @deprecated Use 'tertiary' instead (alias for compatibility)

// Adapter implementation
tertiary: palette.fg_accent,
accent: palette.fg_accent,  // Alias during migration
```

**Component Migration:**

- Global find/replace: `accent` → `tertiary`
- Update all component usage
- Remove `accent` alias after migration complete

### Decision 5: Mandatory Secondary Outline Pattern

**Definition:** Secondary buttons MUST use outline styling (1px border) across all themes.

**Implementation:**

```tsx
<Button
  bg="secondary"
  color="secondary-foreground"
  borderWidth="1px"                 // REQUIRED
  borderColor="border-strong-01"    // REQUIRED
>
  Cancel
</Button>
```

**Rationale:**

- Industry standard (Bootstrap, Carbon, Primer, Pajamas)
- Visual hierarchy clarity (primary=filled, secondary=outline)
- Prevents invisibility (GitLab dark mode would be invisible without border)

### Decision 6: Muted vs Secondary Distinction

**Muted** (non-interactive):

- Disabled states
- Deemphasized text
- Subtle backgrounds/dividers
- Usage: `<Box bg="muted">`, `<Text color="muted-foreground">`

**Secondary** (interactive):

- Secondary action buttons
- Less important interactive elements
- Still clickable/actionable
- Usage: `<Button bg="secondary">`

**Material's equivalent:**

- Secondary = `secondary` color role
- Muted = `surfaceVariant` / `onSurfaceVariant`

## Consequences

### Positive

**1. Architecturally Correct**

- Token types match usage (background tokens for backgrounds, foreground for text)
- No more using foreground tokens for button fills
- Proper separation of concerns

**2. Handles Complex Color Systems**

- GitLab's 3-tier architecture (brand/action/interactive) fully supported
- IBM's unified approach (one blue) also supported
- GitHub's 2-tier system (action/interactive) works perfectly

**3. Industry Alignment**

- Material Design 3 hierarchy (Primary/Secondary/Tertiary)
- Clear semantic meanings match user expectations
- Easier onboarding for developers familiar with Material

**4. Extensibility**

- Optional brand tokens support future themes with brand/UI separation
- Clear mapping philosophy guides new theme additions
- Material Design 3 can be added as 4th theme (validates architecture)

### Negative

**1. Breaking Change from Current Implementation**

- Must revert incorrect 3.5.5.3 changes (primary mapped to fg_accent)
- All adapters need correct token type mappings
- Component review needed (ensure proper token types used)

**2. Global Accent → Tertiary Migration**

- Need to update all components using `accent` token
- Find/replace across codebase
- Test all components after migration

**3. Documentation Debt**

- ADR-010 needs complete rewrite ✅
- strategy-color-tokens.md needs major updates
- All adapter files need comprehensive inline documentation
- Task list needs restructuring

### Risks

**1. Component Breakage During Migration**

- Global find/replace of accent → tertiary may miss edge cases
- Need thorough testing after migration
- Should be low risk (mostly mechanical change)

**2. Visual Changes**

- Fixing primary token type may change button colors in some themes
- GitHub: Primary buttons should be green (bg_success)
- IBM: Primary buttons should be blue (fg_accent as background)
- GitLab: Primary buttons should be blue (new blue tokens)

**3. Increased Complexity**

- More tokens to understand (brand, brandSecondary, tertiary)
- Clearer guidance needed on when to use brand vs primary
- Documentation critical for preventing misuse

**Amendment (2026-11-06):** Two parts were built differently from this record, each by a later decision rather
than left unfinished:

- The `-foreground` token names in Decision 1 became `on-*` names (`on-primary`, `on-secondary` and so on) under
  [ADR-011](adr-011-standardize-on-color-foreground-naming.md).
- GitLab Pajamas was built orange, not with the purple brand and blue primary in Decisions 2 and 3: `brand`,
  `brandSecondary` and a new `brandTertiary` take the three oranges of GitLab's logo, `primary` uses brand orange
  (darkened in light mode for contrast), and `tertiary` keeps purple for links. The theme work's GitLab audit made
  the change (`b33b9eca`, 2025-11-08).

## Implementation Plan

### Phase 1: Documentation (First) ✅

1. ✅ Rename ADR-010 to reflect full scope
2. ✅ Completely rewrite ADR-010 with correct architecture
3. ✅ Update strategy-color-tokens.md with new hierarchy
4. ✅ Update task list with structured implementation tasks

### Phase 2: Revert Incorrect Changes

1. Unmark tasks 3.5.5.3 and 3.5.5.4 as incomplete
2. Revert adapter changes from 3.5.5.3 (incorrect fg_accent mappings)
3. Revert GitHub Primer palette attention tokens (will re-add with correct approach)

### Phase 3: Correct Implementation

1. Update UnifiedTheme interface:
   - Add `tertiary` + `tertiary-foreground`
   - Add optional `brand` + `brandSecondary`
   - Keep `accent` as deprecated alias
   - Document muted vs secondary distinction

2. Update all 3 adapter files with correct mappings:
   - **GitHub Primer**: primary=bg_success (green bg), tertiary=fg_accent (blue fg)
   - **IBM Carbon**: primary=fg_accent (blue, used as bg), tertiary=fg_accent (blue fg), brand=fg_accent
   - **GitLab Pajamas**: brand=purple, brandSecondary=orange, primary=blue bg, tertiary=purple fg

3. Add comprehensive inline documentation to all adapters

### Phase 4: Global Migration

1. Global find/replace: `accent` → `tertiary` across all components
2. Test all migrated components
3. Update component patterns (button usage, link styling)
4. Remove `accent` alias from UnifiedTheme interface

### Phase 5: Material Design 3 Addition

1. Research Material baseline static palette (<https://m3.material.io/styles/color/static/baseline>)
2. Create `material-design-3.ts` palette file
3. Create Material adapter with proper primary/tertiary/brand mappings
4. Test all 8 theme combinations (4 themes × 2 modes)

### Phase 6: Validation & Commit

1. Visual validation across all theme combinations
2. Update ThemeDebug page with correct patterns
3. Run all quality gates (TypeScript, linting, tests)
4. Atomic commit: ADR + adapters + strategy + components + Material theme

## References

**Research Documentation:**

- `.arc/active/incidental/notes-theme-definition-semantic-corrections.md` (comprehensive research)
- External research: Primary vs Accent token architecture (2025-11-07)
- External research: Design system color architecture audit (2025-11-07)

**Official Design System Sources:**

- Material Design 3: <https://m3.material.io/styles/color/roles>
- Material Baseline: <https://m3.material.io/styles/color/static/baseline>
- IBM Carbon: <https://carbondesignsystem.com/elements/color/tokens/>
- GitHub Primer: <https://primer.style/primitives/colors/>
- GitLab Pajamas: <https://design.gitlab.com/product-foundations/color/>

**Related ADRs:**

- ADR-003: Extend Semantic Token System (established token count from 20 to 33; ADR-010 establishes architecture/hierarchy)
- ADR-005: Unified Theme Adapter Layer (adapter architecture)
- ADR-006: Adopt Carbon Layer Elevation Standard (layer system)
- ADR-008: Adopt Carbon's Alternating Pattern for Light Mode (layer alternation)
- ADR-009: Use Material Design Opacity Overlays for Interaction States (state layers)

**Related Strategies:**

- strategy-color-tokens.md (comprehensive token reference, naming conventions, accessibility standards)
- strategy-component-styling.md (component building patterns, recipes, wrappers)

---

**Date:** 2025-11-07
**Author:** System (with comprehensive research and user collaboration)
**Supersedes:** None (establishes semantic color architecture)
