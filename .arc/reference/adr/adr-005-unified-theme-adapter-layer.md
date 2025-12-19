# ADR-005: Implement Unified Theme Adapter Layer with Consistent Cross-Theme Vocabulary

## Status

Accepted

## Context

CineXplorer's theme system currently uses design system-specific definitions files that act as adapters between
official design system tokens (GitHub Primer, IBM Carbon, GitLab Pajamas) and Chakra UI semantic tokens. While
functional, this approach creates inconsistencies and missed opportunities for richer UI vocabulary.

### Background from Previous ADRs

**ADR-003** extended our semantic token system from 20 to 33 tokens, adding status pairs, rating tokens,
surface-elevated, badges, and drag-and-drop states.

**ADR-004** established provider-based system recreation for multi-theme switching, using separate palette files
(official design system tokens) and definitions files (Chakra UI mappings).

### Problem Discovery

During Task 4.4.4 of theme system modernization (AdvancedMovieFilters testing), we discovered critical semantic
token misuse across all three themes:

**GitHub Primer Issues:**

- Light mode: cards indistinguishable from background (both `#ffffff`)
- `surface-elevated` misused accent token (`#ddf4ff` blue) instead of bgColor-default

**IBM Carbon Issues:**

- Dark mode: borders invisible (`#393939` on `#393939` surfaces)
- Missing `layer-03` for highest elevation (dropdowns over modals)

**GitLab Pajamas Issues:**

- Light mode: insufficient card differentiation (1.02:1 contrast ratio)
- Border contrast failures across both modes (1.17:1 vs required 3:1)

These issues blocked remaining component migrations (19 components already converted, ~20 more planned).

### External Research Conducted

Deployed three parallel external-research-analyst agents investigating official design system documentation:

- **GitHub Primer**: @primer/primitives v8.x, elevation strategies, border hierarchies
- **IBM Carbon**: @carbon/themes v11.0.0, layer system (layer-01/02/03), per-layer border tokens
- **GitLab Pajamas**: design.gitlab.com elevation system, semantic section tokens

**Key Finding: Architectural Insight**

IBM Carbon provides **per-layer border hierarchy** (border-subtle-00, border-strong-01/02/03) that maintains
visibility across different elevation levels. Primer and Pajamas lack this official vocabulary but would benefit
from it for consistency.

**Critical Realization:** We're building ONE app with consistent structure, just different color palettes.
The semantic token vocabulary should be unified across themes to ensure consistent component behavior.

### Current Architecture Problems

```
Palettes (official + CineXplorer extensions mixed) → Definitions (per-theme adapters) → Components
```

**Issues:**

1. **Inconsistent vocabulary**: Carbon has border hierarchy, Primer/Pajamas don't → components need theme-specific logic
2. **Mixed concerns**: Official tokens + CineXplorer extensions (ratings, custom colors) intermingled in palette files
3. **Semantic confusion**: Emphasis tokens used for elevation (wrong), state tokens for structure (wrong)
4. **Duplicate adapter logic**: Each theme definitions file repeats similar mapping patterns
5. **Limited vocabulary**: Missing interaction states (hover/selected/active per layer), shadow system, layer-03

### Alternatives Considered

**Option A: Minimal Adapter (Light Touch)**

Add small adapter function to extend existing definitions with missing tokens:

```typescript
export function unifyTheme(theme: OfficialTheme): UnifiedTheme {
  return {
    ...theme.light,
    'border-subtle-02': theme.light.border,
    'layer-03': theme.light['layer-02'] || theme.light.card,
    ...createCineXplorerExtensions(palette),
  };
}
```

**Pros**: Minimal disruption (~3-5 hours), low risk, quick fix
**Cons**: Two adapter layers (definitions + extensions), doesn't consolidate mapping logic, less elegant
**Rejected**: Architectural debt - better to fix properly now while touching system anyway

**Option B: Full Adapter Layer (Complete Separation)**

Move ALL semantic mapping to adapter, keep palette files pristine (official tokens only):

```
Palettes (official only) → Definitions (minimal/removed) → Adapter (ALL mappings) → Components
```

Adapter contains: corrections + unified vocabulary + derived tokens + extensions

**Pros**: Maximum separation, official files pristine, single consolidated adapter
**Cons**: Most complex (~8-12 hours), breaks existing structure more
**Selected**: Clean architecture worth investment, perfect timing (already touching themes for corrections)

**Option C: Hybrid (Pragmatic)**

Keep corrections in definitions, adapter only for extensions and unofficial tokens

**Pros**: Less disruption (~4-6 hours), clear responsibility split
**Cons**: Definitions still have corrections (not 100% pristine), moderate complexity
**Rejected**: After analysis, determined corrections ARE part of making definitions more faithful to design systems,
not less. Since definitions are already our adapter layer, better to consolidate into single clean adapter (Option B).

### Key Architectural Decision Point

**Question**: Are our definitions files "official mappings" or "our adapter layer"?

**Investigation**: Examined actual file structure:

- **Palettes**: Contain design system token names (`bg_default`, `fg_accent`) PLUS CineXplorer extensions
  (warning, info, rating colors)
- **Definitions**: Map design system tokens → Chakra UI vocabulary (`bg_default` → `background`, `fg_accent` → `accent`)

**Conclusion**: Definitions ARE already an adapter layer we created. They translate design-system semantics to
Chakra UI semantics. Therefore, consolidating into a single unified adapter (Option B) is the architecturally
correct choice.

## Decision

We will implement a unified theme adapter layer that replaces the current definitions files with a consolidated
architecture providing consistent ~40-token vocabulary across all themes.

### Architecture Change

**Before:**

```
Palettes (official + extensions mixed) → Definitions (adapter #1) → Components
```

**After:**

```
Palettes (official only) → Adapter (unified, replaces definitions) → Components
                            ↓
                         Extensions (centralized)
```

### Unified Token Vocabulary (~40 tokens)

**Core Structure (8 tokens):**

- `background`, `foreground`, `layer-01`, `layer-02`, `layer-03`
- Semantic aliases: `card` (→ layer-01), `surface-elevated` (→ layer-02), `surface-highest` (→ layer-03)

**Border Hierarchy (5 tokens):**

- `border-subtle-00` (on background/layer-01)
- `border-subtle-02` (on layer-02)
- `border-strong-01`, `border-strong-02`, `border-strong-03` (accessible borders per layer)

**Shadow System (3 tokens):**

- `shadow-sm` (subtle, for cards)
- `shadow-md` (medium, for popovers/dropdowns)
- `shadow-lg` (large, for modals)

**Interaction States (6 tokens):**

- `layer-hover-01`, `layer-hover-02` (hover states per layer)
- `layer-selected-01`, `layer-selected-02` (selected states per layer)
- `layer-active-01`, `layer-active-02` (active/pressed states per layer)

**Existing Semantic Colors (keep from ADR-003):**

- Status pairs: `primary`, `secondary`, `accent`, `destructive`, `success`, `warning`, `info`, `rating`
- Text variants: `muted-foreground`, `accent-foreground`, etc.
- Interactive: `badge`, `drag-active`, `drop-zone`

### Implementation Structure

```typescript
// frontend/src/theme/adapter/

adapter/
  types.ts              // UnifiedTheme interface (~40 tokens)
  shadows.ts            // Shadow values per design system
  extensions.ts         // CineXplorer-specific tokens (centralized)
  utils.ts              // Token derivation helpers
  github.ts             // GitHub Primer → unified mapping
  carbon.ts             // IBM Carbon → unified mapping
  pajamas.ts            // GitLab Pajamas → unified mapping
  index.ts              // Public API
```

### Per-Theme Adapter Pattern

Each adapter file clearly demarcates three token categories:

**Section 1: Official Mappings (with corrections)**

- Map design system tokens to unified vocabulary
- Apply corrections discovered during research (card, surface-elevated, border fixes)
- Document source (official design system package version)

**Section 2: Derived Tokens (unofficial, for consistency)**

- Generate tokens not provided by design system for app consistency
- Example: Primer lacks per-layer borders → derive from single border token
- Document derivation rationale

**Section 3: CineXplorer Extensions (app-specific)**

- Apply centralized extensions (ratings, custom semantic colors)
- Adapt to theme's color palette character

### Migration Approach

**Phase 1**: Design vocabulary, create adapter structure
**Phase 2**: Per-theme migration (palette corrections → adapter creation → testing)

- 2.1 GitHub Primer
- 2.2 IBM Carbon
- 2.3 GitLab Pajamas
**Phase 3**: Component migration (~19 components, update imports)
**Phase 4**: Remove old definitions files, comprehensive testing

### Effective Timeline

Immediately upon acceptance. Implementation tracked in:
`.arc/active/incidental/tasks-theme-definition-semantic-corrections.md`

Estimated effort: 15-21 hours over 2-3 sessions

## Consequences

### Positive

**Architecture:**

- ✅ Single adapter layer eliminates duplicate mapping logic
- ✅ Clean separation: Official sources (palettes) | Unified adapter | Components
- ✅ Palette files contain ONLY official design system tokens (easier to update from upstream)
- ✅ CineXplorer extensions centralized in one location (easier to maintain)

**Component Development:**

- ✅ No theme-specific logic needed (unified vocabulary works everywhere)
- ✅ Richer vocabulary available (border hierarchy, shadows, interaction states)
- ✅ Components can use `border-strong-02` on elevated panels universally
- ✅ Clear semantic intent: `layer-hover-01` vs `bg_muted` + manual darkening

**Maintainability:**

- ✅ Adding new theme requires only ONE adapter file (not palette + definitions)
- ✅ Official token updates easy (palette changes, adapter logic unchanged)
- ✅ Clear demarcation: official vs derived vs extended tokens

**Quality:**

- ✅ Fixes critical visual bugs (invisible borders, indistinguishable cards)
- ✅ Improves accessibility (proper border contrast hierarchy)
- ✅ Industry-aligned patterns (Carbon's border strategy proven at scale)

### Negative

**Implementation Cost:**

- ⚠️ Significant upfront work (15-21 hours estimated)
- ⚠️ Touches 7 files (3 palettes) + creates 7 new files (adapter structure, 3 theme adapters)
- ⚠️ Requires migrating 19 already-converted components
- **Mitigation**: Perfect timing - already doing theme corrections, components need review anyway

**Complexity:**

- ⚠️ More abstraction layers to understand (adapter pattern, derivation rules)
- ⚠️ ~40 tokens vs current ~33 tokens (7 more to maintain)
- ⚠️ Derivation rules need documentation (how unofficial tokens are derived)
- **Mitigation**: Clear comments in adapter files, notes document all decisions

**"Unofficial" Tokens:**

- ⚠️ Extending Primer/Pajamas with tokens they don't officially provide (border hierarchy, layer-03)
- ⚠️ Risk: might not match design system philosophy perfectly
- **Mitigation**: Derivation follows design system principles, clearly marked as unofficial

**Breaking Changes:**

- ⚠️ Components importing from theme system may need updates
- ⚠️ Type changes (UnifiedTheme interface replaces Theme)
- **Mitigation**: Controlled migration, type system catches all issues

### Risks

**Over-Engineering:**

- Could be over-engineering for 3 themes
- Counter: Already planning more themes ("we very well may"), extensibility has value
- Monitoring: Track if unified vocabulary actually used in components

**Derivation Errors:**

- Derived tokens might not look right in all themes
- Mitigation: Visual testing in all 6 theme combinations (3 themes × 2 modes)
- Escape hatch: Theme-specific overrides still possible if needed

**Maintenance Burden:**

- ~40 tokens = more surface area for new themes
- Counter: Adapter pattern makes this systematic, not ad-hoc
- Documentation: Clear guide for "Extending with new themes"

### Follow-up Work

**Immediate (in this incidental task list):**

- Implement complete adapter architecture
- Apply corrections to all 3 themes
- Migrate 19 components
- Comprehensive visual testing (6 combinations)

**Future:**

- Monitor token usage in components (are all ~40 tokens valuable?)
- Deprecate consistently unused tokens after 6 months
- Update strategy-color-tokens.md with adapter pattern guidance
- Create "Adding a new theme" guide using adapter pattern

### Lessons for Future

**Architectural Decisions:**

- When touching a system for corrections, consider if broader architectural improvements warranted
- Perfect timing: already touching themes for fixes, components need review anyway
- "Leave it cleaner" applies architecturally, not just at code level

**Design System Adaptation:**

- It's OK to extend design systems with "unofficial" tokens for app consistency
- Key: clearly mark what's official vs derived vs app-specific
- Trust: ~99% accurate to design systems is fine (IBM won't come in and correct us)

**One App, Multiple Themes:**

- Unified vocabulary more important than perfect design system fidelity
- Components benefit from consistent semantics across themes
- Trade-off: some "unofficial" tokens for better developer experience

---

**Date:** 2025-11-04
**Related Decisions:**

- ADR-003: Extends semantic token system (33 → ~40 tokens)
- ADR-004: Keeps provider recreation pattern, refines adapter architecture

**References:**

- Task List: `.arc/active/incidental/tasks-theme-definition-semantic-corrections.md`
- Research Notes: `.arc/active/incidental/notes-theme-definition-semantic-corrections.md`
- Original Research: `.arc/active/incidental/notes-theme-system-modernization.md` (Phase 4.4.4)
- Strategy: `.arc/reference/strategies/project/style/strategy-color-tokens.md` (token architecture and naming)
