# Task List: Browsable Stack per Worktree

**PRD:** `prd-worktree-stack.md`
**Created:** 2026-11-04
**Branch:** `technical/worktree-stack`
**Base Branch:** `main`
**Status:** In Progress

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

**Needs:** nothing for 2.1–2.3, whose tests replace Docker and npm; Docker and this worktree's test stack for 2.4.

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

**Needs:** Docker and this worktree's own stack, and the Owner at the browser for 3.4. The main checkout's stack may
run beside it.

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

- [ ] **3.5 The workflows and references describe both stacks** (R12)
    - `worktree-sessions.md`:
        - A new section on the browsable stack: `browse`, the stop command, the port in `infrastructure/.env` and
          changing it when another program holds it, and the dev account. One signed-in stack per browser profile,
          since cookies on `localhost` are shared across ports; a second profile or a private window keeps a second
          stack signed in. Google and GitHub sign-in work only on the main checkout. A browser that has not trusted
          the dev certificate asks again for each new port
        - § When to Use One and the main checkout's role list what still needs the main checkout: OAuth sign-in and
          its development data
        - § What Runs Where: backend tests and API types run through the worktree's own stack, in either mode
    - `run-errand.md` § Where It Runs runs an errand in place on the main checkout only when it needs OAuth sign-in
      or the main checkout's development data
    - `session-init.md` § 5: in a worktree, start the test stack or `browse`, whichever the next action needs, and
      expect five containers while the browsable stack runs, three while the test stack runs, none otherwise
    - `QUICK-REFERENCE.md`: the expected containers, the network notes and the Docker Assumptions checklist count as
      `session-init.md` does; the type-generation note and the list of a worktree's memory limits cover both modes
      and all five limits
    - The header comment of `frontend/scripts/export-openapi.js` describes a worktree's stack in either mode

### **Phase 4:** One command removes a worktree with its stack

- [ ] **4.1 `remove` tears down a merged worktree and keeps unmerged work** (R8, R14; Criterion 1)

    - [ ] **4.1.a Write tests** in `scripts/worktree.test.mjs`
        - Refusals, each before any Docker call, changing nothing, with its reason asserted: run from a linked
          worktree; a name that is not a registered worktree, or one with a detached HEAD; an unmerged branch;
          uncommitted changes to a tracked file; an untracked file the ignore rules don't cover; a locked worktree
          (`git worktree lock`); an `infrastructure/.env` naming a project other than `cinexplorer-{name}`
        - A merged, clean worktree whose file names `cinexplorer-{name}`, with the main checkout on another branch,
          and the `docker` stub answering each kind's listing with IDs: every listing filters by the label
          `com.docker.compose.project=cinexplorer-{name}`, and the container listing includes stopped containers
          (`-a`); the listed containers are stopped and removed before any
          volume, network or image is removed, and each removal names the listed IDs; the folder is gone and
          unregistered, the branch deleted, and `git fetch --prune` ran
        - A merged worktree whose file names no project: no Docker call; removed, and its branch deleted
        - `--keep-branch` on an unmerged worktree: its stack torn down and the worktree removed; the branch kept at
          its commit
        - Expect tests to FAIL initially

    - [ ] **4.1.b Implement `remove`**
        - R8's steps in order, every refusal before anything is deleted: after `git fetch origin`,
          `git merge-base --is-ancestor {branch} origin/main` (skipped for `--keep-branch`); the `locked` line from
          `git worktree list --porcelain`; `git status --porcelain` in the worktree; the project name
        - Teardown: for containers, volumes, networks and images, list IDs with `--filter label=...` and `-q`, and
          remove what is found; containers are stopped, then removed, before the other kinds. The container listing
          takes `-a`: a stack stopped by `docker compose stop` or a Docker restart leaves exited containers, which
          would hold its volumes and images
        - `git worktree remove {primary}.{name}`; unless `--keep-branch`,
          `git branch --set-upstream-to=origin/main {branch}` and `git branch -d {branch}`; then `git fetch --prune`
        - Tests should now PASS

- [ ] **4.2 The workflows remove worktrees with `remove`** (R12)
    - `worktree-sessions.md` § Removal gives `remove`, and `remove --keep-branch` for a review checkout or abandoned
      work. It says removal deletes the worktree's gitignored files, a work unit's session notes and review records
      among them, so paused work keeps its worktree
    - `archive-completed.md` § 9 and `run-errand.md` § 6 give `remove` and say it deletes the local branch, keeping
      their remote-deletion and archival steps; `run-errand.md` § 6 gives `--keep-branch` for an abandoned errand
    - Check: `git grep -n docker-compose.test-stack.yml -- ':!.arc/reference/archive' ':!.arc/backlog' ':!.arc/active'`
      finds nothing (the planning documents and the archive name the old file on purpose)

### **Phase 5:** Worktrees serve beside the main checkout, stay apart, and are removed

**Needs:** the main checkout's stack running on 8444, and the Owner at the browser for 5.2 and 5.3. The throwaway
worktrees are made in a sandbox clone (Phase 5 note), never pushed, and removed by 5.4.

- [ ] **5.1 Two worktrees made by `create` serve at their own ports** (Criterion 6)
    - From the sandbox's main checkout: `create chore/proof-a --work-unit` and `create chore/proof-b`, then `browse`
      in each
    - `/` and `/api/health-check/` answer `200` at each worktree's port, and at `https://localhost:8444`
    - `proof-a` holds `.arc/user/{identity}/proof-a/SESSION-NOTES.md`; `proof-b` holds no session notes

- [ ] **5.2 A worktree's sign-in, data and tokens stay its own** (Criterion 7)
    - In the Owner's browser at `proof-a`'s port: sign in as the dev account, add a movie to the watchlist, reload,
      and it is still there; `proof-a`'s backend log shows the requests; the main checkout's database has no new
      rows for them (row counts before and after)
    - With a refresh cookie `proof-a`'s stack issued to the dev account (`POST /api/token/`),
      `POST /api/auth/refresh` to `proof-a` returns new tokens, and the same request to `https://localhost:8444`
      answers `400` with "Invalid or expired refresh token" and no tokens. Where a stack runs the stricter CSRF
      check, the request carries what the Sequencing note lists; a `403` is that check, not the signature failure

- [ ] **5.3 Hot reload works at a worktree's port** (Criterion 8)
    - Edit a frontend source file in `proof-a`; the page at its port updates without a manual reload; revert the edit

- [ ] **5.4 `remove` cleans up a merged worktree and keeps an unmerged one** (Criterion 9)
    - `proof-b` has no commits of its own, so its branch is merged: `remove proof-b` leaves no containers, volumes,
      networks or images labelled `com.docker.compose.project=cinexplorer-proof-b`, no folder and no local branch
    - Commit once in `proof-a`: `remove proof-a` refuses and leaves its folder, branch and stack in place; then
      `remove proof-a --keep-branch` removes the folder and stack and keeps the branch at that commit
    - Delete the sandbox afterwards (Phase 5 note)

### **Phase 6:** Verification

- [ ] **6.1 Verify the work** (load `archive-completed.md` § 1: criteria validation and verification review)

## Implementation Notes

### Sequencing with `main`

- `origin/main` has moved since the PRD: #76 (focused Ruff rules; `S105` and `S106` allowed only in tests), #77
  (rule-specific type-check suppressions, and Pyright run with `--warnings` in CI) and #79 (Dependabot for npm and
  Docker, with the base images pinned by digest). Phases 1, 2 and 4 add no backend code; 3.1 merges `main` before
  any, and needs #75 (the tracked blacklist and `sync_blacklist`) merged first
- `technical/launch-readiness` also changes `infrastructure/` and CI: whichever of the two merges second merges `main`
  first. It moves the "Test recovery hooks" step from `ci.yml`'s `markdown` job into a new
  `.github/workflows/docs.yml`; whichever merges second keeps this change's `node --test` files in that step
- That branch's CSRF change puts Django's check on every unsafe request. Requests through a worktree's Caddy are
  same-origin, and the override names the worktree's origin in `CSRF_TRUSTED_ORIGINS`, so a browser's requests pass.
  For `curl` (5.2), what counts is whether the change is in the code a given stack runs: a sandbox worktree runs this
  branch, which has it once a merge of `main` brings it in; the main checkout runs whatever branch it has checked
  out. Against such a stack, take the `csrftoken` cookie from `GET /api/csrf/`, send its value as `X-CSRFToken`,
  and send `Origin: https://localhost:{port}`: on HTTPS, Django refuses a request with neither `Origin` nor
  `Referer` before it reads the token
- R12's Provisioning edits build on #69 (activation in a work unit's own worktree), already merged here (`cc4560d2`)
- The inbox errand that adds `.mjs` to the pre-commit check of process references: if it lands first, it skips the
  seeding script's recorded path

### Running things here

- Before any frontend check, run `npm ci` and `npm run typegen` in `frontend/`: this checkout's `node_modules` predates
  `main`'s dependency changes. No Compose volumes exist for `cinexplorer-worktree-stack`, so its first test stack
  starts on a fresh database
- `scripts/` and `.arc/reference/harness-hooks/` have no lint configuration: check their files with `node --check`
  and their tests (`node --test`)
- **One backend test run at a time** across every stack on the machine, the main checkout's included
- Memory peaks: sample `docker stats --no-stream --format '{{.Name}} {{.MemUsage}}'` about once a second through the
  measured activity and keep the highest value per container

### Phase 2

- **Stubs stay faithful:** real `docker compose config` prints `name:` then `services:` with the env files' values
  inlined, so the stub answers the same shape and the test proves the marker never reaches the output. Real label
  listings return IDs; an empty answer would make the teardown order untestable
- **Fixture speed:** the full-range allocation case needs 55 registered worktrees; `git worktree add --no-checkout`
  keeps that quick, with only `infrastructure/.env` written in each
- **`--existing` on an `origin`-only branch:** `git worktree add {path} {branch}` creates a local branch tracking
  `origin/{branch}`, which suits a branch checked out for review
- **The links stay ignored:** `.gitignore` names `.venv-backend`, `.claude` and `.codex` without a trailing slash,
  which matches a link as well as a folder
- **Compose merging:** an override's `ports` list adds to the base file's. `!reset []` empties it; `caddy` needs
  `!override` so the base file's `8444:8444` does not stay beside the loopback binding. `environment` lists merge by
  key, so the override's values replace the base file's and the `env_file`'s
- **Precedence:** Vite gives `VITE_*` variables already in the environment priority over its `.env` files, and
  `frontend/src/config/baseUrls.ts` reads both; `settings.py` reads `backend/config/.env` with `read_env`, which
  leaves variables already set
- **DEVELOPMENT-RULES' header:** no document states when it changes, and its history is mixed: some changes left it
  alone, and 2026-10-30 raised `Version` twice. Its last three changes (2026-11-03 and 2026-11-04) follow one
  pattern: a new `Hash` and `Updated` date each time, with `Version` raised by the first change of a day. Follow that
- **After the merge:** refresh the installed errand skill from the main checkout with
  `node .arc/reference/harness-hooks/install-errand-harness.mjs`

### Phase 3

- **Sign-in in tests:** `POST /api/token/` takes `login` (username or email) and `password`; its `5/m` throttle applies
  only when a test enables throttling. `create_user` in `apps/core/tests/test_helpers.py` shows the verified
  `EmailAddress` pattern

### Phase 4

- `git branch -d` checks the branch is merged into its upstream when it has one, otherwise into `HEAD`. Setting the
  upstream to `origin/main` first lets a merged branch delete while the main checkout has another branch checked out
- A list command with `--filter label=...` and `-q` prints nothing when no resource matches; skip that kind

### Phase 5

- **Why a sandbox:** `create` cuts branches from `origin/main`, which gains `.worktreeinclude` and the override only
  when this change merges, so before the merge a throwaway made from it cannot be provisioned or browsed. The sandbox
  makes this branch the `main` that `create` sees, and runs the same script:
    - a bare repository in `~/dev/scratch/worktree-stack-proof/` (its own folder: nothing else under
      `~/dev/scratch/` is touched) holding this branch's head as `main`, and a clone of it there as the
      sandbox's main checkout, with the main checkout's gitignored env files and certificates copied in, an empty
      `.arc/user/{identity}/` folder for `--work-unit`'s identity, and `.venv-backend`, `.claude` and `.codex` linked
      to the main checkout's
    - port allocation counts only the sandbox's worktrees, so stop this worktree's browsable stack first, or its
      port may be allocated again
    - afterwards remove `~/dev/scratch/worktree-stack-proof/`; the throwaways' Compose resources went with 5.4

## Success Criteria

### Implemented (checkable locally and in CI)

- [ ] 1. `node --test scripts/worktree.test.mjs` and
  `node --test .arc/reference/harness-hooks/seed-session-notes.test.mjs` pass, in CI as well, covering R14's and
  R17's cases. They fail when allocation returns a port another worktree claims, when `provision` changes an existing
  key, when seeding overwrites existing notes, or when `remove` makes a Docker call or changes anything for an
  unmerged branch without `--keep-branch`, a worktree with uncommitted changes, a locked worktree, or a project name
  other than `cinexplorer-{name}`, or makes a Docker call when the worktree's `infrastructure/.env` names no project.
- [ ] 2. The backend tests for `seed_dev_data` pass, covering R15's cases.
- [ ] 3. `docker compose -f infrastructure/docker-compose.yml config` in the main checkout gives the same published
  ports as before this change: 8444, 8000, 5173, 5432 and 6379.
- [ ] 4. In a provisioned worktree, `config` with both files and `--profile browser` lists all five services and shows
  `caddy` as the only one with a published port, bound to `127.0.0.1:{SITE_PORT}`, and a memory limit on every
  service.
- [ ] 5. In a worktree set up by hand before this change, `provision` keeps its `COMPOSE_PROJECT_NAME` and adds the
  missing keys and certificates, and its test stack (`up -d dev-db redis backend`) then runs `pytest apps/` to a
  pass.

### Proven live (on this machine, with the main checkout's stack running)

- [ ] 6. Two throwaway worktrees made by `create`, one of them with `--work-unit`, and started by `browse` each answer
  `200` on `/` and `/api/health-check/` at their own ports, while `https://localhost:8444` still does. The one made
  with `--work-unit` holds starting session notes at `.arc/user/{identity}/{name}/SESSION-NOTES.md`, and the other
  holds none.
- [ ] 7. In the maintainer's browser, at a worktree's port: signing in as the dev account succeeds, a movie added to
  the watchlist is still there after a reload, the worktree's backend log shows the requests, and the main checkout's
  database has no new rows for them. With a refresh cookie that worktree's stack issued to the dev account
  (`POST /api/token/`), `POST /api/auth/refresh` to that worktree's stack returns new tokens, and the same request to
  `https://localhost:8444` is refused with 400 and the error "Invalid or expired refresh token", the signature
  failure, and returns no tokens. (A validly signed token whose user is missing on that stack also gets 400, with a
  different error, so the error text is what shows the key differs.)
- [ ] 8. Editing a frontend source file in a worktree updates the page at its port without a manual reload.
- [ ] 9. `remove` on a merged throwaway worktree whose stack ran leaves no containers, volumes, networks or images
  labelled with its project, no folder and no local branch. On an unmerged one it refuses and leaves all of them in
  place; with `--keep-branch` it removes the folder and stack and keeps the branch at its commit.

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
