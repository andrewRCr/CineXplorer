# Notes: Chakra UI v3 Recipe System Implementation

**Created:** 2025-11-14
**Task List:** `tasks-chakra-recipe-system-implementation.md`

---

## Phase 1 Research: Chakra UI v3 Recipe System

### Task 1.1: Recipe API Research

**Documentation source:** <https://www.chakra-ui.com/docs/theming/recipes>

#### How Recipes Work

Recipes are Chakra UI v3's pattern for defining reusable multi-variant component styles.
They replace the v2 `styleConfig` and `multiStyleConfig` concepts.

**Core structure:**

```typescript
import { defineRecipe } from "@chakra-ui/react"

export const buttonRecipe = defineRecipe({
  className: "button",           // CSS class name
  base: { /* foundation styles */ },
  variants: { /* style variations */ },
  compoundVariants: [ /* combination-specific styles */ ],
  defaultVariants: { /* preset values */ }
})
```

#### Registration in Theme Config

Recipes are registered in `defineConfig` at the `theme.recipes` property:

```typescript
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
import { buttonRecipe } from "./recipes/button"

const config = defineConfig({
  theme: {
    recipes: {
      button: buttonRecipe,  // key must match component name
    },
  },
})

export const system = createSystem(defaultConfig, config)
```

#### Token Reference Pattern

Recipes reference semantic tokens by name (same as components):

```typescript
export const buttonRecipe = defineRecipe({
  base: {
    fontWeight: "bold",
  },
  variants: {
    variant: {
      solid: {
        bg: "primary",           // References semantic token
        color: "on-primary",
      },
      outline: {
        borderWidth: "1px",
        borderColor: "button-outline",
        color: "on-button-outline",
      },
    },
  },
})
```

Chakra resolves these to CSS variables: `var(--chakra-colors-primary)`

#### Two Usage Patterns

**Pattern A: "Directly in component" (useRecipe hook)**

```tsx
import { useRecipe } from "@chakra-ui/react"
import { buttonRecipe } from "./button.recipe"

function CustomButton({ variant, ...props }) {
  const recipe = useRecipe({ recipe: buttonRecipe })
  const styles = recipe({ variant })

  return <chakra.button css={styles} {...props} />
}
```

**Pattern B: "Creating a component" (chakra factory) - RECOMMENDED**

```tsx
import { chakra } from "@chakra-ui/react"
import { buttonRecipe } from "./button.recipe"

export const Button = chakra("button", buttonRecipe)

// Usage:
<Button variant="solid">Click me</Button>
```

**Why Pattern B is recommended:**

- Cleaner component API (variant props are typed and passed directly)
- Better performance (no runtime hook overhead)
- More composable (works seamlessly with Chakra's component system)
- Less boilerplate in consuming components

**When to use Pattern A:**

- Complex prop manipulation before applying recipe
- Need to conditionally apply recipe styles
- Legacy component migration where full rewrite isn't feasible

---

## 🔍 CRITICAL DISCOVERY: Recipe Override Pattern (Official & Documented)

**Date Discovered:** 2025-11-14 (Phase 2, Task 2.4)
**Discovery Method:** Visual testing in ThemeDebug + source code investigation + external research
**Research Confirmed:** 2025-11-14 via comprehensive external research of official docs, GitHub issues, maintainer guidance

### The Discovery

When registering a recipe in `theme.recipes` with a key that matches a Chakra component name,
**the built-in Chakra component automatically uses your recipe** - NO wrapper component needed!

**Example:**

```typescript
// 1. Register recipe in theme config
const baseConfig = defineConfig({
  theme: {
    recipes: {
      button: buttonRecipe,  // Key "button" matches component name
    },
  },
});

// 2. Use built-in Chakra Button - it automatically uses your recipe!
import { Button } from "@chakra-ui/react"  // ✅ Use built-in, NOT wrapper
<Button variant="solid">Click Me</Button>  // ✅ Uses YOUR buttonRecipe
```

**No wrapper component needed:**

```typescript
// ❌ DON'T create wrapper
const Button = chakra("button", buttonRecipe)

// ✅ JUST use built-in with variant prop
import { Button } from "@chakra-ui/react"
```

### Why This Works

Chakra UI v3 ships with **71 default recipes** in `defaultConfig`:

- `button`, `input`, `textarea`, `select`, `alert`, `badge`, etc.
- Source: `@chakra-ui/react/src/theme/recipes/`

**The override mechanism:**

```typescript
createSystem(defaultConfig, baseConfig, themeConfig)
         ↓
    defaultConfig.recipes.button = chakraDefaultButtonRecipe
    baseConfig.recipes.button = ourCustomButtonRecipe  // OVERRIDES!
         ↓
    createSystem merges configs (baseConfig overrides defaultConfig)
         ↓
    Button component internally looks for recipe with key "button"
         ↓
    Finds OUR custom recipe
         ↓
    Automatically applies it! ✨
```

### Evidence

**Visual Test (ThemeDebug ButtonPatternsSection):**

- Created two buttons side-by-side:
    - `RecipeButton` = `chakra("button", buttonRecipe)` (wrapper approach)
    - `ChakraButton` = `import { Button } from "@chakra-ui/react"` (built-in)
- Both used `variant="solid"`
- **Result:** Identical appearance (same colors, hover states, active states)
- Only difference: Font size (built-in has Chakra's base Button styles + recipe)

**Source Code Evidence:**

- Chakra v3 defaultConfig ships 71 recipes: <https://github.com/chakra-ui/chakra-ui/tree/main/packages/react/src/theme/recipes>
- Includes: accordion, action-bar, alert, avatar, badge, button, card, checkbox, input, select, textarea, tabs, etc.
- Components internally reference their recipe by matching key name

### ✅ RESEARCH CONFIRMATION: This IS Documented and Intended

**CORRECTION:** Initial discovery notes suggested this was "undocumented." Follow-up research proves this is
**official, documented, and explicitly recommended** by Chakra maintainers.

**Authoritative Sources:**

1. **Official Chakra UI v3 Documentation:**
   - Section: "Theming > Customization > Recipes"
   - URL: <https://chakra-ui.com/docs/theming/customization/recipes>
   - States: "Register recipes in `theme.recipes` to customize built-in component variants globally"
   - This is the PRIMARY recommended pattern for design system customization

2. **GitHub Issue #9355 - Maintainer Guidance:**
   - User reported: `chakra("button", buttonRecipe)` wrapper lost default Chakra behaviors
   - **Maintainer Response:** "Use recipe overrides in `theme.recipes` instead"
   - **Reasoning:** Recipe overrides preserve Chakra's built-in defaults (cursor: pointer, focus rings, disabled
   states, accessibility features)
   - Wrapping raw HTML elements (`chakra("button", ...)`) loses these defaults
   - **Intended workflow:** Override recipes in theme → use built-in components → they automatically use your recipes

3. **GitHub Discussions #9453 - Type Safety & Variants:**
   - Confirms recipe override pattern for built-in component customization
   - Wrapper pattern documented for creating NEW components (not overriding existing ones)

**Why docs emphasize wrappers:**

The confusion stems from documentation organization:

- **"Chakra Factory" section** (wrapper pattern) → For creating NEW custom components
- **"Customization/Recipes" section** (override pattern) → For customizing EXISTING Chakra components

Both patterns are official, but serve **different purposes:**

- **Recipe Override:** Customize existing Chakra components globally (Button, Alert, Card, etc.)
- **Wrapper Component:** Create entirely new component types or wrap third-party libraries

**Our use case:** Customizing Chakra's built-in Button/Alert/Badge → **Recipe Override is the correct, documented approach**

### Which Components This Applies To

**All 71 components with default recipes in defaultConfig** (confirmed via source):

Common ones for our migration:

- ✅ `button` - All button variants
- ✅ `input` - Text input styling
- ✅ `textarea` - Textarea styling
- ✅ `select` - Select dropdown styling
- ✅ `alert` - Alert component patterns
- ✅ `badge` - Badge component patterns
- ✅ `checkbox` - Checkbox styling
- ✅ `switch` - Switch toggle styling
- ✅ `tabs` - Tab navigation styling

**Full list:** accordion, action-bar, alert, avatar, badge, blockquote, breadcrumb, button, card, carousel,
checkbox, checkbox-card, checkmark, code, code-block, collapsible, color-picker, color-swatch, combobox,
container, data-list, dialog, drawer, editable, empty-state, field, fieldset, file-upload, heading,
hover-card, icon, input, input-addon, kbd, link, list, listbox, mark, menu, native-select, number-input,
pin-input, popover, progress, progress-circle, qr-code, radio-card, radio-group, radiomark, rating-group,
scroll-area, segment-group, select, separator, skeleton, skip-nav-link, slider, spinner, stat, status,
steps, switch, table, tabs, tag, tags-input, textarea, timeline, toast, tooltip, tree-view.

### Implications for Migration Strategy

**For ALL Phases (2-4):**

✅ **DO:**

- Define recipe with `defineRecipe`
- Register in `baseConfig.theme.recipes` with matching component name
- Use built-in Chakra components: `import { Button } from "@chakra-ui/react"`
- Apply variants via props: `<Button variant="solid">`

❌ **DON'T:**

- Create wrapper components with `chakra()` factory (unnecessary!)
- Change imports from `@chakra-ui/react` to custom components
- Use `useRecipe` hook (only needed for advanced custom cases)

**Migration pattern:**

```tsx
// Before
<Button
  bg="primary"
  color="on-primary"
  _hover={{ bg: "primary-hover" }}
  _active={{ bg: "primary-active" }}
>

// After (same import, just variant prop)
<Button variant="solid">
```

**Built-in approach benefits:**

- ✅ Simpler migration (no import changes)
- ✅ Preserves Chakra's base component styles (fontSize, padding defaults)
- ✅ Preserves Chakra's accessibility features (ARIA attributes, keyboard navigation, focus management)
- ✅ Cleaner component tree (no wrapper layers)
- ✅ Recipe variants + Chakra defaults = best of both worlds
- ✅ Official, documented, maintainer-recommended approach

### Critical Gotchas from Research

**1. Variant Key Naming (GitHub #9216):**

```typescript
// ❌ WRONG - Documentation originally showed this (now corrected)
variants: {
  visual: {  // Wrong key name!
    solid: { ... },
  }
}

// ✅ CORRECT - Must use "variant" as the key name
variants: {
  variant: {  // Required key name
    solid: { ... },
  }
}
```

This caused widespread confusion during v3 adoption. The variant group name **MUST** be `variant`.

**2. Type Generation Required:**

After creating or modifying recipes, run:

```bash
npx @chakra-ui/cli typegen ./theme.ts
```

Without this, TypeScript won't recognize your custom variant names, leading to type errors.

**3. Avoid `!important` in Recipes:**

If you find yourself needing `!important` to override styles, it indicates your recipe isn't properly overriding the
default. Check:

- Is the recipe key name correct? (`"button"` not `"Button"`)
- Did you run typegen after changes?
- Is your system properly passed to `<ChakraProvider value={system}>`?
- Are you using `createSystem(defaultConfig, config)` correctly?

**4. Single-Part vs Multi-Part Recipes:**

- **Single-part components** (Button, Badge): Use `defineRecipe` → `theme.recipes`
- **Multi-part components** (Alert, Dialog): Use `defineSlotRecipe` → `theme.slotRecipes`

Don't mix these up or you'll get duplicate type definitions.

### Why Earlier Notes Had Conflicting Info

The notes file originally had two contradictory sections:

1. "Component Creation Pattern (Recommended)" - suggested wrapper components (lines 247-269)
2. "Important: We DON'T create recipe-based Button components!" - suggested built-in (lines 611-616)

**Resolution via Research:** Both patterns are **official and documented**, but serve different purposes:

- **Recipe Override** (what Phase 1 researcher discovered): For customizing existing Chakra components
    - Source: Official docs "Customization > Recipes" section
    - Maintainer-recommended per GitHub #9355
    - Our use case: Customizing Button/Alert/Badge → Use this approach ✅

- **Wrapper Components** (what initial notes suggested): For creating NEW components
    - Source: Official docs "Chakra Factory" section
    - Different use case entirely
    - Not applicable for our migration

**Initial confusion stemmed from:**

- Documentation being split across two sections with different purposes
- Wrapper pattern appearing first in many tutorial sequences
- Phase 1 researcher correctly identified recipe override pattern but lacked research confirmation

**Lesson:** When documentation seems unclear or contradictory:

1. Test the behavior empirically (we did this ✅)
2. Research authoritative sources (official docs, maintainer guidance, GitHub issues) (we did this ✅)
3. Document findings comprehensively for future reference (doing this now ✅)

---

## Compatibility Analysis: Recipes + Our Theme System

### ✅ FULLY COMPATIBLE

Our unified theme adapter system is **100% compatible** with Chakra UI v3 recipes. Here's why:

#### 1. Semantic Token Structure Matches

Our `createSemanticTokens()` output:

```typescript
// Our format (from frontend/src/theme/index.ts)
{
  colors: {
    "layer-01": {
      value: {
        base: "{colors.light.layer-01}",
        _dark: "{colors.dark.layer-01}"
      }
    },
    "primary": {
      value: {
        base: "{colors.light.primary}",
        _dark: "{colors.dark.primary}"
      }
    }
  }
}
```

This is **exactly** Chakra's expected format. Recipes reference tokens as `bg: "primary"`
and Chakra resolves through this structure.

#### 2. Dynamic Theme Switching Works

Our `createThemeSystem()` function creates a new system when themes switch:

```typescript
export function createThemeSystem(theme: Theme) {
    const baseTokens = createBaseTokens(theme);
    const semanticTokens = createSemanticTokens(theme);

    const themeConfig = defineConfig({
        theme: {
            tokens: { /* base tokens */ },
            semanticTokens: { /* semantic tokens */ },
        },
    });

    return createSystem(defaultConfig, baseConfig, themeConfig);
}
```

**Recipes registered in `baseConfig` will automatically use the new token values**
when the system is recreated. The recipe definitions themselves are static (don't reference
specific hex values), but the tokens they reference get new values per theme.

#### 3. Recipe Registration Location

**CRITICAL DECISION:** Where to register recipes in our multi-config system?

We use: `createSystem(defaultConfig, baseConfig, themeConfig)`

**Option A: Register in `baseConfig`** (RECOMMENDED)

- Recipes live alongside fonts, layout tokens, global CSS
- Single definition used across all theme switches
- Recipes reference semantic tokens that get re-bound per theme
- **Pros:** Clean separation, recipes are theme-agnostic by design
- **Cons:** None identified

**Option B: Register in `themeConfig`** (AVOID)

- Would recreate recipe definitions on every theme switch
- Unnecessary overhead (recipes don't change per theme)
- **Pros:** None
- **Cons:** Performance waste, conceptual confusion

**Recommendation:** Recipes go in `baseConfig.theme.recipes`

#### 4. Integration Point

```typescript
// frontend/src/theme/index.ts (line ~181)
const baseConfig = defineConfig({
    theme: {
        tokens: {
            fonts: { /* ... */ },
            ...layoutFoundations,
            ...zIndexSemanticTokens,
        },
        semanticTokens: {
            ...layoutSemanticTokens,
        },
        recipes: {
            // ADD RECIPES HERE
            button: buttonRecipe,
            input: inputRecipe,
            // etc.
        },
    },
    globalCss: { /* ... */ },
});
```

---

## Implementation Strategy

### File Organization

Create `frontend/src/theme/recipes/` directory structure:

```
frontend/src/theme/recipes/
├── index.ts           # Central export point
├── button.ts          # Button recipe (all variants)
├── input.ts           # Input recipe
├── textarea.ts        # Textarea recipe
├── select.ts          # Select recipe
├── alert.ts           # Alert recipe
├── badge.ts           # Badge recipe
└── ...                # Additional recipes as needed
```

### Component Creation Pattern ~~(Recommended)~~ - SEE CRITICAL DISCOVERY BELOW

**⚠️ UPDATE (2025-11-14):** This approach is NOT needed for components with default recipes!
See "CRITICAL DISCOVERY: Automatic Recipe Override Behavior" section below for the correct approach.

**Wrapper component approach (only needed for NEW custom components without defaults):**

```typescript
// Example: Only use this for NEW components not in Chakra's defaults
import { chakra } from "@chakra-ui/react"
import { customRecipe } from "@/theme/recipes/custom"

export const CustomComponent = chakra("div", customRecipe)
```

**For built-in Chakra components (Button, Input, Alert, etc.):**

- NO wrapper needed!
- Just register recipe with matching key name
- Component automatically uses your recipe
- See discovery section below for full explanation

### Migration Approach

**⚠️ UPDATED (2025-11-14):** No wrapper components needed! See CRITICAL DISCOVERY section above.

**Phase-based migration** (from task list):

1. **Phase 2:** Button recipes (highest impact - 20+ components)
2. **Phase 3:** Form control recipes (Input, Textarea, Select)
3. **Phase 4:** Alert/Badge recipes
4. **Phase 5:** Remaining patterns

**For each phase:**

1. Define recipe with all variants from strategy doc
2. ~~Create component wrapper (if reusable)~~ **NOT NEEDED** - built-in components use recipes automatically
3. Register recipe in `baseConfig.theme.recipes` with matching component key name
4. Test with ThemeDebug to verify all themes
5. Migrate components systematically:
   - Keep existing imports: `import { Button } from "@chakra-ui/react"`
   - Replace inline styles with variant props: `variant="solid"` instead of `bg="primary" _hover={...}`
6. Verify no inline `_hover`/`_focus` patterns remain
7. Update strategy doc to reference recipes

---

## Gotchas & Considerations

### 1. Recipe vs Component Scope

**Recipes are for STYLING, not behavior:**

✅ Good use case:

- Button variants (solid, outline, ghost)
- Button sizes (sm, md, lg)
- Button interaction states (hover, focus, active)

❌ Bad use case:

- Button loading state logic
- Button disabled behavior
- Button click handlers

**Rule:** If it's CSS, use recipes. If it's JavaScript, use component logic.

### 2. Token References Must Be Canonical

Recipes MUST use canonical token names (as defined in `UnifiedTheme`):

```typescript
// ✅ CORRECT
solid: {
  bg: "primary",
  color: "on-primary",
}

// ❌ WRONG (deprecated alias, will break after Phase 8)
solid: {
  bg: "primary",
  color: "primary-foreground",  // This alias will be removed!
}
```

**Verification:** Grep recipe definitions for `-foreground` suffix → should be 0 matches.

### 3. Layer-Aware Border Tokens

For form controls, buttons on layers need layer-appropriate borders:

```typescript
// DON'T use generic "border" token (being deprecated)
outline: {
  borderColor: "border",  // ❌ Wrong
}

// DO use layer-specific tokens
outline: {
  borderColor: "border-strong-01",  // ✅ Correct for layer-01
}
```

**See Phase 7.2.e** for border token migration strategy.

### 4. Compound Variants for Context-Specific Styles

Use compound variants when styles depend on multiple conditions:

```typescript
compoundVariants: [
  {
    variant: "outline",
    colorPalette: "primary",
    css: {
      borderColor: "button-outline-primary",
      color: "on-button-outline-primary",
    },
  },
  {
    variant: "outline",
    colorPalette: "neutral",  // default
    css: {
      borderColor: "button-outline",
      color: "on-button-outline",
    },
  },
]
```

This enables `<Button variant="outline" colorPalette="primary">` pattern.

### 5. Interaction States Already in Semantic Tokens

Our UnifiedTheme already has interaction state tokens:

- `primary-hover`
- `primary-active`
- `tertiary-hover`
- `tertiary-active`
- `layer-hover-01`, `layer-hover-02`
- `layer-selected-01`, `layer-selected-02`
- `layer-active-01`, `layer-active-02`

Recipes can reference these directly:

```typescript
solid: {
  bg: "primary",
  _hover: { bg: "primary-hover" },
  _active: { bg: "primary-active" },
}
```

**No need to derive hover colors in recipes** - they're already in the theme system.

### 6. Testing Recipe Theme Compatibility

**CRITICAL:** Test recipes with ALL themes before considering complete.

Use ThemeDebug component pattern:

```tsx
// Add recipe showcase section to ThemeDebug.tsx
<Section title="Button Recipes">
  <Button variant="solid">Solid Button</Button>
  <Button variant="primary-outline">Primary Outline</Button>
  <Button variant="neutral-outline">Neutral Outline</Button>
  <Button variant="subtle">Subtle Button</Button>
  <Button variant="ghost">Ghost Button</Button>
</Section>
```

Switch through all 4 themes (IBM Carbon, GitHub, GitLab, Material) and verify:

- Correct colors per theme
- Adequate contrast (WCAG AA)
- Hover states visible
- Focus rings visible
- No theme-specific bugs

---

## Open Questions / Decisions Needed

### 1. Component Wrapper Scope

**Question:** Should we create recipe-based wrappers for ALL Chakra components we use, or only for ones with custom patterns?

**Options:**

- **A:** Wrap all (`Button`, `Input`, `Select`, etc.) for consistency
- **B:** Only wrap components with custom recipes, use Chakra defaults elsewhere
- **C:** Hybrid - wrap high-usage components, leave rare ones unwrapped

**Recommendation:** Start with **Option B** (only custom recipes), expand to **C** if needed.

### 2. Existing Inline Patterns

**Question:** What to do with existing inline `_hover`/`_focus` patterns that don't match codified recipes?

**Options:**

- **A:** Flag as violations, update to match strategy doc
- **B:** Document as exceptions, preserve behavior
- **C:** Create additional recipe variants to accommodate

**Recommendation:** **Option A** for consistency, but document findings during audit (Task 1.2).

### 3. Recipe Naming Convention

**Question:** How to name recipe variants - match Chakra defaults or use our semantic names?

**Chakra defaults:** `solid`, `outline`, `subtle`, `ghost`, `plain`, `surface`
**Our names:** `solid`, `primary-outline`, `neutral-outline`, `subtle`, `ghost`

**Recommendation:** Use our semantic names in recipes (clearer meaning), provide `colorPalette` prop for flexibility.

### 4. Default Variant Values

**Question:** Should recipes specify `defaultVariants`, or require explicit props?

**Consideration:** Explicit props = more verbose but clearer intent.

**Recommendation:** Define `defaultVariants` for common cases:

```typescript
defaultVariants: {
  variant: "solid",
  size: "md",
  colorPalette: "primary",
}
```

---

## Session Notes

### Session 2025-11-14 (Initial Research)

**Participants:** User + Claude

**Completed:**

- ✅ Read Chakra UI v3 recipe documentation
- ✅ Analyzed "creating a component" vs "directly in component" patterns
- ✅ Verified theme system compatibility with recipes
- ✅ Understood Phase 8 cleanup scope (critical context for recipe implementation)
- ✅ Identified integration point in `baseConfig`
- ✅ Documented canonical token requirement
- ✅ Task 1.1.1 complete - Recipe API research
- ✅ Task 1.1.2 complete - Gap analysis between strategy patterns and recipe capabilities

**Key insights:**

- Current theme system is 100% recipe-compatible (no architecture changes needed)
- Recipes go in `baseConfig.theme.recipes` (theme-agnostic, reused across switches)
- Must use canonical token names (`on-primary`, NOT `primary-foreground`)
- "Creating a component" pattern (chakra factory) is preferred for better DX
- Token references work automatically across theme switches (no special handling needed)

**Next steps:**

- Task 1.2: Audit current inline pattern usage (~70 "border" usages, button patterns)
- Begin Phase 2: Button recipe implementation

### TextLink Component Analysis

**Question:** Should TextLink component use recipes or stay as-is?

**Component location:** `frontend/src/components/common/TextLink.tsx`

**Current implementation:**

- Wrapper around Chakra Link + React Router Link (asChild pattern)
- Uses `tertiary` color with `tertiary-hover` for interactive text
- Underline, focus ring, semantic token integration
- Used in 7 files across the codebase

**Analysis:**

**Why TextLink should STAY AS-IS (NOT use recipes):**

1. **Single pattern, no variants** - Links are not like buttons (5 variants). There's one standard link style
2. **Requires component logic** - React Router integration (`asChild` + `RouterLink`) can't be expressed in recipe
3. **Already well-encapsulated** - Component is 73 lines, clean, documented, works perfectly
4. **Not in strategy doc button patterns** - Links are separate from buttons in semantic hierarchy
5. **Recipe adds no value** - Would just define the same 4-5 style props, component still needed for Router
6. **Semantic HTML difference** - Links (`<a>`) are fundamentally different from buttons (`<button>`)

**Recipe system benefits apply when:**

- Multiple variants need centralized management (buttons: 5 variants!)
- Components use Chakra primitives directly without wrappers
- Styling is the ONLY concern (no integration logic needed)

**TextLink doesn't meet these criteria.** It's a complete, working abstraction that handles both
styling AND React Router integration. Keep it as-is.

**Verdict:** ✅ **No changes needed.** TextLink stays as component wrapper.

**Task list impact:** Phase 5.1 (Link recipes) marked as skip.

### Strategy Doc Update Timing

**Question:** Should we update strategy-semantic-tokens.md incrementally (as each phase completes)
or all-at-once (after all recipes implemented)?

**Decision:** All-at-once in Phase 6.1 ✅

**Rationale:**

- The transformation (verbose inline → clean recipe usage) is a structural refactor, not just content updates
- Doing all-at-once after Phases 2-5 ensures consistency across entire doc
- Can see full pattern and make cohesive decisions about structure
- Avoid repeatedly touching the same sections

**Incremental updates during Phases 2-5:**

- Update **component JSDoc comments** as you migrate each one
- Add notes like: `// Uses button recipe (theme/recipes/button.ts) - variant="solid"`
- Keeps code self-documenting as work progresses

**Phase 6.1 transformation:**

- Replace verbose inline examples with clean recipe usage
- Add recipe variant reference tables
- Maintain decision trees, semantic guidance, when/why rationale
- Link to recipe files for implementation details

**Result:** Strategy doc becomes **leaner and more valuable** - focuses on semantic meaning
(when/why) rather than implementation details (how). Recipes handle the "how".

### Component Directory Forward Compatibility

**Context:** Theme modernization task 7.3 (line 2982) will reorganize component structure.
Need to ensure recipe task list uses forward-compatible paths.

**Task 7.3 target structure (post-reorganization):**

- `components/common/` - Shared/reusable components (ThemeSelector, TextLink, etc.)
- `components/core/` - App infrastructure (ErrorBoundary)
- `components/core/chakra/` - Chakra UI providers (color-mode, provider, etc.)
- `components/ui/` - Deleted (currently empty)

**Recipe-related file locations (forward-compatible):**

✅ **Recipe definitions:**

- Path: `frontend/src/theme/recipes/*.ts`
- NOT affected by 7.3 reorganization
- Forward compatible ✅

✅ **Input/Textarea wrapper components:**

- Path: `frontend/src/components/common/StyledInput.tsx`
- Path: `frontend/src/components/common/StyledTextarea.tsx`
- Aligns with 7.3's `common/` for reusable UI
- Forward compatible ✅

✅ **TextLink component:**

- Path: `frontend/src/components/common/TextLink.tsx`
- Already in correct location per 7.3
- Stays as-is (no recipe needed)

**Important: We DON'T create recipe-based Button components!**

- Recipes register in theme system (`theme/index.ts`)
- Chakra's existing components automatically use recipes
- Usage: `import { Button } from "@chakra-ui/react"` + `variant="solid"`
- No wrapper component needed!

**Wrapper component approach (final decision):**

- **Option A (utility function):** Rejected - creates boilerplate (`{...getInputStyles()}`)
- **Option B (wrapper components):** Selected ✅
    - Cleaner usage: `<StyledInput />` vs `<Input {...getInputStyles()} />`
    - Consistent with TextLink pattern (encapsulated wrapper for special cases)
    - Aligns with recipe philosophy: 90% recipes, 10% wrappers
    - Styling logic lives INSIDE components (~20 lines duplicated for encapsulation)
    - No separate utility file needed

**Task list updates:**

- Phase 3.1: Removed utility function approach, kept only wrapper components
- Phase 3.1.1-3.1.2: Specified `components/common/` path (forward-compatible with task 7.3)
- Phase 3.3.1: Updated to reference wrapper components (not utility functions)
- Phase 6.1.2, 6.2.2: Updated documentation tasks to reference wrapper pattern

### Task List Audit Results

**Completed:** 2025-11-14 (after Task 1.1.2 findings)

**Changes made to task list based on gap analysis:**

1. **Phase 3 - Form Controls** - ⚠️ MAJOR CORRECTION
   - ❌ Removed "Create Input/Textarea recipes" tasks
   - ✅ Added "Create Input/Textarea wrapper components" tasks
   - Rationale: Complex CSS (`:hover:not(:focus)`, `color-mix()`) incompatible with recipe system
   - Solution: Wrapper components `StyledInput/StyledTextarea` in `components/common/` (like TextLink pattern)
   - Styling logic encapsulated inside components (~20 lines duplicated between Input/Textarea for clarity)
   - **No separate utility file** - follows TextLink's encapsulation pattern
   - Select recipes remain (Select.Trigger is recipe-compatible)

2. **Phase 5.1 - Link Recipes** - REMOVED
   - ✅ Marked as "SKIP - not needed"
   - Rationale: TextLink is single pattern with React Router integration, already well-encapsulated
   - Recipe adds no value (would duplicate 4-5 props, component still needed for Router logic)
   - Semantic difference: Links (`<a>`) ≠ Buttons (`<button>`)

3. **Phase 2.1.5 - Subtle Button Variant** - CLARIFIED
   - ✅ Added compound variants implementation detail
   - Selected state uses `selected: { true: {}, false: {} }` variant dimension
   - Usage: `<Button variant="subtle" selected={isSelected}>`

4. **Phase 6 - Documentation Updates** - CORRECTED
   - Updated Form Controls documentation tasks to reference utility functions (not recipes)
   - Updated ThemeDebug tasks to show utility pattern (not recipes)

**Summary:**

- 90% of patterns use recipes as planned (buttons, alerts, badges, Select)
- 10% use alternative approaches: Input/Textarea (utilities), TextLink (stays as-is)
- No fundamental architecture changes needed
- Task list now accurately reflects implementation approach

---

## Task 1.1.2: Pattern Expressibility Gap Analysis

**Completed:** 2025-11-14

### Analysis Scope

Reviewed all codified patterns from `strategy-semantic-tokens.md` to determine which can be
expressed as Chakra UI v3 recipes and which require component-level implementation.

### Summary: Recipe Expressibility by Pattern

| Pattern Category | Fully Expressible? | Notes |
| ---------------- | ------------------ | ----- |
| **Button - Solid** | ✅ Yes | Straightforward recipe with base + variants |
| **Button - Primary Outline** | ✅ Yes | Border/color tokens with hover/active states |
| **Button - Neutral Outline** | ✅ Yes | Multiple property changes on hover (bg + border) |
| **Button - Subtle** | ✅ Yes | Standard bg/color with interaction states |
| **Button - Subtle Selected** | ⚠️ Partial | Selected state is **runtime conditional** |
| **Button - Ghost** | ✅ Yes | Text + bg change on hover |
| **Input/Textarea** | ❌ No | **Complex CSS** (`:hover:not(:focus)`, `color-mix()`) |
| **Select Trigger** | ✅ Yes | Button-like, standard recipe patterns |
| **Select Items** | ⚠️ Partial | Selected state is **runtime conditional** |
| **Checkbox** | ⚠️ Partial | Checked state handled by Chakra, recipe for base styles |
| **Alert** | ✅ Yes | Opacity backgrounds + semantic colors |
| **Badge** | ✅ Yes | Solid fills with semantic color pairs |

### ✅ Fully Expressible Patterns (Can Use Recipes)

#### 1. Button - Solid (Primary Action)

**Pattern from strategy:**

```tsx
<Button
  variant="solid"
  bg="primary"
  color="on-primary"
  _hover={{ bg: "primary-hover" }}
  _active={{ bg: "primary-active" }}
>
```

**Recipe implementation:** ✅ Direct mapping

```typescript
defineRecipe({
  base: { fontWeight: "medium" },
  variants: {
    variant: {
      solid: {
        bg: "primary",
        color: "on-primary",
        _hover: { bg: "primary-hover" },
        _active: { bg: "primary-active" },
        _focusVisible: {
          outline: "2px solid",
          outlineColor: "ring",
          outlineOffset: "2px",
        },
      },
    },
  },
})
```

**Verdict:** Perfect fit. All tokens static, all interaction states supported by recipe system.

#### 2. Button - Primary Outline

**Pattern from strategy:**

```tsx
<Button
  variant="outline"
  borderColor="button-outline-primary"
  color="on-button-outline-primary"
  _hover={{ bg: "primary/8" }}
  _active={{ bg: "primary/12" }}
>
```

**Recipe implementation:** ✅ Direct mapping

```typescript
variants: {
  variant: {
    "primary-outline": {
      borderWidth: "1px",
      borderColor: "button-outline-primary",
      color: "on-button-outline-primary",
      _hover: { bg: "primary/8" },
      _active: { bg: "primary/12" },
    },
  },
}
```

**Verdict:** Perfect fit. Opacity modifiers (`primary/8`) work in recipes.

#### 3. Button - Neutral Outline (Most Common)

**Pattern from strategy:**

```tsx
<Button
  variant="outline"
  borderColor="button-outline"
  color="on-button-outline"
  _hover={{
    bg: "tertiary/8",
    borderColor: "tertiary",
  }}
  _active={{
    bg: "tertiary/12",
    borderColor: "tertiary",
  }}
>
```

**Recipe implementation:** ✅ Direct mapping (multi-property hover works)

```typescript
variants: {
  variant: {
    outline: {  // Default outline is neutral
      borderWidth: "1px",
      borderColor: "button-outline",
      color: "on-button-outline",
      _hover: {
        bg: "tertiary/8",
        borderColor: "tertiary",
      },
      _active: {
        bg: "tertiary/12",
        borderColor: "tertiary",
      },
    },
  },
}
```

**Verdict:** Works perfectly. Recipes support multiple property changes in pseudo-selectors.

**Critical note:** Text/icons do NOT change color on hover (stays `on-button-outline`/`foreground`).

#### 4. Button - Ghost

**Pattern from strategy:**

```tsx
<Button
  variant="ghost"
  color="tertiary"
  _hover={{
    bg: "tertiary/8",
    color: "tertiary-hover"
  }}
  _active={{ color: "tertiary-active" }}
>
```

**Recipe implementation:** ✅ Direct mapping

```typescript
variants: {
  variant: {
    ghost: {
      bg: "transparent",
      color: "tertiary",
      _hover: {
        bg: "tertiary/8",  // Required!
        color: "tertiary-hover",
      },
      _active: { color: "tertiary-active" },
    },
  },
}
```

**Verdict:** Perfect fit. Ghost buttons critical requirement (bg change on hover) is recipe-compatible.

#### 5. Alert Pattern

**Pattern from strategy:**

```tsx
<Alert bg="success/10" borderColor="success" borderWidth="1px">
  <Alert.Title color="success">Success</Alert.Title>
  <Alert.Description color="foreground">Message</Alert.Description>
</Alert>
```

**Recipe implementation:** ✅ Can use slot recipes

Slot recipes handle multi-part components like Alert. Each slot (container, title, description)
gets its own styling rules.

**Verdict:** Expressible via slot recipes. Not needed for Phase 2 (buttons first).

#### 6. Badge Pattern

**Pattern from strategy:**

```tsx
// Solid badge
<Badge bg="success" color="on-success">Active</Badge>

// Subtle badge (opacity background)
<Badge bg="success/10" color="success">Active</Badge>
```

**Recipe implementation:** ✅ Use compoundVariants

```typescript
defineRecipe({
  variants: {
    status: {
      success: {},
      warning: {},
      destructive: {},
      info: {},
    },
    variant: {
      solid: {},
      subtle: {},
    },
  },
  compoundVariants: [
    {
      status: "success",
      variant: "solid",
      css: { bg: "success", color: "on-success" },
    },
    {
      status: "success",
      variant: "subtle",
      css: { bg: "success/10", color: "success" },
    },
    // ... repeat for warning, destructive, info
  ],
})
```

**Verdict:** Perfect fit for compound variants pattern.

### ⚠️ Partially Expressible (Recipes + Component Logic)

#### 1. Button - Subtle with Selected State

**Pattern from strategy:**

```tsx
<Button
  variant="subtle"
  bg={isSelected ? "button-subtle-selected" : "button-subtle"}
  color={isSelected ? "on-button-subtle-selected" : "on-button-subtle"}
  _hover={{ bg: isSelected ? "button-subtle-selected" : "secondary-hover" }}
>
```

**Challenge:** `isSelected` is **runtime conditional prop**, not a variant.

**Solution A: Use compoundVariants** (RECOMMENDED)

```typescript
defineRecipe({
  variants: {
    variant: { subtle: {} },
    selected: { true: {}, false: {} },
  },
  compoundVariants: [
    {
      variant: "subtle",
      selected: false,
      css: {
        bg: "button-subtle",
        color: "on-button-subtle",
        _hover: { bg: "secondary-hover" },
      },
    },
    {
      variant: "subtle",
      selected: true,
      css: {
        bg: "button-subtle-selected",
        color: "on-button-subtle-selected",
        _hover: { bg: "button-subtle-selected" },  // No hover change when selected
      },
    },
  ],
})

// Usage:
<Button variant="subtle" selected={isSelected}>
```

**Solution B: Component-level logic** (if compound variants insufficient)

Create wrapper component that applies recipe + conditional props:

```tsx
function SubtleButton({ selected, ...props }) {
  const additionalProps = selected
    ? { bg: "button-subtle-selected", color: "on-button-subtle-selected" }
    : {};
  return <Button variant="subtle" {...additionalProps} {...props} />;
}
```

**Verdict:** Expressible with compound variants. Selected state becomes explicit variant prop.

#### 2. Select Items with Dynamic Selection

**Pattern from strategy:**

```tsx
<Select.Item
  bg={isSelected ? "tertiary" : undefined}
  color={isSelected ? "on-tertiary" : undefined}
  _hover={{
    bg: isSelected ? "tertiary" : "tertiary/12",
    color: isSelected ? "on-tertiary" : undefined,
  }}
>
```

**Challenge:** Selection state is runtime conditional based on current value comparison.

**Solution:** Recipe for Select.Trigger only, keep Select.Item logic in components

```typescript
// Recipe for Select.Trigger (button-like)
const selectRecipe = defineRecipe({
  base: {
    borderWidth: "1px",
    borderColor: "border-strong-01",
    bg: "background",
    color: "foreground",
    _hover: {
      borderColor: "border-strong-02",
      bg: "tertiary/8",
    },
    css: {
      "&:focus-visible": {
        outline: "2px solid var(--chakra-colors-ring)",
        outlineOffset: "2px",
      },
    },
  },
})

// Select.Item stays as component logic (isSelected is computed at runtime)
```

**Verdict:** Select.Trigger recipe-compatible. Select.Item needs component-level conditionals
(computed from value comparison).

### ❌ Not Expressible in Recipes (Component-Level Only)

#### 1. Input/Textarea with Complex Hover/Focus CSS

**Pattern from strategy:**

```tsx
<Input
  borderColor="border-strong-01"
  css={{
    "&:hover:not(:focus)": {
      borderColor: "var(--chakra-colors-border-strong-02)",
      backgroundColor: "color-mix(in srgb, var(--chakra-colors-tertiary) 8%, transparent)",
    },
    "&:focus": {
      borderColor: "var(--chakra-colors-tertiary)",
      backgroundColor: "transparent",
      outline: "none",
    }
  }}
/>
```

**Challenges:**

1. **Complex pseudo-selector:** `&:hover:not(:focus)` - Not supported in recipe `_hover`
   (recipes don't support `:not()` combinator)
2. **CSS variables required:** `color-mix()` function requires explicit `var()` syntax
3. **Raw CSS in `css` prop:** Recipes define Chakra style props, not raw CSS-in-JS

**Why recipes don't work here:**

- Recipes use Chakra's style prop system (`_hover`, `_focus`, etc.)
- Chakra's `_hover` becomes `&:hover`, not `&:hover:not(:focus)`
- The `:not()` combinator prevents hover from overriding focus - essential for text inputs
- `color-mix()` with CSS variables bypasses Chakra's token resolution

**Solution:** Keep Input/Textarea patterns as reusable component utilities

```tsx
// Create utility function for input styling
function getInputStyles(layer: "01" | "02" = "01") {
  return {
    borderColor: `border-strong-${layer}`,
    bg: layer === "01" ? "transparent" : "background",
    color: "foreground",
    css: {
      "&:hover:not(:focus)": {
        borderColor: `var(--chakra-colors-border-strong-${layer === "01" ? "02" : "03"})`,
        backgroundColor: "color-mix(in srgb, var(--chakra-colors-tertiary) 8%, transparent)",
      },
      "&:focus": {
        borderColor: "var(--chakra-colors-tertiary)",
        backgroundColor: layer === "01" ? "transparent" : "var(--chakra-colors-background)",
        outline: "none",
      },
    },
  };
}

// Usage:
<Input {...getInputStyles("01")} />
```

**Alternative:** Create wrapper components

```tsx
export function StyledInput(props) {
  return <Input {...getInputStyles()} {...props} />;
}
```

**Verdict:** Cannot express in recipes due to complex pseudo-selectors and CSS variable requirements.
Use component-level styling or utility functions instead.

### Recommendations

#### Phase 2 (Buttons) - ✅ Proceed with Recipes

All button patterns are recipe-compatible:

- Solid, primary-outline, neutral-outline, subtle, ghost: Direct recipe mapping
- Subtle with selection: Use compound variants (`selected: true/false`)

#### Phase 3 (Form Controls) - ⚠️ Mixed Approach

- **Select.Trigger:** Use recipe (button-like, no complex selectors)
- **Input/Textarea:** Keep as component utilities (complex CSS requirements)
- **Checkbox/Radio:** Recipe for base styles, Chakra handles checked state automatically

#### Phase 4 (Alert/Badge) - ✅ Proceed with Recipes

- Alert: Use slot recipes (multi-part component)
- Badge: Use compound variants (status × variant combinations)

### Key Takeaways

**Recipe system works great for:**

- Static style variants (solid, outline, ghost)
- Interaction states via `_hover`, `_active`, `_focus`, `_focusVisible`
- Compound variants for multi-dimensional styling (variant × status × selected)
- Opacity modifiers on semantic tokens (`primary/8`, `tertiary/12`)

**Recipe system limitations:**

- Complex pseudo-selectors (`:hover:not(:focus)`)
- Raw CSS functions requiring variable syntax (`color-mix()`)
- Runtime conditionals based on external state (component props like `isSelected`)
    - Workaround: Convert to explicit variant prop with compound variants

**Architectural decision:**

Use recipes where possible (90% of patterns), fall back to component utilities for complex cases
(Input/Textarea). This hybrid approach maximizes benefits of recipes while acknowledging their
boundaries.

---

## References

- **Task list:** `.arc/active/incidental/tasks-chakra-recipe-system-implementation.md`
- **Theme modernization:** `.arc/active/incidental/tasks-theme-system-modernization.md` (Phase 8 at line 3186)
- **Strategy doc:** `.arc/reference/strategies/project/style/strategy-semantic-tokens.md`
- **ADRs:** ADR-005 (Unified Theme), ADR-009 (Interaction States), ADR-012 (Semantic Button Tokens)
- **Chakra docs:** <https://www.chakra-ui.com/docs/theming/recipes>
