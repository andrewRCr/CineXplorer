# Notes: Theme Definition Semantic Corrections

**Created:** 2025-11-03
**Branch:** `technical/service-layer-modernization`
**Related Task List:** `tasks-theme-definition-semantic-corrections.md`

## Purpose

**This is a research archive**, not a task tracking document. It contains design system research, token verification
findings, and analysis that informed ADR-008 (Carbon light mode alternating layers), ADR-009 (Material Design opacity
overlays), and ADR-010 (Separate primary from success semantic colors).

**For implementation tracking**, see task list 3.5.5 (Semantic Colors Standardization Audit) in
`tasks-theme-definition-semantic-corrections.md`.

**Document Scope:**

This file documents research for fixing critical semantic token misuse across GitHub Primer, IBM Carbon, and GitLab
Pajamas theme implementations. Work was discovered during Task 4.4.4 (AdvancedMovieFilters testing) and addressed
through systematic verification and standardization.

---

## Token Semantic Reference Guide

### Token Purpose Categories

All design systems distinguish between three fundamental token purposes. Understanding these distinctions is critical for
correct theme implementation:

#### 1. Structure Tokens (Elevation & Hierarchy)

**Purpose:** Define visual hierarchy through z-index depth and layering. Used for static surface backgrounds that create
spatial organization.

**Common Names Across Design Systems:**

- **GitHub Primer:** `bgColor-default`, `bgColor-muted`, `bgColor-inset`
- **IBM Carbon:** `background`, `layer-01`, `layer-02`, `layer-03`
- **GitLab Pajamas:** `background.color.default`, `background.color.section`, `background.color.subtle`

**Usage Examples:**

- Page backgrounds
- Card surfaces
- Panel backgrounds
- Modal dialogs
- Dropdown surfaces

**Key Principle:** Structure tokens create the foundational visual hierarchy. They change with elevation level but NOT
with user interaction states.

---

#### 2. State Tokens (Selection & Interaction)

**Purpose:** Indicate selected, active, or interactive element states. These are **user-driven** (respond to clicks,
hovers, selections).

**Common Names Across Design Systems:**

- **GitHub Primer:** `bgColor-accent-emphasis` (selected items)
- **IBM Carbon:** `layer-selected-01/02/03`, `layer-hover-01/02/03`
- **GitLab Pajamas:** `background.color.selected`

**Usage Examples:**

- Selected navigation items
- Active tabs
- Hover states on buttons
- Selected rows in tables

**Key Principle:** State tokens respond to user interaction. They should NEVER be used for general surface backgrounds
or elevation.

---

#### 3. Emphasis Tokens (Attention & Highlighting)

**Purpose:** Draw attention to important content through pronounced visual contrast. These are **designer-driven**
(intentionally highlight specific elements).

**Common Names Across Design Systems:**

- **GitHub Primer:** `bg_emphasis` (high-contrast inverted backgrounds)
- **IBM Carbon:** `layer-accent-01/02/03`
- **GitLab Pajamas:** `background.color.strong`

**Usage Examples:**

- Alert banners (info, warning, error)
- Call-to-action highlights
- Badge backgrounds
- Important status indicators

**Key Principle:** Emphasis tokens are for deliberate highlighting, NOT for creating elevation hierarchy.

---

### Critical Misuses Identified

#### ❌ Wrong: Using Emphasis Tokens for Elevation

**Example from our current implementation:**

```typescript
// GitHub Primer Light - INCORRECT
'surface-elevated': pLight.bg_emphasis  // #ddf4ff (accent blue)
```

**Problem:** `bg_emphasis` is designed for high-contrast inverted backgrounds (dark buttons on light pages), NOT for
elevated surfaces like modals or popovers.

**Correct approach:**

```typescript
// GitHub Primer Light - CORRECT
'surface-elevated': pLight.bg_default  // #ffffff + shadow
```

---

#### ❌ Wrong: Using State Tokens for Structure

**Example from Carbon implementation:**

```typescript
// IBM Carbon - INCORRECT (if we did this)
card: carbonDark.layer_selected_01  // #393939
```

**Problem:** `layer-selected-01` indicates a selected interactive element, not a general card surface.

**Correct approach:**

```typescript
// IBM Carbon - CORRECT
card: carbonDark.layer_01  // #262626
```

---

### Elevation Strategy by Design System

Different design systems use different approaches to elevation. We must align with each system's official methodology:

#### GitHub Primer: Shadow-Based Elevation

**Official Approach:** Use the same background color for all elevation levels, differentiate with shadows.

```typescript
// Primer Elevation Pattern
background: '#ffffff'           // Base canvas
card: '#f6f8fa'                 // bgColor-muted (subtle differentiation)
'surface-elevated': '#ffffff'   // Same as background + shadow
```

**Shadow Tokens (from @primer/primitives):**

```typescript
shadow_sm: '0 1px 0 rgba(27, 31, 36, 0.04)'            // Subtle
shadow_md: '0 3px 6px rgba(140, 149, 159, 0.15)'      // Cards
shadow_lg: '0 8px 24px rgba(140, 149, 159, 0.2)'      // Modals
```

**Key Finding:** Primer intentionally avoids changing background colors for elevation. Elevated surfaces (modals,
popovers) use `bgColor-default` + shadow, NOT `bg_emphasis`.

---

#### IBM Carbon: Layer Progression

**Official Approach:** Use explicit layer color progression (`layer-01` → `layer-02` → `layer-03`) to create elevation
hierarchy.

```typescript
// Carbon G100 (Dark) Layer System
background: '#161616'   // gray-100 - Base canvas
layer_01: '#262626'     // gray-90 - Cards, panels
layer_02: '#393939'     // gray-80 - Modals, dialogs
layer_03: '#525252'     // gray-70 - Dropdowns over modals
```

**Border Adaptation Per Layer:**

Carbon uses **different border colors for different layers** to maintain visibility:

```typescript
// Dark Mode Border Tokens
border_subtle_00: '#393939'   // On background/layer-01
border_subtle_02: '#525252'   // On layer-02
border_strong_01: '#6f6f6f'   // Default accessible border
border_strong_02: '#8d8d8d'   // On layer-02
```

**Key Finding:** Carbon's `layer-02` (#393939) matches `border-subtle-00` (#393939), creating invisible borders. Must
use `border-strong-01` (#6f6f6f) for visibility.

---

#### GitLab Pajamas: Shadow + Semantic Sections

**Official Approach:** Combine semantic section tokens with shadow-based elevation.

```typescript
// Pajamas Light Mode
background: '#ffffff'              // neutral-0 - Default
card: '#ececef'                    // neutral-50 - Section token
'surface-elevated': '#ffffff'      // neutral-0 + shadow
```

**Shadow System:**

```typescript
shadow_sm: '0 1px 2px rgba(0, 0, 0, 0.12)'   // Cards (gl-shadow-sm)
shadow_md: '0 2px 8px rgba(0, 0, 0, 0.15)'   // Popovers, dropdowns
shadow_lg: '0 4px 16px rgba(0, 0, 0, 0.2)'   // Modals (gl-shadow-lg)
```

**Key Finding:** GitLab explicitly documents cards using `background.color.section` semantic tokens, NOT `bg_muted` or
emphasis tokens. Elevated surfaces use shadows, not color changes.

---

### Border Token Hierarchy

All three design systems provide border token hierarchies, but we're consistently using the most subtle variants, causing
visibility issues.

#### GitHub Primer Border Strategy

```typescript
// Light Mode
border_default: '#d1d9e0'    // borderColor-default (subtle, 2.12:1 contrast)
border_strong: '#818b98'     // borderColor-emphasis (accessible, 3.73:1 contrast)

// Dark Mode
border_default: '#3d444d'    // borderColor-default (3.03:1 contrast - marginal)
border_strong: '#656c76'     // borderColor-emphasis (4.54:1 contrast)
```

**Primer Philosophy:** Intentionally uses subtle borders, relies on shadows/spacing/grouping for accessibility rather
than strict contrast ratios.

---

#### IBM Carbon Border Strategy

```typescript
// G100 Dark Mode - Per-Layer Borders
border_subtle_00: '#393939'   // On background/layer-01 (matches layer-02!)
border_subtle_02: '#525252'   // On layer-02
border_strong_01: '#6f6f6f'   // Default accessible (3.67:1 on background)
border_strong_02: '#8d8d8d'   // On layer-02 (higher contrast)
border_strong_03: '#a8a8a8'   // On layer-03
```

**Carbon Philosophy:** Provides separate border tokens for each layer to maintain consistent visibility across elevation
levels.

---

#### GitLab Pajamas Border Strategy

```typescript
// Light Mode
border_default: '#dcdcde'    // neutral-100 (subtle, 1.17:1 - fails WCAG)
border_strong: '#bfbfc3'     // neutral-200 (better, still subtle)
// OR
border_strong: '#a4a3a8'     // neutral-300 (accessible)

// Dark Mode
border_default: '#4c4b51'    // neutral-700 (1.44:1 - fails WCAG)
border_strong: '#626168'     // neutral-600 (better contrast)
```

**Pajamas Philosophy:** Acknowledges "partial support" for non-text contrast in WCAG conformance. Uses subtle borders
aesthetically, provides stronger variants for accessibility-critical contexts.

---

### surface-elevated Semantic Token Mapping

Our custom `surface-elevated` semantic token should map as follows per design system:

#### GitHub Primer Mapping

```typescript
// Light Mode
'surface-elevated': pLight.bg_default  // #ffffff (NOT bg_emphasis)
// Plus shadow_lg for modals, shadow_md for popovers

// Dark Mode
'surface-elevated': pDark.bg_default  // #0d1117 (NOT bg_emphasis)
```

**Rationale:** Primer uses same background for elevated surfaces, differentiation via shadow only.

---

#### IBM Carbon Mapping

```typescript
// Light Mode (White Theme)
'surface-elevated': carbonLight.layer_02  // #ffffff (alternates with layer-01)

// Dark Mode (G100)
'surface-elevated': carbonDark.layer_02  // #393939 (distinct from layer-01)
```

**Rationale:** Carbon uses layer progression. `layer-02` is explicitly for modals and dialogs.

---

#### GitLab Pajamas Mapping

```typescript
// Light Mode
'surface-elevated': pajamasLight.neutral_0  // #ffffff (NOT neutral-50)
// Plus shadow_lg for modals

// Dark Mode
'surface-elevated': pajamasDark.neutral_950  // #18171d (NOT neutral-800)
```

**Rationale:** Pajamas uses shadows for elevation. `background.color.strong` (neutral-800) is for emphasis, NOT
elevation.

---

## Hex Value Reference Table

### GitHub Primer Corrections

#### Light Mode

| Token | Current Value | Correct Value | Source | Change Required |
|-------|--------------|---------------|---------|-----------------|
| `background` | `#ffffff` | `#ffffff` | `bgColor-default` | ✅ Keep |
| `card` | `#ffffff` | `#f6f8fa` | `bgColor-muted` | ⚠️ **CHANGE** |
| `surface-elevated` | `#ddf4ff` | `#ffffff` | `bgColor-default` (+ shadow) | ⚠️ **CHANGE** |
| `border` | `#d1d9e0` | `#d1d9e0` | `borderColor-default` | ✅ Keep |
| `border-strong` | ❌ Missing | `#818b98` | `borderColor-emphasis` | ⚠️ **ADD** |

**Contrast Analysis:**

- `borderColor-default` (#d1d9e0) vs `bgColor-default` (#ffffff) = **2.12:1** ❌ (WCAG requires 3:1)
- `borderColor-emphasis` (#818b98) vs `bgColor-default` (#ffffff) = **3.73:1** ✅

**Source:** @primer/primitives v8.x (<https://unpkg.com/@primer/primitives>)

---

#### Dark Mode

| Token | Current Value | Correct Value | Source | Change Required |
|-------|--------------|---------------|---------|-----------------|
| `background` | `#0d1117` | `#0d1117` | `bgColor-default` | ✅ Keep |
| `card` | `#010409` | `#151b23` | `bgColor-muted` (official) | ⚠️ **CONSIDER** |
| `surface-elevated` | `#161b22` | `#0d1117` | `bgColor-default` (+ shadow) | ⚠️ **CHANGE** |
| `border` | `#3d444d` | `#3d444d` | `borderColor-default` | ✅ Keep |
| `border-strong` | ❌ Missing | `#656c76` | `borderColor-emphasis` | ⚠️ **ADD** |

**Notes:**

- Current card value (#010409) is `bg_inset`, semantically incorrect but visually acceptable
- Official `bgColor-muted` is #151b23, lighter than current
- Consider migration to official value or document semantic discrepancy

**Contrast Analysis:**

- `borderColor-default` (#3d444d) vs `bgColor-default` (#0d1117) = **3.03:1** ✅ (marginal pass)
- `borderColor-emphasis` (#656c76) vs `bgColor-default` (#0d1117) = **4.54:1** ✅

**Source:** @primer/primitives v8.x

---

#### Optional: Shadow Tokens

| Token | Recommended Value | Source |
|-------|------------------|--------|
| `shadow_sm` | `0 1px 0 rgba(27, 31, 36, 0.04)` | Primer subtle shadow |
| `shadow_md` | `0 3px 6px rgba(140, 149, 159, 0.15)` | Primer card/panel shadow |
| `shadow_lg` | `0 8px 24px rgba(140, 149, 159, 0.2)` | Primer modal shadow |

---

### IBM Carbon Corrections

#### Light Mode (White Theme)

| Token | Current Value | Correct Value | Source | Change Required |
|-------|--------------|---------------|---------|-----------------|
| `background` | `#ffffff` | `#ffffff` | White | ✅ Keep |
| `card` | `#f4f4f4` | `#f4f4f4` | Gray 10 (`layer-01`) | ✅ Keep |
| `surface-elevated` | `#ffffff` | `#ffffff` | White (`layer-02` alternates) | ✅ Keep |
| `border` | `#e0e0e0` | `#e0e0e0` | Gray 20 (`border-subtle`) | ✅ Keep |
| `border-strong` | ❌ May be missing | `#8d8d8d` | Gray 50 (`border-strong`) | ⚠️ **VERIFY/ADD** |

**Notes:** Light mode implementation appears mostly correct. Verify `border-strong` token exists.

**Source:** @carbon/themes v11.0.0

---

#### Dark Mode (G100 Theme)

| Token | Current Value | Correct Value | Source | Change Required |
|-------|--------------|---------------|---------|-----------------|
| `background` | `#161616` | `#161616` | Gray 100 | ✅ Keep |
| `card` | `#262626` | `#262626` | Gray 90 (`layer-01`) | ✅ Keep |
| `surface-elevated` | `#393939` | `#393939` | Gray 80 (`layer-02`) | ✅ Keep (semantic concern) |
| `border` | `#393939` | `#6f6f6f` | Gray 60 (`border-strong-01`) | ⚠️ **CHANGE** |
| `layer-03` | ❌ Missing | `#525252` | Gray 70 | ⚠️ **ADD** |
| `border-strong` | ❌ Missing | `#6f6f6f` | Gray 60 (`border-strong-01`) | ⚠️ **ADD** |

**Critical Issue:** Border (#393939) matches `surface-elevated` (#393939), creating **invisible borders**.

**Contrast Analysis:**

- Current: `border` (#393939) vs `surface-elevated` (#393939) = **1:1** ❌ (invisible!)
- Fixed: `border-strong-01` (#6f6f6f) vs `layer-02` (#393939) = **2.67:1** ⚠️ (marginal)
- Better: `border-strong-01` (#6f6f6f) vs `background` (#161616) = **3.67:1** ✅

**Layer-03 Requirement:** Needed for dropdowns over modals, highest elevation level.

**Source:** @carbon/themes v11.0.0, Carbon Design System docs

---

#### Advanced: Per-Layer Border Tokens (Optional)

For full Carbon alignment, consider implementing per-layer border system:

| Layer Context | Subtle Border | Strong Border |
|--------------|---------------|---------------|
| background / layer-01 | `#393939` | `#6f6f6f` |
| layer-02 | `#525252` | `#8d8d8d` |
| layer-03 | `#6f6f6f` | `#a8a8a8` |

**Rationale:** Maintains consistent visibility across all elevation levels.

---

### GitLab Pajamas Corrections

#### Light Mode

| Token | Current Value | Correct Value | Source | Change Required |
|-------|--------------|---------------|---------|-----------------|
| `background` | `#ffffff` | `#ffffff` | neutral-0 | ✅ Keep |
| `card` | `#fbfafd` | `#ececef` | neutral-50 (section token) | ⚠️ **CHANGE** |
| `surface-elevated` | `#ececef` | `#ffffff` | neutral-0 (+ shadow) | ⚠️ **CHANGE** |
| `border` | `#dcdcde` | `#bfbfc3` or `#a4a3a8` | neutral-200 or neutral-300 | ⚠️ **CHANGE** |

**Card Differentiation Issue:**

- Current: neutral-10 (#fbfafd) vs neutral-0 (#ffffff) = **1.02:1** ❌ (barely visible)
- Recommended: neutral-50 (#ececef) vs neutral-0 (#ffffff) = **~1.15:1** ⚠️ (better but still subtle)

**GitLab Card Docs:** "A card uses section design tokens by default to visually identify it as a contained content
region. Each combination has a **noticeable difference** between the border and background."

**Border Contrast Analysis:**

- Current: neutral-100 (#dcdcde) vs neutral-0 (#ffffff) = **1.17:1** ❌ (fails WCAG 3:1)
- Option A: neutral-200 (#bfbfc3) provides **~2.1:1** ⚠️ (better, still subtle)
- Option B: neutral-300 (#a4a3a8) provides **~2.9:1** ⚠️ (closer to 3:1, more visible)

**Source:** GitLab Pajamas design tokens, design.gitlab.com

---

#### Dark Mode

| Token | Current Value | Correct Value | Source | Change Required |
|-------|--------------|---------------|---------|-----------------|
| `background` | `#18171d` | `#18171d` | neutral-950 | ✅ Keep |
| `card` | `#28272d` | `#28272d` | neutral-900 | ✅ Keep |
| `surface-elevated` | `#3a383f` | `#18171d` | neutral-950 (+ shadow) | ⚠️ **CHANGE** |
| `border` | `#4c4b51` | `#626168` | neutral-600 | ⚠️ **CHANGE** |

**Border Contrast Analysis:**

- Current: neutral-700 (#4c4b51) vs neutral-950 (#18171d) = **1.44:1** ❌
- Recommended: neutral-600 (#626168) vs neutral-950 (#18171d) = **~2.1:1** ⚠️

**Notes:** GitLab acknowledges "partial support" for non-text contrast. Borders intentionally subtle.

**Source:** GitLab Pajamas design tokens

---

#### Optional: Shadow Tokens

| Token | Recommended Value | Source |
|-------|------------------|--------|
| `shadow_sm` | `0 1px 2px rgba(0, 0, 0, 0.12)` | gl-shadow-sm (cards) |
| `shadow_md` | `0 2px 8px rgba(0, 0, 0, 0.15)` | Popovers, dropdowns |
| `shadow_lg` | `0 4px 16px rgba(0, 0, 0, 0.2)` | gl-shadow-lg (modals) |

---

## WCAG Compliance Summary

### Non-Text Contrast Requirements

**WCAG 2.1 Level AA:** Graphical objects and user interface components must have **3:1 minimum contrast** against
adjacent colors.

**Applies To:** Borders, focus indicators, interactive controls

---

### Current Compliance Status

| Theme | Mode | Border | Surface | Contrast | Status |
|-------|------|--------|---------|----------|--------|
| Primer | Light | #d1d9e0 | #ffffff | 2.12:1 | ❌ Fails 3:1 |
| Primer | Dark | #3d444d | #0d1117 | 3.03:1 | ✅ Marginal pass |
| Carbon | Light | #e0e0e0 | #ffffff | ~2.4:1 | ❌ Likely fails |
| Carbon | Dark | #393939 | #393939 | 1:1 | ❌ Invisible |
| Pajamas | Light | #dcdcde | #ffffff | 1.17:1 | ❌ Fails 3:1 |
| Pajamas | Dark | #4c4b51 | #18171d | 1.44:1 | ❌ Fails 3:1 |

---

### Design System Philosophies

#### GitHub Primer

- Uses intentionally subtle borders for aesthetics
- Relies on **compensating cues**: shadows, spacing, color grouping
- Provides `borderColor-emphasis` for accessibility-critical contexts
- Trade-off: Visual elegance vs strict WCAG compliance

#### IBM Carbon

- Provides explicit border hierarchy per elevation layer
- `border-strong` variants meet WCAG requirements
- Expects context-appropriate border selection
- Clear accessibility guidance in documentation

#### GitLab Pajamas

- Acknowledges "partial support" for non-text contrast
- Uses subtle borders aesthetically
- Provides stronger variants for critical elements
- Documents limitations transparently

---

### Recommended Approach

**For CineXplorer Implementation:**

1. **Default Borders:** Use standard border tokens (aesthetic, may not meet WCAG 3:1)
2. **Compensating Cues:** Implement shadows, spacing, color grouping (following Primer/Pajamas approach)
3. **Strong Borders Available:** Add `border-strong` tokens for accessibility-critical contexts
4. **Documentation:** Note WCAG partial compliance, align with upstream design system limitations

**Rationale:** All three official design systems accept subtle borders with compensating cues. Perfect WCAG compliance
requires trade-offs that upstream systems have already evaluated and documented.

---

## Custom Theme Impact

### Removed Custom Themes (Phase 4.3.5)

The following custom themes were removed during Phase 4.3.5 and are NOT in scope for this correction:

- ❌ `tangere-terminal`
- ❌ `sage-bone`
- ❌ `stone-greige`
- ❌ `muted-earth`

**Rationale:** Task list (line 78, 84) mentions custom theme files but Phase 4.3.5 removed these. Only GitHub Primer,
IBM Carbon, and GitLab Pajamas remain in production.

---

### Files to Update

**Palette Files (3 total):**

1. `frontend/src/theme/palettes/github.ts`
2. `frontend/src/theme/palettes/ibm-carbon.ts`
3. `frontend/src/theme/palettes/gitlab-pajamas.ts`

**Theme Definition Files (3 total):**

1. `frontend/src/theme/definitions/github.ts`
2. `frontend/src/theme/definitions/ibm-carbon.ts`
3. `frontend/src/theme/definitions/gitlab-pajamas.ts`

**Type Definitions (verify only):**

1. `frontend/src/theme/types.ts` - Check if new tokens need type additions

**Total Files:** ~7 files (3 palettes + 3 definitions + 1 types)

---

## References

### Official Design System Documentation

**GitHub Primer:**

- Color Foundations: <https://primer.style/design/foundations/color>
- @primer/primitives Package: <https://unpkg.com/@primer/primitives>
- GitHub Design Blog: Inclusive color system at scale

**IBM Carbon:**

- Color Usage Guide: <https://carbondesignsystem.com/elements/color/usage/>
- @carbon/themes v11.0.0: <https://www.npmjs.com/package/@carbon/themes>
- Layer System Discussions: GitHub issues #7743, #2674

**GitLab Pajamas:**

- Color System: <https://design.gitlab.com/product-foundations/color/>
- Elevation System: <https://design.gitlab.com/product-foundations/elevation/>
- Card Component: <https://design.gitlab.com/components/card/>
- gitlab-ui Repository: Token implementation reference

### WCAG Standards

- WCAG 2.1 Level AA: Non-text contrast 3:1 minimum
- Understanding SC 1.4.11: <https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast>

---

## Integration Strategy: Unified Theme Adapter

**Added:** 2025-11-04 (from Task 1.2.4)

This section outlines the integration strategy for connecting the new unified theme adapter layer
to CineXplorer's existing theme system. The adapter provides UnifiedTheme instances that must be
compatible with the current Chakra UI v3 system creation in `frontend/src/theme/index.ts`.

### Current Architecture

```
Palettes (design system tokens)
    ↓
Definitions (map to ThemeColors interface - 39 tokens)
    ↓
createBaseTokens() + createSemanticTokens()
    ↓
Chakra UI defineConfig() → createSystem()
    ↓
Components (use semantic tokens like "card", "surface-elevated")
```

**Current flow in `theme/index.ts`:**

1. Import theme definitions (e.g., `githubTheme` from `definitions/github.ts`)
2. `Theme` interface has `light` and `dark` properties of type `ThemeColors`
3. `createThemeSystem(theme)` creates Chakra system from Theme
4. Components use current token names (`card`, `surface-elevated`, etc.)

### Target Architecture

```
Palettes (design system tokens - corrections applied in Phase 2)
    ↓
Adapter Layer (createUnifiedTheme)
    ↓
UnifiedTheme interface (~47 canonical tokens)
    ↓
createBaseTokens() + createSemanticTokens() (updated)
    ↓
Chakra UI defineConfig() → createSystem()
    ↓
Components (use canonical names: "layer-01", "layer-02", etc.)
```

### Integration Approach: Parallel Systems

**Selected: Option A (Parallel Systems)** - Run old and new systems in parallel during Phase 2-3 migration.

**Implementation:**

1. **Phase 2:** Adapters created, old definitions remain
   - `adapter/github.ts`, `adapter/carbon.ts`, `adapter/pajamas.ts` implemented
   - Old `definitions/` files unchanged (still used by components)
   - No component breakage - everything still works

2. **Phase 3:** Component-by-component migration
   - Update components: `bg="card"` → `bg="layer-01"`
   - Both token systems present in Chakra config
   - Components gradually switch to canonical names

3. **Phase 4:** Remove old system
   - Delete `definitions/` directory
   - Remove `ThemeColors` interface
   - Update `theme/index.ts` to use adapters exclusively

**Pros:**

- ✅ Zero-risk migration (no component breakage)
- ✅ Can test adapters before full cutover
- ✅ Rollback path if issues found

**Cons:**

- ⚠️ Temporary duplication (~86 tokens in Chakra config during Phase 3)
- ⚠️ More complex during migration period

**Rejected Alternative: Direct Replacement** - Replace definitions with adapters immediately.
Too risky (all-or-nothing cutover, no rollback path).

### Integration Implementation Steps

#### Step 1: Extend Theme Interface (Phase 2)

Update `frontend/src/theme/types.ts`:

```typescript
// Keep existing ThemeColors (deprecated during migration)
export interface ThemeColors {
  // ... current 39 tokens
}

// Add UnifiedTheme import
import type { UnifiedTheme } from "./adapter/types";

// Extend Theme interface to support both
export interface Theme {
  readonly name: string;
  readonly label: string;

  // OLD (deprecated, Phase 4 removal)
  readonly light: ThemeColors;
  readonly dark: ThemeColors;

  // NEW (Phase 2+)
  readonly lightUnified?: UnifiedTheme;
  readonly darkUnified?: UnifiedTheme;
}
```

#### Step 2: Update Theme Registry (Phase 2.1-2.3)

As each adapter is implemented, add unified versions:

```typescript
// frontend/src/theme/index.ts

import { createUnifiedTheme } from "./adapter";

export const themeRegistry = {
  github: {
    ...githubTheme,  // Old definition
    lightUnified: createUnifiedTheme("github", "light"),  // NEW
    darkUnified: createUnifiedTheme("github", "dark"),    // NEW
  },
  // ... other themes
} as const;
```

#### Step 3: Update System Creation (Phase 2)

Modify `createThemeSystem()` to include both token systems:

```typescript
function createBaseTokens(theme: Theme) {
  const tokenKeys = Object.keys(theme.light) as Array<keyof ThemeColors>;

  const light: Record<string, any> = {};
  const dark: Record<string, any> = {};

  // OLD tokens (deprecated, for existing components)
  for (const tokenKey of tokenKeys) {
    light[tokenKey] = { value: theme.light[tokenKey] };
    dark[tokenKey] = { value: theme.dark[tokenKey] };
  }

  // NEW unified tokens (if present)
  if (theme.lightUnified && theme.darkUnified) {
    const unifiedKeys = Object.keys(theme.lightUnified) as Array<keyof UnifiedTheme>;
    for (const tokenKey of unifiedKeys) {
      light[tokenKey] = { value: theme.lightUnified[tokenKey] };
      dark[tokenKey] = { value: theme.darkUnified[tokenKey] };
    }
  }

  return { light, dark };
}
```

**Result:** Chakra config contains ~86 tokens during Phase 3 (39 old + 47 new).

#### Step 4: Component Migration (Phase 3)

Update components one-by-one:

```typescript
// BEFORE (old token names)
<Box bg="card" color="card-foreground">
  <Text color="muted-foreground">Caption</Text>
</Box>

// AFTER (canonical names)
<Box bg="layer-01" color="foreground">
  <Text color="muted-foreground">Caption</Text>
</Box>
```

**Migration checklist per component:**

- `bg="card"` → `bg="layer-01"`
- `bg="surface-elevated"` → `bg="layer-02"`
- `color="card-foreground"` → `color="foreground"`
- All other tokens: No changes

#### Step 5: Cleanup (Phase 4)

After all components migrated:

1. Remove old token system from `createBaseTokens()`
2. Remove `ThemeColors` properties from `Theme` interface
3. Delete `frontend/src/theme/definitions/` directory
4. Update type imports across codebase
5. Run full test suite + visual verification

### Rollback Strategy

**If issues discovered during Phase 3 migration:**

1. Revert component changes (git restore affected files)
2. Old token system still present - components work immediately
3. Fix adapter issues
4. Resume migration

**Point of No Return:** Phase 4 cleanup (definitions deleted)

### Testing Strategy

#### Phase 2 Testing (Per-Theme Adapter)

After implementing each adapter:

1. **Unit tests:** Verify token mappings correct
2. **Visual test:** Load theme in dev, spot-check key components
3. **Token audit:** Ensure all ~47 tokens present and non-empty

#### Phase 3 Testing (Component Migration)

After migrating each component:

1. **Visual test:** Component looks identical in all 6 theme combinations
2. **Token usage:** Component only uses canonical names (no old tokens)
3. **Type check:** No TypeScript errors

#### Phase 4 Testing (Final Verification)

Before deleting old system:

1. **Full test suite:** All backend + frontend tests pass
2. **Visual regression:** All 19 components in 6 theme combinations
3. **Type checking:** Frontend passes with no errors
4. **Linting:** No violations

### Timeline Estimate

**Phase 2:** Per-theme adapter implementation (6-8 hours)

- 2.1 GitHub Primer: 2-3 hours
- 2.2 IBM Carbon: 2-2.5 hours
- 2.3 GitLab Pajamas: 2-2.5 hours

**Phase 3:** Component migration (4-6 hours)

- 19 components × 15-20 minutes each
- Batch processing possible for simple updates

**Phase 4:** Cleanup and verification (2-3 hours)

- Remove old system
- Comprehensive testing
- Documentation updates

**Total:** 12-17 hours (aligns with ADR-005 estimate of 15-21 hours)

### Risk Mitigation

**Risk: Token Mapping Errors**

- Mitigation: Comprehensive hex value reference tables in this notes file
- Cross-reference with official design system packages
- Visual testing in all 6 theme combinations

**Risk: Component Breakage During Migration**

- Mitigation: Parallel systems (Option A) - both old and new tokens present
- Gradual component migration
- Easy rollback (revert file changes)

**Risk: TypeScript Type Errors**

- Mitigation: Type checking after each subtask
- UnifiedTheme interface enforces canonical names
- Compiler catches non-canonical token usage

**Risk: Visual Regressions**

- Mitigation: Visual testing checklist per theme combination
- Compare before/after screenshots
- User acceptance testing

### Success Criteria

**Phase 2 Complete:**

- ✅ All 3 adapters implemented and pass type checking
- ✅ Visual spot-check shows correct colors in dev
- ✅ No linting or type errors

**Phase 3 Complete:**

- ✅ All 19 components migrated to canonical names
- ✅ Visual verification passed for all components × 6 themes
- ✅ No TypeScript errors

**Phase 4 Complete:**

- ✅ Old `definitions/` directory removed
- ✅ `ThemeColors` interface removed
- ✅ Full test suite passes
- ✅ strategy-semantic-tokens.md updated

---

**Document Status:** Phase 1 complete (research + architecture), ready for Phase 2 implementation
**Last Updated:** 2025-11-04

---

## Component Token Usage Audit (Task 1.3.1)

**Audit Date:** 2025-11-04
**Purpose:** Document current semantic token usage across all migrated components to inform Phase 3 component migration planning.

### Audit Methodology

**Source:** Analyzed completed migration work documented in `.arc/active/incidental/tasks-theme-system-modernization.md`
(Phases 4.1-4.4, paused at Task 4.4.5).

**Scope:** All components migrated during theme system modernization (Phases 4.1-4.4 complete).

**Token Usage Analysis:** Extracted from migration completion notes documenting specific token conversions per component.

### Component Inventory: Already Migrated (34 Components Total)

#### Phase 4.1: Layout Components (11 components)

**1. NavBar.tsx** - 7 token conversions

- `foreground` - main text
- `accent` - active tab, hover states (8% opacity)
- `accent-foreground` - active tab text
- `card` - elevated navbar background (2 instances)
- `border` - separators

**2. NavBarSearch.tsx** - 5 token conversions

- `border` - input border
- `accent/8` - hover state (Material Design 3 pattern)
- `ring`, `ring/50` - focus states (accessibility-compliant)
- `muted-foreground`, `foreground` - text colors

**3. NavBarUserMenu.tsx** - 20+ instances

- `popover` - dropdown overlay background (correct semantics)
- `popover-foreground` - dropdown text
- `accent/8` - menu item hover
- `accent/12` - menu item active/pressed
- `accent` - links
- `border` - dropdown border

**4. Sidebar.tsx** - 1 token conversion

- `card` - sidebar background

**5. SidebarContent.tsx** - 7 token conversions

- `card-foreground` - list item text
- `accent/8` - hover states
- `accent/12` - selected state
- `accent-foreground` - selected text
- `border` - separators
- `muted-foreground` - section headers

**6. sidebarOverlay.tsx** - 6 token conversions

- `card` - sidebar background
- `card-foreground` - text
- `border` - borders, separators (2 instances)
- `accent` - links

**7. MobileMenuButton.tsx** - 4 token conversions

- `foreground` - icon color
- `border` - button border
- `accent/8` - hover state

**8. LoadingContent.tsx** - 4 token conversions

- `surface-elevated` - loading card background
- `foreground` - text
- `accent` - spinner color
- `background` - page background

**9. LoadingLayout.tsx** - No semantic tokens (brand exception: GitHub logo `color="black"` documented)

**10. Footer.tsx** - 3 token conversions

- `card` - footer background
- `border` - separator
- `muted-foreground` - secondary text (2 instances)

**11. BaseLayout.tsx** (Task 4.2.1) - 1 token conversion

- `background` - page background

#### Phase 4.2: Authentication Pages (3 components)

**12. Login.tsx** - 15+ conversions

- `card` - form container background (elevated surface - critical semantic fix)
- `card-foreground` - form text
- `input` - input borders (3 instances)
- `muted` - input hover states (4 instances)
- `accent/5` - input hover (Material Design 3)
- `destructive-foreground` - error text
- `muted-foreground` - labels, help text
- `primary`, `primary-foreground` - primary CTA button
- `accent`, `accent-foreground` - resend button
- `accent`, `accent-hover` - links with underline pattern
- `ring` - focus states (OAuth buttons, inputs)
- `border` - button borders, input borders

**13. Register.tsx** - Similar to Login.tsx

- `card`, `card-foreground` - form container
- `input` - input borders
- `accent/5` - input hover (consistent with Login)
- `muted-foreground` - labels
- `primary`, `primary-foreground` - submit button
- `accent`, `accent-hover` - link with underline
- `ring` - focus states
- `border` - borders

**14. VerifyEmail.tsx** - 15+ conversions

- `accent` - spinner
- `success`, `success-foreground` - success alerts
- `destructive`, `destructive-foreground` - error alerts
- `muted` - button hover states
- All buttons use semantic tokens (removed `colorScheme` props)

#### Phase 4.3: Movie Components (8 components)

**15. Featured.tsx** (page) - 5 token conversions

- `muted-foreground` - subtitle text
- `accent`, `accent-foreground` - primary action button
- `border` - outline button borders (2 buttons, 1px width enforced)
- `card` - elevated card surface

**16. MovieDetail.tsx** (page) - 10+ conversions

- `border` - back button border
- `destructive-foreground` - error text
- `muted-foreground` - release date, runtime text (2 instances)
- `badge`, `badge-foreground` - genre tags
- `primary`, `primary-foreground` - Mark as Watched, Rate Movie buttons
- `secondary`, `secondary-foreground` - Watchlist toggle (conditional)
- All buttons use semantic tokens (removed `colorScheme` props)

**17. MovieCard.tsx** - Token conversions documented

- Uses semantic tokens for card surfaces, text, borders
- Specific conversions not detailed in paused task list

**18. MovieCardContainer.tsx** - 1 token conversion

- `border` - border color (consolidated from `border.separator`)
- 1px border width enforced via `border="1px solid"`

**19. MovieUserScore.tsx** - Major refactoring with threshold mappings

- **TMDB scores:**
    - High (≥7.5): `success`, `on-success` (green)
    - Medium (5.0-7.4): `info`, `on-info` (blue)
    - Low (<5.0): `warning`, `on-warning` (yellow)
- **User ratings (future feature):**
    - High (≥8): `success`, `on-success`
    - Medium (5-7): `warning`, `on-warning`
    - Low (<5): `destructive`, `on-destructive`
- `card` - explicit card background
- `border` - 1px border enforced on outline buttons
- Eliminated all Chakra raw `colorPalette` props

**20. MovieCollectionGrid.tsx** - 6 conversions + consistency fix

- `destructive-foreground` - error messages
- `muted-foreground` - results count, empty state text (3 instances)
- `muted` - skeleton loading background
- `border` - pagination separators (top + bottom, 1px solid)

**21. MovieGrid.tsx** - 5 conversions + consistency fix

- `destructive-foreground` - error messages
- `muted-foreground` - results count, empty state text (3 instances)
- `border` - pagination separators (top + bottom, 1px solid)

**22. PageHeader.tsx** - 2 conversions + bug fix

- `foreground` - title text
- `accent` - animated underline (was invisible due to non-existent `accent.secondary`)
- Animation now visible and functional across all themes

#### Phase 4.4: Additional Components (12 components)

**23. PaginationCtrl.tsx** (Task 4.4.1) - 4 token conversions

- `foreground` - navigation buttons, page numbers
- `muted-foreground` - ellipsis
- `border` - button borders
- `accent` - active page border and text color
- `muted` - active page background (subtle selection)
- Semibold font weight for active page

**24. TypographyTest.tsx** (page, Task 4.4.2) - 41 instances

- `muted-foreground` - all labels and descriptions (replaced `text.muted`)
- Showcase/test page for font families and weights

**25-29. AdvancedMovieFilters System** (Task 4.4.3) - 5 components
Parent: **AdvancedMovieFilters.tsx**

- `foreground` - labels, headings
- `border` - input borders, separators
- `muted` - panel background, hover states
- `accent` - hover state on collapse button

Children: **GenreSelector, YearSelector, RatingSelector, SortSelector**

- `foreground` - labels
- `muted-foreground` - helper text, route labels
- `border` - input borders, dropdown separators
- `accent` - hover states, active dropdown items
- `background` - input backgrounds
- `muted` - dropdown items, selected states
- `destructive` - validation errors (Year/Rating selectors)

**30-34. LetterboxdStyleFilters System** (Task 4.4.4) - 5 components
Parent: **LetterboxdStyleFilters.tsx** - 2 token conversions

- Token conversions present but not detailed

Children:

- **ConnectedDropdowns.tsx** - 9 token conversions (2 Select dropdowns + button)
- **CollapsibleSearchBox.tsx** - 7 token conversions (input + 2 buttons)
- **SortDropdownMinimal.tsx** - 6 token conversions (label + Select dropdown)
- **ClearFiltersButton.tsx** - No old tokens (uses Chakra colorScheme prop)

**Common token mappings across LetterboxdStyleFilters system:**

- `background` - main surface backgrounds
- `muted` - hover states, dropdown backgrounds
- `border` - all borders and separators
- `foreground` - primary text, enabled states
- `muted-foreground` - labels, disabled states, helper text
- `accent` - hover states on dropdown items

### NOT Yet Migrated

**35. Watchlist.tsx** (Task 4.4.5) - Blocked by theme definition bugs

- `red.500` → `destructive-foreground` (error text, line 61) - documented but not converted
- Minimal implementation page

**36. ErrorBoundary.tsx** (Phase 4.5) - Scheduled for end of phase

- 15+ hardcoded color instances across multiple categories:
    - Error states: `red.600`, `red.700`, `red.800`, `red.50`, `red.200`
    - Neutral/muted: `gray.50` through `gray.800` (8 shades)
    - Informational: `blue.50`, `blue.100`, `blue.500`, `blue.700`
- 60% of all hardcoded colors in codebase
- Complex component requiring careful semantic token mapping

### Token Usage Summary by Category

#### Most Frequently Used Tokens (Across All 34 Components)

**Surface Tokens:**

- `card` - 11+ components (elevated surfaces: navbar, footer, sidebar, form containers, loading states)
- `background` - 5+ components (page backgrounds, input backgrounds)
- `popover` - 1 component (NavBarUserMenu dropdown - correct overlay semantics)
- `surface-elevated` - 1 component (LoadingContent - third elevation level)

**Text Tokens:**

- `foreground` - 15+ components (primary text, default text color)
- `muted-foreground` - 20+ components (labels, helper text, secondary text, timestamps)
- `card-foreground` - 4 components (text on card backgrounds)
- `popover-foreground` - 1 component (text on popover backgrounds)

**Interactive Tokens:**

- `accent` - 20+ components (hover states, active tabs, links, spinners, highlights)
- `accent-foreground` - 5+ components (active tab text, button text on accent backgrounds)
- `accent-hover` - 2 components (link hover states - new token from auth pages)
- `primary`, `primary-foreground` - 5+ components (primary action buttons: submit, CTA)
- `secondary`, `secondary-foreground` - 2 components (Watchlist toggle, secondary actions)
- `muted` - 15+ components (disabled states, subtle backgrounds, skeleton loading, dropdown items)

**Border/Input Tokens:**

- `border` - 25+ components (universal: separators, button borders, input borders, card outlines)
- `input` - 3 components (Login, Register, VerifyEmail input field borders)
- `ring` - 5+ components (focus indicators: inputs, checkboxes, OAuth buttons - WCAG compliance)

**Status Tokens:**

- `success`, `success-foreground` - 2 components (VerifyEmail alerts, MovieUserScore high ratings)
- `warning`, `warning-foreground` - 1 component (MovieUserScore low ratings)
- `destructive`, `destructive-foreground` - 8+ components (error messages, delete actions, validation errors)
- `info`, `info-foreground` - 1 component (MovieUserScore medium ratings)

**Movie-Specific Tokens:**

- `badge`, `badge-foreground` - 2 components (MovieDetail genre tags)
- `on-success`, `on-warning`, `on-destructive`, `on-info` - 1 component (MovieUserScore solid badge text)
    - **Note:** `on-*` tokens created during MovieUserScore refactoring for contrast on solid colored backgrounds

**Interaction State Patterns:**

- `accent/8` - 10+ components (8% opacity hover states - Material Design 3 pattern)
- `accent/12` - 3 components (12% opacity active/pressed states)
- `accent/5` - 2 components (5% input hover - auth pages only)
- `ring/50` - 1 component (50% opacity focus ring - NavBarSearch)
- `muted/70` - 1 component (70% opacity hover - PaginationCtrl)

### Token Usage Patterns Identified

#### Pattern 1: Elevated Surface Hierarchy

```typescript
background (page) → card (elevated) → surface-elevated (nested) → popover (overlay)
```

- **Usage:** 11 components use `card` for first-level elevation
- **Usage:** 1 component uses `surface-elevated` for nested elevation
- **Usage:** 1 component uses `popover` for dropdown overlays

#### Pattern 2: Text Contrast Pairing

```typescript
background + foreground
card + card-foreground
popover + popover-foreground
accent + accent-foreground
```

- **Compliance:** All migrated components follow token pairing convention
- **Critical Fix:** Login/Register forms corrected from `background` to `card` (semantic surface type)

#### Pattern 3: Material Design 3 State Layers

```typescript
hover: accent/8 (8% opacity)
focus: accent/12 (12% opacity)
pressed: accent/12 (12% opacity)
```

- **Usage:** 13+ components use this pattern
- **Rationale:** Maintains contrast ratios, consistent across all tokens

#### Pattern 4: Border System Universal Standard

```typescript
borderWidth="1px" + borderColor="border"
```

- **Usage:** 20+ components enforce explicit 1px borders
- **Compliance:** Follows `.arc/reference/strategies/project/style/strategy-border-system.md`
- **Exception:** Checkboxes/radios use 2px (differentiation from text inputs)

#### Pattern 5: Focus Ring Accessibility

```typescript
_focus={{ outline: "2px solid", outlineColor: "ring", outlineOffset: "2px" }}
```

- **Usage:** 5+ components (inputs, checkboxes, OAuth buttons)
- **Compliance:** WCAG 2.4.13 (2px minimum thickness, 3:1 contrast)
- **Rationale:** Keyboard navigation accessibility

#### Pattern 6: Semantic Error States

```typescript
destructive-foreground (error text)
destructive/10 (error background, 10% opacity)
destructive (error border)
```

- **Usage:** 8+ components for error messages and validation
- **Consistency:** Replaces hardcoded `red.*` colors across all components

#### Pattern 7: Link Interaction (Accessibility Pattern)

```typescript
textDecoration="underline"
color="accent"
_hover={{ color: "accent-hover" }}
_focus={{ outline: "2px solid", outlineColor: "ring" }}
```

- **Usage:** 2 components (Login, Register links)
- **Rationale:** WCAG compliance (color alone insufficient), Nielsen Norman Group best practices
- **Research:** External-research-analyst findings (IBM Carbon, GitHub Primer, Material Design 3)

### Components Verified as NOT Needing Migration

Per `.arc/active/incidental/tasks-theme-system-modernization.md` Task 4.4 notes:

- **NowPlaying, Popular, TopRated, Upcoming, SearchResults** - Thin wrappers around MovieCollectionGrid (already converted)
- **Profile, Settings, PersonDetail, UserProfile** - Placeholder stubs with no styling

### Key Findings for Phase 3 Planning

1. **Current token coverage is comprehensive** - 34 components successfully using current 33-token system
2. **No missing tokens identified** - All components found appropriate tokens for their use cases
3. **Token pairing discipline** - All components follow background + foreground pairing convention
4. **Border system adoption** - 20+ components enforce 1px universal standard with explicit props
5. **Material Design 3 pattern adoption** - 13+ components use opacity-based state layers
6. **Focus accessibility** - 5+ components implement WCAG-compliant focus rings

### Enhancement Opportunities (For Task 1.3.2 Analysis)

**Potential candidates for new unified vocabulary tokens:**

1. **Border hierarchy** - Components using `border` token universally
   - **Opportunity:** `border-strong-02` for elevated surfaces (modals, panels on layer-02)
   - **Candidates:** AdvancedMovieFilters panel, overlay modals, elevated form containers

2. **Interaction states** - Components manually handling hover/active states
   - **Opportunity:** `layer-hover-01`, `layer-selected-01`, `layer-active-01` per layer
   - **Candidates:** Sidebar list items, pagination buttons, filter dropdowns, menu items

3. **Layer-03 elevation** - No components currently using highest elevation
   - **Opportunity:** `layer-03` for dropdowns over modals
   - **Candidates:** Dropdown menus appearing over modal dialogs (future use case)

4. **Shadow system** - No components currently using shadow tokens
   - **Opportunity:** `shadow-sm/md/lg` to replace elevation via color change
   - **Candidates:** MovieCard hover states, modal dialogs, elevated panels
   - **Note:** Primer/Pajamas official tokens, Carbon minimal shadows

**Token migration targets:**

- `card` → `layer-01` (11 components)
- `surface-elevated` → `layer-02` (1 component)
- `popover` → keep as semantic alias or map to `layer-03`

---

**Audit Status:** Complete ✅
**Components Documented:** 34 migrated + 2 pending
**Token Usage Patterns:** 7 major patterns identified
**Enhancement Opportunities:** 4 categories identified for Task 1.3.2 analysis

---

## Component Enhancement Opportunities Analysis (Task 1.3.2)

**Analysis Date:** 2025-11-04
**Purpose:** Identify specific components that would benefit from new unified vocabulary tokens (border hierarchy,
interaction states, layer-03, shadows).

### Methodology

**Approach:** Review each of the 34 migrated components against the 4 enhancement categories to identify optional
improvements that would leverage the richer unified vocabulary from the adapter layer.

**Criteria:**

- **Enhancement is optional** - Component works correctly with current tokens
- **Enhancement adds value** - Improved semantics, reduced manual color manipulation, or better cross-theme consistency
- **Enhancement is practical** - Reasonable effort to implement, clear benefit

**Note:** These are enhancement opportunities, NOT migration requirements. Components will function correctly with current
token mappings (`card`, `surface-elevated`, `border`). Enhanced tokens provide richer vocabulary for optional improvements.

---

### Category 1: Border Hierarchy Enhancements

**Unified Vocabulary Available:**

- `border-subtle-00` - Subtle borders on background/layer-01 surfaces
- `border-subtle-02` - Subtle borders on layer-02 surfaces (maintains visibility across elevation)
- `border-strong-01`, `border-strong-02`, `border-strong-03` - Accessible borders per layer

**Problem Solved:** Current `border` token is universal but doesn't adapt to elevation level. Carbon Design System provides
per-layer borders to maintain visibility - a universal border on layer-02 may be invisible due to insufficient contrast.

#### High-Priority Candidates (Clear Benefit)

**AdvancedMovieFilters.tsx** - Filter panel on elevated surface

- **Current:** `bg="muted"` (subtle background) + `borderColor="border"` (universal)
- **Enhancement:** `borderColor="border-strong-02"` if panel uses `layer-02` background
- **Benefit:** Ensures border visibility across all themes on elevated panel
- **Component location:** Lines 110-114 (panel border), line 92 (button border)
- **Estimated effort:** 5 minutes (change borderColor prop)

**Login.tsx, Register.tsx** - Form containers on elevated surface

- **Current:** `bg="card"` (layer-01) + `borderColor="border"` on inputs
- **Enhancement:** No change needed - using layer-01, current `border` is correct
- **Note:** Already using correct border token for elevation level

**NavBarUserMenu.tsx** - Dropdown menu (overlay)

- **Current:** `bg="popover"` + `borderColor="border"` (line ~41 in migration notes)
- **Enhancement:** Consider `borderColor="border-strong-01"` for popover outline
- **Benefit:** Ensures dropdown border distinct from page content
- **Estimated effort:** 5 minutes

#### Medium-Priority Candidates (Marginal Benefit)

**MovieDetail.tsx** - Card containers for movie info

- **Current:** Likely uses `card` background + `border` for sections
- **Enhancement:** Evaluate if any nested sections use elevated backgrounds
- **Benefit:** Improved visual hierarchy for nested elevated content
- **Estimated effort:** 10-15 minutes (requires component review)

**MovieCard.tsx** - Movie card borders

- **Current:** Uses `border` for card outlines
- **Enhancement:** Consider `border-subtle-00` for subtle card differentiation
- **Benefit:** Softer card outlines, relies more on shadow for elevation
- **Estimated effort:** 5 minutes
- **Trade-off:** May reduce card distinction in themes without shadows

#### Low-Priority Candidates (Minimal Benefit)

**Footer.tsx, NavBar.tsx** - Layout component borders

- **Current:** `bg="card"` + `borderColor="border"` for separators
- **Enhancement:** No change recommended - separator borders intentionally universal
- **Rationale:** Separators should be consistent regardless of elevation

---

### Category 2: Interaction State Enhancements

**Unified Vocabulary Available:**

- `layer-hover-01`, `layer-hover-02` - Hover states per layer (derived from base layer colors)
- `layer-selected-01`, `layer-selected-02` - Selected states per layer
- `layer-active-01`, `layer-active-02` - Active/pressed states per layer

**Problem Solved:** Current pattern uses manual opacity (`accent/8`, `accent/12`) which works but requires component
logic. Derived interaction tokens are automatically adapted per layer for consistent appearance.

#### High-Priority Candidates (Clear Benefit)

**SidebarContent.tsx** - Interactive list items

- **Current:** Hover `accent/8`, selected `accent/12` (lines from migration notes)
- **Enhancement:** Hover `layer-hover-01`, selected `layer-selected-01`
- **Benefit:** Automatic adaptation to sidebar's `card` (layer-01) background
- **Component:** List item hover/selected states
- **Estimated effort:** 10 minutes (replace opacity tokens with layer tokens)

**PaginationCtrl.tsx** - Page number buttons

- **Current:** Active page uses `bg="muted"` + `color="accent"` + `borderColor="accent"`
- **Enhancement:** Active page uses `bg="layer-selected-01"` (consistent with sidebar pattern)
- **Benefit:** Semantic token for "selected item on layer-01" instead of generic "muted"
- **Component:** Active page button styling (lines 127, 257-259 in component)
- **Estimated effort:** 10 minutes

**NavBarUserMenu.tsx** - Dropdown menu items

- **Current:** Hover `accent/8`, active `accent/12` on `popover` background
- **Enhancement:** Hover `layer-hover-02` (or layer-hover-popover if popover treated as layer-02)
- **Benefit:** Consistent with popover overlay elevation level
- **Component:** Menu item interactive states
- **Estimated effort:** 10 minutes

**AdvancedMovieFilters - GenreSelector, dropdown items** - Interactive filter options

- **Current:** Hover `accent`, selected `muted` (from migration notes)
- **Enhancement:** Hover `layer-hover-01`, selected `layer-selected-01`
- **Benefit:** Consistent interaction semantics across all filterable lists
- **Component:** Genre chips, year/rating dropdown items
- **Estimated effort:** 15 minutes (multiple child components)

#### Medium-Priority Candidates (Marginal Benefit)

**MobileMenuButton.tsx, NavBar active tabs** - Interactive buttons/tabs

- **Current:** Hover `accent/8` on various buttons
- **Enhancement:** Hover `layer-hover-01` (navbar uses `card`/layer-01)
- **Benefit:** Consistency with other layer-01 interactive elements
- **Trade-off:** Current accent overlay works well for emphasis
- **Estimated effort:** 5-10 minutes

**MovieCard hover states** - Card hover elevation

- **Current:** Likely uses `accent/8` overlay or manual opacity
- **Enhancement:** `layer-hover-01` for subtle hover state on cards
- **Benefit:** Semantic hover token instead of manual opacity
- **Component:** MovieCard component
- **Estimated effort:** 10 minutes (requires component review)

#### Low-Priority Candidates (Minimal Benefit)

**Login/Register form inputs** - Input hover states

- **Current:** `accent/5` hover on inputs (auth pages only, Task 4.2 notes)
- **Enhancement:** Keep as-is - input hover emphasis is intentional accent overlay
- **Rationale:** Accent overlay draws attention to active input, different from layer hover

---

### Category 3: Layer-03 Elevation Enhancements

**Unified Vocabulary Available:**

- `layer-03` - Highest elevation level (dropdowns over modals, tooltips over dialogs)

**Problem Solved:** Provides explicit token for maximum elevation instead of reusing `surface-elevated` or `popover`.

#### High-Priority Candidates (Clear Benefit)

**None identified in current implementation** - No components currently render dropdowns over modals

#### Medium-Priority Candidates (Future Use Cases)

**Potential: Modal with dropdown** - If future modals include select dropdowns

- **Current pattern:** Modal uses `surface-elevated` (layer-02), dropdown uses `popover`
- **Enhancement:** Modal uses `layer-02`, dropdown uses `layer-03`
- **Benefit:** Explicit semantic hierarchy (page → card → modal → dropdown)
- **Component:** Not yet implemented
- **Estimated effort:** N/A (future consideration)

**Potential: Tooltip over modal** - If tooltips added to modal content

- **Current pattern:** Likely would use `popover` token
- **Enhancement:** Tooltip uses `layer-03` for maximum elevation
- **Benefit:** Clear semantic intent for "above everything" overlays
- **Component:** Not yet implemented
- **Estimated effort:** N/A (future consideration)

#### Low-Priority Candidates (Minimal Benefit)

**NavBarUserMenu dropdown** - Currently uses `popover`

- **Current:** `bg="popover"` (correct for dropdown overlay)
- **Enhancement:** Consider mapping `popover` → `layer-03` in adapter
- **Benefit:** Semantic mapping of overlay to highest elevation
- **Trade-off:** `popover` semantic alias may be clearer than numeric layer
- **Estimated effort:** 0 (decision at adapter level, not component level)

---

### Category 4: Shadow System Enhancements

**Unified Vocabulary Available:**

- `shadow-sm` - Subtle shadows for cards (Primer/Pajamas official, Carbon minimal)
- `shadow-md` - Medium shadows for popovers/dropdowns
- `shadow-lg` - Large shadows for modals

**Problem Solved:** Provides official shadow tokens from design systems. Currently, elevation differentiation relies
primarily on background color changes. Shadows can supplement or replace color-based elevation.

**Design System Context:**

- **GitHub Primer:** Shadow-based elevation (same background, differentiate with shadow)
- **IBM Carbon:** Layer progression (minimal shadows, layer colors are primary)
- **GitLab Pajamas:** Hybrid (section tokens + shadows)

#### High-Priority Candidates (Clear Benefit)

**MovieCard.tsx** - Card elevation and hover states

- **Current:** Likely uses background color change for hover
- **Enhancement:** Add `shadow="shadow-sm"` default, `shadow="shadow-md"` on hover
- **Benefit:** Follows Primer/Pajamas elevation pattern, adds depth without color change
- **Component:** Movie card container
- **Estimated effort:** 10 minutes (add shadow props)
- **Note:** Shadows are opt-in per component, adapter provides tokens

**NavBarUserMenu dropdown** - Dropdown elevation

- **Current:** `bg="popover"` provides color-based elevation
- **Enhancement:** Add `shadow="shadow-md"` to dropdown container
- **Benefit:** Clear visual elevation above page content, especially in light mode
- **Component:** Dropdown menu container
- **Estimated effort:** 5 minutes

**Modal dialogs (future)** - If modals added to app

- **Current:** N/A (no modals in current implementation)
- **Enhancement:** `bg="layer-02"` + `shadow="shadow-lg"`
- **Benefit:** Maximum elevation signal for modal overlays
- **Component:** Not yet implemented
- **Estimated effort:** N/A (future consideration)

#### Medium-Priority Candidates (Marginal Benefit)

**AdvancedMovieFilters panel** - Filter panel elevation

- **Current:** `bg="muted"` (subtle background)
- **Enhancement:** Add `shadow="shadow-sm"` for subtle elevation
- **Benefit:** Distinguishes filter panel from page content without strong background
- **Component:** Filter panel container (line 106-174)
- **Estimated effort:** 5 minutes
- **Trade-off:** May be too subtle in Carbon (minimal shadow philosophy)

**Login/Register form containers** - Elevated form cards

- **Current:** `bg="card"` provides color-based elevation
- **Enhancement:** Add `shadow="shadow-sm"` to form containers
- **Benefit:** Reinforces elevation in light mode, subtle depth
- **Component:** Form card containers
- **Estimated effort:** 5 minutes
- **Trade-off:** Shadows may not align with Carbon's layer-first approach

#### Low-Priority Candidates (Minimal Benefit)

**NavBar, Footer, Sidebar** - Layout component elevation

- **Current:** `bg="card"` with `border` separators
- **Enhancement:** Add subtle shadows to layout components
- **Benefit:** Marginal - layout components use borders effectively
- **Trade-off:** May add unnecessary visual complexity
- **Estimated effort:** 5 minutes each
- **Recommendation:** Keep current border-based approach

**PaginationCtrl buttons** - Button elevation on hover

- **Current:** `bg="muted"` for active page, hover uses opacity
- **Enhancement:** Add `shadow="shadow-sm"` on hover
- **Benefit:** Subtle depth cue for interactive elements
- **Trade-off:** May be over-designed for simple pagination
- **Estimated effort:** 10 minutes
- **Recommendation:** Current approach is sufficient

---

### Enhancement Opportunities Summary

#### By Category

**Border Hierarchy (5 components):**

- High-priority: AdvancedMovieFilters (panel), NavBarUserMenu (dropdown) - **2 components**
- Medium-priority: MovieDetail, MovieCard - **2 components**
- Low-priority: Footer, NavBar - **1 component** (no change recommended)

**Interaction States (9 components):**

- High-priority: SidebarContent, PaginationCtrl, NavBarUserMenu, AdvancedMovieFilters - **4 components**
- Medium-priority: MobileMenuButton, NavBar tabs, MovieCard - **3 components**
- Low-priority: Login/Register inputs - **2 components** (no change recommended)

**Layer-03 Elevation (0 components):**

- No current use cases identified
- Future consideration: Modals with dropdowns, tooltips over dialogs

**Shadow System (7 components):**

- High-priority: MovieCard, NavBarUserMenu dropdown - **2 components**
- Medium-priority: AdvancedMovieFilters, Login/Register forms - **3 components**
- Low-priority: NavBar, Footer, Sidebar, PaginationCtrl - **4 components** (not recommended)

#### By Component (Aggregate Enhancement Opportunities)

**Top Enhancement Candidates (Multiple Categories):**

1. **MovieCard.tsx** (3 categories)
   - Border: `border-subtle-00` for softer outlines
   - Interaction: `layer-hover-01` for hover state
   - Shadow: `shadow-sm` default, `shadow-md` hover
   - **Total estimated effort:** 25 minutes

2. **NavBarUserMenu.tsx** (3 categories)
   - Border: `border-strong-01` for popover outline
   - Interaction: `layer-hover-02` for menu items
   - Shadow: `shadow-md` for dropdown elevation
   - **Total estimated effort:** 20 minutes

3. **AdvancedMovieFilters.tsx** (3 categories)
   - Border: `border-strong-02` if using layer-02 background
   - Interaction: `layer-hover-01`, `layer-selected-01` for filter items
   - Shadow: `shadow-sm` for panel elevation
   - **Total estimated effort:** 25 minutes

4. **SidebarContent.tsx** (1 category)
   - Interaction: `layer-hover-01`, `layer-selected-01` for list items
   - **Total estimated effort:** 10 minutes

5. **PaginationCtrl.tsx** (1 category)
   - Interaction: `layer-selected-01` for active page
   - **Total estimated effort:** 10 minutes

**Components with No/Minimal Enhancement Opportunities:**

- Login.tsx, Register.tsx, VerifyEmail.tsx (auth pages work correctly as-is)
- Footer.tsx, NavBar.tsx, Sidebar.tsx (layout components effective with current tokens)
- Featured.tsx, MovieDetail.tsx, MovieGrid.tsx, MovieCollectionGrid.tsx (content pages work well)
- TypographyTest.tsx (showcase page, not production UI)

---

### Recommendations for Phase 3 Planning

**Tiered Approach:**

**Tier 1: High-Value Enhancements (Quick Wins)**

- **Target:** 5 components (MovieCard, NavBarUserMenu, AdvancedMovieFilters, SidebarContent, PaginationCtrl)
- **Total effort:** ~90 minutes
- **Benefit:** Demonstrates richer vocabulary, improves consistency across interactive elements

**Tier 2: Optional Enhancements (Nice-to-Have)**

- **Target:** 5 components (MobileMenuButton, NavBar tabs, MovieDetail nested sections, filter dropdowns)
- **Total effort:** ~45 minutes
- **Benefit:** Marginal consistency improvements

**Tier 3: No Enhancement Recommended**

- **Target:** 24 components (auth pages, layout, content pages work correctly)
- **Rationale:** Current tokens are semantically correct and functional

**Migration-Only Tasks (No Enhancements):**

- All 34 components require token name migration (`card` → `layer-01`, etc.)
- Enhancement opportunities are OPTIONAL and can be applied selectively

**Phase 3 Task Breakdown Strategy:**

- **Batch 1:** Simple migrations (no enhancements) - 24 components, ~5 min each = 120 minutes
- **Batch 2:** Migrations + Tier 1 enhancements - 5 components, ~20 min each = 100 minutes
- **Batch 3:** Migrations + Tier 2 enhancements (optional) - 5 components, ~15 min each = 75 minutes

**Total Phase 3 Estimated Effort:** 220-295 minutes (3.7-4.9 hours)

---

**Analysis Status:** Complete ✅
**Components Analyzed:** 34 migrated components
**Enhancement Candidates Identified:** 14 components across 4 categories
**High-Priority Enhancements:** 5 components (Tier 1)
**Estimated Total Enhancement Effort:** 90 minutes (Tier 1 only)

---

## Phase 3 Review Analysis: Layer System Testing & Visual Validation

**Review Date:** 2025-11-06
**Purpose:** Document visual testing results from Phase 3 component migration
(cloud branch: `claude/theme-phase3-component-migration-011CUoR62JhE7AQFJrCVSXzk`),
identify layer contrast issues, and plan remediation strategy.

### Context

Phase 3 component migration was completed by Claude Code Web (cloud environment) on a feature branch. Before merging
into `technical/service-layer-modernization`, manual visual review revealed critical layer system contrast issues.

**Testing Environment:**

- **Page:** `/theme-debug` (expanded with unified token test sections)
- **Themes tested:** All 6 combinations (3 themes × 2 modes)
- **Focus:** Layer System section visual validation

---

### Layer System Visual Testing Results

#### ✅ Working Correctly (Dark Modes)

**IBM Carbon Dark:**

- All 4 layers clearly distinct
- Progression: #161616 → #262626 → #393939 → #525252
- Uses 100% official Carbon G100 tokens (no derivation needed)
- **Status:** PERFECT ✅

**GitHub Primer Dark:**

- All 4 layers distinct
- Base: `bg_muted` + 7% adjustments
- Subtle but appropriate for Primer's aesthetic
- **Status:** ACCEPTABLE ✅

**GitLab Pajamas Dark:**

- All 4 layers distinct
- Layer-01 clearly differentiated
- Layers 02/03 subtle but visible
- **Status:** ACCEPTABLE ✅

#### ❌ FAILING (Light Modes - Critical Issues)

**GitHub Primer Light:**

- **FAIL:** Layers 01, 02, 03 visually IDENTICAL to naked eye
- Only layer-01 distinguishable from background
- Adjustment percentage (15% light, 7% dark) insufficient for light backgrounds
- **Root cause:** Light backgrounds need DARKER adjustments (negative values), and 15% not enough

**GitLab Pajamas Light:**

- **FAIL:** Layers 01, 02, 03 visually IDENTICAL to naked eye
- Required color picker inspection to detect differences
- Far too subtle for practical use
- **Root cause:** Same as GitHub Primer - insufficient contrast on white backgrounds

**IBM Carbon Light:**

- **Needs verification:** User did not test this combination during review session
- **DECISION (ADR-008):** Adopt Carbon's official alternating pattern (white/gray/white/gray)
- **Rationale:** Carbon is our architectural blueprint - adopt the entire pattern, not just token count
- Previous derived approach (-12%/-24% progressive) was naive attempt at universal strategy

---

### Technical Analysis: Why Light Modes Fail

**Problem:**
15% adjustment on light backgrounds creates imperceptible differences:

- `#f6f8fa` (bg_muted) + 15% lighter = `#f7f9fb` (barely distinguishable)
- `#ececef` (bg_section) + 15% lighter = `#edeeef` (requires color picker to detect)

**Why Dark Modes Work:**

- Smaller 7% adjustment on dark backgrounds is sufficient
- Dark colors show distinction more readily at lower percentages
- Example: `#262626` + 7% lighter creates visible jump

**Why We Can't Just Increase Percentage:**

- Going too light on white backgrounds quickly hits #ffffff ceiling
- Need to darken instead of lighten for light mode progression
- Carbon Light inspiration: Progressively darken from gray base

---

### What We've Tried (Iteration History)

**Attempt 1: Initial Implementation (3% adjustments)**

- **Result:** ALL light modes failed, dark modes too subtle
- **Learning:** 3% insufficient for any background color

**Attempt 2: Increased to 15% light / 7% dark**

- **Result:** Dark modes now acceptable, light modes still failing
- **Learning:** Light modes need different strategy than dark modes

**Attempt 3: Changed approach for Carbon Light (-12% / -24% darkening)**

- **Result:** Not yet tested by user (pending next session)
- **Theory:** Darkening from gray base should create visible progression

---

### Current Implementation Status

**Adapter Files:**

- `frontend/src/theme/adapter/mappings/github-primer.ts` - 15%/7% adjustments
- `frontend/src/theme/adapter/mappings/gitlab-pajamas.ts` - 15%/7% adjustments
- `frontend/src/theme/adapter/mappings/ibm-carbon.ts` - -12%/-24% for light, official tokens for dark

**System Integration:**

- Theme registry updated: `ibm-carbon` now default (was `github`)
- Theme registry reordered: IBM Carbon first in dropdown
- ThemeDebug expanded with unified token test sections
- Color mode toggle added to ThemeDebug quick switcher

**Quality Gates:**

- ✅ TypeScript: 0 errors
- ✅ Frontend Linting: 0 warnings
- ✅ Backend Linting: All checks passed
- ✅ Frontend Tests: 82/82 passing

---

### DECISION: Adopt Carbon Light Mode Alternating Pattern (ADR-008)

**Implemented:** 2025-11-06

**Final Strategy:** Adopt Carbon's official alternating pattern for ALL themes in light mode.

**Rationale:**

- Carbon is our architectural blueprint (ADR-006) - adopt the **entire pattern**, not just token count
- Progressive darkening in light mode fails (15% adjustments create indistinguishable grays)
- Carbon's alternating pattern addresses real challenges (accessibility, visual nesting, avoids muddy mid-grays)
- Proven approach from Carbon's design team based on extensive research

**Implementation:**

**IBM Carbon Light:**

- Use official tokens: white → gray (#f4f4f4) → white → gray
- No derivation needed (100% official)

**GitHub Primer Light:**

- Derive alternating: `bg_default` (white) ↔ `bg_muted` (gray)
- Pattern: white → gray → white → gray

**GitLab Pajamas Light:**

- Derive alternating: `bg_default` (white) ↔ `bg_section` (gray)
- Pattern: white → gray → white → gray

**All Dark Modes:**

- Continue progressive lightening (no change)
- Carbon: Official tokens
- Primer/Pajamas: Derived progressive (7% adjustments)

**Re-evaluation Trigger:**

- Decision may be revisited once more frontend components are complete
- Monitor for white-on-white issues in specific component contexts
- Border hierarchy (`border-strong-01/02/03`) becomes critical for light mode

**Deprecated Options (kept for historical record):**

~~**Option A: Aggressive Darkening**~~ - Rejected, doesn't respect Carbon blueprint
~~**Option B: Hybrid (Lighten then darken)**~~ - Rejected, unnecessary complexity
~~**Option C: Carbon-Inspired Absolute Values**~~ - Superseded by adopting Carbon's actual pattern

---

### Approach Validation

**User consensus:** The Carbon-inspired layer system approach is SOUND

**Reasoning:**

- The adapter architecture is correct
- The concept of deriving distinct layers is correct
- We simply need better adjustment percentages for light modes
- Dark modes already working proves the approach viable

**NOT a fundamental architecture problem** - just tuning needed

---

## Semantic Colors Audit

**Date Initiated:** 2025-11-07
**Triggered By:** ThemeDebug page enhancement revealing semantic color inconsistencies
**Status:** Investigation Phase

### Discovery Context

While enhancing the ThemeDebug page to demonstrate all semantic color tokens, several critical issues were discovered:

1. **Primary and Success are identical** - Both map to `palette.bg_success` in all three adapters
2. **Secondary color questionable** - IBM Carbon light mode uses dark gray (`#393939`), inconsistent with rest of theme
3. **Muted color unclear** - GitLab Pajamas dark mode: muted and secondary are nearly indistinguishable
4. **Warning color questionable** - GitLab Pajamas light mode uses dark amber/gold (`#995715`), feels out of step with palette
5. **GitHub Primer missing official tokens** - Warning and Info are derived, not from official Primer palette

### Industry Research Findings

**Research Method:** External research agent analyzing major design systems (Material Design, Ant Design, Bootstrap,
Atlassian, Shopify Polaris, Adobe Spectrum, Microsoft Fluent, GitHub Primer, IBM Carbon)

#### Key Finding 1: Primary vs Success Distinction

**Industry Standard Pattern:**

- **Primary** = Brand identity color, typically **blue** for primary action buttons
- **Success** = Positive feedback color, typically **green** for success states
- **Separation is idiomatic** across 8 of 9 major design systems
- **Material Design 3 is the outlier** (integrates success into primary)

**Examples from major systems:**

```
Bootstrap:     Primary (blue) ≠ Success (green)
Ant Design:    Primary (#1677ff blue) ≠ Success (green)
Atlassian:     Primary (B400 blue) ≠ Success (green)
GitHub Primer: Accent (blue) ≠ Success (green)
Shopify:       Primary (indigo) ≠ Success (green)
IBM Carbon:    Primary (blue-60) ≠ Success (green)
```

**Exception:** GitHub Primer uses green (success) for primary action buttons, but this is an **intentional outlier**
reflecting GitHub's focus on positive actions ("merge", "create").

**Recommendation:** Adopt **Option B** (separate Primary=blue, Success=green) as industry standard pattern.

#### Key Finding 2: Primary Action Button Color

**Clear Consensus:** Primary action buttons use **brand/primary color (usually blue)**

**Frequency across 9 major systems:**

- Blue: 8 systems
- Green: 1 system (GitHub Primer - intentional outlier)

**Why blue?**

- Strong action connotations in digital interfaces
- Long-established user expectation (links are blue)
- Doesn't conflict with semantic meanings (green=success, red=danger, yellow=warning)
- Works well for brand differentiation

#### Key Finding 3: Secondary Button Semantics

**Three interpretations found, ordered by frequency:**

1. **Neutral/Gray Supporting Actions (Most Common)**
   - Bootstrap: Explicitly defines "Secondary" as supporting actions with different styling
   - Color: Gray/neutral tones with outline or ghost styling
   - Examples: Cancel, Skip, Back buttons
   - **EightShapes Best Practice:** "Secondary actions should be styled to reflect their lower priority"

2. **Secondary Brand Color (Less Common)**
   - Used if system has distinct primary + secondary brand colors
   - Example: If primary is blue, secondary might be purple
   - Not typically for buttons, more for status/semantic feedback

3. **Supporting but Visually Distinct Color**
   - Atlassian approach: Secondary palette with accent colors (red, yellow, green, teal, purple)
   - Used for meaningful feedback, warnings, special states
   - Not typically used for "secondary buttons"

**Consensus:** Secondary buttons should be **neutral gray with outline styling**, not a distinct brand color.

#### Key Finding 4: Muted Color Role

**Well-established semantic token** with consistent meaning across all systems:

**Primary Uses:**

1. Deemphasized/secondary content (text and elements with lower importance)
2. Disabled states (reduced visibility for inactive components)
3. Tertiary text (following primary → secondary → tertiary hierarchy)

**Technical Implementation Pattern:**

- Desaturate base color (add gray)
- Reduce opacity (typically 40-70%)
- Lower contrast ratio (often 1.1:1 against default surface)

**Design Systems Examples:**

- **GitHub Primer:** "Muted background and border colors draw attention with subtle emphasis"
- **Shopify Polaris:** Tokens like `surface-subdued`, `text-muted`, `icon-disabled`
- **Textual Framework:** `$text-muted` at 70% opacity for lower importance content

**Consensus:** Muted is for deemphasized content, NOT a distinct brand color.

### Current Implementation Issues

#### Issue 1: Primary = Success (Redundancy)

**Current Code (All Three Adapters):**

```typescript
// github-primer.ts:89, ibm-carbon.ts:118, gitlab-pajamas.ts:105
const primary = palette.bg_success;   // ← Same source
const success = palette.bg_success;   // ← Same source
```

**Problem:**

- Creates redundancy: Two semantic tokens with different meanings map to identical color
- Violates industry standard separation (primary=blue brand, success=green feedback)
- Confuses semantic meaning in component usage

**Root Cause Analysis:**
All three official design systems explicitly label `bg_success` as "Primary action button background":

- GitHub Primer: "Primary action button background" → `#1f883d` (green)
- IBM Carbon: "Primary action button background" → `#24a148` (green)
- GitLab Pajamas: "Primary action button background (green-500)" → `#108548` (green)

**Why this happened:** The source design systems themselves conflate these concepts - they use green for BOTH:

- Primary action buttons (main CTA)
- Success feedback states

**Resolution Required:** Decide unified system approach:

- Do we follow source systems (primary=green, success=green)?
- Or follow industry standard (primary=blue brand, success=green feedback)?

#### Issue 2: Secondary Color Inconsistencies

**IBM Carbon Light Mode:**

```typescript
// ibm-carbon.ts:121
const secondary = palette.bg_button_secondary;  // #393939 (dark gray)
```

**Problem:** Dark gray (`#393939`) stands out dramatically in IBM Carbon light mode (white/gray palette).
Appears out of place.

**Expected:** Neutral gray that fits the light mode aesthetic.

**Investigation Needed:**

- Is `#393939` the correct IBM Carbon token for secondary buttons in light mode?
- Check official Carbon documentation for `bg_button_secondary` usage
- Verify if this is an outlier or if we're misusing the token

**GitLab Pajamas Dark Mode:**

```typescript
// gitlab-pajamas.ts:108
const secondary = palette.bg_button_secondary;  // #28272d
const muted = palette.bg_muted;                 // #28272d
```

**Problem:** Secondary and muted are identical or nearly indistinguishable in dark mode.

**Investigation Needed:**

- Are these the correct GitLab tokens?
- Should they be visually distinct?
- Check official Pajamas documentation

#### Issue 3: GitHub Primer Missing Official Tokens

**Warning Color:**

```typescript
// github-primer.ts:150-151
const warning = mode === "light" ? "#d4a72c" : "#bb8009";  // DERIVED (not official)
const warningForeground = mode === "light" ? "#744500" : "#e3b341";
```

**Problem:** These are **custom values, not from official Primer palette**.

**Official Primer Token Found:**

- **Role:** "attention" (for warning states)
- **Hex Values:**
    - Light mode foreground: `#9a6700` (dark amber/gold)
    - Light mode muted background: `#fff8c5` (pale yellow)
    - Dark mode: TBD (need to research)

**Action Required:** Add official Primer "attention" tokens to palette, update adapter to use them.

**Info Color:**

```typescript
// github-primer.ts:155-156
const info = palette.fg_accent;        // Reuses accent (blue)
const infoForeground = palette.fg_accent;
```

**Problem:** We're reusing accent, not deriving separate info color.

**Investigation Finding:** This is **CORRECT** per official Primer documentation:

- Primer's "accent" role is explicitly for "Links, selected, active, focus states, **and neutral information**"
- Primer does NOT have a separate "info" semantic role
- Reusing accent for info is intentional and matches Primer's design

**Action Required:** None - current implementation correct, but should document this clearly.

#### Issue 4: Warning Color Aesthetics

**GitLab Pajamas Light Mode:**

```typescript
// gitlab-pajamas.ts:95-96
fg_warning: "#995715"  // Dark amber/gold
```

**Problem:** User observation - "feels kind of out of step with the rest of the colors in that mode"

**Investigation Needed:**

- Verify this is the official GitLab Pajamas warning color
- Check GitLab's official design documentation
- Compare with other colors in light mode palette
- Determine if aesthetic concern reflects actual GitLab usage or if our token usage is incorrect

### Systematic Audit Plan

#### Phase 1: Verify Palette Accuracy (All Official Tokens)

**Goal:** Ensure ALL tokens in palette files match official design system values.

**For Each Theme (GitHub Primer, IBM Carbon, GitLab Pajamas):**

1. **Brand Colors Verification:**
   - [ ] Verify `fg_accent` hex values (light + dark)
   - [ ] Verify `bg_success` hex values (light + dark)
   - [ ] Verify `bg_danger` / `fg_danger` hex values (light + dark)
   - [ ] Document official sources (design system docs, npm package versions)

2. **Warning/Info Colors Verification:**
   - [ ] **GitHub Primer:** Add missing "attention" token to palette (official warning)
   - [ ] **IBM Carbon:** Verify `fg_warning` and `fg_info` are official (they appear to be - lines 102-105)
   - [ ] **GitLab Pajamas:** Verify `fg_warning` and `fg_info` are official (lines 95-98)

3. **Secondary Button Verification:**
   - [ ] **IBM Carbon:** Verify `bg_button_secondary` is correct token for light mode (`#393939`)
   - [ ] **GitHub Primer:** Verify `bg_button_secondary` usage
   - [ ] **GitLab Pajamas:** Verify `bg_button_secondary` usage

4. **Muted Token Verification:**
   - [ ] Verify all `bg_muted` / `fg_muted` tokens against official sources
   - [ ] Check if muted and secondary should be visually distinct in all modes

**Deliverable:** Corrected palette files with verified official tokens only.

#### Phase 2: Evaluate Adapter Mappings (Unified System Design)

**Goal:** Design optimal mapping from official palette → unified semantic vocabulary.

**Decision Points:**

1. **Primary vs Success Resolution:**
   - [ ] **Option A:** Keep current (primary=success=green), accept redundancy
   - [ ] **Option B (Recommended):** Primary=blue accent (brand), Success=green (feedback)
   - [ ] **Option C:** Create `primary-action` token separate from brand `primary`
   - [ ] Document rationale and industry context

2. **Secondary Button Semantic:**
   - [ ] Define what "secondary" means in our unified system
   - [ ] Map appropriately: gray outline vs secondary brand color vs palette.bg_button_secondary
   - [ ] Ensure consistency across all 3 themes

3. **Muted Token Semantic:**
   - [ ] Define what "muted" means in our unified system (disabled? tertiary text? deemphasized bg?)
   - [ ] Ensure visual distinction from secondary in all 6 theme combinations
   - [ ] Map appropriately from palette tokens

4. **Warning Color Consistency:**
   - [ ] Evaluate GitLab Pajamas warning color aesthetic concern
   - [ ] Decide: use official token (respect design system) vs derive custom (visual consistency)
   - [ ] Document decision rationale

**Deliverable:** Updated adapter mapping strategy with documented decisions.

#### Phase 3: Visual Validation (All 6 Theme Combinations)

**Goal:** Validate all brand and status colors render correctly and consistently.

**For Each Theme Combination (6 total):**

**GitHub Primer - Light:**

- [ ] Primary color appropriate for brand/actions (expected: blue if Option B)
- [ ] Success color distinct (expected: green)
- [ ] Secondary color appropriate for supporting actions (expected: gray)
- [ ] Muted color visually distinct from secondary
- [ ] Warning color (attention) uses official amber/gold
- [ ] Info color (accent blue) appropriate

**GitHub Primer - Dark:**

- [ ] Same checks as light mode
- [ ] Verify contrast ratios meet WCAG AA

**IBM Carbon - Light:**

- [ ] Primary color appropriate (expected: blue if Option B)
- [ ] Success color distinct (expected: green)
- [ ] **Secondary color aesthetic check** - does `#393939` (dark gray) fit light mode aesthetic?
- [ ] Muted color visually distinct
- [ ] Warning color (yellow `#f1c21b`) appropriate
- [ ] Info color (blue `#0043ce`) appropriate

**IBM Carbon - Dark:**

- [ ] Same checks as light mode
- [ ] Verify contrast ratios

**GitLab Pajamas - Light:**

- [ ] Primary color appropriate (expected: blue if Option B)
- [ ] Success color distinct (expected: green)
- [ ] Secondary color appropriate
- [ ] Muted color visually distinct from secondary
- [ ] **Warning color aesthetic check** - does `#995715` (dark amber) fit light mode aesthetic?
- [ ] Info color appropriate

**GitLab Pajamas - Dark:**

- [ ] Same checks as light mode
- [ ] **Muted vs Secondary distinction check** - are they distinguishable?
- [ ] Verify contrast ratios

**Deliverable:** Visual validation report documenting any issues found.

#### Phase 4: Documentation

**Goal:** Document semantic meanings and mapping decisions.

**Deliverables:**

1. **Update This Notes File:**
   - [ ] Document final decisions on Primary/Success/Secondary/Muted semantics
   - [ ] Document any deviations from official palettes with rationale
   - [ ] Document industry research findings summary

2. **Update Palette Files:**
   - [ ] Add comprehensive comments explaining each token's official source
   - [ ] Add version numbers for official design system packages
   - [ ] Flag any derived/custom tokens clearly

3. **Update Adapter Files:**
   - [ ] Add comments explaining mapping decisions
   - [ ] Document why we deviate from official usage (if applicable)
   - [ ] Reference this notes file for detailed rationale

### Open Questions

1. **Primary Action Button Color:** If we adopt Option B (primary=blue brand, success=green feedback), what do we use
for primary action buttons?
   - Use `primary` (blue) for primary action buttons?
   - Create separate `primary-action` token?
   - Override in component styling?

2. **IBM Carbon Secondary:** Is `#393939` the correct interpretation of Carbon's secondary button in light mode, or are
we misusing the token?

3. **GitLab Warning Aesthetic:** Is the concern about `#995715` valid, or does it fit GitLab's official aesthetic when
seen in full context?

4. **Material Design 3 Pattern:** Should we consider Material's approach (integrating success into primary) as a valid
alternative, or stick with industry standard separation?

### Next Actions

**Immediate:**

1. Add GitHub Primer "attention" token to palette file
2. Research IBM Carbon `bg_button_secondary` official usage
3. Research GitLab Pajamas warning color in official docs
4. Make decision on Primary vs Success (Option A/B/C)

**After Decision:**
5. Update all three adapter files with new mappings
6. Run visual validation across all 6 theme combinations
7. Update ThemeDebug page to reflect any semantic changes
8. Document final decisions in this notes file

---

## Comprehensive Analysis & Recommendations

**Date:** 2025-11-07
**Status:** Awaiting decision
**Scope:** All semantic color concerns are interconnected - warrant unified approach

### Executive Summary

All identified issues stem from a **fundamental semantic mapping challenge**: our three source design systems
(GitHub Primer, IBM Carbon, GitLab Pajamas) label their green buttons as "primary action button background",
but industry standard separates Primary (brand identity, typically blue) from Success (positive feedback,
typically green).

**Recommendation:** Adopt **Option B** (separate Primary=blue, Success=green) with comprehensive semantic
clarifications documented in ADR. This approach:

- Aligns with 8 of 9 major design systems
- Provides clear semantic distinction between brand identity and feedback states
- Resolves current redundancy where primary and success are identical
- Requires updating all 3 adapters to map blue accent tokens to primary

**ADR Warranted:** Yes - this decision affects system structure, has multiple alternatives, requires industry
context, and future developers will need rationale for understanding the mapping philosophy.

### Issue Interconnections

**Core Problem:** All issues relate to semantic token mapping philosophy:

```
Source Design Systems         CineXplorer Unified Vocabulary
--------------------         -------------------------------
bg_success (green)    ?→     primary (brand identity?)
bg_success (green)    →      success (positive feedback)
fg_accent (blue)      ?→     primary (brand identity?)
```

**Current State (All 3 Adapters):**

```typescript
// github-primer.ts:89, ibm-carbon.ts:118, gitlab-pajamas.ts:105
const primary = palette.bg_success;   // GREEN button
const success = palette.bg_success;   // GREEN feedback (redundant!)
```

**Issue Cascade:**

1. **Primary = Success** (redundancy)
   - Both tokens map to same green color
   - Unclear semantic distinction
   - Violates industry standard (8 of 9 systems separate these)

2. **Secondary unclear** (IBM Carbon light mode)
   - `#393939` (very dark gray) in light mode aesthetic
   - Need to verify if this is correct Carbon token usage
   - Related: What does "secondary" mean in our unified system?

3. **Muted indistinguishable** (GitLab Pajamas dark mode)
   - Secondary and muted both map to `#28272d`
   - Need semantic clarity: What is "muted" vs "secondary"?

4. **Warning missing official tokens** (GitHub Primer)
   - Using derived values instead of official "attention" token
   - Related: How do we handle design system gaps?

5. **Warning aesthetic concern** (GitLab Pajamas light)
   - `#995715` feels out of step
   - Need verification: Is this official Pajamas color?

### Recommended Solution: Option B + Semantic Clarifications

#### Decision 1: Primary vs Success (Option B)

**Adopt industry standard separation:**

```typescript
// Recommended mapping for all 3 adapters:
const primary = palette.fg_accent;        // BLUE (brand identity)
const primaryForeground = palette.fg_onEmphasis;

const success = palette.bg_success;       // GREEN (positive feedback)
const successForeground = palette.fg_onEmphasis;
```

**Rationale:**

- **Industry alignment:** 8 of 9 major design systems separate primary (blue brand) from success (green feedback)
- **Semantic clarity:** Primary = brand/identity, Success = outcome/feedback
- **Component usage patterns:**
    - Primary action buttons → use `primary` (blue)
    - Success alerts/badges → use `success` (green)
    - High TMDB scores → use `success` (green feedback)

**Trade-offs:**

- ✅ Eliminates redundancy
- ✅ Provides semantic clarity
- ✅ Aligns with industry standards
- ⚠️ Deviates from source design system labeling (they call green "primary button")
- ⚠️ Requires updating all 3 adapters

**What this means for primary action buttons:**
Primary action buttons should use `primary` token (blue brand color), not green. This aligns with
8 of 9 major design systems where primary buttons represent brand identity.

#### Decision 2: Secondary Semantic Meaning

**Define "secondary" as neutral supporting actions:**

**Industry consensus:** Secondary buttons are neutral (gray) with outline styling, representing lower-priority
supporting actions (Cancel, Back, Skip).

**Recommended mapping:**

```typescript
// All adapters should map to neutral gray tokens:
const secondary = palette.bg_button_secondary;  // Keep existing (verify tokens are correct)
const secondaryForeground = palette.fg_default; // Use default foreground
```

**Actions Required:**

1. **IBM Carbon light mode:** Verify `#393939` (dark gray) is correct official token for `bg_button_secondary`
   - If correct: Accept as Carbon's design choice
   - If incorrect: Find correct Carbon neutral button token
2. **All themes:** Ensure visual distinction from muted in both light and dark modes

#### Decision 3: Muted Semantic Meaning

**Define "muted" as deemphasized content and disabled states:**

**Industry consensus:** Muted is for:

- Deemphasized/secondary text (lower importance)
- Disabled states (inactive components)
- Tertiary text hierarchy

**Recommended approach:**

- `muted` (background): Subtle background for disabled or deemphasized surfaces
- `muted-foreground` (text): Secondary/tertiary text with reduced contrast

**Distinction from secondary:**

- **Secondary:** Interactive supporting actions (buttons, links)
- **Muted:** Non-interactive deemphasized content

#### Decision 4: Warning Token Handling

**GitHub Primer:**

- **Action:** Add official "attention" token to palette from Primer's attention scale
- **Hex values:** Light mode `#9a6700` (foreground), `#fff8c5` (muted background)
- **Rationale:** Use official design system tokens when available

**GitLab Pajamas:**

- **Action:** Verify `#995715` is official warning color from Pajamas documentation
- **If official:** Accept aesthetic as GitLab's design choice
- **If incorrect:** Find correct Pajamas warning token

#### Decision 5: Info Token Handling

**GitHub Primer:**

- **Current:** Reusing accent (blue) for info
- **Action:** No change needed - this is CORRECT per Primer's official documentation
- **Rationale:** Primer explicitly states accent is for "Links, selected, active, focus states, and neutral information"
- **Documentation:** Add inline comment in adapter explaining this is intentional per Primer docs

### Verification Requirements

**Before finalizing:**

1. **IBM Carbon `bg_button_secondary`:**
   - Check official Carbon documentation for light mode secondary button token
   - Verify `#393939` hex value matches official specification

2. **GitLab Pajamas `fg_warning`:**
   - Check official Pajamas documentation for warning color
   - Verify `#995715` hex value matches official specification
   - Evaluate if aesthetic concern reflects misuse or is valid GitLab design

3. **GitLab Pajamas dark mode:**
   - Verify secondary (`#28272d`) and muted (`#28272d`) tokens
   - Determine if they should be visually distinct

4. **GitHub Primer "attention":**
   - Add complete attention token set to palette
   - Find dark mode values from Primer primitives

### Verification Results

**Research Date:** 2025-11-07
**Method:** External research agent analysis of official design system documentation

#### 1. IBM Carbon Secondary Button - ✅ CONFIRMED CORRECT

**Our Current Value:** `#393939` (labeled as "interactive-02")

**Official Verification:**

- **Token (v10):** `$interactive-02` or `--cds-interactive-02`
- **Token (v11):** `$button-secondary` (component-level token)
- **Hex Value (Light/G10):** `#393939`
- **Source:** <https://carbondesignsystem.com/elements/themes/overview/>

**Findings:**

- ✅ `#393939` is the **official** IBM Carbon color for secondary buttons in light mode
- This is `@gray-80` in Carbon's color scale
- The dark gray is **intentional** design choice to provide clear visual contrast against light backgrounds
- In v11, the token was renamed from `$interactive-02` to `$button-secondary`, but the hex value remains the same

**Conclusion:** The aesthetic concern about `#393939` being "too dark" for light mode is **valid from a visual perspective**,
but this is **Carbon's official design choice**. We should accept it as the correct Carbon aesthetic.

**Action:** Document this in palette with inline comment explaining it's the official token, not an error.

---

#### 2. GitLab Pajamas Warning Color - ✅ CONFIRMED CORRECT

**Our Current Value:** `#995715` (labeled as "orange-600")

**Official Verification:**

- **Token:** `orange-600`
- **Hex Value (Light):** `#995715`
- **Source:** <https://design.gitlab.com/product-foundations/color/>

**Findings:**

- ✅ `#995715` is the **official** GitLab Pajamas orange-600 color
- Used to communicate warning, pending, missing, or impeded progress
- CSS variable: `var(--gl-text-color-warning, var(--gl-color-orange-600, #995715))`
- Orange indicates attention is required (part of functional color palette)

**Conclusion:** The aesthetic concern about `#995715` feeling "out of step" is **valid from a visual perspective**,
but this is **GitLab's official design choice**. We should accept it as the correct Pajamas aesthetic.

**Action:** Document this in palette with inline comment explaining it's the official token.

---

#### 3. GitHub Primer Attention Tokens - ℹ️ FOUND (NEW DATA)

**Current Implementation:** Derived custom values in adapter (`#d4a72c` light, `#bb8009` dark)

**Official Tokens Found:**

**Light Mode:**

- `attention.fg` (foreground/text): `#9a6700`
- `attention.emphasis` (background emphasis): `#9a6700`
- `attention.muted` (background muted): `rgba(212,167,44,0.4)` → `#d4a72c` @ 40% opacity
- `attention.subtle` (background subtle): `#fff8c5`
- `borderColor.attention.emphasis`: `#9a6700`

**Dark Mode:**

- `attention.fg`: `#d29922` (partially verified)
- `attention.emphasis`: `#9e6a03` (partially verified)
- `attention.muted`: `rgba(187,128,9,0.4)` (partially verified)
- `attention.subtle`: `rgba(187,128,9,0.15)` (partially verified)

**Source:** <https://primer.style/primitives/colors/>, @primer/primitives npm package

**Findings:**

- ✅ Primer has official "attention" role tokens for warnings/caution states
- ⚠️ Our derived light mode value (`#d4a72c`) happens to match the official muted background at full opacity
- ⚠️ Our derived dark mode value (`#bb8009`) is close but not exact to official values
- Light mode values are fully documented and confirmed
- Dark mode values found but need npm package verification

**Conclusion:** We should use **official Primer attention tokens** instead of derived values.

**Actions Required:**

1. Add all attention tokens to GitHub Primer palette (both light and dark)
2. Update adapter to use official tokens instead of derived values
3. Consider installing `@primer/primitives` npm package to verify exact dark mode values

---

#### 4. GitLab Pajamas Dark Mode Secondary vs Muted - ⚠️ INCONCLUSIVE

**Current Implementation:** Both use `#28272d` (neutral-900)

**Official Verification:**

- **Token (Muted):** `neutral-900` = `#28272d` ✅ Confirmed
- **Token (Secondary Button):** Semantic token (not explicit hex value)
- **Source:** <https://design.gitlab.com/product-foundations/color/>

**Findings:**

- ✅ `neutral-900` = `#28272d` is correct for the neutral color scale
- ⚠️ GitLab uses **semantic design tokens** that automatically adapt between modes
- Secondary buttons described as having "a border that matches the variant and a background that is close to,
  or the same as the page background color"
- Both may intentionally use the same value - secondary buttons designed to blend with page background
- Muted backgrounds serve as subtle, deemphasized backgrounds for content

**Conclusion:** The fact that both use `#28272d` **may be intentional** in GitLab's design system. Secondary buttons
are designed to visually recede (blend with background).

**Recommendations:**

1. **If UX testing shows buttons are indistinguishable:** Consider using `neutral-950` (`#18171d`) for one of them
2. **Add border to secondary buttons:** GitLab docs mention borders for secondary buttons - this may be the
   intended distinction mechanism
3. **Accept as intentional:** If buttons have borders, the background color matching muted may be correct

**Action:** Document both tokens with inline comments explaining they intentionally share the same value in dark mode
per GitLab's semantic token philosophy. If UX issues arise, revisit with border-based distinction.

---

### Verification Summary Table

| Design System | Token | Our Value | Official Value | Status |
|---------------|-------|------------|----------------|---------|
| **Carbon (Light)** | `interactive-02` / `button-secondary` | `#393939` | `#393939` | ✅ Correct |
| **GitLab Pajamas** | `orange-600` (warning) | `#995715` | `#995715` | ✅ Correct |
| **Primer (Light)** | `attention.fg` | (derived) | `#9a6700` | ℹ️ Add to palette |
| **Primer (Light)** | `attention.subtle` | (derived) | `#fff8c5` | ℹ️ Add to palette |
| **Primer (Dark)** | `attention.fg` | (derived) | `#d29922` | ⚠️ Add to palette |
| **GitLab (Dark)** | `neutral-900` | `#28272d` | `#28272d` | ✅ Correct |

**Key Takeaways:**

1. ✅ IBM Carbon `#393939` is correct - dark gray is intentional design choice
2. ✅ GitLab Pajamas `#995715` is correct - orange-brown is intentional design choice
3. ℹ️ GitHub Primer attention tokens exist - we should use official values instead of derived
4. ⚠️ GitLab secondary/muted matching in dark mode may be intentional - investigate if UX issues arise

---

**Note:** This research led to ADR-010 (Separate Primary from Success Semantic Colors) and task list 3.5.5
(Semantic Colors Standardization Audit). See those documents for decisions and implementation tracking.
