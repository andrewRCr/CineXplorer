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

- Fix GitHub Primer theme mappings (light mode card differentiation, surface-elevated misuse)
- Fix IBM Carbon theme mappings (dark mode border visibility, layer hierarchy)
- Fix GitLab Pajamas theme mappings (light mode card differentiation, border contrast)
- Add missing tokens (layer-03, border-strong hierarchy, shadow system)
- Update all 3 theme palette files (GitHub, IBM Carbon, GitLab Pajamas)
- Update all 3 theme definition files with corrected semantic mappings
- Test all 6 theme combinations (3 themes × 2 modes)
- Document findings and verify 19 migrated components display correctly

### Won't Do

- Create new custom themes (focus on fixing existing 3 production themes)
- Implement full WCAG contrast validation (document known limitations, don't block on perfection)
- Refactor component token usage (unless broken by theme fixes)
- Add elevation shadow system to components (document as future enhancement if needed)
- Restore removed custom themes (tangere-terminal, sage-bone, stone-greige, muted-earth were removed during Phase 4.3.5)

---

## Tasks

### **Phase 1:** Token Structure & Documentation

**Purpose:** Establish correct semantic token hierarchy and create reference guide for theme updates.

- [ ] **1.1 Document correct semantic token purposes from design system research**

    **Goal:** Create authoritative reference separating structural, state, and emphasis tokens.

    - [ ] **1.1.1 Create token semantic mapping guide in notes file**
        - Structure tokens (elevation): `layer-01/02/03`, `bgColor-muted`, `background.color.section`
        - State tokens (selection): `layer-selected`, `bgColor-accent-emphasis`
        - Emphasis tokens (attention): `layer-accent`, `bg_emphasis`, `background.color.strong`
        - Document which tokens should map to `surface-elevated` per design system
        - Document correct border token hierarchy per design system
        - Location: Append to `notes-theme-system-modernization.md`

    - [ ] **1.1.2 Create hex value reference table for all fixes**
        - GitHub Primer: Correct values for light (card, surface-elevated, border-strong)
        - IBM Carbon: Correct values for dark (layer-03, border-strong-01/02/03)
        - GitLab Pajamas: Correct values for light/dark (card, border)
        - Include contrast ratios where relevant
        - Document source (official design system packages)

- [ ] **1.2 Identify all files requiring updates**

    - [ ] **1.2.1 List palette files needing changes**
        - `frontend/src/theme/palettes/github.ts` - Add/modify tokens
        - `frontend/src/theme/palettes/ibm-carbon.ts` - Add layer-03, border tokens
        - `frontend/src/theme/palettes/gitlab-pajamas.ts` - Fix card, border values
        - Custom theme palettes (4 files) - Apply same principles

    - [ ] **1.2.2 List theme definition files needing changes**
        - `frontend/src/theme/definitions/github.ts` - Fix card, surface-elevated mappings
        - `frontend/src/theme/definitions/ibm-carbon.ts` - Fix border, add layer-03
        - `frontend/src/theme/definitions/gitlab-pajamas.ts` - Fix card, border mappings
        - Custom theme definitions (4 files) - Apply same patterns

    - [ ] **1.2.3 Verify types.ts for new token additions**
        - Check if `layer-03`, `border-strong`, shadow tokens need type additions
        - Document if Theme type interface needs updates

### **Phase 2:** GitHub Primer Theme Corrections

- [ ] **2.1 Update GitHub Primer palette file**

    **Goal:** Add missing tokens and correct hex values per official Primer primitives.

    - [ ] **2.1.1 Fix light mode palette in `palettes/github.ts`**
        - Verify `bg_default: "#ffffff"` (correct - keep)
        - Verify `bg_muted: "#f6f8fa"` (correct - keep)
        - Add `border_strong: "#818b98"` (borderColor-emphasis for accessibility)
        - Document all values verified from @primer/primitives v8.x

    - [ ] **2.1.2 Fix dark mode palette in `palettes/github.ts`**
        - Verify `bg_default: "#0d1117"` (correct - keep)
        - Change `bg_inset: "#010409"` usage note (semantically incorrect for cards)
        - Add `bg_muted_official: "#151b23"` (official bgColor-muted, optional migration)
        - Add `border_strong: "#656c76"` (borderColor-emphasis)

    - [ ] **2.1.3 Add optional shadow tokens for elevation**
        - Add `shadow_sm`, `shadow_md`, `shadow_lg` values from Primer
        - Document usage: elevation via shadows, not background color changes
        - Mark as optional enhancement (won't block if not implemented)

- [ ] **2.2 Update GitHub Primer theme definition file**

    - [ ] **2.2.1 Fix light mode mappings in `definitions/github.ts`**
        - Change `card: pLight.bg_default` → `card: pLight.bg_muted` (#f6f8fa)
        - Change `surface-elevated: pLight.bg_emphasis` → `surface-elevated: pLight.bg_default`
        - Add `border-strong: pLight.border_strong` (new token)
        - Verify other mappings unchanged

    - [ ] **2.2.2 Fix dark mode mappings in `definitions/github.ts`**
        - Keep `card: pDark.bg_inset` (acceptable) OR change to `bg_muted` (official)
        - Change `surface-elevated: pDark.bg_muted` → `surface-elevated: pDark.bg_default`
        - Add `border-strong: pDark.border_strong` (new token)
        - Document choice made (inset vs muted for cards)

    - [ ] **2.2.3 Run quality gates**
        - TypeScript type checking (0 errors)
        - Frontend linting (0 errors)

### **Phase 3:** IBM Carbon Theme Corrections

- [ ] **3.1 Update IBM Carbon palette file**

    **Goal:** Add missing layer-03 and border hierarchy tokens per Carbon v11.

    - [ ] **3.1.1 Add missing tokens to dark mode palette in `palettes/ibm-carbon.ts`**
        - Add `bg_layer_03: "#525252"` (gray-70, highest elevation)
        - Add `border_strong_01: "#6f6f6f"` (visible borders on background/layer-01)
        - Add `border_strong_02: "#8d8d8d"` (visible borders on layer-02)
        - Add `border_strong_03: "#a8a8a8"` (visible borders on layer-03)
        - Add `border_subtle_02: "#525252"` (subtle borders on layer-02)
        - Document values from @carbon/themes v11.0.0 G100 theme

    - [ ] **3.1.2 Add missing tokens to light mode palette in `palettes/ibm-carbon.ts`**
        - Add `bg_layer_03: "#ffffff"` (white, alternates with layer-01)
        - Verify border tokens are consistent across layers (Carbon pattern)
        - Light mode uses same border colors for all layers (already correct)

    - [ ] **3.1.3 Add state token clarifications**
        - Add JSDoc comments distinguishing `bg_emphasis` (selection) from `bg_layer_*` (elevation)
        - Add JSDoc for `layer_selected`, `layer_hover`, `layer_active` tokens
        - Document semantic separation for future reference

- [ ] **3.2 Update IBM Carbon theme definition file**

    - [ ] **3.2.1 Fix dark mode mappings in `definitions/ibm-carbon.ts`**
        - Change `border: pDark.border_default` → `border: pDark.border_strong_01` (#6f6f6f)
        - Add `border-subtle: pDark.border_default` (#393939) for low-contrast dividers
        - Add `surface-highest: pDark.bg_layer_03` (#525252) for dropdowns over modals
        - Verify `surface-elevated: pDark.bg_emphasis` is semantically correct (layer-02)
        - Add comment explaining emphasis vs layer semantic distinction

    - [ ] **3.2.2 Verify light mode mappings in `definitions/ibm-carbon.ts`**
        - Verify alternating pattern (white → gray-10 → white → gray-10)
        - Verify consistent border colors (correct as-is)
        - Add `surface-highest: pLight.bg_layer_03` for consistency

    - [ ] **3.2.3 Run quality gates**
        - TypeScript type checking (0 errors)
        - Frontend linting (0 errors)

### **Phase 4:** GitLab Pajamas Theme Corrections

- [ ] **4.1 Update GitLab Pajamas palette file**

    **Goal:** Fix card differentiation and border contrast per Pajamas design system.

    - [ ] **4.1.1 Fix light mode palette in `palettes/gitlab-pajamas.ts`**
        - Verify `bg_default: "#ffffff"` (neutral-0, correct)
        - Change `bg_muted: "#fbfafd"` note (insufficient for cards)
        - Add `bg_section: "#ececef"` (neutral-50, official card background)
        - Change `border_default: "#dcdcde"` → `border_default: "#bfbfc3"` (neutral-200, better contrast)
        - OR use `border_default: "#a4a3a8"` (neutral-300, even better but more prominent)
        - Document contrast ratios calculated

    - [ ] **4.1.2 Fix dark mode palette in `palettes/gitlab-pajamas.ts`**
        - Verify `bg_default: "#18171d"` (neutral-950, correct)
        - Verify `bg_muted: "#28272d"` (neutral-900, correct for cards)
        - Change `border_default: "#4c4b51"` → `border_default: "#626168"` (neutral-600, better contrast)
        - Document that GitLab acknowledges partial WCAG compliance

    - [ ] **4.1.3 Add shadow tokens for elevation**
        - Add `shadow_sm`, `shadow_md`, `shadow_lg` per GitLab elevation system
        - Document usage: shadows for elevation, NOT bg_emphasis token
        - Mark as optional enhancement

- [ ] **4.2 Update GitLab Pajamas theme definition file**

    - [ ] **4.2.1 Fix light mode mappings in `definitions/gitlab-pajamas.ts`**
        - Change `card: pLight.bg_muted` → `card: pLight.bg_section` (#ececef)
        - Change `surface-elevated: pLight.bg_emphasis` → `surface-elevated: pLight.bg_default`
        - Change `border: pLight.border_default` → use new neutral-200 or neutral-300 value
        - Add comment: use shadows for elevation, reserve emphasis for highlighting

    - [ ] **4.2.2 Fix dark mode mappings in `definitions/gitlab-pajamas.ts`**
        - Verify `card: pDark.bg_muted` (correct - neutral-900)
        - Change `surface-elevated: pDark.bg_emphasis` → `surface-elevated: pDark.bg_default`
        - Change `border: pDark.border_default` → use new neutral-600 value

    - [ ] **4.2.3 Run quality gates**
        - TypeScript type checking (0 errors)
        - Frontend linting (0 errors)

### **Phase 5:** Component Review & Visual Testing

**Purpose:** Verify that 19 migrated components display correctly with fixed theme definitions.

- [ ] **5.1 Review migrated components for correct token usage**

    **Goal:** Ensure components aren't using tokens that changed semantic meaning.

    - [ ] **5.1.1 Review Phase 4.3 components (7 total)**
        - MovieDetail, MovieCard, MovieCardContainer - Check surface token usage
        - MovieUserScore - Verify on-* token behavior with theme changes
        - MovieCollectionGrid, MovieGrid - Check border visibility
        - PageHeader - Verify accent usage
        - Note any components needing updates

    - [ ] **5.1.2 Review Phase 4.4 components (12 total)**
        - PaginationCtrl, TypographyTest - Check basic token usage
        - AdvancedMovieFilters system (5) - Check panel backgrounds, borders
        - LetterboxdStyleFilters system (5) - Check panel backgrounds, borders
        - Note any components needing updates

    - [ ] **5.1.3 Fix any broken component token references**
        - Update components if theme changes broke token mappings
        - Document changes in this task list
        - Run component-level quality gates

- [ ] **5.2 Visual testing across all theme combinations**

    **Goal:** Test all 6 combinations (3 themes × 2 modes) for visual correctness.

    - [ ] **5.2.1 Test GitHub Primer theme (light + dark)**
        - Verify cards visually distinct from background (light mode)
        - Verify surface-elevated no longer blue (light mode)
        - Verify borders visible on all surfaces
        - Navigate through Featured, Detail, Filter pages with migrated components
        - Document any visual issues

    - [ ] **5.2.2 Test IBM Carbon theme (light + dark)**
        - Verify borders visible on elevated surfaces (dark mode)
        - Verify layer hierarchy clear (background → layer-01 → layer-02)
        - Navigate through same pages
        - Document any visual issues

    - [ ] **5.2.3 Test GitLab Pajamas theme (light + dark)**
        - Verify cards visually distinct from background (light mode)
        - Verify borders have better contrast
        - Navigate through same pages
        - Document any visual issues

- [ ] **5.3 Document findings and create follow-up work if needed**

    - [ ] **5.3.1 Document all visual issues found**
        - Create list of any remaining problems
        - Classify by severity (blocking vs enhancement)
        - Add to notes file

    - [ ] **5.3.2 Create follow-up task list if needed**
        - Only if blocking issues found that can't be fixed in this task list
        - Otherwise defer enhancements to Phase 4.6 of main work

### **Phase 6:** Quality Gates & Documentation

- [ ] **6.1 Run full quality gates**

    - [ ] **6.1.1 Run all linting and type checks**
        - Frontend linting: 0 errors required
        - TypeScript type checking: 0 errors required
        - Markdown linting on updated notes: 0 errors required

    - [ ] **6.1.2 Verify no regressions in existing tests**
        - Run frontend test suite (all tests should pass)
        - No backend changes expected, but run tests to be safe

- [ ] **6.2 Update documentation**

    - [ ] **6.2.1 Update notes file with completion summary**
        - Append results section to Phase 4.4.4 research section
        - Document all changes made
        - Document any remaining known issues

    - [ ] **6.2.2 Add completion notes to this task list**
        - Summary of accomplishments
        - Files changed count
        - Any follow-up work created
        - Next steps (resume Watchlist conversion)

---

## Notes & Implementation Details

**Research Source:** External research agents (GitHub Primer, IBM Carbon, GitLab Pajamas) - 2025-11-03

**Key Research Documents:**

- `.arc/active/incidental/research-github-primer.md` - Official Primer token mappings
- `.arc/active/incidental/research-ibm-carbon.md` - Carbon v11 layer system
- Notes file Phase 4.4.4 section - Comprehensive findings (lines 2914+)

**Design System Versions:**

- GitHub Primer: @primer/primitives v8.x
- IBM Carbon: @carbon/themes v11.0.0
- GitLab Pajamas: Latest design.gitlab.com documentation

**Estimated Effort:** 8-12 hours across 1-2 focused sessions
