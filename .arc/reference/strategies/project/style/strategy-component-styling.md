# Component Styling Strategy

**Version:** 1.0 | **Updated:** 2025-11-17 | **Status:** Active

## Purpose

Guide for building UI components in CineXplorer using Chakra UI v3 recipes, wrapper components, and semantic tokens.
Organized by component type ("what are you building?") rather than token category.

**Use this when:**

- Building a new component and need to choose correct patterns
- Implementing buttons, forms, status indicators, or interactive elements
- Understanding which recipe variant or wrapper to use
- Converting hardcoded styles to semantic patterns

**For color token reference:**

- **Color tokens**: See [Color Token System](./strategy-color-tokens.md)
- **Layout dimensions**: See [Layout Token Strategy](./strategy-layout-tokens.md)
- **Architectural decisions**: See ADRs 005-016 in `.arc/reference/adr/`

**Not covered here:**

- Token naming conventions (see Color Token System)
- Accessibility contrast requirements (see Color Token System)
- Theme implementation (see ADR-005: Unified Theme Adapter Layer)
- Adding new themes (see theme adapter files in `frontend/src/theme/color/adapters/`)

---

## Table of Contents

1. [Quick Decision Tree](#quick-decision-tree)
2. [Building Surfaces](#building-surfaces)
3. [Building Buttons](#building-buttons)
4. [Building Status Indicators](#building-status-indicators)
5. [Building Interactive Elements](#building-interactive-elements)
6. [Building Movie-Specific UI](#building-movie-specific-ui)
7. [Common Patterns](#common-patterns)
8. [Common Mistakes and Anti-Patterns](#common-mistakes-and-anti-patterns)
9. [Related Documentation](#related-documentation)

---

## Quick Decision Tree

**Start here:** What are you building?

```
What am I styling?
├─ Status/feedback indicator? → [Status Indicators](#building-status-indicators)
│  ├─ Inline feedback: Alert with status="success/warning/error/info"
│  ├─ Compact label: Badge with variant="success/warning/error/info/neutral"
│  └─ Floating notification: toaster.success/error/warning/info/loading()
│
├─ Button or action? → [Building Buttons](#building-buttons)
│  ├─ Primary action (highest emphasis): variant="solid"
│  ├─ Paired secondary action: variant="secondary"
│  ├─ Standalone utility/navigation: variant="outline"
│  ├─ Embedded control: variant="subtle"
│  └─ Dismissive action: variant="ghost"
│
├─ Surface/container? → [Building Surfaces](#building-surfaces)
│  ├─ Page background: bg="background"
│  ├─ Card/panel (1st elevation): bg="layer-01"
│  ├─ Modal/dialog (2nd elevation): bg="layer-02"
│  └─ Dropdown over modal (3rd elevation): bg="layer-03"
│
├─ Interactive text/link? → [Interactive Elements](#building-interactive-elements)
│  └─ Use TextLink component or tertiary tokens
│
├─ Form input? → [Interactive Elements](#building-interactive-elements)
│  ├─ Text input: StyledInput wrapper
│  ├─ Textarea: StyledTextarea wrapper
│  ├─ Select: Chakra Select with recipe
│  ├─ Checkbox: Chakra Checkbox with recipe
│  ├─ Radio: Chakra RadioGroup with recipe
│  └─ Switch: Chakra Switch with recipe
│
└─ Movie rating/badge? → [Movie UI](#building-movie-specific-ui)
   ├─ TMDB scores: Badge variants (success/warning/error)
   ├─ User rating stars: imdb-gold token
   └─ Genre tags: Badge variant="neutral"
```

**Still unsure?** Check the [Color Token System](./strategy-color-tokens.md) for detailed token reference.

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

| Mode      | Border Tiers          | Rationale                                                                           |
|-----------|-----------------------|-------------------------------------------------------------------------------------|
| **Light** | **2 distinct values** | Alternating layers (white ↔ gray ↔ white) - same border works on both               |
| **Dark**  | **5 distinct values** | Progressive layers (darker → lighter → lightest) - each layer needs adjusted border |

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

- `layer-hover-01` / `layer-hover-02` - Hover states (12% opacity overlay)
- `layer-selected-01` / `layer-selected-02` - Selected states (16% opacity overlay)
- `layer-active-01` / `layer-active-02` - Active/pressed states (16% opacity overlay)

**Implementation:** Uses improved opacity overlay approach (see ADR-016). Solid surfaces use 12% hover / 16% selected/active
for better visibility compared to Material Design 3's baseline 8% hover / 10% focus-press. Selected = active maintains MD3's
semantic equivalence (focus and press are identical in Material Design 3).

---

## Building Buttons

Buttons use Chakra UI v3 recipes with 5 variants, each serving distinct semantic purposes.
All interaction states (hover, active, focus) are handled automatically by the recipe system.

**Recipe reference:** `frontend/src/theme/recipes/button.ts`

### Button Variants Quick Reference

| Variant       | Emphasis   | Visual            | Use Cases                                          |
|---------------|------------|-------------------|----------------------------------------------------|
| **solid**     | Highest    | Filled background | Primary actions: "Save", "Submit", "Browse Movies" |
| **secondary** | High       | Primary text      | Secondary action in form pairs with primary        |
| **outline**   | Medium     | Grey border/text  | Standalone utility: "Back", OAuth, filters         |
| **subtle**    | Medium-Low | Muted fill        | Embedded in panels: theme selectors, sort controls |
| **ghost**     | Lowest     | Text only         | Dismissive: "Skip", "Close", "Dismiss"             |

### Solid Variant (Primary Actions)

**Use for:** The most important action on the page

```tsx
<Button variant="solid">Save Changes</Button>
```

Uses primary semantic tokens with improved interaction states for better visibility across themes (see ADR-016).

**Examples:** "Save", "Submit", "Browse Movies", "Add to Watchlist"

### Secondary Variant (Form Pairs)

**Use for:** Secondary action paired with a primary solid button

```tsx
<Button variant="secondary">Cancel</Button>
```

**Key distinction:** Uses **primary text color** to create visual relationship with paired primary button.
Hover uses stronger grey border (not primary border) to avoid too much color while maintaining the visual tie.

**Examples:** "Cancel" next to "Save", "Back" next to "Continue"

**Common mistake:** Using secondary for standalone utility actions. Use outline variant instead.

### Outline Variant (Standalone Utility)

**Use for:** Standalone utility actions, navigation, OAuth, filters

```tsx
<Button variant="outline">Back to Results</Button>
```

**Key distinction:** Uses **grey/neutral text color** for standalone actions not paired with primary button.
Hover adds primary-colored border to signal interactivity.

**Examples:** "Back to Results" (standalone), OAuth buttons (Google/GitHub), filter toggles, "Cancel" when used alone

**Critical:** Text/icons do NOT change color on hover - only background and border change. This maintains visual consistency.

### Subtle Variant (Embedded Controls)

**Use for:** Actions embedded within panels or cards

```tsx
<Button variant="subtle">Options</Button>
<Button variant="subtle" selected={isActive}>Theme</Button>
```

**Selected state:** Supports `selected` prop for toggle-style buttons. Selected buttons don't change appearance on hover.

**Examples:** Theme selector buttons, sort dropdowns, in-panel controls, active filter indicators

**Why dedicated selection tokens?** Selected state transitions from "button semantics" to "interactive surface semantics"
(layer-selected). This semantic shift requires different foreground pairing for WCAG compliance across themes.

### Ghost Variant (Dismissive Actions)

**Use for:** Low-priority or dismissive actions

```tsx
<Button variant="ghost">Skip</Button>
```

**Important:** Hover includes BOTH background change and text color change for sufficient visual feedback.

**Examples:** "Skip", "Close", "Dismiss", "Maybe Later", low-priority navigation

### Decision Tree: Which Button Variant?

```
1. Is this the main action on the page?
   └─ Yes → solid

2. Is this paired with a primary button in a form/dialog?
   └─ Yes → secondary (primary text creates visual tie)

3. Is this a standalone utility/navigation action?
   └─ Yes → outline (grey text for standalone context)

4. Is this embedded within a panel/card?
   └─ Yes → subtle (optionally with selected prop)

5. Is this a dismissive/low-priority action?
   └─ Yes → ghost
```

### Secondary vs Outline: Critical Distinction

The difference between `secondary` and `outline` is **context-based**, not just visual preference:

- **Use secondary when:** Button appears next to a primary solid button (Save + Cancel, Submit + Back)
    - Primary text color creates visual relationship between the pair
    - Signals "these two buttons are related choices"

- **Use outline when:** Button appears standalone or in groups of similar actions (Back, OAuth, filters)
    - Grey text signals independent utility action
    - No implied relationship to a primary action

**Real-world example:**

- Dialog with "Save" + "Cancel" → Use `solid` + `secondary` (paired)
- Movie detail "Back to Results" → Use `outline` (standalone)
- OAuth buttons (Google, GitHub) → Use `outline` (standalone utility group)

### Implementation Notes

All button variants use Chakra UI v3's recipe system. The recipe automatically applies interaction states
(`_hover`, `_active`, `_focusVisible`) based on variant selection - no inline styles needed.

**Recipe location:** `frontend/src/theme/recipes/button.ts`
**WCAG compliance:** Meets 2.4.7 (Focus Visible) via keyboard-only focus rings
**Interaction states:** See ADR-016 for improved contrast rationale

For implementation details and compound variant logic (selection state), see the recipe file.

---

## Building Status Indicators

Status indicators use Chakra UI v3 recipes with semantic status variants. Alerts, Badges, and Toasts provide visual
feedback for outcomes, states, and categorization.

### Alerts

Alerts use slot recipes with 4 status variants. The recipe handles all styling automatically.

```tsx
<Alert.Root status="success">
  <Alert.Indicator />
  <Alert.Title>Success</Alert.Title>
  <Alert.Description>Changes saved successfully</Alert.Description>
</Alert.Root>
```

**Available status variants:**

| Status    | Use Cases                                    | Color |
|-----------|----------------------------------------------|-------|
| `success` | Confirmations, positive feedback             | Green |
| `warning` | Validation warnings, caution states          | Amber |
| `error`   | Errors, critical alerts                      | Red   |
| `info`    | Informational messages, tips, neutral status | Blue  |

**What the recipe provides:**

- Subtle opacity backgrounds (10%) with semantic borders
- Icon and title with semantic color for emphasis
- Description with foreground color for readability on subtle backgrounds
- Consistent spacing and layout

**Recipe reference:** `frontend/src/theme/recipes/alert.ts`

### Badges

Badges use recipes with 5 variants for status and categorization.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="neutral">Genre: Action</Badge>
```

**Available variants:**

| Variant   | Use Cases                                        | Color |
|-----------|--------------------------------------------------|-------|
| `success` | Positive status, active states                   | Green |
| `warning` | Caution states, pending status                   | Amber |
| `error`   | Danger, deleted, error states                    | Red   |
| `info`    | Informational, new items, neutral status         | Blue  |
| `neutral` | Genre tags, content ratings, non-semantic labels | Grey  |

**What the recipe provides:**

- Solid backgrounds with high-contrast text (uses `on-*` color pairs)
- Consistent sizing and padding
- Semantic color mappings

**Recipe reference:** `frontend/src/theme/recipes/badge.ts`

### Toasts

Toasts provide temporary, non-blocking feedback for user actions and system events. Unlike inline Alerts,
toasts overlay UI content and use solid backgrounds with colored left accent borders for readability.

```tsx
import { toaster, priorityToaster } from "@/components/core/chakra/toaster";

// Default toaster (bottom-right) - routine feedback
toaster.success({ title: "Changes saved", description: "Your settings have been updated." });
toaster.error({ title: "Save failed", description: "Please try again.", closable: true });
toaster.warning({ title: "Missing fields", description: "Please complete all required fields." });
toaster.info({ title: "New feature", description: "Check out our new search filters." });
toaster.loading({ title: "Saving...", description: "Please wait." });

// Priority toaster (top-right) - important notifications
priorityToaster.success({ title: "Welcome back, John!", duration: 4000 });
priorityToaster.loading({ id: "login", title: "Logging in..." });
priorityToaster.dismiss("login"); // Dismiss by ID

// Toast with action (e.g., undo)
toaster.success({
  title: "Removed from watchlist",
  action: { label: "Undo", onClick: () => handleUndo() },
});
```

**Toast positioning:**

| Toaster           | Position     | Use Cases                                                |
|-------------------|--------------|----------------------------------------------------------|
| `toaster`         | bottom-right | Routine feedback (save, update, background actions)      |
| `priorityToaster` | top-right    | Auth success, important confirmations, critical feedback |

**When to use priority position:**

- Auth flow toasts (login success, registration, email verified)
- Critical action confirmations (account changes, destructive actions)
- Time-sensitive notifications that warrant immediate attention

**Available status types:**

| Type      | Use Cases                                  | Accent |
|-----------|--------------------------------------------|--------|
| `success` | Confirmations, completed actions           | Green  |
| `warning` | Validation warnings, caution states        | Amber  |
| `error`   | Errors, failed operations (closable: true) | Red    |
| `info`    | Informational messages, tips               | Blue   |
| `loading` | Async operations in progress               | Blue   |

**What the composition provides:**

- Solid layer background (`layer-03`) for visibility above all content including modals
- Colored left accent border (4px) for status indication
- Title with semantic color for emphasis
- Description with foreground color for readability
- Action trigger with tertiary styling for undo/retry actions
- Close trigger with muted styling and hover state
- Shadow elevation (`shadow-md`) for floating appearance

**Duration by type (enforced by composition):**

- Success: 4 seconds (quick confirmation)
- Info: 5 seconds (time to read)
- Warning: 6 seconds (needs attention)
- Error: 8 seconds or closable (critical, needs action)
- Loading: Persists until dismissed programmatically

Durations are applied automatically by the toaster wrapper - call sites don't need to specify duration unless
overriding the default. Override with explicit `duration` prop when needed (e.g., actionable toasts may need
longer visibility).

**Composition reference:** `frontend/src/components/core/chakra/toaster.tsx`

### Key Distinction: Alert vs Badge vs Toast

| Component | Background               | Status Indication  | Text Colors                              |
|-----------|--------------------------|--------------------|------------------------------------------|
| Alert     | 10% opacity tint         | Full border + icon | Title: semantic, Description: foreground |
| Badge     | Solid semantic fill      | Background color   | `on-*` tokens (high contrast)            |
| Toast     | Solid layer (`layer-03`) | Left accent border | Title: semantic, Description: foreground |

**Why toasts differ from alerts:** Alerts are inline and don't overlap content, so subtle tints work well.
Toasts float over varied backgrounds and need solid fills for consistent readability.

### When to Use: Alert vs Toast

| Scenario                                    | Use                  | Status  | Rationale                                                |
|---------------------------------------------|----------------------|---------|----------------------------------------------------------|
| Success after action (save, submit)         | Toast                | success | Ephemeral confirmation, user continues workflow          |
| Success that redirects away                 | Toast                | success | Page is changing anyway                                  |
| Auth error (wrong credentials)              | Alert (blocking)     | error   | User needs to read and correct their input               |
| Email verification needed                   | Alert with action    | info    | Workflow requirement, not user mistake; resend action    |
| Session expired                             | Alert (blocking)     | info    | Expected behavior, not error; redirect to login          |
| Registration success with CTA               | Alert (non-blocking) | success | Persistent "check email" message, user may look away     |
| Network/transient error                     | Toast                | error   | Retry is immediate, no correction needed                 |
| Blocking state (rate limited, locked)       | Alert (blocking)     | warning | User must wait/address before proceeding                 |
| Page-level warning (unsaved changes)        | Alert (blocking)     | warning | Contextual to current page state                         |
| Informational banner (maintenance, feature) | Alert (blocking)     | info    | Persistent awareness needed                              |

**General principles:**

- **Toasts** = Ephemeral, non-blocking, auto-dismiss, feedback on completed actions
- **Alerts** = Persistent, contextual, requires user awareness/action

**Alert status selection:**

- `error` (red) = User made a mistake that needs correction (wrong input, invalid action)
- `warning` (yellow) = User action is blocked by external factor (rate limit, locked)
- `info` (blue) = Workflow requirement or expected state (verification needed, session expired)
- `success` (green) = Positive outcome with persistent CTA (registration success)

### Alert Positioning Hierarchy

Alerts support two positions via `FloatingAlertContainer`:

| Position    | Visual Location | Blocking? | Use Cases                                         |
|-------------|-----------------|-----------|---------------------------------------------------|
| `center`    | Top-center      | Yes       | Auth errors, verification needed, blocking states |
| `top-right` | Top-right       | No        | Registration success CTA, informational CTAs      |

**Code example:**

```tsx
// Blocking alert (center, default) - demands immediate attention
<FloatingAlertContainer>
  <FloatingAlert status="error" onDismiss={...}>
    Invalid username or password.
  </FloatingAlert>
</FloatingAlertContainer>

// Non-blocking alert (top-right) - persistent but doesn't block workflow
<FloatingAlertContainer position="top-right">
  <FloatingAlert status="success" onDismiss={...}>
    Account created! Check your email to verify.
  </FloatingAlert>
</FloatingAlertContainer>
```

**Why non-blocking alerts exist:**
Registration success needs persistence (user may look away during redirect) but shouldn't block the login form.
Non-blocking alerts share top-right space with priority toasts - both are "important but not stopping you".

**Auth-specific guidance:**

- Auth errors use `FloatingAlert` with center position (blocking)
- WCAG: `role="alert"`, `aria-live="assertive"` for errors, dismissible via close button
- Auto-clear when user starts typing (correcting the error)
- Login/email verified success uses toasts (ephemeral, page context is clear)
- Registration success uses non-blocking alert (persistent CTA, user may look away)

**Edge cases:**

- Actionable toasts (with action buttons) blur the line - use longer duration or `closable: true`
- If user needs to reference the message while fixing something, prefer Alert

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

**Focus indicators vary by component type** (per ADR-015):

**Text Inputs (Input, Textarea, NumberInput): Border-only**

```tsx
<Input
  borderColor="border-strong-01"
  css={{
    "&:hover:not(:focus)": {
      borderColor: "var(--chakra-colors-border-strong-02)"
    },
    "&:focus": {
      borderColor: "var(--chakra-colors-tertiary)"
    }
  }}
/>
```

- **No outline ring** - Border color change to `tertiary` is sufficient
- Matches industry patterns (GitHub, Google, Linear)
- Meets WCAG 2.4.7 and 2.4.13 requirements

**Buttons, Links: Keyboard-only outline rings**

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

- **Outline ring appears only for keyboard focus** (Tab key), not mouse clicks
- CSS `:focus-visible` handles this automatically for action/button-like components

**Token:**

- `ring` - Focus ring color (maps to `tertiary` in all themes for visual consistency)

**Rules:**

- **Text inputs and Select.Trigger:** Use border color change only (no outline ring)
- **Buttons and action elements:** Use `_focusVisible` for keyboard-only outline rings
- Always use `ring` token (not custom colors) for outline rings
- Minimum 2px outline width with 2px offset

**WCAG Compliance:**

- **WCAG 2.4.7 (Focus Visible - Level AA):** All components have visible focus indicators
- **WCAG 2.4.13 (Focus Appearance - Level AAA):** Focus changes have ≥3:1 contrast, 2px minimum thickness

**See also:** ADR-015 (Use Border-Only Focus Indicators for Text Inputs)

### Form Inputs

Use `StyledInput` and `StyledTextarea` wrapper components for text inputs with automatic border-only focus indicators.

```tsx
import { StyledInput, StyledTextarea } from "@/components/common";

<StyledInput placeholder="Email address" />
<StyledTextarea placeholder="Enter description..." />
```

**Layer prop for context-appropriate borders:**

```tsx
// Forms on layer-01 or background (default)
<StyledInput layer="01" />

// Forms on layer-02 (darker cards/panels)
<StyledInput layer="02" />
```

The `layer` prop adjusts border strength to maintain visibility against different background layers.

**What the wrapper provides:**

- Border-only focus indicators (no outline rings)
- Hover state with background tint (consistent with button patterns)
- Layer-aware border hierarchy (01/02 for lighter backgrounds, 02/03 for darker)
- All interaction states handled automatically

**Why wrappers instead of recipes?** Text input patterns require `:hover:not(:focus)` pseudo-selectors that Chakra UI v3
recipes cannot express.

**WCAG compliance:** Meets 2.4.7 (Focus Visible) and 2.4.13 (Focus Appearance) via border color change (see ADR-015)
**See also:** `.arc/reference/adr/adr-015-use-border-only-focus-indicators-for-text-inputs.md`

### Select/Dropdown

Select components use Chakra UI v3 recipes. The recipe handles all styling automatically - just use the standard
Chakra Select component structure.

```tsx
<Select.Root collection={selectCollection} value={value} onValueChange={onChange}>
  <Select.Trigger>
    <Select.ValueText placeholder="Select option" />
    <Select.Indicator />
  </Select.Trigger>
  <Select.Positioner>
    <Select.Content>
      {collection.items.map((item) => (
        <Select.Item key={item.value} item={item}>
          {item.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select.Positioner>
</Select.Root>
```

**What the recipe provides:**

- Trigger hover/focus states (border upgrade, background tint, keyboard-only focus ring)
- Content styling (muted background, elevated with subtle border)
- Item hover states (background tint for non-selected items)

**Selected item state (recipe limitation):**

The recipe cannot determine which item is currently selected, so you must add runtime conditionals:

```tsx
<Select.Item
  key={item.value}
  item={item}
  bg={isSelected ? "tertiary" : undefined}
  color={isSelected ? "on-tertiary" : "foreground"}
  _hover={{
    bg: isSelected ? "tertiary" : "tertiary/12",
    color: isSelected ? "on-tertiary" : "foreground",
  }}
>
  {item.label}
</Select.Item>
```

**Focus indicator pattern:** Select.Trigger uses **border-only focus** (like text inputs, not outline rings like buttons)
because Select.Trigger is semantically a form control (choose a value) not an action button. CSS `:focus-visible` correctly
matches only keyboard focus (Tab key), not mouse clicks - no JavaScript workarounds needed. The recipe suppresses outline
rings and uses border color change to `tertiary` for focus indication.

**Why custom Select (not NativeSelect)?** Browser `<select>` elements have limited styling - option colors can't be
customized and appearance varies across browsers.

**WCAG compliance:** Meets 2.4.7 (Focus Visible) via border-only focus (see ADR-015)
**Recipe reference:** `frontend/src/theme/recipes/select.ts`

### Checkboxes

Checkboxes use Chakra UI v3 recipes. The recipe handles all styling automatically.

```tsx
<Checkbox.Root checked={checked} onCheckedChange={(details) => setChecked(!!details.checked)}>
  <Checkbox.HiddenInput />
  <Checkbox.Control>
    <Checkbox.Indicator />
  </Checkbox.Control>
  <Checkbox.Label>Accept terms</Checkbox.Label>
</Checkbox.Root>
```

**What the recipe provides:**

- 2px borders (differentiates from text inputs which use 1px)
- Primary background and border when checked
- Checkmark indicator with high-contrast color
- Hover states (border upgrade + subtle background tint)
- Focus ring (keyboard-only, 2px outline)

**Why 2px borders?** Visual differentiation from text inputs (different interaction model), common pattern across
design systems, better visibility for small touch targets.

**Examples:** Genre filters, multi-select forms, preference toggles

**Recipe reference:** `frontend/src/theme/recipes/checkbox.ts`

### Form Control Border Width Standards

**Industry standard border widths** (consistent across Material Design 3, IBM Carbon, GitHub Primer, and other modern
design systems):

| Component Type    | Border Width | Notes                                     |
|-------------------|--------------|-------------------------------------------|
| **Text inputs**   | 1px          | Standard across all states                |
| **Select**        | 1px          | Same as text inputs                       |
| **Textarea**      | 1px          | Same as text inputs                       |
| **Checkboxes**    | **2px**      | Thicker to differentiate from text inputs |
| **Radio buttons** | **2px**      | Thicker to differentiate from text inputs |
| **Switches**      | N/A          | Uses background colors, no visible border |

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

Radio buttons use Chakra UI v3 recipes. The recipe handles all styling automatically.

```tsx
<RadioGroup.Root value={value} onValueChange={(e) => setValue(e.value)}>
  <VStack align="start" gap={2}>
    <RadioGroup.Item value="option1">
      <RadioGroup.ItemHiddenInput />
      <RadioGroup.ItemControl>
        <RadioGroup.ItemIndicator />
      </RadioGroup.ItemControl>
      <RadioGroup.ItemText>Option 1</RadioGroup.ItemText>
    </RadioGroup.Item>
    <RadioGroup.Item value="option2">
      <RadioGroup.ItemHiddenInput />
      <RadioGroup.ItemControl>
        <RadioGroup.ItemIndicator />
      </RadioGroup.ItemControl>
      <RadioGroup.ItemText>Option 2</RadioGroup.ItemText>
    </RadioGroup.Item>
  </VStack>
</RadioGroup.Root>
```

**What the recipe provides:**

- 2px borders (identical to checkboxes - differentiates from text inputs)
- Primary background and border when selected
- Inner dot indicator with high-contrast color (50% sizing for visibility)
- Hover states (border upgrade + subtle background tint)
- Focus ring (keyboard-only, 2px outline)

**Critical:** Must include `<RadioGroup.ItemIndicator />` as child of `ItemControl` for the dot to render when selected.

**Examples:** Single-choice options, filter modes, settings selections

**Recipe reference:** `frontend/src/theme/recipes/radio.ts`

### Switches/Toggles

Switches use Chakra UI v3 recipes. The recipe handles all styling automatically.

```tsx
<Switch.Root checked={enabled} onCheckedChange={(e) => setEnabled(!!e.checked)}>
  <Switch.HiddenInput />
  <Switch.Control>
    <Switch.Thumb />
  </Switch.Control>
  <Text fontSize="sm">Enable feature</Text>
</Switch.Root>
```

**What the recipe provides:**

- Track (control) background: Secondary when off, primary when on (uses secondary instead of muted for better disabled visibility)
- Thumb background: Consistent background color (contrasts with track in both states)
- Thumb position animation (left/right reinforces on/off state)
- Focus ring (keyboard-only, 2px outline)
- No visible borders (relies on background color contrast)

**Visual feedback:** Track color change (secondary → primary) signals state transition, thumb position reinforces the change.

**Examples:** Feature toggles, boolean settings, enable/disable controls

**Recipe reference:** `frontend/src/theme/recipes/switch.ts`

---

## Building Movie-Specific UI

CineXplorer extends the base semantic token system with movie app-specific tokens.

### Movie Ratings

**TMDB Community Scores (threshold-based traffic-light colors):**

```tsx
// TMDB scores use status colors based on thresholds (0-10 scale)
// ≥7.5: success (green), 5.0-7.4: warning (yellow), <5.0: error (red)
// User-rating badges (1-10) use the same variants: ≥8 success, 5-7 warning, <5 error

// High rating (≥7.5)
<Badge variant="success">8.2</Badge>

// Medium rating (5.0-7.4)
<Badge variant="warning">6.5</Badge>

// Low rating (<5.0)
<Badge variant="error">4.1</Badge>
```

**Tokens:** Uses Badge recipe with status variants (`success`, `warning`, `error`)

**Use cases:** TMDB community scores, aggregated ratings from external sources

**User Personal Ratings (5-star system with IMDb gold):**

```tsx
// User ratings use star icons (★) colored with imdb-gold token
<Text color="imdb-gold" fontSize="xl">★★★★☆</Text>
```

**Tokens:** `imdb-gold` (icon color only, not a background token)

**Use cases:** User's personal 5-star ratings on movie cards

### Genre Tags and Badges

**Neutral badges for categorization:**

```tsx
<HStack>
  <Badge variant="neutral">Action</Badge>
  <Badge variant="neutral">Sci-Fi</Badge>
  <Badge variant="neutral">PG-13</Badge>
</HStack>
```

**Tokens:** Uses Badge recipe with `neutral` variant (recipe handles `badge` / `on-badge` tokens automatically)

**Use cases:** Genre tags, content ratings, non-semantic labels

**Distinction:**

- `neutral` variant - Neutral categorization (genre, rating)
- Status variants - Semantic feedback (success, warning, error)

### Drag and Drop Interactions

**For watchlist reordering, favorites management:**

```tsx
// Item being actively dragged
<Card
  bg={isDragging ? "drag-active" : "layer-01"}
  color={isDragging ? "on-secondary" : "foreground"}
  borderWidth="2px"
  borderStyle="dashed"
  borderColor={isDragging ? "info" : "border-strong-01"}
  opacity={isDragging ? 0.9 : 1}
  cursor="move"
>
  Draggable movie card
</Card>

// Valid drop target
<Box
  bg={isValidDropTarget ? "drop-zone" : "layer-01"}
  color="foreground"
  borderWidth="2px"
  borderStyle="dashed"
  borderColor={isValidDropTarget ? "success" : "border-strong-01"}
>
  Drop movies here
</Box>
```

**Tokens:**

- **drag-active** (background: secondaryHover) + **on-secondary** (text)
    - Item being actively dragged - uses secondaryHover background with on-secondary text
    - Paired with info dashed border for visual distinction
- **drop-zone** (background: muted) + **foreground** (text)
    - Valid drop target - uses muted background with foreground text
    - Paired with success dashed border to indicate valid drop zone

**Use cases:** Watchlist reordering, favorites organization, drag-and-drop interactions

**Pattern verified:** ThemeDebug CineXplorerExtensionsSection

---

## Common Patterns

Reusable patterns for interaction states, opacity overlays, and responsive design.

### Interaction State Philosophy

CineXplorer uses **Material Design 3's opacity overlay approach** for all interaction states (ADR-009, improved in ADR-016).

**Key principle:** Use opacity overlays, not color changes.

**Opacity values:**

- **MD3 baseline**: 8% hover / 10% focus / 10% press (still used for secondary, outline, ghost buttons as 8%/12%)
- **Improved for solids**: 12% hover / 16% selected / 16% active (solid buttons, layer surfaces - better UX per ADR-016)

**Note:** MD3 treats focus and press identically (both 10%). We maintain this equivalence - selected and active both
use 16%.

**Benefits:**

- Consistent across themes
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
- Hover: `layer-hover-01` (12% foreground opacity overlay)
- Active: `layer-active-01` (16% foreground opacity overlay)

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

**Opacity values (MD3 baseline + ADR-016 improvements):**

| State          | Opacity | Token Usage (Solid Surfaces)        | Manual Overlay (Baseline) |
|----------------|---------|-------------------------------------|---------------------------|
| Hover          | 12%     | `layer-hover-01`, `primary-hover`   | `bg="primary/8"`          |
| Selected       | 16%     | `layer-selected-01`                 | `bg="foreground/16"`      |
| Pressed/Active | 16%     | `layer-active-01`, `primary-active` | `bg="primary/12"`         |
| Focus          | N/A     | N/A (use ring token for outlines)   | -                         |
| Drag           | TBD     | `drag-active` (uses secondaryHover) | `bg="foreground/16"`      |
| Disabled       | 60%     | N/A                                 | `opacity={0.6}`           |

**Note:** Solid surfaces (semantic tokens) use improved 12% hover / 16% selected/active for better contrast (ADR-016).
Disabled opacity is 60% for most form controls (checkbox, switch); radio uses 0.38 for subtle visual reasons.
Selected = active maintains MD3's semantic equivalence (focus and press are identical). Manual overlays use MD3 baseline
8%/12% (secondary/outline/ghost button variants). Drag state may be implemented as dedicated 20% overlay in future when
building actual drag-drop features (currently reuses secondaryHover mapping).

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

## Common Mistakes and Anti-Patterns

Quick reference for violations found during comprehensive audit (Phase 7.1 - Nov 2025). These represent the most
common mistakes made when implementing semantic tokens.

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

**❌ Wrong: Inline focus styling**

```tsx
<Input
  _focus={{
    borderColor: "tertiary",
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px"
  }}
/>
```

**✅ Correct: Use StyledInput wrapper**

```tsx
import { StyledInput } from "@/components/common";

<StyledInput placeholder="Email" />
```

**Why it matters:** StyledInput encapsulates ADR-015 border-only focus pattern and ensures consistent focus behavior
across all form inputs. Inline focus styling bypasses centralized implementation and risks inconsistency.

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
<Input borderColor="border-strong-01" />  {/* On layer-01 */}
<Box bg="layer-hover-01">Hover state</Box>  {/* or tertiary/8 for hover */}
```

**Why it matters:** Deprecated aliases were part of ADR-011 migration (2025-11). They're maintained for backward
compatibility but represent old naming conventions. Using canonical tokens ensures code clarity and aligns with current
documentation.

**Deprecated → Canonical mappings:**

- `text.secondary` → `on-muted`
- `border.subtle` → `border-strong-01` (for form controls on layer-01) or `border-subtle-01` (for decorative dividers)
- `background.subItem` → `layer-hover-01` (surface hover) or `tertiary/8` (opacity hover)
- `tertiary.primary` → `tertiary` (color) or `ring` (focus indicator)

### Recipe Override Behavior (Chakra v3)

**Principle:** In Chakra v3, adding inline style props to slot components overrides recipe pseudo-selectors.

**❌ Wrong: Inline props without pseudo-selectors**

```tsx
// Recipe provides _focusVisible, but inline props block it
<Select.Trigger
  w="200px"
  fontSize="14px"
  borderColor="border-strong-01"
>
  <Select.ValueText />
</Select.Trigger>
// Result: No focus indicator on keyboard focus!
```

**✅ Correct: Include pseudo-selectors when using inline props**

```tsx
<Select.Trigger
  w="200px"
  fontSize="14px"
  borderColor="border-strong-01"
  _hover={{ borderColor: "border-strong-02", bg: "tertiary/8" }}
  _focusVisible={{ borderColor: "tertiary", outline: "none" }}
>
  <Select.ValueText />
</Select.Trigger>
```

**Or: Use no inline props to get full recipe styling**

```tsx
// Recipe provides all states automatically
<Select.Trigger>
  <Select.ValueText />
</Select.Trigger>
```

**Why this happens:** Chakra v3's slot recipe system applies base styles and pseudo-selectors as a unit. When you add
inline style props, they take precedence and the recipe's pseudo-selectors (`_hover`, `_focusVisible`, `_active`, etc.)
are not inherited.

**Affected components:** Any slot-based component using recipes:

- `Select.Trigger`, `Select.Content`, `Select.Item`
- `Checkbox.Control`
- `RadioGroup.ItemControl`
- `Switch.Control`
- Other slot components

**Rule of thumb:** If you add ANY inline style props to a slot component, you must also add all pseudo-selectors you
need. Check the recipe file for the states you need to replicate.

### Layer-Aware Border Tokens

**Principle:** Forms and structural borders match their background layer for proper visual hierarchy.

**❌ Wrong: Using generic tokens without layer context**

```tsx
<Input borderColor="input" />  {/* Generic, doesn't exist */}
<Input />  {/* No explicit border, relies on default which may not be visible */}
```

**✅ Correct: Use layer-appropriate border-strong tokens**

```tsx
{/* Forms on layer-01 background */}
<Box bg="layer-01">
  <Input borderColor="border-strong-01" />
  <Checkbox borderColor="border-strong-01" />
</Box>

{/* Forms on layer-02 background */}
<Box bg="layer-02">
  <Input borderColor="border-strong-02" />
  <Select.Trigger borderColor="border-strong-02" />
</Box>

{/* Interactive controls (buttons) */}
<Button variant="outline" borderColor="button-outline" />
```

**Why it matters:** Layer-aware borders create visual cohesion. Forms visually belong to their background surface, with
borders that provide appropriate contrast for their specific layer. Generic tokens without layer context
don't exist in the UnifiedTheme interface and should be avoided.

**Border Token Decision Tree:**

- **Form controls** (Input, Checkbox, Select, etc.) → `border-strong-01` (on layer-01) or `border-strong-02` (on layer-02)
- **Structural containers** (cards, panels, sidebars) → `border-strong-01/02/03` (match surface layer)
- **Interactive controls** (outline buttons) → `button-outline`
- **Decorative dividers** (separators, horizontal rules) → `border-subtle-01` (layer-01) or `border-subtle-02` (layer-02)

**Border hierarchy for forms on layer-01:**

- **Default:** `border-strong-01` (base form border)
- **Hover:** `border-strong-02` (increased emphasis)
- **Focus:** `tertiary` (accent color for active state)

---

## Related Documentation

**For color token reference:**

- [Color Token System](./strategy-color-tokens.md) - Token naming, accessibility standards, token architecture
- [Layout Token Strategy](./strategy-layout-tokens.md) - Structural dimensions, z-index

**For recipe implementation:**

- `frontend/src/theme/recipes/button.ts` - Button variants and interaction states
- `frontend/src/theme/recipes/alert.ts` - Alert status indicators
- `frontend/src/theme/recipes/badge.ts` - Badge variants
- `frontend/src/theme/recipes/select.ts` - Select dropdown styling
- `frontend/src/theme/recipes/checkbox.ts` - Checkbox styling
- `frontend/src/theme/recipes/radio.ts` - Radio button styling
- `frontend/src/theme/recipes/switch.ts` - Switch/toggle styling

**For wrapper components:**

- `frontend/src/components/common/StyledInput.tsx` - Text input wrapper
- `frontend/src/components/common/StyledTextarea.tsx` - Textarea wrapper
- `frontend/src/components/common/TextLink.tsx` - React Router link wrapper

**For architectural context:**

- ADR-005: Unified Theme Adapter Layer (adapter architecture)
- ADR-006: Adopt Carbon Layer Elevation Standard (layer system)
- ADR-008: Adopt Carbon Light Alternating Layers (light mode pattern)
- ADR-009: Use Material Design Opacity Overlays (interaction states)
- ADR-012: Separate Button Pattern Semantics (button helper tokens)
- ADR-015: Use Border-Only Focus Indicators for Text Inputs
- ADR-016: Improve Interaction State Contrast (12%/16% opacity values)

**For implementation:**

- `frontend/src/theme/color/types.ts` - UnifiedTheme interface (source of truth)
- `frontend/src/theme/color/adapters/*.ts` - Theme adapter implementations
- `/theme-debug` page - Visual validation of all themes and tokens

---

**Version History:**

- v1.0 (2025-11-17): Initial split from strategy-semantic-tokens.md v2.2. Focused on component building patterns,
  recipes, and wrappers. Color token reference, accessibility standards, and developer quick reference moved to
  strategy-color-tokens.md.
