# ADR-039: Run a Browser Smoke Tier

## Status

Accepted (2026-11-07)

## Context

Backend tests exercise the database and service boundaries; frontend tests render in jsdom with a replaced network.
Neither tier drives the browser through the real API and session cookies, and jsdom cannot measure layout or scroll
restoration. The frontend is being rebuilt page by page, so a small set of stable user journeys needs coverage across
both the development stack and the deployed site.

Using live TMDB data in a pull-request gate would make that gate depend on external availability and changing data.
A fixture TMDB server would add a backend configuration seam for behavior already covered by backend tests. Separate
staging specs would duplicate the journeys and drift. Running production images for the pull-request tier would need
new production-safe seeding and mail controls; the existing image checks and staging run already cover production.

## Decision

We will run five Playwright specs in Chromium: sign-up, sign-in and sign-out, browse, movie detail, and Back to Results
after reloading the detail page. Specs use accessible roles, labels, and visible text, and assert behavior rather than
fixture-only titles or counts. We will use one set of specs with two targets:

- `local` runs against the development backend, database, and Redis. The browser answers catalogue requests from
  synthetic, API-typed fixtures, fails on a catalogue request without a fixture, and aborts off-site requests.
  Authentication reaches the real backend. Worktrees and CI discard mail using a development-only `EMAIL_BACKEND`
  override; deployed environments refuse another transport. Sign-up ends at the check-your-email notice rather than
  following the verification link. Backend tests retain their own mail capture and explicit transport coverage.
- `staging` uses live data and a dedicated, verified, non-staff account. It skips sign-up and changes none of that
  account's data. The address is a GitHub environment variable and credentials are environment secrets. The run keeps
  no trace or screenshot and uploads no artifacts, because those can carry credentials, cookies, and request bodies.

Back to Results supplies its own catalogue responses in both targets to measure scroll restoration against a known
page height. It belongs in Playwright because reloading and navigating full pages is the behavior under test; a
component browser runner would add a second test project without providing that page lifecycle.

Each distinct page a spec reaches receives an axe scan for WCAG 2.0 and 2.1 A and AA rules after its ready check.
Existing violations are excused by an explicit route-pattern and rule baseline with a reason for each entry. Other
violations fail with the route and rule. Unmatched baseline entries are reported without failing, so focused runs and
staging-only findings remain usable. Fixing a violation removes its entry.

The development-stack run will gate pull requests through `ci-ok`. The staging run will follow deployment and its
health check, turning a failed workflow red without rolling back the deployment. Neither target retries: local
failures retain traces and screenshots, while staging failures are diagnosed from masked job logs. Agent-driven
browser checks remain useful visual and development feedback, separate from the deterministic merge gate and never
substituting for a spec.

## Consequences

### Positive

- Real registration, authentication, cookies, navigation, and layout behavior are checked across the frontend/API seam.
- Fixture data keeps the pull-request gate independent of TMDB while staging exercises deployed code and live data.
- Accessible selectors let pages be rebuilt while preserving the user-visible contract.
- New accessibility violations fail without requiring the current pages' known violations to be fixed first.

### Negative

- A new violation of an already-excused rule on the same route passes until the baseline entry is removed.
- Live content can expose an accessibility failure only after deployment; it needs a fix or a justified baseline entry.
- Chromium installation and the development stack add CI cost; Firefox, WebKit, mobile, OAuth, and watchlists remain
  outside this tier.
- Repeated local registration can hit its three-per-hour limit; the worktree's registration throttle history must be
  cleared before another run. The primary stack still sends real mail if used as the local target.
- Staging needs a manually maintained verified account, and failures have no retained browser artifacts.
