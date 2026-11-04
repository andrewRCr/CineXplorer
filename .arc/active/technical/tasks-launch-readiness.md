# Task List: Launch Readiness

**PRD:** `prd-launch-readiness.md`
**Created:** 2026-11-03
**Branch:** `technical/launch-readiness`
**Base Branch:** `main`
**Status:** In Progress

## Overview

**Purpose:** Make the staging host ready to open sign-up to the public: every merged change deploys automatically,
the database is backed up nightly off the server with a rehearsed restore, expired data is cleaned up nightly,
failures reach the maintainer, email sign-up and Google and GitHub sign-in work on the deployed host, and the
authentication gaps that matter once sign-up is public are closed.

## Scope

### Will Do

- A throttle history per anonymous authentication endpoint, throttle state per request, and only the allauth
  endpoints the site uses (R18, R19, R24)
- CSRF checked on every unsafe request, the frontend sending Django's token everywhere, unit tests for the sign-in
  client, a password user kept signed in while the refresh token is valid, and the authentication reference brought
  in line (R20, R21, R25, R27, R28)
- A ZeptoMail backend with a timeout and quiet logging, a failed send answered with `503` and a retry that works, OAuth
  apps and the Site record from the deployed environment, and a health check that covers the database (R13,
  R15–R17, R22, R23)
- CI that skips `.arc/`-only pushes, checks the production Caddyfile and Compose file, and deploys `main` over a key
  locked to one command; the deploy script and entry point, one operations lock, nightly backup and maintenance jobs,
  the bootstrap's additions and the runbook (R1–R12, R14, R26)
- Staging taking this change by the runbook and proving it live, then the checks that need a push to `main`

### Won't Do

- The move to `cinexplorer.andrewcreekmore.dev` and a second environment (the runbook documents the move)
- Branch deploys from CI, automatic rollback and zero-downtime deploys
- Hiding an unconfigured provider's button, Google's brand verification and the privacy policy page it needs
- Backup encryption, droplet backups, point-in-time recovery, backups more often than nightly, and backing up Caddy's
  certificates or the env files
- Monitoring beyond the health endpoint and the two nightly jobs; atomic throttle counting across workers; new or
  changed rate limits
- Registration's response to a failed send, an upstream ZeptoMail fix, and the sender's display name
- CORS changes, CSRF checks on safe methods, and end-to-end tests of sign-up and sign-in
- A resolving sign-in state (the moment on load that shows a signed-in user as signed out), moving the sign-in state
  onto TanStack Query, and the `{"error"}` bodies the authentication endpoints return today
- Application behavior, API schema or type changes beyond R13, R15, R16, R18–R24 and R28

---

## Tasks

### **Phase 1:** Each sign-in endpoint counts only its own requests, and allauth answers only what the site uses

- [x] **1.1 Each anonymous authentication throttle keeps its own history** (R18; Implemented 1)

    - [x] **1.1.a Write tests:** four cross-endpoint cases in `test_rate_limiting.py` prove that sign-in
      attempts do not consume registration/resend capacity, and vice versa. All four failed with `429` against
      the shared history before the change; the cases share one indivisible scope change.
    - [x] **1.1.b Give each endpoint its own scope:** `RegistrationThrottle`, `LoginThrottle` and
      `ResendVerificationThrottle` use `auth_register`, `auth_login` and `auth_resend_verification`, respectively.
      The endpoint rates remain `3/h`, `5/m` and `3/h`.
    - Checks: authentication suite 219 passed; Ruff lint/format and scoped Pyright passed.

- [x] **1.2 Concurrent requests are each counted under their own key** (R19; Implemented 1)

    - [x] **1.2.a Write tests:** deterministic interleavings against Redis in `test_throttles.py` exercise
      anonymous and authenticated requests on shared throttle objects, including a refused request's `wait()`.
      All four cases failed before the fix (missing first history or `30` instead of `40` seconds).
    - [x] **1.2.b Keep the per-request state in thread-local storage:** both bases inherit a shared mixin whose
      `key`, `history` and `now` properties use `threading.local()`. Test-mode bypass remains unchanged.
    - Checks: authentication suite 223 passed; four concurrency cases passed again after type refinements;
      Ruff lint/format and scoped Pyright passed. The four cases share one indivisible state-isolation change.

- [x] **1.3 Only the allauth endpoints the site uses answer** (R24; Implemented 9)

    - [x] **1.3.a Write tests:** ten endpoint cases cover closed sign-up/password sign-in, the app client,
      config and an unlisted method, plus all five allowed path/method combinations. The five closed cases failed
      before the change. Each allowed case failed with `404` when its entry was temporarily omitted, then passed
      after restoration. Password-reset throttling is disabled in test settings alongside email confirmation.
    - [x] **1.3.b Add the allowlist and remove the unused token strategy:** `AllauthEndpointMiddleware`
      runs before CSRF and matches the four exact browser paths and methods. User assertions resolve the configured
      model, with abstract annotations in this and the rate-limit tests, ready for a user-model swap. Removed `HEADLESS_TOKEN_STRATEGY`
      and its adapter description; provider callbacks remain under `/accounts/`.
    - Checks: authentication suite 233 passed; ten allowlist cases passed again after type refinements;
      Ruff lint/format and scoped Pyright passed. The endpoint cases share one allowlist implementation.

### **Phase 2:** Every unsafe request is CSRF-checked, the site sends the token, and password users stay signed in

- [x] **2.1 The sign-in client has unit tests** (R25; Implemented 10)

    - [x] **2.1.a `utilities/tokenUtils.ts`:** twelve cases cover named cookies, JWT expiry, storage selection,
      round trips, clearing both storages, and current, expired and absent tokens.
    - [x] **2.1.b `useAuth`:** ten network-backed cases cover initial password/anonymous state, Google/GitHub
      sessions, password sign-in with both remember-me settings, both sign-out paths, and expired access on load
      and at the idle poll. Refresh-unavailable cases capture current behavior; 2.5 adds refresh outcomes.
    - `origin/main` was fetched and the approved merge was already up to date. All 22 tests passed on arrival,
      failed under controlled behavioral mutations, and passed after restoration. Mutation reports are retained
      in this work unit's personal workspace. Related tests, frontend lint, Prettier and TypeScript passed after
      generating the missing local Chakra recipe typings. Network helpers share the existing MSW server.

- [x] **2.2 The frontend sends Django's `csrftoken` on every unsafe request** (R21; Implemented 3)

    - [x] **2.2.a Write tests:** fourteen CSRF cases cover the cookie reader, all four unsafe API verbs,
      initialization before unsafe requests, safe GETs, the refresh POST, password-reset completion, OAuth
      sign-out, and OAuth form submission. Reset, sign-out and form cases cover both present and missing cookies.
      Eleven cases failed against the original behavior. The two already-working guards failed with safe-request
      initialization added or the form field omitted; the added missing-cookie sign-out case failed with
      initialization omitted. All passed after restoration and implementation.
    - [x] **2.2.b Read and send `csrftoken`:** the helper reuses the token-cookie reader; the unsafe-request
      interceptor, bare refresh request, OAuth DELETE, password-reset fetch and OAuth start form await cookie
      initialization and send Django's token. Safe requests do not initialize it.
    - Checks: 178 related frontend tests passed (16 files), frontend lint, TypeScript and Prettier passed.
      The coupled cases exercise one CSRF contract across the direct browser request paths. Astra's bounded
      source check found no material issue; the verification phase remains pending.

- [x] **2.3 Every unsafe request is CSRF-checked** (R20; Implemented 2, and Proven live 13 in 5.5)

    - [x] **2.3.a Rewrite the CSRF tests:** enforcing clients exercise missing, mismatched and matching tokens
      across all nine specified POST paths plus session-only PATCH and DELETE. Refusals preserve users, email
      verification state, messages and movie entries; HTTPS cross-site Origin is rejected. Error-body tests cover
      DEBUG off/on, anonymous movie writes use fresh clients, and token endpoint tests prove a returned masked
      token works instead of requiring it to equal the cookie secret.
    - [x] **2.3.b Replace the middleware:** `CsrfProtectionMiddleware` delegates to Django with the callback's
      exemption hidden, retains its token, Origin/Referer and test-client behavior, and returns the fixed JSON
      refusal. Only the two log POSTs and development toolbar are exempt. Updated middleware registration and
      the system-check comment.
    - Fail-first evidence: 25 behavioral failures before implementation; all eleven matching-token cases failed
      when their header was omitted, both log cases failed with exemptions omitted, and the token endpoint case
      failed with an incorrect returned token. Restored before final checks. The cases share one middleware change.
    - Checks: full backend suite 947 passed; touched-app Ruff lint/format, scoped Pyright and task-list lint passed.
      The full run exposed the obsolete masked-token equality assertion, which now checks an enforcing request.

- [x] **2.4 The authentication reference and every description of the old design match the new one** (R27;
  Implemented 12)
    - Updated the strategy's CSRF model, frontend request/form examples and allauth client/endpoint descriptions,
      including masked tokens, Origin/Referer, required OAuth tokens and the complete allowlist. Authentication
      examples use the current route and hook names. Provider setup changes accompany 3.4; refresh changes accompany 2.5.
    - Updated API configuration, cookie-auth comments, OAuth-start documentation and security/user API test prose.
      Removed the unused `backend/scripts/test_csrf_protection.sh`.
    - The case-insensitive search finds no old-design description outside planning/archive records; its one source
      hit explains hiding Ninja's `csrf_exempt` flag for Django validation. Checks: markdown lint, touched Python
      lint/format, scoped Pyright, 259 authentication tests, four related OAuth tests, frontend types/lint/format passed.

- [x] **2.5 A password user stays signed in while the refresh token is valid** (R28; Implemented 10 and 12, and Proven
  live 15 in 5.5)

    - [x] **2.5.a Reproduce the sign-out by hand:** on the primary's browser stack, the Owner signed in with a
      password successfully; six minutes idle left the page signed out, and reloading did not restore it.
    - [x] **2.5.b Write tests:** eleven hook cases cover load/idle/profile renewal, failure cleanup, original
      storage, lock waiting, another tab's token, shared hook/interceptor refresh, providers and the fallback.
      Five API-client cases cover strict expiry boundaries and preserving a successful renewal when its retry fails.
      Eight renewal cases failed before implementation; controlled mutations proved the existing sharing/provider
      guards and each additional boundary case fail when their behavior is broken. Retained concurrent malformed/
      failed-refresh tests now synchronize at the network boundary instead of counting storage reads.
    - [x] **2.5.c Refresh before signing out:** one exported pending refresh promise coordinates the hook and
      interceptor. A named Web Lock covers rereading, validating and storing tokens; only a current token expiring
      strictly later is reused. New tokens stay in the chosen browser storage. Automatic failure clears local
      state; the interceptor owns its redirect and handles retry failure separately. Mount's state effect owns
      profile loading. Updated the authentication reference and kept the effects-based credential-renewal exception.
    - Checks: 200 related frontend tests passed (16 files); type-aware lint, TypeScript, Prettier and markdown lint
      passed. Astra's bounded integration advice supported the shared promise and caller-owned failures; execution
      and checks stayed here. Live verification of the fix remains in 5.5.

### **Phase 3:** A failed email is a handled error, and the deployed host configures sign-in, its Site and health

- [x] **3.1 The ZeptoMail backend times out, logs quietly and never raises** (R23; Implemented 4, transport half)

    - [x] **3.1.a Write tests:** shared HTTP-adapter stand-in covers acceptance, timeout, connection failure,
      documented provider refusal and a gateway HTML response, checking `(10, 10)`, counts, quiet stdout and
      sanitized log levels/identifiers. Current key/region and a fresh interpreter with no key are covered. All
      seven new cases failed against the package backend; the existing multipart test passed before and after.
    - [x] **3.1.b Write the project backend:** lazy message conversion and an explicit bounded POST, sanitized
      outcomes, and zero sent on configuration, conversion or transport failure. Missing-key sends avoid the
      package's message import. Configured it, updated backend descriptions, pinned the converter to `0.0.4`,
      and added narrow stubs for the used external interfaces. The transport helper is reusable by 3.2.
    - Checks: rebuilt the isolated backend image after the pin; 494 core/authentication tests passed. Ruff lint/
      format and scoped Pyright passed. The response fixture follows the provider's documented error envelope;
      no actual mail or provider credentials were used in the tests. The coupled cases share one backend change.

- [x] **3.2 A failed send answers `503`, and the resend token survives it** (R22, backend; Implemented 4 and 5)

    - [x] **3.2.a Write tests:** enforcing clients and the project backend exercise failed password requests
      for known/unknown addresses and both resend address-record paths, with sanitized auth logs. Real Redis
      lifetime checks cover renewal from 30 seconds to 600, successful retry, spent-token reuse and read-only
      validation. The five cases failed before their changes; controlled omissions of renewal/consumption and an
      unsafe log failed the new guards. Replaced two obsolete consume-on-read mock cases with these real flows.
    - [x] **3.2.b Handle the failure:** allauth middleware returns the fixed detail-only 503; resend catches
      delivery failures, logs the endpoint/user ID without traceback, renews the token and raises `UpstreamError`.
      Only a successful send consumes it. Declared and regenerated the resend 503 and its one-field schema.
    - Merged approved `origin/main` through `32850e40`; kept refresh behavior and main's hook/timing updates.
      Corrected redundant cleanup and an empty `act` call for its new lint rules. Merge checks: 206 related frontend
      tests, lint and TypeScript passed. Backend checks: 497 core/authentication tests, Ruff and scoped Pyright
      passed; registration's failure behavior remains covered. Frontend generated types and documentation checked.

- [x] **3.3 The forgot-password page and the resend action show the failed-send message** (R22, frontend;
  Implemented 3)

    - [x] **3.3.a Write tests:** rendered pages use MSW and `userEvent`, including an unverified login followed
      by the resend action. Toasters are mounted and their visible text asserted. Reset covers 503/500/400/network/
      success; resend covers 503/429/500/400/network; the API client covers both handled 503s, both 500s and another
      endpoint's 503. The four new 503 outcomes failed before implementation. All eleven already-working outcome
      guards failed under controlled reconstructions, then passed with source restored.
    - [x] **3.3.b Show the message:** password reset preserves the original Axios rejection; both callers show
      the detail message on 503, retaining their other outcomes. A typed request flag suppresses the global toast
      only for these handled 503s. Forgot-password uses the existing priority error toast without new styling.
    - Checks: 221 related frontend tests passed (20 files), type-aware lint and TypeScript passed. Mechanical fixes
      removed the unused Axios import and wrapped test toast-store cleanup in `act`; no new act warnings remain.

- [x] **3.4 Deployed environments take the OAuth apps from their environment** (R15; Implemented 6, first half)

    - [x] **3.4.a Write tests:** seventeen real-settings subprocess cases cover complete, absent and either
      partial pair for both providers in staging/production, plus development ignoring all four values. Twelve
      complete/partial cases failed before implementation. Controlled reconstructions made the four absent-pair
      guards and the development guard fail, then all passed after restoration.
    - [x] **3.4.b Read the apps in `config/settings.py`:** complete deployed pairs populate each provider's
      `APP`, partial pairs raise `ImproperlyConfigured` naming the missing variable, and development keeps database
      apps. Updated env guidance/checklist and the provider setup reference, including development callback URLs
      through the HTTPS proxy and avoiding duplicate database/settings apps.
    - Checks: 279 authentication tests passed; Ruff lint/format, scoped Pyright and markdown lint passed.
      The coupled configuration cases share one credential-pair implementation; no actual credentials were used.

- [x] **3.5 Each deploy sets the Site record from the deployment** (R16; Implemented 6, second half)

    - [x] **3.5.a Write tests:** real Site records prove domain/name updates, changed/unchanged reporting and
      repeat-run idempotence; missing deployed configuration raises `CommandError` without changing records.
      Subprocess cases prove the development default and staging's unset value with settings still loading. All
      four cases failed before the command/setting existed and pass after implementation.
    - [x] **3.5.b Add the setting and command:** `SITE_DOMAIN` defaults only in development; `configure_site`
      creates or updates the `SITE_ID` row, clears Site's cache after a change and refuses an unset domain.
      Production Compose supplies the bare `SITE_ADDRESS` beside the derived frontend URL.
    - Checks: 239 core tests passed; Ruff lint/format, scoped Pyright and production Compose `config --quiet`
      passed. The command and its settings cases are one deployment-identity concern.

- [x] **3.6 The health check covers the database** (R13; Implemented 5)

    - [x] **3.6.a Write tests:** real database requests assert both complete bodies; a closed local port makes
      the driver fail without patching project code. The outage case initially returned 200. Both cases pass with
      the query; the healthy guard failed when the SQL was temporarily made to fail, then passed after restoration.
    - [x] **3.6.b Query the database:** the service runs `SELECT 1` on the default connection and maps database
      failures to a fixed 503 through the domain handler. Declared both responses, rewrote the endpoint description
      and regenerated only the health contract and its response types. Redis remains outside the readiness check.
    - Checks: 241 core tests passed; Ruff lint/format, scoped Pyright and frontend TypeScript passed. The full
      backend suite remains for CI/verification; the affected core and authentication apps have passed their checks.

### **Phase 4:** The server deploys, backs up and cleans up on its own

- [x] **4.1 `.arc/`-only pushes start no CI run, and manual runs queue apart** (R6, R4; Implemented 8)
    - The push trigger ignores `.arc/**`; pull requests/manual runs remain unfiltered. Manual dispatches use their
      run ID in the concurrency group, apart from push/PR groups; main push runs retain their uncancelled group.
    - Extracted the existing documentation job into a reusable workflow that also runs on main pushes touching
      `.arc/**`. CI keeps its `markdown` job ID and `ci-ok` dependencies unchanged.
    - Checks: `actionlint` passed for both workflows, all 20 recovery-hook tests passed and markdown lint passed.
      Hosted trigger/concurrency evidence remains in 5.2 and after merge.

- [x] **4.2 CI checks the production Caddyfile and Compose file** (R7; Implemented 7)
    - The images job validates Caddy immediately after the web build with non-secret placeholder inputs and a valid
      bcrypt fixture, then validates production Compose with the backend env example's absolute path.
    - Checks: built the current web production image under an isolated local tag; both validation commands passed.
      Caddy rejected a mounted copy with an invalid directive, and Compose rejected a syntax-error copy.
      `actionlint` passed. The hosted job's evidence remains in 5.2.

- [x] **4.3 Write `infrastructure/deploy/deploy.sh`** (R1)
    - Added the six stable step markers, clean-checkout check, target checkout/tag update, configuration/pull/
      migrations, Site configuration, startup/public health check and success-only UTC history append. Every Compose
      invocation uses the production file and external env file from the infrastructure directory.
    - Previous version comes from the latest successful history entry, then a running/stopped backend container's
      image tag/revision label, then placeholders. It never uses the checkout or configured image tag as history.
    - Checks: Bash syntax, ShellCheck and test-harness Ruff passed. Six disposable Ubuntu-container cases cover
      history priority, stopped-container fallback, no previous version, dirty refusal, migration failure and public
      health failure. All six guards failed under narrow behavioral reconstructions and passed after restoration.
      Actual deployment/locking evidence remains in 5.2.

- [x] **4.4 Install the deploy entry point and restrict the CI key** (R2, R3, R5, R12)
    - Bootstrap installs the root-owned 755 entry point, private deploy-owned log/backup directories and the CI
      key's exact restricted forced-command line after the owner's keys, or the owner's keys alone when absent.
    - Both invocation forms fetch and validate the target, lock operations and run a temporary copy of its script;
      trusted manual shells reuse their held lock. CI rejects malformed/off-main/stale targets before locking and
      rechecks stale history after waiting, allowing the current version to be rerun.
    - CI uses a detached worker, private full log, exact marker allowlist and atomic status sidecar. It keeps its
      lock and records its outcome after the follower's session is killed; failures return their actual status
      and log path without private output. Missing scripts name the runbook's manual steps.
    - Checks: Bash syntax/ShellCheck passed for bootstrap and both embedded scripts; harness Ruff passed.
      All 16 deploy/bootstrap/entry-point tests passed in disposable Ubuntu containers with real Git, flock,
      Docker packages and SSH/sudo parsers. Both key configurations were unchanged on the second sudo run.
      Twelve narrow reconstructions failed their guards, then all tests passed after restoration. Corrected the
      test session launcher's missing `setsid --wait`, used deploy-owned history and distinct owner/CI fixture keys.
    - Astra's bounded implementation advice supported the private worker/follower, atomic outcome and post-lock
      stale check; execution and validation stayed here. Real SSH restrictions remain for 5.3.

- [ ] **4.5 Add the `deploy` job** (R4)
    - `needs: [ci-ok]`; a condition admitting a push to `main` only; environment `staging`; `permissions:
      contents: read`; concurrency group `deploy-staging` without cancellation; no checkout
    - The key and the host key line written to files only the runner user can read; `ssh` as `deploy` to
      `DEPLOY_HOST` with strict host key checking against that line and `ServerAliveInterval`, sending `$GITHUB_SHA`
    - No `pull_request_target` or `workflow_run` trigger
    - Check: `actionlint`; the job does not run on the draft pull request (5.2; Implemented 8); Proven after merge 1
      and 3 are the proof (6.2)

- [ ] **4.6 Add the nightly backup and maintenance jobs** (R8, R11, R12)
    - `infrastructure/deploy/backup.sh` (R8's four steps and its `/fail` path) and `maintenance.sh` (R11), reading
      their settings from the environment `ops.env` provides; `infrastructure/ops.env.example` lists every variable
      with no real values
    - The rclone image pinned to a release line and configured by `RCLONE_CONFIG_<remote>_*` variables only
    - `bootstrap.sh` carries the four units: each service `Type=oneshot` as `deploy`, with
      `EnvironmentFile=/opt/cinexplorer/ops.env` and its script started under
      `flock -w 1800 /opt/cinexplorer/ops.lock`; each timer daily at its UTC time with `Persistent=true`;
      `systemctl daemon-reload` when a unit changed, and both timers enabled and started
    - `backend/config/.env.example`'s production checklist names the nightly timers in place of its daily
      `flushexpiredtokens` cron job (R15)
    - Check: `bash -n`, `shellcheck` and `systemd-analyze verify` on the units; 4.4's container run again, first run
      `CHANGED`, second `UNCHANGED`; Proven live 3, 4 and 7 are the proof

- [ ] **4.7 Update the runbook, `infrastructure/deploy/README.md`** (R26, with R9, R10 and R14)
    - Each item R26 lists, in the order a maintainer meets them: first-time setup's additions, with R9's bucket
      settings and R14's monitors; automatic and manual deploys, and where a CI deploy's output and outcome are; the
      manual steps for a commit without the deploy script; updating the server itself; rollback with R26's target
      rule; R10's restore; the nightly jobs; the monitors; the move to the production host
    - The opening note on what staging supports
    - Check: every shell block passes `bash -n`, and every Compose command selects the production file and env file

### **Phase 5:** Staging takes this change and proves it live

- [ ] **5.1 The maintainer's setup outside the repository** (Dependencies and Preconditions; Proven live 6, 11, 12)
    - Each step in the PRD's Dependencies and Preconditions, by the runbook: the Cloudflare R2 bucket, its token and
      lifecycle rule; the two Healthchecks.io checks; the UptimeRobot monitor; the Google client and its published
      consent screen; the GitHub OAuth App; the ZeptoMail token; the CI key pair, its public half at
      `/opt/cinexplorer/ci-deploy.pub`, and the `staging` environment's branch rule, secrets and variable
    - `/opt/cinexplorer/ops.env` at mode `600`, made from `ops.env.example`
    - Proven live 6 and 11 recorded from what each console showed; Proven live 12's `gh api` commands
    - The ZeptoMail token and the OAuth credentials stay off the server until 5.5

- [ ] **5.2 Publish this branch's images and take the change on staging** (Proven live 3, 2)
    - Push the branch (its first push, `git push -u origin technical/launch-readiness`, with the Owner's approval) and
      dispatch a manual CI run at the exact commit to deploy, which publishes its `sha-` images
    - Open a draft pull request against `main`, with the Owner's approval: its runs are the evidence for Implemented
      7 and 8, the latest one, after the last merge from `main`, at 6.1
    - Before anything changes on the server: there is no `deploy-history.log` yet, so confirm the running `backend`
      container carries `org.opencontainers.image.revision` (R1's fallback)
    - In a shell holding the operations lock, by the runbook's server update: check out the branch commit, run the
      bootstrap twice and `systemctl list-timers` (Proven live 3), then `cinexplorer-deploy <commit>` with a backup
      started meanwhile from a second session (Proven live 2); outside the shell, the redeploy with a backup started
      during it, and the refusal of the earlier `main` commit
    - Anything the runbook or the scripts got wrong is fixed on the branch, published and redeployed, not worked
      around on the server

- [ ] **5.3 The CI key runs only the deploy** (Proven live 1)
    - From a local terminal with the CI key, each refusal Proven live 1 lists, with `deploy-history.log` unchanged
      after each; then `deploy`'s `authorized_keys` on the server

- [ ] **5.4 Backups, the restore rehearsal, maintenance and monitoring** (Proven live 4, 5, 7, 8)
    - The backup by hand, its failure with a bucket that does not exist and the alert email, the next success, and
      after the first night the timer's own ping (Proven live 4)
    - A dump from R2 restored by the runbook's procedure into a local production stack built from this change's
      images, then the staging account's sign-in and watchlist there (Proven live 5; Phase 5 note)
    - The maintenance run by hand and, after the first night, the timer's own ping (Proven live 7)
    - The outage checks with `backend` and then `db` stopped, in a shell holding the operations lock so no deploy or
      nightly job runs during them (Proven live 8)

- [ ] **5.5 Credentials only now, then email and sign-in live** (R17; Proven live 9, 10, 13, 15)
    - Only with this change's images running on staging (5.2): `ZEPTOMAIL_API_KEY`,
      `ZEPTOMAIL_SENDER_EMAIL=cinexplorer@andrewcreekmore.dev` and the four OAuth variables go into
      `/opt/cinexplorer/backend.env`, by the runbook's entries; until then allauth's own sign-up and sign-in stay
      reachable on the old images, and the hardening is not deployed. The key is unset on staging today
    - Redeploy with `cinexplorer-deploy`, and confirm the recreated `backend` container has the new variables
    - Proven live 9 (Gmail sign-up, verification, sign-in, password reset and the logs), 10 (Google and GitHub
      sign-in and the watchlist), 13 (a cross-site sign-in refused, the site's own accepted) and 15 (a password user
      still signed in after an idle tab, and after reopening the watchlist page once the access token has expired)

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)
    - Implemented 7 and 8 cite the draft pull request's latest run (5.2); where `archive-completed.md` opens the pull
      request, mark that draft ready instead
    - The Proven after merge criteria and 6.2 stay open at this point by design; the report names them

- [ ] **6.2 Prove the post-merge criteria** (Proven after merge 1–3)
    - From the main checkout, after the pull request merges and before archiving (`archive-completed.md` Phase 3):
      Proven after merge 1 on the merge commit's push run; its evidence recorded here in an `.arc/`-only commit pushed
      to `main` with the Owner's approval, whose push is Proven after merge 2's; then Proven after merge 3 with the CI
      key; the evidence for 2 and 3 in a second `.arc/`-only commit; then the archive

## Implementation Notes

### Sequencing with `main`

- Merged `origin/main` through #67 (`f49b6837`) before 2.3: domain exceptions, the custom user model and type-aware
  frontend lint. Recreated this worktree's database volume; `pytest apps/ --create-db` passed all 920 tests.
  Conflict resolution preserves both CSRF and queued-refresh tests, synchronous OAuth submission with a present
  cookie, and missing-cookie initialization. Related frontend tests: 184 passed; lint, TypeScript and scoped
  backend checks passed.

- **Backend style:** `main`'s `ruff format` and Google-style docstring rules are merged into this branch; backend
  code passes `ruff format --check` and `ruff check` with them
- **Frontend standards queue:** before the first frontend commit (2.1), merge `main`, which now formats the frontend
  with Prettier and checks it in CI (`format:check`), and run `npm run format` on this branch's frontend files. That
  merge also brings TMDB error changes with a regenerated `openapi.json` and `api.ts`: when a merge conflicts in
  either, regenerate them rather than resolving by hand. The frontend tests here use `main`'s shared Mock Service
  Worker server (`tests/mocks/server.ts`, handlers under `tests/mocks/handlers/`, started in `tests/setup.ts` with
  `onUnhandledRequest: 'error'`), adding each test's handlers with `server.use`. The type, lint and React rule
  tightenings, the `logger.ts` import fix and frontend coverage in `ci.yml`: whichever of this branch and each lands
  second merges `main` and passes them
- **`main`'s development rules** (testing, errors and logging, service layer, frontend data):
    - Backend tests run against the real database and replace only the named boundaries (TMDB, the OAuth providers,
      ZeptoMail, time) at their client; a test that would patch the project's own code means the code needs a seam
    - Frontend tests find elements by role and accessible name and act through `userEvent`
    - Logs carry no email address, token or key at any level (3.1, 3.2)
    - Services raise domain exceptions that one API-layer handler maps to responses (3.2.b; Phase 3 note)
    - Server data is read through TanStack Query; R28's refresh in `useAuth`'s effects is its recorded exception
- **The profile endpoint's removal** (pull request #59, merged on `main`) rewrites `test_csrf_protection.py` around
  `PATCH /api/user-movie-data/{id}` and changes `test_user_api.py`; 2.3.a and 2.4 start from those files as `main`
  leaves them
- **The backend lint and type job:** if it lands first, its job is in `ci-ok`'s `needs` and runs like every other job;
  whichever lands second merges `main` and keeps both. The path filter (4.1) needs nothing from it
- **The browsable stack per worktree** may also change `infrastructure/`: whichever merges second merges `main` first

### Phase 1

- **Django Ninja's throttle state:** `SimpleRateThrottle.allow_request` sets `self.key`, `self.history` and
  `self.now`, and `throttle_success` and `wait()` read them (`ninja/throttling.py`); the scope is part of the cache
  key (`throttle_<scope>_<ident>`). The test-mode bypass in `allow_request` returns before any of the three is set
- **1.2's hold point:** wrap the throttle object's `cache.get` for the first thread so it waits on a
  `threading.Event` after reading, released once the second thread's `allow_request` has returned; give every wait a
  timeout so a deadlock fails the test instead of hanging it. The wrapper calls through to the real cache, so the test
  still reads and writes Redis. The `wait()` case needs no wrapper: the first thread
  calls `allow_request` (refused, its key filled beforehand), the second runs a whole admitted request, then the
  first calls `wait()`. `TestAwareUserThrottle` keys on `request.user.pk`, so its requests carry a `user`
- **allauth's URLs** have no trailing slash; match R24's four paths exactly. The provider callbacks live under
  `/accounts/`, outside the middleware's prefix
- **Docstrings are API schema:** Django Ninja uses an endpoint's docstring as its OpenAPI description, so changing one
  changes `openapi.json`, and CI's type-drift check fails until the types are regenerated (`npm run generate-types`
  in `frontend/`, with this checkout's test stack up)

### Phase 2

- **Django's checks:** the test client skips CSRF unless created with `enforce_csrf_checks=True`. Django Ninja marks
  its views CSRF-exempt; allauth's `browser_view` does not (only `app_view` does), but Django's middleware is not
  installed today, so allauth's browser endpoints are unchecked until 2.3. Django checks a present `Origin` against
  the host and `CSRF_TRUSTED_ORIGINS`, and the `Referer` only on HTTPS
- **The token cookie:** `GET /api/csrf/` sets `csrftoken` itself, and after 2.3 Django's `process_response` sets it
  too, since `get_token` ran; the response holds one cookie per name, so it still sends one `Set-Cookie`. allauth's
  `browser_view` calls `get_token`, so the session request sets the cookie from 2.3 on
- **2.2 lands before 2.3 safely:** the cookie the frontend starts reading in 2.2 is already set by `GET /api/csrf/`,
  and nothing checks the token until 2.3
- **The new error bodies** (R20's `403`, R22's and R13's `503`) are `{"detail": message}` with no debug text in any
  environment: build them directly, not with `build_error_response` (`apps/core/utils/http.py`), which makes the
  old `{"error"}` shape and adds debug text under `detail` when `DEBUG` is on. Tests assert the whole body
- **One refresh in flight:** `ROTATE_REFRESH_TOKENS` and `BLACKLIST_AFTER_ROTATION` are on, so a second refresh
  presenting the same `refresh_token` cookie fails. The interceptor already queues `401`s behind its `isRefreshing`
  flag; the shared function keeps that by returning the pending request. The interceptor's failure path (clearing
  the tokens and a full reload to `/login?session_expired=true`) stays in the interceptor, so a failed refresh the
  hook started only signs the user out
- **Storage and other tabs:** the interceptor stores today with `setAuthTokens(newAccessToken)`, whose default is
  `localStorage`, while a sign-in without "remember me" (the login form's default) uses `sessionStorage`;
  `getCurrentStorageType` reports which holds the token. Tabs share `localStorage` and the refresh-token cookie, and
  Chrome runs hidden tabs' timers on the same minute boundary, so two idle tabs' 60-second checks refresh at the same
  instant; the one presenting a cookie the other has rotated gets `401`, and `clearAuthTokens` would clear the token
  the other just stored. Under the lock the second refresh starts after the first has finished: it finds the new
  token in `localStorage`, or, for a sign-in in `sessionStorage` or a write it cannot see yet, posts with the rotated
  cookie and succeeds. jsdom has no `navigator.locks` (Vitest's jsdom environment replaces Node's `navigator`): 2.5.b
  installs a minimal stand-in (a queue per lock name), as `tests/setup.ts` installs `matchMedia`, for every case but
  the fallback's. "Expires later" compares the tokens' `exp`
  (`getTokenExpiration`)
- **jsdom:** `HTMLFormElement.prototype.submit` is not implemented, so the OAuth start tests spy on it, the boundary
  where the browser would navigate. A Mock Service Worker handler's `Set-Cookie` does not reach `document.cookie`, so
  the `/api/csrf/` handler sets the cookie itself, standing in for the server
- **Implemented 12's `git grep`** also matches this task list and its Review Log, which name what the change removes,
  and any text naming R20's three exemptions, which describes the new design; none describes the old design as
  current. Tests need no old cookie name or exempt path to fail before the change: a `csrftoken` cookie alone, or a
  request without a token, does it

### Phase 3

- **The package's import behavior:** `zoho_zeptomail.backend.message` builds its API client in its class body, which
  raises `ValueError` when the key is empty, while `zoho_zeptomail.emails` imports cleanly (both checked with an
  empty key against 0.0.4)
- **The project backend's shape:** import `SendEmail` from `zoho_zeptomail.emails` at module level and, in
  `send_messages`, build a client from the settings then in force (so `override_settings` reaches it), with the key
  and, when it is set, `ZOHO_ZEPTOMAIL_HOSTED_REGION` (as `settings.py` reads it); the URL is
  `client.get_sendmail_url(client.zeptomail_domain)` and the headers `client.headers_default`. Import
  `ZeptoMailEmailMessage` inside `send_messages`, after the key check, and take its converted payload from
  `_ZeptoMailEmailMessage__email_data`, which has no public accessor: the exact pin and the multipart test guard it.
  Send with `requests.post(..., timeout=(10, 10))`, so the test stand-in on `HTTPAdapter.send` still receives the
  request and its `timeout`
- **The resend token:** `_validate_resend_token` deletes the key when it checks it (`cache.delete(cache_key)`), and
  `RESEND_TOKEN_EXPIRY_SECONDS` is `600`; the send is `email_address.send_confirmation(request)`. Django's
  `RedisCache` has no `ttl()`: read and shorten the remaining lifetime through Redis's `TTL` and `EXPIRE` on the
  cache's client and the key the cache made
- **allauth's password request** lets the adapter's `EmailDeliveryError` out of its view, so `process_exception`
  sees it; Django calls `process_exception` only for exceptions from the view
- **The failure log:** the middleware has the request's path and the resend service the user's ID from the token;
  neither logs the exception's text. `EmailDeliveryError` stays as it is: since #62 its message names the template
  and the user's ID instead of the address (`adapters.py`), registration's failed send logs only the exception's
  type, since a mail error's text can quote the recipient, and `test_log_privacy.py` checks the authentication and
  email log records for addresses. Both new logs go to `cinexplorer.auth`, and the `cinexplorer` loggers do not
  propagate to the root logger where `caplog` listens, so tests capture them with `assertLogs`, as `test_logging.py`
  does, and count that logger's records only (`django.request` also logs each `5xx`). 3.1's backend logs through
  `logging.getLogger(__name__)`, which propagates, so its tests keep `caplog`
- **How the resend service reports a failed send:** merge `main` before 3.2. If it then has the domain exceptions
  and the API-layer handler that maps them, the service raises the "upstream service unavailable" exception and the
  handler answers R22's `503`; otherwise the service returns the failure the way its other outcomes return today,
  and moving the whole service is left to that handler's own change
- **A real database failure for the health check:** in a test marked `django_db(transaction=True)`, point the
  default connection's `PORT` at a closed port and close the connection, so the next query fails in the driver;
  restore the setting and close the connection again afterwards. Nothing in the project is patched
- **Toasts as rendered:** `main.tsx` mounts the `Toaster` and `PriorityToaster` (`components/core/chakra/toaster.tsx`)
  beside the app, so a page test renders them beside the page and finds the toast's text on screen
- **Both email calls go through `apiClient`** (the reset request posts to `/_allauth/...` with `apiClient.post`), so
  the toast suppression lives in the response interceptor alone
- **`load_settings`** runs the settings module in a subprocess without re-reading `config/.env`; a `None` value
  removes a variable, so pass `None` for each OAuth variable a case does not set
- **The health check** is already what both Compose files' backend health checks call; neither file changes

### Phase 4

- **Compose paths:** a relative `env_file` path resolves against the Compose file's directory, so R7's
  `BACKEND_ENV_FILE` override is an absolute path (`$GITHUB_WORKSPACE/backend/config/.env.example`); a variable in
  the shell takes precedence over `--env-file` for interpolation
- **On the server,** every Compose command runs from the checkout's `infrastructure/` directory as
  `docker compose -f docker-compose.prod.yml --env-file /opt/cinexplorer/prod.env`
- **The revision label:** the `images` job publishes with `metadata-action`'s labels, which include
  `org.opencontainers.image.revision`; `docker inspect` reads it from a stopped container too
- **The CI form outlives its session:** start the deploy in its own session (`setsid`), with `HUP` and `PIPE`
  ignored and its output going to the log file, and take the lock inside that process, so the lock lives as long as
  the deploy; the entry point then follows the file, sends the marker lines and the outcome, and exits with the
  deploy's status. Losing the session ends only the follower
- **`bootstrap.sh`'s helpers:** `write_file PATH MODE [OWNER GROUP]` reads the content from standard input and reports
  `CHANGED` or `UNCHANGED`; `ensure_dir` likewise; `ensure_service` enables and starts a unit, and starting a timer
  schedules it without running its job. The `authorized_keys` line today copies root's keys
- **A job before its inputs exist:** `EnvironmentFile=` without the `-` prefix fails the unit naming the missing file,
  and a missing script fails its start naming the path, which is how R12's journal requirement holds; keep both
- **Workflow checks:** `actionlint` on each workflow change, as the previous change ran it; `ci-ok`'s `needs` names
  `markdown`, which keeps its job id when it calls the reusable workflow

### Phase 5

- **The restore rehearsal's local stack** runs in Docker Desktop's distro; check `memcap_policy` first, and keep to
  the production Compose file's memory limits
- **Order on the server:** `ci-deploy.pub` and `ops.env` (5.1) exist before the bootstrap's first run (5.2), so that
  run installs the CI key's line and the units find their settings; the credentials (5.5) come last

## Success Criteria

The criteria come in three groups. **Implemented** criteria are checked locally and in CI. **Proven live** criteria
are checked with staging running this change's images, deployed with `cinexplorer-deploy` before the pull request
merges: on the server, in the provider consoles and GitHub's settings, and in one restore rehearsed locally.
**Proven after merge** criteria depend on a push to `main`, so verification before the merge cannot check them: they
are checked once the change has merged, and their evidence is recorded before the work is archived. Each criterion
is marked with its evidence beside it, and the evidence for setup done in a provider's console says
what was seen and where.

### Implemented (checkable locally and in CI)

- [ ] Backend tests show that requests to sign-in do not count against the registration or resend-verification
  throttles, nor the reverse, and that a test which interleaves two requests from different client addresses on one
  throttle object, across two threads, records each under its own key.
- [ ] Backend tests with `enforce_csrf_checks=True` show that each of these, sent without a token or with a token that
  does not match the cookie, answers `403` with R20's body, and passes the check with a matching cookie and header:
  sign-in, registration, logout, email verification, resend-verification, both refresh endpoints, allauth's
  password-reset request, and a watchlist change by a user authenticated by the session alone. A request with a
  matching token and an `Origin` from another site is refused on HTTPS. `POST /api/logs/` without a token is
  accepted, as is `POST /api/dev-logs/write/` under `development`.
- [ ] Frontend tests show the API client sends the `csrftoken` cookie's value as `X-CSRFToken` on an unsafe request and
  fetches `/api/csrf/` first when the cookie is missing; that the refresh retry, the OAuth sign-out, the
  password-reset completion and the OAuth start form each send the token; that the forgot-password page shows
  R22's message on a `503` and its generic confirmation on other errors; that the login page's resend action shows
  R22's message on a `503`; and that the API client shows no global "Server error" toast for a `503` from the
  password-reset request or resend-verification, and still shows it for other `500`-range answers.
- [ ] Backend tests show that when the email backend sends nothing, the password-reset request, for an address with an
  account and one without, and resend-verification answer `503` with R22's body; and that after a failed resend the
  token's lifetime starts again and the same token, presented again with the backend working, sends the email, after
  which the token is spent. Tests at the transport layer show that the ZeptoMail backend sends with a timeout,
  returns `0` without raising on a timeout, a connection error, a non-2xx answer in ZeptoMail's error format, one
  with a body that is not JSON, and a missing API key, writes nothing to stdout, and logs the outcome without the API
  key or the recipients. The missing-key test imports the backend's module afresh with the key empty (in a
  subprocess, or with the package's and the backend's modules removed from `sys.modules`), so an import of the
  package's message class at module level fails it.
- [ ] Backend tests show `GET /api/health-check/` answers `200` when the database query succeeds and `503` with R13's
  body when it fails; the committed OpenAPI schema and frontend types include that `503` and resend-verification's
  (R22), and CI's type-drift check passes.
- [ ] Backend tests that load the settings module under each environment show: under `staging`, both Google variables
  set yields one settings app for Google, neither yields none, and one alone fails startup with
  `ImproperlyConfigured` naming the other (likewise for GitHub); under `development`, the variables set yields no
  settings apps. Tests show `configure_site` sets the record's domain and name, reports no change on a second run,
  and under `staging` with `SITE_DOMAIN` unset exits non-zero naming it.
- [ ] The two commands R7 adds pass on this change's files and fail on a copy of the Caddyfile with an invalid directive
  and on a Compose file with a syntax error, run locally the way the `images` job runs them; a pull-request run shows
  both steps passing.
- [ ] On a pull request, every CI job runs and `ci-ok` passes as before, and the `deploy` job does not run.
- [ ] Backend tests show that requests under `/_allauth/` outside R24's list, among them `browser/v1/auth/signup`,
  `browser/v1/auth/login` and an `app/v1/` endpoint, answer `404` and create no account, and that each listed
  endpoint with its listed methods still reaches allauth.
- [ ] R25's frontend tests pass in the frontend suite, covering each behavior R25 lists for `useAuth` and
  `utilities/tokenUtils.ts`.
- [~] The authentication strategy states R20, R21, R24 and R15 wherever R27 lists; a case-insensitive
  `git grep -E` outside the archive and this PRD for `CsrfHeaderMiddleware|XSRF-TOKEN|csrf[- ]exempt|path-based
  exemption|CSRF token is optional` finds no text describing the old design; no test in `test_csrf_protection.py`
  asserts that sign-in or registration needs no token; and `backend/scripts/test_csrf_protection.sh` no longer
  exists. (Superseded by the 2026-11-04 amendment: criterion 12 adds R28's refresh.)
- [ ] The authentication strategy states R20, R21, R24, R15 and R28 wherever R27 lists; a case-insensitive
  `git grep -E` outside the archive and this PRD for `CsrfHeaderMiddleware|XSRF-TOKEN|csrf[- ]exempt|path-based
  exemption|CSRF token is optional` finds no text describing the old design; no test in `test_csrf_protection.py`
  asserts that sign-in or registration needs no token; and `backend/scripts/test_csrf_protection.sh` no longer
  exists.

### Proven live (with staging running this change, before merge)

- [ ] With the CI key from a local terminal: the forced command refuses an argument that is not a 40-character SHA, a
  commit not reachable from `origin/main`, a `main` commit that the deployed branch commit contains (once criterion
  2 has deployed it), naming the deployed version, and a request for a shell or a command, deploying nothing each
  time; a port-forwarding request is refused. On the server, `deploy`'s `authorized_keys` ends with the CI key's line
  carrying `restrict` and the forced command.
- [ ] In the shell holding the operations lock in which the server takes this change (R26, criterion 3),
  `cinexplorer-deploy <this branch's published commit>` starts without waiting and deploys it: the health check
  passes through the public address, `deploy-history.log` gains a `manual` line whose previous version is the one
  that was running (the `main` version deployed before, not the branch commit checked out by hand for the bootstrap)
  and whose new version is the branch's, and `configure_site` reports the staging host. A backup started with
  `systemctl start cinexplorer-backup` meanwhile starts only after that shell exits. Outside the shell, a redeploy of
  the same commit with `cinexplorer-deploy` takes the lock itself: a backup started during it starts only after it
  finishes. `cinexplorer-deploy` given that earlier `main` commit, which has no deploy script, refuses it and names
  the runbook's manual steps.
- [ ] On the existing staging server, with this branch checked out and `ci-deploy.pub` in place, the bootstrap's first
  run installs the entry point, the two directories, the units and the CI key's line, and the next run reports every
  step `UNCHANGED`; `systemctl list-timers` then shows both timers with their next runs at 10:00 and 10:30 UTC.
- [ ] `systemctl start cinexplorer-backup` uploads a new dump to R2 (the object is listed in the bucket), leaves nothing
  in `/opt/cinexplorer/backups/`, and the `backup` check shows the ping. With the bucket name in `ops.env` changed to
  one that does not exist, a run fails, the check receives the `/fail` ping, and the maintainer receives Healthchecks'
  alert email; with the name restored, the next run succeeds. After the first night, the `backup` check shows a ping
  from the timer's own run.
- [ ] A dump downloaded from R2 is restored into a local production stack built from this change's images, following the
  runbook's restore procedure (a copy of the live database, an emptied schema, then migrations); the staging account
  then signs in there, and its watchlist shows the movies it holds on staging.
- [ ] In Cloudflare's dashboard, the backup bucket shows public access off and a lifecycle rule that deletes objects 30
  days after upload, and the server's R2 token is limited to that bucket with object read and write; the maintainer
  records what each page showed.
- [ ] `systemctl start cinexplorer-maintenance` completes both commands, and the `maintenance` check shows the ping; after
  the first night, it shows a ping from the timer's own run.
- [ ] With `backend` stopped, UptimeRobot alerts the maintainer by email within 10 minutes, and again on recovery once it
  is started. With `db` stopped, `curl` of the health check returns `503` and UptimeRobot alerts likewise; once `db`
  is started, the health check returns `200`.
- [ ] Signing up on staging with a Gmail address delivers the verification email to that Gmail inbox, not its spam
  folder, from `cinexplorer@andrewcreekmore.dev`. Gmail's "Show original" view shows DKIM passing for
  `andrewcreekmore.dev` and a `multipart/alternative` message with a `text/plain` part containing the verification
  link. Following the link verifies the address, and the visitor then signs in with the password. A password reset
  for the same address delivers a reset email to the inbox whose text part names
  `staging.cinexplorer.andrewcreekmore.dev` and whose link sets a new password that then signs in. The backend's logs
  show each send's outcome and no ZeptoMail response printed raw.
- [ ] Signing in with Google, using an account that is not on the Google Cloud project's test-user list, succeeds, which
  shows the consent screen published and the deployed client, its redirect URI and the env file wired together.
  Signing in with GitHub succeeds. Each signed-in user then adds a movie to the watchlist, and it is still there after
  a reload.
- [ ] The Google client's authorized redirect URIs list both hosts' callback URLs, and the GitHub OAuth App's homepage
  and callback configuration name the production host; the maintainer records what each console showed. The
  production host cannot be exercised before it exists.
- [ ] `gh api repos/andrewRCr/CineXplorer/environments/staging` shows `custom_branch_policies: true`,
  `gh api repos/andrewRCr/CineXplorer/environments/staging/deployment-branch-policies` lists `main` as the only
  pattern, and `gh api repos/andrewRCr/CineXplorer/environments/staging/secrets` lists `DEPLOY_SSH_KEY` and
  `DEPLOY_KNOWN_HOSTS`.
- [ ] A sign-in request to staging with valid credentials, an `Origin` from another site and no token answers `403`, and
  the same request from the site's own pages signs in.
- [~] Signed in with a password on staging, a tab left idle for 6 minutes still shows the user signed in, and so
  does a reload of it; the watchlist then loads. (Superseded by the 2026-11-04 amendment: criterion 15 reopens the
  page with the access token expired.)
- [ ] Signed in with a password and "remember me" on staging, a tab left idle on the watchlist page for 6 minutes still
  shows the user signed in. With every tab of the site then closed for 6 minutes, opening the watchlist page shows
  the user signed in and lists their watchlist, and the browser's network panel shows at least one request to
  `/api/auth/refresh` during that load, each answered `200`.

### Proven after merge

- [ ] The push of the merge commit to `main` runs the `deploy` job after `ci-ok` passes; the job log shows the deploy's
  steps and its success but not its full output, which is in a new file in `/opt/cinexplorer/deploy-logs/` on the
  server; `deploy-history.log` gains a `ci` line naming the merge commit; and the health check passes.
- [ ] A push to `main` that changes only `.arc/`, such as the commit recording the first criterion's evidence, starts no
  run of the CI workflow and one run of the `.arc/` lint workflow (R6), which passes; no image tagged with that commit
  is published, and `deploy-history.log` gains no line.
- [ ] With the CI key from a local terminal, a redeploy of the merge commit (the first criterion's, whose images are
  published) whose local `ssh` is killed after the first step marker still finishes: `deploy-history.log` gains its
  `ci` line, and the newest file in `/opt/cinexplorer/deploy-logs/` ends with the deploy's outcome (R2, R4). Before
  the merge no commit on `main` carries the deploy script, so this cannot run earlier.

## Review Log

### 2026-11-03 — PRD, Author checks (not independent)

- **Proportionality:** `proportionate`. Each mechanism traces to a goal, trust boundary or observed failure: the forced
  command and `main`-only check (CI key equivalent to root), the entry point outside the checkout (running script
  replaced by checkout), the deploy history (rollback without a human recording versions), the operations lock
  (concurrent manual and CI deploys), and the heartbeats (a job that never runs sends nothing). One rationale
  corrected in place (Design Decision 5 overstated a mid-migration dump; pg_dump takes a consistent snapshot).
- **Spec review (coherence, reader independence, binding):** every R-item maps to a criterion. Corrections made in
  place: `SITE_DOMAIN` moved from a startup requirement to `configure_site` (a startup requirement would break the
  image's `collectstatic` step and CI's `check --deploy`); `/api/dev-logs/write/` added to the CSRF exemptions
  (development console capture posts with a plain `fetch`); post-merge criteria given a recording point that exists
  (an `.arc/`-only commit after the merge, not the archive commit itself).
- **Grounding:** claims checked at source. Corrected: the unconfigured-provider behavior (no longer asserts the
  OAuth error page), Redis's failure blast radius (no longer claims "rate-limited endpoints only"), ZeptoMail's
  request identifier (logged only when present).
- **Size:** PRD about 530 lines; forecast change set about 2,500–3,000 lines; below every mark. Boundary: one work
  unit (Owner decision, recorded as Design Decision 1).
- **Second author read (after the advisor's check):** R21 now names the unsafe requests outside the API client's
  interceptor, verified at source: the refresh retry (bare `axios.post`, a `403` there would sign password users out),
  the OAuth sign-out (`fetch` `DELETE`), the password-reset completion and the OAuth start form; Implemented 3 tests
  them. R24 binds how an existing server takes a changed `bootstrap.sh`, and Proven live 3 follows that first-run and
  second-run order. A spam-folder outcome is noted as a DNS remedy beside the ZeptoMail precondition.

### 2026-11-03 — PRD, Pass 1

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 24 minutes.
- **Rubric:** assess-design-proportionality, design-audit (spec point), spec-review; gate: ready for task generation.
- **Findings (verified at source):** 7 major, 6 minor, all confirmed at the reviewer's grade.
- **Dispositions (approved by the Owner):** all 13 FIX. New design: F1 (change detection against the last
  successful push run), F2 (restore into an emptied schema), F3 (previous version from the running container), F5
  (resend token spent only on a successful send), F6 (allauth endpoint allowlist, R24). Local correction: F4, F7,
  F8, F9, F10, F11, F12, F13.
- **Author correction while landing:** R5/R2/R26, the locked shell exports `CINEXPLORER_OPS_LOCK=held` so a
  rollback's final `cinexplorer-deploy` runs inside it without deadlocking.
- **Owner scope change alongside:** sign-in client unit tests (R25, DD22, Implemented 10), from
  `project-manager.CX`'s inbox entry; runbook renumbered R26.
- **Kept versions:** `adversarial-review/prd-pass1.md` (reviewed), `prd-pass1-round1.md` (settled).
- **Stop reason:** fix check (round 1, below).

### 2026-11-03 — PRD, Fix check, round 1 since pass 1

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 18 minutes. Compared `prd-pass1.md` with
  `prd-pass1-round1.md` against the approved Pass 1 account.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Findings (verified at source):** 9 minor, all confirmed at the reviewer's grade; no critical or major. Pass 1's
  fixes held.
- **Dispositions (approved by the Owner):** all 9 FIX. New design: F3 (previous version from the history log's last
  successful deploy, the `backend` container only while the log is empty; rollback target rule), F7 (copy of the live
  database before emptying the schema). Local correction: F1 (manual runs in their own concurrency group), F2 (Goals 1
  and 5 wording), F4 (manual deploy steps and the bootstrap-first update in the locked shell, before merging), F5
  (Proven live 2 exercises the locked shell and the lock skip), F6 (step markers in R1's contract; bootstrap creates
  the log and backup directories), F8 (a failed send restarts the resend token's lifetime; login toast shows R22's
  message), F9 (Design Considerations names both visible changes).
- **Owner inputs alongside (from `project-manager.CX`):** R4 states the deploy job's push-to-`main`-only condition and
  no `pull_request_target` or `workflow_run` trigger; Dependencies and Preconditions binds the credential order
  (ZeptoMail and OAuth credentials only once this change's images run on staging).
- **Trend:** converging (Pass 1: 7 major → 0). R1's previous-version source and R10's restore needed new design a
  second time; both revisions are bounded, so no re-entry offered.
- **Kept versions:** `adversarial-review/prd-pass2.md` (settled, the Pass 2 input).
- **Stop reason:** continued to Pass 2 (Owner-approved recommendation: Pass 1's major fixes withhold convergence, and
  the folds across both looks changed most of the deploy, restore and sign-in requirements).

### 2026-11-03 — PRD, Pass 2

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 25 minutes. Full pass over `prd-pass2.md`.
- **Rubric:** assess-design-proportionality, design-audit (spec point), spec-review; gate: ready for task generation.
- **Findings (verified at source):** 3 major, 6 minor, all confirmed at the reviewer's grade.
- **Dispositions (approved by the Owner):** all 9 FIX. New design: F1 (change detection by the push trigger's
  `paths-ignore` plus a small `.arc/` lint workflow, replacing the Actions-API base job and two-mode `ci-ok`), F6 (CI
  form refuses an ancestor of the newest deployed version). Local correction: F2 (R26: revert or fix `main` after a
  rollback), F3 (R27: authentication strategy and stale CSRF comment and script; the script removed, Owner's
  choice), F4 (Proven live 9 verification wording), F5 (history line format in R1's contract; ancestor rule for the
  rollback target), F7 (missing ZeptoMail key counts as not sent), F8 (`/__debug__/` exempt), F9 (Non-Goals range,
  Goal 5, criteria headings).
- **Also:** the inbox entry "Run the backend's lint and type checks in their own CI job" had its order note corrected
  for the path filter.
- **Trend:** discovering (Pass 1: 7 → 0; Pass 2: 3). F1 and F2 come from Pass 1's change-detection fold; F3 is a new
  class (a governing document outside the PRD's named files) in text present since the draft. R6 needed new design a
  second time; the revision removes mechanism, so no re-entry offered.
- **Kept versions:** `adversarial-review/prd-pass2.md` (reviewed), `prd-pass3.md` (settled, the Pass 3 input).
- **Stop reason:** continued to Pass 3 (Owner-approved recommendation: three major fixes withhold convergence).

### 2026-11-03 — PRD, Pass 3

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 19 minutes. Full pass over `prd-pass3.md`.
- **Rubric:** assess-design-proportionality, design-audit (spec point), spec-review; gate: ready for task generation.
- **Findings (verified at source):** 1 major, 6 minor, all confirmed at the reviewer's grade.
- **Dispositions (approved by the Owner):** all 7 FIX. New design: F7 (SSH keepalives; the CI deploy survives losing
  its session). Local correction: F1 (R23's backend on Django's `BaseEmailBackend`, message class imported in the
  send path once a key is set; fresh-import test), F2 (rollback target: previous version on the newest line whose new
  version is running, else the newest line's new version; a repeat rollback chosen by hand), F3 (resend's `503`
  declared; schema and types), F4 (R27 states the rule for every description of the old CSRF design; grep check),
  F5 (Proven live 12 names the branch-policies endpoint), F6 (entry point and units carried inside the bootstrap).
- **Trend:** converging (Pass 1: 7 → 0; Pass 2: 3; Pass 3: 1). The major came from Pass 2's F7 fold; F2 and F4 were
  Pass 2 repairs that fixed sites rather than their rule, now stated as rules.
- **Kept versions:** `adversarial-review/prd-pass3.md` (reviewed), `prd-pass3-round1.md` (settled).
- **Stop reason:** fix check (round 1 since pass 3, below), Owner-approved recommendation.

### 2026-11-03 — PRD, Fix check, round 1 since pass 3

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 10 minutes. Compared `prd-pass3.md` with
  `prd-pass3-round1.md` against the approved Pass 3 account.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure.
- **Findings (verified at source):** 4 minor, all confirmed at the reviewer's grade; no critical or major. Pass 3's
  major repair (R23's backend) held.
- **Dispositions (approved by the Owner):** all 4 FIX, local correction: F1 (rollback target: the newest line's new
  version when the running version is not it, otherwise the previous version on the newest line whose new version is
  running and whose previous differs), F2 (Implemented 11's grep pattern and the CSRF test's end state; R27 covers the
  whole strategy document and the `MIDDLEWARE` comment), F3 (R23: comments naming the configured backend describe the
  project backend), F4 (R4's job result while the session holds and after it is lost; new Proven after merge 3).
- **Trend:** converging (Pass 1: 7 → 0; Pass 2: 3; Pass 3: 1 → 0). The rollback-target rule needed its third local
  correction.
- **Stop reason:** Owner-accepted after a minors-only fix check (Owner-approved recommendation; not formally converged,
  since no fresh pass followed Pass 3's major fix).

### 2026-11-03 — PRD, Post-settle coherence re-read (author)

- spec-review's coherence and common reader checks over the whole settled PRD. Corrected in place: Proven after merge
  3 now redeploys the merge commit (`main`'s head is then the `.arc/`-only evidence commit, which has no images); R2
  names the field its CI refusal reads (the last line's new version) and runs its checks before the lock, so Proven
  live 1's refusal message is the ancestor one; R12's sentence order; line reflows in R4, Decision 5 and Implemented 3,
  Proven live 3 and 5. No design change.
- **Totals:** 3 passes and 2 fix checks, 42 findings fixed (13, 9, 9, 7, 4).

### 2026-11-03 — PRD, Amendment 1 (author check)

- **Change:** R28 added (refresh before signing a password user out); R25's expired-token case names the refresh's
  outcome; R20's and R22's new bodies use `{"detail"}`; Introduction, Goal 3, Non-Goals, Design Considerations,
  Design Decision 23, Proven live 14 and an `## Amendments` line follow. Owner's decisions: the fix confirmed in this
  session; R25's wording and the error shape relayed by `project-manager.CX`, then confirmed by the Owner.
- **Rubric:** planning-review `artifact: amendment`, author check: proportionality, coherence, grounding.
- **Proportionality:** R28 traces to a failure read at source (`useAuth.ts` signs out on an expired access token
  and never uses the refresh token; `SIMPLE_JWT` 5 minutes and 14 days), with a hand reproduction gating the fix
  (task 2.5.a). The shared refresh traces to a constraint read at source (`ROTATE_REFRESH_TOKENS` and
  `BLACKLIST_AFTER_ROTATION`). The resolving sign-in state stays out (Non-Goals; a later change).
- **Coherence:** every reference to R20's and R22's bodies reads "R20's body" or "R22's body", so no criterion
  changed; Implemented 10 covers R28 through R25's list; Proven live 14 appended. `ProtectedRoute` guards only the
  development-only test sign-in page, so the signed-out moment on load redirects no visitor.
- **Independent pass:** offered for a contained amendment; folded into the task-list review, which reads both.

### 2026-11-03 — Task list, Pass 1

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 46 minutes. Full pass over `tasks-pass1.md`
  with the amended PRD (`prd-amend1.md`), against `main` as it then stood.
- **Rubric:** task-audit (grounding floor through source-grounding, eight categories) with executability and
  fail-first checks over the whole task list; assess-design-proportionality, design-audit, and spec-review's coherence
  and grounding over Amendment 1's footprint; gate: ready to implement from.
- **Findings (verified at source):** 3 major, 9 minor, all confirmed at the reviewer's grade. The amendment was found
  grounded and proportionate.
- **Dispositions (approved by the Owner, 2026-11-04):** all 12 FIX. Major: F1 (2.3.a names `test_error_responses.py`'s
  two CSRF tests and `test_user_movie_data_api.py`'s two "unauthenticated" tests, which sign in through their fixture),
  F2 (5.2 opens a draft pull request whose runs are Implemented 7 and 8's evidence), F3 (R22's failure log carries a
  fixed message and no address; registration's older log line captured to the inbox). Minor: F4 (Owner rulings: the
  resend service raises a domain exception if `main`'s API-layer handler has landed by 3.2, otherwise keeps its
  pattern; R28's refresh in `useAuth`'s effects is a recorded exception to the TanStack Query rule), F5 (fail-first
  labels per case; the single refresh tested through behavior; a failed refresh on load; fail-once guards in 3.3,
  3.4 and 3.6), F6 (refreshed token stored where the old one was), F7 (a failed refresh keeps a newer token another
  tab stored), F8 (R13's `503` takes `{"detail"}`), F9 (3.1.b names every docstring naming the backend, with a grep),
  F10 (R25 lists the single refresh, the profile-fetch check and OAuth users; Proven live 14 superseded by 15), F11
  (allauth's `reset_password` limit off in test settings, 1.3.a), F12 ("the Cloudflare R2 bucket").
- **Folded in from `main` alongside (#54–#58):** the shared Mock Service Worker server; the development rules on
  real-database tests with only named boundaries replaced (3.2.a through the project backend and the transport
  stand-in, 3.6.a's database failure on a closed port, 1.2's cache wrapper calling through), frontend tests by role
  and through `userEvent` with toasts asserted as rendered (3.3.a through the Login page), and no personal data in
  logs. From `project-manager.CX`: #59 (profile endpoint removed) rewrites `test_csrf_protection.py`, which 2.3.a
  starts from.
- **Owner question alongside:** the error shape from first principles (RFC 9457 Problem Details, the Python
  frameworks' `{"detail"}`, the large public APIs' `{"error": {...}}` envelope); recommended keeping `{"detail"}` as
  the stack's shape and a subset of RFC 9457's `detail`, revisited when the client must tell two errors with one
  status apart. The Owner's answer pending; the bodies stay as they are until then.
- **Kept versions:** `adversarial-review/tasks-pass1.md` and `prd-amend1.md` (reviewed), `tasks-pass1-round1.md` and
  `prd-amend2.md` (settled).
- **Stop reason:** fix check (round 1 since pass 1, below), Owner-approved.

### 2026-11-04 — PRD, Amendment 2 (author check)

- **Change:** from the task list's Pass 1, on the Owner's approval: R28 stores a refreshed token in the storage that
  held the old one, keeps a newer token another tab stored when its refresh fails, and records its refresh in
  `useAuth`'s effects as an exception to the TanStack Query rule; R25 lists those cases, the single refresh, the
  profile-fetch check and the OAuth users who never refresh; R22's failure log carries no address; R13's `503` takes
  `{"detail"}`; Proven live 14 superseded by 15 (the watchlist page reloaded, no refresh request refused; the refusal
  clause on the Owner's approval); Non-Goals adds the
  move to TanStack Query; an `## Amendments` line dated 2026-11-04.
- **Rubric:** planning-review `artifact: amendment`, author check: proportionality, coherence, grounding.
- **Proportionality:** each change traces to a finding verified at source: the interceptor stores with
  `setAuthTokens`' `localStorage` default while a sign-in without "remember me" uses `sessionStorage`; tabs share
  `localStorage` and the rotated refresh cookie; `EmailDeliveryError`'s message names the address. No new mechanism
  beyond a storage choice and one re-read on failure.
- **Coherence:** the task list's criteria match the PRD's (29 each, the superseded one marked `[~]` in both); 2.5 and
  5.5 cite Proven live 15; R20's, R22's and R13's bodies follow one shape.
- **Independent look:** recommended, since R28's failure path changed; folded into the fix check, which reads both.
  Revised by that fix check (below): Web Locks across tabs, R22's log, Proven live 15.

### 2026-11-04 — Task list, Fix check, round 1 since pass 1

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 23 minutes. Compared `tasks-pass1.md` with
  `tasks-pass1-round1.md` and `prd-amend1.md` with `prd-amend2.md` against the approved Pass 1 account, and served as
  Amendment 2's independent look.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure; design-audit's efficacy and
  failure-mode checks on R28's changed refresh.
- **Findings (verified at source):** 1 major, 5 minor, all confirmed at the reviewer's grade. Pass 1's F1, F2, F4–F9,
  F11 and F12 held. The prompt called #59 open; it had merged that morning.
- **Dispositions (approved by the Owner):** all 6 FIX. New design: F4 (refreshes take turns across tabs under Web
  Locks, reading the storage again before refreshing, in place of the re-read after a failure; Chrome runs hidden
  tabs' timers on the same minute boundary, so two idle tabs refresh at once; Design Decision 24). Local correction:
  F1 (Proven live 15 rewritten in place, the Owner's choice: the watchlist page reopened after every tab was closed
  for 6 minutes, with each refresh request answered `200`; in an open tab the 60-second check keeps the token fresh,
  so a reload never refreshed, and no live check can show the shared refresh deterministically, which R25's unit
  test binds), F2 (R22's log names the endpoint and, for resend, the user's ID; `EmailDeliveryError` unchanged, its
  message left to errand K13), F3 (3.2.a captures `cinexplorer.auth` with `assertLogs`; 3.1's backend logs where
  `caplog` sees it), F5 (2.5.b adds the failed refresh before the profile fetch), F6 (the Amendments line names
  every change).
- **Folded in from the reviewer's withstood notes:** #59 merged; 2.3.a rewrites an old-design docstring in
  `test_csrf_protection.py`; 2.5.b's single-refresh test gates the refresh handler; 6.1 marks the draft pull request
  ready.
- **Trend:** discovering (Pass 1: 3 major; round 1: 1). The major came from Pass 1's F10 fold (a clause added beyond
  the approved wording), and F7's fix had a design gap.
- **Kept versions:** `adversarial-review/tasks-pass1-round1.md` and `prd-amend2.md` (reviewed),
  `tasks-pass1-round2.md` and `prd-amend2-round1.md` (settled).
- **Stop reason:** fix check (round 2 since pass 1), recommended with the dispositions and agreed by the Owner.

### 2026-11-04 — Task list, Fix check, round 2 since pass 1

- **Runner:** fresh general-purpose subagent, read-only by prompt; about 20 minutes. Compared `tasks-pass1-round1.md`
  with `tasks-pass1-round2.md` and `prd-amend2.md` with `prd-amend2-round1.md` against the approved round 1 account.
- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure; design-audit's efficacy and
  failure-mode checks on R28's Web Locks mechanism.
- **Findings (verified at source):** 4 minor, all confirmed at the reviewer's grade; no critical or major. Round 1's
  six fixes held, and the Web Locks design does what R28 says in one tab and across tabs, for both storages, and where
  the API is missing.
- **Dispositions (approved by the Owner):** all 4 FIX, local correction: F1 (2.5.b installs the `navigator.locks`
  stand-in for every case but one fallback case, since Vitest's jsdom environment has no Web Locks and every
  supported browser runs the locked path), F2 (2.3.a states the "401 not 403" test's end state: the enforcing client
  with a matching token, `401`, renamed), F3 (R27 brings the strategy's token refresh flow and interceptor sample to
  R28; 2.5.c updates them; Implemented 11 superseded by 12), F4 (rewraps; R25's wording). Also: the failure-log note
  no longer cites an errand on `main` it cannot point to.
- **Trend:** converging (Pass 1: 3 major; round 1: 1; round 2: 0).
- **Kept versions:** `adversarial-review/tasks-pass1-round2.md` and `prd-amend2-round1.md` (reviewed),
  `tasks-pass1-round3.md` and `prd-amend2-round2.md` (settled).
- **Stop reason:** Owner-accepted after a minors-only fix check (Owner-approved recommendation; not formally
  converged, since no fresh pass followed round 1's major fix).

### 2026-11-04 — Task list, Post-settle coherence re-read (author)

- Phase 2's tasks and the Implementation Notes re-read whole, and both documents searched for the references the
  folds changed (Proven live 14 and 15, Implemented 11 and 12, `caplog`, the email template, #59, the storage
  re-read). Corrected in place: the Phase 2 note on Implemented 12's `git grep`, and the Phase 2 note on where the
  lock stand-in is installed. Criteria: 30 in each document, the same text, with Implemented 11 and Proven live 14
  marked `[~]` in both. Size: 6 phases; the task list passes the ~1,000-line mark through its copied Review Log, its
  tasks, notes and criteria being about 840 lines.
- **Totals:** 1 pass and 2 fix checks, 22 findings fixed (12, 6, 4); PRD Amendment 2 reviewed within them.
