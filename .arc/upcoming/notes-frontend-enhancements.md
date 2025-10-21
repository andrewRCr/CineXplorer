# Frontend Enhancements

Progressive improvements and features deferred for later implementation.

This document tracks "nice to have" features and UX improvements that aren't architectural fixes.
When planning enhancement work, use this as a backlog of vetted ideas.

---

## UX Improvements

### Toast Notification System

**Status:** Needed
**Priority:** High
**Context:** Multiple features need user feedback but lack visual confirmation

**Identified Needs:**

1. **Logout confirmation** (Task 8 - OAuth headless migration)
   - Issue: Logout redirects to login, but no confirmation shown
   - Impact: Users on public pages don't see clear feedback
   - Expected: "Logged out successfully" toast before/during redirect

2. **Authentication error feedback** (Task 8.5.2 - Manual testing)
   - Issue: 401 errors are handled gracefully but silently
   - Impact: User appears logged in but actions fail with no explanation
   - Expected: "Session expired, please log in again" error toast

3. **Action success feedback** (Watchlist toggle)
   - Issue: Optimistic UI updates work, but no confirmation
   - Impact: User doesn't know if server request succeeded
   - Expected: "Added to watchlist" / "Removed from watchlist" success toast

**Implementation Options:**

- **Chakra UI Toast** (already using Chakra, zero deps)
- **Sonner** (modern, accessible, great DX)
- **React Hot Toast** (lightweight, popular)

**Technical Notes:**

- Should respect reduced-motion preferences
- Consistent positioning (top-right or bottom-right)
- Auto-dismiss with manual close option
- Stack multiple toasts gracefully
- Consider toast queue/prioritization

**Related Code:**

- `frontend/src/hooks/useMovieActions.ts:116` - TODO: Show error notification/toast
- `frontend/src/components/movie/MovieCard.tsx:256` - TODO: Show success notification
- `frontend/src/hooks/useAuth.ts:257-294` - Logout needs confirmation toast

**Acceptance Criteria:**

- [ ] Toast system integrated and configured
- [ ] Logout shows confirmation toast
- [ ] 401 errors show "session expired" toast
- [ ] Watchlist toggle shows success/error toasts
- [ ] Accessible (screen reader announcements)
- [ ] Respects reduced-motion preferences

---

## Feature Additions

### (Placeholder for future feature ideas)

Examples: Advanced search, movie recommendations, user profiles, social features

---

## Performance Optimizations

### (Placeholder for non-architectural perf work)

Examples: Image lazy loading, virtual scrolling, memoization improvements

---

## Accessibility Improvements

### (Placeholder for a11y enhancements)

Examples: Keyboard navigation, ARIA labels, focus management

---

**Note:** These are vetted, documented needs - not random ideas. When planning sprint work,
pull from this list based on priority and available capacity.
