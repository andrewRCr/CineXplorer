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
- Backup encryption, droplet backups, point-in-time recovery, scheduled backups more often than nightly,
  and backing up Caddy's certificates or the env files
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
      source check found no material issue.

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
      and checks stayed here. Live verification is recorded in 5.5.

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
    - Checks: 241 core tests passed; Ruff lint/format, scoped Pyright and frontend TypeScript passed.

### **Phase 4:** The server deploys, backs up and cleans up on its own

- [x] **4.1 `.arc/`-only pushes start no CI run, and manual runs queue apart** (R6, R4; Implemented 8)
    - The push trigger ignores `.arc/**`; pull requests/manual runs remain unfiltered. Manual dispatches use their
      run ID in the concurrency group, apart from push/PR groups; main push runs retain their uncancelled group.
    - Extracted the existing documentation job into a reusable workflow that also runs on main pushes touching
      `.arc/**`. CI keeps its `markdown` job ID and `ci-ok` dependencies unchanged.
    - Checks: `actionlint` passed for both workflows, all 20 recovery-hook tests passed and markdown lint passed.
      Hosted PR evidence is recorded in 5.2; main-push checks remain for 6.2.

- [x] **4.2 CI checks the production Caddyfile and Compose file** (R7; Implemented 7)
    - The images job validates Caddy immediately after the web build with non-secret placeholder inputs and a valid
      bcrypt fixture, then validates production Compose with the backend env example's absolute path.
    - Checks: built the current web production image under an isolated local tag; both validation commands passed.
      Caddy rejected a mounted copy with an invalid directive, and Compose rejected a syntax-error copy.
      `actionlint` passed. The hosted job's evidence is recorded in 5.2.

- [x] **4.3 Write `infrastructure/deploy/deploy.sh`** (R1)
    - Added the six stable step markers, clean-checkout check, target checkout/tag update, configuration/pull/
      migrations, Site configuration, startup/public health check and success-only UTC history append. Every Compose
      invocation uses the production file and external env file from the infrastructure directory.
    - Previous version comes from the latest successful history entry, then a running/stopped backend container's
      image tag/revision label, then placeholders. It never uses the checkout or configured image tag as history.
    - Checks: Bash syntax, ShellCheck and test-harness Ruff passed. Six disposable Ubuntu-container cases cover
      history priority, stopped-container fallback, no previous version, dirty refusal, migration failure and public
      health failure. All six guards failed under narrow behavioral reconstructions and passed after restoration.
      Actual deployment/locking evidence is recorded in 5.2.

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
      stale check; execution and validation stayed here. Real SSH restrictions are verified in 5.3.

- [x] **4.5 Add the `deploy` job** (R4)
    - The staging environment job runs only on a main push after `ci-ok`, with read-only contents permission,
      no checkout and uncancelled `deploy-staging` concurrency. `ci-ok` remains independent of deployment.
    - The job writes its key/known-host line into private temporary files, uses only that key with strict host-key
      checking and SSH keepalives, and sends the run's full SHA as `deploy`. Cleanup preserves SSH's result.
    - Checks: `actionlint` passed for both workflows and the diff is whitespace-clean. Hosted PR exclusion is
      verified in 5.2; main-push deployment checks remain for 6.2. No privileged workflow triggers were added.

- [x] **4.6 Add the nightly backup and maintenance jobs** (R8, R11, R12)
    - Backup creates a private custom-format dump, checks its archive, uploads through pinned `rclone/rclone:1.75.2`
      with environment-only R2 configuration, removes the local file and pings success. Failures retain their status
      and report the failed step's last output lines to `/fail`. Scoped R2 tokens use `no_check_bucket`.
    - Maintenance runs both cleanup commands and reports success/failure the same way. Added the complete operations
      env template without real credentials, and replaced the backend env example's cron instructions with timers.
    - Bootstrap carries both oneshot services and persistent UTC timers, using deploy's environment file and the
      shared 30-minute lock. Changed unit files trigger daemon reload; both timers are enabled/started. Repeated
      bootstrap runs remain unchanged.
    - Checks: Bash syntax, ShellCheck (including both embedded deploy scripts), systemd unit verification and harness
      Ruff passed. The official pinned rclone image ran successfully. All 20 deployment-harness tests passed after
      nine behavioral guard reconstructions; both bootstrap key cases remained idempotent. Job tests cover dump,
      validation, upload and heartbeat failures, independent cleanup commands and archive deletion before success.
      Actual R2/monitor pings, restored data and first-night evidence are recorded in 5.4.

- [x] **4.7 Update the runbook, `infrastructure/deploy/README.md`** (R26, with R9, R10 and R14)
    - Updated staging's supported flows and first-time setup for the separate CI key, restricted GitHub environment,
      private storage/retention, monitors, operations env and deployed provider apps. Live OAuth/mail credentials
      wait until the hardened version serves and its checks pass.
    - Documented automatic/manual deploys, private outcomes after session loss, bootstrap upgrades inside the shared
      lock and the legacy manual path with success-only history. Rollback selects its target from history/container
      identity, preserves schema comparison/reversal and requires correcting main before the next code push.
    - Added R2 restore with a verified live recovery copy before schema replacement, transaction-bound restore,
      migration/startup checks and recovery of the copy on failure. Included nightly operations, alert evidence,
      first-night checks and the production hostname move. Preserved SSH recovery and persistent-state guidance.
    - Checks: all 34 shell blocks passed `bash -n`; all 33 Compose calls select the production file and external env
      file; markdown lint and whitespace checks passed. Corrected mechanical wrapping and kept project-process
      references out of the durable runbook. External setup/live evidence is recorded in Phase 5.

### **Phase 5:** Staging takes this change and proves it live

- [x] **5.1 The maintainer's setup outside the repository** (Dependencies and Preconditions; Proven live 6, 11, 12)
    - The Owner completed the private R2 bucket, scoped token and 30-day lifecycle rule; both Healthchecks checks
      and failure email setup; the five-minute UptimeRobot monitor; deployed Google/GitHub apps and both-host
      callbacks; ZeptoMail sender/token setup; and the dedicated CI key and main-only GitHub staging environment.
    - Recorded console settings and GitHub API configuration without secret values. Confirmed the CI public key on
      the server and private operations settings in mode-600 `ops.env`; live backup and alert checks followed in 5.4.
    - Google remains in Testing. The Owner approved moving publication to the later website work once homepage,
      privacy and terms pages are live; basic identity sign-in with an empty test-user list works on staging.
    - OAuth/mail credentials stayed off the server until the hardened version passed its checks, then were entered
      privately and activated in 5.5.

- [x] **5.2 Publish this branch's images and take the change on staging** (Proven live 3, 2)
    - Published the branch and opened draft PR #78. Corrected the optional Site-domain typing and isolated the
      development-log CSRF test's real file write from checkout permissions after the first CI run exposed them.
    - Merged `main` through `1f980b45`, preserving strict CSRF enforcement and Site tests alongside upstream
      diagnostic tests; aligned resend-prefix references and test styles with upstream renames and lint rules.
    - Integrated `main` through `031327a5` after the Owner approved the tracked-blacklist update. Deployment now
      prepares the database without recreation, runs the existing validated R2 backup under its held lock, migrates
      and immediately syncs the image's tracked blacklist. Backup or sync failure prevents later steps and success
      history. Preserved all six markers, bootstrap and the runbook's backup/restore/rollback guidance.
    - Ten deployment cases cover the new ordering, upload/heartbeat and sync failures, and running/stopped/fresh
      databases. Coupled backup tests failed against the prior script; blacklist guards also failed with only
      sync removed, then passed with it restored. The merged backend passed 1,029 tests with 94.94% coverage;
      backend lint/format/type checks and all 24 deployment-harness cases passed. Publication and live evidence
      for this integration: both PR CI `41919363454` and manual CI `41919403178` passed at `cf0ef11b`.
    - Deployed `cf0ef11b` to staging: fresh R2 backup succeeded before migrations, first blacklist sync added all
      2,480 entries, and the second changed none. The table and cached IDs match the tracked file; three public
      browse samples each returned 20 movies with no blacklist overlap. Both running image revisions match the
      commit, public health passes, history records the prior `7608822a` version and local backup files are gone.
    - PR CI `41906416896` and manual CI `41906505768` passed at `7608822a`, publishing its images. The merged backend
      suite passed 990 tests with 94.71% coverage; backend type, lint, format and task markdown checks passed.
    - On staging, bootstrap installed the entry point, restricted CI key and nightly units; its second run reported
      zero changed and 46 unchanged steps. Timers schedule backup/maintenance for 10:00/10:30 UTC.
    - Deployed `7608822a` inside the held operations shell. Public health passed, Site 1 acquired the staging domain,
      and history recorded `manual` with the running `f49b6837` image as the previous version. A backup waited until
      that shell exited, then uploaded and cleaned up successfully.
    - A standalone same-version redeploy held the lock itself; its concurrent backup waited and then succeeded.
      History recorded the redeploy, Site setup was unchanged, public health passed and the local backup directory
      was empty. The earlier `f49b6837` commit was refused with the manual-runbook instruction; history and checkout
      remained unchanged.

- [x] **5.3 The CI key runs only the deploy** (Proven live 1)
    - With only the dedicated CI identity and pinned host key, verified refusal of invalid SHA input, the deployed
      branch commit not reachable from `main`, the older deployed `main` commit (naming the current version), shell
      and arbitrary-command requests. Deployment history remained unchanged after each.
    - Port forwarding was administratively prohibited. The server's final `authorized_keys` line contains the
      dedicated CI key exactly once with `restrict` and the forced deployment command.

- [x] **5.4 Backups, the restore rehearsal, maintenance and monitoring** (Proven live 4, 5, 7, 8)
    - Manual backup uploaded and cleaned up; deliberate invalid-bucket failure reached Healthchecks Down and its
      email, then a successful run restored the check. Manual maintenance ran both cleanup commands; the Owner
      confirmed its recent Up ping.
    - Restored an R2 archive into the isolated local production stack using the runbook's recovery-copy and schema
      replacement procedure. The Owner confirmed password sign-in and the same staging watchlist movie. Removed
      the recovery copy after that confirmation and tore down the local stack and its isolated volumes.
    - Controlled backend and database outages produced public 502 and 503 respectively. The Owner confirmed Down
      emails within ten minutes and both recovery emails at the next five-minute monitor check. Services recovered
      healthy and deployment history stayed unchanged.
    - The first scheduled backup and maintenance runs fired at 4:00 am CT and 4:30 am CT, each exiting 0. Their
      journals contain every expected step; backup uploaded `cinexplorer-20261105T100027Z.dump` (119,152 bytes)
      and left its local directory empty. The Owner confirmed both Healthchecks were Up with the corresponding
      scheduled pings. Checkout and running backend/web images remain the tested `cf0ef11b`; public health passes.

- [x] **5.5 Credentials only now, then email and sign-in live** (R17; Proven live 13, 15, 16, 17)
    - Installed OAuth/mail values privately only after deployed hardening checks passed. Verified all six fields,
      sender, mode-600 deploy ownership and exactly one ZeptoMail Authorization prefix without displaying values.
      Redeployed tested `cf0ef11b`; backup succeeded, blacklist sync changed nothing and the recreated backend loaded
      values matching saved configuration. Both provider redirects use exact staging callbacks.
    - The Owner confirmed Google sign-in in Testing with an empty test-user list and only email/profile scopes,
      GitHub sign-in, and both providers' watchlist persistence after reload. Approved the Google Testing amendment
      without an independent review.
    - Proton Mail delivered verification/reset to Inbox from the configured sender; recipient DKIM passed for
      `andrewcreekmore.dev`. The Owner completed verification, password sign-in and a used password reset. ZeptoMail's
      saved original contains multipart/alternative and text/plain; the Owner confirmed both text links use staging.
      Approved the inbox-provider amendment without review; Gmail delivery is untested. Proton's reconstructed export
      is not used as MIME proof.
    - The live valid-credential probe refused foreign Origin with or without a matching token (403), accepted the
      same credentials with own Origin/token (200) and completed logout (200). Its first attempt reached credential
      rejection (401); the retry passed without an application change. Reports contain only safe metadata.
    - With the reset password and Remember Me in Firefox, six minutes idle preserved sign-in and the watchlist.
      After every staging tab was closed for six minutes, reopening restored the account/movie and captured
      `/api/auth/refresh` returning 200. Two same-profile tabs also stayed signed in with the movie after six minutes.
    - Live mail logs show accepted sends (201), with no raw provider response lines or known account addresses or
      provider secrets found by the private audit. Markdown, criterion-copy and runbook shell checks passed; the
      deployed-code CI remains the exact `cf0ef11b` run.

- [x] **5.6 Integrate current main and refresh staging** (Owner-approved compatibility work before verification)
    - [x] **5.6.a Merge and check compatibility:** merged main through `500af329`, preserving the exact
      ZeptoMail 0.0.4 input pin with regenerated hashed locks and all four hook test files in the reusable docs job.
      Kept this branch's auth/deploy behavior alongside upstream logging, frontend dependencies and worktree tooling.
      Rebuilt the isolated backend and synced private host tooling without changing the shared venv. Checks passed:
      1,058 backend tests (94.94% coverage), 883 frontend tests, 111 hook tests, 24 deployment harness tests, lint,
      format, types, API generation without drift, lock consistency/audit, production build and config validation.
    - [x] **5.6.b Publish and take the checked build on staging:** PR CI `42049195742` and publication CI
      `42049233511` passed for `9b90ef28`; its exact published backend/web images are running on staging. The locked
      entry point validated/uploaded a backup before migration, synced eight new blacklist entries (2,488 total),
      configured the Site, passed health and recorded success. A second sync changed nothing; database/cache match
      the image's CSV exactly, and three public browse samples exclude blacklisted IDs. Fresh-cookie CSRF,
      closed-route and provider-redirect probes passed. Fresh browser homepage/browse, movie/reload and login checks
      found no runtime errors or failed script/style responses; retained-old-tab navigation was not established
      because the original probe selected a link instead of a button. Confirmed existing watchlist reload and a
      reversible add/reload/remove in the Owner's browser. The subsequent private audit found 212 valid JSON
      application records, including 117 request records, with no error-level records or provider secrets. Updated
      the draft pull request; formal verification and readiness transition remain in Phase 6.

### **Phase 6:** Verification

- [ ] **6.1 Verify the work**
    - The author criteria walk and a fresh-context independent verification pass covered the complete work unit:
      25 pre-merge criteria met, four superseded, and three explicitly post-merge criteria left for 6.2.
      Evidence: `test-evidence/6.1-criteria-report.json` and `adversarial-review/verification-pass1/report.txt`
      beside the session notes. The independent pass returned no findings.
    - Full local backend/frontend tests, lint, format, types, markdown, API drift and production configuration
      checks passed. Implemented 7 and 8 cite PR CI `42059086109` at `5bdf35ac`.
    - Draft PR #78 remains draft through the separate code-review stage; mark it ready where the completion
      workflow reaches publication. The post-merge criteria and 6.2 remain open by design.

    - [x] **6.1.a Repair the approved code-review findings** (F1–F3)
      Amended the installed-script and renewal-lifetime contracts, including cancellation before logout. Shared
      renewal and caller continuations now reject obsolete work; both browser storages and later sign-in remain
      intact. The entry point alone installs complete nightly jobs outside the checkout, preserving supported
      legacy operations and reconciling installation failure on retry. Corrected the resend-token and cookie-name
      descriptions and regenerated schema/types. Related checks passed: 238 frontend tests, eight Chromium cookie
      cases, 279 backend authentication tests, 28 deployment-harness tests, affected lint/format/types, shell checks,
      API sync and markdown. Fail-first and source-bound evidence: `code-review-author/repair-checks.json` beside
      the session notes. Independent fix check round 1 found no material defect and one minor Returns-description
      inconsistency; the approved correction now states the generic `200` and delivery-failure `503`, with regenerated
      schema/types, 279 authentication tests and affected checks passing. The auth and operations repairs are
      recorded as separate commits; the final operations commit carries these shared completion records.
    - [x] **6.1.b Refresh staging and verification evidence**
      Pushed auth repair `a0852f9f` and operations repair `0ca2d5b5`. Exact-head PR CI `42121038168` and manual
      publication CI `42121099582` passed; both images are deployed on staging at `0ca2d5b5`. Bootstrap upgrade/repeat,
      installed entry/job hashes, service paths, successful backup/maintenance pings and public health passed.
      Real deployed browser checks held a refresh across logout and later sign-in for both storages; cancellation,
      cookie preservation, subsequent account identity and final logout passed. Temporary accounts were removed.
      Refreshed local verification: 1,058 backend tests (94.94% coverage), 900 frontend tests, full lint/format/types,
      generated API agreement and markdown passed. Earlier unchanged live proofs were checked for applicability.
      Author criteria walk: 29 pre-merge criteria met, four superseded and three post-merge proofs open. Evidence:
      `publication-repairs/` and `test-evidence/6.1b-criteria-report.json` beside the session notes.
    - [ ] **6.1.c Settle the refreshed verification review**
      Offer the separate fresh-context criteria/evidence review over the repaired work and four appended criteria,
      under the completion workflow. The earlier 32-criterion review and implementation review remain distinct.
      Close this step on the Owner's review/decline decision and any resulting dispositions before closing 6.1.

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

- **Backend and frontend standards:** integrated Ruff formatting/docstring rules, backend lint/type checks,
  frontend Prettier/type-aware lint and coverage jobs from `main`. The reusable docs job retains the hook tests,
  and `ci-ok` retains the complete job set.
- **Generated contracts and frontend tests:** regenerated `openapi.json` and `api.ts` after API changes rather
  than resolving generated conflicts by hand. Frontend tests use the shared Mock Service Worker server
  (`tests/mocks/server.ts`, handlers under `tests/mocks/handlers/`, started in `tests/setup.ts` with
  `onUnhandledRequest: 'error'`), adding handlers with `server.use`.
- **Testing and error boundaries:** backend tests use the real database and replace external services at their
  clients; frontend tests use accessible queries and `userEvent`. New send-failure paths raise domain exceptions
  mapped in the API layer, with logs excluding addresses, tokens and keys. R28's credential-renewal effects remain
  the recorded exception to reading server data through TanStack Query.
- **Upstream endpoint and worktree changes:** the #59 endpoint changes supplied the CSRF test baseline around
  `PATCH /api/user-movie-data/{id}` and `test_user_api.py`. Worktree stack tooling and the remaining current-main
  changes were integrated before the staging refresh in 5.6.

### Phase 1

- **Django Ninja's throttle state:** `SimpleRateThrottle.allow_request` sets `self.key`, `self.history` and
  `self.now`, and `throttle_success` and `wait()` read them (`ninja/throttling.py`); the scope is part of the cache
  key (`throttle_<scope>_<ident>`). The test-mode bypass in `allow_request` returns before any of the three is set
- **1.2's hold point:** the concurrency test wraps the throttle object's `cache.get` so the first thread waits on a
  `threading.Event` after reading, released once the second thread's `allow_request` has returned. Every wait has a
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
  its views CSRF-exempt; allauth's `browser_view` does not (only `app_view` does), but Django's middleware was not
  installed at the baseline; 2.3 added checks to allauth's browser endpoints. Django checks a present `Origin` against
  the host and `CSRF_TRUSTED_ORIGINS`, and the `Referer` only on HTTPS
- **The token cookie:** `GET /api/csrf/` sets `csrftoken` itself, and Django's `process_response` sets it
  too, since `get_token` ran; the response holds one cookie per name, so it still sends one `Set-Cookie`. allauth's
  `browser_view` calls `get_token`, so the session request sets the cookie
- **CSRF rollout order:** 2.2 began reading the cookie already set by `GET /api/csrf/`; 2.3 then enabled server
  enforcement after the client could send it
- **The new error bodies** (R20's `403`, R22's and R13's `503`) are `{"detail": message}` with no debug text in any
  environment: build them directly, not with `build_error_response` (`apps/core/utils/http.py`), which makes the
  old `{"error"}` shape and adds debug text under `detail` when `DEBUG` is on. Tests assert the whole body
- **One refresh in flight:** `ROTATE_REFRESH_TOKENS` and `BLACKLIST_AFTER_ROTATION` are on, so a second refresh
  presenting the same `refresh_token` cookie fails. The interceptor previously queued `401`s behind an `isRefreshing`
  flag; the shared function coordinates all callers by returning one pending request. The interceptor retains
  its failure path (clearing tokens and a full reload to `/login?session_expired=true`), so a failed refresh the
  hook started only signs the user out
- **Storage and other tabs:** before renewal was shared, the interceptor used `setAuthTokens(newAccessToken)`,
  whose default is `localStorage`, while a sign-in without "remember me" uses `sessionStorage`;
  `getCurrentStorageType` reports which holds the token. Tabs share `localStorage` and the refresh-token cookie, and
  Chrome runs hidden tabs' timers on the same minute boundary, so two idle tabs' 60-second checks refresh at the same
  instant; the one presenting a cookie the other has rotated gets `401`, and `clearAuthTokens` would clear the token
  the other just stored. Under the lock the second refresh starts after the first has finished: it finds the new
  token in `localStorage`, or, for a sign-in in `sessionStorage` or a write it cannot see yet, posts with the rotated
  cookie and succeeds. jsdom has no `navigator.locks` (Vitest's jsdom environment replaces Node's `navigator`): 2.5.b
  installed a minimal stand-in (a queue per lock name), as `tests/setup.ts` installs `matchMedia`, for every case but
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
- **The resend token:** validation reads the key; only a successful `email_address.send_confirmation(request)`
  consumes it. A failed send renews its lifetime to `RESEND_TOKEN_EXPIRY_SECONDS` (`600`). Django's
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
- **How the resend service reports a failed send:** `main`'s domain exceptions and API-layer handler were merged
  before 3.2. The service raises `UpstreamError`, and the handler returns R22's fixed `503` body
- **A real database failure for the health check:** in a test marked `django_db(transaction=True)`, point the
  default connection's `PORT` at a closed port and close the connection, so the next query fails in the driver;
  restore the setting and close the connection again afterwards. Nothing in the project is patched
- **Toasts as rendered:** `main.tsx` mounts the `Toaster` and `PriorityToaster` (`components/core/chakra/toaster.tsx`)
  beside the app, so a page test renders them beside the page and finds the toast's text on screen
- **Both email calls go through `apiClient`** (the reset request posts to `/_allauth/...` with `apiClient.post`), so
  the toast suppression lives in the response interceptor alone
- **`load_settings`** runs the settings module in a subprocess without re-reading `config/.env`; a `None` value
  removes a variable, so pass `None` for each OAuth variable a case does not set
- **The health check** is what both Compose files' backend health checks call; their probes use its database
  readiness result

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
  schedules it without running its job. The installed `authorized_keys` preserves root's keys
  and appends the restricted CI key when supplied
- **A job before its inputs exist:** `EnvironmentFile=` without the `-` prefix fails the unit naming the missing file,
  and a missing script fails its start naming the path, which is how R12's journal requirement holds; keep both
- **Workflow checks:** `actionlint` checked both workflows; `ci-ok`'s `needs` names `markdown`, which retains its
  job id when it calls the reusable workflow

### Phase 5

- **The restore rehearsal's local stack** ran in Docker Desktop's distro, following the host's memory policy
  and explicit container memory limits
- **Order on the server:** `ci-deploy.pub` and `ops.env` (5.1) were installed before the bootstrap's first run
  (5.2), which installed the restricted key and units with their settings present. OAuth/mail credentials were
  activated only after the hardened deployment passed its checks (5.5)

## Success Criteria

The criteria come in three groups. **Implemented** criteria are checked locally and in CI. **Proven live** criteria
are checked with staging running this change's images, deployed with `cinexplorer-deploy` before the pull request
merges: on the server, in the provider consoles and GitHub's settings, and in one restore rehearsed locally.
**Proven after merge** criteria depend on a push to `main`, so verification before the merge cannot check them: they
are checked once the change has merged, and their evidence is recorded before the work is archived. Each criterion
is marked with its evidence beside it, and the evidence for setup done in a provider's console says
what was seen and where.

### Implemented (checkable locally and in CI)

- [x] Backend tests show that requests to sign-in do not count against the registration or resend-verification
  throttles, nor the reverse, and that a test which interleaves two requests from different client addresses on one
  throttle object, across two threads, records each under its own key.

    - Evidence: Tests: test_rate_limiting.py cross-endpoint cases and test_throttles.py real Redis/thread
      interleavings; included in 6.1-backend-tests.log (1,058 passed). Source scopes and thread-local state
      inspected.

- [x] Backend tests with `enforce_csrf_checks=True` show that each of these, sent without a token or with a token that
  does not match the cookie, answers `403` with R20's body, and passes the check with a matching cookie and header:
  sign-in, registration, logout, email verification, resend-verification, both refresh endpoints, allauth's
  password-reset request, and a watchlist change by a user authenticated by the session alone. A request with a
  matching token and an `Origin` from another site is refused on HTTPS. `POST /api/logs/` without a token is
  accepted, as is `POST /api/dev-logs/write/` under `development`.

    - Evidence: Tests: enforcing test_csrf_protection.py matrix (missing/mismatched/matching tokens, nine POST paths
      plus session PATCH/DELETE), HTTPS foreign Origin and both log exemptions; 6.1-backend-tests.log passed.
      Matching requests reach downstream handlers rather than the fixed CSRF refusal.

- [x] Frontend tests show the API client sends the `csrftoken` cookie's value as `X-CSRFToken` on an unsafe request and
  fetches `/api/csrf/` first when the cookie is missing; that the refresh retry, the OAuth sign-out, the
  password-reset completion and the OAuth start form each send the token; that the forgot-password page shows
  R22's message on a `503` and its generic confirmation on other errors; that the login page's resend action shows
  R22's message on a `503`; and that the API client shows no global "Server error" toast for a `503` from the
  password-reset request or resend-verification, and still shows it for other `500`-range answers.

    - Evidence: Tests: apiClient.test.ts CSRF/refresh/toast matrix, authService.test.ts reset completion,
      useAuth.test.tsx OAuth DELETE, useOAuthFlow.test.ts form, ForgotPassword.test.tsx and Login.test.tsx rendered
      errors; 6.1-frontend-tests.log (883 passed).

- [x] Backend tests show that when the email backend sends nothing, the password-reset request, for an address with an
  account and one without, and resend-verification answer `503` with R22's body; and that after a failed resend the
  token's lifetime starts again and the same token, presented again with the backend working, sends the email, after
  which the token is spent. Tests at the transport layer show that the ZeptoMail backend sends with a timeout,
  returns `0` without raising on a timeout, a connection error, a non-2xx answer in ZeptoMail's error format, one
  with a body that is not JSON, and a missing API key, writes nothing to stdout, and logs the outcome without the API
  key or the recipients. The missing-key test imports the backend's module afresh with the key empty (in a
  subprocess, or with the package's and the backend's modules removed from `sys.modules`), so an import of the
  package's message class at module level fails it.

    - Evidence: Tests: test_failed_email_send.py known/unknown reset addresses and real Redis resend
      renewal/retry/spent-token flows; test_zeptomail_backend.py bounded transport outcomes and fresh missing-key
      subprocess. Both included in 6.1-backend-tests.log; source/backend logging inspected.

- [x] Backend tests show `GET /api/health-check/` answers `200` when the database query succeeds and `503` with R13's
  body when it fails; the committed OpenAPI schema and frontend types include that `503` and resend-verification's
  (R22), and CI's type-drift check passes.

    - Evidence: Tests: test_health_check.py real database/closed-port cases passed. OpenAPI and generated response
      declarations inspected; 6.1-api-types.log regenerated with no drift. PR CI 42059086109 API
      types/type-drift step passed.

- [x] Backend tests that load the settings module under each environment show: under `staging`, both Google variables
  set yields one settings app for Google, neither yields none, and one alone fails startup with
  `ImproperlyConfigured` naming the other (likewise for GitHub); under `development`, the variables set yields no
  settings apps. Tests show `configure_site` sets the record's domain and name, reports no change on a second run,
  and under `staging` with `SITE_DOMAIN` unset exits non-zero naming it.

    - Evidence: Tests: test_environment_config.py settings subprocess matrix, test_commands.py configure_site
      changes/idempotence/missing domain; 6.1-backend-tests.log passed; source settings and command inspected.

- [x] The two commands R7 adds pass on this change's files and fail on a copy of the Caddyfile with an invalid directive
  and on a Compose file with a syntax error, run locally the way the `images` job runs them; a pull-request run shows
  both steps passing.

    - Evidence: 6.1-config-validation.json and four named logs: valid Caddy and Compose exit 0, invalid site
      directive and syntax-error copies exit 1. PR CI 42059086109 Images/Validate production
      configuration passed. Initial negative Caddy fixture placed a token at top level, which is a legal site
      address; corrected to an invalid directive inside the site block.

- [x] On a pull request, every CI job runs and `ci-ok` passes as before, and the `deploy` job does not run.

    - Evidence: 6.1-pr-ci.json: exact head 5bdf35ac, pull_request event, all seven checking jobs successful including
      ci-ok; Deploy staging skipped. Workflow conditions inspected.

- [x] Backend tests show that requests under `/_allauth/` outside R24's list, among them `browser/v1/auth/signup`,
  `browser/v1/auth/login` and an `app/v1/` endpoint, answer `404` and create no account, and that each listed
  endpoint with its listed methods still reaches allauth.

    - Evidence: Tests: test_allauth_allowlist.py closed sign-up/sign-in/app client/wrong methods and every allowed
      path/method; 6.1-backend-tests.log passed. Middleware allowlist inspected.

- [x] R25's frontend tests pass in the frontend suite, covering each behavior R25 lists for `useAuth` and
  `utilities/tokenUtils.ts`.

    - Evidence: Tests: useAuth.test.tsx and tokenUtils.test.ts inspected against every R25 behavior including
      original storage, pending refresh, Web Lock waiting/newer token, OAuth and fallback; 6.1-frontend-tests.log
      passed.

- [~] The authentication strategy states R20, R21, R24 and R15 wherever R27 lists; a case-insensitive
  `git grep -E` outside the archive and this PRD for `CsrfHeaderMiddleware|XSRF-TOKEN|csrf[- ]exempt|path-based
  exemption|CSRF token is optional` finds no text describing the old design; no test in `test_csrf_protection.py`
  asserts that sign-in or registration needs no token; and `backend/scripts/test_csrf_protection.sh` no longer
  exists. (Superseded by the 2026-11-04 amendment: criterion 12 adds R28's refresh.)
- [x] The authentication strategy states R20, R21, R24, R15 and R28 wherever R27 lists; a case-insensitive
  `git grep -E` outside the archive and this PRD for `CsrfHeaderMiddleware|XSRF-TOKEN|csrf[- ]exempt|path-based
  exemption|CSRF token is optional` finds no text describing the old design; no test in `test_csrf_protection.py`
  asserts that sign-in or registration needs no token; and `backend/scripts/test_csrf_protection.sh` no longer
  exists.

    - Evidence: Authentication strategy CSRF, provider setup, allowlist and renewal sections inspected against
      R27/R28 and implementation. Scoped case-insensitive git grep found no old-design text; obsolete shell script
      absent; enforcing CSRF tests inspected. Markdown lint passed.

- [x] Frontend tests hold an idle renewal response until explicit sign-out has completed, then release it and show
  that authentication and both browser storages remain cleared. They also hold the Web Lock until after sign-out
  and prove no refresh request is started, for both storage choices. A later sign-in remains intact when the old
  operation settles; ordinary renewal and shared callers still work.

    - Evidence: Seventeen lifecycle regressions in useAuth.test.tsx pass within the refreshed 900-test frontend run.
      Pinned-source and narrow reconstruction failures are retained in code-review-author/; delayed responses,
      queued locks, both storages, obsolete callers and later sign-in are covered.

- [x] Disposable deployment tests install the target's job sources through the entry point, then switch the checkout
  to the previous published main tree `f49b6837c5a72ad4a823bf7594f2d9cf94fcd46d`. Both installed service
  commands and the locked-shell backup still finish
  their expected operations and heartbeats, the checkout stays clean and legacy, and returning to a supported
  target updates the installed scripts. Missing/invalid/partial sources and installation failure stop before
  target deployment; a retry reconciles complete installed files.

    - Evidence: The 28-test deployment harness and latest four installed-operations cases pass. Actual legacy
      f49b6837 source is archived into the disposable fixture; entry/job code runs with Docker/curl boundaries
      replaced. Missing, invalid, partial and failed replacement cases fail before deployment and recover on retry.

- [x] A real-browser regression loads the actual sign-in hook and Axios client against an HTTP fixture that sets
  HTTP-only refresh cookies. With refresh headers delayed, or its headers sent and body delayed, a successful
  logout leaves no refresh cookie; a subsequent sign-in and renewal belong to the new account after the old
  response settles. Both browser-storage choices pass. The no-cancellation control reproduces the late-cookie
  overwrite when headers are delayed.

    - Evidence: Eight real Chromium cases pass through the actual hook and Axios against a Secure/HTTP-only cookie
      fixture. All eight fail against pre-repair source; omitting cancellation alone fails four delayed-header
      cases. Subsequent renewal identity is checked. See
      code-review-author/auth-browser-{baseline-red,no-cancel-red,green}.log.

### Proven live (with staging running this change, before merge)

- [x] With the CI key from a local terminal: the forced command refuses an argument that is not a 40-character SHA, a
  commit not reachable from `origin/main`, a `main` commit that the deployed branch commit contains (once criterion
  2 has deployed it), naming the deployed version, and a request for a shell or a command, deploying nothing each
  time; a port-forwarding request is refused. On the server, `deploy`'s `authorized_keys` ends with the CI key's line
  carrying `restrict` and the forced command.

    - Evidence: 5.3-ci-key.json records each actual SSH refusal, exit code and unchanged history at 7608822a.
      6.1-server-readonly.json confirms installed entry SHA matches current source and exactly one final restricted
      CI-key line. Entry/bootstrap source unchanged since original probes.

- [x] In the shell holding the operations lock in which the server takes this change (R26, criterion 3),
  `cinexplorer-deploy <this branch's published commit>` starts without waiting and deploys it: the health check
  passes through the public address, `deploy-history.log` gains a `manual` line whose previous version is the one
  that was running (the `main` version deployed before, not the branch commit checked out by hand for the bootstrap)
  and whose new version is the branch's, and `configure_site` reports the staging host. A backup started with
  `systemctl start cinexplorer-backup` meanwhile starts only after that shell exits. Outside the shell, a redeploy of
  the same commit with `cinexplorer-deploy` takes the lock itself: a backup started during it starts only after it
  finishes. `cinexplorer-deploy` given that earlier `main` commit, which has no deploy script, refuses it and names
  the runbook's manual steps.

    - Evidence: 5.2-publication.json records first manual deployment/history/Site/lock inheritance, waiting backups,
      standalone locked redeploy and scriptless-target refusal. 5.6-staging-deploy.log and 5.6-deployment.json prove
      current 9b90ef28 deploy, fresh pre-migration backup, blacklist sync, Site and public health. Entry/lock
      implementation unchanged; deploy backup/sync amendment checked at current deployment.

- [x] On the existing staging server, with this branch checked out and `ci-deploy.pub` in place, the bootstrap's first
  run installs the entry point, the two directories, the units and the CI key's line, and the next run reports every
  step `UNCHANGED`; `systemctl list-timers` then shows both timers with their next runs at 10:00 and 10:30 UTC.

    - Evidence: 6.1-server-readonly.json inspects retained bootstrap-7608822 first/second logs directly: required
      additions present, then zero CHANGED and 46 UNCHANGED; installed entry and units match intended source.
      5.2-publication.json records next timers at 10:00/10:30 UTC; installed unit schedules rechecked.

- [x] `systemctl start cinexplorer-backup` uploads a new dump to R2 (the object is listed in the bucket), leaves nothing
  in `/opt/cinexplorer/backups/`, and the `backup` check shows the ping. With the bucket name in `ops.env` changed to
  one that does not exist, a run fails, the check receives the `/fail` ping, and the maintainer receives Healthchecks'
  alert email; with the name restored, the next run succeeds. After the first night, the `backup` check shows a ping
  from the timer's own run.

    - Evidence: 5.4-nightly-and-monitoring.json records actual success/object listing/empty directory,
      nonexistent-bucket failure and restored success. Owner confirms Healthchecks Down/email and recovery.
      5.4-first-night.json records timer/service timestamps, exit 0, R2 object metadata and Owner scheduled ping
      confirmation. Backup implementation unchanged.

- [x] A dump downloaded from R2 is restored into a local production stack built from this change's images, following the
  runbook's restore procedure (a copy of the live database, an emptied schema, then migrations); the staging account
  then signs in there, and its watchlist shows the movies it holds on staging.

    - Evidence: 5.4-nightly-and-monitoring.json plus restore-rehearsal/rehearse-restore.sh, restore.stage=complete,
      browser-confirmed, schema-drop log and validated retained archive prove the isolated production-image restore
      at 7608822a. Owner confirmed password sign-in and same watchlist movie. No database migration files changed
      between that proof and current HEAD; runbook restore operations preserved. This is the earlier branch-image
      rehearsal, not a new rehearsal at 9b90ef28.

- [x] In Cloudflare's dashboard, the backup bucket shows public access off and a lifecycle rule that deletes objects 30
  days after upload, and the server's R2 token is limited to that bucket with object read and write; the maintainer
  records what each page showed.

    - Evidence: 5.1-provider-setup.json: Owner console observation records private bucket, enabled 30-day deletion
      rule on upload prefix and Object Read & Write token scoped to that bucket. This is Owner confirmation, not a
      screenshot/API inspection.

- [x] `systemctl start cinexplorer-maintenance` completes both commands, and the `maintenance` check shows the ping; after
  the first night, it shows a ping from the timer's own run.

    - Evidence: 5.4-nightly-and-monitoring.json records manual cleanup and Owner ping confirmation;
      5.4-first-night.json records scheduled trigger/service exit 0/both command journal steps and Owner scheduled
      ping confirmation. Maintenance implementation unchanged.

- [x] With `backend` stopped, UptimeRobot alerts the maintainer by email within 10 minutes, and again on recovery once it
  is started. With `db` stopped, `curl` of the health check returns `503` and UptimeRobot alerts likewise; once `db`
  is started, the health check returns `200`.

    - Evidence: 5.4-nightly-and-monitoring.json: controlled backend 502 and database 503 outages, measured
      starts/recoveries, successful public health after recovery, and Owner email observations within ten minutes
      plus both recovery emails. Health service behavior preserved; 6.1-backend-tests.log current
      healthy/failed-database tests pass.

- [~] Signing up on staging with a Gmail address delivers the verification email to that Gmail inbox, not its spam
  folder, from `cinexplorer@andrewcreekmore.dev`. Gmail's "Show original" view shows DKIM passing for
  `andrewcreekmore.dev` and a `multipart/alternative` message with a `text/plain` part containing the verification
  link. Following the link verifies the address, and the visitor then signs in with the password. A password reset
  for the same address delivers a reset email to the inbox whose text part names
  `staging.cinexplorer.andrewcreekmore.dev` and whose link sets a new password that then signs in. The backend's logs
  show each send's outcome and no ZeptoMail response printed raw.
  (Superseded by the 2026-11-04 inbox-provider amendment: criterion 17
  uses the maintainer's inbox and records recipient and sender-original evidence separately.)
- [~] Signing in with Google, using an account that is not on the Google Cloud project's test-user list, succeeds, which
  shows the consent screen published and the deployed client, its redirect URI and the env file wired together.
  Signing in with GitHub succeeds. Each signed-in user then adds a movie to the watchlist, and it is still there after
  a reload. (Superseded by the 2026-11-04 Google Testing amendment: criterion 16 accepts basic identity
  sign-in in Testing; publication moves to the later website work.)
- [x] The Google client's authorized redirect URIs list both hosts' callback URLs, and the GitHub OAuth App's homepage
  and callback configuration name the production host; the maintainer records what each console showed. The
  production host cannot be exercised before it exists.

    - Evidence: 5.1-provider-setup.json records Owner console observations of both Google redirect URIs and GitHub
      production homepage/both callbacks. 5.6-oauth-configuration.json proves current staging redirects/scopes.
      Production-host callbacks cannot be exercised before that host exists.

- [x] `gh api repos/andrewRCr/CineXplorer/environments/staging` shows `custom_branch_policies: true`,
  `gh api repos/andrewRCr/CineXplorer/environments/staging/deployment-branch-policies` lists `main` as the only
  pattern, and `gh api repos/andrewRCr/CineXplorer/environments/staging/secrets` lists `DEPLOY_SSH_KEY` and
  `DEPLOY_KNOWN_HOSTS`.

    - Evidence: 6.1-github-environment.json refreshes all three GitHub API reads: custom_branch_policies true, sole
      branch main, and both DEPLOY_SSH_KEY/DEPLOY_KNOWN_HOSTS names present.

- [x] A sign-in request to staging with valid credentials, an `Origin` from another site and no token answers `403`, and
  the same request from the site's own pages signs in.

    - Evidence: 5.5-csrf-valid-credentials.json records foreign Origin without/with token 403, own Origin/token 200
      and logout 200; Owner password sign-in confirms own-pages case. 5.6-csrf-boundary.json rechecks current
      missing/matching/foreign-token boundaries without credentials. Backend middleware/service unchanged; later
      useAuth diff removes TypeScript casts only.

- [~] Signed in with a password on staging, a tab left idle for 6 minutes still shows the user signed in, and so
  does a reload of it; the watchlist then loads. (Superseded by the 2026-11-04 amendment: criterion 15 reopens the
  page with the access token expired.)
- [x] Signed in with a password and "remember me" on staging, a tab left idle on the watchlist page for 6 minutes still
  shows the user signed in. With every tab of the site then closed for 6 minutes, opening the watchlist page shows
  the user signed in and lists their watchlist, and the browser's network panel shows at least one request to
  `/api/auth/refresh` during that load, each answered `200`.

    - Evidence: 5.5-session-live.json: Owner Firefox/Remember Me observations of six-minute idle and all-tabs-closed
      six-minute reopen, signed-in watchlist and refresh 200. Renewal source unchanged since cf0ef11b; later auth
      diff removes casts only. These are Owner confirmations, not recordings.

- [x] Signing in with Google on staging, using an account absent from the Google Cloud project's test-user list,
  succeeds with only basic identity scopes (`email`, `profile`, and optionally `openid`). The project may remain in
  Testing. This proves the deployed client, its redirect URI and the environment credentials work together. Signing
  in with GitHub succeeds. Each signed-in user adds a movie to the watchlist and still sees it after a reload.

    - Evidence: 5.5-google-live.json and 5.5-github-live.json: Owner confirms Google non-test account/empty
      list/Testing/basic scopes and both provider watchlist reloads. Current 5.6-oauth-configuration.json confirms
      redirects/basic scopes and 5.6-owner-watchlist.json confirms persistence/add/reload/remove. Provider/session
      mechanisms unchanged since cf0ef11b; no new provider sign-in claimed.

- [x] Signing up on staging with an email address whose inbox the maintainer controls delivers the verification email
  to that inbox, not its spam folder, from `cinexplorer@andrewcreekmore.dev`. The receiving provider's authentication
  results show DKIM passing for `andrewcreekmore.dev`. ZeptoMail's saved original shows a `multipart/alternative`
  message with a `text/plain` part containing the staging verification link. Following the link verifies the address,
  and the visitor then signs in with the password. A password reset for the same address delivers a reset email to
  the inbox; its saved original's text part names `staging.cinexplorer.andrewcreekmore.dev`, and its link sets a new
  password that then signs in. The backend logs show each send's outcome and no raw ZeptoMail response. The evidence
  records the receiving provider and the source of the MIME observation separately.

    - Evidence: 5.5-email-live.json and 5.5-email-log-audit.json: Owner confirms Proton verification
      Inbox/sender/DKIM, verification/password sign-in/reset, and separately ZeptoMail saved-original
      multipart/alternative/text/plain/both staging text links; three accepted send outcomes and no raw provider
      response/signature/account/provider secrets. Mail implementation unchanged since cf0ef11b.
      6.1-email-confirmation.json records the Owner’s direct 2026-11-05 confirmation that the password-reset email
      arrived in Proton’s Inbox. All clauses supported by attributed evidence.

- [x] After staging takes the repaired deployment entry point and images, both installed service commands use
  `/opt/cinexplorer/operations/`, both installed scripts match the published target's sources, and manual backup
  and maintenance runs complete with their success pings. The bootstrap's repeat run remains unchanged.

    - Evidence: Staging 0ca2d5b5: installed entry/jobs match target source; both service paths use
      /opt/cinexplorer/operations/. Manual services returned success/status 0 after their heartbeat steps; bootstrap
      changed five items then zero on repeat. Raw proof: publication-repairs/staging-{verified,jobs}.log beside the
      session notes.

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

### 2026-11-04 — Google Testing amendment

- **Evidence:** the real deployed authorization form requests only email and profile; the Owner confirmed Google
  sign-in with an empty project test-user list and watchlist persistence after reload. Google's audience guidance
  documents the basic identity exception for Testing.
- **Approved change:** retain and supersede Proven live 10, append 16 in both copies, and propagate Testing support
  and later website-dependent publication into Goal 6, R15, Dependencies, setup and live tasks, and the runbook.
  Both providers' watchlist reload requirements remain; criterion boxes stay for verification.
- **Review:** contained amendment at medium depth; author checks covered reader independence, binding completeness,
  coherence and source grounding across the footprint. The Owner declined the offered independent review.

### 2026-11-04 — Inbox-provider amendment

- **Evidence:** the Owner has no Gmail inbox; Proton delivered verification/reset to Inbox with the expected sender
  and DKIM pass. ZeptoMail's saved original has multipart/alternative and text/plain, with both staging links
  confirmed; actual verification, password sign-in and reset passed.
- **Approved change:** retain/supersede Proven live 9, append 17 in both copies, and propagate the controlled-inbox
  requirement and explicit recipient/sender-original evidence split to Dependencies, Task 5.5 and runbook.
  Gmail-specific delivery remains untested; no application or provider-settings change is implied.
- **Review:** contained amendment at medium depth; author checks covered reader independence, binding completeness,
  coherence and source grounding across the footprint. The Owner explicitly approved without an independent review.

### 2026-11-05 — Verification, author criteria walk

- Scope: all Success Criteria, `main...HEAD` at merge base `739d0a17` and head `5bdf35ac`, current tree and
  mechanical workflow whitespace cleanup. Evidence is retained beside the session notes in
  `test-evidence/6.1-criteria-report.json` and its referenced artifacts.
- Gates: 1,058 backend tests (94.94% coverage), 883 frontend tests; backend/frontend lint, format and types,
  markdown lint, regenerated API types without drift, workflow lint, production positive/negative config checks
  and whitespace check passed. Corrected one extra EOF blank line in the docs workflow.
- Criteria: 25 met, four superseded, and three intentionally post-merge criteria open for 6.2. The Owner
  explicitly confirmed reset-email Inbox placement on 2026-11-05; `6.1-email-confirmation.json` records it.
  No criterion wording changed.
- Earlier live proof was checked against source changes and current staging configuration. Bootstrap logs were
  inspected directly; the installed entry matches source. Provider-console, inbox and browser observations remain
  attributed to the Owner. The local test stack is stopped with volumes preserved.
- The Owner approved the independent verification pass below. Code review remains a separate stage.

### 2026-11-05 — Verification, Pass 1

- Runner: fresh general-purpose subagent, read-only by prompt; elapsed about 9.3 minutes. The Owner approved
  this pass after the author criteria walk.
- Scope and rubric: all 32 Success Criteria against the PRD, unmarked task scope/criteria, complete source diff
  from `739d0a17` to `5bdf35ac` plus tracked edits, and the reachable tree. Author criterion marks, evidence
  annotations, completion reports and review history were withheld; raw tool output and attributed observations
  were supplied separately.
- Result: no findings; all 25 applicable pre-merge criteria considered, four superseded entries recognized,
  and three post-merge proofs left for 6.2. The pass assessed retained execution/live evidence and traced source;
  it did not rerun gates or perform live operations.
- Primary validation: target identity and deployed/source equivalence checked; source-grounded health/error
  mapping, shared renewal and thread-interleaving observations spot-checked. No dispositions or fixes needed.
- Retained prompt, exact subject, neutral input copies and report: `adversarial-review/verification-pass1/`
  beside the session notes.
- Stop reason: clean convergence. Task 6.1 complete; code review, draft readiness and post-merge proof remain
  separate later stages.

### 2026-11-05 — Author code-review dispositions and repair amendment

- Author check at `83d66a27`: two major findings and one minor, all FIX approved by the Owner. F1: idle renewal
  republishes credentials after sign-out (local correction); F2: legacy checkout removes nightly executables
  (new design); F3: stale token-strategy and resend-input descriptions (local correction). The original verification
  pass remains a separate criteria-based record, not code-review clearance.
- The approved amendment retains installed operations scripts across legacy rollback and invalidates obsolete
  renewal work at explicit sign-out. New criteria are appended in both documents; prior criterion text stays fixed.
  Verification is reopened for local repair checks and a separately approved staging refresh.
- Retained source findings, probes and amendment proposal: `code-review-author/` beside the session notes. No
  independent code-review or repair-check invocation has been authorized by the disposition approval.

### 2026-11-05 — Repair amendment, Pass 1

- Runner: fresh general-purpose subagent, read-only against the saved amendment and pinned `83d66a27` source;
  actual legacy compatibility grounded at `f49b6837`. Complete selected amendment and affected test-plan coverage.
- Result: one major finding, verified at source: renewal also writes an HTTP-only refresh cookie, so browser-storage
  observations alone cannot prove obsolete renewal leaves a later session intact. The operations-script contract
  withstood the review.
- Proposed disposition: FIX, local correction. Specify cancellation of this tab's pending renewal transport before
  logout, retain stale-caller guards, and prove cookie ordering and subsequent renewal identity in a real browser.
  A Chromium/Axios loopback control reproduced old-cookie replacement without cancellation and preservation with it.
  The Owner approved this complete disposition. R25/R28 and appended Implemented 15 now name the transport/cookie
  boundary; no further independent pass has been authorized.
- Retained subject, prompt and validated finding: `code-review-author/amendment-review-pass1/` beside the session
  notes. This is an amendment review, separate from whole-change code review and verification.

### 2026-11-05 — Approved repair checks (author)

- The complete F1–F3 disposition set is implemented and locally checked. The operations amendment's independent
  pass had no operations findings; its one major cookie-boundary finding was FIX approved by the Owner, clarified
  in R25/R28 and Decision 26, and covered by appended Implemented 15.
- Browser regressions use the real hook, Axios and an HTTP fixture with Secure/HTTP-only cookies. All eight fail
  against `83d66a27`; cancellation omitted in isolation fails all four delayed-header cases; the repaired source
  passes both storage choices, both header/body timing cases, and sign-out with or without later sign-in. Subsequent
  renewal is checked against the later account's identity. Earlier MSW regressions cover stale loading/profile/API
  callers and lock waiters; source reconstructions and restored passes are retained.
- Actual legacy-tree job continuity, complete-file replacement, refusal and retry checks pass in disposable
  containers. Old-bootstrap controls fail for the intended behaviors. Focused check results and source hashes are
  retained beside the session notes; completion documentation reflects the reopened staging verification.
- Stop reason: primary repair validation complete. A fresh independent fix check is recommended before publication;
  it has not been invoked. Task 6.1.b and the parent verification task remain open for separately approved staging
  publication and refreshed evidence. Success Criteria marks are unchanged.

### 2026-11-05 — Repair fix check, round 1

- Runner: fresh general-purpose subagent, read-only against 19 immutable before/after repair-file snapshots at
  source base `83d66a27`, plus their upstream and actual legacy context. Author evidence, progress marks and
  completion conclusions were withheld; the approved findings account followed the full artifact read.
- Rubric: closure, behavioral grounding, propagation/completeness and new failure, plus all five implementation-audit
  dimensions. Complete static repair coverage; no tests, containers or live operations were run by the reviewer.
- Result: no critical or major findings; one minor, verified at source. The new resend Returns prose implies a
  distinct invalid-token outcome, while the service returns the generic `200` confirmation for invalid/expired
  tokens. Disposition: FIX, local correction approved by the Owner. The docstring now names the generic `200`
  confirmation, including invalid/expired tokens, and delivery-failure `503`; schema/types were regenerated.
- Renewal lifecycle and cookie transport, installed-job continuity, replacement/retention/retry and legacy
  compatibility had no material finding. This incremental check does not attest the whole work unit.
- Trend: converging. Code-review major repairs: two to zero; amendment cookie repair: one to zero. The remaining
  minor originates in the description repair. Retained prompt, exact target, report and primary validation:
  `code-review-author/fix-check-round1/` beside the session notes.
- Correction checks: 279 backend authentication tests, backend lint/format and types, frontend types, API description
  agreement and markdown passed. The correction changes only descriptive text; no new runtime behavior or test was
  introduced. Primary before/after comparison and raw checks are retained under the same fix-check directory.
- Stop reason: approved minor correction complete; another independent fix-check round is not recommended for this
  documentation-only fold. Recommend the separate full-branch independent code-review pass before publication.

### 2026-11-05 — Independent implementation code review, Pass 1

- Runner: fresh general-purpose subagent, read-only against the immutable 81-file source/contract manifest from
  merge base `739d0a17` through `83d66a27` plus all uncommitted source repairs and both new files. Every changed
  hunk and full new file was read, with caller/producer and actual legacy context. Task-status/completion reports,
  author findings, review history and verification conclusions were withheld under the independence boundary;
  those two administrative records were outside the code-review target.
- Rubric: all five implementation-audit dimensions and repository contracts, including cross-layer and deployment
  seams. Result: no findings; clean static implementation review. No tests, containers, installations or live
  operations were run by the reviewer; runtime outcomes and external configuration were not reverified.
- Primary validation: all 81 current source hashes and the aggregate diff still match the reviewed snapshot.
  No dispositions or fixes needed. Retained prompt, exact manifest, before/after source, report and validation:
  `adversarial-review/code-pass1/` beside the session notes.
- Stop reason: clean convergence for this implementation review. Task 6.1.b remains open for explicitly approved
  publication/deployment, refreshed CI and affected live verification; the prior results do not attest a new head.

### 2026-11-05 — Publication and refreshed verification evidence

- The Owner approved commit, push, checked image publication and staging refresh as one bounded batch. Auth repair
  `a0852f9f` and operations/shared records `0ca2d5b5` passed hooks and were pushed. All 81 reviewed implementation
  and contract files still match the independent review snapshot; only administrative reporting changes follow.
- PR CI `42121038168` and manual publication CI `42121099582` passed on `0ca2d5b5`, including `ci-ok`; deployment
  was skipped in both runs. Both published images and staging containers identify that exact code commit.
- Bootstrap changed five items and zero on repeat. Deployment history records the transition from `9b90ef28` to
  `0ca2d5b5`. Installed executable hashes, private modes, stable service paths, manual job success/heartbeats, public
  health and CI-key refusal reasons were verified. Backup left no local archive.
- Both deployed storage cases canceled a held renewal across sign-out, preserved the subsequent account's cookie,
  renewed as that account and ended signed out. The probe follows the navbar's existing home-after-logout flow;
  its initial login-form expectation was corrected without application changes. Temporary accounts/credentials
  were removed. Local full suites and static gates passed; regenerated API files have no drift.
- Source and retained evidence were walked against all 36 criteria: 29 pre-merge met, four superseded, three
  explicitly post-merge open. The four appended criteria are now marked with direct evidence. A refreshed independent
  criteria/evidence review is recommended as a separate Owner choice; the verification parent remains open for it.
