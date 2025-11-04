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

**Document Status:** Initial research complete, implementation pending
**Last Updated:** 2025-11-03
