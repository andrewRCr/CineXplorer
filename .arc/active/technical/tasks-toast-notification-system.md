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
- Integrate with auth flows (login, register, logout, email verification resend, session errors)
- Integrate with watchlist actions (add/remove with undo)
- Add API error interceptors (401, 5xx)
- Use promise toast pattern for async operations (login, register, email resend, watchlist)
- Ensure accessibility (ARIA, reduced motion, pause on hover)

### Won't Do

- Notification history or persistent notifications
- Custom animations beyond Chakra defaults
- Toast integrations for unimplemented features (ratings, reviews, liked, watched, profile/settings updates)

---

## Tasks

### **Phase 1:** Infrastructure Setup

**Purpose:** Verify existing toaster composition and mount at application root.

**Discovery:** Toaster composition already exists at `components/core/chakra/toaster.tsx` with Chakra
defaults. It exports `toaster` instance and `Toaster` component but is NOT mounted anywhere.

- [x] **1.1 Verify existing toaster composition**

    Confirmed composition at `components/core/chakra/toaster.tsx` is correct:
    - `placement: "bottom-end"`, `pauseOnPageIdle: true` ✓
    - Exports `toaster` instance and `Toaster` component ✓
    - Uses Chakra defaults (e.g., `blue.solid` spinner) - to update in Phase 2

    - [x] **1.1.a Review existing composition** - Verified config and exports
    - [x] **1.1.b Verify TypeScript types compile** - `npm run type-check` passed

- [x] **1.2 Mount Toaster in application**

    Added `<Toaster />` to `main.tsx` inside `<Provider>`, after `<App />`.

    - [x] **1.2.a Add `Toaster` to `main.tsx`** - Import and mount complete
    - [x] **1.2.b Verify toaster renders** - Type check, lint, and all tests pass; frontend serves HTTP 200

### **Phase 2:** Toast Recipe and Styling

**Purpose:** Create toast recipe using semantic tokens, consistent with existing alert recipe patterns.

- [x] **2.1 Create toast recipe**

    Created `theme/recipes/toast.ts` with 6 slots and 5 status variants following alert recipe pattern.
    Registered in theme system and generated types.

    - [x] **2.1.a Create recipe file** - 6 slots, 5 status variants (success/error/warning/info/loading)
    - [x] **2.1.b Export from recipes/index.ts** - Added `toastRecipe` export
    - [x] **2.1.c Register in theme system** - Added to slotRecipes, ran typegen
    - [x] **2.1.d Verify compilation** - Type check and lint passed

- [x] **2.2 Update toaster composition to use recipe**

    Updated `components/core/chakra/toaster.tsx` with semantic token styling.
    Replaced Chakra defaults (`blue.solid`) with status-based semantic tokens.

    - [x] **2.2.a Apply semantic styling** - Status-based styles map, all slots styled
    - [x] **2.2.b Verify dark mode support** - Semantic tokens auto-adapt; all 723 tests pass

- [x] **2.3 Documentation and visual validation**

    Updated strategy doc and ThemeDebug page with toast documentation and interactive demos.

    - [x] **2.3.a Update component styling strategy** - Added Toasts section to Status Indicators
    - [x] **2.3.b Add toast demonstration to ThemeDebug** - Interactive triggers for all 5 variants

### **Phase 3:** Core Integrations

**Purpose:** Integrate toasts with all existing auth and movie action flows using promise toast pattern
for async operations.

- [x] **3.1 Login flow integration**

    - [x] **3.1.a Add promise toast to login**

        Added loading → success/error toast pattern to login flow with personalized greeting.

        **Backend changes:**
        - Added `username` to `UserProtocol` in `authentication_service.py`
        - Added `username` and `first_name` fields to `TokenResponseSchema`
        - Updated `obtain_token` and `refresh_token` to include user identity

        **Frontend changes:**
        - Regenerated API types from OpenAPI schema
        - Implemented toast in `useAuth.ts` using manual loading/update pattern
        - Success: "Welcome back, {first_name || username}!" (4s duration)
        - Error: Title + API error message description (8s, closable)
        - Loading: "Logging in..." (persists until resolved)

        **Expanded scope (discovered during testing):**

        - **OAuth toast:** Added success toast to OAuth callback flow in `useAuth.ts`
        - **OAuth detection bug fix:** Changed `sessionStorage.getItem('oauth_in_progress') === 'true'`
          to `!== null` (we store provider name, not 'true')
        - **Toast styling:** Changed from 10% opacity tint to solid `layer-03` background with 4px
          colored left accent border for readability over content
        - **White flash fix:** Added `BackgroundSync` component in `provider.tsx` that stores
          resolved background color in `cinexplorer-bg` localStorage; `index.html` reads this
          before React loads (self-maintaining across theme changes)
        - **Docs updated:** strategy-component-styling.md, ThemeDebug FeedbackStatusSection

        **Atomic task created:** Login form error UX (duplicate error on both fields)

    - [x] **3.1.b Test login toasts manually**
        - Valid credentials → success toast with personalized name ✓
        - Invalid credentials → error toast with message ✓
        - OAuth login (Google/GitHub) → success toast ✓
        - Toast styling readable over content ✓

- [x] **3.2 Register flow integration**

    - [x] **3.2.a Add promise toast to register**

        Added loading → success/error toast pattern to register flow.
        - Loading: "Creating account..."
        - Success: "Account created!" with description "Check your email to verify your account."
        - Error: "Registration failed" with API error message (email taken, validation, etc.)

    - [x] **3.2.b Test register toasts manually**

        Tested and verified. Discovered and fixed several issues during testing:
        - Duplicate feedback removed (Register.tsx errorMessage, Login.tsx generalError)
        - Backend registration atomicity fixed (transaction.atomic wrapper)
        - Email delivery verification added (CustomAccountAdapter.send_mail raises on failure)
        - ZeptoMail settings fixed (region config, token prefix)
        - Allauth stubs added for send_verification_email_to_address

- [x] **3.3 Email verification flow alignment**

    **Note:** Task 3.3.a description was outdated - the atomic task "Auth flow refactor" already
    implemented FloatingAlert (not toast) per updated policy. Remaining work was bug fixes and
    UX refinement.

    - [x] **3.3.a Implement email verification FloatingAlert** *(completed in atomic task)*

        Already implemented during "Auth flow refactor" atomic task:
        - FloatingAlert (blocking, center) with "Resend verification" action button
        - Uses `useLoginAlerts` hook for alert state management
        - Resend action triggers `handleResendVerification()` with success/error toasts

    - [x] **3.3.b Fix email propagation and UX refinement**

        Fixed resend button not appearing and improved UX:

        1. Added `email?: string` to `AuthError` interface - backend sends masked email
        2. Extract `email` from backend response in `useAuth.ts` error parsing
        3. Updated `handleLoginError` to use `error.email` from backend (not username field)
        4. Changed alert status from `error` to `info` - workflow requirement, not user mistake
        5. Fixed status code check (403, not 400) for email verification errors
        6. Improved messaging to show masked email and explain resend availability

        **Current limitation:** Resend only works when user logs in with email (not username).
        Task 3.3.c addresses this by implementing token-based resend.

        **Strategy doc updated:** Added Status column to Alert vs Toast table, documented
        alert status selection guidelines (error/warning/info/success semantics).

        **Files:** `auth-state.d.ts`, `useAuth.ts`, `Login.tsx`, `strategy-component-styling.md`

    - [x] **3.3.c Implement resend token pattern** *(enables resend for all login methods)*

        Implemented opaque resend token system per OWASP best practices:

        - [x] **3.3.c.i Backend: Generate resend token on unverified login**
            - `_generate_resend_token()`: 64-char token via `secrets.token_urlsafe(48)`
            - Hash stored in Django cache (Redis): `resend_verification_token:{hash} -> user_id`
            - 10-minute expiration (`RESEND_TOKEN_EXPIRY_SECONDS = 600`)
            - Token included in 403 response alongside masked email

        - [x] **3.3.c.ii Backend: Update `/resend-verification/` endpoint**
            - Token-only (no backwards compat needed - we control both ends)
            - `_validate_resend_token()`: validates, extracts user_id, single-use (deletes)
            - All paths return 200 with generic message (prevents enumeration)
            - Schema: `ResendVerificationInputSchema.resend_token: str`

        - [x] **3.3.c.iii Frontend: Use resend token from error response**
            - `AuthError.resend_token` added to type definition
            - `useAuth.ts` extracts token from 403 response
            - `useLoginAlerts.ts` updated: `LoginAlert.resendToken`, handler uses token
            - `authService.resendVerificationEmail()` sends `{ resend_token }`
            - `Login.tsx` simplified: no username param needed, always has resend

        **Tests:** 15 unit tests covering token generation, validation, single-use,
        roundtrip, and all resend flow paths. DRY helpers: `mock_token_validation`,
        `setup_user_for_resend`.

        **Files:** `authentication_service.py`, `schemas.py`, `auth-state.d.ts`,
        `useAuth.ts`, `Login.tsx`, `useLoginAlerts.ts`, `authService.ts`,
        `test_helpers.py`, `test_authentication_service_email_verification.py`

    - [x] **3.3.d Test email verification flow manually**

        All scenarios verified:
        - Unverified user login (email) → **info** FloatingAlert with resend ✓
        - Unverified user login (username) → **info** FloatingAlert with resend ✓
        - Click resend → success toast, email received ✓
        - Rate limited (429) → "Too many requests" toast ✓
        - Expired token → covered by unit tests (returns generic success)

        **Bonus fix:** Added 429 rate limit detection in `handleResendVerification`
        for clearer error messaging.

- [x] **3.4 Logout flow integration**

    - [x] **3.4.a Add logout success toast**

        Added `priorityToaster.success({ title: "You've been logged out" })` after `navigate(ROUTES.LOGIN)`
        in the `logout()` function. Uses `priorityToaster` for auth flow consistency (top-right position,
        same as login).

        **Infrastructure enhancement:** Added policy-based duration defaults to toaster composition.
        All status methods now apply durations from strategy doc automatically:
        - success: 4s, info: 5s, warning: 6s, error: 8s, loading: persists
        - Call sites can override with explicit `duration` prop
        - Removed explicit `duration: 4000` from existing login toasts (now use defaults)

        **Files:**
        - `frontend/src/hooks/auth/useAuth.ts` (logout + OAuth login cleanup)
        - `frontend/src/pages/user/Login.tsx` (login cleanup)
        - `frontend/src/components/core/chakra/toaster.tsx` (duration wrapper)

    - [x] **3.4.b Test logout toast manually** - Verified with OAuth and regular login flows

- [ ] **3.5 Session expired (401 interceptor) integration**

    **Policy alignment:** Session expired is a blocking state requiring user action (re-login).
    Per toast/alert policy, blocking states use FloatingAlert, not toast.

    - [ ] **3.5.a Add session expired FloatingAlert**
        - File: `frontend/src/services/apiClient.ts` (interceptor detection)
        - When 401 detected and refresh fails, set a flag/event for Login page to show alert
        - **Approach options:**
          1. Redirect to `/login?session_expired=true` and handle in Login.tsx
          2. Use a global state/context for session expired alert
        - FloatingAlert (blocking, center): "Session expired. Please log in again."
        - Status: `info` (not error - session expiry is expected behavior, not user mistake)
        - Ensure only fires once (not on every failed request during refresh)

    - [ ] **3.5.b Test 401 flow manually**
        - Clear tokens, make API call → verify redirect + FloatingAlert on login page

- [ ] **3.6 Watchlist action integrations**

    - [ ] **3.6.a Add watchlist promise toasts to `useMovieActions.ts`**
        - File: `frontend/src/hooks/movie/useMovieActions.ts`
        - Remove TODO comments at lines 111 and 116
        - Use `toaster.promise()` or loading/success/error pattern
        - Success: "Added to watchlist" or "Removed from watchlist" based on action
        - Error: "Failed to update watchlist" with description

    - [ ] **3.6.b Add undo action for watchlist removal**
        - When removing from watchlist, include action button:
        - `action: { label: "Undo", onClick: () => toggleWatchlist() }`
        - Only for removal (destructive action), not for add

    - [ ] **3.6.c Test watchlist toasts manually**
        - Add movie to watchlist → verify success toast
        - Remove movie → verify success toast with Undo button
        - Click Undo → verify movie re-added
        - Simulate error (network off) → verify error toast

- [ ] **3.7 API error interceptor (5xx) integration**

    - [ ] **3.7.a Add 5xx error toast**
        - File: `frontend/src/services/apiClient.ts`
        - In response interceptor, detect 5xx status codes
        - Add `toaster.error({ title: "Server error", description: "Please try again later.", closable: true })`
        - Avoid duplicate toasts (don't show both 5xx and specific action error)

    - [ ] **3.7.b Test server error toast**
        - Simulate 500 error → verify error toast appears

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
- [ ] Login shows promise toast (loading → success/error)
- [ ] Register shows promise toast (loading → success with email verification note)
- [ ] Email resend shows promise toast (loading → success/error)
- [ ] Logout shows success toast
- [ ] Session expiry (401) shows critical error toast
- [ ] Watchlist add/remove shows success toast
- [ ] Watchlist remove includes Undo action
- [ ] Server errors (5xx) show error toast
- [ ] Accessibility: ARIA roles, keyboard navigation, reduced motion
- [ ] All quality gates pass (tests, linting, type checking)
- [ ] Ready for merge to main
