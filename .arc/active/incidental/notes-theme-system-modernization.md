# Implementation Notes: Theme System Modernization

**Task List:** `.arc/active/incidental/tasks-theme-system-modernization.md`

---

## Document Status

**Phase 1-3 Complete:** All research, audits, and implementation for Phases 1-3 are complete. Findings have been:

- Consolidated into ADRs (ADR-009, ADR-010, ADR-011, ADR-012)
- Documented in strategy files (strategy-semantic-tokens.md, strategy-button-patterns.md)
- Archived in research reference (design-systems-token-patterns.md)

**Phase 4-9 Status:** Phases 4-9 work is documented in task list. This notes file serves as scratchpad for active work only.

**Current Active Work:** Research consolidation and PR preparation (Chunk 1-3 cleanup)

---

## Phase 7: Component Inventory & Audit Findings

### Component Catalog by Domain

**Total Components:** 60 (excluding tests, hooks, ThemeDebug sections, entry points, Chakra wrappers)

---

#### Domain 1: Layout & Navigation (15 components)

**Navigation:**

- `components/layout/NavBar.tsx`
- `components/layout/NavBarSearch.tsx`
- `components/layout/NavBarUserMenu.tsx`
- `components/layout/MobileMenuButton.tsx`

**Layout Containers:**

- `components/layout/BaseLayout.tsx`
- `components/layout/AppLayout.tsx`
- `components/layout/AuthLayout.tsx`
- `components/layout/LoadingLayout.tsx`

**Sidebar:**

- `components/layout/Sidebar.tsx`
- `components/layout/SidebarContent.tsx`
- `components/layout/SidebarDrawer.tsx`
- `components/layout/sidebarOverlay.tsx`

**Utilities:**

- `components/layout/Footer.tsx`
- `components/layout/LoadingContent.tsx`
- `components/layout/PaginationCtrl.tsx`

---

#### Domain 2: Movie Discovery (16 components)

**Movie Cards:**

- `components/movie/MovieCard.tsx`
- `components/movie/MovieCardContainer.tsx`
- `components/movie/MovieUserScore.tsx`

**Collection Views:**

- `components/movie/collection/MovieCollectionLayout.tsx`
- `components/movie/collection/MovieCollectionGrid.tsx`
- `components/movie/collection/MovieGrid.tsx`
- `components/movie/collection/PageHeader.tsx`
- `components/movie/collection/FilterSection.tsx`

**Movie Pages:**

- `pages/movie/MovieDetail.tsx`
- `pages/movie/Featured.tsx`
- `pages/movie/Popular.tsx`
- `pages/movie/TopRated.tsx`
- `pages/movie/NowPlaying.tsx`
- `pages/movie/Upcoming.tsx`
- `pages/movie/SearchResults.tsx`

**Person Pages:**

- `pages/person/PersonDetail.tsx`

---

#### Domain 3: Movie Filters (11 components)

**Filter Components:**

- `components/movie/filters/AdvancedMovieFilters.tsx`
- `components/movie/filters/SearchBar.tsx`
- `components/movie/filters/ConnectedDropdowns.tsx`
- `components/movie/filters/SortDropdownMinimal.tsx`
- `components/movie/filters/SortSelector.tsx`
- `components/movie/filters/GenreSelector.tsx`
- `components/movie/filters/YearSelector.tsx`
- `components/movie/filters/RatingSelector.tsx`
- `components/movie/filters/ClearFiltersButton.tsx`
- `components/movie/filters/CollapsibleSearchBox.tsx`
- `components/movie/filters/LetterboxdStyleFilters.tsx`

---

#### Domain 4: Shared/Common (18 components)

**Error Handling:**

- `components/ErrorBoundary.tsx`

**Theme:**

- `components/ThemeSelector.tsx`

**Authentication:**

- `components/auth/ProtectedRoute.tsx`
- `components/auth/AuthContextProvider.tsx`

**User Components:**

- `components/user/UserProfile.tsx`

**User Pages:**

- `pages/user/Login.tsx`
- `pages/user/Register.tsx`
- `pages/user/Profile.tsx`
- `pages/user/Settings.tsx`
- `pages/user/VerifyEmail.tsx`
- `pages/user/TestLogin.tsx`
- `pages/user/Watchlist.tsx`

**Dev Tools:**

- `pages/dev/LayoutDebug.tsx`
- `pages/dev/TypographyDebug.tsx`

**Assets:**

- `assets/GoogleLogo.tsx`
- `assets/GitHubLogo.tsx`

---

#### Excluded from Audit

**Test Files:** All `__tests__/` directories (29 test files)

**ThemeDebug:** `pages/dev/theme-debug/ThemeDebug.tsx` + 10 section components (already verified compliant)

**Hooks:** `useMovieCollectionUrl.tsx`, `useMovieCollectionState.tsx` (logic only, no UI)

**Entry Points:** `main.tsx`, `App.tsx` (initialization, not domain-specific UI)

**Chakra Wrappers:** `components/chakra/` (4 files - theme-provider, provider, toaster, tooltip, color-mode)

---

### Per-Domain Audit Checklist

**13 Patterns × 4 Domains = 52 Total Checks**

#### Domain 1: Layout & Navigation (Task 7.1.b)

- [x] Pattern 1: Buttons ⚠️ 3 violations
- [x] Pattern 2: Form controls ⚠️ 1 minor violation
- [x] Pattern 3: Links ❌ 5 violations (SYSTEMIC)
- [x] Pattern 4: Surfaces/containers ✅ All compliant
- [x] Pattern 5: Borders ✅ All compliant
- [x] Pattern 6: Status/feedback ✅ N/A for domain
- [x] Pattern 7: Text hierarchy ✅ All compliant
- [x] Pattern 8: Z-index ✅ All compliant
- [x] Pattern 9: Layout structure ⚠️ 3 violations
- [x] Pattern 10: Hard-coded colors ⚠️ 2 violations + 1 exception
- [x] Pattern 11: Deprecated aliases ✅ All compliant
- [x] Pattern 12: Responsive patterns ✅ All compliant
- [x] Pattern 13: Gap analysis ✅ Patterns well-covered

#### Domain 2: Movie Discovery (Task 7.1.c)

- [x] Pattern 1: Buttons ⚠️ 1 violation
- [x] Pattern 2: Form controls ✅ N/A for domain
- [x] Pattern 3: Links ❌ 2 violations (SYSTEMIC)
- [x] Pattern 4: Surfaces/containers ✅ All compliant
- [x] Pattern 5: Borders ✅ All compliant
- [x] Pattern 6: Status/feedback ✅ All compliant (excellent)
- [x] Pattern 7: Text hierarchy ✅ All compliant
- [x] Pattern 8: Z-index ❌ 1 violation
- [x] Pattern 9: Layout structure ✅ All compliant
- [x] Pattern 10: Hard-coded colors ⚠️ 1 violation
- [x] Pattern 11: Deprecated aliases ✅ All compliant
- [x] Pattern 12: Responsive patterns ✅ All compliant
- [x] Pattern 13: Gap analysis ✅ Patterns well-covered

#### Domain 3: Movie Filters (Task 7.1.d)

- [ ] Pattern 1: Buttons
- [ ] Pattern 2: Form controls
- [ ] Pattern 3: Links
- [ ] Pattern 4: Surfaces/containers
- [ ] Pattern 5: Borders
- [ ] Pattern 6: Status/feedback
- [ ] Pattern 7: Text hierarchy
- [ ] Pattern 8: Z-index
- [ ] Pattern 9: Layout structure
- [ ] Pattern 10: Hard-coded colors
- [ ] Pattern 11: Deprecated aliases
- [ ] Pattern 12: Responsive patterns
- [ ] Pattern 13: Gap analysis

#### Domain 4: Shared/Common (Task 7.1.e)

- [ ] Pattern 1: Buttons
- [ ] Pattern 2: Form controls
- [ ] Pattern 3: Links
- [ ] Pattern 4: Surfaces/containers
- [ ] Pattern 5: Borders
- [ ] Pattern 6: Status/feedback
- [ ] Pattern 7: Text hierarchy
- [ ] Pattern 8: Z-index
- [ ] Pattern 9: Layout structure
- [ ] Pattern 10: Hard-coded colors
- [ ] Pattern 11: Deprecated aliases
- [ ] Pattern 12: Responsive patterns
- [ ] Pattern 13: Gap analysis

---

### Audit Findings by Domain

**Instructions:** During Tasks 7.1.b-e, document violations found for each domain under these headers.

#### Layout & Navigation Domain Audit (Task 7.1.b)

**Audit Complete:** 15 components audited against 13 patterns (195 total pattern checks)

**Summary:** 8 components with violations, 7 clean components. Primary issues: React Router Link usage (should use
Chakra Link), button pattern inconsistencies, hardcoded layout calculations, and input border token misuse.

---

**VIOLATIONS BY COMPONENT:**

**1. NavBar.tsx** (`components/layout/NavBar.tsx`)

- **Pattern 3 - Links:** ❌ VIOLATION
    - Line 22-67 (LogoAndTitle component): Uses React Router `<Link>` with inline `style={{ textDecoration: "none" }}`
    - Lines 162-184: User navigation tabs use React Router `<Link>` with inline styles
    - **Fix:** Replace with Chakra `<Link>` component using semantic tokens (`color="tertiary"`, hover states, underline
    patterns per ADR-010)

**2. NavBarSearch.tsx** (`components/layout/NavBarSearch.tsx`)

- **Pattern 2 - Form controls:** ⚠️ MINOR VIOLATION
    - Lines 42-68: Input doesn't directly use `borderColor="input"` - uses parent Box wrapper with `borderColor="border"`
    - Custom focus handling on Box instead of Input component
    - **Fix:** Apply `borderColor="input"` directly to Input element per pattern checklist

**3. NavBarUserMenu.tsx** (`components/layout/NavBarUserMenu.tsx`)

- **Pattern 1 - Buttons:** ❌ VIOLATION
    - Lines 72-73: Login button uses `color="button-outline-primary"` when it should use `on-button-outline-primary` for
    text/icon color
    - Pattern says "Icons must use `on-*` tokens (NOT border tokens)"
    - **Fix:** Change Button `color` prop from `button-outline-primary` to `on-button-outline-primary`

- **Pattern 3 - Links:** ❌ VIOLATION
    - Lines 216-258: Profile link uses React Router `<Link>` with inline styles
    - Lines 259-297: Settings link uses React Router `<Link>` with inline styles
    - Lines 164-210: User navigation items use React Router `<Link>` (mobile menu)
    - **Fix:** Replace with Chakra `<Link>` component using semantic tokens

**4. MobileMenuButton.tsx** (`components/layout/MobileMenuButton.tsx`)

- **Pattern 1 - Buttons:** ❌ VIOLATION
    - Lines 21-35: IconButton uses outline variant but doesn't follow button-outline pattern correctly
    - Uses `color="foreground"` instead of `on-button-outline` (neutral outline pattern)
    - Uses `borderColor="border"` instead of `button-outline`
    - Hover uses `layer-hover-01` instead of neutral outline hover pattern
    - Hover changes border to `tertiary` which is inconsistent with neutral outline pattern
    - **Fix:** Apply neutral outline button pattern: `color="on-button-outline"`, `borderColor="button-outline"`, hover `bg="button-outline/8"`

**5. LoadingLayout.tsx** (`components/layout/LoadingLayout.tsx`)

- **Pattern 9 - Layout structure:** ⚠️ MINOR VIOLATION
    - Line 27: Hardcoded `minH="calc(100vh - 144px)"` with comment "Same as AuthLayout"
    - Should verify this calculation matches layout tokens or document why hardcoded
    - **Fix:** Either use layout tokens or add inline comment justifying hardcoded value

- **Pattern 10 - Hard-coded colors:** ✅ DOCUMENTED EXCEPTION
    - Lines 40-42: GitHub logo uses `color="black"` with inline comment "EXCEPTION: GitHub logo requires black for brand
    consistency"
    - This is a legitimate exception per pattern 10 guidance

**6. Sidebar.tsx** (`components/layout/Sidebar.tsx`)

- **Pattern 9 - Layout structure:** ❌ VIOLATION
    - Line 18: Uses complex hardcoded calculation `top="calc(var(--chakra-sizes-layout-navbar) + 3rem - 28px)"`
    - Uses CSS variable reference + magic numbers (3rem, 28px) instead of layout tokens
    - **Fix:** Should use pure layout tokens or document calculation rationale

**7. SidebarContent.tsx** (`components/layout/SidebarContent.tsx`)

- **Pattern 3 - Links:** ❌ VIOLATION
    - Lines 162-184: User navigation items use React Router `<Link>` with inline styles
    - Lines 209-217: Browse navigation items use React Router `<Link>` with inline styles
    - **Fix:** Replace with Chakra `<Link>` component using semantic tokens

**8. SidebarDrawer.tsx** (`components/layout/sidebarOverlay.tsx`)

- **Pattern 9 - Layout structure:** ⚠️ MINOR VIOLATION
    - Line 48: Uses `width="sidebar-width"` - verify this is a proper layout token (not documented in strategy-layout-tokens.md)
    - Line 62: Hardcoded `h="64px"` for header height - should verify against layout tokens
    - **Fix:** Verify `sidebar-width` token exists; consider using layout token for header height

**9. Footer.tsx** (`components/layout/Footer.tsx`)

- **Pattern 3 - Links:** ❌ VIOLATION
    - Lines 32-40: Debug links use `Box asChild` + React Router `<Link>` with `textDecoration="underline"`
    - Should use Chakra `<Link>` with proper underline offset (2px per ADR-010)
    - **Fix:** Replace with Chakra `<Link>` using `textDecoration="underline"` + `textUnderlineOffset="2px"`

- **Pattern 10 - Hard-coded colors:** ⚠️ MINOR VIOLATION
    - Line 62: TMDB logo uses inline `style={{ height: "18px", opacity: 0.7 }}`
    - Height might be acceptable for external asset, but should verify
    - **Fix:** Document inline why hardcoded height is necessary (external asset sizing)

**10. LoadingContent.tsx** (`components/layout/LoadingContent.tsx`)

- **Pattern 10 - Hard-coded colors:** ❌ VIOLATION
    - Line 45: Uses hardcoded `boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"`
    - Should use semantic shadow tokens from theme
    - **Fix:** Replace with semantic shadow token (e.g., `boxShadow="shadow-lg"` or appropriate token)

**11. PaginationCtrl.tsx** (`components/layout/PaginationCtrl.tsx`)

- **Pattern 1 - Buttons:** ❌ VIOLATION
    - Lines 107-150 & 280-302: IconButtons use `color="foreground"` + `borderColor="border"` instead of proper button patterns
    - Lines 127-138 & 254-269: Selected state uses `bg="layer-selected-01"` + `color="tertiary"` instead of
    button-subtle-selected pattern
    - Line 133: Non-selected hover uses `muted/70` instead of proper button hover state (`button-subtle/12` or `tertiary/12`)
    - **Fix:** Apply button-subtle pattern for pagination. Selected: `bg="button-subtle-selected"` + `color="on-button-subtle-selected"`.
    Non-selected hover: `bg="tertiary/12"`. Base state: follow ghost or subtle button pattern.

---

**CLEAN COMPONENTS (No violations):**

1. ✅ **BaseLayout.tsx** - Minimal wrapper, uses `bg="background"` correctly
2. ✅ **AppLayout.tsx** - Uses `width="layout-sidebar"` token correctly, proper responsive CSS
3. ✅ **AuthLayout.tsx** - Minimal wrapper, no violations
4. ✅ **sidebarOverlay.tsx** - Minimal file, just creates overlay
5. ✅ **SidebarDrawer.tsx** (mostly clean, minor layout token verification needed)
6. ✅ **NavBar.tsx** (buttons and surfaces clean, only links need fixing)
7. ✅ **NavBarSearch.tsx** (mostly clean, minor input border token issue)

---

**PATTERN ANALYSIS SUMMARY:**

✅ **Pattern 1 - Buttons:** 3 violations (NavBarUserMenu, MobileMenuButton, PaginationCtrl)
⚠️ **Pattern 2 - Form controls:** 1 minor violation (NavBarSearch input borders)
❌ **Pattern 3 - Links:** 5 violations (NavBar, NavBarUserMenu, SidebarContent, Footer) - **SYSTEMIC ISSUE**
✅ **Pattern 4 - Surfaces:** All compliant (layer-01, layer-02, background used correctly)
✅ **Pattern 5 - Borders:** All compliant (border, border-strong-01 used correctly)
✅ **Pattern 6 - Status:** N/A for this domain
✅ **Pattern 7 - Text hierarchy:** All compliant (foreground, on-muted used correctly)
✅ **Pattern 8 - Z-index:** All compliant (navbar, sidebar, footer, dropdown tokens used)
⚠️ **Pattern 9 - Layout structure:** 3 violations (LoadingLayout, Sidebar, SidebarDrawer hardcoded calculations)
⚠️ **Pattern 10 - Hard-coded colors:** 2 violations (LoadingContent shadow, Footer logo height) + 1 documented
exception (LoadingLayout GitHub logo)
✅ **Pattern 11 - Deprecated aliases:** All compliant (uses tertiary, not accent)
✅ **Pattern 12 - Responsive patterns:** All compliant (CSS display properties, useBreakpointValue only for behavior)
✅ **Pattern 13 - Gap analysis:** Patterns well-covered by existing token system

---

**KEY INSIGHTS:**

1. **Systemic Issue - React Router Links:** 5 components use React Router `<Link>` with inline styles instead of
Chakra `<Link>` with semantic tokens. This is the most widespread violation in this domain.

2. **Button Pattern Inconsistency:** 3 components have button pattern violations, particularly around outline buttons and
pagination controls not following the semantic button token structure.

3. **Layout Token Gaps:** Several components use hardcoded layout calculations (sticky positioning, header heights)
suggesting potential gaps in layout token coverage.

4. **Overall Quality:** Domain is in good shape - 7/15 components are clean or have only minor issues. Most violations
are straightforward token substitutions.

---

**LAYOUT & NAVIGATION FIX LIST (Task 7.2.a)**

**Priority order by impact and interdependency:**

**HIGH PRIORITY (Systemic patterns):**

1. **React Router Links → Chakra Links (5 components)**
   - NavBar.tsx (lines 22-67, 162-184)
   - NavBarUserMenu.tsx (lines 164-210, 216-258, 259-297)
   - SidebarContent.tsx (lines 162-184, 209-217)
   - Footer.tsx (lines 32-40)
   - **Pattern:** Replace `<Link to={path} style={{ textDecoration: "none" }}>` with Chakra `<Link asChild>` wrapper
   - **Tokens:** `color="tertiary"`, `_hover={{ color: "tertiary-hover" }}`, `textDecoration="underline"`, `textUnderlineOffset="2px"`
   - **Reference:** ADR-010 link patterns

**MEDIUM PRIORITY (Button patterns):**

2. **PaginationCtrl.tsx button patterns**
   - Replace layer-selected pattern with button-subtle-selected
   - Selected: `bg="button-subtle-selected"` + `color="on-button-subtle-selected"`
   - Hover: `bg="tertiary/12"` (not `muted/70`)
   - Base: Apply ghost or subtle button pattern consistently

3. **MobileMenuButton.tsx outline button**
   - Change from generic tokens to neutral outline pattern
   - `color="on-button-outline"` (not `foreground`)
   - `borderColor="button-outline"` (not `border`)
   - `_hover={{ bg: "button-outline/8" }}` (not layer-hover-01)
   - Remove tertiary border on hover

4. **NavBarUserMenu.tsx login button**
   - Line 72: Change `color="button-outline-primary"` to `color="on-button-outline-primary"`
   - Button border token is correct, text/icon color should use `on-*` prefix

**LOW PRIORITY (Minor fixes):**

5. **NavBarSearch.tsx input borders**
   - Apply `borderColor="input"` directly to Input element (not parent Box)
   - Simplify focus handling to use Input's native focus props

6. **LoadingContent.tsx shadow**
   - Line 45: Replace `boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"` with semantic shadow token
   - Use `boxShadow="shadow-lg"` or appropriate Chakra shadow token

7. **Footer.tsx TMDB logo height**
   - Line 62: Add inline comment documenting hardcoded `height: "18px"` for external asset
   - `// EXCEPTION: External TMDB logo requires fixed height for brand compliance`

**DOCUMENTATION ONLY:**

8. **LoadingLayout.tsx layout calculation**
   - Line 27: Add inline comment justifying `minH="calc(100vh - 144px)"`
   - `// Matches AuthLayout container height to prevent OAuth spinner jump`

9. **Sidebar.tsx sticky positioning**
   - Line 18: Add inline comment explaining complex calculation
   - `// Sticky offset accounts for navbar height + container padding - visual alignment`

10. **SidebarDrawer.tsx layout tokens**
    - Verify `width="sidebar-width"` exists in theme (check system config)
    - Consider using layout token for `h="64px"` or document why hardcoded

---

**Fix Statistics:**

- **Total Fixes:** 10 items across 8 components
- **Systemic Fixes:** 1 (React Router Links - affects 5 components)
- **Button Pattern Fixes:** 3 (PaginationCtrl, MobileMenuButton, NavBarUserMenu)
- **Minor Token Substitutions:** 3 (NavBarSearch, LoadingContent, Footer)
- **Documentation Only:** 3 (LoadingLayout, Sidebar, SidebarDrawer)

**Estimated Effort:** ~2-3 hours (systemic link fix is largest chunk)

#### Movie Discovery Domain Audit (Task 7.1.c)

**Audit Complete:** 16 components audited against 13 patterns (208 total pattern checks)

**Note:** Featured.tsx was found at `pages/Featured.tsx` (pages root) and moved to `pages/movie/Featured.tsx` during
audit for better organization.

**Summary:** 4 components with violations, 12 clean components (75% clean rate). Primary issues: React Router Link usage
(same systemic issue as Layout domain), button hover state tokens, hardcoded shadow, non-semantic z-index value.

---

**VIOLATIONS BY COMPONENT:**

**1. MovieCard.tsx** (`components/movie/MovieCard.tsx`)

- **Pattern 3 - Links:** ❌ VIOLATION
    - Lines 187-206: Movie poster uses React Router `<Link>` with inline `style={{ display: "block" }}`
    - Lines 229-234: Movie title uses React Router `<Link>` with
    inline `style={{ textDecoration: "none", color: "inherit" }}`
    - **Fix:** Replace with Chakra `<Link asChild>` wrapper using semantic tokens

- **Pattern 8 - Z-index:** ❌ VIOLATION
    - Line 243: Title tooltip uses hardcoded `zIndex="9999"` instead of semantic token
    - **Fix:** Should use semantic z-index token (e.g., `zIndex="tooltip"` or `zIndex="popover"`)

- **Pattern 10 - Hard-coded colors:** ⚠️ MINOR VIOLATION
    - Line 12: MovieCardContainer `boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"` (in imported component)
    - **Note:** This is actually in MovieCardContainer.tsx, documented there

**2. MovieCardContainer.tsx** (`components/movie/MovieCardContainer.tsx`)

- **Pattern 10 - Hard-coded colors:** ❌ VIOLATION
    - Line 12: Uses hardcoded `boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"`
    - Should use semantic shadow token from theme
    - **Fix:** Replace with semantic shadow token (e.g., `boxShadow="shadow-sm"` or appropriate token)

**3. MovieDetail.tsx** (`pages/movie/MovieDetail.tsx`)

- **Pattern 3 - Links:** ❌ VIOLATION
    - Lines 79-98: Back button uses React Router `<Link>` wrapper
    - **Fix:** Replace with Chakra `<Link asChild>` using semantic tokens

**4. Featured.tsx** (`pages/movie/Featured.tsx`)

- **Pattern 1 - Buttons:** ❌ VIOLATION
    - Lines 52-86: All three navigation buttons have incorrect hover/active states
    - Uses `bg="button-subtle"` + `color="on-button-subtle"` (correct base)
    - BUT uses `_hover={{ bg: "secondary-hover" }}` and `_active={{ bg: "secondary-active" }}` (WRONG)
    - **Problem:** `secondary-*` tokens are for solid secondary buttons, NOT subtle buttons
    - **Fix:** Should use subtle button hover pattern (e.g., `button-subtle-hover` or opacity `button-subtle/90`)

**5. Popular.tsx, TopRated.tsx, NowPlaying.tsx, Upcoming.tsx, SearchResults.tsx**

- **Status:** ✅ ALL CLEAN
    - These are minimal wrapper components (3-8 lines each)
    - Just render `<MovieCollectionGrid />` with no styling or tokens
    - No violations found

**6. PersonDetail.tsx** (`pages/person/PersonDetail.tsx`)

- **Status:** ✅ CLEAN
    - Minimal stub component with only HTML elements
    - No Chakra components, no token usage
    - No violations found

---

**CLEAN COMPONENTS (No violations):**

1. ✅ **MovieUserScore.tsx** - Uses semantic status tokens correctly (success/on-success, warning/on-warning, info/on-info)
2. ✅ **MovieCollectionLayout.tsx** - Uses foreground, background, no hardcoded values
3. ✅ **MovieCollectionGrid.tsx** - Uses on-destructive, border, on-muted correctly
4. ✅ **MovieGrid.tsx** - Uses on-destructive, border, on-muted correctly
5. ✅ **PageHeader.tsx** - Uses foreground, tertiary correctly with proper animation
6. ✅ **FilterSection.tsx** - Minimal wrapper, no token usage violations
7. ✅ **Popular.tsx** - Minimal wrapper (3 lines)
8. ✅ **TopRated.tsx** - Minimal wrapper (3 lines)
9. ✅ **NowPlaying.tsx** - Minimal wrapper (3 lines)
10. ✅ **Upcoming.tsx** - Minimal wrapper (3 lines)
11. ✅ **SearchResults.tsx** - Minimal wrapper (8 lines)
12. ✅ **PersonDetail.tsx** - Stub component

---

**PATTERN ANALYSIS SUMMARY:**

⚠️ **Pattern 1 - Buttons:** 1 violation (Featured.tsx button hover states using wrong tokens)
✅ **Pattern 2 - Form controls:** N/A for this domain
❌ **Pattern 3 - Links:** 2 violations (MovieCard, MovieDetail) - **SYSTEMIC ISSUE CONTINUES**
✅ **Pattern 4 - Surfaces:** All compliant (layer-01, layer-02, background, muted used correctly)
✅ **Pattern 5 - Borders:** All compliant (border tokens used correctly)
✅ **Pattern 6 - Status:** All compliant (MovieUserScore uses semantic status tokens excellently)
✅ **Pattern 7 - Text hierarchy:** All compliant (foreground, on-muted used correctly throughout)
❌ **Pattern 8 - Z-index:** 1 violation (MovieCard tooltip hardcoded 9999)
✅ **Pattern 9 - Layout structure:** All compliant (proper Box/Flex usage, no hardcoded layout calcs)
⚠️ **Pattern 10 - Hard-coded colors:** 1 violation (MovieCardContainer shadow)
✅ **Pattern 11 - Deprecated aliases:** All compliant (uses tertiary, not accent)
✅ **Pattern 12 - Responsive patterns:** All compliant (CSS-based responsive design)
✅ **Pattern 13 - Gap analysis:** Patterns well-covered by existing token system

---

**KEY INSIGHTS:**

1. **Systemic Issue Persists - React Router Links:** 2 components (MovieCard, MovieDetail) use React Router `<Link>`
with inline styles. This is the same pattern as Layout domain - needs Chakra Link migration.

2. **Domain Quality: Excellent** - 12/16 components are completely clean (75%). Many wrapper components have minimal
code and no styling concerns.

3. **Status Token Excellence:** MovieUserScore component demonstrates excellent semantic status token usage (success,
warning, info with on-* variants).

4. **Button Token Misuse:** Featured.tsx uses `secondary-hover`/`secondary-active` tokens on subtle buttons (should use
subtle button hover pattern).

5. **Minor Violations Only:** Aside from systemic link issue and button tokens, only 2 minor violations (hardcoded
shadow, hardcoded z-index).

6. **File Organization:** Featured.tsx was moved from `pages/` to `pages/movie/` during audit for better logical
organization (it's a movie-focused landing page).

---

**MOVIE DISCOVERY FIX LIST (Task 7.2.b)**

**Priority order by impact:**

**HIGH PRIORITY (Systemic patterns):**

1. **React Router Links → Chakra Links (2 components)**
   - MovieCard.tsx (lines 187-206, 229-234)
   - MovieDetail.tsx (lines 79-98)
   - **Pattern:** Same as Layout domain - replace with Chakra `<Link asChild>` wrapper
   - **Tokens:** `color="tertiary"`, `_hover={{ color: "tertiary-hover" }}`, underline patterns
   - **Reference:** ADR-010 link patterns

**MEDIUM PRIORITY (Button token issues):**

2. **Featured.tsx button hover states**
   - Lines 52-86: Three buttons use wrong hover/active tokens
   - Current: `_hover={{ bg: "secondary-hover" }}`, `_active={{ bg: "secondary-active" }}`
   - **Fix:** Should use subtle button hover pattern
   - Options: `button-subtle-hover` token (if exists) OR opacity-based `button-subtle/90`
   - Base `bg="button-subtle"` + `color="on-button-subtle"` is correct, just hover/active need fixing

**LOW PRIORITY (Minor fixes):**

3. **MovieCard.tsx z-index**
   - Line 243: Replace `zIndex="9999"` with semantic token
   - Use `zIndex="tooltip"` or `zIndex="popover"` (verify which is appropriate for title tooltip)

4. **MovieCardContainer.tsx shadow**
   - Line 12: Replace `boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"` with semantic shadow token
   - Use `boxShadow="shadow-sm"` or appropriate Chakra shadow token

---

**Fix Statistics:**

- **Total Fixes:** 4 items across 4 components
- **Systemic Fixes:** 1 (React Router Links - affects 2 components, continues from Layout domain)
- **Button Pattern Fixes:** 1 (Featured.tsx hover states)
- **Minor Token Substitutions:** 2 (z-index, shadow)
- **Clean Components:** 12/16 (75% clean rate - excellent domain quality)

**Estimated Effort:** ~1 hour (links ~30min, button hover ~15min, z-index/shadow trivial)

#### Movie Filters Domain Audit (Task 7.1.d)

**Scope:** 11 Movie Filters components audited against 13 patterns

**Components audited:**

1. AdvancedMovieFilters.tsx
2. ClearFiltersButton.tsx
3. ConnectedDropdowns.tsx
4. SearchBar.tsx
5. GenreSelector.tsx
6. YearSelector.tsx
7. RatingSelector.tsx
8. SortSelector.tsx
9. SortDropdownMinimal.tsx
10. LetterboxdStyleFilters.tsx
11. CollapsibleSearchBox.tsx

**Note:** MinimalFilterContainer mentioned in task list does not exist in codebase. CollapsibleSearchBox exists but
wasn't in original list.

---

**Violations by Component:**

**1. AdvancedMovieFilters.tsx** - 1 violation

- ❌ **Buttons (Ghost):** Lines 129, 141 - Ghost buttons missing bg change on hover
    - Clear Filters button: `_hover={{ color: "destructive" }}` - missing `bg: "tertiary/8"`
    - Collapse button: `_hover={{ color: "tertiary-hover" }}` - missing `bg: "tertiary/8"`
    - Pattern: Ghost buttons need both color AND bg changes on hover

**2. ClearFiltersButton.tsx** - 2 violations

- ❌ **Buttons (Ghost):** Line 39 - Ghost button missing bg change on hover
    - `_hover={{ color: "destructive" }}` - missing `bg: "tertiary/8"`
- ❌ **Layout:** Line 26 - Using hardcoded pixels for positioning
    - `bottom="-28px"` - should use layout tokens or spacing tokens

**3. ConnectedDropdowns.tsx** - 2 violations (excluding commented code)

- ❌ **Buttons (Outline):** Lines 508-512 - Advanced toggle button missing border color change on hover
    - Uses `borderColor="button-outline"` + `color="on-button-outline"`
    - Hover only changes `bg: "tertiary/8"`
    - Missing: `borderColor: "tertiary"` and `color: "tertiary"` in hover state
- ⚠️ **Deprecated aliases in COMMENTED CODE:** Lines 446-485 (runtime selector)
    - Uses `background.subItem`, `border.separator`, `tertiary.primary`
    - Note: Commented code doesn't affect production, but should clean up eventually

**4. SearchBar.tsx** - 6 violations (MOST VIOLATIONS)

- ❌ **Deprecated aliases:** Line 29 - `color="text.secondary"` → should be `on-muted`
- ❌ **Deprecated aliases:** Line 39 - `borderColor="border.subtle"` → should be `input`
- ❌ **Deprecated aliases:** Line 40 - `backgroundColor={isHovered ? "background.subItem" : "transparent"}` → should
be `tertiary/8` or `layer-hover-01`
- ❌ **Deprecated aliases:** Line 44 - `borderColor="tertiary.primary"` → should be `ring` for focus
- ❌ **Focus states:** Lines 43-47 - Custom focus implementation instead of standard pattern
    - Using `boxShadow: "0 0 0 1px"` + `boxShadowColor="tertiary.primary"`
    - Should use: `outlineWidth="2px"` + `outlineOffset="2px"` + `outlineColor="ring"`
- ❌ **Z-index:** Line 30 - Numeric `zIndex={1}` for icon positioning
    - Could be acceptable for icon stacking, but should use semantic token if available

**5. GenreSelector.tsx** - CLEAN ✅

- ✅ Checkboxes using 2px borderWidth correctly
- ✅ borderColor="input" correct
- ✅ _checked using bg="primary" + borderColor="primary" correct
- ✅ _hover using layer-hover-01 correct
- ✅ Text using foreground correctly

**6. YearSelector.tsx** - CLEAN ✅

- ✅ Inputs using borderColor="input" correctly (1px default)
- ✅ Error states using borderColor="destructive" correctly
- ✅ _hover using tertiary/8 correctly
- ✅ Text using foreground and on-muted correctly

**7. RatingSelector.tsx** - CLEAN ✅

- ✅ Inputs using borderColor="input" correctly (1px default)
- ✅ Error states using borderColor="destructive" correctly
- ✅ _hover using tertiary/8 correctly
- ✅ Text using foreground and on-muted correctly

**8. SortSelector.tsx** - CLEAN ✅

- ✅ Select using borderColor="input" in CSS correctly
- ✅ Dropdown content using bg="muted" correctly
- ✅ Select items using tertiary/on-tertiary for selected correctly
- ✅ _hover using tertiary/12 for non-selected correctly

**9. SortDropdownMinimal.tsx** - CLEAN ✅

- ✅ Select using borderColor="input" correctly
- ✅ Dropdown content using bg="muted" correctly
- ✅ Select items using tertiary/on-tertiary for selected correctly
- ✅ _hover using tertiary/12 for non-selected correctly
- ✅ Text using on-muted and foreground correctly

**10. LetterboxdStyleFilters.tsx** - CLEAN ✅

- ✅ Composition component coordinating child filters
- ✅ Using bg="background" correctly
- ✅ Text using on-muted correctly

**11. CollapsibleSearchBox.tsx** - 1 violation

- ❌ **Borders:** Line 100 - Using `borderColor="border"` for search container
    - Should use `borderColor="input"` since this is a form-related border
    - The container wraps an Input component, so should follow form control border pattern

---

**Summary Statistics:**

- **Total components audited:** 11
- **Components with violations:** 4 (36%)
- **Clean components:** 7 (64%)
- **Total violations:** 12

**Violations by pattern:**

1. Buttons (Ghost hover): 3 violations (AdvancedMovieFilters, ClearFiltersButton)
2. Buttons (Outline hover): 1 violation (ConnectedDropdowns)
3. Deprecated aliases: 4 violations (SearchBar)
4. Focus states: 1 violation (SearchBar)
5. Z-index: 1 violation (SearchBar)
6. Borders: 1 violation (CollapsibleSearchBox)
7. Layout: 1 violation (ClearFiltersButton)

**Components ranked by violation count:**

1. SearchBar.tsx - 6 violations (needs comprehensive refactor)
2. ClearFiltersButton.tsx - 2 violations
3. ConnectedDropdowns.tsx - 2 violations (excluding commented code)
4. AdvancedMovieFilters.tsx - 1 violation
5. CollapsibleSearchBox.tsx - 1 violation
6. 6 components CLEAN ✅

**Systemic patterns (appearing in multiple components):**

- Ghost button hover pattern incomplete (3 components: AdvancedMovieFilters, ClearFiltersButton)
- Deprecated aliases still in use (1 component heavily: SearchBar)

**Estimated effort for fixes (Task 7.2.c):** ~45 minutes

- SearchBar.tsx: 20 minutes (6 violations, comprehensive refactor)
- Other 4 components: 25 minutes (simple pattern fixes)

---

**Prioritized Fix List for Task 7.2.c:**

**Priority 1 - Critical (Deprecated Aliases):**

1. **SearchBar.tsx** - Replace all deprecated aliases (4 aliases + custom focus)
   - Line 29: `color="text.secondary"` → `color="on-muted"`
   - Line 39: `borderColor="border.subtle"` → `borderColor="input"`
   - Line 40: `backgroundColor={isHovered ? "background.subItem" : "transparent"}` → `bg={isHovered ? "tertiary/8" : "transparent"}`
   - Line 44: `borderColor="tertiary.primary"` → `outlineColor="ring"` (with 2px outline focus pattern)
   - Lines 43-47: Replace custom focus with standard 2px outline + 2px offset pattern
   - Line 30: `zIndex={1}` → Consider semantic token or document as acceptable for icon stacking

**Priority 2 - Systemic Pattern Fixes (Button Hovers):**
2. **AdvancedMovieFilters.tsx** - Add bg to ghost button hovers

- Line 129: `_hover={{ color: "destructive" }}` → `_hover={{ bg: "tertiary/8", color: "destructive" }}`
- Line 141: `_hover={{ color: "tertiary-hover" }}` → `_hover={{ bg: "tertiary/8", color: "tertiary-hover" }}`

3. **ClearFiltersButton.tsx** - Add bg to ghost button hover
   - Line 39: `_hover={{ color: "destructive" }}` → `_hover={{ bg: "tertiary/8", color: "destructive" }}`

4. **ConnectedDropdowns.tsx** - Fix outline button hover
   - Lines 510-512: Add border and color changes to hover state
   - Current: `_hover={{ bg: "tertiary/8" }}`
   - Should be: `_hover={{ bg: "tertiary/8", borderColor: "tertiary", color: "tertiary" }}`

**Priority 3 - Minor Fixes:**
5. **CollapsibleSearchBox.tsx** - Fix border token

- Line 100: `borderColor="border"` → `borderColor="input"` (form-related border)

6. **ClearFiltersButton.tsx** - Consider layout token
   - Line 26: `bottom="-28px"` - Evaluate if spacing token available or if hardcoded acceptable for this absolute
   positioning case

**Optional Cleanup:**
7. **ConnectedDropdowns.tsx** - Clean up commented runtime selector code (lines 446-485)

- Contains deprecated aliases: `background.subItem`, `border.separator`, `tertiary.primary`
- Not affecting production, but good housekeeping

**Quality gates after fixes:**

- TypeScript: 0 errors
- ESLint: 0 violations
- Visual test: Verify all 4 themes × 2 modes

#### Shared/Common Domain Audit (Task 7.1.e)

**Scope:** 17 Shared/Common components audited against 13 patterns

**Components audited:**

1. ErrorBoundary.tsx
2. ThemeSelector.tsx
3. ColorModeButton.tsx (color-mode.tsx)
4. ProtectedRoute.tsx
5. AuthContextProvider.tsx
6. UserProfile.tsx
7. Login.tsx
8. Register.tsx
9. Profile.tsx
10. Settings.tsx
11. VerifyEmail.tsx
12. TestLogin.tsx
13. Watchlist.tsx
14. LayoutDebug.tsx
15. TypographyDebug.tsx
16. GoogleLogo.tsx
17. GitHubLogo.tsx

**Note:** Task list mentioned 18 components, actual count is 17 (UserProfile is empty stub). ColorModeButton added
after identifying it has same violations as ThemeSelector.

---

**Violations by Component:**

**1. ErrorBoundary.tsx** - 4 violations

- ❌ **Buttons (Outline hover):** Line 125 - Outline button missing border/color changes on hover
    - `_hover={{ bg: "destructive/8" }}` - missing `borderColor: "destructive"` and `color: "destructive"`
- ❌ **Borders:** Line 233 - Using generic `borderColor="border"` for stack trace Code block
    - Should use border hierarchy (border-strong-01?) or keep generic if contextually appropriate
- ❌ **Z-index:** Lines 694, 722, 765 - Numeric `zIndex={1}` for IconButton positioning
    - Should use semantic token if available, or document as acceptable for element stacking
- ⚠️ **Status colors on low-opacity backgrounds:** Lines 102, 105 - Alert uses `color="on-destructive"` on
`destructive/subtle` background
    - Current implementation looks correct (Alert.Root status="error" with destructive colors)
    - Verify contrast meets WCAG on 10-30% opacity backgrounds

**2. ThemeSelector.tsx** - 1 violation

- ❌ **Buttons (Outline hover):** Lines 66-72 - Button missing hover state entirely
    - Has `borderColor="button-outline"` + `color="on-button-outline"`
    - No `_hover` defined - should add `_hover={{ bg: "tertiary/8", borderColor: "tertiary", color: "tertiary" }}`

**3. ColorModeButton.tsx** (color-mode.tsx) - 3 violations

- ❌ **Buttons (Outline border):** Line 64 - Using generic `borderColor="border"` instead of `borderColor="button-outline"`
    - Should use `borderColor="button-outline"` for outline button variant
- ❌ **Buttons (Outline color):** Lines 58-66 - Missing `color="on-button-outline"` prop
    - Outline buttons need explicit color for consistency
- ❌ **Buttons (Outline hover):** Lines 58-66 - Button missing hover state entirely
    - No `_hover` defined - should add `_hover={{ bg: "tertiary/8", borderColor: "tertiary", color: "tertiary" }}`
- **Impact:** Used in Footer and ThemeDebug - violations appear in both locations
- **Note:** ThemeDebug overrides some violations with correct props, but hover still incomplete (missing `color: "tertiary"`)

**4. ProtectedRoute.tsx** - CLEAN ✅ (logic only, no UI)

**5. AuthContextProvider.tsx** - CLEAN ✅ (logic only, no UI)

**6. UserProfile.tsx** - N/A (empty stub file, 1 line)

**7. Login.tsx** - 3 violations

- ❌ **Form controls (Checkbox):** Line 545 - Checkbox using `borderColor="border"` instead of `borderColor="input"`
    - Should be `borderColor="input"` for form controls
- ❌ **Focus states (Checkbox):** Lines 549-552 - Custom focus implementation instead of standard pattern
    - Using `boxShadow: "0 0 0 1px var(--chakra-colors-ring)"`
    - Should use: `outlineWidth="2px"` + `outlineOffset="2px"` + `outlineColor="ring"`
- ❌ **Z-index:** Lines 694, 722, 765 - Numeric `zIndex={1}` for IconButton positioning in alerts
    - Should use semantic token if available

**8. Register.tsx** - 4 violations

- ❌ **Buttons (Primary hover):** Line 234-236 - Primary button using opacity for hover instead of semantic token
    - Current: `_hover={{ opacity: 0.92 }}`
    - Should be: `_hover={{ bg: "primary-hover" }}`
- ❌ **Focus states (Inputs):** Lines 114-117, 158-161, 202-205 - Custom focus implementation (3 inputs)
    - Using `boxShadow: "0 0 0 1px var(--chakra-colors-ring)"`
    - Should use: `outlineWidth="2px"` + `outlineOffset="2px"` + `outlineColor="ring"`

**9. Profile.tsx** - N/A (placeholder only)

**10. Settings.tsx** - N/A (placeholder only)

**11. VerifyEmail.tsx** - CLEAN ✅

- ✅ Buttons using correct hover patterns (primary-hover, outline with border/color changes)
- ✅ Alerts using correct status color patterns
- ✅ Spinner using semantic color

**12. TestLogin.tsx** - 1 violation (ACCEPTABLE - test/dev component)

- ⚠️ **Buttons:** Lines 32-33 - Buttons using default styling, no semantic tokens
    - Acceptable for test/dev component, not production code

**13. Watchlist.tsx** - CLEAN ✅

- ✅ Minimal UI using correct text tokens (foreground, on-destructive for errors)

**14. LayoutDebug.tsx** - 6 violations (ACCEPTABLE - dev tool)

- ⚠️ **Text hierarchy:** Line 80 - `color="foreground/80"` → should be `on-muted` for secondary text
- ⚠️ **Text hierarchy:** Lines 95, 100, 105, etc. - Multiple instances of `color="foreground/60"` → should be `on-muted`
- ⚠️ **Z-index:** Line 246 - Numeric `zIndex={1}` for sticky positioning
- Note: Dev tool violations are ACCEPTABLE (not production UI)

**15. TypographyDebug.tsx** - 3 violations (SHOULD FIX - demonstrates wrong patterns)

- ❌ **Deprecated aliases:** Line 181 - `color="text.secondary"` → should be `on-muted`
- ❌ **Deprecated aliases:** Line 225 - `color="text.secondary"` → should be `on-muted`
- ❌ **Deprecated aliases:** Line 316 - `color="text.secondary"` → should be `on-muted`
- **Critical:** This is a typography DEMO page - should demonstrate CORRECT patterns, not deprecated aliases

**16. GoogleLogo.tsx** - CLEAN ✅ (hardcoded colors are LEGITIMATE)

- ✅ Hardcoded brand colors (`fill="#EA4335"` etc.) are correct for brand logos
- Pattern 10 exception: Brand logos should use exact brand colors

**17. GitHubLogo.tsx** - CLEAN ✅

- ✅ Using `fill="currentColor"` - correct pattern for themeable icons

---

**Summary Statistics:**

- **Total components audited:** 17
- **Logic-only components:** 2 (ProtectedRoute, AuthContextProvider)
- **Empty/placeholder components:** 3 (UserProfile, Profile, Settings)
- **Dev/test components:** 2 (LayoutDebug, TestLogin)
- **Production UI components:** 10
- **Components with violations:** 7 production + 2 dev (70% of production components)
- **Clean production components:** 3 (VerifyEmail, Watchlist, GitHubLogo)
- **Total violations:** 25 (19 production, 6 dev tool)

**Violations by pattern (production only):**

1. Buttons (Outline hover): 3 violations (ErrorBoundary, ThemeSelector, ColorModeButton)
2. Buttons (Outline border): 1 violation (ColorModeButton using "border" instead of "button-outline")
3. Buttons (Outline color): 1 violation (ColorModeButton missing "on-button-outline")
4. Buttons (Primary hover): 1 violation (Register)
5. Form controls (Checkbox borders): 1 violation (Login)
6. Focus states (Custom implementations): 4 violations (Login checkbox, Register 3 inputs)
7. Borders: 1 violation (ErrorBoundary)
8. Z-index: 4 violations (ErrorBoundary, Login - IconButton positioning)
9. Deprecated aliases: 3 violations (TypographyDebug - critical since it's a demo)

**Components ranked by violation count (production only):**

1. Register.tsx - 4 violations (primary hover, 3 custom focus states)
2. ErrorBoundary.tsx - 4 violations (outline hover, borders, z-index)
3. ColorModeButton.tsx - 3 violations (border token, missing color, missing hover)
4. Login.tsx - 3 violations (checkbox border, checkbox focus, z-index)
5. TypographyDebug.tsx - 3 violations (deprecated aliases in DEMO page)
6. ThemeSelector.tsx - 1 violation (missing hover)
7. 3 components CLEAN ✅

**Systemic patterns (appearing in multiple components):**

- **Custom focus implementations:** 4 instances across Login + Register (checkbox + 3 inputs)
- **Outline button hover incomplete:** 3 components (ErrorBoundary, ThemeSelector, ColorModeButton) - **SYSTEMIC ISSUE**
- **Outline button border/color tokens:** ColorModeButton using generic "border" + missing color prop
- **Z-index numeric values:** 2 components (ErrorBoundary, Login) for IconButton positioning
- **Deprecated aliases:** Isolated to TypographyDebug (demo page showing wrong patterns)

**Critical finding - TypographyDebug needs immediate attention:**

TypographyDebug.tsx is a DEMONSTRATION page showing typography examples to developers/designers. It currently
demonstrates DEPRECATED patterns (`text.secondary` instead of `on-muted`). This teaches wrong patterns and should be
fixed immediately.

**Estimated effort for fixes (Task 7.2.d):** ~1.75 hours

- Register.tsx: 20 minutes (primary hover + 3 custom focus fixes)
- Login.tsx: 20 minutes (checkbox border + focus + z-index evaluation)
- ErrorBoundary.tsx: 20 minutes (outline hover + border evaluation + z-index evaluation)
- ColorModeButton.tsx: 15 minutes (border token + color prop + hover state) - **NEW**
- TypographyDebug.tsx: 15 minutes (3 deprecated aliases - CRITICAL for demo accuracy)
- ThemeSelector.tsx: 10 minutes (add hover state)
- Z-index evaluation: 15 minutes (determine if numeric values acceptable for IconButton positioning or need tokens)

---

**Prioritized Fix List for Task 7.2.d:**

**Priority 1 - CRITICAL (Demonstrates wrong patterns):**

1. **TypographyDebug.tsx** - Fix deprecated aliases in DEMO page (3 violations)
   - Line 181: `color="text.secondary"` → `color="on-muted"`
   - Line 225: `color="text.secondary"` → `color="on-muted"`
   - Line 316: `color="text.secondary"` → `color="on-muted"`
   - **Why critical:** This is a demo/reference page that teaches patterns to developers - must show correct patterns

**Priority 2 - Systemic Pattern Fixes:**

2. **Register.tsx** - Fix primary button hover + custom focus states (4 violations)
   - Line 234-236: `_hover={{ opacity: 0.92 }}` → `_hover={{ bg: "primary-hover" }}`
   - Lines 114-117: Email input - Replace custom boxShadow focus with standard outline pattern
   - Lines 158-161: Username input - Replace custom boxShadow focus with standard outline pattern
   - Lines 202-205: Password input - Replace custom boxShadow focus with standard outline pattern
   - Standard pattern: `outlineWidth="2px"` + `outlineOffset="2px"` + `outlineColor="ring"`

3. **Login.tsx** - Fix checkbox border + custom focus + z-index (3 violations)
   - Line 545: `borderColor="border"` → `borderColor="input"` (checkbox control)
   - Lines 549-552: Replace custom boxShadow focus with standard outline pattern on checkbox
   - Lines 694, 722, 765: Evaluate if `zIndex={1}` acceptable for IconButton positioning or needs semantic token

4. **ErrorBoundary.tsx** - Fix outline button hover + borders + z-index (4 violations)
   - Line 125: Add missing hover states to outline button
     - Current: `_hover={{ bg: "destructive/8" }}`
     - Should be: `_hover={{ bg: "destructive/8", borderColor: "destructive", color: "destructive" }}`
   - Line 233: Evaluate if `borderColor="border"` appropriate for Code block or needs border-strong-01
   - Lines 694, 722, 765: Evaluate if `zIndex={1}` acceptable for IconButton positioning

5. **ColorModeButton.tsx** (color-mode.tsx) - Fix border token + color + hover (3 violations)
   - Line 64: `borderColor="border"` → `borderColor="button-outline"`
   - Lines 58-66: Add `color="on-button-outline"` prop
   - Lines 58-66: Add complete hover state
     - Add: `_hover={{ bg: "tertiary/8", borderColor: "tertiary", color: "tertiary" }}`
   - **Impact:** Automatically fixes Footer usage, simplifies ThemeDebug overrides

6. **ThemeSelector.tsx** - Add missing hover state (1 violation)
   - Lines 66-72: Add complete hover state to outline button
     - Add: `_hover={{ bg: "tertiary/8", borderColor: "tertiary", color: "tertiary" }}`

**Priority 3 - Evaluation/Decision Items:**

7. **Z-index pattern decision** - Determine policy for IconButton positioning
   - Current: Using numeric `zIndex={1}` for IconButton positioning in alerts (ErrorBoundary, Login)
   - Options:
     a. Create semantic z-index token for icon-overlay or alert-icon-button
     b. Document numeric z-index as acceptable for element-level stacking (non-structural)
     c. Use existing semantic tokens if appropriate
   - Affects: ErrorBoundary.tsx (3 instances), Login.tsx (3 instances)

8. **Border token specificity** - Verify border usage in ErrorBoundary
   - Line 233: Code block using `borderColor="border"` - evaluate if generic is appropriate or needs border-strong hierarchy

**Optional - Dev Tool Cleanup:**

9. **LayoutDebug.tsx** - Replace foreground/60 with on-muted (6 violations)
   - Lines 80, 95, 100, 105, etc.: `color="foreground/60"` → `color="on-muted"`
   - Low priority: Dev tool, not production UI, violations don't affect user-facing application

**Quality gates after fixes:**

- TypeScript: 0 errors
- ESLint: 0 violations
- Visual test: Verify Login, Register, ErrorBoundary, ThemeSelector in all 4 themes × 2 modes

#### Cross-Domain Gap Analysis (Task 7.1.f)

{ Systemic gaps and token addition proposals will be added here }
