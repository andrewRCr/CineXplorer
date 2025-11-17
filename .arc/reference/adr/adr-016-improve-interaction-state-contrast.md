# ADR-016: Improve Interaction State Contrast from Material Design 3 Defaults

## Status

Accepted (Partially supersedes ADR-009)

## Context

ADR-009 established Material Design 3's opacity overlay approach for all interaction state tokens across CineXplorer's
unified theme system. However, our initial understanding simplified MD3's interaction states to three values (hover 8%,
selected/active 12%). Material Design 3 actually defines **four distinct overlay states**:

**MD3 State Overlay Values:**

- **Hover**: 8% (transient exploration)
- **Focus**: 10% (persistent selection)
- **Press**: 10% (momentary activation)
- **Drag**: 16% (active drag operation)

**Our terminology mapping:**

- `layer-hover-*` ≈ MD3 Hover
- `layer-selected-*` ≈ MD3 Focus
- `layer-active-*` ≈ MD3 Press
- `drag-active` ≈ MD3 Drag (token exists but dedicated overlay value TBD)

During Phase 6.1 button pattern consolidation (2025-01-15), comprehensive visual testing across all theme/mode
combinations revealed that Material Design 3's default percentages were **too subtle** for reliable visual feedback in
our multi-theme context:

**Visual testing findings:**

- **Solid primary buttons**: 8% hover barely noticeable in several theme combinations (GitHub light, GitLab dark)
- **Subtle buttons**: Secondary-hover (8%) insufficient contrast for embedded controls
- **Interactive surfaces**: Layer-hover states too faint for clear affordance

**A/B testing comparison:**

Tested side-by-side with improved percentages across 8 theme/mode combinations (4 themes × 2 modes):

- **8% hover vs 12% hover**: 12% noticeably more visible without being aggressive
- **12% active vs 16% active**: 16% provides clearer pressed state feedback
- **Contrast validation**: All combinations maintained WCAG AA compliance

**Root cause:**

Material Design 3's 8%/12% defaults are optimized for Material's specific color palette and elevation system. Our
unified theme adapter supports four distinct design systems (IBM Carbon, GitHub Primer, GitLab Pajamas, Material Design)
with varying base colors and contrast profiles. The MD3 defaults work adequately but aren't optimal across this diversity.

**Alternatives considered:**

- **Option A: Keep MD3 defaults (8%/10%/10%)** - Maintains adherence to MD3 spec
    - ❌ Too subtle across multiple theme combinations
    - ❌ User testing showed missed hover states

- **Option B: Per-theme percentages** - Customize per design system
    - ❌ Breaks cross-theme consistency (core goal of ADR-009)
    - ❌ High maintenance burden

- **Option C: Improve globally with +4% across the board** ✅ (Chosen)
    - ✅ Noticeable improvement in visibility across all themes
    - ✅ Maintains consistency (single rule for all)
    - ✅ Still uses opacity overlay approach (ADR-009 core principle)
    - ✅ Modest uniform increase - not dramatic
    - MD3: hover 8%, focus/press 10% → Ours: hover 12%, selected/active 16%

## Decision

We will **improve interaction state overlay percentages** from Material Design 3's defaults by adding +4% across the board
for solid surfaces (layers, solid buttons, subtle buttons):

**MD3 Baseline → CineXplorer Improved:**

- Hover: 8% → **12%** (+4%)
- Focus/Selected: 10% → **16%** (+6%, aligning with active)
- Press/Active: 10% → **16%** (+6%, aligning with selected)
- Drag: 16% → **20%** (+4%, future/TBD when implementing drag-drop)

**Rationale for selected = active (both 16%):**
Material Design 3 treats focus and press identically (both 10%). We maintain this semantic equivalence - selected/focused
items and actively pressed items share the same emphasis level, both stronger than transient hover. This creates proper
hierarchy: hover (12%) < selected/active (16%).

**Updated implementation in `deriveInteractionStates()`:**

```typescript
return {
    hover: blendColors(layerColor, foregroundColor, 0.12),    // 12% (was 8%)
    selected: blendColors(layerColor, foregroundColor, 0.16), // 16% (was 12%)
    active: blendColors(layerColor, foregroundColor, 0.16),   // 16% (was 12%)
};
```

**Drag state (future):**
The `drag-active` token exists but currently uses `secondaryHover` mapping. When implementing real drag-drop functionality,
we may create a dedicated drag overlay at 20% (MD3's 16% + 4%) if empirical testing shows benefit over reusing 16% active.

**Scope: Solid surfaces only**

These improved values apply **only to solid surfaces** (layers and filled buttons):

- `layer-hover-01/02`, `layer-selected-01/02`, `layer-active-01/02` - Interactive surfaces (12%/16%/16%)
- `primary-hover`, `primary-active` - Solid buttons (12%/16%)
- `secondary-hover`, `secondary-active` - Subtle buttons (12%/16%)

**Baseline surfaces** (outline/ghost/secondary buttons using manual overlays) continue using MD3's original 8%/12%
for lighter interaction feedback appropriate to their lower visual weight.

**Core principles from ADR-009 maintained:**

✅ Opacity overlay approach (not color stepping)
✅ Universal calculation across all themes
✅ Foreground color at opacity on base layer
✅ Works with alternating pattern (ADR-008)

**What changed:**

- Percentages improved based on empirical testing
- Material Design 3 treated as starting point, not gospel

**What didn't change:**

- Opacity overlay methodology
- Cross-theme consistency
- Single universal rule
- Architectural simplicity

## Consequences

### Positive

**Better visual feedback:**

- Hover states clearly visible across all 8 theme/mode combinations
- Active/pressed states provide stronger tactile feedback
- Reduced user confusion about interactive elements

**Maintains ADR-009 benefits:**

- Cross-theme consistency preserved
- Opacity overlay approach unchanged
- Architectural simplicity maintained
- Future-proof for new themes

**Empirically validated:**

- Tested across full theme matrix (not theoretical)
- A/B comparison showed clear improvement
- WCAG AA compliance verified

**Cleaner implementation:**

- Button recipes now use semantic tokens directly (`primary-hover`)
- No inline color-mix overrides needed
- Token names accurately reflect their values

### Negative

**Deviates from Material Design 3 spec:**

- No longer using MD3's official 8%/10%/10%/16% standards
- Technically a "fork" of the MD3 interaction approach (uniformly +4% higher)
- May confuse developers familiar with MD3 documentation

**Slightly stronger contrast:**

- Hover increased 50% (8% → 12%) for better visibility
- Selected/active increased 60% (10% → 16%) to differentiate from hover
- IBM Carbon light uses 5% officially - we're now 7-11% higher
- Trade-off accepted for cross-theme consistency and clearer interaction hierarchy

### Risks

**Design system drift monitoring:**

- Should re-evaluate if Material Design updates their standards
- Periodic testing (annually) recommended as themes evolve
- Could revert to 8%/12% if future themes require it

**Accessibility validation:**

- Must maintain WCAG contrast requirements (currently compliant)
- Monitor any accessibility reports related to hover states

## Related

- **ADR-009**: Use Material Design Opacity Overlays for Interaction States (partially superseded)
    - Core methodology preserved (opacity overlays)
    - Specific percentages improved (8%/12% → 12%/16%)

- **ADR-008**: Adopt Carbon Light Mode Alternating Pattern
    - Interaction states still compatible with alternating layers

- **ADR-012**: Separate Button Pattern Semantics
    - Button recipes now use improved interaction tokens directly

- **Phase 6.1**: Button Pattern Consolidation
    - Task list: `tasks-chakra-recipe-system-implementation.md` (line 764+)
    - Empirical testing and decision documented

---

**Date:** 2025-01-15 (Updated 2025-11-17: Clarified MD3 4-state system, corrected selected from 12% to 16%)
**Decision Made By:** Phase 6.1 Button Pattern Consolidation
**Validation Method:** Visual A/B testing across 8 theme/mode combinations
