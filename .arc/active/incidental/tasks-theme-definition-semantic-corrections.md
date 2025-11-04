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
- Layer system: layer-01/02/03 with semantic aliases (card, surface-elevated, surface-highest)
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

- [ ] **1.2 Design unified vocabulary & adapter architecture**

    **Goal:** Create unified token vocabulary (~40 tokens) and adapter layer structure.
    This will replace current definitions files.

    - [ ] **1.2.1 Define UnifiedTheme interface**

        Create comprehensive interface in `theme/adapter/types.ts`:

        - **Core structure tokens** (8):
          `background`, `foreground`, `layer-01`, `layer-02`, `layer-03`,
          `card` (alias), `surface-elevated` (alias), `surface-highest` (alias)
        - **Border hierarchy** (5): `border-subtle-00`, `border-subtle-02`, `border-strong-01`, `border-strong-02`, `border-strong-03`
        - **Shadow system** (3): `shadow-sm`, `shadow-md`, `shadow-lg`
        - **Interaction states** (6):
          `layer-hover-01`, `layer-hover-02`,
          `layer-selected-01`, `layer-selected-02`,
          `layer-active-01`, `layer-active-02`
        - **Semantic colors** (keep existing): `primary`, `secondary`, `accent`, `destructive`, `success`,
          `warning`, `info`, etc.
        - **Text colors** (keep existing): `muted-foreground`, `accent-foreground`, etc.
        - **CineXplorer extensions** (extract from palettes): `rating`, `rating-foreground`, etc.
        - Document official vs derived vs app-specific for each token group

    - [ ] **1.2.2 Create adapter module structure**

        Set up adapter directory and supporting files:

        - Create `frontend/src/theme/adapter/` directory
        - Create `adapter/types.ts` - UnifiedTheme interface, ThemeAdapter function type
        - Create `adapter/shadows.ts` - Shadow value definitions per design system
          (Primer official, Pajamas official, Carbon minimal)
        - Create `adapter/extensions.ts` - CineXplorer-specific token function (ratings, custom colors)
        - Create `adapter/utils.ts` - Helper functions for token derivation (e.g., derivePerLayerBorders)
        - Create `adapter/index.ts` - Public API exports

    - [ ] **1.2.3 Document adapter mapping strategy**

        Add mapping strategy section to notes file:

        - **Per design system breakdown:** What's official (from design system), what's derived (for consistency),
          what's extended (CineXplorer-specific)
        - **Derivation rules:** Document logic (e.g., "Primer: all border-strong-* map to same value since no per-layer
          borders officially")
        - **Extension extraction plan:** List all CineXplorer tokens to extract from palettes
          (ratings, warning/info colors, movie-specific)
        - **Comment strategy:** How to mark official vs derived vs extended in adapter code

- [ ] **1.3 Identify component migration scope**

    **Goal:** Audit what needs updating and plan component migration approach.

    - [ ] **1.3.1 List all files requiring updates**

        Document complete file change list:

        - **3 palette files:** `palettes/github.ts`, `palettes/ibm-carbon.ts`,
          `palettes/gitlab-pajamas.ts` (corrections + extract extensions)
        - **3 new adapter files:** `adapter/github.ts`, `adapter/carbon.ts`, `adapter/pajamas.ts` (replace definitions)
        - **3 definitions files:** Mark for deletion after migration
        - **~19 component files:** List components needing import changes
        - **1 theme index:** `theme/index.ts` (export from adapter instead of definitions)
        - **Type files:** Update `theme/types.ts` with UnifiedTheme reference

    - [ ] **1.3.2 Component import audit**

        Find all components importing from theme system:

        - Grep for `from "../theme"` or `from "~/theme"` patterns
        - Grep for `useTheme`, `useColorMode`, theme-related hooks
        - Document current token usage patterns (which tokens are actually used)
        - Identify components that would benefit from richer vocabulary (filters, modals)
        - Create component migration checklist

    - [ ] **1.3.3 Verify type safety approach**

        Ensure smooth migration without breaking types:

        - Verify UnifiedTheme maintains all existing token names (backward compatible)
        - Plan for gradual adoption of new tokens (optional, not required)
        - Ensure TypeScript catches any broken imports during migration
        - Document type-checking strategy per batch

### **Phase 2:** Per-Theme Migration

**Purpose:** Migrate each theme end-to-end (palette corrections → adapter creation → testing) before moving to next theme.

#### **2.1 GitHub Primer Theme**

- [ ] **2.1.1 Update GitHub Primer palette with corrections**

    **Goal:** Apply corrections and extract CineXplorer extensions, keeping only official Primer tokens.

    **Light mode corrections:**
    - Verify `bg_default: "#ffffff"` ✅ (correct - keep)
    - Verify `bg_muted: "#f6f8fa"` ✅ (correct - keep)
    - Add `border_emphasis: "#818b98"` (borderColor-emphasis for strong borders, was missing)
    - Document all values verified from @primer/primitives v8.x

    **Dark mode corrections:**
    - Verify `bg_default: "#0d1117"` ✅ (correct - keep)
    - Consider `bg_inset` (#010409) vs official `bgColor-muted` (#151b23) - document decision
    - Add `border_emphasis: "#656c76"` (borderColor-emphasis, was missing)

    **Extract CineXplorer extensions:**
    - Remove `bg_attention`, `fg_attention`, `bg_info`, `fg_info`, `fg_rating` from palette
    - Move to `adapter/extensions.ts` (will be centralized for all themes)
    - Result: Palette contains ONLY official Primer tokens

- [ ] **2.1.2 Create GitHub adapter mapping**

    **Goal:** Create `adapter/github.ts` that maps Primer tokens → unified vocabulary.

    **File structure:**

    ```typescript
    // adapter/github.ts
    import type { GitHubPalette } from '../palettes/github';
    import type { UnifiedTheme } from './types';
    import { primerShadows } from './shadows';
    import { createCineXplorerExtensions } from './extensions';

    export function createGitHubAdapter(palette: GitHubPalette): UnifiedTheme {
      // Section 1: Official mappings (with corrections)
      // Section 2: Derived tokens (unofficial, for consistency)
      // Section 3: CineXplorer extensions
    }
    ```

    **Official mappings (apply corrections):**
    - `background` ← `bg_default`
    - `layer-01` ← `bg_muted` (cards)
    - `card` ← `bg_muted` (alias) **CORRECTED** from bg_default
    - `surface-elevated` ← `bg_default` + shadow **CORRECTED** from bg_emphasis
    - `border` ← `border_default`
    - `border-strong-01` ← `border_emphasis` **NEW**
    - Keep all existing semantic mappings (primary, accent, destructive, etc.)

    **Derived tokens (unofficial, for consistency):**
    - `layer-02` ← `bg_default` (shadow-based, same as layer-01 elevated)
    - `layer-03` ← `bg_default` (highest elevation, still shadow-based)
    - `surface-highest` ← `bg_default` (alias for layer-03)
    - `border-subtle-00` ← `border_default`
    - `border-subtle-02` ← `border_default` (Primer: no per-layer differentiation)
    - `border-strong-02` ← `border_emphasis` (same at all levels)
    - `border-strong-03` ← `border_emphasis`
    - `layer-hover-01/02` ← derive from `bg_muted` + darkening/lightening
    - `layer-selected-01/02` ← derive from `fg_accent` colors (blue)
    - `layer-active-01/02` ← derive from darker accent shades

    **Shadow system (official Primer values):**
    - `shadow-sm` ← `'0 1px 0 rgba(27, 31, 36, 0.04)'`
    - `shadow-md` ← `'0 3px 6px rgba(140, 149, 159, 0.15)'`
    - `shadow-lg` ← `'0 8px 24px rgba(140, 149, 159, 0.2)'`

    **CineXplorer extensions:**
    - Apply `createCineXplorerExtensions(palette)` for ratings, custom colors
    - Adapt warning/info colors per theme aesthetic

    **Comment demarcation:**
    - Clear section headers for official vs derived vs extended
    - JSDoc comments explaining derivation rationale

- [ ] **2.1.3 Test GitHub theme**

    **Goal:** Verify theme works before moving to Carbon.

    **Visual verification:**
    - Test light mode: cards distinct from background, no blue surface-elevated
    - Test dark mode: borders visible, proper elevation hierarchy
    - Quick spot-check: render AdvancedMovieFilters panel in both modes

    **Quality gates:**
    - TypeScript type checking: 0 errors
    - Frontend linting: 0 errors
    - Theme switching: light ↔ dark works without console errors

    **Document issues:** Note any problems for later resolution (don't block here)

#### **2.2 IBM Carbon Theme**

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

- [ ] **2.2.3 Test IBM Carbon theme**

    **Goal:** Verify theme works before moving to Pajamas.

    **Visual verification:**
    - Test dark mode: borders now visible (was invisible), layer-03 available
    - Test light mode: alternating pattern clear, consistent borders
    - Quick spot-check: render AdvancedMovieFilters panel in both modes

    **Quality gates:**
    - TypeScript type checking: 0 errors
    - Frontend linting: 0 errors
    - Theme switching: light ↔ dark works without console errors

    **Document issues:** Note any problems for later resolution

#### **2.3 GitLab Pajamas Theme**

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

- [ ] **2.3.3 Test GitLab Pajamas theme**

    **Goal:** Verify theme works, complete per-theme migration phase.

    **Visual verification:**
    - Test light mode: cards distinct from background (was 1.02:1), better borders
    - Test dark mode: improved border contrast, proper elevation
    - Quick spot-check: render AdvancedMovieFilters panel in both modes

    **Quality gates:**
    - TypeScript type checking: 0 errors
    - Frontend linting: 0 errors
    - Theme switching: light ↔ dark works without console errors

    **Document issues:** Note any problems for later resolution

### **Phase 3:** Component Migration

**Purpose:** Migrate components to use adapter layer, update imports, and leverage richer token vocabulary.

- [ ] **3.1 Update theme system exports**

    **Goal:** Transition theme/index.ts to export from adapter instead of definitions.

    - Update `frontend/src/theme/index.ts`:
        - Import from `adapter/github`, `adapter/carbon`, `adapter/pajamas`
        - Export `UnifiedTheme` type from `adapter/types`
        - Update `createThemeSystem` function to use adapter functions
        - Maintain backward compatibility during migration (if needed)
    - Quality gate: Type checking passes

- [ ] **3.2 Migrate component imports - Batch 1 (Filter components)**

    **Goal:** Update filter components first (high visibility, good test case).

    **Components to update (~10 files):**
    - AdvancedMovieFilters system (5 components): Panel, GenreFilter, ReleaseDateFilter, RatingFilter, SortOptions
    - LetterboxdStyleFilters system (5 components): Panel, GenreChips, YearSlider, RatingStars, SortDropdown

    **Changes per component:**
    - Verify imports: should work without changes (theme/index.ts handles adapter)
    - **Optional token upgrades:**
        - Consider `border-strong-02` for elevated filter panels
        - Consider `shadow-md` for filter panel elevation
        - Consider `layer-hover-01` for interactive filter elements
    - Only upgrade if clearly beneficial (don't force changes)

    **Testing after batch:**
    - Visual verification in all 6 theme combinations
    - Filter functionality works (user interactions)
    - Quality gates: Type checking, linting

- [ ] **3.3 Migrate component imports - Batch 2 (Remaining components)**

    **Goal:** Update remaining migrated components (~9 files).

    **Components to update:**
    - PaginationCtrl (Task 4.4.1)
    - TypographyTest (Task 4.4.2)
    - MovieDetail, MovieCard, MovieCardContainer (Phase 4.3)
    - MovieUserScore, MovieCollectionGrid, MovieGrid (Phase 4.3)
    - PageHeader (Phase 4.3)

    **Changes per component:**
    - Verify imports work
    - **Optional token upgrades:**
        - Consider richer vocabulary where appropriate
        - Focus on clarity, not exhaustive usage
    - Document any token usage changes

    **Testing after batch:**
    - Visual verification in all 6 theme combinations
    - Component functionality works
    - Quality gates: Type checking, linting

- [ ] **3.4 Remove old definitions files**

    **Goal:** Clean up deprecated files after successful migration.

    - Delete `frontend/src/theme/definitions/github.ts`
    - Delete `frontend/src/theme/definitions/ibm-carbon.ts`
    - Delete `frontend/src/theme/definitions/gitlab-pajamas.ts`
    - Verify no stray imports:
        - Grep for `from "../definitions/"` or `from "~/theme/definitions/"`
        - Grep for `definitions/github`, `definitions/carbon`, `definitions/pajamas`
    - Quality gate: No import errors, type checking passes

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
