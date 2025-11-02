# Semantic Token Strategy and Migration Guide

**Version:** 1.0 | **Updated:** 2025-11-02 | **Status:** Active

## Purpose

Comprehensive guide for CineXplorer's semantic token system, covering the 33-token structure
(shadcn/ui base + extensions), legacy token migration, and component migration patterns.

**Use this when:**

- Migrating components from old custom tokens to semantic tokens
- Deciding which semantic token to use for a UI element
- Understanding the token extension rationale (13 new tokens)
- Converting hardcoded colors to semantic tokens

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

### Base System: 20 shadcn/ui Tokens

CineXplorer's theme system is built on shadcn/ui's semantic token structure.

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
| **Accent Colors** (Highlights) | | |
| `accent` | Highlighted elements | Links, badges, focus states, callouts |
| `accent-foreground` | Text on accent backgrounds | Accent badge text |
| **Destructive Colors** (Danger) | | |
| `destructive` | Danger/error/delete actions | Delete buttons, error states, destructive actions |
| `destructive-foreground` | Text on destructive backgrounds | Destructive button text |
| **UI Elements** | | |
| `border` | Standard borders | Dividers, card outlines, separators |
| `input` | Input field borders | Text inputs, select boxes, form fields |
| `ring` | Focus ring indicator | Keyboard navigation, focus states |

**Total:** 20 semantic concepts (11 pairs + 3 singles = 22 properties)

### Extended System: +13 Movie App Tokens

CineXplorer extends shadcn/ui with 13 additional tokens for movie-specific UI patterns
and complete alert system coverage.

| Token | Purpose | Use Cases | Rationale |
|-------|---------|-----------|-----------|
| **Status Pairs (6 tokens)** | | | |
| `success` | Success background | Success alerts, positive feedback, high ratings | Industry standard (all 4 design systems researched) |
| `success-foreground` | Text on success | Success message text | Completes success semantic pair |
| `warning` | Warning background | Caution states, validation warnings | Standard alert system component |
| `warning-foreground` | Text on warning | Warning message text | Completes warning semantic pair |
| `info` | Info background | Informational messages, help text | Completes alert system (success/warning/error/info) |
| `info-foreground` | Text on info | Info message text | Completes info semantic pair |
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

**Extended Total:** 33 semantic tokens (still under industry averages of 40-140+)

**Token Extension Summary:**

All 13 extended tokens are backed by cross-system research (Material Design 3, IBM Carbon, GitHub Primer, Ant Design)
or address movie app-specific requirements. Total of 33 tokens remains conservative compared to industry averages (40-140+).

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

### Pair Convention

Most semantic tokens come in pairs: `{name}` (background) and `{name}-foreground` (text on background).

**Examples:**

- `card` + `card-foreground`
- `success` + `success-foreground`
- `rating` + `rating-foreground`

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

### State Layer Philosophy

**Use opacity overlays, not color changes**, for interactive states. This approach is consistent across all tokens,
maintains contrast ratios, and performs better than color calculations.

### Standard Opacity Values

**From Material Design 3 research:**

| State | Opacity | Usage | Implementation |
|-------|---------|-------|----------------|
| **Hover** | 8% | Mouse over interactive element | `bg="accent/8"` |
| **Focus** | 12% | Keyboard navigation focus | `bg="accent/12"` |
| **Pressed/Active** | 12% | Button press, active tab | `bg="accent/12"` |
| **Drag** | 16% | Element being dragged | `bg="drag-active/16"` |
| **Disabled** | 38% | Disabled controls | `opacity={0.38}` |

**Note:** Overlay uses foreground color at specified opacity, not the background color itself.

### Chakra UI Implementation

**Opacity modifiers with `/` syntax:**

```tsx
// Hover state
<Box
  bg="card"
  _hover={{ bg: "accent/8" }}
>
  Hover me
</Box>

// Active state (button press)
<Button
  bg="primary"
  _active={{ bg: "primary/12" }}
>
  Press me
</Button>

// Focus state
<Input
  _focus={{
    borderColor: "ring",
    boxShadow: "0 0 0 2px",
    boxShadowColor: "ring/50"
  }}
/>
```

### Common Patterns

**Card hover state:**

```tsx
<Card
  bg="card"
  _hover={{
    bg: "card",
    shadow: "lg",
    // Subtle accent overlay
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      bg: "accent/8",
      borderRadius: "inherit"
    }
  }}
>
  Movie Card
</Card>
```

**Button states:**

```tsx
<Button
  bg="primary"
  color="primary-foreground"
  _hover={{ bg: "primary", opacity: 0.92 }}  // 8% lighter
  _active={{ bg: "primary", opacity: 0.88 }} // 12% lighter
  _disabled={{ opacity: 0.38, cursor: "not-allowed" }}
>
  Submit
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

**Status indicators:**

```tsx
// Success
<Alert bg="success/10" borderColor="success">
  <Text color="success-foreground">Action completed</Text>
</Alert>

// Warning
<Alert bg="warning/10" borderColor="warning">
  <Text color="warning-foreground">Please verify</Text>
</Alert>

// Info
<Alert bg="info/10" borderColor="info">
  <Text color="info-foreground">Helpful tip</Text>
</Alert>

// Error
<Alert bg="destructive/10" borderColor="destructive">
  <Text color="destructive-foreground">Error occurred</Text>
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

**Always use semantic tokens:**

```tsx
✅ <Text color="destructive-foreground">Error</Text>
✅ <Box bg="muted">Container</Box>
✅ <Badge bg="info" color="info-foreground">Info</Badge>
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

**Document Version:** 1.0 (2025-11-02)

**Sources:**

This document consolidates research and analysis from CineXplorer's theme system modernization work
(tracked in `tasks-theme-system-modernization.md`):

- **Phase 3.1**: Research synthesis from 4 production design systems (Material Design 3, IBM Carbon, GitHub Primer, Ant Design)
- **Phase 3.3**: Migration analysis and hardcoded color audit from codebase (`notes-theme-system-modernization.md`)

**Maintainer:** Update this document when adding new tokens or discovering new migration patterns
