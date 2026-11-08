# Task List: End-to-End Smoke Tier

**PRD:** `prd-e2e-smoke.md`
**Created:** 2026-11-06
**Branch:** `technical/e2e-smoke`
**Base Branch:** `main`
**Status:** Complete
**Completion Record:** `completion-e2e-smoke.md`
**Completed:** 2026-11-07

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

    - [x] **1.1.b Read the setting in `backend/config/settings.py`**
        - Read `EMAIL_BACKEND` from the environment with the ZeptoMail default; raise `ImproperlyConfigured`
          naming `EMAIL_BACKEND` when a non-development environment selects another backend
        - `backend/config/.env.example`: document `EMAIL_BACKEND` as development-only, commented out, beside the
          ZeptoMail lines
        - All 55 environment settings tests passed; development and refusal cases failed before implementation.
          Default and explicit-ZeptoMail assertions failed under narrow reconstructions and passed after restoration.

- [x] **1.2 Backend tests stay independent of the override**

    **Goal:** Settings and ZeptoMail transport tests stay independent of the worktree's dummy mail override.

    - [x] **1.2.a Reproduce the leak before changing anything**
        - Run the settings and ZeptoMail tests in this worktree's stack with the override passed in:
          `docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.worktree.yml exec -T
          -e EMAIL_BACKEND=django.core.mail.backends.dummy.EmailBackend backend nice -n 15 pytest apps/core/tests
          apps/authentication/tests/integration/test_environment_config.py`
        - The inherited override made `load_settings` children refuse staging/production startup and diverted
          ZeptoMail tests to the dummy backend, so no request reached their stand-in

    - [x] **1.2.b Isolate the tests**
        - `load_settings`: add `EMAIL_BACKEND` to the variables it removes from the child's environment
        - `test_zeptomail_backend.py`: name `"apps.core.email_backend.ZeptoMailEmailBackend"` at lines 35, 80, 120
          and in the child code at 151, instead of reading `EMAIL_BACKEND` from settings; drop the unused
          `base_settings` import
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
          plus `html` (`open: "never"`); `staging` turns trace and screenshot `off` and reports with `list`.
          Both targets include the baseline reporter; CI uploads the local target's `html` report on failure
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
    - Sign-out requires a successful POST `/api/logout/` response before the signed-out UI assertions.
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
    - Accepted during verification after the local checks and independent criteria pass.

### **Phase 3:** Browse, movie detail and Back to Results

- [x] **3.1 Browse spec**
    - Reads titles from real page responses, verifies the result count, scrolls to the cursor request, and brings a
      newly added movie card into view. No assertion depends on fixture titles or counts.
    - Failed when infinite fetching was disabled; passed after restoration (5.7 seconds).
    - Scoped ESLint, formatting, and TypeScript passed.

- [x] **3.2 Movie-detail spec**
    - Opens a response-named card in a year-filtered browse, checks the matching detail heading, and returns with
      both year parameters preserved.
    - Failed when the return link dropped the query; passed after restoration (3.0 seconds).
    - Scoped ESLint, formatting, and TypeScript passed.

- [x] **3.3 Back to Results after a reload**
    - [x] **3.3.a Write the spec**
        - Both targets use a delayed 39-title fixture. The spec saves 2,600 px, opens a fully visible card by role and
          bounding box, reloads detail, and returns within 20 px. Passed in 6.9 seconds.
        - Scoped ESLint, formatting, and TypeScript passed; all three navigation specs passed together in 16.3 seconds.
    - [x] **3.3.b Show it fails when the restore is disabled**
        - Reconstructed the replace navigation resetting the pending restore signal: the spec failed with a 752 px
          discrepancy (landing at 1,848 px). Restoring the hook made it pass. Reconstruction log retained locally.
        - Approved follow-up constrains restore fixtures to same-origin GETs, falling back to the shared guard for
          other requests. Browser probes failed before the guard and now prove external requests abort and unsupported
          POSTs report their method/path. All five corrected smoke specs passed in 26.4 seconds; lint and types passed.

### **Phase 4:** Every page a spec visits is scanned with axe

- [x] **4.1 The axe helper and its baseline**
    - WCAG 2.0/2.1 A/AA scans match explicit route/rule entries and annotate every match. Unexpected violations fail
      with the route, rule, and affected elements; soft assertions let the run report every reached page.
    - Both target reporter sets retain their usual reporters and list unmatched baseline entries without failing.

- [x] **4.2 Scan every page the specs reach**
    - Scans follow each distinct page's ready check in each spec. The initial run found exactly nine route/rule pairs:
      sidebar name/children on home, browse, and detail; browse hidden-focus and button names; login notice contrast.
    - Removing the footer logo's alt failed on `image-alt` for browse and detail; restoring it passed. A scratch
      `/register` entry was listed as unmatched while the focused spec passed, then removed.
    - All five specs with axe passed in 25.8 seconds. Scoped ESLint, formatting, and TypeScript passed; evidence logs
      are retained in the worktree's personal workspace.

### **Phase 5:** The tier gates pull requests, checks staging after deploy, and is documented

- [x] **5.1 Pull-request job**
    - Added the required `e2e` job on existing workflow events, using base development Compose, dummy mail, explicit
      development DB credentials, certificates, migration/seeding, and a frontend readiness check.
    - Chromium is cached by the installed Playwright version. Failures upload the HTML report with traces; cleanup
      always tears down the isolated stack. `ci-ok` now needs `e2e`.
    - Actionlint and a base-Compose configuration probe with the job's generated environment passed. The first hosted
      run remains for this work's pull request; no manual dispatch was made because it would publish images.

- [x] **5.2 Staging job after deploy**

    - [x] **5.2.a Add the job**
        - Added `e2e-staging` after `deploy`, with the same main-push condition and the staging environment. It installs
          dependencies/Chromium and reads the URL variable and credential secrets only in its test step.
        - The staging target disables trace/screenshots and the job uploads no artifacts. Failure turns the workflow
          red without rollback. Actionlint passed; the Owner's manual run is recorded below. The hosted post-deploy
          check remains for the first merged run.

    - [x] **5.2.b Owner: create the staging account and the environment's values**
        - Owner reports the verified, non-staff staging account and GitHub environment configuration complete:
          variable `E2E_BASE_URL`, secrets `E2E_USERNAME` and `E2E_PASSWORD`; no credential values were shared.
        - Owner ran the staging target from their terminal: four passed, registration skipped, in 21.1 seconds.
        - The unmatched `/login` `color-contrast` entry is expected: staging skips sign-up, so the registration
          confirmation notice is absent. The entry remains necessary for the local target.

- [x] **5.3 Documentation, and retiring the earlier plan**
    - Updated the testing strategy with the five specs, two targets, catalogue/selector contracts, score variants,
      route/rule baseline, artifacts, local/staging commands, registration-history reset, and agent browser checks.
    - Updated the quality-gates strategy, DEVELOPMENT-RULES, QUICK-REFERENCE, TECHNICAL-OVERVIEW, and worktree
      guidance: covering specs run per task, the full run includes E2E, and CI requires the smoke job. The worktree
      command lives in What Runs Where, with its browsable-stack precondition.
    - Removed the two superseded E2E foundation files and their backend-modernization section/list/dependency.
      Preserved mobile remediation's goal and the user-movie feature plan's future E2E scenarios while removing its
      dependency on the retired tier. Historical roadmap cut/change-log entries remain.
    - Markdown lint passed for all nine edited guidance/backlog documents and this task list; whitespace checks
      passed. Retirement-name searches now find only this work's intentional PRD/task requirements.

### **Phase 6:** Verification

- [x] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review; ADR-039
  set `Accepted` before merge; the end-to-end CI criterion stays open with a note through § 1's criteria walk, is
  marked from the pull request's first green run before merge (§ 8), and this task is checked then; the staging
  criterion is proven after merge, § 9)

    - The full local run, independent verification and code review are complete. PR #131 at `c0718a12` has green
      E2E and `ci-ok` jobs: all five specs passed in 34.1 seconds, including hosted registration. Criteria 7–8 are
      met. After merge, deployment and all four staging specs passed, with registration skipped and no browser
      artifacts uploaded, proving criterion 9. ADR-039 is accepted; the completion record summarizes the deliverables.

## Implementation Notes

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

- [x] With a worktree's browsable stack up, `E2E_BASE_URL=https://localhost:{SITE_PORT} npm run test:e2e` runs the
  five specs in Chromium and passes, scanning every page they reach with axe.

  Met locally: `verification-e2e.log` records all five Chromium specs passing in 24.9 seconds; source inspection
  confirms ready checks and axe scans on every distinct page reached.

- [x] The Back to Results spec fails when the restore after a reload is disabled and passes with it.

  Met: `back-to-results.spec-red.log` records a 752 px error against the 20 px tolerance; `verification-e2e.log`
  records the restored implementation passing.

- [x] The movie-detail spec fails when Back to Results drops the browse URL's filter parameters and passes with them.

  Met: `verification-filter-red.log` fails the URL assertion with `/browse` after removing the return link's query
  string; `verification-filter-green.log` passes after byte-for-byte restoration, recorded in
  `verification-filter-proof.json`.

- [x] A violation of a rule the baseline doesn't excuse on that route fails the run with a message naming the axe rule
  and the route: the footer's TMDB logo with its `alt` removed, an `image-alt` violation on an element no spec
  locates. A baseline entry whose violation is gone is listed in the run's output.

  Met: `movie-detail.spec-red.log` records the footer-logo `image-alt` failure on `/browse` and `/movie/:id`;
  `axe-unmatched-green.log` reports the scratch unmatched entry without failing. The full current run passes.

- [x] In the `local` target, a spec whose page requests a catalogue endpoint with no fixture fails, naming the
  request's method and path.

  Met: `missing-fixture-red.log` names `GET /api/movies/browse`; `restore-boundary-green.json` also confirms the
  off-origin guard and missing-POST diagnostic survive the restore fixture override.

- [x] Outside fixture and axe helpers, every element lookup in the specs starts from `getByRole`, `getByLabel` or
  `getByText`, and no CSS or XPath selector string, `getByTestId` or DOM query inside `evaluate()` appears in them.

  Met by inspecting all five spec files: lookups start with the allowed accessible queries; `evaluate()` reads window
  geometry and session storage without querying DOM elements.

- [x] Startup refuses a non-default `EMAIL_BACKEND` outside development (backend test); the sign-up spec reaches the
  check-your-email message in CI and in a worktree with no mail sent; and the backend suite passes in a worktree's
  stack with the dummy backend set.

  Met: local runtime and backend logs prove discarded mail, settings refusal and all 1,096 tests passing with the
  override inherited. PR #131 run `42405526110` at `c0718a12` also passed the registration spec, reaching the email
  verification notice with the dummy backend configured. Its retained log is `pr131-e2e-c0718a12.log`.

- [x] The pull request for this work shows the end-to-end job green, `ci-ok` needs it, and the specs' run in CI takes
  under five minutes by Playwright's report.

  Met: PR #131 run `42405526110`, head `c0718a124ccac3e99dc2ac4f1f732723cc599120`, has green E2E and required
  `ci-ok` jobs. Playwright reports all five specs passed in 34.1 seconds. The log and exact-head job snapshot are
  retained as `pr131-e2e-c0718a12.log` and `PR-CI-SNAPSHOT-c0718a12.json` beside the session notes.

- [x] Proven live: after the merge, the staging job runs after the deploy and passes against staging, signed in as the
  staging account; no account is created on staging, and the run uploads no artifact.

  Met: after merge `10bdc59290bf7731d94a3ca7bec39e2ea6a0f2ff`, push run `42406735388` successfully deployed
  staging, then its staging job passed four specs in 16.1 seconds, including real sign-in/out. Registration was
  skipped. The job has no upload step; run artifacts contain no browser report or traces. Complete deployment and
  staging logs, job identities and the artifact list are retained in the post-merge evidence beside the session notes.

- [x] The testing strategy, the quality-gates strategy, DEVELOPMENT-RULES, QUICK-REFERENCE, TECHNICAL-OVERVIEW and
  `worktree-sessions.md` describe this tier and the mail difference as requirements 23 and 24 say, and the earlier E2E
  plan's files, its section and the references requirement 25 lists are gone.

  Met by inspecting all named documentation diffs against requirements 23–25, checking both old plan files are absent
  and checking the three named backlog documents contain no retired-plan references.

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
  `prd-tasks-pass1-round1.md`; settled after the folds and the suite-coherence pass,
  `adversarial-review/tasks-settled.md`.
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

### 2026-11-07 · Verification · Author criteria walk

- **Scope:** `tasks-e2e-smoke.md` Success Criteria 1–10, the complete `main...f15f1943` diff and the resulting
  worktree. Local `main` is `51ae6e0b`; the broader diff includes the already-merged cookie-only refresh change.
  The recorded `origin/main` is `073d3bae`, whose merge base with this head is `f6f76b52`; its narrower work-unit
  diff was also inspected. Newer upstream sign-out and cache-isolation changes are not in this tested tree.
- **Preconditions:** all implementation tasks are checked; the PRD has no open questions.
- **Full local run:** 1,096 backend tests, 962 frontend tests, all five Chromium specs (24.9 seconds), backend
  lint/format, frontend lint, Chakra generation and TypeScript, Pyright, and Markdown lint passed. Formatting of the
  added frontend tooling/specs passed separately. Commands, exits and elapsed times are in `verification-checks.json`
  beside this work unit's session notes, with `verification-*.log` beside it. Frontend tests still emit the existing
  BackToTopButton `act()` warnings already captured in the inbox. New evidence notes were wrapped after scoped
  Markdown lint caught long lines; the corrected record passes.
- **Behavior evidence:** retained restore, axe and request-boundary probes were checked against source. The retained
  filter-red log had been overwritten by the later axe probe, so verification reconstructed query-string removal:
  the movie-detail spec failed at its URL assertion, then passed after the source was restored byte-for-byte.
  The dedicated new logs and source hashes retain that proof without replacing the accessibility evidence.
- **Criteria:** 1–6 and 10 met. Criterion 7 has complete local evidence and remains open for its hosted registration
  clause; 8 awaits the pull request's first green run and reported duration; 9 awaits the post-merge deployment.
  These hosted outcomes are not inferred from configuration or local results. Task 6.1 remains open.
- **Next boundary:** recommend one fresh-context independent verification pass over the same work-unit scope,
  withholding this walk and all criterion marks. No independent pass or separate code review has run in this session;
  acceptance of ADR-039 and completion metadata remain ahead. No commits were made.

### 2026-11-07 · Verification · Independent pass 1

- **Rubric and scope:** Success Criteria 1–10, complete diff `51ae6e0b...f15f1943`, and relevant terminal-tree
  dependencies. The reviewer read the full supplied diff. The task-file portion used its planning requirements,
  with all criterion text preserved and completion marks, result claims, and review records withheld. The author's
  criteria walk and personal session context were not supplied.
- **Runner:** fresh read-only general-purpose subagent `/root/verification_pass1`; no delegation or source edits.
- **Findings:** none. Primary spot-checks confirmed the cited scan/locator, mail-override, CI dependency and
  staging-artifact source claims. No finding dispositions or fixes are needed.
- **Evidence boundary:** the reviewer did not rerun the suites, registration or negative-control mutations; an
  optional anonymous browser probe produced no usable evidence and is not counted. This source pass supplements
  the author's retained execution evidence; it does not replace that evidence or prove hosted outcomes.
- **Record:** `adversarial-review/report-verification-pass1.md`, the neutral PRD/task copies, diff, exact coordinates,
  runner and timing metadata are retained beside this work unit's session notes.
- **Stop reason:** converged with zero source findings; no successor pass requested. Elapsed: 5.3 minutes.
  Criteria 7–9 and Task 6.1 retain their pending hosted-evidence state. The separate code-review stage remains ahead.

### 2026-11-07 · Code review · Author preflight

- **Scope and rubric:** complete `51ae6e0b...804c66b3` diff and terminal tree; code-review-author's scope,
  consistency, cleanup, documentation drift, unresolved markers, correctness and error paths, with repository
  contracts and the implementation-audit dimensions considered. This author check is not independent evidence.
- **Finding:** F1, major, verification quality. The sign-in/out spec can finish successfully after a failed logout
  request because it observes local state cleared before that request completes. An isolated-stack browser probe
  repeated its UI assertions and axe scans, received HTTP 503 for the logout POST, and still passed with a refresh
  cookie present. Other smoke flows were checked for the same cause; no other instance was identified.
- **Disposition, approved by the Owner (2026-11-07):** FIX (local correction). Wait for and require a successful
  real logout response while retaining the UI assertions; demonstrate rejection of the 503 counterexample and rerun
  the covering spec. The approved repair changes the spec and its evidence, not application logout behavior.
- **Evidence:** `code-review-author.json`, `CODE-REVIEW-AUTHOR.md` and `code-review-logout-probe.log` beside the
  session notes retain the exact target, complete checklist, locus and probe result.
- **Response:** the approved repair and its focused checks are recorded below. The author finding remains the
  signal from this preflight; completing its fix does not turn it into an independent or clean code review.

### 2026-11-07 · Code review · Approved response to author F1

- **Repair:** the sign-in/out spec starts waiting for the same-origin logout POST before clicking Logout, requires
  a successful response, and retains the anonymous UI checks. Application logout behavior is unchanged.
- **Fail-first evidence:** a temporary copy of the real spec forced HTTP 503 and expected the spec to reject it.
  Before the guard, all assertions passed unexpectedly and the harness failed; after the guard, the spec fails at
  `Logout returned HTTP 503` and the negative control passes. The temporary spec was removed.
- **Checks:** the covering spec passed against the real backend (5.2 seconds); scoped ESLint, Prettier and frontend
  TypeScript passed. Prettier's required wrapping of the new assertion was applied and rechecked. Broader suites
  were not repeated for this spec-only repair.
- **Evidence:** `logout-guard-red.json`, `logout-guard-green.json`, `logout-guard-proof.json` and
  `logout-guard-real-backend.log`, with the check logs and `code-review-f1-response.json`, are beside the session
  notes. Before/after source copies and `code-review-f1.patch` retain the repair boundary for a fix check.
- **Next boundary:** recommend a fresh-context focused fix check before the separate full independent code review.
  No independent fix check, commit or push was authorized or performed with this repair; hosted criteria remain open.

### 2026-11-07 · Code review · Fix check, round 1 since author preflight

- **Rubric and target:** closure, behavioral grounding, propagation/completeness and new failure for author F1's
  repair. Target: `804c66b3` plus the exact uncommitted sign-in spec, SHA-256
  `5a845cf4f464780336bc862381c4e867f0d90824122eed8acb1fa0521ba2dda8`; both kept versions were supplied.
- **Runner:** independent fresh read-only general-purpose subagent `/root/code_f1_fixcheck`.
- **Findings:** none. F1 closes for this repair. The reviewer confirmed the response waiter precedes the click,
  matches the real same-origin POST in both targets, requires success and retains the UI assertions. No concrete
  introduced defect or incomplete propagation was identified.
- **Grounding:** the reviewer inspected the raw red/green probe reports and the real-backend run log; primary
  spot-checks confirmed the exact source snapshots, expected/actual probe statuses and HTTP-503 failure locus.
  No test was rerun by the reviewer, and the removed temporary probe source was not directly inspected.
- **Record:** exact prompt, invocation, report and timing metadata are under `adversarial-review/` beside the
  session notes, named `prompt-code-f1-round1.md`, `invocation-code-f1-round1.txt`, `report-code-f1-round1.md`
  and `code-f1-fixcheck-round1-meta.json`.
- **Stop reason:** focused fix check converged with no findings. Elapsed: 4.1 minutes. The prior author
  preflight's major finding is repaired and checked; a full independent code review remains a separate decision.
  Source changes are uncommitted; hosted criteria remain open.

### 2026-11-07 · Code review · Independent pass 1

- **Rubric:** standard-review/v1, all implementation-audit dimensions plus repository contract coherence: coherence
  and maintainability, correctness/failure behavior, intent/scope, trust/compatibility, verification quality and
  repository contracts. The reviewer explicitly considered all six.
- **Exact target:** complete `51ae6e0b` to `804c66b3` working-tree change set, including the uncommitted sign-in
  repair with SHA-256 `5a845cf4f464780336bc862381c4e867f0d90824122eed8acb1fa0521ba2dda8`.
  The supplied diff covered 63 files and 4,181 lines. All executable/reference/configuration changes were exact;
  author-result regions in the task/completion documents were withheld through neutral copies.
- **Runner:** independent fresh non-author read-only general-purpose subagent `/root/code_review_pass1`; no prior
  author findings, conclusions, preferred fixes or self-verification results were supplied.
- **Findings:** none. Complete permitted source coverage returned clean. The reviewer checked all 61 permitted
  raw file hashes and deleted-file absence; primary verification confirmed all 63 original target entries and the
  diff digest before these record-only updates, and spot-checked source-backed boundary claims.
- **Limits:** withheld author-result prose was not independently assessed. No suite, browser session, staging request
  or hosted workflow ran. Source review does not prove runtime observations or pending hosted criteria.
- **Record:** exact prompt, invocation, report, neutral artifacts, diff and hash/timing manifest are beside the
  session notes under `adversarial-review/`, named `prompt-code-pass1.md`, `invocation-code-pass1.txt`,
  `report-code-pass1.md`, `code-pass1.diff` and `code-pass1-meta.json`.
- **Stop reason:** converged with zero actionable findings. Elapsed: 9.5 minutes. The earlier author F1 repair
  remains uncommitted with its review records; publication awaits Owner approval. Hosted criteria remain open.

### 2026-11-07 · Verification · First hosted CI run

- **Published target:** PR #131, head `c71993432062d843d787dacf8a2fcf65b3468755`, run `42403518778`.
  Backend tests/checks, frontend, images, API types and Docs passed; End-to-end smoke and `ci-ok` failed.
- **Failure:** backend container exited during Start development stack. Migration/seeding and Playwright never ran;
  hosted criteria 7–8 and Task 6.1 remain open. Staging jobs were skipped on the PR as configured.
- **Diagnosis:** the job builds the backend with the default UID/GID 1000 while its generated TLS private key is
  owner-only. A disposable, network-isolated probe ran the unchanged certificate generator: key mode 0600;
  UID 1000 could not load the TLS context (`PermissionError`), while the matching owner UID succeeded. Logging
  permission failure was ruled out as fatal because the app falls back to another log directory. The hosted job
  did not capture backend stdout, so its exact exception remains unavailable; key ownership is the leading cause.
- **Correction, approved by the Owner:** pass the runner UID/GID through `GITHUB_ENV` to the backend build, and
  print bounded backend logs when stack startup fails. The applied correction and its local checks are recorded
  below; the hosted startup result remains unproven until the next run.
- **Evidence:** `PR-MONITOR.json`, `PR-CI-SNAPSHOT.json`, `pr131-e2e-job.log`, `ci-startup-diagnosis.json` and
  `ci-startup-probe/` beside the session notes retain the exact target, terminal result and isolated reproductions.

### 2026-11-07 · Verification · CI startup correction

- **Change:** the E2E configuration step exports the runner's UID/GID through `GITHUB_ENV`, which Compose uses for
  the non-root backend build. Stack startup now prints bounded backend logs on failure and exits nonzero.
- **Before/after proof:** executed the real configuration step in separate CI-like project folders without the
  worktree's environment. Before, Compose selected UID/GID 1000 and the generated mode-0600 key failed TLS loading
  with `PermissionError`; after, Compose selected the runner's UID/GID and TLS loading succeeded with the key's
  private permissions preserved. Disposable containers were network-isolated.
- **Diagnostics:** executed the actual startup shell block against a Docker transport stand-in: success exits zero
  without failure logs; a failed start emits backend logs and exits one. Actionlint passed for the workflow.
- **Evidence:** `ci-startup-fix-checks/results.json`, its per-case logs, `ci-startup-fix-actionlint.log` and
  `ci-startup-fix-response.json` beside the session notes. Before/after workflow copies and `ci-startup-fix.patch`
  retain the exact correction boundary.
- **Next boundary:** recommend a focused independent review of this CI-only correction, then commit/push on the
  Owner's approval and monitor the new exact-head run. No hosted rerun, commit or push has occurred for this fix;
  criteria 7–8 and Task 6.1 remain open.

### 2026-11-07 · Code review · CI correction

- **Target and runner:** fresh non-author read-only subagent `/root/ci_correction_review` reviewed the complete
  workflow correction from `c7199343` to SHA-256
  `2f1cd1c2bae4ffc5ecb8730827f1751e73af3277100aee411fcee487e329e578`. The predecessor full review covers
  the earlier source range; task-file author bookkeeping was excluded from this correction review.
- **Result:** clean, zero actionable findings; all six standard-review dimensions explicitly considered. Source
  tracing covered runner IDs, Compose interpolation, image user, generated key and mounts. Independent extracted-shell
  checks covered startup success and failure, including diagnostic logging failure; failures remained nonzero.
- **Limits and record:** no real stack, heavy suites or hosted Actions ran in the review. The report and identity
  metadata are retained as `adversarial-review/report-ci-correction.md` and `ci-correction-meta.json` beside the
  session notes. Hosted startup and criteria 7–8 remain pending the approved correction push.
- **Publication:** the Owner approved this focused review and, if clean, one commit/push of the correction and its
  evidence followed by exact-head CI monitoring. Task 6.1 remains open until hosted evidence is available.

### 2026-11-07 · Verification · Corrected hosted CI run

- **Target:** PR #131, head `c0718a124ccac3e99dc2ac4f1f732723cc599120`, workflow run `42405526110`.
  All seven pre-deploy checks and required `ci-ok` passed. The head was re-read before accepting the result.
- **E2E evidence:** stack startup, migration/seeding and Playwright passed; all five specs passed in 34.1 seconds,
  including registration reaching the verification notice. The configured dummy mail backend discards mail.
- **Criteria:** 7–8 and Task 6.1 are now checked from hosted evidence. Criterion 9 remains open; deploy and staging
  smoke were skipped for this PR event as configured. No merge or post-merge outcome is inferred.
- **Record:** complete job log `pr131-e2e-c0718a12.log`, snapshot `PR-CI-SNAPSHOT-c0718a12.json`, and terminal
  `PR-MONITOR.json` beside the session notes. The earlier failed run and its diagnosis remain preserved separately.

### 2026-11-07 · Verification · Post-merge staging

- **Target:** merge commit `10bdc59290bf7731d94a3ca7bec39e2ea6a0f2ff`, push run `42406735388`.
  All pre-deploy checks, `ci-ok`, deployment and staging smoke passed; the workflow completed successfully.
- **Live proof:** deployment job `128506877737` succeeded before staging job `128507062197` began. The staging
  target passed four specs in 16.1 seconds, including sign-in/out against the real session. Registration was skipped
  before its page interaction. The staging job has no artifact-upload step; the complete run artifact list contains
  coverage, generated types/schema and build records, with no browser report, screenshot or trace artifact.
- **Record:** `post-merge-deploy.log`, `post-merge-staging.log`, `POST-MERGE-EVIDENCE.json`, and terminal
  `POST-MERGE-MONITOR.json` beside the work unit's session notes retain the exact target and evidence.
- **Closure:** criterion 9 is now met; all ten criteria and Task 6.1 are complete. Final metadata and this record
  are prepared on main for the Owner's commit/push decision. Worktree removal and archival remain separate.
