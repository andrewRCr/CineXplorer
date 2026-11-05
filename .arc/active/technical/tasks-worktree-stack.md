# Task List: Browsable Stack per Worktree

**PRD:** `prd-worktree-stack.md`
**Created:** 2026-11-04
**Completed:** 2026-11-04
**Branch:** `technical/worktree-stack`
**Base Branch:** `main`
**Status:** Complete

## Overview

**Purpose:** Let each linked worktree serve the full app in a browser on its own port, beside the main checkout's
stack and every other worktree's, with one command each to create and prepare a worktree, start its browsable stack
and remove it after its branch merges.

## Scope

### Will Do

- `scripts/worktree.mjs` with `create` (and `--existing`, `--work-unit`), `provision`, `browse` and `remove` (and
  `--keep-branch`), `.worktreeinclude`, and the script's tests in CI (R1–R8, R13, R14)
- One Compose override for a worktree's test and browsable stacks, renamed from the test-stack file, with the main
  checkout's stack unchanged (R9, R10)
- `seed_dev_data`: a dev account, and the blacklist loaded from its tracked file (R11, R15)
- `seed-session-notes.mjs`, which writes a work unit's starting session notes, and its tests (R16, R17)
- The worktree, errand, activation, archive and session-start workflows, the personal workspace README, the quick
  reference, the export script's header, and the rule exception for the seeding script's path (R12)
- Proving it live on this machine beside the main checkout's stack

### Won't Do

- Google and GitHub sign-in in a worktree, and copying the main checkout's development data into one
- Staying signed in to several stacks in one browser profile
- An agent skill wrapping the script; a PRD, task list or session notes in a new worktree beyond `--work-unit`'s
- Changes to the main checkout's stack, ports, base Compose file, Caddyfiles or `settings.py`
- End-to-end test configuration that targets a worktree's port
- Deleting an unmerged branch, and removing a worktree another tool created and locked
- Guarding against two `provision` runs racing for a port, detecting a port another program holds, and rebuilding a
  worktree's frontend image after its dependencies change

---

## Tasks

### **Phase 1:** A work unit's worktree starts with its session notes

- [x] **1.1 `seed-session-notes.mjs` writes a work unit's starting notes** (R16, R17, R13; Criterion 1)

    - [x] **1.1.a Write tests:** ten isolated Git fixtures cover every refusal, preservation of existing notes,
      all skeleton fields, the printed path and the absence of notes in the main checkout. Each case failed on its
      assertion before implementation.
    - [x] **1.1.b Write the script:** built-in Node modules locate the main checkout and identity, validate the
      branch, and write planning notes exclusively in the linked worktree without overwriting an existing file.
      Syntax checks and all 30 seeding and recovery tests pass.
    - [x] **1.1.c Run the tests in CI:** the renamed session-hooks step runs both suites with `node --test`.

### **Phase 2:** One command creates and prepares a worktree, and its test stack runs

- [x] **2.1 `provision` writes the worktree's `infrastructure/.env` with its own port and key** (R1, R4 step 3,
  R5, R6, R13, R14; Criterion 1)

    - [x] **2.1.a Write the fixture and tests:** real bare origins, isolated Git configuration and linked worktrees,
      with faithful Docker/npm executable stubs. Eight tests cover help, main-checkout and name refusals, base env
      copying, preserved keys, random keys, lowest-free allocation, deleted folders and all 55 ports occupied.
      All eight failed before implementation.
    - [x] **2.1.b Write `scripts/worktree.mjs` with the environment step:** append missing keys without changing
      existing values, derive the project name from the folder, and allocate the lowest unclaimed port. Syntax
      checks and all eight tests pass.
    - [x] **2.1.c Run the tests in CI:** the session-hooks step includes `scripts/worktree.test.mjs`.

- [x] **2.2 `provision` copies include files, links shared folders, checks the project and installs the
  frontend** (R2, R4 steps 1, 2, 4 and 5, R14; Criterion 1)

    - [x] **2.2.a Write tests:** five fail-first cases cover ignored include files, existing copies and folders,
      shared links, project-name checking without configuration disclosure, install failure and repeated provisioning
      after an external tool copied the files.
    - [x] **2.2.b Add `.worktreeinclude` and the remaining steps:** copy, link, append env, check the resolved name,
      then `npm ci` and `npm run typegen`. Syntax checks and all 13 worktree tests pass.

- [x] **2.3 `create` cuts a branch into a provisioned worktree** (R3, R14; Criterion 1)

    - [x] **2.3.a Write tests:** 17 fail-first cases cover refusal boundaries, new branches from `origin/main`
      without an upstream, local and remote existing branches, checked-out and obsolete branches, setup recovery,
      optional seeding after provisioning and preservation of the provisioned checkout after seeding refuses.
    - [x] **2.3.b Implement `create`:** fetch, validate, add the worktree, provision it and optionally seed its
      starting notes. Failures print recovery commands; success prints the path, first push and browse command.
      Syntax checks and all 30 worktree tests pass.

- [x] **2.4 One override runs both stacks, and this worktree's test stack runs on it** (R9, R10;
  Criteria 3, 4 and 5)

    - [x] **2.4.a Rename and rewrite the override:** `docker-compose.worktree.yml` inherits the serving backend,
      certificates and health check. Required project, port and signing-key values isolate each stack. Browser mode
      adds frontend and Caddy with only a loopback Caddy port; every service has a memory limit.
    - [x] **2.4.b Provision this worktree and run its test stack:** provisioning kept the existing project name and
      added `SITE_PORT`, `WORKTREE_SECRET_KEY`, `cert.pem` and `key.pem`; frontend install and typegen passed.
      All 903 backend tests passed with the HTTPS server running, as the only backend test run on this machine.
      Backend peak 651.2 MiB, dev-db peak 103.9 MiB; backend limit 1024 MiB, dev-db 512 MiB and Redis 128 MiB.
      Samples and run output are in this worktree's personal `proofs/` folder; peaks are recorded in the override.
    - [x] **2.4.c Check configuration:** protected files have no diff against the merge base. Browser config lists
      all five services, only Caddy publishing `127.0.0.1:8445:8444`, and a memory limit on each. Frontend and Caddy
      limits remain provisional until 3.4 measures them.

- [x] **2.5 The workflows create worktrees with `create`, and the rules record the seeding path** (R12)
    - Provisioning now documents new/existing branches, optional starting notes, repeatable preparation, shared
      links, preserved files and keys, Docker and frontend-install requirements, and the serving test-stack override.
    - Errand workflow and skill use `create`; activation and the workspace README name `create --work-unit` as the
      source of starting notes. The in-place errand branch uses `--no-track`.
    - DEVELOPMENT-RULES and the root review guideline record the narrow seeding-path, flag and stand-in exception.
      Markdown lint passes for all seven documents after correcting new line wrapping.

### **Phase 3:** A worktree serves the app on its own port

- [x] **3.1 Merge `main` with the tracked blacklist** (R11's dependency)
    - The Owner explicitly approved the merge. Confirmed #75 merged, then merged `origin/main` at `031327a5`,
      bringing the tracked blacklist, `sync_blacklist`, focused Ruff rules, rule-specific suppressions and image pins.
    - Rebuilt and restarted this worktree's backend. All 419 movie tests pass. CI retains all three Node test files.
      The merge's default message was rejected by the commit-message hook; completed with the required format.

- [x] **3.2 `seed_dev_data` gives a fresh database an account and the blacklist** (R11, R15; Criterion 2)

    - [x] **3.2.a Write tests:** six real-database cases, all failing first, cover environment refusal with no
      writes, verified sign-in (and the unverified control), repeatability, an unchanged existing account,
      case-insensitive email conflicts and blacklist synchronization from the tracked file including repeat repair.
    - [x] **3.2.b Write the command:** development-only, conflict check before writes, configured user manager's
      `get_or_create`, password and verified address created atomically, then `sync_blacklist` with its summary.
      All 244 core tests pass; core Ruff passes, the new files are formatted and core Pyright reports zero errors,
      warnings or information. Corrected the new test's token-response field, wrapping and type annotations.

- [x] **3.3 `browse` starts the stack, migrates and seeds** (R7, R14; Criterion 1)

    - [x] **3.3.a Write tests:** six fail-first cases cover the main checkout, each missing environment key,
      ordered browser-profile startup/migrate/seed calls, the printed URL and sign-in, and stopping with command
      output when startup fails.
    - [x] **3.3.b Implement `browse`:** refuse unprovisioned checkouts, start all five services with `up -d --wait`,
      migrate and seed, then print the URL and dev sign-in. Syntax checks and all 36 worktree tests pass.

- [x] **3.4 This worktree's browsable stack serves its app, and limits are measured** (R7, R9; Criterion 4)
    - `browse` started all five services; `/` and `/api/health-check/` answered 200, as did the primary health
      endpoint. A second run applied no migrations, left the dev account unchanged (fingerprint comparison) and
      reported no blacklist changes.
    - The Owner browsed while memory sampling ran; 34 recent API responses were 200, and temporary CSS edits
      triggered hot reload and were restored byte for byte. Frontend peak 497.2 MiB, Caddy peak 33.76 MiB; final
      limits 1024 MiB and 128 MiB. The frontend's provisional 512 MiB cap was raised in place before further
      measurement; no OOM occurred. Peaks are recorded in the override and personal proofs.
    - Browser-profile config has five services, all measured limits and only Caddy's loopback port. Stopped with
      both files and the browser profile; all three project volumes remain.

- [x] **3.5 The workflows and references describe both stacks** (R12)
    - Worktree guidance covers browser startup and stopping, the port and conflicts, dev sign-in, cookie sharing,
      certificate prompts, OAuth on the primary and tests/schema export through either mode.
    - Session initialization and quick reference count five browser-mode containers, three test-mode containers
      or none; network notes and all five measured limits match the override. The schema export header covers both
      modes. Errand placement was already updated in 2.5.
    - Markdown lint, export-script syntax and focused ESLint pass; the script change is comment-only.

### **Phase 4:** One command removes a worktree with its stack

- [x] **4.1 `remove` tears down a merged worktree and keeps unmerged work** (R8, R14; Criterion 1)

    - [x] **4.1.a Write tests:** 13 fail-first cases cover every refusal, unchanged files and branch heads on
      refusal, teardown of all four labelled resource kinds in order (including stopped containers), removal with
      the primary on another branch, pruning, absent project/env and empty listings, and preserving an unmerged
      branch at its commit with `--keep-branch`.
    - [x] **4.1.b Implement `remove`:** fetch, check ancestry, lock, tracked/untracked work and project identity
      before teardown; stop/remove containers, then volumes/networks/images; remove the checkout; delete only a
      merged branch after setting its upstream to `origin/main`; prune. Syntax checks and all 49 worktree tests pass.

- [x] **4.2 The workflows remove worktrees with `remove`** (R12)
    - Worktree, archive and errand cleanup now use `remove`, including local branch deletion. Remote deletion and
      archival remain explicit caller steps; review or abandoned checkouts use `--keep-branch`, while paused work
      keeps its notes and worktree.
    - Markdown lint passes for all three documents. The old override name appears nowhere outside planning
      documents and the archive, as checked by the task's `git grep` command.

### **Phase 5:** Worktrees serve beside the main checkout, stay apart, and are removed

- [x] **5.1 Two worktrees made by `create` serve at their own ports** (Criterion 6)
    - Isolated sandbox `~/dev/scratch/worktree-stack-proof/` has this branch's `af6d7888` as its own `main`.
      `create chore/proof-a --work-unit` and `create chore/proof-b` provisioned and browsed successfully on 8445
      and 8446. Both `/` and `/api/health-check/` returned 200 at each port and at the primary's 8444.
    - Only `proof-a` has starting planning notes. Setup and command output are retained in personal proofs; the
      sandbox is removed after 5.4.

- [x] **5.2 A worktree's sign-in, data and tokens stay its own** (Criterion 7)
    - The Owner signed in as `dev`, added a movie to the watchlist and confirmed it remained after reload.
      Proof-a has one movie and one watchlist row; its backend logged sign-in, creation and six watchlist reads.
      The primary's user/movie/user-movie counts stayed `1,0,0` before and after.
    - The same proof-a-issued refresh cookie was refused on the primary with 400, the expected
      "Invalid or expired refresh token" error and no token fields, then accepted on proof-a with 200 and a rotated
      cookie. Requests carried CSRF cookies/headers and the target origin. Summary retained in personal proofs,
      without token values.

- [x] **5.3 Hot reload works at a worktree's port** (Criterion 8)
    - Temporarily changed proof-a's navbar title. The Owner requested a repeat, then confirmed
      "CineXplorer 2" appeared without a manual refresh. Vite logged the component update.
    - Restored the saved original bytes; SHA-256 matches and proof-a's Git status is clean. Evidence retained in
      personal proofs.

- [x] **5.4 `remove` cleans up a merged worktree and keeps unmerged work** (Criterion 9)
    - Each throwaway started with five containers, three volumes, one network and two built images. Merged
      `proof-b` removal left no labelled resources, checkout, registration or local branch; proof-a and the primary
      retained identical resource IDs and running/health states and answered healthy.
    - An empty proof-a commit made it unmerged. Ordinary removal refused with the ancestry reason and preserved
      its commit, clean status, registration, resource IDs and running/health states; its health URL still answered
      200. `--keep-branch` then removed every labelled resource, checkout and registration while preserving branch
      commit `6d189c81`; `cat-file` resolved that commit before intentional sandbox deletion.
    - Deleted only `~/dev/scratch/worktree-stack-proof/` after the proof. Primary resource IDs and running/health
      states stayed unchanged through both removals; its health endpoint remains 200. Detailed summaries and logs
      are retained in personal proofs.
    - Before cleanup, the independently updated primary (#82) needed `python-json-logger`, absent from its old
      image. A canonical rebuild was cancelled after very slow Alpine downloads. Restored it with a local image
      layer adding only the pinned 4.2.0 wheel: import and dependency checks passed under the original user; image
      user, entrypoint, command, working directory and labels were preserved. No tracked primary files changed.
      A rollback image tag and the repair recipe/metadata are retained; this does not prove the canonical rebuild.

### **Phase 6:** Verification

- [x] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)
    - Full local run and author criteria walk passed. Independent verification Pass 1 found no implementation
      defect, with its raw-record limitation for the earlier browser reload confirmation recorded in the Review Log.
      The Owner-requested manual CI run 41930723137 passed on the exact reviewed head, including `ci-ok`, closing
      criterion 1. All nine criteria are met; their evidence is recorded below.

## Implementation Notes

### Integration with `main`

- `technical/launch-readiness` also changes infrastructure and CI. Whichever work unit merges second merges `main`
  first. Its move of session-hook tests to `docs.yml` must retain the recovery, notes-seeding and worktree suites.
- The worktree override supplies its own origin for CSRF. HTTPS requests made with `curl` carry the `csrftoken`
  cookie, its value in `X-CSRFToken`, and the target `Origin`; Django rejects an HTTPS request without an origin or
  referer before reading the token. The applicable check depends on the code each stack runs.
- The installed errand harness is refreshed from the main checkout after merge with
  `node .arc/reference/harness-hooks/install-errand-harness.mjs`.

### Verification commands

- `scripts/` and `.arc/reference/harness-hooks/` have no lint configuration. Their checks use `node --check` and
  `node --test`.
- Backend test runs are serialized across the machine's stacks. Memory measurements sampled
  `docker stats --no-stream --format '{{.Name}} {{.MemUsage}}'` about once a second and retained each container's peak.

### Provisioning and Compose behavior

- **Faithful stubs:** real `docker compose config` prints `name:` then `services:`, with env values inlined. The
  test stub has that shape and proves its secret marker never reaches output. Label listings return IDs so tests
  exercise teardown ordering.
- **Fixture speed:** the full-range allocation case registers 55 worktrees with `git worktree add --no-checkout`
  and writes only their `infrastructure/.env` files.
- **Existing remote branches:** `git worktree add {path} {branch}` creates a local branch tracking
  `origin/{branch}` when only that remote branch exists, which suits a review checkout.
- **Ignored links:** `.gitignore` names `.venv-backend`, `.claude` and `.codex` without a trailing slash, matching
  links as well as folders.
- **Compose merging:** `!reset []` empties inherited port lists; Caddy uses `!override` to replace the base binding.
  Environment lists merge by key, so the override replaces the base file's values and those from `env_file`.
- **Environment precedence:** Vite prioritizes existing `VITE_*` variables, and the frontend URL configuration reads
  both. Django's `read_env` leaves existing environment variables in place, preserving the worktree's key and origins.
- **Rules header:** its history mixes unchanged headers and version increments. The recent pattern refreshed
  `Hash` and `Updated` for changes while raising `Version` only on the first change of a day; the work followed that
  pattern without another version increment.

### Development sign-in

- `POST /api/token/` accepts `login` (username or email) and `password`; its `5/m` throttle applies only when a
  test enables throttling. The core test helper supplies the verified allauth `EmailAddress` pattern.

### Safe removal

- `git branch -d` checks a branch's upstream when it has one, otherwise `HEAD`. Setting the upstream to
  `origin/main` permits merged-branch deletion while the primary has another branch checked out.
- A label-filtered listing prints nothing when no resource matches; removal skips that resource kind.

### Live proof setup

- Before merge, `create` cannot provision a throwaway from the real `origin/main`, which lacks this change. The
  live proof used this branch as a sandbox origin's `main`, with copied ignored env files and certificates, an
  identity folder for notes seeding, and links to shared tools. The sandbox ran the unchanged script.
- Port allocation sees only its repository's registered worktrees, so the parent worktree's stack was stopped
  during sandbox proofs to avoid reusing a live port. The throwaway resources and sandbox were removed afterward.

## Success Criteria

### Implemented (checkable locally and in CI)

- [x] 1. `node --test scripts/worktree.test.mjs` and
  `node --test .arc/reference/harness-hooks/seed-session-notes.test.mjs` pass, in CI as well, covering R14's and
  R17's cases. They fail when allocation returns a port another worktree claims, when `provision` changes an existing
  key, when seeding overwrites existing notes, or when `remove` makes a Docker call or changes anything for an
  unmerged branch without `--keep-branch`, a worktree with uncommitted changes, a locked worktree, or a project name
  other than `cinexplorer-{name}`, or makes a Docker call when the worktree's `infrastructure/.env` names no project.

  Evidence: Local Node suites pass all 79 tests, and eight isolated safety mutations are caught by assertions. The
  same suites passed in hosted CI run 41930723137 on f6f853e0, whose Docs job and all other jobs, including ci-ok,
  succeeded. The workflow runs both new suites alongside recovery tests.

- [x] 2. The backend tests for `seed_dev_data` pass, covering R15's cases.

  Evidence: The full Docker backend run passes all 957 tests, including the six real-database seeding cases for
  refusal, verified sign-in, repeatability, preserved accounts, email conflicts and blacklist repair.
- [x] 3. `docker compose -f infrastructure/docker-compose.yml config` in the main checkout gives the same published
  ports as before this change: 8444, 8000, 5173, 5432 and 6379.

  Evidence: Sanitized primary Compose output confirms published ports 8444, 8000, 5173, 5432 and 6379. The protected
  base Compose, Caddyfiles and settings have no branch diff.
- [x] 4. In a provisioned worktree, `config` with both files and `--profile browser` lists all five services and shows
  `caddy` as the only one with a published port, bound to `127.0.0.1:{SITE_PORT}`, and a memory limit on every
  service.

  Evidence: Current browser-profile Compose output has five services, only Caddy publishing 127.0.0.1:8445:8444, and
  limits of 1024/512/128/1024/128 MiB for backend/database/Redis/frontend/Caddy.
- [x] 5. In a worktree set up by hand before this change, `provision` keeps its `COMPOSE_PROJECT_NAME` and adds the
  missing keys and certificates, and its test stack (`up -d dev-db redis backend`) then runs `pytest apps/` to a
  pass.

  Evidence: The original manual-worktree preparation preserved its project and added the port, key and certificates;
  its first full run passed 903 tests. This same checkout now starts the serving test stack healthy and passes all
  957 backend tests. Preservation and external-tool preparation assertions pass again.

### Proven live (on this machine, with the main checkout's stack running)

- [x] 6. Two throwaway worktrees made by `create`, one of them with `--work-unit`, and started by `browse` each answer
  `200` on `/` and `/api/health-check/` at their own ports, while `https://localhost:8444` still does. The one made
  with `--work-unit` holds starting session notes at `.arc/user/{identity}/{name}/SESSION-NOTES.md`, and the other
  holds none.

  Evidence: Repeated at the exact reviewed head in a disposable sandbox. startup-recheck.json records successful
  create/browse commands, HTTP 200 for / and /api/health-check/ on 8445, 8446 and the primary's 8444, planning notes
  only for --work-unit, and cleanup. startup-cleanup.json confirms no labelled resources remain.

- [x] 7. In the maintainer's browser, at a worktree's port: signing in as the dev account succeeds, a movie added to
  the watchlist is still there after a reload, the worktree's backend log shows the requests, and the main checkout's
  database has no new rows for them. With a refresh cookie that worktree's stack issued to the dev account
  (`POST /api/token/`), `POST /api/auth/refresh` to that worktree's stack returns new tokens, and the same request to
  `https://localhost:8444` is refused with 400 and the error "Invalid or expired refresh token", the signature
  failure, and returns no tokens. (A validly signed token whose user is missing on that stack also gets 400, with a
  different error, so the error text is what shows the key differs.)

  Evidence: Owner-confirmed sign-in and watchlist persistence are supported by watchlist-isolation.json: primary
  counts stay 1,0,0 and the worktree logs sign-in, creation and reads. token-isolation.json records the same cookie
  accepted there and rejected on the primary with 400, the signature error and no tokens.
- [x] 8. Editing a frontend source file in a worktree updates the page at its port without a manual reload.

  Evidence: visible-hot-reload.json retains the Owner confirmation that the changed navbar appeared without a manual
  refresh; the source was restored byte for byte and Git status was clean.
- [x] 9. `remove` on a merged throwaway worktree whose stack ran leaves no containers, volumes, networks or images
  labelled with its project, no folder and no local branch. On an unmerged one it refuses and leaves all of them in
  place; with `--keep-branch` it removes the folder and stack and keeps the branch at its commit.

  Evidence: live-removal.json records merged removal with no labelled resources, folder, registration or branch;
  unmerged refusal with identical resources and commit; and --keep-branch removal preserving that commit. Neighbor
  resource IDs, running/health states and HTTP health were preserved.

## Review Log

### 2026-11-04 · PRD · Pass 1

- **Rubric:** assess-design-proportionality, design-audit, spec-review (detailed), over `prd-worktree-stack.md` and
  the brief; runner a fresh read-only Claude subagent. Kept: `adversarial-review/prd-pass1.md`, `prompt-pass1.md`,
  `report-pass1.md`.
- **Verified:** 3 major, 5 minor, 1 not supported.
- **Approved dispositions (Owner):**
    - F1 major: `remove` refuses a locked worktree before any Docker call; Decision 2 says a later tool replaces
      `create` and `remove`; non-goal for tool-locked worktrees. FIX (new design)
    - F2 major: `remove --keep-branch` for unmerged worktrees; deleting an unmerged branch stays manual. FIX (new
      design)
    - F3 major: R12 adds run-errand § 1 (`create`; in-place `--no-track`), QUICK-REFERENCE 215 and 268, the export
      script's header; strategy-work-organization's example left as written. FIX (local correction)
    - F4 minor: grounding residue (certificate mounts, CSRF/CORS wording and actor, R11 import reason, backend limit
      re-measured). FIX (local correction)
    - F5 minor: partial blacklist fill accepted and documented. FIX (local correction)
    - F6 minor: tests for `remove`'s project-name refusal and no-project skip. FIX (local correction)
    - F7 minor: Decision 8's reason corrected. FIX (local correction)
    - F8 minor: Criterion 4 names `--profile browser`; R4 step 4 names the expected project. FIX (local correction)
    - F9: Caddy anonymous volumes. REJECT (not supported: the images declare no volumes)
- **Stop reason:** not converged (approved fixes of major findings); fix check approved.
- **Elapsed:** about 16 minutes.

### 2026-11-04 · PRD · Fix check, round 1 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure, over `prd-pass1.md` →
  `prd-pass1-round1.md`; runner a fresh read-only Claude subagent (it also read `report-pass1.md`, not used as
  evidence). Kept: `prompt-pass1-round1.md`, `report-pass1-round1.md`.
- **Verified:** 1 major, 4 minor. Folds 1, 2, 5, 6, 7, 8 closed; 4 partly; 3 closed with a new failure.
- **Approved dispositions (Owner):**
    - F1 major: `--keep-branch` no longer offered for paused work; removal named as deleting the worktree's
      gitignored files, session notes and review records among them; "nothing lost" narrowed. FIX (local correction)
    - F2 minor: R12 rewrites run-errand § Where It Runs, worktree-sessions § Same-Session Errands and the errand
      skill: errand worktrees are set up by `create`. FIX (local correction)
    - F3 minor: Goal 3 and the user story match R8's refusal and flag. FIX (local correction)
    - F4 minor: Criterion 1 adds the no-project skip. FIX (local correction)
    - F5 minor: R12 adds QUICK-REFERENCE's Docker Assumptions count. FIX (local correction)
- **Also landing (Owner-approved scope addition, 2026-11-04):** `create --work-unit` seeds the session notes through
  a script under `.arc/reference/harness-hooks/`; R12 carries the activation change's two provisioning points.
- **Elapsed:** about 11 minutes.

### 2026-11-04 · PRD · Pass 2

- **Rubric:** assess-design-proportionality, design-audit, spec-review (detailed), over `prd-pass2.md`, the brief and
  the merged activation change's diff. Runner: **separation-failure** (self-labelled): the prompt's prior findings
  carried pass 1's REJECT reason. Not counted as independent; its findings were source-verified and used as
  evidence. Kept: `prompt-pass2.md`, `report-pass2.md`.
- **Note on the round-1 fix check:** its prompt also carried a one-line reason (why the work-organization strategy's
  example was left as written), though that runner labelled itself independent. Not rerun (Owner): Pass 3
  re-reviews its folds.
- **Verified:** 1 major, 3 minor.
- **Approved dispositions (Owner):**
    - F1 major: Criterion 7 gains a distinguishing refresh check (worktree control, 8444 refused); § 1's sign-in
      bullet describes the refresh-cookie path. FIX (local correction)
    - F2 minor: the `--work-unit` test uses a stand-in seeding script; notes content tested by R17; Decision 16's
      exception names the test's stand-in path and the help text. FIX (local correction)
    - F3 minor: `create` runs its own `provision`; `--existing` refuses a branch without the override; a failed setup
      prints its recovery. FIX (local correction)
    - F4 minor: R12 adds run-errand's in-place condition and session-init § 5's worktree stacks. FIX (local
      correction)
- **Stop reason:** not converged; Pass 3 approved, with a clean prompt (no disposition reasons).
- **Elapsed:** about 23 minutes.

### 2026-11-04 · PRD · Pass 3

- **Rubric:** assess-design-proportionality, design-audit, spec-review (detailed), over `prd-pass3.md`, the brief and
  the merged activation change's diff. Runner: independent (clean prompt; no session files loaded). Kept:
  `prompt-pass3.md`, `report-pass3.md`.
- **Verified:** 3 minor.
- **Approved dispositions (Owner):**
    - F1 minor: Criterion 7 requires the invalid-token refusal ("Invalid or expired refresh token"). FIX (local
      correction)
    - F2 minor: Decision 5 names `environ.Env.read_env`'s non-overwriting default. FIX (local correction)
    - F3 minor: R12 records Decision 16's exception in DEVELOPMENT-RULES § Code Documentation Standards and the root
      AGENTS.md review guideline. FIX (local correction)
- **Follow-up (Owner):** pre-commit CHECK 8 not scanning `.mjs` captured in the inbox as an errand.
- **Stop reason:** converged (confirmed minors only); fix check declined by the Owner, the fixes being wording.
- **Elapsed:** about 22 minutes.

### 2026-11-04 · Task list · Pass 1

- **Rubric:** task-audit at full depth (its source-grounding floor), grounding and executability, and the task-list
  process rules, over `tasks-worktree-stack.md` and `prd-worktree-stack.md` with its amendments; runner a fresh
  read-only Claude subagent, independent (under `.arc/user/` it opened only its prompt and `.arc/user/README.md`; one
  `grep -l` listed file names in the review folder without opening them). Kept: `tasks-pass1.md`,
  `prd-tasks-pass1.md`, `prompt-tasks-pass1.md`, `report-tasks-pass1.md`.
- **Verified:** 3 major, 10 minor.
- **Approved dispositions (Owner):**
    - F1 major: R10's unchanged-files check diffs against the merge base, not `origin/main`. FIX (local correction)
    - F2 major: the `docker` stub answers `config` with a `services:` block holding a marker the test proves never
      printed, and label listings with test-supplied IDs, so `remove`'s teardown order is asserted. FIX (local
      correction)
    - F3 major: the CSRF note for 5.2's `curl` adds `Origin` and keys on the code each stack runs. FIX (local
      correction)
    - F4 minor: the old override name check moves to 4.2, excluding the planning documents. FIX (local correction)
    - F5 minor: `main`'s #76, #77 and #79 named; the backend image rebuilt after 3.1's merge; `S106` suppressed inline
      for the dev password. FIX (local correction)
    - F6 minor: launch-readiness moves the hook-test step into `docs.yml`. FIX (local correction)
    - F7 minor: activation, the workspace README, the Links bullet and § What Runs Where join the documentation
      tasks, completing R12. FIX (local correction)
    - F8 minor: the measurement cross-reference corrected; `dev-db` keeps R9's 512 MiB, its peak recorded. FIX (local
      correction)
    - F9 minor: every refusal test asserts its reason. FIX (local correction)
    - F10 minor: the rules-header note states the file's history. FIX (local correction)
    - F11 minor: Phase 3 names the Owner at the browser. FIX (local correction)
    - F12 minor: the three exit-status answers named; a seeding failure exits non-zero. FIX (local correction)
    - F13 minor: the override rename and this worktree's provisioning move to the end of Phase 2 (2.4). FIX (local
      correction)
- **Stop reason:** not converged (approved fixes of major findings); fix check approved.
- **Elapsed:** about 23 minutes.

### 2026-11-04 · Task list · Fix check, round 1 since pass 1

- **Rubric:** closure, behavioral grounding, propagation and completeness, new failure, over `tasks-pass1.md` →
  `tasks-pass1-round1.md` and their diff; runner a fresh read-only Claude subagent, independent. Kept:
  `prompt-tasks-pass1-round1.md`, `report-tasks-pass1-round1.md`.
- **Verified:** 7 minor. Folds 1, 2, 3, 6, 11, 12 and 13 closed; 5 and 10 closed with grounding residue; 4, 7, 8 and
  9 left sites unswept or a residual contradiction; one gap beside fold 2 predates the pass.
- **Approved dispositions (Owner):**
    - F1 minor: the rules-header note says the history is mixed and names the recent pattern. FIX (local correction)
    - F2 minor: 3.2.b suppresses only the rule Ruff reports for the form written (`S105` or `S106`); an unneeded
      `noqa` fails `RUF100`. FIX (local correction)
    - F3 minor: 2.5 also rewrites `activate-work-unit.md` § Where It Runs. FIX (local correction)
    - F4 minor: 2.5 updates § Test Stack as a whole (name, serving backend, required keys). FIX (local correction)
    - F5 minor: 3.3.a's `up`-failure case asserts the `up` call and its failure output. FIX (local correction)
    - F6 minor: 2.4.a keeps `dev-db` and `redis` at R9's values; only the backend waits for 2.4.b. FIX (local
      correction)
    - F7 minor: `remove`'s container listing includes stopped containers (`-a`), asserted in 4.1.a. FIX (local
      correction)
- **Stop reason:** converged (confirmed minors only); a further fix check declined by the Owner, the fixes being
  local and source-verified.
- **Elapsed:** about 12 minutes.

### 2026-11-04 · Verification · Author criteria walk

- **Scope:** complete branch diff from `031327a5` to `f6f853e0`, with the resulting tree; no implementation edits.
- **Rubric:** the nine Success Criteria and their governing requirements. Criteria 2–9 have local or retained live
  evidence above. Criterion 1 has local execution and CI wiring, but stays open because the exact head has no
  hosted CI execution yet.
- **Gates:** backend 957 passed; frontend 810 passed; Node worktree/notes/recovery suites 79 passed; Ruff and
  backend format pass; frontend ESLint and TypeScript pass; Pyright has zero errors and warnings (38 information
  diagnostics); Markdown lint has zero issues. All changed JavaScript files pass syntax checks.
- **Safety-test sensitivity:** eight mutations in isolated copies are caught by assertions, including the dirty
  worktree mutation checked against both modified tracked and untracked files. Tracked source is untouched.
- **Evidence:** detailed run logs, sanitized Compose summary and mutation results remain in the worktree's
  personal verification proofs. Live proof records are checked against the unchanged implementation at this head.
- **Independent companion:** Pass 1 completed below. Task 6.1 stays open for criterion 1's hosted execution. No
  code-review pass has run; that is the later, separate completion stage.

### 2026-11-04 · Verification · Pass 1

- **Runner:** fresh read-only Codex subagent `/root/verification_pass1`; rubric: all nine Success Criteria against
  the PRD, complete `031327a5...f6f853e0` diff and resulting tree. The reviewer received neutral snapshots with
  task markings removed, not the author criteria walk. Exact prompt, neutral supplements and report are retained
  in the personal review folder.
- **Findings:** zero implementation findings; no finding-driven changes or dispositions. This is a limited
  verification result, not an all-criteria clean result.
- **Evidence limits:** criterion 1 has no actual hosted CI run at the reviewed head (GitHub returned zero runs).
  Criterion 7's raw JSON does not explicitly record the browser reload observation. The primary retains criterion 7
  as met from the explicit Owner confirmation recorded in Task 5.2, supported by the logged watchlist reads and
  unchanged primary counts; the independent raw-record limitation remains visible here.
- **Additional observation:** repeated criterion 6 without source changes in a disposable sandbox. Both new stacks
  and the primary returned 200 at both required URLs; only the worktree created with `--work-unit` had planning
  notes. The reviewer read the raw results before returning. Both worktrees, their labelled Docker resources and
  the sandbox were removed; the primary stayed healthy.
- **Outcome:** criteria 2–9 met; criterion 1 remains open for hosted CI. Task 6.1 and both status headers remain
  incomplete. Stop for the Owner to choose how to sequence that proof before continuing completion preparation.
- **Elapsed:** 8.3 minutes from retained prompt to report, including the extra live observation.

### 2026-11-04 · Verification · Hosted CI closure

- **Owner direction:** run hosted CI before completion preparation or a pull request. Pushed the already reviewed
  `f6f853e0` commit and manually dispatched the existing workflow on `technical/worktree-stack`; no new commit or
  workflow change was needed. The manual workflow published the production images under commit tags.
- **Evidence:** [CI run 41930723137](https://github.com/andrewRCr/CineXplorer/actions/runs/41930723137) completed
  successfully on `f6f853e0f52a0af6d2f1330ef2ca8b77bb94da8d`. Backend, Backend checks, Frontend, Docs, API types,
  Images and `ci-ok` all succeeded. The exact target, original deadline and job results are retained in personal
  verification proofs.
- **Result:** criterion 1 is now met, all nine criteria are marked, Task 6.1 is complete, and the task-list and PRD
  status headers are Complete. The independent pass's earlier raw-record limit for the Owner's browser reload
  observation remains recorded; no implementation changes were made to obtain this CI evidence.
- **Next:** completion preparation starts at `archive-completed.md` § 1b. Code review remains the later, separate
  stage. Local verification documentation changes remain uncommitted.

### 2026-11-04 · Code review · Author check

- **Scope:** the complete 24-file change from `031327a5` through `21b62eef`, including completion documentation.
  This is the author preflight, separate from the earlier independent criteria verification.
- **Rubric:** scope, cross-task consistency, cleanup, documentation drift, unresolved markers, correctness and
  explicit error paths. Inspected the command/refusal boundaries, Compose configuration, tests, guidance and
  resulting source dependencies together.
- **Result:** no actionable findings. No implementation changes were made. The completion-document commit's hooks
  passed; the full local and hosted checks remain recorded against their actual subjects in the verification log.
- **Review route:** the local fresh-context pass was not launched. After the Owner raised the hosted option,
  prepared PR-based CodeRabbit review under `archive-completed.md` § 6, with the request held until the final
  published head passes CI and publication/request approval is given. The author preflight supplies no independent
  review evidence.
