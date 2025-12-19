# Task List: Toast Notification System

**PRD:** `.arc/active/technical/prd-toast-notification-system.md`
**Created:** 2025-12-19
**Branch:** `technical/toast-notification-system`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Establish consistent toast notification infrastructure using Chakra UI v3's built-in toaster,
integrated with our semantic token system.

## Scope

### Will Do

- Enhance existing toaster composition with semantic token styling
- Mount toaster provider at application root (composition exists but not mounted)
- Create toast recipe following existing alert pattern
- Integrate with auth flows (logout, session errors)
- Integrate with watchlist actions (add/remove with undo)
- Add API error interceptors (401, 5xx)
- Ensure accessibility (ARIA, reduced motion, pause on hover)

### Won't Do

- Promise toast patterns for reviews/email (Phase 2+ features)
- Notification history or persistent notifications
- Custom animations beyond Chakra defaults

---

## Tasks

### **Phase 1:** Infrastructure Setup

**Purpose:** Verify existing toaster composition and mount at application root.

**Discovery:** Toaster composition already exists at `components/core/chakra/toaster.tsx` with Chakra
defaults. It exports `toaster` instance and `Toaster` component but is NOT mounted anywhere.

- [ ] **1.1 Verify existing toaster composition**

    **Goal:** Confirm existing composition is correct and types compile.

    - [ ] **1.1.a Review `frontend/src/components/core/chakra/toaster.tsx`**
        - Verify `createToaster` config has `placement: "bottom-end"`, `pauseOnPageIdle: true` ✓
        - Verify exports: `toaster` instance and `Toaster` component ✓
        - Note: Currently uses Chakra defaults (e.g., `blue.solid` spinner) - will update in Phase 2

    - [ ] **1.1.b Verify TypeScript types compile**
        - Run `npm run type-check` in Docker
        - Ensure no type errors in existing file

- [ ] **1.2 Mount Toaster in application**

    - [ ] **1.2.a Add `Toaster` to `main.tsx`**
        - Import `Toaster` from `@/components/core/chakra/toaster`
        - Place `<Toaster />` inside `<Provider>` but outside `<App />`
        - Ensures toaster available to entire application

    - [ ] **1.2.b Verify toaster renders**
        - Start dev server, check browser console for errors
        - Add temporary test toast to verify rendering works

### **Phase 2:** Toast Recipe and Styling

**Purpose:** Create toast recipe using semantic tokens, consistent with existing alert recipe patterns.

- [ ] **2.1 Create toast recipe**

    **Goal:** Style toasts using semantic tokens for design system consistency.

    - [ ] **2.1.a Create `frontend/src/theme/recipes/toast.ts`**
        - Use `defineSlotRecipe` pattern from `alert.ts`
        - Slots: `root`, `indicator`, `title`, `description`, `actionTrigger`, `closeTrigger`
        - Base styles: layer background, border, shadow, padding
        - Status variants: `success`, `error`, `warning`, `info`, `loading`
        - Use semantic tokens: `layer-02`, `border-strong-01`, status colors
        - Match alert recipe pattern for status backgrounds (e.g., `success/10`)

    - [ ] **2.1.b Export recipe from `recipes/index.ts`**
        - Add `toastRecipe` to exports
        - Follow existing export pattern

    - [ ] **2.1.c Register recipe in theme system**
        - Add to `theme/index.ts` slot recipes
        - Run Chakra typegen: `npm run typegen`

    - [ ] **2.1.d Verify recipe compiles and applies**
        - Run type-check
        - Test toast appearance in browser (temporary test)

- [ ] **2.2 Update toaster composition to use recipe**

    - [ ] **2.2.a Apply recipe styling in `components/core/chakra/toaster.tsx`**
        - Use `useSlotRecipe` or inline recipe application
        - Replace Chakra defaults (e.g., `blue.solid`) with semantic tokens
        - Apply correct data attributes for status variants (`data-type`)
        - Ensure close button and action trigger styled correctly

    - [ ] **2.2.b Verify dark mode support**
        - Toggle color mode in dev
        - Confirm toasts render correctly in both modes

### **Phase 3:** Core Integrations

**Purpose:** Integrate toasts with existing auth and movie action flows.

- [ ] **3.1 Auth flow integrations**

    - [ ] **3.1.a Add logout success toast**
        - File: `frontend/src/hooks/auth/useAuth.ts`
        - In `logout()` function, add `toaster.success({ title: "Logged out successfully" })`
        - Place after `navigate(ROUTES.LOGIN)` call
        - Import `toaster` from `@/components/core/chakra/toaster`

    - [ ] **3.1.b Add session expired toast (401 interceptor)**
        - File: `frontend/src/services/apiClient.ts`
        - In response interceptor, when 401 detected and refresh fails
        - Add `toaster.error({ title: "Session expired", description: "Please log in again." })`
        - Ensure closable: true for critical errors
        - Import `toaster` from `@/components/core/chakra/toaster`

    - [ ] **3.1.c Test auth toasts manually**
        - Log out → verify success toast
        - Force 401 (clear tokens, make API call) → verify error toast

- [ ] **3.2 Watchlist action integrations**

    - [ ] **3.2.a Add watchlist success/error toasts to `useMovieActions.ts`**
        - File: `frontend/src/hooks/movie/useMovieActions.ts`
        - Remove TODO comments at lines 111 and 116
        - Add `toaster.success({ title: "Added to watchlist" })` or "Removed from watchlist"
        - Need to know current state to determine message (check `movie.user_movie_data?.on_watchlist`)
        - Add error toast: `toaster.error({ title: "Failed to update watchlist", description: errorMessage })`

    - [ ] **3.2.b Add undo action for watchlist removal**
        - When removing from watchlist, include action button:
        - `action: { label: "Undo", onClick: () => toggleWatchlist() }`
        - Only for removal (destructive action), not for add

    - [ ] **3.2.c Test watchlist toasts manually**
        - Add movie to watchlist → verify success toast
        - Remove movie → verify success toast with Undo button
        - Click Undo → verify movie re-added
        - Simulate error (network off) → verify error toast

- [ ] **3.3 API error interceptor integration**

    - [ ] **3.3.a Add 5xx error toast**
        - File: `frontend/src/services/apiClient.ts`
        - In response interceptor, detect 5xx status codes
        - Add `toaster.error({ title: "Server error", description: "Please try again later." })`
        - Avoid duplicate toasts (don't show both 5xx and specific action error)

    - [ ] **3.3.b Test server error toast**
        - Simulate 500 error (modify backend temporarily or mock)
        - Verify error toast appears

### **Phase 4:** Accessibility and Polish

**Purpose:** Verify accessibility compliance and finalize implementation.

- [ ] **4.1 Accessibility verification**

    - [ ] **4.1.a Verify ARIA attributes**
        - Inspect rendered toast in browser DevTools
        - Confirm `role="status"` or `role="alert"` present
        - Confirm `aria-live` region announces to screen readers

    - [ ] **4.1.b Verify keyboard accessibility**
        - Tab to close button - should focus
        - Escape key should dismiss (if supported by Chakra)
        - Action buttons should be keyboard accessible

    - [ ] **4.1.c Verify reduced motion**
        - Enable "Reduce motion" in OS settings
        - Confirm toast animations are disabled/reduced
        - Chakra should handle this automatically via `pauseOnPageIdle`

- [ ] **4.2 Duration and behavior verification**

    - [ ] **4.2.a Verify type-based durations**
        - Update `createToaster` config if needed for default duration
        - Pass `duration` per toast call for type-specific timing
        - Success: 4000ms, Info: 5000ms, Warning: 6000ms, Error: 8000ms

    - [ ] **4.2.b Verify pause on hover**
        - Hover over toast → timer should pause
        - Move mouse away → timer resumes

    - [ ] **4.2.c Verify multiple toast stacking**
        - Trigger multiple toasts rapidly
        - Confirm they stack without overlap
        - Confirm newest appears at bottom of stack

### **Phase 5:** Testing and Quality Gates

**Purpose:** Add tests and run all quality checks.

- [ ] **5.1 Write component tests**

    - [ ] **5.1.a Create test file `frontend/src/components/core/chakra/__tests__/toaster.test.tsx`**
        - Test: `toaster.success()` renders toast with correct title
        - Test: `toaster.error()` renders toast with correct type
        - Test: Action button renders when provided
        - Test: Close button is present
        - Mock or use testing library patterns for toast testing

    - [ ] **5.1.b Create integration test for auth toast**
        - Test: Logout flow triggers success toast
        - May need to mock `toaster` or use integration test patterns

    - [ ] **5.1.c Run tests - should PASS**

- [ ] **5.2 Run full quality gates**

    - [ ] **5.2.a Run backend tests**
        - `docker compose -f infrastructure/docker-compose.yml exec backend pytest apps/`
        - Should pass (no backend changes expected)

    - [ ] **5.2.b Run frontend tests**
        - `docker compose -f infrastructure/docker-compose.yml exec frontend npm test`
        - All tests should pass including new toast tests

    - [ ] **5.2.c Run linting**
        - Backend: `.venv-backend/bin/ruff check backend/apps/ backend/config/ --fix`
        - Frontend: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run lint`

    - [ ] **5.2.d Run type checking**
        - Python: `npx pyright backend/apps/ backend/config/ --project backend`
        - TypeScript: `docker compose -f infrastructure/docker-compose.yml exec frontend npm run type-check`

    - [ ] **5.2.e Run markdown linting**
        - `npx markdownlint-cli2 --fix "README.md" ".arc/**/*.md"`

---

## Implementation Notes

**Existing composition:** Toaster composition already exists at `components/core/chakra/toaster.tsx`
with Chakra defaults. This follows the project pattern of keeping Chakra infrastructure in `core/chakra/`
(alongside provider, color-mode, theme-provider, tooltip).

**Toaster placement:** The `<Toaster />` component must be inside the Chakra `Provider` to access theme
tokens. Placing it in `main.tsx` inside `<Provider>` but outside `<App />` ensures it's available globally
and doesn't re-mount on route changes.

**Recipe pattern:** The toast recipe should follow the same slot pattern as the existing `alertRecipe`
for consistency. The status variants (`success`, `error`, `warning`, `info`) use the same semantic tokens.

**Undo pattern:** For destructive actions (watchlist removal), the toast includes an action button that
re-triggers the toggle. This requires the toast to capture the movie context in its onClick closure.

**API interceptor considerations:** The 401 interceptor already handles token refresh. The toast should
only fire when refresh fails and user needs to re-authenticate. Avoid toast spam by checking if already
handling a refresh.

---

## Success Criteria

- [ ] Toaster renders at application root with semantic token styling
- [ ] Toast recipe integrates with theme system (light/dark modes work)
- [ ] Logout shows success toast
- [ ] Session expiry shows critical error toast
- [ ] Watchlist add/remove shows success toast
- [ ] Watchlist remove includes Undo action
- [ ] Server errors (5xx) show error toast
- [ ] Accessibility: ARIA roles, keyboard navigation, reduced motion
- [ ] All quality gates pass (tests, linting, type checking)
- [ ] Ready for merge to main
