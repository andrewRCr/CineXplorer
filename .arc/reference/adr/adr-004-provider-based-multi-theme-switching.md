# ADR-004: Use Provider-Based System Recreation for Multi-Theme Switching

## Status

Accepted

## Context

CineXplorer requires support for multiple custom themes with full light/dark mode support for each theme.
Users need to switch between these themes dynamically at runtime.

Chakra UI v3 documentation focuses primarily on single-theme applications with light/dark mode toggling.
Multi-theme switching is not officially documented in Chakra UI v3, creating uncertainty about the correct
implementation approach.

### Alternatives Considered

**Option 1: CSS Selector Approach (Panda CSS Pattern)**

Use Panda CSS's `conditions` with `data-theme` attributes to define theme-specific values:

```typescript
defineConfig({
  conditions: {
    light: "[data-theme=light] &",
    dark: "[data-theme=dark] &",
    github: "[data-theme=github] &",
    carbon: "[data-theme=carbon] &",
  },
  theme: {
    semanticTokens: {
      colors: {
        background: {
          value: {
            github: "#ffffff",
            carbon: "#f4f4f4",
            // ...
          }
        }
      }
    }
  }
})
```

**Investigation:** Extensively tested (2400+ lines of debugging notes). This pattern works in Panda CSS but
does NOT work in Chakra UI v3. Despite correct CSS variable generation, themes fail to apply properly.
Chakra UI v3's integration with Panda CSS is not 1:1 - patterns documented for Panda don't translate
directly to Chakra.

**Result:** Non-functional after extensive investigation.

**Option 2: Single System with Runtime CSS Variable Updates**

Create one system at initialization, update CSS variables directly when theme changes:

```typescript
const system = createSystem(config); // Once
// On theme change, update CSS vars directly
document.documentElement.style.setProperty('--background', newColor);
```

**Issues:**

- Requires manually managing 33 tokens × 2 modes = 66 CSS variable updates
- Bypasses Chakra's token system and type safety
- No official documentation or community examples
- Fragile (CSS variable names could change in Chakra updates)

**Result:** Rejected - too fragile and unmaintainable.

**Option 3: Provider Recreation with System Regeneration (Crema Pattern)**

Recreate the entire Chakra system when theme changes, triggering provider re-render with new theme:

```typescript
export function createThemeSystem(theme: Theme) {
  const baseTokens = createBaseTokens(theme);
  const themeConfig = defineConfig({
    theme: {
      tokens: { colors: baseTokens },
      semanticTokens: createSemanticTokens(theme),
    },
  });
  return createSystem(defaultConfig, baseConfig, themeConfig);
}

// On theme change
const newSystem = createThemeSystem(selectedTheme);
setSystem(newSystem); // ChakraProvider re-renders
```

**Supporting Evidence:**

1. **Crema.us Blog Post** (Primary Source):
   - Title: "Make a Custom Color Theme Switcher with Chakra UI and Semantic Tokens"
   - URL: <https://www.crema.us/blog/make-a-custom-color-theme-switcher-with-chakra-ui-and-semantic-tokens>
   - Shows working implementation using this exact pattern
   - Describes it as "merging the selected colors into the theme"
   - Only documented working solution for Chakra UI v3 multi-theme switching found online

2. **GitHub Discussion #3873** (Validation):
   - URL: <https://github.com/chakra-ui/chakra-ui/discussions/3873>
   - While for Chakra UI v2, uses identical approach (minor naming differences)
   - Confirmed by Chakra maintainers as correct pattern for multi-theme switching
   - Validates that provider recreation is the documented approach, not a hack

3. **Community Search Results**:
   - No other working multi-theme implementations found for Chakra UI v3
   - Panda CSS documentation doesn't apply directly to Chakra UI v3
   - Official Chakra UI v3 docs don't address multi-custom-theme use case

**Performance Concerns:**

Initial concern: `createSystem()` is designed for one-time initialization, not repeated calls.
Chakra UI v3 performance benchmarks show ~2x slower rendering vs v2, with system creation overhead
identified as contributor.

**Performance Measurement (Critical Decision Factor):**

Measured actual impact on CineXplorer:

- Initial page load: ~10ms for system creation
- Theme switch (system recreation): ~19ms
- Difference: 9ms overhead per theme change

**Analysis:**

- Theme changes occur: Once per session (user preference selection)
- NOT occurring: On every render, continuously, or frequently
- User perception threshold: ~100ms for "instant" feedback
- 19ms = imperceptible to users, well below perception threshold
- Trade-off: 9ms one-time cost vs. weeks of debugging alternatives

**Result:** Acceptable performance cost for working solution.

### Implementation Details: Crema Pattern Refinements

**Color Format Discovery:**

Initial implementation used RGB space-separated values (`"255 255 255"`) with `rgb()` wrapper, added during
debugging as blind attempt. Later POC testing revealed:

- ✅ Hex values work perfectly: `"#ffffff"`
- ✅ Token references work: `{colors.light.background}`
- ✅ No conversion needed: Direct palette values
- ✅ Simpler and more DRY

RGB conversion was a **debugging artifact**, not a requirement. Adopted Crema pattern with hex values +
token references as final implementation.

**Two-Layer Token Architecture:**

```typescript
// Layer 1: Base tokens (hex values from palettes)
base_tokens: {
  light: { background: { value: "#ffffff" } },
  dark: { background: { value: "#0d1117" } }
}

// Layer 2: Semantic tokens (references to base tokens)
semantic_tokens: {
  colors: {
    background: {
      value: {
        base: "{colors.light.background}",   // Light mode reference
        _dark: "{colors.dark.background}",   // Dark mode reference
      }
    }
  }
}
```

**Key Properties:**

- `base` property: Default/light mode value
- `_dark` property: Dark mode override
- Chakra resolves references automatically based on color mode

## Decision

We will implement multi-theme switching using provider-based system recreation:

1. **System Creation Function:** Create `createThemeSystem(theme)` that generates a complete Chakra UI system for any theme
2. **Provider Pattern:** Use React state to hold current system, update ChakraProvider when theme changes
3. **Color Format:** Use hex values directly from palette files (no RGB conversion)
4. **Token Structure:** Two-layer architecture (base tokens + semantic token references)
5. **Mode Switching:** Use `base` and `_dark` properties for light/dark mode support
6. **Programmatic Generation:** Generate 33 semantic tokens × 2 modes programmatically (not hand-written)

**Implementation Location:** `frontend/src/theme/index.ts`

**Theme Storage:** localStorage persistence of user's selected theme

## Consequences

### Positive

**Functionality:**

- ✅ Multi-theme switching works reliably across all 7 themes
- ✅ Full light/dark mode support per theme
- ✅ Type-safe theme definitions with TypeScript
- ✅ Opacity modifiers work correctly (`bg="primary/50"`)
- ✅ All 33 semantic tokens function as expected

**Code Quality:**

- ✅ Simpler than alternatives (no CSS variable management)
- ✅ DRY: Token references eliminate value duplication
- ✅ Maintainable: Adding theme = add palette + theme definition file
- ✅ Standard pattern: Validated by Crema blog and GitHub discussion
- ✅ Professional: Uses official design system palettes (GitHub Primer, IBM Carbon, etc.)

**Developer Experience:**

- ✅ Clear separation: Palettes → Themes → System
- ✅ Type safety prevents missing token errors
- ✅ Easy to test: Each theme self-contained

### Negative

**Performance:**

- ⚠️ 19ms overhead on theme switch (vs theoretical 10ms for alternatives)
- Trade-off accepted: 9ms cost negligible for one-time user action
- Monitored: If theme switching becomes frequent, could revisit

**Non-Standard Approach:**

- ⚠️ Not officially documented in Chakra UI v3 docs
- Reliance on community patterns (Crema blog, GitHub discussions)
- Risk: Future Chakra updates could change system creation semantics
- Mitigation: Pattern used in v2 and v3, likely stable

**System Recreation:**

- ⚠️ Creates new system object on every theme change
- React re-renders entire component tree under ChakraProvider
- Trade-off accepted: Only working pattern found after extensive investigation
- 2400+ lines of debugging notes document failed alternatives

### Risks

**Chakra UI Updates:**

- Future versions might optimize system creation, making this pattern more expensive
- Or might add official multi-theme support, making this obsolete
- Mitigation: Monitor Chakra release notes, be prepared to migrate if better patterns emerge

**Performance at Scale:**

- Current measurement: 19ms for system with 33 tokens
- Unknown: Impact if token count grows significantly (100+ tokens)
- Mitigation: Continue measuring, consider alternatives if performance degrades

### Lessons Learned

**Documentation vs Reality:**

- Panda CSS patterns documented but don't work in Chakra UI v3
- Official docs focus on single-theme use case
- Working implementations (Crema blog) more valuable than theoretical docs

**Debugging Artifacts:**

- RGB conversion was added blindly during debugging
- Worked, so it persisted - but wasn't optimal
- POC testing revealed simpler hex approach works equally well
- Lesson: Revisit assumptions after finding working solution

**Community Validation:**

- Single blog post + GitHub discussion = only evidence this is correct approach
- Small sample size, but aligned with maintainer guidance
- Sometimes community knowledge fills documentation gaps

---

**Date:** 2025-11-03
**Related Decisions:** ADR-003 (Semantic Token System)
**References:**

- Implementation: `frontend/src/theme/index.ts`
- Investigation Notes: `notes-theme-system-modernization.md` (2400+ lines, Task 4.1.5a-4.1.5b)
- Strategy: `../strategies/project/style/strategy-semantic-tokens.md` (token usage guide)
