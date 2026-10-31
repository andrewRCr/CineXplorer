# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. No new entries ([ADR-021](../reference/adr/adr-021-capture-in-a-personal-inbox.md)): new one-off work waits in the
   personal inbox until it runs as an errand. The entries under "Active" run as errands too.
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

<!-- UI/UX Enhancements -->

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
