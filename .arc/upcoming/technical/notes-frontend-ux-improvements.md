# Frontend UI/UX Improvements

**Work Classification**: Technical

**Document Purpose:** Track user interface and user experience improvements that make the app better without
adding new features. These cover visual polish, accessibility, performance optimizations, and UX infrastructure.

**Scope:**

- ✅ **UI Polish**: Visual refinements (spacing, typography, colors, responsive design)
- ✅ **UX Infrastructure**: Toast notifications, loading states, error handling, skeleton screens
- ✅ **Accessibility**: Keyboard navigation, ARIA labels, focus management, screen reader support
- ✅ **Performance**: Image lazy loading, code splitting, memoization, virtual scrolling
- ❌ **New Features**: Ratings, reviews, watchlist pages, etc. (see `feature/` docs for features)

**Related Documentation:**

- **Features**: `notes-feature-backlog.md`, `feature/notes-user-movie-data-features.md`
- **Technical Infrastructure**: `technical/notes-frontend-modernization.md` (TanStack Query, Redux, routing architecture)

**When to Use This Doc:**
Use this as a backlog when planning UI/UX polish work or addressing user experience debt. These are vetted
improvements, not random ideas.

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

## UI Polish & Visual Refinement

### General Visual Polish Phase

**Status:** Planned (not yet detailed)

**Context:** After technical modernization and feature implementation, a dedicated visual polish phase will refine the
overall UI/UX to production quality.

**Scope Areas:**

1. **Spacing & Layout Consistency**
   - Audit spacing scales across all pages
   - Consistent margins, padding, gaps
   - Responsive breakpoint refinements

2. **Typography Hierarchy**
   - Font sizes, weights, line heights
   - Heading consistency
   - Readability improvements

3. **Color & Theming**
   - Color palette consistency
   - Contrast ratio validation (WCAG AA/AAA)
   - Dark mode refinements (if applicable)

4. **Component Polish**
   - Button states (hover, active, disabled)
   - Form input styling
   - Card designs
   - Modal/dialog styling

5. **Responsive Design**
   - Mobile-first review
   - Tablet breakpoint optimization
   - Desktop layout polish

6. **Micro-interactions**
   - Hover effects
   - Transition smoothness
   - Loading animations
   - Button feedback

**When to Plan:**
After Backend Modernization + Frontend Modernization + initial feature work. This ensures we're polishing the
right things, not premature polish of features that might change.

**Deliverables:**

- Design audit document (before/after screenshots)
- Component library consistency review
- Responsive design checklist
- Accessibility audit

---

## Feature Enhancements (NOT New Features)

**Note:** This section is for enhancing EXISTING features, not adding new ones.

Examples:

- Better loading states for existing search
- Improved error messages for existing forms
- Smoother transitions between existing pages

**New features go in:** `notes-feature-backlog.md` or `feature/notes-user-movie-data-features.md`

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
