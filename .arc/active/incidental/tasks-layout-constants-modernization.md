# Incidental: Layout Constants Modernization

**Created:** 2025-11-06
**Branch:** `claude/theme-phase3-component-migration-011CUoR62JhE7AQFJrCVSXzk`
**Status:** In Progress

## Context

**Discovered:** During ThemeDebug sticky header implementation - discovered sticky positioning "jump" issue, which led to
broader layout architecture review

**Interrupts:** `.arc/active/incidental/notes-theme-definition-semantic-corrections.md` (Phase 3 Review work)

**Problem:** Layout constants scattered across codebase as magic numbers with no centralization, creating maintenance
burden and drift risk. Sticky positioning jump revealed fundamental issues with hardcoded height values.

**Why Now:**

- Having proper layout infrastructure makes debugging theme issues easier
- Current approach (hardcoded values) leads to drift when components change
- Industry research shows clear best practice (theme tokens, not JS constants)
- Foundation for future layout work

## Scope

### Will Do

- Migrate to Chakra UI v3 semantic token system (industry best practice)
- Create theme-based layout tokens (navbar height, sidebar width, z-index scale)
- Migrate core layout components to use theme tokens
- Replace `useBreakpointValue` hooks with CSS-based responsive patterns (SSR-safe)
- Create LayoutDebug page (parallel to ThemeDebug)
- Add dev-mode debug links to Footer
- Establish validation patterns (dev-mode warnings, visual regression setup)

### Won't Do

- Create JavaScript constants file (research shows this is anti-pattern)
- Custom responsive hooks that cause SSR hydration issues
- Container query implementation (future enhancement)

---

## Tasks

### **Phase 1:** Research Validation and Planning

**Purpose:** Validate research findings apply to our specific tech stack and finalize implementation approach.

- [x] **1.1 Conduct external research on layout constants best practices**

    - [x] **1.1.1 Research design system patterns (Material UI, Chakra, Ant Design)**
        - ✅ **Completed**: Comprehensive research completed
        - Industry consensus: Theme tokens, not JavaScript constants
        - CSS custom properties as source of truth
        - Validation through architecture, not testing

    - [x] **1.1.2 Research responsive hook patterns and SSR concerns**
        - ✅ **Completed**: CSS-based responsive preferred over hooks
        - `useBreakpointValue` causes hydration mismatches
        - Container queries recommended for component-level responsiveness

    - [x] **1.1.3 Document findings and pivot decision**
        - ✅ **Completed**: Full research report in agent output
        - Recommendation: Chakra UI v3 semantic tokens
        - Hybrid approach with CSS variables + TypeScript types

- [x] **1.2 Create incidental task list with research-informed plan**

    **Goal:** Formal task breakdown following strategy-task-list-formatting standards.

    - [x] **1.2.1 Structure task list following incidental work template**
        - Document discovery context
        - Define scope (Will Do / Won't Do)
        - Break down into test-first phases

    - [x] **1.2.2 Clean up notes file (remove draft planning section)**
        - Remove layout refactor section from theme notes (line 2202+)
        - Keep only theme-related content in theme notes file

### **Phase 2:** Theme Directory Restructure and Layout Token Setup

**Purpose:** Restructure theme directory for clarity, then establish layout tokens as single source of truth.

**Context:** Currently mid-migration from old color system (`definitions/`) to new unified adapter system (`adapter/`).
Migration complete, verification paused. Use this opportunity to restructure for long-term maintainability.

- [x] **2.1 Restructure theme directory for color/layout separation**

    **Goal:** Organize theme by concern (color vs layout) for clarity and maintainability.

    - [x] **2.1.1 Rename `theme/adapter/` → `theme/color/`**
        - ✅ Renamed using `git mv` to preserve history
        - Creates explicit separation between color and layout concerns
        - All 8 files tracked as renames in git

    - [x] **2.1.2 Rename `theme/color/mappings/` → `theme/color/adapters/`**
        - ✅ Renamed using `git mv` to preserve history
        - More descriptive name (adapters adapt design systems to UnifiedTheme)
        - All 3 adapter files tracked as renames

    - [x] **2.1.3 Update all imports from `adapter` to `color`**
        - ✅ Updated 5 files with import references:
            - `theme/types.ts` - UnifiedTheme import
            - `theme/definitions/github.ts` - createUnifiedTheme import
            - `theme/definitions/ibm-carbon.ts` - createUnifiedTheme import
            - `theme/definitions/gitlab-pajamas.ts` - createUnifiedTheme import
            - `theme/color/index.ts` - adapter imports + JSDoc example
        - ✅ Also updated internal imports from `./mappings/` → `./adapters/`

    - [x] **2.1.4 Run quality gates after restructure**
        - ✅ TypeScript: 0 errors (all imports resolved correctly)
        - ✅ Linting: 0 violations
        - Theme switching verified working (existing commits used theme system)

- [x] **2.2 Create layout token foundation**

    **Goal:** Set up Chakra UI v3 token architecture for layout values.

    - [x] **2.2.1 Create `theme/layout/` directory structure**
        - ✅ Created `frontend/src/theme/layout/` directory
        - Parallel to `theme/color/` for symmetry

    - [x] **2.2.2 Create `theme/layout/foundations.ts` with base layout values**
        - ✅ Created with Chakra token format
        - `navbar-height: '93px'` (56px + 36px + 1px border)
        - `sidebar-width: '280px'`
        - `footer-height: '64px'` (approximate)
        - Comprehensive JSDoc comments documenting each token

    - [x] **2.2.3 Create `theme/layout/semantic-tokens.ts` for responsive tokens**
        - ✅ Created responsive layout tokens
        - `layout-navbar`: References foundation (same all breakpoints)
        - `layout-sidebar`: Responsive (0px mobile, 280px desktop)
        - `layout-footer`: References foundation (same all breakpoints)
        - Uses Chakra token reference syntax: `{sizes.token-name}`

    - [x] **2.2.4 Create `theme/layout/z-index.ts` for stacking context**
        - ✅ Created semantic z-index scale with clear hierarchy
        - Values: `base: 1`, `sidebar: 5`, `theme-debug: 5`, `layout-debug: 5`, `footer: 6`, `navbar: 10`, `dropdown: 9999`
        - Comprehensive JSDoc comments explaining scale philosophy

- [x] **2.3 Integrate tokens into Chakra theme config**

    - [x] **2.3.1 Update `theme/index.ts` to include layout tokens**
        - ✅ Imported all three layout token files
        - ✅ Merged layout foundations into `baseConfig.theme.tokens`
        - ✅ Merged z-index tokens into `baseConfig.theme.tokens`
        - ✅ Merged semantic layout tokens into `baseConfig.theme.semanticTokens`
        - ✅ Added default export for Chakra CLI typegen compatibility

    - [x] **2.3.2 Generate TypeScript types for tokens**
        - ✅ Ran: `npx @chakra-ui/cli typegen ./src/theme/index.ts`
        - ✅ Type generation succeeded (conditions, recipes, utilities, tokens, system)
        - ✅ TypeScript compilation passes (0 errors)
        - ✅ IDE autocomplete verified working (layout-navbar, zIndex tokens)
        - ✅ Fixed default theme consistency (GitHub → IBM Carbon)

### **Phase 3:** Core Component Migration

**Purpose:** Migrate layout components to use theme tokens instead of hardcoded values.

- [x] **3.1 Migrate NavBar component**

    - [x] **3.1.1 Make navbar-height token responsive**
        - ✅ **Completed**: Created separate foundation tokens and updated semantic token
        - Mobile: 65px (64px content + 1px border) - Single row + pb(2) padding for touch targets
        - Desktop: 93px (92px content + 1px border) - Two rows (logo/search + nav tabs)
        - Created `navbar-height-mobile` and `navbar-height-desktop` in foundations.ts
        - Updated `layout-navbar` semantic token to reference both based on breakpoint
        - Regenerated TypeScript types successfully (0 errors)
        - **Note**: Chakra foundations require static values; responsive logic in semantic layer
        - **Fix applied**: Corrected mobile height from 64px to 65px to account for navbar border

    - [x] **3.1.2 Replace hardcoded height with theme token**
        - ✅ **Completed**: Removed NAVBAR_HEIGHT constant export
        - ✅ Updated z-index from `10` to `"navbar"` token
        - File: `frontend/src/components/layout/NavBar.tsx`

    - [x] **3.1.3 Verify NavBar renders correctly on both breakpoints**
        - ✅ **Verified**: NavBar height correct on desktop (93px)
        - ✅ **Verified**: NavBar height correct on mobile (65px)
        - ✅ **Verified**: ThemeDebug header positioned correctly (both)
        - ✅ **Verified**: CSS variables applied correctly
        - ✅ **Verified**: Responsive behavior working on resize

- [x] **3.2 Migrate Sidebar component**

    - [x] **3.2.1 Replace hardcoded values with theme tokens**
        - ✅ **Completed**: Replaced all hardcoded values with tokens
        - Width: `"280px"` → `"layout-sidebar"` token
        - Sticky top: now uses `calc(var(--chakra-sizes-layout-navbar) + 3rem - 28px)`
        - Max height: now uses `calc(100vh - var(--chakra-sizes-layout-navbar))`
        - Z-index: `{1}` → `"sidebar"` token
        - Removed NAVBAR_HEIGHT import and local constants
        - File: `frontend/src/components/layout/Sidebar.tsx`

    - [x] **3.2.2 Verify Sidebar positioning and sticky behavior**
        - ✅ **Verified**: Sidebar has correct gap below navbar
        - ✅ **Verified**: No visual jump when scrolling
        - ✅ **Verified**: Sidebar scrollable when content exceeds viewport

- [x] **3.3 Migrate SidebarDrawer component**

    - [x] **3.3.1 Replace hardcoded sidebar width with theme token**
        - ✅ **Completed**: Width `"280px"` → `"sidebar-width"` foundation token
        - **Note**: Used foundation token (not semantic) since drawer is mobile-only and needs fixed 280px
        - File: `frontend/src/components/layout/sidebarOverlay.tsx`

    - [x] **3.3.2 Verify drawer behavior on mobile**
        - ✅ **Verified**: Drawer opens/closes correctly
        - ✅ **Verified**: Width matches desktop sidebar

- [x] **3.4 Migrate AppLayout component**

    - [x] **3.4.1 Replace hardcoded sidebar width with theme token**
        - ✅ **Completed**: Width `"280px"` → `"layout-sidebar"` token
        - File: `frontend/src/components/layout/AppLayout.tsx`

    - [x] **3.4.2 Verify layout structure and spacing**
        - ✅ **Verified**: Sidebar and content properly spaced
        - ✅ **Verified**: Container centered correctly
        - ✅ **Verified**: Responsive behavior works (mobile/desktop)

- [x] **3.5 Migrate Footer component**

    - [x] **3.5.1 Update Footer z-index to use theme token**
        - ✅ **Completed**: Z-index `{6}` → `"footer"` token
        - File: `frontend/src/components/layout/Footer.tsx`

    - [x] **3.5.2 Verify no z-index conflicts**
        - ✅ **Verified**: Footer appears above content, below navbar
        - ✅ **Verified**: Stacking context correct

- [x] **3.6 Migrate NavBarUserMenu component**

    - [x] **3.6.1 Update dropdown z-index to use theme token**
        - ✅ **Completed**: Z-index `{9999}` → `"dropdown"` token
        - File: `frontend/src/components/layout/NavBarUserMenu.tsx`

    - [x] **3.6.2 Verify dropdown stacking**
        - ✅ **Verified**: Dropdown appears above all other content
        - ✅ **Verified**: No z-index conflicts with navbar

- [x] **3.7 Migrate ThemeDebug page**

    - [x] **3.7.1 Replace navbar height import with theme token**
        - ✅ **Completed**: Removed NAVBAR_HEIGHT import
        - ✅ Sticky top: `{NAVBAR_HEIGHT}` → `"var(--chakra-sizes-layout-navbar)"` CSS variable
        - **Note**: Z-index already uses token (`zIndex={5}`)
        - **Fix applied**: Changed from token reference to CSS variable for proper sticky behavior
        - **Fix applied**: Border accounted for in foundation tokens (no component-level adjustment needed)
        - File: `frontend/src/pages/ThemeDebug.tsx`

    - [x] **3.7.2 Verify ThemeDebug sticky header behavior**
        - ✅ **Verified**: Header sticks flush with navbar bottom (no gap)
        - ✅ **Verified**: No jump when scrolling
        - ✅ **Verified**: No overlap with navbar

- [x] **3.8 Fix AuthLayout height calculation bug**

    - [x] **3.8.1 Update AuthLayout to use correct navbar height**
        - ✅ **Completed**: Fixed scrolling issue with flexbox approach
        - Old: `minH="calc(100vh - 144px)"` (caused slight overflow/scrolling)
        - New: `flex="1"` (fills remaining space between navbar and footer)
        - **Fix applied**: Replaced height calculation with flexbox for proper layout fill
        - Uses BaseLayout's flex container to naturally fill space (no scrolling)
        - File: `frontend/src/components/layout/AuthLayout.tsx`

    - [x] **3.8.2 Verify AuthLayout viewport height**
        - ✅ **Verified**: Auth pages (login/signup) fill viewport correctly
        - ✅ **Verified**: No overflow or extra whitespace/scrolling
        - ✅ **Verified**: Working on both mobile and desktop

- [x] **3.9 Run incremental quality gates**

    - [x] **3.9.1 Run TypeScript type checking**
        - ✅ **Completed**: 0 errors
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`

    - [x] **3.9.2 Run frontend linting**
        - ✅ **Completed**: 0 warnings
        - Command: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`

### **Phase 4:** Responsive Pattern Migration

**Purpose:** Replace SSR-unsafe responsive hooks with CSS-based patterns.

- [ ] **4.1 Audit current useBreakpointValue usage**

    - [ ] **4.1.1 Search codebase for useBreakpointValue calls**
        - Command: `grep -r "useBreakpointValue" frontend/src/`
        - Document locations and usage patterns
        - Identify candidates for CSS migration

    - [ ] **4.1.2 Categorize usage by migration strategy**
        - CSS display props: Show/hide components
        - Keep with ssr:false: Interactive features only
        - Container queries: Component-level responsive

- [ ] **4.2 Migrate show/hide patterns to CSS**

    - [ ] **4.2.1 Replace conditional rendering with CSS display props**
        - Pattern: `isMobile ? <Mobile /> : <Desktop />` → `<Box display={{ base: 'block', lg: 'none' }}><Mobile /></Box>`
        - Update all instances from audit
        - Ensure SSR-safe rendering

    - [ ] **4.2.2 Test SSR hydration (no flash, no mismatches)**
        - Manual test: Refresh page, observe no content flash
        - DevTools: Check for hydration errors in console

- [ ] **4.3 Document responsive best practices**

    - [ ] **4.3.1 Add JSDoc comments to remaining hooks**
        - Document SSR behavior and limitations
        - Provide guidance on when to use CSS vs hooks
        - Note: May be minimal work if most hooks removed

### **Phase 5:** Layout Debug Page

**Purpose:** Create visual debugging tool for layout structure (parallel to ThemeDebug).

- [ ] **5.1 Create LayoutDebug page component**

    - [ ] **5.1.1 Create basic page structure with sticky header**
        - File: `frontend/src/pages/LayoutDebug.tsx`
        - Sticky header at `layout.navbar` position
        - Title: "Layout System Debug"
        - Button controls: Toggle Outlines, Show Z-Index, Show Spacing

    - [ ] **5.1.2 Add layout constants display section**
        - Table showing all LAYOUT token values
        - Display navbar height, sidebar width, z-index scale
        - Show computed CSS variable values
        - Use `useToken` hook to read values

    - [ ] **5.1.3 Add current breakpoint display section**
        - Show active breakpoint (base, md, lg, xl)
        - Display viewport dimensions
        - Highlight mobile vs desktop threshold

    - [ ] **5.1.4 Add visual layout structure section**
        - Nested boxes showing layout hierarchy
        - Visual representation of navbar/sidebar/content
        - Color-coded by semantic meaning

    - [ ] **5.1.5 Add sticky positioning test section**
        - Scrollable content with sticky elements
        - Demonstrate no-jump behavior
        - Show offset calculations

- [ ] **5.2 Add route for LayoutDebug page**

    - [ ] **5.2.1 Add route in App.tsx**
        - Path: `/layout-debug`
        - Element: `<LayoutDebug />`
        - File: `frontend/src/App.tsx`

    - [ ] **5.2.2 Verify route works**
        - Manual test: Navigate to `/layout-debug`
        - Manual test: Page renders correctly

- [ ] **5.3 Add debug links to Footer (dev mode only)**

    - [ ] **5.3.1 Add conditional debug section to Footer**
        - Check: `import.meta.env.DEV`
        - Links: Theme Debug (`/theme-debug`), Layout Debug (`/layout-debug`)
        - Style: Horizontal stack with gap
        - File: `frontend/src/components/layout/Footer.tsx`

    - [ ] **5.3.2 Verify dev mode conditional works**
        - Dev mode: Links visible
        - Production build: Links not rendered (test with `npm run build`)

### **Phase 6:** Validation and Documentation

**Purpose:** Ensure migrations work correctly and document patterns for future reference.

- [ ] **6.1 Add development-time validation (optional)**

    - [ ] **6.1.1 Create useLayoutValidation hook**
        - Dev-mode only: Compare actual rendered height vs token value
        - Console warning on mismatch
        - File: `frontend/src/hooks/useLayoutValidation.ts`

    - [ ] **6.1.2 Integrate validation into NavBar (optional)**
        - Use hook to validate navbar height
        - Only runs in development mode

- [ ] **6.2 Visual regression test setup (optional, documentation only)**

    - [ ] **6.2.1 Document Playwright test pattern for layout validation**
        - Example test checking navbar height
        - Example snapshot test for layout structure
        - Note: Implementation deferred, just document pattern

- [ ] **6.3 Update documentation**

    - [ ] **6.3.1 Add JSDoc comments to theme token files**
        - Document token purposes and usage
        - Provide examples for common patterns
        - Note dependencies and calculations

    - [ ] **6.3.2 Document when to use tokens vs Chakra scale**
        - Tokens: Layout dimensions (navbar, sidebar)
        - Chakra scale: Generic spacing (padding, margins)
        - Add to theme file comments

### **Phase 7:** Final Quality Gates

**Purpose:** Comprehensive validation before completion.

- [ ] **7.1 Run full quality gate suite**

    - [ ] **7.1.1 Run all type checking**
        - Frontend: `npm run type-check`
        - Backend: `npx pyright backend/apps/ backend/config/ --project backend`
        - Expect: 0 errors

    - [ ] **7.1.2 Run all linting**
        - Frontend: `npm run lint`
        - Backend: `.venv-backend/bin/ruff check backend/apps/ backend/config/`
        - Markdown: `npx markdownlint-cli2 "README.md" ".arc/**/*.md"`
        - Expect: 0 violations

    - [ ] **7.1.3 Run all tests**
        - Frontend: `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - Backend: `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Expect: All tests pass

- [ ] **7.2 Manual testing checklist**

    - [ ] **7.2.1 Test layout on all pages**
        - Home, Discover, Watchlist, MovieDetail
        - Verify navbar, sidebar, footer positioning
        - Check responsive behavior (resize browser)

    - [ ] **7.2.2 Test sticky positioning behavior**
        - Scroll on pages with sidebar
        - Verify no visual jumps
        - Check ThemeDebug page sticky header

    - [ ] **7.2.3 Test debug pages**
        - Navigate to `/theme-debug` - verify works
        - Navigate to `/layout-debug` - verify works
        - Check Footer debug links visible in dev mode

- [ ] **7.3 Verify no visual regressions**

    - [ ] **7.3.1 Compare before/after screenshots (manual)**
        - Take screenshots of key pages
        - Verify layout identical to pre-migration
        - Check mobile and desktop viewports

---

## Implementation Notes

### Technical Decisions

**Why Chakra theme tokens over JavaScript constants:**

- Industry best practice per research (Material UI, Ant Design, Chakra all use this pattern)
- Single source of truth - impossible for drift to occur
- SSR-safe - CSS applies before JavaScript hydration
- Type-safe - Chakra CLI generates TypeScript types
- Responsive - tokens can have different values per breakpoint

**Why CSS display props over useBreakpointValue:**

- Avoids SSR hydration mismatches
- No flash of incorrect content (FOMC)
- Zero re-renders - CSS handles everything
- Better performance
- Research shows this is modern best practice

**Z-Index semantic scale rationale:**

- `base: 1` - Default stacking (content, cards)
- `sidebar: 5` - Persistent navigation
- `themeDebug/layoutDebug: 5` - Debug tools (same level as sidebar)
- `footer: 6` - Above sidebar but below navbar
- `navbar: 10` - Primary navigation, always on top
- `dropdown: 9999` - Overlays and modals

### Theme Directory Restructure

**Decision:** Explicit separation via `theme/color/` and `theme/layout/` subdirectories.

**Rationale:**

- Mid-migration from old color system to unified adapter (migration complete, verification paused)
- Symmetric structure prevents confusion about what goes where
- Clear separation supports maintainability during and after migration
- "Theme" encompasses both color AND layout in modern design systems

**Structure (after Phase 2):**

```
theme/
  ├── color/            ← Renamed from adapter/
  │   ├── adapters/     ← Renamed from mappings/
  │   ├── types.ts
  │   ├── shadows.ts
  │   ├── extensions.ts
  │   ├── utils.ts
  │   └── index.ts
  ├── layout/           ← New for this work
  │   ├── foundations.ts
  │   ├── semantic-tokens.ts
  │   └── z-index.ts
  ├── palettes/         ← Existing (raw color values)
  ├── definitions/      ← OLD - delete after color verification
  ├── index.ts          ← Root theme system
  └── types.ts          ← Root types
```

### Files Created

**New files:**

1. `frontend/src/theme/layout/foundations.ts` - Base layout size tokens
2. `frontend/src/theme/layout/semantic-tokens.ts` - Responsive layout tokens
3. `frontend/src/theme/layout/z-index.ts` - Z-index scale
4. `frontend/src/pages/LayoutDebug.tsx` - Layout debugging page
5. `frontend/src/hooks/useLayoutValidation.ts` - Optional dev-mode validation

### Files Modified

**Theme structure:**

1. `frontend/src/theme/adapter/` → `frontend/src/theme/color/` - Rename directory
2. `frontend/src/theme/color/mappings/` → `frontend/src/theme/color/adapters/` - Rename directory
3. `frontend/src/theme/index.ts` - Update imports, merge layout tokens

**Core layout:**

4. `frontend/src/components/layout/NavBar.tsx` - Use theme tokens
5. `frontend/src/components/layout/Sidebar.tsx` - Use theme tokens
6. `frontend/src/components/layout/SidebarDrawer.tsx` - Use theme tokens
7. `frontend/src/components/layout/AppLayout.tsx` - Use theme tokens
8. `frontend/src/components/layout/Footer.tsx` - Use theme tokens, add debug links
9. `frontend/src/components/layout/NavBarUserMenu.tsx` - Use z-index token

**Pages:**

10. `frontend/src/pages/ThemeDebug.tsx` - Use theme tokens
11. `frontend/src/components/layout/AuthLayout.tsx` - Fix height calculation bug

**Routes:**

12. `frontend/src/App.tsx` - Add /layout-debug route

**Total: 5 new files, 12 modified files (includes 2 directory renames)**

### Research References

**External research conducted:** 2025-11-06
**Sources analyzed:**

- Chakra UI v3 semantic token documentation
- Material UI theme system
- Ant Design token architecture
- Production implementations (GitHub, GitLab, Linear, Notion)
- CSS container queries and responsive patterns
- SSR/hydration best practices

**Key finding:** Industry consensus is theme tokens as single source of truth, not JavaScript constants.

---

## Related Work

**Triggered by:** ThemeDebug sticky header implementation (sticky positioning "jump" issue)

**Blocks:** Efficient theme debugging (layout issues can mask theme contrast problems)

**Enables:** Future layout enhancements (container queries, dynamic measurements)

**Deferred work:**

- Container query implementation for component-level responsive behavior
- Full migration of non-layout components (only core layout components migrated; others use Chakra defaults)
