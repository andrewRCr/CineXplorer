# Notes: Theme Definition Semantic Corrections

**Created:** 2025-11-03
**Branch:** `technical/service-layer-modernization`
**Related Task List:** `tasks-theme-definition-semantic-corrections.md`

## Purpose

Documentation and research notes for fixing critical semantic token misuse across GitHub Primer, IBM Carbon, and GitLab
Pajamas theme implementations. This work was discovered during Task 4.4.4 (AdvancedMovieFilters testing) and blocks
remaining component migrations.

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

## Testing Requirements

### Theme Combinations to Test

With 3 design systems × 2 modes = **6 combinations:**

1. GitHub Primer - Light
2. GitHub Primer - Dark
3. IBM Carbon - Light
4. IBM Carbon - Dark
5. GitLab Pajamas - Light
6. GitLab Pajamas - Dark

---

### Visual Verification Checklist

For each theme combination, verify:

- [ ] **Card Differentiation:** Cards visually distinct from page background
- [ ] **Border Visibility:** Borders visible on elevated surfaces (not invisible)
- [ ] **Elevation Clarity:** Modals/popovers clearly elevated above page content
- [ ] **No Color Tints:** Elevated surfaces neutral (no inappropriate accent colors)
- [ ] **Consistent Hierarchy:** Visual layering matches semantic token intent

---

### Component Testing Scope

**Already Migrated (19 components):**

Primary test targets from Phase 4.4:

1. `PaginationCtrl` (Task 4.4.1)
2. `TypographyTest` (Task 4.4.2)
3. `AdvancedMovieFilters` system (Task 4.4.3) - 5 components
4. `LetterboxdStyleFilters` system (Task 4.4.4) - 5 components

**Test Focus:**

- Do filter panels display correctly with new `surface-elevated` mappings?
- Are borders visible on card surfaces?
- Does card background differentiate from page background?

---

## Success Criteria

### Phase 1 (Token Structure & Documentation)

- [x] Token semantic mapping guide created (this document)
- [x] Hex value reference table created (this document)
- [ ] All files requiring updates identified (documented above)
- [ ] Type definitions verified for new token additions

### Phase 2-4 (Implementation)

- [ ] All 3 palette files updated with correct hex values
- [ ] All 3 theme definition files updated with correct semantic mappings
- [ ] New tokens added (`border-strong`, `layer-03`, optional shadows)
- [ ] 6 theme combinations tested visually
- [ ] 19 migrated components verified in each theme

### Phase 5-6 (Quality & Documentation)

- [ ] Type checking passes (frontend)
- [ ] Linting passes (frontend)
- [ ] Strategy documents updated with semantic token guidance
- [ ] Component review completed (verify correct token usage)

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
- **Expected issue:** -12%/-24% adjustments likely insufficient (similar to Primer/Pajamas)
- **Note:** Carbon Light officially alternates (white/gray/white/gray) - we derive to avoid this

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

### Next Steps: Light Mode Remediation Plan

**Strategy:** Use Carbon as inspiration for light mode layer progression

**Option A: Aggressive Darkening (Recommended)**

- GitHub Primer Light: Base `bg_muted` (#f6f8fa), darken by -20%, -40%, -60%
- GitLab Pajamas Light: Base `bg_section` (#ececef), darken by -20%, -40%, -60%
- **Pro:** Creates clearly visible progression
- **Con:** May deviate significantly from design system aesthetic

**Option B: Hybrid (Lighten then darken)**

- Layer-01: Use official token (slight lightening from background)
- Layer-02: Darken from layer-01 by -15%
- Layer-03: Darken further by -30% total
- **Pro:** Respects official layer-01, progresses from there
- **Con:** More complex logic

**Option C: Carbon-Inspired Absolute Values**

- Research Carbon White theme exact progressions
- Apply similar step sizes to Primer/Pajamas light modes
- **Pro:** Proven approach from design system
- **Con:** Requires additional research

**Decision:** Defer to next session after user feedback

---

### Deferred Testing & Issues (Not Yet Addressed)

#### 1. Shadow System Validation

**Status:** NOT TESTED

**What needs testing:**

- Do shadows render correctly on MovieCard?
- Is `boxShadow="shadow-sm"` resolved as token lookup or string literal?
- Visual progression: sm → md → lg clear?
- IBM Carbon minimal shadows vs Primer/Pajamas heavy shadows

**Test location:** ThemeDebug "Shadow System" section (implemented)

**Priority:** MEDIUM (shadows work or they don't, but won't break components)

---

#### 2. Border Hierarchy Validation

**Status:** NOT TESTED

**What needs testing:**

- Are subtle borders (`border-subtle-00`, `border-subtle-02`) visible in dark mode?
- Are strong borders (`border-strong-01/02/03`) sufficiently distinct?
- Does border hierarchy maintain visibility across elevation levels?

**Test location:** ThemeDebug "Border Hierarchy" section (implemented)

**Priority:** HIGH (invisible borders = accessibility fail)

---

#### 3. Interaction State Validation

**Status:** PARTIALLY TESTED (user noted NavBarUserMenu dark mode hover issue)

**What needs testing:**

- `layer-hover-01` / `layer-hover-02` visible in dark mode? ✅ ISSUE CONFIRMED
- `layer-selected-01` / `layer-selected-02` sufficiently distinct?
- `layer-active-01` / `layer-active-02` clear indication?

**Test location:** ThemeDebug "Interaction States" section (implemented)

**Known issue:**

- **NavBarUserMenu dark mode hover:** Appears invisible or too subtle
- **Likely cause:** `layer-hover-02` on dark mode not sufficiently distinct from `layer-02`

**Priority:** HIGH (interaction feedback is UX-critical)

---

#### 4. Component-Specific Issues (User-Reported)

##### Sidebar Visual Hierarchy

**Issues:**

1. **Header background:** Sidebar header (CineXplorer logo area) should match navbar bg
   - Currently: Different from navbar
   - Should be: Same `layer-01` background

2. **LOG button styling:** Should use primary color
   - Currently: Not using primary semantic color
   - Should be: `bg="primary"` + `color="primary-foreground"`

3. **Link container elevation:** Container for profile/watchlist (etc) links needs visual distinction
   - Currently: Has border but identical bg to sidebar
   - Should be: Elevated background (layer-02?) or other differentiation

**Priority:** MEDIUM (visual polish, not functional failure)

---

##### Featured Page Button Visibility

**Issues:**

1. **Popular button:** Shows correctly (?) (primary color)
2. **Other two buttons:** Identical color to background (invisible)
   - Currently: Using `background` or similar
   - Should be (?): `border="1px solid"` + `borderColor="border"` for outline style (?)

**Question:** Should these be outline style or filled style buttons? Should they be primary or secondary?

**Priority:** MEDIUM (functional but poor UX)

---

##### AdvancedMovieFilters Elevation

**Issues:**

1. **No visual elevation:** Filter panel uses same bg as surrounding page
   - Currently: `background` or `layer-01`
   - Should be: Elevated surface (layer-02?) or shadow

**Priority:** LOW (functional, but lacks visual hierarchy)

---

##### Form Input Placeholder Precision

**Issue:**

- Max rating placeholder: `10.0` should be `10`
- Location: AdvancedMovieFilters max rating input

**Priority:** TRIVIAL (cosmetic polish)

---

##### Login Session Bug

**Issue:**

- User logged in successfully
- While navigating site for testing, session appeared to be lost
- User did not explicitly log out

**Status:** DOCUMENTED, DEFERRED

**Priority:** UNKNOWN (could be critical if session management broken, or trivial if just testing artifact)

**Action:** Investigate separately after theme work complete

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

### Documentation Completeness Checklist

**This session covered:**

- ✅ Layer system visual test results (6 theme combinations)
- ✅ Technical analysis of why light modes fail
- ✅ Iteration history (what we've tried)
- ✅ Current implementation status
- ✅ Next steps (remediation options)
- ✅ Deferred testing (shadows, borders, interaction states)
- ✅ Component-specific issues (sidebar, buttons, filters, placeholders, login bug)
- ✅ Approach validation (architecture sound, just needs tuning)

**Nothing lost** - all context preserved for next session

---

### Success Criteria for Next Session

**Must achieve:**

1. ✅ GitHub Primer Light: 4 visibly distinct layers
2. ✅ GitLab Pajamas Light: 4 visibly distinct layers
3. ✅ IBM Carbon Light: 4 visibly distinct layers (verify current implementation)

**Then test:**
4. ⏭️ Shadow system visual validation
5. ⏭️ Border hierarchy visual validation
6. ⏭️ Interaction states (especially dark mode hover)

**Then address:**
7. ⏭️ Component-specific polish (sidebar, buttons, filters)
8. ⏭️ Login session bug investigation

**Final gate:**

- All quality checks pass
- Visual regression testing complete
- ADR-006 created documenting approach
- Ready to merge Phase 3 into `technical/service-layer-modernization`

---

**Document Status:** Phase 3 Review Analysis Complete
**Last Updated:** 2025-11-06 (Session: Layer System Testing)
**Next Session:** Light mode layer contrast remediation
