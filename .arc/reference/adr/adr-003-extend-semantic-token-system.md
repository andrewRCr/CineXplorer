# ADR-003: Extend Semantic Token System with 13 Specialized Tokens

## Status

Accepted

## Context

CineXplorer's theme system was initially implemented with shadcn/ui's 20 base semantic tokens,
providing fundamental theming capabilities (background, foreground, primary, secondary, destructive, etc.).
During theme system modernization work (`.arc/active/incidental/tasks-theme-system-modernization.md`),
we identified gaps where the base token set was insufficient for movie application UI patterns and
common interactive states.

**Research Conducted (Phase 3.1 of theme modernization - Design System Analysis):**

We analyzed 89KB of documentation across 4 production design systems to understand semantic token best practices:

- **Material Design 3** (Google) - 6 elevation levels, dedicated drag states (16% opacity)
- **IBM Carbon Design System** - 4 surface layers, comprehensive status colors with WCAG AA compliance
- **GitHub Primer** - 3 elevation levels, minimal but complete (64 tokens)
- **Ant Design** - 5 surface variants, dedicated Rate component with gold star default

**Key Findings:**

1. **Status semantic tokens universally present** - All 4 systems implement success/warning/info color
   pairs for semantic feedback, distinct from destructive (error) states
2. **Surface elevation is standard** - All systems provide 3+ surface levels for depth hierarchy
   (background < card < elevated < popover pattern)
3. **Domain-specific tokens are common** - Ant Design has dedicated rating tokens; semantic meaning
   justifies separation from generic warning colors
4. **Our 33 tokens remain conservative** - Industry systems range from 64 (Primer) to 1000+
   (Material Design 3); our proposed 33 tokens (20 base + 13 extended) sits well below the 40-415+
   range of comparable systems

**Gap Analysis (Phase 3.2 of theme modernization - Token Sufficiency Audit):**

Identified 13 missing tokens across 5 categories:

- **Critical (8 tokens):** Status pairs (success, warning, info) for semantic feedback; rating pair for
  movie scores
- **High Priority (5 tokens):** Surface-elevated for depth hierarchy; badge pair for neutral tags;
  drag-and-drop states for interactive lists

**Movie Application Specific Needs:**

- **Rating displays** - Movie scores (IMDb, TMDB, user ratings) are semantically different from warnings;
  IMDb's #F5C518 gold is industry standard
- **Genre badges** - Neutral tags need distinct token from muted (different use case) and accent (not highlighted)
- **Featured sections** - Hero content needs elevation between card and popover for visual hierarchy
- **Interactive lists** - Watchlist reordering and collection management require clear drag-and-drop affordances

**External Constraints:**

- Chakra UI v3 requires RGB space-separated format for opacity support
- WCAG AA compliance mandatory (4.5:1 contrast for text, 3:1 for UI components)
- Must maintain theme character across 7 existing theme definitions

**Alternatives Considered:**

**Option A: Reuse Existing Tokens Creatively**

- Use `accent` for ratings, `muted` for badges, `card` for elevated surfaces
- Pros: No additional tokens to maintain
- Cons: Semantic clarity lost; ratings share meaning with generic accents; surface hierarchy becomes
  ambiguous; future maintainers won't understand intent
- **Rejected:** Sacrifices semantic clarity that is the entire point of semantic tokens

**Option B: Add Only Critical 8 Tokens (Status + Rating Pairs)**

- Implement success/warning/info/rating pairs only, defer surface-elevated, badge, and drag-and-drop
- Pros: Smaller immediate change; addresses most urgent needs
- Cons: Defers known requirements (drag-and-drop already planned, badges actively needed); requires
  second token extension later; creates technical debt
- **Rejected:** Defers known needs unnecessarily, creates future disruption

**Option C: Implement All 13 Tokens Now (Selected)**

- Add all validated tokens in single extension: 6 status, 2 rating, 1 surface, 2 badge, 2 drag-and-drop
- Pros: Comprehensive solution; covers all current and planned needs; industry-aligned patterns;
  still conservative vs industry norms
- Cons: All 7 themes require updates (manageable one-time cost); slightly more tokens to maintain
- **Selected:** Comprehensive approach prevents future disruption while remaining minimal

## Decision

We will extend the `ThemeColors` interface from 20 to 33 semantic tokens by adding 13 specialized tokens
organized into 5 semantic categories:

**Status Semantic Pairs (6 tokens):**

- `success` / `success-foreground` - Positive outcomes, confirmations, completions
- `warning` / `warning-foreground` - Cautions, alerts, careful attention needed
- `info` / `info-foreground` - Informational messages, tips, helpful guidance

Baseline colors: Success #198038 (IBM Carbon green), Warning #faad14 (Ant Design gold),
Info #0f62fe (IBM Carbon blue). Themes will adapt these to match their palette character.

**Movie-Specific Rating (2 tokens):**

- `rating` / `rating-foreground` - Movie score displays, user ratings, quality indicators

Baseline: #F5C518 (IMDb gold standard) in light mode, adjusted (#FFD700 or #FFC107) in dark mode
for better contrast. Semantically distinct from warning - ratings have different meaning than cautions.

**Surface Elevation (1 token):**

- `surface-elevated` - Featured sections, emphasized cards, modals

Third level in elevation hierarchy: `background` < `card` < `surface-elevated` < `popover`.
Uses tonal variation (lighter in dark mode per Material Design 3 approach) to create depth without
relying solely on shadows.

**Badge System (2 tokens):**

- `badge` / `badge-foreground` - Neutral badges for genre tags, default labels, non-semantic tags

Distinct from `muted` (disabled/deemphasized) and `accent` (highlighted). Provides semantic clarity
for tag-like elements.

**Interactive States (2 tokens):**

- `drag-active` - Element currently being dragged (darker/emphasized appearance)
- `drop-zone` - Valid drop target indicator (subtle success/accent tint)

Provides clear visual feedback for watchlist reordering and collection management.

**Implementation:**

- Type definitions updated in `frontend/src/theme/types.ts`
- All 7 theme definitions will be updated with appropriate color values
  (Task 3.5 of theme modernization task list)
- Light/dark mode variations documented per token
- WCAG AA contrast requirements maintained across all themes

**Effective:** Immediately upon merge to main branch. Theme definitions must be updated before
component usage.

## Consequences

### Positive

- **Complete coverage** - Addresses all identified gaps for current and planned features
  (status feedback, ratings, elevation, badges, drag-and-drop)
- **Industry alignment** - Follows patterns validated by 4 major design systems
  (Material Design 3, IBM Carbon, GitHub Primer, Ant Design)
- **Semantic clarity** - Ratings are distinct from warnings, badges distinct from muted,
  elevated surfaces distinct from cards
- **Future-proof** - Conservative token count (33 total) leaves room for growth while preventing
  premature token proliferation
- **Domain-appropriate** - Rating token acknowledges movie application's specific needs (IMDb gold standard respected)
- **Accessibility maintained** - All tokens subject to WCAG AA contrast requirements

### Negative

- **One-time maintenance cost** - All 7 existing theme definitions require updates to add 13 new token
  values
- **Slightly increased complexity** - 33 tokens vs 20 tokens means more surface area to maintain when
  adding new themes
- **Type errors until complete** - TypeScript will flag incomplete themes until all definitions updated
  (addressed in Task 3.5 of theme modernization)
- **Documentation updates needed** - Theme migration guides and component usage examples must cover
  new tokens

### Risks

- **Unused tokens** - If drag-and-drop or badge features are cut, some tokens may go unused
  (low risk - features already planned)
- **Color selection challenges** - Each theme must select appropriate colors for 13 new tokens while
  maintaining character and contrast (mitigated by research-based color guidance)
- **Breaking change for custom themes** - Any future user-defined themes must include all 33 tokens
  (acceptable - proper semantic structure worth the requirement)

### Follow-up Work

- Task 3.5 (theme modernization): Update all 7 theme definitions with new token values
- Task 3.6 (theme modernization): Create migration mapping guide for component updates
- Future: Monitor token usage and deprecate any consistently unused tokens after 6 months
