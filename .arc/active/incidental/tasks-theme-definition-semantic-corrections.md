# Incidental: Theme Definition Semantic Corrections

**Created:** 2025-11-03
**Branch:** `technical/service-layer-modernization`
**Status:** In Progress

## Context

**Discovered:** During Task 4.4.4 (AdvancedMovieFilters testing) - while testing surface token options for panel background

**Interrupts:** `.arc/active/incidental/tasks-theme-system-modernization.md` at Task 4.4.5 (Watchlist page conversion)

**Problem:** Critical semantic token misuse across all three design systems (GitHub Primer, IBM Carbon, GitLab Pajamas)
violates design system principles and causes visual bugs (invisible borders, indistinguishable cards, incorrect
elevation mapping).

**Why Now:**

- Blocks remaining component migrations (Task 4.4.5+ and all of Phase 4.5-4.6)
- 19 components already migrated - protecting this investment requires correct theme foundation
- Risk of cascading visual bugs if more components converted with broken theme definitions
- Design system research complete with specific fixes identified - ready to execute

## Scope

### Will Do

**Theme Corrections:**

- Fix GitHub Primer theme mappings (light mode card differentiation, surface-elevated misuse)
- Fix IBM Carbon theme mappings (dark mode border visibility, layer hierarchy)
- Fix GitLab Pajamas theme mappings (light mode card differentiation, border contrast)
- Update all 3 theme palette files with corrections (extract CineXplorer extensions)
- Ensure palette files contain ONLY official design system tokens

**Unified Adapter Layer (NEW):**

- Design unified vocabulary (~40 tokens) for consistent app-wide semantics
- Create adapter layer replacing current definitions files
- Implement per-theme adapters (GitHub, IBM Carbon, GitLab Pajamas)
- Map official design system tokens → unified app vocabulary
- Derive unofficial tokens (border hierarchy, layer-03, state variants)
- Extract and centralize CineXplorer-specific extensions (ratings, custom colors)
- Maintain clear demarcation: official vs derived vs app-specific tokens

**Enhanced Token Vocabulary:**

- Border hierarchy: subtle-00/02, strong-01/02/03 (consistent across all themes)
- Layer system: layer-01/02/03 (canonical names enforced via TypeScript)
- Shadow system: sm/md/lg for all themes (Primer/Pajamas official, Carbon minimal)
- Interaction states: hover, selected, active per layer (where applicable)

**Component Migration:**

- Migrate 19 already-converted components to use adapter imports
- Update component token usage to leverage richer vocabulary where beneficial
- Remove old definitions files after migration complete

**Testing & Documentation:**

- Test all 6 theme combinations (3 themes × 2 modes)
- Verify 19 migrated components display correctly across all themes
- Update strategy documentation with adapter pattern
- Document extension approach for future themes

### Won't Do

- Create new custom themes (focus on fixing existing 3 production themes)
- Implement full WCAG contrast validation (document known limitations, don't block on perfection)
- Force component token upgrades (only where clearly beneficial)
- Implement shadow rendering in components (provide tokens, let components opt-in)
- Restore removed custom themes (tangere-terminal, sage-bone, stone-greige, muted-earth were removed during Phase 4.3.5)
- Make palette files 100% pristine (corrections stay in palettes, only extensions extract to adapter)

---

## Tasks

### **Phase 1:** Foundation & Architecture

**Purpose:** Establish unified token vocabulary and adapter architecture before implementing theme-specific changes.

- [x] **1.1 Document correct semantic token purposes from design system research**

    **Completed:** Created comprehensive notes file with token semantic guide and hex value reference tables.

    - [x] **1.1.1 Create token semantic mapping guide in notes file**

        Created detailed guide in `notes-theme-definition-semantic-corrections.md` documenting:

        - Three token purpose categories (Structure, State, Emphasis) with examples from all 3 design systems
        - Critical misuses identified (emphasis tokens for elevation, state tokens for structure)
        - Elevation strategy by design system (Primer: shadows, Carbon: layer progression, Pajamas: shadows + sections)
        - Border token hierarchy per design system
        - Correct `surface-elevated` mappings for each design system
        - WCAG compliance analysis and design system philosophies

    - [x] **1.1.2 Create hex value reference table for all fixes**

        Created comprehensive tables covering:

        - **GitHub Primer:** Light/dark corrections with contrast ratios (2.12:1 → 3.73:1 for borders)
        - **IBM Carbon:** G100 dark critical fixes (invisible border #393939 → #6f6f6f), layer-03 addition
        - **GitLab Pajamas:** Light/dark corrections (card 1.02:1 → 1.15:1, border 1.17:1 → 2.1:1+)
        - All values sourced from official packages (@primer/primitives v8.x, @carbon/themes v11.0.0, Pajamas tokens)
        - WCAG contrast calculations for all border/surface combinations
        - Optional shadow token recommendations

- [x] **1.2 Design unified vocabulary & adapter architecture**

    **Completed:** Created comprehensive adapter layer with ~47 canonical tokens:
    - 5 core structure
    - 5 borders
    - 3 shadows
    - 6 interaction states
    - 28 semantic/extension tokens.
    Architecture enforces canonical names via TypeScript (no aliases in interface).

    **Key Decision:** Canonical names ONLY in interface - aliases ("card", "surface-elevated", "surface-highest")
    exist only in documentation/comments for semantic clarity. Components MUST use `layer-01`, `layer-02`,
    `layer-03` directly.

    - [x] **1.2.1 Define UnifiedTheme interface**

        Created `frontend/src/theme/adapter/types.ts` with complete interface:

        - **Core structure tokens** (5 canonical):
          `background`, `foreground`, `layer-01` (card semantic), `layer-02` (elevated semantic), `layer-03` (highest semantic)
            - NOTE: NO aliases in interface - "card", "surface-elevated" are documentation-only
        - **Border hierarchy** (5): `border-subtle-00`, `border-subtle-02`, `border-strong-01/02/03`
        - **Shadow system** (3): `shadow-sm`, `shadow-md`, `shadow-lg`
        - **Interaction states** (6): `layer-hover-01/02`, `layer-selected-01/02`, `layer-active-01/02`
        - **Semantic colors** (28): All existing tokens from ThemeColors kept
          (primary, secondary, accent, destructive, success, warning, info
            - foreground pairs, on-status variants)
        - **Popover** (2): Kept `popover`, `popover-foreground` for backwards compatibility (typically maps to layer-02/03)
        - **CineXplorer extensions** (8): rating, badge, drag-active, drop-zone + foreground pairs
        - **UI elements** (3): border, input, ring
        - Comprehensive JSDoc for each token explaining semantic meaning, usage, and design system sources
        - Marked ThemeColors as deprecated with migration guide

    - [x] **1.2.2 Create adapter module structure**

        Created complete adapter directory structure with 7 files:

        - ✅ `frontend/src/theme/adapter/types.ts` - UnifiedTheme interface (47 tokens), deprecated ThemeColors marker
        - ✅ `adapter/shadows.ts` - Shadow definitions per design system
          (Primer: official tokens, Carbon: minimal conservative, Pajamas: gl-shadow values)
        - ✅ `adapter/extensions.ts` - CineXplorer-specific tokens (rating colors: IMDb gold standard, badge/drag-drop adaptations)
        - ✅ `adapter/utils.ts` - Derivation helpers (adjustColor, deriveBorderHierarchy,
          deriveInteractionStates, deriveLayer03, isLightColor)
        - ✅ `adapter/github.ts` - Primer adapter skeleton with implementation notes
        - ✅ `adapter/carbon.ts` - Carbon adapter skeleton with critical dark mode border fix notes
        - ✅ `adapter/pajamas.ts` - Pajamas adapter skeleton with card differentiation corrections
        - ✅ `adapter/index.ts` - Public API (createUnifiedTheme factory, type/utility exports)

    - [x] **1.2.3 Document adapter mapping strategy**

        Comprehensive documentation added throughout adapter files:

        - **Per-adapter documentation:** Each adapter file (github.ts, carbon.ts, pajamas.ts) includes:
            - Official token mapping strategy with corrections from research
            - Derived token strategy (what needs derivation and why)
            - CineXplorer extension adaptation approach
            - Critical fixes (e.g., Carbon dark mode invisible borders #393939 → #6f6f6f)
        - **Utility documentation:** utils.ts explains all derivation algorithms with examples
        - **Extension documentation:** extensions.ts documents IMDb gold standard + theme adaptation
        - **Type documentation:** types.ts includes extensive JSDoc for all 47 tokens
        - **Three-category demarcation:** Official / Derived / Extended clearly marked in all adapter implementations

    - [x] **1.2.4 Create theme switching integration plan**

        Added comprehensive integration strategy section to notes file with:

        - **Architecture diagrams:** Current vs target architecture flows
        - **Integration strategy:** Option A (parallel systems) selected - run old/new systems in parallel during migration
        - **Implementation steps:** 5-step integration process (extend interface, update registry, update system
          creation, component migration, cleanup)
        - **Rollback strategy:** Clear rollback path until Phase 4 cleanup (revert components, old system still present)
        - **Testing strategy:** Per-phase requirements (unit tests, visual testing, type checking)
        - **Timeline estimate:** 12-17 hours total (Phase 2: 6-8h, Phase 3: 4-6h, Phase 4: 2-3h)
        - **Risk mitigation:** 4 risks identified with specific mitigation strategies (token mapping errors, component
          breakage, type errors, visual regressions)
        - **Success criteria:** Clear checkpoints for Phase 2, 3, and 4 completion
        - Integrated as new section in notes file (lines 699-1002)

- [x] **1.3 Build detailed Phase 3 component migration plan**

    **Goal:** Create concrete Phase 3 execution plan in this task list by auditing current component usage and
    expanding the integration strategy (from notes file) into specific work items.

    **Approach:** Use integration strategy section (notes file lines 699-1002) as strategic foundation, then add
    tactical details: which exact components need migration, what token changes each requires, which components
    can benefit from new unified vocabulary (border hierarchy, interaction states, layer-03).

    - [x] **1.3.1 Audit component token usage**

        **Completed:** Comprehensive audit of 34 migrated components documented in notes file.

        **Methodology:**
        - Analyzed completed migration work from `tasks-theme-system-modernization.md` (Phases 4.1-4.4)
        - Extracted token conversions per component from migration completion notes
        - Documented token usage patterns across all 34 components

        **Key Findings:**
        - **34 components migrated** across 4 phases (11 layout + 3 auth + 8 movie + 12 additional)
        - **2 components pending:** Watchlist.tsx (Task 4.4.5, blocked), ErrorBoundary.tsx (Phase 4.5, scheduled)
        - **Token usage comprehensive:** Current 33-token system covers all component needs
        - **7 major usage patterns identified:** Elevated surface hierarchy, text contrast pairing, Material Design 3
        state layers, border system standard, focus ring accessibility, semantic error states, link interaction pattern

        **Most Frequently Used Tokens:**
        - `border` (25+ components) - universal for separators, outlines
        - `muted-foreground` (20+ components) - labels, helper text, secondary text
        - `accent` (20+ components) - hover states, active tabs, links
        - `foreground` (15+ components) - primary text
        - `muted` (15+ components) - disabled states, subtle backgrounds
        - `card` (11+ components) - elevated surfaces (navbar, footer, sidebar, forms)

        **Documentation:** Complete component inventory with per-component token breakdowns documented in notes file
        (section "Component Token Usage Audit", lines 1006-1390)

        **Enhancement opportunities identified** for Task 1.3.2 analysis:
        - Border hierarchy (`border-strong-02` for elevated surfaces)
        - Interaction states (`layer-hover-01`, `layer-selected-01` per layer)
        - Layer-03 elevation (dropdowns over modals)
        - Shadow system (`shadow-sm/md/lg`)

        **Token migration targets:**
        - `card` → `layer-01` (11 components)
        - `surface-elevated` → `layer-02` (1 component)
        - `popover` → `layer-03` (UnifiedTheme uses canonical names only)

    - [x] **1.3.2 Identify enhancement opportunities**

        **Completed:** Comprehensive analysis of all 34 migrated components across 4 enhancement categories
        documented in notes file.

        **Methodology:**
        - Reviewed each component against 4 categories: Border hierarchy, Interaction states,
          Layer-03 elevation, Shadow system
        - Categorized opportunities by priority: High (clear benefit), Medium (marginal benefit), Low (minimal benefit)
        - Estimated implementation effort per component
        - Emphasized enhancements are OPTIONAL - components work correctly with current tokens

        **Key Findings:**

        **Enhancement Candidates Identified:**
        - **Border hierarchy:** 5 components (2 high-priority, 2 medium, 1 low)
        - **Interaction states:** 9 components (4 high-priority, 3 medium, 2 low)
        - **Layer-03 elevation:** 0 components (no current use cases, future consideration only)
        - **Shadow system:** 7 components (2 high-priority, 3 medium, 4 low)

        **Top Enhancement Candidates (Multiple Categories):**
        1. **MovieCard.tsx** - 3 categories (border, interaction, shadow) - 25 min
        2. **NavBarUserMenu.tsx** - 3 categories (border, interaction, shadow) - 20 min
        3. **AdvancedMovieFilters.tsx** - 3 categories (border, interaction, shadow) - 25 min
        4. **SidebarContent.tsx** - 1 category (interaction) - 10 min
        5. **PaginationCtrl.tsx** - 1 category (interaction) - 10 min

        **Components with No/Minimal Enhancement Opportunities:** 24 components
        - Auth pages (Login, Register, VerifyEmail) work correctly as-is
        - Layout components (Footer, NavBar, Sidebar) effective with current tokens
        - Content pages (Featured, MovieDetail, grids) work well

        **Tiered Recommendations for Phase 3:**
        - **Tier 1 (High-Value):** 5 components, ~90 minutes total - Quick wins demonstrating richer vocabulary
        - **Tier 2 (Nice-to-Have):** 5 components, ~45 minutes total - Marginal improvements
        - **Tier 3 (No Change):** 24 components - Current tokens semantically correct

        **Phase 3 Task Breakdown Strategy:**
        - **Batch 1:** Simple migrations (no enhancements) - 24 components × 5 min = 120 min
        - **Batch 2:** Migrations + Tier 1 enhancements - 5 components × 20 min = 100 min
        - **Batch 3:** Migrations + Tier 2 enhancements (optional) - 5 components × 15 min = 75 min
        - **Total estimated effort:** 220-295 minutes (3.7-4.9 hours)

        **Documentation:** Complete enhancement analysis with per-component breakdowns, priority tiers, and effort
        estimates documented in notes file (section "Component Enhancement Opportunities Analysis", lines 1394-1739)

    - [x] **1.3.3 Create Phase 3 task breakdown**

        **Completed:** Comprehensive Phase 3 task breakdown created with 3-batch component migration strategy.

        **Deliverables:**
        - **Phase 3 structure:** 5 major tasks (3.1 integration + 3.2-3.4 batches + 3.5 cleanup)
        - **Task 3.1:** Theme integration (extend interface, update registry, modify system creation)
        - **Task 3.2:** Batch 1 - Simple migrations (24 components, organized into 5 sub-batches)
        - **Task 3.3:** Batch 2 - Enhanced migrations (5 Tier 1 components with optional improvements)
        - **Task 3.4:** Batch 3 - Optional enhanced migrations (5 Tier 2 components, optional)
        - **Task 3.5:** Cleanup (remove old definitions, verify no old tokens)

        **Key Features of Breakdown:**
        - **Component-by-component details:** Each component has specific required changes, optional enhancements,
          and verification steps
        - **Batch organization:**
            - Batch 1: 24 components organized into 5 logical groups
              (layout, auth, movie pages, movie components, filter systems)
            - Batch 2: 5 high-value enhancement candidates (MovieCard, NavBarUserMenu, AdvancedMovieFilters,
              SidebarContent, PaginationCtrl)
            - Batch 3: 5 nice-to-have enhancements (optional execution)
        - **Verification checklist per batch:** Visual testing in all 6 theme combinations,
          quality gates (type checking, linting)
        - **Decision points:** Optional enhancements have evaluation criteria ("Apply if improves visual hierarchy")
        - **Rollback safety:** Parallel systems approach (old and new tokens coexist), Batch 2/3 optional

        **Phase 3 Location:** Lines 549-880 of task list (332 lines, replaces original 62-line Phase 3)

        **Result:** Phase 3 is now an actionable, component-specific checklist ready to execute after Phase 2
        adapter implementations complete.

### **Phase 2:** Per-Theme Migration

**Purpose:** Migrate each theme end-to-end (palette corrections → adapter creation → testing) before moving to next theme.

- [x] **2.1 GitHub Primer Theme**

    - [x] **2.1.1 Update GitHub Primer palette with corrections**

    **Completed:** Applied all corrections and extracted CineXplorer extensions.
    Palette now contains ONLY official Primer tokens.

    **Changes made:**
    - ✅ Added `border_emphasis: "#818b98"` to light mode (official borderColor-emphasis)
    - ✅ Added `border_emphasis: "#656c76"` to dark mode (official borderColor-emphasis)
    - ✅ Documented decision to keep `bg_inset: "#010409"` (official bgColor-inset, semantically correct for recessed surfaces)
    - ✅ Removed all CineXplorer extension tokens: `bg_attention`, `fg_attention`, `bg_info`, `fg_info`,
      `fg_rating` (10 tokens total)
    - ✅ Updated file header to document that palette contains only official tokens
    - ✅ Verified all values from @primer/primitives v8.x

    **File:** `frontend/src/theme/palettes/github.ts` (updated)

    - [x] **2.1.2 Create GitHub adapter mapping**

        **Completed:** Implemented complete GitHub Primer adapter with all 3 sections (official, derived, extensions).

        **Implementation details:**

        - ✅ Created `frontend/src/theme/adapter/github.ts` (236 lines)
        - ✅ Function signature: `createGithubAdapter(mode: "light" | "dark"): UnifiedTheme`
        - ✅ Imports palettes directly from `../palettes/github`
        - ✅ All 47 UnifiedTheme tokens mapped

        **Section 1: Official mappings (with corrections applied):**
        - Core structure: `background`, `foreground`, `layer-01` (bg_muted), `layer-02` (bg_default)
        - Borders: `border` (border_default), `border-strong-01` (border_emphasis from Task 2.1.1)
        - Semantic colors: All mapped from official Primer tokens (success, danger, accent, etc.)
        - Shadows: Official Primer shadow values from `primerShadows` helper
        - **Key corrections**: layer-01 uses bg_muted (cards distinct), layer-02 uses bg_default (no blue tint)

        **Section 2: Derived tokens (47 total with clear derivation comments):**
        - `layer-03`: Derived using `deriveLayer03()` (shadow-based, same as layer-02)
        - Border hierarchy: `border-subtle-00/02`, `border-strong-02/03` via `deriveBorderHierarchy()`
        - Interaction states: 6 tokens (`layer-hover/selected/active-01/02`) via `deriveInteractionStates()`
        - Warning colors: Hardcoded from Primer yellow scale (light: #d4a72c, dark: #bb8009)
        - Info colors: Mapped from Primer accent blue
        - Input/ring: Standard mappings (border_default, fg_accent)

        **Section 3: CineXplorer extensions:**
        - Applied via `createExtensions()` helper
        - Rating: IMDb gold standard (consistent across themes)
        - Badge: Adapted to Primer's muted aesthetic
        - Drag/drop: Mapped to Primer's secondary button states

        **Code quality:**
        - Comprehensive JSDoc header documenting Primer's elevation strategy
        - Clear section demarcation with comment blocks
        - Inline comments explaining corrections ("CORRECTED", "NEW", "DERIVED")
        - Type-safe with GitHubPalette type

        **Additional fixes:**
        - Fixed old `definitions/github.ts` to use hardcoded extension values (temporary until Phase 3)
        - Fixed `adapter/index.ts` to import functions for internal use (not just re-export)
        - Fixed Carbon/Pajamas adapters to return stubs instead of throwing (allows TypeScript analysis)

        **Quality gates:**
        - ✅ TypeScript type checking: 0 errors (full suite passes)
        - ✅ All UnifiedTheme interface requirements satisfied

    - [x] **2.1.3 Verify GitHub adapter (code-level)**

        **Completed:** Verified adapter implementation correctness and regression testing. Per Integration Plan
        (Parallel Systems), adapters NOT wired into theme system yet - visual testing of new tokens deferred to Phase 3.

        **Code verification (all passed):**
        - ✅ Adapter exports: `createGithubAdapter` callable from `adapter/index.ts`
        - ✅ Structure validation: Returns object with all 47 UnifiedTheme tokens
        - ✅ Mode handling: Both light and dark modes execute without errors
        - ✅ Token values: Key corrections verified (layer-01 = bg_muted, border-strong-01 = border_emphasis)

        **Regression verification (browser - all passed):**
        - ✅ Old theme system still works: App loads normally with GitHub theme
        - ✅ No visual regressions: Cards, modals, borders identical to before Task 2.1.1
        - ✅ Theme switching functional: light ↔ dark works without console errors
        - ✅ No console warnings about missing tokens

        **Quality gates (all passed):**
        - ✅ TypeScript type checking: 0 errors (verified Task 2.1.2)
        - ✅ Frontend linting: 0 errors (inherited from Task 2.1.2)
        - ✅ Old definitions file: Still functional after palette extraction

        **Result:** GitHub Primer adapter verified and ready. Phase 2.1 complete (palette corrections + adapter
        implementation + verification). Ready for Phase 2.2 (IBM Carbon).

- [ ] **2.2 IBM Carbon Theme**

    - [ ] **2.2.1 Update IBM Carbon palette with corrections**

    **Goal:** Add missing tokens and extract extensions, keeping only official Carbon tokens.

    **Dark mode (G100) corrections:**
    - Verify `bg_default: "#161616"` ✅ (gray-100, correct)
    - Verify `bg_layer_01: "#262626"` ✅ (gray-90, correct)
    - Verify `bg_layer_02: "#393939"` ✅ (gray-80, correct)
    - Add `bg_layer_03: "#525252"` (gray-70, highest elevation - was missing)
    - Add `border_strong_01: "#6f6f6f"` (gray-60, visible borders - was missing)
    - Add `border_strong_02: "#8d8d8d"` (gray-50, borders on layer-02 - was missing)
    - Add `border_strong_03: "#a8a8a8"` (gray-40, borders on layer-03 - was missing)
    - Add `border_subtle_02: "#525252"` (subtle borders on layer-02 - was missing)
    - Document values from @carbon/themes v11.0.0 G100 theme

    **Light mode corrections:**
    - Verify existing tokens correct (alternating white/gray-10 pattern)
    - Add `bg_layer_03: "#f4f4f4"` (gray-10, alternates with layer-01 - was missing)
    - Verify border tokens consistent (Carbon uses same borders across layers in light mode)

    **Extract CineXplorer extensions:**
    - Remove custom warning/info/rating colors from palette
    - Move to `adapter/extensions.ts` (centralized)
    - Result: Palette contains ONLY official Carbon tokens

    - [ ] **2.2.2 Create IBM Carbon adapter mapping**

        **Goal:** Create `adapter/carbon.ts` that maps Carbon tokens → unified vocabulary.

        **Official mappings (apply corrections):**
        - `background` ← `bg_default`
        - `layer-01` ← `bg_layer_01` (cards, explicit layer)
        - `layer-02` ← `bg_layer_02` (modals, explicit layer)
        - `layer-03` ← `bg_layer_03` **NEW** (dropdowns over modals)
        - `card` ← `bg_layer_01` (alias)
        - `surface-elevated` ← `bg_layer_02` (alias)
        - `surface-highest` ← `bg_layer_03` **NEW** (alias)
        - `border` ← `border_strong_01` **CORRECTED** from border_default (invisible)
        - `border-strong-01` ← `border_strong_01` **NEW**
        - `border-strong-02` ← `border_strong_02` **NEW**
        - `border-strong-03` ← `border_strong_03` **NEW**
        - `border-subtle-00` ← `border_default` (low-contrast dividers)
        - `border-subtle-02` ← `border_subtle_02` **NEW**

        **Derived tokens (minimal for Carbon - mostly official):**
        - Carbon provides rich official vocabulary, little derivation needed
        - `layer-hover-01/02/03` ← use official hover tokens if available, else derive
        - `layer-selected-01/02/03` ← use official selected tokens
        - `layer-active-01/02/03` ← use official active tokens

        **Shadow system (minimal - Carbon uses color layers):**
        - `shadow-sm` ← `'0 1px 2px rgba(0, 0, 0, 0.05)'` (very subtle)
        - `shadow-md` ← `'0 2px 4px rgba(0, 0, 0, 0.08)'` (light)
        - `shadow-lg` ← `'0 4px 8px rgba(0, 0, 0, 0.12)'` (moderate)

        **CineXplorer extensions:**
        - Apply `createCineXplorerExtensions(palette)` for ratings, custom colors

        **Comment demarcation:**
        - Emphasize Carbon's rich official vocabulary (least derivation needed)
        - Document per-layer border strategy

    - [ ] **2.2.3 Verify IBM Carbon adapter (code-level)**

        **Goal:** Verify adapter implementation correctness before moving to Pajamas.

        **IMPORTANT:** Per Integration Plan (Parallel Systems approach), adapters are NOT wired into the theme system during
        Phase 2. Visual testing of adapter output deferred to Phase 3 integration. This task verifies code correctness only.

        **Code verification:**
        - Adapter exports: `createCarbonAdapter` callable from `adapter/index.ts`
        - Structure validation: Returns object with all 47 UnifiedTheme tokens
        - Mode handling: Both `createCarbonAdapter("light")` and `createCarbonAdapter("dark")` execute without errors
        - Token values: Spot-check key corrections (dark mode: border-strong-01 = #6f6f6f, layer-03 = #525252)

        **Regression verification (browser):**
        - Old theme system still works: App loads with Carbon theme
        - No visual regressions: Layers, borders look identical to before Task 2.2.1
        - Theme switching functional: light ↔ dark works without console errors
        - No console warnings about missing tokens

        **Quality gates:**
        - TypeScript type checking: 0 errors
        - Frontend linting: 0 errors
        - Old definitions file: Still functional after palette extraction

        **Note:** Visual testing of NEW adapter tokens (visible borders, layer-03 elevation, etc.) happens AFTER Phase 3
        integration when both token systems are merged into Chakra config.

- [ ] **2.3 GitLab Pajamas Theme**

    - [ ] **2.3.1 Update GitLab Pajamas palette with corrections**

    **Goal:** Fix card differentiation and border contrast, extract extensions.

    **Light mode corrections:**
    - Verify `bg_default: "#ffffff"` ✅ (neutral-0, correct)
    - Change `bg_muted: "#fbfafd"` (neutral-10) note - insufficient for cards
    - Add `bg_section: "#ececef"` (neutral-50, official section/card background)
    - Change `border_default: "#dcdcde"` → `"#bfbfc3"` (neutral-200, better contrast 2.1:1)
    - OR consider `"#a4a3a8"` (neutral-300, even stronger 2.9:1 but more prominent)
    - Document contrast ratios and GitLab's partial WCAG compliance stance

    **Dark mode corrections:**
    - Verify `bg_default: "#18171d"` ✅ (neutral-950, correct)
    - Verify `bg_muted: "#28272d"` ✅ (neutral-900, correct for cards)
    - Change `border_default: "#4c4b51"` → `"#626168"` (neutral-600, better contrast)

    **Extract CineXplorer extensions:**
    - Remove custom warning/info/rating colors from palette
    - Move to `adapter/extensions.ts` (centralized)
    - Result: Palette contains ONLY official Pajamas tokens

    - [ ] **2.3.2 Create GitLab Pajamas adapter mapping**

        **Goal:** Create `adapter/pajamas.ts` that maps Pajamas tokens → unified vocabulary.

        **Official mappings (apply corrections):**
        - `background` ← `bg_default` (neutral-0)
        - `layer-01` ← `bg_section` (neutral-50, section token for cards) **CORRECTED**
        - `card` ← `bg_section` (alias) **CORRECTED** from bg_muted
        - `surface-elevated` ← `bg_default` + shadow **CORRECTED** from bg_emphasis
        - `border` ← `border_default` (updated value)
        - `border-strong-01` ← stronger border token **NEW**

        **Derived tokens (shadow-based elevation like Primer):**
        - `layer-02` ← `bg_default` (shadow-based)
        - `layer-03` ← `bg_default` (shadow-based, highest)
        - `surface-highest` ← `bg_default` (alias)
        - `border-subtle-00` ← `border_default`
        - `border-subtle-02` ← `border_default` (no per-layer differentiation)
        - `border-strong-02/03` ← derive from stronger neutral values
        - `layer-hover-01/02` ← derive from neutral scale
        - `layer-selected-01/02` ← derive from neutral scale
        - `layer-active-01/02` ← derive from neutral scale

        **Shadow system (official Pajamas values):**
        - `shadow-sm` ← `'0 1px 2px rgba(0, 0, 0, 0.12)'` (gl-shadow-sm for cards)
        - `shadow-md` ← `'0 2px 8px rgba(0, 0, 0, 0.15)'` (popovers/dropdowns)
        - `shadow-lg` ← `'0 4px 16px rgba(0, 0, 0, 0.2)'` (gl-shadow-lg for modals)

        **CineXplorer extensions:**
        - Apply `createCineXplorerExtensions(palette)` for ratings, custom colors

        **Comment demarcation:**
        - Document Pajamas' shadow-based approach (similar to Primer)
        - Note section token usage for cards (official semantic pattern)

    - [ ] **2.3.3 Verify GitLab Pajamas adapter (code-level)**

        **Goal:** Verify adapter implementation correctness, complete Phase 2 per-theme migration.

        **IMPORTANT:** Per Integration Plan (Parallel Systems approach), adapters are NOT wired into the theme system
        during Phase 2. Visual testing of adapter output deferred to Phase 3 integration.
        This task verifies code correctness only.

        **Code verification:**
        - Adapter exports: `createPajamasAdapter` callable from `adapter/index.ts`
        - Structure validation: Returns object with all 47 UnifiedTheme tokens
        - Mode handling: Both `createPajamasAdapter("light")` and `createPajamasAdapter("dark")` execute without errors
        - Token values: Spot-check key corrections (light: layer-01 = neutral-50, border-strong-01 from neutral-200/300)

        **Regression verification (browser):**
        - Old theme system still works: App loads with Pajamas theme
        - No visual regressions: Cards, borders look identical to before Task 2.3.1
        - Theme switching functional: light ↔ dark works without console errors
        - No console warnings about missing tokens

        **Quality gates:**
        - TypeScript type checking: 0 errors
        - Frontend linting: 0 errors
        - Old definitions file: Still functional after palette extraction

        **Phase 2 completion checklist:**
        - ✅ All 3 adapters implemented (GitHub, Carbon, Pajamas)
        - ✅ All 3 palettes corrected (only official tokens)
        - ✅ Old definitions files still functional (parallel systems)
        - ✅ Zero component breakage (regression testing passed)
        - Ready for Phase 3: Integration + Component Migration

        **Note:** Visual testing of NEW adapter tokens (card contrast improvements, border visibility, elevation hierarchy)
        happens AFTER Phase 3 integration when both token systems are merged into Chakra config.

### **Phase 3:** Component Migration

**Purpose:** Migrate all 34 components from current semantic tokens (`card`, `surface-elevated`, `border`) to unified
adapter vocabulary (`layer-01`, `layer-02`, `border-strong-*`) with optional enhancements.

**Strategy:** 3-batch approach separating simple migrations from enhanced migrations, allowing flexible execution based
on timeline and priorities.

---

- [ ] **3.1 Update theme integration**

    **Goal:** Extend Theme interface and update theme registry to support unified adapter tokens alongside current tokens
    (parallel systems approach per integration strategy).

    - [ ] **3.1.1 Extend Theme interface** (`frontend/src/theme/types.ts`)
        - Import `UnifiedTheme` type from `adapter/types`
        - Add optional properties to Theme interface:
            - `readonly lightUnified?: UnifiedTheme`
            - `readonly darkUnified?: UnifiedTheme`
        - Keep existing `light` and `dark` properties (deprecated, for parallel systems)
        - Quality gate: Type checking passes

    - [ ] **3.1.2 Update theme registry** (`frontend/src/theme/index.ts`)
        - Import `createUnifiedTheme` from adapter
        - Add unified instances to each theme in registry:
            - `lightUnified: createUnifiedTheme("github", "light")`
            - `darkUnified: createUnifiedTheme("github", "dark")`
        - Repeat for all 3 themes (github, carbon, pajamas)
        - Quality gate: Type checking passes, themes load in dev

    - [ ] **3.1.3 Update system creation** (`frontend/src/theme/index.ts`)
        - Modify `createBaseTokens()` to include unified tokens:
            - If `theme.lightUnified` exists, add all unified tokens to Chakra config
            - Result: ~86 tokens during migration (39 old + 47 new)
        - Quality gate: Both old and new tokens available in components

---

- [ ] **3.2 Component Migration - Batch 1: Simple Migrations**

    **Scope:** 24 components requiring only token name changes, no enhancements.

    **Pattern:** `bg="card"` → `bg="layer-01"`, `bg="surface-elevated"` → `bg="layer-02"`, `color="card-foreground"` → `color="foreground"`

    - [ ] **3.2.1 Layout components (simple) - 8 components**

        - [ ] **NavBar.tsx**
            - Changes: `bg="card"` (2 instances) → `bg="layer-01"`
            - Verification: Nav bar renders correctly, active tab styling works

        - [ ] **NavBarSearch.tsx**
            - Changes: No surface token changes (uses background)
            - Verification: Search input renders correctly

        - [ ] **Sidebar.tsx**
            - Changes: `bg="card"` → `bg="layer-01"`
            - Verification: Sidebar background correct

        - [ ] **sidebarOverlay.tsx**
            - Changes: `bg="card"` → `bg="layer-01"`
            - Verification: Mobile sidebar renders correctly

        - [ ] **MobileMenuButton.tsx**
            - Changes: No surface token changes
            - Verification: Hamburger button renders

        - [ ] **LoadingContent.tsx**
            - Changes: `bg="surface-elevated"` → `bg="layer-02"`
            - Verification: Loading state displays correctly

        - [ ] **Footer.tsx**
            - Changes: `bg="card"` → `bg="layer-01"`
            - Verification: Footer renders correctly

        - [ ] **BaseLayout.tsx**
            - Changes: No surface token changes (uses background)
            - Verification: Page layout correct

    - [ ] **3.2.2 Auth pages (simple) - 3 components**

        - [ ] **Login.tsx**
            - Changes: `bg="card"` → `bg="layer-01"`, `color="card-foreground"` → `color="foreground"`
            - Verification: Login form displays correctly, inputs visible

        - [ ] **Register.tsx**
            - Changes: `bg="card"` → `bg="layer-01"`, `color="card-foreground"` → `color="foreground"`
            - Verification: Register form displays correctly

        - [ ] **VerifyEmail.tsx**
            - Changes: No surface token changes needed
            - Verification: Verification UI renders correctly

    - [ ] **3.2.3 Movie pages (simple) - 4 components**

        - [ ] **Featured.tsx**
            - Changes: `bg="card"` → `bg="layer-01"`
            - Verification: Featured page renders correctly

        - [ ] **MovieDetail.tsx**
            - Changes: Verify no direct surface tokens (uses Card component)
            - Verification: Movie detail page displays correctly

        - [ ] **TypographyTest.tsx**
            - Changes: No surface token changes (showcase page)
            - Verification: Typography displays correctly

        - [ ] **PageHeader.tsx**
            - Changes: No surface token changes
            - Verification: Page header with animated underline works

    - [ ] **3.2.4 Movie components (simple) - 4 components**

        - [ ] **MovieCardContainer.tsx**
            - Changes: No surface tokens (container only)
            - Verification: Container renders correctly

        - [ ] **MovieUserScore.tsx**
            - Changes: `bg="card"` → `bg="layer-01"` (if present)
            - Verification: Score badges display correctly in all threshold ranges

        - [ ] **MovieCollectionGrid.tsx**
            - Changes: No surface tokens (grid layout)
            - Verification: Movie grid renders, pagination works

        - [ ] **MovieGrid.tsx**
            - Changes: No surface tokens (grid layout)
            - Verification: Grid displays correctly

    - [ ] **3.2.5 Filter systems (simple) - 5 components**

        - [ ] **LetterboxdStyleFilters.tsx** (parent)
            - Changes: No surface token changes
            - Verification: Filter bar renders

        - [ ] **ConnectedDropdowns.tsx**
            - Changes: No surface tokens (dropdown uses Select component)
            - Verification: Dropdowns work correctly

        - [ ] **CollapsibleSearchBox.tsx**
            - Changes: No surface tokens
            - Verification: Search box expands/collapses

        - [ ] **SortDropdownMinimal.tsx**
            - Changes: No surface tokens
            - Verification: Sort dropdown works

        - [ ] **ClearFiltersButton.tsx**
            - Changes: No surface tokens
            - Verification: Button renders correctly

    **Batch 1 Verification (after all components migrated):**
    - [ ] Visual test in all 6 theme combinations (GitHub, Carbon, Pajamas × light/dark)
    - [ ] Navigate key flows: Featured → Detail → Filters
    - [ ] Quality gates: Frontend type checking (0 errors), Frontend linting (0 errors)
    - [ ] Document any visual issues requiring fixes

---

- [ ] **3.3 Component Migration - Batch 2: Enhanced Migrations**

    **Scope:** 5 Tier 1 components with high-value enhancements (border hierarchy, interaction states, shadows).

    **Pattern:** Migration + optional enhancements demonstrating richer vocabulary.

    - [ ] **3.3.1 MovieCard.tsx**
        - **Required changes:**
            - `bg="card"` → `bg="layer-01"` (card background)
            - `color="card-foreground"` → `color="foreground"` (if present)
        - **Optional enhancements (3 categories):**
            - Border: Consider `borderColor="border-subtle-00"` for softer card outline
            - Interaction: Add `_hover={{ bg: "layer-hover-01" }}` for hover state
            - Shadow: Add `boxShadow="shadow-sm"` default, `boxShadow="shadow-md"` on hover
        - **Verification:** Movie cards display correctly, hover states work across all themes
        - **Decision point:** Apply enhancements that improve visual hierarchy without over-design

    - [ ] **3.3.2 NavBarUserMenu.tsx**
        - **Required changes:**
            - `bg="popover"` → `bg="layer-03"` (UnifiedTheme uses canonical names only)
            - Menu item hover: Update if needed
        - **Optional enhancements (3 categories):**
            - Border: `borderColor="border-strong-01"` for dropdown outline
            - Interaction: `_hover={{ bg: "layer-hover-02" }}` for menu items (replace `accent/8`)
            - Shadow: Add `boxShadow="shadow-md"` to dropdown container
        - **Verification:** Dropdown menu displays, menu items interactive, styling consistent
        - **Decision point:** Evaluate if interaction token simplifies hover logic

    - [ ] **3.3.3 AdvancedMovieFilters.tsx**
        - **Required changes:**
            - Panel `bg="muted"` → `bg="layer-02"` (if treating as elevated panel)
            - Update child components accordingly
        - **Optional enhancements (3 categories):**
            - Border: `borderColor="border-strong-02"` for panel border
            - Interaction: `_hover={{ bg: "layer-hover-01" }}` for filter items (replace `accent`)
            - Shadow: Add `boxShadow="shadow-sm"` for panel elevation
        - **Verification:** Filter panel displays, genre chips interactive, selections persist
        - **Decision point:** Confirm panel should use layer-02 elevation

    - [ ] **3.3.4 SidebarContent.tsx**
        - **Required changes:**
            - `bg="card"` → `bg="layer-01"` (sidebar uses card surface)
            - `color="card-foreground"` → `color="foreground"`
        - **Optional enhancements (1 category):**
            - Interaction:
                - Hover: `_hover={{ bg: "layer-hover-01" }}` (replace `accent/8`)
                - Selected: `bg="layer-selected-01"` (replace `accent/12`)
        - **Verification:** Sidebar list items render, hover/selected states work
        - **Decision point:** Confirm semantic interaction tokens improve clarity

    - [ ] **3.3.5 PaginationCtrl.tsx**
        - **Required changes:**
            - No surface token changes (buttons on background)
        - **Optional enhancements (1 category):**
            - Interaction: Active page `bg="layer-selected-01"` (replace `bg="muted"`)
        - **Verification:** Pagination displays, active page clearly indicated, navigation works
        - **Decision point:** Evaluate if semantic token improves active state clarity

    **Batch 2 Verification (after all components migrated):**
    - [ ] Visual test enhanced components in all 6 theme combinations
    - [ ] Verify enhancements improve UX without visual noise
    - [ ] Quality gates: Frontend type checking (0 errors), Frontend linting (0 errors)
    - [ ] Document enhancement outcomes (keep, refine, or revert)

---

- [ ] **3.4 Component Migration - Batch 3: Optional Enhanced Migrations**

    **Scope:** 5 Tier 2 components with marginal-benefit enhancements (nice-to-have).

    **Pattern:** Migration + optional enhancements for consistency.

    **Note:** This batch is OPTIONAL - only proceed if time permits and Batch 2 enhancements proved valuable.

    - [ ] **3.4.1 MobileMenuButton.tsx**
        - Required: No surface changes
        - Optional: `_hover={{ bg: "layer-hover-01" }}` for consistency with other interactive elements
        - Verification: Button renders, hover state works

    - [ ] **3.4.2 NavBar active tabs**
        - Required: `bg="card"` → `bg="layer-01"` (navbar surface)
        - Optional: Active tab `_hover={{ bg: "layer-hover-01" }}` for consistency
        - Verification: Active tab styling works, hover states consistent

    - [ ] **3.4.3 MovieDetail nested sections**
        - Required: Verify surface tokens if present
        - Optional: Evaluate nested elevated sections for border hierarchy
        - Verification: Movie detail page displays correctly, visual hierarchy clear

    - [ ] **3.4.4 GenreSelector dropdowns (AdvancedMovieFilters child)**
        - Required: Verify imports work after parent migration
        - Optional: `_hover={{ bg: "layer-hover-01" }}` for genre chips
        - Verification: Genre selector interactive, selections work

    - [ ] **3.4.5 YearSelector, RatingSelector dropdowns**
        - Required: Verify imports work
        - Optional: Interaction tokens for consistency with other filters
        - Verification: Date/rating selectors functional

    **Batch 3 Verification (if executed):**
    - [ ] Visual test all components in 6 theme combinations
    - [ ] Quality gates: Type checking, linting
    - [ ] Document which optional enhancements were applied

---

- [ ] **3.5 Cleanup: Remove old definitions files**

    **Goal:** Remove deprecated theme definitions after all components migrated and verified.

    **Critical:** Only proceed after Batch 1 complete and verified. Batch 2/3 are optional.

    - [ ] **3.5.1 Verify no old token usage remaining**
        - Grep for `bg="card"` across components (should be 0 matches in migrated components)
        - Grep for `bg="surface-elevated"` (should be 0 matches)
        - Grep for `color="card-foreground"` (should be 0 matches)
        - Document any remaining old tokens (unmigrated components: Watchlist, ErrorBoundary OK)

    - [ ] **3.5.2 Remove old system from createBaseTokens**
        - Remove old token generation loop from `createBaseTokens()` function
        - Keep only unified token generation
        - Update Theme interface: remove `light` and `dark` properties (keep only `lightUnified`, `darkUnified`)
        - Quality gate: Type checking passes (will show errors if components still use old tokens)

    - [ ] **3.5.3 Delete definitions directory**
        - Delete `frontend/src/theme/definitions/github.ts`
        - Delete `frontend/src/theme/definitions/ibm-carbon.ts`
        - Delete `frontend/src/theme/definitions/gitlab-pajamas.ts`
        - Delete `frontend/src/theme/definitions/` directory (if empty)
        - Verify no import errors: `grep -r "definitions/" frontend/src/`
        - Quality gate: No stray imports, type checking passes

    - [ ] **3.5.4 Update imports and exports**
        - Remove `ThemeColors` interface from `types.ts` (deprecated)
        - Update any type imports in `theme/index.ts`
        - Verify theme registry only uses `UnifiedTheme` properties
        - Quality gate: Type checking passes, themes load correctly

    **Final Verification After Cleanup:**
    - [ ] All 6 theme combinations work correctly
    - [ ] No console errors
    - [ ] Type checking passes (0 errors)
    - [ ] Frontend linting passes (0 errors)
    - [ ] Components migrated in Batch 1-3 all display correctly

### **Phase 4:** Verification & Documentation

**Purpose:** Comprehensive testing and documentation of completed work.

- [ ] **4.1 Comprehensive visual testing**

    **Goal:** Test all 6 theme combinations with all 19 migrated components.

    - [ ] **4.1.1 Test GitHub Primer theme (light + dark)**
        - **Light mode checks:**
            - Cards visually distinct from background (was same #ffffff)
            - surface-elevated no longer blue accent (was #ddf4ff)
            - Borders visible on all surfaces
            - Filter panels use appropriate elevation
        - **Dark mode checks:**
            - Border visibility maintained
            - Proper elevation hierarchy
        - Navigate: Featured → Detail → Filters (test real usage)
        - Document visual issues (if any)

    - [ ] **4.1.2 Test IBM Carbon theme (light + dark)**
        - **Dark mode checks:**
            - Borders NOW visible on elevated surfaces (was invisible #393939)
            - Layer hierarchy clear (background → layer-01 → layer-02 → layer-03)
            - Filter panels use layer-02 appropriately
        - **Light mode checks:**
            - Alternating pattern clear
            - Consistent border visibility
        - Navigate same pages
        - Document visual issues (if any)

    - [ ] **4.1.3 Test GitLab Pajamas theme (light + dark)**
        - **Light mode checks:**
            - Cards distinct from background (was 1.02:1, now 1.15:1+)
            - Borders have better contrast (2.1:1+ instead of 1.17:1)
            - Section tokens used appropriately
        - **Dark mode checks:**
            - Border contrast improved
            - Elevation clarity maintained
        - Navigate same pages
        - Document visual issues (if any)

- [ ] **4.2 Quality gates - Full suite**

    - [ ] **4.2.1 Run all linting and type checks**
        - Frontend TypeScript: `npm run type-check` (0 errors)
        - Frontend linting: `npm run lint` (0 errors)
        - Markdown linting: task list + notes files (0 errors)

    - [ ] **4.2.2 Verify no test regressions**
        - Run frontend test suite: `npm test` (all pass)
        - Run backend tests: verify no unexpected changes (should pass)

- [ ] **4.3 Update strategy documentation**

    - [ ] **4.3.1 Update semantic tokens strategy**

      Update `strategy-semantic-tokens.md`:
        - Add adapter pattern section (architecture, rationale)
        - Document unified vocabulary (~40 tokens)
        - Document official vs derived vs extended token categories
        - Add "Extending with new themes" guide
        - Reference notes file for detailed research

    - [ ] **4.3.2 Document adapter layer architecture**

      Add to notes file or strategy:
        - Adapter layer purpose and benefits
        - Per-design-system mapping strategies
        - Token derivation rules
        - Extension approach for CineXplorer-specific tokens
        - Maintenance guidelines (how to update official sources)

- [ ] **4.4 Final review and completion**

    - [ ] **4.4.1 Document accomplishments**

      Add completion section to this task list:
        - Themes corrected (3 palettes + 3 adapters)
        - Unified vocabulary created (~40 tokens)
        - Components migrated (19 components)
        - Visual testing completed (6 theme combinations)
        - Quality gates passed

    - [ ] **4.4.2 Create follow-up work (if needed)**

      Only if blocking issues discovered:
        - Create new incidental task list
        - Document issues and scope
        - Otherwise: defer enhancements to Phase 4.6 of main work

---

## Notes & Implementation Details

### Research Sources

**External Research:** 2025-11-03 via external-research-analyst agents

- **GitHub Primer Agent:** Investigated @primer/primitives v8.x, official Primer documentation, color system
- **IBM Carbon Agent:** Investigated @carbon/themes v11.0.0, layer system, G100/White themes
- **GitLab Pajamas Agent:** Investigated design.gitlab.com, elevation system, semantic section tokens

**Documentation:**

- `notes-theme-system-modernization.md` - Phase 4.4.4 section (lines 2914+): Comprehensive research findings
- `notes-theme-definition-semantic-corrections.md` - This incidental's reference guide (token semantics, hex values)

### Design System Versions

- **GitHub Primer:** @primer/primitives v8.x
- **IBM Carbon:** @carbon/themes v11.0.0
- **GitLab Pajamas:** Latest design.gitlab.com documentation (2025-11)

### Architecture Summary

**Before (Existing):**

```
Palettes (official + extensions mixed) → Definitions (adapter) → Components
```

**After (New Architecture):**

```
Palettes (official only) → Adapter (unified) → Components
                            ↓
                        Extensions (centralized)
```

**Key Improvements:**

1. **Single adapter layer:** Replaces definitions files, consolidates mapping logic
2. **Unified vocabulary:** ~40 tokens consistent across all themes
3. **Clean separation:** Official vs derived vs CineXplorer-specific clearly demarcated
4. **Extensible:** Adding new themes requires only one new adapter file
5. **Better token vocabulary:** Border hierarchy, layer system, shadows, interaction states

### Estimated Effort

**Phase 1 (Foundation):** ~4-6 hours

- Design vocabulary, create adapter structure, documentation

**Phase 2 (Per-Theme Migration):** ~6-8 hours

- 3 themes × (palette corrections + adapter creation + testing)

**Phase 3 (Component Migration):** ~3-4 hours

- Update imports, optional token upgrades, cleanup

**Phase 4 (Verification):** ~2-3 hours

- Visual testing (6 combinations), quality gates, documentation

**Total:** ~15-21 hours (over 2-3 sessions)

### Success Metrics

- ✅ All 3 themes render correctly (6 combinations)
- ✅ All 19 migrated components work across all themes
- ✅ Zero type errors, zero linting errors
- ✅ Unified vocabulary available (~40 tokens)
- ✅ Clean separation (official/derived/extended)
- ✅ Documentation complete (strategy updated, architecture documented)
