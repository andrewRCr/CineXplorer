# Incidental: Theme System Modernization

**Created:** 2025-11-02
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress
**Resumes:** `.arc/active/incidental/tasks-discover-endpoint-consolidation.md` at Phase 3.2 upon completion

## Context

**Discovered:** During Phase 3 frontend migration (discover-endpoint-consolidation), while implementing Featured page component.

**Interrupts:** `.arc/active/incidental/tasks-discover-endpoint-consolidation.md` at Phase 3.1 complete.

**Problem:** Current theme system lacks semantic structure and light mode support. Theme uses non-semantic raw
tokens (hex color names like "fed7d7"), hardcoded gradients, and no light/dark mode conditionals. This makes
color decisions difficult and prevents proper light mode implementation.

**Why Now:**

- Already touching frontend components for endpoint migration work
- Featured page just created, navbar/footer/sidebar will be touched soon
- Better to establish semantic structure now before touching more components
- arc-portfolio has proven semantic structure (shadcn/ui convention) we can adapt
- Enables easier theme experimentation during future UI/UX work
- ~4-6 hours to set up structure, then incremental as we touch components

## Scope

### Will Do

- Audit current color usage in codebase (identify which colors actually used)
- Document currently-used colors as reference palette (dark mode only, for future reference)
- Implement shadcn/ui semantic token structure adapted for Chakra UI v3
- **Validate token structure sufficiency for movie application UI patterns**
- **Research semantic token best practices and extend structure if needed**
- Implement 7 complete theme options (github, ibm-carbon, gitlab-pajamas, tangere-terminal, sage-bone,
  stone-greige, muted-earth)
- Enable dynamic multi-theme switching (programmatic generation from theme registry)
- Add theme selector component for choosing between themes (development + potential user feature)
- **Migrate ALL existing components to semantic tokens (comprehensive, not incremental)**
- **Create component migration mapping guide (old tokens → new tokens)**
- Create/update comprehensive theme showcase page (Chakra UI v3 components + typography)
- Document semantic token usage patterns and guidelines

### Won't Do

- ~~Migrate all components immediately (incremental as we touch them in future work)~~
  **CHANGED: Now doing comprehensive migration**
- Design custom CineXplorer color palette (deferred to future dedicated UI/UX work)
- Create light mode variant of current colors (won't be used, current colors reference only)

---

## Tasks

### **[x] Phase 1:** Audit and Documentation

**Purpose:** Understand current color usage and preserve reference for future theme decisions.

- [x] **1.1 Audit color usage in codebase**

    **Completed:** Comprehensive audit of all color usage across components and pages.

    **Findings documented in:** `notes-theme-system-modernization.md` (Phase 1.1 section)

    **Key discoveries:**
    - Most semantic tokens actively used and well-structured
    - All gradients are UNUSED (candidates for removal)
    - Several components bypass semantic tokens (ErrorBoundary, Featured, Login/Register)
    - Unused raw tokens: `nearBlack`, `customGrayBorder`, all three gradient tokens
    - Hardcoded colors found: Chakra `red.*`, `gray.*`, `blue.*`, inline hex `#4299e1`
    - 8 semantic tokens defined but not found in audit (may be unused or search missed edge cases)

    **Recommendation:** Preserve only actively-used colors for reference palette

- [x] **1.2 Create reference palette from current colors**

    **Completed:** Created reference palette documenting actively-used colors from original theme.

    **File created:** `frontend/src/theme/palettes/cinexplorer-original.ts`

    **Colors preserved (26 total):**
    - Base: white, black
    - Grays: gray_200, gray_300, gray_400, gray_500, gray_700
    - Dark surfaces: discord_dark, chakra_gray_900, tailwind_zinc_900
    - Blues (accent): blue_500, blue_700, blue_63b3ed, blue_4299e1
    - Status: red_500, error_border, success_green, success_green_dark, success_border
    - Tags: teal, purple

    **Colors excluded (unused):**
    - nearBlack - No usage found
    - All gradients (gradientGrayLeft, gradientGrayCentered, gradientNavy) - No usage found
    - customGrayBorder - Duplicate of gray_500, not referenced

    **Documentation:**
    - Marked as "REFERENCE ONLY - will NOT be used in application"
    - Comprehensive JSDoc comments explaining each color's original usage
    - Notes on excluded colors and rationale
    - Usage guide for future custom theme development

    **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

### **[x] Phase 2:** Semantic Structure Implementation

**Purpose:** Set up shadcn/ui semantic token structure adapted for Chakra UI v3.

- [x] **2.1 Create type definitions**

    **Completed:** Created comprehensive TypeScript type definitions for theme system.

    **File created:** `frontend/src/theme/types.ts`

    **Types defined:**
    - `ThemeColors` interface - shadcn/ui semantic tokens (20 tokens total)
        - Base colors: background, foreground
        - Card colors: card, card-foreground
        - Popover colors: popover, popover-foreground
        - Primary colors: primary, primary-foreground
        - Secondary colors: secondary, secondary-foreground
        - Muted colors: muted, muted-foreground
        - Accent colors: accent, accent-foreground
        - Destructive colors: destructive, destructive-foreground
        - UI elements: border, input, ring
    - `Theme` interface - Complete theme with name, label, light, dark palettes
    - `ThemeRegistry` type - Registry mapping theme names to definitions

    **Documentation:**
    - Comprehensive JSDoc for all interfaces and properties
    - Organized by semantic category (Base, Card, Popover, etc.)
    - Explains RGB space-separated format for Chakra UI opacity support
    - Usage examples and notes on theme immutability

    **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

- [x] **2.2 Implement starter theme collection**

    **Completed:** Implemented 7 complete theme options (palettes + definitions) following shadcn/ui semantic structure.

    **Researched Themes** (external-research-analyst agent):
    - IBM Carbon - `palettes/ibm-carbon.ts`, `definitions/ibm-carbon.ts`
        - Enterprise-grade, distinctive blue accent, 3-layer system, WCAG AA
        - Source: <https://carbondesignsystem.com> (official Carbon v10 tokens)
    - GitLab Pajamas - `palettes/gitlab-pajamas.ts`, `definitions/gitlab-pajamas.ts`
        - Clean modern neutral with blue primary accent
        - Source: <https://design.gitlab.com> (official @gitlab/ui tokens)
    - Tangere Terminal - `palettes/tangere-terminal.ts`, `definitions/tangere-terminal.ts`
        - Sophisticated terminal-inspired, complementary color harmony
        - Source: <https://github.com/ftonneau/tangere-terminal> (MIT licensed)
        - Semantic mappings derived from Vim/Kakoune colorschemes
    - GitHub Primer - `palettes/github.ts`, `definitions/github.ts`
        - Neutral professional baseline, proven at scale
        - Source: <https://primer.style> (official Primer primitives)

    **Custom Themes** (provided values):
    - Sage & Bone - `palettes/sage-bone.ts`, `definitions/sage-bone.ts`
        - Calm nature-inspired, soft sage green on warm bone whites
    - Stone & Greige - `palettes/stone-greige.ts`, `definitions/stone-greige.ts`
        - Minimal architectural, refined neutrals with subtle warmth
    - Muted Earth - `palettes/muted-earth.ts`, `definitions/muted-earth.ts`
        - Warmest option, creamy linen with terracotta/rust accents

    **Implementation pattern** (consistent across all themes):
    - Palette files: Raw hex color values for light + dark modes (~26 colors each)
    - Definition files: Semantic token mappings using `hexToRgb()` helper
    - Full shadcn/ui coverage: 20 semantic tokens per mode
    - TypeScript type safety with palette color name types
    - Comprehensive JSDoc documentation with design philosophy notes

    **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

- [x] **2.3 Update Chakra UI theme configuration and add theme controls**

    - [x] **2.3.1 Update Chakra UI theme configuration**

        **Completed:** Fully integrated theme system with Chakra UI v3 conditional semantic tokens.

        **File updated:** `frontend/src/theme/index.ts`

        **Implementation:**
        - Imported all 7 theme definitions (github, ibm-carbon, gitlab-pajamas, tangere-terminal, sage-bone,
          stone-greige, muted-earth)
        - Created `themeRegistry` mapping theme names to Theme objects
        - Added `getTheme()` helper function with fallback to default
        - Configured "github" as `defaultThemeName` (neutral baseline)
        - Created `themeToSemanticTokens()` converter function
        - Converted all 20 shadcn/ui semantic tokens to Chakra v3 `_light`/`_dark` conditional format
        - Preserved RGB space-separated format for Chakra UI opacity support
        - Updated `globalCss` to use new semantic tokens (background, foreground)

        **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

    - [x] **2.3.2 Verify existing light/dark mode toggle**

        **Completed:** Confirmed existing `ColorModeButton` component works with new theme system.

        **Existing implementation:** `frontend/src/components/chakra/color-mode.tsx`

        **Discovery:**
        - CineXplorer already has complete color mode infrastructure using next-themes
        - `ColorModeProvider` wraps app in `provider.tsx` (same approach as arc-portfolio)
        - `ColorModeButton` component ready to use with Sun/Moon icons (LuSun/LuMoon)
        - `useColorMode()` hook provides colorMode, setColorMode, toggleColorMode
        - Component includes proper SSR handling with ClientOnly + Skeleton fallback
        - Fully compatible with new theme system (both use next-themes)

        **No migration needed:** Existing component is well-designed and ready for footer integration.

        **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

    - [x] **2.3.3 Refactor theme system for dynamic switching**

        **Completed:** Successfully refactored theme system to programmatically generate from registry,
        enabling "just add a file" workflow.

        **Implementation:**

        - [x] **2.3.3.1 Auto-generate theme infrastructure from registry**
            - Created `generateThemeConditions()` function to derive conditions from `themeRegistry` keys
            - Generates 7 condition definitions (e.g., `githubTheme: '[data-theme="github"] &'`)
            - Created `ThemeSelectProvider` component using next-themes with `data-theme` attribute
            - Configured with all 7 theme names, default theme "github", storage key "cinexplorer-theme"
            - Deleted old `ThemeContext.tsx` (replaced by next-themes integration)
            - Updated main `Provider` to include both `ThemeSelectProvider` and `ColorModeProvider`

        - [x] **2.3.3.2 Programmatically generate semantic tokens from all themes**
            - Created `generateSemanticTokens()` function to auto-generate from registry
            - Iterates all 20 semantic tokens × 7 themes = 140 token definitions
            - Each token includes theme condition with light (`base`) and dark (`_dark`) variants
            - Replaced hardcoded `githubTheme` references with programmatic generation
            - Used eslint-disable for `any` types (Chakra defineConfig requires dynamic structure)

        **Files modified:**
        - `frontend/src/theme/index.ts` - Refactored with auto-generation functions
        - `frontend/src/components/chakra/provider.tsx` - Added ThemeSelectProvider
        - `frontend/src/components/chakra/theme-provider.tsx` - NEW (theme selection provider)
        - `frontend/src/contexts/ThemeContext.tsx` - DELETED (replaced by next-themes)

        **Result:** Adding new themes now requires only creating theme file + adding to registry.
        No central config changes needed.

        **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

    - [x] **2.3.4 Build theme switcher component**

        **Completed:** Created ThemeSelector component with full SSR support and auto-discovery from registry.

        **Implementation:**
        - Created `frontend/src/components/ThemeSelector.tsx` component
        - Integrated next-themes `useTheme()` hook for state management (theme, setTheme)
        - Auto-populates from `themeRegistry` - maps entries to ThemeOption with value/label/description
        - Built dropdown UI using Chakra MenuRoot, MenuTrigger, MenuContent, MenuItem components
        - Displays current theme in button trigger with user-friendly label
        - Highlights selected theme in menu with `accent` background color
        - Added SSR hydration handling:
            - `useState` + `useEffect` for mounted state check
            - Returns `<Skeleton>` during SSR and initial render
            - Wrapped in `ClientOnly` with Skeleton fallback
        - Component auto-discovers all themes - adding themes requires no component changes

        **Files created:**
        - `frontend/src/components/ThemeSelector.tsx` - NEW (89 lines with docs)

        **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

    - [x] **2.3.5 Integration and testing**

        - [x] **2.3.5.1 Integrate theme switcher into footer**

            **Completed:** Added ThemeSelector and ColorModeButton to footer with organized layout.

            **Implementation:**
            - Imported ThemeSelector and ColorModeButton components
            - Created new "Theme Controls Row" as first item in footer VStack
            - Used HStack for horizontal layout (ThemeSelector + ColorModeButton)
            - Set gap={2} for spacing between controls
            - Positioned controls above copyright and TMDB attribution rows
            - Updated aria-label to include "theme controls"
            - Removed unused Flex import

            **Files modified:**
            - `frontend/src/components/layout/Footer.tsx`

            **Quality gates:** ✅ Frontend linting (0 errors), TypeScript (0 errors)

### **Phase 3:** Token System Validation & Mapping Strategy

**Purpose:** Validate token structure sufficiency and create comprehensive mapping strategy before migration.
Measure twice, cut once - ensure our semantic token structure handles all movie application UI patterns.

**Exit Criteria:** Token structure validated, all UI patterns mappable, migration guide complete, ready for
comprehensive component migration.

- [x] **3.1 Research semantic token best practices**

    **Completed:** 2025-11-02

    **Comprehensive synthesis documented in:** `notes-theme-system-modernization.md` (Phase 3.1 section, ~640 lines)

    **Research Conducted:**
    - ✅ Material Design 3 (20KB) - Google's design system, tone-based surfaces
    - ✅ IBM Carbon Design System (22KB) - Enterprise patterns, layer system
    - ✅ GitHub Primer (23KB) - Proven at scale, foundation-first approach
    - ✅ Ant Design (24KB) - Comprehensive token taxonomy, Rate component
    - **Total:** 89KB analyzed across 4 production design systems

    **Key Findings:**

    1. **Success/Warning/Info Tokens (CRITICAL):**
       - All 4 systems include complete status token sets
       - Recommended colors: Success `#198038` (IBM Carbon), Warning `#faad14` (Ant Design), Info `#0f62fe` (IBM Carbon)
       - Pattern validated: All systems use semantic role + foreground pairs

    2. **Rating Tokens (CRITICAL - Movie-Specific):**
       - Ant Design has dedicated Rate component with gold star default
       - IMDb gold `#F5C518` validated as industry standard
       - Justification confirmed: Rating ≠ warning (distinct semantic meaning)

    3. **Surface Elevation (HIGH PRIORITY):**
       - All 4 systems have 3+ surface levels (MD3: 6 levels, Carbon: 4 layers, Primer: 3 levels, Ant: 5 variants)
       - Pattern: Tonal variation creates depth (not shadows alone)
       - CineXplorer needs 3 levels: background, card, surface-elevated

    4. **Badge/Tag Tokens (HIGH PRIORITY):**
       - All 4 systems have dedicated badge/tag patterns
       - IBM Carbon: Layer-contextual tags, GitHub Primer: Muted/emphasis variants, Ant Design: Status presets
       - Minimal implementation: 2 tokens (badge, badge-foreground) + leverage semantic colors

    5. **Drag-and-Drop States (HIGH PRIORITY):**
       - Material Design 3 has dedicated 16% opacity drag state
       - Most systems reuse active/hover states
       - User-requested feature justifies dedicated tokens for clarity

    **Cross-System Insights:**
    - Token counts: Production systems range from 64 (Primer) to 1000+ (Material Design 3)
    - Our proposed 33 tokens is conservative vs industry averages (40-415+)
    - Universal patterns: Hierarchical structure, semantic naming, paired tokens, accessibility standards
    - All systems require 4.5:1 contrast (WCAG AA) for normal text

    **Validated Token Extension:** 13 new tokens confirmed
    - Status pairs: 6 tokens (success, warning, info + foregrounds)
    - Rating pair: 2 tokens (movie-specific)
    - Surface elevation: 1 token (3rd surface level)
    - Badge pair: 2 tokens (neutral badges)
    - Drag-and-drop: 2 tokens (drag-active, drop-zone)
    - **Total: 33 semantic tokens** (20 base + 13 extension)

    **Research Quality:**
    - ✅ Coverage: Excellent (4 systems, enterprise + consumer + OSS)
    - ✅ Relevance: High (all gaps addressed, movie patterns found)
    - ✅ Actionability: Strong (specific colors, naming, implementation guidance)
    - ✅ Confidence: High (consistent patterns, no contradictions)

- [x] **3.2 Analyze movie application UI patterns**

    **Completed:** 2025-11-02

    **Comprehensive analysis documented in:** `notes-theme-system-modernization.md` (Phase 3.2 section)

    **Work Completed:**
    1. ✅ Inventoried 10 UI pattern categories in CineXplorer codebase:
       - Movie cards, score displays, hero sections, forms, navigation, filters, pagination,
         error boundaries, status indicators, badges
       - Documented current token usage and hardcoded colors per component
       - Identified token requirements for each pattern

    2. ✅ Researched reference applications via external-research-analyst agent:
       - **Letterboxd**: Dark-first design, 5-star gold ratings, 2-level surfaces, minimal badges
       - **Netflix**: Black bg, red accent, 3-4 surface levels, % match scores, strong hover states
       - **IMDb**: Light mode default, iconic gold (#F5C518) rating badges, 10-point scale
       - Cross-platform synthesis documented with common patterns

    3. ✅ Documented token requirements per pattern with file/line references

    4. ✅ Identified critical gaps in shadcn/ui base 20 tokens:
       - **CRITICAL (4 gaps):** success, warning, info semantic pairs + rating color
       - **HIGH PRIORITY (2 gaps):** surface-elevated (3rd level) + badge semantic pairs
       - **NICE-TO-HAVE (2 gaps):** watch status colors + interactive button accent

    **Key Findings:**
    - Current system has extensive hardcoded colors: ErrorBoundary (red.*/gray.*/blue.*),
      MovieUserScore (blue.700/yellow.700/green.600), Login (#4299e1 inline), others
    - Industry standard: IMDb gold (#F5C518) for ratings, success/warning/info in all major systems
    - Production systems use 40-140+ tokens vs shadcn/ui's intentionally minimal 20
    - Minimum viable extension: 8 new tokens (4 pairs: success, warning, info, rating)
    - Recommended extension: 13 tokens (adds surface-elevated, badge pair, 2 badge variants)
    - Comprehensive extension: 18 tokens (adds rating thresholds, watch status)

    **Next Steps (Task 3.3):**
    - Map ALL 20 shadcn/ui tokens with use cases
    - Create comprehensive migration guide (old tokens → new tokens)
    - Identify every instance of hardcoded colors for migration
    - Prioritize gaps (critical vs nice-to-have)

- [x] **3.3 Audit current token coverage**

    **Completed:** 2025-11-02

    **Comprehensive audit documented in:** `notes-theme-system-modernization.md` (Phase 3.3 section)

    **Work Completed:**
    1. ✅ Listed all 20 shadcn/ui tokens with semantic purposes and use cases
       - Documented in reference table (11 pairs + 3 singles = 20 concepts)

    2. ✅ Mapped 28 legacy custom tokens to new shadcn/ui structure:
       - **Direct 1:1 mappings:** 4 tokens (background.main → background, etc.)
       - **Many-to-one deduplication:** 16 tokens consolidate to 5 shadcn/ui tokens
       - **Gaps requiring new tokens:** 8 old tokens have no shadcn/ui equivalent

    3. ✅ Created comprehensive migration guide with 3 categories:
       - Direct mappings (no changes needed)
       - Deduplication opportunities (simplification)
       - Missing tokens (requires extension)

    4. ✅ Cataloged all hardcoded colors needing migration:
       - **ErrorBoundary:** 15+ instances (red.*, gray.*, blue.*)
       - **MovieUserScore:** 7 instances (rating color thresholds)
       - **Login:** 5 instances (alerts, links)
       - **Featured, MovieCard, PaginationCtrl:** 3 instances each (colorScheme props)
       - **Total:** 25+ hardcoded colors across 7 components

    5. ✅ Prioritized gaps into 3 tiers:
       - **CRITICAL (8 tokens):** success, warning, info, rating pairs - blocks migration
       - **HIGH (5 tokens):** surface-elevated, badge pair, drag-and-drop states
       - **NICE-TO-HAVE (5 tokens):** rating thresholds, watch status (deferred)

    6. ✅ Added drag-and-drop states per user request:
       - `drag-active` and `drop-zone` tokens for watchlist/favorites reordering
       - Classified as HIGH priority (META-PRD core feature)

    **Key Findings:**
    - **70% alignment:** Most legacy tokens map cleanly to shadcn/ui
    - **13 new tokens recommended:** 8 critical + 5 high priority = 33 total tokens
    - **Migration is incremental:** Extend tokens first, migrate components one-by-one
    - **Concentrated violations:** ErrorBoundary has 60% of all hardcoded colors
    - **Final structure:** 20 (base) + 13 (extensions) = 33 tokens vs industry 40-140+

    **Migration Impact:**
    - 7 components need updates (2-4 hours estimated)
    - ErrorBoundary: High complexity (15+ colors)
    - MovieUserScore: Medium complexity (rating logic)
    - Login/Featured/MovieCard/PaginationCtrl: Low complexity (simple replacements)

    **Next Steps (Task 3.4):**
    - Implement 13-token extension in TypeScript types
    - Document rationale for each token in notes
    - Create ADR for token extension decision
    - Run TypeScript validation

- [x] **3.4 Implement validated 13-token extension**

    **Completed:** Extended theme system from 20 to 33 semantic tokens with comprehensive documentation.

    **Goal:** Extend shadcn/ui's 20 base tokens with 13 research-validated semantic tokens (total: 33 tokens).

    - [x] **3.4.1 Update TypeScript types in `frontend/src/theme/types.ts`**

        **Completed:** Added 13 new tokens to `ThemeColors` interface in organized sections.

        **Tokens added (all with JSDoc documentation):**
        - **Status Colors** (6 tokens): `success`, `success-foreground`, `warning`, `warning-foreground`, `info`, `info-foreground`
        - **Rating Colors** (2 tokens): `rating`, `rating-foreground` (with note about IMDb gold #F5C518 and light/dark variations)
        - **Surface Elevation** (1 token): `surface-elevated` (documented elevation hierarchy and Material Design 3 approach)
        - **Badge Colors** (2 tokens): `badge`, `badge-foreground`
        - **Interactive States** (2 tokens): `drag-active`, `drop-zone`

        **File modified:** `frontend/src/theme/types.ts` (extended from 20 to 33 tokens)

        **Type checking result:** TypeScript correctly identifies that all 7 theme definitions now need
        updating (expected behavior, will be resolved in Task 3.5)

    - [x] **3.4.2 Create ADR documenting token extension decision**

        **Completed:** Created comprehensive ADR following strategy-adr-methodology.md guidelines.

        **File created:** `.arc/reference/adr/adr-003-extend-semantic-token-system.md`

        **ADR structure:**
        - **Status:** Accepted
        - **Context:** Phase 3.1 research (89KB across 4 design systems), Phase 3.2 gap analysis,
          movie application specific needs, external constraints
        - **Decision:** Extend from 20 to 33 tokens (13 new) organized into 5 semantic categories
          with baseline colors and implementation plan
        - **Alternatives considered:**
            - Option A: Reuse existing tokens creatively (rejected - semantic clarity lost)
            - Option B: Add only critical 8 tokens (rejected - defers known needs)
            - Option C: Implement all 13 tokens now (selected - comprehensive approach)
        - **Consequences:** Complete coverage, industry alignment, semantic clarity vs one-time
          maintenance cost and increased complexity

        **Quality gate:** ✅ Markdown linting passes (0 errors)

- [ ] **3.5 Update all theme definitions with extended tokens**

    **Goal:** Add 13 new token values to all 7 themes while maintaining each theme's character and contrast standards.

    - [x] **3.5.1 Add tokens to each theme definition file**

        **Completed:** Added 13 new tokens to all 7 themes (light + dark modes) with clear official vs adapted distinctions.

        **Official Design Systems (with official/adapted markers):**
        - ✅ GitHub Primer - Extended palette + definitions (warning/info adapted, rating adapted from Primer yellow scale)
        - ✅ IBM Carbon - Extended palette + definitions (warning/info official, rating adapted from Carbon yellow)
        - ✅ GitLab Pajamas - Extended palette + definitions (warning/info official, rating adapted for GitLab aesthetic)

        **Custom/Community Themes (with extension markers):**
        - ✅ Tangere Terminal - Extended palette + definitions (rating reuses existing warning color)
        - ✅ Sage & Bone - Extended palette + definitions (rating uses warm amber)
        - ✅ Stone & Greige - Extended palette + definitions (rating uses warm amber)
        - ✅ Muted Earth - Extended palette + definitions (rating uses warm amber)

        **Quality gate:** ✅ TypeScript type checking passes (0 errors)

        - For EACH of the 7 themes, new token definitions added:
            - GitHub Primer (`definitions/github.ts`, `palettes/github.ts` if needed)
            - IBM Carbon (`definitions/ibm-carbon.ts`, `palettes/ibm-carbon.ts` if needed)
            - GitLab Pajamas (`definitions/gitlab-pajamas.ts`, `palettes/gitlab-pajamas.ts` if needed)
            - Tangere Terminal (`definitions/tangere-terminal.ts`, `palettes/tangere-terminal.ts` if needed)
            - Sage & Bone (`definitions/sage-bone.ts`, `palettes/sage-bone.ts` if needed)
            - Stone & Greige (`definitions/stone-greige.ts`, `palettes/stone-greige.ts` if needed)
            - Muted Earth (`definitions/muted-earth.ts`, `palettes/muted-earth.ts` if needed)
        - **Color selection guidance per token (from Phase 3.1 synthesis):**
            - Success/warning/info: Use theme-appropriate variants of baseline colors, maintain semantic meaning
            - Rating token: Use `#F5C518` (IMDb gold) as baseline, adjust hue to match theme palette
            - Surface-elevated: Follow tonal progression (lighter in dark mode per Material Design 3 approach)
            - Badge: Neutral variant from theme palette (similar to muted but distinct)
            - Drag-and-drop: Drag-active similar to accent emphasis, drop-zone subtle success/accent tint
        - **Ensure consistency:**
            - Maintain theme character (professional vs warm vs terminal, etc.)
            - Success/warning/info colors appropriate for each theme's palette
            - Rating gold adapted to theme (warmer for warm themes, cooler for professional)
        - **Quality gates per theme:**
            - Verify WCAG AA contrast (4.5:1 for normal text on all new token backgrounds)
            - Test visually with ThemeSelector to ensure cohesion
            - No TypeScript errors after updates

    - [ ] **3.5.2 Update `frontend/src/theme/index.ts` for token generation**
        - Extend `generateSemanticTokens()` function to include all 13 new tokens
        - Update Chakra UI theme config with new conditional tokens (light/dark mode)
        - Handle light/dark variations:
            - Rating token: Different values per mode for optimal contrast
            - Surface-elevated: Tonal shift appropriate to mode
        - Quality gate: All 7 themes generate correctly, no runtime errors

    - [ ] **3.5.3 Verify contrast requirements using WebAIM or similar tool**
        - Test all extended tokens in light and dark modes
        - Verify 4.5:1 contrast ratio minimum (WCAG AA) for text tokens
        - Verify 3:1 contrast ratio minimum for UI component tokens
        - Document any adjustments needed per theme
        - Quality gate: All tokens meet or exceed WCAG AA standards

- [ ] **3.6 Consolidate migration mappings into strategy document**

    **Goal:** Create reusable strategy document from existing Phase 3.3 migration analysis.

    - [ ] **3.6.1 Create strategy document structure**
        - Create new file: `.arc/reference/strategies/strategy-semantic-tokens.md`
        - Document token structure overview:
            - Base shadcn/ui tokens (20 original)
            - Extended tokens (13 new = 33 total)
            - Token naming conventions and usage philosophy
        - Quality gate: File structure created

    - [ ] **3.6.2 Extract and consolidate migration mappings from Phase 3.3**
        - **Source:** `notes-theme-system-modernization.md` Phase 3.3 section (~390 lines)
        - Extract existing mapping tables (already documented):
            - Legacy token mapping (28 old tokens → new tokens)
            - Hardcoded color catalog (25+ instances with file:line references)
            - Migration guide (3 categories: direct 1:1, many-to-one, gaps requiring extensions)
        - Consolidate into strategy document with clear sections
        - Add any missing mappings discovered during Phase 3 work
        - Quality gate: All Phase 3.3 mappings incorporated

    - [ ] **3.6.3 Add code examples for common migration patterns**
        - ErrorBoundary: `red.600` → `destructive`, `gray.*` → `muted`, `blue.*` → `info`
        - MovieUserScore: Rating value → `rating` token, background → `success`/`warning` by threshold
        - Login/Auth: Inline `#4299e1` → `accent`, alerts → `success`/`destructive`/`info`
        - Featured page: Hero section → `surface-elevated`, `fg.muted` → `muted-foreground`
        - Genre tags: Neutral tags → `badge`/`badge-foreground`, status → semantic tokens
        - Before/after code snippets for clarity
        - Quality gate: Code examples compile correctly

    - [ ] **3.6.4 Create decision tree: "Which token should I use for X?"**
        - Flowchart or decision table for common scenarios
        - Q: "Is this a status indicator?" → success/warning/info/destructive
        - Q: "Is this a movie rating?" → rating/rating-foreground
        - Q: "Is this a neutral badge/tag?" → badge/badge-foreground
        - Q: "Is this a surface/container?" → background/card/surface-elevated/popover
        - Q: "Is this interactive?" → accent/primary variants, hover patterns
        - Quality gate: Decision tree covers all 33 tokens

    - [ ] **3.6.5 Final quality gate**
        - Markdown linting passes (0 errors)
        - All Phase 3.3 content successfully migrated
        - Strategy document complete and usable for Phase 4 migration

- [ ] **3.7 Document token usage patterns and guidelines**

    **Goal:** Extract best practices from Phase 3.1 research synthesis into actionable developer guidelines.

    - [ ] **3.7.1 Extract accessibility standards from Phase 3.1 synthesis**
        - **Source:** `notes-theme-system-modernization.md` Phase 3.1 section (Accessibility Standards subsection)
        - Document in strategy-semantic-tokens.md:
            - 4.5:1 contrast minimum for normal text (WCAG AA)
            - 3:1 contrast minimum for large text and UI components (WCAG AA)
            - 7:1 contrast enhanced accessibility (WCAG AAA)
            - Never use color alone (always pair with icons, text, or patterns)
            - Focus indicators required, never removed
            - Interactive sizing: 48×48dp minimum touch targets
        - Quality gate: All accessibility requirements documented

    - [ ] **3.7.2 Extract interactive state patterns from Phase 3.1 synthesis**
        - **Source:** Phase 3.1 Material Design 3 state layer system findings
        - Document opacity-based patterns:
            - Hover: 8% opacity overlay
            - Focus: 12% opacity overlay
            - Pressed/Active: 12% opacity overlay
            - Drag: 16% opacity overlay
            - Disabled: 38% opacity (reduced contrast)
        - Note: Overlays use foreground color at specified opacity, not color changes
        - Provide Chakra UI implementation guidance
        - Quality gate: Interactive patterns clearly explained

    - [ ] **3.7.3 Document semantic naming philosophy**
        - **Source:** Phase 3.1 cross-system insights (Common Architectural Patterns)
        - Semantic over descriptive naming:
            - ✅ `success`, `warning`, `info` (semantic meaning)
            - ❌ `green`, `yellow`, `blue` (descriptive colors)
            - Why: Enables theme switching without renaming tokens
        - Token pairing conventions:
            - Always pair colors with foreground variants (`success` / `success-foreground`)
            - Ensures contrast maintained across themes
        - Quality gate: Philosophy clearly articulated

    - [ ] **3.7.4 Create developer quick reference card**
        - Most common patterns:
            - When to use semantic tokens vs Chakra raw colors (always semantic)
            - How to handle edge cases (document, don't bypass system)
            - Token decision flowchart (link to 3.6.4)
        - Anti-patterns to avoid:
            - Never hardcode colors (use tokens)
            - Never use Chakra `red.*`, `gray.*`, `blue.*` directly
            - Never bypass system without documenting rationale
        - Quality gate: Quick reference concise and actionable

    - [ ] **3.7.5 Final strategy document review**
        - Verify completeness:
            - All Phase 3.1 best practices extracted
            - All Phase 3.3 migration mappings consolidated
            - Code examples for all common patterns
            - Decision tree covers all use cases
        - Quality gates: Markdown linting passes, reviewed for clarity

### **Phase 4:** Component Migration (Comprehensive)

**Purpose:** Migrate ALL existing components to semantic tokens in one comprehensive effort. Eliminates tech debt
and ongoing migration overhead in future tasks.

- [ ] **4.1 Convert layout components**
    - **NavBar** (`components/layout/NavBar.tsx`)
        - Replace any direct color references with semantic tokens per mapping guide
        - Test in all 7 themes × 2 modes
    - **NavBarSearch** (`components/layout/NavBarSearch.tsx`)
        - Apply semantic tokens for input styling
    - **NavBarUserMenu** (`components/layout/NavBarUserMenu.tsx`)
        - Update menu item colors to semantic tokens
    - **Sidebar/SidebarContent/SidebarDrawer/sidebarOverlay** (`components/layout/Sidebar*.tsx`)
        - Migrate all sidebar components to semantic tokens
        - Ensure consistent drawer overlay styling
    - **Footer** - Already migrated in Phase 2, verify consistency with new tokens from Phase 3
    - **MobileMenuButton, LoadingContent, LoadingLayout** - Apply tokens as needed

- [ ] **4.2 Convert ErrorBoundary** (60% of all hardcoded colors - 15+ instances)

    **Note:** ErrorBoundary scheduled for end of Phase 4 due to complexity.
    Handle simpler components first to build confidence with token patterns.

    - [ ] **4.2.1 Replace error state colors in `components/ErrorBoundary.tsx`**
        - **Source:** Phase 3.3 hardcoded color catalog
        - `red.600`, `red.700`, `red.800` → `destructive` / `destructive-foreground`
        - `red.50` → `destructive` with low opacity or use `destructive` background with reduced opacity
        - `red.200` → `destructive` with border styling
        - File location: Multiple instances throughout component
        - Quality gate: All red.* colors replaced

    - [ ] **4.2.2 Replace neutral/muted colors**
        - `gray.50`, `gray.100`, `gray.200`, `gray.300`, `gray.400`, `gray.500`,
          `gray.600`, `gray.700` → appropriate semantic tokens:
            - Backgrounds: `muted` / `background`
            - Text: `muted-foreground` / `foreground`
            - Borders: `border`
        - Reference Phase 3.3 mapping guide for specific instances
        - Quality gate: All gray.* colors replaced

    - [ ] **4.2.3 Replace informational message colors**
        - `blue.50`, `blue.100`, `blue.500`, `blue.700` → `info` / `info-foreground`
        - Use for helpful hints, debugging information, non-error messages
        - Quality gate: All blue.* colors replaced with info tokens

    - [ ] **4.2.4 Test error display comprehensively**
        - Test in all 7 themes × 2 modes (14 combinations)
        - Verify readability and contrast in each theme
        - Ensure error messages remain clear and actionable
        - Quality gate: ErrorBoundary displays correctly in all themes

- [ ] **4.3 Convert authentication pages**
    - **Login** (`pages/user/Login.tsx`)
        - Replace inline hex `#4299e1` with semantic token (likely `accent`)
        - Apply semantic tokens to form elements
        - Update border colors (`border.error` → `destructive`, etc.)
    - **Register** (`pages/user/Register.tsx`)
        - Same as Login - replace hardcoded colors
        - Ensure consistent form styling across auth pages
    - **VerifyEmail** (`pages/user/VerifyEmail.tsx`)
        - Update success/error state colors to semantic tokens
        - Apply semantic border colors

- [ ] **4.4 Convert movie components**

    - [ ] **4.4.1 Convert Featured page** (`pages/Featured.tsx`)
        - Replace Chakra `fg`, `fg.muted` with semantic equivalents:
            - `fg` → `foreground`
            - `fg.muted` → `muted-foreground`
        - **Hero section background:** Use `surface-elevated` token for featured content area
        - Apply semantic tokens throughout
        - Quality gate: Featured page uses semantic tokens exclusively

    - [ ] **4.4.2 Convert MovieDetail page** (`pages/movie/MovieDetail.tsx`)
        - Replace `gray.*` usage with semantic tokens per Phase 3.3 mapping
        - Apply tokens to detail sections
        - Quality gate: MovieDetail uses semantic tokens exclusively

    - [ ] **4.4.3 Convert MovieCard component** (`components/movie/MovieCard.tsx`)
        - Apply semantic `card` / `card-foreground` tokens
        - Ensure hover states use semantic patterns (Phase 3.7 interactive patterns)
        - **Genre tags:** Use `badge` / `badge-foreground` for neutral genre labels
        - Quality gate: MovieCard uses semantic tokens exclusively

    - [ ] **4.4.4 Convert MovieCardContainer** (`components/movie/MovieCardContainer.tsx`)
        - Coordinate with MovieCard for consistent styling
        - Quality gate: Container styling consistent with MovieCard

    - [ ] **4.4.5 Convert MovieUserScore component** (`components/movie/MovieUserScore.tsx`)
        - **Score value display:** Use `rating` / `rating-foreground` tokens (IMDb gold standard)
        - **Score threshold backgrounds (optional):**
            - 8.0+ score: `success` background (subtle)
            - 6.0-7.9 score: `warning` background (subtle) or neutral
            - Below 6.0: neutral or `muted` background
        - Pattern: Rating token for value, semantic background for context
        - Reference: Phase 3.2 MovieUserScore analysis
        - Quality gate: Score displays use rating token, backgrounds use semantic tokens

    - [ ] **4.4.6 Convert MovieCollectionGrid, MovieGrid**
        - Apply tokens as needed
        - Ensure grid container styling uses semantic tokens
        - Quality gate: Grid components use semantic tokens

    - [ ] **4.4.7 Convert PageHeader**
        - Update header styling to semantic tokens
        - Quality gate: PageHeader uses semantic tokens

- [ ] **4.5 Convert remaining components**
    - **PaginationCtrl** (`components/layout/PaginationCtrl.tsx`)
        - Update pagination button styling
    - **TypographyTest** (`pages/TypographyTest.tsx`)
        - Update to use semantic tokens (this is a test/showcase page)
    - **Filter components** - Verify already using tokens, update if needed:
        - AdvancedMovieFilters, ClearFiltersButton, CollapsibleSearchBox
        - ConnectedDropdowns, GenreSelector, LetterboxdStyleFilters
        - RatingSelector, SearchBar, SortDropdownMinimal, SortSelector, YearSelector
    - **UserProfile** (`components/user/UserProfile.tsx`) - Apply tokens if needed
    - **Other pages** - Verify and update:
        - Profile, Settings, Watchlist, PersonDetail
        - NowPlaying, Popular, TopRated, Upcoming, SearchResults

- [ ] **4.6 Comprehensive theme system verification**
    - **Test all theme combinations:**
        - Test all 14 combinations (7 themes × 2 color modes)
        - Verify visual consistency across ALL migrated components (not just initial 4)
        - Navigate through all major pages (Featured, detail pages, auth, lists, etc.)
        - Document any theme-specific issues (readability, contrast, visual bugs)
    - **Test persistence:**
        - Verify theme selection persists across page reloads (localStorage: "cinexplorer-theme")
        - Verify color mode persists independently from theme selection (localStorage via next-themes)
        - Test persistence with different combinations (change theme, reload; change mode, reload; change both, reload)
    - **Test switcher controls:**
        - Verify ThemeSelector displays correct current theme
        - Verify ColorModeButton displays correct current mode (moon for dark, sun for light)
        - Test switching between all themes (no errors, immediate visual update)
        - Test toggling light/dark mode (no errors, immediate visual update)
    - **Quality gates:**
        - Run frontend linting (0 errors required)
        - Run TypeScript type checking (0 errors required)
        - Visual regression test across all theme/mode combinations

### **Phase 5:** Theme Showcase

**Purpose:** Create comprehensive theme showcase page for verifying theme implementation and future reference.

- [ ] **5.1 Check existing theme showcase**
    - Verify if CineXplorer has existing theme/typography showcase
    - Review arc-portfolio showcase for reference
    - Determine what needs to be created vs updated

- [ ] **5.2 Create/update theme showcase page**

    - [ ] **5.2.1 Create showcase page structure**
        - Location: `frontend/src/pages/ThemeShowcase.tsx` (or update existing)
        - Organized sections for easy reference:
            - Token palette display
            - Typography samples
            - Component examples
            - Interactive controls
        - Quality gate: Page structure created

    - [ ] **5.2.2 Create comprehensive token palette display**
        - **Display all 33 semantic tokens** (20 base + 13 extended), grouped by category:
            - **Status tokens (8):** success, success-foreground, warning, warning-foreground, info,
              info-foreground, destructive, destructive-foreground
            - **Surfaces (5):** background, foreground, card, card-foreground, surface-elevated, popover, popover-foreground
            - **Interactive (8):** primary, primary-foreground, secondary, secondary-foreground, accent,
              accent-foreground, muted, muted-foreground
            - **Borders & Inputs (3):** border, input, ring
            - **Movie-specific (2):** rating, rating-foreground
            - **Badges (2):** badge, badge-foreground
            - **Drag-and-drop (2):** drag-active, drop-zone
        - Show token name, hex value, and color swatch
        - Update automatically when theme/mode changes
        - Quality gate: All 33 tokens displayed correctly

    - [ ] **5.2.3 Add typography samples**
        - All heading levels (h1-h6)
        - Body text variants
        - Code/monospace
        - Quality gate: Typography displays correctly

    - [ ] **5.2.4 Add component examples**
        - Showcase all Chakra UI v3 components used in app
        - Demonstrate token usage in context
        - Quality gate: Components render correctly

    - [ ] **5.2.5 Add interactive controls**
        - Interactive light/dark mode toggle
        - Theme selector to preview all 7 themes
        - Quality gate: Controls functional, updates showcase live

- [ ] **5.3 Add routing and navigation**
    - Add route in App.tsx
    - Add link in footer or dev menu
    - Update routes constants if needed

- [ ] **5.4 Quality gates for showcase**
    - Frontend linting
    - TypeScript type checking
    - Verify showcase displays correctly in all themes and modes

### **Phase 6:** Documentation and Handoff

**Purpose:** Document completed comprehensive migration and update project documentation.

- [ ] **6.1 Update project documentation**
    - [ ] **6.1.1 Update AGENTS.md**
        - Add reference to semantic token system in use (brief, one-line mention in tech stack or critical path)
        - No in-depth documentation (that lives elsewhere)
    - [ ] **6.1.2 Update DEVELOPMENT-RULES.md**
        - Add rule about always using existing semantic token system
        - Emphasize consistent theme styling via semantic tokens
        - No direct color/style values in components
        - Reference strategy-semantic-tokens.md for patterns
    - [ ] **6.1.3 Update TECHNICAL-OVERVIEW.md**
        - Add overview-level documentation of theme system structure
        - Mention semantic token convention (shadcn/ui adapted for Chakra UI v3)
        - Note comprehensive migration complete (all components use semantic tokens)
        - Reference strategy docs for in-depth documentation
        - Keep it high-level (details belong in docstrings and strategy docs)
    - [ ] **6.1.4 Update PROJECT-STATUS.md**
        - Document theme system modernization complete
        - Note all components migrated to semantic tokens
        - Update technical accomplishments section

- [ ] **6.2 Create theme strategy documentation**
    - [ ] **6.2.1 Adapt strategy-style-guide.md from arc-portfolio**
        - Copy from `/home/andrew/dev/arc-portfolio/.arc/reference/strategies/strategy-style-guide.md`
        - Adapt for CineXplorer context
        - Keep as placeholder documenting evolving styling decisions
        - Note: Final styling decisions are future work (post-technical tasks)
    - [ ] **6.2.2 Adapt strategy-visual-design-principles.md from arc-portfolio**
        - Copy from `/home/andrew/dev/arc-portfolio/.arc/reference/strategies/strategy-visual-design-principles.md`
        - Adapt for CineXplorer context
        - General design principles (not CineXplorer-specific yet)
    - [ ] **6.2.3 Reference strategy docs from other documentation**
        - Update references in docs from 6.1 where appropriate
        - Ensure no overlap between docs (each doc has clear scope)
        - Cross-reference strategy-semantic-tokens.md created in Phase 3

- [ ] **6.3 Run final quality gates**

    - [ ] **6.3.1 Verify extended tokens meet WCAG AA contrast in all themes**
        - Test all 13 extended tokens in all 7 themes × 2 modes (14 combinations per token)
        - Use WebAIM Contrast Checker or browser DevTools
        - **Minimum requirements:**
            - Normal text: 4.5:1 contrast ratio (WCAG AA)
            - Large text: 3:1 contrast ratio (WCAG AA)
            - UI components: 3:1 contrast ratio (WCAG AA)
        - Document any failing combinations
        - Adjust token values if needed to meet standards
        - Quality gate: All tokens meet or exceed WCAG AA in all themes

    - [ ] **6.3.2 Run automated test suites**
        - Backend tests (ensure no breakage from any imports/side effects)
        - Frontend tests (all pass)
        - Quality gate: 100% test pass rate

    - [ ] **6.3.3 Run linting and type checking**
        - Frontend linting (0 errors)
        - TypeScript checking (0 errors)
        - Quality gate: Zero violations

    - [ ] **6.3.4 Run markdown linting**
        - Markdown linting on all updated .arc docs
        - Verify ADR from Task 3.4.2 passes linting
        - Verify strategy-semantic-tokens.md from Task 3.6 passes linting
        - Quality gate: All documentation linting passes

---

## Implementation Notes

{# This section intentionally left blank for future implementation notes #}
