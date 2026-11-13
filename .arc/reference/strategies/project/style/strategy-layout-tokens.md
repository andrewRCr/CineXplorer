# Layout Token Strategy

**Version:** 1.0 | **Created:** 2025-11-06 | **Status:** Active

## Purpose

Comprehensive guide for CineXplorer's layout token system, covering foundation tokens, semantic tokens,
z-index hierarchy, and responsive patterns.

**Use this when:**

- Deciding whether to use layout tokens vs Chakra spacing scale
- Implementing responsive layouts (show/hide, alternate content)
- Accessing layout values in components (props vs CSS variables vs hooks)
- Understanding z-index hierarchy and preventing conflicts
- Debugging layout issues using LayoutDebug page

**For color tokens**, see [Color Token System](./strategy-color-tokens.md) and [Component Styling Strategy](./strategy-component-styling.md).

**For architectural decision context**, see [ADR-007: Use Chakra Theme Tokens for Layout Constants](../../../adr/adr-007-use-chakra-theme-tokens-for-layout.md).

## Table of Contents

1. [Token System Architecture](#token-system-architecture)
2. [When to Use Layout Tokens](#when-to-use-layout-tokens)
3. [Token Access Patterns](#token-access-patterns)
4. [Responsive Patterns](#responsive-patterns)
5. [Z-Index Hierarchy](#z-index-hierarchy)
6. [Migration Examples](#migration-examples)
7. [LayoutDebug Page Usage](#layoutdebug-page-usage)
8. [Developer Quick Reference](#developer-quick-reference)

---

## Token System Architecture

CineXplorer's layout token system has three layers, all defined in `frontend/src/theme/layout/`:

### Layer 1: Foundation Tokens (`foundations.ts`)

Base values for layout dimensions. Non-responsive, single source of truth.

```typescript
export const layoutFoundations = {
  sizes: {
    "footer-height": { value: "64px" },          // Approximate
  },
};
```

**Purpose:** Define actual pixel values once, reference everywhere.

### Layer 2: Semantic Tokens (`semantic-tokens.ts`)

Semantic dimensions identify a structural role. The one-row bar is 65px, including its border, at every
breakpoint; the footer references its approximate foundation height.

```typescript
export const layoutSemanticTokens = {
  sizes: {
    "layout-navbar": { value: "65px" },
    "layout-footer": {
      value: "{sizes.footer-height}",            // Same all breakpoints
    },
  },
};
```

**Purpose:** Share structural dimensions across components, using foundation references where appropriate.

### Layer 3: Z-Index Scale (`z-index.ts`)

Semantic stacking hierarchy prevents z-index conflicts.

```typescript
export const zIndexScale = {
  base: 1,             // Content
  "theme-debug": 5,
  "layout-debug": 5,
  footer: 6,
  navbar: 10,
  dropdown: 9999,
};
```

**Purpose:** Consistent stacking order across all components.

**Usage:**

```tsx
<Box zIndex="navbar">NavBar content</Box>
<Box zIndex="dropdown">Dropdown menu</Box>
```

---

## When to Use Layout Tokens

### Decision Tree

```
Need a dimension value?
├─ Is it for major layout structure? (navbar, content, footer)
│  └─ ✅ Use layout token: height="layout-navbar"
│
├─ Is it for component spacing/padding?
│  └─ ❌ Use Chakra spacing scale: p={4}, gap={6}
│
├─ Is it for z-index stacking?
│  └─ ✅ Use z-index token: zIndex="navbar"
│
└─ Is it for content dimensions?
   └─ ❌ Use Chakra sizes or custom values
```

### Layout Tokens (Use When...)

✅ **Major structural elements:**

- NavBar height
- Footer height
- Sticky header offsets

✅ **Values that must be consistent across components:**

- Multiple components reference navbar height for sticky positioning
- The bar and sticky controls use the same navbar height

The bar uses one `layout-navbar` value (65px). Below `lg` (1024px), its phone row holds a menu drawer and a search
button; at `lg` and wider, the wide row shows the main links and search field directly. The content uses the full
container width at every breakpoint.

### Chakra Spacing Scale (Use When...)

❌ **Generic spacing/padding:**

```tsx
<Box p={4} />        // ✅ Use Chakra scale
<Box gap={6} />      // ✅ Use Chakra scale
<Box mb={8} />       // ✅ Use Chakra scale
```

❌ **Component-specific dimensions:**

```tsx
<Card maxW="400px" />           // ✅ Direct value
<Image boxSize="48px" />        // ✅ Direct value
<Button size="sm" />            // ✅ Chakra component size
```

---

## Token Access Patterns

There are three ways to access layout tokens. Choose based on context:

### Pattern 1: Chakra Props (Most Common)

**Use when:** Setting dimensions on Chakra components.

```tsx
// Layout dimensions
<Box height="layout-navbar" />

// Z-index
<Box zIndex="navbar" />

// The bar has one height at every width
<Box height="layout-navbar" />
```

**Pros:** Type-safe, intellisense support, cleaner syntax
**Cons:** Only works with Chakra components

### Pattern 2: CSS Variables (For Calculations)

**Use when:** Need to reference in CSS calculations or non-Chakra contexts.

```tsx
// Sticky positioning offset
<Box
  position="sticky"
  top="var(--chakra-sizes-layout-navbar)"
  style={{ willChange: 'transform' }}
/>

// CSS calc() expressions
<Box
  height="calc(100vh - var(--chakra-sizes-layout-navbar) - var(--chakra-sizes-layout-footer))"
/>
```

**Pros:** Works anywhere CSS works, enables calculations
**Cons:** No type safety, verbose syntax

### Pattern 3: useToken Hook (For JavaScript Logic)

**Use when:** Need computed pixel values in JavaScript.

```tsx
import { useToken } from "@chakra-ui/react";

const [navbarHeight, footerHeight] = useToken("sizes", [
  "layout-navbar", "layout-footer",
]);
const contentHeight = `calc(100vh - ${navbarHeight} - ${footerHeight})`;
```

**Pros:** Get actual computed values, useful for calculations
**Cons:** Only works in React components, returns CSS variable references (use `getComputedStyle` for resolved values)

---

## Responsive Patterns

### The Problem with JavaScript Hooks

**Anti-pattern (causes content flash):**

```tsx
// ❌ Avoid: useBreakpointValue for show/hide
const isMobile = useBreakpointValue(
  { base: true, lg: false },
  { ssr: false }
) ?? true;

return isMobile ? <MobileView /> : <DesktopView />;
```

**Why this is bad:**

- JavaScript must execute before correct layout shows
- Brief flash of fallback value (`?? true`) before recalculating
- Not SSR-safe (hence `{ ssr: false }` flag)
- Unnecessary React re-renders on breakpoint changes

### Pattern 1: Show/Hide with CSS Display Props

**Best practice (flash-free):**

```tsx
// ✅ CSS-native responsive visibility
<Box display={{ base: 'none', lg: 'block' }}>
  Desktop Content
</Box>
```

**Real example from NavBar:**

```tsx
<Box display={{ base: "none", lg: "block" }} h="100%">
  <WideNavBar />
</Box>
```

**Benefits:**

- Browser evaluates media queries natively (instant, no flash)
- No JavaScript execution required
- No React re-renders on resize
- SSR-safe (renders correctly on server and client)

### Pattern 2: Alternate Content

**Show different content per breakpoint:**

```tsx
// ✅ Two components with opposing display props
<>
  {/* Mobile Layout */}
  <HStack display={{ base: 'flex', lg: 'none' }}>
    <HamburgerIcon />
    <Logo />
    <UserMenu />
  </HStack>

  {/* Desktop Layout */}
  <HStack display={{ base: 'none', lg: 'flex' }}>
    <Logo />
    <SearchBar />
    <UserMenu />
  </HStack>
</>
```

**Real example from NavBar:**

```tsx
// Both rows share one breakpoint and the same bar height.
<Box display={{ base: "block", lg: "none" }} h="100%"><PhoneNavBar /></Box>
<Box display={{ base: "none", lg: "block" }} h="100%"><WideNavBar /></Box>
```

### Pattern 3: Responsive Props

**Single component with responsive values:**

```tsx
// ✅ No hooks needed
<Box
  width={{ base: "100%", lg: "280px" }}
  pb={{ base: 2, lg: 0 }}
  fontSize={{ base: "sm", lg: "md" }}
/>
```

### When useBreakpointValue IS Acceptable

Use it for interaction behavior that depends on a breakpoint, rather than for visibility. The bar's two row wrappers
use CSS; its drawer and inline search use explicit open/closed state.

---

## Z-Index Hierarchy

### The Scale (Bottom to Top)

```
Stacking Order (lowest to highest):
────────────────────────────────────
base (1)          ← Content and cards
theme-debug (5)   ← Theme debug tools
layout-debug (5)  ← Layout debug tools
footer (6)        ← Footer
navbar (10)       ← Top bar
dropdown (9999)   ← Overlays above the structural layout
```

### Usage Examples

```tsx
// NavBar - should be above footer
<Box zIndex="navbar">...</Box>

// Dropdown menu - above all layout
<Menu.Content zIndex="dropdown">...</Menu.Content>
```

### Z-Index Usage Rules

**Structural layers (cross-component stacking):**

- **MUST use semantic tokens:** navbar, footer, dropdown
- Affects multiple components, creates stacking order for app layout
- Values typically 10+
- Examples: NavBar above Footer, Modal above content, Tooltip above everything

```tsx
// ✅ Structural stacking uses semantic tokens
<Box zIndex="navbar">NavBar</Box>
<Menu.Content zIndex="dropdown">Dropdown</Menu.Content>
```

**Element-level positioning (within component boundaries):**

- **MAY use numeric values 0-10** for local element stacking
- Should NOT interact with structural layers outside component
- Examples: IconButton overlay on input, search icon positioning, icon stacking within alerts
- Document intent with inline comment if non-obvious

```tsx
// ✅ Element-level stacking can use numeric values
// Icon positioned above input field for show/hide toggle
<IconButton position="absolute" right={2} zIndex={1} />

// Search icon overlay within input container
<Icon position="absolute" left={3} zIndex={1} />
```

**When in doubt:** Use semantic token (safer, more searchable, better for structural stacking)

### Adding New Semantic Tokens

1. **Evaluate scope:** Does this z-index affect multiple components? (Yes → semantic token)
2. **Check for cross-component stacking:** Does it need to stack above/below structural layers? (Yes → semantic token)
3. **Consider element-level:** Is it local positioning within component? (Maybe numeric acceptable)
4. **Document new levels** - add to `z-index.ts` with clear semantic name
5. **Test stacking** - use LayoutDebug page to verify hierarchy

---

## Migration Examples

### Example 1: Hardcoded Height → Layout Token

**Before:**

```tsx
<Box height="65px" />  // ❌ Magic number
```

**After:**

```tsx
<Box height="layout-navbar" />  // ✅ Semantic token
```

**Why:** One source of truth for the bar and every control offset below it.

### Example 2: Conditional Rendering → CSS Display Props

**Before (causes flash):**

```tsx
const showWideRow = useBreakpointValue(
  { base: false, lg: true },
  { ssr: false }
) ?? false;

return showWideRow && <WideNavBar />;  // ❌ JavaScript conditional
```

**After (flash-free):**

```tsx
<Box display={{ base: 'none', lg: 'block' }}>
  <WideNavBar />  // ✅ CSS controls visibility
</Box>
```

**Why:** CSS-native, instant correct display, no flash, SSR-safe.

### Example 3: Sticky Positioning with Offset

**Before:**

```tsx
<Box
  position="sticky"
  top="65px"  // ❌ Duplicates the bar height
/>
```

**After:**

```tsx
<Box
  position="sticky"
  top="var(--chakra-sizes-layout-navbar)"  // ✅ Uses CSS variable
  style={{ willChange: 'transform' }}       // Performance optimization
/>
```

**Why:** The offset follows the bar token without duplicating its dimension.

### Example 4: Unnecessary Hook → Direct Value

**Before:**

```tsx
const cardWidth = useBreakpointValue({ base: "100%" });  // ❌ Only one value
return <Box width={cardWidth} />;
```

**After:**

```tsx
<Box width="100%" />  // ✅ Direct value
```

**Why:** No hook overhead for non-responsive value.

---

## LayoutDebug Page Usage

### Accessing the Page

Navigate to `/dev/layout-debug` (dev mode only - link in Footer).

### What It Shows

**1. Layout Foundation Tokens**

- Live computed values (updates on resize)
- Shows the 65px bar height at every breakpoint and the footer height

**2. Z-Index Hierarchy**

- Structural and debug tokens with their numeric values
- Visual stacking order

**3. Layout Structure**

- Visual diagram of the top bar, content and footer
- Demonstrates the full-width content area

**4. Sticky Positioning Test**

- Scrollable container to verify sticky behavior
- Test for layout jump issues

**5. Breakpoint Thresholds**

- Exact pixel values: base (0), md (768), lg (1024), xl (1280)

**6. CSS Display Prop Patterns**

- Code examples of show/hide patterns
- Copy-paste examples for common use cases

**7. CSS Variable Reference**

- Three access patterns with examples
- How to use in different contexts

### Using for Validation

**After layout changes:**

1. Navigate to `/dev/layout-debug`
2. Check "Layout Foundation Tokens" shows expected values
3. Verify "Layout Structure" diagram looks correct
4. Resize browser window to test responsive behavior
5. Scroll "Sticky Positioning Test" to verify no jumps

**Debugging layout issues:**

1. Check token values match your expectations
2. Verify z-index hierarchy if elements overlap incorrectly
3. Test breakpoint thresholds by resizing precisely to 768px, 1024px
4. Compare visual structure to actual layout

---

## Developer Quick Reference

### Token Naming Convention

```
Pattern: layout-{element}
Examples:
  layout-navbar
  layout-footer
```

### Access Cheat Sheet

```tsx
// Chakra props (most common)
height="layout-navbar"

// CSS variable (calculations)
top="var(--chakra-sizes-layout-navbar)"

// useToken hook (JS logic)
const [h] = useToken("sizes", ["layout-navbar"]);

// getComputedStyle (resolved values)
getComputedStyle(document.documentElement)
  .getPropertyValue('--chakra-sizes-layout-navbar')
```

### Responsive Patterns Quick Pick

```tsx
// Show/hide single element
<Box display={{ base: 'none', lg: 'block' }}>Desktop Only</Box>

// Alternate content
<Box display={{ base: 'block', lg: 'none' }}>Mobile</Box>
<Box display={{ base: 'none', lg: 'block' }}>Desktop</Box>

// Responsive values
<Box width={{ base: "100%", lg: "280px" }} />
```

### Z-Index Quick Pick

```tsx
zIndex="base"      // 1 - Content
zIndex="footer"    // 6 - Footer
zIndex="navbar"    // 10 - NavBar
zIndex="dropdown"  // 9999 - Menus, tooltips, modals
```

### When to Use What

| Scenario                | Solution                                                |
|-------------------------|---------------------------------------------------------|
| Major layout dimension  | Layout token: `height="layout-navbar"`                  |
| Component spacing       | Chakra scale: `p={4}`                                   |
| Show/hide by breakpoint | CSS display: `display={{ base: 'none', lg: 'block' }}`  |
| Sticky offset           | CSS variable: `top="var(--chakra-sizes-layout-navbar)"` |
| Z-index stacking        | Semantic token: `zIndex="navbar"`                       |
| Behavioral logic        | `useBreakpointValue` with `{ ssr: false }`              |

---

## Related Documentation

**For color and styling:**

- [Color Token System](./strategy-color-tokens.md) - Token naming, accessibility standards, token architecture
- [Component Styling Strategy](./strategy-component-styling.md) - Component building patterns, recipes, wrappers

**For architectural context:**

- ADR-007: Use Chakra Theme Tokens for Layout Constants (layout token rationale)

**For implementation:**

- `frontend/src/theme/layout/foundations.ts` - Foundation token definitions
- `frontend/src/theme/layout/semantic-tokens.ts` - Responsive semantic tokens
- `/dev/layout-debug` page - Visual validation of all layout tokens and breakpoints

---

**Version History:**

- v1.1 (2025-11-12): Updated z-index guidance with pragmatic hybrid approach (element-level numeric 0-10 acceptable,
  structural 10+ requires semantic tokens). Based on Phase 7.1 audit findings showing numeric z-index usage for icon
  positioning within components (non-structural use cases).
- v1.0 (2025-11-06): Initial version documenting layout token system
