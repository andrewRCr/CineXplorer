# Plan: Frontend Modernization

Corrective architectural improvements - "things that should have been there from the beginning."

This document tracks technical debt and architectural decisions that need to be revisited.
When planning frontend modernization work, this serves as the starting point for PRD creation.

---

## State Management Modernization

### TanStack Query (React Query)

**Status:** Partially Implemented (Browse/Search)
**Priority:** Evaluate further adoption opportunities
**Rationale:** Replace manual state management with industry-standard data fetching/caching

**Implemented (Infinite Scroll Migration):**

- `useInfiniteMovies` - TanStack Query `useInfiniteQuery` for movie collections
- Browse flows: `/browse/*`, `/now-playing`, `/upcoming`, `/top-rated`
- Search flows: `/search/*`
- Cursor-based pagination via `next_tmdb_page_start`
- Automatic caching, background refetch, request deduplication
- Scroll position restoration on back-navigation

**Potential Further Adoption (requires evaluation):**

The original rationale for TanStack Query included benefits we haven't fully explored:

- **Automatic background refetching** - Could benefit any frequently-changing data
- **Request deduplication** - Prevents duplicate API calls for same data
- **Declarative cache invalidation** - Simplifies state management after mutations
- **Optimistic updates** - Instant UI feedback with automatic rollback on failure

Candidate areas to evaluate:

- User movie data (watchlist, ratings) - optimistic updates could improve UX
  **Note:** See "Known Architectural Issues" in `plan-user-movie-data-features.md` for specific
  state sync issues discovered 2025-12-23 that TanStack Query would resolve
- Movie detail page - caching/prefetching on hover
- Genre/certification lists - rarely change, good cache candidates
- Authentication flows - currently uses AuthContext (may stay as-is)

**Related Code:**

- `frontend/src/hooks/movie/useInfiniteMovies.ts` - TanStack Query implementation ✓
- `frontend/src/hooks/useMovieActions.ts` - Manual state, evaluation candidate
- `frontend/src/services/movieInteractionService.ts` - Service functions ready to wrap

**Migration Strategy:**

- Hook facade pattern already in place (API stays stable)
- Can migrate incrementally (hook by hook)
- Components won't need changes (same interface)

---

### Redux Toolkit

**Status:** Deferred (2025-12-19)
**Priority:** Skip unless genuine use case emerges
**Rationale:** No current use case justifies the complexity

**Original Use Cases (evaluated and found insufficient):**

- Theme/preferences → Chakra's built-in system handles this
- Global UI state (modals, notifications) → Toast system uses Chakra, no Redux needed
- Complex form state → Not currently building forms-heavy features
- Feature flags → None exist

**Decision:** Adding Redux without genuine complexity to manage would be resume-padding rather than
good engineering. Current patterns (AuthContext, Chakra theme, local state) are sufficient.

**Revisit if:**

- Complex cross-component state emerges that React context can't handle cleanly
- Multiple unrelated components need to share mutable state
- Undo/redo or time-travel debugging becomes valuable

---

## Architecture Principles

### State Management Decision Tree

```
Server State (API data, cache) → TanStack Query
Client State (local UI) → React useState/useReducer
Auth State → AuthContext (existing pattern)
Theme State → Chakra theme system
```

### Current Strategy

TanStack Query is already implemented for browse/search. Further expansion (optimistic updates for
user movie data) happens naturally during feature work. No separate "state management modernization"
effort needed - patterns evolve with features.

---

## Routing Architecture Modernization

**Status:** Lower Priority (2025-12-19)
**Priority:** Fit during Phase B if touching routing-adjacent code
**Rationale:** Portfolio consistency with Next.js App Router patterns; current routing works fine

**Current Pattern:** Traditional Pages Router (React Router v6, centralized routes in App.tsx)

**Current Issues:**

- Routes defined manually in JSX (not file-based)
- Data loading patterns require custom hooks
- Less similar to Next.js App Router patterns used in arc-portfolio
- Route-level code organization could be clearer

**Target Pattern:** React Router Data Router with createBrowserRouter API or file-based routing

**Benefits:**

- Better data loading patterns (loader functions coordinate with TanStack Query)
- Improved nested layout support (layout routes)
- More similar to Next.js App Router patterns (arc-portfolio consistency)
- Better code organization for route-level concerns
- Type-safe route parameters and loaders

**Migration Strategy:**

- Migrate after TanStack Query is established (loaders can use Query)
- Can be done incrementally (route by route)
- Consider using remix-flat-routes or similar for file-based routing
- Existing lazy loading can be preserved/enhanced

**Related Code:**

- `frontend/src/App.tsx` - Current centralized route configuration
- `frontend/src/pages/` - Page components (structure could inform file-based routing)
- `frontend/src/constants/routes.ts` - Route constants (may need updates)

---

## Future Considerations

### Bundle Size Optimization

- Code splitting strategies
- Lazy loading improvements
- Tree shaking verification

### Performance Monitoring

- React DevTools Profiler integration
- Performance budgets
- Core Web Vitals tracking

**Performance Targets** (from earlier planning):

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Bundle Size: < 200KB gzipped for initial load
- Lighthouse score: > 90 for performance

### Developer Experience

- Improved type generation from OpenAPI
- Better error boundaries
- Enhanced debugging tools

### Form State Management

**Consideration:** Evaluate React Hook Form (vs current Formik) during implementation

- Benefits: Better performance, smaller bundle, TypeScript-first
- Decision: Evaluate when implementing forms-heavy features (user profile editing, etc.)

---

**Note:** When creating the frontend-modernization PRD(s), use this document as the foundation.
