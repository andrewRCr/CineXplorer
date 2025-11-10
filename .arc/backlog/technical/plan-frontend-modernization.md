# Plan: Frontend Modernization

Corrective architectural improvements - "things that should have been there from the beginning."

This document tracks technical debt and architectural decisions that need to be revisited.
When planning frontend modernization work, this serves as the starting point for PRD creation.

---

## State Management Modernization

### TanStack Query (React Query)

**Status:** Planned
**Priority:** High
**Rationale:** Replace manual state management with industry-standard data fetching/caching

**Current Issues:**

- Manual loading/error state management in hooks
- No built-in caching or request deduplication
- Manual refetch/invalidation logic
- Optimistic updates implemented manually with rollback

**Target Implementation:**

- Server state management via TanStack Query
- Automatic background refetching
- Built-in request deduplication
- Declarative cache invalidation
- Type-safe API with generated types

**Related Code:**

- `frontend/src/hooks/useMovieActions.ts` - Manual state management, marked for Query migration
- `frontend/src/services/movieInteractionService.ts` - Service functions ready to wrap

**Migration Strategy:**

- Hook facade pattern already in place (API stays stable)
- Can migrate incrementally (hook by hook)
- Components won't need changes (same interface)

---

### Redux Toolkit

**Status:** Planned
**Priority:** Medium
**Rationale:** Centralized client state management for global UI concerns

**Use Cases:**

- Theme/preferences (dark mode, language)
- Global UI state (modals, notifications, sidebar)
- Complex form state spanning multiple components
- Feature flags/app configuration

**NOT for:**

- Server state (use TanStack Query instead)
- Authentication state (already handled by AuthContext)
- URL/routing state (React Router handles this)

**Target Implementation:**

- Redux Toolkit with TypeScript
- Redux DevTools integration
- RTK Query for any remaining REST needs not covered by TanStack Query
- Slice-based organization

**Related Patterns:**

- Clear separation: TanStack Query (server) vs Redux (client)
- AuthContext stays as-is (works well for auth-specific needs)

---

## Architecture Principles

### State Management Decision Tree

```
Server State (API data, cache) → TanStack Query
Client State (global UI) → Redux Toolkit
Client State (local UI) → React useState/useReducer
Auth State → AuthContext (existing pattern)
```

### Migration Priority

1. **Phase 1:** TanStack Query for all API interactions
2. **Phase 2:** Redux Toolkit for global client state
3. **Phase 3:** Review and optimize patterns

---

## Routing Architecture Modernization

**Status:** Planned
**Priority:** Medium
**Timing:** Phase 2 (pairs with TanStack Query migration)

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
