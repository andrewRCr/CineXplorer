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
- Select proven palette (Gruvbox or Rose Pine) for initial light/dark implementation
- Convert initial components to semantic tokens:
    - Featured page
    - Navbar
    - Footer (including light/dark mode toggle)
    - Sidebar
- Create/update comprehensive theme showcase page (Chakra UI v3 components + typography)
- Add notes to active frontend task lists about semantic token migration "as we touch" strategy

### Won't Do

- Migrate all components immediately (incremental as we touch them in future work)
- Design custom CineXplorer color palette (deferred to future dedicated UI/UX work)
- Implement multi-theme switching (only light/dark mode)
- Create light mode variant of current colors (won't be used, current colors reference only)

---

## Tasks

### **Phase 1:** Audit and Documentation

**Purpose:** Understand current color usage and preserve reference for future theme decisions.

- [ ] **1.1 Audit color usage in codebase**
    - [ ] **1.1.1 Search for direct color references in components**
        - Find all uses of theme tokens in components
        - Find any hardcoded colors bypassing theme system
        - Document which semantic tokens are actually used
    - [ ] **1.1.2 Identify unused colors**
        - Check each token in `theme/index.ts` for usage
        - Verify gradients are used (suspect they aren't)
        - Create list of used vs unused tokens
    - [ ] **1.1.3 Document findings**
        - Create summary of actual color usage
        - Note any patterns or inconsistencies

- [ ] **1.2 Create reference palette from current colors**
    - Location: `frontend/src/theme/palettes/cinexplorer-original.ts`
    - Include only colors actually in use (no unused gradients)
    - Map hex values to descriptive names
    - Dark mode only (no light mode, for reference purposes only)
    - Add clear documentation: "Reference only - won't be used, preserved for future custom theme work"

### **Phase 2:** Semantic Structure Implementation

**Purpose:** Set up shadcn/ui semantic token structure adapted for Chakra UI v3.

- [ ] **2.1 Create type definitions**
    - Location: `frontend/src/theme/types.ts`
    - Define `ThemeColors` interface (shadcn/ui semantic tokens)
    - Define `Theme` interface (light + dark palettes)
    - Add JSDoc comments explaining each semantic token

- [ ] **2.2 Select and implement initial palette**
    - Use GitHub theme (neutral, professional, proven at scale)
    - Reference: GitHub Primer design system
    - Create palette file: `frontend/src/theme/palettes/github.ts`
    - Create definition file: `frontend/src/theme/definitions/github.ts`
    - Map palette to semantic tokens for light + dark modes

- [ ] **2.3 Update Chakra UI theme configuration**
    - Update `frontend/src/theme/index.ts`
    - Convert to Chakra v3 conditional semantic tokens (`_light`/`_dark`)
    - Test light/dark mode switching works

- [ ] **2.4 Verify theme system works**
    - Run frontend linting and type checking
    - Test in browser (both light and dark modes)
    - Verify no visual regressions

### **Phase 3:** Component Migration (Initial Set)

**Purpose:** Convert Featured, navbar, footer, sidebar to semantic tokens. All other components migrate
incrementally as touched.

- [ ] **3.1 Convert Featured page**
    - Replace any direct color references with semantic tokens
    - Test in light and dark modes

- [ ] **3.2 Convert navbar**
    - Update to semantic tokens
    - Test in light and dark modes

- [ ] **3.3 Convert footer**
    - Update to semantic tokens
    - Add light/dark mode toggle component
    - Test toggle functionality

- [ ] **3.4 Convert sidebar**
    - Update to semantic tokens
    - Test in light and dark modes

- [ ] **3.5 Quality gates for initial migration**
    - Run frontend linting
    - Run TypeScript type checking
    - Visual regression test (compare light/dark modes)

### **Phase 4:** Theme Showcase

**Purpose:** Create comprehensive theme showcase page for verifying theme implementation and future reference.

- [ ] **4.1 Check existing theme showcase**
    - Verify if CineXplorer has existing theme/typography showcase
    - Review arc-portfolio showcase for reference
    - Determine what needs to be created vs updated

- [ ] **4.2 Create/update theme showcase page**
    - Location: `frontend/src/pages/ThemeShowcase.tsx` (or update existing)
    - Showcase all Chakra UI v3 components used in app
    - Typography samples (all heading levels, body text, etc.)
    - Color palette display (semantic tokens)
    - Interactive light/dark mode toggle
    - Organized sections for easy reference

- [ ] **4.3 Add routing and navigation**
    - Add route in App.tsx
    - Add link in footer (alongside light/dark toggle)
    - Update routes constants if needed

- [ ] **4.4 Quality gates for showcase**
    - Frontend linting
    - TypeScript type checking
    - Verify showcase displays correctly in both modes

### **Phase 5:** Documentation and Handoff

**Purpose:** Document migration strategy and prepare for incremental completion.

- [ ] **5.1 Update active task lists with component migration notes**
    - Search for all active frontend tasks in `.arc/active/`
    - Identify parent tasks that involve touching UI components
    - Add note to component-related parent tasks only
    - Note format: "When touching components, migrate to semantic tokens per tasks-theme-system-modernization.md"

- [ ] **5.2 Update project documentation**
    - [ ] **5.2.1 Update AGENTS.md**
        - Add reference to semantic token system in use (brief, one-line mention in tech stack or critical path)
        - No in-depth documentation (that lives elsewhere)
    - [ ] **5.2.2 Update DEVELOPMENT-RULES.md**
        - Add rule about always using existing semantic token system
        - Emphasize consistent theme styling via semantic tokens
        - No direct color/style values in components
    - [ ] **5.2.3 Update TECHNICAL-OVERVIEW.md**
        - Add overview-level documentation of theme system structure
        - Mention semantic token convention (shadcn/ui adapted for Chakra UI v3)
        - Reference strategy docs for in-depth documentation
        - Keep it high-level (details belong in docstrings and strategy docs)
    - [ ] **5.2.4 Update PROJECT-STATUS.md**
        - Document state of theme migration
        - Track which components migrated vs remaining
        - Note incremental migration strategy

- [ ] **5.3 Create theme strategy documentation**
    - [ ] **5.3.1 Adapt strategy-style-guide.md from arc-portfolio**
        - Copy from `/home/andrew/dev/arc-portfolio/.arc/reference/strategies/strategy-style-guide.md`
        - Adapt for CineXplorer context
        - Keep as placeholder documenting evolving styling decisions
        - Note: Final styling decisions are future work (post-technical tasks)
    - [ ] **5.3.2 Adapt strategy-visual-design-principles.md from arc-portfolio**
        - Copy from `/home/andrew/dev/arc-portfolio/.arc/reference/strategies/strategy-visual-design-principles.md`
        - Adapt for CineXplorer context
        - General design principles (not CineXplorer-specific yet)
    - [ ] **5.3.3 Reference strategy docs from other documentation**
        - Update references in docs from 5.2 where appropriate
        - Ensure no overlap between docs (each doc has clear scope)

- [ ] **5.4 Run final quality gates**
    - Backend tests (ensure no breakage)
    - Frontend tests
    - Frontend linting
    - TypeScript checking
    - Markdown linting on all updated .arc docs

---

## Implementation Notes

*(Add notes here as work proceeds)*
