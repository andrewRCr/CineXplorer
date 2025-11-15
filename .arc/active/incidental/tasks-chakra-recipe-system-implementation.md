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

---

## ⚠️ CRITICAL CONTEXT: Codebase in Intermediate State

**READ THIS FIRST IN EVERY SESSION:**

The codebase is approximately **90% through** `tasks-theme-system-modernization.md`.
This means the theme system is in a **transitional state** with legacy code that will be removed.

### What Phase 8 Will Remove (Line 3186)

When Phase 8 cleanup executes, these will be **DELETED**:

- ❌ **`frontend/src/theme/definitions/*.ts` files** - Entire directory removed
- ❌ **`ThemeColors` interface** - Completely removed from types
- ❌ **Old `light`/`dark` dual palette system** - Removed from `createBaseTokens()`
- ❌ **`-foreground` suffix aliases** - All removed (e.g., `primary-foreground`, `accent-foreground`)
- ❌ **Temporal commentary** - All "Phase X", "Task Y", "CORRECTED", "FIXED" comments stripped
- ❌ **Parallel system references** - All "during migration", "transitional", "parallel systems" comments

### What Remains (TARGET Architecture)

The **current architecture minus the above** is the target state for recipe implementation:

- ✅ **`createThemeSystem(theme: Theme)`** - Core function creating Chakra system from unified theme
- ✅ **Unified adapter layer** - `frontend/src/theme/color/adapters/*.ts` (GitHub, Carbon, GitLab, Material)
- ✅ **`UnifiedTheme` interface** - ~47 canonical tokens
  (`layer-01`, `on-primary`, `tertiary`, etc.)
- ✅ **Semantic token structure** - Already in Chakra-compatible format (base + `_dark` references)
- ✅ **All components migrated** - Already using canonical token names
- ✅ **Dynamic theme switching** - Provider-based system fully functional

### What's NOT Migrated Yet

- ⚠️ **`input` and `border` tokens** - Still in use (~70 usages of "border"),
  pending Phase 7.2.e deprecation
    - These will be migrated to layer-appropriate border tokens before Phase 8
    - NOT blocked for recipe work - recipes will use layer-appropriate tokens from day 1

### Implications for Recipe Implementation

**✅ SAFE TO PROCEED** - The target architecture is stable and recipe-compatible.

**Key principle:** Design recipes against the CURRENT system (minus deprecated parts),
NOT against what `definitions/` files show. Those files are legacy scaffolding.

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

- [x] **1.1 Research Chakra UI v3 recipe API** ✅

    **Goal:** Understand recipe syntax, variants, compound variants, and registration.

    **Completed:** 2025-11-14 (both subtasks complete)

    - [x] **1.1.1 Review Chakra UI v3 recipe documentation**

        **Completed:** 2025-11-14

        **Key findings:**
        - Recipe structure: `defineRecipe` with base, variants, compoundVariants, defaultVariants
        - Registration: `defineConfig({ theme: { recipes: { button: buttonRecipe } } })`
        - Token references: Recipes reference semantic tokens by name (e.g., `bg: "primary"`)
        - Two usage patterns: `useRecipe` hook (complex cases) vs `chakra()` factory (RECOMMENDED)
        - `chakra()` factory creates fully-typed components with cleaner API

        **Compatibility verified:**
        - ✅ Our semantic token structure matches Chakra's expected format exactly
        - ✅ Dynamic theme switching fully compatible (recipes registered in baseConfig)
        - ✅ Token references work automatically across theme switches
        - ✅ No architecture changes needed

        **Critical decisions:**
        - Recipes MUST use canonical token names (`on-primary`, NOT `primary-foreground`)
        - Register recipes in `baseConfig.theme.recipes` (line ~181 of theme/index.ts)
        - Use "creating a component" pattern for better DX and performance

        **Documented in:** `notes-chakra-recipe-system-implementation.md`

    - [x] **1.1.2 Identify gaps between strategy doc and recipe capabilities**

        **Completed:** 2025-11-14

        **Analysis completed:**
        - ✅ Reviewed all codified patterns from strategy-semantic-tokens.md
        - ✅ Created comprehensive expressibility matrix (13 pattern categories analyzed)
        - ✅ Identified recipe-compatible vs component-level-only patterns
        - ✅ Documented workarounds for edge cases (compound variants, utility functions)

        **Key findings:**

        **✅ Fully recipe-compatible (90% of patterns):**
        - All 5 button variants (solid, primary-outline, neutral-outline, subtle, ghost)
        - Alert patterns (via slot recipes)
        - Badge patterns (via compound variants)
        - Select.Trigger pattern (button-like)

        **⚠️ Partial (recipes + component logic):**
        - Subtle button with selection (use compound variants: `selected: true/false`)
        - Select.Item with dynamic selection (runtime conditionals stay in components)
        - Checkbox (recipe for base, Chakra handles checked state)

        **❌ Not expressible in recipes:**
        - Input/Textarea patterns - Complex CSS (`:hover:not(:focus)`, `color-mix()`)
        - Requires explicit CSS variable syntax (`var(--chakra-colors-*)`)
        - Solution: Keep as component utilities or wrapper components

        **Architectural decision:** Hybrid approach maximizes recipe benefits
        (centralized styling, theme-aware variants) while acknowledging boundaries
        (complex pseudo-selectors, runtime conditionals).

        **Recommendations:**
        - Phase 2 (Buttons): ✅ Full recipe implementation
        - Phase 3 (Forms): ⚠️ Mixed (Select.Trigger recipe, Input/Textarea utilities)
        - Phase 4 (Alert/Badge): ✅ Full recipe implementation (slot recipes, compound variants)

        **Documented in:** `notes-chakra-recipe-system-implementation.md` (Task 1.1.2 section)

- [x] **1.2 SKIP - Inline pattern audit not needed** ✅

    **Decision:** Strategy doc is source of truth. Task 1.1.2 already analyzed all patterns.

    **Rationale:**
    - Strategy doc defines what patterns SHOULD be (source of truth)
    - Auditing code for "variations" treats messy reality as the target
    - Better approach: Implement recipes from strategy doc, fix deviations during migration

    **Migration note:** When migrating components (Phases 2-5), if you find patterns that
    DON'T match strategy doc, either:
    - A) Fix component to match strategy (most cases)
    - B) Update strategy doc if legitimate new pattern discovered (rare)
    - Document any deviations found in notes file for resolution

### **Phase 2:** Button Recipes (High Priority - Biggest Impact)

**IMPLEMENTATION PATTERN (applies to ALL phases):**

✅ **DO:**

- Create recipes with `defineRecipe` or `defineSlotRecipe`
- Register in `baseConfig.theme.recipes` or `baseConfig.theme.slotRecipes`
- Use built-in Chakra components: `import { Button } from "@chakra-ui/react"`
- Replace inline styles with variant props: `variant="solid"`
- Run typegen after recipe changes: `npx @chakra-ui/cli typegen ./theme.ts`

❌ **DON'T:**

- Create wrapper components with `chakra()` factory (unnecessary for built-in components!)
- Change imports from `@chakra-ui/react` to custom components
- Use `useRecipe` hook (only for advanced custom cases)

**Why this works:** Built-in Chakra components automatically use recipes registered with matching key names.
See notes file "CRITICAL DISCOVERY" section for research confirmation.

**Variant key naming:** MUST use `variant` as the variant group name (NOT `visual`, NOT `type`). This is a common gotcha.

---

- [x] **2.1 Create button recipe infrastructure** ✅

    **Completed:** 2025-11-14

    Created `frontend/src/theme/recipes/button.ts` with all 5 button variants using Chakra v3 `defineRecipe` API.
    All variants reference canonical semantic tokens and include full interaction states (_hover,_active, _focusVisible).

    - [x] **2.1.1 Create `frontend/src/theme/recipes/button.ts`**

        Implemented with defineRecipe import, base styles, variants object, compound variants, and default variants.

    - [x] **2.1.2 Define solid button variant**

        Implemented: `bg: "primary"`, `color: "on-primary"`, hover: `primary-hover`, active: `primary-active`,
        focus-visible: ring outline with 2px offset.

    - [x] **2.1.3 Define primary outline variant**

        Implemented: `borderColor: "button-outline-primary"`, `color: "on-button-outline-primary"`,
        hover: `bg: "primary/8"`, active: `bg: "primary/12"`, focus-visible: ring outline.

    - [x] **2.1.4 Define neutral outline variant**

        Implemented: `borderColor: "button-outline"`, `color: "on-button-outline"`,
        hover: `bg: "tertiary/8"` + `borderColor: "tertiary"`, active: `bg: "tertiary/12"` + `borderColor: "tertiary"`.
        Note: Tertiary tokens preserved for now (will change to primary in Phase 6).

    - [x] **2.1.5 Define subtle button variant (with selection support)**

        Implemented using compound variants:
        - Added `selected: { true: {}, false: {} }` variant dimension
        - Unselected: `bg: "button-subtle"`, hover: `secondary-hover`
        - Selected: `bg: "button-subtle-selected"`, no hover change (via compound variant)
        - Usage: `<Button variant="subtle" selected={isSelected}>`

    - [x] **2.1.6 Define ghost button variant**

        Implemented: `color: "tertiary"`, hover: `bg: "tertiary/8"` + `color: "tertiary-hover"`,
        active: `color: "tertiary-active"`, focus-visible: ring outline.

- [x] **2.2 Register button recipe in theme system** ✅

    **Completed:** 2025-11-14

    Registered button recipe in baseConfig at `theme.recipes.button`. Recipe is now available to all theme
    systems created via createThemeSystem() and will automatically use semantic token values from each theme.

    - [x] **2.2.1 Create `frontend/src/theme/recipes/index.ts`**

        Created central export point for all recipes. Exports buttonRecipe and ready for future recipe additions.

    - [x] **2.2.2 Update `frontend/src/theme/index.ts` to register recipes**

        - Added import: `import { buttonRecipe } from "./recipes"`
        - Registered in baseConfig.theme.recipes (line 213-216)
        - TypeScript types verified (no errors)

- [x] **2.3 Test button recipes across all themes** ✅

    **Completed:** 2025-11-14

    Created dedicated Button Patterns section in ThemeDebug showcasing all 5 button variants with interaction states.
    Organized by component type (buttons) not implementation technique (recipes), maintaining ThemeDebug's purpose-based
    structure.

    - [x] **2.3.1 Create test component using all button variants**

        - Created ButtonPatternsSection.tsx using built-in Chakra `<Button>` with recipe variants
        - Pattern: `import { Button } from "@chakra-ui/react"` + `<Button variant="solid">`
        - NO wrapper component needed (built-in Button automatically uses registered recipe)
        - Added to ThemeDebug in Components group (before Forms section)
        - Added "Buttons" jump link to sticky header navigation
        - Demonstrates all 5 variants: solid, primary-outline, neutral-outline, subtle (with selection), ghost
        - Shows interaction states: default, hover, active, focus, disabled
        - Implementation note included (recipe system as detail, not focus)
        - Removed redundant "Core Actions" section from SemanticColorsSection (eliminated duplication)

    - [x] **2.3.2 Visual validation across themes**

        Ready for manual testing:
        - Navigate to `/dev/theme-debug` and scroll to "Button Patterns" section
        - Test all variants in all 4 themes (IBM Carbon, GitHub Primer, GitLab Pajamas, Material Design 3)
        - Test both light and dark modes (toggle via color mode button)
        - Validate interaction states: hover colors, active states, focus rings, disabled opacity
        - Check subtle variant selection state (selected vs unselected appearance)

        **Note:** Visual validation performed by user during testing. No issues anticipated as recipes
        reference same semantic tokens already validated across themes in Phase 7.

- [x] **2.4 Migrate components to use button recipes**

    **Completed:** Systematically migrated all button patterns to recipe usage.

    **Migration summary:**
    - Solid buttons (3): MovieDetail.tsx (2), VerifyEmail.tsx (1)
    - Primary-outline buttons (1): SidebarContent.tsx
    - Neutral-outline buttons (10): Login.tsx (2), ThemeSelector, NavBarUserMenu, MobileMenuButton, ColorModeButton,
    MovieDetail, VerifyEmail (2)
    - Subtle buttons (3): Featured.tsx
    - Skipped: Filter controls (AdvancedFilterToggle, CollapsibleSearchBox) per documented design intent

    **Pattern deviations found and fixed:**
    - MovieDetail.tsx and VerifyEmail.tsx had `color: "tertiary"` in `_hover` state (not in recipe)
    - Migrated to standard recipe pattern (text color stays constant on hover)
    - One conditional button (watchlist toggle) kept inline styles (runtime conditional between primary/secondary)

    - [x] **2.4.1 Migrate solid buttons**
        - Migrated 3 solid buttons across 2 files
        - All imports unchanged (kept `import { Button } from "@chakra-ui/react"`)
        - Replaced inline styles with `variant="solid"`

    - [x] **2.4.2 Migrate outline buttons**
        - Migrated 11 outline buttons (1 primary-outline, 10 neutral-outline)
        - Skipped filter controls per special case documentation
        - All imports unchanged

    - [x] **2.4.3 Migrate subtle and ghost buttons**
        - Migrated 3 subtle buttons in Featured.tsx
        - No ghost buttons found with inline hover states
        - All imports unchanged

    - [x] **2.4.4 Run full quality gates**
        - ✅ Frontend linting: 0 violations
        - ✅ TypeScript: 0 errors (after container restart cleared TS server cache)
        - ✅ Frontend tests: 453 passed (25 test files)
        - ✅ Visual validation: passed

### **Phase 3:** Form Control Recipes (Mixed Priority - Select only)

**IMPORTANT:** Input/Textarea patterns CANNOT be expressed as recipes due to complex
`:hover:not(:focus)` pseudo-selectors and `color-mix()` CSS functions. Create wrapper
components instead (like TextLink pattern for special cases). Only Select.Trigger is recipe-compatible.

- [x] **3.1 Create Input/Textarea wrapper components** ⚠️ NOT RECIPES ✅

    **Completed:** 2025-11-14

    Created wrapper components following TextLink pattern (encapsulated styling, no separate utility file).
    Migrated ThemeDebug sections (FormControlsSection and UIElementTokensSection) to use wrappers.

    - [x] **3.1.1 Create `frontend/src/components/common/StyledInput.tsx`** ✅
        - Wrapper around Chakra Input with ADR-015 border-only focus pattern
        - Accepts `layer?: "01" | "02"` prop (defaults to "01")
        - Layer-aware borders: `border-strong-01/02` (base), `border-strong-02/03` (hover)
        - Hover: `&:hover:not(:focus)` → upgraded border + `tertiary/8` background tint
        - Focus: `tertiary` border (border change is sufficient, no outline ring per ADR-015)
        - Uses CSS variable syntax for `color-mix()` in css prop
        - Forwards all Chakra Input props via `{...props}`
        - Exported from `components/common/index.ts`

    - [x] **3.1.2 Create `frontend/src/components/common/StyledTextarea.tsx`** ✅
        - Same pattern as StyledInput (wrapper around Chakra Textarea)
        - Accepts same `layer?: "01" | "02"` prop
        - Duplicates ADR-015 styling logic for encapsulation (68 lines total)
        - Forwards all Chakra Textarea props via `{...props}`
        - Exported from `components/common/index.ts`

    - [x] **3.1.3 Test wrapper components across themes** ✅
        - Migrated ThemeDebug FormControlsSection to use wrappers (5 instances replaced)
        - Migrated ThemeDebug UIElementTokensSection to use StyledInput (1 instance replaced)
        - Pattern consistency verified: all inline Input/Textarea patterns replaced
        - ThemeDebug now serves as live testing ground for manual browser validation
        - Quality checks passed: linting 0 violations, TypeScript 0 errors

- [x] **3.2 Create Select recipes** ✅

    **Completed:** 2025-11-14

    Created slot recipe for Select component (multi-part: trigger, content, item).
    Registered in `baseConfig.theme.slotRecipes.select`.

    - [x] **3.2.1 Create `frontend/src/theme/recipes/select.ts`** ✅
        - Used `defineSlotRecipe` for multi-part component (3 slots)
        - **Trigger slot**: Button-like styling with border hierarchy
            - Border: `border-strong-01` (default) → `border-strong-02` (hover)
            - Hover: Adds `tertiary/8` background tint
            - Focus: `_focusVisible` with `ring` token (keyboard-only)
        - **Content slot**: Dropdown container styling
            - Background: `muted` (elevated surface)
            - Border: `border-subtle-02` (subtle definition)
            - Shadow: `md` for depth
        - **Item slot**: Base styles for options
            - Hover: `tertiary/12` background (non-selected)
            - Note: Selected state handled by component runtime conditionals
        - Exported from `recipes/index.ts`
        - Imported and registered in `theme/index.ts` at `slotRecipes.select`

    - [x] **3.2.2 Test Select recipes** ✅
        - Ran typegen: `npx @chakra-ui/cli typegen src/theme/index.ts`
        - Restarted frontend container to clear TS server cache
        - Quality checks passed: linting 0 violations, TypeScript 0 errors
        - ThemeDebug FormControlsSection has Select components for manual browser testing
        - Ready for manual validation: trigger hover/focus, item states, keyboard navigation

- [x] **3.3 Migrate form control components** ✅

    **Completed:** 2025-11-14

    Migrated all standard Input components to StyledInput wrapper.
    Fixed consistency issues in all Select components (item hover text color, borderColor tokens).

    - [x] **3.3.1 Migrate Input/Textarea components to wrapper components** ✅
        - **Inputs migrated: 5 total**
            - Register.tsx: 3 inputs (email, username, password)
            - Login.tsx: 2 inputs (username, password)
        - Replaced inline ADR-015 CSS patterns with `<StyledInput />` component
        - **Edge cases identified (kept as-is):**
            - NavBarSearch: Highly custom (no border, integrated with search button)
            - CollapsibleSearchBox: Highly custom (animated collapse, no border, integrated button)
        - All migrated inputs verified for ADR-015 compliance
        - Quality checks passed

    - [x] **3.3.2 Migrate Select components** ✅
        - **Fixed consistency issues across all 3 Select components:**
            - ConnectedDropdowns (genre + year filters):
                - Fixed item non-selected text color: `undefined` → `"foreground"`
                - Fixed item hover text color: selected keeps `"on-tertiary"`, unselected keeps `"foreground"`
                - Fixed "Any Genre" selection indicator (shows as selected when genres array empty)
                - Fixed Content borderColor: `"border"` → `"border-subtle-02"`
                - Added keyboard-only focus indicators: `_focusVisible` with tertiary border (WCAG 2.4.7)
            - SortSelector (advanced filters):
                - Fixed deprecated Trigger borderColor: `"input"` (css) → `"border-strong-01"` (prop)
                - Fixed item non-selected text color: `undefined` → `"foreground"`
                - Fixed item hover text color: selected keeps `"on-tertiary"`, unselected keeps `"foreground"`
                - Fixed Content borderColor: `"border"` → `"border-subtle-02"`
            - SortDropdownMinimal (letterboxd-style filters):
                - Fixed item hover text color: selected keeps `"on-tertiary"`, unselected keeps `"foreground"`
                - Fixed Content borderColor: `"border"` → `"border-subtle-02"`
                - Added keyboard-only focus indicator: `_focusVisible` with tertiary border
            - CollapsibleSearchBox (incidental):
                - Fixed button left border appearing on input focus (removed input focus border)
                - Added `_focusWithin` tertiary border on container for WCAG compliance
        - **Pattern established:** Unselected item hover keeps foreground text (good contrast with tertiary/12 bg)
        - **Accessibility:** Keyboard-only focus indicators across all filter controls
        - Quality checks passed

    - [x] **3.3.3 Run full quality gates** ✅
        - Frontend linting: 0 violations
        - TypeScript: 0 errors
        - Visual validation: passed

### **Phase 4:** Alert and Badge Recipes (Medium Priority)

- [x] **4.1 Create Alert recipes** ✅

    - [x] **4.1.1 Create `frontend/src/theme/recipes/alert.ts`** ✅

        **Completed:** 2025-11-15

        **Created:** `frontend/src/theme/recipes/alert.ts` - Alert slot recipe with 4 semantic status variants

        **Implementation details:**
        - ✅ Used `defineSlotRecipe` with slots: `root`, `indicator`, `title`, `description`
        - ✅ Defined 4 status variants: `success`, `warning`, `error` (maps to destructive token), `info`
        - ✅ 10% opacity backgrounds (`success/10`, `warning/10`, etc.)
        - ✅ Semantic color borders (matches background semantic color)
        - ✅ Indicator/icon colors: semantic color for visual emphasis
        - ✅ Title colors: semantic color for emphasis on subtle backgrounds
        - ✅ Description colors: foreground for maximum readability
        - ✅ Registered in `baseConfig.theme.slotRecipes.alert`
        - ✅ Exported from `theme/recipes/index.ts`
        - ✅ Imported and registered in `theme/index.ts`

        **Critical fix:** Slot name corrected from "icon" → "indicator" to match Chakra v3's `Alert.Indicator` component

        **Strategy alignment:** Recipe matches strategy-semantic-tokens.md patterns exactly (lines 495-582):
        - Alert containers: 10% opacity backgrounds + semantic borders
        - Title/icon: Semantic color emphasis
        - Description: Foreground for readability on subtle backgrounds

    - [x] **4.1.2 Test Alert recipes across themes** ✅

        **Completed:** 2025-11-15

        **Testing approach:**
        - ✅ Updated ThemeDebug FeedbackStatusSection to use Alert recipe
        - ✅ Removed inline style overrides (bg, borderColor, borderWidth, color props)
        - ✅ Alerts now use `status="success|warning|error|info"` prop only
        - ✅ Built-in `<Alert.Root>` component automatically applies recipe styles
        - ✅ Ran typegen: `npx @chakra-ui/cli typegen ./src/theme/index.ts`
        - ✅ Restarted frontend container to clear TS server cache

        **Visual validation:**
        - Icons now display with correct semantic colors (via indicator slot)
        - Backgrounds: 10% opacity tints (success/10, warning/10, etc.)
        - Borders: Semantic colors matching status
        - Title: Semantic color emphasis
        - Description: Foreground for readability

        **Comparison with original:**
        - Original: Inline props (`bg="success/10"`, `borderColor="success"`, `color="success"`)
        - Recipe: Same visual output, centralized definition, no inline overrides needed
        - Both implementations follow strategy doc patterns - recipe just eliminates repetition

- [x] **4.2 Create Badge recipes** ✅

    - [x] **4.2.1 Create `frontend/src/theme/recipes/badge.ts`** ✅

        **Completed:** 2025-11-15

        **Created:** `frontend/src/theme/recipes/badge.ts` - Badge recipe with 6 semantic variants

        **Implementation details:**
        - ✅ Used `defineRecipe` (Badge is single-part component)
        - ✅ Defined 5 variants: `success`, `warning`, `error`, `info`, `neutral`
        - ✅ Status badges: Solid fills with `on-*` color pairs (success/on-success, etc.)
        - ✅ Neutral badge: Uses `badge`/`on-badge` tokens for genres, content ratings
        - ✅ **Fixed legacy naming:** Used canonical `on-badge` (ADR-011) instead of deprecated `-foreground` suffix
        - ✅ Registered in `baseConfig.theme.recipes.badge`
        - ✅ Exported from `theme/recipes/index.ts`
        - ✅ Imported and registered in `theme/index.ts`

        **Critical fix:** Updated to use canonical `on-*` naming for CineXplorer extensions:
        - `badge` + `on-badge` (not `badge-foreground`)

        **Strategy alignment:** Recipe matches strategy patterns and UnifiedTheme canonical tokens

    - [x] **4.2.2 Test Badge recipes** ✅

        **Completed:** 2025-11-15

        **Testing approach:**
        - ✅ Updated ThemeDebug FeedbackStatusSection to use Badge recipe
        - ✅ Removed inline style overrides (bg, color props)
        - ✅ Badges now use single `variant="success|warning|error|info|neutral|rating"` prop
        - ✅ Built-in `<Badge>` component automatically applies recipe styles
        - ✅ Ran typegen: `npx @chakra-ui/cli typegen ./src/theme/index.ts`
        - ✅ Restarted frontend container to clear TS server cache
        - ✅ Added rating badge example to demonstrate IMDb gold aesthetic

        **Visual validation:**
        - Status badges: Solid fills with semantic colors
        - Neutral badges: Gray background for categorization
        - Rating badge: Gold background (IMDb-style) for scores
        - All badges use canonical on-* foreground tokens

        **Comparison with original:**
        - Original: Inline props (`bg="success"`, `color="on-success"`)
        - Recipe: Same visual output, centralized definition, no inline overrides needed
        - Both implementations follow ADR-011 canonical naming

    **CRITICAL CLEANUP (2025-11-15):** Discovered incorrect pattern in ThemeDebug

    **Issue found:**
    - FeedbackStatusSection showed "Rating Badge (TMDB scores)" using `variant="rating"`
    - This was INCORRECT - TMDB scores actually use status colors (success/info/warning) based on thresholds
    - `rating` token was only used for IMDb gold star icons (★), not badge backgrounds
    - `on-rating` token was unnecessary - stars are just colored icons, no text on rating background

    **Cleanup performed:**
    - ✅ Removed `rating` variant from Badge recipe (reduced from 6 to 5 variants)
    - ✅ Renamed `rating` token → `imdb-gold` in UnifiedTheme (more accurate naming)
    - ✅ Removed `on-rating` and `rating-foreground` tokens entirely (not needed)
    - ✅ Updated all 4 theme definitions (github, ibm-carbon, gitlab-pajamas, material-design-3)
    - ✅ Updated CineXplorerExtensionsSection to use `color="imdb-gold"` for star icons
    - ✅ Removed rating badge example from FeedbackStatusSection
    - ✅ Added note explaining TMDB scores use status variants, not rating variant

    **Actual usage patterns (confirmed):**
    - **TMDB community scores:** Use Badge with status variants based on thresholds
        - ≥7.5: `variant="success"` (green)
        - 5.0-7.4: `variant="info"` (blue)
        - <5.0: `variant="warning"` (yellow)
    - **User personal ratings:** Use star icons (★) with `color="imdb-gold"`
    - **Genre badges:** Use `variant="neutral"`

    **Final Badge recipe variants:** success, warning, error, info, neutral (5 total)

    **Strategy doc updated (2025-11-15):**
    - ✅ Fixed "Movie Ratings" section (lines 1248-1277) to show correct TMDB score pattern
    - ✅ Updated token reference table (line 1687-1691) with threshold-based variants
    - ✅ Fixed navigation tree (lines 73-76) to show actual patterns
    - ✅ Updated examples section (lines 1746-1750) to use correct tokens
    - ✅ Fixed decision flowchart (lines 1756-1764) to guide correct usage
    - ✅ Removed all `rating-foreground` and `on-rating` references
    - ✅ Documented `imdb-gold` as icon color only (not background)

- [ ] **4.3 Migrate Alert and Badge components**

    **Pattern:** Replace inline styles with variant props, keep existing imports

    **Note:** During migration, if you find Alert/Badge patterns that deviate from strategy doc:
    - Fix component to match strategy doc patterns (preferred)
    - OR document deviation in notes file if it reveals legitimate edge case

    - [ ] **4.3.1 Migrate Alert usages**
        - Keep imports: `import { Alert } from "@chakra-ui/react"` (NO changes)
        - Replace inline styles with `status="success"` / `status="warning"` / etc.
        - Built-in Alert automatically uses registered slot recipe

    - [ ] **4.3.2 Migrate Badge usages**
        - Keep imports: `import { Badge } from "@chakra-ui/react"` (NO changes)
        - Replace inline styles with `variant="rating"` / `variant="genre"` / etc.
        - Built-in Badge automatically uses registered recipe

    - [ ] **4.3.3 Run quality gates**
        - Frontend linting: 0 violations
        - TypeScript: 0 errors
        - Visual validation across all themes

### **Phase 5:** Remaining Component Recipes (Lower Priority)

- [x] **5.1 SKIP - Link recipes not needed** ✅

    **Decision:** TextLink component stays as-is. Recipes add no value here.

    **Rationale** (from Task 1.1.2 + TextLink analysis):
    - Single pattern (no variants to manage like buttons have 5)
    - Requires React Router integration (`asChild` + `RouterLink`) - can't express in recipe
    - Already well-encapsulated as 73-line component
    - Recipe would just duplicate 4-5 style props, component still needed for Router logic
    - Links (`<a>`) are semantically different from buttons - not part of button pattern system

    **Action:** No work needed. Skip to Phase 5.2 (Checkbox/Radio/Switch).

- [ ] **5.2 Create Checkbox/Radio/Switch recipes**

    - [ ] **5.2.1 Create `frontend/src/theme/recipes/checkbox.ts`**
        - Use `defineRecipe` (single-part)
        - Border width (2px), default border (input)
        - Checked state (primary bg, primary border)
        - Hover state
        - Register in `theme.recipes.checkbox`

    - [ ] **5.2.2 Create `frontend/src/theme/recipes/radio.ts`**
        - Use `defineRecipe` (single-part)
        - Same pattern as checkbox (different shape)
        - Register in `theme.recipes.radio`

    - [ ] **5.2.3 Create `frontend/src/theme/recipes/switch.ts`**
        - Use `defineSlotRecipe` (multi-part: track, thumb)
        - Track colors (muted off, primary on)
        - Thumb color (background)
        - Register in `theme.slotRecipes.switch`

    - [ ] **5.2.4 Test and migrate form control components**
        - Keep imports: `import { Checkbox, Radio, Switch } from "@chakra-ui/react"` (NO changes)
        - Built-in components automatically use registered recipes
        - Run typegen after creating recipes: `npx @chakra-ui/cli typegen ./theme.ts`
        - **Restart frontend container** to clear TS server cache:
        `docker compose -f infrastructure/docker-compose.yml restart frontend`
        - Verify types recognized (custom variants in IDE autocomplete)

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

    **Goal:** Transform strategy doc to use recipe-focused guidance (leaner, more semantic).

    **When:** After all recipes implemented (Phases 2-5 complete). Do all-at-once to maintain consistency.

    **What changes:**
    - Replace verbose inline examples (10+ lines) with clean recipe usage (1 line)
    - Keep decision trees, semantic guidance, when/why rationale (core value!)
    - Add recipe variant reference tables (quick lookup)
    - Link to recipe files for implementation deep dives
    - Document edge cases requiring component-level styling (Input/Textarea utilities)

    **What stays:**
    - Decision trees ("Which button pattern?")
    - Semantic guidance ("When to use solid vs outline")
    - Pattern hierarchy explanations
    - WCAG compliance notes
    - Token meanings (but lighter touch - recipes abstract details)

    - [ ] **6.1.1 Update Button section**
        - Replace Pattern 1-6 code examples
        - Reference recipe variants instead
        - Show how to use: `<Button variant="neutral-outline">` (Note: Must use "variant", NOT "visual"!)
        - Link to buttonRecipe definition for implementation details

    - [ ] **6.1.2 Update Form Controls section**
        - Update Input/Textarea examples with wrapper component usage (NOT recipes!)
        - Show StyledInput/StyledTextarea pattern (similar to TextLink pattern)
        - Document layer prop usage for context-appropriate borders
        - Update Select examples with recipe usage

    - [ ] **6.1.3 Update Alert/Badge sections**
        - Update with recipe variant usage
        - Maintain guidance on when to use which variant

- [ ] **6.2 Update ThemeDebug.tsx**

    - [ ] **6.2.1 Update CoreActionsSection to use recipes**
        - Demonstrate all button recipe variants
        - Show hover/focus/active states

    - [ ] **6.2.2 Update FormControlsSection**
        - Demonstrate StyledInput/StyledTextarea wrapper components with ADR-015 patterns (NOT recipes!)
        - Show layer prop usage for different contexts
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
