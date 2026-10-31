# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete:
   - Mark `[x]` and add completion notes
   - Move to `completed-atomic-{quarter}.md` in `reference/archive/` (insert at top)
   - Add branch line after completion notes (with empty line separator):

     ```markdown
     - [x] Task description
         - **Outcome:** What was done, key changes
         - **Files:** list of modified files

         - **Branch:** `feature/feature-name` or `technical/tech-name`
     ```

3. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

**Referencing completed work:** "see {task name} in `completed-atomic-2025-q4.md`"
    - Quick access: [Completed Atomic Tasks - 2025 Q4](../reference/archive/2025-q4/completed-atomic-2025-q4.md)

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- UI/UX Enhancements -->

- [ ] Revert MovieUserScore badge colors to traffic light scheme
    - Change: `≥7.5` success (green), `5.0-7.4` warning (yellow), `<5.0` error (red)
    - Current: success/info/warning doesn't communicate rating quality intuitively
    - Files: `frontend/src/components/movie/MovieUserScore.tsx`
    - Update tests if variant names change
    - Rationale: Traffic light is universally understood for ratings; not implying subjective judgment,
      just visual encoding of the community score number

- [ ] Evaluate: Hide or alter MovieUserScore badge for movies with no/insufficient votes
    - **Problem:** Unreleased movies and movies with few votes display "0.0" or low scores that are
      misleading - a 0.0 implies a terrible rating when it's actually null/no data
    - **Considerations:**
        - Unreleased movies: Should never show a rating badge (no votes possible yet)
        - Low vote count: TMDB has `vote_count` - should we require a minimum threshold?
        - Alternative displays: "Not yet rated", "NR", hide badge entirely, or show vote count context
        - MovieCard vs MovieDetail: May want different thresholds (card = stricter, detail = more lenient)
    - **Research needed:**
        - What does TMDB return for `vote_average` when `vote_count` is 0?
        - What thresholds do other platforms use (Letterboxd, IMDb, Rotten Tomatoes)?
        - Current MovieUserScore component structure and where rating data comes from
    - **Status:** Not committed - needs design decision before implementation
    - **Files:** `frontend/src/components/movie/MovieUserScore.tsx`, `MovieCard.tsx`, `MovieDetail.tsx`

- [ ] Fix UserMovieData icon button coloring on MovieCard
    - Bug: All icon buttons appear same color regardless of state
    - Expected: Neutral when flag=false, tertiary/highlighted when flag=true
    - Approach: Create recipe variant or compound variant for stateful ghost buttons
    - Files: `frontend/src/theme/recipes/` (new or existing), `frontend/src/components/movie/MovieCard.tsx`
    - Pattern will be reused in MovieDetail and other locations

<!-- Security -->

- [ ] Implement password complexity requirements
    - **Problem:** Currently only enforcing 8-character minimum; assumed we had complexity rules but we don't
    - **Backend changes:**
        - Add validators to `AUTH_PASSWORD_VALIDATORS` in `config/settings.py`:
            - Consider: uppercase, lowercase, digit, special character requirements
            - Research: Django's built-in validators vs custom validator
        - Ensure validation errors return clear, user-friendly messages via allauth
    - **Frontend changes:**
        - Update `PasswordResetDialog.tsx` validation to match backend rules
        - Update `Register.tsx` (if separate password field validation exists)
        - Consider: Real-time strength indicator vs submit-time validation
        - Ensure error messages from backend display properly in forms
    - **Testing:**
        - Backend: Test password validation rejects weak passwords, accepts strong ones
        - Frontend: Test validation feedback matches backend requirements
    - **Documentation:**
        - Update any user-facing help text about password requirements
    - **Files:** `backend/config/settings.py`, `frontend/src/components/auth/PasswordResetDialog.tsx`,
      `frontend/src/pages/user/Register.tsx`, related test files
    - **Rationale:** Security best practice; discovered during PR #9 review that complexity wasn't enforced

<!-- Test Organization -->

- [ ] Split `test_email_backend.py` into focused test modules
    - **Problem:** File is 613 lines, exceeds 400-line guideline
    - **Proposed split:**
        - `test_email_backend_config.py` - backend configuration tests
        - `test_email_resend_verification.py` - token-based resend flow
        - `test_email_registration_flow.py` - registration email tests
        - `test_email_adapter_errors.py` - EmailDeliveryError tests
        - `test_email_templates.py` - template rendering smoke tests
    - **Files:** `backend/apps/authentication/tests/integration/test_email_backend.py`
    - **Rationale:** Identified during PR #9 CodeRabbit review; file is well-organized but exceeds guidelines

<!-- Developer Experience -->

- [ ] Create DevTools debug page (`/dev/tools`)
    - **Purpose:** Centralized page for development/debugging utilities (separate from ThemeDebug)
    - **Initial features:**
        - API error simulation (trigger 500, 401, 403, network errors via apiClient)
        - Toast testing (all variants, positions, durations)
        - Auth state inspection (current user, tokens, session info)
    - **Future expansion:** Cache utilities, feature flags, performance toggles
    - **Files:** `frontend/src/pages/dev/DevTools.tsx`, add route in router
    - **Gate:** Only render in development mode (like ThemeDebug)
    - **Rationale:** Discovered need during `tasks-toast-notification-system` Task 3.7 - manual API error testing
    required exposing apiClient on window; proper DevTools page provides discoverable, organized utilities

<!-- Maintenance -->

- [ ] Upgrade Vitest to 4
    - **Current:** `vitest` and `@vitest/ui` pinned at `^3.2.7` in `frontend/package.json`
    - **Approach:** bump both together, work through the breaking changes, run the full frontend test suite
    - **Files:** `frontend/package.json`, `frontend/package-lock.json`, `frontend/vitest.config.ts`, any tests the
      upgrade breaks

- [ ] Run the frontend dev container as a non-root user
    - **Problem:** `frontend/Dockerfile` (`node:26-alpine`) sets no `USER`, so the dev server runs as root
    - **Approach:** `USER node`; check that the bind-mounted source and the `node_modules` volume stay writable
    - **Files:** `frontend/Dockerfile`, `infrastructure/docker-compose.yml` if volume ownership needs it

- [ ] Triage the backend test warnings
    - **Problem:** the backend suite passes with about 290 warnings, which bury real deprecations
    - **Approach:** group the warnings by source; fix each group, or filter it in the pytest configuration with a
      stated reason
    - **Files:** `backend/pyproject.toml` (pytest filters), the code each group points to

- [ ] Refresh PROJECT-STATUS
    - **Problem:** `.arc/reference/constitution/PROJECT-STATUS.md` predates the 2026 resume; its priorities and
      active-work sections are stale
    - **Approach:** rewrite the status sections against the current plan and active work
