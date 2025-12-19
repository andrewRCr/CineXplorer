# Incidental: Chakra UI v3 Recipe System Implementation

**Created:** 2025-11-14
**Completed:** 2025-11-17
**Base branch:** `technical/service-layer-modernization`
**Branch:** `incidental/chakra-recipe-system-implementation`
**Status:** Complete
**Related Notes:** `notes-chakra-recipe-system-implementation.md`

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

- [x] **4.3 Migrate Alert and Badge components** ✅

    **Completed:** 2025-11-15

    **Pattern:** Replace inline styles with variant props, keep existing imports

    **Note:** During migration, if you find Alert/Badge patterns that deviate from strategy doc:
    - Fix component to match strategy doc patterns (preferred)
    - OR document deviation in notes file if it reveals legitimate edge case

    - [x] **4.3.1 Migrate Alert usages** ✅
        - VerifyEmail.tsx: Removed inline style overrides (borderRadius, border, borderColor, boxShadow)
        - FeedbackStatusSection.tsx: Already using recipe (completed in Task 4.1.2)
        - Alert.Root status prop preserved (recipe automatically applies)
        - Imports unchanged: `import { Alert } from "@chakra-ui/react"`

    - [x] **4.3.2 Migrate Badge usages** ✅
        - MovieUserScore.tsx: Replaced bg/color props with variant prop
        - Refactored getTmdbBadgeColors/getUserRatingBadgeColors to return variant names
        - Helper functions now return "success" | "info" | "warning" variants
        - Removed inline bg, color, borderRadius overrides
        - Kept fontSize, paddingX, fontFamily for component-specific sizing
        - FeedbackStatusSection.tsx: Already using recipe (completed in Task 4.2.2)
        - Imports unchanged: `import { Badge } from "@chakra-ui/react"`

    - [x] **4.3.3 Run quality gates** ✅
        - ✅ Frontend linting: 0 violations
        - ✅ TypeScript: 0 errors
        - ⏭️ Visual validation: passed

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

- [x] **5.2 Create Checkbox/Radio/Switch recipes** ✅

    **Completed:** 2025-11-15

    **Summary:** Successfully implemented slot recipes for all three form control types. Key learning: Checkbox,
    Radio, and Switch are all multi-part components requiring `defineSlotRecipe`, not single-part `defineRecipe`.
    Recipes must match Chakra's slot structure exactly (e.g., `itemIndicator` for RadioGroup, not just `indicator`).

    - [x] **5.2.1 Create `frontend/src/theme/recipes/checkbox.ts`** ✅

        **Completed:** 2025-11-15

        **Created:** `frontend/src/theme/recipes/checkbox.ts` - Checkbox slot recipe with form control patterns

        **Implementation details:**
        - ✅ Used `defineSlotRecipe` (Checkbox is multi-part: root, control, indicator, label)
        - ✅ Slots: `["root", "control", "indicator", "label"]`
        - ✅ Control slot: 2px border `border-strong-01` (default), `primary` bg + border when checked
        - ✅ Indicator slot: `on-primary` color when checked (checkmark icon)
        - ✅ Hover states: Unchecked (`border-strong-02` + `tertiary/8` bg), Checked (`primary-hover`)
        - ✅ Focus state: 2px `ring` outline with 2px offset
        - ✅ Variants: solid (default), outline, subtle
        - ✅ Registered in `baseConfig.theme.slotRecipes.checkbox`
        - ✅ Exported from `theme/recipes/index.ts`
        - ✅ Imported and registered in `theme/index.ts`
        - ✅ Ran typegen: `npx @chakra-ui/cli typegen ./src/theme/index.ts`

        **Pattern alignment:**
        - 2px borders differentiate checkboxes from text inputs (1px)
        - Matches strategy doc form control patterns
        - Hover states follow button patterns (subtle background tint)

    - [x] **5.2.2 Create `frontend/src/theme/recipes/radio.ts`** ✅

        **Completed:** 2025-11-15

        **Created:** `frontend/src/theme/recipes/radio.ts` - RadioGroup slot recipe with form control patterns

        **Implementation details:**
        - ✅ Used `defineSlotRecipe` (RadioGroup is multi-part: root, item, itemControl, itemIndicator, label, itemText)
        - ✅ Slots: `["root", "item", "itemControl", "itemIndicator", "label", "itemText"]`
        - ✅ ItemControl slot: 2px border `border-strong-01` (default), `primary` bg + border when checked
        - ✅ ItemIndicator slot: `on-primary` bg when checked (inner dot), sized at 50% width/height for visibility
        - ✅ Hover states: Unchecked (`border-strong-02` + `tertiary/8` bg), Checked (`primary-hover`)
        - ✅ Focus state: 2px `ring` outline with 2px offset
        - ✅ Variants: solid (default), outline, subtle
        - ✅ Registered in `baseConfig.theme.slotRecipes.radioGroup` (camelCase for TypeScript compatibility)
        - ✅ Exported from `theme/recipes/index.ts`
        - ✅ Imported and registered in `theme/index.ts`
        - ✅ Ran typegen: `npx @chakra-ui/cli typegen ./src/theme/index.ts`

        **Pattern alignment:**
        - Identical to checkbox - same token usage, different visual shape (circle vs square)
        - 50% sizing on indicator ensures visible dot (critical for UX)
        - Matches strategy doc: "Pattern identical to checkboxes"

    - [x] **5.2.3 Create `frontend/src/theme/recipes/switch.ts`** ✅

        **Completed:** 2025-11-15

        **Created:** `frontend/src/theme/recipes/switch.ts` - Switch slot recipe with toggle patterns

        **Implementation details:**
        - ✅ Used `defineSlotRecipe` (Switch is multi-part: control + thumb)
        - ✅ Control (track) slots:
            - Default (off): `muted` background
            - Checked (on): `primary` background
        - ✅ Thumb slot: `background` (consistent in all states)
        - ✅ Focus state: 2px `ring` outline with 2px offset
        - ✅ Registered in `baseConfig.theme.slotRecipes.switch`
        - ✅ Exported from `theme/recipes/index.ts`
        - ✅ Imported and registered in `theme/index.ts`
        - ✅ Ran typegen: `npx @chakra-ui/cli typegen ./src/theme/index.ts`

        **Pattern alignment:**
        - No visible borders - relies on background color contrast
        - Track provides visual state feedback (muted → primary)
        - Matches strategy doc switch patterns
        - Consistent with ThemeDebug Switch demonstration

    - [x] **5.2.4 Test and migrate form control components** ✅

        **Completed:** 2025-11-15

        **ThemeDebug updates:**
        - ✅ Checkbox demos: Removed all inline `borderColor`, `_checked` props
        - ✅ Radio demos: Removed all inline `borderColor`, `_checked` props, **added `<RadioGroup.ItemIndicator />`**
        - ✅ Switch demos: Removed all inline `bg`, `_checked` props
        - ✅ **Fixed Switch "On" state:** Changed `switchChecked` initial state from `false` to `true`
        - ✅ Components now use recipes automatically

        **Critical fix - Radio ItemIndicator:**
        - **Issue:** Radio selected state showed primary background but no visible dot
        - **Root cause:** `ItemControl` was self-closing, missing `ItemIndicator` child component
        - **Fix:** Changed from `<RadioGroup.ItemControl />` to nested structure with `<RadioGroup.ItemIndicator />` child
        - **Result:** Dot now renders correctly (50% size, `on-primary` background when checked)

        **In-app components:**
        - ✅ Login.tsx: Already uses correct inline patterns (no recipe migration needed per notes)
        - ✅ GenreSelector.tsx: Already uses correct inline patterns (no recipe migration needed per notes)

        **Quality gates:**
        - ✅ Frontend linting: 0 violations
        - ✅ TypeScript: 0 errors
        - ✅ Types regenerated successfully

        **Visual validation:**
        - ✅ Checkboxes: Primary background when checked, hover states working
        - ✅ Radio buttons: Primary background + visible white dot when selected, hover states working
        - ✅ Switch: Correct colors and states (muted → primary)

- [x] **5.3 Create Card recipes** ✅ **SKIPPED - Not needed**

    **Completed:** 2025-11-15

    **Decision:** No Card recipe needed

    **Rationale:**

    - **No Card usage in ThemeDebug:** Zero card pattern demonstrations
    - **No documented pattern:** Strategy doc only uses cards as token examples, not codified patterns
    - **MovieCard is specialized:** One-off design with custom hover effects, image transforms, specific aspect
      ratios - too specialized to benefit from recipe abstraction
    - **No repetition:** MovieCard is the only Card usage in the entire app
    - **Future cards would be simple:** Generic cards would just use `<Card.Root bg="layer-01">` (tokens handle
      styling, no recipe needed)

    **Recipe value requires:**

    1. Multiple variants (cards have none - just layer surface)
    2. Repeated usage across components (only 1 card exists)
    3. Codified patterns needing centralization (cards are token examples only)

    **Conclusion:** Cards don't meet criteria for recipe system. Token-based styling is sufficient.

### **Phase 6:** Button Pattern Consolidation and Final Documentation Updates

- [x] **6.1 Audit and consolidate button patterns** ✅ **COMPLETED 2025-01-15**

    **Goal:** Analyze experimental button patterns, validate semantic use cases, and consolidate to final 5 variants.

    **Context:** Phase 2-5 implementation added 7 button variants for testing (solid, solid-alt, primary-outline,
    secondary, neutral-outline, neutral-outline-alt, subtle, ghost). Need to evaluate which patterns are truly needed
    based on real semantic use cases.

    **Decisions made:**

    1. **Interaction state tokens strengthened globally**
        - Original Material Design 3 defaults (8% hover, 12% active) too subtle across theme combinations
        - Tested 12% hover and 16% active - noticeable improvement in visibility
        - Updated `deriveInteractionStates()` to use improved percentages globally
        - **Decision:** Update all interaction state tokens (primary-hover, secondary-hover, layer-hover-*, etc.)
        - Affects: Solid buttons, subtle buttons, interactive surfaces, theme selector, watchlist buttons
        - Result: Consistent 12%/16% overlay across entire application

    2. **Secondary vs Outline distinction validated**
        - Identified legitimate semantic difference:
            - **Secondary**: For form pairs (Save + Cancel) - primary text creates visual tie
            - **Outline**: For standalone utility (Back, OAuth, filters) - neutral text
        - Both use same hover effect (primary/8 bg) but differ in default text color
        - This makes "secondary" literally mean "the secondary button in a primary/secondary pair"
        - **Decision:** Keep both variants with distinct use cases

    3. **Border color on secondary hover**
        - Initial implementation used primary border on hover (too much color with primary text)
        - **Decision:** Use border-strong-01 (stronger grey) instead - more balanced

    4. **Eliminate redundant outline variants**
        - primary-outline: Rarely used, redundant with secondary for branded actions
        - neutral-outline (with tertiary hover): Being replaced by neutral-outline-alt (primary hover)
        - **Decision:** Delete both, consolidate to single "outline" pattern

    **Final 5-variant lineup:**

    1. **solid** - Primary actions (12% hover, improved visibility)
    2. **secondary** - Form pair secondary action (primary text + grey border + primary/8 hover)
    3. **outline** - Standalone utility action (grey text + grey border + primary/8 hover + primary border on hover)
    4. **subtle** - Embedded in panels (unchanged)
    5. **ghost** - Dismissive/tertiary (unchanged)

    **Implementation changes:**

    - `frontend/src/theme/color/utils.ts` - Updated `deriveInteractionStates()` to 12%/16% (from 8%/12%)
    - `frontend/src/theme/recipes/button.ts` - Consolidated to 5 variants, removed inline color-mix overrides
    - `frontend/src/theme/index.ts` - Updated recipe comment
    - `frontend/src/pages/dev/theme-debug/sections/ButtonPatternsSection.tsx` - Updated to show 5 final variants with
    token names
    - Component migrations: `neutral-outline` → `outline`, `primary-outline` → `outline` (10 files)

    **Rationale:**

    - **Semantic clarity:** Each variant has distinct use case (not just visual preference)
    - **Context-aware:** Secondary vs outline distinction based on whether paired with primary action
    - **Simplified:** Down from 7 experimental to 5 production variants
    - **Improved UX:** Global interaction state improvement (12%/16% vs MD3's 8%/12%) - more visible across all themes
    - **Token alignment:** Semantic tokens now match actual usage (no misleading names)
    - **Eliminated confusion:** No more choosing between primary/neutral/neutral-alt outline variants

    **Quality gates:** ✅ All passed
    - TypeScript type generation: ✅ Success
    - Frontend linting: ✅ 0 violations
    - Type checking: ✅ 0 errors
    - Visual testing: ✅ All variants work across all themes/modes

    **Architecture decision record:**
    - **ADR-016** created: "Improve Interaction State Contrast from Material Design 3 Defaults"
    - Documents decision to improve from 8%/12% to 12%/16% globally
    - Partially supersedes ADR-009 (methodology preserved, percentages improved)
    - Based on empirical A/B testing across 8 theme/mode combinations

- [x] **6.2 Update strategy-semantic-tokens.md**

    **Completed:** Strategy doc updated and split into two focused documents (strategy-component-styling.md and strategy-color-tokens.md)

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

    - [x] **6.2.a Update Button section** ✅

        **Completed:** Replaced verbose Pattern 1-6 examples with lean, recipe-focused guidance for 5 finalized variants.

        **Changes made:**

        - Replaced 6 verbose patterns with 5 lean variant sections (solid, secondary, outline, subtle, ghost)
        - Added Button Variants Quick Reference table for at-a-glance lookup
        - Replaced verbose inline code examples with clean recipe usage: `<Button variant="solid">`
        - **Documented secondary vs outline distinction** with dedicated subsection:
            - Secondary: For form pairs (primary text creates visual tie)
            - Outline: For standalone utility (grey text)
            - Real-world examples showing when to use each
        - Updated decision tree to reflect 5 variants and context-based secondary/outline choice
        - Added Implementation Notes section linking to recipe file for implementation details
        - Converted long semantic token lines to bulleted lists for readability
        - **Document is now ~40% shorter** while retaining all decision-making guidance
        - All markdown linting violations fixed (line length, formatting)

        **What was kept (core value):**

        - Decision trees ("Which button variant?")
        - Semantic guidance on when/why to use each variant
        - WCAG compliance notes (selection tokens rationale)
        - Critical distinctions (secondary vs outline, text color behavior on hover)

        **What was removed (implementation detail):**

        - Verbose inline style objects with `_hover`, `_active`, `_focusVisible`
        - Redundant token explanations now abstracted by recipes
        - Pattern 2 (primary-outline) - eliminated in Phase 6.1 consolidation

    - [x] **6.2.b Update Form Controls section** ✅

        **Completed:** Replaced verbose examples with minimal usage patterns - show WHAT to write, not what happens internally.

        **Changes made:**

        **Form Inputs section (lines 856-889):**
        - **Reduced from ~65 lines to ~34 lines** (48% reduction)
        - Minimal usage example: `<StyledInput />` with optional `layer` prop
        - Removed: All CSS syntax details, token listings, interaction state explanations
        - Kept: Layer prop decision guidance, "What the wrapper provides" bullet list, ADR-015 reference
        - Focus: Clean API, not internal implementation

        **Select section (lines 891-942):**
        - **Reduced from ~83 lines to ~52 lines** (37% reduction)
        - Minimal usage: Standard Chakra Select structure (recipe handles styling automatically)
        - Shows selected state conditionals as edge case (recipe limitation), not main pattern
        - Removed: All token listings, focus indicator details, redundant WCAG explanations
        - Kept: "What the recipe provides" bullet list, selected state requirement, recipe reference
        - Focus: Clean usage pattern with edge case callout

        **Key principle applied (per user feedback):**
        Show what developers WRITE, not what happens under the hood. Recipes/wrappers abstract the implementation -
        strategy doc should reflect that abstraction, not explain it in detail.

        **Refinement pass (post-user feedback):**
        - Removed ALL token listings (button variants) - not needed for building
        - Removed percentage details (12%/16%) - delegate to ADR-016
        - Kept relationship guidance ("visual tie", "stronger grey not primary border")
        - Added WCAG assertions with ADR cross-references
        - Added critical distinction (Select keyboard-only rings vs Input border-only)
        - **Final result:** Show usage + rationale for choices, delegate implementation to ADRs/recipes

        **All markdown linting violations fixed**

    - [x] **6.2.c Update Alert/Badge sections** ✅

        **Completed:** Replaced verbose Status Indicators section with lean recipe-focused guidance.

        **Changes made:**

        **Status Indicators section (lines 418-503):**
        - **Reduced from ~175 lines to ~87 lines** (50% reduction)
        - Replaced 4 verbose status examples (Success/Warning/Error/Info) with single clean Alert usage
        - Replaced verbose Badge examples with single usage + variant table
        - Removed: All token listings, opacity value details, redundant explanations
        - Kept: Decision tables (when to use which variant), critical distinction (Alert vs Badge text colors),
          token naming convention (ADR-011)
        - Added: "What the recipe provides" bullet lists for both Alerts and Badges
        - Recipe references: `alert.ts` and `badge.ts`

        **Key distinction preserved:**
        Alert descriptions use `foreground` (readability on subtle 10% backgrounds) vs Badge text uses `on-*` pairs
        (high contrast on solid backgrounds). Rationale included but implementation delegated to recipes.

        **All markdown linting violations fixed** (table alignment)

    - [x] **6.2.d Update Checkbox/Radio/Switch sections** ✅ (Oversight - Phase 5 recipes exist but doc not updated)

        **Completed:** Replaced verbose form control examples with lean recipe-focused guidance.

        **Changes made:**

        **Checkbox section (lines 839-866):**
        - **Reduced from ~35 lines to ~28 lines** (20% reduction)
        - Removed: `borderWidth="2px"`, `borderColor="input"`, `_checked` inline props
        - Removed: Token listings, verbose state explanations
        - Kept: 2px border rationale, "What the recipe provides" bullet list
        - Recipe reference: `checkbox.ts`

        **Radio section (lines 899-936):**
        - **Reduced from ~37 lines to ~38 lines** (minimal change, but cleaner structure)
        - Removed: `borderWidth="2px"`, `borderColor="input"`, `_checked` inline props
        - Removed: Token listings, verbose state explanations
        - Kept: 2px border note (identical to checkboxes), "What the recipe provides" bullet list
        - Added: Critical note about `ItemIndicator` requirement (common mistake)
        - Recipe reference: `radio.ts`

        **Switch section (lines 938-964):**
        - **Reduced from ~45 lines to ~27 lines** (40% reduction)
        - Removed: `bg="muted"`, `_checked={{ bg: "primary" }}`, `bg="background"` inline props
        - Removed: Token listings, verbose state explanations
        - Kept: Visual feedback rationale (track color + thumb position), "What the recipe provides" bullet list
        - Recipe reference: `switch.ts`

        **Form Control Border Width Standards table preserved** (lines 868-897) - Important decision guidance
        for understanding 1px vs 2px borders across form control types.

        **All markdown linting violations fixed**

    - [x] **6.2.e Evaluate non-component sections and overall doc structure** ✅

        **Completed:** Systematic evaluation of remaining content (lines 966-1757, ~790 lines) to determine
        recipe-era relevance and optimal document structure.

        **Key findings:**

        **Current doc is actually a hybrid:**
        - First 49%: Component building patterns (buttons, forms, alerts, badges)
        - Last 42%: Token system reference (naming, accessibility, quick ref, brand identity)
        - Name "strategy-semantic-tokens.md" doesn't capture the dual nature

        **Content taxonomy:**
        - ✅ **No changes needed (5 sections):** Muted/Deemphasized Text, Tertiary vs Accent Naming,
          Brand Identity, Drag and Drop, Related Documentation
        - ⚠️ **Minor updates (2 sections):** Accessibility Standards (remove inline button example),
          Developer Quick Reference (update table to show recipe usage)
        - ⚠️ **Major updates (4 sections):** Movie Ratings (update badge usage), Genre Tags (update badge usage),
          Common Patterns (remove button pattern, update percentages to ADR-016), Common Mistakes (remove
          recipe-obsolete examples)

        **Recommended restructure:**
        Split into 2 docs with clear domains:
        - `strategy-component-styling.md` (~900 lines) - How to build components (recipes/wrappers)
        - `strategy-color-token-system.md` (~600 lines) - Token reference, naming, accessibility, quick ref

        **Detailed breakdown documented in task 6.2.f below**

    - [x] **6.2.f Update non-component sections and split into two strategy docs**

        **Completed:** All content updates applied and document successfully split into two focused strategy docs

        **Goal:** Apply recipe-era updates to remaining sections, then split into two focused docs with clear boundaries.

        **Prerequisites:**
        - Read evaluation findings in 6.2.e completion notes above
        - Current doc: `.arc/reference/strategies/project/style/strategy-semantic-tokens.md` (1757 lines)

        - [x] **6.2.f.1 Apply content updates (do BEFORE split)**

            **Completed:** All 6 subtasks (a-f) completed and committed (commit 0394300)

            - [x] **6.2.f.1.a Update Movie Ratings section (lines 1010-1042)** ✅

                **Completed:** Section already correct - uses recipe variants (`variant="success"`,
                `variant="info"`, `variant="warning"`). No `badge-foreground` instances found.
                Token documentation uses proper naming (`success`/`on-success` pairs).

            - [x] **6.2.f.1.b Update Genre Tags section (lines 1043-1066)** ✅

                **Completed:** Updated Badge examples to use `variant="neutral"` and simplified
                tokens documentation to reference recipe pattern. Changed from verbose token
                listing to "Uses `badge` / `on-badge` (recipe handles automatically)".

            - [x] **6.2.f.1.c Update Common Patterns section (lines 1311-1427)** ✅

                **Completed:** Updated opacity philosophy and reference table with accurate ADR-016 framing:

                **A. Interaction State Philosophy** - Reframed from "8%/12% works everywhere" to accurate
                two-tier system: MD3 baseline (8%/12% for secondary/outline/ghost) + ADR-016 improvements
                (12%/16% for solid surfaces - better UX)

                **B. Button Hover Pattern** - Removed entire subsection (redundant with button recipe)

                **C. Opacity Modifier Reference table** - Updated to show semantic tokens (12%/16%) vs
                manual overlays (8%/12% baseline), with note explaining ADR-016 improvements for solid surfaces

                **D. Surface Hover Pattern** - Updated token opacity values (12%/16%) to match actual implementation

            - [x] **6.2.f.1.d Update Accessibility Standards section (lines 1184-1309)** ✅

                **Completed:** Replaced inline Button focus example with brief reference note:
                "All interactive components use keyboard-only focus rings (see button/form recipes for implementation)".
                Maintains accessibility guidance while avoiding redundancy with recipe implementations.

            - [x] **6.2.f.1.e Update Developer Quick Reference section (lines 1429-1530)** ✅

                **Completed:** Updated "By Use Case" table to show recipe usage instead of inline props:

                - Primary button: `<Button variant="solid">`
                - Neutral outline button: `<Button variant="outline">`
                - Subtle button: `<Button variant="subtle">`
                - Ghost button: `<Button variant="ghost">`
                - Success/Warning/Error/Info alerts: `<Alert.Root status="...">`
                - Genre tag: Already correct (`<Badge variant="neutral">`)

                Added note to "Token Count by Category": "Recipes centralize many tokens -
                consult recipe files for implementation details"

            - [x] **6.2.f.1.f Update Common Mistakes section (lines 1532-1714)** ✅

                **Completed:** Removed entire "Incomplete Hover States" section (Ghost + Outline button
                examples now redundant with button recipe) and updated "Custom Focus States" to reference
                StyledInput wrapper instead of inline focus styling.

                **A. Removed "Incomplete Hover States" section** - Entire section deleted (60 lines) including
                Ghost and Outline button hover examples - button recipe handles automatically

                **B. Updated "Custom Focus States"** - Changed from inline Input focus example to StyledInput
                wrapper reference. New note: "StyledInput encapsulates ADR-015 border-only focus pattern and
                ensures consistent focus behavior across all form inputs"

                **C. Kept as-is** - React Router Link Integration, Deprecated Token Aliases, Border Token
                Confusion (still relevant)

        - [x] **6.2.f.2 Execute document split**

            **Completed:** Successfully split strategy-semantic-tokens.md into two focused documents

            - [x] **6.2.f.2.a Create `strategy-component-styling.md`**

                **Completed:** Created comprehensive component styling guide (962 lines) with:
                - Component-focused front matter and quick decision tree
                - Building Surfaces, Buttons, Status Indicators, Interactive Elements (all with recipe references)
                - Building Movie-Specific UI (TMDB ratings, genre badges, drag/drop)
                - Common Patterns (interaction states, opacity overlays, card elevation)
                - Common Mistakes (React Router, focus states, deprecated tokens, border confusion)
                - Related Documentation with cross-refs to color token system and recipes

            - [x] **6.2.f.2.b Create `strategy-color-tokens.md`**

                **Completed:** Created comprehensive color token reference guide (546 lines) with:
                - Token-focused front matter emphasizing naming and accessibility
                - Token Naming Conventions (synthesized from ADR-011, on-* prefix pattern, deprecated aliases)
                - UnifiedTheme Interface Reference (~67 tokens organized by category)
                - Text Color Semantics (muted text, tertiary vs accent)
                - Brand Identity (when to use, brand vs primary distinction, theme-specific availability)
                - Accessibility Standards (contrast requirements, border contrast, WCAG compliance)
                - Developer Quick Reference (by use case table, token count, anti-patterns, flowchart)
                - Related Documentation with cross-refs to component styling and ADRs

            - [x] **6.2.f.2.c Update cross-references**

                **Completed:** Updated all cross-references across documentation:

                **New strategy files (created with cross-refs built-in):**
                - ✅ strategy-component-styling.md → points to strategy-color-tokens.md
                - ✅ strategy-color-tokens.md → points to strategy-component-styling.md

                **Updated strategy-layout-tokens.md:**
                - ✅ Line 17: Updated to reference both new docs
                - ✅ Added Related Documentation section with cross-refs

                **Updated 5 ADR files (10 references total):**
                - ✅ adr-005-unified-theme-adapter-layer.md (2 refs → strategy-color-tokens.md)
                - ✅ adr-009-use-material-design-opacity-overlays.md (3 refs → strategy-component-styling.md)
                - ✅ adr-004-provider-based-multi-theme-switching.md (1 ref → strategy-color-tokens.md)
                - ✅ adr-012-separate-button-pattern-semantics.md (1 ref → strategy-component-styling.md)
                - ✅ adr-010-establish-core-semantic-color-token-architecture.md (3 refs → both new docs)

                **Updated project documentation:**
                - ✅ STRATEGY-INDEX.md: Replaced single entry with two new entries
                - ✅ DEVELOPMENT-RULES.md: Updated grep example to use new filename

                **Verification:** No orphaned references remain (archive references intentionally preserved as historical)

            - [x] **6.2.f.2.d Delete old file**

                **Completed:** Deleted `strategy-semantic-tokens.md` successfully
                - ✅ File removed from `.arc/reference/strategies/project/style/`
                - ✅ Verified deletion (ls command shows only 2 new files + layout-tokens)

            - [x] **6.2.f.2.e Run quality gates**

                **Completed:** All quality gates passed

                **Markdown linting:**
                - ✅ strategy-component-styling.md: 0 errors
                - ✅ strategy-color-tokens.md: 0 errors

                **Cross-reference verification:**
                - ✅ Only 2 non-archive references remain (version history in new files - intentional)
                - ✅ All 13 archive references preserved as historical records
                - ✅ Cross-references work between new docs
                - ✅ ADR cross-references updated (5 ADRs, 10 total references)

- [x] **6.3 Audit and Update ThemeDebug.tsx for Strategy Doc Compliance** ✅

    **Comprehensive audit completed. Found 4 sections with compliance issues, 9 sections fully compliant. All fixes applied.**

    - [x] **6.3.a Fix OpacitySystemSection - ADR-016 updates** ✅

        **Completed:** All changes applied successfully:
        - ✅ Updated intro text (lines 9-10, 22-28) to reference both ADR-009 and ADR-016
        - ✅ Rewrote "Standard Interaction Values" section (lines 34-83) to explain dual opacity system with three subsections:
            - MD3 Baseline (8% hover, 12% active): outline/ghost/secondary buttons
            - Improved (12% hover, 16% active): solid buttons, layer surfaces (per ADR-016)
            - Other values: backdrop overlays (30%), disabled states (38%)
        - ✅ Reduced "Syntax Demonstrations" (lines 103-193) from 5 examples to 4 per token
        - ✅ Changed demonstration values to actual interaction values (8, 12, 16, 30) with explanatory text
        - ✅ Added reference to strategy-component-styling.md "Opacity Modifier Reference" (line 200)

    - [x] **6.3.b Fix InteractionStatesSection - Correct opacity values** ✅

        **Completed:** All opacity values corrected:
        - ✅ Line 7-9: Updated comment to reference ADR-016 improvement
        - ✅ Line 53: Changed "Hover (+8% fg)" to "Hover (+12% fg)"
        - ✅ Line 56: Selected (+12% fg) - already correct
        - ✅ Line 59: Changed "Active (+12% fg)" to "Active (+16% fg)"
        - ✅ Line 99: Changed "Hover (+8% fg)" to "Hover (+12% fg)"
        - ✅ Line 105: Changed "Active (+12% fg)" to "Active (+16% fg)"
        - ✅ Lines 118-121: Updated implementation text to reference ADR-016 improvements

    - [x] **6.3.c Fix InteractiveListsSection - Correct opacity values in comments** ✅

        **Completed:** Simple text corrections applied:
        - ✅ Line 42: Changed "layer-hover-01 (8% overlay)" to "layer-hover-01 (12% overlay)"
        - ✅ Line 80: Changed "layer-active-01 (12% overlay)" to "layer-active-01 (16% overlay)"

    - [x] **6.3.d Fix CineXplorerExtensionsSection - Drag-active readability** ✅

        **Token mapping evaluation completed:**
        - drag-active maps to `secondaryHover` via extensions.ts (line 119)
        - IBM Carbon: #4c4c4c (light), #606060 (dark) - medium gray colors
        - drop-zone was incorrectly mapped to `accentEmphasis` (BLUE in GitHub/GitLab!)
        - No `on-drag-active` or `on-drop-zone` tokens exist in UnifiedTheme

        **Root cause fixes in extensions.ts:**
        - ✅ Changed drop-zone from `accentEmphasis` → `muted` (neutral, not blue)
        - ✅ Updated function signature to remove `accentEmphasis` parameter
        - ✅ Updated all 4 theme adapters to remove `accentEmphasis` argument:
            - github-primer.ts (line 219)
            - ibm-carbon.ts (line 221)
            - gitlab-pajamas.ts (line 233)
            - material-design-3.ts (line 240)

        **ThemeDebug visual fixes (CineXplorerExtensionsSection.tsx lines 66-97):**
        - ✅ **drag-active**: Changed text from `foreground` → `on-secondary` (proper contrast flip)
        - ✅ **drag-active**: Kept tertiary border + shadow for active state emphasis
        - ✅ **drop-zone**: Changed from blue to neutral `muted` background (via extensions fix)
        - ✅ **drop-zone**: Changed border from success → `border-strong-01`, solid style
        - ✅ **drop-zone**: Kept `foreground` text (works on neutral muted bg)
        - ✅ Updated explanation text to reflect actual token mappings

        **Rationale:** `on-secondary` provides proper contrast flip against secondaryHover's gray
        background. Drop-zone should be neutral (muted), not accent blue - it's a passive valid
        target area, not an active interactive element.

- [x] **6.4 Final quality gates**

    - [x] **6.4.a Run complete test suite** ✅

        **Results:**
        - Backend: 408 passed, 1 xfailed (expected)
        - Frontend: 231 passed

    - [x] **6.4.b Run all linting and type checking** ✅

        **Results:**
        - Backend linting (ruff): 0 violations
        - Frontend linting (eslint): 0 violations
        - TypeScript: 0 errors
        - Pyright: 0 errors (46 informations)
        - Markdown: 0 errors

    - [x] **6.4.c Visual regression check + Fix ThemeDebug accuracy issues** ✅

        **Visual regression check passed, but noted minor issues; identified and fixed:**

        **A. Popover/Menu Dropdown (LayerSystemSection)**
        - Fixed trigger button to follow proper outline button pattern
        - Changed hover from `borderColor: "tertiary"` to `borderColor: "border-strong-02"`
        - Added `_focusVisible` ring outline for keyboard accessibility
        - Updated description to clarify trigger follows outline button pattern

        **B. Button Implementation Text (ButtonPatternsSection)**
        - Clarified that 12%/16% opacity improvement applies only to *solid surfaces* (solid/subtle variants)
        - Specified outline/ghost/secondary use MD3 baseline (8%/12%)
        - Maintains accuracy with ADR-016 scope

        **C. Disabled Switch/Toggle Consistency (Switch/Checkbox/Radio Recipes)**
        - Updated all form control recipes to use `opacity: 0.38` (was 0.4)
        - Aligns with strategy doc opacity reference (ADR-009)
        - Root-level opacity dims both control and label (consistent with radio pattern)
        - Improves visibility while maintaining accessibility

        **D. Opacity Section Token References (OpacitySystemSection)**
        - Fixed primary/100 demo to use `on-primary` instead of `foreground`
        - Fixed tertiary/100 demo to use `on-tertiary` instead of `foreground`
        - Ensures proper contrast on solid color backgrounds

        **Quality checks:** All linting and type checking passed ✓

---
