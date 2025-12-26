# PRD: E2E Testing Foundation

**Type:** Technical Infrastructure
**Status:** Ready for Implementation
**Created:** 2025-12-26

---

## 1. Overview

Implement end-to-end (E2E) testing infrastructure using Playwright to provide regression protection for
CineXplorer's critical user flows. E2E tests validate the complete user experience across the full stack
(React frontend, Django backend, PostgreSQL database) by automating browser interactions.

**Problem:** Current testing coverage includes backend integration tests (pytest) and frontend component tests
(Vitest), but no automated testing of complete user journeys. Manual testing has caught bugs that unit/integration
tests missed (e.g., filter preservation on navigation, pagination display issues documented in
`plan-backend-modernization.md`).

**Solution:** Establish Playwright-based E2E testing with CI integration, covering authentication flows, movie
discovery, and watchlist management - all features currently implemented in the application.

---

## 2. Goals

1. **Regression Protection:** Catch integration bugs before they reach production
2. **Critical Path Coverage:** Automate testing of auth, browse, and watchlist flows
3. **CI Integration:** Tiered test execution (smoke tests on PRs, full suite on main)
4. **Cross-Browser Validation:** Test on Chromium, Firefox, and WebKit (Safari)
5. **Mobile Discovery:** Non-blocking mobile viewport testing to surface responsive issues early
6. **Documentation:** Update testing strategy and quick reference with E2E patterns

---

## 3. Test Scenarios

### 3.1 Authentication Flows

**Password Authentication:**

- User registers with email/password → sees verification prompt
- User logs in with valid credentials → redirected to app
- User logs in with invalid credentials → sees error message
- User logs out → session cleared, redirected to home
- Authenticated user's session persists across page refresh

**OAuth Authentication (Mocked):**

- User clicks "Sign in with Google" → redirect initiated to correct URL
- User clicks "Sign in with GitHub" → redirect initiated to correct URL
- OAuth callback with valid response → user logged in
- OAuth callback with error → error displayed gracefully

**Session Management:**

- Expired token triggers automatic refresh (interceptor behavior)
- Invalid session shows appropriate error toast

### 3.2 Movie Discovery & Browsing

**Browse Pages:**

- Popular page loads with movie grid
- Top Rated page loads with movie grid
- Now Playing page loads with movie grid
- Upcoming page loads with movie grid

**Search:**

- User searches for movie title → results displayed
- Empty search shows appropriate message
- Search with no results shows empty state

**Filtering:**

- User applies genre filter → results update
- User applies year range filter → results update
- User applies multiple filters → results reflect all filters
- User clears filters → results reset
- Filters persist during pagination

**Movie Details:**

- User clicks movie card → navigates to detail page
- Detail page shows movie information (title, overview, poster, etc.)
- "Back to Results" navigation works correctly
- Pagination shows accurate result counts (regression test for fixed bug)

### 3.3 Watchlist Management

**Authenticated User:**

- User adds movie to watchlist → confirmation toast shown
- User removes movie from watchlist → confirmation toast with undo
- Undo action restores movie to watchlist
- Watchlist page shows user's saved movies
- Watchlist state persists across sessions

**Unauthenticated User:**

- Attempting watchlist action prompts login

### 3.4 Mobile-Specific Tests

**Viewport & Layout:**

- No unintended horizontal scrolling on mobile viewports
- Movie grid adapts to mobile layout (fewer columns)
- Navigation adapts to mobile (hamburger menu or equivalent)
- Movie detail page readable on mobile

**Touch & Interaction:**

- Touch targets meet minimum size (44x44px per WCAG)
- Hover-dependent interactions have mobile alternatives
- Forms are usable on mobile (proper input sizing, keyboard types)
- Modals/drawers display correctly on small screens

**Functional Parity:**

- All critical flows work on mobile (auth, browse, watchlist)
- Filters accessible and usable on mobile
- Search functional on mobile

---

## 4. Functional Requirements

### 4.1 Infrastructure Setup

1. Create `e2e/` directory at repository root with Playwright configuration
2. Configure Playwright for full-stack testing (Vite dev server + Django backend)
3. Set up Page Object Model pattern for maintainable test code
4. Implement test data management (fixtures, database seeding, cleanup)
5. Configure desktop browser projects: Chromium, Firefox, WebKit
6. Configure mobile viewport projects: iPhone 14, Pixel 5 (for discovery testing)

### 4.2 Test Implementation

1. Implement authentication flow tests (password + OAuth mock)
2. Implement movie discovery tests (browse, search, filter, detail)
3. Implement watchlist management tests
4. Implement mobile-specific tests (layout, touch targets, functional parity)
5. Tag tests appropriately (@smoke for critical subset, @auth, @browse, @watchlist, @mobile)
6. Ensure tests are independent and can run in parallel

### 4.3 CI Integration

1. Add E2E job to GitHub Actions workflow
2. Configure tiered execution:
   - Smoke tests (@smoke tag, Chromium only) on all PRs
   - Full suite (all tests, desktop browsers) on PRs to main
   - Mobile discovery (mobile viewports, non-blocking) on PRs to main
3. Implement test sharding for parallel browser execution
4. Configure artifact upload for test reports and failure screenshots
5. Set up Playwright browser caching for faster CI runs
6. Configure mobile tier as non-blocking (report issues, don't fail build)

### 4.4 Documentation Updates

1. Update `strategy-testing-methodology.md`:
   - Replace placeholder E2E directory structure with actual implementation
   - Add E2E command patterns (run, debug, headed mode, browser selection)
   - Expand E2E best practices (Page Object Model, tagging, OAuth mocking)
   - Document CI tiering strategy
2. Update `QUICK-REFERENCE.md`:
   - Add E2E command patterns section
3. Update `TECHNICAL-OVERVIEW.md`:
   - Update Section 7 (Testing Infrastructure) with E2E details

---

## 5. Non-Goals (Out of Scope)

1. **Visual regression testing** - Screenshot comparison deferred to future work
2. **Performance testing** - Load/stress testing not included
3. **Features not yet implemented** - Ratings, reviews, user profile UIs (will get E2E when built)
4. **Real OAuth provider testing** - OAuth flows mocked at callback level
5. **Email verification flow** - Would require email service mocking; test up to "check your email" prompt
6. **Blocking mobile CI** - Mobile tests are discovery-only (non-blocking) until mobile pass addresses issues

---

## 6. Design Considerations

### 6.1 Directory Structure

```
e2e/
├── playwright.config.ts      # Playwright configuration
├── package.json              # E2E-specific dependencies
├── tsconfig.json             # TypeScript config for E2E
├── .gitignore                # Ignore test artifacts
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── register.spec.ts
│   │   ├── logout.spec.ts
│   │   └── oauth.spec.ts
│   ├── browse/
│   │   ├── discover.spec.ts
│   │   ├── search.spec.ts
│   │   ├── filters.spec.ts
│   │   └── movie-detail.spec.ts
│   └── watchlist/
│       └── watchlist.spec.ts
├── pages/                    # Page Object Models
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── BrowsePage.ts
│   ├── MovieDetailPage.ts
│   └── WatchlistPage.ts
├── fixtures/
│   ├── auth.fixture.ts       # Authentication setup
│   ├── test-data.ts          # Shared test data
│   └── global-setup.ts       # Database seeding
└── utils/
    └── helpers.ts            # Shared utilities
```

### 6.2 Test Tagging Convention

- `@smoke` - Critical path tests run on every PR (~5-10 tests, <5 min)
- `@auth` - Authentication-related tests
- `@browse` - Movie discovery/browsing tests
- `@watchlist` - Watchlist management tests
- `@mobile` - Mobile-specific tests (layout, touch, responsive)
- `@regression` - Tests for previously-fixed bugs

---

## 7. Technical Considerations

### 7.1 Playwright Configuration

```typescript
// e2e/playwright.config.ts (conceptual)
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['github']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop browsers (blocking)
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile viewports (non-blocking discovery)
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  webServer: [
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    // Backend assumed running via Docker in CI
  ],
});
```

### 7.2 OAuth Mocking Strategy

Mock OAuth at the callback level - test that clicking OAuth buttons initiates correct redirects,
then simulate successful/failed callbacks:

```typescript
// Intercept OAuth callback and simulate provider response
await page.route('**/accounts/google/login/callback/**', async route => {
  // Redirect to app with simulated success
  await route.fulfill({
    status: 302,
    headers: { 'Location': '/oauth/callback?code=mock_code' },
  });
});
```

### 7.3 Test Database Strategy

Options (to be determined during implementation):

1. **Shared test database** - Reset between test runs, seed with fixtures
2. **Transaction rollback** - Each test runs in transaction that rolls back
3. **Docker test container** - Ephemeral database per CI run

### 7.4 CI Workflow Addition

```yaml
# .github/workflows/ci.yml (addition)
e2e:
  name: E2E Tests
  runs-on: ubuntu-24.04
  needs: [backend, frontend]  # Run after unit tests pass
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - name: Install Playwright
      run: npx playwright install --with-deps
    - name: Run E2E tests
      run: npx playwright test --project=chromium --project=firefox --project=webkit
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: e2e/playwright-report/
```

### 7.5 Dependencies

- `@playwright/test` - Test runner and assertions
- `playwright` - Browser automation

---

## 8. Success Metrics

1. **Coverage:** All critical user flows have E2E test coverage
2. **CI Integration:** E2E tests run automatically on PRs to main
3. **Reliability:** <5% flake rate in CI (tests pass consistently)
4. **Speed:** Smoke suite completes in <5 minutes; full suite in <15 minutes (parallelized)
5. **Mobile Discovery:** Mobile viewport tests running and surfacing issues (non-blocking)
6. **Documentation:** Testing strategy and quick reference updated with E2E patterns

---

## 9. Open Questions

1. **Test database strategy:** Transaction rollback vs. fixture seeding vs. ephemeral container?
2. **Backend startup in CI:** Use existing Docker setup or lightweight test server?
3. **Test user credentials:** Hardcoded test users or created per-run?
4. **Playwright UI mode:** Include configuration for local debugging with UI?

---

## 10. References

- [plan-backend-modernization.md](plan-backend-modernization.md) - Original E2E planning notes
- [strategy-testing-methodology.md](../../reference/strategies/project/strategy-testing-methodology.md) - Testing standards
- [Playwright Documentation](https://playwright.dev/) - Official docs
- External research findings on test location, CI strategy, and browser coverage (2025-12-26)
