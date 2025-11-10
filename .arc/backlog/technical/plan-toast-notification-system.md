# Plan: Toast Notification System

**Document Purpose:** Initial pre-PRD definition of requirements and technical decisions for implementing toast notifications
across the application for user action feedback.

**Status:** Planning / Analysis
**Work Classification:** Technical

---

## Overview

Multiple features require user feedback but lack visual confirmation. This work unit establishes a
consistent toast notification system for success messages, error feedback, and status updates.

**Core Value:**

- Immediate visual feedback for user actions
- Consistent UX across all features
- Accessibility compliance (screen readers, reduced motion)
- Foundation for future feature feedback needs

---

## Identified Needs

**1. Logout confirmation** (Task 8 - `tasks-oauth-headless-migration.md`)

- Issue: Logout redirects to login page, but no confirmation shown
- Impact: Users on public pages don't see clear feedback that logout succeeded
- Expected: "Logged out successfully" toast before/during redirect

**2. Authentication error feedback** (Task 8.5.2 - `tasks-oauth-headless-migration.md` manual testing)

- Issue: 401 errors are handled gracefully but silently
- Impact: User appears logged in but actions fail with no explanation
- Expected: "Session expired, please log in again" error toast with automatic redirect

**3. Action success feedback** (Watchlist toggle feature)

- Issue: Optimistic UI updates work, but no explicit server confirmation
- Impact: User doesn't know if server request succeeded or failed
- Expected: "Added to watchlist" / "Removed from watchlist" success toast
- Expected: Error toast if server request fails after optimistic update

---

## Implementation Options

**Option 1: Chakra UI Toast** (already using Chakra UI v3)

- Pros: Zero additional dependencies, built-in to existing component library
- Pros: Consistent with Chakra design system
- Pros: Accessibility features included
- Cons: Less modern than alternatives, fewer customization options

**Option 2: Sonner**

- Pros: Modern, excellent accessibility, great developer experience
- Pros: Beautiful default styling, smooth animations
- Pros: Active maintenance, popular in React ecosystem
- Cons: Additional dependency (~10KB gzipped)

**Option 3: React Hot Toast**

- Pros: Lightweight (~3KB gzipped), minimal bundle impact
- Pros: Simple API, easy to use
- Cons: Less feature-rich than Sonner
- Cons: Styling more manual

**Recommendation:** Start with Chakra UI Toast (zero deps, sufficient for MVP). Can migrate to
Sonner later if customization needs grow.

---

## Technical Requirements

**Accessibility:**

- Must respect `prefers-reduced-motion` user preference
- Screen reader announcements via ARIA live regions
- Keyboard dismissible (Escape key)

**User Experience:**

- Consistent positioning (recommend: top-right or bottom-right)
- Auto-dismiss with configurable duration (default: 3-5 seconds)
- Manual close button always available
- Stack multiple toasts gracefully (no overlap)

**Developer Experience:**

- Simple API for common cases: `toast.success("Message")`, `toast.error("Message")`
- Support for custom content (links, buttons) when needed
- Global configuration (position, duration, styling)

**Performance:**

- No layout shift when toasts appear/disappear
- Smooth animations (respect reduced motion)
- Memory cleanup when toasts dismiss

---

## Integration Points

**Related Code Files:**

- `frontend/src/hooks/useMovieActions.ts:116` - TODO: Show error notification/toast
- `frontend/src/components/movie/MovieCard.tsx:256` - TODO: Show success notification
- `frontend/src/hooks/useAuth.ts:257-294` - Logout flow needs confirmation toast

**API Integration:**

- Success toasts: After successful API responses (watchlist add/remove, etc.)
- Error toasts: Catch blocks in API services, 401 interceptor in auth service
- Global error handling: Axios interceptor for automatic error toasts

**State Management:**

- Toast provider at app root level
- Context available to all components via hook
- No local state needed in individual components

---

## Implementation Phases

**Phase 1: Infrastructure Setup**

- Install/configure chosen library (recommend Chakra UI Toast)
- Create toast provider wrapper at app root
- Create custom hook: `useToast()` for consistent API
- Configure global defaults (position, duration, styling)

**Phase 2: Core Integrations**

- Auth logout confirmation toast
- Auth 401 error handling toast
- Watchlist action feedback toasts (success/error)

**Phase 3: Expand Coverage**

- All user actions in `useMovieActions` hook
- Form submission feedback (when forms are built)
- Future feature integrations as needed

---

## Testing Considerations

**Unit Tests:**

- Toast display triggers on action success/failure
- Toast content matches expected messages
- Accessibility attributes present (role, aria-live)

**Integration Tests:**

- Full user flows with toast feedback (login → action → toast → dismiss)
- Error scenarios trigger appropriate error toasts
- Multiple toasts stack correctly

**E2E Tests** (Playwright):

- Visual verification of toast appearance
- Reduced motion preference respected
- Screen reader announcements verified

---

## Open Questions

1. **Toast queue behavior:** If 5 toasts trigger simultaneously, show all or limit to N visible?
2. **Persistence:** Should certain toasts (errors) require manual dismissal vs auto-dismiss?
3. **Context in toasts:** Include action buttons ("Undo", "View Details") or keep simple?
4. **Theming:** Dark mode support needed immediately or defer to general theme system work?

---

## References

- Task 8 OAuth Headless Migration: Identified logout confirmation need
- Task 8.5.2 Manual Testing: Identified 401 error feedback need
- Frontend Modernization: Will coordinate with TanStack Query error handling patterns

---

**Last Updated:** 2025-11-10
