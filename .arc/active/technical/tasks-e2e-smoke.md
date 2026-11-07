# Task List: End-to-End Smoke Tier

**PRD:** `prd-e2e-smoke.md`
**Created:** 2026-11-06
**Branch:** `technical/e2e-smoke`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Add five Playwright specs, with axe scans, that run against the development stack on every pull request
and against staging after every deploy.

## Scope

### Will Do

- A development-only `EMAIL_BACKEND` override, so worktree and CI stacks reach sign-up's "check your email" without
  sending mail
- Playwright tooling in `frontend/`, two targets (`local`, `staging`) and a fixture boundary for the catalogue
  endpoints
- Five specs: sign-up, sign-in and sign-out, browse, movie detail, Back to Results after a reload
- axe scans on every page a spec reaches, with a route-and-rule baseline
- A pull-request job that `ci-ok` needs, and a staging job after `deploy`
- ADR-039, the documentation the tier changes, and retiring the earlier E2E plan

### Won't Do

- A watchlist spec, other browsers, mobile viewports, OAuth sign-in, following the verification link
- Sign-up on staging, rolling back a deploy, fixing the violations the baseline lists
- See the PRD's Non-Goals for the full list

---

## Tasks

### **Phase 1:** Development stacks discard mail

- [x] **1.1 Settings read `EMAIL_BACKEND` and refuse an override outside development**

    - [x] **1.1.a Write settings tests in `apps/authentication/tests/integration/test_environment_config.py`**
        - Use `load_settings` from `apps/core/tests/test_helpers.py`, as the file's refusal tests do (a refused
          configuration comes back under `error`)
        - Test: with `EMAIL_BACKEND` removed (`None`), development and staging both load
          `apps.core.email_backend.ZeptoMailEmailBackend`
        - Test: `ENVIRONMENT=development` with `django.core.mail.backends.dummy.EmailBackend` loads the dummy backend
        - Test: `staging` and `production` with the dummy backend stop with an error naming `EMAIL_BACKEND`
        - Test: `staging` with the ZeptoMail backend named explicitly loads it (only another value is refused)
        - Expect the development-override and refusal tests to FAIL initially. The default cases and the explicit
          ZeptoMail case pass against today's fixed setting, so each is seen failing against a narrow reconstruction,
          then restored: a check that refuses any `EMAIL_BACKEND` value fails the explicit-ZeptoMail test, and reading
          the setting with no default fails the default tests

    - [x] **1.1.b Read the setting in `backend/config/settings.py`**
        - Replace the fixed `EMAIL_BACKEND` (line 241) with `env("EMAIL_BACKEND", default=...)`; raise
          `ImproperlyConfigured` naming `EMAIL_BACKEND` when `ENVIRONMENT != "development"` and the value differs from
          the default, as the `DEBUG` check above it does
        - `backend/config/.env.example`: document `EMAIL_BACKEND` as development-only, commented out, beside the
          ZeptoMail lines
        - All 55 environment settings tests passed; development and refusal cases failed before implementation.
          Default and explicit-ZeptoMail assertions failed under narrow reconstructions and passed after restoration.

- [x] **1.2 Backend tests stay independent of the override**

    **Goal:** A worktree's backend container will carry the dummy backend; tests that load production settings or
    exercise ZeptoMail must not inherit it.

    - [x] **1.2.a Reproduce the leak before changing anything**
        - Run the settings and ZeptoMail tests in this worktree's stack with the override passed in:
          `docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml exec -T
          -e EMAIL_BACKEND=django.core.mail.backends.dummy.EmailBackend backend nice -n 15 pytest apps/core/tests
          apps/authentication/tests/integration/test_environment_config.py`
        - Expect failures: `load_settings` children under `staging`/`production` stop on the refusal, and
          `test_zeptomail_backend.py` sends through the dummy backend (no request reaches the stand-in)

    - [x] **1.2.b Isolate the tests**
        - `load_settings`: add `EMAIL_BACKEND` to the variables it removes from the child's environment
        - `test_zeptomail_backend.py`: name `"apps.core.email_backend.ZeptoMailEmailBackend"` at lines 35, 80, 120
          and in the child code at 151, instead of reading `EMAIL_BACKEND` from settings; drop the unused
          `base_settings` import
        - Rerun 1.2.a's command: tests should now PASS
        - **Checks:** inherited override reproduced 54 failures; after isolation all 1,096 backend tests passed
          with the dummy backend passed in. Scoped ruff lint/format and pyright passed (zero errors or warnings).

- [x] **1.3 Worktree stacks and CI's backend job set the dummy backend**

    - [x] **1.3.a Set the override**
        - `infrastructure/docker-compose.worktree.yml`: `EMAIL_BACKEND: django.core.mail.backends.dummy.EmailBackend`
          under the backend's `environment`
        - `.github/workflows/ci.yml`, backend job's "Create .env file": add the same line; update its comment, which
          says tests use the locmem backend
        - `.arc/reference/workflows/supplemental/worktree-sessions.md`, "What stays on the primary": add mail (only the
          primary checkout's stack sends it; a worktree's stack discards it)

    - [x] **1.3.b Show it in this worktree**
        - Recreate the backend container, then bring up the browsable stack (`node scripts/worktree.mjs browse`)
        - Register once through `https://localhost:{SITE_PORT}/register` with an `example.com` address: it lands on
          the sign-in page showing "Account created! Check your email…", and the backend log shows no ZeptoMail send
        - Verified registration in Chromium at the worktree origin: redirected to `/login` with the check-your-email
          message, dummy backend selected, and no ZeptoMail delivery logged. All 1,096 backend tests passed with the
          override inherited from Compose; actionlint and the updated guidance's markdown lint passed.

### **Phase 2:** The specs run against a worktree's stack

- [x] **2.1 Add Playwright tooling**

    - [x] **2.1.a Dependencies and configuration**
        - `frontend/package.json`: `@playwright/test` at exactly the `playwright-core` version in the lockfile
          (1.64.1 when planned) and `@axe-core/playwright` at an exact version; `"test:e2e": "playwright test"`
        - `frontend/playwright.config.ts`: `testDir: "e2e"`, Chromium only at 1280×800, `retries: 0`
        - By target: `local` keeps trace `retain-on-failure` and screenshot `only-on-failure`, and reports with `list`
          plus `html` (`open: "never"`); `staging` turns trace and screenshot `off` and reports with `list` only. Task
          4.1 adds its baseline reporter to both sets; task 5.1 uploads the `html` report
        - Ignore `test-results/`, `playwright-report/` and `blob-report/` in `frontend/.gitignore`
        - Installed Chromium; pinned `@playwright/test` 1.64.1 and `@axe-core/playwright` 4.14.0.

    - [x] **2.1.b Lint and type-check cover the new files**
        - Add `frontend/tsconfig.e2e.json` (`lib` `["ES2023", "DOM"]`, since specs read `window` inside `evaluate()`;
          types `node`; `include` `e2e/**/*.ts` and `playwright.config.ts`; the `@/*` path to `src/*` so fixtures
          import API types absolutely) and reference it from `frontend/tsconfig.json`, so `npm run type-check`
          (`tsc -b`) reaches it
        - `frontend/eslint.config.js`: turn the `react-hooks` rules off for `e2e/**`, since a Playwright fixture's `use`
          callback trips `react-hooks/rules-of-hooks`; keep `e2e/**` out of the `testing-library` block, whose rules
          target Testing Library rather than Playwright
        - **Check:** `npm run lint` and `npm run type-check` pass over a placeholder spec and a placeholder
          `test.extend` fixture in `e2e/`: both passed, and Playwright ran the placeholder successfully.

- [x] **2.2 Targets and the fixture boundary**

    - [x] **2.2.a Target settings**
        - `E2E_TARGET` (`local` by default, or `staging`); `E2E_BASE_URL` required, with a message naming it when
          missing; `E2E_USERNAME` and `E2E_PASSWORD` default to `dev` / `cinexplorer-dev` (`seed_dev_data`) in `local`
          and are required in `staging`, with a message naming them
        - `ignoreHTTPSErrors` only in `local` (the development stack's self-signed certificate)

    - [x] **2.2.b Fixture helper in `frontend/e2e/`**
        - Extend Playwright's `test` with a fixture that, in `local`, routes requests whose path starts with
          `/api/movies`, `/api/genres`, `/api/keywords` or `/api/people` to fixture handlers, and aborts requests to
          any other origin than the site's
        - A routed request with no fixture is aborted and recorded; the test fails at teardown naming its method and
          path. In `staging` the helper routes nothing unless a spec asks (task 3.3)
        - Fixtures are synthetic ("Movie 12", no posters) and typed against `@/types/api` so a schema change fails
          type-check; derive their shapes from the backend's schemas (`backend/apps/movie/schemas.py`)
        - Their scores span the score badge's variants (`MovieUserScore.tsx`: 7.5 and up, 5.0 to under 7.5, under
          5.0, and no votes), so local axe scans see each variant live data shows. The three scored variants carry
          `vote_count` of 10 or more (`SCORE_DISPLAY_MIN_VOTES`; below it a card shows the neutral badge), the
          no-votes case has no score or 0 votes, and these cards sit in the grid's first rows, since only the rows in
          view are rendered when a page is scanned
        - Show the failure once: a scratch spec that opens `/browse` with no fixtures fails naming
          `GET /api/movies/browse`; removed the scratch spec after confirming that exact teardown failure.
        - Lint and type-check passed. Startup probes refused missing URL, username, and password by name.

- [x] **2.3 Sign-in and sign-out spec**
    - Real sign-in reaches the welcome page and the username menu; sign-out restores Login.
    - The spec failed when the menu lost its username and passed after restoration.
    - Scoped ESLint, formatting, TypeScript, and the Chromium spec passed.

- [x] **2.4 Sign-up spec (`local` only)**
    - Unique synthetic registration reaches the real backend and the check-your-email notice on `/login`.
    - Staging skips registration. The spec failed with the notice removed and passed after restoration.
    - Both auth specs passed together in 6.5 seconds; scoped lint, formatting, and TypeScript passed.
    - Removed the temporary tooling placeholder now that real specs exercise the fixture.

- [x] **2.5 Write ADR-039 reading `Proposed`**
    - `adr-039-run-a-browser-smoke-tier.md` records the nine approved architectural decisions, alternatives,
      baseline limitations, staging artifact policy, and the relationship to agent browser checks.
    - Fetched `origin`; main had no new commits and 039 remained the next free number. Markdown lint passed.
    - Acceptance remains for verification before merge.

### **Phase 3:** Browse, movie detail and Back to Results

- [x] **3.1 Browse spec**
    - Reads titles from real page responses, verifies the result count, scrolls to the cursor request, and brings a
      newly added movie card into view. No assertion depends on fixture titles or counts.
    - Failed when infinite fetching was disabled; passed after restoration (5.7 seconds).
    - Scoped ESLint, formatting, and TypeScript passed.

- [ ] **3.2 Movie-detail spec**
    - Fixtures: the filtered browse response and `/api/movies/{tmdb_id}` for its titles
    - Open `/browse?minYear=1980&maxYear=1983`, open the card for a title from the first browse response, see the
      detail heading equal that title, press "Back to Results", and see `/browse` with `minYear=1980` and
      `maxYear=1983` still in the URL
    - Seen failing when `BackToCollectionLink` drops the filter parameters, and passing with them restored (a PRD
      success criterion)
    - **Check:** `npm run test:e2e -- e2e/movie-detail.spec.ts` against this worktree's browsable stack

- [ ] **3.3 Back to Results after a reload**

    **Note:** The setup comes from the scroll-restore fix's real-browser check: a 39-title first page delayed about
    400 ms, so results arrive after the grid mounts on its 20-card skeleton.

    - [ ] **3.3.a Write the spec**
        - The spec answers browse and detail requests itself in both targets (39 synthetic titles on the first page,
          a detail response per title)
        - Scroll to 2,600 px; open a movie whose card link is in view, found by role and its `boundingBox()`; reload
          the detail page; press "Back to Results"; `window.scrollY` lands within 20 px of 2,600
        - **Check:** `npm run test:e2e -- e2e/back-to-results.spec.ts` against this worktree's browsable stack

    - [ ] **3.3.b Show it fails when the restore is disabled**
        - Reconstruct the pre-fix behavior in `useScrollPersistence.ts` (the replace navigation that clears the
          restore signal also resets the pending restore): the spec fails, landing short (about 1,848 px in the
          original check); restore the hook and it passes (a PRD success criterion)

### **Phase 4:** Every page a spec visits is scanned with axe

- [ ] **4.1 The axe helper and its baseline**
    - A helper scans the current page with `@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
    - `frontend/e2e/axe-baseline.ts`: entries of route pattern (`/`, `/login`, `/register`, `/browse`,
      `/movie/:id`), axe rule ID and a one-line reason; the page's path picks its pattern
    - A violation no entry excuses fails the spec, naming the rule, the route and the elements axe reports
    - Each scan records the entries it matched as test annotations; a small reporter lists, at the end of the run, the
      entries no scan matched, without failing (runs of one spec file and staging-only entries stay green). Add it to
      both targets' reporter sets from task 2.1.a, beside `list` (and `html` locally), not in place of them

- [ ] **4.2 Scan every page the specs reach**
    - Each spec scans each distinct page it reaches (sign-up, sign-in, `/`, browse, movie detail), after its own
      ready check: the page's heading or result count visible, or on `/login` and `/register`, which have no heading
      of their own, the form's first labelled field
    - Seed the baseline with exactly the violations the first full local run finds on today's pages, one reason each
    - Seen failing: remove the `alt` from the footer's TMDB logo (`Footer.tsx`): the run fails naming `image-alt` and
      the route; restore it. Add a scratch entry no page violates: the run lists it; remove it (a PRD success
      criterion)
    - **Check:** the full run, `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e`, against this worktree's
      browsable stack

### **Phase 5:** The tier gates pull requests, checks staging after deploy, and is documented

- [ ] **5.1 Pull-request job**
    - New job in `.github/workflows/ci.yml` on the workflow's existing events; pin actions by commit SHA as the file
      does
    - Start the development stack (backend server, database, Redis, frontend dev server, Caddy) from the base compose
      file, not the CI overlay, which replaces the backend's server command; generate the self-signed certificate with
      `infrastructure/dev-certs/generate-cert.sh`
    - The backend `.env` carries the base compose database's credentials (`POSTGRES_DB=cinexplorer_dev`,
      `POSTGRES_USER=cinexplorer_user`, `POSTGRES_PASSWORD=cinexplorer_dev_pass`; the existing CI recipes write the
      CI overlay's `postgres` values, which this stack doesn't use), `DJANGO_SECRET_KEY`, a dummy `TMDB_API_KEY`,
      `BACKEND_URL` (no default), the dummy mail backend and `FRONTEND_URL=https://localhost:8444` (its default is
      `http://localhost:5173`)
    - The site is `https://localhost:8444`, which the development CORS and CSRF defaults already allow; the frontend
      falls back to the page's origin when `VITE_BASE_URL` is unset (`src/config/baseUrls.ts`)
    - Migrate, run `seed_dev_data`, install the frontend's dependencies and Playwright's Chromium (cached by the
      `@playwright/test` version), and run the specs with `E2E_BASE_URL=https://localhost:8444`
    - On failure, upload the `html` Playwright report (task 2.1.a) with its traces as an artifact
    - Add the job to `ci-ok`'s `needs`
    - The job's first real run is on this work's pull request, and the end-to-end CI criterion is marked from that
      run. Don't dispatch the workflow by hand from the branch to try it earlier: a manual run publishes production
      images to GHCR (the images job's publish steps)

- [ ] **5.2 Staging job after deploy**

    - [ ] **5.2.a Add the job**
        - `needs: [deploy]`, the deploy job's `if`, `environment: staging`
        - Check out, install the frontend's dependencies and Chromium, run the specs with `E2E_TARGET=staging`,
          `E2E_BASE_URL` from `vars`, `E2E_USERNAME` and `E2E_PASSWORD` from `secrets`
        - No trace, screenshot or artifact upload; a failure turns the run red and rolls nothing back

    - [ ] **5.2.b Owner: create the staging account and the environment's values**
        - A verified, non-staff account on staging, made by hand, for example through the staging site's sign-up with
          an address the Owner controls and its verification email; that needs no commands on the server, so no
          staging hold
        - In the `staging` GitHub environment: variable `E2E_BASE_URL`, secrets `E2E_USERNAME` and `E2E_PASSWORD`. No
          values in chat
        - Before merge, the Owner runs the `staging` target once from their own terminal (`npm run test:e2e` in
          `frontend/` with `E2E_TARGET=staging` and the address and account in the environment, kept out of shell
          history); a violation or failure only staging's live content or production build shows is fixed or
          baselined before merge, so the post-deploy job starts green

- [ ] **5.3 Documentation, and retiring the earlier plan**
    - `strategy-testing-methodology.md`, E2E sections (`E2E Test Coordination`, `Structure`, `Best Practices`) and
      "When to Use Each Test Type": what the tier covers, the two targets and the fixture boundary, the selector
      rule, the card-link naming the specs rely on, the axe baseline, running locally (the primary's stack sends real
      mail; resetting the registration limit), and agent browser checks as spot and visual verification, never a gate.
      The outdated example and "future" layout go
    - `strategy-quality-gates.md`: E2E Checks keeps the per-task rule (a task that changes a page or flow a spec
      drives runs the specs covering it, against the worktree's browsable stack); E2E Checks, Task List Integration's
      example and Anti-Patterns name real commands and spec files, and the browser-matrix wording goes; its Scope line
      notes that its examples use this project's commands, with QUICK-REFERENCE and the testing strategy still the
      reference for them
    - `DEVELOPMENT-RULES.md` § Quality Gates: the per-task rule under "Each task", the end-to-end job in the
      pull-request list, and the end-to-end run in the full run with a worktree's browsable stack as precondition
    - `QUICK-REFERENCE.md`: the E2E command and the full run's end-to-end step
    - `TECHNICAL-OVERVIEW.md` § 7 Testing Infrastructure: the end-to-end tier beside backend and frontend testing
    - `worktree-sessions.md` "What Runs Where": the end-to-end run, against the worktree's browsable stack
    - Re-read the backlog files as merged from `main`: its backlog cleanup changed several of them
    - Remove `prd-e2e-testing-foundation.md` and `tasks-e2e-testing-foundation.md`; in
      `plan-backend-modernization.md`, remove the "End-to-End Testing (Playwright)" section, its organization-list
      line, "Playwright" in the broader-work line, and the Status sentence "The end-to-end testing section stays until
      the smoke tests' work unit retires it."
    - `BACKLOG-TECHNICAL.md` Mobile Responsiveness Remediation: keep its goal (fixing mobile viewport issues); drop the
      CI mobile discovery tier as its scope source, promoting mobile E2E tests to blocking, its sequencing after the
      earlier E2E work unit, and the reference to the removed PRD
    - `.arc/backlog/feature/plan-user-movie-data-features.md`, "Dependencies & Sequencing": drop "Playwright E2E
      testing" from Phase 1 Backend Modernization; its own E2E Tests section, for future watchlist flows, stays
    - Search `.arc/` for remaining references to the removed files and section

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; ADR-039
  set `Accepted` before merge; the end-to-end CI criterion stays open with a note through § 1's criteria walk, is
  marked from the pull request's first green run before merge (§ 8), and this task is checked then; the staging
  criterion is proven after merge, § 9)

## Implementation Notes

- **Keep `main` merged:** activation merged it, bringing ADRs 034–038, the backlog cleanup that task 5.3 builds on,
  and a refresh-token change in the auth flow the specs drive; merge it again if it moves before Phase 1.
- **Running specs locally:** bring up this worktree's browsable stack with `node scripts/worktree.mjs browse` (it
  migrates and seeds); its address is `https://localhost:{SITE_PORT}` from `infrastructure/.env`. The primary
  checkout's stack sends real mail, so the sign-up spec never runs against it.
- **Selector rule:** outside fixture and axe helpers, every lookup starts from `getByRole`, `getByLabel` or
  `getByText`, narrowed only with `filter`, `first`, `last` and `nth`; no CSS or XPath string in any form, no
  `getByTestId`, no DOM query inside `evaluate()`. `VirtualizedMovieGrid.tsx` exposes `data-testid` attributes; the
  specs don't use them.
- **Data in assertions:** no title, count or value only fixtures guarantee; a title a spec needs comes from the browse
  response the page received, so each spec passes in both targets.

## Success Criteria

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

## Review Log

### 2026-11-06 · PRD · Pass 1

- **Artifact:** `prd-e2e-smoke.md`. Kept versions: `adversarial-review/prd-pass1.md` (`74e266ec36a1a6db`), reviewed;
  `adversarial-review/prd-pass1-round1.md` (`03e35683a64f0db9`), after the folds.
- **Rubric:** assess-design-proportionality, design-audit, spec-review (detailed), PRD structure and ADR dispositions.
- **Runner:** independent, a fresh read-only general-purpose subagent. Prompt `adversarial-review/prompt-pass1.md`,
  report `adversarial-review/report-pass1.md`.
- **Time:** 4:20 pm to 4:38 pm CT (about 18 minutes); verification and dispositions to 4:48 pm CT.
- **Findings, verified grade:** 5 major, 7 minor (the report's 12 entries; F3 and F5 share one action). All
  source-verified; none refuted, no grade changed. All originate in the original PRD.
- **Dispositions, approved by the Owner (2026-11-06):** all FIX.
    - F4 baseline identity: route pattern + rule ID; scan after the page's ready check. `new design`
      (assess-design-proportionality: proportionate; coarser than per-violation, stated in Decision 7).
    - F1 mail override vs worktree tests: `load_settings` strips `EMAIL_BACKEND`, ZeptoMail tests name the backend, CI's
      backend job sets the dummy backend, new criterion. `local correction`
    - F2 staging artifacts: staging keeps and uploads nothing; log only. `local correction`
    - F3, F5 stale baseline entries: reported, not failed. `local correction`
    - F6 off-origin requests aborted in `local`. `local correction`
    - F7 catalogue prefixes; `/api/user-movie-data` named. `local correction`
    - F8 docs propagation (DEVELOPMENT-RULES, QUICK-REFERENCE full set, testing strategy's "When to Use",
      BACKLOG-TECHNICAL reference). `local correction`
    - F9 lockfile note removed. `local correction`
    - F10 selector rule and criterion cover `page.$`, `$$`, DOM queries in `evaluate`. `local correction`
    - F11 supported local target named; primary sends real mail. `local correction`
    - F12 Decision 9 covered by ADR-034; Decision 11 `none` as a planning-document decision. `local correction`
- **Other changes approved between reviews (Owner, 2026-11-06):**
    - Retire the "End-to-End Testing (Playwright)" section of `plan-backend-modernization.md` and its organization
      line (relayed from the Owner by primary.CX and project-manager.CX; confirmed by the Owner in this session).
    - Scope addition: the movie-detail spec starts at `/browse?minYear=1980&maxYear=1983` and checks Back to Results
      keeps the parameters, with a matching success criterion.
- **Author grounding of folds:** cross-references renumbered (Mail gains requirement 18; staging is requirement 20,
  documentation 23–26); routes, `minYear`/`maxYear` URL parameters, `load_settings`'s strip list and
  BackToCollectionLink's filter preservation checked at source; markdown lint clean.
- **Stop reason:** not converged (5 major). Fix check round 1 approved by the Owner.

### 2026-11-06 · PRD · Fix check, round 1 since pass 1

- **Artifact:** `prd-e2e-smoke.md`. Kept versions: `adversarial-review/prd-pass1.md` (`74e266ec36a1a6db`) and
  `adversarial-review/prd-pass1-round1.md` (`03e35683a64f0db9`), diffed; after the folds,
  `adversarial-review/prd-pass2.md` (`4e52ecc0a188d028`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure (fold scope).
- **Runner:** independent, a fresh read-only general-purpose subagent. Prompt `adversarial-review/prompt-pass1-round1.md`,
  report `adversarial-review/report-pass1-round1.md`.
- **Time:** about 4:49 pm to 5:07 pm CT; folds applied about 6:05 pm CT after approval.
- **Findings, verified grade:** 0 major, 5 minor. All source-verified; none refuted, no grade changed. Origins: R1 from
  F4's fold, R2 from F2's and F12's folds together, R3 from F10's (partial closure), R4 from F8's (incomplete sweep),
  R5 from F12's (partial closure). All pass-1 fixes and both Owner-approved changes otherwise held at source.
- **Dispositions, approved by the Owner (2026-11-06):** all FIX, all `local correction`.
    - R1 axe criterion example: the footer TMDB logo's `alt` removed (`image-alt`, an element no spec locates); the
      failure names the axe rule and the route (requirement 15 and the criterion).
    - R2 Decision 9: a failure keeps its trace in the `local` target; on staging the job log carries it.
    - R3 selector rule: stated positively in the Specs preamble and the criterion (`getByRole`, `getByLabel`,
      `getByText`, narrowed with Playwright's filters and positions); no selector string in any form, no `getByTestId`.
    - R4 docs sweep: requirement 24 adds TECHNICAL-OVERVIEW § 7 and `worktree-sessions.md`'s mail difference;
      requirement 25 drops "Playwright" from `plan-backend-modernization.md`'s broader-work line and the mobile
      item's dependence on the retired plan; the documentation criterion names them.
    - R5 Decision 11 removed from Design Decisions; its reason moved into requirement 25.
- **Author grounding of folds:** `Footer.tsx` renders through `BaseLayout` in both `AuthLayout` and `AppLayout`, so
  every route a spec visits carries it; `VirtualizedMovieGrid.tsx:265` test ID confirmed; no reference to Decision 11
  remains; markdown lint clean.
- **Stop reason:** rounds stopped (minor-only repairs; round 2 declined by the Owner as recommended). Pass 2 approved
  by the Owner.

### 2026-11-06 · PRD · Pass 2

- **Artifact:** `prd-e2e-smoke.md`. Kept versions: `adversarial-review/prd-pass2.md` (`4e52ecc0a188d028`), reviewed;
  `adversarial-review/prd-pass2-round1.md` (`c013fa9819a2b35d`), after the folds.
- **Rubric:** assess-design-proportionality, design-audit, spec-review (detailed), PRD structure and ADR dispositions;
  pass 1's and round 1's findings and fixes given as context.
- **Runner:** independent, a fresh read-only general-purpose subagent. Prompt `adversarial-review/prompt-pass2.md`,
  report `adversarial-review/report-pass2.md`.
- **Time:** about 6:08 pm to 6:30 pm CT; verification and dispositions to about 6:31 pm CT.
- **Findings, verified grade:** 1 major, 2 minor. All source-verified; none refuted, no grade changed. F1 originates
  in the original PRD (requirements 8, 11 and 12 unchanged since the draft); F2 in `main`'s roadmap rewrite; F3 in
  the original PRD.
- **Dispositions, approved by the Owner (2026-11-06):**
    - F1 finding a card and a further page without a title: FIX `local correction`. Requirement 8 reads titles from
      the browse response and finds the card as the link named with the title; requirements 11 and 12 use it, and 11
      observes the next browse request (`tmdb_page_start`) and a card that page added.
    - F3 per-task E2E checks: FIX `local correction`. Requirement 24 keeps the strategy's per-task rule and states it
      under DEVELOPMENT-RULES' "Each task"; the strategy's browser-matrix wording goes.
    - F2 roadmap watchlist line: REJECT. Already routed to project-manager.CX, which is proposing the line to the
      Owner with the backlog-plans cleanup; this work doesn't make it stale.
- **Author grounding of folds:** `MovieCard.tsx` names both card links by the title; next pages request
  `tmdb_page_start` from `next_tmdb_page_start` (`useInfiniteMovies.ts`); markdown lint clean.
- **Stop reason:** not converged (1 major fixed). Fix check round 1 since pass 2 approved by the Owner; pass 3 not
  planned (stop after the fix check, as recommended).

### 2026-11-06 · PRD · Fix check, round 1 since pass 2

- **Artifact:** `prd-e2e-smoke.md`. Kept versions: `adversarial-review/prd-pass2.md` (`4e52ecc0a188d028`) and
  `adversarial-review/prd-pass2-round1.md` (`c013fa9819a2b35d`), diffed; settled after the folds and the post-settle
  reread, `adversarial-review/prd-settled.md` (`c271e9c40884f397`).
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure (fold scope).
- **Runner:** independent, a fresh read-only general-purpose subagent. Prompt `adversarial-review/prompt-pass2-round1.md`,
  report `adversarial-review/report-pass2-round1.md`.
- **Time:** about 6:33 pm to 6:48 pm CT.
- **Findings, verified grade:** 0 major, 2 minor. All source-verified; none refuted, no grade changed. Both originate in
  pass 2's F3 fold.
- **Dispositions, approved by the Owner (2026-11-06):** both FIX, `local correction`.
    - F1 strategy reach: requirement 24's command and matrix clause covers the whole quality-gates strategy (E2E Checks,
      Task List Integration's example, Anti-Patterns); `worktree-sessions.md`'s What Runs Where adds the end-to-end run.
    - F2 registration limit vs per-task runs: Design Considerations names the throttle message as the stack's limit and
      its reset (clear the `auth_register` throttle history from the worktree stack's cache, then rerun); requirement 23
      carries the reset into the testing strategy.
- **Author grounding of folds:** `RegistrationThrottle("3/h")` at `authentication/api.py:50`, scope `auth_register`;
  the default cache is Redis DB 0 on a persistent volume; sign-in's 5/minute limit isn't reached by one run; markdown
  lint clean.
- **Post-settle reread (spec-review coherence slice, author):** decisions, scope, requirements and criteria agree; no
  orphaned references (Design Decisions 1–10, ADR-034 covering 1–9, requirement cross-references 2→20, 6/8→13, 23→DD8
  and Design Considerations, criterion→23 and 24). Corrections inline: requirements 15 and 24 rewrapped. Nothing
  unresolved.
- **Stop reason:** converged (minor-only repairs; round 2 and pass 3 declined by the Owner as recommended). Loop total:
  2 passes, 2 fix checks; 22 findings (6 major and 15 minor fixed; 1 minor rejected).

### 2026-11-06 · Task list · Pass 1

- **Artifact:** `tasks-e2e-smoke.md`. Kept versions: `adversarial-review/tasks-pass1.md` (`851c641f3e011579`),
  reviewed; `adversarial-review/tasks-pass1-round1.md` (`529c256419a028b9`), after the folds. The folds also touched
  the PRD: `adversarial-review/prd-settled.md` (`c271e9c40884f397`, commit 3507cb87) to
  `adversarial-review/prd-tasks-pass1-round1.md` (`8e875efff5e25f2d`).
- **Rubric:** task-audit at full depth (grounding floor and eight categories), executability, coverage against the
  PRD, the task list's required shape.
- **Runner:** independent, a fresh read-only general-purpose subagent. Prompt `adversarial-review/prompt-tasks-pass1.md`,
  report `adversarial-review/report-tasks-pass1.md`.
- **Findings, verified grade:** 1 major, 7 minor. All source-verified (F1 by an ESLint probe of a `test.extend`
  fixture; F2 by `git ls-tree origin/main`); none refuted, no grade changed. F2 from `main`'s drift (#121 merged ADRs
  034–038 after planning checked the number); the rest from the task list's draft.
- **Dispositions, approved by the Owner (2026-11-06):** all FIX, all `local correction`.
    - F1 ESLint: `react-hooks` off for `e2e/**` (Playwright's `use` trips `rules-of-hooks`); the check lints a fixture.
    - F2 ADR number: ADR-039 in the PRD and the task list; 2.5 confirms the number after merging `main`.
    - F3 config: screenshot `only-on-failure`, per-target reporters (`list` + `html` locally, `list` on staging, the
      baseline reporter in both), `lib` with `DOM` in `tsconfig.e2e.json`.
    - F4 fail-first: 1.1.a names the tests passing before the change and their reconstructions.
    - F5 CI job: the base database's credentials and the rest of the `.env`; criterion 8 marked from the PR's run; no
      manual dispatch from the branch (it publishes production images).
    - F6 auth pages: `last()` for the form's Login button; ready check on the first labelled field.
    - F7 staging-only problems: fixture scores span the badge variants; the Owner's pre-merge staging run required.
    - F8 docs: the quality-gates Scope line; `plan-user-movie-data-features.md`'s Playwright line.
- **Author grounding of folds:** success criteria re-diffed against the PRD (identical); markdown lint clean.
- **Stop reason:** not converged (1 major fixed). Fix check round 1 approved by the Owner.

### 2026-11-06 · Task list · Fix check, round 1 since pass 1

- **Artifact:** `tasks-e2e-smoke.md` (and the PRD's ADR renumbering). Kept versions: `adversarial-review/tasks-pass1.md`
  and `adversarial-review/tasks-pass1-round1.md`, diffed with the PRD's `prd-settled.md` and
  `prd-tasks-pass1-round1.md`; settled after the folds and the suite-coherence pass, `adversarial-review/tasks-settled.md`.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure (fold scope).
- **Runner:** independent, a fresh read-only general-purpose subagent. Prompt
  `adversarial-review/prompt-tasks-pass1-round1.md`, report `adversarial-review/report-tasks-pass1-round1.md`.
- **Findings, verified grade:** 0 major, 3 minor. All source-verified; none refuted, no grade changed. Origins: F1 from
  pass 1's F7 fold, F2 from F5's, F3 from F2's (the merge it adds brings `main`'s backlog cleanup).
- **Dispositions, approved by the Owner (2026-11-06):** all FIX, `local correction`.
    - F1 vote floor: scored fixture variants carry `vote_count` of 10 or more, in the grid's first rows.
    - F2 criterion 8 timing: open through § 1's walk, marked from the pull request's first green run before merge.
    - F3 merged backlog sentence: 5.3 removes `plan-backend-modernization.md`'s new Status sentence and re-reads the
      merged backlog files. With it, 2.5 updates the task list's ADR references as well as the PRD's.
- **Suite-coherence pass (author):** every requirement and criterion maps to a task; criteria identical to the PRD;
  cross-task interfaces agree (reporters 2.1.a → 4.1 → 5.1; fixture helper 2.2.b → 3.x). Correction for the Owner:
  `main` is merged before Phase 1 (Implementation Notes), not inside task 2.5, since `main` also changed the auth flow
  the specs drive; 2.5 and 5.3 refer to that merge.
- **Stop reason:** converged (minor-only repairs); stopped as recommended, with no round 2 or pass 2.
  Stage total: 1 pass, 1 fix check; 11 findings (1 major and 10 minor fixed).
