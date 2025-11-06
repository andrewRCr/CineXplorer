# ADR-006: Adopt Carbon Layer-Based Elevation as Cross-Theme Standard

## Status

Accepted

**Note:** Light mode layer derivation strategy partially superseded by ADR-008 (adopts Carbon's official alternating pattern). Core decision (Carbon as architectural standard) remains in force.

## Context

CineXplorer supports multiple design system themes (GitHub Primer, IBM Carbon, GitLab Pajamas), each with different
elevation philosophies:

**Official Design System Approaches:**

- **GitHub Primer:** Shadow-based elevation (flat colors + varying shadows)
- **GitLab Pajamas:** Hybrid approach (semantic section colors + shadows)
- **IBM Carbon:** Layer-based elevation (distinct background colors per elevation level)

**Problem:**
The unified theme adapter layer requires a consistent elevation model across all themes. Components should use simple,
semantic token names without theme-specific logic.

**Architectural Tension:**

We faced a fundamental choice between three approaches:

### Option 1: Pure Layer System (Carbon-Inspired)

All themes derive distinct layer colors (background → layer-01 → layer-02 → layer-03),
even if the official design system uses shadows.

**Pros:**

- Simple component code: `bg="layer-02"` (single prop)
- Consistent behavior across all themes
- Semantic clarity (layer number = elevation level)

**Cons:**

- Deviates from Primer/Pajamas official shadow-based approaches
- Themes appear less "authentic" to design system purists
- Must derive unofficial layer colors

### Option 2: Hybrid (Layers + Shadows)

Respect each design system's official approach. Primer/Pajamas use shadows, Carbon uses layers.
Components must specify BOTH layer AND shadow.

**Pros:**

- Maximum fidelity to official design systems
- Themes appear most "authentic"

**Cons:**

- **Complex component code:**

  ```tsx
  // Components must coordinate two props
  <Box bg="layer-02" boxShadow="shadow-md">
  ```

- **Error-prone:** Forgetting shadow makes elevation invisible
- **Theme-aware logic required** in components (defeats unified adapter purpose)

### Option 3: Theme-Specific Strategies

Components detect theme and conditionally apply elevation strategy (layers for Carbon, shadows for Primer/Pajamas).

**Pros:**

- Perfect fidelity per theme

**Cons:**

- **Extremely complex** component code
- **Maintenance nightmare** (every component needs theme context)
- **Defeats purpose of unified adapter** (no abstraction)

---

### Design System Research: Official Token Coverage

**GitHub Primer:**

- Provides: `bg_default`, `bg_muted` (2 distinct backgrounds)
- Missing: No equivalent to layer-02/layer-03
- Official strategy: Use `bg_default` + shadows for modals/popovers

**GitLab Pajamas:**

- Provides: `bg_default`, `bg_section` (2 distinct backgrounds)
- Missing: `bg_elevated` = `bg_default` (same color!)
- Official strategy: Use shadows for elevation

**IBM Carbon:**

- Provides: `background`, `layer-01`, `layer-02`, `layer-03` (4 distinct tokens)
- Light mode caveat: Officially alternates white/gray (bg=layer-02=#fff, layer-01=layer-03=#f4f4f4)
- Dark mode: Perfect progression (#161616 → #262626 → #393939 → #525252)

**Key Finding:** Only Carbon provides 4 distinct elevation levels via color. Primer/Pajamas rely on shadows, which
requires coordination between background + shadow props in components.

---

### CineXplorer Project Context

**Primary Goal:** Full-stack portfolio project demonstrating architecture, API design, testing, and DevOps skills.

**Visual Design Priority:** Professional polish, not design system museum piece.

**Multi-theme Purpose:**

1. Exploration during development (test different aesthetics)
2. Optional user-facing feature (already built, low marginal cost)
3. Eventually: Custom CineXplorer theme as default

**Key Insight:** Preserving perfect Primer/Pajamas shadow fidelity provides no value for this project's goals.
Component simplicity and maintainability matter more than design system purity.

---

## Decision

We will **adopt IBM Carbon's layer-based elevation philosophy as the architectural standard** for
CineXplorer's unified theme system.

**Specific Implementation:**

1. **All themes derive 4 distinct layer colors:**
   - `background` (page canvas, lowest)
   - `layer-01` (cards, panels, first elevation)
   - `layer-02` (modals, dialogs, second elevation)
   - `layer-03` (dropdowns over modals, highest elevation)

2. **Derivation strategy:**
   - **IBM Carbon Dark:** Use official tokens (already perfect)
   - **IBM Carbon Light:** Derive progressive darkening (avoid alternating pattern)
   - **GitHub Primer:** Derive from `bg_muted` with visible adjustments
   - **GitLab Pajamas:** Derive from `bg_section` with visible adjustments

3. **Shadow tokens remain available:**
   - Adapters provide `shadow-sm`, `shadow-md`, `shadow-lg` from official design systems
   - Components MAY use shadows as optional styling enhancement
   - Shadows are NOT required for elevation visibility (layers handle that)

4. **Component implementation:**

   ```tsx
   // STANDARD (all themes):
   <Box bg="layer-02">Modal content</Box>

   // ENHANCED (optional):
   <Box bg="layer-02" boxShadow="shadow-md">Modal with shadow</Box>
   ```

5. **Documentation clarity:**
   - Adapter file headers document "CineXplorer uses Carbon-inspired layer system"
   - Comments mark derived tokens with "DERIVED" (not "CORRECTED")
   - Trade-off explicitly stated: "Simple component code + consistency > design system purity"

---

## Consequences

### Positive

**Simplified Component Code:**

- Single prop: `bg="layer-02"` (clear, semantic)
- No coordination needed between layer + shadow
- No theme-awareness required in components

**Consistent Cross-Theme Behavior:**

- All themes behave identically from component perspective
- Elevation levels have semantic meaning (layer-01 = first elevation)
- Developers don't need to learn theme-specific patterns

**Maintainable Architecture:**

- Unified adapter layer lives up to its name (actual abstraction)
- Easy to add new themes (follow layer derivation pattern)
- Component complexity stays low (no conditional theme logic)

**Clear Semantic Intent:**

- `layer-01`, `layer-02`, `layer-03` self-document elevation hierarchy
- Code review: Elevation levels obvious from token names
- New developers: Semantic layer system easier to understand than shadow coordination

### Negative

**Design System Purity:**

- Deviates from GitHub Primer's official shadow-only approach
- Deviates from GitLab Pajamas' official shadow-based elevation
- Themes appear less "authentic" to design system experts

**Color Derivation Required:**

- Must derive layer-02/layer-03 colors for Primer/Pajamas (unofficial)
- Risk: Derivation logic could create insufficient contrast if tuned incorrectly
- Maintenance: Design system updates may not align with derived colors

**Theme Aesthetics:**

- Primer/Pajamas designed for flat colors + shadows
- Forcing color-based layers may not match original design intent
- Subtle aesthetic differences from official design system examples

### Risks

**Layer Contrast Insufficient (Light Modes):**

- **Monitoring:** Visual testing in ThemeDebug across all 6 theme/mode combinations
- **Mitigation:** Adjust derivation percentages until layers visually distinct
- **Status:** Known issue as of 2025-11-06 - light modes need tuning (documented in notes file)

**Design System Updates:**

- **Risk:** Official Primer/Pajamas add layer tokens in future versions
- **Mitigation:** Can migrate to official tokens if/when available
- **Low probability:** Design systems stable, layer additions unlikely

**User Confusion:**

- **Risk:** Users familiar with Primer expect shadows, see color changes instead
- **Mitigation:** Document deviation in adapter files
- **Low impact:** CineXplorer users won't compare to official Primer/Pajamas sites

---

## Alternatives Considered

**Alternative 1: Hybrid System (Layers + Required Shadows)**

Use layers for semantic meaning, but require shadows for visual elevation in Primer/Pajamas themes.

**Rejected because:**

- Adds component complexity (two props instead of one)
- Error-prone (forgetting shadow makes elevation invisible)
- Defeats purpose of semantic abstraction

**Alternative 2: Theme-Specific Component Logic**

Components detect theme and apply appropriate elevation strategy.

**Rejected because:**

- Extremely complex component code
- Every component needs theme context
- Maintenance nightmare
- Defeats purpose of unified adapter (no abstraction gained)

**Alternative 3: Preserve Official Approaches Per Theme**

Don't create unified layer system - let each theme use its official patterns.

**Rejected because:**

- Components become theme-aware (high coupling)
- Inconsistent behavior across themes
- Doesn't leverage unified adapter architecture

---

## Related Decisions

**ADR-005:** Unified Theme Adapter Layer

- Established the adapter pattern
- Defined ~47 token unified vocabulary
- Provided architecture for this decision

**Future ADR:** CineXplorer Custom Theme

- Will serve as long-term default theme
- Can use Carbon layer system natively (no derivation needed)
- Frees project from design system fidelity constraints

---

## References

**Design System Documentation:**

- GitHub Primer Color Foundations: <https://primer.style/design/foundations/color>
- IBM Carbon Color Usage: <https://carbondesignsystem.com/elements/color/usage/>
- GitLab Pajamas Elevation: <https://design.gitlab.com/product-foundations/elevation/>

**Implementation Files:**

- `frontend/src/theme/adapter/mappings/github-primer.ts`
- `frontend/src/theme/adapter/mappings/ibm-carbon.ts`
- `frontend/src/theme/adapter/mappings/gitlab-pajamas.ts`

**Testing:**

- ThemeDebug page: `/theme-debug` (Layer System section)

**Related Documentation:**

- `.arc/active/incidental/notes-theme-definition-semantic-corrections.md` - Implementation details
- `.arc/active/incidental/tasks-theme-definition-semantic-corrections.md` - Phase 3 component migration

---

## Implementation Status

**Date Accepted:** 2025-11-06
**Implemented:** Phase 2-3 (adapter layer + component migration)
**Status:** Known issue with light mode layer contrast (documented, remediation planned)

**Quality Gates:**

- ✅ TypeScript: 0 errors
- ✅ Frontend Linting: 0 warnings
- ✅ Frontend Tests: 82/82 passing

**Visual Validation:**

- ✅ Dark modes: All themes working correctly
- ⚠️ Light modes: Layer contrast insufficient (tuning needed)

---

## Decision Record

**Decided by:** Andrew (project maintainer) + Claude (architectural analysis)
**Date:** 2025-11-06
**Context:** Phase 3 component migration visual review
**Scope:** All theme implementations (GitHub Primer, IBM Carbon, GitLab Pajamas)
