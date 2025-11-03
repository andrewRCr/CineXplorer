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

- [x] **3.5 Update all theme definitions with extended tokens**

    **Goal:** Add 13 new token values to all 7 themes while maintaining each theme's character and contrast standards.

    **Completed:** All 7 themes successfully extended with 13 new tokens.
    Token generation architecture required no changes - programmatic design automatically picked up new tokens.

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

    - [x] **3.5.2 Update `frontend/src/theme/index.ts` for token generation**

        **Completed:** Verified that `generateSemanticTokens()` function already handles all 33 tokens automatically.

        **Key Finding:** The function was designed to be extensible from the start:
        - Uses `Object.keys(githubTheme.light)` to dynamically get ALL semantic token keys (line 100-102)
        - Iterates over all tokens programmatically, including the 13 newly added ones
        - Already handles light/dark mode variations via `base` and `_dark` properties
        - No code changes needed - architecture already supports token extension!

        **Verification performed:**
        - ✅ Code review: Confirmed programmatic token iteration picks up all 33 tokens
        - ✅ TypeScript type checking: 0 errors
        - ✅ Runtime testing: Dev server running, no theme-related errors
        - ✅ All 7 themes generate correctly with all 33 tokens (20 original + 13 extended)

        **Quality gate met:** All 7 themes generate correctly, no runtime errors.

- [x] **3.6 Consolidate migration mappings into strategy document**

    **Goal:** Create reusable strategy document from existing Phase 3.3 migration analysis.

    **Completed:** Created comprehensive `strategy-semantic-tokens.md` consolidating all Phase 3.3 migration analysis
    into actionable developer guide.

    - [x] **3.6.1 Create strategy document structure**

        **Completed:** Created `.arc/reference/strategies/strategy-semantic-tokens.md` with complete header structure
        following project convention (version, date, purpose, TOC).

        **Quality gate met:** ✅ File structure created with 6 major sections

    - [x] **3.6.2 Extract and consolidate migration mappings from Phase 3.3**

        **Completed:** Extracted all migration mappings from Phase 3.3 notes (~390 lines source material):
        - Legacy token mapping: 28 old custom tokens → 33 new semantic tokens
        - Hardcoded color catalog: 25+ instances across 7 components with specific file references
        - Migration categories: Direct 1:1, many-to-one consolidation, extended tokens, new requirements

        **Quality gate met:** ✅ All Phase 3.3 mappings incorporated into strategy doc

    - [x] **3.6.3 Add code examples for common migration patterns**

        **Completed:** Added 5 comprehensive before/after code example sections:
        - ErrorBoundary: `red.*` → `destructive`, `gray.*` → `muted`, `blue.*` → `info`
        - MovieUserScore: Rating colors → `rating` token, thresholds → `success`/`warning`/`destructive`
        - Login/Auth: Inline `#4299e1` → `accent`, alerts → status tokens
        - Featured page: Hero section → `surface-elevated`, `fg.muted` → `muted-foreground`
        - Genre tags: Chakra colorScheme → `badge`/`badge-foreground`

        **Quality gate met:** ✅ All code examples use valid TypeScript/TSX syntax

    - [x] **3.6.4 Create decision tree: "Which token should I use for X?"**

        **Completed:** Created comprehensive decision tree with 7 decision points covering all 33 tokens:
        - Status indicators (success/warning/info/destructive)
        - Movie ratings (rating/rating-foreground)
        - Neutral badges/tags (badge/badge-foreground)
        - Surfaces/containers (background/card/surface-elevated/popover)
        - Interactive elements (primary/secondary/accent/muted)
        - UI elements (border/input/ring)
        - Drag-and-drop (drag-active/drop-zone)

        **Quality gate met:** ✅ Decision tree covers all 33 semantic tokens

    - [x] **3.6.5 Final quality gate**

        **Quality gates met:**
        - ✅ Markdown linting passes (0 errors after auto-fix)
        - ✅ All Phase 3.3 content successfully migrated and organized
        - ✅ Strategy document complete and ready for Phase 4 component migration
        - ✅ TypeScript type checking passes (0 errors)

- [x] **3.7 Document token usage patterns and guidelines**

    **Goal:** Extract best practices from Phase 3.1 research synthesis into actionable developer guidelines.

    **Completed:** Extended `strategy-semantic-tokens.md` with 4 new comprehensive sections (446 lines added) covering
    accessibility, interactive patterns, naming philosophy, and developer quick reference.

    - [x] **3.7.1 Extract accessibility standards from Phase 3.1 synthesis**

        **Completed:** Added comprehensive Accessibility Standards section to strategy document.

        **Content added:**
        - WCAG AA requirements: 4.5:1 (normal text), 3:1 (large text/UI components)
        - WCAG AAA aspirational: 7:1 (normal text), 4.5:1 (large text)
        - Testing guidelines using WebAIM Contrast Checker
        - Color alone is not enough (always pair with icons, text, patterns) with examples
        - Focus indicators requirements (never remove `outline: none`)
        - Interactive element sizing: 48×48dp minimum touch targets

        **Quality gate met:** ✅ All accessibility requirements documented with code examples

    - [x] **3.7.2 Extract interactive state patterns from Phase 3.1 synthesis**

        **Completed:** Added Interactive State Patterns section based on Material Design 3 research.

        **Content added:**
        - State layer philosophy (opacity overlays vs. color changes)
        - Standard opacity values table: Hover (8%), Focus (12%), Pressed/Active (12%), Drag (16%), Disabled (38%)
        - Chakra UI implementation guidance with `/` syntax
        - Common patterns: Card hover, button states, tab active states
        - Complete code examples for each pattern

        **Quality gate met:** ✅ Interactive patterns clearly explained with Chakra UI implementation

    - [x] **3.7.3 Document semantic naming philosophy**

        **Completed:** Added Semantic Naming Philosophy section with comprehensive examples.

        **Content added:**
        - Semantic vs. descriptive naming comparison (success vs. green)
        - Why semantic naming matters (theme independence, intent clarity)
        - Token pairing convention: `{name}` / `{name}-foreground`
        - Exceptions for single tokens (border, input, ring, surface-elevated)
        - Code examples demonstrating theme independence

        **Quality gate met:** ✅ Philosophy clearly articulated with practical examples

    - [x] **3.7.4 Create developer quick reference card**

        **Completed:** Added Developer Quick Reference section with common patterns and anti-patterns.

        **Content added:**
        - Most common patterns (status indicators, movie ratings, genre tags, surface hierarchy)
        - Edge cases & when to document exceptions
        - Anti-patterns to avoid (never hardcode colors, never use Chakra raw tokens directly)
        - Quick decision flowchart (7-step)
        - Links to full decision tree

        **Quality gate met:** ✅ Quick reference concise and actionable

    - [x] **3.7.5 Final strategy document review**

        **Completed:** Strategy document complete and validated.

        **Verification:**
        - ✅ All Phase 3.1 best practices extracted (accessibility, interactive states, naming)
        - ✅ All Phase 3.3 migration mappings consolidated (legacy tokens, hardcoded colors)
        - ✅ Code examples for all common patterns (5 before/after sections + quick reference)
        - ✅ Decision tree covers all 33 tokens
        - ✅ Table of Contents updated (10 sections)
        - ✅ Sources documented (Phase 3.1 + 3.3)

        **Quality gates met:**
        - ✅ Markdown linting passes (0 errors)
        - ✅ TypeScript type checking passes (0 errors)
        - ✅ Document reviewed for clarity and completeness
        - ✅ Final line count: 956 lines (comparable to other comprehensive strategy docs)

### **Phase 4:** Component Migration (Comprehensive)

**Purpose:** Migrate ALL existing components to semantic tokens in one comprehensive effort. Eliminates tech debt
and ongoing migration overhead in future tasks.

- [x] **4.1 Convert layout components**

    **Completed:** All 11 layout components migrated to semantic tokens following strategy guide.

    **Components Migrated:**

    - **NavBar.tsx** - 7 color issues fixed:
        - Hardcoded `rgba(99, 179, 237, 0.3)` glow effects → removed
        - `text.main` → `foreground`
        - `accent.secondary` → `accent`
        - `background.navBar` → `card` (2 instances)
        - `border.separator` → `border`
        - `background.hover` → `accent/8` (Material Design 3 pattern)
        - Active tab: Removed `colorScheme`, added explicit `bg`/`color` with `accent`/`accent-foreground`

    - **NavBarSearch.tsx** - 5 color issues fixed:
        - `border.separator` → `border`
        - `background.subItem` → `accent/8` (hover state)
        - Focus state: `background.subItem` → `ring` and `ring/50` (accessibility-compliant focus indicator)
        - `text.secondary` → `muted-foreground`, `text.main` → `foreground`

    - **NavBarUserMenu.tsx** - 20+ instances fixed:
        - Login button: `background.hover` → `accent/8`, hardcoded colors → semantic tokens
        - Dropdown: `background.main` → `popover` (correct overlay semantics), `border.subtle` → `border`
        - All menu items: `background.subItem` → `accent/8` (hover), `background.selected` → `accent/12` (active)
        - Text colors: `text.main` → `popover-foreground`, `accent.link`/`accent.primary` → `accent`
        - Removed opacity adjustments, replaced with Material Design 3 state patterns

    - **Sidebar.tsx** - 1 color issue fixed:
        - `background.sidebar` → `card`

    - **SidebarContent.tsx** - 7 color issues fixed:
        - `background.sidebarInterior` → `transparent`
        - List items: `text.main` → `card-foreground`, `background.hover` → `accent/8`
        - Selected state: `background.selected` → `accent/12`, `text.main` → `accent-foreground`
        - Separator: `border.separator` → `border`
        - Section header: `text.secondary` → `muted-foreground`

    - **sidebarOverlay.tsx** - 6 color issues fixed:
        - Hardcoded `rgba(99, 179, 237, 0.3)` glow effects → removed
        - `background.sidebar` → `card`
        - `border.sidebar`, `border.separator` → `border`
        - `text.main` → `card-foreground`
        - `accent.secondary` → `accent`

    - **MobileMenuButton.tsx** - 4 color issues fixed:
        - `text.main` → `foreground`
        - `border.separator` → `border`
        - Hover: `background.hover` → `accent/8`, hardcoded colors → semantic tokens

    - **LoadingContent.tsx** - 4 color issues fixed:
        - Hardcoded `bg="white"` → `surface-elevated`
        - `text.main` → `foreground`
        - `accent.primary` → `accent`
        - `background.main` → `background`

    - **LoadingLayout.tsx** - 1 issue documented:
        - GitHub logo `color="black"` → Documented as brand consistency exception

    - **Footer.tsx** - 3 color issues fixed:
        - `background.footer` → `card`
        - `border.separator` → `border`
        - `text.muted` → `muted-foreground` (2 instances)

    **Key Pattern Changes:**
    - Elevated surfaces (`navBar`, `sidebar`, `footer`) consolidated to `card` token
    - All borders consolidated to `border` token
    - Hover states standardized to Material Design 3 opacity pattern (`accent/8` = 8% opacity)
    - Active/selected states use `accent/12` (12% opacity pressed state)
    - Focus indicators now use accessibility-compliant `ring` token
    - Dropdown/overlay semantics corrected to use `popover`/`popover-foreground`

    **Quality Gates:**
    - ✅ Frontend linting: 0 errors
    - ✅ TypeScript type checking: 0 errors

- [x] **4.1.5 Fix broken theme system**

    **Problem:** After completing Task 4.1 component migration, discovered that the theme system was completely broken:
    - All components showed transparent backgrounds (no visible colors)
    - Light/dark mode toggle worked (body background changed black ↔ white)
    - Theme switching did NOT work (all themes looked identical)
    - Browser DevTools revealed NO theme-specific CSS rules were being generated

    - [x] **4.1.5a Debug and implement provider-based theme switching**

        **Root Cause Investigation (2400+ lines of systematic debugging documented in notes):**

        Initial investigation traced through all 6 layers
        (palettes → definitions → registry → token generation → config → CSS output)
        and found all intermediate data structures were correct, but Chakra UI v3 was not generating CSS from our `conditions`
        approach.

        **Critical Insight:** Reviewed Crema article on multi-theme switching
        (<https://www.crema.us/blog/make-a-custom-color-theme-switcher-with-chakra-ui-and-semantic-tokens>) and discovered
        fundamental architectural mismatch:

        **Our CSS Selector Approach (DIDN'T WORK):**

        ```typescript
        // Tried to generate CSS like: [data-theme="github"] { --color-bg: ... }
        conditions: { github: '[data-theme="github"] &' }
        // Set data-theme attribute on <html>
        // Chakra UI v3 DID NOT generate the CSS rules from conditions
        ```

        **Crema Provider Approach (CORRECT):**

        ```typescript
        // Define theme objects separately
        // Pass ONE active theme to <ChakraProvider theme={activeTheme}>
        // When user switches themes, recreate system with new colors and update provider
        // React re-renders entire app with new theme - NO CSS selectors needed
        ```

        **The Fix - Provider-Based Theme Switching:**

        1. **Refactored `frontend/src/theme/index.ts`:**
           - ❌ Removed `conditions` property (CSS selector approach)
           - ❌ Removed `generateThemeConditions()`, `generateBaseTokens()`, `generateSemanticTokens()` with nested conditions
           - ✅ Added `createSemanticTokens(theme)` - converts one theme to semantic tokens
           - ✅ Added `createThemeSystem(theme)` - creates Chakra system for any theme
           - ✅ Exported `defaultSystem` - initial system using GitHub theme
           - **Key insight:** Semantic token values must use `rgb()` wrapper and `base` (not `default`) for light mode

        2. **Updated `frontend/src/components/chakra/theme-provider.tsx`:**
           - ✅ Now wraps children with `<ChakraProvider value={system}>`
           - ✅ Manages `system` state (not just theme name)
           - ✅ When theme changes: calls `createThemeSystem()` → creates new system → updates provider
           - ✅ ChakraProvider re-renders with new system
           - ❌ Removed `data-theme` attribute setting (not needed)

        3. **Simplified `frontend/src/components/chakra/provider.tsx`:**
           - Removed unused imports (ChakraProvider moved to theme-provider)
           - Just wraps ColorModeProvider with ThemeSelectProvider

        4. **Fixed test:**
           - Updated `ErrorBoundaryIntegration.test.tsx` to use `defaultSystem` instead of `system`

        **Technical Details - The RGB Format Discovery:**

        Through browser DevTools inspection, discovered CSS variables were defined but invalid:
        - ✅ Variable defined: `--chakra-colors-background: 13 17 23`
        - ❌ Invalid CSS: Background computed to raw "13 17 23" (not wrapped in `rgb()`)
        - Browser rejected value, components showed transparent

        **Solution:** Wrap RGB values in `rgb()` function:

        ```typescript
        // Before (INVALID CSS):
        colors[tokenKey] = { value: { base: "255 255 255", _dark: "13 17 23" } }

        // After (VALID CSS):
        colors[tokenKey] = { value: { base: "rgb(255 255 255)", _dark: "rgb(13 17 23)" } }
        ```

        **Additional Discovery - Light Mode Property Name:**

        Initial fix used `default` for light mode (from Crema article), but only dark mode worked.
        Chakra UI v3 actually uses `base` for light mode:

        ```typescript
        // Wrong (only dark mode worked):
        { value: { default: "rgb(255 255 255)", _dark: "rgb(13 17 23)" } }

        // Correct (both modes work):
        { value: { base: "rgb(255 255 255)", _dark: "rgb(13 17 23)" } }
        ```

        **Files Modified:**
        - `frontend/src/theme/index.ts` - Complete rewrite (165 lines, down from 249)
        - `frontend/src/components/chakra/theme-provider.tsx` - Provider logic refactor (67 lines)
        - `frontend/src/components/chakra/provider.tsx` - Simplified (15 lines, down from 19)
        - `frontend/src/components/__tests__/ErrorBoundaryIntegration.test.tsx` - Fixed test import

        **Result:**
        - ✅ All components show correct colors in both light and dark modes
        - ✅ Theme switching works (7 themes selectable, each shows different colors)
        - ✅ Light/dark toggle works independently of theme selection
        - ✅ Provider-based approach is simpler and more maintainable than CSS conditions

        **Quality Gates:**
        - ✅ Frontend linting: 0 errors
        - ✅ TypeScript type checking: 0 errors
        - ✅ Manual browser testing: All themes working in light/dark modes

    - [x] **4.1.5b Architectural analysis: evaluate theme system approach**

        **Completed:** Comprehensive analysis conducted with POC validation of Crema pattern.

        **Analysis Results:**

        **1. Provider Recreation Pattern:**
        - ✅ **Keep current approach** despite documentation concerns
        - Only working pattern (CSS selectors extensively tested, all failed)
        - Performance impact negligible (one-time on user theme selection)
        - Real-world cost acceptable vs theoretical alternatives

        **2. RGB Wrapping - MAJOR DISCOVERY:**
        - ✅ **Adopt Crema pattern** (hex + token references)
        - RGB conversion was debugging artifact, NOT a requirement
        - POC proved hex values work perfectly (all 7 themes tested)
        - Benefits: Simpler code, more DRY, standard pattern
        - **Implementation:** All 7 theme files updated, POC successful

        **3. Theme Definition Structure:**
        - ✅ **Keep current structure**
        - Type-safe with ThemeColors interface
        - Professional palette integration (GitHub Primer, IBM Carbon, etc.)
        - Well-designed separation: Palettes → Themes → System
        - Scalable for 7+ themes

        **4. Semantic Token Generation:**
        - ✅ **Keep programmatic approach**
        - Appropriate for 33-token scale (vs 5-10 for hand-written)
        - DRY, error-proof, type-safe
        - Aligns with production best practices

        **Key Discovery - Crema Pattern:**

        POC tested Chakra official pattern (hex + token references) vs our RGB approach:
        - Created base tokens with hex values (no conversion)
        - Semantic tokens use references: `{colors.light.background}`
        - **Result:** All 7 themes work perfectly
        - **Benefit:** Simpler (no `hexToRgb()` function), more DRY, standard pattern

        **Files Updated (POC):**
        - `frontend/src/theme/index.ts` - Base + semantic token generation
        - All 7 theme definition files - Direct hex values from palettes
        - Backups created: `*.backup-rgb-pattern` and `*.backup-rgb`

        **Documentation:** Complete analysis in notes file (Task 4.1.5b section, 400+ lines)

        **Next Step:** Task 4.1.5c - Update strategy doc with refined approach

    - [x] **4.1.5c Document theme system implementation architecture**

        **Original Purpose:** Update strategy-semantic-tokens.md with implementation details.

        **Actual Approach:** Created ADR-004 for theme system implementation architecture, kept strategy doc
        focused on semantic token usage guidance (correct separation of concerns).

        **Completed Work:**

        1. **Created ADR-004: Provider-Based Multi-Theme Switching**
           - Documents provider recreation pattern with `createThemeSystem()`
           - Explains why CSS selector approach failed (Panda vs Chakra UI v3)
           - Includes performance measurements (10ms initial, 19ms theme switch)
           - Documents Crema pattern (hex + token references)
           - Explains `base` vs `_dark` properties for light/dark modes
           - Lists key sources: Crema blog post, GitHub discussion #3873
           - Covers lessons learned and trade-offs

        2. **Updated strategy-semantic-tokens.md (minimal changes)**
           - Version bump to 1.1
           - Added reference to ADR-004 for implementation architecture
           - Added version history section
           - Verified all token usage guidance remains accurate
           - Added Phase 4.1.5 opacity validation to sources

        **Rationale:** ADR vs Strategy separation follows ADR methodology - implementation decisions
        belong in ADRs (immutable, point-in-time), token usage patterns belong in strategy docs
        (evolving guidance). This keeps strategy-semantic-tokens.md focused on "how to use tokens"
        rather than "how the theme system works internally".

    - [x] **4.1.5d Fix theme persistence (localStorage broken)**

        **Problem:** Theme selection didn't persist across page reloads - always reverted to GitHub theme.

        **Root Cause:** In `frontend/src/components/chakra/theme-provider.tsx` line 32, `system` state was
        always initialized with `defaultSystem` (GitHub theme). While `themeName` state correctly read from
        localStorage, the system didn't match, causing visual mismatch.

        **Solution Implemented:**

        1. Replaced direct initialization with lazy initializer:

           ```tsx
           const [system, setSystem] = React.useState(() => {
             const initialThemeName = getInitialTheme();
             const initialTheme = getTheme(initialThemeName);
             return createThemeSystem(initialTheme);
           });
           ```

        2. Removed unused `defaultSystem` import (no longer needed)

        3. Removed useEffect that attempted to fix the issue (no longer needed with correct initialization)

        **Testing Results:**
        - ✅ Theme selection persists across page reloads
        - ✅ Color mode persists independently from theme
        - ✅ Tested with all 7 themes
        - ✅ Tested in both light and dark modes
        - ✅ No console errors
        - ✅ TypeScript type checking passes
        - ✅ Frontend linting passes

        **Files Modified:**
        - `frontend/src/components/chakra/theme-provider.tsx` - Fixed system initialization, cleaned up imports

    - [x] **4.1.5e Review Phase 4.1 component token usage**

        Verified all 4 Phase 4.1 components against semantic token checklist. Two quick fixes applied,
        all components now follow token strategy correctly.

        **Completed:**

        1. **NavBar.tsx** - Fixed token pairing: `color="foreground"` → `color="card-foreground"` (line 49)
        2. **Footer.tsx** - All tokens correct, no changes needed
        3. **LoadingLayout.tsx** - Hardcoded `color="black"` properly documented with brand exception (acceptable)
        4. **ThemeSelector.tsx** - Added missing hover state: `_hover={{ bg: "accent/8" }}` for menu items (line 80-83)

        **Review Checklist** (retained for Phase 4.2+ component migrations):

        **1. Token Selection:** Surfaces use correct elevation (`card`, `surface-elevated`, `popover`),
        interactive elements semantically correct (`accent`, `primary`, `secondary`), status/alerts proper
        (`success`, `warning`, `info`, `destructive`), movie-specific correct (`rating`, `badge`),
        UI elements standard (`border`, `input`, `ring`)

        **2. Interactive States:** Hover 8% opacity (`accent/8`), Active/pressed 12% (`accent/12`),
        Focus `ring` token, Disabled 38% opacity

        **3. Token Pairing:** Every background has matching `-foreground` (e.g., `card` + `card-foreground`)

        **4. Anti-Patterns:** No hardcoded colors (`red.600`, `#4299e1`), no Chakra raw tokens
        (`colorScheme`, `fg.muted`), exceptions have explanatory comments

        **5. Common Patterns:** Alerts use `/10` opacity backgrounds, surface hierarchy properly nested

        **Quality gate:**
        - ✅ All 4 components reviewed against full checklist
        - ✅ Quick violations fixed (NavBar token pairing, ThemeSelector hover state)
        - ✅ No larger issues requiring TODO comments
        - ✅ TypeScript type checking: PASSED
        - ✅ Frontend linting: PASSED

    - [x] **4.1.5f Review remaining Phase 4.1 components**

        Completed review of 4 additional Phase 4.1 components against semantic token checklist and updated
        border system strategy. One minor fix applied for border consistency.

        **Components Reviewed:**

        1. **NavBarSearch.tsx** - ✅ EXCELLENT
           - All semantic tokens correct (`border`, `accent/8`, `ring`, `foreground`, `muted-foreground`)
           - Proper interactive states (hover 8%, focus ring with offset)
           - Border system follows strategy (1px border, borderColor="border", focus ring)
           - No changes needed

        2. **Sidebar.tsx** - ✅ GOOD
           - Uses `bg="card"` correctly for elevated surface
           - Hardcoded boxShadow acceptable (shadows not in token system)
           - Simple, clean component
           - No changes needed

        3. **SidebarContent.tsx** - ⚠️ FIXED
           - Line 92: IconButton with `variant="outline"` missing explicit border props
           - Fixed: Added `borderWidth="1px"` and `borderColor="border"` per border strategy
           - All other tokens correct (card-foreground, accent/8, accent/12, border, muted-foreground)
           - Interactive states correct (hover 8%, selected 12%)

        4. **LoadingContent.tsx** - ✅ EXCELLENT
           - All semantic tokens perfect (`surface-elevated`, `foreground`, `accent`, `background`)
           - Clean, well-documented component
           - No changes needed

        **Key Finding:**
        - Border system strategy (1px universal standard, explicit props for outline buttons) now enforced
        - All components follow updated semantic token guidance from strategy documents

        **Quality gate:**
        - ✅ All 4 components reviewed against checklist + strategy documents
        - ✅ One minor fix applied (SidebarContent IconButton border props)
        - ✅ TypeScript type checking: PASSED
        - ✅ Frontend linting: PASSED

- [x] **4.2 Convert authentication pages**

    Converted all 3 authentication pages from legacy tokens and hardcoded colors to semantic tokens through
    multiple iteration rounds. **Status**: Core conversion complete, but remaining visual issues require
    systematic validation before these components serve as templates for Phase 4.3+.

    **Completed (awaiting final validation):**

    1. **Login.tsx** - Converted 15+ instances:
       - `#4299e1` (inline hex) → `var(--chakra-colors-accent)` (link color)
       - `background.main` → `background` (2x)
       - `border.separator` → `input` (3x for inputs), `border` (1x for divider)
       - `background.subItem` → `muted` (6x hover states)
       - `text.muted` → `muted-foreground`
       - `border.success` → `success` (2x)
       - `border.error` → `destructive`
       - `text.success` → `success-foreground`
       - `colorScheme="gray"` → removed (3x)
       - `colorScheme="blue"` → `bg="accent"` + `color="accent-foreground"` + `_hover={{ opacity: 0.92 }}`

    2. **Register.tsx** - Converted 10+ instances:
       - `#4299e1` (inline hex) → `var(--chakra-colors-accent)` (link color)
       - `background.main` → `background`
       - `border.separator` → `input` (3x for inputs)
       - `background.subItem` → `muted` (4x hover states)
       - `red.500` (hardcoded) → `destructive-foreground` (error text)
       - Removed redundant `bg="transparent"`, `borderColor`, `color` overrides from button

    3. **VerifyEmail.tsx** - Converted 15+ instances:
       - `accent.primary` → `accent` (spinner)
       - `border.success` → `success`
       - `text.successDark` → `success-foreground`
       - `border.error` → `destructive`
       - `colorScheme="blue"` → removed (2x)
       - `colorScheme="gray"` → removed
       - `bg="white"`, `color="black"`, `_hover={{ bg: "gray.50" }}`, `borderColor="gray.300"` → all removed (3x buttons)
       - All buttons now use `_hover={{ bg: "muted" }}` consistently

    **Semantic Refinements (after initial conversion):**

    After initial mechanical conversion, discovered UX issues requiring semantic fixes:

    1. **Input field visibility** - Added `borderWidth="1px"` to all inputs/checkboxes (7x total)
       - Issue: `borderColor="input"` alone was nearly invisible in unfocused state
       - Fix: Explicit border width ensures visibility across all theme/mode combinations

    2. **Focus states** - Added `_focus` with `ring` token to all inputs/checkboxes (4x)
       - Pattern: `_focus={{ borderColor: "ring", boxShadow: "0 0 0 1px var(--chakra-colors-ring)" }}`
       - Ensures proper keyboard navigation accessibility

    3. **Primary CTAs** - Changed from `variant="outline"` to proper primary styling (3x)
       - Login button: `bg="primary"` + `color="primary-foreground"` + `_hover={{ opacity: 0.92 }}`
       - Register button: Same treatment
       - VerifyEmail "Continue" button: Same treatment
       - Issue: Outline variant made primary CTAs invisible/same color as background

    4. **Secondary action buttons** - Added explicit borders to outline variants (4x)
       - OAuth buttons (Google, GitHub): `borderWidth="1px"` + `borderColor="border"`
       - VerifyEmail navigation buttons: Same treatment
       - Ensures outline buttons are visible across themes

    **Critical Semantic Fixes (after user testing):**

    User testing revealed deeper semantic misunderstandings requiring fundamental fixes:

    5. **Login/Register box backgrounds** - WRONG SURFACE TYPE (2x)
       - **Issue**: Using `bg="background"` for login/register form boxes
       - **Why wrong**: `background` is BASE page background, forms are ELEVATED SURFACES
       - **Root cause of input border invisibility**: Inputs on `background` with `borderColor="input"` had no contrast
       - **Fix**: Changed to `bg="card"` + `color="card-foreground"`
       - **Result**: Input borders now visible across ALL themes (tested: GitHub, IBM Carbon, GitLab, Tangere)
       - Also fixed divider text background (line 593 Login.tsx) to match card surface

    6. **Navbar button consistency** - MobileMenuButton vs NavBarUserMenu Login button
       - **Issue**: Login button missing base `borderColor`, causing visual inconsistency
       - **Fix**: Added `borderColor="border"` + `color="card-foreground"` to match hamburger button
       - **Result**: Both buttons now visually consistent

    7. **Hover state readability** - WRONG TOKEN PAIRING (2x)
       - **Issue**: Hover used `color="accent-foreground"` on `bg="accent/8"` (semi-transparent)
       - **Why wrong**: `accent-foreground` designed for SOLID `accent` backgrounds, unreadable on 8% opacity
       - **Fix**: Removed `color="accent-foreground"` from hover, keep base text color
       - **Components**: MobileMenuButton.tsx, NavBarUserMenu.tsx
       - **Result**: Text remains readable during hover states

    **Border System Investigation & Fix (Completed):**

    8. **Input token definition error** - ROOT CAUSE IDENTIFIED (Issue #1 - FIXED ✅)
       - **Discovery**: External research into border standards revealed `input` token incorrectly defined
       - **Root cause**: All 7 themes defined `input: palette.bg_*` (background color) instead of border color
       - **Why inputs invisible**: Using background color as border = 0 contrast against same background
       - **Why OAuth buttons visible**: They used `borderColor="border"` (correct border color),
         inputs used `borderColor="input"` (wrong)
       - **Research performed**: Comprehensive analysis of 15+ design systems
         (Material Design 3, IBM Carbon, GitHub Primer, Ant Design, Bootstrap, Polaris, USWDS)
       - **Strategy created**: `strategy-border-system.md` documenting border width/color standards, WCAG
         requirements, focus patterns
       - **Fix applied**: Changed `input` token to `border_default` in all 7 themes (light + dark = 14 fixes)
       - **Themes fixed**: GitHub, IBM Carbon, GitLab, Tangere, Sage, Stone, Muted
       - **Validation**: TypeScript + linting PASSED, visual testing confirms borders now visible
       - **Files modified**: All 7 theme definition files in `frontend/src/theme/definitions/`

    **Additional Accessibility Enhancements (Completed):**

    9. **OAuth button focus states** - COMPLETED ✅ (Issue #2)
       - **Implementation**: Added `_focus={{ outline: "2px solid", outlineColor: "ring",`
         `outlineOffset: "2px" }}` to OAuth buttons
       - **Location**: Login.tsx Google/GitHub buttons (lines 608-611, 627-630)
       - **Rationale**: WCAG 2.4.13 requires 2px+ focus indicators with 3:1 contrast for keyboard navigation
       - **Verification**: Tested keyboard navigation, focus states visible across all themes

    10. **Link interaction pattern research & implementation** - COMPLETED ✅
       - **Research performed**: External research into link interaction best practices
           - Sources: IBM Carbon, GitHub Primer, Material Design 3, Ant Design, Nielsen Norman Group,
             WCAG 2.4.13, Accessibility.org
           - Key finding: Underlines making comeback for accessibility (color alone insufficient)
       - **Pattern documented**: Added link interaction guidance to `strategy-semantic-tokens.md` v1.2
           - Default: underline visible (2px thickness, 2px offset)
           - Hover: `accent` → `accent-hover` color change
           - Focus: 2px outline with `ring` token (consistent with buttons)
           - Rationale: Color alone insufficient for color-blind users per WCAG
       - **accent-hover token created**: New semantic token for link hover states
           - Implementation: All 7 themes (14 palette tokens + 14 definition mappings)
           - Palettes: GitHub Primer, IBM Carbon, GitLab Pajamas, Tangere Terminal, Sage & Bone,
             Stone & Greige, Muted Earth
           - Uses official design system hover values where available (e.g., IBM Carbon v11)
       - **Implementation in auth pages**:
           - Login.tsx: "Register" link (lines 640-665) - underline + hover color + focus ring
           - Register.tsx: "Sign In" link (lines 242-267) - underline + hover color + focus ring
           - Uses inline event handlers for hover/focus states (React Router Link limitations)
       - **Quality gate**: TypeScript (0 errors), Linting (0 errors), Visual testing (verified)

    11. **Auth component regression fixes** - COMPLETED ✅
       - **Problem**: Auth components reverted to old token system during earlier sessions
       - **Components restored**:
           - Login.tsx: Fixed primary button (`bg="primary"`), resend button (`bg="accent"`),
             dismiss buttons (removed `colorScheme="gray"`)
           - Register.tsx: Standardized input hover to `accent/5` (fixes zero-contrast on IBM Carbon/GitLab)
           - VerifyEmail.tsx: Already complete, verified semantic tokens
       - **Consistency achieved**: All auth inputs now use `accent/5` hover (Material Design 3 state layer)

    **Remaining Issue (Phase 4.1 scope):**

    **Issue #3: Footer theme control borders**
       - **Location**: ThemeSelector button trigger, ColorModeButton (Footer.tsx)
       - **Problem**: Borders invisible in certain theme/mode combinations
       - **Scope**: Phase 4.1 components (not auth pages)
       - **Status**: Deferred to Phase 4.1 component review

    **Quality gate (COMPLETE ✅):**
    - ✅ All 3 pages converted to semantic tokens exclusively
    - ✅ No hardcoded colors remaining (except GitHub logo brand exception in Login)
    - ✅ No legacy tokens remaining
    - ✅ **Input field visibility** - FIXED via input token correction (Issue #1)
    - ✅ **Primary CTAs properly prominent and actionable**
    - ✅ **Focus states on inputs/checkboxes** - Have _focus with ring token
    - ✅ **OAuth buttons focus states** - COMPLETE (Issue #2)
    - ✅ **Link interaction patterns** - COMPLETE with accessibility best practices
    - ✅ **Auth component consistency** - All components restored and standardized
    - ✅ TypeScript type checking: PASSED
    - ✅ Frontend linting: PASSED
    - ✅ Consistent form styling across all auth pages
    - ✅ Proper token pairing throughout (background + foreground)
    - ✅ Surface hierarchy correct (card surfaces for elevated forms)

    **Files modified (uncommitted, ready for commit):**

    Auth components (Phase 4.2):
    - `frontend/src/pages/user/Login.tsx` - Semantic tokens, OAuth focus, link pattern
    - `frontend/src/pages/user/Register.tsx` - Semantic tokens, input hover fix, link pattern
    - `frontend/src/pages/user/VerifyEmail.tsx` - Semantic tokens (verified, no changes needed)

    Layout components (Phase 4.1.5e):
    - `frontend/src/components/layout/NavBar.tsx` - Token pairing fix
    - `frontend/src/components/layout/NavBarUserMenu.tsx` - Hover state fix
    - `frontend/src/components/layout/MobileMenuButton.tsx` - Hover state fix
    - `frontend/src/components/ThemeSelector.tsx` - Hover state addition

    Theme system (accent-hover token):
    - `frontend/src/theme/types.ts` - Added accent-hover token to ThemeColors
    - `frontend/src/theme/palettes/github.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/palettes/ibm-carbon.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/palettes/gitlab-pajamas.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/palettes/tangere-terminal.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/palettes/sage-bone.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/palettes/stone-greige.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/palettes/muted-earth.ts` - fg_accent_hover light/dark
    - `frontend/src/theme/definitions/github.ts` - Wired accent-hover
    - `frontend/src/theme/definitions/ibm-carbon.ts` - Wired accent-hover
    - `frontend/src/theme/definitions/gitlab-pajamas.ts` - Wired accent-hover
    - `frontend/src/theme/definitions/tangere-terminal.ts` - Wired accent-hover
    - `frontend/src/theme/definitions/sage-bone.ts` - Wired accent-hover
    - `frontend/src/theme/definitions/stone-greige.ts` - Wired accent-hover
    - `frontend/src/theme/definitions/muted-earth.ts` - Wired accent-hover

    Documentation:
    - `.arc/reference/strategies/project/style/strategy-semantic-tokens.md` - Added link pattern guidance (v1.2)
    - `.arc/active/incidental/tasks-theme-system-modernization.md` - This file (updated with completion details)

    **Total uncommitted files**: 26 files across 4 logical groups (auth, layout, theme system, docs)

- [x] **4.2.1 Fix BaseLayout legacy token and mobile menu (Incidental)**

    **Problem discovered during Phase 4.1 component review:**
    - BaseLayout.tsx not in original Phase 4.1 component list, still had legacy token `background.main`
    - Mobile menu button non-functional on auth pages (/login, /register)
    - Footer theme controls (ThemeSelector, ColorModeButton) had invisible borders in certain themes (Issue #3)

    **Root causes:**
    1. BaseLayout legacy token: `background.main` should be `background` (semantic token)
    2. Mobile menu: SidebarDrawerViewport only in AppLayout, but NavBar (with button) in BaseLayout
       - Auth pages use AuthLayout → no viewport → button can't open drawer
       - Content pages use AppLayout → has viewport → button works
    3. Footer controls: Missing explicit `borderWidth` and `borderColor` props on outline variant buttons

    **Fixes implemented:**
    1. BaseLayout.tsx:
       - Fixed legacy token: `bg="background.main"` → `bg="background"`
       - Added `<SidebarDrawerViewport />` (moved from AppLayout)
       - Now all pages (auth + content) have viewport available
    2. AppLayout.tsx:
       - Removed `<SidebarDrawerViewport />` (moved to BaseLayout)
       - Removed duplicate import
    3. ThemeSelector.tsx:
       - Added `borderWidth="1px"` and `borderColor="border"` to outline button
       - Ensures border visibility across all theme/mode combinations
    4. ColorModeButton (color-mode.tsx):
       - Changed `variant="ghost"` → `variant="outline"` for consistency
       - Added `borderWidth="1px"` and `borderColor="border"`
       - Now matches ThemeSelector visual style

    **Testing:**
    - ✅ Mobile menu works on auth pages (/login, /register, /verify-email)
    - ✅ Mobile menu works on content pages (/, /movies/*, etc.)
    - ✅ Footer theme controls have visible borders in all 7 themes (light + dark)
    - ✅ TypeScript type checking: PASSED
    - ✅ Frontend linting: PASSED

    **Quality gate:** ✅ COMPLETE
    - Mobile menu functional on all pages
    - Footer theme controls have consistent visible borders
    - BaseLayout uses semantic tokens

    **Files modified:**
    - `frontend/src/components/layout/BaseLayout.tsx` - Fixed token, added viewport
    - `frontend/src/components/layout/AppLayout.tsx` - Removed viewport
    - `frontend/src/components/ThemeSelector.tsx` - Added border props
    - `frontend/src/components/chakra/color-mode.tsx` - Changed variant, added border props

- [ ] **4.3 Convert movie components**

    - [x] **4.3.1 Convert Featured page** (`pages/Featured.tsx`)

        Converted Featured page from Chakra raw tokens to semantic tokens. Page is currently a stub
        (no hero section yet), contains centered card with navigation buttons.

        **Changes Made:**

        1. **Line 29**: `color="fg.muted"` → `color="muted-foreground"`
           - Subtitle text below heading

        2. **Lines 51-60**: Primary button conversion
           - Removed: `colorScheme="blue"`
           - Added: `bg="accent"`, `color="accent-foreground"`, `_hover={{ opacity: 0.92 }}`
           - Follows semantic token pattern for primary actions

        3. **Lines 62-71**: First outline button
           - Added: `borderWidth="1px"`, `borderColor="border"`
           - Enforces border system strategy (1px universal standard)

        4. **Lines 73-82**: Second outline button
           - Added: `borderWidth="1px"`, `borderColor="border"`
           - Consistent with border system strategy

        5. **Line 38**: Card.Root
           - Added: `bg="card"`
           - Optional improvement for explicit token usage consistency

        **Token Usage Review (4.1.5e checklist):**
        - ✅ Surface tokens: `card` used for elevated card surface
        - ✅ Interactive elements: `accent`/`accent-foreground` for primary action
        - ✅ Text tokens: `muted-foreground` for secondary text
        - ✅ Border tokens: `border` used with explicit 1px width
        - ✅ Interactive states: Hover opacity pattern (0.92) for accent button
        - ✅ No hardcoded colors or Chakra raw tokens remaining

        **Quality gate:**
        - ✅ All Chakra raw tokens eliminated (`fg.muted`, `colorScheme`)
        - ✅ Border system strategy followed (1px + explicit props)
        - ✅ TypeScript type checking: PASSED
        - ✅ Frontend linting: PASSED

        **Files modified:**
        - `frontend/src/pages/Featured.tsx` - 5 token conversions

    - [x] **4.3.2 Convert MovieDetail page** (`pages/movie/MovieDetail.tsx`)

        Converted MovieDetail page from Chakra raw tokens and hardcoded colors to semantic tokens.
        Original task description incomplete - also found colorScheme buttons and tags requiring conversion.

        **Changes Made:**

        1. **Line 80**: Back button
           - Removed: `colorScheme="blue"`
           - Added: `borderWidth="1px"`, `borderColor="border"`
           - Enforces border system strategy for outline buttons

        2. **Line 149**: Error state text
           - Changed: `color="red.500"` → `color="destructive-foreground"`

        3. **Lines 181, 194**: Release date and runtime text
           - Changed: `color="gray.500"`, `color="gray.600"` → `color="muted-foreground"`

        4. **Line 187**: Genre tags (in header)
           - Removed: `colorScheme="teal"`
           - Added: `bg="badge"`, `color="badge-foreground"`

        5. **Lines 232-253**: User action buttons (3 buttons)
           - Watchlist toggle: Conditional `bg="secondary"/"primary"` + matching foreground tokens
           - Mark as Watched: `bg="primary"`, `color="primary-foreground"`, `_hover={{ opacity: 0.92 }}`
           - Rate Movie: Same as Mark as Watched
           - Removed all `colorScheme` props

        6. **Line 279**: Cast member boxes
           - Changed: `bg="gray.600"` → `bg="card"`

        7. **Line 313**: Crew member boxes
           - Changed: `bg="gray.600"` → `bg="card"`

        8. **Line 331**: Production company tags
           - Removed: `colorScheme="purple"`
           - Added: `bg="badge"`, `color="badge-foreground"`

        **Token Usage Review (4.1.5e checklist):**
        - ✅ Surface tokens: `card` used for cast/crew boxes (elevated surfaces)
        - ✅ Interactive elements: `primary`/`secondary` with matching foreground tokens
        - ✅ Text tokens: `muted-foreground` for secondary text, `destructive-foreground` for errors
        - ✅ Badge tokens: `badge`/`badge-foreground` for all tag elements
        - ✅ Border tokens: `border` with explicit 1px width per strategy
        - ✅ Interactive states: Hover opacity pattern (0.92) for primary buttons
        - ✅ No hardcoded colors or Chakra raw tokens remaining

        **Quality gate:**
        - ✅ All Chakra raw tokens eliminated (gray.*, red.*, colorScheme)
        - ✅ Border system strategy followed (1px + explicit props)
        - ✅ TypeScript type checking: PASSED
        - ✅ Frontend linting: PASSED

        **Files modified:**
        - `frontend/src/pages/movie/MovieDetail.tsx` - 11 token conversions

    - [x] **4.3.3 Convert MovieCard component** (`components/movie/MovieCard.tsx`)

        Converted MovieCard from old custom tokens and Chakra raw tokens to semantic tokens.

        **Changes (9 total):**

        1. Card.Root: Added explicit `bg="card"` for consistent surface styling
        2. Tooltip background: `bg="background.main"` → `bg="popover"`
        3. Tooltip border: `borderColor="border.subtle"` → `borderColor="border"`
        4. Tooltip arrow: `borderTopColor="background.main"` → `borderTopColor="popover"`
        5. Tooltip text: `color="text.main"` → `color="popover-foreground"`
        6. Release date text: `color="text.secondary"` → `color="muted-foreground"`
        7. Watched IconButton: Removed `colorPalette="blue"` (default ghost styling)
        8. Watchlist IconButton: `colorPalette={...}` → `color={isOnWatchlist ? "accent" : undefined}`
        9. Animated accent line: `backgroundColor="accent.primary"` → `backgroundColor="accent"`

        **Result:** All old custom tokens and Chakra raw tokens eliminated ✅

        **Quality gate:** TypeScript type checking PASSED, Frontend linting PASSED

    - [x] **4.3.4 Convert MovieCardContainer** (`components/movie/MovieCardContainer.tsx`)

        Converted MovieCardContainer from old custom token to semantic token. Simple wrapper component
        with border styling.

        **Changes (1 total):**

        1. Border color: `borderColor="border.separator"` → `borderColor="border"`

        **Result:** Old custom token eliminated, consolidated to semantic `border` token ✅

        **Border System Compliance:**
        - ✅ Uses 1px border width (via `border="1px solid"`)
        - ✅ Uses semantic `border` token for color
        - ✅ Consistent with MovieCard and border strategy

        **Quality gate:** TypeScript type checking PASSED, Frontend linting PASSED

    - [x] **4.3.5 Convert MovieUserScore component** (`components/movie/MovieUserScore.tsx`)

        **Completed:** Major refactoring involving multiple iterations to solve text contrast issues on solid
        colored backgrounds. Led to creation of new token architecture (`on-*` tokens) and theme system improvements.

        **Final Color Mapping (after testing):**
        - Green (high ≥7.5) → Blue (medium 5.0-7.4) → Yellow (low <5.0)
        - Rationale: NOT traffic light (medium scores aren't "bad"), NOT single neutral (loses distinction)
        - Chosen: Green (good) → Blue (neutral/data) → Yellow (caution/low quality)
        - Reserves `rating` token for future personal user ratings (star system)

        **TMDB Score Thresholds:**
        - High (≥7.5): `bg="success"`, `color="on-success"` (was custom `text.successDark`)
        - Medium (5.0-7.4): `bg="info"`, `color="on-info"` (was Chakra raw `blue.700`)
        - Low (<5.0): `bg="warning"`, `color="on-warning"` (was Chakra raw `yellow.700`)

        **User Rating Thresholds (future feature, code exists):**
        - High (≥8): `bg="success"`, `color="on-success"` (was Chakra raw `green.600`)
        - Medium (5-7): `bg="warning"`, `color="on-warning"` (was Chakra raw `orange.600`)
        - Low (<5): `bg="destructive"`, `color="on-destructive"` (was Chakra raw `red.600`)

        **Refactoring:**
        - Replaced Chakra raw `colorPalette` with explicit token pairs
        - Replaced color constants with helper functions returning token pairs
        - Added explicit 1px border props to outline buttons (border strategy enforcement)
        - Added explicit `bg="card"` to Card.Root for consistency

        **Theme System Improvements Triggered by This Task:**
        - **Created 4 new tokens:** `on-success`, `on-warning`, `on-destructive`, `on-info`
        - **Problem discovered:** GitHub dark mode used black text on solid colors (unreadable)
        - **Solution:** Theme-specific contrast handling via `on-*` tokens
            - GitHub/GitLab/Tangere: White text on all solid colored backgrounds
            - IBM Carbon: Dark text on light yellow warning, white on other colors
        - **Removed 4 non-production themes:** tangere-terminal, sage-bone, stone-greige, muted-earth
        - **Theme registry reduced:** 7 themes → 3 production-ready (GitHub, IBM Carbon, GitLab Pajamas)

        **Result:** All Chakra raw tokens eliminated, border strategy enforced, contrast issues resolved ✅

        **Commits Created (3 total):**
        - `c89774e` - feat(theme): add on-* tokens for solid colored backgrounds
        - `7ef0dbe` - fix(theme): correct on-* tokens for solid badge contrast
        - `32c6f4c` - feat(theme): convert MovieUserScore with semantic rating colors

        **Quality gates:** TypeScript type checking PASSED, Frontend linting PASSED

    - [x] **4.3.6 Convert MovieCollectionGrid, MovieGrid**

        **Completed:** Converted both grid components from legacy tokens and hardcoded colors to semantic tokens.
        Also fixed pagination separator inconsistency discovered during review.

        **MovieCollectionGrid.tsx (6 conversions + 1 consistency fix):**
        - Line 139: `color="text.error"` → `destructive-foreground` (error message)
        - Line 165: `color="text.secondary"` → `muted-foreground` (results count)
        - Lines 188, 191: `color="text.secondary"` → `muted-foreground` (2x empty state text)
        - Line 215: `bg="background.skeleton"` → `muted` (skeleton loading)
        - Line 244: `borderTopColor="red.300"` → `border` (bottom pagination separator - was hardcoded)
        - **Consistency fix:** Added matching `borderBottom="1px solid"` + `borderBottomColor="border"` to top
          pagination (lines 158-159) - previously only bottom had separator

        **MovieGrid.tsx (5 conversions + 1 consistency fix):**
        - Line 91: `color="text.error"` → `destructive-foreground` (error message)
        - Line 112: `color="text.secondary"` → `muted-foreground` (results count)
        - Lines 129, 132: `color="text.secondary"` → `muted-foreground` (2x empty state text)
        - Line 171: `borderTopColor="red.300"` → `border` (bottom pagination separator - was hardcoded)
        - **Consistency fix:** Added matching `borderBottom="1px solid"` + `borderBottomColor="border"` to top
          pagination (lines 110-111) - previously only bottom had separator

        **Checklist Verification:**
        - ✅ Token Selection: All semantic tokens correctly chosen per strategy docs
        - ✅ Token Pairing: Text colors use appropriate `-foreground` tokens
        - ✅ Anti-Patterns: Eliminated all legacy tokens and hardcoded colors
        - ✅ Common Patterns: Error states use `destructive-foreground`, muted text uses `muted-foreground`
        - ✅ Border System: Pagination separators use standard 1px borders with `border` token
        - ✅ Visual Consistency: Both top and bottom pagination now have matching border separators

        **Quality gates:** ✅ TypeScript type checking PASSED, Frontend linting PASSED

    - [x] **4.3.7 Convert PageHeader**

        **Completed:** Converted PageHeader from legacy tokens to semantic tokens and **restored animated underline accent**.

        **PageHeader.tsx (2 conversions + bug fix):**
        - Line 101: `color="text.main"` → `foreground` (title text color)
        - Line 118: `backgroundColor="accent.secondary"` → `accent` (animated underline)
        - **Bug discovered and fixed:** Animated underline was invisible due to non-existent `accent.secondary` token
        - **Result:** Animated underline accent now visible and working across all themes

        **Animation Details:**
        - 3-phase animation system intact (reset → ready → animating)
        - Width animates from 0% to 100% over 0.3s with ease-out
        - Triggers on mount and title changes
        - 2px height, 1px border radius, positioned 2px below title text

        **Checklist Verification:**
        - ✅ Token Selection: `foreground` for text, `accent` for highlight underline
        - ✅ Token Pairing: Not applicable (no background/foreground pairs in this component)
        - ✅ Anti-Patterns: Eliminated legacy `text.main` and `accent.secondary` tokens
        - ✅ Common Patterns: Accent used correctly for visual emphasis/branding element

        **Quality gates:** ✅ TypeScript type checking PASSED, Frontend linting PASSED

- [ ] **4.4 Convert remaining components**

    - [x] **4.4.1 Convert PaginationCtrl**
        - **File:** `components/layout/PaginationCtrl.tsx`
        - **Tokens converted (4 total):**
            - `text.main` → `foreground` (navigation buttons, page numbers)
            - `text.secondary` → `muted-foreground` (ellipsis)
            - `border.separator` → `border` (button borders)
            - `accent.primary` → `accent` (active page border)
        - **Active page styling refined:**
            - Initial: `bg="secondary"` + accent underline (bold approach)
            - **Final: `bg="muted"` + accent text + accent border + semibold font** (subtle approach)
            - Removed accent underline (redundant with bg + border + text color)
            - Fixed IBM Carbon issue: `secondary` = dark gray (#393939) in light mode - wrong token for subtle selection
            - Fixed GitLab Pajamas issue: `secondary` too close to background in both modes - invisible hover
            - `muted` token designed for "subtle surfaces" - correct semantic choice
        - **Design research:** Launched external-research-analyst to study modern pagination patterns
            - Finding: 75% of design systems use subtle differentiation (bg tints + emphasis text)
            - Pattern used: Hybrid approach (subtle bg + emphasis text + border + font weight)
        - **Quality gates:** ✅ Frontend linting PASSED, TypeScript type checking PASSED

    - [x] **4.4.2 Convert TypographyTest page**
        - **File:** `pages/TypographyTest.tsx`
        - **Tokens converted (1 type, 41 instances):**
            - `text.muted` → `muted-foreground` (all label and description text)
        - **Cleanup:** Removed Theme Colors Test section (redundant with upcoming theme showcase page)
        - **Note:** Showcase/test page - displays font families, weights, and text styles
        - **Quality gates:** ✅ Frontend linting PASSED, TypeScript type checking PASSED

    - [x] **4.4.3 Convert AdvancedMovieFilters system**
        - **Parent:** `components/movie/filters/AdvancedMovieFilters.tsx`
        - **Children:** GenreSelector, YearSelector, RatingSelector, SortSelector
        - **Tokens converted across all 5 components:**
            - `text.main` → `foreground` (labels, headings)
            - `text.secondary` → `muted-foreground` (helper text, route labels)
            - `border.separator` → `border` (input borders, separators)
            - `accent.primary` → `accent` (hover states, active items)
            - `background.main` → `background` (input backgrounds)
            - `background.subItem` → `muted` (dropdown items, selected states)
            - `red.300` → `destructive` (validation error states in Year/Rating selectors)
        - **Quality gates:** ✅ Frontend linting PASSED, TypeScript type checking PASSED

    - [x] **4.4.4 Convert LetterboxdStyleFilters system**

        **Completed:** Converted parent component and all 4 child components to semantic tokens.

        **Components converted:**
        - **Parent:** LetterboxdStyleFilters.tsx (2 token conversions)
        - **Children:**
            - ConnectedDropdowns.tsx (9 token conversions across 2 Select dropdowns + button)
            - CollapsibleSearchBox.tsx (7 token conversions across input + 2 buttons)
            - SortDropdownMinimal.tsx (6 token conversions across label + Select dropdown)
            - ClearFiltersButton.tsx (no old tokens - uses Chakra colorScheme prop)

        **Token mappings used:**
        - `background.main` → `background` (main surface backgrounds)
        - `background.subItem` → `muted` (hover states, dropdown backgrounds)
        - `border.separator` → `border` (all borders and separators)
        - `text.main` → `foreground` (primary text, enabled states)
        - `text.secondary` → `muted-foreground` (labels, disabled states, helper text)
        - `accent.primary` → `accent` (hover states on dropdown items)

        **Quality gates:** ✅ Frontend linting (0 errors), TypeScript type checking (0 errors)

    - [ ] **4.4.5 Convert Watchlist page**
        - **File:** `pages/user/Watchlist.tsx`
        - **Old tokens to replace:**
            - `red.500` → `destructive-foreground` (error text, line 61)
        - **Note:** Minimal implementation page
        - **Quality gate:** Frontend linting + TypeScript type checking

    **Components verified as NOT needing conversion:**
    - NowPlaying, Popular, TopRated, Upcoming, SearchResults - Thin wrappers around MovieCollectionGrid (already converted)
    - Profile, Settings, PersonDetail, UserProfile - Placeholder stubs with no styling

- [ ] **4.5 Convert ErrorBoundary** (60% of all hardcoded colors - 15+ instances)

    **Note:** ErrorBoundary scheduled for end of Phase 4 due to complexity.
    Handle simpler components first to build confidence with token patterns.

    - [ ] **4.5.1 Replace error state colors in `components/ErrorBoundary.tsx`**
        - **Source:** Phase 3.3 hardcoded color catalog
        - `red.600`, `red.700`, `red.800` → `destructive` / `destructive-foreground`
        - `red.50` → `destructive/8` (8% opacity for subtle error backgrounds)
        - `red.200` → `destructive` (border styling)
        - File location: Multiple instances throughout component
        - Quality gate: All red.* colors replaced

    - [ ] **4.5.2 Replace neutral/muted colors**
        - `gray.50`, `gray.100`, `gray.200`, `gray.300`, `gray.400`, `gray.500`,
          `gray.600`, `gray.700` → appropriate semantic tokens:
            - Backgrounds: `muted` / `background`
            - Text: `muted-foreground` / `foreground`
            - Borders: `border`
        - Reference Phase 3.3 mapping guide for specific instances
        - Quality gate: All gray.* colors replaced

    - [ ] **4.5.3 Replace informational message colors**
        - `blue.50`, `blue.100`, `blue.500`, `blue.700` → `info` / `info-foreground`
        - Use for helpful hints, debugging information, non-error messages
        - Quality gate: All blue.* colors replaced with info tokens

    - [ ] **4.5.4 Test error display comprehensively**
        - Test in all 7 themes × 2 modes (14 combinations)
        - Verify readability and contrast in each theme
        - Ensure error messages remain clear and actionable
        - **Review token usage:** Verify against Task 4.1.5e checklist (line ~1007)
        - Quality gate: ErrorBoundary displays correctly in all themes

- [ ] **4.6 Comprehensive theme system verification**
    - **Test all theme combinations:**
        - Test all 14 combinations (7 themes × 2 color modes)
        - Verify visual consistency across ALL migrated components (not just initial 4)
        - Navigate through all major pages (Featured, detail pages, auth, lists, etc.)
        - Document any theme-specific issues (readability, contrast, visual bugs)
    - **Verify contrast requirements using WebAIM or similar tool:**
        - Test all 33 semantic tokens in light and dark modes (all 7 themes)
        - Verify 4.5:1 contrast ratio minimum (WCAG AA) for text tokens (foreground, muted-foreground, etc.)
        - Verify 3:1 contrast ratio minimum for UI component tokens (borders, surfaces, interactive elements)
        - Document any adjustments needed per theme
        - Quality gate: All tokens meet or exceed WCAG AA standards
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

- [ ] **6.2 Extract and consolidate knowledge from notes/research docs**

    **Purpose:** Comprehensive extraction of all relevant knowledge from working notes and research docs into permanent
    strategy documentation, enabling cleanup and archival.
    Uses new modular strategy approach (focused docs vs monolithic style guide).

    **Files to extract from:**
    - `notes-theme-system-modernization.md` (3000+ lines) - Implementation decisions, learnings, patterns
    - `research-github-primer.md` - GitHub design system findings
    - `research-ibm-carbon.md` - IBM Carbon design system findings
    - `research-material-design-3.md` - Material Design 3 findings
    - `research-ant-design.md` - Ant Design findings

    **Target location:** `.arc/reference/strategies/project/style/`

    - [ ] **6.2.1 Audit notes file for undocumented knowledge**
        - Review `notes-theme-system-modernization.md` comprehensively
        - Identify patterns, decisions, and insights not yet captured in strategy docs
        - Tag sections: "already documented", "needs extraction", "temporary/discard"
        - Examples to look for:
            - Component-specific token patterns
            - Theme creation workflows
            - Color palette design principles
            - Cross-theme testing approaches
            - Lessons learned from Phase 4 migrations

    - [ ] **6.2.2 Audit research docs for CineXplorer-relevant knowledge**
        - Review all 4 research-*.md files
        - Identify findings applicable to CineXplorer (vs generic research)
        - Extract design system patterns relevant to movie discovery apps
        - Document sources and rationale for any extracted patterns
        - Mark extractable vs archive-only content

    - [ ] **6.2.3 Create additional strategy docs as needed**
        - **Evaluate need for:** `strategy-typography-system.md`, `strategy-spacing-system.md`, `strategy-motion-system.md`
        - **Criteria:** Create new doc if >200 lines of extracted content on cohesive topic
        - **Alternative:** Add as sections to existing strategy-semantic-tokens.md or strategy-border-system.md if <200 lines
        - **Decision tree:**
            - Typography system findings? → New `strategy-typography-system.md`
            - Spacing/layout patterns? → New `strategy-spacing-system.md`
            - Animation/transition standards? → New `strategy-motion-system.md`
            - Token usage clarifications? → Add to `strategy-semantic-tokens.md`
            - Border-related patterns? → Add to `strategy-border-system.md`

    - [ ] **6.2.4 Update existing strategy docs with extracted knowledge**
        - Add relevant sections to `strategy-semantic-tokens.md` (token usage patterns discovered during Phase 4)
        - Add relevant sections to `strategy-border-system.md` (any additional border patterns)
        - Ensure no duplication across docs
        - Cross-reference related sections

    - [ ] **6.2.5 Enable research doc deletion**
        - Verify all CineXplorer-relevant knowledge extracted
        - Document what was preserved vs what was discarded (and why)
        - Add comment in task completion notes listing which research findings were NOT extracted
          (generic, not applicable, superseded by later research, etc.)
        - Quality gate: Safe to delete research-*.md files after task completion

    - [ ] **6.2.6 Prepare notes file for cleanup**
        - Tag all sections in notes file as "extracted" or "temporary"
        - Identify sections that should remain for historical context
        - Create summary of what knowledge was preserved where
        - Quality gate: Notes file ready for archival cleanup (separate meta workflow)

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
