# PRD: End-to-End Smoke Tier

**Type:** Technical
**Status:** Complete
**Completed:** 2026-11-07
**Created:** 2026-11-06

---

## 1. Introduction/Overview

CineXplorer's tests stop short of a real browser. The backend suite (pytest) runs against a real database with TMDB,
mail and OAuth replaced at their clients; the frontend suite (Vitest, jsdom, MSW) renders components with the network
mocked. Nothing drives the app in a browser through its real API, so a break between the frontend, the API and the
session cookies surfaces only when someone uses the site. jsdom also has no layout: a test can check that Back to
Results asks to restore a scroll position, but not where the page lands. The one real-browser check,
`frontend/scripts/check-auth-renewal-browser.mjs`, covers token renewal and sign-out at the cookie boundary with no
backend; it stays as it is.

The frontend is about to be rebuilt page by page: navigation, movie cards, the detail page. This work adds a small
end-to-end tier, five Playwright specs on the flows that exist today, that runs on every pull request and against
staging after every deploy. Its specs find elements by role and accessible name, so a rebuilt page keeps them green as
long as it keeps the behavior and the names.

## 2. Goals

1. Five Playwright specs, in Chromium, cover sign-up, sign-in and sign-out, browse, movie detail, and Back to Results'
   scroll restore after a reload.
2. The specs run on every pull request against the development stack, with real sign-up, sign-in and sessions and
   with movie data from fixtures, as a required check.
3. The same specs, less sign-up, run against staging after every deploy, with live data.
4. Every page a spec visits is scanned with axe; a violation fails the run unless a named baseline lists it.
5. The specs run locally against a worktree's browsable stack with one command.

## 3. User Stories

- As the developer rebuilding a page, I want a check that fails when sign-in, browse, movie detail or Back to Results
  stops working in a real browser, so that a rebuild can't break a flow unnoticed.
- As the developer merging to `main`, I want the deployed staging site exercised after each deploy, so that a broken
  deployment is reported by CI rather than found by a visitor.
- As a keyboard or screen-reader user, I want new accessibility violations on the main pages caught before merge.

## 4. Functional Requirements

### Tooling

1. `frontend/package.json` gains `@playwright/test` and `@axe-core/playwright` as development dependencies, each pinned
   to an exact version. `@playwright/test` uses the same version as the `playwright-core` already there (1.64.1 when
   written; read the lockfile when adding it). Dependabot's npm groups already move both packages in one pull request.
2. Specs live in `frontend/e2e/`, configured by `frontend/playwright.config.ts`, and run with `npm run test:e2e` from
   `frontend/`. The configuration has one browser, Chromium, at a 1280×800 viewport, and sets no retries. The `local`
   target keeps a trace and screenshot for each failed test; the `staging` target keeps neither (requirement 20).
3. ESLint and `npm run type-check` cover `frontend/e2e/` and `playwright.config.ts`.

### Targets

4. The run has two targets, chosen by `E2E_TARGET`: `local` (the default) for CI's and a worktree's development stack,
   and `staging`. `E2E_BASE_URL` gives the site's address and is required; the run stops with a message naming it when
   it is missing. The `local` target accepts the development stack's self-signed certificate.
5. Credentials come from `E2E_USERNAME` and `E2E_PASSWORD`. The `local` target defaults them to the development
   account that `seed_dev_data` creates; the `staging` target requires both and stops with a message naming them when
   either is missing. No credential is written into the repository beyond the development account's, which
   `seed_dev_data` already documents.
6. In the `local` target, the browser answers every request whose path starts with `/api/movies`, `/api/genres`,
   `/api/keywords` or `/api/people` (the catalogue endpoints, each of which calls TMDB) from fixtures in
   `frontend/e2e/`. Such a request with no fixture fails the spec, naming its method and path. Requests to any origin
   other than the site's are aborted, so poster and placeholder images never leave the runner. Every other request
   reaches the real backend. `/api/user-movie-data` also calls TMDB when it adds or lists a user's movies; no spec in
   this tier reaches it, and a later spec that does supplies fixtures for it. In the `staging` target, all requests go
   where the page sends them, except where requirement 13 says otherwise.
7. Fixtures are synthetic (titles such as "Movie 12", no posters, no text copied from TMDB) and typed against the
   generated API types in `frontend/src/types/api.ts`, so a schema change that breaks them fails type-check.
8. Specs assert behavior and structure, never a title, count or other value that only fixture data guarantees, so each
   spec passes in both targets. A spec that needs a movie's title reads it from the browse response the page received
   (a fixture in `local`, live data in `staging`) and finds that movie's card as the link named with the title; the
   tier relies on a movie card's link being named by the movie's title. Back to Results' spec is the exception: it
   supplies its own browse and detail responses in both targets (requirement 13).

### Specs

Outside fixture and axe helpers, every element a spec finds starts from `getByRole` (role and accessible name),
`getByLabel` (form fields) or `getByText` (messages and counts), chained with those three and narrowed only with
Playwright's `filter`, `first`, `last` and `nth`; reading a found element's state or position (`boundingBox()`) is
fine. No other selector appears in a spec: no CSS or XPath string in any form (`locator()` on the page or on a
locator, `$`, `$$`, `$eval`, `$$eval`, `waitForSelector`, or an action given a selector string), no `getByTestId`, and
no DOM query inside `evaluate()`.

9. **Sign-up** (`local` only): register with a unique username and an address at `example.com`, and land on the
   sign-in page showing the message that asks the user to check their email.
10. **Sign-in and sign-out**: sign in with the target's credentials, see the signed-in state (the user menu named with
    the username), sign out, and see the signed-out state (the Login control).
11. **Browse**: open `/browse` and see the result count and the card for a title from the first browse response; scroll
    until the next browse request (with `tmdb_page_start`) returns, and see the card for a title that page added, one
    the first page didn't hold, come into view.
12. **Movie detail**: open `/browse?minYear=1980&maxYear=1983`, open the card for a title from the first browse
    response, see the detail page whose heading is that title, press Back to Results, and return to `/browse` with
    `minYear=1980` and `maxYear=1983` still in the URL.
13. **Back to Results after a reload** (both targets, its own fixtures): browse and movie-detail requests answered by
    the spec, the first browse page holding 39 titles; scroll to 2,600 px, past the height of the 20-card loading
    placeholder; open a movie whose card is in view, found by role and its bounding box; reload the detail page; press
    Back to Results; `window.scrollY` lands within 20 px of where it was left.

### Accessibility

14. Each spec scans each distinct page it reaches (sign-up, sign-in, the page sign-in lands on, browse, movie detail)
    with `@axe-core/playwright`, using the WCAG 2.0 and 2.1 A and AA rules. A scan runs after the spec's own check
    that the page is ready (its heading or result count visible), so loading placeholders are gone.
15. A violation fails the spec, naming its axe rule and the page's route, unless `frontend/e2e/axe-baseline.ts`
    excuses it. An entry is a route pattern (`/`, `/login`, `/register`, `/browse`, `/movie/:id`), an axe rule ID and a
    one-line reason, and it excuses every violation of that rule on pages matching that route. A run lists the entries
    that matched no violation in its output without failing; the change that fixes a violation removes its entry. The
    baseline starts with exactly the violations the first run finds on today's pages.

### Mail

16. Settings read `EMAIL_BACKEND` from the environment, defaulting to the ZeptoMail backend. Any other value outside
    `ENVIRONMENT=development` stops startup with an error naming the setting. A backend test covers the refusal.
17. CI's end-to-end stack and every worktree stack (`infrastructure/docker-compose.worktree.yml`) set Django's dummy
    mail backend, which accepts and discards mail. The primary checkout's stack is unchanged and still sends.
18. The backend tests stay independent of the override, since a worktree's tests run in the same backend container:
    `load_settings` in `backend/apps/core/tests/test_helpers.py` removes `EMAIL_BACKEND` from the environment it passes
    to the settings it loads, as it already removes other variables, and the ZeptoMail backend tests
    (`test_zeptomail_backend.py`) name the ZeptoMail backend instead of reading `EMAIL_BACKEND` from settings. CI's
    backend job sets the dummy backend too, so CI exercises the suite with the override in place.

### CI

19. A job in `.github/workflows/ci.yml` runs on the workflow's existing events. It starts the development stack
    (backend server, database, Redis, frontend dev server, Caddy) with the dummy mail backend, migrates, runs
    `seed_dev_data`, installs Playwright's Chromium (cached by version), and runs the specs in the `local` target. On
    failure it uploads the Playwright report with its traces as an artifact. `ci-ok` needs it.
20. A job runs after `deploy`, on the same condition, in the `staging` environment. It installs the frontend's
    dependencies and Playwright's Chromium and runs the specs in the `staging` target. It reads the site address from
    the environment's `E2E_BASE_URL` variable and the account from its `E2E_USERNAME` and `E2E_PASSWORD` secrets. It
    keeps no trace or screenshot and uploads no artifact, since a trace records typed values, request bodies and
    cookies; failure detail goes only to the job log, where GitHub masks the environment's secrets. A failure turns
    the run red; it does not roll back the deploy.
21. The staging account is a verified, non-staff account created by hand on the staging server. Its credentials live
    only in the `staging` environment's secrets. The specs change none of its data.

### Local runs

22. The supported local target is a worktree's browsable stack. With it up (`node scripts/worktree.mjs browse`, which
    migrates and seeds), one command runs every spec: `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e`
    from `frontend/`. The primary checkout's stack still sends mail, so the sign-up spec run against it sends a real
    verification email.

### Documentation

23. The testing strategy (`strategy-testing-methodology.md`) describes the tier in its E2E section: what it covers, the
    two targets and the fixture boundary, the selector rule, the axe baseline, how to run it locally (including that
    sign-up against the primary checkout's stack sends real mail, and how to reset the registration limit as Design
    Considerations describes), and where agent browser checks fit (Design Decision 8). Its outdated example and
    "future" layout go, and its "When to Use Each Test Type" E2E bullets match the tier.
24. The quality-gates strategy's E2E Checks section keeps its per-task rule: a task that changes a page or flow a spec
    drives runs the specs covering it, against the worktree's browsable stack. Throughout the strategy (E2E Checks, Task
    List Integration's example and Anti-Patterns), E2E commands name the real script and spec files, and its
    browser-matrix wording goes. DEVELOPMENT-RULES § Quality Gates states the same rule under "Each task", lists the
    end-to-end job among what CI runs on a pull request, and the full run in DEVELOPMENT-RULES and QUICK-REFERENCE
    includes the end-to-end run, with a worktree's browsable stack as its precondition. QUICK-REFERENCE gains the E2E
    command. TECHNICAL-OVERVIEW § 7 Testing Infrastructure gains the end-to-end tier beside backend and
    frontend testing: Playwright in Chromium, `frontend/e2e/`, the two targets and the command. `worktree-sessions.md`'s
    "What stays on the primary" adds mail: only the primary checkout's stack sends it, and a worktree's stack discards
    it. Its "What Runs Where" adds the end-to-end run, against the worktree's browsable stack.
25. The backlog's earlier E2E plan is removed: `prd-e2e-testing-foundation.md`, `tasks-e2e-testing-foundation.md`, and
    the "End-to-End Testing (Playwright)" section of `.arc/backlog/technical/plan-backend-modernization.md` with its
    line in that document's organization list and "Playwright" in its list of broader modernization work. Its browser
    matrix, mobile projects, OAuth mocking and watchlist scenarios are outside this tier, and git history keeps it.
    `BACKLOG-TECHNICAL.md`'s Mobile Responsiveness Remediation item keeps its goal, fixing mobile viewport issues, and
    drops what depended on the removed plan: the CI mobile discovery tier as its source of scope, promoting mobile E2E
    tests to blocking, its sequencing after the earlier E2E work unit, and its reference to the removed PRD.
26. ADR-039 records the tier's shape (Design Decisions 1–9), written `Proposed` with the work and set `Accepted` before
    it merges.

## 5. Non-Goals (Out of Scope)

- **A watchlist spec.** The user-movie data state and its pages are about to be rebuilt; a spec written now would be
  rewritten with them. It is written after that rebuild.
- **Firefox, WebKit and mobile viewports.** One browser keeps the tier small and fast.
- **Google and GitHub sign-in.** The providers can't be driven deterministically; backend tests cover the callbacks.
- **Following the verification link.** Backend tests cover verification; the spec stops at the message.
- **Sign-up on staging.** It would create real accounts and send real mail.
- **Rolling back a deploy when the staging run fails.**
- **Fixing the violations in the axe baseline.** The pages that carry them are being rebuilt.
- **Playwright component testing and Vitest Browser Mode.**
- **Visual comparison of screenshots.**
- **Restoring a browse position past the first loaded pages after a reload.** Today a deep position lands near the end
  of what loads first; whether to load further first belongs to the movie grid's rebuild.
- **Search, the filter controls, Now Playing, Upcoming and the sequential browse view.** The movie-detail spec sets
  filters only through the URL.

## 6. Design Considerations

- **Registration limit on a local stack.** Registration allows three sign-ups an hour per client IP. A fourth local run
  of the sign-up spec within the hour fails on the throttle message. That message is the stack's limit, not a failure
  of the change: clearing the `auth_register` throttle's history from the worktree stack's cache resets it, and the run
  is repeated. CI starts a fresh stack each run.
- **Reaching staging.** The deploy step already waits for the site's health check before it finishes.

## 7. Design Decisions

1. **What the specs talk to.** The real backend, database and Redis, so sign-up, sign-in and the session cookies are
   real; the browser answers the TMDB-backed catalogue endpoints from fixtures in the `local` target. Chosen over
   pointing the backend at a fixture TMDB server through a new base-URL setting, which would add a backend seam for
   movie endpoints the backend suite already covers, and over calling the real TMDB from CI, which makes a merge gate
   depend on an outside service and on data that changes. _ADR: new, ADR-039._
2. **One set of specs for both targets.** Specs assert behavior and structure, not data, and the target decides
   whether movie data comes from fixtures. Chosen over separate staging specs, which would drift from the pull-request
   ones. _ADR: covered by ADR-039._
3. **Sign-up stops at "check your email"; sign-in uses a seeded account; mail is discarded.** A development-only
   `EMAIL_BACKEND` override lets CI and worktrees reach the message without sending. Chosen over a mail-sink container
   with an SMTP backend so the spec could follow the link (more infrastructure for a path backend tests cover), and
   over answering the register request from a fixture (sign-up would never reach the backend). Without the override,
   sign-up fails in CI, which has no mail key, and sends real mail from a worktree, which copies the main checkout's
   key. _ADR: covered by ADR-039._
4. **The pull-request job runs the development stack.** Chosen over the production images: the seeding command and the
   mail override are development-only, so production images would need production-safe paths for both. The images job
   already builds the production images and validates their configuration, and the staging run covers what is
   deployed. _ADR: covered by ADR-039._
5. **The staging run signs in as a dedicated account, doesn't sign up, and keeps no artifacts.** Credentials live in
   the `staging` environment's secrets, and a trace would carry them out of it. A failure turns the run red without
   rolling back, since rollback would be new deploy mechanism. _ADR: covered by ADR-039._
6. **Back to Results is a Playwright spec, not a Vitest Browser Mode test.** The scenario reloads the whole page and
   navigates between routes, which Browser Mode's component frame handles poorly, and it would add a second Vitest
   project and a dependency for one test. _ADR: covered by ADR-039._
7. **axe fails on any violation outside a baseline keyed by route and rule.** Chosen over fixing every violation now
   (the pages carrying them are being rebuilt, so the fixes would be thrown away) and over reporting without failing
   (new violations would pass). Entries name a route and a rule rather than an element: axe identifies elements by
   generated class names and positions, the movie grid renders only the cards in view, and detail pages have different
   IDs in fixtures and on staging, so an element-level entry would make the gate depend on data and timing. The cost
   is that a new violation of an already-excused rule on the same route passes until that entry goes. Unmatched entries
   are reported rather than failed, so a run of one spec file, or a violation only staging's live content shows, can
   still be baselined without failing other runs. Because axe runs on staging too, live content can turn the
   post-deploy run red for an accessibility violation the pull-request run, on fixture data, never saw; that is a real
   finding, not a deployment break, and is fixed or baselined like any other. _ADR: covered by ADR-039._
8. **The smoke tier is the deterministic merge gate; agent browser checks are not.** An agent driving a browser
   while a UI change is developed is spot and visual verification, recorded with that change; it never gates a merge
   and never stands in for a spec. _ADR: covered by ADR-039._
9. **No retries.** A retry turns an intermittent failure green and hides it. In the `local` target a failure keeps its
   trace instead; on staging the job log carries the failure. _ADR: covered by ADR-039._
10. **Exact pins, `@playwright/test` matching `playwright-core`.** The two share a browser build; a mismatch would
    install two. _ADR: none (tactical)._

**ADRs this work delivers:** ADR-039, new.

## 8. Success Criteria

- [ ] With a worktree's browsable stack up, `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e` runs the
  five specs in Chromium and passes, scanning every page they reach with axe.
- [ ] The Back to Results spec fails when the restore after a reload is disabled and passes with it.
- [ ] The movie-detail spec fails when Back to Results drops the browse URL's filter parameters and passes with them.
- [ ] A violation of a rule the baseline doesn't excuse on that route fails the run with a message naming the axe rule
  and the route: the footer's TMDB logo with its `alt` removed, an `image-alt` violation on an element no spec
  locates. A baseline entry whose violation is gone is listed in the run's output.
- [ ] In the `local` target, a spec whose page requests a catalogue endpoint with no fixture fails, naming the
  request's method and path.
- [ ] Outside fixture and axe helpers, every element lookup in the specs starts from `getByRole`, `getByLabel` or
  `getByText`, and no CSS or XPath selector string, `getByTestId` or DOM query inside `evaluate()` appears in them.
- [ ] Startup refuses a non-default `EMAIL_BACKEND` outside development (backend test); the sign-up spec reaches the
  check-your-email message in CI and in a worktree with no mail sent; and the backend suite passes in a worktree's
  stack with the dummy backend set.
- [ ] The pull request for this work shows the end-to-end job green, `ci-ok` needs it, and the specs' run in CI takes
  under five minutes by Playwright's report.
- [ ] Proven live: after the merge, the staging job runs after the deploy and passes against staging, signed in as the
  staging account; no account is created on staging, and the run uploads no artifact.
- [ ] The testing strategy, the quality-gates strategy, DEVELOPMENT-RULES, QUICK-REFERENCE, TECHNICAL-OVERVIEW and
  `worktree-sessions.md` describe this tier and the mail difference as requirements 23 and 24 say, and the earlier E2E
  plan's files, its section and the references requirement 25 lists are gone.

## 9. Open Questions

None.
