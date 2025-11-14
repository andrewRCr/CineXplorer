# Incidental: Chakra UI v3 Recipe System Implementation

**Created:** 2025-11-14
**Base branch:** `technical/service-layer-modernization`
**Branch:** `incidental/chakra-recipe-system-implementation`
**Status:** Active

## Context

**Discovered:** During Task 7.2.d (neutral outline button hover pattern discussion)

**Interrupts:** `.arc/active/incidental/tasks-theme-system-modernization.md` at Phase 7.2.d (after
Task 7.2.d.3 complete)

**Problem:** ADR-012 defined semantic button tokens but never implemented centralized Chakra UI v3
recipes. All interaction states (`_hover`, `_focus`, `_active`) are defined inline across 20+
components, causing maintenance burden, pattern drift, and lost benefits of Chakra's recipe system.

**Why Now:**

- Changing button hover colors (tertiary → primary) currently requires updating 20+ files
- With recipes: One-line change in recipe definition
- Pattern drift already occurring (inconsistent implementations)
- Better to establish recipe infrastructure before touching more components
- Current theme modernization work (Phase 7) is ideal context

## Scope

### Will Do

- Implement Chakra UI v3 recipes for all codified component patterns
- Priority phasing: Button → Form Controls → Alert/Badge → Remaining
- Migrate existing components to use recipes (grep + systematic replacement)
- Update strategy-semantic-tokens.md to reference recipes
- Update ThemeDebug.tsx to demonstrate recipe usage
- Then fix tertiary → primary for neutral outline buttons (becomes one-line change)

### Won't Do

- Create recipes for components without codified patterns
- Invent new patterns (only implement what strategy doc defines)
- Optimize recipe performance (do that later if needed)

---

## Tasks

### **Phase 1:** Research and Planning

- [ ] **1.1 Research Chakra UI v3 recipe API**

    **Goal:** Understand recipe syntax, variants, compound variants, and registration.

    - [ ] **1.1.1 Review Chakra UI v3 recipe documentation**
        - Read official defineRecipe API docs
        - Understand variant system (base styles, variants, compound variants)
        - Review recipe registration in theme config
        - Document key patterns in notes file

    - [ ] **1.1.2 Identify gaps between strategy doc and recipe capabilities**
        - Check if all codified patterns can be expressed as recipes
        - Document any patterns requiring component-level implementation
        - Note limitations or workarounds needed

- [ ] **1.2 Audit current inline pattern usage**

    **Goal:** Quantify migration scope and identify pattern variations.

    - [ ] **1.2.1 Catalog inline button patterns**
        - Grep for all button `_hover` patterns
        - Count variants: solid, primary-outline, neutral-outline, subtle, ghost
        - Document pattern variations (deviations from strategy)
        - Note files: frontend/src/components/**/*.tsx

    - [ ] **1.2.2 Catalog inline form control patterns**
        - Grep for Input/Textarea/Select hover/focus patterns
        - Document CSS variable usage (color-mix patterns)
        - Identify any ADR-015 violations

    - [ ] **1.2.3 Catalog inline Alert/Badge patterns**
        - Grep for semantic color usage (success/warning/destructive/info)
        - Document opacity background patterns
        - Note any custom implementations

### **Phase 2:** Button Recipes (High Priority - Biggest Impact)

- [ ] **2.1 Create button recipe infrastructure**

    - [ ] **2.1.1 Create `frontend/src/theme/recipes/button.ts`**
        - Import defineRecipe from Chakra
        - Set up base recipe structure with variants object
        - Export buttonRecipe

    - [ ] **2.1.2 Define solid button variant**
        - Base: `bg: "primary"`, `color: "on-primary"`
        - Hover: `bg: "primary-hover"`
        - Active: `bg: "primary-active"`
        - FocusVisible: `outline`, `outlineColor: "ring"`, `outlineOffset`

    - [ ] **2.1.3 Define primary outline variant**
        - Border: `button-outline-primary`
        - Color: `on-button-outline-primary`
        - Hover: `bg: "primary/8"`
        - Active: `bg: "primary/12"`

    - [ ] **2.1.4 Define neutral outline variant**
        - Border: `button-outline`
        - Color: `on-button-outline`
        - Hover: `bg: "tertiary/8"`, `borderColor: "tertiary"` (will change to primary later)
        - Active: `bg: "tertiary/12"`, `borderColor: "tertiary"`
        - Note: Keep tertiary for now, change in Phase 6

    - [ ] **2.1.5 Define subtle button variant**
        - Base: `bg: "button-subtle"`, `color: "on-button-subtle"`
        - Hover: `bg: "secondary-hover"`
        - Selected: `bg: "button-subtle-selected"`, `color: "on-button-subtle-selected"`

    - [ ] **2.1.6 Define ghost button variant**
        - Base: `color: "tertiary"`
        - Hover: `bg: "tertiary/8"`, `color: "tertiary-hover"`
        - Active: `color: "tertiary-active"`

- [ ] **2.2 Register button recipe in theme system**

    - [ ] **2.2.1 Create `frontend/src/theme/recipes/index.ts`**
        - Export buttonRecipe
        - Set up for future recipe additions

    - [ ] **2.2.2 Update `frontend/src/theme/index.ts` to register recipes**
        - Import recipes from `./recipes`
        - Add recipes to theme config
        - Verify TypeScript types work correctly

- [ ] **2.3 Test button recipes across all themes**

    - [ ] **2.3.1 Create test component using all button variants**
        - Temporary test page or add to ThemeDebug
        - Test each variant (solid, primary-outline, neutral-outline, subtle, ghost)
        - Verify hover/active/focus states

    - [ ] **2.3.2 Visual validation across themes**
        - Test in all 4 themes (ibm-carbon, github, gitlab, material)
        - Test in both light and dark modes
        - Document any issues in notes file

- [ ] **2.4 Migrate components to use button recipes**

    **Goal:** Systematically replace inline patterns with recipe usage.

    - [ ] **2.4.1 Migrate solid buttons**
        - Grep for solid button patterns
        - Replace inline styles with recipe variant
        - Pattern: `variant="solid"` with recipe visual variant
        - Run incremental quality checks

    - [ ] **2.4.2 Migrate outline buttons**
        - Replace primary outline patterns
        - Replace neutral outline patterns
        - Update MobileMenuButton, NavBarUserMenu, others
        - Run incremental quality checks

    - [ ] **2.4.3 Migrate subtle and ghost buttons**
        - Replace subtle button patterns (theme selectors)
        - Replace ghost button patterns (dismissive actions)
        - Run incremental quality checks

    - [ ] **2.4.4 Run full quality gates**
        - Frontend linting: 0 violations
        - TypeScript: 0 errors
        - Frontend tests: 100% pass rate
        - Visual validation in all themes

### **Phase 3:** Form Control Recipes (High Priority - Consistency)

- [ ] **3.1 Create Input/Textarea recipes**

    - [ ] **3.1.1 Create `frontend/src/theme/recipes/input.ts`**
        - Define base input recipe with ADR-015 border-only focus
        - Base: `borderColor: "border-strong-01"`, `bg: "transparent"`
        - Hover: CSS variable syntax for border-strong-02 + tertiary/8 bg
        - Focus: CSS variable syntax for tertiary border + transparent bg

    - [ ] **3.1.2 Create textarea recipe** (if different from input)
        - Same pattern as input
        - Adjust for textarea-specific needs if any

    - [ ] **3.1.3 Test input recipes across themes**
        - Verify border-only focus works
        - Test hover → focus transitions
        - Validate in all 4 themes × 2 modes

- [ ] **3.2 Create Select recipes**

    - [ ] **3.2.1 Create `frontend/src/theme/recipes/select.ts`**
        - Define Select.Trigger styles (button-like, keyboard-only ring)
        - Define Select.Content styles (muted background, subtle border)
        - Define Select.Item styles (selected state, hover patterns)

    - [ ] **3.2.2 Test Select recipes**
        - Verify trigger hover/focus
        - Test item selection and hover states
        - Validate keyboard-only focus rings

- [ ] **3.3 Migrate form control components**

    - [ ] **3.3.1 Migrate Input/Textarea components**
        - Replace inline CSS patterns
        - Update strategy doc examples
        - Run quality checks

    - [ ] **3.3.2 Migrate Select components**
        - Update ConnectedDropdowns, filters, etc.
        - Replace inline patterns
        - Run quality checks

    - [ ] **3.3.3 Run full quality gates**
        - Frontend linting: 0 violations
        - TypeScript: 0 errors
        - Visual validation

### **Phase 4:** Alert and Badge Recipes (Medium Priority)

- [ ] **4.1 Create Alert recipes**

    - [ ] **4.1.1 Create `frontend/src/theme/recipes/alert.ts`**
        - Define 4 semantic variants (success, warning, destructive, info)
        - Opacity background patterns (10%, 20%)
        - Icon colors (semantic color for emphasis)
        - Title colors (semantic color for emphasis)
        - Description colors (foreground for readability)

    - [ ] **4.1.2 Test Alert recipes across themes**

- [ ] **4.2 Create Badge recipes**

    - [ ] **4.2.1 Create `frontend/src/theme/recipes/badge.ts`**
        - Movie rating badge (rating / rating-foreground)
        - Genre tag badge (badge / badge-foreground)
        - Status badges (success, warning, destructive, info)

    - [ ] **4.2.2 Test Badge recipes**

- [ ] **4.3 Migrate Alert and Badge components**

    - [ ] **4.3.1 Migrate Alert usages**
    - [ ] **4.3.2 Migrate Badge usages**
    - [ ] **4.3.3 Run quality gates**

### **Phase 5:** Remaining Component Recipes (Lower Priority)

- [ ] **5.1 Create Link recipes**

    - [ ] **5.1.1 Create `frontend/src/theme/recipes/link.ts`**
        - TextLink pattern (tertiary, underline, hover/focus states)
        - Test across themes

    - [ ] **5.1.2 Evaluate if TextLink component needs updates**
        - Check if recipe usage simplifies component
        - Update if beneficial

- [ ] **5.2 Create Checkbox/Radio/Switch recipes**

    - [ ] **5.2.1 Create `frontend/src/theme/recipes/checkbox.ts`**
        - Border width (2px), default border (input)
        - Checked state (primary bg, primary border)
        - Hover state

    - [ ] **5.2.2 Create `frontend/src/theme/recipes/radio.ts`**
        - Same pattern as checkbox (different shape)

    - [ ] **5.2.3 Create `frontend/src/theme/recipes/switch.ts`**
        - Track colors (muted off, primary on)
        - Thumb color (background)

    - [ ] **5.2.4 Test and migrate form control components**

- [ ] **5.3 Create Card recipes** (if beneficial)

    - [ ] **5.3.1 Evaluate if Card needs recipes**
        - Most styling is token-based (layers, borders, shadows)
        - May not benefit from recipes
        - Document decision

    - [ ] **5.3.2 Create recipe if needed**
        - Layer variants (layer-01, layer-02, layer-03)
        - Border variants (border-strong-01, etc.)
        - Shadow variants (shadow-sm, shadow-md, shadow-lg)

### **Phase 6:** Documentation and Neutral Outline Fix

- [ ] **6.1 Update strategy-semantic-tokens.md**

    **Goal:** Replace inline code examples with recipe references.

    - [ ] **6.1.1 Update Button section**
        - Replace Pattern 1-6 code examples
        - Reference recipe variants instead
        - Show how to use: `<Button visual="neutral-outline">`

    - [ ] **6.1.2 Update Form Controls section**
        - Update Input/Textarea examples with recipe usage
        - Update Select examples

    - [ ] **6.1.3 Update Alert/Badge sections**
        - Update with recipe variant usage
        - Maintain guidance on when to use which variant

- [ ] **6.2 Update ThemeDebug.tsx**

    - [ ] **6.2.1 Update CoreActionsSection to use recipes**
        - Demonstrate all button recipe variants
        - Show hover/focus/active states

    - [ ] **6.2.2 Update FormControlsSection**
        - Demonstrate input/textarea recipes with ADR-015 patterns
        - Show Select recipe usage

    - [ ] **6.2.3 Update other sections as needed**

- [ ] **6.3 Fix neutral outline button hover (tertiary → primary)**

    **Goal:** One-line change now that recipes are implemented!

    - [ ] **6.3.1 Update button recipe neutral outline variant**
        - Change hover: `bg: "tertiary/8"` → `bg: "primary/8"`
        - Change hover: `borderColor: "tertiary"` → `borderColor: "primary"`
        - Change active: `bg: "tertiary/12"` → `bg: "primary/12"`
        - Change active: `borderColor: "tertiary"` → `borderColor: "primary"`
        - File: `frontend/src/theme/recipes/button.ts`

    - [ ] **6.3.2 Visual validation across all themes**
        - Test all 4 themes × 2 modes
        - Verify neutral outline buttons look correct
        - Verify no regressions in other button types

    - [ ] **6.3.3 Update strategy doc Pattern 3 description**
        - Update "Neutral Outline Button" section
        - Document that hover uses primary (not tertiary)
        - Update rationale explaining button-level vs link-level hierarchy

- [ ] **6.4 Final quality gates**

    - [ ] **6.4.1 Run complete test suite**
        - Backend tests: 100% pass
        - Frontend tests: 100% pass

    - [ ] **6.4.2 Run all linting and type checking**
        - Backend linting: 0 violations
        - Frontend linting: 0 violations
        - TypeScript: 0 errors
        - Pyright: 0 errors
        - Markdown: 0 violations

    - [ ] **6.4.3 Visual regression check**
        - Test all pages in all 4 themes
        - Test light and dark modes
        - Verify no unintended changes

## Notes & Observations

**Technical Approach:**

- Use Chakra UI v3 `defineRecipe` API for all component recipes
- Recipes registered in theme config at `frontend/src/theme/index.ts`
- Each recipe gets dedicated file in `frontend/src/theme/recipes/`
- TypeScript types auto-generated by Chakra

**Key Decisions:**

- Keep tertiary hover for neutral outline initially (Phase 2), change in Phase 6
- This allows incremental migration without forcing the color change mid-stream
- ADR-012 semantic tokens remain unchanged (recipes use existing tokens)

**Related Work:**

- Triggered by: Theme System Modernization (Phase 7.2.d neutral outline discussion)
- Enables: One-line button hover color changes going forward
- Foundation for: Future component pattern consistency

**Estimated Effort:**

- Phase 1 (Research): 1-2 hours
- Phase 2 (Buttons): 3-4 hours
- Phase 3 (Form Controls): 2-3 hours
- Phase 4 (Alert/Badge): 2-3 hours
- Phase 5 (Remaining): 2-3 hours
- Phase 6 (Docs + Fix): 1-2 hours
- Total: ~13-17 hours (substantial incidental work, warrants task list and branch)
