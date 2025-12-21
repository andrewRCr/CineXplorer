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

<!-- Test Infrastructure -->

<!-- UI/UX Fixes -->

- [ ] Evaluate toast positioning strategy (priority-based placement)
    - **Context:** During toast system migration, identified that important actionable toasts
      (auth errors with resend actions, destructive confirmations) may warrant more prominent
      positioning than routine feedback (welcome messages, watchlist updates).
    - **Consideration:**
        - Critical toasts → top-center or bottom-center (more prominent)
        - Standard toasts → bottom-end (current default, less intrusive)
    - **Implementation options:**
        - Add `priority` option to toaster wrapper that maps to placement
        - Create separate toaster instances per placement
        - Use Chakra's placement prop dynamically
    - **UX concern:** Must feel intentional, not inconsistent. Critical toasts should "feel"
      different (closable, longer duration, prominent position) so placement difference is justified.
    - **Scope:** Evaluate feasibility, propose approach, may result in component styling strategy update
    - **Related:** Toast notification system task list, component styling strategy

- [ ] Refactor auth flow: decouple toasts, simplify state, extract OAuth logic
    - **Context:** Code quality analysis completed (see commit a089f65). Identified duplicate toast bug,
      state complexity, and OAuth logic sprawl. This refactor implements the architectural decisions made.
    - **Architectural decisions:**
        - **Toast ownership:** Hooks return data only, components control presentation
        - **Shared utilities:** `authFeedback.ts` for consistent toast patterns (optional helper)
        - **OAuth isolation:** Extract `useOAuthFlow` hook to contain OAuth complexity and eslint-disables
    - **Subtasks:**
        - [ ] **1. Remove toast coupling from useAuth** (~45 min)
            - Remove `toaster` import from useAuth.ts
            - Modify `login()` to return `AuthResult` without showing toasts
            - Modify `register()` to return `AuthResult` without showing toasts
            - Keep OAuth welcome toast in useAuth (it's callback-triggered, not caller-controlled)
        - [ ] **2. Create authFeedback.ts utility** (~15 min)
            - `showAuthLoadingToast(id, title)` - returns toastId
            - `handleAuthResult(toastId, result, successMessage)` - updates toast based on result
            - Provides consistency without coupling
        - [ ] **3. Update Login.tsx to handle toasts** (~30 min)
            - Show loading toast before calling login
            - Handle success/error cases with toast updates
            - Email verification case: dismiss generic, show actionable toast (existing logic)
            - Remove redundant `rememberMeChecked` state (test checkbox still works)
        - [ ] **4. Update Register.tsx to handle toasts** (~15 min)
            - Show loading toast before calling register
            - Handle success/error cases with toast updates
        - [ ] **5. Extract useOAuthFlow hook** (~45 min)
            - Move from Login.tsx: `oauthLoading`, `minDisplayTimeElapsed`, timing effects
            - Move `initializeOAuthLogin` function
            - Isolate eslint-disable comments to this hook
            - Export: `{ oauthLoading, initializeOAuth }`
        - [ ] **6. Simplify Login.tsx** (~20 min)
            - Use `useOAuthFlow` hook
            - Remove extracted OAuth state/logic
            - Verify all auth flows still work
        - [ ] **7. Extract DismissibleAlert component** (~20 min, optional)
            - Create reusable component for success/error alerts with dismiss button
            - Reduces ~60 lines of duplicate Alert code in Login.tsx
            - Location: `components/common/DismissibleAlert.tsx`
        - [ ] **8. Verify and test** (~30 min)
            - Test email/password login flow (success, error, email verification)
            - Test OAuth flows (Google, GitHub)
            - Test registration flow
            - Test remember me checkbox works correctly
            - Verify no duplicate toasts
    - **Files:** `useAuth.ts`, `Login.tsx`, `Register.tsx`, new `useOAuthFlow.ts`, new `authFeedback.ts`
    - **Estimated:** 3-4 hours total
    - **Branch:** Continue on `technical/toast-notification-system` (directly supports toast migration)

- [ ] Backend: Return user email in "email not verified" error response
    - **Context:** Currently when login fails due to unverified email, frontend can only offer
      "Resend" action if user logged in with email (not username). Backend should return the
      user's email (or masked version like `t***@example.com`) in the error response.
    - **Current behavior:** Error response is `{"detail": "Please verify your email", "code": "EMAIL_NOT_VERIFIED"}`
    - **Proposed:** Add `"email": "t***@example.com"` to error response
    - **Security consideration:** Masked email reveals domain but not full address - acceptable tradeoff
    - **Files:** `backend/apps/authentication/api.py` (login endpoint error handling)
    - **Related:** Auth flow refactor task above (frontend will use this once available)

- [ ] Improve login form error message UX
    - **Current behavior:** On failed login, both username AND password fields show identical
      error message: "Unable to authenticate with provided credentials"
    - **Issues:**
        1. Duplicate messaging looks sloppy
        2. Message doesn't mention "email" as an option (username field accepts email)
        3. Both fields flagged when typically only one is incorrect
    - **Constraints:**
        - Backend intentionally returns generic error (security: don't reveal valid usernames)
        - Cannot show field-specific accuracy without backend changes
    - **Proposed approach:**
        - Option A: Show error once as general alert (not on individual fields)
        - Option B: Show on password field only with improved wording: "Invalid email/username or password"
        - Option C: Show on username field only, rephrase to "Email, username, or password is incorrect"
    - **Files:** `frontend/src/pages/user/Login.tsx` (lines 165-192)
    - **Decision needed:** Which option provides best UX without security compromise?

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
