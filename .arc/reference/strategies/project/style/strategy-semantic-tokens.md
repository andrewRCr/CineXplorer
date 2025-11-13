# Semantic Token Strategy

**Version:** 2.2 | **Updated:** 2025-11-12 | **Status:** Active

## Purpose

Quick reference guide for choosing the correct semantic token when building UI components in CineXplorer.
Organized by use case ("what are you building?") rather than token category.

**Use this when:**

- Building a new component and need to choose colors
- Converting hardcoded colors to semantic tokens
- Implementing buttons, forms, status indicators, or interactive elements
- Understanding which token provides the right semantic meaning

**For deep dives:**

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

**Note:** `popover` is a distinct token with semantic meaning "overlay content". Theme adapters typically implement it by
mapping to `layer-02` (popovers over base content) or `layer-03` (popovers over modals) depending on z-index context.

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

**Border Color Hierarchy: 2-Tier vs 5-Tier Pattern (ADR-008)**

CineXplorer provides 5 border tokens in the API (`border-subtle-00`, `border-subtle-02`, `border-strong-01/02/03`)
but their implementation differs by mode:

| Mode | Border Tiers | Rationale |
|------|--------------|-----------|
| **Light** | **2 distinct values** | Alternating layers (white ↔ gray ↔ white) - same border works on both |
| **Dark** | **5 distinct values** | Progressive layers (darker → lighter → lightest) - each layer needs adjusted border |

**Light Mode Implementation:**

- `border-subtle-00` and `border-subtle-02` → same value
- `border-strong-01`, `border-strong-02`, `border-strong-03` → same value
- Why: Layers alternate (white ↔ gray), same border visible on both backgrounds

**Dark Mode Implementation:**

- Each token has distinct value, progressively lightening
- Why: Layers progressively lighten, borders must adjust per layer for visibility
- Deltas match IBM Carbon's official progression (~13% subtle, ~21%/24% strong)

**Component usage stays clean:**

```tsx
// Use semantic per-layer tokens - implementation handles mode differences
<Card bg="layer-01" borderColor="border-strong-01">Card</Card>
<Modal bg="layer-02" borderColor="border-strong-02">Modal</Modal>
<Menu bg="layer-03" borderColor="border-strong-03">Menu</Menu>
```

**Why this architecture:**

- Semantic clarity: Token name indicates intent (`border-strong-02` on modals)
- No mode-specific logic needed in components
- Can differentiate per-layer in future without API changes
- Industry-aligned with IBM Carbon and Shopify Polaris patterns

**Implementation:** See `frontend/src/theme/color/utils.ts` (`deriveBorderHierarchy` function) for derivation logic.

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
  _hover={{
    bg: "tertiary/8",           // Background tint
    borderColor: "tertiary",    // Border color shift
    color: "tertiary"           // Text color shift
  }}
  _active={{
    bg: "tertiary/12",
    borderColor: "tertiary",
    color: "tertiary"
  }}
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

**Critical:** Outline button hover requires ALL THREE property changes (bg, borderColor, color). Missing any property
results in incomplete visual feedback. Common mistake: only adding background change without border/color shifts.

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
  _hover={{
    bg: "tertiary/8",        // ⚠️ REQUIRED: Background change for visual feedback
    color: "tertiary-hover"
  }}
  _active={{ color: "tertiary-active" }}
>
  Skip
</Button>
```

**Tokens:**

- Text: `tertiary` (interactive text color)
- Hover background: `tertiary/8` (8% opacity overlay - Material Design 3 standard)
- Hover text: `tertiary-hover`
- Active: `tertiary-active`

**Examples:** "Skip", "Close", "Dismiss", low-priority actions

**Important:** Ghost buttons MUST include background change on hover (`bg: "tertiary/8"`) in addition to color change.
This provides essential visual feedback for interactive states. Common mistake: only changing text color without
background, resulting in insufficient hover indication.

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
// Success alert (10% opacity background)
<Alert bg="success/10" borderColor="success" borderWidth="1px">
  <Icon name="check" color="success" />
  <Alert.Title color="success">Success</Alert.Title>
  <Alert.Description color="foreground">
    Changes saved successfully
  </Alert.Description>
</Alert>

// Success badge (solid fill)
<Badge bg="success" color="on-success">
  Active
</Badge>
```

**Tokens:**

- Background: `success` (green in all themes)
- Alert title: `success` (emphasis on subtle background)
- Alert description: `foreground` (maximum readability on subtle background)
- Badge text: `on-success` (high contrast on solid background)

**Use cases:** Confirmations, positive feedback, high ratings, "active" status

### Warning (Caution States)

```tsx
// Warning alert (10% opacity background)
<Alert bg="warning/10" borderColor="warning" borderWidth="1px">
  <Icon name="warning" color="warning" />
  <Alert.Title color="warning">Warning</Alert.Title>
  <Alert.Description color="foreground">
    Please verify your email address
  </Alert.Description>
</Alert>

// Warning badge (solid fill)
<Badge bg="warning" color="on-warning">
  Pending
</Badge>
```

**Tokens:**

- Background: `warning` (yellow/amber/gold in all themes)
- Alert title: `warning` (emphasis on subtle background)
- Alert description: `foreground` (maximum readability on subtle background)
- Badge text: `on-warning` (high contrast on solid background)

**Use cases:** Validation warnings, caution states, medium-priority alerts

### Destructive/Error (Danger States)

```tsx
// Error alert (10% opacity background)
<Alert bg="destructive/10" borderColor="destructive" borderWidth="1px">
  <Icon name="error" color="destructive" />
  <Alert.Title color="destructive">Error</Alert.Title>
  <Alert.Description color="foreground">
    Failed to save changes
  </Alert.Description>
</Alert>

// Delete button (solid fill)
<Button bg="destructive" color="on-destructive">
  Delete Account
</Button>
```

**Tokens:**

- Background: `destructive` (red in all themes)
- Alert title: `destructive` (emphasis on subtle background)
- Alert description: `foreground` (maximum readability on subtle background)
- Button text: `on-destructive` (high contrast on solid background)

**Use cases:** Errors, delete actions, destructive operations, critical alerts

### Info (Informational Messages)

```tsx
// Info alert (10% opacity background)
<Alert bg="info/10" borderColor="info" borderWidth="1px">
  <Icon name="info" color="info" />
  <Alert.Title color="info">Info</Alert.Title>
  <Alert.Description color="foreground">
    New features available
  </Alert.Description>
</Alert>

// Info badge (solid fill)
<Badge bg="info" color="on-info">
  New
</Badge>
```

**Tokens:**

- Background: `info` (blue in all themes)
- Alert title: `info` (emphasis on subtle background)
- Alert description: `foreground` (maximum readability on subtle background)
- Badge text: `on-info` (high contrast on solid background)

**Use cases:** Informational messages, help text, tips, neutral status

### Alert Text on Opacity Backgrounds

**Important distinction:** Alert patterns differ based on background opacity.

**10-30% opacity backgrounds (subtle alerts):**

```tsx
<Alert bg="success/10" borderColor="success" borderWidth="1px">
  {/* Icon: Use semantic color for visual emphasis */}
  <Icon name="check" color="success" />

  {/* Title: Use semantic color for emphasis */}
  <Alert.Title color="success">Success</Alert.Title>

  {/* Description: Use foreground for maximum readability */}
  <Alert.Description color="foreground">
    Changes saved successfully
  </Alert.Description>
</Alert>
```

**Solid backgrounds (prominent badges/buttons):**

```tsx
<Badge bg="success" color="on-success">
  Active
</Badge>

<Button bg="destructive" color="on-destructive">
  Delete Account
</Button>
```

**Why the difference?**

- `on-*` tokens are optimized for **full opacity** colored backgrounds (badges, solid buttons)
- On subtle tints (10-30%), semantic color provides visual emphasis while `foreground` maintains readability
- This pattern works consistently across all themes without requiring additional specialized tokens
- Key insight: Using `on-success` on 10% opacity backgrounds creates insufficient contrast in some themes

**Common opacity values:**

- `/10` - Very subtle background tint (10% opacity) - most common for alerts
- `/20` - Subtle background (20% opacity)
- `/30` - Medium-subtle (30% opacity) - still uses foreground for description text
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
  textDecorationThickness="1px"  // Browser default, explicit for consistency
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
Uses browser default 1px thickness for clean appearance.

### React Router Integration

**For navigation links in React Router applications**, use the `TextLink` component that wraps React Router's `Link` with
Chakra semantic tokens:

```tsx
import { TextLink } from "@/components/common";

// Basic navigation link
<TextLink to="/movies">Browse Movies</TextLink>

// With custom color override
<TextLink to="/profile" color="primary">My Profile</TextLink>

// With additional Chakra props
<TextLink to="/settings" fontSize="lg" fontWeight="bold">
  Settings
</TextLink>
```

**Component location:** `frontend/src/components/common/TextLink.tsx`

**Why use TextLink instead of raw React Router Link?**

- ✅ Automatic semantic token integration (`tertiary`, `tertiary-hover`)
- ✅ Consistent underline patterns across the application
- ✅ Proper focus states for keyboard navigation (`ring` token)
- ✅ Theme-aware styling (adapts to all themes automatically)
- ✅ Cleaner syntax than manual Chakra Link wrapper

**Pattern implementation:**

```tsx
// TextLink uses Chakra's asChild composition pattern
<ChakraLink asChild color="tertiary" _hover={{ color: "tertiary-hover" }} ...>
  <RouterLink to={path}>{children}</RouterLink>
</ChakraLink>
```

**When to use TextLink:**

✅ **Inline text links** - Navigation links that should look like hyperlinks:

```tsx
// Navbar menu items
<TextLink to="/movies">Movies</TextLink>

// Footer links
<TextLink to="/about">About</TextLink>

// Content body links
<Text>Read more in our <TextLink to="/guide">user guide</TextLink>.</Text>
```

✅ **Standalone navigation text** - When you want full link styling (underline, color, focus):

```tsx
<TextLink to="/settings" fontSize="lg" fontWeight="bold">
  Account Settings
</TextLink>
```

**When NOT to use TextLink:**

❌ **Wrapping buttons** - Buttons have their own styles, don't need link styling:

```tsx
// ❌ Wrong: TextLink conflicts with button styles
<TextLink to="/movies"><Button>Browse</Button></TextLink>

// ✅ Correct: Use Link directly without decoration
import { Link } from "react-router-dom";
<Link to="/movies" style={{ textDecoration: "none" }}>
  <Button>Browse</Button>
</Link>
```

❌ **Block navigation** - Cards, posters, complex layouts need block display:

```tsx
// ❌ Wrong: TextLink is inline, breaks layout
<TextLink to={`/movie/${id}`}>
  <Card>
    <Image src={poster} />
    <Text>{title}</Text>
  </Card>
</TextLink>

// ✅ Correct: Use Link with display: block
import { Link } from "react-router-dom";
<Link to={`/movie/${id}`} style={{ display: "block", textDecoration: "none" }}>
  <Card>
    <Image src={poster} />
    <Text>{title}</Text>
  </Card>
</Link>
```

❌ **Inheriting parent styles** - Text that should match container:

```tsx
// ❌ Wrong: TextLink forces tertiary color, breaks inheritance
<Text color="foreground" fontWeight="bold">
  <TextLink to={`/movie/${id}`}>{title}</TextLink>
</Text>

// ✅ Correct: Use Link with color: inherit
import { Link } from "react-router-dom";
<Text color="foreground" fontWeight="bold">
  <Link to={`/movie/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
    {title}
  </Link>
</Text>
```

❌ **Logo/brand elements** - Don't want underlines or focus rings:

```tsx
// ❌ Wrong: TextLink adds underline and focus ring to logo
<TextLink to="/"><Heading>CineXplorer</Heading></TextLink>

// ✅ Correct: Use Link without decoration
import { Link } from "react-router-dom";
<Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
  <Heading>CineXplorer</Heading>
</Link>
```

❌ **External links** - Use Chakra Link for external URLs:

```tsx
<Link href="https://example.com" isExternal>External Site</Link>
```

**Decision tree:**

1. Is it an inline text link that should look like a hyperlink? → **Use TextLink**
2. Does it wrap a button? → **Use Link with `textDecoration: "none"`**
3. Does it need block display? → **Use Link with `display: "block", textDecoration: "none"`**
4. Should it inherit parent styles? → **Use Link with `textDecoration: "none", color: "inherit"`**
5. Is it external? → **Use Chakra `<Link href isExternal>`**

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

**Focus Pattern Comparison:**

**Recommended: Outline Ring with Offset** (CineXplorer standard)

```tsx
<Input
  borderWidth="1px"
  borderColor="input"
  _focus={{
    borderColor: "tertiary",        // Optional: change border color
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
/>
```

**Pros:**

- ✅ No layout shift on focus (outline is outside element boundary)
- ✅ Meets WCAG 2.4.13 (2px minimum thickness)
- ✅ Clear visual separation from border
- ✅ Works consistently across all component types
- ✅ Industry standard (Ant Design, Bootstrap, US Web Design System)

**Alternative: Border Width Increase** (not recommended)

```tsx
<Input
  borderWidth="1px"
  _focus={{
    borderWidth: "2px",
    borderColor: "ring",
  }}
/>
```

**Pros/Cons:**

- ✅ Simpler CSS
- ❌ Causes layout shift (element grows by 1px on all sides)
- ❌ Requires careful spacing adjustments to prevent content jumps
- ⚠️ Used by Material UI and Polaris, but less common overall

**Recommendation:** Use outline ring pattern for consistent, shift-free focus indication.

**Specifications (WCAG 2.4.13):**

- **Ring width:** 2-3px (2px minimum, 3px better visibility)
- **Ring offset:** 2px (creates clear separation from border)
- **Ring color:** High contrast accent (`ring` token, typically maps to `primary`)
- **Contrast:** ≥3:1 change between focused and unfocused states
- **Border behavior:** Keep at 1px (does NOT increase)

**Focus-Visible for Touch Devices:**

Use `_focusVisible` to show focus rings only on keyboard navigation, not touch/click:

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

This improves mobile UX by hiding focus rings on touch interactions while maintaining keyboard accessibility.

### Form Inputs

**Input field borders follow layer-aware hierarchy:**

```tsx
<Input
  borderColor="border-strong-01"  // Match background layer
  _hover={{ borderColor: "border-strong-02" }}
  // Focus pattern under research - see ATOMIC-TASKS.md
/>
```

**Tokens:**

- Default border: `border-strong-01` (forms on background/layer-01), `border-strong-02` (forms on layer-02)
- Hover border: Steps up one level (e.g., `border-strong-01` → `border-strong-02`)
- Focus pattern: **Under research** - Current implementation uses CSS `:focus-visible` with `!important` to override Chakra defaults, but behavior needs validation against WCAG 2.1/2.2 standards

**Deprecated:** `input` token (aliases to same value as `border`, provides no semantic value)

### Select/Dropdown (Custom Chakra Select)

**Use Chakra's custom Select component** (not NativeSelect) for consistent styling across browsers.

```tsx
<Select.Root
  collection={selectCollection}
  value={value}
  onValueChange={(details) => setValue(details.value)}
  positioning={{ placement: "bottom-start", gutter: 2 }}
>
  <Select.Trigger
    borderColor="border-strong-01"
    bg="background"
    color="foreground"
    _hover={{ borderColor: "border-strong-02", bg: "tertiary/8" }}
    css={{
      "&:focus": {
        outline: "none !important",
        boxShadow: "none !important",
      },
      "&:focus-visible": {
        outline: "2px solid var(--chakra-colors-ring)",
        outlineOffset: "2px",
      },
    }}
  >
    <Select.ValueText placeholder="Select option" />
    <Select.Indicator />
  </Select.Trigger>
  <Select.Positioner>
    <Select.Content
      bg="muted"
      borderColor="border-subtle-02"
      color="foreground"
    >
      {collection.items.map((item) => {
        const isSelected = value.includes(item.value);
        return (
          <Select.Item
            key={item.value}
            item={item}
            bg={isSelected ? "tertiary" : undefined}
            color={isSelected ? "on-tertiary" : undefined}
            _hover={{
              bg: isSelected ? "tertiary" : "tertiary/12",
              color: isSelected ? "on-tertiary" : undefined,
            }}
          >
            {item.label}
          </Select.Item>
        );
      })}
    </Select.Content>
  </Select.Positioner>
</Select.Root>
```

**Tokens:**

- **Trigger (the button):**
    - Border: `border-strong-01` (default) → `border-strong-02` (hover), no change on focus
    - Background: `background` (default) → `tertiary/8` (hover)
    - Focus ring: `ring` (keyboard-only via CSS `:focus-visible`)
- **Content (dropdown menu):**
    - Background: `muted` (provides subtle contrast from page background)
    - Border: `border-subtle-02` (subtle border for elevated muted surfaces)
    - Text: `foreground`
- **Items (options):**
    - Selected state: `bg: "tertiary"`, `color: "on-tertiary"` (clearly marked)
    - Hover (non-selected): `bg: "tertiary/12"` (12% opacity, more visible than 8%)
    - Hover (selected): Maintains `tertiary` + `on-tertiary` (no visual change)

**Why not NativeSelect?**

- Browser `<select>` elements have limited styling capabilities
- Option hover colors can't be customized (browser defaults)
- Inconsistent appearance across browsers/OS
- Chakra's custom Select provides full token control and consistent UX

**Examples:** Sort dropdowns, filter selectors, genre pickers, year selectors

### Checkboxes

**Standard checkbox pattern:**

```tsx
<Checkbox.Root
  checked={checked}
  onCheckedChange={(details) => setChecked(!!details.checked)}
>
  <Checkbox.HiddenInput />
  <Checkbox.Control
    borderWidth="2px"
    borderColor="input"
    _checked={{ bg: "primary", borderColor: "primary" }}
  >
    <Checkbox.Indicator />
  </Checkbox.Control>
  <Checkbox.Label>Accept terms</Checkbox.Label>
</Checkbox.Root>
```

**Tokens:**

- Default border: `input`
- Checked state: `bg: "primary"`, `borderColor: "primary"`
- Indicator (checkmark): Inherits `on-primary` color from Chakra UI theme

**States:**

- **Unchecked**: Border only (`input` token)
- **Checked**: Filled background (`primary`) with checkmark (`on-primary`)
- **Hover**: Optional `_hover={{ bg: "layer-hover-01" }}` for subtle interaction feedback
- **Disabled**: Applied via `disabled` prop (opacity handled by Chakra)

**Examples:** Genre filters, multi-select forms, preference toggles

### Form Control Border Width Standards

**Industry standard border widths** (consistent across Material Design 3, IBM Carbon, GitHub Primer, and other modern
design systems):

| Component Type | Border Width | Notes |
|---------------|--------------|-------|
| **Text inputs** | 1px | Standard across all states |
| **Select** | 1px | Same as text inputs |
| **Textarea** | 1px | Same as text inputs |
| **Checkboxes** | **2px** | Thicker to differentiate from text inputs |
| **Radio buttons** | **2px** | Thicker to differentiate from text inputs |
| **Switches** | N/A | Uses background colors, no visible border |

**Why 2px for checkboxes/radios?**

- Visual differentiation from text inputs (different interaction model)
- Common pattern across design systems
- Aligns with 2px stroke width in icon sets
- Better visibility for small touch targets

**Border width by state:**

- **Default**: Use widths from table above
- **Hover**: Keep same width, may change color
- **Focus**: Keep same width, add 2px outline ring with offset (see Focus Indicators section)
- **Active/Pressed**: Keep same width
- **Disabled**: Keep same width, reduce opacity

**Critical rule:** Never increase border width on state change (causes layout shift). Use outline rings for focus instead.

### Radio Buttons

**Standard radio button pattern:**

```tsx
<RadioGroup.Root value={value} onValueChange={(e) => setValue(e.value)}>
  <VStack align="start" gap={2}>
    <RadioGroup.Item value="option1">
      <RadioGroup.ItemHiddenInput />
      <RadioGroup.ItemControl
        borderWidth="2px"
        borderColor="input"
        _checked={{ bg: "primary", borderColor: "primary" }}
      />
      <RadioGroup.ItemText>Option 1</RadioGroup.ItemText>
    </RadioGroup.Item>
    <RadioGroup.Item value="option2">
      <RadioGroup.ItemHiddenInput />
      <RadioGroup.ItemControl
        borderWidth="2px"
        borderColor="input"
        _checked={{ bg: "primary", borderColor: "primary" }}
      />
      <RadioGroup.ItemText>Option 2</RadioGroup.ItemText>
    </RadioGroup.Item>
  </VStack>
</RadioGroup.Root>
```

**Tokens:**

- Default border: `input`
- Selected state: `bg: "primary"`, `borderColor: "primary"`
- Indicator (dot): Inherits `on-primary` color from Chakra UI theme

**Pattern identical to checkboxes** - same token usage, different visual shape (circle vs square).

**Examples:** Single-choice options, filter modes, settings selections

### Switches/Toggles

**Standard switch pattern:**

```tsx
<Switch.Root
  checked={enabled}
  onCheckedChange={(e) => setEnabled(!!e.checked)}
>
  <Switch.HiddenInput />
  <Switch.Control
    bg="muted"
    _checked={{ bg: "primary" }}
  >
    <Switch.Thumb bg="background" />
  </Switch.Control>
  <Text fontSize="sm">Enable feature</Text>
</Switch.Root>
```

**Tokens:**

- **Track (off state):** `bg: "muted"` (neutral gray)
- **Track (on state):** `bg: "primary"` (brand color)
- **Thumb (slider):** `bg: "background"` (contrasts against track in both states)

**States:**

- **Off**: Track uses `muted`, thumb on left
- **On**: Track uses `primary`, thumb on right
- **Disabled**: Applied via `disabled` prop (opacity handled by Chakra)

**Visual feedback:**

- Track color change (`muted` → `primary`) signals state
- Thumb position (left/right) reinforces on/off
- Thumb always uses `background` for consistent contrast

**Examples:** Feature toggles, boolean settings, enable/disable controls

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

### Border Contrast Requirements (WCAG SC 1.4.11)

**All border colors must meet minimum contrast:**

- **Interactive element borders:** 3:1 minimum contrast ratio with adjacent backgrounds
- **Recommended:** 4.5:1 for better visibility across all conditions
- **Applies to:** Input fields, buttons, checkboxes, radio buttons, cards with borders

**Testing Example:**

```typescript
// Light mode - checking border on white background
background: '#FFFFFF' (luminance = 1.0)
border: '#D4D4D4' (luminance ≈ 0.75)
contrast = (1.0 + 0.05) / (0.75 + 0.05) = 1.31:1 ❌ FAIL

// Need darker border for compliance
border: '#767676' (luminance ≈ 0.27)
contrast = (1.0 + 0.05) / (0.27 + 0.05) = 3.28:1 ✅ PASS
```

**Tool:** Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) for validation

**Important:** Border width does NOT compensate for poor contrast. A 1px border with 4.5:1 contrast is more
accessible than a 2px border with 2:1 contrast. WCAG has no trade-off mechanism - always prioritize contrast
ratio over thickness.

**Non-interactive boundaries (cards, dividers):**

- 3:1 contrast recommended but not strictly required
- Can be more subtle since not interactive
- Use shadow as alternative if border doesn't meet contrast

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

## Common Mistakes and Anti-Patterns

Quick reference for violations found during comprehensive audit (Phase 7.1 - Nov 2025). These represent the most
common mistakes made when implementing semantic tokens.

### Incomplete Hover States

**❌ Wrong: Ghost button missing bg change**

```tsx
<Button variant="ghost" color="tertiary" _hover={{ color: "tertiary-hover" }}>
  Skip
</Button>
```

**✅ Correct: Both color AND bg change**

```tsx
<Button
  variant="ghost"
  color="tertiary"
  _hover={{
    bg: "tertiary/8",        // REQUIRED
    color: "tertiary-hover"
  }}
>
  Skip
</Button>
```

**Why it matters:** Background change provides visual feedback that the element is interactive. Text color change alone
is too subtle, especially for users with reduced contrast sensitivity.

---

**❌ Wrong: Outline button missing border/color changes**

```tsx
<Button
  variant="outline"
  borderColor="button-outline"
  _hover={{ bg: "tertiary/8" }}
>
  Cancel
</Button>
```

**✅ Correct: All three properties change**

```tsx
<Button
  variant="outline"
  borderColor="button-outline"
  color="on-button-outline"
  _hover={{
    bg: "tertiary/8",           // Background
    borderColor: "tertiary",    // Border
    color: "tertiary"           // Text
  }}
>
  Cancel
</Button>
```

**Why it matters:** The complete pattern creates a cohesive hover state where all visual elements shift to the accent
color, providing clear feedback that the button is interactive.

### React Router Link Integration

**❌ Wrong: React Router Link with inline styles**

```tsx
import { Link } from "react-router-dom";

<Link to="/movies" style={{ textDecoration: "none", color: "inherit" }}>
  Browse Movies
</Link>
```

**✅ Correct: Use TextLink component**

```tsx
import { TextLink } from "@/components/common";

<TextLink to="/movies">Browse Movies</TextLink>
```

**Why it matters:** Inline styles bypass the semantic token system entirely, creating theme inconsistencies and breaking
accessibility patterns (proper underlines, focus states).

**See also:** [React Router Integration](#react-router-integration) section for full TextLink documentation.

### Custom Focus States

**❌ Wrong: Custom boxShadow focus**

```tsx
<Input
  _focus={{
    boxShadow: "0 0 0 1px var(--chakra-colors-ring)",
    boxShadowColor: "tertiary.primary"
  }}
/>
```

**✅ Correct: Standard outline ring pattern**

```tsx
<Input
  borderColor="input"
  _focus={{
    borderColor: "tertiary",
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px"
  }}
/>
```

**Why it matters:** The standard outline ring pattern meets WCAG 2.4.13 requirements for focus indicators, provides
proper keyboard navigation feedback, and avoids layout shift (outline is outside element boundary). Custom focus
implementations often miss these requirements.

### Deprecated Token Aliases

**❌ Wrong: Old dotted aliases**

```tsx
<Text color="text.secondary">Secondary text</Text>
<Input borderColor="border.subtle" />
<Box bg="background.subItem">Hover state</Box>
```

**✅ Correct: Canonical semantic tokens**

```tsx
<Text color="on-muted">Secondary text</Text>
<Input borderColor="input" />
<Box bg="layer-hover-01">Hover state</Box>  {/* or tertiary/8 for hover */}
```

**Why it matters:** Deprecated aliases were part of ADR-011 migration (2025-11). They're maintained for backward
compatibility but represent old naming conventions. Using canonical tokens ensures code clarity and aligns with current
documentation.

**Deprecated → Canonical mappings:**

- `text.secondary` → `on-muted`
- `border.subtle` → `input` (for form controls) or `border` (for dividers)
- `background.subItem` → `layer-hover-01` (surface hover) or `tertiary/8` (opacity hover)
- `tertiary.primary` → `tertiary` (color) or `ring` (focus indicator)

### Border Token Confusion

**❌ Wrong: Using generic border for form controls**

```tsx
<Input borderColor="border" />
<Box borderColor="border">
  <Input />  {/* Form wrapper */}
</Box>
```

**✅ Correct: Use input token for form-related borders**

```tsx
<Input borderColor="input" />
<Box borderColor="input">  {/* Form wrapper */}
  <Input />
</Box>
```

**Why it matters:** Semantic distinction helps maintain consistency. Form controls and their wrappers use `input` token,
structural containers use `border-strong-*` hierarchy, decorative elements use `border`.

**Decision tree:**

- Form controls/wrappers → `input`
- Structural containers (cards, panels) → `border-strong-01/02/03` (per layer)
- Decorative/dividers → `border`

---

## Related Documentation

**For deep dives:**

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

- v2.3 (2025-11-12): Added Common Mistakes section from Phase 7.1 audit findings. Added TextLink component documentation
  for React Router integration. Enhanced ghost button hover pattern with explicit bg change requirement. Enhanced outline
  button hover pattern with all three property changes. Added border token decision tree. Updated based on 59-component
  audit (69 violations identified, zero token gaps).
- v2.2 (2025-11-12): Consolidated border system content from strategy-border-system.md (now deleted). Added: border
  width standards table, 2-tier/5-tier hierarchy explanation (ADR-008), border contrast WCAG requirements, focus
  pattern comparison (outline ring vs border width). Updated checkbox/radio examples with borderWidth="2px".
- v2.1 (2025-11-11): Alert text color pattern documented (Title: semantic color, Description: foreground on
  10-30% opacity backgrounds). Link underline thickness corrected to 1px browser default.
- v2.0 (2025-11-11): Complete rewrite - use case-driven organization, ~67 tokens, ADRs 005-012 integrated, migration
  content removed
- v1.2 (2025-11-07): Added ADR-011 on-* naming convention
- v1.1 (2025-11-03): Verified accuracy, added ADR-004 reference
- v1.0 (2025-11-02): Initial comprehensive guide

**Document Status:** Active - Post-migration reference guide (temporal migration content removed)
