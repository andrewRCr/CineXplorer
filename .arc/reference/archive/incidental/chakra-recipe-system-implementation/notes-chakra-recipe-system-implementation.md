# Notes: Chakra UI v3 Recipe System Implementation

**Created:** 2025-11-14
**Completed:** 2025-11-17
**Task List:** `tasks-chakra-recipe-system-implementation.md`
**Status:** Complete

---

## Key Architectural Decisions

### Hybrid Approach: Recipes + Wrappers

**Decision:** Use Chakra recipes for 90% of patterns, component wrappers for complex edge cases.

**Rationale:**

- **Recipes work for:** Static variants, standard interaction states (`_hover`, `_active`, `_focusVisible`),
  compound variants, opacity modifiers
- **Recipes fail for:** Complex pseudo-selectors (`:hover:not(:focus)`), CSS functions requiring variable syntax
  (`color-mix()`), runtime conditionals

**Implementation:**

- **Button, Alert, Badge, Select, Checkbox, Radio, Switch:** Full recipe implementation
- **Input, Textarea:** Wrapper components (StyledInput, StyledTextarea) with encapsulated ADR-015 styling
- **TextLink:** Stays as-is (React Router integration, single pattern, already well-encapsulated)

### Recipe Registration Strategy

**Decision:** Register recipes in `baseConfig.theme.recipes`, NOT in `themeConfig`.

**Rationale:**

- Recipes are theme-agnostic (reference semantic tokens by name: `bg: "primary"`)
- Semantic tokens get rebound per theme, but recipe definitions stay static
- Single definition used across all theme switches
- Avoids recreating recipe objects on every theme change

**Location:** `frontend/src/theme/index.ts` lines 213-216

### Recipe Override Pattern (Critical Discovery)

**What:** Registering a recipe with a key matching a Chakra component name causes the built-in component
to automatically use your recipe - NO wrapper needed.

**Example:**

```typescript
// 1. Register recipe in theme
const baseConfig = defineConfig({
  theme: {
    recipes: {
      button: buttonRecipe,  // Key "button" matches component name
    },
  },
});

// 2. Use built-in Chakra Button - automatically uses YOUR recipe!
import { Button } from "@chakra-ui/react"  // ✅ Built-in component
<Button variant="solid">Click Me</Button>  // ✅ Uses your buttonRecipe
```

**Why this works:**

- Chakra v3 ships with 71 default recipes in `defaultConfig`
- `createSystem(defaultConfig, baseConfig)` merges configs - baseConfig overrides defaultConfig
- Built-in components internally reference recipes by key name
- Finds OUR custom recipe and applies it automatically

**Sources:**

- Official docs: "Theming > Customization > Recipes" (<https://chakra-ui.com/docs/theming/customization/recipes>)
- GitHub Issue #9355: Maintainer confirms this is the intended pattern for design system customization
- Preserves Chakra's built-in behaviors (cursor, focus rings, disabled states, ARIA attributes)

**Implication:** No wrapper components needed for Button, Alert, Badge, etc. Just register recipe + use built-in.

---

## Implementation Outcomes

### Final 5-Variant Button System

**Decision:** Consolidated from 7 experimental variants to 5 production variants based on semantic use cases.

**Variants:**

1. **solid** - Primary actions (improved 12%/16% hover/active for better visibility)
2. **secondary** - Form pair secondary action (primary text + grey border, for visual tie with primary button)
3. **outline** - Standalone utility action (grey text + grey border, no relationship to primary action)
4. **subtle** - Embedded in panels (improved 12%/16% opacity)
5. **ghost** - Dismissive/tertiary actions (MD3 baseline 8%/12%)

**Key distinction:** Secondary vs outline based on context (paired with primary vs standalone utility).

### Interaction State Opacity Improvement

**Decision:** Improved from Material Design 3's 8%/12% to 12%/16% for solid surfaces.

**Rationale:**

- MD3 defaults too subtle across IBM Carbon dark + GitHub dark theme combinations
- A/B testing showed 12%/16% provides noticeably better visibility
- Applied globally via `deriveInteractionStates()` in `theme/color/utils.ts`

**Scope:**

- **Improved (12%/16%):** Solid buttons, subtle buttons, layer surfaces, interactive panels
- **Baseline (8%/12%):** Outline/ghost/secondary buttons (lighter touch appropriate)

**Documented:** ADR-016 "Improve Interaction State Contrast from Material Design 3 Defaults"

### Component Migration Summary

**Migrated to recipes:**

- 3 solid buttons (MovieDetail, VerifyEmail)
- 11 outline buttons (Login, ThemeSelector, NavBar, MovieDetail, etc.)
- 3 subtle buttons (Featured.tsx)
- 1 Alert (VerifyEmail.tsx) - now uses status prop
- 1 Badge usage (MovieUserScore.tsx) - now uses variant prop
- 3 form control types (Checkbox, Radio, Switch) in ThemeDebug

**Migrated to wrappers:**

- 5 Input components (Register.tsx, Login.tsx) → StyledInput
- All Select components fixed for consistency (borderColor, text colors, keyboard focus)

**Edge cases documented:**

- NavBarSearch, CollapsibleSearchBox kept as-is (highly custom, integrated button designs)
- Watchlist toggle button kept inline (runtime conditional between primary/secondary colors)

### Strategy Documentation Restructuring

**Decision:** Split `strategy-semantic-tokens.md` into two focused documents.

**New structure:**

- `strategy-component-styling.md` (~962 lines) - How to build components with recipes/wrappers
- `strategy-color-tokens.md` (~546 lines) - Token reference, naming, accessibility

**Benefit:** Clear separation of concerns - building patterns vs token system reference.

---

## Related Documentation

- **Task List:** `tasks-chakra-recipe-system-implementation.md`
- **Strategy:** `strategy-component-styling.md`, `strategy-color-tokens.md`
- **ADRs:** ADR-009 (MD3 opacity baseline), ADR-012 (semantic button tokens), ADR-016 (interaction state improvements)
- **Recipe Files:** `frontend/src/theme/recipes/` (button, alert, badge, select, checkbox, radio, switch, input wrappers)
