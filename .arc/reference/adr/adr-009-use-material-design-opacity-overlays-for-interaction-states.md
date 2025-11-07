# ADR-009: Use Material Design Opacity Overlays for Interaction States

## Status

Accepted

## Context

CineXplorer implements a unified theme system supporting three design systems (IBM Carbon, GitHub Primer, GitLab Pajamas)
across light and dark modes. During Phase 3.5.4 interaction state validation, we discovered critical issues with our
interaction state token implementation (`layer-hover-01`, `layer-selected-01`, `layer-active-01`).

### Current Implementation Issues

**Problem 1: Implementation contradicts documentation**

Our implementation used `adjustColor()` (8%/12%/16% lightening/darkening), but `strategy-semantic-tokens.md`
(lines 652-669) documented Material Design 3's opacity overlay approach. This inconsistency created confusion
and wasn't actually following either approach correctly.

**Problem 2: "Next Layer Up" approach breaks with alternating pattern**

Initially considered using Carbon's architectural pattern where hover elevates surfaces to the next layer
(layer-01 → layer-02 on hover). However, ADR-008's adoption of alternating layers for light mode creates a fatal flaw:

```
IBM Carbon Light Mode:
layer-01:    #f4f4f4 (gray)
layer-02:    #ffffff (white) ← alternates back
layer-03:    #f4f4f4 (gray) ← alternates back AGAIN

Surface on layer-01:
- Hover → layer-02 (white) ✅ distinct
- Selected → layer-03 (gray) ❌ IDENTICAL TO BACKGROUND!
```

This would make selected states invisible on layer-01 surfaces (sidebar items, list items, cards).

**Problem 3: No extractable pattern from design systems**

External research analysis (via external-research-analyst agent, 2025-11-07) revealed wildly divergent
interaction state approaches:

**IBM Carbon:**

- Hover: "Half-step" colors (~5% light, ~6% dark)
- Active: "Two full steps" (~varies)
- Method: Dedicated tokens between palette steps

**GitLab Pajamas:**

- Hover: "1 step darker" (~21% light, ~94% dark!)
- Active: "2 steps darker"
- Method: Direct palette progression

**GitHub Primer:**

- No universal pattern - component-specific tokens
- Each component has explicit hover/active values
- Cannot extract consistent ratio or percentage

**Magnitude differences:** 18x variance (5% vs 94%) across systems makes per-theme official tokens impractical for
consistent UX.

### A/B Testing Results

Visual testing on ThemeDebug page across all 6 theme combinations (IBM Carbon × light/dark as primary validation) showed:

**Surface Test (Cards/List Items):**

- Current (adjustColor 8%): Inconsistent feel across themes
- "Next Layer Up": Broken in light mode (selected = background)
- Material Opacity Overlay (8%/12%): Consistent, clear distinction ✅

**Component Test (Buttons/Fields):**

- Current (adjustColor 8%): Too aggressive for Carbon (~2.3% more than official)
- Material Opacity Overlay (8%/12%): Close to Carbon official (~2.3% deviation), universal ✅

**Key finding:** Material Design opacity overlay provides adequate contrast in all 6 combinations while maintaining
consistent feel.

### Alternatives Considered

**Option A: Per-theme official tokens**

- Use Carbon's 5%, Pajamas' 94%, Primer's component-specific values
- **Pros:** Most accurate to each design system
- **Cons:** Drastically different feels (5% subtle vs 94% dramatic), high maintenance
- **Verdict:** Rejected - UX consistency more valuable than design system purity

**Option B: "Next Layer Up" for surfaces + Material overlay for components**

- Surface hover → next layer color
- Component hover → opacity overlay
- **Pros:** Aligns with Carbon's architectural elevation concept
- **Cons:** Broken by alternating pattern (selected state = background), complex mental model
- **Verdict:** Rejected - architectural elegance doesn't justify broken interactions

**Option C: Material Design 3 opacity overlay (universal) ✅**

- All interaction states use foreground color at 8%/12% opacity
- **Pros:** Consistent across themes, works with alternating pattern, simple mental model, future-proof
- **Cons:** Minor deviation from official systems (~2-3% for Carbon)
- **Verdict:** Accepted - pragmatic balance of consistency and accuracy

## Decision

We will implement all interaction state tokens (`layer-hover-01/02`, `layer-selected-01/02`, `layer-active-01/02`) using
Material Design 3's opacity overlay approach:

**Hover state:** 8% foreground opacity overlay on base layer
**Selected/Active state:** 12% foreground opacity overlay on base layer

**Implementation method:**

- Update `deriveInteractionStates()` utility in `frontend/src/theme/color/utils.ts`
- Calculate tokens as: `base layer color` + `foreground color @ opacity`
- Apply uniformly across all three theme adapters (Carbon, Primer, Pajamas)
- No surface vs component distinction - single universal approach

**Rationale:**

1. Consistent UX across all themes (not slavishly beholden to design systems, but not drastically misrepresenting)
2. Works correctly with ADR-008's alternating layer pattern
3. Adequate visual distinction in all 6 theme combinations (verified via A/B testing)
4. Simple mental model (one rule for everything)
5. Future-proof for additional themes

## Consequences

### Positive

**Consistency across themes:**

- All themes feel similar in interaction responsiveness
- Users switching themes experience familiar interaction patterns
- Reduces cognitive load for multi-theme users

**Architectural simplicity:**

- Single calculation method for all interaction states
- No special cases or per-theme logic
- Easy to understand and maintain

**Works with alternating pattern:**

- No conflicts with ADR-008's light mode alternating layers
- Selected states remain distinct from background
- No artificial limitations on where tokens can be used

**Future-proof:**

- Adding new themes requires no interaction state research
- Opacity overlay auto-adapts to any color scheme
- Scales to 4th, 5th, nth theme without code changes

**Close to Carbon official:**

- Light mode: ~2.3% more darkening than Carbon's 5% (barely noticeable)
- Dark mode: ~1.4% more lightening than Carbon's 6% (imperceptible)
- Closer than our previous 8% `adjustColor` implementation

### Negative

**Minor deviation from design systems:**

- Not using official interaction state tokens where they exist
- Carbon: 5-6% official vs 8% ours (~2-3% difference)
- Pajamas: Doesn't follow their "step darker" documentation (but their magnitudes are too dramatic)
- Primer: Doesn't use component-specific tokens (but no extractable pattern anyway)

**Opacity overlay complexity:**

- Slightly more complex CSS (`::before` pseudo-elements or calculated colors)
- May require education for developers unfamiliar with opacity overlay pattern
- Not as simple as direct color token mapping

**Not visually identical to source systems:**

- Users familiar with Carbon may notice subtle hover difference
- Hover feels slightly more pronounced than Carbon light mode
- Trade-off accepted for cross-theme consistency

### Risks

**Accessibility validation needed:**

- Must verify WCAG contrast requirements maintained with opacity overlays
- Test with screen readers and keyboard navigation
- Validate focus indicators remain visible

**Performance considerations:**

- Opacity overlays may have minor rendering performance impact
- Monitor for jank on lower-end devices
- Consider optimization if issues arise

**Design system drift:**

- If Carbon/Primer/Pajamas converge on a standard approach, we may reconsider
- Should periodically re-evaluate (annually or when systems update)
- ADR can be superseded if better pattern emerges

## Related

- **ADR-005:** Unified Theme Adapter Layer (defines interaction state tokens)
- **ADR-006:** Adopt Carbon Layer-Based Elevation Standard (layer system architecture)
- **ADR-008:** Adopt Carbon Light Mode Alternating Pattern (why "next layer up" breaks)
- **strategy-semantic-tokens.md:** Documents opacity overlay approach (now aligned with implementation)
- **External research:** `.arc/active/incidental/research-interaction-state-analysis.md` (2025-11-07)
- **A/B testing:** ThemeDebug page `/theme-debug` (InteractionStateComparison component)

## Implementation Guidance

**Update `frontend/src/theme/color/utils.ts`:**

Replace `deriveInteractionStates()` function to calculate opacity overlays:

```typescript
export function deriveInteractionStates(
    layerColor: string,
    foregroundColor: string,
): {
    hover: string;
    selected: string;
    active: string;
} {
    return {
        hover: blendColors(layerColor, foregroundColor, 0.08),      // 8% fg overlay
        selected: blendColors(layerColor, foregroundColor, 0.12),   // 12% fg overlay
        active: blendColors(layerColor, foregroundColor, 0.12),     // 12% fg overlay
    };
}
```

Where `blendColors()` computes: `(1 - opacity) * layerRGB + opacity * fgRGB`

**Update all three adapters** (`ibm-carbon.ts`, `github-primer.ts`, `gitlab-pajamas.ts`) to pass foreground color to
derivation function.

**Document in strategy-semantic-tokens.md:**

- Update examples to show token usage (not manual overlays)
- Clarify that `layer-hover-01` internally uses opacity calculation
- Remove contradictory examples

---

**Date:** 2025-11-07
**Decision Made By:** Architecture validation during Phase 3.5 Review & Validation
**Validation Method:** External research + A/B visual testing across 6 theme combinations
