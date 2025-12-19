# PRD: Toast Notification System

**Type:** Technical Infrastructure
**Priority:** High (Phase A - enables all subsequent feature work)
**Status:** In Progress

---

## 1. Introduction/Overview

CineXplorer currently lacks a consistent mechanism for providing user feedback on actions. Users perform
operations (logout, watchlist toggle, form submissions) without clear visual confirmation of success or
failure. This creates uncertainty about whether actions completed and degrades the user experience.

The Toast Notification System establishes infrastructure for displaying transient, non-blocking messages
that acknowledge user actions, report errors, and provide status updates. This system is foundational -
all subsequent feature work (ratings, reviews, lists, async operations) depends on it for user feedback.

---

## 2. Goals

1. **Immediate feedback**: Users receive visual confirmation within 100ms of action completion
2. **Consistent patterns**: All features use the same notification API and visual language
3. **Accessibility compliance**: Screen reader support, reduced motion respect, pause on hover
4. **Developer ergonomics**: Simple API for common cases, flexibility for advanced needs
5. **Theme integration**: Full alignment with existing semantic token system and recipes
6. **Promise toast support**: Loading → success/error transitions for async operations

---

## 3. User Stories

**US-1: Action Confirmation**
As a user, I want to see confirmation when I add a movie to my watchlist so that I know the action succeeded.

**US-2: Error Awareness**
As a user, I want to see an error message when an action fails so that I understand what went wrong and can retry.

**US-3: Session Feedback**
As a user, I want to see confirmation when I log out so that I know my session ended securely.

**US-4: Undo Capability**
As a user, I want the option to undo destructive actions (like removing from watchlist) via the toast
so that I can recover from mistakes quickly.

**US-5: Async Operation Visibility**
As a user, I want to see progress when an operation takes time (like sending an email) so that I know
the system is working.

**US-6: Accessibility**
As a screen reader user, I want toast messages announced so that I receive the same feedback as sighted users.

---

## 4. Functional Requirements

### 4.1 Core Infrastructure

**FR-1**: The system MUST use Chakra UI v3's built-in Toaster component (zero additional dependencies).

**FR-2**: The system MUST provide a globally accessible `toaster` instance callable from any component.

**FR-3**: The system MUST support toast types: `success`, `error`, `warning`, `info`, `loading`.

**FR-4**: The system MUST support promise-based toasts via `toaster.promise()` for async operations.

**FR-5**: The system MUST render the `<Toaster />` provider at the application root level.

### 4.2 Toast Behavior

**FR-6**: Toasts MUST appear in the bottom-right position (Chakra default).

**FR-7**: Toasts MUST auto-dismiss with type-based durations:

- Success: 4 seconds
- Info: 5 seconds
- Warning: 6 seconds
- Error (minor): 8 seconds
- Error (critical - session expired, server error): Require manual dismissal

**FR-8**: Toasts MUST pause their dismiss timer on hover and focus.

**FR-9**: All toasts MUST include a visible close button for manual dismissal.

**FR-10**: Multiple simultaneous toasts MUST stack without overlap (Chakra handles this natively).

### 4.3 Toast Content

**FR-11**: Toasts MUST support title and description text.

**FR-12**: Toasts MUST support action buttons (e.g., "Undo" for destructive actions).

**FR-13**: Toasts MUST support custom icons per toast instance.

**FR-14**: Promise toasts MUST display distinct messages for loading, success, and error states.

### 4.4 Accessibility

**FR-15**: Toasts MUST use appropriate ARIA roles (`role="status"` or `role="alert"`).

**FR-16**: Toasts MUST announce content to screen readers via `aria-live` regions.

**FR-17**: Toast animations MUST respect `prefers-reduced-motion` user preference.

**FR-18**: Interactive elements in toasts (close button, action buttons) MUST be keyboard accessible.

### 4.5 Theme Integration

**FR-19**: Toast styling MUST use semantic tokens from the existing color token system.

**FR-20**: Toast component MUST support both light and dark color modes.

**FR-21**: Toast implementation SHOULD follow existing recipe patterns where applicable.

**FR-22**: Toast code MUST follow project standards (TypeScript strict mode, DRY, separation of concerns).

---

## 5. Non-Goals (Out of Scope)

- **Persistent notifications**: Toasts are transient; persistent notifications are a separate feature
- **Notification center/history**: No UI for viewing past notifications
- **Push notifications**: Browser push notifications are out of scope
- **Email notifications**: Backend email sending (Celery) is separate infrastructure
- **Custom toast animations**: Use Chakra defaults; custom animations deferred
- **Toast queuing limits**: No artificial limit on simultaneous toasts (Chakra handles gracefully)

---

## 6. Design Considerations

### 6.1 Visual Design

Toasts will use the existing semantic token system:

| Element    | Token Category | Example                                |
|------------|----------------|----------------------------------------|
| Background | Layer tokens   | `layer-02`                             |
| Border     | Border tokens  | `border-strong-01`                     |
| Text       | Content tokens | `primary`, `secondary`                 |
| Icons      | Status tokens  | `success`, `danger`, `warning`, `info` |

### 6.2 Toast Anatomy

```
┌─────────────────────────────────────────────┐
│ [Icon]  Title                          [X]  │
│         Description text here               │
│                              [Action Button]│
└─────────────────────────────────────────────┘
```

### 6.3 Color Mode Support

Both light and dark modes must work from initial implementation. The semantic token system already
supports color modes - toast implementation inherits this automatically when using tokens correctly.

---

## 7. Technical Considerations

### 7.1 Implementation Approach

**Toaster Setup (compositions pattern):**

```typescript
// src/components/ui/toaster.tsx
import { Toaster as ChakraToaster, createToaster } from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

export const Toaster = () => (
  <ChakraToaster toaster={toaster} /* ... */ />
);
```

**Usage Pattern:**

```typescript
import { toaster } from "@/components/ui/toaster";

// Simple toast
toaster.success({ title: "Added to watchlist" });

// Promise toast
toaster.promise(saveReview(movieId, review), {
  loading: { title: "Saving review..." },
  success: { title: "Review saved" },
  error: { title: "Failed to save review" },
});

// With undo action
toaster.success({
  title: "Removed from watchlist",
  action: { label: "Undo", onClick: () => addToWatchlist(movieId) },
});
```

### 7.2 Integration Points

**Phase 1 - Core Integrations (this PRD):**

| Location                              | Toast Type       | Message                                 |
|---------------------------------------|------------------|-----------------------------------------|
| `useAuth.ts` logout                   | Success          | "Logged out successfully"               |
| `useAuth.ts` session expired          | Error (critical) | "Session expired. Please log in again." |
| `useMovieActions.ts` watchlist add    | Success          | "Added to watchlist"                    |
| `useMovieActions.ts` watchlist remove | Success + Undo   | "Removed from watchlist"                |
| `useMovieActions.ts` error            | Error            | Dynamic error message                   |
| API interceptor 401                   | Error (critical) | "Session expired. Please log in again." |
| API interceptor 5xx                   | Error            | "Server error. Please try again."       |

**Phase 2+ - Future Integrations (separate PRDs):**

| Feature               | Toast Pattern  | Notes                    |
|-----------------------|----------------|--------------------------|
| Ratings save          | Simple success | Fast operation           |
| Reviews save          | Promise toast  | Visible latency          |
| Favorites toggle      | Success + Undo | Destructive action       |
| Movie Lists CRUD      | Promise toast  | Create/delete operations |
| Celery email dispatch | Promise toast  | "Sending..." → "Sent!"   |

### 7.3 Dependencies

- **Chakra UI v3**: Already installed, toaster included
- **No additional packages**: Zero new dependencies

### 7.4 Code Organization

```
frontend/src/
├── components/
│   └── ui/
│       └── toaster.tsx          # Toaster provider + createToaster config
├── hooks/
│   └── auth/
│       └── useAuth.ts           # Add logout toast
│   └── movie/
│       └── useMovieActions.ts   # Add action toasts
├── services/
│   └── apiClient.ts             # Add error interceptor toasts
└── App.tsx                      # Mount <Toaster /> provider
```

### 7.5 Testing Strategy

- **Unit tests**: Toast trigger functions called with correct parameters
- **Integration tests**: User flows result in appropriate toasts
- **Accessibility tests**: Screen reader announcements, keyboard navigation
- **Visual tests**: Toast appearance in light/dark modes (manual or Playwright)

---

## 8. Success Metrics

| Metric                   | Target                                   | Measurement          |
|--------------------------|------------------------------------------|----------------------|
| User feedback coverage   | 100% of user actions have toast feedback | Code audit           |
| Accessibility compliance | WCAG 2.1 AA                              | Lighthouse, axe-core |
| Zero regressions         | All existing tests pass                  | CI pipeline          |
| Developer adoption       | Consistent usage across features         | Code review          |

---

## 9. Open Questions

**Resolved during discovery:**

1. ~~Chakra vs Sonner~~ → Chakra UI (promise toast support confirmed, zero deps, theme integration)
2. ~~Promise toast need~~ → Yes, for reviews, email dispatch, batch operations
3. ~~Positioning~~ → Bottom-right (Chakra default)
4. ~~Duration strategy~~ → Type-based (4s/5s/6s/8s+manual)
5. ~~Undo actions~~ → Yes for destructive, case-by-case
6. ~~Dark mode~~ → Implement now, follows existing theme system

**Remaining (implementation details):**

1. Should critical errors (5xx) include a "Retry" action button, or keep simple?
2. Should 401 errors auto-redirect to login, or require user acknowledgment first?

---

## 10. References

- **Original plan**: Superseded by this PRD (was `.arc/backlog/technical/plan-toast-notification-system.md`)
- **Roadmap context**: `.arc/backlog/ROADMAP.md` (Phase A item #1)
- **Chakra UI Toaster docs**: Chakra UI v3 component library
- **Color token strategy**: `.arc/reference/strategies/project/style/strategy-color-tokens.md`
- **Component styling strategy**: `.arc/reference/strategies/project/style/strategy-component-styling.md`
- **Accessibility research**: [Scott O'Hara on accessible toasts](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html)
- **WCAG guidance**: [WCAG 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable)

---

**Last Updated:** 2025-12-19
