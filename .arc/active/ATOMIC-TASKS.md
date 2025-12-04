# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete, move to `completed-atomic-{quarter}.md` in `reference/archive/` (insert at top)
3. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

**Referencing completed work:** "see {task name} in `completed-atomic-2025-q4.md`"
    - Quick access: [Completed Atomic Tasks - 2025 Q4](../reference/archive/2025-q4/completed-atomic-2025-q4.md)

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- UI/UX Fixes -->

- [ ] Revert MovieUserScore badge colors to traffic light scheme
    - Change: `≥7.5` success (green), `5.0-7.4` warning (yellow), `<5.0` error (red)
    - Current: success/info/warning doesn't communicate rating quality intuitively
    - Files: `frontend/src/components/movie/MovieUserScore.tsx`
    - Update tests if variant names change
    - Rationale: Traffic light is universally understood for ratings; not implying subjective judgment,
      just visual encoding of the community score number

- [ ] Fix UserMovieData icon button coloring on MovieCard
    - Bug: All icon buttons appear same color regardless of state
    - Expected: Neutral when flag=false, tertiary/highlighted when flag=true
    - Approach: Create recipe variant or compound variant for stateful ghost buttons
    - Files: `frontend/src/theme/recipes/` (new or existing), `frontend/src/components/movie/MovieCard.tsx`
    - Pattern will be reused in MovieDetail and other locations

<!-- Auth Refactoring -->

- [ ] Refactor auth domain technical debt
    - Context: Auth code accumulated during early development before logging system existed.
      Circular dependencies suppressed with eslint-disable, inconsistent return types, direct
      hook imports bypassing context pattern.

    - Subtasks (execute in order):
        - [ ] **1. Fix circular dependencies in useAuth.ts** (Option A: useRef pattern)
            - Wrap `logout` callback in `useRef` to break dependency chain
            - Wrap `getUserDetails` callback in `useRef` to break dependency chain
            - Update effects at lines 150 and 170 to call via `ref.current()`
            - Remove 2 eslint-disable comments (lines 150, 170) - deps now correct
            - Keep 2 intentional eslint-disable comments (lines 137, 243) with clear "why" comments
            - Run type-check to verify

        - [ ] **2. Fix architecture violation in MovieDetail.tsx**
            - Change `import { useAuth }` to `import useAuthContext`
            - Update usage from `useAuth()` to `useAuthContext()`
            - This was creating duplicate hook instance with separate state/effects

        - [ ] **3. Define AuthResult type and standardize return types**
            - Create `AuthResult<T>` type in `@types/auth-state.d.ts`:
              `{ success: true; data: T } | { success: false; error: AuthError }`
            - Define `AuthError` type with `status`, `message`, `code?` fields
            - Update `login()` return type from 4-variant union to `Promise<AuthResult<void>>`
            - Update `register()` return type from 2-variant union to `Promise<AuthResult<void>>`
            - Update `AuthStateProps` interface to match
            - Update consumers (Login.tsx, Register.tsx) to use new pattern

        - [ ] **4. Migrate console statements to logger service**
            - `useAuth.ts`: 19 calls → logger (debug for flow, warn for warnings, error for errors)
            - `authService.ts`: 5 CSRF warnings → logger.warn()
            - `apiClient.ts`: 1 BASE_URL debug → logger.debug()
            - Ensure logger import added to each file

        - [ ] **5. Run quality gates**
            - Frontend type-check, lint, tests
            - Verify no regressions in auth flows

    - Files:
        - `frontend/src/hooks/useAuth.ts` (primary)
        - `frontend/src/@types/auth-state.d.ts` (types)
        - `frontend/src/pages/movie/MovieDetail.tsx` (fix direct import)
        - `frontend/src/pages/user/Login.tsx` (consumer update)
        - `frontend/src/pages/user/Register.tsx` (consumer update)
        - `frontend/src/services/authService.ts` (logging)
        - `frontend/src/services/apiClient.ts` (logging)

    - Estimate: 60-90 min total

<!-- Miscellaneous -->

- [ ] Investigate login session loss during testing
    - Context: session appeared lost during theme system visual testing (no explicit logout)
    - Test session persistence during normal navigation
    - Test session across browser refreshes
    - Test session timeout behavior
    - Document reproduction steps if found, or close as testing artifact

- [ ] Investigate pytest-cov coverage measurement issue (external research)
    - Observed: `CoverageWarning: Module apps.movie was previously imported, but not measured`
    - Symptom: Some modules show 0% coverage (helpers.py, schemas.py) while others show 100% (api.py)
      despite tests clearly exercising all modules
    - Likely cause: Module import timing - modules imported during test collection/fixture setup
      before coverage measurement starts
    - Research: pytest-cov documentation, Django-specific coverage patterns, potential fixes
    - Goal: Either fix configuration or document as known limitation with workaround
    - Context: Discovered during endpoint consolidation quality gates (Phase 6.1.b)
