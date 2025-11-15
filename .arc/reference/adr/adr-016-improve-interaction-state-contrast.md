# ADR-016: Improve Interaction State Contrast from Material Design 3 Defaults

## Status

Accepted (Partially supersedes ADR-009)

## Context

ADR-009 established Material Design 3's opacity overlay approach (8% hover, 12% active) for all interaction state tokens
across CineXplorer's unified theme system. This provided consistency across themes and compatibility with the alternating
layer pattern (ADR-008).

However, during `tasks-chakra-recipe-system-implementation.md`Phase 6.1 button pattern consolidation (2025-01-15),
comprehensive visual testing across all theme/mode combinations revealed that Material Design 3's default percentages
were **too subtle** for reliable visual feedback:

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

- **Option A: Keep MD3 defaults (8%/12%)** - Maintains adherence to MD3 spec
    - ❌ Too subtle across multiple theme combinations
    - ❌ User testing showed missed hover states

- **Option B: Per-theme percentages** - Customize per design system
    - ❌ Breaks cross-theme consistency (core goal of ADR-009)
    - ❌ High maintenance burden

- **Option C: Improve globally to 12%/16%** ✅ (Chosen)
    - ✅ Noticeable improvement in visibility across all themes
    - ✅ Maintains consistency (single rule for all)
    - ✅ Still uses opacity overlay approach (ADR-009 core principle)
    - ✅ Modest increase (50% more contrast) - not dramatic

## Decision

We will **improve interaction state overlay percentages** from Material Design 3's defaults (8%/12%) to (12%/16%) for
better contrast and visibility across all theme combinations.

**Updated implementation in `deriveInteractionStates()`:**

```typescript
return {
    hover: blendColors(layerColor, foregroundColor, 0.12),   // 12% (was 8%)
    selected: blendColors(layerColor, foregroundColor, 0.12), // 12% (unchanged)
    active: blendColors(layerColor, foregroundColor, 0.16),   // 16% (was 12%)
};
```

**Affected tokens (all themes):**

- `primary-hover` / `primary-active` - Solid buttons
- `secondary-hover` / `secondary-active` - Subtle buttons
- `layer-hover-01`, `layer-hover-02` - Interactive surfaces
- `layer-active-01`, `layer-active-02` - Active/pressed surfaces

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

- No longer using MD3's official 8%/12% standards
- Technically a "fork" of the MD3 interaction approach
- May confuse developers familiar with MD3 documentation

**Slightly stronger contrast:**

- 50% increase (8% → 12%) may feel more pronounced than some themes' official values
- IBM Carbon light uses 5% officially - we're now 7% higher
- Trade-off accepted for cross-theme consistency

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

**Date:** 2025-01-15
**Decision Made By:** Phase 6.1 Button Pattern Consolidation
**Validation Method:** Visual A/B testing across 8 theme/mode combinations
