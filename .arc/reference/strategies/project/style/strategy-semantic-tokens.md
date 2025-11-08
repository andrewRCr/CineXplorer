# Semantic Token Strategy and Migration Guide

**Version:** 1.2 | **Updated:** 2025-11-07 | **Status:** Active

## Purpose

Comprehensive guide for CineXplorer's semantic token system, covering the 33-token structure
(20 base tokens + 13 extensions), legacy token migration, and component migration patterns.

**Use this when:**

- Migrating components from old custom tokens to semantic tokens
- Deciding which semantic token to use for a UI element
- Understanding the token extension rationale (13 new tokens)
- Converting hardcoded colors to semantic tokens

**For theme system implementation architecture** (provider pattern, system creation, light/dark mode mechanics),
see [ADR-004: Provider-Based Multi-Theme Switching](../adr/adr-004-provider-based-multi-theme-switching.md).

## Table of Contents

1. [Token Structure Overview](#token-structure-overview)
2. [Legacy Token Migration](#legacy-token-migration)
3. [Hardcoded Color Migration](#hardcoded-color-migration)
4. [Code Examples](#code-examples)
5. [Token Selection Decision Tree](#token-selection-decision-tree)
6. [Token Naming Conventions](#token-naming-conventions)
7. [Accessibility Standards](#accessibility-standards)
8. [Interactive State Patterns](#interactive-state-patterns)
9. [Semantic Naming Philosophy](#semantic-naming-philosophy)
10. [Developer Quick Reference](#developer-quick-reference)

---

## Token Structure Overview

### Base System: 20 Semantic Tokens

CineXplorer's theme system uses semantic token naming inspired by shadcn/ui, implemented for Chakra UI v3.

| Token | Purpose | Use Cases |
|-------|---------|-----------|
| **Base Colors** | | |
| `background` | Default page background | Body, main containers, page fills |
| `foreground` | Default text on background | Body text, main headings |
| **Card Colors** (Elevated Surfaces) | | |
| `card` | Card container backgrounds | Movie cards, content panels, elevated surfaces |
| `card-foreground` | Text on card backgrounds | Card text, headings within cards |
| **Popover Colors** (Overlays) | | |
| `popover` | Dropdown/tooltip backgrounds | Menus, tooltips, dropdowns, modals |
| `popover-foreground` | Text on popover backgrounds | Menu items, tooltip text |
| **Primary Colors** (Main Actions) | | |
| `primary` | Primary action elements | Main CTAs, submit buttons, key actions |
| `primary-foreground` | Text on primary backgrounds | Button text, icon colors |
| **Secondary Colors** (Supporting Actions) | | |
| `secondary` | Secondary action elements | Secondary buttons, alternate actions |
| `secondary-foreground` | Text on secondary backgrounds | Secondary button text |
| **Muted Colors** (Deemphasized) | | |
| `muted` | Muted/disabled backgrounds | Disabled buttons, subtle surfaces |
| `muted-foreground` | Secondary text, labels | Help text, labels, captions, timestamps |
| **Tertiary Colors** (Interactive Text & Accents) | | |
| `tertiary` | Interactive text, links, highlights | Hyperlinks, focus states, active tabs, highlights |
| `tertiary-foreground` | Text on tertiary backgrounds | Tertiary badge text (rarely used) |
| `accent` | @deprecated Use `tertiary` | Legacy alias for tertiary (migration in progress) |
| `accent-foreground` | @deprecated Use `tertiary-foreground` | Legacy alias (migration in progress) |
| **Brand Colors** (Optional - Identity) | | |
| `brand` | Logo/brand identity color | Logo sections, special brand moments (GitLab purple, IBM blue) |
| `brandSecondary` | Secondary brand color | Additional brand accents (GitLab orange) |
| **Destructive Colors** (Danger) | | |
| `destructive` | Danger/error/delete actions | Delete buttons, error states, destructive actions |
| `on-destructive` | Text on destructive backgrounds | Destructive button text (replaces destructive-foreground) |
| `destructive-foreground` | @deprecated Use `on-destructive` | Legacy alias (migration in progress) |
| **UI Elements** | | |
| `border` | Standard borders | Dividers, card outlines, separators |
| `input` | Input field borders | Text inputs, select boxes, form fields |
| `ring` | Focus ring indicator | Keyboard navigation, focus states |

**Total:** 20 semantic concepts (11 pairs + 3 singles = 22 properties)

### Extended System: +13 Movie App Tokens

CineXplorer extends the base semantic tokens with 13 additional tokens for movie-specific UI patterns
and complete alert system coverage.

| Token | Purpose | Use Cases | Rationale |
|-------|---------|-----------|-----------|
| **Status Pairs (6 canonical + 4 deprecated = 10 tokens during migration)** | | | |
| `success` | Success background | Success alerts, positive feedback, high ratings | Industry standard (all 4 design systems researched) |
| `on-success` | Text on success | Success message text | ADR-011: Standardized on-* naming |
| `success-foreground` | @deprecated Use `on-success` | Legacy alias | Migration in progress (ADR-011) |
| `warning` | Warning background | Caution states, validation warnings | Standard alert system component |
| `on-warning` | Text on warning | Warning message text | ADR-011: Standardized on-* naming |
| `warning-foreground` | @deprecated Use `on-warning` | Legacy alias | Migration in progress (ADR-011) |
| `info` | Info background | Informational messages, help text | Completes alert system (success/warning/error/info) |
| `on-info` | Text on info | Info message text | ADR-011: Standardized on-* naming |
| `info-foreground` | @deprecated Use `on-info` | Legacy alias | Migration in progress (ADR-011) |
| **Movie-Specific (2 tokens)** | | | |
| `rating` | Rating value display | TMDB scores, user ratings, score badges | Core movie app feature, IMDb gold (#F5C518) standard |
| `rating-foreground` | Text on rating | Score text | Completes rating semantic pair |
| **Surface Elevation (1 token)** | | | |
| `surface-elevated` | 3rd elevation level | Hover states on cards, nested surfaces, modals | Netflix uses 3-4 levels, complex UIs need hierarchy |
| **Badge System (2 tokens)** | | | |
| `badge` | Badge background | Genre tags, content ratings, status badges | Pervasive in movie discovery apps |
| `badge-foreground` | Text on badge | Badge text | Completes badge semantic pair |
| **Drag-and-Drop (2 tokens)** | | | |
| `drag-active` | Item being dragged | Watchlist reordering, favorites reordering | Core META-PRD feature for interactive lists |
| `drop-zone` | Valid drop target | Drop zone indicators | Completes drag-and-drop interaction pattern |

**Extended Total:** 33 canonical tokens + 8 deprecated aliases during migration (ADR-011)

**Token Extension Summary:**

All 13 extended tokens are backed by cross-system research (Material Design 3, IBM Carbon, GitHub Primer, Ant Design)
or address movie app-specific requirements. Total of 33 canonical tokens remains conservative compared to industry
averages (40-140+). During ADR-011 migration, 8 deprecated `-foreground` aliases maintained for backward compatibility.

---

## Semantic Token Definitions (Per ADR-010 + ADR-011)

The table below defines the precise semantic meaning, visual characteristics, and usage patterns for each color token
in CineXplorer's unified vocabulary. These definitions govern how official design system tokens are mapped to our
semantic vocabulary.

**Context:**

- **ADR-010** established the primary/secondary/tertiary hierarchy (Material Design 3-aligned) with optional
  brand separation and proper token type distinction (background vs foreground tokens).
- **ADR-011** standardized on `on-*` prefix for ALL foreground tokens (semantic + status), deprecating `-foreground` suffix.

These definitions ensure cross-theme consistency while respecting official design system token values.

| Token | Semantic Meaning | Visual Characteristics | Usage Examples | Token Type | Mapping Notes |
|-------|-----------------|----------------------|----------------|------------|---------------|
| **Action Hierarchy** | | | | | |
| `primary` | Primary action buttons | Filled buttons, green or blue | "Submit", "Save", "Continue" | **Background** | GitHub: green (bg_success), IBM: blue (fg_accent), GitLab: blue |
| `secondary` | Subtle action backgrounds | Low-emphasis surfaces | Subtle buttons, muted panels | Background | Maps to `bg_button_secondary` or muted surface tokens |
| `tertiary` | Interactive text, links, accents | Blue or brand color, foreground | Hyperlinks, focus states, highlights | **Foreground** | Replaces deprecated `accent`. GitHub: blue (fg_accent), GitLab: purple |
| `muted` | Deemphasized, non-interactive | Subtle gray backgrounds | Disabled states, subtle surfaces | Background | Distinct from secondary (interactive vs non-interactive) |
| **Button Pattern Helpers (Per ADR-012)** | | | | | |
| `button-outline` | Outline button border/text | Primary color | Outline button strokes | Foreground/Border | Maps to `primary` for cross-theme consistency |
| `button-subtle` | Subtle button background | Secondary color | Subtle button fills | Background | Maps to `secondary` for low-emphasis actions |
| **Brand Identity (Optional)** | | | | | |
| `brand` | Logo/brand identity | Purple, blue, or brand color | Logo sections, brand moments | Either | Optional. GitLab: purple, IBM: blue, GitHub: undefined |
| `brandSecondary` | Secondary brand color | Orange or secondary brand | Additional brand accents | Either | Optional. GitLab: orange. Not for general component use. |
| **Status & Feedback** | | | | | |
| `success` | Positive feedback, outcomes | Green, filled backgrounds | Success alerts, "✓ Saved", high ratings | Background | Maps to `bg_success` (green). Distinct from primary per ADR-010. |
| `warning` | Caution, validation warnings | Yellow/amber, filled | Warning alerts, validation messages | Background | Official token when available (Primer: attention, Carbon/Pajamas: warning). |
| `info` | Informational, help content | Blue, filled backgrounds | Info alerts, help text, neutral info | Background | Some systems reuse tertiary (Primer), others have dedicated token. |
| `destructive` | Danger, errors, delete actions | Red, filled backgrounds | Delete buttons, error alerts | Background | Maps to `bg_danger` or equivalent error/danger token. |
| **UI Elements** | | | | | |
| `border` | Standard dividers, separators | Subtle gray | General borders, card outlines | Border | Per border hierarchy (border-subtle-00, border-strong-01, etc). |
| `input` | Form field borders | Accessible contrast border | Text inputs, select boxes | Border | Typically maps to `border-subtle-00` or dedicated input border. |
| `ring` | Focus indicators (accessibility) | High-contrast accent | Keyboard focus rings (2px outline + offset) | Border | Must meet WCAG 2.4.13 (≥3:1 contrast change). |

**Key Distinctions (Per ADR-010 + ADR-012):**

- **Primary vs Tertiary:** Primary is for **button fills** (background token),
  Tertiary is for **links/text** (foreground token)
- **Primary vs Brand:** Primary is for **UI actions**, Brand is for **identity** (may be same color, e.g., IBM)
- **Primary vs Success:** Primary is **action color** (varies by system), Success is **feedback state** (always green)
- **Secondary vs Muted:** Secondary is **interactive** (subtle buttons), Muted is **non-interactive** (disabled/deemphasized)
- **Tertiary vs Accent:** Tertiary is the new name (Material-aligned), Accent is deprecated (alias during migration)
- **Button Patterns (ADR-012):** Solid/outline/subtle/ghost are **visual patterns**, separate from color semantics.
  Use `button-outline` (maps to primary) and `button-subtle` (maps to secondary) for cross-theme consistency.

**Token Type Architecture:**

- **Background tokens** (for large color areas): primary, secondary, muted, success, warning, info, destructive
- **Foreground tokens** (for text/icons): tertiary, all `-foreground` pairs
- **Either type** (context-dependent): brand, brandSecondary

**Mapping Philosophy:**

1. **Use official tokens when available** - Respect design system values for colors
2. **Match token types to usage** - Background tokens for fills, foreground tokens for text
3. **Standardize semantic meanings** - Primary = action, Tertiary = interactive text, Brand = identity
4. **Handle color architecture diversity** - Support 1-tier (IBM), 2-tier (GitHub), 3-tier (GitLab) systems
5. **Document deviations** - Inline comments explain when/why we deviate from source labeling

**Design System Mappings:**

| System | Brand | Primary (buttons) | Tertiary (links) | Architecture |
|--------|-------|------------------|------------------|--------------|
| **GitHub Primer** | undefined | green (bg_success) | blue (fg_accent) | 2-tier: Actions ≠ Links |
| **IBM Carbon** | blue | blue (fg_accent) | blue (fg_accent) | 1-tier: Unified blue |
| **GitLab Pajamas** | purple + orange | blue | purple | 3-tier: Brand ≠ Actions ≠ Links |
| **Material Design 3** | purple | purple (primary) | teal (tertiary) | 3-tier: Full separation |

**See Also:**

- ADR-010: Establish Core Semantic Color Token Architecture (full rationale and decisions)
- ADR-011: Standardize on "on-color" Foreground Naming Convention (on-* prefix standardization)
- ADR-012: Separate Button Pattern Semantics from Color Semantics (button-outline, button-subtle helpers)
- ADR-009: Use Material Design Opacity Overlays for Interaction States (hover/active state approach)
- strategy-border-system.md: Border patterns and outline styling details
- ADR-003: Extend Semantic Token System (token count extension)
- ADR-005: Unified Theme Adapter Layer (adapter architecture)

---

## Legacy Token Migration

CineXplorer's old custom token system (28 tokens) maps to the new 33-token semantic system.
Most mappings are direct or consolidation opportunities.

### Direct 1:1 Mappings (No Changes Needed)

| Old Token | New Token | Notes |
|-----------|-----------|-------|
| `background.main` | `background` | Exact match |
| `text.main` | `foreground` | Exact match |
| `border.input` | `input` | Exact match |
| `accent.primary` | `accent` | Exact match |

### Multiple Old → Single New (Deduplication)

| Old Tokens | New Token | Migration Action |
|------------|-----------|------------------|
| `background.navBar`, `background.footer`, `background.sidebar` | `card` | Consolidate all elevated surfaces |
| `background.subItem`, `background.hover`, `background.skeleton` | `muted` | Consolidate subtle backgrounds |
| `text.muted`, `text.secondary` | `muted-foreground` | Consolidate secondary text |
| `border.subtle`, `border.separator`, `border.sidebar` | `border` | Consolidate all borders |
| `accent.secondary`, `accent.tertiary`, `accent.highlight`, `accent.link` | `accent` | Consolidate accent variants |

### Old → New (Extended Tokens)

| Old Token | New Token | Priority | Notes |
|-----------|-----------|----------|-------|
| `text.error` | `destructive-foreground` | CRITICAL | Already exists in base 20 |
| `text.success`, `text.successDark` | `success-foreground` | CRITICAL | New extended token |
| `text.info` | `info-foreground` | CRITICAL | New extended token |
| `border.error` | `destructive` | CRITICAL | Use as border color |
| `border.success` | `success` | CRITICAL | Use as border color, new extended token |
| `accent.tagTeal`, `accent.tagPurple` | `badge`, `badge-foreground` | HIGH | New extended tokens for tag system |

### New Requirements (No Old Equivalent)

| New Token | Use Case | Priority | Notes |
|-----------|----------|----------|-------|
| `rating`, `rating-foreground` | TMDB scores, user ratings | CRITICAL | Core movie app feature |
| `warning`, `warning-foreground` | Validation warnings, cautions | CRITICAL | Completes alert system |
| `surface-elevated` | Hover states, nested surfaces | HIGH | 3rd elevation level |
| `drag-active`, `drop-zone` | Watchlist reordering | MEDIUM | Planned feature |

---

## Hardcoded Color Migration

From codebase audit (Phase 3.2): 25+ hardcoded color instances across 7 components requiring migration.

### Component Priority Order

1. **ErrorBoundary** (15+ instances) - Most violations
2. **MovieUserScore** (4 instances) - Rating colors
3. **Login** (4 instances) - Forms and alerts
4. **Featured** (2 instances) - Hero section
5. **MovieCard, PaginationCtrl, NavBar** (1-2 instances each)

### ErrorBoundary Hardcoded Colors

**File:** `frontend/src/components/ErrorBoundary.tsx`

| Current Hardcoded | Target Token | Usage |
|-------------------|--------------|-------|
| `red.600`, `red.700`, `red.800` | `destructive-foreground` | Error heading, description, code text |
| `red.50` | `destructive` + opacity | Error code block background |
| `red.200` | `destructive` | Code block border |
| `gray.50`, `gray.100` | `muted` | Stack trace background |
| `gray.800` | `foreground` | Stack trace text |
| `gray.200`, `gray.300` | `border` | Stack trace border |
| `gray.600` | `muted-foreground` | Help text |
| `blue.50` | `info` | Component stack background |
| `blue.800`, `blue.700` | `info-foreground` | Component stack text |
| `blue.200` | `info` | Component stack border |

### MovieUserScore Hardcoded Colors

**File:** `frontend/src/components/movie/MovieUserScore.tsx`

| Current Hardcoded | Target Token | Usage |
|-------------------|--------------|-------|
| `text.successDark` | `rating` | Score value display |
| `blue.700`, `yellow.700` | `rating` | Alternative score colors (consolidate) |
| `green.600` | `success` | High rating background |
| `orange.600` | `warning` | Medium rating background |
| `red.600` | `destructive` | Low rating background |

### Login/Auth Hardcoded Colors

**File:** `frontend/src/pages/user/Login.tsx`

| Current Hardcoded | Target Token | Usage |
|-------------------|--------------|-------|
| `#4299e1` (inline) | `accent` | Link colors |
| `red.600`, `red.700` | `destructive-foreground` | Error text |
| `gray.600` | `muted-foreground` | Help text |
| `fg.muted` (Chakra) | `muted-foreground` | Labels |

### Featured Page Hardcoded Colors

**File:** `frontend/src/pages/Featured.tsx`

| Current Hardcoded | Target Token | Usage |
|-------------------|--------------|-------|
| `fg.muted` (Chakra) | `muted-foreground` | Subtitle text |
| `colorScheme="blue"` | `accent` | CTA button |

### MovieCard, Pagination, NavBar

| Component | Current | Target | Usage |
|-----------|---------|--------|-------|
| MovieCard | `colorPalette="blue"` | `accent` | Interactive button states |
| PaginationCtrl | `colorScheme="blue"` | `accent` | Active page indicator |
| NavBar | `colorScheme="accent"` | ✅ Already correct | Active tab |

---

## Code Examples

### ErrorBoundary Migration

**Before:**

```tsx
<Box bg="red.50" borderColor="red.200" borderWidth="1px">
  <Text color="red.800" fontWeight="bold">
    Error Code: {errorCode}
  </Text>
</Box>

<Box bg="blue.50" borderColor="blue.200" borderWidth="1px">
  <Text color="blue.800">Component Stack:</Text>
  <Text color="gray.600" fontSize="sm">
    {componentStack}
  </Text>
</Box>
```

**After:**

```tsx
<Box bg="destructive/10" borderColor="destructive" borderWidth="1px">
  <Text color="destructive-foreground" fontWeight="bold">
    Error Code: {errorCode}
  </Text>
</Box>

<Box bg="info/10" borderColor="info" borderWidth="1px">
  <Text color="info-foreground">Component Stack:</Text>
  <Text color="muted-foreground" fontSize="sm">
    {componentStack}
  </Text>
</Box>
```

### MovieUserScore Migration

**Before:**

```tsx
const getScoreColor = (score: number) => {
  if (score >= 8) return "green.600";
  if (score >= 6) return "blue.700";
  return "yellow.700";
};

<Badge bg={getScoreColor(score)} color="white">
  {score.toFixed(1)}
</Badge>
```

**After:**

```tsx
const getScoreBg = (score: number) => {
  if (score >= 8) return "success";
  if (score >= 6) return "info";
  return "warning";
};

<Badge bg="rating" color="rating-foreground">
  {score.toFixed(1)}
</Badge>
<Badge bg={getScoreBg(score)} color={`${getScoreBg(score)}-foreground`}>
  Context
</Badge>
```

### Login/Auth Migration

**Before:**

```tsx
<Link href="/register" style={{ color: "#4299e1" }}>
  Create account
</Link>

<Alert status="error" bg="red.50" borderColor="red.200">
  <Text color="red.700">{error}</Text>
</Alert>

<Text color="gray.600" fontSize="sm">
  Forgot password?
</Text>
```

**After:**

```tsx
<Link href="/register" color="accent">
  Create account
</Link>

<Alert bg="destructive/10" borderColor="destructive">
  <Text color="destructive-foreground">{error}</Text>
</Alert>

<Text color="muted-foreground" fontSize="sm">
  Forgot password?
</Text>
```

### Featured Page Hero Section

**Before:**

```tsx
<Box bg="gray.900">
  <Heading size="3xl">Discover Movies</Heading>
  <Text color="fg.muted" fontSize="lg">
    Explore thousands of titles
  </Text>
  <Button colorScheme="blue">Get Started</Button>
</Box>
```

**After:**

```tsx
<Box bg="surface-elevated">
  <Heading size="3xl">Discover Movies</Heading>
  <Text color="muted-foreground" fontSize="lg">
    Explore thousands of titles
  </Text>
  <Button bg="accent" color="accent-foreground">Get Started</Button>
</Box>
```

### Genre Tags Migration

**Before:**

```tsx
<Badge colorScheme="teal">Action</Badge>
<Badge colorScheme="purple">Drama</Badge>
```

**After:**

```tsx
<Badge bg="badge" color="badge-foreground">Action</Badge>
<Badge bg="badge" color="badge-foreground">Drama</Badge>
```

---

## Token Selection Decision Tree

Use this decision tree to select the appropriate semantic token for any UI element.

### Is this a status indicator or alert?

**YES →** Status semantic tokens

- ✅ **Success:** Positive outcomes, confirmations, high ratings → `success`, `success-foreground`
- ⚠️ **Warning:** Caution states, validation warnings → `warning`, `warning-foreground`
- ℹ️ **Info:** Informational messages, help text, tips → `info`, `info-foreground`
- ❌ **Error/Destructive:** Errors, delete actions, failures → `destructive`, `destructive-foreground`

**NO →** Continue to next question

### Is this a movie rating or score?

**YES →** Rating semantic tokens

- 🌟 **Rating value:** TMDB score, user rating display → `rating`, `rating-foreground`
- **Rating context:** May also use status tokens (success/warning/destructive) for thresholds

**NO →** Continue to next question

### Is this a neutral badge or tag?

**YES →** Badge semantic tokens

- 🏷️ **Genre tags:** Action, Drama, Comedy → `badge`, `badge-foreground`
- 🏷️ **Content ratings:** PG-13, R, etc. → `badge`, `badge-foreground`
- 🏷️ **Status badges:** New, Featured → `badge`, `badge-foreground`

**NO →** Continue to next question

### Is this a surface or container?

**YES →** Surface semantic tokens

- **Base surface:** Main page background → `background`, `foreground`
- **Elevated surface (1st level):** Movie cards, content panels → `card`, `card-foreground`
- **Elevated surface (2nd level):** Hover states, nested surfaces → `surface-elevated`
- **Overlays:** Dropdowns, tooltips, modals → `popover`, `popover-foreground`

**NO →** Continue to next question

### Is this an interactive element?

**YES →** Interactive semantic tokens

- **Primary action:** Main CTA, submit buttons → `primary`, `primary-foreground`
- **Secondary action:** Cancel, back buttons → `secondary`, `secondary-foreground`
- **Accent/highlight:** Links, focus states, active states → `accent`, `accent-foreground`
- **Muted/disabled:** Disabled buttons, inactive states → `muted`, `muted-foreground`

**NO →** Continue to next question

### Is this a UI element (border, input, focus)?

**YES →** UI element tokens

- **Borders:** Dividers, card outlines, separators → `border`
- **Input fields:** Text inputs, select boxes, textareas → `input` (for border)
- **Focus indicators:** Keyboard navigation, accessibility → `ring`

**NO →** Continue to next question

### Is this drag-and-drop interaction?

**YES →** Drag-and-drop tokens

- **Item being dragged:** Visual feedback during drag → `drag-active`
- **Valid drop zone:** Drop target indicator → `drop-zone`

**NO →** Review base tokens again or consult this guide

---

## Token Naming Conventions

### Pair Convention (Updated per ADR-011)

Most semantic tokens come in pairs: `{name}` (background) and `on-{name}` (text on background).

**Canonical naming (use in new code):**

- `primary` + `on-primary`
- `success` + `on-success`
- `rating` + `rating-foreground` (legacy exception, not yet migrated)

**Deprecated aliases (backward compatibility during migration):**

- `primary-foreground` → use `on-primary` instead
- `success-foreground` → use `on-success` instead

**Exception:** Single tokens without pairs

- `border` - Always used as border color
- `input` - Always used as input border
- `ring` - Always used as focus ring
- `surface-elevated` - Background only (uses `foreground` for text)

### Opacity Modifiers

Chakra UI supports opacity modifiers with `/` syntax:

```tsx
bg="destructive/10"  // 10% opacity destructive background
bg="accent/50"       // 50% opacity accent background
```

**Common patterns:**

- `/10` - Very subtle background tint (alerts, info boxes)
- `/20` - Subtle background (hover states)
- `/50` - Medium transparency
- `/80` - Strong but not fully opaque

### Never Hardcode Colors

**Prohibited:**

```tsx
❌ color="red.600"
❌ bg="#4299e1"
❌ borderColor="blue.200"
❌ style={{ color: "#FF0000" }}
```

**Always use semantic tokens:**

```tsx
✅ color="destructive-foreground"
✅ bg="accent"
✅ borderColor="info"
✅ color="muted-foreground"
```

**Exception:** Only bypass semantic tokens if documenting rationale in code comment explaining why
no semantic token fits the use case.

---

## Accessibility Standards

All semantic tokens must meet WCAG accessibility guidelines. These requirements come from cross-system
research (Material Design 3, IBM Carbon, GitHub Primer, Ant Design) and are universal standards.

### Contrast Requirements

**WCAG AA (Minimum - Required for CineXplorer):**

- **Normal text:** 4.5:1 contrast ratio minimum
    - Body text, labels, descriptions
    - Most common use case

- **Large text & UI components:** 3:1 contrast ratio minimum
    - Text 18pt+ (or 14pt+ bold)
    - Borders, focus indicators, interactive element boundaries
    - Icons and graphical elements

**WCAG AAA (Enhanced - Aspirational):**

- **Normal text:** 7:1 contrast ratio
- **Large text:** 4.5:1 contrast ratio
- Provides better readability, especially for users with low vision

### Testing Contrast

**Before finalizing token colors:**

1. Test each token pair against backgrounds using WebAIM Contrast Checker
2. Verify both light and dark mode variants
3. Document any tokens that require adjustment
4. Prioritize text tokens (foreground, muted-foreground, *-foreground pairs)

**Common failures:**

- `muted-foreground` often fails in light mode (not enough contrast)
- `info` backgrounds with white text in light mode
- `warning` with dark text in dark mode

### Color Alone Is Not Enough

**Never rely on color as the only means of conveying information.** Always pair color with icons,
text labels, patterns, or layout cues.

**Bad:**

```tsx
❌ <Text color="destructive-foreground">Error occurred</Text>
```

**Good:**

```tsx
✅ <HStack>
     <Icon name="warning" color="destructive-foreground" />
     <Text color="destructive-foreground">Error occurred</Text>
   </HStack>
```

### Focus Indicators

**Required for keyboard navigation and accessibility:**

- **Always visible:** Never remove focus indicators with `outline: none`
- **High contrast:** Use `ring` token (designed for focus rings)
- **Sufficient size:** Focus indicators must be clearly visible

**Example:**

```tsx
<Button
  _focusVisible={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px"
  }}
>
  Submit
</Button>
```

### Interactive Element Sizing

**Minimum touch target:** 48×48dp (approximately 48×48 pixels)

**Implementation:**

```tsx
// Too small
❌ <Button size="xs">Click</Button>  // 24×24px

// Minimum size
✅ <Button size="sm">Click</Button>  // 48×48px minimum
```

---

## Interactive State Patterns

Based on Material Design 3's state layer system, adopted by most modern design systems.

### Link Interaction Patterns

**Research:** External-research-analyst investigation of IBM Carbon, GitHub Primer, Material Design 3, Ant Design,
Nielsen Norman Group, WCAG 2.4.13, and accessibility.org best practices (2024).

**Industry Standard Pattern (Inline Text Links):**

```tsx
<Link
  color="tertiary"
  textDecoration="underline"
  textDecorationThickness="2px"
  textUnderlineOffset="2px"
  _hover={{
    color: "tertiary-hover",  // Brighter/more saturated shade
  }}
  _focus={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
>
  Already have an account? Sign in
</Link>
```

**Key findings:**

- **Default underline:** Required for accessibility (WCAG non-color indicators, helps color-blind users)
- **Hover color change:** `tertiary` → `tertiary-hover` (warmer/brighter shade)
- **Focus ring:** Same 2px pattern as buttons (WCAG 2.4.13 compliance, keyboard navigation)
- **Visited states:** Declining trend in modern design - skip unless user research shows need

**Pattern rationale:**

- Underlines maximize perceived clickability (Nielsen Norman Group, Smart Interface Design 2024)
- Color change alone is insufficient (Baymard Institute, WebAIM accessibility guidelines)
- Consistency with button focus states improves UX across interactive elements

### State Layer Philosophy

**Use opacity overlays, not color changes**, for interactive states. This approach is consistent across all tokens,
maintains contrast ratios, and performs better than color calculations.

**Implementation:** CineXplorer provides dedicated interaction state tokens (`layer-hover-01`, `layer-selected-01`, etc.)
that internally use opacity overlay calculations.
See **ADR-009: Use Material Design Opacity Overlays for Interaction States** for full rationale.

### Interaction State Tokens

**For surfaces (cards, list items, menu items):**

```tsx
// Use dedicated tokens - they handle opacity internally
<Box
  bg="layer-01"
  _hover={{ bg: "layer-hover-01" }}      // Internally: layer-01 + 8% foreground
  _active={{ bg: "layer-selected-01" }}   // Internally: layer-01 + 12% foreground
>
  Hover me
</Box>
```

**Available tokens per layer:**

- `layer-hover-01` / `layer-hover-02` - Hover states (8% foreground overlay)
- `layer-selected-01` / `layer-selected-02` - Selected states (12% foreground overlay)
- `layer-active-01` / `layer-active-02` - Active/pressed states (12% foreground overlay)

**Why dedicated tokens?**

- Consistent across all themes (not slavishly beholden to design systems)
- Works with ADR-008's alternating layer pattern (avoids layer-03 = layer-01 issue)
- Simpler component code (no manual overlay logic)
- Future-proof (auto-adapts to new themes)

### Standard Opacity Values

**From Material Design 3 research:**

| State | Opacity | Token Usage | Manual Usage (if needed) |
|-------|---------|-------------|--------------------------|
| **Hover** | 8% | `bg="layer-hover-01"` | `bg="foreground/8"` |
| **Focus** | 12% | N/A (use ring) | `bg="foreground/12"` |
| **Pressed/Active** | 12% | `bg="layer-active-01"` | `bg="foreground/12"` |
| **Selected** | 12% | `bg="layer-selected-01"` | `bg="foreground/12"` |
| **Drag** | 16% | `bg="drag-active"` | `bg="foreground/16"` |
| **Disabled** | 38% | N/A | `opacity={0.38}` |

**Note:** Prefer dedicated tokens over manual overlays. Manual overlays shown for reference or special cases.

### Button Patterns (Per ADR-012)

ADR-012 separates **button patterns** (visual styles) from **color semantics** (functional meaning). This prevents
confusion where "secondary" could mean either "outline button" OR "subtle background color".

**Chakra UI Variants → Token Mappings:**

| Variant | Visual Pattern | Color Tokens | Interaction Tokens | Use Case |
|---------|---------------|--------------|-------------------|----------|
| `solid` | Filled background | `primary` / `on-primary` | `primary-hover`, `primary-active` | Highest emphasis |
| `outline` | Transparent + border | `button-outline` (border+text) | Direct opacity: `/8`, `/12` | High emphasis |
| `subtle` | Subtle background | `button-subtle` / `on-button-subtle` | `secondary-hover`, `secondary-active` | Medium emphasis |
| `ghost` | No background/border | `tertiary` or `foreground` | `tertiary-hover`, `tertiary-active` | Low emphasis |

**Implementation Examples:**

```tsx
// Solid button (highest emphasis)
<Button
  variant="solid"
  bg="primary"
  color="on-primary"
  _hover={{ bg: "primary-hover" }}
  _active={{ bg: "primary-active" }}
>
  Save Changes
</Button>

// Outline button (high emphasis)
<Button
  variant="outline"
  borderColor="button-outline"
  color="button-outline"
  _hover={{ bg: "button-outline/8" }}
  _active={{ bg: "button-outline/12" }}
>
  Cancel
</Button>

// Subtle button (medium emphasis)
<Button
  variant="subtle"
  bg="button-subtle"
  color="on-button-subtle"
  _hover={{ bg: "secondary-hover" }}
  _active={{ bg: "secondary-active" }}
>
  Options
</Button>

// Ghost button (low emphasis)
<Button
  variant="ghost"
  color="tertiary"
  _hover={{ color: "tertiary-hover" }}
  _active={{ color: "tertiary-active" }}
>
  Skip
</Button>
```

**Why This Approach:**

- ✅ Clear separation of visual pattern (solid/outline/subtle/ghost) from color meaning (primary/secondary)
- ✅ `button-outline` and `button-subtle` provide self-documenting API
- ✅ Works consistently across all themes (no Carbon vs Primer differences)
- ✅ Aligns with Chakra v3's variant system

**Common Mistake to Avoid:**

```tsx
// ❌ Wrong - "secondary" doesn't mean "outline button"
<Button variant="outline" bg="secondary">Cancel</Button>

// ✅ Correct - outline buttons use button-outline (maps to primary)
<Button variant="outline" borderColor="button-outline" color="button-outline">
  Cancel
</Button>
```

### Choosing the Right Interaction Token

Different UI elements need different interaction state tokens. Use this guide to choose correctly:

**For surfaces (cards, list items, menu items):**

- **Default:** `bg="layer-01"`
- **Hover:** `_hover={{ bg: "layer-hover-01" }}`
- **Selected:** `bg="layer-selected-01"`
- **Why:** Surfaces use layer backgrounds, so layer interaction tokens match

**For solid buttons (filled backgrounds):**

- **Default:** `bg="primary"` + `color="on-primary"`
- **Hover:** `_hover={{ bg: "primary-hover" }}`
- **Active:** `_active={{ bg: "primary-active" }}`
- **Why:** Buttons use color backgrounds, so color interaction tokens match

**For outline buttons (transparent backgrounds):**

- **Default:** `borderColor="button-outline"` + `color="button-outline"`
- **Hover:** `_hover={{ bg: "button-outline/8" }}`
- **Active:** `_active={{ bg: "button-outline/12" }}`
- **Why:** Simple opacity overlay on transparent, no pre-calculated token needed

**For subtle buttons (subtle backgrounds):**

- **Default:** `bg="button-subtle"` + `color="on-button-subtle"`
- **Hover:** `_hover={{ bg: "secondary-hover" }}`
- **Active:** `_active={{ bg: "secondary-active" }}`
- **Why:** Subtle buttons use secondary color, so secondary interaction tokens match

**For interactive text/links:**

- **Default:** `color="tertiary"`
- **Hover:** `_hover={{ color: "tertiary-hover" }}`
- **Active:** `_active={{ color: "tertiary-active" }}`
- **Why:** Links use tertiary color, so tertiary interaction tokens match

**Decision Tree:**

```
What am I styling?
├─ Surface (card, list item, menu item) → Use layer-* tokens
├─ Solid button → Use primary-* tokens
├─ Outline button → Use button-outline with /8 opacity
├─ Subtle button → Use button-subtle + secondary-* tokens
└─ Link/interactive text → Use tertiary-* tokens
```

### Common Patterns

**Surface hover (cards, list items, menu items):**

```tsx
// Use dedicated tokens
<Box
  bg="layer-01"
  _hover={{ bg: "layer-hover-01" }}
  _active={{ bg: "layer-selected-01" }}
  cursor="pointer"
>
  Hoverable surface
</Box>
```

**Selected state (list items, tabs):**

```tsx
<Box
  bg={isSelected ? "layer-selected-01" : "layer-01"}
  _hover={{ bg: isSelected ? "layer-selected-01" : "layer-hover-01" }}
>
  {isSelected ? "Selected" : "Not selected"}
</Box>
```

**Card with elevation change on hover:**

```tsx
<Card
  bg="layer-01"
  _hover={{
    bg: "layer-hover-01",
    boxShadow: "shadow-md"  // Add elevation
  }}
>
  Movie Card
</Card>
```

**Button states (use dedicated interaction tokens):**

```tsx
// Solid button - uses primary-hover/active tokens
<Button
  bg="primary"
  color="on-primary"
  _hover={{ bg: "primary-hover" }}
  _active={{ bg: "primary-active" }}
  _disabled={{ opacity: 0.38, cursor: "not-allowed" }}
>
  Submit
</Button>

// Outline button - uses direct opacity on transparent
<Button
  variant="outline"
  borderColor="button-outline"
  color="button-outline"
  _hover={{ bg: "button-outline/8" }}
  _active={{ bg: "button-outline/12" }}
>
  Cancel
</Button>
```

**Tab active state:**

```tsx
<Tab
  bg={isActive ? "accent/12" : "transparent"}
  borderBottom={isActive ? "2px solid" : "none"}
  borderColor="accent"
>
  Tab Label
</Tab>
```

---

## Semantic Naming Philosophy

CineXplorer's token system follows semantic naming over descriptive naming, enabling theme flexibility
and clear intent.

### Semantic vs. Descriptive

**Semantic naming (what it means):**

- ✅ `success` - Indicates positive outcome or state
- ✅ `warning` - Indicates caution or attention needed
- ✅ `info` - Indicates informational content
- ✅ `destructive` - Indicates danger or irreversible action

**Descriptive naming (what it looks like):**

- ❌ `green` - Just describes the color
- ❌ `yellow` - No semantic meaning
- ❌ `blue` - Changes meaning if color changes
- ❌ `red` - Breaks when theme changes

### Why Semantic Naming Matters

Semantic tokens work across all themes without code changes. Component using `warning` token works identically
whether theme interprets it as gold, orange, or yellow.

```tsx
// Clear intent (semantic) - works across themes
✅ <Badge bg="success">Active</Badge>
✅ <Text color="destructive-foreground">Error</Text>

// Unclear intent (descriptive) - breaks with theme changes
❌ <Badge bg="green">Active</Badge>
❌ <Text color="red">Error</Text>
```

### Token Pairing Convention

**Always pair colors with foreground variants** to ensure contrast across themes.

**Token pair format:** `{name}` / `{name}-foreground`

**Examples:**

- `card` / `card-foreground`
- `success` / `success-foreground`
- `rating` / `rating-foreground`
- `badge` / `badge-foreground`

**Why pairs are required:** Token pairs automatically handle contrast across light/dark modes.

```tsx
// Token pair maintains contrast in both modes
<Badge bg="success" color="success-foreground">
  Success message
</Badge>
```

**Exceptions (single tokens without pairs):**

- `border` - Always used as border color
- `input` - Always used as input border
- `ring` - Always used as focus ring
- `surface-elevated` - Background only (uses `foreground` for text)

---

## Developer Quick Reference

### Most Common Patterns

**Status indicators (ADR-011 canonical naming):**

```tsx
// Success
<Alert bg="success/10" borderColor="success">
  <Text color="on-success">Action completed</Text>
</Alert>

// Warning
<Alert bg="warning/10" borderColor="warning">
  <Text color="on-warning">Please verify</Text>
</Alert>

// Info
<Alert bg="info/10" borderColor="info">
  <Text color="on-info">Helpful tip</Text>
</Alert>

// Error
<Alert bg="destructive/10" borderColor="destructive">
  <Text color="on-destructive">Error occurred</Text>
</Alert>
```

**Movie ratings:**

```tsx
// TMDB score
<Badge bg="rating" color="rating-foreground">
  8.5
</Badge>

// With threshold coloring
<Badge bg={score >= 8 ? "success" : "warning"}>
  {score.toFixed(1)}
</Badge>
```

**Genre tags:**

```tsx
<HStack>
  <Badge bg="badge" color="badge-foreground">Action</Badge>
  <Badge bg="badge" color="badge-foreground">Sci-Fi</Badge>
</HStack>
```

**Surface hierarchy:**

```tsx
<Box bg="background">          {/* Base surface */}
  <Card bg="card">              {/* Elevated surface */}
    <Box bg="surface-elevated"> {/* Featured content */}
      <Text>Hero section</Text>
    </Box>
  </Card>
</Box>
```

### Edge Cases & When to Document

**If no semantic token fits:**

1. **First**, verify you checked the decision tree
2. **Second**, consider if the use case should be added to the system
3. **Third**, if truly exceptional, document in code:

```tsx
// EXCEPTION: Using hardcoded color because...
// [Explain why no semantic token fits]
// TODO: Consider adding semantic token for this pattern if it recurs
<Box bg="#custom-color">
  Special case
</Box>
```

4. **Report the gap** to update this strategy document

### Anti-Patterns to Avoid

**Never hardcode colors:**

```tsx
❌ color="red.600"
❌ bg="#4299e1"
❌ borderColor="blue.200"
❌ style={{ color: "#FF0000" }}
```

**Never use Chakra raw color tokens directly:**

```tsx
❌ <Text color="red.600">Error</Text>
❌ <Box bg="gray.100">Container</Box>
❌ <Badge colorScheme="blue">Info</Badge>
```

**Never bypass the system silently:**

```tsx
❌ // No comment explaining why
    <Box bg="#F5C518">Rating</Box>
```

**Always use semantic tokens (ADR-011 canonical naming):**

```tsx
✅ <Text color="on-destructive">Error</Text>
✅ <Box bg="muted">Container</Box>
✅ <Badge bg="info" color="on-info">Info</Badge>
✅ <Box bg="rating" color="rating-foreground">8.5</Box>
```

### Quick Decision Flowchart

**Start here:** What am I styling?

1. **Status/alert?** → `success`/`warning`/`info`/`destructive`
2. **Movie rating?** → `rating`
3. **Neutral badge?** → `badge`
4. **Surface/container?** → `background`/`card`/`surface-elevated`/`popover`
5. **Interactive element?** → `primary`/`secondary`/`accent`/`muted`
6. **Border/input/focus?** → `border`/`input`/`ring`
7. **Drag-and-drop?** → `drag-active`/`drop-zone`

**Still unsure?** See full [Token Selection Decision Tree](#token-selection-decision-tree)

---

**Document Version:** 1.2 (2025-11-07)

**Version History:**

- 1.2 (2025-11-07): Updated for ADR-011 on-* naming convention, marked -foreground tokens as deprecated
- 1.1 (2025-11-03): Verified accuracy, added ADR-004 reference for implementation architecture
- 1.0 (2025-11-02): Initial comprehensive guide

**Sources:**

This document consolidates research and analysis from CineXplorer's theme system modernization work
(tracked in `tasks-theme-system-modernization.md`):

- **Phase 3.1**: Research synthesis from 4 production design systems (Material Design 3, IBM Carbon, GitHub Primer, Ant Design)
- **Phase 3.3**: Migration analysis and hardcoded color audit from codebase (`notes-theme-system-modernization.md`)
- **Phase 4.1.5**: Opacity modifier validation, hex format verification

**Related Documentation:**

- [ADR-004: Provider-Based Multi-Theme Switching](../adr/adr-004-provider-based-multi-theme-switching.md) -
  Theme system implementation
- [ADR-003: Extend Semantic Token System](../adr/adr-003-extend-semantic-token-system.md) -
  Token extension rationale

**Maintainer:** Update this document when adding new tokens or discovering new migration patterns
