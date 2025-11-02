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

- [ ] **3.1 Research semantic token best practices**
    - Study established design systems:
        - Material Design 3 (token structure and naming conventions)
        - IBM Carbon Design System (enterprise patterns)
        - GitHub Primer (proven at scale)
        - Ant Design (comprehensive token taxonomy)
    - Focus areas:
        - How many semantic layers do production systems use?
        - Success/warning/info state patterns (we only have destructive)
        - Surface elevation systems (card vs elevated vs overlay)
        - Interactive state tokens (hover, focus, active, disabled)
        - Specialized UI tokens (badges, tags, scores, ratings)
    - Document findings in `notes-theme-system-modernization.md` (append with "Phase 3.1" header)
    - Extract best practices applicable to movie application context

- [ ] **3.2 Analyze movie application UI patterns**
    - Inventory all UI patterns in CineXplorer:
        - Movie cards (primary content display)
        - User scores/ratings (numeric displays, progress indicators)
        - Filter panels and sidebars (secondary surfaces)
        - Navigation elements (navbar, footer, sidebar)
        - Form elements (login, register, search)
        - Status indicators (error, success, loading, empty states)
        - Badges and tags (genres, ratings, certifications)
        - Overlays and modals (dialogs, tooltips, popovers)
        - Hero sections and featured content
        - Interactive states across all components
    - Reference similar applications for patterns:
        - Netflix (card design, hover states, rating displays)
        - IMDb (score displays, badges, list layouts)
        - Letterboxd (filtering, tagging, collection displays)
    - Document token requirements for each pattern
    - Identify patterns not covered by shadcn/ui's 20 base tokens

- [ ] **3.3 Audit current token coverage**
    - List all 20 current shadcn/ui tokens with intended use cases
    - Map existing component color usage to new token structure:
        - Old semantic tokens → New tokens (background.main → background, etc.)
        - Hardcoded Chakra colors → New tokens (red.600 → destructive, etc.)
        - Raw hex values → New tokens (#4299e1 → accent, etc.)
    - Identify gaps where NO appropriate token exists:
        - Success states (forms, notifications)
        - Warning states (validation, cautions)
        - Info states (tips, help text)
        - Multiple surface levels (background vs card vs elevated)
        - Score/rating specific styles
        - Badge/tag variations
    - Document gap analysis in `notes-theme-system-modernization.md` (append with "Phase 3.3" header)
    - Prioritize gaps: critical (blocks migration) vs nice-to-have

- [ ] **3.4 Design token structure extensions**
    - Based on research and gap analysis, propose token additions:
        - Success semantic pair (success, success-foreground)
        - Warning semantic pair (warning, warning-foreground)
        - Info semantic pair (info, info-foreground)
        - Surface elevation tokens if needed (surface-elevated, overlay, etc.)
        - Specialized tokens if justified (score, badge, etc.)
    - Document rationale for each addition in notes file (why needed, what it solves)
    - Update TypeScript types in `frontend/src/theme/types.ts`:
        - Add new tokens to `ThemeColors` interface
        - Update JSDoc comments
        - Maintain shadcn/ui structure (pairs with foreground variants)
    - Keep additions minimal - only what's necessary
    - Validate against best practices from research (Task 3.1)
    - **Create ADR documenting token extension decision:**
        - File: `.arc/reference/adr/adr-XXX-semantic-token-extension.md`
        - Context: Movie app needs vs shadcn/ui base tokens
        - Decision: Specific tokens added and rationale
        - Alternatives considered: Creative use of existing vs dedicated tokens
        - Consequences: Theme maintenance burden, migration complexity, future flexibility
    - Quality gates: TypeScript type checking passes

- [ ] **3.5 Update all theme definitions with extended tokens**
    - For EACH of the 7 themes, add new token definitions:
        - GitHub Primer (`definitions/github.ts`, `palettes/github.ts` if needed)
        - IBM Carbon (`definitions/ibm-carbon.ts`, `palettes/ibm-carbon.ts` if needed)
        - GitLab Pajamas (`definitions/gitlab-pajamas.ts`, `palettes/gitlab-pajamas.ts` if needed)
        - Tangere Terminal (`definitions/tangere-terminal.ts`, `palettes/tangere-terminal.ts` if needed)
        - Sage & Bone (`definitions/sage-bone.ts`, `palettes/sage-bone.ts` if needed)
        - Stone & Greige (`definitions/stone-greige.ts`, `palettes/stone-greige.ts` if needed)
        - Muted Earth (`definitions/muted-earth.ts`, `palettes/muted-earth.ts` if needed)
    - Ensure consistency:
        - Success/warning/info colors appropriate for each theme's palette
        - Maintain theme character (professional vs warm vs terminal, etc.)
        - Verify WCAG contrast requirements met
        - Test visually with ThemeSelector to ensure cohesion
    - Update `frontend/src/theme/index.ts`:
        - Extend `generateSemanticTokens()` to include new tokens
        - Update Chakra UI theme config with new conditional tokens
    - Quality gates: TypeScript (0 errors), linting (0 errors), themes visually verified

- [ ] **3.6 Create comprehensive component migration mapping guide**
    - Create new file: `.arc/reference/strategies/strategy-semantic-tokens.md`
    - Document token structure overview:
        - Base shadcn/ui tokens (20 original)
        - Extended tokens (if added in 3.4-3.5)
        - Token naming conventions and usage philosophy
    - Create migration mapping tables:
        - Old semantic token → New semantic token
        - Chakra raw colors → New semantic token (red.600 → destructive, gray.500 → muted, etc.)
        - Inline hex values → New semantic token
    - Document UI pattern → Token mappings:
        - Movie cards → Use card/card-foreground
        - User scores → Use success/warning based on value
        - Filter panels → Use muted/muted-foreground
        - Error states → Use destructive/destructive-foreground
        - Navigation → Use background/foreground with muted accents
        - etc. (comprehensive list for all patterns from 3.2)
    - Include code examples for common migrations
    - Add decision tree: "Which token should I use for X?"
    - Quality gates: Markdown linting passes

- [ ] **3.7 Document token usage patterns and guidelines**
    - Add to strategy doc (from 3.6):
        - When to use semantic tokens vs Chakra raw colors (always semantic)
        - How to handle edge cases (document, don't bypass system)
        - Interactive state patterns (hover brightens foreground, etc.)
        - Accessibility requirements (contrast ratios, color-blind safe)
    - Create quick reference card for developers:
        - Most common patterns
        - Token decision flowchart
        - Anti-patterns to avoid
    - Document in strategy-semantic-tokens.md
    - Quality gates: Reviewed for completeness and clarity

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

- [ ] **4.2 Convert ErrorBoundary** (highest priority - most hardcoded colors)
    - File: `components/ErrorBoundary.tsx`
    - Replace ALL hardcoded Chakra colors:
        - `red.600`, `red.700`, `red.800` → `destructive` / `destructive-foreground`
        - `red.50` → `destructive` with low opacity or muted destructive background
        - `red.200` → `destructive` border variant
        - `gray.*` values → `muted` / `muted-foreground`
        - `blue.*` values → `info` (if added in Phase 3) or `accent`
    - Test error display in all themes
    - Verify readability and contrast

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
    - **Featured** (`pages/Featured.tsx`)
        - Replace Chakra `fg`, `fg.muted` with semantic equivalents
        - Apply semantic tokens throughout
    - **MovieDetail** (`pages/movie/MovieDetail.tsx`)
        - Replace `gray.*` usage with semantic tokens
    - **MovieCard** (`components/movie/MovieCard.tsx`)
        - Apply semantic `card` / `card-foreground` tokens
        - Ensure hover states use semantic patterns
    - **MovieCardContainer** (`components/movie/MovieCardContainer.tsx`)
        - Coordinate with MovieCard for consistent styling
    - **MovieUserScore** (`components/movie/MovieUserScore.tsx`)
        - Apply success/warning tokens based on score value (if added in Phase 3)
        - Otherwise use accent/muted appropriately
    - **MovieCollectionGrid, MovieGrid** - Apply tokens as needed
    - **PageHeader** - Update header styling

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
    - Location: `frontend/src/pages/ThemeShowcase.tsx` (or update existing)
    - Showcase all Chakra UI v3 components used in app
    - Typography samples (all heading levels, body text, etc.)
    - Color palette display (ALL semantic tokens including extensions from Phase 3)
    - Interactive light/dark mode toggle
    - Theme selector to preview all 7 themes
    - Organized sections for easy reference

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
    - Backend tests (ensure no breakage from any imports/side effects)
    - Frontend tests
    - Frontend linting
    - TypeScript checking
    - Markdown linting on all updated .arc docs

---

## Implementation Notes

{# This section intentionally left blank for future implementation notes #}
