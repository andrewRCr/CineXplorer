# Task List: E2E Testing Foundation

**PRD:** `.arc/backlog/technical/prd-e2e-testing-foundation.md`
**Created:** 2025-12-26
**Branch:** `technical/e2e-testing-foundation`
**Base Branch:** `main`
**Status:** Pending

## Overview

**Purpose:** Establish Playwright-based E2E testing infrastructure with CI integration, covering authentication,
movie discovery, and watchlist flows.

## Scope

### Will Do

- Create `e2e/` directory at repo root with Playwright configuration
- Implement Page Object Model pattern for maintainable tests
- Cover authentication flows (password + OAuth mocked)
- Cover browse/discovery flows (pages, search, filters, detail)
- Cover watchlist operations (current minimal implementation)
- Cover mobile-specific tests (layout, touch targets, functional parity)
- Add CI integration with tiered execution (smoke on PRs, full on main)
- Test on Chromium, Firefox, and WebKit (parallelized)
- Test on mobile viewports (iPhone 14, Pixel 5) - non-blocking discovery
- Update documentation (testing strategy, quick reference, technical overview)

### Won't Do

- Visual regression testing (screenshot comparison)
- Performance/load testing
- Features not yet implemented (ratings, reviews, user profile UIs)
- Real OAuth provider testing (mocked at callback level)
- Email verification flow completion (test up to "check your email" prompt)
- Blocking mobile CI (discovery-only until mobile pass addresses issues)

---

## Tasks

### **Phase 1:** Infrastructure Setup

- [ ] **1.1 Create `e2e/` directory structure**

    - [ ] **1.1.a Initialize directory and package configuration**
        - Create `e2e/` at repo root
        - Create `package.json` with Playwright dependencies
        - Create `tsconfig.json` for TypeScript support
        - Create `.gitignore` for test artifacts (`test-results/`, `playwright-report/`)

    - [ ] **1.1.b Create subdirectory structure**
        - Create `tests/` for test specs (organized by feature)
        - Create `pages/` for Page Object Models
        - Create `fixtures/` for test data and setup
        - Create `utils/` for shared helpers

- [ ] **1.2 Configure Playwright for full-stack testing**

    - [ ] **1.2.a Create `playwright.config.ts`**
        - Configure `testDir`, `fullyParallel`, `retries`
        - Set up desktop browser projects (Chromium, Firefox, WebKit)
        - Set up mobile viewport projects (iPhone 14, Pixel 5)
        - Configure `baseURL` for frontend (localhost:5173)
        - Set up trace, screenshot, and video capture on failure
        - Configure reporter (HTML + GitHub for CI)

    - [ ] **1.2.b Configure webServer for frontend**
        - Point to Vite dev server command
        - Set `reuseExistingServer: !process.env.CI`
        - Configure appropriate timeout

    - [ ] **1.2.c Document backend startup approach**
        - Backend runs via Docker (already running in dev)
        - For CI, backend starts as part of existing Docker Compose setup
        - Add note in config comments explaining approach

- [ ] **1.3 Verify basic test execution**

    - [ ] **1.3.a Create smoke test to verify setup**
        - Create `tests/smoke.spec.ts`
        - Test: Navigate to home page, verify title/content loads
        - Tag with `@smoke`

    - [ ] **1.3.b Run tests locally across all browsers**
        - Verify Chromium passes
        - Verify Firefox passes
        - Verify WebKit passes

    - [ ] **1.3.c Run quality gates**
        - Verify TypeScript compilation in `e2e/`
        - Verify ESLint passes (if configured)

### **Phase 2:** Test Utilities & Page Objects

- [ ] **2.1 Create Page Object Models for core pages**

    **Goal:** Encapsulate page interactions for maintainable, DRY tests.

    - [ ] **2.1.a Create `BasePage` class**
        - Common navigation methods
        - Wait utilities
        - Toast/notification helpers

    - [ ] **2.1.b Create authentication page objects**
        - `LoginPage`: form fields, submit, error messages, OAuth buttons
        - `RegisterPage`: form fields, submit, validation errors, success state
        - `LogoutPage` (or header component): logout action

    - [ ] **2.1.c Create browse page objects**
        - `BrowsePage`: movie grid, pagination, filter controls
        - `SearchPage`: search input, results grid
        - `MovieDetailPage`: movie info, back navigation, watchlist button

    - [ ] **2.1.d Create watchlist page object**
        - `WatchlistPage`: movie list, remove actions

- [ ] **2.2 Create shared test fixtures and helpers**

    - [ ] **2.2.a Create test data fixtures**
        - Valid user credentials for testing
        - Invalid credential variations
        - Known movie IDs for consistent testing

    - [ ] **2.2.b Create authentication fixture**
        - `authenticatedPage` fixture that logs in before test
        - Reusable across auth-required test files
        - Store auth state for faster subsequent tests

    - [ ] **2.2.c Create utility helpers**
        - `waitForPageLoad()` - wait for loading states to complete
        - `expectToast()` - verify toast notifications
        - `getMovieCard()` - locate movie cards by title or ID

- [ ] **2.3 Implement OAuth mock utilities**

    **Goal:** Test OAuth flows without real provider credentials.

    - [ ] **2.3.a Create route interception helpers**
        - Mock Google OAuth redirect initiation
        - Mock GitHub OAuth redirect initiation
        - Simulate successful callback response
        - Simulate error callback response

    - [ ] **2.3.b Document OAuth testing approach in fixture comments**
        - Explain why we mock at callback level
        - Note that redirect URL correctness is verified

### **Phase 3:** Authentication Tests

- [ ] **3.1 Implement password authentication flow tests**

    - [ ] **3.1.a Create `tests/auth/login.spec.ts`**
        - Test: Successful login with valid credentials → redirected to app
        - Test: Failed login with invalid password → error message shown
        - Test: Failed login with non-existent user → error message shown
        - Test: Session persists across page refresh
        - Tag critical paths with `@smoke`

    - [ ] **3.1.b Create `tests/auth/register.spec.ts`**
        - Test: Successful registration → verification prompt shown
        - Test: Registration with existing email → error shown
        - Test: Registration with invalid email format → validation error
        - Test: Registration with weak password → validation error
        - Tag happy path with `@smoke`

    - [ ] **3.1.c Create `tests/auth/logout.spec.ts`**
        - Test: Logout clears session → redirected to home
        - Test: Protected routes inaccessible after logout
        - Tag with `@smoke`

- [ ] **3.2 Implement OAuth flow tests (mocked)**

    - [ ] **3.2.a Create `tests/auth/oauth.spec.ts`**
        - Test: Google sign-in button initiates correct redirect URL
        - Test: GitHub sign-in button initiates correct redirect URL
        - Test: Mocked successful OAuth callback → user logged in
        - Test: Mocked error OAuth callback → error displayed gracefully

- [ ] **3.3 Implement session management tests**

    - [ ] **3.3.a Create `tests/auth/session.spec.ts`**
        - Test: Expired token triggers refresh (verify via interceptor behavior)
        - Test: Invalid session shows appropriate error toast
        - Test: Auth state consistent across browser tabs (if applicable)

    - [ ] **3.3.b Run all auth tests and verify pass**
        - All tests pass on Chromium
        - Spot check Firefox and WebKit

### **Phase 4:** Browse & Discovery Tests

- [ ] **4.1 Implement browse page tests**

    - [ ] **4.1.a Create `tests/browse/discover.spec.ts`**
        - Test: Popular page loads with movie grid
        - Test: Top Rated page loads with movie grid
        - Test: Now Playing page loads with movie grid
        - Test: Upcoming page loads with movie grid
        - Test: Pagination shows accurate result count (regression for fixed bug)
        - Tag one page load with `@smoke`

- [ ] **4.2 Implement search functionality tests**

    - [ ] **4.2.a Create `tests/browse/search.spec.ts`**
        - Test: Search for known movie title → results displayed
        - Test: Search with no results → empty state shown
        - Test: Empty search input behavior
        - Tag successful search with `@smoke`

- [ ] **4.3 Implement filter tests**

    - [ ] **4.3.a Create `tests/browse/filters.spec.ts`**
        - Test: Genre filter applied → results update
        - Test: Year range filter applied → results update
        - Test: Multiple filters combined → results reflect all
        - Test: Clear filters → results reset
        - Test: Filters persist during pagination
        - Tag basic filter with `@smoke`

- [ ] **4.4 Implement movie detail page tests**

    - [ ] **4.4.a Create `tests/browse/movie-detail.spec.ts`**
        - Test: Click movie card → navigates to detail page
        - Test: Detail page shows movie info (title, overview, poster)
        - Test: Back navigation works correctly
        - Tag detail navigation with `@smoke`

    - [ ] **4.4.b Run all browse tests and verify pass**
        - All tests pass on Chromium
        - Spot check Firefox and WebKit

### **Phase 5:** Watchlist Tests

**Note:** UserMovieData features are partially implemented. Watchlist has minimal functionality - MovieCard
watchlist control has known state sync issues (documented, pending TanStack Query integration). Tests should
cover current working functionality and be structured for extensibility when features expand.

- [ ] **5.1 Implement authenticated watchlist operation tests**

    **Goal:** Test current minimal watchlist functionality; structure for future expansion.

    - [ ] **5.1.a Create `tests/watchlist/watchlist.spec.ts`**
        - Test: Add movie to watchlist from detail page → confirmation toast
        - Test: Watchlist page shows user's saved movies
        - Test: Remove movie from watchlist → confirmation toast with undo
        - Test: Undo action restores movie to watchlist
        - Test: Watchlist state persists across sessions
        - Tag add/view with `@smoke`

    - [ ] **5.1.b Add extensibility structure**
        - Create placeholder describe blocks for future tests (ratings, reviews)
        - Add comments noting pending functionality
        - Structure page objects to accommodate future actions

- [ ] **5.2 Implement unauthenticated access tests**

    - [ ] **5.2.a Add unauthenticated tests to watchlist spec**
        - Test: Unauthenticated user attempting watchlist action → login prompt/redirect
        - Test: Watchlist page redirects unauthenticated users

    - [ ] **5.2.b Run all watchlist tests and verify pass**
        - All tests pass on Chromium
        - Spot check Firefox and WebKit

### **Phase 6:** Mobile-Specific Tests

**Note:** Mobile tests serve as early discovery for responsive issues. Non-blocking in CI until
a dedicated mobile pass addresses discovered issues. Tests should surface problems, not gate PRs.

- [ ] **6.1 Implement mobile layout tests**

    - [ ] **6.1.a Create `tests/mobile/layout.spec.ts`**
        - Test: No horizontal scrolling on mobile viewports
        - Test: Movie grid adapts to mobile (fewer columns)
        - Test: Navigation adapts to mobile (hamburger menu or equivalent)
        - Test: Movie detail page readable on mobile
        - Tag all with `@mobile`

    - [ ] **6.1.b Create `tests/mobile/touch.spec.ts`**
        - Test: Primary action buttons meet 44x44px minimum
        - Test: Form inputs are appropriately sized for touch
        - Test: Modals/drawers display correctly on small screens
        - Tag all with `@mobile`

- [ ] **6.2 Implement mobile functional parity tests**

    - [ ] **6.2.a Create `tests/mobile/flows.spec.ts`**
        - Test: Login flow works on mobile viewport
        - Test: Search and browse work on mobile
        - Test: Filters accessible and usable on mobile
        - Test: Watchlist actions work on mobile
        - Tag all with `@mobile`

    - [ ] **6.2.b Run mobile tests locally**
        - Run on iPhone 14 viewport
        - Run on Pixel 5 viewport
        - Document any discovered issues

### **Phase 7:** CI Integration

- [ ] **7.1 Add E2E job to GitHub Actions workflow**

    - [ ] **7.1.a Create or update CI workflow for E2E**
        - Add `e2e` job to `.github/workflows/ci.yml`
        - Configure to run after backend/frontend jobs pass
        - Set up Playwright installation with caching
        - Configure artifact upload for reports on failure

    - [ ] **7.1.b Configure Docker environment for CI**
        - Ensure backend/database available for E2E tests
        - Document startup sequence in workflow comments

- [ ] **7.2 Configure tiered execution**

    - [ ] **7.2.a Implement smoke test tier**
        - Run `@smoke` tagged tests on all PRs
        - Chromium only for speed
        - Target: <5 minutes execution

    - [ ] **7.2.b Implement full desktop suite tier**
        - Run all tests on PRs to main
        - All three desktop browsers (Chromium, Firefox, WebKit)
        - Use matrix strategy for parallel browser execution

    - [ ] **7.2.c Implement mobile discovery tier (non-blocking)**
        - Run mobile viewport tests on PRs to main
        - iPhone 14 and Pixel 5 viewports
        - Configure as `continue-on-error: true` (non-blocking)
        - Upload report artifacts for issue discovery

- [ ] **7.3 Set up test sharding and caching**

    - [ ] **7.3.a Configure Playwright browser caching**
        - Cache `~/.cache/ms-playwright` between runs
        - Verify cache restoration works

    - [ ] **7.3.b Configure test sharding (if needed)**
        - Evaluate if sharding needed based on test count
        - Document sharding configuration for future scaling

    - [ ] **7.3.c Verify CI pipeline end-to-end**
        - Create test PR to verify smoke tests run
        - Verify full suite runs on PR to main
        - Verify mobile discovery tier runs (non-blocking)
        - Verify artifacts uploaded on failure

### **Phase 8:** Documentation Updates

- [ ] **8.1 Update `strategy-testing-methodology.md`**

    - [ ] **8.1.a Update E2E directory structure section**
        - Replace placeholder structure with actual `e2e/` layout
        - Document Page Object Model pattern
        - Document fixture organization

    - [ ] **8.1.b Add E2E command patterns**
        - Local execution commands (run, debug, headed mode)
        - Browser selection commands (desktop and mobile)
        - Tag-based filtering (@smoke, @mobile)
        - Trace viewer usage

    - [ ] **8.1.c Expand E2E best practices**
        - Page Object Model guidance
        - Test tagging conventions
        - OAuth mocking patterns
        - Mobile testing patterns
        - CI tiering strategy (including non-blocking mobile)

- [ ] **8.2 Update `QUICK-REFERENCE.md`**

    - [ ] **8.2.a Add E2E command patterns section**
        - Basic run commands
        - Browser and viewport selection
        - Headed mode for debugging
        - Report viewing

- [ ] **8.3 Update `TECHNICAL-OVERVIEW.md`**

    - [ ] **8.3.a Update Section 7 (Testing Infrastructure)**
        - Add E2E testing subsection
        - Document Playwright configuration
        - Note CI integration approach (including mobile discovery)

    - [ ] **8.3.b Run markdown linting on updated docs**
        - Fix any violations

---

## Success Criteria

- [ ] E2E tests exist for all critical user flows (auth, browse, watchlist)
- [ ] All desktop tests pass on Chromium, Firefox, and WebKit
- [ ] Mobile-specific tests implemented (layout, touch, functional parity)
- [ ] CI runs smoke tests on all PRs (<5 min)
- [ ] CI runs full desktop suite on PRs to main (all browsers, parallelized)
- [ ] CI runs mobile discovery tier on PRs to main (non-blocking)
- [ ] Test reliability: <5% flake rate
- [ ] Page Object Model pattern established for maintainability
- [ ] Documentation updated (testing strategy, quick reference, technical overview)
- [ ] All quality gates pass
- [ ] Ready for archival
