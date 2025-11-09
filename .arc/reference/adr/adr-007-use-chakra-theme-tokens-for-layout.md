# ADR-007: Use Chakra Theme Tokens for Layout Constants

## Status

Accepted

## Context

During ThemeDebug sticky header implementation, we discovered a "jump" issue caused by hardcoded layout height
values scattered across the codebase. Investigation revealed broader architectural concerns:

**Problems with current approach:**

- Layout constants existed as magic numbers in individual components (e.g., `height="93px"`, `width="280px"`)
- No single source of truth for layout values
- Drift risk when components change (e.g., navbar border added, height value not updated everywhere)
- Sticky positioning calculations broke due to inconsistent height values
- No clear pattern for responsive layout values

**Alternatives considered:**

1. **JavaScript constants file** (e.g., `constants/layout.ts`)
   - Export named constants: `NAVBAR_HEIGHT = 93`
   - Import into components as needed
   - Rejected: Requires JavaScript context, can't be accessed from CSS, doesn't integrate with responsive design system

2. **Custom responsive hooks** (e.g., `useLayoutHeight()`)
   - Hooks return computed values based on breakpoints
   - Rejected: Causes content flash on initial render, adds unnecessary JavaScript execution, industry moving
     away from this pattern

3. **Chakra UI v3 semantic token system** (chosen)
   - Define layout values as Chakra theme tokens
   - Access via CSS variables or token references
   - Supports responsive values with CSS-native evaluation
   - Industry standard pattern (Material UI, Ant Design, Carbon all use theme tokens)

**External research findings:**

Research into Material UI, Chakra UI, Ant Design, Carbon Design System, and Polaris revealed consistent industry pattern:

- Theme tokens as single source of truth for layout values
- CSS custom properties as implementation mechanism
- Semantic tokens layer for responsive/contextual values
- Validation through architecture, not runtime testing

**Key constraints:**

- **Architecture**: Vite-based SPA (client-side rendering), not server-side rendering
- **User experience**: Need flash-free responsive patterns (avoid `useBreakpointValue` causing content shifts)
- **Performance**: Prefer CSS-native solutions over JavaScript-based responsive logic

## Decision

We will use Chakra UI v3's semantic token system as the single source of truth for all layout constants.

**Implementation approach:**

1. Define layout foundation tokens in `theme/layout/foundations.ts`:
   - Base values: `navbar-height`, `sidebar-width`, `footer-height`
   - Documented with JSDoc comments explaining measurements

2. Create semantic layer in `theme/layout/semantic-tokens.ts`:
   - Responsive tokens with breakpoint-specific values
   - Example: `layout-sidebar` = 0px mobile, 280px desktop

3. Define z-index scale in `theme/layout/z-index.ts`:
   - Semantic stacking hierarchy: `base`, `sidebar`, `footer`, `navbar`, `dropdown`
   - Clear ordering prevents z-index conflicts

4. Access tokens in components:
   - Chakra props: `height="layout.navbar"`
   - CSS variables: `var(--chakra-sizes-layout-navbar)`
   - Token hook: `const [navbarHeight] = useToken('sizes', ['layout.navbar'])`

5. Migrate away from `useBreakpointValue` for show/hide:
   - Replace with CSS display props: `display={{ base: 'block', lg: 'none' }}`
   - Eliminates content flash, provides instant correct display on initial render

**Scope:**

- All layout dimensions (heights, widths, spacing related to layout structure)
- Z-index hierarchy
- Responsive layout patterns
- Does NOT include: component-specific spacing, content dimensions, arbitrary UI values

## Consequences

### Positive

- **Single source of truth**: All layout values defined in one place (`theme/layout/`)
- **CSS-native performance**: Values accessible from CSS without JavaScript execution
    - Browser evaluates media queries natively (faster than JavaScript)
    - No useState, no useEffect, no re-renders on breakpoint changes
- **Flash-free responsive UI**: CSS display props eliminate content flash on initial render
    - `useBreakpointValue` with `{ ssr: false }` shows fallback value briefly, then recalculates
    - CSS display props show correct layout immediately
- **Type-safe**: TypeScript types auto-generated via Chakra CLI
- **Industry standard**: Follows established design system patterns
- **Maintainable**: Changes cascade automatically, no manual updates across files
- **Debuggable**: Can create LayoutDebug page to visualize all token values
- **Scalable**: Easy to add new layout tokens following same pattern
- **Future-proof**: If we migrate to Next.js or add SSR later, patterns already compatible

### Negative

- **Chakra dependency**: Tightly coupled to Chakra UI v3 token system
    - Migration cost if we ever change UI libraries
    - Requires team familiarity with Chakra token concepts
- **Learning curve**: New developers must understand token system vs simple constants
- **Token syntax**: More verbose than direct values (`layout.navbar` vs `93`)
- **Abstraction layer**: Additional indirection between component and actual value
    - Can make debugging harder for developers unfamiliar with tokens

### Risks

- **Breaking changes**: If Chakra v4 significantly changes token system, migration required
    - Mitigation: Token system is stable feature, major breaking changes unlikely
- **Performance**: Minimal CSS variable lookup overhead vs hardcoded values
    - Mitigation: Modern browsers optimize CSS variables efficiently, negligible impact
- **Over-abstraction**: Risk of creating tokens for values that don't need centralization
    - Mitigation: Only use tokens for true layout structure, not arbitrary UI values
- **Migration cost**: Existing hardcoded values must be migrated to tokens
    - Mitigation: Migration already in progress (Phase 3 complete), clear patterns established

### Follow-up Work

- Complete responsive pattern migration (Phase 4): Migrate `useBreakpointValue` usage
- Create LayoutDebug page (Phase 5): Visual debugging tool for layout system
- Document patterns (Phase 6): JSDoc comments and best practice guidance
