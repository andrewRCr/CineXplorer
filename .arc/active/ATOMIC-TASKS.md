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

<!-- Code Quality / Refactoring -->

- [ ] Auth flow refactor: architecture, error handling patterns, and accessibility
    - **Context:** Code quality analysis (commit a089f65) + UX research on auth error patterns.
      Current implementation has duplicate toast bug, misuses toasts for auth errors (should be
      alerts per OWASP/Carbon/Material research), and lacks WCAG compliance on alerts.
    - **Research findings (see external-research-analyst output):**
        - Auth errors (wrong credentials) → persistent alert/banner, NOT toast
        - Validation errors (empty field, format) → inline field errors
        - Success feedback → toast is fine
        - Toasts auto-dismiss; users may miss critical auth error info
    - **Architectural decisions:**
        - **Toast ownership:** Hooks return data only, components control presentation
        - **Error pattern:** Auth errors use alerts (persistent), success uses toasts (ephemeral)
        - **OAuth isolation:** Extract `useOAuthFlow` hook to contain complexity
    - **Subtasks:**
        - **Phase 1: Architecture (~1.5 hrs)**
            - [ ] **1.1** Remove toast coupling from useAuth
                - Remove `toaster` import from useAuth.ts
                - `login()` returns `AuthResult` without showing toasts/alerts
                - `register()` returns `AuthResult` without showing toasts/alerts
                - Keep OAuth welcome toast (callback-triggered, success case)
            - [ ] **1.2** Extract useOAuthFlow hook
                - Move: `oauthLoading`, `minDisplayTimeElapsed`, timing effects, `initializeOAuthLogin`
                - Isolate eslint-disable comments to this hook (documented complexity)
                - Export: `{ oauthLoading, initializeOAuth, isProcessingCallback }`
        - **Phase 2: Error handling alignment (~1.5 hrs)**
            - [ ] **2.1** Create WCAG-compliant alert component
                - `components/common/AuthAlert.tsx` (or enhance existing Alert usage)
                - Required: `role="alert"`, `aria-live="assertive"`, proper focus management
                - Support dismissible variant with close button
                - Support action variant (e.g., "Resend" for email verification)
                - Include recovery links pattern ("Forgot password?", "Try another method")
            - [ ] **2.2** Update Login.tsx error handling
                - Auth errors → alert (using new component), NOT toast
                - Email verification → alert with Resend action (revert from toast)
                - Validation errors → keep inline on fields (Formik pattern)
                - Success → loading toast → success toast (welcome message)
                - Remove duplicate field errors (single alert, not both fields)
            - [ ] **2.3** Update Register.tsx error handling
                - Registration errors → alert, NOT toast
                - Success → toast ("Account created, check email")
        - **Phase 3: State simplification (~45 min)**
            - [ ] **3.1** Simplify Login.tsx state
                - Use `useOAuthFlow` hook (removes ~4 state variables)
                - Remove redundant `rememberMeChecked` (use formik.values directly)
                - Consolidate error states if possible
            - [ ] **3.2** Clean up alert rendering
                - Use new AuthAlert component for all alert cases
                - Remove duplicate Alert code (~60 lines)
        - **Phase 4: Verification (~45 min)**
            - [ ] **4.1** Functional testing
                - Email/password login: success, wrong credentials, email verification needed
                - OAuth flows: Google, GitHub
                - Registration: success, duplicate email/username errors
                - Remember me checkbox
            - [ ] **4.2** Accessibility testing
                - Screen reader announces alerts properly
                - Focus moves to alert on error
                - No color-only error indication
            - [ ] **4.3** Verify no duplicate feedback (no toast + alert for same error)
    - **Files:** `useAuth.ts`, `Login.tsx`, `Register.tsx`, new `useOAuthFlow.ts`, new `AuthAlert.tsx`
    - **Estimated:** 4-5 hours total
    - **Branch:** Continue on `technical/toast-notification-system`
    - **Updates required:** Component styling strategy (alert vs toast guidance already added)

- [ ] Backend: Return user email in "email not verified" error response
    - **Context:** Frontend can only offer "Resend" if user logged in with email (not username).
      Backend should return masked email in error response.
    - **Current:** `{"detail": "Please verify your email", "code": "EMAIL_NOT_VERIFIED"}`
    - **Proposed:** Add `"email": "t***@example.com"` to response
    - **Security:** Masked email reveals domain but not full address - acceptable tradeoff
    - **Files:** `backend/apps/authentication/api.py`
    - **Related:** Auth flow refactor (frontend will use this once available)

<!-- UI/UX Enhancements -->

- [ ] Evaluate toast positioning strategy (priority-based placement)
    - **Context:** Important actionable toasts may warrant more prominent positioning than routine
      feedback. However, research indicates auth errors should use alerts, not toasts - so this
      may be lower priority now.
    - **Remaining use cases for prominent toasts:**
        - Destructive action confirmations (delete account, etc.)
        - Time-sensitive notifications
    - **Options:** Priority prop, separate toaster instances, dynamic placement
    - **Status:** Evaluate after auth refactor complete - scope may be reduced

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

<!-- Miscellaneous -->

- [ ] Investigate login session loss during testing
    - Context: session appeared lost during theme system visual testing (no explicit logout)
    - Test session persistence during normal navigation
    - Test session across browser refreshes
    - Test session timeout behavior
    - Document reproduction steps if found, or close as testing artifact

<!-- Data Quality -->

- [ ] Examine the following movies for production company patterns (i.e., do any of them produce 90%+ 'adult' content?)
  for potential bulk blacklisting; if not found, blacklist individually (movies are mislabeled as non-adult on TMDB):
    - 280460, 50633, 1113566, 264865, 199214, 329872, 406167, 222270, 264975, 1241742, 89632, 28325, 134451, 318947,
      458353, 40348, 397298, 29194, 460229, 97697, 1069286, 28555, 33790, 315294, 57267, 45042, 196013, 29926, 333941,
      433111, 141585, 151182, 715394, 505039, 474531, 331250, 278954, 424626, 225450, 564823, 259903, 110705, 220688,
      127744, 64512, 154910, 105428, 393249, 423468, 436551, 285553, 284143, 70479, 295389, 70638, 28809, 90787,
      36888, 220873, 420200, 265255, 69403, 265186, 306107, 265181, 860521, 424829, 40132, 197644, 598691, 5913,
      410385, 496032, 371748, 281197, 135003, 797816, 272847, 415727, 311917, 264870, 264868, 544082, 899338, 194789,
      36887, 220897, 193458, 183584, 485736, 259265, 124389, 265255, 36886
    - **Findings (evaluation complete, blacklisting pending):**
        - Only bulk candidate at 90%+ threshold: Deutsche Dynamik Film (id=81980), 5/5 matches (small catalog).
        - Rapid Film, Retromedia, Vivamax, MRG, and others < 90% by TMDB title/keyword heuristics + external review.
        - Additional heuristic matches (not in original list) moved to `temp-notes-blacklist-candidates.md` for later action.
