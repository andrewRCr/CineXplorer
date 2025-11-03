# Border System Strategy

**Version:** 1.0 | **Updated:** 2025-11-03 | **Status:** Active

## Purpose

Comprehensive standards for border treatment across CineXplorer's UI component system, covering border widths, colors, accessibility requirements, and focus state patterns.

**Use this when:**
- Determining border width for any component type
- Setting border color values in theme definitions
- Implementing focus states on interactive elements
- Ensuring WCAG accessibility compliance for borders
- Making decisions about border treatment across 7 themes

**Related documentation:**
- [Semantic Token Strategy](strategy-semantic-tokens.md) - Token usage patterns (when to use which token)
- [ADR-004: Provider-Based Multi-Theme Switching](../../adr/adr-004-provider-based-multi-theme-switching.md) - Theme system implementation

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Border Width Standards](#border-width-standards)
3. [Border Color Strategy](#border-color-strategy)
4. [Focus State Patterns](#focus-state-patterns)
5. [Accessibility Requirements](#accessibility-requirements)
6. [Implementation Guide](#implementation-guide)
7. [Quick Reference](#quick-reference)

---

## Core Principles

### Industry Standard: 1px Universal Default

**Key Finding:** Modern design systems (Material Design 3, IBM Carbon, GitHub Primer, Ant Design, Bootstrap, Polaris) universally use **1px borders** for virtually all components.

**No Component Type Differentiation:**
- Text inputs: 1px
- Buttons (outline): 1px
- Cards: 1px
- Dividers: 1px
- Tables: 1px
- Modals: 1px

**Exception:** Checkboxes and radio buttons commonly use **2px** to differentiate from text inputs.

### Border Width Does NOT Compensate for Poor Contrast

**Critical Principle from WCAG:**
- A 1px border with 4.5:1 contrast is more accessible than a 2px border with 2:1 contrast
- Thicker borders don't fix visibility if color contrast is insufficient
- WCAG has no trade-off mechanism between width and contrast
- **Always prioritize contrast over thickness**

### State Differentiation via Focus Rings, Not Border Width

**Industry Best Practice:**
- Keep border at 1px across all states (default, hover, focus)
- Add 2-3px **outline ring with offset** on focus
- Avoids layout shift when element receives focus
- Better WCAG 2.2 compliance (SC 2.4.13)

---

## Border Width Standards

### By Component Type

| Component Type | Default | Hover | Focus | Notes |
|---------------|---------|-------|-------|-------|
| **Text Input** | 1px | 1px | 1px + 2px ring | Standard across all design systems |
| **Select** | 1px | 1px | 1px + 2px ring | Same as text input |
| **Textarea** | 1px | 1px | 1px + 2px ring | Same as text input |
| **Checkbox** | **2px** | 2px | 2px + 2px ring | Thicker to differentiate from text inputs |
| **Radio** | **2px** | 2px | 2px + 2px ring | Thicker to differentiate from text inputs |
| **Button (outline)** | 1px | 1px | 1px + 2px ring | Standard |
| **Button (filled)** | 0px | 0px | 0 + 2px ring | No border, background provides boundary |
| **Card** | 1px or 0 | 1px or 0 | N/A | Shadow often preferred over border |
| **Divider** | 1px | N/A | N/A | Always 1px, never thicker |
| **Table cells** | 1px | N/A | N/A | Horizontal only recommended |
| **Modal** | 1px or 0 | N/A | N/A | Shadow primary, border secondary |
| **Popover** | 1px | N/A | N/A | Subtle border + shadow |

### By State

**Default State:**
- 1px for all components (except checkboxes/radios: 2px)
- Explicit `borderWidth="1px"` in component props

**Hover State:**
- Keep same width (1px)
- May change border color to darker/stronger variant
- Never increase border width on hover

**Focus State:**
- Keep border at 1px
- Add 2-3px outline ring with 2px offset
- Change border color to focus color (optional)
- **Do not increase border width** (causes layout shift)

**Active/Pressed State:**
- Same as focus or slight color variation
- Keep 1px border width

**Disabled State:**
- Keep 1px border width
- Reduce opacity or change to muted color

### Exceptions to 1px Standard

**Checkboxes and Radio Buttons: 2px**
- Rationale: Helps differentiate these controls from text inputs
- Common across design systems
- Aligns with 2px stroke width in icon sets

**Active Tab Indicators: 2-3px**
- Bottom border used as visual indicator of active state
- Not a structural border, but a state indicator
- Only on active tab, not all tabs

**Strong Emphasis Borders: 3-4px (Rare)**
- Use sparingly for very strong visual emphasis
- Example: Error state on critical validation
- Consider whether shadow or background color is better alternative

---

## Border Color Strategy

### Token Architecture

**Shared Border Color Approach (Recommended):**

Modern design systems predominantly use shared border colors across component types (60%+ of systems). When systems differentiate, they use semantic aliases pointing to the same base value.

**Token Structure:**
```typescript
// Base border color variants
border: {
  subtle: 'neutral.200',   // Lightest - cards, dividers
  default: 'neutral.300',  // Standard - inputs, buttons, general borders
  strong: 'neutral.400',   // Emphasized - hover states
}

// Semantic aliases (point to base values)
input: 'border.default',     // Same as default
button: 'border.default',    // Same as default
card: 'border.subtle',       // Lighter for cards
divider: 'border.subtle',    // Lighter for dividers

// Interactive state colors
border-hover: 'border.strong',
border-focus: 'primary.500',  // High contrast accent
border-ring: 'primary.500',   // Focus ring color
```

### Why Use Shared Colors?

**Benefits:**
1. Visual consistency across UI
2. Simpler maintenance (single source of truth)
3. Aligns with 60%+ of modern design systems
4. Easier theme creation (fewer color decisions)
5. Reduces cognitive load for developers

**When semantic aliases help:**
- Future flexibility: Can change `input` token without affecting all borders
- Clear intent: `borderColor="input"` communicates purpose
- Component-specific tuning: Can adjust inputs independently if needed later

### Color Contrast Requirements

**All border colors must meet:**
- Minimum 3:1 contrast ratio with adjacent backgrounds (WCAG SC 1.4.11)
- Recommended 4.5:1 for better visibility
- Test across all themes and modes (light/dark)

**Testing Example:**
```typescript
// Light mode - checking if #D4D4D4 border on white background passes
background: '#FFFFFF' (L = 1.0)
border: '#D4D4D4' (L ≈ 0.75)
contrast = (1.0 + 0.05) / (0.75 + 0.05) = 1.31:1 ❌ FAIL

// Need darker border for compliance
border: '#767676' (L ≈ 0.27)
contrast = (1.0 + 0.05) / (0.27 + 0.05) = 3.28:1 ✅ PASS
```

**Tool:** Use WebAIM Contrast Checker (webaim.org/resources/contrastchecker/)

---

## Focus State Patterns

### Recommended Pattern: Outline Ring with Offset

**Implementation:**
```tsx
<Input
  borderWidth="1px"
  borderColor="border.default"
  _focus={{
    borderColor: "border.focus",      // Optional: change border color
    outline: "2px solid",
    outlineColor: "border.ring",
    outlineOffset: "2px",
  }}
/>
```

**Why This Pattern:**
- ✅ No layout shift on focus (outline is outside element)
- ✅ Meets WCAG 2.4.13 (2px minimum thickness)
- ✅ Clear visual indication (separated from border)
- ✅ Works across all component types
- ✅ Industry standard (Ant Design, Bootstrap, USWDS)

### Alternative Pattern: Border Width Increase

**Implementation:**
```tsx
<Input
  borderWidth="1px"
  borderColor="border.default"
  _focus={{
    borderWidth: "2px",
    borderColor: "border.focus",
  }}
/>
```

**Trade-offs:**
- ✅ Simpler CSS
- ❌ Causes layout shift (element grows by 1px)
- ❌ Requires careful spacing adjustments
- ⚠️ Used by Material UI, Polaris, but less common

**Recommendation:** Use outline ring pattern unless specific design requires border width change.

### Focus Indicator Specifications

**Minimum Requirements (WCAG 2.4.13):**
- Thickness: ≥2px
- Contrast: ≥3:1 change between focused/unfocused states
- Visibility: Always visible when element has focus

**Recommended Values:**
- **Ring width:** 2-3px (2px minimum, 3px better visibility)
- **Ring offset:** 2px (separates from border)
- **Ring color:** High contrast accent (primary color)
- **Border color change:** Optional, but helpful

**Accessibility Enhancement:**
```tsx
// Enhanced focus pattern with maximum visibility
_focus={{
  outline: "3px solid",
  outlineColor: "border.ring",
  outlineOffset: "2px",
  borderColor: "border.focus",
}}
```

### Focus-Visible for Touch Devices

Use `:focus-visible` to show focus indicators only on keyboard navigation, not touch/click:

```tsx
_focusVisible={{
  outline: "2px solid",
  outlineColor: "border.ring",
  outlineOffset: "2px",
}}
```

This improves mobile UX by hiding focus rings on touch interactions while maintaining keyboard accessibility.

---

## Accessibility Requirements

### WCAG Success Criteria

**SC 1.4.11: Non-text Contrast (Level AA)**
- Requires **3:1 contrast ratio** for UI component boundaries
- Applies to borders that define interactive elements
- **Critical for inputs, buttons, checkboxes, radio buttons**

**SC 2.4.7: Focus Visible (Level AA)**
- Focus indicators must be visible when element has focus
- No specific contrast/size requirements in this criterion
- Baseline requirement: something must be visible

**SC 2.4.13: Focus Appearance (Level AAA - WCAG 2.2)**
- Focus indicator ≥2px thick perimeter area OR
- ≥3:1 contrast ratio change between focused/unfocused states
- Most strict requirement, recommended target

### Component-Specific Requirements

**Interactive Elements (Inputs, Buttons, Checkboxes):**
- Border contrast: ≥3:1 minimum (4.5:1 recommended)
- Focus indicator: ≥2px thickness with ≥3:1 contrast change
- Must be perceivable to indicate interactivity

**Non-Interactive Boundaries (Cards, Dividers):**
- Border contrast: ≥3:1 recommended (not strictly required)
- Can be more subtle since not interactive
- Use shadow if border doesn't meet contrast

### Testing Checklist

Before deploying any theme:

- [ ] Test border contrast ratios across all components
- [ ] Verify 3:1 minimum for interactive element borders
- [ ] Check focus indicators meet 2px + 3:1 requirements
- [ ] Test in both light and dark modes
- [ ] Validate across all 7 theme options
- [ ] Manual keyboard navigation testing
- [ ] Automated accessibility audit (axe, Lighthouse)

---

## Implementation Guide

### Theme Definition Pattern

**For all 7 themes:**
```typescript
// In theme definition file (e.g., github.ts, ibm-carbon.ts)
export const themeName: Theme = {
  light: {
    // ... other tokens ...

    // Border colors (ensure 3:1 contrast with backgrounds)
    border: palette.border_default,    // Standard border
    input: palette.border_default,     // Same as border (not background!)
    ring: palette.primary_500,         // Focus ring (high contrast)
  },

  dark: {
    // ... other tokens ...

    // Border colors (different values, same structure)
    border: palette.border_default,
    input: palette.border_default,
    ring: palette.primary_400,
  },
};
```

**Key Points:**
1. `border` and `input` tokens should reference **border colors**, never background colors
2. Ensure `border_default` palette color has ≥3:1 contrast with page background
3. `ring` token should be high contrast accent (primary color)
4. Test all contrast ratios before finalizing

### Component Implementation Pattern

**Text Input:**
```tsx
<Input
  borderWidth="1px"
  borderColor="input"
  _hover={{
    borderColor: "border.strong",  // Optional darker border
  }}
  _focus={{
    borderColor: "ring",
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
/>
```

**Checkbox:**
```tsx
<Checkbox.Control
  borderWidth="2px"              // Thicker than text inputs
  borderColor="input"
  _focus={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
/>
```

**Outlined Button:**
```tsx
<Button
  variant="outline"
  borderWidth="1px"
  borderColor="border.default"
  _focus={{
    outline: "2px solid",
    outlineColor: "ring",
    outlineOffset: "2px",
  }}
/>
```

**Card:**
```tsx
<Card
  borderWidth="1px"
  borderColor="border.subtle"
  // No focus state (not interactive)
/>
```

### Contrast Validation Script

```typescript
// Utility to validate border contrast ratios
function validateBorderContrast(
  backgroundColor: string,
  borderColor: string,
  minRatio: number = 3.0
): { passes: boolean; ratio: number } {
  const bgLuminance = calculateRelativeLuminance(backgroundColor);
  const borderLuminance = calculateRelativeLuminance(borderColor);

  const ratio = (Math.max(bgLuminance, borderLuminance) + 0.05) /
                (Math.min(bgLuminance, borderLuminance) + 0.05);

  return {
    passes: ratio >= minRatio,
    ratio: Math.round(ratio * 100) / 100,
  };
}

// Use in theme validation
const result = validateBorderContrast('#FFFFFF', '#767676');
console.log(`Contrast: ${result.ratio}:1 - ${result.passes ? 'PASS' : 'FAIL'}`);
```

---

## Quick Reference

### Border Width by Component

**Standard (1px):**
- Text inputs, select, textarea
- Outlined buttons
- Cards (when using borders)
- Dividers, separators
- Table cells
- Modals, popovers

**Thicker (2px):**
- Checkboxes
- Radio buttons

**Focus Rings (2-3px):**
- All interactive elements when focused

**Indicators (2-3px):**
- Active tab underlines

### Decision Tree

**"What border width should I use?"**

1. Is it a checkbox or radio button? → **2px**
2. Is it an active state indicator (tab)? → **2-3px bottom border**
3. Is it a focus ring? → **2-3px outline with offset**
4. Everything else? → **1px**

### Common Patterns

**Form Input with Focus:**
```tsx
borderWidth="1px"
borderColor="input"
_focus={{
  outline: "2px solid",
  outlineColor: "ring",
  outlineOffset: "2px",
}}
```

**Card with Subtle Border:**
```tsx
borderWidth="1px"
borderColor="border.subtle"
```

**Button Outline:**
```tsx
borderWidth="1px"
borderColor="border.default"
_hover={{ borderColor: "border.strong" }}
_focus={{
  outline: "2px solid",
  outlineColor: "ring",
  outlineOffset: "2px",
}}
```

### Contrast Ratio Reference

| Ratio | WCAG Level | Visibility |
|-------|------------|------------|
| 1.5:1 | FAIL | Nearly invisible |
| 2:1 | FAIL | Too subtle |
| **3:1** | **AA Pass** | **Minimum acceptable** |
| 4.5:1 | AA+ | Good visibility |
| 7:1 | AAA | Excellent visibility |

---

## Version History

- **1.0** (2025-11-03): Initial comprehensive guide based on external research across 15+ design systems (Material Design 3, IBM Carbon, GitHub Primer, Ant Design, Bootstrap, Polaris, USWDS, and others). Establishes 1px universal standard, focus ring pattern, and WCAG compliance requirements.

---

## Sources

**Research Foundation:**
This strategy is based on comprehensive external research analyzing 15+ production design systems and WCAG 2.2 accessibility specifications. Full research report available in session notes (2025-11-03 validation work).

**Key Design Systems Analyzed:**
- Material Design 3 (Google)
- IBM Carbon Design System
- GitHub Primer
- Ant Design
- Bootstrap 5
- Shopify Polaris
- U.S. Web Design System
- Tailwind CSS
- Material UI (MUI)
- Atlassian Design System

**WCAG Specifications:**
- WCAG 2.2 SC 1.4.11: Non-text Contrast
- WCAG 2.2 SC 2.4.7: Focus Visible
- WCAG 2.2 SC 2.4.13: Focus Appearance (Level AAA)

**Accessibility Resources:**
- WebAIM Contrast Checker
- Sara Soueidan: Accessible Focus Indicators Guide

---

**Document Maintainer:** Update this strategy when:
- Adding new component types requiring border decisions
- Changing theme border color definitions
- Discovering accessibility issues with current approach
- Industry standards evolve (review annually)
