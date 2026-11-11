# ADR-008: Adopt Carbon Light Mode Alternating Layer Pattern

## Status

Accepted; Superseded in part by ADR-041 (Marquee light-layer tone order)

Partially supersedes ADR-006 (specific to light mode layer derivation strategy).

## Context

ADR-006 established IBM Carbon's layer-based elevation philosophy as the architectural standard across all themes.
However, line 138 of ADR-006 specified: "IBM Carbon Light: Derive progressive darkening (avoid alternating pattern)."

**Carbon's Official Light Mode Pattern:**

Carbon Light officially alternates layers:

- `background`: `#ffffff` (white)
- `layer-01`: `#f4f4f4` (gray-10)
- `layer-02`: `#ffffff` (white - alternates back!)
- `layer-03`: `#f4f4f4` (gray-10 - alternates again!)

**Why Carbon Alternates in Light Mode:**

Research reveals Carbon's alternating pattern addresses real challenges:

1. Progressive darkening on white backgrounds quickly becomes indistinguishable (15% adjustments insufficient)
2. Alternating creates clear visual "nesting" - you can see when elements are "inside" others
3. Avoids muddy mid-grays that are hard to distinguish from each other
4. Carbon Dark uses progressive lightening successfully, but the physics differ (dark colors show distinction more readily
at lower percentages)

**Initial Naive Approach:**

ADR-006 attempted to force universal progressive darkening across both modes to simplify adapter logic. Testing revealed
this doesn't work - light mode progressive derivation fails visual hierarchy requirements (GitHub Primer Light and
GitLab Pajamas Light layers became indistinguishable).

**Architectural Principle:**

If Carbon is our architectural blueprint (ADR-006), we should adopt **the entire pattern**, not just the token count.
Carbon's design team chose alternating for light mode based on extensive accessibility and usability research.

## Decision

We will **adopt Carbon's light mode alternating layer pattern** as the standard for all themes.

**Specific Implementation:**

**Dark Mode (No Change):**

- All themes continue using progressive lightening
- Carbon: Official tokens
- Primer/Pajamas: Derived progressive (7% adjustments)

**Light Mode (Changed):**

- **IBM Carbon:** Use official alternating tokens (stop deriving)
- **GitHub Primer:** Derive alternating pattern:
    - `background`: `bg_default` (white)
    - `layer-01`: `bg_muted` (gray - official)
    - `layer-02`: `bg_default` (back to white)
    - `layer-03`: `bg_muted` (back to gray)
- **GitLab Pajamas:** Derive alternating pattern:
    - `background`: `bg_default` (white)
    - `layer-01`: `bg_section` (gray - official)
    - `layer-02`: `bg_default` (back to white)
    - `layer-03`: `bg_section` (back to gray)

**Re-evaluation Trigger:**

This decision may be re-examined once more frontend application components are complete and real-world usage patterns
emerge. If practical issues arise (e.g., specific component contexts where alternating fails), we'll document those
cases and potentially adjust.

## Consequences

### Positive

- **Philosophically consistent** with Carbon as architectural blueprint (adopt pattern, not just token names)
- **Respects design system rationale** - Carbon's team chose alternating for accessibility reasons
- **Simpler implementation** - Carbon Light uses official tokens (no derivation needed)
- **Clear visual hierarchy** - alternating provides distinct nesting indication
- **Proven approach** - Carbon's pattern is battle-tested in production systems

### Negative

- **Potential component challenges** - Some component contexts (sticky headers, modals) may need careful layer selection
to avoid white-on-white in light mode
- **Deviates from ADR-006's initial simplicity** - different strategies for light vs dark mode adds slight conceptual complexity
- **Border hierarchy becomes critical** - Strong borders (`border-strong-01/02/03`) essential for distinguishing
white-on-white boundaries

### Risks

- **Unknown component use cases** - With limited frontend components built, we may discover scenarios where alternating
creates problems
- **Mitigation:** Decision explicitly flagged for re-evaluation once more components exist
- **Monitoring:** Track any white-on-white issues that arise during component development

---

**Related:** ADR-006 (establishes Carbon as architectural standard), ADR-005 (unified theme adapter layer)
