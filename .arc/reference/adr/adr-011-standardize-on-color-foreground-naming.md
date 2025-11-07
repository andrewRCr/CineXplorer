# ADR-011: Standardize on "on-color" Foreground Naming Convention

## Status

Proposed

## Context

### Current Naming Inconsistency

Our theme system currently uses **two different naming patterns** for foreground text tokens that appear on colored backgrounds:

**Pattern 1: `-foreground` suffix (semantic colors)**

```typescript
primary: string;              // Button background
"primary-foreground": string; // Text on primary buttons

secondary: string;
"secondary-foreground": string;

tertiary: string;
"tertiary-foreground": string;

muted: string;
"muted-foreground": string;
```

**Pattern 2: `on-` prefix (status colors only)**

```typescript
success: string;
"on-success": string;        // Text on success backgrounds

destructive: string;
"on-destructive": string;

warning: string;
"on-warning": string;

info: string;
"on-info": string;
```

**Problem:** Developers must remember two different patterns for the same semantic purpose: "text color that goes on
top of a colored background."

### Material Design 3's Approach

Material Design 3 uses a **consistent `on-` prefix** for all foreground text tokens:

```typescript
primary: string;
onPrimary: string;        // Text on primary backgrounds

secondary: string;
onSecondary: string;      // Text on secondary backgrounds

tertiary: string;
onTertiary: string;       // Text on tertiary backgrounds

error: string;
onError: string;          // Text on error backgrounds

surface: string;
onSurface: string;        // Text on surface backgrounds

surfaceVariant: string;
onSurfaceVariant: string; // Text on surface variant backgrounds
```

**Benefits of Material's pattern:**

1. **Semantic clarity**: "on-primary" immediately communicates "text that goes ON a primary background"
2. **Consistency**: One pattern for all foreground tokens (not two)
3. **Discoverability**: IDE autocomplete groups related tokens (`primary` + `on-primary`)
4. **Industry standard**: Material is used by millions of developers - familiar pattern

### Discovery During Material Theme Implementation

While implementing Material Design 3 theme (Task 3.5.5.7), we noticed our naming inconsistency when mapping Material's
tokens to our interface:

```typescript
// Material provides:
palette.onPrimary

// We have to map to TWO different patterns:
"primary-foreground": palette.onPrimary  // Semantic colors use -foreground
"on-destructive": palette.onError        // Status colors use on-
```

This forced us to maintain both patterns instead of adopting Material's cleaner approach.

### Alternatives Considered

**Option A: Keep current dual pattern**

- **Pros**: No migration needed, backwards compatible
- **Cons**: Confusing, inconsistent, doesn't align with industry standard
- **Assessment**: Technical debt that will confuse developers long-term

**Option B: Standardize on `-foreground` suffix**

- **Pros**: Matches our existing pattern for most tokens
- **Cons**: Less semantic ("primary-foreground" is less clear than "on-primary")
- **Cons**: Doesn't align with Material Design's established convention
- **Assessment**: Would fix consistency but not clarity

**Option C: Standardize on `on-` prefix (CHOSEN)**

- **Pros**: Semantic clarity, industry alignment, one consistent pattern
- **Cons**: Requires migration, temporarily doubles token count during deprecation
- **Assessment**: Best long-term solution despite migration cost

## Decision

We will **standardize on the `on-` prefix** for all foreground text tokens that appear on colored backgrounds.

**Specifically:**

1. **Add new `on-` tokens to UnifiedTheme interface:**

   ```typescript
   "on-primary": string;      // replaces primary-foreground
   "on-secondary": string;    // replaces secondary-foreground
   "on-tertiary": string;     // replaces tertiary-foreground
   "on-muted": string;        // replaces muted-foreground
   ```

2. **Keep existing `on-` tokens for status colors:**

   ```typescript
   "on-success": string;      // already exists
   "on-destructive": string;  // already exists
   "on-warning": string;      // already exists
   "on-info": string;         // already exists
   ```

3. **Deprecate `-foreground` suffix tokens:**
   - Mark with `@deprecated` JSDoc comments
   - Implement as aliases pointing to new `on-` tokens
   - Maintain during component migration period
   - Remove in future cleanup phase (no timeline set)

4. **Migration strategy:**
   - Phase 1: Add `on-` tokens to all adapters (GitHub, IBM, GitLab, Material)
   - Phase 2: Update components to use `on-` tokens (gradual, no rush)
   - Phase 3: Remove deprecated `-foreground` tokens (future, when migration complete)

**Implementation scope:**

- Update `UnifiedTheme` interface in `frontend/src/theme/color/types.ts`
- Update all 4 theme adapters (GitHub, IBM Carbon, GitLab, Material)
- Add JSDoc documentation explaining the pattern
- Components migrate gradually (not part of this ADR)

## Consequences

### Positive

1. **Semantic clarity**: `on-primary` immediately communicates purpose ("text ON primary background")
2. **Consistency**: One naming pattern for all foreground tokens across entire system
3. **Industry alignment**: Matches Material Design's well-established convention
4. **Discoverability**: IDE autocomplete groups related tokens naturally (`primary` + `on-primary`)
5. **Future-proof**: Aligns with industry trends (Ant Design, Shopify Polaris use similar patterns)
6. **Material integration**: Direct mapping from Material's `onPrimary` → our `on-primary` (no translation layer)

### Negative

1. **Migration effort**: Need to update ~33 component files that use `-foreground` tokens
2. **Token count**: Temporarily doubles foreground token count during deprecation period
3. **Breaking change**: Eventually removes `-foreground` tokens (gradual, phased approach mitigates)
4. **Learning curve**: Developers familiar with `-foreground` pattern need to learn new convention

### Risks

1. **Incomplete migration**: If we never finish migrating components, we maintain deprecated tokens forever
   - **Mitigation**: No deadline pressure - migrate opportunistically during feature work
   - **Fallback**: Acceptable to keep deprecated aliases indefinitely if needed

2. **Confusion during transition**: Having both patterns available simultaneously could confuse developers
   - **Mitigation**: Clear JSDoc comments marking deprecated tokens
   - **Mitigation**: Documentation/guidelines recommending `on-` pattern

3. **TypeScript errors**: Removing deprecated tokens eventually breaks components using old pattern
   - **Mitigation**: Only remove after confirming zero usage via grep
   - **Mitigation**: Breaking change reserved for major version bump

## Related ADRs

- **ADR-010**: Establish Core Semantic Color Token Architecture (Primary/Secondary/Tertiary hierarchy)
    - ADR-011 complements by standardizing foreground token naming
    - Both improve semantic clarity and industry alignment

## Implementation Notes

**Not included in this ADR:**

- **Container tokens** (`primary-container`, `on-primary-container`, etc.)
    - Deferred for future consideration if opacity modifiers prove insufficient
    - Material Design 3 provides these, but we lack clear use case currently
    - Can be added later without breaking existing `on-` pattern

**Date**: 2025-11-07
**Author**: CineXplorer Development Team
**Implemented**: Task 3.5.5.7 (Material theme) + Task 3.5.5.8 (on-color standardization)
