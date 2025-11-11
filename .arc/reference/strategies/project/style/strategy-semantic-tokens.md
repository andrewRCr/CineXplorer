# Semantic Token Strategy

**Version:** 2.0 | **Updated:** 2025-11-11 | **Status:** Active

## Purpose

Quick reference guide for choosing the correct semantic token when building UI components in CineXplorer.
Organized by use case ("what are you building?") rather than token category.

**Use this when:**

- Building a new component and need to choose colors
- Converting hardcoded colors to semantic tokens
- Implementing buttons, forms, status indicators, or interactive elements
- Understanding which token provides the right semantic meaning

**For deep dives:**

- **Border hierarchy**: See [Border System Strategy](./strategy-border-system.md)
- **Layout dimensions**: See [Layout Token Strategy](./strategy-layout-tokens.md)
- **Architectural decisions**: See ADRs 005-012 in `.arc/reference/adr/`

**Not covered here:**

- Theme implementation (see ADR-005: Unified Theme Adapter Layer)
- Adding new themes (see theme adapter files in `frontend/src/theme/color/adapters/`)
- Migration guides (historical - see ADRs for context if needed)

---

## Table of Contents

1. [Quick Decision Tree](#quick-decision-tree)
2. [Building Surfaces](#building-surfaces)
3. [Building Buttons](#building-buttons)
4. [Building Status Indicators](#building-status-indicators)
5. [Building Interactive Elements](#building-interactive-elements)
6. [Building Movie-Specific UI](#building-movie-specific-ui)
7. [Brand Identity](#brand-identity)
8. [Accessibility Standards](#accessibility-standards)
9. [Common Patterns](#common-patterns)
10. [Developer Quick Reference](#developer-quick-reference)

---

## Quick Decision Tree

**Start here:** What are you building?

```
What am I styling?
├─ Status/feedback indicator? → [Status Indicators](#building-status-indicators)
│  ├─ Success: success / on-success
│  ├─ Warning: warning / on-warning
│  ├─ Error: destructive / on-destructive
│  └─ Info: info / on-info
│
├─ Button or action? → [Building Buttons](#building-buttons)
│  ├─ Primary action (highest emphasis): primary / on-primary + solid variant
│  ├─ Branded outline action: button-outline-primary / on-button-outline-primary
│  ├─ Utility/navigation: button-outline / on-button-outline
│  ├─ Embedded control: button-subtle / on-button-subtle
│  └─ Dismissive action: tertiary (ghost variant)
│
├─ Surface/container? → [Building Surfaces](#building-surfaces)
│  ├─ Page background: background / foreground
│  ├─ Card/panel (1st elevation): layer-01
│  ├─ Modal/dialog (2nd elevation): layer-02
│  └─ Dropdown over modal (3rd elevation): layer-03
│
├─ Interactive text/link? → [Interactive Elements](#building-interactive-elements)
│  └─ Links/focus/highlights: tertiary / tertiary-hover
│
├─ Movie rating/badge? → [Movie UI](#building-movie-specific-ui)
│  ├─ Rating display: rating / rating-foreground
│  └─ Genre tags: badge / badge-foreground
│
├─ Border/input/focus? → [UI Elements](#ui-element-tokens)
│  ├─ Borders: border-strong-01 (or see Border Strategy for hierarchy)
│  ├─ Input fields: input
│  └─ Focus indicators: ring
│
└─ Brand/logo? → [Brand Identity](#brand-identity)
   └─ Use brand tokens sparingly (logo, special moments only)
```

**Still unsure?** Check the [Developer Quick Reference](#developer-quick-reference) at the end.

---

## Building Surfaces

Surfaces are container backgrounds that establish elevation hierarchy in your UI.

### Core Surface Tokens

**Base layer (lowest elevation):**

```tsx
// Page background
<Box bg="background">
  <Text color="foreground">Body text</Text>
</Box>
```

**Elevated surfaces (layer system):**

CineXplorer uses IBM Carbon's layer-based elevation philosophy (see ADR-006). All themes provide 3 distinct elevation levels:

```tsx
// First elevation: Cards, panels, content containers
<Card bg="layer-01">
  <Text color="foreground">Card content</Text>
</Card>

// Second elevation: Modals, dialogs, elevated panels
<Modal>
  <Modal.Content bg="layer-02">
    <Text color="foreground">Modal content</Text>
  </Modal.Content>
</Modal>

// Third elevation: Dropdowns over modals, highest z-index surfaces
<Menu>
  <Menu.Content bg="layer-03">
    <Text color="foreground">Dropdown menu</Text>
  </Menu.Content>
</Menu>
```

**Overlay surfaces:**

```tsx
// Tooltips, popovers, dropdowns (context-dependent elevation)
<Tooltip>
  <Tooltip.Content bg="popover">
    <Text color="on-popover">Tooltip text</Text>
  </Tooltip.Content>
</Tooltip>
```

**Note:** `popover` is a distinct token with semantic meaning "overlay content". Theme adapters typically implement it by mapping to `layer-02` (popovers over base content) or `layer-03` (popovers over modals) depending on z-index context.

### Light Mode Alternating Pattern

**Important:** Light mode uses alternating layers (see ADR-008):

```
Light Mode Pattern:
background:  #ffffff (white)
layer-01:    #f4f4f4 (gray)
layer-02:    #ffffff (white - alternates back!)
layer-03:    #f4f4f4 (gray - alternates back!)

Dark Mode Pattern:
background:  #161616 (darkest)
layer-01:    #262626 (progressively lighter)
layer-02:    #393939 (progressively lighter)
layer-03:    #525252 (progressively lighter)
```

**Why alternating in light mode:** Progressive darkening on white becomes indistinguishable. Alternating creates clear
visual "nesting" - you can see when elements are inside others.

### Borders on Surfaces

**Use per-layer border hierarchy for visibility:**

```tsx
// Card on background/layer-01 (use border-strong-01)
<Card bg="layer-01" borderWidth="1px" borderColor="border-strong-01">
  Card content
</Card>

// Panel on layer-02 (use border-strong-02 for visibility)
<Box bg="layer-02" borderWidth="1px" borderColor="border-strong-02">
  Panel content
</Box>
```

**For deep dive:** See [Border System Strategy](./strategy-border-system.md) for complete border hierarchy
(5 tokens: border-subtle-00/02, border-strong-01/02/03).

### Shadows on Surfaces

**Shadows are optional enhancement** (not required for elevation - layers handle visibility):

```tsx
// Card with optional shadow
<Card bg="layer-01" boxShadow="shadow-sm">
  Card with subtle shadow
</Card>

// Modal with optional shadow
<Modal>
  <Modal.Content bg="layer-02" boxShadow="shadow-lg">
    Modal with large shadow
  </Modal.Content>
</Modal>
```

**Available shadow tokens:**

- `shadow-sm` - Subtle elevation (cards)
- `shadow-md` - Medium elevation (popovers, dropdowns)
- `shadow-lg` - High elevation (modals, dialogs)

### Interaction States on Surfaces

**For interactive surfaces** (cards with hover, list items, menu items):

```tsx
// Card with hover state
<Card
  bg="layer-01"
  _hover={{ bg: "layer-hover-01" }}
  _active={{ bg: "layer-active-01" }}
  cursor="pointer"
>
  Hoverable card
</Card>

// Selected list item
<Box
  bg={isSelected ? "layer-selected-01" : "layer-01"}
  _hover={{ bg: isSelected ? "layer-selected-01" : "layer-hover-01" }}
>
  {isSelected ? "Selected" : "Not selected"}
</Box>
```

**Available interaction tokens per layer:**

- `layer-hover-01` / `layer-hover-02` - Hover states (8% opacity overlay)
- `layer-selected-01` / `layer-selected-02` - Selected states (12% opacity overlay)
- `layer-active-01` / `layer-active-02` - Active/pressed states (12% opacity overlay)

**Implementation:** Uses Material Design 3's opacity overlay approach (see ADR-009). All themes use identical 8%/12%
opacity values for consistency.

---

## Building Buttons

Buttons follow a visual pattern hierarchy (solid/outline/subtle/ghost) that's **separate from color semantics** (see ADR-012).

### Button Emphasis Hierarchy

| Pattern | Emphasis | Visual | Use Cases |
|---------|----------|--------|-----------|
| **Solid** | Highest | Filled background | Primary actions: "Save", "Submit", "Browse Movies" |
| **Primary Outline** | High | Brand color border | Branded actions in outline style (rare) |
| **Neutral Outline** | Medium | Gray border | Utility actions: "Cancel", "Back", OAuth, filters |
| **Subtle** | Medium-Low | Muted fill | Embedded controls: theme selectors, in-panel actions |
| **Ghost** | Lowest | Text only | Dismissive actions: "Skip", "Close", "Dismiss" |

### Pattern 1: Solid Button (Highest Emphasis)

**Use for:** Primary actions, most important CTA

```tsx
<Button
  variant="solid"
  bg="primary"
  color="on-primary"
  _hover={{ bg: "primary-hover" }}
  _active={{ bg: "primary-active" }}
>
  Save Changes
</Button>
```

**Tokens:**

- Background: `primary`
- Text: `on-primary` (pairs with primary background)
- Hover: `primary-hover` (8% opacity overlay)
- Active: `primary-active` (12% opacity overlay)

### Pattern 2: Primary Outline Button (High Emphasis)

**Use for:** Branded actions in outline style (less common than neutral outline)

```tsx
<Button
  variant="outline"
  borderColor="button-outline-primary"
  color="on-button-outline-primary"
  _hover={{ bg: "primary/8" }}
  _active={{ bg: "primary/12" }}
>
  Learn More
</Button>
```

**Tokens:**

- Border: `button-outline-primary` (maps to `primary`)
- Text: `on-button-outline-primary` (maps to `on-primary`)
- Hover: Direct opacity on primary color (8%)
- Active: Direct opacity on primary color (12%)

**Examples:** "Learn More" on landing pages, branded CTAs that need less weight than solid

### Pattern 3: Neutral Outline Button (Medium Emphasis) - DEFAULT

**Use for:** Utility actions, navigation, OAuth, filters - **most common outline button type**

```tsx
<Button
  variant="outline"
  borderColor="button-outline"
  color="on-button-outline"
  _hover={{ bg: "tertiary/8", borderColor: "tertiary" }}
  _active={{ bg: "tertiary/12", borderColor: "tertiary" }}
>
  Cancel
</Button>
```

**Tokens:**

- Border: `button-outline` (maps to neutral `border`, NOT primary)
- Text: `on-button-outline` (maps to `foreground`)
- Hover: Shifts to tertiary color (signals interactivity)
- Active: Tertiary with stronger opacity

**Examples:** "Cancel", "Back to Results", OAuth buttons (Google/GitHub), filter toggles

**Why two outline variants?** Real-world usage revealed most outline buttons are neutral utility actions (navigation,
OAuth, Cancel), not branded primary actions. The default name (`button-outline`) is the more common neutral variant.
Explicit name (`button-outline-primary`) signals special branded case.

### Pattern 4: Subtle Button (Medium-Low Emphasis)

**Use for:** Embedded actions within panels/cards

```tsx
<Button
  variant="subtle"
  bg="button-subtle"
  color="on-button-subtle"
  _hover={{ bg: "secondary-hover" }}
  _active={{ bg: "secondary-active" }}
>
  Options
</Button>
```

**Tokens:**

- Background: `button-subtle` (maps to `secondary`)
- Text: `on-button-subtle` (maps to `on-secondary`)
- Hover: `secondary-hover`
- Active: `secondary-active`

**Examples:** Theme selector buttons, sort dropdowns, in-panel controls

### Pattern 5: Subtle Button with Selected State

**Use for:** Toggle-style subtle buttons (e.g., theme selector)

```tsx
<Button
  variant="subtle"
  bg={isSelected ? "button-subtle-selected" : "button-subtle"}
  color={isSelected ? "on-button-subtle-selected" : "on-button-subtle"}
  _hover={{ bg: isSelected ? "button-subtle-selected" : "secondary-hover" }}
>
  Theme Option
</Button>
```

**Tokens:**

- Selected background: `button-subtle-selected` (maps to `layer-selected-02`)
- Selected text: `on-button-subtle-selected` (maps to `foreground`)

**Why dedicated tokens?** When a subtle button is selected, it transitions from "button semantics" (secondary color,
paired with on-secondary) to "interactive surface semantics" (layer-selected-02, paired with foreground). This semantic
shift requires different foreground colors for proper contrast across themes.

### Pattern 6: Ghost Button (Lowest Emphasis)

**Use for:** Dismissive actions, tertiary actions

```tsx
<Button
  variant="ghost"
  color="tertiary"
  _hover={{ color: "tertiary-hover" }}
  _active={{ color: "tertiary-active" }}
>
  Skip
</Button>
```

**Tokens:**

- Text: `tertiary` (interactive text color)
- Hover: `tertiary-hover`
- Active: `tertiary-active`

**Examples:** "Skip", "Close", "Dismiss", low-priority actions

### Decision Tree: Which Button Pattern?

```
1. Is this the main action on the page?
   └─ Yes → Solid (primary/on-primary)

2. Is this a branded action but needs less weight than solid?
   └─ Yes → Primary Outline (button-outline-primary)

3. Is this a utility/navigation action?
   └─ Yes → Neutral Outline (button-outline) - MOST COMMON

4. Is this embedded within a panel/card?
   └─ Yes → Subtle (button-subtle)

5. Is this a dismissive/tertiary action?
   └─ Yes → Ghost (tertiary)
```

---

## Building Status Indicators

Status indicators communicate feedback, outcomes, and semantic states using standardized color pairs.

### Success (Positive Outcomes)

```tsx
// Success alert
<Alert bg="success/10" borderColor="success" borderWidth="1px">
  <Icon name="check" color="on-success" />
  <Text color="on-success">Changes saved successfully</Text>
</Alert>

// Success badge (solid fill)
<Badge bg="success" color="on-success">
  Active
</Badge>
```

**Tokens:**

- Background: `success` (green in all themes)
- Text: `on-success` (text on success backgrounds)

**Use cases:** Confirmations, positive feedback, high ratings, "active" status

### Warning (Caution States)

```tsx
// Warning alert
<Alert bg="warning/10" borderColor="warning" borderWidth="1px">
  <Icon name="warning" color="on-warning" />
  <Text color="on-warning">Please verify your email address</Text>
</Alert>

// Warning badge
<Badge bg="warning" color="on-warning">
  Pending
</Badge>
```

**Tokens:**

- Background: `warning` (yellow/amber/gold in all themes)
- Text: `on-warning`

**Use cases:** Validation warnings, caution states, medium-priority alerts

### Destructive/Error (Danger States)

```tsx
// Error alert
<Alert bg="destructive/10" borderColor="destructive" borderWidth="1px">
  <Icon name="error" color="on-destructive" />
  <Text color="on-destructive">Failed to save changes</Text>
</Alert>

// Delete button
<Button bg="destructive" color="on-destructive">
  Delete Account
</Button>
```

**Tokens:**

- Background: `destructive` (red in all themes)
- Text: `on-destructive`

**Use cases:** Errors, delete actions, destructive operations, critical alerts

### Info (Informational Messages)

```tsx
// Info alert
<Alert bg="info/10" borderColor="info" borderWidth="1px">
  <Icon name="info" color="on-info" />
  <Text color="on-info">New features available</Text>
</Alert>

// Info badge
<Badge bg="info" color="on-info">
  New
</Badge>
```

**Tokens:**

- Background: `info` (blue in all themes)
- Text: `on-info`

**Use cases:** Informational messages, help text, tips, neutral status

### Opacity Modifier Pattern

**For subtle backgrounds** (alerts, info boxes):

```tsx
// 10% opacity background (subtle tint)
<Alert bg="success/10">
  <Text color="on-success">Subtle success message</Text>
</Alert>

// Full opacity background (solid badge)
<Badge bg="success" color="on-success">
  Active
</Badge>
```

**Common opacity values:**

- `/10` - Very subtle background tint (10% opacity)
- `/20` - Subtle background (20% opacity)
- `/50` - Medium transparency
- `/80` - Strong but not fully opaque

### Token Naming Convention (ADR-011)

**All foreground tokens use `on-*` prefix:**

```tsx
// ✅ Correct (canonical naming)
<Badge bg="success" color="on-success">Active</Badge>

// ❌ Deprecated (old naming - still works but avoid in new code)
<Badge bg="success" color="success-foreground">Active</Badge>
```

**Pattern:** `on-{color}` clearly indicates "text that goes ON a colored background" (Material Design 3 convention).

---

## Building Interactive Elements

Interactive elements include links, form fields, focus states, and highlighted content.

### Links and Interactive Text

**Standard link pattern:**

```tsx
<Link
  color="tertiary"
  textDecoration="underline"
  textDecorationThickness="2px"
  textUnderlineOffset="2px"
  _hover={{ color: "tertiary-hover" }}
  _active={{ color: "tertiary-active" }}
  _focus={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
>
  Already have an account? Sign in
</Link>
```

**Tokens:**

- Default: `tertiary` (foreground token for interactive text)
- Hover: `tertiary-hover` (brighter/more saturated)
- Active: `tertiary-active` (pressed state)
- Focus: `ring` (keyboard navigation indicator)

**Why underline?** Accessibility best practice - color alone is insufficient for color-blind users (WCAG guideline).

### Focus Indicators

**Required for keyboard navigation:**

```tsx
<Button
  _focusVisible={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
>
  Submit
</Button>
```

**Token:**

- `ring` - High-contrast focus indicator (meets WCAG 2.4.13 contrast requirements)

**Rules:**

- Never remove focus indicators (`outline: none` is prohibited)
- Always use `ring` token (not custom colors)
- Minimum 2px outline width
- 2px offset for clear separation

### Form Inputs

**Input field borders:**

```tsx
<Input
  borderColor="input"
  _hover={{ borderColor: "border-strong-01" }}
  _focus={{
    borderColor: "tertiary",
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
/>
```

**Tokens:**

- Default border: `input`
- Hover border: `border-strong-01` (or stay with `input`)
- Focus border: `tertiary` (signals active state)
- Focus ring: `ring` (accessibility indicator)

### Muted/Deemphasized Text

**For secondary information:**

```tsx
<VStack align="start">
  <Text color="foreground">Primary heading</Text>
  <Text color="on-muted" fontSize="sm">
    Last updated 2 hours ago
  </Text>
</VStack>
```

**Token:**

- `on-muted` - Secondary text, labels, captions, timestamps

**Distinction:**

- `foreground` - Primary text on backgrounds
- `on-muted` - Deemphasized, secondary text (not disabled - use opacity for disabled)

### Tertiary vs Accent Naming

**Canonical:** Use `tertiary` for new code (Material Design 3-aligned)
**Deprecated:** `accent` is an alias maintained for backward compatibility

```tsx
// ✅ Preferred (canonical naming)
<Link color="tertiary">Learn more</Link>

// ⚠️ Works but deprecated (old naming)
<Link color="accent">Learn more</Link>
```

**Rationale:** "Tertiary" indicates position in hierarchy (Primary > Secondary > Tertiary), while "accent" is ambiguous.
Industry trend is toward Material's naming.

---

## Building Movie-Specific UI

CineXplorer extends the base semantic token system with movie app-specific tokens.

### Movie Ratings

**Rating display (TMDB scores, user ratings):**

```tsx
// Rating badge with IMDb gold aesthetic
<Badge bg="rating" color="rating-foreground">
  8.5
</Badge>

// Rating with context indicator
<HStack>
  <Badge bg="rating" color="rating-foreground">8.5</Badge>
  <Badge bg={score >= 8 ? "success" : "warning"} color="on-success">
    High rated
  </Badge>
</HStack>
```

**Tokens:**

- Background: `rating` (IMDb gold #F5C518 in light mode, adjusted for dark)
- Text: `rating-foreground`

**Use cases:** TMDB scores, user ratings, quality indicators

**Note:** `rating` is distinct from `warning` - ratings have different semantic meaning (quality indicator vs caution state).

### Genre Tags and Badges

**Neutral badges for categorization:**

```tsx
<HStack>
  <Badge bg="badge" color="badge-foreground">Action</Badge>
  <Badge bg="badge" color="badge-foreground">Sci-Fi</Badge>
  <Badge bg="badge" color="badge-foreground">PG-13</Badge>
</HStack>
```

**Tokens:**

- Background: `badge` (neutral gray)
- Text: `badge-foreground`

**Use cases:** Genre tags, content ratings, non-semantic labels

**Distinction:**

- `badge` - Neutral categorization (genre, rating)
- Status colors - Semantic feedback (success, warning, error)

### Drag and Drop Interactions

**For watchlist reordering, favorites management:**

```tsx
// Item being actively dragged
<Card
  bg={isDragging ? "drag-active" : "layer-01"}
  opacity={isDragging ? 0.5 : 1}
  cursor="move"
>
  Draggable movie card
</Card>

// Valid drop target
<Box
  bg={isValidDropTarget ? "drop-zone" : "layer-01"}
  borderWidth="2px"
  borderStyle="dashed"
  borderColor={isValidDropTarget ? "success" : "border"}
>
  Drop movies here
</Box>
```

**Tokens:**

- `drag-active` - Item being dragged (darker/emphasized appearance)
- `drop-zone` - Valid drop target (subtle success/accent tint)

**Use cases:** Watchlist reordering, favorites organization, drag-and-drop interactions

---

## Brand Identity

Brand tokens represent logo/brand identity colors, separate from UI functional colors (see ADR-010).

### When to Use Brand Tokens

**Use brand tokens for:**

- Logo sections (tanuki logo, brand marks)
- Special brand moments (hero sections, marketing pages)
- Company-specific UI elements

**Do NOT use brand tokens for:**

- General component styling (use `primary`/`secondary`/`tertiary`)
- Action buttons (use `primary`)
- Interactive text (use `tertiary`)

### Brand Token System

**Available tokens (all optional):**

```tsx
// Primary brand color (logo, brand identity)
<Box bg="brand" color="on-brand">
  GitLab Logo Section
</Box>

// Secondary brand color (additional brand accents)
<Box bg="brandSecondary" color="on-brandSecondary">
  Secondary Brand Element
</Box>

// Tertiary brand color (for complex multi-color identities like GitLab tanuki)
<Box bg="brandTertiary" color="on-brandTertiary">
  Tertiary Brand Element
</Box>
```

**Tokens:**

- `brand` / `on-brand` - Primary brand identity color
- `brandSecondary` / `on-brandSecondary` - Secondary brand color
- `brandTertiary` / `on-brandTertiary` - Tertiary brand color (rare)

### Brand vs Primary Distinction

**Key principle:** Brand = identity, Primary = UI actions (may be same color)

**Example: IBM Carbon**

- `brand`: Blue (#0f62fe) - IBM identity color
- `primary`: Blue (#0f62fe) - Same color, but semantic meaning differs
- `tertiary`: Blue (#0f62fe) - Same color, used for links

All three tokens have the same visual appearance but different semantic purposes.

**Example: GitLab Pajamas**

- `brand`: Purple (#554488) - GitLab identity
- `brandSecondary`: Orange (#e24329) - Tanuki logo accent
- `primary`: Blue (#1f75cb) - UI action buttons (NOT brand color)
- `tertiary`: Purple (#7759c2) - Links (happens to be brand-aligned but semantically different)

**Example: GitHub Primer**

- `brand`: undefined - No brand color (black/white logo)
- `primary`: Green (#1f883d) - UI actions
- `tertiary`: Blue (#0969da) - Links

### Theme-Specific Availability

| Theme | brand | brandSecondary | brandTertiary |
|-------|-------|----------------|---------------|
| **GitHub Primer** | undefined | undefined | undefined |
| **IBM Carbon** | Blue | undefined | undefined |
| **GitLab Pajamas** | Purple | Orange | Orange (darker) |
| **Material Design 3** | Purple | undefined | undefined |

**Note:** Brand tokens are optional - not all themes have brand identity colors separate from UI colors.

---

## Accessibility Standards

All semantic tokens must meet WCAG accessibility guidelines for contrast and visibility.

### Contrast Requirements

**WCAG AA (Required for CineXplorer):**

- **Normal text:** 4.5:1 contrast ratio minimum
    - Body text, labels, descriptions
    - Most common use case

- **Large text & UI components:** 3:1 contrast ratio minimum
    - Text 18pt+ (or 14pt+ bold)
    - Borders, focus indicators, interactive element boundaries
    - Icons and graphical elements

**WCAG AAA (Aspirational):**

- **Normal text:** 7:1 contrast ratio
- **Large text:** 4.5:1 contrast ratio
- Provides better readability for users with low vision

### Testing Contrast

**Before using token combinations:**

1. Test foreground/background pairs with WebAIM Contrast Checker
2. Verify both light and dark mode variants
3. Document any tokens requiring adjustment
4. Prioritize text tokens (foreground, on-muted, `on-*` pairs)

**Common failures:**

- `on-muted` often fails in light mode (insufficient contrast)
- `info` backgrounds with white text in light mode
- `warning` with dark text in dark mode

### Color Alone Is Not Enough

**Never rely on color as the only means of conveying information.** Always pair color with icons, text labels, patterns,
or layout cues.

**Bad:**

```tsx
❌ <Text color="on-destructive">Error occurred</Text>
```

**Good:**

```tsx
✅ <HStack>
     <Icon name="warning" color="on-destructive" />
     <Text color="on-destructive">Error occurred</Text>
   </HStack>
```

### Focus Indicators

**Required for keyboard navigation:**

- Always visible (never `outline: none`)
- High contrast (use `ring` token)
- Sufficient size (2px minimum, 2px offset)

```tsx
<Button
  _focusVisible={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
>
  Submit
</Button>
```

**WCAG 2.4.13:** Focus indicators must have ≥3:1 contrast change from unfocused state.

### Interactive Element Sizing

**Minimum touch target:** 48×48 pixels (WCAG guideline)

```tsx
// ❌ Too small (24×24px)
<Button size="xs">Click</Button>

// ✅ Minimum size (48×48px)
<Button size="sm">Click</Button>
```

---

## Common Patterns

Reusable patterns for interaction states, opacity overlays, and responsive design.

### Interaction State Philosophy

CineXplorer uses **Material Design 3's opacity overlay approach** for all interaction states (see ADR-009).

**Key principle:** Use opacity overlays, not color changes.

**Benefits:**

- Consistent across themes (8%/12% opacity works everywhere)
- Maintains contrast ratios
- Simpler than color calculations
- Works with alternating layer pattern (ADR-008)

### Surface Hover Pattern

**For interactive surfaces** (cards, list items, menu items):

```tsx
<Box
  bg="layer-01"
  _hover={{ bg: "layer-hover-01" }}
  _active={{ bg: "layer-active-01" }}
  cursor="pointer"
>
  Hoverable surface
</Box>
```

**Tokens:**

- Base: `layer-01` (or `layer-02`)
- Hover: `layer-hover-01` (8% foreground opacity overlay)
- Active: `layer-active-01` (12% foreground opacity overlay)

### Button Hover Pattern

**For solid buttons:**

```tsx
<Button
  bg="primary"
  color="on-primary"
  _hover={{ bg: "primary-hover" }}
  _active={{ bg: "primary-active" }}
>
  Save
</Button>
```

**Tokens:**

- Base: `primary`
- Hover: `primary-hover` (8% foreground opacity overlay)
- Active: `primary-active` (12% foreground opacity overlay)

**Available for:**

- Primary: `primary-hover`, `primary-active`
- Secondary: `secondary-hover`, `secondary-active`
- Tertiary: `tertiary-hover`, `tertiary-active`

### Selected State Pattern

**For selectable items:**

```tsx
<Box
  bg={isSelected ? "layer-selected-01" : "layer-01"}
  _hover={{ bg: isSelected ? "layer-selected-01" : "layer-hover-01" }}
>
  {isSelected ? "Selected" : "Not selected"}
</Box>
```

**Rule:** Prevent hover state on selected items (selected state is more pronounced than hover).

### Opacity Modifier Reference

**Standard values from Material Design 3:**

| State | Opacity | Token Usage | Manual Overlay |
|-------|---------|-------------|----------------|
| Hover | 8% | `layer-hover-01`, `primary-hover` | `bg="primary/8"` |
| Focus | 12% | N/A (use ring) | `bg="foreground/12"` |
| Pressed/Active | 12% | `layer-active-01`, `primary-active` | `bg="primary/12"` |
| Selected | 12% | `layer-selected-01` | `bg="foreground/12"` |
| Drag | 16% | `drag-active` | `bg="foreground/16"` |
| Disabled | 38% | N/A | `opacity={0.38}` |

**Prefer dedicated tokens over manual overlays** for consistency.

### Card Elevation Pattern

**Card with hover elevation change:**

```tsx
<Card
  bg="layer-01"
  boxShadow="shadow-sm"
  _hover={{
    bg: "layer-hover-01",
    boxShadow: "shadow-md",
    transform: "translateY(-2px)",
  }}
  transition="all 0.2s"
>
  Movie Card
</Card>
```

**Combines:** Background change + shadow increase + subtle lift

---

## Developer Quick Reference

Fast lookup cheat sheet for common token choices.

### By Use Case

| What are you building? | Token(s) | Example |
|------------------------|----------|---------|
| Page background | `background` / `foreground` | `<Box bg="background">` |
| Card/panel | `layer-01` + `foreground` | `<Card bg="layer-01">` |
| Modal | `layer-02` + `foreground` | `<Modal.Content bg="layer-02">` |
| Dropdown over modal | `layer-03` + `foreground` | `<Menu.Content bg="layer-03">` |
| Primary button | `primary` / `on-primary` | `<Button bg="primary" color="on-primary">` |
| Neutral outline button | `button-outline` / `on-button-outline` | `<Button borderColor="button-outline">` |
| Branded outline button | `button-outline-primary` / `on-button-outline-primary` | `<Button borderColor="button-outline-primary">` |
| Subtle button | `button-subtle` / `on-button-subtle` | `<Button bg="button-subtle">` |
| Ghost button | `tertiary` | `<Button color="tertiary">` |
| Link/interactive text | `tertiary` / `tertiary-hover` | `<Link color="tertiary" _hover={{ color: "tertiary-hover" }}>` |
| Success alert | `success` / `on-success` | `<Alert bg="success/10"><Text color="on-success">` |
| Warning alert | `warning` / `on-warning` | `<Alert bg="warning/10"><Text color="on-warning">` |
| Error alert | `destructive` / `on-destructive` | `<Alert bg="destructive/10"><Text color="on-destructive">` |
| Info alert | `info` / `on-info` | `<Alert bg="info/10"><Text color="on-info">` |
| Movie rating | `rating` / `rating-foreground` | `<Badge bg="rating" color="rating-foreground">` |
| Genre tag | `badge` / `badge-foreground` | `<Badge bg="badge" color="badge-foreground">` |
| Secondary text | `on-muted` | `<Text color="on-muted">` |
| Border | `border-strong-01` | `<Card borderColor="border-strong-01">` |
| Input field | `input` | `<Input borderColor="input">` |
| Focus ring | `ring` | `outlineColor="ring"` |

### Token Count by Category

**Total canonical tokens:** ~67 (across UnifiedTheme interface)

**Breakdown:**

- **Core structure:** 7 (background, foreground, layer-01/02/03, popover pair)
- **Border hierarchy:** 5 (border-subtle-00/02, border-strong-01/02/03)
- **Shadows:** 3 (shadow-sm/md/lg)
- **Layer interactions:** 6 (layer-hover/selected/active × 2 layers)
- **Semantic colors:** 8 (primary, secondary, tertiary, muted with `on-*` pairs)
- **Button patterns:** 8 (outline/outline-primary/subtle/subtle-selected with `on-*` pairs)
- **Status colors:** 8 (success, warning, destructive, info with `on-*` pairs)
- **Brand colors:** 6 optional (brand/brandSecondary/brandTertiary with `on-*` pairs)
- **Color interactions:** 6 (primary/secondary/tertiary hover/active)
- **Movie-specific:** 6 (rating, badge, drag-active, drop-zone pairs)
- **UI elements:** 3 (border, input, ring)
- **Deprecated aliases:** 8 (during ADR-011 migration)

### Anti-Patterns to Avoid

**Never hardcode colors:**

```tsx
❌ color="red.600"
❌ bg="#4299e1"
❌ borderColor="blue.200"
❌ style={{ color: "#FF0000" }}
```

**Never use Chakra raw color tokens:**

```tsx
❌ <Text color="red.600">Error</Text>
❌ <Box bg="gray.100">Container</Box>
❌ <Badge colorScheme="blue">Info</Badge>
```

**Never bypass semantic system silently:**

```tsx
❌ // No comment explaining why
    <Box bg="#F5C518">Rating</Box>
```

**Always use semantic tokens:**

```tsx
✅ <Text color="on-destructive">Error</Text>
✅ <Box bg="muted">Container</Box>
✅ <Badge bg="info" color="on-info">Info</Badge>
✅ <Box bg="rating" color="rating-foreground">8.5</Box>
```

### Quick Decision Flowchart

```
1. Status/alert? → success/warning/destructive/info + on-*
2. Button? → Check emphasis hierarchy (solid/outline/subtle/ghost)
3. Surface? → background/layer-01/layer-02/layer-03
4. Interactive text? → tertiary + tertiary-hover
5. Movie rating? → rating + rating-foreground
6. Neutral badge? → badge + badge-foreground
7. Border? → border-strong-01 (or see Border Strategy)
8. Focus? → ring
```

---

## Related Documentation

**For deep dives:**

- [Border System Strategy](./strategy-border-system.md) - Per-layer border hierarchy
- [Layout Token Strategy](./strategy-layout-tokens.md) - Structural dimensions, z-index

**For architectural context:**

- ADR-005: Unified Theme Adapter Layer (adapter architecture)
- ADR-006: Adopt Carbon Layer Elevation Standard (layer system)
- ADR-007: Use Chakra Theme Tokens for Layout Constants (layout tokens)
- ADR-008: Adopt Carbon Light Alternating Layers (light mode pattern)
- ADR-009: Use Material Design Opacity Overlays (interaction states)
- ADR-010: Establish Core Semantic Color Token Architecture (primary/secondary/tertiary hierarchy)
- ADR-011: Standardize on "on-color" Foreground Naming (on-* prefix)
- ADR-012: Separate Button Pattern Semantics (button helper tokens)

**For implementation:**

- `frontend/src/theme/color/types.ts` - UnifiedTheme interface (source of truth)
- `frontend/src/theme/color/adapters/*.ts` - Theme adapter implementations
- `/theme-debug` page - Visual validation of all themes and tokens

---

**Version History:**

- v2.0 (2025-11-11): Complete rewrite - use case-driven organization, ~67 tokens, ADRs 005-012 integrated, migration
content removed
- v1.2 (2025-11-07): Added ADR-011 on-* naming convention
- v1.1 (2025-11-03): Verified accuracy, added ADR-004 reference
- v1.0 (2025-11-02): Initial comprehensive guide

**Document Status:** Active - Post-migration reference guide (temporal migration content removed)
